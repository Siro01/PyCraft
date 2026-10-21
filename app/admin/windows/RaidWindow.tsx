'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Diamonds } from '@/components/ui/DiamondIcon'
import { getSecretBoss } from '@/lib/game/secret/bosses'
import { sfx } from '@/lib/game/architect/sound'
import type { AdminAula } from '../aula-label'

// RAID.EXE: los duelos del Pistolero y las raids contra jefes secretos.
// Arriba, la entrada a la Mesa del Pistolero (y su ensayo); debajo, un
// renglón por raid: contra quién, el equipo con sus aciertos, cómo terminó y
// qué se movió. "Anular" devuelve todo lo de esa raid.

interface RaidRow {
  id: string; aula_id: string | null; kind: 'pistolero' | 'secreto'; boss_id: string | null
  status: 'lobby' | 'active' | 'won' | 'lost' | 'cancelled'; boss_hp: number; boss_hp_max: number
  attacks: Record<string, number> | null; created_at: string
}
interface MemberRow { raid_id: string; user_id: string; role: 'alumno' | 'docente'; state: 'alive' | 'down' | 'left'; solved: number }
interface LedgerRow { raid_id: string | null; user_id: string; delta: number; xp: number; reason: string }

interface Props {
  /** '' = todas las aulas. */
  aulaId: string
  aulas: AdminAula[]
  students: { id: string; username: string }[]
  ask: (o: { title: string; body: ReactNode; ok: string; danger?: boolean }) => Promise<boolean>
  say: (text: string, ok?: boolean | null) => void
}

const jersey = 'var(--font-jersey), monospace'
const STATUS: Record<RaidRow['status'], string> = { lobby: 'armando equipo', active: 'en curso', won: 'ganó el equipo', lost: 'perdió el equipo', cancelled: 'cancelada' }
const REASON: Record<string, string> = { pistolero: 'botín', 'raid-primera': 'primera victoria', 'raid-revancha': 'revancha', abandono: 'abandono' }
const when = (iso: string) => new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(', ', ' ')
const COLS = '86px minmax(130px, 0.9fr) minmax(170px, 1.4fr) minmax(110px, 0.8fr) minmax(96px, 0.8fr) 84px'
type Kind = '' | 'pistolero' | 'secreto'

