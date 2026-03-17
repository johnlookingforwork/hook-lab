import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { fetchProfileVideos, fetchVideoTranscript, fetchCaptionTranscript, detectProfilePlatform, parseHandle } from '@/lib/scrapercreators'
import type { Platform } from '@/lib/types'

async function fetchAndStoreProfile(url: string, existingProfileId?: string) {
  const supabase = createServiceClient()

  const platform = detectProfilePlatform(url)
  if (!platform) {
    throw new Error('URL must be a TikTok or Instagram profile URL (not a single video URL)')
  }

  const handle = parseHandle(url, platform)
  if (!handle) throw new Error('Could not parse handle from URL')

  // Upsert profile row
  const profilePayload = {
    platform,
    handle,
    profile_url: url,
    last_fetched_at: new Date().toISOString(),
  }

  let profileId: string
  if (existingProfileId) {
    const { error } = await supabase
      .from('profiles')
      .update(profilePayload)
      .eq('id', existingProfileId)
    if (error) throw new Error(error.message)
    profileId = existingProfileId
  } else {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'platform,handle' })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    profileId = data.id
  }

  // Fetch raw video list from ScraperCreators
  const rawVideos = await fetchProfileVideos(url, platform)
  console.log(`[profiles] fetched ${rawVideos.length} videos for @${handle}`)

  // For refresh: get existing videos to avoid re-fetching transcripts we already have
  const { data: existing } = await supabase
    .from('profile_videos')
    .select('platform_video_id, script')
    .eq('profile_id', profileId)

  const existingMap = new Map<string, string | null>(
    (existing ?? []).map((r) => [r.platform_video_id, r.script])
  )

  // Fetch transcripts in batches of 5 concurrently
  const BATCH = 5
  const withTranscripts: Array<{
    profile_id: string
    platform_video_id: string
    video_url: string
    views: number | null
    thumbnail_url: string | null
    script: string | null
  }> = []

  for (let i = 0; i < rawVideos.length; i += BATCH) {
    const chunk = rawVideos.slice(i, i + BATCH)
    const results = await Promise.all(
      chunk.map(async (v) => {
        // Skip transcript fetch if we already have it
        const existingScript = existingMap.get(v.platformVideoId)
        let script: string | null
        if (existingScript !== undefined && existingScript !== null) {
          script = existingScript
        } else if (v.captionUrl) {
          // Use caption URL from profile response directly (no API credit)
          script = await fetchCaptionTranscript(v.captionUrl)
        } else {
          script = await fetchVideoTranscript(v.videoUrl, platform as Platform)
        }

        return {
          profile_id: profileId,
          platform_video_id: v.platformVideoId,
          video_url: v.videoUrl,
          views: v.views,
          thumbnail_url: v.thumbnailUrl,
          script,
          uploaded_at: v.uploadedAt,
        }
      })
    )
    withTranscripts.push(...results)
  }

  // Upsert all videos
  if (withTranscripts.length > 0) {
    const { error: videoError } = await supabase
      .from('profile_videos')
      .upsert(withTranscripts, { onConflict: 'profile_id,platform_video_id' })
    if (videoError) throw new Error(videoError.message)
  }

  // Return the full profile with videos
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('*, profile_videos(*)')
    .eq('id', profileId)
    .single()

  if (fetchError) throw new Error(fetchError.message)
  return profile
}

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*, profile_videos(*)')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  try {
    const { url }: { url: string } = await req.json()
    if (!url?.trim()) return NextResponse.json({ error: 'url is required' }, { status: 400 })

    const profile = await fetchAndStoreProfile(url.trim())
    return NextResponse.json(profile)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[profiles POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
