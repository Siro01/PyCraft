'use client'

import { useRef, useState, type ReactNode } from 'react'
import { sfx } from '@/lib/game/architect/sound'
import {
  ESTILOS_VOLTEO, FRENTE, PALETA, RAMPAS, REVERSO, colorDe, colorHex, estaVacio, vacio,
  type DisenosMazo, type Espejo, type VelocidadVolteo,
} from '@/lib/game/cartas/paleta'
import { PLANTILLAS_FRENTE, PLANTILLAS_REVERSO } from '@/lib/game/cartas/plantillas-arte'
import type { Fila } from '@/lib/game/cartas/reglas'
import { PixelBitmap, type Bitmap } from '@/components/game/architect/desktop/PixelBitmap'
import EditorPixel, { type Herramienta } from './EditorPixel'
import {
  ICON_BALDE, ICON_DESHACER, ICON_ESPEJO_4, ICON_ESPEJO_H, ICON_ESPEJO_V, ICON_GOMA, ICON_GOTERO, ICON_LAPIZ, ICON_LUZ,
  ICON_SIN_ESPEJO, ICON_SOMBRA, ICON_TACHO,
} from './iconos'
import PixelArte from './PixelArte'
import CartaPixel from './CartaPixel'
import CartaVolteo from './CartaVolteo'

// ─── DISEÑO: frente, dorso y volteo de las cartas ───────────────────────────
// Es expresión, no tarea: no hay validación obligatoria y no cambia nada en la
// pelea. Todo con la paleta PyCraft (sus colores y sus sombras). Herramientas
// y espejo son íconos pixel (el nombre va en el title); la paleta es una
// grilla de 10 colores × 3 tonos (luz, base, sombra), sin nombres a la vista.

const vt = 'var(--font-text), monospace'

type Parte = 'frente' | 'dorso' | 'volteo'

const HERRAMIENTAS: { id: Herramienta; nombre: string; ayuda: string; icono: Bitmap }[] = [
  { id: 'lapiz', nombre: 'Lápiz', ayuda: 'Pinta con el color elegido', icono: ICON_LAPIZ },
  { id: 'goma', nombre: 'Goma', ayuda: 'Borra (también con clic derecho)', icono: ICON_GOMA },
  { id: 'balde', nombre: 'Balde', ayuda: 'Rellena una zona del mismo color', icono: ICON_BALDE },
  { id: 'gotero', nombre: 'Gotero', ayuda: 'Toma un color del dibujo', icono: ICON_GOTERO },
  { id: 'sombra', nombre: 'Sombra', ayuda: 'Oscurece un tono el color que tocás', icono: ICON_SOMBRA },
  { id: 'luz', nombre: 'Luz', ayuda: 'Aclara un tono el color que tocás', icono: ICON_LUZ },
]

const ESPEJOS: { id: Espejo; nombre: string; icono: Bitmap }[] = [
  { id: 'ninguno', nombre: 'Sin espejo', icono: ICON_SIN_ESPEJO },
  { id: 'horizontal', nombre: 'Espejo izquierda ↔ derecha', icono: ICON_ESPEJO_H },
  { id: 'vertical', nombre: 'Espejo arriba ↕ abajo', icono: ICON_ESPEJO_V },
  { id: 'cuatro', nombre: 'Espejo en 4 lados', icono: ICON_ESPEJO_4 },
]

/** Botón chico con un ícono pixel; el nombre va en el title y el aria-label. */
function BotonIcono({ icono, nombre, activo, onClick }: { icono: Bitmap; nombre: string; activo?: boolean; onClick: () => void }) {
  return (
    <button type="button" className="sys-tool sys-tool--icono" aria-pressed={activo} aria-label={nombre} title={nombre} onClick={onClick} style={{ minWidth: 38, minHeight: 36 }}>
      <PixelBitmap rows={icono} scale={2} ink="currentColor" />
    </button>
  )
}

