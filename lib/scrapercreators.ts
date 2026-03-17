import type { Platform } from './types'

const API_BASE = 'https://api.scrapecreators.com/v2'

export interface RawProfileVideo {
  platformVideoId: string
  videoUrl: string
  views: number | null
  thumbnailUrl: string | null
  captionUrl?: string | null  // WebVTT URL from platform (TikTok only, no API credit needed)
  uploadedAt: string | null   // ISO 8601 date string from platform create_time
}

/**
 * Parse a creator handle from a profile URL.
 * TikTok:   tiktok.com/@handle  → handle
 * Instagram: instagram.com/handle → handle
 */
export function parseHandle(profileUrl: string, platform: Platform): string {
  try {
    const u = new URL(profileUrl)
    if (platform === 'tiktok') {
      // pathname = "/@handle" or "/@handle/video/..."
      const match = u.pathname.match(/^\/@?([^/]+)/)
      return match?.[1] ?? ''
    } else {
      // pathname = "/handle" or "/handle/"
      const match = u.pathname.match(/^\/([^/]+)/)
      return match?.[1] ?? ''
    }
  } catch {
    return ''
  }
}

/**
 * Detect if a URL is a profile URL (not a single video).
 * Returns 'tiktok' | 'instagram_reels' | null for profiles, or null if it's a single video.
 */
export function detectProfilePlatform(url: string): Platform | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('tiktok.com')) {
      // Single video: /video/... or /@user/video/...
      if (u.pathname.includes('/video/')) return null
      return 'tiktok'
    }
    if (u.hostname.includes('instagram.com')) {
      // Single reel: /reel/... or /p/...
      if (u.pathname.includes('/reel/') || u.pathname.includes('/p/')) return null
      return 'instagram_reels'
    }
    return null
  } catch {
    return null
  }
}

/**
 * Fetch all videos from a creator profile.
 */
export async function fetchProfileVideos(profileUrl: string, platform: Platform): Promise<RawProfileVideo[]> {
  const apiKey = process.env.SCRAPERCREATORS_API_KEY
  if (!apiKey) throw new Error('SCRAPERCREATORS_API_KEY is not set')

  const handle = parseHandle(profileUrl, platform)
  if (!handle) throw new Error(`Could not parse handle from URL: ${profileUrl}`)

  if (platform === 'tiktok') {
    return fetchTikTokProfileVideos(handle, apiKey)
  } else {
    return fetchInstagramProfileVideos(handle, apiKey)
  }
}

async function fetchTikTokProfileVideos(handle: string, apiKey: string): Promise<RawProfileVideo[]> {
  // API requires 'handle' param (not 'username')
  const params = new URLSearchParams({ handle })
  const res = await fetch(`https://api.scrapecreators.com/v3/tiktok/profile/videos?${params}`, {
    headers: { 'x-api-key': apiKey },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ScraperCreators TikTok profile error ${res.status}: ${text}`)
  }

  const data = await res.json()
  console.log('[scraper:profile:tiktok] top-level keys:', Object.keys(data || {}))

  // Response shape: { aweme_list: [...] }
  const rawList: unknown[] = Array.isArray(data?.aweme_list) ? data.aweme_list : []
  console.log('[scraper:profile:tiktok] video count:', rawList.length)

  return rawList.map((item) => {
    const v = item as Record<string, unknown>
    const videoId = String(v?.aweme_id ?? '')
    // Prefer share_url; fall back to constructing canonical URL
    const shareUrl = String((v?.share_info as Record<string, unknown>)?.share_url ?? v?.share_url ?? '')
    const videoUrl = shareUrl || `https://www.tiktok.com/@${handle}/video/${videoId}`
    const views = Number((v?.statistics as Record<string, unknown>)?.play_count ?? 0) || null

    const video = (v?.video ?? {}) as Record<string, unknown>
    // origin_cover tends to be JPEG; cover is often HEIC
    const originUrls = ((video?.origin_cover as Record<string, unknown> | undefined)?.url_list ?? []) as string[]
    const coverUrls = ((video?.cover as Record<string, unknown> | undefined)?.url_list ?? []) as string[]
    const thumbnailUrl = String(originUrls[0] ?? coverUrls[0] ?? '') || null

    // Extract caption URL for free transcript (no API credit needed)
    const claInfo = (video?.cla_info ?? {}) as Record<string, unknown>
    const captionInfos = Array.isArray(claInfo?.caption_infos) ? claInfo.caption_infos as Record<string, unknown>[] : []
    const captionUrl = (captionInfos[0]?.url as string) ?? null

    const uploadedAt = v?.create_time ? new Date(Number(v.create_time) * 1000).toISOString() : null

    return { platformVideoId: videoId, videoUrl, views, thumbnailUrl, captionUrl, uploadedAt }
  }).filter((v) => v.platformVideoId)
}

