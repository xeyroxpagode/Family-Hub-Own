# Planner V1 — M11 Screen-by-Screen Proposal

**Naturaleza:** especificación visual; no cambia rutas ni behavior M1–M10.<br>
**Previews:** [`m11-proposals/index.html`](m11-proposals/index.html), [`planner-cards-proposal.svg`](m11-proposals/planner-cards-proposal.svg), [`calendar-month-proposal.svg`](m11-proposals/calendar-month-proposal.svg).

## 1. Shell y tabs

- AppTopBar conserva profile/household switcher, pero reduce padding vertical y presenta rol como metadata plain o lo mueve al switcher.
- Planner title comparte una sola banda de heading con Search gated/overflow. No card exclusiva para título.
- Tabs Tareas/Calendario/Metas: indicador selected claro, target 48 dp, sin container+shadow externo.
- Separación nav/contenido mediante 16–20 dp y divider/scroll edge, no múltiples surfaces.
- En scroll, el título puede colapsar; tabs pueden quedar sticky solo si no tapan contenido/focus. No alterar tab persistence de M6.
- Search sigue gated por M7; no se promociona ni se inventan resultados.

## 2. Quick Actions

Adoptar Alternativa B si D1 se aprueba: tres tiles compactas Tarea/Evento/Meta. Detalle completo en `PLANNER_V1_M11_QUICK_ACTIONS_VISUAL_PROPOSAL.md`.

## 3. Tasks

### Estructura de pantalla

1. Heading `Tareas` + overflow/trash si corresponde.
2. Una summary line condicional: solo Today/Attention/Review con valor no cero; no cuatro metric cards permanentes.
3. Control primario `Estado` o selector corto + botón `Filtrar (n)`.
4. Lista sectioned cuando haya motivo: `Requieren acción`, `Hoy`, `Próximas`; no section por una sola card sin valor.
5. Empty/error inline en el área de lista, conservando filtros activos.

### Task row

| Caso | Visible | Se silencia | Acción |
|---|---|---|---|
| normal | complete, título, due · assignee | status pending, normal priority, household | complete 1 tap; tap row→detail |
| overdue | lo normal + warning icon/text | high priority si también existe salvo que cambie decisión | complete; detail |
| high priority | icono/label breve solo sin overdue más urgente | normal priority | complete |
| sin fecha | título · assignee | “Sin fecha” salvo filtro/contexto lo requiere | complete |
| awaiting verification | verify leading, título, “Esperando verificación” | complete/status badge | verify 1 tap |
| completed | check/atenuación legible, completion context | chips | detail/overflow reopen |
| cancelled | status excepcional + atenuación | priority normal | detail/overflow restore si aplica |
| dense | dos líneas; exception tercera solo cuando existe | avatars decorativos, chips | targets intactos |
| offline | filas preservadas + banner; local busy seguro | skeleton | action según contract/offline queue |
| skeleton | 48 leading + dos text bars + 48 trailing | labels falsos | none |

Selected/pressed: background neutral transient y outline/focus; no border persistente por card. Overflow es 48 dp y no duplica la acción leading.

## 4. Task Detail

- Header: title + overflow; no status normal badge.
- Primary action sticky-safe o inmediatamente tras heading: Completar o Verificar según estado/capability.
- Context L2: due, assignee, overdue/high conditional.
- Sections sin cards anidadas: Detalles, planificación, actividad existente.
- Edit en toolbar/overflow. Assign contextual en metadata.
- Cancel/Trash/Reopen bajo overflow o sección final separada; confirm sheet explica resultado.
- Conflict: conservar lectura de datos actuales, banner y acciones `Recargar`/`Volver`; no mostrar versión raw.
- Forbidden/Not found: salida segura; Back siempre funciona.

## 5. Calendar

### Arquitectura común

- Header fecha: periodo actual, flechas previous/next y `Hoy` visibles.
- Selector Day/Week/Month como control exclusivo; `Agenda` es la lista asociada a la fecha seleccionada, no necesariamente una cuarta tab móvil.
- Tasks fechadas y Events se diferencian por affordance: checkbox/action para Task; columna de hora para Event.
- Selected y today usan forma+texto/outline, no solo color.

### Day

- Encabezado weekday + fecha + count.
- Agenda cronológica: all-day primero, luego hora.
- Eventos simultáneos: no columnas ilegibles en móvil; agrupar por hora con accent bars distintos solo cuando aporta.
- Empty: `Nada planificado` + Quick Action contextual; no gran card si la fecha sigue navegable.

