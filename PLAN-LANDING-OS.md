# Plan — Landing como escritorio de PyCraft OS

> **Estado (2/11/2026):** F0–F3 hechos. `/` monta `LandingDesktop`; la landing vieja, `PycraftOS`, `HeroSparks`, `ImageAccordion` y `useReveal` se borraron. §9 se resolvió con las opciones recomendadas. Cambio respecto del plan: el celular acostado (alto < 500px) también usa la versión de bolsillo.

> Rediseño total de `/`. Hoy: una landing de scroll con 7 secciones apiladas (hero, diálogo, carrusel de jefes, fases, dificultad, mecánicas, CTA final) y un footer de 4 columnas; usa vocabulario "de afuera" (badge redondeado, brillo radial difuso, `PixelBlob`, marquee, acordeón con hover) y el escritorio PyCraft OS aparece solo como una sección más. Después: **la landing ES el escritorio** — una sola pantalla, el título como fondo de pantalla, cada sección es un archivo que se abre en una ventana, el header es la barra de menú y el footer es la barra de tareas + menú INICIO.

Modo Impeccable: **Persuade** (el visitante —alumno, familia, escuela— entiende qué es en 5 segundos y entra o prueba un jefe). El mundo visual ya está fijado en `DESIGN.md` ("El Escritorio de PyCraft OS"): no se inventa nada nuevo, se alinea la landing a ese mundo. Todo color sale de `hsl(var(--…))`; los 3 temas y la temporada de Halloween se repintan solos.

---

## 1. Qué se descarta

- El scroll de 7 secciones → **una pantalla** (`100dvh`), sin scroll de página en escritorio; cada ventana scrollea adentro.
- Badge `rounded-full` "Taller de programación — Argentina 2025" (redondeado y con año viejo) → fuera. La fecha/hora vive en la barra de menú.
- Brillo radial de acento, `PixelBlob`, `PixelDust` → fuera (difuso = contra el sistema: cero blur).
- Marquee de jefes con máscaras de degradé → carpeta `jefes/` con íconos de archivo.
- `ImageAccordion` (depende de hover, otra versión en mobile) → un solo `mercader.exe` igual en los dos tamaños.
- `Reveal` por scroll, indicador "scroll ↓" → no hay scroll.
- Footer de 4 columnas → menú INICIO + `acerca_de.txt` + bandeja de la barra de tareas.
- Nav con links a anclas → los íconos del escritorio (las anclas viejas siguen funcionando, ver §6).

**Se conserva**: terminal `PYTHON_SQL.EXE` con el validador de variables, diálogo Rodolfo/creeper, `BossCard` (como ícono de archivo), datos de `BOSSES`, papelera con su mensaje, `CrashTransition` al entrar, `MascotGuide`, toggle de tema, sonidos `sfx`.

## 2. El escritorio (≥ 720px)

Pensado primero para la PC del taller: **1366×768** (y que entre en 1280×720 sin tapar nada).

```
┌ ▣ PYCRAFT OS ─────────────────────────────── BN ─ 10:42 ─ [▶ ENTRAR] ┐  barra de menú 32px
│ ▤ LEEME.txt     ▣ probar.py                               ☺↗          │
│ ▭ jefes/        ⚙ dificultad.cfg                    probar_un_jefe     │
│ ▦ como_se_juega ◈ mercader.exe                                         │
│                                                                        │
│                  PYTHON + SQL =                                        │  fondo de pantalla
│                  BOSS RUSH                                             │  (el título)
│        Python y SQLite contra 14 jefes, con código real.               │
│           [▶ ENTRAR AL TALLER]   [ PROBAR UN JEFE ]                    │
│                                                                        │
│ ⚿ privacidad.txt                                                ▥     │
│ ⓘ acerca_de.txt                                             Papelera   │
├────────────────────────────────────────────────────────────────────────┤
│ [▶ INICIO] │ [LEEME.TXT] [JEFES]          │ © 2026 · no oficial de MC  │  barra de tareas 36px
└────────────────────────────────────────────────────────────────────────┘
```
(glifos de referencia; en pantalla van los bitmaps reales de §4)

