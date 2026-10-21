// Todo el texto del manual de marca vive acá. Para corregir algo (por ejemplo
// la personalidad de un jefe) se edita este archivo y se vuelve a exportar el
// PDF con `node scripts/export-manual.mjs`. Los componentes solo dibujan.
//
// Regla de escritura: una idea por bloque, frases cortas. Si algo necesita un
// párrafo, va en su propia página.

import type { Bitmap } from '@/components/game/architect/desktop/PixelBitmap'
import {
  CHEST_CLOSED, ICON_ARROW_RIGHT, ICON_BIN, ICON_BRUSH, ICON_CHECK, ICON_CLOSE, ICON_CUBE, ICON_FILE,
  ICON_FOLDER, ICON_KEYS, ICON_PIG, ICON_RAID, ICON_SWORDS, ICON_TERMINAL, ICON_WALL, ICON_WANTED, ICON_WARN,
} from '@/components/game/architect/desktop/PixelBitmap'

export const MANUAL = {
  title: 'Manual de marca',
  product: 'PyCraft BOSSRUSH',
  edition: 'Borrador · octubre 2026',
  tagline: 'Cómo se ve, cómo habla y qué falta.',
  coverHint: 'Cada parada es una sección.',
}

// Paradas del recorrido: una por sección. La página de cada una se calcula sola.
export interface Stop { id: string; name: string; icon: Bitmap }
export const STOPS: Stop[] = [
  { id: 'esencia', name: 'Esencia', icon: ICON_CUBE },
  { id: 'fundamentos', name: 'Fundamentos', icon: ICON_BRUSH },
  { id: 'interfaz', name: 'Interfaz', icon: ICON_TERMINAL },
  { id: 'personajes', name: 'Personajes', icon: ICON_PIG },
  { id: 'jefes', name: 'Jefes', icon: ICON_SWORDS },
  { id: 'alternativos', name: 'Alternativos', icon: ICON_WANTED },
  { id: 'lugares', name: 'Lugares', icon: ICON_FOLDER },
  { id: 'sitio', name: 'Sitio y login', icon: ICON_KEYS },
  { id: 'reglas', name: 'Reglas', icon: ICON_WARN },
  { id: 'coherencia', name: 'Coherencia', icon: ICON_CHECK },
]

export type CheckState = 'ok' | 'mejorar' | 'falta'
export const STATE_LABELS: Record<CheckState, string> = { ok: 'Bien', mejorar: 'Mejorar', falta: 'Falta' }

// ─── 1 · Esencia ─────────────────────────────────────────────────────────────

export const IDEA = {
  title: 'PyCraft OS',
  statement: 'Un sistema operativo 1-bit escondido dentro de un juego de jefes.',
  keys: [
    { name: 'Tinta sobre papel', body: 'Blanco y negro. La jerarquía sale de invertir.' },
    { name: 'Sombra dura', body: 'Bordes de 2px, esquinas rectas, sin blur.' },
    { name: 'Por cuadros', body: 'Todo se mueve como un sprite.' },
  ],
}

export const PERSONALITY = {
  title: 'Personalidad',
  summary: 'Cuatro rasgos y su límite.',
  pairs: [
    { is: 'Retro', not: 'Anticuado' },
    { is: 'Juguetón', not: 'Infantil' },
    { is: 'Desafiante', not: 'Castigador' },
    { is: 'Cercano', not: 'Formal' },
  ],
}

export const VOICE = {
  title: 'Voz',
  summary: 'Español rioplatense, con vos. Frases cortas.',
  pairs: [
    { yes: 'Probá de nuevo, ¡no pasa nada!', no: 'Error. Intente nuevamente.' },
    { yes: 'Ingresá tu nombre.', no: 'Ingrese su nombre de usuario.' },
    { yes: 'Tu progreso está a salvo.', no: 'Se produjo un fallo inesperado.' },
  ],
}

// ─── 2 · Fundamentos ─────────────────────────────────────────────────────────

export const PALETTE_PAGE = {
  title: 'Paleta de los actos',
  summary: 'Tres temas. Cada acto del mapa usa uno.',
  themes: [
    { theme: 'light' as const, file: 'LIGHT.PAL', use: 'Acto I' },
    { theme: 'dark' as const, file: 'DARK.PAL', use: 'Acto II · por defecto' },
    { theme: 'red' as const, file: 'RED.PAL', use: 'Actos III y IV' },
  ],
  swatches: [
    { token: '--bg', name: 'Papel' },
    { token: '--surface', name: 'Superficie' },
    { token: '--border2', name: 'Borde' },
    { token: '--tx2', name: 'Tinta 2' },
    { token: '--tx', name: 'Tinta' },
    { token: '--accent', name: 'Acento' },
  ],
}

