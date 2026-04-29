/**
 * Admin: Borrower Notification Preferences
 * GET   /api/admin/borrowers/[id]/notification-prefs  — get prefs
 * PATCH /api/admin/borrowers/[id]/notification-prefs  — update prefs
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, ok, badRequest, notFound, serverError } from "@/app/api/_helpers";

const ALLOWED_KEYS = ["payment_confirmation", "payment_reminder", "overdue_alert", "login_alert"] as const;
type NotifKey = (typeof ALLOWED_KEYS)[number];
type NotifPrefs = Record<NotifKey, boolean>;

const DEFAULTS: NotifPrefs = {
  payment_confirmation: true,
  payment_reminder: true,
  overdue_alert: true,
  login_alert: true,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, notificationPrefs: true } });
  if (!user) return notFound("Borrower not found");

  const stored = (user.notificationPrefs ?? {}) as Partial<NotifPrefs>;
  const merged: NotifPrefs = { ...DEFAULTS, ...stored };

  return ok(merged);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, notificationPrefs: true } });
  if (!user) return notFound("Borrower not found");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  // Only accept known boolean keys
  const patch: Partial<NotifPrefs> = {};
  for (const key of ALLOWED_KEYS) {
    if (key in body && typeof body[key] === "boolean") {
      patch[key] = body[key] as boolean;
    }
  }

  if (Object.keys(patch).length === 0) {
    return badRequest("No valid preference keys provided");
  }

  const existing = (user.notificationPrefs ?? {}) as Partial<NotifPrefs>;
  const updated = { ...DEFAULTS, ...existing, ...patch };

  await db.user.update({
    where: { id },
    data: { notificationPrefs: updated },
  });

  return ok(updated, "Notification preferences updated");
}
