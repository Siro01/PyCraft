# Informe de armonía visual y experiencia — PyCraft BOSSRUSH

> Revisión del 21/10/2026 contra `DESIGN.md`, el manual de marca y la idea central **"El Escritorio de PyCraft OS"**.
> Método: un solo contexto (sin subagentes). 22 pantallas capturadas en escritorio (1440×900) y 9 en celular (390×844), alumno de prueba en modo local con 3 jefes vencidos; búsqueda de patrones en el código; detector de Impeccable sobre `app/` y `components/`.
> No vistas en vivo: `/raid`, `/pistolero` y `/secreto` (en modo local mandan al mapa porque piden cuenta del taller).

## 1. Veredicto

El sitio **tiene identidad propia**: nadie confundiría el cofre final, la Biblioteca, la Escuelita, el mapa o el final del Arquitecto con otro producto. El problema no está en las pantallas sino en **las costuras entre ellas**: cada programa se "enmarca" distinto, el encabezado cambia de pantalla en pantalla, el nombre de la marca aparece escrito de cuatro formas y quedan restos del lenguaje viejo (tarjetas, `confirm()` del navegador, colores fuera de la paleta).

**Por dónde empezar:** unificar el marco de los programas y el encabezado (punto 3.1). Es lo que más armonía da con un solo cambio y lo que más nota un chico que pasa del mapa a un patio, de ahí a la tienda y después al reino.

## 2. Puntaje (heurísticas de Nielsen, experiencia del alumno)

| # | Heurística | Nota | Lo principal |
|---|---|---|---|
| 1 | Estado del sistema | 3 | Sonidos, "autoguardado", barras de vida y XP. Falta: el mapa arranca minimizado y el escritorio se ve vacío. |
| 2 | Lenguaje del usuario | 3 | Voseo y tono de chico muy logrados. Se cuelan "storage", "LOCAL", "CTRL+ENTER". |
| 3 | Control y salida | 3 | "Volver al mapa" en casi todos lados. En 7 pantallas el encabezado no tiene "Salir" ni el nombre del alumno. |
| 4 | Consistencia | **2** | Cuatro marcos de programa distintos, cuatro encabezados, cuatro nombres de marca, Silkscreen adentro de los programas. |
| 5 | Prevención de errores | 3 | Confirma antes de borrar, pero con el `confirm()` gris del navegador. |
| 6 | Reconocer en vez de recordar | 3 | Íconos con nombre en el escritorio; placas al pasar por el mapa. |
| 7 | Atajos | 3 | Teclado en mapa, inventario, biblioteca, consolas (Ctrl+Enter). |
| 8 | Estética y mínimo | 3 | Casi todo limpio; algunas pantallas abren con un párrafo largo (patio de prácticas, reino, arena). |
| 9 | Recuperarse de errores | 4 | Errores de Python y SQLite traducidos, Rodolfo da la pista, el progreso nunca se pierde. |
| 10 | Ayuda | 3 | Rodolfo, apuntes, controles.txt. |
| | **Total** | **30/40** | **Bueno**: base sólida, hay que coser las uniones. |

## 3. Problemas por prioridad

### 3.1 [P1] Cada programa se enmarca distinto y el encabezado cambia — ✔ hecho el 21/10 (`ProgramShell` + `Header` que busca al usuario)
- **Qué pasa:**
  - Mapa, patios, tienda y Biblioteca viven dentro de un escritorio "PYCRAFT OS" con "← VOLVER AL MAPA".
  - Reino, Escuelita y Planificación son ventanas sueltas sobre la página.
  - La batalla no tiene ventana.
  - La Arena sin cuenta es una página web común: título grande y un párrafo en fuente del sistema, sin ventana.
  - El encabezado tiene cuatro versiones:
    - completo, con alumno y Salir: dashboard, batalla, tienda, admin;
    - pelado, sin alumno ni Salir: patios, Biblioteca, Escuelita, reino, planificación, arena;
    - legal: "PYCRAFT BOSSRUSH · Volver";
    - landing: "PYCRAFT + SQL = BOSSRUSH".
  - El final del Arquitecto tiene su propia barra.
- **Por qué importa:** la promesa del producto es "un sistema operativo". Cuando el marco cambia de pantalla en pantalla, se siente como varias páginas pegadas y no como un solo OS. El chico pierde el "dónde estoy" y el botón de salir.
- **Arreglo:**
  - Un solo marco de programa (`ProgramShell`) para todo lo que se abre desde el mapa. Lleva la barra de menú `PYCRAFT OS · NOMBRE.EXE`, nivel y diamantes, zoom si hace falta y "Volver al mapa". Es el mismo que ya usan patios y tienda.
  - Un solo `Header` que siempre muestre al alumno y Salir; hoy 7 páginas lo llaman sin pasarle el usuario.
  - Batalla y final pueden seguir siendo "pantalla completa", pero con la misma barra.
