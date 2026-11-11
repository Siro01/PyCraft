'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sfx } from '@/lib/game/architect/sound'
import { activeEntries, type JournalEntry } from '@/lib/game/reino-store'
import { openReino } from '@/lib/game/reino-engine'
import { leerTablaCartas, sqlRestaurar, type FotoCartas, type TablaCartas } from '@/lib/game/cartas/mazo'
import { validarMazo, enOrden, porPoder, filaDeCarta } from '@/lib/game/cartas/reglas'
import { DISENOS_VACIOS, ESTILOS_VOLTEO, sanearDisenos, type DisenosMazo } from '@/lib/game/cartas/paleta'
import { EQUIPO_POR_TURNO, type AreaProyecto, type Consulta, type FotoPublicada } from '@/lib/game/cartas/area-store'
import { correrTorneo, mazoDesdeFoto, progresoAlumno, type Equipo, type MazoPublicado, type Progreso, type ResultadoTorneo } from '@/lib/game/cartas/torneo'
import { MAZOS_CPU } from '@/lib/game/cartas/cpu'
import CartaPixel from '@/components/game/area/CartaPixel'
import ArenaCartas from '@/components/game/area/ArenaCartas'
import { aulaLabel, type AdminAula } from '../aula-label'

// AREATRABAJO.EXE: el proyecto final visto por el docente. A la izquierda los
// alumnos con en qué capítulo van, si el mazo es válido y si lo publicaron;
// a la derecha el mazo del elegido (cartas, dibujos, código) y sus versiones
// para "volver atrás". Arriba: correr el torneo Mañana vs Tarde y exportar la
// muestra (muestra.json, para la PC del stand sin internet).

interface Alumno { id: string; username: string; aula_id: string | null }

interface Props {
  /** Todos los alumnos (el torneo cruza aulas). */
  alumnos: Alumno[]
  aulas: AdminAula[]
  /** Aula activa del escritorio ('' = todas). */
  aulaId: string
  narrow: boolean
  ask: (o: { title: string; body: ReactNode; ok: string; danger?: boolean }) => Promise<boolean>
  say: (text: string, ok?: boolean | null) => void
}

interface FilaProyecto extends Partial<AreaProyecto> {
  user_id: string
  publicado_snapshot?: FotoPublicada | null
  publicado_at?: string | null
}

interface DatosAlumno {
  proyecto: FilaProyecto | null
  tabla: TablaCartas | null
  progreso: Progreso
  valido: boolean
  ultima: string | null
}

interface VersionNube { id: number; motivo: string; created_at: string; python_code: string | null; cartas_snapshot: FotoCartas | null; consultas: Consulta[] | null; disenos: DisenosMazo | null }

const jersey = 'var(--font-jersey), monospace'
const mono = 'var(--font-mono), monospace'

const cuando = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(', ', ' ') : '—')

const MOTIVO: Record<string, string> = { auto: 'automática', peligro: 'antes de una orden peligrosa', publicar: 'al publicar', restaurar: 'antes de volver atrás' }

// La página de prueba /dev/admin-os usa alumnos inventados (ids cortos, sin
// Supabase): ahí la ventana se llena con mazos de ejemplo para poder verla.
const esDemo = (alumnos: Alumno[]) => alumnos.length > 0 && alumnos.every((a) => !/^[0-9a-f-]{36}$/i.test(a.id))

