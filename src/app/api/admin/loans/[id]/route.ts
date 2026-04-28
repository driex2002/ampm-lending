/**
 * Admin: Single Loan API
 * GET   /api/admin/loans/[id]   — loan detail
 * PATCH /api/admin/loans/[id]   — update loan (notes, status, penalty)
 * POST  /api/admin/loans/[id]/waive — waive interest
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { updateLoanSchema, waiveInterestSchema } from "@/lib/validations/loan";
import { auditInterestWaived, createAuditLog } from "@/lib/audit";
import {
  requireAdmin,
  ok,
  badRequest,
  notFound,
  serverError,
  validateBody,
} from "@/app/api/_helpers";

// ---------------------------------------------------------------
// GET — Loan detail
// ---------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  const { id } = await params;

  const loan = await db.loan.findUnique({
    where: { id, deletedAt: null },
    include: {
      borrower: {
        select: {
          id: true,
          email: true,
          firstName: true,
          middleName: true,
          lastName: true,
          cellphone: true,
          isActive: true,
          isBlacklisted: true,
        },
      },
      term: true,
      payments: {
        orderBy: { paymentDate: "desc" },
      },
      paymentSchedules: {
        orderBy: { dueDate: "asc" },
      },
    },
  });

  if (!loan) return notFound("Loan not found");

  return ok(loan);
}

// ---------------------------------------------------------------
// PATCH — Update loan
// ---------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;
  const { session } = guard;

  const { id } = await params;
  const loan = await db.loan.findUnique({ where: { id, deletedAt: null } });
  if (!loan) return notFound("Loan not found");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const bodyObj = body as Record<string, unknown>;

  // --- Waive interest ---
  if (bodyObj._op === "waiveInterest") {
    const { data, error } = validateBody(waiveInterestSchema, body);
    if (error) return error;

    if (data.waiverType === "PER_PAYMENT" && !data.scheduleId) {
      return badRequest("scheduleId is required for per-payment waiver");
    }

    try {
      if (data.waiverType === "PER_PAYMENT" && data.scheduleId) {
        const schedule = await db.paymentSchedule.findUnique({
          where: { id: data.scheduleId, loanId: id },
        });
        if (!schedule) return notFound("Payment schedule not found");
        if (schedule.status === "PAID") return badRequest("Cannot waive already paid schedule");

        await db.paymentSchedule.update({
          where: { id: data.scheduleId },
          data: {
            isInterestWaived: true,
            waivedAmount: schedule.interestDue,
            waiverReason: data.waiverReason,
            waivedBy: session.user.id,
          },
        });
      } else if (data.waiverType === "FULL_LOAN") {
        // Waive all remaining interest
        const pendingSchedules = await db.paymentSchedule.findMany({
          where: { loanId: id, status: { notIn: ["PAID", "CANCELLED"] } },
        });

        const totalInterestToWaive = pendingSchedules.reduce(
          (sum, s) => sum + Number(s.interestDue) - Number(s.waivedAmount),
          0
        );

        const waivedAmount = data.customWaivedAmount ?? totalInterestToWaive;

        await db.$transaction([
          // Mark all pending schedules as interest-waived
          ...pendingSchedules.map((s) =>
            db.paymentSchedule.update({
              where: { id: s.id },
              data: {
                isInterestWaived: true,
                waivedAmount: s.interestDue,
                waiverReason: data.waiverReason,
                waivedBy: session.user.id,
              },
            })
          ),
          // Update loan
          db.loan.update({
            where: { id },
            data: {
              isInterestWaived: true,
              waiverType: "FULL_LOAN",
              waiverReason: data.waiverReason,
              waivedAmount,
              waivedAt: new Date(),
              waivedBy: session.user.id,
              outstandingBalance: {
                decrement: waivedAmount,
              },
            },
          }),
        ]);
      }

      await auditInterestWaived(session.user.id, id, {
        waiverType: data.waiverType,
        reason: data.waiverReason,
      });

      return ok(null, "Interest waived successfully");
    } catch (err) {
      console.error("[Waive Interest]", err);
      return serverError("Failed to waive interest");
    }
  }

  // --- General update ---
  const { data, error } = validateBody(updateLoanSchema, body);
  if (error) return error;

  const oldValues = {
    notes: loan.notes,
    status: loan.status,
    penaltyAmount: loan.penaltyAmount,
    penaltyType: loan.penaltyType,
    graceDays: loan.graceDays,
  };

  const updated = await db.loan.update({
    where: { id },
    data: {
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.status && { status: data.status as any }),
      ...(data.penaltyAmount !== undefined && { penaltyAmount: data.penaltyAmount }),
      ...(data.penaltyType !== undefined && { penaltyType: data.penaltyType as any }),
      ...(data.graceDays !== undefined && { graceDays: data.graceDays }),
    },
  });

  await createAuditLog({
    entityType: "Loan",
    entityId: id,
    action: "UPDATE",
    performedBy: session.user.id,
    performedByRole: "ADMIN",
    oldValue: oldValues as any,
    newValue: data as any,
    loanId: id,
  });

  return ok(updated, "Loan updated successfully");
}
