import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const metadata: Metadata = { title: "Change Password" };

export default function ChangePasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
          <span className="text-3xl">🔐</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Secure Your Account</h1>
        <p className="text-brand-200 mt-1 text-sm">
          Set a new password to continue
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-amber-800 text-sm font-medium">
            ⚠️ Password Change Required
          </p>
          <p className="text-amber-700 text-xs mt-1">
            Your account was created with a temporary password. You must set a
            new secure password before continuing.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