export const BOSS_COLORS = {
  title: 'Color de cada jefe',
  summary: 'Solo se ve a color en el tema red.',
  acts: [
    { name: 'Acto I · Python', range: [1, 6] },
    { name: 'Acto II · SQLite', range: [7, 10] },
    { name: 'Acto III · Integración', range: [11, 13] },
    { name: 'Acto IV', range: [14, 14] },
  ],
}

export const TYPE_PAGE = {
  title: 'Tipografía',
  summary: 'Tres voces pixel. Nunca dos en la misma línea.',
  faces: [
    { name: 'Jersey 25', role: 'Nombra', font: 'var(--font-jersey)', sample: 'Dragón Rojo', size: 64 },
    { name: 'VT323', role: 'Habla', font: 'var(--font-vt323)', sample: 'Sin confirmación, sin borrado.', size: 40 },
    { name: 'Silkscreen', role: 'Etiqueta', font: 'var(--font-pixel)', sample: 'ENTRAR AL COMBATE', size: 30 },
  ],
}

export const SHAPE_PAGE = {
  title: 'Forma',
  summary: 'Bordes duros, esquinas rectas, sombras sin blur.',
  items: [
    { name: 'Borde de 2px', body: 'La silueta la hace el borde.' },
    { name: 'Cero radio', body: 'Ninguna esquina redondeada.' },
    { name: 'Sombra dura', body: 'Un bloque corrido, nunca difuso.' },
  ],
}

export const ICONS_PAGE = {
  title: 'Íconos',
  summary: 'Se dibujan píxel por píxel, como filas de texto.',
  icons: [
    { name: 'Cofre', rows: CHEST_CLOSED }, { name: 'Carpeta', rows: ICON_FOLDER }, { name: 'Terminal', rows: ICON_TERMINAL },
    { name: 'Archivo', rows: ICON_FILE }, { name: 'Pared', rows: ICON_WALL }, { name: 'Aviso', rows: ICON_WARN },
    { name: 'Rodolfo', rows: ICON_PIG }, { name: 'Bloque', rows: ICON_CUBE }, { name: 'Espadas', rows: ICON_SWORDS },
    { name: 'Raid', rows: ICON_RAID }, { name: 'Se busca', rows: ICON_WANTED }, { name: 'Pincel', rows: ICON_BRUSH },
    { name: 'Teclado', rows: ICON_KEYS }, { name: 'Papelera', rows: ICON_BIN }, { name: 'Listo', rows: ICON_CHECK },
    { name: 'Cerrar', rows: ICON_CLOSE }, { name: 'Flecha', rows: ICON_ARROW_RIGHT },
  ] as { name: string; rows: Bitmap }[],
}

export const MOTION_PAGE = {
  title: 'Movimiento',
  summary: 'Todo avanza por cuadros, como un sprite.',
  rule: 'Las animaciones usan steps() y se apagan con movimiento reducido.',
}

// ─── 3 · Interfaz ────────────────────────────────────────────────────────────

export const WINDOWS_PAGE = {
  title: 'Ventanas',
  summary: 'Todo vive en ventanas.',
  states: [
    { file: 'ACTIVA.EXE', name: 'Activa', body: 'Barra sólida. Es la que tiene el foco.' },
    { file: 'REPOSO.EXE', name: 'En reposo', body: 'Barra rayada. Está atrás.' },
    { file: 'ERROR.EXE', name: 'Error', body: 'El error es parte del juego. Nunca borra progreso.' },
  ],
}

export const CONTROLS_PAGE = {
  title: 'Botones y campos',
  summary: 'Se levantan al pasar el mouse y se hunden al hacer clic.',
  primary: 'ENTRAR AL COMBATE',
  secondary: 'VER LOS JEFES',
  inputLabel: 'Tu nombre',
  inputValue: 'Alex',
}

// ─── 4 · Personajes ──────────────────────────────────────────────────────────

