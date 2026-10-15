# PLANNER_TASKS_PATCH3_MULTISELECT_AUDIT.md

## A. Executive Summary

El código actual **NO tiene soporte para multi-selection**. Existe toda la infraestructura de mutaciones individuales, gestos, headers, menús y bottom navigation — pero **cero estado de selección**, **cero long press**, **cero header contextual**, **cero bottom action bar**, y **cero coordinación batch**.

El REAL GAP mínimo se concentra en:
1. **Selection state** (nuevo: `selectedIds: Set<string>`, `selectionMode: boolean`)
2. **TaskRow integration** (long press + tap behavior switch + checkbox indicator)
3. **Contextual header** (reemplazo temporal del header normal)
4. **Bottom action bar** (overlay por encima de navbar real, safe-area aware)
5. **Eligibility engine** (derivado de `availableActions` + capabilities + checklist + verification)
6. **Batch coordinator** (frontend coordinator sobre mutaciones existentes, concurrencia limitada, partial success)
7. **Result reconciliation** (selección reconcilia contra `visibleTasks` filtrado)

Todas las mutaciones individuales (update, complete, cancel, reactivate, trash, assign) **ya existen** y son reutilizables vía `enqueuePlannerTaskVersioned` / `updatePlannerTask` / `updatePlannerTaskAssignmentV1`. No se necesita batch backend nuevo.

**Veredicto: READY_FOR_PATCH3_IMPLEMENTATION** — no hay blockers reales.

---

## B. Current Architecture

### B.1 Selection / List / Gestures

| Componente | Ubicación | Estado actual |
|---|---|---|
| TaskRow | `PlannerTasksScreen.tsx:157` | `React.memo` con `onOpen`, `onComplete`, `onVerify`, `onCancel`, `onTrash`, `onReactivate`, `onRestore`, `onRequestMenu`, `onRequestSwipe`, `completionCircle` |
| Swipe horizontal | `PlannerTasksScreen.tsx:236-249` | `PanResponder` por row; `openSwipe` state en screen; revela acciones left (edit/cancel) y right (complete) |
| Completion circle | `PlannerTasksScreen.tsx:284-295` | `TouchableOpacity` separado; solo visible cuando `primaryAction.key === 'complete' \| 'submit_for_verification'` |
| Row tap → Detail | `PlannerTasksScreen.tsx:277, 784` | `onPress={() => onOpen(task.id)}` navega a `TaskDetailScreen` |
| Row `···` menu | `PlannerTasksScreen.tsx:188-193, 251-253, 371-375` | Single owner pattern: `menuState` en screen; `PlannerAnchoredMenu` renderizado UNA vez fuera del ScrollView |
| Long press | **NO EXISTE** | Solo `PanResponder` para swipe horizontal; no hay gesture recognizer para long press |
| Haptics | `utils/haptics.ts`, `utils/plannerHaptics.ts` | `lightHaptic()`, `selectionHaptic()`, `actionHaptic()`, `warningHaptic()`, `errorHaptic()` — listos para usar |
| ScrollView | `PlannerScreen.tsx:676` | `onScrollBeginDrag` incrementa `interactionEpoch` que cierra menús/swipes en `PlannerTasksScreen` |

### B.2 Header / View Menu

| Elemento | Ubicación | Detalle |
|---|---|---|
| Planner header | `PlannerScreen.tsx:688-718` | Título "Planner", search icon (gated), overflow menu (Presets, Papelera) |
| Tasks header | `PlannerTasksScreen.tsx:874-892` | View selector (Pendientes/Hechas), filter button, create button |
| View menu | `PlannerTasksScreen.tsx:959-969` | `PlannerAnchoredMenu` anclado al view selector; items: Pendientes, Hechas |
| Filter sheet | `PlannerTasksScreen.tsx:919-954` | `ActionSheet` bottom sheet con filtros: Responsable, Cuándo, Tipo, Prioridad |

### B.3 Bottom Nav / Safe Area

