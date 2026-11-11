'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { DURACION_VOLTEO, REVERSO, colorHex, estaVacio, type Volteo } from '@/lib/game/cartas/paleta'
import { DORSO_PYCRAFT } from '@/lib/game/cartas/plantillas-arte'
import { tiras } from './PixelArte'

// ─── El volteo: la carta pasa de boca abajo a boca arriba ───────────────────
// Lo elige el alumno en DISEÑO → VOLTEO (estilo, velocidad y chispas) y se ve
// en la arena cada vez que se revela una carta. Animaciones por pasos (se ven
// "pixeladas") y livianas: CSS, sin canvas. Con prefers-reduced-motion la
// carta aparece dada vuelta, sin animar.

const ANCHO = { mini: 48, chica: 120, normal: 160, grande: 240 } as const

/** El dorso en piezas de 2×2 píxeles, para el estilo "píxeles" (cada pieza se apaga a su turno). */
function DorsoEnPiezas({ p, dur }: { p: string; dur: number }) {
  const { w, h } = REVERSO
  const piezas = useMemo(() => {
    const out: { x: number; y: number; retraso: number; rects: ReturnType<typeof tiras> }[] = []
    let semilla = 7
    const azar = () => { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280 }
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        let sub = ''
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) sub += p[(y + dy) * w + x + dx] ?? '.'
        out.push({ x, y, retraso: Math.round(azar() * dur * 0.7), rects: tiras(sub, 2, 2) })
      }
    }
    return out
  }, [p, w, h, dur])
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden style={{ display: 'block' }}>
      {piezas.map((pz, i) => (
        <g key={i} className="volteo-pieza" style={{ ['--retraso' as string]: `${pz.retraso}ms` } as CSSProperties} transform={`translate(${pz.x} ${pz.y})`}>
          {pz.rects.map((r, j) => <rect key={j} x={r.x} y={r.y} width={r.n} height={1} fill={r.c} />)}
        </g>
      ))}
    </svg>
  )
}

const CHISPAS = [[0, -1], [0.7, -0.7], [1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7]]

export interface CartaVolteoProps {
  /** La carta boca arriba (un CartaPixel). */
  frente: ReactNode
  reverso: string | null
  volteo: Volteo
  tamano?: keyof typeof ANCHO
  /** false = boca abajo · true = boca arriba (al pasar a true, se voltea). */
  revelada: boolean
  /** Cambiarla vuelve a reproducir el volteo (para "Probar"). */
  repetir?: number
  /** Ancho en px (pisa a `tamano`; el frente tiene que tener el mismo). */
  ancho?: number
}

export default function CartaVolteo({ frente, reverso, volteo, tamano = 'normal', revelada, repetir = 0, ancho }: CartaVolteoProps) {
  const w = ancho ?? ANCHO[tamano]
  const h = Math.round(w * 1.4)
  const dur = DURACION_VOLTEO[volteo.velocidad]
  const dorso = reverso && !estaVacio(reverso) ? reverso : DORSO_PYCRAFT
  const [fase, setFase] = useState<'dorso' | 'andando' | 'frente'>(revelada ? 'frente' : 'dorso')

  useEffect(() => {
    if (!revelada) { setFase('dorso'); return }
    const quieto = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (quieto) { setFase('frente'); return }
    setFase('andando')
    const t = setTimeout(() => setFase('frente'), dur + 40)
    return () => clearTimeout(t)
  }, [revelada, repetir, dur])

  const chispa = volteo.chispa ? colorHex(volteo.chispa) : null
  const borde = `${Math.max(2, Math.round(3 * (w / 160)))}px solid hsl(var(--tx))`
  const caraDorso = (
    <div style={{ width: '100%', height: '100%', border: borde, background: 'hsl(var(--bg))', boxShadow: '4px 4px 0 hsl(var(--tx) / 0.25)', boxSizing: 'border-box' }}>
      {fase === 'andando' && volteo.estilo === 'pixeles'
        ? <DorsoEnPiezas p={dorso} dur={dur} />
        : <PixelArteDorso p={dorso} />}
    </div>
  )

  return (
    <div
      className={`volteo volteo--${volteo.estilo}${fase === 'andando' ? ' volteo--andando' : ''}`}
      style={{ width: w, height: h, ['--dur' as string]: `${dur}ms` } as CSSProperties}
      aria-label={fase === 'frente' ? undefined : 'Carta boca abajo'}
    >
      {/* Abajo el frente (los estilos "píxeles" y "barrido" lo descubren); arriba el dorso */}
      {fase !== 'dorso' && <div className="volteo-cara volteo-frente">{frente}</div>}
      {fase === 'dorso' && <div className="volteo-cara volteo-dorso">{caraDorso}</div>}
      {fase === 'andando' && (volteo.estilo === 'giro' || volteo.estilo === 'salto' || volteo.estilo === 'pixeles') && (
        <div className="volteo-cara volteo-dorso">{caraDorso}</div>
      )}
      {fase === 'andando' && volteo.estilo === 'barrido' && (
        <>
          <div className="volteo-cara" style={{ zIndex: -1 }}>{caraDorso}</div>
          <span className="volteo-linea" style={{ background: chispa ?? 'hsl(var(--tx))' }} />
        </>
      )}
      {fase === 'andando' && chispa && CHISPAS.map(([dx, dy], i) => (
        <span
          key={i}
          className="volteo-chispa"
          style={{ width: Math.max(3, Math.round(w / 32)), height: Math.max(3, Math.round(w / 32)), background: chispa, ['--dx' as string]: `${Math.round(dx * w * 0.6)}px`, ['--dy' as string]: `${Math.round(dy * w * 0.6)}px` } as CSSProperties}
        />
      ))}
    </div>
  )
}

function PixelArteDorso({ p }: { p: string }) {
  const rects = useMemo(() => tiras(p, REVERSO.w, REVERSO.h), [p])
  return (
    <svg viewBox={`0 0 ${REVERSO.w} ${REVERSO.h}`} width="100%" height="100%" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden style={{ display: 'block' }}>
      {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.n} height={1} fill={r.c} />)}
    </svg>
  )
}
