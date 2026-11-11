// ─── PLAN_FINAL.TXT: la guía del docente para el proyecto final ─────────────
// Una página por clase, desde que arrancan su mazo en Mi Reino hasta el día
// de la muestra. Se lee en el panel docente (app/admin/windows/PlanFinalWindow).
//
// El ejemplo para proyectar es SIEMPRE el mismo mazo, "Robots de Chatarra",
// que no es el de ningún alumno: así nadie copia el suyo. Las sentencias SQL
// de las páginas, corridas en orden, arman ese mazo (y en el camino tiene una
// carta rota y se pasa del presupuesto, que se arreglan en el Proyecto 1).
// tests/cartas/plan-final.test.ts lo comprueba con sql.js y validarMazo.

export type LugarPlan = 'Mi Reino' | 'Patio de prácticas' | 'AreaTrabajo' | 'Batalla' | 'Panel docente' | 'Stand de la muestra'

export interface CodigoPlan {
  lang: 'sql' | 'python'
  codigo: string
  /** Una línea para decir en voz alta mientras se proyecta. */
  nota?: string
}

export interface PaginaPlanFinal {
  id: string
  /** "Clase del Jefe 8" · "Proyecto 1" … */
  etiqueta: string
  titulo: string
  /** Fechas ISO (aaaa-mm-dd). La guía abre sola en la próxima clase. */
  manana: string
  tarde: string
  donde: LugarPlan[]
  tiempo: string
  objetivo: string
  /** Aviso arriba de todo: algo que todavía no está programado, un requisito… */
  aviso?: string
  proyectar: CodigoPlan[]
  pasos: string[]
  quedaHecho: string[]
  siSeTraban: string[]
  siTerminan?: string
  enElPanel?: string
}

/** Lo que el alumno tiene que escribir igual en todas sus cartas. */
export const VALORES_VALIDOS = {
  rareza: "'comun', 'rara', 'epica' o 'legendaria'",
  color: "'liso', 'rayas', 'damero' u 'ondas'",
}

export const MAZO_EJEMPLO = 'Robots de Chatarra'

