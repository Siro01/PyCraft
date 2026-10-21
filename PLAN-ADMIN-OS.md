# Plan — Panel docente como PyCraft OS

> Rediseño total de `/admin`. Hoy: 11 pestañas en fila + pilas de `.card` con esquina escalonada, cada pestaña con su propio selector de aula, mensajes de estado sueltos y un modal gris. Después: **un escritorio PyCraft OS del docente** — íconos de programa, ventanas `AppWindow` que se abren, arrastran y minimizan a una barra de tareas, y adentro de cada ventana solo lo que esa función necesita.

Modo Impeccable: **Operate** (el docente hace una tarea en clase, apurado, con chicos alrededor). La marca vive en los detalles: tinta invertida, borde de 2px, sombra dura, Jersey/VT323, sonidos de escritorio. Nada de croma nuevo: todo `hsl(var(--…))` de los 3 temas.

---

## 1. Qué se descarta del panel viejo

- La fila de 11 pestañas Silkscreen → se reemplaza por íconos de escritorio.
- `.card` / `pixel-corners-sm` (esquina escalonada, el vocabulario "de afuera") → el panel pasa a `.desk-theme` completo: esquina recta + borde 2px, como dashboard, patios y cofre.
- Un selector de aula por pestaña (Jefes, Repasos, Ejercicios, Stats, Reinos, Arena, Raids…) → **una sola "aula activa" en la barra de menú**, que manda en todas las ventanas.
- Textos de ayuda arriba de cada sección ("Habilitá cada jefe cuando…") → fuera. Si hace falta, va detrás de un `?` en el pie de la ventana.
- Spans de estado `✓ Alumno creado` sueltos → **línea de estado** en el pie de cada ventana (VT323, una línea, se borra sola).
- `confirm()` / `alert()` nativos y el modal gris de "resetear clave" → **diálogos `Win`** del sistema (tono `danger` para borrar, barra sólida, botones `OkButton`), el mismo idioma que las ventanas de error.
- Los links `Planificación →` / `Mesa del Pistolero →` como botones ghost → íconos de escritorio.

## 2. El escritorio

