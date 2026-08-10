"use client";

import { useState } from "react";
import { t, UILanguage } from "@/lib/i18n";

export interface ImpactData {
  business_health_change: string;
  risk_change: string;
  expected_result: string;
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

export default function ImpactCard({ impact, lang }: { impact: ImpactData; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  const [open, setOpen] = useState(false);

  const hasContent = impact.business_health_change || impact.risk_change || impact.expected_result;

  if (!hasContent) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-blue-500 hover:text-blue-700 transition-colors"
      >
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>&#9654;</span>
        {T("biz.expectedImpact")}
        {impact.confidence && (
          <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CONF_COLORS[impact.confidence] || "bg-slate-100 text-slate-500"}`}>
            {CONF_KEYS[impact.confidence] ? T(CONF_KEYS[impact.confidence]) : impact.confidence}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-3">
          {impact.business_health_change && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 mb-1">{T("biz.estimatedHealth")}</p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">{T("biz.current")}</p>
                  <p className="text-lg font-bold text-slate-700 tabular-nums">&mdash;</p>
                </div>
                <span className="text-slate-300">&rarr;</span>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400">{T("biz.expected")}</p>
                  <p className={`text-lg font-bold tabular-nums ${impact.business_health_change.startsWith("+") ? "text-emerald-600" : impact.business_health_change.startsWith("-") ? "text-red-500" : "text-slate-700"}`}>
                    {impact.business_health_change.startsWith("+") || impact.business_health_change.startsWith("-") ? impact.business_health_change : "+" + impact.business_health_change}
                  </p>
                </div>
              </div>
            </div>
          )}
          {impact.risk_change && (
            <div className="flex gap-2 text-[11px]">
              <span className="font-medium text-slate-500 shrink-0">{T("biz.riskImpact")}</span>
              <span className="text-slate-700">{impact.risk_change}</span>
            </div>
          )}
          {impact.expected_result && (
            <div className="flex gap-2 text-[11px]">
              <span className="font-medium text-slate-500 shrink-0">{T("biz.expectedResult")}</span>
              <span className="text-slate-700">{impact.expected_result}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}