# P2.2A-R1 — PRESETS ANDROID RUNTIME STABILIZATION — Reporte

- Worktree: `C:\Users\thega\hpw\mvp-finance-planner`
- Rama: `mvp/finance-planner-integration` — HEAD `51488cd`
- Fecha (UTC): 2026-09-22
- Alcance: solo estabilización runtime de la fundación Presets P2.2A. Sin rediseños, sin P2.2B.

Estado Git: se preservó todo el trabajo dirty/untracked preexistente. No se ejecutó
`reset`, `clean`, `restore`, `stash`, `rebase`, `merge`, cambio de rama, commit ni push.
Archivos tocados por este lote (únicamente superficie Presets):
- `backend/src/domain/planner.presets.domain.js` (untracked, merge autoritativo + espejo `taskToPresetPayload`)
- `front/mi-front-limpio/services/planner/plannerPresetTaskDomain.ts` (untracked, espejo del merge)
- `front/mi-front-limpio/components/planner/presets/PlannerPresetEditorScreen.tsx` (untracked, CTA + teclado)
- `front/mi-front-limpio/components/planner/presets/PlannerPresetLibraryScreen.tsx` (M, refresco al foco)
- `front/mi-front-limpio/components/planner/presets/PlannerPresetDraftsIntegrationRoutes.tsx` (M, recarga detalle + gate de duplicado)
- `tests/planner_presets_p2_2a_r1.test.js` (nuevo, 11 tests R1)

---

## Defecto 1 — PRESET EDITOR CTA HIDDEN

**OBSERVED:** en "Nuevo preset" la acción Guardar quedaba debajo de la bottom navbar
global; en algunos estados solo una parte mínima del CTA era alcanzable.

**ROOT CAUSE:** la bottom navbar de HomePlus es flotante y absoluta
(`useBottomNavigationStyle` / `bottomNavigationStyle` en
`components/ui/BottomNavigation.tsx`: `position: 'absolute'`, `height: 68`,
`bottom: max(inset, 12)`, laterales 16). Cubre el contenido del stack. El footer
del editor reservaba solo `max(insets.bottom, 12)`, sin la altura de la barra.
Además el editor no tenía `KeyboardAvoidingView`: con teclado abierto el footer
podía quedar inaccesible. Evidencia visual: screenshots del emulador muestran la
navbar flotante redondeada superpuesta al contenido.

**FIX:**
- `PlannerPresetEditorScreen.tsx`: raíz `View` → `KeyboardAvoidingView`
  (`padding` en iOS, `height` en Android); el footer ya estaba fuera del
  `ScrollView` (cuerpo scrolleable + acciones fuera, sin padding gigante
  arbitrario).
- `footerPaddingBottom = max(insets.bottom, 12) + bottomNavHeight(68) + spacing[3](12)`,
  derivado del theme, no número mágico. Cubre colapsado/expandido, checklist
  larga y teclado.

**TEST:** `tsc -p tsconfig.json` en `front/mi-front-limpio` PASS (sin errores).
Verificación visual con teclado y pantallas R2 pendiente en app reconstruida
(ver ANDROID RESULT).

**ANDROID RESULT:** PENDIENTE (R2). El APK instalado en el emulador es pre-fix;
el cambio es solo-JS y requiere recargar la app reconstruida para tap-through.

---

## Defecto 2 — HOUSEHOLD PRESETS NOT VISIBLE

**OBSERVED:** Biblioteca mostraba solo "DE HOMEPLUS / 7 presets", sin "DEL HOGAR".

**ROOT CAUSE (determinado por inspección, sin asumir):**
- A (CTA inaccesible) — contribuye: si no se puede guardar, nada aparece.
- B (create falla) — descartado como causa general: el rol activo es Coordinador
  (screenshot) y `planner.templates.manage = coordinator` lo autoriza.
- C (scope mal persistido) — descartado: `PlannerPresetCreateRoute` crea siempre
  `entity_type: 'task'`, `source: 'household'`, adapter `planner.task.template.v1`.
- D (RLS/lista) — descartado como causa general: la migración
  `20260918000001_planner_preset_templates_capability.sql` otorga
  `templates.use/manage`; el DTO (`toPresetDto`) enriquece `scope/editable`.
