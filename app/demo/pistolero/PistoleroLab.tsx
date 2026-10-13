'use client'

import { useState } from 'react'
import Link from 'next/link'
import PistoleroStage, { type StageCue } from '@/components/game/raid/PistoleroStage'
import { PISTOLERO_INFO, PISTOLERO_PALETTE, POSES, type PistoleroPose } from '@/lib/game/raid/pistolero-art'

// Colores de la vitrina: la paleta del Pistolero (hueso · brasa · metal · polvo)
const P = PISTOLERO_PALETTE
import { ATTACKS, PISTOLERO_LINES, pickLine } from '@/lib/game/raid/pistolero'

const btn = (active: boolean): React.CSSProperties => ({
  padding: '5px 12px', border: `1px solid ${active ? P[2] : P[3]}`, background: active ? P[2] : 'transparent',
  color: active ? '#000' : P[0], cursor: 'pointer', fontFamily: 'monospace', fontSize: 13,
})

const ALL_POSES = Object.keys(POSES).filter((p) => p !== 'idle' && p !== 'retirada') as PistoleroPose[]

// Vitrina (solo docente): El Pistolero, sus poses y los ataques
// tal como los van a ver los alumnos. Nada se guarda.
export default function PistoleroLab() {
  const [cue, setCue] = useState<StageCue | null>(null)
  const [hurt, setHurt] = useState(0)
  const [hp, setHp] = useState(100)
  const [line, setLine] = useState<string | null>(null)
  const [retired, setRetired] = useState(false)
  const info = PISTOLERO_INFO

  const play = (poses: PistoleroPose[], fx?: StageCue['fx'], say?: string) => {
    setRetired(false)
    setCue({ n: Date.now(), poses, fx })
    if (say) setLine(say)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: P[0], fontFamily: 'monospace', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <Link href="/demo" style={{ color: P[3], fontSize: 12 }}>← Demo</Link>{' · '}<Link href="/demo/pistolero/mesa" style={{ color: P[3], fontSize: 12 }}>ensayar la Mesa del Pistolero →</Link>{' · '}<Link href="/demo/pistolero/alumno" style={{ color: P[3], fontSize: 12 }}>vista del alumno →</Link>
        <h1 style={{ fontSize: 22, margin: '12px 0 4px', color: P[2] }}>Laboratorio · El Pistolero</h1>
        <p style={{ color: P[3], fontSize: 13, margin: '0 0 18px', maxWidth: '80ch' }}>
          <b style={{ color: info.color }}>{info.name}</b>. {info.blurb} Arte ASCII hecho con código, con el doble de resolución que los
          jefes secretos y cuatro tintas:{' '}
          {PISTOLERO_PALETTE.map((c, i) => <span key={c} style={{ color: c }}>{['hueso', 'brasa', 'metal', 'polvo'][i]}{i < 3 ? ' · ' : ''}</span>)}.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }} className="pist-lab-grid">
          <PistoleroStage cue={cue} hurtSignal={hurt} integrity={hp / 100} line={line} retired={retired} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: 12 }}>
            <section>
              <div style={{ color: P[2], marginBottom: 8 }}>ATAQUES (botones del docente)</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {ATTACKS.map((a) => (
                  <button key={a.id} type="button" style={{ ...btn(false), textAlign: 'left' }} onClick={() => play(a.poses, a.fx, pickLine(a.lines))}>
                    <span style={{ color: info.color }}>{a.name}</span> <span style={{ color: P[3] }}>· {a.hint}{a.maxUses ? ` · ${a.maxUses} por evento` : ''}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div style={{ color: P[2], marginBottom: 8 }}>POSES SUELTAS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ALL_POSES.map((p) => <button key={p} type="button" style={btn(false)} onClick={() => play([p])}>{POSES[p].label}</button>)}
              </div>
            </section>

            <section>
              <div style={{ color: P[2], marginBottom: 8 }}>EVENTO</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button type="button" style={btn(false)} onClick={() => play(['desenfundar', 'giro'], 'none', pickLine(PISTOLERO_LINES.intro))}>aparece</button>
                <button type="button" style={btn(false)} onClick={() => { setHurt((h) => h + 1); setHp((v) => Math.max(0, v - 8)); setLine(pickLine(PISTOLERO_LINES.hurt)) }}>recibe un acierto</button>
                <button type="button" style={btn(false)} onClick={() => play(['giro'], 'none', pickLine(PISTOLERO_LINES.miss))}>alguien falla</button>
                <button type="button" style={btn(false)} onClick={() => { setLine(PISTOLERO_LINES.victory.join(' ')); play(['giro', 'saludo']) }}>gana él</button>
                <button type="button" style={btn(false)} onClick={() => { setLine(PISTOLERO_LINES.defeat.join(' ')); setRetired(true) }}>lo derrotan (retirada)</button>
                <button type="button" style={btn(false)} onClick={() => { setRetired(false); setHp(100); setLine(null); setCue(null) }}>reiniciar</button>
              </div>
            </section>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              VIDA {hp}%
              <input type="range" min={0} max={100} value={hp} onChange={(e) => setHp(Number(e.target.value))} />
            </label>
          </div>
        </div>
      </div>
      <style>{'@media (max-width: 760px) { .pist-lab-grid { grid-template-columns: 1fr !important; } }'}</style>
    </div>
  )
}
