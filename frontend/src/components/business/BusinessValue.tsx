import { t, UILanguage } from "@/lib/i18n";
import ProvenanceBadge from "./ProvenanceBadge";

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

/**
 * M2.14.3 Phase 1 (P1): Business Overview in customer language.
 *
 * - Current health score is a system-computed fact.
 * - Improvement opportunities, recommendation coverage and the reference
 *   level of suggested impact are all AI estimates - clearly labeled as such,
 *   never presented as business facts or guaranteed results.
 */
export default function BusinessValue({ currentHealth, currentHealthLevel, recommendations, risks, hasImpact, lang }: Props) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  if (!hasImpact) return null;

  // Potential health delta estimated from AI recommendation impacts (not a fact).
  let totalDelta = 0;
  recommendations.forEach((r) => {
    if (r.expected_impact?.business_health_change) {
      totalDelta += parseHealthDelta(r.expected_impact.business_health_change);
    }
  });

  // Current high risks (computed from the report facts).
  const highRisks = risks.filter((r) => r.severity === "high" || r.severity === "critical").length;

  // How many high risks have a matching high-priority recommendation (AI coverage, not resolution).
  const coveredRisks = Math.min(
    highRisks,
    recommendations.filter((r) => r.priority === "high" && r.expected_impact?.risk_change).length
  );

  // Aggregate reference level of AI-suggested impact.
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

  const healthDeltaStr = totalDelta >= 0 ? `+${totalDelta}` : `${totalDelta}`;
  const healthColor = totalDelta > 0 ? "text-success" : totalDelta < 0 ? "text-danger" : "text-secondary";
  const refColor: Record<string, string> = { high: "text-success", medium: "text-warning", low: "text-secondary" };
  const levelLabel = T(`health.level.${currentHealthLevel}`) || currentHealthLevel;

  return (
    <div className="rounded-card border border-border bg-surface p-6">
      <p className="text-caption font-semibold text-accent">{T("biz.businessValue")}</p>
      <p className="mb-5 mt-1 text-sm leading-relaxed text-secondary">
        {T("biz.recsDesc")}
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Current health score - system computed */}
        <div className="rounded-control border border-border bg-canvas p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-caption font-medium text-secondary">{T("landing.diff.businessHealth")}</p>
            <ProvenanceBadge variant="computed" lang={lang} />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-semibold text-ink tabular-nums">{currentHealth}</span>
          </div>
          <p className="mt-1 text-caption text-secondary">{T("biz.currentLevel", { level: levelLabel })}</p>
        </div>

        {/* Improvement opportunities - AI estimate */}
        <div className="rounded-control border border-border bg-canvas p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-caption font-medium text-secondary">{T("biz.healthOpportunities")}</p>
            <ProvenanceBadge variant="aiEstimate" lang={lang} />
          </div>
          <div className="mt-3">
            <span className={`text-3xl font-semibold tabular-nums ${healthColor}`}>{healthDeltaStr}</span>
          </div>
          <p className="mt-1 text-caption text-secondary">{T("biz.healthOpportunitiesDesc")}</p>
        </div>

        {/* Recommendation coverage - AI estimate */}
        <div className="rounded-control border border-border bg-canvas p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-caption font-medium text-secondary">{T("biz.highRiskCovered")}</p>
            <ProvenanceBadge variant="aiEstimate" lang={lang} />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-semibold text-ink tabular-nums">
              {highRisks > 0 ? `${coveredRisks}/${highRisks}` : "0"}
            </span>
          </div>
          <p className="mt-1 text-caption text-secondary">
            {highRisks > 0 && coveredRisks > 0 ? T("biz.highRiskCoveredDesc") : T("biz.noneCovered")}
          </p>
        </div>

        {/* Reference level of suggested impact - AI estimate */}
        <div className="rounded-control border border-border bg-canvas p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-caption font-medium text-secondary">{T("biz.referenceLevel")}</p>
            <ProvenanceBadge variant="aiEstimate" lang={lang} />
          </div>
          <div className="mt-3">
            <span className={`text-3xl font-semibold tabular-nums ${refColor[aggregateConf] || "text-secondary"}`}>
              {aggregateConf ? T(`biz.reference.${aggregateConf}`) : "\u2014"}
            </span>
          </div>
          <p className="mt-1 text-caption text-secondary">
            {confidences.length > 0 ? T("biz.estimatesHint", { n: confidences.length }) : T("biz.noEstimates")}
          </p>
        </div>
      </div>

      {/* Disclaimer: AI estimates are not business facts */}
      <p className="mt-4 text-caption italic leading-relaxed text-secondary/70">
        {T("biz.disclaimer")}
      </p>
    </div>
  );
}
