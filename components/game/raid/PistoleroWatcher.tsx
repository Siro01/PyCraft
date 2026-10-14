'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'
import type { StudentRaidState } from '@/lib/game/raid/types'
import type { RaidChannel } from '@/lib/game/raid/live'
import { publishSighting } from '@/lib/game/raid/watch-state'

// El vigía del Pistolero: vive en el layout raíz y escucha el aviso sorpresa
// esté donde esté el alumno. Para no sumar peso:
// - Sin sesión, en modo local o en pantallas del docente no hace nada.
// - Pregunta una vez si el aula está «armada» (y de nuevo cada 90 s). Solo si
//   lo está abre el canal en tiempo real.
// - La pantalla del aviso (con el arte del Pistolero) se descarga recién
//   cuando llega el aviso.

const SummonOverlay = dynamic(() => import('./SummonOverlay'), { ssr: false })

const QUIET = ['/login', '/admin', '/demo', '/pistolero']
const RECHECK_MS = 90_000
const BUSY = ['/battle', '/secreto', '/arena', '/repaso', '/reino', '/raid']

export default function PistoleroWatcher() {
  const pathname = usePathname() ?? '/'
  const router = useRouter()
  const quiet = pathname === '/' || QUIET.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const [state, setState] = useState<StudentRaidState | null>(null)
  const [overlay, setOverlay] = useState(false)
  const [deadline, setDeadline] = useState(0)
  const [, tick] = useState(0)
  const channel = useRef<RaidChannel | null>(null)
  const dismissedRaid = useRef<string | null>(null)

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/raid', { cache: 'no-store' })
      if (!res.ok) { setState(null); return null }
      const st = (await res.json()) as StudentRaidState
      setState(st)
      // el cartel SE BUSCA del mapa se entera sin otro pedido
      publishSighting({ armed: st.armed, live: !!st.raid && (st.raid.status === 'lobby' || st.raid.status === 'active') })
      return st
    } catch { return null }
  }, [])

  // ¿Hay sesión? ¿El aula está armada?
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_LOCAL_MODE === 'true') return
    let alive = true
    let timer: ReturnType<typeof setTimeout>
    const loop = async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const { data } = await createClient().auth.getUser()
      if (!alive || !data.user) return
      const st = await check()
      if (!alive || !st) return
      timer = setTimeout(loop, RECHECK_MS)
    }
    void loop()
    return () => { alive = false; clearTimeout(timer) }
  }, [check])

  // Canal del aula, solo mientras está armada
  const aulaId = state?.armed ? state.aulaId : null
  useEffect(() => {
    if (!aulaId) return
    let closed = false
    ;(async () => {
      const [{ createClient }, live] = await Promise.all([import('@/lib/supabase/client'), import('@/lib/game/raid/live')])
      if (closed) return
      channel.current = live.openRaidChannel(createClient(), live.aulaTopic(aulaId), (ev) => {
        if (ev.type === 'summon') {
          dismissedRaid.current = null
          void check().then(() => setOverlay(true))
        }
      })
    })()
    return () => { closed = true; channel.current?.close(); channel.current = null }
  }, [aulaId, check])

  // Hay duelo y el alumno todavía no entró → pantalla del aviso (una vez por duelo)
  const raid = state?.raid
  const pending = !!raid && (raid.status === 'lobby' || raid.status === 'active') && !state?.joined
  useEffect(() => {
    if (pending && raid && dismissedRaid.current !== raid.id && !quiet) setOverlay(true)
    if (!pending) { setOverlay(false); setDeadline(0) }
  }, [pending, raid, quiet])

  // «Voy en 1 minuto»: cuenta regresiva y después al duelo
  useEffect(() => {
    if (!deadline) return
    const id = setInterval(() => {
      tick((n) => n + 1)
      if (Date.now() >= deadline) { setDeadline(0); router.push('/pistolero') }
    }, 500)
    return () => clearInterval(id)
  }, [deadline, router])

  if (quiet || !pending || !raid) return null

  const busy = BUSY.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const go = () => { setOverlay(false); setDeadline(0); router.push('/pistolero') }

  if (overlay) {
    return (
      <SummonOverlay
        busy={busy}
        onGo={go}
        onLater={() => { dismissedRaid.current = raid.id; setOverlay(false); setDeadline(Date.now() + 60_000) }}
      />
    )
  }

  const left = deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0
  return (
    <button type="button" className="pist-pill" onClick={go}>
      <span>EL PISTOLERO ESTÁ EN EL PUEBLO</span>
      <b>{left ? `al duelo en ${left} s` : 'ir al duelo ▸'}</b>
    </button>
  )
}
