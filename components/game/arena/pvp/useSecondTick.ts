'use client'

import { useEffect, useState } from 'react'

/**
 * La hora, actualizada UNA vez por segundo y justo al cambiar de segundo (el
 * reloj de un duelo muestra segundos: más seguido solo redibuja de más, y en
 * las PCs del taller eso se nota al escribir). Con `active` en false no corre.
 */
export function useSecondTick(active = true): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    let t: ReturnType<typeof setTimeout>
    const next = () => 1000 - (Date.now() % 1000) + 5
    const loop = () => { setNow(Date.now()); t = setTimeout(loop, next()) }
    t = setTimeout(loop, next())
    return () => clearTimeout(t)
  }, [active])
  return now
}
