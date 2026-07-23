// src/app/update-password/page.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import '@/styles/auth.css'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleUpdate() {
    if (!password || !passwordConfirm) {
      setError('비밀번호를 입력하세요')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요')
      return
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않아요')
      return
    }
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push('/login')
  }

  return (
    <div className="auth-container">
      <h1 className="auth-title">새 비밀번호 설정</h1>
      <div className="auth-form">
        <input
          className="auth-input"
          placeholder="새 비밀번호"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleUpdate()}
        />
        <input
          className="auth-input"
          placeholder="새 비밀번호 확인"
          type="password"
          value={passwordConfirm}
          onChange={e => setPasswordConfirm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleUpdate()}
        />
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-btn-primary" onClick={handleUpdate} disabled={loading}>
          {loading ? '변경 중...' : '비밀번호 변경'}
        </button>
      </div>
    </div>
  )
}