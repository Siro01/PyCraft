'use client'

interface Props {
  message: string
  onClose: () => void
}

// Rodolfo entra deslizándose desde la derecha cuando el alumno intenta entrar
// a un jefe todavía no habilitado. Reutiliza el vocabulario de "Apuntes"
// (ventana con barra sólida) pero como aviso corto y descartable.
export default function RodolfoMapWarning({ message, onClose }: Props) {
  return (
    <div
      className="fixed bottom-6 right-0 z-50 flex items-end gap-3 pr-3"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="map-rodolfo-in max-w-[260px]"
        style={{ pointerEvents: 'auto', background: 'hsl(var(--surface))', border: '2px solid hsl(var(--accent))', boxShadow: '4px 4px 0 hsl(var(--tx) / 0.25)' }}
      >
        <div className="flex items-center justify-between gap-2 px-2" style={{ background: 'hsl(var(--accent))', color: 'var(--on-accent)', minHeight: 22 }}>
          <span style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 14, letterSpacing: '0.08em' }}>RODOLFO</span>
          <button
            onClick={onClose}
            aria-label="Cerrar aviso"
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontFamily: 'var(--font-jersey), monospace', fontSize: 14, lineHeight: 1, padding: '2px 4px' }}
          >
            ×
          </button>
        </div>
        <div className="px-3 py-2" style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 19, lineHeight: 1.2, color: 'hsl(var(--tx))' }}>
          {message}
        </div>
      </div>

      <img
        src="/rodolfo/rodolfo.gif"
        width={88}
        height={88}
        alt="Rodolfo, el cerdito guía"
        style={{ imageRendering: 'pixelated', display: 'block', border: '2px solid hsl(var(--accent) / 0.5)', boxShadow: '0 4px 16px hsl(0 0% 0% / 0.35)' }}
      />
    </div>
  )
}
