// ─── Los mazos de práctica de la CPU ────────────────────────────────────────
// Para probar el mazo en AreaTrabajo (paso 9) y para "Vos vs CPU" en la
// muestra. Los tres cumplen la economía: un mazo nuevo les puede ganar.
// · Novato: todo parejo (5 × 6) y juega al azar.
// · Tanque: polarizado (10, 9, 8, 1, 1, 1) y juega por poder.
// · Jefe de práctica: escalera (9, 7, 5, 4, 3, 2) y juega mirando tu mano.

import {
  alAzar, astuta, crearRng, porPoder, type Carta, type Color, type Estrategia, type EstadoPartida, type Rareza, type Rng,
} from './reglas'
import { PLANTILLAS_FRENTE } from './plantillas-arte'
import type { ArteCarta } from './paleta'

export interface MazoCpu {
  id: 'novato' | 'tanque' | 'jefe'
  titulo: string
  lema: string
  cartas: Carta[]
  estrategia: Estrategia
  /** El dibujo de cada carta (por id). */
  arte: Record<string, ArteCarta>
}

const carta = (id: number, nombre: string, tipo: string, poder: number, rareza: Rareza, color: Color): Carta =>
  ({ id, nombre, tipo, poder, rareza, color, extra: null })

const arteDe = (plantilla: string): ArteCarta => ({ p: PLANTILLAS_FRENTE.find((t) => t.id === plantilla)!.p, liso: false })

export const MAZOS_CPU: MazoCpu[] = [
  {
    id: 'novato',
    titulo: 'Los Novatos',
    lema: 'Todos iguales, todos contentos',
    estrategia: alAzar,
    cartas: [
      carta(1, 'Slime Bebé', 'slime', 5, 'comun', 'liso'),
      carta(2, 'Slime Saltarín', 'slime', 5, 'comun', 'rayas'),
      carta(3, 'Slime Dormilón', 'slime', 5, 'comun', 'damero'),
      carta(4, 'Slime Glotón', 'slime', 5, 'comun', 'ondas'),
      carta(5, 'Slime Mareado', 'slime', 5, 'comun', 'liso'),
      carta(6, 'Slime Feliz', 'slime', 5, 'comun', 'rayas'),
    ],
    arte: Object.fromEntries([1, 2, 3, 4, 5, 6].map((i) => [String(i), arteDe(i % 2 ? 'bicho' : 'cara')])),
  },
  {
    id: 'tanque',
    titulo: 'El Tanque',
    lema: 'Pocas cartas, pero pesadas',
    estrategia: porPoder,
    cartas: [
      carta(1, 'Muralla de Hierro', 'defensa', 10, 'legendaria', 'damero'),
      carta(2, 'Torre Pesada', 'defensa', 9, 'epica', 'ondas'),
      carta(3, 'Escudo Gigante', 'defensa', 8, 'epica', 'liso'),
      carta(4, 'Tornillo Suelto', 'pieza', 1, 'comun', 'rayas'),
      carta(5, 'Tuerca Floja', 'pieza', 1, 'comun', 'liso'),
      carta(6, 'Arandela', 'pieza', 1, 'comun', 'damero'),
    ],
    arte: { 1: arteDe('estrella'), 2: arteDe('espada'), 3: arteDe('corazon'), 4: arteDe('cara'), 5: arteDe('cara'), 6: arteDe('cara') },
  },
  {
    id: 'jefe',
    titulo: 'Jefe de práctica',
    lema: 'Mira tu mano antes de jugar',
    estrategia: astuta,
    cartas: [
      carta(1, 'Estrella Fugaz', 'astro', 9, 'epica', 'ondas'),
      carta(2, 'Espada Antigua', 'arma', 7, 'rara', 'rayas'),
      carta(3, 'Corazón Valiente', 'alma', 5, 'comun', 'liso'),
      carta(4, 'Poción Rara', 'brebaje', 4, 'comun', 'damero'),
      carta(5, 'Cara Pícara', 'alma', 3, 'comun', 'ondas'),
      carta(6, 'Bichito', 'bicho', 2, 'comun', 'rayas'),
    ],
    arte: { 1: arteDe('estrella'), 2: arteDe('espada'), 3: arteDe('corazon'), 4: arteDe('pocion'), 5: arteDe('cara'), 6: arteDe('bicho') },
  },
]

export const mazoCpu = (id: MazoCpu['id']) => MAZOS_CPU.find((m) => m.id === id)!

/** La CPU decide primero y muestra el color de la carta que va a jugar.
 *  Lo que decide acá es lo que juega: la intención nunca miente. */
export function intencionCpu(e: EstadoPartida, estrategia: Estrategia, rng: Rng): Carta {
  const ronda = e.rondas.length + 1
  try {
    const c = estrategia({ mano: e.manoB, manoRival: e.manoA, ronda, rng })
    const enMano = e.manoB.find((x) => x.id === c?.id)
    if (enMano) return enMano
  } catch { /* respaldo */ }
  return porPoder({ mano: e.manoB, manoRival: e.manoA, ronda, rng })
}

export { crearRng }