| Elemento | Ubicación | Detalle |
|---|---|---|
| Bottom tab bar | `HomeTabNavigator.tsx:253-297` | `FloatingNavigationBar` absoluto con `bottom: 0`, `zIndex: 10`, `paddingBottom: Math.max(insets.bottom, spacing[3])` |
| PlannerSheetHost | `PlannerSheetHost.tsx:580-1125` | Modal `transparent` `animationType="none"` `presentationStyle="overFullScreen"` — sobre todo, incluyendo tab bar |
| Safe area | `react-native-safe-area-context` | `useSafeAreaInsets()` usado en tab bar, sheet host, anchored menus |

**Conclusión**: La estrategia más segura para la bottom action bar es renderizarla como **overlay absoluto dentro del `PlannerTasksScreen`** (hermano del contenido, no hijo del ScrollView), con `bottom: insets.bottom + tabBarHeight`, `zIndex: 100` (arriba del tab bar `zIndex: 10`), y `pointerEvents="box-none"` en el contenedor.

---

## C. Individual Mutations — Exact Reuse Map

Todas las mutaciones necesarias ya existen en el runtime de reliability. Cada una requiere `expectedVersion` y usa `mutationId`/`idempotencyKey` estable.

| Acción | Endpoint/RPC | Frontend Function | Payload | Versioning | Permissions | State Restrictions | Optimistic | Refresh |
|---|---|---|---|---|---|---|---|---|
| **Fecha** (SET/null) | `PATCH /api/planner/tasks/:id` | `updatePlannerTask` → `enqueuePlannerTaskUpdate` | `{ due_date: string \| null, expected_version }` | `If-Match` | `task.edit_own` / `task.edit_any` | Cualquier estado no trashed | NO (no hay optimistic patch en PlannerTasksScreen) | Cache invalidation `task.update` |
| **Hora** (SET/null) | `PATCH /api/planner/tasks/:id` | `updatePlannerTask` | `{ due_time: string \| null, expected_version }` | `If-Match` | `task.edit_own` / `task.edit_any` | Requiere `due_date` (validación backend) | NO | Cache invalidation `task.update` |
| **Responsables** (REPLACE) | `PUT /api/planner/v1/tasks/:id/assignment` | `updatePlannerTaskAssignmentV1` | `{ assignmentKind, fulfillmentMode, memberIds[], expectedAssignmentVersion }` | `If-Match` (assignment version) | `task.assign_self` / `task.assign_members` | Cualquier estado operativo | NO | Cache invalidation `task.assign` |
| **Prioridad** (SET) | `PATCH /api/planner/tasks/:id` | `updatePlannerTask` | `{ priority: 'low'\|'normal'\|'high', expected_version }` | `If-Match` | `task.edit_own` / `task.edit_any` | Cualquier estado no trashed | NO | Cache invalidation `task.update` |
| **Plan** (SET/null) | `PATCH /api/planner/tasks/:id` | `updatePlannerTask` | `{ goal_id: string \| null, plan_classification?, expected_version }` | `If-Match` | `task.edit_own` / `task.edit_any` | `plan_classification` solo si `goal_id` presente | NO | Cache invalidation `task.update` |
| **Completar** | `POST /api/planner/tasks/:id/complete` | `enqueuePlannerTaskComplete` | `{ expected_version }` | `If-Match` | `task.complete_assigned` / `complete_unassigned` / `complete_any` | `status=pending`, NO `requires_verification`, checklist opcional (confirm) | NO (pero `completePlannerTaskOptimistic` existe en plannerTasks.ts:661) | Cache invalidation `task.complete` |
| **Cancelar** | `DELETE /api/planner/tasks/:id` | `enqueuePlannerTaskCancel` | `{ expected_version, reason? }` | `If-Match` | `task.cancel_own` / `task.cancel_any` | `status=pending` | NO | Reload tasks |
| **Reactivar** | `POST /api/planner/tasks/:id/reactivate` | `enqueuePlannerTaskReactivate` | `{ expected_version }` | `If-Match` | `task.cancel_own` / `task.cancel_any` | `status=cancelled`, no trashed | NO | Reload tasks |
| **Papelera** | `POST /api/planner/tasks/:id/trash` | `enqueuePlannerTaskTrash` | `{ expected_version }` | `If-Match` | `task.restore` | Cualquier estado no trashed | NO | Reload tasks |

