"use client";

import { useState } from "react";
import { t, UILanguage } from "@/lib/i18n";

export interface EvidenceData {
  source_sheet: string;
  source_range: string;
  source_columns: string[];
  source_rows: string;
  reason: string;
  confidence: string;
}

const CONF_COLORS: Record<string, string> = {
  high: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  low: "bg-danger/10 text-danger",
};

const CONF_KEYS: Record<string, string> = {
  high: "biz.level.high",
  medium: "biz.level.medium",
  low: "biz.level.low",
};

export default function EvidenceCard({ evidence, lang }: { evidence: EvidenceData; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  const [open, setOpen] = useState(false);

  const hasContent = evidence.reason || evidence.source_sheet || evidence.source_range;

  if (!hasContent) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-caption font-medium text-secondary transition-colors hover:text-ink"
      >
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>&#9654;</span>
        {T("biz.whyConclusion")}
        {evidence.confidence && (
          <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${CONF_COLORS[evidence.confidence] || "bg-canvas text-secondary"}`}>
            {CONF_KEYS[evidence.confidence] ? T(CONF_KEYS[evidence.confidence]) : evidence.confidence}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-control border border-border bg-canvas p-3.5">
          {evidence.source_sheet && (
            <div className="flex gap-2 text-caption">
              <span className="shrink-0 font-medium text-secondary">{T("biz.sheet")}</span>
              <span className="text-ink">{evidence.source_sheet}</span>
            </div>
          )}
          {evidence.source_range && (
            <div className="flex gap-2 text-caption">
              <span className="shrink-0 font-medium text-secondary">{T("biz.range")}</span>
              <span className="font-mono text-ink">{evidence.source_range}</span>
            </div>
          )}
          {evidence.source_columns && evidence.source_columns.length > 0 && (
            <div className="flex gap-2 text-caption">
              <span className="shrink-0 font-medium text-secondary">{T("biz.columns")}</span>
              <span className="text-ink">{evidence.source_columns.join(", ")}</span>
            </div>
          )}
          {evidence.source_rows && (
            <div className="flex gap-2 text-caption">
              <span className="shrink-0 font-medium text-secondary">{T("biz.rows")}</span>
              <span className="text-ink">{evidence.source_rows}</span>
            </div>
          )}
          {evidence.reason && (
            <div className="flex gap-2 text-caption">
              <span className="shrink-0 font-medium text-secondary">{T("biz.reason")}</span>
              <span className="text-ink">{evidence.reason}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}