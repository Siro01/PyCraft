'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Win from '@/components/ui/Win'
import BossTopicIcon from '@/components/game/map/BossTopicIcon'
import { IconCheck } from '@/components/ui/PixelIcons'
import { ACT_MAPS } from '@/lib/game/act-maps'
import { getBossById } from '@/lib/game/bosses'
import { getRepaso } from '@/lib/game/repasos'
import { sfx } from '@/lib/game/architect/sound'
import { getRepasoProgress, type RepasoProgressMap } from '@/lib/storage/local-store'
import RodolfoTalk from './RodolfoTalk'

const vt = 'var(--font-vt323), monospace'
const jersey = 'var(--font-jersey), monospace'

interface Props {
  /** Repasos habilitados para este alumno (ids de jefe). */
  ids: string[]
  /** Acto desde el que entró (el mapa lo manda) — ese grupo va primero. */
  actKey?: string
}

// La Escuelita de Rodolfo: el cuaderno de repasos que el docente le dejó al
// alumno. Una lista por acto (no una grilla de tarjetas): cada renglón es un
// repaso, con el jefe al que prepara, los temas y hasta dónde llegó.
export default function RepasoHub({ ids, actKey }: Props) {
  const [progress, setProgress] = useState<RepasoProgressMap>({})
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    setProgress(getRepasoProgress())
    setLoaded(true)
    sfx.schoolBell()
  }, [])

  const groups = useMemo(() => {
    const set = new Set(ids)
    const acts = [...ACT_MAPS].sort((a, b) => (a.key === actKey ? -1 : b.key === actKey ? 1 : a.index - b.index))
    return acts
      .map((act) => ({ act, bossIds: act.bosses.map((b) => b.id).filter((id) => set.has(id) && getRepaso(id)) }))
      .filter((g) => g.bossIds.length > 0)
  }, [ids, actKey])

  const pending = ids.filter((id) => !progress[id]?.done).length
  const greeting = !loaded ? [''] : ids.length === 0
    ? ['¡Hola! Por ahora no tenés repasos.', 'Si alguna vez faltás a una clase, tu docente te deja uno acá y lo hacemos juntos, paso a paso.']
    : pending === 0
      ? ['¡Hiciste todos los repasos! Podés volver a hacerlos cuando quieras, para refrescar.']
      : [
          '¡Bienvenido a mi Escuelita! Acá nos ponemos al día con lo que te perdiste.',
          pending === 1
            ? 'Tu docente te dejó un repaso. Es cortito: yo te explico y vos probás.'
            : `Tu docente te dejó ${pending} repasos. Empezá por el primero: yo te explico y vos probás.`,
        ]

  return (
    <div className="flex flex-col gap-5">
      <Win title="ESCUELITA.EXE" active bodyStyle={{ padding: 0 }}>
        <div className="repaso-hub-head">
          <RodolfoTalk lines={greeting} />
          <div className="repaso-hub-intro">
            <h1 style={{ fontFamily: jersey, fontSize: 'clamp(2rem, 4.4vw, 2.9rem)', lineHeight: 1.02, color: 'hsl(var(--tx))', margin: 0, letterSpacing: '0.02em' }}>
              Escuelita de Rodolfo
            </h1>
            <p style={{ fontFamily: vt, fontSize: 21, lineHeight: 1.2, color: 'hsl(var(--tx2))', margin: '8px 0 0', maxWidth: '46ch' }}>
              Repasos cortitos para ponerte al día antes de cada jefe. Rodolfo explica, vos completás el código y lo ejecutás de verdad.
            </p>
            <Link href="/dashboard" className="repaso-ghost-btn" style={{ marginTop: 14, alignSelf: 'flex-start' }} onClick={() => sfx.close()}>
              Volver al mapa
            </Link>
          </div>
        </div>
      </Win>

      {loaded && groups.map(({ act, bossIds }) => (
        <Win key={act.key} title={`${act.roman} · ${act.title.toUpperCase()}`} active={act.key === actKey} bodyStyle={{ padding: 0 }}>
          <ul className="repaso-list">
            {bossIds.map((id) => {
              const repaso = getRepaso(id)!
              const boss = getBossById(id)
              const p = progress[id]
              const status = p?.done ? 'done' : p && p.beat > 0 ? 'going' : 'new'
              return (
                <li key={id}>
                  <Link href={`/repaso/${id}`} className={`repaso-row repaso-row--${status}`} onClick={() => sfx.confirm()} onMouseEnter={() => sfx.hover()}>
                    <span className="repaso-row-icon" aria-hidden="true">
                      <BossTopicIcon bossId={id} size={20} color={status === 'done' ? 'hsl(var(--bg))' : 'hsl(var(--tx))'} />
                    </span>
                    <span className="repaso-row-main">
                      <span style={{ fontFamily: jersey, fontSize: 22, lineHeight: 1.05, color: 'hsl(var(--tx))' }}>{repaso.title}</span>
                      <span style={{ fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx3))' }}>
                        Antes del jefe {boss?.classNumber} · {boss?.name}
                      </span>
                      <span className="repaso-chips">
                        {repaso.topics.map((t) => <span key={t} className="repaso-chip">{t}</span>)}
                      </span>
                    </span>
                    <span className="repaso-row-status">
                      {status === 'done' && (
                        <span className="flex items-center gap-1.5" style={{ fontFamily: jersey, fontSize: 17, color: 'hsl(var(--accent))' }}>
                          <IconCheck size={14} color="hsl(var(--accent))" /> Terminado
                        </span>
                      )}
                      {status === 'going' && (
                        <span style={{ fontFamily: jersey, fontSize: 17, color: 'hsl(var(--tx2))' }}>Paso {p!.beat + 1} de {repaso.beats.length}</span>
                      )}
                      {status === 'new' && <span className="repaso-new">Nuevo</span>}
                      <span className="repaso-row-cta">{status === 'done' ? 'Repasar' : status === 'going' ? 'Seguir' : 'Empezar'}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Win>
      ))}
    </div>
  )
}
