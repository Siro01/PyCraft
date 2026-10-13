# Plan — Raids: El Pistolero y los jefes secretos en equipo

> Vocabulario: en la plataforma se dice **retarse por diamantes** (nada que suene a juego de azar). **Ningún emoji de diamante**: se usa `components/ui/DiamondIcon.tsx`.
> Rama de trabajo: `develop`. Orden acordado: **primero el Pistolero, después la raid contra jefes secretos.**

---

## 0. Requisito previo: cerrar la Arena

La raid reusa todo lo de la Arena: canales privados, Presence, API del servidor, ledger y la policy de Realtime. Antes de empezar:

1. Correr `supabase/migrations/013_arena.sql` en Supabase.
2. Probar un duelo real con dos cuentas (docente + alumno TEST).
3. Commitear la Arena.

Si algo de la Arena falla, falla también la raid. Por eso va primero.

---

## 1. Qué es, en una frase

- **El Pistolero:** un evento sorpresa en vivo. El docente lo dispara y **toda el aula** pelea contra él. Cada alumno recibe un ejercicio prehecho, el sistema sugiere si está bien, el docente decide y cada acierto le baja vida al Pistolero.
- **Raid de jefes secretos:** equipos de **2 a 4** contra un jefe secreto. Cada uno resuelve su propio ejercicio al mismo tiempo, la vida del jefe es compartida y el premio es mayor.

---

## 2. El Pistolero

### 2.1 Flujo

1. **Antes de la clase**, desde Admin → Aulas, el docente **arma al Pistolero** en un aula (`aulas.pistolero_armed = true`). Mientras no esté armado, nadie abre ninguna conexión extra.
2. Con el aula armada, el mapa, el dashboard y las batallas se suscriben a un canal liviano `aula-<id>` (solo Broadcast).
3. El docente abre la **Mesa del Pistolero** (`/admin/pistolero`) y aprieta **«¡Desenfundar!»**. A todo el aula, esté donde esté, le aparece una pantalla completa: el Pistolero entra caminando, con polvo y un cartel de SE BUSCA, y dice una frase de reto.
4. El alumno aprieta **«¡Al duelo!»** y va a `/raid/<id>`. Se sortea un ejercicio de su nivel, salvo que el docente ya le haya asignado uno a mano.
5. Combate: el alumno escribe, ejecuta y envía. El servidor compara la salida con la esperada y le marca **sugerencia ✔ o ✘** al docente. El docente **confirma o corrige**. Con ✔, el Pistolero pierde vida y el alumno recibe el siguiente ejercicio.
6. Final:
   - **Ganan** si la vida del Pistolero llega a 0. El Pistolero se retira hacia el atardecer diciendo que **volverá con un nuevo reto** y que **disfruten el botín**.
   - **Gana el Pistolero** si la vida del equipo llega a 0 o si el docente aprieta **«Se acabó el tiempo»**.
   - **Si pierden, no pierden nada.** Es un evento sorpresa.

### 2.2 Ejercicios prehechos (v1: archivo)

`lib/game/raid/pistolero-ejercicios.ts` lleva `import 'server-only'`, así que **nunca llega al navegador** y las respuestas no se pueden espiar.

```ts
{ id: 'pist-py-01', lang: 'python', tier: 'junior', title: 'Las balas del tambor',
  prompt: '...', starter: '...', expected: '...' }
{ id: 'pist-sql-03', lang: 'sql', tier: 'senior', prompt: '...', seedSQL: '...', expected: '...' }
```

- **Sorteo:** al azar dentro del nivel del alumno (`tier` del aula y del alumno), sin repetir dentro del mismo evento.
- **Asignación a mano:** en la Mesa, para cada alumno, un desplegable con los ejercicios para **fijarle el próximo** o **cambiarle el actual**. Sirve para tener en cuenta lo que puede hacer cada uno.
- **Más adelante:** un editor en el panel docente (tabla `pistolero_exercises`). El archivo queda como respaldo.

