# HOMePLUS Planner P2.2A — Presets Foundation implementation report

Date: 2026-09-18
Branch: `mvp/finance-planner-integration`
Worktree: `C:\Users\thega\hpw\mvp-finance-planner`

## 1. CURRENT FOUNDATION (audited, reused — nothing invented in parallel)

The M11.4A foundation was reused as the single Preset subsystem:

- Tables `planner_presets`, `planner_preset_revisions`, `planner_drafts` + lane-owned RPCs (`planner_create_preset_v1`, `planner_update_preset_metadata_v1`, `planner_start_preset_revision_v1`, `planner_update_preset_revision_draft_v1`, `planner_publish_preset_revision_v1`, `planner_trash_preset_v1`, `planner_restore_preset_v1`, drafts autosave/trash/restore) and RLS (`planner_assert_preset_visible` / `_mutable`).
- Backend: `planner.presets-drafts.contract.js`, `planner.presets-drafts.adapters.js`, `planner.presets.service.js`, `planner.presets.controller.js`, routes `planner.presets-drafts.js`.
- Frontend: `services/plannerPresets.ts`, `services/planner/plannerPresetContracts.ts`, `plannerPresetAdapters.ts`, library/detail/trash screens, `PlannerPresetDraftsIntegrationRoutes.tsx`, `plannerPresetLibraryViewState.ts`, `plannerPresetDetailViewState.ts`, navigation wiring (`Planner ⋯ → Biblioteca de presets` already existed in `PlannerScreen`).
- Prior session work found in the tree and kept: task adapter stable fields (priority / estimated_duration_minutes / requires_verification / requires_evidence / checklist labels-only, payload v2 additive), pure backend domain `backend/src/domain/planner.presets.domain.js` (untracked, now wired through the service DTO), and `duplicateHomeplusToHousehold` in the service (unwired — now exposed).

Internal audit classification:
- REUSE: everything in the list above; P1 shared components (`AppInput`, `AppButton`, `ActionSheet`, `FilterChip`, `Toggle`, `DurationPickerSheet`, `AppText`, `useAppTheme`); `plannerStyles`.
- ADAPT: `PlannerPresetLibraryScreen` (canonical hierarchy), `plannerPresetDetailViewState` (duplicate rule), `PlannerPresetDetailScreen` (labels), `PlannerPresetDraftsIntegrationRoutes` (new editor wiring), `TaskForm` (picker + rail + apply), `TaskDetailScreen` (save-as-preset action), `seed-homeplus-qa.js`, `services/plannerPresets.ts`, `types/plannerPresetsDrafts.ts`, `navigation/types.ts`.
- COMPATIBILITY ONLY: legacy `PlannerPresetFormScreen` (kept for non-task edit route), `plannerPresetAdapters.ts` old lane apply path (event/plan), personal-source presets, `planner_drafts` surface.
- RETIRE FROM CANONICAL UI: kind tabs (Todos/Tareas/Eventos/Planes), Personal section, event/plan preset creation paths, disabled "Guardar como preset (próximamente)" placeholder in TaskForm (replaced by the real Task Detail action).
- REAL GAP (implemented): duplicate route/controller, frontend canonical task-preset domain (TS), P2.2A editor, picker, quick rail, TaskForm apply integration, TaskDetail save-as-preset, seed presets, `planner.templates.*` SQL capability grants, PGRST201 embed fix.

## 2. SCHEMA REUSED

`planner_presets` already represents the frozen contract natively:

- `entity_type in ('task','event','plan')` → canonical `kind = 'task'`.
- `source in ('homeplus','personal','household')` → canonical `scope = homeplus | household` (personal = compatibility only).
- HomePlus rows: `owner_person_id is null and household_id is null` (scope-shape constraint enforces it).
- All frozen stable fields live in the validated `planner.template_payload` v2 payload (title, note, template_key, category, priority, estimated_duration_minutes, checklist labels/order, requires_verification, requires_evidence). Versioned via `planner_preset_revisions` + `active_revision_id`.

Conclusion: NO new table, NO new column was needed for the frozen contract.

## 3. MIGRATION

