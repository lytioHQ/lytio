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
  const healthColor = totalDelta > 0 ? "text-success" : totalDelta < 0 ? "text-danger" : "text-secondary";
  const confColor: Record<string, string> = { high: "text-success", medium: "text-warning", low: "text-danger" };

  return (
    <div className="rounded-card border border-border bg-surface p-6">
      <p className="text-caption font-semibold text-accent">{T("biz.businessValue")}</p>
      <p className="mb-5 mt-1 text-sm leading-relaxed text-secondary">
        {T("biz.valueIntro")}
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Business Health */}
        <div className="rounded-control border border-border bg-canvas p-5">
          <p className="text-caption font-medium text-secondary">{T("landing.diff.businessHealth")}</p>
          <div className="mt-3">
            <span className="text-3xl font-semibold text-ink tabular-nums">{currentHealth}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`text-sm font-semibold ${healthColor}`}>{T("biz.potentialPts", { delta: healthDeltaStr })}</span>
          </div>
          <p className="mt-1 text-caption text-secondary">{T("biz.currentLevel", { level: currentHealthLevel })}</p>
        </div>

        {/* High Risks */}
        <div className="rounded-control border border-border bg-canvas p-5">
          <p className="text-caption font-medium text-secondary">{T("biz.highRisks")}</p>
          <div className="mt-3 flex items-end gap-3">
            <div>
              <p className="text-caption text-secondary">{T("biz.current")}</p>
              <span className="text-3xl font-semibold text-danger tabular-nums">{highRisks}</span>
            </div>
            {mitigatedRisks > 0 && (
              <div>
                <p className="text-caption text-secondary">{T("biz.mitigated")}</p>
                <span className="text-3xl font-semibold text-success tabular-nums">{mitigatedRisks}</span>
              </div>
            )}
          </div>
          <p className="mt-1 text-caption text-secondary">
            {mitigatedRisks > 0 ? T("biz.potentiallyMitigated", { n: mitigatedRisks }) : T("biz.noneAddressed")}
          </p>
        </div>

        {/* Recommendations */}
        <div className="rounded-control border border-border bg-canvas p-5">
          <p className="text-caption font-medium text-secondary">{T("report.recommendations")}</p>
          <div className="mt-3">
            <span className="text-3xl font-semibold text-ink tabular-nums">{recommendations.length}</span>
          </div>
          <p className="mt-1 text-caption text-secondary">{T("biz.highPriorityCount", { n: highPriority })}</p>
        </div>

        {/* Confidence */}
        <div className="rounded-control border border-border bg-canvas p-5">
          <p className="text-caption font-medium text-secondary">{T("biz.confidence")}</p>
          <div className="mt-3">
            <span className={`text-3xl font-semibold tabular-nums ${confColor[aggregateConf] || "text-secondary"}`}>
              {aggregateConf ? T("biz.level." + aggregateConf) : "\u2014"}
            </span>
          </div>
          <p className="mt-1 text-caption text-secondary">
            {confidences.length > 0 ? T("biz.estimatesCount", { n: confidences.length }) : T("biz.noEstimates")}
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-caption italic leading-relaxed text-secondary/70">
        {T("biz.disclaimer")}
      </p>
    </div>
  );
}