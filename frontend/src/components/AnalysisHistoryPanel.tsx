"use client";

import { t, UILanguage } from "@/lib/i18n";

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
  "initial": { icon: "\u25cb", badge: "bg-slate-100 text-slate-600" },
  "follow-up": { icon: "\u25b8", badge: "bg-blue-50 text-blue-700" },
  "recommended": { icon: "\u2605", badge: "bg-emerald-50 text-emerald-700" },
};

export default function AnalysisHistoryPanel({ lang, entries }: Props) {
  const T = (key: string) => t(lang, key);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{T("history.title")}</h3>
        <span className="text-[11px] text-slate-400">{T("history.session")}</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-slate-400">{T("history.empty")}</p>
      ) : (
        <ol className="relative">
          {entries.map((entry, i) => {
            const meta = TYPE_META[entry.type] || TYPE_META["initial"];
            return (
              <li key={entry.id} className="relative flex items-start gap-3 pb-5 last:pb-0">
                {i < entries.length - 1 && (
                  <span className="absolute left-[11px] top-6 h-full w-px bg-slate-200" aria-hidden />
                )}
                <span
                  className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${meta.badge}`}
                >
                  {meta.icon}
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-medium text-slate-700">{entry.title}</p>
                  <p className="text-[11px] text-slate-400">{entry.time}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}