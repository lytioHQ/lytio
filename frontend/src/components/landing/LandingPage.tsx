"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* === HERO === */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <div className="mx-auto max-w-2xl">
            <p className="mb-4 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-blue-700">
              AI Business Consultant
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight sm:text-5xl">
              Turn Business Data Into Better Decisions
            </h1>
            <p className="mt-5 text-base text-slate-500 leading-relaxed">
              Analyze spreadsheets, discover risks, and generate explainable business insights — all backed by evidence, not black-box answers.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/demo"
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 shadow-sm transition-colors"
              >
                &#x1f3ac; Try Demo
              </Link>
              <Link
                href="/register"
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Start Your Analysis &rarr;
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">No registration required for demo. Experience a complete analysis in 30 seconds.</p>
          </div>
        </div>
      </section>

      {/* === PROBLEM === */}
      <section className="border-b border-slate-100 bg-slate-50/50">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">The Problem</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Businesses have data, but lack actionable insights.</h2>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              Spreadsheets sit untouched. Managers know something is wrong but can not pinpoint what. Decisions are made on intuition, not evidence.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Sales Decline", desc: "Unnoticed revenue drops across products and regions." },
              { title: "Regional Risks", desc: "Over-reliance on single markets creates exposure." },
              { title: "Product Gaps", desc: "Underperforming SKUs drain resources silently." },
              { title: "Inefficiency", desc: "Operational costs grow without clear root cause." },
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
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">How It Works</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">From spreadsheet to executive decision in minutes.</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-4">
            {[
              { step: "1", title: "Upload Data", desc: "Upload any Excel file. Your data stays private." },
              { step: "2", title: "AI Analysis", desc: "AI identifies patterns, risks, and opportunities." },
              { step: "3", title: "Evidence-backed", desc: "Every insight links to specific data rows and ranges." },
              { step: "4", title: "Executive Report", desc: "Actionable recommendations with expected impact." },
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
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">What Makes ExcelPilot Different</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Not another AI chat. A business consultant that works with your data.</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Business Health", desc: "Instant 0-100 score showing overall business condition with trend indicators." },
              { title: "Evidence", desc: "Every insight links to your data. See exactly which rows and columns support each finding." },
              { title: "Executive Reports", desc: "Professional business reports ready for stakeholders — no raw AI output." },
              { title: "Business Timeline", desc: "Track business health over time. Every analysis is preserved for comparison." },
              { title: "Impact Assessment", desc: "Understand expected outcomes before acting. Conservative, transparent estimates." },
              { title: "Workspace First", desc: "Your projects, your history, your decisions. Not a throwaway chat session." },
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
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">See It In Action</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Experience a complete business analysis in 30 seconds.</h2>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              No upload. No registration. Explore a full Sales Analysis with insights, risks, recommendations, and evidence — all from sample data.
            </p>
            <Link
              href="/demo"
              className="mt-6 inline-flex rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 shadow-sm transition-colors"
            >
              &#x1f3ac; Try Demo
            </Link>
          </div>
        </div>
      </section>

      {/* === SECURITY === */}
      <section className="bg-slate-50/50">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Security & Privacy</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Your data is protected. Your analysis is private.</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: "\uD83D\uDD12", title: "Private Workspace", desc: "Every project belongs to you alone. No cross-account data access." },
              { icon: "\uD83D\uDCC1", title: "User-scoped Storage", desc: "Files are stored per-user and accessed only through authenticated APIs." },
              { icon: "\uD83E\uDDE0", title: "Explainable Analysis", desc: "Understand why every conclusion was reached. Evidence, not black boxes." },
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
          <p className="text-xs text-slate-400">ExcelPilot &mdash; AI Business Consultant</p>
          <div className="flex items-center gap-6">
            <Link href="/demo" className="text-xs text-slate-400 hover:text-slate-600">Demo</Link>
            <Link href="/login" className="text-xs text-slate-400 hover:text-slate-600">Sign In</Link>
            <Link href="/register" className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">Get Started</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}