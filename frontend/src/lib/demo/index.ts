/**
 * M2.14.2 Demo snapshot loader + adapters.
 *
 * Single source of truth for the public Demo:
 * - `demo_result.json` is generated offline by
 *   `backend/scripts/generate_demo_fixture.py` running the real production
 *   pipeline (canonical schema -> metric engine -> health score).
 * - All UI copy lives in i18n (`demo.*`); the snapshot only stores facts and
 *   stable ids. Numeric values are identical across all four languages.
 * - Each period carries its own narrative: insights, risks, recommendations,
 *   actions and verification are driven by that period's business facts, so
 *   switching periods shows a genuinely different operating story — not the
 *   same text with different numbers.
 *
 * The adapters below shape the snapshot into the exact props consumed by the
 * production components, so the Demo renders with the same components as the
 * Executive report (no second hand-written mock structure).
 */
import demoJson from "./demo_result.json";
import type { UILanguage } from "@/lib/i18n";
import type { HealthScoreData } from "@/components/business/HealthScoreBreakdown";
import type { DemoActionItem } from "@/components/business/BusinessActions";
import type { BusinessMemoryData } from "@/components/business/BusinessMemoryCard";
import { formatCurrencyFull, formatNumber, formatPercent } from "@/lib/formatNumber";

// ---------------------------------------------------------------------------
// Snapshot types (mirror of generate_demo_fixture.py output)
// ---------------------------------------------------------------------------

export interface DemoMeta {
  schema_version: string;
  engine_version: string;
  health_score_engine: string;
  generated_at: string;
  source_commit: string;
  sample_file: string;
  data_md5: string;
}

export interface DemoSchemaMappingItem {
  canonical_key: string;
  source_column: string | null;
  confidence: number;
  value_type: string;
  availability: string;
  match_method: string;
  required: boolean;
  example_values: unknown[];
  confirmation_status: string;
  confirmation_source: string;
}

export interface DemoSchemaMapping {
  version: number;
  schema_version: string;
  mappings: DemoSchemaMappingItem[];
  missing: string[];
  conflicts: string[];
  sales_core_available: boolean;
}

export interface DemoComputedMetric {
  metric_name: string;
  value: number | string | { min: string; max: string } | null;
  formula: string;
  source_columns: string[];
  evidence_rows: unknown[];
  availability: string;
  confidence: string;
  assumptions: string[];
  note: string;
}

export interface DemoKeyMetric {
  metric_name: string;
  value: number | string | null;
  display: string;
  availability: string;
  confidence: string;
  formula: string;
  assumptions: string[];
  note: string;
}

export interface DemoNarrativeItem {
  id: string;
  confidence?: string;
  severity?: string;
  priority?: string;
}

export interface DemoPeriodNarrative {
  summary_key: string;
  params: DemoParams;
  insights: DemoNarrativeItem[];
  risks: DemoNarrativeItem[];
  recommendations: DemoNarrativeItem[];
  actions: DemoActionItem[];
}

export interface DemoPeriod {
  period_id: number;
  schema_meta: {
    schema_version: string;
    mapping_source: string;
    confirmation_status: string;
    confirmed_at: string | null;
    source_file: string | null;
    conflicts: string[];
  };
  schema_mapping: DemoSchemaMapping;
  computed_metrics: DemoComputedMetric[];
  health_score: HealthScoreData;
  key_metrics: DemoKeyMetric[];
  narrative?: DemoPeriodNarrative;
  verification?: DemoVerification | null;
}

export interface DemoVerificationMetricChange {
  metric: string;
  before: string | null;
  after: string | null;
  absolute_delta: number | null;
  percent_delta: string | null;
  direction: string;
  status: string;
}

export interface DemoVerification {
  run_id: number;
  parent_run_id: number | null;
  verdict: string | null;
  confidence: string | null;
  reliability: string | null;
  metric_changes: DemoVerificationMetricChange[];
}

