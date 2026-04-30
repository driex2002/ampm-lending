import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getInitials } from "@/lib/utils";
import { BorrowerNav } from "@/components/borrower/borrower-nav";

// Default dashboard background — professional business desk (Unsplash License, free to use)
const DEFAULT_DASHBOARD_BG =
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2560&auto=format&fit=crop";

export default async function BorrowerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");

  const [appNameSetting, bgSetting, opacitySetting] = await Promise.all([
    db.systemSetting.findUnique({ where: { key: "app_name" }, select: { value: true } }).catch(() => null),
    db.systemSetting.findUnique({ where: { key: "dashboard_bg" }, select: { value: true } }).catch(() => null),
    db.systemSetting.findUnique({ where: { key: "dashboard_bg_opacity" }, select: { value: true } }).catch(() => null),
  ]);

  const appName = appNameSetting?.value || "AMPM Lending";
  const dashboardBg = bgSetting?.value || DEFAULT_DASHBOARD_BG;
  const dashboardBgOpacity = parseFloat(opacitySetting?.value || "0.08");

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Dashboard background image overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
        style={{ backgroundImage: `url('${dashboardBg}')`, opacity: dashboardBgOpacity }}
        aria-hidden="true"
      />
      <BorrowerNav
        user={session.user}
        appName={appName}
        initials={getInitials(session.user.firstName ?? "", session.user.lastName ?? "")}
      />
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
