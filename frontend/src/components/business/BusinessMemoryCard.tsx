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
  verification_history: Array<Record<string, unknown>>;
  open_loops: OpenLoop[];
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
 * Shows the project's accumulated operating knowledge (health trend, sales
 * trend, action closed-loop rate and open loops). Everything shown is a
 * derived cache from analysis_runs + action_items; nothing here is AI output.
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
        </>
      )}
    </div>
  );
}
