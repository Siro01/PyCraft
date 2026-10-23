'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { sfx } from '@/lib/game/architect/sound'

// TEST.EXE: la cuenta de prueba para las PCs del taller (todos los jefes y
// las 3 dificultades abiertas, con el medidor de rendimiento). Se genera un
// código, se lo dicta en la PC y se entra desde /login → "Tengo un código de
// prueba". Sus datos no cuentan en las estadísticas.

interface TestCode { code: string; created_at: string; expires_at: string; revoked: boolean; uses: number; last_used_at: string | null }
interface TestState { exists: boolean; defeated: number; attacks: number; codes: TestCode[] }

interface Props {
  ask: (o: { title: string; body: ReactNode; ok: string; danger?: boolean }) => Promise<boolean>
  say: (text: string, ok?: boolean | null) => void
}

const jersey = 'var(--font-jersey), monospace'
const DURATIONS = [
  { hours: 4, label: '4 h' },
  { hours: 24, label: '24 h' },
  { hours: 72, label: '3 días' },
  { hours: 168, label: '7 días' },
]
const isActive = (c: TestCode) => !c.revoked && new Date(c.expires_at).getTime() > Date.now()
const fmt = (iso: string) => new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(', ', ' ')
const COLS = 'minmax(0, 1fr) auto'

export default function TestWindow({ ask, say }: Props) {
  const [state, setState] = useState<TestState | null>(null)
  const [loadError, setLoadError] = useState('')
  const [hours, setHours] = useState(24)
  const [copied, setCopied] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/test-student', { cache: 'no-store' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) { setLoadError(body.error ?? 'No se pudo cargar el alumno TEST.'); return }
    setLoadError('')
    setState(body)
  }, [])
  useEffect(() => { load() }, [load])

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/admin/test-student', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'Error')
    return body
  }

  const generate = async () => {
    setBusy(true)
    say('Generando…', null)
    try { await post({ action: 'generate', hours }); sfx.confirm(); say('Código generado'); await load() }
    catch (e) { say('Error: ' + (e as Error).message, false) }
    setBusy(false)
  }

  const revoke = async (code: string) => {
    try { await post({ action: 'revoke', code }); say(`Código ${code} revocado`); await load() }
    catch (e) { say('Error: ' + (e as Error).message, false) }
  }

  const reset = async () => {
    const ok = await ask({ title: 'REINICIAR_TEST.EXE', body: <>¿Borrar todo el progreso del alumno TEST? Vuelve a empezar desde el primer jefe. Los alumnos de verdad no se tocan.</>, ok: 'Reiniciar', danger: true })
    if (!ok) return
    say('Reiniciando…', null)
    try { await post({ action: 'reset' }); say('Progreso del alumno TEST reiniciado'); await load() }
    catch (e) { say('Error: ' + (e as Error).message, false) }
  }

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code) } catch { say(`No se pudo copiar: dictá el código ${code}`, false); return }
    sfx.click()
    setCopied(code)
    setTimeout(() => setCopied(''), 1500)
  }

  const active = state?.codes.filter(isActive) ?? []

  return (
    <div className="flex flex-col gap-4">
      <dl className="sys-stats">
        <div className="flex flex-col">
          <dt className="label-mono">Jefes</dt>
          <dd className="tabular" style={{ fontFamily: jersey, fontSize: 24, lineHeight: 1, color: 'hsl(var(--tx))' }}>{state?.exists ? state.defeated : '—'}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="label-mono">Ataques</dt>
          <dd className="tabular" style={{ fontFamily: jersey, fontSize: 24, lineHeight: 1, color: 'hsl(var(--tx))' }}>{state?.exists ? state.attacks : '—'}</dd>
        </div>
        <div className="flex flex-col" style={{ flex: '1 1 220px' }}>
          <dt className="label-mono">Cómo se entra</dt>
          <dd className="sys-sub" style={{ color: 'hsl(var(--tx))' }}>/login → «Tengo un código de prueba»</dd>
        </div>
      </dl>

      {loadError && <p className="sys-sub" style={{ color: 'hsl(var(--danger))' }}>&gt; {loadError}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <span className="label-mono" id="test-vale">Vale</span>
        <div role="radiogroup" aria-labelledby="test-vale" className="flex">
          {DURATIONS.map((d) => (
            <button key={d.hours} type="button" role="radio" aria-checked={hours === d.hours} className="aula-seg" onClick={() => { sfx.toggle(true); setHours(d.hours) }}>{d.label}</button>
          ))}
        </div>
        <button type="button" className="sys-tool sys-tool--solid" disabled={busy} onClick={generate}>Generar código</button>
        <span style={{ flex: 1 }} />
        <button type="button" className="alu-undo" onClick={reset}>Reiniciar progreso</button>
      </div>

      {active.length === 0 ? (
        state && <p className="sys-sub" style={{ padding: '4px 0' }}>No hay códigos vigentes.{!state.exists ? ' El alumno TEST se crea solo con el primer código.' : ''}</p>
      ) : (
        <div role="table" aria-label="Códigos vigentes">
          <div role="row" className="sys-row sys-row--head" style={{ gridTemplateColumns: COLS }}>
            <span role="columnheader" className="label-mono">Código · vence · usos</span>
            <span role="columnheader" />
          </div>
          {active.map((c) => (
            <div key={c.code} role="row" className="sys-row sys-row--hover" style={{ gridTemplateColumns: COLS }}>
              <span role="cell" className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                <button type="button" className="test-code" title="Copiar código" onClick={() => copy(c.code)}>
                  {copied === c.code ? 'copiado' : c.code}
                </button>
                <span className="sys-sub">
                  vence {fmt(c.expires_at)} · {c.uses} uso{c.uses === 1 ? '' : 's'}{c.last_used_at ? ` · último ${fmt(c.last_used_at)}` : ''}
                </span>
              </span>
              <span role="cell"><button type="button" className="alu-undo" onClick={() => revoke(c.code)}>Revocar</button></span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
