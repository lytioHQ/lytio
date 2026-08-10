"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/AuthContext";
import BusinessHealthCard from "@/components/business/BusinessHealthCard";
import MetricGrid from "@/components/business/MetricGrid";
import InsightList from "@/components/business/InsightList";
import RiskList from "@/components/business/RiskList";
import RecommendationList from "@/components/business/RecommendationList";
import ExecutiveSummaryCard from "@/components/business/ExecutiveSummaryCard";
import { localeForLang, t } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";

interface TimelineItem {
  id: number; created_at: string | null;
  business_health_score: number | null; summary: string | null;
}

interface RunData {
  id: number; project_id: number; created_at: string | null;
  business_health_score: number | null; summary: string | null;
  result_json: string | null; is_legacy: boolean;
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function ReportPage() {
  const { id, runId } = useParams<{ id: string; runId: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { uiLang } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);
  const [run, setRun] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [authLoading, user, router]);

  useEffect(() => {
    if (!token || !runId) return;
    // GET /api/analysis-runs/{id} - but we don't have that endpoint yet.
    // Use the result_json stored in the run. Let me fetch from a simple endpoint.
    // For now, we parse the summary.
    apiFetch(API + "/api/analysis-runs/" + runId, { headers: { Authorization: "Bearer " + token } })
      .then(r => r.json())
      .then((data: RunData) => setRun(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, runId, id, router]);

  if (authLoading || loading) return <main className="flex min-h-screen items-center justify-center bg-slate-50"><p className="text-sm text-slate-400">{T("home.loading")}</p></main>;
  if (!run) return <main className="flex min-h-screen items-center justify-center bg-slate-50"><p className="text-sm text-slate-400">{T("exec.notFound")}</p></main>;

  // Parse result_json if available
  let resultData = null;
  if (run.result_json) {
    try { resultData = JSON.parse(run.result_json); } catch {}
  }

  const dateStr = run.created_at ? new Date(run.created_at).toLocaleDateString(localeForLang(uiLang), { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <Link href={`/project/${id}`} className="text-xs text-slate-400 hover:text-slate-600">{T("nav.backDashboard")}</Link>
            <h1 className="mt-1 text-sm font-semibold text-slate-900">{T("reportPage.historical")}</h1>
            <p className="text-xs text-slate-400">{dateStr}</p>
          </div>
          {run.business_health_score != null && (
            <div className="text-right">
              <p className="text-xs text-slate-400">{T("landing.diff.businessHealth")}</p>
              <p className="text-2xl font-bold text-slate-900">{run.business_health_score}</p>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-6 py-10">
        {run.is_legacy && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3"><p className="text-xs text-amber-700">{T("reportPage.legacy")}</p></div>
        )}

        {resultData ? (
          <>
            {resultData.business_health && <BusinessHealthCard data={resultData.business_health} lang={uiLang} />}
            {resultData.metrics?.length > 0 && <MetricGrid metrics={resultData.metrics} lang={uiLang} />}
            <InsightList insights={resultData.insights || []} lang={uiLang} />
            <RiskList risks={resultData.risks || []} lang={uiLang} />
            {resultData.executive_summary && <ExecutiveSummaryCard content={resultData.executive_summary.content} lang={uiLang} />}
            <RecommendationList recs={resultData.recommendations || []} lang={uiLang} />
          </>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">{run.summary || T("reportPage.noContent")}</p>
          </div>
        )}
      </div>
    </main>
  );
}