"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, CreditCard, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface Loan {
  id: string; loanNumber: string; principalAmount: number; outstandingBalance: number;
  totalAmount: number; status: string; isOverdue: boolean; startDate: string;
  term: { name: string } | null;
}

export function BorrowerLoansView() {
  const { data, isLoading } = useQuery({
    queryKey: ["borrower-loans"],
    queryFn: () => fetch("/api/borrower/loans").then(r => r.json()),
  });

  const loans: Loan[] = data?.data ?? [];

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-600" size={28} /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Loans</h1>
        <p className="text-sm text-gray-500 mt-0.5">All your loan accounts</p>
      </div>

      {loans.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
          <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
          <p>No loans found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {loans.map((loan) => (
            <Link key={loan.id} href={`/borrower/loans/${loan.id}`}>
              <div className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition cursor-pointer ${loan.isOverdue ? "border-red-200" : "border-gray-100"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono font-semibold text-brand-700">{loan.loanNumber}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{loan.term?.name ?? "Custom Term"} · Started {formatDate(loan.startDate)}</p>
                  </div>
                  <div className="text-right">
                    {loan.isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                        <AlertTriangle size={10} /> Overdue
                      </span>
                    ) : loan.status === "COMPLETED" ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Completed</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Active</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Principal</p>
                    <p className="text-sm font-semibold text-gray-700">{formatCurrency(loan.principalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total Amount</p>
                    <p className="text-sm font-semibold text-gray-700">{formatCurrency(loan.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Outstanding</p>
                    <p className={`text-sm font-bold ${loan.outstandingBalance > 0 && loan.status !== "COMPLETED" ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(loan.outstandingBalance)}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
