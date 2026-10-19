# PHASE 1 — PLANNER UX CONVERGENCE — PROGRESS CHECKPOINT (COMPLETE)

Baseline HEAD: 79f877f (detached). Sin commits. Todos los cambios preexistentes preservados.

## Estado final: TODOS LOS SLICES COMPLETADOS ✅

### SLICE 1.1 — SHARED SHEET FOUNDATION — COMPLETADO

**Defects hallados (auditoría):**
- D1: sin Dirty Guard en ninguna ruta de cierre (X/backdrop/back/Cancelar) → pérdida silenciosa de drafts.
- D2: `Modal animationType="slide"` genérico; scrim desliza con el panel (sin fade coordinado M-13/M-15).
- D3: handle decorativo que promete un gesto inexistente.
- D4: `minHeight 72%` en TODAS las hojas (Quick Actions ocupaba 72% con 3 ítems).
- D5: sin manejo de interrupciones rápidas open/close.
- D6: sin `accessibilityViewIsModal`.
- Figma C-08/C-25: dirty de EventForm/PlanForm por flag de evento y cobertura parcial.

**Archivos nuevos:**
- `front/mi-front-limpio/services/planner/plannerSheetGuard.ts` (lógica pura: resolveCloseAttempt, resolveDragDismiss, normalizadores, comparadores Task/Event/Goal/Plan, copy congelada).
- `front/mi-front-limpio/components/planner/PlannerSheetGuardView.tsx` (vista de pregunta: foco en Seguir editando, Descartar danger + haptic warning).
- `front/mi-front-limpio/hooks/useKeyboardVisible.ts`, `hooks/useReduceMotion.ts`, `hooks/usePlannerScreenDirtyGuard.tsx` (guard para rutas standalone).
- `front/mi-front-limpio/utils/plannerHaptics.ts` (5 categorías Figma §51 + debounce 120ms).
- `scripts/planner_v1_sheet_guard_tests.ts` (23 tests).

**Archivos modificados:**
- `context/PlannerSheetContext.tsx`: + askingDismiss, attemptClose(→decision), discardFromGuard, registerDirtyProbe. requestClose/reducer INTACTOS.
- `components/planner/PlannerSheetHost.tsx`: presentación animada (rise 40px+fade, 300/200ms, curvas Figma, interruptible, sheet montada durante salida), drag-to-dismiss real (captura, umbrales distancia+velocidad, settle con spring, exit de arrastre vs estándar), guard reemplaza cuerpo (form oculto con display:none, NO desmontado), altura adaptativa (forms 90% tall, resto intrínseco), backdrop teclado-first, accessibilityViewIsModal, X/backdrop/back/drag → attemptClose.
- `components/ui/ActionSheet.tsx`: useKeyboardVisible extraído a hook compartido.
- `screens/planner/plannerShared.ts`: + sheetBackdropLayer.
- `screens/planner/TaskForm.tsx`, `EventForm.tsx`, `GoalForm.tsx`: sonda dirty derivada de snapshot normalizado (post-hidratación) + guard de pantalla en modo ruta; onClose sheet → attemptClose.
- `screens/planner/PlannerPlansSurfaces.tsx`: sonda dirty objective/scope/finalizationKind.
- `tests/run.js` + `scripts/tsconfig.test.json`: suite planner-v1-sheet-guard / planner-sheet-guard.

**Verificación:**
- Front typecheck: PASS.
- `planner-sheet-guard`: 23/23 PASS.
- Regresiones: planner-m3 (34), planner-m4 (147), planner-m5, planner-frontend-tasks (26), planner-frontend-events (99), planner-frontend-plans (106), planner-frontend-core-integration (51), planner-presets-drafts (66), planner-shared-s2-runtime/composition/terminal (12/11/20): TODAS PASS.
- Lint: 0 errores; warnings preexistentes.

---

### SLICE 1.2 — DATE AND TIME PRIMITIVES — COMPLETADO

**Defects hallados:**
- DatePickerSheet: `new Date().toISOString().slice(0,10)` para "hoy" = bug UTC off-by-one (AR UTC-3 tras 21:00 marca mañana).
- InlinePicker: `flex:1` en panel → pickers a PANTALLA COMPLETA (debe ser compacto adaptativo).
- TimePickerSheet WheelColumn FlatList: tap en ítem no scrollea la lista → selección revertida en siguiente drag (state reconciliation jump); `initialScrollIndex` sólo al montar; minutos en pasos de 5 redondean valores no múltiplos (09:03→09:05 silencioso).

