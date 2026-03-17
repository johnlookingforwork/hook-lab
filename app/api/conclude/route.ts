import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { CanvasNode, ConcludeResult, VideoStat } from '@/lib/types'

let _anthropic: Anthropic | null = null
function getClient() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

export async function POST(req: NextRequest) {
  try {
    const { nodes, testGroupId }: { nodes: CanvasNode[]; testGroupId: string } =
      await req.json()

    const groupId = `group-${testGroupId}`

    // Filter to nodes inside this test group
    const groupNodes = nodes.filter(
      (n) => n.parentId === groupId || n.id === groupId
    )

    const videoNodes = groupNodes.filter((n) => n.type === 'videoNode')

    // Build video stats sorted by total views descending
    const videoStats: VideoStat[] = videoNodes
      .map((n) => {
        const d = n.data as Record<string, unknown>
        const igViews = Number(d.instagramViews) || 0
        const ttViews = Number(d.tiktokViews) || 0
        return {
          nodeId: n.id,
          label: String(d.label || 'Untitled'),
          totalViews: igViews + ttViews,
          script: String(d.script || ''),
          thumbnailDescription: String(d.thumbnailDescription || ''),
          musicDescription: String(d.musicDescription || ''),
        }
      })
      .sort((a, b) => b.totalViews - a.totalViews)

    const videosWithViews = videoStats.filter((v) => v.totalViews > 0)

    let keepDoing = ''
    let avoid = ''

    if (videosWithViews.length > 0) {
      const videoSummary = videoStats.map((v, i) => {
        const lines = [`Video ${i + 1}: "${v.label}" — ${v.totalViews.toLocaleString()} views`]
        if (v.script) lines.push(`  Script: ${v.script.slice(0, 200)}${v.script.length > 200 ? '…' : ''}`)
        if (v.thumbnailDescription) lines.push(`  Thumbnail: ${v.thumbnailDescription}`)
        if (v.musicDescription) lines.push(`  Music: ${v.musicDescription}`)
        return lines.join('\n')
      }).join('\n\n')

      const message = await getClient().messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: `You are a short-form content strategist analyzing A/B test results. Videos are listed highest to lowest views.\n\n${videoSummary}\n\nBased on what's working (high views) vs not (low/no views), respond in exactly this format:\n\nKEEP DOING:\n[2-3 specific, actionable patterns from the top-performing videos — script style, thumbnail approach, music choice, etc.]\n\nAVOID:\n[2-3 specific patterns from the low-performing videos to stop using]\n\nBe concrete and reference actual content from the videos.`,
          },
        ],
      })

      const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''

      const keepMatch = raw.match(/KEEP DOING:\n([\s\S]*?)(?:\n\nAVOID:|$)/)
      const avoidMatch = raw.match(/AVOID:\n([\s\S]*)$/)

      keepDoing = keepMatch?.[1]?.trim() ?? ''
      avoid = avoidMatch?.[1]?.trim() ?? ''

      if (!keepDoing && !avoid) {
        keepDoing = raw
      }
    } else {
      keepDoing = 'Add view counts to your video nodes to generate insights.'
      avoid = ''
    }

    const result: ConcludeResult = {
      videoStats,
      keepDoing,
      avoid,
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[conclude]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
