// Ejercicios prehechos del Pistolero (v1: en archivo; más adelante, editor en el panel).
//
// SOLO SERVIDOR: lo importa app/api/raid. Tiene las salidas esperadas y las
// soluciones, así que nunca tiene que terminar en el navegador de un alumno
// (la Mesa del docente recibe el catálogo por la API).
//
// Agregar uno: sumarlo a PISTOLERO_EXERCISES con un id nuevo y el jefe que enseña
// su tema en `needs` (así nadie recibe SQL sin haberlo visto). `expected` tiene
// que ser exactamente lo que imprime `solution` (lo comprueba
// scripts/check-pistolero.py). En SQL, cada fila es `col1|col2`.

import type { ChallengeTier, ChallengeType } from '@/types'

if (typeof window !== 'undefined') throw new Error('pistolero-ejercicios.ts es solo de servidor')

export interface PistoleroExercise {
  id: string
  /** Jefe que enseña el tema: solo se sortea a quien ya lo derrotó. */
  needs: string
  tier: ChallengeTier
  type: ChallengeType
  title: string
  description: string
  initialCode: string
  seedSQL?: string
  /** Pista que muestra la Bengala. */
  hint: string
  expected: string
  solution: string
}

const lines = (...l: string[]) => l.join('\n')

// El pueblo de los carteles de SE BUSCA (lo usan todos los ejercicios SQL)
const PUEBLO_SQL = lines(
  'CREATE TABLE buscados (id INTEGER PRIMARY KEY, nombre TEXT, pueblo TEXT, recompensa INTEGER);',
  "INSERT INTO buscados VALUES (1, 'Billy el Lento', 'Polvorín', 80);",
  "INSERT INTO buscados VALUES (2, 'Juana Gatillo', 'Cactus Seco', 150);",
  "INSERT INTO buscados VALUES (3, 'El Tuerto Ramírez', 'Polvorín', 200);",
  "INSERT INTO buscados VALUES (4, 'Rosita Pólvora', 'Río Bravo', 120);",
  "INSERT INTO buscados VALUES (5, 'Manco Pérez', 'Cactus Seco', 60);",
  "INSERT INTO buscados VALUES (6, 'Doc Bigotes', 'Polvorín', 90);",
  'CREATE TABLE pueblos (nombre TEXT PRIMARY KEY, sheriff TEXT);',
  "INSERT INTO pueblos VALUES ('Polvorín', 'Sheriff Lola');",
  "INSERT INTO pueblos VALUES ('Cactus Seco', 'Sheriff Pancho');",
  "INSERT INTO pueblos VALUES ('Río Bravo', 'Sheriff Tano');",
)

