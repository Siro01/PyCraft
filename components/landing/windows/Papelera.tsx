import { PixelBitmap, ICON_WARN } from '@/components/game/architect/desktop/PixelBitmap'

// La papelera no acepta nada: explica por qué.

const BIN_MESSAGE =
  'Pedagógicamente cada parte está pensada para gamificar, acompañar y aprender con nuevas metodologías. Próximamente se suman más herramientas a la aventura que te acompaña en el aprendizaje.'

export default function PapeleraWindow({ onOk }: { onOk: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 items-start">
        <PixelBitmap rows={ICON_WARN} scale={4} />
        <div>
          <div style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 22, lineHeight: 1, color: 'hsl(var(--danger))', letterSpacing: '0.04em' }}>NO SE PUEDE ELIMINAR</div>
          <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 20, lineHeight: 1.2, color: 'hsl(var(--tx))', margin: '6px 0 0' }}>{BIN_MESSAGE}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onOk}
        style={{ alignSelf: 'flex-end', fontFamily: 'var(--font-jersey), monospace', fontSize: 17, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 22px', cursor: 'pointer', background: 'hsl(var(--tx))', color: 'hsl(var(--bg))', border: '2px solid hsl(var(--tx))' }}
      >
        Entendido
      </button>
    </div>
  )
}