```
┌ PYCRAFT OS · DOCENTE ─── AULA ▾ PyCraft · Mañana · 08:00–11:00 ── ■ 7 activos ── 10:42 ┐
│                                                                                          │
│  [💀] jefes.exe     ┌ JEFES.EXE ────────────────────────── _ □ × ┐                         │
│  [🗀] aulas.exe      │  I PYTHON   ■ ■ ■ □ □                    │                         │
│  [⚔] alumnos.exe    │  II SQLITE  □ □ □ □                      │                         │
│  [🏫] repasos.exe    │  ...                                     │                         │
│  [>_] ejercicios.exe│  Dificultad  [TRAINEE] [NORMAL] [EXPERTO]│                         │
│  [Σ] stats.log      │──────────────────────────────────────────│                         │
│  [DB] reinos.db     │ > Jefe 4 habilitado para Mañana          │                         │
│  [⚔⚔] arena.exe     └──────────────────────────────────────────┘                         │
│  [☠] raid.exe                                                                            │
│  [🔑] test.exe                                              [SE BUSCA] pistolero          │
│  [📄] planificacion.txt                                                                   │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ [JEFES.EXE] [ALUMNOS.EXE]                                                                 │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
(los glifos del boceto son referencia; en la pantalla van los bitmaps reales de la tabla de abajo)

- **Marco**: el mismo `.desk` del dashboard (borde 2px `--tx`, fondo de puntos 14px, sombra `6px 6px 0`).
- **Barra de menú** (única información global, nada más):
  - `PYCRAFT OS · DOCENTE` en Jersey.
  - **Aula activa**: selector propio del sistema (lista desplegable con tinta invertida, no `<select>` nativo gris), formato `aulaLabel()`. Se recuerda en `localStorage` (`pysql:admin-aula`).
  - **Activos**: cuadrado + número (`■ 7`), del aula activa; tooltip "con algún ataque en los últimos 10 min".
  - Reloj HH:MM (el docente da clase por horario; `aulaHorario` ya existe). Opcional, ver decisiones.
- **Íconos** en columna a la izquierda (`.desk-icon`, 84px, `desk-lbl` VT323). Un clic abre/enfoca; si ya está minimizada, la restaura.
- **Badge solo cuando hay que actuar**: un número en acento sobre el ícono, nunca contadores decorativos. Casos: alumnos con aviso de progreso mezclado (compensar), un raid/evento en curso, códigos TEST por vencer.
- **Barra de tareas** abajo con las ventanas minimizadas/abiertas (tinta invertida = la enfocada).
- **Ventanas**: `AppWindow` (ya existe: barra rayada/sólida, minimizar, maximizar, cerrar, arrastre por barra, `sfx.pick/drop/minimize`). Posición y cuáles quedan abiertas se recuerdan por PC (`pysql:admin-desk`).
- **Al entrar**: escritorio vacío; cada programa se abre cuando el docente lo elige.
- **Teclado**: flechas entre íconos, Enter abre, Esc cierra la ventana enfocada, `Ctrl+↓` minimiza.
- **Angosto (< 720px)**: modo `flow` — una ventana a la vez a ancho completo, íconos en grilla arriba (mismo criterio que el dashboard).

### Íconos (todos existentes)

| Programa | Qué agrupa (pestañas viejas) | Ícono existente |
|---|---|---|
| `jefes.exe` | Jefes + Dificultades del aula | `IconSkull` (PixelIcons) |
| `aulas.exe` | Aulas (crear, horario, arena on/off, borrar) | `ICON_FOLDER` |
| `alumnos.exe` | Alumnos + resetear clave + Compensar | `ICON_TEAM_SHIELD` |
| `repasos.exe` | Repasos | `PlaceNode kind="school"` (la Escuelita) |
| `ejercicios.exe` | Ejercicios | `ICON_TERMINAL` |
| `stats.log` | Estadísticas | `IconSigma` |
| `reinos.db` | Reinos SQL | `IconDatabase` |
| `arena.exe` | Arena (1v1 y 2v2) | `ICON_SWORDS` |
| `raid.exe` | Raids | `ICON_RAID` |
| `test.exe` | Alumno TEST | `ICON_KEYS` |
| `planificacion.txt` | link a `/planificacion` | `ICON_FILE` |
| cartel SE BUSCA (otra punta) | `/admin/pistolero` + ensayo | `WantedDeskIcon` / `ICON_WANTED` |
| papelera (opcional) | destino de "borrar aula" | `ICON_BIN` / `ICON_BIN_OPEN` |

Si alguno no lee bien a 48px se resuelve en la fase de pulido, no dibujando íconos nuevos de entrada.

## 3. Cada ventana: solo lo necesario

Regla común: **renglones, no tarjetas** (como la Escuelita y el libro del Mercader). Encabezado de columnas en `label-mono`, filas de 2px de separación, acción principal a la derecha, estado por tinta invertida. Formularios de alta **plegados** detrás de un botón `+ Nuevo` en la barra de la ventana; no ocupan lugar permanente.

- **JEFES.EXE** — matriz: una fila por aula (todas, o solo la activa) y una columna por jefe, agrupadas por acto (`ActEmblem` + número romano). Cada celda es una **puerta de jefe** con el lenguaje del mapa (cuadrado dentro de cuadrado + glifo del tema): habilitado = interior en tinta, bloqueado = borde punteado tenue. Clic = alternar; flechas para moverse. Arriba, una placa con el jefe señalado (número, nombre, tema). Al final de cada fila, las 3 dificultades. Sin sprites grandes ni descripciones.
- **AULAS.EXE** — un renglón por aula: nombre · turno · horario (editable en el lugar) · alumnos/activos · `Arena ■/□`. Se borra arrastrando el renglón a la papelera. `+ Nueva aula` plegado.
- **ALUMNOS.EXE** — lista compacta (alumno, jefes, nivel; punto de activo y `!` de aviso), buscador y `+ Nuevo alumno` plegado. Clic en un alumno = **ficha** al lado (en angosto, en lugar de la lista): números del alumno, aula, cambiar clave, repasos individuales (puertas por acto) y compensar con su historial. Los avisos del 15/10 alimentan el número sobre el ícono. Los docentes (rol admin) no aparecen en la lista.
- **REPASOS.EXE** — la misma matriz que jefes: aulas × repasos (puerta llena = habilitado para toda el aula). Placa con el repaso señalado y cuántos lo terminaron; debajo, los alumnos de esa aula como fichitas (quién terminó, en qué paso va) que habilitan el repaso solo para quien faltó.
- **EJERCICIOS.EXE** — jefes a la izquierda; a la derecha el jefe elegido con solapas JUNIOR/TRAINEE/SENIOR (tachada si el aula la tiene apagada), daño total vs vida y los ejercicios en renglones (daño, % de acierto). Consigna, salida esperada, código inicial y pista detrás de un clic.
- **STATS.LOG** — los 4 números del aula activa en una línea y una solapa a la vez: por jefe, por alumno, lo que más cuesta. Barras segmentadas como la vida de los jefes.
- **REINOS.DB** — alumnos a la izquierda; a la derecha sus tablas de Mi Reino y las órdenes que guardó como consola de solo lectura.
- **ARENA.EXE** — solapas 1 vs 1 / 2 vs 2 con los duelos en renglones (cuándo, duelo, tema, resultado, apuesta, anular). Arriba, solo cuando pasa, el aviso en acento de una sala 2 vs 2 que llama al docente, con "Sumarme" (se revisa cada 15 s).
- **RAID.EXE** — Mesa del Pistolero, Ensayar y Ver raids arriba; solapas Todas / Pistolero / Jefes secretos; un renglón por raid con el equipo y sus aciertos, el resultado, lo que se movió y anular.
- **TEST.EXE** — el progreso del alumno TEST y cómo se entra en una línea; duración en botones y "Generar código"; los códigos vigentes en grande (clic copia) con su vencimiento y "Revocar". Reiniciar el progreso pide confirmación.

## 4. Arquitectura

Sin tocar datos ni APIs: `app/admin/page.tsx` sigue cargando todo en el servidor y el refresh de 30 s se mantiene.

```
components/admin/os/
  AdminDesktop.tsx      // marco .desk, íconos, ventanas, barra de tareas
  AdminMenuBar.tsx      // marca, aula activa, activos, reloj
  AulaPicker.tsx        // desplegable del sistema
  Taskbar.tsx
  SysDialog.tsx         // reemplazo de confirm()/alert()/modal: Win tone danger/safe
  StatusLine.tsx        // pie de ventana con el último mensaje
  useDesktopWindows.ts  // estado de ventanas (modo, x/y, z, foco) + persistencia
  AdminAulaContext.tsx  // aula activa compartida
