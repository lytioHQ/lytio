"use client";

import { t, UILanguage } from "@/lib/i18n";

export type ContinueDirection = "decline" | "customerRisk" | "product" | "regional" | "manager";

interface Props {
  lang: UILanguage;
  active: ContinueDirection | null;
  onSelect: (direction: ContinueDirection, label: string) => void;
}

const DIRECTIONS: ContinueDirection[] = ["decline", "customerRisk", "product", "regional", "manager"];

const ICONS: Record<ContinueDirection, string> = {
  decline: "\u2193",       // down arrow
  customerRisk: "\u26a0",  // warning
  product: "\u25a6",       // product-ish
  regional: "\u25a9",      // map-ish
  manager: "\u2605",       // star
};

export default function ContinueAnalysisPanel({ lang, active, onSelect }: Props) {
  const T = (key: string) => t(lang, key);
  const activeData = active
    ? {
        label: T(`continue.${active}`),
        desc: T(`continue.${active}.desc`),
        points: [T(`continue.${active}.p1`), T(`continue.${active}.p2`), T(`continue.${active}.p3`)],
      }
    : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-1">
        <h3 className="text-sm font-semibold text-slate-900">{T("continue.title")}</h3>
        <p className="mt-0.5 text-xs text-slate-400">{T("continue.subtitle")}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {DIRECTIONS.map((d) => {
          const isActive = active === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d, T(`continue.${d}`))}
              className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors ${
                isActive
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                  isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {ICONS[d]}
              </span>
              <span className="text-xs font-semibold leading-snug">{T(`continue.${d}`)}</span>
            </button>
          );
        })}
      </div>

      {activeData ? (
        <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/60 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {T("continue.selectHint")}
          </p>
          <h4 className="mt-1 text-sm font-semibold text-slate-900">{activeData.label}</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{activeData.desc}</p>
          <ul className="mt-3 space-y-2">
            {activeData.points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
          <p className="mt-4 inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700">
            {T("continue.templateNote")}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-400">{T("continue.selectHint")}</p>
      )}
    </section>
  );
}