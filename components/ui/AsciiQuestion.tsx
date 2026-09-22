import { makeQuestionLuma } from '@/lib/game/architect/art'
import { lumaToAscii } from '@/lib/game/architect/render'

// Se calcula una sola vez al cargar el módulo: determinista, igual en server y cliente.
const QUESTION_ROWS = (() => {
  const { luma, w, h } = makeQuestionLuma()
  return lumaToAscii(luma, w, h)
})()

interface Props {
  /** Tamaño de fuente en px; el ancho/alto salen de la grilla (12 columnas × 9 filas). */
  size?: number
  color?: string
  className?: string
}

/** Signo de pregunta hecho de caracteres ASCII — el "rostro" del jefe final antes de revelarse. */
export default function AsciiQuestion({ size = 10, color = '#F59E0B', className = '' }: Props) {
  return (
    <pre
      role="img"
      aria-label="Signo de pregunta"
      className={`animate-ascii-flicker select-none ${className}`}
      style={{
        margin: 0,
        fontFamily: '"Courier New", ui-monospace, Consolas, monospace',
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1,
        color,
        textShadow: `0 0 ${Math.max(4, size * 0.6)}px ${color}`,
      }}
    >
      {QUESTION_ROWS.join('\n')}
    </pre>
  )
}
