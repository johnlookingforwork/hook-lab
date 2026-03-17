import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'
import ConcludedCanvas from '@/components/canvas/ConcludedCanvas'
import type { CanvasNode, Video } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ConcludedTestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()

  // Load test group with all its videos
  const { data: testGroup, error } = await supabase
    .from('test_groups')
    .select('*, videos(*)')
    .eq('id', id)
    .single()

  if (error || !testGroup) {
    notFound()
  }

  // Load concluded test canvas snapshot
  const { data: canvasState } = await supabase
    .from('canvas_state')
    .select('*')
    .eq('test_group_id', id)
    .maybeSingle()

  const videos: Video[] = testGroup.videos || []

  let initialNodes: CanvasNode[]
  let initialEdges: { id: string; source: string; target: string }[]

  if (canvasState?.nodes?.length > 0) {
    initialNodes = canvasState.nodes
    initialEdges = canvasState.edges
  } else {
    // Auto-layout: side by side
    initialNodes = buildConcludedNodes(testGroup.id, videos)
    initialEdges = []
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Header bar */}
      <div className="h-10 border-b border-zinc-800 bg-zinc-950 flex items-center gap-3 px-4 shrink-0">
        <Link
          href="/canvas"
          className="text-zinc-500 hover:text-white text-sm transition-colors flex items-center gap-1"
        >
          ← Back
        </Link>
        <span className="text-zinc-700">|</span>
        <span className="text-sm text-zinc-300 font-medium truncate">{testGroup.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-700 text-zinc-400 font-semibold ml-auto">
          Concluded
        </span>
      </div>

      <ConcludedCanvas
        testGroupId={id}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        videos={videos}
      />
    </div>
  )
}

function buildConcludedNodes(testGroupId: string, videos: Video[]): CanvasNode[] {
  return videos.map((video, i) => ({
    id: `video-${video.id}`,
    type: 'videoNode',
    position: { x: 60 + i * 300, y: 60 },
    data: {
      ...video,
      testGroupId,
      isWinner: video.is_winner,
      isConcluded: true,
    },
  }))
}