**Notas clave**:
- `updatePlannerTask` (PATCH) soporta SET parcial y null para `due_date`, `due_time`, `assigned_to_member_id`, `goal_id`, `plan_classification`, `priority`, `checklist`, `requires_verification`.
- `updatePlannerTaskAssignmentV1` **reemplaza** el conjunto completo de responsables (no append).
- `completePlannerTask` lanza `evidence_submission_required` (409) si `requires_verification=true` — el frontend debe excluir estas de batch complete.
- Checklist incompleta: frontend muestra confirmación (sheet) pero **permite** completar; backend NO bloquea.
- Version conflict (412) → `version_conflict_v2` con `current_version` en response; frontend debe refrescar esa task individual.

---

## D. Eligibility — Derivation Without Domain Duplication

La elegibilidad **NO debe duplicar lógica de dominio**. El backend es autoridad final. El frontend deriva `canBatchX(task)` a partir de datos **ya presentes en `PlannerTask`**:

```typescript
// Datos disponibles en PlannerTask (plannerTaskV1.ts + plannerTasks.ts)
interface PlannerTask {
  status: PlannerTaskStatus;
  version: number;
  requires_verification: boolean;
  checklist?: Array<{ text: string; checked: boolean }> | null;
  availableActions?: Array<{ action: string; fulfillmentId?: string; disabledReason?: string | null }>;
  assigned_to_member_id?: string | null;
  // capabilities vienen de context (PlannerCapabilitiesProjection)
}
```

### Reglas de derivación (frontend-only, reflejan dominio):

| Acción | `canBatchAction(task, capabilities)` |
|---|---|
| **Fecha / Hora / Prioridad / Plan** | `task.status !== 'cancelled' && !task.trashed_at && hasEditCap(task, capabilities)` |
| **Responsables** | `task.status !== 'cancelled' && !task.trashed_at && hasAssignCap(task, capabilities)` |
| **Completar** | `task.status === 'pending' && !task.requires_verification && !task.trashed_at && hasCompleteCap(task, capabilities) && (task.checklist?.every(c => c.checked) ?? true)` |
| **Cancelar** | `task.status === 'pending' && !task.trashed_at && hasCancelCap(task, capabilities)` |
| **Reactivar** | `task.status === 'cancelled' && !task.trashed_at && hasCancelCap(task, capabilities)` |
| **Papelera** | `!task.trashed_at && hasRestoreCap(capabilities)` |

**Helper de permisos** (reutiliza `hasCapability` de `plannerCapabilities.ts`):

```typescript
function hasEditCap(task, caps) {
  const isOwner = task.created_by_member_id === myMembershipId;
  return isOwner ? hasCapability(caps, 'task.edit_own') : hasCapability(caps, 'task.edit_any');
}
function hasAssignCap(task, caps) { return hasEditCap(task, caps); } // misma capability
function hasCompleteCap(task, caps) {
  if (task.assigned_to_member_id === myMembershipId) return hasCapability(caps, 'task.complete_assigned');
  if (!task.assigned_to_member_id) return hasCapability(caps, 'task.complete_unassigned');
  return hasCapability(caps, 'task.complete_any');
}
function hasCancelCap(task, caps) {
  const isOwner = task.created_by_member_id === myMembershipId;
  return isOwner ? hasCapability(caps, 'task.cancel_own') : hasCapability(caps, 'task.cancel_any');
}
function hasRestoreCap(caps) { return hasCapability(caps, 'task.restore'); }
```

**Exclusiones explicables** (mapeo error → razón de producto):

