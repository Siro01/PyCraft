// Nivel del jugador (1-20). Código puro (sin navegador): lo usan el juego
// (local-store, que lo re-exporta) y el panel docente (compensaciones).

import { PLAYGROUND_ACTS } from '@/lib/game/playground'

/** Respaldo si el patio no tuviera ninguna tanda. */
const XP_PER_LEVEL_FALLBACK = 100

// Nivel 1-20 como fracción del XP MÁXIMO posible hoy en el patio de juegos
// (todas las tandas, todos los ejercicios, con la mejor racha) — no un XP
// fijo por nivel. Así nivel 20 es exactamente "completaste todo lo que hay"
// sin importar cuántos actos tenga el patio de juegos en el futuro: al
// agregar más tandas, el nivel de un alumno existente se recalcula solo
// (baja proporcionalmente) hasta que también complete lo nuevo.
export const PLAYGROUND_MAX_LEVEL = 20

function playgroundMaxXp(): number {
  let max = 0
  for (const act of PLAYGROUND_ACTS) {
    for (const topic of act.topics) {
      const n = topic.exercises.length
      max += n * 10 + Math.max(0, n - 2) * 2
    }
  }
  return max
}

export function playgroundLevel(xp: number): { level: number; xpIntoLevel: number; xpForNext: number } {
  const maxXp = playgroundMaxXp()
  const perLevel = maxXp > 0 ? maxXp / (PLAYGROUND_MAX_LEVEL - 1) : XP_PER_LEVEL_FALLBACK
  const level = Math.min(PLAYGROUND_MAX_LEVEL, 1 + Math.floor(xp / perLevel))
  const levelFloorXp = (level - 1) * perLevel
  const xpIntoLevel = Math.round(Math.max(0, xp - levelFloorXp))
  const xpForNext = level >= PLAYGROUND_MAX_LEVEL ? xpIntoLevel : Math.round(perLevel)
  return { level, xpIntoLevel, xpForNext }
}

