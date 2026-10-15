import { beforeAll, describe, expect, it } from 'vitest'
import initSqlJs, { type SqlJsStatic } from 'sql.js'
import {
  ARENA_TEMPLATES, ARENA_TOPIC_IDS, buildDuel, buildFromTemplate, toPublic, type ArenaExercise,
} from '@/lib/game/arena/generators'
import { ARENA_MIX, ARENA_TOPICS, normalizeOutput } from '@/lib/game/arena/rules'
import { buildRoomExercises } from '@/lib/game/arena/team-server'

// Los ejercicios de la arena salen de plantillas con datos al azar. Acá se
// prueban muchas semillas de cada una: que estén bien armadas y, las de SQL,
// que su solución dé EXACTAMENTE la salida esperada en sql.js (el mismo motor
// que usa el navegador). Las de Python se prueban en el motor real en
// /demo/arena → "correr todas las soluciones".

const SEEDS = Array.from({ length: 25 }, (_, i) => 1000 + i * 7919)

let SQL: SqlJsStatic
beforeAll(async () => { SQL = await initSqlJs() })

/** Igual que lib/game/executor (runSQL + executeChallenge), sin navegador. */
function runSql(e: ArenaExercise, code: string): string {
  const db = new SQL.Database()
  try {
    if (e.seedSQL?.trim()) db.run(e.seedSQL)
    let last: { values: unknown[][] }[] = []
    for (const stmt of code.trim().split(';').map((s) => s.trim()).filter(Boolean)) {
      const res = db.exec(stmt)
      if (res.length > 0) last = res
    }
    if (last.length === 0 && e.verifySQL?.trim()) last = db.exec(e.verifySQL)
    if (last.length === 0) return ''
    return last[0].values.map((row) => row.map((v) => (v === null || v === undefined ? 'NULL' : String(v))).join('|')).join('\n')
  } finally {
    db.close()
  }
}

describe('plantillas', () => {
  it('hay al menos 2 plantillas por cada tema de la arena', () => {
    for (const topic of ARENA_TOPICS) {
      expect(ARENA_TEMPLATES.filter((t) => t.bossId === topic.id).length, topic.id).toBeGreaterThanOrEqual(2)
    }
  })

  for (const t of ARENA_TEMPLATES) {
    it(`${t.id}: bien armada con cualquier semilla`, () => {
      for (const seed of SEEDS) {
        const e = buildFromTemplate(t, seed)
        expect(e.title.length).toBeGreaterThan(0)
        expect(e.description.length).toBeGreaterThan(0)
        expect(e.expectedOutput.trim().length, `${e.id} sin salida esperada`).toBeGreaterThan(0)
        expect(e.initialCode, `${e.id}: el código inicial tiene que tener huecos`).toContain('___')
        expect(e.solution, `${e.id}: la solución quedó con huecos`).not.toContain('___')
        expect(e.type).toBe(t.type)
      }
    })

    if (t.type === 'sql') {
      it(`${t.id}: la solución da la salida esperada en sql.js`, () => {
        for (const seed of SEEDS) {
          const e = buildFromTemplate(t, seed)
          expect(normalizeOutput(runSql(e, e.solution)), e.id).toBe(normalizeOutput(e.expectedOutput))
          // Y con los huecos sin completar, NO tiene que dar la salida esperada.
          let blank = ''
          try { blank = runSql(e, e.initialCode) } catch { blank = '(error)' }
          expect(normalizeOutput(blank), `${e.id}: sale bien sin completar nada`).not.toBe(normalizeOutput(e.expectedOutput))
        }
      })
    }
  }

  it('la misma semilla da el mismo ejercicio (los dos rivales ven lo mismo)', () => {
    for (const t of ARENA_TEMPLATES) expect(buildFromTemplate(t, 42)).toEqual(buildFromTemplate(t, 42))
  })
})

describe('duelos', () => {
  const shared = ARENA_TOPICS.filter((b) => ARENA_TOPIC_IDS.has(b.id))

  it('1 vs 1: 3 ejercicios del tema elegido', () => {
    const duel = buildDuel('golem-infinito', shared, 7)
    expect(duel).toHaveLength(3)
    expect(duel.every((e) => e.bossId === 'golem-infinito')).toBe(true)
  })

  it('2 vs 2: 6 ejercicios', () => {
    expect(buildDuel('guardian-puerta', shared, 7, 6)).toHaveLength(6)
  })

  it('"de todo un poco" solo usa temas que vieron todos', () => {
    const few = shared.filter((b) => ['creeper-formulario', 'guardian-puerta'].includes(b.id))
    for (const seed of SEEDS) {
      for (const e of buildDuel(ARENA_MIX, few, seed, 6)) expect(['creeper-formulario', 'guardian-puerta']).toContain(e.bossId)
    }
  })

  it('al navegador no le llega ni la salida esperada ni la solución', () => {
    const pub = toPublic(buildDuel('oraculo-oscuro', shared, 3)[0]) as Record<string, unknown>
    expect(pub.expectedOutput).toBeUndefined()
    expect(pub.solution).toBeUndefined()
    expect(pub.initialCode).toBeTruthy()
  })
})

describe('sala 2 vs 2', () => {
  const shared = ARENA_TOPICS.filter((b) => ARENA_TOPIC_IDS.has(b.id))

  it('arma 9 ejercicios: 6 comunes + 3 más difíciles para el docente', () => {
    for (const seed of SEEDS.slice(0, 5)) {
      const ex = buildRoomExercises('golem-infinito', shared, seed)
      expect(ex).toHaveLength(9)
      expect(ex.slice(0, 6).every((e) => e.bossId === 'golem-infinito')).toBe(true)
      expect(ex.slice(6).every((e) => e.bossId === 'golem-infinito' && e.expectedOutput.trim().length > 0)).toBe(true)
      // Los del docente son desafíos TRAINEE de los jefes, no plantillas junior.
      expect(ex.slice(6).every((e) => e.id.includes('#docente'))).toBe(true)
    }
  })

  it('con "de todo un poco", los del docente son de los mismos temas', () => {
    const ex = buildRoomExercises(ARENA_MIX, shared, 99)
    const topics = new Set(ex.slice(0, 6).map((e) => e.bossId))
    expect(ex.slice(6).every((e) => topics.has(e.bossId))).toBe(true)
  })
})
