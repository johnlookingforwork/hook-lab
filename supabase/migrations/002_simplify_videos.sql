-- Migration 002: Rebuild videos table with simpler manual-entry schema
-- Run this in Supabase SQL editor

-- Drop old table (and cascade to any foreign key refs)
DROP TABLE IF EXISTS videos CASCADE;

-- Create simplified videos table
-- Note: video data is now stored primarily in canvas_state nodes (JSON).
-- This table is a lightweight record for concluded/archived videos.
CREATE TABLE videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_group_id uuid REFERENCES test_groups(id) ON DELETE CASCADE,
  label text,
  instagram_views int,
  tiktok_views int,
  thumbnail_description text,
  script text,
  music_description text,
  created_at timestamptz DEFAULT now()
);
