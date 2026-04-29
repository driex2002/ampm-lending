/**
 * Public: App Configuration
 * GET /api/public/app-config — returns branding settings (no auth required)
 */
import { db } from "@/lib/db";
import { ok } from "@/app/api/_helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await db.systemSetting.findMany({
    where: { key: { in: ["app_name", "app_icon", "app_favicon", "login_bg", "login_bg_opacity", "dashboard_bg", "dashboard_bg_opacity"] } },
    select: { key: true, value: true },
  });

  const config: Record<string, string> = {};
  for (const s of settings) config[s.key] = s.value;

  return ok({
    appName: config["app_name"] || "AMPM Lending",
    appIcon: config["app_icon"] || "",
    appFavicon: config["app_favicon"] || "",
    loginBg: config["login_bg"] || "",
    loginBgOpacity: config["login_bg_opacity"] || "0.25",
    dashboardBg: config["dashboard_bg"] || "",
    dashboardBgOpacity: config["dashboard_bg_opacity"] || "0.08",
  });
}
