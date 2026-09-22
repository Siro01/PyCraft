-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — Dificultades habilitadas por aula
-- Sin fila para un (aula, tier) rige el valor por defecto de la app
-- (junior y trainee habilitados, senior deshabilitado).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS aula_tiers (
  aula_id     UUID NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
  tier        TEXT NOT NULL CHECK (tier IN ('junior', 'trainee', 'senior')),
  is_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (aula_id, tier)
);

ALTER TABLE aula_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_aula_tiers" ON aula_tiers FOR SELECT USING (aula_id = my_aula_id() OR is_admin());
CREATE POLICY "admin_aula_tiers"    ON aula_tiers FOR ALL    USING (is_admin());
