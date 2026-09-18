-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — Aulas (comisiones/turnos)
-- Run this in Supabase SQL Editor or via supabase db push, after 001_initial.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS aulas (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre      TEXT NOT NULL,
  turno       TEXT NOT NULL DEFAULT 'otro' CHECK (turno IN ('mañana', 'tarde', 'otro')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS aula_id UUID REFERENCES aulas(id) ON DELETE SET NULL;

ALTER TABLE aulas ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer aulas (para mostrar el nombre de su comisión);
-- solo el admin puede crear/editar/borrar.
CREATE POLICY "read_aulas"  ON aulas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_aulas" ON aulas FOR ALL    USING (is_admin());
