import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import RepasoHub from '@/components/game/repaso/RepasoHub'
import { isLocalMode } from '@/lib/local-mode'
import { REPASO_BOSS_IDS } from '@/lib/game/repasos'

export const metadata = { title: 'Escuelita de Rodolfo' }

interface PageProps {
  searchParams: Promise<{ acto?: string }>
}

async function enabledIds(): Promise<string[]> {
  // Sin Supabase no hay panel docente que los habilite: quedan todos a mano.
  if (isLocalMode()) return REPASO_BOSS_IDS
  const { createClient } = await import('@/lib/supabase/server')
  const { getEnabledRepasoIds } = await import('@/lib/supabase/enabled-repasos')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return getEnabledRepasoIds(supabase, user.id, profile?.role === 'admin')
}

export default async function RepasoHubPage({ searchParams }: PageProps) {
  const { acto } = await searchParams
  const ids = await enabledIds()
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <RepasoHub ids={ids} actKey={acto} />
      </main>
    </div>
  )
}
