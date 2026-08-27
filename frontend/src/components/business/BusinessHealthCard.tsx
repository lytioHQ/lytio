import { t, UILanguage } from "@/lib/i18n";
import ProvenanceBadge from "./ProvenanceBadge";

interface HealthData { score: number; level: string; summary: string; }

export default function BusinessHealthCard({ data, lang }: { data: HealthData; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  const color = data.score >= 80 ? "success" : data.score >= 60 ? "accent" : data.score >= 40 ? "warning" : "danger";
  const colors: Record<string, string> = {
    success: "border-success/30 bg-success-soft text-success",
    accent: "border-accent/30 bg-accent-soft text-accent",
    warning: "border-warning/30 bg-warning-soft text-warning",
    danger: "border-danger/30 bg-danger-soft text-danger",
  };
  return (
    <div className={`rounded-card border ${colors[color]} p-6 md:p-8`}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[6px] border-current bg-white/60">
          <span className="text-4xl font-semibold leading-none tabular-nums">{data.score}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium text-secondary">{T("landing.diff.businessHealth")}</p>
          <p className="mt-1 text-h3 font-semibold">{T(`health.level.${data.level}`) ?? data.level}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ProvenanceBadge variant="computed" lang={lang} />
          </div>
          <div className="mt-2 flex flex-wrap items-start gap-2">
            <ProvenanceBadge variant="aiExplain" lang={lang} className="mt-1" />
          <p className="mt-2 max-w-[680px] text-body leading-relaxed text-ink/80">{data.summary}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
