'use client'

import { useEffect } from 'react'
import SecretArena from './SecretArena'
import type { SecretBoss } from '@/lib/game/secret/bosses'

/** Modo cuenta: trae de la nube el registro de la tienda (diamantes, ítems) antes de pelear. */
export default function CloudSecretView(props: { secret: SecretBoss; defeatedIds: string[]; adminTools: boolean }) {
  useEffect(() => {
    import('@/lib/storage/cloud-sync').then(({ syncOnLoad }) => syncOnLoad())
  }, [])
  return <SecretArena {...props} />
}
