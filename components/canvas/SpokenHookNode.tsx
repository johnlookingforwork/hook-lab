'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react'
import type { SpokenHookNodeData } from '@/lib/types'

function SpokenHookNode({ id, data, selected }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow()
  const nodeData = data as unknown as SpokenHookNodeData

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { text: e.target.value })
    },
    [id, updateNodeData]
  )

  const handleDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] })
  }, [id, deleteElements])

  return (
    <div
      className={`w-72 rounded-xl border shadow-lg overflow-hidden text-xs flex flex-col bg-zinc-900 transition-shadow ${
        selected ? 'border-blue-400 shadow-blue-500/20' : 'border-blue-500/40'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-500/10 border-b border-blue-500/30">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span className="text-blue-300 font-semibold tracking-wide uppercase text-[10px]">Spoken Hook</span>
        </div>
        <button
          onClick={handleDelete}
          className="text-zinc-500 hover:text-red-400 transition-colors p-0.5"
          title="Delete node"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Script textarea */}
      <div className="p-3">
        <textarea
          value={nodeData.text || ''}
          onChange={handleTextChange}
          placeholder="Type the spoken hook script here…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none focus:border-blue-400 text-xs leading-relaxed"
          rows={5}
        />
      </div>

      {/* Source handle — connects to Video nodes */}
      <Handle type="source" position={Position.Top} id="top" className="!w-3 !h-3 !bg-blue-400 !border-2 !border-zinc-900" />
      <Handle type="source" position={Position.Right} id="right" className="!w-3 !h-3 !bg-blue-400 !border-2 !border-zinc-900" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-3 !h-3 !bg-blue-400 !border-2 !border-zinc-900" />
      <Handle type="source" position={Position.Left} id="left" className="!w-3 !h-3 !bg-blue-400 !border-2 !border-zinc-900" />
    </div>
  )
}

export default memo(SpokenHookNode)
