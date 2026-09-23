'use client'

// ─────────────────────────────────────────────────────────────────────────
// VARIANTE B — Explorador de Archivos Retro
// Rediseño de "Cómo funciona" como una ventana de explorador tipo
// Mac System 7 / Windows 3.1. Tres carpetas en una grilla de íconos,
// click para abrir sub-ventana con la info de cada fase.
//
// PÁGINA DE PRUEBA — no forma parte del sitio (no está linkeada).
// ─────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import { IconSnake, IconDatabase, IconSword } from '@/components/ui/PixelIcons'

// ── Data ─────────────────────────────────────────────────────────────────
const FOLDERS = [
  {
    id: 'python',
    step: '01',
    title: 'Aprendés Python',
    label: 'Python.exe',
    color: 'hsl(var(--python))',
    Icon: IconSnake,
    desc: 'Variables, condicionales, bucles, listas y funciones. El arsenal base para el combate contra los primeros 6 jefes.',
  },
  {
    id: 'sqlite',
    step: '02',
    title: 'Aprendés SQLite',
    label: 'SQLite.db',
    color: 'hsl(var(--sql))',
    Icon: IconDatabase,
    desc: 'CREATE, SELECT, WHERE, GROUP BY, UPDATE, DELETE. La base de datos al servicio del código. Jefes 7 al 10.',
  },
  {
    id: 'integracion',
    step: '03',
    title: 'Integrás y derrotás',
    label: 'BossRush.py',
    color: 'hsl(var(--accent))',
    Icon: IconSword,
    desc: 'Python + sqlite3 combinados. Proyectos reales: sistema de inventario, búsqueda, actualización. Jefes 11 al 14.',
  },
] as const

// ── Pixel-art folder icon (SVG) ─────────────────────────────────────────
function FolderIcon({ color, size = 40 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ imageRendering: 'pixelated', display: 'block' }}
      aria-hidden="true"
    >
      {/* Tab */}
      <rect x="1" y="2" width="5" height="2" fill={color} />
      {/* Body */}
      <rect x="1" y="4" width="14" height="10" fill={color} />
      {/* Inner highlight */}
      <rect x="2" y="5" width="12" height="1" fill="rgba(255,255,255,0.2)" />
      {/* Shadow bottom */}
      <rect x="1" y="13" width="14" height="1" fill="rgba(0,0,0,0.25)" />
    </svg>
  )
}

