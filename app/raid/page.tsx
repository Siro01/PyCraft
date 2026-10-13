import { redirect } from 'next/navigation'
import SecretRaidLobby from '@/components/game/raid/secret/SecretRaidLobby'
import { getArenaCaller } from '@/lib/game/arena/server'
import { isLocalMode } from '@/lib/local-mode'

export const metadata = { title: 'Raids · PySQLBossRush' }
export const dynamic = 'force-dynamic'

// Lobby de raids contra los jefes secretos (solo con cuenta del taller).
export default async function RaidLobbyPage() {
  if (isLocalMode()) redirect('/dashboard')
  const me = await getArenaCaller()
  if (!me) redirect('/login')
  return <SecretRaidLobby />
}
