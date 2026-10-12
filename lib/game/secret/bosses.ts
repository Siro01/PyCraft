// Jefes secretos: uno por acto, escondidos al final de un camino que nace en el
// cofre secreto de ese acto (y que recién se puede pisar después de abrirlo).
//
// Reglas (pedido del docente):
// - Mucha más vida que un jefe normal, y SIEMPRE hay barra de vida del alumno
//   (sin importar el nivel junior/trainee/senior).
// - Si el alumno pierde, pierde LOSS_PENALTY diamantes. Huir también cuesta lo
//   mismo; solo la Capa de Escape saca gratis.
// - La serie de 5 ejercicios sale de los jefes que el alumno YA derrotó: cuantos
//   más derrotó, más temas mezcla y más ejercicios senior entran.
// - Lugar sin ayuda: sin Rodolfo, sin apuntes, sin errores traducidos ni salida
//   esperada. Lo único que ayuda son los ítems y amuletos.

import type { Boss, Challenge, ChallengeTier } from '@/types'
import { BOSSES } from '@/lib/game/bosses'
import { CHALLENGES } from '@/lib/game/challenges'
import type { SecretArtId } from './art'

export const SECRET_SERIES_LEN = 5
export const SECRET_PLAYER_HP = 100
/** Vida que saca cada respuesta incorrecta (o error de ejecución). */
export const SECRET_WRONG_DAMAGE = 20
/** Cada fallo el jefe se cura este % de su vida máxima (el Trébol puede frenarlo). */
export const SECRET_HEAL_RATIO = 0.05
export const SECRET_LOSS_PENALTY = 5
/** Premio de la primera victoria contra cada jefe secreto. */
export const SECRET_WIN_REWARD = 25
/** Corona Oxidada frente al Errante: arranca con este % de vida. */
export const CROWN_START_RATIO = 0.75

export type SecretAct = 'python' | 'sql' | 'mixed' | 'final'

export interface SecretBoss {
  id: string
  art: SecretArtId
  act: SecretAct
  name: string
  /** Rótulo corto en mayúsculas para la barra (estilo BOSS-01). */
  title: string
  epithet: string
  hpMax: number
  /** Jefes normales derrotados que hacen falta para que se abra la grieta. */
  minDefeated: number
  /** Color del fósforo (siempre sobre negro). */
  color: string
  /** Lo que dice antes de pelear (se tipea letra por letra, sin ventana). */
  intro: string[]
  win: string[]
  lose: string[]
  /** Lo que dice Rodolfo si la grieta todavía está sellada ({n} = jefes que faltan). */
  sealed: string
  /** Objeto de historia que este jefe reconoce (ver hasKeyItem en perk-effects). */
  keyItem?: {
    id: 'item-corona' | 'item-esmeraldas'
    lines: string[]
    /** 'crown' = arranca con menos vida · 'deal' = se traga las esmeraldas y regala el primer ejercicio. */
    effect: 'crown' | 'deal'
  }
}

export const SECRET_BOSSES: SecretBoss[] = [
  {
    id: 'secreto-errante',
    art: 'errante',
    act: 'python',
    name: 'El Errante',
    title: 'PROCESO-HUERFANO',
    epithet: 'Un proceso que nadie cerró',
    hpMax: 600,
    minDefeated: 4,
    color: '#C9FFD9',
    intro: [
      'Alguien me ejecutó hace mucho... y se olvidó de mí.',
      'Desde entonces camino este bosque sin terminar nunca.',
      'Mostrame qué aprendiste. Sin ayuda.',
    ],
    win: ['Por fin... alguien me cerró.', 'Return 0.'],
    lose: ['Volvé cuando tu código no tiemble.'],
    sealed: 'Ahí abajo hay algo que camina y no termina nunca. Yo no entro ni loco. Volvé cuando hayas derrotado {n} jefes más.',
    keyItem: {
      id: 'item-corona',
      effect: 'crown',
      lines: ['Esa corona oxidada...', 'Era mía, de cuando este bosque tenía rey.', 'Me pesa verla. Te va a costar menos.'],
    },
  },
  {
    id: 'secreto-polilla',
    art: 'polilla',
    act: 'sql',
    name: 'La Polilla',
    title: 'EL-PRIMER-BUG',
    epithet: 'Relé 70, panel F, 1947',
    hpMax: 750,
    minDefeated: 8,
    color: '#FFDDA6',
    intro: [
      'En 1947 me encontraron atrapada en el relé 70 de una computadora enorme.',
      'Me pegaron en un cuaderno y escribieron: "primer bug encontrado".',
      'Desde entonces, a cada error le ponen mi nombre. Veamos los tuyos.',
    ],
    win: ['Bug... corregido.', 'Anotalo en tu cuaderno.'],
    lose: ['Otro bug para la colección.'],
    sealed: 'Algo aletea en el agua profunda. Ni el faro lo alumbra. Volvé cuando hayas derrotado {n} jefes más.',
  },
  {
    id: 'secreto-ouroboros',
    art: 'ouroboros',
    act: 'mixed',
    name: 'El Ouroboros',
    title: 'WHILE-TRUE',
    epithet: 'El bucle que se muerde la cola',
    hpMax: 900,
    minDefeated: 11,
    color: '#FFB8C6',
    intro: [
      'Empiezo donde termino. Termino donde empiezo.',
      'Nadie escribió el break.',
      'Cada vez que fallás, vuelvo a crecer.',
    ],
    win: ['break.', '...gracias.'],
    lose: ['Y otra vuelta. Y otra. Y otra.'],
    sealed: 'Detrás de la tienda hay una vuelta que no termina nunca. Volvé cuando hayas derrotado {n} jefes más.',
    keyItem: {
      id: 'item-esmeraldas',
      effect: 'deal',
      lines: ['Esmeraldas... brillan como un if que da True.', 'Dámelas y me trago tu primer ejercicio.'],
    },
  },
  {
    id: 'secreto-vigia',
    art: 'vigia',
    act: 'final',
    name: 'El Vigía',
    title: 'DAEMON',
    epithet: 'while 1: vigila()',
    hpMax: 1200,
    minDefeated: 14,
    color: '#E4DAFF',
    intro: [
      'El Arquitecto me dejó corriendo en el fondo. Para vigilar.',
      'Te vi en cada jefe. En cada error. En cada intento.',
      'Ahora quiero verte sin nadie que te ayude.',
    ],
    win: ['Proceso detenido.', 'Ya no hace falta que nadie vigile.'],
    lose: ['Te sigo mirando.'],
    sealed: 'Ese archivo no figura en ningún lado. Algo te está mirando desde ahí. Volvé cuando hayas derrotado {n} jefes más.',
  },
]

