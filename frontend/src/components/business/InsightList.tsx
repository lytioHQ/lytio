import { t, UILanguage } from "@/lib/i18n";
import EvidenceCard, { EvidenceData } from "./EvidenceCard";

interface InsightData { title: string; description: string; confidence: string; evidence?: EvidenceData | null; }

const CONF_COLORS: Record<string, string> = { high: "bg-success", medium: "bg-warning", low: "bg-danger" };
const CONF_BG: Record<string, string> = { high: "bg-success-soft text-success", medium: "bg-warning-soft text-warning", low: "bg-danger-soft text-danger" };
const CONF_KEYS: Record<string, string> = { high: "biz.level.high", medium: "biz.level.medium", low: "biz.level.low" };

export default function InsightList({ insights, lang }: { insights: InsightData[]; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  if (!insights.length) return null;
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <p className="text-h3 text-ink">{T("biz.findingsTitle", { n: insights.length })}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((item, i) => (
          <div key={i} className="rounded-card border border-border bg-surface p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${CONF_BG[item.confidence] || "bg-canvas text-secondary"}`} title={CONF_KEYS[item.confidence] ? T(CONF_KEYS[item.confidence]) : item.confidence}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
                  <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
                </svg>
              </span>
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
