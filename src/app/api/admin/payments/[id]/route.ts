/**
 * Admin: Single Payment API
 * GET   /api/admin/payments/[id]  — payment detail
 * PATCH /api/admin/payments/[id]  — update payment (amount, date, type, breakdown, remarks)
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { updatePaymentSchema } from "@/lib/validations/payment";
import { createAuditLog } from "@/lib/audit";
import {
  requireAdmin,
  ok,
  badRequest,
  notFound,
  serverError,
  validateBody,
} from "@/app/api/_helpers";

// ---------------------------------------------------------------
// GET — Payment detail
// ---------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  const { id } = await params;

  const payment = await db.payment.findUnique({
    where: { id },
    include: {
      loan: { select: { id: true, loanNumber: true } },
      borrower: { select: { id: true, firstName: true, middleName: true, lastName: true, email: true } },
    },
  });

  if (!payment) return notFound("Payment not found");

  return ok(payment);
}

// ---------------------------------------------------------------
// PATCH — Update payment
// ---------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;
  const { session } = guard;

  const { id } = await params;

  const payment = await db.payment.findUnique({ where: { id } });
  if (!payment) return notFound("Payment not found");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { data, error } = validateBody(updatePaymentSchema, body);
  if (error) return error;

  // Validate breakdown sums don't exceed the new (or existing) amount
  const newAmount = data.amount ?? Number(payment.amount);
  const newPrincipal = data.principalPaid ?? Number(payment.principalPaid);
  const newInterest = data.interestPaid ?? Number(payment.interestPaid);
  const newPenalty = data.penaltyPaid ?? Number(payment.penaltyPaid);

  if (newPrincipal + newInterest + newPenalty > newAmount + 0.01) {
    return badRequest("Principal + Interest + Penalty cannot exceed the total payment amount");
  }

  const oldValues = {
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    paymentType: payment.paymentType,
    principalPaid: payment.principalPaid,
    interestPaid: payment.interestPaid,
    penaltyPaid: payment.penaltyPaid,
    remarks: payment.remarks,
  };

  try {
    const updated = await db.payment.update({
      where: { id },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.paymentDate !== undefined && { paymentDate: new Date(data.paymentDate) }),
        ...(data.paymentType !== undefined && { paymentType: data.paymentType as any }),
        ...(data.principalPaid !== undefined && { principalPaid: data.principalPaid }),
        ...(data.interestPaid !== undefined && { interestPaid: data.interestPaid }),
        ...(data.penaltyPaid !== undefined && { penaltyPaid: data.penaltyPaid }),
        ...(data.remarks !== undefined && { remarks: data.remarks }),
      },
    });

    await createAuditLog({
      entityType: "Payment",
      entityId: id,
      action: "UPDATE",
      performedBy: session.user.id,
      performedByRole: "ADMIN",
      oldValue: oldValues as any,
      newValue: data as any,
      loanId: payment.loanId,
    });

    return ok(updated, "Payment updated successfully");
  } catch (err) {
    console.error("[Update Payment]", err);
    return serverError("Failed to update payment");
  }
}
