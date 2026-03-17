export type Platform = 'tiktok' | 'instagram_reels'
export type GroupStatus = 'active' | 'concluded'

export const HOOK_TYPES = [
  'The Question',
  'The Result',
  'The Fear',
  'The Controversy',
  'The Transformation',
  'The Pattern Interrupt',
  'The Number / Statistic',
  'The Story Open',
] as const

export type HookType = (typeof HOOK_TYPES)[number]

export interface Video {
  id: string
  video_url: string
  platform: Platform
  thumbnail_url: string | null
  visual_description: string | null
  transcript_hook: string | null
  transcript_full: string | null
  hook_type: string | null
  views: number | null
  retention_3s_pct: number | null
  watch_time_pct: number | null
  shares_saves: number | null
  performance_score: number | null
  is_winner: boolean
  test_group_id: string | null
  created_at: string
}

export interface TestGroup {
  id: string
  name: string
  status: GroupStatus
  canvas_position: { x: number; y: number } | null
  conclusion: ConcludeResult | null
  created_at: string
  videos?: Video[]
}

export interface CanvasStateRow {
  id: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  updated_at: string
  test_group_id: string | null
}

// Matches React Flow node/edge shapes stored in DB
export interface CanvasNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
  width?: number
  height?: number
  parentId?: string
  extent?: 'parent'
  style?: Record<string, unknown>
  measured?: { width: number; height: number }
}

export interface CanvasEdge {
  id: string
  source: string
  target: string
  type?: string
}

// New manual canvas node data types
export interface SpokenHookNodeData {
  text: string
  testGroupId: string
  onDelete?: (nodeId: string) => void
}

export interface ThumbnailNodeData {
  label: string
  imageUrl?: string
  testGroupId: string
  onDelete?: (nodeId: string) => void
}

export interface SimpleVideoNodeData {
  label: string
  instagramViews: number | null
  tiktokViews: number | null
  thumbnailDescription: string
  script: string
  musicDescription: string
  testGroupId: string
  onDelete?: (nodeId: string) => void
}

export interface VideoStat {
  nodeId: string
  label: string
  totalViews: number
  script: string
  thumbnailDescription: string
  musicDescription: string
}

export interface ConcludeResult {
  videoStats: VideoStat[]
  keepDoing: string
  avoid: string
}

export interface Profile {
  id: string
  platform: Platform
  handle: string
  profile_url: string
  last_fetched_at: string | null
  created_at: string
  profile_videos?: ProfileVideo[]
}

export interface ProfileVideo {
  id: string
  profile_id: string
  platform_video_id: string
  video_url: string
  views: number | null
  thumbnail_url: string | null
  script: string | null
  uploaded_at: string | null
  created_at: string
}

// Performance score weights (configurable in Settings)
export interface ScoreWeights {
  retention3s: number  // default 0.40
  watchTime: number    // default 0.30
  views: number        // default 0.20
  sharesSaves: number  // default 0.10
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  retention3s: 0.40,
  watchTime: 0.30,
  views: 0.20,
  sharesSaves: 0.10,
}
