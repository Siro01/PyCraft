-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — hace que handle_new_user() nunca bloquee la creación de un
-- usuario en auth.users, aunque falle el insert en profiles. El error real
-- queda como WARNING en los Postgres Logs para poder diagnosticarlo.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
