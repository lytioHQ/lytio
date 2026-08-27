import { t, UILanguage } from "@/lib/i18n";

/**
 * M2.14.3 Phase 1 (P2): visual separation of system-computed facts from
 * AI-assisted explanation / AI estimates.
 *
 * - computed   -> data calculated from the Excel by code (metrics, health
 *                 score, before/after comparison, execution rates)
 * - aiExplain  -> text produced by AI to help understand the numbers
 * - aiEstimate -> forward-looking AI estimates (recommendation impact);
 *                 never to be confused with computed facts
 */
export type ProvenanceVariant = "computed" | "aiExplain" | "aiEstimate";

const STYLES: Record<ProvenanceVariant, string> = {
  computed: "border-success/25 bg-success-soft text-success",
  aiExplain: "border-accent/25 bg-accent-soft text-accent",
  aiEstimate: "border-warning/30 bg-warning-soft text-warning",
};

export function ProvenanceBadge({
  variant,
  lang,
  className = "",
}: {
  variant: ProvenanceVariant;
  lang: UILanguage;
  className?: string;
}) {
  const T = (key: string) => t(lang, key);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STYLES[variant]} ${className}`}
    >
      <span aria-hidden>{"\u25cf"}</span>
      {T(`badge.${variant}`)}
    </span>
  );
}

export default ProvenanceBadge;
