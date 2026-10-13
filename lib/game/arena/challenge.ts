import type { Challenge } from '@/types'
import type { PublicArenaExercise } from './generators'

/**
 * Un ejercicio de la arena con la forma de un Challenge, para reusar el
 * executor y BattleConsole. En un duelo real la salida esperada no llega al
 * navegador (`expected` vacío): el navegador solo corre el código y le manda
 * la salida al servidor, que es quien decide si está bien.
 */
export function arenaChallenge(e: PublicArenaExercise, expected = ''): Challenge {
  return {
    id: e.id,
    bossId: e.bossId,
    title: e.title,
    description: e.description,
    type: e.type,
    tier: 'junior',
    expectedOutput: expected,
    initialCode: e.initialCode,
    seedSQL: e.seedSQL,
    verifySQL: e.verifySQL,
    damage: 0,
    orderIndex: 0,
  }
}
