-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — "Mi Reino": la base de datos propia de cada alumno
-- · No se guarda el archivo de la base: se guarda la lista de sentencias SQL
--   que la cambiaron y salieron bien (CREATE, INSERT, UPDATE, DELETE…). Al
--   entrar, el navegador las vuelve a ejecutar en orden y el reino aparece
--   como lo dejó — en cualquier PC del taller.
-- · source: 'libre' (lo que escribió el alumno), 'botin' (trofeo al vencer un
--   jefe SQL) o 'reinicio' (marca: el reino arranca vacío desde acá; lo de
--   antes queda guardado para el docente, no se borra nada).
-- · Solo se agregan filas: el alumno no puede editar ni borrar su historial.
-- Run this in Supabase SQL Editor, after 011_repasos.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sql_journal (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  statement   TEXT NOT NULL CHECK (char_length(statement) <= 2000),
  source      TEXT NOT NULL DEFAULT 'libre' CHECK (source IN ('libre', 'botin', 'reinicio')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sql_journal_user_idx ON sql_journal (user_id, id);

ALTER TABLE sql_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_journal"   ON sql_journal FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "insert_own_journal" ON sql_journal FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin_journal"      ON sql_journal FOR DELETE USING (is_admin());

-- Tope por alumno (cuenta también las de antes de un reinicio): un reino de
-- taller no necesita más, y evita que un bucle o un script llene la tabla.
CREATE OR REPLACE FUNCTION sql_journal_cap() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM sql_journal WHERE user_id = NEW.user_id) >= 1000 THEN
    RAISE EXCEPTION 'sql_journal: límite de sentencias alcanzado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sql_journal_cap_trg ON sql_journal;
CREATE TRIGGER sql_journal_cap_trg BEFORE INSERT ON sql_journal
  FOR EACH ROW EXECUTE FUNCTION sql_journal_cap();
