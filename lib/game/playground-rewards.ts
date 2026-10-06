// Diamantes del patio de juegos — una fuente chica y aparte de los jefes.
//
// Se ganan por LOGROS PERMANENTES de cada tanda, nunca por nivel: el nivel
// del patio es relativo al XP máximo (ver playgroundLevel en local-store), así
// que baja solo cuando se agregan tandas nuevas — si los diamantes salieran
// del nivel, sumar contenido le quitaría diamantes a quien ya los gastó.
//
// Igual que los de jefes, no se guardan como contador: se calculan del estado
// del patio que ya se sincroniza (xpAwarded = tandas terminadas, bestScore =
// mejor puntaje), así que no se pueden farmear repitiendo ni desincronizar.

import type { PlaygroundState } from '@/lib/storage/local-store'
import { PLAYGROUND_ACTS, type PlaygroundTopic } from '@/lib/game/playground'

/** Por terminar una tanda la primera vez (con cualquier puntaje). */
export const PLAYGROUND_DIAMONDS_COMPLETE = 3
/** Extra, la primera vez que la tanda sale perfecta (se puede lograr repitiéndola). */
export const PLAYGROUND_DIAMONDS_PERFECT = 2

export interface TopicReward {
  complete: boolean
  perfect: boolean
  earned: number
  max: number
}

export function topicReward(topic: PlaygroundTopic, state: Pick<PlaygroundState, 'xpAwarded' | 'bestScore'>): TopicReward {
  const complete = state.xpAwarded[topic.key] === true
  const perfect = complete && (state.bestScore[topic.key] ?? 0) >= topic.exercises.length
  return {
    complete,
    perfect,
    earned: (complete ? PLAYGROUND_DIAMONDS_COMPLETE : 0) + (perfect ? PLAYGROUND_DIAMONDS_PERFECT : 0),
    max: PLAYGROUND_DIAMONDS_COMPLETE + PLAYGROUND_DIAMONDS_PERFECT,
  }
}

/** Todos los diamantes ganados en el patio (todos los actos). */
export function playgroundDiamonds(state: Pick<PlaygroundState, 'xpAwarded' | 'bestScore'>): number {
  let total = 0
  for (const act of PLAYGROUND_ACTS) for (const t of act.topics) total += topicReward(t, state).earned
  return total
}

/** El máximo que se puede ganar hoy en el patio (crece al agregar tandas). */
export function playgroundMaxDiamonds(): number {
  let total = 0
  for (const act of PLAYGROUND_ACTS) total += act.topics.length * (PLAYGROUND_DIAMONDS_COMPLETE + PLAYGROUND_DIAMONDS_PERFECT)
  return total
}
