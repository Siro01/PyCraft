// ─── Plantillas de arranque para el panel DISEÑO ────────────────────────────
// Para el que se traba con la hoja en blanco: una figura simple para cambiar.
// Todas originales. Los frentes se dibujan con una leyenda de letras (más fácil
// de leer que los caracteres de la paleta); los dorsos se generan con fórmulas
// simétricas, como una alfombra.

import { FRENTE, REVERSO, TRANSPARENTE, colorDe } from './paleta'

/** Filas con letras → dibujo con colores de la paleta. Cada fila se completa o recorta al ancho. */
function arte(filas: string[], leyenda: Record<string, string>, w: number, h: number): string {
  let out = ''
  for (let y = 0; y < h; y++) {
    const fila = (filas[y] ?? '').padEnd(w, '.').slice(0, w)
    for (const ch of fila) out += ch === '.' ? TRANSPARENTE : (leyenda[ch] ?? TRANSPARENTE)
  }
  return out
}

const T = (n: number) => colorDe('tinta', n)
const C = (r: string, n: number) => colorDe(r, n)

export interface PlantillaArte { id: string; nombre: string; p: string }

export const PLANTILLAS_FRENTE: PlantillaArte[] = [
  {
    id: 'espada', nombre: 'Espada',
    p: arte([
      '................',
      '............###.',
      '...........#wws#',
      '..........#wws#.',
      '.........#wws#..',
      '........#wws#...',
      '.......#wws#....',
      '..##..#wws#.....',
      '..#h##wws#......',
      '...#hhws#.......',
      '....#hh#........',
      '...#hHH##.......',
      '..#hH#.#h#......',
      '.#gH#...##......',
      '.#g#............',
      '..#.............',
    ], { '#': T(0), w: T(4), s: T(3), h: C('ambar', 1), H: C('ambar', 0), g: C('carmesi', 1) }, FRENTE.w, FRENTE.h),
  },
  {
    id: 'pocion', nombre: 'Poción',
    p: arte([
      '................',
      '.....######.....',
      '.....#kkkk#.....',
      '.....######.....',
      '......#gg#......',
      '......#gg#......',
      '.....##gg##.....',
      '....#gggggg#....',
      '...#gRRRRRRg#...',
      '..#gRWRRRRRRg#..',
      '..#gRWRRRRRrg#..',
      '..#gRRRRRRRrg#..',
      '..#gRRRRRRrrg#..',
      '...#grrrrrrg#...',
      '....########....',
      '................',
    ], { '#': T(0), k: C('ambar', 0), g: C('celeste', 2), R: C('violeta', 1), r: C('violeta', 0), W: T(4) }, FRENTE.w, FRENTE.h),
  },
  {
    id: 'corazon', nombre: 'Corazón',
    p: arte([
      '................',
      '................',
      '...###....###...',
      '..#RRR#..#RRR#..',
      '.#RlRRR##RRRRR#.',
      '.#RlRRRRRRRRRr#.',
      '.#RRRRRRRRRRRr#.',
      '..#RRRRRRRRRr#..',
      '...#RRRRRRRr#...',
      '....#RRRRRr#....',
      '.....#RRRr#.....',
      '......#Rr#......',
      '.......##.......',
    ], { '#': T(0), R: C('carmesi', 1), r: C('carmesi', 0), l: C('carmesi', 2) }, FRENTE.w, FRENTE.h),
  },
  {
    id: 'estrella', nombre: 'Estrella',
    p: arte([
      '................',
      '.......##.......',
      '......#YY#......',
      '......#YY#......',
      '.....#YLYY#.....',
      '#####YLYYYY#####',
      '#YYYYYYYYYYYYYy#',
      '.#YYYYYYYYYYYy#.',
      '..#YYYYYYYYYy#..',
      '...#YYYYYYYy#...',
      '...#YYYyyYYy#...',
      '..#YYYy##yYYy#..',
      '..#YYy#..#yYy#..',
      '.#Yyy#....#yyy#.',
      '.####......####.',
    ], { '#': T(0), Y: C('ambar', 1), y: C('ambar', 0), L: C('ambar', 2) }, FRENTE.w, FRENTE.h),
  },
  {
    id: 'bicho', nombre: 'Bicho',
    p: arte([
      '................',
      '................',
      '................',
      '.....######.....',
      '...##LLLLLL##...',
      '..#LLWLLLLLLL#..',
      '.#LLWWLLLLLLLL#.',
      '.#LLLLLLLLLLLL#.',
      '.#LL##LLLL##LL#.',
      '.#LL##LLLL##LL#.',
      '.#LLLLLLLLLLLL#.',
      '.#LLLL####LLLl#.',
      '.#lLLLLLLLLLLl#.',
      '..#llllllllll#..',
      '...##########...',
    ], { '#': T(0), L: C('lima', 1), l: C('lima', 0), W: C('lima', 2) }, FRENTE.w, FRENTE.h),
  },
  {
    id: 'cara', nombre: 'Cara',
    p: arte([
      '................',
      '.....######.....',
      '...##FFFFFF##...',
      '..#FFFFFFFFFF#..',
      '.#FFF##FF##FFf#.',
      '.#FFF##FF##FFf#.',
      '#FFFFFFFFFFFFFf#',
      '#FFFFFFFFFFFFFf#',
      '#FF#FFFFFFFF#Ff#',
      '#FFF#FFFFFF#FFf#',
      '.#FFF######FFf#.',
      '.#FFFFFFFFFFff#.',
      '..#ffFFFFFFff#..',
      '...##ffffff##...',
      '.....######.....',
    ], { '#': T(0), F: C('hueso', 1), f: C('hueso', 0) }, FRENTE.w, FRENTE.h),
  },
]

