import { t, UILanguage } from "@/lib/i18n";
import EvidenceCard, { EvidenceData } from "./EvidenceCard";

interface InsightData { title: string; description: string; confidence: string; evidence?: EvidenceData | null; }

const CONF_COLORS: Record<string, string> = { high: "bg-success", medium: "bg-warning", low: "bg-danger" };
const CONF_KEYS: Record<string, string> = { high: "biz.level.high", medium: "biz.level.medium", low: "biz.level.low" };

export default function InsightList({ insights, lang }: { insights: InsightData[]; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  if (!insights.length) return null;
  return (
    <div>
      <p className="mb-4 text-h3 text-ink">{T("biz.findingsTitle", { n: insights.length })}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((item, i) => (
          <div key={i} className="rounded-card border border-border bg-surface p-5">
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${CONF_COLORS[item.confidence] || "bg-secondary"}`} title={CONF_KEYS[item.confidence] ? T(CONF_KEYS[item.confidence]) : item.confidence} />
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-ink">{item.title}</p>
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