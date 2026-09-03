import { t, UILanguage } from "@/lib/i18n";
import { localizeReportMetric } from "@/lib/reportMetricDisplay";
import { metricValueClasses } from "@/lib/formatNumber";

interface MetricData { name: string; value: string; trend: string; fullValue?: string; }

const TREND_ICONS: Record<string, string> = { up: "\u2191", down: "\u2193", stable: "\u2192" };
const TREND_COLORS: Record<string, string> = { up: "text-success", down: "text-danger", stable: "text-secondary" };
const TREND_BG: Record<string, string> = { up: "border-success/30 bg-success-soft", down: "border-danger/30 bg-danger-soft", stable: "border-border bg-surface" };
const TREND_KEYS: Record<string, string> = { up: "biz.trend.up", down: "biz.trend.down", stable: "biz.trend.stable" };

export default function MetricGrid({ metrics, lang }: { metrics: MetricData[]; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  const translate = (key: string) => t(lang, key);
  if (!metrics.length) return null;
  return (
    <div>
      <p className="mb-4 text-h3 text-ink">{T("biz.keyMetrics")}</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m, i) => {
          const display = localizeReportMetric(m, lang, translate);
          return (
            <div key={i} className={`min-w-0 rounded-control border p-4 ${TREND_BG[m.trend] || "border-border bg-surface"}`}>
              <p className="truncate text-caption text-secondary" title={display.name}>{display.name}</p>
              <p
                className={`mt-1 ${metricValueClasses}`}
                title={display.fullValue}
              >
                {display.value}
              </p>
              <span className={`text-sm font-medium ${TREND_COLORS[m.trend] || "text-secondary"}`}>
                {TREND_ICONS[m.trend] || ""} {TREND_KEYS[m.trend] ? T(TREND_KEYS[m.trend]) : m.trend}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
