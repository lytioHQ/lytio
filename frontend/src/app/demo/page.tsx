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
import { useUiLang } from "@/lib/useUiLang";

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DemoPage() {
  const { uiLang } = useUiLang();
  const d = DEMO_DATA;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Demo Banner */}
      <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-center">
        <p className="text-xs font-medium text-amber-700">
          &#x1f3ac; <span className="font-semibold">Demo Mode</span> &mdash; Sample data. No files uploaded.{" "}
          <Link href="/register" className="underline hover:text-amber-900">
            Start your first real analysis &rarr;
          </Link>
        </p>
      </div>

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{d.project.title}</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-slate-400 capitalize">{d.project.industry}</span>
              <span className="text-xs text-slate-300">&middot;</span>
              <span className="text-xs text-slate-400">English</span>
              <span className="text-xs text-slate-300">&middot;</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Demo</span>
              <span className="text-xs text-slate-300">&middot;</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                &#x1f512; Read-only
              </span>
            </div>
          </div>
          <Link
            href="/register"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 shadow-sm"
          >
            Start Your First Analysis
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard label="Business Health" value={`${d.business_health.score}`} sub={d.business_health.level} />
          <SummaryCard label="Findings" value={`${d.insights.length}`} sub="Key insights" />
          <SummaryCard label="Risks" value={`${d.risks.length}`} sub={`${d.risks.filter((r) => r.severity === "high").length} high severity`} />
          <SummaryCard label="Recommendations" value={`${d.recommendations.length}`} sub={`${d.recommendations.filter((r) => r.priority === "high").length} high priority`} />
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Business Timeline</p>
          <div className="space-y-3">
            {d.timeline.map((item) => {
              const score = item.business_health_score;
              const color =
                score >= 90
                  ? "border-l-emerald-500 bg-emerald-50/30"
                  : score >= 75
                    ? "border-l-blue-500 bg-blue-50/30"
                    : score >= 60
                      ? "border-l-amber-500 bg-amber-50/30"
                      : "border-l-red-500 bg-red-50/30";
              return (
                <div key={item.id} className={`rounded-xl border border-slate-200 border-l-4 ${color} p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-800 tabular-nums">{score}</span>
                      <span className="text-xs text-slate-400">{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 line-clamp-2">{item.summary}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Footer */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Ready to analyze your own data?</h2>
          <p className="mt-2 text-sm text-slate-500">
            Upload your Excel file and get AI-powered business insights in seconds.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 shadow-sm"
          >
            Start Your First Analysis &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}