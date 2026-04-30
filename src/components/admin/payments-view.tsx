"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, DollarSign, RefreshCw } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { EditPaymentModal } from "@/components/admin/edit-payment-modal";
import type { PaymentSnapshot } from "@/components/admin/edit-payment-modal";

interface Payment {
  id: string; referenceNumber: string; amount: number; paymentDate: string;
  paymentType: string; principalPaid: number; interestPaid: number;
  penaltyPaid: number; waivedInterest: number; remarks: string | null;
  loan: { id: string; loanNumber: string; borrower: { id: string; firstName: string; middleName: string | null; lastName: string; email: string } };
}

export function PaymentsView() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editPayment, setEditPayment] = useState<PaymentSnapshot | null>(null);
  const qc = useQueryClient();

  const query = new URLSearchParams({ page: String(page), limit: "20", ...(search && { search }) });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-payments", search, page],
    queryFn: () => fetch(`/api/admin/payments?${query}`).then(r => r.json()),
  });

  const payments: Payment[] = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><DollarSign size={22} /> Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">All recorded payment transactions</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by reference, borrower, or loan #..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <button onClick={() => refetch()} className="p-2.5 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50"><RefreshCw size={16} /></button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-brand-600" size={28} /></div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><DollarSign size={40} className="mx-auto mb-3 opacity-30" /><p>No payments found</p></div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {payments.map((p) => (
                <div key={p.id} className="px-4 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-semibold text-brand-700">{p.referenceNumber}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(p.paymentDate)}</p>
                    </div>
                    <p className="text-base font-bold text-green-600 shrink-0">{formatCurrency(p.amount)}</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <Link href={`/admin/borrowers/${p.loan.borrower.id}`} className="font-medium text-gray-800 hover:text-brand-600">
                      {p.loan.borrower.firstName} {p.loan.borrower.lastName}
                    </Link>
                    <span className="text-gray-300">·</span>
                    <Link href={`/admin/loans/${p.loan.id}`} className="font-mono text-brand-600 hover:underline">{p.loan.loanNumber}</Link>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-500">{p.paymentType}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-gray-400">Principal</p>
                      <p className="text-gray-700 font-medium">{formatCurrency(p.principalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Interest</p>
                      <p className="text-gray-700 font-medium">{formatCurrency(p.interestPaid)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Penalty</p>
                      <p className={p.penaltyPaid > 0 ? "text-red-600 font-medium" : "text-gray-400"}>{p.penaltyPaid > 0 ? formatCurrency(p.penaltyPaid) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Waived</p>
                      <p className={p.waivedInterest > 0 ? "text-amber-600 font-medium" : "text-gray-400"}>{p.waivedInterest > 0 ? formatCurrency(p.waivedInterest) : "—"}</p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => setEditPayment({
                        id: p.id,
                        referenceNumber: p.referenceNumber,
                        amount: p.amount,
                        paymentDate: p.paymentDate,
                        paymentType: p.paymentType,
                        principalPaid: p.principalPaid,
                        interestPaid: p.interestPaid,
                        penaltyPaid: p.penaltyPaid,
                        remarks: p.remarks,
                      })}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium transition"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Ref #", "Date", "Borrower", "Loan #", "Amount", "Principal", "Interest", "Penalty", "Waived", "Type", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-brand-700">{p.referenceNumber}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap text-gray-500">{formatDateTime(p.paymentDate)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/borrowers/${p.loan.borrower.id}`} className="text-gray-800 hover:text-brand-600">
                          {p.loan.borrower.firstName} {p.loan.borrower.lastName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/loans/${p.loan.id}`} className="font-mono text-xs text-brand-600 hover:underline">{p.loan.loanNumber}</Link>
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(p.principalPaid)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(p.interestPaid)}</td>
                      <td className="px-4 py-3 text-red-600">{p.penaltyPaid > 0 ? formatCurrency(p.penaltyPaid) : "—"}</td>
                      <td className="px-4 py-3 text-amber-600">{p.waivedInterest > 0 ? formatCurrency(p.waivedInterest) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.paymentType}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditPayment({
                            id: p.id,
                            referenceNumber: p.referenceNumber,
                            amount: p.amount,
                            paymentDate: p.paymentDate,
                            paymentType: p.paymentType,
                            principalPaid: p.principalPaid,
                            interestPaid: p.interestPaid,
                            penaltyPaid: p.penaltyPaid,
                            remarks: p.remarks,
                          })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-xs font-medium transition"
                        >
                          Edit
                        </button>
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

      {editPayment && (
        <EditPaymentModal
          payment={editPayment}
          onClose={() => setEditPayment(null)}
          onSuccess={() => { setEditPayment(null); qc.invalidateQueries({ queryKey: ["admin-payments"] }); }}
        />
      )}
    </div>
  );
}
