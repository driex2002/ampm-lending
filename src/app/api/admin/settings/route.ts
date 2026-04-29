/**
 * Admin: System Settings API
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, ok, badRequest, serverError, validateBody } from "@/app/api/_helpers";

const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

// Batch update schema
const batchUpdateSchema = z.object({
  settings: z.array(z.object({ key: z.string().min(1), value: z.string() })).min(1),
});

export async function GET(_req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  const settings = await db.systemSetting.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] });
  return ok(settings);
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;
  const { session } = guard;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  // Support both single { key, value } and batch { settings: [...] }
  const isBatch = body !== null && typeof body === "object" && "settings" in (body as object);

  if (isBatch) {
    const { data, error } = validateBody(batchUpdateSchema, body);
    if (error) return error;

    try {
      await db.$transaction(
        data.settings.map(({ key, value }) =>
          db.systemSetting.upsert({
            where: { key },
            update: { value, updatedBy: session.user.id },
            create: { key, value, category: "general", updatedBy: session.user.id },
          })
        )
      );
      return ok({}, "Settings saved");
    } catch (err) {
      console.error(err);
      return serverError("Failed to save settings");
    }
  }

  const { data, error } = validateBody(updateSettingSchema, body);
  if (error) return error;

  try {
    const setting = await db.systemSetting.update({
      where: { key: data.key },
      data: { value: data.value, updatedBy: session.user.id },
    });
    return ok(setting, "Setting updated");
  } catch (err) {
    console.error(err);
    return serverError("Failed to update setting");
  }
}
