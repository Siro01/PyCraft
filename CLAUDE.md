# CLAUDE.md — cómo trabajar en PyCraft BossRush

Guía para las sesiones de Claude Code en este repo. Lo que hace la plataforma, para quién es y cómo se usa está en el [README](README.md); acá va **cómo trabajar**: reglas, dónde vive cada cosa, cómo probar y qué está pendiente.

## Con quién trabajás

- Un **docente** de Argentina que da el taller presencial a chicos de **10 a 13 años**, en dos turnos (mañana y tarde).
- Todo en **español rioplatense** (vos): la interfaz, los textos para chicos, los comentarios del código y las respuestas.
- Prefiere que se avance directo ("seguí") en vez de propuestas largas. Las decisiones de diseño grandes se le consultan, con una recomendación.

## Reglas de trabajo (no negociables)

1. **Los commits los hace el docente.** Nunca `git commit` ni `git push`: dejar los cambios con `git add` y proponer un mensaje (`Feat: …` / `Fix: …`).
2. **Un solo servidor de desarrollo.** Antes de levantar uno, mirar si ya hay algo escuchando en el puerto 3000. Si el docente tiene su `next dev` corriendo, usar ese: dos servidores sobre la misma carpeta `.next` rompen la app (se pierde el CSS).
3. **Para arrancar el servidor**: `node node_modules/next/dist/bin/next dev`, o las configuraciones de `.claude/launch.json` (`PySQLBossRush` en el 3000 con Supabase; `PySQLBossRush-local` en el 3010 en modo local). `pnpm dev` puede quedar bloqueado por un chequeo de pnpm.
4. **Las migraciones de la base las corre el docente a mano** en el SQL Editor de Supabase. Nunca darlas por corridas: preguntar. Antes de pasar una, revisar que no borre ni modifique datos existentes (la base tiene datos de alumnos), envolverla en `BEGIN … COMMIT`, hacerla re-ejecutable (`IF NOT EXISTS`, `DROP … IF EXISTS`) y darle una consulta de solo lectura para verificar.
5. **Nada de seguridad en la documentación**: ni claves, ni cómo se protegen las rutas, ni los permisos de la base.
6. **Probar antes de dar algo por hecho**: `pnpm test`, `pnpm exec tsc --noEmit` y, si se ve en pantalla, el navegador. Decir con claridad qué se probó y qué no.

## Reglas del producto

- **La gamificación nunca reduce la práctica**: solo el código tipeado hace daño o avanza pasos. Bloques, ítems y ayudas no reemplazan escribir.
- **El progreso del alumno es sagrado**: un error puede ser espectáculo, nunca pérdida. Todo se guarda primero en la PC (borrador local) y después en la cuenta.
- **UI mínima**: nada de leyendas, cards ni textos de más. Lo secundario va escondido en íconos pixel o botones chicos (pistas, desafíos ⭐, detalles). Solo lo necesario a la vista.
- **Vocabulario para chicos**: nunca "apostar" ni "apuesta" (se dice "retarse por diamantes"); nunca el emoji 💎 (usar `components/ui/DiamondIcon.tsx`).
- **Arte original**: nada que copie ilustraciones de referencia. Las referencias que pasa el docente son de inspiración.
- **Privacidad**: en pantallas públicas (la muestra, el torneo) solo el alias del alumno, nunca su nombre completo, y nunca una tabla de posiciones individual. Se muestra el marcador por equipo.
- **Rodolfo** (el cerdito, `MascotGuide`) es la voz que explica errores y pistas, siempre con calma.

## Diseño

