import { beforeAll, describe, expect, it } from 'vitest'
import initSqlJs, { type SqlJsStatic } from 'sql.js'
import { esPeligrosa, fotoCartas, leerTablaCartas, revisarColumnas, sentencias, sqlRestaurar } from '@/lib/game/cartas/mazo'
import { esOrdenBatalla, estadoPaso, estadosGuia, marcasDe, pasoActual, queFalta, type EstadoGuia } from '@/lib/game/cartas/guia'
import { tocaTablasJuego } from '@/lib/game/reino-engine'

let SQL: SqlJsStatic
beforeAll(async () => { SQL = await initSqlJs() })

const CREATE = 'CREATE TABLE cartas (id INTEGER PRIMARY KEY, nombre TEXT, tipo TEXT, poder INTEGER, rareza TEXT, color TEXT, sabor TEXT);'
const SEIS = `INSERT INTO cartas (nombre, tipo, poder, rareza, color, sabor) VALUES
  ('Helado', 'postre', 5, 'comun', 'liso', 'frutilla'),
  ('Cono', 'postre', 5, 'comun', 'rayas', 'chocolate'),
  ('Palito', 'postre', 5, 'comun', 'damero', 'limón'),
  ('Copa', 'postre', 5, 'comun', 'ondas', 'menta'),
  ('Bocha', 'postre', 5, 'comun', 'liso', 'dulce de leche'),
  ('Batido', 'postre', 5, 'comun', 'rayas', 'it''s banana');`

const base = (sql = '') => {
  const db = new SQL.Database()
  if (sql) db.run(sql)
  return db
}

describe('la tabla cartas', () => {
  it('sin tabla devuelve null', () => {
    expect(leerTablaCartas(base())).toBeNull()
  })
  it('lee columnas, filas y el CREATE', () => {
    const t = leerTablaCartas(base(CREATE + SEIS))!
    expect(t.columnas).toEqual(['id', 'nombre', 'tipo', 'poder', 'rareza', 'color', 'sabor'])
    expect(t.filas).toHaveLength(6)
    expect(t.filas[0]).toMatchObject({ id: 1, nombre: 'Helado', sabor: 'frutilla' })
    expect(t.createSql).toMatch(/^CREATE TABLE cartas/)
  })
  it('separa las columnas del juego de la inventada', () => {
    expect(revisarColumnas(['id', 'nombre', 'tipo', 'poder', 'rareza', 'color', 'sabor'])).toEqual({ faltan: [], inventadas: ['sabor'] })
    expect(revisarColumnas(['id', 'nombre', 'poder']).faltan).toEqual(['tipo', 'rareza', 'color'])
  })
})

describe('volver atrás', () => {
  it('la foto se restaura igual (con comillas y tildes)', () => {
    const db = base(CREATE + SEIS)
    const foto = fotoCartas(db)!
    db.run('DELETE FROM cartas;')
    for (const s of sqlRestaurar(foto)) db.run(s)
    expect(leerTablaCartas(db)!.filas).toEqual(foto.filas)
  })
  it('restaurar a "sin tabla" la borra', () => {
    const db = base(CREATE)
    for (const s of sqlRestaurar(null)) db.run(s)
    expect(leerTablaCartas(db)).toBeNull()
  })
  it('cada sentencia de restaurar entra en el registro (≤ 2000 caracteres)', () => {
    const foto = fotoCartas(base(CREATE + SEIS))!
    for (const s of sqlRestaurar(foto)) expect(s.length).toBeLessThanOrEqual(2000)
  })
  it('detecta las órdenes peligrosas', () => {
    expect(esPeligrosa('DELETE FROM cartas')).toBe(true)
    expect(esPeligrosa('delete from cartas where id = 3')).toBe(false)
    expect(esPeligrosa('UPDATE cartas SET poder = 1')).toBe(true)
    expect(esPeligrosa("UPDATE cartas SET poder = 1 WHERE nombre = 'x'")).toBe(false)
    expect(esPeligrosa('DROP TABLE cartas')).toBe(true)
    expect(esPeligrosa('DROP TABLE IF EXISTS cartas')).toBe(true)
    expect(esPeligrosa('DELETE FROM trofeos')).toBe(false)
  })
  it('parte un bloque en sentencias', () => {
    expect(sentencias('SELECT 1;\n-- nada\nSELECT 2;')).toEqual(['SELECT 1', '-- nada\nSELECT 2'])
  })
})

