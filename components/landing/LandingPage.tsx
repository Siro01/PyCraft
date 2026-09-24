'use client'

import { useEffect, useRef, useState } from 'react'
import { StatusMark } from '@/components/ui/StatusMark'
import { BOSSES } from '@/lib/game/bosses'
import { useReveal } from '@/lib/hooks/useReveal'
import {
  IconSnake, IconDatabase, IconSword, IconSprout,
  IconDagger, IconSkull, IconWizard, IconPotion,
  IconCrystal, IconBolt, IconPickaxe,
} from '@/components/ui/PixelIcons'
import { PixelDust, PixelBlob, ShatterText, bandedGradient } from '@/components/ui/PixelFX'
import { ImageAccordion, type AccordionPanel } from '@/components/ui/ImageAccordion'
import AsciiQuestion from '@/components/ui/AsciiQuestion'
import CrashTransition from '@/components/landing/CrashTransition'
import MascotGuide from '@/components/game/MascotGuide'
import PycraftOS from '@/components/landing/PycraftOS'
import { sfx } from '@/lib/game/architect/sound'
import SiteFooter from '@/components/layout/SiteFooter'
import HeroSparks from '@/components/landing/HeroSparks'
import { PixelBitmap, CHEST_CLOSED, ICON_ARROW_DOWN, ICON_PIG, STICKER_BITMAPS } from '@/components/game/architect/desktop/PixelBitmap'
import Win from '@/components/ui/Win'
import type { Boss } from '@/types'

// ── Typewriter ────────────────────────────────────────────────────────────────
function Typewriter({ text, delay = 0, onDone }: { text: string; delay?: number; onDone?: () => void }) {
  const [shown, setShown] = useState('')
  const [go, setGo] = useState(false)
  useEffect(() => { const t = setTimeout(() => setGo(true), delay); return () => clearTimeout(t) }, [delay])
  useEffect(() => {
    if (!go) return
    let i = 0
    const iv = setInterval(() => {
      setShown(text.slice(0, ++i))
      if (i >= text.length) { clearInterval(iv); onDone?.() }
    }, 55)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, text])
  return <>{shown}{shown.length < text.length && <span className="opacity-70" style={{ WebkitTextFillColor: 'hsl(var(--tx))', color: 'hsl(var(--tx))' }}>█</span>}</>
}

