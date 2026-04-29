import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Default dashboard background — professional business desk (Unsplash License, free to use)
const DEFAULT_DASHBOARD_BG =
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2560&auto=format&fit=crop";

export async function generateMetadata(): Promise<Metadata> {
  const s = await db.systemSetting
    .findUnique({ where: { key: "app_name" }, select: { value: true } })
    .catch(() => null);
  const appName = s?.value || "AMPM Lending";
  return {
    title: { template: `%s | Admin – ${appName}`, default: `Admin – ${appName}` },
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [bgSetting, opacitySetting] = await Promise.all([
    db.systemSetting.findUnique({ where: { key: "dashboard_bg" }, select: { value: true } }).catch(() => null),
    db.systemSetting.findUnique({ where: { key: "dashboard_bg_opacity" }, select: { value: true } }).catch(() => null),
  ]);

  const dashboardBg = bgSetting?.value || DEFAULT_DASHBOARD_BG;
  const dashboardBgOpacity = parseFloat(opacitySetting?.value || "0.08");

  return (
    <div className="relative flex h-screen overflow-hidden bg-gray-50">
      {/* Dashboard background image overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
        style={{ backgroundImage: `url('${dashboardBg}')`, opacity: dashboardBgOpacity }}
        aria-hidden="true"
      />
      <AdminSidebar />
      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
