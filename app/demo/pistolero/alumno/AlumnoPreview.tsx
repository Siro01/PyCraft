'use client'

import { useMemo, useState } from 'react'
import StudentPistolero from '@/components/game/raid/StudentPistolero'
import SummonOverlay from '@/components/game/raid/SummonOverlay'
import { WantedDeskIcon, WantedPoster } from '@/components/game/raid/WantedPoster'
import type { RaidView, StudentRaidState } from '@/lib/game/raid/types'

// Vista previa (solo docente) de lo que ve el alumno: el aviso sorpresa y la
// pantalla del duelo en cada momento. Datos de mentira: no toca la base.

type Moment = 'lobby' | 'python' | 'sql' | 'won' | 'lost' | 'won-sin'

const MOMENTS: { id: Moment; label: string }[] = [
  { id: 'lobby', label: 'esperando que empiece' },
  { id: 'python', label: 'duelo · ejercicio Python' },
  { id: 'sql', label: 'duelo · ejercicio SQL' },
  { id: 'won', label: 'ganaron (con botín)' },
  { id: 'won-sin', label: 'ganaron (sin aciertos)' },
  { id: 'lost', label: 'ganó el Pistolero' },
]

const SEED = [
  'CREATE TABLE buscados (id INTEGER PRIMARY KEY, nombre TEXT, pueblo TEXT, recompensa INTEGER);',
  "INSERT INTO buscados VALUES (1, 'Billy el Lento', 'Polvorín', 80);",
  "INSERT INTO buscados VALUES (2, 'Juana Gatillo', 'Cactus Seco', 150);",
  "INSERT INTO buscados VALUES (3, 'El Tuerto Ramírez', 'Polvorín', 200);",
].join('\n')

function stateFor(m: Moment): StudentRaidState {
  const members = ['agus', 'cami', 'vos', 'mili', 'tomi'].map((u) => ({
    id: u, username: u, role: 'alumno' as const, state: 'alive' as const, solved: u === 'vos' ? (m === 'won-sin' ? 0 : 2) : 1,
  }))
  const status: RaidView['status'] = m === 'lobby' ? 'lobby' : m === 'lost' ? 'lost' : m.startsWith('won') ? 'won' : 'active'
  const raid: RaidView = {
    id: 'preview', kind: 'pistolero', status, bossHp: status === 'won' ? 0 : 6, bossHpMax: 10,
    teamHp: status === 'lost' ? 0 : 72, teamHpMax: 100, attacks: {}, startedAt: null, members,
  }
  const task = m === 'python'
    ? { id: 1, status: 'asignado' as const, exercise: { id: 'pist-py-j2', tier: 'junior' as const, type: 'python' as const, title: 'Cuenta regresiva', description: 'Contá 3, 2, 1 antes del disparo. Completá el paso del range para que cuente hacia atrás.', initialCode: 'for i in range(3, 0, ___):\n    print(i)\nprint("¡Fuego!")' } }
    : m === 'sql'
      ? { id: 2, status: 'asignado' as const, exercise: { id: 'pist-sql-j1', tier: 'junior' as const, type: 'sql' as const, title: 'Los más buscados', description: 'Traé el nombre de los forajidos con una recompensa mayor a 100.', initialCode: 'SELECT nombre\nFROM buscados\nWHERE recompensa ___ 100;', seedSQL: SEED } }
      : null
  return { aulaId: 'preview', me: 'vos', armed: true, raid, joined: true, task, lastVerdict: null, hint: null, bengalaUntil: 0 }
}

export default function AlumnoPreview() {
  const [moment, setMoment] = useState<Moment>('python')
  const [summon, setSummon] = useState(false)
  const [poster, setPoster] = useState<null | 'calma' | 'visto' | 'vencido'>(null)
  const [busy, setBusy] = useState(true)
  const preview = useMemo(() => stateFor(moment), [moment])

  return (
    <div>
      <div className="pist-preview-bar">
        <a href="/demo/pistolero">← vitrina</a>
        <span>VISTA DEL ALUMNO · datos de mentira</span>
        {MOMENTS.map((x) => (
          <button key={x.id} type="button" aria-pressed={moment === x.id} onClick={() => setMoment(x.id)}>{x.label}</button>
        ))}
        <button type="button" onClick={() => setSummon(true)}>ver el aviso sorpresa</button>
        <button type="button" onClick={() => setPoster('calma')}>cartel SE BUSCA</button>
        <button type="button" onClick={() => setPoster('visto')}>cartel · aula armada</button>
        <button type="button" onClick={() => setPoster('vencido')}>cartel · ya lo venció</button>
        <span className="pist-preview-pin" title="Así se ve en el escritorio del mapa (arriba a la derecha)"><WantedDeskIcon /></span>
        <label><input type="checkbox" checked={busy} onChange={(e) => setBusy(e.target.checked)} /> el alumno está en una batalla</label>
      </div>
      <StudentPistolero key={moment} preview={preview} />
      {poster && (
        <div className="wanted-modal" onClick={() => setPoster(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <WantedPoster seen={poster === 'visto'} beaten={poster === 'vencido' ? 2 : 0} />
            <button type="button" className="wanted-close" onClick={() => setPoster(null)}>cerrar</button>
          </div>
        </div>
      )}
      {summon && <SummonOverlay busy={busy} onGo={() => setSummon(false)} onLater={() => setSummon(false)} />}
    </div>
  )
}
