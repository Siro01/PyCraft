'use client'

import { PixelBitmap, ICON_WARN, ICON_PIG } from './PixelBitmap'

// El diluvio de errores: cada error SQL abre varias ventanitas que inundan el
// escritorio. Son solo teatro — cerrarlas o ignorarlas no toca ni el cofre,
// ni las misiones, ni el guardado.

export type ErrKind = 'detail' | 'safe' | 'rodolfo' | 'critical' | 'confirm' | 'unknown' | 'loading' | 'reboot' | 'alert' | 'progress' | 'download'

export interface ErrWin {
  id: number
  kind: ErrKind
  title: string
  x: number
  y: number
  w: number
  text: string
  raw?: string
  delay: number
}

const ORDER: ErrKind[] = ['detail', 'safe', 'rodolfo', 'critical', 'confirm', 'unknown', 'loading', 'reboot']

const TITLES: Record<ErrKind, string> = {
  detail: 'ERROR',
  safe: 'PROGRESO',
  rodolfo: 'RODOLFO',
  critical: 'SISTEMA',
  confirm: 'VIDA',
  unknown: 'FACE_RECOGNITION',
  loading: 'PENSAMIENTOS',
  reboot: 'REINICIO',
  alert: 'ARQUITECTO.EXE',
  progress: 'ARQUITECTO.EXE',
  download: 'ALERTA',
}

const WIDTHS: Record<ErrKind, number> = {
  detail: 330, safe: 270, rodolfo: 290, critical: 300, confirm: 300, unknown: 340, loading: 290, reboot: 250,
  alert: 320, progress: 330, download: 360,
}

export function explainSqlError(raw: string): string {
  const near = raw.match(/near "([^"]*)"/i)
  if (/syntax error/i.test(raw)) {
    return near
      ? `Algo está mal escrito cerca de "${near[1]}". Revisá comas, paréntesis y comillas.`
      : 'Algo está mal escrito. Revisá comas, paréntesis y comillas.'
  }
  const table = raw.match(/no such table: (\w+)/i)
  if (table) return `No existe la tabla "${table[1]}". La tabla de tu cofre se llama cofre.`
  const col = raw.match(/no such column: (\w+)/i)
  if (col) return `No existe la columna "${col[1]}". Las columnas son id, nombre, cantidad y material.`
  if (/NOT NULL constraint/i.test(raw)) return 'El nombre no puede quedar vacío.'
  if (/UNIQUE constraint/i.test(raw)) return 'Ese id ya existe en el cofre. Probá con otro.'
  if (/datatype mismatch/i.test(raw)) return 'Un valor no es del tipo correcto: cantidad va sin comillas.'
  return 'Algo salió mal. Leé el mensaje de abajo y probá de nuevo.'
}

let _id = 0

export function buildErrorWindows(opts: {
  streak: number
  text: string
  raw?: string
  tip: string
  saved: number
  deskW: number
  deskH: number
}): ErrWin[] {
  const { streak, text, raw, tip, saved, deskW, deskH } = opts
  const count = Math.min(2 + streak, ORDER.length)
  const kinds = ORDER.slice(0, count)
  const bodyOf = (k: ErrKind): string => {
    switch (k) {
      case 'detail': return text
      case 'safe': return `Tu cofre sigue a salvo: ${saved} ${saved === 1 ? 'ítem guardado' : 'ítems guardados'}. Nada se borró.`
      case 'rodolfo': return `${tip} Probá de nuevo, ¡no pasa nada!`
      case 'critical': return 'FALLA CRÍTICA'
      case 'confirm': return '¿ESTÁS SEGURO DE QUE QUERÉS RENDIRTE?'
      case 'unknown': return 'ERROR DESCONOCIDO'
      case 'loading': return 'CARGANDO IDEAS...'
      case 'reboot': return 'REINICIO DENEGADO_'
      default: return text
    }
  }
  return kinds.map((kind, i) => {
    const w = WIDTHS[kind]
    const maxX = Math.max(10, deskW - w - 20)
    const maxY = Math.max(50, deskH - 230)
    const x = Math.round(20 + Math.random() * (maxX - 20))
    const y = Math.round(44 + Math.random() * (maxY - 44))
    return {
      id: ++_id,
      kind,
      title: TITLES[kind],
      x, y, w,
      text: bodyOf(kind),
      raw: kind === 'detail' ? raw : undefined,
      delay: i * 90,
    }
  })
}

export function buildTakeoverWindow(kind: ErrKind, text: string, deskW: number, deskH: number, title?: string, at?: { x: number; y: number }): ErrWin {
  const w = Math.min(WIDTHS[kind], Math.max(240, deskW - 24))
  const maxX = Math.max(20, deskW - w - 20)
  const maxY = Math.max(60, deskH - 260)
  return {
    id: ++_id,
    kind,
    title: title ?? TITLES[kind],
    x: at?.x ?? Math.round(20 + Math.random() * (maxX - 20)),
    y: at?.y ?? Math.round(44 + Math.random() * (maxY - 44)),
    w,
    text,
    delay: 0,
  }
}

const mono = 'var(--font-vt323), monospace'
const jersey = 'var(--font-jersey), monospace'

function OkButton({ label, onClick, quiet }: { label: string; onClick: () => void; quiet?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: jersey, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase',
        padding: '4px 18px', cursor: 'pointer',
        background: quiet ? 'transparent' : 'hsl(var(--tx))',
        color: quiet ? 'hsl(var(--tx))' : 'hsl(var(--bg))',
        border: '2px solid hsl(var(--tx))',
      }}
    >
      {label}
    </button>
  )
}

