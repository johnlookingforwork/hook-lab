import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { fetchProfileVideos, fetchVideoTranscript, fetchCaptionTranscript, detectProfilePlatform } from '@/lib/scrapercreators'
import type { Platform } from '@/lib/types'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient()

    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const platform = profile.platform as Platform

    // Re-fetch video list
    const rawVideos = await fetchProfileVideos(profile.profile_url, platform)
    console.log(`[profiles:refresh] fetched ${rawVideos.length} videos for @${profile.handle}`)

    // Get existing transcripts to avoid redundant API calls
    const { data: existing } = await supabase
      .from('profile_videos')
      .select('platform_video_id, script')
      .eq('profile_id', params.id)

    const existingMap = new Map<string, string | null>(
      (existing ?? []).map((r) => [r.platform_video_id, r.script])
    )

    // Batch transcript fetches (5 concurrent)
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
          const existingScript = existingMap.get(v.platformVideoId)
          let script: string | null
          if (existingScript !== undefined && existingScript !== null) {
            script = existingScript
          } else if (v.captionUrl) {
            script = await fetchCaptionTranscript(v.captionUrl)
          } else {
            script = await fetchVideoTranscript(v.videoUrl, platform)
          }
          return {
            profile_id: params.id,
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

    if (withTranscripts.length > 0) {
      const { error: upsertError } = await supabase
        .from('profile_videos')
        .upsert(withTranscripts, { onConflict: 'profile_id,platform_video_id' })
      if (upsertError) throw new Error(upsertError.message)
    }

    // Update last_fetched_at
    await supabase
      .from('profiles')
      .update({ last_fetched_at: new Date().toISOString() })
      .eq('id', params.id)

    // Return refreshed profile
    const { data: refreshed, error: refetchErr } = await supabase
      .from('profiles')
      .select('*, profile_videos(*)')
      .eq('id', params.id)
      .single()

    if (refetchErr) throw new Error(refetchErr.message)
    return NextResponse.json(refreshed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[profiles:refresh]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
