import { createServiceClient } from '@/lib/supabase-server'
import ArchiveView from '@/components/golden-folder/ArchiveView'
import PatternTally from '@/components/golden-folder/PatternTally'
import InsightEngine from '@/components/golden-folder/InsightEngine'
import type { TestGroup, Video } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function GoldenFolderPage() {
  const supabase = createServiceClient()

  // All concluded test groups with their videos
  const { data: testGroups } = await supabase
    .from('test_groups')
    .select('*, videos(*)')
    .eq('status', 'concluded')
    .order('created_at', { ascending: false })

  // All winners for pattern tally
  const { data: winners } = await supabase
    .from('videos')
    .select('*')
    .eq('is_winner', true)
    .order('performance_score', { ascending: false })

  const groups: TestGroup[] = testGroups || []
  const winnerVideos: Video[] = winners || []
  const totalTests = groups.length

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🏆 Golden Folder
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Your concluded A/B tests — every winner, pattern, and insight in one place.
          </p>
        </div>

        {/* Archive */}
        <section>
          <SectionHeader title="Archive" description="All concluded test groups. Click any test to view variants side-by-side." />
          <ArchiveView testGroups={groups} />
        </section>

        {/* Pattern Tally */}
        <section>
          <SectionHeader title="Pattern Tally" description="Which hook types are winning, and by how much?" />
          <PatternTally winners={winnerVideos} totalTests={totalTests} />
        </section>

        {/* AI Insight Engine */}
        <section>
          <SectionHeader title="AI Insight Engine" description="One-click pattern analysis powered by Claude." />
          <InsightEngine />
        </section>
      </div>
    </div>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4 pb-3 border-b border-zinc-800">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
    </div>
  )
}
