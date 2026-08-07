"use client";

import { t, UILanguage } from "@/lib/i18n";

export type JourneyPhase =
  | "upload"
  | "ai-analysis"
  | "business-insight"
  | "continue-analysis"
  | "recommended-actions";

interface Props {
  lang: UILanguage;
  phase: JourneyPhase;
}

const ORDER: JourneyPhase[] = ["upload", "ai-analysis", "business-insight", "continue-analysis", "recommended-actions"];

export default function BusinessInsightJourney({ lang, phase }: Props) {
  const phaseIdx = ORDER.indexOf(phase);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t(lang, "journey.title")}</h3>
        <span className="text-[11px] text-slate-400">
          {phaseIdx + 1} / {ORDER.length}
        </span>
      </div>

      <ol className="flex items-start gap-1 sm:gap-2">
        {ORDER.map((step, i) => {
          const completed = i < phaseIdx;
          const active = i === phaseIdx;
          const pending = i > phaseIdx;

          return (
            <li key={step} className="relative flex flex-1 flex-col items-center text-center">
              {i < ORDER.length - 1 && (
                <span
                  className={`absolute left-1/2 top-3.5 hidden h-0.5 w-full sm:block ${
                    completed ? "bg-emerald-400" : "bg-slate-200"
                  }`}
                  aria-hidden
                />
              )}

              <span
                className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                  completed
                    ? "border-emerald-400 bg-emerald-50 text-emerald-600"
                    : active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {completed ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>

              <p
                className={`mt-2 hidden text-[11px] font-medium sm:block ${
                  active ? "text-slate-900" : completed ? "text-slate-600" : "text-slate-400"
                }`}
              >
                {t(lang, `journey.${step}`)}
              </p>
              <p className={`mt-2 block text-[10px] sm:hidden ${active ? "text-slate-900 font-medium" : "text-slate-400"}`}>
                {t(lang, `journey.${step}`)}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}