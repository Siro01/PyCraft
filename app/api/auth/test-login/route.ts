import { NextRequest, NextResponse } from 'next/server'
import { adminClient, ensureTestStudent, normalizeCode } from '@/lib/test-student/server'

const INVALID = 'Código inválido o vencido.'

// Entra como el alumno TEST con un código generado desde el admin.
// El código es la única credencial: no existe contraseña del alumno TEST.
export async function POST(request: NextRequest) {
  const { code } = await request.json().catch(() => ({ code: '' }))
  const normalized = normalizeCode(String(code ?? ''))

  const fail = async (status = 401, message = INVALID) => {
    await new Promise((r) => setTimeout(r, 600)) // frena la fuerza bruta
    return NextResponse.json({ error: message }, { status })
  }

  if (normalized.length !== 9) return fail()

  const admin = adminClient()
  const { data: row } = await admin
    .from('test_codes')
    .select('code, expires_at, revoked, uses')
    .eq('code', normalized)
    .maybeSingle()

  if (!row || row.revoked || new Date(row.expires_at).getTime() < Date.now()) return fail()

  try {
    const { email } = await ensureTestStudent(admin)

    // Sesión sin contraseña: el service role emite un token de un solo uso y se canjea acá mismo.
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    const tokenHash = link?.properties?.hashed_token
    if (linkError || !tokenHash) throw new Error(linkError?.message ?? 'sin token')

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
    if (otpError) throw new Error(otpError.message)

    await admin
      .from('test_codes')
      .update({ uses: row.uses + 1, last_used_at: new Date().toISOString() })
      .eq('code', normalized)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('test-login', e)
    return fail(500, 'No se pudo iniciar la sesión de prueba.')
  }
}
