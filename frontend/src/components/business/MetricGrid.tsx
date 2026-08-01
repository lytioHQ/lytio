interface MetricData { name: string; value: string; trend: string; }

const TREND_ICONS: Record<string, string> = { up: "\u2191", down: "\u2193", stable: "\u2192" };
const TREND_COLORS: Record<string, string> = { up: "text-emerald-600", down: "text-red-500", stable: "text-slate-400" };

export default function MetricGrid({ metrics }: { metrics: MetricData[] }) {
  if (!metrics.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Key Metrics</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] text-slate-400">{m.name}</p>
            <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{m.value}</p>
            <span className={`text-xs font-medium ${TREND_COLORS[m.trend] || "text-slate-400"}`}>
              {TREND_ICONS[m.trend] || ""} {m.trend}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}