/**
 * M2.14.5.x locale-aware presentation formatters.
 *
 * Single source of truth for how numbers appear across the product
 * (dashboard / demo / executive / verification / memory). Rules:
 *
 *  - zh:              ¥ + Chinese separators; >=1万 -> "x.x万"; >=1亿 -> "x.xx亿"
 *  - en/ja/de:        CNY code + locale separators, no Chinese compact units
 *                     (万/亿/万亿), no bare ¥ in en.
 *  - plain numbers:   locale thousand separators, max 2 decimals
 *  - percent:         ratio input (0..1) -> locale-aware "12.3%"
 *  - never fabricate: null/NaN/undefined -> "—"
 *
 * Business currency is always CNY/RMB; changing the UI language never
 * converts amounts to another currency.
 *
 * M2.14.4 Phase 1 (P0): compact display never hides the full value. Every
 * currency formatter returns {display, full}; the full value is available for
 * native tooltips, and metric components never truncate with "..." or clip.
 */
import type { UILanguage } from "@/lib/i18n";

export const MISSING_VALUE = "—";

const LANGUAGE_LOCALE: Record<UILanguage, string> = {
  zh: "zh-CN",
  en: "en-US",
  ja: "ja-JP",
  de: "de-DE",
};

/** Keep the historical default for any existing zh-only callers. */
function localeForLang(lang: UILanguage | string): string {
  if (lang in LANGUAGE_LOCALE) return LANGUAGE_LOCALE[lang as UILanguage];
  if (typeof lang === "string" && lang.length > 0) return lang;
  return "zh-CN";
}

function isZh(lang: UILanguage | string): boolean {
  return lang === "zh" || lang === "zh-CN";
}

function isMissing(value: unknown): boolean {
  return value == null || Number.isNaN(Number(value));
}

function currencyFullPair(num: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CNY",
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export interface FormattedNumber {
  /** Compact display string used in cards (zh may use 万/亿; others use locale). */
  display: string;
  /** Full value, used in tooltips/aria-labels. */
  full: string;
}

/** Historical zh-only API, preserved for existing call sites. */
export function formatCurrencyCNFull(
  value: number | null | undefined,
  symbol = "¥",
): FormattedNumber {
  if (isMissing(value)) return { display: MISSING_VALUE, full: MISSING_VALUE };
  const num = Number(value);
  const abs = Math.abs(num);
  const full = `${symbol}${num.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
  if (abs >= 1e12) {
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

/** Historical zh-only API, preserved so existing callers keep working. */
export function formatCurrencyCN(
  value: number | null | undefined,
  symbol = "¥",
): string {
  if (isMissing(value)) return MISSING_VALUE;
  return formatCurrencyCNFull(Number(value), symbol).display;
}

/** Format a CNY amount with the UI locale, never converting to another currency. */
export function formatCurrencyFull(
  value: number | null | undefined,
  lang: UILanguage | string = "zh",
): FormattedNumber {
  if (isMissing(value)) return { display: MISSING_VALUE, full: MISSING_VALUE };
  const num = Number(value);
  const locale = localeForLang(lang);

  if (isZh(lang)) {
    // zh keeps its existing compact 万/亿 presentation and ¥ symbol.
    return {
      display: formatCurrencyCNFull(num).display,
      full: new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "CNY",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num),
    };
  }

  // Non-zh locales: explicit CNY code, full locale number, no Chinese units.
  const full = currencyFullPair(num, locale);
  const display = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CNY",
    currencyDisplay: "code",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
  return { display, full };
}

export function formatCurrency(
  value: number | null | undefined,
  lang: UILanguage | string = "zh",
): string {
  return formatCurrencyFull(value, lang).display;
}

export function formatNumber(
  value: number | null | undefined,
  lang: UILanguage | string = "zh",
): string {
  if (isMissing(value)) return MISSING_VALUE;
  return Number(value).toLocaleString(localeForLang(lang), {
    maximumFractionDigits: 2,
  });
}

/**
 * Plain-number display + full value pair. Keeps two decimals on screen and
 * the full number in the tooltip.
 */
export function formatNumberFull(
  value: number | null | undefined,
  lang: UILanguage | string = "zh",
): FormattedNumber {
  if (isMissing(value)) {
    return { display: MISSING_VALUE, full: MISSING_VALUE };
  }
  const num = Number(value);
  const locale = localeForLang(lang);
  const display = num.toLocaleString(locale, { maximumFractionDigits: 2 });
  const full = num.toLocaleString(locale, { maximumFractionDigits: 6 });
  return { display, full };
}

/** Ratio (0.12) -> locale-aware "12.3%"; keeps one decimal, no trailing noise. */
export function formatPercent(
  ratio: number | null | undefined,
  digits = 1,
  lang: UILanguage | string = "zh",
): string {
  if (isMissing(ratio)) return MISSING_VALUE;
  return new Intl.NumberFormat(localeForLang(lang), {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(ratio));
}

/**
 * Signed ratio formatter for "previous vs latest" deltas; the string keeps
 * its explicit sign in every locale.
 */
export function formatPercentSigned(
  ratio: number | null | undefined,
  digits = 1,
  lang: UILanguage | string = "zh",
): string {
  if (isMissing(ratio)) return MISSING_VALUE;
  const num = Number(ratio);
  if (num === 0) return formatPercent(0, 0, lang);
  const body = new Intl.NumberFormat(localeForLang(lang), {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(num));
  if (num > 0) return `+${body}`;
  if (num < 0) return `-${body}`;
  return body;
}

/**
 * M2.14.4 P0: metric values wrap instead of clipping. No overflow-hidden,
 * no whitespace-nowrap, no text-overflow. Long numbers break onto a second
 * line on mobile and remain fully readable with a native tooltip.
 */
export const metricValueClasses =
  "block w-full min-w-0 break-words text-[clamp(1rem,3.4vw,1.75rem)] font-semibold leading-tight text-ink tabular-nums";
