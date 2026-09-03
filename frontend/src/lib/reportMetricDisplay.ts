/**
 * M2.14.5.x report metric display adapter.
 *
 * Legacy/executive report metrics arrive as display-shaped objects:
 * `{ name: "总销售额", value: "107040.0", trend: "up" }` with no canonical
 * `metric_name`. This pure adapter maps the stored human label back to a
 * canonical metric key and re-renders the value with the active UI locale
 * without changing the underlying number or business currency.
 */
import { formatCurrencyFull, formatNumberFull, formatPercent } from "@/lib/formatNumber";

export interface ReportMetricSource {
  name: string;
  value: string;
  trend?: string;
  fullValue?: string;
}

export interface LocalizedReportMetric {
  name: string;
  value: string;
  fullValue: string;
}

export type MetricLocale = "zh" | "en" | "ja" | "de";

type MetricTranslator = (key: string) => string;

const METRIC_ALIASES: Record<string, string> = {
  // zh
  总销售额: "total_sales",
  销售总额: "total_sales",
  销售额: "total_sales",
  营收: "total_sales",
  收入: "total_sales",
  月度销售增长率: "sales_growth",
  销售增长率: "sales_growth",
  销售额增长率: "sales_growth",
  销售增长: "sales_growth",
  增长率: "sales_growth",
  订单数: "order_count",
  订单量: "order_count",
  订单数量: "order_count",
  成交数量: "order_count",
  成交订单数: "order_count",
  平均订单金额: "average_order_value",
  平均客单价: "average_order_value",
  客单价: "average_order_value",
  订单均价: "average_order_value",
  客户数: "customer_count",
  客户数量: "customer_count",
  客户总量: "customer_count",
  客户集中度: "customer_concentration",
  集中度: "customer_concentration",
  top1客户占比: "customer_concentration",
  top客户占比: "customer_concentration",
  畅销产品: "product_sales_rank",
  利润: "profit_amount",
  利润金额: "profit_amount",
  折扣率: "discount_rate",
  流失原因: "lost_reason",
  数据行数: "row_count",
  行数: "row_count",
  数据周期: "date_range",
  日期范围: "date_range",
  // en (lowercased at lookup time)
  "total sales": "total_sales",
  "sales total": "total_sales",
  sales: "total_sales",
  revenue: "total_sales",
  "sales growth": "sales_growth",
  "sales growth rate": "sales_growth",
  "growth rate": "sales_growth",
  growth: "sales_growth",
  orders: "order_count",
  "order count": "order_count",
  "order total": "order_count",
  "avg order value": "average_order_value",
  "average order value": "average_order_value",
  aov: "average_order_value",
  customers: "customer_count",
  "customer count": "customer_count",
  "customer concentration": "customer_concentration",
  "concentration risk": "customer_concentration",
  concentration: "customer_concentration",
  "top product": "product_sales_rank",
  "best selling product": "product_sales_rank",
  "best-selling product": "product_sales_rank",
  profit: "profit_amount",
  "profit amount": "profit_amount",
  "discount rate": "discount_rate",
  "lost reason": "lost_reason",
  "churn reason": "lost_reason",
  "data rows": "row_count",
  "row count": "row_count",
  rows: "row_count",
  "data period": "date_range",
  "date range": "date_range",
  // ja
  総売上: "total_sales",
  売上: "total_sales",
  売上高: "total_sales",
  総売上高: "total_sales",
  売上成長: "sales_growth",
  売上成長率: "sales_growth",
  注文数: "order_count",
  平均注文単価: "average_order_value",
  平均客単価: "average_order_value",
  顧客数: "customer_count",
  顧客総数: "customer_count",
  顧客集中度: "customer_concentration",
  売れ筋商品: "product_sales_rank",
  利益: "profit_amount",
  利益額: "profit_amount",
  割引率: "discount_rate",
  失注理由: "lost_reason",
  データ行数: "row_count",
  データ期間: "date_range",
  期間: "date_range",
  // de
  gesamtumsatz: "total_sales",
  umsatz: "total_sales",
  umsatzwachstum: "sales_growth",
  bestellungen: "order_count",
  bestellanzahl: "order_count",
  "anzahl bestellungen": "order_count",
  "ø bestellwert": "average_order_value",
  "Ø bestellwert": "average_order_value",
  "durchschnittlicher bestellwert": "average_order_value",
  kunden: "customer_count",
  kundenanzahl: "customer_count",
  kundenkonzentration: "customer_concentration",
  "top-produkt": "product_sales_rank",
  "meistverkauftes produkt": "product_sales_rank",
  meistverkauftesprodukt: "product_sales_rank",
  gewinn: "profit_amount",
  rabattsatz: "discount_rate",
  verlustgrund: "lost_reason",
  datenzeilen: "row_count",
  zeilen: "row_count",
  datenzeitraum: "date_range",
  zeitraum: "date_range",
};

const METRIC_VALUE_KINDS: Record<string, "currency" | "percent" | "number" | "text"> = {
  total_sales: "currency",
  average_order_value: "currency",
  profit_amount: "currency",
  sales_growth: "percent",
  customer_concentration: "percent",
  discount_rate: "percent",
  order_count: "number",
  customer_count: "number",
  row_count: "number",
  product_sales_rank: "text",
  lost_reason: "text",
  date_range: "text",
};

const RAW_NUMBER_PATTERN = /^-?\d[\d,]*(?:\.\d+)?$/;

function canonicalMetricName(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  return METRIC_ALIASES[normalized] ?? null;
}

function rawNumber(value: string): number | null {
  const clean = value.replace(/,/g, "");
  const num = Number(clean);
  return Number.isFinite(num) ? num : null;
}

/** Stored ratios use 0..1; legacy AI strings may already be percent points. */
function percentRatio(raw: number): number {
  if (raw === 0) return 0;
  if (Math.abs(raw) <= 1) return raw;
  if (Math.abs(raw) <= 100) return raw / 100;
  return raw;
}

export function localizeReportMetric(
  metric: ReportMetricSource,
  lang: MetricLocale,
  T: MetricTranslator,
): LocalizedReportMetric {
  const fallback = {
    name: metric.name,
    value: metric.value,
    fullValue: metric.fullValue ?? metric.value,
  };
  const key = canonicalMetricName(metric.name);
  if (!key) return fallback;

  const name = T(`metric.name.${key}`);
  const valueText = String(metric.value ?? "").trim();
  if (!RAW_NUMBER_PATTERN.test(valueText)) {
    return { name, value: metric.value, fullValue: metric.fullValue ?? metric.value };
  }

  const num = rawNumber(valueText);
  if (num == null) return { name, value: metric.value, fullValue: metric.fullValue ?? metric.value };

  switch (METRIC_VALUE_KINDS[key]) {
    case "currency": {
      const pair = formatCurrencyFull(num, lang);
      return { name, value: pair.display, fullValue: pair.full };
    }
    case "percent": {
      const ratio = percentRatio(num);
      return {
        name,
        value: formatPercent(ratio, 1, lang),
        fullValue: formatPercent(ratio, 2, lang),
      };
    }
    case "number": {
      const pair = formatNumberFull(num, lang);
      return { name, value: pair.display, fullValue: pair.full };
    }
    default:
      return { name, value: metric.value, fullValue: metric.fullValue ?? metric.value };
  }
}