export function ErrorBody({ win, onClose, onCloseAll, onDownload }: { win: ErrWin; onClose: () => void; onCloseAll: () => void; onDownload?: () => void }) {
  const pad = { padding: '12px 14px' } as const
  switch (win.kind) {
    case 'detail':
      return (
        <div style={{ ...pad, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <PixelBitmap rows={ICON_WARN} scale={4} />
            <div style={{ fontFamily: mono, fontSize: 20, lineHeight: 1.2, color: 'hsl(var(--tx))' }}>{win.text}</div>
          </div>
          {win.raw && (
            <div style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11, color: 'hsl(var(--danger))', wordBreak: 'break-word' }}>
              {win.raw}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <OkButton label="Entendido" onClick={onClose} />
            <OkButton label="Cerrar todo" onClick={onCloseAll} quiet />
          </div>
        </div>
      )
    case 'safe':
      return (
        <div style={{ ...pad, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: mono, fontSize: 19, lineHeight: 1.2, color: 'hsl(var(--accent))' }}>{win.text}</div>
          <div style={{ alignSelf: 'flex-end' }}><OkButton label="OK" onClick={onClose} /></div>
        </div>
      )
    case 'rodolfo':
      return (
        <div style={{ ...pad, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <PixelBitmap rows={ICON_PIG} scale={4} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <div style={{ fontFamily: mono, fontSize: 18, lineHeight: 1.2, color: 'hsl(var(--tx2))' }}>{win.text}</div>
            <div style={{ alignSelf: 'flex-end' }}><OkButton label="Gracias" onClick={onClose} quiet /></div>
          </div>
        </div>
      )
    case 'critical':
      return (
        <div style={{ ...pad, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ fontFamily: jersey, fontSize: 26, letterSpacing: '0.08em', color: 'hsl(var(--danger))' }}>{win.text}</div>
          <OkButton label="OK" onClick={onClose} />
        </div>
      )
    case 'confirm':
      return (
        <div style={{ ...pad, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: mono, fontSize: 20, textAlign: 'center', letterSpacing: '0.04em', color: 'hsl(var(--tx))' }}>{win.text}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <OkButton label="Sí" onClick={onClose} />
            <OkButton label="Sí" onClick={onClose} />
          </div>
        </div>
      )
    case 'unknown':
      return (
        <div style={{ ...pad, padding: '18px 14px', textAlign: 'center' }}>
          <div style={{ fontFamily: jersey, fontSize: 40, lineHeight: 0.95, letterSpacing: '0.06em', color: 'hsl(var(--danger))' }}>
            {win.text.split(' ').map((w, i) => <div key={i}>{w}</div>)}
          </div>
        </div>
      )
    case 'loading':
      return (
        <div style={{ ...pad, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: mono, fontSize: 18, textAlign: 'center', letterSpacing: '0.1em', color: 'hsl(var(--tx2))' }}>{win.text}</div>
          <div style={{ display: 'flex', gap: 3, border: '2px solid hsl(var(--tx))', padding: 3 }} aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="load-seg" style={{ flex: 1, height: 12, animationDelay: `${i * 110}ms` }} />
            ))}
          </div>
        </div>
      )
    case 'alert':
      return (
        <div style={{ ...pad, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <PixelBitmap rows={ICON_WARN} scale={4} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <div style={{ fontFamily: jersey, fontSize: 22, lineHeight: 1.05, letterSpacing: '0.04em', color: 'hsl(var(--danger))' }}>{win.text}</div>
            <div style={{ alignSelf: 'flex-end' }}><OkButton label="OK" onClick={onClose} quiet /></div>
          </div>
        </div>
      )
    case 'progress':
      return (
        <div style={{ ...pad, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: mono, fontSize: 19, letterSpacing: '0.08em', color: 'hsl(var(--tx))' }}>{win.text}</div>
          <div style={{ border: '2px solid hsl(var(--tx))', padding: 3 }} aria-hidden="true">
            <div className="take-fill" style={{ height: 14, background: 'hsl(var(--danger))' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="animate-caret-line" style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11, letterSpacing: '0.1em', color: 'hsl(var(--danger))' }}>ACCESO NO AUTORIZADO</span>
            <OkButton label="Cancelar" onClick={onClose} quiet />
          </div>
        </div>
      )
    case 'download':
      return (
        <div style={{ ...pad, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <PixelBitmap rows={ICON_WARN} scale={4} />
            <div style={{ fontFamily: mono, fontSize: 21, lineHeight: 1.15, color: 'hsl(var(--tx))' }}>{win.text}</div>
          </div>
          <button
            type="button"
            onClick={onDownload}
            className="cta-btn cta-btn--primary animate-caret-line"
            style={{ fontSize: 13, padding: '9px 16px',  cursor: 'pointer', color: 'hsl(var(--bg))' }}
          >
            Descargar mi_inventario.sql
          </button>
        </div>
      )
    case 'reboot':
      return (
        <div style={{ ...pad, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <div className="animate-caret-line" style={{ fontFamily: jersey, fontSize: 20, letterSpacing: '0.1em', color: 'hsl(var(--tx))' }}>{win.text}</div>
          <OkButton label="Cancelar" onClick={onClose} quiet />
        </div>
      )
  }
}
