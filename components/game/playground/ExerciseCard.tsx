'use client'

import { useState } from 'react'
import Link from 'next/link'
import { sfx } from '@/lib/game/architect/sound'
import { bookForExercise } from '@/lib/game/biblioteca'
import type { PlaygroundExercise } from '@/lib/game/playground'

interface Props {
  exercise: PlaygroundExercise
  onAnswered: (correct: boolean) => void
}

type Answered = { correct: boolean } | null

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

// Un ejercicio del patio: código opcional + consigna + opciones (mcq) o
// campo de texto corto (fill). Da feedback inmediato con la explicación,
// mismo lenguaje visual que el resto (borde de 2px, inversión de tinta).
export default function ExerciseCard({ exercise, onAnswered }: Props) {
  const [answered, setAnswered] = useState<Answered>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [fillValue, setFillValue] = useState('')
  const libro = bookForExercise(exercise.id)

  const resolve = (given: string) => {
    if (answered) return
    const correct = normalize(given) === normalize(exercise.answer)
    setAnswered({ correct })
    setPicked(given)
    if (correct) sfx.confirm(); else sfx.miss()
    onAnswered(correct)
  }

  return (
    <div>
      {exercise.code && (
        <pre
          className="font-mono mb-3 overflow-x-auto"
          style={{ background: 'hsl(var(--bg))', color: 'hsl(var(--tx))', border: '2px solid hsl(var(--border2))', padding: '10px 14px', fontSize: 15, lineHeight: 1.5 }}
        >
          {exercise.code}
        </pre>
      )}

      <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 21, color: 'hsl(var(--tx))', lineHeight: 1.25 }} className="mb-3">
        {exercise.prompt}
      </p>

      {exercise.type === 'mcq' && exercise.options && (
        <div className="flex flex-col gap-2">
          {exercise.options.map((opt) => {
            const isPicked = picked === opt
            const isCorrectOpt = normalize(opt) === normalize(exercise.answer)
            const show = answered && (isPicked || isCorrectOpt)
            return (
              <button
                key={opt}
                type="button"
                disabled={!!answered}
                onClick={() => resolve(opt)}
                className="text-left px-3 py-2"
                style={{
                  fontFamily: 'var(--font-vt323), monospace', fontSize: 19,
                  border: `2px solid ${show ? (isCorrectOpt ? 'hsl(var(--accent))' : 'hsl(var(--danger))') : 'hsl(var(--border2))'}`,
                  background: show ? (isCorrectOpt ? 'hsl(var(--accent) / 0.14)' : 'hsl(var(--danger) / 0.1)') : 'hsl(var(--surface))',
                  color: 'hsl(var(--tx))',
                  cursor: answered ? 'default' : 'pointer',
                  opacity: answered && !show ? 0.55 : 1,
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {exercise.type === 'fill' && (
        <div className="flex gap-2">
          <input
            type="text"
            value={fillValue}
            disabled={!!answered}
            onChange={(e) => setFillValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && fillValue.trim()) resolve(fillValue) }}
            placeholder="Escribí tu respuesta"
            className="flex-1"
            style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 19, background: 'hsl(var(--surface))', color: 'hsl(var(--tx))', border: '2px solid hsl(var(--tx))', padding: '8px 12px' }}
          />
          <button
            type="button"
            disabled={!!answered || !fillValue.trim()}
            onClick={() => resolve(fillValue)}
            className="cta-btn cta-btn--primary"
            style={{ opacity: !fillValue.trim() ? 0.5 : 1 }}
          >
            Responder
          </button>
        </div>
      )}

      {answered && (
        <div
          className="mt-3 px-3 py-2"
          style={{
            border: `2px solid ${answered.correct ? 'hsl(var(--accent))' : 'hsl(var(--danger))'}`,
            background: answered.correct ? 'hsl(var(--accent) / 0.1)' : 'hsl(var(--danger) / 0.08)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 15, color: answered.correct ? 'hsl(var(--accent))' : 'hsl(var(--danger))' }}>
            {answered.correct ? '¡Correcto!' : `No era — la respuesta es "${exercise.answer}"`}
          </div>
          <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 18, color: 'hsl(var(--tx2))', marginTop: 4 }}>
            {exercise.explain}
          </p>
          {libro && (
            <Link href={`/biblioteca?libro=${libro.book.id}&pagina=${libro.page}`} className="lib-from-playground">
              {answered.correct ? 'Leer más en la Biblioteca' : '¿No te quedó claro? Leelo en la Biblioteca'}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
