-- ─────────────────────────────────────────────────────────────────────────────
-- PySQLBoss Rush — Schema inicial
-- Run this in Supabase SQL Editor or via supabase db push
-- ─────────────────────────────────────────────────────────────────────────────

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Bosses (seeded from lib/game/bosses.ts, managed via admin panel)
CREATE TABLE IF NOT EXISTS bosses (
  id          TEXT PRIMARY KEY,
  class_number INTEGER NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('python', 'sql', 'mixed', 'final')),
  topic       TEXT NOT NULL,
  description TEXT,
  hp_max      INTEGER NOT NULL DEFAULT 300,
  color       TEXT NOT NULL DEFAULT '#6366F1',
  is_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Battle records (one active + one completed per student per boss)
CREATE TABLE IF NOT EXISTS battle_records (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  boss_id       TEXT REFERENCES bosses(id) NOT NULL,
  hp_current    INTEGER NOT NULL,
  is_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  attacks_count INTEGER NOT NULL DEFAULT 0,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- Individual attack submissions
CREATE TABLE IF NOT EXISTS attack_records (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id      UUID REFERENCES battle_records(id) ON DELETE CASCADE NOT NULL,
  user_id        UUID REFERENCES auth.users(id) NOT NULL,
  challenge_id   TEXT NOT NULL,
  submitted_code TEXT NOT NULL,
  is_correct     BOOLEAN NOT NULL,
  damage_dealt   INTEGER NOT NULL DEFAULT 0,
  submitted_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bosses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attack_records ENABLE ROW LEVEL SECURITY;

-- Helper function: is the current user admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Profiles
CREATE POLICY "own_profile_read"    ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "admin_profile_all"   ON profiles FOR ALL    USING (is_admin());

-- Bosses: anyone authenticated can read enabled bosses; admin can do anything
CREATE POLICY "read_enabled_bosses" ON bosses FOR SELECT USING (is_enabled = TRUE OR is_admin());
CREATE POLICY "admin_boss_all"      ON bosses FOR ALL    USING (is_admin());

-- Battle records: own rows + admin reads all
CREATE POLICY "own_battles"         ON battle_records FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "admin_battles_read"  ON battle_records FOR SELECT USING (is_admin());

-- Attack records: own rows + admin reads all
CREATE POLICY "own_attacks"         ON attack_records FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "admin_attacks_read"  ON attack_records FOR SELECT USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: create profile on signup
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if no profile exists (admin-created users already have one)
  INSERT INTO profiles (id, username, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: insert all 14 bosses
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO bosses (id, class_number, name, type, topic, description, hp_max, color, is_enabled)
VALUES
  ('creeper-formulario',  1,  'Creeper Formulario',     'python', 'Variables y tipos de datos',     'Asigna las variables correctas antes de que la bomba explote.',                      150, '#22C55E', TRUE),
  ('guardian-puerta',     2,  'Guardián de la Puerta',  'python', 'Condicionales if / elif / else', 'Solo la condición correcta abre el portal al siguiente nivel.',                    180, '#4ADE80', FALSE),
  ('golem-infinito',      3,  'Golem Infinito',         'python', 'Bucles for y while',             'Ejecuta exactamente las iteraciones necesarias. Ni una más.',                     200, '#86EFAC', FALSE),
  ('mercader-abismo',     4,  'Mercader del Abismo',    'python', 'Listas de diccionarios',         'Construye el inventario exacto que el mercader exige.',                           220, '#16A34A', FALSE),
  ('maestro-craftero',    5,  'Maestro Craftero',       'python', 'Funciones con parámetros',       'Define la función correcta. def es tu espada.',                                   240, '#15803D', FALSE),
  ('archivista',          6,  'El Archivista',          'python', 'De listas a tablas',             'Traduce la lista de Python al esquema de tabla correcto.',                        260, '#166534', FALSE),
  ('constructor-vacio',   7,  'Constructor del Vacío',  'sql',    'CREATE TABLE · INSERT INTO',     'Crea la tabla con los tipos correctos. Puebla el vacío.',                         280, '#38BDF8', FALSE),
  ('oraculo-oscuro',      8,  'Oráculo Oscuro',         'sql',    'SELECT · WHERE · ORDER BY',      'La consulta exacta revela la verdad. El WHERE es la clave.',                      300, '#7DD3FC', FALSE),
  ('contador-almas',      9,  'Contador de Almas',      'sql',    'COUNT · SUM · AVG · GROUP BY',   'Agrega los datos correctamente. Sin GROUP BY no hay victoria.',                   320, '#0EA5E9', FALSE),
  ('falsificador',        10, 'El Falsificador',        'sql',    'UPDATE · DELETE',                'Modifica solo lo necesario. Un DELETE sin WHERE te destruye.',                    340, '#0284C7', FALSE),
  ('el-nexo',             11, 'El Nexo',                'mixed',  'Python + sqlite3',               'Conecta los dos mundos. cursor.execute es el puente.',                            360, '#A78BFA', FALSE),
  ('la-hydra',            12, 'La Hydra',               'mixed',  'Proyecto: agregar y listar',     'Corta una cabeza y crecen dos. Persiste los datos o vuelven.',                   380, '#8B5CF6', FALSE),
  ('dragon-rojo',         13, 'Dragón Rojo',            'mixed',  'Proyecto: buscar, quitar, actualizar', 'buscar_item + quitar con confirmación + UPDATE preciso.',                  400, '#7C3AED', FALSE),
  ('el-arquitecto',       14, 'El Arquitecto',          'final',  'Sistema completo · todo integrado',    'El jefe que diseñó el mundo. Demuestra que entendés el sistema.',          500, '#F59E0B', FALSE)
ON CONFLICT (id) DO NOTHING;
