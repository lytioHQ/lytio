import { t, UILanguage } from "@/lib/i18n";

interface HealthData { score: number; level: string; summary: string; }

export default function BusinessHealthCard({ data, lang }: { data: HealthData; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  const color = data.score >= 80 ? "success" : data.score >= 60 ? "accent" : data.score >= 40 ? "warning" : "danger";
  const colors: Record<string, string> = {
    success: "border-success/30 bg-success/5 text-success",
    accent: "border-accent/30 bg-accent/5 text-accent",
    warning: "border-warning/30 bg-warning/5 text-warning",
    danger: "border-danger/30 bg-danger/5 text-danger",
  };
  return (
    <div className={`rounded-card border ${colors[color]} p-6 md:p-8`}>
      <p className="text-caption font-medium text-secondary">{T("landing.diff.businessHealth")}</p>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="text-5xl font-semibold leading-none tabular-nums">{data.score}</span>
        <span className="text-base font-medium">{data.level}</span>
      </div>
      <p className="mt-3 max-w-[680px] text-body leading-relaxed text-ink/80">{data.summary}</p>
    </div>
  );
}