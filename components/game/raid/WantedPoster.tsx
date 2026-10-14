'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import WesternText from './WesternText'
import DiamondIcon from '@/components/ui/DiamondIcon'
import { PISTOLERO_REWARD_DIAMONDS, PISTOLERO_REWARD_XP } from '@/lib/game/raid/pistolero'
import { watchSighting, type PistoleroSighting } from '@/lib/game/raid/watch-state'
import { getArenaStats } from '@/lib/storage/local-store'
import { westernSfx } from '@/lib/game/raid/western-sfx'

// El cartel de SE BUSCA del Pistolero, clavado en el mapa. Anticipa que anda
// cerca: si el aula está armada lleva el sello rojo «¡VISTO EN ESTE PUEBLO!».
// Papel viejo con bordes quemados, tinta de cartel del Oeste y los colores del
// Pistolero (brasa, hueso, polvo) — todo pixel. Al tocarlo se abre grande.
// Estilos: .wanted-* en globals.css. El retrato animado se baja recién al abrirlo.

const PistoleroStage = dynamic(() => import('./PistoleroStage'), { ssr: false })

// Retrato chico de la miniatura (16×16): sombrero, sombra, ojos de brasa y pañuelo
const BUST = [
  '................',
  '......kkkk......',
  '.....kkkkkk.....',
  '.....kkbbkk.....',
  '..kkkkkkkkkkkk..',
  '.kkkkkkkkkkkkkk.',
  '.....dddddd.....',
  '.....drddrd.....',
  '.....dddddd.....',
  '.....rrrrrr.....',
  '.....rrwrrr.....',
  '......rrrr......',
  '....kkkrrkkk....',
  '...kkkkkkkkkk...',
  '..kkkkbkkbkkkk..',
  '..kkkkkkkkkkkk..',
]
const BUST_FILL: Record<string, string> = { k: '#2A0E05', d: '#6B4A33', r: '#FF5A36', b: '#C9A27A', w: '#FFF1D0' }

/** Bordes quemados: un polígono escalonado, siempre el mismo (sin azar en cada render). */
function burntEdge(seed: number, steps = 22): string {
  const h = (i: number) => {
    let x = Math.imul(i + seed * 97, 2654435761) >>> 0
    x ^= x >>> 13
    return (x % 1000) / 1000
  }
  const pts: string[] = []
  const jag = (i: number) => (h(i) * 1.6).toFixed(1)
  for (let i = 0; i <= steps; i++) pts.push(`${((i / steps) * 100).toFixed(1)}% ${jag(i)}%`)
  for (let i = 0; i <= steps; i++) pts.push(`${(100 - +jag(i + 50) * 0.8).toFixed(1)}% ${((i / steps) * 100).toFixed(1)}%`)
  for (let i = steps; i >= 0; i--) pts.push(`${((i / steps) * 100).toFixed(1)}% ${(100 - +jag(i + 100)).toFixed(1)}%`)
  for (let i = steps; i >= 0; i--) pts.push(`${(+jag(i + 150) * 0.8).toFixed(1)}% ${((i / steps) * 100).toFixed(1)}%`)
  return `polygon(${pts.join(', ')})`
}

function useSighting(): PistoleroSighting | null {
  const [s, setS] = useState<PistoleroSighting | null>(null)
  useEffect(() => watchSighting(setS), [])
  return s
}

function useBeaten(): number {
  const [n, setN] = useState(0)
  useEffect(() => { setN(getArenaStats().pistolero ?? 0) }, [])
  return n
}