async function fetchInstagramProfileVideos(username: string, apiKey: string): Promise<RawProfileVideo[]> {
  const params = new URLSearchParams({ username })
  const res = await fetch(`https://api.scrapecreators.com/v1/instagram/user/reels?${params}`, {
    headers: { 'x-api-key': apiKey },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ScraperCreators Instagram profile error ${res.status}: ${text}`)
  }

  const data = await res.json()
  console.log('[scraper:profile:instagram] top-level keys:', Object.keys(data || {}))

  // Response shape varies — try common paths
  const user = (data?.data?.user ?? data?.user ?? data) as Record<string, unknown>
  const timeline = (
    user?.edge_felix_video_timeline ??
    user?.edge_owner_to_timeline_media ??
    user?.clips_media ??
    user?.reels_media
  ) as Record<string, unknown> | undefined

  const edges: unknown[] = Array.isArray(timeline?.edges)
    ? (timeline.edges as unknown[])
    : Array.isArray(data?.reels ?? data?.items)
    ? (data?.reels ?? data?.items)
    : []

  console.log('[scraper:profile:instagram] reel count:', edges.length)

  return edges.map((edge) => {
    const e = edge as Record<string, unknown>
    const node = (e?.node ?? e) as Record<string, unknown>

    const videoId = String(node?.shortcode ?? node?.id ?? node?.media_id ?? '')
    const videoUrl = String(node?.video_url ?? node?.permalink ?? `https://www.instagram.com/reel/${videoId}/`)
    const views = Number(node?.video_play_count ?? node?.video_view_count ?? node?.play_count ?? 0) || null
    const resources = Array.isArray(node?.display_resources) ? node.display_resources as Record<string, unknown>[] : []
    const thumbnailUrl = String(
      resources[resources.length - 1]?.src ?? node?.display_url ?? node?.thumbnail_url ?? ''
    ) || null

    const uploadedAt = node?.taken_at_timestamp
      ? new Date(Number(node.taken_at_timestamp) * 1000).toISOString()
      : node?.timestamp ? new Date(String(node.timestamp)).toISOString() : null

    return { platformVideoId: videoId, videoUrl, views, thumbnailUrl, uploadedAt }
  }).filter((v) => v.platformVideoId)
}

/**
 * Fetch a WebVTT transcript directly from a CDN caption URL (no API credit).
 * Use this when captionUrl is already known from the profile response.
 */
export async function fetchCaptionTranscript(captionUrl: string): Promise<string | null> {
  try {
    const res = await fetch(captionUrl)
    if (!res.ok) return null
    const text = await res.text()
    return stripVtt(text) || null
  } catch {
    return null
  }
}

/**
 * Fetch transcript for a single video as plain text.
 * Returns null if no transcript is available.
 */
export async function fetchVideoTranscript(videoUrl: string, platform: Platform): Promise<string | null> {
  const apiKey = process.env.SCRAPERCREATORS_API_KEY
  if (!apiKey) throw new Error('SCRAPERCREATORS_API_KEY is not set')

  try {
    if (platform === 'tiktok') {
      return await fetchTikTokTranscript(videoUrl, apiKey)
    } else {
      return await fetchInstagramTranscript(videoUrl, apiKey)
    }
  } catch (err) {
    console.warn('[scraper:transcript] failed for', videoUrl, err instanceof Error ? err.message : err)
    return null
  }
}

async function fetchTikTokTranscript(videoUrl: string, apiKey: string): Promise<string | null> {
  const params = new URLSearchParams({ url: videoUrl })
  const res = await fetch(`https://api.scrapecreators.com/v1/tiktok/video/transcript?${params}`, {
    headers: { 'x-api-key': apiKey },
  })

  if (!res.ok) return null

  const data = await res.json()
  // Response may be VTT string, plain text, or an object with a text/transcript field
  if (typeof data === 'string') return stripVtt(data)
  const text = data?.transcript ?? data?.text ?? data?.captions ?? data?.subtitles ?? null
  if (typeof text === 'string') return stripVtt(text)
  return null
}

async function fetchInstagramTranscript(videoUrl: string, apiKey: string): Promise<string | null> {
  const params = new URLSearchParams({ url: videoUrl })
  const res = await fetch(`https://api.scrapecreators.com/v2/instagram/media/transcript?${params}`, {
    headers: { 'x-api-key': apiKey },
  })

  if (!res.ok) return null

  const data = await res.json()
  if (typeof data === 'string') return stripVtt(data)
  const text = data?.transcript ?? data?.text ?? data?.captions ?? null
  if (typeof text === 'string') return stripVtt(text)
  return null
}

