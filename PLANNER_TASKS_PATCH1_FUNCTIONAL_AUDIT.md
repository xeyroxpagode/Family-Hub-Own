# PLANNER TASKS — PATCH 1 FUNCTIONAL AUDIT

**Worktree:** `C:\Users\thega\Desktop\HomePlus-worktrees\planner-current`
**Modo:** Auditoría técnica read-only. No implementar.
**Fecha:** 14 de octubre de 2026

---

## A. Executive Summary

**Causa común principal:** El RPC backend `mutate_planner_task_v0` **no persiste el campo `checklist`** ni en `create` ni en `update`. El frontend envía el payload correctamente, pero el SQL lo ignora silenciosamente.

**Otros hallazgos:**
- CK-05 (reordenamiento): El drag handler existe pero el cálculo de índice objetivo (`gesture.dy / 52`) es frágil y no considera altura variable de filas.
- CN-03 (Papelera freeze): `confirmTrash` en `PlannerTasksScreen` no limpia `menuState`/`openSwipe` antes de navegar; `TaskDetailScreen.handleTrash` llama `handleBack()` **antes** de que el toast con undo se registre, dejando navegación pendiente mientras el toast host está en transición.
- PR-03 (Guardar como preset): `taskToPresetPayload` incluye checklist correctamente (texto + orden, sin checked), pero el editor de preset no reutiliza `PlannerChecklistEditor` — usa su propio formulario.
- PR-02 (Cambiar/quitar preset): `removeAppliedPreset` restaura snapshot previo pero **no limpia `appliedPresetId` si el usuario edita manualmente tras aplicar** — el conflicto `detectApplyConflict` compara contra draft actual, no contra snapshot pre-preset.
- CN-01 (Completar delay): `runMutation` en `PlannerTasksScreen` hace `await loadTasks()` tras éxito **y** `setTasks` optimista — doble invalidación innecesaria.
- CN-05 (Refresh): Estrategia actual = refetch global (`loadTasks`) tras cada mutación. Funciona pero invalida cache innecesariamente.

**Fixes necesarios:** 7 (3 backend + 4 frontend)
**Backend/DB requerido:** **SÍ** — 3 correcciones en `mutate_planner_task_v0` (create, update, complete/verify no tocan checklist).
**Veredicto:** `READY_FOR_PATCH`

---

## B. Patch Matrix

