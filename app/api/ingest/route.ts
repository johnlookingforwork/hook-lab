import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { fetchVideoData, detectPlatform } from '@/lib/scrapercreators'
import { getVisualDescription } from '@/lib/openai'
import { classifyHookType } from '@/lib/anthropic'
import { computePerformanceScore } from '@/lib/scoring'
import webvtt from 'node-webvtt'
import sharp from 'sharp'

export async function POST(req: NextRequest) {
  try {
    const { url, testGroupId } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    const platform = detectPlatform(url)
    if (!platform) {
      return NextResponse.json(
        { error: 'Unsupported URL. Please paste a TikTok or Instagram Reels URL.' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 0. Cache check — if this URL was ingested before, clone the existing record
    //    into the new test group without calling any external APIs.
    const { data: cached } = await supabase
      .from('videos')
      .select('*')
      .eq('video_url', url)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cached) {
      const { data: video, error: cloneError } = await supabase
        .from('videos')
        .insert({
          video_url: cached.video_url,
          platform: cached.platform,
          thumbnail_url: cached.thumbnail_url,
          visual_description: cached.visual_description,
          transcript_hook: cached.transcript_hook,
          transcript_full: cached.transcript_full,
          hook_type: cached.hook_type,
          views: cached.views,
          retention_3s_pct: cached.retention_3s_pct,
          watch_time_pct: cached.watch_time_pct,
          shares_saves: cached.shares_saves,
          performance_score: cached.performance_score,
          is_winner: false,
          test_group_id: testGroupId || null,
        })
        .select()
        .single()

      if (cloneError) throw new Error(`Cache clone failed: ${cloneError.message}`)
      return NextResponse.json({ video, cached: true })
    }

    // 1. Fetch video data from ScraperCreators (only runs on first ingest of this URL)
    const videoData = await fetchVideoData(url, platform)

    if (videoData.coverImageUrls.length === 0) {
      return NextResponse.json({ error: 'Could not extract video thumbnail' }, { status: 422 })
    }

    // 2. Download cover image — try each URL until we get a supported format
    const supportedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    let uploadBuffer: Buffer | null = null
    let mimeType = 'image/jpeg'

    for (const coverUrl of videoData.coverImageUrls) {
      const imageRes = await fetch(coverUrl)
      if (!imageRes.ok) {
        console.log(`[ingest] cover fetch failed (${imageRes.status}): ${coverUrl.slice(0, 80)}`)
        continue
      }
      const buf = Buffer.from(await imageRes.arrayBuffer())
      const detected = detectMimeFromBytes(buf)
      console.log(`[ingest] cover url: ${coverUrl.slice(0, 80)}`)
      console.log(`[ingest] content-type: ${imageRes.headers.get('content-type')} | detected: ${detected} (${buf.length} bytes)`)

      if (supportedMimes.includes(detected)) {
        uploadBuffer = buf
        mimeType = detected
        break
      }
      // Try converting unsupported format (HEIC, AVIF, etc.) to JPEG
      try {
        console.log(`[ingest] converting ${detected} to JPEG`)
        uploadBuffer = Buffer.from(await sharp(buf).jpeg({ quality: 90 }).toBuffer())
        mimeType = 'image/jpeg'
        break
      } catch {
        console.log(`[ingest] conversion failed for ${detected}, trying next URL`)
      }
    }

    const ext = mimeType === 'image/webp' ? 'webp'
      : mimeType === 'image/png' ? 'png'
      : mimeType === 'image/gif' ? 'gif'
      : 'jpg'

    // 3. Upload to Supabase Storage (null thumbnailUrl if all cover URLs failed)
    let thumbnailUrl: string | null = null
    if (uploadBuffer) {
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, uploadBuffer, { contentType: mimeType, upsert: false })
      if (uploadError) {
        console.log(`[ingest] storage upload failed: ${uploadError.message}`)
      } else {
        thumbnailUrl = supabase.storage.from('thumbnails').getPublicUrl(fileName).data.publicUrl
      }
    } else {
      console.log(`[ingest] no usable cover image found across ${videoData.coverImageUrls.length} URLs`)
    }

    // 4. GPT-4o visual description (skipped if no usable image) + transcript parsing — run in parallel
    const [visualDescription, transcripts] = await Promise.all([
      uploadBuffer
        ? getVisualDescription(`data:${mimeType};base64,${uploadBuffer.toString('base64')}`)
        : Promise.resolve(''),
      parseTranscripts(videoData.transcriptVtt),
    ])
    const { transcriptHook, transcriptFull } = transcripts

    // 5. Classify hook type
    const hookType = await classifyHookType(transcriptHook, visualDescription)

    // 6. Fetch all existing videos to normalize performance score
    const { data: allVideos } = await supabase
      .from('videos')
      .select('views, retention_3s_pct, watch_time_pct, shares_saves')

    const newVideoMetrics = {
      views: videoData.views,
      retention_3s_pct: videoData.retention3sPct,
      watch_time_pct: videoData.watchTimePct,
      shares_saves: videoData.sharesSaves,
    }

    const performanceScore = computePerformanceScore(
      newVideoMetrics,
      [...(allVideos || []), newVideoMetrics]
    )

    // 7. Insert video record
    const { data: video, error: insertError } = await supabase
      .from('videos')
      .insert({
        video_url: url,
        platform,
        thumbnail_url: thumbnailUrl,
        visual_description: visualDescription,
        transcript_hook: transcriptHook,
        transcript_full: transcriptFull,
        hook_type: hookType,
        views: videoData.views,
        retention_3s_pct: videoData.retention3sPct,
        watch_time_pct: videoData.watchTimePct,
        shares_saves: videoData.sharesSaves,
        performance_score: performanceScore,
        is_winner: false,
        test_group_id: testGroupId || null,
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Database insert failed: ${insertError.message}`)
    }

    return NextResponse.json({ video })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[ingest]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function detectMimeFromBytes(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif'
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp'
  // HEIC/HEIF/AVIF: ISO Base Media File Format — bytes 4-7 are 'ftyp'
  if (buf.length > 11 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    return 'image/heic'
  }
  return 'image/jpeg' // fallback
}

function parseTranscripts(vttString: string | null): { transcriptHook: string; transcriptFull: string } {
  if (!vttString) return { transcriptHook: '', transcriptFull: '' }
  try {
    const parsed = webvtt.parse(vttString, { strict: false })
    const cues: { start: number; text: string }[] = parsed.cues

    const cleanText = (text: string) => text.replace(/<[^>]+>/g, '').trim()

    const transcriptHook = cues
      .filter((cue) => cue.start <= 5)
      .map((cue) => cleanText(cue.text))
      .join(' ')
      .trim()

    const transcriptFull = cues
      .map((cue) => cleanText(cue.text))
      .join(' ')
      .trim()

    return { transcriptHook, transcriptFull }
  } catch {
    return { transcriptHook: '', transcriptFull: '' }
  }
}