| Error backend | Razón producto |
|---|---|
| `evidence_submission_required` (409) | "Requiere evidencia" |
| `task_invalid_transition` / `task_not_operational` | "Estado incompatible" |
| `planner_forbidden` / `rls_violation` | "Sin permiso" |
| `version_conflict_v2` (412) | "Conflicto de versión" |
| Checklist incompleta (frontend) | "Pasos pendientes" |
| `requires_verification=true` | "Requiere revisión" |

---

## E. REAL GAP Matrix

| Capability | CURRENT | Clasificación | REAL GAP | Archivo/Símbolo |
|---|---|---|---|---|
| **selection state** | ❌ Nada | ADD | `selectedIds: Set<string>`, `selectionMode: boolean`, `selectAll: boolean` | `PlannerTasksScreen.tsx` (nuevo state) |
| **long press** | ❌ Nada | ADD | `PanResponder` / `Pressable` con `onLongPress` + `delayLongPress={450}` + cancel on scroll | `TaskRow` (nuevo prop `onLongPress`) |
| **row indicator** | ❌ completionCircle | ADAPT_REUSE | Reemplazar `completionCircle` por `Checkbox` redondeado cuando `selectionMode` | `TaskRow` (lines 284-299) |
| **row tap** | `onOpen` → Detail | ADAPT_REUSE | En selectionMode: toggle select; fuera: navega Detail | `TaskRow` prop `onPress` condicional |
| **swipe coordination** | `openSwipe` state | CONNECT | Cerrar swipes al entrar selectionMode; desactivar `PanResponder` | `PlannerTasksScreen.tsx:369, 794` |
| **popover coordination** | `menuState` | CONNECT | Cerrar menú al entrar selectionMode; desactivar `onRequestMenu` | `PlannerTasksScreen.tsx:368, 371` |
| **header** | View selector + filter + create | ADAPT_REUSE | Reemplazar utilityRow por `Cancelar — N seleccionadas — ···` | `PlannerTasksScreen.tsx:874-892` |
| **view-menu entry** | Solo view selector | ADD | Agregar "Seleccionar tareas" al overflow del header Planner O al view menu | `PlannerScreen.tsx:711-717` o `PlannerTasksScreen.tsx:959` |
| **select all** | ❌ | ADD | Seleccionar `visibleTasks.filter(matchesFilters)` — TODO el result set filtrado | `PlannerTasksScreen.tsx` (nuevo handler) |
| **bottom bar** | ❌ | ADD | Overlay absoluto `bottom: insets.bottom + tabBarHeight`, `zIndex: 100` | `PlannerTasksScreen.tsx` (nuevo render) |
| **safe-area positioning** | `useSafeAreaInsets` en tab bar | CONNECT | Usar `insets.bottom` + medir tab bar real (72px aprox) | `HomeTabNavigator.tsx:255, 432` |
| **eligibility engine** | ❌ | ADD | `computeEligibility(selectedIds, tasks, capabilities)` → `{ eligible: Set, reasons: Map<taskId, string[]> }` | Nuevo hook/utility |
| **partial eligibility** | ❌ | ADD | Agrupar razones: `2 requieren evidencia`, `1 sin permiso`, `1 pasos pendientes` | Nuevo componente summary |
| **Fecha batch** | `updatePlannerTask` | REUSE | Coordinar N llamadas PATCH con `expected_version` individual | `services/plannerTasks.ts:323` |
| **Hora batch** | `updatePlannerTask` | REUSE | Idem; validar `due_date` existe (backend lo exige) | `services/plannerTasks.ts:323` |
| **Responsables batch** | `updatePlannerTaskAssignmentV1` | REUSE | Coordinar N llamadas PUT assignment; REPLACE semantics | `services/plannerTasks.ts:508` |
| **Prioridad batch** | `updatePlannerTask` | REUSE | Idem | `services/plannerTasks.ts:323` |
| **Plan batch** | `updatePlannerTask` | REUSE | Idem; `goal_id` + `plan_classification` together | `services/plannerTasks.ts:323` |
| **Complete batch** | `enqueuePlannerTaskComplete` | REUSE | Filtrar elegibles; NO abrir EvidenceComposer; NO completar con verification | `services/planner/reliability/productiveMutations.ts:186` |
| **Cancel batch** | `enqueuePlannerTaskCancel` | REUSE | Filtrar elegibles; confirmación agrupada | `services/planner/reliability/productiveMutations.ts:190` |
| **Reactivate batch** | `enqueuePlannerTaskReactivate` | REUSE | Filtrar elegibles | `services/planner/reliability/productiveMutations.ts:196` |
| **Trash batch** | `enqueuePlannerTaskTrash` | REUSE | Filtrar elegibles | `services/planner/reliability/productiveMutations.ts:192` |
| **concurrency** | `enqueueConfirmed` serial | ADAPT_REUSE | `Promise.allSettled` con límite (p.ej. 3 concurrentes) + retry individual | `services/planner/reliability/operationScheduler.ts` |
| **partial success** | Rollback global en error | ADD | Conservar exitosas; reportar fallidas; reconciliar lista; mantener seleccionadas fallidas | Nueva lógica en coordinator |
| **result reconciliation** | `visibleTasks` memo | ADAPT_REUSE | `selectedIds = selectedIds ∩ visibleTasks.map(t => t.id)`; si 0 → exit mode | `PlannerTasksScreen.tsx:499` |
| **exit cleanup** | `useFocusEffect` cierra menús | ADAPT_REUSE | Reset `selectedIds`, `selectionMode`, `openSwipe`, `menuState`, `viewMenuVisible` | `PlannerTasksScreen.tsx:377-382` |
| **performance >50** | Render all rows | FIX | `FlatList` con `getItemLayout` + `initialNumToRender` + `maxToRenderPerBatch` | `PlannerTasksScreen.tsx:798` |

