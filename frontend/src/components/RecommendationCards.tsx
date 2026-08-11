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
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <p className="text-caption font-semibold uppercase tracking-wider text-secondary">
          {t("recs.title")}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => !sending && onSelect(q)}
            disabled={sending}
            className="group rounded-card border border-border bg-surface p-4 text-left transition-colors hover:border-accent/40 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-control bg-accent/10 text-xs font-bold text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                {i + 1}
              </span>
              <p className="text-body font-medium text-ink">{q}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}