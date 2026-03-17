'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { TestGroup, Video } from '@/lib/types'
import { HOOK_TYPES } from '@/lib/types'

interface ArchiveViewProps {
  testGroups: TestGroup[]
}

export default function ArchiveView({ testGroups }: ArchiveViewProps) {
  const [hookFilter, setHookFilter] = useState<string>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date')

  const filtered = useMemo(() => {
    return testGroups
      .filter((g) => {
        const winner = g.videos?.find((v: Video) => v.is_winner)
        if (!winner) return false
        if (hookFilter !== 'all' && winner.hook_type !== hookFilter) return false
        if (platformFilter !== 'all' && winner.platform !== platformFilter) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'score') {
          const aScore = a.videos?.find((v: Video) => v.is_winner)?.performance_score ?? 0
          const bScore = b.videos?.find((v: Video) => v.is_winner)?.performance_score ?? 0
          return bScore - aScore
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [testGroups, hookFilter, platformFilter, sortBy])

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={hookFilter}
          onChange={(e) => setHookFilter(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400"
        >
          <option value="all">All hook types</option>
          {HOOK_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400"
        >
          <option value="all">All platforms</option>
          <option value="tiktok">TikTok</option>
          <option value="instagram_reels">Instagram Reels</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'score')}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-400"
        >
          <option value="date">Sort: Newest first</option>
          <option value="score">Sort: Highest score</option>
        </select>

        <span className="text-zinc-500 text-sm ml-auto">
          {filtered.length} test{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-sm">No concluded tests yet.</p>
          <p className="text-xs mt-1">Mark a video as winner to archive a test here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((group) => {
            const winner = group.videos?.find((v: Video) => v.is_winner)
            const allVideos = group.videos || []
            if (!winner) return null

            return (
              <Link
                key={group.id}
                href={`/test/${group.id}`}
                className="group bg-zinc-900 border border-zinc-800 hover:border-yellow-400/40 rounded-xl overflow-hidden transition-colors"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-zinc-800">
                  {winner.thumbnail_url ? (
                    <Image
                      src={winner.thumbnail_url}
                      alt={group.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">
                      No thumbnail
                    </div>
                  )}
                  <div className="absolute top-2 left-2 text-sm">👑</div>
                  <div className="absolute top-2 right-2">
                    <span className="text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                      {winner.platform === 'tiktok' ? 'TikTok' : 'Reels'}
                    </span>
                  </div>
                </div>

                <div className="p-3 flex flex-col gap-1.5">
                  <h3 className="text-xs font-semibold text-white truncate group-hover:text-yellow-400 transition-colors">
                    {group.name}
                  </h3>

                  {winner.hook_type && (
                    <span className="text-[10px] text-zinc-400">{winner.hook_type}</span>
                  )}

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-zinc-600">
                      {allVideos.length} variant{allVideos.length !== 1 ? 's' : ''}
                    </span>
                    {winner.performance_score != null && (
                      <span className="text-[10px] font-bold text-yellow-400">
                        Score {winner.performance_score.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-zinc-600">
                    {new Date(group.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
