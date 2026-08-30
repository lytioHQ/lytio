import type { ReactNode } from "react";
import { t, UILanguage } from "@/lib/i18n";
import Card from "@/components/ui/Card";

interface FocusedCardData {
  title: string;
  finding: string;
  evidence: string | string[];
  explanation: string;
  action: string;
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-l-2 border-accent/30 pl-4 sm:pl-5">
      <h3 className="text-sm font-semibold text-ink">{label}</h3>
      <div className="mt-1.5 space-y-2 text-[15px] leading-relaxed text-secondary">
        {children}
      </div>
    </section>
  );
}

export default function FocusedInsightCard({ data, lang }: { data: FocusedCardData; lang: UILanguage }) {
  const T = (key: string) => t(lang, key);
  if (!data?.title) return null;

  const evidenceItems = Array.isArray(data.evidence)
    ? data.evidence.filter(Boolean)
    : data.evidence
      ? [data.evidence]
      : [];

  return (
    <Card className="overflow-visible">
      <p className="text-sm font-medium text-accent">{T("focus.card.label")}</p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink md:text-2xl">{data.title}</h2>

      <div className="mt-6 space-y-6">
        <Section label={T("focus.card.finding")}>
          {data.finding ? (
            <p className="whitespace-pre-line">{data.finding}</p>
          ) : (
            <p>{T("focus.card.missing")}</p>
          )}
        </Section>

        <Section label={T("focus.card.evidence")}>
          {evidenceItems.length > 0 ? (
            <ul className="list-disc space-y-2 pl-5">
              {evidenceItems.map((item, index) => (
                <li key={index} className="whitespace-pre-line">{item}</li>
              ))}
            </ul>
          ) : (
            <p>{T("focus.card.missing")}</p>
          )}
        </Section>

        <Section label={T("focus.card.explanation")}>
          {data.explanation ? (
            <p className="whitespace-pre-line">{data.explanation}</p>
          ) : (
            <p>{T("focus.card.missing")}</p>
          )}
        </Section>

        <Section label={T("focus.card.action")}>
          {data.action ? (
            <p className="whitespace-pre-line">{data.action}</p>
          ) : (
            <p>{T("focus.card.missing")}</p>
          )}
        </Section>
      </div>
    </Card>
  );
}
