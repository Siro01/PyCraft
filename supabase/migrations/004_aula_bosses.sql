-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — Jefes habilitados por aula
-- Un alumno con aula usa aula_bosses; un alumno sin aula usa bosses.is_enabled (global).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION my_aula_id()
RETURNS UUID AS $$
  SELECT aula_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE TABLE IF NOT EXISTS aula_bosses (
  aula_id     UUID NOT NULL REFERENCES aulas(id)  ON DELETE CASCADE,
  boss_id     TEXT NOT NULL REFERENCES bosses(id) ON DELETE CASCADE,
  is_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (aula_id, boss_id)
);

ALTER TABLE aula_bosses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_aula_bosses" ON aula_bosses FOR SELECT USING (aula_id = my_aula_id() OR is_admin());
CREATE POLICY "admin_aula_bosses"    ON aula_bosses FOR ALL    USING (is_admin());
