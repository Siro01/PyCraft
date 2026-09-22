'use client'

import { useState } from 'react'
import Link from 'next/link'
import ArchitectCanvas from '@/components/game/architect/ArchitectCanvas'
import { RENDER_MODES, type RenderMode } from '@/lib/game/architect/render'

const TINTS = [
  { id: '#BFE9FF', label: 'Azul fósforo' },
  { id: '#FFFFFF', label: 'Blanco' },
  { id: '#F59E0B', label: 'Ámbar' },
]

const btn = (active: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  border: `1px solid ${active ? '#BFE9FF' : '#333'}`,
  background: active ? '#BFE9FF22' : 'transparent',
  color: active ? '#BFE9FF' : '#888',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 13,
})

export default function ArchitectLabPage() {
  const [mode, setMode] = useState<RenderMode>('ascii')
  const [morphT, setMorphT] = useState(0)
  const [integrity, setIntegrity] = useState(100)
  const [tint, setTint] = useState(TINTS[0].id)

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#ccc', fontFamily: 'monospace', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Link href="/demo" style={{ color: '#666', fontSize: 12 }}>← Demo</Link>
        <h1 style={{ fontSize: 22, margin: '12px 0 4px', color: '#fff' }}>Laboratorio · El Arquitecto</h1>
        <p style={{ color: '#777', fontSize: 13, margin: '0 0 20px' }}>
          Una sola imagen fuente por personaje, dibujada de tres maneras. Solo para revisar el diseño.
        </p>

        {/* ── Visor interactivo ─────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start' }}>
          <div style={{ maxWidth: 520 }}>
            <ArchitectCanvas mode={mode} morphT={morphT} integrity={integrity / 100} color={tint} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>MODO</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {RENDER_MODES.map((m) => (
                  <button key={m.id} style={btn(mode === m.id)} onClick={() => setMode(m.id)}>{m.label}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>COLOR</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {TINTS.map((t) => (
                  <button key={t.id} style={btn(tint === t.id)} onClick={() => setTint(t.id)}>{t.label}</button>
                ))}
              </div>
            </div>

            <label style={{ fontSize: 12 }}>
              <div style={{ color: '#666', marginBottom: 6 }}>
                TRANSICIÓN rostro → gato · {Math.round(morphT * 100)}%
              </div>
              <input type="range" min={0} max={100} value={morphT * 100}
                onChange={(e) => setMorphT(+e.target.value / 100)} style={{ width: '100%' }} />
            </label>

            <label style={{ fontSize: 12 }}>
              <div style={{ color: '#666', marginBottom: 6 }}>
                INTEGRIDAD (HP del boss) · {integrity}%
              </div>
              <input type="range" min={0} max={100} value={integrity}
                onChange={(e) => setIntegrity(+e.target.value)} style={{ width: '100%' }} />
            </label>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={btn(false)} onClick={() => { setMorphT(0); setIntegrity(100); setTint(TINTS[0].id) }}>Arquitecto I</button>
              <button style={btn(false)} onClick={() => { setMorphT(1); setIntegrity(100); setTint(TINTS[1].id) }}>Gato</button>
              <button style={btn(false)} onClick={() => { setMorphT(1); setIntegrity(100); setTint(TINTS[2].id) }}>Gato ámbar</button>
            </div>
          </div>
        </div>

        {/* ── Galería: los 3 modos de cada personaje ───────────────────── */}
        <h2 style={{ fontSize: 14, color: '#888', margin: '40px 0 12px', letterSpacing: '0.1em' }}>ARQUITECTO I</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {RENDER_MODES.map((m) => (
            <div key={m.id}>
              <ArchitectCanvas mode={m.id} morphT={0} label={`Arquitecto I · ${m.label}`} />
              <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>{m.label}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 14, color: '#888', margin: '32px 0 12px', letterSpacing: '0.1em' }}>EL GATO</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {RENDER_MODES.map((m) => (
            <div key={m.id}>
              <ArchitectCanvas mode={m.id} morphT={1} color="#FFFFFF" label={`Gato · ${m.label}`} />
              <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
