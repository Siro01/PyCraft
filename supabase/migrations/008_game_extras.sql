-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — Progreso "extra" en la nube (patio de juegos, amuletos, cofre)
-- Hasta ahora el patio de juegos (XP), los amuletos y el cofre final vivían
-- solo en localStorage, incluso en modo cuenta — un alumno que cambiaba de PC
-- en el aula los perdía por completo. Esta tabla guarda una fila por alumno
-- que lib/storage/cloud-sync.ts sincroniza con lo que haya en el dispositivo.
-- Run this in Supabase SQL Editor, after 007_test_student.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_extras (
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  amulets      JSONB,
  playground   JSONB,
  finale       JSONB,
  finale_deco  JSONB,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE game_extras ENABLE ROW LEVEL SECURITY;

-- Cada alumno lee/escribe solo su propia fila; el admin puede leer todas.
CREATE POLICY "own_game_extras"        ON game_extras FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "admin_game_extras_read" ON game_extras FOR SELECT USING (is_admin());
