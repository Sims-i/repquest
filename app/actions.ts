'use server'

import { headers } from 'next/headers'

type CoachResult = {
  error?: string
  message?: string
}

export type ChatTurn = { role: 'coach' | 'user'; text: string }

const MAX_PROMPT_LENGTH = 1000
const MAX_HISTORY_TURNS = 8
const MAX_HISTORY_TEXT = 2500
const REQUEST_TIMEOUT_MS = 20_000

// Simple in-memory rate limit: 12 requests per IP per 10 minutes.
// Note: on serverless hosts (e.g. Vercel) memory is per-instance, so this is a
// best-effort guard. For strict limits use a shared store such as Upstash Redis.
const RATE_LIMIT = 12
const RATE_WINDOW_MS = 10 * 60 * 1000
const hits = new Map<string, number[]>()

function isRateLimited(key: string) {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k)
    }
  }
  return false
}

export async function chatWithCoach(prompt: string, history: ChatTurn[] = []): Promise<CoachResult> {
  const message = typeof prompt === 'string' ? prompt.trim() : ''
  if (!message || message.length > MAX_PROMPT_LENGTH) {
    return { error: 'Please enter a message between 1 and 1,000 characters.' }
  }

  const apiKey = process.env.APP_OPENAI_API_KEY
  if (!apiKey) return { error: 'The AI coach is not configured yet.' }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  if (isRateLimited(ip)) {
    return { error: 'You are sending messages very quickly. Please wait a few minutes and try again.' }
  }

  const priorTurns = (Array.isArray(history) ? history : [])
    .filter(
      (turn) =>
        turn &&
        (turn.role === 'coach' || turn.role === 'user') &&
        typeof turn.text === 'string' &&
        turn.text.trim().length > 0,
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({
      role: turn.role === 'coach' ? ('assistant' as const) : ('user' as const),
      content: turn.text.slice(0, MAX_HISTORY_TEXT),
    }))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        max_output_tokens: 650,
        store: false,
        instructions:
          'You are RepQuest Coach, a concise and encouraging fitness coach. The user may be 13, so always give age-appropriate, no-equipment routines with moderate volume, rest days, warm-ups, and form-first guidance. Never promise a specific physique, promote restrictive dieting, supplements, maximal lifting, punishment exercise, or training through pain. Recommend speaking with a parent, guardian, coach, or healthcare professional for injuries or medical concerns. Ask one useful follow-up question when details are missing. Format routines as clear short sections and numbered exercises.',
        input: [...priorTurns, { role: 'user', content: message }],
      }),
    })

    if (!response.ok) {
      console.error('[coach] OpenAI request failed with status', response.status)
      return { error: 'The coach is taking a break. Please try again shortly.' }
    }

    const data = await response.json()
    const output =
      typeof data.output_text === 'string'
        ? data.output_text
        : data.output
            ?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? [])
            .map((item: { text?: string }) => item.text)
            .filter(Boolean)
            .join('\n')

    return {
      message: output || 'I could not create a routine from that. Try adding your goal and available workout days.',
    }
  } catch (error) {
    console.error('[coach] request error:', error instanceof Error ? error.name : error)
    return { error: 'The coach could not connect. Please try again.' }
  } finally {
    clearTimeout(timeout)
  }
}
