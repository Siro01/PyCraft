// Stickers de cofre — no se compran: se encuentran explorando el mapa.
//
// Cada acto tiene dos cofres: uno a la vista (al final de un sendero punteado)
// y uno SECRETO, en la punta de un camino que no está dibujado y que aparece
// recién cuando el alumno lo pisa con las flechas. El cofre visible siempre
// deja una pista de dónde está el secreto, así la búsqueda tiene un hilo.
//
// Adentro hay un sticker especial: vive en el inventario (solapa Stickers),
// se pega con ✦ Decorar como cualquier otro, y además REACCIONA cuando el
// alumno lo toca — animación, partículas y un globito con frases del lore de
// PyCraft. Si insiste, cada uno suelta una frase secreta.

import type { ShopItem } from '@/types'

export type ChestKind = 'cofre' | 'secreto' | 'botin'
export type ChestAct = 'python' | 'sql' | 'mixed' | 'final' | 'raid'
/** Cómo reacciona al toque (clase cs-poke--*, sonido y partículas). */
export type PokeFx = 'hiss' | 'bounce' | 'uncork' | 'vanish' | 'wobble' | 'snap' | 'glitch' | 'purr'

export interface StickerStage {
  /** Desde cuántos toques (acumulados, para siempre) rige esta etapa. */
  from: number
  sprite: string
  /** Cuadro mientras reacciona; sin él, se mueve el mismo dibujo. */
  poke?: string
  lines: string[]
}

export interface ChestSticker {
  /** Id del ítem (vive en el mismo registro de compras que la tienda, con precio 0). */
  id: string
  name: string
  description: string
  act: ChestAct
  kind: ChestKind
  fx: PokeFx
  voice: 'machine' | 'cat'
  stages: StickerStage[]
  /** Frase secreta: sale al toque número `after` (y de ahí en adelante, de vez en cuando). */
  secret: { after: number; line: string }
  /** Lo que se lee al abrir el cofre. */
  found: string
  /** Pista hacia el cofre secreto del acto (solo los cofres visibles). */
  hint?: string
  /** El cofre no se abre hasta derrotar a este jefe (el secreto del Acto IV es spoiler del final). */
  sealedUntil?: string
  sealedText?: string
}

export const ACT_LABEL: Record<ChestAct, string> = { python: 'Acto I', sql: 'Acto II', mixed: 'Acto III', final: 'Acto IV', raid: 'El Pistolero' }