- El sistema es **PyCraft OS**: escritorio 1-bit, ventanas con barra rayada, borde de 2px, sombra dura, cero `border-radius`, sprites por píxeles. Tipografías: JetBrains Mono (lectura) y Jersey 25 (títulos y números).
- **Todo color sale de tokens** `hsl(var(--…))` definidos en `app/globals.css`, para los 3 temas (negro, blanco, rojo). Para darle a una zona el tema de un equipo se usan los valores de `MAP_PALETTES` (`lib/game/act-maps.ts`) como variables inline.
- **Excepción documentada**: los dibujos de las cartas usan una **paleta fija** (`lib/game/cartas/paleta.ts`), como los sprites de los jefes, para que el dibujo del alumno se vea igual en los 3 temas.
- `DESIGN.md` (sistema de diseño) y `PRODUCT.md` (principios) **los leen las herramientas de diseño** (Impeccable). Mantenerlos al día si cambia algo del sistema.
- **El hook de diseño** revisa cada edición contra `DESIGN.md`. Si un aviso es intencional (por ejemplo, los tamaños grandes del kiosco de la muestra), registrar la excepción con `hook-admin.mjs ignore-value` y un motivo. Las excepciones quedan en `.impeccable/config.json`.
- Animaciones: livianas, por pasos (`steps()`), y siempre respetando `prefers-reduced-motion`.

## Dónde vive cada cosa

| Tema | Archivos |
|---|---|
| Jefes y ejercicios | `lib/game/bosses.ts`, `lib/game/challenges.ts` (Junior / Trainee / Senior por jefe) |
| Planificación de clases | `lib/game/planificacion.ts` (28 clases + `PLAN_INTENSIVO`, 1 jefe por clase) |
| Guía del proyecto final para el docente | `lib/game/cartas/plan-final.ts` → ventana `app/admin/windows/PlanFinalWindow.tsx` |
| Ejecutar Python | `lib/game/executor/pyodide-runner.ts`: freno por tiempo, `input()`, `reino.db` de solo lectura, sondas |
| Ejecutar SQL | `lib/game/executor/sql-runner.ts` (sql.js) |
| Errores en palabras de chico | `lib/game/python-errors.ts`, `lib/game/friendly-error.ts` |
| Mi Reino | `lib/game/reino-store.ts` (registro de sentencias, cola sin conexión), `reino-engine.ts` (replay + tablas del juego), `reino-boot.ts` |
| Panel docente | `app/admin/AdminPanel.tsx` + `app/admin/windows/*` (un archivo por programa del escritorio) |
| Mapa del alumno | `components/game/BossMap.tsx`, `components/game/map/*`, `lib/game/act-maps.ts` |

### Proyecto final (Arena de Cartas)

| Pieza | Archivos |
|---|---|
| Reglas, motor de pelea, estrategias | `lib/game/cartas/reglas.ts` (una sola fuente de verdad: `REGLAS`) |
| Balance | `lib/game/cartas/balance.ts` + `tests/cartas/balance.test.ts` (falla si se desbalancea) |
| Guía de 10 pasos | `lib/game/cartas/guia.ts` (pasos, plantillas, cuándo está hecho cada uno) |
| Tabla `cartas`, versiones, restaurar | `lib/game/cartas/mazo.ts` |
| Guardado del proyecto y publicar | `lib/game/cartas/area-store.ts` |
| Pruebas de `carta()`, `revisar()` y `elegir()` | `lib/game/cartas/sondas.ts` |
| Paleta, frente, dorso y volteo | `lib/game/cartas/paleta.ts`, `plantillas-arte.ts` |
| Mazos de la CPU | `lib/game/cartas/cpu.ts` |
| Torneo y progreso por alumno | `lib/game/cartas/torneo.ts` |
| Datos de la muestra | `lib/game/cartas/muestra.ts` |
| Acceso a AreaTrabajo | `lib/game/cartas/acceso.ts` |
| Pantallas | `components/game/area/*` (AreaTrabajoApp, CartaPixel, PanelDiseno, EditorPixel, CartaVolteo, ArenaCartas), `components/game/muestra/*`, `app/admin/windows/AreaTrabajoWindow.tsx` |

**Cómo fluyen los datos:**
1. Las cartas son la tabla `cartas` del **Mi Reino** del alumno: viven en su registro de sentencias, que se reproduce al abrir.
2. Las tablas `reglas` y `economia` se agregan siempre al abrir el reino y no se pueden cambiar.
3. Desde Python, el reino se lee como `reino.db`, en solo lectura.
4. Lo demás (título, código, consultas, pasos, dibujos) es el proyecto del alumno, en `area_proyectos`.
5. Al publicar se guarda una foto completa del mazo. El panel la exporta como `muestra.json` y `/muestra` lee solo ese archivo, por eso funciona sin internet.

