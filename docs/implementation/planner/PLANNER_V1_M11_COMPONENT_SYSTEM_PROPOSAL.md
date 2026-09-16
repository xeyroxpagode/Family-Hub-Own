# Planner V1 — M11 Component System Proposal

Este documento define la gramática visual de Planner. Los nombres son conceptuales; no autorizan implementación ni obligan a crear un archivo por componente.

## 1. Jerarquía tipográfica

Reusar tokens existentes; validar valores finales en implementación con font scaling.

| Rol | Uso | Peso / comportamiento |
|---|---|---|
| Screen title | Planner / detalle | bold, una vez por pantalla; no competir con AppTopBar |
| Section title | Hoy, Sábado 18, Hitos | semibold/bold; heading accesible |
| Object title | Task/Event/Goal | semibold; 1–2 líneas, L1 |
| Body | descripción/empty/error | regular; 1.45–1.55 line height |
| Metadata | fecha, persona, duración | regular/medium; L2/L3, contraste AA |
| Label | control/field/action | medium/semibold; nombre visible coincide con accessibility label |
| Exceptional status | overdue/verify/cancelled | medium/semibold + icono; no color solo |
| Primary action | Crear/Guardar/Verificar | semibold/bold; una prominente |

No usar tamaño + peso + color + cápsula simultáneamente para el mismo nivel.

## 2. Espaciado

| Token propuesto | Valor base | Uso |
|---|---:|---|
| screen padding compact | 20 dp | Planner y sheets |
| screen padding narrow | 16 dp | ancho <360 dp |
| section gap | 24 dp | bloques principales |
| heading→content | 12 dp | título de sección a lista/control |
| row gap | 0 dp + divider, o 8 dp sin divider | listas |
| row padding | 14–16 dp vertical, 0/16 horizontal | target cómodo |
| card padding | 16 dp | solo cards justificadas |
| metadata gap | 4–6 dp | líneas L2/L3 |
| icon-label gap | 8 dp | tiles/actions |
| control gap | 8 dp | filtros/tiles |
| sheet top/bottom | 24/20 dp + safe area | sheet chrome |
| form group gap | 24 dp | secciones, no card por campo |

La base 4/8 se conserva. Espacio vertical se reduce eliminando contenedores, no achicando targets.

## 3. Superficies

| Recurso | Cuándo sí | Cuándo no |
|---|---|---|
| Card | summary agregado, empty/error destacado, objeto aislado con varias regiones relacionadas | cada row homogénea, cada field, cada metadata group |
| Flat row | Task/Event/Goal/agenda/milestone | acciones heterogéneas sin jerarquía |
| Divider | lista homogénea con fondo común | además de card+borde+shadow |
| Whitespace | grupos semánticos claros | cuando falta heading/alineación |
| Border | separación necesaria con contraste de superficie insuficiente | decoration por defecto |
| Shadow | sheet/floating control que cambia de plano | cada card/list item |
| Radius | tiles/sheets/cards justificadas | encapsular texto pasivo |

Máximo recomendado por objeto: una forma de containment. No combinar background+borde+shadow salvo floating overlay.

## 4. Color

La paleta parte de tokens actuales; los valores finales necesitan contraste automatizado y pruebas de dispositivo.

| Familia | Función | Regla simultánea |
|---|---|---|
| Terracotta | primary action, selected, brand accent | una ancla principal por viewport |
| Neutral warm | canvas, surfaces, dividers, metadata | domina la pantalla |
| Success | completion achieved | solo resultado/estado positivo relevante |
| Warning | overdue/attention | no para normal priority |
| Error | failure/destructive/cancelled si corresponde | nunca como CTA principal persistente |
| Selected | fill suave + outline/check | no color solo |
| Disabled | opacity/neutral + state semántico | conserva legibilidad del label |

Por row normal: neutral + como máximo terracotta en el affordance. Por row excepcional: neutral + un semantic. No mostrar terracotta, success, warning y error juntos en la misma card.

## 5. Primitives propuestas

| Nombre conceptual | Responsabilidad | Reusa | Variantes | Evita |
|---|---|---|---|---|
| `PlannerActionTile` | Quick Actions full-cell | Pressable, icons, theme | idle/pressed/busy/disabled | filas+chevron |
| `PlannerListRow` | estructura 1–3 líneas y slots | theme, Pressable | task/event/goal/milestone | card local duplicada |
| `PlannerMetadataLine` | icono+texto L2/L3 | icons/type | date/person/place/recurrence | passive chips |
| `PlannerStatusIndicator` | excepción semántica | theme/icons | warning/error/success/info | badge normal |
| `PlannerOverflowAction` | menu trigger accesible | Pressable | normal/disabled | botones inline simultáneos |
| `PlannerPrimaryAction` | única acción prominente | `AppButton` | normal/loading/success | CTA divergentes |
| `PlannerSectionHeader` | heading + acción secundaria | type/spacing | count optional | headings dentro de card |
| `PlannerEmptyState` | empty contextual | `PlannerStateView` | list/calendar/milestones | empty cards anidadas |
| `PlannerInlineError` | partial/stale/offline/error | `PlannerStateView`, error adapter | retry/dismiss | raw codes |
| `PlannerSkeleton` | initial structural placeholder | `Skeleton` | row/summary/form | skeleton en refresh |
| `PlannerProgress` | Goal progress accessible | theme | determinate/textual | color-only bar |
| `PlannerFilterControl` | visible primary + filter entry | `ActionPill` semantics | segmented/button/sheet count | chip rows apiladas |

## 6. Object compositions

### Task row

`leading action 48dp` + `title` + `date · assignee` + optional one-line exception + `overflow 48dp`. High priority and overdue do not each create separate badges. Completed uses check/strike only if contrast/readability remain.

### Event row

`time column` + `title` + `duration · location` + optional recurrence/cancelled + overflow. No completion affordance. Time column keeps a stable min width and all-day wraps semantically.

### Goal row

`title` + `progress bar/value` + optional next milestone/target + overflow. Scope appears only if mixing personal/household changes interpretation.

## 7. States

| State | Component response |
|---|---|
| pressed | fill/opacity + optional 0.985 scale, 80 ms |
| selected | outline/check + `selected` |
| disabled | visual reduction + `disabled`; no press/haptic |
| busy | local lock + stable layout + `busy` |
| offline | preserve rows, inline banner; disable mutation only if contract requires |
| stale/refresh | preserve rows, compact progress; no skeleton |
| partial error | section-level inline error, valid content stays |
| conflict | explain change and offer reload/resolve; no raw version |
| forbidden/not found | `PlannerStateView` with safe exit |
| skeleton | mirror row geometry; no fake labels |

## 8. Reuse/refactor strategy posterior

1. Token/semantics first: metadata/status/filter primitives without behavior changes.
2. Quick Actions isolated.
3. Task row and Home Task share composition.
4. Event/Calendar geometry separately; highest visual risk.
5. Goal row/progress/milestones.
6. Forms modes and feedback.
7. Details/destructive actions.
8. Shell/tabs polish last to avoid destabilizar M1–M10.

No se propone un “mega component” condicional para Task/Event/Goal; comparten primitives, no jerarquía.