`supabase/migrations/20260918000001_planner_preset_templates_capability.sql` — the ONLY migration of this stage, purely additive (single `create or replace function`):

- Adds `planner.templates.use` → coordinator, adult, adolescent, child, senior; and `planner.templates.manage` → coordinator only — mirroring the authoritative JS matrix in `backend/src/lib/plannerCapabilities.js`.
- Why (real gap, runtime-proven): M11.4A's RLS policies consult these capabilities through `planner_current_actor_has_capability`, but the M11.1A version of the function fell through to `else false` for them. Household presets were therefore INVISIBLE through RLS even when the backend capability projection granted them (before fix: API returned 0 household rows; after fix: seeded rows + full CRUD work).
- No table/data changes, no reset, no history rewrite. Applied to the local principal DB (`supabase_db_HomePlus`, 127.0.0.1:56222) by executing the migration content itself; verified end-to-end by the runtime smoke (section 21).

Also fixed (no migration needed): `SupabasePresetRepository.list/get` used an ambiguous embed (`planner_preset_revisions(*)`) → PostgREST PGRST201 → every list/get 500'd at runtime. Now uses `planner_preset_revisions!planner_preset_revisions_preset_id_fkey(*)`. Runtime-proven (500 → 200).

## 4. LEGACY COMPATIBILITY

- Legacy Event/Plan/Personal preset rows are PRESERVED physically. The list API still returns them; `planner_drafts` is untouched; trash/restore surface unchanged.
- Canonical P2.2A UX (library, picker, quick rail, `selectQuickPresets`, `buildCanonicalPresetGroups`) exposes ONLY task presets in scopes homeplus|household; personal/event/plan rows are filtered out of the canonical view but never deleted.
- The legacy lane form (`PlannerPresetFormScreen`) remains for the non-task edit route only (compatibility surface).
- Lane test updated deliberately: `scripts/planner_v1_presets_drafts_frontend_tests.ts` — HomePlus interaction now expects `canDuplicate === true` ("read-only but duplicable") because P2.2A §14 makes "Duplicar al hogar" a first-class action; this is the frozen product truth, not a test-weakening.
- `requires_evidence` is stored by the preset contract but is a NO-OP at application time until the Task model grows the field (the Task model has no such column today); documented in the domain modules (backend + frontend mirror).

## 5. HOMEPLUS PRESETS

- Read-only for users: RPC/RLS/service reject edit/trash (`forbidden`, proven at runtime: PATCH → 403).
- Usable: `Usar` (detail) applies the canonical payload into the Task create form.
- Duplicable: `Duplicar al hogar` → editor prefilled → server-side duplicate route.
- Detail actions: exactly `Usar` and `Duplicar al hogar` (no Edit, no Delete) — enforced by `plannerPresetDetailViewState` + backend.
- DTO: `scope='homeplus'` → `editable=false`.

## 6. HOUSEHOLD PRESETS

- Editable, CRUD-complete, household-isolated (RLS + service scope checks; P11 test + runtime).
- `scope='household'` → `editable=true` when the current household matches and capability permits.

## 7. CRUD

- Create: canonical editor → `POST /api/planner/presets` (source=household, kind=task, adapter `planner.task.template.v1`). Runtime: 201.
- Edit: rename via `PATCH` metadata + payload changes via the canonical revision cycle (start draft → update draft → publish). Payload-equal edits are a no-op (skip the cycle).
- Delete: trash (30-day retention, restore window) — safest CURRENT lifecycle, reused as-is. Deleting a preset CANNOT alter already-created Tasks: there is no FK from `planner_tasks` to presets and application is copy-on-use (P3 test + smoke).
- Read: list/get with canonical DTO enrichment (`kind`, `scope`, `editable` — additive over the raw row).

## 8. DUPLICATE

- New endpoint: `POST /api/planner/presets/:id/duplicate-to-household` (capability `planner.templates.manage`, mutation headers, idempotency).
- Server-side copy of the active revision payload; caller MAY pass `name`/`payload` overrides (user edits in the editor before confirming) — revalidated through the published adapter contract.
- Result: a NEW editable household preset; no live sync with the original (P5 test + runtime 201 + GET payload verified).

