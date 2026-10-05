// Guardián de la Puerta — rediseño de cuerpo completo (jefe 2, condicionales).
//
// Tres propuestas armadas alrededor de la cabeza original
// (public/bossicons/guardian-puerta.png) con su misma paleta: piedra
// verde-gris, esquineros naranja y el ojo único menta con pupila roja.
// Las genera scripts/sprites/guardian.py como tiras de cuadros de 64×64 en
// public/sprites/guardian-puerta/ (más un cuadro "derrotado" por variante).
// Para regenerarlas: `python scripts/sprites/guardian.py`.

export type GuardianId = 'centinela' | 'puerta' | 'ramas'

export const GUARDIAN_GRID = 64
export const GUARDIAN_FRAMES = 6
export const GUARDIAN_FRAME_MS = 200

/** La variante que se ve en el juego. Cambiar acá para elegir otra. */
export const ACTIVE_GUARDIAN: GuardianId = 'centinela'

export interface GuardianMeta {
  id: GuardianId
  name: string
  note: string
}

export const GUARDIAN_VARIANTS: GuardianMeta[] = [
  {
    id: 'centinela',
    name: 'Centinela',
    note: 'Golem de bloques con alabarda. En el pecho tiene una cerradura que late, y en el escudo la runa del if: la rama verdadera encendida, la falsa apagada.',
  },
  {
    id: 'puerta',
    name: 'La Puerta',
    note: 'El guardián ES la puerta: la cabeza corona el arco, el portal gira y los puños flotan a los lados. En los pilares, tres runas (if / elif / else); solo la de arriba brilla.',
  },
  {
    id: 'ramas',
    name: 'Coloso de las Ramas',
    note: 'Bloques sueltos que flotan, cada uno a su ritmo. En el piso, un camino que se divide en tres y la luz va probando cada rama, como una condición evaluándose.',
  },
]

export const guardianSrc = (id: GuardianId, defeated = false) =>
  `/sprites/guardian-puerta/${id}${defeated ? '-defeated' : ''}.png`
