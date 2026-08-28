import { t, UILanguage } from "@/lib/i18n";
import EvidenceCard, { EvidenceData } from "./EvidenceCard";

interface RiskData { title: string; description: string; severity: string; evidence?: EvidenceData | null; }

const SEV_COLORS: Record<string, string> = { critical: "border-danger/30 bg-danger/5", high: "border-warning/30 bg-warning/5", medium: "border-warning/20 bg-warning/5", low: "border-border bg-canvas" };
const SEV_DOTS: Record<string, string> = { critical: "bg-danger", high: "bg-warning", medium: "bg-warning", low: "bg-secondary" };
const SEV_KEYS: Record<string, string> = { critical: "biz.level.critical", high: "biz.level.high", medium: "biz.level.medium", low: "biz.level.low" };

export default function RiskList({ risks, lang }: { risks: RiskData[]; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  if (!risks.length) return null;
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <p className="text-h3 text-ink">{T("biz.risksTitle", { n: risks.length })}</p>
      </div>
      <div className="space-y-3">
        {risks.map((item, i) => (
          <div key={i} className={`rounded-card border ${SEV_COLORS[item.severity] || "border-border bg-surface"} p-5`}>
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEV_DOTS[item.severity] || "bg-secondary"}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2"><p className="text-[15px] font-semibold text-ink">{item.title}</p><span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium capitalize text-secondary">{SEV_KEYS[item.severity] ? T(SEV_KEYS[item.severity]) : item.severity}</span></div>
                <p className="mt-1 text-sm leading-relaxed text-secondary">{item.description}</p>
                {item.evidence && <EvidenceCard evidence={item.evidence} lang={lang} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
