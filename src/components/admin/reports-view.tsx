"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, Loader2, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

type ReportType = "collections" | "portfolio" | "overdue";

export function ReportsView() {
  const [reportType, setReportType] = useState<ReportType>("collections");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", reportType],
    queryFn: () => fetch(`/api/admin/reports?type=${reportType}`).then(r => r.json()),
  });

  const reportData = data?.data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BarChart2 size={22} /> Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Analytics and lending performance data</p>
      </div>

      {/* Report Type Selector */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: "collections", label: "Collections" },
          { id: "portfolio", label: "Loan Portfolio" },
          { id: "overdue", label: "Overdue Analysis" },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setReportType(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${reportType === id ? "bg-brand-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-100">
          <Loader2 className="animate-spin text-brand-600" size={32} />
        </div>
      ) : (
        <div className="space-y-6">
          {reportType === "collections" && reportData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Total Collected", value: formatCurrency(reportData.summary?.totalCollected ?? 0) },
                  { label: "Collected This Month", value: formatCurrency(reportData.summary?.thisMonth ?? 0) },
                  { label: "Avg. Payment Size", value: formatCurrency(reportData.summary?.avgPayment ?? 0) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
                  </div>
                ))}
              </div>

              {/* Monthly Collections Chart */}
              {reportData.monthly && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-700 mb-4">Monthly Collections</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={reportData.monthly} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => {
                          if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
                          if (v >= 1_000) return `₱${(v / 1_000).toFixed(0)}k`;
                          return `₱${v}`;
                        }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="collected" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="Collected" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {reportType === "portfolio" && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total Loans", value: reportData.summary?.totalLoans ?? 0 },
                  { label: "Active Loans", value: reportData.summary?.activeLoans ?? 0 },
                  { label: "Completed", value: reportData.summary?.completedLoans ?? 0 },
                  { label: "Defaulted", value: reportData.summary?.defaultedLoans ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total Principal Disbursed</p>
                  <p className="text-xl font-bold text-gray-800 mt-1">{formatCurrency(reportData.summary?.totalPrincipal ?? 0)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Outstanding Balance</p>
                  <p className="text-xl font-bold text-gray-800 mt-1">{formatCurrency(reportData.summary?.totalOutstanding ?? 0)}</p>
                </div>
              </div>
            </div>
          )}

          {reportType === "overdue" && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Overdue Loans", value: reportData.summary?.overdueCount ?? 0 },
                  { label: "Overdue Amount", value: formatCurrency(reportData.summary?.overdueAmount ?? 0) },
                  { label: "Overdue Rate", value: `${reportData.summary?.overdueRate ?? 0}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="text-xl font-bold text-red-600 mt-1">{value}</p>
                  </div>
                ))}
              </div>
              {reportData.overdue && reportData.overdue.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-700">Overdue Accounts</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Loan #", "Borrower", "Days Overdue", "Outstanding"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {reportData.overdue.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-mono text-xs text-brand-700">{item.loanNumber}</td>
                            <td className="px-4 py-3">{item.borrowerName}</td>
                            <td className="px-4 py-3 text-red-600 font-semibold">{item.daysOverdue}d</td>
                            <td className="px-4 py-3 font-semibold text-red-600">{formatCurrency(item.outstandingBalance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
