import { t, UILanguage } from "@/lib/i18n";

export interface HealthScoreDimension {
  name: string;
  score: number | null;
  weight: number;
  weighted_score: number | null;
  formula: string;
  evidence: Record<string, unknown>;
  source_metrics: string[];
  availability: string;
  confidence: string;
  note: string;
}

export interface HealthScoreData {
  health_score: number | null;
  health_level: string | null;
  coverage: number;
  score_confidence: string;
  engine_version: string;
  dimensions: HealthScoreDimension[];
}

function levelColor(score: number): string {
  if (score >= 80) return "success";
  if (score >= 60) return "accent";
  if (score >= 40) return "warning";
  return "danger";
}

const COLORS: Record<string, string> = {
  success: "border-success/30 bg-success-soft text-success",
  accent: "border-accent/30 bg-accent-soft text-accent",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
};

const DIM_ORDER = [
  "pipeline_health",
  "conversion_stability",
  "revenue_quality",
  "customer_risk",
  "productivity",
] as const;

export default function HealthScoreBreakdown({ data, lang }: { data: HealthScoreData | null; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  if (!data) return null;

  const score = data.health_score;
  const available = score !== null && score !== undefined;
  const color = available ? levelColor(Number(score)) : "warning";
  const confidenceLabel = T(`healthscore.conf.${data.score_confidence}`) || data.score_confidence;
  const coveragePct = Math.round(Number(data.coverage) * 100);

  return (
    <div className="rounded-card border border-border bg-surface p-6 md:p-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-ink">{T("healthscore.title")}</h3>
        <p className="text-caption text-secondary">{T("healthscore.subtitle")}</p>
      </div>

      {!available ? (
        <div className="mt-4 rounded-control border border-warning/30 bg-warning-soft p-4 text-sm text-warning">
          {T("healthscore.noData")}
          <span className="mt-1 block text-caption opacity-80">{T("healthscore.engineVersion")}: {data.engine_version}</span>
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className={`flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[6px] border-current bg-white/60 ${COLORS[color]}`}>
              <span className="text-4xl font-semibold leading-none tabular-nums">{score}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-caption font-medium text-secondary">{T("healthscore.score")} / {T("healthscore.level")}</p>
              <p className="mt-1 text-h3 font-semibold text-ink">{data.health_level || "—"}</p>
              <p className="mt-2 text-sm text-ink/80">
                {T("healthscore.coverage")}: {coveragePct}% &middot; {T("healthscore.confidence")}: {confidenceLabel} &middot; {T("healthscore.engineVersion")}: {data.engine_version}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {DIM_ORDER.map((dimName) => {
              const dim = data.dimensions.find((d) => d.name === dimName);
              if (!dim) return null;
              const dimAvailable = dim.availability === "available" && dim.score !== null && dim.score !== undefined;
              return (
                <div
                  key={dimName}
                  className={`flex flex-col gap-1 rounded-control border p-3 sm:flex-row sm:items-center sm:justify-between ${
                    dimAvailable ? "border-border bg-canvas" : "border-border bg-surface opacity-60"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{T(`healthscore.dim.${dimName}`)}</p>
                    <p className="mt-0.5 text-caption text-secondary">
                      {dimAvailable ? dim.formula : (dim.note || T("healthscore.unavailable"))}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {dim.weighted_score !== null && dim.weighted_score !== undefined && (
                      <span className="text-caption text-secondary">{T("healthscore.weight")}: {Math.round(dim.weight * 100)}%</span>
                    )}
                    <span className={`text-lg font-semibold tabular-nums ${dimAvailable ? "text-ink" : "text-secondary"}`}>
                      {dimAvailable ? dim.score : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
