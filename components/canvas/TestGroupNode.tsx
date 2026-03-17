'use client'

import { memo, useState } from 'react'
import { NodeProps, NodeResizer } from '@xyflow/react'
import type { ConcludeResult } from '@/lib/types'

export type TestGroupNodeData = {
  id: string
  name: string
  created_at: string
  onRename?: (groupId: string, newName: string) => void
  onDelete?: (groupId: string) => void
  onConclude?: (groupId: string) => void
  concludeResult?: ConcludeResult
  concludeLoading?: boolean
  onClearResult?: (groupId: string) => void
  isDropTarget?: boolean
}

function TestGroupNode({ data, selected }: NodeProps) {
  const group = data as unknown as TestGroupNodeData
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(group.name)

  const handleRename = () => {
    if (name.trim() && name.trim() !== group.name) {
      group.onRename?.(group.id, name.trim())
    }
    setEditing(false)
  }

  const createdDate = new Date(group.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  const result = group.concludeResult

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={400}
        minHeight={400}
        handleStyle={{ width: 8, height: 8, borderRadius: 4, background: '#52525b', border: '1px solid #71717a' }}
        lineStyle={{ borderColor: '#52525b' }}
      />

      <div className={`w-full h-full flex flex-col rounded-xl border bg-zinc-900/40 backdrop-blur-sm overflow-hidden transition-colors duration-100 ${
        group.isDropTarget
          ? 'border-yellow-400 shadow-[0_0_0_2px_rgba(250,204,21,0.25)]'
          : 'border-zinc-700/60'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/60 border-b border-zinc-700/60">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {editing ? (
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename()
                  if (e.key === 'Escape') { setName(group.name); setEditing(false) }
                }}
                className="bg-zinc-900 border border-zinc-600 rounded px-2 py-0.5 text-xs text-white w-full focus:outline-none focus:border-yellow-400"
              />
            ) : (
              <button
                onDoubleClick={() => setEditing(true)}
                className="text-xs font-semibold text-white truncate text-left hover:text-yellow-400 transition-colors"
                title="Double-click to rename"
              >
                {group.name}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-2 shrink-0">
            <span className="text-[10px] text-zinc-500">{createdDate}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
              Active
            </span>
            <button
              onClick={() => group.onConclude?.(group.id)}
              disabled={group.concludeLoading}
              className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 font-semibold hover:bg-yellow-400/30 transition-colors disabled:opacity-50 disabled:cursor-wait"
              title="Generate conclusion"
            >
              {group.concludeLoading ? '...' : 'Conclude →'}
            </button>
            <button
              onClick={() => group.onDelete?.(group.id)}
              className="text-zinc-600 hover:text-red-400 transition-colors text-xs px-1"
              title="Delete group"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Canvas area / drop hint */}
        <div className={`flex-1 flex items-center justify-center text-xs pointer-events-none select-none p-4 transition-colors ${
          group.isDropTarget ? 'text-yellow-500' : 'text-zinc-700'
        }`}>
          {group.isDropTarget ? '↓ Drop to add to this group' : 'Drag nodes here to group them'}
        </div>

        {/* Conclusion result panel */}
        {result && (
          <div className="border-t border-yellow-400/30 bg-yellow-400/5 p-3 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-400 font-semibold text-[10px] uppercase tracking-wide">Conclusion</span>
              <button
                onClick={() => group.onClearResult?.(group.id)}
                className="text-zinc-500 hover:text-zinc-300 text-[10px] pointer-events-auto"
              >
                ✕ Clear
              </button>
            </div>

            {result.videoStats.length > 0 && (
              <div className="mb-2.5">
                <p className="text-zinc-500 text-[10px] mb-1 uppercase tracking-wide">Videos by Views</p>
                {result.videoStats.map((v, i) => (
                  <div key={v.nodeId} className={`flex items-center gap-1.5 mb-0.5 ${i === 0 && v.totalViews > 0 ? 'text-yellow-300' : 'text-zinc-400'}`}>
                    <span className="text-[10px]">{i === 0 && v.totalViews > 0 ? '↑' : i === result.videoStats.length - 1 && v.totalViews > 0 ? '↓' : '·'}</span>
                    <span className="truncate flex-1">{v.label}</span>
                    <span className="shrink-0 text-zinc-500">{v.totalViews.toLocaleString()} views</span>
                  </div>
                ))}
              </div>
            )}

            {result.keepDoing && (
              <div className="mb-2 border-t border-zinc-700/60 pt-2">
                <p className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wide mb-1">Keep Doing</p>
                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{result.keepDoing}</p>
              </div>
            )}

            {result.avoid && (
              <div className="border-t border-zinc-700/60 pt-2">
                <p className="text-red-400 text-[10px] font-semibold uppercase tracking-wide mb-1">Avoid</p>
                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{result.avoid}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default memo(TestGroupNode)
