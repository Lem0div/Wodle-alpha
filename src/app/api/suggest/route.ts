// src/app/api/suggest/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { term } = await req.json()

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a Korean dictionary assistant. When given an English word, respond with only the most common Korean translation. No explanations, no extra words, just the Korean meaning. Example: apple -> 사과'
        },
        {
          role: 'user',
          content: term
        }
      ],
      max_tokens: 50
    })
  })

  const data = await response.json()
  const definition = data.choices?.[0]?.message?.content?.trim() ?? ''

  return NextResponse.json({ definition })
}