export const PLAYER_PAGE = {
  title: 'El alumno',
  summary: 'El personaje del mapa. Cada alumno elige el suyo.',
  versions: [
    { id: 'explorador' as const, name: 'Explorador', note: 'Gorra y mochila' },
    { id: 'minero' as const, name: 'Minero', note: 'Por defecto' },
    { id: 'bot' as const, name: 'Bot', note: 'Pantalla con >_' },
  ],
  facts: [{ label: 'Grilla', value: '12 × 14' }, { label: 'Direcciones', value: '4' }, { label: 'Caminata', value: '2 cuadros' }],
}

export interface CharacterSheet {
  title: string
  summary: string
  is: string[]
  isNot: string[]
  quote: string
  facts: { label: string; value: string }[]
}

export const RODOLFO: CharacterSheet = {
  title: 'Rodolfo',
  summary: 'El cerdito guía. Explica, avisa y acompaña.',
  is: ['Amable', 'Paciente', 'Cercano'],
  isNot: ['Retador', 'Sabelotodo'],
  quote: '¡No pasa nada! La repasamos juntos, despacito.',
  facts: [{ label: 'Técnica', value: 'GIF' }, { label: 'Lienzo', value: '384 × 384' }, { label: 'Aparece en', value: 'Batallas · Escuelita · Biblioteca' }],
}

export const MERCADER: CharacterSheet = {
  title: 'El Mercader',
  summary: 'Atiende la tienda y aparece de sorpresa en batalla.',
  is: ['Misterioso', 'Interesado', 'Simpático a medias'],
  isNot: ['Agresivo', 'Transparente'],
  quote: 'Mirá con calma. No muerdo. Probablemente.',
  facts: [{ label: 'Técnica', value: 'Grilla de texto' }, { label: 'Lienzo', value: '56 × 64' }, { label: 'Detalle', value: 'Llama azul de 4 cuadros' }],
}

export const PISTOLERO: CharacterSheet = {
  title: 'El Pistolero',
  summary: 'El docente en persona, en un duelo sorpresa contra el aula.',
  is: ['Teatral', 'Fanfarrón', 'Justo'],
  isNot: ['Cruel', 'Serio'],
  quote: '¡DESENFUNDEN LOS TECLADOS!',
  facts: [{ label: 'Técnica', value: 'ASCII en vivo' }, { label: 'Lienzo', value: '120 × 144' }, { label: 'Paleta', value: 'Propia, western' }],
}

// ─── 5 · Jefes ───────────────────────────────────────────────────────────────

export const BOSS_SYSTEM = {
  title: 'Los 14 jefes',
  summary: 'Un jefe por clase. Cuatro actos.',
  acts: [
    { name: 'Acto I', theme: 'Python', range: [1, 6] },
    { name: 'Acto II', theme: 'SQLite', range: [7, 10] },
    { name: 'Acto III', theme: 'Integración', range: [11, 13] },
    { name: 'Acto IV', theme: 'El Arquitecto', range: [14, 14] },
  ],
}

// La personalidad sale de lo que cada jefe dice en lib/game/dialogues.ts.
// Es un borrador para que el docente la corrija.
export interface BossSheet {
  act: string
  is: string[]
  isNot: string[]
  quote: string
  technique: string
  canvas: string
  defeated: string
}

