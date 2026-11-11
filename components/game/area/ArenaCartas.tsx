'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { sfx } from '@/lib/game/architect/sound'
import {
  COLORES, REGLAS, cartaDestacada, crearPartida, crearRng, filaDeCarta, jugarRonda, type Carta, type Estrategia,
  type EstadoPartida, type RegistroPartida, type ResultadoRonda,
} from '@/lib/game/cartas/reglas'
import { intencionCpu } from '@/lib/game/cartas/cpu'
import { DURACION_VOLTEO, type ArteCarta, type Volteo } from '@/lib/game/cartas/paleta'
import { PixelBitmap, ICON_OJOS } from '@/components/game/architect/desktop/PixelBitmap'
import CartaPixel, { IconoColor } from './CartaPixel'
import CartaVolteo from './CartaVolteo'

// ─── La arena de cartas ─────────────────────────────────────────────────────
// Una partida entre dos mazos: 5 rondas, una carta por lado, la plataforma es
// el árbitro (reglas.ts). Las manos se ven boca arriba (información completa)
// y la CPU muestra antes el color de la carta que va a jugar (su intención,
// que nunca miente, debajo de su carta boca abajo). Ronda: elegir → revelar (volteo de cada mazo) → ventaja
// (+4) → choque (pausa corta, sacudida de 2 px solo en las cartas) → punto.
//
// Sirve para la arena de prueba (vertical) y para la muestra (dos lados, cada
// uno con el tema de su equipo). Con dos humanos, la elección es secreta: una
// pantalla de traspaso le pide al otro equipo que no mire.

export interface LadoArena {
  /** Lo grande: "Vos", "PYCRAFT MAÑANA" o el nombre de la CPU. */
  nombre: string
  titulo: string
  /** Debajo del nombre, chico (título del mazo · alias). */
  subtitulo?: string
  cartas: Carta[]
  arte: Record<string, ArteCarta>
  reverso: string | null
  volteo: Volteo
  control: { tipo: 'humano' } | { tipo: 'cpu'; estrategia: Estrategia }
}

type Fase = 'elegir' | 'revelar' | 'ventaja' | 'choque' | 'fin'
type Lado = 'a' | 'b'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-text), monospace'

const quieto = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** El círculo de ventajas, siempre a la vista y sin texto: los íconos son las
 * mismas tramas de las cartas. Se enciende el tramo que aplica (+4). */
export function CirculoVentajas({ activo, size = 20 }: { activo: number | null; size?: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center" style={{ gap: Math.round(size / 4) }} role="img" aria-label="Círculo de ventajas: liso le gana a rayas, rayas a damero, damero a ondas y ondas a liso">
      {[...COLORES, COLORES[0]].map((c, i) => (
        <span key={i} className="flex items-center" style={{ gap: Math.round(size / 4) }}>
          {i > 0 && (
            <span style={{
              fontFamily: jersey, fontSize: size, lineHeight: 1, padding: '1px 4px', minWidth: size * 0.8, textAlign: 'center',
              background: activo === i - 1 ? 'hsl(var(--accent))' : 'transparent',
              color: activo === i - 1 ? 'var(--on-accent, hsl(var(--bg)))' : 'hsl(var(--tx3))',
            }}>{activo === i - 1 ? `+${REGLAS.ventaja}` : '›'}</span>
          )}
          <span title={c}><IconoColor color={c} size={size} /></span>
        </span>
      ))}
    </div>
  )
}

/** Los puntos de las 5 rondas: lleno = jugada. */
function Rondas({ jugadas, size = 10 }: { jugadas: number; size?: number }) {
  return (
    <span className="flex items-center" style={{ gap: Math.max(2, Math.round(size / 3)) }} role="img" aria-label={`Ronda ${Math.min(jugadas + 1, REGLAS.rondas)} de ${REGLAS.rondas}`}>
      {Array.from({ length: REGLAS.rondas }, (_, i) => (
        <span key={i} style={{ width: size, height: size, border: '2px solid hsl(var(--tx))', background: i < jugadas ? 'hsl(var(--tx))' : i === jugadas ? 'hsl(var(--tx) / 0.25)' : 'transparent' }} />
      ))}
    </span>
  )
}

