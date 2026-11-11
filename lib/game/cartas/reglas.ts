// ─── Arena de Cartas: las reglas del juego ──────────────────────────────────
// Una sola fuente de verdad para la economía del mazo, la pelea y las
// estrategias. Funciones puras (sin React, sin navegador): las usan AreaTrabajo,
// la arena de prueba, el torneo del docente y la muestra. Tests en
// tests/cartas/. Si cambiás una constante, el test de balance avisa si el
// juego se desequilibra.

export const REGLAS = {
  cartasPorMazo: 6,
  /** SUM(poder) del mazo no puede pasar de acá. */
  presupuesto: 30,
  poderMin: 1,
  rarezas: {
    comun: { poderMax: 5, maxCartas: 6 },
    rara: { poderMax: 7, maxCartas: 3 },
    epica: { poderMax: 9, maxCartas: 2 },
    legendaria: { poderMax: 10, maxCartas: 1 },
  },
  /** En círculo: cada color le gana al siguiente (liso → rayas → damero → ondas → liso). */
  colores: ['liso', 'rayas', 'damero', 'ondas'],
  /** Poder extra en la ronda para el que tiene ventaja de color. */
  ventaja: 4,
  rondas: 5,
} as const

export type Rareza = keyof typeof REGLAS.rarezas
export type Color = (typeof REGLAS.colores)[number]

export const RAREZAS = Object.keys(REGLAS.rarezas) as Rareza[]
export const COLORES = REGLAS.colores as readonly Color[]

/** Columnas fijas de la tabla `cartas`. Todo lo demás es la columna inventada. */
export const COLUMNAS_FIJAS = ['id', 'nombre', 'tipo', 'poder', 'rareza', 'color'] as const

export interface Carta {
  id: number
  nombre: string
  tipo: string
  poder: number
  rareza: Rareza
  color: Color
  /** La columna inventada por el alumno (`sabor: frutilla`), si la tiene. */
  extra: { columna: string; valor: string } | null
}

// ─── Leer una fila de la tabla (tolerante) ──────────────────────────────────
// Los chicos escriben 'Común', 'RAYAS ', 'raya', 'Legendarias'… Todo eso vale.

export function normalizarTexto(v: unknown): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** Busca el valor válido que corresponde a lo que escribió el alumno: igual,
 *  o en singular/plural (comunes → comun, raya → rayas, onda → ondas). */
function emparejar<T extends string>(v: unknown, validos: readonly T[]): T | null {
  const t = normalizarTexto(v)
  if (!t) return null
  for (const ok of validos) {
    if (t === ok || t === `${ok}s` || t === `${ok}es` || `${t}s` === ok) return ok
  }
  return null
}

export const leerRareza = (v: unknown) => emparejar(v, RAREZAS)
export const leerColor = (v: unknown) => emparejar(v, COLORES)

/** Poder entero, aunque venga como texto ('7', ' 7 '). null si no es un entero. */
export function leerPoder(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.trim()) : NaN
  return Number.isInteger(n) ? n : null
}

export type Fila = Record<string, unknown>

export type Problema =
  | { tipo: 'cantidad'; cartas: number; mensaje: string }
  | { tipo: 'presupuesto'; total: number; mensaje: string }
  | { tipo: 'rarezaDeMas'; rareza: Rareza; cartas: number; mensaje: string }
  | { tipo: 'rarezaDesconocida'; carta: string; valor: string; mensaje: string }
  | { tipo: 'colorDesconocido'; carta: string; valor: string; mensaje: string }
  | { tipo: 'poderInvalido'; carta: string; valor: string; mensaje: string }
  | { tipo: 'poderBajo'; carta: string; poder: number; mensaje: string }
  | { tipo: 'poderAlto'; carta: string; poder: number; rareza: Rareza; mensaje: string }

const nombreDe = (f: Fila, i: number) => {
  const n = String(f.nombre ?? '').trim()
  return n || `La carta ${i + 1}`
}

