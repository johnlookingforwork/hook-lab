'use client'

import { useCallback, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  type Node,
  type Edge,
  ReactFlowProvider,
  useReactFlow,
  addEdge,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import VideoNode from './VideoNode'
import TestGroupNode from './TestGroupNode'
import SpokenHookNode from './SpokenHookNode'
import ThumbnailNode from './ThumbnailNode'
import { useCanvasState } from '@/hooks/useCanvasState'
import VideoManager from '@/components/ui/VideoManager'
import type { TestGroup, CanvasNode, ConcludeResult, Profile, ProfileVideo } from '@/lib/types'

const nodeTypes = {
  videoNode: VideoNode,
  testGroupNode: TestGroupNode,
  spokenHookNode: SpokenHookNode,
  thumbnailNode: ThumbnailNode,
}

interface CanvasWorkspaceProps {
  initialNodes: CanvasNode[]
  initialEdges: { id: string; source: string; target: string }[]
  testGroups: TestGroup[]
  initialProfiles: Profile[]
}

function CanvasWorkspaceInner({
  initialNodes,
  initialEdges,
  testGroups: initialTestGroups,
  initialProfiles,
}: CanvasWorkspaceProps) {
  const [testGroups, setTestGroups] = useState<TestGroup[]>(initialTestGroups)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [concludeResults, setConcludeResults] = useState<Record<string, ConcludeResult>>({})
  const [concludeLoading, setConcludeLoading] = useState<Record<string, boolean>>({})
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [lastActiveGroupId, setLastActiveGroupId] = useState<string | null>(null)

  const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange } =
    useCanvasState(initialNodes as Node[], initialEdges as Edge[])

  const { screenToFlowPosition } = useReactFlow()

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds))
      // When a thumbnail node is connected to a video node, sync label → thumbnailDescription
      const sourceNode = nodes.find((n) => n.id === connection.source)
      const targetNode = nodes.find((n) => n.id === connection.target)
      if (sourceNode?.type === 'thumbnailNode' && targetNode?.type === 'videoNode') {
        const label = (sourceNode.data as { label?: string }).label || ''
        setNodes((nds) =>
          nds.map((n) =>
            n.id === targetNode.id
              ? { ...n, data: { ...n.data, thumbnailDescription: label } }
              : n
          )
        )
      }
    },
    [setEdges, setNodes, nodes]
  )

  // Find which group (if any) a node's absolute position overlaps
  const findOverlappingGroup = useCallback(
    (draggedNode: Node): Node | null => {
      if (draggedNode.type === 'testGroupNode') return null
      return nodes.find((n) => {
        if (n.type !== 'testGroupNode') return false
        const w = (n.style as { width?: number })?.width ?? 900
        const h = (n.style as { height?: number })?.height ?? 520
        const nx = n.position.x, ny = n.position.y
        const dx = draggedNode.position.x, dy = draggedNode.position.y
        return dx >= nx && dx <= nx + w && dy >= ny && dy <= ny + h
      }) ?? null
    },
    [nodes]
  )

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      const group = findOverlappingGroup(draggedNode)
      setDropTargetId(group?.id ?? null)
    },
    [findOverlappingGroup]
  )

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      setDropTargetId(null)
      // Skip if it's a group or already has a parent
      if (draggedNode.type === 'testGroupNode' || draggedNode.parentId) return
      const group = findOverlappingGroup(draggedNode)
      if (!group) return
      // Reparent: convert absolute position to relative inside the group
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== draggedNode.id) return n
          return {
            ...n,
            parentId: group.id,
            extent: 'parent' as const,
            position: {
              x: draggedNode.position.x - group.position.x,
              y: draggedNode.position.y - group.position.y,
            },
          }
        })
      )
    },
    [findOverlappingGroup, setNodes]
  )

  // Add a node, auto-parenting it into the active test group when possible
  const addNode = useCallback(
    (type: 'spokenHookNode' | 'thumbnailNode' | 'videoNode', overrideData?: Record<string, unknown>) => {
      const id = `${type}-${Date.now()}`
      const defaultData = type === 'spokenHookNode'
        ? { text: '', testGroupId: '' }
        : type === 'thumbnailNode'
        ? { label: '', imageUrl: '', testGroupId: '' }
        : { label: '', instagramViews: null, tiktokViews: null, thumbnailDescription: '', script: '', musicDescription: '' }
      const data = overrideData ? { ...defaultData, ...overrideData } : defaultData

      const groupNodes = nodes.filter((n) => n.type === 'testGroupNode')
      // 1 group → always use it; multiple groups → use last interacted
      const targetGroup =
        groupNodes.length === 1
          ? groupNodes[0]
          : groupNodes.find((n) => n.id === lastActiveGroupId)

      if (targetGroup) {
        const childCount = nodes.filter((n) => n.parentId === targetGroup.id).length
        const newNode: Node = {
          id,
          type,
          parentId: targetGroup.id,
          extent: 'parent' as const,
          position: {
            x: 30 + (childCount % 3) * 310,
            y: 60 + Math.floor(childCount / 3) * 220,
          },
          data,
        }
        setNodes((nds) => [...nds, newNode])
      } else {
        // No group or ambiguous — place floating at canvas centre
        const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
        const newNode: Node = {
          id,
          type,
          position: { x: pos.x + Math.random() * 40 - 20, y: pos.y + Math.random() * 40 - 20 },
          data,
        }
        setNodes((nds) => [...nds, newNode])
      }
    },
    [screenToFlowPosition, setNodes, nodes, lastActiveGroupId]
  )

  const handleConclude = useCallback(
    async (testGroupId: string) => {
      setConcludeLoading((prev) => ({ ...prev, [testGroupId]: true }))
      try {
        const groupNodes = nodes.filter(
          (n) => n.parentId === `group-${testGroupId}` || n.id === `group-${testGroupId}`
        )
        const res = await fetch('/api/conclude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes: groupNodes, edges, testGroupId }),
        })
        const result: ConcludeResult = await res.json()
        setConcludeResults((prev) => ({ ...prev, [testGroupId]: result }))
        // Persist conclusion to the database
        await fetch(`/api/test-groups/${testGroupId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conclusion: result, status: 'concluded' }),
        })
        // Inject result into the test group node's data
        setNodes((nds) =>
          nds.map((n) =>
            n.id === `group-${testGroupId}`
              ? { ...n, data: { ...n.data, concludeResult: result } }
              : n
          )
        )
      } finally {
        setConcludeLoading((prev) => ({ ...prev, [testGroupId]: false }))
      }
    },
    [nodes, edges, setNodes]
  )

  const handleClearResult = useCallback(
    (testGroupId: string) => {
      setConcludeResults((prev) => {
        const next = { ...prev }
        delete next[testGroupId]
        return next
      })
      setNodes((nds) =>
        nds.map((n) =>
          n.id === `group-${testGroupId}`
            ? { ...n, data: { ...n.data, concludeResult: undefined } }
            : n
        )
      )
    },
    [setNodes]
  )

  const onAddVideo = useCallback(
    (video: ProfileVideo, platform: string) => {
      const uploadLabel = video.uploaded_at
        ? new Date(video.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : ''
      addNode('videoNode', {
        label: uploadLabel,
        instagramViews: platform === 'instagram_reels' ? video.views : null,
        tiktokViews: platform === 'tiktok' ? video.views : null,
        script: video.script ?? '',
        thumbnailDescription: '',
        musicDescription: '',
      })
    },
    [addNode]
  )

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setCreatingGroup(true)

    try {
      const res = await fetch('/api/test-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
      })
      const { testGroup } = await res.json()

      const groupNode: Node = {
        id: `group-${testGroup.id}`,
        type: 'testGroupNode',
        position: { x: 80 + nodes.length * 30, y: 80 },
        style: { width: 1100, height: 600 },
        data: {
          id: testGroup.id,
          name: testGroup.name,
          created_at: testGroup.created_at,
          onRename: handleRenameGroup,
          onDelete: handleDeleteGroup,
          onConclude: handleConclude,
          onClearResult: handleClearResult,
        },
      }

      setNodes((nds) => [...nds, groupNode])
      setTestGroups((tgs) => [...tgs, testGroup])
      setLastActiveGroupId(groupNode.id)
      setNewGroupName('')
      setShowNewGroup(false)
    } finally {
      setCreatingGroup(false)
    }
  }

  const handleRenameGroup = useCallback(
    async (groupId: string, newName: string) => {
      await fetch(`/api/test-groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      setTestGroups((tgs) =>
        tgs.map((g) => (g.id === groupId ? { ...g, name: newName } : g))
      )
      setNodes((nds) =>
        nds.map((n) =>
          n.id === `group-${groupId}`
            ? { ...n, data: { ...n.data, name: newName } }
            : n
        )
      )
    },
    [setNodes]
  )

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      if (!confirm('Delete this test group and all its nodes?')) return
      await fetch(`/api/test-groups/${groupId}`, { method: 'DELETE' })
      setNodes((nds) =>
        nds.filter(
          (n) => n.id !== `group-${groupId}` && n.parentId !== `group-${groupId}`
        )
      )
      setTestGroups((tgs) => tgs.filter((g) => g.id !== groupId))
    },
    [setNodes]
  )

  // Keep callbacks and drop-target state fresh in node data
  const nodesWithCallbacks = nodes.map((n) => {
    if (n.type === 'testGroupNode') {
      const groupId = (n.data as { id?: string }).id
      return {
        ...n,
        data: {
          ...n.data,
          onRename: handleRenameGroup,
          onDelete: handleDeleteGroup,
          onConclude: handleConclude,
          onClearResult: handleClearResult,
          concludeLoading: groupId ? concludeLoading[groupId] : false,
          concludeResult: groupId ? concludeResults[groupId] : undefined,
          isDropTarget: n.id === dropTargetId,
        },
      }
    }
    return n
  })

  return (
    <div className="flex-1 flex overflow-hidden">
      <VideoManager initialProfiles={initialProfiles} onAddVideo={onAddVideo} />
    <div className="flex-1 flex flex-col relative">
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 flex-wrap">
        {showNewGroup ? (
          <form onSubmit={handleCreateGroup} className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name…"
              className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-400 w-44"
            />
            <button
              type="submit"
              disabled={creatingGroup || !newGroupName.trim()}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50"
            >
              {creatingGroup ? '…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowNewGroup(false)}
              className="text-zinc-500 hover:text-white text-sm"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowNewGroup(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
          >
            + Test Group
          </button>
        )}

        <button
          onClick={() => addNode('spokenHookNode')}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 border border-blue-500/40 text-blue-300 hover:text-blue-200 hover:border-blue-400 transition-colors"
        >
          + Spoken Hook
        </button>

        <button
          onClick={() => addNode('thumbnailNode')}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 border border-purple-500/40 text-purple-300 hover:text-purple-200 hover:border-purple-400 transition-colors"
        >
          + Thumbnail
        </button>

        <button
          onClick={() => addNode('videoNode')}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
        >
          + Video
        </button>
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none z-0">
          <div className="text-5xl">⚗️</div>
          <p className="text-zinc-400 text-base font-medium">Start your first A/B test</p>
          <p className="text-zinc-600 text-sm">Create a test group, add spoken hooks, thumbnails, and videos</p>
        </div>
      )}

      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_e, node) => {
          if (node.type === 'testGroupNode') setLastActiveGroupId(node.id)
          else if (node.parentId) setLastActiveGroupId(node.parentId)
        }}
        onNodesDelete={(deleted) => console.log('[canvas] nodes deleted via keyboard:', deleted.map(n => n.id))}
        nodeTypes={nodeTypes}
        fitView={initialNodes.length > 0}
        fitViewOptions={{ padding: 0.6 }}
        minZoom={0.1}
        defaultViewport={{ zoom: 0.7, x: 80, y: 80 }}
        className="flex-1"
        colorMode="dark"
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#27272a" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
    </div>
  )
}

export default function CanvasWorkspace(props: CanvasWorkspaceProps) {
  return (
    <ReactFlowProvider>
      <CanvasWorkspaceInner {...props} />
    </ReactFlowProvider>
  )
}

export type { CanvasWorkspaceProps }