export const BOSS_SHEETS: Record<string, BossSheet> = {
  'creeper-formulario': { act: 'Acto I', is: ['Travieso', 'Ansioso', 'Didáctico'], isNot: ['Malvado', 'Paciente'], quote: '¡Sssss! No voy a explotar... todavía.', technique: 'GIF', canvas: '16 × 16', defeated: 'Gris automático' },
  'guardian-puerta': { act: 'Acto I', is: ['Estricto', 'Formal', 'Justo'], isNot: ['Cruel', 'Charlatán'], quote: 'Nadie pasa sin la contraseña correcta.', technique: 'Tira por script', canvas: '64 × 64', defeated: 'Propio' },
  'golem-infinito': { act: 'Acto I', is: ['Mecánico', 'Atrapado', 'Repetitivo'], isNot: ['Malvado', 'Rápido'], quote: 'GOLEM... REPETIR... SIN... PARAR...', technique: 'Tira por script', canvas: '64 × 64', defeated: 'Propio' },
  'mercader-abismo': { act: 'Acto I', is: ['Misterioso', 'Comerciante', 'Poco confiable'], isNot: ['Agresivo', 'Directo'], quote: 'Tengo de todo... si sabés pedirlo.', technique: 'Grilla de texto', canvas: '56 × 64', defeated: 'Propio' },
  'maestro-craftero': { act: 'Acto I', is: ['Maestro', 'Paciente', 'Práctico'], isNot: ['Soberbio', 'Apurado'], quote: 'Cada receta es una función.', technique: 'Tira por script', canvas: '64 × 64', defeated: 'Propio' },
  archivista: { act: 'Acto I', is: ['Ordenado', 'Meticuloso', 'Obsesivo'], isNot: ['Desprolijo', 'Improvisado'], quote: 'Guardo todo, ordeno todo, catalogo todo.', technique: 'Tira por script', canvas: '64 × 64', defeated: 'Propio' },
  'constructor-vacio': { act: 'Acto II', is: ['Creador', 'Orgulloso', 'Metódico'], isNot: ['Destructor', 'Caótico'], quote: 'Este lugar estaba vacío. Yo lo construí.', technique: 'GIF a mano', canvas: '32 × 32', defeated: 'Propio' },
  'oraculo-oscuro': { act: 'Acto II', is: ['Sabio', 'Enigmático', 'Omnisciente'], isNot: ['Confuso', 'Mentiroso'], quote: 'Si la consulta es correcta, la verdad aparece.', technique: 'Tira por script', canvas: '64 × 64', defeated: 'Propio' },
  'contador-almas': { act: 'Acto II', is: ['Obsesivo', 'Preciso', 'Inquietante'], isNot: ['Distraído', 'Aproximado'], quote: 'Uno... dos... tres... Cuento todo.', technique: 'GIF a mano', canvas: '32 × 32', defeated: 'Propio' },
  falsificador: { act: 'Acto II', is: ['Tramposo', 'Cambiante', 'Astuto'], isNot: ['Honesto', 'Quieto'], quote: 'No soy quien creés que soy.', technique: 'Cursores', canvas: '128 × 128', defeated: 'Una X' },
  'el-nexo': { act: 'Acto III', is: ['Conector', 'Técnico', 'Sereno'], isNot: ['Aislado', 'Caótico'], quote: 'El puente entre Python y la base de datos.', technique: 'ASCII', canvas: 'Calamar', defeated: 'Se desconecta' },
  'la-hydra': { act: 'Acto III', is: ['Amenazante', 'Persistente', 'Provocadora'], isNot: ['Frágil', 'Olvidadiza'], quote: 'Cortame una cabeza y crecen dos.', technique: 'GIF a mano', canvas: '72 × 56', defeated: 'Propio' },
  'dragon-rojo': { act: 'Acto III', is: ['Antiguo', 'Solemne', 'Exigente'], isNot: ['Burlón', 'Apurado'], quote: 'Sin confirmación, sin borrado.', technique: 'GIF a mano', canvas: '88 × 70', defeated: 'Propio' },
  'el-arquitecto': { act: 'Acto IV', is: ['Creador del mundo', 'Sereno', 'Imponente'], isNot: ['Gritón', 'Tramposo'], quote: 'Diseñé cada jefe, cada ejercicio, cada base de datos.', technique: 'ASCII', canvas: 'Cara', defeated: 'Se deshace' },
}

// ─── 6 · Alternativos ────────────────────────────────────────────────────────

export const VARIANTS_PAGE = {
  title: 'Variantes',
  summary: 'Cinco jefes tienen tres diseños. El marcado es el que está en uso.',
}

export const SECRETS_PAGE = {
  title: 'Jefes secretos',
  summary: 'Uno por acto, detrás del cofre secreto. Arena oscura, sin ayuda.',
}

// ─── 7 · Lugares y 8 · Sitio ─────────────────────────────────────────────────

export interface PlacePage {
  section: 'lugares' | 'sitio'
  title: string
  summary: string
  traits: string[]
  shots: { name: string; file: string; y?: number }[]
}

