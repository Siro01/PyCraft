'use client'

import { useEffect, type ReactNode } from 'react'
import { BOSSES } from '@/lib/game/bosses'
import Cover from './Cover'
import { MERCADER, PISTOLERO, PLACES, RODOLFO } from './content'
import {
  AnnexPage, AuditPage, BossColorsPage, BossSheetPage, BossSystemPage, ControlsPage, GeneralAuditPage, IconsPage,
  IdeaPage, MercaderPage, MotionPage, PalettePage, PersonalityPage, PistoleroPage, PlaceSheet, PlayerPage,
  RodolfoPage, RulesPage, SecretsPage, ShapePage, TypePage, VariantsPage, VoicePage, WindowsPage,
} from './pages'
import './manual.css'

// Manual de marca como recorrido: la portada es el mapa del manual (cada parada
// una sección) y cada página interior lleva arriba el riel del camino con el
// avatar del alumno parado en la sección en la que estás. Una página = un tema.
// El orden de esta lista es el orden del PDF; los números de página salen solos.

type Entry = { section: string; render: (folio: number) => ReactNode }

const ENTRIES: Entry[] = [
  { section: 'esencia', render: (f) => <IdeaPage folio={f} /> },
  { section: 'esencia', render: (f) => <PersonalityPage folio={f} /> },
  { section: 'esencia', render: (f) => <VoicePage folio={f} /> },

  { section: 'fundamentos', render: (f) => <PalettePage folio={f} /> },
  { section: 'fundamentos', render: (f) => <BossColorsPage folio={f} /> },
  { section: 'fundamentos', render: (f) => <TypePage folio={f} /> },
  { section: 'fundamentos', render: (f) => <ShapePage folio={f} /> },
  { section: 'fundamentos', render: (f) => <IconsPage folio={f} /> },
  { section: 'fundamentos', render: (f) => <MotionPage folio={f} /> },

  { section: 'interfaz', render: (f) => <WindowsPage folio={f} /> },
  { section: 'interfaz', render: (f) => <ControlsPage folio={f} /> },

  { section: 'personajes', render: (f) => <PlayerPage folio={f} /> },
  { section: 'personajes', render: (f) => <RodolfoPage folio={f} sheet={RODOLFO} /> },
  { section: 'personajes', render: (f) => <MercaderPage folio={f} sheet={MERCADER} /> },
  { section: 'personajes', render: (f) => <PistoleroPage folio={f} sheet={PISTOLERO} /> },

  { section: 'jefes', render: (f) => <BossSystemPage folio={f} /> },
  ...BOSSES.map((b): Entry => ({ section: 'jefes', render: (f) => <BossSheetPage folio={f} bossId={b.id} /> })),

  { section: 'alternativos', render: (f) => <VariantsPage folio={f} /> },
  { section: 'alternativos', render: (f) => <SecretsPage folio={f} /> },

  ...PLACES.map((p): Entry => ({ section: p.section, render: (f) => <PlaceSheet folio={f} place={p} /> })),

  { section: 'reglas', render: (f) => <RulesPage folio={f} kind="do" /> },
  { section: 'reglas', render: (f) => <RulesPage folio={f} kind="dont" /> },

  { section: 'coherencia', render: (f) => <AuditPage folio={f} /> },
  { section: 'coherencia', render: (f) => <GeneralAuditPage folio={f} /> },

  { section: 'anexo', render: (f) => <AnnexPage folio={f} /> },
]

// La portada es la página 1; la primera página de cada sección es su número en el mapa.
const FIRST_PAGE: Record<string, number> = {}
ENTRIES.forEach((e, i) => { FIRST_PAGE[e.section] ??= i + 2 })

export default function Manual() {
  // ?theme=light|dark|red (lo usa scripts/export-manual.mjs) sin tocar el tema guardado del docente.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('theme')
    if (t === 'light' || t === 'dark' || t === 'red') document.documentElement.setAttribute('data-theme', t)
  }, [])
  return (
    <div className="mm-root">
      <Cover pages={FIRST_PAGE} />
      {ENTRIES.map((e, i) => <div key={i} style={{ display: 'contents' }}>{e.render(i + 2)}</div>)}
    </div>
  )
}
