import { describe, expect, it } from 'vitest'
import { FILAS_PRUEBA_REVISAR, SONDA_PROGRAMAR, aPython, explicarCarta, explicarRevisar } from '@/lib/game/cartas/sondas'
import { validarMazo } from '@/lib/game/cartas/reglas'

describe('sondas', () => {
  it('las 4 cartas de prueba de revisar() son lo que dicen ser según las reglas', () => {
    for (const f of FILAS_PRUEBA_REVISAR) {
      const v = validarMazo([{ id: 1, nombre: f.nombre, tipo: 'x', poder: f.poder, rareza: f.rareza, color: 'liso' }])
      const rota = v.problemas.some((p) => p.tipo === 'poderAlto' || p.tipo === 'poderBajo')
      expect(!rota, f.nombre).toBe(f.esperado)
    }
  })
  it('los valores van como literales de Python', () => {
    expect(aPython({ a: true, b: false, c: null, d: 'true story', e: [1, 'x'] })).toBe('{"a": True, "b": False, "c": None, "d": "true story", "e": [1, "x"]}')
    expect(SONDA_PROGRAMAR).toContain('"esperado": True')
    expect(SONDA_PROGRAMAR).not.toMatch(/:true|:false/)
  })
  it('Rodolfo explica cada falla', () => {
    expect(explicarCarta({ ok: true })).toBeNull()
    expect(explicarCarta({ ok: false, motivo: 'falta' })).toMatch(/def carta/)
    expect(explicarRevisar({ ok: false, motivo: 'no_bool', devolvio: 'NoneType' })).toMatch(/nada \(None\)/)
    expect(explicarRevisar({ ok: false, aciertos: 3, total: 4, fallas: ['Prueba Común Rota'] })).toMatch(/acertó 3.*Prueba Común Rota/)
  })
})
