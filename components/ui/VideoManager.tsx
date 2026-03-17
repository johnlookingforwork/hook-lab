'use client'

import { useState } from 'react'
import type { Profile, ProfileVideo } from '@/lib/types'

interface VideoManagerProps {
  initialProfiles: Profile[]
  onAddVideo: (video: ProfileVideo, platform: string) => void
}

export default function VideoManager({ initialProfiles, onAddVideo }: VideoManagerProps) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [collapsed, setCollapsed] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(initialProfiles.map((p) => p.id))
  )
  const [addingUrl, setAddingUrl] = useState('')
  const [addingLoading, setAddingLoading] = useState(false)
  const [addingError, setAddingError] = useState('')
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAddProfile = async () => {
    const url = addingUrl.trim()
    if (!url) return
    setAddingLoading(true)
    setAddingError('')
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) { setAddingError(data.error || 'Failed to load profile'); return }
      setProfiles((prev) => {
        const exists = prev.findIndex((p) => p.id === data.id)
        return exists >= 0 ? prev.map((p) => (p.id === data.id ? data : p)) : [...prev, data]
      })
      setExpandedIds((prev) => new Set(Array.from(prev).concat(data.id)))
      setAddingUrl('')
    } catch {
      setAddingError('Network error')
    } finally {
      setAddingLoading(false)
    }
  }

  const handleRefresh = async (profileId: string) => {
    setRefreshingId(profileId)
    try {
      const res = await fetch(`/api/profiles/${profileId}/refresh`, { method: 'POST' })
      if (!res.ok) return
      const updated = await res.json()
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? updated : p)))
    } finally {
      setRefreshingId(null)
    }
  }

  const handleDelete = async (profileId: string) => {
    await fetch(`/api/profiles/${profileId}`, { method: 'DELETE' })
    setProfiles((prev) => prev.filter((p) => p.id !== profileId))
  }

  const totalVideos = profiles.reduce((sum, p) => sum + (p.profile_videos?.length ?? 0), 0)

  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center py-3 px-1.5 bg-zinc-950 border-r border-zinc-800 gap-3">
        <button
          onClick={() => setCollapsed(false)}
          className="text-zinc-500 hover:text-zinc-200 transition-colors"
          title="Open Video Library"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
        <span className="text-[10px] text-zinc-600 [writing-mode:vertical-rl] rotate-180 select-none">
          Library {totalVideos > 0 ? `(${totalVideos})` : ''}
        </span>
      </div>
    )
  }

  return (
    <div className="w-64 shrink-0 h-full flex flex-col bg-zinc-950 border-r border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-300">
          Video Library
          {totalVideos > 0 && <span className="text-zinc-600 font-normal ml-1">({totalVideos})</span>}
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-zinc-600 hover:text-zinc-300 transition-colors"
          title="Collapse"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Add profile input */}
      <div className="px-3 py-2 border-b border-zinc-800">
        <div className="flex gap-1.5">
          <input
            type="url"
            value={addingUrl}
            onChange={(e) => { setAddingUrl(e.target.value); setAddingError('') }}
            onKeyDown={(e) => e.key === 'Enter' && !addingLoading && handleAddProfile()}
            placeholder="Paste profile URL…"
            className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-yellow-400"
          />
          <button
            onClick={handleAddProfile}
            disabled={addingLoading || !addingUrl.trim()}
            className="px-2 py-1.5 rounded bg-yellow-400/20 text-yellow-400 text-xs hover:bg-yellow-400/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Load profile"
          >
            {addingLoading ? (
              <span className="w-3 h-3 border border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin block" />
            ) : (
              '+'
            )}
          </button>
        </div>
        {addingError && (
          <p className="text-red-400 text-[10px] mt-1">{addingError}</p>
        )}
        {addingLoading && (
          <p className="text-zinc-500 text-[10px] mt-1">Fetching videos + transcripts…</p>
        )}
      </div>

      {/* Profile list */}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0 overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
        {profiles.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <p className="text-zinc-600 text-xs">Paste a TikTok or Instagram profile URL above to load your videos.</p>
          </div>
        )}

        {profiles.map((profile) => {
          const isExpanded = expandedIds.has(profile.id)
          const isRefreshing = refreshingId === profile.id
          const videos = profile.profile_videos ?? []

          return (
            <div key={profile.id} className="border-b border-zinc-800/60">
              {/* Profile header row */}
              <div className="flex items-center gap-1.5 px-3 py-2 hover:bg-zinc-900/50 transition-colors">
                <button
                  onClick={() => toggleExpand(profile.id)}
                  className="text-zinc-500 text-[10px] shrink-0"
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
                <button
                  onClick={() => toggleExpand(profile.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <span className="text-xs text-zinc-200 font-medium truncate block">
                    @{profile.handle}
                  </span>
                  <span className="text-[10px] text-zinc-600 capitalize">
                    {profile.platform === 'instagram_reels' ? 'Instagram' : 'TikTok'} · {videos.length} videos
                  </span>
                </button>
                <button
                  onClick={() => handleRefresh(profile.id)}
                  disabled={isRefreshing}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0 p-0.5"
                  title="Refresh"
                >
                  <svg
                    className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(profile.id)}
                  className="text-zinc-700 hover:text-red-400 transition-colors shrink-0 p-0.5"
                  title="Remove profile"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Video list */}
              {isExpanded && (
                <div className="px-2 pb-2 flex flex-col gap-1.5">
                  {videos.length === 0 && (
                    <p className="text-zinc-600 text-[10px] px-1">No videos found.</p>
                  )}
                  {videos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      platform={profile.platform}
                      onAdd={() => onAddVideo(video, profile.platform)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}

function VideoCard({
  video,
  platform,
  onAdd,
}: {
  video: ProfileVideo
  platform: string
  onAdd: () => void
}) {
  const scriptPreview = video.script
    ? video.script.slice(0, 80) + (video.script.length > 80 ? '…' : '')
    : null

  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden text-xs">
      {/* Thumbnail */}
      {video.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={video.thumbnail_url}
          alt=""
          className="w-full aspect-video object-cover bg-zinc-800"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div className="w-full aspect-video bg-zinc-800 flex items-center justify-center">
          <svg className="w-5 h-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}

      <div className="p-2">
        {/* Upload date + platform */}
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-zinc-300 font-medium">
            {video.uploaded_at
              ? new Date(video.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : '—'}
          </span>
          <span className="text-[10px] text-zinc-600">
            {platform === 'instagram_reels' ? 'IG' : 'TT'}
          </span>
        </div>
        {/* Views */}
        <div className="mb-1">
          <span className="text-zinc-500 text-[10px]">
            {video.views != null ? video.views.toLocaleString() : '—'} views
          </span>
        </div>

        {/* Script preview */}
        {scriptPreview && (
          <p className="text-zinc-500 text-[10px] leading-snug mb-2 line-clamp-2">{scriptPreview}</p>
        )}
        {!scriptPreview && (
          <p className="text-zinc-700 text-[10px] mb-2 italic">No transcript</p>
        )}

        {/* Add button */}
        <button
          onClick={onAdd}
          className="w-full py-1 rounded bg-zinc-800 hover:bg-yellow-400/20 text-zinc-400 hover:text-yellow-400 text-[10px] font-medium transition-colors border border-zinc-700 hover:border-yellow-400/30"
        >
          + Add to canvas
        </button>
      </div>
    </div>
  )
}
