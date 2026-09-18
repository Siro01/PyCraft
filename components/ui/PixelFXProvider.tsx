'use client'

// Activa la explosión de píxeles al click en toda la plataforma (no solo en
// la landing). Escucha a nivel de documento en vez de envolver a los hijos en
// un div, para no alterar el layout (flex/grid) de ninguna página.

import { useEffect, useRef, useState } from 'react'
import { PixelBurst } from './PixelFX'

export default function PixelFXProvider({ children }: { children: React.ReactNode }) {
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([])
  const burstId = useRef(0)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const id = ++burstId.current
      setBursts((prev) => [...prev.slice(-5), { id, x: e.clientX, y: e.clientY }])
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const handleDone = (id: number) => setBursts((prev) => prev.filter((b) => b.id !== id))

  return (
    <>
      {children}
      {bursts.map((b) => (
        <PixelBurst key={b.id} x={b.x} y={b.y} onDone={() => handleDone(b.id)} />
      ))}
    </>
  )
}