### Week

- Compact phone: strip de 7 días, cada target 48 dp, day number + máximo 2 density dots/count.
- Debajo, agenda del día seleccionado. El overview semanal sigue visible.
- Expanded width futuro: grid temporal puede habilitarse, pero no forma parte vinculante V1.

### Month

- Grid 7×5/6 con min cell 44–48 dp; número de fecha nunca escala debajo de legibilidad.
- Cada cell: day number, today marker, selected state y hasta 2 dots. Con más densidad: `+n`; no títulos completos en teléfono.
- Días fuera de mes atenuados pero con contraste suficiente.
- Al seleccionar: agenda debajo con heading completo.
- Month debe reflow/recalcular height con font scale; si no puede, cambia a densidad mínima antes de recortar.

### Agenda/Event row

| Caso | Presentación |
|---|---|
| normal | hora · title / duración · location |
| all-day | columna “Todo el día” con ancho adaptativo |
| recurrence | icono + “Se repite…” en metadata, si relevante |
| cancelled | label exceptional, contenido atenuado, Reactivar en detail |
| Task dated | leading complete + title / due · assignee |
| dense | dos líneas; overflow; no Edit/Cancel/Trash inline |

**D7:** la propuesta vinculante es dots/`+n` en Month y agenda seleccionada; no eventos textuales comprimidos en cells móviles.

## 6. Event Detail

- Hora/fecha es el ancla visual, seguida por título.
- Duración, location y recurrence en metadata lines.
- Edit es acción visible contextual; Cancel/Trash en overflow/final section.
- Cancelled reemplaza acción principal por Reactivar si capability permite.
- Serie recurrente: confirmation sheet distingue ocurrencia/serie con wording humano basado en contract existente.
- No history técnica ni IDs.

## 7. Goals

### Estructura de pantalla

1. Heading `Metas` + filter entry.
2. Un control Estado; scope/category bajo filter sheet.
3. Goals activas primero; achieved/closed bajo filtro o sections colapsables según D6.
4. Empty distingue “sin metas” de “sin resultados para filtros”.

### Goal row/card

| Caso | Visible | Acción principal |
|---|---|---|
| normal | dirección, progreso, next milestone, target si relevante | abrir/update progress |
| personal | scope plain solo si lista mezcla scopes | update |
| household | scope plain solo si mezcla | update |
| sin milestones | no placeholder en row | detail puede invitar a crear |
| completed | resumen achieved + fecha si útil | view/reopen contextual |
| closed | closed exceptional + progreso final | view/reopen |
| dense | title + bar/value + una línea | tap detail |

Goal no usa completion circle de Task ni hora leading de Event. Progreso incluye `accessibilityValue` textual.

## 8. Goal Detail y milestones

- Hero liviano: title + progress, no card dentro de card.
- Primary: `Actualizar progreso`, `Marcar lograda` solo si el estado/contract lo hace correcto.
- Next milestone inmediatamente después; lista de hitos con completion affordance 48 dp.
- Target/scope/category en metadata group, category puede L4.
- `Cerrar meta`, Reopen y Delete/Trash en overflow/final; “Cerrar” explica que no equivale a “Lograr”.
- Empty milestones es inline con action contextual, no una card decorativa.

## 9. Forms

### Quick Create

- Sheet title + close/back contract actual.
- Campos esenciales descritos en Information Hierarchy.
- `Más opciones` control expanded con estado anunciado.
- CTA primary visible al final de viewport/keyboard-safe; no agrega campos.
- Cancelar vía Back/close conserva confirmación de dirty state solo si ya existe/si se aprueba posteriormente.

### Full Form

- Todas las secciones existentes expandidas y ordenadas: Esencial → Cuándo/Personas → Organización → Advanced.
- Fields sobre canvas, agrupados por headings/spacing; no card por cada field.
- Inline validation junto al field y summary/focus al primer error si hay múltiples.

### Edit Form

- Misma estructura de Full; título `Editar …`; CTA `Guardar cambios`.
- Dirty/busy state; no cerrar hasta success concluyente.
- Cancel/Trash/Close no comparten footer con Save; viven en detail/overflow.

### Feedback

