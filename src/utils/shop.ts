// src/utils/shop.ts
import { createClient } from '@/utils/supabase/client'
import { getLocalDateStr } from '@/utils/date'
import { seededShuffle, hashToUnitFloat } from '@/utils/random'
import { rerollQuestSelection } from '@/utils/quest'

export type ShopItemType = 'theme' | 'title' | 'decoration' | 'consumable'

export type ShopItem = {
  id: number
  type: ShopItemType
  key: string
  name: string
  description: string
  price: number
  value: string
  effect: string | null
  is_hidden: boolean
  sort_order: number
}

export type ShopSlot = ShopItem & { isHiddenSlot: boolean }

export const SHOP_SLOT_COUNT = 4
// one slot occasionally gets swapped for a rare item — same idea as the
// quest system's hidden tier
export const HIDDEN_SHOP_CHANCE = 0.03
export const SHOP_REROLL_COST = 50
export const SHOP_REROLL_DAILY_LIMIT = 2

export type PurchaseLog = Record<number, { date: string; reroll: number }>

type SupabaseClient = ReturnType<typeof createClient>

const EQUIPPED_COLUMN: Record<'theme' | 'title' | 'decoration', 'equipped_theme' | 'equipped_title' | 'equipped_decoration'> = {
  theme: 'equipped_theme',
  title: 'equipped_title',
  decoration: 'equipped_decoration',
}

// theme colors live on the CSS custom property that drives the app's accent
// color everywhere (buttons, badges, icons) — see src/styles/colors.css
export function applyThemeColor(hex: string) {
  document.documentElement.style.setProperty('--orange', hex)
}

async function getShopRerollState(supabase: SupabaseClient, userId: string): Promise<{ count: number; date: string | null }> {
  const { data } = await supabase
    .from('profile')
    .select('shop_reroll_count, shop_reroll_date')
    .eq('user_id', userId)
    .single()
  return { count: data?.shop_reroll_count ?? 0, date: data?.shop_reroll_date ?? null }
}

// the stored count only means anything for *today* — once the date rolls
// over, treat it as 0 without needing to write a reset anywhere
export function todaysRerollSalt(state: { count: number; date: string | null }, today: string): number {
  return state.date === today ? state.count : 0
}

// a consumable slot is "sold out" once bought at the current reroll salt —
// rerolling (even to the same item again) counts as a new instance and
// clears it, so the same item CAN show up and be bought on back-to-back rerolls
export function isConsumableSoldOut(log: PurchaseLog | null | undefined, itemId: number, today: string, salt: number): boolean {
  const entry = log?.[itemId]
  return !!entry && entry.date === today && entry.reroll === salt
}

export async function getTodaysShopSelection(userId: string, allItems: ShopItem[]): Promise<ShopSlot[]> {
  const supabase = createClient()
  const rerollState = await getShopRerollState(supabase, userId)
  const today = getLocalDateStr()
  const seed = `${userId}-${today}-r${todaysRerollSalt(rerollState, today)}`

  const normalPool = allItems.filter(i => !i.is_hidden)
  const hiddenPool = allItems.filter(i => i.is_hidden)

  const picks: ShopItem[] = seededShuffle(normalPool, seed).slice(0, SHOP_SLOT_COUNT)
  const hiddenHit = hiddenPool.length > 0 && hashToUnitFloat(`${seed}-hidden`) < HIDDEN_SHOP_CHANCE

  if (hiddenHit) {
    const hiddenPick = seededShuffle(hiddenPool, `${seed}-hidden-pick`)[0]
    picks[picks.length - 1] = hiddenPick
  }

  return picks.map((item, i) => ({ ...item, isHiddenSlot: hiddenHit && i === picks.length - 1 }))
}

