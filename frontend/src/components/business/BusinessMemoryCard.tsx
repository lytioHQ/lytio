"use client";

import { useEffect, useState } from "react";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { localeForLang, t, UILanguage } from "@/lib/i18n";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface MemoryPoint {
  run_id: number;
  dataset_version: string | null;
  period?: { min?: string; max?: string } | null;
  score?: number | null;
  level?: string | null;
  value?: unknown;
}

export interface OpenLoop {
  type: "pending_action" | "unavailable_metric" | "not_executed_action" | "long_open_issue" | string;
  action_id?: number | null;
  description?: string | null;
  description_key?: string | null;
  priority?: string | null;
  metric?: string | null;
  note?: string | null;
  title?: string | null;
  first_seen_run_id?: number | null;
}

export interface IntelObservation {
  action_id: number;
  description?: string | null;
  description_key?: string | null;
  reason_key?: string | null;
  metric_name: string;
  before_value?: number | null;
  after_value?: number | null;
  absolute_delta?: number | null;
  percent_delta?: number | null;
  direction?: string | null;
  alignment: string;
  executed: boolean;
  reason?: string | null;
}

export interface AlignmentTrendPoint {
  period?: string | null;
  verification_run_id?: number | null;
  aligned_count: number;
  not_aligned_count: number;
  unable_count: number;
  source_run_ids: number[];
}

export interface ImprovementTimelinePoint {
  period?: string | null;
  verification_run_id?: number | null;
  parent_run_id?: number | null;
  observation_count: number;
  observations: IntelObservation[];
}

export interface MemoryIntelligence {
  engine_version: string;
  rates: {
    execution: { action_total: number; executed_count: number; execution_rate: number | null };
    verification: {
      total_verified_actions: number;
      verified_count: number;
      verification_rate: number | null;
      unable_to_verify_count: number;
      unable_rate: number | null;
      unable_reasons: { not_executed: number; metric_unavailable: number; insufficient_data: number };
    };
  };
  alignment_trend: AlignmentTrendPoint[];
  improvement_timeline: ImprovementTimelinePoint[];
  open_loops: OpenLoop[];
}

export interface VerificationPoint {
  run_id: number;
  parent_run_id: number | null;
  verdict: string | null;
  confidence: string | null;
  metric_changes: Array<Record<string, unknown>>;
  next_actions: Array<Record<string, unknown>>;
}

export interface MetricTrend {
  metric_name: string;
  latest: number | null;
  previous: number | null;
  absolute_delta: number | null;
  percent_delta: number | null;
  direction: string;
  period_count: number;
  latest_period?: { min?: string; max?: string } | null;
  availability: string;
  confidence: string | null;
  source_run_ids: number[];
}

export interface TrendDeltas {
  metric_trends: MetricTrend[];
  health_trend: {
    latest_score: number | null;
    previous_score: number | null;
    delta: number | null;
    direction: string;
    latest_level: string | null;
    score_confidence: string | null;
    period_count: number;
    source_run_ids: number[];
  } | null;
  action_trend: {
    total_actions: number;
    pending: number;
    completed: number;
    cancelled: number;
    verified: number;
    verification_rate: number;
    open_loops: number;
    source: string;
  };
  verification_trend: {
    latest_verdict: string | null;
    previous_verdict: string | null;
    latest_reliability: string | null;
    latest_confidence: string | null;
    verified_recommendations: number;
    metric_changes_summary: Array<{ metric_name?: string; direction?: string }>;
    source_run_ids: number[];
  } | null;
  periods_used: number;
  latest_run_id: number | null;
}

export interface BusinessMemoryData {
  project_id: number;
  engine_version: string;
  profile: Record<string, unknown>;
  latest_metrics: Record<string, { value: unknown; availability: string; confidence: string | null }>;
  metric_history: Record<string, MemoryPoint[]>;
  health_history: MemoryPoint[];
  action_summary: { total: number; pending: number; completed: number; cancelled: number; verified: number };
  action_recent: Array<Record<string, unknown>>;
  issue_tracker: Array<Record<string, unknown>>;
  verification_history: VerificationPoint[];
  open_loops: OpenLoop[];
  intelligence: MemoryIntelligence | null;
  trend_deltas: TrendDeltas | null;
  context_meta: {
    version: string;
    periods_used: number;
    latest_run_id: number | null;
    generated_at: string;
    length_chars: number;
    injected: boolean;
  } | null;
  updated_at: string | null;
  ready: boolean;
}

