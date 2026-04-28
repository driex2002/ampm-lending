"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createBorrowerSchema } from "@/lib/validations/borrower";
import type { z } from "zod";

type FormData = z.infer<typeof createBorrowerSchema>;

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateBorrowerModal({ onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(createBorrowerSchema),
    defaultValues: { country: "Philippines", sex: "Male" },
  });

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/borrowers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? "Failed to create borrower");
          return;
        }
        toast.success("Borrower account created! Temporary password sent to email.");
        onSuccess();
      } catch {
        toast.error("An error occurred");
      }
    });
  };

  const field = (name: keyof FormData, label: string, type = "text", required = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        {...register(name)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {errors[name] && <p className="text-red-500 text-xs mt-0.5">{errors[name]?.message as string}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-800">Create New Borrower</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Personal Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field("email", "Email Address", "email", true)}
              {field("cellphone", "Cellphone Number", "tel", true)}
              {field("firstName", "First Name", "text", true)}
              {field("middleName", "Middle Name")}
              {field("lastName", "Last Name", "text", true)}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sex <span className="text-red-500">*</span></label>
                <select {...register("sex")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {field("birthDate", "Birth Date", "date", true)}
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Address Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field("purok", "Purok")}
              {field("street", "Street")}
              {field("barangay", "Barangay", "text", true)}
              {field("townCity", "Town / City", "text", true)}
              {field("province", "Province", "text", true)}
              {field("country", "Country", "text", true)}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Internal Notes (Admin Only)</label>
            <textarea
              {...register("notes")}
              rows={2}
              placeholder="Internal remarks about this borrower..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : "Create Borrower"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
