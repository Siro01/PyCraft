'use client'

import { useId, type CSSProperties } from 'react'
import { COLUMNAS_FIJAS, leerColor, leerPoder, leerRareza, type Color, type Fila, type Rareza } from '@/lib/game/cartas/reglas'
import { FRENTE, REVERSO, estaVacio, type ArteCarta } from '@/lib/game/cartas/paleta'
import { DORSO_PYCRAFT } from '@/lib/game/cartas/plantillas-arte'
import PixelArte from './PixelArte'

// ─── Una carta del mazo, 1-bit ───────────────────────────────────────────────
// Se dibuja con los tokens del tema (tinta sobre papel), sin degradados ni
// redondeos. Manda el poder (insignia invertida arriba a la derecha) y el
// nombre; el fondo del arte es la trama de su color de batalla (más suave si
// hay dibujo, para que el dibujo se lea). La rareza se ve dos veces: en el
// marco (común: simple · rara: doble · épica: doble con muescas · legendaria:
// épica + borde animado) y en marcas ▪ (1 a 4), que se leen aun en miniatura.
// Lee la fila tal como está en la tabla: si un valor no se entiende, se
// dibuja igual con un "?".

export type TamanoCarta = 'mini' | 'chica' | 'normal' | 'grande'

const ANCHO: Record<TamanoCarta, number> = { mini: 48, chica: 120, normal: 160, grande: 240 }

const TX = 'hsl(var(--tx))'
const TINTA = TX
const BG = 'hsl(var(--bg))'

/** El patrón de cada color de batalla, para usar dentro de un <svg>. */
export function TramaPattern({ id, color, celda = 6, tinta }: { id: string; color: Color | null; celda?: number; tinta?: string }) {
  const c = celda
  const TX = tinta ?? TINTA
  return (
    <pattern id={id} width={c * 2} height={c * 2} patternUnits="userSpaceOnUse">
      <rect width={c * 2} height={c * 2} fill={BG} />
      {color === 'liso' && <rect width={c * 2} height={c * 2} fill="hsl(var(--surface2))" />}
      {color === 'rayas' && (
        <>
          <rect x={0} y={0} width={c * 2} height={Math.max(1, c / 3)} fill={TX} />
          <rect x={0} y={c} width={c * 2} height={Math.max(1, c / 3)} fill={TX} />
        </>
      )}
      {color === 'damero' && (
        <>
          <rect x={0} y={0} width={c} height={c} fill={TX} />
          <rect x={c} y={c} width={c} height={c} fill={TX} />
        </>
      )}
      {color === 'ondas' && (
        <path
          d={`M0 ${c * 0.6} L${c * 0.5} ${c * 0.2} L${c} ${c * 0.6} L${c * 1.5} ${c * 0.2} L${c * 2} ${c * 0.6} M0 ${c * 1.6} L${c * 0.5} ${c * 1.2} L${c} ${c * 1.6} L${c * 1.5} ${c * 1.2} L${c * 2} ${c * 1.6}`}
          stroke={TX} strokeWidth={Math.max(1, c / 4)} fill="none" shapeRendering="crispEdges"
        />
      )}
      {color === null && <text x={c * 0.5} y={c * 1.4} fontSize={c} fill="hsl(var(--tx3))" fontFamily="monospace">?</text>}
    </pattern>
  )
}

/** Cuadradito con la trama del color: el "ícono del elemento". */
export function IconoColor({ color, size = 14 }: { color: Color | null; size?: number }) {
  const id = `ic-${useId().replace(/:/g, '')}`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={{ flexShrink: 0 }}>
      <defs><TramaPattern id={id} color={color} celda={Math.max(2, Math.round(size / 5))} /></defs>
      <rect x={1} y={1} width={size - 2} height={size - 2} fill={`url(#${id})`} stroke={TX} strokeWidth={2} />
    </svg>
  )
}

/** Cuántas marcas ▪ lleva cada rareza. */
const MARCAS: Record<Rareza, number> = { comun: 1, rara: 2, epica: 3, legendaria: 4 }

/** Las marcas de rareza: un cuadradito por nivel (común 1 … legendaria 4). */
export function MarcasRareza({ rareza, size = 6, color = TX }: { rareza: Rareza | null; size?: number; color?: string }) {
  const n = rareza ? MARCAS[rareza] : 0
  return (
    <span aria-hidden className="flex items-center" style={{ gap: Math.max(1, Math.round(size / 3)) }}>
      {Array.from({ length: n }, (_, i) => <span key={i} style={{ width: size, height: size, background: color, flexShrink: 0 }} />)}
    </span>
  )
}

