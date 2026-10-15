'use client'

import { useEffect, useMemo } from 'react'
import SecretCanvas from '@/components/game/secret/SecretCanvas'
import Speech from '@/components/game/secret/Speech'
import { useTypewriter } from '@/components/game/architect/useTypewriter'
import { MAP_PALETTES } from '@/lib/game/act-maps'
import { sfx } from '@/lib/game/architect/sound'
import { getSecretBoss } from '@/lib/game/secret/bosses'
import {
  ARENA_DUEL_SECONDS, ARENA_EXERCISES, ARENA_STAKES, ARENA_XP_LOSS, ARENA_XP_WIN,
} from '@/lib/game/arena/rules'

// El Errante (el caballero del jefe secreto del bosque de Python) presenta La
// Arena: misma escena oscura y mismo diálogo letra por letra que su guarida.
// La primera vez explica todo; las siguientes, solo saluda (y se le puede
// pedir que explique de nuevo).

const DARK_VARS = MAP_PALETTES.dark as React.CSSProperties
const ERRANTE = getSecretBoss('secreto-errante')!

const [LOW, HIGH] = ARENA_STAKES

export const ARENA_INTRO_LINES = [
  'Shh... no te asustes. Soy El Errante: un proceso que nadie cerró.',
  'Camino por este bosque desde siempre. Y lo que más me gusta es mirar duelos.',
  'Esto es La Arena. Acá no hay jefes: tu rival es alguien de tu aula.',
  `Los dos reciben los mismos ${ARENA_EXERCISES} ejercicios. Gana el primero que los resuelve.`,
  `Tienen ${ARENA_DUEL_SECONDS / 60} minutos. Si se acaba el tiempo, gana quien resolvió más... y si van empatados, quien llegó primero.`,
  `Se pueden retar por ${LOW} o ${HIGH} diamantes: lo que gana uno, lo pierde el otro. O jugar un amistoso, donde nadie pierde nada.`,
  'Tus ítems funcionan contra el rival: la daga le congela el editor, el Zonda le vuela la consigna... pero se gastan aunque pierdas.',
  `El primer duelo contra cada compañero en cada acto da experiencia: ${ARENA_XP_WIN} si ganás, ${ARENA_XP_LOSS} si perdés. Los demás, solo la gloria.`,
  'Si son cuatro, jueguen 2 vs 2: el primero que termina su parte le hace relevo a su compañero y le saca el último.',
  'Elegí a alguien conectado y retalo. Yo voy a estar mirando.',
]

const GREETINGS = [
  ['Volviste. La arena nunca cierra para un proceso como yo.'],
  ['Otra vez por acá... Elegí bien a tu rival.'],
  ['Shh. Hay duelos esperando. Yo miro desde acá.'],
]

interface Props {
  /** Primera vez: la explicación completa. Si no, un saludo corto. */
  full: boolean
  onDone: () => void
  /** Desde el saludo: "explicame otra vez". */
  onExplain?: () => void
}

export default function ArenaHerald({ full, onDone, onExplain }: Props) {
  const lines = useMemo(() => (full ? ARENA_INTRO_LINES : GREETINGS[Math.floor(Math.random() * GREETINGS.length)]), [full])
  useEffect(() => { sfx.glitch() }, [full])

  const enter = () => { sfx.confirm(); onDone() }

  return (
    <div className="secret-arena arena-herald" style={{ ...DARK_VARS, colorScheme: 'dark' }} role="dialog" aria-label="El Errante presenta La Arena">
      <header className="secret-top">
        <button type="button" className="secret-link" onClick={enter}>saltar ▸</button>
        <span className="secret-top-spacer" />
        <span className="secret-step">la arena</span>
      </header>
      <div className="secret-grid">
        <section className="secret-boss" style={{ ['--phos' as string]: ERRANTE.color }}>
          <div className="secret-canvas">
            <SecretCanvas art={ERRANTE.art} color={ERRANTE.color} label={ERRANTE.name} />
          </div>
          <div className="secret-name">
            <span>{ERRANTE.name}</span>
            <small>guardián de la arena</small>
          </div>
        </section>
        <section className="secret-work">
          <Speech
            key={full ? 'full' : 'short'}
            lines={lines}
            color={ERRANTE.color}
            onDone={enter}
            cta="a la arena"
            choices={full ? undefined : [
              { label: 'a la arena', onPick: enter },
              { label: 'explicame otra vez', onPick: () => { sfx.pageTurn(); onExplain?.() } },
            ]}
          />
        </section>
      </div>
    </div>
  )
}

/**
 * El escenario del lobby: El Errante grande, en su escena oscura, diciendo UNA
 * línea según lo que pasa (elegí rival, te desafían, esperando…). Es el único
 * texto de ayuda en pantalla; las reglas quedan detrás de "¿cómo se juega?".
 */
export function ErranteStage({ line, onExplain }: { line: string; onExplain: () => void }) {
  const { shown, done } = useTypewriter(line, 'machine', 26)
  return (
    <section className="errante-stage" style={{ ...DARK_VARS, ['--phos' as string]: ERRANTE.color }} aria-label="El Errante">
      <div className="errante-stage-art">
        <SecretCanvas art={ERRANTE.art} color={ERRANTE.color} label={ERRANTE.name} tickMs={320} />
      </div>
      <div className="errante-stage-say">
        <span className="errante-stage-name">{ERRANTE.name}</span>
        <p aria-live="polite">
          <span className="sr-only">{line}</span>
          <span aria-hidden>{shown}{!done && <span className="secret-caret">█</span>}</span>
        </p>
        <button type="button" className="secret-link" onClick={() => { sfx.open(); onExplain() }}>¿cómo se juega? ▸</button>
      </div>
    </section>
  )
}