---

## F. Exact Files Likely To Touch

| Archivo | Símbolo | Rol | Cambio probable |
|---|---|---|---|
| `screens/planner/PlannerTasksScreen.tsx` | `PlannerTasksScreen` | Owner principal | +selection state, +long press handler, +contextual header, +bottom bar render, +batch coordinator, +reconciliation |
| `screens/planner/PlannerTasksScreen.tsx` | `TaskRow` | Row component | +`selectionMode` prop, +`isSelected` prop, +`onLongPress`, +checkbox indicator, +tap behavior switch |
| `screens/planner/PlannerScreen.tsx` | `PlannerScreen` | Shell header | +`Seleccionar tareas` en overflow menu O view menu integration |
| `components/planner/PlannerAnchoredMenu.tsx` | `PlannerAnchoredMenu` | Contextual menu | Reutilizar para header contextual `···` (Select All / Deselect All) |
| `hooks/useReduceMotion.ts` | `useReduceMotion` | Accessibility | Reutilizar para animaciones de entrada/salida bottom bar |
| `utils/haptics.ts` | `lightHaptic` | Feedback | Long press → `lightHaptic()` |
| `utils/plannerHaptics.ts` | `selectionHaptic`, `actionHaptic`, `warningHaptic` | Feedback semántico | Selection toggle, batch actions, destructive confirm |
| `services/plannerTasks.ts` | `updatePlannerTask`, `completePlannerTask`, etc. | Mutations | Reutilizar tal cual; wrapper batch en screen |
| `services/planner/reliability/productiveMutations.ts` | `enqueuePlannerTaskVersioned` | Reliability queue | Reutilizar; coordinar N llamadas con `Promise.allSettled` |
| `services/planner/plannerCapabilities.ts` | `hasCapability` | Permissions | Derivar elegibilidad |
| `services/planner/plannerCache.ts` | `executeInvalidation` | Cache | Invalidación dirigida tras batch (una por acción, no por task) |
| `navigation/HomeTabNavigator.tsx` | `HomeTabNavigator` | Tab bar height | Exponer `tabBarHeight` via context o medir en `PlannerTasksScreen` |
| `context/PlannerSheetContext.tsx` | `usePlannerSheet` | Sheet/Toast | `pushToast` para feedback agregado; `openConfirmDestructive` para confirmaciones batch |
| `types/plannerTaskV1.ts` | `PlannerTask`, `PlannerTaskAvailableAction` | Types | Extender types si hace falta para eligibility helpers |

