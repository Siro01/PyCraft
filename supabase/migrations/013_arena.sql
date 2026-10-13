-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — La Arena (duelos entre alumnos del mismo aula)
-- · Se abre sola al vencer al Jefe 3 (Golem Infinito); el docente la puede
--   cerrar por aula (aulas.arena_enabled).
-- · Dos alumnos reciben los MISMOS 3 ejercicios; gana el primero en resolverlos.
-- · El cliente NUNCA escribe en estas tablas: todo pasa por /api/arena (con la
--   service role) y por las funciones de abajo, que liquidan el duelo de forma
--   atómica (progreso, ganador, diamantes y XP en una sola transacción).
-- · La salida esperada de cada ejercicio vive en arena_match_secrets, que no
--   tiene ninguna policy: ningún alumno la puede leer.
-- Run this in Supabase SQL Editor, after 012_sql_journal.sql. Se puede volver a
-- correr entero: no borra datos (las tablas usan IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE aulas
  ADD COLUMN IF NOT EXISTS arena_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS arena_matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id       UUID REFERENCES aulas(id) ON DELETE SET NULL,
  player_a      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- quien retó
  player_b      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- quien fue retado
  boss_id       TEXT NOT NULL,      -- tema ('mezcla' = varios temas)
  act_key       TEXT NOT NULL,      -- para la regla de XP (una vez por rival y acto)
  stake         SMALLINT NOT NULL DEFAULT 0 CHECK (stake IN (0, 5, 10)),   -- 0 = amistoso
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'active', 'finished', 'declined', 'cancelled', 'expired')),
  exercises     JSONB NOT NULL,     -- parte pública: título, consigna, código inicial, tablas
  progress_a    SMALLINT NOT NULL DEFAULT 0,
  progress_b    SMALLINT NOT NULL DEFAULT 0,
  last_solve_a  TIMESTAMPTZ,
  last_solve_b  TIMESTAMPTZ,
  winner_id     UUID,
  end_reason    TEXT CHECK (end_reason IN ('solved', 'timeout', 'forfeit', 'draw', 'voided')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  CHECK (player_a <> player_b)
);

CREATE INDEX IF NOT EXISTS arena_matches_a_idx    ON arena_matches (player_a, status);
CREATE INDEX IF NOT EXISTS arena_matches_b_idx    ON arena_matches (player_b, status);
CREATE INDEX IF NOT EXISTS arena_matches_aula_idx ON arena_matches (aula_id, created_at DESC);

CREATE TABLE IF NOT EXISTS arena_match_secrets (
  match_id  UUID NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
  idx       SMALLINT NOT NULL,
  expected  TEXT NOT NULL,
  PRIMARY KEY (match_id, idx)
);

