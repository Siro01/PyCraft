'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import type { Database } from 'sql.js'
import Win from '@/components/ui/Win'
import { LoadingBar } from '@/components/ui/LoadingBar'
import { useSysConfirm } from '@/components/ui/SysDialog'
import SqlResult from '@/components/game/sql/SqlResult'
import MascotGuide from '@/components/game/MascotGuide'
import CartaPixel from './CartaPixel'
import PanelDiseno from './PanelDiseno'
import { sanearDisenos } from '@/lib/game/cartas/paleta'
import type { Fila } from '@/lib/game/cartas/reglas'
import { IconBulb } from '@/components/ui/PixelIcons'
import { PixelBitmap } from '@/components/game/architect/desktop/PixelBitmap'
import { ICON_DESHACER, ICON_DISCO } from './iconos'
import { sfx } from '@/lib/game/architect/sound'
import { appendJournal, activeEntries, MAX_ACTIVE, MAX_STATEMENT, type JournalEntry } from '@/lib/game/reino-store'
import { bootJournal, stampEntry } from '@/lib/game/reino-boot'
import { openReino, runInReino, MENSAJE_REGLAS, type ReinoRun } from '@/lib/game/reino-engine'
import { REGLAS, leerPoder, validarMazo } from '@/lib/game/cartas/reglas'
import { esPeligrosa, fotoCartas, leerTablaCartas, sentencias, sqlRestaurar } from '@/lib/game/cartas/mazo'
import { PLANTILLA_ELEGIR, SONDA_PROGRAMAR, explicarCarta, explicarElegir, explicarRevisar, type ResultadoProgramar } from '@/lib/game/cartas/sondas'
import {
  CAPITULOS, PASOS, arregloSql, esOrdenBatalla, estadosGuia, marcador, marcasDe, pasoActual, queFalta,
  type EstadoPaso, type Marcas, type PasoId,
} from '@/lib/game/cartas/guia'
import {
  PROYECTO_VACIO, cargarProyecto, crearVersion, equipoDelAlumno, guardarPartidaPrueba, guardarProyecto, limitar,
  listarVersiones, publicarProyecto, type AreaProyecto, type EstadoGuardado, type Version,
} from '@/lib/game/cartas/area-store'
import { MAZOS_CPU, mazoCpu, type MazoCpu } from '@/lib/game/cartas/cpu'
import { SONDA_TEXTOS } from '@/lib/game/cartas/sondas'
import ArenaCartas from './ArenaCartas'

const CodeMirrorEditor = dynamic(() => import('@/components/game/CodeMirrorEditor'), {
  ssr: false,
  loading: () => <div style={{ minHeight: 180, background: 'hsl(var(--bg))' }} />,
})

// ─── AREATRABAJO ─────────────────────────────────────────────────────────────
// Donde cada alumno arma su mazo. A la izquierda la guía (4 capítulos, 10
// pasos), en el medio la mesa (una carta a la vez) y a la derecha dónde
// escribe (SQL / PYTHON / DISEÑO). Las cartas viven en su Mi Reino: misma base,
// mismo registro. El resto del proyecto se guarda en area-store.
// UI mínima: la barra de abajo queda siempre a la vista (sticky) y lo
// secundario (guardado, volver atrás, pista, desafío) va en íconos chicos.

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-text), monospace'
const mono = 'var(--font-mono), monospace'

type Pestana = 'sql' | 'python' | 'diseno'

const GUARDADO_LABEL: Record<EstadoGuardado, string> = {
  guardado: 'guardado ✓',
  guardando: 'guardando…',
  local: 'sin conexión, guardado en esta PC',
  navegador: 'guardado en este navegador',
}
/** Al lado del disquete, lo mínimo: ✓, … o PC (el texto entero va en el title). */
const GUARDADO_CORTO: Record<EstadoGuardado, string> = { guardado: '✓', guardando: '…', local: 'PC', navegador: '✓' }

const MOTIVO_LABEL: Record<Version['motivo'], string> = {
  auto: 'guardado automático',
  peligro: 'antes de una orden peligrosa',
  publicar: 'al publicar',
  restaurar: 'antes de volver atrás',
}

const DIEZ_MIN = 10 * 60 * 1000

function Punto({ estado }: { estado: EstadoPaso }) {
  const lleno = estado === 'hecho'
  return (
    <span
      aria-hidden
      style={{
        width: 12, height: 12, flexShrink: 0, border: '2px solid hsl(var(--tx))',
        background: lleno ? 'hsl(var(--tx))' : estado === 'medio' ? 'linear-gradient(90deg, hsl(var(--tx)) 50%, transparent 50%)' : 'transparent',
      }}
    />
  )
}

