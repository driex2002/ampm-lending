/**
 * Profile API — nickname and avatar for authenticated users (admin + borrower)
 * GET  /api/profile  — get current user's profile extras
 * PATCH /api/profile — update nickname and/or avatarUrl
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { auth } from "@/auth";
import { ok, unauthorized, badRequest, serverError, validateBody } from "@/app/api/_helpers";

const updateProfileSchema = z.object({
  nickname: z.string().max(50, "Nickname too long (max 50 chars)").nullable().optional(),
  avatarUrl: z
    .string()
    .max(2_000_000, "Image too large (max ~1.5 MB)")
    .refine(
      (v) => v === "" || v === null || /^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(v),
      "Must be a valid base64 image data URL or empty"
    )
    .nullable()
    .optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, nickname: true, avatarUrl: true, firstName: true, lastName: true, email: true },
  });
  if (!user) return unauthorized();

  return ok(user);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const { data, error } = validateBody(updateProfileSchema, body);
  if (error) return error;

  try {
    const updated = await db.user.update({
      where: { id: session.user.id },
      data: {
        ...(data.nickname !== undefined && { nickname: data.nickname || null }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl || null }),
      },
      select: { id: true, nickname: true, avatarUrl: true },
    });
    return ok(updated, "Profile updated");
  } catch (err) {
    console.error(err);
    return serverError("Failed to update profile");
  }
}
