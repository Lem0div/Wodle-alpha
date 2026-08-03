// src/app/[id]/wordbook/[wordbookId]/review/page.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { updateStreak } from '@/utils/streak'
import { awardCoins } from '@/utils/coin'
import { checkAnswer } from '@/utils/checkAnswer'
import { incrementQuestProgress } from '@/utils/quest'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import '@/styles/study.css'

type Word = {
  id: string
  term: string
  definition: string
  wrong_count: number
  showTerm?: boolean
}

export default function ReviewPage() {
  const [words, setWords] = useState<Word[]>([])
  const [current, setCurrent] = useState(0)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const [finished, setFinished] = useState(false)
  const [mode, setMode] = useState('term')
  const [correctCount, setCorrectCount] = useState(0)
  const [coinResult, setCoinResult] = useState<{ earned: number; bonus: number; exp: number; boostMultiplier: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkedViaEnter, setCheckedViaEnter] = useState(false)
  const correctRef = useRef(0)
  const params = useParams()
  const userId = params.id as string
  const wordbookId = params.wordbookId as string
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchWords() {
      const { data: wordbook } = await supabase
        .from('wordbook')
        .select('last_mode')
        .eq('id', wordbookId)
        .single()

      const savedMode = wordbook?.last_mode ?? 'term'
      setMode(savedMode)

      const { data } = await supabase
        .from('word')
        .select('id, term, definition, wrong_count')
        .eq('wordbook_id', wordbookId)
        .gt('wrong_count', 0)

      let list = [...(data ?? [])]
      if (savedMode === 'shuffle') list = list.map(w => ({ ...w, showTerm: Math.random() > 0.5 }))
      setWords(list)
      setLoading(false)
    }
    fetchWords()
  }, [wordbookId])

  function getQuestion(word: Word) {
    if (mode === 'term') return word.definition
    if (mode === 'definition') return word.term
    return word.showTerm ? word.term : word.definition
  }

  function getAnswer(word: Word) {
    if (mode === 'term') return word.term
    if (mode === 'definition') return word.definition
    return word.showTerm ? word.definition : word.term
  }

  async function handleCheck() {
    const correct = getAnswer(words[current])
    if (checkAnswer(answer, correct)) {
      setResult('correct')
      correctRef.current += 1
      setCorrectCount(correctRef.current)
      await supabase
        .from('word')
        .update({ wrong_count: Math.max(0, words[current].wrong_count - 1) })
        .eq('id', words[current].id)
      await incrementQuestProgress('study_words', 1)
    } else {
      setResult('wrong')
      await supabase
        .from('word')
        .update({ wrong_count: words[current].wrong_count + 1 })
        .eq('id', words[current].id)
      await incrementQuestProgress('study_words', 1)
    }
  }

  async function handleNext() {
    setAnswer('')
    setResult(null)
    setCheckedViaEnter(false)
    if (current + 1 >= words.length) {
      const coins = await awardCoins(correctRef.current)
      setCoinResult(coins)
      await updateStreak()
      await incrementQuestProgress('review_complete', 1)
      await incrementQuestProgress('login', 1)
      setFinished(true)
    } else {
      setCurrent(prev => prev + 1)
    }
  }

  // the input gets disabled once a result is shown, so it can no longer catch
  // Enter itself — listen on the window instead so Enter still triggers "다음"
  useEffect(() => {
    if (!result) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') handleNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [result])

  // if the answer was checked by pressing Enter (a fast keyboard flow),
  // auto-advance after a beat so the user doesn't have to hit Enter twice —
  // checking via the mouse button still waits for an explicit "다음" click
  useEffect(() => {
    if (!result || !checkedViaEnter) return
    const timer = setTimeout(() => handleNext(), 1000)
    return () => clearTimeout(timer)
  }, [result, checkedViaEnter])

  const progress = words.length > 0 ? Math.round(((current + (result ? 1 : 0)) / words.length) * 100) : 0

  if (loading) return null

  if (words.length === 0) {
    return (
      <div className="study-container">
        <div className="study-empty">복습할 틀린 단어가 없어요!</div>
        <button
          className="study-btn"
          onClick={() => router.push(`/${userId}/wordbook/${wordbookId}`)}
        >
          단어장으로 돌아가기
        </button>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="study-container">
        <div className="study-finish">
          <h2 className="study-finish-title">복습 완료!</h2>
          <p className="study-finish-score">{correctCount} / {words.length} 맞혔어요</p>
          {coinResult && (
            <div className="study-coin-result">
              <span>🪙 +{coinResult.earned} 코인</span>
              {coinResult.bonus > 0 && <span className="study-coin-bonus">🎁 보너스 +{coinResult.bonus}</span>}
              <span>⭐ +{coinResult.exp} 경험치</span>
              {coinResult.boostMultiplier > 1 && <span className="study-coin-bonus">⚡ {coinResult.boostMultiplier}배 부스터 적용!</span>}
            </div>
          )}
          <div className="study-finish-actions">
            <button
              className="study-btn secondary"
              onClick={() => router.push(`/${userId}/wordbook/${wordbookId}`)}
            >
              단어장으로 돌아가기
            </button>
            <button
              className="study-btn secondary"
              onClick={() => { router.push(`/${userId}/home`); router.refresh() }}
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="study-container">
      <div className="study-top">
        <button
          className="study-exit"
          onClick={() => router.push(`/${userId}/wordbook/${wordbookId}`)}
          aria-label="복습 종료"
        >
          <XMarkIcon width={22} height={22} />
        </button>
        <div className="study-progressbar">
          <div className="study-progressbar-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="study-count">{current + 1} / {words.length}</span>
      </div>

      <p className="study-label">복습 모드</p>

      <div className="study-card">
        <span className="study-question">{getQuestion(words[current])}</span>
      </div>

      <input
        className={`study-input ${result === 'correct' ? 'correct' : ''} ${result === 'wrong' ? 'wrong' : ''}`}
        placeholder="답 입력"
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        onKeyDown={e => {
          if (e.key !== 'Enter') return
          setCheckedViaEnter(true)
          handleCheck()
        }}
        disabled={!!result}
        autoFocus
      />

      {result === 'wrong' && (
        <p className="study-correct-answer">정답: {getAnswer(words[current])}</p>
      )}

      {!result && <button className="study-btn" onClick={handleCheck}>확인</button>}
      {result && (
        <button className={`study-btn ${result === 'wrong' ? 'danger' : ''}`} onClick={handleNext}>
          다음
        </button>
      )}
    </div>
  )
}