- **Marco**: el `.desk` de siempre a pantalla completa — fondo `--bg` con puntos `--tx / 0.15` cada 14px, sin el borde exterior ni la sombra (la pantalla ya es el monitor).
- **Fondo de pantalla = hero**. El `<h1>` es el título: `Python` en `--python`, `SQL` en `--sql`, `+ =` en `--tx3`, `BOSS RUSH` con `bandedGradient()`. Tamaño `clamp(3rem, 8vw, 6.5rem)`, centrado en el área libre a la derecha de los íconos. Debajo, una línea en VT323 `--tx2` y los dos CTA. El tipeo de "BOSS RUSH" se conserva (una vez, 0,5 s); el `ShatterText` queda solo al pasar el mouse.
- **Íconos**: columna doble arriba a la izquierda (`.desk-icon` 84px, etiqueta VT323). **Un clic abre** (son chicos; nada de doble clic). Legales abajo a la izquierda; papelera abajo a la derecha; `probar_un_jefe` arriba a la derecha (misma punta que el cartel del Pistolero en el admin).
- **Ventanas**: `AppWindow` + `useDesktopWindows` del panel docente (minimizar, maximizar, cerrar, arrastre, `sfx`). Se abren en cascada a la derecha del título para no taparlo; si no entra, van encima y el título queda de fondo (es lo esperable en un SO). Clave de storage propia: `pysql:landing-desk`.
- **Al entrar**: ninguna ventana abierta — el título manda. Rodolfo asoma con un solo tip: "Tocá un archivo para abrirlo".
- **Barra de menú** (= header): `▣ PYCRAFT OS` (el cofre; clic = menú INICIO), selector de tema `BN/WH/RD` como item de menú, reloj, y **`▶ ENTRAR`** siempre visible a la derecha.
- **Barra de tareas** (= footer): botón `▶ INICIO`, las ventanas abiertas (tinta invertida = enfocada), y en la bandeja `© 2026 · Siro Torres` + "no oficial de Minecraft" (abre `acerca_de.txt`).
- **Menú INICIO**: lista con tinta invertida al hover → Entrar al taller · Probar un jefe gratis · Inscripciones (solo si `SITE.inscripcionesUrl`) · Código en GitHub · Privacidad · Cookies · Acerca de PyCraft OS.
- **Altura baja (< 600px)**: el escritorio deja de fijarse a `100dvh` y la página scrollea, nunca se recorta el CTA.

## 3. Mobile (< 720px): el mismo SO, versión de bolsillo

Mismo corte que el admin (`useNarrowDesk`).

```
┌ ▣ PYCRAFT OS        BN  10:42 ┐   barra 40px
│                               │
│        PYTHON + SQL =         │   fondo de pantalla ~35%
│         BOSS RUSH             │
│  Python y SQLite vs 14 jefes  │
│                               │
│  ▤      ▭      ▦      ⚙       │   grilla de 4 columnas,
│ LEEME  jefes  cómo   nivel    │   celdas de 76px (objetivo ≥ 48px)
│  ◈      ▣      ☺↗     ⓘ       │
│ merca  probar  jefe  acerca   │
│                        ▥      │
├───────────────────────────────┤
│ [▶ INICIO] [▶ ENTRAR AL TALLER]│   dock 64px + safe-area
└───────────────────────────────┘
```

- **Una ventana a la vez, a pantalla completa** (`AppWindow flow`/maximizada) entre la barra y el dock. Barra de título con `←` (volver al escritorio) y `×`; sin arrastre ni minimizar.
- **El dock nunca se tapa**: `▶ ENTRAR AL TALLER` queda visible aunque haya una ventana abierta. Es el único botón lleno de acento en la pantalla.
- **Atrás de Android cierra la ventana** (cada ventana empuja una entrada al historial con su hash).
- Segundo CTA (`PROBAR UN JEFE`) va en el fondo de pantalla debajo del subtítulo y como ícono `probar_un_jefe`.
- Landscape de celular (alto < 480): grilla de 6 columnas, título más chico, el dock se mantiene.

## 4. Archivos del escritorio (secciones)

Cada ventana: **≤ 40 palabras de texto corrido**, el resto es contenido visual. Todos los íconos ya existen en `PixelBitmap`; lo único nuevo es una flechita de acceso directo (5×5) que se superpone a los íconos que llevan a otra página.