export async function rerollShop(userId: string): Promise<{ success: boolean; error?: string; remaining?: number }> {
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profile')
    .select('coin, shop_reroll_count, shop_reroll_date')
    .eq('user_id', userId)
    .single()

  if (!profile) return { success: false, error: '프로필을 불러오지 못했어요.' }

  const today = getLocalDateStr()
  const currentCount = todaysRerollSalt({ count: profile.shop_reroll_count, date: profile.shop_reroll_date }, today)

  if (currentCount >= SHOP_REROLL_DAILY_LIMIT) return { success: false, error: '오늘 리롤을 다 썼어요.' }
  if (profile.coin < SHOP_REROLL_COST) return { success: false, error: '코인이 부족해요.' }

  const nextCount = currentCount + 1

  await supabase
    .from('profile')
    .update({ coin: profile.coin - SHOP_REROLL_COST, shop_reroll_count: nextCount, shop_reroll_date: today })
    .eq('user_id', userId)

  return { success: true, remaining: SHOP_REROLL_DAILY_LIMIT - nextCount }
}

export async function purchaseItem(item: ShopItem): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요해요.' }

  const { data: profile } = await supabase
    .from('profile')
    .select('coin, streak_freeze_count, shop_reroll_count, shop_reroll_date, shop_purchase_log')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { success: false, error: '프로필을 불러오지 못했어요.' }
  if (profile.coin < item.price) return { success: false, error: '코인이 부족해요.' }

  const today = getLocalDateStr()
  const salt = todaysRerollSalt({ count: profile.shop_reroll_count, date: profile.shop_reroll_date }, today)
  const purchaseLog: PurchaseLog = profile.shop_purchase_log ?? {}

  if (item.type === 'consumable') {
    if (isConsumableSoldOut(purchaseLog, item.id, today, salt)) {
      return { success: false, error: '오늘은 이미 구매했어요. 리롤하면 다시 살 수 있어요.' }
    }

    const { data: existing } = await supabase
      .from('user_item')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('item_id', item.id)
      .maybeSingle()

    if (existing) {
      await supabase.from('user_item').update({ quantity: existing.quantity + 1 }).eq('id', existing.id)
    } else {
      await supabase.from('user_item').insert({ user_id: user.id, item_id: item.id, quantity: 1 })
    }

    // streak freeze protects passively — it applies the moment you own one,
    // no separate "use" step (see updateStreak() in utils/streak.ts)
    if (item.effect === 'streak_freeze') {
      await supabase.from('profile').update({ streak_freeze_count: profile.streak_freeze_count + 1 }).eq('user_id', user.id)
    }

    const nextLog: PurchaseLog = { ...purchaseLog, [item.id]: { date: today, reroll: salt } }
    await supabase.from('profile').update({ coin: profile.coin - item.price, shop_purchase_log: nextLog }).eq('user_id', user.id)
  } else {
    const { error } = await supabase.from('user_item').insert({ user_id: user.id, item_id: item.id })
    if (error) return { success: false, error: '이미 가지고 있거나 구매에 실패했어요.' }

    await supabase.from('profile').update({ coin: profile.coin - item.price }).eq('user_id', user.id)
  }

  return { success: true }
}

export async function equipItem(type: 'theme' | 'title' | 'decoration', key: string | null): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('profile')
    .update({ [EQUIPPED_COLUMN[type]]: key })
    .eq('user_id', user.id)
}

// double/mega boost and the quest reroll ticket — streak freeze has no use
// step (see purchaseItem). Named consumeItem, not useConsumable — a "use*"
// name here trips ESLint's react-hooks rule since it looks like a hook.
export async function consumeItem(userId: string, item: ShopItem, ownedQuantity: number): Promise<{ success: boolean; error?: string }> {
  if (ownedQuantity <= 0) return { success: false, error: '보유 수량이 없어요.' }

  const supabase = createClient()

  if (item.effect === 'double_boost' || item.effect === 'mega_boost') {
    await supabase.from('profile').update({ pending_boost: item.effect }).eq('user_id', userId)
  } else if (item.effect === 'quest_reroll') {
    await rerollQuestSelection(userId)
  } else {
    return { success: false, error: '사용할 수 없는 아이템이에요.' }
  }

  await supabase
    .from('user_item')
    .update({ quantity: Math.max(0, ownedQuantity - 1) })
    .eq('user_id', userId)
    .eq('item_id', item.id)

  return { success: true }
}
