-- Hook Lab v2 — Profile Video Library
-- Run in Supabase SQL Editor

-- Saved social media profiles (TikTok / Instagram accounts)
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform platform_enum NOT NULL,
  handle text NOT NULL,
  profile_url text NOT NULL,
  last_fetched_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(platform, handle)
);

-- Videos fetched from a profile
CREATE TABLE profile_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  platform_video_id text NOT NULL,
  video_url text NOT NULL,
  views int,
  thumbnail_url text,
  script text,
  uploaded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, platform_video_id)
);

CREATE INDEX profile_videos_profile_id_idx ON profile_videos(profile_id);

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profile_videos DISABLE ROW LEVEL SECURITY;
