// src/app/api/vision/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageBase64, mimeType } = await req.json()

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY_VISION}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content: `You are an OCR assistant. Look at the image and find English words that are paired with their Korean translations written next to them.
DO NOT translate yourself. Only extract what is visually written in the image.
Respond ONLY in this JSON format, no extra text:
{"words": [{"term": "영단어", "definition": "옆에적힌한국어뜻"}, ...]}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`
              }
            },
            {
              type: 'text',
              text: '이미지에서 영단어와 바로 옆에 적힌 한국어 뜻을 그대로 읽어서 추출해줘. 네가 번역하지 말고 사진에 적힌 것만 읽어.'
            }
          ]
        }
      ],
      max_tokens: 1000
    })
  })

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content?.trim() ?? '{}'

  try {
    const parsed = JSON.parse(content)
    return NextResponse.json({ words: parsed.words ?? [] })
  } catch {
    return NextResponse.json({ words: [] })
  }
}
