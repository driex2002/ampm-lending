"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { RecordPaymentModal } from "@/components/admin/record-payment-modal";

interface ScheduleItem {
  id: string; periodNumber: number; dueDate: string; principalDue: number;
  interestDue: number; totalDue: number; paidAmount: number; balance: number;
  status: string; paidAt: string | null; penaltyDue: number;
  waivedAmount: number; isInterestWaived: boolean;
}

interface Payment {
  id: string; referenceNumber: string; amount: number; paymentDate: string;
  paymentType: string; principalPaid: number; interestPaid: number; penaltyPaid: number;
  waivedInterest: number; remarks: string | null;
}

interface LoanDetail {
  id: string; loanNumber: string; principalAmount: number; totalAmount: number;
  outstandingBalance: number; status: string; isOverdue: boolean; startDate: string;
  endDate: string; interestRate: number; interestRateType: string; paymentFrequency: string;
  notes: string | null;
  borrower: { id: string; firstName: string; middleName: string | null; lastName: string; email: string };
  term: { name: string } | null;
  paymentSchedules: ScheduleItem[];
  payments: Payment[];
}

export function LoanDetailView({ id }: { id: string }) {
  const qc = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { data, isLoading } = useQuery({
    queryKey: ["loan", id],
    queryFn: () => fetch(`/api/admin/loans/${id}`).then(r => r.json()),
  });

  const loan: LoanDetail | undefined = data?.data;

  const waiveInterest = (type: "PER_PAYMENT" | "FULL_LOAN", scheduleId?: string) => {
    const reason = prompt(`Reason for ${type === "FULL_LOAN" ? "full loan" : "single payment"} interest waiver:`);
    if (!reason) return;
    startTransition(async () => {
      const body: any = { _op: "waiveInterest", waiverType: type, reason };
      if (type === "PER_PAYMENT" && scheduleId) body.scheduleId = scheduleId;
      const res = await fetch(`/api/admin/loans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { toast.success("Interest waived!"); qc.invalidateQueries({ queryKey: ["loan", id] }); }
      else toast.error("Failed to waive interest");
    });
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-600" size={28} /></div>;
  if (!loan) return <div className="text-red-500 p-4">Loan not found</div>;

  const statusBadge = loan.isOverdue
    ? <span className="px-2.5 py-1 rounded text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle size={11} />Overdue</span>
    : loan.status === "COMPLETED"
      ? <span className="px-2.5 py-1 rounded text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle size={11} />Completed</span>
      : <span className="px-2.5 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">Active</span>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/loans" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft size={14} /> Back to Loans
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 font-mono">{loan.loanNumber}</h1>
            {statusBadge}
          </div>
          <Link href={`/admin/borrowers/${loan.borrower.id}`} className="text-sm text-brand-600 hover:underline mt-1 inline-block">
            {loan.borrower.firstName} {loan.borrower.lastName} ({loan.borrower.email})
          </Link>
        </div>
        <div className="flex gap-2 flex-wrap">
          {loan.status === "ACTIVE" && (
            <>
              <button onClick={() => waiveInterest("FULL_LOAN")} disabled={isPending} className="px-3 py-2 border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg text-sm transition">
                Waive Full Interest
              </button>
              <button onClick={() => setShowPayment(true)} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition">
                Record Payment
              </button>
            </>
          )}
        </div>
      </div>

      {/* Loan Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Principal", value: formatCurrency(loan.principalAmount) },
          { label: "Total Amount", value: formatCurrency(loan.totalAmount) },
          { label: "Outstanding", value: formatCurrency(loan.outstandingBalance), highlight: true },
          { label: "Interest Rate", value: `${loan.interestRate}% (${loan.interestRateType.replace(/_/g, " ")})` },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-lg font-bold mt-1 ${highlight && loan.outstandingBalance > 0 ? "text-red-600" : highlight ? "text-green-600" : "text-gray-800"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Payment Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700">Payment Schedule ({loan.paymentSchedules.length} installments)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["#", "Due Date", "Principal", "Interest", "Penalty", "Total Due", "Paid", "Balance", "Status", "Actions"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loan.paymentSchedules.map((s) => (
                <tr key={s.id} className={`hover:bg-gray-50 ${s.status === "OVERDUE" ? "bg-red-50" : ""}`}>
                  <td className="px-3 py-2.5 font-medium">{s.periodNumber}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(s.dueDate)}</td>
                  <td className="px-3 py-2.5">{formatCurrency(s.principalDue)}</td>
                  <td className="px-3 py-2.5">{formatCurrency(s.interestDue)}</td>
                  <td className="px-3 py-2.5 text-red-600">{s.penaltyDue > 0 ? formatCurrency(s.penaltyDue) : "—"}</td>
                  <td className="px-3 py-2.5 font-medium">{formatCurrency(s.totalDue)}</td>
                  <td className="px-3 py-2.5 text-green-600">{s.paidAmount > 0 ? formatCurrency(s.paidAmount) : "—"}</td>
                  <td className="px-3 py-2.5 font-semibold">{formatCurrency(s.balance)}</td>
                  <td className="px-3 py-2.5">
                    {s.status === "PAID" ? <span className="text-green-600 font-medium">Paid</span>
                      : s.status === "OVERDUE" ? <span className="text-red-600 font-medium">Overdue</span>
                      : s.status === "PARTIAL" ? <span className="text-yellow-600 font-medium">Partial</span>
                      : <span className="text-gray-400">Pending</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {s.status !== "PAID" && loan.status === "ACTIVE" && (
                      <button onClick={() => waiveInterest("PER_PAYMENT", s.id)} disabled={isPending} className="px-2 py-1 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 rounded transition whitespace-nowrap">
                        Waive Interest
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700">Payment History ({loan.payments.length} payments)</h3>
        </div>
        {loan.payments.length === 0 ? (
          <p className="text-center py-10 text-gray-400 text-sm">No payments recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Ref #", "Date", "Amount", "Principal", "Interest", "Penalty", "Waived", "Type", "Notes"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loan.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-brand-700">{p.referenceNumber}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3">{formatCurrency(p.principalPaid)}</td>
                    <td className="px-4 py-3">{formatCurrency(p.interestPaid)}</td>
                    <td className="px-4 py-3 text-red-600">{p.penaltyPaid > 0 ? formatCurrency(p.penaltyPaid) : "—"}</td>
                    <td className="px-4 py-3 text-amber-600">{p.waivedInterest > 0 ? formatCurrency(p.waivedInterest) : "—"}</td>
                    <td className="px-4 py-3 text-xs">{p.paymentType}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.remarks ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPayment && (
        <RecordPaymentModal
          loan={{ id: loan.id, loanNumber: loan.loanNumber, outstandingBalance: loan.outstandingBalance, borrower: loan.borrower }}
          onClose={() => setShowPayment(false)}
          onSuccess={() => { setShowPayment(false); qc.invalidateQueries({ queryKey: ["loan", id] }); }}
        />
      )}
    </div>
  );
}
