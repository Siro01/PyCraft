import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import Win from '@/components/ui/Win'
import RepasoActivity from '@/components/game/repaso/RepasoActivity'
import { isLocalMode } from '@/lib/local-mode'
import { getBossById } from '@/lib/game/bosses'
import { getRepaso } from '@/lib/game/repasos'

interface PageProps {
  params: Promise<{ bossId: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { bossId } = await params
  const repaso = getRepaso(bossId)
  return { title: repaso ? `Repaso · ${repaso.title}` : 'Repaso' }
}

/** ¿Puede entrar a este repaso? ¿Y ya puede pelear contra el jefe? */
async function access(bossId: string): Promise<{ allowed: boolean; canFight: boolean }> {
  if (isLocalMode()) return { allowed: true, canFight: true }
  const { createClient } = await import('@/lib/supabase/server')
  const { getEnabledRepasoIds } = await import('@/lib/supabase/enabled-repasos')
  const { getEnabledBossIds } = await import('@/lib/supabase/enabled-bosses')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'
  const [repasos, bosses] = await Promise.all([
    getEnabledRepasoIds(supabase, user.id, isAdmin),
    isAdmin ? Promise.resolve(null) : getEnabledBossIds(supabase, user.id),
  ])
  return { allowed: repasos.includes(bossId), canFight: isAdmin || !!bosses?.has(bossId) }
}

export default async function RepasoPage({ params }: PageProps) {
  const { bossId } = await params
  const repaso = getRepaso(bossId)
  const boss = getBossById(bossId)
  if (!repaso || !boss) notFound()

  const { allowed, canFight } = await access(bossId)

  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {allowed ? (
          <RepasoActivity repaso={repaso} boss={boss} canFight={canFight} />
        ) : (
          <Win title="ESCUELITA.EXE" active bodyStyle={{ padding: 24 }}>
            <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 22, color: 'hsl(var(--tx2))', margin: 0 }}>
              Este repaso todavía no está habilitado. Si faltaste a esa clase, pedile a tu docente que te lo active.
            </p>
            <Link href="/repaso" className="repaso-ghost-btn" style={{ marginTop: 16, display: 'inline-flex' }}>Ver mis repasos</Link>
          </Win>
        )}
      </main>
    </div>
  )
}
