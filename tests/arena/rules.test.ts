import { describe, expect, it } from 'vitest'
import { BOSSES } from '@/lib/game/bosses'
import {
  ARENA_DAILY_LOSS_CAP, ARENA_MIX, ARENA_TOPICS, duelActKey, maxStakeFor, normalizeOutput, sharedTopics,
} from '@/lib/game/arena/rules'

describe('retos por diamantes', () => {
  it('ofrece el más alto que alcanza con el saldo', () => {
    expect(maxStakeFor(0, 0)).toBe(0)
    expect(maxStakeFor(4, 0)).toBe(0)
    expect(maxStakeFor(5, 0)).toBe(5)
    expect(maxStakeFor(9, 0)).toBe(5)
    expect(maxStakeFor(10, 0)).toBe(10)
    expect(maxStakeFor(500, 0)).toBe(10)
  })

  it('respeta el tope de diamantes perdidos por día', () => {
    expect(maxStakeFor(500, ARENA_DAILY_LOSS_CAP - 10)).toBe(10)
    expect(maxStakeFor(500, ARENA_DAILY_LOSS_CAP - 5)).toBe(5)
    expect(maxStakeFor(500, ARENA_DAILY_LOSS_CAP - 4)).toBe(0)
    expect(maxStakeFor(500, ARENA_DAILY_LOSS_CAP)).toBe(0)
  })
})

describe('comparar salidas', () => {
  it('ignora espacios del final, saltos de Windows y bordes (igual que el executor)', () => {
    expect(normalizeOutput('  Hola  \r\nmundo   \n')).toBe('Hola\nmundo')
    expect(normalizeOutput('1\n2\n3')).toBe(normalizeOutput('1  \r\n2\r\n3\n\n'))
  })

  it('no confunde salidas distintas', () => {
    expect(normalizeOutput('Hola mundo')).not.toBe(normalizeOutput('Hola  mundo'))
    expect(normalizeOutput('1\n2')).not.toBe(normalizeOutput('12'))
  })
})

describe('temas en común', () => {
  it('solo los jefes que vencieron los dos, en orden de clase', () => {
    const a = ['creeper-formulario', 'guardian-puerta', 'golem-infinito', 'mercader-abismo']
    const b = ['golem-infinito', 'creeper-formulario']
    expect(sharedTopics(a, b).map((t) => t.id)).toEqual(['creeper-formulario', 'golem-infinito'])
  })

  it('el jefe final no es tema de la arena', () => {
    expect(ARENA_TOPICS.some((t) => t.type === 'final')).toBe(false)
    const all = BOSSES.map((b) => b.id)
    expect(sharedTopics(all, all).some((t) => t.type === 'final')).toBe(false)
  })

  it('el acto de la mezcla es el del tema más avanzado', () => {
    const shared = sharedTopics(BOSSES.map((b) => b.id), ['creeper-formulario', 'oraculo-oscuro'])
    expect(duelActKey(ARENA_MIX, shared)).toBe('sql')
    expect(duelActKey('creeper-formulario', shared)).toBe('python')
  })
})
