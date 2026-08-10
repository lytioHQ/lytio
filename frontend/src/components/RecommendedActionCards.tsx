"use client";

import { t, UILanguage } from "@/lib/i18n";
import Card from "@/components/ui/Card";

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
    border: "border-l-danger",
    badge: "bg-danger/10 text-danger",
    dot: "bg-danger",
  },
  medium: {
    labelKey: "actions.medium",
    border: "border-l-warning",
    badge: "bg-warning/10 text-warning",
    dot: "bg-warning",
  },
  low: {
    labelKey: "actions.low",
    border: "border-l-secondary",
    badge: "bg-canvas text-secondary",
    dot: "bg-secondary",
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
      <Card>
        <h3 className="text-h3 text-ink">{T("actions.title")}</h3>
        <p className="mt-2 text-sm text-secondary">{T("actions.empty")}</p>
      </Card>
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
    <Card>
      <h3 className="mb-4 text-h3 text-ink">{T("actions.title")}</h3>

      {groups.map(([priority, items]) => {
        const meta = PRIORITY_META[priority] || PRIORITY_META.medium;
        return (
          <div key={priority} className="mb-5 last:mb-0">
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badge}`}>
                {T(meta.labelKey)} ({items.length})
              </span>
            </div>
            <div className="space-y-2.5">
              {items.map((item, i) => (
                <div
                  key={i}
                  className={`rounded-card border border-border border-l-4 ${meta.border} bg-surface p-4`}
                >
                  <p className="text-[15px] font-semibold text-ink">{item.title}</p>
                  {item.description && item.description !== item.title && (
                    <p className="mt-1 text-body leading-relaxed text-secondary">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Card>
  );
}