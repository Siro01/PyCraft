'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SecretArena from './SecretArena'
import { getAllProgress, getLocalTier, getLocalUser } from '@/lib/storage/local-store'
import { secretUnlock, type SecretBoss } from '@/lib/game/secret/bosses'
import type { ChallengeTier } from '@/types'

/** Modo local: el progreso vive en este navegador. */
export default function LocalSecretView({ secret }: { secret: SecretBoss }) {
  const router = useRouter()
  const [state, setState] = useState<{ ids: string[]; admin: boolean; tier: ChallengeTier } | null>(null)

  useEffect(() => {
    const user = getLocalUser()
    if (!user) { router.replace('/login'); return }
    const ids = Object.entries(getAllProgress()).filter(([, p]) => p.defeated).map(([id]) => id)
    const admin = user.role === 'admin'
    if (!admin && !secretUnlock(secret, ids).open) { router.replace('/dashboard'); return }
    setState({ ids, admin, tier: getLocalTier() })
  }, [router, secret])

  if (!state) return <div style={{ minHeight: '100vh', background: '#000' }} />
  return <SecretArena secret={secret} defeatedIds={state.ids} tier={state.tier} adminTools={state.admin} />
}
