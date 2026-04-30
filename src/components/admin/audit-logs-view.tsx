"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, Shield, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface AuditLog {
  id: string; action: string; entityType: string; entityId: string | null;
  description: string; metadata: any; createdAt: string;
  actor: { firstName: string; lastName: string; email: string } | null;
}

export function AuditLogsView() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({
    page: String(page), limit: "30",
    ...(search && { search }),
    ...(action && { action }),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-audit-logs", search, action, page],
    queryFn: () => fetch(`/api/admin/audit-logs?${query}`).then(r => r.json()),
  });

  const logs: AuditLog[] = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;

  const actionColors: Record<string, string> = {
    CREATE: "bg-green-100 text-green-700",
    UPDATE: "bg-blue-100 text-blue-700",
    RECORD_PAYMENT: "bg-emerald-100 text-emerald-700",
    WAIVE_INTEREST: "bg-amber-100 text-amber-700",
    BLACKLIST: "bg-red-100 text-red-700",
    UNBLACKLIST: "bg-orange-100 text-orange-700",
    PASSWORD_CHANGED: "bg-purple-100 text-purple-700",
    EMAIL_CHANGED: "bg-cyan-100 text-cyan-700",
    LOGIN: "bg-gray-100 text-gray-600",
    DEFAULT: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Shield size={22} /> Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Complete audit trail of all system actions</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search descriptions..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="RECORD_PAYMENT">Record Payment</option>
          <option value="WAIVE_INTEREST">Waive Interest</option>
          <option value="EMAIL_CHANGED">Email Changed</option>
          <option value="BLACKLIST">Blacklist</option>
          <option value="UNBLACKLIST">Unblacklist</option>
          <option value="PASSWORD_CHANGED">Password Changed</option>
          <option value="LOGIN">Login</option>
        </select>
        <button onClick={() => refetch()} className="p-2.5 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50"><RefreshCw size={16} /></button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-brand-600" size={28} /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><Shield size={40} className="mx-auto mb-3 opacity-30" /><p>No audit logs found</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-3.5 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColors[log.action] ?? actionColors.DEFAULT}`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-gray-400">{log.entityType}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{log.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      by {log.actor ? `${log.actor.firstName} ${log.actor.lastName} (${log.actor.email})` : "System"}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
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
    </div>
  );
}
