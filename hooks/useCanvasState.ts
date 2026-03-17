'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useNodesState, useEdgesState, type Node, type Edge } from '@xyflow/react'

const DEBOUNCE_MS = 500

// Stable snapshot for change detection — JSON.stringify silently drops functions,
// so TestGroupNode callback props don't cause false "changed" results.
function makeSnapshot(nodes: Node[], edges: Edge[]): string {
  const ns = [...nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => ({ id: n.id, type: n.type, data: n.data, position: n.position, parentId: n.parentId ?? null }))
  const es = [...edges]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => ({ id: e.id, source: e.source, target: e.target }))
  return JSON.stringify({ ns, es })
}

export function useCanvasState(
  initialNodes: Node[],
  initialEdges: Edge[],
  testGroupId?: string | null
) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)
  const pendingSaveRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null)

  // Always-current refs — updated during render so beforeunload always has latest data
  const latestNodesRef = useRef(nodes)
  const latestEdgesRef = useRef(edges)
  latestNodesRef.current = nodes
  latestEdgesRef.current = edges

  // Snapshot of what was loaded from DB — saves are skipped when nothing has changed.
  // This prevents HMR remounts and React strict-mode double-invocations from
  // firing a spurious save that overwrites real data.
  const loadedSnapshotRef = useRef(makeSnapshot(initialNodes, initialEdges))

  const doSave = useCallback(
    async (nodesToSave: Node[], edgesToSave: Edge[]) => {
      if (isSavingRef.current) {
        // Queue latest state; overwrites any previously queued save
        pendingSaveRef.current = { nodes: nodesToSave, edges: edgesToSave }
        return
      }
      isSavingRef.current = true
      console.log('[canvas] saving', nodesToSave.length, 'nodes:', nodesToSave.map((n) => n.id))
      try {
        await fetch('/api/canvas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes: nodesToSave, edges: edgesToSave, testGroupId: testGroupId ?? null }),
          keepalive: true,
        })
        // Update the baseline so beforeunload knows this state is already saved
        loadedSnapshotRef.current = makeSnapshot(nodesToSave, edgesToSave)
      } catch (err) {
        console.error('[canvas save]', err)
      } finally {
        isSavingRef.current = false
        if (pendingSaveRef.current) {
          const pending = pendingSaveRef.current
          pendingSaveRef.current = null
          doSave(pending.nodes, pending.edges)
        }
      }
    },
    [testGroupId]
  )

  // Auto-save whenever nodes/edges change — but only if state actually differs from
  // what was loaded (prevents spurious saves after HMR or strict-mode remounts).
  useEffect(() => {
    const currentSnap = makeSnapshot(nodes, edges)
    const equal = currentSnap === loadedSnapshotRef.current
    console.log('[canvas snapshot] nodes:', nodes.length, 'ids:', nodes.map(n => n.id), 'equal:', equal)
    if (equal) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    console.log('[canvas] scheduling save in', DEBOUNCE_MS, 'ms for', nodes.length, 'nodes')
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      console.log('[canvas] timer fired → doSave', nodes.length, 'nodes')
      doSave(nodes, edges)
    }, DEBOUNCE_MS)
    return () => {
      if (saveTimer.current) {
        console.log('[canvas] cleanup: clearing timer (nodes changed again)')
        clearTimeout(saveTimer.current)
      }
    }
  }, [nodes, edges, doSave])

  // Flush any pending debounced save when the user navigates away.
  // Always fires if state has changed — handles both "timer pending" and
  // "save in-flight" cases (the in-flight fetch has keepalive:true already,
  // but the page may reload from stale DB data before it commits).
  useEffect(() => {
    const handleUnload = () => {
      // Cancel any pending debounce timer
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      const snap = makeSnapshot(latestNodesRef.current, latestEdgesRef.current)
      if (snap === loadedSnapshotRef.current) return // Nothing changed, skip
      fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: latestNodesRef.current,
          edges: latestEdgesRef.current,
          testGroupId: testGroupId ?? null,
        }),
        keepalive: true,
      }).catch(() => {})
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [testGroupId])

  return { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, saveCanvas: doSave }
}
