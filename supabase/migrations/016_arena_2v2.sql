-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — La Arena 2 vs 2 (equipos Espada y Escudo)
-- · Salas de 4 lugares. Cada equipo recibe los mismos 6 ejercicios, en dos
--   columnas de 3 (lugar 1: idx 0-2, lugar 2: idx 3-5).
-- · RELEVO: quien terminó su columna se lleva el último ejercicio libre de su
--   compañero. Uno por persona por duelo, salvo que el compañero se haya ido.
-- · El docente puede ocupar un lugar: resuelve ejercicios más difíciles
--   (columna 6-8), no hace relevo y no gana ni pierde diamantes ni XP.
-- · Gana el equipo que completa sus 6. Con el tiempo cumplido (8 min): más
--   resueltos; empatados, el que llegó antes; nadie resolvió, empate.
-- · Diamantes por alumno (5 o 10) y XP con la misma regla anti-farmeo del 1 vs 1
--   (arena_xp: una vez por rival y acto). Comparte arena_ledger y arena_xp.
-- · La misma lógica está en TypeScript (lib/game/arena/team.ts) para el
--   simulador de /demo/arena: si cambia algo acá, cambiar allá.
-- Run this in Supabase SQL Editor, after 015_raids_secretos.sql. Se puede
-- volver a correr entero: no borra datos.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS arena_rooms (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id        UUID REFERENCES aulas(id) ON DELETE SET NULL,
  leader_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boss_id        TEXT NOT NULL,
  act_key        TEXT NOT NULL,
  stake          SMALLINT NOT NULL DEFAULT 0 CHECK (stake IN (0, 5, 10)),
  status         TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'active', 'finished', 'cancelled')),
  exercises      JSONB NOT NULL DEFAULT '[]'::jsonb,   -- públicos: 0-5 comunes, 6-8 del docente
  needs_teacher  BOOLEAN NOT NULL DEFAULT FALSE,
  winner_team    TEXT CHECK (winner_team IN ('espada', 'escudo')),
  end_reason     TEXT CHECK (end_reason IN ('solved', 'timeout', 'forfeit', 'draw', 'voided')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at     TIMESTAMPTZ,
  ends_at        TIMESTAMPTZ,
  finished_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS arena_rooms_aula_idx ON arena_rooms (aula_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS arena_room_players (
  room_id    UUID NOT NULL REFERENCES arena_rooms(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team       TEXT NOT NULL CHECK (team IN ('espada', 'escudo')),
  slot       SMALLINT NOT NULL CHECK (slot IN (1, 2)),
  role       TEXT NOT NULL DEFAULT 'alumno' CHECK (role IN ('alumno', 'docente')),
  ready      BOOLEAN NOT NULL DEFAULT FALSE,
  relays     SMALLINT NOT NULL DEFAULT 0,
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at    TIMESTAMPTZ,
  PRIMARY KEY (room_id, user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS arena_room_seat_idx ON arena_room_players (room_id, team, slot) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS arena_room_players_user_idx ON arena_room_players (user_id);

CREATE TABLE IF NOT EXISTS arena_room_tasks (
  room_id     UUID NOT NULL REFERENCES arena_rooms(id) ON DELETE CASCADE,
  team        TEXT NOT NULL CHECK (team IN ('espada', 'escudo')),
  idx         SMALLINT NOT NULL CHECK (idx BETWEEN 0 AND 5),
  owner_slot  SMALLINT NOT NULL CHECK (owner_slot IN (1, 2)),
  ex          SMALLINT NOT NULL,
  claimed_by  UUID,
  solved_by   UUID,
  solved_at   TIMESTAMPTZ,
  PRIMARY KEY (room_id, team, idx)
);

CREATE TABLE IF NOT EXISTS arena_room_secrets (
  room_id   UUID NOT NULL REFERENCES arena_rooms(id) ON DELETE CASCADE,
  ex        SMALLINT NOT NULL,
  expected  TEXT NOT NULL,
  PRIMARY KEY (room_id, ex)
);

ALTER TABLE arena_ledger ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES arena_rooms(id) ON DELETE SET NULL;
ALTER TABLE arena_xp     ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES arena_rooms(id) ON DELETE SET NULL;

-- ─── RLS: lectura de lo propio; nadie escribe desde el navegador ────────────
ALTER TABLE arena_rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_room_players  ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_room_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_room_secrets  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_arena_rooms"        ON arena_rooms;
DROP POLICY IF EXISTS "read_arena_room_players" ON arena_room_players;
CREATE POLICY "read_arena_rooms" ON arena_rooms FOR SELECT USING (aula_id = my_aula_id() OR is_admin());
CREATE POLICY "read_arena_room_players" ON arena_room_players FOR SELECT
  USING (is_admin() OR EXISTS (SELECT 1 FROM arena_rooms r WHERE r.id = room_id AND r.aula_id = my_aula_id()));
-- arena_room_tasks y arena_room_secrets: sin policies (solo el servidor).

-- ─── Funciones (solo el servidor las llama) ─────────────────────────────────

-- Reparto final: diamantes por alumno y XP una vez por rival nuevo en el acto.
CREATE OR REPLACE FUNCTION room_settle(p_room UUID, p_winner TEXT, p_reason TEXT)
RETURNS arena_rooms AS $$
DECLARE
  r arena_rooms;
  p RECORD;
  rv RECORD;
  solved INTEGER;
  won BOOLEAN;
  awarded BOOLEAN;
  n INTEGER;
BEGIN
  SELECT * INTO r FROM arena_rooms WHERE id = p_room FOR UPDATE;
  IF r.status <> 'active' THEN RETURN r; END IF;
  UPDATE arena_rooms SET status = 'finished', winner_team = p_winner, end_reason = p_reason, finished_at = NOW()
   WHERE id = p_room RETURNING * INTO r;
  DELETE FROM arena_room_secrets WHERE room_id = p_room;
  IF p_winner IS NULL THEN RETURN r; END IF;

  FOR p IN SELECT * FROM arena_room_players WHERE room_id = p_room AND role = 'alumno' LOOP
    won := p.team = p_winner;
    IF r.stake > 0 THEN
      INSERT INTO arena_ledger (user_id, room_id, delta) VALUES (p.user_id, p_room, CASE WHEN won THEN r.stake ELSE -r.stake END);
    END IF;
    SELECT COUNT(*) INTO solved FROM arena_room_tasks WHERE room_id = p_room AND solved_by = p.user_id;
    IF solved > 0 THEN
      awarded := FALSE;
      FOR rv IN SELECT user_id FROM arena_room_players WHERE room_id = p_room AND role = 'alumno' AND team <> p.team LOOP
        INSERT INTO arena_xp (user_id, opponent_id, act_key, xp, room_id)
        VALUES (p.user_id, rv.user_id, r.act_key, CASE WHEN awarded THEN 0 WHEN won THEN 15 ELSE 5 END, p_room)
        ON CONFLICT DO NOTHING;
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n > 0 THEN awarded := TRUE; END IF;
      END LOOP;
    END IF;
  END LOOP;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Se cumplió el tiempo.
CREATE OR REPLACE FUNCTION room_timeout(p_room UUID)
RETURNS arena_rooms AS $$
DECLARE
  r arena_rooms;
  a INTEGER; b INTEGER;
  la TIMESTAMPTZ; lb TIMESTAMPTZ;
  w TEXT;
BEGIN
  SELECT * INTO r FROM arena_rooms WHERE id = p_room FOR UPDATE;
  IF r.status <> 'active' OR NOW() < r.ends_at THEN RETURN r; END IF;
  SELECT COUNT(*), MAX(solved_at) INTO a, la FROM arena_room_tasks WHERE room_id = p_room AND team = 'espada' AND solved_by IS NOT NULL;
  SELECT COUNT(*), MAX(solved_at) INTO b, lb FROM arena_room_tasks WHERE room_id = p_room AND team = 'escudo' AND solved_by IS NOT NULL;
  IF a > b THEN w := 'espada';
  ELSIF b > a THEN w := 'escudo';
  ELSIF a = 0 THEN w := NULL;
  ELSIF la <= lb THEN w := 'espada';
  ELSE w := 'escudo';
  END IF;
  RETURN room_settle(p_room, w, CASE WHEN w IS NULL THEN 'draw' ELSE 'timeout' END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ocupar (o cambiar de) lugar en una sala que todavía no arrancó.
CREATE OR REPLACE FUNCTION room_seat(p_room UUID, p_user UUID, p_team TEXT, p_slot SMALLINT, p_role TEXT)
RETURNS arena_rooms AS $$
DECLARE
  r arena_rooms;
BEGIN
  SELECT * INTO r FROM arena_rooms WHERE id = p_room FOR UPDATE;
  IF r.status <> 'lobby' THEN RAISE EXCEPTION 'arena: la sala ya arrancó'; END IF;
  IF EXISTS (SELECT 1 FROM arena_room_players WHERE room_id = p_room AND team = p_team AND slot = p_slot AND left_at IS NULL AND user_id <> p_user) THEN
    RAISE EXCEPTION 'arena: ese lugar ya está ocupado';
  END IF;
  INSERT INTO arena_room_players (room_id, user_id, team, slot, role)
  VALUES (p_room, p_user, p_team, p_slot, p_role)
  ON CONFLICT (room_id, user_id) DO UPDATE SET team = p_team, slot = p_slot, ready = FALSE, left_at = NULL, last_seen = NOW();
  -- Cambió el equipo: nadie queda "listo" sin ver el nuevo armado.
  UPDATE arena_room_players SET ready = FALSE WHERE room_id = p_room;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Listo / no listo. Con los 4 lugares ocupados y todos listos, arranca:
-- 4 s de cuenta regresiva + 8 minutos, y cada uno toma el primero de su columna.
CREATE OR REPLACE FUNCTION room_ready(p_room UUID, p_user UUID, p_ready BOOLEAN)
RETURNS arena_rooms AS $$
DECLARE
  r arena_rooms;
  t TEXT;
  i SMALLINT;
  owner arena_room_players;
BEGIN
  SELECT * INTO r FROM arena_rooms WHERE id = p_room FOR UPDATE;
  IF r.status <> 'lobby' THEN RETURN r; END IF;
  UPDATE arena_room_players SET ready = p_ready, last_seen = NOW() WHERE room_id = p_room AND user_id = p_user AND left_at IS NULL;
  IF (SELECT COUNT(*) FROM arena_room_players WHERE room_id = p_room AND left_at IS NULL AND ready) < 4 THEN RETURN r; END IF;

  FOREACH t IN ARRAY ARRAY['espada', 'escudo'] LOOP
    FOR i IN 0..5 LOOP
      SELECT * INTO owner FROM arena_room_players
       WHERE room_id = p_room AND team = t AND slot = CASE WHEN i < 3 THEN 1 ELSE 2 END AND left_at IS NULL;
      INSERT INTO arena_room_tasks (room_id, team, idx, owner_slot, ex, claimed_by)
      VALUES (p_room, t, i, CASE WHEN i < 3 THEN 1 ELSE 2 END,
              CASE WHEN owner.role = 'docente' THEN 6 + (i % 3) ELSE i END,
              CASE WHEN i % 3 = 0 THEN owner.user_id ELSE NULL END)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
  UPDATE arena_rooms
     SET status = 'active', needs_teacher = FALSE,
         started_at = NOW() + INTERVAL '4 seconds', ends_at = NOW() + INTERVAL '484 seconds'
   WHERE id = p_room RETURNING * INTO r;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Un acierto validado por el servidor: marca el ejercicio y toma el siguiente
-- de su propia columna. Si el equipo completó los 6, gana.
CREATE OR REPLACE FUNCTION room_solve(p_room UUID, p_user UUID, p_idx SMALLINT)
RETURNS arena_rooms AS $$
DECLARE
  r arena_rooms;
  me arena_room_players;
  nxt SMALLINT;
BEGIN
  SELECT * INTO r FROM arena_rooms WHERE id = p_room FOR UPDATE;
  IF r.status <> 'active' THEN RETURN r; END IF;
  IF NOW() >= r.ends_at THEN RETURN room_timeout(p_room); END IF;
  SELECT * INTO me FROM arena_room_players WHERE room_id = p_room AND user_id = p_user;
  UPDATE arena_room_tasks SET solved_by = p_user, solved_at = NOW()
   WHERE room_id = p_room AND team = me.team AND idx = p_idx AND claimed_by = p_user AND solved_by IS NULL;
  IF NOT FOUND THEN RETURN r; END IF;
  UPDATE arena_room_players SET last_seen = NOW() WHERE room_id = p_room AND user_id = p_user;
  SELECT idx INTO nxt FROM arena_room_tasks
   WHERE room_id = p_room AND team = me.team AND owner_slot = me.slot AND solved_by IS NULL AND claimed_by IS NULL
   ORDER BY idx LIMIT 1;
  IF nxt IS NOT NULL THEN
    UPDATE arena_room_tasks SET claimed_by = p_user WHERE room_id = p_room AND team = me.team AND idx = nxt;
  END IF;
  IF (SELECT COUNT(*) FROM arena_room_tasks WHERE room_id = p_room AND team = me.team AND solved_by IS NOT NULL) >= 6 THEN
    RETURN room_settle(p_room, me.team, 'solved');
  END IF;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Relevo: el último ejercicio libre del compañero. Uno por persona, salvo que
-- el compañero se haya ido (p_gone_secs sin señales): ahí se puede seguir
-- tomando, y lo que él tenía sin resolver vuelve a quedar libre.
CREATE OR REPLACE FUNCTION room_relay(p_room UUID, p_user UUID, p_gone_secs INTEGER)
RETURNS arena_rooms AS $$
DECLARE
  r arena_rooms;
  me arena_room_players;
  mate arena_room_players;
  mate_gone BOOLEAN;
  pick SMALLINT;
BEGIN
  SELECT * INTO r FROM arena_rooms WHERE id = p_room FOR UPDATE;
  IF r.status <> 'active' OR NOW() >= r.ends_at THEN RETURN r; END IF;
  SELECT * INTO me FROM arena_room_players WHERE room_id = p_room AND user_id = p_user AND left_at IS NULL;
  IF me.user_id IS NULL THEN RETURN r; END IF;
  IF me.role = 'docente' THEN RAISE EXCEPTION 'arena: el docente no hace relevo'; END IF;
  IF EXISTS (
    SELECT 1 FROM arena_room_tasks WHERE room_id = p_room AND team = me.team AND solved_by IS NULL
       AND (claimed_by = p_user OR (owner_slot = me.slot AND claimed_by IS NULL))
  ) THEN RAISE EXCEPTION 'arena: primero terminá tu columna'; END IF;

  SELECT * INTO mate FROM arena_room_players WHERE room_id = p_room AND team = me.team AND slot <> me.slot;
  mate_gone := mate.user_id IS NULL OR mate.left_at IS NOT NULL OR mate.last_seen < NOW() - make_interval(secs => p_gone_secs);
  IF me.relays >= 1 AND NOT mate_gone THEN RAISE EXCEPTION 'arena: ya usaste tu relevo'; END IF;
  IF mate_gone AND mate.user_id IS NOT NULL THEN
    UPDATE arena_room_tasks SET claimed_by = NULL WHERE room_id = p_room AND claimed_by = mate.user_id AND solved_by IS NULL;
  END IF;

  SELECT idx INTO pick FROM arena_room_tasks
   WHERE room_id = p_room AND team = me.team AND owner_slot <> me.slot AND solved_by IS NULL AND claimed_by IS NULL
   ORDER BY idx DESC LIMIT 1;
  IF pick IS NULL THEN RETURN r; END IF;
  UPDATE arena_room_tasks SET claimed_by = p_user WHERE room_id = p_room AND team = me.team AND idx = pick;
  UPDATE arena_room_players SET relays = relays + 1, last_seen = NOW() WHERE room_id = p_room AND user_id = p_user;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Irse. En la sala de espera: si se va quien la armó, se cierra; si no, se
-- libera el lugar. En el duelo: su compañero sigue; si el equipo se queda sin
-- nadie, pierde.
CREATE OR REPLACE FUNCTION room_leave(p_room UUID, p_user UUID)
RETURNS arena_rooms AS $$
DECLARE
  r arena_rooms;
  me arena_room_players;
BEGIN
  SELECT * INTO r FROM arena_rooms WHERE id = p_room FOR UPDATE;
  SELECT * INTO me FROM arena_room_players WHERE room_id = p_room AND user_id = p_user AND left_at IS NULL;
  IF me.user_id IS NULL THEN RETURN r; END IF;
  IF r.status = 'lobby' THEN
    IF r.leader_id = p_user THEN
      UPDATE arena_rooms SET status = 'cancelled', finished_at = NOW() WHERE id = p_room RETURNING * INTO r;
    ELSE
      DELETE FROM arena_room_players WHERE room_id = p_room AND user_id = p_user;
      UPDATE arena_room_players SET ready = FALSE WHERE room_id = p_room;
    END IF;
    RETURN r;
  END IF;
  IF r.status <> 'active' THEN RETURN r; END IF;
  UPDATE arena_room_players SET left_at = NOW() WHERE room_id = p_room AND user_id = p_user;
  UPDATE arena_room_tasks SET claimed_by = NULL WHERE room_id = p_room AND claimed_by = p_user AND solved_by IS NULL;
  IF NOT EXISTS (SELECT 1 FROM arena_room_players WHERE room_id = p_room AND team = me.team AND left_at IS NULL) THEN
    RETURN room_settle(p_room, CASE WHEN me.team = 'espada' THEN 'escudo' ELSE 'espada' END, 'forfeit');
  END IF;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- El docente anula un duelo 2 vs 2: devuelve diamantes y XP.
CREATE OR REPLACE FUNCTION room_void(p_room UUID)
RETURNS arena_rooms AS $$
DECLARE
  r arena_rooms;
BEGIN
  DELETE FROM arena_ledger WHERE room_id = p_room;
  DELETE FROM arena_xp WHERE room_id = p_room;
  DELETE FROM arena_room_secrets WHERE room_id = p_room;
  UPDATE arena_rooms SET status = 'finished', winner_team = NULL, end_reason = 'voided', finished_at = COALESCE(finished_at, NOW())
   WHERE id = p_room RETURNING * INTO r;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION room_settle(UUID, TEXT, TEXT)                      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION room_timeout(UUID)                                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION room_seat(UUID, UUID, TEXT, SMALLINT, TEXT)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION room_ready(UUID, UUID, BOOLEAN)                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION room_solve(UUID, UUID, SMALLINT)                   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION room_relay(UUID, UUID, INTEGER)                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION room_leave(UUID, UUID)                             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION room_void(UUID)                                    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION room_settle(UUID, TEXT, TEXT)                   TO service_role;
GRANT EXECUTE ON FUNCTION room_timeout(UUID)                              TO service_role;
GRANT EXECUTE ON FUNCTION room_seat(UUID, UUID, TEXT, SMALLINT, TEXT)     TO service_role;
GRANT EXECUTE ON FUNCTION room_ready(UUID, UUID, BOOLEAN)                 TO service_role;
GRANT EXECUTE ON FUNCTION room_solve(UUID, UUID, SMALLINT)                TO service_role;
GRANT EXECUTE ON FUNCTION room_relay(UUID, UUID, INTEGER)                 TO service_role;
GRANT EXECUTE ON FUNCTION room_leave(UUID, UUID)                          TO service_role;
GRANT EXECUTE ON FUNCTION room_void(UUID)                                 TO service_role;

-- ─── Canales en tiempo real: suma arena-room-<sala> ─────────────────────────
-- (reemplaza la de 013: misma lógica + las salas; solo entran sus integrantes)
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
    WHEN p_topic LIKE 'arena-room-%' THEN
      is_admin() OR EXISTS (
        SELECT 1 FROM arena_room_players p
         WHERE p.room_id::TEXT = substring(p_topic FROM 12) AND p.user_id = auth.uid()
      )
    ELSE FALSE
  END;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;