const VELOCIDADES: { id: VelocidadVolteo; nombre: string }[] = [
  { id: 'lenta', nombre: 'Lenta' }, { id: 'normal', nombre: 'Normal' }, { id: 'rapida', nombre: 'Rápida' },
]

function Fila_({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-mono">{titulo}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}

function Muestra({ hex, activo, onClick, titulo, size = 20 }: { hex: string | null; activo: boolean; onClick: () => void; titulo: string; size?: number }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={activo}
      onClick={onClick}
      style={{
        width: size, height: size, padding: 0, cursor: 'pointer',
        background: hex ?? 'transparent',
        border: activo ? '3px solid hsl(var(--accent))' : '2px solid hsl(var(--tx))',
        outline: activo ? '1px solid hsl(var(--bg))' : 'none',
      }}
    />
  )
}

export interface PanelDisenoProps {
  /** La carta que está en la mesa (su id y su fila). */
  cartaId: string | null
  fila: Fila | null
  disenos: DisenosMazo
  onCambiar: (f: (d: DisenosMazo) => DisenosMazo) => void
  angosto: boolean
}

export default function PanelDiseno({ cartaId, fila, disenos, onCambiar, angosto }: PanelDisenoProps) {
  const [parte, setParte] = useState<Parte>('frente')
  const [color, setColor] = useState(colorDe('carmesi', 1))
  const [herramienta, setHerramienta] = useState<Herramienta>('lapiz')
  const [espejoFrente, setEspejoFrente] = useState<Espejo>('horizontal')
  const [espejoDorso, setEspejoDorso] = useState<Espejo>('cuatro')
  const [repetir, setRepetir] = useState(0)
  const historial = useRef(new Map<string, string[]>())

  const arte = cartaId ? disenos.frente[cartaId] ?? null : null
  const frente = arte?.p ?? vacio(FRENTE.w, FRENTE.h)
  const dorso = disenos.reverso ?? vacio(REVERSO.w, REVERSO.h)
  const clave = parte === 'frente' ? `f:${cartaId}` : 'dorso'

  const guardarPaso = () => {
    const pila = historial.current.get(clave) ?? []
    pila.push(parte === 'frente' ? frente : dorso)
    if (pila.length > 40) pila.shift()
    historial.current.set(clave, pila)
  }

  const setFrente = (p: string) => {
    if (!cartaId) return
    onCambiar((d) => ({ ...d, frente: { ...d.frente, [cartaId]: { p, liso: d.frente[cartaId]?.liso ?? false } } }))
  }
  const setDorso = (p: string | null) => onCambiar((d) => ({ ...d, reverso: p && !estaVacio(p) ? p : null }))
  const set = (p: string) => (parte === 'frente' ? setFrente(p) : setDorso(p))

  const deshacer = () => {
    const pila = historial.current.get(clave)
    const prev = pila?.pop()
    if (prev === undefined) return
    sfx.click()
    set(prev)
  }

  const elegirColor = (id: string) => { sfx.click(); setColor(id); if (herramienta === 'goma' || herramienta === 'gotero') setHerramienta('lapiz') }
  const hexActual = PALETA.find((c) => c.id === color)?.hex ?? null

  const herramientas = (espejo: Espejo, setEspejo: (e: Espejo) => void) => (
    <div className="flex flex-col gap-3" style={{ flex: '1 1 240px', minWidth: 0, maxWidth: 300 }}>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Herramienta">
        {HERRAMIENTAS.map((t) => (
          <BotonIcono key={t.id} icono={t.icono} nombre={`${t.nombre}: ${t.ayuda}`} activo={herramienta === t.id}
            onClick={() => { sfx.click(); setHerramienta(t.id) }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Espejo">
        {ESPEJOS.map((e) => (
          <BotonIcono key={e.id} icono={e.icono} nombre={e.nombre} activo={espejo === e.id} onClick={() => { sfx.click(); setEspejo(e.id) }} />
        ))}
      </div>
      {/* Paleta: una columna por color, de arriba abajo luz → base → sombra */}
      <div className="flex items-start gap-2" role="group" aria-label="Paleta PyCraft">
        <span aria-label="Color elegido" title="Color elegido" style={{ width: 34, height: 34, flexShrink: 0, border: '2px solid hsl(var(--tx))', background: hexActual ?? 'transparent', boxShadow: '3px 3px 0 hsl(var(--tx) / 0.14)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${RAMPAS.length}, 20px)`, gap: 2 }}>
          {[2, 1, 0].flatMap((nivel) => RAMPAS.map((r) => {
            const c = PALETA.find((x) => x.rampa === r.id && x.nivel === nivel)
            return c ? <Muestra key={c.id} hex={c.hex} activo={color === c.id} titulo={`${r.nombre} ${c.nivel + 1}`} onClick={() => elegirColor(c.id)} /> : <span key={`${r.id}-${nivel}`} />
          }))}
        </div>
      </div>
    </div>
  )

  const editor = (w: number, h: number, valor: string, espejo: Espejo, celda: number, etiqueta: string) => (
    <EditorPixel
      w={w} h={h} valor={valor} color={color} herramienta={herramienta} espejo={espejo} celda={celda}
      onCambio={set}
      onTrazo={guardarPaso}
      onGotero={(c) => { setColor(c); setHerramienta('lapiz'); sfx.click() }}
      etiqueta={etiqueta}
    />
  )

  const miniaturas = (lista: typeof PLANTILLAS_FRENTE, w: number, h: number) => (
    <Fila_ titulo="Plantillas">
      {lista.map((t) => (
        <button key={t.id} type="button" title={t.nombre} aria-label={`Usar la plantilla ${t.nombre}`}
          onClick={() => { guardarPaso(); sfx.confirm(); set(t.p) }}
          style={{ width: w === h ? 36 : 30, height: w === h ? 36 : 41, padding: 2, border: '2px solid hsl(var(--tx))', background: 'hsl(var(--surface))', cursor: 'pointer' }}>
          <PixelArte p={t.p} w={w} h={h} ajuste={w === h ? 'meet' : 'none'} />
        </button>
      ))}
    </Fila_>
  )

  const acciones = (
    <div className="flex flex-wrap gap-1.5">
      <BotonIcono icono={ICON_DESHACER} nombre="Deshacer" onClick={deshacer} />
      <BotonIcono icono={ICON_TACHO} nombre="Borrar todo" onClick={() => { guardarPaso(); sfx.trash(); set(vacio(parte === 'frente' ? FRENTE.w : REVERSO.w, parte === 'frente' ? FRENTE.h : REVERSO.h)) }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2" role="group" aria-label="Qué diseñás">
        {(['frente', 'dorso', 'volteo'] as const).map((p) => (
          <button key={p} type="button" className="sys-tool" aria-pressed={parte === p} onClick={() => { sfx.tab(); setParte(p) }}
            title={p === 'frente' ? 'El dibujo de la carta que está en la mesa' : p === 'dorso' ? 'Igual para las 6 cartas: lo que ve el rival antes de que la des vuelta' : 'Cómo se da vuelta tu carta en la arena'}>
            {p === 'frente' ? 'Frente' : p === 'dorso' ? 'Dorso' : 'Volteo'}
          </button>
        ))}
      </div>

      {parte === 'frente' && (
        !cartaId || !fila ? (
          <p style={{ fontFamily: vt, fontSize: 18, margin: 0 }}>Elegí en la mesa una carta que ya exista para dibujar su frente.</p>
        ) : (
          <>
            <div className={angosto ? 'flex flex-col gap-3' : 'flex flex-wrap gap-4 items-start'}>
              <div className="flex flex-col gap-2">
                {editor(FRENTE.w, FRENTE.h, frente, espejoFrente, 18, `Frente de ${String(fila.nombre ?? 'la carta')}`)}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {acciones}
                  <label className="flex items-center gap-1.5" style={{ fontFamily: vt, fontSize: 17 }} title="Fondo liso detrás del dibujo, en vez de la trama de su color">
                    <input type="checkbox" checked={!!arte?.liso}
                      onChange={(e) => onCambiar((d) => ({ ...d, frente: { ...d.frente, [cartaId]: { p: frente, liso: e.target.checked } } }))} />
                    fondo liso
                  </label>
                </div>
              </div>
              {herramientas(espejoFrente, setEspejoFrente)}
            </div>
            {miniaturas(PLANTILLAS_FRENTE, FRENTE.w, FRENTE.h)}
          </>
        )
      )}

      {parte === 'dorso' && (
        <>
          <div className={angosto ? 'flex flex-col gap-3' : 'flex flex-wrap gap-4 items-start'}>
            <div className="flex flex-col gap-2">
              {editor(REVERSO.w, REVERSO.h, dorso, espejoDorso, 15, 'Dorso del mazo')}
              <div className="flex flex-wrap items-center gap-2">
                {acciones}
                {disenos.reverso && (
                  <button type="button" className="sys-tool" title="Volver al dorso de PyCraft" onClick={() => { guardarPaso(); sfx.click(); setDorso(null) }}>dorso PyCraft</button>
                )}
              </div>
            </div>
            {herramientas(espejoDorso, setEspejoDorso)}
          </div>
          {miniaturas(PLANTILLAS_REVERSO, REVERSO.w, REVERSO.h)}
        </>
      )}

      {parte === 'volteo' && (
        <>
          <div className={angosto ? 'flex flex-col gap-4' : 'flex flex-wrap gap-6 items-start'}>
            <div className="flex flex-col items-center gap-2">
              <CartaVolteo
                frente={<CartaPixel fila={fila} arte={arte} tamano="normal" />}
                reverso={disenos.reverso}
                volteo={disenos.volteo}
                revelada={repetir > 0}
                repetir={repetir}
              />
              <button type="button" className="cta-btn cta-btn--primary" style={{ marginTop: 6 }} onClick={() => { sfx.select(); setRepetir((n) => n + 1) }}>▶ Probar</button>
            </div>
            <div className="flex flex-col gap-3" style={{ flex: '1 1 250px', minWidth: 250 }}>
              <Fila_ titulo="Estilo">
                {ESTILOS_VOLTEO.map((e) => (
                  <button key={e.id} type="button" className="sys-tool" aria-pressed={disenos.volteo.estilo === e.id} title={e.detalle}
                    onClick={() => { sfx.click(); onCambiar((d) => ({ ...d, volteo: { ...d.volteo, estilo: e.id } })); setRepetir((n) => n + 1) }}>{e.nombre}</button>
                ))}
              </Fila_>
              <Fila_ titulo="Velocidad">
                {VELOCIDADES.map((v) => (
                  <button key={v.id} type="button" className="sys-tool" aria-pressed={disenos.volteo.velocidad === v.id}
                    onClick={() => { sfx.click(); onCambiar((d) => ({ ...d, volteo: { ...d.volteo, velocidad: v.id } })); setRepetir((n) => n + 1) }}>{v.nombre}</button>
                ))}
              </Fila_>
              <div className="flex flex-col gap-1.5">
                <span className="label-mono">Chispas</span>
                <div className="flex flex-wrap items-center gap-1" style={{ maxWidth: 260 }}>
                  <button type="button" className="sys-tool" aria-pressed={disenos.volteo.chispa === null}
                    aria-label="Sin chispas" title="Sin chispas"
                    onClick={() => { sfx.click(); onCambiar((d) => ({ ...d, volteo: { ...d.volteo, chispa: null } })) }}>no</button>
                  {RAMPAS.filter((r) => r.id !== 'tinta' && r.id !== 'noche').map((r) => {
                    const id = colorDe(r.id, 2)
                    return <Muestra key={r.id} size={26} hex={colorHex(id)} activo={disenos.volteo.chispa === id} titulo={`Chispas ${r.nombre}`}
                      onClick={() => { sfx.click(); onCambiar((d) => ({ ...d, volteo: { ...d.volteo, chispa: id } })); setRepetir((n) => n + 1) }} />
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