function datosDemo(alumnos: Alumno[]): Record<string, DatosAlumno> {
  const out: Record<string, DatosAlumno> = {}
  alumnos.forEach((a, i) => {
    // Mezcla: publicados (i % 4 = 0 o 2), balanceando (1) e incompletos (3), con los 3 mazos de práctica.
    const m = MAZOS_CPU[Math.floor(i / 2) % MAZOS_CPU.length]
    const fase = i % 4
    const filas = m.cartas.map((c) => ({ ...filaDeCarta(c), sabor: ['frutilla', 'menta', 'limón'][c.id % 3] })).slice(0, fase === 3 ? 4 : 6)
    const tabla: TablaCartas = { columnas: ['id', 'nombre', 'tipo', 'poder', 'rareza', 'color', 'sabor'], filas, createSql: 'CREATE TABLE cartas (…)' }
    const publicado = fase === 0 || fase === 2
    const marcas = publicado ? { reglas: true, where: true, sum: true, '7': true, '8': true, '9': true, '10': true } as const : fase === 1 ? { reglas: true } as const : {}
    const disenos: DisenosMazo = { ...DISENOS_VACIOS, frente: m.arte }
    const foto: FotoPublicada | null = publicado ? {
      titulo: `${m.titulo} de ${a.username}`, lema: m.lema, alias: a.username, equipo: null, columnas: tabla.columnas, filas,
      orden_ids: m.cartas.map((c) => c.id), python_code: '', textos_carta: {}, disenos, publicado_at: new Date().toISOString(),
    } : null
    const proyecto: FilaProyecto = {
      user_id: a.id, titulo: foto?.titulo ?? (fase === 1 ? 'Mi mazo' : ''), lema: '', alias: a.username, python_code: publicado ? 'def carta(fila):\n    return fila["nombre"]' : '',
      consultas: [{ nombre: 'orden de batalla', sql: 'SELECT * FROM cartas ORDER BY poder DESC', es_orden_batalla: true }], pasos: marcas, disenos,
      publicado, publicado_snapshot: foto, publicado_at: foto?.publicado_at ?? null, updated_at: new Date(Date.now() - i * 600_000).toISOString(),
    }
    const estado = { titulo: proyecto.titulo ?? '', tabla, marcas, ordenOk: true }
    out[a.id] = { proyecto, tabla, progreso: progresoAlumno(estado), valido: validarMazo(filas).ok, ultima: proyecto.updated_at ?? null }
  })
  return out
}

/** Trae todo de a 1000 filas (el límite de Supabase por pedido). */
async function todo<T>(pedir: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await pedir(desde, desde + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return out
  }
}

