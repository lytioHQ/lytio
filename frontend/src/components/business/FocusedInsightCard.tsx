import { t, UILanguage } from "@/lib/i18n";
import Card from "@/components/ui/Card";

interface FocusedCardData {
  title: string;
  finding: string;
  evidence: string;
  explanation: string;
  action: string;
  raw_output?: string;
}

/**
 * M2.14.4: single focused deep-dive card rendered from a focused_insight run.
 * The card deliberately shows finding/evidence/explanation/action instead of
 * duplicating the full report.
 */
export default function FocusedInsightCard({ data, lang }: { data: FocusedCardData; lang: UILanguage }) {
  const T = (key: string) => t(lang, key);
  if (!data || !data.title) return null;

  const sections: Array<{ key: string; value: string }> = [
    { key: "focus.card.finding", value: data.finding },
    { key: "focus.card.evidence", value: data.evidence },
    { key: "focus.card.explanation", value: data.explanation },
    { key: "focus.card.action", value: data.action },
  ];

  return (
    <Card>
      <p className="mb-1 text-caption font-medium uppercase tracking-wide text-accent">{T("focus.card.label")}</p>
      <h2 className="text-h3 text-ink">{data.title}</h2>
      <div className="mt-5 space-y-5">
        {sections.map((s) => (
          <div key={s.key} className="border-l-2 border-border pl-4">
            <p className="text-sm font-semibold text-ink">{T(s.key)}</p>
            {s.value ? (
              <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-secondary">{s.value}</p>
            ) : (
              <p className="mt-1 text-sm text-secondary">{T("focus.card.missing")}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
