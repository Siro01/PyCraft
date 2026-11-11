import { describe, expect, it } from 'vitest'
import initSqlJs from 'sql.js'
import {
  REGLAS, COLORES, alAzar, astuta, cartaDestacada, crearPartida, enOrden, ganaColor, jugarPartida, jugarRonda,
  leerCarta, leerColor, leerPoder, leerRareza, normalizarTexto, porPoder, resolverRonda, sqlTablasReglas, validarMazo,
  type Carta, type Fila,
} from '@/lib/game/cartas/reglas'

const fila = (id: number, nombre: string, poder: unknown, rareza: unknown, color: unknown, extra: Fila = {}): Fila =>
  ({ id, nombre, tipo: 'bicho', poder, rareza, color, ...extra })

const carta = (id: number, poder: number, color: Carta['color'], rareza: Carta['rareza'] = 'comun'): Carta =>
  ({ id, nombre: `c${id}`, tipo: '', poder, rareza, color, extra: null })

// Un mazo que cumple todo: 5+5+5+5+5+5 = 30.
const valido: Fila[] = [
  fila(1, 'Helado', 5, 'comun', 'liso', { sabor: 'frutilla' }),
  fila(2, 'Cono', 5, 'comun', 'rayas', { sabor: 'chocolate' }),
  fila(3, 'Palito', 5, 'comun', 'damero', { sabor: 'limon' }),
  fila(4, 'Copa', 5, 'comun', 'ondas', { sabor: 'menta' }),
  fila(5, 'Bocha', 5, 'comun', 'liso', { sabor: 'dulce de leche' }),
  fila(6, 'Batido', 5, 'comun', 'rayas', { sabor: 'banana' }),
]

describe('leer valores escritos por chicos', () => {
  it('normaliza tildes, mayúsculas y espacios', () => {
    expect(normalizarTexto('  Común ')).toBe('comun')
    expect(normalizarTexto('ÉPICA')).toBe('epica')
  })
  it('acepta singular y plural', () => {
    expect(leerRareza('Comunes')).toBe('comun')
    expect(leerRareza('raras')).toBe('rara')
    expect(leerRareza('Legendaria')).toBe('legendaria')
    expect(leerColor('raya')).toBe('rayas')
    expect(leerColor('Onda')).toBe('ondas')
    expect(leerColor('DAMEROS')).toBe('damero')
    expect(leerColor('lisos')).toBe('liso')
  })
  it('rechaza lo que no es un valor válido', () => {
    expect(leerRareza('mitica')).toBeNull()
    expect(leerColor('rojo')).toBeNull()
    expect(leerColor('')).toBeNull()
  })
  it('el poder es un entero, aunque venga como texto', () => {
    expect(leerPoder(7)).toBe(7)
    expect(leerPoder(' 7 ')).toBe(7)
    expect(leerPoder(7.5)).toBeNull()
    expect(leerPoder('siete')).toBeNull()
    expect(leerPoder(null)).toBeNull()
  })
  it('lee la columna inventada', () => {
    const { carta: c } = leerCarta(valido[0])
    expect(c?.extra).toEqual({ columna: 'sabor', valor: 'frutilla' })
  })
})

describe('validarMazo', () => {
  it('un mazo correcto pasa', () => {
    const r = validarMazo(valido)
    expect(r.problemas).toEqual([])
    expect(r.ok).toBe(true)
    expect(r.cartas).toHaveLength(6)
  })
  it('una común con poder 8 está rota y se nombra', () => {
    const r = validarMazo([fila(1, 'Volcán', 8, 'comun', 'liso'), ...valido.slice(1)])
    expect(r.ok).toBe(false)
    expect(r.problemas.map((p) => p.mensaje)).toContain('Volcán es comun y tiene poder 8: el máximo de una comun es 5.')
  })
  it('cuenta cartas de más y de menos', () => {
    expect(validarMazo([...valido, fila(7, 'Extra', 1, 'comun', 'liso')]).problemas[0].mensaje).toMatch(/7 cartas.*DELETE/)
    expect(validarMazo(valido.slice(0, 4)).problemas[0].mensaje).toMatch(/4 cartas.*faltan 2/)
  })
  it('controla el presupuesto', () => {
    const caro = valido.map((f, i) => (i < 2 ? { ...f, poder: 7, rareza: 'rara' } : f))
    const r = validarMazo(caro)
    expect(r.problemas.find((p) => p.tipo === 'presupuesto')?.mensaje).toBe('Tus cartas suman 34 de poder: el presupuesto es 30. Bajale 4 entre todas.')
  })
  it('controla cuántas cartas hay de cada rareza', () => {
    const dosLegendarias = valido.map((f, i) => (i < 2 ? { ...f, poder: 1, rareza: 'legendaria' } : f))
    expect(validarMazo(dosLegendarias).problemas.find((p) => p.tipo === 'rarezaDeMas')?.mensaje).toBe('Tenés 2 cartas legendaria: como mucho puede haber 1.')
  })
  it('poder mínimo, rareza y color desconocidos', () => {
    const r = validarMazo([fila(1, 'Cero', 0, 'comun', 'liso'), fila(2, 'Rara', 3, 'mitica', 'rojo'), ...valido.slice(2)])
    const tipos = r.problemas.map((p) => p.tipo)
    expect(tipos).toEqual(expect.arrayContaining(['poderBajo', 'rarezaDesconocida', 'colorDesconocido']))
  })
  it('tolera cómo lo escribió el alumno', () => {
    const r = validarMazo(valido.map((f) => ({ ...f, rareza: ' Común', color: String(f.color).toUpperCase(), poder: String(f.poder) })))
    expect(r.ok).toBe(true)
  })
})

