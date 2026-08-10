import { t, UILanguage } from "@/lib/i18n";

interface ExpectedImpact {
  business_health_change?: string;
  risk_change?: string;
  expected_result?: string;
  confidence?: string;
}

interface Rec {
  priority: string;
  expected_impact?: ExpectedImpact | null;
}

interface RiskItem {
  severity: string;
}

interface Props {
  currentHealth: number;
  currentHealthLevel: string;
  recommendations: Rec[];
  risks: RiskItem[];
  hasImpact: boolean;
  lang: UILanguage;
}

function parseHealthDelta(change: string): number {
  const cleaned = change.replace(/[^+\-\d.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export default function BusinessValue({ currentHealth, currentHealthLevel, recommendations, risks, hasImpact, lang }: Props) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  if (!hasImpact) return null;

  // Compute potential health delta from recommendations
  let totalDelta = 0;
  recommendations.forEach((r) => {
    if (r.expected_impact?.business_health_change) {
      totalDelta += parseHealthDelta(r.expected_impact.business_health_change);
    }
  });

  // Count current high risks
  const highRisks = risks.filter((r) => r.severity === "high" || r.severity === "critical").length;

  // Count potentially mitigated risks (high-priority recs with risk_change)
  const mitigatedRisks = Math.min(
    highRisks,
    recommendations.filter((r) => r.priority === "high" && r.expected_impact?.risk_change).length
  );

  // Conservative confidence rule
  const confidences = recommendations
    .filter((r) => r.expected_impact?.confidence)
    .map((r) => r.expected_impact!.confidence!.toLowerCase());
  let aggregateConf = "";
  if (confidences.length > 0) {
    if (confidences.some((c) => c === "low")) {
      aggregateConf = "low";
    } else if (confidences.some((c) => c === "medium")) {
      aggregateConf = "medium";
    } else {
      aggregateConf = "high";
    }
  }

  const highPriority = recommendations.filter((r) => r.priority === "high").length;
  const healthDeltaStr = totalDelta >= 0 ? `+${totalDelta}` : `${totalDelta}`;
  const healthColor = totalDelta > 0 ? "text-emerald-600" : totalDelta < 0 ? "text-red-500" : "text-slate-600";
  const confColor: Record<string, string> = { high: "text-emerald-600", medium: "text-amber-600", low: "text-red-500" };

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white p-6 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500 mb-1">{T("biz.businessValue")}</p>
      <p className="text-xs text-slate-500 mb-5">
        {T("biz.valueIntro")}
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Business Health */}
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{T("landing.diff.businessHealth")}</p>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-700 tabular-nums">{currentHealth}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`text-xs font-semibold ${healthColor}`}>{T("biz.potentialPts", { delta: healthDeltaStr })}</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">{T("biz.currentLevel", { level: currentHealthLevel })}</p>
        </div>

        {/* High Risks */}
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{T("biz.highRisks")}</p>
          <div className="mt-3 flex items-end gap-3">
            <div>
              <p className="text-[10px] text-slate-400">{T("biz.current")}</p>
              <span className="text-2xl font-bold text-red-500 tabular-nums">{highRisks}</span>
            </div>
            {mitigatedRisks > 0 && (
              <div>
                <p className="text-[10px] text-slate-400">{T("biz.mitigated")}</p>
                <span className="text-2xl font-bold text-emerald-600 tabular-nums">{mitigatedRisks}</span>
              </div>
            )}
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            {mitigatedRisks > 0 ? T("biz.potentiallyMitigated", { n: mitigatedRisks }) : T("biz.noneAddressed")}
          </p>
        </div>

        {/* Recommendations */}
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{T("report.recommendations")}</p>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{recommendations.length}</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">{T("biz.highPriorityCount", { n: highPriority })}</p>
        </div>

        {/* Confidence */}
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{T("biz.confidence")}</p>
          <div className="mt-3">
            <span className={`text-2xl font-bold tabular-nums ${confColor[aggregateConf] || "text-slate-400"}`}>
              {aggregateConf ? T("biz.level." + aggregateConf) : "\u2014"}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            {confidences.length > 0 ? T("biz.estimatesCount", { n: confidences.length }) : T("biz.noEstimates")}
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-[10px] text-slate-400 italic leading-relaxed">
        {T("biz.disclaimer")}
      </p>
    </div>
  );
}