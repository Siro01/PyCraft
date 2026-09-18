import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const isLocal = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_LOCAL_MODE === 'true' ||
    (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ?? false)

  if (isLocal) {
    const url = new URL('/login', req.url)
    const res = NextResponse.redirect(url)
    // Clear the cookie (set expired)
    res.cookies.set('pysql-local-user', '', { path: '/', maxAge: 0 })
    return res
  }

  // Supabase mode
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', req.url))
}
