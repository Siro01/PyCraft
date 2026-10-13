'use client'

import { useEffect, useRef, useState } from 'react'
import PistoleroStage, { type StageCue } from './PistoleroStage'
import PistoleroSay from './PistoleroSay'
import WesternText from './WesternText'
import { PISTOLERO_LINES, SUMMON_GRACE_SECONDS } from '@/lib/game/raid/pistolero'
import { westernSfx } from '@/lib/game/raid/western-sfx'

// El aviso sorpresa: el Pistolero entra, desenfunda y reta a toda el aula.
// Si el alumno está en medio de una batalla puede pedir 1 minuto para terminar.
// Se descarga recién cuando llega el aviso (next/dynamic en PistoleroWatcher).

export default function SummonOverlay({ busy, onGo, onLater }: { busy: boolean; onGo: () => void; onLater: () => void }) {
  const [cue, setCue] = useState<StageCue | null>(null)
  const [done, setDone] = useState(false)
  const goRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    westernSfx.spurs()
    setCue({ n: Date.now(), poses: ['desenfundar', 'giro'] })
    const t1 = setTimeout(() => westernSfx.cock(), 1500)
    const t2 = setTimeout(() => setCue({ n: Date.now(), poses: ['disparo'], fx: 'disparo' }), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  useEffect(() => { if (done) goRef.current?.focus() }, [done])

  return (
    <div className="summon" role="dialog" aria-modal="true" aria-label="El Pistolero te reta a un duelo">
      <div className="summon-card">
        <WesternText text="¡SE BUSCA!" px={6} className="summon-wanted" label="Se busca" />
        <div className="summon-grid">
          <PistoleroStage cue={cue} className="summon-stage" />
          <div className="summon-talk">
            <WesternText text="El Pistolero" px={2} tone="hueso" className="summon-name" />
            <PistoleroSay lines={PISTOLERO_LINES.intro} onDone={() => setDone(true)} className="summon-say" />
            {done ? (
              <div className="summon-actions">
                <button ref={goRef} type="button" className="summon-go" onClick={onGo}>¡AL DUELO! ▸</button>
                {busy && (
                  <button type="button" className="summon-later" onClick={onLater}>
                    voy en {SUMMON_GRACE_SECONDS / 60} minuto (termino lo que estoy haciendo)
                  </button>
                )}
              </div>
            ) : <span className="summon-hint">clic para apurarlo</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
