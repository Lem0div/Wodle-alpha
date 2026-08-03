// src/app/[id]/admin/page.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import { getLevelForExp, expRequiredForLevel } from '@/utils/level'
import { getPeriodKey, getAvailableHiddenQuest, computeQuestKeys, rerollQuestSelection } from '@/utils/quest'
import { getLocalDateStr } from '@/utils/date'
import '@/styles/admin.css'

type Profile = {
  username: string
  is_admin: boolean
  coin: number
  exp: number
  lv: number
  streak: number
  quest_reroll: number
}

export default function AdminPage() {
  const params = useParams()
  const userId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [todaysQuestKeys, setTodaysQuestKeys] = useState<{ daily: string[]; weekly: string[] }>({ daily: [], weekly: [] })
  const [hiddenQuestKey, setHiddenQuestKey] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from('profile')
        .select('username, is_admin, coin, exp, lv, streak, quest_reroll')
        .eq('user_id', userId)
        .single()
      setProfile(data)
      setLoading(false)

      if (data) {
        setTodaysQuestKeys(await computeQuestKeys(supabase, userId, data.quest_reroll))
        const hidden = await getAvailableHiddenQuest(userId)
        setHiddenQuestKey(hidden?.key ?? null)
      }
    }
    init()
  }, [])

  async function adjustCoin(amount: number) {
    if (!profile) return
    const nextCoin = Math.max(0, profile.coin + amount)
    await supabase.from('profile').update({ coin: nextCoin }).eq('user_id', userId)
    setProfile({ ...profile, coin: nextCoin })
  }

  async function adjustExp(amount: number) {
    if (!profile) return
    const nextExp = Math.max(0, profile.exp + amount)
    const nextLv = getLevelForExp(nextExp)
    await supabase.from('profile').update({ exp: nextExp, lv: nextLv }).eq('user_id', userId)
    setProfile({ ...profile, exp: nextExp, lv: nextLv })
  }

  async function adjustStreak(amount: number) {
    if (!profile) return
    const nextStreak = Math.max(0, profile.streak + amount)
    // StreakCard derives "which days were attended" by counting back from
    // last_login_at — bumping streak without anchoring it to today left
    // last_login_at stale (or null after a reset), so nothing showed as
    // attended even though the streak number itself went up
    await supabase.from('profile').update({ streak: nextStreak, last_login_at: getLocalDateStr() }).eq('user_id', userId)
    setProfile({ ...profile, streak: nextStreak })
  }

  async function resetStreak() {
    if (!profile) return
    await supabase.from('profile').update({ streak: 0, last_login_at: null }).eq('user_id', userId)
    setProfile({ ...profile, streak: 0 })
  }

  async function resetTodaysQuestProgress() {
    if (!profile) return
    const dailyKey = getPeriodKey('daily')
    const weeklyKey = getPeriodKey('weekly')
    const { error } = await supabase
      .from('user_quest_progress')
      .delete()
      .eq('user_id', userId)
      .in('date', [dailyKey, weeklyKey])

    if (error) {
      setMessage(`초기화 실패: ${error.message}`)
      setTimeout(() => setMessage(''), 2500)
      return
    }

    // bump the reroll counter so the quest *selection* actually changes too
    const { reroll: nextReroll, keys: nextKeys } = await rerollQuestSelection(userId)
    setProfile({ ...profile, quest_reroll: nextReroll })
    setTodaysQuestKeys(nextKeys)

    const hidden = await getAvailableHiddenQuest(userId)
    setHiddenQuestKey(hidden?.key ?? null)

    setMessage('오늘/이번 주 퀘스트 진행 + 선택을 초기화했어요.')
    setTimeout(() => setMessage(''), 2500)
  }

  if (loading) return null

  if (!profile?.is_admin) {
    return (
      <div className="admin-container">
        <p className="admin-denied">관리자만 접근할 수 있어요.</p>
        <button className="admin-btn" onClick={() => router.push(`/${userId}/home`)}>홈으로</button>
      </div>
    )
  }

  const expForLv = expRequiredForLevel(profile.lv)
  const expForNextLv = expRequiredForLevel(profile.lv + 1)

  return (
    <div>
      <div className="admin-container">
        <h2 className="admin-title">🛠 관리자 패널</h2>
        <p className="admin-subtitle">{profile.username}의 데이터를 직접 조작해요 (테스트용)</p>

        <div className="admin-section">
          <div className="admin-section-title">코인 — {profile.coin.toLocaleString()}</div>
          <div className="admin-btn-row">
            <button className="admin-btn" onClick={() => adjustCoin(10)}>+10</button>
            <button className="admin-btn" onClick={() => adjustCoin(100)}>+100</button>
            <button className="admin-btn" onClick={() => adjustCoin(1000)}>+1000</button>
            <button className="admin-btn secondary" onClick={() => adjustCoin(-100)}>-100</button>
          </div>
        </div>

        <div className="admin-section">
          <div className="admin-section-title">
            경험치 — {profile.exp.toLocaleString()} (Lv.{profile.lv}, {profile.exp - expForLv}/{expForNextLv - expForLv})
          </div>
          <div className="admin-btn-row">
            <button className="admin-btn" onClick={() => adjustExp(100)}>+100</button>
            <button className="admin-btn" onClick={() => adjustExp(1000)}>+1000</button>
            <button className="admin-btn" onClick={() => adjustExp(expForNextLv - profile.exp)}>레벨업까지 채우기</button>
          </div>
        </div>

        <div className="admin-section">
          <div className="admin-section-title">연속 학습 — {profile.streak}일</div>
          <div className="admin-btn-row">
            <button className="admin-btn" onClick={() => adjustStreak(1)}>+1일</button>
            <button className="admin-btn" onClick={() => adjustStreak(7)}>+7일</button>
            <button className="admin-btn secondary" onClick={resetStreak}>리셋</button>
          </div>
        </div>

        <div className="admin-section">
          <div className="admin-section-title">퀘스트</div>
          <p className="admin-quest-keys">
            오늘 일일: {todaysQuestKeys.daily.join(', ') || '-'}<br />
            이번 주 주간: {todaysQuestKeys.weekly.join(', ') || '-'}<br />
            히든: {hiddenQuestKey ?? '오늘은 안 떴음'}<br />
            오늘 날짜: {getLocalDateStr()} / 주 시작: {getPeriodKey('weekly')}
          </p>
          <div className="admin-btn-row">
            <button className="admin-btn secondary" onClick={resetTodaysQuestProgress}>오늘/이번 주 진행 초기화</button>
          </div>
          {message && <p className="admin-message">{message}</p>}
        </div>
      </div>
      <BottomNav userId={userId} />
    </div>
  )
}