export const PLACES: PlacePage[] = [
  { section: 'lugares', title: 'Mapa de actos', summary: 'Cada acto es una región. Los jefes se encuentran caminando.', traits: ['Rutas en ángulo recto', 'Terreno tramado', 'Un tema por acto'], shots: [{ name: 'mapa', file: 'MAPA_DE_JEFES.EXE' }] },
  { section: 'lugares', title: 'Escritorio', summary: 'La casa del alumno: cada programa es un ícono.', traits: ['Íconos de escritorio', 'Ventanas apiladas', 'Fondo de puntos'], shots: [{ name: 'escritorio', file: 'PYCRAFT_OS' }] },
  { section: 'lugares', title: 'Batalla', summary: 'El jefe arriba, la consola abajo.', traits: ['Código real', 'Barra de vida segmentada', 'Rodolfo ayuda'], shots: [{ name: 'batalla', file: 'BATALLA.EXE' }] },
  { section: 'lugares', title: 'Tienda', summary: 'El Mercader vende ítems a cambio de diamantes.', traits: ['Vidriera por pestañas', 'Precio en diamantes', 'Retrato del Mercader'], shots: [{ name: 'tienda', file: 'TIENDA.EXE' }] },
  { section: 'lugares', title: 'Biblioteca', summary: 'Un grimorio por tema, con código que se ejecuta.', traits: ['Estante por acto', 'Sellos de progreso', 'Rodolfo bibliotecario'], shots: [{ name: 'biblioteca', file: 'BIBLIOTECA.EXE' }] },
  { section: 'lugares', title: 'Escuelita de Rodolfo', summary: 'Repasos cortos para quien faltó a una clase.', traits: ['Rodolfo explica', 'Un paso a la vez', 'La habilita el docente'], shots: [{ name: 'escuelita', file: 'ESCUELITA.EXE' }] },
  { section: 'lugares', title: 'Patios', summary: 'Práctica libre: tandas cortas y un editor sin jefe.', traits: ['Sin presión', 'Diamantes por tanda', 'Consola real'], shots: [{ name: 'patio-juegos', file: 'PATIO_DE_JUEGOS.EXE' }, { name: 'patio-practicas', file: 'PATIO_DE_PRACTICAS.EXE' }] },
  { section: 'lugares', title: 'Arena', summary: 'Duelos entre compañeros del taller.', traits: ['Mismo ejercicio para los dos', 'Contra reloj', 'Uno contra uno o 2 vs 2'], shots: [{ name: 'arena', file: 'ARENA.EXE' }] },
  { section: 'lugares', title: 'Mi Reino', summary: 'Una base de datos propia que crece con cada jefe.', traits: ['Trofeos en una tabla', 'SQL de verdad', 'Se descarga'], shots: [{ name: 'reino', file: 'MI_REINO.DB' }] },
  { section: 'lugares', title: 'El cofre final', summary: 'El proyecto final: un inventario SQLite propio.', traits: ['Cinco misiones SQL', 'Se decora', 'Se descarga como .sql'], shots: [{ name: 'cofre', file: 'COFRE.SYS' }] },
  { section: 'lugares', title: 'Inventario y stickers', summary: 'Lo que el alumno junta y lo que pega.', traits: ['Grilla de ítems', 'Stickers por cofre', 'Uno secreto por acto'], shots: [{ name: 'inventario', file: 'INVENTARIO.EXE' }, { name: 'stickers', file: 'STICKERS.EXE' }] },
  { section: 'sitio', title: 'Landing', summary: 'La puerta de entrada al taller.', traits: ['Esquinas escalonadas', 'Silkscreen en botones', 'Sin escritorio'], shots: [{ name: 'landing', file: 'PYCRAFT.COM' }] },
  { section: 'sitio', title: 'Login', summary: 'Una sola ventana, centrada.', traits: ['Cofre pixel arriba', 'Ventana de 2px', 'Botón con sombra dura'], shots: [{ name: 'login', file: 'INICIAR_SESION.EXE' }] },
  { section: 'sitio', title: 'Panel docente', summary: 'El escritorio del docente: cada tarea es un programa.', traits: ['Aula activa arriba', 'Matriz de aulas y jefes', 'Papelera para borrar'], shots: [{ name: 'panel-docente', file: 'JEFES.EXE' }] },
]

// ─── 9 · Reglas ──────────────────────────────────────────────────────────────

export const RULES_DO = {
  title: 'Hacer',
  summary: 'Lo que toda pantalla nueva tiene que cumplir.',
  items: [
    'Usar los colores del tema, nunca uno suelto.',
    'Borde de 2px, esquina recta y sombra dura.',
    'Animar por cuadros y respetar movimiento reducido.',
    'Escribir con vos: «Probá», «Ingresá».',
    'Dejar siempre una salida visible en los errores.',
    'Dibujar los íconos en pixel.',
  ],
}

export const RULES_DONT = {
  title: 'No hacer',
  summary: 'Lo que rompe el estilo.',
  items: [
    'Blur, esquinas redondeadas o degradados.',
    'Un error que borre el progreso del alumno.',
    'Mezclar dos tipografías pixel en una línea.',
    'Párrafos en Silkscreen.',
    'Colores nuevos para estados.',
    'Emojis como íconos.',
  ],
}

