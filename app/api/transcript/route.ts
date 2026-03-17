import { NextRequest, NextResponse } from 'next/server'
import { fetchVideoData, detectPlatform } from '@/lib/scrapercreators'
import webvtt from 'node-webvtt'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    const platform = detectPlatform(url)
    if (!platform) {
      return NextResponse.json(
        { error: 'Unsupported URL. Paste a TikTok or Instagram Reels URL.' },
        { status: 400 }
      )
    }

    const videoData = await fetchVideoData(url, platform)

    if (!videoData.transcriptVtt) {
      return NextResponse.json(
        { error: 'No transcript found for this video.' },
        { status: 422 }
      )
    }

    console.log('[transcript] raw vtt length:', videoData.transcriptVtt.length)
    console.log('[transcript] raw vtt preview:', videoData.transcriptVtt.slice(0, 300))

    // Parse VTT → plain text
    let transcript = ''
    try {
      const parsed = webvtt.parse(videoData.transcriptVtt, { strict: false })
      console.log('[transcript] parsed cue count:', parsed.cues?.length ?? 0)
      const cleanText = (t: string) => t.replace(/<[^>]+>/g, '').trim()
      transcript = parsed.cues
        .map((c: { text: string }) => cleanText(c.text))
        .join(' ')
        .trim()
      console.log('[transcript] final transcript length:', transcript.length)
    } catch (parseErr) {
      console.error('[transcript] VTT parse error:', parseErr)
      transcript = videoData.transcriptVtt
    }

    return NextResponse.json({ transcript })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[transcript]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
