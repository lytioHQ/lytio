"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { t, UILanguage } from "@/lib/i18n";
import { Button, Card } from "@/components/ui";
import BusinessHealthCard from "@/components/business/BusinessHealthCard";
import MetricGrid from "@/components/business/MetricGrid";
import InsightList from "@/components/business/InsightList";
import RecommendationList from "@/components/business/RecommendationList";
import {
  buildDemoHealthCard,
  buildDemoInsights,
  buildDemoMetricGrid,
  buildDemoRecs,
  demoLatestPeriod,
} from "@/lib/demo";

const sectionLabel = "text-caption font-semibold uppercase tracking-wider text-secondary";

const STEP_TINTS = [
  "border-accent/20 bg-accent-soft",
  "border-success/30 bg-success-soft",
  "border-accent/20 bg-accent-soft",
  "border-warning/30 bg-warning-soft",
  "border-success/30 bg-success-soft",
];

export default function LandingPage({ lang }: { lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  const router = useRouter();
  // Single source of truth: the same demo snapshot used by /demo (generated
  // from the real production pipeline). No hand-written mock numbers.
  const latest = demoLatestPeriod();
  const previewInsights = buildDemoInsights(latest, T).slice(0, 2);
  const previewRecs = buildDemoRecs(latest, T).slice(0, 2);
  return (
    <main className="min-h-screen overflow-x-clip bg-canvas">
      {/* === HERO === */}
      <section className="relative overflow-hidden border-b border-border">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-accent-soft/70 blur-[110px]" />
        <div aria-hidden className="pointer-events-none absolute top-24 right-[-140px] h-[300px] w-[300px] rounded-full bg-success-soft/60 blur-[100px]" />
        <div className="relative mx-auto max-w-5xl px-4 pt-16 pb-20 text-center md:px-6 md:pt-24 md:pb-28">
          <div className="mx-auto max-w-2xl">
            <p className="mb-5 inline-flex rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1 text-caption font-semibold text-accent">
              {T("landing.badge")}
            </p>
            <h1 className="text-[32px] font-bold leading-tight tracking-tight text-ink md:text-display">
              {T("landing.heroTitle")}
            </h1>
            <p className="mx-auto mt-5 max-w-[640px] text-body leading-relaxed text-secondary">
              {T("landing.heroDesc")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button onClick={() => router.push("/demo")} className="w-full px-8 sm:w-auto">
                {T("landing.tryDemo")}
              </Button>
              <Button variant="secondary" onClick={() => router.push("/register")} className="w-full px-8 sm:w-auto">
                {T("landing.startAnalysis")}
              </Button>
            </div>
            <p className="mt-5 text-sm text-secondary">{T("landing.demoNote")}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-7">
              <p className="flex items-center gap-2 text-sm text-secondary">
                <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" /></svg>
                </span>
                {T("landing.trust.noSignup")}
              </p>
              <p className="flex items-center gap-2 text-sm text-secondary">
                <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-success-soft text-success">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </span>
                {T("landing.trust.private")}
              </p>
              <p className="flex items-center gap-2 text-sm text-secondary">
                <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="m9 15 2 2 4-4" /></svg>
                </span>
                {T("landing.trust.evidence")}
              </p>
            </div>
          </div>

          {/* Real report preview: rendered by the same production components as /demo */}
          <div className="relative mx-auto mt-14 max-w-3xl">
            <div aria-hidden className="absolute -inset-6 rounded-card bg-accent-soft/70 blur-2xl" />
            <Card className="relative overflow-hidden p-0 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <p className="text-sm font-semibold text-ink">{T("landing.previewTitle")}</p>
                <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                  {T("demo.demoBadge")}
                </span>
              </div>
              <div className="space-y-6 p-5">
                <BusinessHealthCard data={buildDemoHealthCard(latest, T)} lang={lang} />
                <MetricGrid metrics={buildDemoMetricGrid(latest, T)} lang={lang} />
                <InsightList insights={previewInsights} lang={lang} />
                <RecommendationList recs={previewRecs} lang={lang} />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* === PROBLEM === */}
      <section className="border-b border-border bg-muted">
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className={sectionLabel}>{T("landing.problemLabel")}</p>
            <h2 className="mt-3 text-h2 text-ink">{T("landing.problemTitle")}</h2>
            <p className="mx-auto mt-3 max-w-[680px] text-body leading-relaxed text-secondary">
              {T("landing.problemDesc")}
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: T("landing.problem.salesDecline"), desc: T("landing.problem.salesDeclineDesc") },
              { title: T("landing.problem.regionalRisks"), desc: T("landing.problem.regionalRisksDesc") },
              { title: T("landing.problem.productGaps"), desc: T("landing.problem.productGapsDesc") },
              { title: T("landing.problem.inefficiency"), desc: T("landing.problem.inefficiencyDesc") },
            ].map((item, i) => (
              <Card
                key={i}
                className="p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
              >
                <p className="text-h3 text-ink">{item.title}</p>
                <p className="mt-1.5 text-body leading-relaxed text-secondary">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* === HOW IT WORKS (five-layer capability path) === */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className={sectionLabel}>{T("landing.howLabel")}</p>
            <h2 className="mt-3 text-h2 text-ink">{T("landing.howTitle")}</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { step: "1", title: T("landing.how.step1Title"), desc: T("landing.how.step1Desc") },
              { step: "2", title: T("landing.how.step2Title"), desc: T("landing.how.step2Desc") },
              { step: "3", title: T("landing.how.step3Title"), desc: T("landing.how.step3Desc") },
              { step: "4", title: T("landing.how.step4Title"), desc: T("landing.how.step4Desc") },
              { step: "5", title: T("landing.how.step5Title"), desc: T("landing.how.step5Desc") },
            ].map((item, i) => (
              <div key={i} className={`relative rounded-card border p-6 ${STEP_TINTS[i]}`}>
                {i < 4 ? (
                  <span aria-hidden className="absolute right-4 top-4 text-base text-secondary/50">→</span>
                ) : null}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-sm font-bold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                  {item.step}
                </span>
                <p className="mt-4 text-h3 text-ink">{item.title}</p>
                <p className="mt-1.5 text-body leading-relaxed text-secondary">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === PRODUCT DIFFERENTIATION === */}
      <section className="border-b border-border bg-accent-soft">
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className={sectionLabel}>{T("landing.diffLabel")}</p>
            <h2 className="mt-3 text-h2 text-ink">{T("landing.diffTitle")}</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: T("landing.diff.businessHealth"), desc: T("landing.diff.businessHealthDesc") },
              { title: T("landing.diff.evidence"), desc: T("landing.diff.evidenceDesc") },
              { title: T("landing.diff.executiveReports"), desc: T("landing.diff.executiveReportsDesc") },
              { title: T("landing.diff.timeline"), desc: T("landing.diff.timelineDesc") },
              { title: T("landing.diff.impact"), desc: T("landing.diff.impactDesc") },
              { title: T("landing.diff.workspace"), desc: T("landing.diff.workspaceDesc") },
            ].map((item, i) => (
              <Card
                key={i}
                variant={i === 0 ? "highlighted" : "default"}
                className="p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
              >
                <p className="text-h3 text-ink">{item.title}</p>
                <p className="mt-1.5 text-body leading-relaxed text-secondary">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* === PRODUCT SHOWCASE (real output, same snapshot as /demo) === */}
      <section className="border-b border-border bg-muted">
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className={sectionLabel}>{T("landing.showcaseLabel")}</p>
            <h2 className="mt-3 text-h2 text-ink">{T("landing.showcaseTitle")}</h2>
            <p className="mx-auto mt-3 max-w-[680px] text-body leading-relaxed text-secondary">
              {T("landing.showcaseDesc")}
            </p>
          </div>

          <div className="mt-12 space-y-8">
            <BusinessHealthCard data={buildDemoHealthCard(latest, T)} lang={lang} />
            <MetricGrid metrics={buildDemoMetricGrid(latest, T)} lang={lang} />
            <InsightList insights={buildDemoInsights(latest, T)} lang={lang} />
            <RecommendationList recs={buildDemoRecs(latest, T)} lang={lang} />
            <div className="flex justify-center pt-2">
              <Button onClick={() => router.push("/demo")} className="px-8">
                {T("landing.tryDemo")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* === DEMO CTA (dark) === */}
      <section className="relative overflow-hidden border-b border-border bg-ink">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-[320px] w-[640px] -translate-x-1/2 rounded-full bg-accent/25 blur-[110px]" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 text-center md:px-6 md:py-24">
          <div className="mx-auto max-w-lg">
            <p className="text-caption font-semibold uppercase tracking-wider text-white/60">{T("landing.ctaLabel")}</p>
            <h2 className="mt-3 text-h2 text-white">{T("landing.ctaTitle")}</h2>
            <p className="mx-auto mt-3 text-body leading-relaxed text-white/70">
              {T("landing.ctaDesc")}
            </p>
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" onClick={() => router.push("/demo")} className="px-8">
                {T("landing.tryDemo")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* === SECURITY === */}
      <section className="border-b border-border bg-canvas">
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className={sectionLabel}>{T("landing.securityLabel")}</p>
            <h2 className="mt-3 text-h2 text-ink">{T("landing.securityTitle")}</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: "🔒", title: T("landing.security.privateWorkspace"), desc: T("landing.security.privateWorkspaceDesc") },
              { icon: "📁", title: T("landing.security.userScoped"), desc: T("landing.security.userScopedDesc") },
              { icon: "🧠", title: T("landing.security.explainable"), desc: T("landing.security.explainableDesc") },
            ].map((item, i) => (
              <Card
                key={i}
                className="p-6 text-center transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-control bg-surface text-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                  {item.icon}
                </span>
                <p className="mt-4 text-h3 text-ink">{item.title}</p>
                <p className="mt-1.5 text-body leading-relaxed text-secondary">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-border bg-canvas">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row md:px-6">
          <p className="text-sm text-secondary">{T("landing.footerBrand")}</p>
          <div className="flex items-center gap-6">
            <Link href="/demo" className="text-sm text-secondary transition-colors hover:text-ink">{T("landing.footerDemo")}</Link>
            <Link href="/login" className="text-sm text-secondary transition-colors hover:text-ink">{T("landing.footerSignIn")}</Link>
            <Button onClick={() => router.push("/register")}>{T("landing.footerGetStarted")}</Button>
          </div>
        </div>
      </footer>
    </main>
  );
}
