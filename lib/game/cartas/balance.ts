// ─── Simulación de balance de la Arena de Cartas ────────────────────────────
// Cinco formas típicas de repartir el presupuesto (arquetipos), con colores y
// órdenes al azar, se enfrentan miles de veces. Si el juego está bien
// balanceado, ningún arquetipo gana mucho más que otro: la forma de repartir
// el poder importa menos que las decisiones durante la pelea.
//
// Lo usan tests/cartas/balance.test.ts (falla si se desbalancea) y el script
// `pnpm sim:balance` (imprime la tabla).

import {
  COLORES, REGLAS, alAzar, crearRng, jugarPartida, porPoder,
  type Carta, type Color, type Estrategia, type Rareza, type Rng,
} from './reglas'

export const ARQUETIPOS: Record<string, number[]> = {
  plano: [5, 5, 5, 5, 5, 5],
  polarizado: [10, 9, 8, 1, 1, 1],
  medio: [7, 7, 5, 5, 3, 3],
  escalera: [9, 7, 5, 4, 3, 2],
  'dos altos': [9, 9, 5, 3, 2, 2],
}

/** La rareza más baja que permite ese poder. */
export function rarezaPara(poder: number): Rareza {
  const orden: Rareza[] = ['comun', 'rara', 'epica', 'legendaria']
  return orden.find((r) => poder <= REGLAS.rarezas[r].poderMax) ?? 'legendaria'
}

/** Un mazo del arquetipo con colores al azar. */
export function mazoDe(poderes: number[], rng: Rng, nombre = 'mazo'): Carta[] {
  return poderes.map((poder, i) => ({
    id: i + 1,
    nombre: `${nombre} ${i + 1}`,
    tipo: '',
    poder,
    rareza: rarezaPara(poder),
    color: COLORES[Math.floor(rng() * COLORES.length)] as Color,
    extra: null,
  }))
}

export interface FilaBalance {
  arquetipo: string
  partidas: number
  /** Victorias + medio punto por empate, sobre el total. */
  porcentaje: number
}

/** Cada arquetipo contra todos (incluido él mismo), con colores y órdenes al azar. */
export function simularBalance(opts: { partidas?: number; seed?: number; bonus?: number; estrategia?: Estrategia } = {}): FilaBalance[] {
  const { partidas = 20000, seed = 2026, bonus = REGLAS.ventaja, estrategia = alAzar } = opts
  const rng = crearRng(seed)
  const nombres = Object.keys(ARQUETIPOS)
  const puntos = new Map(nombres.map((n) => [n, { jugadas: 0, puntos: 0 }]))

  for (let i = 0; i < partidas; i++) {
    const na = nombres[Math.floor(rng() * nombres.length)]
    const nb = nombres[Math.floor(rng() * nombres.length)]
    const r = jugarPartida(mazoDe(ARQUETIPOS[na], rng), mazoDe(ARQUETIPOS[nb], rng), estrategia, estrategia, Math.floor(rng() * 2 ** 31), bonus)
    const pa = r.ganador === 'a' ? 1 : r.ganador === 'empate' ? 0.5 : 0
    const sa = puntos.get(na)!
    const sb = puntos.get(nb)!
    sa.jugadas++; sa.puntos += pa
    sb.jugadas++; sb.puntos += 1 - pa
  }

  return nombres.map((n) => {
    const s = puntos.get(n)!
    return { arquetipo: n, partidas: s.jugadas, porcentaje: s.jugadas ? (100 * s.puntos) / s.jugadas : 0 }
  })
}

/** ¿Cuánto pesa decidir bien? Una estrategia contra otra, con arquetipos y
 *  colores al azar. Devuelve el % (victorias + medio empate) del lado A. */
export function duelo(a: Estrategia, b: Estrategia, opts: { partidas?: number; seed?: number } = {}): number {
  const { partidas = 20000, seed = 7 } = opts
  const rng = crearRng(seed)
  const nombres = Object.keys(ARQUETIPOS)
  let pts = 0
  for (let i = 0; i < partidas; i++) {
    const ma = mazoDe(ARQUETIPOS[nombres[Math.floor(rng() * nombres.length)]], rng)
    const mb = mazoDe(ARQUETIPOS[nombres[Math.floor(rng() * nombres.length)]], rng)
    const r = jugarPartida(ma, mb, a, b, Math.floor(rng() * 2 ** 31))
    pts += r.ganador === 'a' ? 1 : r.ganador === 'empate' ? 0.5 : 0
  }
  return (100 * pts) / partidas
}

export { porPoder, alAzar }
