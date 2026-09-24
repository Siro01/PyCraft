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

**Un taller de programación donde el SQL es el arma y el proyecto final es tu propio cofre.**

![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=nextdotjs)
![React](https://img.shields.io/badge/React-18-000000?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-000000?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3-000000?style=flat-square&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-opcional-000000?style=flat-square&logo=supabase)
![Uso](https://img.shields.io/badge/uso-educativo-DC143C?style=flat-square)

</div>

---

## ¿Qué es?

**PyCraft BossRush** es una plataforma web educativa para talleres de introducción a **Python** y **SQL** dirigidos a niñas y niños de 10 a 13 años. El alumno avanza derrotando **14 jefes inspirados en Minecraft**, y cada golpe es código real que se ejecuta en su navegador, sin instalar nada.

Al vencer al último jefe, **El Arquitecto**, el alumno construye su propio inventario SQLite (`CREATE`, `INSERT`, `SELECT`, `UPDATE`, `DELETE`), lo decora y lo descarga como un archivo `mi_inventario.sql` que es suyo.

> Pensado para el aula: PCs del taller, wifi inestable y un docente presente. El progreso vive en el navegador y ningún efecto visual ni error del juego puede borrarlo.

## Características

| | |
|---|---|
| **Código real** | Python con [Pyodide](https://pyodide.org) y SQLite con [sql.js](https://sql.js.org), ambos en el navegador. |
| **14 jefes** | Del primer `print()` a un sistema completo con Python + `sqlite3`. |
| **Tres dificultades** | Junior (ejercicios guiados), Trainee (con barra de vida) y Senior (próximamente). |
| **Rodolfo** | Un cerdito guía con pistas y apuntes paso a paso en una ventana propia. |
| **El cofre final** | Un escritorio retro (`PYCRAFT OS`) con misiones, autosave, errores que inundan la pantalla y descarga del proyecto. |
| **El Mercader** | Amuletos coleccionables con estética de cartas. |
| **Panel docente** | Aulas, jefes y dificultades por aula, alumnos y estadísticas. |
| **Alumno TEST** | Recorre el flujo completo con un código temporal y sin datos reales. |
| **3 temas** | Negro, rojo y blanco: se cambian tocando `BOSSRUSH` en el encabezado. |
| **Sonido retro** | Efectos 8-bit sintetizados con Web Audio, con botón para silenciar. |

## Los jefes

| Acto | Jefes | Contenido |
|---|---|---|
| **I · Python** | 01 Creeper Formulario · 02 Guardián de la Puerta · 03 Golem Infinito · 04 Mercader del Abismo · 05 Maestro Craftero · 06 El Archivista | Variables, condicionales, bucles, listas de diccionarios, funciones |
| **II · SQLite** | 07 Constructor del Vacío · 08 Oráculo Oscuro · 09 Contador de Almas · 10 El Falsificador | `CREATE`, `INSERT`, `SELECT`, `WHERE`, `GROUP BY`, `UPDATE`, `DELETE` |
| **III · Integración** | 11 El Nexo · 12 La Hydra · 13 Dragón Rojo · **FINAL** El Arquitecto | Python + `sqlite3`, proyecto completo |

## Stack

- **Framework**: Next.js 14 (App Router) · React 18 · TypeScript
- **Estilos**: Tailwind CSS + tokens propios en `app/globals.css` (3 temas por `data-theme`)
- **Editor**: CodeMirror 6, cargado bajo demanda
- **Motores**: Pyodide (Python) y sql.js (SQLite) en el navegador
- **Backend opcional**: Supabase (autenticación, aulas, progreso)
- **Gestor de paquetes**: pnpm

## Empezar

Requisitos: **Node.js 18+** y **pnpm**.

```bash
git clone https://github.com/Siro01/PyCraft.git
cd PyCraft
pnpm install
cp .env.example .env.local
pnpm dev
```

La app queda en <http://localhost:3000>. Con `NEXT_PUBLIC_LOCAL_MODE=true` (el valor por defecto de `.env.example`) funciona **sin Supabase**: el alumno entra con un nombre y el progreso se guarda en su navegador.

### Modo con cuentas (Supabase)

1. Creá un proyecto en [Supabase](https://supabase.com).
2. Ejecutá en orden los archivos de [`supabase/migrations`](supabase/migrations) (`001` a `007`) desde el editor SQL.
3. Completá `.env.local`:

   | Variable | Uso |
   |---|---|
   | `NEXT_PUBLIC_LOCAL_MODE` | `false` para usar Supabase |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública |
   | `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor: crear alumnos y reiniciar contraseñas |

4. Creá tu usuario docente y otorgale el rol de administrador:

   ```sql
   update profiles set role = 'admin' where username = 'tu_usuario';
   ```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` da acceso total a la base. No la subas al repositorio ni la uses en código del cliente.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Compilación de producción |
| `pnpm start` | Sirve la compilación |
| `pnpm lint` | Revisión con ESLint |
| `pnpm exec tsc --noEmit` | Chequeo de tipos |

## Estructura

```
app/                  Rutas (landing, login, dashboard, batallas, demo, admin, legales)
components/
  game/               Combate, jefes, Rodolfo, Mercader, lecciones
  game/architect/     El cofre final, El Arquitecto y el escritorio retro
  landing/            Landing y escritorio PYCRAFT OS
  layout/             Header y footer
  legal/  ui/         Páginas legales y piezas de interfaz (ventanas, sonidos)
lib/                  Lógica de juego, ejecutores, almacenamiento local, sonido
supabase/migrations/  Esquema de base de datos
docs/                 Guías (por ejemplo, cómo cargar los sprites de los jefes)
```

Rutas útiles: `/demo` (todos los jefes sin cuenta), `/demo/mercader` (el Mercader), `/dev/sonidos` (catálogo de sonidos).

## Diseño

La interfaz es un **escritorio retro de 1 bit**: ventanas con barra rayada, sombras duras, esquinas rectas, sprites dibujados por píxeles y cursor pixel. Todo color sale de tokens `hsl(var(--…))` y se adapta a los tres temas.

- [`PRODUCT.md`](PRODUCT.md): usuarios, propósito y principios del producto.
- [`DESIGN.md`](DESIGN.md): sistema de diseño (paletas, tipografías, componentes, movimiento).

Tipografías: **Jersey 25**, **VT323** y **Silkscreen**.

## Privacidad

La plataforma **no recopila datos personales sensibles ni información identificatoria de menores**. Se utiliza únicamente un alias y, para la entrega del proyecto final, el correo electrónico del tutor responsable. El detalle está en las páginas `/privacidad` y `/cookies`. No se emplean cookies de publicidad, analítica ni de terceros.

## Contribuir

Este repositorio se publica para consulta. Si encontrás un error o tenés una idea, abrí un *issue*. Las contribuciones de código requieren autorización previa del autor, de acuerdo con la licencia.

## Licencia y derechos de autor

© 2026 Siro Torres. **Todos los derechos reservados.**

El código fuente, los diseños, los personajes (jefes, Rodolfo, El Arquitecto), los sprites, los textos y la identidad visual de PyCraft BossRush son obra original de su autor. Se publican para su consulta y no pueden copiarse, modificarse, redistribuirse ni utilizarse con fines comerciales o educativos sin autorización previa y por escrito. Consulte el archivo [`LICENSE`](LICENSE).

### Componentes de terceros

Este proyecto utiliza software y recursos de terceros, que conservan sus propias licencias: [Next.js](https://nextjs.org), [React](https://react.dev), [Tailwind CSS](https://tailwindcss.com), [CodeMirror](https://codemirror.net), [Pyodide](https://pyodide.org), [sql.js](https://sql.js.org) y [Supabase](https://supabase.com), además de las tipografías Jersey 25, VT323 y Silkscreen, distribuidas bajo la licencia SIL Open Font License.

## Créditos y aviso

Desarrollado por **[Siro Torres](https://github.com/Siro01)**.

Proyecto educativo sin fines comerciales, independiente y sin vinculación con Mojang AB ni Microsoft. Minecraft es una marca registrada de sus respectivos titulares.
