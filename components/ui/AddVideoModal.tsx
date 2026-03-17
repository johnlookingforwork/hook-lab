'use client'

import { useState } from 'react'
import type { TestGroup, Video } from '@/lib/types'

interface AddVideoModalProps {
  testGroups: TestGroup[]
  onClose: () => void
  onSuccess: (video: Video, testGroupId: string) => void
}

export default function AddVideoModal({ testGroups, onClose, onSuccess }: AddVideoModalProps) {
  const [url, setUrl] = useState('')
  const [testGroupId, setTestGroupId] = useState(testGroups[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || !testGroupId) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), testGroupId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Ingestion failed')
        setLoading(false)
        return
      }

      onSuccess(data.video, testGroupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Add Video</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">TikTok or Instagram Reels URL</label>
            <input
              autoFocus
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Test Group</label>
            {testGroups.length === 0 ? (
              <p className="text-xs text-zinc-500">No active test groups. Create one first.</p>
            ) : (
              <select
                value={testGroupId}
                onChange={(e) => setTestGroupId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
              >
                {testGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm text-zinc-400 border border-zinc-700 hover:border-zinc-600 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !url.trim() || !testGroupId}
              className="flex-1 py-2 rounded-lg text-sm font-semibold bg-yellow-400 hover:bg-yellow-300 text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Analyzing...
                </span>
              ) : (
                'Add Video'
              )}
            </button>
          </div>

          {loading && (
            <p className="text-xs text-zinc-500 text-center">
              Fetching metadata, generating AI description, and classifying hook type...
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
