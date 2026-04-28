"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface Setting {
  id: string; key: string; value: string; description: string | null;
}

const SETTING_LABELS: Record<string, string> = {
  company_name: "Company Name",
  company_address: "Company Address",
  company_phone: "Company Phone",
  company_email: "Company Email",
  max_login_attempts: "Max Login Attempts",
  login_lockout_minutes: "Login Lockout Duration (minutes)",
  default_penalty_rate: "Default Penalty Rate (%)",
  default_grace_period_days: "Default Grace Period (days)",
  currency_symbol: "Currency Symbol",
  timezone: "Timezone",
};

export function SettingsView() {
  const qc = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  const { data, isLoading } = useQuery<{ data: Setting[] }>({
    queryKey: ["admin-settings"],
    queryFn: () => fetch("/api/admin/settings").then(r => r.json()),
  });

  const settings: Setting[] = data?.data ?? [];

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
        const res = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: Object.entries(values).map(([key, value]) => ({ key, value })) }),
        });
        if (res.ok) {
          toast.success("Settings saved!");
          qc.invalidateQueries({ queryKey: ["admin-settings"] });
        } else {
          const json = await res.json();
          toast.error(json.error ?? "Failed to save settings");
        }
      } catch { toast.error("An error occurred"); }
    });
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {settings.map((setting) => (
          <div key={setting.key} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start py-4 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-700">{SETTING_LABELS[setting.key] ?? setting.key}</p>
              {setting.description && <p className="text-xs text-gray-400 mt-0.5">{setting.description}</p>}
            </div>
            <div className="sm:col-span-2">
              <input
                type="text"
                value={values[setting.key] ?? setting.value}
                onChange={(e) => setValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
