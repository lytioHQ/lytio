"use client";

import Link from "next/link";
import { t, UILanguage } from "@/lib/i18n";

export default function LandingPage({ lang }: { lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  return (
    <main className="min-h-screen bg-white">
      {/* === HERO === */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <div className="mx-auto max-w-2xl">
            <p className="mb-4 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-blue-700">
              {T("landing.badge")}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight sm:text-5xl">
              {T("landing.heroTitle")}
            </h1>
            <p className="mt-5 text-base text-slate-500 leading-relaxed">
              {T("landing.heroDesc")}
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/demo"
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 shadow-sm transition-colors"
              >
                {T("landing.tryDemo")}
              </Link>
              <Link
                href="/register"
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {T("landing.startAnalysis")}
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">{T("landing.demoNote")}</p>
          </div>
        </div>
      </section>

      {/* === PROBLEM === */}
      <section className="border-b border-slate-100 bg-slate-50/50">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{T("landing.problemLabel")}</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">{T("landing.problemTitle")}</h2>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
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
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === HOW IT WORKS === */}
      <section className="border-b border-slate-100">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{T("landing.howLabel")}</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">{T("landing.howTitle")}</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-4">
            {[
              { step: "1", title: T("landing.how.step1Title"), desc: T("landing.how.step1Desc") },
              { step: "2", title: T("landing.how.step2Title"), desc: T("landing.how.step2Desc") },
              { step: "3", title: T("landing.how.step3Title"), desc: T("landing.how.step3Desc") },
              { step: "4", title: T("landing.how.step4Title"), desc: T("landing.how.step4Desc") },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{item.step}</span>
                <p className="mt-3 text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === PRODUCT DIFFERENTIATION === */}
      <section className="border-b border-slate-100 bg-slate-50/50">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{T("landing.diffLabel")}</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">{T("landing.diffTitle")}</h2>
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
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === DEMO CTA === */}
      <section className="border-b border-slate-100">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <div className="mx-auto max-w-lg">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{T("landing.ctaLabel")}</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">{T("landing.ctaTitle")}</h2>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              {T("landing.ctaDesc")}
            </p>
            <Link
              href="/demo"
              className="mt-6 inline-flex rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 shadow-sm transition-colors"
            >
              {T("landing.tryDemo")}
            </Link>
          </div>
        </div>
      </section>

      {/* === SECURITY === */}
      <section className="bg-slate-50/50">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{T("landing.securityLabel")}</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">{T("landing.securityTitle")}</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: "\uD83D\uDD12", title: T("landing.security.privateWorkspace"), desc: T("landing.security.privateWorkspaceDesc") },
              { icon: "\uD83D\uDCC1", title: T("landing.security.userScoped"), desc: T("landing.security.userScopedDesc") },
              { icon: "\uD83E\uDDE0", title: T("landing.security.explainable"), desc: T("landing.security.explainableDesc") },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
                <span className="text-2xl">{item.icon}</span>
                <p className="mt-3 text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-8 flex items-center justify-between">
          <p className="text-xs text-slate-400">{T("landing.footerBrand")}</p>
          <div className="flex items-center gap-6">
            <Link href="/demo" className="text-xs text-slate-400 hover:text-slate-600">{T("landing.footerDemo")}</Link>
            <Link href="/login" className="text-xs text-slate-400 hover:text-slate-600">{T("landing.footerSignIn")}</Link>
            <Link href="/register" className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">{T("landing.footerGetStarted")}</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}