"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { t, UILanguage } from "@/lib/i18n";
import { Button, Card } from "@/components/ui";

const sectionLabel = "text-caption font-semibold uppercase tracking-wider text-secondary";

export default function LandingPage({ lang }: { lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  const router = useRouter();
  return (
    <main className="min-h-screen bg-canvas">
      {/* === HERO === */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center md:px-6 md:py-28">
          <div className="mx-auto max-w-2xl">
            <p className="mb-5 inline-flex rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1 text-caption font-semibold text-accent">
              {T("landing.badge")}
            </p>
            <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-ink md:text-display">
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
              <Card key={i} className="p-5">
                <p className="text-[15px] font-semibold text-ink">{item.title}</p>
                <p className="mt-1.5 text-body leading-relaxed text-secondary">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* === HOW IT WORKS === */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className={sectionLabel}>{T("landing.howLabel")}</p>
            <h2 className="mt-3 text-h2 text-ink">{T("landing.howTitle")}</h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-4">
            {[
              { step: "1", title: T("landing.how.step1Title"), desc: T("landing.how.step1Desc") },
              { step: "2", title: T("landing.how.step2Title"), desc: T("landing.how.step2Desc") },
              { step: "3", title: T("landing.how.step3Title"), desc: T("landing.how.step3Desc") },
              { step: "4", title: T("landing.how.step4Title"), desc: T("landing.how.step4Desc") },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{item.step}</span>
                <p className="mt-3 text-[15px] font-semibold text-ink">{item.title}</p>
                <p className="mx-auto mt-1.5 max-w-[260px] text-body leading-relaxed text-secondary">{item.desc}</p>
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
              <Card key={i} className="p-5">
                <p className="text-[15px] font-semibold text-ink">{item.title}</p>
                <p className="mt-1.5 text-body leading-relaxed text-secondary">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* === DEMO CTA === */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center md:px-6 md:py-20">
          <div className="mx-auto max-w-lg">
            <p className={sectionLabel}>{T("landing.ctaLabel")}</p>
            <h2 className="mt-3 text-h2 text-ink">{T("landing.ctaTitle")}</h2>
            <p className="mx-auto mt-3 text-body leading-relaxed text-secondary">
              {T("landing.ctaDesc")}
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => router.push("/demo")} className="px-8">
                {T("landing.tryDemo")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* === SECURITY === */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className={sectionLabel}>{T("landing.securityLabel")}</p>
            <h2 className="mt-3 text-h2 text-ink">{T("landing.securityTitle")}</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: "\uD83D\uDD12", title: T("landing.security.privateWorkspace"), desc: T("landing.security.privateWorkspaceDesc") },
              { icon: "\uD83D\uDCC1", title: T("landing.security.userScoped"), desc: T("landing.security.userScopedDesc") },
              { icon: "\uD83E\uDDE0", title: T("landing.security.explainable"), desc: T("landing.security.explainableDesc") },
            ].map((item, i) => (
              <Card key={i} className="p-6 text-center">
                <span className="text-2xl">{item.icon}</span>
                <p className="mt-3 text-[15px] font-semibold text-ink">{item.title}</p>
                <p className="mt-1.5 text-body leading-relaxed text-secondary">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-border">
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