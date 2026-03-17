'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { Video } from '@/lib/types'
import { HOOK_TYPES } from '@/lib/types'

interface PatternTallyProps {
  winners: Video[]
  totalTests: number
}

const HOOK_COLORS: Record<string, string> = {
  'The Question': '#3b82f6',
  'The Result': '#22c55e',
  'The Fear': '#ef4444',
  'The Controversy': '#f97316',
  'The Transformation': '#a855f7',
  'The Pattern Interrupt': '#ec4899',
  'The Number / Statistic': '#eab308',
  'The Story Open': '#14b8a6',
}

export default function PatternTally({ winners, totalTests }: PatternTallyProps) {
  if (winners.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-600">
        <p className="text-sm">No winners yet — pattern data will appear here.</p>
      </div>
    )
  }

  // Aggregate by hook type
  const tallies: Record<string, { count: number; totalScore: number }> = {}
  for (const hookType of HOOK_TYPES) {
    tallies[hookType] = { count: 0, totalScore: 0 }
  }

  for (const winner of winners) {
    const ht = winner.hook_type || 'Unknown'
    if (!tallies[ht]) tallies[ht] = { count: 0, totalScore: 0 }
    tallies[ht].count++
    tallies[ht].totalScore += winner.performance_score ?? 0
  }

  const chartData = Object.entries(tallies)
    .filter(([, v]) => v.count > 0)
    .map(([hookType, v]) => ({
      name: hookType.replace('The ', ''),
      fullName: hookType,
      count: v.count,
      avgScore: v.count > 0 ? Math.round((v.totalScore / v.count) * 10) / 10 : 0,
      winRate: totalTests > 0 ? Math.round((v.count / totalTests) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total Winners"
          value={winners.length.toString()}
        />
        <StatCard
          label="Tests Run"
          value={totalTests.toString()}
        />
        <StatCard
          label="Top Hook Type"
          value={chartData[0]?.fullName || '—'}
          small
        />
      </div>

      {/* Hook type distribution */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          Winner Distribution by Hook Type
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ left: -20, right: 10 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const d = payload[0].payload
                return (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs">
                    <p className="text-white font-semibold">{d.fullName}</p>
                    <p className="text-zinc-400">{d.count} winner{d.count !== 1 ? 's' : ''}</p>
                    <p className="text-zinc-400">Avg score: {d.avgScore}</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.fullName}
                  fill={HOOK_COLORS[entry.fullName] || '#52525b'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Average score by hook type */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          Average Performance Score by Hook Type
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ left: -20, right: 10 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const d = payload[0].payload
                return (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs">
                    <p className="text-white font-semibold">{d.fullName}</p>
                    <p className="text-zinc-400">Avg score: {d.avgScore}</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="avgScore" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.fullName}
                  fill={HOOK_COLORS[entry.fullName] || '#52525b'}
                  fillOpacity={0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="text-zinc-500 border-b border-zinc-800">
            <th className="text-left py-2 font-medium">Hook Type</th>
            <th className="text-right py-2 font-medium">Winners</th>
            <th className="text-right py-2 font-medium">Avg Score</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((row) => (
            <tr key={row.fullName} className="border-b border-zinc-900">
              <td className="py-2 text-zinc-300 flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full inline-block shrink-0"
                  style={{ background: HOOK_COLORS[row.fullName] || '#52525b' }}
                />
                {row.fullName}
              </td>
              <td className="py-2 text-right text-white font-medium">{row.count}</td>
              <td className="py-2 text-right text-white font-medium">{row.avgScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`font-bold text-white ${small ? 'text-sm' : 'text-2xl'}`}>{value}</p>
    </div>
  )
}
