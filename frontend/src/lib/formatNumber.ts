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
 *
 * M2.14.4 Phase 1 (P0): compact display never hides the full value. Every
 * currency formatter returns {display, full}; the full value is available for
 * native tooltips, and metric components never truncate with "..." or clip.
 * 万亿 is added so 12+ digit totals stay readable on mobile.
 */
export const MISSING_VALUE = "—";

export function formatCurrencyCN(
  value: number | null | undefined,
  symbol = "¥",
): string {
  if (value == null || Number.isNaN(Number(value))) return MISSING_VALUE;
  return formatCurrencyCNFull(value, symbol).display;
}

export interface FormattedNumber {
  /** Compact display string (万/亿/万亿) used in cards. */
  display: string;
  /** Full value with thousand separators, used in tooltips/aria-labels. */
  full: string;
}

/**
 * M2.14.4 P0: currency display + full value pair. Numbers at or above
 * 1e12 use truncated 万亿 (two decimals) so the on-screen value never
 * overflows; the exact value is always returned in ``full``.
 */
export function formatCurrencyCNFull(
  value: number | null | undefined,
  symbol = "¥",
): FormattedNumber {
  if (value == null || Number.isNaN(Number(value))) {
    return { display: MISSING_VALUE, full: MISSING_VALUE };
  }
  const num = Number(value);
  const abs = Math.abs(num);
  const full = `${symbol}${num.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
  if (abs >= 1e12) {
    // Truncate instead of round so ¥9999999999999 never renders as ¥10.00万亿.
    const scaled = Math.trunc((abs / 1e12) * 100) / 100;
    const v = num < 0 ? -scaled : scaled;
    return {
      display: `${symbol}${v.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}万亿`,
      full,
    };
  }
  if (abs >= 1e8) {
    const v = num / 1e8;
    return {
      display: `${symbol}${v.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}亿`,
      full,
    };
  }
  if (abs >= 1e4) {
    const v = num / 1e4;
    return {
      display: `${symbol}${v.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}万`,
      full,
    };
  }
  return {
    display: `${symbol}${num.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`,
    full,
  };
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return MISSING_VALUE;
  return Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

/**
 * M2.14.4 P0: plain-number display + full value pair. Keeps two decimals
 * on screen and the full number in the tooltip.
 */
export function formatNumberFull(
  value: number | null | undefined,
): FormattedNumber {
  if (value == null || Number.isNaN(Number(value))) {
    return { display: MISSING_VALUE, full: MISSING_VALUE };
  }
  const num = Number(value);
  const display = formatNumber(num);
  const full = num.toLocaleString("zh-CN", { maximumFractionDigits: 6 });
  return { display, full };
}

/** Ratio (0.12) -> "12.3%"; keeps one decimal, no trailing noise. */
export function formatPercent(
  ratio: number | null | undefined,
  digits = 1,
): string {
  if (ratio == null || Number.isNaN(Number(ratio))) return MISSING_VALUE;
  return `${(Number(ratio) * 100).toFixed(digits)}%`;
}

/**
 * M2.14.4 P0: metric values wrap instead of clipping. No overflow-hidden,
 * no whitespace-nowrap, no text-overflow. Long numbers break onto a second
 * line on mobile and remain fully readable with a native tooltip.
 */
export const metricValueClasses =
  "block w-full min-w-0 break-words text-[clamp(1rem,3.4vw,1.75rem)] font-semibold leading-tight text-ink tabular-nums";