function marco(rareza: Rareza | null, k: number): CSSProperties {
  const m = Math.max(4, Math.round(8 * k))
  const muescas = `polygon(${m}px 0, calc(100% - ${m}px) 0, calc(100% - ${m}px) ${m / 2}px, 100% ${m / 2}px, 100% calc(100% - ${m / 2}px), calc(100% - ${m}px) calc(100% - ${m / 2}px), calc(100% - ${m}px) 100%, ${m}px 100%, ${m}px calc(100% - ${m / 2}px), 0 calc(100% - ${m / 2}px), 0 ${m / 2}px, ${m}px ${m / 2}px)`
  switch (rareza) {
    case 'rara': return { border: `${Math.max(4, Math.round(6 * k))}px double ${TX}` }
    case 'epica':
    case 'legendaria': return { border: `${Math.max(4, Math.round(6 * k))}px double ${TX}`, clipPath: muescas }
    default: return { border: `${Math.max(1, Math.round(2 * k))}px solid ${TX}` }
  }
}

export interface CartaPixelProps {
  fila: Fila | null
  tamano?: TamanoCarta
  /** La carta rompe alguna regla: marca ✘. */
  rota?: boolean
  bocaAbajo?: boolean
  /** Ranura vacía (contorno punteado). */
  vacia?: boolean
  /** El dibujo del alumno para esta carta (si no hay, va la inicial). */
  arte?: ArteCarta | null
  /** El dorso del mazo (boca abajo). null = el de PyCraft. */
  reverso?: string | null
  /** Ancho en px (pisa a `tamano`). Debajo de 100 px se dibuja compacta. */
  ancho?: number
  style?: CSSProperties
}

