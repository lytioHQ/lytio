/**
 * M2.14.3 Phase 1 (P3): unified metric display formatting.
 *
 * Single source of truth for how numbers appear across the product
 * (dashboard / demo / executive / verification / memory). Rules:
 *
 *  - currency:          symbol + thousand separators; >=1万 -> "x.x万"; >=1亿 -> "x.xx亿"
 *  - plain numbers:     thousand separators, max 2 decimals
 *  - ratio/percent:     ratio input (0..1) -> "12.3%"
 *  - never fabricate:   null/NaN/undefined -> "—"
 *
 * Chinese-customer-first by design; the currency symbol can be overridden
 * per locale later without changing call sites.
 */
export const MISSING_VALUE = "—";

export function formatCurrencyCN(
  value: number | null | undefined,
  symbol = "¥",
): string {
  if (value == null || Number.isNaN(Number(value))) return MISSING_VALUE;
  const num = Number(value);
  const abs = Math.abs(num);
  if (abs >= 1e8) {
    const v = num / 1e8;
    return `${symbol}${v.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}亿`;
  }
  if (abs >= 1e4) {
    const v = num / 1e4;
    return `${symbol}${v.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}万`;
  }
  return `${symbol}${num.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return MISSING_VALUE;
  return Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

/** Ratio (0.12) -> "12.3%"; keeps one decimal, no trailing noise. */
export function formatPercent(
  ratio: number | null | undefined,
  digits = 1,
): string {
  if (ratio == null || Number.isNaN(Number(ratio))) return MISSING_VALUE;
  return `${(Number(ratio) * 100).toFixed(digits)}%`;
}

/** Default truncation classes for any metric value inside a card. */
export const metricValueClasses =
  "block max-w-full truncate text-[clamp(1.125rem,4.2vw,2rem)] font-semibold leading-tight text-ink tabular-nums";
