'use client'

import { useEffect, useRef, useState } from 'react'
import { BOSSES } from '@/lib/game/bosses'
import { useReveal } from '@/lib/hooks/useReveal'
import {
  IconSnake, IconDatabase, IconSword, IconSprout,
  IconDagger, IconSkull, IconWizard, IconPotion,
  IconCrystal, IconBolt, IconPickaxe,
} from '@/components/ui/PixelIcons'
import { PixelDust, PixelBlob } from '@/components/ui/PixelFX'
import AsciiQuestion from '@/components/ui/AsciiQuestion'
import CrashTransition from '@/components/landing/CrashTransition'
import type { Boss } from '@/types'

// ── Typewriter ────────────────────────────────────────────────────────────────
function Typewriter({ text, delay = 0 }: { text: string; delay?: number }) {
  const [shown, setShown] = useState('')
  const [go, setGo] = useState(false)
  useEffect(() => { const t = setTimeout(() => setGo(true), delay); return () => clearTimeout(t) }, [delay])
  useEffect(() => {
    if (!go) return
    let i = 0
    const iv = setInterval(() => {
      setShown(text.slice(0, ++i))
      if (i >= text.length) clearInterval(iv)
    }, 55)
    return () => clearInterval(iv)
  }, [go, text])
  return <>{shown}{shown.length < text.length && <span className="opacity-70" style={{ WebkitTextFillColor: 'hsl(var(--tx))', color: 'hsl(var(--tx))' }}>█</span>}</>
}

// ── Code terminal snippet ─────────────────────────────────────────────────────
const CODE_LINES = [
  { text: 'import sqlite3',         color: 'hsl(var(--accent))' },
  { text: '',                       color: '' },
  { text: 'conn = sqlite3.connect(":memory:")', color: 'hsl(var(--tx2))' },
  { text: 'cursor = conn.cursor()', color: 'hsl(var(--tx2))' },
  { text: '',                       color: '' },
  { text: 'cursor.execute("SELECT * FROM jefes")', color: 'hsl(var(--python))' },
  { text: '# → 14 jefes derrotados [OK]', color: 'hsl(var(--tx3))' },
]

// ── Mini validador de asignaciones de Python ────────────────────────────────
// No ejecuta código real (esto es la landing, no el motor Pyodide del juego):
// valida con reglas simples una línea "nombre = valor" y devuelve mensajes de
// error pensados para alguien que recién está aprendiendo, no un traceback real.
const PY_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class',
  'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global',
  'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
  'try', 'while', 'with', 'yield',
])

interface AttemptResult {
  input: string
  ok: boolean
  message: string
}

