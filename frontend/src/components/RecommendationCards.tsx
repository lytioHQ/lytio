"use client";

interface Props {
  questions: string[];
  onSelect: (question: string) => void;
  sending: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export default function RecommendationCards({ questions, onSelect, sending, t }: Props) {
  if (!questions || questions.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t("recs.title")}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => !sending && onSelect(q)}
            disabled={sending}
            className="group rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-slate-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                {i + 1}
              </span>
              <p className="text-sm font-medium text-slate-700 leading-snug group-hover:text-slate-900">
                {q}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}