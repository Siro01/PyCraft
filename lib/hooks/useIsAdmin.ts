'use client'

import { useEffect, useState } from 'react'
import { isLocalMode } from '@/lib/local-mode'
import { getLocalUser } from '@/lib/storage/local-store'

/** ¿El que está jugando es el docente? Se resuelve al montar (false mientras tanto). */
export function useIsAdmin(): boolean {
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    if (isLocalMode()) {
      setAdmin(getLocalUser()?.role === 'admin')
      return
    }
    let alive = true
    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !alive) return
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (alive) setAdmin(data?.role === 'admin')
    })().catch(() => {})
    return () => { alive = false }
  }, [])
  return admin
}
