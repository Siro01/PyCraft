'use client'

import { useMemo, type CSSProperties } from 'react'
import BossSprite from '@/components/game/BossSprite'
import StripSprite from '@/components/game/StripSprite'
import SecretCanvas from '@/components/game/secret/SecretCanvas'
import { MercaderPortrait } from '@/components/game/shop/MercaderPortrait'
import { MercaderAmbulantePortrait } from '@/components/game/shop/MercaderAmbulantePortrait'
import { PixelGrid } from '@/components/game/items/ItemSprites'
import { avatarRows, type Facing } from '@/components/game/map/avatars'
import { ICON_CHECK, ICON_CLOSE, ICON_WARN, PixelBitmap } from '@/components/game/architect/desktop/PixelBitmap'
import { BOSSES, getBossById } from '@/lib/game/bosses'
import { MAP_PALETTES } from '@/lib/game/act-maps'
import { SECRET_BOSSES } from '@/lib/game/secret/bosses'
import { makePistolero, toAscii, PISTOLERO_PALETTE } from '@/lib/game/raid/pistolero-art'
import { GUARDIAN_FRAMES, GUARDIAN_VARIANTS, ACTIVE_GUARDIAN, guardianSrc } from '@/lib/game/guardian-sprite'
import { GOLEM_FRAMES, GOLEM_VARIANTS, ACTIVE_GOLEM, golemSrc } from '@/lib/game/golem-sprite'
import { CRAFTERO_FRAMES, CRAFTERO_VARIANTS, ACTIVE_CRAFTERO, crafteroSrc } from '@/lib/game/craftero-sprite'
import { ARCHIVISTA_FRAMES, ARCHIVISTA_VARIANTS, ACTIVE_ARCHIVISTA, archivistaSrc } from '@/lib/game/archivista-sprite'
import { ORACULO_FRAMES, ORACULO_VARIANTS, ACTIVE_ORACULO, oraculoSrc } from '@/lib/game/oraculo-sprite'
import {
  ANNEX, AUDIT_PAGE, AUDIT_ROWS, BOSS_COLORS, BOSS_SHEETS, BOSS_SYSTEM, CONTROLS_PAGE, GENERAL_AUDIT, ICONS_PAGE, IDEA,
  MOTION_PAGE, PALETTE_PAGE, PERSONALITY, PLAYER_PAGE, RULES_DO, RULES_DONT, SECRETS_PAGE, SHAPE_PAGE, TYPE_PAGE,
  VARIANTS_PAGE, VOICE, WINDOWS_PAGE, type CharacterSheet, type PlacePage,
} from './content'
import { Facts, Page, PageHead, Shot, State, Swatch, Traits, Win, hslToHex, themeVars } from './parts'

type P = { folio: number }

// ─── 1 · Esencia ─────────────────────────────────────────────────────────────

export function IdeaPage({ folio }: P) {
  return (
    <Page folio={folio} here="esencia">
      <PageHead title={IDEA.title} />
      <p className="mm-display mm-statement">{IDEA.statement}</p>
      <div className="mm-cols-3" style={{ marginTop: 'auto' }}>
        {IDEA.keys.map((k) => (
          <div key={k.name} className="mm-keycard">
            <h2 className="mm-h2">{k.name}</h2>
            <p className="mm-read" style={{ marginTop: 8 }}>{k.body}</p>
          </div>
        ))}
      </div>
    </Page>
  )
}

export function PersonalityPage({ folio }: P) {
  return (
    <Page folio={folio} here="esencia">
      <PageHead title={PERSONALITY.title} summary={PERSONALITY.summary} />
      <div className="mm-grid-2x2">
        {PERSONALITY.pairs.map((p) => (
          <div key={p.is} className="mm-pair">
            <div className="mm-display" style={{ fontSize: 56 }}>{p.is}</div>
            <div className="mm-read mm-pair-not"><State state="falta" size={12} /> no {p.not.toLowerCase()}</div>
          </div>
        ))}
      </div>
    </Page>
  )
}

export function VoicePage({ folio }: P) {
  return (
    <Page folio={folio} here="esencia">
      <PageHead title={VOICE.title} summary={VOICE.summary} />
      <div className="mm-voice">
        <span className="mm-label">Así sí</span>
        <span className="mm-label">Así no</span>
        {VOICE.pairs.map((p) => (
          <div key={p.yes} style={{ display: 'contents' }}>
            <div className="mm-dialog">{p.yes}</div>
            <div className="mm-dialog mm-dialog--not">{p.no}</div>
          </div>
        ))}
      </div>
    </Page>
  )
}