export const PLAN_FINAL: PaginaPlanFinal[] = [
  {
    id: 'jefe-8',
    etiqueta: 'Clase del Jefe 8',
    titulo: 'Tu tabla de cartas',
    manana: '2026-11-10',
    tarde: '2026-11-10',
    donde: ['Mi Reino'],
    tiempo: '15 min, al final, después del jefe',
    objetivo: 'Cada uno elige el tema de su mazo, crea la tabla cartas y carga sus primeras 3 cartas.',
    aviso: 'Mi Reino se abre al vencer al Constructor del Vacío (jefe 7). Quien no lo venció todavía, primero lo pelea.',
    proyectar: [
      {
        lang: 'sql',
        nota: 'Las 6 primeras columnas son iguales para todos. La última la inventa cada uno: la mía es bateria.',
        codigo: `CREATE TABLE cartas (
  id INTEGER PRIMARY KEY,
  nombre TEXT,
  tipo TEXT,
  poder INTEGER,
  rareza TEXT,
  color TEXT,
  bateria INTEGER
);`,
      },
      {
        lang: 'sql',
        nota: 'El id no se escribe: SQLite lo pone solo.',
        codigo: `INSERT INTO cartas (nombre, tipo, poder, rareza, color, bateria) VALUES
  ('Tostadora Furiosa', 'robot', 4, 'comun', 'liso', 80),
  ('Robot Aspiradora', 'robot', 3, 'comun', 'rayas', 100),
  ('Licuadora Gigante', 'robot', 7, 'comun', 'damero', 45);`,
      },
    ],
    pasos: [
      'Elegir un tema para el mazo: monstruos, comidas, mascotas, robots, lo que quieran.',
      'Inventar una columna propia (sabor, velocidad, edad, grito…). Si es un número va INTEGER, si es una palabra va TEXT.',
      'Escribir el CREATE TABLE cartas en Mi Reino y ejecutarlo.',
      'Cargar 3 cartas con INSERT. Poder de 1 a 10.',
      `rareza solo puede ser ${VALORES_VALIDOS.rareza}. color solo puede ser ${VALORES_VALIDOS.color}.`,
    ],
    quedaHecho: [
      'La tabla cartas existe en su Mi Reino, con la columna inventada.',
      'Tiene 3 cartas cargadas.',
    ],
    siSeTraban: [
      '"table cartas already exists": ya la crearon. No hace falta crearla de nuevo, sigan con los INSERT.',
      'Si la tabla salió mal (faltó una columna): DROP TABLE cartas; y la vuelven a crear.',
      'Un texto sin comillas da error: los textos van entre comillas simples, los números sin comillas.',
      'No se preocupen si una carta tiene mucho poder: en el Proyecto 1 vamos a buscar las cartas rotas.',
    ],
    siTerminan: 'Que cada carta tenga un color distinto.',
    enElPanel: 'reinos.db: elegí un alumno y fijate que tenga la tabla cartas.',
  },
  {
    id: 'jefe-9',
    etiqueta: 'Clase del Jefe 9',
    titulo: 'Las 6 cartas y tu primer filtro',
    manana: '2026-11-11',
    tarde: '2026-11-12',
    donde: ['Mi Reino'],
    tiempo: '15 min, al final, después del jefe',
    objetivo: 'Llegar a 6 cartas y hacerle una pregunta al mazo con WHERE.',
    proyectar: [
      {
        lang: 'sql',
        codigo: `INSERT INTO cartas (nombre, tipo, poder, rareza, color, bateria) VALUES
  ('Mega Grúa', 'robot', 9, 'epica', 'ondas', 20),
  ('Lámpara Espía', 'robot', 2, 'comun', 'liso', 60),
  ('Ventilador Turbo', 'robot', 5, 'comun', 'rayas', 75);`,
      },
      {
        lang: 'sql',
        nota: 'Primero cuento cuántas tengo, después pregunto cuáles son de rayas.',
        codigo: `SELECT COUNT(*) FROM cartas;

SELECT nombre, poder FROM cartas WHERE color = 'rayas';`,
      },
    ],
    pasos: [
      'Cargar las cartas que faltan hasta tener 6 justas.',
      'Contarlas con SELECT COUNT(*) FROM cartas.',
      'Escribir un SELECT con WHERE sobre su mazo (por color, por tipo o por su columna inventada).',
    ],
    quedaHecho: [
      'COUNT(*) da 6.',
      'Hay al menos 2 colores distintos en el mazo.',
      'Ejecutaron un SELECT con WHERE.',
    ],
    siSeTraban: [
      'Si tienen 7 o más: DELETE FROM cartas WHERE nombre = \'…\'; (siempre con WHERE).',
      'Si el WHERE no trae nada: el texto tiene que estar escrito igual que en la tabla, con las mismas comillas simples.',
      'Si cargaron una carta dos veces: borren una por su id (WHERE id = 4).',
    ],
    siTerminan: 'Un WHERE con dos condiciones: color = \'liso\' AND poder > 3.',
    enElPanel: 'reinos.db: quién tiene menos de 6 cartas.',
  },
  {
    id: 'jefe-10',
    etiqueta: 'Clase del Jefe 10',
    titulo: 'Cambiar una carta y ordenar el mazo',
    manana: '2026-11-17',
    tarde: '2026-11-17',
    donde: ['Mi Reino'],
    tiempo: '15 min, al final, después del jefe',
    objetivo: 'Cambiar una carta con UPDATE y ver el mazo ordenado de la más fuerte a la más débil.',
    proyectar: [
      {
        lang: 'sql',
        nota: 'Sin el WHERE, TODAS las cartas quedarían con poder 5. Siempre WHERE.',
        codigo: `UPDATE cartas SET poder = 5 WHERE nombre = 'Robot Aspiradora';`,
      },
      {
        lang: 'sql',
        nota: 'Este orden después va a ser el orden en que juegan sus cartas en la arena.',
        codigo: `SELECT nombre, poder FROM cartas ORDER BY poder DESC;`,
      },
    ],
    pasos: [
      'Elegir una carta y cambiarle algo con UPDATE … SET … WHERE.',
      'Ver el mazo ordenado por poder con ORDER BY poder DESC.',
      'Contarle al de al lado cuál es su carta más fuerte.',
    ],
    quedaHecho: [
      'Hicieron un UPDATE con WHERE que cambió 1 fila.',
      'Ejecutaron un SELECT con ORDER BY.',
    ],
    siSeTraban: [
      'Si cambió más de una carta: les faltó el WHERE. Arréglenlo con otro UPDATE, carta por carta.',
      'Si no cambió ninguna: el nombre del WHERE no coincide con la tabla. Miren cómo está escrito.',
      'DESC es de mayor a menor. Sin DESC queda de menor a mayor.',
    ],
    siTerminan: 'Ordenar por su columna inventada.',
  },
  {
    id: 'jefe-11',
    etiqueta: 'Clase del Jefe 11',
    titulo: 'Tus cartas desde Python',
    manana: '2026-11-18',
    tarde: '2026-11-19',
    donde: ['Patio de prácticas'],
    tiempo: '15 min, al final, después del jefe',
    objetivo: 'Abrir su propio mazo desde Python con sqlite3: el mismo connect del Nexo, pero con reino.db.',
    aviso: 'reino.db funciona en el Patio con la sesión del alumno iniciada. Desde Python el mazo solo se lee: para cambiarlo, SQL en Mi Reino.',
    proyectar: [
      {
        lang: 'python',
        nota: 'Cada fila es como un diccionario: fila["nombre"], fila["poder"].',
        codigo: `import sqlite3

con = sqlite3.connect("reino.db")
for fila in con.execute("SELECT * FROM cartas"):
    print(fila["nombre"], "tiene poder", fila["poder"])`,
      },
    ],
    pasos: [
      'Abrir el Patio de prácticas en modo Python.',
      'Escribir el connect a reino.db y el for que recorre las cartas.',
      'Imprimir el nombre y su columna inventada: fila["sabor"], fila["bateria"]…',
    ],
    quedaHecho: [
      'Ven sus 6 cartas impresas en la consola del Patio.',
    ],
    siSeTraban: [
      '"desde Python tu mazo se mira, no se toca": intentaron un INSERT o UPDATE desde Python. Eso va en Mi Reino.',
      '"tu tabla no tiene una columna…": Rodolfo les lista las columnas que sí tienen. Copien el nombre exacto.',
      '"todavía no hay nada en Mi Reino": no tienen reino o están sin sesión. Revisen que hayan entrado con su usuario.',
      'Si cambiaron algo en Mi Reino y no aparece: vuelvan a la pestaña del Patio (se actualiza al volver).',
    ],
    siTerminan: 'Imprimir solo las cartas de un color, con un if adentro del for.',
  },
  {
    id: 'proyecto-1',
    etiqueta: 'Proyecto 1',
    titulo: 'CREAR y BALANCEAR',
    manana: '2026-11-24',
    tarde: '2026-11-24',
    donde: ['AreaTrabajo'],
    tiempo: 'La clase entera',
    objetivo: 'Que el mazo de cada uno quede válido: 6 cartas, ninguna rota y la suma de poder en 30 o menos.',
    aviso: 'AreaTrabajo está en construcción: queda lista el 23/11. Habilitala para el aula desde el panel antes de la clase.',
    proyectar: [
      {
        lang: 'sql',
        nota: 'Las reglas del juego también son una tabla. Se pueden leer, no cambiar.',
        codigo: `SELECT * FROM reglas;`,
      },
      {
        lang: 'sql',
        nota: 'A cazar cartas rotas: una común con más de 5, y el total del mazo.',
        codigo: `SELECT nombre, poder FROM cartas WHERE rareza = 'comun' AND poder > 5;

SELECT SUM(poder) FROM cartas;`,
      },
      {
        lang: 'sql',
        nota: 'La Licuadora pasa a ser rara (su tope es 7) y le bajo 2 a la Aspiradora para volver a 30.',
        codigo: `UPDATE cartas SET rareza = 'rara' WHERE nombre = 'Licuadora Gigante';
UPDATE cartas SET poder = 3 WHERE nombre = 'Robot Aspiradora';`,
      },
      {
        lang: 'sql',
        nota: 'Esta consulta se guarda como "orden de batalla".',
        codigo: `SELECT * FROM cartas ORDER BY poder DESC;`,
      },
    ],
    pasos: [
      'Paso 1 · Tu tema: título del mazo, lema y alias para la muestra.',
      'Pasos 2 y 3 · Tu tabla y tus 6 cartas: si ya las hicieron en Mi Reino, aparecen con ✓.',
      'Paso 4 · Leer las reglas con SELECT * FROM reglas.',
      'Paso 5 · Cazar las cartas rotas con WHERE y sumar el poder con SUM.',
      'Paso 6 · Arreglarlas con UPDATE (o DELETE) y guardar el orden de batalla.',
    ],
    quedaHecho: [
      'La guía muestra CREAR ✓ y BALANCEAR ✓.',
      'La barra de presupuesto no está en rojo (30 o menos).',
      'Tienen un orden de batalla guardado.',
    ],
    siSeTraban: [
      'Topes de poder: común 5, rara 7, épica 9, legendaria 10. Como mucho 3 raras, 2 épicas y 1 legendaria.',
      'Una carta rota se arregla de dos maneras: bajarle el poder o subirle la rareza.',
      'Si se pasan del presupuesto: bajen un poco a varias cartas en vez de mucho a una.',
      'Si borraron de más: el botón "volver atrás" recupera el mazo.',
    ],
    siTerminan: 'Una sola consulta que encuentre las rotas de todas las rarezas (con OR).',
    enElPanel: 'areatrabajo: quién quedó en CREAR. Ayudalos primero a ellos.',
  },
  {
    id: 'proyecto-2',
    etiqueta: 'Proyecto 2',
    titulo: 'PROGRAMAR tu carta y tu revisor',
    manana: '2026-11-25',
    tarde: '2026-11-26',
    donde: ['AreaTrabajo'],
    tiempo: 'La clase entera',
    objetivo: 'Escribir en Python cómo se ve su carta (carta) y un revisor que diga si una carta cumple las reglas (revisar).',
    aviso: 'Las plantillas aparecen en la pestaña PYTHON de AreaTrabajo, con huecos ___.',
    proyectar: [
      {
        lang: 'python',
        nota: 'Una función que recibe una fila y devuelve el texto de la carta.',
        codigo: `import sqlite3

con = sqlite3.connect("reino.db")
filas = con.execute("SELECT * FROM cartas").fetchall()

def carta(fila):
    texto = f"""
+------------------------+
| {fila['nombre']}
| Tipo: {fila['tipo']}   Color: {fila['color']}
| Poder: {fila['poder']}
| Rareza: {fila['rareza']}
+------------------------+"""
    return texto

for fila in filas:
    print(carta(fila))`,
      },
      {
        lang: 'python',
        nota: 'La tabla reglas se convierte en un diccionario: rareza → poder máximo.',
        codigo: `topes = {}
for regla in con.execute("SELECT * FROM reglas").fetchall():
    topes[regla["rareza"]] = regla["poder_max"]

def revisar(fila):
    tope = topes[fila["rareza"]]
    if fila["poder"] >= 1 and fila["poder"] <= tope:
        return True
    else:
        return False

for fila in filas:
    if revisar(fila):
        print("OK  ", fila["nombre"])
    else:
        print("ROTA", fila["nombre"])`,
      },
    ],
    pasos: [
      'Paso 7 · Completar los huecos de carta(fila) y ejecutar: aparecen sus 6 cartas en texto.',
      'Paso 8 · Completar revisar(fila). La plataforma la prueba sola con 4 cartas (2 bien y 2 rotas).',
    ],
    quedaHecho: [
      'La guía muestra PROGRAMAR ✓ (pasos 7 y 8).',
    ],
    siSeTraban: [
      'Los nombres de las columnas van entre comillas dentro de los corchetes: fila["poder"].',
      'Adentro del f-string de la carta se usan comillas simples (fila[\'nombre\']) porque el texto ya usa comillas dobles.',
      'revisar tiene que devolver True o False (con return), no imprimir.',
      'Repasen el Archivista: un diccionario es una fila.',
    ],
    siTerminan: 'Una barra de poder en la carta: "█" * fila["poder"]. Y que revisar también mire el color.',
  },
  {
    id: 'proyecto-3',
    etiqueta: 'Proyecto 3',
    titulo: 'DISEÑAR, PELEAR y PUBLICAR',
    manana: '2026-12-01',
    tarde: '2026-12-01',
    donde: ['AreaTrabajo'],
    tiempo: 'La clase entera',
    objetivo: 'Dibujar el arte de las cartas, jugar una partida de prueba contra la CPU y publicar el mazo para la muestra.',
    aviso: 'El dibujo es decoración: no cambia nada en la pelea. Que no se queden toda la clase dibujando una sola carta.',
    proyectar: [],
    pasos: [
      'Pestaña DISEÑO: el frente de cada carta (grilla de 16×16), el dorso del mazo y cómo se da vuelta al atacar. Hay plantillas para arrancar.',
      'Paso 9 · Botón ⚔ PROBAR (barra de abajo): jugar una partida entera contra la CPU. Ganar o perder da lo mismo.',
      'Paso 10 · Botón PUBLICAR: solo se habilita con los pasos 1 a 9 hechos y el mazo válido.',
    ],
    quedaHecho: [
      'El mazo está publicado (lo ves en el panel).',
    ],
    siSeTraban: [
      'Arte: empiecen por una plantilla y cámbienla. Con 3 o 4 cuadraditos ya se entiende un dibujo.',
      'Pelea: la CPU muestra arriba el color de la carta que va a jugar. Busquen el color que le gana.',
      'Círculo de ventajas: liso le gana a rayas, rayas a damero, damero a ondas y ondas a liso (+4 de poder).',
      'Si PUBLICAR no se habilita: la guía marca qué paso falta.',
    ],
    siTerminan: 'Ganarle al mazo "Jefe de práctica".',
    enElPanel: 'areatrabajo: quién no publicó todavía. Lo tienen que terminar en la clase del Arquitecto.',
  },
  {
    id: 'jefe-14',
    etiqueta: 'Clase del Arquitecto',
    titulo: 'El Arquitecto y ponerse al día',
    manana: '2026-12-02',
    tarde: '2026-12-03',
    donde: ['Batalla', 'AreaTrabajo'],
    tiempo: 'El jefe primero; el resto de la clase, AreaTrabajo',
    objetivo: 'Pelear contra el Arquitecto y que todos terminen con el mazo publicado.',
    proyectar: [],
    pasos: [
      'Pelea contra el Arquitecto. Al ganarle van directo al final con el gato.',
      'Quien no publicó: termina en AreaTrabajo.',
      'Quien ya publicó: ajusta su mazo o mejora el arte (se puede volver a publicar).',
    ],
    quedaHecho: [
      'Todos los mazos del aula publicados.',
    ],
    siSeTraban: [
      'Si a alguien le falta mucho: priorizá BALANCEAR y PELEAR. El arte puede quedar con la inicial.',
    ],
    siTerminan: 'Ayudar a un compañero a terminar su mazo (sin escribirle el código).',
    enElPanel: 'areatrabajo: la lista de quién falta publicar.',
  },
  {
    id: 'cierre',
    etiqueta: 'Cierre',
    titulo: 'Torneo Mañana vs Tarde',
    manana: '2026-12-09',
    tarde: '2026-12-10',
    donde: ['AreaTrabajo', 'Panel docente'],
    tiempo: 'Primera mitad ajustes; segunda mitad el torneo proyectado',
    objetivo: 'Últimos ajustes a los mazos y el torneo entre equipos, proyectado.',
    proyectar: [
      {
        lang: 'python',
        nota: 'Desafío: en vez de jugar en el orden guardado, la carta se elige mirando la mano.',
        codigo: `def elegir(mi_mano, mano_rival):
    mejor = mi_mano[0]
    for c in mi_mano:
        if c["poder"] > mejor["poder"]:
            mejor = c
    return mejor`,
      },
    ],
    pasos: [
      '⭐ elegir(mi_mano, mano_rival): la estrategia propia (opcional).',
      'Ajustes finales y volver a publicar.',
      'Con el aula: botón "Correr torneo" en el panel y proyectar el marcador por equipo.',
      'Mostrar la carta destacada de cada uno y repetir la pelea más reñida.',
    ],
    quedaHecho: [
      'Torneo corrido y marcador visto por el aula.',
      'Mazos definitivos publicados para la muestra.',
    ],
    siSeTraban: [
      'Si elegir() da error, no pasa nada: en la arena se usa su orden de batalla.',
      'Se muestra el marcador del equipo, nunca una tabla de quién quedó último.',
    ],
    siTerminan: 'Que elegir() mire mano_rival y juegue la carta que le gana por color.',
  },
  {
    id: 'muestra',
    etiqueta: 'Muestra',
    titulo: 'El día del stand',
    manana: '2026-12-18',
    tarde: '2026-12-18',
    donde: ['Stand de la muestra'],
    tiempo: 'La muestra entera',
    objetivo: 'Que la presentación y las batallas anden toda la muestra, con o sin internet.',
    proyectar: [],
    pasos: [
      'El día anterior: "Exportar muestra" en el panel, con los mazos definitivos.',
      'Abrir /muestra en la PC del stand y probar los 4 modos sin wifi.',
      'Pantalla completa. Si nadie toca nada por 1 minuto, se alternan sola la presentación y la batalla automática.',
      'Invitá a los visitantes a "Vos vs CPU" y a los chicos de cada turno a "Mañana vs Tarde".',
    ],
    quedaHecho: [
      'El marcador de la muestra sumando partidas.',
    ],
    siSeTraban: [
      'Si algo se cuelga: recargar la página. Los mazos están en el archivo exportado, no se pierden.',
      'En pantalla solo aparecen alias, nunca nombres completos.',
    ],
  },
]

/** La página que toca mostrar: la próxima clase (de cualquiera de los dos turnos). */
export function paginaDeHoy(hoy = new Date()): number {
  const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  const i = PLAN_FINAL.findIndex((p) => p.manana >= iso || p.tarde >= iso)
  return i === -1 ? PLAN_FINAL.length - 1 : i
}

/** "10/11" */
export function fechaCorta(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(d)}/${Number(m)}`
}
