interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function SectionCard({ title, subtitle, children }: Props) {
  return (
    <section className="rounded-card border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-5">
        <h3 className="text-h3 text-ink">{title}</h3>
        {subtitle && <p className="mt-1 text-caption leading-relaxed text-secondary">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}