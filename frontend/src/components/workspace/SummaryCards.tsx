interface SummaryCardData { label: string; value: string; sub?: string; }

interface Props { cards: SummaryCardData[]; }

export default function SummaryCards({ cards }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{c.label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{c.value}</p>
          {c.sub && <p className="mt-1 text-xs text-slate-400">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}