'use client'

import { useState } from 'react'

export default function InsightEngine() {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<string[]>([])
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    setLoading(true)
    setError('')
    setInsights([])

    try {
      const res = await fetch('/api/insights', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Analysis failed')
        return
      }

      setInsights(data.insights)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">AI Playbook Analysis</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Sends your top 20 winners to Claude for pattern analysis. Returns 3–5 actionable insights.
          </p>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold bg-yellow-400 hover:bg-yellow-300 text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            '✨ Analyze My Playbook'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {insights.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-yellow-400">✦</span>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              Playbook Insights
            </span>
          </div>
          <ul className="flex flex-col gap-3">
            {insights.map((insight, i) => (
              <li key={i} className="flex gap-3 text-sm text-zinc-200 leading-relaxed">
                <span className="text-yellow-400 shrink-0 mt-0.5">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
