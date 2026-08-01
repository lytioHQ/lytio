import EvidenceCard, { EvidenceData } from "./EvidenceCard";

interface RiskData { title: string; description: string; severity: string; evidence?: EvidenceData | null; }

const SEV_COLORS: Record<string, string> = { critical: "border-red-300 bg-red-50", high: "border-orange-300 bg-orange-50", medium: "border-amber-200 bg-amber-50", low: "border-slate-200 bg-slate-50" };
const SEV_DOTS: Record<string, string> = { critical: "bg-red-500", high: "bg-orange-500", medium: "bg-amber-500", low: "bg-slate-400" };

export default function RiskList({ risks }: { risks: RiskData[] }) {
  if (!risks.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Risks ({risks.length})</p>
      <div className="space-y-3">
        {risks.map((item, i) => (
          <div key={i} className={`rounded-xl border ${SEV_COLORS[item.severity] || "border-slate-200"} p-5`}>
            <div className="flex items-start gap-3">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${SEV_DOTS[item.severity] || "bg-slate-400"}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-800">{item.title}</p><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 capitalize">{item.severity}</span></div>
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