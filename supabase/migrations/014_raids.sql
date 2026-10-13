-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — Raids: El Pistolero (y, más adelante, raids de jefes secretos)
-- · El Pistolero es el docente en vivo: «arma» el evento en un aula
--   (aulas.pistolero_armed) y lo dispara desde la Mesa. Toda el aula pelea
--   contra él; cada alumno recibe un ejercicio y el docente corrige.
-- · El cliente NUNCA escribe en estas tablas: todo pasa por /api/raid (service
--   role) y por las funciones de abajo, que mueven la vida y reparten el botín
--   de forma atómica.
-- · Las respuestas esperadas del Pistolero viven en el servidor
--   (lib/game/raid/pistolero-ejercicios.ts), no en la base.
-- Run this in Supabase SQL Editor, after 013_arena.sql. Se puede volver a
-- correr entero: no borra datos.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE aulas
  ADD COLUMN IF NOT EXISTS pistolero_armed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS raids (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id      UUID REFERENCES aulas(id) ON DELETE SET NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('pistolero', 'secreto')),
  boss_id      TEXT,                 -- jefe secreto (NULL en el Pistolero)
  leader_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- en el Pistolero, el docente
  status       TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'active', 'won', 'lost', 'cancelled')),
  boss_hp      INTEGER NOT NULL DEFAULT 0,
  boss_hp_max  INTEGER NOT NULL DEFAULT 0,
  team_hp      INTEGER,              -- vida compartida (Pistolero)
  team_hp_max  INTEGER,
  attacks      JSONB NOT NULL DEFAULT '{}'::jsonb,   -- usos de cada ataque: { "rafaga": 2, … }
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at   TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS raids_aula_idx ON raids (aula_id, created_at DESC);
-- Un solo Pistolero vivo por aula.
CREATE UNIQUE INDEX IF NOT EXISTS raids_one_live_pistolero ON raids (aula_id)
  WHERE kind = 'pistolero' AND status IN ('lobby', 'active');

