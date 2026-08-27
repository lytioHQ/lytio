import { t, UILanguage } from "@/lib/i18n";
import EvidenceCard, { EvidenceData } from "./EvidenceCard";
import ImpactCard, { ImpactData } from "./ImpactCard";
import ProvenanceBadge from "./ProvenanceBadge";

interface RecData {
  title: string;
  description: string;
  priority: string;
  evidence?: EvidenceData | null;
  expected_impact?: ImpactData | null;
}

const PRI_COLORS: Record<string, string> = { high: "bg-danger", medium: "bg-warning", low: "bg-secondary" };
const PRI_ACCENT: Record<string, string> = { high: "border-l-danger", medium: "border-l-warning", low: "border-l-secondary" };

export default function RecommendationList({ recs, lang }: { recs: RecData[]; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  if (!recs.length) return null;
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <p className="text-h3 text-ink">{T("biz.recsTitle", { n: recs.length })}</p>
        <ProvenanceBadge variant="aiExplain" lang={lang} />
      </div>
      <div className="space-y-3">
        {recs.map((item, i) => (
          <div key={i} className={`rounded-card border border-border border-l-4 bg-surface p-5 ${PRI_ACCENT[item.priority] || "border-l-ink"}`}>
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