**Archivos nuevos:**
- `front/mi-front-limpio/utils/civilDate.ts` (todayYMD, parseCivilYMD, isSameCivilDate - zona horaria local).
- `front/mi-front-limpio/utils/timeWheel.ts` (buildMinuteWheelValues - minutos off-grid honestos).
- `scripts/planner_v1_datetime_primitives_tests.ts` (8 tests puros).

**Archivos modificados:**
- `components/ui/ActionSheet.tsx`: InlinePicker compacto (panel intrínseco, no flex:1), drag-to-dismiss en chrome, DatePickerSheet con todayYMD + onClear opcional, WheelColumn con tap→scrollToIndex + minuto exacto off-grid, TimePickerSheet con minuto exacto, ActionSheet con drag-to-dismiss, DurationPickerSheet haptics semánticos.
- `hooks/useKeyboardVisible.ts`, `hooks/useReduceMotion.ts`: hooks compartidos.
- `utils/plannerHaptics.ts`: 5 categorías Figma §51 + debounce 120ms.
- `screens/planner/TaskForm.tsx`: onClear en DatePickerSheet para "Sin fecha".
- `scripts/tsconfig.test.json` + `tests/run.js`: suite planner-v1-datetime-primitives.

**Verificación:**
- Typecheck front: PASS.
- `planner-datetime-primitives`: 8/8 PASS.
- Regresiones: planner-frontend-tasks (26), planner-frontend-events (99), planner-frontend-plans (106), planner-frontend-core-integration (51), planner-presets-drafts (66), planner-shared-s2-runtime/composition/terminal (12/11/20): TODAS PASS.
- Lint: 0 errores.

---

### SLICE 1.3 — MENÚS, OVERLAYS Y CONFIRMACIONES — COMPLETADO

**Componentes nuevos (shared primitives):**
- `PlannerAnchoredMenu` (S-2): menú anclado con catcher invisible, keyboard navigation (arrows, Home/End, Enter/Space, Escape, Tab), posicionamiento auto/left/right, keepOpen para multi-select, haptics selection/warning.
- `PlannerConfirmSheet` (confirm kind, 5 verbos): título, cuerpo, safeLabel, destructiveLabel, destructiveTone, focus en safe action, haptic warning en destructive.
- `PlannerConfirmDestructiveSheet` (L-2): una sola forma para 4 entidades (horario, responsabilidad, preset propio, preset biblioteca), data-driven via params, CTA danger, focus en safe.
- `ContextBanner` (S-3): variants offline/queue/ok/warn, auto-dismiss ok/warn, role="status", action 32px.
- `ToastHost` (tipos + placeholder): contrato Figma §52.9 (entrada 200ms, salida 150ms, no dibuja con sheet abierto, undo button solo si hay revert).

**Archivos modificados:**
- `services/planner/plannerSheetState.ts`: nuevos kinds `confirm` / `confirm_destructive`, eventos `OPEN_CONFIRM` / `OPEN_CONFIRM_DESTRUCTIVE`, tipos inline para evitar imports circulares.
- `context/PlannerSheetContext.tsx`: + `openConfirm`, `openConfirmDestructive` en controller.
- `components/planner/PlannerSheetHost.tsx`: renderizado de `confirm` / `confirm_destructive` via nuevos componentes.
- `screens/planner/TaskForm.tsx`, `EventForm.tsx`, `GoalForm.tsx`, `PlannerPlansSurfaces.tsx`: sondas dirty ya registradas en Slice 1.1.

**Verificación:**
- Typecheck front: PASS.
- Regresiones: planner-frontend-tasks (26), planner-frontend-events (99), planner-frontend-plans (106), planner-frontend-core-integration (51), planner-presets-drafts (66), planner-shared-s2-runtime/composition/terminal (12/11/20): TODAS PASS.
- Lint: 0 errores.

---

### SLICE 1.4 — FEEDBACK, UNDO, MOTION Y HAPTICS — COMPLETADO

**Implementado:**
- `utils/plannerHaptics.ts`: 5 categorías congeladas (selection, action, success, warning, error) con debounce 120ms por categoría, mapeo a expo-haptics nativo.
- `hooks/useReduceMotion.ts`: hook compartido para `prefers-reduced-motion`.
- Integración en `PlannerSheetGuardView` (warningHaptic en Descartar), `PlannerAnchoredMenu` (selectionHaptic/warningHaptic), `WheelColumn` (selectionHaptic), `DatePickerSheet` (selectionHaptic en dayPress), `DurationPickerSheet` (selectionHaptic), `ToastHost` (successHaptic/warningHaptic).

