# Planner V1 — M11-C Information & Action Hierarchy

**Estado:** propuesta para aprobación humana.<br>
**Regla:** lo normal desaparece; lo relevante se entiende; lo excepcional llama; lo accionable se reconoce; lo avanzado espera.

## 1. Escala de información

- `L1` esencial para decidir/actuar ahora.
- `L2` contexto útil para la decisión.
- `L3` metadata secundaria, visible solo si hay espacio o relevancia.
- `L4` detalle bajo demanda.
- `L5` técnico/redundante; no se muestra.

## 2. Task

| Dato | Nivel | Lista | Detail / form | Regla |
|---|---|---|---|---|
| título | L1 | línea 1 | heading/campo 1 | nunca truncar sin nombre accesible completo |
| complete/verify affordance | L1 | leading | acción principal | cambia según capability/status |
| due date/time | L2 | línea 2 | grupo Planificación | overdue asciende visualmente |
| assignee | L2 | línea 2 si existe | grupo Personas | avatar solo si representa persona |
| awaiting verification | L2 excepcional | icono+texto | banner/action | no badge técnico genérico |
| overdue | L2 excepcional | icono+texto warning | metadata principal | no color solo |
| high priority | L2 condicional | icono/label breve | selección | normal no se muestra |
| tipo/categoría | L3 | solo si diferencia | metadata | plain icon+text |
| notes/details | L4 | no | disclosure | texto completo en detail |
| recurrence/dependency | L3/L4 | si afecta próxima ejecución | grupo Advanced | no pill normal |
| normal status `pending` | L5 | no | implícito | eliminar badge |
| normal priority | L5 | no | selección default | eliminar badge |
| household activo | L5 | no | no repetir | pantalla ya scoped |
| ids/version/timestamps | L5 UI, L4 support | no | solo diagnóstico seguro | nunca raw al usuario |

## 3. Event

| Dato | Nivel | Agenda/Calendar | Detail / form | Regla |
|---|---|---|---|---|
| start time / all-day | L1 | ancla leading | heading temporal | Event no usa checkbox |
| título | L1 | línea 1 | heading/campo 1 | junto a hora, no debajo de status |
| duración/end | L2 | línea 2 | grupo Cuándo | omitir si no aporta |
| selected date | L1 contexto | header/grid | grupo Cuándo | Today y selección no dependen de color |
| ubicación | L2/L3 | línea 2 si existe | grupo Dónde | plain metadata |
| recurrence | L3, L2 si próxima acción cambia | icono+texto | grupo Repetición | nunca chip pasivo |
| cancelled | L2 excepcional | label + atenuación | banner + reactivate | visible, no confundir con pasado |
| description | L4 | no | disclosure/detail | no en agenda |
| normal status `scheduled` | L5 | no | implícito | eliminar badge |
| household | L5 | no | no repetir | scope global |
| occurrence/master ids | L5 | no | solo lógica | wording humano al actuar recurrencia |

## 4. Goal

| Dato | Nivel | Lista | Detail / form | Regla |
|---|---|---|---|---|
| dirección/título | L1 | línea 1 | heading/campo 1 | expresa resultado, no tarea |
| progreso | L1 | barra + valor | módulo principal | no depender solo de color |
| siguiente milestone | L2 | línea de dirección | sección hitos | si no existe, no reservar espacio |
| target date | L2 si próxima; L3 si lejana | metadata | grupo objetivo | overdue goal excepcional |
| scope personal/household | L2 solo si cambia interpretación | icono+texto condicional | selección | no chip universal |
| completed | L2 excepcional | resumen/check | estado final | no compite con progreso activo |
| closed | L2 excepcional | label atenuado | banner + reopen | diferenciar de achieved |
| category | L3 | icono+texto solo en búsqueda | metadata/form | no cápsula |
| description/motivation | L4 | no | detail | bajo demanda |
| tasks counts | L3 | si explica progreso | sección relacionada | no duplicar barra |
| active normal status | L5 | no | implícito | eliminar chip |
| household activo/timestamps/ids | L5 | no | no | técnicos/redundantes |

## 5. Milestone

| Dato | Nivel | Presentación |
|---|---|---|
| título | L1 | row dentro de Goal Detail |
| complete affordance | L1 | leading action 48 dp |
| due date | L2 | segunda línea; warning si overdue |
| completed | L2 condicional | check + estilo, no badge |
| order/weight | L3 | implícito por orden; valor solo si útil |
| notes | L4 | detail/edit |
| ids/timestamps | L5 | no UI |

## 6. Calendar item y Summary item

| Objeto | L1 | L2 | L3 | L4/L5 |
|---|---|---|---|---|
| Month cell | fecha, selected/today | hasta 2 indicadores de densidad | `+n` | títulos completos al seleccionar |
| Week day | weekday/date, selected | count/nearest item | today | detalles en agenda |
| Day agenda Event | hora+título | duración/lugar | recurrence | descripción/detail |
| Day agenda Task | título+complete | due/assignee | high priority | notes/detail |
| Home Task | título+complete | due/assignee | exceptional status | resto en Planner |
| Home Event | hora+título | location | recurrence | descripción/detail |
| Home Goal | título+progreso | next milestone | target | metadata/detail |
| Home section error | mensaje humano+retry | qué sección | stale indicator | error code/raw L5 |

## 7. Forms

### Quick Create