// ─── 2 · Fundamentos ─────────────────────────────────────────────────────────

export function PalettePage({ folio }: P) {
  return (
    <Page folio={folio} here="fundamentos">
      <PageHead title={PALETTE_PAGE.title} summary={PALETTE_PAGE.summary} />
      <div className="mm-rows">
        {PALETTE_PAGE.themes.map((t) => (
          <div key={t.theme} className="mm-theme-row" style={themeVars(t.theme)}>
            <div className="mm-theme-name">
              <div className="mm-h2">{t.file}</div>
              <div className="mm-label">{t.use}</div>
            </div>
            {PALETTE_PAGE.swatches.map((sw) => (
              <div key={sw.token}>
                <div className="mm-chip" style={{ background: `hsl(var(${sw.token}))` }} />
                <div className="mm-label mm-chip-name">{sw.name}</div>
                <div className="mm-code">{hslToHex(MAP_PALETTES[t.theme][sw.token])}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Page>
  )
}

export function BossColorsPage({ folio }: P) {
  return (
    <Page folio={folio} here="fundamentos">
      <PageHead title={BOSS_COLORS.title} summary={BOSS_COLORS.summary} />
      <div className="mm-rows" style={{ gap: 18 }}>
        {BOSS_COLORS.acts.map((a) => (
          <div key={a.name} className="mm-color-row">
            <div className="mm-h2">{a.name}</div>
            {BOSSES.filter((b) => b.classNumber >= a.range[0] && b.classNumber <= a.range[1]).map((b) => (
              <div key={b.id}>
                <div className="mm-chip" style={{ background: b.color, height: 44 }} />
                <div className="mm-label mm-chip-name">{b.name}</div>
                <div className="mm-code">{b.color}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Page>
  )
}

export function TypePage({ folio }: P) {
  return (
    <Page folio={folio} here="fundamentos">
      <PageHead title={TYPE_PAGE.title} summary={TYPE_PAGE.summary} />
      <div className="mm-rows mm-rows--ruled">
        {TYPE_PAGE.faces.map((f) => (
          <div key={f.name} className="mm-type-row">
            <div>
              <div className="mm-h2">{f.name}</div>
              <div className="mm-label" style={{ marginTop: 6 }}>{f.role}</div>
            </div>
            <div style={{ fontFamily: `${f.font}, monospace`, fontSize: f.size, lineHeight: 1, letterSpacing: f.name === 'Silkscreen' ? '0.08em' : '0.02em' }}>{f.sample}</div>
          </div>
        ))}
      </div>
    </Page>
  )
}

export function ShapePage({ folio }: P) {
  const demos: CSSProperties[] = [
    { border: '2px solid hsl(var(--tx))' },
    { border: '2px solid hsl(var(--tx))', outline: '2px dashed hsl(var(--tx3))', outlineOffset: 8 },
    { border: '2px solid hsl(var(--tx))', boxShadow: '10px 10px 0 hsl(var(--tx) / 0.3)' },
  ]
  return (
    <Page folio={folio} here="fundamentos">
      <PageHead title={SHAPE_PAGE.title} summary={SHAPE_PAGE.summary} />
      <div className="mm-cols-3" style={{ marginTop: 20 }}>
        {SHAPE_PAGE.items.map((it, i) => (
          <div key={it.name}>
            <div className="mm-shape-demo" style={demos[i]} />
            <h2 className="mm-h2" style={{ marginTop: 34 }}>{it.name}</h2>
            <p className="mm-read" style={{ marginTop: 6 }}>{it.body}</p>
          </div>
        ))}
      </div>
    </Page>
  )
}

export function IconsPage({ folio }: P) {
  return (
    <Page folio={folio} here="fundamentos">
      <PageHead title={ICONS_PAGE.title} summary={ICONS_PAGE.summary} />
      <div className="mm-icons">
        {ICONS_PAGE.icons.map((ic) => (
          <div key={ic.name} className="mm-icon-cell">
            <div className="mm-icon-box"><PixelBitmap rows={ic.rows} scale={ic.rows[0].length > 12 ? 3 : 4} /></div>
            <div className="mm-label">{ic.name}</div>
          </div>
        ))}
      </div>
    </Page>
  )
}

export function MotionPage({ folio }: P) {
  const frames = Array.from({ length: GOLEM_FRAMES }, (_, i) => i)
  return (
    <Page folio={folio} here="fundamentos">
      <PageHead title={MOTION_PAGE.title} summary={MOTION_PAGE.summary} />
      <div className="mm-frames">
        {frames.map((i) => (
          <div key={i}>
            <div className="mm-frame-box">
              <div className="mm-frame-strip" style={{ backgroundImage: `url(${golemSrc(ACTIVE_GOLEM)})`, backgroundSize: `${GOLEM_FRAMES * 128}px 128px`, backgroundPosition: `-${i * 128}px 0` }} />
            </div>
            <div className="mm-label" style={{ marginTop: 8 }}>Cuadro {i + 1}</div>
          </div>
        ))}
      </div>
      <p className="mm-read" style={{ marginTop: 'auto' }}>{MOTION_PAGE.rule}</p>
    </Page>
  )
}

// ─── 3 · Interfaz ────────────────────────────────────────────────────────────

export function WindowsPage({ folio }: P) {
  const [active, rest, error] = WINDOWS_PAGE.states
  return (
    <Page folio={folio} here="interfaz">
      <PageHead title={WINDOWS_PAGE.title} summary={WINDOWS_PAGE.summary} />
      <div className="mm-cols-3">
        <div>
          <Win title={active.file} bodyStyle={{ height: 170 }}><span /></Win>
          <h2 className="mm-h2 mm-caption">{active.name}</h2>
          <p className="mm-read">{active.body}</p>
        </div>
        <div>
          <Win title={rest.file} rest bodyStyle={{ height: 170 }}><span /></Win>
          <h2 className="mm-h2 mm-caption">{rest.name}</h2>
          <p className="mm-read">{rest.body}</p>
        </div>
        <div>
          <Win title={error.file} tone="danger" bodyStyle={{ height: 170, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <PixelBitmap rows={ICON_WARN} scale={4} />
            <span className="mm-btn mm-btn--small">ENTENDIDO</span>
          </Win>
          <h2 className="mm-h2 mm-caption">{error.name}</h2>
          <p className="mm-read">{error.body}</p>
        </div>
      </div>
    </Page>
  )
}

export function ControlsPage({ folio }: P) {
  const states = ['Normal', 'Arriba', 'Hundido']
  return (
    <Page folio={folio} here="interfaz">
      <PageHead title={CONTROLS_PAGE.title} summary={CONTROLS_PAGE.summary} />
      <div className="mm-controls">
        <span />
        {states.map((s) => <span key={s} className="mm-label">{s}</span>)}
        <span className="mm-h2">Principal</span>
        {states.map((s, i) => <div key={s}><span className="mm-btn" data-state={i}>{CONTROLS_PAGE.primary}</span></div>)}
        <span className="mm-h2">Secundario</span>
        {states.map((s, i) => <div key={s}><span className="mm-btn mm-btn--ghost" data-state={i}>{CONTROLS_PAGE.secondary}</span></div>)}
        <span className="mm-h2">Campo</span>
        {['Normal', 'Foco'].map((s, i) => (
          <div key={s}>
            <span className="mm-field">
              <span className="mm-label">{s}</span>
              <span className="mm-input" data-focus={i === 1}>{CONTROLS_PAGE.inputValue}</span>
            </span>
          </div>
        ))}
        <span />
      </div>
    </Page>
  )
}

// ─── 4 · Personajes ──────────────────────────────────────────────────────────

export function PlayerPage({ folio }: P) {
  const dirs: Facing[] = ['down', 'left', 'up', 'right']
  return (
    <Page folio={folio} here="personajes">
      <PageHead title={PLAYER_PAGE.title} summary={PLAYER_PAGE.summary} />
      <div className="mm-cols-3">
        {PLAYER_PAGE.versions.map((v) => (
          <div key={v.id}>
            <Win title={`${v.name.toUpperCase()}.SPR`} rest={v.id !== 'minero'} bodyStyle={{ display: 'grid', placeItems: 'center', padding: '18px 0 14px', background: 'hsl(var(--bg))' }}>
              <PixelGrid rows={avatarRows(v.id, 'down', 0)} size={150} />
              <div style={{ display: 'flex', gap: 14, marginTop: 14 }}>
                {dirs.map((d) => <PixelGrid key={d} rows={avatarRows(v.id, d, 1)} size={44} />)}
              </div>
            </Win>
            <h2 className="mm-h2 mm-caption">{v.name}</h2>
            <p className="mm-read">{v.note}</p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto' }}><Facts items={PLAYER_PAGE.facts} /></div>
    </Page>
  )
}

function CharacterLayout({ folio, here, sheet, file, art, extra }: { folio: number; here: string; sheet: CharacterSheet; file: string; art: React.ReactNode; extra?: { label: string; value: React.ReactNode } }) {
  return (
    <Page folio={folio} here={here}>
      <div className="mm-cols-2">
        <Win title={file} bodyStyle={{ display: 'grid', placeItems: 'center', background: 'hsl(var(--bg))', padding: 24, minHeight: 400 }}>{art}</Win>
        <div className="mm-stack">
          <div>
            <h1 className="mm-display" style={{ fontSize: 76 }}>{sheet.title}</h1>
            <p className="mm-read" style={{ marginTop: 8 }}>{sheet.summary}</p>
          </div>
          <Traits is={sheet.is} isNot={sheet.isNot} />
          <div className="mm-dialog">{sheet.quote}</div>
          <Facts items={extra ? [...sheet.facts, extra] : sheet.facts} />
        </div>
      </div>
    </Page>
  )
}

export function RodolfoPage({ folio, sheet }: P & { sheet: CharacterSheet }) {
  return <CharacterLayout folio={folio} here="personajes" sheet={sheet} file="RODOLFO.GIF" art={<img src="/manual/rodolfo.png" alt="Rodolfo" width={288} height={288} style={{ imageRendering: 'pixelated' }} />} />
}

export function MercaderPage({ folio, sheet }: P & { sheet: CharacterSheet }) {
  return (
    <CharacterLayout folio={folio} here="personajes" sheet={sheet} file="MERCADER.SPR" art={
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}>
        <MercaderPortrait scale={5} animated={false} />
        <MercaderAmbulantePortrait scale={3} />
      </div>
    } />
  )
}

export function PistoleroPage({ folio, sheet }: P & { sheet: CharacterSheet }) {
  const rows = useMemo(() => toAscii(makePistolero('idle', 0)), [])
  return (
    <CharacterLayout folio={folio} here="personajes" sheet={sheet} file="PISTOLERO.TXT"
      art={<pre className="mm-ascii" style={{ color: PISTOLERO_PALETTE[2] }}>{rows.join('\n')}</pre>}
      extra={{ label: 'Colores', value: <span style={{ display: 'flex', gap: 6 }}>{PISTOLERO_PALETTE.map((c) => <Swatch key={c} color={c} />)}</span> }}
    />
  )
}

// ─── 5 · Jefes ───────────────────────────────────────────────────────────────

export function BossSystemPage({ folio }: P) {
  return (
    <Page folio={folio} here="jefes">
      <PageHead title={BOSS_SYSTEM.title} summary={BOSS_SYSTEM.summary} />
      <div className="mm-acts">
        {BOSS_SYSTEM.acts.map((a) => (
          <section key={a.name} className="mm-act">
            <div className="mm-h2">{a.name}</div>
            <div className="mm-label" style={{ marginTop: 4 }}>{a.theme}</div>
            <div className="mm-act-bosses">
              {BOSSES.filter((b) => b.classNumber >= a.range[0] && b.classNumber <= a.range[1]).map((b) => (
                <div key={b.id} className="mm-act-boss">
                  <div className="mm-act-sprite"><BossSprite boss={b} size="sm" /></div>
                  <span className="mm-label">{b.classNumber}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Page>
  )
}

// Escala de la ventana grande: el sprite "lg" mide 128px; los ASCII ya son grandes.
const SHEET_SCALE: Record<string, number> = { 'el-nexo': 1.4, 'el-arquitecto': 1.6, 'la-hydra': 2, 'dragon-rojo': 2 }

export function BossSheetPage({ folio, bossId }: P & { bossId: string }) {
  const boss = getBossById(bossId)!
  const s = BOSS_SHEETS[bossId]
  const k = SHEET_SCALE[bossId] ?? 2.4
  return (
    <Page folio={folio} here="jefes">
      <div className="mm-cols-2">
        <Win title={`${boss.id.toUpperCase().replace(/-/g, '_')}.SPR`} bodyStyle={{ position: 'relative', display: 'grid', placeItems: 'center', background: 'hsl(var(--bg))', minHeight: 420, overflow: 'hidden' }}>
          <div className="mm-big-sprite" style={{ transform: `scale(${k})` }}><BossSprite boss={boss} size="lg" animated /></div>
          <div style={{ position: 'absolute', right: 14, bottom: 12 }}><BossSprite boss={boss} size="sm" defeated /></div>
        </Win>
        <div className="mm-stack">
          <div>
            <h1 className="mm-display" style={{ fontSize: boss.name.length > 16 ? 60 : 76 }}>{boss.name}</h1>
            <p className="mm-read" style={{ marginTop: 6 }}>{boss.topic}</p>
          </div>
          <Traits is={s.is} isNot={s.isNot} />
          <div className="mm-dialog">{s.quote}</div>
          <Facts items={[
            { label: 'Acto', value: s.act.replace('Acto ', '') },
            { label: 'Técnica', value: s.technique },
            { label: 'Lienzo', value: s.canvas },
            { label: 'Derrota', value: s.defeated },
            { label: 'Color', value: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Swatch color={boss.color} />{boss.color}</span> },
          ]} />
        </div>
      </div>
    </Page>
  )
}

// ─── 6 · Alternativos ────────────────────────────────────────────────────────

const VARIANT_SETS = [
  { boss: 'guardian-puerta', variants: GUARDIAN_VARIANTS, active: ACTIVE_GUARDIAN, src: guardianSrc, frames: GUARDIAN_FRAMES },
  { boss: 'golem-infinito', variants: GOLEM_VARIANTS, active: ACTIVE_GOLEM, src: golemSrc, frames: GOLEM_FRAMES },
  { boss: 'maestro-craftero', variants: CRAFTERO_VARIANTS, active: ACTIVE_CRAFTERO, src: crafteroSrc, frames: CRAFTERO_FRAMES },
  { boss: 'archivista', variants: ARCHIVISTA_VARIANTS, active: ACTIVE_ARCHIVISTA, src: archivistaSrc, frames: ARCHIVISTA_FRAMES },
  { boss: 'oraculo-oscuro', variants: ORACULO_VARIANTS, active: ACTIVE_ORACULO, src: oraculoSrc, frames: ORACULO_FRAMES },
] as { boss: string; variants: { id: string; name: string }[]; active: string; src: (id: never) => string; frames: number }[]

export function VariantsPage({ folio }: P) {
  return (
    <Page folio={folio} here="alternativos">
      <PageHead title={VARIANTS_PAGE.title} summary={VARIANTS_PAGE.summary} />
      <div className="mm-variants">
        {VARIANT_SETS.map((set) => (
          <div key={set.boss} className="mm-variant-row">
            <div className="mm-h2">{getBossById(set.boss)!.name}</div>
            {set.variants.map((v) => (
              <div key={v.id} className="mm-variant">
                <StripSprite src={set.src(v.id as never)} frames={set.frames} frameMs={200} px={72} animated={false} label={v.name} />
                <span className="mm-variant-mark">{v.id === set.active && <State state="ok" size={12} />}</span>
                <span className="mm-read" style={{ color: v.id === set.active ? 'hsl(var(--tx))' : undefined }}>{v.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Page>
  )
}

export function SecretsPage({ folio }: P) {
  return (
    <Page folio={folio} here="alternativos">
      <PageHead title={SECRETS_PAGE.title} summary={SECRETS_PAGE.summary} />
      <div className="mm-cols-4">
        {SECRET_BOSSES.map((s) => (
          <div key={s.id}>
            <Win title={`${s.title}.EXE`} rest bodyStyle={{ background: '#000', display: 'grid', placeItems: 'center', height: 250, padding: 8 }}>
              <div className="mm-secret"><SecretCanvas art={s.art} color={s.color} animate={false} label={s.name} /></div>
            </Win>
            <h2 className="mm-h2 mm-caption">{s.name}</h2>
            <p className="mm-read">{s.epithet}</p>
            <div className="mm-code" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}><Swatch color={s.color} size={14} />{s.color}</div>
          </div>
        ))}
      </div>
    </Page>
  )
}

// ─── 7 · Lugares · 8 · Sitio ─────────────────────────────────────────────────

export function PlaceSheet({ folio, place }: P & { place: PlacePage }) {
  const two = place.shots.length > 1
  return (
    <Page folio={folio} here={place.section}>
      <PageHead title={place.title} summary={place.summary} />
      <div className={two ? 'mm-place mm-place--two' : 'mm-place'}>
        <div className={two ? 'mm-place-shots mm-place-shots--two' : 'mm-place-shots'}>
          {place.shots.map((s) => <Shot key={s.name} name={s.name} title={s.file} y={s.y} />)}
        </div>
        <ul className="mm-place-traits">
          {place.traits.map((t) => <li key={t}><State state="ok" size={12} /><span>{t}</span></li>)}
        </ul>
      </div>
    </Page>
  )
}

// ─── 9 · Reglas ──────────────────────────────────────────────────────────────

export function RulesPage({ folio, kind }: P & { kind: 'do' | 'dont' }) {
  const r = kind === 'do' ? RULES_DO : RULES_DONT
  return (
    <Page folio={folio} here="reglas">
      <PageHead title={r.title} summary={r.summary} />
      <div className="mm-rules">
        {r.items.map((it) => (
          <div key={it} className="mm-rule">
            <span className="mm-rule-mark" data-kind={kind}><PixelBitmap rows={kind === 'do' ? ICON_CHECK : ICON_CLOSE} scale={2} ink={kind === 'do' ? 'hsl(var(--bg))' : 'hsl(var(--tx))'} /></span>
            <span className="mm-read" style={{ color: 'hsl(var(--tx))' }}>{it}</span>
          </div>
        ))}
      </div>
    </Page>
  )
}

// ─── 10 · Coherencia ─────────────────────────────────────────────────────────

export function AuditPage({ folio }: P) {
  const c = AUDIT_PAGE.columns
  return (
    <Page folio={folio} here="coherencia">
      <PageHead title={AUDIT_PAGE.title} summary={AUDIT_PAGE.summary} />
      <div className="mm-cols-side">
        <table className="mm-matrix">
          <thead>
            <tr>
              <th className="mm-label">{c.boss}</th>
              <th className="mm-label">{c.technique}</th>
              <th className="mm-label mm-c">{c.pixel}</th>
              <th className="mm-label mm-c">{c.defeated}</th>
            </tr>
          </thead>
          <tbody>
            {AUDIT_ROWS.map((r) => (
              <tr key={r.bossId}>
                <td className="mm-h2" style={{ fontSize: 18 }}>{getBossById(r.bossId)!.name}</td>
                <td className="mm-read" style={{ fontSize: 18 }}>{r.technique}</td>
                <td className="mm-c"><State state={r.pixel} /></td>
                <td className="mm-c"><State state={r.defeated} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mm-stack" style={{ gap: 24 }}>
          <Legend />
          <Win title={AUDIT_PAGE.prioritiesTitle} bodyStyle={{ padding: '18px 18px 20px' }}>
            <ol className="mm-todo">
              {AUDIT_PAGE.priorities.map((p, i) => (
                <li key={p.title}>
                  <span className="mm-display" style={{ fontSize: 28, lineHeight: 0.8 }}>{i + 1}</span>
                  <div>
                    <div className="mm-h2">{p.title}</div>
                    <div className="mm-read" style={{ marginTop: 4 }}>{p.body}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Win>
        </div>
      </div>
    </Page>
  )
}

function Legend() {
  return (
    <div className="mm-legend">
      {(['ok', 'mejorar', 'falta'] as const).map((s) => (
        <span key={s}><State state={s} /><span className="mm-label">{s === 'ok' ? 'Bien' : s === 'mejorar' ? 'Mejorar' : 'Falta'}</span></span>
      ))}
    </div>
  )
}

export function GeneralAuditPage({ folio }: P) {
  return (
    <Page folio={folio} here="coherencia">
      <PageHead title={GENERAL_AUDIT.title} summary={GENERAL_AUDIT.summary} />
      <div className="mm-issues">
        {GENERAL_AUDIT.items.map((it) => (
          <div key={it.title} className="mm-issue">
            <State state={it.state} />
            <div>
              <h2 className="mm-h2">{it.title}</h2>
              <p className="mm-read" style={{ marginTop: 6 }}>{it.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto' }}><Legend /></div>
    </Page>
  )
}

// ─── Anexo ───────────────────────────────────────────────────────────────────

export function AnnexPage({ folio }: P) {
  return (
    <Page folio={folio} here="anexo">
      <PageHead title={ANNEX.title} summary={ANNEX.summary} />
      <table className="mm-matrix mm-annex">
        <tbody>
          {ANNEX.rows.map((r) => (
            <tr key={r.what}>
              <td className="mm-h2" style={{ fontSize: 18 }}>{r.what}</td>
              <td className="mm-code" style={{ fontSize: 13 }}>{r.where}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Page>
  )
}
