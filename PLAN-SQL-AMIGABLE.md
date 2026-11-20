# Plan: SQL amigable para el alumno (noviembre 2026)

Desde el Nexo hasta la muestra, Python habla con SQL con **dos máquinas y nada más**. Ningún chico ve `connect`, `cursor`, `fetchall`, `?` ni `commit`.

| Máquina | Qué hace | Dónde |
|---|---|---|
| `sql("...")` | Una base vacía para practicar. Devuelve una lista de diccionarios. `cargar_ejemplo("mobs")` / `("cofre")` la llena. | Patio (precargada), batallas (escrita arriba, "no se toca"), planificación |
| `mi_reino("...")` | Lee el mazo del alumno (Mi Reino), solo lectura. Devuelve lo mismo. | Patio y AreaTrabajo (precargada) |

Las dos viven en `MAQUINA_SQL` (`lib/game/executor/pyodide-runner.ts`).

## Fase 1 · Acto III (hecho)

- [x] `sql()` y `cargar_ejemplo()` precargadas en el Patio (modo Python).
- [x] Nexo, Hydra y Dragón: 3 ataques Junior cada uno con la máquina.
- [x] Acto III solo en Junior (`tierForBoss` en `lib/game/tiers.ts`).
- [x] Planificación, clases 21 a 26 y el plan intensivo.
- [x] Apuntes (`lessons.ts`) y diálogos de los jefes 11 a 13.

## Fase 2 · Proyecto de cartas (hecho)

- [x] `mi_reino()` precargada en el Patio y en AreaTrabajo.
- [x] Paso 7 (`carta`) y paso 8 (`revisar`) de la guía con `mi_reino()`.
- [x] Plan final: "Tus cartas desde Python" y Proyecto 2 con `mi_reino()`.

## Fase 3 · El examen del Arquitecto (hecho)

Cinco ataques Junior, uno por cada parte del taller. Vida 500, 100 de daño cada uno. Solo Junior.

| # | Ataque | Repasa |
|---|---|---|
| 1 | El eco del Creeper | Acto I: variables, `if`, `for` |
| 2 | El eco del Oráculo | Acto II: SELECT, WHERE, ORDER BY con `sql()` |
| 3 | La fábrica de cartas | Nexo e Hydra: `agregar()` con f-string, `len()` |
| 4 | La carta rota | Dragón: UPDATE y DELETE |
| 5 | Tu carta contra la mía | Proyecto: `carta(fila)` con barra de poder |

- [x] Los 5 ataques y el bloqueo de Trainee/Senior.
- [x] Planificación, clases 27 (el sistema completo) y 28 (repaso por actos, un guiado por ataque).
- [x] Apuntes y diálogos del Arquitecto.

## Fase 4 · Limpieza (cuando haya tiempo, antes de la muestra)

No frenan ninguna clase, pero todavía muestran el estilo viejo:

- [ ] Escuelita de repasos, jefes 11 a 14 (`lib/game/repasos.ts`).
- [ ] Grimorios de la Biblioteca del Acto III (`lib/game/biblioteca.ts`).
- [ ] Plantillas de La Arena de los jefes 11 a 14 (`lib/game/arena/generators.ts`).
- [ ] Ejercicios Trainee/Senior de los jefes 11 a 14: hoy no se pelean, pero los duelos PvP usan el banco Trainee.
- [ ] Manual de marca y README, si mencionan `sqlite3` para los chicos.

## Más adelante (después de la muestra)

- El ataque 5 del Arquitecto contra **el mazo del propio alumno** con `mi_reino()` (la salida esperada cambia para cada uno).
- `elegir()` en las peleas de la muestra (necesita Python sin internet en el stand).