| Estado | Respuesta |
|---|---|
| idle | CTA label estable |
| invalid | errores específicos; CTA puede mantenerse y enfocar error |
| saving | lock único + busy + “Guardando…” |
| success | anuncio; sheet cierra o muestra resultado claro en ≤240 ms tras respuesta |
| timeout/uncertain | “No pudimos confirmar. Revisar antes de reintentar”; mismo idempotency intent |
| error safe | mensaje corregible + retry; draft preservado en memoria |
| conflict | datos no se sobreescriben; recargar/revisar |

## 10. Home Planner Summary

- Un bloque Planner, no tres mini-apps con peso idéntico.
- `Atención` aparece solo si count >0 y lleva a filtro contextual.
- Task máximo 3: leading completion/verification, title, due/assignee; normal status desaparece.
- Event máximo 3: time-title; location secundaria.
- Goal máximo 1: title + progress + next milestone.
- Partial error vive solo en sección fallida; se preservan secciones válidas y no se expone code.
- Empty global ofrece crear; empty de una sección no roba altura si otras tienen contenido.
- One-tap: local busy, optimistic feedback y rollback/error anunciado.

## 11. Estados transversales

| Estado | Propuesta |
|---|---|
| initial loading | skeleton estructural |
| refreshing | contenido preservado + progress discreto |
| stale | contenido + timestamp/label humano solo si útil |
| offline | banner único + capacidades mutables coherentes |
| partial error | inline por sección |
| fatal | state view + retry/back |
| forbidden | explicación segura + back |
| not found | objeto no disponible + back |
| conflict | conservar contexto + reload/resolve |
| capability denied | ocultar acción no disponible; explicar solo si usuario esperaba realizarla |

## 12. Antes / después esperado

| Actual | Propuesta |
|---|---|
| 3 full-width Quick Action rows | 3 compact full-surface tiles |
| 4 metrics + 2 filter rows antes de Tasks | summary condicional + 1 filtro + list |
| 0–3 chips por card | 0 normal, máximo 1 excepción |
| Event con 3 acciones inline | Event row temporal + detail/overflow |
| Goal como card de status/categoría/scope | Goal orientada a progreso/milestone |
| Month recortado | dates legibles + dots/`+n` + agenda |
| fields encapsulados repetidamente | groups por whitespace/headings |
| submit stuck ambiguo | busy→success/error/uncertain concluyente |
| error técnico en Home | mensaje humano por sección |

## 13. Decisiones relacionadas

- D2 Task hierarchy: row action-first.
- D3 Event hierarchy: time-first.
- D4 Goal hierarchy: progress-first.
- D7 Calendar: Month overview + agenda.
- D8 Forms: Quick/Full/Edit + disclosure.
- D9 Details: primary visible, context in overflow, destructive final/confirm.

## 14. M11-C2 interaction and closure addendum

| Surface | Final refinement | Acceptance focus |
|---|---|---|
| Task list/Home Task | visible complete/verify remains canonical; body opens Detail; right partial reveals frequent action; left partial reveals `Más`; eligible complete alone can full-swipe | no gesture-only command; threshold/release/cancel; capability/state matrix; Undo and rollback |
| Event/Goal lists | no commit swipe; row/visible milestone action/overflow remain paths; long press may mirror overflow | horizontal movement never mutates; menu parity; long text and 2× scale |
| Details | long press and overflow contain the same state-valid actions; destructive last and confirmed | exact parity, focus return, forbidden/conflict/not-found |
| Quick/Full/Edit forms | explicit defaults summary; selectable existing template only; busy always reaches success/error/uncertain | double tap, delayed/lost response, no duplicate, draft preservation |
| Calendar | selected date persists through view navigation where contract permits; Month drops event markers before date legibility | 320–412 dp, 1×–2×, 5/6 weeks, locale, simultaneous events |
| Home Summary | each section independently healthy/loading/stale/error; raw technical data prohibited | partial result matrix, one-tap rollback, sanitized synthetic-code canary |
| Shell/tabs | visual weight reduced without route, params, selected-tab ownership or Back changes | route/back regression plus focus/scroll restoration |

The gesture alternatives are compared in [`m11-proposals/planner-gesture-lab.html`](m11-proposals/planner-gesture-lab.html). D21–D36 and the P0 gate are authoritative in the [Freeze Contract](PLANNER_V1_M11_UX_UI_FREEZE_CONTRACT.md).
