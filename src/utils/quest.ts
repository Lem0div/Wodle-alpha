// src/utils/quest.ts
import { createClient } from '@/utils/supabase/client'
import { getLocalDateStr, getWeekStartStr } from '@/utils/date'
import { getLevelForExp } from '@/utils/level'
import { hashToUnitFloat, seededShuffle } from '@/utils/random'

export const DAILY_QUEST_COUNT = 3
export const WEEKLY_QUEST_COUNT = 2
export const HIDDEN_QUEST_COUNT = 1
// very low odds — rolled fresh each day per user, harder + better-rewarded
// than even weekly quests when it does show up
export const HIDDEN_QUEST_CHANCE = 0.05

export type QuestPeriod = 'daily' | 'weekly' | 'hidden'

// reroll is profile.quest_reroll — bumped by the admin panel's "초기화"
// button so the selection actually changes on demand, instead of staying
// pinned to the same picks until the period key itself rolls over.
export function pickQuestIds(allIds: number[], userId: string, periodKey: string, count: number, reroll = 0): number[] {
  return seededShuffle(allIds, `${userId}-${periodKey}-r${reroll}`)
    .slice(0, count)
    .sort((a, b) => a - b)
}

export function getPeriodKey(period: QuestPeriod, now: Date = new Date()): string {
  return period === 'weekly' ? getWeekStartStr(now) : getLocalDateStr(now)
}

export async function getQuestReroll(supabase: ReturnType<typeof createClient>, userId: string): Promise<number> {
  const { data } = await supabase.from('profile').select('quest_reroll').eq('user_id', userId).single()
  return data?.quest_reroll ?? 0
}

// deterministic per-user, per-day dice roll for whether a hidden quest is
// even in play today — same user + same day always rolls the same result
// (unless rerolled — see pickQuestIds)
export function isHiddenQuestRolled(userId: string, dateKey: string, reroll = 0): boolean {
  return hashToUnitFloat(`${userId}-${dateKey}-r${reroll}-hidden-roll`) < HIDDEN_QUEST_CHANCE
}

export type HiddenQuest = {
  id: number
  key: string
  title: string
  description: string
  target: number
  reward_coin: number
}

// returns today's hidden quest for the current user if the rare roll hit
// and it hasn't already been completed today, otherwise null. Pass userId
// when the caller already has it (BottomNav renders on every page, so
// skipping a redundant auth lookup there matters) — otherwise it's read
// from the local session.
export async function getAvailableHiddenQuest(userId?: string): Promise<HiddenQuest | null> {
  const supabase = createClient()

  let uid = userId
  if (!uid) {
    const { data: { session } } = await supabase.auth.getSession()
    uid = session?.user?.id
  }
  if (!uid) return null

  const reroll = await getQuestReroll(supabase, uid)
  const today = getLocalDateStr()
  if (!isHiddenQuestRolled(uid, today, reroll)) return null

  const { data: hiddenPool } = await supabase
    .from('quest')
    .select('id, key, title, description, target, reward_coin')
    .eq('period', 'hidden')

  if (!hiddenPool || hiddenPool.length === 0) return null

  const pickedIds = pickQuestIds(hiddenPool.map(q => q.id), uid, today, HIDDEN_QUEST_COUNT, reroll)
  const quest = hiddenPool.find(q => pickedIds.includes(q.id))
  if (!quest) return null

  const { data: progress } = await supabase
    .from('user_quest_progress')
    .select('completed')
    .eq('user_id', uid)
    .eq('quest_id', quest.id)
    .eq('date', today)
    .maybeSingle()

  if (progress?.completed) return null

  return quest
}

export type QuestKeys = { daily: string[]; weekly: string[] }

function sameKeySet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((key, i) => key === sortedB[i])
}