// ── Detail window for a folder ──────────────────────────────────────────
function DetailWindow({
  data,
  onClose,
  offset,
}: {
  data: (typeof FOLDERS)[number]
  onClose: () => void
  offset: number
}) {
  const { Icon, step, title, color, desc, label } = data
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  return (
    <div
      className="detail-window"
      style={{
        transform: visible
          ? `translate(${offset * 20}px, ${offset * 18}px) scale(1)`
          : `translate(${offset * 20}px, ${offset * 18 + 20}px) scale(0.92)`,
        opacity: visible ? 1 : 0,
      }}
    >
      {/* Title bar */}
      <div className="win-titlebar">
        <div className="win-titlebar-lines">
          <span /><span /><span /><span /><span />
        </div>
        <div className="win-titlebar-text">{label}</div>
        <div className="win-titlebar-lines">
          <span /><span /><span /><span /><span />
        </div>
        <button
          type="button"
          className="win-close-btn"
          onClick={handleClose}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="win-body">
        <div className="win-header">
          <span className="win-step" style={{ color }}>{step}</span>
          <Icon size={22} color={color} />
        </div>
        <div className="win-title" style={{ color }}>{title}</div>
        <div className="win-separator" />
        <p className="win-desc">{desc}</p>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────
export default function VariantExplorer() {
  const [openFolders, setOpenFolders] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const toggleFolder = (id: string) => {
    if (openFolders.includes(id)) {
      setOpenFolders((prev) => prev.filter((f) => f !== id))
    } else {
      setOpenFolders((prev) => [...prev, id])
    }
  }

  const selectFolder = (id: string) => {
    setSelected(id)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--bg))', color: 'hsl(var(--tx))' }}>
      <style dangerouslySetInnerHTML={{ __html: EXPLORER_CSS }} />

      {/* Preview chrome */}
      <div style={{ padding: '32px 24px 0', maxWidth: 720, margin: '0 auto' }}>
        <div className="label-mono" style={{ marginBottom: 4 }}>VARIANTE B — Explorador de Archivos Retro</div>
        <p className="font-mono" style={{ fontSize: 12, color: 'hsl(var(--tx3))' }}>
          Doble click en una carpeta para abrir la ventana de detalle. Click simple para seleccionar.
          Cada ventana se puede cerrar con la ×.
        </p>
      </div>

      {/* ─── Real section ─── */}
      <section className="py-20" style={{ background: 'hsl(var(--surface))' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div>
            <div className="label-mono mb-2">CÓMO FUNCIONA</div>
            <h2 className="text-3xl font-bold text-tx tracking-wide mb-12">
              Tres fases. Catorce jefes. Un sistema.
            </h2>
          </div>

          {/* Explorer window */}
          <div className="explorer-window">
            {/* Title bar */}
            <div className="explorer-titlebar">
              <div className="explorer-titlebar-lines"><span /><span /><span /><span /><span /></div>
              <div className="explorer-titlebar-text">📁 PyCraft — Fases del Boss Rush</div>
              <div className="explorer-titlebar-lines"><span /><span /><span /><span /><span /></div>
              <div className="explorer-btns">
                <span className="explorer-btn-min" />
                <span className="explorer-btn-max" />
              </div>
            </div>

            {/* Menu bar */}
            <div className="explorer-menubar">
              <span>File</span>
              <span>Edit</span>
              <span>View</span>
              <span>Special</span>
            </div>

            {/* Info bar */}
            <div className="explorer-info">
              <span>3 items</span>
              <span style={{ marginLeft: 'auto' }}>Boss Rush System Disk</span>
            </div>

            {/* File grid */}
            <div className="explorer-grid">
              {FOLDERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`explorer-item ${selected === f.id ? 'is-selected' : ''}`}
                  onClick={() => selectFolder(f.id)}
                  onDoubleClick={() => toggleFolder(f.id)}
                  aria-label={`${f.title} — doble click para abrir`}
                >
                  <FolderIcon color={f.color} size={44} />
                  <span className="explorer-item-label">{f.label}</span>
                </button>
              ))}
            </div>

            {/* Scrollbar decorative */}
            <div className="explorer-scrollbar" aria-hidden="true">
              <div className="explorer-scroll-arrow">▲</div>
              <div className="explorer-scroll-track">
                <div className="explorer-scroll-thumb" />
              </div>
              <div className="explorer-scroll-arrow">▼</div>
            </div>

            {/* Resize grip */}
            <div className="explorer-resize" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" style={{ imageRendering: 'pixelated' }}>
                <rect x="8" y="10" width="2" height="2" fill="hsl(var(--tx3))" />
                <rect x="4" y="10" width="2" height="2" fill="hsl(var(--tx3))" />
                <rect x="8" y="6" width="2" height="2" fill="hsl(var(--tx3))" />
                <rect x="0" y="10" width="2" height="2" fill="hsl(var(--tx3))" />
                <rect x="4" y="6" width="2" height="2" fill="hsl(var(--tx3))" />
                <rect x="8" y="2" width="2" height="2" fill="hsl(var(--tx3))" />
              </svg>
            </div>
          </div>

          {/* Detail windows */}
          <div className="detail-windows-container">
            {openFolders.map((id, i) => {
              const data = FOLDERS.find((f) => f.id === id)
              if (!data) return null
              return (
                <DetailWindow
                  key={id}
                  data={data}
                  onClose={() => setOpenFolders((prev) => prev.filter((f) => f !== id))}
                  offset={i}
                />
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

// ── CSS ──────────────────────────────────────────────────────────────────
const EXPLORER_CSS = `
/* ── Explorer window ─────────────────────────────────────────────────── */
.explorer-window {
  position: relative;
  max-width: 520px;
  margin: 0 auto;
  background: hsl(var(--surface2));
  border: 2px solid hsl(var(--tx3));
  box-shadow: 4px 4px 0 0 hsl(var(--tx) / 0.15);
}

.explorer-titlebar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: hsl(var(--border2));
  border-bottom: 2px solid hsl(var(--tx3));
}
.explorer-titlebar-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.explorer-titlebar-lines span {
  display: block;
  height: 1px;
  background: hsl(var(--tx3));
}
.explorer-titlebar-text {
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  padding: 0 6px;
  color: hsl(var(--tx));
}
.explorer-btns {
  display: flex;
  gap: 4px;
}
.explorer-btn-min,
.explorer-btn-max {
  display: block;
  width: 12px;
  height: 12px;
  border: 1px solid hsl(var(--tx3));
  background: hsl(var(--surface));
}
.explorer-btn-max {
  box-shadow: inset 0 -1px 0 hsl(var(--tx3));
}

.explorer-menubar {
  display: flex;
  gap: 16px;
  padding: 4px 12px;
  font-family: monospace;
  font-size: 11px;
  color: hsl(var(--tx2));
  border-bottom: 1px solid hsl(var(--border2));
}
.explorer-menubar span {
  cursor: pointer;
  transition: color 0.1s;
}
.explorer-menubar span:hover {
  color: hsl(var(--tx));
}

.explorer-info {
  display: flex;
  padding: 4px 12px;
  font-family: monospace;
  font-size: 10px;
  color: hsl(var(--tx3));
  border-bottom: 1px solid hsl(var(--border));
}

/* ── File grid ───────────────────────────────────────────────────────── */
.explorer-grid {
  display: flex;
  justify-content: center;
  gap: 40px;
  padding: 32px 24px 40px;
  min-height: 160px;
}

.explorer-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.1s steps(2), border-color 0.1s steps(2);
}
.explorer-item:hover {
  background: hsl(var(--accent) / 0.06);
}
.explorer-item.is-selected {
  background: hsl(var(--accent) / 0.12);
  border-color: hsl(var(--accent) / 0.3);
}
.explorer-item.is-selected .explorer-item-label {
  background: hsl(var(--accent));
  color: hsl(var(--bg));
}

.explorer-item-label {
  font-family: monospace;
  font-size: 10px;
  padding: 1px 4px;
  text-align: center;
  color: hsl(var(--tx));
  transition: background 0.1s, color 0.1s;
}

/* ── Scrollbar decoration ────────────────────────────────────────────── */
.explorer-scrollbar {
  position: absolute;
  top: 80px;
  right: 0;
  bottom: 16px;
  width: 18px;
  display: flex;
  flex-direction: column;
  background: hsl(var(--surface));
  border-left: 1px solid hsl(var(--tx3));
}
.explorer-scroll-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 16px;
  font-size: 8px;
  color: hsl(var(--tx3));
  border-bottom: 1px solid hsl(var(--border));
}
.explorer-scroll-arrow:last-child {
  border-bottom: none;
  border-top: 1px solid hsl(var(--border));
  margin-top: auto;
}
.explorer-scroll-track {
  flex: 1;
  position: relative;
}
.explorer-scroll-thumb {
  position: absolute;
  top: 4px;
  left: 2px;
  right: 2px;
  height: 30px;
  background: hsl(var(--border2));
  border: 1px solid hsl(var(--tx3));
}

/* ── Resize grip ─────────────────────────────────────────────────────── */
.explorer-resize {
  position: absolute;
  bottom: 0;
  right: 0;
  padding: 2px;
}

/* ── Detail windows ──────────────────────────────────────────────────── */
.detail-windows-container {
  position: relative;
  margin-top: 24px;
  min-height: 180px;
}

.detail-window {
  position: absolute;
  top: 0;
  left: 50%;
  margin-left: -160px;
  width: 320px;
  background: hsl(var(--surface));
  border: 2px solid hsl(var(--tx3));
  box-shadow: 4px 4px 0 0 hsl(var(--tx) / 0.15);
  transition: transform 0.2s steps(5), opacity 0.15s steps(3);
  z-index: 5;
}

.win-titlebar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  background: hsl(var(--border2));
  border-bottom: 2px solid hsl(var(--tx3));
}
.win-titlebar-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.win-titlebar-lines span {
  display: block;
  height: 1px;
  background: hsl(var(--tx3));
}
.win-titlebar-text {
  font-family: monospace;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  padding: 0 4px;
  color: hsl(var(--tx));
}
.win-close-btn {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid hsl(var(--tx3));
  background: hsl(var(--surface));
  font-family: monospace;
  font-size: 12px;
  font-weight: 700;
  color: hsl(var(--tx));
  cursor: pointer;
  line-height: 1;
  padding: 0;
  transition: background 0.1s;
}
.win-close-btn:hover {
  background: hsl(var(--danger) / 0.2);
}

.win-body {
  padding: 14px 16px;
}
.win-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.win-step {
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
}
.win-title {
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
}
.win-separator {
  height: 1px;
  background: hsl(var(--border2));
  margin-bottom: 8px;
}
.win-desc {
  font-family: monospace;
  font-size: 11px;
  line-height: 1.65;
  color: hsl(var(--tx3));
  margin: 0;
}

/* ── Responsive ──────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .explorer-window { max-width: 100%; }
  .explorer-grid { gap: 20px; padding: 20px 12px 28px; }
  .detail-window { width: 280px; margin-left: -140px; }
}

@media (prefers-reduced-motion: reduce) {
  .detail-window, .explorer-item { transition: none !important; }
}
`
