'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface HeaderProps {
  username?: string
  role?: string
}

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

  const cycleTheme = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const navLinks = [
    { href: '/dashboard', label: 'Mapa de jefes' },
    ...(role === 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <header
      className="nav-grid sticky top-0 z-50 border-b border-border"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty('--gx', `${e.clientX - r.left}px`)
        e.currentTarget.style.setProperty('--gy', `${e.clientY - r.top}px`)
        e.currentTarget.classList.add('nav-glow-active')
      }}
      onMouseLeave={(e) => e.currentTarget.classList.remove('nav-glow-active')}
    >
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-6 relative z-10">

        {/* Logo — "RUSH" es el switch de tema escondido */}
        <Link href="/dashboard" className="font-mono text-sm font-bold tracking-tight shrink-0">
          <span className="text-python">PY</span>
          <span className="text-tx2">SQL</span>
          <span className="text-accent">BOSS</span>
          <button
            onClick={(e) => { e.preventDefault(); cycleTheme() }}
            className="text-tx3 hover:text-tx3"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'default', font: 'inherit', letterSpacing: 'inherit' }}
            title={`Tema: ${theme}`}
          >RUSH</button>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1 text-xs font-mono pixel-corners-sm transition-all ${
                pathname.startsWith(link.href)
                  ? 'bg-surface2 text-tx border border-border'
                  : 'text-tx2 hover:text-tx hover:bg-surface2'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          {username && (
            <div className="flex items-center gap-2">
              <span className="status-dot active" />
              <span className="font-mono text-xs text-tx2">{username}</span>
            </div>
          )}

          {/* Theme indicator — visible toggle */}
          <button
            onClick={cycleTheme}
            className="font-mono text-[10px] px-2 py-1 border border-border pixel-corners-sm text-tx3 hover:text-tx hover:border-border2 transition-all tracking-widest"
            title={`Tema actual: ${theme} — clic para cambiar`}
          >
            {theme === 'dark' ? 'BN' : theme === 'light' ? 'WH' : 'RD'}
          </button>

          {/* Logout placeholder */}
          {username && (
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="font-mono text-xs text-tx3 hover:text-danger transition-colors"
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