CREATE TABLE IF NOT EXISTS raid_members (
  raid_id    UUID NOT NULL REFERENCES raids(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'alumno' CHECK (role IN ('alumno', 'docente')),
  hp         INTEGER NOT NULL DEFAULT 100,
  state      TEXT NOT NULL DEFAULT 'alive' CHECK (state IN ('alive', 'down', 'left')),
  solved     SMALLINT NOT NULL DEFAULT 0,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at    TIMESTAMPTZ,
  PRIMARY KEY (raid_id, user_id)
);
CREATE INDEX IF NOT EXISTS raid_members_user_idx ON raid_members (user_id);

-- Un ejercicio dado a un alumno. El docente puede dejar uno «en cola» antes de
-- que el alumno llegue (assigned_by), o cambiarlo en medio del duelo.
CREATE TABLE IF NOT EXISTS raid_tasks (
  id            BIGSERIAL PRIMARY KEY,
  raid_id       UUID NOT NULL REFERENCES raids(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'asignado'
                CHECK (status IN ('en_cola', 'asignado', 'enviado', 'correcto', 'incorrecto', 'cambiado')),
  code          TEXT,
  output        TEXT,
  auto_ok       BOOLEAN,             -- sugerencia del sistema (la salida coincide)
  assigned_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  judged_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at  TIMESTAMPTZ,
  judged_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS raid_tasks_raid_idx ON raid_tasks (raid_id, status);
CREATE INDEX IF NOT EXISTS raid_tasks_user_idx ON raid_tasks (raid_id, user_id);

-- Botín y castigos de las raids (diamantes y XP). Una fila por motivo y raid.
CREATE TABLE IF NOT EXISTS raid_ledger (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  raid_id     UUID REFERENCES raids(id) ON DELETE SET NULL,
  delta       INTEGER NOT NULL DEFAULT 0,
  xp          INTEGER NOT NULL DEFAULT 0,
  reason      TEXT NOT NULL,         -- 'pistolero' | 'raid-primera' | 'raid-revancha' | 'abandono'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, raid_id, reason)
);
CREATE INDEX IF NOT EXISTS raid_ledger_user_idx ON raid_ledger (user_id, created_at);

-- Premio de 40 diamantes de una raid de secretos: solo la primera vez por jefe.
CREATE TABLE IF NOT EXISTS raid_firsts (
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boss_id   TEXT NOT NULL,
  raid_id   UUID REFERENCES raids(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, boss_id)
);

-- ─── RLS: cada alumno lee lo suyo; nadie escribe desde el navegador ─────────
ALTER TABLE raids        ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_tasks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_ledger  ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_firsts  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_aula_raids"     ON raids;
DROP POLICY IF EXISTS "read_raid_members"   ON raid_members;
DROP POLICY IF EXISTS "read_own_raid_tasks" ON raid_tasks;
DROP POLICY IF EXISTS "read_own_raid_ledger" ON raid_ledger;
DROP POLICY IF EXISTS "read_own_raid_firsts" ON raid_firsts;
CREATE POLICY "read_aula_raids"      ON raids        FOR SELECT USING (aula_id = my_aula_id() OR is_admin());
CREATE POLICY "read_raid_members"    ON raid_members FOR SELECT USING (
  is_admin() OR EXISTS (SELECT 1 FROM raids r WHERE r.id = raid_id AND r.aula_id = my_aula_id()));
CREATE POLICY "read_own_raid_tasks"  ON raid_tasks   FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "read_own_raid_ledger" ON raid_ledger  FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "read_own_raid_firsts" ON raid_firsts  FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- ─── Funciones ──────────────────────────────────────────────────────────────
-- Constantes (las mismas que lib/game/raid/pistolero.ts): 2 de vida del
-- Pistolero por alumno, cada ✘ resta 4 a la vida del equipo (100), botín de
-- 30 diamantes + 20 XP para cada alumno con al menos un acierto.

-- Cierra la raid y reparte el botín (una sola vez).
CREATE OR REPLACE FUNCTION raid_settle(p_raid UUID, p_status TEXT)
RETURNS raids AS $$
DECLARE
  r raids;
BEGIN
  SELECT * INTO r FROM raids WHERE id = p_raid FOR UPDATE;
  IF r.status NOT IN ('lobby', 'active') THEN RETURN r; END IF;
  UPDATE raids SET status = p_status, finished_at = NOW() WHERE id = p_raid RETURNING * INTO r;
  -- Lo que quedó sin corregir ya no cuenta
  UPDATE raid_tasks SET status = 'cambiado' WHERE raid_id = p_raid AND status IN ('en_cola', 'asignado');

  IF p_status = 'won' AND r.kind = 'pistolero' THEN
    INSERT INTO raid_ledger (user_id, raid_id, delta, xp, reason)
    SELECT m.user_id, p_raid, 30, 20, 'pistolero'
      FROM raid_members m
     WHERE m.raid_id = p_raid AND m.role = 'alumno' AND m.solved > 0
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Suma (o resta) vida al jefe y al equipo; si alguna llega a 0, termina.
CREATE OR REPLACE FUNCTION raid_apply(p_raid UUID, p_boss_delta INTEGER, p_team_delta INTEGER)
RETURNS raids AS $$
DECLARE
  r raids;
BEGIN
  SELECT * INTO r FROM raids WHERE id = p_raid FOR UPDATE;
  IF r.status <> 'active' THEN RETURN r; END IF;
  UPDATE raids
     SET boss_hp = GREATEST(0, LEAST(boss_hp_max, boss_hp + p_boss_delta)),
         team_hp = CASE WHEN team_hp IS NULL THEN NULL ELSE GREATEST(0, LEAST(team_hp_max, team_hp + p_team_delta)) END
   WHERE id = p_raid
  RETURNING * INTO r;
  IF r.boss_hp <= 0 THEN RETURN raid_settle(p_raid, 'won'); END IF;
  IF r.team_hp IS NOT NULL AND r.team_hp <= 0 THEN RETURN raid_settle(p_raid, 'lost'); END IF;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- El docente corrige un envío. Solo cuenta una vez (de 'enviado' a ✔/✘).
CREATE OR REPLACE FUNCTION raid_judge(p_task BIGINT, p_ok BOOLEAN, p_judge UUID, p_miss_damage INTEGER)
RETURNS raids AS $$
DECLARE
  t raid_tasks;
  r raids;
BEGIN
  SELECT * INTO t FROM raid_tasks WHERE id = p_task FOR UPDATE;
  SELECT * INTO r FROM raids WHERE id = t.raid_id;
  IF t.status <> 'enviado' OR r.status <> 'active' THEN RETURN r; END IF;
  UPDATE raid_tasks
     SET status = CASE WHEN p_ok THEN 'correcto' ELSE 'incorrecto' END, judged_by = p_judge, judged_at = NOW()
   WHERE id = p_task;
  IF p_ok THEN
    UPDATE raid_members SET solved = solved + 1 WHERE raid_id = t.raid_id AND user_id = t.user_id;
    RETURN raid_apply(t.raid_id, -1, 0);
  END IF;
  RETURN raid_apply(t.raid_id, 0, -p_miss_damage);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Un alumno se suma. Si el duelo ya empezó, el Pistolero gana 2 de vida (y de máximo).
CREATE OR REPLACE FUNCTION raid_join(p_raid UUID, p_user UUID, p_role TEXT, p_hp_per_member INTEGER)
RETURNS raids AS $$
DECLARE
  r raids;
  added INTEGER;
BEGIN
  SELECT * INTO r FROM raids WHERE id = p_raid FOR UPDATE;
  IF r.status NOT IN ('lobby', 'active') THEN RETURN r; END IF;
  INSERT INTO raid_members (raid_id, user_id, role) VALUES (p_raid, p_user, p_role)
  ON CONFLICT (raid_id, user_id) DO UPDATE SET state = 'alive', left_at = NULL
  WHERE raid_members.state = 'left';
  GET DIAGNOSTICS added = ROW_COUNT;
  IF added > 0 AND p_role = 'alumno' AND r.status = 'active' THEN
    UPDATE raids SET boss_hp = boss_hp + p_hp_per_member, boss_hp_max = boss_hp_max + p_hp_per_member
     WHERE id = p_raid RETURNING * INTO r;
  END IF;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- El docente arranca el duelo: la vida sale de los alumnos que ya entraron.
CREATE OR REPLACE FUNCTION raid_start(p_raid UUID, p_hp_per_member INTEGER, p_team_hp INTEGER)
RETURNS raids AS $$
DECLARE
  r raids;
  n INTEGER;
BEGIN
  SELECT * INTO r FROM raids WHERE id = p_raid FOR UPDATE;
  IF r.status <> 'lobby' THEN RETURN r; END IF;
  SELECT COUNT(*) INTO n FROM raid_members WHERE raid_id = p_raid AND role = 'alumno' AND state <> 'left';
  UPDATE raids
     SET status = 'active', started_at = NOW(),
         boss_hp = GREATEST(4, n * p_hp_per_member), boss_hp_max = GREATEST(4, n * p_hp_per_member),
         team_hp = p_team_hp, team_hp_max = p_team_hp
   WHERE id = p_raid
  RETURNING * INTO r;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION raid_settle(UUID, TEXT)                     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION raid_apply(UUID, INTEGER, INTEGER)          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION raid_judge(BIGINT, BOOLEAN, UUID, INTEGER)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION raid_join(UUID, UUID, TEXT, INTEGER)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION raid_start(UUID, INTEGER, INTEGER)          FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION raid_settle(UUID, TEXT)                    TO service_role;
GRANT EXECUTE ON FUNCTION raid_apply(UUID, INTEGER, INTEGER)         TO service_role;
GRANT EXECUTE ON FUNCTION raid_judge(BIGINT, BOOLEAN, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION raid_join(UUID, UUID, TEXT, INTEGER)       TO service_role;
GRANT EXECUTE ON FUNCTION raid_start(UUID, INTEGER, INTEGER)         TO service_role;

-- ─── Canales en tiempo real privados ─────────────────────────────────────────
-- · raid-aula-<aula>: el aviso sorpresa del Pistolero (alumnos de esa aula).
-- · raid-<raid>:      la pelea (integrantes de esa raid y alumnos de su aula,
--                     así el que llega tarde ve el estado al entrar).
-- Se suman a las de la Arena (las policies permisivas se combinan con OR).
DROP POLICY IF EXISTS "raid_realtime_read"  ON realtime.messages;
DROP POLICY IF EXISTS "raid_realtime_write" ON realtime.messages;

CREATE OR REPLACE FUNCTION raid_can_join(p_topic TEXT)
RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN p_topic LIKE 'raid-aula-%' THEN
      is_admin() OR substring(p_topic FROM 11) = my_aula_id()::TEXT
    WHEN p_topic LIKE 'raid-%' THEN
      is_admin() OR EXISTS (
        SELECT 1 FROM raids r
         WHERE r.id::TEXT = substring(p_topic FROM 6) AND r.aula_id = my_aula_id()
      )
    ELSE FALSE
  END;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE POLICY "raid_realtime_read" ON realtime.messages FOR SELECT TO authenticated
  USING (extension IN ('broadcast', 'presence') AND raid_can_join(realtime.topic()));
CREATE POLICY "raid_realtime_write" ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (extension IN ('broadcast', 'presence') AND raid_can_join(realtime.topic()));
