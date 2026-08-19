"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/AuthContext";
import { localeForLang, t, UILanguage } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";
import { Card } from "@/components/ui";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface RunPayload {
  id: number;
  created_at: string | null;
  analysis_type: string;
  analysis_direction: string;
  parent_run_id: number | null;
  dataset_version: string | null;
  purpose: string | null;
  business_health_score: number | null;
  summary: string | null;
  result_json: string | null;
  comparison_result: string | null;
}

interface ComparisonPayload {
  run: RunPayload | null;
  parent: RunPayload | null;
}

interface MetricChange {
  metric_name: string;
  before: unknown;
  after: unknown;
  absolute_change: unknown;
  percentage_change: unknown;
  direction: string;
  status: string;
  interpretation: string;
}

interface RecommendationResult {
  recommendation: string;
  status: string;
  evidence: string;
  confidence: string;
  reason: string;
}

interface ExecutionGap {
  issue: string;
  reason: string;
}

interface ComparisonResult {
  comparison_summary: string;
  verdict: string;
  metric_changes: MetricChange[];
  recommendation_results: RecommendationResult[];
  execution_gap: ExecutionGap[];
  confidence: string;
  limitations: string[];
  next_actions: string[];
  reliability?: string;
  computed_metric_changes?: MetricChange[];
}

function parseComparison(payload: RunPayload | null): ComparisonResult | null {
  const raw = payload?.comparison_result || payload?.result_json;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ComparisonResult;
  } catch {
    return null;
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "\u2014";
  return String(value);
}

function metricLabel(uiLang: UILanguage, name: string): string {
  const key = `metric.name.${name}`;
  const label = t(uiLang, key);
  return label === key ? name : label;
}

