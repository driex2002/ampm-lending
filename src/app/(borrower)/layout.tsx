import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { getInitials } from "@/lib/utils";

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
      <BorrowerNav user={session.user} appName={appName} />
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

function BorrowerNav({ user, appName }: { user: any; appName: string }) {
  const displayName = user.nickname || user.firstName || user.name || user.email;
  const initials = getInitials(user.firstName ?? "", user.lastName ?? "");

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-brand-700">{appName}</span>
          <div className="hidden sm:flex items-center gap-1">
            {[
              { href: "/borrower/dashboard", label: "Dashboard" },
              { href: "/borrower/loans", label: "My Loans" },
              { href: "/borrower/payments", label: "Payments" },
              { href: "/borrower/profile", label: "Profile" },
            ].map(({ href, label }) => (
              <a key={href} href={href} className="px-3 py-1.5 text-sm text-gray-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition">
                {label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <a href="/borrower/profile" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-brand-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <span className="text-sm text-gray-600 hidden sm:block">{displayName}</span>
          </a>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="text-sm text-gray-500 hover:text-red-600 transition">Sign out</button>
          </form>
        </div>
      </div>
    </nav>
  );
}
