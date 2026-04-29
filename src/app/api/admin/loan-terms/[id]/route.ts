/**
 * Admin: Loan Term by ID
 * DELETE /api/admin/loan-terms/[id]  — soft-deactivate (preserves existing loans)
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, ok, notFound, badRequest, serverError } from "@/app/api/_helpers";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  const { id } = await params;

  const term = await db.loanTerm.findUnique({ where: { id } });
  if (!term) return notFound("Loan term not found");

  // Check if any active loans use this term
  const activeLoanCount = await db.loan.count({
    where: { termId: id, status: { in: ["ACTIVE", "RESTRUCTURED"] } },
  });

  if (activeLoanCount > 0) {
    return badRequest(
      `Cannot remove — ${activeLoanCount} active loan(s) use this term. It will be hidden from new loans.`
    );
  }

  try {
    await db.loanTerm.update({ where: { id }, data: { isActive: false } });
    return ok(null, "Loan term removed");
  } catch (err) {
    console.error(err);
    return serverError("Failed to remove loan term");
  }
}
