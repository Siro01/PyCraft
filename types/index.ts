export type BossType = 'python' | 'sql' | 'mixed' | 'final'

export interface DialogueLine {
  text: string
  /** Override del speaker (por defecto usa boss.name) */
  speaker?: string
}
export type ChallengeType = 'python' | 'sql'
export type ChallengeTier = 'junior' | 'trainee' | 'senior'
export type UserRole = 'student' | 'admin'
export type AmuletType = 'boss-hp-reduction' | 'health-potion' | 'escape' | 'skip-boss'

export interface Amulet {
  id: string
  type: AmuletType
}

// ─── Tienda del Mercader del Abismo ──────────────────────────────────────────
// A diferencia de los amuletos (de un solo uso), estos ítems se quedan con el
// alumno para siempre una vez comprados.
export type ShopItemCategory = 'sticker' | 'perk'

/**
 * Solo aplica a category: 'perk' — decide dónde y cómo se activa en batalla:
 * - 'consumable': se usa una vez desde ÍTEMS.SYS y se gasta (sale del
 *   inventario) — mismo lenguaje que un amuleto, pero comprado en vez de
 *   regalado. Pensado para el momento de "¿lo uso ahora o lo guardo?".
 * - 'passive': se equipa desde INVENTARIO.EXE (máximo PERK_SLOT_LIMIT a la
 *   vez, ver lib/game/perk-effects.ts) y queda activo mientras esté
 *   equipado, sin gastarse — acá es donde van a vivir las sinergias futuras
 *   entre dos pasivos equipados juntos.
 * - 'key': objeto de historia (Corona Oxidada, Puñado de Esmeraldas) — no
 *   hace nada en batalla por sí mismo; algún jefe o diálogo pregunta si el
 *   alumno lo tiene (ver hasKeyItem en lib/game/perk-effects.ts).
 * Ver planificacion/items.md para el diseño completo.
 */
export type PerkKind = 'consumable' | 'passive' | 'key'

export interface ShopItem {
  id: string
  category: ShopItemCategory
  name: string
  description: string
  /** Nivel de patio de juegos (1-20) necesario para poder comprarlo. */
  level: number
  /** Precio en diamantes. */
  price: number
  /** Clave del glifo pixelart — ver SHOP_ICONS en components/game/shop/ShopIcons.tsx. */
  glyph: string
  /** Solo perks — ver PerkKind. Los stickers no llevan este campo. */
  perkKind?: PerkKind
  /** Solo perks — clave que interpreta applyPerkEffect() en lib/game/perk-effects.ts. */
  effectId?: string
  /** Solo perks pasivos — etiquetas libres para futuras sinergias (dos equipados que comparten tag combinan). */
  synergyTags?: string[]
  /** Solo perks — el nombre que el alumno escribe en INVENTARIO.PY para usarlo: print(<printName>). */
  printName?: string
  /** Solo perks — una línea de "cómo se usa / qué hace exactamente", más concreta que la descripción. */
  effectHint?: string
  /** 'chest' = sticker que no se vende: se encuentra en un cofre del mapa (lib/game/chest-stickers.ts). */
  source?: 'chest'
}

export interface OwnedShopItem {
  id: string
  /** Precio pagado al comprarlo — así una baja de precio futura en el catálogo no "devuelve" diamantes. */
  pricePaid: number
  acquiredAt: string
  /** Solo stickers: tinte elegido en la paleta de personalización (triada HSL, ej. "150 70% 45%"). */
  colorway?: string
  /** Consumible ya usado: deja de ser del alumno, pero sigue contando como diamantes gastados. */
  consumedAt?: string
}

export interface Boss {
  id: string
  classNumber: number
  name: string
  title: string
  topic: string
  type: BossType
  hpMax: number
  color: string
  description: string
  isEnabled?: boolean
}

export interface Challenge {
  id: string
  bossId: string
  title: string
  description: string
  type: ChallengeType
  tier: ChallengeTier
  expectedOutput: string
  initialCode: string
  damage: number
  tip?: string
  orderIndex: number
  // SQL-only: SQL to run before the user's code to pre-populate the DB
  seedSQL?: string
  // SQL DDL/DML: SQL to run after the user's code to verify the result (when user code produces no rows)
  verifySQL?: string
}

export interface BattleRecord {
  id: string
  userId: string
  bossId: string
  hpCurrent: number
  isCompleted: boolean
  attacksCount: number
  startedAt: string
  completedAt?: string
}

export interface AttackRecord {
  id: string
  battleId: string
  userId: string
  challengeId: string
  submittedCode: string
  isCorrect: boolean
  damageDealt: number
  submittedAt: string
}

export interface Profile {
  id: string
  username: string
  role: UserRole
  createdAt: string
}

export interface Score {
  userId: string
  username: string
  totalDamage: number
  bossesDefeated: number
  attacksCount: number
}
