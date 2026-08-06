"use client";

import { t, UILanguage } from "@/lib/i18n";

export type PipelineStage =
  | "idle"
  | "uploading"
  | "parsing"
  | "detecting"
  | "ready"
  | "thinking"
  | "generating"
  | "done";

interface Props {
  lang: UILanguage;
  stage: PipelineStage;
  failed?: boolean;
}

const ORDER: PipelineStage[] = ["uploading", "parsing", "detecting", "thinking", "generating"];

const COMPLETED: Record<PipelineStage, number> = {
  idle: 0,
  uploading: 0,
  parsing: 1,
  detecting: 2,
  ready: 3,
  thinking: 3,
  generating: 4,
  done: 5,
};

export default function PipelineTimeline({ lang, stage, failed = false }: Props) {
  const count = COMPLETED[stage] ?? 0;
  const activeIdx = ORDER.includes(stage) ? ORDER.indexOf(stage) : -1;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-sm font-semibold text-slate-900">{t(lang, "timeline.title")}</h3>
      <ol className="relative">
        {ORDER.map((step, i) => {
          const label = t(lang, `timeline.${step}`);
          const completed = i < count;
          const isActive = !failed && i === activeIdx;
          const isError = failed && i === count;
          const isPending = !completed && !isActive && !isError;
          const connectorDone = i < count - 1;

          return (
            <li key={step} className="relative flex items-start gap-3 pb-6 last:pb-0">
              {i < ORDER.length - 1 && (
                <span
                  className={`absolute left-[11px] top-6 h-full w-px ${
                    connectorDone ? "bg-emerald-300" : "bg-slate-200"
                  }`}
                  aria-hidden
                />
              )}

              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
                {completed ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                ) : isError ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                ) : isActive ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" aria-hidden />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden />
                )}
              </span>

              <div className="pt-0.5">
                <p
                  className={`text-sm ${
                    completed
                      ? "font-medium text-slate-700"
                      : isError
                        ? "font-medium text-red-600"
                        : isActive
                          ? "font-medium text-slate-900"
                          : "text-slate-400"
                  }`}
                >
                  {label}
                </p>
                {isActive && !failed && <p className="text-[11px] text-slate-400">{t(lang, "timeline.inProgress")}</p>}
                {isError && <p className="text-[11px] text-red-400">{t(lang, "timeline.failed")}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}