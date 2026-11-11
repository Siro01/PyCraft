'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { sfx, isMuted, setMuted } from '@/lib/game/architect/sound'
import { MAP_PALETTES } from '@/lib/game/act-maps'
import { EQUIPOS, MARCADOR_VACIO, leerMuestra, mazosDe, parejaAlAzar, type DatosMuestra, type MarcadorMuestra, type MazoMuestra } from '@/lib/game/cartas/muestra'
import { crearRng, enOrden, type RegistroPartida } from '@/lib/game/cartas/reglas'
import type { Equipo } from '@/lib/game/cartas/torneo'
import CartaPixel from '@/components/game/area/CartaPixel'
import ArenaCartas, { type LadoArena } from '@/components/game/area/ArenaCartas'
import Presentacion from './Presentacion'

// ─── /muestra: el stand de la muestra final ─────────────────────────────────
// Pantalla completa, para mirar desde 3 metros y tocar con el mouse. Dos botones
// grandes (Presentación y Batalla) y el marcador de la muestra. Lo demás va
// escondido en íconos chicos arriba a la derecha. Si nadie toca nada por un
// minuto, se alternan sola la presentación y la batalla automática.
// Funciona sin internet: lee muestra.json (cargado una vez, o en /public).

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-text), monospace'

const CLAVE_DATOS = 'pysql:muestra'
const CLAVE_MARCADOR = 'pysql:muestra-marcador'
const INACTIVO_MS = 60_000

type Pantalla =
  | { id: 'cargar'; error?: string }
  | { id: 'inicio' }
  | { id: 'presentacion' }
  | { id: 'batalla' }
  | { id: 'auto' }
  | { id: 'cpu-equipo' }
  | { id: 'cpu-mazo'; equipo: Equipo }
  | { id: 'cpu'; mio: MazoMuestra; rival: MazoMuestra; seed: number }
  | { id: 'dos-a' }
  | { id: 'dos-b'; a: MazoMuestra }
  | { id: 'dos'; a: MazoMuestra; b: MazoMuestra; seed: number }

const comoEstilo = (p: Record<string, string>) => p as unknown as CSSProperties
/** Mañana en tema blanco, Tarde en tema negro: desde lejos se ve qué equipo es cuál. */
export const TEMA_EQUIPO: Record<Equipo, CSSProperties> = {
  'PYCRAFT MAÑANA': comoEstilo(MAP_PALETTES.light),
  'PYCRAFT TARDE': comoEstilo(MAP_PALETTES.dark),
}
const corto = (e: Equipo) => (e === 'PYCRAFT MAÑANA' ? 'MAÑANA' : 'TARDE')

function leerJSON<T>(k: string, f: T): T { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T : f } catch { return f } }
function escribirJSON(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* sin espacio */ } }

function lado(m: MazoMuestra, control: LadoArena['control']): LadoArena {
  return {
    nombre: m.equipo, titulo: m.titulo, subtitulo: `${m.titulo} · ${m.alias}`, cartas: m.cartas,
    arte: m.foto.disenos.frente, reverso: m.foto.disenos.reverso, volteo: m.foto.disenos.volteo, control,
  }
}

/** Un botón enorme del kiosco. */
function Grande({ children, onClick, estilo }: { children: ReactNode; onClick: () => void; estilo?: CSSProperties }) {
  return (
    <button type="button" onClick={onClick}
      style={{ fontFamily: jersey, fontSize: 'clamp(28px, 4vw, 52px)', lineHeight: 1, padding: '22px 36px', minWidth: 280, border: '3px solid hsl(var(--tx))', background: 'hsl(var(--bg))', color: 'hsl(var(--tx))', boxShadow: '6px 6px 0 hsl(var(--tx) / 0.3)', cursor: 'pointer', ...estilo }}>
      {children}
    </button>
  )
}

