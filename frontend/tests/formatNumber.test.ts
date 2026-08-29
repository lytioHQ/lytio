/**
 * M2.14.4 P0: extreme metric display tests.
 * Run: npx tsc --outDir .tmp-tests src/lib/formatNumber.ts tests/formatNumber.test.ts && node .tmp-tests/tests/formatNumber.test.js
 */
import { formatCurrencyCNFull, formatNumberFull, metricValueClasses } from "../src/lib/formatNumber";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Extreme currency: ¥9999999999999 must stay compact and never overflow.
const extreme = formatCurrencyCNFull(9999999999999);
assert(extreme.display === "¥9.99万亿", `万亿 display wrong: ${extreme.display}`);
assert(extreme.full === "¥9,999,999,999,999", `万亿 full wrong: ${extreme.full}`);
assert(!extreme.display.includes("..."), "display must never contain ellipsis");

// 亿 / 万 boundaries.
const yi = formatCurrencyCNFull(123456789);
assert(yi.display === "¥1.23亿", `亿 display wrong: ${yi.display}`);
assert(yi.full === "¥123,456,789", `亿 full wrong: ${yi.full}`);

const wan = formatCurrencyCNFull(1234567);
assert(wan.display === "¥123.5万", `万 display wrong: ${wan.display}`);
assert(wan.full === "¥1,234,567", `万 full wrong: ${wan.full}`);

// Plain number with tooltip pair.
const n = formatNumberFull(1234567890123);
assert(n.display === "1,234,567,890,123", `plain display wrong: ${n.display}`);
assert(n.full === "1,234,567,890,123", `plain full wrong: ${n.full}`);

// Metric value classes must never clip: no nowrap, no overflow-hidden,
// no text-overflow, and must wrap on long values.
assert(!metricValueClasses.includes("whitespace-nowrap"), "metric classes must not nowrap");
assert(!metricValueClasses.includes("overflow-hidden"), "metric classes must not clip");
assert(!metricValueClasses.includes("text-overflow"), "metric classes must not ellipsis");
assert(metricValueClasses.includes("break-words"), "metric classes must allow wrapping");

// Missing values never fabricate.
const missing = formatCurrencyCNFull(null);
assert(missing.display === "—" && missing.full === "—", "missing must stay —");

console.log("METRIC DISPLAY TESTS PASSED");
