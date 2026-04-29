/**
 * Admin Management API
 * GET  /api/admin/admins       — list all non-super admins
 * POST /api/admin/admins       — create a new admin account
 *
 * Super admin (SUPER_ADMIN_EMAIL) is excluded from all results and
 * cannot be modified through this API.
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { generateTempPassword } from "@/lib/utils";
import { sendNotification } from "@/lib/email/mailer";
import { welcomeEmailTemplate } from "@/lib/email/templates";
import { SUPER_ADMIN_EMAIL } from "@/auth";
import {
  requireAdmin,
  ok,
  created,
  badRequest,
  conflict,
  serverError,
  forbidden,
  validateBody,
} from "@/app/api/_helpers";

const createAdminSchema = z.object({
  email: z.string().email("Invalid email"),
  firstName: z.string().min(1, "First name required").max(100),
  middleName: z.string().max(100).optional().nullable(),
  lastName: z.string().min(1, "Last name required").max(100),
  cellphone: z.string().min(7, "Invalid phone").max(20),
  sendWelcomeEmail: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const admins = await db.user.findMany({
    where: {
      role: "ADMIN",
      email: { not: SUPER_ADMIN_EMAIL },
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      middleName: true,
      lastName: true,
      cellphone: true,
      isActive: true,
      avatarUrl: true,
      nickname: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return ok(admins);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;
  const { session } = guard;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const { data, error } = validateBody(createAdminSchema, body);
  if (error) return error;

  const email = data.email.toLowerCase().trim();

  if (email === SUPER_ADMIN_EMAIL) {
    return forbidden("Cannot create an account with the super admin email");
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return conflict("An account with this email already exists");

  const tempPassword = generateTempPassword();
  const hashedPassword = await hashPassword(tempPassword);
  const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const admin = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      role: "ADMIN",
      firstName: data.firstName,
      middleName: data.middleName ?? null,
      lastName: data.lastName,
      cellphone: data.cellphone,
      sex: "Other",
      birthDate: new Date("1990-01-01"),
      barangay: "N/A",
      townCity: "N/A",
      province: "N/A",
      mustChangePassword: true,
      tempPasswordExpiry: expiry,
      isActive: true,
      createdBy: session.user.id,
    },
  });

  if (data.sendWelcomeEmail) {
    const { subject, html } = welcomeEmailTemplate({
      firstName: admin.firstName,
      email: admin.email,
      tempPassword,
      loginUrl: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/login`,
    });
    await sendNotification({
      recipientId: admin.id,
      recipientEmail: admin.email,
      type: "ACCOUNT_CREATED",
      subject,
      html,
    }).catch(console.error);
  }

  return created(
    { id: admin.id, email: admin.email, firstName: admin.firstName, lastName: admin.lastName },
    "Admin account created"
  );
}
