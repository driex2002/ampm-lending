import type { Metadata } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Login" };

// Free-to-use Unsplash photo — modern financial district (Unsplash License)
const DEFAULT_LOGIN_BG =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2560&auto=format&fit=crop";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [bgSetting, opacitySetting] = await Promise.all([
    db.systemSetting.findUnique({ where: { key: "login_bg" }, select: { value: true } }).catch(() => null),
    db.systemSetting.findUnique({ where: { key: "login_bg_opacity" }, select: { value: true } }).catch(() => null),
  ]);

  const loginBg = bgSetting?.value || DEFAULT_LOGIN_BG;
  const loginBgOpacity = parseFloat(opacitySetting?.value || "0.25");

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 overflow-hidden">
      {/* Background image overlay — sits above gradient, content sits above this */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${loginBg}')`, opacity: loginBgOpacity }}
        aria-hidden="true"
      />
      {/* Foreground content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}
