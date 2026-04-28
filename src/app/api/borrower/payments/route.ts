import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ok, unauthorized } from "@/app/api/_helpers";

export async function GET() {
  const session = await auth();
  if (!session) return unauthorized();

  const payments = await db.payment.findMany({
    where: { loan: { borrowerId: session.user.id } },
    orderBy: { paymentDate: "desc" },
    include: {
      loan: { select: { loanNumber: true } },
    },
  });

  return ok(
    payments.map((p) => ({
      id: p.id,
      referenceNumber: p.referenceNumber,
      amount: Number(p.amount),
      paymentDate: p.paymentDate.toISOString(),
      paymentType: p.paymentType,
      principalPaid: Number(p.principalPaid),
      interestPaid: Number(p.interestPaid),
      penaltyPaid: Number(p.penaltyPaid),
      loan: { loanNumber: p.loan.loanNumber },
    }))
  );
}