export default function AreaTrabajoWindow({ alumnos, aulas, aulaId, narrow, ask, say }: Props) {
  const demo = esDemo(alumnos)
  const [datos, setDatos] = useState<Record<string, DatosAlumno> | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [selId, setSelId] = useState<string | null>(null)
  const [versiones, setVersiones] = useState<VersionNube[] | null>(null)
  const [torneo, setTorneo] = useState<ResultadoTorneo | null>(null)
  const [repeticion, setRepeticion] = useState<number | null>(null)

  const equipoDe = useCallback((a: Alumno): Equipo | null => {
    const turno = aulas.find((x) => x.id === a.aula_id)?.turno ?? ''
    return (EQUIPO_POR_TURNO[turno] as Equipo | undefined) ?? null
  }, [aulas])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    if (demo) { setDatos(datosDemo(alumnos)); setCargando(false); return }
    try {
      const sb = createClient()
      const ids = alumnos.map((a) => a.id)
      const proyectos = await todo<FilaProyecto>((d, h) => sb.from('area_proyectos').select('*').range(d, h))
      const journal = ids.length
        ? await todo<JournalEntry & { user_id: string }>((d, h) => sb.from('sql_journal').select('user_id, statement, source, created_at').in('user_id', ids).order('id', { ascending: true }).range(d, h))
        : []
      const porAlumno = new Map<string, JournalEntry[]>()
      for (const e of journal) porAlumno.set(e.user_id, [...(porAlumno.get(e.user_id) ?? []), e])
      const out: Record<string, DatosAlumno> = {}
      for (const a of alumnos) {
        const proyecto = proyectos.find((p) => p.user_id === a.id) ?? null
        const entries = porAlumno.get(a.id) ?? []
        const db = await openReino(activeEntries(entries))
        const tabla = leerTablaCartas(db)
        const consultaOrden = proyecto?.consultas?.find((c) => c.es_orden_batalla)?.sql
        let ordenOk = false
        try { ordenOk = !!consultaOrden && !!db.exec(consultaOrden)[0]?.columns.map((c) => c.toLowerCase()).includes('id') } catch { /* no anda */ }
        db.close()
        const estado = { titulo: proyecto?.titulo ?? '', tabla, marcas: proyecto?.pasos ?? {}, ordenOk }
        const ultimaJournal = entries.filter((e) => e.source !== 'botin').at(-1)?.created_at ?? null
        const ultima = [proyecto?.updated_at, ultimaJournal].filter(Boolean).sort().at(-1) ?? null
        out[a.id] = { proyecto, tabla, progreso: progresoAlumno(estado), valido: !!tabla && validarMazo(tabla.filas).ok, ultima }
      }
      setDatos(out)
    } catch (e) {
      const msg = (e as Error).message
      setError(/area_proyectos|schema cache|does not exist/i.test(msg) ? 'Falta correr la migración 020_area_trabajo.sql en Supabase.' : `No se pudo cargar: ${msg}`)
    } finally {
      setCargando(false)
    }
  }, [alumnos, demo])

  useEffect(() => { cargar() }, [cargar])

  const visibles = useMemo(() => (aulaId ? alumnos.filter((a) => a.aula_id === aulaId) : alumnos), [alumnos, aulaId])
  const sel = alumnos.find((a) => a.id === selId) ?? null
  const d = sel && datos ? datos[sel.id] : null

  // Los mazos publicados que pueden pelear (con equipo y cumpliendo la economía).
  const publicados = useMemo(() => {
    const out: MazoPublicado[] = []
    for (const a of alumnos) {
      const foto = datos?.[a.id]?.proyecto?.publicado_snapshot
      const eq = equipoDe(a)
      if (!foto || !eq) continue
      const m = mazoDesdeFoto(a.id, a.username, eq, foto)
      if (m) out.push(m)
    }
    return out
  }, [alumnos, datos, equipoDe])

  const abrir = async (id: string) => {
    sfx.click()
    setSelId(id)
    setVersiones(null)
    if (demo) { setVersiones([]); return }
    const { data } = await createClient().from('area_versiones')
      .select('id, motivo, created_at, python_code, cartas_snapshot, consultas, disenos')
      .eq('user_id', id).order('created_at', { ascending: false }).limit(40)
    setVersiones((data ?? []) as VersionNube[])
  }

  const restaurar = async (v: VersionNube) => {
    if (!sel || !d) return
    const ok = await ask({
      title: 'VOLVER_ATRAS.EXE',
      body: <>El mazo de <b>{sel.username}</b> vuelve a como estaba el {cuando(v.created_at)}. Lo de ahora queda guardado como otra versión. Si tiene AreaTrabajo abierta, que recargue la página.</>,
      ok: 'Volver atrás',
    })
    if (!ok) return
    if (demo) { say('En la página de prueba no se restaura nada.', null); return }
    try {
      const sb = createClient()
      const p = d.proyecto
      await sb.from('area_versiones').insert({
        user_id: sel.id, motivo: 'restaurar', python_code: p?.python_code ?? '', consultas: p?.consultas ?? [], disenos: p?.disenos ?? null,
        cartas_snapshot: d.tabla ? { create_sql: d.tabla.createSql, columnas: d.tabla.columnas, filas: d.tabla.filas } : null,
      })
      const { error: e1 } = await sb.from('sql_journal').insert(sqlRestaurar(v.cartas_snapshot).map((statement) => ({ user_id: sel.id, statement, source: 'restaurar' })))
      if (e1) throw new Error(e1.message)
      await sb.from('area_proyectos').update({
        python_code: v.python_code ?? p?.python_code ?? '', consultas: v.consultas ?? p?.consultas ?? [],
        disenos: v.disenos ? sanearDisenos(v.disenos) : p?.disenos ?? DISENOS_VACIOS, updated_at: new Date().toISOString(),
      }).eq('user_id', sel.id)
      sfx.confirm()
      say(`Listo: el mazo de ${sel.username} volvió al ${cuando(v.created_at)}.`)
      await cargar()
      await abrir(sel.id)
    } catch (e) {
      say(`No se pudo: ${(e as Error).message}`, false)
    }
  }

  const correr = async () => {
    const mañana = publicados.filter((m) => m.equipo === 'PYCRAFT MAÑANA').length
    const tarde = publicados.length - mañana
    if (!mañana || !tarde) { say('Hace falta al menos un mazo publicado de cada equipo.', false); return }
    sfx.select()
    const t = correrTorneo(publicados, Date.now() % 100000)
    setTorneo(t)
    say(`Torneo: ${t.partidas.length} partidas entre ${mañana} mazos de la mañana y ${tarde} de la tarde.`)
    if (!demo) {
      // Se guardan para el registro (y la muestra). Si falla, el resultado igual queda en pantalla.
      const filas = t.partidas.map((p) => ({
        modo: 'torneo', mazo_a: p.a, mazo_b: p.b,
        equipo_a: publicados.find((m) => m.userId === p.a)?.equipo, equipo_b: publicados.find((m) => m.userId === p.b)?.equipo,
        ganador: p.registro.ganador, seed: p.registro.seed,
        registro: { vuelta: p.vuelta, puntos: [p.registro.puntosA, p.registro.puntosB], rondas: p.registro.rondas.map((r) => [r.cartaA.id, r.cartaB.id, r.ganador]) },
      }))
      const { error: e } = await createClient().from('partidas').insert(filas)
      if (e) say(`El torneo se jugó, pero no se pudo guardar: ${e.message}`, false)
    }
  }

  const exportar = () => {
    if (!publicados.length) { say('Todavía no hay mazos publicados para exportar.', false); return }
    sfx.confirm()
    const muestra = {
      version: 1,
      generado: new Date().toISOString(),
      marcador: torneo ? { ...torneo.marcador, empates: torneo.empates } : null,
      mazos: publicados.map((m, i) => ({
        n: i + 1,
        alias: m.alias,
        equipo: m.equipo,
        destacada: torneo?.destacadas[m.userId] ?? null,
        foto: { ...m.foto, equipo: m.equipo, alias: m.alias },
      })),
    }
    const blob = new Blob([JSON.stringify(muestra)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url
    el.download = 'muestra.json'
    el.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    say(`muestra.json con ${publicados.length} mazos${torneo ? ' y el marcador del torneo' : ''}.`)
  }

  const nombre = (id: string) => publicados.find((m) => m.userId === id)?.alias ?? alumnos.find((a) => a.id === id)?.username ?? '?'
  const reñida = torneo && torneo.reñida !== null ? torneo.partidas[torneo.reñida] : null

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de arriba */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="sys-tool" onClick={() => { sfx.click(); cargar() }} disabled={cargando}>{cargando ? 'cargando…' : 'Actualizar'}</button>
        <button type="button" className="sys-tool" onClick={correr}>Correr torneo</button>
        <button type="button" className="sys-tool" onClick={exportar}>Exportar muestra</button>
        <span className="sys-sub">
          {publicados.length} mazo{publicados.length === 1 ? '' : 's'} listo{publicados.length === 1 ? '' : 's'} para pelear ·
          mañana {publicados.filter((m) => m.equipo === 'PYCRAFT MAÑANA').length} · tarde {publicados.filter((m) => m.equipo === 'PYCRAFT TARDE').length}
        </span>
      </div>
      {demo && <p className="sys-sub" style={{ margin: 0 }}>Página de prueba: mazos de ejemplo, nada se guarda.</p>}
      {error && <p className="sys-sub" style={{ color: 'hsl(var(--danger))', margin: 0 }}>&gt; {error}</p>}

      {/* Resultado del torneo: marcador por equipo, nunca una tabla de posiciones individual */}
      {torneo && (
        <div className="flex flex-col items-center gap-2" style={{ border: '2px solid hsl(var(--tx))', padding: 12 }}>
          <div className="flex items-center gap-4" style={{ fontFamily: jersey, lineHeight: 1 }}>
            <span style={{ fontSize: 24 }}>MAÑANA</span>
            <span style={{ fontSize: 40 }}>{torneo.marcador['PYCRAFT MAÑANA']}</span>
            <span style={{ fontSize: 28, color: 'hsl(var(--tx3))' }}>—</span>
            <span style={{ fontSize: 40 }}>{torneo.marcador['PYCRAFT TARDE']}</span>
            <span style={{ fontSize: 24 }}>TARDE</span>
          </div>
          <span className="sys-sub">{torneo.partidas.length} partidas · {torneo.empates} empates · ida con su orden de batalla, vuelta por poder</span>
          {reñida && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="sys-sub">La más reñida: {nombre(reñida.a)} {reñida.registro.puntosA}–{reñida.registro.puntosB} {nombre(reñida.b)}</span>
              <button type="button" className="sys-tool" onClick={() => { sfx.open(); setRepeticion(torneo.reñida) }}>Ver la repetición</button>
            </div>
          )}
        </div>
      )}

      <div className="sys-split" data-ficha={!narrow && sel ? '' : undefined} style={!narrow && sel ? { gridTemplateColumns: 'minmax(260px, 0.8fr) minmax(420px, 1.4fr)' } : undefined}>
        {(!narrow || !sel) && (
          <div role="listbox" aria-label="Alumnos">
            <div className="sys-row sys-row--head" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto auto' }} aria-hidden>
              <span className="label-mono">Alumno</span>
              <span className="label-mono">Va por</span>
              <span className="label-mono">Mazo</span>
            </div>
            {visibles.map((a) => {
              const x = datos?.[a.id]
              return (
                <button key={a.id} type="button" role="option" aria-selected={a.id === selId} className="sys-row"
                  style={{ gridTemplateColumns: 'minmax(0, 1fr) auto auto' }} onClick={() => abrir(a.id)}>
                  <span className="min-w-0">
                    <span className="block truncate" style={{ fontFamily: jersey, fontSize: 18, lineHeight: 1 }}>{a.username}</span>
                    <span className="block truncate sys-sub">{!aulaId ? `${aulaLabel(aulas.find((y) => y.id === a.aula_id) ?? { id: '', nombre: 'Sin aula', turno: '', created_at: '' })} · ` : ''}{cuando(x?.ultima)}</span>
                  </span>
                  <span className="sys-sub tabular">{x ? x.progreso.donde : '…'}</span>
                  <span className="sys-sub" title={x?.proyecto?.publicado ? 'Publicado' : x?.valido ? 'Cumple las reglas' : 'Todavía no cumple las reglas'}>
                    {x ? (x.proyecto?.publicado ? '★ publicado' : x.valido ? '✓ válido' : x.tabla ? '✘' : '—') : ''}
                  </span>
                </button>
              )
            })}
            {visibles.length === 0 && <p className="sys-sub" style={{ padding: '12px 8px' }}>No hay alumnos acá.</p>}
          </div>
        )}

        {sel && d && (
          <section className="sys-pane" aria-label={`Proyecto de ${sel.username}`}>
            <header className="flex items-start gap-3">
              {narrow && <button type="button" className="sys-tool" onClick={() => { sfx.click(); setSelId(null) }}>‹ Alumnos</button>}
              <div className="min-w-0 flex-1">
                <div className="label-mono">{d.progreso.donde} · {d.progreso.hechos}/10 pasos{equipoDe(sel) ? ` · ${equipoDe(sel)}` : ''}</div>
                <h2 className="truncate" style={{ fontFamily: jersey, fontSize: 26, lineHeight: 1, margin: '4px 0' }}>{d.proyecto?.titulo || `(sin título) · ${sel.username}`}</h2>
                {d.proyecto?.lema && <div className="sys-sub">“{d.proyecto.lema}”</div>}
                <div className="sys-sub">alias: {d.proyecto?.alias || sel.username} · {d.proyecto?.publicado ? `publicado el ${cuando(d.proyecto.publicado_at)}` : 'sin publicar'}</div>
              </div>
              {!narrow && <button type="button" className="alu-x" aria-label="Cerrar" onClick={() => { sfx.close(); setSelId(null) }}>×</button>}
            </header>

            {!d.tabla ? <p className="sys-sub">Todavía no creó la tabla cartas.</p> : (
              <>
                <div className="flex flex-wrap gap-2">
                  {d.tabla.filas.map((f, i) => (
                    <CartaPixel key={i} fila={f} tamano="chica" arte={d.proyecto?.disenos ? sanearDisenos(d.proyecto.disenos).frente[String(f.id ?? '')] ?? null : null} />
                  ))}
                  <CartaPixel fila={null} bocaAbajo reverso={d.proyecto?.disenos ? sanearDisenos(d.proyecto.disenos).reverso : null} tamano="chica" />
                </div>
                <span className="sys-sub">volteo: {ESTILOS_VOLTEO.find((e) => e.id === sanearDisenos(d.proyecto?.disenos).volteo.estilo)?.nombre}</span>
                {validarMazo(d.tabla.filas).problemas.slice(0, 4).map((p, i) => <span key={i} className="sys-sub">✘ {p.mensaje}</span>)}
              </>
            )}

            {d.proyecto?.python_code && (
              <div>
                <h3 className="label-mono" style={{ marginBottom: 6 }}>Su código Python</h3>
                <pre style={{ margin: 0, padding: 10, maxHeight: 220, overflow: 'auto', border: '2px solid hsl(var(--border2))', background: 'hsl(var(--surface))', fontFamily: mono, fontSize: 12, lineHeight: 1.4 }}>{d.proyecto.python_code}</pre>
              </div>
            )}

            <div>
              <h3 className="label-mono" style={{ marginBottom: 6 }}>Versiones · volver atrás</h3>
              {versiones === null ? <p className="sys-sub">Cargando…</p> : versiones.length === 0 ? <p className="sys-sub">Sin versiones guardadas.</p> : (
                <div role="list">
                  {versiones.map((v) => (
                    <div key={v.id} role="listitem" className="sys-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto auto' }}>
                      <span className="min-w-0">
                        <span className="block" style={{ fontFamily: jersey, fontSize: 16, lineHeight: 1 }}>{cuando(v.created_at)}</span>
                        <span className="block sys-sub">{MOTIVO[v.motivo] ?? v.motivo}</span>
                      </span>
                      <span className="sys-sub">{v.cartas_snapshot ? `${v.cartas_snapshot.filas.length} cartas` : 'sin tabla'}</span>
                      <button type="button" className="sys-tool" onClick={() => restaurar(v)}>Restaurar</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {torneo && torneo.destacadas[sel.id] != null && (() => {
              const f = d.tabla?.filas.find((x) => Number(x.id) === torneo.destacadas[sel.id])
              return f ? <span className="sys-sub">★ Su carta destacada en el torneo: {String(f.nombre)}</span> : null
            })()}
          </section>
        )}
      </div>

      {/* La repetición de la pelea más reñida, en la misma arena de la muestra */}
      {torneo && repeticion !== null && (() => {
        const p = torneo.partidas[repeticion]
        const ma = publicados.find((m) => m.userId === p.a)!
        const mb = publicados.find((m) => m.userId === p.b)!
        const lado = (m: MazoPublicado, ida: boolean) => ({
          nombre: m.alias, titulo: m.titulo, cartas: m.cartas, arte: sanearDisenos(m.foto.disenos).frente, reverso: sanearDisenos(m.foto.disenos).reverso,
          volteo: sanearDisenos(m.foto.disenos).volteo, control: { tipo: 'cpu' as const, estrategia: ida ? enOrden(m.orden) : porPoder },
        })
        return (
          <div role="dialog" aria-modal="true" aria-label="Repetición" style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'hsl(var(--bg) / 0.94)', overflowY: 'auto', padding: 20 }}>
            <div style={{ maxWidth: 1100, margin: '0 auto', border: '2px solid hsl(var(--tx))', background: 'hsl(var(--bg))', padding: 16 }}>
              <div className="flex justify-between items-center mb-3">
                <span className="label-mono">Repetición · {ma.equipo} vs {mb.equipo}</span>
                <button type="button" className="sys-tool" onClick={() => { sfx.close(); setRepeticion(null) }}>Cerrar</button>
              </div>
              <ArenaCartas key={repeticion} seed={p.registro.seed} a={lado(ma, p.vuelta === 'ida')} b={lado(mb, p.vuelta === 'ida')}
                acciones={<button type="button" className="sys-tool" onClick={() => { sfx.close(); setRepeticion(null) }}>Cerrar</button>} />
            </div>
          </div>
        )
      })()}
    </div>
  )
}