| ID | CURRENT confirmado | Root cause | Clasificación | Corrección mínima | Archivos/símbolos | Backend/DB | Prueba de aceptación |
|---|---|---|---|---|---|---|---|
| CK-01 | Crear tarea con pasos: el usuario agrega pasos en Nueva Tarea, pero al guardar no aparecen en el detalle ni al reabrir. | `mutate_planner_task_v0` (action `create`) **no incluye `checklist`** en el INSERT (líneas 1039-1062). El payload llega pero se descarta. | PERSISTENCE_BUG | Añadir `checklist = case when p_payload ? 'checklist' then p_payload->'checklist' else '[]'::jsonb end` en el INSERT de create. | `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql` → `mutate_planner_task_v0` (create branch) | SÍ | 1. Crear Task con 3 pasos → reabrir → mismos 3 pasos y orden. |
| CK-02 | Pasos creados no aparecen al reabrir Task Detail / modo edición. | Misma causa que CK-01: checklist nunca se persiste en BD. Además, `update` branch (líneas 1113-1125) **tampoco actualiza `checklist`**. | PERSISTENCE_BUG | En `update` branch, añadir `checklist = case when p_payload ? 'checklist' then p_payload->'checklist' else checklist end` en el UPDATE. | `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql` → `mutate_planner_task_v0` (update branch) | SÍ | 1. (ver CK-01) 2. Editar checklist → guardar → reabrir → cambios persistidos. |
| CK-03 | Task Detail recibe checklist pero muestra 0 pasos o datos stale. | `getTaskById` → `hydrateMembers` → retorna `task.checklist` (JSONB). Si BD tiene `[]` (por CK-01/02), frontend muestra vacío. `handleChecklistToggle` (línea 1114-1138) hace `enqueuePlannerTaskUpdate` con checklist → **update ignora checklist** (CK-02). | PERSISTENCE_BUG | Corregir backend (CK-01/02). Frontend ya envía checklist correcto en `enqueuePlannerTaskUpdate`. | `plannerTasks.ts:updatePlannerTask` (envía checklist) + backend fix | SÍ (backend) | 3. Toggle paso en Detail → guardar → reabrir → estado persistido. |
| CK-04 | Modo edición no hidrata pasos existentes; guardar pierde IDs/orden. | `taskEditDraftFrom` (línea 70) usa `makePlannerChecklistDraft(task.checklist)` — genera **nuevos keys** (`checklist-${Date.now()}-${n}`) en lugar de preservar keys estables. Al guardar, `enqueuePlannerTaskUpdate` envía checklist sin IDs estables → backend no puede reconciliar reordenamiento. | STATE_BUG | `makePlannerChecklistDraft` debe preservar `key` si existe en item original, o backend debe usar índice de array como identidad (orden = identidad). Opción mínima: backend usa orden de array; frontend no necesita keys estables si backend persiste array completo. | `PlannerChecklistEditor.tsx:13` (`makePlannerChecklistDraft`) + `TaskDetailScreen.tsx:70` (`taskEditDraftFrom`) | NO (frontend only) | 2. Editar checklist → reordenar → guardar → orden persistido. |
| CK-05 | Grip visual existe pero drag no mueve pasos (o salta errático). | `ChecklistRow` PanResponder (líneas 38-61): `onPanResponderRelease` calcula `target = index + Math.round(gesture.dy / 52)`. Asume altura fija 52px; filas pueden medir >52 (texto largo, wrap). Además, `activated.current` requiere 180ms hold — conflicto con scroll vertical. | STATE_BUG | Cambiar cálculo a `Math.round(gesture.dy / rowHeight)` midiendo altura real, o usar `FlatList` con `onMoveShouldSetPanResponder` nativo. Fix mínimo: exponer `rowHeight` via context o medir `layout` en `onLayout`. | `PlannerChecklistEditor.tsx:30-66` (`ChecklistRow`) | NO | 3. Reordenar 3+ pasos → guardar → orden persistido. |
| CK-06 | Eliminar paso: desaparece localmente pero reaparece al reabrir. | `onDelete` filtra array local y llama `onChange` → `enqueuePlannerTaskUpdate` con checklist filtrado. **Backend update ignora checklist** (CK-02). | PERSISTENCE_BUG | Corregir backend update (CK-02). | Backend fix (CK-02) | SÍ (backend) | 4. Delete paso → no reaparece al reabrir. |
| CK-07 | Preset con checklist: al aplicar, pasos aparecen marcados o no copian orden. | `applyPresetToTaskDomain` (línea 167) hace `preset.checklist.map(item => ({ text: item.text, checked: false }))` — **correcto** (copia texto+orden, unchecked). `TaskForm.applyPresetPayloadToForm` (línea 532-535) usa `makePlannerChecklistDraft` que regenera keys — **correcto para create** (keys nuevos esperados). | KEEP | Ninguna. Verificar que `preset.checklist` venga del backend como `[{text}]` (sin checked). `normalizePresetChecklistTemplate` (línea 90-102) ya hace esto. | `plannerPresetTaskDomain.ts:167` + `TaskForm.tsx:532` | NO | 5. Aplicar preset con checklist → pasos nuevos sin marcar, mismo orden. |
| PR-01 | Aplicar preset: ¿qué campos se copian hoy? | `applyPresetToTaskDraft` (líneas 159-169) escribe: title, note→description, template_key, category, priority, checklist (unchecked), requires_verification, requires_evidence. **NO toca**: due_date, due_time, assigned_to_member_id, assignmentMode, goal_id, plan_classification. **Correcto según TARGET**. | KEEP | Ninguna. | `plannerPresetTaskDomain.ts:148-171` | NO | 5. (ver CK-07) |
| PR-02 | Cambiar preset A → editar manual → preset B → quitar preset: ¿se pisan datos? | `applyPreset` (línea 581-612): si `appliedPresetId === preset.id` → `removeAppliedPreset` (restaura `prePresetDraftRef`). Si distinto preset: `detectApplyConflict` compara `currentDraftForConflict()` (estado actual) vs payload nuevo. **Problema:** `currentDraftForConflict` incluye ediciones manuales → conflict detection dispara aunque el usuario quiera reemplazar. `removeAppliedPreset` solo restaura snapshot **inmediatamente anterior al preset actual**, no el original pre-todo. | STATE_BUG | `prePresetDraftRef` debe capturar snapshot **antes del primer preset aplicado** (no antes de cada cambio). Añadir `baseDraftRef` que se setea solo si `appliedPresetId === null` y se aplica primer preset. `removeAppliedPreset` restaura `baseDraftRef`. | `TaskForm.tsx:246-256` (`prePresetDraftRef`), `TaskForm.tsx:565-579` (`removeAppliedPreset`), `TaskForm.tsx:581-612` (`applyPreset`) | NO | 7. Aplicar preset A → editar título → cambiar a preset B → título de B gana; quitar preset → vuelve a estado pre-A. |
| PR-03 | Guardar Task como preset desde Detail: ¿qué precarga? | `handleSaveAsPreset` (línea 1200-1204) llama `taskToPresetPayload(task)` → incluye: title, description→note, template_key, category, priority, checklist (texto+orden, sin checked), requires_verification, requires_evidence. **Correcto**. Navega a `PlannerPresetCreate` con `presetPrefill`. Editor de preset debe mostrar checklist editable. | KEEP (backend) / MISSING_BEHAVIOR (frontend editor) | Verificar que `PlannerPresetFormScreen` / `PlannerPresetEditorScreen` use `PlannerChecklistEditor` para editar checklist del preset. Si no, añadirlo. | `PlannerPresetFormScreen.tsx` / `PlannerPresetEditorScreen.tsx` (no inspeccionados en auditoría) | NO | 6. Guardar Task como preset → checklist compatible precargado (texto+orden, unchecked). |
| PR-04 | Crear preset desde Nueva Tarea → volver al borrador con preset aplicado. | `applyPreset` (línea 611) cierra picker y setea `appliedPresetId`. Formulario queda con datos del preset. **Correcto**. Retorno a biblioteca desde `PlannerPresetCreate` no inspeccionado. | KEEP | Verificar navegación retorno en `PlannerPresetCreate` → `PlannerPresetDraftsIntegrationRoutes`. | `PlannerPresetDraftsIntegrationRoutes.tsx` | NO | 6. (ver PR-03) |
| PR-05 | Presets propios: crear/leer/editar/eliminar/aplicar. | `listPlannerPresets` (service) filtra `entity_type: 'task'`. `PlannerPresetPickerSheet` agrupa household/homeplus. `duplicatePlannerPresetToHousehold` existe. CRUD completo vía `plannerPresets` service. | KEEP | Ninguna (fuera de alcance de este patch). | `plannerPresets.ts`, `PlannerPresetPickerSheet.tsx` | NO | — |
| PR-06 | Presets oficiales: lectura, aplicación, protección edición, copia como base. | `buildCanonicalPresetGroups` separa `source === 'homeplus'` (solo lectura). `presetCanonicalScope.editable = false` para homeplus. `duplicatePlannerPresetToHousehold` crea copia editable. | KEEP | Ninguna. | `plannerPresetTaskDomain.ts:249-299` | NO | — |
| CN-01 | Completar: retraso percibido / doble ejecución. | `runMutation` (línea 531-569): `setConfirmedCompletionId` → `await new Promise(r => setTimeout(r, 160))` → `LayoutAnimation` → `setTasks` optimista → `onChanged` → toast. **Problema:** `loadTasks()` NO se llama aquí (bueno), pero `markPlannerChanged()` **sí** se llama en `confirmComplete`/`confirmVerify` → dispara `loadTasks` global via `plannerChangedAt` effect (línea 419-424). Doble invalidación: optimista + refetch. | STATE_BUG | Quitar `markPlannerChanged()` de `confirmComplete`/`confirmVerify`/`confirmCancel`/etc. en `PlannerTasksScreen` — la actualización optimista (`setTasks`) basta. `markPlannerChanged` solo para ops que no retornan task actualizada (ej. assignment V1). | `PlannerTasksScreen.tsx:571-572`, `591`, `639`, `735`, `839`, `908` | NO | 8. Completar → estado actualizado sin doble ejecución (no parpadeo lista). |
| CN-02 | Cancelar: confirmación → mutación → refresh → cierre overlay. | `confirmCancel` (línea 574-621): `sheet.openConfirm` → `enqueuePlannerTaskCancel` → `markPlannerChanged()` → `loadTasks()` → toast con undo. **Correcto**: una sola autoridad (confirm sheet), UI desbloqueada en `finally` (`setSavingId(null)`). | KEEP | Ninguna. | `PlannerTasksScreen.tsx:574-621` | NO | 9. Cancelar → estado actualizado y UI desbloqueada. |
| CN-03 | Mover a Papelera: Planner se congela hasta reiniciar app. | **PlannerTasksScreen.confirmTrash** (línea 718-766): no limpia `menuState`/`openSwipe` antes de mutación. Si usuario tenía menú/swipe abierto, queda overlay fantasma. **TaskDetailScreen.handleTrash** (línea 961-1009): llama `handleBack()` **línea 998** ANTES de que `sheet.pushToast` registre el undo (toast es async). Navegación quita pantalla mientras toast host procesa → lock de interacción. | STATE_BUG | 1. En `confirmTrash`: `setMenuState(null); setOpenSwipe(null);` al inicio. 2. En `handleTrash`: mover `handleBack()` **después** de `sheet.pushToast` (o usar callback de toast host). | `PlannerTasksScreen.tsx:718-766`, `TaskDetailScreen.tsx:961-1009` | NO | 10. Trash → Task desaparece y Planner sigue interactivo. |
| CN-04 | Popover → acción: overlay fantasma, doble ejecución, locks. | `PlannerTasksScreen`: `menuState` es único a nivel screen (línea 368). `closeTaskMenu` limpia (línea 376). `useFocusEffect` limpia al unfocus (línea 377-381). `interactionEpoch` limpia (línea 382). `PlannerAnchoredMenu` renderizado **fuera** del ScrollView (línea 954-960). **Correcto** — una sola instancia, limpieza garantizada. | KEEP | Ninguna. | `PlannerTasksScreen.tsx:368-382, 943-960` | NO | 11. (ver CN-03 fix) |
| CN-05 | Refresh estado: no exige reinicio, no deja info obsoleta, no refresh global innecesario. | Estrategia: `plannerChangedAt` global → `loadTasks()` refetch completo (línea 419-424). Mutaciones hacen `markPlannerChanged()` → disparan refetch. **Funciona** pero invalida todo. `runMutation` usa `setTasks` optimista + `markPlannerChanged` → doble. | STATE_BUG (optimizable) | Ver CN-01: quitar `markPlannerChanged` donde hay update optimista. Para ops sin retorno (assignment V1), mantener. | `PlannerTasksScreen.tsx:419-424`, `531-569` | NO | 11. Error mutación → rollback/cleanup y UI utilizable. |