export const CHEST_STICKERS: ChestSticker[] = [
  // ── ACTO I · Python ────────────────────────────────────────────────────────
  {
    id: 'sticker-cofre-py',
    name: 'Serpiente Py',
    description: 'Vivía enroscada en un cofre del bosque. Le gusta que le hablen en Python.',
    act: 'python', kind: 'cofre', fx: 'hiss', voice: 'cat',
    stages: [{
      from: 0, sprite: 'cs-py', poke: 'cs-py-poke',
      lines: [
        'Sss... ¡hola! Me llamo Py. Encantada.',
        'Python se llama así por unos cómicos ingleses, no por mí. Sss... qué injusticia.',
        'Indentá bien tu código, que si no me enredo.',
        'Si no sabés qué pasa, imprimilo: print() es tu linterna.',
      ],
    }],
    secret: { after: 8, line: 'Sss... secreto: el Golem Infinito le tiene miedo a una sola palabra. Empieza con b y termina con k.' },
    found: 'Un cofre escondido al fondo del sendero. Adentro, enroscada, una serpientita te mira.',
    hint: 'Py te susurra: «en el bosque del sureste algo salta y nunca para... el camino nace justo abajo del último jefe».',
  },
  {
    id: 'sticker-secreto-slime',
    name: 'Slime while True',
    description: 'Quedó atrapado en un bucle infinito adentro de un cofre secreto. Salta. Y salta. Y salta.',
    act: 'python', kind: 'secreto', fx: 'bounce', voice: 'cat',
    stages: [
      {
        from: 0, sprite: 'cs-slime', poke: 'cs-slime-poke',
        lines: [
          'while True: salto()',
          '¡No puedo parar! ¡Alguien se olvidó el break!',
          'Salto número... perdí la cuenta. ¿Vos la llevás?',
          'Dicen que a los diez toques se rompe el bucle. ¡Dale!',
        ],
      },
      {
        from: 10, sprite: 'cs-slime-calm', poke: 'cs-slime-poke',
        lines: [
          'Ahora salto solo cuando yo quiero. Qué lindo es el break.',
          'for salto in range(1): ¡hop! Listo, uno y basta.',
          'Si ves un bucle sin salida, acordate de mí.',
        ],
      },
    ],
    secret: { after: 10, line: 'break. ...¡BREAK! ¡Por fin! Gracias. Me quedo quietito un rato.' },
    found: '¡Un camino que no estaba en el mapa! Al final, un slime rebota sin parar adentro del cofre.',
  },

  // ── ACTO II · SQLite ───────────────────────────────────────────────────────
  {
    id: 'sticker-cofre-botella',
    name: 'Botella al mar',
    description: 'Llegó flotando al archipiélago. Cada vez que la destapás sale un mensaje distinto.',
    act: 'sql', kind: 'cofre', fx: 'uncork', voice: 'machine',
    stages: [{
      from: 0, sprite: 'cs-botella', poke: 'cs-botella-poke',
      lines: [
        '«SOS: hice DELETE FROM islas sin WHERE. Se borró el archipiélago entero.»',
        '«Si alguien encuentra esto: SELECT * FROM ayuda;»',
        '«Día 12. Le puse PRIMARY KEY a cada coco. Ninguno se repite.»',
        '«Una tabla sin nombre es como una isla sin mapa.»',
      ],
    }],
    secret: { after: 7, line: '«P.D.: el Archivista guarda una copia de todo. Hasta de esta botella.»' },
    found: 'Un cofre flotando entre las olas. Adentro, una botella con un papel enrollado.',
    hint: 'Abajo de todo, en letra chiquita: «al sur de la isla grande, debajo del segundo jefe, el agua esconde algo que nadie encuentra con = »',
  },
  {
    id: 'sticker-secreto-null',
    name: 'Kraken NULL',
    description: 'No es cero. No es vacío. Es NULL. Vive en el fondo del mar de datos, donde nadie mira.',
    act: 'sql', kind: 'secreto', fx: 'vanish', voice: 'machine',
    stages: [{
      from: 0, sprite: 'cs-null', poke: 'cs-null-poke',
      lines: [
        'No soy cero. No soy vacío. Soy NULL.',
        '¿Me buscaste con = NULL? Así nunca me vas a encontrar.',
        'Vivo en las celdas que nadie llenó.',
        'Blub... ¿Me ves? ¿O no me ves? Ni yo sé.',
      ],
    }],
    secret: { after: 7, line: 'WHERE kraken IS NULL... ¡Acá estoy! Gracias por buscarme bien.' },
    found: '¡Un camino bajo el agua! En el cofre no hay... nada. ¿Nada? Algo se mueve en la nada.',
  },

  // ── ACTO III · Integración ─────────────────────────────────────────────────
  {
    id: 'sticker-cofre-huevo',
    name: 'Huevo de Dragón',
    description: 'Está tibio. Dicen que si lo cuidás —o sea, si lo tocás mucho— algo nace.',
    act: 'mixed', kind: 'cofre', fx: 'wobble', voice: 'cat',
    stages: [
      {
        from: 0, sprite: 'cs-huevo',
        lines: ['*toc toc*', 'Está tibio. Muy tibio.', 'Algo se mueve adentro...'],
      },
      {
        from: 5, sprite: 'cs-huevo-crack',
        lines: ['¡Crac! Se le hizo una rajita.', 'Adentro alguien hace pío.', 'Falta poquito. ¡Seguí!'],
      },
      {
        from: 10, sprite: 'cs-huevo-dragon', poke: 'cs-huevo-dragon-poke',
        lines: [
          '¡Pío! (En dragón quiere decir «hola».)',
          'Cuando sea grande voy a ser rojo como el jefe 13.',
          'Todavía no escupo fuego. Escupo chispitas.',
        ],
      },
    ],
    secret: { after: 15, line: 'Mi tía es el Dragón Rojo. Dice que sos de los pocos que la hicieron transpirar.' },
    found: 'Un cofre en la orilla del lago. Adentro, envuelto en ceniza tibia, un huevo.',
    hint: 'Pegada en la tapa, una nota: «pasando la tienda, en el bosque del sureste, espera un eslabón suelto. Bajá desde la tienda».',
  },
  {
    id: 'sticker-secreto-nexo',
    name: 'Eslabón del Nexo',
    description: 'Dos eslabones: uno de Python y otro de SQL. Tocalos y se conectan.',
    act: 'mixed', kind: 'secreto', fx: 'snap', voice: 'machine',
    stages: [{
      from: 0, sprite: 'cs-nexo', poke: 'cs-nexo-poke',
      lines: [
        'import sqlite3 — así me presento.',
        "conn = sqlite3.connect('mundo.db') — y el puente queda armado.",
        'Python de un lado, SQL del otro. Yo soy lo que los une.',
        'Sin conn.commit(), lo que guardaste se lo lleva el río.',
      ],
    }],
    secret: { after: 8, line: 'El Nexo era un puente antes de ser jefe. Algunos días todavía lo extraña.' },
    found: 'Un camino escondido entre los árboles. En el cofre, dos eslabones que quieren estar juntos.',
  },

  // ── ACTO IV · El Arquitecto ────────────────────────────────────────────────
  {
    id: 'sticker-cofre-ojo',
    name: 'Ojo del Arquitecto',
    description: 'Salió de un cofre corrupto. Parpadea. Te sigue. Nadie sabe de quién es.',
    act: 'final', kind: 'cofre', fx: 'glitch', voice: 'machine',
    stages: [{
      from: 0, sprite: 'cs-ojo', poke: 'cs-ojo-poke',
      lines: [
        'T3 V30. S13MPR3 T3 V1.',
        '¿Quién te dio permiso para abrir este cofre?',
        '01001000 01001111 01001100 01000001',
        'ERROR 0x0E: demasiada curiosidad detectada.',
      ],
    }],
    secret: { after: 9, line: '...en realidad no doy tanto miedo. Pero no se lo digas a nadie.' },
    found: 'Un cofre corrupto. Al abrirlo, algo adentro parpadea... y te mira.',
    hint: 'Entre la basura, un comentario: «# en la esquina de arriba del sistema hay un archivo que no figura en ningún lado».',
  },
  {
    id: 'sticker-secreto-gato',
    name: 'El Gato',
    description: 'Estaba en un archivo que no figura en ningún lado. Ronronea cuando tu código anda.',
    act: 'final', kind: 'secreto', fx: 'purr', voice: 'cat',
    stages: [{
      from: 0, sprite: 'cs-gato', poke: 'cs-gato-poke',
      lines: [
        'Miau. (Traducción: estoy orgulloso de vos.)',
        "print('miau')",
        'Los trece jefes eran mis ayudantes. No les cuentes que te dije.',
        'Purrrr... me gusta cuando tu código anda a la primera.',
      ],
    }],
    secret: { after: 7, line: 'Tengo siete vidas. Una la usé para enseñarte a programar. Valió la pena.' },
    found: 'Un archivo que no figura en ningún lado. Adentro, alguien ronronea.',
    sealedUntil: 'el-arquitecto',
    sealedText: 'Este cofre tiene un candado que no es de este mundo. Dicen que se abre cuando el Arquitecto deje de vigilar.',
  },
]

