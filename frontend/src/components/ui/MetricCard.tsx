import type { ReactNode } from "react";
import Card, { type CardVariant } from "./Card";
import { metricValueClasses } from "@/lib/formatNumber";

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
        <p className="truncate text-caption text-secondary" title={label}>
          {label}
        </p>
        <div className="mt-2 flex min-w-0 items-baseline gap-2">
          <span
            className={metricValueClasses}
            title={typeof value === "string" ? value : undefined}
          >
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
        <p className="mt-2 truncate text-caption text-secondary" title={description}>
          {description}
        </p>
      ) : null}
    </Card>
  );
}
