import { describe, expect, it } from 'vitest'
import initSqlJs from 'sql.js'
import { CONSULTAS_NUMEROS, leerMuestra, parejaAlAzar, sqlDeFoto } from '@/lib/game/cartas/muestra'
import { MAZOS_CPU } from '@/lib/game/cartas/cpu'
import { DISENOS_VACIOS } from '@/lib/game/cartas/paleta'
import { crearRng, filaDeCarta } from '@/lib/game/cartas/reglas'
import type { FotoPublicada } from '@/lib/game/cartas/area-store'

const foto = (i: number): FotoPublicada => {
  const m = MAZOS_CPU[i % 3]
  return {
    titulo: m.titulo, lema: '', alias: `a${i}`, equipo: null, columnas: ['id', 'nombre', 'tipo', 'poder', 'rareza', 'color', 'sabor'],
    filas: m.cartas.map((c) => ({ ...filaDeCarta(c), sabor: "it's" })), orden_ids: [], python_code: '', textos_carta: {},
    disenos: DISENOS_VACIOS, publicado_at: '',
  }
}
const archivo = {
  version: 1, generado: '2026-12-17', marcador: { 'PYCRAFT MAÑANA': 5, 'PYCRAFT TARDE': 7, empates: 1 },
  mazos: [
    { n: 1, alias: 'Juli', equipo: 'PYCRAFT MAÑANA', destacada: 2, foto: foto(0) },
    { n: 2, alias: 'Tomi', equipo: 'PYCRAFT TARDE', destacada: null, foto: foto(1) },
    { n: 3, alias: 'Sin equipo', equipo: 'OTRO', destacada: null, foto: foto(2) },
  ],
}

describe('muestra.json', () => {
  it('lee los mazos con equipo y deja afuera lo demás', () => {
    const d = leerMuestra(archivo)
    if ('error' in d) throw new Error(d.error)
    expect(d.mazos.map((m) => m.alias)).toEqual(['Juli', 'Tomi'])
    expect(d.mazos[0].destacada).toBe(2)
    expect(d.marcadorTorneo).toEqual({ 'PYCRAFT MAÑANA': 5, 'PYCRAFT TARDE': 7 })
  })
  it('avisa si el archivo no sirve', () => {
    expect(leerMuestra({ hola: 1 })).toHaveProperty('error')
    expect(leerMuestra({ version: 1, mazos: [] })).toHaveProperty('error')
  })
  it('arma una pelea mañana contra tarde', () => {
    const d = leerMuestra(archivo)
    if ('error' in d) throw new Error(d.error)
    const [m, t] = parejaAlAzar(d, crearRng(3))!
    expect(m.equipo).toBe('PYCRAFT MAÑANA')
    expect(t.equipo).toBe('PYCRAFT TARDE')
  })
  it('"mi mazo en números" corre en SQLite con la foto (comillas incluidas)', async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    db.run(sqlDeFoto(foto(1)))
    expect(db.exec(CONSULTAS_NUMEROS.total)[0].values[0][0]).toBe(30)
    expect(db.exec(CONSULTAS_NUMEROS.rareza)[0].values.length).toBeGreaterThan(1)
  })
})
