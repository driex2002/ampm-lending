"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Loader2, User, Phone, MapPin, CreditCard,
  Shield, ShieldOff, KeyRound, Edit2, X, AlertTriangle, CheckCircle,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, getFullName } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { CreateLoanModal } from "@/components/admin/create-loan-modal";
import { RecordPaymentModal } from "@/components/admin/record-payment-modal";

interface BorrowerDetail {
  id: string; email: string; firstName: string; middleName: string | null; lastName: string;
  cellphone: string; sex: string; birthDate: string; isActive: boolean; isBlacklisted: boolean;
  purok: string | null; street: string | null; barangay: string | null; townCity: string | null;
  province: string | null; country: string | null; notes: string | null; createdAt: string;
  loans: Array<{
    id: string; loanNumber: string; principalAmount: number; outstandingBalance: number;
    status: string; isOverdue: boolean; startDate: string; nextDueDate?: string;
  }>;
}

export function BorrowerDetailView({ id }: { id: string }) {
  const qc = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [showCreateLoan, setShowCreateLoan] = useState(false);
  const [paymentLoan, setPaymentLoan] = useState<{
    id: string; loanNumber: string; outstandingBalance: number;
    nextDueDate?: string; nextDueAmount?: number;
    borrower: { id: string; firstName: string; lastName: string };
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["borrower", id],
    queryFn: () => fetch(`/api/admin/borrowers/${id}`).then(r => r.json()),
  });

  const borrower: BorrowerDetail | undefined = data?.data;

  const resetPassword = () => {
    if (!confirm("Send a new temporary password to this borrower's email?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/borrowers/${id}/reset-password`, { method: "POST" });
      if (res.ok) toast.success("Temporary password sent!");
      else toast.error("Failed to reset password");
    });
  };

  const toggleBlacklist = () => {
    if (!borrower) return;
    const action = borrower.isBlacklisted ? "remove from" : "add to";
    const reason = borrower.isBlacklisted ? undefined : prompt("Reason for blacklisting:");
    if (!borrower.isBlacklisted && !reason) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/borrowers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _op: "blacklist", blacklisted: !borrower.isBlacklisted, reason }),
      });
      if (res.ok) {
        toast.success(`Borrower ${action}ed blacklist`);
        qc.invalidateQueries({ queryKey: ["borrower", id] });
      } else toast.error("Failed to update blacklist status");
    });
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-600" size={28} /></div>;
  if (!borrower) return <div className="text-red-500 p-4">Borrower not found</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Actions */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/borrowers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft size={14} /> Back to Borrowers
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{getFullName(borrower.firstName, borrower.middleName, borrower.lastName)}</h1>
          <p className="text-sm text-gray-500">{borrower.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={resetPassword} disabled={isPending} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition">
            <KeyRound size={14} /> Reset Password
          </button>
          <button onClick={toggleBlacklist} disabled={isPending} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition ${borrower.isBlacklisted ? "bg-green-50 border border-green-300 text-green-700 hover:bg-green-100" : "bg-red-50 border border-red-300 text-red-700 hover:bg-red-100"}`}>
            {borrower.isBlacklisted ? <><ShieldOff size={14} /> Remove from Blacklist</> : <><Shield size={14} /> Blacklist</>}
          </button>
          <button onClick={() => setShowCreateLoan(true)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm transition">
            <CreditCard size={14} /> New Loan
          </button>
        </div>
      </div>

      {/* Status Banners */}
      {borrower.isBlacklisted && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle size={16} /> This borrower is blacklisted and cannot take new loans.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><User size={16} /> Personal Info</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Sex</dt><dd className="font-medium">{borrower.sex}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Birthdate</dt><dd className="font-medium">{formatDate(borrower.birthDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd className="font-medium">{borrower.cellphone}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Member since</dt><dd className="font-medium">{formatDate(borrower.createdAt)}</dd></div>
            </dl>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><MapPin size={16} /> Address</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {[borrower.purok, borrower.street, borrower.barangay, borrower.townCity, borrower.province, borrower.country].filter(Boolean).join(", ")}
            </p>
          </div>
          {borrower.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h3 className="font-semibold text-amber-700 mb-2 text-sm">Internal Notes</h3>
              <p className="text-sm text-amber-800 whitespace-pre-wrap">{borrower.notes}</p>
            </div>
          )}
        </div>

        {/* Loans */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2"><CreditCard size={16} /> Loans ({borrower.loans.length})</h3>
            </div>
            {borrower.loans.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No loans yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {borrower.loans.map((loan) => (
                  <div key={loan.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-mono text-xs font-semibold text-brand-700">{loan.loanNumber}</p>
                      <p className="text-sm text-gray-700 mt-0.5">Principal: {formatCurrency(loan.principalAmount)}</p>
                      <p className="text-xs text-gray-500">Outstanding: <span className={loan.outstandingBalance > 0 ? "text-gray-700 font-semibold" : "text-green-600 font-semibold"}>{formatCurrency(loan.outstandingBalance)}</span></p>
                    </div>
                    <div className="text-right">
                      {loan.nextDueDate && <p className="text-xs text-gray-500">Due: {formatDate(loan.nextDueDate)}</p>}
                      <div className="mt-1">
                        {loan.isOverdue ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Overdue</span>
                        ) : loan.status === "COMPLETED" ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Completed</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Active</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Link href={`/admin/loans/${loan.id}`} className="px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded text-xs font-medium transition">View</Link>
                      {loan.status === "ACTIVE" && (
                        <button onClick={() => setPaymentLoan({ ...loan, borrower: { id: borrower.id, firstName: borrower.firstName, lastName: borrower.lastName } })} className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded text-xs font-medium transition">Pay</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateLoan && (
        <CreateLoanModal onClose={() => setShowCreateLoan(false)} onSuccess={() => { setShowCreateLoan(false); qc.invalidateQueries({ queryKey: ["borrower", id] }); }} />
      )}
      {paymentLoan && (
        <RecordPaymentModal loan={paymentLoan} onClose={() => setPaymentLoan(null)} onSuccess={() => { setPaymentLoan(null); qc.invalidateQueries({ queryKey: ["borrower", id] }); }} />
      )}
    </div>
  );
}
