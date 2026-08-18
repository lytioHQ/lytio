-- M2.12.0: Canonical schema mapping storage for projects.
-- Idempotent Postgres migration: safe to run repeatedly.
-- NEVER run against production without a verified database backup/snapshot.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS schema_mapping JSONB;
