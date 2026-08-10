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
  high: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-red-100 text-red-700",
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
        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
      >
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>&#9654;</span>
        {T("biz.whyConclusion")}
        {evidence.confidence && (
          <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CONF_COLORS[evidence.confidence] || "bg-slate-100 text-slate-500"}`}>
            {CONF_KEYS[evidence.confidence] ? T(CONF_KEYS[evidence.confidence]) : evidence.confidence}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
          {evidence.source_sheet && (
            <div className="flex gap-2 text-[11px]">
              <span className="font-medium text-slate-500 shrink-0">{T("biz.sheet")}</span>
              <span className="text-slate-700">{evidence.source_sheet}</span>
            </div>
          )}
          {evidence.source_range && (
            <div className="flex gap-2 text-[11px]">
              <span className="font-medium text-slate-500 shrink-0">{T("biz.range")}</span>
              <span className="text-slate-700 font-mono">{evidence.source_range}</span>
            </div>
          )}
          {evidence.source_columns && evidence.source_columns.length > 0 && (
            <div className="flex gap-2 text-[11px]">
              <span className="font-medium text-slate-500 shrink-0">{T("biz.columns")}</span>
              <span className="text-slate-700">{evidence.source_columns.join(", ")}</span>
            </div>
          )}
          {evidence.source_rows && (
            <div className="flex gap-2 text-[11px]">
              <span className="font-medium text-slate-500 shrink-0">{T("biz.rows")}</span>
              <span className="text-slate-700">{evidence.source_rows}</span>
            </div>
          )}
          {evidence.reason && (
            <div className="flex gap-2 text-[11px]">
              <span className="font-medium text-slate-500 shrink-0">{T("biz.reason")}</span>
              <span className="text-slate-700">{evidence.reason}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}