/** Strip WebVTT header/cue markers and return plain text. */
function stripVtt(vtt: string): string {
  return vtt
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      if (!t || t === 'WEBVTT' || t.startsWith('NOTE')) return false
      if (/^\d+$/.test(t)) return false // cue index
      if (/\d{2}:\d{2}/.test(t)) return false // timestamp line
      return true
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface VideoData {
  coverImageUrls: string[]  // ordered: try each until one succeeds
  transcriptVtt: string | null
  views: number | null
  retention3sPct: number | null
  watchTimePct: number | null
  sharesSaves: number | null
  rawResponse: unknown
}

export async function fetchVideoData(url: string, platform: Platform): Promise<VideoData> {
  const apiKey = process.env.SCRAPERCREATORS_API_KEY
  if (!apiKey) throw new Error('SCRAPERCREATORS_API_KEY is not set')

  if (platform === 'tiktok') {
    return fetchTikTokData(url, apiKey)
  } else {
    return fetchInstagramData(url, apiKey)
  }
}

async function fetchTikTokData(url: string, apiKey: string): Promise<VideoData> {
  const params = new URLSearchParams({ url, get_transcript: 'true' })
  const res = await fetch(`${API_BASE}/tiktok/video?${params}`, {
    method: 'GET',
    headers: { 'x-api-key': apiKey },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ScraperCreators TikTok error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const detail = data?.aweme_detail

  console.log('[scraper] top-level response keys:', Object.keys(data || {}))
  console.log('[scraper] aweme_detail present:', !!detail)
  if (detail) {
    console.log('[scraper] detail keys:', Object.keys(detail))
    const transcriptRelatedKeys = Object.keys(detail).filter(k =>
      k.toLowerCase().includes('transcript') ||
      k.toLowerCase().includes('subtitle') ||
      k.toLowerCase().includes('caption') ||
      k.toLowerCase().includes('text')
    )
    console.log('[scraper] transcript-related keys on detail:', transcriptRelatedKeys)
    transcriptRelatedKeys.forEach(k => {
      const val = detail[k]
      console.log(`[scraper] detail.${k}:`, typeof val === 'string' ? val.slice(0, 200) : val)
    })
    if (detail?.video) {
      console.log('[scraper] detail.video keys:', Object.keys(detail.video))
      if (detail.video?.subtitles) {
        console.log('[scraper] detail.video.subtitles:', JSON.stringify(detail.video.subtitles).slice(0, 500))
      }
    }
  }

  // Collect all available cover URLs — cover is usually JPEG, origin_cover can be HEIC
  const coverImageUrls = [
    detail?.video?.cover?.url_list?.[0],
    detail?.video?.origin_cover?.url_list?.[0],
    detail?.video?.dynamic_cover?.url_list?.[0],
  ].filter(Boolean) as string[]

  const stats = detail?.statistics || {}
  const views: number | null = stats.play_count ?? null
  const sharesSaves: number | null =
    (stats.share_count ?? 0) + (stats.collect_count ?? 0) || null

  // Transcript lives at the top-level response, not inside aweme_detail
  const transcriptVtt: string | null =
    data?.transcript ||
    detail?.transcript ||
    detail?.subtitles_video_webapp ||
    null
  console.log('[scraper] transcriptVtt present:', !!transcriptVtt)
  if (transcriptVtt) {
    console.log('[scraper] transcriptVtt preview:', transcriptVtt.slice(0, 300))
  }

  return {
    coverImageUrls,
    transcriptVtt,
    views,
    retention3sPct: null,
    watchTimePct: null,
    sharesSaves,
    rawResponse: data,
  }
}

async function fetchInstagramData(url: string, apiKey: string): Promise<VideoData> {
  const params = new URLSearchParams({ url })
  const res = await fetch(`${API_BASE}/instagram/reel?${params}`, {
    method: 'GET',
    headers: { 'x-api-key': apiKey },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ScraperCreators Instagram error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const media = data?.data?.xdt_shortcode_media

  // Highest resolution image: display_resources last item, or display_url fallback
  const resources = media?.display_resources || []
  const coverImageUrls = [
    resources[resources.length - 1]?.src,
    media?.display_url,
  ].filter(Boolean) as string[]

  const views: number | null =
    media?.video_play_count ?? media?.video_view_count ?? null

  return {
    coverImageUrls,
    transcriptVtt: null, // Instagram transcript not available from this endpoint
    views,
    retention3sPct: null, // Manual entry required for Instagram in v1
    watchTimePct: null,
    sharesSaves: null,
    rawResponse: data,
  }
}

export function detectPlatform(url: string): Platform | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('tiktok.com')) return 'tiktok'
    if (u.hostname.includes('instagram.com') && url.includes('/reel')) return 'instagram_reels'
    return null
  } catch {
    return null
  }
}
