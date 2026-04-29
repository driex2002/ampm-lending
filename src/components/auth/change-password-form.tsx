"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const schema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "One uppercase letter required")
      .regex(/[a-z]/, "One lowercase letter required")
      .regex(/[0-9]/, "One number required")
      .regex(/[@#$!%^&*]/, "One special character required (@#$!%^&*)"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

/** mode="forced"  — used on /change-password page (hides current password, shows cancel/sign-out)
 *  mode="profile" — used on the borrower profile page (always shows current password, no cancel button) */
export function ChangePasswordForm({ mode = "forced" }: { mode?: "forced" | "profile" }) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const isForcedChange = mode === "forced" && session?.user?.mustChangePassword === true;
  const [isPending, startTransition] = useTransition();
  const [show, setShow] = useState({ current: false, new: false, confirm: false });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const newPassword = watch("newPassword", "");
  const confirmPassword = watch("confirmPassword", "");

  const passwordChecks = [
    { label: "8+ characters", ok: newPassword.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(newPassword) },
    { label: "Lowercase letter", ok: /[a-z]/.test(newPassword) },
    { label: "Number", ok: /[0-9]/.test(newPassword) },
    { label: "Special char (@#$!%^&*)", ok: /[@#$!%^&*]/.test(newPassword) },
  ];

  const confirmOk = confirmPassword.length > 0 && confirmPassword === newPassword;
  const confirmBad = confirmPassword.length > 0 && confirmPassword !== newPassword;

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      try {
        const payload: Record<string, string> = {
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
        };
        if (!isForcedChange && data.currentPassword) {
          payload.currentPassword = data.currentPassword;
        }
        const res = await fetch("/api/borrower/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();

        if (!res.ok) {
          toast.error(json.error ?? "Failed to change password");
          return;
        }

        await update({ mustChangePassword: false });
        toast.success("Password changed successfully!");

        if (mode === "profile") {
          reset();
        } else {
          router.push("/borrower/dashboard");
          router.refresh();
        }
      } catch {
        toast.error("An unexpected error occurred");
      }
    });
  };

  const inputClass =
    "w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Current password — hidden during forced first-login change */}
      {!isForcedChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <div className="relative">
            <input
              type={show.current ? "text" : "password"}
              className={inputClass}
              {...register("currentPassword")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              onClick={() => setShow((s) => ({ ...s, current: !s.current }))}
              tabIndex={-1}
            >
              {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-red-500 text-xs mt-1">{errors.currentPassword.message}</p>
          )}
        </div>
      )}

      {/* New password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
        <div className="relative">
          <input
            type={show.new ? "text" : "password"}
            className={inputClass}
            {...register("newPassword")}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            onClick={() => setShow((s) => ({ ...s, new: !s.new }))}
            tabIndex={-1}
          >
            {show.new ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.newPassword && (
          <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>
        )}
        {/* Password strength checklist — shown while typing */}
        {newPassword.length > 0 && (
          <div className="mt-2 bg-gray-50 rounded-lg p-3 space-y-1">
            {passwordChecks.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-xs">
                {c.ok
                  ? <CheckCircle size={13} className="text-green-500 shrink-0" />
                  : <XCircle size={13} className="text-gray-300 shrink-0" />}
                <span className={c.ok ? "text-green-700" : "text-gray-500"}>{c.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
        <div className="relative">
          <input
            type={show.confirm ? "text" : "password"}
            className={`${inputClass} ${confirmOk ? "border-green-400 focus:ring-green-400" : confirmBad ? "border-red-400 focus:ring-red-400" : ""}`}
            {...register("confirmPassword")}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
            tabIndex={-1}
          >
            {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {confirmPassword.length > 0 && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${confirmOk ? "text-green-600" : "text-red-500"}`}>
            {confirmOk
              ? <><CheckCircle size={12} /> Passwords match</>
              : <><XCircle size={12} /> Passwords do not match</>}
          </p>
        )}
        {errors.confirmPassword && !confirmPassword.length && (
          <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm"
      >
        {isPending ? (
          <><Loader2 size={16} className="animate-spin" /> Changing password...</>
        ) : (
          "Change Password"
        )}
      </button>

      {mode === "forced" && (
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition py-1"
        >
          Cancel — sign out
        </button>
      )}
    </form>
  );
}
