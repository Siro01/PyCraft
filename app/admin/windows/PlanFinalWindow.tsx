'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { sfx } from '@/lib/game/architect/sound'
import { PixelBitmap, ICON_CHECK } from '@/components/game/architect/desktop/PixelBitmap'
import { PLAN_FINAL, fechaCorta, paginaDeHoy, type CodigoPlan } from '@/lib/game/cartas/plan-final'

// PLAN_FINAL.TXT: la guía del proyecto final, una página por clase. A la
// izquierda las clases con sus fechas (la próxima marcada); a la derecha la
// página: qué proyectar, qué hace el aula, qué tiene que quedar hecho y qué
// decir si se traban. Abre sola en la próxima clase.

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-text), monospace'
const mono = 'var(--font-mono), monospace'

const fechas = (m: string, t: string) => (m === t ? fechaCorta(m) : `Mañana ${fechaCorta(m)} · Tarde ${fechaCorta(t)}`)

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="label-mono" style={{ color: 'hsl(var(--tx))', marginBottom: 8 }}>{titulo}</h3>
      {children}
    </div>
  )
}

function Codigo({ c }: { c: CodigoPlan }) {
  const [copiado, setCopiado] = useState(false)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(c.codigo)
      sfx.confirm()
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    } catch { /* sin portapapeles: se selecciona a mano */ }
  }
  return (
    <figure style={{ margin: 0 }}>
      {c.nota && <figcaption className="sys-sub" style={{ marginBottom: 6 }}>&gt; {c.nota}</figcaption>}
      <div style={{ position: 'relative', border: '2px solid hsl(var(--border2))', background: 'hsl(var(--surface))' }}>
        <span className="label-mono" style={{ position: 'absolute', top: 6, right: 8, color: 'hsl(var(--tx3))' }}>{c.lang === 'sql' ? 'SQL' : 'PYTHON'}</span>
        <pre style={{ margin: 0, padding: '12px 14px', fontFamily: mono, fontSize: 14, lineHeight: 1.45, color: 'hsl(var(--tx))', whiteSpace: 'pre', overflowX: 'auto' }}>{c.codigo}</pre>
      </div>
      <button type="button" className="sys-tool" style={{ marginTop: 6 }} onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar'}</button>
    </figure>
  )
}

