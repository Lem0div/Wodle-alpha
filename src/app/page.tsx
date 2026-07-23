// src/app/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import '@/styles/landing.css'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect(`/${user.id}/home`)

  return (
    <div className="landing-container">
      <div className="landing-title-wrap">
        <p className="landing-subtitle">단어 암기 앱</p>
        <h1 className="landing-title">Wodle</h1>
      </div>
      <div className="landing-buttons">
        <a href="/login" className="btn-login">로그인</a>
        <a href="/signup" className="btn-signup">회원가입</a>
      </div>
    </div>
  )
}