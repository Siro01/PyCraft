'use client'

import { useEffect, useState } from 'react'
import { CLOUD_READY_EVENT } from '@/lib/storage/cloud-sync'

/**
 * Número que sube cuando la carga del progreso desde la nube termina: ponerlo
 * en las dependencias de un efecto que lee diamantes, nivel o ítems hace que
 * la pantalla se actualice con los datos de la cuenta (y no los de la PC).
 */
export function useCloudReadyTick(): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    const on = () => setN((x) => x + 1)
    window.addEventListener(CLOUD_READY_EVENT, on)
    return () => window.removeEventListener(CLOUD_READY_EVENT, on)
  }, [])
  return n
}