export function getSecretBoss(id: string): SecretBoss | undefined {
  return SECRET_BOSSES.find((b) => b.id === id)
}

export function secretForAct(act: string): SecretBoss | undefined {
  return SECRET_BOSSES.find((b) => b.act === act)
}

/** Daño de un acierto: la serie de 5 alcanza justo si no hubo curaciones. */
export function secretHitDamage(boss: SecretBoss): number {
  return Math.ceil(boss.hpMax / SECRET_SERIES_LEN)
}

/** Un jefe secreto como `Boss` (lo piden los ítems y el editor). */
export function secretAsBoss(s: SecretBoss): Boss {
  return {
    id: s.id, classNumber: 0, name: s.name, title: s.title, topic: s.epithet,
    type: 'final', hpMax: s.hpMax, color: s.color, description: s.epithet,
  }
}

/**
 * Escalera de dificultad según cuántos jefes derrotó: al principio de la serie
 * entra algún trainee; con más jefes vencidos, casi todo es senior.
 */
export function seriesTiers(defeatedCount: number): ChallengeTier[] {
  if (defeatedCount < 6) return ['trainee', 'trainee', 'trainee', 'senior', 'senior']
  if (defeatedCount < 10) return ['trainee', 'trainee', 'senior', 'senior', 'senior']
  return ['trainee', 'senior', 'senior', 'senior', 'senior']
}

/** RNG chico con semilla: la misma partida guardada arma siempre la misma serie. */
export function seededRng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Arma la serie con los jefes derrotados: reparte los 5 lugares a lo largo de
 * la lista (del primer tema al último, así la serie va de menos a más), y en
 * cada lugar elige un ejercicio del nivel que toca. Si derrotó menos de 5, los
 * temas se repiten con ejercicios distintos.
 */
export function buildSecretSeries(defeatedIds: Iterable<string>, rng: () => number, extra = 0): Challenge[] {
  const done = new Set(defeatedIds)
  const pool = BOSSES.filter((b) => done.has(b.id)).sort((a, b) => a.classNumber - b.classNumber)
  const source = pool.length ? pool : BOSSES.slice(0, 1)
  const tiers = seriesTiers(pool.length)
  const used = new Set<string>()
  const out: Challenge[] = []
  const total = SECRET_SERIES_LEN + extra

  for (let k = 0; k < total; k++) {
    const slot = Math.min(k, SECRET_SERIES_LEN - 1)
    // Lugares extra (remates por curaciones): temas al azar, siempre senior.
    const boss = k < SECRET_SERIES_LEN
      ? source[Math.round((slot * (source.length - 1)) / (SECRET_SERIES_LEN - 1))]
      : source[Math.floor(rng() * source.length)]
    const tier: ChallengeTier = k < SECRET_SERIES_LEN ? tiers[slot] : 'senior'
    const order: ChallengeTier[] = tier === 'senior' ? ['senior', 'trainee', 'junior'] : ['trainee', 'senior', 'junior']
    let pick: Challenge | undefined
    for (const tr of order) {
      const options = CHALLENGES.filter((c) => c.bossId === boss.id && c.tier === tr && !used.has(c.id))
      if (options.length) { pick = options[Math.floor(rng() * options.length)]; break }
    }
    if (!pick) {
      const any = CHALLENGES.filter((c) => !used.has(c.id) && done.has(c.bossId) && c.tier !== 'junior')
      pick = any[Math.floor(rng() * any.length)]
    }
    if (!pick) break
    used.add(pick.id)
    out.push(pick)
  }
  return out
}

/** Un ejercicio más para rematar (después de que el jefe se curó). */
export function nextRemate(defeatedIds: Iterable<string>, seed: number, current: Challenge[]): Challenge | undefined {
  const series = buildSecretSeries(defeatedIds, seededRng(seed), current.length - SECRET_SERIES_LEN + 1)
  const have = new Set(current.map((c) => c.id))
  return series.slice(SECRET_SERIES_LEN).find((c) => !have.has(c.id))
    ?? CHALLENGES.find((c) => !have.has(c.id) && new Set(defeatedIds).has(c.bossId) && c.tier === 'senior')
}
