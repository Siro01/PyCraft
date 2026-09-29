'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AppWindow from '@/components/ui/AppWindow'
import { PixelBitmap, ICON_TERMINAL } from '@/components/game/architect/desktop/PixelBitmap'
import { IconCheck } from '@/components/ui/PixelIcons'
import { sfx } from '@/lib/game/architect/sound'
import { EMPTY_PLAYGROUND, getPlaygroundState, recordPlaygroundResult } from '@/lib/storage/local-store'
import { getPlaygroundAct, type PlaygroundTopic } from '@/lib/game/playground'
import ExerciseCard from './ExerciseCard'
import LevelBar from './LevelBar'
import PlaygroundTopicIcon from './PlaygroundTopicIcon'
import RodolfoCheer from './RodolfoCheer'

const jersey = 'var(--font-jersey), monospace'
const STREAK_MILESTONES = [3, 5, 8, 12]

type View = { kind: 'home' } | { kind: 'quiz'; topic: PlaygroundTopic } | { kind: 'results'; topic: PlaygroundTopic; score: number; streak: number; xpGained: number }

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
    const xpGained = finalScore * 10 + Math.max(0, finalBestStreak - 2) * 2
    const next = recordPlaygroundResult(topic.key, xpGained, finalBestStreak, finalScore)
    setPlayground(next)
    setView({ kind: 'results', topic, score: finalScore, streak: finalBestStreak, xpGained })
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
        <Link href="/dashboard" className="label-mono" style={{ color: 'hsl(var(--tx2))' }}>← Volver al mapa</Link>
      </div>

      <div className="p-3">
        <AppWindow
          title="PATIO_DE_JUEGOS.EXE"
          icon={<PixelBitmap rows={ICON_TERMINAL} scale={2} ink="hsl(var(--bg))" />}
          x={0} y={0} w={0} z={0}
          active
          mode="normal"
          essential
          flow
          onFocus={() => {}}
          bodyStyle={{ padding: 16 }}
        >
          <div className="mb-4" style={{ maxWidth: 320 }}>
            <LevelBar fromXp={playground.xp} toXp={playground.xp} />
          </div>

          {view.kind === 'home' && (
            <>
              <p className="mb-4" style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 20, color: 'hsl(var(--tx2))' }}>
                Practicá {actTitle} con tandas cortas — no hace falta derrotar a nadie. Sumás XP y podés volver cuando quieras.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {act.topics.map((topic) => {
                  const best = playground.bestScore[topic.key]
                  return (
                    <button
                      key={topic.key}
                      type="button"
                      onClick={() => startTopic(topic)}
                      className="text-left p-3 flex flex-col gap-2"
                      style={{ border: '2px solid hsl(var(--tx))', background: 'hsl(var(--surface))', boxShadow: '3px 3px 0 hsl(var(--tx) / 0.15)', cursor: 'pointer' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, border: '2px solid hsl(var(--tx))' }}>
                          <PlaygroundTopicIcon icon={topic.icon} size={14} color="hsl(var(--tx))" />
                        </span>
                        <span style={{ fontFamily: jersey, fontSize: 17, color: 'hsl(var(--tx))' }}>{topic.title}</span>
                      </div>
                      <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 17, color: 'hsl(var(--tx2))', lineHeight: 1.2 }}>{topic.blurb}</p>
                      <div className="flex items-center justify-between label-mono">
                        <span style={{ color: 'hsl(var(--tx3))' }}>{topic.exercises.length} ejercicios</span>
                        {best !== undefined && (
                          <span className="flex items-center gap-1" style={{ color: 'hsl(var(--accent))' }}>
                            <IconCheck size={9} color="hsl(var(--accent))" /> {best}/{topic.exercises.length}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
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
                Mejor racha: {view.streak} · +{view.xpGained} XP
              </p>
              <div className="mx-auto mb-5" style={{ maxWidth: 320 }}>
                <LevelBar fromXp={xpBefore} toXp={xpBefore + view.xpGained} />
              </div>
              <div className="flex items-center justify-center gap-2">
                <button type="button" className="cta-btn cta-btn--primary" onClick={() => { sfx.click(); setView({ kind: 'home' }) }}>
                  Volver al patio
                </button>
                <button type="button" className="cta-btn" onClick={() => startTopic(view.topic)}>
                  Repetir tanda
                </button>
              </div>
            </div>
          )}
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
