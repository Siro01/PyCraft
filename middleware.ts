import { NextResponse, type NextRequest } from 'next/server'
import { isLocalMode } from '@/lib/local-mode'

const PROTECTED = ['/dashboard', '/battle', '/admin']

function isProtected(pathname: string) {
  return PROTECTED.some((r) => pathname.startsWith(r))
}

// ─── Local mode: no middleware auth — pages guard themselves via localStorage ──
function handleLocalMode(_request: NextRequest): null {
  return null // allow all routes; LocalDashboard / LocalBattlePage redirect if no user
}

// ─── Supabase mode ───────────────────────────────────────────────────────────
async function handleSupabaseMode(request: NextRequest): Promise<NextResponse> {
  const { createServerClient } = await import('@supabase/ssr')

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (!user && isProtected(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

// ─── Main ────────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  if (isLocalMode()) {
    return handleLocalMode(request) ?? NextResponse.next()
  }
  return handleSupabaseMode(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|woff2?)).*)'],
}
