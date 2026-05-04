/**
 * Admin: Loans API
 * GET  /api/admin/loans  — list all loans with filters
 * POST /api/admin/loans  — create new loan
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createLoanSchema } from "@/lib/validations/loan";
import { calculateLoan } from "@/lib/loan-calculator";
import { generateLoanNumber, getPaginationOffset, buildPaginationMeta } from "@/lib/utils";
import { auditLoanCreated } from "@/lib/audit";
import { sendNotification } from "@/lib/email/mailer";
import { loanCreatedTemplate } from "@/lib/email/templates";
import { format } from "date-fns";
import {
  requireAdmin,
  ok,
  created,
  badRequest,
  notFound,
  serverError,
  validateBody,
} from "@/app/api/_helpers";

// ---------------------------------------------------------------
// GET — List loans
// ---------------------------------------------------------------
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const borrowerId = searchParams.get("borrowerId");
  const status = searchParams.get("status");
  const overdue = searchParams.get("overdue");
  const search = searchParams.get("search") ?? "";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const { skip, take } = getPaginationOffset(page, limit);

  const where = {
    deletedAt: null,
    ...(borrowerId && { borrowerId }),
    ...(status && { status: status as any }),
    ...(overdue === "true" && { isOverdue: true, status: "ACTIVE" as const }),
    ...((dateFrom || dateTo) && {
      startDate: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo + "T23:59:59.999Z") }),
      },
    }),
    ...(search && {
      OR: [
        { loanNumber: { contains: search, mode: "insensitive" as const } },
        {
          borrower: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          },
        },
      ],
    }),
  };

  const [loans, total] = await Promise.all([
    db.loan.findMany({
      where,
      include: {
        borrower: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
            cellphone: true,
          },
        },
        term: { select: { name: true, frequency: true, totalPeriods: true } },
        paymentSchedules: {
          where: { status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
          orderBy: { dueDate: "asc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.loan.count({ where }),
  ]);

  const data = loans.map((loan) => ({
    ...loan,
    paymentFrequency: loan.paymentFrequency ?? loan.term?.frequency ?? null,
    totalPeriods: loan.totalPeriods ?? loan.term?.totalPeriods ?? null,
    nextDueDate: loan.paymentSchedules[0]?.dueDate ?? null,
    nextDueAmount: loan.paymentSchedules[0]?.totalDue ?? null,
  }));

  return ok({ data, pagination: buildPaginationMeta(total, page, limit) });
}

// ---------------------------------------------------------------
// POST — Create loan
// ---------------------------------------------------------------
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;
  const { session } = guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { data, error } = validateBody(createLoanSchema, body);
  if (error) return error;

  // Verify borrower exists
  const borrower = await db.user.findUnique({
    where: { id: data.borrowerId, role: "BORROWER", deletedAt: null, isActive: true },
  });
  if (!borrower) return notFound("Active borrower not found");

  // Calculate loan schedule
  const calc = calculateLoan({
    principalAmount: data.principalAmount,
    interestRate: data.interestRate,
    interestRateType: data.interestRateType as any,
    frequency: data.paymentFrequency as any,
    totalPeriods: data.totalPeriods,
    startDate: new Date(data.startDate),
  });

  try {
    // Generate sequential loan number
    const loanCount = await db.loan.count();
    const loanNumber = generateLoanNumber(loanCount + 1);

    const loan = await db.$transaction(async (tx) => {
      // Create loan
      const newLoan = await tx.loan.create({
        data: {
          loanNumber,
          borrowerId: data.borrowerId,
          principalAmount: calc.principalAmount,
          totalInterest: calc.totalInterest,
          totalAmount: calc.totalAmount,
          outstandingBalance: calc.totalAmount,
          totalPaid: 0,
          interestRate: data.interestRate,
          interestRateType: data.interestRateType as any,
          paymentFrequency: data.paymentFrequency as any,
          totalPeriods: data.totalPeriods,
          penaltyAmount: data.penaltyAmount ?? 0,
          penaltyType: (data.penaltyType ?? null) as any,
          graceDays: data.graceDays ?? 0,
          startDate: new Date(data.startDate),
          endDate: calc.schedule[calc.schedule.length - 1]?.dueDate ?? null,
          notes: data.notes ?? null,
          createdBy: session.user.id,
        },
      });

      // Create payment schedules
      await tx.paymentSchedule.createMany({
        data: calc.schedule.map((s) => ({
          loanId: newLoan.id,
          periodNumber: s.periodNumber,
          dueDate: s.dueDate,
          totalDue: s.totalDue,
          principalDue: s.principalDue,
          interestDue: s.interestDue,
          penaltyDue: 0,
          status: "PENDING" as const,
        })),
      });

      return newLoan;
    });

    // Audit log
    await auditLoanCreated(session.user.id, loan.id, {
      loanNumber,
      borrowerId: data.borrowerId,
      principalAmount: calc.principalAmount,
      totalAmount: calc.totalAmount,
    });

    // Email notification
    if (calc.schedule.length > 0) {
      const { subject, html } = loanCreatedTemplate({
        firstName: borrower.firstName,
        loanNumber,
        principalAmount: calc.principalAmount,
        totalAmount: calc.totalAmount,
        interestRate: data.interestRate,
        termName: `${data.paymentFrequency.replace(/_/g, " ")} × ${data.totalPeriods}`,
        startDate: format(new Date(data.startDate), "MMM dd, yyyy"),
        firstDueDate: format(calc.schedule[0].dueDate, "MMM dd, yyyy"),
        firstDueAmount: calc.schedule[0].totalDue,
      });

      await sendNotification({
        recipientId: borrower.id,
        recipientEmail: borrower.email,
        type: "LOAN_CREATED",
        subject,
        html,
      });
    }

    return created({ loan, schedule: calc.schedule }, "Loan created successfully");
  } catch (err) {
    console.error("[Create Loan]", err);
    return serverError("Failed to create loan");
  }
}
