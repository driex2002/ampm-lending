import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ok, unauthorized } from "@/app/api/_helpers";

export async function GET() {
  const session = await auth();
  if (!session) return unauthorized();

  const loans = await db.loan.findMany({
    where: { borrowerId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      term: { select: { name: true, frequency: true, totalPeriods: true } },
      paymentSchedules: {
        where: { status: { not: "PAID" } },
        orderBy: { dueDate: "asc" },
        take: 1,
      },
    },
  });

  const data = loans.map((loan) => ({
    id: loan.id,
    loanNumber: loan.loanNumber,
    principalAmount: Number(loan.principalAmount),
    totalAmount: Number(loan.totalAmount),
    outstandingBalance: Number(loan.outstandingBalance),
    status: loan.status,
    isOverdue: loan.isOverdue,
    startDate: loan.startDate.toISOString(),
    endDate: loan.endDate?.toISOString() ?? null,
    interestRate: Number(loan.interestRate),
    paymentFrequency: loan.paymentFrequency ?? loan.term?.frequency ?? null,
    totalPeriods: loan.totalPeriods ?? loan.term?.totalPeriods ?? null,
    nextDueDate: loan.paymentSchedules[0]?.dueDate?.toISOString() ?? null,
    nextDueAmount: loan.paymentSchedules[0] ? Number(loan.paymentSchedules[0].totalDue) - Number(loan.paymentSchedules[0].paidAmount) : null,
  }));

  return ok(data);
}
