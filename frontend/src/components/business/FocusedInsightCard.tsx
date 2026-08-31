import type { ReactNode } from "react";
import { t, UILanguage } from "@/lib/i18n";
import Card from "@/components/ui/Card";
import type { FocusedInsightDisplay } from "@/lib/focusedInsightDisplay";

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

export default function FocusedInsightCard({ data, lang }: { data: FocusedInsightDisplay; lang: UILanguage }) {
  const T = (key: string) => t(lang, key);
  if (!data) return null;

  const headline = data.headline || T("focus.card.label");

  return (
    <Card className="overflow-visible">
      <p className="text-sm font-medium text-accent">{T("focus.card.label")}</p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink md:text-2xl">{headline}</h2>

      <div className="mt-6 space-y-6">
        <Section label={T("focus.card.finding")}>
          {data.coreFinding ? (
            <p className="whitespace-pre-line">{data.coreFinding}</p>
          ) : (
            <p>{T("focus.card.missing")}</p>
          )}
        </Section>

        <Section label={T("focus.card.evidence")}>
          {data.evidencePoints.length > 0 ? (
            <ul className="list-disc space-y-2 pl-5">
              {data.evidencePoints.map((item, index) => (
                <li key={index} className="whitespace-pre-line">{item}</li>
              ))}
            </ul>
          ) : (
            <p>{T("focus.card.missing")}</p>
          )}
        </Section>

        <Section label={T("focus.card.explanation")}>
          {data.causeAnalysis ? (
            <p className="whitespace-pre-line">{data.causeAnalysis}</p>
          ) : (
            <p>{T("focus.card.missing")}</p>
          )}
        </Section>

        <Section label={T("focus.card.action")}>
          {data.actionItems.length > 0 ? (
            <ul className="list-disc space-y-2 pl-5">
              {data.actionItems.map((item, index) => (
                <li key={index} className="whitespace-pre-line">{item}</li>
              ))}
            </ul>
          ) : (
            <p>{T("focus.card.missing")}</p>
          )}
        </Section>
      </div>
    </Card>
  );
}
