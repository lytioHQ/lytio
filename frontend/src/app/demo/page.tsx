"use client";

import { useState } from "react";
import Link from "next/link";
import BusinessHealthCard from "@/components/business/BusinessHealthCard";
import ExecutiveSummaryCard from "@/components/business/ExecutiveSummaryCard";
import HealthScoreBreakdown from "@/components/business/HealthScoreBreakdown";
import MetricGrid from "@/components/business/MetricGrid";
import InsightList from "@/components/business/InsightList";
import RiskList from "@/components/business/RiskList";
import RecommendationList from "@/components/business/RecommendationList";
import BusinessActions from "@/components/business/BusinessActions";
import BusinessMemoryCard from "@/components/business/BusinessMemoryCard";
import { Card, MetricCard } from "@/components/ui";
import { buttonBaseClasses, buttonVariantClasses } from "@/components/ui/Button";
import { useUiLang } from "@/lib/useUiLang";
import { t, localeForLang } from "@/lib/i18n";
import {
  DEMO_META,
  DEMO_PERIOD_COUNT,
  DISPLAY_METRICS,
  buildDemoActions,
  buildDemoExecutiveSummary,
  buildDemoHealthCard,
  buildDemoInsights,
  buildDemoMemory,
  buildDemoMetricGrid,
  buildDemoRecs,
  buildDemoRisks,
  buildDemoTimeline,
  buildDemoVerification,
  demoPeriodAt,
  formatMetricValue,
} from "@/lib/demo";

const PRIMARY_LINK = `${buttonBaseClasses} ${buttonVariantClasses.primary}`;
const SECONDARY_LINK = `${buttonBaseClasses} ${buttonVariantClasses.secondary}`;

