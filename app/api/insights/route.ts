import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { generatePlaybookInsights } from '@/lib/anthropic'
import type { Video } from '@/lib/types'

export async function POST() {
  const supabase = createServiceClient()

  const { data: winners, error } = await supabase
    .from('videos')
    .select('*')
    .eq('is_winner', true)
    .order('performance_score', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    const insights = await generatePlaybookInsights(winners as Video[])
    return NextResponse.json({ insights })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
