"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updatePaymentSchema } from "@/lib/validations/payment";
import type { z } from "zod";

type FormData = z.infer<typeof updatePaymentSchema>;

export interface PaymentSnapshot {
  id: string;
  referenceNumber: string;
  amount: number;
  paymentDate: string;
  paymentType: string;
  principalPaid: number;
  interestPaid: number;
  penaltyPaid: number;
  remarks: string | null;
}

interface Props {
  payment: PaymentSnapshot;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_TYPE_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
  { value: "CUSTOM", label: "Custom" },
];

export function EditPaymentModal({ payment, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(updatePaymentSchema),
    defaultValues: {
      amount: payment.amount,
      paymentDate: payment.paymentDate.split("T")[0],
      paymentType: payment.paymentType as FormData["paymentType"],
      principalPaid: payment.principalPaid,
      interestPaid: payment.interestPaid,
      penaltyPaid: payment.penaltyPaid,
      remarks: payment.remarks ?? "",
    },
  });

  const watchedAmount = watch("amount") ?? 0;
  const watchedPrincipal = watch("principalPaid") ?? 0;
  const watchedInterest = watch("interestPaid") ?? 0;
  const watchedPenalty = watch("penaltyPaid") ?? 0;
  const breakdownTotal = watchedPrincipal + watchedInterest + watchedPenalty;

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/payments/${payment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) { toast.error(json.error ?? "Failed to update payment"); return; }
        toast.success("Payment updated successfully!");
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
          <h2 className="text-lg font-semibold text-gray-800">
            Edit Payment <span className="text-brand-600 font-mono text-sm">{payment.referenceNumber}</span>
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Amount & Date */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Payment Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Total Amount (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register("amount", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.amount && <p className="text-red-500 text-xs mt-0.5">{errors.amount.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
                <input
                  type="date"
                  {...register("paymentDate")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.paymentDate && <p className="text-red-500 text-xs mt-0.5">{errors.paymentDate.message}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Type</label>
                <select
                  {...register("paymentType")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  {PAYMENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">Breakdown</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Principal (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("principalPaid", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.principalPaid && <p className="text-red-500 text-xs mt-0.5">{errors.principalPaid.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Interest (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("interestPaid", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.interestPaid && <p className="text-red-500 text-xs mt-0.5">{errors.interestPaid.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Penalty (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("penaltyPaid", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.penaltyPaid && <p className="text-red-500 text-xs mt-0.5">{errors.penaltyPaid.message}</p>}
              </div>
            </div>
            {/* Breakdown validation hint */}
            <div className={`mt-2 text-xs flex justify-between ${breakdownTotal > watchedAmount + 0.01 ? "text-red-500" : "text-gray-400"}`}>
              <span>Breakdown total: ₱{breakdownTotal.toFixed(2)}</span>
              <span>Payment amount: ₱{Number(watchedAmount).toFixed(2)}</span>
            </div>
            {breakdownTotal > watchedAmount + 0.01 && (
              <p className="text-red-500 text-xs mt-0.5">Breakdown cannot exceed the total amount</p>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
            <textarea
              {...register("remarks")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
            <button
              type="submit"
              disabled={isPending || breakdownTotal > watchedAmount + 0.01}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
            >
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
