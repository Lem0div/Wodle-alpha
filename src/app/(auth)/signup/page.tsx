// src/app/(auth)/signup/page.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import '@/styles/auth.css'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup() {
    if (!email || !password || !username) {
      setError('이메일, 비밀번호, 닉네임을 모두 입력하세요')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    await supabase
      .from('profile')
      .update({ userName: username })
      .eq('user_id', data.user!.id)
    router.push('/')
  }

  return (
    <div className="auth-container">
      <h1 className="auth-title">회원가입</h1>
      <div className="auth-form">
        <input
          className="auth-input"
          placeholder="이메일"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className="auth-input"
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <input
          className="auth-input"
          placeholder="닉네임"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSignup()}
        />
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-btn-primary" onClick={handleSignup} disabled={loading}>
          {loading ? '회원가입 중...' : '회원가입'}
        </button>
        <a href="/login" className="auth-link">로그인</a>
      </div>
    </div>
  )
}