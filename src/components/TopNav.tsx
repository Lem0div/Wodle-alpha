// src/components/TopNav.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import NoticePopup from '@/components/NoticePopup'
import { CurrencyDollarIcon, BellIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import '@/styles/topnav.css'

type Profile = {
  username: string
  lv: number
  coin: number
  exp: number
}

const supabase = createClient()

export default function TopNav() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showNotice, setShowNotice] = useState(false)
  const router = useRouter()
  const subscribedRef = useRef(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('profile')
        .select('username, lv, coin, exp')
        .eq('user_id', user.id)
        .single()
      setProfile(data)

      if (subscribedRef.current) return
      subscribedRef.current = true

      supabase
        .channel(`topnav-${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profile',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          setProfile(prev => prev ? {
            ...prev,
            coin: payload.new.coin,
            lv: payload.new.lv,
            exp: payload.new.exp,
          } : prev)
        })
        .subscribe()
    }

    init()

    return () => {
      supabase.removeAllChannels()
      subscribedRef.current = false
    }
  }, [])

  if (!profile || !userId) return null

  const expPercent = (profile.exp % 1000) / 10

  return (
    <>
      <nav className="topnav">
        <div className="topnav-row1">
          <div className="topnav-left">
            <div className="topnav-avatar">
              {profile.username.slice(0, 1).toUpperCase()}
            </div>
            <div className="topnav-info">
              <span className="topnav-lv">Lv.{profile.lv}</span>
              <span className="topnav-name">{profile.username}</span>
            </div>
          </div>
          <div className="topnav-right">
            <div className="topnav-coin">
              <CurrencyDollarIcon
                width={14}
                height={14}
                stroke="var(--orange)"
                strokeWidth={2}
              />
              <span>{profile.coin.toLocaleString()}</span>
            </div>
            <BellIcon
              className="topnav-bell"
              width={22}
              height={22}
              stroke="var(--yellow)"
              strokeWidth={1.8}
              onClick={() => setShowNotice(true)}
              style={{ cursor: 'pointer' }}
            />
            <Cog6ToothIcon
              className="topnav-icon"
              width={22}
              height={22}
              stroke="currentColor"
              strokeWidth={1.8}
              onClick={() => router.push(`/${userId}/setting`)}
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>
        <div className="topnav-row2">
          <span className="topnav-exp-label">EXP</span>
          <div className="topnav-expbar">
            <div className="topnav-expbar-fill" style={{ width: `${expPercent}%` }} />
          </div>
          <span className="topnav-exp-text">{profile.exp % 1000} / 1000</span>
        </div>
      </nav>
      {showNotice && <NoticePopup onClose={() => setShowNotice(false)} />}
    </>
  )
}