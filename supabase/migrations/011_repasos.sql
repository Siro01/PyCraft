-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — Repasos con Rodolfo (nivelación para quien faltó)
-- · Horario de cada aula (ej. "PyCraft · Mañana · 08:00–11:00").
-- · Repasos habilitados por aula entera o por alumno puntual — el alumno ve
--   la unión de los dos. Un repaso por jefe (contenido en lib/game/repasos.ts).
-- · Progreso de cada alumno en game_extras.repasos (lo lee el panel docente).
-- Run this in Supabase SQL Editor, after 010_equipped_perks.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE aulas
  ADD COLUMN IF NOT EXISTS hora_inicio TIME,
  ADD COLUMN IF NOT EXISTS hora_fin    TIME;

CREATE TABLE IF NOT EXISTS aula_repasos (
  aula_id     UUID NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
  boss_id     TEXT NOT NULL,
  is_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (aula_id, boss_id)
);

CREATE TABLE IF NOT EXISTS alumno_repasos (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boss_id     TEXT NOT NULL,
  is_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, boss_id)
);

ALTER TABLE aula_repasos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumno_repasos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_aula_repasos" ON aula_repasos   FOR SELECT USING (aula_id = my_aula_id() OR is_admin());
CREATE POLICY "admin_aula_repasos"    ON aula_repasos   FOR ALL    USING (is_admin());
CREATE POLICY "read_own_repasos"      ON alumno_repasos FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "admin_alumno_repasos"  ON alumno_repasos FOR ALL    USING (is_admin());

ALTER TABLE game_extras
  ADD COLUMN IF NOT EXISTS repasos JSONB;
