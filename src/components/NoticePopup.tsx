// src/components/NoticePopup.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import '@/styles/notice.css'

type Notice = {
  id: string
  title: string
  content: string
  is_important: boolean
  created_at: string
}

type Props = {
  onClose: () => void
}

export default function NoticePopup({ onClose }: Props) {
  const [notices, setNotices] = useState<Notice[]>([])
  const [selected, setSelected] = useState<Notice | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchNotices() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notice')
        .select('*')
        .or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      setNotices(data ?? [])
    }
    fetchNotices()
  }, [])

  function formatDate(str: string) {
    return new Date(str).toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).replace(/\. /g, '.').replace('.', '')
  }

  return (
    <div className="notice-overlay" onClick={onClose}>
      <div className="notice-popup" onClick={e => e.stopPropagation()}>
        <div className="notice-header">
          <span>공지사항</span>
          <button className="notice-close" onClick={onClose}>✕</button>
        </div>
        <div className="notice-list">
          {selected ? (
            <div className="notice-detail">
              <button className="notice-back" onClick={() => setSelected(null)}>← 목록으로</button>
              <div className="notice-detail-header">
                {selected.is_important && (
                  <span className="notice-badge">중요</span>
                )}
                <span className="notice-date">{formatDate(selected.created_at)}</span>
              </div>
              <h3 className="notice-detail-title">{selected.title}</h3>
              <p className="notice-detail-content">{selected.content}</p>
            </div>
          ) : notices.length === 0 ? (
            <p className="notice-empty">공지사항이 없어요.</p>
          ) : (
            notices.map(notice => (
              <div key={notice.id} className="notice-item" onClick={() => setSelected(notice)}>
                <div className="notice-item-top">
                  {notice.is_important && <span className="notice-badge">중요</span>}
                  <span className="notice-date">{formatDate(notice.created_at)}</span>
                </div>
                <p className="notice-item-title">{notice.title}</p>
                <p className="notice-item-preview">{notice.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}