// ── Botín de raids: no están en cofres ni se venden; se ganan peleando en equipo ──
// «SE BUSCA»: lo recibe quien acertó al menos una vez en un duelo que el aula
// le ganó al Pistolero. Es numerado: el número son las veces que lo lograste
// (raid_ledger, motivo 'pistolero'). Lo entrega lib/storage/cloud-sync.ts.
export const SE_BUSCA_ID = 'sticker-raid-sebusca'

export const RAID_STICKERS: ChestSticker[] = [
  {
    id: SE_BUSCA_ID,
    name: 'SE BUSCA',
    description: 'El cartel del Pistolero, arrancado de la pared del saloon el día que tu aula le ganó. Tiene tu número.',
    act: 'raid', kind: 'botin', fx: 'wobble', voice: 'machine',
    stages: [
      {
        from: 0, sprite: 'cs-sebusca', poke: 'cs-sebusca-poke',
        lines: [
          'SE BUSCA. Recompensa: respeto. Mucho respeto.',
          'Ese bigote no es mío. Es del dibujante.',
          'No me toques tanto el cartel, forastero. Se arruga.',
          'Volveré. Siempre vuelvo. Está en el contrato.',
          '¿Practicaste? Porque yo sí.',
        ],
      },
      {
        from: 12, sprite: 'cs-sebusca-sello', poke: 'cs-sebusca-poke',
        lines: [
          '¿Un sello de DERROTADO? Qué humillación.',
          'Lo pegaste en tu escritorio, ¿no? Típico.',
          'Disfrutá el botín. Mientras dure.',
        ],
      },
    ],
    secret: { after: 25, line: 'Dicen que de día enseña programación. Yo no sé nada. Yo no dije nada.' },
    found: 'Arrancaste el cartel del Pistolero de la pared del saloon.',
  },
  // Raids contra los jefes secretos: el equipo que vence a uno se lleva su sticker
  // (cada integrante en pie). Lo entrega lib/storage/cloud-sync.ts.
  {
    id: 'sticker-raid-errante',
    name: 'Espada del Errante',
    description: 'El Errante la clavó en el suelo y se fue caminando. Dijo que ya no la necesitaba: había encontrado compañía.',
    act: 'raid', kind: 'botin', fx: 'snap', voice: 'machine',
    stages: [{
      from: 0, sprite: 'cs-raid-errante', poke: 'cs-raid-errante-poke',
      lines: [
        'Caminé solo mucho tiempo. Ustedes no.',
        'Un for recorre. Un equipo llega.',
        'La hoja sigue afilada. Como tu código, espero.',
      ],
    }],
    secret: { after: 15, line: 'Antes de errar, fui el primer programa de alguien. Imprimía «hola». Nada más.' },
    found: 'La espada del Errante, clavada en la tierra.',
  },
  {
    id: 'sticker-raid-polilla',
    name: 'La Polilla del Cuaderno',
    description: 'Pegada con cinta en una bitácora, como la primera polilla de la historia que trabó una computadora.',
    act: 'raid', kind: 'botin', fx: 'vanish', voice: 'machine',
    stages: [{
      from: 0, sprite: 'cs-raid-polilla', poke: 'cs-raid-polilla-poke',
      lines: [
        '1947. Relé número 70. Ahí empezó todo.',
        'Me pegaron con cinta. Qué falta de respeto.',
        'Un WHERE mal puesto es un bicho. Revisalo.',
      ],
    }],
    secret: { after: 15, line: 'Grace Hopper anotó: «primer caso real de un bug encontrado». Ese bug era yo.' },
    found: 'La polilla, pegada con cinta en la bitácora.',
  },
  {
    id: 'sticker-raid-ouroboros',
    name: 'Anillo del Ouroboros',
    description: 'La serpiente que se muerde la cola, hecha anillo. Si la mirás mucho, sentís que el bucle no termina.',
    act: 'raid', kind: 'botin', fx: 'hiss', voice: 'cat',
    stages: [{
      from: 0, sprite: 'cs-raid-ouroboros', poke: 'cs-raid-ouroboros-poke',
      lines: [
        'while True: me muerdo la cola.',
        'Ustedes encontraron el break. Juntos.',
        'Sss... cada vuelta es igual. Salvo esta.',
      ],
    }],
    secret: { after: 15, line: 'El truco nunca fue el break. Era tener a alguien que te avise que estás dando vueltas.' },
    found: 'El Ouroboros se enroscó en un anillo y se quedó quieto.',
  },
  {
    id: 'sticker-raid-vigia',
    name: 'Ojo del Vigía',
    description: 'El Vigía nunca duerme. Ahora vigila tu escritorio. Parpadea cuando lo tocás.',
    act: 'raid', kind: 'botin', fx: 'glitch', voice: 'machine',
    stages: [{
      from: 0, sprite: 'cs-raid-vigia', poke: 'cs-raid-vigia-poke',
      lines: [
        'Proceso en segundo plano: mirarte.',
        'Vi todo tu código. Todo. Hasta los comentarios.',
        'Un daemon no descansa. Pero puede perder.',
      ],
    }],
    secret: { after: 15, line: 'Tengo un solo log guardado: la vez que me ganaron en equipo.' },
    found: 'El ojo del Vigía se cerró. Y después se volvió a abrir, mirándote.',
  },
]

