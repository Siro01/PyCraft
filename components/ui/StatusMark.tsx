import { PixelBitmap, ICON_CHECK, ICON_CLOSE } from '@/components/game/architect/desktop/PixelBitmap'

/** Marca de estado dibujada en pixel (reemplaza los glifos ✓ ✗ del sistema). */
export function StatusMark({ ok, scale = 2 }: { ok: boolean; scale?: number }) {
  return <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }}><PixelBitmap rows={ok ? ICON_CHECK : ICON_CLOSE} scale={scale} ink="currentColor" /></span>
}

/** Cuadrado lleno / vacío: estado habilitado / bloqueado sin depender del color. */
export function SquareDot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{ display: 'inline-block', width: 8, height: 8, marginRight: 6, border: '2px solid currentColor', background: on ? 'currentColor' : 'transparent', verticalAlign: 'baseline' }}
    />
  )
}

/** Mensaje de estado "✓ texto" (ok) o cualquier otro texto (error). */
export function StatusLine({ text, className }: { text: string; className?: string }) {
  const ok = text.startsWith('✓')
  return <span className={className}><StatusMark ok={ok} />{ok ? text.replace(/^✓\s*/, '') : text}</span>
}
