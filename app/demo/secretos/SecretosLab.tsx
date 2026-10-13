'use client'

import { useState } from 'react'
import Link from 'next/link'
import SecretCanvas from '@/components/game/secret/SecretCanvas'
import SecretArena from '@/components/game/secret/SecretArena'
import { RENDER_MODES, type RenderMode } from '@/lib/game/architect/render'
import { SECRET_BOSSES, SECRET_SERIES_LEN, buildSecretSeries, secretUnlock, seededRng, seriesTiers } from '@/lib/game/secret/bosses'
import type { ChallengeTier } from '@/types'
import { BOSSES } from '@/lib/game/bosses'
import { resetSecretsForDemo } from '@/lib/storage/local-store'

const btn = (active: boolean): React.CSSProperties => ({
  padding: '5px 12px', border: `1px solid ${active ? '#fff' : '#333'}`, background: active ? '#fff' : 'transparent',
  color: active ? '#000' : '#999', cursor: 'pointer', fontFamily: 'monospace', fontSize: 13,
})

export default function SecretosLab() {
  const [mode, setMode] = useState<RenderMode>('ascii')
  const [integrity, setIntegrity] = useState(100)
  const [hurt, setHurt] = useState(0)
  const [arena, setArena] = useState<string | null>(null)
  const [defeated, setDefeated] = useState(8)
  const [msg, setMsg] = useState('')
  const [tier, setTier] = useState<ChallengeTier>('trainee')

  const ids = BOSSES.slice(0, defeated).map((b) => b.id)
  const live = SECRET_BOSSES.find((s) => s.id === arena)
  if (live) {
    return (
      <div>
        <div style={{ background: '#000', borderBottom: '1px dashed #333', padding: '6px 16px', fontFamily: 'monospace', fontSize: 12, color: '#777' }}>
          SANDBOX · {defeated} jefes derrotados · nada se guarda ·{' '}
          <button type="button" style={{ ...btn(false), padding: '1px 8px' }} onClick={() => setArena(null)}>volver al lab</button>
        </div>
        <SecretArena key={`${live.id}-${defeated}-${tier}`} secret={live} defeatedIds={ids} tier={tier} sandbox adminTools exitHref="/demo/secretos" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#ccc', fontFamily: 'monospace', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <Link href="/demo" style={{ color: '#666', fontSize: 12 }}>← Demo</Link>
        <h1 style={{ fontSize: 22, margin: '12px 0 4px', color: '#fff' }}>Laboratorio · Jefes secretos</h1>
        <p style={{ color: '#777', fontSize: 13, margin: '0 0 18px', maxWidth: '80ch' }}>
          Cuatro jefes dibujados con código (grillas de luminancia, como El Arquitecto). Viven al final de un camino escondido que nace en el cofre
          secreto de cada acto y solo se puede pisar después de abrirlo.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', marginBottom: 22 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {RENDER_MODES.map((m) => <button key={m.id} type="button" style={btn(mode === m.id)} onClick={() => setMode(m.id)}>{m.label}</button>)}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            VIDA {integrity}%
            <input type="range" min={0} max={100} value={integrity} onChange={(e) => setIntegrity(Number(e.target.value))} />
          </label>
          <button type="button" style={btn(false)} onClick={() => setHurt((h) => h + 1)}>golpe</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 28 }}>
          {SECRET_BOSSES.map((s) => (
            <div key={s.id}>
              <SecretCanvas art={s.art} mode={mode} integrity={integrity / 100} color={s.color} hurtSignal={hurt} label={s.name} />
              <div style={{ marginTop: 10, color: s.color, fontSize: 18 }}>{s.name}</div>
              <div style={{ color: '#777', fontSize: 12 }}>{s.epithet}</div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>
                {s.hpMax} HP · abre con {s.minDefeated} jefes · acto {s.act}
                {` · y ${s.minActDefeated} de su acto`}
                {s.keyItem ? ` · reconoce ${s.keyItem.id === 'item-corona' ? 'la Corona' : 'las Esmeraldas'}` : ''}
              </div>
              <div style={{ color: '#666', fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
                {secretUnlock(s, ids).open ? 'serie con estos jefes:' : 'con estos jefes estaría sellada · serie igual:'}
                <br />
                {buildSecretSeries(s, ids, tier, seededRng(7)).map((c) => `${c.bossId.split('-')[0]} (${c.tier})`).join(' · ')}
              </div>
              <button type="button" style={{ ...btn(false), marginTop: 10 }} onClick={() => setArena(s.id)}>probar la arena ▸</button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 36, borderTop: '1px solid #222', paddingTop: 18, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', fontSize: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            JEFES DERROTADOS (arma la serie): {defeated}
            <input type="range" min={1} max={14} value={defeated} onChange={(e) => setDefeated(Number(e.target.value))} />
          </label>
          <span style={{ display: 'flex', gap: 6 }}>
            {(['junior', 'trainee', 'senior'] as ChallengeTier[]).map((t) => <button key={t} type="button" style={btn(tier === t)} onClick={() => setTier(t)}>{t}</button>)}
          </span>
          <span style={{ color: '#666' }}>niveles de la serie de {SECRET_SERIES_LEN}: {seriesTiers(tier).join(' · ')}</span>
          <button type="button" style={btn(false)} onClick={() => { resetSecretsForDemo(); setMsg('Victorias, derrotas y partidas borradas en este navegador.') }}>
            borrar victorias/derrotas
          </button>
          {msg && <span style={{ color: '#888' }}>{msg}</span>}
        </div>
      </div>
    </div>
  )
}