export interface DemoTimelinePoint {
  id: number;
  run_id: number;
  created_at: string;
  business_health_score: number;
  level: string;
  period: string;
  summary_key: string;
}

export interface DemoParams {
  total_sales: string;
  growth: string;
  growth_sign: string;
  concentration: string;
  customers: string;
  aov: string;
  top_product: string;
  health_score: string;
  health_level: string;
}

export interface DemoNarrative {
  insights: DemoNarrativeItem[];
  risks: DemoNarrativeItem[];
  recommendations: DemoNarrativeItem[];
  actions: DemoActionItem[];
  verification: DemoVerification;
  memory: BusinessMemoryData;
  timeline: DemoTimelinePoint[];
  params: DemoParams;
}

export interface DemoResult {
  meta: DemoMeta;
  supported_metrics: string[];
  periods: DemoPeriod[];
  narrative: DemoNarrative;
}

// ---------------------------------------------------------------------------
// Snapshot load
// ---------------------------------------------------------------------------

export const DEMO_RESULT = demoJson as DemoResult;
export const DEMO_META: DemoMeta = DEMO_RESULT.meta;
export const DEMO_PERIOD_COUNT = DEMO_RESULT.periods.length;

const DISPLAY_METRICS = [
  "total_sales",
  "order_count",
  "average_order_value",
  "customer_count",
  "customer_concentration",
] as const;

type TFunc = (key: string, params?: Record<string, string | number>) => string;

export function demoCurrencyForLang(lang: UILanguage): string {
  if (lang === "en") return "USD";
  if (lang === "ja") return "JPY";
  if (lang === "de") return "EUR";
  return "CNY";
}

const PRODUCT_I18N_KEY: Record<string, string> = {
  "智能手表": "smartwatch",
};

function demoProductName(product: string, T: TFunc): string {
  const key = `demo.product.${PRODUCT_I18N_KEY[product] ?? product}`;
  const translated = T(key);
  return translated === key ? product : translated;
}

function parseNumber(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === "" || raw === "—" || raw === "-") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = String(raw)
    .replace(/[¥￥元RMBCNY\s,，%]/gi, "")
    .replace(/万亿/g, "e12")
    .replace(/亿/g, "e8")
    .replace(/万/g, "e4");
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

function percentRatio(raw: number | string | null | undefined): number | null {
  const n = parseNumber(raw);
  if (n == null) return null;
  return Math.abs(n) <= 1 ? n : n / 100;
}

function formatDemoPercent(
  raw: number | string | null | undefined,
  lang: UILanguage,
  digits = 1,
): string {
  const ratio = percentRatio(raw);
  return ratio == null ? "—" : formatPercent(ratio, digits, lang);
}

function formatSignedPercent(raw: number | string | null | undefined, lang: UILanguage): string {
  const ratio = percentRatio(raw);
  if (ratio == null) return "—";
  const body = formatPercent(Math.abs(ratio), 1, lang);
  if (ratio > 0) return `+${body}`;
  if (ratio < 0) return `-${body}`;
  return body;
}

function isCurrencyMetric(name: string): boolean {
  return name === "total_sales" || name === "average_order_value";
}

function formatMetricDisplay(
  name: string,
  rawValue: number | string | null | undefined,
  lang: UILanguage,
  currency = "CNY",
): { display: string; full?: string } {
  if (rawValue == null || rawValue === "") return { display: "—" };
  if (isCurrencyMetric(name)) {
    const num = parseNumber(rawValue);
    if (num == null) return { display: String(rawValue) };
    const pair = formatCurrencyFull(num, lang, currency);
    return { display: pair.display, full: pair.full };
  }
  if (name === "customer_concentration" || name === "sales_growth") {
    return { display: formatDemoPercent(rawValue, lang) };
  }
  const num = parseNumber(rawValue);
  if (num == null) return { display: String(rawValue) };
  return { display: formatNumber(num, lang) };
}

