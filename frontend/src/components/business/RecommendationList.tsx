import { t, UILanguage } from "@/lib/i18n";
import EvidenceCard, { EvidenceData } from "./EvidenceCard";
import ImpactCard, { ImpactData } from "./ImpactCard";

interface RecData {
  title: string;
  description: string;
  priority: string;
  evidence?: EvidenceData | null;
  expected_impact?: ImpactData | null;
}

const PRI_COLORS: Record<string, string> = { high: "bg-danger", medium: "bg-warning", low: "bg-secondary" };

export default function RecommendationList({ recs, lang }: { recs: RecData[]; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  if (!recs.length) return null;
  return (
    <div>
      <p className="mb-4 text-h3 text-ink">{T("biz.recsTitle", { n: recs.length })}</p>
      <div className="space-y-3">
        {recs.map((item, i) => (
          <div key={i} className="rounded-card border border-border bg-surface p-5">
            <div className="flex gap-4">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-control ${PRI_COLORS[item.priority] || "bg-ink"} text-xs font-bold text-white`}>{i + 1}</span>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-ink">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-secondary">{item.description}</p>
                {item.expected_impact && <ImpactCard impact={item.expected_impact} lang={lang} />}
                {item.evidence && <EvidenceCard evidence={item.evidence} lang={lang} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}