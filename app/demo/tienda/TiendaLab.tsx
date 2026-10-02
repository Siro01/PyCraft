'use client'

import { useMemo, useState } from 'react'
import Win from '@/components/ui/Win'
import ActMap from '@/components/game/map/ActMap'
import ShopApp from '@/components/game/shop/ShopApp'
import type { NodeState } from '@/components/game/map/MapNodeIcon'
import { ACT_MAPS } from '@/lib/game/act-maps'
import { BOSSES } from '@/lib/game/bosses'
import { DIAMONDS_PER_BOSS, SHOP_UNLOCK_BOSS_NUMBER } from '@/lib/game/shop'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

export default function TiendaLab() {
  const [defeated, setDefeated] = useState(2)
  const [level, setLevel] = useState(5)
  const unlocked = defeated >= SHOP_UNLOCK_BOSS_NUMBER
  const preview = useMemo(() => ({ level }), [level])

  const bossStates = useMemo(() => {
    const map: Record<string, NodeState> = {}
    BOSSES.forEach((b, i) => { map[b.id] = i < defeated ? 'defeated' : i === defeated ? 'current' : 'locked' })
    return map
  }, [defeated])

  const btn = (on: boolean): React.CSSProperties => ({
    fontFamily: jersey, fontSize: 16, minWidth: 34, padding: '3px 8px', cursor: 'pointer',
    border: '2px solid hsl(var(--tx))', marginLeft: -2,
    background: on ? 'hsl(var(--tx))' : 'hsl(var(--surface))', color: on ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
  })

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-4">
      <Win title="VISTA_PREVIA_TIENDA.SYS" active bodyStyle={{ padding: 14 }}>
        <h1 style={{ fontFamily: jersey, fontSize: 30, lineHeight: 1, color: 'hsl(var(--tx))' }}>La tienda del Mercader</h1>
        <p className="mt-1.5" style={{ fontFamily: vt, fontSize: 20, lineHeight: 1.2, color: 'hsl(var(--tx2))', maxWidth: '70ch' }}>
          Elegí cuántos jefes derrotó el alumno y su nivel. La tienda abre al derrotar al jefe {SHOP_UNLOCK_BOSS_NUMBER}.
          Las compras de esta página no se guardan.
        </p>
        <div className="flex flex-wrap items-end gap-5 mt-3">
          <div className="flex flex-col gap-1">
            <span className="label-mono">Jefes derrotados · {defeated * DIAMONDS_PER_BOSS}💎</span>
            <div className="flex flex-wrap" role="radiogroup" aria-label="Jefes derrotados" style={{ paddingLeft: 2 }}>
              {Array.from({ length: 15 }, (_, n) => (
                <button key={n} type="button" role="radio" aria-checked={defeated === n} onClick={() => setDefeated(n)} style={btn(defeated === n)}>{n}</button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="label-mono">Nivel del alumno · {level}</span>
            <input type="range" min={1} max={20} value={level} onChange={(e) => setLevel(Number(e.target.value))} style={{ width: 200, accentColor: 'hsl(var(--accent))' }} />
          </label>
        </div>
      </Win>

      <Win title={`MAPA_ACTO_1.MAP — tienda ${unlocked ? 'abierta' : 'cerrada'}`} bodyStyle={{ padding: 10 }}>
        <ActMap
          key={`map-${unlocked}`}
          act={ACT_MAPS[0]}
          bossStates={bossStates}
          playgroundReachable
          shopUnlocked={unlocked}
          onReachEdge={() => {}}
        />
        <p className="mt-2" style={{ fontFamily: vt, fontSize: 17, color: 'hsl(var(--tx3))' }}>
          Caminá con las flechas (o hacé clic) hasta la tienda — el edificio con toldo, en el claro del medio — y apretá Enter.
        </p>
      </Win>

      <ShopApp key={`shop-${unlocked}`} totalDefeated={defeated} unlocked={unlocked} preview={preview} />
    </main>
  )
}
