# PLANNER V1 PLAN STRUCTURE P2A MILESTONE EDITOR REPORT

## Base

- Branch: `planner-v1-plans-reconciliation`
- Initial HEAD: `9361987`
- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\plans-reconciliation`
- Scope: checkpoint del editor parcial de milestones sobre Plan graph Current

## P2A State

| Capacidad | Estado | Evidencia |
|---|---|---|
| Crear milestone | FUNCIONAL | `addMilestoneToDraft` + `buildMilestoneChangeset` + `enqueuePlannerPlanStructureChangeset` |
| Editar milestone | FUNCIONAL | `updateMilestoneInDraft` modifica draft local y persiste al guardar |
| Eliminar milestone | FUNCIONAL | `removeMilestoneFromDraft`; persistidos salen como `trash` |
| Reordenar milestone | FUNCIONAL | `moveMilestoneUp` / `moveMilestoneDown`; `sortOrder` normalizado |
| Persistencia por changeset | FUNCIONAL | `buildMilestoneChangeset` genera `add` / `update` / `trash` / `reorder` |
| Single dispatch de structure | VALIDADO | `createPlanWriteSingleFlightGate()` bloquea doble submit |
| Activacion del Plan | FUNCIONAL | Detail vuelve a cargar y conserva `projectPlanDetail` / readiness Current |
| Duplicate lifecycle/adapter execution | TODAVIA OBSERVADO | Sigue fuera del alcance P2A; queda para `REC-0` |
| Completar milestone | AUSENTE | No hay mutation ni UI |
| Reabrir milestone | AUSENTE | No hay mutation ni UI |
| Task links | AUSENTES | No hay vinculacion Plan -> Task desde este editor |
| Event links | AUSENTES | No hay vinculacion Plan -> Event desde este editor |

## Implemented Foundation

- Archivo nuevo: `front/mi-front-limpio/services/planner/planMilestoneEditor.ts`
- Screen modificada: `front/mi-front-limpio/screens/planner/PlannerPlanStructureEditScreen.tsx`
- Surface modificada: `front/mi-front-limpio/screens/planner/PlannerPlansSurfaces.tsx`
- Suite nueva: `scripts/planner_v1_p2a_milestone_editor_tests.ts`
- Registro de suite: `tests/run.js`
- Compile target: `scripts/tsconfig.test.json`

## Draft Model

- `MilestoneEditorDraft = { planId, baseVersion, originalSnapshot, entries }`
- `MilestoneEditorDraftEntry = { localId, title, description?, completionMode, sortOrder }`
- `localId` nuevos: `ms:N`
- `localId` persistidos: UUID del milestone
- `originalSnapshot` se conserva para diff minimo contra backend

## Mutation Path

UI
-> `PlannerPlanStructureEditScreen.handleSave`
-> `buildMilestoneChangeset(editorDraft)`
-> `createPlanStructureWriteIntent({ expectedPlanVersion })`
-> `enqueuePlannerPlanStructureChangeset(remoteRequest, intent)`
-> Current Reliability runtime
-> backend `/api/planner/plans/:id/structure`
-> `apply_planner_plan_structure_changeset_rpc`
-> invalidacion/refetch del Detail al volver
-> resultado visible: contador de hitos y readiness actualizados

## Runtime Behavior

- Noop: si no hay cambios, no hace POST y vuelve al Detail.
- Version conflict: conserva draft y muestra mensaje de recarga.
- Uncertain/error: conserva draft y mantiene editor abierto.
- Single-flight: un `operationKey` por `planId:baseVersion`.

## Tests

Ejecutados sobre este checkpoint:

- `npm run typecheck` -> PASS
- `npm run test:frontend` -> PASS
- `npm run test:planner` -> PASS
- `node tests/run.js planner-plan-duplicate-dispatch` -> PASS
- `node tests/run.js planner-p1-structure` -> PASS
- `node tests/run.js planner-p2a-milestone-editor` -> PASS
- `git diff --check` -> sin whitespace errors; solo warnings CRLF de Git en Windows

Cobertura especifica P2A:

- `planner-p2a-milestone-editor`: 17 tests, 51 assertions, 0 failures
- `planner-plan-duplicate-dispatch`: 14 tests, 0 failures
- `planner-p1-structure`: 44 assertions, 0 failures

## Exclusions

Fuera de P2A:

- completar milestone
- reabrir milestone
- Task links
- Event links
- Measurements
- Manual Conditions
- Requirements
- dependencias entre milestones
- drag and drop
- archive / trash / restore de Plan
- recuperacion del Detail V1 completo

## Final Status

`PLANNER_PLAN_STRUCTURE_P2A_FUNCTIONAL_FOUNDATION_PARTIAL`

## Git Status At Checkpoint

```text
branch: planner-v1-plans-reconciliation
base: 9361987
working tree: p2a files only
```

## Result

P2A queda preservado como fundacion parcial util.
No debe tratarse como Planner final ni como direccion principal del port V1-first.
