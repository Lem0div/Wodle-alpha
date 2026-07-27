// src/components/StreakCard.tsx
'use client'

import { useEffect, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { FireIcon } from '@heroicons/react/24/solid'
import { getLocalDateStr } from '@/utils/date'
import '@/styles/streakcard.css'

type Props = {
  streak: number
  lastLoginAt: string | null
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

// flame grows bigger and hotter-colored the longer the streak runs
function getFlameStyle(streak: number) {
  if (streak <= 0) return { color: 'var(--text-secondary)', size: 18 }
  if (streak < 3) return { color: 'var(--orange-40)', size: 20 }
  if (streak < 7) return { color: 'var(--orange)', size: 24 }
  if (streak < 30) return { color: '#f2541b', size: 28 }
  return { color: '#ef4444', size: 32 }
}

// the streak is just a consecutive-day count + the last attended date, so the
// attended set is derived (no per-day attendance log exists) as the run of
// `streak` days ending at lastLoginAt
function getAttendedDates(streak: number, lastLoginAt: string | null): Set<string> {
  const set = new Set<string>()
  if (!lastLoginAt || streak <= 0) return set
  const last = new Date(`${lastLoginAt.slice(0, 10)}T00:00:00`)
  for (let i = 0; i < streak; i++) {
    const d = new Date(last)
    d.setDate(last.getDate() - i)
    set.add(getLocalDateStr(d))
  }
  return set
}

export default function StreakCard({ streak, lastLoginAt }: Props) {
  const [expanded, setExpanded] = useState(true)

  const now = new Date()
  const todayStr = getLocalDateStr(now)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - 3 + i)
    return d
  })
  const attendedDates = getAttendedDates(streak, lastLoginAt)
  const isTodayAttended = attendedDates.has(todayStr)
  const flame = getFlameStyle(streak)

  const [animateFlame, setAnimateFlame] = useState(false)

  // play the flame's "level up" pop once — the first time home is visited
  // after today's check-in, not on every subsequent visit/refresh that day.
  // Must stay an effect (not a lazy useState initializer) because this
  // component is server-rendered first — localStorage doesn't exist there,
  // and an effect is the one place guaranteed to run client-only.
  useEffect(() => {
    if (!isTodayAttended) return
    const key = `wodle-flame-animated-${todayStr}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing with localStorage (an external system), not deriving from props/state
    setAnimateFlame(true)
  }, [todayStr, isTodayAttended])

  return (
    <div className="streak-card">
      <button
        className="streak-header"
        onClick={() => setExpanded(prev => !prev)}
      >
        <span className="streak-count-row">
          <FireIcon
            width={flame.size}
            height={flame.size}
            style={{ color: flame.color }}
            className={animateFlame ? 'streak-flame-pop' : ''}
          />
          <span className="streak-count">연속 학습 {streak}일</span>
        </span>
        {expanded ? (
          <ChevronUpIcon className="streak-chevron" width={20} height={20} />
        ) : (
          <ChevronDownIcon className="streak-chevron" width={20} height={20} />
        )}
      </button>
      {expanded && (
        <div className="streak-week-row">
          {week.map(d => {
            const dateStr = getLocalDateStr(d)
            const isToday = dateStr === todayStr
            const isAttended = attendedDates.has(dateStr)
            const bubbleClass = isAttended ? 'attended' : isToday ? 'today' : ''

            return (
              <div key={dateStr} className="streak-day">
                <div className={`streak-bubble ${bubbleClass}`}>
                  {DAY_LABELS[d.getDay()]}
                </div>
                {isToday && <div className="streak-indicator-dot" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
