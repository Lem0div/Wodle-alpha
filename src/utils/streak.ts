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
    .select('streak, last_login_at')
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

  const isConsecutive = lastLogin === yesterdayStr

  await supabase
    .from('profile')
    .update({
      streak: isConsecutive ? profile.streak + 1 : 1,
      last_login_at: today
    })
    .eq('user_id', user.id)
}
