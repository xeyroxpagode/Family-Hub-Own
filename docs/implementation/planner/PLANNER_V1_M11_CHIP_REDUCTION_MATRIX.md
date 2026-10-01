# Planner V1 — M11 Chip Reduction Matrix

**Política propuesta D5:** un chip debe ser interactivo o excepcional. La metadata normal no obtiene una cápsula por existir.

Decisiones válidas: `KEEP_INTERACTIVE`, `KEEP_EXCEPTIONAL`, `REPLACE_WITH_ICON_TEXT`, `REPLACE_WITH_PLAIN_METADATA`, `MOVE_TO_DETAIL`, `SHOW_CONDITIONALLY`, `REMOVE`, `MERGE`, `RESEARCH_REQUIRED`.

## Inventario total

| Chip | Pantalla | Contenido | Interactivo | Excepcional | Frecuencia | Decisión propuesta |
|---|---|---|---:|---:|---|---|
| tab Tareas/Calendario/Metas | Planner root | destino | sí | no | siempre | KEEP_INTERACTIVE; estilizar como tabs, no chips |
| task primary `Todas` | Tasks | filtro status | sí | no | siempre | MERGE en control Estado |
| task primary `Hoy` | Tasks | filtro fecha | sí | no | frecuente | KEEP_INTERACTIVE si no duplica metric |
| task primary `Pendientes` | Tasks | filtro status | sí | no | frecuente | MERGE en Estado |
| task primary `Atención` | Tasks | filtro excepcional | sí | sí | condicional | KEEP_INTERACTIVE; priorizar solo con count>0 |
| task count badge | Tasks filters | cantidad | no por separado | no | siempre | MERGE en label accesible; ocultar cero |
| task type `Todas` | Tasks | filtro tipo | sí | no | siempre | MOVE_TO_DETAIL (filter sheet) |
| task type/category pills | Tasks | tipo/categoría | sí | no | ocasional | MOVE_TO_DETAIL; icono+texto en sheet |
| task status pending | Task card/detail | estado normal | no | no | común | REMOVE |
| task status completed | Task card/detail | estado final | no | condicional | común en archive | SHOW_CONDITIONALLY como icono+texto/estilo row |
| task status cancelled | Task card/trash | estado terminal | no | sí | baja | KEEP_EXCEPTIONAL |
| awaiting verification | Task card/detail | estado accionable | no/acción adyacente | sí | media | REPLACE_WITH_ICON_TEXT junto a Verify |
| overdue | Task card | fecha vencida | no | sí | media | KEEP_EXCEPTIONAL como icono+texto, no pill obligatoria |
| normal priority | Task card/detail | metadata | no | no | alta | REMOVE |
| high priority | Task card/detail | prioridad | no | sí | baja | SHOW_CONDITIONALLY como icono+texto |
| task assignee circle | Task card | persona | no | no | media | REPLACE_WITH_ICON_TEXT/avatar solo si foto/iniciales reales |
| task household | Task card/detail | scope | no | no | siempre | REMOVE |
| metric card counts | Tasks | resumen | no | algunos | siempre | MERGE en una summary line; no son chips pero compiten igual |
| calendar Day/Week/Month | Calendar | vista exclusiva | sí | no | siempre | KEEP_INTERACTIVE como segmented control/tabs |
| Calendar Agenda | Calendar | vista/section | sí o heading | no | siempre | MERGE: agenda asociada a selección, no cuarto chip si móvil |
| selected day circle | Calendar | selección | sí | no | siempre | KEEP_INTERACTIVE; `selected` + today redundante al color |
| event type `Evento` | Agenda card | tipo obvio | no | no | común | REMOVE |
| event scheduled status | Event detail | normal | no | no | común | REMOVE |
| event cancelled | Agenda/detail | estado excepcional | no | sí | baja | KEEP_EXCEPTIONAL |
| recurrence pill | Event card/detail | metadata | no | no | media | REPLACE_WITH_ICON_TEXT |
| all-day pill | Event | tiempo | no | no | media | REPLACE_WITH_PLAIN_METADATA (“Todo el día”) |
| goal status filter Todas/Activas/Logradas/Cerradas | Goals | filtro exclusivo | sí | no | siempre | MERGE en control Estado; máximo una fila |
| goal scope Todas/Familiares/Personales | Goals | filtro exclusivo | sí | no | siempre | MOVE_TO_DETAIL en filter sheet |
| goal category icon pills | Goals | filtro categoría | sí | no | siempre | MOVE_TO_DETAIL; labels obligatorios |
| goal active status | Goal card/detail | normal | no | no | común | REMOVE |
| goal completed | Goal card/detail | final | no | sí | baja | SHOW_CONDITIONALLY como resumen/check |
| goal closed | Goal card/detail | terminal | no | sí | baja | KEEP_EXCEPTIONAL como icono+texto |
| goal category | Goal card/detail | metadata | no | no | común | REPLACE_WITH_ICON_TEXT en detail; MOVE_TO_DETAIL en list |
| goal household/personal scope | Goal card/detail | scope | no | condicional | común | SHOW_CONDITIONALLY como plain icon+text solo si diferencia |
| milestone completed | Goal detail | estado | acción/check | condicional | media | REPLACE_WITH_ICON_TEXT/check affordance |
| form priority choices | Task Form | selección | sí | no | al crear | KEEP_INTERACTIVE |
| form verification choices | Task Form | selección | sí | no | al crear | KEEP_INTERACTIVE; label claro |
| form assignee choices | Task Form | input entity | sí | no | al crear | KEEP_INTERACTIVE si avatar+label y reflow |
| form recurrence choices | Event Form | selección | sí | no | al crear | KEEP_INTERACTIVE |
| form goal scope choices | Goal Form | selección | sí | no | al crear | KEEP_INTERACTIVE |
| form goal category choices | Goal Form | selección | sí | no | al crear | KEEP_INTERACTIVE, pero dentro de advanced si secundaria |
| Home task status pill | Home Summary | estado normal/excepcional | no | variable | frecuente | REMOVE normal; SHOW_CONDITIONALLY exceptional |
| Home attention count | Home | alerta agregada | no/section tap | sí | condicional | KEEP_EXCEPTIONAL solo count accionable |
| role chip Coordinador | AppTopBar | household role | no | no | siempre | REPLACE_WITH_PLAIN_METADATA o MOVE_TO_DETAIL |
| partial/offline status capsule | global state | estado transversal | no | sí | baja | KEEP_EXCEPTIONAL como banner, no chip |

