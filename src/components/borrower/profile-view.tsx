"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, User, Lock } from "lucide-react";
import { formatDate, getFullName } from "@/lib/utils";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export function BorrowerProfileView() {
  const { data: session } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["borrower-profile"],
    queryFn: () => fetch("/api/borrower/profile").then(r => r.json()),
  });

  const profile = data?.data;

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
        <div className="max-w-md">
          <ChangePasswordForm mode="profile" />
        </div>
      </div>
    </div>
  );
}
