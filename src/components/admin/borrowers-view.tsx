"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Eye, RefreshCw, Loader2, Users,
  AlertTriangle, CheckCircle, XCircle,
} from "lucide-react";
import { formatDate, getFullName } from "@/lib/utils";
import { toast } from "sonner";
import { CreateBorrowerModal } from "@/components/admin/create-borrower-modal";
import Link from "next/link";

interface Borrower {
  id: string; email: string; firstName: string; middleName: string | null;
  lastName: string; cellphone: string; isActive: boolean; isBlacklisted: boolean;
  createdAt: string; activeLoansCount: number; fullName: string;
}

interface BorrowersResponse {
  data: { data: Borrower[]; pagination: { total: number; totalPages: number; page: number } };
}

export function BorrowersView() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const query = new URLSearchParams({
    page: String(page), limit: "20",
    ...(search && { search }),
    ...(status && { status }),
  });

  const { data, isLoading, refetch } = useQuery<BorrowersResponse>({
    queryKey: ["admin-borrowers", search, status, page],
    queryFn: () => fetch(`/api/admin/borrowers?${query}`).then((r) => r.json()),
  });

  const borrowers = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={22} /> Borrowers
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage all borrower accounts
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} /> New Borrower
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blacklisted">Blacklisted</option>
        </select>
        <button onClick={() => refetch()} className="p-2.5 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table / Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-brand-600" size={28} />
          </div>
        ) : borrowers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>No borrowers found</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {borrowers.map((b) => (
                <div key={b.id} className="px-4 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{b.fullName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{b.email}</p>
                    </div>
                    {b.isBlacklisted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 shrink-0">
                        <XCircle size={10} /> Blacklisted
                      </span>
                    ) : b.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 shrink-0">
                        <CheckCircle size={10} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 shrink-0">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{b.cellphone || "—"}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${
                        b.activeLoansCount > 0 ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {b.activeLoansCount} loan{b.activeLoansCount !== 1 ? "s" : ""}
                    </span>
                    <span className="text-gray-400">Since {formatDate(b.createdAt)}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/admin/borrowers/${b.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-medium transition"
                    >
                      <Eye size={13} /> View / Manage
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Name", "Email", "Phone", "Active Loans", "Status", "Created", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {borrowers.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-800">{b.fullName}</td>
                      <td className="px-4 py-3 text-gray-600">{b.email}</td>
                      <td className="px-4 py-3 text-gray-600">{b.cellphone}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${b.activeLoansCount > 0 ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                          {b.activeLoansCount} loan{b.activeLoansCount !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {b.isBlacklisted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            <XCircle size={10} /> Blacklisted
                          </span>
                        ) : b.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle size={10} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(b.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/borrowers/${b.id}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded text-xs font-medium transition">
                          <Eye size={12} /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
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

      {/* Create Borrower Modal */}
      {showCreate && (
        <CreateBorrowerModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ["admin-borrowers"] });
          }}
        />
      )}
    </div>
  );
}