/** El marcador de la muestra: cada mitad con el tema de su equipo. */
function Marcador({ m }: { m: MarcadorMuestra }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '3px solid hsl(var(--tx))', boxShadow: '6px 6px 0 hsl(var(--tx) / 0.3)', minWidth: 'min(820px, 92vw)' }} aria-label={`Marcador: mañana ${m['PYCRAFT MAÑANA']}, tarde ${m['PYCRAFT TARDE']}`}>
      {EQUIPOS.map((e) => (
        <div key={e} style={{ ...TEMA_EQUIPO[e], background: 'hsl(var(--bg))', color: 'hsl(var(--tx))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '16px 24px', flexDirection: e === 'PYCRAFT MAÑANA' ? 'row' : 'row-reverse' }}>
          <span style={{ fontFamily: jersey, fontSize: 'clamp(28px, 3vw, 48px)', lineHeight: 1 }}>{corto(e)}</span>
          <span style={{ fontFamily: jersey, fontSize: 'clamp(64px, 8vw, 128px)', lineHeight: 0.85 }}>{m[e]}</span>
        </div>
      ))}
    </div>
  )
}

/** Elegir un mazo de un equipo: el dorso de cada uno con su título. */
function ElegirMazo({ equipo, mazos, titulo, onElegir }: { equipo: Equipo; mazos: MazoMuestra[]; titulo: string; onElegir: (m: MazoMuestra) => void }) {
  return (
    <div style={{ ...TEMA_EQUIPO[equipo], background: 'hsl(var(--bg))', color: 'hsl(var(--tx))', padding: 24, minHeight: '80vh' }} className="flex flex-col items-center gap-6">
      <div style={{ fontFamily: jersey, fontSize: 'clamp(36px, 5vw, 72px)', lineHeight: 1, textAlign: 'center' }}>{titulo}</div>
      <div className="flex flex-wrap justify-center gap-8">
        {mazos.map((m) => (
          <button key={m.userId} type="button" onClick={() => { sfx.select(); onElegir(m) }} className="flex flex-col items-center gap-2"
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 6 }} aria-label={`${m.titulo} de ${m.alias}`}>
            <CartaPixel fila={null} bocaAbajo reverso={m.foto.disenos.reverso} tamano="normal" />
            <span style={{ fontFamily: jersey, fontSize: 28, maxWidth: 200, textAlign: 'center', lineHeight: 1 }}>{m.titulo}</span>
            <span style={{ fontFamily: vt, fontSize: 22, color: 'hsl(var(--tx2))' }}>{m.alias}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function MuestraApp() {
  const [datos, setDatos] = useState<DatosMuestra | null>(null)
  const [pantalla, setPantalla] = useState<Pantalla>({ id: 'inicio' })
  const [marcador, setMarcador] = useState<MarcadorMuestra>(MARCADOR_VACIO)
  const [atraccion, setAtraccion] = useState<'presentacion' | 'auto' | null>(null)
  const [mudo, setMudo] = useState(false)
  const [autoN, setAutoN] = useState(0)
  const rng = useMemo(() => crearRng(Date.now() % 100000), [])
  const archivo = useRef<HTMLInputElement>(null)

  // Datos: los últimos cargados en esta PC, o /muestra.json si el docente lo dejó en /public.
  useEffect(() => {
    setMarcador(leerJSON(CLAVE_MARCADOR, MARCADOR_VACIO))
    setMudo(isMuted())
    const guardados = leerJSON<unknown>(CLAVE_DATOS, null)
    const d = guardados ? leerMuestra(guardados) : null
    if (d && !('error' in d)) { setDatos(d); return }
    fetch('/muestra.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const x = j ? leerMuestra(j) : null
        if (x && !('error' in x)) { setDatos(x); escribirJSON(CLAVE_DATOS, j) } else setPantalla({ id: 'cargar' })
      })
      .catch(() => setPantalla({ id: 'cargar' }))
  }, [])

  const cargarArchivo = async (f: File) => {
    try {
      const j = JSON.parse(await f.text())
      const d = leerMuestra(j)
      if ('error' in d) { setPantalla({ id: 'cargar', error: d.error }); return }
      escribirJSON(CLAVE_DATOS, j)
      setDatos(d)
      setPantalla({ id: 'inicio' })
      sfx.confirm()
    } catch {
      setPantalla({ id: 'cargar', error: 'No se pudo leer ese archivo.' })
    }
  }

  const sumar = useCallback((equipo: Equipo | null) => {
    if (!equipo) return
    setMarcador((m) => { const n = { ...m, [equipo]: m[equipo] + 1 }; escribirJSON(CLAVE_MARCADOR, n); return n })
  }, [])

  const alTerminar = (a: MazoMuestra, b: MazoMuestra) => (r: RegistroPartida) => sumar(r.ganador === 'a' ? a.equipo : r.ganador === 'b' ? b.equipo : null)

  // Modo atracción: un minuto sin tocar nada en el inicio.
  const ultimoToque = useRef(Date.now())
  useEffect(() => {
    const toque = () => {
      ultimoToque.current = Date.now()
      if (atraccion) { setAtraccion(null); setPantalla({ id: 'inicio' }) }
    }
    window.addEventListener('pointerdown', toque, true)
    window.addEventListener('keydown', toque, true)
    const t = setInterval(() => {
      if (!atraccion && pantalla.id === 'inicio' && datos && Date.now() - ultimoToque.current > INACTIVO_MS) setAtraccion('presentacion')
    }, 2000)
    return () => { window.removeEventListener('pointerdown', toque, true); window.removeEventListener('keydown', toque, true); clearInterval(t) }
  }, [atraccion, pantalla.id, datos])

  const ir = (p: Pantalla) => { sfx.click(); setPantalla(p) }
  const pantallaCompleta = () => { sfx.click(); document.fullscreenElement ? document.exitFullscreen().catch(() => {}) : document.documentElement.requestFullscreen().catch(() => {}) }

  // ── Íconos chicos de arriba (lo secundario, escondido) ──
  const barra = (
    <div className="flex gap-2" style={{ position: 'fixed', top: 10, right: 10, zIndex: 20, opacity: 0.55 }}>
      {pantalla.id !== 'inicio' && pantalla.id !== 'cargar' && <button type="button" className="sys-tool" aria-label="Volver al inicio" title="Inicio" onClick={() => { setAtraccion(null); ir({ id: 'inicio' }) }}>⌂</button>}
      <button type="button" className="sys-tool" aria-label={mudo ? 'Activar sonido' : 'Silenciar'} title={mudo ? 'Activar sonido' : 'Silenciar'} onClick={() => { setMuted(!mudo); setMudo(!mudo) }}>{mudo ? '♪̸' : '♪'}</button>
      <button type="button" className="sys-tool" aria-label="Pantalla completa" title="Pantalla completa (Esc para salir)" onClick={pantallaCompleta}>⛶</button>
      <button type="button" className="sys-tool" aria-label="Cargar otra muestra" title="Cargar muestra.json" onClick={() => archivo.current?.click()}>⇪</button>
      <input ref={archivo} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) cargarArchivo(f); e.target.value = '' }} />
    </div>
  )

  const marco = (hijo: ReactNode) => (
    <div className="desk-theme" style={{ minHeight: '100vh', background: 'hsl(var(--bg))', color: 'hsl(var(--tx))', padding: '56px 16px 24px' }}>
      {barra}
      {hijo}
    </div>
  )

  if (pantalla.id === 'cargar' || !datos) {
    return marco(
      <div className="flex flex-col items-center justify-center gap-6" style={{ minHeight: '70vh', textAlign: 'center' }}>
        <div style={{ fontFamily: jersey, fontSize: 'clamp(36px, 5vw, 72px)', lineHeight: 1 }}>PYCRAFT · MUESTRA</div>
        {pantalla.id === 'cargar' ? (
          <>
            <Grande onClick={() => archivo.current?.click()}>Cargar muestra.json</Grande>
            <p style={{ fontFamily: vt, fontSize: 20, color: 'hsl(var(--tx2))', margin: 0 }}>{pantalla.error ?? 'Exportalo desde areatrabajo.exe en el panel docente.'}</p>
          </>
        ) : <p style={{ fontFamily: vt, fontSize: 20 }}>Cargando…</p>}
      </div>,
    )
  }

  // ── Modo atracción ──
  if (atraccion === 'presentacion') {
    return marco(<Presentacion mazos={datos.mazos} temaDe={(m) => TEMA_EQUIPO[m.equipo]} limite={3} onFin={() => { setAutoN(0); setAtraccion('auto') }} />)
  }
  if (atraccion === 'auto') {
    return marco(<Automatica datos={datos} rng={rng} sumar={sumar} limite={2} onFin={() => setAtraccion('presentacion')} />)
  }

  switch (pantalla.id) {
    case 'inicio':
      return marco(
        <div className="flex flex-col items-center justify-center gap-10" style={{ minHeight: '78vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: jersey, fontSize: 'clamp(64px, 11vw, 180px)', lineHeight: 0.85 }}>PYCRAFT</div>
            <div style={{ fontFamily: jersey, fontSize: 'clamp(22px, 2.6vw, 40px)', letterSpacing: '0.3em', color: 'hsl(var(--tx2))', marginTop: 8 }}>MUESTRA FINAL</div>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Grande onClick={() => ir({ id: 'presentacion' })}>▶ PRESENTACIÓN</Grande>
            <Grande onClick={() => ir({ id: 'batalla' })}>⚔ BATALLA</Grande>
          </div>
          <Marcador m={marcador} />
        </div>,
      )

    case 'presentacion':
      return marco(<Presentacion mazos={datos.mazos} temaDe={(m) => TEMA_EQUIPO[m.equipo]} />)

    case 'batalla':
      return marco(
        <div className="flex flex-col items-center justify-center gap-6" style={{ minHeight: '78vh' }}>
          <Grande onClick={() => { setAutoN((n) => n + 1); ir({ id: 'auto' }) }}>AUTOMÁTICA</Grande>
          <Grande onClick={() => ir({ id: 'cpu-equipo' })}>VOS VS CPU</Grande>
          <Grande onClick={() => ir({ id: 'dos-a' })}>MAÑANA VS TARDE</Grande>
        </div>,
      )

    case 'auto':
      return marco(<Automatica key={autoN} datos={datos} rng={rng} sumar={sumar} />)

    case 'cpu-equipo':
      return marco(
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '80vh' }}>
          {EQUIPOS.map((e) => (
            <button key={e} type="button" onClick={() => ir({ id: 'cpu-mazo', equipo: e })}
              style={{ ...TEMA_EQUIPO[e], background: 'hsl(var(--bg))', color: 'hsl(var(--tx))', border: '3px solid hsl(var(--tx))', cursor: 'pointer', fontFamily: jersey, fontSize: 'clamp(30px, 4vw, 60px)', lineHeight: 1 }}>
              JUGÁ CON<br />{corto(e)}
            </button>
          ))}
        </div>,
      )

    case 'cpu-mazo':
      return marco(
        <ElegirMazo equipo={pantalla.equipo} mazos={mazosDe(datos, pantalla.equipo)} titulo="Elegí un mazo"
          onElegir={(mio) => {
            const otros = mazosDe(datos, pantalla.equipo === 'PYCRAFT MAÑANA' ? 'PYCRAFT TARDE' : 'PYCRAFT MAÑANA')
            if (!otros.length) return
            setPantalla({ id: 'cpu', mio, rival: otros[Math.floor(rng() * otros.length)], seed: Date.now() })
          }} />,
      )

    case 'cpu': {
      const { mio, rival, seed } = pantalla
      return marco(
        <ArenaCartas key={seed} seed={seed} disposicion="lados"
          a={{ ...lado(mio, { tipo: 'humano' }), nombre: `VOS · ${corto(mio.equipo)}` }}
          b={lado(rival, { tipo: 'cpu', estrategia: enOrden(rival.orden) })}
          temaA={TEMA_EQUIPO[mio.equipo]} temaB={TEMA_EQUIPO[rival.equipo]}
          onFin={alTerminar(mio, rival)}
          onRevancha={() => setPantalla({ id: 'cpu', mio, rival, seed: Date.now() })}
          acciones={<button type="button" className="sys-tool" onClick={() => ir({ id: 'cpu-mazo', equipo: mio.equipo })}>Otro mazo</button>} />,
      )
    }

    case 'dos-a':
      return marco(<ElegirMazo equipo="PYCRAFT MAÑANA" mazos={mazosDe(datos, 'PYCRAFT MAÑANA')} titulo="MAÑANA: elegí tu mazo" onElegir={(a) => setPantalla({ id: 'dos-b', a })} />)

    case 'dos-b':
      return marco(<ElegirMazo equipo="PYCRAFT TARDE" mazos={mazosDe(datos, 'PYCRAFT TARDE')} titulo="TARDE: elegí tu mazo" onElegir={(b) => setPantalla({ id: 'dos', a: pantalla.a, b, seed: Date.now() })} />)

    case 'dos': {
      const { a, b, seed } = pantalla
      return marco(
        <ArenaCartas key={seed} seed={seed} disposicion="lados"
          a={lado(a, { tipo: 'humano' })} b={lado(b, { tipo: 'humano' })}
          temaA={TEMA_EQUIPO[a.equipo]} temaB={TEMA_EQUIPO[b.equipo]}
          onFin={alTerminar(a, b)}
          onRevancha={() => setPantalla({ id: 'dos', a, b, seed: Date.now() })}
          acciones={<button type="button" className="sys-tool" onClick={() => ir({ id: 'dos-a' })}>Otros mazos</button>} />,
      )
    }
  }
}

