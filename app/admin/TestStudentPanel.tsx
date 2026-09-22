'use client'

import { useCallback, useEffect, useState } from 'react'

interface TestCode {
  code: string
  created_at: string
  expires_at: string
  revoked: boolean
  uses: number
  last_used_at: string | null
}

interface TestState {
  exists: boolean
  defeated: number
  attacks: number
  codes: TestCode[]
}

const DURATIONS = [
  { hours: 4,   label: '4 horas' },
  { hours: 24,  label: '24 horas' },
  { hours: 72,  label: '3 días' },
  { hours: 168, label: '7 días' },
]

const isActive = (c: TestCode) => !c.revoked && new Date(c.expires_at).getTime() > Date.now()
const fmtDate = (iso: string) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })

export default function TestStudentPanel() {
  const [state, setState] = useState<TestState | null>(null)
  const [loadError, setLoadError] = useState('')
  const [hours, setHours] = useState(24)
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/test-student', { cache: 'no-store' })
    const body = await res.json()
    if (!res.ok) { setLoadError(body.error ?? 'Error al cargar'); return }
    setLoadError('')
    setState(body)
  }, [])

  useEffect(() => { load() }, [load])

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/admin/test-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error ?? 'Error')
    return body
  }

  const generate = async () => {
    setStatus('Generando…')
    try {
      await post({ action: 'generate', hours })
      setStatus('✓ Código generado')
      await load()
    } catch (e) { setStatus('Error: ' + (e as Error).message) }
  }

  const revoke = async (code: string) => {
    try { await post({ action: 'revoke', code }); await load() }
    catch (e) { setStatus('Error: ' + (e as Error).message) }
  }

  const reset = async () => {
    if (!confirm('¿Borrar todo el progreso del alumno TEST? Va a volver a empezar desde el primer jefe.')) return
    setStatus('Reiniciando…')
    try {
      await post({ action: 'reset' })
      setStatus('✓ Progreso del alumno TEST reiniciado')
      await load()
    } catch (e) { setStatus('Error: ' + (e as Error).message) }
  }

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text) } catch { window.prompt('Copiá:', text) }
    setCopied(key)
    setTimeout(() => setCopied(''), 1500)
  }

  const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'
  const active = state?.codes.filter(isActive) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-5">
        <div className="label-mono mb-2">Alumno TEST — pruebas en las PCs del taller</div>
        <p className="text-sm text-tx2 leading-relaxed">
          Cuenta de prueba con <strong>todos los jefes y las 3 dificultades habilitadas</strong>. Se entra desde{' '}
          <span className="font-mono text-tx">{loginUrl}</span> → <em>«Tengo un código de prueba»</em>. Muestra un
          panel abajo a la izquierda que mide FPS y latencia, y suma botones para <em>simular un acierto</em> o
          derrotar al jefe sin tipear el código. Sus datos no cuentan en las estadísticas.
        </p>
        {state && (
          <p className="font-mono text-xs text-tx3 mt-3">
            {state.exists
              ? `Progreso actual: ${state.defeated} jefe${state.defeated === 1 ? '' : 's'} derrotado${state.defeated === 1 ? '' : 's'} · ${state.attacks} ataque${state.attacks === 1 ? '' : 's'}`
              : 'El alumno TEST se crea automáticamente al generar el primer código.'}
          </p>
        )}
      </div>

      {loadError && (
        <div className="card p-4 font-mono text-xs text-danger">{loadError}</div>
      )}

      <div className="card p-5">
        <div className="label-mono mb-3">Generar código de acceso</div>
        <div className="flex flex-wrap items-center gap-3">
          <select className="input max-w-[160px]" value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Validez del código">
            {DURATIONS.map((d) => <option key={d.hours} value={d.hours}>Vale {d.label}</option>)}
          </select>
          <button onClick={generate} className="btn-primary font-mono">Generar código</button>
          <button
            onClick={reset}
            className="font-mono text-xs px-3 py-2 pixel-corners-sm border border-danger/40 text-danger hover:bg-danger/10 transition-all"
          >
            Reiniciar progreso del alumno TEST
          </button>
          {status && (
            <span className={`font-mono text-xs ${status.startsWith('Error') ? 'text-danger' : 'text-python'}`}>{status}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {active.map((c) => (
          <div key={c.code} className="card p-3 flex flex-wrap items-center gap-4">
            <button
              onClick={() => copy(c.code, c.code)}
              title="Copiar código"
              className="font-mono text-xl font-bold tracking-widest text-accent hover:opacity-80"
            >
              {c.code}
            </button>
            <div className="flex-1 min-w-[180px] text-xs text-tx3">
              Vence {fmtDate(c.expires_at)} · {c.uses} uso{c.uses === 1 ? '' : 's'}
              {c.last_used_at && ` · último ${fmtDate(c.last_used_at)}`}
            </div>
            <span className="font-mono text-xs text-python">{copied === c.code ? '✓ Copiado' : ''}</span>
            <button
              onClick={() => revoke(c.code)}
              className="font-mono text-xs px-3 py-1.5 pixel-corners-sm border border-border text-tx3 hover:border-danger/50 hover:text-danger transition-all"
            >
              Revocar
            </button>
          </div>
        ))}
        {state && active.length === 0 && (
          <div className="card p-6 text-center font-mono text-xs text-tx3">No hay códigos vigentes.</div>
        )}
      </div>
    </div>
  )
}
