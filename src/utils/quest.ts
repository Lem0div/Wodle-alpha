// src/utils/quest.ts
import { createClient } from '@/utils/supabase/client'
import { getLocalDateStr } from '@/utils/date'
import { getLevelForExp } from '@/utils/level'

export const DAILY_QUEST_COUNT = 3

// Deterministic per-user, per-day shuffle — same user + same date always
// picks the same quest ids, no need to persist an "assignment" anywhere.
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  function next() {
    h ^= h << 13; h >>>= 0
    h ^= h >>> 17
    h ^= h << 5; h >>>= 0
    return h / 4294967296
  }
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function pickDailyQuestIds(allIds: number[], userId: string, date: string): number[] {
  return seededShuffle(allIds, `${userId}-${date}`)
    .slice(0, DAILY_QUEST_COUNT)
    .sort((a, b) => a - b)
}

export async function incrementQuestProgress(questKey: string, amount: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: quest } = await supabase
    .from('quest')
    .select('id, target, reward_coin')
    .eq('key', questKey)
    .single()

  if (!quest) return

  const { data: allQuests } = await supabase.from('quest').select('id')
  const today = getLocalDateStr()
  const todaysIds = pickDailyQuestIds((allQuests ?? []).map(q => q.id), user.id, today)

  // not one of today's assigned quests for this user — nothing to track
  if (!todaysIds.includes(quest.id)) return

  const { data: existing } = await supabase
    .from('user_quest_progress')
    .select('id, progress, completed')
    .eq('user_id', user.id)
    .eq('quest_id', quest.id)
    .eq('date', today)
    .maybeSingle()

  if (existing?.completed) return

  const nextProgress = (existing?.progress ?? 0) + amount
  const justCompleted = nextProgress >= quest.target

  if (existing) {
    await supabase
      .from('user_quest_progress')
      .update({ progress: nextProgress, completed: justCompleted })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('user_quest_progress')
      .insert({
        user_id: user.id,
        quest_id: quest.id,
        date: today,
        progress: nextProgress,
        completed: justCompleted,
      })
  }

  if (!justCompleted) return

  const { data: profile } = await supabase
    .from('profile')
    .select('coin, exp')
    .eq('user_id', user.id)
    .single()

  if (!profile) return

  const expGained = quest.reward_coin * 50
  const newExp = profile.exp + expGained

  await supabase
    .from('profile')
    .update({
      coin: profile.coin + quest.reward_coin,
      exp: newExp,
      lv: getLevelForExp(newExp),
    })
    .eq('user_id', user.id)
}
