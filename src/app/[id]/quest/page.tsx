// src/app/[id]/quest/page.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import {
  CalendarDaysIcon,
  BookOpenIcon,
  ArrowPathIcon,
  PlusIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import {
  pickQuestIds,
  getPeriodKey,
  getAvailableHiddenQuest,
  DAILY_QUEST_COUNT,
  WEEKLY_QUEST_COUNT,
  type QuestPeriod,
  type HiddenQuest,
} from '@/utils/quest'
import '@/styles/quest.css'

type Quest = {
  id: number
  key: string
  title: string
  description: string
  target: number
  reward_coin: number
  sort_order: number
  period: QuestPeriod
}

type Progress = {
  quest_id: number
  date: string
  progress: number
  completed: boolean
}

const QUEST_ICONS: Record<string, typeof BookOpenIcon> = {
  login: CalendarDaysIcon,
  study_words: BookOpenIcon,
  review_complete: ArrowPathIcon,
  word_add: PlusIcon,
  weekly_study_words: BookOpenIcon,
  weekly_review_complete: ArrowPathIcon,
  weekly_word_add: PlusIcon,
  hidden_study_100: BookOpenIcon,
  hidden_review_10: ArrowPathIcon,
}

export default function QuestPage() {
  const params = useParams()
  const userId = params.id as string
  const supabase = createClient()

  const [dailyQuests, setDailyQuests] = useState<Quest[]>([])
  const [weeklyQuests, setWeeklyQuests] = useState<Quest[]>([])
  const [hiddenQuest, setHiddenQuest] = useState<HiddenQuest | null>(null)
  // keyed by `${quest_id}-${date}`, not just quest_id — a daily quest's date
  // can numerically equal the current week's weekly key (e.g. every Monday
  // is both a daily key and that week's key), so a plain quest_id-keyed map
  // let stale same-week daily rows leak into "today"'s display
  const [progressByQuest, setProgressByQuest] = useState<Record<string, Progress>>({})
  const [loading, setLoading] = useState(true)

  const dailyKey = getPeriodKey('daily')
  const weeklyKey = getPeriodKey('weekly')

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const { data: questData } = await supabase
        .from('quest')
        .select('id, key, title, description, target, reward_coin, sort_order, period')
        .order('sort_order', { ascending: true })

      const dailyPool = (questData ?? []).filter(q => q.period === 'daily')
      const weeklyPool = (questData ?? []).filter(q => q.period === 'weekly')

      const dailyIds = pickQuestIds(dailyPool.map(q => q.id), user.id, dailyKey, DAILY_QUEST_COUNT)
      const weeklyIds = pickQuestIds(weeklyPool.map(q => q.id), user.id, weeklyKey, WEEKLY_QUEST_COUNT)

      const hidden = await getAvailableHiddenQuest(user.id)

      const { data: progressData } = await supabase
        .from('user_quest_progress')
        .select('quest_id, date, progress, completed')
        .eq('user_id', user.id)
        .in('date', [dailyKey, weeklyKey])

      const map: Record<string, Progress> = {}
      for (const p of progressData ?? []) map[`${p.quest_id}-${p.date}`] = p

      setDailyQuests(dailyPool.filter(q => dailyIds.includes(q.id)))
      setWeeklyQuests(weeklyPool.filter(q => weeklyIds.includes(q.id)))
      setHiddenQuest(hidden)
      setProgressByQuest(map)
      setLoading(false)
    }
    fetchData()
  }, [])

  function renderQuestCard(quest: Quest | HiddenQuest, period: QuestPeriod) {
    const expectedDate = period === 'weekly' ? weeklyKey : dailyKey
    const entry = progressByQuest[`${quest.id}-${expectedDate}`]
    const progress = entry?.progress ?? 0
    const completed = entry?.completed ?? false
    const percent = Math.min(100, Math.round((progress / quest.target) * 100))
    const Icon = QUEST_ICONS[quest.key] ?? TrophyIcon

    return (
      <div
        key={quest.id}
        className={`quest-card ${period} ${completed ? 'completed' : ''}`}
      >
        <div className="quest-card-icon">
          {completed ? <CheckCircleIcon width={28} height={28} /> : <Icon width={28} height={28} />}
        </div>
        <div className="quest-card-body">
          <div className="quest-card-title">{quest.title}</div>
          <div className="quest-card-desc">{quest.description}</div>
          <div className="quest-progressbar">
            <div className="quest-progressbar-fill" style={{ width: `${percent}%` }} />
          </div>
          <div className="quest-card-footer">
            <span className="quest-progress-text">
              {Math.min(progress, quest.target)} / {quest.target}
            </span>
            <span className="quest-reward">
              {quest.reward_coin > 0 && <span>🪙 {quest.reward_coin}</span>}
              {quest.reward_coin > 0 && <span>⭐ {quest.reward_coin * 50}</span>}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopNav />
      <div className="quest-container">
        <h2 className="quest-title">일일 퀘스트</h2>
        <p className="quest-subtitle">매일 자정에 초기화돼요</p>

        {!loading && dailyQuests.length === 0 && (
          <div className="quest-empty">아직 준비된 퀘스트가 없어요.</div>
        )}

        <div className="quest-list">
          {dailyQuests.map(q => renderQuestCard(q, 'daily'))}
        </div>

        <h2 className="quest-title quest-title-weekly">주간 퀘스트</h2>
        <p className="quest-subtitle">매주 월요일에 초기화돼요</p>

        {!loading && weeklyQuests.length === 0 && (
          <div className="quest-empty">아직 준비된 퀘스트가 없어요.</div>
        )}

        <div className="quest-list">
          {weeklyQuests.map(q => renderQuestCard(q, 'weekly'))}
        </div>

        {hiddenQuest && (
          <>
            <h2 className="quest-title quest-title-weekly">✨ 히든 퀘스트</h2>
            <p className="quest-subtitle">아주 낮은 확률로 등장 — 오늘 안에 끝내야 해요</p>
            <div className="quest-list">
              {renderQuestCard(hiddenQuest, 'hidden')}
            </div>
          </>
        )}
      </div>
      <BottomNav userId={userId} />
    </div>
  )
}