/** Batalla automática: peleas al azar Mañana vs Tarde, en loop. */
function Automatica({ datos, rng, sumar, limite, onFin }: { datos: DatosMuestra; rng: () => number; sumar: (e: Equipo | null) => void; limite?: number; onFin?: () => void }) {
  const [pareja, setPareja] = useState(() => parejaAlAzar(datos, rng))
  const [fase, setFase] = useState<'proxima' | 'pelea'>('proxima')
  const [n, setN] = useState(0)
  const [seed, setSeed] = useState(() => Date.now())

  useEffect(() => {
    if (fase !== 'proxima') return
    const t = setTimeout(() => setFase('pelea'), 4000)
    return () => clearTimeout(t)
  }, [fase])

  if (!pareja) return <p style={{ fontFamily: vt, fontSize: 22, textAlign: 'center' }}>Hace falta al menos un mazo de cada equipo.</p>
  const [m, t] = pareja

  if (fase === 'proxima') {
    return (
      <div className="muestra-fade" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', minHeight: '78vh' }}>
        {[m, null, t].map((x, i) => x ? (
          <div key={i} style={{ ...TEMA_EQUIPO[x.equipo], background: 'hsl(var(--bg))', color: 'hsl(var(--tx))', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 }}>
            <span style={{ fontFamily: jersey, fontSize: 'clamp(24px, 2.6vw, 40px)', letterSpacing: '0.1em' }}>{corto(x.equipo)}</span>
            <CartaPixel fila={null} bocaAbajo reverso={x.foto.disenos.reverso} tamano="grande" />
            <span style={{ fontFamily: jersey, fontSize: 'clamp(30px, 3.4vw, 56px)', lineHeight: 1, textAlign: 'center' }}>{x.titulo}</span>
            <span style={{ fontFamily: vt, fontSize: 26, color: 'hsl(var(--tx2))' }}>{x.alias}</span>
          </div>
        ) : (
          <div key={i} style={{ fontFamily: jersey, fontSize: 72, lineHeight: 1, padding: '0 28px', textAlign: 'center' }}>VS<div style={{ fontSize: 22, letterSpacing: '0.12em', color: 'hsl(var(--tx2))', marginTop: 6 }}>PRÓXIMA PELEA</div></div>
        ))}
      </div>
    )
  }

  return (
    <ArenaCartas key={seed} seed={seed} disposicion="lados" pausaCpu={900}
      a={lado(m, { tipo: 'cpu', estrategia: enOrden(m.orden) })}
      b={lado(t, { tipo: 'cpu', estrategia: enOrden(t.orden) })}
      temaA={TEMA_EQUIPO[m.equipo]} temaB={TEMA_EQUIPO[t.equipo]}
      onFin={(r) => {
        sumar(r.ganador === 'a' ? m.equipo : r.ganador === 'b' ? t.equipo : null)
        const siguiente = n + 1
        setTimeout(() => {
          if (limite && siguiente >= limite) { onFin?.(); return }
          setN(siguiente)
          setPareja(parejaAlAzar(datos, rng))
          setSeed(Date.now())
          setFase('proxima')
        }, 5000)
      }} />
  )
}
