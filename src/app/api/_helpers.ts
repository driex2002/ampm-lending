/**
 * Shared API helpers — auth guard, request parsing, response builders
 */
import "server-only";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import type { Session } from "next-auth";

// ---------------------------------------------------------------
// Response builders
// ---------------------------------------------------------------

export function ok<T>(data: T, message?: string) {
  return NextResponse.json({ success: true, data, message }, { status: 200 });
}

export function created<T>(data: T, message?: string) {
  return NextResponse.json({ success: true, data, message }, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(error: string, details?: Record<string, string[]>) {
  return NextResponse.json({ success: false, error, details }, { status: 400 });
}

export function unauthorized(error = "Authentication required") {
  return NextResponse.json({ success: false, error }, { status: 401 });
}

export function forbidden(error = "Insufficient permissions") {
  return NextResponse.json({ success: false, error }, { status: 403 });
}

export function notFound(error = "Resource not found") {
  return NextResponse.json({ success: false, error }, { status: 404 });
}

export function conflict(error: string) {
  return NextResponse.json({ success: false, error }, { status: 409 });
}

export function serverError(error = "Internal server error") {
  return NextResponse.json({ success: false, error }, { status: 500 });
}

// ---------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------

export async function requireAdmin(): Promise<
  { session: Session } | NextResponse
> {
  const session = await auth();
  if (!session?.user) return unauthorized();
  if (session.user.role !== "ADMIN") return forbidden();
  return { session };
}

export async function requireAuth(): Promise<
  { session: Session } | NextResponse
> {
  const session = await auth();
  if (!session?.user) return unauthorized();
  return { session };
}

// ---------------------------------------------------------------
// Zod validation helper
// ---------------------------------------------------------------

export function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown
):
  | { data: T; error: null }
  | { data: null; error: NextResponse } {
  try {
    const data = schema.parse(body);
    return { data, error: null };
  } catch (err) {
    if (err instanceof ZodError) {
      const details: Record<string, string[]> = {};
      for (const issue of err.issues) {
        const path = issue.path.join(".");
        if (!details[path]) details[path] = [];
        details[path].push(issue.message);
      }
      return {
        data: null,
        error: badRequest("Validation failed", details),
      };
    }
    return { data: null, error: badRequest("Invalid request body") };
  }
}

// ---------------------------------------------------------------
// IP extraction (for audit logs)
// ---------------------------------------------------------------

export function getClientIp(req: Request): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined
  );
}
