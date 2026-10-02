'use client'

// COMPU_HACKEADA.EXE — la netbook "escanea" el código (una barra que baja,
// de a pasos, como una pantalla vieja) y después muestra cada arreglo:
// la línea como estaba, como quedó, qué cambió y por qué. Es un modal a
// propósito: el código del alumno cambió y tiene que enterarse de qué.

import { useEffect, useState } from 'react'
import Win from '@/components/ui/Win'
import { ItemSprite } from './ItemSprites'
import { sfx } from '@/lib/game/architect/sound'
import type { CodeFix } from '@/lib/game/items/auto-fix'

const vt = 'var(--font-vt323), monospace'
const jersey = 'var(--font-jersey), monospace'
const mono = "'Courier New', Courier, monospace"

export default function CompuHackeadaWindow({ fixes, hasBlanks, onClose }: { fixes: CodeFix[]; hasBlanks: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState<'scan' | 'done'>('scan')

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    sfx.type()
    const t = setTimeout(() => { setPhase('done'); sfx.confirm() }, reduce ? 0 : 1900)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-3" style={{ background: 'hsl(var(--bg) / 0.78)' }} role="dialog" aria-modal="true" aria-label="Correcciones de la Compu Hackeada">
      <div className="w-full win-pop" style={{ maxWidth: 520 }}>
        <Win title="COMPU_HACKEADA.EXE" active onClose={phase === 'done' ? onClose : undefined} bodyStyle={{ padding: 14 }}>
          {/* Pantalla de la netbook */}
          <div className="relative" style={{ border: '2px solid hsl(var(--tx))', background: 'hsl(var(--bg))', padding: 12, minHeight: 150, overflow: 'hidden' }}>
            {phase === 'scan' ? (
              <>
                <div className="compu-scan absolute left-0 right-0" style={{ height: 2, background: 'hsl(var(--accent))', boxShadow: '0 0 0 1px hsl(var(--accent) / 0.3)' }} />
                <div className="flex items-center gap-3">
                  <ItemSprite sprite="compu-hackeada" size={48} animated />
                  <div>
                    <div style={{ fontFamily: jersey, fontSize: 20, color: 'hsl(var(--tx))' }}>Revisando tu código…</div>
                    <div style={{ fontFamily: vt, fontSize: 17, color: 'hsl(var(--tx3))' }}>Buscando hasta 2 errores para corregir.</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <ItemSprite sprite="compu-hackeada" size={32} />
                  <span style={{ fontFamily: jersey, fontSize: 20, color: 'hsl(var(--tx))' }}>
                    {fixes.length === 1 ? 'Corregí 1 error' : `Corregí ${fixes.length} errores`}
                  </span>
                </div>
                {fixes.map((f, idx) => (
                  <div key={idx} className="compu-line-in" style={{ animationDelay: `${idx * 260}ms`, borderTop: '1px dashed hsl(var(--border2))', paddingTop: 8 }}>
                    <div className="label-mono" style={{ color: 'hsl(var(--tx3))' }}>Línea {f.line}</div>
                    <pre style={diffLine(false)}><span aria-hidden>− </span>{f.before.trim()}</pre>
                    <pre style={diffLine(true)}><span aria-hidden>+ </span>{f.after.trim()}</pre>
                    <p style={{ fontFamily: vt, fontSize: 19, lineHeight: 1.15, color: 'hsl(var(--tx))', marginTop: 4 }}>{f.what}</p>
                    <p style={{ fontFamily: vt, fontSize: 17, lineHeight: 1.15, color: 'hsl(var(--tx2))' }}><b>¿Por qué?</b> {f.why}</p>
                  </div>
                ))}
                {hasBlanks && (
                  <p style={{ fontFamily: vt, fontSize: 17, color: 'hsl(var(--tx2))', borderTop: '1px dashed hsl(var(--border2))', paddingTop: 8 }}>
                    Todavía quedan huecos ___ en tu código. Esos no los toco: la respuesta la tenés que pensar vos.
                  </p>
                )}
              </div>
            )}
          </div>
          {/* Teclado de la netbook — solo decorado */}
          <div aria-hidden style={{ height: 10, margin: '0 -4px', background: 'repeating-linear-gradient(90deg, hsl(var(--tx2)) 0 6px, hsl(var(--surface2)) 6px 8px)', borderLeft: '2px solid hsl(var(--tx))', borderRight: '2px solid hsl(var(--tx))', borderBottom: '2px solid hsl(var(--tx))' }} />

          <div className="flex justify-end mt-3">
            <button type="button" onClick={onClose} disabled={phase === 'scan'} className="label-mono" style={{ padding: '6px 14px', border: '2px solid hsl(var(--tx))', background: phase === 'scan' ? 'transparent' : 'hsl(var(--tx))', color: phase === 'scan' ? 'hsl(var(--tx3))' : 'hsl(var(--bg))', cursor: phase === 'scan' ? 'default' : 'pointer' }}>
              {phase === 'scan' ? 'Revisando…' : 'Entendido'}
            </button>
          </div>
        </Win>
      </div>
    </div>
  )
}

function diffLine(added: boolean): React.CSSProperties {
  return {
    margin: '3px 0 0', padding: '3px 8px', fontFamily: mono, fontSize: 13, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    color: added ? 'hsl(var(--bg))' : 'hsl(var(--tx2))',
    background: added ? 'hsl(var(--tx))' : 'transparent',
    border: `2px solid ${added ? 'hsl(var(--tx))' : 'hsl(var(--border2))'}`,
    textDecoration: added ? 'none' : 'line-through',
    textDecorationColor: 'hsl(var(--tx3))',
  }
}
