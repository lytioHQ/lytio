"use client";

import { t, UILanguage } from "@/lib/i18n";

const INDUSTRIES = [
  { key: "sales", enabled: true, comingSoon: false },
  { key: "finance", enabled: false, comingSoon: false },
  { key: "inventory", enabled: false, comingSoon: false },
  { key: "hr", enabled: false, comingSoon: false },
  { key: "energy", enabled: false, comingSoon: false },
  { key: "procurement", enabled: false, comingSoon: false },
  { key: "custom", enabled: false, comingSoon: true },
] as const;

interface Props {
  lang: UILanguage;
  active: string;
  onSelect: (key: string) => void;
}

export default function IndustryNav({ lang, active, onSelect }: Props) {
  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-6">
      {INDUSTRIES.map((item) => {
        const isActive = item.key === active;
        const label = t(lang, `nav.${item.key}`);
        const badge = item.comingSoon ? t(lang, "nav.comingSoon") : null;

        return (
          <button
            key={item.key}
            onClick={() => item.enabled && onSelect(item.key)}
            disabled={!item.enabled}
            className={`relative shrink-0 px-4 py-3 text-xs font-medium transition-colors ${
              isActive
                ? "text-slate-900 border-b-2 border-slate-900 -mb-px"
                : item.enabled
                  ? "text-slate-500 hover:text-slate-700"
                  : "text-slate-300 cursor-not-allowed"
            }`}
          >
            {label}
            {badge && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}