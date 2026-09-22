-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — Alumno TEST (pruebas en las PCs del taller)
-- Un único alumno de prueba (profiles.is_test) que se entra desde /login con un
-- código generado en el admin. Sus datos se excluyen de las estadísticas.
-- Run this in Supabase SQL Editor, after 006_feedback.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS test_codes (
  code          TEXT PRIMARY KEY,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked       BOOLEAN NOT NULL DEFAULT FALSE,
  uses          INTEGER NOT NULL DEFAULT 0,
  last_used_at  TIMESTAMPTZ
);

-- Solo el admin (y el service role de las rutas /api) toca esta tabla.
ALTER TABLE test_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_test_codes" ON test_codes FOR ALL USING (is_admin());
