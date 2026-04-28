/**
 * Borrower: Dashboard API
 */
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ok, unauthorized, forbidden, serverError } from "@/app/api/_helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();
  if (session.user.role !== "BORROWER") return forbidden();

  try {
    const loans = await db.loan.findMany({
      where: { borrowerId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        paymentSchedules: {
          where: { status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
          orderBy: { dueDate: "asc" },
          take: 1,
        },
      },
    });

    const activeLoans = loans.filter((l) => l.status === "ACTIVE");

    const totalOutstandingBalance = activeLoans.reduce(
      (sum, l) => sum + Number(l.outstandingBalance),
      0
    );

    const overdueCount = activeLoans.filter((l) => l.isOverdue).length;

    // Earliest upcoming payment across all active loans
    const upcomingSchedule = activeLoans
      .flatMap((l) => l.paymentSchedules.map((s) => ({ ...s, loanId: l.id })))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

    const recentPayments = await db.payment.findMany({
      where: { borrowerId: session.user.id },
      orderBy: { paymentDate: "desc" },
      take: 5,
      include: { loan: { select: { loanNumber: true } } },
    });

    return ok({
      totalActiveLoans: activeLoans.length,
      totalOutstandingBalance,
      overdueCount,
      nextDueDate: upcomingSchedule?.dueDate?.toISOString() ?? null,
      nextDueAmount: upcomingSchedule
        ? Number(upcomingSchedule.totalDue) - Number(upcomingSchedule.paidAmount)
        : null,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        referenceNumber: p.referenceNumber,
        amount: Number(p.amount),
        paymentDate: p.paymentDate.toISOString(),
        loan: { loanNumber: p.loan.loanNumber },
      })),
      activeLoans: activeLoans.map((l) => ({
        id: l.id,
        loanNumber: l.loanNumber,
        principalAmount: Number(l.principalAmount),
        outstandingBalance: Number(l.outstandingBalance),
        isOverdue: l.isOverdue,
        nextDueDate: l.paymentSchedules[0]?.dueDate?.toISOString() ?? null,
        nextDueAmount: l.paymentSchedules[0]
          ? Number(l.paymentSchedules[0].totalDue) - Number(l.paymentSchedules[0].paidAmount)
          : null,
      })),
    });
  } catch (err) {
    console.error("[Borrower Dashboard]", err);
    return serverError("Failed to load dashboard");
  }
}
