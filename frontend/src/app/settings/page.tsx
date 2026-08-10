"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/AuthContext";
import LanguageSelector from "@/components/LanguageSelector";
import { t, UILanguage } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";

interface PlanData {
  plan: string;
  remaining_days: number;
  is_trial_expired: boolean;
  features: Record<string, boolean>;
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const FEATURE_KEYS: Record<string, string> = {
  can_export_report: "settings.feature.exportReport",
  can_keep_unlimited_history: "settings.feature.unlimitedHistory",
  can_use_future_plugins: "settings.feature.futurePlugins",
  can_remove_branding: "settings.feature.removeBranding",
  unlimited_projects: "settings.feature.unlimitedProjects",
};

const POLICY_KEYS: Record<string, string> = {
  data_usage: "settings.policy.dataUsage",
  retention: "settings.policy.retention",
  deletion: "settings.policy.deletion",
  privacy: "settings.privacy",
  encryption: "settings.policy.encryption",
};
const POLICY_VALUE_KEYS: Record<string, string> = {
  data_usage: "security.policy.dataUsage",
  retention: "security.policy.retention",
  deletion: "security.policy.deletion",
  privacy: "security.policy.privacy",
  encryption: "security.policy.encryption",
};

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { uiLang, handleUiLangChange } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiPolicy, setAiPolicy] = useState<Record<string, string> | null>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [authLoading, user, router]);

  useEffect(() => {
    if (!token) return;
    apiFetch(API + "/api/auth/me/plan", { headers: { Authorization: "Bearer " + token } })
      .then(async (r) => {
        if (!r.ok) return; // 401 / error: keep logged-out state, do not crash
        const data = await r.json();
        setPlanData(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    apiFetch(API + "/api/config/ai-policy")
      .then((r) => r.json())
      .then((data) => setAiPolicy(data))
      .catch(() => {});
  }, [token]);

  if (authLoading || loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50"><p className="text-sm text-slate-400">{T("settings.loading")}</p></main>;
  }

  const isPro = planData?.plan === "pro";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">{T("nav.backWorkspace")}</Link>
            <h1 className="text-lg font-bold text-slate-900">{T("settings.title")}</h1>
          </div>
          <div className="flex items-center gap-4">
            {user && <span className="text-xs text-slate-400">{user.email}</span>}
            <LanguageSelector lang={uiLang} onChange={handleUiLangChange} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">

        {/* Subscription Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">{T("settings.subscription")}</h2>
          <p className="mt-1 text-xs text-slate-400">{T("settings.subscriptionDesc")}</p>

          <div className="mt-6 flex items-center gap-4">
            <span className={`rounded-xl px-4 py-2 text-sm font-bold ${
              isPro ? "bg-slate-900 text-white" : "bg-amber-100 text-amber-700"
            }`}>
              {isPro ? T("home.planPro") : T("settings.freeTrial")}
            </span>
            {!isPro && planData && (
              <span className="text-sm text-slate-500">
                {planData.remaining_days > 0
                  ? T("settings.daysRemaining", { n: planData.remaining_days })
                  : T("settings.trialExpired")}
              </span>
            )}
          </div>

          {/* Features */}
          <div className="mt-6 space-y-3">
            {planData?.features && Object.entries(planData.features).map(([key, enabled]) => (
              <div key={key} className="flex items-center gap-3 rounded-lg border border-slate-100 px-4 py-3">
                <span className={`text-sm ${enabled ? "text-emerald-600" : "text-slate-300"}`}>
                  {enabled ? "\u2713" : "\u2014"}
                </span>
                <span className={`text-xs ${enabled ? "text-slate-700" : "text-slate-400"}`}>
                  {FEATURE_KEYS[key] ? T(FEATURE_KEYS[key]) : key}
                </span>
                {!enabled && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400">{T("home.planPro")}</span>}
              </div>
            ))}
          </div>

          {/* Upgrade */}
          {!isPro && (
            <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-sm font-semibold text-blue-800">{T("settings.upgradeTitle")}</p>
              <p className="mt-1 text-xs text-blue-600">{T("settings.upgradeDesc")}</p>
              <button
                disabled
                className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white opacity-50 cursor-not-allowed"
              >
                {T("settings.comingSoon")}
              </button>
            </div>
          )}
        </div>

        {/* Privacy */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">{T("settings.privacy")}</h2>
          <p className="mt-1 text-xs text-slate-400">{T("settings.privacyDesc")}</p>

          <div className="mt-6 space-y-3">
            {aiPolicy && Object.entries(aiPolicy).filter(([k]) => k !== "version").map(([key, value]) => (
              <div key={key} className="flex items-start gap-3 rounded-lg border border-slate-100 px-4 py-3">
                <span className="mt-0.5 text-emerald-500 text-sm">&#x2713;</span>
                <div>
                  <p className="text-xs font-medium text-slate-700 capitalize">{POLICY_KEYS[key] ? T(POLICY_KEYS[key]) : key.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-500">{POLICY_VALUE_KEYS[key] ? T(POLICY_VALUE_KEYS[key]) : value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-red-100 pt-6">
            <p className="text-sm font-semibold text-red-700">{T("settings.deleteTitle")}</p>
            <p className="mt-1 text-xs text-red-500">{T("settings.deleteDesc")}</p>
            <button
              disabled
              className="mt-4 rounded-lg border border-red-200 px-4 py-2 text-xs font-medium text-red-400 cursor-not-allowed"
            >
              {T("settings.comingSoon")}
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}