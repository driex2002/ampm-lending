/**
 * Admin: Dashboard & Reports API
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { requireAdmin, ok, serverError } from "@/app/api/_helpers";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  try {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const [
      totalBorrowers,
      activeBorrowers,
      totalActiveLoans,
      overdueLoans,
      loansCompletedThisMonth,
      paymentsTodayAgg,
      paymentsMonthAgg,
      recentPayments,
      overdueAccounts,
      outstandingAgg,
    ] = await Promise.all([
      db.user.count({ where: { role: "BORROWER", deletedAt: null } }),
      db.user.count({ where: { role: "BORROWER", deletedAt: null, isActive: true } }),
      db.loan.count({ where: { status: "ACTIVE", deletedAt: null } }),
      db.loan.count({ where: { status: "ACTIVE", isOverdue: true, deletedAt: null } }),
      db.loan.count({
        where: {
          status: "COMPLETED",
          completedAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
      }),
      db.payment.aggregate({
        _sum: { amount: true },
        where: {
          paymentDate: { gte: startOfDay(today), lte: endOfDay(today) },
        },
      }),
      db.payment.aggregate({
        _sum: { amount: true },
        where: {
          paymentDate: { gte: monthStart, lte: monthEnd },
        },
      }),
      db.payment.findMany({
        take: 10,
        orderBy: { paymentDate: "desc" },
        include: {
          borrower: { select: { firstName: true, lastName: true } },
          loan: { select: { loanNumber: true } },
        },
      }),
      db.loan.findMany({
        where: { status: "ACTIVE", isOverdue: true, deletedAt: null },
        take: 10,
        include: {
          borrower: { select: { firstName: true, lastName: true, email: true } },
          term: { select: { name: true } },
        },
        orderBy: { overdueSince: "asc" },
      }),
      db.loan.aggregate({
        _sum: { outstandingBalance: true },
        where: { status: "ACTIVE", deletedAt: null },
      }),
    ]);

    return ok({
      totalBorrowers,
      activeBorrowers,
      totalActiveLoans,
      overdueLoans,
      loansCompletedThisMonth,
      totalCollectedToday: Number(paymentsTodayAgg._sum.amount ?? 0),
      totalCollectedThisMonth: Number(paymentsMonthAgg._sum.amount ?? 0),
      totalOutstandingBalance: Number(outstandingAgg._sum.outstandingBalance ?? 0),
      recentPayments,
      overdueAccounts,
    });
  } catch (err) {
    console.error("[Dashboard]", err);
    return serverError("Failed to load dashboard data");
  }
}
