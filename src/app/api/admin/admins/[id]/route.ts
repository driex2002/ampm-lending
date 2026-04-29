/**
 * Admin Management — Single Admin
 * GET    /api/admin/admins/[id]  — get admin details
 * PATCH  /api/admin/admins/[id]  — update (name, phone, active status)
 * DELETE /api/admin/admins/[id]  — soft-delete / permanently remove
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { SUPER_ADMIN_EMAIL } from "@/auth";
import {
  requireAdmin,
  ok,
  badRequest,
  notFound,
  forbidden,
  serverError,
  validateBody,
} from "@/app/api/_helpers";

const updateAdminSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  middleName: z.string().max(100).nullable().optional(),
  lastName: z.string().min(1).max(100).optional(),
  cellphone: z.string().min(7).max(20).optional(),
  isActive: z.boolean().optional(),
  nickname: z.string().max(50).nullable().optional(),
});

async function getAdmin(id: string) {
  return db.user.findFirst({
    where: { id, role: "ADMIN", email: { not: SUPER_ADMIN_EMAIL } },
    select: {
      id: true, email: true, firstName: true, middleName: true, lastName: true,
      cellphone: true, isActive: true, avatarUrl: true, nickname: true,
      createdAt: true, lastLoginAt: true, mustChangePassword: true,
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  const { id } = await params;
  const admin = await getAdmin(id);
  if (!admin) return notFound("Admin not found");

  return ok(admin);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;
  const { session } = guard;

  // Only super admin can modify other admins
  if (!session.user.isSuperAdmin) {
    return forbidden("Only the super admin can modify admin accounts");
  }

  const { id } = await params;
  const admin = await getAdmin(id);
  if (!admin) return notFound("Admin not found");

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const { data, error } = validateBody(updateAdminSchema, body);
  if (error) return error;

  try {
    const updated = await db.user.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.middleName !== undefined && { middleName: data.middleName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.cellphone !== undefined && { cellphone: data.cellphone }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.nickname !== undefined && { nickname: data.nickname || null }),
      },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });
    return ok(updated, "Admin updated");
  } catch (err) {
    console.error(err);
    return serverError("Failed to update admin");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;
  const { session } = guard;

  if (!session.user.isSuperAdmin) {
    return forbidden("Only the super admin can remove admin accounts");
  }

  const { id } = await params;
  if (id === session.user.id) {
    return forbidden("Cannot delete your own account");
  }

  const admin = await getAdmin(id);
  if (!admin) return notFound("Admin not found");

  try {
    // Soft-delete: mark inactive and set deletedAt
    await db.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
    return ok({}, "Admin account removed");
  } catch (err) {
    console.error(err);
    return serverError("Failed to remove admin");
  }
}