export const PISTOLERO_EXERCISES: PistoleroExercise[] = [
  // ══ JUNIOR: completar los huecos ___ ═════════════════════════════════════
  {
    id: 'pist-py-j1', needs: 'creeper-formulario', tier: 'junior', type: 'python', title: 'Seis balas',
    description: 'El tambor tiene 6 balas. Guardá ese número en la variable.',
    initialCode: lines('balas = ___', 'print("Balas en el tambor:", balas)'),
    hint: 'Reemplazá ___ por el número 6, sin comillas.',
    expected: 'Balas en el tambor: 6',
    solution: lines('balas = 6', 'print("Balas en el tambor:", balas)'),
  },
  {
    id: 'pist-py-j2', needs: 'golem-infinito', tier: 'junior', type: 'python', title: 'Cuenta regresiva',
    description: 'Contá 3, 2, 1 antes del disparo. Completá el paso del range para que cuente hacia atrás.',
    initialCode: lines('for i in range(3, 0, ___):', '    print(i)', 'print("¡Fuego!")'),
    hint: 'Para contar hacia atrás, el paso es negativo.',
    expected: lines('3', '2', '1', '¡Fuego!'),
    solution: lines('for i in range(3, 0, -1):', '    print(i)', 'print("¡Fuego!")'),
  },
  {
    id: 'pist-py-j3', needs: 'creeper-formulario', tier: 'junior', type: 'python', title: 'La recompensa se duplica',
    description: 'El sheriff duplicó la recompensa. Completá el operador.',
    initialCode: lines('recompensa = 50', 'recompensa = recompensa ___ 2', 'print(recompensa)'),
    hint: 'Duplicar es multiplicar por 2.',
    expected: '100',
    solution: lines('recompensa = 50', 'recompensa = recompensa * 2', 'print(recompensa)'),
  },
  {
    id: 'pist-py-j4', needs: 'guardian-puerta', tier: 'junior', type: 'python', title: '¿Quién desenfunda primero?',
    description: 'Si tu velocidad es mayor que 5, desenfundás primero. Completá la comparación.',
    initialCode: lines('velocidad = 8', 'if velocidad ___ 5:', '    print("Desenfundás primero")', 'else:', '    print("El Pistolero gana")'),
    hint: '"Mayor que" se escribe con >.',
    expected: 'Desenfundás primero',
    solution: lines('velocidad = 8', 'if velocidad > 5:', '    print("Desenfundás primero")', 'else:', '    print("El Pistolero gana")'),
  },
  {
    id: 'pist-sql-j1', needs: 'oraculo-oscuro', tier: 'junior', type: 'sql', title: 'Los más buscados',
    description: 'Traé el nombre de los forajidos con una recompensa mayor a 100.',
    initialCode: lines('SELECT nombre', 'FROM buscados', 'WHERE recompensa ___ 100;'),
    seedSQL: PUEBLO_SQL,
    hint: 'Usá el operador "mayor que".',
    expected: lines('Juana Gatillo', 'El Tuerto Ramírez', 'Rosita Pólvora'),
    solution: lines('SELECT nombre', 'FROM buscados', 'WHERE recompensa > 100;'),
  },
  {
    id: 'pist-sql-j2', needs: 'oraculo-oscuro', tier: 'junior', type: 'sql', title: 'Ordenar el cartel',
    description: 'Mostrá nombre y recompensa, de la recompensa más alta a la más baja.',
    initialCode: lines('SELECT nombre, recompensa', 'FROM buscados', 'ORDER BY recompensa ___;'),
    seedSQL: PUEBLO_SQL,
    hint: 'De mayor a menor es DESC.',
    expected: lines('El Tuerto Ramírez|200', 'Juana Gatillo|150', 'Rosita Pólvora|120', 'Doc Bigotes|90', 'Billy el Lento|80', 'Manco Pérez|60'),
    solution: lines('SELECT nombre, recompensa', 'FROM buscados', 'ORDER BY recompensa DESC;'),
  },

  // ══ TRAINEE: escribir un poco más ════════════════════════════════════════
  {
    id: 'pist-py-t1', needs: 'mercader-abismo', tier: 'trainee', type: 'python', title: 'Cargar el tambor',
    description: 'Usá un for para agregar 6 balas ("*") a la lista tambor. Al final se muestran todas juntas.',
    initialCode: lines('tambor = []', '# Agregá 6 balas al tambor con un for', '', 'print("".join(tambor))'),
    hint: 'for i in range(6): y adentro tambor.append("*")',
    expected: '******',
    solution: lines('tambor = []', 'for i in range(6):', '    tambor.append("*")', 'print("".join(tambor))'),
  },
  {
    id: 'pist-py-t2', needs: 'mercader-abismo', tier: 'trainee', type: 'python', title: 'Lista del saloon',
    description: 'Mostrá a cada cliente del saloon con su número: "1. Rosa", "2. Tito", "3. Juana".',
    initialCode: lines('clientes = ["Rosa", "Tito", "Juana"]', '# Mostrá cada cliente con su número'),
    hint: 'enumerate(clientes, 1) te da el número y el nombre juntos.',
    expected: lines('1. Rosa', '2. Tito', '3. Juana'),
    solution: lines('clientes = ["Rosa", "Tito", "Juana"]', 'for n, c in enumerate(clientes, 1):', '    print(f"{n}. {c}")'),
  },
  {
    id: 'pist-py-t3', needs: 'mercader-abismo', tier: 'trainee', type: 'python', title: 'Contar el botín',
    description: 'Sumá todas las bolsas de monedas y mostrá el total.',
    initialCode: lines('bolsas = [12, 30, 8, 50]', '# Sumá las bolsas y mostrá el total'),
    hint: 'Podés usar sum(bolsas) o un for con un acumulador.',
    expected: '100',
    solution: lines('bolsas = [12, 30, 8, 50]', 'print(sum(bolsas))'),
  },
  {
    id: 'pist-sql-t1', needs: 'contador-almas', tier: 'trainee', type: 'sql', title: 'Forajidos de Polvorín',
    description: '¿Cuántos forajidos hay en el pueblo Polvorín? Mostrá solo el número.',
    initialCode: lines('-- Contá los forajidos de Polvorín', 'SELECT'),
    seedSQL: PUEBLO_SQL,
    hint: "COUNT(*) con WHERE pueblo = 'Polvorín'",
    expected: '3',
    solution: "SELECT COUNT(*) FROM buscados WHERE pueblo = 'Polvorín';",
  },
  {
    id: 'pist-sql-t2', needs: 'contador-almas', tier: 'trainee', type: 'sql', title: 'Botín por pueblo',
    description: 'Mostrá cada pueblo con la suma de sus recompensas, ordenado por pueblo.',
    initialCode: lines('SELECT pueblo, ___', 'FROM buscados', 'GROUP BY ___', 'ORDER BY pueblo;'),
    seedSQL: PUEBLO_SQL,
    hint: 'SUM(recompensa) y agrupá por pueblo.',
    expected: lines('Cactus Seco|210', 'Polvorín|370', 'Río Bravo|120'),
    solution: lines('SELECT pueblo, SUM(recompensa)', 'FROM buscados', 'GROUP BY pueblo', 'ORDER BY pueblo;'),
  },

  // ══ SENIOR: sin guía ═════════════════════════════════════════════════════
  {
    id: 'pist-py-s1', needs: 'maestro-craftero', tier: 'senior', type: 'python', title: 'Duelo al amanecer',
    description: 'Escribí una función duelo(a, b) que reciba dos velocidades y devuelva "Gana A", "Gana B" o "Empate". Mostrá duelo(7, 3), duelo(2, 9) y duelo(5, 5), uno por línea.',
    initialCode: '',
    hint: 'Tres casos: a > b, b > a y el resto es empate. Usá return.',
    expected: lines('Gana A', 'Gana B', 'Empate'),
    solution: lines(
      'def duelo(a, b):', '    if a > b:', '        return "Gana A"', '    if b > a:', '        return "Gana B"', '    return "Empate"', '',
      'print(duelo(7, 3))', 'print(duelo(2, 9))', 'print(duelo(5, 5))',
    ),
  },
  {
    id: 'pist-py-s2', needs: 'mercader-abismo', tier: 'senior', type: 'python', title: 'Inventario de balas',
    description: 'Contá cuántas balas de cada tipo hay en el tambor y mostralas en orden alfabético con el formato "tipo: cantidad".',
    initialCode: 'tambor = ["plata", "plomo", "plata", "oro", "plomo", "plata"]',
    hint: 'Un diccionario para contar y sorted() para el orden.',
    expected: lines('oro: 1', 'plata: 3', 'plomo: 2'),
    solution: lines(
      'tambor = ["plata", "plomo", "plata", "oro", "plomo", "plata"]', 'cuenta = {}',
      'for b in tambor:', '    cuenta[b] = cuenta.get(b, 0) + 1',
      'for tipo in sorted(cuenta):', '    print(f"{tipo}: {cuenta[tipo]}")',
    ),
  },
  {
    id: 'pist-sql-s1', needs: 'contador-almas', tier: 'senior', type: 'sql', title: 'Pueblos peligrosos',
    description: 'Mostrá los pueblos que tienen más de un forajido y cuántos tienen, ordenados por pueblo.',
    initialCode: '',
    seedSQL: PUEBLO_SQL,
    hint: 'GROUP BY pueblo con HAVING COUNT(*) > 1.',
    expected: lines('Cactus Seco|2', 'Polvorín|3'),
    solution: lines('SELECT pueblo, COUNT(*)', 'FROM buscados', 'GROUP BY pueblo', 'HAVING COUNT(*) > 1', 'ORDER BY pueblo;'),
  },
  {
    id: 'pist-sql-s2', needs: 'falsificador', tier: 'senior', type: 'sql', title: 'Cada uno con su sheriff',
    description: 'Mostrá cada forajido con el sheriff de su pueblo (tabla pueblos), ordenado por el nombre del forajido.',
    initialCode: '',
    seedSQL: PUEBLO_SQL,
    hint: 'JOIN pueblos ON buscados.pueblo = pueblos.nombre',
    expected: lines(
      'Billy el Lento|Sheriff Lola', 'Doc Bigotes|Sheriff Lola', 'El Tuerto Ramírez|Sheriff Lola',
      'Juana Gatillo|Sheriff Pancho', 'Manco Pérez|Sheriff Pancho', 'Rosita Pólvora|Sheriff Tano',
    ),
    solution: lines('SELECT b.nombre, p.sheriff', 'FROM buscados b', 'JOIN pueblos p ON b.pueblo = p.nombre', 'ORDER BY b.nombre;'),
  },
]

