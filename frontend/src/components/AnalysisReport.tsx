import { UILanguage } from "@/lib/i18n";
import BusinessHealthCard from "@/components/business/BusinessHealthCard";
import MetricGrid from "@/components/business/MetricGrid";
import InsightList from "@/components/business/InsightList";
import RiskList from "@/components/business/RiskList";
import RecommendationList from "@/components/business/RecommendationList";
import RecommendedActionCards from "@/components/RecommendedActionCards";
import ExecutiveSummaryCard from "@/components/business/ExecutiveSummaryCard";

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

function KPICard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
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

  // V2 structured data
  if (result && !isLegacy) {
    const bh = result.business_health;
    const es = result.executive_summary;
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-lg">
          <div className="px-8 py-10">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{plugin === "sales" ? t("report.salesIntel") : `${plugin} Analysis`}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">{sheet}</h1>
            <p className="mt-1 text-sm text-slate-400">{dateStr}</p>
          </div>
        </div>

        {hasMultiLang && <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3"><p className="text-xs text-amber-700">{t("report.multiLang")}</p></div>}

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

        {/* Footer */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{t("report.footer.completed")}</span>
            {latency != null && <span>{t("report.footer.analysisTime")}: {formatDuration(latency)}</span>}
            <span>{t("report.footer.generated")}: {dateStr} {timeStr}</span>
          </div>
        </div>
      </div>
    );
  }

  // Legacy format
  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-lg">
        <div className="px-8 py-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{plugin === "sales" ? t("report.salesIntel") : `${plugin} Analysis`}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">{sheet}</h1>
          <p className="mt-1 text-sm text-slate-400">{dateStr}</p>
        </div>
      </div>

      {isLegacy && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
          <p className="text-xs text-amber-700">This report uses the legacy format. Re-run analysis for structured data.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label={t("report.kpi.findings")} value={highlights.length} />
        <KPICard label={t("report.kpi.risks")} value={warnings.length} />
        <KPICard label={t("report.kpi.suggestions")} value={recs.length} />
        <KPICard label={t("report.kpi.rows")} value="-" />
      </div>

      <ExecutiveSummaryCard content={summary} lang={lang} />

      <InsightList insights={highlights.map((h) => ({ title: h, description: "", confidence: "medium" }))} lang={lang} />
      <RiskList risks={warnings.map((w) => ({ title: w, description: "", severity: "medium" }))} lang={lang} />
      <RecommendationList recs={recs.map((r) => ({ title: r, description: "", priority: "medium" }))} lang={lang} />

      <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-6 py-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{t("report.footer.completed")}</span>
          {latency != null && <span>{t("report.footer.analysisTime")}: {formatDuration(latency)}</span>}
          <span>{t("report.footer.generated")}: {dateStr} {timeStr}</span>
        </div>
      </div>
    </div>
  );
}