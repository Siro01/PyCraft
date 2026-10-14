import { NextRequest, NextResponse } from 'next/server'

// 303 See Other: el formulario "Salir" llega por POST y el navegador tiene que ir a
// /login con GET. Con el 307 por defecto repetía el POST contra /login y en
// producción daba una página inexistente.
const toLogin = (req: NextRequest) => NextResponse.redirect(new URL('/login', req.url), 303)

export async function POST(req: NextRequest) {
  const isLocal = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_LOCAL_MODE === 'true' ||
    (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? false)

  if (isLocal) {
    const res = toLogin(req)
    // Clear the cookie (set expired)
    res.cookies.set('pysql-local-user', '', { path: '/', maxAge: 0 })
    return res
  }

  // Supabase mode
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  await supabase.auth.signOut()
  return toLogin(req)
}
