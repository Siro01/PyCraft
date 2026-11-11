'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { getSqlJs } from '@/lib/game/executor/sql-runner'
import { sfx } from '@/lib/game/architect/sound'
import { CONSULTAS_NUMEROS, sqlDeFoto, type MazoMuestra } from '@/lib/game/cartas/muestra'
import { REGLAS, filaDeCarta, leerColor } from '@/lib/game/cartas/reglas'
import CartaPixel, { IconoColor } from '@/components/game/area/CartaPixel'
import CartaVolteo from '@/components/game/area/CartaVolteo'

// ─── Presentación: los mazos de a uno ───────────────────────────────────────
// Título, lema y alias con la banda del equipo; las 6 cartas entran en abanico
// y se dan vuelta de a una. Abajo, alternando: "Así lo programé" (lo que
// dibuja su carta()) y "Mi mazo en números" (SQL de verdad sobre su mazo).
// Se lee desde 3 metros: todo crece con el ancho de la pantalla, y el abanico
// reserva su alto (cartas giradas incluidas) para no tapar el panel de abajo,
// y las cartas no se solapan (se taparían las insignias de poder).

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-text), monospace'
const mono = 'var(--font-mono), monospace'

const SEG_POR_MAZO = 15_000

interface Numeros { total: number; rareza: [string, number][]; color: [string, number][] }

async function calcularNumeros(m: MazoMuestra): Promise<Numeros | null> {
  try {
    const SQL = await getSqlJs()
    const db = new SQL.Database()
    db.run(sqlDeFoto(m.foto))
    const total = Number(db.exec(CONSULTAS_NUMEROS.total)[0]?.values[0]?.[0] ?? 0)
    const rareza = (db.exec(CONSULTAS_NUMEROS.rareza)[0]?.values ?? []).map((v) => [String(v[0]), Number(v[1])] as [string, number])
    const color = (db.exec(CONSULTAS_NUMEROS.color)[0]?.values ?? []).map((v) => [String(v[0]), Number(v[1])] as [string, number])
    db.close()
    return { total, rareza, color }
  } catch {
    return null
  }
}

function Barras({ datos, icono }: { datos: [string, number][]; icono?: boolean }) {
  const max = Math.max(1, ...datos.map((d) => d[1]))
  return (
    <div className="flex flex-col gap-2">
      {datos.map(([k, n]) => (
        <div key={k} className="flex items-center gap-3" style={{ fontFamily: vt, fontSize: 26, lineHeight: 1 }}>
          <span className="flex items-center gap-2" style={{ width: 150 }}>{icono && <IconoColor color={leerColor(k)} size={24} />}{k}</span>
          <span className="sys-meter" style={{ width: 220, height: 20, color: 'hsl(var(--tx))' }}><span style={{ width: `calc(${(100 * n) / max}% - 2px)` }} /></span>
          <span style={{ fontFamily: jersey, fontSize: 32, lineHeight: 1 }}>{n}</span>
        </div>
      ))}
    </div>
  )
}

