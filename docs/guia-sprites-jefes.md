# Guía de sprites de jefes — PySQLBossRush

Hola! Esta guía tiene todo lo necesario para dibujar y entregar los jefes del juego.
El juego es un taller de programación (Python + SQL) para chicos de 10 a 13 años. Cada clase
termina con una batalla contra un jefe cuyo tema es lo que se aprendió ese día.

## Especificaciones técnicas (iguales para todos)

| Ítem | Valor |
|---|---|
| Tamaño del lienzo | **32 × 32 px**, siempre cuadrado |
| Formato | **GIF animado** (idle en bucle), 2 a 4 frames alcanzan |
| Fondo | **Transparente** (sin fondo de color) |
| Paleta | Libre, pero limitada (8 a 16 colores) para que se lea bien chico |
| Márgenes | El jefe centrado, con 1 o 2 px de aire transparente en los bordes |
| Escalado | El juego lo agranda 2×, 3× y 4× sin suavizar. **No exportar agrandado**: entregar en 32×32 reales |
| Orientación | De frente, mirando al jugador |

Importante: el juego muestra los sprites siempre en cuadrado. Si el lienzo no es 32×32 se deforma.

### Frames (animación idle)
Movimiento sutil y en bucle: respirar, parpadear, flotar, brillar. Duración sugerida: 150 a 250 ms por frame.

### Variante derrotado (opcional)
Mismo tamaño, mismo personaje caído, apagado o roto. Se nombra `{archivo}-defeated.gif`.
Si no existe, el juego usa el sprite normal en gris.

## Jefes a dibujar

Cada jefe aparece en la clase indicada: el docente lo habilita cuando el grupo llega a ese tema.
Los colores son una guía de identidad del jefe (se usan en interfaz, barras y bordes); no hay que respetarlos a rajatabla.

| Clase | Jefe | Archivo a entregar | Tema | Color guía | Idea del personaje |
|---|---|---|---|---|---|
| 2 | Guardián de la Puerta | `guardian-puerta.gif` | Condicionales `if / elif / else` | `#4ADE80` verde claro | Guardián de un portal: solo deja pasar si la condición es verdadera |
| 3 | Golem Infinito | `golem-infinito.gif` | Bucles `for` y `while` | `#86EFAC` verde pastel | Golem de piedra que repite movimientos sin parar |
| 4 | Mercader del Abismo | `mercader-abismo.gif` | Listas de diccionarios | `#16A34A` verde | Mercader misterioso con inventario de objetos |
| 5 | Maestro Craftero | `maestro-craftero.gif` | Funciones con parámetros | `#15803D` verde oscuro | Artesano/herrero que fabrica cosas según lo que se le pida |
| 6 | El Archivista | `archivista.gif` | De listas a tablas | `#166534` verde muy oscuro | Bibliotecario/escriba rodeado de fichas y estantes |
| 7 | Constructor del Vacío | `constructor-vacio.gif` | `CREATE TABLE`, `INSERT INTO` | `#38BDF8` celeste | Constructor que levanta estructuras desde la nada |
| 9 | Contador de Almas | `contador-almas.gif` | `COUNT`, `SUM`, `AVG`, `GROUP BY` | `#0EA5E9` celeste intenso | Espectro con un ábaco que cuenta y agrupa almas |
| 10 | El Falsificador | `falsificador.gif` | `UPDATE`, `DELETE` | `#0284C7` azul | Tramposo con pluma y sello que cambia y borra registros |
| 11 | El Nexo | `el-nexo.gif` | Python + `sqlite3` | `#A78BFA` violeta | Criatura-puente que une dos mundos (uno verde, otro celeste) |

Ya hechos por otras personas del equipo (no dibujar): Oráculo Oscuro, La Hydra, Dragón Rojo.
El jefe final (El Arquitecto) no lleva sprite.

Nota de estilo: el jefe 1 (Creeper Formulario) hoy es de 16×16. Si el estilo nuevo cambia mucho, conviene rehacerlo en 32×32 para que el conjunto sea coherente.

## Entrega

- Un archivo por jefe, con el nombre exacto de la tabla (minúsculas, con guiones, sin espacios ni tildes).
- Si además querés hacer un ícono estático (aparece en la landing), entregalo como `{id}.png`, también de 32×32.
- Probá que el GIF haga bucle infinito y que el fondo sea realmente transparente.
