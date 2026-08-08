// src/app/[id]/shop/page.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import {
  getTodaysShopSelection,
  rerollShop,
  purchaseItem,
  equipItem,
  consumeItem,
  applyThemeColor,
  todaysRerollSalt,
  isConsumableSoldOut,
  SHOP_REROLL_COST,
  SHOP_REROLL_DAILY_LIMIT,
  type ShopItem,
  type ShopSlot,
  type PurchaseLog,
} from '@/utils/shop'
import { getLocalDateStr } from '@/utils/date'
import '@/styles/shop.css'

type Equipped = { theme: string; title: string | null; decoration: string | null }
type OwnedRow = { item_id: number; quantity: number }

const COSMETIC_TYPES = ['theme', 'title', 'decoration'] as const

export default function ShopPage() {
  const params = useParams()
  const userId = params.id as string
  const supabase = createClient()

  const [allItems, setAllItems] = useState<ShopItem[]>([])
  const [slots, setSlots] = useState<ShopSlot[]>([])
  const [owned, setOwned] = useState<Record<number, number>>({})
  const [coin, setCoin] = useState(0)
  const [equipped, setEquipped] = useState<Equipped>({ theme: 'theme_orange', title: null, decoration: null })
  const [streakFreezeCount, setStreakFreezeCount] = useState(0)
  const [rerollsLeft, setRerollsLeft] = useState(SHOP_REROLL_DAILY_LIMIT)
  const [rerollSalt, setRerollSalt] = useState(0)
  const [purchaseLog, setPurchaseLog] = useState<PurchaseLog>({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: itemData } = await supabase
        .from('shop_item')
        .select('id, type, key, name, description, price, value, effect, is_hidden, sort_order')
        .order('sort_order', { ascending: true })

      const { data: ownedData } = await supabase
        .from('user_item')
        .select('item_id, quantity')
        .eq('user_id', user.id)

      const { data: profile } = await supabase
        .from('profile')
        .select('coin, equipped_theme, equipped_title, equipped_decoration, streak_freeze_count, shop_reroll_count, shop_reroll_date, shop_purchase_log')
        .eq('user_id', user.id)
        .single()

      const items = itemData ?? []
      setAllItems(items)
      setOwned(Object.fromEntries((ownedData ?? []).map((o: OwnedRow) => [o.item_id, o.quantity])))

      if (profile) {
        setCoin(profile.coin)
        setEquipped({ theme: profile.equipped_theme, title: profile.equipped_title, decoration: profile.equipped_decoration })
        setStreakFreezeCount(profile.streak_freeze_count)
        const today = getLocalDateStr()
        const salt = todaysRerollSalt({ count: profile.shop_reroll_count, date: profile.shop_reroll_date }, today)
        setRerollSalt(salt)
        setRerollsLeft(SHOP_REROLL_DAILY_LIMIT - salt)
        setPurchaseLog(profile.shop_purchase_log ?? {})
      }

      setSlots(await getTodaysShopSelection(user.id, items))
      setLoading(false)
    }
    fetchData()
  }, [])

  function flash(text: string) {
    setMessage(text)
    setTimeout(() => setMessage(''), 2000)
  }

  function isCosmeticOwned(item: ShopItem) {
    return item.price === 0 || (owned[item.id] ?? 0) > 0
  }

  function isEquipped(item: ShopItem) {
    return item.type !== 'consumable' && equipped[item.type] === item.key
  }

  function isSoldOut(item: ShopItem) {
    return item.type === 'consumable' && isConsumableSoldOut(purchaseLog, item.id, getLocalDateStr(), rerollSalt)
  }

  async function handleBuy(item: ShopItem) {
    const result = await purchaseItem(item)
    if (!result.success) { flash(result.error ?? '구매에 실패했어요.'); return }

    setOwned(prev => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }))
    setCoin(prev => prev - item.price)
    if (item.effect === 'streak_freeze') setStreakFreezeCount(prev => prev + 1)
    if (item.type === 'consumable') {
      setPurchaseLog(prev => ({ ...prev, [item.id]: { date: getLocalDateStr(), reroll: rerollSalt } }))
    }
    flash(`${item.name} 구매 완료!`)
  }

  async function handleEquip(item: ShopItem) {
    if (item.type === 'consumable') return
    const nextKey = isEquipped(item) && item.type !== 'theme' ? null : item.key
    await equipItem(item.type, nextKey)
    setEquipped(prev => ({ ...prev, [item.type]: nextKey }))
    if (item.type === 'theme' && nextKey) applyThemeColor(item.value)
  }

  async function handleUse(item: ShopItem) {
    const quantity = owned[item.id] ?? 0
    const result = await consumeItem(userId, item, quantity)
    if (!result.success) { flash(result.error ?? '사용에 실패했어요.'); return }

    setOwned(prev => ({ ...prev, [item.id]: Math.max(0, quantity - 1) }))
    flash(`${item.name} 사용했어요!`)
  }

  async function handleReroll() {
    const result = await rerollShop(userId)
    if (!result.success) { flash(result.error ?? '리롤에 실패했어요.'); return }

    setCoin(prev => prev - SHOP_REROLL_COST)
    const remaining = result.remaining ?? 0
    setRerollsLeft(remaining)
    setRerollSalt(SHOP_REROLL_DAILY_LIMIT - remaining)
    setSlots(await getTodaysShopSelection(userId, allItems))
  }

  const ownedCosmetics = allItems.filter(i => COSMETIC_TYPES.includes(i.type as typeof COSMETIC_TYPES[number]) && isCosmeticOwned(i))
  const ownedConsumables = allItems.filter(i => i.type === 'consumable' && i.effect !== 'streak_freeze' && (owned[i.id] ?? 0) > 0)

  if (loading) return null

  return (
    <div>
      <TopNav />
      <div className="shop-container">
        <div className="shop-header">
          <h2 className="shop-title">상점</h2>
          <span className="shop-coin">🪙 {coin.toLocaleString()}</span>
        </div>

        <div className="shop-section">
          <h3 className="shop-section-title">오늘의 상점</h3>
          <div className="shop-grid">
            {slots.map(item => {
              const owned_ = item.type === 'consumable' ? false : isCosmeticOwned(item)
              const soldOut = isSoldOut(item)
              return (
                <div key={item.id} className={`shop-card ${item.isHiddenSlot ? 'hidden' : ''}`}>
                  {item.type === 'theme' && <div className="shop-card-swatch" style={{ background: item.value }} />}
                  {item.type === 'decoration' && <div className="shop-card-emoji">{item.value}</div>}
                  {item.type === 'consumable' && <div className="shop-card-emoji">{item.value}</div>}
                  {item.type === 'title' && <div className="shop-card-title-preview">{item.value}</div>}
                  <div className="shop-card-name">{item.name}</div>
                  <div className="shop-card-desc">{item.description}</div>
                  {owned_ ? (
                    <span className="shop-card-owned">보유중</span>
                  ) : soldOut ? (
                    <span className="shop-card-owned">품절</span>
                  ) : (
                    <button className="shop-card-btn buy" onClick={() => handleBuy(item)}>
                      🪙 {item.price}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <button className="shop-reroll-btn" onClick={handleReroll} disabled={rerollsLeft <= 0 || coin < SHOP_REROLL_COST}>
            🎲 리롤하기 ({SHOP_REROLL_COST}코인) · 남은 {rerollsLeft}/{SHOP_REROLL_DAILY_LIMIT}
          </button>
        </div>

        <div className="shop-section">
          <h3 className="shop-section-title">내 아이템</h3>

          {streakFreezeCount > 0 && (
            <div className="shop-inventory-row">
              <span className="shop-inventory-emoji">🧊</span>
              <span className="shop-inventory-name">스트릭 프리즈</span>
              <span className="shop-inventory-qty">보유 {streakFreezeCount}개 (자동 방어)</span>
            </div>
          )}

          {ownedConsumables.map(item => (
            <div key={item.id} className="shop-inventory-row">
              <span className="shop-inventory-emoji">{item.value}</span>
              <span className="shop-inventory-name">{item.name}</span>
              <span className="shop-inventory-qty">x{owned[item.id]}</span>
              <button className="shop-inventory-use" onClick={() => handleUse(item)}>사용하기</button>
            </div>
          ))}

          {ownedCosmetics.length === 0 && ownedConsumables.length === 0 && streakFreezeCount === 0 && (
            <p className="shop-empty">아직 보유한 아이템이 없어요.</p>
          )}

          {ownedCosmetics.length > 0 && (
            <div className="shop-grid" style={{ marginTop: 10 }}>
              {ownedCosmetics.map(item => {
                const equippedNow = isEquipped(item)
                return (
                  <div key={item.id} className={`shop-card ${equippedNow ? 'equipped' : ''}`}>
                    {item.type === 'theme' && <div className="shop-card-swatch" style={{ background: item.value }} />}
                    {item.type === 'decoration' && <div className="shop-card-emoji">{item.value}</div>}
                    {item.type === 'title' && <div className="shop-card-title-preview">{item.value}</div>}
                    <div className="shop-card-name">{item.name}</div>
                    <button className={`shop-card-btn ${equippedNow ? 'equipped' : ''}`} onClick={() => handleEquip(item)}>
                      {equippedNow ? <><CheckCircleIcon width={14} height={14} /> 장착됨</> : '장착하기'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {message && <p className="shop-message">{message}</p>}
      </div>
      <BottomNav userId={userId} />
    </div>
  )
}
