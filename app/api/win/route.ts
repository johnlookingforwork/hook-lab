import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// POST /api/win — mark a video as winner, archive test group to Golden Folder
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()

  try {
    const { videoId, testGroupId } = await req.json()

    if (!videoId || !testGroupId) {
      return NextResponse.json({ error: 'videoId and testGroupId are required' }, { status: 400 })
    }

    // 1. Mark the video as winner
    const { error: winnerError } = await supabase
      .from('videos')
      .update({ is_winner: true })
      .eq('id', videoId)

    if (winnerError) throw winnerError

    // 2. Archive the test group: concluded status + null canvas_position
    const { data: testGroup, error: groupError } = await supabase
      .from('test_groups')
      .update({ status: 'concluded', canvas_position: null })
      .eq('id', testGroupId)
      .select()
      .single()

    if (groupError) throw groupError

    // 3. Read the current main canvas state to snapshot this group's nodes
    const { data: mainCanvas } = await supabase
      .from('canvas_state')
      .select('*')
      .is('test_group_id', null)
      .maybeSingle()

    if (mainCanvas) {
      // Extract nodes/edges belonging to this test group
      const groupNodes = (mainCanvas.nodes as Array<{ id: string; parentId?: string; data?: { testGroupId?: string } }>).filter(
        (n) =>
          n.id === `group-${testGroupId}` ||
          n.parentId === `group-${testGroupId}` ||
          n.data?.testGroupId === testGroupId
      )
      const groupNodeIds = new Set(groupNodes.map((n) => n.id))
      const groupEdges = (mainCanvas.edges as Array<{ source: string; target: string }>).filter(
        (e) => groupNodeIds.has(e.source) || groupNodeIds.has(e.target)
      )

      // Upsert concluded test canvas snapshot
      const { data: existingSnapshot } = await supabase
        .from('canvas_state')
        .select('id')
        .eq('test_group_id', testGroupId)
        .maybeSingle()

      if (existingSnapshot) {
        await supabase
          .from('canvas_state')
          .update({ nodes: groupNodes, edges: groupEdges, updated_at: new Date().toISOString() })
          .eq('id', existingSnapshot.id)
      } else {
        await supabase
          .from('canvas_state')
          .insert({ nodes: groupNodes, edges: groupEdges, test_group_id: testGroupId })
      }

      // 4. Remove this group's nodes/edges from the main WIP canvas
      const remainingNodes = (mainCanvas.nodes as Array<{ id: string; parentId?: string; data?: { testGroupId?: string } }>).filter(
        (n) =>
          n.id !== `group-${testGroupId}` &&
          n.parentId !== `group-${testGroupId}` &&
          n.data?.testGroupId !== testGroupId
      )
      const remainingEdges = (mainCanvas.edges as Array<{ source: string; target: string }>).filter(
        (e) => !groupNodeIds.has(e.source) && !groupNodeIds.has(e.target)
      )

      await supabase
        .from('canvas_state')
        .update({ nodes: remainingNodes, edges: remainingEdges, updated_at: new Date().toISOString() })
        .eq('id', mainCanvas.id)
    }

    return NextResponse.json({ testGroup })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[win]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