export default function RaidWindow({ aulaId, aulas, students, ask, say }: Props) {
  const [kind, setKind] = useState<Kind>('')
  const [showCancelled, setShowCancelled] = useState(false)
  const [raids, setRaids] = useState<RaidRow[] | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [ledger, setLedger] = useState<LedgerRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  // El alumno TEST no viene en la lista de alumnos.
  const name = useCallback((id: string) => students.find((s) => s.id === id)?.username ?? 'TEST', [students])
  const aulaName = (id: string | null) => aulas.find((a) => a.id === id)?.nombre ?? '—'

  const load = useCallback(async () => {
    const supabase = createClient()
    let q = supabase.from('raids').select('id, aula_id, kind, boss_id, status, boss_hp, boss_hp_max, attacks, created_at')
      .order('created_at', { ascending: false }).limit(60)
    if (aulaId) q = q.eq('aula_id', aulaId)
    if (kind) q = q.eq('kind', kind)
    const { data, error: e } = await q
    if (e) { setError(/does not exist|schema cache|relation/i.test(e.message) ? 'Faltan correr las migraciones 014 y 015.' : e.message); return }
    const list = (data ?? []) as RaidRow[]
    const ids = list.map((r) => r.id)
    const [m, l] = ids.length
      ? await Promise.all([
        supabase.from('raid_members').select('raid_id, user_id, role, state, solved').in('raid_id', ids),
        supabase.from('raid_ledger').select('raid_id, user_id, delta, xp, reason').in('raid_id', ids),
      ])
      : [{ data: [] }, { data: [] }]
    setError(null)
    setRaids(list)
    setMembers((m.data ?? []) as MemberRow[])
    setLedger((l.data ?? []) as LedgerRow[])
  }, [aulaId, kind])
  useEffect(() => { void load() }, [load])

  const voidRaid = async (r: RaidRow, contra: string) => {
    const live = r.status === 'lobby' || r.status === 'active'
    const ok = await ask({
      title: 'ANULAR_RAID.EXE',
      body: <>¿Anular la raid contra <b>{contra}</b>?{live ? ' Se corta ahora mismo.' : ''} Se devuelven los diamantes y el XP (también los castigos por abandono). Los stickers que ya recibieron se quedan.</>,
      ok: 'Anular',
      danger: true,
    })
    if (!ok) return
    setBusy(r.id)
    const res = await fetch('/api/raid/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'void', raidId: r.id }) })
    setBusy(null)
    if (!res.ok) say((await res.json().catch(() => ({}))).error ?? 'No se pudo anular', false)
    else say(`Raid contra ${contra} anulada`)
    void load()
  }

  const shown = useMemo(() => (raids ?? []).filter((r) => showCancelled || r.status !== 'cancelled' || r.attacks?.voided), [raids, showCancelled])
  const kinds: { id: Kind; label: string }[] = [{ id: '', label: 'Todas' }, { id: 'pistolero', label: 'Pistolero' }, { id: 'secreto', label: 'Jefes secretos' }]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <a href="/admin/pistolero" className="sys-tool sys-tool--solid" onClick={() => sfx.open()}>Mesa del Pistolero</a>
        <a href="/admin/pistolero?ensayo=1" className="sys-tool">Ensayar</a>
        <a href="/raid" className="sys-tool">Ver raids</a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Contra quién" className="sys-tabs">
          {kinds.map((k) => (
            <button key={k.id || 'todas'} type="button" role="tab" aria-selected={kind === k.id} className="aula-seg" onClick={() => { sfx.tab(); setKind(k.id) }}>{k.label}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <button type="button" className="sys-tool" aria-pressed={showCancelled} onClick={() => { sfx.click(); setShowCancelled((v) => !v) }}>Canceladas</button>
        <button type="button" className="sys-tool" onClick={() => { sfx.click(); void load() }}>Actualizar</button>
      </div>

      {error ? <p className="sys-sub">{error}</p>
        : shown.length === 0 ? <p className="sys-sub" style={{ padding: '8px 0' }}>{raids ? 'Todavía no hubo raids acá.' : 'Cargando…'}</p>
        : (
          <div role="table" aria-label="Raids" className="sys-table">
            <div role="row" className="sys-row sys-row--head" style={{ gridTemplateColumns: COLS }}>
              {['Cuándo', 'Contra', 'Equipo (aciertos)', 'Resultado', 'Movió', ''].map((h, i) => <span key={i} role="columnheader" className="label-mono">{h}</span>)}
            </div>
            {shown.map((r) => {
              const team = members.filter((m) => m.raid_id === r.id && m.role === 'alumno')
              const teacher = r.kind === 'secreto' && members.some((m) => m.raid_id === r.id && m.role === 'docente')
              const moves = ledger.filter((l) => l.raid_id === r.id)
              const diamonds = moves.reduce((s, l) => s + l.delta, 0)
              const xp = moves.reduce((s, l) => s + l.xp, 0)
              const penalties = moves.filter((l) => l.reason === 'abandono')
              const voided = !!r.attacks?.voided
              const contra = r.kind === 'pistolero' ? 'El Pistolero' : getSecretBoss(r.boss_id ?? '')?.name ?? r.boss_id ?? '—'
              return (
                <div key={r.id} role="row" className="sys-row sys-row--hover" style={{ gridTemplateColumns: COLS, alignItems: 'start', opacity: voided || r.status === 'cancelled' ? 0.5 : 1 }}>
                  <span role="cell" className="sys-num" style={{ color: 'hsl(var(--tx2))' }}>{when(r.created_at)}</span>
                  <span role="cell" className="min-w-0">
                    <span className="block truncate" style={{ fontFamily: jersey, fontSize: 17, lineHeight: 1.1 }}>{contra}</span>
                    {!aulaId && <span className="block sys-sub truncate">{aulaName(r.aula_id)}</span>}
                  </span>
                  <span role="cell" className="sys-sub" style={{ color: 'hsl(var(--tx))' }}>
                    {team.length === 0 ? <span style={{ color: 'hsl(var(--tx3))' }}>nadie</span> : team.map((m, i) => (
                      <span key={m.user_id} style={{ textDecoration: m.state === 'left' ? 'line-through' : undefined, color: m.state === 'left' ? 'hsl(var(--tx3))' : undefined }}>
                        {i > 0 && ', '}{name(m.user_id)} <span style={{ color: 'hsl(var(--tx2))' }}>{m.solved}</span>{m.state === 'down' ? ' caído' : ''}
                      </span>
                    ))}
                    {teacher && <span style={{ color: 'hsl(var(--tx2))' }}> + vos</span>}
                  </span>
                  <span role="cell" className="sys-sub" style={{ color: r.status === 'won' && !voided ? 'hsl(var(--tx))' : undefined }}>
                    {voided ? 'anulada' : STATUS[r.status]}
                    {!voided && r.status === 'active' && r.boss_hp_max > 0 && <><br />{r.boss_hp}/{r.boss_hp_max} HP</>}
                  </span>
                  <span role="cell" className="sys-sub">
                    {moves.length === 0 ? '—' : (
                      <>
                        <span className="flex flex-wrap items-center gap-x-2" style={{ color: 'hsl(var(--tx))' }}>{diamonds !== 0 && <Diamonds n={diamonds} size={11} sign />}{xp > 0 && <span>+{xp} XP</span>}</span>
                        {[...new Set(moves.filter((l) => l.reason !== 'abandono').map((l) => REASON[l.reason] ?? l.reason))].join(' · ')}
                        {penalties.length > 0 && <span className="block" style={{ color: 'hsl(var(--danger))' }}>abandono: {penalties.map((p) => name(p.user_id)).join(', ')}</span>}
                      </>
                    )}
                  </span>
                  <span role="cell" style={{ textAlign: 'right' }}>
                    {!voided && r.status !== 'cancelled' && (
                      <button type="button" className="alu-undo" disabled={busy === r.id} onClick={() => voidRaid(r, contra)}>{busy === r.id ? '…' : 'Anular'}</button>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}
