import Card from "@/components/ui/Card";

interface Props { title: string; desc: string; }

export default function ActionPlaceholderCard({ title, desc }: Props) {
  return (
    <Card variant="muted" className="flex h-full flex-col gap-2 p-5">
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      <p className="text-sm leading-relaxed text-secondary">{desc}</p>
    </Card>
  );
}