function checkAssignment(raw: string): AttemptResult {
  const input = raw.trim()

  if (!input) {
    return { input, ok: false, message: 'Escribí algo para probar. Ej: nombre = "Ada"' }
  }
  if (/^print\s*\(/.test(input)) {
    return { input, ok: false, message: 'Por ahora practiquemos declarar una variable. Probá: edad = 12' }
  }
  if (!input.includes('=') || input.includes('==')) {
    return { input, ok: false, message: 'Te falta el signo = para asignar un valor. Ej: edad = 12' }
  }

  const eqIdx = input.indexOf('=')
  const name = input.slice(0, eqIdx).trim()
  const value = input.slice(eqIdx + 1).trim()

  if (!name) return { input, ok: false, message: 'Falta el nombre de la variable antes del =' }
  if (!value) return { input, ok: false, message: `Falta el valor después del =. Ej: ${name} = "Ada"` }
  if (/\s/.test(name)) return { input, ok: false, message: 'El nombre de variable no puede tener espacios — usá guión bajo: mi_nombre' }
  if (/^\d/.test(name)) return { input, ok: false, message: `Una variable no puede empezar con un número: "${name}"` }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return { input, ok: false, message: `"${name}" no es un nombre válido — solo letras, números y _` }
  if (PY_KEYWORDS.has(name)) return { input, ok: false, message: `"${name}" es una palabra reservada de Python, elegí otro nombre` }

  if (/^(["']).*\1$/.test(value)) {
    return { input, ok: true, message: `${name} = ${value} → texto (str) creado ✓` }
  }
  if (/^["']/.test(value) || /["']$/.test(value)) {
    return { input, ok: false, message: 'Las comillas no cierran bien. Si es texto, escribilo así: "Ada"' }
  }
  if (/^-?\d+$/.test(value)) {
    return { input, ok: true, message: `${name} = ${value} → número entero (int) creado ✓` }
  }
  if (/^-?\d+\.\d+$/.test(value)) {
    return { input, ok: true, message: `${name} = ${value} → número decimal (float) creado ✓` }
  }
  if (value === 'True' || value === 'False') {
    return { input, ok: true, message: `${name} = ${value} → booleano (bool) creado ✓` }
  }
  return { input, ok: false, message: `Si "${value}" es texto, ponelo entre comillas: ${name} = "${value}"` }
}

function CodeTerminal({ visible }: { visible: boolean }) {
  const [linesShown, setLinesShown] = useState(0)
  const [history, setHistory] = useState<AttemptResult[]>([])
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible) return
    let i = 0
    const iv = setInterval(() => {
      i++
      setLinesShown(i)
      if (i >= CODE_LINES.length) clearInterval(iv)
    }, 280)
    return () => clearInterval(iv)
  }, [visible])

  const bootDone = linesShown >= CODE_LINES.length

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [history, bootDone])

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!draft.trim()) return
    setHistory((prev) => [...prev.slice(-4), checkAssignment(draft)])
    setDraft('')
  }

  return (
    <div
      className="pixel-corners p-5 font-mono text-xs leading-relaxed text-left"
      style={{
        background: 'hsl(0 0% 6%)',
        border: '1px solid hsl(var(--border))',
        boxShadow: '0 0 40px hsl(var(--accent) / 0.06)',
        minHeight: 160,
      }}
    >
      {/* Terminal chrome */}
      <div className="flex gap-1.5 mb-4">
        <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
      </div>

      <div ref={scrollRef} style={{ maxHeight: 210, overflowY: 'auto' }} className="no-scrollbar">
        {CODE_LINES.slice(0, linesShown).map((line, i) => (
          <div key={i} style={{ color: line.color || 'transparent', minHeight: '1.4em' }}>
            {line.text || ' '}
          </div>
        ))}
        {linesShown < CODE_LINES.length && linesShown > 0 && (
          <span className="opacity-60">█</span>
        )}

        {bootDone && (
          <>
            <div className="mt-3 mb-2" style={{ color: 'hsl(var(--tx3))' }}>
              ▸ Probá vos: declará tu primera variable
            </div>
            {history.map((h, i) => (
              <div key={i} className="mb-1.5">
                <div style={{ color: 'hsl(var(--tx2))' }}>&gt;&gt;&gt; {h.input}</div>
                <div style={{ color: h.ok ? 'hsl(var(--python))' : 'hsl(var(--danger))' }}>
                  {h.ok ? '✓ ' : '✗ '}{h.message}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {bootDone && (
        <div className="flex items-center gap-1.5 mt-1">
          <span style={{ color: 'hsl(var(--tx2))' }}>&gt;&gt;&gt;</span>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit(e)
            }}
            placeholder='nombre = "Ada"'
            aria-label="Terminal interactiva: declará tu primera variable de Python"
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent outline-none font-mono text-xs"
            style={{ color: 'hsl(var(--tx))', caretColor: 'hsl(var(--accent))' }}
          />
        </div>
      )}
    </div>
  )
}

// ── Boss carousel card ────────────────────────────────────────────────────────
// Solo estos jefes tienen sprite pixel-art en /public/bossicons; el resto usa el
// ícono de categoría directamente para no disparar un 404 en cada carga.
const BOSSES_WITH_ICON = new Set([
  'creeper-formulario', 'guardian-puerta', 'golem-infinito', 'maestro-craftero',
])

function BossCard({ boss }: { boss: Boss }) {
  const [err, setErr] = useState(false)
  // El jefe final es un misterio hasta llegar a él: signo de pregunta ASCII, sin nombre ni tema.
  const isMystery = boss.classNumber === 14
  return (
    <div
      className="boss-color-el pixel-corners shrink-0 flex flex-col items-center gap-2 px-4 py-4 border transition-all duration-300"
      style={{
        width: 128,
        borderColor: `${boss.color}30`,
        background: `${boss.color}08`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${boss.color}80`
        e.currentTarget.style.background = `${boss.color}14`
        e.currentTarget.style.transform = 'translateY(-4px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${boss.color}30`
        e.currentTarget.style.background = `${boss.color}08`
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {isMystery ? (
        <div className="flex items-center justify-center" style={{ height: 76 }}>
          <AsciiQuestion size={8} color={boss.color} />
        </div>
      ) : BOSSES_WITH_ICON.has(boss.id) && !err ? (
        <img
          src={`/bossicons/${boss.id}.png`}
          alt={boss.name}
          width={48}
          height={48}
          style={{ imageRendering: 'pixelated' }}
          onError={() => setErr(true)}
        />
      ) : (
        <div
          className="w-12 h-12 pixel-corners-sm flex items-center justify-center"
          style={{ background: `${boss.color}18` }}
        >
          {boss.type === 'sql'
            ? <IconDatabase size={28} color={boss.color} />
            : boss.type === 'mixed'
            ? <IconBolt size={28} color={boss.color} />
            : <IconSnake size={28} color={boss.color} />}
        </div>
      )}
      <span
        className="font-mono text-[9px] tracking-widest font-bold"
        style={{ color: boss.color }}
      >
        {boss.title}
      </span>
      <span
        className="font-mono text-[11px] text-center leading-tight"
        style={{ color: 'hsl(var(--tx2))' }}
      >
        {isMystery ? '???' : boss.name}
      </span>
      <span
        className="font-mono text-[9px] text-center leading-tight"
        style={{ color: 'hsl(var(--tx3))' }}
      >
        {isMystery ? 'Solo lo verás al llegar' : boss.topic.split('·')[0].trim()}
      </span>
    </div>
  )
}

// ── Reveal wrapper ────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
      }}
    >
      {children}
    </div>
  )
}

