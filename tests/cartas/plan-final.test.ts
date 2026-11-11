import { describe, expect, it } from 'vitest'
import initSqlJs from 'sql.js'
import { PLAN_FINAL, paginaDeHoy } from '@/lib/game/cartas/plan-final'
import { sqlTablasReglas, validarMazo, type Fila } from '@/lib/game/cartas/reglas'

// Lo que se proyecta en PLAN_FINAL.TXT tiene que andar: corrido en orden, el
// SQL de las páginas arma el mazo de ejemplo, que pasa por una carta rota y
// por el presupuesto pasado, y queda válido después del Proyecto 1.

const filas = (db: import('sql.js').Database): Fila[] => {
  const r = db.exec('SELECT * FROM cartas')[0]
  return r ? r.values.map((v) => Object.fromEntries(r.columns.map((c, i) => [c, v[i]]))) : []
}

describe('PLAN_FINAL.TXT', () => {
  it('las fechas van en orden y la tarde nunca va antes que la mañana', () => {
    for (let i = 1; i < PLAN_FINAL.length; i++) expect(PLAN_FINAL[i].manana >= PLAN_FINAL[i - 1].manana, PLAN_FINAL[i].id).toBe(true)
    for (const p of PLAN_FINAL) expect(p.tarde >= p.manana, p.id).toBe(true)
  })

  it('abre en la próxima clase', () => {
    expect(PLAN_FINAL[paginaDeHoy(new Date(2026, 10, 10))].id).toBe('jefe-8')
    expect(PLAN_FINAL[paginaDeHoy(new Date(2026, 10, 12))].id).toBe('jefe-9') // la tarde todavía tiene el jefe 9
    expect(PLAN_FINAL[paginaDeHoy(new Date(2026, 10, 13))].id).toBe('jefe-10')
    expect(PLAN_FINAL[paginaDeHoy(new Date(2027, 0, 1))].id).toBe('muestra')
  })

  it('el SQL de las páginas, en orden, arma el mazo de ejemplo', async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    db.run(sqlTablasReglas())
    const estado: Record<string, ReturnType<typeof validarMazo>> = {}
    for (const p of PLAN_FINAL) {
      for (const c of p.proyectar.filter((x) => x.lang === 'sql')) {
        expect(() => db.exec(c.codigo), `${p.id}: ${c.codigo}`).not.toThrow()
      }
      estado[p.id] = validarMazo(filas(db))
    }
    expect(estado['jefe-8'].cartas).toHaveLength(3)
    expect(estado['jefe-9'].cartas).toHaveLength(6)
    // Antes del Proyecto 1: la Licuadora es una común rota y el mazo suma 32.
    const tipos = estado['jefe-10'].problemas.map((x) => x.tipo)
    expect(tipos).toContain('poderAlto')
    expect(tipos).toContain('presupuesto')
    // Después del Proyecto 1: válido.
    expect(estado['proyecto-1'].problemas).toEqual([])
    // Lo que se proyecta para cazar rotas encuentra justo la Licuadora (antes del arreglo).
    const db2 = new SQL.Database()
    for (const p of PLAN_FINAL.slice(0, 3)) for (const c of p.proyectar) if (c.lang === 'sql') db2.exec(c.codigo)
    const rotas = db2.exec("SELECT nombre, poder FROM cartas WHERE rareza = 'comun' AND poder > 5;")[0].values
    expect(rotas).toEqual([['Licuadora Gigante', 7]])
  })
})