## 9. LIBRARY

`PlannerPresetLibraryScreen` adapted to the frozen hierarchy:

```
<  Biblioteca de presets                        +
DEL HOGAR
  Preset del hogar                        >
--------------------------------------------
DE HOMEPLUS                     7 presets  ^
  Preso A                                 >
Papelera (n)
```

- Household content FIRST, HomePlus SECOND (Finance Categories visual donor: custom first, system second), ONE continuous hierarchy, flat rows (no card-per-preset).
- NO tabs (Todos/Tareas/Eventos/Planes removed from the canonical UI; helper functions retained for lane compatibility).
- NO Personal section.
- Entry unchanged: `Planner ⋯ → Biblioteca de presets`.

## 10. PICKER

New `PlannerPresetPickerSheet` (lightweight, ActionSheet):

- Purpose: USE a preset. NO edit/delete/create inside.
- Sections `DEL HOGAR` / `DE HOMEPLUS`, tap → `onSelect(preset)` → close.
- Self-loads task presets; used by TaskForm and available to the quick rail's "Ver todos".

## 11. EDITOR

New `PlannerPresetEditorScreen` — ONE reusable editor for:

- new Household preset; edit Household preset; duplicate HomePlus preset (prefilled); save Task as preset (prefilled).

Layout per the frozen target: `¿Qué tarea prepara? [título]`, Prioridad chips (Baja/Normal/Alta), `Más detalles ˅` (Nota, Checklist, Duración estimada, Tipo, Pedir revisión, Requerir evidencia), `Cancelar | Guardar preset`. NO assignee/date/time/Plan/status fields. Preset name = task title (single source of truth). P1 components + `useAppTheme` (light/dark tokens).

## 12. QUICK RAIL CONTRACT

New `PresetQuickRail` component + `selectQuickPresets(presets, limit)`:

```
Presets                            Ver todos
[Compras] [Factura] [Llamar] [Medicamentos] →
```

- Single horizontal row; deterministic small set: household presets preferred, HomePlus fills remaining slots (created_at asc, id tiebreak).
- "Ver todos" → Picker. P2.2A wires it minimally into TaskForm (create mode) to prove the contract end-to-end; P2.2B owns the final "Nueva tarea" placement. No Task Create redesign was done.

## 13. APPLY MERGE

Canonical pure helper `applyPresetToTaskDraft(currentDraft, preset)`:

- Implemented ONCE in `backend/src/domain/planner.presets.domain.js` and mirrored in `front/mi-front-limpio/services/planner/plannerPresetTaskDomain.ts` (lock-step pure TS mirror, same semantics).
- MAY populate stable fields: title, note, type (template_key+category), priority, estimated_duration_minutes, checklist, requires_verification, requires_evidence (no-op on Task model today).
- TaskForm consumes THE helper (not a local reimplementation).

## 14. CONTEXT PRESERVATION

The merge never writes assignee/assignment/date/time/Plan keys; context keys survive by construction (P7 test: assignee `Yo`, date `Hoy`, time, goal preserved while preset fields applied). The TaskDetail→TaskForm "Usar" path passes only the serializable canonical payload.

## 15. CONFLICT HANDLING

`detectApplyConflict` / `hasMeaningfulStableDraftValues`:

- Empty/default stable draft → apply immediately.
- Meaningful stable values that would be replaced → ONE compact confirmation: `¿Aplicar este preset? Va a reemplazar los detalles que ya completaste.` [Cancelar | Aplicar]. No field-by-field merge UI. Context alone never triggers the conflict (P8 tests).

## 16. CHECKLIST CLONE

- Preset checklist template stores label/order ONLY (`{ text }`); the adapter strips any completion state at storage time.
- Application creates fresh incomplete items (`{ text, checked: false }`); mutation of one task's checklist never leaks into the preset or other applications (P9 test).

## 17. SAVE TASK AS PRESET

- Task Detail `⋯ → Guardar como preset` (hidden for trashed tasks).
- `taskToPresetPayload(task)` strips assignee/date/time/Plan/fulfillment/status/completion/Responsibility (P10 test).
- Navigates to `PlannerPresetCreate` with a serializable `presetPrefill` → editor prefilled → saves a Household preset. Minimal integration only — no Task Detail redesign.

