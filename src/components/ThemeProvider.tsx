// src/components/ThemeProvider.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { applyThemeColor } from '@/utils/shop'
import { useEffect } from 'react'

export default function ThemeProvider() {
  const supabase = createClient()

  useEffect(() => {
    async function applyTheme(userId: string | null) {
      if (!userId) {
        document.documentElement.classList.remove('dark')
        return
      }

      const { data } = await supabase
        .from('setting')
        .select('dark_mode')
        .eq('user_id', userId)
        .single()

      if (data?.dark_mode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }

      const { data: profile } = await supabase
        .from('profile')
        .select('equipped_theme')
        .eq('user_id', userId)
        .single()

      if (profile?.equipped_theme) {
        const { data: theme } = await supabase
          .from('shop_item')
          .select('value')
          .eq('key', profile.equipped_theme)
          .single()

        if (theme) applyThemeColor(theme.value)
      }
    }

    // 초기 실행
    supabase.auth.getUser().then(({ data: { user } }) => applyTheme(user?.id ?? null))

    // auth 상태 변화 구독 (로그인/로그아웃 감지)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      applyTheme(session?.user?.id ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}