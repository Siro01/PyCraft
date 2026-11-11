<div align="center">

```
┌──────────────────────────────────────────────┐
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒ PYCRAFT_BOSSRUSH.EXE ▒▒▒▒▒▒▒▒▒▒▒│
├──────────────────────────────────────────────┤
│                                              │
│   PYTHON  +  SQL  =  B O S S   R U S H       │
│                                              │
│      14 jefes · código real · cero miedo     │
│                                              │
└──────────────────────────────────────────────┘
```

**Un taller de programación donde el código es el arma y el proyecto final es tu propio mazo de cartas.**

![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=nextdotjs)
![React](https://img.shields.io/badge/React-18-000000?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-000000?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3-000000?style=flat-square&logo=tailwindcss)
![Uso](https://img.shields.io/badge/uso-educativo-DC143C?style=flat-square)

</div>

---

## Índice

1. [Qué es](#qué-es)
2. [Para quién y para qué](#para-quién-y-para-qué)
3. [El recorrido del alumno](#el-recorrido-del-alumno)
4. [El proyecto final: la Arena de Cartas](#el-proyecto-final-la-arena-de-cartas)
5. [Herramientas del docente](#herramientas-del-docente)
6. [La muestra final](#la-muestra-final)
7. [Los jefes](#los-jefes)
8. [Para desarrollar](#para-desarrollar)
9. [Diseño](#diseño)
10. [Privacidad, licencia y créditos](#privacidad)

---

## Qué es

**PyCraft BossRush** es una plataforma web para talleres de introducción a **Python** y **SQL** con chicos de 10 a 13 años. El alumno avanza derrotando **14 jefes inspirados en Minecraft**, y cada golpe es código real que se ejecuta en su navegador, sin instalar nada: Python con [Pyodide](https://pyodide.org) y SQLite con [sql.js](https://sql.js.org).

Para cerrar el taller, cada alumno diseña y programa **su propio mazo de 6 cartas**: con SQL arma y balancea su tabla `cartas`, con Python escribe cómo se ve cada carta, dibuja el arte en una grilla de píxeles y su mazo pelea en la muestra final contra los del otro turno.

> Pensado para el aula: PCs del taller, wifi inestable y un docente presente. Lo que el alumno hace se guarda primero en su PC y después en su cuenta, y ningún error del juego puede borrarlo.

## Para quién y para qué

| Quién | Para qué lo usa |
|---|---|
| **Alumno** (10 a 13 años) | Aprender Python y SQL peleando jefes, practicar en el patio, repasar si faltó y armar su proyecto final. |
| **Docente** | Abrir jefes y dificultades por aula, seguir el avance de cada alumno, proyectar los ejercicios de cada clase, organizar eventos en vivo y preparar la muestra. |
| **Visitantes de la muestra** | Ver los mazos de los chicos y jugar con ellos en el stand, sin cuenta. |

Casos de uso típicos de una clase:

1. El docente proyecta el ejemplo del día desde el **Libro de Planificación** y el aula lo escribe en el **Patio de prácticas**.
2. El docente abre el jefe de la clase para el aula. Cada alumno lo pelea a su ritmo.
3. Quien terminó juega la **Arena**, el **Patio de juegos** o busca cofres secretos. Quien faltó tiene un **Repaso con Rodolfo**.
4. En el **panel docente** se ve quién avanzó, quién está trabado y qué ejercicio cuesta más.

## El recorrido del alumno

### El mapa y los jefes

- Entra con un **usuario y una contraseña** que le da el docente (no se piden datos personales).
- Ve un **mapa por actos** (I Python · II SQLite · III Integración · IV El Arquitecto). Cada puerta es un jefe; el docente los habilita clase a clase.
- Elige una **dificultad** entre las que abrió el docente: **Junior** (código con huecos `___` para completar), **Trainee** (escribe más y tiene vida) o **Senior**.
- En la **batalla** escribe el código, lo ejecuta y cada ejercicio correcto le saca vida al jefe. Un ejercicio pega una sola vez. **Rodolfo**, el cerdito guía, da pistas y explica cada error con palabras simples.
- Al vencer al último jefe hay un cierre con El Arquitecto, que pide la opinión del alumno sobre el taller.

### Alrededor de los jefes

| Lugar | Qué es |
|---|---|
| **Patio de prácticas** | Editor libre, en Python o SQL, para escribir lo que proyecta el docente. En Python puede leer el mazo del alumno como `reino.db`. |
| **Patio de juegos** | Tandas cortas de ejercicios que dan diamantes. |
| **Biblioteca** | Un libro por acto con teoría, código que se ejecuta y "hechizos" para practicar. |
| **Repasos con Rodolfo** | Una escuelita para quien faltó, que el docente habilita por aula o por alumno. |
| **Mercader del Abismo** | Tienda con ítems para usar en batalla (se activan escribiendo `print(nombre)`), amuletos y stickers. |
| **Cofres y jefes secretos** | Dos cofres por acto: uno a la vista y otro por un camino escondido, que lleva a un jefe secreto. |
| **Mi Reino** | La base SQLite propia del alumno, que se guarda en su cuenta y lo sigue a cualquier PC. Cada jefe vencido deja un trofeo. Ahí vive la tabla `cartas` del proyecto final. |
| **La Arena** | Duelos de ejercicios entre compañeros del aula, 1 vs 1 o 2 vs 2. |
| **Raids y El Pistolero** | Eventos en equipo y en vivo: ver [Herramientas del docente](#herramientas-del-docente). |

## El proyecto final: la Arena de Cartas

Cada alumno arma **un mazo de 6 cartas** en **AreaTrabajo**, un programa de su escritorio que se abre cuando tiene Mi Reino y el docente lo habilita para su aula.

**La mesa** muestra una carta a la vez, en grande, con sus 6 miniaturas abajo y una barra de **presupuesto** (la suma del poder del mazo, que no puede pasar de 30). A la derecha escribe en **SQL**, **PYTHON** o **DISEÑO**. A la izquierda, una **guía de 4 capítulos y 10 pasos** que se marcan solos:

| Capítulo | Pasos | Qué aprende |
|---|---|---|
| **CREAR** | 1 Tu tema · 2 Tu tabla · 3 Las 6 cartas | `CREATE TABLE` con una columna inventada, `INSERT` |
| **BALANCEAR** | 4 Leé las reglas · 5 Cazá las cartas rotas · 6 Arreglá y elegí tu orden | `SELECT`, `WHERE`, `SUM`, `UPDATE`, `ORDER BY` |
| **PROGRAMAR** | 7 Tu carta en Python · 8 Tu revisor de reglas | `sqlite3`, diccionarios, f-strings, funciones con `return` |
| **PELEAR** | 9 Probá en la arena · 10 Publicá | Estrategia; ⭐ desafío: su propia función `elegir()` |

- **Las reglas del juego**: cada carta tiene `poder`, `rareza` (común, rara, épica, legendaria; cada una con un tope de poder) y `color` (liso, rayas, damero, ondas). Los colores forman un círculo de ventajas: liso le gana a rayas, rayas a damero, damero a ondas y ondas a liso, con +4 de poder. Las reglas también son una tabla (`reglas`) que el alumno consulta con SQL pero no puede cambiar.
- **Las plantillas** traen huecos `___` y se agregan al final de lo que el alumno escribió, sin borrar nada. Cada paso tiene pistas escondidas detrás de un botón.
- **La plataforma es el árbitro**: después de cada ejecución prueba sola las funciones del alumno (`carta()`, `revisar()`, `elegir()`) y le dice qué anduvo y qué no.
- **Diseño**: con la paleta de PyCraft (10 colores con sombra, base y luz) dibuja el **frente** de cada carta (16×16), el **dorso** del mazo (16×22, con espejo para hacer alfombras) y elige cómo se **da vuelta** al atacar (giro, salto, píxeles o barrido). Hay plantillas para arrancar.
- **Arena de prueba**: juega contra tres mazos de la CPU (Los Novatos, El Tanque y el Jefe de práctica ⭐). La CPU muestra antes el color de la carta que va a jugar.
- **Volver atrás**: se guarda una versión cada 10 minutos y antes de cualquier orden peligrosa (por ejemplo, un `DELETE` sin `WHERE`). Restaurar no toca los trofeos.
- **Publicar**: con los pasos 1 a 9 hechos y el mazo cumpliendo las reglas, el mazo pasa a la muestra. Se puede volver a publicar.

Las clases de los jefes 8 a 11 ya preparan el mazo en **Mi Reino** y en el **Patio**; las tres clases de proyecto se hacen en AreaTrabajo. El paso a paso de cada clase está en `plan_final.txt`, dentro del panel docente.

## Herramientas del docente

El **panel docente** es un escritorio de PyCraft OS con un programa por tarea. Arriba se elige el aula activa.

| Programa | Para qué |
|---|---|
| **jefes.exe** | Abrir o cerrar cada jefe y cada dificultad, por aula. |
| **aulas.exe** | Crear aulas (con turno y horario) y abrir la Arena y el proyecto final por aula. |
| **alumnos.exe** | Crear alumnos, cambiarlos de aula, reiniciar contraseñas y ver saldo y avance. |
| **repasos.exe** | Habilitar los repasos con Rodolfo por aula o por alumno. |
| **ejercicios.exe** y **stats.log** | Qué ejercicios cuestan más y cómo viene cada aula. |
| **reinos.db** | Ver la base de Mi Reino de cada alumno y cada orden que guardó. |
| **arena.exe** · **raid.exe** | Duelos y raids del aula. |
| **test.exe** | Un alumno de prueba para revisar las PCs del taller sin usar datos reales. |
| **plan.txt** | El Libro de Planificación: 28 clases con ejemplo, guiado y desafío por tema, o el ritmo de 1 jefe por clase. |
| **plan_final.txt** | La guía del proyecto final, una página por clase: qué proyectar, qué hace el aula, qué tiene que quedar hecho y qué decir si se traban. |
| **areatrabajo.exe** | El proyecto final de cada alumno: en qué paso va, su mazo, sus dibujos y su código, y **volver atrás** una versión. También **Correr torneo** y **Exportar muestra**. |
| **pistolero.exe** | La Mesa del Pistolero. |

### El Pistolero (evento sorpresa)

El docente es el Pistolero y reta a toda el aula a la vez. En la pantalla del alumno nunca se dice que es el docente.

1. Antes de la clase: en la Mesa, elegir el aula y marcarla como **armada**. Hay un modo **ensayar** con alumnos de mentira.
2. **¡Desenfundar!**: a todo el aula le aparece el aviso a pantalla completa. Cuando entraron todos, **Empezar**.
3. El docente corrige los envíos a medida que llegan y usa ataques y frases en vivo. Termina cuando la vida de alguien llega a 0 o cuando el docente corta el tiempo.
4. El historial queda en raid.exe, con la opción de anular un duelo si hubo un problema.

### Torneo Mañana vs Tarde

En **areatrabajo.exe → Correr torneo**, todos los mazos publicados de la mañana pelean contra todos los de la tarde, ida y vuelta. Se ve el **marcador por equipo** (nunca una tabla individual), la pelea más reñida con su repetición y la carta destacada de cada alumno.

## La muestra final

La pantalla del stand es **`/muestra`**. No usa cuentas: lee un archivo, `muestra.json`, con los mazos publicados.

**Preparación**

1. El día anterior, en **areatrabajo.exe**: **Correr torneo** (opcional, agrega la carta destacada) y **Exportar muestra**.
2. En la PC del stand, una de dos:
   - **Simple**: abrir `/muestra` con internet, tocar **⇪** y cargar `muestra.json`. Queda guardado en ese navegador; mientras no se recargue la página, todo anda sin internet.
   - **Más segura**: correr el sitio en la misma PC (`pnpm build` una vez con internet y `pnpm start` el día de la muestra), con `muestra.json` dentro de `public/`.
3. **Ensayo**: cortar el wifi y jugar los cuatro modos durante 15 minutos.

**Durante la muestra**

- **Inicio**: ▶ PRESENTACIÓN, ⚔ BATALLA y el marcador MAÑANA vs TARDE de la muestra.
- **Presentación**: los mazos de a uno, con sus cartas en abanico, "Así lo programé" y "Mi mazo en números" (calculado con SQL).
- **Batalla**: **Automática** (peleas al azar, una tras otra), **Vos vs CPU** (el visitante elige equipo y mazo) y **Mañana vs Tarde** (dos personas en la misma PC, con una pantalla de traspaso para que el otro equipo no mire).
- **Modo atracción**: si nadie toca nada por un minuto, se alternan sola la presentación y la batalla automática.
- Íconos de arriba a la derecha: ⌂ inicio · ♪ sonido · ⛶ pantalla completa (Esc para salir) · ⇪ cargar otra muestra.

## Los jefes

| Acto | Jefes | Contenido |
|---|---|---|
| **I · Python** | 01 Creeper Formulario · 02 Guardián de la Puerta · 03 Golem Infinito · 04 Mercader del Abismo · 05 Maestro Craftero · 06 El Archivista | Variables, condicionales, bucles, listas de diccionarios, funciones |
| **II · SQLite** | 07 Constructor del Vacío · 08 Oráculo Oscuro · 09 Contador de Almas · 10 El Falsificador | `CREATE`, `INSERT`, `SELECT`, `WHERE`, `GROUP BY`, `UPDATE`, `DELETE` |
| **III · Integración** | 11 El Nexo · 12 La Hydra · 13 Dragón Rojo | Python + `sqlite3` |
| **IV · Final** | El Arquitecto | Sistema completo |

Cada jefe tiene ejercicios Junior, Trainee y Senior.

## Para desarrollar

### Stack

- **Framework**: Next.js 14 (App Router) · React 18 · TypeScript
- **Estilos**: Tailwind CSS + tokens propios en `app/globals.css` (3 temas)
- **Editor**: CodeMirror 6, cargado bajo demanda
- **Motores**: Pyodide (Python) y sql.js (SQLite), en el navegador
- **Datos**: Supabase (cuentas, aulas, progreso), con un modo local sin base de datos
- **Tests**: Vitest · **Paquetes**: pnpm

### Empezar

Requisitos: **Node.js 18+** y **pnpm**.

```bash
pnpm install
```

```bash
cp .env.example .env.local
```

```bash
pnpm dev
```

La app queda en <http://localhost:3000>. Con `NEXT_PUBLIC_LOCAL_MODE=true` en `.env.local` arranca sin base de datos: el progreso vive en el navegador.

### Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` · `pnpm start` | Compilar y servir la versión de producción |
| `pnpm test` | Tests (reglas del juego, ejercicios, proyecto final) |
| `pnpm sim:balance` | Simula miles de partidas de cartas y muestra el balance |
| `pnpm exec tsc --noEmit` | Chequeo de tipos |
| `pnpm lint` | Revisión con ESLint |

### Estructura

```
app/                     Rutas: landing, login, dashboard, batallas, patios, biblioteca,
                         reino, area-trabajo, muestra, finale, admin, demo y dev (pruebas)
components/
  game/                  Combate, mapa, Rodolfo, Mercader, arena, raids, patios
  game/area/             AreaTrabajo: mesa, carta, editor de píxeles, volteo, arena de cartas
  game/muestra/          La pantalla del stand
  game/architect/        El cierre con El Arquitecto
  admin/  landing/  ui/  Panel docente, landing y piezas de PyCraft OS
lib/game/                Lógica del juego (jefes, ejercicios, planificación, tienda, arena…)
lib/game/cartas/         Proyecto final: reglas, guía, paleta, sondas, torneo, muestra
lib/game/executor/       Ejecutores de Python y SQL
supabase/migrations/     Cambios de la base, numerados (se aplican en orden)
tests/                   Tests de Vitest
```

### Páginas de prueba

Solo en desarrollo, sin cuenta: `/dev/area-trabajo` (el proyecto final con datos del navegador) y `/dev/admin-os` (el panel docente con alumnos de ejemplo). También `/demo` (todos los jefes) y `/dev/sonidos` (los sonidos).

## Diseño

La interfaz es **PyCraft OS**, un escritorio retro de 1 bit: ventanas con barra rayada, sombras duras, esquinas rectas y sprites dibujados por píxeles. Los colores salen de tokens y se adaptan a los tres temas (negro, blanco y rojo). Lo secundario va escondido en íconos y botones: la pantalla muestra solo lo necesario.

- [`PRODUCT.md`](PRODUCT.md): usuarios, propósito y principios del producto.
- [`DESIGN.md`](DESIGN.md): sistema de diseño (paletas, tipografías, componentes, movimiento).

Tipografías: **JetBrains Mono** y **Jersey 25**.

## Privacidad

La plataforma **no recopila datos personales sensibles ni información identificatoria de menores**. Se utiliza únicamente un alias y, para la entrega del proyecto final, el correo electrónico del tutor responsable. En la muestra solo aparece el alias, nunca el nombre completo. El detalle está en `/privacidad` y `/cookies`. No se usan cookies de publicidad, analítica ni de terceros.

## Contribuir

Este repositorio se publica para consulta. Si encontrás un error o tenés una idea, abrí un *issue*. Las contribuciones de código requieren autorización previa del autor, de acuerdo con la licencia.

## Licencia y derechos de autor

© 2026 Siro Torres. **Todos los derechos reservados.**

El código fuente, los diseños, los personajes (jefes, Rodolfo, El Arquitecto), los sprites, los textos y la identidad visual de PyCraft BossRush son obra original de su autor. Se publican para su consulta y no pueden copiarse, modificarse, redistribuirse ni utilizarse con fines comerciales o educativos sin autorización previa y por escrito. Consulte el archivo [`LICENSE`](LICENSE).

### Componentes de terceros

Este proyecto utiliza software y recursos de terceros, que conservan sus propias licencias: [Next.js](https://nextjs.org), [React](https://react.dev), [Tailwind CSS](https://tailwindcss.com), [CodeMirror](https://codemirror.net), [Pyodide](https://pyodide.org), [sql.js](https://sql.js.org) y [Supabase](https://supabase.com), además de las tipografías JetBrains Mono y Jersey 25, distribuidas bajo la licencia SIL Open Font License.

## Créditos y aviso

Desarrollado por **[Siro Torres](https://github.com/Siro01)**.

Proyecto educativo sin fines comerciales, independiente y sin vinculación con Mojang AB ni Microsoft. Minecraft es una marca registrada de sus respectivos titulares.
