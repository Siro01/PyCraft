// El diamante del juego, en pixel art — reemplaza al emoji 💎 en toda la UI.
// Cada letra es un rol de color resuelto contra el tema activo (igual que los
// sprites de ítems): así se repinta solo en dark / light / red.
//   k contorno (--tx)   a cuerpo (--accent)   b facetas (--accent2)   h brillo

import { memo } from 'react'

const ROWS = [
  '...kkkkk...',
  '..kbhbabk..',
  '.kbhbaabak.',
  'kkkkkkkkkkk',
  'kaabaaabaak',
  '.kaabababk.',
  '..kaabaak..',
  '...kabak...',
  '....kak....',
  '.....k.....',
]

const ROLE: Record<string, string> = {
  k: 'hsl(var(--tx))',
  a: 'hsl(var(--accent))',
  b: 'hsl(var(--accent2))',
  h: 'hsl(0 0% 100% / 0.9)',
}

const RECTS = ROWS.flatMap((row, y) =>
  [...row].flatMap((c, x) => (ROLE[c] ? [{ x, y, fill: ROLE[c] }] : [])),
)

interface Props {
  /** Alto en px (el ancho sale de la proporción 11×10). */
  size?: number
  className?: string
  title?: string
}

function DiamondIcon({ size = 14, className, title }: Props) {
  return (
    <svg
      width={Math.round(size * 1.1)}
      height={size}
      viewBox="0 0 11 10"
      shapeRendering="crispEdges"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ display: 'inline-block', verticalAlign: '-0.12em', flexShrink: 0 }}
    >
      {RECTS.map((r) => <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={1} height={1} fill={r.fill} />)}
    </svg>
  )
}

export default memo(DiamondIcon)

/** "+10 ◆" con el ícono: para textos con cantidad de diamantes. */
export function Diamonds({ n, size = 14, sign = false }: { n: number; size?: number; sign?: boolean }) {
  const txt = sign ? (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0') : String(n)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25em', whiteSpace: 'nowrap' }}>
      {txt}<DiamondIcon size={size} title="diamantes" />
    </span>
  )
}