export default function VerificationReportPage() {
  const { id, runId } = useParams<{ id: string; runId: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { uiLang } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);

  const [data, setData] = useState<ComparisonPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [authLoading, user, router]);

  useEffect(() => {
    if (!runId) return;
    apiFetch(`${API}/api/projects/${id}/comparison/${runId}`)
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id, runId]);

  if (authLoading || loading) {
    return <main className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-sm text-secondary">{T("home.loading")}</p></main>;
  }
  if (!data?.run) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas">
        <p className="text-sm text-secondary">{T("verifyReport.notFound")}</p>
        <Link href={`/project/${id}`} className="inline-flex h-9 items-center rounded-control border border-border bg-surface px-4 text-sm text-ink hover:bg-canvas">{T("nav.backDashboard")}</Link>
      </main>
    );
  }

  const comparison = parseComparison(data.run);
  const runDate = data.run.created_at
    ? new Date(data.run.created_at).toLocaleDateString(localeForLang(uiLang), { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

  const recCounts = (comparison?.recommendation_results || []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur print:static print:border-none">
        <div className="mx-auto max-w-4xl px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link href={`/project/${id}`} className="inline-flex items-center gap-2 text-sm font-medium text-secondary transition-colors hover:text-ink">
              <span aria-hidden>{"\u2190"}</span>{T("nav.backDashboard")}
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Lytio Verification Report</p>
          </div>
          <div className="mt-3">
            <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">{T("verifyReport.title")}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-secondary">
              {runDate && <span>{runDate}</span>}
              {data.run.dataset_version && (
                <>
                  <span className="text-border">&middot;</span>
                  <span>{T("verifyReport.datasetVersion")}: {data.run.dataset_version}</span>
                </>
              )}
              {data.run.purpose && (
                <>
                  <span className="text-border">&middot;</span>
                  <span>{T(`verify.purpose.${data.run.purpose}`)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        {!comparison ? (
          <Card>
            <p className="text-sm text-secondary">{T("verifyReport.noComparison")}</p>
          </Card>
        ) : (
          <div className="space-y-10">
            <section>
              <ScreenHeading index="1" title={T("verifyReport.screen1")} />
              <div className="mt-6 space-y-6">
                <Card variant="highlighted">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-caption font-medium text-secondary">{T("verifyReport.verdict")}</p>
                      <p className="mt-1 text-xl font-semibold text-ink">{T(`verifyReport.verdict.${comparison.verdict}`)}</p>
                    </div>
                    {comparison.confidence && (
                      <div className="shrink-0">
                        <p className="text-caption text-secondary">{T("verifyReport.confidence")}</p>
                        <p className="mt-1 text-sm font-medium text-ink">{T(`verifyReport.confidence.${comparison.confidence}`)}</p>
                      </div>
                    )}
                  </div>
                  {comparison.comparison_summary && (
                    <p className="mt-4 text-sm leading-relaxed text-ink">{comparison.comparison_summary}</p>
                  )}
                  {comparison.reliability && comparison.reliability !== "ai" && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                      {T(`verifyReport.reliability.${comparison.reliability}`)}
                    </p>
                  )}
                </Card>

                <div className="grid gap-4 sm:grid-cols-4">
                  <SummaryTile label={T("verifyReport.status.achieved")} value={recCounts.achieved ?? 0} />
                  <SummaryTile label={T("verifyReport.status.partially_achieved")} value={recCounts.partially_achieved ?? 0} />
                  <SummaryTile label={T("verifyReport.status.not_achieved")} value={recCounts.not_achieved ?? 0} />
                  <SummaryTile label={T("verifyReport.status.unable_to_verify")} value={recCounts.unable_to_verify ?? 0} />
                </div>
              </div>
            </section>

            <section>
              <ScreenHeading index="2" title={T("verifyReport.screen2")} />
              <div className="mt-6 space-y-6">
                <Card>
                  <h3 className="text-h4 text-ink">{T("verifyReport.metrics")}</h3>
                  {comparison.metric_changes.length === 0 ? (
                    <p className="mt-4 text-sm text-secondary">{T("verifyReport.noMetrics")}</p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[560px] border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-caption text-secondary">
                            <th className="py-2 pr-4 font-medium">{T("verifyReport.metric")}</th>
                            <th className="py-2 pr-4 font-medium">{T("verifyReport.before")}</th>
                            <th className="py-2 pr-4 font-medium">{T("verifyReport.after")}</th>
                            <th className="py-2 pr-4 font-medium">{T("verifyReport.change")}</th>
                            <th className="py-2 font-medium">{T("verifyReport.judgement")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparison.metric_changes.map((m, i) => (
                            <tr key={i} className="border-b border-border align-top last:border-b-0">
                              <td className="py-3 pr-4 text-ink">{m.metric_name || "\u2014"}</td>
                              <td className="py-3 pr-4 tabular-nums text-ink">{m.status === "unavailable" ? T("verifyReport.unavailable") : formatValue(m.before)}</td>
                              <td className="py-3 pr-4 tabular-nums text-ink">{m.status === "unavailable" ? T("verifyReport.unavailable") : formatValue(m.after)}</td>
                              <td className="py-3 pr-4 tabular-nums text-ink">
                                {m.status === "unavailable" ? "\u2014" : (m.percentage_change !== null && m.percentage_change !== undefined ? `${m.percentage_change}%` : formatValue(m.absolute_change))}
                              </td>
                              <td className="py-3 text-ink">{m.status === "unavailable" ? T("verifyReport.unavailable") : T(`verifyReport.direction.${m.direction}`)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="mt-4 text-caption text-secondary">{T("verifyReport.computedNote")}</p>
                </Card>

                {comparison.limitations?.length > 0 && (
                  <Card>
                    <h3 className="text-h4 text-ink">{T("verifyReport.limitations")}</h3>
                    <ul className="mt-3 space-y-2">
                      {comparison.limitations.map((lim, i) => <li key={i} className="text-sm text-secondary">{lim}</li>)}
                    </ul>
                  </Card>
                )}
              </div>
            </section>

            <section>
              <ScreenHeading index="3" title={T("verifyReport.screen3")} />
              <div className="mt-6 space-y-6">
                <Card>
                  <h3 className="text-h4 text-ink">{T("verifyReport.recommendationResults")}</h3>
                  <div className="mt-4 space-y-4">
                    {(comparison.recommendation_results || []).map((r, i) => (
                      <div key={i} className="rounded-card border border-border bg-canvas p-4">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-[15px] font-medium text-ink">{i + 1}. {r.recommendation}</p>
                          <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">{T(`verifyReport.status.${r.status}`)}</span>
                        </div>
                        {r.evidence && <p className="mt-2 text-sm text-secondary">{T("verifyReport.evidence")}: {r.evidence}</p>}
                        {r.reason && <p className="mt-1 text-sm text-secondary">{r.reason}</p>}
                        {r.confidence && <p className="mt-1 text-caption text-secondary">{T("verifyReport.confidence")}: {T(`verifyReport.confidence.${r.confidence}`)}</p>}
                      </div>
                    ))}
                    {comparison.recommendation_results?.length === 0 && (
                      <p className="text-sm text-secondary">{T("verifyReport.noRecommendationResults")}</p>
                    )}
                  </div>
                </Card>

                {comparison.execution_gap?.length > 0 && (
                  <Card>
                    <h3 className="text-h4 text-ink">{T("verifyReport.executionGap")}</h3>
                    <div className="mt-4 space-y-3">
                      {comparison.execution_gap.map((gap, i) => (
                        <div key={i} className="rounded-card border border-warning/20 bg-warning/5 p-4">
                          <p className="text-sm font-medium text-ink">{gap.issue}</p>
                          {gap.reason && <p className="mt-1 text-sm text-secondary">{gap.reason}</p>}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {comparison.next_actions?.length > 0 && (
                  <Card variant="highlighted">
                    <h3 className="text-h4 text-ink">{T("verifyReport.nextActions")}</h3>
                    <ol className="mt-4 space-y-3">
                      {comparison.next_actions.map((action, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-xs font-semibold text-success">{i + 1}</span>
                          <span className="text-sm text-ink">{action}</span>
                        </li>
                      ))}
                    </ol>
                  </Card>
                )}
              </div>
            </section>
          </div>
        )}
      </article>
    </main>
  );
}

function ScreenHeading({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{index}</span>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <Card variant="subtle" className="p-4 text-center">
      <p className="text-2xl font-semibold text-ink tabular-nums">{value}</p>
      <p className="mt-1 text-caption text-secondary">{label}</p>
    </Card>
  );
}