/** Ancho de las cartas de la mano en la muestra: 6 en una fila por mitad de pantalla. */
function useAnchoMano(activo: boolean) {
  const [w, setW] = useState(110)
  useEffect(() => {
    if (!activo) return
    const calc = () => setW(Math.max(76, Math.min(132, Math.floor((window.innerWidth / 2 - 110) / 6) - 8)))
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [activo])
  return w
}

export interface ArenaCartasProps {
  a: LadoArena
  b: LadoArena
  seed: number
  onFin?: (r: RegistroPartida) => void
  onRevancha?: () => void
  /** Botones extra al terminar (otro mazo, cerrar…). */
  acciones?: ReactNode
  /** 'vertical' (arena de prueba) · 'lados' (la muestra: un equipo a cada lado). */
  disposicion?: 'vertical' | 'lados'
  /** Tokens del tema de cada lado (por ejemplo MAP_PALETTES.light). */
  temaA?: CSSProperties
  temaB?: CSSProperties
  /** Espera antes de cada ronda cuando juegan dos CPU (para poder seguirla). */
  pausaCpu?: number
}

export default function ArenaCartas({ a, b, seed, onFin, onRevancha, acciones, disposicion = 'vertical', temaA, temaB, pausaCpu = 0 }: ArenaCartasProps) {
  const rng = useMemo(() => crearRng(seed), [seed])
  const [estado, setEstado] = useState<EstadoPartida>(() => crearPartida(a.cartas, b.cartas))
  const [fase, setFase] = useState<Fase>('elegir')
  const [elegidaA, setElegidaA] = useState<Carta | null>(null)
  const [elegidaB, setElegidaB] = useState<Carta | null>(null)
  const [resultado, setResultado] = useState<ResultadoRonda | null>(null)
  const [pop, setPop] = useState<Lado | null>(null)
  const dosHumanos = a.control.tipo === 'humano' && b.control.tipo === 'humano'
  // Dos humanos: elige A, traspaso, elige B. `listo` = ya apretó "Estoy listo".
  const [turno, setTurno] = useState<Lado>('a')
  const [listo, setListo] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const finAvisado = useRef(false)
  const anchoMano = useAnchoMano(disposicion === 'lados')

  const despues = (ms: number, f: () => void) => { timers.current.push(setTimeout(f, quieto() ? Math.min(ms, 150) : ms)) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Al empezar cada ronda, la CPU decide primero (su intención queda a la vista).
  useEffect(() => {
    if (fase !== 'elegir' || estado.ganador) return
    if (b.control.tipo === 'cpu' && !elegidaB) setElegidaB(intencionCpu(estado, b.control.estrategia, rng))
    if (a.control.tipo === 'cpu' && !elegidaA) {
      const inv = { ...estado, manoA: estado.manoB, manoB: estado.manoA }
      setElegidaA(intencionCpu(inv, a.control.estrategia, rng))
    }
  }, [fase, estado, a.control, b.control, elegidaA, elegidaB, rng])

  // Con las dos cartas elegidas: revelar → ventaja → choque → punto → siguiente.
  const resolver = useCallback((ca: Carta, cb: Carta) => {
    setFase('revelar')
    sfx.pageFlip()
    const dur = Math.max(DURACION_VOLTEO[a.volteo.velocidad], DURACION_VOLTEO[b.volteo.velocidad]) + 120
    let siguiente: EstadoPartida | null = null
    despues(dur, () => {
      siguiente = jugarRonda(estado, ca, cb)
      const r = siguiente.rondas[siguiente.rondas.length - 1]
      setResultado(r)
      setFase('ventaja')
      if (r.ventaja) sfx.select()
      despues(r.ventaja ? 420 : 120, () => {
        setFase('choque')
        if (r.ganador !== 'empate') sfx.hit(); else sfx.bump()
        despues(420, () => {
          setEstado(siguiente!)
          if (r.ganador !== 'empate') setPop(r.ganador)
          despues(700, () => {
            setPop(null)
            setResultado(null)
            setElegidaA(null)
            setElegidaB(null)
            setTurno('a')
            setListo(false)
            setFase(siguiente!.ganador ? 'fin' : 'elegir')
          })
        })
      })
    })
  }, [a.volteo.velocidad, b.volteo.velocidad, estado]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dos CPU: se espera un poco (para que se pueda seguir) y se resuelve.
  useEffect(() => {
    if (fase !== 'elegir' || !elegidaA || !elegidaB || a.control.tipo !== 'cpu') return
    const t = setTimeout(() => resolver(elegidaA, elegidaB), quieto() ? 0 : pausaCpu)
    return () => clearTimeout(t)
  }, [fase, elegidaA, elegidaB, a.control.tipo, resolver, pausaCpu])

  const jugar = (lado: Lado, c: Carta) => {
    if (fase !== 'elegir') return
    sfx.select()
    if (dosHumanos) {
      if (lado === 'a' && turno === 'a') { setElegidaA(c); setTurno('b'); setListo(false) }
      else if (lado === 'b' && turno === 'b' && elegidaA) { setElegidaB(c); resolver(elegidaA, c) }
      return
    }
    if (lado === 'a' && a.control.tipo === 'humano' && elegidaB) { setElegidaA(c); resolver(c, elegidaB) }
  }

  // Registro final (para guardar la partida y la carta destacada).
  const registro: RegistroPartida | null = estado.ganador
    ? { seed, rondas: estado.rondas, sinJugarA: estado.manoA, sinJugarB: estado.manoB, puntosA: estado.puntosA, puntosB: estado.puntosB, ganador: estado.ganador }
    : null
  useEffect(() => {
    if (fase !== 'fin' || !registro || finAvisado.current) return
    finAvisado.current = true
    if (registro.ganador === 'empate') sfx.confirm(); else if (registro.ganador === 'a' || a.control.tipo !== 'humano' || dosHumanos) sfx.victory(); else sfx.powerdown()
    onFin?.(registro)
  }, [fase, registro, onFin, a.control.tipo, dosHumanos])

  const ultima = estado.rondas[estado.rondas.length - 1]
  const ventajaActiva = fase !== 'elegir' && fase !== 'revelar' && resultado?.ventaja
    ? COLORES.indexOf((resultado.ventaja === 'a' ? (elegidaA ?? ultima?.cartaA) : (elegidaB ?? ultima?.cartaB))!.color)
    : null
  const revelada = fase !== 'elegir'
  const lados = disposicion === 'lados'
  const puntos = (lado: Lado) => (lado === 'a' ? estado.puntosA : estado.puntosB)
  const ladoDe = (lado: Lado) => (lado === 'a' ? a : b)
  /** ¿Este lado puede tocar una carta ahora? */
  const puedeElegir = (lado: Lado) => {
    if (fase !== 'elegir' || ladoDe(lado).control.tipo !== 'humano') return false
    if (dosHumanos) return turno === lado && listo
    return lado === 'a' && !!elegidaB
  }
  /** La carta elegida sigue en la mano hasta revelarse si su dueño la eligió en secreto (CPU o dos humanos). */
  const ocultaEnMano = (lado: Lado) => fase === 'elegir' && (ladoDe(lado).control.tipo === 'cpu' || dosHumanos)

  const centro = (lado: Lado) => {
    const l = ladoDe(lado)
    const ancho = disposicion === 'lados' ? 200 : 160
    const c = lado === 'a' ? elegidaA : elegidaB
    const gana = fase === 'choque' && resultado?.ganador === lado
    const pierde = fase === 'choque' && resultado && resultado.ganador !== 'empate' && resultado.ganador !== lado
    const poder = resultado ? (lado === 'a' ? resultado.poderA : resultado.poderB) : null
    const conVentaja = resultado?.ventaja === lado && fase !== 'revelar'
    const sacude = fase === 'choque' && resultado?.ganador !== 'empate'
    return (
      <div className="flex flex-col items-center gap-2" style={{ minWidth: ancho }}>
        <div style={{ position: 'relative' }} className={[gana ? `arena-gana-${lado}` : pierde ? 'arena-pierde' : '', sacude ? 'arena-centro--choque' : ''].join(' ').trim() || undefined}>
          {c ? (
            <CartaVolteo
              frente={<CartaPixel fila={filaDeCarta(c)} arte={l.arte[String(c.id)] ?? null} ancho={ancho} />}
              reverso={l.reverso}
              volteo={l.volteo}
              revelada={revelada}
              ancho={ancho}
            />
          ) : (
            <CartaPixel fila={null} vacia ancho={ancho} />
          )}
          {conVentaja && (
            <span className="arena-ventaja" style={{ position: 'absolute', top: -14, right: -10, fontFamily: jersey, fontSize: 26, lineHeight: 1, padding: '2px 8px', background: 'hsl(var(--accent))', color: 'var(--on-accent, hsl(var(--bg)))', border: '2px solid hsl(var(--tx))' }}>
              +{REGLAS.ventaja}
            </span>
          )}
        </div>
        {/* Debajo de la carta: la intención de la CPU (mientras se elige) o el poder de la ronda */}
        <div className="flex items-center justify-center" style={{ minHeight: lados ? 44 : 32 }}>
          {intencion(lado) ?? <span style={{ fontFamily: jersey, fontSize: lados ? 44 : 30, lineHeight: 1 }}>{poder !== null && fase !== 'revelar' ? poder : ''}</span>}
        </div>
      </div>
    )
  }

  const mano = (lado: Lado) => {
    const l = ladoDe(lado)
    const cartas = lado === 'a' ? estado.manoA : estado.manoB
    const elegida = lado === 'a' ? elegidaA : elegidaB
    const puede = puedeElegir(lado)
    return (
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={`Mano de ${l.nombre}`}>
        {cartas.filter((c) => c.id !== elegida?.id || ocultaEnMano(lado)).map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={!puede}
            onClick={() => jugar(lado, c)}
            aria-label={`Jugar ${c.nombre}`}
            style={{ padding: 0, background: 'transparent', border: 'none', cursor: puede ? 'pointer' : 'default' }}
            className={puede ? 'arena-carta-mano' : undefined}
          >
            <CartaPixel fila={filaDeCarta(c)} arte={l.arte[String(c.id)] ?? null} ancho={lados ? anchoMano : lado === 'b' && !dosHumanos ? 76 : 120} />
          </button>
        ))}
      </div>
    )
  }

  /** La intención de la CPU: solo el color, al lado de su carta boca abajo. */
  const intencion = (lado: Lado) => {
    const l = ladoDe(lado)
    const c = lado === 'a' ? elegidaA : elegidaB
    const otro = ladoDe(lado === 'a' ? 'b' : 'a')
    if (l.control.tipo !== 'cpu' || otro.control.tipo !== 'humano' || !c || fase !== 'elegir') return null
    const t = lados ? 28 : 20
    return (
      <span className="flex items-center gap-2" style={{ fontFamily: jersey, fontSize: t, lineHeight: 1, padding: '4px 10px', border: '2px dashed hsl(var(--tx))' }}
        aria-label={`Ya eligió: va a jugar una carta ${c.color}`} title="Ya eligió: este es el color de la carta que va a jugar">
        <span aria-hidden>juega</span> <IconoColor color={c.color} size={t} /> {c.color}
      </span>
    )
  }

  const destacada = (lado: Lado) => (registro ? cartaDestacada([registro], () => lado) : null)
  const nombreGanador = registro?.ganador === 'a' ? a.nombre : registro?.ganador === 'b' ? b.nombre : null

  const final = registro && (
    <div className="flex flex-col items-center gap-3" style={{ border: '2px solid hsl(var(--tx))', padding: 16, background: 'hsl(var(--bg))', color: 'hsl(var(--tx))' }}>
      <div className="arena-pop" style={{ fontFamily: jersey, fontSize: lados ? 56 : 40, lineHeight: 1, textAlign: 'center' }}>
        {nombreGanador ? (a.control.tipo === 'humano' && !dosHumanos && registro.ganador === 'a' ? '¡GANASTE!' : `¡GANA ${nombreGanador.toUpperCase()}!`) : '¡EMPATE!'}
      </div>
      <div className="flex flex-wrap justify-center gap-8">
        {(['a', 'b'] as const).map((lado) => {
          const l = ladoDe(lado)
          const id = destacada(lado)
          const c = id !== null ? l.cartas.find((x) => x.id === id) : null
          if (!c) return null
          return (
            <div key={lado} className="flex flex-col items-center gap-1">
              <span className="label-mono">★ {l.nombre}</span>
              <CartaPixel fila={filaDeCarta(c)} arte={l.arte[String(c.id)] ?? null} tamano="chica" />
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {onRevancha && <button type="button" className="cta-btn cta-btn--primary" onClick={() => { sfx.click(); onRevancha() }}>Revancha</button>}
        {acciones}
      </div>
    </div>
  )

  // Pantalla de traspaso (dos humanos): el otro equipo no mira.
  const traspaso = dosHumanos && fase === 'elegir' && !listo && !estado.ganador && (() => {
    const l = ladoDe(turno)
    const tema = turno === 'a' ? temaA : temaB
    return (
      <div role="dialog" aria-modal="true" aria-label={`Turno de ${l.nombre}`} style={{ ...tema, position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, background: 'hsl(var(--bg))', color: 'hsl(var(--tx))', textAlign: 'center', padding: 24 }}>
        <PixelBitmap rows={ICON_OJOS} scale={7} />
        <div style={{ fontFamily: jersey, fontSize: 48, lineHeight: 1 }}>TURNO DE {l.nombre.toUpperCase()}</div>
        <div style={{ fontFamily: vt, fontSize: 24, color: 'hsl(var(--tx2))' }}>el otro equipo no mira</div>
        <button type="button" className="cta-btn cta-btn--primary" onClick={() => { sfx.confirm(); setListo(true) }}>Estoy listo</button>
      </div>
    )
  })()

  const rondas = <Rondas jugadas={estado.rondas.length} size={lados ? 16 : 10} />

  // ── Dos lados (la muestra): cada equipo con su tema, nombres enormes ───────
  if (lados) {
    const mitad = (lado: Lado) => {
      const l = ladoDe(lado)
      const tema = lado === 'a' ? temaA : temaB
      return (
        <section aria-label={l.nombre} style={{ ...tema, background: 'hsl(var(--bg))', color: 'hsl(var(--tx))', padding: '18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {/* Nombre y puntos en una línea: los puntos, del lado del centro */}
          <div className="flex items-center justify-center gap-5" style={{ flexDirection: lado === 'a' ? 'row' : 'row-reverse', maxWidth: '100%' }}>
            <div style={{ fontFamily: jersey, fontSize: 'clamp(30px, 3.6vw, 60px)', lineHeight: 0.95, textAlign: 'center', minWidth: 0 }}>{l.nombre.toUpperCase()}</div>
            <div className={pop === lado ? 'arena-pop' : undefined} style={{ fontFamily: jersey, fontSize: 'clamp(56px, 6vw, 96px)', lineHeight: 0.9, minWidth: '1ch', textAlign: 'center' }}>{puntos(lado)}</div>
          </div>
          {l.subtitulo && <div className="truncate" style={{ fontFamily: vt, fontSize: 22, color: 'hsl(var(--tx2))', maxWidth: '100%' }}>{l.subtitulo}</div>}
          {centro(lado)}
          {mano(lado)}
        </section>
      )
    }
    return (
      <div style={{ position: 'relative' }} className="flex flex-col">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', minHeight: '78vh' }}>
          {mitad('a')}
          {/* El centro: VS y las rondas, a la altura de las cartas que pelean */}
          <div className="flex flex-col items-center gap-3" style={{ padding: '0 14px', paddingTop: 'clamp(150px, 20vh, 220px)', background: 'hsl(var(--bg))', borderLeft: '2px solid hsl(var(--tx))', borderRight: '2px solid hsl(var(--tx))' }}>
            <div style={{ fontFamily: jersey, fontSize: 56, lineHeight: 1 }}>VS</div>
            {rondas}
            {resultado?.ganador === 'empate' && fase === 'choque' && <span style={{ fontFamily: jersey, fontSize: 28 }}>¡empate!</span>}
          </div>
          {mitad('b')}
        </div>
        <div style={{ padding: '12px 0', borderTop: '2px solid hsl(var(--tx))' }}><CirculoVentajas activo={ventajaActiva} size={30} /></div>
        {fase === 'fin' && final && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--bg) / 0.86)' }}>{final}</div>
        )}
        {traspaso}
      </div>
    )
  }

  // ── Vertical (arena de prueba en AreaTrabajo) ──────────────────────────────
  // Arriba la mano de la CPU (compacta: poder, color y rareza), en el medio
  // las dos cartas que pelean, abajo tu mano. El foco está en el medio.
  return (
    <div className="flex flex-col gap-3" style={{ position: 'relative' }}>
      <div className="flex items-center justify-center gap-4" style={{ fontFamily: jersey, lineHeight: 1 }}>
        <span style={{ fontSize: 26, textAlign: 'right', flex: 1 }}>{a.nombre.toUpperCase()}</span>
        <span className={pop === 'a' ? 'arena-pop' : undefined} style={{ fontSize: 44, display: 'inline-block' }}>{estado.puntosA}</span>
        <span className="flex flex-col items-center gap-1.5">
          <span style={{ fontSize: 18, color: 'hsl(var(--tx3))' }}>VS</span>
          {rondas}
        </span>
        <span className={pop === 'b' ? 'arena-pop' : undefined} style={{ fontSize: 44, display: 'inline-block' }}>{estado.puntosB}</span>
        <span style={{ fontSize: 26, flex: 1 }}>{b.nombre.toUpperCase()}</span>
      </div>

      {fase === 'fin' && final ? final : (
        <>
          {mano('b')}
          <div className="flex flex-wrap items-start justify-center gap-8" style={{ padding: '6px 0' }}>
            {centro('a')}
            <div className="flex flex-col items-center justify-center gap-2" style={{ minHeight: 224 }}>
              {resultado?.ganador === 'empate' && fase === 'choque' ? <span style={{ fontFamily: jersey, fontSize: 24 }}>¡empate!</span> : <CirculoVentajas activo={ventajaActiva} size={18} />}
            </div>
            {centro('b')}
          </div>
          {mano('a')}
        </>
      )}
      {traspaso}
    </div>
  )
}
