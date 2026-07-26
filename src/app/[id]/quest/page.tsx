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
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { pickDailyQuestIds } from '@/utils/quest'
import { getLocalDateStr } from '@/utils/date'
import '@/styles/quest.css'

type Quest = {
  id: number
  key: string
  title: string
  description: string
  target: number
  reward_coin: number
  sort_order: number
}

type Progress = {
  quest_id: number
  progress: number
  completed: boolean
}

const QUEST_ICONS: Record<string, typeof BookOpenIcon> = {
  login: CalendarDaysIcon,
  study_words: BookOpenIcon,
  review_complete: ArrowPathIcon,
}

export default function QuestPage() {
  const params = useParams()
  const userId = params.id as string
  const supabase = createClient()

  const [quests, setQuests] = useState<Quest[]>([])
  const [progressByQuest, setProgressByQuest] = useState<Record<number, Progress>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: questData } = await supabase
        .from('quest')
        .select('id, key, title, description, target, reward_coin, sort_order')
        .order('sort_order', { ascending: true })

      const today = getLocalDateStr()
      const todaysIds = pickDailyQuestIds((questData ?? []).map(q => q.id), user.id, today)
      const todaysQuests = (questData ?? []).filter(q => todaysIds.includes(q.id))

      const { data: progressData } = await supabase
        .from('user_quest_progress')
        .select('quest_id, progress, completed')
        .eq('user_id', user.id)
        .eq('date', today)

      const map: Record<number, Progress> = {}
      for (const p of progressData ?? []) map[p.quest_id] = p

      setQuests(todaysQuests)
      setProgressByQuest(map)
      setLoading(false)
    }
    fetchData()
  }, [])

  return (
    <div>
      <TopNav />
      <div className="quest-container">
        <h2 className="quest-title">오늘의 퀘스트</h2>
        <p className="quest-subtitle">매일 자정에 초기화돼요</p>

        {!loading && quests.length === 0 && (
          <div className="quest-empty">아직 준비된 퀘스트가 없어요.</div>
        )}

        <div className="quest-list">
          {quests.map(quest => {
            const progress = progressByQuest[quest.id]?.progress ?? 0
            const completed = progressByQuest[quest.id]?.completed ?? false
            const percent = Math.min(100, Math.round((progress / quest.target) * 100))
            const Icon = QUEST_ICONS[quest.key] ?? TrophyIcon

            return (
              <div key={quest.id} className={`quest-card ${completed ? 'completed' : ''}`}>
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
          })}
        </div>
      </div>
      <BottomNav userId={userId} />
    </div>
  )
}
