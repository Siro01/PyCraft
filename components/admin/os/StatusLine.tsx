'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { StatusMark } from '@/components/ui/StatusMark'

// Línea de estado al pie de una ventana: el último resultado ("Alumno creado",
// "Error: …") en una sola línea VT323. Los aciertos se borran solos; los
// errores quedan hasta la próxima acción, para que el docente alcance a leerlos.

export interface Status { text: string; ok: boolean | null }

export function useStatus() {
  const [status, setStatus] = useState<Status | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const say = useCallback((text: string, ok: boolean | null = true) => {
    clearTimeout(timer.current)
    setStatus({ text, ok })
    if (ok) timer.current = setTimeout(() => setStatus(null), 4000)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return [status, say] as const
}

export default function StatusLine({ status }: { status: Status | null }) {
  if (!status) return null
  const ink = status.ok === false ? 'hsl(var(--danger))' : 'hsl(var(--tx))'
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center"
      style={{
        flexShrink: 0, minHeight: 28, padding: '3px 12px',
        borderTop: `2px solid ${status.ok === false ? ink : 'hsl(var(--border2))'}`,
        background: 'hsl(var(--bg))', color: ink,
        fontFamily: 'var(--font-vt323), monospace', fontSize: 18, lineHeight: 1,
      }}
    >
      <span aria-hidden style={{ marginRight: 8, opacity: 0.6 }}>&gt;</span>
      {status.ok !== null && <StatusMark ok={status.ok} />}
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{status.text}</span>
    </div>
  )
}
