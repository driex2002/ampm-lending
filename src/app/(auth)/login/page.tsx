import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getAppConfig() {
  const settings = await db.systemSetting
    .findMany({
      where: { key: { in: ["app_name", "app_icon"] } },
      select: { key: true, value: true },
    })
    .catch(() => []);
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return {
    appName: map["app_name"] || "AMPM Lending",
    appIcon: map["app_icon"] || "",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { appName } = await getAppConfig();
  return { title: `Login – ${appName}` };
}

export default async function LoginPage() {
  const { appName, appIcon } = await getAppConfig();

  return (
    <div className="w-full max-w-md">
      {/* Logo / Brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 overflow-hidden">
          {appIcon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={appIcon} alt={appName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">💳</span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          {appName}
        </h1>
        <p className="text-brand-200 mt-1 text-sm">
          Loan Management System
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Sign in to your account
        </h2>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="text-center text-brand-300 text-xs mt-6">
        © {new Date().getFullYear()} {appName}. All rights reserved.
      </p>
    </div>
  );
}
