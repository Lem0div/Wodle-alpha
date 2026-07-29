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

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mixHex(from: string, to: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(from)
  const [r2, g2, b2] = hexToRgb(to)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

// flame grows bigger and hotter-colored the longer the streak runs, then
// cools into blue past 50 days and turns permanently rainbow at 150+
function getFlameStyle(streak: number): { color: string; size: number; rainbow?: boolean } {
  if (streak <= 0) return { color: 'var(--text-secondary)', size: 16 }
  if (streak <= 5) return { color: 'var(--orange-40)', size: 18 } // 작은 불씨
  if (streak <= 10) return { color: 'var(--orange)', size: 21 } // 작은 불
  if (streak <= 29) return { color: '#f2541b', size: 26 } // 11~50 구간 (전에 쓰던 톤)
  if (streak <= 50) return { color: '#ef4444', size: 30 }
  if (streak <= 100) {
    const t = (streak - 50) / (100 - 50)
    return { color: mixHex('#ef4444', '#38bdf8', t), size: 30 + Math.round(t * 8) }
  }
  if (streak < 150) return { color: '#38bdf8', size: 38 }
  return { color: '#38bdf8', size: 40, rainbow: true } // 150+, 그 후로는 더 안 바뀜
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
            className={`${animateFlame ? 'streak-flame-pop' : ''} ${flame.rainbow ? 'streak-flame-rainbow' : ''}`}
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
