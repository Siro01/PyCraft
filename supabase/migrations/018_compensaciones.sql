-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — Compensaciones del docente
-- El docente le puede dar diamantes y/o XP a un alumno desde el panel admin
-- (pestaña Compensar), con un motivo. Se guardan en arena_ledger con
-- reason = 'compensacion': el juego ya suma esa tabla al saldo de diamantes
-- (delta) y al nivel (xp, columna de 017), en el navegador y en el servidor.
-- Deshacer una compensación = borrar su fila.
-- Run this in Supabase SQL Editor, after 017_arena_2v2_revancha.sql. Se puede
-- volver a correr entero: no borra datos.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE arena_ledger ADD COLUMN IF NOT EXISTS reason     TEXT;
ALTER TABLE arena_ledger ADD COLUMN IF NOT EXISTS note       TEXT CHECK (note IS NULL OR char_length(note) <= 160);
ALTER TABLE arena_ledger ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS arena_ledger_reason_idx ON arena_ledger (reason, user_id) WHERE reason IS NOT NULL;

-- Reparto final (reemplaza al de 017): el tope diario del XP de revancha no
-- cuenta las compensaciones del docente (si no, compensar XP dejaba al alumno
-- sin el XP de revancha de ese día).
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
        SELECT COALESCE(SUM(xp), 0) INTO today_xp FROM arena_ledger WHERE user_id = p.user_id AND created_at >= day_start AND reason IS NULL;
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