// ─── 10 · Coherencia ─────────────────────────────────────────────────────────

export interface AuditRow { bossId: string; technique: string; pixel: CheckState; defeated: CheckState }

export const AUDIT_PAGE = {
  title: 'Coherencia de jefes',
  summary: 'La mayoría usa la grilla de 64. Lo que no, se nota al lado de los demás.',
  columns: { boss: 'Jefe', technique: 'Técnica', pixel: 'Píxel', defeated: 'Derrota' },
  prioritiesTitle: 'PENDIENTES.TXT',
  priorities: [
    { title: 'Creeper', body: 'Pasar a 64 y dibujar su derrota.' },
    { title: 'Constructor y Contador', body: 'Pasar de grilla 32 a 64.' },
    { title: 'Color de jefe', body: 'Decidir si se ve en los 3 temas.' },
  ],
}

export const AUDIT_ROWS: AuditRow[] = [
  { bossId: 'creeper-formulario', technique: 'GIF 16 × 16', pixel: 'mejorar', defeated: 'falta' },
  { bossId: 'guardian-puerta', technique: 'Tira', pixel: 'ok', defeated: 'ok' },
  { bossId: 'golem-infinito', technique: 'Tira', pixel: 'ok', defeated: 'ok' },
  { bossId: 'mercader-abismo', technique: 'Grilla de texto', pixel: 'ok', defeated: 'ok' },
  { bossId: 'maestro-craftero', technique: 'Tira', pixel: 'ok', defeated: 'ok' },
  { bossId: 'archivista', technique: 'Tira', pixel: 'ok', defeated: 'ok' },
  { bossId: 'constructor-vacio', technique: 'GIF 32', pixel: 'mejorar', defeated: 'ok' },
  { bossId: 'oraculo-oscuro', technique: 'Tira', pixel: 'ok', defeated: 'ok' },
  { bossId: 'contador-almas', technique: 'GIF 32', pixel: 'mejorar', defeated: 'ok' },
  { bossId: 'falsificador', technique: 'Cursores', pixel: 'mejorar', defeated: 'ok' },
  { bossId: 'el-nexo', technique: 'ASCII', pixel: 'mejorar', defeated: 'ok' },
  { bossId: 'la-hydra', technique: 'GIF a mano', pixel: 'ok', defeated: 'ok' },
  { bossId: 'dragon-rojo', technique: 'GIF a mano', pixel: 'ok', defeated: 'ok' },
  { bossId: 'el-arquitecto', technique: 'ASCII', pixel: 'ok', defeated: 'ok' },
]

export const GENERAL_AUDIT = {
  title: 'Pendientes generales',
  summary: 'Lo que no encaja fuera de los jefes.',
  items: [
    { title: 'Rodolfo', body: 'GIF de 384 px: otra densidad que los jefes.', state: 'mejorar' as CheckState },
    { title: 'Landing', body: 'Esquinas escalonadas; el juego usa rectas.', state: 'mejorar' as CheckState },
    { title: 'Colores sueltos', body: 'Ámbar del Arquitecto y XP del Archivista.', state: 'mejorar' as CheckState },
    { title: 'El Nexo', body: 'ASCII en el Acto III; es la firma del IV.', state: 'mejorar' as CheckState },
    { title: 'Pie del login', body: 'Texto de 10-11px, chico para chicos.', state: 'falta' as CheckState },
    { title: 'Nombre', body: 'El encabezado dice PYSQLBOSSRUSH; el manual, PyCraft.', state: 'falta' as CheckState },
  ],
}

// ─── Anexo ───────────────────────────────────────────────────────────────────

export const ANNEX = {
  title: 'Dónde vive cada cosa',
  summary: 'Para cambiar algo, se cambia en su lugar.',
  rows: [
    { what: 'Colores y temas', where: 'app/globals.css' },
    { what: 'Jefes y su color', where: 'lib/game/bosses.ts' },
    { what: 'Diálogos de jefes', where: 'lib/game/dialogues.ts' },
    { what: 'Sprites de jefes', where: 'public/sprites/' },
    { what: 'Avatar del alumno', where: 'components/game/map/avatars.ts' },
    { what: 'Íconos pixel', where: 'components/game/architect/desktop/PixelBitmap.tsx' },
    { what: 'Jefes secretos', where: 'lib/game/secret/' },
    { what: 'El Pistolero', where: 'lib/game/raid/' },
    { what: 'Textos de este manual', where: 'app/demo/manual/content.ts' },
  ],
}
