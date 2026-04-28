/**
 * Admin: Single Borrower API
 * GET   /api/admin/borrowers/[id]  — get borrower detail
 * PATCH /api/admin/borrowers/[id]  — update borrower
 * DELETE /api/admin/borrowers/[id] — soft delete
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { updateBorrowerSchema, updateBorrowerEmailSchema, blacklistBorrowerSchema } from "@/lib/validations/borrower";
import { getFullName } from "@/lib/utils";
import { auditBorrowerUpdated, auditEmailChanged, auditBlacklist } from "@/lib/audit";
import { sendNotification } from "@/lib/email/mailer";
import {
  requireAdmin,
  ok,
  badRequest,
  notFound,
  conflict,
  serverError,
  validateBody,
} from "@/app/api/_helpers";

// ---------------------------------------------------------------
// GET — Borrower detail
// ---------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  const { id } = await params;

  const borrower = await db.user.findUnique({
    where: { id, role: "BORROWER", deletedAt: null },
    include: {
      loans: {
        where: { deletedAt: null },
        include: {
          term: true,
          payments: {
            orderBy: { paymentDate: "desc" },
            take: 5,
          },
          paymentSchedules: {
            orderBy: { dueDate: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!borrower) return notFound("Borrower not found");

  const { password: _, ...borrowerData } = borrower;

  const totalOutstanding = borrower.loans
    .filter((l) => l.status === "ACTIVE")
    .reduce((sum, l) => sum + Number(l.outstandingBalance), 0);

  const totalPaid = borrower.loans.reduce(
    (sum, l) => sum + Number(l.totalPaid),
    0
  );

  return ok({
    ...borrowerData,
    fullName: getFullName(borrower.firstName, borrower.middleName, borrower.lastName),
    totalOutstanding,
    totalPaid,
    activeLoansCount: borrower.loans.filter((l) => l.status === "ACTIVE").length,
  });
}

// ---------------------------------------------------------------
// PATCH — Update borrower profile
// ---------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;
  const { session } = guard;

  const { id } = await params;
  const borrower = await db.user.findUnique({
    where: { id, role: "BORROWER", deletedAt: null },
  });
  if (!borrower) return notFound("Borrower not found");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  // Detect operation type from body
  const bodyObj = body as Record<string, unknown>;

  // --- Email update ---
  if (bodyObj._op === "updateEmail") {
    const { data, error } = validateBody(updateBorrowerEmailSchema, body);
    if (error) return error;

    if (data.newEmail === borrower.email) {
      return badRequest("New email is the same as current email");
    }

    const emailTaken = await db.user.findUnique({ where: { email: data.newEmail } });
    if (emailTaken) return conflict("Email address is already in use");

    const oldEmail = borrower.email;
    const updated = await db.user.update({
      where: { id },
      data: { email: data.newEmail },
    });

    await auditEmailChanged(session.user.id, id, oldEmail, data.newEmail);

    // Notify borrower at NEW email
    await sendNotification({
      recipientId: id,
      recipientEmail: data.newEmail,
      type: "EMAIL_CHANGED",
      subject: "AMPM Lending – Your Email Address Has Been Updated",
      html: `<p>Hello ${borrower.firstName}, your email address has been updated to <strong>${data.newEmail}</strong>. Please use this email for future logins.</p>`,
    });

    return ok({ email: updated.email }, "Email updated successfully");
  }

  // --- Blacklist toggle ---
  if (bodyObj._op === "blacklist") {
    const { data, error } = validateBody(blacklistBorrowerSchema, body);
    if (error) return error;

    const isBlacklisting = data.action === "BLACKLIST";
    const updated = await db.user.update({
      where: { id },
      data: {
        isBlacklisted: isBlacklisting,
        blacklistReason: isBlacklisting ? data.reason : null,
        blacklistedAt: isBlacklisting ? new Date() : null,
        blacklistedBy: isBlacklisting ? session.user.id : null,
      },
    });

    await auditBlacklist(session.user.id, id, data.reason, data.action);

    return ok({ isBlacklisted: updated.isBlacklisted }, `Borrower ${isBlacklisting ? "blacklisted" : "removed from blacklist"}`);
  }

  // --- General profile update ---
  const { data, error } = validateBody(updateBorrowerSchema, body);
  if (error) return error;

  const oldValues = {
    firstName: borrower.firstName,
    middleName: borrower.middleName,
    lastName: borrower.lastName,
    cellphone: borrower.cellphone,
    barangay: borrower.barangay,
    townCity: borrower.townCity,
    province: borrower.province,
    isActive: borrower.isActive,
  };

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.middleName !== undefined && { middleName: data.middleName }),
      ...(data.cellphone && { cellphone: data.cellphone }),
      ...(data.sex && { sex: data.sex }),
      ...(data.birthDate && { birthDate: new Date(data.birthDate) }),
      ...(data.purok !== undefined && { purok: data.purok }),
      ...(data.street !== undefined && { street: data.street }),
      ...(data.barangay && { barangay: data.barangay }),
      ...(data.townCity && { townCity: data.townCity }),
      ...(data.province && { province: data.province }),
      ...(data.country && { country: data.country }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  await auditBorrowerUpdated(session.user.id, id, oldValues, data as Record<string, unknown>);

  const { password: __, ...updatedData } = updated;
  return ok(updatedData, "Borrower updated successfully");
}

// ---------------------------------------------------------------
// DELETE — Soft delete
// ---------------------------------------------------------------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;
  const { session } = guard;

  const { id } = await params;
  const borrower = await db.user.findUnique({
    where: { id, role: "BORROWER", deletedAt: null },
    include: {
      _count: { select: { loans: { where: { status: "ACTIVE" } } } },
    },
  });

  if (!borrower) return notFound("Borrower not found");

  if (borrower._count.loans > 0) {
    return badRequest("Cannot delete borrower with active loans");
  }

  await db.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  return ok(null, "Borrower account deactivated");
}
