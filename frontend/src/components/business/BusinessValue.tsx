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

/**
 * M2.14.3 Phase 2 (P2): Business Overview in customer language.
 *
 * Shows the current health score (system-computed) plus the improvement
 * opportunities and recommendation coverage derived from the report's own
 * recommendations. The forward-looking "reference level of suggested impact"
 * concept was removed in Phase 2 because customers read it as reliability of
 * the whole analysis.
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

  const healthDeltaStr = totalDelta >= 0 ? `+${totalDelta}` : `${totalDelta}`;
  const healthColor = totalDelta > 0 ? "text-success" : totalDelta < 0 ? "text-danger" : "text-secondary";
  const levelLabel = T(`health.level.${currentHealthLevel}`) || currentHealthLevel;

  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <p className="text-caption font-semibold text-accent">{T("biz.businessValue")}</p>
      <p className="mb-5 mt-1 text-sm leading-relaxed text-secondary">
        {T("biz.recsDesc")}
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {/* Current health score */}
        <div className="rounded-control border border-border bg-canvas p-5">
          <p className="text-caption font-medium text-secondary">{T("landing.diff.businessHealth")}</p>
          <div className="mt-3">
            <span className="text-3xl font-semibold text-ink tabular-nums">{currentHealth}</span>
          </div>
          <p className="mt-1 text-caption text-secondary">{T("biz.currentLevel", { level: levelLabel })}</p>
        </div>

        {/* Improvement opportunities */}
        <div className="rounded-control border border-border bg-canvas p-5">
          <p className="text-caption font-medium text-secondary">{T("biz.healthOpportunities")}</p>
          <div className="mt-3">
            <span className={`text-3xl font-semibold tabular-nums ${healthColor}`}>{healthDeltaStr}</span>
          </div>
          <p className="mt-1 text-caption text-secondary">{T("biz.healthOpportunitiesDesc")}</p>
        </div>

        {/* Recommendation coverage */}
        <div className="rounded-control border border-border bg-canvas p-5">
          <p className="text-caption font-medium text-secondary">{T("biz.highRiskCovered")}</p>
          <div className="mt-3">
            <span className="text-3xl font-semibold text-ink tabular-nums">
              {highRisks > 0 ? `${coveredRisks}/${highRisks}` : "0"}
            </span>
          </div>
          <p className="mt-1 text-caption text-secondary">
            {highRisks > 0 && coveredRisks > 0 ? T("biz.highRiskCoveredDesc") : T("biz.noneCovered")}
          </p>
        </div>
      </div>
    </div>
  );
}
