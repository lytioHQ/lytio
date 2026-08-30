-- M2.14.5 Phase 1.1: store full analysis result JSON on projects.
-- The 20k VARCHAR cap silently truncated valid JSON, which emptied the
-- project dashboard report and executive page on large reports.
-- Idempotent Postgres migration: safe to run repeatedly.
-- NEVER run against production without a verified database backup/snapshot.

ALTER TABLE projects
  ALTER COLUMN latest_result_json TYPE TEXT;
