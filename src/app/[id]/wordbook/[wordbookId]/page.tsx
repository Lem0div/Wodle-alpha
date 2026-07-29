// src/app/[id]/wordbook/[wordbookId]/page.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'
import { PlusIcon, PencilIcon, TrashIcon, ArrowLeftIcon, CameraIcon } from '@heroicons/react/24/outline'
import { incrementQuestProgress } from '@/utils/quest'
import '@/styles/wordbook.css'

type Wordbook = {
  id: string
  title: string
  description: string
  last_mode: string | null
  last_order: string | null
}

type Word = {
  id: string
  term: string
  definition: string
  wrong_count: number
  created_at: string
}

export default function WordbookDetailPage() {
  const params = useParams()
  const userId = params.id as string
  const wordbookId = params.wordbookId as string
  const router = useRouter()
  const supabase = createClient()

  const [wordbook, setWordbook] = useState<Wordbook | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTerm, setNewTerm] = useState('')
  const [newDefinition, setNewDefinition] = useState('')
  const [suggestedDef, setSuggestedDef] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [visionLoading, setVisionLoading] = useState(false)
  const [visionStep, setVisionStep] = useState('')
  const [visionError, setVisionError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTerm, setEditTerm] = useState('')
  const [editDefinition, setEditDefinition] = useState('')

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [mode, setMode] = useState('term')
  const [order, setOrder] = useState('normal')

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: wb } = await supabase
        .from('wordbook')
        .select('id, title, description, last_mode, last_order')
        .eq('id', wordbookId)
        .eq('user_id', user.id)
        .single()

      if (!wb) {
        router.replace(`/${userId}/wordbook`)
        return
      }
      setWordbook(wb)
      setMode(wb.last_mode ?? 'term')
      setOrder(wb.last_order ?? 'normal')

      const { data: wordData } = await supabase
        .from('word')
        .select('id, term, definition, wrong_count, created_at')
        .eq('wordbook_id', wordbookId)
        .order('created_at', { ascending: false })

      setWords(wordData ?? [])
      setLoading(false)
    }
    fetchData()
  }, [wordbookId])

  async function suggestDefinition(value: string) {
    if (!value.trim()) { setSuggestedDef(''); return }
    setSuggesting(true)
    const res = await fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term: value })
    })
    const data = await res.json()
    setSuggestedDef(data.definition ?? '')
    setSuggesting(false)
  }

  async function handleCreate() {
    if (!newTerm.trim() || !newDefinition.trim()) return

    const { data } = await supabase
      .from('word')
      .insert({ wordbook_id: wordbookId, term: newTerm, definition: newDefinition })
      .select('id, term, definition, wrong_count, created_at')
      .single()

    if (data) setWords(prev => [data, ...prev])
    setNewTerm('')
    setNewDefinition('')
    setSuggestedDef('')
    setShowCreateForm(false)
    await incrementQuestProgress('word_add', 1)
  }

  function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 1024
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height * MAX) / width)
            width = MAX
          } else {
            width = Math.round((width * MAX) / height)
            height = MAX
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1]
        URL.revokeObjectURL(url)
        resolve({ base64, mimeType: 'image/jpeg' })
      }
      img.src = url
    })
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setVisionLoading(true)
    setVisionError('')

    try {
      setVisionStep('이미지 압축 중...')
      const { base64, mimeType } = await compressImage(file)

      setVisionStep('AI가 단어 분석 중...')
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType })
      })

      const data = await res.json()

      if (!res.ok) {
        setVisionError(data.error ?? '분석에 실패했어요. 다시 시도해주세요.')
        return
      }

      const extracted: { term: string; definition: string }[] = data.words ?? []

      if (extracted.length === 0) {
        setVisionError('사진에서 단어를 찾지 못했어요.')
        return
      }

      setVisionStep(`${extracted.length}개 단어 저장 중...`)
      const { data: inserted } = await supabase
        .from('word')
        .insert(extracted.map(w => ({ term: w.term, definition: w.definition, wordbook_id: wordbookId })))
        .select('id, term, definition, wrong_count, created_at')

      if (inserted) setWords(prev => [...inserted, ...prev])
      await incrementQuestProgress('word_add', extracted.length)
    } catch {
      setVisionError('분석 중 오류가 발생했어요. 다시 시도해주세요.')
    } finally {
      setVisionLoading(false)
      setVisionStep('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function startEdit(word: Word) {
    setEditingId(word.id)
    setEditTerm(word.term)
    setEditDefinition(word.definition)
  }

  async function handleEditSave(id: string) {
    if (!editTerm.trim() || !editDefinition.trim()) return

    await supabase
      .from('word')
      .update({ term: editTerm, definition: editDefinition })
      .eq('id', id)

    setWords(prev =>
      prev.map(w => (w.id === id ? { ...w, term: editTerm, definition: editDefinition } : w))
    )
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    await supabase.from('word').delete().eq('id', id)
    setWords(prev => prev.filter(w => w.id !== id))
    setDeleteConfirmId(null)
  }

  async function handleStudyStart() {
    await supabase
      .from('wordbook')
      .update({ last_mode: mode, last_order: order })
      .eq('id', wordbookId)
    router.push(`/${userId}/wordbook/${wordbookId}/study?mode=${mode}&order=${order}`)
  }

  const wrongCount = words.filter(w => w.wrong_count > 0).length

  if (!loading && !wordbook) return null

  return (
    <div>
      <TopNav />
      <div className="wordbook-container">
        <button className="wordbook-back" onClick={() => router.push(`/${userId}/wordbook`)}>
          <ArrowLeftIcon width={16} height={16} />
          단어장 목록
        </button>

        <div className="wordbook-header">
          <h2 className="wordbook-title">{wordbook?.title}</h2>
          <button
            className="wordbook-add-btn"
            onClick={() => setShowCreateForm(prev => !prev)}
            aria-label="단어 추가"
          >
            <PlusIcon width={20} height={20} />
          </button>
        </div>
        {wordbook?.description && <p className="wordbook-desc">{wordbook.description}</p>}

        {!loading && words.length > 0 && (
          <div className="wordbook-study-section">
            <div>
              <span className="wordbook-study-label">문제 유형</span>
              <div className="wordbook-pill-row">
                <button className={`wordbook-pill ${mode === 'term' ? 'active' : ''}`} onClick={() => setMode('term')}>단어 적기</button>
                <button className={`wordbook-pill ${mode === 'definition' ? 'active' : ''}`} onClick={() => setMode('definition')}>뜻 적기</button>
                <button className={`wordbook-pill ${mode === 'shuffle' ? 'active' : ''}`} onClick={() => setMode('shuffle')}>셔플</button>
              </div>
            </div>
            <div>
              <span className="wordbook-study-label">순서</span>
              <div className="wordbook-pill-row">
                <button className={`wordbook-pill ${order === 'normal' ? 'active' : ''}`} onClick={() => setOrder('normal')}>정방향</button>
                <button className={`wordbook-pill ${order === 'random' ? 'active' : ''}`} onClick={() => setOrder('random')}>셔플</button>
              </div>
            </div>
            <div className="wordbook-study-actions">
              <button className="wordbook-study-btn" onClick={handleStudyStart}>학습 시작</button>
              {wrongCount > 0 && (
                <button
                  className="wordbook-study-btn secondary"
                  onClick={() => router.push(`/${userId}/wordbook/${wordbookId}/review`)}
                >
                  복습하기 ({wrongCount})
                </button>
              )}
            </div>
          </div>
        )}

        {showCreateForm && (
          <div className="wordbook-form">
            <input
              className="wordbook-input"
              placeholder="단어 (예: apple)"
              value={newTerm}
              onChange={e => {
                setNewTerm(e.target.value)
                if (debounceTimer.current) clearTimeout(debounceTimer.current)
                debounceTimer.current = setTimeout(() => suggestDefinition(e.target.value), 800)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && suggestedDef && !newDefinition) {
                  setNewDefinition(suggestedDef)
                  setSuggestedDef('')
                }
              }}
            />
            <input
              className="wordbook-input"
              placeholder={suggesting ? '추천 중...' : suggestedDef || '뜻 (예: 사과)'}
              value={newDefinition}
              onChange={e => setNewDefinition(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newDefinition) { handleCreate(); return }
                if (e.key === 'Enter' && !newDefinition && suggestedDef) {
                  setNewDefinition(suggestedDef)
                  setSuggestedDef('')
                }
              }}
            />
            <div className="wordbook-form-actions">
              <button className="wordbook-btn-small gray" onClick={() => setShowCreateForm(false)}>취소</button>
              <button className="wordbook-btn-small" onClick={handleCreate}>추가</button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
        <button
          className="wordbook-btn-photo"
          onClick={() => fileInputRef.current?.click()}
          disabled={visionLoading}
        >
          <CameraIcon width={18} height={18} />
          {visionLoading ? visionStep : '사진으로 단어 추가'}
        </button>
        {visionError && <p className="wordbook-vision-error">{visionError}</p>}

        {!loading && words.length === 0 && !showCreateForm && (
          <div className="wordbook-empty-state">아직 추가한 단어가 없어요.</div>
        )}

        <div className="word-list">
          {words.map(word => (
            <div key={word.id} className="wordbook-card-wrap">
              {editingId === word.id ? (
                <div className="wordbook-form">
                  <input
                    className="wordbook-input"
                    value={editTerm}
                    onChange={e => setEditTerm(e.target.value)}
                  />
                  <input
                    className="wordbook-input"
                    value={editDefinition}
                    onChange={e => setEditDefinition(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEditSave(word.id)}
                  />
                  <div className="wordbook-form-actions">
                    <button className="wordbook-btn-small gray" onClick={() => setEditingId(null)}>취소</button>
                    <button className="wordbook-btn-small" onClick={() => handleEditSave(word.id)}>저장</button>
                  </div>
                </div>
              ) : (
                <div className="word-card">
                  <div className="word-card-main">
                    <span className="word-term">{word.term}</span>
                    <span className="word-definition">{word.definition}</span>
                    {word.wrong_count > 0 && (
                      <span className="word-wrongcount-badge">틀림 {word.wrong_count}</span>
                    )}
                  </div>
                  <div className="wordbook-card-actions">
                    <button className="wordbook-icon-btn" onClick={() => startEdit(word)} aria-label="수정">
                      <PencilIcon width={16} height={16} />
                    </button>
                    <button className="wordbook-icon-btn" onClick={() => setDeleteConfirmId(word.id)} aria-label="삭제">
                      <TrashIcon width={16} height={16} />
                    </button>
                  </div>
                </div>
              )}

              {deleteConfirmId === word.id && (
                <div className="wordbook-delete-confirm">
                  <p>&quot;{word.term}&quot; 단어를 삭제할까요?</p>
                  <div className="wordbook-delete-confirm-actions">
                    <button className="wordbook-btn-danger" onClick={() => handleDelete(word.id)}>삭제</button>
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
