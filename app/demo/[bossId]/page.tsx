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

export default async function DemoBattlePage({ params }: PageProps) {
  const { bossId } = await params

  const boss = getBossById(bossId)
  if (!boss) notFound()

  const challenges = getChallengesForBoss(bossId)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--bg))' }}>
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 font-mono text-xs text-tx3 flex-wrap">
          <Link href="/demo" className="hover:text-tx transition-colors">← Demo</Link>
          <span>/</span>
          <span className="text-tx2">{boss.title}</span>
          <span>/</span>
          <span className="text-tx">{boss.name}</span>
          {/* Demo badge */}
          <span
            className="ml-auto px-2 py-0.5 pixel-corners-sm text-[10px] font-bold tracking-widest"
            style={{
              background: 'hsl(var(--accent) / 0.12)',
              color: 'hsl(var(--accent))',
              border: '1px solid hsl(var(--accent) / 0.3)',
            }}
          >
            DEMO · sin guardar
          </span>
        </div>

        {/* Arena — no initialHp (always fresh), victoryHref for final boss */}
        <CombatArena
          boss={boss}
          challenges={challenges}
          victoryHref={boss.classNumber === 14 ? '/finale/proyecto' : undefined}
        />
      </main>
    </div>
  )
}
