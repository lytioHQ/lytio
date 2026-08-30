/**
 * M2.14.5 Phase 1.1 Overflow Regression.
 *
 * Verifies the unified metric display contract:
 * - ¥9999999999999 -> "¥9.99万亿" on screen, full value in tooltip
 * - metric value CSS never clips, nowraps, or hides digits
 */
import assert from "node:assert/strict";
import { formatCurrencyCNFull, metricValueClasses } from "../../frontend/src/lib/formatNumber.ts";

const extreme = formatCurrencyCNFull(9999999999999);
assert.equal(extreme.display, "¥9.99万亿");
assert.equal(extreme.full, "¥9,999,999,999,999");

assert.equal(formatCurrencyCNFull(100000000).display, "¥1亿");
assert.equal(formatCurrencyCNFull(1000000).display, "¥100万");
assert.equal(formatCurrencyCNFull(10000).display, "¥1万");
assert.equal(formatCurrencyCNFull(123456.78).display, "¥12.3万");

for (const banned of ["overflow-hidden", "whitespace-nowrap", "text-overflow", "truncate"]) {
  assert.ok(!metricValueClasses.includes(banned), `banned CSS class present: ${banned}`);
}

console.log("OVERFLOW REGRESSION PASS");
