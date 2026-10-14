// El Pistolero: el docente en persona, en un evento sorpresa contra toda el aula.
// Acá viven los datos compartidos entre la Mesa (docente) y la vista del alumno:
// ataques, frases y números del evento. Sin React ni Supabase.

import type { PistoleroPose } from './pistolero-art'

// Personaje elegido por el docente (2026-10-13): El Bandido sin Nombre (la v3 de la vitrina).
export const PISTOLERO_NAME = 'El Pistolero'

// ─── Números del evento (PLAN-RAID.md §2.6 y §8) ─────────────────────────────

/** Aciertos que hacen falta por alumno conectado para bajarle toda la vida. */
export const PISTOLERO_HITS_PER_STUDENT = 2
/** Vida compartida del aula: cada ✘ resta esto. */
export const TEAM_HP_MAX = 100
export const TEAM_HP_PER_MISS = 4
/** Botín por alumno con al menos 1 ✔ (no entra en el tope diario). */
export const PISTOLERO_REWARD_DIAMONDS = 30
export const PISTOLERO_REWARD_XP = 20
/** Ítems del Mercader en el duelo (ver SHOP_CATALOG, «Para el equipo»). */
export const BANDERA_HEAL = 20
export const BENGALA_MS = 30_000
/** printName → lo que hace en el duelo (para el `>>> print(...)` del alumno). */
export const DUEL_ITEMS = ['bandera', 'chaleco', 'espuelas', 'bengala'] as const
export type DuelItem = (typeof DUEL_ITEMS)[number]

/** Si el aviso llega en medio de una batalla: «Voy en 1 minuto». */
export const SUMMON_GRACE_SECONDS = 60

export function pistoleroHpMax(students: number): number {
  return Math.max(4, students * PISTOLERO_HITS_PER_STUDENT)
}

// ─── Ataques (botones del docente) ───────────────────────────────────────────

export type AttackId = 'desenfundada' | 'rafaga' | 'polvareda' | 'ruleta' | 'recargar' | 'respeto'

export interface PistoleroAttack {
  id: AttackId
  name: string
  /** Lo que ve el docente en el botón. */
  hint: string
  /** Secuencia de poses que hace el personaje. */
  poses: PistoleroPose[]
  /** Efecto en pantalla de los alumnos. */
  fx: 'disparo' | 'rafaga' | 'polvo' | 'ruleta' | 'cura' | 'none'
  /** ¿Apunta a un alumno? (el docente elige o sale al azar) */
  targeted: boolean
  /** Daño a la vida del equipo. */
  teamDamage: number
  /** Segundos de efecto en el alumno (congelado, consigna tapada…). */
  seconds: number
  /** Usos máximos por evento (0 = sin límite). */
  maxUses: number
  /** Lo que dice al usarlo (se elige una). */
  lines: string[]
}

export const ATTACKS: PistoleroAttack[] = [
  {
    id: 'desenfundada', name: 'Desenfundada rápida', hint: 'Congela el editor de un alumno 8 s',
    poses: ['desenfundar', 'disparo'], fx: 'disparo', targeted: true, teamDamage: 0, seconds: 8, maxUses: 0,
    lines: ['¡QUIETO AHÍ, FORASTERO!', 'Más rápido que un print(), compañero. Ese teclado se queda tieso un rato.', 'Clic, clac... ¡BANG! Dedos quietos.', 'Yo desenfundo. Vos esperás. Así funciona el desierto.']
  },
  {
    id: 'rafaga', name: 'Ráfaga del tambor', hint: 'Seis tiros: le saca vida al equipo',
    poses: ['desenfundar', 'disparo', 'disparo', 'disparo', 'disparo', 'disparo', 'disparo'], fx: 'rafaga', targeted: false, teamDamage: 12, seconds: 0, maxUses: 3,
    lines: ['¡A CUBRIRSE, PUEBLO!', '¡SEIS BALAS, SEIS ERRORES DE SINTAXIS!', 'Bang, bang, bang... cuenten los agujeros, que yo ya perdí la cuenta.']
  },
  {
    id: 'polvareda', name: 'Polvareda', hint: 'Tapa las consignas de todos 8 s',
    poses: ['saludo'], fx: 'polvo', targeted: false, teamDamage: 0, seconds: 8, maxUses: 3,
    lines: ['Se levanta el viento del desierto... a ver si leen con tierra en los ojos.', 'Fffshhh. Polvo en la consigna, polvo en las botas, polvo en todo.', '¡QUE SOPLE EL VIENTO!']
  },
  {
    id: 'ruleta', name: 'Ruleta del tambor', hint: 'Cambia el ejercicio de un alumno',
    poses: ['tambor'], fx: 'ruleta', targeted: true, teamDamage: 0, seconds: 0, maxUses: 0,
    lines: ['Gira el tambor, gira la suerte... te toca otro ejercicio.', 'Ese era muy fácil para vos. Tomá este, a ver qué cara ponés.', '¡RULETA DEL DESIERTO!']
  },
  {
    id: 'recargar', name: 'Recargar', hint: 'El Pistolero se cura 10 %',
    poses: ['recarga'], fx: 'cura', targeted: false, teamDamage: 0, seconds: 0, maxUses: 2,
    lines: ['Una, dos, tres... seis balas nuevitas. ¿Y ustedes qué cargaron?', 'Recargando. No se duerman, que el sol no espera.', 'Clic. Clic. Clic. Listo, sigamos bailando.']
  },
  {
    id: 'respeto', name: 'Gesto de respeto', hint: 'Festeja un buen acierto (sin efecto)',
    poses: ['saludo'], fx: 'none', targeted: true, teamDamage: 0, seconds: 0, maxUses: 0,
    lines: ['Me saco el sombrero, compañero. Eso fue código del bueno.', 'Hmpf. Buen tiro. No te acostumbres.', 'En cuarenta años de desierto vi pocos así. Vos sos uno.']
  },
]