### 2.3 La Mesa del Pistolero (vista docente)

| Zona | Qué tiene |
|---|---|
| Arriba | Vida del Pistolero, vida del equipo, reloj y botones **¡Desenfundar!** y **Se acabó el tiempo** |
| Grilla de alumnos | Una tarjeta por alumno: estado (esperando, escribiendo o envió), ejercicio, código, salida, sugerencia ✔/✘ y botones **✔ / ✘ / cambiar ejercicio** |
| Cola de corrección | Los envíos pendientes, del más viejo al más nuevo. Atajos de teclado: `A` aprueba, `R` rechaza, `↓` pasa al siguiente |
| Acciones en vivo | Los ataques del Pistolero (§2.5) y un cuadro de **frase en vivo**: lo que escribís les aparece en un globo de diálogo |

La sugerencia automática hace que con 30 alumnos el docente solo tenga que mirar los casos dudosos. **El docente siempre tiene la última palabra.**

### 2.4 El personaje: arte ASCII con mucho detalle

- Arte **100 % por código** en `lib/game/raid/pistolero-art.ts`, en la misma línea que el Arquitecto (`lib/game/architect/art.ts` y `render.ts`): cuadros ASCII sin imports, que se pueden renderizar con `node --experimental-strip-types` para revisarlos.
- El personaje: sombrero de ala ancha, poncho, bigote, **revólver antiguo de tambor** (cañón largo, tambor que gira), espuelas y una estrella de sheriff oxidada. Polvo y un rodador (tumbleweed) de fondo.
- **Animaciones:** respirar, mano cerca de la funda, desenfundar, girar el revólver en el dedo, girar el tambor, recargar, recibir un golpe (glitch y retroceso), levantar el sombrero y la retirada.
- Vitrina en `/demo/pistolero` (solo admin) para elegir entre **2 o 3 variantes** antes de seguir, como con el Guardián y el Mercader.
- **Tono:** caricatura western. Los disparos le pegan al **editor o al cartel**, nunca a un personaje (es para chicos de 10 a 13).

### 2.5 Ataques del Pistolero (botones del docente, cada uno con su animación)

| Ataque | Animación | Efecto |
|---|---|---|
| **Desenfundada rápida** | Desenfunda y dispara; agujero de bala en el editor | Congela el editor de **un** alumno 8 s (lo elige el docente o la suerte) |
| **Ráfaga del tambor** | El tambor gira y salen 6 tiros | Le saca vida al equipo |
| **Polvareda** | Una nube de polvo cruza la pantalla | Tapa las consignas de todos durante 8 s |
| **Ruleta del tambor** | Hace girar el tambor | Cambia el ejercicio de un alumno al azar |
| **Recargar** | Abre el tambor y mete balas | El Pistolero se cura un 10 % (como mucho 2 veces por evento) |
| **Gesto de respeto** | Se toca el sombrero | Sin efecto: festeja un buen acierto |

Los ítems de defensa (§4) cortan algunos de estos ataques.

### 2.6 Números del Pistolero (propuesta)

- **Vida del Pistolero** = alumnos conectados × 2 aciertos. Con 30 alumnos hacen falta unos 60 ✔.
- **Vida del equipo:** compartida por el aula. Baja con cada ✘ y con los ataques. Que la vida sea compartida hace más simple el evento con 30 alumnos.
- **Botín si ganan:** diamantes y XP para cada alumno con **al menos 1 ✔**, más el sticker **«Cartel de SE BUSCA»** animado (uno por evento ganado, numerado). Ver §8.

---

## 3. Raid contra jefes secretos (fase 2)

### 3.1 Reglas acordadas