## Resultado cuantitativo propuesto

| Grupo | Actual inventariado | Keep interactivo | Keep excepcional/condicional | Reemplazar/mover/merge | Remove directo |
|---|---:|---:|---:|---:|---:|
| Navegación y filtros | 18 | 5 | 1 | 12 | 0 |
| Task metadata/status | 11 | 0 | 5 | 3 | 3 |
| Event metadata/status | 5 | 0 | 1 | 2 | 2 |
| Goal metadata/status | 7 | 0 | 3 | 3 | 1 |
| Forms | 6 | 6 | 0 | 0 | 0 |
| Home/shell/global | 4 | 0 | 2 | 1 | 1 |
| **Total** | **51** | **11** | **12** | **21** | **7** |

“Keep” no implica conservar el estilo actual: selected, touch target y reflow deben ajustarse. El objetivo visual normal por card/row es **0 chips**; una excepción puede elevarlo a 1. Los forms son la excepción legítima porque sus pills son controles de selección.

## D5 y D6

**D5 — pregunta exacta:** “¿Aprobás que Planner limite chips a controles interactivos y estados excepcionales, eliminando status normal, priority normal, household repetido y type/scope/category pasivos de cards?”

**D6 — pregunta exacta:** “¿Aprobás dejar visible un único control primario de filtro por colección y mover scope/categoría/persona/fechas a un filter sheet con count activo, sin dos filas horizontales de chips?”
