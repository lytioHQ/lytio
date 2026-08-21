"use client";

import { useEffect, useState } from "react";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { localeForLang, t, UILanguage } from "@/lib/i18n";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface MemoryPoint {
  run_id: number;
  dataset_version: string | null;
  period?: { min?: string; max?: string } | null;
  score?: number | null;
  level?: string | null;
  value?: unknown;
}

interface OpenLoop {
  type: "pending_action" | "unavailable_metric" | string;
  action_id?: number | null;
  description?: string | null;
  priority?: string | null;
  metric?: string | null;
  note?: string | null;
}

interface VerificationPoint {
  run_id: number;
  parent_run_id: number | null;
  verdict: string | null;
  confidence: string | null;
  metric_changes: Array<Record<string, unknown>>;
  next_actions: Array<Record<string, unknown>>;
}

interface MetricTrend {
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

interface TrendDeltas {
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

interface BusinessMemoryData {
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
export default function BusinessMemoryCard({ projectId, lang }: { projectId: string; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const [memory, setMemory] = useState<BusinessMemoryData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch(`${API}/api/projects/${projectId}/memory`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BusinessMemoryData | null) => setMemory(data))
      .catch(() => setFailed(true));
  }, [token, projectId]);

  if (failed) return null;

  const healthPoints = memory?.health_history ?? [];
  const lastHealth = healthPoints.length > 0 ? healthPoints[healthPoints.length - 1] : null;
  const salesPoints = memory?.metric_history?.["total_sales"] ?? [];
  const lastSales = salesPoints.length > 0 ? salesPoints[salesPoints.length - 1] : null;
  const summary = memory?.action_summary ?? { total: 0, pending: 0, completed: 0, cancelled: 0, verified: 0 };
  const loops = memory?.open_loops ?? [];
  const verificationPoints = memory?.verification_history ?? [];
  const lastVerification =
    verificationPoints.length > 0 ? verificationPoints[verificationPoints.length - 1] : null;
  const trends = memory?.trend_deltas ?? null;
  const salesTrend = trends?.metric_trends?.find((m) => m.metric_name === "total_sales") ?? null;
  const healthTrend = trends?.health_trend ?? null;
  const actionTrend = trends?.action_trend ?? null;
  const verificationTrend = trends?.verification_trend ?? null;

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
              {lastHealth?.level && <p className="mt-0.5 text-xs text-secondary">{lastHealth.level}</p>}
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
              <p className="mt-0.5 text-xs text-secondary">{T("memory.engineVersion")}</p>
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
                    {healthTrend?.latest_level ? ` · ${healthTrend.latest_level}` : ""}
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
                    {verificationTrend?.latest_reliability ?? ""}
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
              <ul className="mt-2 space-y-2">
                {loops.slice(0, 3).map((loop, i) => (
                  <li
                    key={i}
                    className={`rounded-control border border-border border-l-4 bg-canvas px-3 py-2 text-sm text-ink ${LOOP_ACCENT[loop.type] || "border-l-muted"}`}
                  >
                    {loop.type === "pending_action" ? (
                      <span>
                        {T("memory.pendingAction")} · {loop.description ?? "–"}
                        {loop.priority ? ` (${T(`action.priority.${loop.priority}`)})` : ""}
                      </span>
                    ) : (
                      <span>
                        {T("memory.unavailableMetric")} · {loop.metric ?? "–"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
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
