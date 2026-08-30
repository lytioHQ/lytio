"use client";

import { useMemo, useState } from "react";
import { t, UILanguage } from "@/lib/i18n";
import { apiFetch } from "@/lib/apiFetch";
import {
  schemaFieldMeta,
  type SchemaAction,
  type SchemaMapping,
} from "@/lib/schemaMapping";
import type { SchemaFieldMapping } from "@/lib/schemaMapping";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface SchemaConfirmationPanelProps {
  mapping: SchemaMapping;
  lang: UILanguage;
  projectId: string;
  token: string | null;
  onChanged: (mapping: SchemaMapping) => void;
}

const STATUS_BADGE: Record<string, string> = {
  confirmed: "bg-success-soft text-success",
  modified: "bg-accent-soft text-accent",
  skipped: "bg-warning-soft text-warning",
  pending: "bg-muted text-secondary",
  auto: "bg-muted text-secondary",
  unavailable: "bg-muted text-secondary/60",
};

const KNOWN_STATUSES = ["confirmed", "modified", "skipped", "pending", "auto", "unavailable"];

function safeStatus(status: string | undefined): string {
  return status && KNOWN_STATUSES.includes(status) ? status : "auto";
}

const TIER_BADGE: Record<string, string> = {
  high: "bg-success-soft text-success",
  medium: "bg-warning-soft text-warning",
  low: "bg-danger/10 text-danger",
};

function tierOf(m: SchemaFieldMapping): "high" | "medium" | "low" {
  if (m.confidence_tier) return m.confidence_tier;
  const confidence = m.confidence ?? 1;
  return confidence >= 0.9 ? "high" : confidence >= 0.75 ? "medium" : "low";
}

