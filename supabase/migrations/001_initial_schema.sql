-- Hook Lab v1 — Initial Schema
-- Run this in the Supabase SQL editor or via `supabase db push`

-- Enums
CREATE TYPE platform_enum AS ENUM ('tiktok', 'instagram_reels');
CREATE TYPE group_status_enum AS ENUM ('active', 'concluded');

-- test_groups: named containers for A/B test variants
CREATE TABLE test_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status group_status_enum NOT NULL DEFAULT 'active',
  canvas_position jsonb, -- {x, y} on the main WIP canvas; null when concluded
  created_at timestamptz DEFAULT now()
);

-- videos: each ingested video variant
CREATE TABLE videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url text NOT NULL,
  platform platform_enum NOT NULL,
  thumbnail_url text, -- permanent Supabase Storage URL
  visual_description text, -- 10-word GPT-4o vision description
  transcript_hook text, -- first 0-5s of transcript (hook excerpt)
  transcript_full text, -- complete VTT transcript (plain text, cue-stripped) for full-clip analysis
  hook_type text, -- mapped to taxonomy by LLM
  views int,
  retention_3s_pct float,
  watch_time_pct float,
  shares_saves int,
  performance_score float, -- weighted composite 0-100
  is_winner boolean DEFAULT false,
  test_group_id uuid REFERENCES test_groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- canvas_state: persisted React Flow node/edge positions
-- test_group_id = null → main WIP canvas
-- test_group_id set → snapshot of a concluded test canvas
CREATE TABLE canvas_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nodes jsonb NOT NULL DEFAULT '[]',
  edges jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz DEFAULT now(),
  test_group_id uuid UNIQUE REFERENCES test_groups(id) ON DELETE CASCADE
);

-- Ensure only one main WIP canvas state row exists (test_group_id IS NULL)
CREATE UNIQUE INDEX canvas_state_main_unique ON canvas_state ((test_group_id IS NULL)) WHERE test_group_id IS NULL;

-- Indexes for common queries
CREATE INDEX videos_test_group_id_idx ON videos(test_group_id);
CREATE INDEX videos_is_winner_idx ON videos(is_winner) WHERE is_winner = true;
CREATE INDEX test_groups_status_idx ON test_groups(status);

-- Supabase Storage bucket for thumbnails (run separately in Storage UI if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);
-- Or run: supabase storage create-bucket thumbnails --public

-- RLS: disabled for v1 single-user; enable in v2 with auth
ALTER TABLE test_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_state DISABLE ROW LEVEL SECURITY;