/** Dorso tipo alfombra: borde, guarda y medallón de rombos, todo simétrico. */
function alfombra(rampa: string, adorno: string): string {
  const { w, h } = REVERSO
  const cx = (w - 1) / 2
  const cy = (h - 1) / 2
  let out = ''
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const borde = Math.min(x, y, w - 1 - x, h - 1 - y)
      let c: string
      if (borde === 0) c = colorDe(rampa, 0)
      else if (borde === 1) c = (Math.min(x, w - 1 - x) + Math.min(y, h - 1 - y)) % 2 === 0 ? colorDe(adorno, 1) : colorDe(rampa, 0)
      else if (borde === 2) c = colorDe(rampa, 0)
      else {
        // Rombos concéntricos alrededor del centro, y esquinas con un rombito.
        const d = Math.abs(x - cx) + Math.abs(y - cy) * 0.8
        const esquina = Math.abs(Math.abs(x - cx) - 4.5) + Math.abs(Math.abs(y - cy) - 6.5)
        if (d < 1.5) c = colorDe(adorno, 2)
        else if (d < 3) c = colorDe(rampa, 2)
        else if (d < 4.2) c = colorDe(adorno, 1)
        else if (d < 5.4) c = colorDe(rampa, 0)
        else if (esquina < 1.2) c = colorDe(adorno, 1)
        else c = colorDe(rampa, 1)
      }
      out += c
    }
  }
  return out
}

/** Dorso de rayas diagonales con marco (simétrico de los dos lados). */
function rombos(rampa: string, adorno: string): string {
  const { w, h } = REVERSO
  let out = ''
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const borde = Math.min(x, y, w - 1 - x, h - 1 - y)
      const mx = Math.min(x, w - 1 - x)
      const my = Math.min(y, h - 1 - y)
      let c: string
      if (borde === 0) c = colorDe('noche', 0)
      else if (borde === 1) c = colorDe(adorno, 1)
      else c = (mx + my) % 4 === 0 ? colorDe(adorno, 2) : (mx + my) % 4 === 2 ? colorDe(rampa, 0) : colorDe(rampa, 1)
      out += c
    }
  }
  return out
}

export const PLANTILLAS_REVERSO: PlantillaArte[] = [
  { id: 'alfombra-roja', nombre: 'Alfombra roja', p: alfombra('carmesi', 'hueso') },
  { id: 'alfombra-azul', nombre: 'Alfombra azul', p: alfombra('celeste', 'ambar') },
  { id: 'alfombra-verde', nombre: 'Alfombra verde', p: alfombra('verde', 'hueso') },
  { id: 'rombos-violeta', nombre: 'Rombos violeta', p: rombos('violeta', 'ambar') },
]

/** El dorso de PyCraft (el que tiene el mazo si el alumno no dibujó uno): rombos en tinta. */
export const DORSO_PYCRAFT: string = (() => {
  const { w, h } = REVERSO
  let out = ''
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const borde = Math.min(x, y, w - 1 - x, h - 1 - y)
      const mx = Math.min(x, w - 1 - x)
      const my = Math.min(y, h - 1 - y)
      out += borde === 0 ? colorDe('tinta', 0)
        : borde === 1 ? colorDe('tinta', 3)
          : (mx + my) % 3 === 0 ? colorDe('tinta', 2) : colorDe('tinta', 1)
    }
  }
  return out
})()
