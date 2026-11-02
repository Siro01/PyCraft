'use client'

import { useEffect, useState } from 'react'
import { ShatterText, bandedGradient } from '@/components/ui/PixelFX'
import { IconSword } from '@/components/ui/PixelIcons'

// Fondo de pantalla de PyCraft OS: el título del taller es el hero de la
// landing. Abajo, una línea y los dos accesos (entrar / probar un jefe).

const banded = { backgroundImage: bandedGradient(), WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } as const

function Typewriter({ text, delay, onDone }: { text: string; delay: number; onDone: () => void }) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    let iv: ReturnType<typeof setInterval> | undefined
    const t = setTimeout(() => {
      let i = 0
      iv = setInterval(() => {
        setShown(text.slice(0, ++i))
        if (i >= text.length) { clearInterval(iv); onDone() }
      }, 55)
    }, delay)
    return () => { clearTimeout(t); clearInterval(iv) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delay])
  return (
    <>
      {shown}
      {shown.length < text.length && <span className="opacity-70" style={{ WebkitTextFillColor: 'hsl(var(--tx))', color: 'hsl(var(--tx))' }}>█</span>}
    </>
  )
}

export default function Wallpaper({ narrow, onEnter }: { narrow: boolean; onEnter: () => void }) {
  const [typed, setTyped] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setTyped(true)
  }, [])

  return (
    <div className="flex flex-col items-center text-center" style={{ gap: narrow ? 14 : 20 }}>
      <h1
        style={{
          fontSize: narrow ? 'clamp(2.6rem, 13vw, 3.6rem)' : 'clamp(3rem, 7.2vw, 6rem)',
          lineHeight: 0.95, letterSpacing: '0.02em', margin: 0,
          filter: 'drop-shadow(4px 4px 0 hsl(var(--tx) / 0.16))',
        }}
      >
        <span className="title-build inline-block">
          <ShatterText text="Python" color="hsl(var(--python))" style={{ color: 'hsl(var(--python))' }} />
          <ShatterText text=" + " color="hsl(var(--tx3))" style={{ color: 'hsl(var(--tx3))' }} />
          <ShatterText text="SQL" color="hsl(var(--sql))" style={{ color: 'hsl(var(--sql))' }} />
          <ShatterText text=" =" color="hsl(var(--tx3))" style={{ color: 'hsl(var(--tx3))' }} />
        </span>
        <br />
        {typed
          ? <ShatterText text="BOSS RUSH" color="hsl(var(--accent))" style={banded} />
          : <span style={banded}><Typewriter text="BOSS RUSH" delay={500} onDone={() => setTyped(true)} /></span>}
      </h1>

      <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: narrow ? 21 : 25, lineHeight: 1.15, color: 'hsl(var(--tx2))', margin: 0, maxWidth: '40ch', textWrap: 'balance' }}>
        <span style={{ color: 'hsl(var(--python))' }}>Python</span> y <span style={{ color: 'hsl(var(--sql))' }}>SQLite</span> contra 14 jefes, con código real.
      </p>

      <div className="flex flex-wrap justify-center" style={{ gap: 14 }}>
        {!narrow && (
          <a href="/login" onClick={(e) => { e.preventDefault(); onEnter() }} className="cta-btn cta-btn--primary">
            <IconSword size={18} color="var(--on-accent, hsl(var(--bg)))" />
            Entrar al taller
          </a>
        )}
        <a href="/demo" className="cta-btn">Probar un jefe</a>
      </div>
    </div>
  )
}
