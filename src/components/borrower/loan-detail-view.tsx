"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface ScheduleItem {
  id: string; installmentNumber: number; dueDate: string;
  principalDue: number; interestDue: number; totalDue: number;
  paidAmount: number; balance: number; status: string; penaltyAmount: number;
}

interface LoanDetail {
  id: string; loanNumber: string; principalAmount: number; totalAmount: number;
  outstandingBalance: number; status: string; isOverdue: boolean;
  startDate: string; endDate: string; interestRate: number;
  rateType: string; paymentFrequency: string;
  term: { name: string } | null;
  schedules: ScheduleItem[];
}

export function BorrowerLoanDetailView({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["borrower-loan", id],
    queryFn: () => fetch(`/api/borrower/loans/${id}`).then(r => r.json()),
  });

  const loan: LoanDetail | undefined = data?.data;

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-600" size={28} /></div>;
  if (!loan) return <div className="text-red-500 p-4">Loan not found</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/borrower/loans" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ArrowLeft size={14} /> Back to Loans
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900 font-mono">{loan.loanNumber}</h1>
          {loan.isOverdue ? (
            <span className="px-2.5 py-1 rounded text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle size={11} />Overdue</span>
          ) : loan.status === "COMPLETED" ? (
            <span className="px-2.5 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Completed</span>
          ) : (
            <span className="px-2.5 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">Active</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{loan.term?.name ?? "Custom"} · {loan.paymentFrequency.replace(/_/g, " ")}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Principal", value: formatCurrency(loan.principalAmount) },
          { label: "Total Amount", value: formatCurrency(loan.totalAmount) },
          { label: "Outstanding", value: formatCurrency(loan.outstandingBalance), highlight: true },
          { label: "Interest Rate", value: `${loan.interestRate}%` },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-base font-bold mt-1 ${highlight && loan.outstandingBalance > 0 ? "text-red-600" : highlight ? "text-green-600" : "text-gray-800"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700">Payment Schedule</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["#", "Due Date", "Total Due", "Paid", "Balance", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loan.schedules.map((s) => (
                <tr key={s.id} className={s.status === "OVERDUE" ? "bg-red-50" : ""}>
                  <td className="px-4 py-3 font-medium text-gray-700">{s.installmentNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(s.dueDate)}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(s.totalDue)}{s.penaltyAmount > 0 && <span className="text-xs text-red-500 ml-1">(+{formatCurrency(s.penaltyAmount)} penalty)</span>}</td>
                  <td className="px-4 py-3 text-green-600">{s.paidAmount > 0 ? formatCurrency(s.paidAmount) : "—"}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(s.balance)}</td>
                  <td className="px-4 py-3">
                    {s.status === "PAID" ? <span className="text-green-600 font-medium text-xs">Paid</span>
                      : s.status === "OVERDUE" ? <span className="text-red-600 font-medium text-xs">Overdue</span>
                      : s.status === "PARTIAL" ? <span className="text-yellow-600 font-medium text-xs">Partial</span>
                      : <span className="text-gray-400 text-xs">Pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
