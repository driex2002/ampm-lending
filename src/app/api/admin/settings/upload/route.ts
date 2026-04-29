/**
 * Admin: Upload branding assets (app icon / favicon / login background)
 * POST /api/admin/settings/upload
 * Body: { key: "app_icon" | "app_favicon" | "login_bg", dataUrl: string }
 * The dataUrl must be a base64-encoded image data URL (e.g. "data:image/png;base64,...")
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, ok, badRequest, serverError, validateBody } from "@/app/api/_helpers";

const ALLOWED_KEYS = ["app_icon", "app_favicon", "login_bg", "dashboard_bg"] as const;

const uploadSchema = z.object({
  key: z.enum(ALLOWED_KEYS),
  dataUrl: z
    .string()
    .max(2_000_000, "Image too large (max ~1.5 MB)")
    .refine(
      (v) => v === "" || /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/.test(v),
      "Must be a valid base64 image data URL or empty string"
    ),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;
  const { session } = guard;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const { data, error } = validateBody(uploadSchema, body);
  if (error) return error;

  try {
    const setting = await db.systemSetting.upsert({
      where: { key: data.key },
      update: { value: data.dataUrl, updatedBy: session.user.id },
      create: {
        key: data.key,
        value: data.dataUrl,
        description: data.key === "app_icon"
          ? "Application icon (base64 data URL)"
          : data.key === "app_favicon"
          ? "Browser tab favicon (base64 data URL)"
          : data.key === "login_bg"
          ? "Login page background image (base64 data URL)"
          : "Dashboard background image (base64 data URL)",
        category: "branding",
        updatedBy: session.user.id,
      },
    });
    return ok({ key: setting.key }, "Asset uploaded successfully");
  } catch (err) {
    console.error(err);
    return serverError("Failed to save asset");
  }
}

/** Clear a branding asset (set back to empty) */
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;
  const { session } = guard;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const schema = z.object({ key: z.enum(ALLOWED_KEYS) });
  const { data, error } = validateBody(schema, body);
  if (error) return error;

  try {
    await db.systemSetting.update({
      where: { key: data.key },
      data: { value: "", updatedBy: session.user.id },
    });
    return ok({}, "Asset removed");
  } catch (err) {
    console.error(err);
    return serverError("Failed to remove asset");
  }
}