- **Equipo de 2 a 4.** Si un alumno queda sin compañero, **el docente puede entrar** a su equipo.
- **Requisito:** todos los integrantes tienen que haber derrotado al menos al **jefe 4** (`mercader-abismo`).
- **Cada uno resuelve su propio ejercicio al mismo tiempo**, de su nivel, con `buildSecretSeries` (los ejercicios salen de los jefes que derrotó cada uno).
- **Vida del jefe compartida,** escalada por la cantidad de integrantes (`hpMax × integrantes`).
- **Cada alumno tiene su propia vida.** Si llega a 0, queda **caído** y lo pueden **revivir**: un compañero resuelve un ejercicio de rescate o usa el ítem *Botiquín de Campaña*. El equipo pierde cuando caen todos.
- **Frases rápidas** («¡voy!», «¡ayuda!», «¡listo!», «¡bien ahí!»), sin chat libre.
- **Si ganan:** cuenta como derrota del jefe para **cada uno**. Además se gana un **sticker especial de raid**, con animación e interacción (uno por jefe secreto), y **40 diamantes** cada uno, **solo la primera vez** que lo derrotan en raid. Las revanchas dan **solo XP** para todos.
- **Si pierden:** no se pierde nada (solo se castiga el abandono).
- **Abandonar:** −5 diamantes, **con advertencia antes** («Si te vas, perdés 5 diamantes y dejás a tu equipo solo»). Si se cortó la conexión, hay **60 s de gracia** antes de contarlo como abandono.
- **Tope:** como mucho 40 diamantes por día desde raids.

### 3.2 Flujo

1. En la guarida aparece un botón nuevo, **«Armar raid»**, que abre el lobby `/raid/nueva?jefe=<id>`. Los compañeros posibles se ven por Presence; se invita y aceptan, como en la Arena.
2. El líder aprieta **Comenzar** cuando hay entre 2 y 4 integrantes.
3. Se pelea con la distribución de la arena secreta (`SecretArena`), más una franja con el equipo: vida de cada uno, «escribiendo…» y los aciertos.
4. Al final: pantalla de botín y entrega del sticker animado.

---

## 4. Ítems nuevos del Mercader (sección «Para el equipo»)

Se usan como siempre, con `print(nombre)` en INVENTARIO.PY. Cada uno tiene su sprite 16×16 en `ItemSprites.tsx`, con roles de color del tema.

| Ítem | `print(...)` | Tipo | Efecto | Precio (propuesta) |
|---|---|---|---|---|
| Bandera del Equipo | `bandera` | consumible | Cura 30 de vida a **todo** el equipo | 30 |
| Botiquín de Campaña | `botiquin` | consumible | Revive al instante a un compañero caído | 35 |
| Chaleco de Cuero | `chaleco` | consumible | Para el próximo ataque del Pistolero o del jefe que te toque | 25 |
| Bengala | `bengala` | consumible | Muestra una pista de su ejercicio a **cada** integrante | 40 |
| Espuelas | `espuelas` | consumible | Tu próximo acierto pega el doble | 30 |
| Título en el lobby | — | cosmético | «Cazarrecompensas», «Forajido», «Sheriff del aula», etc. Se ve al lado del nombre en los lobbies | 50–80 |
| Bandera de color | — | cosmético | El color del estandarte del equipo en la raid | 40 |

Los cosméticos se pueden comprar con los diamantes que entran por las raids y no cambian el equilibrio del juego.

Cada ítem nuevo lleva una entrada en `SHOP_CATALOG`, su `case` en `applyItem` (o en un `applyRaidItem` nuevo, porque los efectos son de equipo y pasan por el servidor) y su sprite. Se prueban en `/demo/items`.

---

## 5. Base de datos — migración `014_raids.sql` (manual)