- E (DTO/clasificación) — descartado: `buildCanonicalPresetGroups` particiona
  task-only por `source` correctamente; Picker, Biblioteca y Quick Rail usan el
  mismo helper.
- F (agrupado) — descartado por lo anterior.
- **G (estado stale) — CONFIRMADO como causa principal reproducible por código:**
  `PlannerPresetLibraryScreen` solo cargaba al montar (`useEffect [loadFresh]`).
  Crear → `navigation.goBack()` vuelve a una Biblioteca ya montada: sin recarga,
  el preset recién creado no aparece hasta reload manual. Mismo stale en el
  Detalle tras Editar (cargaba solo al montar).

**FIX:**
- Biblioteca: recarga única (`refresh()`, con datos preservados, sin spinner) en
  transición desenfocado → enfocado, solo si ya hay datos. Sin polling, sin loops.
- Detalle (`PlannerPresetDetailRoute`): recarga única al recuperar foco tras Editar.
- Sin cambios al modelo de scopes (congelado).

**TEST:** `tests/planner_presets_p2_2a_r1.test.js` R1.11 (create Household → list
incluye, scope household) PASS; suite P2.2A P1/P11/P14 PASS (ver batería).

**ANDROID RESULT:** PENDIENTE (R3–R7). Lógica verificada; tap-through con reload
real pendiente en app reconstruida.

---

## Defecto 3 — PRESET APPLY IS NOT DETERMINISTIC (+ TYPE SWITCHING)

**OBSERVED:** alternar presets a veces actualizaba "Tipo" y a veces no.

**ROOT CAUSE:** `applyPresetToTaskDraft` (backend y espejo frontend) escribía
condicionalmente: `if (preset.template_key)`, `if (preset.category)`,
`if (preset.note)`, `if (duration !== null)`, `requires_evidence` condicional.
Caso exacto: preset General (`template_key: null`, `category: 'General'`) SÍ
sobreescribía `category` pero NO `template_key`; y `TaskForm` prioriza
`template_key` al resolver el Tipo → el Tipo quedaba clavado en Compras/Pagos.
Igual patrón para nota vacía, duración null y prioridad normal: el valor previo
sobrevivía. No era un bug por campo sino el merge no-autoritativo.

**FIX (mínimo, en el merge, no parches por campo):**
- `backend/src/domain/planner.presets.domain.js` y espejo
  `services/planner/plannerPresetTaskDomain.ts`: escritura incondicional de
  TODOS los estables (`title`, `note` + sync `description` si el draft la trae,
  `template_key`, `category`, `priority`, `estimated_duration_minutes`,
  `checklist`, `requires_verification`, `requires_evidence`). Vacío/null limpia.
  Contexto (assignee, fecha, hora, Plan, estado) sigue preservado por copia:
  nunca se escribe aquí.
- `taskToPresetPayload` backend: `requires_evidence: false` fijo → lee
  `Boolean(source.requires_evidence)` como el espejo frontend (las Tasks actuales
  no exponen el campo, resulta `false`; elimina la deriva).
- `TaskForm.applyPresetPayloadToForm` no requirió cambios: ya mapea todo el
  merge de forma autoritativa (título, descripción, tipo, categoría, checklist
  fresh, duración incl. null, verificación).

**TEST:**
- Nuevo `tests/planner_presets_p2_2a_r1.test.js`: R1.1 (A→B→A idéntico), R1.2
  (tipo incl. limpieza a General), R1.3 (prioridad incl. vuelta a normal), R1.4
  (nota vacía limpia), R1.5 (duración null limpia), R1.6 (checklist vacía limpia),
  R1.7-9 (contexto sobrevive A→B→A), R1.10 (unchecked sin leaks). 11/11 PASS.
- Regresión existente P2.2A (P6/P7/P8/P9): 14/14 PASS.

**ANDROID RESULT:** PENDIENTE (R8–R11). Determinismo probado en dominio puro;
tap-through A→B→A en Nueva tarea pendiente en app reconstruida.

---

## Defecto 4 — CHECKLIST END-TO-END

