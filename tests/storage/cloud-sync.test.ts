import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Progreso del alumno entre la PC (localStorage) y la nube (game_extras).
// Reproduce el incidente del 15/10: compras de un alumno que aparecían en la
// cuenta de otro (misma PC del taller) y listas pisadas cuando falla la red.

// ── Una PC de mentira (localStorage + window) ─────────────────────────────
const store = new Map<string, string>()
const localStorageFake = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)) },
  removeItem: (k: string) => { store.delete(k) },
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size },
  clear: () => store.clear(),
}

// ── Una nube de mentira (lo justo de supabase-js que usa cloud-sync) ──────
const cloud = vi.hoisted(() => ({
  user: 'A' as string | null,
  rows: {} as Record<string, Record<string, unknown>>,
  failReads: 0,
  upserts: [] as { user_id: string; [k: string]: unknown }[],
}))

vi.mock('@/lib/local-mode', () => ({ isLocalMode: () => false }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: cloud.user ? { id: cloud.user } : null } }) },
    from: (table: string) => {
      const filters: Record<string, unknown> = {}
      const q = {
        select: () => q,
        eq: (col: string, v: unknown) => { filters[col] = v; return q },
        in: () => q,
        maybeSingle: async () => {
          if (table === 'game_extras' && cloud.failReads > 0) { cloud.failReads--; return { data: null, error: { message: 'network' } } }
          return { data: table === 'game_extras' ? cloud.rows[filters.user_id as string] ?? null : null, error: null }
        },
        upsert: async (row: { user_id: string }) => {
          cloud.upserts.push(row)
          cloud.rows[row.user_id] = { ...(cloud.rows[row.user_id] ?? {}), ...row }
          return { error: null }
        },
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
      }
      return q
    },
  }),
}))

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const buy = (id: string, at: string) => ({ id, pricePaid: 10, acquiredAt: at })

async function freshModules() {
  vi.resetModules()
  const sync = await import('@/lib/storage/cloud-sync')
  const local = await import('@/lib/storage/local-store')
  return { sync, local }
}
const shopOf = (user: string) => cloud.upserts.filter((u) => u.user_id === user && 'shop' in u).at(-1)?.shop as { id: string }[] | undefined

beforeEach(() => {
  store.clear()
  cloud.user = 'A'; cloud.rows = {}; cloud.failReads = 0; cloud.upserts = []
  vi.stubGlobal('localStorage', localStorageFake)
  vi.stubGlobal('window', Object.assign(new EventTarget(), { localStorage: localStorageFake }))
})
afterEach(() => { vi.unstubAllGlobals() })

describe('una PC, varias cuentas', () => {
  it('si entra OTRA cuenta, no hereda las compras de la anterior', async () => {
    store.set('pysql:owner', 'A')
    store.set('pysql:shop-owned', JSON.stringify([buy('item-daga', '2026-10-08T10:00:00Z'), buy('item-mazo', '2026-10-08T10:05:00Z')]))
    cloud.user = 'B'
    cloud.rows.B = { shop: [buy('item-pato', '2026-10-09T10:00:00Z')] }

    const { sync, local } = await freshModules()
    sync.syncOnLoad()
    await wait(800)

    expect(local.getShopOwned().map((o) => o.id)).toEqual(['item-pato'])
    expect(shopOf('B')?.map((o) => o.id)).toEqual(['item-pato'])
    expect(store.get('pysql:owner')).toBe('B')
  })

  it('las preferencias de la PC (zoom, sonido) quedan', async () => {
    store.set('pysql:owner', 'A')
    store.set('pysql:text-zoom', '1.3')
    store.set('pysql:sfx-muted', '1')
    store.set('pysql:playground', JSON.stringify({ xp: 999, bestStreak: {}, bestScore: {}, xpAwarded: {} }))
    cloud.user = 'B'

    const { sync, local } = await freshModules()
    sync.syncOnLoad()
    await wait(800)

    expect(store.get('pysql:text-zoom')).toBe('1.3')
    expect(store.get('pysql:sfx-muted')).toBe('1')
    expect(local.getPlaygroundState().xp).toBe(0)
  })

  it('la MISMA cuenta en su PC no pierde nada: combina lo local con la nube', async () => {
    store.set('pysql:owner', 'A')
    store.set('pysql:shop-owned', JSON.stringify([buy('item-daga', '2026-10-08T10:00:00Z'), buy('item-mazo', '2026-10-08T10:05:00Z')]))
    cloud.rows.A = { shop: [buy('item-daga', '2026-10-08T10:00:00Z')] }

    const { sync, local } = await freshModules()
    sync.syncOnLoad()
    await wait(800)

    expect(local.getShopOwned().map((o) => o.id).sort()).toEqual(['item-daga', 'item-mazo'])
    expect(shopOf('A')?.map((o) => o.id).sort()).toEqual(['item-daga', 'item-mazo'])
  })
})

describe('red inestable', () => {
  it('si la carga falla, NO sube una lista vacía: reintenta y conserva lo de la nube', async () => {
    cloud.rows.A = { shop: [buy('item-daga', '2026-10-08T10:00:00Z')] }
    cloud.failReads = 1

    const { sync, local } = await freshModules()
    sync.syncOnLoad()
    await wait(800)
    expect(cloud.upserts).toHaveLength(0) // durante la falla, nada pisa la nube
    expect((cloud.rows.A.shop as unknown[]).length).toBe(1)

    await wait(2_500) // primer reintento (2 s) + debounce
    expect(local.getShopOwned().map((o) => o.id)).toEqual(['item-daga'])
    expect(shopOf('A')?.map((o) => o.id)).toEqual(['item-daga'])
  }, 10_000)

  it('lo que guarda el alumno antes de que termine la carga no se pierde ni pisa la nube', async () => {
    cloud.rows.A = { shop: [buy('item-daga', '2026-10-08T10:00:00Z')] }
    cloud.failReads = 1

    const { sync, local } = await freshModules()
    sync.syncOnLoad()
    await wait(100)
    local.claimChestSticker('sticker-cofre-py') // un premio llega mientras la red falla
    await wait(3_000) // (guardar algo también dispara un reintento de la carga)

    // Ninguna subida pisó la nube: todas traen lo que ya estaba (la daga)…
    const shops = cloud.upserts.filter((u) => 'shop' in u).map((u) => (u.shop as { id: string }[]).map((o) => o.id))
    expect(shops.length).toBeGreaterThan(0)
    for (const ids of shops) expect(ids).toContain('item-daga')
    // …y la última suma el premio nuevo.
    expect(shopOf('A')?.map((o) => o.id).sort()).toEqual(['item-daga', 'sticker-cofre-py'])
  }, 10_000)
})

describe('PC que ya venía usándose (sin dueño anotado)', () => {
  it('la adopta sin borrar nada (no empeora lo que ya había)', async () => {
    store.set('pysql:shop-owned', JSON.stringify([buy('item-daga', '2026-10-08T10:00:00Z')]))

    const { sync, local } = await freshModules()
    sync.syncOnLoad()
    await wait(800)

    expect(local.getShopOwned().map((o) => o.id)).toEqual(['item-daga'])
    expect(store.get('pysql:owner')).toBe('A')
  })
})
