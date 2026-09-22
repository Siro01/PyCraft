import type { DialogueLine } from '@/types'

/**
 * Guiones de intro para cada jefe.
 * Cada entrada es un array de líneas que el jefe dice antes del combate.
 * Tono: informal, edad 10-14, analogías Minecraft, conecta clases previas.
 */
export const BOSS_DIALOGUES: Record<string, DialogueLine[]> = {

  // ── BOSS 01 · Variables y tipos de datos ─────────────────────────────────
  'creeper-formulario': [
    { text: '¡Sssss! Soy el Creeper Formulario. No voy a explotar... todavía.' },
    { text: '¿Ves esa tarjeta? Tiene nombre del ítem, cantidad y material. En Python, cada uno de esos datos es una variable.' },
    { text: 'Una variable es como una etiqueta con un valor adentro. nombre_item = "Espada" le dice a Python: "guardá la palabra Espada bajo esa etiqueta".' },
    { text: 'Los números van sin comillas (cantidad = 3). El texto va con comillas (material = "diamante"). Simple, ¿no?' },
    { text: 'Bueno, ya sé todo eso. Ahora demostralo vos. ¡Sssss!' },
  ],

  // ── BOSS 02 · Condicionales ───────────────────────────────────────────────
  'guardian-puerta': [
    { text: 'Nadie pasa sin la contraseña correcta. Soy el Guardián de la Puerta.' },
    { text: '¿Recordás las tarjetas de bloques de la clase pasada? Diamante, oro, piedra, tierra... ¿Y si el programa reacciona diferente según qué bloque encontraste?' },
    { text: 'Eso es un if. Python lee la condición: si se cumple, hace una cosa. Si no, hace otra. Como un guardia que dice "¿tenés diamante? Pasá. ¿No tenés? Atrás."' },
    { text: 'Con elif podés agregar más casos. Con else cubrís todo lo que no entró antes. Solo se ejecuta el primer caso que se cumple, los demás se saltean.' },
    { text: '¿Listo? Demostrá que podés pasar mi portal.' },
  ],

  // ── BOSS 03 · Bucles ──────────────────────────────────────────────────────
  'golem-infinito': [
    { text: 'GOLEM... REPETIR... SIN... PARAR...' },
    { text: 'Yo soy el Golem Infinito. Me construyeron con un bucle mal escrito y ahora no puedo parar.' },
    { text: 'Un for repite una cantidad exacta de veces. Como picar un bloque de piedra: sabés que necesita exactamente 3 golpes. for golpe in range(3).' },
    { text: 'Un while repite mientras se cumpla una condición. Como el pico que usamos antes: se sigue usando mientras la durabilidad sea mayor a 0.' },
    { text: '¿Podés escribir el bucle correcto y detenerme de una vez?' },
  ],

  // ── BOSS 04 · Listas de diccionarios ─────────────────────────────────────
  'mercader-abismo': [
    { text: 'Bienvenido a mi tienda. Tengo de todo... si sabés pedirlo.' },
    { text: '¿Te acordás de la tarjeta del ítem? En Python, eso se escribe así: item = {"nombre": "Espada", "cantidad": 3, "material": "diamante"}. Eso se llama diccionario.' },
    { text: 'Un diccionario agrupa varios datos de un mismo ítem. Para acceder a uno escribís item["nombre"]. Es como abrir la tarjeta y leer ese campo.' },
    { text: '¿Y si tenés un cofre lleno? Ponés todos los ítems en una lista de diccionarios y los recorrés con el for que ya conocés.' },
    { text: 'Demostrá que podés manejar mi inventario y te dejo pasar.' },
  ],

  // ── BOSS 05 · Funciones ───────────────────────────────────────────────────
  'maestro-craftero': [
    { text: 'Ah, llegó un aprendiz. Yo soy el Maestro Craftero. Cada receta es una función.' },
    { text: '¿Viste cómo en el taller un ayudante sigue siempre los mismos pasos para guardar un ítem? Recibe el ítem, lo agrega a la lista, avisa que está listo.' },
    { text: 'Eso es una función. Se define una sola vez con def y se puede usar todas las veces que quieras, pasándole datos distintos cada vez.' },
    { text: 'def agregar_item(lista_cofre, nuevo_item): lista_cofre.append(nuevo_item). Ya está. Ahora llamás a agregar_item() cuantas veces quieras.' },
    { text: '¿Podés crear las recetas que necesito? El cofre espera.' },
  ],

  // ── BOSS 06 · De listas a tablas ─────────────────────────────────────────
  'archivista': [
    { text: 'Soy El Archivista. Guardo todo, ordeno todo, catalogo todo.' },
    { text: 'Mirá tu lista de diccionarios. Dibujala como una tabla: cada diccionario es una fila, cada clave es una columna.' },
    { text: 'Pero hay un problema: ¿cómo distinguís dos ítems con el mismo nombre? Con un campo id que sea único para cada fila. Eso se llama clave primaria.' },
    { text: 'En Python nada te impide repetir un id por error. Pero en la próxima clase vas a ver que la base de datos lo prohíbe sola, sin que vos lo programes.' },
    { text: 'Demostrá que podés trabajar con mis tablas.' },
  ],

  // ── BOSS 07 · CREATE TABLE · INSERT INTO ──────────────────────────────────
  'constructor-vacio': [
    { text: 'Este lugar estaba vacío. Yo lo construí. Una tabla a la vez.' },
    { text: 'En la clase anterior dibujaste el cofre en papel: filas, columnas, clave primaria. Ahora eso se vuelve real con SQL.' },
    { text: 'CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, cantidad INTEGER) le dice a la base de datos: "creá esta estructura". Sin estructura, no hay datos.' },
    { text: 'Después de crear la tabla, INSERT INTO cofre VALUES (1, "Espada", 3) agrega una fila. La base garantiza que no vas a tener dos filas con el mismo id.' },
    { text: '¿Podés construir mis tablas desde cero?' },
  ],

  // ── BOSS 08 · SELECT · WHERE · ORDER BY ──────────────────────────────────
  'oraculo-oscuro': [
    { text: 'Yo veo todo lo que hay en la base de datos. Soy el Oráculo Oscuro.' },
    { text: '¿Recordás cuando contabas los ítems de diamante con un for y un if en Python? Hacías todo ese código para filtrar. En SQL lo escribís en una línea.' },
    { text: 'SELECT nombre FROM cofre WHERE material = "diamante" — eso es todo. Describís qué querés y la base lo calcula sola.' },
    { text: 'ORDER BY cantidad DESC ordena de mayor a menor. LIMIT 3 te da solo los tres primeros resultados. En Python harías sort() y slice; acá va junto con la consulta.' },
    { text: 'Preguntame lo que quieras. Si la consulta es correcta, la verdad aparece.' },
  ],

  // ── BOSS 09 · COUNT · SUM · AVG · GROUP BY ───────────────────────────────
  'contador-almas': [
    { text: 'Uno... dos... tres... Soy el Contador de Almas. Cuento todo.' },
    { text: '¿Recordás contar_items() de la Clase 5? Hacías un for con total += cantidad. En SQL ya está resuelto: SELECT SUM(cantidad) FROM cofre.' },
    { text: 'COUNT(*) cuenta filas. SUM suma números. AVG calcula promedios. No necesitás escribir el bucle — la base lo hace sola.' },
    { text: 'Y si querés el total por tipo de ítem: GROUP BY tipo agrupa todas las filas con el mismo valor y calcula por grupo. Una línea reemplaza varios if.' },
    { text: 'Contame bien los números y te dejo pasar.' },
  ],

  // ── BOSS 10 · UPDATE · DELETE ─────────────────────────────────────────────
  'falsificador': [
    { text: 'Hola. No soy quien creés que soy. Soy El Falsificador.' },
    { text: '¿Craftear una espada? Tenés que descontar materiales. UPDATE cofre SET cantidad = cantidad - 1 WHERE nombre = "Lingote de hierro". Así se modifica una fila.' },
    { text: 'DELETE FROM cofre WHERE id = 3 borra una fila. Pero ojo: DELETE FROM cofre SIN WHERE borra TODA la tabla. Es el error más común con datos reales.' },
    { text: 'El truco es siempre correr primero un SELECT con el mismo WHERE para ver qué filas vas a tocar. Confirmás, y recién ahí ejecutás el DELETE o UPDATE.' },
    { text: '¿Podés modificar mis datos sin arruinar nada?' },
  ],

  // ── BOSS 11 · Python + sqlite3 ────────────────────────────────────────────
  'el-nexo': [
    { text: 'Soy El Nexo. El puente entre Python y la base de datos.' },
    { text: 'Hasta ahora usaste Python para listas en memoria y SQL en DB Browser por separado. Esta clase los conecta de verdad.' },
    { text: 'conn = sqlite3.connect("inventario.db") abre la conexión. cursor = conn.cursor() es el mensajero que lleva tus consultas.' },
    { text: 'cursor.execute("SELECT * FROM cofre") manda la consulta. cursor.fetchall() trae los resultados como lista de tuplas. conn.commit() guarda los cambios. conn.close() cierra todo.' },
    { text: 'El SQL va adentro de execute(), entre comillas. El resto ya lo conocés. ¿Podés conectar los dos mundos?' },
  ],

  // ── BOSS 12 · Proyecto: agregar y listar ─────────────────────────────────
  'la-hydra': [
    { text: 'SSSSS. Cortame una cabeza y crecen dos. Soy La Hydra.' },
    { text: 'Este no es un ejercicio suelto. Es el primer pedazo de tu sistema de inventario real.' },
    { text: 'Vas a escribir agregar_item(): conecta a la base, hace un INSERT con los datos que recibe, guarda con commit. Cada ítem que agregues queda grabado en el archivo.' },
    { text: 'Y listar_items(): conecta, hace un SELECT *, trae todas las filas con fetchall(), las imprime. Abrís el programa la próxima vez y los datos siguen ahí.' },
    { text: '¿Podés construir algo que persista? A ver si podés con mis cabezas.' },
  ],

  // ── BOSS 13 · Proyecto: buscar, quitar, actualizar ───────────────────────
  'dragon-rojo': [
    { text: '...' },
    { text: 'Soy el Dragón Rojo. El más antiguo. El más temido.' },
    { text: 'Ya tenés un sistema que agrega y lista. Ahora lo completamos. buscar_item(nombre) hace un SELECT con WHERE y te dice si existe o no.' },
    { text: 'quitar_item(nombre) busca primero, te muestra qué va a borrar, pide confirmación, y recién entonces ejecuta el DELETE. Sin confirmación, sin borrado. Ese es el estándar real.' },
    { text: 'actualizar_cantidad(nombre, nueva_cantidad) hace un UPDATE. Un solo ítem, un solo campo, un solo WHERE. ¿Podés terminar el sistema y derrotarme?' },
  ],

  // ── BOSS 14 · Sistema completo ────────────────────────────────────────────
  'el-arquitecto': [
    { text: '...' },
    { text: 'Llegaste.' },
    { text: 'Soy El Arquitecto. Diseñé cada jefe, cada ejercicio, cada base de datos de este mundo.' },
    { text: 'Variables, condicionales, bucles, listas, funciones... CREATE, SELECT, INSERT, UPDATE, DELETE... Python conectado a SQLite.' },
    { text: 'Todo lo que aprendiste, en un solo sistema. Demostrá que podés integrarlo. Este es el último desafío.' },
  ],
}
