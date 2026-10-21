'use client'

import { useEffect, useState } from 'react'
import { CLOUD_READY_EVENT, isProgressLoaded } from '@/lib/storage/cloud-sync'

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

/**
 * true cuando ya llegó TODO el progreso de la cuenta (también arena, raids y
 * compensaciones). Mientras es false, el nivel y los diamantes se muestran
 * como "…": así nunca se ve un número equivocado. Arranca en false también en
 * el servidor, para que el HTML coincida con el primer render del cliente.
 */
export function useProgressLoaded(): boolean {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const check = () => setLoaded(isProgressLoaded())
    check()
    window.addEventListener(CLOUD_READY_EVENT, check)
    return () => window.removeEventListener(CLOUD_READY_EVENT, check)
  }, [])
  return loaded
}
