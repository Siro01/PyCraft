import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { isLocalMode } from '@/lib/local-mode'
import { getSecretBoss, secretUnlock } from '@/lib/game/secret/bosses'
import { getEnabledTiers } from '@/lib/supabase/enabled-tiers'
import { TIER_COOKIE, pickTier } from '@/lib/game/tiers'
import LocalSecretView from '@/components/game/secret/LocalSecretView'
import CloudSecretView from '@/components/game/secret/CloudSecretView'
import { ADMIN_VIEW_COOKIE, parseAdminView } from '@/lib/admin/view-mode'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const s = getSecretBoss(id)
  return { title: s ? `${s.name} · ???` : '???' }
}

export default async function SecretPage({ params }: PageProps) {
  const { id } = await params
  const secret = getSecretBoss(id)
  if (!secret) notFound()
  if (isLocalMode()) return <LocalSecretView secret={secret} />

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'
  const { data: rows } = await supabase
    .from('battle_records')
    .select('boss_id')
    .eq('user_id', user.id)
    .eq('is_completed', true)
  const defeatedIds = Array.from(new Set((rows ?? []).map((r: { boss_id: string }) => r.boss_id)))
  if (!isAdmin && !secretUnlock(secret, defeatedIds).open) redirect('/dashboard')

  // Mismo nivel que en las batallas: la serie no pasa del nivel en el que juega.
  const cookieStore = await cookies()
  const tier = pickTier(await getEnabledTiers(supabase, user.id, isAdmin), cookieStore.get(TIER_COOKIE)?.value) ?? 'junior'
  const adminView = parseAdminView(cookieStore.get(ADMIN_VIEW_COOKIE)?.value)
  return <CloudSecretView secret={secret} defeatedIds={defeatedIds} tier={tier} adminTools={isAdmin && adminView === 'admin'} />
}
