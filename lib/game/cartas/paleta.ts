// ─── La paleta PyCraft para dibujar cartas ──────────────────────────────────
// Todos los colores salen de PyCraft: los grises de los temas, el carmesí del
// tema rojo, el verde del Acto I, el celeste del Acto II, los colores de los
// jefes del Acto III y el Arquitecto, y la calabaza, el hueso y la noche de
// Halloween. Cada color tiene 3 tonos (sombra, base, luz) para sombrear.
//
// Es una paleta FIJA (como los sprites de los jefes): el dibujo del alumno se
// ve igual en los 3 temas. El marco de la carta sí usa los tokens del tema.
//
// Un dibujo es un texto de w×h caracteres, fila por fila: cada carácter es un
// color de la paleta y '.' es transparente.

export interface ColorPaleta {
  id: string
  hex: string
  rampa: string
  /** 0 = sombra · 1 = base · 2 = luz (los grises van de 0 a 4). */
  nivel: number
}

export interface Rampa {
  id: string
  nombre: string
  /** De dónde sale en PyCraft. */
  origen: string
  colores: string[]
}

export const TRANSPARENTE = '.'

export const RAMPAS: Rampa[] = [
  { id: 'tinta', nombre: 'Tinta', origen: 'los temas negro y blanco', colores: ['#0A0A0A', '#262626', '#525252', '#A3A3A3', '#F5F5F5'] },
  { id: 'noche', nombre: 'Noche', origen: 'el fondo de Halloween', colores: ['#0E0A14', '#241A33', '#3D2E57'] },
  { id: 'hueso', nombre: 'Hueso', origen: 'Rodolfo disfrazado', colores: ['#A8946E', '#F3E9D6', '#FFFBF0'] },
  { id: 'carmesi', nombre: 'Carmesí', origen: 'el tema rojo', colores: ['#9A0026', '#DC143C', '#FF3D5A'] },
  { id: 'calabaza', nombre: 'Calabaza', origen: 'Halloween', colores: ['#C2410C', '#FF7A1A', '#FFB561'] },
  { id: 'ambar', nombre: 'Ámbar', origen: 'El Arquitecto', colores: ['#B45309', '#F59E0B', '#FDE68A'] },
  { id: 'lima', nombre: 'Lima', origen: 'La Hydra', colores: ['#4D7C0F', '#A3E635', '#D9F99D'] },
  { id: 'verde', nombre: 'Verde', origen: 'el Acto I (Python)', colores: ['#15803D', '#22C55E', '#86EFAC'] },
  { id: 'celeste', nombre: 'Celeste', origen: 'el Acto II (SQL)', colores: ['#0284C7', '#38BDF8', '#BAE6FD'] },
  { id: 'violeta', nombre: 'Violeta', origen: 'El Nexo', colores: ['#6D28D9', '#A78BFA', '#DDD6FE'] },
]

const SIMBOLOS = '0123456789abcdefghijklmnopqrstuvwxyz'

/** Todos los colores, cada uno con su carácter. */
export const PALETA: ColorPaleta[] = RAMPAS.flatMap((r) => r.colores.map((hex, nivel) => ({ hex, rampa: r.id, nivel, id: '' })))
  .map((c, i) => ({ ...c, id: SIMBOLOS[i] }))

const POR_ID = new Map(PALETA.map((c) => [c.id, c]))

export function colorHex(id: string): string | null {
  return POR_ID.get(id)?.hex ?? null
}

export const colorDe = (rampa: string, nivel: number): string =>
  PALETA.find((c) => c.rampa === rampa && c.nivel === nivel)?.id ?? TRANSPARENTE

/** Un tono más oscuro de la misma rampa (para la herramienta "sombra"). */
export function oscurecer(id: string): string {
  const c = POR_ID.get(id)
  if (!c || c.nivel === 0) return id
  return colorDe(c.rampa, c.nivel - 1)
}

/** Un tono más claro de la misma rampa (herramienta "luz"). */
export function aclarar(id: string): string {
  const c = POR_ID.get(id)
  if (!c) return id
  const max = RAMPAS.find((r) => r.id === c.rampa)!.colores.length - 1
  return c.nivel >= max ? id : colorDe(c.rampa, c.nivel + 1)
}

// ─── Tamaños de los dibujos ──────────────────────────────────────────────────

export const FRENTE = { w: 16, h: 16 } as const
export const REVERSO = { w: 16, h: 22 } as const

export const vacio = (w: number, h: number) => TRANSPARENTE.repeat(w * h)

/** Deja un dibujo con el largo justo y solo caracteres de la paleta (lo que venga de la red o de una versión vieja). */
export function sanear(p: unknown, w: number, h: number): string {
  const s = typeof p === 'string' ? p : ''
  let out = ''
  for (let i = 0; i < w * h; i++) {
    const ch = s[i]
    out += ch && POR_ID.has(ch) ? ch : TRANSPARENTE
  }
  return out
}

export const estaVacio = (p: string | null | undefined) => !p || !/[^.]/.test(p)

// ─── Espejo ──────────────────────────────────────────────────────────────────

export type Espejo = 'ninguno' | 'horizontal' | 'vertical' | 'cuatro'