// ── Dialogue bubble ───────────────────────────────────────────────────────────
function Bubble({ text, side, visible, delay }: {
  text: string; side: 'left' | 'right'; visible: boolean; delay: number
}) {
  return (
    <div
      className={`flex ${side === 'right' ? 'justify-end' : 'justify-start'}`}
      style={{
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : side === 'right' ? 'translateX(20px)' : 'translateX(-20px)',
      }}
    >
      <div
        className="pixel-corners max-w-xs px-4 py-3 font-mono text-sm leading-relaxed"
        style={{
          background: side === 'right' ? 'hsl(var(--accent))' : 'hsl(var(--surface))',
          color: side === 'right' ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
          border: side === 'left' ? '2px solid hsl(var(--border2))' : '2px solid transparent',
        }}
      >
        {text}
      </div>
    </div>
  )
}

// ── Main landing page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const heroReveal = useReveal(0.01)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [dialogStep, setDialogStep] = useState(0)
  const [crashing, setCrashing] = useState(false)

  // Trigger dialogue animation on scroll into view
  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        obs.disconnect()
        const steps = [0, 1200, 2400, 3600]
        steps.forEach((ms, i) => setTimeout(() => setDialogStep(i + 1), ms))
      },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <>
    <div
      className={`min-h-screen flex flex-col ${crashing ? 'landing-crashing' : ''}`}
      style={{ background: 'hsl(var(--bg))', color: 'hsl(var(--tx))' }}
    >

      {/* ─── NAV ─────────────────────────────────────────────────────────── */}
      <nav
        className="nav-grid sticky top-0 z-40 flex items-center justify-between border-b"
        style={{ borderColor: 'hsl(var(--border2))', padding: '14px 24px' }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          e.currentTarget.style.setProperty('--gx', `${e.clientX - r.left}px`)
          e.currentTarget.style.setProperty('--gy', `${e.clientY - r.top}px`)
          e.currentTarget.classList.add('nav-glow-active')
        }}
        onMouseLeave={(e) => e.currentTarget.classList.remove('nav-glow-active')}
      >
        {/* Brand — pixel font title. "BOSSRUSH" es también el toggle de tema, por eso
            no es un <a href="/"> completo: anidar un <button> dentro de un <a> es
            HTML inválido y el click quedaba fuera de la ruta accesible/de teclado. */}
        <div
          className="font-jersey font-bold tracking-wider relative z-10"
          style={{ fontSize: 'clamp(14px, 2vw, 18px)', color: 'hsl(var(--tx))' }}
        >
          PYCRAFT + SQL ={' '}
          <button
            type="button"
            onClick={() => {
              const themes = ['dark', 'red', 'light'] as const
              const cur = document.documentElement.dataset.theme ?? 'dark'
              const next = themes[(themes.indexOf(cur as typeof themes[number]) + 1) % themes.length]
              document.documentElement.setAttribute('data-theme', next)
              try { localStorage.setItem('theme', next) } catch {}
            }}
            style={{ color: 'hsl(var(--accent))', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', letterSpacing: 'inherit' }}
            aria-label="Cambiar tema"
            title="Cambiar tema"
          >BOSSRUSH</button>
        </div>

        {/* Right: nav links + icon box */}
        <div className="flex items-center gap-5 relative z-10">
          <div className="hidden md:flex items-center gap-5 font-mono text-[11px] tracking-widest" style={{ color: 'hsl(var(--tx3))' }}>
            <a href="#jefes"          className="hover:text-tx transition-colors uppercase">Los jefes</a>
            <a href="#como-funciona"  className="hover:text-tx transition-colors uppercase">Cómo funciona</a>
            <a href="#dificultad"     className="hover:text-tx transition-colors uppercase">Dificultad</a>
          </div>

          {/* Pixel icon box — links to login */}
          <a
            href="/login"
            title="Entrar al taller"
            className="flex items-center justify-center transition-all duration-200"
            style={{
              width: 44,
              height: 44,
              border: '2px solid hsl(var(--border2))',
              background: 'hsl(var(--surface))',
              imageRendering: 'pixelated',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'hsl(var(--accent) / 0.8)'
              e.currentTarget.style.boxShadow = '0 0 12px hsl(var(--accent) / 0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'hsl(var(--border2))'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <IconDatabase size={26} color="hsl(var(--tx))" />
          </a>
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────────────────────── */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 py-28 overflow-hidden"
        style={{ minHeight: '92vh' }}
      >
        {/* Grilla de píxeles (mismo lenguaje que .nav-grid, no puntos circulares) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--border) / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.6) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Polvo de píxeles disperso */}
        <PixelDust />
        {/* Accent glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 40%, hsl(var(--accent) / 0.06), transparent)' }}
        />
        {/* Clúster de píxeles decorativo — esquinas, estilo acento de mapa */}
        <div className="absolute -bottom-4 -right-4 opacity-70 pointer-events-none hidden sm:block">
          <PixelBlob size={12} color="hsl(var(--accent))" opacity={0.35} />
        </div>
        <div className="absolute top-10 -left-6 opacity-70 pointer-events-none hidden sm:block" style={{ transform: 'scale(0.6)' }}>
          <PixelBlob size={12} color="hsl(var(--python))" opacity={0.25} />
        </div>

        <div ref={heroReveal.ref} className="relative z-10 flex flex-col items-center">
          {/* Badge */}
          <div
            className="pixel-corners-sm inline-flex items-center gap-2 px-3 py-1 border font-mono text-[11px] mb-8 uppercase tracking-widest"
            style={{
              borderColor: 'hsl(var(--accent) / 0.4)',
              color: 'hsl(var(--accent))',
              background: 'hsl(var(--accent) / 0.06)',
              transition: 'opacity 0.8s ease, transform 0.8s ease',
              opacity: heroReveal.visible ? 1 : 0,
              transform: heroReveal.visible ? 'translateY(0)' : 'translateY(16px)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-glow" />
            Taller de programación — Argentina 2025
          </div>

          {/* Main headline */}
          <h1
            className="leading-none mb-6"
            style={{
              fontSize: 'clamp(3rem, 9vw, 7rem)',
              letterSpacing: '0.02em',
              transition: 'opacity 0.8s ease 150ms, transform 0.8s ease 150ms',
              opacity: heroReveal.visible ? 1 : 0,
              transform: heroReveal.visible ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            <span style={{ color: 'hsl(var(--python))' }}>Python</span>
            <span style={{ color: 'hsl(var(--tx3))' }}> + </span>
            <span style={{ color: 'hsl(var(--sql))' }}>SQL</span>
            <span style={{ color: 'hsl(var(--tx3))' }}> = </span>
            <br />
            <span
              style={{
                backgroundImage: 'linear-gradient(180deg, hsl(var(--tx)) 20%, hsl(var(--tx2)) 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              <Typewriter text="BOSS RUSH" delay={700} />
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="font-mono text-sm max-w-xl mb-10 leading-relaxed"
            style={{
              color: 'hsl(var(--tx3))',
              transition: 'opacity 0.8s ease 300ms, transform 0.8s ease 300ms',
              opacity: heroReveal.visible ? 1 : 0,
              transform: heroReveal.visible ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            Un taller donde aprendés a programar{' '}
            <span style={{ color: 'hsl(var(--python))' }}>Python</span> y{' '}
            <span style={{ color: 'hsl(var(--sql))' }}>SQLite</span>{' '}
            derrotando{' '}
            <span style={{ color: 'hsl(var(--tx))' }}>14 jefes</span>{' '}
            inspirados en Minecraft.{' '}
            <span style={{ color: 'hsl(var(--accent))' }}>Sin aburrirte. Sin PowerPoint.</span>
          </p>

          {/* CTA buttons */}
          <div
            className="flex flex-wrap gap-3 justify-center"
            style={{
              transition: 'opacity 0.8s ease 450ms, transform 0.8s ease 450ms',
              opacity: heroReveal.visible ? 1 : 0,
              transform: heroReveal.visible ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            <a href="/login" className="btn-primary pixel-corners pixel-shadow font-mono text-sm px-7 py-3 inline-flex items-center gap-2">
              <IconSword size={14} color="white" />
              Empezar el taller
            </a>
            <a
              href="#jefes"
              className="pixel-corners pixel-shadow font-mono text-sm px-7 py-3 border transition-all"
              style={{ borderColor: 'hsl(var(--border2))', color: 'hsl(var(--tx2))' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'hsl(var(--accent) / 0.6)'
                e.currentTarget.style.color = 'hsl(var(--accent))'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'hsl(var(--border2))'
                e.currentTarget.style.color = 'hsl(var(--tx2))'
              }}
            >
              Ver los 14 jefes ↓
            </a>
          </div>
        </div>

        {/* Interactive code terminal — deja de flotar una vez que se puede escribir en ella */}
        <div
          className="relative z-10 w-full max-w-md mt-16"
          style={{
            transition: 'opacity 1s ease 800ms',
            opacity: heroReveal.visible ? 1 : 0,
          }}
        >
          <CodeTerminal visible={heroReveal.visible} />
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 font-mono text-[11px]"
          style={{ color: 'hsl(var(--tx3))' }}
        >
          <span>scroll</span>
          <span className="animate-boss-idle">↓</span>
        </div>
      </section>

      {/* ─── DIALOGUE ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6" ref={dialogRef}>
        <div className="max-w-lg mx-auto flex flex-col gap-5">
          <div
            className="label-mono text-center mb-4"
            style={{
              transition: 'opacity 0.5s ease',
              opacity: dialogStep >= 1 ? 1 : 0,
            }}
          >
            ¿Nuevo en PyCraft?
          </div>

          <Bubble
            side="left"
            text='print(" En este taller vamos a trabajar con PROGRAMACIÓN, Python y... Minecraft?")'
            visible={dialogStep >= 1}
            delay={0}
          />
          <Bubble
            side="right"
            text="¿Como que Minecraft? ¡Ella JURA!"
            visible={dialogStep >= 2}
            delay={0}
          />
          <Bubble
            side="left"
            text="¡Una BOSS RUSH para practicar Python y SQL! Derrotás jefes escribiendo código real."
            visible={dialogStep >= 3}
            delay={0}
          />

          {/* Payoff */}
          <div
            className="text-center font-mono font-bold mt-4"
            style={{
              fontSize: 'clamp(1.1rem, 3vw, 1.6rem)',
              color: 'hsl(var(--tx))',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
              opacity: dialogStep >= 4 ? 1 : 0,
              transform: dialogStep >= 4 ? 'scale(1)' : 'scale(0.95)',
            }}
          >
            Una{' '}
            <span style={{ color: 'hsl(var(--accent))' }}>Boss Rush</span>{' '}
            para practicar{' '}
            <span style={{ color: 'hsl(var(--python))' }}>Python</span>{' '}
            y{' '}
            <span style={{ color: 'hsl(var(--sql))' }}>SQLite</span>
          </div>
        </div>
      </section>

      {/* ─── BOSS CAROUSEL ───────────────────────────────────────────────── */}
      <section id="jefes" className="py-20 overflow-hidden">
        <Reveal className="max-w-5xl mx-auto px-6 mb-10">
          <div className="label-mono mb-2">14 JEFES</div>
          <h2 className="text-3xl font-bold text-tx tracking-wide">
            El Boss Rush te espera
          </h2>
          <p className="font-mono text-sm mt-2" style={{ color: 'hsl(var(--tx3))' }}>
            Cada jefe es un tema del taller. Derrotalos todos para completar el curso.
          </p>
        </Reveal>

        {/* Marquee */}
        <div className="relative">
          {/* Fade masks */}
          <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, hsl(var(--bg)), transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to left, hsl(var(--bg)), transparent)' }} />

          <div className="overflow-hidden">
            <div className="flex gap-3 animate-marquee" style={{ width: 'max-content' }}>
              {/* Set real, leído por lectores de pantalla */}
              {BOSSES.map((boss) => (
                <BossCard key={boss.id} boss={boss} />
              ))}
              {/* Copia visual para el loop infinito — oculta de accesibilidad para
                  no duplicar los 14 jefes en la lectura. display:contents no rompe
                  el gap del flex padre. */}
              <div style={{ display: 'contents' }} aria-hidden="true">
                {BOSSES.map((boss) => (
                  <BossCard key={`${boss.id}-dup`} boss={boss} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-20" style={{ background: 'hsl(var(--surface))' }}>
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="label-mono mb-2">CÓMO FUNCIONA</div>
            <h2 className="text-3xl font-bold text-tx tracking-wide mb-12">
              Tres fases. Catorce jefes. Un sistema.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              {
                icon: <IconSnake size={24} color="hsl(var(--python))" />,
                step: '01',
                title: 'Aprendés Python',
                color: 'hsl(var(--python))',
                desc: 'Variables, condicionales, bucles, listas y funciones. El arsenal base para el combate contra los primeros 6 jefes.',
              },
              {
                icon: <IconDatabase size={24} color="hsl(var(--sql))" />,
                step: '02',
                title: 'Aprendés SQLite',
                color: 'hsl(var(--sql))',
                desc: 'CREATE, SELECT, WHERE, GROUP BY, UPDATE, DELETE. La base de datos al servicio del código. Jefes 7 al 10.',
              },
              {
                icon: <IconSword size={24} color="hsl(var(--accent))" />,
                step: '03',
                title: 'Integrás y derrotás',
                color: 'hsl(var(--accent))',
                desc: 'Python + sqlite3 combinados. Proyectos reales: sistema de inventario, búsqueda, actualización. Jefes 11 al 14.',
              },
            ] as const).map(({ icon, step, title, color, desc }, i) => (
              <Reveal key={step} delay={i * 120}>
                <div
                  className="p-6 pixel-corners border h-full flex flex-col gap-4"
                  style={{ borderColor: `${color}25`, background: `${color}06` }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="font-mono text-[11px] font-bold tracking-widest"
                      style={{ color }}
                    >
                      {step}
                    </span>
                    {icon}
                  </div>
                  <div className="font-mono text-sm font-bold" style={{ color }}>
                    {title}
                  </div>
                  <div
                    className="font-mono text-xs leading-relaxed flex-1"
                    style={{ color: 'hsl(var(--tx3))' }}
                  >
                    {desc}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DIFFICULTY TIERS ────────────────────────────────────────────── */}
      <section id="dificultad" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="label-mono mb-2">DIFICULTAD</div>
            <h2 className="text-3xl font-bold text-tx tracking-wide mb-8">
              Tres niveles de combate
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              {
                label: 'JUNIOR',
                color: 'hsl(var(--python))',
                icon: <IconSprout size={28} color="hsl(var(--python))" />,
                desc: 'Ejercicios guiados. Completás los huecos. Con tips del cerdito guía. Ideal para empezar desde cero.',
                badge: 'RECOMENDADO',
              },
              {
                label: 'TRAINEE',
                color: 'hsl(var(--accent))',
                icon: <IconDagger size={28} color="hsl(var(--accent))" />,
                desc: 'Escribís el código vos solo. Con barra de vida del jugador: cada respuesta incorrecta tiene un costo.',
                badge: null,
              },
              {
                label: 'SENIOR',
                color: 'hsl(var(--danger))',
                icon: <IconSkull size={28} color="hsl(var(--danger))" />,
                desc: 'Sin guías. Sin tips. Sin errores gratis. Solo vos y el problema.',
                badge: 'PRÓXIMAMENTE',
              },
            ] as const).map(({ label, color, icon, desc, badge }, i) => (
              <Reveal key={label} delay={i * 120} className="h-full">
                <div
                  className="h-full p-6 pixel-corners border relative overflow-hidden flex flex-col gap-3"
                  style={{ borderColor: `${color}30`, background: `${color}05` }}
                >
                  {badge && (
                    <span
                      className="absolute top-3 right-3 font-mono text-[9px] tracking-widest px-2 py-0.5 pixel-corners-sm"
                      style={{ background: `${color}20`, color }}
                    >
                      {badge}
                    </span>
                  )}
                  {icon}
                  <span className="font-mono text-sm font-bold tracking-widest" style={{ color }}>
                    {label}
                  </span>
                  <span className="font-mono text-xs leading-relaxed" style={{ color: 'hsl(var(--tx3))' }}>
                    {desc}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MERCADER SECTION ────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: 'hsl(var(--surface))' }}>
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="label-mono mb-2">MECÁNICAS DEL JUEGO</div>
            <h2 className="text-3xl font-bold text-tx tracking-wide mb-8">
              No es solo código. Es estrategia.
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              { icon: <IconWizard size={28} color="#FFB800" />, title: 'Mercader Ambulante', color: '#FFB800', desc: 'Cada 2 jefes derrotados aparece el Mercader Ambulante y te ofrece un amuleto especial para las próximas batallas.' },
              { icon: <IconSkull size={28} color="hsl(var(--danger))" />, title: 'Amuleto de Debilidad', color: 'hsl(var(--danger))', desc: 'El próximo jefe empieza con el 60% de vida. Estrategia pura.' },
              { icon: <IconPotion size={28} color="hsl(var(--python))" />, title: 'Poción de Vida', color: 'hsl(var(--python))', desc: 'Restaurá tu barra de vida cuando las cosas se pongan difíciles. (TRAINEE)' },
              { icon: <IconCrystal size={28} color="#FFB800" />, title: 'Teletransportador', color: '#FFB800', desc: 'Saltate un jefe a elección. ¿Problema con los bucles? Saltá y volvé después.' },
            ] as const).map(({ icon, title, color, desc }, i) => (
              <Reveal key={title} delay={i * 80} className="h-full">
                <div
                  className="boss-color-el h-full flex items-start gap-4 p-5 pixel-corners border"
                  style={{ borderColor: `${color}25`, background: `${color}06` }}
                >
                  <span className="shrink-0">{icon}</span>
                  <div>
                    <div className="font-mono text-sm font-bold mb-1" style={{ color }}>{title}</div>
                    <div className="font-mono text-xs leading-relaxed" style={{ color: 'hsl(var(--tx3))' }}>{desc}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ───────────────────────────────────────────────────── */}
      <section className="py-28">
        <Reveal className="max-w-xl mx-auto px-6">
          <div
            className="pixel-corners-lg p-10 text-center relative overflow-hidden"
            style={{
              border: '1px solid hsl(var(--accent) / 0.3)',
              background: 'hsl(var(--surface))',
              boxShadow: '0 0 80px hsl(var(--accent) / 0.07)',
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--accent) / 0.07), transparent)' }}
            />
            <div className="relative z-10">
              <div className="flex justify-center mb-5">
                <AsciiQuestion size={18} />
              </div>
              <div className="font-mono text-[11px] tracking-widest mb-4" style={{ color: 'hsl(var(--accent))' }}>
                ¿LISTO PARA EL DESAFÍO?
              </div>
              <h2 className="text-3xl font-bold text-tx tracking-wide mb-4">
                El Arquitecto te está esperando
              </h2>
              <p className="font-mono text-sm mb-8 leading-relaxed" style={{ color: 'hsl(var(--tx3))' }}>
                14 jefes. 3 dificultades. Amuletos, mercaderes y batallas de código.
                Un taller donde programar es la única forma de ganar.
              </p>
              <a
                href="/login"
                onClick={(e) => { e.preventDefault(); setCrashing(true) }}
                className="btn-primary font-mono text-sm px-8 py-3 inline-flex items-center gap-2"
              >
                <IconSword size={14} color="white" />
                Entrar al taller
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────────── */}
      <footer
        className="border-t px-6 py-6 flex items-center justify-between flex-wrap gap-4"
        style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--tx3))' }}
      >
        <div className="font-mono text-xs">
          <span style={{ color: 'hsl(var(--python))' }}>Py</span>Craft BOSSRUSH
          <span className="mx-2">·</span>
          Taller de programación
          <span className="mx-2">·</span>
          2025
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <IconSnake size={12} color="hsl(var(--python))" />
          <span>Python</span>
          <span className="mx-1">+</span>
          <IconDatabase size={12} color="hsl(var(--sql))" />
          <span>SQLite</span>
          <span className="mx-1">+</span>
          <IconPickaxe size={12} color="hsl(var(--tx3))" />
          <span>Minecraft</span>
        </div>
      </footer>

    </div>
    {/* Fuera del contenedor con filtro: un filter rompe el position:fixed de sus hijos */}
    {crashing && <CrashTransition href="/login" />}
    </>
  )
}
