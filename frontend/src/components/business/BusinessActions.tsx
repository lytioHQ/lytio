"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { t, UILanguage } from "@/lib/i18n";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/** Read-only snapshot shape used by the public Demo (no mutation, no run links). */
export interface DemoActionItem {
  id: number;
  recommendation_id: string | null;
  source_run_id: number;
  description_key: string;
  expected_result_key: string | null;
  reason_key?: string | null;
  priority_snapshot: string;
  status: string;
  execution_count: number;
  target_metric_name: string | null;
  target_direction: string | null;
  target_metric_source: string | null;
  observations_summary: {
    total?: number;
    aligned?: number;
    not_aligned?: number;
    unable_to_verify?: number;
  } | null;
  verification_run_id: number | null;
  verified_at: string | null;
}

export interface ActionItem {
  id: number;
  project_id: number;
  source_run_id: number;
  recommendation_id: string | null;
  description: string;
  detail: string | null;
  priority_snapshot: string | null;
  action_type: string;
  expected_result: string | null;
  owner: string | null;
  deadline: string | null;
  status: string;
  completed_at: string | null;
  verification_run_id: number | null;
  verification_evidence: { recommendation?: string; evidence?: unknown; reason?: string } | null;
  verified_at: string | null;
  target_metric_name: string | null;
  target_direction: string | null;
  target_metric_source: string | null;
  execution_count: number;
  observations_summary: {
    total?: number;
    aligned?: number;
    not_aligned?: number;
    unable_to_verify?: number;
  } | null;
  created_at: string | null;
  updated_at: string | null;
}

interface TimelineRun {
  id: number;
  analysis_type: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning-soft text-warning",
  completed: "bg-success-soft text-success",
  cancelled: "bg-canvas text-secondary",
};

const ALIGNMENT_STYLES: Record<string, string> = {
  aligned: "bg-success-soft text-success",
  not_aligned: "bg-danger-soft text-danger",
  unable_to_verify: "bg-canvas text-secondary",
};

const PRI_ACCENT: Record<string, string> = {
  high: "border-l-danger",
  medium: "border-l-warning",
  low: "border-l-secondary",
};

const PRI_TEXT: Record<string, string> = {
  high: "text-danger",
  medium: "text-warning",
  low: "text-secondary",
};

const METRIC_KEYS: Record<string, string> = {
  total_sales: "action.metric.total_sales",
  sales_growth: "action.metric.sales_growth",
  order_count: "action.metric.order_count",
  average_order_value: "action.metric.average_order_value",
  customer_count: "action.metric.customer_count",
  customer_concentration: "action.metric.customer_concentration",
};

function alignmentOf(item: ActionItem): string | null {
  const s = item.observations_summary;
  if (!s) return item.target_metric_name ? "unable_to_verify" : null;
  if ((s.aligned ?? 0) > 0) return "aligned";
  if ((s.not_aligned ?? 0) > 0) return "not_aligned";
  return "unable_to_verify";
}

/**
 * M2.12.3: read-only Business Actions block.
 * Shows the Recommendation -> Action -> Verification chain for a project.
 * M2.14.0 adds: execution count, code-computed alignment badges and a minimal
 * execution-note / target-binding form. Verification linkage only displays
 * factual evidence; the alignment badge is system-calculated and never claims
 * causation ("因为建议所以增长" is forbidden).
 */
