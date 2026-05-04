"use client";

import { useState, useTransition, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Loader2, Save, Palette, Sun, Moon, Monitor, Image, Upload, X } from "lucide-react";
import {
  SquaresFour,
  type IconWeight,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useTheme, type ThemeMode, type ThemeScheme } from "@/components/theme-provider";

interface Setting {
  id: string; key: string; value: string; description: string | null;
}

const SETTING_LABELS: Record<string, string> = {
  business_name:         "Business Name",
  business_address:      "Business Address",
  business_contact:      "Business Contact",
  currency_symbol:       "Currency Symbol",
  currency_code:         "Currency Code",
  loan_number_prefix:    "Loan Number Prefix",
  payment_ref_prefix:    "Payment Ref Prefix",
  overdue_check_enabled: "Auto-mark Overdue",
  reminder_days_before:  "Reminder Days Before Due",
  max_login_attempts:    "Max Login Attempts",
};

const CURRENCY_OPTIONS = [
  { code: "PHP", label: "PHP — Philippine Peso (₱)" },
  { code: "USD", label: "USD — US Dollar ($)" },
  { code: "EUR", label: "EUR — Euro (€)" },
  { code: "GBP", label: "GBP — British Pound (£)" },
  { code: "JPY", label: "JPY — Japanese Yen (¥)" },
  { code: "AUD", label: "AUD — Australian Dollar (A$)" },
  { code: "CAD", label: "CAD — Canadian Dollar (CA$)" },
  { code: "SGD", label: "SGD — Singapore Dollar (S$)" },
  { code: "HKD", label: "HKD — Hong Kong Dollar (HK$)" },
  { code: "MYR", label: "MYR — Malaysian Ringgit (RM)" },
];

const NUMBER_FIELDS = new Set(["reminder_days_before", "max_login_attempts"]);
const TOGGLE_FIELDS = new Set(["overdue_check_enabled"]);
const DROPDOWN_FIELDS: Record<string, { code: string; label: string }[]> = {
  currency_code: CURRENCY_OPTIONS,
};

const COLOR_SCHEMES: { id: ThemeScheme; label: string; color: string }[] = [
  { id: "blue",    label: "Ocean Blue", color: "#2563eb" },
  { id: "emerald", label: "Emerald",    color: "#059669" },
  { id: "violet",  label: "Violet",     color: "#7c3aed" },
  { id: "rose",    label: "Rose",       color: "#e11d48" },
  { id: "amber",   label: "Amber",      color: "#d97706" },
  { id: "slate",   label: "Slate",      color: "#475569" },
];

const ICON_WEIGHTS: { id: IconWeight; label: string; description: string }[] = [
  { id: "thin",    label: "Thin",    description: "Ultra-light hairline strokes" },
  { id: "light",   label: "Light",   description: "Light, airy look" },
  { id: "regular", label: "Regular", description: "Balanced default" },
  { id: "bold",    label: "Bold",    description: "Strong, thick strokes" },
  { id: "fill",    label: "Fill",    description: "Fully solid icons" },
  { id: "duotone", label: "Duotone", description: "Two-tone with depth (default)" },
];

const COLOR_MODES: { id: ThemeMode; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "light",  label: "Light",  icon: Sun     },
  { id: "dark",   label: "Dark",   icon: Moon    },
  { id: "system", label: "System", icon: Monitor },
];

// Default login background — free to use under the Unsplash License
// Photo: Modern glass office / financial district by Pedro Lastra
const DEFAULT_LOGIN_BG =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2560&auto=format&fit=crop";

// Default dashboard background — professional business desk (Unsplash License, free to use)
const DEFAULT_DASHBOARD_BG =
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2560&auto=format&fit=crop";