## 18. SEED

`backend/scripts/seed-homeplus-qa.js` extended (idempotent, no reset):

- 7 built-in HomePlus task presets (Hacer una compra, Pagar una factura, Llamar / pedir turno, Comprar medicamentos, Llevar algo al service, Preparar mochila / bolso, Resolver un trámite) with deterministic UUIDs → upsert (rerun-safe, no duplicates).
- 2 Household QA presets (Compra semanal del hogar QA, Revisión de pagos del hogar QA) with deterministic per-household UUIDs.
- Cleanup now also removes QA household-scoped presets (HomePlus globals untouched).
- New focused mode `--presets-only` (no cleanup; refreshes preset rows only).
- Runtime evidence: two consecutive `--presets-only` runs → still exactly 7 homeplus/task + 2 household/task rows.
- Known PRE-EXISTING blocker (out of P2.2A scope, NOT introduced here): full-seed rerun fails during finance cleanup with `finance_credit_card_installment_plans → finance_transactions` FK order violation (cleanup predates that table). No fix attempted (scope rule: no broad fixes of unrelated failures).

## 19. LIGHT

All new/edited surfaces consume the P1 theme tokens through `useAppTheme` (light values). Verified by construction + full `tsc` + production Android bundle export. Manual visual pass on device: PENDING (see 21).

## 20. DARK

Same token system (`darkColors` resolution in `AppThemeContext`); the new editor/picker/rail/library read tones dynamically, so dark mode is covered by the same construction. Manual visual pass on device: PENDING (see 21).

## 21. STATIC / RUNTIME / ANDROID

STATIC (all green):

- `npx tsc --noEmit --pretty false` (front app project): OK.
- `node tests/planner_presets_p2_2a.test.js`: 14/14 (P1–P14).
- `node tests/planner_e11_focal.test.js`: 19/19.
- `node tests/planner_responsibilities_p2_1.test.js`: PASS.
- `node tests/planner_plans_v1_lifecycle_pure.test.js`: PASS.
- Lane JS suite `scripts/planner_v1_presets_drafts_frontend_tests.js`: 66/66.
- Backend `node --check` on all changed files: OK.
- `git diff --check`: clean (only repo-wide pre-existing LF/CRLF warnings).
- `npx expo export --platform android`: full production Hermes bundle OK (6.6MB hbc) — the whole app graph including the new preset surfaces compiles.
- PRE-EXISTING (not fixed, out of scope): `npm run test:planner`'s `compile-frontend-tests` step fails in this environment (missing Node/RN type declarations for the scripts test project — dozens of unrelated files). The lane JS suite was executed directly instead.

RUNTIME (backend, real local stack: Supabase 127.0.0.1:56221 + backend :3003 + QA user Sofía):

- API smoke ALL CHECKS PASSED: list (DTO kind/scope/editable correct; 7 HomePlus visible, `editable=false`), 2 seeded household presets visible (`editable=true`), create household 201, rename 200, duplicate HomePlus→Household 201 with payload copied (verified via GET), PATCH on HomePlus → 403 forbidden, trash 200 + list excludes trashed row.
- Seed applied to local DB (idempotent).
- RLS capability migration proven: household presets invisible before, fully functional after.

ANDROID:

- Emulator present (`emulator-5554`, app `com.anonymous.homeplus` installed) BUT the running Metro/dev client serves a DIFFERENT checkout (`Desktop\HomePlus`), and this repo has no E2E UI harness (no Detox/Maestro) to drive login-gated flows blind.
- Therefore on-device UI verification (visual light/dark, taps through Biblioteca/Picker/Editor) is PENDING, honestly. Everything below the UI layer is runtime-proven on the real local stack.

## 22. P2.2A OVERALL: PASS

(con la única salvedad explícita: verificación visual/maniobra en dispositivo marcada PENDING — toda la cadena backend, dominio, seed, API y bundling está verificada en runtime local; todos los gates estáticos en verde.)

STOP after P2.2A — P2.2B (Task Experience / Nueva tarea redesign) NOT started, per instruction.
