'use client'

import { useEffect } from 'react'
import { sfx } from '@/lib/game/architect/sound'

// Sonidos de interfaz globales, por delegación de eventos (sin tocar cada botón):
//  · click del cursor en botones, links, pestañas y selects
//  · cerrar ventana (botones con aria-label="Cerrar")
//  · botón desactivado → "denied"
//  · aparece un [role="alert"] → error
// Cualquier elemento puede pedir otro sonido con data-sfx="close|open|tab|warn|none".
// data-sfx="none" evita el click global cuando el componente ya suena por su cuenta.

const CLICKABLE = 'button, a[href], [role="button"], [role="tab"], summary, select, label[for], [data-sfx]'
const HOVERABLE = '.desk-icon'

const NAMED: Record<string, () => void> = {
  close: sfx.close, open: sfx.open, tab: sfx.tab, warn: sfx.warn, error: sfx.error,
  notify: sfx.notify, theme: sfx.theme, none: () => {},
}

export default function UISounds() {
  useEffect(() => {
    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      const el = (ev.target as Element | null)?.closest?.(CLICKABLE) as HTMLElement | null
      if (!el) return
      if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') { sfx.denied(); return }
      const named = el.dataset.sfx
      if (named && NAMED[named]) { NAMED[named](); return }
      if (el.getAttribute('aria-label') === 'Cerrar') { sfx.close(); return }
      if (el.getAttribute('role') === 'tab') { sfx.tab(); return }
      sfx.click()
    }

    let lastHover = 0
    const onOver = (ev: PointerEvent) => {
      if (ev.pointerType === 'touch' || !navigator.userActivation?.hasBeenActive) return
      const el = (ev.target as Element | null)?.closest?.(HOVERABLE)
      if (!el || el.contains(ev.relatedTarget as Node | null)) return
      const now = performance.now()
      if (now - lastHover < 70) return
      lastHover = now
      sfx.hover()
    }

    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of Array.from(m.addedNodes)) {
          if (n instanceof HTMLElement && (n.getAttribute('role') === 'alert' || n.querySelector?.('[role="alert"]'))) { sfx.error(); return }
        }
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointerover', onOver, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointerover', onOver, true)
      mo.disconnect()
    }
  }, [])
  return null
}
