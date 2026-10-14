# Plan — Raids: El Pistolero y los jefes secretos en equipo

> Vocabulario: en la plataforma se dice **retarse por diamantes** (nada que suene a juego de azar). **Ningún emoji de diamante**: se usa `components/ui/DiamondIcon.tsx`.
> Rama de trabajo: `develop`. Orden acordado: **primero el Pistolero, después la raid contra jefes secretos.**
>
> **Este archivo es el plan y su historia.** Cómo funciona hoy el Pistolero (para el docente y para quien toque el código) está en **[docs/pistolero.md](docs/pistolero.md)**. Donde este plan y la guía no coinciden, vale la guía.

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

**Funcionamiento actual: [docs/pistolero.md](docs/pistolero.md).** En resumen:

1. Antes de clase, el docente **arma** el aula desde la Mesa (`/admin/pistolero`). La Mesa arranca **sin sonido** (botón o tecla M) para no delatarse si proyecta con su audio.
2. **¡DESENFUNDAR!**: a todo el aula le aparece el aviso sorpresa («voy en 1 minuto» si está en otra cosa). El alumno va a **`/pistolero`**.
3. **EMPEZAR**: vida del Pistolero = 2 por alumno que entró (los que llegan tarde suman 2). Vida del equipo: 100.
4. El alumno resuelve y **dispara**; el servidor marca la sugerencia ✔/✘; el docente decide (A/R, o «aprobar los que coinciden»). ✔ = −1 al Pistolero y el siguiente ejercicio. ✘ = −4 al equipo y el mismo otra vez.
5. Termina por vida o con **SE ACABÓ EL TIEMPO**. Botín: 30 diamantes + 20 XP + sticker «SE BUSCA» numerado a quien acertó al menos una vez. Perder no cuesta nada.

**Cambios respecto del plan original** (por pedido del docente o por la primera prueba en vivo):

- **Personaje:** quedó una sola versión, **El Bandido sin Nombre**, con más detalle que el resto de los jefes (120×144, 4 tintas). Las otras dos variantes se borraron.
- **Ejercicios:** cada uno declara qué jefe enseña su tema (`needs`) y solo se sortean temas que el alumno ya venció (antes le podía tocar SQL a quien solo vio Python). No se usa el paquete `server-only`: el archivo corta si lo importa el navegador y nadie del cliente lo importa.
- **Mesa:** rediseñada para decidir rápido. La cola va al centro, la salida esperada aparece sola cuando no coincide (con las líneas distintas resaltadas), está el botón «aprobar los que coinciden» y el resto va a un costado chico.
- **Voz y letra:** una planta rodadora escribe, los gritos (MAYÚSCULAS) caen de golpe y el punto final es un disparo. Tiene sonidos del Oeste sintetizados y una fuente pixel propia de cartel.
- **Cartel SE BUSCA en el mapa:** anticipa al Pistolero. Lleva el sello «¡VISTO!» si el aula está armada.

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

## 4. Ítems nuevos del Mercader

Se usan con `print(nombre)` en la línea `>>>` del duelo o de la raid. Fuera de esos modos no se gastan.

| Ítem | `print(...)` | Pistolero | Raid de secretos | Precio | Nivel |
|---|---|---|---|---|---|
| Bandera del Equipo | `bandera` | +20 a la vida del equipo | +20 a cada integrante en pie | 30 | 3 |
| Chaleco de Cuero | `chaleco` | La próxima Desenfundada rebota | — | 25 | 3 |
| Espuelas de Plata | `espuelas` | Próximo acierto doble | Próximo acierto doble | 30 | 4 |
| Bengala | `bengala` | 30 s: todos ven una pista | — | 35 | 5 |
| Botiquín de Campaña | `botiquin` | — | Levanta a un caído con 50 de vida | 35 | 4 |

**Cosméticos** (solapa **Títulos**, se ven en las raids): títulos Cazarrecompensas (40), Forajido (50) y Sheriff del Aula (80); estandartes Brasa (40), Jade (40) y Dorado (60), que son el color del equipo de quien arma la raid.

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
| `raid-aula-<aula>` | Todo el aula, **solo si `pistolero_armed`** (y el lobby de raids) | «¡Desenfundar!» (aviso sorpresa) y «algo cambió» en el lobby de raids |
| `raid-<id>` | Integrantes + docente | Golpes, ataques, frases, «escribiendo…» (con throttle de 3 s) y correcciones |

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

- `GET` → alumno: `{ aulaId, me, armed, raid, joined, task, lastVerdict, hint, bengalaUntil }`. `GET ?aula=<id>` → docente: la Mesa (`raid`, `tasks` con código/salida/sugerencia, `roster`, `catalog`).
- `POST` docente: `arm {aulaId, armed}` · `summon {aulaId}` (crea el duelo en lobby) · `start {raidId}` (la vida sale de los que entraron: 2 por alumno; los que llegan tarde suman 2) · `judge {taskId, ok}` (✔ → siguiente ejercicio, ✘ → el mismo otra vez y −4 al equipo) · `assign {raidId, userId, exerciseId}` (cambia el abierto o deja en cola) · `attack {raidId, attackId, targetId?}` · `end {raidId}` (se acabó el tiempo: gana él) · `cancel {raidId}`.
- `POST` alumno: `join` · `submit {taskId, code, output}` (el servidor marca la sugerencia `auto_ok`; la decisión es del docente) · `item {itemId}`.
- Botín: `raid_settle` da 30 diamantes + 20 XP a cada alumno con al menos un ✔ (`raid_ledger`). Lo suman `syncArenaStats` (cliente) y `balances` (servidor); no consume el tope diario de la arena.
