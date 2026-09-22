'use client'

import { useMemo } from 'react'
import { useReveal } from '@/lib/hooks/useReveal'
import BossCard from './BossCard'
import ResetBossButton from './ResetBossButton'
import { IconCheck, IconLock } from '@/components/ui/PixelIcons'
import type { Boss } from '@/types'

export interface BossProgressEntry {
  hp: number
  defeated: boolean
}

interface BossMapProps {
  bosses: Boss[]
  progress: Record<string, BossProgressEntry>
  enabledIds: Set<string>
  username?: string
  totalDefeated: number
  /** Local-mode extras (tier selector, admin reset) rendered above the progress bar */
  headerExtra?: React.ReactNode
  /** Local-mode storage notice, rendered below the header */
  notice?: React.ReactNode
  /** Empty-state message when nothing is unlocked yet */
  emptyState?: React.ReactNode
  /** Sesión del alumno TEST: permite reiniciar el progreso de cada jefe. */
  testMode?: boolean
}

// Misma agrupación narrativa que "Cómo funciona" en la landing: Python (1–6),
// SQLite (7–10), Python+SQL integrado incl. jefe final (11–14).
const ACTS: {
  key: string
  roman: string
  title: string
  subtitle: string
  colorVar: string
  match: (b: Boss) => boolean
}[] = [
  {
    key: 'python',
    roman: 'ACTO I',
    title: 'Python',
    subtitle: 'Variables, condicionales, bucles y funciones',
    colorVar: '--python',
    match: (b) => b.type === 'python',
  },
  {
    key: 'sql',
    roman: 'ACTO II',
    title: 'SQLite',
    subtitle: 'CREATE, SELECT, UPDATE, DELETE',
    colorVar: '--sql',
    match: (b) => b.type === 'sql',
  },
  {
    key: 'final',
    roman: 'ACTO III',
    title: 'Integración',
    subtitle: 'Python + sqlite3 combinados',
    colorVar: '--accent',
    match: (b) => b.type === 'mixed' || b.type === 'final',
  },
]

const solid = (colorVar: string) => `hsl(var(${colorVar}))`
const alpha = (colorVar: string, a: number) => `hsl(var(${colorVar}) / ${a})`

// ── Waypoint marker — sits on the connecting line ─────────────────────────────
function Waypoint({ isDefeated, isCurrent, isLocked, color }: {
  isDefeated: boolean; isCurrent: boolean; isLocked: boolean; color: string
}) {
  return (
    <span className="relative flex items-center justify-center shrink-0" style={{ width: 16, height: 16, marginTop: 6 }}>
      {isCurrent && (
        <span
          aria-hidden="true"
          className="absolute rounded-full animate-glow"
          style={{ inset: -6, background: color, opacity: 0.28, filter: 'blur(3px)' }}
        />
      )}
      <span
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: 14, height: 14,
          background: isLocked ? 'transparent' : color,
          border: `2px solid ${isLocked ? 'hsl(var(--border2))' : color}`,
        }}
      >
        {isDefeated && <IconCheck size={8} color="hsl(var(--bg))" />}
        {isLocked && <IconLock size={7} color="hsl(var(--tx3))" />}
      </span>
    </span>
  )
}

// ── Compact entry — defeated / locked bosses, low visual weight on purpose ───
function CompactEntry({ boss, isDefeated }: { boss: Boss; isDefeated: boolean }) {
  return (
    <div
      className="flex items-center gap-3 px-3.5 py-2.5 pixel-corners border"
      style={{
        borderColor: isDefeated ? `${boss.color}25` : 'hsl(var(--border))',
        background: isDefeated ? `${boss.color}07` : 'hsl(var(--surface) / 0.5)',
      }}
    >
      <span className="label-mono shrink-0">{boss.title}</span>
      <span
        className="font-mono text-xs font-bold truncate flex-1"
        style={{ color: isDefeated ? 'hsl(var(--tx2))' : 'hsl(var(--tx3))' }}
      >
        {boss.name}
      </span>
      <span className="font-mono text-[10px] shrink-0" style={{ color: 'hsl(var(--tx3))' }}>
        {isDefeated ? 'Completado' : `Clase ${boss.classNumber}`}
      </span>
    </div>
  )
}

