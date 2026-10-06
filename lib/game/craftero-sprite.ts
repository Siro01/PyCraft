// Maestro Craftero — rediseño de cuerpo completo (jefe 5, funciones con parámetros).
//
// Tres propuestas armadas alrededor de la cabeza original
// (public/bossicons/maestro-craftero.png: un bloque negro con ojos y boca
// blancos), con cuerpo completamente oscuro, capucha y capa. El verde del jefe
// es lo que fabrica: la función recibe parámetros y devuelve un resultado.
// Las genera scripts/sprites/craftero.py como tiras de cuadros de 64×64 en
// public/sprites/maestro-craftero/. Para regenerarlas:
// `python scripts/sprites/craftero.py`.

export type CrafteroId = 'taller' | 'herrero' | 'senor'

export const CRAFTERO_FRAMES = 6
export const CRAFTERO_FRAME_MS = 220

/** La variante que se ve en el juego. Cambiar acá para elegir otra. */
export const ACTIVE_CRAFTERO: CrafteroId = 'senor'

export const CRAFTERO_VARIANTS: { id: CrafteroId; name: string; note: string }[] = [
  {
    id: 'taller',
    name: 'Sombra del Taller',
    note: 'Sostiene una mesa de crafteo flotante: los parámetros entran en la grilla uno por uno (tres gemas, dos palos) y la función devuelve un pico verde.',
  },
  {
    id: 'herrero',
    name: 'Herrero Oscuro',
    note: 'Martillo y yunque: con cada golpe forja una hoja verde al rojo. Las chispas son lo único que le ilumina la capa.',
  },
  {
    id: 'senor',
    name: 'Señor de las Recetas',
    note: 'La capa se abre como alas, en el pecho brilla def y tres parámetros (cubos verdes) le orbitan alrededor. El más imponente.',
  },
]

export const crafteroSrc = (id: CrafteroId, defeated = false) =>
  `/sprites/maestro-craftero/${id}${defeated ? '-defeated' : ''}.png`
