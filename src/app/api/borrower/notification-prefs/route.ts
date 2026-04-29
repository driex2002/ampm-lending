/**
 * Borrower: Notification Preferences
 * GET  /api/borrower/notification-prefs  — fetch current prefs
 * PATCH /api/borrower/notification-prefs — update prefs
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, ok, serverError } from "@/app/api/_helpers";

export async function GET() {
  const guard = await requireAuth();
  if ("status" in guard) return guard;
  const userId = guard.session.user.id;

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });

    // Default: all enabled
    const defaults = {
      payment_confirmation: true,
      payment_reminder: true,
      overdue_alert: true,
      login_alert: true,
    };

    return ok({ ...defaults, ...((user?.notificationPrefs ?? {}) as object) });
  } catch (err) {
    console.error("[NotifPrefs GET]", err);
    return serverError("Failed to fetch notification preferences");
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAuth();
  if ("status" in guard) return guard;
  const userId = guard.session.user.id;

  try {
    const body = await req.json();

    // Only allow the known keys
    const allowed = ["payment_confirmation", "payment_reminder", "overdue_alert", "login_alert"];
    const prefs: Record<string, boolean> = {};
    for (const key of allowed) {
      if (typeof body[key] === "boolean") {
        prefs[key] = body[key];
      }
    }

    // Get existing and merge
    const existing = await db.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });

    const merged = { ...((existing?.notificationPrefs ?? {}) as object), ...prefs };

    await db.user.update({
      where: { id: userId },
      data: { notificationPrefs: merged },
    });

    return ok(merged);
  } catch (err) {
    console.error("[NotifPrefs PATCH]", err);
    return serverError("Failed to update notification preferences");
  }
}