CREATE TABLE IF NOT EXISTS arena_ledger (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id    UUID REFERENCES arena_matches(id) ON DELETE SET NULL,
  delta       INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS arena_ledger_user_idx ON arena_ledger (user_id, created_at);

-- Una fila por (alumno, rival, acto): si ya existe, ese duelo no da XP.
CREATE TABLE IF NOT EXISTS arena_xp (
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  act_key      TEXT NOT NULL,
  xp           SMALLINT NOT NULL,
  match_id     UUID REFERENCES arena_matches(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, opponent_id, act_key)
);

-- ─── RLS: cada alumno lee lo suyo; nadie escribe desde el navegador ─────────
ALTER TABLE arena_matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_match_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_ledger        ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_xp            ENABLE ROW LEVEL SECURITY;

-- DROP … IF EXISTS: el archivo se puede volver a correr entero sin errores.
DROP POLICY IF EXISTS "read_own_arena_matches" ON arena_matches;
DROP POLICY IF EXISTS "read_own_arena_ledger"  ON arena_ledger;
DROP POLICY IF EXISTS "read_own_arena_xp"      ON arena_xp;
CREATE POLICY "read_own_arena_matches" ON arena_matches FOR SELECT USING (auth.uid() IN (player_a, player_b) OR is_admin());
CREATE POLICY "read_own_arena_ledger"  ON arena_ledger  FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "read_own_arena_xp"      ON arena_xp      FOR SELECT USING (auth.uid() = user_id OR is_admin());
-- arena_match_secrets: sin policies a propósito (solo la service role).

-- ─── Liquidación ────────────────────────────────────────────────────────────
-- Constantes (las mismas que lib/game/arena/rules.ts): 3 ejercicios, +15 XP
-- al ganador, +5 al que pierde; el XP solo si resolviste al menos uno.

CREATE OR REPLACE FUNCTION arena_settle(p_match UUID, p_winner UUID, p_reason TEXT)
RETURNS arena_matches AS $$
DECLARE
  m arena_matches;
  loser UUID;
  prog_w SMALLINT;
  prog_l SMALLINT;
BEGIN
  SELECT * INTO m FROM arena_matches WHERE id = p_match FOR UPDATE;
  IF m.status <> 'active' THEN RETURN m; END IF;

  UPDATE arena_matches
     SET status = 'finished', winner_id = p_winner, end_reason = p_reason, finished_at = NOW()
   WHERE id = p_match
  RETURNING * INTO m;

  DELETE FROM arena_match_secrets WHERE match_id = p_match;

  IF p_winner IS NULL THEN RETURN m; END IF;
  loser  := CASE WHEN p_winner = m.player_a THEN m.player_b ELSE m.player_a END;
  prog_w := CASE WHEN p_winner = m.player_a THEN m.progress_a ELSE m.progress_b END;
  prog_l := CASE WHEN p_winner = m.player_a THEN m.progress_b ELSE m.progress_a END;

  IF m.stake > 0 THEN
    INSERT INTO arena_ledger (user_id, match_id, delta) VALUES (p_winner, p_match, m.stake), (loser, p_match, -m.stake);
  END IF;

  IF prog_w > 0 THEN
    INSERT INTO arena_xp (user_id, opponent_id, act_key, xp, match_id)
    VALUES (p_winner, loser, m.act_key, 15, p_match) ON CONFLICT DO NOTHING;
  END IF;
  IF prog_l > 0 THEN
    INSERT INTO arena_xp (user_id, opponent_id, act_key, xp, match_id)
    VALUES (loser, p_winner, m.act_key, 5, p_match) ON CONFLICT DO NOTHING;
  END IF;

  RETURN m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Se acabó el tiempo: gana quien resolvió más; si empatan en cantidad, quien
-- llegó primero a esa cantidad; si nadie resolvió nada, empate.
CREATE OR REPLACE FUNCTION arena_timeout(p_match UUID)
RETURNS arena_matches AS $$
DECLARE
  m arena_matches;
  w UUID;
BEGIN
  SELECT * INTO m FROM arena_matches WHERE id = p_match FOR UPDATE;
  IF m.status <> 'active' OR NOW() < m.ends_at THEN RETURN m; END IF;
  IF m.progress_a > m.progress_b THEN w := m.player_a;
  ELSIF m.progress_b > m.progress_a THEN w := m.player_b;
  ELSIF m.progress_a = 0 THEN w := NULL;
  ELSIF m.last_solve_a <= m.last_solve_b THEN w := m.player_a;
  ELSE w := m.player_b;
  END IF;
  RETURN arena_settle(p_match, w, CASE WHEN w IS NULL THEN 'draw' ELSE 'timeout' END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Un acierto validado por el servidor. Solo cuenta si es el ejercicio que le
-- toca (p_idx = su progreso): así un doble clic no suma dos veces.
CREATE OR REPLACE FUNCTION arena_record_solve(p_match UUID, p_user UUID, p_idx SMALLINT, p_total SMALLINT)
RETURNS arena_matches AS $$
DECLARE
  m arena_matches;
BEGIN
  SELECT * INTO m FROM arena_matches WHERE id = p_match FOR UPDATE;
  IF m.status <> 'active' THEN RETURN m; END IF;
  IF NOW() >= m.ends_at THEN RETURN arena_timeout(p_match); END IF;

  IF p_user = m.player_a AND m.progress_a = p_idx THEN
    UPDATE arena_matches SET progress_a = progress_a + 1, last_solve_a = NOW() WHERE id = p_match RETURNING * INTO m;
    IF m.progress_a >= p_total THEN RETURN arena_settle(p_match, p_user, 'solved'); END IF;
  ELSIF p_user = m.player_b AND m.progress_b = p_idx THEN
    UPDATE arena_matches SET progress_b = progress_b + 1, last_solve_b = NOW() WHERE id = p_match RETURNING * INTO m;
    IF m.progress_b >= p_total THEN RETURN arena_settle(p_match, p_user, 'solved'); END IF;
  END IF;
  RETURN m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aceptar un reto: vence a los 60 s y ninguno de los dos puede estar en otro duelo.
-- Arranca con 4 s de cuenta regresiva y dura 6 minutos.
CREATE OR REPLACE FUNCTION arena_accept(p_match UUID, p_user UUID)
RETURNS arena_matches AS $$
DECLARE
  m arena_matches;
BEGIN
  SELECT * INTO m FROM arena_matches WHERE id = p_match FOR UPDATE;
  IF m.status <> 'pending' OR m.player_b <> p_user THEN RETURN m; END IF;
  IF m.created_at < NOW() - INTERVAL '60 seconds' THEN
    UPDATE arena_matches SET status = 'expired', finished_at = NOW() WHERE id = p_match RETURNING * INTO m;
    RETURN m;
  END IF;
  IF EXISTS (
    SELECT 1 FROM arena_matches
     WHERE status = 'active' AND ends_at > NOW() AND id <> p_match
       AND (player_a IN (m.player_a, m.player_b) OR player_b IN (m.player_a, m.player_b))
  ) THEN
    RAISE EXCEPTION 'arena: uno de los dos ya está en otro duelo';
  END IF;
  UPDATE arena_matches
     SET status = 'active', started_at = NOW() + INTERVAL '4 seconds', ends_at = NOW() + INTERVAL '364 seconds'
   WHERE id = p_match
  RETURNING * INTO m;
  RETURN m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Rendirse (duelo activo), rechazar (pendiente, retado) o cancelar (pendiente, retador).
CREATE OR REPLACE FUNCTION arena_leave(p_match UUID, p_user UUID)
RETURNS arena_matches AS $$
DECLARE
  m arena_matches;
BEGIN
  SELECT * INTO m FROM arena_matches WHERE id = p_match FOR UPDATE;
  IF p_user NOT IN (m.player_a, m.player_b) THEN RETURN m; END IF;
  IF m.status = 'pending' THEN
    UPDATE arena_matches
       SET status = CASE WHEN p_user = m.player_a THEN 'cancelled' ELSE 'declined' END, finished_at = NOW()
     WHERE id = p_match
    RETURNING * INTO m;
    RETURN m;
  END IF;
  IF m.status = 'active' THEN
    RETURN arena_settle(p_match, CASE WHEN p_user = m.player_a THEN m.player_b ELSE m.player_a END, 'forfeit');
  END IF;
  RETURN m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- El docente anula un duelo: devuelve los diamantes y el XP de ese duelo.
CREATE OR REPLACE FUNCTION arena_void(p_match UUID)
RETURNS arena_matches AS $$
DECLARE
  m arena_matches;
BEGIN
  DELETE FROM arena_ledger WHERE match_id = p_match;
  DELETE FROM arena_xp WHERE match_id = p_match;
  DELETE FROM arena_match_secrets WHERE match_id = p_match;
  UPDATE arena_matches
     SET status = 'finished', winner_id = NULL, end_reason = 'voided', finished_at = COALESCE(finished_at, NOW())
   WHERE id = p_match
  RETURNING * INTO m;
  RETURN m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Solo el servidor (service role) puede llamarlas.
REVOKE ALL ON FUNCTION arena_settle(UUID, UUID, TEXT)                     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION arena_timeout(UUID)                                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION arena_record_solve(UUID, UUID, SMALLINT, SMALLINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION arena_accept(UUID, UUID)                           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION arena_leave(UUID, UUID)                            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION arena_void(UUID)                                   FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION arena_settle(UUID, UUID, TEXT)                     TO service_role;
GRANT EXECUTE ON FUNCTION arena_timeout(UUID)                                TO service_role;
GRANT EXECUTE ON FUNCTION arena_record_solve(UUID, UUID, SMALLINT, SMALLINT) TO service_role;
GRANT EXECUTE ON FUNCTION arena_accept(UUID, UUID)                           TO service_role;
GRANT EXECUTE ON FUNCTION arena_leave(UUID, UUID)                            TO service_role;
GRANT EXECUTE ON FUNCTION arena_void(UUID)                                   TO service_role;

-- ─── Canales en tiempo real privados ─────────────────────────────────────────
-- El lobby (arena-lobby-<aula>) y cada duelo (arena-duel-<duelo>) son canales
-- privados de Supabase Realtime: conocer el id no alcanza para entrar.
-- · Lobby: solo alumnos de ESA aula (y el docente).
-- · Duelo: solo los dos jugadores (y el docente).
-- Vale para leer (recibir avisos / ver quién está) y para escribir (mandarlos).
DROP POLICY IF EXISTS "arena_realtime_read"  ON realtime.messages;
DROP POLICY IF EXISTS "arena_realtime_write" ON realtime.messages;

CREATE OR REPLACE FUNCTION arena_can_join(p_topic TEXT)
RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN p_topic LIKE 'arena-lobby-%' THEN
      is_admin() OR substring(p_topic FROM 13) = my_aula_id()::TEXT
    WHEN p_topic LIKE 'arena-duel-%' THEN
      is_admin() OR EXISTS (
        SELECT 1 FROM arena_matches m
         WHERE m.id::TEXT = substring(p_topic FROM 12) AND auth.uid() IN (m.player_a, m.player_b)
      )
    ELSE FALSE
  END;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE POLICY "arena_realtime_read" ON realtime.messages FOR SELECT TO authenticated
  USING (extension IN ('broadcast', 'presence') AND arena_can_join(realtime.topic()));
CREATE POLICY "arena_realtime_write" ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (extension IN ('broadcast', 'presence') AND arena_can_join(realtime.topic()));
