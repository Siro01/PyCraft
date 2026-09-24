'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { setLocalUser, clearAmulets, clearAllProgress } from '@/lib/storage/local-store'
import { PixelDust } from '@/components/ui/PixelFX'
import { LoadingBar } from '@/components/ui/LoadingBar'
import { usernameToEmail } from '@/lib/auth/username-email'
import Win from '@/components/ui/Win'
import { PixelBitmap, CHEST_CLOSED, ICON_ARROW_RIGHT } from '@/components/game/architect/desktop/PixelBitmap'

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
  1: 'hsl(var(--accent))',
  2: 'hsl(var(--tx3))',
  3: 'hsl(var(--tx2))',
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

  // Código de prueba (alumno TEST)
  const [testMode, setTestMode] = useState(false)
  const [code, setCode]         = useState('')

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

  // ── Código de prueba: entra como el alumno TEST ───────────────────────────
  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'No se pudo iniciar la sesión de prueba.')
        setLoading(false)
        return
      }
      // Cada prueba arranca limpia: los amuletos viven en este navegador.
      clearAmulets()
      clearAllProgress()
      window.location.href = '/dashboard'
    } catch {
      setError('Sin conexión con el servidor. Probá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="desk-theme" style={{
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
        width: '100%', maxWidth: '420px', padding: '24px',
      }}>

        {/* Logo — mismo wordmark y lógica de color que el nav de la landing */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span className="chest-bob" style={{ display: 'inline-block', marginBottom: 10 }}><PixelBitmap rows={CHEST_CLOSED} scale={4} /></span>
          <div
            className="font-jersey"
            style={{
              fontSize: '26px', fontWeight: 700,
              letterSpacing: '0.04em', lineHeight: 1, marginBottom: '14px',
              textShadow: '3px 3px 0 hsl(var(--tx) / 0.16)',
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

        <Win
          active
          title={LOCAL_MODE ? 'MODO_LOCAL.EXE' : testMode ? 'CODIGO_PRUEBA.EXE' : 'INICIAR_SESION.EXE'}
          bodyStyle={{ padding: '20px 20px 22px' }}
          style={{ boxShadow: '6px 6px 0 hsl(var(--tx) / 0.2)' }}
        >
        {/* Heading — hereda font-jersey del h1 global, igual que la landing */}
        <h1 style={{
          margin: '0 0 6px', fontSize: '20px',
          color: 'hsl(var(--tx))',
        }}>
          {LOCAL_MODE ? 'Modo local' : testMode ? 'Modo prueba' : 'Iniciar sesión'}
        </h1>
        <p className="font-mono" style={{
          margin: '0 0 24px', fontSize: '13px', color: 'hsl(var(--tx3))',
        }}>
          {LOCAL_MODE
            ? 'El progreso se guarda en este navegador.'
            : testMode
              ? 'Ingresá el código que generó el docente.'
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
                    style={{
                      flex: 1, padding: '8px 0',
                      fontFamily: "'Courier New', monospace", fontSize: '11px',
                      letterSpacing: '0.06em',
                      border: `2px solid ${role === r ? 'hsl(var(--accent))' : 'hsl(var(--border2))'}`,
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
              <div role="alert" style={{
                padding: '10px 12px',
                background: 'hsl(var(--danger) / 0.08)',
                border: '2px solid hsl(var(--danger))',
                boxShadow: '3px 3px 0 hsl(var(--danger) / 0.35)',
                fontFamily: "'Courier New', monospace", fontSize: '12px', color: 'hsl(var(--danger))',
              }}>
                {error}
              </div>
            )}

            <button type="submit" className="cta-btn cta-btn--primary" disabled={loading} style={{ marginTop: '4px', justifyContent: 'center', width: '100%' }}>
              {loading ? <LoadingBar label="Entrando" size="xs" tone="current" estimatedMs={2000} /> : <>Entrar al combate <PixelBitmap rows={ICON_ARROW_RIGHT} scale={3} ink="currentColor" /></>}
            </button>
          </form>

        ) : testMode ? (
        /* ── TEST CODE FORM ── */
          <form onSubmit={handleTestLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label htmlFor="login-code" className="label-mono">
                Código de prueba
              </label>
              <input
                id="login-code"
                className="input"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                required
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={9}
                style={{ letterSpacing: '0.2em', textAlign: 'center' }}
              />
            </div>

            {error && (
              <div role="alert" style={{
                padding: '10px 12px',
                background: 'hsl(var(--danger) / 0.08)',
                border: '2px solid hsl(var(--danger))',
                boxShadow: '3px 3px 0 hsl(var(--danger) / 0.35)',
                fontFamily: "'Courier New', monospace", fontSize: '12px', color: 'hsl(var(--danger))',
              }}>
                {error}
              </div>
            )}

            <button type="submit" className="cta-btn cta-btn--primary" disabled={loading} style={{ marginTop: '4px', justifyContent: 'center', width: '100%' }}>
              {loading ? <LoadingBar label="Conectando" size="xs" tone="current" estimatedMs={3000} /> : <>Entrar como alumno TEST <PixelBitmap rows={ICON_ARROW_RIGHT} scale={3} ink="currentColor" /></>}
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
              <div role="alert" style={{
                padding: '10px 12px',
                background: 'hsl(var(--danger) / 0.08)',
                border: '2px solid hsl(var(--danger))',
                boxShadow: '3px 3px 0 hsl(var(--danger) / 0.35)',
                fontFamily: "'Courier New', monospace", fontSize: '12px', color: 'hsl(var(--danger))',
              }}>
                {error}
              </div>
            )}

            <button type="submit" className="cta-btn cta-btn--primary" disabled={loading} style={{ marginTop: '4px', justifyContent: 'center', width: '100%' }}>
              {loading ? <LoadingBar label="Conectando" size="xs" tone="current" estimatedMs={3000} /> : <>Entrar al combate <PixelBitmap rows={ICON_ARROW_RIGHT} scale={3} ink="currentColor" /></>}
            </button>
          </form>
        )}

        {!LOCAL_MODE && (
          <button
            type="button"
            onClick={() => { setTestMode((t) => !t); setError('') }}
            className="font-mono"
            style={{
              display: 'block', margin: '20px auto 0', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '11px', color: 'hsl(var(--tx3))', textDecoration: 'underline',
            }}
          >
            {testMode ? '← Volver al inicio de sesión' : 'Tengo un código de prueba'}
          </button>
        )}

        </Win>

        {/* Footer */}
        <div style={{
          marginTop: '24px',
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
        <p className="font-mono" style={{ marginTop: 14, textAlign: 'center', fontSize: 11, color: 'hsl(var(--tx3))' }}>
          <Link href="/privacidad" style={{ textDecoration: 'underline', padding: '6px 4px' }}>Privacidad</Link>
          {' · '}
          <Link href="/cookies" style={{ textDecoration: 'underline', padding: '6px 4px' }}>Cookies</Link>
        </p>
      </div>
    </div>
  )
}
