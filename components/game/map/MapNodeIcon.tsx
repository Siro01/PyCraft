'use client'

import { IconCheck, IconLock } from '@/components/ui/PixelIcons'
import { CHEST_CLOSED, ICON_ARROW_DOWN, PixelBitmap } from '@/components/game/architect/desktop/PixelBitmap'
import { PixelGrid } from '@/components/game/items/ItemSprites'
import BossTopicIcon from './BossTopicIcon'
import type { Boss } from '@/types'

export type NodeState = 'defeated' | 'current' | 'available' | 'locked'

// Vocabulario del mapa (como el póster de referencia, donde una ciudad es un
// cuadrado dentro de otro y un pueblo es un punto):
//   · Jefe     = cuadrado dentro de un cuadrado, con el glifo del tema adentro.
//   · Lugar    = un edificio pixel-art parado sobre la ruta (tienda, patios).
//   · Cofre    = secreto al final de un sendero punteado.
// El estado se lee por inversión de tinta, nunca por un color nuevo.

interface BossNodeProps {
  boss: Boss
  state: NodeState
  focused: boolean
  /** Lado del cuadro en px (sale del tamaño de casilla). */
  size: number
  final?: boolean
}

export function BossNode({ boss, state, focused, size, final = false }: BossNodeProps) {
  const filled = state === 'defeated'
  const current = state === 'current'
  const locked = state === 'locked'
  const b = Math.max(2, Math.round(size / 16))
  const inner = current ? 'hsl(var(--accent))' : filled ? 'hsl(var(--tx))' : 'hsl(var(--bg))'
  const glyph = current ? 'var(--on-accent)' : filled ? 'hsl(var(--bg))' : locked ? 'hsl(var(--tx3))' : 'hsl(var(--tx))'
  const badge = Math.max(12, Math.round(size * 0.34))

  return (
    <div style={{ position: 'relative', width: size, height: size }} aria-hidden="true">
      {/* Flecha que rebota sobre el próximo jefe — se ve desde lejos. */}
      {current && (
        <span className="map-next-arrow" style={{ position: 'absolute', left: '50%', bottom: '100%', marginBottom: 4, transform: 'translateX(-50%)' }}>
          <PixelBitmap rows={ICON_ARROW_DOWN} scale={Math.max(2, Math.round(size / 14))} ink="hsl(var(--accent))" />
        </span>
      )}
      <div
        className={`map-boss-node${current ? ' map-boss-node--current' : ''}${focused ? ' map-boss-node--focused' : ''}${final ? ' map-boss-node--final' : ''}`}
        style={{
          width: size, height: size, padding: b,
          background: 'hsl(var(--bg))',
          border: `${b}px solid ${locked ? 'hsl(var(--tx3))' : 'hsl(var(--tx))'}`,
          borderStyle: locked ? 'dashed' : 'solid',
        }}
      >
        <div
          style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: inner,
            border: `${b}px solid ${locked ? 'hsl(var(--tx3))' : 'hsl(var(--tx))'}`,
          }}
        >
          <BossTopicIcon bossId={boss.id} size={Math.max(10, Math.round(size * 0.42))} color={glyph} />
        </div>
      </div>

      {state === 'defeated' && (
        <span className="absolute" style={{ top: -badge / 3, right: -badge / 3, width: badge, height: badge, background: 'hsl(var(--bg))', border: '2px solid hsl(var(--tx))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconCheck size={Math.round(badge * 0.6)} color="hsl(var(--tx))" />
        </span>
      )}
      {locked && (
        <span className="absolute" style={{ top: -badge / 3, right: -badge / 3, width: badge, height: badge, background: 'hsl(var(--bg))', border: '2px solid hsl(var(--tx3))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconLock size={Math.round(badge * 0.6)} color="hsl(var(--tx3))" />
        </span>
      )}
    </div>
  )
}

// ── Lugares (edificios sobre la ruta) ───────────────────────────────────────
// Roles de PixelGrid: k tinta · m gris medio · f papel · a acento · w fondo.

const SHOP_FRONT = [
  '................',
  '.kkkkkkkkkkkkkk.',
  '.kfffffaafffffk.',
  '.kkkkkkkkkkkkkk.',
  'kkkkkkkkkkkkkkkk',
  'kaaffaaffaaffaak',
  'kaaffaaffaaffaak',
  '.kk.kk.kk.kk.kk.',
  '.kffffffffffffk.',
  '.kfkkkkkfkkkkfk.',
  '.kfkwawkfkffkfk.',
  '.kfkwwwkfkffkfk.',
  '.kfkkkkkfkfakfk.',
  '.kfffffffkffkfk.',
  'kkkkkkkkkkkkkkkk',
  '................',
]

const SWING = [
  '................',
  '................',
  '.kkkkkkkkkkkkkk.',
  '.kk..........kk.',
  '.k.k..k..k..k.k.',
  '.k.k..k..k..k.k.',
  '.k.k..k..k..k.k.',
  '.k.k..k..k..k.k.',
  '.k.k..k..k..k.k.',
  '.k.kaaak.kaaak.k',
  '.k.kkkkk.kkkkk.k',
  '.k............k.',
  '.k............k.',
  '.k............k.',
  'kkk..........kkk',
  '................',
]

const TERMINAL = [
  '................',
  '.kkkkkkkkkkkkkk.',
  '.kwwwwwwwwwwwwk.',
  '.kwawwwwwwwwwwk.',
  '.kwwawwwwwwwwwk.',
  '.kwawwkkkwwwwwk.',
  '.kwwwwwwwwwwwwk.',
  '.kwwwwwwwwwwwwk.',
  '.kkkkkkkkkkkkkk.',
  '.......kk.......',
  '.....kkkkkk.....',
  '................',
  '.kkkkkkkkkkkkkk.',
  '.kmkmkmkmkmkmkk.',
  '.kkkkkkkkkkkkkk.',
  '................',
]

export type PlaceKind = 'shop' | 'playground' | 'practice'
const PLACE_ROWS: Record<PlaceKind, string[]> = { shop: SHOP_FRONT, playground: SWING, practice: TERMINAL }

interface PlaceNodeProps {
  kind: PlaceKind
  open: boolean
  focused: boolean
  size: number
}

export function PlaceNode({ kind, open, focused, size }: PlaceNodeProps) {
  const badge = Math.max(12, Math.round(size * 0.3))
  return (
    <div
      className={`map-place${open ? ' map-place--open' : ''}${focused ? ' map-place--focused' : ''}${kind === 'shop' && open ? ' shop-node--open' : ''}`}
      style={{ position: 'relative', width: size, height: size, opacity: open ? 1 : 0.55 }}
      aria-hidden="true"
    >
      <PixelGrid rows={PLACE_ROWS[kind]} size={size} />
      {!open && (
        <span className="absolute" style={{ top: -badge / 4, right: -badge / 4, width: badge, height: badge, background: 'hsl(var(--bg))', border: '2px solid hsl(var(--tx))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconLock size={Math.round(badge * 0.6)} color="hsl(var(--tx))" />
        </span>
      )}
    </div>
  )
}

export function SecretNode({ focused, size, opened }: { focused: boolean; size: number; opened: boolean }) {
  const scale = Math.max(1, Math.round(size / 16))
  return (
    <div className={`map-secret${focused ? ' map-place--focused' : ''}${opened ? '' : ' map-secret--closed'}`} aria-hidden="true">
      <PixelBitmap rows={CHEST_CLOSED} scale={scale} />
    </div>
  )
}
