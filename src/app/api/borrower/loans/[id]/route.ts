import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ok, unauthorized, notFound, forbidden } from "@/app/api/_helpers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return unauthorized();

  const { id } = await params;
  const loan = await db.loan.findFirst({
    where: { id, borrowerId: session.user.id, deletedAt: null },
    include: {
      term: { select: { name: true, frequency: true, totalPeriods: true } },
      paymentSchedules: { orderBy: { dueDate: "asc" } },
    },
  });

  if (!loan) return notFound("Loan not found");

  return ok({
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
    rateType: loan.interestRateType,
    paymentFrequency: loan.paymentFrequency ?? (loan.term?.frequency as string) ?? null,
    totalPeriods: loan.totalPeriods ?? loan.term?.totalPeriods ?? null,
    schedules: loan.paymentSchedules.map((s) => ({
      id: s.id,
      installmentNumber: s.periodNumber,
      dueDate: s.dueDate.toISOString(),
      principalDue: Number(s.principalDue),
      interestDue: Number(s.interestDue),
      totalDue: Number(s.totalDue),
      paidAmount: Number(s.paidAmount),
      balance: Number(s.totalDue) - Number(s.paidAmount),
      status: s.status,
      paidAt: s.paidAt?.toISOString() ?? null,
      penaltyAmount: Number(s.penaltyDue),
      waivedAmount: Number(s.waivedAmount),
      isInterestWaived: s.isInterestWaived,
    })),
  });
}
