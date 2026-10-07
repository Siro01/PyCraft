'use client'

import { useState } from 'react'
import Win from '@/components/ui/Win'
import ChestStickerToy, { ChestSparkle } from '@/components/game/stickers/ChestStickerToy'
import ChestReveal from '@/components/game/stickers/ChestReveal'
import { ACT_LABEL, CHEST_STICKERS, type ChestAct } from '@/lib/game/chest-stickers'
import { ACT_MAPS } from '@/lib/game/act-maps'
import { sfx } from '@/lib/game/architect/sound'
import { resetChestsForDemo } from '@/lib/storage/local-store'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

const ACT_KEYS: ChestAct[] = ['python', 'sql', 'mixed', 'final']

/** Dónde está cada cofre, en palabras (para que el docente pueda guiar sin spoilear de más). */
function whereIs(id: string): string {
  for (const act of ACT_MAPS) {
    const c = act.chests.find((x) => x.id === id)
    if (!c) continue
    if (c.kind === 'cofre') return `Casilla ${c.x},${c.y} — al final del sendero punteado.`
    return c.entrance
      ? `Camino escondido desde ${c.entrance.x},${c.entrance.y} hasta ${c.x},${c.y}. Se destapa al pisarlo con las flechas.`
      : `Casilla ${c.x},${c.y}.`
  }
  return '—'
}

export default function StickersLab() {
  const [opening, setOpening] = useState<string | null>(null)
  const [resetDone, setResetDone] = useState(false)

  const reset = () => {
    resetChestsForDemo(CHEST_STICKERS.map((s) => s.id))
    sfx.trash()
    setResetDone(true)
  }

  return (
    <main className="desk relative min-h-[calc(100vh-56px)] px-4 py-6">
      <div className="flex items-center flex-wrap gap-3 mb-6">
        <span style={{ fontFamily: jersey, fontSize: 20, color: 'hsl(var(--tx))' }}>Stickers de cofre</span>
        <span style={{ fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx3))' }}>Tocalos: cada uno reacciona distinto y suelta una frase secreta si insistís.</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="inv-go" onClick={reset} style={{ background: 'hsl(var(--surface))', color: 'hsl(var(--tx))' }}>
          {resetDone ? 'Cofres cerrados' : 'Volver a cerrar los cofres (este navegador)'}
        </button>
      </div>

      <div className="flex flex-col gap-6" style={{ maxWidth: 980 }}>
        {ACT_KEYS.map((act) => (
          <Win key={act} title={`${ACT_LABEL[act].toUpperCase()} · COFRES`} active bodyStyle={{ padding: 0 }}>
            <div className="cs-lab-row">
              {CHEST_STICKERS.filter((s) => s.act === act).map((s) => (
                <section key={s.id} className="cs-lab-cell">
                  <div className="cs-lab-stage">
                    <ChestStickerToy id={s.id} size={64} demo bubble="bottom" />
                    <ChestSparkle kind={s.kind} px={9} style={{ right: 'calc(50% - 46px)', top: 18 }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontFamily: jersey, fontSize: 22, lineHeight: 1, color: 'hsl(var(--tx))' }}>{s.name}</span>
                      <span className={`cs-rarity${s.kind === 'secreto' ? ' is-secret' : ''}`}>{s.kind === 'secreto' ? 'Secreto' : 'Cofre'}</span>
                    </div>
                    <p style={{ fontFamily: vt, fontSize: 18, lineHeight: 1.1, color: 'hsl(var(--tx2))', margin: '6px 0 0' }}>{s.description}</p>
                    <p style={{ fontFamily: vt, fontSize: 16, lineHeight: 1.1, color: 'hsl(var(--tx3))', margin: '6px 0 0' }}>
                      {whereIs(s.id)}
                      {s.sealedUntil ? ' Sellado hasta vencer al Arquitecto.' : ''}
                      {` Frase secreta al toque ${s.secret.after}.`}
                    </p>
                    <button type="button" className="inv-go" style={{ marginTop: 10 }} onClick={() => setOpening(s.id)}>Ver apertura</button>
                  </div>
                </section>
              ))}
            </div>
          </Win>
        ))}
      </div>

      {opening && <ChestReveal key={opening} stickerId={opening} demo onClose={() => setOpening(null)} />}
    </main>
  )
}
