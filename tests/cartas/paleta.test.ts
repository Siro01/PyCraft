import { describe, expect, it } from 'vitest'
import {
  FRENTE, PALETA, RAMPAS, REVERSO, aclarar, casillasEspejo, colorDe, colorHex, desdeCuarto, oscurecer, pintar,
  rellenar, sanear, sanearDisenos, sanearVolteo, vacio,
} from '@/lib/game/cartas/paleta'
import { PLANTILLAS_FRENTE, PLANTILLAS_REVERSO } from '@/lib/game/cartas/plantillas-arte'

describe('la paleta PyCraft', () => {
  it('cada color tiene un carácter propio y entran todos', () => {
    expect(new Set(PALETA.map((c) => c.id)).size).toBe(PALETA.length)
    expect(PALETA.length).toBeLessThanOrEqual(36)
    expect(PALETA.every((c) => /^#[0-9A-F]{6}$/.test(c.hex))).toBe(true)
  })
  it('sombra y luz se mueven dentro de la misma rampa', () => {
    const base = colorDe('carmesi', 1)
    expect(colorHex(oscurecer(base))).toBe('#9A0026')
    expect(colorHex(aclarar(base))).toBe('#FF3D5A')
    expect(oscurecer(colorDe('carmesi', 0))).toBe(colorDe('carmesi', 0))
    expect(aclarar(colorDe('tinta', 4))).toBe(colorDe('tinta', 4))
    expect(oscurecer('.')).toBe('.')
  })
  it('tiene las rampas de los actos y de Halloween', () => {
    expect(RAMPAS.map((r) => r.id)).toEqual(expect.arrayContaining(['carmesi', 'verde', 'celeste', 'calabaza', 'hueso']))
  })
})

describe('herramientas', () => {
  const W = 4, H = 3
  it('espejo en cuatro pinta las 4 esquinas', () => {
    expect(casillasEspejo(0, 0, W, H, 'cuatro')).toEqual([[0, 0], [3, 0], [0, 2], [3, 2]])
    expect(casillasEspejo(1, 1, 3, 3, 'cuatro')).toEqual([[1, 1]]) // el centro no se repite
  })
  it('pintar con espejo horizontal', () => {
    expect(pintar(vacio(W, H), W, H, 0, 1, 'a', 'horizontal')).toBe('....' + 'a..a' + '....')
  })
  it('el balde rellena solo la zona del mismo color', () => {
    const p = '....' + '####'.replace(/#/g, '0') + '....'
    expect(rellenar(p, W, H, 0, 0, 'a', 'ninguno')).toBe('aaaa' + '0000' + '....')
  })
  it('sanear recorta, completa y saca caracteres raros', () => {
    expect(sanear('0?', 2, 2)).toBe('0...')
    expect(sanear(null, 2, 1)).toBe('..')
  })
  it('desdeCuarto arma un dibujo simétrico', () => {
    const p = desdeCuarto(['01', '2.'], 4, 4)
    expect(p).toBe('0110' + '2..2' + '2..2' + '0110')
  })
})

describe('plantillas y lo que se guarda', () => {
  it('los frentes miden 16×16 y los dorsos 16×22, simétricos', () => {
    for (const t of PLANTILLAS_FRENTE) expect(t.p.length, t.id).toBe(FRENTE.w * FRENTE.h)
    for (const t of PLANTILLAS_REVERSO) {
      expect(t.p.length, t.id).toBe(REVERSO.w * REVERSO.h)
      for (let y = 0; y < REVERSO.h; y++) {
        const fila = t.p.slice(y * REVERSO.w, (y + 1) * REVERSO.w)
        expect(fila, `${t.id} fila ${y}`).toBe(fila.split('').reverse().join(''))
      }
    }
  })
  it('los diseños guardados se sanean al cargar', () => {
    const d = sanearDisenos({ frente: { 3: { p: 'zz', liso: 1 } }, reverso: '....', volteo: { estilo: 'volar', velocidad: 'rapida' } })
    expect(d.frente['3'].p).toHaveLength(FRENTE.w * FRENTE.h)
    expect(d.frente['3'].liso).toBe(true)
    expect(d.reverso).toBeNull() // un dorso vacío es el de PyCraft
    expect(d.volteo).toEqual({ estilo: 'giro', chispa: sanearVolteo({}).chispa, velocidad: 'rapida' })
    expect(sanearVolteo({ chispa: null }).chispa).toBeNull()
  })
})
