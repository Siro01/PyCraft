// Golem Infinito — rediseño de cuerpo completo (jefe 3, bucles for / while).
//
// Tres propuestas armadas alrededor de la cabeza original
// (public/bossicons/golem-infinito.png): un golem de cobre con pararrayos.
// Derrotado se oxida entero (pátina verde, el color guía del jefe) y queda
// estatua. Las genera scripts/sprites/golem.py como tiras de cuadros de 64×64
// en public/sprites/golem-infinito/. Para regenerarlas:
// `python scripts/sprites/golem.py`.

export type GolemId = 'marcha' | 'cuerda' | 'minero'

export const GOLEM_FRAMES = 6
export const GOLEM_FRAME_MS = 200

/** La variante que se ve en el juego. Cambiar acá para elegir otra. */
export const ACTIVE_GOLEM: GolemId = 'minero'

export interface GolemMeta {
  id: GolemId
  name: string
  note: string
}

export const GOLEM_VARIANTS: GolemMeta[] = [
  {
    id: 'marcha',
    name: 'Marcha Infinita',
    note: 'Camina en el lugar para siempre: mueve brazos y piernas pero no llega a ningún lado. En el pecho, un ∞ con una chispa que lo recorre sin parar.',
  },
  {
    id: 'cuerda',
    name: 'A Cuerda',
    note: 'Un juguete de cuerda: la llave de la espalda gira, por la ventana del pecho se ve el engranaje y el pararrayos chisporrotea. Nadie le puso un "hasta cuándo".',
  },
  {
    id: 'minero',
    name: 'Minero del Bucle',
    note: 'for golpe in range(3): pica el bloque tres veces, el contador del pecho marca 1, 2, 3, el número salta sobre la piedra… y vuelve a empezar.',
  },
]

export const golemSrc = (id: GolemId, defeated = false) =>
  `/sprites/golem-infinito/${id}${defeated ? '-defeated' : ''}.png`
