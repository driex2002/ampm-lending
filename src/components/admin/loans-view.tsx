"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Eye, RefreshCw, Loader2, CreditCard, AlertTriangle, CalendarDays } from "lucide-react";
import { formatCurrency, formatDate, getFullName } from "@/lib/utils";
import { CreateLoanModal } from "@/components/admin/create-loan-modal";
import { RecordPaymentModal } from "@/components/admin/record-payment-modal";
import { EditLoanModal } from "@/components/admin/edit-loan-modal";
import Link from "next/link";

interface Loan {
  id: string; loanNumber: string; principalAmount: number; totalAmount: number;
  outstandingBalance: number; status: string; isOverdue: boolean; startDate: string;
  interestRate: number; interestRateType: string; penaltyAmount: number;
  penaltyType: string | null; graceDays: number; notes: string | null;
  nextDueDate?: string; nextDueAmount?: number;
  paymentFrequency: string | null; totalPeriods: number | null;
  borrower: { id: string; firstName: string; middleName: string | null; lastName: string; email: string };
}

const FREQ_LABELS: Record<string, string> = {
  DAILY: "Daily", WEEKLY: "Weekly", SEMI_MONTHLY: "Semi-Monthly",
  MONTHLY: "Monthly", QUARTERLY: "Quarterly", SEMI_ANNUAL: "Semi-Annual", YEARLY: "Yearly",
};

export function LoansView() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [paymentLoan, setPaymentLoan] = useState<Loan | null>(null);
  const [editLoan, setEditLoan] = useState<Loan | null>(null);

  const query = new URLSearchParams({
    page: String(page), limit: "20",
    ...(search && { search }),
    ...(status && { status }),
    ...(overdue && { overdue: "true" }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-loans", search, status, overdue, dateFrom, dateTo, page],
    queryFn: () => fetch(`/api/admin/loans?${query}`).then((r) => r.json()),
  });

  const loans: Loan[] = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;

  const statusBadge = (loan: Loan) => {
    if (loan.isOverdue) return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle size={10} />Overdue</span>;
    if (loan.status === "COMPLETED") return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Completed</span>;
    if (loan.status === "ACTIVE") return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Active</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">{loan.status}</span>;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><CreditCard size={22} /> Loans</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage all loan accounts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
          <Plus size={16} /> New Loan
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search loan # or borrower..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="DEFAULTED">Defaulted</option>
        </select>
        <button onClick={() => { setOverdue(!overdue); setPage(1); }} className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition ${overdue ? "bg-red-100 border-red-300 text-red-700" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
          <AlertTriangle size={14} className="inline mr-1.5" />Overdue
        </button>
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-gray-400 shrink-0" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            title="Start date from"
          />
          <span className="text-gray-400 text-xs">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            title="Start date to"
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }} className="text-xs text-gray-400 hover:text-gray-600 transition">✕</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-brand-600" size={28} /></div>
        ) : loans.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><CreditCard size={40} className="mx-auto mb-3 opacity-30" /><p>No loans found</p></div>
        ) : (
          <>
            {/* Mobile / tablet cards */}
            <div className="lg:hidden divide-y divide-gray-100">
              {loans.map((loan) => (
                <div key={loan.id} className="px-4 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-semibold text-brand-700">{loan.loanNumber}</p>
                      <p className="font-medium text-gray-800 text-sm mt-0.5">
                        {getFullName(loan.borrower.firstName, loan.borrower.middleName, loan.borrower.lastName)}
                      </p>
                      <p className="text-xs text-gray-400">{loan.borrower.email}</p>
                    </div>
                    <div className="shrink-0">{statusBadge(loan)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <span className="text-gray-400">Principal</span>
                      <p className="text-gray-700 font-medium">{formatCurrency(loan.principalAmount)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Outstanding</span>
                      <p className={loan.outstandingBalance > 0 ? "font-semibold text-gray-800" : "font-semibold text-green-600"}>
                        {formatCurrency(loan.outstandingBalance)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Term</span>
                      <p className="text-gray-600">
                        {loan.paymentFrequency
                          ? `${FREQ_LABELS[loan.paymentFrequency] ?? loan.paymentFrequency} × ${loan.totalPeriods}`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Next Due</span>
                      {loan.nextDueDate ? (
                        <p className="text-gray-700">{formatDate(loan.nextDueDate)} <span className="text-gray-400">({formatCurrency(loan.nextDueAmount)})</span></p>
                      ) : <p className="text-gray-400">—</p>}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/admin/loans/${loan.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-medium transition"
                    >
                      <Eye size={13} /> View
                    </Link>
                    <button
                      onClick={() => setEditLoan(loan)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium transition"
                    >
                      Edit
                    </button>
                    {loan.status === "ACTIVE" && (
                      <button
                        onClick={() => setPaymentLoan(loan)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-medium transition"
                      >
                        Pay
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Loan #", "Borrower", "Principal", "Outstanding", "Term", "Next Due", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-brand-700">{loan.loanNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{getFullName(loan.borrower.firstName, loan.borrower.middleName, loan.borrower.lastName)}</p>
                        <p className="text-xs text-gray-400">{loan.borrower.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatCurrency(loan.principalAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={loan.outstandingBalance > 0 ? "font-semibold text-gray-800" : "text-green-600 font-semibold"}>
                          {formatCurrency(loan.outstandingBalance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {loan.paymentFrequency
                          ? `${FREQ_LABELS[loan.paymentFrequency] ?? loan.paymentFrequency} × ${loan.totalPeriods}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {loan.nextDueDate ? (
                          <div>
                            <p className="text-gray-700">{formatDate(loan.nextDueDate)}</p>
                            <p className="text-gray-400">{formatCurrency(loan.nextDueAmount)}</p>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">{statusBadge(loan)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/admin/loans/${loan.id}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded text-xs font-medium transition">
                            <Eye size={12} /> View
                          </Link>
                          <button onClick={() => setEditLoan(loan)} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-xs font-medium transition">
                            Edit
                          </button>
                          {loan.status === "ACTIVE" && (
                            <button onClick={() => setPaymentLoan(loan)} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded text-xs font-medium transition">
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">Total: {pagination.total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs border rounded disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <span className="px-3 py-1.5 text-xs">{page} / {pagination.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="px-3 py-1.5 text-xs border rounded disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateLoanModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ["admin-loans"] }); }} />
      )}
      {paymentLoan && (
        <RecordPaymentModal loan={paymentLoan} onClose={() => setPaymentLoan(null)} onSuccess={() => { setPaymentLoan(null); qc.invalidateQueries({ queryKey: ["admin-loans"] }); qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); }} />
      )}
      {editLoan && (
        <EditLoanModal
          loan={{
            id: editLoan.id,
            loanNumber: editLoan.loanNumber,
            principalAmount: editLoan.principalAmount,
            totalPeriods: editLoan.totalPeriods,
            interestRate: editLoan.interestRate,
            interestRateType: editLoan.interestRateType,
            penaltyAmount: editLoan.penaltyAmount,
            penaltyType: editLoan.penaltyType,
            graceDays: editLoan.graceDays,
            status: editLoan.status,
            startDate: editLoan.startDate,
            notes: editLoan.notes,
          }}
          onClose={() => setEditLoan(null)}
          onSuccess={() => { setEditLoan(null); qc.invalidateQueries({ queryKey: ["admin-loans"] }); }}
        />
      )}
    </div>
  );
}