export function SettingsView() {
  const qc = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [iconUploading, setIconUploading] = useState<Record<string, boolean>>({});
  const iconRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);
  const loginBgRef = useRef<HTMLInputElement>(null);
  const dashboardBgRef = useRef<HTMLInputElement>(null);
  const { mode, scheme, iconWeight, setMode, setScheme, setIconWeight } = useTheme();

  const { data, isLoading } = useQuery<{ data: Setting[] }>({
    queryKey: ["admin-settings"],
    queryFn: () => fetch("/api/admin/settings").then(r => r.json()),
  });

  const settings: Setting[] = data?.data ?? [];

  // Exclude branding keys from the general settings form (handled separately)
  const BRANDING_KEYS = ["app_name", "app_icon", "app_favicon", "login_bg", "login_bg_opacity", "dashboard_bg", "dashboard_bg_opacity"];
  const generalSettings = settings.filter(s => !BRANDING_KEYS.includes(s.key));
  const getSetting = (key: string) => settings.find(s => s.key === key);

  // Initialize from query data
  if (!initialized && settings.length > 0) {
    const map: Record<string, string> = {};
    settings.forEach((s) => { map[s.key] = s.value; });
    setValues(map);
    setInitialized(true);
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        // Save all settings except pure image assets (they're handled by the upload API)
        const toSave = Object.entries(values)
          .filter(([key]) => !["app_icon", "app_favicon", "login_bg", "dashboard_bg"].includes(key))
          .map(([key, value]) => ({ key, value }));

        const res = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: toSave }),
        });
        if (res.ok) {
          toast.success("Settings saved!");
          // Update the app-config cache immediately so the sidebar reflects the new name
          const newAppName = values["app_name"];
          if (newAppName !== undefined) {
            qc.setQueryData(["app-config"], (old: { data: { appName: string; appIcon: string; appFavicon: string } } | undefined) => ({
              ...old,
              data: { ...(old?.data ?? { appIcon: "", appFavicon: "" }), appName: newAppName || "AMPM Lending" },
            }));
          }
          qc.invalidateQueries({ queryKey: ["admin-settings"] });
          qc.invalidateQueries({ queryKey: ["app-config"] });
        } else {
          const json = await res.json();
          toast.error(json.error ?? "Failed to save settings");
        }
      } catch { toast.error("An error occurred"); }
    });
  };

  const handleImageUpload = async (key: "app_icon" | "app_favicon" | "login_bg" | "dashboard_bg", file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 1_500_000) {
      toast.error("Image too large (max 1.5 MB)");
      return;
    }

    setIconUploading(p => ({ ...p, [key]: true }));
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/admin/settings/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, dataUrl }),
      });
      const json = await res.json();
      if (json.success) {
        setValues(p => ({ ...p, [key]: dataUrl }));
        toast.success(key === "app_icon" ? "App icon updated" : "Favicon updated");
        qc.invalidateQueries({ queryKey: ["admin-settings"] });
        qc.invalidateQueries({ queryKey: ["app-config"] });
      } else {
        toast.error(json.error ?? "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setIconUploading(p => ({ ...p, [key]: false }));
    }
  };

  const handleClearImage = async (key: "app_icon" | "app_favicon" | "login_bg" | "dashboard_bg") => {
    setIconUploading(p => ({ ...p, [key]: true }));
    try {
      const res = await fetch("/api/admin/settings/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const json = await res.json();
      if (json.success) {
        setValues(p => ({ ...p, [key]: "" }));
        toast.success("Asset removed");
        qc.invalidateQueries({ queryKey: ["admin-settings"] });
        qc.invalidateQueries({ queryKey: ["app-config"] });
      } else {
        toast.error(json.error ?? "Failed to remove");
      }
    } catch {
      toast.error("Failed to remove");
    } finally {
      setIconUploading(p => ({ ...p, [key]: false }));
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-600" size={28} /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Settings size={22} /> Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">System configuration</p>
        </div>
        <button onClick={handleSave} disabled={isPending} className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
          {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Changes</>}
        </button>
      </div>

      {/* Appearance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Palette size={16} /> Appearance
        </h2>

        {/* Color mode */}
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

        {/* Color scheme */}
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

        {/* Icon Style */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Icon Style</p>
          <p className="text-xs text-gray-400 mb-3">Controls the icon weight used throughout the admin sidebar.</p>
          <div className="flex gap-2 flex-wrap">
            {ICON_WEIGHTS.map(({ id, label, description }) => (
              <button
                key={id}
                onClick={() => setIconWeight(id)}
                title={description}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition ${
                  iconWeight === id
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <SquaresFour size={16} weight={id} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {generalSettings.map((setting) => {
          const val = values[setting.key] ?? setting.value;
          const label = SETTING_LABELS[setting.key] ?? setting.key;

          return (
            <div key={setting.key} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center py-4 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                {setting.description && <p className="text-xs text-gray-400 mt-0.5">{setting.description}</p>}
              </div>
              <div className="sm:col-span-2">
                {TOGGLE_FIELDS.has(setting.key) ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={val === "true"}
                    onClick={() => setValues(prev => ({ ...prev, [setting.key]: val === "true" ? "false" : "true" }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                      val === "true" ? "bg-brand-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                        val === "true" ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                ) : DROPDOWN_FIELDS[setting.key] ? (
                  <select
                    value={val}
                    onChange={e => setValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    {DROPDOWN_FIELDS[setting.key].map(opt => (
                      <option key={opt.code} value={opt.code}>{opt.label}</option>
                    ))}
                  </select>
                ) : NUMBER_FIELDS.has(setting.key) ? (
                  <input
                    type="number"
                    min="1"
                    value={val}
                    onChange={e => setValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={val}
                    onChange={e => setValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Image size={16} /> Branding
        </h2>

        {/* App Name */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <div>
            <p className="text-sm font-medium text-gray-700">App Name</p>
            <p className="text-xs text-gray-400 mt-0.5">Displayed in sidebar and browser tab</p>
          </div>
          <div className="sm:col-span-2">
            <input
              type="text"
              value={values["app_name"] ?? getSetting("app_name")?.value ?? "AMPM Lending"}
              onChange={e => setValues(p => ({ ...p, app_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="AMPM Lending"
            />
          </div>
        </div>

        {/* App Icon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <div>
            <p className="text-sm font-medium text-gray-700">App Icon</p>
            <p className="text-xs text-gray-400 mt-0.5">Shown in the sidebar (square, auto-cropped)</p>
          </div>
          <div className="sm:col-span-2 flex items-center gap-4">
            {/* Preview */}
            <div className="w-14 h-14 rounded-xl bg-brand-600 flex-shrink-0 overflow-hidden flex items-center justify-center">
              {values["app_icon"] ? (
                <img src={values["app_icon"]} alt="App icon" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">💳</span>
              )}
            </div>
            <div className="flex gap-2">
              <input ref={iconRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload("app_icon", f); e.target.value = ""; }} />
              <button
                onClick={() => iconRef.current?.click()}
                disabled={iconUploading["app_icon"]}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
              >
                {iconUploading["app_icon"] ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {iconUploading["app_icon"] ? "Uploading…" : "Upload"}
              </button>
              {values["app_icon"] && (
                <button onClick={() => handleClearImage("app_icon")} disabled={iconUploading["app_icon"]} className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 transition disabled:opacity-60">
                  <X size={13} /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Favicon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <div>
            <p className="text-sm font-medium text-gray-700">Tab Icon (Favicon)</p>
            <p className="text-xs text-gray-400 mt-0.5">Displayed in the browser tab (square recommended)</p>
          </div>
          <div className="sm:col-span-2 flex items-center gap-4">
            {/* Preview */}
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center border border-gray-200">
              {values["app_favicon"] ? (
                <img src={values["app_favicon"]} alt="Favicon" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">💳</span>
              )}
            </div>
            <div className="flex gap-2">
              <input ref={faviconRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload("app_favicon", f); e.target.value = ""; }} />
              <button
                onClick={() => faviconRef.current?.click()}
                disabled={iconUploading["app_favicon"]}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
              >
                {iconUploading["app_favicon"] ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {iconUploading["app_favicon"] ? "Uploading…" : "Upload"}
              </button>
              {values["app_favicon"] && (
                <button onClick={() => handleClearImage("app_favicon")} disabled={iconUploading["app_favicon"]} className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 transition disabled:opacity-60">
                  <X size={13} /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Login Background */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <div>
            <p className="text-sm font-medium text-gray-700">Login Background</p>
            <p className="text-xs text-gray-400 mt-0.5">Full-screen background image on the sign-in page. Remove to restore the default photo.</p>
          </div>
          <div className="sm:col-span-2 space-y-3">
            {/* Mini preview */}
            <div className="relative w-36 h-20 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950" />
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url('${values["login_bg"] || DEFAULT_LOGIN_BG}')`,
                  opacity: parseFloat(values["login_bg_opacity"] ?? "0.25"),
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xs font-medium drop-shadow">Preview</span>
              </div>
            </div>
            {/* Upload / Remove buttons */}
            <div className="flex gap-2 flex-wrap">
              <input ref={loginBgRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload("login_bg", f); e.target.value = ""; }} />
              <button
                onClick={() => loginBgRef.current?.click()}
                disabled={iconUploading["login_bg"]}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
              >
                {iconUploading["login_bg"] ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {iconUploading["login_bg"] ? "Uploading…" : "Upload Custom Image"}
              </button>
              {values["login_bg"] && (
                <button onClick={() => handleClearImage("login_bg")} disabled={iconUploading["login_bg"]} className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 transition disabled:opacity-60">
                  <X size={13} /> Remove (restore default)
                </button>
              )}
            </div>
            {/* Opacity slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-600">Image Opacity</label>
                <span className="text-xs font-semibold text-brand-600">{Math.round(parseFloat(values["login_bg_opacity"] ?? "0.25") * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.05"
                value={values["login_bg_opacity"] ?? "0.25"}
                onChange={e => setValues(p => ({ ...p, login_bg_opacity: e.target.value }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5% (very subtle)</span>
                <span>95% (strong)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Background */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <div>
            <p className="text-sm font-medium text-gray-700">Dashboard Background</p>
            <p className="text-xs text-gray-400 mt-0.5">Subtle background image shown behind all admin &amp; borrower pages. Remove to restore the default.</p>
          </div>
          <div className="sm:col-span-2 space-y-3">
            {/* Mini preview */}
            <div className="relative w-36 h-20 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
              <div className="absolute inset-0 bg-gray-100" />
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url('${values["dashboard_bg"] || DEFAULT_DASHBOARD_BG}')`,
                  opacity: parseFloat(values["dashboard_bg_opacity"] ?? "0.08"),
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-gray-700 text-xs font-medium">Preview</span>
              </div>
            </div>
            {/* Upload / Remove buttons */}
            <div className="flex gap-2 flex-wrap">
              <input ref={dashboardBgRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload("dashboard_bg", f); e.target.value = ""; }} />
              <button
                onClick={() => dashboardBgRef.current?.click()}
                disabled={iconUploading["dashboard_bg"]}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
              >
                {iconUploading["dashboard_bg"] ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {iconUploading["dashboard_bg"] ? "Uploading…" : "Upload Custom Image"}
              </button>
              {values["dashboard_bg"] && (
                <button onClick={() => handleClearImage("dashboard_bg")} disabled={iconUploading["dashboard_bg"]} className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 transition disabled:opacity-60">
                  <X size={13} /> Remove (restore default)
                </button>
              )}
            </div>
            {/* Opacity slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-600">Image Opacity</label>
                <span className="text-xs font-semibold text-brand-600">{Math.round(parseFloat(values["dashboard_bg_opacity"] ?? "0.08") * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.50"
                step="0.02"
                value={values["dashboard_bg_opacity"] ?? "0.08"}
                onChange={e => setValues(p => ({ ...p, dashboard_bg_opacity: e.target.value }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>2% (barely visible)</span>
                <span>50% (visible)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
