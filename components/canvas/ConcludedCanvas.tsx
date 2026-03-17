'use client'

import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  ReactFlowProvider,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import VideoNode from './VideoNode'
import { useCanvasState } from '@/hooks/useCanvasState'
import type { CanvasNode, Video } from '@/lib/types'

const nodeTypes = {
  videoNode: VideoNode,
}

interface ConcludedCanvasProps {
  testGroupId: string
  initialNodes: CanvasNode[]
  initialEdges: { id: string; source: string; target: string }[]
  videos: Video[]
}

function ConcludedCanvasInner({
  testGroupId,
  initialNodes,
  initialEdges,
}: ConcludedCanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange } = useCanvasState(
    initialNodes as Node[],
    initialEdges as Edge[],
    testGroupId
  )

  return (
    <div className="flex-1" style={{ height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null} // No deleting nodes in concluded view
      >
        <Background variant={BackgroundVariant.Dots} color="#27272a" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export default function ConcludedCanvas(props: ConcludedCanvasProps) {
  return (
    <ReactFlowProvider>
      <ConcludedCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