export function formatMetricValue(
  m: DemoComputedMetric,
  T: TFunc,
  lang: UILanguage = "zh",
  currency = "CNY",
): string {
  if (m.availability !== "available" || m.value == null) return "—";
  if (m.metric_name === "customer_concentration") {
    const ratio = percentRatio(Number(m.value));
    return `${T("metric.top1")} ${ratio == null ? "—" : formatPercent(ratio, 1, lang)}`;
  }
  if (m.metric_name === "total_sales" || m.metric_name === "average_order_value") {
    const num = parseNumber(m.value as number | string | null | undefined);
    return num == null ? "—" : formatCurrencyFull(num, lang, currency).display;
  }
  const num = parseNumber(m.value as number | string | null | undefined);
  return num == null ? "—" : formatNumber(num, lang);
}

export function demoPeriodAt(index: number): DemoPeriod {
  const period = DEMO_RESULT.periods[index];
  if (!period) throw new Error(`demo period out of range: ${index}`);
  return period;
}

export const demoLatestPeriod = (): DemoPeriod => demoPeriodAt(DEMO_PERIOD_COUNT - 1);

function periodNarrative(period: DemoPeriod): DemoPeriodNarrative {
  if (period.narrative) return period.narrative;
  // Backward-compatible fallback: latest snapshot narrative.
  return {
    summary_key: "demo.summary",
    params: DEMO_RESULT.narrative.params,
    insights: DEMO_RESULT.narrative.insights,
    risks: DEMO_RESULT.narrative.risks,
    recommendations: DEMO_RESULT.narrative.recommendations,
    actions: DEMO_RESULT.narrative.actions,
  };
}

// ---------------------------------------------------------------------------
// Adapters -> production component props
// ---------------------------------------------------------------------------

export interface DemoHealthCardData {
  score: number;
  level: string;
  summary: string;
}

export function buildDemoHealthCard(
  period: DemoPeriod,
  T: TFunc,
  lang: UILanguage = "zh",
  currency = "CNY",
): DemoHealthCardData {
  const hs = period.health_score;
  const params = periodNarrative(period).params;
  const total = parseNumber(params.total_sales);
  return {
    score: Number(hs.health_score ?? 0),
    level: hs.health_level ?? "—",
    summary: T("demo.health.summary", {
      health: formatNumber(parseNumber(params.health_score) ?? 0, lang),
      level: T(`health.level.${params.health_level}`) || params.health_level,
      growth: formatSignedPercent(params.growth, lang),
      total: total == null ? "—" : formatCurrencyFull(total, lang, currency).display,
      product: demoProductName(params.top_product, T),
    }),
  };
}

export interface DemoMetricGridItem {
  name: string;
  value: string;
  trend: "up" | "down" | "stable";
  /** M2.14.4 P0: exact value for the tooltip; never displayed with "...". */
  fullValue?: string;
}

function compareValues(a: number | string | null | undefined, b: number | string | null | undefined): "up" | "down" | "stable" {
  if (a == null || b == null) return "stable";
  const na = Number(a);
  const nb = Number(b);
  if (Number.isNaN(na) || Number.isNaN(nb)) return "stable";
  if (na > nb) return "up";
  if (na < nb) return "down";
  return "stable";
}

export function buildDemoMetricGrid(
  period: DemoPeriod,
  T: TFunc,
  lang: UILanguage = "zh",
  currency = "CNY",
): DemoMetricGridItem[] {
  const index = DEMO_RESULT.periods.findIndex((p) => p.period_id === period.period_id);
  const previous = index > 0 ? DEMO_RESULT.periods[index - 1] : null;
  return period.key_metrics.map((km) => {
    const prev = previous?.key_metrics.find((p) => p.metric_name === km.metric_name);
    const display = formatMetricDisplay(km.metric_name, km.value, lang, currency);
    return {
      name: T(`metric.name.${km.metric_name}`),
      value: display.display,
      fullValue: display.full ?? (km.value != null ? String(km.value) : km.display),
      trend: compareValues(km.value, prev?.value),
    };
  });
}

export interface DemoInsightData {
  title: string;
  description: string;
  confidence: string;
}

