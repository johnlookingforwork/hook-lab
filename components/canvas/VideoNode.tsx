'use client'

import { memo, useCallback, useState } from 'react'
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react'
import type { SimpleVideoNodeData } from '@/lib/types'

function VideoNode({ id, data, selected }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow()
  const nodeData = data as unknown as SimpleVideoNodeData
  const [importUrl, setImportUrl] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')

  const handleImport = useCallback(async () => {
    if (!importUrl.trim()) return
    setImportLoading(true)
    setImportError('')
    try {
      const res = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setImportError(json.error || 'Failed to fetch transcript')
        return
      }
      updateNodeData(id, { script: json.transcript })
      setImportUrl('')
      setImportOpen(false)
    } catch {
      setImportError('Network error')
    } finally {
      setImportLoading(false)
    }
  }, [importUrl, id, updateNodeData])

  const handleDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] })
  }, [id, deleteElements])

  return (
    <div
      className={`w-60 rounded-xl border shadow-lg overflow-hidden text-xs flex flex-col bg-zinc-900 transition-shadow ${
        selected ? 'border-zinc-400 shadow-zinc-500/20' : 'border-zinc-700'
      }`}
    >
      <Handle type="target" position={Position.Top} id="top" className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-900" />
      <Handle type="target" position={Position.Left} id="left" className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-900" />
      <Handle type="target" position={Position.Bottom} id="bottom" className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-900" />
      <Handle type="target" position={Position.Right} id="right" className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-900" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-zinc-300 font-semibold tracking-wide uppercase text-[10px]">Video</span>
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

      {/* Fields */}
      <div className="p-3 flex flex-col gap-2">
        <input
          type="text"
          value={nodeData.label || ''}
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          placeholder="Label (e.g. 'Variant A')"
          className="bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-xs w-full"
        />

        {/* Views row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1 block">IG Views</label>
            <input
              type="number"
              value={nodeData.instagramViews ?? ''}
              onChange={(e) => updateNodeData(id, { instagramViews: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="0"
              min={0}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-xs w-full"
            />
          </div>
          <div>
            <label className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1 block">TT Views</label>
            <input
              type="number"
              value={nodeData.tiktokViews ?? ''}
              onChange={(e) => updateNodeData(id, { tiktokViews: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="0"
              min={0}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-xs w-full"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-zinc-500 text-[10px] uppercase tracking-wide">Script</label>
            <button
              onClick={() => { setImportOpen((o) => !o); setImportError('') }}
              className="text-[10px] text-zinc-500 hover:text-blue-400 transition-colors"
              title="Import transcript from TikTok URL"
            >
              {importOpen ? 'Cancel' : '↓ Import'}
            </button>
          </div>

          {importOpen && (
            <div className="mb-2 flex flex-col gap-1">
              <div className="flex gap-1">
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                  placeholder="Paste TikTok URL…"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-400 text-xs"
                  autoFocus
                />
                <button
                  onClick={handleImport}
                  disabled={importLoading || !importUrl.trim()}
                  className="px-2 py-1.5 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-xs disabled:opacity-50 disabled:cursor-wait shrink-0"
                >
                  {importLoading ? '…' : 'Get'}
                </button>
              </div>
              {importError && <p className="text-red-400 text-[10px]">{importError}</p>}
            </div>
          )}

          <textarea
            value={nodeData.script || ''}
            onChange={(e) => updateNodeData(id, { script: e.target.value })}
            onWheel={(e) => e.stopPropagation()}
            placeholder="Script…"
            rows={3}
            className="bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-xs w-full resize-none"
          />
        </div>

        <div>
          <label className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1 block">Thumbnail</label>
          <input
            type="text"
            value={nodeData.thumbnailDescription || ''}
            onChange={(e) => updateNodeData(id, { thumbnailDescription: e.target.value })}
            placeholder="Describe the thumbnail…"
            className="bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-xs w-full"
          />
        </div>

        <div>
          <label className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1 block">Music</label>
          <input
            type="text"
            value={nodeData.musicDescription || ''}
            onChange={(e) => updateNodeData(id, { musicDescription: e.target.value })}
            placeholder="Music / audio description…"
            className="bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-xs w-full"
          />
        </div>
      </div>
    </div>
  )
}

export default memo(VideoNode)
