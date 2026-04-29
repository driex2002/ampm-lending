"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Camera, Loader2, Save, Lock } from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export function AdminProfileView() {
  const { data: session, update: updateSession } = useSession();
  const qc = useQueryClient();
  const user = session?.user;

  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const profileMutation = useMutation({
    mutationFn: (body: { nickname?: string | null; avatarUrl?: string | null }) =>
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: async (res, variables) => {
      if (res.success) {
        toast.success("Profile updated");
        await updateSession({
          nickname: variables.nickname,
          avatarUrl: variables.avatarUrl,
        });
        qc.invalidateQueries({ queryKey: ["admin-profile"] });
        setPendingAvatar(null);
      } else {
        toast.error(res.error ?? "Failed to update profile");
      }
    },
    onError: () => toast.error("Network error"),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 1_500_000) { toast.error("Image too large (max 1.5 MB)"); return; }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);
      setPendingAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = () => {
    profileMutation.mutate({
      nickname: nickname.trim() || null,
      ...(pendingAvatar !== null && { avatarUrl: pendingAvatar }),
    });
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setPendingAvatar("");
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><User size={22} /> My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your admin account</p>
      </div>

      {/* Avatar + Nickname */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h3 className="font-semibold text-gray-700">Profile Photo &amp; Display</h3>

        {/* Avatar picker */}
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-brand-600 flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-white">{getInitials(user.firstName, user.lastName)}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-600 hover:bg-brand-700 rounded-full flex items-center justify-center shadow-md transition"
              title="Change photo"
            >
              <Camera size={13} className="text-white" />
            </button>
          </div>
          <div className="space-y-1.5">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <p className="text-sm text-gray-600">Upload a square image for best results.</p>
            <p className="text-xs text-gray-400">PNG, JPG, WEBP — max 1.5 MB</p>
            {avatarPreview && (
              <button onClick={handleRemoveAvatar} className="text-xs text-red-500 hover:underline">Remove photo</button>
            )}
          </div>
        </div>

        {/* Nickname */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nickname <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={50}
            placeholder={`e.g. ${user.firstName}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-gray-400 mt-1">Used in the "Welcome back" greeting in the sidebar.</p>
        </div>

        {/* Read-only info */}
        <dl className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-gray-50">
          <div>
            <dt className="text-xs text-gray-400 uppercase tracking-wide">Full Name</dt>
            <dd className="font-medium text-gray-800 mt-0.5">{user.firstName} {user.lastName}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 uppercase tracking-wide">Email</dt>
            <dd className="font-medium text-gray-800 mt-0.5">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 uppercase tracking-wide">Role</dt>
            <dd className="font-medium text-gray-800 mt-0.5">
              {user.isSuperAdmin ? "Super Administrator" : "Administrator"}
            </dd>
          </div>
        </dl>

        <button
          onClick={handleSave}
          disabled={profileMutation.isPending}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition"
        >
          {profileMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Changes</>}
        </button>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><Lock size={16} /> Change Password</h3>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
