import OpenAI from 'openai'

let _openai: OpenAI | null = null
function getClient() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

const VISUAL_DESCRIPTION_PROMPT =
  'Describe the visual hook of this video in 10 words. Focus on: camera angle, text overlays, colors, and the subject\'s action.'

export async function getVisualDescription(imageUrl: string): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'low',
            },
          },
          {
            type: 'text',
            text: VISUAL_DESCRIPTION_PROMPT,
          },
        ],
      },
    ],
  })

  return response.choices[0]?.message?.content?.trim() || 'No visual description available'
}
