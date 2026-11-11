-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — AreaTrabajo y Arena de Cartas (proyecto final)
-- · Cada alumno arma un mazo de 6 cartas en la tabla `cartas` de su Mi Reino
--   (eso sigue viviendo en sql_journal). Acá se guarda todo lo demás: el
--   título y el lema, el código Python, las consultas guardadas, los pasos de
--   la guía, los dibujos de las cartas (frente, dorso y volteo), las versiones para "volver atrás", lo
--   publicado para la muestra y las partidas.
-- · El equipo (Mañana / Tarde) sale de aulas.turno: no hace falta otra columna.
-- Run this in Supabase SQL Editor, after 019_arena_solves.sql. Se puede volver
-- a correr entero: no borra datos.
-- ─────────────────────────────────────────────────────────────────────────────

-- Todo o nada: si algo falla, no queda nada a medias.
BEGIN;

-- El docente abre AreaTrabajo por aula (cerrada hasta que la habilite).
-- Columna nueva con valor fijo: no reescribe la tabla ni toca las filas que hay.
ALTER TABLE aulas
  ADD COLUMN IF NOT EXISTS areatrabajo_habilitada BOOLEAN NOT NULL DEFAULT FALSE;

-- "Volver atrás" agrega sentencias al reino con su propia marca.
-- Se reemplaza SOLO la regla que limita los valores de `source` (sea cual sea
-- su nombre en la base). Las filas no se tocan: las que ya hay ('libre',
-- 'botin', 'reinicio') cumplen la regla nueva, que solo suma 'restaurar'.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'sql_journal'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%source%'
  LOOP
    EXECUTE format('ALTER TABLE sql_journal DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE sql_journal
  ADD CONSTRAINT sql_journal_source_check CHECK (source IN ('libre', 'botin', 'reinicio', 'restaurar'));

-- El docente puede "volver atrás" el mazo de un alumno desde el panel: agrega
-- sentencias a SU registro (solo agrega; no edita ni borra nada).
DROP POLICY IF EXISTS "admin_journal_insert" ON sql_journal;
CREATE POLICY "admin_journal_insert" ON sql_journal FOR INSERT WITH CHECK (is_admin());

-- ─── El proyecto de cada alumno ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS area_proyectos (
  user_id             UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  aula_id             UUID REFERENCES aulas(id) ON DELETE SET NULL,
  titulo              TEXT NOT NULL DEFAULT '' CHECK (char_length(titulo) <= 60),
  lema                TEXT NOT NULL DEFAULT '' CHECK (char_length(lema) <= 120),
  alias               TEXT NOT NULL DEFAULT '' CHECK (char_length(alias) <= 20),
  python_code         TEXT NOT NULL DEFAULT '' CHECK (char_length(python_code) <= 20000),
  consultas           JSONB NOT NULL DEFAULT '[]',   -- [{nombre, sql, es_orden_batalla}]
  pasos               JSONB NOT NULL DEFAULT '{}',   -- marcas de la guía que no se pueden recalcular
  sin_red             JSONB NOT NULL DEFAULT '{}',   -- pasos hechos "sin plantilla" (sello decorativo)
  -- Dibujos: {frente: {id_carta: {p, liso}}, reverso, volteo}. Si una carta se
  -- borra con DELETE, su dibujo queda acá y vuelve si la restaura.
  disenos             JSONB NOT NULL DEFAULT '{}' CHECK (octet_length(disenos::text) <= 20000),
  publicado           BOOLEAN NOT NULL DEFAULT FALSE,
  publicado_snapshot  JSONB,                         -- la foto que lee la muestra
  publicado_at        TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Por si se corrió una versión anterior de este archivo (sin la columna de dibujos).
ALTER TABLE area_proyectos
  ADD COLUMN IF NOT EXISTS disenos JSONB NOT NULL DEFAULT '{}';

ALTER TABLE area_proyectos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "area_own_read" ON area_proyectos;
DROP POLICY IF EXISTS "area_aula_publicados" ON area_proyectos;
DROP POLICY IF EXISTS "area_own_insert" ON area_proyectos;
DROP POLICY IF EXISTS "area_own_update" ON area_proyectos;
DROP POLICY IF EXISTS "area_admin_all" ON area_proyectos;
CREATE POLICY "area_own_read"        ON area_proyectos FOR SELECT USING (user_id = auth.uid());
-- Los mazos publicados los ve toda el aula (para pelear y para la presentación).
CREATE POLICY "area_aula_publicados" ON area_proyectos FOR SELECT USING (
  publicado AND aula_id IS NOT NULL AND aula_id = (SELECT aula_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "area_own_insert"      ON area_proyectos FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "area_own_update"      ON area_proyectos FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "area_admin_all"       ON area_proyectos FOR ALL USING (is_admin());

-- ─── Versiones para "volver atrás" ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS area_versiones (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  motivo           TEXT NOT NULL,              -- 'auto' | 'peligro' | 'publicar' | 'restaurar'
  python_code      TEXT,
  cartas_snapshot  JSONB,                      -- {create_sql, columnas, filas}
  consultas        JSONB,
  disenos          JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS area_versiones_user_idx ON area_versiones (user_id, created_at DESC);

ALTER TABLE area_versiones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "versiones_own" ON area_versiones;
DROP POLICY IF EXISTS "versiones_admin" ON area_versiones;
CREATE POLICY "versiones_own"   ON area_versiones FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "versiones_admin" ON area_versiones FOR ALL USING (is_admin());

-- Máximo 30 por alumno: al pasar, se borra la más vieja que no sea de publicar.
CREATE OR REPLACE FUNCTION area_versiones_cap() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM area_versiones
  WHERE id IN (
    SELECT id FROM area_versiones
    WHERE user_id = NEW.user_id AND motivo <> 'publicar'
    ORDER BY created_at DESC
    OFFSET 30
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS area_versiones_cap_trg ON area_versiones;
CREATE TRIGGER area_versiones_cap_trg AFTER INSERT ON area_versiones
  FOR EACH ROW EXECUTE FUNCTION area_versiones_cap();

-- ─── Partidas (prueba, muestra, torneo) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS partidas (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  modo        TEXT NOT NULL CHECK (modo IN ('prueba', 'auto', 'vs_cpu', 'dos_jugadores', 'torneo')),
  mazo_a      UUID REFERENCES profiles(id) ON DELETE SET NULL,   -- null = mazo CPU de práctica
  mazo_b      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  equipo_a    TEXT,
  equipo_b    TEXT,
  ganador     TEXT CHECK (ganador IN ('a', 'b', 'empate')),
  seed        BIGINT,
  registro    JSONB,
  created_by  UUID DEFAULT auth.uid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE partidas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partidas_prueba_insert" ON partidas;
DROP POLICY IF EXISTS "partidas_own_read" ON partidas;
DROP POLICY IF EXISTS "partidas_admin" ON partidas;
-- El alumno solo guarda sus partidas de prueba.
CREATE POLICY "partidas_prueba_insert" ON partidas FOR INSERT WITH CHECK (modo = 'prueba' AND mazo_a = auth.uid());
CREATE POLICY "partidas_own_read"      ON partidas FOR SELECT USING (mazo_a = auth.uid() OR mazo_b = auth.uid());
CREATE POLICY "partidas_admin"         ON partidas FOR ALL USING (is_admin());

COMMIT;