// today's daily+weekly quest keys for a given reroll value — shared by the
// admin panel (display) and rerollQuestSelection (comparing before/after)
export async function computeQuestKeys(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  reroll: number
): Promise<QuestKeys> {
  const { data: quests } = await supabase.from('quest').select('id, key, period')
  if (!quests) return { daily: [], weekly: [] }

  const now = new Date()
  const dailyPool = quests.filter(q => q.period === 'daily')
  const weeklyPool = quests.filter(q => q.period === 'weekly')

  const dailyIds = pickQuestIds(dailyPool.map(q => q.id), userId, getPeriodKey('daily', now), DAILY_QUEST_COUNT, reroll)
  const weeklyIds = pickQuestIds(weeklyPool.map(q => q.id), userId, getPeriodKey('weekly', now), WEEKLY_QUEST_COUNT, reroll)

  return {
    daily: dailyPool.filter(q => dailyIds.includes(q.id)).map(q => q.key),
    weekly: weeklyPool.filter(q => weeklyIds.includes(q.id)).map(q => q.key),
  }
}

// bumps profile.quest_reroll until today's daily+weekly selection actually
// differs from before (the pool is small enough — 10 daily combos, 3 weekly
// — that a single reroll can coincidentally repeat), then persists it.
// Used by both the admin panel's "초기화" button and the quest-reroll-ticket
// consumable in the shop.
export async function rerollQuestSelection(userId: string): Promise<{ reroll: number; keys: QuestKeys }> {
  const supabase = createClient()
  const currentReroll = await getQuestReroll(supabase, userId)
  const previousKeys = await computeQuestKeys(supabase, userId, currentReroll)

  let nextReroll = currentReroll
  let nextKeys = previousKeys
  for (let attempt = 0; attempt < 20; attempt++) {
    nextReroll++
    nextKeys = await computeQuestKeys(supabase, userId, nextReroll)
    const unchanged = sameKeySet(nextKeys.daily, previousKeys.daily) && sameKeySet(nextKeys.weekly, previousKeys.weekly)
    if (!unchanged) break
  }

  await supabase.from('profile').update({ quest_reroll: nextReroll }).eq('user_id', userId)
  return { reroll: nextReroll, keys: nextKeys }
}

type QuestRow = {
  id: number
  period: QuestPeriod
  target: number
  reward_coin: number
}

// eventKey is what callers already pass (e.g. 'study_words', 'login') — a
// single call can advance both a daily and a weekly quest that share the
// same event, since they're matched by event_key rather than by exact quest.
export async function incrementQuestProgress(eventKey: string, amount: number) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return

  const { data: matchingQuests } = await supabase
    .from('quest')
    .select('id, period, target, reward_coin')
    .eq('event_key', eventKey)

  if (!matchingQuests || matchingQuests.length === 0) return

  const reroll = await getQuestReroll(supabase, user.id)
  const now = new Date()

  for (const period of ['daily', 'weekly', 'hidden'] as QuestPeriod[]) {
    const questsInPeriod = (matchingQuests as QuestRow[]).filter(q => q.period === period)
    if (questsInPeriod.length === 0) continue

    const periodKey = getPeriodKey(period, now)

    // hidden quests only exist at all on days the rare roll hits
    if (period === 'hidden' && !isHiddenQuestRolled(user.id, periodKey, reroll)) continue

    const { data: allInPeriod } = await supabase.from('quest').select('id').eq('period', period)
    const count = period === 'daily' ? DAILY_QUEST_COUNT : period === 'weekly' ? WEEKLY_QUEST_COUNT : HIDDEN_QUEST_COUNT
    const assignedIds = pickQuestIds((allInPeriod ?? []).map(q => q.id), user.id, periodKey, count, reroll)

    for (const quest of questsInPeriod) {
      if (!assignedIds.includes(quest.id)) continue
      await applyQuestProgress(supabase, user.id, quest, periodKey, amount)
    }
  }
}

async function applyQuestProgress(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  quest: QuestRow,
  periodKey: string,
  amount: number
) {
  const { data: existing } = await supabase
    .from('user_quest_progress')
    .select('id, progress, completed')
    .eq('user_id', userId)
    .eq('quest_id', quest.id)
    .eq('date', periodKey)
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
        user_id: userId,
        quest_id: quest.id,
        date: periodKey,
        progress: nextProgress,
        completed: justCompleted,
      })
  }

  if (!justCompleted) return

  const { data: profile } = await supabase
    .from('profile')
    .select('coin, exp')
    .eq('user_id', userId)
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
    .eq('user_id', userId)
}
