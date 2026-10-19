'use client'

import { useEffect } from 'react'

// Arranca la carga del progreso desde la nube en CUALQUIER página (no solo en
// las que tienen Header): el Pistolero y los raids entregan premios que
// escriben la lista de compras, y tienen que hacerlo sobre la lista de la
// cuenta, no sobre lo que haya quedado en esta PC. En modo local no hace nada.
export default function CloudSyncBoot() {
  useEffect(() => {
    void import('@/lib/storage/cloud-sync').then(({ syncOnLoad }) => syncOnLoad())
  }, [])
  return null
}
