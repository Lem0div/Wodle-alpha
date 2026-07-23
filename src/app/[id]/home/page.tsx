// src/app/[id]/home/page.tsx
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'
import { createClient } from '@/utils/supabase/server'

type Props = {
  params: Promise<{ id: string }>
}

export default async function HomePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profile')
    .select('streak')
    .eq('user_id', id)
    .single()

  return (
    <div>
      <TopNav />
      <BottomNav userId={id} />
    </div>
  )
}