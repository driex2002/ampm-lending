"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Shield, Plus, Search, Loader2,
  Pencil, Trash2, X, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  cellphone: string;
  isActive: boolean;
  avatarUrl: string | null;
  nickname: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

interface CreateForm {
  email: string;
  firstName: string;
  middleName: string;
  lastName: string;
  cellphone: string;
  sendWelcomeEmail: boolean;
}

interface EditForm {
  firstName: string;
  middleName: string;
  lastName: string;
  cellphone: string;
  isActive: boolean;
  nickname: string;
}

const EMPTY_CREATE: CreateForm = {
  email: "", firstName: "", middleName: "", lastName: "",
  cellphone: "", sendWelcomeEmail: true,
};

export function AdminsView() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const isSuperAdmin = session?.user?.isSuperAdmin;

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [editForm, setEditForm] = useState<EditForm>({ firstName: "", middleName: "", lastName: "", cellphone: "", isActive: true, nickname: "" });

  const { data, isLoading } = useQuery<{ data: AdminUser[] }>({
    queryKey: ["admins", search],
    queryFn: () => fetch(`/api/admin/admins?search=${encodeURIComponent(search)}`).then(r => r.json()),
  });

  const admins = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body: CreateForm) =>
      fetch("/api/admin/admins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Admin account created. Welcome email sent.");
        setShowCreate(false);
        setCreateForm(EMPTY_CREATE);
        qc.invalidateQueries({ queryKey: ["admins"] });
      } else {
        toast.error(res.error ?? "Failed to create admin");
      }
    },
    onError: () => toast.error("Network error"),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, ...body }: EditForm & { id: string }) =>
      fetch(`/api/admin/admins/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Admin updated");
        setEditTarget(null);
        qc.invalidateQueries({ queryKey: ["admins"] });
      } else {
        toast.error(res.error ?? "Failed to update");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/admins/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Admin account removed");
        setDeleteTarget(null);
        qc.invalidateQueries({ queryKey: ["admins"] });
      } else {
        toast.error(res.error ?? "Failed to remove");
      }
    },
  });

  const toggleActive = (admin: AdminUser) => {
    editMutation.mutate({ id: admin.id, firstName: admin.firstName, middleName: admin.middleName ?? "", lastName: admin.lastName, cellphone: admin.cellphone, isActive: !admin.isActive, nickname: admin.nickname ?? "" });
  };

  const openEdit = (admin: AdminUser) => {
    setEditForm({ firstName: admin.firstName, middleName: admin.middleName ?? "", lastName: admin.lastName, cellphone: admin.cellphone, isActive: admin.isActive, nickname: admin.nickname ?? "" });
    setEditTarget(admin);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield size={22} /> Admin Accounts
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage administrator accounts</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          <Plus size={15} /> New Admin
        </button>
      </div>



      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : admins.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Shield size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No admin accounts found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {admins.map((admin) => (
            <div key={admin.id} className="flex items-center gap-4 px-5 py-4">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                {admin.avatarUrl ? (
                  <img src={admin.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-brand-600 flex items-center justify-center text-white text-sm font-semibold">
                    {getInitials(admin.firstName, admin.lastName)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {admin.firstName} {admin.lastName}
                  {admin.nickname && <span className="text-gray-400 font-normal ml-1">"{admin.nickname}"</span>}
                </p>
                <p className="text-xs text-gray-400 truncate">{admin.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Last login: {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : "Never"}
                </p>
              </div>

              {/* Status badge */}
              <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${admin.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {admin.isActive ? "Active" : "Suspended"}
              </span>

              {/* Actions (super admin only) */}
              {isSuperAdmin && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(admin)}
                    title={admin.isActive ? "Suspend account" : "Activate account"}
                    className="p-1.5 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition"
                  >
                    {admin.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    onClick={() => openEdit(admin)}
                    title="Edit admin"
                    className="p-1.5 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(admin)}
                    title="Remove admin"
                    className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Create Modal ─────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Shield size={16} /> New Admin Account</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {(["firstName", "lastName", "email", "cellphone"] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{field.replace(/([A-Z])/g, " $1")}</label>
                  <input
                    type={field === "email" ? "email" : "text"}
                    value={createForm[field]}
                    onChange={e => setCreateForm(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Middle Name (optional)</label>
                <input
                  value={createForm.middleName}
                  onChange={e => setCreateForm(p => ({ ...p, middleName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={createForm.sendWelcomeEmail} onChange={e => setCreateForm(p => ({ ...p, sendWelcomeEmail: e.target.checked }))} className="rounded" />
                Send welcome email with temporary password
              </label>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
              <button
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate(createForm)}
                className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white rounded-lg text-sm font-medium transition"
              >
                {createMutation.isPending ? <><Loader2 size={14} className="inline animate-spin mr-1" />Creating…</> : "Create Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Edit Admin — {editTarget.email}</h2>
              <button onClick={() => setEditTarget(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {(["firstName", "lastName", "cellphone"] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{field.replace(/([A-Z])/g, " $1")}</label>
                  <input
                    value={editForm[field]}
                    onChange={e => setEditForm(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Middle Name (optional)</label>
                <input
                  value={editForm.middleName}
                  onChange={e => setEditForm(p => ({ ...p, middleName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nickname (optional)</label>
                <input
                  value={editForm.nickname}
                  onChange={e => setEditForm(p => ({ ...p, nickname: e.target.value }))}
                  maxLength={50}
                  placeholder={`e.g. ${editTarget?.firstName ?? ""}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm(p => ({ ...p, isActive: e.target.checked }))} className="rounded" />
                Account is active
              </label>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setEditTarget(null)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
              <button
                disabled={editMutation.isPending}
                onClick={() => editMutation.mutate({ id: editTarget.id, ...editForm })}
                className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white rounded-lg text-sm font-medium transition"
              >
                {editMutation.isPending ? <><Loader2 size={14} className="inline animate-spin mr-1" />Saving…</> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-2">Remove Admin Account?</h2>
            <p className="text-sm text-gray-500 mb-6">
              <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong> ({deleteTarget.email}) will be deactivated and can no longer log in.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
              <button
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium transition"
              >
                {deleteMutation.isPending ? <><Loader2 size={14} className="inline animate-spin mr-1" />Removing…</> : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
