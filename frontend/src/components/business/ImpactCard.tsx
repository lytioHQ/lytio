import { t, UILanguage } from "@/lib/i18n";

export interface ImpactData {
  business_health_change: string;
  risk_change: string;
  expected_result: string;
  confidence: string;
}

/**
 * M2.14.3 Phase 2 (P2): recommendation cards show the purpose of a suggestion.
 *
 * "建议目的" (expected_result) is shown directly; the forward-looking health /
 * risk change estimates remain available under a small toggle so customers are
 * never asked to judge "how reliable is this suggestion".
 */
export default function ImpactCard({ impact, lang }: { impact: ImpactData; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);

  const hasContent = impact.business_health_change || impact.risk_change || impact.expected_result;

  if (!hasContent) return null;

  return (
    <div className="mt-2 rounded-control border border-accent/20 bg-accent/5 p-3">
      {impact.expected_result && (
        <p className="text-caption leading-relaxed text-secondary">
          <span className="font-medium text-ink">{T("biz.expectedResult")}</span>{" "}
          {impact.expected_result}
        </p>
      )}
      {(impact.business_health_change || impact.risk_change) && (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-caption font-medium text-accent transition-colors hover:text-ink">
            {T("biz.expectedImpact")}
          </summary>
          <div className="mt-1.5 space-y-1.5 text-caption text-secondary">
            {impact.business_health_change && (
              <div className="flex gap-2">
                <span className="shrink-0 font-medium text-secondary">{T("biz.estimatedHealth")}</span>
                <span className="text-ink">{impact.business_health_change}</span>
              </div>
            )}
            {impact.risk_change && (
              <div className="flex gap-2">
                <span className="shrink-0 font-medium text-secondary">{T("biz.riskImpact")}</span>
                <span className="text-ink">{impact.risk_change}</span>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
