-- M2.11 Phase B: Verification Run schema.
-- Idempotent Postgres migration: safe to run repeatedly.
-- NEVER run against production without a verified database backup/snapshot.

ALTER TABLE analysis_runs
  ADD COLUMN IF NOT EXISTS analysis_type VARCHAR(30) NOT NULL DEFAULT 'health_scan',
  ADD COLUMN IF NOT EXISTS analysis_direction VARCHAR(50) NOT NULL DEFAULT 'overview',
  ADD COLUMN IF NOT EXISTS parent_run_id INTEGER REFERENCES analysis_runs(id),
  ADD COLUMN IF NOT EXISTS dataset_version VARCHAR(500),
  ADD COLUMN IF NOT EXISTS purpose VARCHAR(50),
  ADD COLUMN IF NOT EXISTS comparison_result TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'completed';

CREATE INDEX IF NOT EXISTS ix_analysis_runs_parent_run_id ON analysis_runs(parent_run_id);
CREATE INDEX IF NOT EXISTS ix_analysis_runs_analysis_type ON analysis_runs(analysis_type);

-- M2.14.5 Phase 1.1 hardening: only backfill rows still holding the column
-- defaults. Rows explicitly persisted by the app (for example verification
-- runs) must never be overwritten on a re-run.
UPDATE analysis_runs
SET
  analysis_type = COALESCE(NULLIF(result_json::jsonb ->> 'analysis_type', ''), 'health_scan'),
  analysis_direction = COALESCE(NULLIF(result_json::jsonb ->> 'analysis_direction', ''), 'overview')
WHERE result_json IS NOT NULL
  AND result_json ~ '^\{'
  AND jsonb_typeof(result_json::jsonb) = 'object'
  AND analysis_type = 'health_scan'
  AND analysis_direction = 'overview';
