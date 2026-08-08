// src/utils/streak.ts
import { createClient } from '@/utils/supabase/client'
import { getLocalDateStr } from '@/utils/date'

export async function updateStreak() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return

  const { data: profile } = await supabase
    .from('profile')
    .select('streak, last_login_at, streak_freeze_count')
    .eq('user_id', user.id)
    .single()

  if (!profile) return

  // 날짜만 YYYY-MM-DD 형식으로 비교 (로컬 기준 — UTC로 계산하면 자정~오전 9시
  // 사이(KST)에 날짜가 하루 밀리는 문제가 있었음)
  const today = getLocalDateStr()
  const lastLogin = profile.last_login_at
    ? String(profile.last_login_at).slice(0, 10)
    : null

  // 오늘 이미 했으면 스킵
  if (lastLogin === today) return

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = getLocalDateStr(yesterday)

  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const twoDaysAgoStr = getLocalDateStr(twoDaysAgo)

  const isConsecutive = lastLogin === yesterdayStr
  // exactly one day missed (last login was two days ago, not further back)
  const isOneDayGap = lastLogin === twoDaysAgoStr

  // a streak freeze (bought from the shop) only bridges a single missed day —
  // skipping 2+ days always resets, no matter how many freezes are banked
  const canUseFreeze = isOneDayGap && profile.streak > 0 && profile.streak_freeze_count > 0
  const keepsStreak = isConsecutive || canUseFreeze

  await supabase
    .from('profile')
    .update({
      streak: keepsStreak ? profile.streak + 1 : 1,
      last_login_at: today,
      ...(canUseFreeze ? { streak_freeze_count: profile.streak_freeze_count - 1 } : {}),
    })
    .eq('user_id', user.id)
}
