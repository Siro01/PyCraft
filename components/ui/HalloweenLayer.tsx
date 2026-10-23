'use client'

// Decoración de la semana de Halloween, encima de todo el sitio y sin capturar
// clics: telarañas en las esquinas, una araña que sube y baja, un murciélago
// que cruza de vez en cuando y rayos con trueno cada uno o dos minutos.
// Todo se anima con transform/opacity (barato para las PCs del taller) y con
// prefers-reduced-motion queda quieto: sin destellos ni murciélagos.

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { applySeason, halloweenActive, seasonExcluded, useSeason } from '@/lib/game/season'
import { sfx } from '@/lib/game/architect/sound'

const rand = (a: number, b: number) => a + Math.random() * (b - a)

export default function HalloweenLayer() {
  const pathname = usePathname()
  const season = useSeason()

  // El script del <head> resuelve la primera carga; esto cubre la navegación
  // interna (entrar o salir de una página excluida) y el cambio de día.
  useEffect(() => {
    applySeason(halloweenActive() && !seasonExcluded(pathname ?? ''))
  }, [pathname])

  if (season !== 'halloween') return null
  return <Decor />
}

function Decor() {
  const [flash, setFlash] = useState<{ id: number; x: number } | null>(null)
  const [bat, setBat] = useState<{ id: number; y: number; rtl: boolean } | null>(null)
  const seq = useRef(0)

  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timers: number[] = []
    const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)) }
    const awake = () => document.visibilityState === 'visible'
    // Sin un gesto del usuario el navegador no deja sonar nada: ni lo intentamos.
    const canPlay = () => navigator.userActivation?.hasBeenActive ?? true

    const strike = () => {
      const far = Math.random()
      if (!calm) {
        setFlash({ id: ++seq.current, x: rand(8, 88) })
        later(() => setFlash(null), 1000)
      }
      // la luz llega antes que el sonido: más lejos, más espera
      if (canPlay()) later(() => sfx.thunder(far), 250 + far * 1200)
    }
    const sendBat = () => {
      if (calm) return
      setBat({ id: ++seq.current, y: rand(14, 46), rtl: Math.random() < 0.5 })
      if (canPlay()) later(() => sfx.bat(), 1200)
      later(() => setBat(null), 7200)
    }

    const storm = () => {
      if (awake()) strike()
      later(storm, rand(55_000, 130_000))
    }
    const flyBy = () => {
      if (awake()) sendBat()
      later(flyBy, rand(40_000, 90_000))
    }

    later(storm, rand(12_000, 25_000))
    later(flyBy, rand(20_000, 35_000))
    // /demo/halloween los dispara a mano
    window.addEventListener('hw:storm', strike)
    window.addEventListener('hw:bat', sendBat)
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('hw:storm', strike)
      window.removeEventListener('hw:bat', sendBat)
    }
  }, [])

  return (
    <div className="hw-layer" aria-hidden="true">
      <img src="/halloween/web.png" alt="" className="hw-web hw-web--left" />
      <img src="/halloween/web.png" alt="" className="hw-web hw-web--right" />
      <div className="hw-spider">
        <span className="hw-spider__thread" />
        <span className="hw-spider__body" />
      </div>
      {bat && (
        <div key={bat.id} className={`hw-bat${bat.rtl ? ' hw-bat--rtl' : ''}`} style={{ top: `${bat.y}vh` }}>
          <span className="hw-bat__body" />
        </div>
      )}
      {flash && (
        <div key={flash.id}>
          <div className="hw-flash" />
          <img src="/halloween/bolt.png" alt="" className="hw-bolt" style={{ left: `${flash.x}vw` }} />
        </div>
      )}
    </div>
  )
}