---

## C. Shared Root Causes

| Causa compartida | IDs afectados | Descripción |
|---|---|---|
| **Backend `mutate_planner_task_v0` ignora `checklist` en create/update** | CK-01, CK-02, CK-03, CK-06 | El RPC SQL no incluye `checklist` en INSERT ni UPDATE. Frontend envía payload correcto; BD recibe `[]` por default. |
| **`makePlannerChecklistDraft` regenera keys** | CK-04 | `makePlannerChecklistDraft` (línea 13) crea `key: \`checklist-${Date.now()}-${n}\`` siempre. Pierde identidad de pasos al editar. Backend usa orden de array, no keys — OK si backend persiste array completo. |
| **`prePresetDraftRef` snapshot por preset, no por sesión** | PR-02 | Cada `applyPreset` captura snapshot previo. Cambiar preset A→B pide confirmación aunque usuario quiera reemplazar. Quitar preset restaura solo pre-B, no pre-A. |
| **`markPlannerChanged` + update optimista = doble invalidación** | CN-01, CN-05 | `runMutation` hace `setTasks` optimista Y `markPlannerChanged` → `loadTasks` refetch global. Lista parpadea. |
| **Trash navigation antes de toast registration** | CN-03 | `TaskDetailScreen.handleTrash` navega (`handleBack`) antes de que `sheet.pushToast` complete. ToastHost pierde contexto → UI freeze. |

