'use client'

import { useMemo, useState } from 'react'
import Win from '@/components/ui/Win'
import CombatArena from '@/components/game/CombatArena'
import { ItemSprite, itemSpriteKey } from '@/components/game/items/ItemSprites'
import { BOSSES } from '@/lib/game/bosses'
import { getChallengesForBoss } from '@/lib/game/challenges'
import { BATTLE_ITEMS } from '@/lib/game/shop'
import type { ChallengeTier } from '@/types'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'
const mono = "'Courier New', Courier, monospace"

const TIERS: { id: ChallengeTier; label: string; note: string }[] = [
  { id: 'junior', label: 'Junior', note: 'sin vida — la Mandarina da Armadura' },
  { id: 'trainee', label: 'Trainee', note: 'con vida — la Mandarina cura' },
  { id: 'senior', label: 'Senior', note: 'sin vida' },
]

/** Tramo de jefes en el que el ítem se vuelve alcanzable (planificacion/items.md). */
function tramo(price: number): string {
  if (price <= 25) return 'T1'
  if (price <= 50) return 'T2'
  if (price <= 85) return 'T3'
  if (price <= 130) return 'T4'
  return 'T5'
}

export default function ItemsLab() {
  const [bossId, setBossId] = useState('creeper-formulario')
  const [tier, setTier] = useState<ChallengeTier>('trainee')
  const [run, setRun] = useState(0)

  const boss = BOSSES.find((b) => b.id === bossId) ?? BOSSES[0]
  const challenges = useMemo(() => getChallengesForBoss(boss.id, tier), [boss.id, tier])
  const items = useMemo(() => [...BATTLE_ITEMS].sort((a, b) => a.price - b.price), [])

  const select: React.CSSProperties = {
    fontFamily: jersey, fontSize: 16, padding: '4px 8px', border: '2px solid hsl(var(--tx))',
    background: 'hsl(var(--surface))', color: 'hsl(var(--tx))', borderRadius: 0,
  }

  return (
    <div className="flex flex-col gap-4">
      <Win title="BANCO_DE_ITEMS.SYS" active bodyStyle={{ padding: 14 }}>
        <h1 style={{ fontFamily: jersey, fontSize: 30, lineHeight: 1, color: 'hsl(var(--tx))' }}>Probá los 14 ítems</h1>
        <p className="mt-1.5" style={{ fontFamily: vt, fontSize: 20, lineHeight: 1.2, color: 'hsl(var(--tx2))', maxWidth: '70ch' }}>
          Elegí un jefe y una dificultad, subile la vida con los botones del sandbox y usá cualquier ítem escribiendo su
          {' '}<code style={{ fontFamily: mono, fontSize: 15, color: 'hsl(var(--tx))' }}>print(nombre)</code> en INVENTARIO.PY. Acá nada se gasta ni se guarda.
        </p>
        <div className="flex flex-wrap items-end gap-3 mt-3">
          <label className="flex flex-col gap-1">
            <span className="label-mono">Jefe</span>
            <select value={bossId} onChange={(e) => { setBossId(e.target.value); setRun((r) => r + 1) }} style={select}>
              {BOSSES.map((b) => <option key={b.id} value={b.id}>{b.title} · {b.name}</option>)}
            </select>
          </label>
          <div className="flex flex-col gap-1">
            <span className="label-mono">Dificultad</span>
            <div className="flex" role="radiogroup" aria-label="Dificultad">
              {TIERS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={tier === t.id}
                  title={t.note}
                  onClick={() => { setTier(t.id); setRun((r) => r + 1) }}
                  style={{
                    ...select, marginLeft: t.id === 'junior' ? 0 : -2, cursor: 'pointer',
                    background: tier === t.id ? 'hsl(var(--tx))' : 'hsl(var(--surface))',
                    color: tier === t.id ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => setRun((r) => r + 1)} style={{ ...select, cursor: 'pointer' }}>
            Reiniciar pelea
          </button>
        </div>
      </Win>

      <Win title="CATALOGO_MERCADER.TXT" bodyStyle={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid hsl(var(--border2))' }}>
                {['', 'Ítem', 'Se usa con', 'Qué hace', 'Nivel', '💎'].map((h, i) => (
                  <th key={i} className="label-mono" style={{ textAlign: i >= 4 ? 'right' : 'left', padding: '8px 10px', fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const sprite = itemSpriteKey(item.glyph)
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <td style={{ padding: '6px 10px', width: 52 }}>
                      <span className="flex items-center justify-center" style={{ width: 40, height: 40, background: 'hsl(var(--surface2))', border: '2px solid hsl(var(--border2))' }}>
                        {sprite && <ItemSprite sprite={sprite} size={32} animated />}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: jersey, fontSize: 16, color: 'hsl(var(--tx))', whiteSpace: 'nowrap' }}>
                      {item.name}
                      <div className="label-mono" style={{ fontSize: 10 }}>
                        {item.perkKind === 'passive' ? 'Equipable' : item.perkKind === 'key' ? 'Historia' : 'Se gasta'} · {tramo(item.price)}
                      </div>
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: mono, fontSize: 13, color: 'hsl(var(--tx))', whiteSpace: 'nowrap' }}>print({item.printName})</td>
                    <td style={{ padding: '6px 10px', fontFamily: vt, fontSize: 17, lineHeight: 1.15, color: 'hsl(var(--tx2))' }}>{item.effectHint}</td>
                    <td className="tabular" style={{ padding: '6px 10px', textAlign: 'right', fontFamily: jersey, fontSize: 16, color: 'hsl(var(--tx))' }}>{item.level}</td>
                    <td className="tabular" style={{ padding: '6px 10px', textAlign: 'right', fontFamily: jersey, fontSize: 16, color: 'hsl(var(--accent))' }}>{item.price}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Win>

      <CombatArena
        key={`${boss.id}-${tier}-${run}`}
        boss={boss}
        challenges={challenges}
        tier={tier}
        showGuide
        sandbox
      />
    </div>
  )
}
