"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/AuthContext";
import BusinessValue from "@/components/business/BusinessValue";
import BusinessHealthCard from "@/components/business/BusinessHealthCard";
import ExecutiveSummaryCard from "@/components/business/ExecutiveSummaryCard";
import MetricGrid from "@/components/business/MetricGrid";
import InsightList from "@/components/business/InsightList";
import RiskList from "@/components/business/RiskList";
import RecommendationList from "@/components/business/RecommendationList";
import { localeForLang, t } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";

interface ExecutiveReportData {
  title: string;
  generated_at: string | null;
  project_name: string;
  business_health: { score: number; level: string; summary: string } | null;
  executive_summary: { content: string } | null;
  key_metrics: { name: string; value: string; trend: string }[];
  top_insights: { title: string; description: string; confidence: string }[];
  top_risks: { title: string; description: string; severity: string }[];
  top_recommendations: { title: string; description: string; priority: string; expected_impact?: { business_health_change: string; risk_change: string; expected_result: string; confidence: string } | null }[];
  is_legacy: boolean;
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function ExecutiveReportPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { uiLang } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);
  const [report, setReport] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [authLoading, user, router]);

  useEffect(() => {
    if (!token || !id) return;
    apiFetch(API + "/api/projects/" + id + "/executive", { headers: { Authorization: "Bearer " + token } })
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((data) => setReport(data))
      .catch(() => setError(T("exec.loadError")))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-sm text-secondary">{T("exec.loading")}</p>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas">
        <p className="text-sm text-secondary">{error || T("exec.notFound")}</p>
        <Link href={`/project/${id}`} className="inline-flex h-9 items-center rounded-control border border-border bg-surface px-4 text-sm text-ink transition-colors hover:bg-canvas">
          {T("nav.backDashboard")}
        </Link>
      </main>
    );
  }

  const generatedDate = report.generated_at
    ? new Date(report.generated_at).toLocaleDateString(localeForLang(uiLang), { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <main className="min-h-screen bg-canvas print:bg-white">
      {/* Header */}
      <header className="border-b border-border bg-surface print:border-none">
        <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
          <Link href={`/project/${id}`} className="text-sm text-secondary transition-colors hover:text-ink">{T("nav.dashboard")}</Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent">ExcelPilot</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink md:text-3xl">{report.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-sm text-secondary">{report.project_name}</span>
            {generatedDate && (
              <>
                <span className="text-border">&middot;</span>
                <span className="text-sm text-secondary">{T("exec.generated", { date: generatedDate })}</span>
              </>
            )}
            {report.is_legacy && (
              <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">{T("exec.legacy")}</span>
            )}
          </div>
        </div>
      </header>

      {/* Report Body */}
      <article className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <div className="space-y-8">
          {/* Business Health */}
          {report.business_health && <BusinessHealthCard data={report.business_health} lang={uiLang} />}

          {/* Business Value */}
          {report.business_health && (
            <BusinessValue
              currentHealth={report.business_health.score}
              currentHealthLevel={report.business_health.level}
              recommendations={report.top_recommendations}
              risks={report.top_risks}
              hasImpact={report.top_recommendations.some((r) => r.expected_impact)}
              lang={uiLang}
            />
          )}

          {/* Executive Summary */}
          {report.executive_summary && <ExecutiveSummaryCard content={report.executive_summary.content} lang={uiLang} />}

          {/* Key Metrics */}
          <MetricGrid metrics={report.key_metrics} lang={uiLang} />

          {/* Key Insights */}
          <InsightList insights={report.top_insights} lang={uiLang} />

          {/* Risks */}
          <RiskList risks={report.top_risks} lang={uiLang} />

          {/* Recommendations */}
          <RecommendationList recs={report.top_recommendations} lang={uiLang} />
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-border pt-6">
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm text-secondary/70">{T("exec.brand")}</p>
            <p className="text-caption text-secondary/60">{T("exec.footer", { n: report.key_metrics.length, date: generatedDate })}</p>
          </div>
        </footer>
      </article>
    </main>
  );
}