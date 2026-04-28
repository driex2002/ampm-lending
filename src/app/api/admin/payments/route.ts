/**
 * Admin: Payments API
 * GET  /api/admin/payments  — list payments with filters
 * POST /api/admin/payments  — record a new payment
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { recordPaymentSchema } from "@/lib/validations/payment";
import { applyPayment, calculatePenalty } from "@/lib/loan-calculator";
import { generatePaymentReference, getPaginationOffset, buildPaginationMeta } from "@/lib/utils";
import { auditPaymentRecorded } from "@/lib/audit";
import { sendNotification } from "@/lib/email/mailer";
import { paymentConfirmationTemplate } from "@/lib/email/templates";
import { format } from "date-fns";
import {
  requireAdmin,
  ok,
  created,
  badRequest,
  notFound,
  serverError,
  validateBody,
} from "@/app/api/_helpers";

// ---------------------------------------------------------------
// GET — List payments
// ---------------------------------------------------------------
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const loanId = searchParams.get("loanId");
  const borrowerId = searchParams.get("borrowerId");

  const { skip, take } = getPaginationOffset(page, limit);

  const where = {
    ...(loanId && { loanId }),
    ...(borrowerId && { borrowerId }),
  };

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      include: {
        borrower: {
          select: { firstName: true, lastName: true, email: true },
        },
        loan: { select: { loanNumber: true } },
      },
      orderBy: { paymentDate: "desc" },
      skip,
      take,
    }),
    db.payment.count({ where }),
  ]);

  return ok({ data: payments, pagination: buildPaginationMeta(total, page, limit) });
}

// ---------------------------------------------------------------
// POST — Record payment
// ---------------------------------------------------------------
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;
  const { session } = guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { data, error } = validateBody(recordPaymentSchema, body);
  if (error) return error;

  // Load loan
  const loan = await db.loan.findUnique({
    where: { id: data.loanId, deletedAt: null, status: "ACTIVE" },
    include: {
      borrower: true,
      paymentSchedules: {
        where: { status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
        orderBy: { dueDate: "asc" },
        take: 1,
      },
    },
  });

  if (!loan) return notFound("Active loan not found");
  if (loan.borrowerId !== data.borrowerId) return badRequest("Borrower does not match loan");

  const currentSchedule = loan.paymentSchedules[0];

  if (!currentSchedule && Number(loan.outstandingBalance) === 0) {
    return badRequest("This loan is already fully paid");
  }

  // Calculate penalty if applicable
  let penaltyDue = 0;
  if (data.penaltyOverride !== null && data.penaltyOverride !== undefined) {
    penaltyDue = data.penaltyOverride;
  } else if (currentSchedule && loan.penaltyType && Number(loan.penaltyAmount) > 0) {
    penaltyDue = calculatePenalty({
      penaltyType: loan.penaltyType,
      penaltyAmount: Number(loan.penaltyAmount),
      principalAmount: Number(loan.principalAmount),
      outstandingBalance: Number(loan.outstandingBalance),
      graceDays: loan.graceDays,
      dueDate: currentSchedule.dueDate,
      paymentDate: new Date(data.paymentDate),
    });
  }

  // Calculate waived interest
  const waivedAmount = currentSchedule?.isInterestWaived
    ? Number(currentSchedule.waivedAmount)
    : data.waiverType === "PER_PAYMENT"
    ? Number(currentSchedule?.interestDue ?? 0)
    : 0;

  // Apply payment
  const result = applyPayment({
    paymentAmount: data.amount,
    outstandingBalance: Number(loan.outstandingBalance),
    currentSchedule: {
      principalDue: Number(currentSchedule?.principalDue ?? 0),
      interestDue: Number(currentSchedule?.interestDue ?? 0),
      penaltyDue,
      waivedAmount,
    },
    allowOverpayment: data.allowOverpayment ?? false,
  });

  if (result.isOverpayment && !data.allowOverpayment) {
    return badRequest(
      `Payment amount exceeds scheduled amount by ₱${result.overpaymentAmount.toFixed(2)}. Set allowOverpayment to true to proceed.`
    );
  }

  try {
    // Generate sequential reference number
    const paymentCount = await db.payment.count();
    const referenceNumber = generatePaymentReference(paymentCount + 1);

    const payment = await db.$transaction(async (tx) => {
      // Create payment record
      const newPayment = await tx.payment.create({
        data: {
          referenceNumber,
          loanId: data.loanId,
          borrowerId: data.borrowerId,
          amount: data.amount,
          principalPaid: result.principalPaid,
          interestPaid: result.interestPaid,
          penaltyPaid: result.penaltyPaid,
          waivedInterest: result.waivedInterest,
          balanceBefore: Number(loan.outstandingBalance),
          balanceAfter: result.newBalance,
          paymentDate: new Date(data.paymentDate),
          paymentType: data.paymentType as any,
          remarks: data.remarks ?? null,
          isOverpayment: result.isOverpayment,
          overpaymentAmount: result.overpaymentAmount,
          overpaymentApproved: data.allowOverpayment && result.isOverpayment,
          waiverType: (data.waiverType ?? null) as any,
          waiverReason: data.waiverReason ?? null,
          processedBy: session.user.id,
        },
      });

      // Update payment schedule
      if (currentSchedule) {
        await tx.paymentSchedule.update({
          where: { id: currentSchedule.id },
          data: {
            paymentId: newPayment.id,
            paidAmount: { increment: result.totalApplied },
            status:
              result.newBalance === 0
                ? "PAID"
                : result.totalApplied >= Number(currentSchedule.totalDue)
                ? "PAID"
                : "PARTIAL",
            paidAt: result.newBalance === 0 ? new Date() : undefined,
            ...(data.waiverType === "PER_PAYMENT" && {
              isInterestWaived: true,
              waivedAmount: result.waivedInterest,
              waiverReason: data.waiverReason,
              waivedBy: session.user.id,
            }),
          },
        });
      }

      // Update loan balance
      const loanUpdate: Record<string, unknown> = {
        outstandingBalance: result.newBalance,
        totalPaid: { increment: result.principalPaid + result.interestPaid + result.penaltyPaid },
        isOverdue: false,
      };

      if (result.newBalance === 0) {
        loanUpdate.status = "COMPLETED";
        loanUpdate.completedAt = new Date();
      }

      await tx.loan.update({
        where: { id: data.loanId },
        data: loanUpdate as any,
      });

      return newPayment;
    });

    // Audit log
    await auditPaymentRecorded(session.user.id, payment.id, data.loanId, {
      referenceNumber,
      amount: data.amount,
      balanceBefore: Number(loan.outstandingBalance),
      balanceAfter: result.newBalance,
    });

    // Get next due date for email
    const nextSchedule = await db.paymentSchedule.findFirst({
      where: {
        loanId: data.loanId,
        status: { in: ["PENDING", "PARTIAL"] },
      },
      orderBy: { dueDate: "asc" },
    });

    // Send email notification
    const { subject, html } = paymentConfirmationTemplate({
      firstName: loan.borrower.firstName,
      loanNumber: loan.loanNumber,
      referenceNumber,
      paymentAmount: data.amount,
      paymentDate: format(new Date(data.paymentDate), "MMM dd, yyyy"),
      paymentType: data.paymentType,
      principalPaid: result.principalPaid,
      interestPaid: result.interestPaid,
      penaltyPaid: result.penaltyPaid,
      waivedInterest: result.waivedInterest,
      remainingBalance: result.newBalance,
      nextDueDate: nextSchedule ? format(nextSchedule.dueDate, "MMM dd, yyyy") : undefined,
      nextDueAmount: nextSchedule ? Number(nextSchedule.totalDue) : undefined,
      remarks: data.remarks ?? undefined,
    });

    await sendNotification({
      recipientId: loan.borrower.id,
      recipientEmail: loan.borrower.email,
      type: "PAYMENT_CONFIRMATION",
      subject,
      html,
      metadata: {
        paymentId: payment.id,
        referenceNumber,
        amount: data.amount,
        balanceAfter: result.newBalance,
      },
    });

    return created(
      {
        payment,
        breakdown: result,
        referenceNumber,
        loanCompleted: result.newBalance === 0,
      },
      "Payment recorded successfully"
    );
  } catch (err) {
    console.error("[Record Payment]", err);
    return serverError("Failed to record payment");
  }
}