| Objeto | L1 campos visibles | L2 visibles | Advanced (L3/L4) | Defaults silenciosos |
|---|---|---|---|---|
| Task | título | fecha, responsable si frecuente | priority, verification, detalles y opciones existentes | normal priority/status, active household |
| Event | título, fecha/hora | duración/all-day | lugar, recurrence, description y opciones existentes | scheduled, active household |
| Goal | dirección/título, scope si no inferible | target/progreso inicial si frecuente | categoría, descripción y demás campos existentes | active, active household |

No se agregan campos. Quick Create ofrece “Más opciones” y el CTA. Full Form abre expanded; Edit Form conserva contexto, dirty state y acciones terminales fuera del CTA principal.

## 8. Clasificación de acciones y ubicación

### Taxonomía

| Tipo | Regla de ubicación |
|---|---|
| `PRIMARY` | una por superficie; visible y textual |
| `FREQUENT` | inline si segura y reversible |
| `CONTEXTUAL` | overflow o affordance local |
| `SECONDARY` | toolbar/detail, menor peso |
| `ADVANCED` | disclosure/detail |
| `DESTRUCTIVE` | overflow/detail + confirmación; nunca junto a primary |
| `ADMINISTRATIVE` | detail/admin disclosure, capability-gated |

### Task

| Acción | Clase | Lista | Detail | Confirmación / notas |
|---|---|---|---|---|
| complete | PRIMARY/FREQUENT | leading visible | primary | optimistic + undo/rollback; no confirm |
| verify | PRIMARY/FREQUENT condicional | leading visible | primary | busy + result announcement |
| edit | CONTEXTUAL | overflow | toolbar | no confirmation |
| assign | CONTEXTUAL/ADMINISTRATIVE | no | metadata action | capability-gated |
| cancel | SECONDARY/DESTRUCTIVE | overflow | overflow/final section | confirm sheet; reason existente si aplica |
| trash | DESTRUCTIVE | overflow | final section | confirm; no inline red button |
| restore | PRIMARY | Trash row | primary | resultado anunciado |
| reopen | SECONDARY | overflow | secondary | confirmar si cambia verificación |

### Event

| Acción | Clase | Agenda | Detail | Regla |
|---|---|---|---|---|
| edit | PRIMARY/CONTEXTUAL | row tap→detail; overflow opcional | primary/toolbar | no tres botones inline |
| cancel | DESTRUCTIVE | overflow | overflow/final | recurrencia pregunta ocurrencia/serie usando contrato existente |
| reactivate | PRIMARY condicional | row/detail | primary | solo cancelled |
| trash | DESTRUCTIVE | no | final/overflow | confirmación inequívoca |
| occurrence action | ADVANCED/CONTEXTUAL | no | confirmation sheet | nunca swipe-only |

### Goal

| Acción | Clase | Lista | Detail | Regla |
|---|---|---|---|---|
| update progress | PRIMARY/FREQUENT | optional compact action | primary | resultado directo |
| milestone complete/add/edit | FREQUENT/CONTEXTUAL | no | sección milestones | target 48 dp, announce progress |
| complete/achieve | PRIMARY condicional | no | primary cuando criterio aplicable | no competir con close |
| close | SECONDARY/DESTRUCTIVE semantics | no | overflow/final | explicar diferencia con achieved |
| reopen | SECONDARY | no | detail | solo completed/closed |
| delete/trash | DESTRUCTIVE | no | overflow/final | confirmación |

## 9. Modelo de filtros

- Tabs raíz Task/Calendar/Goal son navegación, no filtros.
- Un filtro primario visible por colección: `Estado` o vista relevante.
- Filtros secundarios viven en `Filtrar` sheet con count activo: scope, categoría, persona y fechas existentes.
- Chips visibles máximo recomendado: 4 opciones cortas en una fila que refluye; nunca dos carousels horizontales apilados.
- “Todas” se representa como default del control, no como otra capa visual cuando ningún filtro está activo.
- Count solo se muestra si ayuda a elegir; no duplicar metrics y count badges.

## 10. Gesture and reversibility hierarchy — M11-C2 refinement

Gestures are redundant accelerators below visible controls in the action hierarchy; they never introduce a new capability or action.

| Entity / gesture | Final class | Visible equivalent | Commit rule |
|---|---|---|---|
| Task partial swipe right | FREQUENT accelerator | leading complete/verify control | reveal only; release on the action or tap it |
| Task partial swipe left | CONTEXTUAL accelerator | visible overflow | reveals `Más`; never direct destructive action |
| Task full swipe | PRIMARY accelerator, narrowly eligible | visible complete control | complete only when inverse/rollback+Undo exist; 70% threshold; commit on release; retreat cancels |
| Event/Goal horizontal swipe | N/A | row/Detail/overflow | no commit recognizer; do not borrow Task completion semantics |
| Milestone completion | FREQUENT visible | milestone control | never hidden behind swipe |
| Long press | CONTEXTUAL mirror | visible overflow | exact same state/capability menu, max four actions, destructive last |
| Undo | REVERSAL | snackbar/action surface | one tap, six-second base adjusted for accessibility timeout; only with reliable inverse |

Verification, cancel, trash, restore, reopen and recurring-occurrence actions can never full-swipe commit. Every gesture outcome is also exposed by tap and, where applicable, TalkBack/VoiceOver custom action. The detailed evidence is in [`PLANNER_V1_M11_FINAL_DECISION_REGISTRY.md`](PLANNER_V1_M11_FINAL_DECISION_REGISTRY.md) D11–D20.

## 11. Resultado M11-C

Esta jerarquía es el contrato visual propuesto. No altera rutas, capabilities, estados ni campos M1–M10; decide qué aparece y dónde.

**M11-C2 FINAL DECISION AUDIT STATUS: READY_FOR_HUMAN_APPROVAL**
