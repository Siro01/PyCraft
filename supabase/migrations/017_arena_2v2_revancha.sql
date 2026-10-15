-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — 2 vs 2: revancha y un poco de XP al repetir
-- · XP de revancha: si un duelo 2 vs 2 no da el XP del "primer duelo" (ya
--   jugaste contra esos rivales en ese acto), igual suma +2 al ganar y +1 al
--   perder, con tope de 10 por día. Se guarda en arena_ledger.xp (con
--   delta 0), así "anular" lo devuelve junto con los diamantes.
-- · Revancha: arena_rooms.rematch_id apunta a la sala nueva que armó alguno de
--   los cuatro; los demás que tocan "revancha" caen en esa misma.
-- · La misma regla está en TypeScript (lib/game/arena/team.ts): si cambia
--   algo acá, cambiar allá.
-- Run this in Supabase SQL Editor, after 016_arena_2v2.sql. Se puede volver a
-- correr entero: no borra datos.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE arena_ledger ADD COLUMN IF NOT EXISTS xp SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE arena_rooms  ADD COLUMN IF NOT EXISTS rematch_id UUID REFERENCES arena_rooms(id) ON DELETE SET NULL;

-- Reparto final (reemplaza al de 016: suma el XP de revancha).
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
  day_start TIMESTAMPTZ := date_trunc('day', NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires') AT TIME ZONE 'America/Argentina/Buenos_Aires';
  today_xp INTEGER;
  give INTEGER;
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
      -- Revancha (ningún rival nuevo): un poco de XP, con tope diario.
      IF NOT awarded THEN
        SELECT COALESCE(SUM(xp), 0) INTO today_xp FROM arena_ledger WHERE user_id = p.user_id AND created_at >= day_start;
        give := LEAST(CASE WHEN won THEN 2 ELSE 1 END, GREATEST(0, 10 - today_xp));
        IF give > 0 THEN
          INSERT INTO arena_ledger (user_id, room_id, delta, xp) VALUES (p.user_id, p_room, 0, give);
        END IF;
      END IF;
    END IF;
  END LOOP;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION room_settle(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION room_settle(UUID, TEXT, TEXT) TO service_role;
