'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AppWindow from '@/components/ui/AppWindow'
import { PixelBitmap, ICON_TERMINAL } from '@/components/game/architect/desktop/PixelBitmap'
import { sfx } from '@/lib/game/architect/sound'
import { EMPTY_PLAYGROUND, getPlaygroundState, getTextZoom, recordPlaygroundResult, setTextZoom, TEXT_ZOOM_DEFAULT } from '@/lib/storage/local-store'
import { getPlaygroundAct, type PlaygroundTopic } from '@/lib/game/playground'
import ExerciseCard from './ExerciseCard'
import LevelBar from './LevelBar'
import PlaygroundTopicIcon from './PlaygroundTopicIcon'
import RodolfoCheer from './RodolfoCheer'
import PlaygroundChecklist from './PlaygroundChecklist'
import DiamondCounter from './DiamondCounter'
import { PLAYGROUND_DIAMONDS_COMPLETE, PLAYGROUND_DIAMONDS_PERFECT, playgroundDiamonds, playgroundMaxDiamonds, topicReward } from '@/lib/game/playground-rewards'
import ZoomControl from '@/components/game/ZoomControl'

const jersey = 'var(--font-jersey), monospace'
const STREAK_MILESTONES = [3, 5, 8, 12]

type View =
  | { kind: 'home' }
  | { kind: 'quiz'; topic: PlaygroundTopic }
  | {
      kind: 'results'; topic: PlaygroundTopic; score: number; streak: number; xpGained: number; repeated: boolean
      /** Diamantes del patio antes/después de esta tanda (el contador sube entre los dos). */
      diamondsBefore: number; diamondsAfter: number
      newlyComplete: boolean; newlyPerfect: boolean; perfectNow: boolean
    }

