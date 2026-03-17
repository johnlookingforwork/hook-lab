import { createServiceClient } from '@/lib/supabase-server'
import CanvasWorkspace from '@/components/canvas/CanvasWorkspace'
import type { TestGroup, CanvasNode, Profile } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function CanvasPage() {
  const supabase = createServiceClient()

  // Load active test groups and their videos
  const { data: testGroups } = await supabase
    .from('test_groups')
    .select('*, videos(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  // Load saved profiles with their videos
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('*, profile_videos(*)')
    .order('created_at', { ascending: true })

  const initialProfiles: Profile[] = profileRows || []

  // Load main WIP canvas state
  const { data: canvasState } = await supabase
    .from('canvas_state')
    .select('*')
    .is('test_group_id', null)
    .maybeSingle()

  const groups: TestGroup[] = testGroups || []

  // If canvas state exists, use it; otherwise build initial nodes from test groups
  let initialNodes: CanvasNode[] = []
  let initialEdges: { id: string; source: string; target: string }[] = []

  if (canvasState) {
    initialNodes = canvasState.nodes || []
    initialEdges = canvasState.edges || []
    console.log('[canvas page] loaded from DB:', initialNodes.length, 'nodes,', initialEdges.length, 'edges')
  } else {
    // Build nodes from DB if no canvas state saved yet
    initialNodes = buildInitialNodes(groups)
    console.log('[canvas page] no canvas_state row found, built', initialNodes.length, 'nodes from test groups')
  }

  return (
    <div className="flex-1 flex flex-col" style={{ height: 'calc(100vh - 48px)' }}>
      <CanvasWorkspace
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        testGroups={groups}
        initialProfiles={initialProfiles}
      />
    </div>
  )
}

function buildInitialNodes(testGroups: TestGroup[]): CanvasNode[] {
  const nodes: CanvasNode[] = []
  let groupX = 80

  for (const group of testGroups) {
    const groupNode: CanvasNode = {
      id: `group-${group.id}`,
      type: 'testGroupNode',
      position: { x: groupX, y: 80 },
      style: { width: 1100, height: 600 },
      data: {
        id: group.id,
        name: group.name,
        created_at: group.created_at,
      },
    }
    nodes.push(groupNode)

    const videos = group.videos || []
    videos.forEach((video, i) => {
      nodes.push({
        id: `video-${video.id}`,
        type: 'videoNode',
        position: { x: 20 + i * 280, y: 60 },
        parentId: `group-${group.id}`,
        extent: 'parent',
        data: {
          ...video,
          testGroupId: group.id,
        },
      })
    })

    groupX += 660
  }

  return nodes
}
