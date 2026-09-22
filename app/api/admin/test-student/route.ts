import { NextRequest, NextResponse } from 'next/server'
import {
  adminClient, ensureTestStudent, generateCode, requireAdmin, resetTestProgress,
} from '@/lib/test-student/server'

const MAX_HOURS = 24 * 14

// Estado del alumno TEST: códigos vigentes y su progreso.
export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const admin = adminClient()
  const { data: codes, error } = await admin
    .from('test_codes')
    .select('code, created_at, expires_at, revoked, uses, last_used_at')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) {
    return NextResponse.json({ error: `${error.message} — ¿ejecutaste la migración 007_test_student.sql?` }, { status: 500 })
  }

  const { data: profile } = await admin.from('profiles').select('id').eq('is_test', true).maybeSingle()
  let defeated = 0
  let attacks = 0
  if (profile) {
    const { data: battles } = await admin
      .from('battle_records')
      .select('is_completed, attacks_count')
      .eq('user_id', profile.id)
    for (const b of battles ?? []) {
      if (b.is_completed) defeated++
      attacks += b.attacks_count
    }
  }

  return NextResponse.json({ exists: !!profile, defeated, attacks, codes })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => ({}))
  const admin = adminClient()

  try {
    if (body.action === 'generate') {
      const hours = Math.min(Math.max(Number(body.hours) || 24, 1), MAX_HOURS)
      await ensureTestStudent(admin)
      const code = generateCode()
      const { error } = await admin.from('test_codes').insert({
        code,
        created_by: auth.userId,
        expires_at: new Date(Date.now() + hours * 3_600_000).toISOString(),
      })
      if (error) throw new Error(error.message)
      return NextResponse.json({ success: true, code })
    }

    if (body.action === 'revoke') {
      const { error } = await admin.from('test_codes').update({ revoked: true }).eq('code', String(body.code))
      if (error) throw new Error(error.message)
      return NextResponse.json({ success: true })
    }

    if (body.action === 'reset') {
      const { userId } = await ensureTestStudent(admin)
      await resetTestProgress(admin, userId)
      return NextResponse.json({ success: true })
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error inesperado' }, { status: 500 })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
