-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — La Arena: registro de cada acierto del 1 vs 1
-- · arena_matches solo guarda el ÚLTIMO acierto de cada jugador
--   (last_solve_a / last_solve_b): no alcanza para reconstruir un duelo.
-- · Ahora cada acierto que el servidor acepta deja una fila en arena_solves:
--   duelo, alumno, número de ejercicio y hora. Sirve para auditar ("¿quién
--   sumó este punto y cuándo?") y no cambia ninguna regla del juego.
-- · Solo se agrega una fila cuando el acierto cuenta (el mismo chequeo de
--   siempre: es el ejercicio que le toca), así un doble clic no deja dos.
-- Run this in Supabase SQL Editor, after 018_compensaciones.sql. Se puede
-- volver a correr entero: no borra datos.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS arena_solves (
  id          BIGSERIAL PRIMARY KEY,
  match_id    UUID NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  idx         SMALLINT NOT NULL,      -- 0, 1, 2: qué ejercicio resolvió
  solved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, user_id, idx)
);
CREATE INDEX IF NOT EXISTS arena_solves_match_idx ON arena_solves (match_id, solved_at);

-- Lo lee el docente; nadie escribe desde el navegador.
ALTER TABLE arena_solves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_arena_solves" ON arena_solves;
CREATE POLICY "read_arena_solves" ON arena_solves FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- Igual que en 013_arena.sql, más la fila en arena_solves.
CREATE OR REPLACE FUNCTION arena_record_solve(p_match UUID, p_user UUID, p_idx SMALLINT, p_total SMALLINT)
RETURNS arena_matches AS $$
DECLARE
  m arena_matches;
BEGIN
  SELECT * INTO m FROM arena_matches WHERE id = p_match FOR UPDATE;
  IF m.status <> 'active' THEN RETURN m; END IF;
  IF NOW() >= m.ends_at THEN RETURN arena_timeout(p_match); END IF;

  IF p_user = m.player_a AND m.progress_a = p_idx THEN
    INSERT INTO arena_solves (match_id, user_id, idx) VALUES (p_match, p_user, p_idx) ON CONFLICT DO NOTHING;
    UPDATE arena_matches SET progress_a = progress_a + 1, last_solve_a = NOW() WHERE id = p_match RETURNING * INTO m;
    IF m.progress_a >= p_total THEN RETURN arena_settle(p_match, p_user, 'solved'); END IF;
  ELSIF p_user = m.player_b AND m.progress_b = p_idx THEN
    INSERT INTO arena_solves (match_id, user_id, idx) VALUES (p_match, p_user, p_idx) ON CONFLICT DO NOTHING;
    UPDATE arena_matches SET progress_b = progress_b + 1, last_solve_b = NOW() WHERE id = p_match RETURNING * INTO m;
    IF m.progress_b >= p_total THEN RETURN arena_settle(p_match, p_user, 'solved'); END IF;
  END IF;
  RETURN m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION arena_record_solve(UUID, UUID, SMALLINT, SMALLINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION arena_record_solve(UUID, UUID, SMALLINT, SMALLINT) TO service_role;

-- Para mirar un duelo, acierto por acierto:
--   select s.solved_at, p.username, s.idx + 1 as ejercicio
--     from arena_solves s join profiles p on p.id = s.user_id
--    where s.match_id = '<id del duelo>' order by s.solved_at;