describe('la pelea', () => {
  it('ventaja de color en círculo', () => {
    expect(ganaColor('liso', 'rayas')).toBe(true)
    expect(ganaColor('rayas', 'damero')).toBe(true)
    expect(ganaColor('damero', 'ondas')).toBe(true)
    expect(ganaColor('ondas', 'liso')).toBe(true)
    expect(ganaColor('rayas', 'liso')).toBe(false)
    // opuestos e iguales: nada
    expect(ganaColor('liso', 'damero') || ganaColor('damero', 'liso')).toBe(false)
    for (const c of COLORES) expect(ganaColor(c, c)).toBe(false)
  })
  it('resolverRonda suma la ventaja', () => {
    expect(resolverRonda(carta(1, 3, 'liso'), carta(2, 6, 'rayas'))).toEqual({ ganador: 'a', poderA: 3 + REGLAS.ventaja, poderB: 6, ventaja: 'a' })
    expect(resolverRonda(carta(1, 5, 'liso'), carta(2, 5, 'damero'))).toEqual({ ganador: 'empate', poderA: 5, poderB: 5, ventaja: null })
  })
  it('5 rondas, una carta queda sin jugar', () => {
    const mazo = [1, 2, 3, 4, 5, 6].map((p) => carta(p, p, COLORES[p % 4]))
    const r = jugarPartida(mazo, mazo, porPoder, alAzar, 42)
    expect(r.rondas).toHaveLength(REGLAS.rondas)
    expect(r.sinJugarA).toHaveLength(1)
    expect(r.sinJugarB).toHaveLength(1)
    expect(r.sinJugarA[0].poder).toBe(1) // porPoder deja afuera la más débil
    expect(r.puntosA + r.puntosB).toBeLessThanOrEqual(REGLAS.rondas)
  })
  it('es determinista con la semilla', () => {
    const mazo = [1, 2, 3, 4, 5, 6].map((p) => carta(p, p, COLORES[p % 4]))
    expect(jugarPartida(mazo, mazo, alAzar, alAzar, 99)).toEqual(jugarPartida(mazo, mazo, alAzar, alAzar, 99))
  })
  it('si la estrategia del alumno falla o hace trampa, juega el respaldo', () => {
    const mazo = [1, 2, 3, 4, 5, 6].map((p) => carta(p, p, 'liso'))
    const tramposa = () => carta(99, 50, 'liso')
    const rota = () => { throw new Error('bug del alumno') }
    const r1 = jugarPartida(mazo, mazo, tramposa, porPoder, 1)
    const r2 = jugarPartida(mazo, mazo, rota, porPoder, 1)
    for (const r of [r1, r2]) {
      expect(r.rondas.map((x) => x.cartaA.id)).toEqual([6, 5, 4, 3, 2])
      expect(r.ganador).toBe('empate')
    }
  })
  it('enOrden sigue el orden de batalla', () => {
    const mazo = [1, 2, 3, 4, 5, 6].map((p) => carta(p, p, 'liso'))
    const r = jugarPartida(mazo, mazo, enOrden([2, 4, 6, 1, 3, 5]), porPoder, 1)
    expect(r.rondas.map((x) => x.cartaA.id)).toEqual([2, 4, 6, 1, 3])
  })
  it('astuta usa la ventaja de color contra la carta fuerte del rival', () => {
    const mia = [carta(1, 2, 'ondas'), carta(2, 5, 'rayas')]
    const rival = [carta(3, 5, 'liso')]
    expect(astuta({ mano: mia, manoRival: rival, ronda: 1, rng: Math.random }).id).toBe(1)
  })
  it('jugarRonda no acepta cartas que no están en la mano', () => {
    const e = crearPartida([carta(1, 1, 'liso')], [carta(2, 1, 'liso')])
    expect(() => jugarRonda(e, carta(9, 1, 'liso'), carta(2, 1, 'liso'))).toThrow()
  })
  it('carta destacada = la que más rondas ganó', () => {
    const fuerte = [10, 1, 1, 1, 1, 1].map((p, i) => carta(i + 1, p, 'liso'))
    const flojo = [2, 2, 2, 2, 2, 2].map((p, i) => carta(i + 1, p, 'liso'))
    const regs = [1, 2, 3].map((s) => jugarPartida(fuerte, flojo, porPoder, porPoder, s))
    expect(cartaDestacada(regs, () => 'a')).toBe(1)
  })
})

describe('tablas reglas y economia', () => {
  it('se crean en SQLite y coinciden con REGLAS', async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    db.run(sqlTablasReglas())
    const reglas = db.exec('SELECT rareza, poder_max, max_cartas FROM reglas ORDER BY poder_max')[0].values
    expect(reglas).toEqual([['comun', 5, 6], ['rara', 7, 3], ['epica', 9, 2], ['legendaria', 10, 1]])
    const eco = Object.fromEntries(db.exec('SELECT clave, valor FROM economia')[0].values as [string, number][])
    expect(eco).toEqual({ presupuesto: REGLAS.presupuesto, cartas_por_mazo: REGLAS.cartasPorMazo, ventaja: REGLAS.ventaja })
  })
})
