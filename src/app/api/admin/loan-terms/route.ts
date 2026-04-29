/**
 * Admin: Loan Terms API
 * GET  /api/admin/loan-terms
 * POST /api/admin/loan-terms
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createLoanTermSchema } from "@/lib/validations/loan";
import { requireAdmin, ok, created, badRequest, conflict, serverError, validateBody } from "@/app/api/_helpers";

export async function GET(_req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  const FREQ_ORDER: Record<string, number> = {
    DAILY: 0, WEEKLY: 1, SEMI_MONTHLY: 2, MONTHLY: 3, QUARTERLY: 4, SEMI_ANNUAL: 5, YEARLY: 6,
    BIWEEKLY: 7, CUSTOM: 99,
  };

  const terms = await db.loanTerm.findMany({
    where: { isActive: true },
    orderBy: [{ totalPeriods: "asc" }],
  });

  terms.sort((a, b) => {
    const fo = (FREQ_ORDER[a.frequency] ?? 50) - (FREQ_ORDER[b.frequency] ?? 50);
    if (fo !== 0) return fo;
    return a.totalPeriods - b.totalPeriods;
  });

  return ok(terms);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const { data, error } = validateBody(createLoanTermSchema, body);
  if (error) return error;

  const existing = await db.loanTerm.findUnique({ where: { name: data.name } });
  if (existing) return conflict("A loan term with this name already exists");

  try {
    const term = await db.loanTerm.create({ data: data as any });
    return created(term, "Loan term created");
  } catch (err) {
    console.error(err);
    return serverError("Failed to create loan term");
  }
}
