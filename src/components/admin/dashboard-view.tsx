"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users, CreditCard, DollarSign, AlertTriangle,
  TrendingUp, CheckCircle, ArrowUpRight, Loader2,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";

interface DashboardStats {
  totalBorrowers: number;
  activeBorrowers: number;
  totalActiveLoans: number;
  totalOutstandingBalance: number;
  totalCollectedToday: number;
  totalCollectedThisMonth: number;
  overdueLoans: number;
  loansCompletedThisMonth: number;
  recentPayments: Array<{
    id: string; referenceNumber: string; amount: number; paymentDate: string;
    borrower: { firstName: string; lastName: string };
    loan: { loanNumber: string };
  }>;
  overdueAccounts: Array<{
    id: string; loanNumber: string; outstandingBalance: number;
    borrower: { firstName: string; lastName: string; email: string };
  }>;
}

function StatCard({ title, value, sub, icon: Icon, color, href }: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; color: string; href?: string;
}) {
  const content = (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${color === "text-red-600" ? "bg-red-50" : color === "text-green-600" ? "bg-green-50" : color === "text-blue-600" ? "bg-blue-50" : "bg-gray-50"}`}>
          <Icon size={20} className={color} />
        </div>
      </div>
      {href && (
        <div className="mt-3 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700">
          <span>View all</span><ArrowUpRight size={12} />
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export function AdminDashboardView() {
  const { data, isLoading, error } = useQuery<{ data: DashboardStats }>({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetch("/api/admin/dashboard").then((r) => r.json()),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  if (error || !data?.data) {
    return <div className="text-red-500 p-4">Failed to load dashboard. Please refresh.</div>;
  }

  const stats = data.data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of lending operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Borrowers" value={stats.totalBorrowers.toString()} sub={`${stats.activeBorrowers} active`} icon={Users} color="text-blue-600" href="/admin/borrowers" />
        <StatCard title="Active Loans" value={stats.totalActiveLoans.toString()} sub={`${stats.loansCompletedThisMonth} completed this month`} icon={CreditCard} color="text-indigo-600" href="/admin/loans" />
        <StatCard title="Outstanding Balance" value={formatCurrency(stats.totalOutstandingBalance)} sub="Total across all loans" icon={DollarSign} color="text-gray-700" />
        <StatCard title="Overdue Loans" value={stats.overdueLoans.toString()} sub="Require attention" icon={AlertTriangle} color="text-red-600" href="/admin/loans?overdue=true" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        <StatCard title="Collected Today" value={formatCurrency(stats.totalCollectedToday)} icon={TrendingUp} color="text-green-600" />
        <StatCard title="Collected This Month" value={formatCurrency(stats.totalCollectedThisMonth)} icon={CheckCircle} color="text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Recent Payments</h3>
            <Link href="/admin/payments" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentPayments.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No payments yet</p>
            )}
            {stats.recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {payment.borrower.firstName} {payment.borrower.lastName}
                  </p>
                  <p className="text-xs text-gray-400">{payment.loan.loanNumber} · {payment.referenceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(payment.paymentDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Accounts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              Overdue Accounts
            </h3>
            <Link href="/admin/loans?overdue=true" className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {stats.overdueAccounts.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No overdue accounts 🎉</p>
            )}
            {stats.overdueAccounts.map((loan) => (
              <Link key={loan.id} href={`/admin/loans/${loan.id}`} className="block">
                <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-red-50 rounded px-1 transition">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {loan.borrower.firstName} {loan.borrower.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{loan.loanNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600">{formatCurrency(loan.outstandingBalance)}</p>
                    <span className="text-xs bg-red-100 text-red-700 rounded px-1.5 py-0.5">OVERDUE</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
