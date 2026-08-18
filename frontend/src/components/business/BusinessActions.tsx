"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { t, UILanguage } from "@/lib/i18n";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface ActionItem {
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

/**
 * M2.12.3: read-only Business Actions block.
 * Shows the Recommendation -> Action -> Verification chain for a project.
 * Verification linkage only displays factual evidence (never claims the
 * task itself was executed); creation is idempotent via the existing API.
 */
export default function BusinessActions({ projectId, lang }: { projectId: string; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const [actions, setActions] = useState<ActionItem[] | null>(null);
  const [sourceRunId, setSourceRunId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

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
    loadActions();
  }, [loadActions]);

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

  const hasActions = actions !== null && actions.length > 0;

  return (
    <div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">{T("action.title")}</h3>
          <p className="text-caption text-secondary">{T("action.subtitle")}</p>
        </div>
        {sourceRunId != null && !hasActions && (
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
                    {T("action.source")}: {item.recommendation_id || T("action.legacyRec")}
                    {" · "}
                    <Link href={`/project/${projectId}/report/${item.source_run_id}`} className="font-medium text-accent hover:underline">
                      {T("action.fromRun", { id: item.source_run_id })}
                    </Link>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    {verified ? (
                      <>
                        <span className="font-medium text-success">{T("action.verification.linked")}</span>
                        <Link href={`/project/${projectId}/verification/${item.verification_run_id}`} className="font-medium text-accent hover:underline">
                          {T("action.viewVerification")}
                        </Link>
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
