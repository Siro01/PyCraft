'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setLocalUser } from '@/lib/storage/local-store'
import { PixelDust } from '@/components/ui/PixelFX'
import { usernameToEmail } from '@/lib/auth/username-email'

const LOCAL_MODE =
  process.env.NEXT_PUBLIC_LOCAL_MODE === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? false)

// Final-boss watermark — colores del amuleto de El Arquitecto (BOSS-14)
const BOSS_MAP = [
  [0,3,1,1,1,1,3,0],
  [1,1,1,1,1,1,1,1],
  [1,1,2,1,1,2,1,1],
  [3,1,1,1,1,1,1,3],
  [1,1,3,3,3,3,1,1],
  [1,1,1,1,1,1,1,1],
  [0,1,1,0,0,1,1,0],
  [0,1,0,1,1,0,1,0],
]
const BOSS_CELL: Record<number, string> = {
  0: 'transparent',
  1: 'rgba(245,158,11,0.75)',
  2: 'rgba(161,100,0,0.75)',
  3: 'rgba(255,200,60,0.75)',
}
const CELL_PX = 22
const CELL_GAP = 2

export default function LoginPage() {
  const router = useRouter()

  // Local mode fields
  const [name, setName]       = useState('')
  const [role, setRole]       = useState<'student' | 'admin'>('student')

  // Supabase mode fields
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // ── Local mode login ──────────────────────────────────────────────────────
  const handleLocalLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('Ingresá tu nombre.'); return }
    setError('')
    setLoading(true)
    // Persist in localStorage — LocalDashboard reads from here
    setLocalUser({ name: trimmed, role })
    window.location.href = '/dashboard'
  }

  // ── Supabase mode login ───────────────────────────────────────────────────
  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    })
    if (authError) {
      setError('Usuario o contraseña incorrectos.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'hsl(var(--bg))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Grilla de píxeles — mismo patrón que el hero de la landing */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(hsl(var(--border) / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.6) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        pointerEvents: 'none',
      }} />

      {/* Polvo de píxeles disperso — mismo patrón que el hero de la landing */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <PixelDust />
      </div>

      {/* Accent glow — mismo patrón que el hero de la landing */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 70% 50% at 50% 40%, hsl(var(--accent) / 0.06), transparent)',
        pointerEvents: 'none',
      }} />

      {/* Boss watermark */}
      <div aria-hidden="true" style={{
        position: 'absolute', bottom: -28, right: -20,
        opacity: 0.055, pointerEvents: 'none', imageRendering: 'pixelated',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${BOSS_MAP[0].length}, ${CELL_PX}px)`,
          gap: `${CELL_GAP}px`,
        }}>
          {BOSS_MAP.flatMap((row, ri) =>
            row.map((cell, ci) => (
              <div key={`${ri}-${ci}`} style={{
                width: CELL_PX, height: CELL_PX,
                background: BOSS_CELL[cell],
              }} />
            ))
          )}
        </div>
      </div>

      {/* Form container */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: '336px', padding: '0 24px',
      }}>

        {/* Logo — mismo wordmark y lógica de color que el nav de la landing */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div
            className="font-jersey"
            style={{
              fontSize: '22px', fontWeight: 700,
              letterSpacing: '0.04em', lineHeight: 1, marginBottom: '14px',
            }}
          >
            <span style={{ color: 'hsl(var(--tx))' }}>PYCRAFT + SQL </span>
            <span style={{ color: 'hsl(var(--tx3))' }}>= </span>
            <span style={{ color: 'hsl(var(--accent))' }}>BOSSRUSH</span>
          </div>
          <div className="prompt" style={{ fontFamily: "'Courier New', monospace", fontSize: '11px', letterSpacing: '0.1em' }}>
            <span style={{ color: 'hsl(var(--tx3))' }}>
              {LOCAL_MODE ? 'local_mode' : 'awaiting_player'}
            </span>{' '}
            <span className="cursor" style={{ width: '6px', height: '12px', verticalAlign: 'text-bottom' }} />
          </div>
        </div>

        {/* Heading — hereda font-jersey del h1 global, igual que la landing */}
        <h1 style={{
          margin: '0 0 6px', fontSize: '20px',
          color: 'hsl(var(--tx))',
        }}>
          {LOCAL_MODE ? 'Modo local' : 'Iniciar sesión'}
        </h1>
        <p className="font-mono" style={{
          margin: '0 0 24px', fontSize: '13px', color: 'hsl(var(--tx3))',
        }}>
          {LOCAL_MODE
            ? 'El progreso se guarda en este navegador.'
            : 'Tu docente crea tu cuenta.'}
        </p>

        {/* ── LOCAL MODE FORM ── */}
        {LOCAL_MODE ? (
          <form onSubmit={handleLocalLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label htmlFor="login-name" className="label-mono">
                Tu nombre
              </label>
              <input
                id="login-name"
                className="input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Matías"
                required
                autoFocus
                maxLength={40}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <span className="label-mono" id="login-role-label">Rol</span>
              <div role="group" aria-labelledby="login-role-label" style={{ display: 'flex', gap: '8px' }}>
                {(['student', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={role === r}
                    onClick={() => setRole(r)}
                    className="pixel-corners-sm"
                    style={{
                      flex: 1, padding: '8px 0',
                      fontFamily: "'Courier New', monospace", fontSize: '11px',
                      letterSpacing: '0.06em',
                      border: `1px solid ${role === r ? 'hsl(var(--accent) / 0.65)' : 'hsl(var(--border))'}`,
                      background: role === r ? 'hsl(var(--accent) / 0.12)' : 'hsl(var(--surface))',
                      color: role === r ? 'hsl(var(--accent))' : 'hsl(var(--tx3))',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                  >
                    {r === 'student' ? 'Alumno' : 'Admin'}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div role="alert" className="pixel-corners-sm" style={{
                padding: '10px 12px',
                background: 'hsl(var(--danger) / 0.08)',
                border: '1px solid hsl(var(--danger) / 0.22)',
                fontFamily: "'Courier New', monospace", fontSize: '12px', color: 'hsl(var(--danger))',
              }}>
                {error}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: '2px' }}>
              {loading ? 'Entrando...' : 'Entrar al combate →'}
            </button>
          </form>

        ) : (
        /* ── SUPABASE FORM ── */
          <form onSubmit={handleSupabaseLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label htmlFor="login-username" className="label-mono">
                Usuario
              </label>
              <input
                id="login-username"
                className="input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nombre_alumno"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label htmlFor="login-password" className="label-mono">
                Contraseña
              </label>
              <input
                id="login-password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div role="alert" className="pixel-corners-sm" style={{
                padding: '10px 12px',
                background: 'hsl(var(--danger) / 0.08)',
                border: '1px solid hsl(var(--danger) / 0.22)',
                fontFamily: "'Courier New', monospace", fontSize: '12px', color: 'hsl(var(--danger))',
              }}>
                {error}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: '2px' }}>
              {loading ? 'Conectando...' : 'Entrar al combate →'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '32px', paddingTop: '20px',
          borderTop: '1px solid hsl(var(--border))',
          display: 'flex', justifyContent: 'center', gap: '16px',
        }}>
          {[
            { label: 'Python',   color: 'hsl(var(--python))' },
            { label: 'SQL',      color: 'hsl(var(--sql))' },
            { label: 'BOSS-14',  color: 'hsl(38 92% 60%)' },
          ].map(({ label, color }) => (
            <span key={label} className="font-mono" style={{
              fontSize: '10px', color, letterSpacing: '0.08em', opacity: 0.7,
            }}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