- **Comando sugerido:** `/impeccable extract` (sacar el marco a un componente) y después `/impeccable layout`.

### 3.2 [P1] El nombre de la marca aparece de cuatro formas
- **Qué pasa:** `PySQLBossRush` (7 lugares, incluido el logo del encabezado con "PY" y "BOSS" pintados de color), `PyCraft BossRush` (5), `PyCraft BOSSRUSH` (3) y `PYCRAFT + SQL = BOSSRUSH` (landing y login). El manual ya lo tenía anotado como pendiente.
- **Por qué importa:** es lo primero que se lee en cada pantalla, y cambia.
- **Arreglo:** que el docente elija una forma, y aplicarla en el logo, los títulos de pestaña (`<title>`), los legales y el manual.
- **Comando sugerido:** `/impeccable clarify`.

### 3.3 [P1] Colores fuera de la paleta — ✔ hecho el 21/10 (tokens, fondo de puntos, botones de ventana del sistema; quedan a propósito el celeste del Arquitecto y el ámbar del HUD del alumno TEST)
- **Qué pasa:** la regla es cero color en los temas oscuro y claro, y un solo carmesí en el rojo. Sin embargo:
  - el login pinta "BOSS-14" en ámbar (`hsl(38 92% 60%)`);
  - la landing usa amarillo `#FFB800` y la ventana de código tiene los tres semáforos de Mac (rojo, amarillo y verde);
  - `AsciiQuestion` usa ámbar `#F59E0B`;
  - el logo del encabezado tiñe "PY" con el color de Python.
  - Además, login y landing tienen un fondo de **cuadrícula**, mientras que todo el resto usa el fondo de **puntos**.
- **Por qué importa:** son la puerta de entrada. La primera impresión no coincide con lo que el chico ve después.
- **Arreglo:**
  - Pasar esos colores a tokens (`--accent`, `--tx2`).
  - Cambiar los semáforos por los botones de ventana del sistema (los mismos ×, minimizar y maximizar de `AppWindow`).
  - Unificar el fondo en puntos, o documentar la cuadrícula como "fondo de la landing" si es a propósito.
- **Comando sugerido:** `/impeccable colorize` (en modo quitar color) y `/impeccable polish`.

### 3.4 [P1] Diálogos del navegador en lugar de ventanas del sistema — ✔ hecho el 21/10 (`SysDialog` en `components/ui/`, 6 `confirm()` y el `prompt` de TEST.EXE reemplazados; queda el `prompt` de respaldo del HUD del alumno TEST)
- **Qué pasa:** quedan `confirm()` grises de Windows en:
  - **Reiniciar del patio de prácticas** (lo ven los chicos);
  - **usar el Teletransportador** en batalla (lo ven los chicos);
  - resetear progreso en modo local;
  - tres acciones de la Mesa del Pistolero.
  - Además hay `window.prompt` para copiar en el HUD del alumno TEST.
- **Por qué importa:** rompe la ilusión del OS en el peor momento, cuando el chico tiene que decidir algo. El sistema ya tiene sus propias ventanas de error y confirmación (`errors.tsx`, `SysDialog`).
- **Arreglo:** un `SysDialog` compartido (hoy vive en `components/admin/os/`) movido a `components/ui/`, y reemplazar los 6 `confirm()`.
- **Comando sugerido:** `/impeccable harden`.

### 3.5 [P2] Pantallas que siguen con el lenguaje viejo — ✔ hecho el 22/10 (Mi Reino, aviso LOCAL a la barra, vacíos como ventanas, botones al sistema; mapa y tienda en el marco único; queda la etiqueta escalonada de la landing, que es a propósito, y el HUD del alumno TEST)
- **Qué pasa:** 13 archivos todavía usan `.card`, `.btn-ghost` y `.btn-primary`. Los que más se notan:
  - **Mi Reino:** "Ejecutar" es una barra gris a todo el ancho que parece deshabilitada; "Descargar" y "Reiniciar" son botones chicos de otro estilo.
  - **Arena sin cuenta:** página web común, sin ventana.
  - **Aviso "◉ LOCAL — …" del dashboard:** tira tipo tarjeta, encima del escritorio.
  - Otros: `QueryBlocks`, `BossIntro`, `MascotGuide`, `ResetBossButton`, `CodeEditor`, `LocalDashboard`, `LocalBattleView`.
- **Arreglo:**
  - Mi Reino: botones `cta-btn` o de diálogo.
  - Arena sin cuenta: una ventana de error del sistema ("ARENA.EXE — necesitás la cuenta del aula") con Rodolfo.
  - Aviso "LOCAL": un ícono o un estado en la barra de menú, no una tira.
- **Comando sugerido:** `/impeccable polish` por pantalla.

