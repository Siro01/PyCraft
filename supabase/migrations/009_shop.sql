-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — Tienda del Mercader del Abismo
-- Los ítems comprados (stickers y perks) se guardan acá, igual que amulets/
-- playground/finale en game_extras (ver 008_game_extras.sql). Los diamantes
-- NO se guardan: se calculan en el cliente (jefes derrotados × 20 - gastado).
-- Run this in Supabase SQL Editor, after 008_game_extras.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE game_extras
  ADD COLUMN IF NOT EXISTS shop JSONB;
