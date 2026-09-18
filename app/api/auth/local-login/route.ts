import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { name, role } = (await req.json()) as { name: string; role: 'student' | 'admin' }

  const trimmed = name.trim().slice(0, 40)
  if (!trimmed) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const cookieStore = await cookies()
  cookieStore.set('pysql-local-user', JSON.stringify({ name: trimmed, role }), {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  })

  return NextResponse.json({ ok: true })
}
