import { notFound, redirect } from 'next/navigation'
import { isLocalMode } from '@/lib/local-mode'
import LocalBattleView from '@/components/game/LocalBattleView'
import Header from '@/components/layout/Header'
import CombatArena from '@/components/game/CombatArena'
import { getBossById } from '@/lib/game/bosses'
import { getChallengesForBoss } from '@/lib/game/challenges'

interface PageProps {
  params: Promise<{ bossId: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { bossId } = await params
  const boss = getBossById(bossId)
  return { title: boss ? `${boss.name} · Batalla` : 'Batalla' }
}

// ── Local mode: client component reads user + HP + tier from localStorage ──
function LocalBattlePage({ bossId }: { bossId: string }) {
  const boss = getBossById(bossId)
  if (!boss) notFound()

  return (
    <LocalBattleView
      boss={boss}
      victoryHref={boss.classNumber === 14 ? '/demo/victory' : undefined}
    />
  )
}

// ── Supabase mode ─────────────────────────────────────────────────────────────
async function SupabaseBattlePage({ bossId }: { bossId: string }) {
  const { createClient } = await import('@/lib/supabase/server')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const boss = getBossById(bossId)
  if (!boss) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  if (!isAdmin) {
    const { data: bossRow } = await supabase
      .from('bosses')
      .select('is_enabled')
      .eq('id', bossId)
      .single()
    if (!bossRow?.is_enabled) redirect('/dashboard')
  }

  let { data: battle } = await supabase
    .from('battle_records')
    .select('*')
    .eq('user_id', user.id)
    .eq('boss_id', bossId)
    .eq('is_completed', false)
    .single()

  if (!battle) {
    const { data: newBattle } = await supabase
      .from('battle_records')
      .insert({
        user_id: user.id,
        boss_id: bossId,
        hp_current: boss.hpMax,
        is_completed: false,
        attacks_count: 0,
      })
      .select()
      .single()
    battle = newBattle
  }

  const challenges = getChallengesForBoss(bossId)
  const username = profile?.username ?? user.email?.split('@')[0] ?? 'Jugador'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--bg))' }}>
      <Header username={username} role={profile?.role} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="flex items-center gap-2 mb-4 font-mono text-xs text-tx3">
          <a href="/dashboard" className="hover:text-tx transition-colors">← Mapa</a>
          <span>/</span>
          <span className="text-tx2">{boss.title}</span>
          <span>/</span>
          <span className="text-tx">{boss.name}</span>
        </div>

        <CombatArena
          boss={boss}
          challenges={challenges}
          initialHp={battle?.hp_current ?? boss.hpMax}
        />
      </main>
    </div>
  )
}

export default async function BattlePage({ params }: PageProps) {
  const { bossId } = await params
  if (isLocalMode()) return <LocalBattlePage bossId={bossId} />
  return <SupabaseBattlePage bossId={bossId} />
}
