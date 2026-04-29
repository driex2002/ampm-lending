import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login – AMPM Lending",
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      {/* Logo / Brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
          <span className="text-3xl">💳</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          AMPM Lending
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
        © {new Date().getFullYear()} AMPM Lending. All rights reserved.
      </p>
    </div>
  );
}
