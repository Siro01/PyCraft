// ─── Torneo Mañana vs Tarde y progreso de cada alumno ───────────────────────
// Puro (sin React ni Supabase): lo usa la ventana areatrabajo.exe del panel
// docente y lo prueban los tests.

import { cartaDestacada, enOrden, jugarPartida, porPoder, validarMazo, type Carta, type RegistroPartida } from './reglas'
import { CAPITULOS, estadosGuia, type EstadoGuia, type PasoId } from './guia'
import type { FotoPublicada } from './area-store'

// ─── Progreso en la guía ─────────────────────────────────────────────────────

export interface Progreso {
  hechos: number
  /** "CREAR 2/3", "BALANCEAR 1/3"… o "TERMINADO". */
  donde: string
  estados: ReturnType<typeof estadosGuia>
}

export function progresoAlumno(e: EstadoGuia): Progreso {
  const estados = estadosGuia(e)
  const hechos = Object.values(estados).filter((x) => x === 'hecho').length
  for (const c of CAPITULOS) {
    const listos = c.pasos.filter((id: PasoId) => estados[id] === 'hecho').length
    if (listos < c.pasos.length) return { hechos, donde: `${c.titulo} ${listos}/${c.pasos.length}`, estados }
  }
  return { hechos, donde: 'TERMINADO', estados }
}

// ─── Mazos publicados ────────────────────────────────────────────────────────

export type Equipo = 'PYCRAFT MAÑANA' | 'PYCRAFT TARDE'

export interface MazoPublicado {
  userId: string
  /** Lo que se muestra: el alias, o el usuario si no puso alias. Nunca el nombre completo. */
  alias: string
  titulo: string
  equipo: Equipo
  cartas: Carta[]
  orden: number[]
  foto: FotoPublicada
}

/** Un mazo publicado listo para pelear (null si no cumple la economía: no pelea). */
export function mazoDesdeFoto(userId: string, usuario: string, equipo: Equipo, foto: FotoPublicada): MazoPublicado | null {
  const v = validarMazo(foto.filas)
  if (!v.ok) return null
  return {
    userId,
    alias: (foto.alias || usuario).slice(0, 20),
    titulo: foto.titulo || 'Sin título',
    equipo,
    cartas: v.cartas,
    orden: foto.orden_ids ?? [],
    foto,
  }
}

// ─── El torneo ───────────────────────────────────────────────────────────────

export interface PartidaTorneo {
  a: string
  b: string
  /** 'ida' = cada uno con su orden de batalla · 'vuelta' = los dos con la estrategia por defecto. */
  vuelta: 'ida' | 'vuelta'
  registro: RegistroPartida
}

export interface ResultadoTorneo {
  partidas: PartidaTorneo[]
  marcador: Record<Equipo, number>
  empates: number
  /** La carta que más rondas ganó de cada alumno (por userId). */
  destacadas: Record<string, number | null>
  /** La partida más pareja (para ver la repetición). */
  reñida: number | null
}

/** Todos los mazos de la mañana contra todos los de la tarde, ida y vuelta.
 *  Ida: cada uno juega su orden de batalla. Vuelta: los dos juegan por poder.
 *  Determinista con la semilla. */
export function correrTorneo(mazos: MazoPublicado[], semilla = 2026): ResultadoTorneo {
  const mañana = mazos.filter((m) => m.equipo === 'PYCRAFT MAÑANA')
  const tarde = mazos.filter((m) => m.equipo === 'PYCRAFT TARDE')
  const partidas: PartidaTorneo[] = []
  let n = 0
  for (const m of mañana) {
    for (const t of tarde) {
      partidas.push({ a: m.userId, b: t.userId, vuelta: 'ida', registro: jugarPartida(m.cartas, t.cartas, enOrden(m.orden), enOrden(t.orden), semilla + n++) })
      partidas.push({ a: t.userId, b: m.userId, vuelta: 'vuelta', registro: jugarPartida(t.cartas, m.cartas, porPoder, porPoder, semilla + n++) })
    }
  }
  const equipoDe = new Map(mazos.map((m) => [m.userId, m.equipo]))
  const marcador: Record<Equipo, number> = { 'PYCRAFT MAÑANA': 0, 'PYCRAFT TARDE': 0 }
  let empates = 0
  for (const p of partidas) {
    if (p.registro.ganador === 'empate') { empates++; continue }
    marcador[equipoDe.get(p.registro.ganador === 'a' ? p.a : p.b)!]++
  }
  const destacadas: Record<string, number | null> = {}
  for (const m of mazos) {
    const suyas = partidas.filter((p) => p.a === m.userId || p.b === m.userId)
    destacadas[m.userId] = suyas.length
      ? cartaDestacada(suyas.map((p) => p.registro), (r) => (suyas.find((p) => p.registro === r)!.a === m.userId ? 'a' : 'b'))
      : null
  }
  // La más reñida: una con ganador, con la menor diferencia y la mayor cantidad
  // de rondas ganadas (un 3–2 antes que un 1–0). Si todas fueron empate, la primera.
  let reñida: number | null = partidas.length ? 0 : null
  let mejor: [number, number] | null = null
  partidas.forEach((p, i) => {
    if (p.registro.ganador === 'empate') return
    const clave: [number, number] = [Math.abs(p.registro.puntosA - p.registro.puntosB), -(p.registro.puntosA + p.registro.puntosB)]
    if (!mejor || clave[0] < mejor[0] || (clave[0] === mejor[0] && clave[1] < mejor[1])) { mejor = clave; reñida = i }
  })
  return { partidas, marcador, empates, destacadas, reñida }
}