export default function BusinessActions({
  projectId,
  lang,
  demoData,
}: {
  projectId: string;
  lang: UILanguage;
  demoData?: { actions: DemoActionItem[] };
}) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const isDemo = demoData != null;
  const [actions, setActions] = useState<ActionItem[] | null>(null);
  const [sourceRunId, setSourceRunId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [metrics, setMetrics] = useState<Record<number, string>>({});
  const [directions, setDirections] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const loadActions = useCallback(() => {
    if (!token) return;
    apiFetch(`${API}/api/projects/${projectId}/actions`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ActionItem[]) => setActions(data))
      .catch(() => setActions([]));
  }, [token, projectId]);

  // Locate the latest non-verification run (the one the Executive Report is
  // based on) so recommendations can be turned into actions in one click.
  useEffect(() => {
    if (isDemo) return;
    if (!token) return;
    apiFetch(`${API}/api/projects/${projectId}/timeline`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((runs: TimelineRun[]) => {
        const source = runs.find((run) => run.analysis_type !== "verification");
        setSourceRunId(source?.id ?? null);
      })
      .catch(() => setSourceRunId(null));
  }, [token, projectId]);

  useEffect(() => {
    if (!isDemo) {
      loadActions();
      return;
    }
    setActions(
      (demoData?.actions ?? []).map((a) => ({
        id: a.id,
        project_id: 0,
        source_run_id: a.source_run_id,
        recommendation_id: a.recommendation_id,
        description: t(lang, a.description_key),
        detail: null,
        priority_snapshot: a.priority_snapshot,
        action_type: "recommendation",
        expected_result: a.expected_result_key ? t(lang, a.expected_result_key) : null,
        owner: null,
        deadline: null,
        status: a.status,
        completed_at: null,
        verification_run_id: a.verification_run_id,
        verification_evidence: null,
        verified_at: a.verified_at,
        target_metric_name: a.target_metric_name,
        target_direction: a.target_direction,
        target_metric_source: a.target_metric_source,
        execution_count: a.execution_count,
        observations_summary: a.observations_summary,
        created_at: null,
        updated_at: null,
      })),
    );
    setSourceRunId(null);
  }, [isDemo, demoData, lang, loadActions]);

  const createActions = async () => {
    if (!token || sourceRunId == null || creating) return;
    setCreating(true);
    setFeedback(null);
    try {
      const res = await apiFetch(`${API}/api/projects/${projectId}/actions/from-run/${sourceRunId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { created: ActionItem[]; existing: ActionItem[] };
      const createdCount = data.created?.length ?? 0;
      const existingCount = data.existing?.length ?? 0;
      setFeedback({
        kind: "ok",
        text:
          createdCount > 0
            ? T("action.created", { n: createdCount })
            : T("action.existing", { n: existingCount }),
      });
      await loadActions();
    } catch {
      setFeedback({ kind: "err", text: T("action.createFailed") });
    } finally {
      setCreating(false);
    }
  };

  const recordExecution = async (item: ActionItem) => {
    const note = (notes[item.id] ?? "").trim();
    if (!token || busy[item.id] || !note) return;
    setBusy((b) => ({ ...b, [item.id]: "exec" }));
    try {
      const res = await apiFetch(`${API}/api/projects/${projectId}/actions/${item.id}/executions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "execution", note, client_key: `ui-${item.id}-${Date.now()}` }),
      });
      if (!res.ok) throw new Error("failed");
      setNotes((n) => ({ ...n, [item.id]: "" }));
      setFeedback({ kind: "ok", text: T("action.execution.saved") });
      await loadActions();
    } catch {
      setFeedback({ kind: "err", text: T("action.execution.failed") });
    } finally {
      setBusy((b) => ({ ...b, [item.id]: "" }));
    }
  };

  const saveBinding = async (item: ActionItem) => {
    const metric = (metrics[item.id] ?? "").trim() || null;
    const direction = directions[item.id] || null;
    if (!token || busy[item.id]) return;
    setBusy((b) => ({ ...b, [item.id]: "bind" }));
    try {
      const res = await apiFetch(`${API}/api/projects/${projectId}/actions/${item.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          target_metric_name: metric,
          target_direction: direction,
          target_metric_source: metric ? "user" : "none",
        }),
      });
      if (!res.ok) throw new Error("failed");
      setFeedback({ kind: "ok", text: T("action.target.saved") });
      await loadActions();
    } catch {
      setFeedback({ kind: "err", text: T("action.target.saveFailed") });
    } finally {
      setBusy((b) => ({ ...b, [item.id]: "" }));
    }
  };

  const hasActions = actions !== null && actions.length > 0;

  return (
    <div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">{T("action.title")}</h3>
          <p className="text-caption text-secondary">{T("action.subtitle")}</p>
        </div>
        {!isDemo && sourceRunId != null && !hasActions && (
          <button
            type="button"
            onClick={createActions}
            disabled={creating}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? T("action.creating") : T("action.create")}
          </button>
        )}
      </div>

      {feedback && (
        <p className={`mt-3 text-sm ${feedback.kind === "ok" ? "text-success" : "text-danger"}`}>{feedback.text}</p>
      )}

      {actions === null ? (
        <p className="mt-4 text-sm text-secondary">{T("action.loading")}</p>
      ) : hasActions ? (
        <div className="mt-4 space-y-3">
          {actions.map((item) => {
            const priority = item.priority_snapshot ?? "medium";
            const verified = item.verification_run_id != null;
            const alignment = alignmentOf(item);
            return (
              <div key={item.id} className={`rounded-card border border-border border-l-4 bg-surface p-5 ${PRI_ACCENT[priority] || "border-l-ink"}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[15px] font-semibold text-ink">{item.description}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[item.status] || "bg-canvas text-secondary"}`}>
                    {T(`action.status.${item.status}`)}
                  </span>
                </div>
                {item.detail && <p className="mt-1 text-sm leading-relaxed text-secondary">{item.detail}</p>}
                {item.priority_snapshot && (
                  <p className={`mt-2 text-xs font-medium uppercase tracking-wide ${PRI_TEXT[priority] || "text-secondary"}`}>
                    {T(`action.priority.${priority}`)}
                  </p>
                )}
                {item.expected_result && (
                  <p className="mt-2 text-sm text-secondary">
                    <span className="font-medium text-ink">{T("action.expectedResult")}:</span> {item.expected_result}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs text-secondary">
                  <span>
                    {T("action.source")}: {T("action.sourceRecommendation")}
                    {" · "}
                    {isDemo ? (
                      <span className="font-medium text-accent" title={`${item.recommendation_id ?? ""} · #${item.source_run_id}`}>{T("action.viewOriginalAnalysis")}</span>
                    ) : (
                      <Link href={`/project/${projectId}/report/${item.source_run_id}`} className="font-medium text-accent hover:underline" title={`${item.recommendation_id ?? ""} · #${item.source_run_id}`}>
                        {T("action.viewOriginalAnalysis")}
                      </Link>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    {verified ? (
                      <>
                        <span className="font-medium text-success">{T("action.verification.linked")}</span>
                        {isDemo ? (
                          <span className="font-medium text-accent">{T("action.viewVerification")}</span>
                        ) : (
                          <Link href={`/project/${projectId}/verification/${item.verification_run_id}`} className="font-medium text-accent hover:underline">
                            {T("action.viewVerification")}
                          </Link>
                        )}
                      </>
                    ) : (
                      <span>{T("action.verification.unlinked")}</span>
                    )}
                  </span>
                </div>
                {verified && item.verification_evidence?.reason && (
                  <p className="mt-2 text-xs leading-relaxed text-secondary">
                    <span className="font-medium text-ink">{T("action.verification.evidenceReason")}:</span> {item.verification_evidence.reason}
                  </p>
                )}
                {!verified && (
                  <p className="mt-2 text-caption text-secondary/70">{T("action.verification.desc")}</p>
                )}
                {/* M2.14.0: execution count + code-computed alignment badge */}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs text-secondary">
                  <span>
                    {T("action.execution.title")}:{" "}
                    <span className="font-medium text-ink">{item.execution_count ?? 0}</span>
                  </span>
                  {alignment && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ALIGNMENT_STYLES[alignment] || "bg-canvas text-secondary"}`}>
                      {T(`action.alignment.${alignment}`)} · {T("action.alignment.source")}
                    </span>
                  )}
                  {!alignment && !item.target_metric_name && (
                    <span>{T("action.target.unbound")}</span>
                  )}
                </div>
                {item.target_metric_name && (
                  <p className="mt-2 text-xs text-secondary">
                    {T("action.target.bound", {
                      metric: T(METRIC_KEYS[item.target_metric_name] ?? "action.metric.unknown"),
                      dir: item.target_direction ? T(`action.target.direction.${item.target_direction}`) : "—",
                    })}
                  </p>
                )}
                {!isDemo && expanded[item.id] && (
                  <div className="mt-3 rounded-card border border-border bg-canvas/50 p-3 text-sm">
                    <p className="text-xs font-medium text-ink">{T("action.execution.record")}</p>
                    <textarea
                      value={notes[item.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                      placeholder={T("action.execution.notePlaceholder")}
                      rows={2}
                      className="mt-2 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select
                        value={metrics[item.id] ?? item.target_metric_name ?? ""}
                        onChange={(e) => setMetrics((m) => ({ ...m, [item.id]: e.target.value }))}
                        className="h-9 rounded-control border border-border bg-surface px-2 text-sm text-ink outline-none"
                      >
                        <option value="">{T("action.target.metric.placeholder")}</option>
                        {Object.entries(METRIC_KEYS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {T(label)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={directions[item.id] ?? item.target_direction ?? ""}
                        onChange={(e) => setDirections((d) => ({ ...d, [item.id]: e.target.value }))}
                        className="h-9 rounded-control border border-border bg-surface px-2 text-sm text-ink outline-none"
                      >
                        <option value="">—</option>
                        <option value="up">{T("action.target.direction.up")}</option>
                        <option value="down">{T("action.target.direction.down")}</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => saveBinding(item)}
                        disabled={busy[item.id] === "bind"}
                        className="inline-flex h-9 items-center justify-center rounded-control border border-border bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy[item.id] === "bind" ? T("action.saving") : T("action.target.save")}
                      </button>
                      <button
                        type="button"
                        onClick={() => recordExecution(item)}
                        disabled={busy[item.id] === "exec" || !(notes[item.id] ?? "").trim()}
                        className="inline-flex h-9 items-center justify-center rounded-control border border-border bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy[item.id] === "exec" ? T("action.saving") : T("action.execution.submit")}
                      </button>
                    </div>
                    <p className="mt-2 text-caption text-secondary/70">{T("action.execution.hint")}</p>
                  </div>
                )}
                {!isDemo && (
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))}
                    className="mt-2 text-xs font-medium text-accent hover:underline"
                  >
                    {expanded[item.id] ? T("action.collapse") : T("action.execution.open")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-secondary">{T("action.empty")}</p>
      )}
    </div>
  );
}
