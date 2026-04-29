/**
 * Borrower: Change Password API
 * POST /api/borrower/change-password
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/auth/password";
import { auditPasswordChange } from "@/lib/audit";
import { ok, badRequest, unauthorized, serverError } from "@/app/api/_helpers";

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const result = changePasswordSchema.safeParse(body);
  if (!result.success) {
    const details: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!details[path]) details[path] = [];
      details[path].push(issue.message);
    }
    return badRequest("Validation failed", details);
  }

  const { currentPassword, newPassword } = result.data;

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.password) return unauthorized();

  // If it's a mustChangePassword flow, skip current password check
  if (!user.mustChangePassword) {
    if (!currentPassword) return badRequest("Current password required");
    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) return badRequest("Current password is incorrect");
  }

  const { valid, errors } = validatePasswordStrength(newPassword);
  if (!valid) return badRequest("Password too weak", { newPassword: errors });

  try {
    const hashed = await hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        mustChangePassword: false,
        tempPasswordExpiry: null,
        loginAttempts: 0,
      },
    });

    await auditPasswordChange(user.id, user.role);

    return ok(null, "Password changed successfully");
  } catch (err) {
    console.error(err);
    return serverError("Failed to change password");
  }
}
