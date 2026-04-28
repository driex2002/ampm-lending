/**
 * Admin: Borrowers API
 * GET  /api/admin/borrowers  — list with search + pagination
 * POST /api/admin/borrowers  — create new borrower
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { generateTempPassword, getPaginationOffset, buildPaginationMeta, getFullName } from "@/lib/utils";
import { createBorrowerSchema } from "@/lib/validations/borrower";
import { sendNotification } from "@/lib/email/mailer";
import { welcomeEmailTemplate } from "@/lib/email/templates";
import { auditBorrowerCreated } from "@/lib/audit";
import {
  requireAdmin,
  ok,
  created,
  badRequest,
  conflict,
  serverError,
  validateBody,
  getClientIp,
} from "@/app/api/_helpers";

// ---------------------------------------------------------------
// GET — List borrowers
// ---------------------------------------------------------------
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;
  const { session } = guard;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status"); // "active" | "inactive" | "blacklisted"

  const { skip, take } = getPaginationOffset(page, limit);

  const where = {
    role: "BORROWER" as const,
    deletedAt: null,
    ...(search && {
      OR: [
        { email: { contains: search, mode: "insensitive" as const } },
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { cellphone: { contains: search } },
      ],
    }),
    ...(status === "active" && { isActive: true, isBlacklisted: false }),
    ...(status === "inactive" && { isActive: false }),
    ...(status === "blacklisted" && { isBlacklisted: true }),
  };

  const [borrowers, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        cellphone: true,
        sex: true,
        birthDate: true,
        isActive: true,
        isBlacklisted: true,
        createdAt: true,
        _count: {
          select: {
            loans: {
              where: { status: "ACTIVE", deletedAt: null },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.user.count({ where }),
  ]);

  const data = borrowers.map((b) => ({
    ...b,
    fullName: getFullName(b.firstName, b.middleName, b.lastName),
    activeLoansCount: b._count.loans,
  }));

  return ok({ data, pagination: buildPaginationMeta(total, page, limit) });
}

// ---------------------------------------------------------------
// POST — Create borrower
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

  const { data, error } = validateBody(createBorrowerSchema, body);
  if (error) return error;

  // Check email uniqueness
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) return conflict("Email address is already registered");

  const tempPassword = generateTempPassword();
  const hashedPassword = await hashPassword(tempPassword);
  const tempExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

  try {
    const borrower = await db.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: "BORROWER",
        mustChangePassword: true,
        tempPasswordExpiry: tempExpiry,
        firstName: data.firstName,
        middleName: data.middleName ?? null,
        lastName: data.lastName,
        cellphone: data.cellphone,
        sex: data.sex,
        birthDate: new Date(data.birthDate),
        purok: data.purok ?? null,
        street: data.street ?? null,
        barangay: data.barangay,
        townCity: data.townCity,
        province: data.province,
        country: data.country ?? "Philippines",
        notes: data.notes ?? null,
        createdBy: session.user.id,
      },
    });

    // Audit log
    await auditBorrowerCreated(
      session.user.id,
      borrower.id,
      { email: borrower.email, firstName: borrower.firstName, lastName: borrower.lastName },
      { ip: getClientIp(req) }
    );

    // Send welcome email with temp password
    const { subject, html } = welcomeEmailTemplate({
      firstName: borrower.firstName,
      email: borrower.email,
      tempPassword,
      loginUrl: `${process.env.NEXTAUTH_URL}/login`,
    });

    await sendNotification({
      recipientId: borrower.id,
      recipientEmail: borrower.email,
      type: "ACCOUNT_CREATED",
      subject,
      html,
      metadata: { tempPasswordSent: true },
    });

    // Don't return password hash in response
    const { password: _, ...borrowerData } = borrower;
    return created({ borrower: borrowerData }, "Borrower account created successfully");
  } catch (err) {
    console.error("[Create Borrower]", err);
    return serverError("Failed to create borrower account");
  }
}
