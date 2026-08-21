-- M2.14.0 Action Execution Verification
-- Idempotent: safe to re-run via migrate.py. Pure additive: two new tables
-- plus three nullable columns on action_items. No backfill, no ALTER on
-- existing rows, no changes to historical data.

ALTER TABLE action_items ADD COLUMN IF NOT EXISTS target_metric_name VARCHAR(80);
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS target_direction VARCHAR(20);
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS target_metric_source VARCHAR(20) DEFAULT 'none';

CREATE TABLE IF NOT EXISTS action_executions (
  id              BIGSERIAL PRIMARY KEY,
  action_id       BIGINT NOT NULL REFERENCES action_items(id),
  project_id      BIGINT NOT NULL REFERENCES projects(id),
  user_id         BIGINT NOT NULL REFERENCES users(id),
  kind            VARCHAR(20) NOT NULL DEFAULT 'execution',
  note            TEXT,
  evidence        TEXT,
  status_snapshot VARCHAR(20),
  client_key      VARCHAR(120) NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_action_executions_action ON action_executions(action_id);
CREATE INDEX IF NOT EXISTS ix_action_executions_project ON action_executions(project_id);

CREATE TABLE IF NOT EXISTS action_observations (
  id                  BIGSERIAL PRIMARY KEY,
  action_id           BIGINT NOT NULL REFERENCES action_items(id),
  verification_run_id BIGINT NOT NULL REFERENCES analysis_runs(id),
  project_id          BIGINT NOT NULL REFERENCES projects(id),
  metric_name         VARCHAR(80) NOT NULL,
  before_value        NUMERIC(20,4),
  after_value         NUMERIC(20,4),
  absolute_delta      NUMERIC(20,4),
  percent_delta       NUMERIC(20,4),
  direction           VARCHAR(20),
  expected_direction  VARCHAR(20),
  alignment           VARCHAR(30) NOT NULL,
  executed            BOOLEAN NOT NULL DEFAULT FALSE,
  reason              VARCHAR(250),
  source              VARCHAR(30) NOT NULL DEFAULT 'verification_metrics',
  engine_version      VARCHAR(40) NOT NULL DEFAULT 'action_observation_v1',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_action_observation
  ON action_observations(action_id, verification_run_id, metric_name);
CREATE INDEX IF NOT EXISTS ix_action_observations_action ON action_observations(action_id);
CREATE INDEX IF NOT EXISTS ix_action_observations_verification ON action_observations(verification_run_id);