## Modelos y gasto de tokens

Lo que más gasta es el **largo de la sesión**: cada respuesta relee toda la conversación. Las 3 sesiones más largas (más de 750 respuestas cada una) se llevaron más de la mitad del gasto total del proyecto.

**Modelo de la sesión principal** (lo elige el docente en el selector de la app; no usar Fable):

| Tarea | Modelo |
|---|---|
| Decisiones de diseño, arquitectura, planes nuevos, balance de `REGLAS`, migraciones, errores difíciles de encontrar | **Opus** |
| Features ya definidas, ajustes de UI, textos, arreglos chicos, pruebas en el navegador | **Sonnet** |

**Agentes** (en `.claude/agents/`, cada uno con su modelo fijo). La sesión principal les pasa el trabajo en vez de hacerlo ella:

- `explorador` (Haiku): ubicar dónde vive algo antes de tocar código.
- `verificador` (Haiku): correr `tsc`, tests y `sim:balance` después de cada cambio; devuelve solo las fallas.
- `implementador` (Sonnet): cambios mecánicos ya decididos (textos, datos de jefes, aplicar un patrón en varios archivos).

**Reglas para Claude:**

1. Si la tarea pedida es de la otra fila de la tabla, decirlo en una línea al empezar ("esto conviene hacerlo en Opus/Sonnet") y seguir; el cambio lo hace el docente.
2. **Una sesión por tarea.** Cuando la tarea termina y llega otra que no depende de lo hablado, o la sesión pasa de unas 150 respuestas, proponer abrir una sesión nueva con un resumen corto.
3. No leer archivos enteros si alcanza con una parte; para búsquedas amplias, usar `explorador`.

**Medir:** `pnpm uso:tokens` suma el gasto por modelo y por sesión de los últimos días (`pnpm uso:tokens -- --dias 30`). Para evaluar si un modelo alcanza: mirar si los tests pasan al primer intento y cuántas veces hubo que rehacer algo.

## Cómo probar

- `pnpm test`: todos los tests. Los del proyecto final están en `tests/cartas/`. Si se toca `REGLAS`, mirar `pnpm sim:balance`.
- `pnpm exec tsc --noEmit`: tipos.
- **Páginas de prueba sin cuenta** (solo en desarrollo):
  - `/dev/area-trabajo`: el proyecto final, con datos del navegador.
  - `/dev/admin-os`: el panel docente con alumnos y mazos de ejemplo.
  - `/demo`: todos los jefes.
- **La muestra**: cargar un `muestra.json` desde ⇪, o guardarlo en el `localStorage` de la página.
- **Ojo**: si el panel del navegador está oculto, las animaciones CSS no avanzan. Verificarlas con `getAnimations()` y `currentTime`.

## Estado y pendientes (noviembre 2026)

- La migración `020_area_trabajo.sql` ya está corrida. Las 016 y 017 (Arena 2 vs 2) siguen sin correr.
- Falta probar AreaTrabajo con una cuenta real y abrir el proyecto ("Proyecto" en aulas.exe) para cada aula antes del Proyecto 1 (24/11).
- Calendario: clases de jefes 8 a 11 (preparan el mazo en Mi Reino y el Patio) → Proyecto 1 a 3 (24/11 al 1/12) → El Arquitecto → cierre con torneo (9 y 10/12) → muestra (~18/12).
- `elegir()` del alumno se valida en AreaTrabajo, pero **no se usa en las peleas**: hacerlo andar en la muestra requiere Python sin internet en la PC del stand. Hoy cada mazo juega con su orden de batalla.
- Sin probar en el navegador: los botoncitos de pista (💡) y desafío (⭐), el "+N" de reglas rotas y "Agregar la plantilla" de `elegir()` en AreaTrabajo.
- Próxima sesión: **ajustes de diseño** de AreaTrabajo, la arena y `/muestra`, siguiendo la regla de UI mínima.
