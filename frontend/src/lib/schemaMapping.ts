/**
 * M2.12.0 Schema Layer — canonical field display metadata for the frontend.
 * Mirrors backend/app/services/canonical_schema.py keys. Display text lives
 * in i18n.ts (schema.field.*); this module only maps key -> icon + label key.
 */

export interface SchemaFieldMeta {
  icon: string;
  labelKey: string;
}

export const SCHEMA_FIELD_META: Record<string, SchemaFieldMeta> = {
  order_date: { icon: "📅", labelKey: "schema.field.order_date" },
  sales_amount: { icon: "💰", labelKey: "schema.field.sales_amount" },
  sales_quantity: { icon: "🔢", labelKey: "schema.field.sales_quantity" },
  product_name: { icon: "📦", labelKey: "schema.field.product_name" },
  region: { icon: "🗺️", labelKey: "schema.field.region" },
  customer_name: { icon: "👥", labelKey: "schema.field.customer_name" },
  sales_person: { icon: "🧑‍💼", labelKey: "schema.field.sales_person" },
  pipeline_stage: { icon: "🪜", labelKey: "schema.field.pipeline_stage" },
  lost_reason: { icon: "❌", labelKey: "schema.field.lost_reason" },
  discount_rate: { icon: "🏷️", labelKey: "schema.field.discount_rate" },
  profit_amount: { icon: "📈", labelKey: "schema.field.profit_amount" },
};

export function schemaFieldMeta(key: string): SchemaFieldMeta {
  return SCHEMA_FIELD_META[key] ?? { icon: "🏷️", labelKey: "schema.field.unknown" };
}

export interface SchemaFieldMapping {
  canonical_key: string;
  source_column: string | null;
  confidence: number;
  value_type: string;
  availability: string;
}

export interface SchemaMapping {
  version: number;
  source_headers: string[];
  mappings: SchemaFieldMapping[];
  unmapped: string[];
  missing: string[];
  sales_core_available: boolean;
  detected_at: string;
}