**OBSERVED:** no se podía confirmar la verdad del checklist en el Task creado.

**Cadena auditada:**
Preset payload (`checklist: [{text}]`, sin checked por contrato §23)
→ `presetTaskPayloadFromPreset` (normaliza, orden preserved)
→ `applyPresetToTaskDraft` (clona `{text, checked:false}`, ahora autoritativo)
→ `TaskForm` state (fresh `checked:false`)
→ `submit` (`checklist` si no vacío)
→ backend `validateNullableChecklist` (exige `{text, checked:boolean}`)
→ persistencia (`planner_tasks.checklist`, migración `20260914000001`)
→ lectura (`getTaskById` → `task.checklist`)
→ `TaskDetailScreen` líneas ~1333–1348: **ya renderiza sección CHECKLIST con
  toggle** vía mutación canónica existente `updatePlannerTask` (reutilizada,
  con revert optimista). **No se requirió cambio en Task Detail** (límite P2.2B
  respetado; no hay segundo motor de checklist).

**FIX:** ningún cambio de código necesario más allá del merge autoritativo del
defecto 3 (que garantiza que el checklist del preset aplicado llega al form,
incluso vaciándolo cuando el preset no trae). Verdad garantizada: texto+orden
se preservan; `checked` siempre inicia `false`; mutar un Task no filtra a otro.

**TEST:** R1.6 + R1.10 PASS; P9 existente PASS.

**ANDROID RESULT:** PENDIENTE (R12–R13). Cadena verificada estáticamente;
crear Task con assignee explícito válido y abrir el Task para ver el checklist,
pendiente en app reconstruida.

---

## Defecto 5 — SAVE TASK AS PRESET

**Verificación:** `TaskDetailScreen` ⋯ → "Guardar como preset" → `handleSaveAsPreset`
→ `taskToPresetPayload(task)` (solo estables; assignee/fecha/hora/Plan/estado
fuera por construcción) → `navigate('PlannerPresetCreate', { presetPrefill })` →
`PlannerPresetCreateRoute` usa `presetPrefill` como `initialPayload` síncrono al
montar (sin race) → commit crea `household`. Ruta correcta; **sin cambios**.

**TEST:** R1.13 (contextuales eliminados, checklist solo labels) PASS; P10
existente PASS.

**ANDROID RESULT:** PENDIENTE (R14–R15).

## Defecto 6 — HOMEPLUS PRESET CONTRACT

**Verificación:** HomePlus `editable: false` (DTO + `presetCanonicalScope`);
Detalle no ofrece Editar en origen HomePlus; duplicar va por ruta server-side
`duplicate-to-household` (copia nueva editable, sin live sync).

**Bug real encontrado y corregido:** el editor inicializa estado UNA vez al montar
(`useState`). La ruta de duplicado renderizaba el editor inmediatamente con payload
null y la carga async del original llegaba tarde sin actualizar el form →
duplicar mostraba un form vacío. **FIX:** `PlannerPresetCreateRoute` espera
(`"Preparando copia..."`) cuando hay `duplicateFromPresetId` sin original y con
`safeError` aún nulo, de modo que el editor monta ya con el payload correcto.

**TEST:** R1.12 (duplicado visible en hogar, editable) PASS; P4/P5 existentes PASS.

**ANDROID RESULT:** PENDIENTE (R16).

---

## PICKER / QUICK RAIL / CONFLICTOS

- **Picker** (`PlannerPresetPickerSheet`): solo USO (DEL HOGAR primero, DE HOMEPLUS
  después, sin Edit/Delete/Create). Carga propia al abrirse (`visible` → `load()`).
  Sin cambios; verificado por lectura.
- **Quick Rail** (`PresetQuickRail` + `selectQuickPresets`): determinístico,
  household-first, acotado. Sin cambios; P13 existente PASS.