export const PISTOLERO_BY_ID = new Map(PISTOLERO_EXERCISES.map((e) => [e.id, e]))

/** Lo que ve el alumno: sin salida esperada ni solución. */
export function toPublicExercise(e: PistoleroExercise) {
  const { expected: _e, solution: _s, hint: _h, ...rest } = e
  return rest
}
export type PublicPistoleroExercise = ReturnType<typeof toPublicExercise>

/**
 * Ejercicio al azar para un alumno: SOLO de temas que ya vio (jefes derrotados),
 * de su nivel y que todavía no le tocó. Si no hay de su nivel, baja de nivel;
 * si ya hizo todos, repite. Nunca le da un tema que no vio (salvo que no haya
 * vencido a nadie: ahí va el más básico).
 */
export function pickExercise(tier: ChallengeTier, used: Set<string>, defeated: Set<string>, rng = Math.random): PistoleroExercise {
  const seen = PISTOLERO_EXERCISES.filter((e) => defeated.has(e.needs))
  if (!seen.length) return PISTOLERO_EXERCISES[0]
  const order: ChallengeTier[] = tier === 'senior' ? ['senior', 'trainee', 'junior'] : tier === 'trainee' ? ['trainee', 'junior'] : ['junior']
  for (const t of order) {
    const pool = seen.filter((e) => e.tier === t)
    const fresh = pool.filter((e) => !used.has(e.id))
    if (fresh.length) return fresh[Math.floor(rng() * fresh.length)]
  }
  const fresh = seen.filter((e) => !used.has(e.id))
  const list = fresh.length ? fresh : seen
  return list[Math.floor(rng() * list.length)]
}