export interface DemoRiskData {
  title: string;
  description: string;
  severity: string;
}

export interface DemoRecData {
  title: string;
  description: string;
  priority: string;
}

function narrativeTitle(kind: "insight" | "risk" | "rec", id: string): string {
  // id like "insight_growth" -> "demo.insight.growthTitle"
  return `demo.${kind}.${id.replace(`${kind}_`, "")}Title`;
}

function narrativeDesc(kind: "insight" | "risk" | "rec", id: string): string {
  return `demo.${kind}.${id.replace(`${kind}_`, "")}Desc`;
}

export function buildDemoInsights(period: DemoPeriod, T: TFunc): DemoInsightData[] {
  return periodNarrative(period).insights.map((item) => ({
    title: T(narrativeTitle("insight", item.id)),
    description: T(narrativeDesc("insight", item.id)),
    confidence: item.confidence ?? "medium",
  }));
}

export function buildDemoRisks(period: DemoPeriod, T: TFunc): DemoRiskData[] {
  return periodNarrative(period).risks.map((item) => ({
    title: T(narrativeTitle("risk", item.id)),
    description: T(narrativeDesc("risk", item.id)),
    severity: item.severity ?? "medium",
  }));
}

export function buildDemoRecs(period: DemoPeriod, T: TFunc): DemoRecData[] {
  return periodNarrative(period).recommendations.map((item) => ({
    title: T(`demo.rec.${item.id.replace("rec_", "")}Title`),
    description: T(`demo.rec.${item.id.replace("rec_", "")}.desc`),
    priority: item.priority ?? "medium",
  }));
}

export function buildDemoExecutiveSummary(
  period: DemoPeriod,
  T: TFunc,
  lang: UILanguage = "zh",
  currency = "CNY",
): string {
  const params = periodNarrative(period).params;
  const total = parseNumber(params.total_sales);
  const aov = parseNumber(params.aov);
  const customers = parseNumber(params.customers);
  const health = parseNumber(params.health_score);
  return T(periodNarrative(period).summary_key, {
    total: total == null ? "—" : formatCurrencyFull(total, lang, currency).display,
    growth: formatSignedPercent(params.growth, lang),
    health: health == null ? "—" : formatNumber(health, lang),
    level: T(`health.level.${params.health_level}`) || params.health_level,
    concentration: formatDemoPercent(params.concentration, lang),
    customers: customers == null ? "—" : formatNumber(customers, lang),
    product: demoProductName(params.top_product, T),
    aov: aov == null ? "—" : formatCurrencyFull(aov, lang, currency).display,
  });
}

export function buildDemoActions(period: DemoPeriod): DemoActionItem[] {
  return periodNarrative(period).actions.map((a) => ({
    ...a,
    description_key: a.description_key,
    expected_result_key: a.expected_result_key,
    reason_key: a.reason_key,
  }));
}

export function buildDemoMemory(): BusinessMemoryData {
  // Snapshot memory was produced by the real memory pipeline; the component
  // only reads it. Unknown fields are ignored at render time.
  return DEMO_RESULT.narrative.memory;
}

export interface DemoTimelineItem {
  id: number;
  run_id: number;
  created_at: string;
  score: number;
  level: string;
  period: string;
  summary: string;
}

export function buildDemoTimeline(T: TFunc): DemoTimelineItem[] {
  return DEMO_RESULT.narrative.timeline.map((item) => ({
    id: item.id,
    run_id: item.run_id,
    created_at: item.created_at,
    score: item.business_health_score,
    level: item.level,
    period: item.period,
    summary: T(item.summary_key),
  }));
}

export interface DemoVerificationView {
  run_id: number;
  parent_run_id: number | null;
  verdict: string | null;
  confidence: string | null;
  reliability: string | null;
  metric_changes: DemoVerificationMetricChange[];
}

export function buildDemoVerification(period: DemoPeriod): DemoVerificationView | null {
  return period.verification ?? DEMO_RESULT.narrative.verification;
}

export { DISPLAY_METRICS };