export default function PlaygroundApp({ actKey, actTitle }: { actKey: string; actTitle: string }) {
  const act = useMemo(() => getPlaygroundAct(actKey), [actKey])
  // Arranca en el estado vacío (igual que el render del servidor, sin
  // localStorage) y recién después de montar lee el XP real — leerlo directo
  // en el useState inicial desincroniza el HTML del servidor con el del
  // cliente y React tira un error de hidratación.
  const [playground, setPlayground] = useState(EMPTY_PLAYGROUND)
  useEffect(() => { setPlayground(getPlaygroundState()) }, [])
  const [view, setView] = useState<View>({ kind: 'home' })
  const [exerciseIdx, setExerciseIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [cheerStreak, setCheerStreak] = useState<number | null>(null)
  const [xpBefore, setXpBefore] = useState(playground.xp)
  const [answered, setAnswered] = useState(false)
  const [maximized, setMaximized] = useState(false)
  /** Tanda recién tildada: al volver al checklist, su casilla entra animada. */
  const [justChecked, setJustChecked] = useState<string | null>(null)
  const [zoom, setZoom] = useState(TEXT_ZOOM_DEFAULT)
  useEffect(() => { setZoom(getTextZoom()) }, [])
  const handleZoom = (next: number) => { setZoom(next); setTextZoom(next) }

  // El sitio tiene su propio <header> arriba de esta página — se mide acá
  // para que "pantalla completa" llene lo que queda debajo sin taparlo
  // (mismo mecanismo que MAPA_DE_JEFES.EXE en el dashboard).
  useEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const measure = () => document.documentElement.style.setProperty('--dash-header-h', `${header.getBoundingClientRect().height}px`)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(header)
    return () => ro.disconnect()
  }, [])

  if (!act) {
    return (
      <div className="text-center py-10">
        <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 20, color: 'hsl(var(--tx2))' }}>
          Todavía no hay minijuegos armados para este acto.
        </p>
      </div>
    )
  }

  const startTopic = (topic: PlaygroundTopic) => {
    sfx.open()
    setExerciseIdx(0)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setXpBefore(playground.xp)
    setAnswered(false)
    setView({ kind: 'quiz', topic })
  }

  const finishTopic = (topic: PlaygroundTopic, finalScore: number, finalBestStreak: number) => {
    const xpEarned = finalScore * 10 + Math.max(0, finalBestStreak - 2) * 2
    const before = getPlaygroundState()
    const rewardBefore = topicReward(topic, before)
    const { state, xpAwarded } = recordPlaygroundResult(topic.key, xpEarned, finalBestStreak, finalScore)
    const rewardAfter = topicReward(topic, state)
    setPlayground(state)
    setView({
      kind: 'results', topic, score: finalScore, streak: finalBestStreak, xpGained: xpAwarded, repeated: xpAwarded === 0,
      diamondsBefore: playgroundDiamonds(before), diamondsAfter: playgroundDiamonds(state),
      newlyComplete: rewardAfter.complete && !rewardBefore.complete,
      newlyPerfect: rewardAfter.perfect && !rewardBefore.perfect,
      perfectNow: rewardAfter.perfect,
    })
  }

  const onAnswered = (correct: boolean) => {
    setAnswered(true)
    if (correct) {
      const s = streak + 1
      setStreak(s)
      setScore((sc) => sc + 1)
      setBestStreak((b) => Math.max(b, s))
      if (STREAK_MILESTONES.includes(s)) setCheerStreak(s)
    } else {
      setStreak(0)
    }
  }

  const nextExercise = (topic: PlaygroundTopic) => {
    if (exerciseIdx + 1 < topic.exercises.length) {
      setExerciseIdx((i) => i + 1)
      setAnswered(false)
    } else {
      finishTopic(topic, score, bestStreak)
    }
  }

  return (
    <div className="desk relative" style={{ border: '2px solid hsl(var(--tx))', background: 'hsl(var(--bg))', backgroundImage: 'radial-gradient(hsl(var(--tx) / 0.18) 1px, transparent 1px)', backgroundSize: '14px 14px', boxShadow: '6px 6px 0 hsl(var(--tx) / 0.18)' }}>
      <div className="flex items-center gap-3 px-2.5" style={{ height: 28, background: 'hsl(var(--surface))', borderBottom: '2px solid hsl(var(--tx))' }}>
        <span style={{ fontFamily: jersey, fontSize: 18, letterSpacing: '0.08em', color: 'hsl(var(--tx))' }}>PYCRAFT OS</span>
        <span style={{ flex: 1 }} />
        <ZoomControl zoom={zoom} onChange={handleZoom} />
        <Link href="/dashboard" className="label-mono" style={{ color: 'hsl(var(--tx2))' }}>← Volver al mapa</Link>
      </div>

      <div className="p-3">
        <AppWindow
          title="PATIO_DE_JUEGOS.EXE"
          icon={<PixelBitmap rows={ICON_TERMINAL} scale={2} ink="hsl(var(--bg))" />}
          x={0} y={0} w={0}
          z={maximized ? 60 : 0}
          active
          mode={maximized ? 'maximized' : 'normal'}
          essential
          flow={!maximized}
          onFocus={() => {}}
          onToggleMaximize={() => { sfx.click(); setMaximized((m) => !m) }}
          bodyStyle={{ padding: maximized ? 12 : 16 }}
        >
          <div style={{ zoom }}>
          {view.kind !== 'results' && (
            <div className="mb-4 flex flex-wrap items-end gap-x-8 gap-y-3">
              <div style={{ width: 320, maxWidth: '100%' }}>
                <LevelBar fromXp={playground.xp} toXp={playground.xp} />
              </div>
              <DiamondCounter from={playgroundDiamonds(playground)} to={playgroundDiamonds(playground)} max={playgroundMaxDiamonds()} />
            </div>
          )}

          {view.kind === 'home' && (
            <>
              <p className="mb-4" style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 20, color: 'hsl(var(--tx2))' }}>
                Practicá {actTitle} con tandas cortas. Cada tanda terminada te da {PLAYGROUND_DIAMONDS_COMPLETE} diamantes, y si la sacás perfecta, {PLAYGROUND_DIAMONDS_PERFECT} más.
              </p>
              <PlaygroundChecklist act={act} state={playground} onPlay={startTopic} justChecked={justChecked} />
            </>
          )}

          {view.kind === 'quiz' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="label-mono" style={{ color: 'hsl(var(--tx3))' }}>
                  {view.topic.title} · {exerciseIdx + 1}/{view.topic.exercises.length}
                </span>
                <span className="label-mono flex items-center gap-1" style={{ color: streak > 0 ? 'hsl(var(--accent))' : 'hsl(var(--tx3))' }}>
                  Racha: {streak}
                </span>
              </div>
              <ExerciseCard
                key={view.topic.exercises[exerciseIdx].id}
                exercise={view.topic.exercises[exerciseIdx]}
                onAnswered={onAnswered}
              />
              <AdvanceButton
                topic={view.topic}
                exerciseIdx={exerciseIdx}
                disabled={!answered}
                onNext={() => nextExercise(view.topic)}
              />
            </div>
          )}

          {view.kind === 'results' && (
            <div className="text-center py-2">
              <div style={{ fontFamily: jersey, fontSize: 24, color: 'hsl(var(--tx))' }}>
                {view.score}/{view.topic.exercises.length} correctas
              </div>
              <p className="mb-4" style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 19, color: 'hsl(var(--tx2))' }}>
                Mejor racha: {view.streak} · {view.repeated ? 'ya sumaste el XP de esta tanda antes' : `+${view.xpGained} XP`}
              </p>
              <div className="mx-auto mb-3 flex flex-wrap items-end justify-center gap-x-8 gap-y-3">
                <div style={{ width: 320, maxWidth: '100%' }}>
                  <LevelBar fromXp={xpBefore} toXp={xpBefore + view.xpGained} />
                </div>
                <DiamondCounter from={view.diamondsBefore} to={view.diamondsAfter} max={playgroundMaxDiamonds()} />
              </div>
              <p className="mb-5" style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 19, color: view.diamondsAfter > view.diamondsBefore ? 'hsl(var(--accent))' : 'hsl(var(--tx3))' }}>
                {view.newlyComplete && view.newlyPerfect
                  ? `¡Tanda terminada y perfecta! +${PLAYGROUND_DIAMONDS_COMPLETE + PLAYGROUND_DIAMONDS_PERFECT} diamantes.`
                  : view.newlyComplete
                    ? `¡Tanda terminada! +${PLAYGROUND_DIAMONDS_COMPLETE} diamantes. Sacala perfecta para ganar ${PLAYGROUND_DIAMONDS_PERFECT} más.`
                    : view.newlyPerfect
                      ? `¡Perfecta! +${PLAYGROUND_DIAMONDS_PERFECT} diamantes.`
                      : view.perfectNow
                        ? 'Ya ganaste todos los diamantes de esta tanda.'
                        : `Sacala perfecta para ganar ${PLAYGROUND_DIAMONDS_PERFECT} diamantes más.`}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  className="cta-btn cta-btn--primary"
                  onClick={() => {
                    sfx.click()
                    setJustChecked(view.newlyComplete || view.newlyPerfect ? view.topic.key : null)
                    setView({ kind: 'home' })
                  }}
                >
                  Volver al checklist
                </button>
                <button type="button" className="cta-btn" onClick={() => startTopic(view.topic)}>
                  Repetir tanda
                </button>
              </div>
            </div>
          )}
          </div>
        </AppWindow>
      </div>

      {cheerStreak !== null && <RodolfoCheer streak={cheerStreak} onDone={() => setCheerStreak(null)} />}
    </div>
  )
}

// Deshabilitado hasta que el alumno responde el ejercicio actual (PlaygroundApp
// lo controla con el estado `answered`, seteado por el onAnswered de ExerciseCard).
function AdvanceButton({ topic, exerciseIdx, disabled, onNext }: { topic: PlaygroundTopic; exerciseIdx: number; disabled: boolean; onNext: () => void }) {
  return (
    <div className="mt-4 flex justify-end">
      <button type="button" className="cta-btn cta-btn--primary" disabled={disabled} onClick={onNext} style={{ opacity: disabled ? 0.5 : 1 }}>
        {exerciseIdx + 1 < topic.exercises.length ? 'Siguiente →' : 'Ver resultado'}
      </button>
    </div>
  )
}
