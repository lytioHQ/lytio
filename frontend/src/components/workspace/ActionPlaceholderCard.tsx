interface Props { title: string; desc: string; }

export default function ActionPlaceholderCard({ title, desc }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center">
      <p className="text-sm font-medium text-slate-400">{title}</p>
      <p className="mt-1 text-xs text-slate-300">{desc}</p>
    </div>
  );
}