```sql
ALTER TABLE aulas ADD COLUMN pistolero_armed BOOLEAN NOT NULL DEFAULT FALSE;

raids (
  id UUID PK, aula_id UUID, kind TEXT,            -- 'pistolero' | 'secreto'
  boss_id TEXT NULL,                               -- jefe secreto (NULL en el Pistolero)
  leader_id UUID, status TEXT,                     -- lobby | active | won | lost | cancelled
  boss_hp SMALLINT, boss_hp_max SMALLINT,
  team_hp SMALLINT NULL, team_hp_max SMALLINT NULL, -- solo Pistolero (vida compartida)
  seed INT, created_at, started_at, finished_at
)
raid_members (raid_id, user_id, role TEXT,         -- 'alumno' | 'docente'
  hp SMALLINT, state TEXT,                         -- alive | down | left
  solved SMALLINT, left_at, PK (raid_id, user_id))
raid_tasks (id, raid_id, user_id, exercise_id, idx,
  status TEXT,                                     -- asignado | enviado | correcto | incorrecto
  code TEXT, output TEXT, auto_ok BOOLEAN,
  judged_by UUID NULL, assigned_by UUID NULL, created_at, judged_at)
raid_ledger  (id, user_id, raid_id, delta, reason, created_at)  -- botín, abandonos
raid_firsts  (user_id, boss_id, raid_id, PK (user_id, boss_id)) -- premio de 40 solo una vez
```

- **RLS:** cada alumno ve sus raids, sus tareas y su ledger; el docente ve todo. **Ningún cliente hace INSERT ni UPDATE**: todo pasa por `/api/raid` con el cliente de servicio.
- **Funciones atómicas** (como las de la Arena): `raid_join`, `raid_judge` (marca la tarea y baja la vida en una sola transacción), `raid_revive`, `raid_leave` (−5), `raid_settle` (botín, primeros premios y tope diario) y `raid_can_join` para la policy de Realtime.
- `diamondsAvailable` suma `raid_ledger`, igual que `arena_ledger`.
- **Volumen:** unos 1 a 2 KB por tarea. Un evento de 30 alumnos con 3 ejercicios cada uno da unas 90 tareas, menos de 200 KB. Los `code`/`output` de raids terminadas se pueden vaciar después de 30 días.

---

## 6. Tiempo real

| Canal | Quién se suscribe | Para qué |
|---|---|---|
| `aula-<id>` | Todo el aula, **solo si `pistolero_armed`** | «¡Desenfundar!» (aviso sorpresa) |
| `raid-<id>` | Integrantes + docente | Golpes, ataques, frases, «escribiendo…» (con throttle de 3 s) y correcciones |
| `raid-lobby-<aula>` | Quien está en el lobby de raids | Presence e invitaciones |

Todos los canales son **privados**, con la policy `raid_can_join`. **La base es la fuente de verdad**: si se pierde un mensaje, el cliente vuelve a leer la raid.

**Límites del plan gratis:** 200 conexiones simultáneas. Un aula entera en el evento son unas 31 (30 alumnos + docente). Los mensajes de un evento completo andan por los 300 a 800, contra un límite de 2 millones por mes.

---

## 7. Peso de la página y rendimiento

- **`/raid` y `/admin/pistolero` son rutas propias.** Next las separa en su propio paquete: ni el mapa ni las batallas cargan su código.
- **Aviso sorpresa:** la pantalla completa del Pistolero se carga con `next/dynamic` **solo cuando llega el aviso**. Mientras el aula no está armada no hay ni socket ni código extra.
- **Arte ASCII:** son strings generados por código y se dibujan en un `<pre>` o canvas. Sin imágenes ni GIF, unos pocos KB.
- **Reuso:** `SecretArena`, `BattleConsole`, CodeMirror, el executor y Pyodide (que ya está en caché).
- **PCs del taller:** las animaciones van con `requestAnimationFrame` y respetan `prefers-reduced-motion`. Se mide con el HUD del alumno TEST.

---

## 8. Decisiones tomadas (2026-10-13)

1. **Botín del Pistolero:** 30 diamantes + 20 XP + sticker «SE BUSCA» numerado para cada alumno con al menos 1 ✔. **No entra en el tope diario** (es un evento del docente).
2. **Vida contra el Pistolero:** una barra **compartida** por toda el aula.
3. **El docente en una raid de secretos:** solo apoya (cura y revive), no resuelve ejercicios y **no escala la vida del jefe**.
4. **Aviso en medio de una batalla:** botón «Voy en 1 minuto» con cuenta regresiva de 60 s; al terminar, va al duelo.
5. **Perder una raid de secretos:** no se pierde nada (solo se castiga el abandono).
6. **Requisito de las otras guaridas en raid:** cada integrante necesita el jefe 4; además **el líder** tiene que cumplir el requisito de esa guarida en solitario (8, 11 o 14 jefes).