function useAncho(px: number) {
  const [angosto, setAngosto] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${px}px)`)
    const on = () => setAngosto(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [px])
  return angosto
}

export default function AreaTrabajoApp() {
  const dbRef = useRef<Database | null>(null)
  const [entries, setEntries] = useState<JournalEntry[] | null>(null)
  const [rev, setRev] = useState(0)
  const [proyecto, setProyecto] = useState<AreaProyecto>(PROYECTO_VACIO)
  const [guardado, setGuardado] = useState<EstadoGuardado>('local')
  const [ranura, setRanura] = useState(0)
  const [pestana, setPestana] = useState<Pestana>('sql')
  const [vista, setVista] = useState<'guia' | 'mesa' | 'codigo'>('mesa')
  const [paso, setPaso] = useState<PasoId>(1)
  const [pistas, setPistas] = useState(0)
  const [verDesafio, setVerDesafio] = useState(false)
  const [verProblemas, setVerProblemas] = useState(false)
  const [verConsigna, setVerConsigna] = useState(false)
  const [busy, setBusy] = useState(false)
  const [resultado, setResultado] = useState<{ run: ReinoRun; code: string; notice?: string } | null>(null)
  const [ordenPendiente, setOrdenPendiente] = useState<string | null>(null)
  const [pyOut, setPyOut] = useState<{ text: string; error: boolean } | null>(null)
  const [prueba, setPrueba] = useState<{ ok: boolean; text: string }[] | null>(null)
  const [aviso, setAviso] = useState<{ key: number; text: string } | null>(null)
  const [versiones, setVersiones] = useState<Version[] | null>(null)
  const [arena, setArena] = useState<{ cpu: MazoCpu['id']; seed: number } | null>(null)
  const [publicando, setPublicando] = useState(false)
  const [ask, confirmNode] = useSysConfirm()
  const angosto = useAncho(1100)

  const cambiosDesdeVersion = useRef(false)
  const ultimaVersion = useRef(Date.now())
  const cargado = useRef(false)
  const decir = useCallback((text: string) => setAviso({ key: Date.now(), text }), [])

  // ── Arranque: reino + proyecto ─────────────────────────────────────────────
  useEffect(() => {
    let vivo = true
    ;(async () => {
      const [{ entries: all }, p] = await Promise.all([bootJournal(), cargarProyecto()])
      const db = await openReino(activeEntries(all))
      if (!vivo) { db.close(); return }
      dbRef.current = db
      setEntries(all)
      setProyecto(p.proyecto)
      setGuardado(p.estado)
      setRev((r) => r + 1)
      cargado.current = true
    })()
    return () => { vivo = false; dbRef.current?.close(); dbRef.current = null }
  }, [])

  // ── Guardado del proyecto (2 s después del último cambio) ─────────────────
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cambiar = useCallback((f: (p: AreaProyecto) => AreaProyecto) => {
    setProyecto((p) => {
      const nuevo = f(p)
      cambiosDesdeVersion.current = true
      setGuardado('guardando')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(async () => setGuardado(await guardarProyecto(nuevo)), 2000)
      return nuevo
    })
  }, [])

  // ── Lo que se ve, calculado del reino ─────────────────────────────────────
  const tabla = useMemo(() => (dbRef.current ? leerTablaCartas(dbRef.current) : null), [rev]) // eslint-disable-line react-hooks/exhaustive-deps
  const filas = tabla?.filas ?? []
  const validacion = useMemo(() => validarMazo(filas), [filas])
  const rotas = useMemo(() => new Set(validacion.problemas.flatMap((p) => ('carta' in p ? [p.carta] : []))), [validacion])
  const ordenSql = proyecto.consultas.find((c) => c.es_orden_batalla)?.sql ?? null
  const ordenOk = useMemo(() => {
    const db = dbRef.current
    if (!db || !ordenSql) return false
    try {
      const r = db.exec(ordenSql)
      return !!r[0] && r[0].columns.map((c) => c.toLowerCase()).includes('id')
    } catch { return false }
  }, [ordenSql, rev]) // eslint-disable-line react-hooks/exhaustive-deps

  const estadoGuia = { titulo: proyecto.titulo, tabla, marcas: proyecto.pasos, ordenOk }
  const estados = estadosGuia(estadoGuia)
  const hechos = Object.values(estados).filter((e) => e === 'hecho').length
  const total = filas.reduce((s, f) => s + (leerPoder(f.poder) ?? 0), 0)

  // La guía abre en el primer paso que falta (una sola vez, al cargar).
  const abrioGuia = useRef(false)
  useEffect(() => {
    if (!entries || abrioGuia.current) return
    abrioGuia.current = true
    setPaso(pasoActual(estados))
  }, [entries, estados])

  // Un paso que estaba hecho y se rompe: Rodolfo avisa, con calma.
  const antes = useRef<Record<PasoId, EstadoPaso> | null>(null)
  useEffect(() => {
    const prev = antes.current
    antes.current = estados
    if (!prev || !cargado.current) return
    for (const id of Object.keys(estados).map(Number) as PasoId[]) {
      if (prev[id] === 'hecho' && estados[id] !== 'hecho') {
        decir(`El paso ${id} (${PASOS[id].titulo}) quedó a medias. ${queFalta(id, estadoGuia) ?? ''} No pasa nada: se arregla.`)
        break
      }
    }
  }, [JSON.stringify(estados)]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Versión automática cada 10 minutos con cambios ────────────────────────
  const versionActual = useCallback((motivo: Version['motivo']) => ({
    motivo,
    python_code: proyecto.python_code,
    cartas_snapshot: dbRef.current ? fotoCartas(dbRef.current) : null,
    consultas: proyecto.consultas,
    disenos: proyecto.disenos,
  }), [proyecto.python_code, proyecto.consultas, proyecto.disenos])

  useEffect(() => {
    const id = setInterval(() => {
      if (cambiosDesdeVersion.current && Date.now() - ultimaVersion.current >= DIEZ_MIN) {
        cambiosDesdeVersion.current = false
        ultimaVersion.current = Date.now()
        crearVersion(versionActual('auto')).catch(() => {})
      }
    }, 60_000)
    return () => clearInterval(id)
  }, [versionActual])

  // ── Ejecutar SQL sobre el reino ───────────────────────────────────────────
  const ejecutarSql = useCallback(async () => {
    const db = dbRef.current
    const code = proyecto.sql_borrador
    if (!db || busy || !code.trim() || !entries) return
    setBusy(true)
    sfx.attack()
    try {
      if (sentencias(code).some(esPeligrosa)) {
        await crearVersion(versionActual('peligro')).catch(() => {})
        ultimaVersion.current = Date.now()
      }
      const filasAntes = leerTablaCartas(db)?.filas.length ?? 0
      const r = runInReino(db, code)
      const activas = activeEntries(entries).length
      const largo = r.applied.some((s) => s.length > MAX_STATEMENT)
      if (largo || activas + r.applied.length > MAX_ACTIVE) {
        db.close()
        dbRef.current = await openReino(activeEntries(entries))
        setRev((x) => x + 1)
        setResultado({
          run: { ...r, changes: [], applied: [], executed: [], error: 'limite' }, code,
          notice: largo ? 'Esa orden es demasiado larga para guardarla. Partila en varias más cortas.' : `Tu reino llegó al máximo de ${MAX_ACTIVE} órdenes guardadas. Pedile ayuda a tu profe.`,
        })
        return
      }
      if (r.applied.length) {
        const nuevas = r.applied.map((statement) => ({ statement, source: 'libre' as const }))
        setEntries((cur) => [...(cur ?? []), ...nuevas.map(stampEntry)])
        appendJournal(nuevas).catch(() => {})
        cambiosDesdeVersion.current = true
      }
      // Marcas de la guía (pasos 4 y 5) por las consultas que salieron bien.
      const marcas: Marcas = Object.assign({}, ...r.executed.map(marcasDe))
      const nuevas = Object.keys(marcas).filter((k) => !proyecto.pasos[k as keyof Marcas])
      if (nuevas.length) cambiar((p) => ({ ...p, pasos: { ...p.pasos, ...marcas } }))
      // ¿Escribió un orden de batalla? Se ofrece guardarlo.
      const ultima = r.executed[r.executed.length - 1]
      setOrdenPendiente(!r.error && ultima && esOrdenBatalla(ultima) && ultima !== ordenSql ? ultima : null)
      // Después de cargar cartas, la mesa va a la última.
      const filasDespues = leerTablaCartas(db)?.filas.length ?? 0
      if (filasDespues > filasAntes) setRanura(Math.min(filasDespues - 1, Math.max(REGLAS.cartasPorMazo, filasDespues) - 1))
      setRev((x) => x + 1)
      setResultado({ run: r, code })
      if (r.error === MENSAJE_REGLAS) decir(MENSAJE_REGLAS)
      if (r.error) sfx.miss()
    } finally {
      setBusy(false)
    }
  }, [busy, entries, proyecto.sql_borrador, proyecto.pasos, ordenSql, versionActual, cambiar, decir])

  const guardarOrden = () => {
    if (!ordenPendiente) return
    sfx.confirm()
    cambiar((p) => ({
      ...p,
      consultas: [...p.consultas.filter((c) => !c.es_orden_batalla), { nombre: 'orden de batalla', sql: ordenPendiente, es_orden_batalla: true }],
    }))
    setOrdenPendiente(null)
  }

  // ── Python (lee el reino como reino.db) ───────────────────────────────────
  const ejecutarPython = useCallback(async () => {
    const db = dbRef.current
    if (!db || busy) return
    setBusy(true)
    sfx.attack()
    try {
      const [{ runPython }, { reinoDesdeDb }] = await Promise.all([
        import('@/lib/game/executor/pyodide-runner'),
        import('@/lib/game/cartas/puente'),
      ])
      const code = proyecto.python_code
      // Después del programa, la plataforma prueba carta() y revisar() (pasos 7 y 8).
      const r = await runPython(code, { reino: await reinoDesdeDb(db), limiteSeg: 2, sonda: SONDA_PROGRAMAR })
      setPyOut(r.error ? { text: `${r.output ? `${r.output}\n` : ''}${r.error}`, error: true } : { text: r.output || '(no imprimió nada)', error: false })
      if (r.error) { sfx.miss(); setPrueba(null); return }
      const s = (r.sonda ?? {}) as ResultadoProgramar
      const lineas: { ok: boolean; text: string }[] = []
      const escribio = (fn: string) => new RegExp(`def\\s+${fn}\\s*\\(`).test(code)
      if (escribio('carta')) lineas.push(s.carta?.ok ? { ok: true, text: 'carta() funciona' } : { ok: false, text: explicarCarta(s.carta) ?? 'carta() no anduvo.' })
      if (escribio('revisar')) lineas.push(s.revisar?.ok ? { ok: true, text: `revisar() acertó las ${s.revisar.total ?? 4} cartas de prueba` } : { ok: false, text: explicarRevisar(s.revisar) ?? 'revisar() no anduvo.' })
      if (escribio('elegir')) lineas.push(s.elegir?.ok ? { ok: true, text: 'elegir() devuelve una carta de tu mano ⭐' } : { ok: false, text: explicarElegir(s.elegir) ?? 'elegir() no anduvo.' })
      setPrueba(lineas.length ? lineas : null)
      // Los pasos 7 y 8 (y el ⭐ de elegir) siguen al último resultado: si se rompen, vuelven a medias.
      const ok7 = !!s.carta?.ok
      const ok8 = !!s.revisar?.ok
      const okE = !!s.elegir?.ok
      if (ok7 !== !!proyecto.pasos['7'] || ok8 !== !!proyecto.pasos['8'] || okE !== !!proyecto.pasos.elegir) {
        cambiar((x) => {
          const pasos = { ...x.pasos }
          if (ok7) pasos['7'] = true; else delete pasos['7']
          if (ok8) pasos['8'] = true; else delete pasos['8']
          if (okE) pasos.elegir = true; else delete pasos.elegir
          return { ...x, pasos }
        })
      }
      const falla = lineas.find((l) => !l.ok)
      if (falla) decir(falla.text)
    } finally {
      setBusy(false)
    }
  }, [busy, proyecto.python_code, proyecto.pasos, cambiar, decir])

  // ── Abrir un paso: su plantilla se agrega al final (nunca pisa lo escrito) ─
  /** El desafío ⭐ del paso 10: se agrega a mano (sus huecos romperían el programa). */
  const agregarElegir = () => {
    sfx.confirm()
    setPestana('python')
    if (angosto) setVista('codigo')
    cambiar((x) => (x.python_code.includes('def elegir') ? x : { ...x, python_code: `${x.python_code.replace(/\s+$/, '')}

${PLANTILLA_ELEGIR}` }))
  }

  /** Agrega al borrador SQL la consulta que arregla una regla rota (el alumno completa el hueco y ejecuta). */
  const armarArreglo = (codigo: string) => {
    sfx.confirm()
    setPestana('sql')
    if (angosto) setVista('codigo')
    cambiar((p) => {
      if (p.sql_borrador.includes(codigo)) return p
      const actual = p.sql_borrador.replace(/\s+$/, '')
      return { ...p, sql_borrador: `${actual ? `${actual}\n\n` : ''}${codigo}\n` }
    })
  }

  const abrirPaso = (id: PasoId) => {
    sfx.click()
    setPaso(id)
    setPistas(0)
    setVerDesafio(false)
    setVerConsigna(false)
    const pl = PASOS[id].plantilla
    if (angosto) setVista(pl ? 'codigo' : 'guia')
    if (!pl) return
    setPestana(pl.lang)
    const marca = marcador(id, pl.lang)
    cambiar((p) => {
      const campo = pl.lang === 'sql' ? 'sql_borrador' : 'python_code'
      if (p[campo].includes(marca)) return p
      const actual = p[campo].replace(/\s+$/, '')
      return { ...p, [campo]: `${actual ? `${actual}\n\n` : ''}${marca}\n${pl.codigo}\n` }
    })
  }

  // ── Volver atrás ──────────────────────────────────────────────────────────
  const abrirVersiones = async () => {
    sfx.open()
    setVersiones([])
    setVersiones(await listarVersiones())
  }

  const restaurar = async (v: Version) => {
    const db = dbRef.current
    if (!db || !entries) return
    const ok = await ask({
      title: 'VOLVER_ATRAS.EXE',
      body: <>Tu mazo y tu código vuelven a como estaban el {new Date(v.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}. Lo de ahora queda guardado como otra versión, por si te arrepentís.</>,
      ok: 'Volver atrás',
    })
    if (!ok) return
    await crearVersion(versionActual('restaurar')).catch(() => {})
    const stmts = sqlRestaurar(v.cartas_snapshot)
    for (const s of stmts) { try { db.run(s) } catch { /* una fila rara no frena el resto */ } }
    const nuevas = stmts.map((statement) => ({ statement, source: 'restaurar' as const }))
    setEntries((cur) => [...(cur ?? []), ...nuevas.map(stampEntry)])
    appendJournal(nuevas).catch(() => {})
    cambiar((p) => ({
      ...p,
      python_code: v.python_code ?? p.python_code,
      consultas: v.consultas ?? p.consultas,
      disenos: v.disenos ? sanearDisenos(v.disenos) : p.disenos,
    }))
    setRanura(0)
    setRev((x) => x + 1)
    setVersiones(null)
    sfx.confirm()
    decir('¡Listo! Tu mazo volvió a esa versión.')
  }

  if (!entries) {
    return (
      <Win title="AREATRABAJO.EXE" bodyStyle={{ padding: 24 }}>
        <LoadingBar label="Abriendo tu mesa de trabajo..." size="sm" estimatedMs={2500} />
      </Win>
    )
  }

  const p = PASOS[paso]
  const nRanuras = Math.max(REGLAS.cartasPorMazo, filas.length)
  const filaActual = filas[ranura] ?? null
  const r = resultado?.run
  const arteDe = (f: Fila | null) => (f ? proyecto.disenos.frente[String(f.id ?? '')] ?? null : null)

  // ── Pelear y publicar (pasos 9 y 10) ──────────────────────────────────────
  // Para pelear alcanza con 6 cartas que se entiendan (aunque rompan reglas);
  // para publicar, los pasos 1 a 9 hechos y el mazo cumpliendo la economía.
  const puedePelear = filas.length === REGLAS.cartasPorMazo && validacion.cartas.length === REGLAS.cartasPorMazo
  const puedePublicar = ([1, 2, 3, 4, 5, 6, 7, 8, 9] as PasoId[]).every((id) => estados[id] === 'hecho') && validacion.ok

  const publicar = async () => {
    const db = dbRef.current
    if (!db || !tabla || !puedePublicar || publicando) return
    const ok = await ask({
      title: 'PUBLICAR.EXE',
      body: <>Tu mazo {proyecto.titulo ? `«${proyecto.titulo}»` : ''} pasa a la muestra, con tus dibujos y tu código. Si después cambiás algo, lo podés publicar de nuevo.</>,
      ok: 'Publicar',
    })
    if (!ok) return
    setPublicando(true)
    sfx.confirm()
    try {
      // El orden de batalla guardado → ids de las cartas, en ese orden.
      let orden: number[] = []
      try {
        const res = ordenSql ? db.exec(ordenSql) : []
        const i = res[0]?.columns.map((c) => c.toLowerCase()).indexOf('id') ?? -1
        if (i >= 0) orden = res[0].values.map((v) => Number(v[i]))
      } catch { /* sin orden: la muestra juega por poder */ }
      // Lo que dibuja carta(fila) para cada carta (para "Así lo programé").
      let textos: Record<string, string> = {}
      if (proyecto.python_code.trim()) {
        try {
          const [{ runPython }, { reinoDesdeDb }] = await Promise.all([
            import('@/lib/game/executor/pyodide-runner'),
            import('@/lib/game/cartas/puente'),
          ])
          const rr = await runPython(proyecto.python_code, { reino: await reinoDesdeDb(db), limiteSeg: 2, sonda: SONDA_TEXTOS })
          if (rr.sonda && typeof rr.sonda === 'object' && !('error' in rr.sonda)) textos = rr.sonda as Record<string, string>
        } catch { /* sin textos: no frena la publicación */ }
      }
      await crearVersion(versionActual('publicar')).catch(() => {})
      const nuevo: AreaProyecto = { ...proyecto, publicado: true, pasos: { ...proyecto.pasos, '10': true } }
      setProyecto(nuevo)
      await guardarProyecto(nuevo)
      setGuardado(await publicarProyecto({
        titulo: proyecto.titulo, lema: proyecto.lema, alias: proyecto.alias, equipo: await equipoDelAlumno(),
        columnas: tabla.columnas, filas: tabla.filas, orden_ids: orden, python_code: proyecto.python_code,
        textos_carta: textos, disenos: proyecto.disenos, publicado_at: new Date().toISOString(),
      }))
      sfx.victory()
      decir('¡Publicado! Tu mazo ya está en la muestra. Si cambiás algo, publicalo de nuevo.')
    } finally {
      setPublicando(false)
    }
  }

  // ── Guía ──────────────────────────────────────────────────────────────────
  // Arriba los 4 capítulos: solo el del paso abierto muestra sus pasos (los
  // otros, una línea con sus puntos). Abajo, el paso abierto: título, consigna
  // y qué falta. Pista y desafío, escondidos en dos botoncitos.
  const capAbierto = CAPITULOS.find((c) => c.pasos.includes(paso))?.id
  const hechoPaso = estados[paso] === 'hecho'
  const falta = !hechoPaso ? queFalta(paso, estadoGuia) : null
  const guia = (
    <section aria-label="Guía" className="flex flex-col gap-3" style={{ minWidth: 0 }}>
      <nav aria-label="Pasos" className="flex flex-col gap-1">
        {CAPITULOS.map((c) => {
          const abierto = c.id === capAbierto
          const primero = c.pasos.find((id) => estados[id] !== 'hecho' && !PASOS[id].proximamente) ?? c.pasos[0]
          return (
            <div key={c.id}>
              <button
                type="button"
                className="flex items-center justify-between w-full"
                aria-expanded={abierto}
                onClick={() => { if (!abierto) abrirPaso(primero) }}
                style={{ fontFamily: jersey, fontSize: 18, lineHeight: 1, padding: '4px 0', background: 'transparent', border: 'none', color: abierto ? 'hsl(var(--tx))' : 'hsl(var(--tx2))', cursor: abierto ? 'default' : 'pointer' }}
              >
                <span>{c.titulo}</span>
                <span className="flex gap-1">{c.pasos.map((id) => <Punto key={id} estado={estados[id]} />)}</span>
              </button>
              {abierto && (
                <div className="flex flex-col">
                  {c.pasos.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="sys-row"
                      aria-selected={id === paso}
                      style={{ gridTemplateColumns: 'auto minmax(0, 1fr)', padding: '6px 6px', opacity: PASOS[id].proximamente ? 0.5 : 1 }}
                      onClick={() => abrirPaso(id)}
                    >
                      <Punto estado={estados[id]} />
                      <span className="truncate" style={{ fontFamily: vt, fontSize: 17, lineHeight: 1 }}>{id}. {PASOS[id].titulo}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* El paso abierto */}
      <div style={{ border: '2px solid hsl(var(--tx))', padding: 10, background: 'hsl(var(--bg))', boxShadow: '3px 3px 0 hsl(var(--tx) / 0.14)' }}>
        <div className="flex items-baseline justify-between gap-2">
          <h2 style={{ fontFamily: jersey, fontSize: 22, lineHeight: 1, margin: 0 }}>{paso}. {p.titulo}</h2>
          {hechoPaso && <span aria-label="Hecho" title="Hecho" style={{ fontFamily: jersey, fontSize: 20, lineHeight: 1 }}>✓</span>}
        </div>
        {(verConsigna || p.proximamente) && <p style={{ fontFamily: vt, fontSize: 18, lineHeight: 1.15, margin: '6px 0 0' }}>{p.consigna}</p>}
        {p.proximamente && <p className="sys-sub" style={{ marginTop: 6 }}>{p.proximamente}</p>}

        {paso === 1 && (
          <div className="flex flex-col gap-2" style={{ marginTop: 10 }}>
            {([['titulo', 'Título del mazo'], ['lema', 'Lema (opcional)'], ['alias', 'Alias para la muestra']] as const).map(([campo, label]) => (
              <label key={campo} className="flex flex-col gap-1">
                <span className="label-mono">{label}</span>
                <input
                  className="input"
                  value={proyecto[campo]}
                  maxLength={campo === 'alias' ? 20 : campo === 'titulo' ? 60 : 120}
                  onChange={(e) => { const v = limitar(campo, e.target.value); cambiar((x) => ({ ...x, [campo]: v })) }}
                  style={{ fontFamily: vt, fontSize: 18, padding: '4px 8px' }}
                />
              </label>
            ))}
          </div>
        )}

        {verConsigna && falta && falta !== p.consigna && (
          <p style={{ fontFamily: vt, fontSize: 17, lineHeight: 1.15, margin: '8px 0 0', paddingLeft: 8, borderLeft: '2px solid hsl(var(--tx))', color: 'hsl(var(--tx))' }}>{falta}</p>
        )}

        {!p.proximamente && (
          <div className="flex flex-col gap-1.5" style={{ marginTop: 10 }}>
            {pistas >= 1 && <p className="flex gap-1.5" style={{ fontFamily: vt, fontSize: 16, lineHeight: 1.15, margin: 0, color: 'hsl(var(--tx2))' }}><span style={{ marginTop: 2 }}><IconBulb size={12} color="hsl(var(--accent))" /></span><span>{p.pista1}</span></p>}
            {pistas >= 2 && <p style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.4, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '6px 8px', background: 'hsl(var(--surface2))' }}>{p.pista2}</p>}
            {verDesafio && p.desafio && (
              <div className="flex flex-col gap-1">
                <p style={{ fontFamily: vt, fontSize: 16, lineHeight: 1.15, margin: 0, color: 'hsl(var(--tx2))' }}>⭐ {p.desafio}{paso === 10 && proyecto.pasos.elegir ? ' ✓' : ''}</p>
                {paso === 10 && !proyecto.python_code.includes('def elegir') && (
                  <button type="button" className="sys-tool" style={{ alignSelf: 'flex-start' }} onClick={agregarElegir}>Agregar la plantilla</button>
                )}
              </div>
            )}
            {/* Todo escondido en botoncitos: qué hacer (?), la pista (dos niveles) y el desafío */}
            {(
              <div className="flex gap-1.5">
                <button type="button" className="sys-tool sys-tool--icono" aria-pressed={verConsigna} aria-label={verConsigna ? 'Esconder qué hacer' : 'Ver qué hacer'} title="Qué hacer"
                  onClick={() => { sfx.click(); setVerConsigna((v) => !v) }}>?</button>
                {pistas < 2 && (
                  <button type="button" className="sys-tool sys-tool--icono" aria-label={pistas === 0 ? 'Ver una pista' : 'Ver otra pista'} title={pistas === 0 ? 'Pista' : 'Otra pista'} onClick={() => { sfx.click(); setPistas((n) => n + 1) }}>
                    <IconBulb size={14} color="currentColor" />{pistas === 1 ? '+' : ''}
                  </button>
                )}
                {p.desafio && !verDesafio && (
                  <button type="button" className="sys-tool sys-tool--icono" aria-label="Ver el desafío" title="Desafío ⭐ (opcional)" onClick={() => { sfx.click(); setVerDesafio(true) }}>⭐</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )

  // ── Mesa ──────────────────────────────────────────────────────────────────
  // La carta grande manda; las flechas a sus costados. Debajo, el presupuesto
  // y las 6 miniaturas (poder y rareza en su franja). La regla rota, una sola
  // línea: las demás detrás de "+N".
  const sobra = total > REGLAS.presupuesto
  const flecha = (dir: -1 | 1) => (
    <button
      type="button"
      className="sys-tool sys-tool--icono"
      style={{ minHeight: 48 }}
      aria-label={dir < 0 ? 'Carta anterior' : 'Carta siguiente'}
      disabled={dir < 0 ? ranura === 0 : ranura >= nRanuras - 1}
      onClick={() => { sfx.click(); setRanura((x) => x + dir) }}
    >{dir < 0 ? '◀' : '▶'}</button>
  )
  const mesa = (
    <section aria-label="Mesa" className="flex flex-col items-center gap-3" style={{ minWidth: 0 }}>
      <div className="flex items-center gap-2">
        {flecha(-1)}
        <CartaPixel fila={filaActual} arte={arteDe(filaActual)} tamano={angosto ? 'normal' : 'grande'} rota={!!filaActual && rotas.has(String(filaActual.nombre ?? '').trim() || `La carta ${ranura + 1}`)} />
        {flecha(1)}
      </div>

      {/* Presupuesto: SUM(poder) contra 30, en 30 segmentos */}
      <div style={{ width: '100%', maxWidth: 300 }}>
        <div className="flex items-baseline justify-end" style={{ marginBottom: 4 }} title="Presupuesto: el poder total de tu mazo">
          <span style={{ fontFamily: jersey, fontSize: 20, lineHeight: 1, color: sobra ? 'hsl(var(--danger))' : undefined }}>{total}<span style={{ color: 'hsl(var(--tx3))' }}>/{REGLAS.presupuesto}</span></span>
        </div>
        <div
          role="meter" aria-valuemin={0} aria-valuemax={REGLAS.presupuesto} aria-valuenow={total} aria-label="Poder total del mazo"
          style={{
            display: 'grid', gridTemplateColumns: `repeat(${REGLAS.presupuesto}, 1fr)`, gap: 1, height: 14, padding: 1,
            border: `2px solid ${sobra ? 'hsl(var(--danger))' : 'hsl(var(--tx))'}`,
          }}
        >
          {Array.from({ length: REGLAS.presupuesto }, (_, i) => (
            <span key={i} style={{ background: i < total ? (sobra ? 'hsl(var(--danger))' : 'hsl(var(--tx))') : 'transparent' }} />
          ))}
        </div>
      </div>

      {/* Las 6 ranuras en miniatura */}
      <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label="Tus cartas">
        {Array.from({ length: nRanuras }, (_, i) => {
          const f = filas[i] ?? null
          return (
            <button
              key={i}
              type="button"
              onClick={() => { sfx.click(); setRanura(i) }}
              aria-label={f ? `Ver ${String(f.nombre ?? 'carta')}` : `Ranura ${i + 1} vacía`}
              aria-pressed={i === ranura}
              style={{ padding: 2, background: 'transparent', border: `2px solid ${i === ranura ? 'hsl(var(--accent))' : 'transparent'}`, cursor: 'pointer' }}
            >
              <CartaPixel fila={f} arte={arteDe(f)} ancho={52} vacia={!f} rota={!!f && rotas.has(String(f.nombre ?? '').trim() || `La carta ${i + 1}`)} />
            </button>
          )
        })}
      </div>

      {/* Reglas rotas: escondidas tras un chip "✘ N"; se abren a gusto */}
      {validacion.problemas.length > 0 && filas.length > 0 && (
        <div role="status" style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <button type="button" className="sys-tool" aria-expanded={verProblemas}
            aria-label={verProblemas ? 'Esconder las reglas rotas' : `Ver ${validacion.problemas.length} reglas rotas`}
            title="Reglas rotas"
            style={{ color: 'hsl(var(--danger))' }}
            onClick={() => { sfx.click(); setVerProblemas((v) => !v) }}>
            ✘ {validacion.problemas.length}
          </button>
          {verProblemas && (
          <ul style={{ margin: 0, padding: '6px 8px', border: '2px dashed hsl(var(--danger))', width: '100%', boxSizing: 'border-box', listStyle: 'none', fontFamily: vt, fontSize: 16, lineHeight: 1.15, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {validacion.problemas.map((x, i) => {
              const arreglo = arregloSql(x, tabla?.columnas ?? [])
              return (
              <li key={i} className="flex gap-1.5 items-start">
                <span aria-hidden style={{ color: 'hsl(var(--danger))', fontFamily: jersey }}>✘</span>
                <span className="flex-1">{x.mensaje}</span>
                {arreglo && (
                  <button type="button" className="sys-tool" style={{ flexShrink: 0 }} aria-label="Armar el arreglo en SQL" title="Armar el arreglo en SQL"
                    onClick={() => armarArreglo(arreglo)}>
                    ✎
                  </button>
                )}
              </li>
              )
            })}
          </ul>
          )}
        </div>
      )}
    </section>
  )

  // ── Dónde escribe ─────────────────────────────────────────────────────────
  const tab = (id: Pestana, label: string, disabled = false): ReactNode => (
    <button
      key={id}
      type="button"
      className="sys-tool"
      aria-pressed={pestana === id}
      disabled={disabled}
      title={disabled ? 'Se habilita para el Proyecto 3' : undefined}
      onClick={() => { sfx.tab(); setPestana(id) }}
    >{label}</button>
  )

  const codigo = (
    <section aria-label="Código" className="flex flex-col gap-3" style={{ minWidth: 0 }}>
      <div className="flex gap-2" role="group" aria-label="Lenguaje">
        {tab('sql', 'SQL')}
        {tab('python', 'PYTHON')}
        {tab('diseno', 'DISEÑO')}
      </div>

      {pestana === 'sql' && (
        <>
          <div style={{ border: '2px solid hsl(var(--tx))' }}>
            <CodeMirrorEditor
              value={proyecto.sql_borrador}
              onChange={(v) => cambiar((x) => ({ ...x, sql_borrador: v }))}
              language="sql"
              onCtrlEnter={ejecutarSql}
              accentColor="#38BDF8"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="cta-btn cta-btn--primary" onClick={ejecutarSql} disabled={busy || !proyecto.sql_borrador.trim()}>▶ Ejecutar</button>
            {ordenPendiente && <button type="button" className="sys-tool" onClick={guardarOrden}>Guardar como orden de batalla</button>}
            {ordenSql && !ordenPendiente && <span className="sys-sub">orden de batalla: {ordenOk ? 'guardado ✓' : 'no anda (¿trae el id?)'}</span>}
          </div>
          {r && resultado && (
            <Win title={r.error ? 'ERROR.EXE' : 'RESULTADO.TXT'} tone={r.error ? 'danger' : 'safe'} active className="win-pop" bodyStyle={{ padding: 12 }}>
              {resultado.notice || r.error === MENSAJE_REGLAS ? (
                <p style={{ fontFamily: vt, fontSize: 20, lineHeight: 1.15, margin: 0 }}>{resultado.notice ?? MENSAJE_REGLAS}</p>
              ) : (
                <SqlResult isCorrect={!r.error} error={r.error} expected="" code={resultado.code}
                  sql={{ columns: r.columns, rows: r.rows, changes: r.changes, schema: r.schema, fromVerify: false }} />
              )}
            </Win>
          )}
        </>
      )}

      {pestana === 'diseno' && (
        <PanelDiseno
          cartaId={filaActual ? String(filaActual.id ?? '') || null : null}
          fila={filaActual}
          disenos={proyecto.disenos}
          onCambiar={(f) => cambiar((x) => ({ ...x, disenos: f(x.disenos) }))}
          angosto={angosto}
        />
      )}

      {pestana === 'python' && (
        <>
          <div style={{ border: '2px solid hsl(var(--tx))' }}>
            <CodeMirrorEditor
              value={proyecto.python_code}
              onChange={(v) => cambiar((x) => ({ ...x, python_code: v }))}
              language="python"
              onCtrlEnter={ejecutarPython}
              accentColor="#DC143C"
            />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="cta-btn cta-btn--primary" onClick={ejecutarPython} disabled={busy || !proyecto.python_code.trim()}>▶ Ejecutar</button>
          </div>
          {prueba && (
            <ul style={{ margin: 0, padding: '8px 12px', listStyle: 'none', border: '2px solid hsl(var(--tx))', fontFamily: vt, fontSize: 17, lineHeight: 1.2 }} aria-label="Prueba de la plataforma">
              {prueba.map((l, i) => (
                <li key={i} style={{ color: l.ok ? 'hsl(var(--tx))' : 'hsl(var(--danger))' }}>{l.ok ? '✓' : '✘'} {l.text}</li>
              ))}
            </ul>
          )}
          {pyOut && (
            <pre style={{ margin: 0, padding: 12, minHeight: 80, maxHeight: 320, overflow: 'auto', border: '2px solid hsl(var(--border2))', background: 'hsl(var(--bg))', fontFamily: mono, fontSize: 13, lineHeight: 1.4, whiteSpace: 'pre-wrap', color: pyOut.error ? 'hsl(var(--danger))' : 'hsl(var(--tx))' }}>{pyOut.text}</pre>
          )}
        </>
      )}
    </section>
  )

  const titulo = proyecto.titulo.trim() ? `"${proyecto.titulo.trim()}"` : 'tu mazo'

  return (
    <div className="flex flex-col gap-3">
      <Win title={<>AREATRABAJO · {titulo}</>} active bodyStyle={{ padding: 14 }}>
        {angosto && (
          <div className="flex gap-2 mb-3" role="group" aria-label="Zona">
            {(['guia', 'mesa', 'codigo'] as const).map((z) => (
              <button key={z} type="button" className="sys-tool" aria-pressed={vista === z} onClick={() => { sfx.tab(); setVista(z) }}>
                {z === 'guia' ? 'Guía' : z === 'mesa' ? 'Mesa' : 'Código'}
              </button>
            ))}
          </div>
        )}
        {angosto ? (
          vista === 'guia' ? guia : vista === 'mesa' ? mesa : codigo
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) minmax(260px, 1fr) minmax(360px, 1.3fr)', gap: 18, alignItems: 'start' }}>
            {guia}
            {mesa}
            {codigo}
          </div>
        )}
      </Win>

      {/* Barra de abajo, siempre a la vista: progreso, guardado, volver atrás, probar y publicar */}
      <div className="flex flex-wrap items-center gap-2" style={{ position: 'sticky', bottom: 0, zIndex: 20, border: '2px solid hsl(var(--tx))', padding: '6px 10px', background: 'hsl(var(--bg))', boxShadow: '0 -3px 0 hsl(var(--bg))' }}>
        <span className="flex items-center gap-2" aria-label={`${hechos} de 10 pasos hechos`}>
          <span className="sys-meter" style={{ width: 90, color: 'hsl(var(--tx))' }}><span style={{ width: `calc(${hechos * 10}% - 2px)` }} /></span>
          <span style={{ fontFamily: jersey, fontSize: 18 }}>{hechos}/10</span>
        </span>
        <span className="flex items-center gap-1" role="status" aria-label={GUARDADO_LABEL[guardado]} title={GUARDADO_LABEL[guardado]}
          style={{ fontFamily: jersey, fontSize: 16, lineHeight: 1, marginLeft: 6, opacity: guardado === 'guardando' ? 0.55 : 1 }}>
          <PixelBitmap rows={ICON_DISCO} scale={2} ink="currentColor" />
          <span aria-hidden>{GUARDADO_CORTO[guardado]}</span>
        </span>
        <span className="flex-1" />
        <button type="button" className="sys-tool sys-tool--icono" aria-label="Volver atrás: ver versiones guardadas" title="Volver atrás" onClick={abrirVersiones}>
          <PixelBitmap rows={ICON_DESHACER} scale={2} ink="currentColor" />
        </button>
        <button
          type="button"
          className="sys-tool"
          style={{ minHeight: 30 }}
          disabled={!puedePelear}
          title={puedePelear ? 'Una partida contra un mazo de práctica' : 'Necesitás tus 6 cartas con rareza, color y poder que se entiendan'}
          onClick={() => { sfx.open(); setArena({ cpu: 'novato', seed: Date.now() }) }}
        >⚔ probar</button>
        <button
          type="button"
          className={puedePublicar ? 'sys-tool sys-tool--solid' : 'sys-tool'}
          style={{ minHeight: 30 }}
          disabled={!puedePublicar || publicando}
          title={puedePublicar ? 'Tu mazo pasa a la muestra' : 'Se habilita con los pasos 1 a 9 hechos y el mazo cumpliendo las reglas'}
          onClick={publicar}
        >{publicando ? 'publicando…' : proyecto.publicado ? 'publicar de nuevo' : 'publicar'}</button>
      </div>

      {arena && (
        <div role="dialog" aria-modal="true" aria-label="Arena de prueba" style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'hsl(var(--bg) / 0.92)', overflowY: 'auto', padding: angosto ? 8 : 24 }}>
          <Win title="ARENA_DE_PRUEBA.EXE" active onClose={() => { sfx.close(); setArena(null) }} style={{ maxWidth: 1100, margin: '0 auto' }} bodyStyle={{ padding: 16 }}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Contra qué mazo">
                <span className="label-mono">contra</span>
                {MAZOS_CPU.map((m) => (
                  <button key={m.id} type="button" className="sys-tool" aria-pressed={arena.cpu === m.id} title={m.lema}
                    onClick={() => { sfx.click(); setArena({ cpu: m.id, seed: Date.now() }) }}>
                    {m.titulo}{m.id === 'jefe' ? ' ⭐' : ''}
                  </button>
                ))}
              </div>
              {!validacion.ok && (
                <p style={{ fontFamily: vt, fontSize: 17, margin: 0, padding: '4px 10px', border: '2px dashed hsl(var(--danger))', alignSelf: 'center' }}>
                  ✘ Tu mazo rompe reglas: acá juega, en la muestra no.
                </p>
              )}
              <ArenaCartas
                key={`${arena.cpu}-${arena.seed}`}
                seed={arena.seed}
                a={{
                  nombre: 'Vos', titulo: proyecto.titulo || 'tu mazo', cartas: validacion.cartas,
                  arte: proyecto.disenos.frente, reverso: proyecto.disenos.reverso, volteo: proyecto.disenos.volteo, control: { tipo: 'humano' },
                }}
                b={(() => {
                  const m = mazoCpu(arena.cpu)
                  return { nombre: m.titulo, titulo: m.titulo, cartas: m.cartas, arte: m.arte, reverso: null, volteo: { estilo: 'giro', chispa: null, velocidad: 'normal' }, control: { tipo: 'cpu', estrategia: m.estrategia } }
                })()}
                onFin={(reg) => {
                  const gano = reg.ganador === 'a'
                  cambiar((x) => ({ ...x, pasos: { ...x.pasos, '9': true, ...(gano && arena.cpu === 'jefe' ? { jefe: true } : {}) } }))
                  guardarPartidaPrueba({ seed: reg.seed, ganador: reg.ganador, registro: { cpu: arena.cpu, rondas: reg.rondas.map((r) => ({ a: r.cartaA.id, b: r.cartaB.id, ganador: r.ganador })) } })
                  if (gano && arena.cpu === 'jefe') decir('¡Le ganaste al Jefe de práctica! Eso es el desafío ⭐ del paso 9.')
                }}
                onRevancha={() => setArena({ cpu: arena.cpu, seed: Date.now() })}
                acciones={<button type="button" className="sys-tool" onClick={() => { sfx.close(); setArena(null) }}>Volver a mi mesa</button>}
              />
            </div>
          </Win>
        </div>
      )}

      {versiones && (
        <Win title="VERSIONES.LOG" active onClose={() => { sfx.close(); setVersiones(null) }} className="win-pop" bodyStyle={{ padding: 12 }}>
          {versiones.length === 0 ? (
            <p className="sys-sub">Todavía no hay versiones guardadas. Se guarda una sola cada 10 minutos, y antes de cualquier orden peligrosa (un DELETE o UPDATE sin WHERE, o un DROP).</p>
          ) : (
            <div role="list">
              {versiones.map((v) => (
                <div key={v.id} role="listitem" className="sys-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto auto' }}>
                  <span className="min-w-0">
                    <span className="block" style={{ fontFamily: jersey, fontSize: 17, lineHeight: 1 }}>
                      {new Date(v.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                    <span className="block sys-sub">{MOTIVO_LABEL[v.motivo]}</span>
                  </span>
                  <span className="sys-sub">{v.cartas_snapshot ? `${v.cartas_snapshot.filas.length} carta${v.cartas_snapshot.filas.length === 1 ? '' : 's'}` : 'sin tabla'}</span>
                  <button type="button" className="sys-tool" onClick={() => restaurar(v)}>Volver a esta</button>
                </div>
              ))}
            </div>
          )}
        </Win>
      )}

      <MascotGuide tip={queFalta(pasoActual(estados), estadoGuia) ?? PASOS[pasoActual(estados)].consigna} alert={aviso} />
      {confirmNode}
    </div>
  )
}
