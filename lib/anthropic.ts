import Anthropic from '@anthropic-ai/sdk'
import { HOOK_TYPES } from './types'
import type { Video } from './types'

let _anthropic: Anthropic | null = null
function getClient() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

export async function classifyHookType(
  transcriptHook: string,
  visualDescription: string
): Promise<string> {
  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 50,
    messages: [
      {
        role: 'user',
        content: `Classify this video hook into exactly one of these categories:
${HOOK_TYPES.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Transcript (first 5s): "${transcriptHook}"
Visual description: "${visualDescription}"

Reply with only the category name, exactly as written above.`,
      },
    ],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
  // Validate against known types
  const matched = HOOK_TYPES.find(t => text.includes(t))
  return matched || text || 'The Question'
}

export async function generatePlaybookInsights(winners: Video[]): Promise<string[]> {
  if (winners.length === 0) return ['Not enough data to generate insights yet.']

  const winnerSummaries = winners.map((v, i) => {
    return `${i + 1}. Hook Type: ${v.hook_type || 'Unknown'}
   Visual: ${v.visual_description || 'N/A'}
   Transcript: "${v.transcript_hook || 'N/A'}"
   Views: ${v.views?.toLocaleString() || 'N/A'} | 3s Ret: ${v.retention_3s_pct != null ? v.retention_3s_pct + '%' : 'N/A'} | Watch Time: ${v.watch_time_pct != null ? v.watch_time_pct + '%' : 'N/A'} | Shares/Saves: ${v.shares_saves?.toLocaleString() || 'N/A'}
   Score: ${v.performance_score ?? 'N/A'}`
  }).join('\n\n')

  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `You are a content strategy analyst. Analyze these winning video hooks from an A/B testing system and surface 3-5 actionable patterns.

Winning hooks (top ${winners.length} by performance score):
${winnerSummaries}

Return exactly 3-5 bullet points (one per line, starting with "•"). Each bullet should identify a specific, actionable pattern or recommendation. Be concrete — reference specific hook types, visual patterns, or metrics where relevant.`,
      },
    ],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
  const bullets = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('•'))
    .map(l => l.slice(1).trim())

  return bullets.length > 0 ? bullets : [text]
}
