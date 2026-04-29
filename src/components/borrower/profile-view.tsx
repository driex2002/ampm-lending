"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, User, Lock, Palette, Sun, Moon, Monitor, Camera, Save } from "lucide-react";
import { formatDate, getFullName, getInitials } from "@/lib/utils";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { useTheme, type ThemeMode, type ThemeScheme } from "@/components/theme-provider";
import { toast } from "sonner";

const COLOR_SCHEMES: { id: ThemeScheme; label: string; color: string }[] = [
  { id: "blue",    label: "Ocean Blue", color: "#2563eb" },
  { id: "emerald", label: "Emerald",    color: "#059669" },
  { id: "violet",  label: "Violet",     color: "#7c3aed" },
  { id: "rose",    label: "Rose",       color: "#e11d48" },
  { id: "amber",   label: "Amber",      color: "#d97706" },
  { id: "slate",   label: "Slate",      color: "#475569" },
];

const COLOR_MODES: { id: ThemeMode; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "light",  label: "Light",  icon: Sun     },
  { id: "dark",   label: "Dark",   icon: Moon    },
  { id: "system", label: "System", icon: Monitor },
];

export function BorrowerProfileView() {
  const { data: session, update: updateSession } = useSession();
  const qc = useQueryClient();
  const { mode, scheme, setMode, setScheme } = useTheme();
  const user = session?.user;

  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["borrower-profile"],
    queryFn: () => fetch("/api/borrower/profile").then(r => r.json()),
  });

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
        await updateSession({ nickname: variables.nickname, avatarUrl: variables.avatarUrl });
        qc.invalidateQueries({ queryKey: ["borrower-profile"] });
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

  const profile = data?.data;

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-600" size={28} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your account information</p>
      </div>

      {/* Avatar + Nickname */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2"><User size={16} /> Photo &amp; Display Name</h3>

        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-brand-600 flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-white">
                  {getInitials(user?.firstName ?? "", user?.lastName ?? "")}
                </span>
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
          <div className="space-y-1">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <p className="text-sm text-gray-600">Upload a square image for best results.</p>
            <p className="text-xs text-gray-400">PNG, JPG, WEBP — max 1.5 MB</p>
            {avatarPreview && (
              <button onClick={() => { setAvatarPreview(null); setPendingAvatar(""); }} className="text-xs text-red-500 hover:underline">Remove photo</button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nickname <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={50}
            placeholder={`e.g. ${user?.firstName ?? "Nickname"}`}
            className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-gray-400 mt-1">Used in your "Welcome back" greeting.</p>
        </div>

        <button
          onClick={handleSave}
          disabled={profileMutation.isPending}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          {profileMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Changes</>}
        </button>
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
        <p className="text-xs text-gray-400 mt-4">To update your personal information, please contact your lending officer.</p>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><Lock size={16} /> Change Password</h3>
        <div className="max-w-md">
          <ChangePasswordForm mode="profile" />
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Palette size={16} /> Appearance</h3>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Color Mode</p>
          <div className="flex gap-3 flex-wrap">
            {COLOR_MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition ${
                  mode === id
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Color Scheme</p>
          <div className="flex gap-3 flex-wrap">
            {COLOR_SCHEMES.map((s) => (
              <button
                key={s.id}
                onClick={() => setScheme(s.id)}
                title={s.label}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition ${
                  scheme === s.id
                    ? "border-2 shadow-sm"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
                style={scheme === s.id ? { borderColor: s.color, color: s.color } : {}}
              >
                <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

