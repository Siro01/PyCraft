'use client'

// Temporadas especiales (por ahora solo Halloween). Se activan solas por fecha
// y pintan todo el sitio con una paleta fija (html[data-season] en globals.css),
// sin tocar el tema que eligió cada alumno: cuando termina la semana, vuelve solo.
//
// Para probar antes de tiempo: ?halloween=1 (prende), ?halloween=0 (apaga),
// ?halloween=auto (vuelve a la fecha). Vale para esa pestaña (sessionStorage),
// así una prueba en una PC del aula no queda pegada.

import { useEffect, useState } from 'react'
import { EXCLUDED, HALLOWEEN_FROM, HALLOWEEN_UNTIL, OVERRIDE_KEY } from './season-boot'

export type Season = 'halloween'

/** ¿Corresponde Halloween en esta pestaña? (fecha + override de prueba) */
export function halloweenActive(): boolean {
  let o: string | null = null
  try { o = sessionStorage.getItem(OVERRIDE_KEY) } catch { /* modo privado */ }
  if (o === 'on') return true
  if (o === 'off') return false
  const n = Date.now()
  return n >= new Date(...HALLOWEEN_FROM).getTime() && n < new Date(...HALLOWEEN_UNTIL).getTime()
}

export function seasonExcluded(pathname: string): boolean {
  return EXCLUDED.some((p) => pathname.startsWith(p))
}

/** Pone o saca el atributo (lo usa la capa de decoración al cambiar de página). */
export function applySeason(on: boolean): void {
  const el = document.documentElement
  if (on) el.setAttribute('data-season', 'halloween')
  else el.removeAttribute('data-season')
}

function subscribe(cb: () => void): () => void {
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-season'] })
  return () => mo.disconnect()
}

const readSeason = (): Season | null =>
  document.documentElement.getAttribute('data-season') === 'halloween' ? 'halloween' : null

/** Temporada activa. En el servidor y al hidratar es null; al montar toma el valor real. */
export function useSeason(): Season | null {
  const [season, setSeason] = useState<Season | null>(null)
  useEffect(() => {
    const update = () => setSeason(readSeason())
    update()
    return subscribe(update)
  }, [])
  return season
}

// ── Rodolfo disfrazado ──────────────────────────────────────────────────────

export const RODOLFO_COSTUMES = ['bruja', 'fantasma', 'vampiro'] as const
export type RodolfoCostume = typeof RODOLFO_COSTUMES[number]

// Un disfraz por carga de página: todos los Rodolfos de la pantalla coinciden.
let costume: RodolfoCostume | null = null
function pickCostume(): RodolfoCostume {
  costume ??= RODOLFO_COSTUMES[Math.floor(Math.random() * RODOLFO_COSTUMES.length)]
  return costume
}

/** Disfraz de Rodolfo según la temporada (null = Rodolfo de siempre). */
export function useRodolfoCostume(): RodolfoCostume | null {
  return useSeason() === 'halloween' ? pickCostume() : null
}

/** GIF de Rodolfo para <img src>: el normal o, en Halloween, uno de los 3 disfraces. */
export function useRodolfoSrc(): string {
  const c = useRodolfoCostume()
  return c ? `/rodolfo/halloween/${c}.gif` : '/rodolfo/rodolfo.gif'
}
