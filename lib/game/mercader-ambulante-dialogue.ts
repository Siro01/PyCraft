// Diálogos de El Mercader Ambulante — hermano amigable del Mercader del
// Abismo. Mismo patrón que mercader-dialogue.ts (pools de líneas, una función
// que elige), pero acá el diálogo se arma en 2 partes que se muestran juntas:
// 1) una felicitación por el jefe recién derrotado (puede nombrarlo),
// 2) un guiño sobre el hermano, que cambia según si el alumno ya lo enfrentó.

/** Felicitaciones genéricas — no siempre hay nombre de jefe a mano (por
 *  ejemplo en el laboratorio de prueba), así que tienen que sonar bien solas. */
const FELICITACION_GENERICA = [
  '¡Ahí está! Otro jefe menos en el camino.',
  'Te estaba esperando. Se nota que venís ganando.',
  '¡Uh! Con razón brillabas distinto al llegar — acabás de ganar una batalla.',
  'Cada jefe que caes me deja una historia mejor para contar.',
]

/** Felicitaciones con el nombre del jefe recién derrotado — más personales. */
const FELICITACION_CON_NOMBRE = (bossName: string) => [
  `¡Derrotaste a ${bossName}! Contame todo, no te guardes nada.`,
  `Me llegó el eco hasta aquí: ${bossName} ya no te puede parar.`,
  `${bossName}... uf. Y lo venciste. Eso se festeja.`,
]

/** Sobre el hermano — el alumno TODAVÍA NO enfrentó al Mercader del Abismo
 *  (jefe #4): el Ambulante da pistas, sin asustar. */
const SOBRE_HERMANO_ANTES = [
  '¿Ya conociste a mi hermano, el del Abismo? No... Se nota. Todavía sonreís.',
  'Mi hermano vende lo mismo que yo — pero con mucha menos sonrisa y mucho más drama.',
  'Cuando lo encuentres, decile que le mandé un saludo. Capaz ni te contesta.',
]

/** El alumno YA enfrentó al Mercader del Abismo (esté derrotado o no). */
const SOBRE_HERMANO_DESPUES = [
  '¿Ya conociste a mi hermano? Ajá... se te nota en la cara. Es intenso, ¿no?',
  'El Abismo es mi hermano, sí. Yo elegí vender con una sonrisa; él eligió las capuchas y el drama.',
  'No le digas que dije esto, pero en el fondo es más blando de lo que aparenta. Un poquito.',
  'Familia rara, la nuestra. Yo brillo de día, él negocia en la sombra. Cada uno con lo suyo.',
]

/** Primera vez que aparece — se presenta, sin repetirse en visitas siguientes. */
const PRESENTACION = [
  'Hola, hola! Soy el Mercader Ambulante — vengo, dejo algo bueno, y me voy antes de aburrir.',
  'No tengo tienda fija: aparezco cada tanto, cuando venís ganando batallas.',
  'Tengo amuletos — se usan una sola vez, pero en el momento justo valen oro.',
]

export interface AmbulanteDialogue {
  /** Línea(s) de felicitación por el jefe recién derrotado. */
  felicitacion: string[]
  /** Línea sobre el hermano — solo a partir de la 2ª visita, para no saturar la primera. */
  sobreHermano?: string
}

/**
 * Arma el diálogo de una aparición:
 * - `bossName`: nombre del jefe recién derrotado, si se conoce (personaliza la felicitación).
 * - `firstVisit`: primera vez que aparece — antepone la presentación.
 * - `abismoEncountered`: el alumno ya llegó al jefe #4 (habilitado o derrotado), `undefined` si no se sabe (modo nube sin ese dato a mano).
 */
export function buildAmbulanteDialogue(opts: {
  bossName?: string
  firstVisit?: boolean
  abismoEncountered?: boolean
}): AmbulanteDialogue {
  const { bossName, firstVisit, abismoEncountered } = opts

  const felicitacionPool = bossName ? FELICITACION_CON_NOMBRE(bossName) : FELICITACION_GENERICA
  const felicitacionLine = felicitacionPool[Math.floor(Math.random() * felicitacionPool.length)]
  const felicitacion = firstVisit ? [...PRESENTACION, felicitacionLine] : [felicitacionLine]

  if (firstVisit) return { felicitacion }

  const hermanoPool = abismoEncountered === false ? SOBRE_HERMANO_ANTES : SOBRE_HERMANO_DESPUES
  const sobreHermano = hermanoPool[Math.floor(Math.random() * hermanoPool.length)]
  return { felicitacion, sobreHermano }
}