---

## 9. Fases de implementación

| Fase | Qué | Se prueba con |
|---|---|---|
| **0** | Cerrar la Arena (migración 013 + prueba con dos cuentas) | Dos navegadores |
| **1** | Arte ASCII del Pistolero, 2 o 3 variantes, animaciones y ataques + `/demo/pistolero` | El navegador solo |
| **2** | Migración 014 + `/api/raid` + `pistolero-ejercicios.ts` + autocorrección | Llamadas de la API |
| **3** | Mesa del Pistolero (grilla, cola, asignar, ✔/✘, acciones y frases) | Docente + TEST |
| **4** | Vista del alumno + aviso sorpresa en todo el sitio + final y botín | Docente + TEST |
| **5** | Ítems nuevos y cosméticos en el Mercader + sprites | `/demo/items`, `/demo/tienda` |
| **6** | Raid contra secretos: lobby, combate compartido, revivir y stickers animados de raid | `/demo/raid` con bots + dos cuentas |
| **7** | Pestaña Raids en el admin: historial y anular una raid (revierte el ledger) | Panel docente |

---

## 10. Estado

| Fase | Estado | Archivos |
|---|---|---|
| 0 | Migración 013 corrida por el docente (2026-10-13). Falta probar un duelo real con dos cuentas | — |
| 1 | **Hecha.** Personaje elegido: **El Bandido sin Nombre** (v3). 120×144, un carácter por píxel, 4 tintas (hueso, brasa, metal, polvo), 9 poses, 6 ataques con efectos | `lib/game/raid/pistolero-art.ts`, `lib/game/raid/pistolero.ts`, `components/game/raid/PistoleroStage.tsx`, `/demo/pistolero` |
| 2 | **Hecha.** Migración 014 corrida por el docente. API y 15 ejercicios verificados | `supabase/migrations/014_raids.sql`, `app/api/raid/route.ts`, `lib/game/raid/server.ts`, `lib/game/raid/types.ts`, `lib/game/raid/pistolero-ejercicios.ts`, `scripts/check-pistolero.py` |
| 3 | **Hecha:** Mesa del Pistolero (`/admin/pistolero`, `?ensayo=1` = práctica con alumnos de mentira; también `/demo/pistolero/mesa`). Cola de corrección con atajos A/R/↑↓, grilla del aula con cambio de ejercicio o cola, ataques con blanco, frase en vivo, vidas | `components/game/raid/mesa/MesaPistolero.tsx`, `components/game/raid/mesa/backend.ts`, `lib/game/raid/live.ts`, `app/admin/pistolero/page.tsx` |
| 4 | **Hecha (falta probar en vivo):** vigía en el layout raíz (`PistoleroWatcher`: pregunta cada 90 s si el aula está armada y solo entonces abre el canal), aviso sorpresa a pantalla completa (`SummonOverlay`, se descarga recién cuando llega; «voy en 1 minuto» si está en batalla), pastilla «EL PISTOLERO ESTÁ EN EL PUEBLO», pantalla del duelo `/pistolero` (`StudentPistolero`: ejercicio, disparar, esperar corrección, congelado, polvareda, ruleta, ✔/✘ a pantalla completa, botín). Vista previa en `/demo/pistolero/alumno` | `components/game/raid/PistoleroWatcher.tsx`, `SummonOverlay.tsx`, `StudentPistolero.tsx`, `app/pistolero/page.tsx` |
| 5 | **Hecha (parcial):** sticker vivo «SE BUSCA» numerado (botín del Pistolero; llega solo con `syncArenaStats`, Nº = veces que le ganaste; a los 12 toques le aparece el sello de DERROTADO) + 4 ítems del Mercader para el duelo: Bandera (+20 al equipo), Chaleco (para la próxima Desenfundada), Espuelas (próximo acierto doble), Bengala (pista para todos 30 s). Se usan con `>>> print(nombre)` en el duelo; la Mesa avisa quién usó qué. **Quedan para la fase 6:** Botiquín (revivir) y los cosméticos (títulos, bandera de color), porque necesitan las raids de secretos y el lobby | `lib/game/chest-stickers.ts` (`RAID_STICKERS`), `components/game/stickers/chest-sprites.ts`, `lib/game/shop.ts`, `components/game/items/ItemSprites.tsx`, `app/api/raid/route.ts` (acción `item`) |
| 6 | **Hecha (015 corrida; falta probar en vivo):** raids contra jefes secretos. Lobby `/raid` (armar si tu guarida está abierta, sumarse a las del aula, docente como apoyo), pelea `/raid/<id>` (serie propia por alumno, vida del jefe compartida = vida × integrantes, vida propia, caer y ser rescatado por el próximo acierto de un compañero o con Botiquín, frases rápidas, apoyo del docente: 2 curas y 1 rescate). Ganar: 40 diamantes + 30 XP la primera vez por jefe (tope 40/día), revancha 15 XP (una por jefe por día), sticker del jefe y la guarida queda vencida. Abandonar o 60 s sin señales: −5. Ícono `raid.exe` en el escritorio desde el jefe 4. Botiquín + 3 títulos + 3 estandartes en el Mercader (solapa Títulos) | `supabase/migrations/015_raids_secretos.sql`, `app/api/raid/secreto/route.ts`, `lib/game/raid/secret-raid.ts`, `components/game/raid/secret/*`, `app/raid/*` |
| 7 | **Hecha:** pestaña Raids en el admin: historial (Pistolero y secretos) con equipo, aciertos, resultado, botín y abandonos; filtros por aula y tipo; «Anular» devuelve diamantes, XP y castigos (y la primera victoria se puede volver a ganar). Los stickers ya entregados se quedan | `app/admin/RaidsPanel.tsx`, `app/api/raid/admin/route.ts` |

