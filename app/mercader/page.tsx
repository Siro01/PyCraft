import { redirect } from 'next/navigation'
import { isLocalMode } from '@/lib/local-mode'
import Header from '@/components/layout/Header'
import ShopApp from '@/components/game/shop/ShopApp'
import LocalShopPage from '@/components/game/shop/LocalShopPage'
import { getEnabledBossIds } from '@/lib/supabase/enabled-bosses'
import { SHOP_UNLOCK_BOSS_ID } from '@/lib/game/shop'

// El mismo personaje de la tienda es el jefe #4 del Acto I — este diálogo
// especial avisa que la batalla está cerca en vez de la bienvenida de siempre.
const MERCADER_BOSS_ID = 'mercader-abismo'

async function SupabaseShopPage() {
  const { createClient } = await import('@/lib/supabase/server')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .single()

  // Un jefe puede tener más de un battle_record (reintentos/reset) — se
  // cuenta por boss_id distinto derrotado, igual que en el dashboard, para
  // que resetear y volver a ganar el mismo jefe no farmee diamantes.
  const { data: battles } = await supabase
    .from('battle_records')
    .select('boss_id, is_completed')
    .eq('user_id', user.id)

  const defeatedIds = new Set(
    (battles ?? [])
      .filter((b: { is_completed: boolean }) => b.is_completed)
      .map((b: { boss_id: string }) => b.boss_id)
  )

  const username = profile?.username ?? user.email?.split('@')[0] ?? 'Jugador'

  const enabledIds = await getEnabledBossIds(supabase, user.id)
  const battleNear = enabledIds.has(MERCADER_BOSS_ID) && !defeatedIds.has(MERCADER_BOSS_ID)

  return (
    <div className="min-h-screen desk-theme">
      <Header username={username} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <ShopApp totalDefeated={defeatedIds.size} username={username} battleNear={battleNear} unlocked={profile?.role === 'admin' || defeatedIds.has(SHOP_UNLOCK_BOSS_ID)} adminView={profile?.role === 'admin'} />
      </main>
    </div>
  )
}

export default async function MercaderPage() {
  if (isLocalMode()) return <LocalShopPage />
  return <SupabaseShopPage />
}
