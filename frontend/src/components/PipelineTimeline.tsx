"use client";

import { t, UILanguage } from "@/lib/i18n";
import Card from "@/components/ui/Card";

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
    <Card>
      <h3 className="mb-5 text-base font-semibold text-ink">{t(lang, "timeline.title")}</h3>
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
                    connectorDone ? "bg-success/40" : "bg-border"
                  }`}
                  aria-hidden
                />
              )}

              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
                {completed ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                ) : isError ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger/15 text-danger">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                ) : isActive ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-accent" aria-hidden />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-border" aria-hidden />
                )}
              </span>

              <div className="pt-0.5">
                <p
                  className={`text-[15px] leading-snug ${
                    completed
                      ? "font-medium text-ink"
                      : isError
                        ? "font-medium text-danger"
                        : isActive
                          ? "font-medium text-accent"
                          : "text-secondary/60"
                  }`}
                >
                  {label}
                </p>
                {isActive && !failed && <p className="text-caption text-secondary">{t(lang, "timeline.inProgress")}</p>}
                {isError && <p className="text-caption text-danger">{t(lang, "timeline.failed")}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}