### Notas de la fase 6

- **Solo en vivo:** necesita dos alumnos de verdad (el docente entra solo como apoyo). Con el alumno TEST y otro alumno alcanza.
- **Guarida y diamantes:** ganar en raid marca la guarida como vencida (`recordSecretWin(jefe, 0)`), sin los 25 diamantes del solitario: el premio de la raid son los 40.
- **Choque con el Pistolero:** si el docente dispara el Pistolero mientras hay una raid, quien deje la raid más de 60 s cuenta como abandono. Mejor no hacer las dos cosas a la vez.

### API `/api/raid`

- `GET` → alumno: `{ armed, raid, joined, task, lastVerdict }`. `GET ?aula=<id>` → docente: la Mesa (`raid`, `tasks` con código/salida/sugerencia, `roster`, `catalog`).
- `POST` docente: `arm {aulaId, armed}` · `summon {aulaId}` (crea el duelo en lobby) · `start {raidId}` (la vida sale de los que entraron: 2 por alumno; los que llegan tarde suman 2) · `judge {taskId, ok}` (✔ → siguiente ejercicio, ✘ → el mismo otra vez y −4 al equipo) · `assign {raidId, userId, exerciseId}` (cambia el abierto o deja en cola) · `attack {raidId, attackId, targetId?}` · `end {raidId}` (se acabó el tiempo: gana él) · `cancel {raidId}`.
- `POST` alumno: `join` · `submit {taskId, code, output}` (el servidor marca la sugerencia `auto_ok`; la decisión es del docente).
- Botín: `raid_settle` da 30 diamantes + 20 XP a cada alumno con al menos un ✔ (`raid_ledger`). Lo suman `syncArenaStats` (cliente) y `balances` (servidor); no consume el tope diario de la arena.
