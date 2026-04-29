"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createLoanSchema } from "@/lib/validations/loan";
import type { z } from "zod";

type FormData = z.infer<typeof createLoanSchema>;

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface BorrowerOption { id: string; firstName: string; middleName: string | null; lastName: string; email: string; }

const FREQ_OPTIONS = [
  { value: "DAILY",        label: "Daily" },
  { value: "WEEKLY",       label: "Weekly" },
  { value: "SEMI_MONTHLY", label: "Semi-Monthly" },
  { value: "MONTHLY",      label: "Monthly" },
  { value: "QUARTERLY",    label: "Quarterly" },
  { value: "SEMI_ANNUAL",  label: "Semi-Annual" },
  { value: "YEARLY",       label: "Yearly" },
];

export function CreateLoanModal({ onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [borrowers, setBorrowers] = useState<BorrowerOption[]>([]);
  const [borrowerSearch, setBorrowerSearch] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(createLoanSchema),
    defaultValues: { startDate: new Date().toISOString().split("T")[0], interestRateType: "PERCENTAGE_PER_PERIOD", penaltyAmount: 0, graceDays: 0, paymentFrequency: "MONTHLY" },
  });

  useEffect(() => {
    const t = setTimeout(() => {
      const q = borrowerSearch ? `?search=${encodeURIComponent(borrowerSearch)}&limit=10` : "?limit=10";
      fetch(`/api/admin/borrowers${q}`).then(r => r.json()).then(d => setBorrowers(d?.data?.data ?? []));
    }, 300);
    return () => clearTimeout(t);
  }, [borrowerSearch]);

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/loans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) { toast.error(json.error ?? "Failed to create loan"); return; }
        toast.success("Loan created and payment schedule generated!");
        onSuccess();
      } catch { toast.error("An error occurred"); }
    });
  };

  const field = (name: keyof FormData, label: string, type = "text", required = false, step?: string) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input type={type} step={step} {...register(name, type === "number" ? { valueAsNumber: true } : {})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      {errors[name] && <p className="text-red-500 text-xs mt-0.5">{errors[name]?.message as string}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-800">Create New Loan</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Borrower */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Borrower</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Search Borrower <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Type name or email..." value={borrowerSearch} onChange={(e) => setBorrowerSearch(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2" />
              <select {...register("borrowerId")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                <option value="">-- Select Borrower --</option>
                {borrowers.map(b => (
                  <option key={b.id} value={b.id}>{b.firstName} {b.lastName} ({b.email})</option>
                ))}
              </select>
              {errors.borrowerId && <p className="text-red-500 text-xs mt-0.5">{errors.borrowerId.message}</p>}
            </div>
          </div>

          {/* Loan Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Loan Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field("principalAmount", "Principal Amount (₱)", "number", true, "0.01")}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Loan Term <span className="text-red-500">*</span></label>
                <select {...register("paymentFrequency")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  {FREQ_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {errors.paymentFrequency && <p className="text-red-500 text-xs mt-0.5">{errors.paymentFrequency.message as string}</p>}
              </div>
              {field("totalPeriods", "# of Terms", "number", true)}
              {field("interestRate", "Interest Rate (%)", "number", true, "0.01")}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rate Type <span className="text-red-500">*</span></label>
                <select {...register("interestRateType")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="PERCENTAGE_PER_PERIOD">% Per Period</option>
                  <option value="FLAT_RATE">Flat Rate</option>
                  <option value="DIMINISHING">Diminishing Balance</option>
                </select>
              </div>
              {field("startDate", "Start Date", "date", true)}
              {field("penaltyAmount", "Penalty Amount (optional)", "number", false, "0.01")}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Penalty Type</label>
                <select {...register("penaltyType")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="">None</option>
                  <option value="FLAT">Flat Amount</option>
                  <option value="PERCENTAGE_OF_PRINCIPAL">% of Principal</option>
                  <option value="PERCENTAGE_OF_OUTSTANDING">% of Outstanding</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea {...register("notes")} rows={2} placeholder="Internal notes for this loan..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : "Create Loan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