---

## G. Backend Decision: Frontend Coordinator (Option A)

**Decisión**: **Frontend coordinator llama mutaciones individuales existentes con concurrencia limitada (Option A).**

### Justificación

| Criterio | Evaluación |
|---|---|
| **Seguridad** | Cada mutación valida `expected_version`, permisos, estado — backend sigue siendo autoridad. No hay riesgo de "batch bypass". |
| **Versioning individual** | Cada task tiene su `version`; batch coordinator pasa `expected_version` por task. Conflictos se manejan individualmente (412 → refresh esa task). |
| **Partial success** | Natural con `Promise.allSettled`: 19 PASS + 1 CONFLICT → conservar 19, reportar 1, no rollback global. |
| **Permisos heterogéneos** | Cada llamada re-evalúa capabilities en backend; frontend pre-filtra con `hasCapability` pero backend decide. |
| **Complejidad** | Cero backend nuevo. Reutiliza `enqueuePlannerTaskVersioned` + `updatePlannerTask` + `updatePlannerTaskAssignmentV1` que ya manejan idempotency, retry, conflict review. |
| **Performance >50** | Concurrencia limitada (3-5 paralelos) + invalidación cache **una por acción** (no por task). `plannerCache.executeInvalidation({ kind: 'task', action: 'update' }, scope)` invalida listas en batch. |
| **Trazabilidad** | Cada mutación genera su `mutationId` y `audit_event_id`; logs de telemetry por operación individual. |

**No crear RPC batch** — no aporta valor y añade superficie de mantenimiento.

---

## H. Implementation Order (Máximo 4 pasos internos)

### Paso 1 — Selection State + Gesture/UI Shell
- `selectionMode`, `selectedIds: Set<string>`, `selectAllFiltered: boolean` en `PlannerTasksScreen`
- `TaskRow`: prop `selectionMode`, `isSelected`, `onLongPress` (con `delayLongPress={450}`, cancel on `onScrollBeginDrag`)
- Header contextual: reemplazar `utilityRow` por `Cancelar | N seleccionadas | ···` (PlannerAnchoredMenu con Select All / Deselect All)
- Cerrar swipes (`setOpenSwipe(null)`), menús (`setMenuState(null)`), desactivar completion circle
- Checkbox redondeado en lugar de completion circle cuando `selectionMode`
- Tap behavior: `selectionMode` → toggle select; normal → `onOpen`
- Long press: `lightHaptic()` + entrar selectionMode + seleccionar esa task

### Paso 2 — Eligibility + Action Surfaces
- Hook `useBatchEligibility(selectedIds, tasks, capabilities, myMembershipId)` → `{ eligible: Map<action, Set<taskId>>, reasons: Map<taskId, string[]> }`
- Bottom action bar (overlay absoluto, `zIndex: 100`, `bottom: insets.bottom + tabBarHeight`):
  - Primary: Fecha, Responsables, Más
  - Quick: Completar (solo si todas elegibles)
  - Más menu: Hora, Prioridad, Plan, Completar, Cancelar, Reactivar, Papelera
- Single selection → `Editar` sale modo y abre TaskDetail
- Partial eligibility summary: chips agrupados por razón

### Paso 3 — Mutation Coordinator + Partial Success
- `runBatchAction(action, eligibleTaskIds, payload)`:
  - `Promise.allSettled(eligibleTaskIds.map(id => mutateWithVersion(id, action, payload)))`
  - Concurrencia: `pLimit(3)` o similar simple
  - Cada mutación usa su `expected_version` actual (leer de `tasks` state)
  - Agregar resultados: `success[]`, `failed: Map<taskId, { code, reason }>`
- Post-action behavior:
  - No terminales (Fecha, Hora, Responsables, Prioridad, Plan): actualizar rows, **permanecer en selección**
  - Terminales (Completar, Cancelar, Reactivar, Papelera): **salir de selección** si todo OK; si parcial → reconciliar, mantener fallidas seleccionadas, toast agregado
