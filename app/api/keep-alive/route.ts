import { NextResponse } from 'next/server'

// ─── Keep-alive de Supabase ─────────────────────────────────────────────────
// El plan gratis de Supabase pausa el proyecto si pasa una semana sin pedidos.
// Entre el último día de clase (~10/12) y la muestra (~18/12) no hay clases:
// un cron de Vercel (vercel.json, una vez por día) llama acá y esto hace una
// consulta liviana. No lee ni devuelve datos de nadie.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Si está configurado CRON_SECRET en Vercel, solo el cron puede llamar.
  const secreto = process.env.CRON_SECRET
  if (secreto && request.headers.get('authorization') !== `Bearer ${secreto}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !clave) return NextResponse.json({ ok: true, supabase: 'sin configurar' })
  try {
    const r = await fetch(`${url}/rest/v1/aulas?select=id&limit=1`, { headers: { apikey: clave, Authorization: `Bearer ${clave}` }, cache: 'no-store' })
    return NextResponse.json({ ok: r.ok, estado: r.status, cuando: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 })
  }
}
