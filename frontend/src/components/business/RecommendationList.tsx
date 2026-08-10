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

const PRI_COLORS: Record<string, string> = { high: "bg-blue-600", medium: "bg-slate-600", low: "bg-slate-400" };

export default function RecommendationList({ recs, lang }: { recs: RecData[]; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  if (!recs.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">{T("biz.recsTitle", { n: recs.length })}</p>
      <div className="space-y-3">
        {recs.map((item, i) => (
          <div key={i} className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex gap-4">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${PRI_COLORS[item.priority] || "bg-slate-600"} text-xs font-bold text-white`}>{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.description}</p>
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