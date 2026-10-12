'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SecretArena from './SecretArena'
import { getAllProgress, getLocalUser } from '@/lib/storage/local-store'
import type { SecretBoss } from '@/lib/game/secret/bosses'

/** Modo local: el progreso vive en este navegador. */
export default function LocalSecretView({ secret }: { secret: SecretBoss }) {
  const router = useRouter()
  const [state, setState] = useState<{ ids: string[]; admin: boolean } | null>(null)

  useEffect(() => {
    const user = getLocalUser()
    if (!user) { router.replace('/login'); return }
    const ids = Object.entries(getAllProgress()).filter(([, p]) => p.defeated).map(([id]) => id)
    const admin = user.role === 'admin'
    if (!admin && ids.length < secret.minDefeated) { router.replace('/dashboard'); return }
    setState({ ids, admin })
  }, [router, secret.minDefeated])

  if (!state) return <div style={{ minHeight: '100vh', background: '#000' }} />
  return <SecretArena secret={secret} defeatedIds={state.ids} adminTools={state.admin} />
}