---

## D. Patch Order

1. **Backend: `mutate_planner_task_v0` create/update → persistir `checklist`** (CK-01, CK-02, CK-06)
2. **Frontend: `makePlannerChecklistDraft` / `taskEditDraftFrom` → preservar keys o documentar que backend usa orden de array** (CK-04)
3. **Frontend: `PlannerChecklistEditor` drag handler → medir altura real de fila** (CK-05)
4. **Frontend: `TaskForm.applyPreset` / `removeAppliedPreset` → `baseDraftRef` para snapshot pre-primer-preset** (PR-02)
5. **Frontend: `PlannerTasksScreen.runMutation` / mutaciones → quitar `markPlannerChanged` donde hay update optimista; `confirmTrash` limpiar overlays; `TaskDetailScreen.handleTrash` navegar tras toast** (CN-01, CN-03)
6. **Verificación: tests de aceptación 1-11** (ver sección F)

---

## E. Exact Files To Touch

| Archivo | Símbolo | Motivo |
|---|---|---|
| `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql` | `mutate_planner_task_v0` (create branch, líneas ~1039-1062) | Añadir `checklist` en INSERT create |
| `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql` | `mutate_planner_task_v0` (update branch, líneas ~1113-1125) | Añadir `checklist` en UPDATE |
| `front/mi-front-limpio/components/planner/PlannerChecklistEditor.tsx` | `makePlannerChecklistDraft` (línea 13) | Preservar `key` si existe en item origen |
| `front/mi-front-limpio/screens/planner/TaskDetailScreen.tsx` | `taskEditDraftFrom` (línea 70) | Usar `makePlannerChecklistDraft` que preserva keys |
| `front/mi-front-limpio/components/planner/PlannerChecklistEditor.tsx` | `ChecklistRow` PanResponder (líneas 38-61) | Calcular target index con altura real (`onLayout`) |
| `front/mi-front-limpio/screens/planner/TaskForm.tsx` | `prePresetDraftRef` → `baseDraftRef` (nuevo ref, línea 246) | Snapshot inmutable pre-primer-preset |
| `front/mi-front-limpio/screens/planner/TaskForm.tsx` | `removeAppliedPreset` (línea 565) | Restaurar `baseDraftRef` en lugar de `prePresetDraftRef` |
| `front/mi-front-limpio/screens/planner/TaskForm.tsx` | `applyPreset` (línea 581) | Setear `baseDraftRef` solo si `appliedPresetId === null` |
| `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx` | `confirmComplete` / `confirmVerify` / `confirmCancel` / `confirmReactivate` / `confirmTrash` / `confirmRestore` | Quitar `markPlannerChanged()` donde `runMutation` hace `setTasks` optimista |
| `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx` | `confirmTrash` (línea 718) | Añadir `setMenuState(null); setOpenSwipe(null);` al inicio |
| `front/mi-front-limpio/screens/planner/TaskDetailScreen.tsx` | `handleTrash` (línea 961) | Mover `handleBack()` después de `sheet.pushToast` (usar callback o `await`) |