export default function SchemaConfirmationPanel({
  mapping,
  lang,
  projectId,
  token,
  onChanged,
}: SchemaConfirmationPanelProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<"saved" | "error" | "">("");
  const T = (key: string) => t(lang, key);

  const available = useMemo(
    () => mapping.mappings.filter((m) => m.availability === "available" && m.source_column),
    [mapping],
  );
  const missing = useMemo(() => mapping.missing ?? [], [mapping]);
  const unresolvedConflicts = useMemo(
    () => (mapping.conflicts ?? []).filter((c) => !c.resolved),
    [mapping],
  );
  const overall = mapping.audit?.confirmation_status
    ? safeStatus(mapping.audit.confirmation_status)
    : "auto";

  async function apply(actions: SchemaAction[]) {
    if (!token || actions.length === 0) return;
    setBusy(true);
    setMessage("");
    try {
      const r = await apiFetch(API + "/api/projects/" + projectId + "/schema-mapping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ version: 2, actions }),
      });
      if (!r.ok) {
        setMessage("error");
        return;
      }
      const d = await r.json();
      if (d.schema_mapping) onChanged(d.schema_mapping);
      setMessage("saved");
    } catch {
      setMessage("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-control border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">{T("schema.confirm.title")}</span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[overall]}`}
          >
            {T("schema.confirm.overall." + overall)}
          </span>
        </span>
        <span className="shrink-0 text-xs text-secondary">
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-caption text-secondary">{T("schema.confirm.subtitle")}</p>

          {unresolvedConflicts.length > 0 && (
            <div className="mt-3 rounded-control border border-warning/20 bg-warning/5 px-3 py-2">
              <p className="text-xs font-medium text-warning">{T("schema.confirm.conflictHint")}</p>
            </div>
          )}

          {available.some((m) => tierOf(m) !== "high") && (
            <div className="mt-3 rounded-control border border-warning/20 bg-warning/5 px-3 py-2">
              <p className="text-xs font-medium text-warning">{T("schema.confirm.tierHint")}</p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || available.length === 0}
              onClick={() =>
                apply(available.map((m) => ({ canonical_key: m.canonical_key, action: "confirm" as const })))
              }
              className="inline-flex h-8 items-center rounded-control bg-ink px-3 text-xs font-medium text-white transition-colors hover:bg-ink-hover disabled:opacity-50"
            >
              {T("schema.confirm.action.all")}
            </button>
            <button
              type="button"
              disabled={busy || available.length === 0}
              onClick={() =>
                apply(available.map((m) => ({ canonical_key: m.canonical_key, action: "skip" as const })))
              }
              className="inline-flex h-8 items-center rounded-control border border-border bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-canvas disabled:opacity-50"
            >
              {T("schema.confirm.action.skipAll")}
            </button>
            {busy && <span className="inline-flex items-center text-xs text-secondary">{T("schema.confirm.saving")}</span>}
            {message === "saved" && (
              <span className="inline-flex items-center text-xs font-medium text-success">{T("schema.confirm.saved")}</span>
            )}
            {message === "error" && (
              <span className="inline-flex items-center text-xs font-medium text-warning">{T("schema.confirm.error")}</span>
            )}
          </div>

          <ul className="mt-4 space-y-2">
            {available.map((m) => {
              const meta = schemaFieldMeta(m.canonical_key);
              const status = safeStatus(m.confirmation_status);
              const conflicted = unresolvedConflicts.some((c) => c.canonical_key === m.canonical_key);
              const tier = tierOf(m);
              const needsReview = tier !== "high";
              return (
                <li key={m.canonical_key} className="rounded-control border border-border bg-muted/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span aria-hidden>{meta.icon}</span>
                      <span className="text-sm font-medium text-ink">{T(meta.labelKey)}</span>
                      {m.required && (
                        <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                          {T("schema.confirm.required")}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[status]}`}
                      >
                        {T("schema.confirm.status." + status)}
                      </span>
                      {conflicted && (
                        <span className="inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
                          {T("schema.confirm.conflict")}
                        </span>
                      )}
                      {needsReview && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TIER_BADGE[tier]}`}>
                          {T("schema.tier." + tier)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => apply([{ canonical_key: m.canonical_key, action: "confirm" }])}
                        className="inline-flex h-7 items-center rounded-control bg-success-soft px-2.5 text-xs font-medium text-success transition-colors hover:bg-success disabled:opacity-50"
                      >
                        {T("schema.confirm.action.confirm")}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => apply([{ canonical_key: m.canonical_key, action: "skip" }])}
                        className="inline-flex h-7 items-center rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-ink transition-colors hover:bg-canvas disabled:opacity-50"
                      >
                        {T("schema.confirm.action.skip")}
                      </button>
                      <select
                        value=""
                        disabled={busy}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "") return;
                          apply([
                            {
                              canonical_key: m.canonical_key,
                              action: "modify",
                              source_column: v === "__unavailable__" ? null : v,
                            },
                          ]);
                        }}
                        className="h-7 rounded-control border border-border bg-surface px-2 text-xs text-ink"
                      >
                        <option value="">{T("schema.confirm.action.modify")}…</option>
                        {mapping.source_headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                        <option value="__unavailable__">{T("schema.confirm.action.markUnavailable")}</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-caption text-secondary">
                    <span>
                      {T("schema.confirm.source")}: {m.source_column ?? "—"}
                    </span>
                    <span>
                      {T("schema.confirm.method." + (m.match_method ?? "heuristic_type"))} ·{" "}
                      {T("schema.tier." + tier)}
                    </span>
                    {m.example_values && m.example_values.length > 0 && (
                      <span>
                        {T("schema.confirm.examples")}: {m.example_values.slice(0, 3).join(" / ")}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
            {missing.map((key) => {
              const meta = schemaFieldMeta(key);
              return (
                <li key={key} className="rounded-control border border-border bg-muted/20 p-3 opacity-80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span aria-hidden>{meta.icon}</span>
                      <span className="text-sm font-medium text-ink">{T(meta.labelKey)}</span>
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-secondary">
                        {T("schema.confirm.status.unavailable")}
                      </span>
                    </div>
                    <select
                      value=""
                      disabled={busy}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") return;
                        apply([
                          {
                            canonical_key: key,
                            action: "modify",
                            source_column: v === "__unavailable__" ? null : v,
                          },
                        ]);
                      }}
                      className="h-7 rounded-control border border-border bg-surface px-2 text-xs text-ink"
                    >
                      <option value="">{T("schema.confirm.action.modify")}…</option>
                      {mapping.source_headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                      <option value="__unavailable__">{T("schema.confirm.action.markUnavailable")}</option>
                    </select>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
