"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { recordPaymentSchema } from "@/lib/validations/payment";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { z } from "zod";

type FormData = z.infer<typeof recordPaymentSchema>;

interface Loan {
  id: string; loanNumber: string; outstandingBalance: number;
  nextDueDate?: string; nextDueAmount?: number;
  borrower: { id: string; firstName: string; lastName: string };
}

interface Props {
  loan: Loan;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecordPaymentModal({ loan, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      loanId: loan.id,
      borrowerId: loan.borrower.id,
      amount: loan.nextDueAmount ?? 0,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentType: "CASH",
    },
  });

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) { toast.error(json.error ?? "Failed to record payment"); return; }
        toast.success("Payment recorded successfully!");
        onSuccess();
      } catch { toast.error("An error occurred"); }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-800">Record Payment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">{loan.borrower.firstName} {loan.borrower.lastName}</p>
          <p className="text-xs text-gray-500 mt-0.5">{loan.loanNumber} · Outstanding: <span className="font-semibold text-gray-700">{formatCurrency(loan.outstandingBalance)}</span></p>
          {loan.nextDueDate && (
            <p className="text-xs text-gray-500 mt-0.5">Next due: {formatDate(loan.nextDueDate)} — {formatCurrency(loan.nextDueAmount)}</p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <input type="hidden" {...register("loanId")} />
          <input type="hidden" {...register("borrowerId")} />

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₱) <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            {errors.amount && <p className="text-red-500 text-xs mt-0.5">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date <span className="text-red-500">*</span></label>
            <input type="date" {...register("paymentDate")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            {errors.paymentDate && <p className="text-red-500 text-xs mt-0.5">{errors.paymentDate.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Type</label>
            <select {...register("paymentType")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="GCASH">GCash</option>
              <option value="MAYA">Maya</option>
              <option value="CUSTOM">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Penalty Waiver</label>
            <select {...register("waiverType")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
              <option value="">No Waiver</option>
              <option value="FULL_LOAN">Full Loan Waiver</option>
              <option value="PER_PAYMENT">This Payment Only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
            <textarea {...register("remarks")} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
