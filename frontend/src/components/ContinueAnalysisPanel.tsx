"use client";

import { t, UILanguage } from "@/lib/i18n";
import Card from "@/components/ui/Card";

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
    <Card>
      <div className="mb-1">
        <h3 className="text-h3 text-ink">{T("continue.title")}</h3>
        <p className="mt-0.5 text-sm text-secondary">{T("continue.subtitle")}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {DIRECTIONS.map((d) => {
          const isActive = active === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d, T(`continue.${d}`))}
              className={`flex flex-col items-start gap-2 rounded-card border p-4 text-left transition-colors ${
                isActive
                  ? "border-accent bg-accent/5 text-ink"
                  : "border-border bg-surface text-ink hover:border-accent/40 hover:bg-canvas"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-control text-sm font-bold ${
                  isActive ? "bg-accent text-white" : "bg-canvas text-secondary"
                }`}
              >
                {ICONS[d]}
              </span>
              <span className="text-sm font-semibold leading-snug">{T(`continue.${d}`)}</span>
            </button>
          );
        })}
      </div>

      {activeData ? (
        <div className="mt-5 rounded-control border border-border bg-canvas p-5">
          <p className="text-caption font-semibold uppercase tracking-wider text-secondary">
            {T("continue.selectHint")}
          </p>
          <h4 className="mt-1 text-h3 text-ink">{activeData.label}</h4>
          <p className="mt-1 text-body leading-relaxed text-secondary">{activeData.desc}</p>
          <ul className="mt-3 space-y-2">
            {activeData.points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-body leading-relaxed text-ink">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
          <p className="mt-4 inline-flex rounded-full bg-warning/10 px-3 py-1 text-caption font-medium text-warning">
            {T("continue.templateNote")}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-secondary">{T("continue.selectHint")}</p>
      )}
    </Card>
  );
}