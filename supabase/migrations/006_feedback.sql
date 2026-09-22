-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — Feedback del final (El Arquitecto)
-- Lo que el alumno le responde al gato al terminar el juego. Sirve para mejorar
-- la próxima versión del taller.
-- Run this in Supabase SQL Editor or via supabase db push, after 005_aula_tiers.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feedback (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  aula_id       UUID REFERENCES aulas(id) ON DELETE SET NULL,
  -- 'battle' = alumno con cuenta · 'demo' = visitante sin cuenta
  source        TEXT NOT NULL DEFAULT 'battle' CHECK (source IN ('battle', 'demo')),
  rating        SMALLINT CHECK (rating BETWEEN 1 AND 5),
  hardest_boss  TEXT CHECK (char_length(hardest_boss) <= 60),
  liked         TEXT CHECK (char_length(liked)   <= 600),
  improve       TEXT CHECK (char_length(improve) <= 600),
  extra         TEXT CHECK (char_length(extra)   <= 600),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_aula_idx ON feedback (aula_id, created_at DESC);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Un alumno solo puede enviar feedback a su nombre; el visitante del demo (sin
-- sesión) puede enviarlo anónimo (user_id NULL). Los CHECK de arriba acotan el tamaño.
CREATE POLICY "insert_feedback" ON feedback FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Lectura: cada alumno ve el suyo; el admin ve todo.
CREATE POLICY "read_own_feedback" ON feedback FOR SELECT
  USING (user_id = auth.uid() OR is_admin());
