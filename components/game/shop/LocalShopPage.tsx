'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { LoadingScreen } from '@/components/ui/LoadingBar'
import { getAllProgress, getLocalEnabledBosses, getLocalUser, type LocalUser } from '@/lib/storage/local-store'
import ShopApp from './ShopApp'
import { SHOP_UNLOCK_BOSS_ID } from '@/lib/game/shop'

const MERCADER_BOSS_ID = 'mercader-abismo'

export default function LocalShopPage() {
  const router = useRouter()
  const [user, setUser] = useState<LocalUser | null>(null)
  const [totalDefeated, setTotalDefeated] = useState(0)
  const [battleNear, setBattleNear] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const localUser = getLocalUser()
    if (!localUser) {
      router.replace('/login')
      return
    }
    setUser(localUser)
    const progress = getAllProgress()
    setTotalDefeated(Object.values(progress).filter((p) => p.defeated).length)
    const enabled = getLocalEnabledBosses()
    setUnlocked(localUser.role === 'admin' || !!progress[SHOP_UNLOCK_BOSS_ID]?.defeated)
    setBattleNear(!!enabled?.includes(MERCADER_BOSS_ID) && !progress[MERCADER_BOSS_ID]?.defeated)
    setReady(true)
  }, [router])

  if (!ready) return <LoadingScreen label="Cargando la tienda..." estimatedMs={800} />

  return (
    <div className="min-h-screen desk-theme">
      <Header username={user?.name} role={user?.role} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <ShopApp totalDefeated={totalDefeated} username={user?.name} battleNear={battleNear} unlocked={unlocked} adminView={user?.role === 'admin'} />
      </main>
    </div>
  )
}
