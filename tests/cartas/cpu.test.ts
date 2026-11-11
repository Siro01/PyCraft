import { describe, expect, it } from 'vitest'
import { MAZOS_CPU, intencionCpu } from '@/lib/game/cartas/cpu'
import { crearPartida, crearRng, jugarRonda, validarMazo } from '@/lib/game/cartas/reglas'

describe('mazos de práctica de la CPU', () => {
  it('los tres cumplen la economía', () => {
    for (const m of MAZOS_CPU) {
      const v = validarMazo(m.cartas.map((c) => ({ ...c })))
      expect(v.problemas, m.id).toEqual([])
      for (const c of m.cartas) expect(m.arte[String(c.id)]?.p.length, `${m.id} ${c.id}`).toBe(256)
    }
  })
  it('la intención es la carta que juega y siempre está en su mano', () => {
    for (const m of MAZOS_CPU) {
      const rng = crearRng(5)
      let e = crearPartida(MAZOS_CPU[0].cartas, m.cartas)
      while (!e.ganador) {
        const cpu = intencionCpu(e, m.estrategia, rng)
        expect(e.manoB.some((c) => c.id === cpu.id)).toBe(true)
        e = jugarRonda(e, e.manoA[0], cpu)
      }
      expect(e.rondas).toHaveLength(5)
    }
  })
})
