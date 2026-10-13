'use client'

import { useEffect } from 'react'
import SecretArena from './SecretArena'
import type { SecretBoss } from '@/lib/game/secret/bosses'
import type { ChallengeTier } from '@/types'

/** Modo cuenta: trae de la nube el registro de la tienda (diamantes, ítems) antes de pelear. */
export default function CloudSecretView(props: { secret: SecretBoss; defeatedIds: string[]; tier: ChallengeTier; adminTools: boolean }) {
  useEffect(() => {
    import('@/lib/storage/cloud-sync').then(({ syncOnLoad }) => syncOnLoad())
  }, [])
  return <SecretArena {...props} />
}