/** El sticker de raid de un jefe secreto (`secreto-errante` → `sticker-raid-errante`). */
export function raidStickerFor(bossId: string): string {
  return `sticker-raid-${bossId.replace(/^secreto-/, '')}`
}

const BY_ID = new Map([...CHEST_STICKERS, ...RAID_STICKERS].map((s) => [s.id, s]))

export function getChestSticker(id: string): ChestSticker | undefined {
  return BY_ID.get(id)
}

/** La etapa que rige con estos toques acumulados. */
export function stageFor(s: ChestSticker, pokes: number): StickerStage {
  let cur = s.stages[0]
  for (const st of s.stages) if (pokes >= st.from) cur = st
  return cur
}

/** Qué dice al toque número `n` (1 = el primero). La frase secreta sale justo
 *  en su toque y después vuelve de vez en cuando, para quien quiera releerla. */
export function lineFor(s: ChestSticker, n: number): { text: string; secret: boolean } {
  if (n === s.secret.after || (n > s.secret.after && n % 6 === 0)) return { text: s.secret.line, secret: true }
  const st = stageFor(s, n)
  // El toque que estrena una etapa dice su primera frase (el huevo que se raja dice «¡Crac!»).
  const i = (n - Math.max(1, st.from)) % st.lines.length
  return { text: st.lines[i], secret: false }
}

