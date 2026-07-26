// src/app/[id]/wordbook/page.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { incrementQuestProgress } from '@/utils/quest'
import '@/styles/wordbook.css'

type Wordbook = {
  id: string
  title: string
  description: string
  created_at: string
}

export default function WordbookListPage() {
  const params = useParams()
  const userId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [wordbooks, setWordbooks] = useState<Wordbook[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWordbooks() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('wordbook')
        .select('id, title, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setWordbooks(data ?? [])
      setLoading(false)
    }
    fetchWordbooks()
  }, [])

  async function handleCreate() {
    if (!newTitle.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('wordbook')
      .insert({ user_id: user.id, title: newTitle, description: newDescription })
      .select('id, title, description, created_at')
      .single()

    if (data) setWordbooks(prev => [data, ...prev])
    setNewTitle('')
    setNewDescription('')
    setShowCreateForm(false)
    await incrementQuestProgress('wordbook_create', 1)
  }

  function startEdit(wb: Wordbook) {
    setEditingId(wb.id)
    setEditTitle(wb.title)
    setEditDescription(wb.description)
  }

  async function handleEditSave(id: string) {
    if (!editTitle.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('wordbook')
      .update({ title: editTitle, description: editDescription })
      .eq('id', id)
      .eq('user_id', user.id)

    setWordbooks(prev =>
      prev.map(wb => (wb.id === id ? { ...wb, title: editTitle, description: editDescription } : wb))
    )
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('word').delete().eq('wordbook_id', id)
    await supabase.from('wordbook').delete().eq('id', id).eq('user_id', user.id)

    setWordbooks(prev => prev.filter(wb => wb.id !== id))
    setDeleteConfirmId(null)
  }

  return (
    <div>
      <TopNav />
      <div className="wordbook-container">
        <div className="wordbook-header">
          <h2 className="wordbook-title">단어장</h2>
          <button
            className="wordbook-add-btn"
            onClick={() => setShowCreateForm(prev => !prev)}
            aria-label="단어장 추가"
          >
            <PlusIcon width={20} height={20} />
          </button>
        </div>

        {showCreateForm && (
          <div className="wordbook-form">
            <input
              className="wordbook-input"
              placeholder="단어장 이름"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <input
              className="wordbook-input"
              placeholder="설명 (선택)"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <div className="wordbook-form-actions">
              <button className="wordbook-btn-small gray" onClick={() => setShowCreateForm(false)}>취소</button>
              <button className="wordbook-btn-small" onClick={handleCreate}>만들기</button>
            </div>
          </div>
        )}

        {!loading && wordbooks.length === 0 && !showCreateForm && (
          <div className="wordbook-empty-state">아직 만든 단어장이 없어요.</div>
        )}

        <div className="wordbook-list">
          {wordbooks.map(wb => (
            <div key={wb.id} className="wordbook-card-wrap">
              {editingId === wb.id ? (
                <div className="wordbook-form">
                  <input
                    className="wordbook-input"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                  />
                  <input
                    className="wordbook-input"
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEditSave(wb.id)}
                  />
                  <div className="wordbook-form-actions">
                    <button className="wordbook-btn-small gray" onClick={() => setEditingId(null)}>취소</button>
                    <button className="wordbook-btn-small" onClick={() => handleEditSave(wb.id)}>저장</button>
                  </div>
                </div>
              ) : (
                <div className="wordbook-card">
                  <div
                    className="wordbook-card-main"
                    onClick={() => router.push(`/${userId}/wordbook/${wb.id}`)}
                  >
                    <div className="wordbook-card-title">{wb.title}</div>
                    <div className="wordbook-card-desc">{wb.description || '설명 없음'}</div>
                  </div>
                  <div className="wordbook-card-actions">
                    <button className="wordbook-icon-btn" onClick={() => startEdit(wb)} aria-label="수정">
                      <PencilIcon width={16} height={16} />
                    </button>
                    <button className="wordbook-icon-btn" onClick={() => setDeleteConfirmId(wb.id)} aria-label="삭제">
                      <TrashIcon width={16} height={16} />
                    </button>
                  </div>
                </div>
              )}

              {deleteConfirmId === wb.id && (
                <div className="wordbook-delete-confirm">
                  <p>&quot;{wb.title}&quot; 단어장을 삭제할까요? 안의 단어도 모두 사라져요.</p>
                  <div className="wordbook-delete-confirm-actions">
                    <button className="wordbook-btn-danger" onClick={() => handleDelete(wb.id)}>삭제</button>
                    <button className="wordbook-btn-small gray" onClick={() => setDeleteConfirmId(null)}>취소</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <BottomNav userId={userId} />
    </div>
  )
}