/** La miniatura clavada en el mapa. */
export function WantedPin() {
  const [open, setOpen] = useState(false)
  const sighting = useSighting()
  const beaten = useBeaten()
  const seen = !!sighting?.armed || !!sighting?.live
  const clip = useMemo(() => burntEdge(3, 12), [])

  return (
    <>
      <button
        type="button"
        className={`wanted-pin ${seen ? 'is-seen' : ''}`}
        onClick={() => { westernSfx.spurs(); setOpen(true) }}
        aria-label={`Cartel de se busca: El Pistolero. Recompensa ${PISTOLERO_REWARD_DIAMONDS} diamantes.${seen ? ' ¡Lo vieron en este pueblo!' : ''}`}
        title="SE BUSCA: El Pistolero"
      >
        <span className="wanted-nail" aria-hidden />
        <span className="wanted-paper" style={{ clipPath: clip }}>
          <WesternText text="Se busca" px={2} tone="tinta" />
          <svg viewBox="0 0 16 16" shapeRendering="crispEdges" className="wanted-bust" aria-hidden>
            {BUST.flatMap((row, y) => [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={BUST_FILL[c]} />)))}
          </svg>
          <span className="wanted-pin-prize"><DiamondIcon size={9} /> {PISTOLERO_REWARD_DIAMONDS}</span>
        </span>
        {seen && <span className="wanted-pin-stamp" aria-hidden>¡VISTO!</span>}
        {!seen && beaten > 0 && <span className="wanted-pin-stamp is-beaten" aria-hidden>×{beaten}</span>}
      </button>
      {open && <WantedModal seen={seen} live={!!sighting?.live} beaten={beaten} onClose={() => setOpen(false)} />}
    </>
  )
}

function WantedModal({ seen, live, beaten, onClose }: { seen: boolean; live: boolean; beaten: number; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  // Va directo al <body>: si naciera adentro de la ventana del mapa, los
  // stickers del escritorio y las otras ventanas le quedarían encima.
  return createPortal(
    <div className="wanted-modal" role="dialog" aria-modal="true" aria-label="Cartel de se busca" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <WantedPoster seen={seen} live={live} beaten={beaten} />
        <button type="button" className="wanted-close" onClick={onClose}>cerrar</button>
      </div>
    </div>,
    document.body,
  )
}

/** El cartel grande, con todo el detalle. */
export function WantedPoster({ seen = false, live = false, beaten = 0 }: { seen?: boolean; live?: boolean; beaten?: number }) {
  const clip = useMemo(() => burntEdge(7), [])
  return (
    <article className="wanted-poster" style={{ clipPath: clip }}>
      <div className="wanted-frame">
        <p className="wanted-kicker">¡ATENCIÓN, CAZARRECOMPENSAS!</p>
        <WesternText text="Se busca" px={7} tone="tinta" className="wanted-title" />
        <div className="wanted-rule" aria-hidden />

        <div className="wanted-body">
          <div className="wanted-photo">
            <PistoleroStage />
            <span className="wanted-photo-tag">EL PISTOLERO</span>
          </div>

          <dl className="wanted-facts">
            <dt>Alias</dt><dd>El Bandido sin Nombre</dd>
            <dt>Buscado por</dt>
            <dd>
              <ul className="wanted-crimes">
                <li>Robarle los <code>:</code> a los <code>if</code> del pueblo.</li>
                <li>Desordenar la sangría a balazos.</li>
                <li>Escribir <code>Print</code> con mayúscula, a propósito.</li>
                <li>Abrir comillas y no cerrarlas <code>&quot;nunca</code></li>
                <li>Asaltar aulas con ejercicios sorpresa.</li>
              </ul>
            </dd>
            <dt>Señas</dt>
            <dd>Sombrero con un agujero de bala, pañuelo rojo, ojos de brasa y revólver de cachas de marfil. Lo anuncian sus espuelas.</dd>
            <dt>Visto por última vez</dt>
            <dd className={live || seen ? 'wanted-alert' : undefined}>{live ? '¡AHORA MISMO, RETANDO A TU AULA!' : seen ? 'Rondando este pueblo. Puede aparecer en cualquier momento.' : 'Cabalgando en el desierto. Nadie sabe cuándo vuelve.'}</dd>
          </dl>
        </div>

        <div className="wanted-reward">
          <WesternText text={`${PISTOLERO_REWARD_DIAMONDS}`} px={6} tone="tinta" />
          <span className="wanted-reward-gem"><DiamondIcon size={30} /></span>
          <div>
            <WesternText text="Recompensa" px={3} tone="tinta" />
            <small>por cabeza · + {PISTOLERO_REWARD_XP} XP y el cartel firmado</small>
          </div>
        </div>
        <p className="wanted-foot">SI LO VES, AVISALE A TU EQUIPO · SE LO VENCE ENTRE TODOS</p>
      </div>

      {seen && <span className="wanted-stamp">¡VISTO EN<br />ESTE PUEBLO!</span>}
      {!seen && beaten > 0 && <span className="wanted-stamp is-beaten">DERROTADO<br />×{beaten}</span>}
    </article>
  )
}
