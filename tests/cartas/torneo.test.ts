import { describe, expect, it } from 'vitest'
import { correrTorneo, mazoDesdeFoto, progresoAlumno, type Equipo } from '@/lib/game/cartas/torneo'
import { MAZOS_CPU } from '@/lib/game/cartas/cpu'
import { DISENOS_VACIOS } from '@/lib/game/cartas/paleta'
import type { FotoPublicada } from '@/lib/game/cartas/area-store'
import { filaDeCarta } from '@/lib/game/cartas/reglas'

const foto = (i: number, alias = ''): FotoPublicada => {
  const m = MAZOS_CPU[i % MAZOS_CPU.length]
  return {
    titulo: `${m.titulo} ${i}`, lema: '', alias, equipo: null, columnas: ['id', 'nombre', 'tipo', 'poder', 'rareza', 'color'],
    filas: m.cartas.map(filaDeCarta), orden_ids: m.cartas.map((c) => c.id).reverse(), python_code: '', textos_carta: {},
    disenos: DISENOS_VACIOS, publicado_at: '2026-12-01T00:00:00Z',
  }
}

describe('torneo Mañana vs Tarde', () => {
  const equipo = (i: number): Equipo => (i < 8 ? 'PYCRAFT MAÑANA' : 'PYCRAFT TARDE')
  const mazos = Array.from({ length: 17 }, (_, i) => mazoDesdeFoto(`u${i}`, `user${i}`, equipo(i), foto(i))!)

  it('8 contra 9, ida y vuelta: 144 partidas, y todas suman al marcador o a empates', () => {
    const t = correrTorneo(mazos)
    expect(t.partidas).toHaveLength(8 * 9 * 2)
    expect(t.marcador['PYCRAFT MAÑANA'] + t.marcador['PYCRAFT TARDE'] + t.empates).toBe(144)
    expect(t.reñida).not.toBeNull()
  })
  it('es determinista', () => {
    expect(correrTorneo(mazos, 9)).toEqual(correrTorneo(mazos, 9))
  })
  it('cada alumno tiene su carta destacada (una de sus cartas)', () => {
    const t = correrTorneo(mazos)
    for (const m of mazos) {
      const id = t.destacadas[m.userId]
      if (id !== null) expect(m.cartas.some((c) => c.id === id)).toBe(true)
    }
  })
  it('un mazo que rompe la economía no pelea, y el alias nunca pasa de 20', () => {
    const roto = foto(0)
    roto.filas = roto.filas.map((f) => ({ ...f, poder: 9 }))
    expect(mazoDesdeFoto('x', 'x', 'PYCRAFT TARDE', roto)).toBeNull()
    expect(mazoDesdeFoto('x', 'usuario', 'PYCRAFT TARDE', foto(1, 'Un alias larguísimo de verdad'))!.alias).toHaveLength(20)
    expect(mazoDesdeFoto('x', 'usuario', 'PYCRAFT TARDE', foto(1))!.alias).toBe('usuario')
  })
})

describe('progreso en la guía', () => {
  it('dice el capítulo y cuántos pasos lleva', () => {
    expect(progresoAlumno({ titulo: '', tabla: null, marcas: {}, ordenOk: false }).donde).toBe('CREAR 0/3')
    expect(progresoAlumno({ titulo: 'x', tabla: null, marcas: {}, ordenOk: false }).donde).toBe('CREAR 1/3')
  })
})

describe('la pelea más reñida', () => {
  it('prefiere una con ganador y por poco', () => {
    const mazos = Array.from({ length: 6 }, (_, i) => mazoDesdeFoto(`u${i}`, `user${i}`, i < 3 ? 'PYCRAFT MAÑANA' : 'PYCRAFT TARDE', foto(i))!)
    const t = correrTorneo(mazos)
    const r = t.partidas[t.reñida!].registro
    if (t.partidas.some((p) => p.registro.ganador !== 'empate')) {
      expect(r.ganador).not.toBe('empate')
      const minDif = Math.min(...t.partidas.filter((p) => p.registro.ganador !== 'empate').map((p) => Math.abs(p.registro.puntosA - p.registro.puntosB)))
      expect(Math.abs(r.puntosA - r.puntosB)).toBe(minDif)
    }
  })
})