// ── One row on the path: waypoint + (full card | compact entry) ──────────────
function PathNode({ boss, isDefeated, isAvailable, isCurrent, hpCurrent, lineColor, testMode }: {
  boss: Boss; isDefeated: boolean; isAvailable: boolean; isCurrent: boolean
  hpCurrent: number; lineColor: string; testMode?: boolean
}) {
  const { ref, visible } = useReveal(0.1)
  const isLocked = !isAvailable && !isDefeated

  return (
    <div
      ref={ref}
      className="relative flex gap-4 md:gap-5 pb-7 last:pb-0"
      style={{
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
      }}
    >
      <div className="relative flex justify-center" style={{ width: 28 }}>
        <Waypoint isDefeated={isDefeated} isCurrent={isCurrent} isLocked={isLocked} color={lineColor} />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        {isAvailable ? (
          <>
            {isCurrent && (
              <div
                className="mb-2 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-widest px-2 py-1 pixel-corners-sm"
                style={{ background: `${boss.color}18`, color: boss.color }}
              >
                <span className="w-1 h-1 rounded-full bg-current animate-glow" />
                SIGUIENTE JEFE
              </div>
            )}
            <div
              className={isCurrent ? 'pixel-corners' : undefined}
              style={isCurrent ? { boxShadow: `0 0 0 1px ${boss.color}55, 0 0 32px ${boss.color}18` } : undefined}
            >
              <BossCard boss={boss} isEnabled hpCurrent={hpCurrent} animated={isCurrent} />
            </div>
          </>
        ) : (
          <CompactEntry boss={boss} isDefeated={isDefeated} />
        )}
        {testMode && (isDefeated || hpCurrent < boss.hpMax) && (
          <div className="mt-1.5 flex justify-end">
            <ResetBossButton bossId={boss.id} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── One act: header + connecting line + its bosses ───────────────────────────
function ActSection({ act, bosses, progress, enabledIds, firstAvailableId, testMode }: {
  act: typeof ACTS[number]
  bosses: Boss[]
  progress: Record<string, BossProgressEntry>
  enabledIds: Set<string>
  firstAvailableId?: string
  testMode?: boolean
}) {
  const { ref, visible } = useReveal(0.05)
  const defeatedCount = bosses.filter((b) => progress[b.id]?.defeated).length

  return (
    <section id={`act-${act.key}`} className="mb-16 scroll-mt-20 last:mb-0">
      <div className="flex items-baseline justify-between gap-4 mb-7">
        <div>
          <div className="label-mono mb-1" style={{ color: solid(act.colorVar) }}>
            {act.roman} · {act.title}
          </div>
          <p className="font-mono text-xs" style={{ color: 'hsl(var(--tx3))' }}>{act.subtitle}</p>
        </div>
        <span className="font-mono text-xs tabular shrink-0" style={{ color: solid(act.colorVar) }}>
          {defeatedCount}/{bosses.length}
        </span>
      </div>

      <div ref={ref} className="relative">
        <div
          aria-hidden="true"
          className={visible ? 'absolute top-1 bottom-1 animate-path-draw' : 'absolute top-1 bottom-1'}
          style={{
            left: 13, width: 2,
            background: `linear-gradient(to bottom, ${alpha(act.colorVar, 0.5)}, ${alpha(act.colorVar, 0.1)})`,
            transformOrigin: 'top',
            transform: visible ? undefined : 'scaleY(0)',
          }}
        />
        {bosses.map((boss) => {
          const p = progress[boss.id]
          const isDefeated = p?.defeated ?? false
          const isAvailable = enabledIds.has(boss.id) && !isDefeated
          return (
            <PathNode
              key={boss.id}
              boss={boss}
              isDefeated={isDefeated}
              isAvailable={isAvailable}
              isCurrent={isAvailable && boss.id === firstAvailableId}
              hpCurrent={p?.hp ?? boss.hpMax}
              lineColor={solid(act.colorVar)}
              testMode={testMode}
            />
          )
        })}
      </div>
    </section>
  )
}

// ── Main map ───────────────────────────────────────────────────────────────────
export default function BossMap({
  bosses, progress, enabledIds, username, totalDefeated, headerExtra, notice, emptyState, testMode,
}: BossMapProps) {
  const firstAvailableId = useMemo(
    () => bosses.find((b) => enabledIds.has(b.id) && !progress[b.id]?.defeated)?.id,
    [bosses, enabledIds, progress]
  )

  const acts = useMemo(
    () => ACTS.map((act) => ({ ...act, bosses: bosses.filter(act.match) })),
    [bosses]
  )

  const pct = bosses.length ? Math.round((totalDefeated / bosses.length) * 100) : 0

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="label-mono mb-1">Mapa de jefes</div>
          <h1 className="text-3xl font-bold text-tx tracking-wide">
            Bienvenido, <span className="text-accent">{username}</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'hsl(var(--tx3))' }}>
            {totalDefeated} / {bosses.length} jefes derrotados
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 w-full max-w-xs">
          {headerExtra}
          <div className="w-full">
            <div className="flex justify-between label-mono mb-1.5">
              <span>Progreso total</span>
              <span className="text-accent">{pct}%</span>
            </div>
            <div className="hp-track h-2">
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${pct}%`, background: 'hsl(var(--accent))' }}
              />
            </div>
          </div>
        </div>
      </div>

      {notice}

      {/* Quick nav — salta de acto en acto, reemplaza la leyenda plana de antes */}
      <nav className="flex gap-2 flex-wrap mb-12" aria-label="Saltar a un acto">
        {acts.map((act) => {
          const defeatedCount = act.bosses.filter((b) => progress[b.id]?.defeated).length
          return (
            <a
              key={act.key}
              href={`#act-${act.key}`}
              className="font-mono text-xs px-3 py-1.5 pixel-corners-sm border transition-all hover:opacity-80"
              style={{
                borderColor: alpha(act.colorVar, 0.3),
                color: solid(act.colorVar),
                background: alpha(act.colorVar, 0.08),
              }}
            >
              {act.title} <span className="opacity-60 ml-1 tabular">{defeatedCount}/{act.bosses.length}</span>
            </a>
          )
        })}
      </nav>

      {enabledIds.size === 0 && emptyState}

      {acts.map((act) => (
        act.bosses.length > 0 && (
          <ActSection
            key={act.key}
            act={act}
            bosses={act.bosses}
            progress={progress}
            enabledIds={enabledIds}
            firstAvailableId={firstAvailableId}
            testMode={testMode}
          />
        )
      ))}
    </main>
  )
}