app/admin/windows/      // contenido de cada ventana (los *Panel.tsx actuales, rediseñados)
```

- `useDesktopWindows` se escribe nuevo para el admin (el dashboard maneja sus ventanas a mano en `BossMap.tsx`; no se toca esa pantalla, ya aprobada). Si queda bien, más adelante se puede migrar el dashboard a usarlo.
- Los paneles actuales (`StatsPanel`, `RepasosPanel`, `ArenaPanel`…) dejan de tener su propio selector de aula y leen `AdminAulaContext`.
- `AdminPanel.tsx` (702 líneas) se parte: jefes, aulas y alumnos salen a sus propias ventanas.
- `AdminViewBar` sigue montada igual.

## 5. Fases

**F0 — Escritorio (paridad funcional el día uno).** Marco, barra de menú con aula activa, íconos, `AppWindow` + barra de tareas + persistencia, `SysDialog` y `StatusLine`. Los paneles actuales se montan tal cual dentro de las ventanas (feos pero completos), así nunca hay un momento con funciones perdidas.

**F1 — Lo de cada clase.** `JEFES.EXE` con puertas de jefe + dificultades, `AULAS.EXE` en renglones. Aula activa reemplaza los selectores propios.

**F2 — Alumnos.** Tabla + ficha del alumno (aula, clave, compensar, repasos individuales), badge de avisos. `CompensarPanel` se absorbe.

**F3 — Seguimiento.** `STATS.LOG`, `REPASOS.EXE`, `EJERCICIOS.EXE`, `REINOS.DB` a renglones.

**F4 — Eventos y pruebas.** `ARENA.EXE`, `RAID.EXE`, cartel del Pistolero, `TEST.EXE`, `planificacion.txt`.

**F5 — Pulido.** Hecho: temas dark/light/red revisados, teclado (flechas entre íconos, Enter, Esc, matrices, selector de aula), foco visible, movimiento reducido (regla global), texto de peligro en `--on-accent`, lugar reservado para la barra DOCENTE, sección "Panel docente" en `DESIGN.md` y página en el manual (`content.ts` + captura `panel-docente` + PDF reexportado).

Cada fase deja `/admin` andando; se prueba en el navegador con la cuenta admin antes de pasar a la siguiente.

## 6. Decisiones del docente (2026-10-21)

1. **Compensar** va dentro de la ficha de cada alumno (F2).
2. **Todas las aulas a la vez**: el selector de la barra suma "Todas las aulas" (y queda como opción por defecto). `JEFES.EXE` se vuelve una matriz aulas × jefes; las ventanas que necesitan una sola aula (repasos, reinos) muestran su propio selector cuando está "Todas".
3. **Al entrar** el escritorio arranca vacío: `jefes.exe` se abre solo cuando se elige.
4. **Reloj** en la barra de menú: sí.
5. **Borrar aula** arrastrándola a la papelera del escritorio (con diálogo de confirmación; con el teclado, `Supr` sobre el renglón).
