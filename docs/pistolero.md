# El Pistolero — cómo funciona

El Pistolero es un **evento sorpresa en vivo**: el docente es el Pistolero y reta a **toda el aula** a la vez. Cada alumno recibe un ejercicio, el sistema sugiere si está bien, el docente decide, y cada acierto le baja vida al Pistolero. Si el aula gana, hay botín. Si gana él, nadie pierde nada.

> **Nunca se revela en la pantalla del alumno que el Pistolero es el docente.** Ni los textos ni la interfaz lo dicen: es parte de la sorpresa.
>
> Vocabulario: no se usa la palabra «apostar» y no se usa el emoji de diamante: el ícono es `components/ui/DiamondIcon.tsx`.

Índice: [Cómo se juega](#cómo-se-juega-guía-para-el-docente) · [La Mesa](#la-mesa-del-pistolero) · [Lo que ve el alumno](#lo-que-ve-el-alumno) · [Reglas y números](#reglas-y-números) · [Ataques](#ataques) · [Ítems](#ítems-del-mercader) · [Ejercicios](#ejercicios) · [Personaje, voz y letra](#el-personaje-su-voz-y-su-letra) · [Para desarrolladores](#para-desarrolladores)

---

## Cómo se juega (guía para el docente)

### Antes de la clase

1. Entrá a **Admin → «Mesa del Pistolero →»** (`/admin/pistolero`).
2. Elegí el aula y tildá **«armada»**. Desde ese momento, los alumnos de esa aula «escuchan» el aviso sorpresa. Si el aula no está armada, nadie abre ninguna conexión extra.
3. Fijate el botón de sonido de la Mesa: **arranca en «× sin sonido»**. Si proyectás con el audio de tu PC, dejalo así para no delatarte. Se cambia con el botón o con la tecla **M**.

> Para practicar sin alumnos: **«ensayar»** (`/admin/pistolero?ensayo=1`, o `/demo/pistolero/mesa`). Son 6 alumnos de mentira que entran y mandan respuestas solos, con distintos jefes vencidos. No toca la base de datos.

### Durante la clase

1. Apretá **¡DESENFUNDAR!** A todo el aula, esté donde esté, le aparece el aviso a pantalla completa.
2. Los alumnos van entrando. Arriba ves «esperando · N alumnos entraron».
3. Cuando estén todos, apretá **EMPEZAR**. La vida del Pistolero se calcula con los que entraron (2 por alumno). Los que lleguen tarde también pueden entrar: cada uno le suma 2 de vida.
4. Corregí los envíos a medida que llegan (ver [La Mesa](#la-mesa-del-pistolero)). Usá los ataques y las frases en vivo para darle show.
5. El duelo termina solo cuando la vida de alguien llega a 0, o cuando apretás **SE ACABÓ EL TIEMPO** (gana el Pistolero). **cancelar** lo corta sin repartir nada.

### Después

- En **Admin → pestaña Raids** está el historial: quién estuvo, cuántos aciertos hizo cada uno, el resultado y el botín.
- **«Anular»** devuelve todo lo que movió ese duelo (por si hubo un corte de luz o algo injusto). Los stickers ya entregados se quedan.

---

## La Mesa del Pistolero

Está pensada para **decidir rápido aunque lleguen varios envíos juntos**.

| Zona | Qué hay |
|---|---|
| **Barra de arriba** (fija al bajar) | Aula · botón de sonido · «armada» · vidas del Pistolero y del equipo · ¡DESENFUNDAR! / EMPEZAR / SE ACABÓ EL TIEMPO / cancelar |
| **Centro: POR CORREGIR** | Los envíos en orden de llegada. Cada uno muestra el código y la salida. Si **coincide** con la esperada, tiene borde verde. Si **no coincide**, borde rojo, la salida esperada al lado y las **líneas distintas resaltadas**. Botones ✔ / ✘ en la misma línea del nombre |
| **«✔ aprobar los N que coinciden»** | Aparece con 2 o más envíos correctos y los aprueba todos de una (pide confirmación) |
| **Costado** | El Pistolero chico (lo que ven los alumnos), los **ataques** con su blanco, la **frase en vivo** (lo que escribís les aparece a todos) y el **aula**: una línea por alumno con su estado, ✔/✘ y un menú para **cambiarle el ejercicio** o **dejarle uno en cola** |

**Atajos de teclado:** `A` acierto · `R` falla · `↑` `↓` moverse por la cola · `M` sonido.

**La sugerencia ✔/✘ es solo eso.** La compara el servidor (salida del alumno contra la esperada). La decisión siempre es tuya.

**Cambiar un ejercicio:** si el alumno tiene uno abierto sin enviar, se lo cambia al instante. Si está esperando tu corrección (o todavía no entró), el nuevo queda «en cola» para después. En el menú, los ejercicios de temas que el alumno **no vio** aparecen marcados con «⚠ no vio el tema»; se pueden elegir igual.

---

## Lo que ve el alumno

### El cartel de SE BUSCA (antes del duelo)

Clavado arriba a la derecha del póster del mapa (solo con cuenta del taller) hay un **cartel de SE BUSCA** del Pistolero, con su retrato, la recompensa (30 diamantes) y, al tocarlo, el cartel grande con alias, delitos (errores típicos de Python), señas y «visto por última vez».

- Si el aula está **armada**, el cartel se balancea y lleva el sello rojo **«¡VISTO!»**: anticipa que puede aparecer.
- Si hay un duelo en curso: «¡AHORA MISMO, RETANDO A TU AULA!».
- Si el alumno ya lo venció: sello «DERROTADO ×N».

### El aviso sorpresa

Al apretar ¡DESENFUNDAR!, a cada alumno le aparece una pantalla completa: espuelas, el Pistolero que desenfunda y dispara, «¡SE BUSCA!» y sus frases de reto. Termina con **¡AL DUELO!**.

- Si está en medio de una batalla, la Arena, un repaso, el reino o una raid, puede elegir **«voy en 1 minuto»**: queda una cuenta regresiva en una esquina y al llegar a 0 lo lleva al duelo.
- Si cierra el aviso, queda una pastilla abajo a la derecha: «EL PISTOLERO ESTÁ EN EL PUEBLO · ir al duelo».

### El duelo (`/pistolero`)

- Entra solo (no tiene que apretar nada más).
- **Izquierda:** el Pistolero, su vida y la del equipo.
- **Derecha:** su ejercicio, con el editor y el botón **disparar**.
  - Si el código da error, se lo muestra y **no lo manda**: primero lo tiene que arreglar.
  - Si corre bien, lo manda y queda en «DISPARO ENVIADO, el Pistolero está mirando tu código…».
- Cuando corregís: **¡LE DISTE!** o **ERRASTE EL TIRO** a pantalla completa, con una frase del Pistolero. Con ✔ recibe el siguiente ejercicio; con ✘ vuelve a intentar el mismo.
- Los ataques le llegan en vivo (editor congelado, consigna tapada, ejercicio cambiado).
- Ítems: línea `>>> print(nombre)` debajo del editor.
- **Final:** si ganan, el Pistolero se despide (va a volver con un reto nuevo) y aparece el botín. Si gana él: «No perdiste nada: era un evento sorpresa».

---

## Reglas y números

| | |
|---|---|
| Vida del Pistolero | 2 por alumno que entró (mínimo 4). Cada ✔ le saca 1 |
| Vida del equipo | 100, compartida por toda el aula. Cada ✘ le saca 4 |
| Gana el aula | Vida del Pistolero en 0 |
| Gana el Pistolero | Vida del equipo en 0, o «SE ACABÓ EL TIEMPO» |
| Botín | **30 diamantes + 20 XP** a cada alumno con **al menos un ✔**, más el **sticker «SE BUSCA»** |
| Si pierden | Nada. Es un evento sorpresa |
| Tope diario | El botín del Pistolero **no** entra en el tope diario (es un evento del docente) |
| Aviso en batalla | 60 s de gracia («voy en 1 minuto») |

**El sticker «SE BUSCA»** es numerado: en el inventario se ve como «SE BUSCA Nº 3» (las veces que le ganaron con al menos un acierto). Reacciona al tocarlo, a los 12 toques le aparece un sello de DERROTADO y a los 25 suelta una frase secreta. Llega solo al cargar el juego, aunque el alumno haya cerrado la pestaña antes del final.

---

## Ataques

Se lanzan desde la Mesa. Los que van a **un alumno** usan el «blanco» elegido (o uno al azar).

| Ataque | Qué pasa | Usos por duelo |
|---|---|---|
| **Desenfundada rápida** | Congela el editor de un alumno 8 s | sin límite |
| **Ráfaga del tambor** | −12 a la vida del equipo | 3 |
| **Polvareda** | Tapa la consigna de todos 8 s | 3 |
| **Ruleta del tambor** | Cambia el ejercicio de un alumno por otro de su nivel | sin límite |
| **Recargar** | El Pistolero se cura el 10 % de su vida máxima | 2 |
| **Gesto de respeto** | Sin efecto: para festejar un buen acierto | sin límite |

Cada ataque tiene su animación (fogonazo, agujeros de bala, polvo que cruza la pantalla, el tambor gigante que gira) y una frase. Los disparos le pegan al editor o al cartel, nunca a una persona.

---

## Ítems del Mercader

Se compran en el Mercader (solapa Ítems) y se usan en el duelo con `print(nombre)`. Fuera del duelo no se gastan.

| Ítem | `print(...)` | Efecto en el duelo | Precio | Nivel |
|---|---|---|---|---|
| Bandera del Equipo | `bandera` | +20 a la vida del equipo | 30 | 3 |
| Chaleco de Cuero | `chaleco` | La próxima Desenfundada contra vos rebota | 25 | 3 |
| Espuelas de Plata | `espuelas` | Tu próximo acierto le saca el doble | 30 | 4 |
| Bengala | `bengala` | 30 s: todos los del duelo ven una pista de su ejercicio | 35 | 5 |

En la Mesa aparece un aviso de quién usó qué.

---

## Ejercicios

Son prehechos y están en `lib/game/raid/pistolero-ejercicios.ts`: hoy hay **15** (6 junior, 5 trainee, 4 senior), de Python y de SQL, con temática del Oeste (carteles de SE BUSCA, el saloon, el sheriff).

- **Solo los ve el servidor:** la salida esperada, la solución y la pista nunca llegan al navegador del alumno.
- **Sorteo:** cada ejercicio declara qué jefe enseña su tema (`needs`). A cada alumno se le sortea uno **de su nivel, de un tema que ya venció** y que todavía no le tocó. Si no queda ninguno de su nivel, baja de nivel; si ya hizo todos, repite. Así nadie recibe SQL si solo vio Python.
- **Agregar uno:** sumarlo a `PISTOLERO_EXERCISES` con un `id` nuevo, su `needs` (el id del jefe que enseña el tema), `tier`, `type`, consigna, código inicial, `hint` (lo que muestra la Bengala), `expected` y `solution`. En SQL, cada fila de la salida es `col1|col2`. Después correr:

  ```bash
  python scripts/check-pistolero.py
  ```

  Ese script ejecuta cada `solution` (Python con `exec`, SQL con `sqlite3`) y avisa si alguna no da exactamente su `expected`.

---

## El personaje, su voz y su letra

- **El Bandido sin Nombre:** pañuelo rojo, ojos de brasa, cartuchera cruzada, sombrero con un agujero de bala y revólver de cachas de marfil. Es ASCII hecho con código, con el doble de resolución que los jefes secretos (120×144) y **4 tintas**: hueso, brasa, metal y polvo. Tiene 9 animaciones: en guardia, desenfundar, disparo, girar el revólver, girar el tambor, recargar, recibir un golpe, tocarse el sombrero y retirarse al atardecer.
- **Cómo habla** (`PistoleroSay`):
  - lo normal lo escribe una **planta rodadora** que rueda delante del texto;
  - las frases en **MAYÚSCULAS son gritos**: caen de golpe, con un sacudón;
  - el **punto final es un disparo**: fogonazo pixel y agujero de bala.
- **Sonidos del Oeste** sintetizados (sin archivos): ramitas secas, estampido, rebote de bala, golpe seco, espuelas y el martillo del revólver. Respetan el silencio del juego, y en la Mesa arrancan apagados.
- **Su letra:** una fuente pixel propia de cartel de «SE BUSCA», con barras gruesas y palos finos, para títulos (`WesternText`).
- **Sus frases** viven en `PISTOLERO_LINES` y en cada ataque (`ATTACKS[].lines`), en `lib/game/raid/pistolero.ts`. Habla como un pistolero viejo: seco, burlón y con respeto por quien le gana. Cuando alguien falla, hace chistes de errores típicos de Python (los dos puntos del `if`, la sangría, `Print` con mayúscula, comillas sin cerrar).

---

## Para desarrolladores

### Rutas

| Ruta | Para qué |
|---|---|
| `/admin/pistolero` | La Mesa (solo docente). `?ensayo=1` = alumnos de mentira |
| `/pistolero` | El duelo del alumno |
| `/demo/pistolero` | Vitrina: poses, ataques y frases |
| `/demo/pistolero/mesa` | Ensayo de la Mesa (sirve en modo local) |
| `/demo/pistolero/alumno` | Vista previa del alumno en cada momento, el aviso sorpresa y el cartel SE BUSCA |

### Archivos principales

| Archivo | Qué hace |
|---|---|
| `lib/game/raid/pistolero.ts` | Números, ataques, ítems del duelo y frases |
| `lib/game/raid/pistolero-ejercicios.ts` | Ejercicios (solo servidor) y el sorteo `pickExercise` |
| `lib/game/raid/pistolero-art.ts` | El arte del personaje y sus poses |
| `lib/game/raid/western-font.ts`, `components/game/raid/WesternText.tsx` | La letra de cartel |
| `lib/game/raid/western-sfx.ts` | Los sonidos del Oeste |
| `lib/game/raid/live.ts` | Avisos en tiempo real (`RaidEvent`) y llamadas a la API |
| `lib/game/raid/watch-state.ts` | Lo último que sabe el vigía (lo usa el cartel del mapa) |
| `app/api/raid/route.ts`, `lib/game/raid/server.ts` | La API del Pistolero |
| `components/game/raid/PistoleroStage.tsx` | El personaje animado y los efectos de los ataques |
| `components/game/raid/PistoleroSay.tsx` | La voz (planta rodadora, gritos, disparos) |
| `components/game/raid/PistoleroWatcher.tsx` | El vigía en el layout raíz |
| `components/game/raid/SummonOverlay.tsx` | El aviso sorpresa |
| `components/game/raid/StudentPistolero.tsx` | El duelo del alumno |
| `components/game/raid/WantedPoster.tsx` | El cartel SE BUSCA del mapa |
| `components/game/raid/mesa/MesaPistolero.tsx`, `mesa/backend.ts` | La Mesa y su ensayo |

### Base de datos (migración `014_raids.sql`)

- `aulas.pistolero_armed`: el aula está armada.
- `raids`: un duelo (`kind = 'pistolero'`). Guarda las vidas y, en `attacks` (JSON), los usos de cada ataque y las marcas de ítems (`bengala_until`, `espuelas:<alumno>`). Solo puede haber un Pistolero vivo por aula.
- `raid_members`: quién entró y cuántos aciertos lleva.
- `raid_tasks`: cada ejercicio dado (`en_cola` → `asignado` → `enviado` → `correcto` / `incorrecto`, o `cambiado`), con el código, la salida y la sugerencia `auto_ok`.
- `raid_ledger`: el botín (motivo `'pistolero'`).
- **Funciones** (solo las llama el servidor): `raid_join`, `raid_start`, `raid_judge` (corrige y mueve la vida en una sola transacción), `raid_apply` y `raid_settle` (cierra y reparte el botín una sola vez). `015_raids_secretos.sql` reemplaza `raid_settle` sin cambiar la parte del Pistolero.
- **Ningún navegador escribe en estas tablas:** todo pasa por `/api/raid` con la service role.

### API `/api/raid`

- `GET`:
  - alumno → `{ aulaId, me, armed, raid, joined, task, lastVerdict, hint, bengalaUntil }`;
  - `GET ?aula=<id>` (docente) → la Mesa: `raid`, `tasks`, `roster` (con jefes vencidos) y `catalog`.
- `POST` del docente: `arm` · `summon` · `start` · `judge {taskId, ok}` · `assign {raidId, userId, exerciseId}` · `attack {raidId, attackId, targetId?}` · `end` · `cancel`.
- `POST` del alumno: `join` · `submit {taskId, code, output}` · `item {itemId}`.

### Tiempo real

Supabase Realtime (Broadcast) en canales privados (`raid_can_join`):

- `raid-aula-<aula>`: el aviso sorpresa (`summon`). El vigía solo lo abre si el aula está armada.
- `raid-<raid>`: el duelo (ataques, frases, correcciones, «escribiendo…», ítems).

**La base es la fuente de verdad:** los avisos solo dicen «algo cambió». Si se pierde uno, la Mesa relee cada 4 s y el alumno cada 5 s.

### Peso y rendimiento

- **Sin aula armada:** el vigía hace una consulta cada 90 s y no abre ninguna conexión en tiempo real.
- **Descarga diferida:** el arte del aviso sorpresa se descarga recién cuando llega el aviso.
- **Animación del personaje:** sus cuadros se calculan una vez por pose y se comparten entre pantallas, y se dibuja agrupando por tinta (pocas pasadas de pincel).
- **Accesibilidad:** las animaciones respetan `prefers-reduced-motion`.

### Probar

- **Sin base de datos:** `/demo/pistolero`, `/demo/pistolero/mesa` y `/demo/pistolero/alumno`. El servidor local (`PySQLBossRush-local`, puerto 3010) alcanza.
- **En vivo:** el docente en `/admin/pistolero` y el alumno TEST en otra ventana (incógnito u otro navegador).
- **Ojo:** no levantar dos `next dev` en la misma carpeta, porque comparten `.next` y se pisan.
