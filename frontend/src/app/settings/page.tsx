"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/AuthContext";
import LanguageSelector from "@/components/LanguageSelector";
import { Button, Card, SectionTitle } from "@/components/ui";
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
    return <main className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-sm text-secondary">{T("settings.loading")}</p></main>;
  }

  const isPro = planData?.plan === "pro";

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 md:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-secondary transition-colors hover:text-ink">{T("nav.backWorkspace")}</Link>
            <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">{T("settings.title")}</h1>
          </div>
          <div className="flex items-center gap-4">
            {user && <span className="hidden text-sm text-secondary sm:inline">{user.email}</span>}
            <LanguageSelector lang={uiLang} onChange={handleUiLangChange} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-6">
        {/* Subscription Card */}
        <Card>
          <SectionTitle title={T("settings.subscription")} description={T("settings.subscriptionDesc")} />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <span className={`inline-flex w-fit items-center rounded-control px-5 py-2 text-lg font-semibold ${
              isPro ? "bg-ink text-white" : "bg-warning/10 text-warning"
            }`}>
              {isPro ? T("home.planPro") : T("settings.freeTrial")}
            </span>
            {!isPro && planData && (
              <span className="text-sm text-secondary">
                {planData.remaining_days > 0
                  ? T("settings.daysRemaining", { n: planData.remaining_days })
                  : T("settings.trialExpired")}
              </span>
            )}
          </div>

          {/* Features */}
          <div className="mt-6 space-y-3">
            {planData?.features && Object.entries(planData.features).map(([key, enabled]) => (
              <div key={key} className="flex items-center gap-4 rounded-control border border-border bg-canvas px-4 py-4">
                <span className={`text-lg ${enabled ? "text-success" : "text-secondary/40"}`}>
                  {enabled ? "\u2713" : "\u2014"}
                </span>
                <p className="flex-1 text-h3 text-ink">
                  {FEATURE_KEYS[key] ? T(FEATURE_KEYS[key]) : key}
                </p>
                {!enabled && <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-secondary">{T("home.planPro")}</span>}
              </div>
            ))}
          </div>

          {/* Upgrade */}
          {!isPro && (
            <div className="mt-8 rounded-control border border-accent/20 bg-accent/5 p-6">
              <p className="text-[15px] font-semibold text-ink">{T("settings.upgradeTitle")}</p>
              <p className="mt-1 text-sm leading-relaxed text-secondary">{T("settings.upgradeDesc")}</p>
              <Button disabled className="mt-4">{T("settings.comingSoon")}</Button>
            </div>
          )}
        </Card>

        {/* Privacy */}
        <Card>
          <SectionTitle title={T("settings.privacy")} description={T("settings.privacyDesc")} />

          <div className="mt-6 space-y-3">
            {aiPolicy && Object.entries(aiPolicy).filter(([k]) => k !== "version").map(([key, value]) => (
              <div key={key} className="flex items-start gap-4 rounded-control border border-border bg-canvas px-4 py-4">
                <span className="mt-1 text-base text-success">&#x2713;</span>
                <div className="min-w-0">
                  <p className="text-h3 capitalize text-ink">{POLICY_KEYS[key] ? T(POLICY_KEYS[key]) : key.replace(/_/g, " ")}</p>
                  <p className="mt-1 max-w-[680px] text-body leading-relaxed text-secondary">{POLICY_VALUE_KEYS[key] ? T(POLICY_VALUE_KEYS[key]) : value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <p className="text-[15px] font-semibold text-danger">{T("settings.deleteTitle")}</p>
            <p className="mt-1 text-sm leading-relaxed text-secondary">{T("settings.deleteDesc")}</p>
            <Button variant="danger" disabled className="mt-4">{T("settings.comingSoon")}</Button>
          </div>
        </Card>
      </div>
    </main>
  );
}