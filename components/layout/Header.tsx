'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { sfx, isMuted, setMuted } from '@/lib/game/architect/sound'

interface HeaderProps {
  username?: string
  role?: string
}

const jersey = 'var(--font-jersey), monospace'

// Barra de menú del escritorio del alumno. "RUSH" sigue siendo el interruptor
// escondido de tema (BN → rojo → blanco), igual que el botón BN/RD/WH.
export default function Header({ username, role }: HeaderProps) {
  const pathname = usePathname()
  const THEMES = ['dark', 'red', 'light'] as const
  type Theme = typeof THEMES[number]
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    const initial = stored ?? 'dark'
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  const [muted, setMutedState] = useState(false)
  useEffect(() => setMutedState(isMuted()), [])
  const toggleSound = () => {
    const next = !muted
    setMuted(next); setMutedState(next)
    if (!next) sfx.toggle(true)
  }

  const cycleTheme = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
    sfx.theme()
  }

  const navLinks = [
    { href: '/dashboard', label: 'Mapa de jefes' },
    ...(role === 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: 'hsl(var(--surface))', borderBottom: '2px solid hsl(var(--tx))' }}
    >
      <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center gap-x-4 gap-y-1 py-1 sm:gap-x-5" style={{ minHeight: 40 }}>

        {/* Logo — "RUSH" es el switch de tema escondido */}
        <Link href="/dashboard" className="shrink-0" style={{ fontFamily: jersey, fontSize: 20, letterSpacing: '0.06em', lineHeight: 1 }}>
          <span style={{ color: 'hsl(var(--python))' }}>PY</span>
          <span style={{ color: 'hsl(var(--tx2))' }}>SQL</span>
          <span style={{ color: 'hsl(var(--accent))' }}>BOSS</span>
          <button
            onClick={(e) => { e.preventDefault(); cycleTheme() }}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'default', font: 'inherit', letterSpacing: 'inherit', color: 'hsl(var(--tx3))' }}
            title={`Tema: ${theme}`}
            data-sfx="none"
          >RUSH</button>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 order-3 basis-full sm:order-none sm:basis-auto sm:flex-1">
          {navLinks.map((link) => {
            const active = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: jersey, fontSize: 16, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1, padding: '7px 10px', whiteSpace: 'nowrap',
                  background: active ? 'hsl(var(--tx))' : 'transparent',
                  color: active ? 'hsl(var(--bg))' : 'hsl(var(--tx2))',
                  border: `2px solid ${active ? 'hsl(var(--tx))' : 'transparent'}`,
                }}
                className={active ? undefined : 'hover:text-tx'}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
          {username && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="status-dot active" />
              <span style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 18, color: 'hsl(var(--tx2))' }}>{username}</span>
            </div>
          )}

          <button
            onClick={toggleSound}
            data-sfx="none"
            aria-pressed={!muted}
            title={muted ? 'Sonido apagado — clic para activar' : 'Sonido activado — clic para silenciar'}
            style={{
              fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 10, letterSpacing: '0.16em', padding: '7px 10px', cursor: 'pointer',
              background: 'transparent', color: muted ? 'hsl(var(--tx3))' : 'hsl(var(--tx2))', border: '2px solid hsl(var(--border2))',
              textDecoration: muted ? 'line-through' : 'none',
            }}
          >
            SFX
          </button>

          <button
            onClick={cycleTheme}
            title={`Tema actual: ${theme} — clic para cambiar`}
            data-sfx="none"
            style={{
              fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 10, letterSpacing: '0.16em', padding: '7px 10px', cursor: 'pointer',
              background: 'transparent', color: 'hsl(var(--tx2))', border: '2px solid hsl(var(--border2))',
            }}
          >
            {theme === 'dark' ? 'BN' : theme === 'light' ? 'WH' : 'RD'}
          </button>

          {username && (
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="hover:text-danger transition-colors"
                style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 18, color: 'hsl(var(--tx3))', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px' }}
              >
                Salir
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  )
}
