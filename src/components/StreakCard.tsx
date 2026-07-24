// src/components/StreakCard.tsx
'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import '@/styles/streakcard.css'

type Props = {
  streak: number
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export default function StreakCard({ streak }: Props) {
  const [expanded, setExpanded] = useState(true)

  const today = new Date().getDay()
  const week = Array.from({ length: 7 }, (_, i) => (today - 3 + i + 7) % 7)

  return (
    <div className="streak-card">
      <button
        className="streak-header"
        onClick={() => setExpanded(prev => !prev)}
      >
        <span className="streak-count">연속 학습 {streak}일</span>
        {expanded ? (
          <ChevronUpIcon className="streak-chevron" width={20} height={20} />
        ) : (
          <ChevronDownIcon className="streak-chevron" width={20} height={20} />
        )}
      </button>
      {expanded && (
        <div className="streak-week-row">
          {week.map(dayIdx => (
            <div key={dayIdx} className="streak-day">
              <div className={`streak-bubble ${dayIdx === today ? 'today' : ''}`}>
                {DAY_LABELS[dayIdx]}
              </div>
              {dayIdx === today && <div className="streak-indicator-dot" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
