'use client'

import { memo, useCallback } from 'react'
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react'
import type { ThumbnailNodeData } from '@/lib/types'

function ThumbnailNode({ id, data, selected }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow()
  const nodeData = data as unknown as ThumbnailNodeData

  const handleDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] })
  }, [id, deleteElements])

  return (
    <div
      className={`w-72 rounded-xl border shadow-lg overflow-hidden text-xs flex flex-col bg-zinc-900 transition-shadow ${
        selected ? 'border-purple-400 shadow-purple-500/20' : 'border-purple-500/40'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-purple-500/10 border-b border-purple-500/30">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-purple-300 font-semibold tracking-wide uppercase text-[10px]">Thumbnail</span>
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

      {/* Image preview */}
      {nodeData.imageUrl ? (
        <div className="w-full aspect-video bg-zinc-800 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={nodeData.imageUrl}
            alt={nodeData.label || 'Thumbnail'}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full aspect-video bg-zinc-800 flex items-center justify-center">
          <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {/* Fields */}
      <div className="p-3 flex flex-col gap-2">
        <input
          type="text"
          value={nodeData.label || ''}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          placeholder="Label (e.g. 'Close-up face')"
          className="bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-400 text-xs w-full"
        />
        <input
          type="url"
          value={nodeData.imageUrl || ''}
          onChange={(e) => updateNodeData(id, { imageUrl: e.target.value })}
          placeholder="Image URL (optional)"
          className="bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-400 text-xs w-full"
        />
      </div>

      <Handle type="source" position={Position.Top} id="top" className="!w-3 !h-3 !bg-purple-400 !border-2 !border-zinc-900" />
      <Handle type="source" position={Position.Right} id="right" className="!w-3 !h-3 !bg-purple-400 !border-2 !border-zinc-900" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-3 !h-3 !bg-purple-400 !border-2 !border-zinc-900" />
      <Handle type="source" position={Position.Left} id="left" className="!w-3 !h-3 !bg-purple-400 !border-2 !border-zinc-900" />
    </div>
  )
}

export default memo(ThumbnailNode)
