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
import Card from "@/components/ui/Card";
import FocusedInsightCard from "@/components/business/FocusedInsightCard";
import { localeForLang, t } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";

interface TimelineItem {
  id: number; created_at: string | null;
  business_health_score: number | null; summary: string | null;
}

interface RunData {
  id: number; project_id: number; created_at: string | null;
  business_health_score: number | null; summary: string | null;
  result_json: string | null; is_legacy: boolean; analysis_type: string | null;
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

  if (authLoading || loading) return <main className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-sm text-secondary">{T("home.loading")}</p></main>;
  if (!run) return <main className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-sm text-secondary">{T("exec.notFound")}</p></main>;

  // Parse result_json if available
  let resultData = null;
  if (run.result_json) {
    try { resultData = JSON.parse(run.result_json); } catch {}
  }

  const dateStr = run.created_at ? new Date(run.created_at).toLocaleDateString(localeForLang(uiLang), { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div>
            <Link href={`/project/${id}`} className="text-sm text-secondary transition-colors hover:text-ink">{T("nav.backDashboard")}</Link>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink md:text-2xl">{T("reportPage.historical")}</h1>
            <p className="mt-0.5 text-sm text-secondary">{dateStr}</p>
          </div>
          {run.business_health_score != null && (
            <div className="shrink-0">
              <p className="text-caption text-secondary">{T("landing.diff.businessHealth")}</p>
              <p className="text-3xl font-semibold text-ink tabular-nums">{run.business_health_score}</p>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 md:px-6">
        {run.is_legacy && (
          <div className="rounded-control border border-warning/20 bg-warning/5 px-5 py-3"><p className="text-sm text-warning">{T("reportPage.legacy")}</p></div>
        )}

        {run.analysis_type === "focused_insight" && resultData?.focused_insight ? (
          <>
            <FocusedInsightCard data={resultData.focused_insight} lang={uiLang} />
            {resultData.focused_topic && (
              <p className="text-sm text-secondary">{T("focus.card.topic")}: {resultData.focused_topic}</p>
            )}
            {run.summary && (
              <Card>
                <p className="mb-3 text-h3 text-ink">{T("report.execSummary")}</p>
                <p className="max-w-[680px] whitespace-pre-line text-body leading-relaxed text-secondary">{run.summary}</p>
              </Card>
            )}
          </>
        ) : resultData ? (
          <>
            {resultData.business_health && <BusinessHealthCard data={resultData.business_health} lang={uiLang} />}
            {resultData.metrics?.length > 0 && <MetricGrid metrics={resultData.metrics} lang={uiLang} />}
            <InsightList insights={resultData.insights || []} lang={uiLang} />
            <RiskList risks={resultData.risks || []} lang={uiLang} />
            {resultData.executive_summary && <ExecutiveSummaryCard content={resultData.executive_summary.content} lang={uiLang} />}
            <RecommendationList recs={resultData.recommendations || []} lang={uiLang} />
          </>
        ) : (
          <div className="rounded-card border border-border bg-surface p-8 text-center">
            <p className="text-sm leading-relaxed text-secondary">{run.summary || T("reportPage.noContent")}</p>
          </div>
        )}
      </div>
    </main>
  );
}