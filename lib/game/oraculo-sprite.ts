// Oráculo Oscuro — rediseño de cuerpo completo (jefe 8, SELECT · WHERE · ORDER BY).
//
// Tres propuestas a partir de la referencia del docente: una sombra de bloques
// negros que flota, con ojos concéntricos (rosa, turquesa, rojo), muchas manos
// y pedacitos de oscuridad que se le desprenden. Los ojos recorren las filas
// como un SELECT. Las genera scripts/sprites/oraculo.py como tiras de 8 cuadros
// de 64×64 en public/sprites/oraculo-oscuro/.
// Para regenerarlas: `python scripts/sprites/oraculo.py`.

export type OraculoId = 'vigia' | 'consulta' | 'gran-ojo'

export const ORACULO_FRAMES = 8
export const ORACULO_FRAME_MS = 160

/** La variante que se ve en el juego. Cambiar acá para elegir otra. */
export const ACTIVE_ORACULO: OraculoId = 'gran-ojo'

export const ORACULO_VARIANTS: { id: OraculoId; name: string; note: string }[] = [
  {
    id: 'vigia',
    name: 'Vigía',
    note: 'Fiel a la referencia: columna de dos ojos y seis manos (dos arriba, dos a los costados, dos colgando). Los ojos barren en direcciones opuestas y se turnan para parpadear.',
  },
  {
    id: 'consulta',
    name: 'Consulta',
    note: 'Tres ojos en columna (SELECT, WHERE, ORDER BY) y filas de datos que orbitan a su alrededor. Cada ojo sigue a una fila, y la que pasa por delante se ilumina.',
  },
  {
    id: 'gran-ojo',
    name: 'Gran Ojo',
    note: 'Un solo ojo enorme coronado de manos. Su mirada es un haz turquesa que barre una tabla flotante, como un WHERE: la fila que toca se enciende.',
  },
]

export const oraculoSrc = (id: OraculoId, defeated = false) =>
  `/sprites/oraculo-oscuro/${id}${defeated ? '-defeated' : ''}.png`
