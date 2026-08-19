-- M2.12.4 Business Memory
-- Idempotent: safe to re-run via migrate.py. Pure additive: one aggregate
-- table per project; no backfill, no ALTER on existing tables.
CREATE TABLE IF NOT EXISTS business_memory (
  id                   BIGSERIAL PRIMARY KEY,
  project_id           BIGINT NOT NULL UNIQUE REFERENCES projects(id),
  profile              JSONB NOT NULL DEFAULT '{}',
  latest_metrics       JSONB NOT NULL DEFAULT '{}',
  metric_history       JSONB NOT NULL DEFAULT '{}',
  health_history       JSONB NOT NULL DEFAULT '[]',
  action_summary       JSONB NOT NULL DEFAULT '{}',
  action_recent        JSONB NOT NULL DEFAULT '[]',
  issue_tracker        JSONB NOT NULL DEFAULT '[]',
  verification_history JSONB NOT NULL DEFAULT '[]',
  open_loops           JSONB NOT NULL DEFAULT '[]',
  engine_version       TEXT NOT NULL DEFAULT 'business_memory_v0',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_business_memory_project ON business_memory(project_id);
