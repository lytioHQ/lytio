"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

interface PlanData {
  plan: string;
  remaining_days: number;
  is_trial_expired: boolean;
  features: Record<string, boolean>;
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const FEATURE_LABELS: Record<string, string> = {
  can_export_report: "Executive Report Export",
  can_keep_unlimited_history: "Unlimited History",
  can_use_future_plugins: "Future Plugins (Finance, HR, etc.)",
  can_remove_branding: "Remove ExcelPilot Branding",
  unlimited_projects: "Unlimited Projects",
};

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiPolicy, setAiPolicy] = useState<Record<string, string> | null>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("excelpilot_token") : null;

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [authLoading, user, router]);

  useEffect(() => {
    if (!token) return;
    fetch(API + "/api/auth/me/plan", { headers: { Authorization: "Bearer " + token } })
      .then((r) => r.json())
      .then((data) => setPlanData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch(API + "/api/config/ai-policy")
      .then((r) => r.json())
      .then((data) => setAiPolicy(data))
      .catch(() => {});
  }, [token]);

  if (authLoading || loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50"><p className="text-sm text-slate-400">Loading&hellip;</p></main>;
  }

  const isPro = planData?.plan === "pro";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">&larr; Workspace</Link>
            <h1 className="text-lg font-bold text-slate-900">Settings</h1>
          </div>
          {user && <span className="text-xs text-slate-400">{user.email}</span>}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">

        {/* Subscription Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Subscription</h2>
          <p className="mt-1 text-xs text-slate-400">Your current plan and available features.</p>

          <div className="mt-6 flex items-center gap-4">
            <span className={`rounded-xl px-4 py-2 text-sm font-bold ${
              isPro ? "bg-slate-900 text-white" : "bg-amber-100 text-amber-700"
            }`}>
              {isPro ? "Pro" : "Free Trial"}
            </span>
            {!isPro && planData && (
              <span className="text-sm text-slate-500">
                {planData.remaining_days > 0
                  ? `${planData.remaining_days} day${planData.remaining_days !== 1 ? "s" : ""} remaining`
                  : "Trial expired"}
              </span>
            )}
          </div>

          {/* Features */}
          <div className="mt-6 space-y-3">
            {planData && Object.entries(planData.features).map(([key, enabled]) => (
              <div key={key} className="flex items-center gap-3 rounded-lg border border-slate-100 px-4 py-3">
                <span className={`text-sm ${enabled ? "text-emerald-600" : "text-slate-300"}`}>
                  {enabled ? "\u2713" : "\u2014"}
                </span>
                <span className={`text-xs ${enabled ? "text-slate-700" : "text-slate-400"}`}>
                  {FEATURE_LABELS[key] || key}
                </span>
                {!enabled && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400">Pro</span>}
              </div>
            ))}
          </div>

          {/* Upgrade */}
          {!isPro && (
            <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-sm font-semibold text-blue-800">Upgrade to Pro</p>
              <p className="mt-1 text-xs text-blue-600">Unlock executive reports, unlimited history, and all future plugins.</p>
              <button
                disabled
                className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white opacity-50 cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          )}
        </div>

        {/* Privacy */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Privacy</h2>
          <p className="mt-1 text-xs text-slate-400">How your data is handled.</p>

          <div className="mt-6 space-y-3">
            {aiPolicy && Object.entries(aiPolicy).filter(([k]) => k !== "version").map(([key, value]) => (
              <div key={key} className="flex items-start gap-3 rounded-lg border border-slate-100 px-4 py-3">
                <span className="mt-0.5 text-emerald-500 text-sm">&#x2713;</span>
                <div>
                  <p className="text-xs font-medium text-slate-700 capitalize">{key.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-500">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-red-100 pt-6">
            <p className="text-sm font-semibold text-red-700">Delete Account</p>
            <p className="mt-1 text-xs text-red-500">Permanently delete your account and all associated data. This action cannot be undone.</p>
            <button
              disabled
              className="mt-4 rounded-lg border border-red-200 px-4 py-2 text-xs font-medium text-red-400 cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}