export default function PlanFinalWindow({ narrow }: { narrow: boolean }) {
  const hoy = paginaDeHoy()
  const [sel, setSel] = useState<number>(hoy)
  const [verLista, setVerLista] = useState(false)
  const p = PLAN_FINAL[sel]

  // Al cambiar de clase, la página arranca desde arriba (la ventana entera
  // scrollea: se busca el contenedor que tiene el scroll).
  const paneRef = useRef<HTMLElement>(null)
  const primera = useRef(true)
  useEffect(() => {
    if (primera.current) { primera.current = false; return }
    let el: HTMLElement | null = paneRef.current?.parentElement ?? null
    while (el && !(el.scrollHeight > el.clientHeight && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement
    if (el) el.scrollTop = 0
  }, [sel, verLista])

  const ir = (i: number) => {
    if (i < 0 || i >= PLAN_FINAL.length) return
    sfx.click()
    setSel(i)
    setVerLista(false)
  }

  const lista = (
    <div role="listbox" aria-label="Clases del proyecto final" style={narrow ? undefined : { position: 'sticky', top: 0 }}>
      <div className="sys-row sys-row--head" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }} aria-hidden>
        <span className="label-mono">Clase</span>
        <span className="label-mono">Fecha</span>
      </div>
      {PLAN_FINAL.map((x, i) => (
        <button
          key={x.id}
          type="button"
          role="option"
          aria-selected={i === sel}
          className="sys-row"
          style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}
          onClick={() => ir(i)}
        >
          <span className="min-w-0">
            <span className="block truncate" style={{ fontFamily: jersey, fontSize: 18, lineHeight: 1 }}>
              {x.etiqueta}{i === hoy && <span className="label-mono" style={{ marginLeft: 8 }}>· próxima</span>}
            </span>
            <span className="block truncate sys-sub">{x.titulo}</span>
          </span>
          <span className="sys-sub tabular" style={{ textAlign: 'right' }}>
            {x.manana === x.tarde ? fechaCorta(x.manana) : <>{fechaCorta(x.manana)}<br />{fechaCorta(x.tarde)}</>}
          </span>
        </button>
      ))}
    </div>
  )

  const pagina = (
    <section ref={paneRef} className="sys-pane" aria-label={`${p.etiqueta}: ${p.titulo}`} style={{ position: 'static' }}>
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="label-mono">{p.etiqueta} · {p.donde.join(' + ')}</div>
          <h2 style={{ fontFamily: jersey, fontSize: 28, lineHeight: 1, color: 'hsl(var(--tx))', margin: '4px 0 6px' }}>{p.titulo}</h2>
          <div className="sys-sub">{fechas(p.manana, p.tarde)} · {p.tiempo}</div>
        </div>
        <div className="flex gap-2 shrink-0">
          {narrow && <button type="button" className="sys-tool" onClick={() => { sfx.click(); setVerLista(true) }}>Clases</button>}
          <button type="button" className="sys-tool" aria-label="Clase anterior" disabled={sel === 0} onClick={() => ir(sel - 1)}>‹</button>
          <button type="button" className="sys-tool" aria-label="Clase siguiente" disabled={sel === PLAN_FINAL.length - 1} onClick={() => ir(sel + 1)}>›</button>
        </div>
      </header>

      {p.aviso && (
        <p style={{ fontFamily: vt, fontSize: 18, lineHeight: 1.2, margin: 0, padding: '8px 12px', border: '2px dashed hsl(var(--tx))', color: 'hsl(var(--tx))' }}>
          ! {p.aviso}
        </p>
      )}

      <Bloque titulo="Objetivo">
        <p style={{ fontFamily: vt, fontSize: 20, lineHeight: 1.2, margin: 0, color: 'hsl(var(--tx))' }}>{p.objetivo}</p>
      </Bloque>

      {p.proyectar.length > 0 && (
        <Bloque titulo="Proyectar · mazo de ejemplo «Robots de Chatarra»">
          <div className="flex flex-col gap-4">
            {p.proyectar.map((c, i) => <Codigo key={i} c={c} />)}
          </div>
        </Bloque>
      )}

      <Bloque titulo="El aula hace">
        <ol style={{ margin: 0, paddingLeft: 26, listStyle: 'decimal', fontFamily: vt, fontSize: 18, lineHeight: 1.25, color: 'hsl(var(--tx))' }}>
          {p.pasos.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
        </ol>
      </Bloque>

      <Bloque titulo="Tiene que quedar hecho">
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontFamily: vt, fontSize: 18, lineHeight: 1.2, color: 'hsl(var(--tx))' }}>
          {p.quedaHecho.map((x, i) => (
            <li key={i} className="flex items-start gap-2" style={{ marginBottom: 4 }}>
              <span style={{ marginTop: 3 }}><PixelBitmap rows={ICON_CHECK} scale={2} /></span>{x}
            </li>
          ))}
        </ul>
      </Bloque>

      <Bloque titulo="Si se traban">
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontFamily: vt, fontSize: 18, lineHeight: 1.2, color: 'hsl(var(--tx2))' }}>
          {p.siSeTraban.map((x, i) => <li key={i} style={{ marginBottom: 4 }}><span style={{ color: 'hsl(var(--accent))' }}>&gt; </span>{x}</li>)}
        </ul>
      </Bloque>

      {(p.siTerminan || p.enElPanel) && (
        <div className="flex flex-wrap gap-6">
          {p.siTerminan && (
            <div className="min-w-0" style={{ flex: '1 1 240px' }}>
              <Bloque titulo="Si terminan antes · ⭐">
                <p style={{ fontFamily: vt, fontSize: 18, lineHeight: 1.2, margin: 0, color: 'hsl(var(--tx))' }}>{p.siTerminan}</p>
              </Bloque>
            </div>
          )}
          {p.enElPanel && (
            <div className="min-w-0" style={{ flex: '1 1 240px' }}>
              <Bloque titulo="Mirá en el panel">
                <p style={{ fontFamily: vt, fontSize: 18, lineHeight: 1.2, margin: 0, color: 'hsl(var(--tx))' }}>{p.enElPanel}</p>
              </Bloque>
            </div>
          )}
        </div>
      )}
    </section>
  )

  if (narrow) return verLista ? lista : pagina

  return (
    <div className="sys-split" data-ficha="" style={{ gridTemplateColumns: 'minmax(220px, 0.55fr) minmax(460px, 1.45fr)' }}>
      {lista}
      {pagina}
    </div>
  )
}