export const ATTACK_BY_ID = Object.fromEntries(ATTACKS.map((a) => [a.id, a])) as Record<AttackId, PistoleroAttack>

// ─── Frases ──────────────────────────────────────────────────────────────────

// Las frases en MAYÚSCULAS son gritos: caen de golpe (ver PistoleroSay).
// El punto final de cada frase es un disparo. Habla como un viejo pistolero
// rioplatense: seco, burlón, con respeto por quien le gana.
export const PISTOLERO_LINES = {
  /** Al aparecer (aviso sorpresa). */
  intro: [
    'Bueno, bueno... ¿así que este es el famoso pueblo de los programadores?',
    'Me contaron que acá nadie le tiene miedo a un SyntaxError. Ni a un NameError. Ya vamos a ver.',
    '¡DESENFUNDEN LOS TECLADOS!',
    'Tengo un ejercicio con el nombre de cada uno. El primero que pestañea, pierde.',
  ],
  /** Cuando recibe un acierto. */
  hurt: [
    '¡AY! ¡ESO PASÓ RASPANDO EL SOMBRERO!',
    'Mirá vos... el forastero sabe lo que hace.',
    'Hmpf. Suerte de principiante.',
    '¡CARAMBA! Ese código salió derechito.',
    'Me dolió en el orgullo. Y en el bigote.',
  ],
  /** Cuando alguien falla. */
  miss: [
    'Je. Erraste el tiro, compañero.',
    'Esa salida no la reconoce ni mi caballo.',
    'Revisá la mira y probá otra vez. El desierto es largo.',
    '¡FALLASTE! Pero acá siempre hay revancha.',
    '¿Y los dos puntos del if, forastero? Hasta mi caballo los pone.',
    '¡INDENTATIONERROR! Esa sangría está más torcida que mi bigote.',
    'Print con mayúscula... Python no te conoce, compañero.',
    'Abriste comillas y te fuiste a dormir. Cerralas, que entra arena.',
    'Un paréntesis sin cerrar es como una puerta de saloon abierta: entra cualquiera.',
  ],
  /** Al perder: se retira hacia el atardecer. */
  defeat: [
    'Bueno... me ganaron limpio. Y eso que lustré el revólver.',
    'Pero escúchenme bien, pueblo:',
    '¡VOY A VOLVER CON UN RETO NUEVO!',
    'Mientras tanto... disfruten el botín. Se lo ganaron.',
  ],
  /** Si gana él (vida del equipo en 0 o «Se acabó el tiempo»). */
  victory: [
    'Se acabó el tiempo, forasteros.',
    'Hoy el desierto es mío... aunque vi tiros que me hicieron sudar el bigote.',
    '¡PRACTIQUEN!',
    'La próxima desenfundo más rápido. Avisados están.',
  ],
}

export function pickLine(lines: string[], seed = Math.random()): string {
  return lines[Math.floor(seed * lines.length) % lines.length]
}
