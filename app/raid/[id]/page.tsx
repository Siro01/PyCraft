import { redirect } from 'next/navigation'
import SecretRaidFight from '@/components/game/raid/secret/SecretRaidFight'
import { getArenaCaller } from '@/lib/game/arena/server'
import { isLocalMode } from '@/lib/local-mode'

export const metadata = { title: 'Raid · PySQLBossRush' }
export const dynamic = 'force-dynamic'

export default async function RaidFightPage({ params }: { params: Promise<{ id: string }> }) {
  if (isLocalMode()) redirect('/dashboard')
  const me = await getArenaCaller()
  if (!me) redirect('/login')
  const { id } = await params
  return <SecretRaidFight raidId={id} />
}