const lista = (xs: readonly string[]) =>
  xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} o ${xs[xs.length - 1]}`

/** Convierte una fila de la tabla en una carta. Si algo no se puede leer,
 *  devuelve los problemas (en palabras de chico) y carta = null. */
export function leerCarta(fila: Fila, i = 0): { carta: Carta | null; problemas: Problema[] } {
  const nombre = nombreDe(fila, i)
  const problemas: Problema[] = []

  const rareza = leerRareza(fila.rareza)
  if (!rareza) {
    problemas.push({
      tipo: 'rarezaDesconocida', carta: nombre, valor: String(fila.rareza ?? ''),
      mensaje: `${nombre} tiene rareza '${String(fila.rareza ?? '')}': tiene que ser ${lista(RAREZAS)}.`,
    })
  }
  const color = leerColor(fila.color)
  if (!color) {
    problemas.push({
      tipo: 'colorDesconocido', carta: nombre, valor: String(fila.color ?? ''),
      mensaje: `${nombre} tiene color '${String(fila.color ?? '')}': tiene que ser ${lista(COLORES)}.`,
    })
  }
  const poder = leerPoder(fila.poder)
  if (poder === null) {
    problemas.push({
      tipo: 'poderInvalido', carta: nombre, valor: String(fila.poder ?? ''),
      mensaje: `${nombre} tiene poder '${String(fila.poder ?? '')}': el poder es un número entero, sin comillas.`,
    })
  }
  if (problemas.length > 0 || !rareza || !color || poder === null) return { carta: null, problemas }

  const extraCol = Object.keys(fila).find((k) => !(COLUMNAS_FIJAS as readonly string[]).includes(k.toLowerCase()))
  return {
    carta: {
      id: leerPoder(fila.id) ?? i + 1,
      nombre,
      tipo: String(fila.tipo ?? '').trim(),
      poder,
      rareza,
      color,
      extra: extraCol ? { columna: extraCol, valor: String(fila[extraCol] ?? '') } : null,
    },
    problemas,
  }
}

/** ¿El mazo cumple la economía? Si no, cada problema nombra la carta y la regla. */
export function validarMazo(filas: Fila[]): { ok: boolean; cartas: Carta[]; problemas: Problema[] } {
  const problemas: Problema[] = []
  const cartas: Carta[] = []

  if (filas.length !== REGLAS.cartasPorMazo) {
    const sobra = filas.length > REGLAS.cartasPorMazo
    problemas.push({
      tipo: 'cantidad', cartas: filas.length,
      mensaje: sobra
        ? `Tu mazo tiene ${filas.length} cartas: tiene que tener ${REGLAS.cartasPorMazo}. Sacá ${filas.length - REGLAS.cartasPorMazo} con DELETE.`
        : `Tu mazo tiene ${filas.length} carta${filas.length === 1 ? '' : 's'}: tiene que tener ${REGLAS.cartasPorMazo}. Te falta${REGLAS.cartasPorMazo - filas.length === 1 ? '' : 'n'} ${REGLAS.cartasPorMazo - filas.length}.`,
    })
  }

  filas.forEach((f, i) => {
    const r = leerCarta(f, i)
    problemas.push(...r.problemas)
    if (!r.carta) return
    const c = r.carta
    cartas.push(c)
    if (c.poder < REGLAS.poderMin) {
      problemas.push({ tipo: 'poderBajo', carta: c.nombre, poder: c.poder, mensaje: `${c.nombre} tiene poder ${c.poder}: el mínimo es ${REGLAS.poderMin}.` })
    }
    const max = REGLAS.rarezas[c.rareza].poderMax
    if (c.poder > max) {
      problemas.push({
        tipo: 'poderAlto', carta: c.nombre, poder: c.poder, rareza: c.rareza,
        mensaje: `${c.nombre} es ${c.rareza} y tiene poder ${c.poder}: el máximo de una ${c.rareza} es ${max}.`,
      })
    }
  })

  for (const rareza of RAREZAS) {
    const n = cartas.filter((c) => c.rareza === rareza).length
    const max = REGLAS.rarezas[rareza].maxCartas
    if (n > max) {
      problemas.push({
        tipo: 'rarezaDeMas', rareza, cartas: n,
        mensaje: `Tenés ${n} cartas ${rareza}: como mucho ${max === 1 ? 'puede haber 1' : `pueden haber ${max}`}.`,
      })
    }
  }

  const total = cartas.reduce((s, c) => s + c.poder, 0)
  if (total > REGLAS.presupuesto) {
    problemas.push({
      tipo: 'presupuesto', total,
      mensaje: `Tus cartas suman ${total} de poder: el presupuesto es ${REGLAS.presupuesto}. Bajale ${total - REGLAS.presupuesto} entre todas.`,
    })
  }

  return { ok: problemas.length === 0, cartas, problemas }
}

// ─── La pelea ────────────────────────────────────────────────────────────────

/** ¿El color `a` le gana al color `b`? (el siguiente en el círculo) */
export function ganaColor(a: Color, b: Color): boolean {
  const i = COLORES.indexOf(a)
  return COLORES[(i + 1) % COLORES.length] === b
}

export type Lado = 'a' | 'b'
export type Resultado = Lado | 'empate'

export interface ResultadoRonda {
  ganador: Resultado
  poderA: number
  poderB: number
  /** Quién tuvo ventaja de color en esta ronda (null si nadie). */
  ventaja: Lado | null
}

/** `bonus` solo cambia en la simulación de balance; el juego usa REGLAS.ventaja. */
export function resolverRonda(a: Carta, b: Carta, bonus: number = REGLAS.ventaja): ResultadoRonda {
  const ventaja: Lado | null = ganaColor(a.color, b.color) ? 'a' : ganaColor(b.color, a.color) ? 'b' : null
  const poderA = a.poder + (ventaja === 'a' ? bonus : 0)
  const poderB = b.poder + (ventaja === 'b' ? bonus : 0)
  return { ganador: poderA > poderB ? 'a' : poderB > poderA ? 'b' : 'empate', poderA, poderB, ventaja }
}

// ─── Azar con semilla ────────────────────────────────────────────────────────
// mulberry32: la misma semilla da siempre la misma partida (repeticiones).

export type Rng = () => number

export function crearRng(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function mezclar<T>(xs: readonly T[], rng: Rng): T[] {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ─── Estado de una partida (paso a paso) ─────────────────────────────────────
// La pantalla de la arena juega ronda por ronda (un humano elige con un clic,
// la elegir() del alumno tarda): por eso el motor es un estado + jugarRonda().
// jugarPartida() lo recorre entero para las estrategias que deciden al toque.

export interface RondaJugada extends ResultadoRonda {
  numero: number
  cartaA: Carta
  cartaB: Carta
}

export interface EstadoPartida {
  manoA: Carta[]
  manoB: Carta[]
  rondas: RondaJugada[]
  puntosA: number
  puntosB: number
  /** null mientras se juega. */
  ganador: Resultado | null
}

export function crearPartida(mazoA: Carta[], mazoB: Carta[]): EstadoPartida {
  return { manoA: [...mazoA], manoB: [...mazoB], rondas: [], puntosA: 0, puntosB: 0, ganador: null }
}

/** Juega una ronda con las cartas elegidas (tienen que estar en cada mano). */
export function jugarRonda(e: EstadoPartida, cartaA: Carta, cartaB: Carta, bonus: number = REGLAS.ventaja): EstadoPartida {
  if (e.ganador) throw new Error('La partida ya terminó')
  if (!e.manoA.some((c) => c.id === cartaA.id)) throw new Error(`La carta ${cartaA.nombre} no está en la mano A`)
  if (!e.manoB.some((c) => c.id === cartaB.id)) throw new Error(`La carta ${cartaB.nombre} no está en la mano B`)
  const r = resolverRonda(cartaA, cartaB, bonus)
  const rondas = [...e.rondas, { ...r, numero: e.rondas.length + 1, cartaA, cartaB }]
  const puntosA = e.puntosA + (r.ganador === 'a' ? 1 : 0)
  const puntosB = e.puntosB + (r.ganador === 'b' ? 1 : 0)
  const fin = rondas.length >= REGLAS.rondas
  return {
    manoA: e.manoA.filter((c) => c.id !== cartaA.id),
    manoB: e.manoB.filter((c) => c.id !== cartaB.id),
    rondas,
    puntosA,
    puntosB,
    ganador: fin ? (puntosA > puntosB ? 'a' : puntosB > puntosA ? 'b' : 'empate') : null,
  }
}

// ─── Estrategias (quién decide cada carta) ───────────────────────────────────

export interface ContextoEleccion {
  mano: Carta[]
  manoRival: Carta[]
  /** 1 a REGLAS.rondas */
  ronda: number
  rng: Rng
}

export type Estrategia = (ctx: ContextoEleccion) => Carta

/** Por defecto: la de más poder primero (la más débil queda afuera). */
export const porPoder: Estrategia = ({ mano }) =>
  mano.reduce((mejor, c) => (c.poder > mejor.poder || (c.poder === mejor.poder && c.id < mejor.id) ? c : mejor))

/** Al azar (para la simulación y la CPU más floja). */
export const alAzar: Estrategia = ({ mano, rng }) => mano[Math.floor(rng() * mano.length)]

/** El "orden de batalla" del alumno (su consulta ORDER BY guardada): juega la
 *  primera carta de la lista que todavía tenga en la mano. Si la lista no
 *  sirve (ids que ya no están), cae en porPoder. */
export function enOrden(ids: number[]): Estrategia {
  return (ctx) => {
    for (const id of ids) {
      const c = ctx.mano.find((x) => x.id === id)
      if (c) return c
    }
    return porPoder(ctx)
  }
}

/** Estrategia que mira la mano rival: si puede ganarle por color a la carta
 *  más fuerte que le queda al rival, la usa; si no, juega por poder. La usa el
 *  mazo de práctica "Jefe de práctica". */
export const astuta: Estrategia = (ctx) => {
  const fuerte = porPoder({ ...ctx, mano: ctx.manoRival })
  const contra = ctx.mano
    .filter((c) => ganaColor(c.color, fuerte.color) && c.poder + REGLAS.ventaja > fuerte.poder)
    .sort((x, y) => x.poder - y.poder)[0]
  return contra ?? porPoder(ctx)
}

export interface RegistroPartida {
  seed: number
  rondas: RondaJugada[]
  /** Cartas que quedaron sin jugar (una por lado). */
  sinJugarA: Carta[]
  sinJugarB: Carta[]
  puntosA: number
  puntosB: number
  ganador: Resultado
}

/** Juega una partida entera con dos estrategias. Determinista con la semilla.
 *  Si una estrategia devuelve una carta que no está en la mano, se usa porPoder
 *  (el árbitro es la plataforma, nunca el código del alumno). */
export function jugarPartida(
  mazoA: Carta[], mazoB: Carta[], estrategiaA: Estrategia, estrategiaB: Estrategia, seed: number,
  bonus: number = REGLAS.ventaja,
): RegistroPartida {
  const rng = crearRng(seed)
  let e = crearPartida(mazoA, mazoB)
  const segura = (est: Estrategia, ctx: ContextoEleccion): Carta => {
    try {
      const c = est(ctx)
      const enMano = c && ctx.mano.find((x) => x.id === c.id)
      if (enMano) return enMano
    } catch { /* cae en el respaldo */ }
    return porPoder(ctx)
  }
  while (!e.ganador) {
    const ronda = e.rondas.length + 1
    const a = segura(estrategiaA, { mano: e.manoA, manoRival: e.manoB, ronda, rng })
    const b = segura(estrategiaB, { mano: e.manoB, manoRival: e.manoA, ronda, rng })
    e = jugarRonda(e, a, b, bonus)
  }
  return {
    seed, rondas: e.rondas, sinJugarA: e.manoA, sinJugarB: e.manoB,
    puntosA: e.puntosA, puntosB: e.puntosB, ganador: e.ganador,
  }
}

/** La carta que más rondas ganó en una lista de partidas (la "carta destacada"). */
export function cartaDestacada(registros: RegistroPartida[], lado: (r: RegistroPartida) => Lado): number | null {
  const ganadas = new Map<number, number>()
  for (const r of registros) {
    const l = lado(r)
    for (const ro of r.rondas) {
      if (ro.ganador !== l) continue
      const id = (l === 'a' ? ro.cartaA : ro.cartaB).id
      ganadas.set(id, (ganadas.get(id) ?? 0) + 1)
    }
  }
  let mejor: number | null = null
  ganadas.forEach((n, id) => { if (mejor === null || n > (ganadas.get(mejor) ?? 0)) mejor = id })
  return mejor
}

// ─── Tablas `reglas` y `economia` para la base del alumno ────────────────────
// Se inyectan en el reino (solo lectura) para que el alumno las consulte con
// SQL y desde Python. Salen de REGLAS: una sola fuente de verdad.

export const TABLAS_REGLAS = ['reglas', 'economia'] as const

export function sqlTablasReglas(): string {
  const filas = RAREZAS.map((r) => `('${r}', ${REGLAS.rarezas[r].poderMax}, ${REGLAS.rarezas[r].maxCartas})`).join(', ')
  return [
    'CREATE TABLE reglas (rareza TEXT PRIMARY KEY, poder_max INTEGER, max_cartas INTEGER);',
    `INSERT INTO reglas VALUES ${filas};`,
    'CREATE TABLE economia (clave TEXT PRIMARY KEY, valor INTEGER);',
    `INSERT INTO economia VALUES ('presupuesto', ${REGLAS.presupuesto}), ('cartas_por_mazo', ${REGLAS.cartasPorMazo}), ('ventaja', ${REGLAS.ventaja});`,
  ].join('\n')
}

/** Una carta como fila de la tabla (para dibujarla con CartaPixel). */
export function filaDeCarta(c: Carta): Fila {
  const f: Fila = { id: c.id, nombre: c.nombre, tipo: c.tipo, poder: c.poder, rareza: c.rareza, color: c.color }
  if (c.extra) f[c.extra.columna] = c.extra.valor
  return f
}
