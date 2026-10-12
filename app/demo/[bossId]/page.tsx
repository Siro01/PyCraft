import { notFound } from 'next/navigation'
import Link from 'next/link'
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
  return { title: boss ? `${boss.name} · Demo` : 'Demo' }
}

// La demo solo deja enfrentar a Creeper Formulario (el primer jefe) — antes
// cualquier /demo/[bossId] andaba, así que alcanzaba con escribir la URL de
// otro jefe para saltearse el taller entero y spoilearse el resto.
const DEMO_BOSS_ID = 'creeper-formulario'

export default async function DemoBattlePage({ params }: PageProps) {
  const { bossId } = await params

  if (bossId !== DEMO_BOSS_ID) notFound()

  const boss = getBossById(bossId)
  if (!boss) notFound()

  const challenges = getChallengesForBoss(bossId)

  return (
    <div className="min-h-screen flex flex-col desk-theme">
      <Header />

      <main className="flex-1 mx-auto w-full px-4 py-5" style={{ maxWidth: 1180 }}>

        {/* Arena — no initialHp (always fresh), victoryHref for final boss */}
        <CombatArena
          boss={boss}
          challenges={challenges}
          showGuide
          topExtra={<span className="arena-tag">demo · sin guardar</span>}
          victoryHref={boss.classNumber === 14 ? '/finale/proyecto' : undefined}
        />
      </main>
    </div>
  )
}