describe('las reglas del juego no se tocan', () => {
  it('bloquea escrituras sobre reglas y economia', () => {
    for (const s of ['UPDATE reglas SET poder_max = 99', 'DELETE FROM economia', 'DROP TABLE reglas', 'drop table if exists "reglas"',
      'INSERT INTO reglas VALUES (1)', 'ALTER TABLE economia ADD x', 'CREATE TABLE reglas (x)', '-- hola\nUPDATE reglas SET x = 1']) {
      expect(tocaTablasJuego(s), s).toBe(true)
    }
  })
  it('deja leerlas y deja todo lo demás', () => {
    for (const s of ['SELECT * FROM reglas', 'UPDATE cartas SET poder = 1 WHERE id = 1', 'CREATE TABLE reglas_mias (x)', 'DELETE FROM cartas WHERE rareza = (SELECT rareza FROM reglas LIMIT 1)']) {
      expect(tocaTablasJuego(s), s).toBe(false)
    }
  })
})

describe('la guía', () => {
  const estado = (sql: string, extra: Partial<EstadoGuia> = {}): EstadoGuia => ({
    titulo: 'Helados', tabla: leerTablaCartas(base(sql)), marcas: {}, ordenOk: false, ...extra,
  })

  it('los eventos marcan los pasos 4 y 5', () => {
    expect(marcasDe('SELECT * FROM reglas')).toEqual({ reglas: true })
    expect(marcasDe("SELECT nombre FROM cartas WHERE rareza = 'comun' AND poder > 5")).toEqual({ where: true })
    expect(marcasDe('select sum(poder) from cartas')).toEqual({ sum: true })
    expect(marcasDe('UPDATE cartas SET poder = 1 WHERE id = 1')).toEqual({})
  })
  it('reconoce el orden de batalla', () => {
    expect(esOrdenBatalla('SELECT * FROM cartas ORDER BY poder DESC')).toBe(true)
    expect(esOrdenBatalla('SELECT * FROM cartas')).toBe(false)
  })
  it('paso 1: título', () => {
    expect(estadoPaso(1, estado('', { titulo: '  ' }))).toBe('pendiente')
    expect(estadoPaso(1, estado(''))).toBe('hecho')
  })
  it('paso 2: tabla con las 6 columnas y una inventada', () => {
    expect(estadoPaso(2, estado(''))).toBe('pendiente')
    expect(estadoPaso(2, estado('CREATE TABLE cartas (id INTEGER PRIMARY KEY, nombre TEXT, tipo TEXT, poder INTEGER, rareza TEXT, color TEXT)'))).toBe('medio')
    expect(estadoPaso(2, estado(CREATE))).toBe('hecho')
  })
  it('paso 3: 6 cartas con 2 colores; si se rompe vuelve a medias', () => {
    expect(estadoPaso(3, estado(CREATE))).toBe('pendiente')
    expect(estadoPaso(3, estado(CREATE + SEIS))).toBe('hecho')
    const siete = estado(CREATE + SEIS + "INSERT INTO cartas (nombre, poder, rareza, color) VALUES ('x', 1, 'comun', 'liso');")
    expect(estadoPaso(3, siete)).toBe('medio')
    expect(queFalta(3, siete)).toMatch(/7 cartas.*DELETE/)
  })
  it('paso 6: mazo válido y orden de batalla', () => {
    const e = estado(CREATE + SEIS)
    expect(estadoPaso(6, e)).toBe('medio')
    expect(queFalta(6, e)).toMatch(/orden de batalla/)
    expect(estadoPaso(6, { ...e, ordenOk: true })).toBe('hecho')
    const roto = estado(CREATE + SEIS + "UPDATE cartas SET poder = 8 WHERE nombre = 'Helado';", { ordenOk: true })
    expect(estadoPaso(6, roto)).toBe('medio')
    expect(queFalta(6, roto)).toMatch(/Helado es comun y tiene poder 8/)
  })
  it('la guía abre en el primer paso que falta', () => {
    expect(pasoActual(estadosGuia(estado('', { titulo: '' })))).toBe(1)
    expect(pasoActual(estadosGuia(estado(CREATE + SEIS)))).toBe(4)
    expect(pasoActual(estadosGuia(estado(CREATE + SEIS, { marcas: { reglas: true, where: true, sum: true } })))).toBe(6)
  })
})
