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

  const terms = await db.loanTerm.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
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
