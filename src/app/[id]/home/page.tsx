// src/app/[id]/home/page.tsx
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'
import StreakCard from '@/components/StreakCard'
import ActionTabsCard from '@/components/ActionTabsCard'
import { createClient } from '@/utils/supabase/server'
import '@/styles/home.css'

type Props = {
  params: Promise<{ id: string }>
}

export default async function HomePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profile')
    .select('streak, last_login_at')
    .eq('user_id', id)
    .single()

  return (
    <div>
      <TopNav />
      <main className="home-container">
        <StreakCard streak={profile?.streak ?? 0} lastLoginAt={profile?.last_login_at ?? null} />
        <ActionTabsCard userId={id} />
      </main>
      <BottomNav userId={id} />
    </div>
  )
}