// ── Code terminal snippet ─────────────────────────────────────────────────────
// Las 4 mecánicas del juego — mismos datos que antes, ahora tipados para
// alimentar tanto el ImageAccordion (desktop) como el grid táctil (mobile).
const MECHANICS: AccordionPanel[] = [
  { id: 'mercader', Icon: IconWizard, title: 'Mercader Ambulante', color: '#FFB800', desc: 'Cada 2 jefes derrotados aparece el Mercader Ambulante y te ofrece un amuleto especial para las próximas batallas.' },
  { id: 'debilidad', Icon: IconSkull, title: 'Amuleto de Debilidad', color: 'hsl(var(--danger))', desc: 'El próximo jefe empieza con el 60% de vida. Estrategia pura.' },
  { id: 'pocion', Icon: IconPotion, title: 'Poción de Vida', color: 'hsl(var(--python))', desc: 'Restaurá tu barra de vida cuando las cosas se pongan difíciles. (TRAINEE)' },
  { id: 'teletransportador', Icon: IconCrystal, title: 'Teletransportador', color: '#FFB800', desc: 'Saltate un jefe a elección. ¿Problema con los bucles? Saltá y volvé después.' },
]

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
      className="font-mono text-xs leading-relaxed text-left"
      style={{
        background: 'hsl(var(--bg))',
        border: '2px solid hsl(var(--tx))',
        boxShadow: '6px 6px 0 hsl(var(--tx) / 0.2)',
        minHeight: 160,
      }}
    >
      {/* Barra de la ventana: luces cuadradas con brillo pixel */}
      <div
        className="hatch flex items-center gap-3 px-3"
        style={{ height: 30, borderBottom: '2px solid hsl(var(--tx))' }}
      >
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="pixel-light" style={{ ['--c' as string]: '#FF5F57', ['--d' as string]: '0s' } as React.CSSProperties} />
          <span className="pixel-light" style={{ ['--c' as string]: '#FEBC2E', ['--d' as string]: '1.4s' } as React.CSSProperties} />
          <span className="pixel-light" style={{ ['--c' as string]: '#28C840', ['--d' as string]: '2.8s' } as React.CSSProperties} />
        </div>
        <span
          style={{
            fontFamily: 'var(--font-jersey), monospace', fontSize: 15, letterSpacing: '0.06em', lineHeight: 1,
            background: 'hsl(var(--surface))', color: 'hsl(var(--tx))', padding: '2px 8px',
          }}
        >
          PYTHON_SQL.EXE
        </span>
      </div>

      <div className="p-5">
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
              Probá vos: declará tu primera variable
            </div>
            {history.map((h, i) => (
              <div key={i} className="mb-1.5">
                <div style={{ color: 'hsl(var(--tx2))' }}>&gt;&gt;&gt; {h.input}</div>
                <div style={{ color: h.ok ? 'hsl(var(--python))' : 'hsl(var(--danger))' }}>
                  <StatusMark ok={h.ok} scale={2} />{h.message.replace(/ ✓$/, '')}
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
  const isMystery = boss.id === 'el-arquitecto'
  const tone = boss.type === 'sql' ? '--sql' : boss.type === 'python' ? '--python' : '--accent'

  return (
    <div className="boss-mini shrink-0" style={{ width: 138 }}>
      <div className="hatch flex items-center px-2" style={{ height: 22, borderBottom: '2px solid hsl(var(--border2))' }}>
        <span style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 14, lineHeight: 1, letterSpacing: '0.06em', background: 'hsl(var(--surface))', color: 'hsl(var(--tx))', padding: '1px 6px' }}>
          {boss.title}
        </span>
      </div>
      <div className="flex flex-col items-center gap-2 px-3 py-3">
        {isMystery ? (
          <div className="flex items-center justify-center" style={{ height: 76 }}>
            <AsciiQuestion size={8} color="hsl(var(--accent))" />
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
          <div className="w-12 h-12 flex items-center justify-center hatch" style={{ border: '2px solid hsl(var(--border2))' }}>
            <span style={{ background: 'hsl(var(--surface))', display: 'flex', padding: 3 }}>
              {boss.type === 'sql'
                ? <IconDatabase size={26} color={`hsl(var(${tone}))`} />
                : boss.type === 'mixed'
                ? <IconBolt size={26} color={`hsl(var(${tone}))`} />
                : <IconSnake size={26} color={`hsl(var(${tone}))`} />}
            </span>
          </div>
        )}
        <span style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 19, lineHeight: 1, textAlign: 'center', color: 'hsl(var(--tx))' }}>
          {isMystery ? '???' : boss.name}
        </span>
        <span style={{ fontFamily: 'var(--font-pixel), monospace', fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.3, textAlign: 'center', color: `hsl(var(${tone}))` }}>
          {isMystery ? 'Solo lo verás al llegar' : boss.topic.split('·')[0].trim()}
        </span>
      </div>
    </div>
  )
}

