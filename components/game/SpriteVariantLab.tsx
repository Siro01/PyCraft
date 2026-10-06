'use client'

import Win from '@/components/ui/Win'
import StripSprite from '@/components/game/StripSprite'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

interface Variant {
  id: string
  name: string
  note: string
}

interface Props {
  /** Título de la ventana, ej. GOLEM_REDISENO.SYS */
  windowTitle: string
  heading: string
  intro: string
  variants: Variant[]
  active: string | null
  src: (id: string, defeated?: boolean) => string
  frames: number
  frameMs: number
  /** Fondo detrás de los sprites (oscuro, como la arena de combate). */
  bg: string
}

/** Sandbox para elegir entre propuestas de sprite de un jefe: batalla, chico y derrotado. */
export default function SpriteVariantLab({ windowTitle, heading, intro, variants, active, src, frames, frameMs, bg }: Props) {
  return (
    <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-4">
      <Win title={windowTitle} active bodyStyle={{ padding: 14 }}>
        <h1 style={{ fontFamily: jersey, fontSize: 30, lineHeight: 1, color: 'hsl(var(--tx))' }}>{heading}</h1>
        <p className="mt-1.5" style={{ fontFamily: vt, fontSize: 20, lineHeight: 1.2, color: 'hsl(var(--tx2))', maxWidth: '72ch' }}>
          {intro}
        </p>
      </Win>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {variants.map((v, i) => (
          <Win key={v.id} title={`OPCION_${i + 1}_${v.id.toUpperCase()}.PNG`} active={v.id === active} bodyStyle={{ padding: 0 }}>
            <div className="flex items-end justify-center gap-3 flex-wrap" style={{ background: bg, padding: '18px 10px 12px' }}>
              <StripSprite src={src(v.id)} frames={frames} frameMs={frameMs} px={128} label={v.name} />
              <StripSprite src={src(v.id)} frames={frames} frameMs={frameMs} px={64} label={v.name} />
              <StripSprite src={src(v.id, true)} frames={1} frameMs={frameMs} px={64} label={`${v.name} derrotado`} />
            </div>
            <div style={{ padding: '10px 12px', borderTop: '2px solid hsl(var(--tx))' }}>
              <div style={{ fontFamily: jersey, fontSize: 20, color: 'hsl(var(--tx))' }}>
                {i + 1}. {v.name}{v.id === active ? ' · en el juego' : ''}
              </div>
              <p style={{ fontFamily: vt, fontSize: 17, lineHeight: 1.15, color: 'hsl(var(--tx2))' }}>{v.note}</p>
            </div>
          </Win>
        ))}
      </div>
    </main>
  )
}
