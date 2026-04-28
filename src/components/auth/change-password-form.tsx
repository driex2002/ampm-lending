"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password required"),
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

export function ChangePasswordForm() {
  const router = useRouter();
  const { update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [show, setShow] = useState({ current: false, new: false, confirm: false });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const newPassword = watch("newPassword", "");

  const checks = [
    { label: "8+ characters", ok: newPassword.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(newPassword) },
    { label: "Lowercase letter", ok: /[a-z]/.test(newPassword) },
    { label: "Number", ok: /[0-9]/.test(newPassword) },
    { label: "Special char (@#$!%^&*)", ok: /[@#$!%^&*]/.test(newPassword) },
  ];

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/borrower/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();

        if (!res.ok) {
          toast.error(json.error ?? "Failed to change password");
          return;
        }

        await update({ mustChangePassword: false });
        toast.success("Password changed successfully!");
        router.push("/");
        router.refresh();
      } catch {
        toast.error("An unexpected error occurred");
      }
    });
  };

  const fieldProps = (field: keyof typeof show) => ({
    type: show[field] ? "text" : "password",
    className:
      "w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {(["current", "new", "confirm"] as const).map((field) => {
        const labels = {
          current: "Current Password",
          new: "New Password",
          confirm: "Confirm New Password",
        };
        const keys = {
          current: "currentPassword",
          new: "newPassword",
          confirm: "confirmPassword",
        } as const;

        return (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {labels[field]}
            </label>
            <div className="relative">
              <input
                {...fieldProps(field)}
                {...register(keys[field])}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShow((s) => ({ ...s, [field]: !s[field] }))}
                tabIndex={-1}
              >
                {show[field] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors[keys[field]] && (
              <p className="text-red-500 text-xs mt-1">
                {errors[keys[field]]?.message}
              </p>
            )}
          </div>
        );
      })}

      {/* Password strength checklist */}
      {newPassword.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-xs">
              <CheckCircle
                size={14}
                className={c.ok ? "text-green-500" : "text-gray-300"}
              />
              <span className={c.ok ? "text-green-700" : "text-gray-500"}>
                {c.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm"
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Changing password...
          </>
        ) : (
          "Change Password"
        )}
      </button>
    </form>
  );
}
