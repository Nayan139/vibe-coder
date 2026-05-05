-- ============================================================
-- VibeCode — Phase 5 Supabase Migration
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to run multiple times — all statements use IF NOT EXISTS
-- or ALTER … IF NOT EXISTS guards.
-- ============================================================

-- ── 1. projects — add run/install command columns ─────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS run_command     text,
  ADD COLUMN IF NOT EXISTS install_command text;

-- ── 2. ai_sessions — add Phase 5 columns ─────────────────────────────────────

ALTER TABLE ai_sessions
  ADD COLUMN IF NOT EXISTS title              text,
  ADD COLUMN IF NOT EXISTS accumulated_changes jsonb,
  ADD COLUMN IF NOT EXISTS llm_provider       text,
  ADD COLUMN IF NOT EXISTS llm_model          text;

-- Rename old narrow "status" values to Phase 5 set (non-destructive).
-- Existing rows with 'pending'/'running'/'done'/'error' are left as-is;
-- the app handles all of these gracefully.

-- ── 3. chat_messages — add Phase 5 columns ───────────────────────────────────

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS selected_files   jsonb,
  ADD COLUMN IF NOT EXISTS changes_snapshot jsonb;

-- ── 4. created_files — new table for AI-created files (including .env) ───────

CREATE TABLE IF NOT EXISTS created_files (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        REFERENCES ai_sessions  ON DELETE CASCADE,
  project_id  uuid        REFERENCES projects      ON DELETE CASCADE,
  file_path   text        NOT NULL,
  content     text        NOT NULL,
  is_env_file boolean     NOT NULL DEFAULT false,
  committed   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE created_files ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own created files (via session ownership)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'created_files'
      AND policyname = 'Users see own created files'
  ) THEN
    CREATE POLICY "Users see own created files"
      ON created_files
      FOR ALL
      USING (
        session_id IN (
          SELECT id FROM ai_sessions WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;
