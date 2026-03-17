import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// GET /api/canvas?testGroupId=<uuid|null>
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const searchParams = req.nextUrl.searchParams
  const testGroupId = searchParams.get('testGroupId')

  let query = supabase
    .from('canvas_state')
    .select('*')

  if (testGroupId && testGroupId !== 'null') {
    query = query.eq('test_group_id', testGroupId)
  } else {
    query = query.is('test_group_id', null)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ canvasState: data })
}

// POST /api/canvas — upsert canvas state
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { nodes, edges, testGroupId } = await req.json()
  console.log('[canvas API] POST nodes:', nodes?.length ?? 0, 'edges:', edges?.length ?? 0, 'testGroupId:', testGroupId)

  const isMain = !testGroupId || testGroupId === 'null'

  if (isMain) {
    const { data: existing, error: selectError } = await supabase
      .from('canvas_state')
      .select('id')
      .is('test_group_id', null)
      .maybeSingle()

    if (selectError) {
      console.error('[canvas API] SELECT error:', selectError.message, selectError.code)
      return NextResponse.json({ error: selectError.message }, { status: 500 })
    }

    if (existing) {
      console.log('[canvas API] updating row', existing.id, 'with', nodes?.length, 'nodes')
      const { data, error } = await supabase
        .from('canvas_state')
        .update({ nodes, edges, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('[canvas API] UPDATE error:', error.message, error.code)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      console.log('[canvas API] updated, saved nodes:', (data as { nodes?: unknown[] })?.nodes?.length)
      return NextResponse.json({ canvasState: data })
    } else {
      console.log('[canvas API] no existing row — inserting with', nodes?.length, 'nodes')
      const { data, error } = await supabase
        .from('canvas_state')
        .insert({ nodes, edges, test_group_id: null })
        .select()
        .single()

      if (error) {
        console.error('[canvas API] INSERT error:', error.message, error.code)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      console.log('[canvas API] inserted, saved nodes:', (data as { nodes?: unknown[] })?.nodes?.length)
      return NextResponse.json({ canvasState: data })
    }
  } else {
    const { data: existing, error: selectError } = await supabase
      .from('canvas_state')
      .select('id')
      .eq('test_group_id', testGroupId)
      .maybeSingle()

    if (selectError) {
      console.error('[canvas API] SELECT error:', selectError.message, selectError.code)
      return NextResponse.json({ error: selectError.message }, { status: 500 })
    }

    if (existing) {
      const { data, error } = await supabase
        .from('canvas_state')
        .update({ nodes, edges, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ canvasState: data })
    } else {
      const { data, error } = await supabase
        .from('canvas_state')
        .insert({ nodes, edges, test_group_id: testGroupId })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ canvasState: data })
    }
  }
}
