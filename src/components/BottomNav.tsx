// src/components/BottomNav.tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  HomeIcon,
  ChartBarIcon,
  TrophyIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  TrophyIcon as TrophyIconSolid,
  ShoppingBagIcon as ShoppingBagIconSolid,
} from '@heroicons/react/24/solid'
import '@/styles/bottomnav.css'

type Props = {
  userId: string
}

const TABS = [
  { key: 'home', label: '홈', path: 'home', Outline: HomeIcon, Solid: HomeIconSolid },
  { key: 'stats', label: '통계', path: 'stats', Outline: ChartBarIcon, Solid: ChartBarIconSolid },
  { key: 'quest', label: '퀘스트', path: 'quest', Outline: TrophyIcon, Solid: TrophyIconSolid },
  { key: 'shop', label: '상점', path: 'shop', Outline: ShoppingBagIcon, Solid: ShoppingBagIconSolid },
]

export default function BottomNav({ userId }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => {
        const href = `/${userId}/${tab.path}`
        const isActive = pathname === href
        const Icon = isActive ? tab.Solid : tab.Outline

        return (
          <button
            key={tab.key}
            onClick={() => router.push(href)}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon className="bottom-nav-icon" width={24} height={24} />
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}