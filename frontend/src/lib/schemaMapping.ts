/**
 * M2.12.0 Schema Layer — canonical field display metadata for the frontend.
 * Mirrors backend/app/services/canonical_schema.py keys. Display text lives
 * in i18n.ts (schema.field.*); this module only maps key -> icon + label key.
 *
 * M2.14.4 adds unit_price and inventory_turnover_days so the confirmation
 * panel can surface the two fields that previously caused wrong mappings.
 */

export interface SchemaFieldMeta {
  icon: string;
  labelKey: string;
}

export const SCHEMA_FIELD_META: Record<string, SchemaFieldMeta> = {
  order_date: { icon: "📅", labelKey: "schema.field.order_date" },
  sales_amount: { icon: "💰", labelKey: "schema.field.sales_amount" },
  sales_quantity: { icon: "🔢", labelKey: "schema.field.sales_quantity" },
  unit_price: { icon: "🏷️", labelKey: "schema.field.unit_price" },
  inventory_turnover_days: { icon: "🔄", labelKey: "schema.field.inventory_turnover_days" },
  product_name: { icon: "📦", labelKey: "schema.field.product_name" },
  region: { icon: "🗺️", labelKey: "schema.field.region" },
  customer_name: { icon: "👥", labelKey: "schema.field.customer_name" },
  sales_person: { icon: "🧑‍💼", labelKey: "schema.field.sales_person" },
  pipeline_stage: { icon: "🪜", labelKey: "schema.field.pipeline_stage" },
  lost_reason: { icon: "❌", labelKey: "schema.field.lost_reason" },
  discount_rate: { icon: "🏷️", labelKey: "schema.field.discount_rate" },
  profit_amount: { icon: "📈", labelKey: "schema.field.profit_amount" },
  inventory_quantity: { icon: "📦", labelKey: "schema.field.inventory_quantity" },
  cost_amount: { icon: "💸", labelKey: "schema.field.cost_amount" },
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
  /** M2.13.1: exact_synonym | prefix_strip | heuristic_type | user_confirmed */
  match_method?: string;
  required?: boolean;
  example_values?: string[];
  /** pending | confirmed | modified | skipped | auto | unavailable */
  confirmation_status?: string;
  /** system_detection | user_confirmed | auto_accept */
  confirmation_source?: string;
  /** M2.14.4: scoring provenance emitted by the v3 mapper. */
  field_mapping_confidence?: {
    confidence?: number;
    raw_score?: number;
    reasons?: string[];
    needs_confirmation?: boolean;
  };
  /** M2.14.4: ambiguous mappings must be confirmed before auto-computing. */
  needs_confirmation?: boolean;
  /** M2.14.5: customer-facing confidence tier (high | medium | low). */
  confidence_tier?: "high" | "medium" | "low";
  auto_confirmed?: boolean;
  understanding_engine?: string;
}

export interface SchemaMapping {
  version: number;
  source_headers: string[];
  mappings: SchemaFieldMapping[];
  unmapped: string[];
  missing: string[];
  sales_core_available: boolean;
  detected_at: string;
  schema_version?: string;
  conflicts?: SchemaConflict[];
  audit?: SchemaMappingAudit;
  /** M2.14.4: per-header candidate scores (diagnostics). */
  candidate_scores?: Record<string, Record<string, { confidence: number; raw_score?: number; reasons?: string[]; needs_confirmation?: boolean }>>;
  /** M2.14.4: headers with close alternate candidates. */
  ambiguous_columns?: Array<{
    source_column: string;
    top_candidate: string;
    top_confidence: number;
    alternate_candidate: string;
    alternate_confidence: number;
  }>;
  /** M2.14.5: source provenance and business-understanding summary. */
  source_file?: string;
  relationship_evidence?: Record<string, unknown>;
  schema_understanding?: SchemaUnderstandingSummary;
}

export interface SchemaConflict {
  canonical_key: string;
  candidates: string[];
  resolved: boolean;
}

export interface SchemaUnderstandingCoreField {
  canonical_key: string;
  source_column: string;
  confidence_tier: "high" | "medium" | "low";
  status: "recognized" | "needs_review";
}

export interface SchemaUnderstandingSummary {
  status: string;
  quality_score: number;
  auto_confirmed_count: number;
  needs_confirmation_count: number;
  total_fields: number;
  core_fields: SchemaUnderstandingCoreField[];
  risk_fields: Array<{
    canonical_key: string;
    source_column: string;
    confidence_tier: "high" | "medium" | "low";
  }>;
  engine: string;
  agent_reviewed: boolean;
  relationship_evidence?: Record<string, unknown>;
}

export interface SchemaMappingAudit {
  suggested_at?: string | null;
  confirmed_at?: string | null;
  confirmation_status?: string;
  mapping_source?: string;
  schema_version?: string;
  confirmed_by_user_id?: number | null;
  history?: Array<Record<string, unknown>>;
}

export interface SchemaAction {
  canonical_key: string;
  action: "confirm" | "modify" | "skip";
  source_column?: string | null;
}
