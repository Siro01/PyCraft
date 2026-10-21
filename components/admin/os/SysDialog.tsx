'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Win from '@/components/ui/Win'
import { sfx } from '@/lib/game/architect/sound'

// Diálogo del sistema del escritorio docente: reemplaza confirm(), alert() y
// el modal gris. Misma ventana `Win` que los errores del cofre — barra
// sólida (en peligro para lo que borra), VT323 adentro y botones Jersey.

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

export function DialogButton({ label, onClick, quiet, type = 'button', danger }: { label: string; onClick?: () => void; quiet?: boolean; type?: 'button' | 'submit'; danger?: boolean }) {
  const ink = danger ? 'hsl(var(--danger))' : 'hsl(var(--tx))'
  return (
    <button
      type={type}
      onClick={onClick}
      className="sys-btn"
      style={{
        fontFamily: jersey, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase',
        padding: '4px 18px', cursor: 'pointer', minHeight: 32,
        background: quiet ? 'transparent' : ink,
        // Relleno de peligro: el texto sale de --on-accent (blanco en el tema rojo, como pide el manual).
        color: quiet ? 'hsl(var(--tx))' : danger ? 'var(--on-accent, hsl(var(--bg)))' : 'hsl(var(--bg))',
        border: `2px solid ${quiet ? 'hsl(var(--tx))' : ink}`,
      }}
    >
      {label}
    </button>
  )
}

interface SysDialogProps {
  title: string
  tone?: 'normal' | 'danger'
  onClose: () => void
  width?: number
  children: ReactNode
}

export default function SysDialog({ title, tone = 'normal', onClose, width = 380, children }: SysDialogProps) {
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tone === 'danger') sfx.warn(); else sfx.open()
    // Foco al primer control: el docente contesta con el teclado.
    const first = boxRef.current?.querySelector<HTMLElement>('input, button.sys-btn, button')
    first?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <div
      className="desk-theme"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        background: 'hsl(var(--bg) / 0.7)',
        backgroundImage: 'radial-gradient(hsl(var(--tx) / 0.22) 1px, transparent 1px)',
        backgroundSize: '6px 6px',
      }}
    >
      <div ref={boxRef} role="alertdialog" aria-modal="true" aria-label={title} className="win-pop" style={{ width: '100%', maxWidth: width }}>
        <Win active title={title} tone={tone} onClose={onClose} style={{ boxShadow: '6px 6px 0 hsl(var(--tx) / 0.28)' }} bodyStyle={{ padding: '14px 16px' }}>
          <div style={{ fontFamily: vt, fontSize: 20, lineHeight: 1.2, color: 'hsl(var(--tx))' }}>{children}</div>
        </Win>
      </div>
    </div>,
    document.body,
  )
}

interface AskOptions { title: string; body: ReactNode; ok: string; cancel?: string; danger?: boolean }

/** `await ask({...})` en lugar de confirm(): devuelve true si el docente aceptó. */
export function useSysConfirm() {
  const [pending, setPending] = useState<(AskOptions & { resolve: (v: boolean) => void }) | null>(null)
  const ask = (o: AskOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve }))
  const done = (v: boolean) => { pending?.resolve(v); setPending(null) }
  const node = pending && (
    <SysDialog title={pending.title} tone={pending.danger ? 'danger' : 'normal'} onClose={() => done(false)}>
      <div>{pending.body}</div>
      <div className="flex flex-wrap justify-end gap-2" style={{ marginTop: 16 }}>
        <DialogButton label={pending.cancel ?? 'Cancelar'} quiet onClick={() => done(false)} />
        <DialogButton label={pending.ok} danger={pending.danger} onClick={() => { if (pending.danger) sfx.trash(); done(true) }} />
      </div>
    </SysDialog>
  )
  return [ask, node] as const
}
