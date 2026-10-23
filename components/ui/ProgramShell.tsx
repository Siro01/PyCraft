import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

// El marco de todo programa de PyCraft OS que se abre desde el mapa: el
// escritorio de puntos con borde de 2px y sombra dura, y arriba la barra de
// menú "PYCRAFT OS" con lo propio del programa a la derecha y la vuelta al
// mapa. Antes cada pantalla lo armaba a mano (o no lo tenía): así el alumno
// siente que sigue en el mismo sistema al pasar de un programa a otro.

interface Props {
  children: ReactNode
  /** Lo que va a la derecha de la barra (zoom, nivel, diamantes…). */
  bar?: ReactNode
  /** Lo que va pegado a "PYCRAFT OS" (etiquetas como "Vista docente"). */
  barStart?: ReactNode
  /** false = sin "Volver al mapa" (el escritorio del mapa mismo). */
  back?: boolean
  /** A dónde vuelve (el docente vuelve a su panel). */
  backHref?: string
  backLabel?: string
  /** Capas que viven dentro del escritorio, fuera del contenido (stickers). */
  layers?: ReactNode
  /** Variables de paleta propias (la del acto, la del Abismo…). */
  style?: CSSProperties
  className?: string
  /** Relleno del área de trabajo; por defecto el de los demás programas. */
  bodyClassName?: string
  bodyStyle?: CSSProperties
}

const jersey = 'var(--font-jersey), monospace'

export default function ProgramShell({ children, bar, barStart, back = true, backHref = '/dashboard', backLabel = 'Volver al mapa', layers, style, className, bodyClassName = 'p-3', bodyStyle }: Props) {
  return (
    <div
      className={`desk program-shell relative${className ? ` ${className}` : ''}`}
      style={{
        border: '2px solid hsl(var(--tx))',
        background: 'hsl(var(--bg))',
        backgroundImage: 'radial-gradient(hsl(var(--tx) / 0.18) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
        boxShadow: '6px 6px 0 hsl(var(--tx) / 0.18)',
        color: 'hsl(var(--tx))',
        ...style,
      }}
    >
      {layers}
      <div className="program-bar">
        <span className="program-brand" style={{ fontFamily: jersey }}>PYCRAFT OS</span>
        {barStart}
        <span style={{ flex: 1 }} />
        {bar}
        {back && (
          <Link href={backHref} className="label-mono program-back">
            <span aria-hidden>←</span> {backLabel}
          </Link>
        )}
      </div>
      <div className={bodyClassName} style={bodyStyle}>{children}</div>
    </div>
  )
}
