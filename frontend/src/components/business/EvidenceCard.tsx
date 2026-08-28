import { t, UILanguage } from "@/lib/i18n";

export interface EvidenceData {
  source_sheet: string;
  source_range: string;
  source_columns: string[];
  source_rows: string;
  reason: string;
  confidence: string;
}

/**
 * M2.14.3 Phase 2 (P2): recommendation cards answer "why this suggestion?"
 *
 * The evidence reason is shown directly in customer language; the underlying
 * source references (sheet / range / columns / rows) stay available under a
 * small "view data source" toggle for users who want to audit the numbers.
 */
export default function EvidenceCard({ evidence, lang }: { evidence: EvidenceData; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);

  const hasContent = evidence.reason || evidence.source_sheet || evidence.source_range;

  if (!hasContent) return null;

  return (
    <div className="mt-2 rounded-control border border-border bg-canvas/60 p-3">
      {evidence.reason && (
        <p className="text-caption leading-relaxed text-secondary">
          <span className="font-medium text-ink">{T("biz.evidenceTitle")}：</span>
          {evidence.reason}
        </p>
      )}
      {(evidence.source_sheet || evidence.source_range) && (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-caption font-medium text-secondary transition-colors hover:text-ink">
            {T("biz.sourceDetail")}
          </summary>
          <div className="mt-1.5 space-y-1 text-caption text-secondary">
            {evidence.source_sheet && (
              <div className="flex gap-2">
                <span className="shrink-0 font-medium text-secondary">{T("biz.sheet")}</span>
                <span className="text-ink">{evidence.source_sheet}</span>
              </div>
            )}
            {evidence.source_range && (
              <div className="flex gap-2">
                <span className="shrink-0 font-medium text-secondary">{T("biz.range")}</span>
                <span className="font-mono text-ink">{evidence.source_range}</span>
              </div>
            )}
            {evidence.source_columns && evidence.source_columns.length > 0 && (
              <div className="flex gap-2">
                <span className="shrink-0 font-medium text-secondary">{T("biz.columns")}</span>
                <span className="text-ink">{evidence.source_columns.join(", ")}</span>
              </div>
            )}
            {evidence.source_rows && (
              <div className="flex gap-2">
                <span className="shrink-0 font-medium text-secondary">{T("biz.rows")}</span>
                <span className="text-ink">{evidence.source_rows}</span>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
