"use client";

import Link from "next/link";
import { DEMO_DATA } from "@/lib/demoData";
import BusinessValue from "@/components/business/BusinessValue";
import BusinessHealthCard from "@/components/business/BusinessHealthCard";
import ExecutiveSummaryCard from "@/components/business/ExecutiveSummaryCard";
import MetricGrid from "@/components/business/MetricGrid";
import InsightList from "@/components/business/InsightList";
import RiskList from "@/components/business/RiskList";
import RecommendationList from "@/components/business/RecommendationList";
import { Card, MetricCard } from "@/components/ui";
import { buttonBaseClasses, buttonVariantClasses } from "@/components/ui/Button";
import { useUiLang } from "@/lib/useUiLang";
import { t, localeForLang } from "@/lib/i18n";

function formatDate(d: string, locale: string): string {
  return new Date(d).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PRIMARY_LINK = "${buttonBaseClasses} ${buttonVariantClasses.primary}";

export default function DemoPage() {
  const { uiLang } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);
  const d = DEMO_DATA;
  const highRiskCount = d.risks.filter((r) => r.severity === "high").length;
  const highPriorityCount = d.recommendations.filter((r) => r.priority === "high").length;

  return (
    <main className="min-h-screen bg-canvas">
      {/* Demo Banner */}
      <div className="border-b border-warning/20 bg-warning-soft px-4 py-3 text-center md:px-6">
        <p className="text-sm leading-relaxed text-ink">
          &#x1f3ac; {T("demo.banner")}{" "}
          <Link href="/register" className="font-medium text-accent underline-offset-2 hover:underline">
            {T("demo.startRealAnalysis")}
          </Link>
        </p>
      </div>

      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">{d.project.title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-sm capitalize text-secondary">{d.project.industry}</span>
              <span className="text-border">&middot;</span>
              <span className="text-sm text-secondary">{T("demo.projectLang")}</span>
              <span className="text-border">&middot;</span>
              <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">{T("demo.demoBadge")}</span>
              <span className="text-border">&middot;</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                {T("demo.readOnly")}
              </span>
            </div>
          </div>
          <Link href="/register" className={`${PRIMARY_LINK} shrink-0`}>
            {T("demo.startCta")}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 md:px-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label={T("demo.summaryHealth")} value={`${d.business_health.score}`} description={d.business_health.level} />
          <MetricCard label={T("demo.summaryFindings")} value={`${d.insights.length}`} description={T("demo.summaryInsightsSub")} />
          <MetricCard label={T("demo.summaryRisks")} value={`${d.risks.length}`} description={T("demo.highSeverity", { n: highRiskCount })} />
          <MetricCard label={T("demo.summaryRecs")} value={`${d.recommendations.length}`} description={T("demo.highPriority", { n: highPriorityCount })} />
        </div>

        {/* Business Value */}
        <BusinessValue
          currentHealth={d.business_health.score}
          currentHealthLevel={d.business_health.level}
          recommendations={d.recommendations}
          risks={d.risks}
          hasImpact={d.recommendations.some((r) => r.expected_impact)}
          lang={uiLang}
        />

        {/* Business Health */}
        <BusinessHealthCard data={d.business_health} lang={uiLang} />

        {/* Executive Summary */}
        <ExecutiveSummaryCard content={d.executive_summary.content} lang={uiLang} />

        {/* Key Metrics */}
        <MetricGrid metrics={d.metrics} lang={uiLang} />

        {/* Key Insights */}
        <InsightList insights={d.insights} lang={uiLang} />

        {/* Risks */}
        <RiskList risks={d.risks} lang={uiLang} />

        {/* Recommendations */}
        <RecommendationList recs={d.recommendations} lang={uiLang} />

        {/* Timeline */}
        <div>
          <p className="mb-4 text-h3 text-ink">{T("demo.timelineTitle")}</p>
          <div className="space-y-3">
            {d.timeline.map((item) => {
              const score = item.business_health_score;
              const color =
                score >= 90
                  ? "border-l-success bg-success-soft"
                  : score >= 75
                    ? "border-l-accent bg-accent-soft"
                    : score >= 60
                      ? "border-l-warning bg-warning-soft"
                      : "border-l-danger bg-danger-soft";
              return (
                <div key={item.id} className={`rounded-card border border-border border-l-4 ${color} p-4`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-ink tabular-nums">{score}</span>
                    <span className="text-caption text-secondary">{formatDate(item.created_at, localeForLang(uiLang))}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-secondary line-clamp-2">{item.summary}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Footer */}
        <Card variant="highlighted" className="p-8 text-center md:p-12">
          <h2 className="text-h2 text-ink">{T("demo.ctaTitle")}</h2>
          <p className="mx-auto mt-2 max-w-[640px] text-body leading-relaxed text-secondary">
            {T("demo.ctaDesc")}
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/register" className={`${PRIMARY_LINK} px-8`}>
              {T("demo.ctaStart")}
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}