### 3.6 [P2] Tipografía: Silkscreen se metió dentro de los programas y hay tamaños fuera de escala — ✔ hecho el 22/10 (botones del OS en Jersey, Silkscreen solo en la landing, piso de 12px)
- **Qué pasa:**
  - El manual dice que Jersey nombra y manda, VT323 habla y Silkscreen solo etiqueta la landing. Sin embargo, botones dentro de programas usan `cta-btn` (Silkscreen): "▶ EJECUTAR (CTRL+ENTER)" en dos líneas, "ABRIR LIBRO", los botones del 404.
  - El login tiene etiquetas de 8 a 11px ("Alumno" / "Admin" casi ilegibles).
  - El detector marcó 107 tamaños fuera de la escala de `DESIGN.md`, sobre todo en `globals.css`, login y landing.
- **Arreglo:**
  - Decidir si `cta-btn` adentro de programas pasa a Jersey (como `OkButton`) o si se acepta Silkscreen y se actualiza el manual.
  - Piso de 12px para cualquier texto que un chico tenga que leer.
- **Comando sugerido:** `/impeccable typeset`.

### 3.7 [P2] Celular
- **Patio de prácticas:** la barra "PYCRAFT OS" se parte en dos líneas, los botones se cortan ("REINICI") y hay desborde horizontal.
- **Batalla:** el diálogo del jefe corta palabras al medio ("Tengo d / e todo…") porque escribe letra por letra sin respetar las palabras.
- Como las PCs del taller son de escritorio, va después de lo anterior.
- **Comando sugerido:** `/impeccable adapt`.

### 3.8 [P3] Detalles
- **Dashboard en tema oscuro:** el escritorio sale **blanco** (toma la paleta del Acto I aunque el mapa esté minimizado) y queda un bloque blanco sobre la página negra.
- **El mapa arranca minimizado:** el chico entra a un escritorio vacío con 5 íconos. Fue una decisión reciente (commit 8ef1a8d), así que la dejo como pregunta.
- **Recorte en el borde derecho:** en la landing y en el cofre final asoma, cortada en el borde derecho, una cajita con un sprite rosa. Si es el aviso de Rodolfo "asomándose", hoy parece un error de recorte.
- **Pie de página:** aparece en login, landing, 404 y legales, pero no en el resto. Está bien que no esté en los programas; conviene que los cuatro que lo tienen sean idénticos.

## 4. Lo que está muy bien (y sirve de modelo)
- **Cofre final y final del Arquitecto:** el OS en su mejor versión. Ventanas apiladas, íconos con nombre, barra de estado, error como espectáculo.
- **Biblioteca y Escuelita:** objetos propios (estante, pupitre), una idea por pantalla, Rodolfo integrado y no pegado.
- **Tienda del Mercader:** paleta propia sin romper las reglas (bordes, sombra dura, tokens).
- **404 y Privacidad:** hasta las páginas "aburridas" son ventanas `.EXE`.
- **Panel docente:** ya sigue el mismo modelo de escritorio.

## 5. Personas

- **Alumno de 11 años en una PC del taller.**
  - Pasa del mapa al patio y pierde el "Salir" y su nombre arriba.
  - En el patio de prácticas toca "Reiniciar" y le aparece una ventana gris de Windows.
  - En Mi Reino, "Ejecutar" parece apagado.
  - En la arena sin cuenta, lee un párrafo y no sabe qué hacer.
- **Docente en clase, apurado.**
  - El nombre del sitio cambia según la pantalla que proyecta.
  - En la Mesa del Pistolero confirma tres veces con diálogos del navegador.
- **Chico que usa solo el teclado.** Bien atendido en mapa, inventario y biblioteca. En los `confirm()` del navegador el foco salta a un diálogo que no se parece a nada del juego.

## 6. Orden recomendado

1. **Marco único de programa y encabezado único** (3.1, y 3.2 de paso). Es la mayor ganancia de armonía.
2. **Arreglos rápidos de entrada:** colores fuera de paleta, fondo de cuadrícula, semáforos (3.3) y `confirm()` → `SysDialog` (3.4). Entran en una sesión.
3. **Pantallas con lenguaje viejo:** Mi Reino, Arena sin cuenta, aviso LOCAL (3.5).
4. **Decisión tipográfica** sobre Silkscreen adentro de los programas y piso de 12px (3.6).
5. **Celular** (3.7) y detalles (3.8).
6. Cerrar con `/impeccable polish` y volver a correr esta revisión.

## 7. Preguntas abiertas para el docente
- ¿Qué nombre queda: **PyCraft BOSSRUSH**, **PySQLBossRush** o **PYCRAFT + SQL = BOSSRUSH**?
- ¿La landing y el login mantienen un lenguaje propio (cuadrícula, Silkscreen, esquinas escalonadas) o se suman al escritorio?
- ¿El mapa debe arrancar abierto o minimizado?