// Encabezado de sección: pestaña de archivo + título con sombra dura
function SectionHead({ file, title, sub, center = false }: { file: string; title: string; sub?: string; center?: boolean }) {
  return (
    <div className={center ? 'text-center' : undefined}>
      <span className="section-tab">{file}</span>
      <h2 className="section-h2">{title}</h2>
      {sub && <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 22, lineHeight: 1.2, color: 'hsl(var(--tx2))', marginTop: 8, maxWidth: '60ch', marginInline: center ? 'auto' : undefined }}>{sub}</p>}
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
  const right = side === 'right'
  return (
    <div
      className={`flex items-end gap-3 ${right ? 'flex-row-reverse' : ''}`}
      style={{
        transition: `opacity 0.5s steps(5) ${delay}ms, transform 0.5s steps(5) ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : right ? 'translateX(20px)' : 'translateX(-20px)',
      }}
    >
      <span
        className="hatch shrink-0 flex"
        style={{ border: '2px solid hsl(var(--tx))', padding: 4 }}
        aria-hidden="true"
      >
        <span style={{ background: 'hsl(var(--surface))', display: 'flex', padding: 3 }}>
          {right
            ? <PixelBitmap rows={STICKER_BITMAPS.creeper} scale={4} ink="hsl(var(--accent))" />
            : <PixelBitmap rows={ICON_PIG} scale={3} />}
        </span>
      </span>
      <div
        className="max-w-xs px-4 py-3"
        style={{
          fontFamily: 'var(--font-vt323), monospace', fontSize: 22, lineHeight: 1.15,
          background: right ? 'hsl(var(--accent))' : 'hsl(var(--surface))',
          color: right ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
          border: `2px solid ${right ? 'hsl(var(--accent))' : 'hsl(var(--tx))'}`,
          boxShadow: '4px 4px 0 hsl(var(--tx) / 0.22)',
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
  const [bossTyped, setBossTyped] = useState(false)
  const [theme, setThemeState] = useState<'dark' | 'red' | 'light'>('dark')

  useEffect(() => {
    const cur = document.documentElement.dataset.theme
    if (cur === 'dark' || cur === 'red' || cur === 'light') setThemeState(cur)
  }, [])

  const cycleTheme = () => {
    const themes = ['dark', 'red', 'light'] as const
    const next = themes[(themes.indexOf(theme) + 1) % themes.length]
    setThemeState(next)
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('theme', next) } catch {}
    sfx.theme()
  }

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
        className="sticky top-0 z-40 grid items-center"
        style={{
          gridTemplateColumns: '1fr auto 1fr', gap: 16, padding: '0 20px', minHeight: 52,
          background: 'hsl(var(--surface))', borderBottom: '2px solid hsl(var(--tx))',
        }}
      >
        {/* Marca. "BOSSRUSH" es también el toggle de tema, por eso no es un <a href="/">:
            anidar un <button> dentro de un <a> es HTML inválido. */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="chest-bob shrink-0 hidden sm:block"><PixelBitmap rows={CHEST_CLOSED} scale={2} /></span>
          <div
            className="font-jersey tracking-wider whitespace-nowrap"
            style={{ fontSize: 'clamp(15px, 2vw, 21px)', color: 'hsl(var(--tx))', lineHeight: 1 }}
          >
            PYCRAFT + SQL ={' '}
            <button
              type="button"
              onClick={cycleTheme}
              style={{ color: 'hsl(var(--accent))', background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer', font: 'inherit', letterSpacing: 'inherit' }}
              aria-label="Cambiar tema"
              data-sfx="none"
              title="Cambiar tema"
            >BOSSRUSH</button>
          </div>
        </div>

        {/* Centro: secciones */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#jefes" className="lp-link">Los jefes</a>
          <a href="#como-funciona" className="lp-link">Cómo funciona</a>
          <a href="#dificultad" className="lp-link">Dificultad</a>
        </div>

        {/* Derecha: tema + entrar */}
        <div className="flex items-center justify-end gap-3 col-start-3">
          <button
            type="button"
            onClick={cycleTheme}
            title={`Tema actual: ${theme} — clic para cambiar`}
            className="hidden sm:inline-block"
            data-sfx="none"
            style={{
              fontFamily: 'var(--font-pixel), monospace', fontSize: 11, letterSpacing: '0.12em', padding: '6px 9px', cursor: 'pointer',
              background: 'transparent', color: 'hsl(var(--tx2))', border: '2px solid hsl(var(--border2))',
            }}
          >
            {theme === 'dark' ? 'BN' : theme === 'light' ? 'WH' : 'RD'}
          </button>
          <a
            href="/login"
            title="Entrar al taller"
            className="cta-btn cta-btn--primary"
            style={{ padding: '9px 14px', fontSize: 12, gap: 8, boxShadow: '3px 3px 0 hsl(var(--tx) / 0.3)' }}
          >
            <IconDatabase size={16} color="hsl(var(--bg))" />
            Entrar
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
        <HeroSparks />
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
            <span className="title-build inline-block" style={{ filter: 'drop-shadow(4px 4px 0 hsl(var(--tx) / 0.16))' }}>
              <ShatterText text="Python" color="hsl(var(--python))" style={{ color: 'hsl(var(--python))' }} />
              <ShatterText text=" + " color="hsl(var(--tx3))" style={{ color: 'hsl(var(--tx3))' }} />
              <ShatterText text="SQL" color="hsl(var(--sql))" style={{ color: 'hsl(var(--sql))' }} />
              <ShatterText text=" = " color="hsl(var(--tx3))" style={{ color: 'hsl(var(--tx3))' }} />
            </span>
            <br />
            {bossTyped ? (
              <ShatterText
                text="BOSS RUSH"
                color="hsl(var(--accent))"
                style={{
                  backgroundImage: bandedGradient(),
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              />
            ) : (
              <span
                style={{
                  backgroundImage: bandedGradient(),
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                <Typewriter text="BOSS RUSH" delay={700} onDone={() => setBossTyped(true)} />
              </span>
            )}
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
            <a href="/login" className="cta-btn cta-btn--primary">
              <IconSword size={18} color="hsl(var(--bg))" />
              Empezar el taller
            </a>
            <a href="#jefes" className="cta-btn">
              Ver los 14 jefes
              <PixelBitmap rows={ICON_ARROW_DOWN} scale={3} ink="currentColor" />
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
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ color: 'hsl(var(--tx3))', fontFamily: 'var(--font-pixel), monospace', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}
        >
          <span>scroll</span>
          <span className="animate-boss-idle"><PixelBitmap rows={ICON_ARROW_DOWN} scale={3} ink="currentColor" /></span>
        </div>
      </section>

      {/* ─── DIALOGUE ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6" ref={dialogRef}>
        <div className="max-w-lg mx-auto">
          <Win
            title="NUEVO_EN_PYCRAFT.TXT"
            active
            bodyStyle={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}
            style={{ transition: 'opacity 0.5s steps(5)', opacity: dialogStep >= 1 ? 1 : 0.0 }}
          >
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
          </Win>

          {/* Payoff */}
          <div
            className="text-center mt-8"
            style={{
              fontFamily: 'var(--font-jersey), monospace',
              fontSize: 'clamp(1.6rem, 4.6vw, 2.3rem)', lineHeight: 1.1,
              color: 'hsl(var(--tx))', textShadow: '3px 3px 0 hsl(var(--tx) / 0.14)',
              transition: 'opacity 0.7s steps(7), transform 0.7s steps(7)',
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
          <SectionHead file="14_JEFES.EXE" title="El Boss Rush te espera" sub="Cada jefe es un tema del taller. Derrotalos todos para completar el curso." />
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
          <Reveal className="mb-10">
            <SectionHead file="PYCRAFT_OS.EXE" title="Tres fases. Catorce jefes. Un sistema." />
          </Reveal>

          <Reveal>
            <PycraftOS />
          </Reveal>
        </div>
      </section>

      {/* ─── DIFFICULTY TIERS ────────────────────────────────────────────── */}
      <section id="dificultad" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal className="mb-10">
            <SectionHead file="DIFICULTAD.EXE" title="Tres niveles de combate" />
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {([
              {
                label: 'JUNIOR',
                colorVar: '--python',
                level: 1,
                icon: <IconSprout size={30} color="hsl(var(--python))" />,
                desc: 'Ejercicios guiados. Completás los huecos. Con tips del cerdito guía. Ideal para empezar desde cero.',
                badge: 'RECOMENDADO',
              },
              {
                label: 'TRAINEE',
                colorVar: '--accent',
                level: 2,
                icon: <IconDagger size={30} color="hsl(var(--accent))" />,
                desc: 'Escribís el código vos solo. Con barra de vida del jugador: cada respuesta incorrecta tiene un costo.',
                badge: null,
              },
              {
                label: 'SENIOR',
                colorVar: '--danger',
                level: 3,
                icon: <IconSkull size={30} color="hsl(var(--danger))" />,
                desc: 'Sin guías. Sin tips. Sin errores gratis. Solo vos y el problema.',
                badge: 'PRÓXIMAMENTE',
              },
            ] as const).map(({ label, colorVar, level, icon, desc, badge }, i) => (
              <Reveal key={label} delay={i * 120} className="h-full">
                <Win
                  title={`${label}.EXE`}
                  active={label === 'JUNIOR'}
                  tone={label === 'SENIOR' ? 'danger' : 'normal'}
                  className="h-full"
                  right={badge ? (
                    <span style={{ fontFamily: 'var(--font-pixel), monospace', fontSize: 8, letterSpacing: '0.1em', color: label === 'JUNIOR' ? 'hsl(var(--bg))' : 'hsl(var(--tx2))', background: label === 'JUNIOR' ? 'transparent' : 'hsl(var(--surface))', padding: '1px 5px' }}>
                      {badge}
                    </span>
                  ) : undefined}
                  bodyStyle={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="hatch flex" style={{ border: '2px solid hsl(var(--tx))', padding: 4 }}>
                      <span style={{ background: 'hsl(var(--surface))', display: 'flex', padding: 4 }}>{icon}</span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 28, lineHeight: 1, color: `hsl(var(${colorVar}))` }}>{label}</span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 21, lineHeight: 1.2, color: 'hsl(var(--tx2))', margin: 0, flex: 1 }}>{desc}</p>
                  <div className="flex items-center gap-2" aria-label={`Desafío ${level} de 3`}>
                    <span style={{ fontFamily: 'var(--font-pixel), monospace', fontSize: 9, letterSpacing: '0.12em', color: 'hsl(var(--tx3))' }}>RETO</span>
                    <span className="flex gap-1" aria-hidden="true">
                      {[1, 2, 3].map(n => (
                        <span key={n} style={{ width: 22, height: 10, border: `2px solid hsl(var(${n <= level ? colorVar : '--border2'}))`, background: n <= level ? `hsl(var(${colorVar}))` : 'transparent' }} />
                      ))}
                    </span>
                  </div>
                </Win>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MERCADER SECTION ────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: 'hsl(var(--surface))' }}>
        <div className="max-w-5xl mx-auto px-6">
          <Reveal className="mb-10">
            <SectionHead file="MECANICAS.EXE" title="No es solo código. Es estrategia." />
          </Reveal>
          {/* Accordion de imágenes (Bencho, MIT) adaptado a íconos pixel —
              necesita hover, así que solo se muestra desde md hacia arriba.
              Mobile ve el grid de tarjetas de siempre, que es táctil. */}
          <Reveal className="hidden md:block">
            <Win title="MECANICAS_DEL_JUEGO.EXE" active bodyStyle={{ padding: 10, background: 'hsl(var(--bg))' }}>
              <ImageAccordion panels={MECHANICS} height={300} />
            </Win>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {MECHANICS.map(({ id, Icon, title, color, desc }, i) => (
              <Reveal key={id} delay={i * 80} className="h-full">
                <Win title={`${id}.EXE`} className="h-full" bodyStyle={{ padding: 14, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span className="shrink-0"><Icon size={30} color={color} /></span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 22, lineHeight: 1, color: 'hsl(var(--tx))', marginBottom: 4 }}>{title}</div>
                    <div style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 20, lineHeight: 1.15, color: 'hsl(var(--tx2))' }}>{desc}</div>
                  </div>
                </Win>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ───────────────────────────────────────────────────── */}
      <section className="py-28">
        <Reveal className="max-w-xl mx-auto px-6">
          <Win title="EL_ARQUITECTO.EXE" active tone="safe" bodyStyle={{ padding: 36, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div className="relative z-10">
              <div className="flex justify-center mb-5">
                <AsciiQuestion size={18} color="hsl(var(--accent))" />
              </div>
              <div style={{ fontFamily: 'var(--font-pixel), monospace', fontSize: 11, letterSpacing: '0.16em', color: 'hsl(var(--accent))', marginBottom: 14 }}>
                ¿LISTO PARA EL DESAFÍO?
              </div>
              <h2 className="section-h2" style={{ marginBottom: 14 }}>
                El Arquitecto te está esperando
              </h2>
              <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 22, lineHeight: 1.2, color: 'hsl(var(--tx2))', margin: '0 auto 28px', maxWidth: '44ch' }}>
                14 jefes. 3 dificultades. Amuletos, mercaderes y batallas de código.
                Un taller donde programar es la única forma de ganar.
              </p>
              <a
                href="/login"
                onClick={(e) => { e.preventDefault(); setCrashing(true) }}
                className="cta-btn cta-btn--primary"
              >
                <IconSword size={18} color="hsl(var(--bg))" />
                Entrar al taller
              </a>
            </div>
          </Win>
        </Reveal>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────────── */}
      <SiteFooter />

    </div>
    {/* Rodolfo también saluda en la landing — mismo componente que en las batallas */}
    <MascotGuide tip="¡Hola! Soy Rodolfo. Te voy a acompañar en cada batalla del taller." />
    {/* Fuera del contenedor con filtro: un filter rompe el position:fixed de sus hijos */}
    {crashing && <CrashTransition href="/login" />}
    </>
  )
}