/** Cuántas frases distintas ya escuchó (aprox. por toques) y cuántas tiene en total, contando la secreta. */
export function heardLines(s: ChestSticker, pokes: number): { heard: number; total: number; secret: boolean } {
  let heard = 0
  s.stages.forEach((st, i) => {
    const start = Math.max(1, st.from)
    const end = Math.min(pokes, (s.stages[i + 1]?.from ?? Infinity) - 1)
    heard += Math.min(st.lines.length, Math.max(0, end - start + 1))
  })
  const total = s.stages.reduce((n, st) => n + st.lines.length, 0) + 1
  const secret = pokes >= s.secret.after
  return { heard: Math.min(total - 1, heard) + (secret ? 1 : 0), total, secret }
}

/** Entradas del catálogo: mismo registro que la tienda (precio 0, `source: 'chest'`), así viajan a la nube y aparecen en el inventario y en ✦ Decorar sin plomería nueva. */
export const CHEST_STICKER_ITEMS: ShopItem[] = [
  ...CHEST_STICKERS.map((s): ShopItem => ({
    id: s.id, category: 'sticker', source: 'chest',
    name: s.name, description: s.description,
    level: 0, price: 0, glyph: `item:${s.stages[0].sprite}`,
  })),
  ...RAID_STICKERS.map((s): ShopItem => ({
    id: s.id, category: 'sticker', source: 'raid',
    name: s.name, description: s.description,
    level: 0, price: 0, glyph: `item:${s.stages[0].sprite}`,
  })),
]
