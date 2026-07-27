// src/utils/coin.ts
import { createClient } from '@/utils/supabase/client'
import { getLevelForExp } from '@/utils/level'

export async function awardCoins(correctCount: number): Promise<{ earned: number; bonus: number; exp: number }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return { earned: 0, bonus: 0, exp: 0 }

  const base = correctCount

  const bonusCount = Math.floor(correctCount / 5)
  let bonus = 0
  for (let i = 0; i < bonusCount; i++) {
    bonus += Math.floor(Math.random() * 5) + 1
  }

  const total = base + bonus
  if (total === 0) return { earned: 0, bonus: 0, exp: 0 }

  const expGained = total * 50

  const { data: profile } = await supabase
    .from('profile')
    .select('coin, exp')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { earned: 0, bonus: 0, exp: 0 }

  const newExp = profile.exp + expGained

  await supabase
    .from('profile')
    .update({ coin: profile.coin + total, exp: newExp, lv: getLevelForExp(newExp) })
    .eq('user_id', user.id)

  return { earned: base, bonus, exp: expGained }
}