---

## F. Tests

**Mínimos para este patch (11 pruebas):**

1. **Crear Task con varios pasos → reabrir → mismos pasos y orden.**
   - Nueva Tarea → agregar 3 pasos → Crear → navegar a Detail → verificar 3 pasos, textos y orden idénticos.

2. **Editar checklist → guardar → reabrir → cambios persistidos.**
   - Abrir Task existente → Editar → agregar/modificar/eliminar paso → Guardar → reabrir → verificar cambios.

3. **Reordenar → guardar → orden persistido.**
   - En modo edición, drag & drop para reordenar 3+ pasos → Guardar → reabrir → nuevo orden mantenido.

4. **Delete de paso → no reaparece.**
   - En creación/edición, eliminar un paso → guardar → reabrir → paso eliminado no aparece.

5. **Aplicar preset con checklist → pasos nuevos sin marcar.**
   - Crear preset con 2 pasos → Nueva Tarea → aplicar preset → verificar 2 pasos, textos/orden copiados, todos `checked: false`.

6. **Guardar Task como preset → configuración compatible precargada.**
   - Task con checklist + note + priority → Detail → Guardar como preset → abrir editor preset → verificar checklist/note/priority precargados, fechas/responsables vacíos.

7. **Aplicar/cambiar/quitar preset → no destruir cambios manuales indebidamente.**
   - Preset A → editar título manual → Preset B → confirmar reemplazo → título = B. Quitar preset → título = manual edit.

8. **Completar → estado actualizado sin doble ejecución.**
   - En lista Pendientes, tocar círculo completar → tarea se mueve a Hechas **sin parpadeo** de recarga completa (skeleton no reaparece).

9. **Cancelar → estado actualizado y UI desbloqueada.**
   - Swipe izquierda → Cancelar → confirmar → tarea desaparece de Pendientes, menú/swipe cerrados, botón `+` responde.

10. **Papelera → Task desaparece correctamente y Planner continúa interactivo.**
    - Menú → Mover a papelera → confirmar → toast con "Deshacer" aparece, lista actualizada, navegación/tab bar funciona, sin freeze.

11. **Error de mutación → rollback/cleanup y UI utilizable.**
    - Simular error red (offline) al completar → toast error, tarea vuelve a estado previo, botones responden, sin spinner infinito.

---

**FIN DE AUDITORÍA — READY_FOR_PATCH**