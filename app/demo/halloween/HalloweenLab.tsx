'use client'

import { useEffect, useState } from 'react'
import Win from '@/components/ui/Win'
import { applySeason, RODOLFO_COSTUMES, useSeason } from '@/lib/game/season'
import { sfx } from '@/lib/game/architect/sound'

const jersey = 'var(--font-jersey), monospace'

const SWATCHES: { token: string; name: string }[] = [
  { token: '--bg', name: 'noche' },
  { token: '--surface', name: 'cripta' },
  { token: '--border2', name: 'niebla' },
  { token: '--tx', name: 'hueso' },
  { token: '--accent', name: 'calabaza' },
  { token: '--python', name: 'baba' },
  { token: '--sql', name: 'bruja' },
  { token: '--danger', name: 'sangre' },
]

const btn: React.CSSProperties = {
  fontFamily: jersey, fontSize: 18, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1,
  padding: '8px 14px', border: '2px solid hsl(var(--tx))', background: 'hsl(var(--surface))', color: 'hsl(var(--tx))',
  boxShadow: '3px 3px 0 hsl(var(--tx) / 0.2)',
}

function setOverride(on: boolean) {
  try { sessionStorage.setItem('pysql:season', on ? 'on' : 'off') } catch { /* modo privado */ }
  applySeason(on)
}

export default function HalloweenLab() {
  const season = useSeason()
  const [ready, setReady] = useState(false)

  // Entrar acá prende Halloween en la pestaña, para recorrer el sitio disfrazado.
  useEffect(() => { setOverride(true); setReady(true) }, [])

  const on = season === 'halloween'

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-5">
      <Win active title="HALLOWEEN.EXE" bodyStyle={{ padding: 16 }}>
        <h1 style={{ fontSize: 30, lineHeight: 1, color: 'hsl(var(--tx))' }}>
          Semana de <span style={{ color: 'hsl(var(--accent))' }}>Halloween</span>
        </h1>
        <p className="font-mono" style={{ fontSize: 12, color: 'hsl(var(--tx2))', marginTop: 8, lineHeight: 1.5 }}>
          Se prende sola del viernes 23/10 al viernes 30/10. Esta página la prende antes en esta pestaña;
          seguí navegando y el sitio queda disfrazado. Para volver a la fecha real: <code>?halloween=auto</code>.
        </p>
        <div className="flex flex-wrap gap-2" style={{ marginTop: 14 }}>
          <button type="button" style={btn} data-sfx="none" onClick={() => window.dispatchEvent(new Event('hw:storm'))}>Rayo</button>
          <button type="button" style={btn} data-sfx="none" onClick={() => window.dispatchEvent(new Event('hw:bat'))}>Murciélago</button>
          {ready && (
            <button type="button" style={btn} onClick={() => setOverride(!on)}>
              {on ? 'Apagar en esta pestaña' : 'Prender en esta pestaña'}
            </button>
          )}
        </div>
      </Win>

      <Win title="RODOLFO DISFRAZADO" bodyStyle={{ padding: 16 }}>
        <p className="font-mono" style={{ fontSize: 12, color: 'hsl(var(--tx2))', marginBottom: 12 }}>
          En cada carga de página Rodolfo elige uno al azar. Tocalo para escuchar su sonido.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {RODOLFO_COSTUMES.map((c) => (
            <button key={c} type="button" data-sfx="none" onClick={() => sfx.costume(c)}
              className="flex flex-col items-center gap-2"
              style={{ border: '2px solid hsl(var(--border2))', background: 'hsl(var(--bg))', padding: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/rodolfo/halloween/${c}.gif`} width={120} height={120} alt={`Rodolfo de ${c}`} style={{ imageRendering: 'pixelated' }} />
              <span style={{ fontFamily: jersey, fontSize: 18, color: 'hsl(var(--accent))', textTransform: 'uppercase' }}>{c}</span>
            </button>
          ))}
        </div>
      </Win>

      <Win title="PALETA FIJA" bodyStyle={{ padding: 16 }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SWATCHES.map((s) => (
            <div key={s.token} style={{ border: '2px solid hsl(var(--tx))' }}>
              <div style={{ height: 44, background: `hsl(var(${s.token}))` }} />
              <div className="font-mono" style={{ fontSize: 11, padding: '4px 6px', color: 'hsl(var(--tx2))' }}>
                <span style={{ color: 'hsl(var(--tx))' }}>{s.name}</span> · {s.token}
              </div>
            </div>
          ))}
        </div>
      </Win>
    </main>
  )
}
