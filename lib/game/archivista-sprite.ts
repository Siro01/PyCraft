// El Archivista — rediseño de cuerpo completo (jefe 6, de listas a tablas).
//
// Tres propuestas armadas alrededor de la cabeza original
// (public/bossicons/archivista.png): las manos ocupadas por libros y el efecto
// de la mesa de encantamientos de Minecraft (runas que vuelan hacia el libro y
// el brillo violeta de lo encantado). En batalla, su vida se muestra con
// XPBar (la barra de experiencia). Las genera scripts/sprites/archivista.py
// como tiras de cuadros de 64×64 en public/sprites/archivista/.
// Para regenerarlas: `python scripts/sprites/archivista.py`.

export type ArchivistaId = 'bibliotecario' | 'torre' | 'encantador'

export const ARCHIVISTA_FRAMES = 6
export const ARCHIVISTA_FRAME_MS = 180

/** La variante que se ve en el juego. Cambiar acá para elegir otra. */
export const ACTIVE_ARCHIVISTA: ArchivistaId = 'torre'

export const ARCHIVISTA_VARIANTS: { id: ArchivistaId; name: string; note: string }[] = [
  {
    id: 'bibliotecario',
    name: 'Bibliotecario',
    note: 'Sostiene un libro abierto con las dos manos; las hojas pasan solas y las runas del encantamiento llegan volando desde los costados.',
  },
  {
    id: 'torre',
    name: 'Torre de Libros',
    note: 'Abraza una pila de libros que se tambalea (los de arriba, encantados). Sobre su cabeza flota un libro abierto que junta las runas.',
  },
  {
    id: 'encantador',
    name: 'Encantador',
    note: 'Detrás de una mesa de encantamientos: un libro flota sobre ella y las runas salen de los dos libros encantados que levanta en las manos.',
  },
]

export const archivistaSrc = (id: ArchivistaId, defeated = false) =>
  `/sprites/archivista/${id}${defeated ? '-defeated' : ''}.png`
