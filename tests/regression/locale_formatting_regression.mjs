/**
 * M2.14.5.x Locale / Currency Regression.
 *
 * Runs the locale-aware formatters in a real Node process and asserts:
 * - zh keeps compact CNY display
 * - en/ja/de use locale separators and CNY code, never Chinese units
 * - plain numbers and percentages follow the active locale
 * - formatting never converts the underlying business currency
 */
import assert from "node:assert/strict";
import {
  formatCurrencyFull,
  formatNumber,
  formatPercent,
  formatPercentSigned,
} from "../../frontend/src/lib/formatNumber.ts";

const NBSP = "\u00a0";
const YEN = "\u00a5";
const WAN = "\u4e07";
const YI = "\u4ebf";
const WANYI = "\u4e07\u4ebf";
const BANNED_CHINESE = new Set([...YEN + WANYI + YI + "\u5143", ..."\u4e07\u4ebf\u5143"]);

function noChineseUnits(text, lang) {
  for (const ch of text) {
    if (BANNED_CHINESE.has(ch)) {
      throw new Error(`${lang} leaked Chinese unit/symbol ${ch} in ${text}`);
    }
  }
}

const currencyValues = [0, 1234, 125000, 1250000, 1789000, 123456789];

for (const v of currencyValues) {
  const zh = formatCurrencyFull(v, "zh");
  const en = formatCurrencyFull(v, "en");
  const ja = formatCurrencyFull(v, "ja");
  const de = formatCurrencyFull(v, "de");

  assert.ok(zh.display.includes(YEN), `zh currency missing yen: ${zh.display}`);
  noChineseUnits(en.display, "en");
  noChineseUnits(en.full, "en");
  noChineseUnits(ja.display, "ja");
  noChineseUnits(ja.full, "ja");
  noChineseUnits(de.display, "de");
  noChineseUnits(de.full, "de");
  assert.ok(!en.display.includes(WAN) && !en.display.includes(YI), "en compact unit leaked");
  assert.ok(en.display.includes("CNY") || en.display.includes("RMB"), "en currency code missing");
  assert.ok(ja.display.includes("CNY") || ja.display.includes("RMB"), "ja currency code missing");
  assert.ok(de.display.includes("CNY") || de.display.includes("RMB"), "de currency code missing");
}

assert.equal(formatCurrencyFull(125000, "zh").display, `${YEN}12.5${WAN}`);
assert.equal(formatCurrencyFull(1250000, "zh").display, `${YEN}125${WAN}`);
assert.equal(formatCurrencyFull(1789000, "zh").display, `${YEN}178.9${WAN}`);
assert.equal(formatCurrencyFull(123456789, "zh").display, `${YEN}1.23${YI}`);
assert.equal(formatCurrencyFull(125000, "en").display, `CNY${NBSP}125,000`);
assert.equal(formatCurrencyFull(125000, "en").full, `CNY${NBSP}125,000.00`);
assert.equal(formatCurrencyFull(1234, "de").display, `1.234${NBSP}CNY`);
assert.equal(formatCurrencyFull(1234, "de").full, `1.234,00${NBSP}CNY`);

assert.equal(formatNumber(1234, "en"), "1,234");
assert.equal(formatNumber(1234567.89, "ja"), "1,234,567.89");
assert.equal(formatNumber(1234567.89, "de"), "1.234.567,89");

assert.equal(formatPercent(0.1234, 1, "zh"), "12.3%");
assert.equal(formatPercent(0.1234, 1, "en"), "12.3%");
assert.equal(formatPercent(0.1234, 1, "ja"), "12.3%");
assert.equal(formatPercent(0.1234, 1, "de"), `12,3${NBSP}%`);
assert.equal(formatPercentSigned(0.4091, 1, "en"), "+40.9%");
assert.equal(formatPercentSigned(-0.4211, 1, "de"), `-42,1${NBSP}%`);
assert.equal(formatPercentSigned(0, 1, "en"), "0%");

console.log("LOCALE FORMATTING REGRESSION PASS");
