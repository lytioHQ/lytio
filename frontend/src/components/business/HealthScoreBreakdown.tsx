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

type TFunc = (key: string, params?: Record<string, string | number>) => string;

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

function DimensionUnavailableNote({ dim, T }: { dim: HealthScoreDimension; T: TFunc }) {
  const note = dim.note || "";
  if (note.startsWith("missing field:")) {
    const field = T(`healthscore.dimField.${dim.name}`) || dim.name;
    return (
      <>
        <p className="mt-0.5 text-caption text-secondary">{T("healthscore.missingField", { field })}</p>
        <p className="mt-0.5 text-caption text-secondary opacity-80">{T("healthscore.missingFieldHint")}</p>
      </>
    );
  }
  if (note.startsWith("need at least 2 months")) {
    return (
      <>
        <p className="mt-0.5 text-caption text-secondary">{T("healthscore.needTwoMonths")}</p>
        <p className="mt-0.5 text-caption text-secondary opacity-80">{T("healthscore.needTwoMonthsHint")}</p>
      </>
    );
  }
  return <p className="mt-0.5 text-caption text-secondary">{T("healthscore.unavailable")}</p>;
}

export default function HealthScoreBreakdown({ data, lang }: { data: HealthScoreData | null; lang: UILanguage }) {
  const T: TFunc = (key, params) => t(lang, key, params);
  if (!data) return null;

  const score = data.health_score;
  const available = score !== null && score !== undefined;
  const color = available ? levelColor(Number(score)) : "warning";
  const confidenceLabel = T(`healthscore.conf.${data.score_confidence}`) || data.score_confidence;
  const coveragePct = Math.round(Number(data.coverage) * 100);
  const levelLabel = T(`health.level.${data.health_level}`) || data.health_level || "—";

  return (
    <div className="rounded-card border border-border bg-surface p-6 md:p-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-ink">{T("healthscore.title")}</h3>
        <p className="text-caption text-secondary">{T("healthscore.subtitle")}</p>
      </div>

      {!available ? (
        <div className="mt-4 rounded-control border border-warning/30 bg-warning-soft p-4 text-sm text-warning">
          {T("healthscore.noData")}
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className={`flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[6px] border-current bg-white/60 ${COLORS[color]}`}>
              <span className="text-4xl font-semibold leading-none tabular-nums">{score}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-caption font-medium text-secondary">{T("healthscore.score")} / {T("healthscore.level")}</p>
              <p className="mt-1 text-h3 font-semibold text-ink">{levelLabel}</p>
              <p className="mt-2 text-sm text-ink/80">
                {T("healthscore.coverage")}: {coveragePct}% &middot; {T("healthscore.confidence")}: {confidenceLabel}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {DIM_ORDER.map((dimName) => {
              const dim = data.dimensions.find((d) => d.name === dimName);
              if (!dim) return null;
              const dimAvailable = dim.availability === "available" && dim.score !== null && dim.score !== undefined;
              const explain = T(`healthscore.dimExplain.${dimName}`);
              const hasExplain = explain !== `healthscore.dimExplain.${dimName}`;
              return (
                <div
                  key={dimName}
                  className={`flex flex-col gap-1 rounded-control border p-3 sm:flex-row sm:items-center sm:justify-between ${
                    dimAvailable ? "border-border bg-canvas" : "border-border bg-surface opacity-60"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{T(`healthscore.dim.${dimName}`)}</p>
                    {dimAvailable ? (
                      hasExplain ? (
                        <p className="mt-0.5 text-caption text-secondary">{explain}</p>
                      ) : (
                        <p className="mt-0.5 text-caption text-secondary">{T("healthscore.dimNote.computed")}</p>
                      )
                    ) : (
                      <DimensionUnavailableNote dim={dim} T={T} />
                    )}
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

          <details className="mt-4 rounded-control border border-border bg-canvas p-3">
            <summary className="cursor-pointer text-caption font-medium text-secondary">{T("healthscore.formulaDetail")}</summary>
            <div className="mt-2 space-y-1.5 text-caption text-secondary">
              {DIM_ORDER.map((dimName) => {
                const dim = data.dimensions.find((d) => d.name === dimName);
                if (!dim) return null;
                return (
                  <p key={dimName}>
                    {T(`healthscore.dim.${dimName}`)}: {dim.formula}
                    {dim.note ? ` · ${dim.note}` : ""}
                  </p>
                );
              })}
              <p className="mt-2">{T("healthscore.engineVersion")}: {data.engine_version}</p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
