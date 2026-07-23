// src/app/reset-password/page.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'
import '@/styles/auth.css'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleReset() {
    if (!email) {
      setError('이메일을 입력하세요')
      return
    }
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/update-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="auth-container">
        <h1 className="auth-title">메일을 확인하세요</h1>
        <div className="auth-form">
          <p className="auth-desc">
            {email}로 비밀번호 재설정 링크를 보냈어요. 메일함을 확인해주세요.
          </p>
          <a href="/login" className="auth-link">로그인으로 돌아가기</a>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <h1 className="auth-title">비밀번호 재설정</h1>
      <div className="auth-form">
        <p className="auth-desc">가입한 이메일을 입력하면 재설정 링크를 보내드려요.</p>
        <input
          className="auth-input"
          placeholder="이메일"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleReset()}
        />
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-btn-primary" onClick={handleReset} disabled={loading}>
          {loading ? '전송 중...' : '재설정 링크 보내기'}
        </button>
        <a href="/login" className="auth-link">로그인으로 돌아가기</a>
      </div>
    </div>
  )
}