export default function CartaPixel({ fila, tamano = 'normal', rota = false, bocaAbajo = false, vacia = false, arte = null, reverso = null, ancho, style }: CartaPixelProps) {
  const pid = `tr-${useId().replace(/:/g, '')}`
  const w = ancho ?? ANCHO[tamano]
  const h = Math.round(w * 1.4)
  const k = w / 160
  const caja: CSSProperties = { width: w, height: h, position: 'relative', flexShrink: 0, ...style }

  if (bocaAbajo) {
    return (
      <div style={{ ...caja, border: `${Math.max(2, Math.round(3 * k))}px solid ${TX}`, boxShadow: `${Math.round(4 * k)}px ${Math.round(4 * k)}px 0 hsl(var(--tx) / 0.25)`, background: BG }} aria-label="Carta boca abajo">
        <PixelArte p={reverso && !estaVacio(reverso) ? reverso : DORSO_PYCRAFT} w={REVERSO.w} h={REVERSO.h} ajuste="none" />
      </div>
    )
  }

  if (vacia || !fila) {
    return (
      <div style={{ ...caja, border: `${Math.max(1, Math.round(2 * k))}px dashed hsl(var(--tx3))`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {w >= 100 && <span style={{ fontFamily: 'var(--font-text), monospace', fontSize: 18 * k, color: 'hsl(var(--tx3))' }}>vacía</span>}
      </div>
    )
  }

  const nombre = String(fila.nombre ?? '').trim() || '¿sin nombre?'
  const tipo = String(fila.tipo ?? '').trim()
  const rareza = leerRareza(fila.rareza)
  const color = leerColor(fila.color)
  const poder = leerPoder(fila.poder)
  const extraCol = Object.keys(fila).find((c) => !(COLUMNAS_FIJAS as readonly string[]).includes(c.toLowerCase()))
  const extra = extraCol ? `${extraCol}: ${String(fila[extraCol] ?? '')}` : null
  // Compacta (miniaturas y manos chicas): arte + una franja con poder y rareza.
  const mini = w < 100
  const inicial = nombre.charAt(0).toUpperCase()
  const conArte = !!arte && !estaVacio(arte.p)
  const franja = Math.max(11, Math.round(w * 0.24))
  const jersey = 'var(--font-jersey), monospace'
  const vt = 'var(--font-text), monospace'
  const sombra = Math.max(2, Math.round(4 * k))

  return (
    <div
      style={{
        ...caja,
        background: BG,
        ...marco(rareza, k),
        boxShadow: `${sombra}px ${sombra}px 0 hsl(var(--tx) / 0.25)`,
        display: 'flex', flexDirection: 'column',
        padding: mini ? 0 : Math.round(8 * k),
        gap: mini ? 0 : Math.round(5 * k),
        color: TX,
        boxSizing: 'border-box',
      }}
      aria-label={`${nombre}: poder ${poder ?? '?'}, ${rareza ?? 'rareza desconocida'}, color ${color ?? 'desconocido'}${rota ? '. Rompe una regla' : ''}`}
    >
      {!mini && (
        <div className="flex items-start justify-between" style={{ minWidth: 0, gap: Math.round(6 * k) }}>
          <span className="truncate" style={{ fontFamily: jersey, fontSize: 22 * k, lineHeight: 1, paddingTop: Math.round(2 * k) }}>{nombre}</span>
          <span style={{
            fontFamily: jersey, fontSize: 26 * k, lineHeight: 1, minWidth: Math.round(28 * k), textAlign: 'center', flexShrink: 0,
            background: TX, color: BG, padding: `${Math.round(2 * k)}px ${Math.round(5 * k)}px`,
          }}>{poder ?? '?'}</span>
        </div>
      )}
      {!mini && (
        <div className="flex items-center justify-between" style={{ fontFamily: vt, fontSize: 15 * k, lineHeight: 1, color: 'hsl(var(--tx2))', gap: Math.round(6 * k), minWidth: 0 }}>
          <span className="flex items-center" style={{ gap: Math.round(4 * k), flexShrink: 0 }}>
            <MarcasRareza rareza={rareza} size={Math.max(4, Math.round(6 * k))} color="hsl(var(--tx2))" />
            {rareza ?? '¿rareza?'}
          </span>
          <span className="truncate" style={{ color: 'hsl(var(--tx3))' }}>{tipo || '—'}</span>
        </div>
      )}

      {/* Arte: la trama del color de batalla + el dibujo del alumno (o la inicial) */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, border: mini ? 'none' : `${Math.max(1, Math.round(2 * k))}px solid ${TX}` }}>
        <svg width="100%" height="100%" style={{ display: 'block' }} aria-hidden>
          <defs><TramaPattern id={pid} color={color} celda={Math.max(2, Math.round(6 * k))} tinta={conArte && !mini ? 'hsl(var(--tx) / 0.3)' : undefined} /></defs>
          <rect width="100%" height="100%" fill={arte?.liso && conArte ? BG : `url(#${pid})`} />
        </svg>
        {conArte ? (
          <div style={{ position: 'absolute', inset: mini ? 2 : Math.round(4 * k) }}>
            <PixelArte p={arte!.p} w={FRENTE.w} h={FRENTE.h} />
          </div>
        ) : <span style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          fontFamily: jersey, fontSize: mini ? w * 0.42 : 56 * k, lineHeight: 1,
          background: BG, color: TX, padding: mini ? '0 3px' : `${Math.round(2 * k)}px ${Math.round(8 * k)}px`,
          border: `${Math.max(1, Math.round(2 * k))}px solid ${TX}`,
        }}>{inicial}</span>}
      </div>

      {mini ? (
        /* Franja de la miniatura: poder a la izquierda, rareza a la derecha */
        <div className="flex items-center justify-between" style={{ height: franja, flexShrink: 0, background: TX, color: BG, padding: '0 3px' }} aria-hidden>
          <span style={{ fontFamily: jersey, fontSize: franja * 0.95, lineHeight: 1 }}>{poder ?? '?'}</span>
          <MarcasRareza rareza={rareza} size={Math.max(2, Math.round(franja / 4))} color={BG} />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-1" style={{ fontFamily: vt, fontSize: 14 * k, lineHeight: 1, minWidth: 0 }}>
            <span className="flex items-center gap-1 min-w-0">
              <IconoColor color={color} size={Math.max(10, Math.round(14 * k))} />
              <span className="truncate">{color ?? String(fila.color ?? '?')}</span>
            </span>
            <span style={{ color: 'hsl(var(--tx3))' }}>#{String(fila.id ?? '')}</span>
          </div>
          {extra && <div className="truncate" style={{ fontFamily: vt, fontSize: 14 * k, lineHeight: 1, color: 'hsl(var(--tx2))' }}>{extra}</div>}
        </>
      )}

      {rareza === 'legendaria' && (
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 2, width: 'calc(100% - 4px)', height: 'calc(100% - 4px)', pointerEvents: 'none' }}>
          <rect className="carta-ants" x={0.5} y={0.5} width={99} height={99} fill="none" stroke={TX} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
        </svg>
      )}

      {rota && (
        <span
          title="Rompe una regla"
          style={{
            // Abajo a la derecha y chico: arriba tapaba el poder
            position: 'absolute', bottom: mini ? -2 : 4 * k, right: mini ? -2 : 4 * k,
            fontFamily: 'var(--font-jersey), monospace', fontSize: mini ? 11 : Math.max(12, 14 * k), lineHeight: 1,
            background: 'hsl(var(--danger))', color: BG, padding: '1px 3px', border: `1px solid ${TX}`,
          }}
        >✘</span>
      )}
    </div>
  )
}
