"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, CreditCard, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface BorrowerDashboard {
  totalActiveLoans: number;
  totalOutstandingBalance: number;
  nextDueDate?: string;
  nextDueAmount?: number;
  overdueCount: number;
  recentPayments: Array<{
    id: string; referenceNumber: string; amount: number; paymentDate: string; loan: { loanNumber: string };
  }>;
  activeLoans: Array<{
    id: string; loanNumber: string; principalAmount: number; outstandingBalance: number;
    nextDueDate?: string; nextDueAmount?: number; isOverdue: boolean;
  }>;
}

export function BorrowerDashboardView() {
  const { data, isLoading } = useQuery<{ data: BorrowerDashboard }>({
    queryKey: ["borrower-dashboard"],
    queryFn: () => fetch("/api/borrower/dashboard").then(r => r.json()),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-600" size={28} /></div>;

  const stats = data?.data;
  if (!stats) return <div className="text-red-500">Failed to load dashboard</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your lending account summary</p>
      </div>

      {stats.overdueCount > 0 && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={16} />
          <span>You have <strong>{stats.overdueCount}</strong> overdue payment{stats.overdueCount !== 1 ? "s" : ""}. Please contact us immediately.</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Active Loans", value: stats.totalActiveLoans.toString(), icon: CreditCard, color: "text-blue-600" },
          { label: "Total Outstanding", value: formatCurrency(stats.totalOutstandingBalance), icon: DollarSign, color: stats.totalOutstandingBalance > 0 ? "text-red-600" : "text-green-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {stats.nextDueDate && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800">Next Payment Due</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(stats.nextDueAmount)}</p>
          <p className="text-sm text-amber-600 mt-0.5">Due on {formatDate(stats.nextDueDate)}</p>
        </div>
      )}

      {/* Active Loans */}
      {stats.activeLoans.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">Active Loans</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.activeLoans.map((loan) => (
              <Link key={loan.id} href={`/borrower/loans/${loan.id}`} className="block px-5 py-4 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-mono font-semibold text-brand-700">{loan.loanNumber}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Principal: {formatCurrency(loan.principalAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${loan.isOverdue ? "text-red-600" : "text-gray-800"}`}>
                      {formatCurrency(loan.outstandingBalance)}
                    </p>
                    {loan.nextDueDate && <p className="text-xs text-gray-400">Due {formatDate(loan.nextDueDate)}</p>}
                    {loan.isOverdue && <span className="text-xs text-red-600 font-medium">OVERDUE</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Payments */}
      {stats.recentPayments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Recent Payments</h3>
            <Link href="/borrower/payments" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentPayments.map((p) => (
              <div key={p.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono text-xs text-brand-700">{p.referenceNumber}</p>
                  <p className="text-xs text-gray-400">{p.loan.loanNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-gray-400">{formatDate(p.paymentDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
