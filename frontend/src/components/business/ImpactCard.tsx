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
  high: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  low: "bg-danger/10 text-danger",
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
        className="flex items-center gap-1.5 text-caption font-medium text-accent transition-colors hover:text-ink"
      >
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>&#9654;</span>
        {T("biz.expectedImpact")}
        {impact.confidence && (
          <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${CONF_COLORS[impact.confidence] || "bg-canvas text-secondary"}`}>
            {CONF_KEYS[impact.confidence] ? T(CONF_KEYS[impact.confidence]) : impact.confidence}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-2 space-y-3 rounded-control border border-accent/20 bg-accent/5 p-4">
          {impact.business_health_change && (
            <div>
              <p className="mb-1 text-caption font-semibold text-accent">{T("biz.estimatedHealth")}</p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-caption text-secondary">{T("biz.current")}</p>
                  <p className="text-xl font-semibold text-ink tabular-nums">&mdash;</p>
                </div>
                <span className="text-secondary">&rarr;</span>
                <div className="text-center">
                  <p className="text-caption text-secondary">{T("biz.expected")}</p>
                  <p className={`text-xl font-semibold tabular-nums ${impact.business_health_change.startsWith("+") ? "text-success" : impact.business_health_change.startsWith("-") ? "text-danger" : "text-ink"}`}>
                    {impact.business_health_change.startsWith("+") || impact.business_health_change.startsWith("-") ? impact.business_health_change : "+" + impact.business_health_change}
                  </p>
                </div>
              </div>
            </div>
          )}
          {impact.risk_change && (
            <div className="flex gap-2 text-caption">
              <span className="shrink-0 font-medium text-secondary">{T("biz.riskImpact")}</span>
              <span className="text-ink">{impact.risk_change}</span>
            </div>
          )}
          {impact.expected_result && (
            <div className="flex gap-2 text-caption">
              <span className="shrink-0 font-medium text-secondary">{T("biz.expectedResult")}</span>
              <span className="text-ink">{impact.expected_result}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}