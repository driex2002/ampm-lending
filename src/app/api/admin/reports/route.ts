/**
 * Admin: Reports API
 * GET /api/admin/reports?type=collections|portfolio|overdue
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays } from "date-fns";
import { requireAdmin, ok, badRequest, serverError } from "@/app/api/_helpers";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "collections";

  try {
    if (type === "collections") {
      const now = new Date();
      const months = Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(now, 11 - i);
        return { start: startOfMonth(date), end: endOfMonth(date), label: format(date, "MMM yyyy") };
      });

      const monthly = await Promise.all(
        months.map(async ({ start, end, label }) => {
          const agg = await db.payment.aggregate({
            _sum: { amount: true, principalPaid: true, interestPaid: true, penaltyPaid: true },
            where: { paymentDate: { gte: start, lte: end } },
          });
          return {
            month: label,
            collected: Number(agg._sum.amount ?? 0),
            principal: Number(agg._sum.principalPaid ?? 0),
            interest: Number(agg._sum.interestPaid ?? 0),
            penalty: Number(agg._sum.penaltyPaid ?? 0),
          };
        })
      );

      const thisMonthStart = startOfMonth(now);
      const allTimeAgg = await db.payment.aggregate({ _sum: { amount: true }, _count: { id: true } });
      const thisMonthAgg = await db.payment.aggregate({
        _sum: { amount: true },
        where: { paymentDate: { gte: thisMonthStart } },
      });

      const totalCollected = Number(allTimeAgg._sum.amount ?? 0);
      const count = allTimeAgg._count.id ?? 0;

      return ok({
        summary: {
          totalCollected,
          thisMonth: Number(thisMonthAgg._sum.amount ?? 0),
          avgPayment: count > 0 ? totalCollected / count : 0,
        },
        monthly,
      });
    }

    if (type === "portfolio") {
      const [active, completed, defaulted, restructured, allLoans] = await Promise.all([
        db.loan.aggregate({ _count: true, _sum: { outstandingBalance: true, principalAmount: true }, where: { status: "ACTIVE", deletedAt: null } }),
        db.loan.aggregate({ _count: true, _sum: { principalAmount: true }, where: { status: "COMPLETED", deletedAt: null } }),
        db.loan.aggregate({ _count: true, where: { status: "DEFAULTED", deletedAt: null } }),
        db.loan.aggregate({ _count: true, where: { status: "RESTRUCTURED", deletedAt: null } }),
        db.loan.aggregate({ _count: true, _sum: { principalAmount: true }, where: { deletedAt: null } }),
      ]);

      return ok({
        summary: {
          totalLoans: allLoans._count,
          activeLoans: active._count,
          completedLoans: completed._count,
          defaultedLoans: defaulted._count,
          restructuredLoans: restructured._count,
          totalPrincipal: Number(allLoans._sum.principalAmount ?? 0),
          totalOutstanding: Number(active._sum.outstandingBalance ?? 0),
        },
      });
    }

    if (type === "overdue") {
      const overdueLoans = await db.loan.findMany({
        where: { status: "ACTIVE", isOverdue: true, deletedAt: null },
        select: {
          id: true,
          loanNumber: true,
          outstandingBalance: true,
          overdueSince: true,
          borrower: { select: { firstName: true, lastName: true } },
          paymentSchedules: {
            where: { status: "OVERDUE" },
            select: { totalDue: true, paidAmount: true },
          },
        },
        orderBy: { overdueSince: "asc" },
      });

      const now = new Date();
      const totalActiveCount = await db.loan.count({ where: { status: "ACTIVE", deletedAt: null } });

      const overdueItems = overdueLoans.map((l) => {
        const overdueAmt = l.paymentSchedules.reduce(
          (sum, s) => sum + Math.max(0, Number(s.totalDue) - Number(s.paidAmount)),
          0
        );
        return {
          id: l.id,
          loanNumber: l.loanNumber,
          borrowerName: `${l.borrower.firstName} ${l.borrower.lastName}`,
          daysOverdue: l.overdueSince ? differenceInDays(now, l.overdueSince) : 0,
          outstandingBalance: Number(l.outstandingBalance),
          overdueAmount: overdueAmt,
        };
      });

      const totalOverdueAmount = overdueItems.reduce((s, i) => s + i.overdueAmount, 0);
      const overdueRate = totalActiveCount > 0
        ? Math.round((overdueLoans.length / totalActiveCount) * 100 * 10) / 10
        : 0;

      return ok({
        summary: {
          overdueCount: overdueLoans.length,
          overdueAmount: totalOverdueAmount,
          overdueRate,
        },
        overdue: overdueItems,
      });
    }

    return badRequest("Invalid report type. Use: collections | portfolio | overdue");
  } catch (err) {
    console.error("[Reports]", err);
    return serverError("Failed to generate report");
  }
}
