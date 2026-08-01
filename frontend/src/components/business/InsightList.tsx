import EvidenceCard, { EvidenceData } from "./EvidenceCard";

interface InsightData { title: string; description: string; confidence: string; evidence?: EvidenceData | null; }

const CONF_COLORS: Record<string, string> = { high: "bg-emerald-500", medium: "bg-amber-500", low: "bg-red-400" };

export default function InsightList({ insights }: { insights: InsightData[] }) {
  if (!insights.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Key Findings ({insights.length})</p>
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((item, i) => (
          <div key={i} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${CONF_COLORS[item.confidence] || "bg-slate-400"}`} title={item.confidence} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.description}</p>
                {item.evidence && <EvidenceCard evidence={item.evidence} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}