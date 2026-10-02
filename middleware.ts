import { NextResponse, type NextRequest } from 'next/server'
import { isLocalMode } from '@/lib/local-mode'

// Solo para el docente: el panel admin y todas las vistas de prueba (bancos
// de ítems/tienda/Mercader, el final del Arquitecto, la victoria) — spoilers
// del taller. /demo y /demo/creeper-formulario siguen públicos.
const ADMIN_ONLY = [
  '/admin',
  '/demo/items', '/demo/tienda', '/demo/mercader-v2',
  '/demo/mercader', '/demo/architect-lab', '/demo/victory', '/demo/mapa',
]
const PROTECTED = ['/dashboard', '/battle', ...ADMIN_ONLY]

function matches(pathname: string, routes: string[]) {
  return routes.some((r) => pathname === r || pathname.startsWith(`${r}/`))
}

function isProtected(pathname: string) {
  return matches(pathname, PROTECTED)
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

  if (user && matches(pathname, ADMIN_ONLY)) {
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
