-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — Raids contra los jefes secretos (equipos de 2 a 4)
-- · Cada alumno resuelve su propia serie (de los jefes que derrotó y de su
--   nivel); la vida del jefe es compartida y cada uno tiene la suya.
-- · Si un alumno cae, un compañero lo rescata con su próximo acierto (o con
--   el Botiquín). El equipo pierde cuando no queda nadie en pie.
-- · Ganar: 40 diamantes + 30 XP la PRIMERA vez por jefe (tope: 40 diamantes
--   por día desde raids); las revanchas dan 15 XP (una por jefe por día).
--   Perder no cuesta nada. Abandonar (o desconectarse más de 60 s) cuesta 5.
-- · Reusa las tablas de 014_raids.sql. Run this in Supabase SQL Editor, after
--   014_raids.sql. Se puede volver a correr entero.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE raid_members
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS series    JSONB NOT NULL DEFAULT '[]'::jsonb,  -- ids de desafíos de su serie
  ADD COLUMN IF NOT EXISTS step      SMALLINT NOT NULL DEFAULT 0,         -- por cuál va
  ADD COLUMN IF NOT EXISTS rescuing  UUID,                                -- a quién rescata con su próximo acierto
  ADD COLUMN IF NOT EXISTS tier      TEXT;

-- ─── Cierre con botín (reemplaza al de 014: suma la rama de los secretos) ───
CREATE OR REPLACE FUNCTION raid_settle(p_raid UUID, p_status TEXT)
RETURNS raids AS $$
DECLARE
  r raids;
  m RECORD;
  day_start TIMESTAMPTZ := date_trunc('day', NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires') AT TIME ZONE 'America/Argentina/Buenos_Aires';
  firsts_today INTEGER;
BEGIN
  SELECT * INTO r FROM raids WHERE id = p_raid FOR UPDATE;
  IF r.status NOT IN ('lobby', 'active') THEN RETURN r; END IF;
  UPDATE raids SET status = p_status, finished_at = NOW() WHERE id = p_raid RETURNING * INTO r;
  UPDATE raid_tasks SET status = 'cambiado' WHERE raid_id = p_raid AND status IN ('en_cola', 'asignado');

  IF p_status = 'won' AND r.kind = 'pistolero' THEN
    INSERT INTO raid_ledger (user_id, raid_id, delta, xp, reason)
    SELECT m2.user_id, p_raid, 30, 20, 'pistolero'
      FROM raid_members m2
     WHERE m2.raid_id = p_raid AND m2.role = 'alumno' AND m2.solved > 0
    ON CONFLICT DO NOTHING;
  END IF;

  IF p_status = 'won' AND r.kind = 'secreto' THEN
    FOR m IN SELECT user_id FROM raid_members WHERE raid_id = p_raid AND role = 'alumno' AND state <> 'left' LOOP
      SELECT COALESCE(SUM(delta), 0) INTO firsts_today FROM raid_ledger
       WHERE user_id = m.user_id AND reason = 'raid-primera' AND created_at >= day_start;
      IF NOT EXISTS (SELECT 1 FROM raid_firsts f WHERE f.user_id = m.user_id AND f.boss_id = r.boss_id) AND firsts_today < 40 THEN
        INSERT INTO raid_firsts (user_id, boss_id, raid_id) VALUES (m.user_id, r.boss_id, p_raid) ON CONFLICT DO NOTHING;
        INSERT INTO raid_ledger (user_id, raid_id, delta, xp, reason) VALUES (m.user_id, p_raid, 40, 30, 'raid-primera') ON CONFLICT DO NOTHING;
      ELSIF NOT EXISTS (
        SELECT 1 FROM raid_ledger l JOIN raids x ON x.id = l.raid_id
         WHERE l.user_id = m.user_id AND l.reason = 'raid-revancha' AND x.boss_id = r.boss_id AND l.created_at >= day_start
      ) THEN
        INSERT INTO raid_ledger (user_id, raid_id, delta, xp, reason) VALUES (m.user_id, p_raid, 0, 15, 'raid-revancha') ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Un envío ya corregido por el servidor (raids de secretos).
-- ✔: si estaba rescatando a alguien, lo levanta con p_rescue_hp; si no, le pega al jefe.
-- ✘: pierde p_miss de vida (a 0 queda caído) y el jefe se cura p_heal.
CREATE OR REPLACE FUNCTION raid_hit(p_raid UUID, p_user UUID, p_ok BOOLEAN, p_damage INTEGER, p_miss INTEGER, p_heal INTEGER, p_rescue_hp INTEGER)
RETURNS raids AS $$
DECLARE
  r raids;
  me raid_members;
BEGIN
  SELECT * INTO r FROM raids WHERE id = p_raid FOR UPDATE;
  IF r.status <> 'active' THEN RETURN r; END IF;
  SELECT * INTO me FROM raid_members WHERE raid_id = p_raid AND user_id = p_user FOR UPDATE;
  IF me.state IS DISTINCT FROM 'alive' THEN RETURN r; END IF;

  IF p_ok THEN
    UPDATE raid_members SET step = step + 1, solved = solved + 1, last_seen = NOW() WHERE raid_id = p_raid AND user_id = p_user;
    IF me.rescuing IS NOT NULL AND EXISTS (SELECT 1 FROM raid_members WHERE raid_id = p_raid AND user_id = me.rescuing AND state = 'down') THEN
      UPDATE raid_members SET state = 'alive', hp = p_rescue_hp WHERE raid_id = p_raid AND user_id = me.rescuing;
      UPDATE raid_members SET rescuing = NULL WHERE raid_id = p_raid AND user_id = p_user;
      RETURN r;
    END IF;
    UPDATE raid_members SET rescuing = NULL WHERE raid_id = p_raid AND user_id = p_user;
    RETURN raid_apply(p_raid, -p_damage, 0);
  END IF;

  UPDATE raid_members
     SET hp = GREATEST(0, hp - p_miss), last_seen = NOW(),
         state = CASE WHEN hp - p_miss <= 0 THEN 'down' ELSE state END,
         rescuing = CASE WHEN hp - p_miss <= 0 THEN NULL ELSE rescuing END
   WHERE raid_id = p_raid AND user_id = p_user;
  UPDATE raids SET boss_hp = LEAST(boss_hp_max, boss_hp + p_heal) WHERE id = p_raid RETURNING * INTO r;
  IF NOT EXISTS (SELECT 1 FROM raid_members WHERE raid_id = p_raid AND role = 'alumno' AND state = 'alive') THEN
    RETURN raid_settle(p_raid, 'lost');
  END IF;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Alguien se va (o se le cortó la conexión). En pelea, el alumno pierde
-- p_penalty diamantes; si el líder se va del lobby, la raid se cancela; si no
-- queda nadie en pie, el equipo pierde.
CREATE OR REPLACE FUNCTION raid_leave(p_raid UUID, p_user UUID, p_penalty INTEGER)
RETURNS raids AS $$
DECLARE
  r raids;
  me raid_members;
BEGIN
  SELECT * INTO r FROM raids WHERE id = p_raid FOR UPDATE;
  SELECT * INTO me FROM raid_members WHERE raid_id = p_raid AND user_id = p_user FOR UPDATE;
  IF me.user_id IS NULL OR me.state = 'left' OR r.status NOT IN ('lobby', 'active') THEN RETURN r; END IF;
  UPDATE raid_members SET state = 'left', left_at = NOW(), rescuing = NULL WHERE raid_id = p_raid AND user_id = p_user;
  UPDATE raid_members SET rescuing = NULL WHERE raid_id = p_raid AND rescuing = p_user;

  IF r.status = 'lobby' THEN
    IF r.leader_id = p_user THEN RETURN raid_settle(p_raid, 'cancelled'); END IF;
    RETURN r;
  END IF;
  IF me.role = 'alumno' AND p_penalty > 0 THEN
    INSERT INTO raid_ledger (user_id, raid_id, delta, xp, reason) VALUES (p_user, p_raid, -p_penalty, 0, 'abandono') ON CONFLICT DO NOTHING;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM raid_members WHERE raid_id = p_raid AND role = 'alumno' AND state = 'alive') THEN
    RETURN raid_settle(p_raid, 'lost');
  END IF;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION raid_hit(UUID, UUID, BOOLEAN, INTEGER, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION raid_leave(UUID, UUID, INTEGER)                                   FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION raid_hit(UUID, UUID, BOOLEAN, INTEGER, INTEGER, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION raid_leave(UUID, UUID, INTEGER)                                   TO service_role;
-- raid_settle cambió de cuerpo pero no de firma: conserva los permisos de 014.
