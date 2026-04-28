"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, User, Lock } from "lucide-react";
import { formatDate, getFullName } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

export function BorrowerProfileView() {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["borrower-profile"],
    queryFn: () => fetch("/api/borrower/profile").then(r => r.json()),
  });

  const profile = data?.data;

  const handlePasswordChange = () => {
    if (newPwd !== confirmPwd) { toast.error("Passwords do not match"); return; }
    if (newPwd.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    startTransition(async () => {
      const res = await fetch("/api/borrower/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Password changed successfully!");
        setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      } else {
        toast.error(json.error ?? "Failed to change password");
      }
    });
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-600" size={28} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your account information</p>
      </div>

      {/* Profile Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><User size={16} /> Personal Information</h3>
        {profile ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Full Name</dt>
              <dd className="font-medium text-gray-800 mt-0.5">{getFullName(profile.firstName, profile.middleName, profile.lastName)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Email</dt>
              <dd className="font-medium text-gray-800 mt-0.5">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Phone</dt>
              <dd className="font-medium text-gray-800 mt-0.5">{profile.cellphone}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Birthdate</dt>
              <dd className="font-medium text-gray-800 mt-0.5">{formatDate(profile.birthDate)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Address</dt>
              <dd className="font-medium text-gray-800 mt-0.5">
                {[profile.purok, profile.street, profile.barangay, profile.townCity, profile.province].filter(Boolean).join(", ")}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-gray-400 text-sm">Profile not available</p>
        )}
        <p className="text-xs text-gray-400 mt-4">To update your profile information, please contact your lending officer.</p>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><Lock size={16} /> Change Password</h3>
        <div className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
            <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
            <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
            <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <button onClick={handlePasswordChange} disabled={isPending || !currentPwd || !newPwd || !confirmPwd} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
            {isPending ? <><Loader2 size={14} className="animate-spin" /> Changing...</> : "Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
