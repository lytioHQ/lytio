import type { ReactNode } from "react";
import Card, { type CardVariant } from "./Card";

export type MetricTrend = "positive" | "negative" | "neutral";

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  description?: string;
  trend?: MetricTrend;
  variant?: CardVariant;
  className?: string;
}

const trendClasses: Record<MetricTrend, string> = {
  positive: "text-success",
  negative: "text-danger",
  neutral: "text-secondary",
};

const trendGlyphs: Record<MetricTrend, string> = {
  positive: "\u2191",
  negative: "\u2193",
  neutral: "\u2192",
};

export default function MetricCard({
  label,
  value,
  description,
  trend,
  variant,
  className = "",
}: MetricCardProps) {
  return (
    <Card padding="md" variant={variant} className={className}>
      <div className="min-w-0">
        <p className="text-caption text-secondary">{label}</p>
        <div className="mt-2 flex min-w-0 items-baseline gap-2">
          <span className="max-w-full text-[clamp(1.125rem,4.2vw,2rem)] font-semibold leading-tight text-ink tabular-nums">
            {value}
          </span>
          {trend ? (
            <span
              aria-hidden
              className={`shrink-0 text-sm font-medium ${trendClasses[trend]}`}
            >
              {trendGlyphs[trend]}
            </span>
          ) : null}
        </div>
      </div>
      {description ? (
        <p className="mt-2 text-caption text-secondary">{description}</p>
      ) : null}
    </Card>
  );
}