| Archivo | Viene de | Ícono | Ventana |
|---|---|---|---|
| `LEEME.txt` | diálogo NUEVO_EN_PYCRAFT | `ICON_FILE` | Rodolfo y el creeper en 3 burbujas que entran por pasos al abrir. Cierra con un `OkButton` "¡Dale!" que abre `jefes/`. |
| `jefes/` | carrusel de jefes | `ICON_FOLDER` | Vista de carpeta: 14 `BossCard` como íconos de archivo, agrupados por acto (I Python · II SQLite · III Integración). El 14 es `???.exe` bloqueado. Clic en un jefe = línea de estado al pie: nombre + tema. Los GIF cargan recién al abrir la carpeta. |
| `como_se_juega.exe` | fases (`PycraftOS`) | `ICON_CUBE` | Los 3 pasos `01 → 02 → 03` en renglones, cada uno con su color (`--python`, `--sql`, `--accent`) y el rango de jefes. |
| `dificultad.cfg` | niveles de combate | `ICON_SWORDS` | Un panel de configuración: 3 opciones tipo radio (JUNIOR ● / TRAINEE / SENIOR *próximamente*), al elegir cambia la descripción de 1 línea y la barra de RETO. Es demostrativo, no guarda nada. |
| `mercader.exe` | mecánicas | `CHEST_CLOSED` | Inventario del Mercader: 4 casilleros (amuleto de debilidad, poción, teletransportador + el mercader), clic = descripción abajo. Igual en mobile y desktop. |
| `probar.py` | terminal del hero | `ICON_TERMINAL` | `PYTHON_SQL.EXE` tal cual, con el validador de variables. |
| `probar_un_jefe` ↗ | footer "Probar un jefe gratis" | sticker creeper + ↗ | Acceso directo a `/demo`. |
| `privacidad.txt` ↗ | footer legal | `ICON_KEYS` | Acceso directo a `/privacidad` (cookies desde INICIO y desde `acerca_de`). |
| `acerca_de.txt` | footer completo | `ICON_FILE` | "Propiedades del sistema": qué es la plataforma, "tus datos", aviso de Mojang/Microsoft, autor, links legales. |
| Papelera | broma de `PycraftOS` | `ICON_BIN` / `ICON_BIN_OPEN` | Igual que hoy: no acepta nada y explica por qué (`tone="danger"`). |

**Copy condensado (borrador, a aprobar — no agrega afirmaciones nuevas):**
- Subtítulo del fondo: "Python y SQLite contra 14 jefes, con código real." (hoy: "Un taller donde aprendés a programar Python y SQLite derrotando 14 jefes inspirados en Minecraft. Sin aburrirte. Sin PowerPoint.")
- `como_se_juega`: "01 Python — variables, bucles, listas y funciones. Jefes 1–6." · "02 SQLite — CREATE, SELECT, WHERE, UPDATE. Jefes 7–10." · "03 Integración — Python + sqlite3 en proyectos reales. Jefes 11–14."
- `dificultad.cfg`: JUNIOR "Completás huecos, con tips de Rodolfo." · TRAINEE "Escribís vos; cada error te cuesta vida." · SENIOR "Sin guías ni tips. Próximamente."
- `mercader`: "Cada 2 jefes aparece el Mercader con un amuleto para la próxima batalla."

## 5. Paleta: qué token hace qué

Un solo idioma: **tinta sobre papel**; el color solo marca significado.

| Rol | Token | Regla |
|---|---|---|
| Pantalla / fondo de pantalla | `--bg` + puntos `--tx / 0.15` | Nunca degradés ni brillos. |
| Barra de menú, barra de tareas, dock, cuerpo de ventana | `--surface` | Borde `2px --tx` hacia el escritorio. |
| Ventana enfocada | barra sólida `--tx`, título `--bg` | Desenfocada: rayado `.hatch` + título en `--surface`. |
| Separadores internos, celdas | `--border2` | 2px, recto. |
| Texto principal / secundario | `--tx` / `--tx2` | `--tx3` solo para etiquetas mono y los `+ =` del título, nunca para párrafos. |
| **CTA ENTRAR** | fondo `--accent`, texto `--on-accent` | **Único elemento lleno de acento en la pantalla** (barra de menú y dock son el mismo botón según tamaño). En el fondo de pantalla, ENTRAR también lleno; PROBAR UN JEFE con borde `--tx`, se invierte al hover. |
| Python / SQL | `--python` / `--sql` | Solo para nombrar el lenguaje: título, actos de `jefes/`, pasos 01/02. |
| Peligro | `--danger` | Papelera y SENIOR. Nada más. |
| Foco de teclado | outline `2px dashed --tx`, offset 2 | Visible en los 4 temas. |
| Sombras | `N px N px 0 --tx / 0.2` | Duras; ventana 6px, botones 3px. |

Chequeo por tema: `dark` (BN), `light` (WH), `red` (carmesí, texto del CTA `#fff` ya resuelto) y `data-season="halloween"` (calabaza; `--on-accent` ya resuelto). No se agrega ningún color nuevo.

