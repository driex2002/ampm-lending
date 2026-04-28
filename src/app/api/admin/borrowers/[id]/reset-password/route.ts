/**
 * Admin: Reset Borrower Password
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { generateTempPassword } from "@/lib/utils";
import { hashPassword } from "@/lib/auth/password";
import { sendNotification } from "@/lib/email/mailer";
import { passwordResetTemplate } from "@/lib/email/templates";
import { createAuditLog } from "@/lib/audit";
import { requireAdmin, ok, notFound, serverError } from "@/app/api/_helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;
  const { session } = guard;

  const { id } = await params;
  const borrower = await db.user.findUnique({ where: { id, role: "BORROWER", deletedAt: null } });
  if (!borrower) return notFound("Borrower not found");

  try {
    const tempPassword = generateTempPassword();
    const hashed = await hashPassword(tempPassword);

    await db.user.update({
      where: { id },
      data: {
        password: hashed,
        mustChangePassword: true,
        tempPasswordExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    await createAuditLog({
      entityType: "User",
      entityId: id,
      action: "PASSWORD_RESET_BY_ADMIN",
      performedBy: session.user.id,
      performedByRole: "ADMIN",
      targetUserId: id,
    });

    const { subject, html } = passwordResetTemplate({
      firstName: borrower.firstName,
      newTempPassword: tempPassword,
      loginUrl: `${process.env.NEXTAUTH_URL}/login`,
    });

    await sendNotification({
      recipientId: id,
      recipientEmail: borrower.email,
      type: "PASSWORD_RESET",
      subject,
      html,
    });

    return ok(null, "Password reset. Temporary password sent to borrower email.");
  } catch (err) {
    console.error(err);
    return serverError("Failed to reset password");
  }
}
