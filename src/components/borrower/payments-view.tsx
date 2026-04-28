"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Payment {
  id: string; referenceNumber: string; amount: number; paymentDate: string;
  paymentType: string; principalPaid: number; interestPaid: number;
  loan: { loanNumber: string };
}

export function BorrowerPaymentsView() {
  const { data, isLoading } = useQuery({
    queryKey: ["borrower-payments"],
    queryFn: () => fetch("/api/borrower/payments").then(r => r.json()),
  });

  const payments: Payment[] = data?.data ?? [];

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-600" size={28} /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Payment History</h1>
        <p className="text-sm text-gray-500 mt-0.5">All your recorded payments</p>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
          <DollarSign size={40} className="mx-auto mb-3 opacity-30" />
          <p>No payments recorded yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {payments.map((p) => (
            <div key={p.id} className="px-5 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs font-semibold text-brand-700">{p.referenceNumber}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{p.loan.loanNumber}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.paymentType}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-green-600">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(p.paymentDate)}</p>
                </div>
              </div>
              <div className="flex gap-4 mt-2 pt-2 border-t border-gray-50 text-xs text-gray-500">
                <span>Principal: <strong className="text-gray-700">{formatCurrency(p.principalPaid)}</strong></span>
                <span>Interest: <strong className="text-gray-700">{formatCurrency(p.interestPaid)}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