## 6. Comportamiento

- **Links profundos**: `/#jefes`, `/#como-funciona`, `/#dificultad` (las anclas viejas) abren su ventana al cargar. Abrir una ventana actualiza el hash con `replaceState` en desktop y `pushState` en mobile (para el botón atrás).
- **Teclado**: Tab recorre barra de menú → CTA del fondo → íconos → barra de tareas. Flechas entre íconos, Enter abre, Esc cierra la enfocada. Al abrir, el foco entra a la ventana; al cerrar, vuelve al ícono.
- **Lectores de pantalla**: el escritorio es una `nav` con los íconos como links/botones con nombre legible ("Abrir jefes: los 14 jefes del taller"); cada ventana es `role="dialog"` con `aria-labelledby` en su título. El `<h1>` y el subtítulo están en el DOM desde el servidor.
- **`prefers-reduced-motion`**: sin tipeo, sin shatter, sin burbujas por pasos; ventanas aparecen sin animación. El `CrashTransition` se reemplaza por navegación directa.
- **ENTRAR** desde cualquier lugar dispara el `CrashTransition` → `/login` (hoy solo lo hacía el CTA final).
- **Rodolfo**: `MascotGuide` con un tip por ventana enfocada (una línea), nunca encima del dock en mobile.
- **Rendimiento** (PCs del taller, wifi inestable): el contenido de cada ventana se carga con `next/dynamic` al abrirla; en el primer render solo va el fondo de pantalla, los íconos y las barras. El título es texto (LCP rápido), Jersey ya se precarga.

## 7. Arquitectura

```
components/landing/
  LandingDesktop.tsx    // marco a pantalla completa, fondo, íconos, ventanas, barras (reemplaza LandingPage)
  Wallpaper.tsx         // h1 + subtítulo + los 2 CTA
  MenuBar.tsx           // cofre, tema, reloj, ENTRAR
  Taskbar.tsx           // INICIO, ventanas, bandeja; en mobile pasa a dock
  StartMenu.tsx
  useLandingHash.ts     // hash ↔ ventana abierta, historial en mobile
  windows/
    Leeme.tsx  Jefes.tsx  ComoSeJuega.tsx  Dificultad.tsx  Mercader.tsx  Probar.tsx  AcercaDe.tsx
```

- `useDesktopWindows` y `useNarrowDesk` se mueven de `components/admin/os/` a `components/ui/desk/` para que los usen el admin y la landing (el admin solo cambia el import).
- `CodeTerminal`, `checkAssignment`, `BossCard`, `Bubble` salen de `LandingPage.tsx` a `windows/`.
- `PycraftOS.tsx` deja de usarse en la landing (su contenido pasa a `como_se_juega` y a la papelera). Se borra cuando no quede ningún import.
- `SiteFooter` no se toca: lo siguen usando las otras páginas.
- `app/page.tsx` monta `LandingDesktop`. La `/demo/landing-os` queda como preview mientras se arma (patrón de `/dev/admin-os`).

## 8. Fases

**F0 — Escritorio.** Marco a pantalla completa, fondo de pantalla con título y CTA, barra de menú, íconos, ventanas + barra de tareas, modo mobile con dock, hash. Las ventanas montan el contenido actual sin recortar (feo pero completo).

**F1 — Ventanas.** `LEEME`, `jefes/` en vista de carpeta, `como_se_juega`, `dificultad.cfg`, `mercader`, `probar.py`, con el copy condensado aprobado.

**F2 — El footer adentro del SO.** Menú INICIO, `acerca_de.txt`, accesos directos legales, bandeja, papelera, Rodolfo por ventana, CrashTransition en todos los ENTRAR.

**F3 — Pulido.** Teclado y foco, reduced-motion, los 4 temas, capturas en 1366×768, 1280×720, 375×812, 390×844 y un celular en horizontal. Borrar `LandingPage.tsx` y `PycraftOS.tsx` viejos.

## 9. Decisiones abiertas

1. **Copy condensado de §4** — aprobar o corregir antes de F1.
2. **Arranque**: sin pantalla de booteo (recomendado: los chicos entran apurados y la PC del taller es lenta) vs. un booteo ASCII de ≤ 1 s solo la primera visita.
3. **CTA principal**: ENTRAR AL TALLER (recomendado, el público real son alumnos con cuenta) vs. PROBAR UN JEFE para visitantes.
4. **Ventana abierta al entrar**: ninguna (recomendado, el título es el hero) vs. `LEEME.txt` abierto al costado.
