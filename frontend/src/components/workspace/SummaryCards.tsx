import MetricCard from "@/components/ui/MetricCard";

interface SummaryCardData { label: string; value: string; sub?: string; }

interface Props { cards: SummaryCardData[]; }

export default function SummaryCards({ cards }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c, i) => (
        <MetricCard key={i} label={c.label} value={c.value} description={c.sub} />
      ))}
    </div>
  );
}