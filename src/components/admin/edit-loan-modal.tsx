"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateLoanSchema } from "@/lib/validations/loan";
import type { z } from "zod";

type FormData = z.infer<typeof updateLoanSchema>;

interface LoanSnapshot {
  id: string;
  loanNumber: string;
  principalAmount: number;
  totalPeriods: number | null;
  interestRate: number;
  interestRateType: string;
  penaltyAmount: number;
  penaltyType: string | null;
  graceDays: number;
  status: string;
  startDate: string;
  notes: string | null;
}

interface Props {
  loan: LoanSnapshot;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DEFAULTED", label: "Defaulted" },
  { value: "RESTRUCTURED", label: "Restructured" },
  { value: "CANCELLED", label: "Cancelled" },
];

const RATE_TYPE_OPTIONS = [
  { value: "PERCENTAGE_PER_PERIOD", label: "% Per Period" },
  { value: "FLAT_RATE", label: "Flat Rate" },
  { value: "DIMINISHING", label: "Diminishing Balance" },
];

const PENALTY_TYPE_OPTIONS = [
  { value: "", label: "None" },
  { value: "FLAT", label: "Flat Amount" },
  { value: "PERCENTAGE_OF_PRINCIPAL", label: "% of Principal" },
  { value: "PERCENTAGE_OF_OUTSTANDING", label: "% of Outstanding" },
];

export function EditLoanModal({ loan, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(updateLoanSchema),
    defaultValues: {
      principalAmount: loan.principalAmount,
      totalPeriods: loan.totalPeriods ?? undefined,
      interestRate: loan.interestRate,
      interestRateType: loan.interestRateType as FormData["interestRateType"],
      penaltyAmount: loan.penaltyAmount,
      penaltyType: (loan.penaltyType ?? "") as FormData["penaltyType"],
      graceDays: loan.graceDays,
      status: loan.status as FormData["status"],
      startDate: loan.startDate.split("T")[0],
      notes: loan.notes ?? "",
    },
  });

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      try {
        // Coerce empty penaltyType to null
        const payload = {
          ...data,
          penaltyType: data.penaltyType || null,
        };
        const res = await fetch(`/api/admin/loans/${loan.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) { toast.error(json.error ?? "Failed to update loan"); return; }
        toast.success("Loan updated successfully!");
        onSuccess();
      } catch {
        toast.error("An error occurred");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-800">Edit Loan <span className="text-brand-600 font-mono">{loan.loanNumber}</span></h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Status */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Status</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Loan Status</label>
              <select {...register("status")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {errors.status && <p className="text-red-500 text-xs mt-0.5">{errors.status.message}</p>}
            </div>
          </div>

          {/* Loan Amounts */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Loan Amounts</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Principal Amount (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register("principalAmount", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.principalAmount && <p className="text-red-500 text-xs mt-0.5">{errors.principalAmount.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1"># of Terms</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  {...register("totalPeriods", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.totalPeriods && <p className="text-red-500 text-xs mt-0.5">{errors.totalPeriods.message}</p>}
              </div>
            </div>
          </div>

          {/* Interest */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Interest</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.0001"
                  {...register("interestRate", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.interestRate && <p className="text-red-500 text-xs mt-0.5">{errors.interestRate.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rate Type</label>
                <select {...register("interestRateType")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  {RATE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Penalty */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Penalty</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Penalty Amount</label>
                <input
                  type="number"
                  step="0.01"
                  {...register("penaltyAmount", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.penaltyAmount && <p className="text-red-500 text-xs mt-0.5">{errors.penaltyAmount.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Penalty Type</label>
                <select {...register("penaltyType")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  {PENALTY_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Grace Days</label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  {...register("graceDays", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.graceDays && <p className="text-red-500 text-xs mt-0.5">{errors.graceDays.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  {...register("startDate")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.startDate && <p className="text-red-500 text-xs mt-0.5">{errors.startDate.message}</p>}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              {...register("notes")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
