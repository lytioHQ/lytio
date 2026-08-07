"use client";

import { t, UILanguage } from "@/lib/i18n";

export interface ActionData {
  title: string;
  description: string;
  priority: string;
}

interface Props {
  lang: UILanguage;
  recs: ActionData[];
  summary?: string;
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_META: Record<string, { labelKey: string; border: string; badge: string; dot: string }> = {
  high: {
    labelKey: "actions.high",
    border: "border-l-red-500",
    badge: "bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
  medium: {
    labelKey: "actions.medium",
    border: "border-l-amber-500",
    badge: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  low: {
    labelKey: "actions.low",
    border: "border-l-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
};

function fallbackFromSummary(summary: string | undefined): ActionData[] {
  if (!summary) return [];
  const sentences = summary
    .split(/(?<=[.!?。！？])\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  return sentences.slice(0, 3).map((s) => ({
    title: s.length > 60 ? s.slice(0, 60) + "\u2026" : s,
    description: s,
    priority: "medium",
  }));
}

export default function RecommendedActionCards({ lang, recs, summary }: Props) {
  const T = (key: string) => t(lang, key);

  let actions = recs.length > 0 ? recs : fallbackFromSummary(summary);
  if (actions.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">{T("actions.title")}</h3>
        <p className="mt-2 text-xs text-slate-400">{T("actions.empty")}</p>
      </section>
    );
  }

  const grouped = actions.reduce<Record<string, ActionData[]>>((acc, r) => {
    const key = PRIORITY_ORDER[r.priority] !== undefined ? r.priority : "medium";
    (acc[key] = acc[key] || []).push(r);
    return acc;
  }, {});

  const groups = Object.entries(grouped).sort(
    ([a], [b]) => (PRIORITY_ORDER[a] ?? 1) - (PRIORITY_ORDER[b] ?? 1)
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">{T("actions.title")}</h3>

      {groups.map(([priority, items]) => {
        const meta = PRIORITY_META[priority] || PRIORITY_META.medium;
        return (
          <div key={priority} className="mb-5 last:mb-0">
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                {T(meta.labelKey)} ({items.length})
              </span>
            </div>
            <div className="space-y-2.5">
              {items.map((item, i) => (
                <div
                  key={i}
                  className={`rounded-xl border border-slate-200 border-l-4 ${meta.border} bg-white p-4 shadow-sm`}
                >
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  {item.description && item.description !== item.title && (
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}