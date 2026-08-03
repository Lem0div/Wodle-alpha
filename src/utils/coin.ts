// src/utils/coin.ts
import { createClient } from '@/utils/supabase/client'
import { getLevelForExp } from '@/utils/level'

const BOOST_MULTIPLIER: Record<string, number> = {
  double_boost: 2,
  mega_boost: 3,
}

export async function awardCoins(correctCount: number): Promise<{ earned: number; bonus: number; exp: number; boostMultiplier: number }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return { earned: 0, bonus: 0, exp: 0, boostMultiplier: 1 }

  const base = correctCount

  const bonusCount = Math.floor(correctCount / 5)
  let bonus = 0
  for (let i = 0; i < bonusCount; i++) {
    bonus += Math.floor(Math.random() * 5) + 1
  }

  const total = base + bonus
  if (total === 0) return { earned: 0, bonus: 0, exp: 0, boostMultiplier: 1 }

  const { data: profile } = await supabase
    .from('profile')
    .select('coin, exp, pending_boost')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { earned: 0, bonus: 0, exp: 0, boostMultiplier: 1 }

  const boostMultiplier = profile.pending_boost ? (BOOST_MULTIPLIER[profile.pending_boost] ?? 1) : 1
  const coinGained = total * boostMultiplier
  const expGained = coinGained * 50

  const newExp = profile.exp + expGained

  await supabase
    .from('profile')
    .update({
      coin: profile.coin + coinGained,
      exp: newExp,
      lv: getLevelForExp(newExp),
      pending_boost: null,
    })
    .eq('user_id', user.id)

  return { earned: base * boostMultiplier, bonus: bonus * boostMultiplier, exp: expGained, boostMultiplier }
}
