import type { Video, ScoreWeights } from './types'
import { DEFAULT_WEIGHTS } from './types'

/**
 * Compute weighted performance score (0-100) for a video.
 * Metrics are normalized against the max observed value across all videos.
 */
export function computePerformanceScore(
  video: Pick<Video, 'views' | 'retention_3s_pct' | 'watch_time_pct' | 'shares_saves'>,
  allVideos: Pick<Video, 'views' | 'retention_3s_pct' | 'watch_time_pct' | 'shares_saves'>[],
  weights: ScoreWeights = DEFAULT_WEIGHTS
): number {
  const maxViews = Math.max(...allVideos.map(v => v.views ?? 0), 1)
  const maxShares = Math.max(...allVideos.map(v => v.shares_saves ?? 0), 1)

  const normalizedViews = (video.views ?? 0) / maxViews
  const normalizedShares = (video.shares_saves ?? 0) / maxShares
  const retention = Math.min((video.retention_3s_pct ?? 0) / 100, 1)
  const watchTime = Math.min((video.watch_time_pct ?? 0) / 100, 1)

  const score =
    retention * weights.retention3s +
    watchTime * weights.watchTime +
    normalizedViews * weights.views +
    normalizedShares * weights.sharesSaves

  return Math.round(score * 100 * 10) / 10 // one decimal place, 0-100
}
