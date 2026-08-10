import { t, UILanguage } from "@/lib/i18n";

interface HealthData { score: number; level: string; summary: string; }

export default function BusinessHealthCard({ data, lang }: { data: HealthData; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  const color = data.score >= 80 ? "emerald" : data.score >= 60 ? "blue" : data.score >= 40 ? "amber" : "red";
  const colors: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-xl border ${colors[color]} p-5`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{T("landing.diff.businessHealth")}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums">{data.score}</span>
        <span className="text-sm font-medium opacity-70">{data.level}</span>
      </div>
      <p className="mt-2 text-xs opacity-80">{data.summary}</p>
    </div>
  );
}