const LOOP_ACCENT: Record<string, string> = {
  pending_action: "border-l-warning",
  unavailable_metric: "border-l-muted",
  not_executed_action: "border-l-warning",
  long_open_issue: "border-l-danger",
};

function formatValue(value: unknown, lang: UILanguage): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat(localeForLang(lang), { maximumFractionDigits: 2 }).format(value);
  }
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "–";
  return JSON.stringify(value);
}

/**
 * M2.12.4: read-only Business Memory block.
 * Shows the project's accumulated operating knowledge: current health & sales
 * status, action closed-loop rate, open loops and the latest verification
 * result. Everything shown is a derived cache from analysis_runs +
 * action_items; nothing here is AI output.
 */
export default function BusinessMemoryCard({
  projectId,
  lang,
  demoData,
}: {
  projectId: string;
  lang: UILanguage;
  demoData?: { data: BusinessMemoryData };
}) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const isDemo = demoData != null;
  const [memory, setMemory] = useState<BusinessMemoryData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (isDemo) {
      setMemory(demoData?.data ?? null);
      return;
    }
    if (!token) return;
    apiFetch(`${API}/api/projects/${projectId}/memory`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BusinessMemoryData | null) => setMemory(data))
      .catch(() => setFailed(true));
  }, [isDemo, demoData, token, projectId]);

  if (failed) return null;

  const healthPoints = memory?.health_history ?? [];
  const lastHealth = healthPoints.length > 0 ? healthPoints[healthPoints.length - 1] : null;
  const salesPoints = memory?.metric_history?.["total_sales"] ?? [];
  const lastSales = salesPoints.length > 0 ? salesPoints[salesPoints.length - 1] : null;
  const summary = memory?.action_summary ?? { total: 0, pending: 0, completed: 0, cancelled: 0, verified: 0 };
  const loops = memory?.open_loops ?? [];
  // M2.14.3 Phase 1 (P5): split open loops into business actions vs. data
  // enhancement suggestions so customers do not feel their data is "broken".
  const actionLoops = loops.filter(
    (l) => l.type === "pending_action" || l.type === "not_executed_action" || l.type === "long_open_issue"
  );
  const dataLoops = loops.filter((l) => l.type === "unavailable_metric");
  const verificationPoints = memory?.verification_history ?? [];
  const lastVerification =
    verificationPoints.length > 0 ? verificationPoints[verificationPoints.length - 1] : null;
  const trends = memory?.trend_deltas ?? null;
  const salesTrend = trends?.metric_trends?.find((m) => m.metric_name === "total_sales") ?? null;
  const healthTrend = trends?.health_trend ?? null;
  const actionTrend = trends?.action_trend ?? null;
  const verificationTrend = trends?.verification_trend ?? null;
  const intelligence = memory?.intelligence ?? null;
  const intelRates = intelligence?.rates;
  const alignmentTrend = intelligence?.alignment_trend ?? [];
  const improvementTimeline = intelligence?.improvement_timeline ?? [];
  const intelOpenLoops = intelligence?.open_loops ?? [];

  function trendIcon(direction: string | undefined): string {
    if (direction === "up") return "\u2191";
    if (direction === "down") return "\u2193";
    if (direction === "flat") return "\u2192";
    return "\u2013";
  }

  return (
    <div className="rounded-card border border-border bg-surface p-6">
      <div>
        <h3 className="text-base font-semibold text-ink">{T("memory.title")}</h3>
        <p className="text-caption text-secondary">{T("memory.desc")}</p>
      </div>

      {memory === null ? (
        <p className="mt-4 text-sm text-secondary">{T("memory.loading")}</p>
      ) : !memory.ready ? (
        <p className="mt-4 text-sm text-secondary">{T("memory.noMemory")}</p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-control border border-border bg-canvas p-4">
              <p className="text-caption text-secondary">{T("memory.healthTrend")}</p>
              <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">
                {lastHealth?.score != null ? String(lastHealth.score) : "–"}
              </p>
              {lastHealth?.level && <p className="mt-0.5 text-xs text-secondary">{T(`health.level.${lastHealth.level}`) ?? lastHealth.level}</p>}
            </div>
            <div className="rounded-control border border-border bg-canvas p-4">
              <p className="text-caption text-secondary">{T("memory.salesTrend")}</p>
              <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">
                {lastSales ? formatValue(lastSales.value, lang) : "–"}
              </p>
              {lastSales?.period?.max && (
                <p className="mt-0.5 text-xs text-secondary">≤ {lastSales.period.max}</p>
              )}
            </div>
            <div className="rounded-control border border-border bg-canvas p-4">
              <p className="text-caption text-secondary">{T("memory.actionClosedLoop")}</p>
              <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">
                {T("memory.verifiedOf", { n: summary.verified, total: summary.total })}
              </p>
              <p className="mt-0.5 text-xs text-secondary">
                {T("memory.pendingCount", { n: summary.pending })}
              </p>
            </div>
            <div className="rounded-control border border-border bg-canvas p-4">
              <p className="text-caption text-secondary">{T("memory.openLoops")}</p>
              <p className="mt-1 text-2xl font-semibold text-ink tabular-nums">{loops.length}</p>
              <p className="mt-0.5 text-xs text-secondary">{(trends?.periods_used ?? 0) > 0 ? T("memory.periodsReferenced", { n: trends?.periods_used ?? 0 }) : "–"}</p>
            </div>
          </div>

          {trends && trends.periods_used > 0 && (
            <div className="mt-5">
              <div className="flex items-baseline justify-between">
                <p className="text-caption font-medium text-secondary">{T("memory.businessChange")}</p>
                <p className="text-xs text-secondary">{T("memory.periodsReferenced", { n: trends.periods_used })}</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-control border border-border bg-canvas p-3">
                  <p className="text-caption text-secondary">{T("memory.salesTrend")}</p>
                  <p className="mt-1 text-lg font-semibold text-ink tabular-nums">
                    {salesTrend ? formatValue(salesTrend.latest, lang) : "–"}
                    <span className="ml-1">{salesTrend ? trendIcon(salesTrend.direction) : ""}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {salesTrend?.percent_delta != null
                      ? `${salesTrend.percent_delta > 0 ? "+" : ""}${salesTrend.percent_delta}%`
                      : "–"}
                    {salesTrend?.previous != null ? ` · ${T("memory.prevValue")} ${formatValue(salesTrend.previous, lang)}` : ""}
                  </p>
                </div>
                <div className="rounded-control border border-border bg-canvas p-3">
                  <p className="text-caption text-secondary">{T("memory.healthTrend")}</p>
                  <p className="mt-1 text-lg font-semibold text-ink tabular-nums">
                    {healthTrend?.latest_score != null ? String(healthTrend.latest_score) : "–"}
                    <span className="ml-1">{healthTrend ? trendIcon(healthTrend.direction) : ""}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {healthTrend?.delta != null ? `${healthTrend.delta > 0 ? "+" : ""}${healthTrend.delta}` : "–"}
                    {healthTrend?.latest_level ? ` · ${T(`health.level.${healthTrend.latest_level}`) ?? healthTrend.latest_level}` : ""}
                  </p>
                </div>
                <div className="rounded-control border border-border bg-canvas p-3">
                  <p className="text-caption text-secondary">{T("memory.actionClosedLoop")}</p>
                  <p className="mt-1 text-lg font-semibold text-ink tabular-nums">
                    {actionTrend ? T("memory.verifiedOf", { n: actionTrend.verified, total: actionTrend.total_actions }) : "–"}
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {actionTrend ? T("memory.verifiedRate", { pct: Math.round(actionTrend.verification_rate * 100) }) : ""}
                    {actionTrend && actionTrend.open_loops > 0 ? ` · ${T("memory.openLoops")} ${actionTrend.open_loops}` : ""}
                  </p>
                </div>
                <div className="rounded-control border border-border bg-canvas p-3">
                  <p className="text-caption text-secondary">{T("memory.lastVerification")}</p>
                  <p className="mt-1 text-lg font-semibold text-ink">
                    {verificationTrend?.latest_verdict
                      ? T(`verifyReport.verdict.${verificationTrend.latest_verdict}`)
                      : "–"}
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {verificationTrend?.latest_reliability ? T(`verifyReport.reliability.${verificationTrend.latest_reliability}`) ?? verificationTrend.latest_reliability : ""}
                    {verificationTrend?.latest_confidence
                      ? ` · ${T(`verifyReport.confidence.${verificationTrend.latest_confidence}`)}`
                      : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          {loops.length > 0 && (
            <div className="mt-5">
              <p className="text-caption font-medium text-secondary">{T("memory.openLoops")}</p>
              {actionLoops.length > 0 && (
                <div className="mt-2">
                  <p className="text-caption font-medium text-secondary">{T("memory.loopActions")}</p>
                  <ul className="mt-2 space-y-2">
                    {actionLoops.slice(0, 3).map((loop, i) => (
                      <li
                        key={i}
                        className={`rounded-control border border-border border-l-4 bg-canvas px-3 py-2 text-sm text-ink ${LOOP_ACCENT[loop.type] || "border-l-muted"}`}
                      >
                        {loop.type === "pending_action" ? (
                          <span>
                            {T("memory.pendingAction")} · {loop.description_key ? T(loop.description_key) : (loop.description ?? "–")}
                            {loop.priority ? ` (${T(`action.priority.${loop.priority}`)})` : ""}
                          </span>
                        ) : loop.type === "not_executed_action" ? (
                          <span>
                            {T("memory.loop.notExecuted")} · {loop.description_key ? T(loop.description_key) : (loop.description ?? "–")}
                            {loop.priority ? ` (${T(`action.priority.${loop.priority}`)})` : ""}
                          </span>
                        ) : (
                          <span>
                            {T("memory.loop.longOpen")} · {loop.description_key ? T(loop.description_key) : (loop.title ?? "–")}
                            {loop.priority ? ` (${T(`action.priority.${loop.priority}`)})` : ""}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {dataLoops.length > 0 && (
                <div className="mt-2">
                  <p className="text-caption font-medium text-secondary">{T("memory.loopData")}</p>
                  <p className="mt-0.5 text-caption text-secondary">{T("memory.loopDataIntro")}</p>
                  <ul className="mt-2 space-y-2">
                    {dataLoops.slice(0, 3).map((loop, i) => (
                      <li
                        key={i}
                        className="rounded-control border border-border border-l-4 border-l-muted bg-canvas px-3 py-2 text-sm text-ink"
                      >
                        <span>
                          {T("memory.unavailableMetric")} · {loop.metric ?? "–"}
                          {loop.note ? ` · ${loop.note}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {intelligence && intelRates && (
            <div className="mt-5">
              <div className="flex items-baseline justify-between">
                <p className="text-caption font-medium text-secondary">{T("memory.intel.title")}</p>
                <p className="text-xs text-secondary">{T("memory.intel.desc")}</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-control border border-border bg-canvas p-3">
                  <p className="text-caption text-secondary">{T("memory.intel.executionRate")}</p>
                  <p className="mt-1 text-lg font-semibold text-ink tabular-nums">
                    {intelRates.execution.execution_rate != null
                      ? `${Math.round(intelRates.execution.execution_rate * 100)}%`
                      : "–"}
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {intelRates.execution.action_total > 0
                      ? T("memory.intel.executedOf", {
                          n: intelRates.execution.executed_count,
                          total: intelRates.execution.action_total,
                        })
                      : "–"}
                  </p>
                </div>
                <div className="rounded-control border border-border bg-canvas p-3">
                  <p className="text-caption text-secondary">{T("memory.intel.verificationRate")}</p>
                  <p className="mt-1 text-lg font-semibold text-ink tabular-nums">
                    {intelRates.verification.verification_rate != null
                      ? `${Math.round(intelRates.verification.verification_rate * 100)}%`
                      : "–"}
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {intelRates.verification.total_verified_actions > 0
                      ? T("memory.intel.verifiedOf", {
                          n: intelRates.verification.verified_count,
                          total: intelRates.verification.total_verified_actions,
                        })
                      : "–"}
                  </p>
                </div>
                <div className="rounded-control border border-border bg-canvas p-3">
                  <p className="text-caption text-secondary">{T("memory.intel.unable_to_verify")}</p>
                  <p className="mt-1 text-lg font-semibold text-ink tabular-nums">
                    {intelRates.verification.unable_to_verify_count > 0
                      ? String(intelRates.verification.unable_to_verify_count)
                      : "–"}
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {Object.entries(intelRates.verification.unable_reasons)
                      .filter(([, v]) => (v as number) > 0)
                      .map(([k, v]) => `${T(`memory.intel.unable_reason.${k}`) ?? k}: ${String(v)}`)
                      .join(" · ") || "–"}
                  </p>
                </div>
                <div className="rounded-control border border-border bg-canvas p-3">
                  <p className="text-caption text-secondary">{T("memory.openLoops")}</p>
                  <p className="mt-1 text-lg font-semibold text-ink tabular-nums">
                    {intelOpenLoops.length > 0 ? String(intelOpenLoops.length) : "–"}
                  </p>
                </div>
              </div>

              {alignmentTrend.length > 0 && (
                <div className="mt-3">
                  <p className="text-caption font-medium text-secondary">{T("memory.intel.alignmentTrend")}</p>
                  <ul className="mt-1 space-y-1">
                    {alignmentTrend.slice(0, 4).map((pt, i) => (
                      <li key={i} className="flex items-center justify-between text-sm text-ink">
                        <span className="text-secondary">{pt.period ?? `#${String(pt.verification_run_id ?? "")}`}</span>
                        <span className="tabular-nums">
                          <span>{T("memory.intel.aligned")} {pt.aligned_count}</span>
                          <span className="mx-2 text-secondary">·</span>
                          <span>{T("memory.intel.not_aligned")} {pt.not_aligned_count}</span>
                          <span className="mx-2 text-secondary">·</span>
                          <span className="text-secondary">{T("memory.intel.unable_to_verify")} {pt.unable_count}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {improvementTimeline.length > 0 && (
                <div className="mt-3">
                  <p className="text-caption font-medium text-secondary">{T("memory.intel.improvementTimeline")}</p>
                  <ul className="mt-1 space-y-1">
                    {improvementTimeline.slice(0, 3).map((pt, i) => (
                      <li key={i} className="text-sm text-secondary">
                        {pt.period ?? `#${String(pt.verification_run_id ?? "")}`} ·{" "}
                        {pt.observations
                          .slice(0, 3)
                          .map((o) => `${o.description_key ? T(o.description_key) : (o.description ?? o.metric_name)} · ${T(`action.alignment.${o.alignment}`)}`)
                          .join(" · ") || T("memory.intel.none")}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs text-secondary">{T("memory.intel.evidenceNote")}</p>
                </div>
              )}
            </div>
          )}

          {lastVerification && (
            <div className="mt-5 rounded-control border border-border bg-canvas p-4">
              <p className="text-caption font-medium text-secondary">{T("memory.lastVerification")}</p>
              <p className="mt-1 text-[15px] font-semibold text-ink">
                {lastVerification.verdict ? T(`verifyReport.verdict.${lastVerification.verdict}`) : "–"}
                {lastVerification.confidence ? ` · ${T(`verifyReport.confidence.${lastVerification.confidence}`)}` : ""}
              </p>
              {lastVerification.metric_changes?.length > 0 && (
                <p className="mt-1 text-sm leading-relaxed text-secondary">
                  {lastVerification.metric_changes
                    .slice(0, 3)
                    .map((m) => String(m.metric ?? "–"))
                    .join(" · ")}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