function formatDate(d: string, locale: string): string {
  return new Date(d).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ScreenHeading({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{index}</span>
      <h2 className="text-h3 text-ink">{title}</h2>
    </div>
  );
}

export default function DemoPage() {
  const { uiLang } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);
  const [periodIndex, setPeriodIndex] = useState(DEMO_PERIOD_COUNT - 1);
  const period = demoPeriodAt(periodIndex);
  const timeline = buildDemoTimeline(T);
  const verification = buildDemoVerification();
  const schema = period.schema_mapping;
  const meta = DEMO_META;

  return (
    <main className="min-h-screen bg-canvas">
      {/* Demo Banner: sample data notice, no conversion CTA */}
      <div className="border-b border-warning/20 bg-warning-soft px-4 py-3 text-center md:px-6">
        <p className="text-sm leading-relaxed text-ink">&#x1f3ac; {T("demo.banner")}</p>
      </div>

      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">{T("demo.headerTitle")}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">{T("demo.demoBadge")}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                {T("demo.readOnly")}
              </span>
              <span className="text-sm text-secondary">{T("demo.period.label", { n: period.period_id })}</span>
            </div>
          </div>
          <Link href="/register" className={`${PRIMARY_LINK} shrink-0`}>
            {T("demo.startCta")}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 md:px-8">
        {/* Period navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">{T("demo.period.title")}</h2>
            <p className="text-caption text-secondary">{T("demo.period.label", { n: period.period_id })}</p>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: DEMO_PERIOD_COUNT }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPeriodIndex(n - 1)}
                aria-pressed={periodIndex === n - 1}
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-control border px-3 text-sm font-medium transition-colors ${
                  periodIndex === n - 1
                    ? "border-accent/40 bg-accent-soft text-accent"
                    : "border-border bg-surface text-secondary hover:bg-canvas hover:text-ink"
                }`}
              >
                {T("demo.period.label", { n })}
              </button>
            ))}
          </div>
        </div>

        {/* ===== Screen 1 · Now ===== */}
        <section aria-label={T("exec.screen1")}>
          <ScreenHeading index="1" title={T("exec.screen1")} />
          <div className="mt-6 space-y-8">
            <BusinessHealthCard data={buildDemoHealthCard(period, T)} lang={uiLang} />
            <ExecutiveSummaryCard content={buildDemoExecutiveSummary(T)} lang={uiLang} />
          </div>
        </section>

        {/* ===== Screen 2 · Why ===== */}
        <section aria-label={T("exec.screen2")}>
          <ScreenHeading index="2" title={T("exec.screen2")} />
          <div className="mt-6 space-y-8">
            <div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-base font-semibold text-ink">{T("metric.title")}</h3>
                <p className="text-caption text-secondary">{T("metric.subtitle")}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-5">
                {DISPLAY_METRICS.map((name) => {
                  const m = period.computed_metrics.find((item) => item.metric_name === name);
                  if (!m) return null;
                  const available = m.availability === "available" && m.value != null;
                  const estimated = name === "order_count" && (m.assumptions ?? []).length > 0;
                  const value = available ? formatMetricValue(m, T) : "—";
                  const description = available
                    ? estimated
                      ? T("metric.estimated")
                      : T("metric.subtitle")
                    : T("metric.unavailable");
                  return (
                    <MetricCard
                      key={name}
                      label={T(`metric.name.${name}`)}
                      value={value}
                      description={description}
                    />
                  );
                })}
              </div>
            </div>
            <HealthScoreBreakdown data={period.health_score} lang={uiLang} />
            <MetricGrid metrics={buildDemoMetricGrid(period, T)} lang={uiLang} />
            <InsightList insights={buildDemoInsights(T)} lang={uiLang} />
            <RiskList risks={buildDemoRisks(T)} lang={uiLang} />
          </div>
        </section>

        {/* ===== Screen 3 · How to improve ===== */}
        <section aria-label={T("exec.screen3")}>
          <ScreenHeading index="3" title={T("exec.screen3")} />
          <div className="mt-6 space-y-8">
            <RecommendationList recs={buildDemoRecs(T)} lang={uiLang} />
            <BusinessActions projectId="demo" lang={uiLang} demoData={{ actions: buildDemoActions() }} />
            <BusinessMemoryCard projectId="demo" lang={uiLang} demoData={{ data: buildDemoMemory() }} />
          </div>
        </section>

        {/* ===== Verification ===== */}
        <section>
          <ScreenHeading index="V" title={T("demo.verification.title")} />
          <div className="mt-6">
            <Card>
              <p className="mb-3 text-h3 text-ink">{T("demo.verification.title")}</p>
              <p className="max-w-[680px] text-body leading-relaxed text-secondary">{T("demo.verification.desc")}</p>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span>
                  {verification.verdict ? T(`verifyReport.verdict.${verification.verdict}`) : "–"}
                  {verification.confidence ? ` · ${T(`verifyReport.confidence.${verification.confidence}`)}` : ""}
                </span>
                {verification.reliability && (
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">{verification.reliability}</span>
                )}
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-caption text-secondary">
                      <th className="py-2 pr-4 font-medium">{T("demo.verification.metric")}</th>
                      <th className="py-2 pr-4 font-medium">{T("demo.verification.before")}</th>
                      <th className="py-2 pr-4 font-medium">{T("demo.verification.after")}</th>
                      <th className="py-2 pr-4 font-medium">{T("demo.verification.change")}</th>
                      <th className="py-2 font-medium">{T("demo.verification.direction")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verification.metric_changes.map((mc) => (
                      <tr key={mc.metric} className="border-b border-border last:border-none">
                        <td className="py-2.5 pr-4 font-medium text-ink">{mc.metric}</td>
                        <td className="py-2.5 pr-4 text-secondary">{mc.before ?? "–"}</td>
                        <td className="py-2.5 pr-4 text-secondary">{mc.after ?? "–"}</td>
                        <td className="py-2.5 pr-4 text-secondary">{mc.percent_delta ?? "–"}</td>
                        <td className="py-2.5 capitalize text-secondary">{mc.direction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-caption italic leading-relaxed text-secondary/70">{T("demo.verification.computedNote")}</p>
            </Card>
          </div>
        </section>

        {/* ===== Schema Mapping ===== */}
        <section>
          <ScreenHeading index="S" title={T("demo.schema.title")} />
          <div className="mt-6">
            <Card>
              <p className="mb-3 text-h3 text-ink">{T("demo.schema.title")}</p>
              <p className="max-w-[680px] text-body leading-relaxed text-secondary">{T("demo.schema.desc")}</p>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-caption text-secondary">
                      <th className="py-2 pr-4 font-medium">{T("demo.schema.field")}</th>
                      <th className="py-2 pr-4 font-medium">{T("demo.schema.source")}</th>
                      <th className="py-2 pr-4 font-medium">{T("demo.schema.confidence")}</th>
                      <th className="py-2 pr-4 font-medium">{T("demo.schema.method")}</th>
                      <th className="py-2 font-medium">{T("demo.schema.required")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schema.mappings.map((m) => (
                      <tr key={m.canonical_key} className="border-b border-border last:border-none">
                        <td className="py-2.5 pr-4 font-medium text-ink">
                          {T(`schema.field.${m.canonical_key}`)}
                          {m.required && (
                            <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
                              {T("demo.schema.required")}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-secondary">{m.source_column ?? "–"}</td>
                        <td className="py-2.5 pr-4 text-secondary">{Math.round(m.confidence * 100)}%</td>
                        <td className="py-2.5 pr-4 text-secondary">
                          {T(`schema.confirm.method.${m.match_method}`) ?? m.match_method}
                        </td>
                        <td className="py-2.5 capitalize text-secondary">
                          {T(`schema.confirm.status.${m.confirmation_status}`) ?? m.confirmation_status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-secondary">
                <span>
                  <span className="font-medium text-ink">{T("demo.schema.missing")}:</span>{" "}
                  {schema.missing.length > 0 ? schema.missing.join(", ") : "–"}
                </span>
                <span>
                  <span className="font-medium text-ink">{T("demo.schema.conflicts")}:</span>{" "}
                  {schema.conflicts.length > 0 ? schema.conflicts.join(", ") : T("demo.schema.none")}
                </span>
              </div>
              <p className="mt-4 text-caption leading-relaxed text-secondary/70">{T("demo.schema.metaNote")}</p>
            </Card>
          </div>
        </section>

        {/* ===== Timeline ===== */}
        <section>
          <ScreenHeading index="T" title={T("demo.timelineTitle")} />
          <div className="mt-6 space-y-3">
            {timeline.map((item) => {
              const score = item.score;
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
                    <span className="text-caption text-secondary">
                      {item.level} · {formatDate(item.created_at, localeForLang(uiLang))}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-secondary">{item.summary}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA Footer: primary = register with own data; secondary = back home */}
        <Card variant="highlighted" className="p-8 text-center md:p-12">
          <h2 className="text-h2 text-ink">{T("demo.ctaTitle")}</h2>
          <p className="mx-auto mt-2 max-w-[640px] text-body leading-relaxed text-secondary">{T("demo.ctaDesc")}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className={`${PRIMARY_LINK} px-8`}>
              {T("demo.ctaStartPrimary")}
            </Link>
            <Link href="/" className={`${SECONDARY_LINK} px-8`}>
              {T("demo.ctaBackHome")}
            </Link>
          </div>
        </Card>

        {/* Snapshot footer */}
        <footer className="border-t border-border pt-6">
          <p className="text-center text-caption text-secondary/60">
            {T("demo.fixtureNote", { engine: meta.engine_version, commit: meta.source_commit })}
          </p>
        </footer>
      </div>
    </main>
  );
}
