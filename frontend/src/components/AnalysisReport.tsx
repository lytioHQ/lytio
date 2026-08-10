import { UILanguage } from "@/lib/i18n";
import BusinessHealthCard from "@/components/business/BusinessHealthCard";
import MetricGrid from "@/components/business/MetricGrid";
import InsightList from "@/components/business/InsightList";
import RiskList from "@/components/business/RiskList";
import RecommendationList from "@/components/business/RecommendationList";
import RecommendedActionCards from "@/components/RecommendedActionCards";
import ExecutiveSummaryCard from "@/components/business/ExecutiveSummaryCard";
import MetricCard from "@/components/ui/MetricCard";

interface ResultData {
  business_health?: { score: number; level: string; summary: string } | null;
  metrics?: { name: string; value: string; trend: string }[];
  insights?: { title: string; description: string; confidence: string }[];
  risks?: { title: string; description: string; severity: string }[];
  recommendations?: { title: string; description: string; priority: string }[];
  executive_summary?: { content: string } | null;
}

interface AnalysisReportProps {
  plugin: string;
  sheet: string;
  summary: string;
  highlights: string[];
  warnings: string[];
  recommendations: string[];
  metadata: Record<string, unknown>;
  lang: UILanguage;
  t: (key: string, params?: Record<string, string | number>) => string;
  result?: ResultData | null;
  isLegacy?: boolean;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const LOCALE_MAP: Record<UILanguage, string> = { zh: "zh-CN", en: "en-US", ja: "ja-JP", de: "de-DE" };

export default function AnalysisReport({
  plugin, sheet, summary, highlights, warnings, recommendations: recs, metadata, lang, t, result, isLegacy,
}: AnalysisReportProps) {
  const now = new Date();
  const locale = LOCALE_MAP[lang] || "zh-CN";
  const dateStr = now.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const latency = typeof metadata.latency_ms === "number" ? metadata.latency_ms : null;
  const hasMultiLang = !!metadata.multi_language;

  const reportHeader = (
    <div className="overflow-hidden rounded-card border border-border bg-ink">
      <div className="px-6 py-8 md:px-8 md:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
          {plugin === "sales" ? t("report.salesIntel") : t("report.pluginAnalysis", { plugin })}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">{sheet}</h1>
        <p className="mt-1 text-sm text-white/60">{dateStr}</p>
      </div>
    </div>
  );

  const footer = (
    <div className="rounded-card border border-border bg-canvas px-6 py-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-secondary">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" />{t("report.footer.completed")}</span>
        {latency != null && <span>{t("report.footer.analysisTime")}: {formatDuration(latency)}</span>}
        <span>{t("report.footer.generated")}: {dateStr} {timeStr}</span>
      </div>
    </div>
  );

  // V2 structured data
  if (result && !isLegacy) {
    const bh = result.business_health;
    const es = result.executive_summary;
    return (
      <div className="space-y-8">
        {reportHeader}

        {hasMultiLang && (
          <div className="rounded-control border border-warning/20 bg-warning/5 px-5 py-3">
            <p className="text-sm text-warning">{t("report.multiLang")}</p>
          </div>
        )}

        {/* Executive Summary */}
        {es && <ExecutiveSummaryCard content={es.content} lang={lang} />}

        {/* Business Health */}
        {bh && <BusinessHealthCard data={bh} lang={lang} />}

        {/* Key Metrics */}
        {result.metrics && result.metrics.length > 0 && <MetricGrid metrics={result.metrics} lang={lang} />}

        {/* Insights */}
        <InsightList insights={result.insights || []} lang={lang} />

        {/* Risks */}
        <RiskList risks={result.risks || []} lang={lang} />

        {/* Recommended Actions */}
        <RecommendedActionCards lang={lang} recs={result.recommendations || []} summary={es?.content} />

        {footer}
      </div>
    );
  }

  // Legacy format
  return (
    <div className="space-y-8">
      {reportHeader}

      {isLegacy && (
        <div className="rounded-control border border-warning/20 bg-warning/5 px-5 py-3">
          <p className="text-sm text-warning">{t("report.legacyFormat")}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label={t("report.kpi.findings")} value={highlights.length} />
        <MetricCard label={t("report.kpi.risks")} value={warnings.length} />
        <MetricCard label={t("report.kpi.suggestions")} value={recs.length} />
        <MetricCard label={t("report.kpi.rows")} value="-" />
      </div>

      <ExecutiveSummaryCard content={summary} lang={lang} />

      <InsightList insights={highlights.map((h) => ({ title: h, description: "", confidence: "medium" }))} lang={lang} />
      <RiskList risks={warnings.map((w) => ({ title: w, description: "", severity: "medium" }))} lang={lang} />
      <RecommendationList recs={recs.map((r) => ({ title: r, description: "", priority: "medium" }))} lang={lang} />

      {footer}
    </div>
  );
}