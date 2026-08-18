-- M2.12.3 Action Item System
-- Idempotent: safe to re-run via migrate.py. No backfill, no data migration.
CREATE TABLE IF NOT EXISTS action_items (
  id                   BIGSERIAL PRIMARY KEY,
  project_id           BIGINT NOT NULL REFERENCES projects(id),
  source_run_id        BIGINT NOT NULL REFERENCES analysis_runs(id),
  user_id              BIGINT NOT NULL REFERENCES users(id),
  recommendation_id    TEXT,
  description          TEXT NOT NULL,
  detail               TEXT,
  priority_snapshot    TEXT,
  action_type          TEXT NOT NULL DEFAULT 'recommendation',
  evidence_snapshot    TEXT,
  expected_impact      TEXT,
  expected_result      TEXT,
  owner                TEXT,
  deadline             DATE,
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at         TIMESTAMPTZ,
  verification_run_id  BIGINT REFERENCES analysis_runs(id),
  verification_evidence TEXT,
  verified_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_action_items_project_status ON action_items(project_id, status);
CREATE INDEX IF NOT EXISTS ix_action_items_source_run ON action_items(source_run_id);
CREATE INDEX IF NOT EXISTS ix_action_items_verification_run ON action_items(verification_run_id);
