"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { t, UILanguage } from "@/lib/i18n";
import { Button, Card } from "@/components/ui";

const sectionLabel = "text-caption font-semibold uppercase tracking-wider text-secondary";

const STEP_TINTS = [
  "border-accent/20 bg-accent-soft",
  "border-success/30 bg-success-soft",
  "border-accent/20 bg-accent-soft",
  "border-warning/30 bg-warning-soft",
];

export default function LandingPage({ lang }: { lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  const router = useRouter();
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
          </div>

          {/* Dashboard preview */}
          <div className="relative mx-auto mt-14 max-w-3xl">
            <div aria-hidden className="absolute -inset-6 rounded-card bg-accent-soft/70 blur-2xl" />
            <Card className="relative overflow-hidden p-0 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  <p className="text-sm font-semibold text-ink">{T("home.subtitle")}</p>
                </div>
                <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                  {T("biz.level.high")}
                </span>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-3">
                {[
                  { value: "1.24M", delta: "+12.4%" },
                  { value: "8.4%", delta: "+3.1%" },
                  { value: "92", delta: "+6.0" },
                ].map((m, i) => (
                  <div key={i} className="rounded-control border border-border bg-canvas p-4 text-left">
                    <p className="text-2xl font-semibold text-ink tabular-nums">{m.value}</p>
                    <p className="mt-1 flex items-center gap-1 text-caption font-medium text-success">
                      <span aria-hidden>↑</span>
                      <span className="tabular-nums">{m.delta}</span>
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border bg-canvas/60 px-5 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { dot: "bg-success-soft", label: T("landing.problem.salesDecline") },
                    { dot: "bg-warning-soft", label: T("landing.problem.regionalRisks") },
                    { dot: "bg-accent-soft", label: T("landing.problem.productGaps") },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-control border border-border bg-surface px-3.5 py-2.5 text-left">
                      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${row.dot}`} />
                      <span className="truncate text-sm text-ink">{row.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* === PROBLEM === */}
      <section className="border-b border-border">
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

      {/* === HOW IT WORKS === */}
      <section className="border-b border-border bg-muted">
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className={sectionLabel}>{T("landing.howLabel")}</p>
            <h2 className="mt-3 text-h2 text-ink">{T("landing.howTitle")}</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", title: T("landing.how.step1Title"), desc: T("landing.how.step1Desc") },
              { step: "2", title: T("landing.how.step2Title"), desc: T("landing.how.step2Desc") },
              { step: "3", title: T("landing.how.step3Title"), desc: T("landing.how.step3Desc") },
              { step: "4", title: T("landing.how.step4Title"), desc: T("landing.how.step4Desc") },
            ].map((item, i) => (
              <div key={i} className={`relative rounded-card border p-6 ${STEP_TINTS[i]}`}>
                {i < 3 ? (
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
      <section className="border-b border-border">
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
      <section className="border-b border-border bg-muted">
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
