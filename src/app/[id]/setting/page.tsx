// src/app/[id]/setting/page.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import '@/styles/setting.css'

export default function SettingPage() {
  const params = useParams()
  const userId = params.id as string
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [username, setUsername] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchSettings() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: setting } = await supabase
        .from('setting')
        .select('dark_mode, notifications_on')
        .eq('user_id', user.id)
        .single()

      const { data: profile } = await supabase
        .from('profile')
        .select('username, is_admin')
        .eq('user_id', user.id)
        .single()

      if (setting) {
        setDarkMode(setting.dark_mode)
        setNotifications(setting.notifications_on)
        if (setting.dark_mode) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
      if (profile) {
        setUsername(profile.username)
        setIsAdmin(profile.is_admin)
      }
    }
    fetchSettings() // 여기가 빠져있었음!
  }, [])

  async function toggleDarkMode() {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('setting').update({ dark_mode: next }).eq('user_id', user.id)
  }

  async function toggleNotifications() {
    const next = !notifications
    setNotifications(next)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('setting').update({ notifications_on: next }).eq('user_id', user.id)
  }

  async function handleUsernameChange() {
    if (!newUsername.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profile').update({ username: newUsername }).eq('user_id', user.id)
    setUsername(newUsername)
    setNewUsername('')
    setEditingName(false)
    setLoading(false)
  }

    async function handleLogout() {
        document.documentElement.classList.remove('dark')
        await supabase.auth.signOut()
        router.push('/')
    }

  async function handleDeleteAccount() {
    setLoading(true)
    await fetch('/api/delete-account', { method: 'DELETE' })
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div>
      <div className="setting-container">
        <h2 className="setting-title">설정</h2>
        <div className="setting-section">
          <div className="setting-row">
            <span className="setting-label">다크모드</span>
            <button className={`setting-toggle ${darkMode ? 'on' : ''}`} onClick={toggleDarkMode}>
              <div className="setting-toggle-thumb" />
            </button>
          </div>
          <div className="setting-row">
            <span className="setting-label">알림</span>
            <button className={`setting-toggle ${notifications ? 'on' : ''}`} onClick={toggleNotifications}>
              <div className="setting-toggle-thumb" />
            </button>
          </div>
        </div>
        <div className="setting-section">
          <div className="setting-row">
            <span className="setting-label">닉네임</span>
            <span className="setting-value">{username}</span>
          </div>
          {editingName ? (
            <div className="setting-edit-row">
              <input
                className="setting-input"
                placeholder="새 닉네임"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUsernameChange()}
              />
              <button className="setting-btn-small" onClick={handleUsernameChange} disabled={loading}>확인</button>
              <button className="setting-btn-small gray" onClick={() => setEditingName(false)}>취소</button>
            </div>
          ) : (
            <button className="setting-btn" onClick={() => setEditingName(true)}>닉네임 변경</button>
          )}
        </div>
        {isAdmin && (
          <div className="setting-section">
            <button className="setting-btn" onClick={() => router.push(`/${userId}/admin`)}>
              🛠 관리자 패널
            </button>
          </div>
        )}
        <div className="setting-section">
          <button className="setting-btn" onClick={handleLogout}>로그아웃</button>
          {deleteConfirm ? (
            <div className="setting-delete-confirm">
              <p>정말 삭제하시겠어요? 모든 데이터가 사라져요.</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="setting-btn-danger" onClick={handleDeleteAccount} disabled={loading}>삭제</button>
                <button className="setting-btn-small gray" onClick={() => setDeleteConfirm(false)}>취소</button>
              </div>
            </div>
          ) : (
            <button className="setting-btn-danger" onClick={() => setDeleteConfirm(true)}>계정 삭제</button>
          )}
        </div>
      </div>
      <BottomNav userId={userId} />
    </div>
  )
}