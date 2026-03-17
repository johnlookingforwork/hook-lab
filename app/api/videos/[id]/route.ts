import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { computePerformanceScore } from '@/lib/scoring'

const ALLOWED_FIELDS = [
  'views',
  'retention_3s_pct',
  'watch_time_pct',
  'shares_saves',
  'hook_type',
  'transcript_hook',
  'transcript_full',
  'visual_description',
]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Fetch current video + all videos for score normalization
  const [{ data: currentVideo }, { data: allVideos }] = await Promise.all([
    supabase.from('videos').select('*').eq('id', id).single(),
    supabase.from('videos').select('views, retention_3s_pct, watch_time_pct, shares_saves'),
  ])

  if (!currentVideo) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  const merged = { ...currentVideo, ...updates }
  const performanceScore = computePerformanceScore(
    {
      views: merged.views,
      retention_3s_pct: merged.retention_3s_pct,
      watch_time_pct: merged.watch_time_pct,
      shares_saves: merged.shares_saves,
    },
    allVideos || []
  )

  const { data: video, error } = await supabase
    .from('videos')
    .update({ ...updates, performance_score: performanceScore })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ video })
}
