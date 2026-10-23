'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  bossId: string
  /** Qué hacer al terminar; por defecto refresca los datos de la página actual. */
  onDone?: () => void
  label?: string
}

// Solo lo muestran las sesiones del alumno TEST. Borra el/los registros de batalla de ese jefe
// (los ataques se borran en cascada); RLS ya limita el borrado a las filas del propio usuario.
export default function ResetBossButton({ bossId, onDone, label = '↺ Reiniciar jefe' }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = async () => {
    setBusy(true)
    setError('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('sin sesión')
      const { error: delError } = await supabase
        .from('battle_records')
        .delete()
        .eq('user_id', user.id)
        .eq('boss_id', bossId)
      if (delError) throw new Error(delError.message)
      if (onDone) onDone()
      else router.refresh()
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={reset}
        disabled={busy}
        className="sys-tool"
        style={{ cursor: busy ? 'wait' : 'pointer' }}
      >
        {busy ? 'Reiniciando…' : label}
      </button>
      {error && <span className="sys-sub" style={{ color: 'hsl(var(--danger))' }}>{error}</span>}
    </span>
  )
}
