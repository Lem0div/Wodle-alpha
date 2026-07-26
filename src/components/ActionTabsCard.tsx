// src/components/ActionTabsCard.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpenIcon, SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import '@/styles/actiontabscard.css'

type Props = {
  userId: string
}

type Tab = {
  key: string
  color: 'orange' | 'blue' | 'purple'
  Icon: typeof BookOpenIcon
  heading: string
  subtext: string
  cta: string
  href: (userId: string) => string
}

const TABS: Tab[] = [
  {
    key: 'wordbook',
    color: 'orange',
    Icon: BookOpenIcon,
    heading: '단어장으로 단어 외우기',
    subtext: '자신만의 단어를 외우세요!',
    cta: '단어 외우러 가기',
    href: (id) => `/${id}/wordbook`,
  },
  {
    key: 'word-party',
    color: 'blue',
    Icon: SparklesIcon,
    heading: '단어파티에 참여하러 가기',
    subtext: '파티에서 단어 풍선을 터트리세요!',
    cta: '단어파티 참여하기',
    href: (id) => `/${id}/word-party`,
  },
  {
    key: 'review',
    color: 'purple',
    Icon: ArrowPathIcon,
    heading: '틀린 단어 다시 복습하기',
    subtext: '헷갈렸던 단어를 확실하게 잡아보세요!',
    cta: '복습하러 가기',
    href: (id) => `/${id}/review`,
  },
]

export default function ActionTabsCard({ userId }: Props) {
  const [active, setActive] = useState(0)
  const router = useRouter()
  const tab = TABS[active]
  const Icon = tab.Icon

  return (
    <div className="tabcard-wrap">
      <div className={`tabcard-outer tabcard-${tab.color}`}>
        <div key={active} className="tabcard-content fade-in">
          <div className="tabcard-icon-badge">
            <Icon className="tabcard-icon" width={32} height={32} />
          </div>
          <h3 className="tabcard-heading">{tab.heading}</h3>
          <p className="tabcard-subtext">{tab.subtext}</p>
          <button
            className="tabcard-cta"
            onClick={() => router.push(tab.href(userId))}
          >
            <Icon width={20} height={20} />
            {tab.cta}
          </button>
        </div>
      </div>
      <div className="tabcard-tabs">
        {TABS.map((t, i) => {
          const TabIcon = t.Icon
          return (
            <button
              key={t.key}
              className={`tabcard-tab tabcard-tab-${t.color} ${i === active ? 'active' : ''}`}
              onClick={() => setActive(i)}
              aria-label={t.heading}
            >
              <TabIcon width={28} height={28} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
