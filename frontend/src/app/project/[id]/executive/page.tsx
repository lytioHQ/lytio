"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/AuthContext";
import BusinessValue from "@/components/business/BusinessValue";
import BusinessHealthCard from "@/components/business/BusinessHealthCard";
import HealthScoreBreakdown, { HealthScoreData } from "@/components/business/HealthScoreBreakdown";
import ExecutiveSummaryCard from "@/components/business/ExecutiveSummaryCard";
import MetricGrid from "@/components/business/MetricGrid";
import { MetricCard } from "@/components/ui";
import InsightList from "@/components/business/InsightList";
import RiskList from "@/components/business/RiskList";
import RecommendationList from "@/components/business/RecommendationList";
import BusinessActions from "@/components/business/BusinessActions";
import BusinessMemoryCard from "@/components/business/BusinessMemoryCard";
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

interface ComputedMetricData {
  metric_name: string;
  value: number | string | { min: string; max: string } | null;
  formula: string;
  source_columns: string[];
  availability: string;
  confidence: string;
  assumptions: string[];
  note: string;
}

const DISPLAY_METRICS = ["total_sales", "order_count", "average_order_value", "customer_count", "customer_concentration"] as const;

function formatMetricValue(
  m: ComputedMetricData,
  T: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (m.availability !== "available" || m.value == null) return "—";
  if (m.metric_name === "customer_concentration") {
    return `${T("metric.top1")} ${(Number(m.value) * 100).toFixed(1)}%`;
  }
  if (m.metric_name === "total_sales" || m.metric_name === "average_order_value") {
    return Number(m.value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(m.value);
}

function ScreenHeading({ index, title }: { index: string; title: string }) {

  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{index}</span>
      <h2 className="text-h3 text-ink">{title}</h2>
    </div>
  );
}

export default function ExecutiveReportPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { uiLang } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);
  const [report, setReport] = useState<ExecutiveReportData | null>(null);
  const [metrics, setMetrics] = useState<ComputedMetricData[] | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScoreData | null>(null);
  const [dataVersion, setDataVersion] = useState<string | null>(null);
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

    // Fetch the project so the report header can show the data version (file name).
    apiFetch(API + "/api/projects/" + id, { headers: { Authorization: "Bearer " + token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => setDataVersion(p?.original_filename || null))
      .catch(() => setDataVersion(null));

    // M2.12.1: system-computed metrics (code, not AI). Read-only display.
    apiFetch(API + "/api/projects/" + id + "/metrics", { headers: { Authorization: "Bearer " + token } })
      .then(async (r) => { if (!r.ok) return null; const d = await r.json(); return d.computed_metrics ?? null; })
      .then((m: ComputedMetricData[] | null) => setMetrics(m))
      .catch(() => setMetrics(null));

    // M2.12.2: system-computed health score (code, not AI). Read-only display.
    apiFetch(API + "/api/projects/" + id + "/metrics", { headers: { Authorization: "Bearer " + token } })
      .then(async (r) => { if (!r.ok) return null; const d = await r.json(); return d.health_score ?? null; })
      .then((hs: HealthScoreData | null) => setHealthScore(hs))
      .catch(() => setHealthScore(null));
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
      {/* Sticky report navigation */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur print:static print:border-none">
        <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link href={`/project/${id}`} className="inline-flex items-center gap-2 text-sm font-medium text-secondary transition-colors hover:text-ink">
              <span aria-hidden>{"\u2190"}</span>{T("nav.backDashboard")}
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Lytio Business Report</p>
          </div>
          <div className="mt-3">
            <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">{report.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-secondary">
              <span>{report.project_name}</span>
              {generatedDate && (
                <>
                  <span className="text-border">&middot;</span>
                  <span>{T("exec.generated", { date: generatedDate })}</span>
                </>
              )}
              {dataVersion && (
                <>
                  <span className="text-border">&middot;</span>
                  <span>{T("exec.dataVersion")}: {dataVersion}</span>
                </>
              )}
              {report.is_legacy && (
                <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">{T("exec.legacy")}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Report body organized by the Three Screen Rule */}
      <article className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <div className="space-y-12">
          <section aria-label={T("exec.screen1")}>
            <ScreenHeading index="1" title={T("exec.screen1")} />
            <div className="mt-6 space-y-8">
              {report.business_health && <BusinessHealthCard data={report.business_health} lang={uiLang} />}
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
              {report.executive_summary && <ExecutiveSummaryCard content={report.executive_summary.content} lang={uiLang} />}
            </div>
          </section>

          <section aria-label={T("exec.screen2")}>
            <ScreenHeading index="2" title={T("exec.screen2")} />
            <div className="mt-6 space-y-8">
              {metrics && metrics.length > 0 && (
                <div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-base font-semibold text-ink">{T("metric.title")}</h3>
                    <p className="text-caption text-secondary">{T("metric.subtitle")}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-5">
                    {DISPLAY_METRICS.map((name) => {
                      const m = metrics.find((item) => item.metric_name === name);
                      if (!m) return null;
                      const available = m.availability === "available" && m.value != null;
                      const estimated = name === "order_count" && (m.assumptions ?? []).length > 0;
                      const value = available ? formatMetricValue(m, T) : "—";
                      const description = available
                        ? (estimated ? T("metric.estimated") : T("metric.subtitle"))
                        : T("metric.unavailable");
                      return (
                        <MetricCard
                          key={name}
                          label={T(`metric.name.${name}`)}
                          value={value}
                          description={description}
                        />
                      );
                    })}
                </div>
              </div>
              )}
              <HealthScoreBreakdown data={healthScore} lang={uiLang} />
              <MetricGrid metrics={report.key_metrics} lang={uiLang} />
              <InsightList insights={report.top_insights} lang={uiLang} />
              <RiskList risks={report.top_risks} lang={uiLang} />
            </div>
          </section>

          <section aria-label={T("exec.screen3")}>
            <ScreenHeading index="3" title={T("exec.screen3")} />
            <div className="mt-6 space-y-8">
              <RecommendationList recs={report.top_recommendations} lang={uiLang} />
              <BusinessActions projectId={id} lang={uiLang} />
              <BusinessMemoryCard projectId={id} lang={uiLang} />
            </div>
          </section>
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
