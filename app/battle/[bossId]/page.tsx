import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { isLocalMode } from '@/lib/local-mode'
import LocalBattleView from '@/components/game/LocalBattleView'
import Header from '@/components/layout/Header'
import CombatArena from '@/components/game/CombatArena'
import { getBossById } from '@/lib/game/bosses'
import { getChallengesForBoss } from '@/lib/game/challenges'
import { getEnabledBossIds } from '@/lib/supabase/enabled-bosses'
import { getEnabledTiers } from '@/lib/supabase/enabled-tiers'
import { TIER_COOKIE, pickTier } from '@/lib/game/tiers'
import TestHud from '@/components/game/TestHud'
import { isTestUser } from '@/lib/test-student/server'
import AdminViewBar from '@/components/game/AdminViewBar'
import { ADMIN_VIEW_COOKIE, parseAdminView } from '@/lib/admin/view-mode'

interface PageProps {
  params: Promise<{ bossId: string }>
  /** `?practica=1`: revancha contra un jefe ya derrotado — no guarda nada ni da premios. */
  searchParams: Promise<{ practica?: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { bossId } = await params
  const boss = getBossById(bossId)
  return { title: boss ? `${boss.name} · Batalla` : 'Batalla' }
}

// ── Local mode: client component reads user + HP + tier from localStorage ──
function LocalBattlePage({ bossId, practice }: { bossId: string; practice: boolean }) {
  const boss = getBossById(bossId)
  if (!boss) notFound()

  return (
    <LocalBattleView
      boss={boss}
      victoryHref={boss.classNumber === 14 ? '/finale/proyecto' : undefined}
      practiceRequested={practice}
    />
  )
}

// ── Supabase mode ─────────────────────────────────────────────────────────────
async function SupabaseBattlePage({ bossId, practiceRequested }: { bossId: string; practiceRequested: boolean }) {
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
  const enabledTiers = await getEnabledTiers(supabase, user.id, isAdmin)
  const cookieStore = await cookies()
  const tier = pickTier(enabledTiers, cookieStore.get(TIER_COOKIE)?.value)
  const adminView = parseAdminView(cookieStore.get(ADMIN_VIEW_COOKIE)?.value)
  const adminTools = isAdmin && adminView === 'admin'
  if (!tier) redirect('/dashboard')

  if (!isAdmin) {
    const enabledIds = await getEnabledBossIds(supabase, user.id)
    if (!enabledIds.has(bossId)) redirect('/dashboard')
  }

  // Práctica: solo si de verdad ya lo derrotó. No se crea ni se toca ningún
  // battle_record (así no cambian diamantes, Mercader ni estadísticas del docente).
  let practice = false
  if (practiceRequested) {
    const { data: won } = await supabase
      .from('battle_records')
      .select('id')
      .eq('user_id', user.id)
      .eq('boss_id', bossId)
      .eq('is_completed', true)
      .limit(1)
    practice = (won ?? []).length > 0
  }

  // Reutiliza el registro existente (en curso o completado); solo crea uno si no hay ninguno.
  const { data: existing } = await supabase
    .from('battle_records')
    .select('*')
    .eq('user_id', user.id)
    .eq('boss_id', bossId)
    .order('is_completed', { ascending: true })
    .order('started_at', { ascending: false })
    .limit(1)

  let battle = existing?.[0] ?? null

  if (!battle && !practice) {
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

  // Jefes ya derrotados (sin contar este): el Mercader aparece cada 2.
  const { data: doneRows } = await supabase
    .from('battle_records')
    .select('boss_id')
    .eq('user_id', user.id)
    .eq('is_completed', true)
    .neq('boss_id', bossId)
  const defeatedBefore = new Set((doneRows ?? []).map((r: { boss_id: string }) => r.boss_id)).size

  const isTest = await isTestUser(supabase, user.id)
  const challenges = getChallengesForBoss(bossId, tier)
  const username = profile?.username ?? user.email?.split('@')[0] ?? 'Jugador'

  return (
    <div className="min-h-screen flex flex-col desk-theme">
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
          tier={tier}
          showGuide={tier !== 'senior'}
          initialHp={practice ? boss.hpMax : battle?.hp_current ?? boss.hpMax}
          initialDefeated={practice ? false : battle?.is_completed ?? false}
          victoryHref={!practice && boss.classNumber === 14 ? '/finale/proyecto' : undefined}
          practice={practice}
          defeatedBefore={defeatedBefore}
          testMode={isTest || adminTools}
          adminTools={adminTools}
          persist={battle && !practice ? { battleId: battle.id, userId: user.id, attacksCount: battle.attacks_count } : undefined}
        />
      </main>
      {isTest && <TestHud />}
      {isAdmin && <AdminViewBar view={adminView} tier={tier} />}
    </div>
  )
}

export default async function BattlePage({ params, searchParams }: PageProps) {
  const { bossId } = await params
  const practice = (await searchParams).practica === '1'
  if (isLocalMode()) return <LocalBattlePage bossId={bossId} practice={practice} />
  return <SupabaseBattlePage bossId={bossId} practiceRequested={practice} />
}
