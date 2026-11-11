import { describe, expect, it } from 'vitest'
import { arregloSql, PASOS } from '@/lib/game/cartas/guia'
import { validarMazo } from '@/lib/game/cartas/reglas'

const fila = (nombre: string, poder: number, rareza = 'comun', color = 'liso') => ({ id: 1, nombre, tipo: 'x', poder, rareza, color })

describe('arreglo guiado', () => {
  it('poder alto: UPDATE multilínea con la carta ya puesta', () => {
    const v = validarMazo([fila('carta-test', 9)])
    const p = v.problemas.find((x) => x.tipo === 'poderAlto')!
    const sql = arregloSql(p)!
    expect(sql).toContain("UPDATE cartas\nSET poder = ___\nWHERE nombre = 'carta-test';")
  })

  it('rareza inventada: cambia la rareza', () => {
    const v = validarMazo([fila('carta-test', 5, 'ultra-legenderia')])
    const p = v.problemas.find((x) => x.tipo === 'rarezaDesconocida')!
    expect(arregloSql(p)).toContain("SET rareza = '___'")
  })

  it('faltan cartas: INSERT con las filas que faltan', () => {
    const v = validarMazo([fila('a', 3), fila('b', 3)])
    const p = v.problemas.find((x) => x.tipo === 'cantidad')!
    const sql = arregloSql(p, ['id', 'nombre', 'tipo', 'poder', 'rareza', 'color'])!
    expect(sql.split('\n').filter((l) => l.startsWith("  ('") || l.startsWith('  (___')).length).toBe(4)
    expect(sql).toContain('INSERT INTO cartas\n  (nombre, tipo, poder, rareza, color)\nVALUES')
  })

  it('las plantillas SQL van en varias líneas', () => {
    for (const id of [2, 3, 5, 6] as const) expect(PASOS[id].plantilla!.codigo.split('\n').length).toBeGreaterThan(3)
  })
})
