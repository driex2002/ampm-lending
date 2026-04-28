/**
 * Admin: Reports API
 * GET /api/admin/reports?type=collections|portfolio|overdue|borrower
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { requireAdmin, ok, badRequest, serverError } from "@/app/api/_helpers";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "collections";

  try {
    if (type === "collections") {
      // Monthly collections for the past 12 months
      const months = Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(new Date(), 11 - i);
        return { start: startOfMonth(date), end: endOfMonth(date), label: format(date, "MMM yyyy") };
      });

      const data = await Promise.all(
        months.map(async ({ start, end, label }) => {
          const agg = await db.payment.aggregate({
            _sum: { amount: true, principalPaid: true, interestPaid: true, penaltyPaid: true },
            where: { paymentDate: { gte: start, lte: end } },
          });
          return {
            month: label,
            total: Number(agg._sum.amount ?? 0),
            principal: Number(agg._sum.principalPaid ?? 0),
            interest: Number(agg._sum.interestPaid ?? 0),
            penalty: Number(agg._sum.penaltyPaid ?? 0),
          };
        })
      );

      return ok({ type: "collections", data });
    }

    if (type === "portfolio") {
      const [active, completed, defaulted, restructured] = await Promise.all([
        db.loan.aggregate({ _count: true, _sum: { outstandingBalance: true }, where: { status: "ACTIVE", deletedAt: null } }),
        db.loan.aggregate({ _count: true, _sum: { totalAmount: true }, where: { status: "COMPLETED", deletedAt: null } }),
        db.loan.aggregate({ _count: true, where: { status: "DEFAULTED", deletedAt: null } }),
        db.loan.aggregate({ _count: true, where: { status: "RESTRUCTURED", deletedAt: null } }),
      ]);

      return ok({
        type: "portfolio",
        data: {
          active: { count: active._count, outstanding: Number(active._sum.outstandingBalance ?? 0) },
          completed: { count: completed._count, totalValue: Number(completed._sum.totalAmount ?? 0) },
          defaulted: { count: defaulted._count },
          restructured: { count: restructured._count },
        },
      });
    }

    if (type === "overdue") {
      const overdueLoans = await db.loan.findMany({
        where: { status: "ACTIVE", isOverdue: true, deletedAt: null },
        include: {
          borrower: { select: { firstName: true, lastName: true, email: true, cellphone: true } },
          paymentSchedules: {
            where: { status: "OVERDUE" },
            orderBy: { dueDate: "asc" },
            take: 1,
          },
        },
        orderBy: { overdueSince: "asc" },
      });

      return ok({ type: "overdue", data: overdueLoans });
    }

    return badRequest("Invalid report type. Use: collections | portfolio | overdue");
  } catch (err) {
    console.error("[Reports]", err);
    return serverError("Failed to generate report");
  }
}