- Reconciliation: `selectedIds = selectedIds ∩ visibleTasks.map(t => t.id)`; si vacía → exit mode
- Exit cleanup: reset todo state, restaurar completion circle, swipe, popovers, header normal

### Paso 4 — Integration / Performance / Tests
- `FlatList` con `getItemLayout` + `initialNumToRender={20}` + `maxToRenderPerBatch={10}` + `windowSize={5}`
- `React.memo` en `TaskRow` ya existe — verificar deps incluyen `selectionMode`, `isSelected`
- Tests dispositivo (ver sección I)
- Accesibilidad: `accessibilityState={{ selected: isSelected }}`, `accessibilityRole="checkbox"` en indicator

---

## I. Tests / Device QA

| # | Test | Esperado |
|---|---|---|
| 1 | Long press en TaskRow | Entra selectionMode, selecciona esa task, haptic ligero |
| 2 | Scroll vertical | NO dispara long press |
| 3 | Tap en selectionMode | Toggle select/deselect; NO abre Detail |
| 4 | Swipe horizontal en selectionMode | Deshabilitado (no se abre) |
| 5 | Menú `···` en selectionMode | No compite; menú cerrado al entrar |
| 6 | Cancelar en header contextual | Sale limpio: selectionMode=false, selectedIds=∅, header normal, swipe/popover restaurados |
| 7 | Back button Android | Igual que Cancelar |
| 8 | Select All (header ···) | Selecciona TODO `visibleTasks` filtrado (no solo viewport) |
| 9 | 1 task seleccionada → Editar | Sale selectionMode, abre TaskDetail normal |
| 10 | Batch Fecha | SET due_date en elegibles; permanece en selección; rows actualizan |
| 11 | Batch Hora | SET due_time; valida due_date existe; permanece |
| 12 | Batch Responsables | REPLACE (no append); permanece |
| 13 | Batch Prioridad | SET low/normal/high; permanece |
| 14 | Batch Plan / Sin Plan | SET goal_id (+ plan_classification) o null; permanece |
| 15 | Complete con requires_verification | Excluidas; razón "Requiere evidencia" |
| 16 | Complete con checklist incompleto | Excluidas; razón "Pasos pendientes" |
| 17 | Complete subset 5/7 | 5 completadas, 2 no; sale selección; toast "5 completadas · 2 no se pudieron modificar" |
| 18 | Cancel subset | Igual; toast agregado |
| 19 | Reactivate subset | Igual |
| 20 | Trash subset | Igual |
| 21 | Mixed permissions | Solo elegibles por capability se ejecutan; otras reportadas "Sin permiso" |
| 22 | Version conflict parcial | 19 OK, 1 conflict → 19 confirmadas, 1 refrescada y queda seleccionada |
| 23 | Partial success no rollback | Éxitos persisten; fallidas no revierten otras |
| 24 | Modificación saca rows del filtro | Ej: vista Hoy → cambiar fecha a mañana → task desaparece; selección reconciliada |
| 25 | 0 selected tras reconciliación | Auto-exit selectionMode |
| 26 | >50 Tasks seleccionadas | Sin jank; FlatList render incremental; batch coordinator límite concurrencia |
| 27 | Double execution blocked | Bottom bar disabled durante batch; no segundo submit |
| 28 | Bottom bar sobre navbar | Visible por encima de FloatingNavigationBar; safe-area correcta |
| 29 | Exit cleanup completo | Ningún swipe/overlay/gesture queda pegado; header normal; completion circles vuelven |

---

## J. Blockers

**Ninguno.** Todas las dependencias existen:
- Mutaciones individuales ✅
- Reliability runtime ✅
- Cache invalidation ✅
- Gesture system (PanResponder) ✅
- Anchored menus ✅
- Haptics ✅
- Safe area insets ✅
- Capabilities projection ✅
- Toast/Confirm system ✅

---

## VEREDICTO

**READY_FOR_PATCH3_IMPLEMENTATION**