- **Conflictos** (`detectApplyConflict` + Alert "¿Aplicar este preset? / Va a
  reemplazar los detalles que ya completaste / CANCELAR-APLICAR"): se conserva.
  Draft vacío/default → sin confirmación; estable con valores → confirmación;
  solo-contexto (miembro/fecha/hora) → sin conflicto. Verificado por lectura +
  P8 existente PASS. Tras APLICAR, el preset es autoritativo (defecto 3).

---

## Matriz de reporte requerida

| Ítem | Estado | Evidencia |
|---|---|---|
| PRESET EDITOR CTA | FIX listo, visual pendiente | tsc PASS; tap-through R2 pendiente en rebuild |
| HOUSEHOLD VISIBILITY | FIX listo, runtime pendiente | R1.11 + P11/P14 PASS; R3–R6 pendientes en rebuild |
| HOUSEHOLD CRUD | FIX listo (foco), runtime pendiente | P1/P2/P3 PASS; R7 pendiente en rebuild |
| PRESET APPLY DETERMINISM | FIX + tests PASS | R1.1 (A→B→A) PASS |
| TYPE SWITCHING | FIX + test PASS | R1.2 PASS (causa template_key vs category) |
| CHECKLIST PROPAGATION | Cadena verificada, sin cambio extra | R1.6/R1.10 + P9 PASS |
| SAVE TASK AS PRESET | Sin cambio (ruta correcta) | R1.13 + P10 PASS |
| HOMEPLUS READ-ONLY | Sin cambio (contrato ok) | P4 PASS |
| DUPLICATE TO HOUSEHOLD | FIX gate + tests PASS | R1.12 + P5 PASS |
| PICKER | Sin cambio, verificado | Lectura + carga al abrir |
| QUICK RAIL | Sin cambio, verificado | P13 PASS |
| CONFLICT HANDLING | Sin cambio, verificado | P8 PASS |
| LIGHT | Sin cambio visual | Sin regresión estática |
| DARK | Sin cambio visual | Sin regresión estática |
| STATIC | **PASS** | tsc front PASS; node suites PASS; `git diff --check` limpio |
| ANDROID | **PENDIENTE** | Baseline: app lanza, sesión Coordinador, navbar flotante confirmada; tap-through R1–R16 requiere app reconstruida (ver abajo) |

Batería ejecutada (todo PASS):
- `node tests/planner_presets_p2_2a_r1.test.js` → 11/11
- `node tests/planner_presets_p2_2a.test.js` → 14/14
- `node tests/planner_e11_focal.test.js` → 19/19
- `node tests/planner_responsibilities_p2_1.test.js` → 30/30
- `node tests/planner_plans_v1_lifecycle_pure.test.js` → PASS
- `npx tsc --noEmit --pretty false -p tsconfig.json` (front) → limpio
- `node --check` backend domain/service/controller + nuevo test → OK
- `git diff --check` → limpio (solo warnings CRLF preexistentes)

Evidencia Android disponible en esta sesión:
- Emulador `emulator-5554` conectado (`qemu-system-x86_64` activo).
- App instalada `com.anonymous.homeplus` lanza correctamente; screenshot confirma
  Planner/Tareas con sesión Coordinador (autorizado para `templates.manage`).
- Screenshots confirman la navbar inferior flotante (causa del defecto 1).
- El tap en ⋯ superior no abrió menú visible en el build pre-fix; no se insistió:
  el build instalado NO contiene estos fixes (cambios solo-JS pendientes de rebuild).

Aceptación Android pendiente (requiere rebuild + reload, pasos exactos R1–R16 de la
misión con assignee explícito válido para no contaminar con el bug de asignación
conocido y fuera de alcance; "La configuración de asignación no es válida" se
documenta como fuera de R1 si aparece).

Fuera de alcance observado en este lote: nada nuevo. No se tocó asignación,
recurrencia, Task Detail (más allá de verificar el checklist existente), date/people
rails, calendar, planes, motion ni performance.

---

## Veredicto

**P2.2A-R1: PENDING** (STATIC PASS, ANDROID PENDING)

- Estático y tests: PASS completo.
- Runtime Android real (R1–R16 tap-through en app reconstruida): PENDIENTE de
  ejecución manual. Los fixes están implementados en el lote mínimo y cubiertos
  por tests focalizados; queda la verificación táctil R2–R16 y el reload de
  persistencia R6 en el emulador tras rebuild.