/** Las casillas que se pintan juntas con el espejo activo. */
export function casillasEspejo(x: number, y: number, w: number, h: number, espejo: Espejo): [number, number][] {
  const out: [number, number][] = [[x, y]]
  const mx = w - 1 - x
  const my = h - 1 - y
  if (espejo === 'horizontal' || espejo === 'cuatro') out.push([mx, y])
  if (espejo === 'vertical' || espejo === 'cuatro') out.push([x, my])
  if (espejo === 'cuatro') out.push([mx, my])
  const vistos = new Set<string>()
  return out.filter(([a, b]) => {
    const k = `${a},${b}`
    if (vistos.has(k)) return false
    vistos.add(k)
    return true
  })
}

export function pintar(p: string, w: number, h: number, x: number, y: number, color: string, espejo: Espejo): string {
  const arr = p.split('')
  for (const [a, b] of casillasEspejo(x, y, w, h, espejo)) arr[b * w + a] = color
  return arr.join('')
}

/** Balde: rellena la zona del mismo color (4 vecinos), también en sus espejos. */
export function rellenar(p: string, w: number, h: number, x: number, y: number, color: string, espejo: Espejo): string {
  const arr = p.split('')
  for (const [sx, sy] of casillasEspejo(x, y, w, h, espejo)) {
    const base = arr[sy * w + sx]
    if (base === color) continue
    const pila: [number, number][] = [[sx, sy]]
    while (pila.length) {
      const [cx, cy] = pila.pop()!
      if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue
      const i = cy * w + cx
      if (arr[i] !== base) continue
      arr[i] = color
      pila.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
    }
  }
  return arr.join('')
}

/** Arma un dibujo completo a partir de un cuarto (arriba a la izquierda), espejándolo. */
export function desdeCuarto(cuarto: string[], w: number, h: number): string {
  const rows: string[] = []
  const qh = Math.ceil(h / 2)
  const qw = Math.ceil(w / 2)
  for (let y = 0; y < h; y++) {
    const qy = y < qh ? y : h - 1 - y
    const fila = (cuarto[qy] ?? '').padEnd(qw, TRANSPARENTE).slice(0, qw)
    const derecha = fila.split('').reverse().join('').slice(w % 2)
    rows.push(fila + derecha)
  }
  return rows.join('')
}

/** Desde filas de texto (las plantillas se escriben así). */
export const desdeFilas = (filas: string[], w: number, h: number) => sanear(filas.join(''), w, h)

// ─── El volteo (la animación al darse vuelta para atacar) ───────────────────

export type EstiloVolteo = 'giro' | 'salto' | 'pixeles' | 'barrido'
export type VelocidadVolteo = 'lenta' | 'normal' | 'rapida'

export interface Volteo {
  estilo: EstiloVolteo
  /** Color de las chispas (de la paleta) o null para no tener chispas. */
  chispa: string | null
  velocidad: VelocidadVolteo
}

export const VOLTEO_DEFECTO: Volteo = { estilo: 'giro', chispa: colorDe('ambar', 2), velocidad: 'normal' }

export const ESTILOS_VOLTEO: { id: EstiloVolteo; nombre: string; detalle: string }[] = [
  { id: 'giro', nombre: 'Giro', detalle: 'Se da vuelta sobre sí misma.' },
  { id: 'salto', nombre: 'Salto', detalle: 'Salta, gira en el aire y cae.' },
  { id: 'pixeles', nombre: 'Píxeles', detalle: 'El dorso se rompe en cuadraditos.' },
  { id: 'barrido', nombre: 'Barrido', detalle: 'Una línea la descubre de arriba abajo.' },
]

export const DURACION_VOLTEO: Record<VelocidadVolteo, number> = { lenta: 900, normal: 600, rapida: 360 }

export function sanearVolteo(v: unknown): Volteo {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<Volteo>
  return {
    estilo: ESTILOS_VOLTEO.some((e) => e.id === o.estilo) ? o.estilo! : VOLTEO_DEFECTO.estilo,
    chispa: o.chispa === null ? null : typeof o.chispa === 'string' && POR_ID.has(o.chispa) ? o.chispa : VOLTEO_DEFECTO.chispa,
    velocidad: o.velocidad === 'lenta' || o.velocidad === 'rapida' || o.velocidad === 'normal' ? o.velocidad : 'normal',
  }
}

// ─── Lo que se guarda ────────────────────────────────────────────────────────

export interface ArteCarta {
  /** FRENTE.w × FRENTE.h caracteres. */
  p: string
  /** Fondo liso detrás del dibujo (en vez de la trama del color). */
  liso: boolean
}

export interface DisenosMazo {
  /** Por id de carta. Si la carta se borra, el dibujo queda guardado. */
  frente: Record<string, ArteCarta>
  /** El dorso: uno para todo el mazo (REVERSO.w × REVERSO.h), o null = el de PyCraft. */
  reverso: string | null
  volteo: Volteo
}

export const DISENOS_VACIOS: DisenosMazo = { frente: {}, reverso: null, volteo: VOLTEO_DEFECTO }

export function sanearDisenos(d: unknown): DisenosMazo {
  const o = (d && typeof d === 'object' ? d : {}) as Partial<DisenosMazo>
  const frente: Record<string, ArteCarta> = {}
  for (const [id, a] of Object.entries(o.frente ?? {})) {
    const arte = a as Partial<ArteCarta> | null
    if (!arte) continue
    frente[id] = { p: sanear(arte.p, FRENTE.w, FRENTE.h), liso: !!arte.liso }
  }
  return {
    frente,
    reverso: typeof o.reverso === 'string' && !estaVacio(o.reverso) ? sanear(o.reverso, REVERSO.w, REVERSO.h) : null,
    volteo: sanearVolteo(o.volteo),
  }
}