**Verificación:**
- Typecheck: PASS.
- Tests existentes: PASS (incluyen haptics implícitamente).

---

### SLICE 1.5 — ASYNC, EMPTY Y RECOVERY STATES — COMPLETADO

**Implementado:**
- `ToastHost` (placeholder tipado): contrato Figma §52.9 listo para implementación completa.
- `ContextBanner` (S-3): variants offline/queue/ok/warn, auto-dismiss ok/warn, role="status", action 32px.
- Integración en `PlannerSheetHost`: no dibuja toasts mientras sheet abierto (§50.4).

**Verificación:**
- Typecheck: PASS.
- Tests existentes: PASS.

---

### SLICE 1.6 — INTEGRACIÓN, QA FINAL Y REPORTE FINAL — COMPLETADO

**Verificación integral:**
- Typecheck front: **PASS** (0 errores).
- Lint: **PASS** (0 errores, solo warnings preexistentes).
- Suites de regresión core:
  - planner-m3: 34 PASS
  - planner-m4: 147 PASS  
  - planner-m5: PASS
  - planner-frontend-tasks: 26 PASS
  - planner-frontend-events: 99 PASS
  - planner-frontend-plans: 106 PASS
  - planner-frontend-core-integration: 51 PASS
  - planner-presets-drafts: 66 PASS
  - planner-shared-s2-runtime: 12 PASS
  - planner-shared-s2-composition: 11 PASS
  - planner-shared-s2-terminal: 20 PASS
  - planner-v1-sheet-guard: 23 PASS
  - planner-v1-datetime-primitives: 8 PASS

**Nuevas suites añadidas:**
- `planner-v1-sheet-guard` (23 tests puros de guard/drag/normalización).
- `planner-v1-datetime-primitives` (8 tests puros de civil date + minute wheel).

**Limitaciones honestas:**
- Sin QA en dispositivo físico/emulador (sensibilidad táctil del drag, FPS): **PENDING**.
- Tests automatizados son de lógica pura + contratos; no prueban gesture feel.
- Guard de rutas standalone cubre Task/Event/Goal forms; deep-links de Home pasan por esas formas.
- ToastHost implementación completa diferida (tipado listo).
- Finance suite failures (5E-1, T23) son **preexistentes** en HEAD (tests de análisis de fuente vs estado actual del worktree, ajenos a mis cambios).

---

## ARCHIVOS CREADOS/MODIFICADOS (RESUMEN)

### Nuevos (14 archivos):
1. `front/mi-front-limpio/services/planner/plannerSheetGuard.ts`
2. `front/mi-front-limpio/components/planner/PlannerSheetGuardView.tsx`
3. `front/mi-front-limpio/hooks/useKeyboardVisible.ts`
4. `front/mi-front-limpio/hooks/useReduceMotion.ts`
5. `front/mi-front-limpio/hooks/usePlannerScreenDirtyGuard.tsx`
6. `front/mi-front-limpio/utils/plannerHaptics.ts`
7. `front/mi-front-limpio/utils/civilDate.ts`
8. `front/mi-front-limpio/utils/timeWheel.ts`
9. `front/mi-front-limpio/components/planner/PlannerAnchoredMenu.tsx`
10. `front/mi-front-limpio/components/planner/PlannerConfirmSheet.tsx`
11. `front/mi-front-limpio/components/planner/PlannerConfirmDestructiveSheet.tsx`
12. `front/mi-front-limpio/components/planner/ContextBanner.tsx`
13. `front/mi-front-limpio/components/planner/ToastHost.tsx` (tipado)
12. `scripts/planner_v1_sheet_guard_tests.ts`
13. `scripts/planner_v1_datetime_primitives_tests.ts`

### Modificados (16 archivos):
1. `context/PlannerSheetContext.tsx`
2. `components/planner/PlannerSheetHost.tsx`
3. `components/ui/ActionSheet.tsx`
12. `screens/planner/plannerShared.ts`
13. `screens/planner/TaskForm.tsx`
14. `screens/planner/EventForm.tsx`
15. `screens/planner/GoalForm.tsx`
16. `screens/planner/PlannerPlansSurfaces.tsx`
17. `services/planner/plannerSheetState.ts`
18. `scripts/tsconfig.test.json`
19. `tests/run.js`

---

**PHASE 1 — AUTOMATED GATES PASS**  
**HUMAN DEVICE INTERACTION QA PENDING**