/** Ancho de las cartas del abanico: crece con la pantalla (160 px a 1440, 200 px a 1920). */
function useAnchoAbanico() {
  const [w, setW] = useState(160)
  useEffect(() => {
    const calc = () => setW(Math.max(110, Math.min(210, Math.floor(window.innerWidth / 9))))
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return w
}

export interface PresentacionProps {
  mazos: MazoMuestra[]
  temaDe: (m: MazoMuestra) => CSSProperties
  /** Cuántos mazos mostrar antes de avisar que terminó (modo atracción). */
  limite?: number
  onFin?: () => void
}

export default function Presentacion({ mazos, temaDe, limite, onFin }: PresentacionProps) {
  const [i, setI] = useState(0)
  const [abajo, setAbajo] = useState<'codigo' | 'numeros'>('codigo')
  const [numeros, setNumeros] = useState<Numeros | null>(null)
  const [vistos, setVistos] = useState(0)
  // Las cartas se dan vuelta de a una, después de entrar en abanico.
  const [dadas, setDadas] = useState(0)
  const ancho = useAnchoAbanico()
  const m = mazos[i % mazos.length]

  // Avanza solo cada 15 s; a los 7,5 s cambia el panel de abajo.
  useEffect(() => {
    setAbajo('codigo')
    const t1 = setTimeout(() => setAbajo('numeros'), SEG_POR_MAZO / 2)
    const t2 = setTimeout(() => siguiente(1), SEG_POR_MAZO)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDadas(0)
    const ts = Array.from({ length: 6 }, (_, k) => setTimeout(() => setDadas(k + 1), 1100 + k * 420))
    return () => ts.forEach(clearTimeout)
  }, [i])

  useEffect(() => { let vivo = true; setNumeros(null); calcularNumeros(m).then((n) => { if (vivo) setNumeros(n) }); return () => { vivo = false } }, [m])

  const siguiente = (d: number) => {
    const v = vistos + 1
    if (limite && v >= limite) { onFin?.(); return }
    setVistos(v)
    sfx.pageFlip()
    setI((x) => (x + d + mazos.length) % mazos.length)
  }

  // Flechas del teclado para pasar a mano.
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') siguiente(1); if (e.key === 'ArrowLeft') siguiente(-1) }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  // Lo que se muestra en "Así lo programé": el texto de su carta destacada (o de la primera).
  const idCodigo = m.destacada ?? m.cartas[0]?.id
  const texto = (idCodigo !== undefined && m.foto.textos_carta?.[String(idCodigo)]) || Object.values(m.foto.textos_carta ?? {})[0] || null
  const disenos = m.foto.disenos
  const n = m.cartas.length

  return (
    <div className="muestra-fade flex flex-col items-center gap-6" key={i} style={{ padding: '0 16px' }}>
      {/* Banda del equipo + título */}
      <div style={{ ...temaDe(m), background: 'hsl(var(--bg))', color: 'hsl(var(--tx))', border: '3px solid hsl(var(--tx))', boxShadow: '6px 6px 0 hsl(var(--tx) / 0.3)', padding: '12px 32px', textAlign: 'center', minWidth: 'min(820px, 100%)' }}>
        <div className="label-mono" style={{ fontSize: 18, letterSpacing: '0.24em' }}>{m.equipo}</div>
        <div style={{ fontFamily: jersey, fontSize: 'clamp(40px, 5.4vw, 88px)', lineHeight: 1 }}>{m.titulo}</div>
        {m.foto.lema && <div style={{ fontFamily: vt, fontSize: 'clamp(22px, 2vw, 32px)', color: 'hsl(var(--tx2))' }}>“{m.foto.lema}”</div>}
        <div style={{ fontFamily: jersey, fontSize: 'clamp(26px, 2.4vw, 40px)', marginTop: 4 }}>{m.alias}</div>
      </div>

      {/* Abanico: entran de a una y se dan vuelta. El alto reserva lo que ocupan girados. */}
      <div className="flex justify-center" style={{ height: Math.round(ancho * 1.4 + ancho * 0.5), alignItems: 'flex-start', paddingTop: Math.round(ancho * 0.16) }}>
        {m.cartas.map((c, k) => {
          const giro = (k - (n - 1) / 2) * 7
          const sube = Math.abs(k - (n - 1) / 2) * Math.round(ancho / 12)
          return (
            <div key={c.id} className="abanico-carta" style={{ ['--retraso' as string]: `${k * 140}ms`, transform: `rotate(${giro}deg) translateY(${sube}px)`, margin: `0 ${Math.round(ancho * 0.02)}px`, position: 'relative' } as CSSProperties}>
              <CartaVolteo
                frente={<CartaPixel fila={filaDeCarta(c)} arte={disenos.frente[String(c.id)] ?? null} ancho={ancho} />}
                reverso={disenos.reverso}
                volteo={disenos.volteo}
                ancho={ancho}
                revelada={k < dadas}
              />
              {m.destacada === c.id && <span aria-label="Carta destacada" style={{ position: 'absolute', top: -34, left: '50%', transform: 'translateX(-50%)', fontFamily: jersey, fontSize: 40, lineHeight: 1 }}>★</span>}
            </div>
          )
        })}
      </div>

      {/* Abajo: alterna código y números */}
      <div style={{ minHeight: 200, display: 'flex', justifyContent: 'center' }}>
        {abajo === 'codigo' || !numeros ? (
          texto ? (
            <div className="muestra-fade flex flex-col items-center gap-2">
              <span className="label-mono" style={{ fontSize: 16 }}>así lo programé</span>
              <pre style={{ margin: 0, padding: '14px 20px', border: '3px solid hsl(var(--tx))', fontFamily: mono, fontSize: 'clamp(16px, 1.4vw, 24px)', lineHeight: 1.3, maxWidth: 'min(900px, 92vw)', overflow: 'hidden' }}>{texto}</pre>
            </div>
          ) : null
        ) : (
          <div className="muestra-fade flex flex-wrap items-start justify-center gap-16">
            <div className="flex flex-col items-center gap-2">
              <span className="label-mono" style={{ fontSize: 16 }}>poder total</span>
              <span style={{ fontFamily: jersey, fontSize: 96, lineHeight: 0.9 }}>{numeros.total}<span style={{ fontSize: 40, color: 'hsl(var(--tx3))' }}>/{REGLAS.presupuesto}</span></span>
              <code style={{ fontFamily: mono, fontSize: 14, color: 'hsl(var(--tx3))' }}>{CONSULTAS_NUMEROS.total}</code>
            </div>
            <div className="flex flex-col gap-2">
              <span className="label-mono" style={{ fontSize: 16 }}>por color</span>
              <Barras datos={numeros.color} icono />
              <code style={{ fontFamily: mono, fontSize: 14, color: 'hsl(var(--tx3))' }}>{CONSULTAS_NUMEROS.color}</code>
            </div>
          </div>
        )}
      </div>

      {/* Pasar a mano (también con las flechas): chico, es para quien atiende el stand */}
      <div className="flex gap-2" style={{ opacity: 0.6 }}>
        <button type="button" className="sys-tool" aria-label="Mazo anterior" onClick={() => siguiente(-1)}>◀</button>
        <span style={{ fontFamily: jersey, fontSize: 18, alignSelf: 'center' }}>{(i % mazos.length) + 1}/{mazos.length}</span>
        <button type="button" className="sys-tool" aria-label="Mazo siguiente" onClick={() => siguiente(1)}>▶</button>
      </div>
    </div>
  )
}
