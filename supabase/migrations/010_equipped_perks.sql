-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — Perks pasivos equipados
-- Qué ítems de utilidad (categoría 'perk', perkKind 'passive') tiene el
-- alumno equipados ahora mismo (lista de ids, máx. PERK_SLOT_LIMIT — ver
-- lib/game/perk-effects.ts). A diferencia de los stickers, esto SÍ viaja
-- entre dispositivos: es una elección de juego, no una preferencia de
-- escritorio local. Run this in Supabase SQL Editor, after 009_shop.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE game_extras
  ADD COLUMN IF NOT EXISTS equipped_perks JSONB;
