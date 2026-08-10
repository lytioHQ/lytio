"use client";

import { t, UILanguage } from "@/lib/i18n";
import Card from "@/components/ui/Card";

export type HistoryEntryType = "initial" | "follow-up" | "recommended";

export interface HistoryEntry {
  id: string;
  type: HistoryEntryType;
  title: string;
  time: string;
}

interface Props {
  lang: UILanguage;
  entries: HistoryEntry[];
}

const TYPE_META: Record<HistoryEntryType, { icon: string; badge: string }> = {
  "initial": { icon: "\u25cb", badge: "bg-canvas text-secondary" },
  "follow-up": { icon: "\u25b8", badge: "bg-accent/10 text-accent" },
  "recommended": { icon: "\u2605", badge: "bg-success/10 text-success" },
};

export default function AnalysisHistoryPanel({ lang, entries }: Props) {
  const T = (key: string) => t(lang, key);

  return (
    <Card>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-h3 text-ink">{T("history.title")}</h3>
        <span className="text-caption text-secondary">{T("history.session")}</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-secondary">{T("history.empty")}</p>
      ) : (
        <ol className="relative">
          {entries.map((entry, i) => {
            const meta = TYPE_META[entry.type] || TYPE_META["initial"];
            return (
              <li key={entry.id} className="relative flex items-start gap-3 pb-5 last:pb-0">
                {i < entries.length - 1 && (
                  <span className="absolute left-[11px] top-6 h-full w-px bg-border" aria-hidden />
                )}
                <span
                  className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption ${meta.badge}`}
                >
                  {meta.icon}
                </span>
                <div className="pt-0.5">
                  <p className="text-[15px] font-medium text-ink">{entry.title}</p>
                  <p className="text-caption text-secondary">{entry.time}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}