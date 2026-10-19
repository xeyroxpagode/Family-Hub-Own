# TASKS + RESPONSIBILITIES — CURRENT TRUTH V1

**Worktree:** `C:\Users\thega\Desktop\HomePlus-worktrees\planner-current`
**HEAD:** `79f877f152072e759c11511bd91807273c4e1c13` (detached)
**Modo:** READ-ONLY forensic pass. Ningún archivo del repo fue modificado salvo este documento.
**DB:** Supabase local `127.0.0.1:56222/postgres`. Todas las consultas se ejecutaron bajo `BEGIN; SET LOCAL default_transaction_read_only = on; … ROLLBACK;`.

---

## 1. EXECUTIVE FACTUAL SUMMARY

### 1.1 Lo que realmente existe

1. **`planner_tasks` es la Task root única y viva.** 39 columnas. No existe segunda raíz de Task. La tabla legacy `tasks` (no-planner, 12 columnas) existe en DB con **0 filas** y **0 consumidores** → `DEAD`.
2. **`planner_task_fulfillments` es la autoridad real de completion/verification.** `planner_tasks.status` es una **proyección derivada** escrita por `planner_refresh_task_v0_projection()` (`20260722010000_m11_1a_task_fulfillment_foundation.sql:1403`, redefinida en `20260722020000_m11_1b_task_fulfillment_operations.sql:118`).
3. **La capa V1 (`planner_task_assignment_configs` + `planner_task_assignees` + `planner_task_fulfillments`) está completamente cableada en DB, backend, routes y frontend**, pero **el modo `each_person` no tiene ningún control de UI** y **no hay ninguna suite cableada que lo ejercite**.
4. **Responsibilities es una sub-entidad persistente con generación perezosa de Tasks.** `planner_responsibilities` (regla) → `materialize_planner_responsibility_v1()` → `planner_tasks` + `planner_responsibility_occurrences` (ledger). No hay cron, no hay scheduler, no hay worker.
5. **La materialización se dispara como efecto secundario de CUALQUIER lectura/mutación de Tasks y de cualquier operación de Responsibilities** (10 call-sites). No está aislada.

### 1.2 Los cinco hechos de mayor riesgo (evidenciados)

| # | Hecho | Etiqueta |
|---|---|---|
| F1 | **Evidence es DEAD por privilegio.** `planner_task_evidence_attempts` tiene sólo `SELECT` para `authenticated` (`20260914000001…:126-127`). El backend escribe con cliente usuario (`planner.context.service.js:9` → `createSupabaseForToken`), no con service-role. El `INSERT` de `submitTaskEvidence` (`planner.tasks.service.js:1473-1486`) **falla en runtime**. Además la rama `requires_verification` (`:1489-1497`) hace `UPDATE planner_task_fulfillments SET status='awaiting_verification'` **sin `completed_by_*`**, lo que viola `planner_task_fulfillment_state_actor_check`. Y `:1515` invoca `planner_refresh_task_v0_projection`, revocado para `authenticated`. **Triple bloqueo.** | STATIC CONFIRMED (SQL) + RUNTIME READ-ONLY VERIFIED (grants/ACL) |
| F2 | **`task.archive` está denegado para los 6 roles** en la matriz JS (`plannerCapabilities.js:107,147,187,227,267,307` = `false`) y la función SQL `planner_current_actor_has_capability` **no tiene case para `task.archive`** → `else false`. Verificado en runtime: `planner_current_actor_has_capability(household,'task.archive') = false` en los 3 households muestreados. ⇒ **`archiveTaskV1` / `unarchiveTaskV1` son UNREACHABLE (403 `planner_forbidden`)** salvo override manual en `households.config.permissions`. | STATIC CONFIRMED + RUNTIME READ-ONLY VERIFIED |
| F3 | **Task Personal está explícitamente rechazado** en dos capas: `planner.tasks.controller.js:60-66` y `planner.tasks.service.js:642-648` → `400 personal_tasks_not_supported`. No hay columna `visibility`/`scope` en `planner_tasks`. `task.create_personal` existe como capability (default `true` para coordinator/adult/adolescent/senior) pero **ningún endpoint la consulta**. `planner.search.service.js:67-73` fuerza `scopeKind:'household'` para toda Task. | STATIC CONFIRMED |
| F4 | **`archived_at` se filtra sólo en `listTasks`** (`planner.tasks.service.js:486`). NO se filtra en `summary` (`planner.summary.service.js:311`), NI en `attention`, NI en `calendar` (`planner.calendar.service.js:212`), NI en `search` (`planner.search.service.js:44` `isActiveTask` no mira `archived_at`), NI en `trash`. ⇒ **una Task archivada desaparece de la lista pero sigue contando en Home Summary, sigue apareciendo en Calendar, sigue siendo buscable y sigue viva en Attention.** | STATIC CONFIRMED |
| F5 | **Attention y Summary usan autoridades DISTINTAS para "awaiting verification".** Summary lee `planner_tasks.status='awaiting_verification'` (`planner.summary.service.js:42,467`). Attention lee `planner_task_fulfillments.status='awaiting_verification'` (`planner.attention.service.js:126-134`). Con `each_person` una Task puede tener `status='pending'` (por `partially_completed`) y aun así generar attention items. | STATIC CONFIRMED |

### 1.3 Empty DB foundation

`planner_responsibilities` = **0 filas**, `planner_responsibility_members` = **0**, `planner_responsibility_occurrences` = **0**, `planner_task_assignees` = **0**, `planner_task_evidence_attempts` = **0**, `planner_tasks` = **3** (1 pending, 1 completed, 1 cancelled; 0 asignadas, 0 con goal, 0 con origin, 0 archived, 1 cancelled). `planner_plans` = **0**, `planner_plan_requirements` = **0**, `planner_presets` = **0**. **Responsibilities y Evidence son `EMPTY DB FOUNDATION`: código completo, cero datos, ninguna suite cableada.**

---

## 2. PREFLIGHT / EVIDENCE

### 2.1 Concurrency gate

```
CHECK 1  (t0)        git rev-parse HEAD → 79f877f152072e759c11511bd91807273c4e1c13
                     git status --short → 18 M + 13 ??
                     git diff --cached --name-only → (vacío)
CHECK 2  (t0+60s)   HEAD → 79f877f (idéntico)
                     git status --short → conjunto idéntico (18 M + 13 ??)
CHECK 3  (t0+~35min) HEAD → 79f877f (idéntico)
                     git status --short → conjunto idéntico (18 M + 13 ??)
                     git diff --name-only → conjunto idéntico
CHECK 4  (cierre)      HEAD → 79f877f (idéntico)
                     git status --short → 18 M (idénticos) + 15 ??
                     ⇒ NOVEDAD: apareció 1 untracked nuevo, ver nota abajo
                     git diff --name-only → conjunto idéntico (17 archivos, mismos stats)
                     git diff --cached --name-only → (vacío)
                     git diff --check → limpio
```

**RESULTADO: `NO CONCURRENT MUTATION BLOCKER` para el alcance Tasks + Responsibilities.**

**NOVEDAD DETECTADA EN EL CHECK 4 (declarada, no bloqueante):**

| Campo | Valor |
|---|---|
| **FILES CHANGING** | `EVENTS_SCHEDULES_CURRENT_TRUTH_V1.md` (**untracked, nuevo**). `CreationTime 20:41:36`, `LastWriteTime 20:51:03`. No existía en CHECK 1/2/3 |
| **HEAD** | `79f877f152072e759c11511bd91807273c4e1c13` en los 4 checks |
| **STATUS BEFORE** (CHECK 3) | 18 `M` + 13 `??` |
| **STATUS AFTER** (CHECK 4) | 18 `M` (mismos archivos, mismos `diff --stat`) + 15 `??` |

**Valoración por evidencia:**
1. **Ningún archivo TRACKED cambió.** Los 18 `M` son los mismos archivos con las mismas estadísticas de diff que en el baseline. En particular `backend/src/services/planner.tasks.service.js` sigue con `18 +-` y el mismo contenido de diff que se inspeccionó.
2. El archivo nuevo es **documentación** de un lane paralelo (**Events/Schedules**), de 207 855 bytes, y **no toca ninguna fuente de Tasks ni de Responsibilities**.
3. **No se exploró, no se leyó, no se usó** como evidencia. No aparece en ninguna sección de este documento.
4. Se creó **17 segundos antes** que este documento (`TASKS_RESPONSIBILITIES_CURRENT_TRUTH_V1.md`, `CreationTime 20:41:53`), lo que sugiere dos auditorías concurrentes del mismo worktree.

**Conclusión:** el CURRENT de Tasks + Responsibilities de este documento **no se construyó sobre un árbol móvil en su alcance**, porque ningún artefacto de su alcance fue mutado durante la auditoría. La novedad queda registrada y delimitada. Si la revisión humana requiere que el gate sea estrictamente "cero cambios de cualquier tipo", este documento debe leerse como **CONDITIONAL PASS** y no como PASS pleno.

No se ejecutó `git add/commit/push/reset/clean/stash/switch/checkout/merge/rebase`. No se tocó `homecloud-current` ni ningún otro worktree. No se intentó corregir, stash, copiar ni congelar el archivo ajeno.

### 2.2 Estado preexistente (CURRENT para esta auditoría)

18 modificados + 13 untracked, todos de la reconstrucción de **Plans**. Cambio relevante para Tasks:
- `backend/src/services/planner.tasks.service.js` (+10/-8): importa `applyPlanReadScope` de `plannerGoalWriteAuthority.js` (untracked) y lo aplica a la validación de `query.goal_id` en `listTasks` (`:495-503`). Sustituye el filtro explícito `.eq('household_id', …)` por un scope helper. **No altera la semántica de Task.**
- `front/mi-front-limpio/screens/planner/TaskForm.tsx` — modificado (el subagente reportó el bloque multi-assignee ya muerto en el estado actual).
- `backend/src/services/planner.summary.service.js` — modificado.

**Los cambios de Plans se tratan como CURRENT.**

### 2.3 Verificación DB

| Consulta | Resultado |
|---|---|
| Puerto 56222 alcanzable | `True` |
| `psql` en PATH | No → usado `C:\Program Files\PostgreSQL\18\bin\psql.exe` |
| Migraciones aplicadas | Todas las de `supabase/migrations` presentes en el catálogo local (39 columnas de `planner_tasks`, 23 de `planner_task_fulfillments`, 16 de evidence, 23 de responsibilities, 5 members, 11 occurrences) |
| Modo | `BEGIN; SET LOCAL default_transaction_read_only = on; … ROLLBACK;` en todas las consultas |

### 2.4 Precedentes verificados / refutados

| Precedente (§4 del encargo) | Veredicto | Evidencia |
|---|---|---|
| `planner_tasks` es la Task root | **CONFIRMADO** | Única tabla con writes de Task en producción |
| Tasks household-only | **CONFIRMADO** | Sin columna de scope; rechazo explícito de `personal`; `toVisibilityInput` fuerza household |
| statuses `pending/awaiting_verification/completed/verified/cancelled` | **CONFIRMADO**, idéntico en DB / backend / frontend | CHECK `planner_tasks_status_check`; `TASK_STATUSES`; `PlannerTaskStatus` |
| `planner_task_assignment_configs` existe | **CONFIRMADO** | 8 columnas, 3 filas |
| `planner_task_assignees` existe | **CONFIRMADO** | 8 columnas, 0 filas |
| `planner_task_fulfillments` existe | **CONFIRMADO** | 23 columnas, 3 filas |
| `planner_task_evidence_attempts` existe | **CONFIRMADO** | 16 columnas, 0 filas |
| `goal_id` vincula Task → Plan | **CONFIRMADO** | FK `planner_tasks_goal_id_fkey` → `planner_goals(id)` `ON DELETE SET NULL` |
| `responsibility_id` vincula Task → Responsibility | **CONFIRMADO** | FK `ON DELETE RESTRICT`, 0 filas |
| `planner_responsibilities` / `_members` / `_occurrences` | **CONFIRMADO**, los 3, todos vacíos | `20260916000001_planner_responsibilities_p2_1.sql` |
| Personal Tasks explícitamente rechazado | **CONFIRMADO** | `personal_tasks_not_supported`, 2 capas |
| assignment/verification con >1 autoridad | **CONFIRMADO y peor de lo esperado** | Ver §26 |

---

## 3. DOMAIN INVENTORY (PART A)

### 3.1 TABLES

| Nombre | Archivo/migración | Propósito | LIVE CONSUMER? | RUNTIME DATA | STATUS |
|---|---|---|---|---|---|
| `planner_tasks` | `202606230001_planner_mvp.sql:6` + 9 aditivas | Task root | Sí | 3 filas | **LIVE CURRENT** |
| `planner_task_assignment_configs` | `20260722010000…:375` | Semántica de assignment (1:1 Task) | Sí | 3 filas | **LIVE CURRENT** |
| `planner_task_assignees` | `20260722010000…:403` | Miembros asignados (N:Task, soft-revoke) | Sí | 0 filas | **LIVE CURRENT** |
| `planner_task_fulfillments` | `20260722010000…:433` | Obligaciones de cumplimiento | Sí | 3 filas | **LIVE CURRENT** — autoridad de estado |
| `planner_task_evidence_attempts` | `20260914000001…:73` | Historial de evidencia | Lectura sí, escritura **NO** | 0 filas | **DEAD (grant-blocked)** |
| `planner_responsibilities` | `20260916000001…:5` | Regla recurrente persistente | Sí | 0 filas | **EMPTY DB FOUNDATION** |
| `planner_responsibility_members` | `20260916000001…:38` | Miembros de la responsabilidad | Sí | 0 filas | **EMPTY DB FOUNDATION** |
| `planner_responsibility_occurrences` | `20260916000001…:48` | Ledger de ocurrencias | Sí | 0 filas | **EMPTY DB FOUNDATION** |
| `tasks` (legacy, no-planner) | `202606210004_tasks.sql` | Tabla Task pre-planner | **No** | 0 filas | **DEAD** |
| `inventory_restock_requests` | `202607080001…:102` (`planner_task_id` FK) | Origen Inventory → Task | Sí (escritor) | 0 filas | **LEGACY ACTIVE** |
| `planner_plan_requirements` | `20260722040000_m11_3a…` | Links blandos Plan→externo | No para Task | 0 filas | **EMPTY DB FOUNDATION** |
| `planner_plans` | `20260722040000_m11_3a…` | Root Plan paralela | Lectores stale | 0 filas | **DEAD / EMPTY** |
| `planner_presets` | `20260722050000_m11_4a…` | Presets de Task (`entity_type='task'`) | Sí | 0 filas | **EMPTY DB FOUNDATION** |
| `planner_drafts` | `20260722050000_m11_4a…` | Borradores de Task | Sí | 0 filas | **EMPTY DB FOUNDATION** |
| `planner_activity_log` | `20260713005000…` | Feed Activity transversal | Sí, **pero Tasks no lo escriben** | 1 fila (no-task) | **LIVE pero sin Tasks** |
| `audit_events` | shared | Auditoría de Task | Sí | 5 filas task | **LIVE CURRENT** |

**VIEWS:** ninguna vista en `public` que mencione task o responsibility (`information_schema.views` → 0). `planner_tasks` **no es una vista**: es tabla física con proyección mantenida por trigger/RPC.

### 3.2 FUNCTIONS / RPCs

| Función | Migración | SECURITY | Execute grants | Consumer | Status |
|---|---|---|---|---|---|
| `mutate_planner_task_v0(household,task,action,ver,payload,req,mut,idem,op,hash)` | `20260722020000:900` | DEFINER | `authenticated`, `service_role` | `planner.tasks.service.js:610` | **LIVE** — actions `create/update/complete/verify/cancel/reactivate/trash/restore` |
| `complete_planner_task_with_audit(...)` | `20260722010000:1490` | DEFINER | `authenticated`, `service_role` | vía `mutate_planner_task_v0` | **LIVE** |
| `verify_planner_task_fulfillment_with_audit(...)` | `20260722010000:1643` | DEFINER | `authenticated`, `service_role` | vía `mutate_planner_task_v0` | **LIVE** |
| `update_planner_task_assignment_v1(...)` | `20260722020000:310` | DEFINER | `authenticated`, `service_role` | `planner.tasks.service.js:1154` | **LIVE** |
| `claim_planner_task_v1(...)` | `20260722020000:520` | DEFINER | `authenticated`, `service_role` | `planner.tasks.service.js:1189` | **LIVE** |
| `mutate_planner_task_fulfillment_v1(...)` | `20260722020000:629` | DEFINER | `authenticated`, `service_role` | `planner.tasks.service.js:1346` | **LIVE** — 6 actions |
| `release_planner_task_v1(...)` | `20260914000002:26` | DEFINER | `authenticated`, `service_role` | `planner.tasks.service.js:1225` | **LIVE** |
| `archive_planner_task_v1(...)` | `20260914000002:168` | DEFINER | `authenticated`, `service_role` | `planner.tasks.service.js:1255` | **UNREACHABLE** — `task.archive`=false en JS y SQL |
| `unarchive_planner_task_v1(...)` | `20260914000002:272` | DEFINER | `authenticated`, `service_role` | `planner.tasks.service.js:1285` | **UNREACHABLE** — ídem |
| `materialize_planner_responsibility_v1(...)` | `20260916000001:132` | DEFINER | `PUBLIC`(default), `anon`, `authenticated`, `service_role` | `planner.responsibilities.service.js:124` | **LIVE** — auto-guardado por `is_active_household_member` + `task.create_household` |
| `planner_refresh_task_v0_projection(uuid)` | `20260722020000:118` | DEFINER | `service_role` sólo | RPCs internos + `planner.tasks.service.js:1515` (**grant-blocked**) | **LIVE** (interno) |
| `planner_task_aggregate_v1(uuid)` | `20260722020000:78` | DEFINER | `service_role` sólo | `planner_refresh_task_v0_projection` | **LIVE** (interno) |
| `planner_create_current_task_fulfillments(uuid)` | `20260722010000:1073` | DEFINER | `service_role` | trigger bootstrap + `materialize_…` | **LIVE** (interno) |
| `planner_assert_task_fulfillment_invariants(uuid)` | `20260722010000:538` | DEFINER | `service_role` | constraint triggers | **LIVE** (interno) |
| `planner_bootstrap_task_foundation()` | `20260722010000:1151` | DEFINER | `service_role` | `trg_planner_tasks_bootstrap_foundation` | **LIVE** (trigger) |
| `planner_sync_task_foundation_from_v0()` | `20260722010000:1183` | DEFINER | `service_role` | `trg_planner_tasks_sync_foundation_from_v0` | **LIVE** (trigger) |
| `planner_guard_task_fulfillment_projection()` | `20260722010000:1261` | DEFINER | `service_role` | `trg_planner_tasks_guard_fulfillment_projection` | **LIVE** (trigger) |
| `planner_responsibility_touch_version()` | `20260916000001:86` | INVOKER | `PUBLIC` | trigger BEFORE UPDATE | **LIVE** (trigger) |
| `planner_m11_1a_backfill_report()` | `20260722010000:874` | DEFINER | `service_role` | diagnóstico | **DEAD** (nadie lo llama) |
| `planner_task_checklist_is_valid(jsonb)` | `20260914000001:30` | INVOKER | `PUBLIC` | CHECK constraint | **LIVE** |
| `planner_task_v1_assert_payload_hash(...)` | `20260722020000:237` | DEFINER | `service_role` | RPCs V1 | **LIVE** (interno) |
| `planner_task_v1_complete_idempotency(...)` | `20260722020000:272` | DEFINER | `service_role` | RPCs V1 | **LIVE** (interno) |
| `planner_task_audit_v1(...)` | `20260722020000:195` | DEFINER | `service_role` | RPCs V1 | **LIVE** (interno) |
| `planner_enforce_task_fulfillment_invariants()` / `…_row_…()` | `20260722010000:651,668` | DEFINER | `service_role` | constraint triggers | **LIVE** (trigger) |
| `planner_current_actor_has_capability(household,cap)` | `20260722010000:14` | DEFINER | `authenticated`, `service_role` | RLS + RPCs | **LIVE** |
| `planner_plan_external_link_dto` / `planner_plan_validate_external_link` | `20260722040000…` | — | — | mencionan `planner_tasks` sólo en texto | **DEAD** para Task |

### 3.3 TRIGGERS (no internos)

| Tabla | Trigger | Evento | Función |
|---|---|---|---|
| `planner_tasks` | `trg_planner_tasks_updated_at` | BEFORE UPDATE | `set_updated_at()` |
| `planner_tasks` | `trg_planner_tasks_increment_version` | BEFORE UPDATE | `increment_planner_version()` |
| `planner_tasks` | `trg_planner_tasks_bootstrap_foundation` | AFTER INSERT | `planner_bootstrap_task_foundation()` |
| `planner_tasks` | `trg_planner_tasks_guard_fulfillment_projection` | BEFORE UPDATE | `planner_guard_task_fulfillment_projection()` |
| `planner_tasks` | `trg_planner_tasks_sync_foundation_from_v0` | AFTER UPDATE OF `assigned_to_member_id, requires_verification, status` | `planner_sync_task_foundation_from_v0()` |
| `planner_tasks` | `planner_task_row_foundation_shape_constraint` | AFTER INSERT/UPDATE, DEFERRABLE INITIALLY DEFERRED | `planner_enforce_task_row_foundation_invariants()` |
| `planner_task_assignment_configs` | `trg_…_updated_at`, `trg_…_increment_version`, `planner_task_config_shape_constraint` (deferred) | — | |
| `planner_task_assignees` | `trg_…_updated_at`, `trg_…_increment_version`, `planner_task_assignee_shape_constraint` (deferred) | — | |
| `planner_task_fulfillments` | `trg_…_updated_at`, `trg_…_increment_version`, `planner_task_fulfillment_shape_constraint` (deferred) | — | |
| `planner_task_evidence_attempts` | `trg_…_updated_at`, `trg_…_increment_version` | — | |
| `planner_responsibilities` | `planner_responsibility_touch_version` | BEFORE UPDATE | bump `updated_at` + `version+1` |

**Nota:** `planner_responsibility_members` y `planner_responsibility_occurrences` **NO tienen ningún trigger**.

### 3.4 ROUTES / CONTROLLERS / SERVICES / LIBS

| Capa | Artefacto | Archivo |
|---|---|---|
| Router | `planner.js` (V0, 145 líneas: 11 rutas Task + 11 Responsibility) | `backend/src/routes/planner.js:39-49,76-102` |
| Router | `planner.v1.js` (sólo Plans) | `backend/src/routes/planner.v1.js` |
| Controller | `planner.tasks.controller.js` (482 líneas, 21 exports) | |
| Controller | `planner.responsibilities.controller.js` (40 líneas, 9 exports) | |
| Service | `planner.tasks.service.js` (1615 líneas, 26 exports) | |
| Service | `planner.responsibilities.service.js` (221 líneas, 7 exports) | |
| Domain | `planner.responsibilities.domain.js` (110 líneas) — calendario + rotación | |
| Lib | `plannerCapabilities.js` (matriz JS) | |
| Lib | `plannerIdempotencyAdapter.js`, `plannerMutationContracts.js` | |
| Lib | `plannerGoalWriteAuthority.js` (untracked, lane Plans) — `applyPlanReadScope` | |
| Readers | `planner.summary.service.js`, `planner.attention.service.js`, `planner.search.service.js`, `planner.calendar.service.js`, `planner.trash.service.js`, `planner.activity.service.js` | |

### 3.5 FRONTEND

| Tipo | Artefacto |
|---|---|
| Screen | `PlannerTasksScreen.tsx` (**no es ruta**: componente en el tab `tasks` de `PlannerScreen.tsx:757-772`) |
| Screen | `TaskDetailScreen.tsx` (ruta `TaskDetail`, deep link `tasks/:entityId`) |
| Screen | `TaskForm.tsx` (create+edit; sheet embebida + rutas `CreateTask`/`EditTask`) |
| Screen | `ResponsibilitiesScreen.tsx`, `ResponsibilityFormScreen.tsx`, `ResponsibilityDetailScreen.tsx` (3 rutas reales) |
| Screen | `PlannerTrashScreen.tsx` |
| Component | `EvidencePhotoPicker.tsx`, `QuickActionsMenu.tsx`, `PlannerSheetHost.tsx`, `PlannerCalendarComponents.tsx` |
| Client | `services/plannerTasks.ts` (28 funciones), `services/plannerResponsibilities.ts` (7), `services/plannerEvidence.ts` (3), `services/plannerTrash.ts`, `services/plannerSummary.ts` |
| Client DEAD | `services/tasks.ts` (cliente Supabase legacy, tabla `tasks`, statuses `pendiente/en_progreso/completada`) |
| Types | `services/plannerTasks.ts:18-23,128-142`, `types/plannerTaskV1.ts`, `services/plannerResponsibilities.ts:4-29` |
| Adapters | `adapters/planner/plannerTaskAdapters.ts` (`projectPlannerTask` LIVE; el resto DEAD) |

### 3.6 Inventory gaps

- **No hay tipo de Evidence** en `front/mi-front-limpio/types/` — la vista consume `any` (`TaskDetailScreen.tsx:447-449,1355`).
- `types/database.ts` no contiene ninguna tabla `planner_*`.
- No hay cliente Supabase directo a Tasks; todo pasa por REST backend (a diferencia de otros módulos).

---

## 4. TASK ROOT SCHEMA — `planner_tasks` (39 columnas)

Fuente: `information_schema.columns` + `pg_constraint` sobre la DB local (**RUNTIME READ-ONLY VERIFIED**) + migraciones.

| # | COLUMN | TYPE | NULL | DEFAULT | CHECK | FK / ON DELETE | WRITER | READER | UI | NON-NULL (3 filas) | SEMÁNTICA |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `id` | uuid | NO | `gen_random_uuid()` | — | PK | RPCs | todos | sí | 3 | identidad |
| 2 | `household_id` | uuid | NO | — | — | `households(id)` **CASCADE** | RPCs | todos | no | 3 | scope obligatorio; no hay scope personal |
| 3 | `title` | text | NO | — | `length(trim(title))>0` | — | `mutate_planner_task_v0` | todos | sí | 3 | |
| 4 | `description` | text | YES | — | — | — | idem | todos | sí | 3 | |
| 5 | `status` | text | NO | `'pending'` | `IN ('pending','completed','awaiting_verification','verified','cancelled')` | — | **sólo `planner_refresh_task_v0_projection`** + `mutate_planner_task_v0` (cancel/reactivate/trash) | todos | sí | 3 | **PROYECCIÓN**, no autoridad |
| 6 | `priority` | text | NO | `'normal'` | `IN ('low','normal','high')` | — | create/update | summary, calendar, search | sí | 3 | normalizado desde `low/medium/high/critical` |
| 7 | `template_key` | text | YES | — | `IN ('cleaning','shopping','pets','medication','studies','payments')` ó NULL | — | create/update | — | sí (form) | 0 | |
| 8 | `category` | text | YES | — | — | — | create/update | summary | sí | 0 | texto libre |
| 9 | `due_date` | date | YES | — | — | — | create/update | list, summary, calendar, search, attention | sí | 3 | |
| 10 | `due_time` | time | YES | — | — | — | create/update (exige `due_date`) | calendar | sí | 0 | |
| 11 | `requires_verification` | boolean | NO | `false` | — | — | create/update | `complete_*` RPCs, evidence, TaskDetail | sí | 0 | decide `completed` vs `awaiting_verification` |
| 12 | `created_by_person_id` | uuid | NO | — | — | `people(id)` **CASCADE** | derivado | search/attention visibility | no | 3 | |
| 13 | `assigned_to_member_id` | uuid | YES | — | — | `household_members(id)` SET NULL + compuesta `(id,household_id)` **RESTRICT** | **proyección** | list, TaskDetail, summary, home one-tap | sí | 0 | **PROYECCIÓN**: sólo se llena si hay exactamente 1 assignee activo |
| 14 | `completed_by_person_id` | uuid | YES | — | — | `people(id)` SET NULL | proyección | TaskDetail | sí | 1 | |
| 15 | `verified_by_person_id` | uuid | YES | — | — | `people(id)` SET NULL | proyección | TaskDetail | sí | 0 | |
| 16 | `completed_at` | timestamptz | YES | — | — | — | proyección | TaskDetail, responsibilities `isResolved` | sí | 1 | |
| 17 | `verified_at` | timestamptz | YES | — | — | — | proyección | responsibilities `isResolved` | no | 0 | |
| 18 | `created_at` | timestamptz | NO | `now()` | — | — | insert | orden/list | no | 3 | |
| 19 | `updated_at` | timestamptz | NO | `now()` | — | — | `set_updated_at()` | sort | no | 3 | |
| 20 | `origin_module` | text | YES | — | `IN ('inventory','assets','finance','geni','automation','planner')` ó NULL | — | `createTask` (backend valida 5 valores, **no `planner`**), `materialize_…` (`'planner'`), `inventory.service.js:550` | — | no | 0 | metadata, **sin FK** |
| 21 | `origin_entity_type` | text | YES | — | `length(trim)>0` ó NULL | — | idem | — | no | 0 | texto libre |
| 22 | `origin_entity_id` | uuid | YES | — | — | **NINGUNA FK** | idem | `inventory.service.js:482-485` | no | 0 | |
| 23 | `origin_reason` | text | YES | — | `length(trim)>0` ó NULL | — | idem | idem | no | 0 | |
| 24 | `goal_id` | uuid | YES | — | — | `planner_goals(id)` **SET NULL** | create/update | listTasks `?goal_id`, `calculateProgressFromTasks`, PlanDetail | sí | 0 | **único vínculo Task→Plan** |
| 25 | `created_by_member_id` | uuid | YES | — | actor-pair shape | `household_members(id)` SET NULL + `(id,person_id,household_id)` **RESTRICT** | derivado | **define "own"** | no | 3 | base de `task.*_own` |
| 26 | `completed_by_member_id` | uuid | YES | — | actor-pair shape | SET NULL + compuesta RESTRICT | proyección | TaskDetail | sí | 1 | |
| 27 | `verified_by_member_id` | uuid | YES | — | actor-pair shape | SET NULL + compuesta RESTRICT | proyección | TaskDetail | sí | 0 | |
| 28 | `version` | integer | NO | `1` | `>= 1` | — | `increment_planner_version()` (prohibido al cliente: `planner.tasks.service.js:36`) | todos (`If-Match`) | no | 3 | |
| 29 | `trashed_at` | timestamptz | YES | — | — (guard en trigger) | — | `mutate_planner_task_v0` trash/restore | list, summary, attention, search, calendar, trash | sí | 0 | |
| 30 | `trashed_by_member_id` | uuid | YES | — | — | SET NULL + compuesta RESTRICT | ídem | trash screen | no | 0 | |
| 31 | `cancelled_at` | timestamptz | YES | — | ver constraint de ciclo de vida | — | `mutate_planner_task_v0` cancel | TaskDetail | sí | 1 | |
| 32 | `cancelled_by_member_id` | uuid | YES | — | ídem | SET NULL + compuesta RESTRICT | ídem | — | no | 1 | |
| 33 | `cancelled_reason` | text | YES | — | ídem | — | `cancelTask` (body `reason`) | — | no | 0 | |
| 34 | `cancelled_from_status` | text | YES | — | `IN ('pending','completed','awaiting_verification','verified')` cuando `status='cancelled'` | — | `mutate_planner_task_v0` | `reactivate` | no | 1 | |
| 35 | `estimated_duration_minutes` | integer | YES | — | `1..10080` ó NULL | — | create/update | — | sí (form) | 0 | "load projections only, no timer" |
| 36 | `checklist` | jsonb | NO | `'[]'` | `planner_task_checklist_is_valid()` | — | create/update (PATCH) | TaskDetail toggle | sí | 0 | `{text,checked}[]` |
| 37 | `archived_at` | timestamptz | YES | — | — | — | `archive_planner_task_v1` (**UNREACHABLE**) | **sólo** `listTasks:486` | sí | 0 | ortogonal a status |
| 38 | `responsibility_id` | uuid | YES | — | shape con #39 | `planner_responsibilities(id)` **RESTRICT** | `materialize_…` | `PlannerTasksScreen:478,491`, `TaskDetailScreen:1250` | sí | 0 | **origen / template source** |
| 39 | `responsibility_occurrence_sequence` | bigint | YES | — | `>0` y coherente con #38 | — | `materialize_…` | — | no | 0 | |

### 4.1 Constraints compuestos (resumen)

- `planner_tasks_actor_pair_shape_check` — creator member+person NO NULL; completed/verified member ⇒ person NO NULL.
- `planner_tasks_cancellation_lifecycle_shape_check` — `status='cancelled'` ⇒ `cancelled_at` + `cancelled_from_status` NOT NULL; `status<>'cancelled'` ⇒ los 4 campos NULL.
- `planner_tasks_responsibility_origin_shape` — (38 NULL ⇔ 39 NULL) ∧ (38,39 ambos NOT NULL ∧ 39>0).
- `planner_tasks_id_household_id_key` UNIQUE — habilita los FK compuestos.

### 4.2 Índices

`planner_tasks_household_idx`, `_household_status_idx`, `_household_due_date_idx`, `_assigned_to_member_idx`, `_template_key_idx`, `idx_planner_tasks_origin`, `idx_planner_tasks_origin_active`, `idx_planner_tasks_goal`, `planner_tasks_household_archived_idx` (partial `archived_at IS NOT NULL`), `planner_tasks_responsibility_occurrence_unique` (partial `responsibility_id IS NOT NULL`).

**Ausentes:** no hay índice compuesto `(household_id, status, due_date)`, ni sobre `requires_verification`, ni GIN sobre `checklist`.

---

## 5. TASK LIFECYCLE (PART C)

### 5.1 C1 — Todos los estados

| Estado | DB CHECK | Backend produce | Frontend entiende | UI alcanzable | Terminal | Efectos |
|---|---|---|---|---|---|---|
| `pending` | ✔ | ✔ (`mutate_planner_task_v0 create`; proyección desde fulfillment) | ✔ | ✔ | no | — |
| `completed` | ✔ | ✔ (`complete_*` con `requires_verification=false`) | ✔ | ✔ | sí (no) | audit `task.completed` |
| `awaiting_verification` | ✔ | ✔ (`complete_*` con `requires_verification=true`) | ✔ | ✔ | no | audit `task.completed` |
| `verified` | ✔ | ✔ (`verify*`) | ✔ | ✔ | sí | audit `task.verified` |
| `cancelled` | ✔ | ✔ (`cancel`) | ✔ | oculto del list por defecto | sí (reactivable) | fulfillments `inactive_at` |

**No hay ningún estado `correction_requested` a nivel Task.** Ese valor existe **sólo** en `planner_task_fulfillments.status`. `planner_refresh_task_v0_projection` mapea `correction_requested → 'pending'` (`20260722020000:144`), por lo que una Task con corrección pedida **reaparece como `pending`**.

**Contradicción frontend:** `TaskDetailScreen.tsx:424` define `statusColors.correction_requested`, clave que **no existe** en `PlannerTaskStatus` → clave muerta.

### 5.2 C2 — Matriz de transiciones

| Transición | FROM → TO | Endpoint | Controller | Servicio | RPC | Capability | RLS/guard | Fields changed | Assignment | Fulfillment | Activity | Defecto conocido |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CREATE | ∅ → `pending` | `POST /api/planner/tasks` | `createTask:54` | `createTask:639` | `mutate_planner_task_v0('create')` | `task.create_household` | INSERT policy: creator=current member/person, `status='pending'`, trashed NULL | 15 campos | bootstrap trigger crea config+assignee+fulfillment | 1 shared `pending` | `audit_events task.created` | `visibility:'personal'` → 400 `personal_tasks_not_supported` |
| EDIT | cualquier no-trashed | `PATCH /api/planner/tasks/:id` | `updateTask:87` | `updateTask:802` | `mutate_planner_task_v0('update')` | `task.edit_own` \| `task.edit_any` | UPDATE policy + `planner_guard_task_fulfillment_projection` | title/desc/priority/template/category/due/assigned/requires_verification/goal/checklist/duration | si cambia `assigned_to_member_id` ⇒ trigger re-proyecta | **se RETIRAN y recrean** si cambia assignment | `task.updated` | `buildTaskPatch` **rechaza `status`** (`:724-726`) |
| ASSIGN (V1) | cualquier no-trashed, no-cancelled | `PUT /v1/tasks/:id/assignment` | `updateTaskAssignmentV1:234` | `:1123` | `update_planner_task_assignment_v1` | `edit_own`\|`edit_any` | config version lock | config + assignees | **revoked_at + INSERT nuevos** | **retired_at + INSERT nuevos** | `task.assignment.changed` / `.history_transition` / `.legacy_resolved` | exige `confirmHistoricalTransition` si hay historial |
| CLAIM | `anyone` → `members` | `POST /v1/tasks/:id/claim` | `claimTaskV1:245` | `:1177` | `claim_planner_task_v1` | `complete_assigned` | config version | config→`members/shared_once` | +1 assignee | se mantiene | `task.claimed` | 409 `already_claimed` |
| RELEASE | `members` → `anyone` | `POST /v1/tasks/:id/release` | `releaseTaskV1:255` | `:1213` | `release_planner_task_v1` | `complete_assigned` | — | config→`anyone/shared_once` | revoke del actor | se mantiene | `task.released` | — |
| COMPLETE (V0) | `pending` → `completed`/`awaiting_verification` | `POST /tasks/:id/complete` | `completeTask:144` | `completeTask:839` | `…('complete')` → `complete_planner_task_with_audit` | `complete_assigned`/`_unassigned`/`_any` | anti-spoof `p_actor_*` | fulfillment + **proyección** Task | — | 1 fila | `task.completed` | selecciona la 1ª fulfillment `shared` (`20260722010000:1581-1586`) |
| COMPLETE (V1) | `pending` → idem | `POST /v1/tasks/:id/fulfillments/:fid/complete` | `:298` | `mutateTaskFulfillmentV1:1327` | `mutate_planner_task_fulfillment_v1('complete')` | ídem | version de fulfillment | **1 fila** | — | 1 fila | `task.fulfillment.completed` | — |
| VERIFY (V0) | `awaiting_verification` → `verified` | `POST /tasks/:id/verify` | `verifyTask:305` | `verifyTask:852` | `…('verify')` → `verify_planner_task_fulfillment_with_audit` | `task.verify` | — | fulfillment `verified` | — | 1 fila (la más antigua) | `task.verified` | 409 `self_verification` / `invalid_state` |
| VERIFY (V1) | `awaiting_verification` → `verified` | `POST /v1/…/verify` | `:299` | `:1327` | `…('verify')` | `task.verify` | — | 1 fila | — | 1 fila | `task.fulfillment.verified` | 409 `self_verification_not_allowed` |
| REQUEST_CORRECTION | `awaiting_verification` → `correction_requested` | `POST /v1/…/request-correction` | `:300` | `:1327` | `…('request_correction')` | `task.verify` | — | 1 fila + `correction_comment` | — | 1 fila | `task.fulfillment.correction_requested` | **UI DEAD**: cliente importado, nunca invocado |
| RESUBMIT | `correction_requested` → `awaiting_verification` | `POST /v1/…/resubmit` | `:301` | `:1327` | `…('resubmit')` | `responsible`/`completed_by`/`complete_any` | — | 1 fila | — | 1 fila | `task.fulfillment.resubmitted` | — |
| REVERT | `completed` → `pending` | `POST /v1/…/revert` | `:302` | `:1327` | `…('revert')` | ídem | — | 1 fila (limpia actores) | — | 1 fila | `task.fulfillment.reverted` | **UI DEAD** |
| REOPEN | `verified` → `pending` | `POST /v1/…/reopen` | `:303` | `:1327` | `…('reopen')` | `task.verify` | — | 1 fila | — | 1 fila | `task.fulfillment.reopened` | **UI DEAD** |
| CANCEL | cualquiera → `cancelled` | `DELETE /tasks/:id` | `cancelTask:115` | `cancelTask:814` | `…('cancel')` | `cancel_own`\|`cancel_any` | guard valida actor y `cancelled_from_status` | status + 4 campos | — | trigger pone `inactive_at` | `task.cancelled` | **UI DEAD en TaskDetail**; sí en lista |
| REACTIVATE | `cancelled` → `cancelled_from_status` | `POST /tasks/:id/reactivate` | `reactivateTask:379` | `reactivateTask:828` | `…('reactivate')` | `cancel_own`\|`cancel_any` | guard de re-activation | limpia 4 campos | — | trigger pone `inactive_at=NULL` | `task.reactivated` | — |
| TRASH | cualquiera → `trashed_at` | `POST /tasks/:id/trash` | `trashTask:331` | `trashTask:864` | `…('trash')` | **`task.restore`** (`:335`, comentario explícito) | guard `:1359-1371` | `trashed_at`, `trashed_by_member_id` | — | — | `task.trashed` | **Trash usa `task.restore`; no existe `task.trash`** |
| RESTORE | `trashed` → ∅ | `POST /tasks/:id/restore` | `restoreTask:355` | `restoreTask:875` | `…('restore')` | `task.restore` | ídem | limpia 2 campos | — | — | `task.restored` | — |
| ARCHIVE | `completed`\|`verified` → `archived_at` | `POST /v1/tasks/:id/archive` | `archiveTaskV1:265` | `archiveTaskV1:1243` | `archive_planner_task_v1` | `task.archive` (**false en los 6 roles**) | — | `archived_at` | — | — | `task.archived` | **UNREACHABLE** |
| UNARCHIVE | inverse | `POST /v1/tasks/:id/unarchive` | `:275` | `:1273` | `unarchive_planner_task_v1` | `task.archive` (**false**) | — | `archived_at=NULL` | — | — | `task.unarchived` | **UNREACHABLE** |
| START | — | — | — | — | — | — | — | — | — | — | — | — | **NO EXISTE** |

**No existe `DELETE` duro de Task.** `planner_tasks` no tiene `deleted_at`.

## 6. COMPLETION / VERIFICATION (PART C3)

| Pregunta | Respuesta CURRENT con evidencia |
|---|---|
| ¿Task **sin** verification: complete → qué status? | **`completed`**. `20260722010000:1609-1610` y `20260722020000:793` |
| ¿Task **con** verification: complete → qué status? | **`awaiting_verification`** (mismo código) |
| ¿Quién verifica? | Requiere `planner.view` **AND** `task.verify` (default: coordinator/adult/senior). Auto-verificación prohibida (`20260722010000:1697-1702`, `20260722020000:756-759`) |
| ¿Verification cambia Task.status o Fulfillment.status? | **Primero y sólo Fulfillment.status.** `planner_refresh_task_v0_projection` recalcula después `planner_tasks.status` como proyección |
| ¿`completed` y `verified` significan cosas distintas? | **Sí, pero sólo cuando `requires_verification=true`.** Con `requires_verification=false`, `completed` es terminal y nunca llega a `verified` |
| ¿Una Task `awaiting_verification` está considerada completa por…? | **Tasks UI:** NO (`PlannerTasksScreen.tsx:317-323` la incluye en "Pendientes"). **Planner Summary:** NO (`TASK_ELEGIBLE_STATUSES=['pending','awaiting_verification']`, cuenta en `counts.tasks`, lista `awaiting_verification_tasks`). **Attention:** SÍ genera item (`severity:'high'`, `primaryAction:'Verificar'`). **Plans:** `calculateProgressFromTasks` (`planner.goals.service.js:122`) cuenta **sólo** `completed`\|`verified` ⇒ `awaiting_verification` **NO** es progreso. **DB helpers:** `isResolved()` la trata como **NO resuelta** |
| ¿Puede verificarse dos veces? | **No** por vía V0 (`invalid_state` si no hay `awaiting_verification`). Con `each_person` cada fulfillment se verifica una vez y la Task llega a `verified` sólo cuando **todas** lo están. Con `shared_once` + `verified`, un 2º `verify` V1 devuelve `noop` (`20260722020000:760-763`) |
| ¿Puede cancelarse mientras `awaiting_verification`? | **Sí.** `cancelled_from_status` incluye `'awaiting_verification'`; el trigger pone `inactive_at`; `reactivate` la devuelve a `awaiting_verification` |
| ¿Puede editarse después de `completed`/`verified`? | **Sí.** No hay guard de status en `mutate_planner_task_v0('update')` ni en `buildTaskPatch`. Editar `requires_verification` dispara el trigger `…sync_foundation_from_v0` (lo lista en `OF`), pero su cuerpo **sólo** reacciona a cambios de `assigned_to_member_id` (`:1196`) |

---

## 7. ASSIGNMENT MODEL (PART D)

### 6.1 D1 — Autoridades de asignación

| Pieza | Tipo | Rol |
|---|---|---|
| `planner_tasks.assigned_to_member_id` | columna 1:1 | **PROYECCIÓN.** `planner_refresh_task_v0_projection:153-160`: `case when assignment_kind='members' and count(a.id)=1 then min(member_id) else null end`. Con 0 ó ≥2 assignees ⇒ NULL |
| `planner_task_assignment_configs` | tabla 1:1 | **AUTORIDAD de la SEMÁNTICA** (`assignment_kind`, `fulfillment_mode`, `legacy_backfill`) |
| `planner_task_assignees` | tabla N:1, soft-revoke | **AUTORIDAD de la MEMBRESÍA** |
| `planner_responsibility_members` | tabla N:1 a Responsibility | **Plantilla de asignación**, no asignación de Task |

**Cardinalidad de assignee: 0, 1 y N soportadas.**
- 0 → `assignment_kind='anyone'` (o `legacy_unassigned`), `shared_once`, 0 assignees, 1 fulfillment `shared`.
- 1 → `members` con 1 assignee; `assigned_to_member_id` se puebla.
- N → `members` con N assignees; `assigned_to_member_id` queda **NULL**; `each_person` ⇒ N fulfillments `individual`, o `shared_once` ⇒ 1 fulfillment `shared` compartida.

**Duplicación confirmada:** `assigned_to_member_id` NO es autoridad. Puede desincronizarse si se escribe directo; el trigger lo realinea pero con `raise exception 'assignment_history_requires_explicit_transition'` si hay historial (`:1214-1217`).

**¿Quién puede ser assigned?** Sólo `household_members` del mismo household con `status='active'`:
- RLS INSERT/UPDATE: `exists(... hm.household_id = planner_tasks.household_id and hm.status='active')` (`:320-328`, `:360-367`).
- Trigger: `'assigned member must be active in the task household'` (`:1290-1298`).
- RPC: 400 `assignment_member_wrong_household` / `assignment_member_not_active` (`20260722020000:412-430`).
- **NO** se puede asignar a un `role`, a `everyone`, ni a una `responsibility` directamente.

### 6.2 D2 — `planner_task_assignment_configs` campo por campo

| Columna | Tipo | Null | Default | Semántica | Writers | Readers |
|---|---|---|---|---|---|---|
| `task_id` | uuid | NO | — | PK, 1:1 con Task | bootstrap trigger, `update_planner_task_assignment_v1`, `claim`, `release`, `materialize_…` | todos |
| `household_id` | uuid | NO | — | scope redundante | igual | RLS policies |
| `assignment_kind` | text | NO | — | `'anyone'`\|`'members'`\|`'legacy_unassigned'` | ídem | `complete_*`, `claim`, `release`, `buildV1Aggregate`, TaskDetail |
| `fulfillment_mode` | text | NO | `'shared_once'` | `'shared_once'`\|`'each_person'` | ídem | `complete_*`, TaskDetail |
| `legacy_backfill` | boolean | NO | `false` | marcador de backfill M11 | bootstrap(backfill), `claim`, `release`, `update_v1`, `materialize_…` | `update_v1:432` |
| `version` | integer | NO | `1` | **opt. lock real del RPC de assignment** | `increment_planner_version()` | `If-Match` en `PUT /v1/…/assignment` |
| `created_at`/`updated_at` | timestamptz | NO | `now()` | — | triggers | — |

- **Cuándo se crea:** automáticamente en `AFTER INSERT` de `planner_tasks`. **Es obligatoria**: el constraint diferido lanza `'task assignment config missing'` si falta (`:560-563`).
- **Qué ocurre si falta:** `planner.tasks.service.js:701-703` → 500 `task_assignment_missing`; `getTaskFulfillmentV1:920-922` → 404.
- **Representa:** el **contrato semántico actual**, no una estrategia futura. `legacy_unassigned` es a la vez (a) marcador de filas backfilled y (b) el kind que usa `assignmentForOccurrence` para responsabilidades `unassigned` — ambigüedad documentada en `20260916000003`.

### 6.3 D3 — `planner_task_assignees`

- **Cardinalidad:** N:1 Task. PK `id` propio; unique parcial `(task_id, member_id) WHERE revoked_at IS NULL`.
- **FKs:** `(task_id, household_id)` → `planner_tasks` **CASCADE**; `(member_id, household_id)` → `household_members` **RESTRICT**.
- **Writers:** `planner_bootstrap_task_foundation`, `planner_sync_task_foundation_from_v0`, `update_planner_task_assignment_v1`, `claim_planner_task_v1`, `release_planner_task_v1`, `materialize_planner_responsibility_v1`.
- **Readers:** `getTaskFulfillmentV1`, `complete_planner_task_with_audit`, `canCompleteV1Fulfillment`, `planner_refresh_task_v0_projection`, `claim_planner_task_v1`, `release_planner_task_v1`, `planner_assert_task_fulfillment_invariants`.
- **RLS:** sólo política SELECT. **CERO privilegios de escritura para `authenticated`** (`:736-741`); los 5 constraint triggers son la única vía.
- **Data count:** 0.
- **Comparación con columna directa:** la columna es un **subconjunto** — sólo se mantiene con exactamente 1 assignee. Con 0/N queda NULL ⇒ **no es fiable como "quién tiene la tarea"**.

### 6.4 D4 — Trazado de edición de assignment

```
UI: TaskForm.tsx → handleSubmit (:679-707) → 3 ramas, TODAS con fulfillmentMode:'shared_once'
    → updatePlannerTaskAssignmentV1 (plannerTasks.ts:504)  PUT /api/planner/v1/tasks/:id/assignment
API: planner.tasks.controller.js:234 updateTaskAssignmentV1 (runTaskV1Mutation)
    → requireMutationId + requireIdempotencyKey + parseRequiredExpectedVersion (If-Match)
SERVICE: planner.tasks.service.js:1123 updateTaskAssignmentV1
    → assertV1EditCapability (:1116) → task.edit_own | task.edit_any
SQL: update_planner_task_assignment_v1 (20260722020000:310)
    1. UPDATE planner_task_fulfillments SET retired_at = now()          -- todas
    2. UPDATE planner_task_assignees    SET revoked_at   = now()         -- todas
    3. UPDATE planner_task_assignment_configs SET kind/mode/legacy_backfill
    4. INSERT planner_task_assignees (por member)
    5. INSERT planner_task_fulfillments  ('shared') | ('individual' por member)
    6. planner_refresh_task_v0_projection → actualiza planner_tasks.status y assigned_to_member_id
    7. planner_task_audit_v1 → audit_events
STATE FINAL: config+assignees+fulfillments nuevos; proyección en planner_tasks
```

| Pregunta | Respuesta |
|---|---|
| ¿Editar assignee modifica fulfillment? | **Sí, destructivamente**: `retired_at` en todas + INSERT de nuevas. Las viejas se conservan como historia |
| ¿Crea/deleta rows? | **Crea** nuevas; **no** borra (soft-revoke/soft-retire) |
| ¿Preserva history? | Sí, en `retired_at`/`revoked_at`. Pero **exige `confirmHistoricalTransition=true`** si alguna fulfillment actual tiene estado ≠ `pending` (`:437-450`) ⇒ 409. **La UI nunca lo manda ⇒ el re-asignado post-completado es inalcanzable desde la app** |
| ¿Puede reasignarse después de completar? | **Sí por API**, con confirmación explícita; **no desde la app** |
| ¿Qué ocurre con verification? | Las fulfillments viejas se retiran con su `verified`; las nuevas arrancan en `pending`. **Se pierde el estado verificado** |
| ¿Y `legacy_unassigned`? | Requiere `confirmLegacyResolution=true` (`:432-435`) ⇒ 409. La UI no lo manda |

---

## 8. FULFILLMENT MODEL (PART E)

### 7.1 E1 — Qué es un fulfillment

| Columna | Tipo | Null | Default | CHECK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK + UNIQUE `(id, household_id)` |
| `task_id` | uuid | NO | — | FK `(task_id,household_id)` → tasks **CASCADE** |
| `household_id` | uuid | NO | — | — |
| `fulfillment_scope` | text | NO | — | `IN ('shared','individual')` |
| `responsible_member_id` | uuid | YES | — | scope/member coherence; FK **RESTRICT** |
| `status` | text | NO | `'pending'` | `IN ('pending','completed','awaiting_verification','correction_requested','verified')` |
| `completed_by_member_id` / `_person_id` / `completed_at` | | YES | — | actor pairs |
| `verified_by_member_id` / `_person_id` / `verified_at` | | YES | — | actor pairs |
| `correction_requested_by_member_id` / `_at` / `correction_comment` | | YES | — | comment 1..500 |
| `resubmitted_by_member_id` / `_at` / `resubmission_note` | | YES | — | nota 1..500 |
| `version` | integer | NO | `1` | `>=1` |
| `created_at`/`updated_at` | timestamptz | NO | `now()` | — |
| `inactive_at` | timestamptz | YES | — | `cancelled` ⇒ todas inactivas |
| `retired_at` | timestamptz | YES | — | supersedida por cambio de assignment |

**Representa:** una **obligación de cumplimiento** (el compromiso que alguien tiene que zoonar). `scope='shared'` ⇒ una obligación colectiva. `'individual'` ⇒ una obligación por persona responsable.

**Cardinalidad:**
- **NO es 1:1 con Task.** Con `shared_once` hay exactamente **1** fulfillment `shared` activa (índice único parcial `planner_task_fulfillments_current_shared_uidx`).
- **NO es 1:1 con assignee** en `shared_once` (N assignees ⇒ 1 fulfillment compartida).
- Con `each_person` es **1:1 con cada assignee activo** (`planner_task_fulfillments_current_individual_uidx` sobre `(task_id, responsible_member_id)`).
- **NO es 1:1 con occurrence de responsibility**: la materialización crea las filas como parte de la Task; la occurrence apunta a la Task.

**¿N históricos?** Sí, por `retired_at`.

### 7.2 E2 — Creación

| Momento | Mecanismo |
|---|---|
| **Al crear la Task** | **Sí, inmediatamente y atómicamente**: trigger `trg_planner_tasks_bootstrap_foundation` (AFTER INSERT) inserta config + assignee + llama `planner_create_current_task_fulfillments`. Determinista: `assignment_kind = case when assigned_to_member_id is null then 'anyone' else 'members' end`, `shared_once`, `legacy_backfill=false` (`:1158-1176`) |
| Al asignar | `update_planner_task_assignment_v1` / `claim_planner_task_v1` / `release_planner_task_v1` |
| Al completar | **NO** |
| Al materializar responsibility | `materialize_planner_responsibility_v1:197-209` — borra la proyección del trigger y la reemplaza; si `p_assignment_kind='members'` con exactamente 1 miembro **deja** la del trigger |
| Lazy | No aplica |
| RPC | `planner_create_current_task_fulfillments` (interno, revocado) |

### 7.3 E3 — Estados de Fulfillment vs Task

| Fulfillment.status | Task.status resultante (vía `planner_task_aggregate_v1`) |
|---|---|
| (ninguna activa) | `pending` |
| alguna `correction_requested` | **`pending`** (la Task *regresa* a pendiente) |
| alguna `pending` | `pending` / `partially_completed`→`pending` |
| alguna `awaiting_verification` (y ninguna pending) | `awaiting_verification` |
| todas `verified` | `verified` |
| mezcla `completed`+`verified` sin pending | `completed` |
| Task `cancelled` | `cancelled` (forzado, `20260722020000:140-142`) |

**¿Duplican estado?** **Sí: `planner_tasks.status` es un duplicado derivado.** Única excepción: `'cancelled'`, que Task posee de forma propia y no se deriva.

### 7.4 E4 — Trazado end-to-end

**COMPLETE (V0):**
```
POST /tasks/:id/complete  (If-Match: version)
→ completeTask (controller:144) → getTaskCompletionAuthorization (lee config+assignees)
→ mutate_planner_task_v0('complete')
   → planner_task_v1_assert_payload_hash
   → planner_v2_reserve_idempotency
   → complete_planner_task_with_audit:
       1. deriva actor desde auth.uid()/current_person_id()/current_household_member_id
       2. anti-spoof: p_actor_account_id/p_actor_membership_id deben coincidir
       3. SELECT task FOR UPDATE (trashed_at IS NULL)
       4. capability según config.assignment_kind + is_assignee
       5. SELECT fulfillment FOR UPDATE:
            each_person → la individual del actor
            shared_once → ORDER BY (responsible=actor) NULLS LAST LIMIT 1
       6. version check (con noop si shared y ya completada)
       7. UPDATE fulfillment SET status, completed_by_*, completed_at=now(), limpia verified/correction
       8. planner_refresh_task_v0_projection → UPDATE planner_tasks (status, completed_*, verified_*)
             [set_config('homeplus.planner_internal_projection','on') → el guard de trigger se salta]
       9. INSERT audit_events ('planner','task.completed')
   → planner_task_v1_complete_idempotency
→ planner.tasks.controller.js:173 → responsibilitiesService.materializeHousehold(context)  ← EFECTO SECUNDARIO
→ telemetry('planner_mutation_succeeded')
```
**Orden de escritura:** `planner_task_fulfillments` (1) → `planner_tasks` (1) → `audit_events` (1) → [`planner_responsibilities` + `planner_task_fulfillments`/`assignees`/`configs` + `planner_tasks` + `planner_responsibility_occurrences` si hay materialización].

**VERIFY (V0):** análogo, pero `verify_planner_task_fulfillment_with_audit` **no** recibe `p_fulfillment_id`: selecciona la fulfillment `awaiting_verification` **más antigua** (`ORDER BY completed_at ASC LIMIT 1`). Con `each_person` hay que llamar N veces.

**Nota crítica del orden:** en `mutate_planner_task_fulfillment_v1`, `planner_refresh_task_v0_projection` se llama **después** del UPDATE de fulfillment (`:861`); los constraint triggers son DEFERRABLE INITIALLY DEFERRED, por lo que la validación ocurre al commit.

---

## 9. EVIDENCE MODEL (PART F)

### 8.1 `planner_task_evidence_attempts` campo por campo

| Columna | Tipo | Null | Default | CHECK / FK |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `task_id` | uuid | NO | — | FK `(task_id,household_id)` → tasks **CASCADE** |
| `household_id` | uuid | NO | — | — |
| `fulfillment_id` | uuid | YES | — | FK `(fulfillment_id,household_id)` → fulfillments **SET NULL** |
| `submitted_by_member_id` | uuid | NO | — | FK `(member,person,household)` **RESTRICT** |
| `submitted_by_person_id` | uuid | NO | — | FK `people(id)` **RESTRICT** |
| `submitted_at` | timestamptz | NO | `now()` | — |
| `photo_reference` | text | YES | — | 1..255 chars — **URL pública**, no adjunto |
| `comment` | text | YES | — | 1..500 chars |
| `review_result` | text | YES | — | `IN ('verified','correction_requested')` ó NULL |
| `review_comment` | text | YES | — | 1..500 |
| `reviewed_by_member_id` | uuid | YES | — | FK **SET NULL** |
| `reviewed_at` | timestamptz | YES | — | — |
| `version` | integer | NO | `1` | `>=1` |
| `created_at`/`updated_at` | timestamptz | NO | `now()` | — |

- **Sin `trashed_at`.** Sin `deleted_at`.
- **Sin función SQL que la mencione** (`prosrc ILIKE '%evidence_attempt%'` → 0 resultados). **No hay RPC de review.** `review_result`, `review_comment`, `reviewed_by_member_id`, `reviewed_at` **nunca se escriben** por ninguna vía.
- Grants: `revoke all … from public, anon, authenticated` + `grant select to authenticated` + `grant all to service_role` (`20260914000001:126-128`).
- Política: sólo SELECT `authenticated` con `planner.view`.

### 8.2 Qué representa / quién crea / config

| Pregunta | Respuesta CURRENT |
|---|---|
| ¿Qué representa? | Un **intento** de evidencia asociado a una fulfillment, con foto opcional (**URL pública**) y comentario. **No** es un adjunto: el binario lo sube el cliente directamente al bucket Supabase Storage `planner-evidence` (`services/plannerEvidence.ts:3,22-35`) y sólo se guarda la URL |
| ¿Quién crea? | `planner.tasks.service.js:1473-1486`, cliente **usuario**. **Falla por privilegio** ⇒ nadie lo crea en runtime |
| ¿Tipos? | `review_result ∈ {verified, correction_requested}`. Sin tipo de adjunto, sin mime, sin tamaño |
| ¿Reviewer? | Columna existe, **sin writer, sin endpoint, sin UI** |
| ¿Configurable? | La requirement real es **`planner_tasks.requires_verification`**, no una config de evidence. Evidence es efecto de `handleComplete` **sólo si `requires_verification===true`** (`TaskDetailScreen.tsx:723-728`) |
| ¿Dónde vive ese config? | `planner_tasks.requires_verification` (boolean, sin CHECK) |
| ¿Qué ocurre si no se envía? | `EvidencePhotoPicker.tsx:84-88` **aborta sin foto** en ambos casos (`'La foto es obligatoria para enviar a revisión.'` / `'Seleccioná una foto.'`) ⇒ **evidence es de hecho obligatoria en la UI cuando `requires_verification=true`**, aunque la DB no lo exige |
| ¿La UI lo soporta realmente? | Parcial: el upload a Storage funciona (permisos del bucket, fuera de este audit); **el registro en DB falla**; el historial se renderiza con `any`; `review_result` se muestra como etiqueta pero nadie lo escribe |
| ¿Trash? | No. `planner_tasks` CASCADE al borrar task (nunca se borra) |

**Veredicto PART F: `planner_task_evidence_attempts` es `DEAD` en escritura y `EMPTY` en lectura. `review_*` es `DEAD` absoluto.**

---

## 10. PERSONAL / HOUSEHOLD (PART G)

### 9.1 G1 — Scope CURRENT

**Respuesta: HOUSEHOLD ONLY como concepto explícito.**

| Capa | Evidencia |
|---|---|
| Columnas | `planner_tasks` **no tiene** `visibility`, `scope`, `owner_person_id` ni `owner_member_id` (39 columnas confirmadas) |
| DB CHECK | Ninguno de scope |
| RLS | `planner_tasks_select_capability` = `is_active_household_member(household_id) and planner_current_actor_has_capability(household_id,'planner.view')` — **no hay filtro de visibilidad** |
| RLS INSERT | `created_by_member_id = current_household_member_id(household_id) AND created_by_person_id = current_person_id()` ⇒ **el creator es forzado al actor**. No hay forma de crear Task "para otra persona" como owner |
| Backend | `planner.tasks.controller.js:60-66` → `400 personal_tasks_not_supported` si `body.visibility==='personal'` |
| Backend | `planner.tasks.service.js:642-648` → **mismo rechazo, duplicado** |
| Frontend | `CreatePlannerTaskPayload` (`plannerTasks.ts:98-109`) **no tiene `scope` ni `visibility`**. `TaskForm.tsx:621-642` no manda scope |
| Frontend | `planner.search.service.js:67-73` fuerza `scopeKind:'household'` para toda Task |
| Summary | `planner.summary.service.js:66-70` documenta: *"Planner Tasks carry no explicit `visibility` column… Personal origin is implied by `created_by_member_id` and is NOT used as a visibility gate"* |
| Error code | **`personal_tasks_not_supported`** — existe, en 2 capas, HTTP 400 |
| `task.create_personal` | Default `true` para coordinator/adult/adolescent/senior — **pero ningún endpoint la consulta**. Sólo se lee en frontend como OR con `task.create_household` para mostrar el Quick Action (`plannerQuickActions.ts:50`) |
| `PlannerTaskScope` type | `types/plannerTaskV1.ts:13` define `'personal'\|'household'` — **tipo muerto**, no lo transporta ninguna API |
| Goal/Plan contraste | `planner_goals.visibility ∈ ('household','personal')` y `owner_person_id` **sí** existen. Tasks, no |

**La única "personalidad" de una Task es `created_by_member_id`** (base de `task.*_own`).

### 9.2 G2 — Ownership

| Pregunta | Respuesta con evidencia |
|---|---|
| ¿Qué significa "Task propia"? | **`created_by_member_id === context.membershipId`** (JS) / `=== public.current_household_member_id(household_id)` (SQL). **NO** es el assignee, **NO** el responsable de fulfillment |
| Cálculo JS | `planner.tasks.service.js:1013`, `:1120`, `:362`; controller `:94`, `:122`, `:386` |
| Cálculo SQL | RLS UPDATE policy; `planner_guard_task_fulfillment_projection:1308` (`v_is_own`); `mutate_planner_task_v0:969,976`; `update_planner_task_assignment_v1:362` |
| **Contradicción** | `resolveOwnershipCapability(action, {actorMemberId, entityCreatorMemberId, fallbackAny})` (`plannerCapabilities.js:414`) devuelve `action` **sin sufijo** si `fallbackAny=false` y no es own ⇒ capability **inexistente**. **No tiene callers** ⇒ DEAD |
| **Contradicción 2** | `canManageOwn` (`planner.tasks.service.js:738-740`, `:1029`) usa **`responsible_member_id === actor` O `completed_by_member_id === actor`** — criterio **distinto** del `own` de las capabilities |
| `assigned_to_member_id` | **NO** participa de ninguna decisión `own/any` |

**Consecuencia:** el creator puede perder control de su Task; el assignee no tiene derecho de edición propio (`task.edit_own` no aplica; el assignee tiene `task.complete_assigned`).

---

## 11. RESPONSIBILITY ROOT (PART H)

### 10.1 H1 — Qué es una Responsibility CURRENT

**Múltiple semántica, explícita en la propia migración:**

`comment on table public.planner_responsibilities is 'P2.1 persistent recurring household rules. Runtime completion stays in planner_tasks.'` (`20260916000001:224`)
`comment on column … task_defaults is 'Stable future-task defaults only; runtime Task state is forbidden.'` (`:226`)

| Semántica | Evidencia |
|---|---|
| **Entidad persistida** | ✔ tabla propia, 23 columnas, FKs, RLS, versionado por trigger |
| **Regla de recurrencia** | ✔ `schedule_kind`, `schedule_interval`, `schedule_unit`, `weekdays`, `month_day`, `anchor_date`, `due_time` + `planner_responsibility_schedule_shape` |
| **Generador de Tasks** | ✔ `materialize_planner_responsibility_v1` inserta en `planner_tasks` |
| **Assignment preset** | ✔ `assignment_kind ∈ ('fixed','rotation','claimable','unassigned')` mapeado por `assignmentForOccurrence` a `('members','anyone','legacy_unassigned')` |
| **Template de Task** | ✔ `task_defaults` jsonb (`priority`, `template_key`, `estimated_duration_minutes`, `checklist`, `requires_verification`, `goal_id`) |
| **Grouping / etiqueta** | **NO** — sin color ni etiqueta; `planner_tasks.responsibility_id` sólo se usa en 2 ramas de UI |
| **Rol permanente** | **NO** — no hay `role` propio; `assignment_kind='fixed'` + `planner_responsibility_members` es lo más cercano |
| **Schedule** | ✔ pero **derivado en JS**, no en SQL. La DB no tiene función que calcule la siguiente fecha |

### 10.2 H2 — `planner_responsibilities` campo por campo

| # | COLUMN | TYPE | NULL | DEFAULT | CHECK | FK | WRITER | READER | UI | DATA COUNT |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `id` | uuid | NO | `gen_random_uuid()` | — | PK | insert | todos | sí | 0 |
| 2 | `household_id` | uuid | NO | — | — | `households(id)` CASCADE | insert | RLS | no | 0 |
| 3 | `title` | text | NO | — | `length(btrim)>0` | — | create/update | todos | sí | 0 |
| 4 | `description` | text | YES | — | — | — | create/update | todos | sí | 0 |
| 5 | `lifecycle` | text | NO | `'active'` | `IN ('active','paused','archived','trashed')` | — | `setLifecycle` | `materializeOne:94` | sí | 0 |
| 6 | `assignment_kind` | text | NO | — | `IN ('fixed','rotation','claimable','unassigned')` | — | create/update | `assignmentForOccurrence` | sí | 0 |
| 7 | `schedule_kind` | text | NO | — | `IN ('daily','weekdays','interval','monthly','after_completion')` | — | create/update | `nextOccurrence` | sí | 0 |
| 8 | `schedule_interval` | integer | NO | `1` | `1..999` | — | create/update | `isCalendarMatch` | sí | 0 |
| 9 | `schedule_unit` | text | YES | — | `IN ('days','weeks','months')` ó NULL | — | create/update | ídem | sí | 0 |
| 10 | `weekdays` | smallint[] | NO | `'{}'` | schedule_shape | — | create/update | `isCalendarMatch` | sí | 0 |
| 11 | `month_day` | smallint | YES | — | `1..31` | — | create/update | `addMonthsClamped` | sí | 0 |
| 12 | `anchor_date` | date | NO | — | — | — | create/update | `nextOccurrence` | sí | 0 |
| 13 | `due_time` | time | YES | — | — | — | create/update | copiado a `planner_tasks.due_time` | sí | 0 |
| 14 | `task_defaults` | jsonb | NO | `'{}'` | `jsonb_typeof='object'` | — | create/update | `materialize_…:177-189` | sí | 0 |
| 15 | `next_sequence` | bigint | NO | `1` | `>0` | — | **`materialize_…:215` (único writer)** | `materializeOne:117,123` | no | 0 |
| 16 | `requires_adjustment_reason` | text | YES | — | — | — | `refreshAdjustment` | **bloquea materialización** `:156` | no (expuesto en API) | 0 |
| 17 | `created_by_member_id` | uuid | NO | — | — | `household_members(id)` (sin ON DELETE ⇒ NO ACTION) | create | RLS INSERT policy | no | 0 |
| 18 | `created_at` | timestamptz | NO | `now()` | — | — | — | sort | no | 0 |
| 19 | `updated_at` | timestamptz | NO | `now()` | — | — | trigger | sort | no | 0 |
| 20 | `paused_at` | timestamptz | YES | — | — | — | `setLifecycle` | — | no | 0 |
| 21 | `archived_at` | timestamptz | YES | — | — | — | `setLifecycle` | — | no | 0 |
| 22 | `trashed_at` | timestamptz | YES | — | — | — | `setLifecycle` | — | no | 0 |
| 23 | `version` | integer | NO | `1` | `>0` | — | trigger `+1` | opt. lock `If-Match` | no | 0 |

**Índices:** `planner_responsibilities_household_lifecycle (household_id, lifecycle, updated_at desc)`.

### 10.3 H3 — Lifecycle de Responsibility

| Operación | Endpoint | Controller | Service | SQL | Capability | Real |
|---|---|---|---|---|---|---|
| LIST | `GET /responsibilities?lifecycle=` | `list` | `listResponsibilities` | SELECT directo | `planner.view` | **LIVE** |
| CREATE | `POST /responsibilities` | `create` | `createResponsibility` | INSERT + DELETE/INSERT members | **`task.create_household` (!)** | **LIVE** |
| GET | `GET /responsibilities/:id` | `get` | `getResponsibility` (llama `listResponsibilities`, que llama `materializeHousehold` **2 veces**) | SELECT | `planner.view` | **LIVE** |
| EDIT | `PATCH /responsibilities/:id` | `update` | `updateResponsibility` | UPDATE + members | **`planner.view` sólo** | **LIVE, SIN capability de edición** |
| PAUSE | `POST /:id/pause` | `pause` | `setLifecycle('paused')` | UPDATE | **`planner.view` sólo** | **LIVE** |
| RESUME | `POST /:id/resume` | `resume` | `setLifecycle('active')` | UPDATE | **`planner.view` sólo** | **LIVE** |
| ARCHIVE | `POST /:id/archive` | `archive` | `setLifecycle('archived')` | UPDATE | **`planner.view` sólo** | **LIVE** |
| UNARCHIVE | `POST /:id/unarchive` | `unarchive` | `setLifecycle('active')` | UPDATE | **`planner.view` sólo** | **LIVE** — indistinguible de `restore`/`resume` |
| TRASH | `POST /:id/trash` | `trash` | `setLifecycle('trashed')` | UPDATE | **`planner.view` sólo** | **LIVE** |
| RESTORE | `POST /:id/restore` | `restore` | `setLifecycle('active')` | UPDATE | **`planner.view` sólo** | **API LIVE / UI DEAD** (`ResponsibilityDetailScreen.tsx:31` no lo expone) |
| REPLACE ASSIGNEE | `POST /:id/current-task/replace-assignee` | `replaceCurrentAssignee` | → `tasksService.updateTaskAssignmentV1` | `update_planner_task_assignment_v1` | `task.edit_own`\|`task.edit_any` (de la **Task**) | **LIVE** |
| **DELETE** | — | — | — | — | — | **NO EXISTE** (FK RESTRICT) |

**Sobreposiciones confirmadas:** `restore`, `resume` y `unarchive` **son la misma operación** (`lifecycle('active')`) y las tres escriben `paused_at=NULL, archived_at=NULL, trashed_at=NULL` simultáneamente (`setLifecycle:205`). **Un `unarchive` de una Responsibility `trashed` la reactiva.**

**Responsibilities NO aparecen en la papelera transversal** (`planner.trash.service.js:205-227` sólo agrega tasks/events/goals/milestones).

---

## 12. RESPONSIBILITY MEMBERS (PART I)

`planner_responsibility_members`: 5 columnas.

| Columna | Tipo | Null | Default | Constraint |
|---|---|---|---|---|
| `responsibility_id` | uuid | NO | — | PK parte 1; FK → responsibilities **CASCADE** |
| `household_id` | uuid | NO | — | FK → households CASCADE |
| `member_id` | uuid | NO | — | PK parte 2; FK → household_members (NO ACTION) |
| `position` | integer | NO | — | `>= 0`; **UNIQUE `(responsibility_id, position)`** |
| `created_at` | timestamptz | NO | `now()` | — |

| Pregunta | Respuesta |
|---|---|
| ¿Qué representa membership? | El **conjunto ordenado de personas elegibles** para las ocurrencias de esa responsabilidad |
| ¿0 / 1 / N? | **Los tres.** 0 es legal (produce `requires_adjustment_reason` si `assignment_kind='fixed'`); 1 con `fixed`; **≥2 obligatorio** con `rotation` (`validateRule:71-73`) |
| ¿Member = assignee? | **No.** Es **plantilla**. El assignee real se decide en `assignmentForOccurrence` por `assignment_kind` |
| ¿Member = owner? | No |
| ¿Member = eligible person? | **Sí** |
| ¿Member = participant? | No |
| ¿La lista afecta Tasks generadas? | **Sí**, indirectamente: `materializeHousehold` → `assignmentForOccurrence` → `p_member_ids` → `planner_task_assignees` |
| ¿Al agregar/quitar un miembro? | `replaceMembers` hace **DELETE de todas + INSERT de todas** (`service:60-67`). No hay endpoints granulares add/remove |
| ¿Modifica Tasks existentes? | **No.** Sólo afecta la **próxima** materialización |
| ¿Modifica sólo futuras? | **Sí** |
| Writers | `createResponsibility:180`, `updateResponsibility:198` |
| Readers | `loadMembers:73`, `materializeHousehold:142`, `listResponsibilities:155` |
| RLS | SELECT/INSERT/UPDATE/DELETE `authenticated` con **sólo** `is_active_household_member(household_id)` — **sin `planner.view`**, divergente de la policy de `planner_responsibilities` |
| Grants | `SELECT, INSERT, UPDATE, DELETE` a `authenticated`; **además `anon` tiene el grant de tabla completo** pero RLS lo bloquea |
| Data count | **0** |
| Triggers | **ninguno** |
| UI | `ResponsibilityFormScreen.tsx` (miembros en create/edit) |

---

## 13. RESPONSIBILITY OCCURRENCES (PART J)

`planner_responsibility_occurrences`: 11 columnas.

| Columna | Tipo | Null | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `responsibility_id` | uuid | NO | — | FK → responsibilities **RESTRICT**; UNIQUE `(responsibility_id, sequence)`; UNIQUE `(responsibility_id, occurrence_key)` |
| `household_id` | uuid | NO | — | FK → households CASCADE |
| `sequence` | bigint | NO | — | `> 0` |
| `occurrence_key` | text | NO | — | `<next_sequence>:<scheduled_date>` (`service:123`) |
| `scheduled_date` | date | NO | — | — |
| `rotation_slot_member_id` | uuid | YES | — | FK → household_members **SET NULL** |
| `task_id` | uuid | NO | — | FK → planner_tasks **RESTRICT**; **UNIQUE(task_id)** |
| `resolved_at` | timestamptz | YES | — | — |
| `resolution_status` | text | YES | — | `IN ('completed','verified')` ó NULL |
| `created_at` | timestamptz | NO | `now()` | — |

Índices: `planner_responsibility_one_live_occurrence` **UNIQUE parcial `(responsibility_id) WHERE resolved_at IS NULL`**; `planner_responsibility_occurrences_history (responsibility_id, sequence desc)`.

| Pregunta | Respuesta |
|---|---|
| ¿Occurrence es Task? | **No**, pero tiene **FK NOT NULL a Task** ⇒ es 1:1 con una Task concreta ya materializada |
| ¿instancia temporal? | Sí — `(sequence, occurrence_key, scheduled_date)` |
| ¿schedule row? | No — `scheduled_date` es fecha puntual |
| ¿generation ledger? | **Sí, es su función principal** |
| ¿completion row? | **Parcialmente**: `resolved_at`/`resolution_status` se rellenan leyendo el status de la Task, por el **backend**, no por trigger |
| ¿Tiene FK a Task? | **Sí, NOT NULL, ON DELETE RESTRICT, UNIQUE** |
| ¿Una occurrence genera Task? | **Inverso**: la Task se crea primero (dentro de `materialize_…`) y la occurrence se inserta después apuntando a ella (`20260916000001:211-214`) |
| ¿Task genera occurrence? | **No directamente**. Se acopla por `planner_tasks.responsibility_id` + `responsibility_occurrence_sequence`, que la propia función escribe |
| ¿Son paralelas? | **Acopladas**: la Task es la entidad viva; la occurrence es su registro de procedencia |
| Estados | Los **de la Task** (`task.status`), reflejados en `resolution_status`. `pending`/`awaiting_verification` ⇒ `resolution_status IS NULL` |
| Timestamps | Sólo `created_at` y `resolved_at`. **Sin `updated_at` ni `version`** ⇒ sin optimistic lock |
| Writers | `materialize_planner_responsibility_v1` (INSERT), `materializeOne` (UPDATE) |
| Readers | `materializeOne:96,118`, `listResponsibilities:159-162` |
| UI | `listResponsibilities` devuelve `occurrences` (últimas 10) y `current_occurrence`. Tipo `ResponsibilityOccurrence` (`plannerResponsibilities.ts:16`) con `resolution_status?: string \| null` (**string libre**, más laxo que el CHECK) |
| Data count | **0** |

**Divergencia de resolución:** `isResolved()` y `materializeOne:102` usan `task.status`, mientras `resolution_status` sólo admite `completed`\|`verified`. Una Task `awaiting_verification` ⇒ `isResolved=false` ⇒ la occurrence sigue viva ⇒ la siguiente materialización devuelve `live_exists` ⇒ **la responsabilidad se estanca hasta que se verifique**.

---

## 14. RESPONSIBILITY → TASK BEHAVIOR (PART K)

### 13.1 K — Trazado exacto

```
Responsibility (lifecycle='active', requires_adjustment_reason IS NULL)
  → [SIN CRON, SIN WORKER, SIN SCHEDULER]
  → materializeHousehold(context)           ← única puerta
       ↳ planner.responsibilities.service.js:138
         · hoy = dateOnly(UTC o household.timezone)
         · SELECT responsibilities WHERE household_id AND lifecycle='active'
         · loadMembers, activeMemberIds
         · POR CADA responsibility (secuencial, sin Promise.all):
             materializeOne():
               1. refreshAdjustment() → validateRule(); escribe requires_adjustment_reason
               2. si lifecycle<>'active' o inválida → {outcome:'not_eligible'}
               3. SELECT occurrence WHERE resolved_at IS NULL
                  · si existe: lee planner_tasks.status
                      - si !isResolved(status, requires_verification) → {outcome:'live_exists'}
                      - si resuelta: UPDATE occurrence SET resolved_at, resolution_status
                        afterDate = (schedule_kind='after_completion')
                                   ? dateOnly(resolvedAt, household.timezone) : today
               4. scheduledDate = afterDate ? nextOccurrence(schedule, afterDate)
                                            : nextOccurrence(schedule, previousDate(max(anchor_date, today)))
               5. rotation: previousSlotMemberId = última occurrence con slot no null
                  assignment = assignmentForOccurrence(kind, members, next_sequence, prevSlot)
               6. occurrenceKey = `${next_sequence}:${scheduledDate}`
               7. RPC materialize_planner_responsibility_v1(...)
                    · guard: is_active_household_member AND task.create_household → 'forbidden'
                    · SELECT responsibility FOR UPDATE
                    · lifecycle<>'active' OR requires_adjustment_reason IS NOT NULL → 'not_eligible'
                    · ya hay occurrence sin resolver → 'live_exists'
                    · next_sequence ≠ p_sequence → 'sequence_conflict'
                    · assignment_kind ∉ ('anyone','members','legacy_unassigned') → EXCEPTION 22023
                    · members sin members → EXCEPTION 22023
                    · member no activo / de otro household → EXCEPTION 23514
                    · INSERT planner_tasks (title/description/priority/template_key/due_date/due_time/
                          estimated_duration_minutes/checklist/requires_verification/goal_id/
                          created_by_member_id=current/created_by_person_id=current/
                          assigned_to_member_id (sólo si members de 1)/
                          origin_module='planner', origin_entity_type='responsibility',
                          origin_entity_id=rule.id, origin_reason=occurrence_key,
                          responsibility_id, responsibility_occurrence_sequence)
                      → trg_planner_tasks_bootstrap_foundation crea config+assignee+fulfillment
                    · si assignment NO es (members de 1): DELETE fulfillments, DELETE assignees,
                      UPDATE config, INSERT assignees, planner_create_current_task_fulfillments()
                    · INSERT planner_responsibility_occurrences
                    · UPDATE planner_responsibilities SET next_sequence = next_sequence + 1
                    · return {outcome:'created', task_id, sequence}
                    · EXCEPTION unique_violation → {outcome:'duplicate'}
```

| Pregunta | Respuesta |
|---|---|
| ¿Responsibility crea Tasks automáticamente? | **Sí**, pero **sólo bajo demanda de lectura/mutación** |
| ¿CUÁNDO? | Cada `GET /responsibilities`, `GET /responsibilities/:id`, `POST/PATCH /responsibilities`, `POST /responsibilities/:id/{resume,restore,unarchive}` **y** en `GET /tasks`, `POST /tasks/:id/complete`, `POST /tasks/:id/verify`, y **todas** las mutaciones V1 de task (`runTaskV1Mutation:226`) |
| ¿POR QUÉ MECANISMO? | JS calcula fecha y rotación; `materialize_planner_responsibility_v1` (SECURITY DEFINER) es la frontera atómica |
| ¿CON QUÉ FRECUENCIA? | **Por request.** Sin cron, sin worker, sin `setInterval`, sin pg_cron. `package.json` no tiene script de scheduler; `node-cron` no es dependencia |
| ¿QUIÉN LO EJECUTA? | El **backend HTTP**, con el **cliente del usuario autenticado** (`context.client`), no service-role |
| ¿QUÉ IDEMPOTENCY USA? | **Cinco capas**: (a) UNIQUE parcial `planner_responsibility_one_live_occurrence`; (b) UNIQUE `(responsibility_id, occurrence_key)`; (c) UNIQUE `(task_id)`; (d) `next_sequence` como CAS con `FOR UPDATE`; (e) `exception when unique_violation → 'duplicate'`. **NO usa `planner_v2_reserve_idempotency` ni `mutation_id`** ⇒ sin traza de auditoría ni correlación |
| ¿QUÉ PASA SI FALLA? | `dbError(error)` ⇒ **500 crudo** con `error.code`. Sin rollback explícito ⇒ la transacción postgrest revierte todo el materializado del household (bucle secuencial dentro de un request) |

### 13.2 K1 — Propagación de edición

| Se edita… | ¿Task ya creada? | ¿Task pendiente? | ¿Task completada? | ¿Occurrence futura? | ¿Occurrence pasada? |
|---|---|---|---|---|---|
| `title` | **NO cambia** | no | no | se aplicará a la próxima | inmutable |
| `description` | no | no | no | próxima | inmutable |
| `assignment_kind` | no | no | no | **sí**, recalcula la próxima asignación | inmutable |
| `memberIds` | **no** | no | no | **sí** | inmutable |
| `schedule_*` | no | no | no | **sí** (nueva `scheduled_date`) | inmutable |
| `task_defaults` | no | no | no | **sí** | inmutable |
| `lifecycle='paused'` | no | no | no | **no se materializa** (`materializeOne:94`) | inmutable |
| `lifecycle='archived'/'trashed'` | no | no | no | **no se materializa** | inmutable |
| `due_time` | no | no | no | sí | inmutable |

**Ninguna edición propaga a Tasks existentes.** Cada Task es una **instantánea inmutable** de la regla en el momento de su materialización.

**Consecuencia:** `requires_adjustment_reason` se recalcula en cada `materializeOne`. Si una rotación pierde un miembro activo, la responsibility queda `not_eligible` y **deja de generar Task indefinidamente** sin señal visible en la UI de lista (el campo viaja en la respuesta pero la UI no lo renderiza).

### 13.3 K2 — Trash / delete de Responsibility

| Acción | Efecto sobre Tasks asociadas | Evidencia |
|---|---|---|
| `POST /:id/trash` | **NINGUNO.** `lifecycle='trashed'` + `trashed_at`. Las Tasks ya materializadas **siguen vivas, visibles y operativas** | `setLifecycle` sólo hace UPDATE |
| `unarchive`/`restore`/`resume` | Vuelve a `active` ⇒ `materializeHousehold` ⇒ puede crear una Task nueva | `setLifecycle:211` |
| `DELETE` de la fila | **BLOQUEADO** por dos FKs `ON DELETE RESTRICT`: `planner_tasks.responsibility_id` y `planner_responsibility_occurrences.responsibility_id` | `20260916000001:50,74` |
| `DELETE` de `planner_responsibility_members` | CASCADE — pero `replaceMembers` ya lo borra explícitamente | |
| Trash transversal | **Responsibilities NO aparecen** en `GET /planner/trash` | `planner.trash.service.js:205-227` |
| ¿Quedan ocultas? | Las Tasks de una responsibility `trashed` **no** se ocultan en ningún sitio | |

---

## 15. RECURRENCE / SCHEDULING (PART L)

### 14.1 Dónde vive la recurrencia

| Entidad | ¿Tiene recurrencia? | Campos |
|---|---|---|
| **`planner_tasks`** | **NO** | Ninguna columna `recurrence*`, `frequency`, `interval`, `weekday`, `rule`, `timezone`, `next_occurrence`. Verificado en `information_schema.columns` |
| **`planner_responsibilities`** | **SÍ** | `schedule_kind`, `schedule_interval`, `schedule_unit`, `weekdays`, `month_day`, `anchor_date`, `due_time` |
| `planner_responsibility_occurrences` | Derivada | `sequence`, `occurrence_key`, `scheduled_date` |
| `planner_events` | **SÍ** (`recurrence text`) | fuera de alcance Task |
| `household_schedule_blocks` | legacy schedules | fuera de alcance Task |

### 14.2 Mecanismo de cómputo

| Pregunta | Respuesta |
|---|---|
| ¿Quién calcula la siguiente instancia? | **Backend JavaScript puro**: `nextOccurrence()` / `isCalendarMatch()` / `addMonthsClamped()` en `backend/src/domain/planner.responsibilities.domain.js:49-61,23-47`. Cero SQL |
| ¿Hay scheduler real? | **NO.** Sin cron, sin `pg_cron`, sin worker, sin `setInterval` en el backend de planner, sin script npm de scheduler |
| ¿Está wired? | **Sí, al endpoint de lectura**: `listResponsibilities` → `await materializeHousehold(context)` antes de leer. Es "pull", no "push" |
| ¿Está ejecutándose? | **Sí, en cada request** a Tasks o Responsibilities. Con 0 responsabilidades no produce nada |
| ¿Cómo evita duplicados? | Ver §14.1 (5 mecanismos, ninguno con `mutation_id`) |
| ¿Qué pasa con timezone? | **Implementado en apariencia, ineffective en realidad.** `dateOnly(date, timeZone)` usa `Intl.DateTimeFormat('en-CA',{timeZone})` con `context.household?.timezone ?? 'UTC'` (`:14-18,139`). **PERO** `nextOccurrence`/`isCalendarMatch` operan sobre **fechas UTC puras** (`Date.UTC`, `getUTC*`). **`households.timezone` no existe como columna** ⇒ siempre `'UTC'` ⇒ **el manejo de timezone es decorativo** |

**Ausencias notables:** `planner_tasks` no tiene `start_at`, `ends_at`, `timezone`, `next_occurrence`, `all_day`. Un Task tiene sólo `due_date` (date) + `due_time` (time, sin tz).

**Tipos de recurrencia en frontend:** `PlannerTaskRecurrenceProjection` (`types/plannerTaskV1.ts:57-62`) y `PlannerTask.recurrence`/`recurrenceSummary` (`plannerTasks.ts:85-91`) existen como **lectura**, pero **el backend nunca los emite** y `recurrenceRule` (`plannerTaskAdapters.ts:75`) está en adaptadores **DEAD**. ⇒ **tipo DEAD**.

---

## 16. PLAN RELATION (PART M)

### 15.1 Vínculo vivo

| Aspecto | Valor |
|---|---|
| Columna | `planner_tasks.goal_id` |
| FK | `planner_tasks_goal_id_fkey` → `planner_goals(id)` **`ON DELETE SET NULL`** |
| Cardinalidad | Task 0..1 → Plan. Un Plan tiene N Tasks |
| Tipo | uuid, nullable, sin CHECK |
| Índice | `idx_planner_tasks_goal (household_id, goal_id)` |
| Writers | `mutate_planner_task_v0` create (valida household + `deleted_at IS NULL` + `trashed_at IS NULL`, `20260722020000:1023-1033`) y update (`:1101-1111`) |
| Readers | `listTasks` filtro `?goal_id=` (`planner.tasks.service.js:489-513`, con `applyPlanReadScope`), `calculateProgressFromTasks` (`planner.goals.service.js:101-128`), `PlannerPlanDetailScreenV1.tsx:68,81` |
| UI | Selector de Plan en `TaskForm`; lista de Tasks en Plan Detail |
| Authorization | El filtro usa `applyPlanReadScope` (modificación no commiteada del lane Plans). La **escritura** valida `household_id` + no-deleted + no-trashed, pero **NO valida `visibility='personal'`** ⇒ un Plan personal ajeno es aceptable por `mutate_planner_task_v0` |
| Trash behavior | `listTasks` filtra `planner_tasks.trashed_at IS NULL`; **no** filtra `planner_goals.trashed_at` (sólo valida al escribir) |
| Completed task | `calculateProgressFromTasks` cuenta `completed`\|`verified`; excluye `cancelled` y trashed; **no excluye `archived_at`** |
| Data | `goal_id` no nulo en **0 de 3** tasks |

### 15.2 Mecanismos paralelos

| Mecanismo | Clasificación | Evidencia |
|---|---|---|
| `planner_plans` (25 cols) | **DEAD** | 0 filas. Leído por `planner.attention.service.js:233,264`, `planner.search.service.js:245`, `planner.plans.service.js:244`. **El root Plan vivo es `planner_goals`** (`planner.plans.v1.service.js` lee/escribe `planner_goals`). ⇒ **Plans son invisibles en Attention y Search** |
| `planner_plan_requirements` (`external_kind`, `external_entity_id`) | **DEAD / EMPTY** | 0 filas. Sin FK a `planner_tasks`. `scripts/planner_m11_3a_contract_tests.js:185-189` afirma que `entityType:'task'` es **rechazado** como entidad de graph ⇒ **el link Task↔Plan por requirements está explícitamente cerrado** |
| `planner_m11_3a_plan_graph_foundation.sql` | **DEAD** | `scripts/planner_m11_3a_contract_tests.js:45-47` afirma que el Plan Graph **no crea FK ni altera `planner_tasks`** |
| `presets`/`drafts` con `entity_type='task'` | **EMPTY DB FOUNDATION** | 0 filas; sin writer de Task |

**Un solo vínculo Task↔Plan: `planner_tasks.goal_id`. Sin duplicados.**

### 15.3 Lo que se rompe si Task cambia

- `progress_mode='tasks'` de un Plan se recalcula **on-demand** en cada lectura de Plan (`planner.goals.service.js:166,189`). No hay trigger.
- Añadir `awaiting_verification` a las completadas, o archivar tasks, **cambia el progreso del Plan** sin aviso.
- Borrar un Plan (`ON DELETE SET NULL`) deja Tasks huérfanas **en silencio**: se desconectan del Plan y siguen vivas. Sin evento, sin audit.

---

## 17. ORIGIN MODEL (PART N)

| Columna | DB CHECK | Writers | Readers | FK | Data count |
|---|---|---|---|---|---|
| `origin_module` | `IN ('inventory','assets','finance','geni','automation','planner')` ó NULL | 1) `planner.tasks.service.js:671-678` (valida **5** valores, **no `planner`**) 2) `materialize_planner_responsibility_v1:192` (`'planner'`) 3) `inventory.service.js:550` | `inventory.service.js:482-485` | **NINGUNA** | 0 |
| `origin_entity_type` | `length(trim)>0` ó NULL | ídem | — | **NINGUNA** | 0 |
| `origin_entity_id` | — (sólo formato uuid en backend) | ídem | `inventory.service.js:482-485` | **NINGUNA** | 0 |
| `origin_reason` | `length(trim)>0` ó NULL | ídem | `inventory.service.js:485` | **NINGUNA** | 0 |

### 16.1 Contrato por origin

| `origin_module` | Writer | Semántica | Estado |
|---|---|---|---|
| `inventory` | `inventory.service.js:540-556` (approve restock request) | "Stock bajo detectado desde Inventario" → Task `template_key='shopping'`, `category='Compras'`, `origin_entity_type='inventory_item'`, `origin_reason ∈ ('low_stock','out_of_stock')`. **Reutiliza la Task existente** si ya hay una con el mismo origin + reason activo (`:482-485`) | **LEGACY ACTIVE** — único origen externo vivo |
| `assets` | — | — | **NOT FOUND** |
| `finance` | — | — | **NOT FOUND** |
| `geni` | — | — | **NOT FOUND** |
| `automation` | — | — | **NOT FOUND** |
| `planner` | `materialize_planner_responsibility_v1` | `origin_entity_type='responsibility'`, `origin_entity_id=<responsibility_id>`, `origin_reason='<sequence>:<scheduled_date>'` | **LIVE** (con 0 filas) |

### 16.2 Integridad real

**`origin_*` es METADATA PURA, sin integridad referencial en 3 de 4 columnas.**
- `origin_entity_id` puede apuntar a cualquier uuid, o a nada.
- **La validación JS y el CHECK de DB divergen**: el backend acepta `{inventory,assets,finance,geni,automation}`; la DB acepta además `planner`. Un cliente que envíe `origin_module:'planner'` recibe **400 `origin_module invalido`** aunque la DB lo permita.
- `planner_guard_task_fulfillment_projection:1383-1386` incluye `origin_*` en `v_ordinary_edit`, pero `mutate_planner_task_v0('update')` **no puede cambiarlos** (el SET de `:1114-1123` no los toca) ⇒ **`origin_*` es inmutable tras la creación** por la única vía de escritura.
- `materialize_…` escribe `origin_module='planner'` vía INSERT directo (SECURITY DEFINER), saltándose la validación JS.

---

## 18. TRASH / ARCHIVE / RESTORE (PART O)

### 17.1 Tasks — TRASH / RESTORE

| Aspecto | Detalle |
|---|---|
| Columns | `trashed_at`, `trashed_by_member_id` |
| RPC | `mutate_planner_task_v0('trash'\|'restore')` |
| Capability | **`task.restore` para AMBAS** (`controller:335`: *"trash uses restore capability"*). **No existe `task.trash`** |
| Default | `true` para coordinator/adult/adolescent/child/senior; **`false` para guest** |
| RLS | `planner_guard_task_fulfillment_projection:1359-1371`: exige `task.restore`; exige `trashed_by_member_id` = actor al trashear; prohíbe `trashed_by_member_id` no-null al restaurar |
| Side effects | **Ninguno** sobre assignment ni fulfillment. La Task conserva fulfillments operativas; queda inoperable por guard (`trashed_at IS NOT NULL → task_not_operational`) |
| UI | Lista: sólo `Mover a la papelera` funcional (`PlannerTasksScreen.tsx:495`); `Restaurar` **DEAD** (`:497`). Detalle: `Mover a la papelera` (`:1017`) + `Restaurar` (`:1019`) **funcionales**. Papelera transversal: `PlannerTrashScreen.tsx:118-120` restaura |
| Trash transversal | **SÍ** — `getTrashedTasks` (`planner.trash.service.js:4-31`), `type:'task'`, `child_count:0` |
| Activity | `audit_events task.trashed`/`task.restored`. **`planner_activity_log` NO se escribe** |

### 17.2 Tasks — ARCHIVE / UNARCHIVE

| Aspecto | Detalle |
|---|---|
| Column | `archived_at timestamptz NULL`, índice parcial `planner_tasks_household_archived_idx` |
| Semántica declarada | *"Orthogonal archive property; valid only for Completed/Verified tasks."* (`20260914000002:13-14`) |
| RPC | `archive_planner_task_v1` / `unarchive_planner_task_v1` |
| Precondición | `status IN ('completed','verified')` y `trashed_at IS NULL` |
| Capability | **`task.archive`** |
| **Default JS** | **`false` para los 6 roles** |
| **Default SQL** | **`else false`** — `planner_current_actor_has_capability` no tiene case para `task.archive` |
| **Runtime verificado** | `planner_current_actor_has_capability(h,'task.archive') = false` (3 households) |
| **Resultado** | `403 planner_forbidden`. **UNREACHABLE** |
| Side effects | `archived_at` + `planner_refresh_task_v0_projection` + `audit_events task.archived` |
| Consumidores del filtro | **sólo** `listTasks:485-487` (`include_archived`) |
| **NO filtra en** | summary (`:311`), attention, calendar (`:212`), search (`isActiveTask:43-45`), trash, home one-tap |
| UI | Detalle: `Archivar`/`Desarchivar` **visibles** (`TaskDetailScreen.tsx:1006-1010`) gated sólo por `isCompleted \|\| isVerified` — **sin consultar capability** ⇒ el botón aparece y **siempre falla 403**. Lista: presentes con `onPress` vacío (`:501,503`) ⇒ **DEAD**. Vista `Archivadas`: `PlannerTasksScreen.tsx:45,321` |
| Frontend lee `task.archive` | **NO** (0 lecturas; declarado en `plannerCapabilities.ts:38,79`) |

### 17.3 Responsibilities

| Aspecto | Detalle |
|---|---|
| Columns | `lifecycle` + `paused_at` + `archived_at` + `trashed_at` |
| RPC | **NINGUNO** — UPDATE directo |
| Capability | **NINGUNA** — el controller exige sólo `planner.view`; la RLS policy UPDATE también sólo `is_active_household_member` |
| Side effects | `setLifecycle('active')` ⇒ `materializeHousehold` ⇒ puede crear Task |
| Trash transversal | **NO** |
| UI | `ResponsibilityDetailScreen.tsx:21,31` expone `pause/resume/archive/unarchive/trash`; **`restore` nunca invocado** |

### 17.4 Confusión archive / trash / delete / cancel

| Concepto | Task | Responsibility | ¿Se confunde? |
|---|---|---|---|
| **cancel** | `status='cancelled'` + `cancelled_*`; fulfillment `inactive_at`; **reactivable** | **NO EXISTE** | **Asimetría total**: cancel es Task-only |
| **trash** | `trashed_at` | `lifecycle='trashed'` | Campos y semántica **distintos**; `cancel` no tiene equivalente en Responsibility |
| **archive** | `archived_at` (ortogonal, sólo completed/verified) | `lifecycle='archived'` | **Modelos incompatibles**: flag vs estado del ciclo |
| **delete** | **NO EXISTE** (sin `deleted_at`) | **NO EXISTE** (FK RESTRICT) | Consistente por ausencia |
| **unarchive/restore/resume** | `unarchive` (UNREACHABLE) / `restore` | **las 3 = `lifecycle='active'`**, indiscernibles | **Ambigüedad en Responsibility** |

---

## 19. CAPABILITIES (PART P)

### 18.1 Inventario

| Capability | JS default (6 roles) | SQL case | Override | Consumidores directos | Consumidores RPC | Consumidores RLS | Frontend | Dead? |
|---|---|---|---|---|---|---|---|---|
| `planner.view` | todos `true` | ✔ | ✔ | todos los controllers | todos los RPC | SELECT de las 8 tablas | `PlannerScreen:567` | no |
| `planner.search` | todos `true` excepto `guest:false` | **NO** (`else false`) | ✔ | search service | — | — | `QuickActionsMenu:103` | **SQL ausente** |
| `task.create_household` | coord/adult/adol/senior `true`; child/guest `false` | ✔ | ✔ | `createTask`, `responsibilities.create` | `mutate_…v0`, `materialize_…` | INSERT `planner_tasks` | `plannerQuickActions:51` | no |
| `task.create_personal` | coord/adult/adol/child/senior `true`; guest `false` | **NO** | ✔ | **NINGUNO** | **NINGUNO** | **NINGUNO** | `plannerQuickActions:50` (sólo visibilidad de Quick Action) | **DEAD** |
| `task.assign_self` | coord/adult/adol/child/senior `true`; guest `true` | **NO** | ✔ | **NINGUNO** | **NINGUNO** | **NINGUNO** | **NINGUNO** | **DEAD** |
| `task.assign_members` | coord/adult/senior `true`; resto `false` | **NO** | ✔ | **NINGUNO** (la asignación usa `edit_own`/`edit_any`) | `update_planner_task_assignment_v1` usa `edit_own`/`edit_any` | **NINGUNO** | **NINGUNO** | **DEAD** |
| `task.edit_own` | todos `true` | ✔ | ✔ | `updateTask`, `assertV1EditCapability` | `mutate_…v0('update')`, `update_planner_task_assignment_v1` | UPDATE policy, guard trigger | `canEditOwnTask` **0 callers** | helper DEAD |
| `task.edit_any` | coord/adult/senior `true`; resto `false` | ✔ | ✔ | ídem | ídem | ídem | `canEditAnyTask` **0 callers** | helper DEAD |
| `task.complete_assigned` | **todos `true`** | ✔ | ✔ | `completeTask`, `submitTaskEvidence` | `complete_planner_task_with_audit`, `claim`, `release`, `mutate_…fulfillment_v1` | — | `homeTaskOneTapEligibility:105` | no |
| `task.complete_unassigned` | sólo coordinator `true` | ✔ | ✔ | `completeTask` | ídem | — | `homeTaskOneTapEligibility:110` | no |
| `task.complete_any` | sólo coordinator `true` | ✔ | ✔ | `completeTask`, `assertV1FulfillmentCapability` | ídem | — | `homeTaskOneTapEligibility:98` | no |
| `task.verify` | coord/adult/senior `true`; adolescent/child/guest `false` | ✔ | ✔ | `verifyTask` | `verify_…_with_audit`, `mutate_…fulfillment_v1` | — | `canVerifyTask` **0 callers**; la UI usa `availableActions` | helper DEAD |
| `task.cancel_own` | todos `true` | ✔ | ✔ | `cancelTask`, `reactivateTask` | `mutate_…v0`, `planner_guard_task_fulfillment_projection` | UPDATE policy | `canCancelOwnTask` **0 callers** | helper DEAD |
| `task.cancel_any` | coord/adult/senior `true` | ✔ | ✔ | ídem | ídem | ídem | **NINGUNO** | no |
| `task.archive` | **TODOS `false`** | **NO** (`else false`) | ✔ | `archiveTaskV1`, `unarchiveTaskV1` | `archive_planner_task_v1`, `unarchive_planner_task_v1` | — | declarado, **0 lecturas** | **UNREACHABLE** |
| `task.restore` | todos `true` excepto `guest:false` | ✔ | ✔ | `trashTask`, `restoreTask` | `mutate_…v0('trash'/'restore')`, guard trigger | UPDATE policy | `canRestoreFromTrash` **0 callers** | — |
| `responsibility.*` | **NO EXISTE NINGUNA** | **NO** | — | — | — | — | — | **NOT FOUND** |
| `goal.restore` | ✔ | ✔ (`20260722010000:59`) | ✔ | `restore_goal_rpc` | — | — | — | fuera de alcance |

### 18.2 Divergencias JS/SQL detectadas

| Capability | JS default | SQL default | Divergencia |
|---|---|---|---|
| `planner.search` | `true` para 5 roles | **`false`** (no hay case) | **SÍ** — un guest con override que lo habilite pasa JS y falla SQL |
| `task.create_personal` | `true` para 5 roles | **`false`** | **SÍ** — pero sin consumidor, inocuo |
| `task.assign_self` | `true` para 5 roles | **`false`** | **SÍ** — sin consumidor |
| `task.assign_members` | `true` para 3 roles | **`false`** | **SÍ** — sin consumidor |
| `task.archive` | `false` | `false` | concuerda, pero **ambos paths bloquean** |
| `goal.restore` | ✔ | ✔ | concuerda |

**La función SQL lista 12 capabilities; el catálogo JS tiene 33.** 21 capabilities JS no tienen contraparte SQL.

### 18.3 Ausencia de capacidades de Responsibility

**No existe ninguna capability `responsibility.*`.** Consecuencias:
- `POST /responsibilities` reutiliza **`task.create_household`** ⇒ un `child` (que no puede crear Tasks) **no puede crear Responsibilities**, pero **sí puede editarlas, pausarlas, archivarlas y borrarlas** (sólo se exige `planner.view`).
- La RLS policy `planner_responsibilities_update` permite a **cualquier miembro activo** modificar **cualquier** responsabilidad del household.
- `planner_responsibility_members` DELETE está permitido a **cualquier miembro activo**.

---

## 20. RLS / GRANTS / IDENTITY (PART Q)

### 19.1 Por tabla

| Tabla | RLS | FORCE RLS | anon | authenticated | service_role |
|---|---|---|---|---|---|
| `planner_tasks` | ✔ | **NO** | **SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER** | completo | completo |
| `planner_task_assignment_configs` | ✔ | NO | **NINGUNO** | **SELECT sólo** | completo |
| `planner_task_assignees` | ✔ | NO | **NINGUNO** | **SELECT sólo** | completo |
| `planner_task_fulfillments` | ✔ | NO | **NINGUNO** | **SELECT sólo** | completo |
| `planner_task_evidence_attempts` | ✔ | NO | **NINGUNO** | **SELECT sólo** | completo |
| `planner_responsibilities` | ✔ | NO | **completo** | **completo** | completo |
| `planner_responsibility_members` | ✔ | NO | **completo** | **completo** | completo |
| `planner_responsibility_occurrences` | ✔ | NO | **completo** | **completo** (sin DELETE) | completo |

### 19.2 Policies (todas `PERMISSIVE`, `TO authenticated`)

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `planner_tasks` | `is_active_household_member AND planner.view` | `is_active_household_member AND task.create_household AND creator=current member AND creator=current person AND status='pending' AND todo terminal metadata NULL AND trashed NULL AND assignee ∈ household activo` | `is_active_household_member AND planner.view AND (own→(edit_own∨cancel_own∨restore) ∨ !own→(edit_any∨cancel_any∨restore))` con `with check` de assignee | **NINGUNA** |
| `planner_task_assignment_configs` | `is_active_household_member AND planner.view` | — | — | — |
| `planner_task_assignees` | ídem | — | — | — |
| `planner_task_fulfillments` | ídem | — | — | — |
| `planner_task_evidence_attempts` | ídem | — | — | — |
| `planner_responsibilities` | `is_active_household_member AND planner.view` | `is_active_household_member AND created_by_member_id = current_household_member_id(household_id)` | **`is_active_household_member`** | **NINGUNA** |
| `planner_responsibility_members` | **`is_active_household_member`** | **`is_active_household_member`** | **`is_active_household_member`** | **`is_active_household_member`** |
| `planner_responsibility_occurrences` | **`is_active_household_member`** | **`is_active_household_member`** | **`is_active_household_member`** | **NINGUNA** |

### 19.3 SECURITY DEFINER / INVOKER

- **DEFINER:** `planner_current_actor_has_capability`, `current_person_id`, `current_household_member_id`, `is_active_household_member`, todos los RPC de Task, `materialize_planner_responsibility_v1`, todos los helpers internos de fulfillment, `planner_v2_append_audit`, `planner_v2_reserve_idempotency`. Todos fijan `search_path`.
- **INVOKER:** `planner_responsibility_touch_version` (disparado por trigger), `planner_task_checklist_is_valid` (CHECK), `set_updated_at`, `increment_planner_version`.

### 19.4 Derivación de actor

| Dato | Fuente | ¿Client-supplied? |
|---|---|---|
| `auth.uid()` | JWT | no |
| `current_person_id()` | `people.auth_user_id = auth.uid()` | no |
| `current_household_member_id(household_id)` | `household_members` por `person_id` + `status='active'` | no |
| `p_actor_account_id`, `p_actor_membership_id` en `complete_planner_task_with_audit` | parámetros | **SÍ, pero validados** (`'actor spoofing rejected'`, `:1526-1530`) |
| `restore_goal_rpc(p_member_id)` | parámetro | **SÍ, pero validado** (`:1775-1777`) |
| `created_by_*` en `mutate_planner_task_v0('create')` | **NO** — derivados internamente | n/a |

**Anti-spoofing: ACEPTABLE en Task.**

### 19.5 Findings de seguridad (configuración, sin explotar)

| # | Finding | Severidad | Evidencia |
|---|---|---|---|
| **S1** | **`anon` tiene privilegio de tabla COMPLETO** sobre `planner_tasks`, `planner_responsibilities`, `planner_responsibility_members`, `planner_responsibility_occurrences`. **Mitigado por RLS** (no hay policy `anon` ⇒ 0 filas). Proviene de privileges por defecto del schema, no de un `grant` explícito | **P1 (higiene)** | `information_schema.role_table_grants` |
| **S2** | **`anon` tiene EXECUTE** sobre `materialize_planner_responsibility_v1` (privilegio por defecto `PUBLIC`). Mitigado por guard interno `is_active_household_member` + `task.create_household` | **P2** | `pg_proc.proacl` = `{=X/postgres, anon=X/…}` |
| **S3** | **`planner_responsibilities` UPDATE no exige capability** ⇒ cualquier miembro activo (incluido `child`, `guest`) puede modificar **cualquier** responsabilidad: título, schedule, `next_sequence`, `requires_adjustment_reason` | **P1** | `planner_responsibilities_update` policy |
| **S4** | **`planner_responsibility_members` INSERT/UPDATE/DELETE no exige capability** ⇒ cualquier miembro activo puede alterar el roster | **P1** | 3 policies |
| **S5** | **`planner_responsibility_occurrences` INSERT/UPDATE concedidos a `authenticated`** con sólo `is_active_household_member` ⇒ un cliente puede **forjar una occurrence** apuntando a cualquier Task del household y **resolver** occurrences ajenas (`UPDATE resolved_at`), eludiendo por completo `materialize_planner_responsibility_v1` (locking, `next_sequence`, one-live guard). Puede **desbloquear** la materialización de una responsibility o **saturarla** | **P0** | `planner_responsibility_occurrences_insert/update` policies + `grant SELECT, INSERT, UPDATE to authenticated` (`20260916000001:103`) |
| **S6** | `FORCE ROW LEVEL SECURITY` = `false` en las 8 tablas ⇒ owner (`postgres`) y `service_role` (BYPASSRLS) evaden RLS. `service_role` tiene `ALL` | **P1 (esperado)** | `pg_class.relforcerowsecurity` |
| **S7** | `planner_tasks` sin policy DELETE ⇒ borrado bloqueado por RLS para `authenticated` | P3 | |
| **S8** | `planner_tasks.household_id`/`id` inmutables por trigger (`'task household and identity are immutable'`, 42501) | **OK** | `:1275-1278` |
| **S9** | `created_by_*` inmutables (`:1280-1284`); `version` inmutable (`:1286-1288`) | **OK** | |
| **S10** | `set_config('homeplus.planner_internal_projection','on')` salta el guard completo. Como la RPC es DEFINER y sólo `service_role` puede ejecutarla, no es explotable por `authenticated` | **OK (con nota)** | `:1463-1479` |

---

## 21. API MAP (PART R)

Base: `/api/planner`.

### 20.1 Tasks — V0 (`routes/planner.js:93-102`)

| METHOD | PATH | Controller | Servicio | RPC | Capability | Headers req. | Frontend | reachable |
|---|---|---|---|---|---|---|---|---|
| GET | `/tasks` | `listTasks` | `listTasks` | — | `planner.view` | — | `PlannerTasksScreen:213`, `TaskForm:285`, `PlanDetailV1:68,81` | **LIVE** |
| GET | `/tasks/:id` | `getTaskById` | `getTaskOrThrow` | — | `planner.view` | — | `TaskDetail:474`, `ResponsibilityDetail:22` | **LIVE** |
| POST | `/tasks` | `createTask` | `createTask` | `mutate_planner_task_v0('create')` | `task.create_household` | `X-Mutation-Id`, `Idempotency-Key` | `productiveAdapters:128` | **LIVE** |
| PATCH | `/tasks/:id` | `updateTask` | `updateTask` | `…('update')` | `edit_own`/`edit_any` | + `If-Match` | `TaskDetail:974`, `PlanDetailV1:201,225` | **LIVE** |
| DELETE | `/tasks/:id` | `cancelTask` | `cancelTask` | `…('cancel')` | `cancel_own`/`cancel_any` | ídem | `productiveAdapters:135` | **LIVE** |
| POST | `/tasks/:id/trash` | `trashTask` | `trashTask` | `…('trash')` | **`task.restore`** | ídem | `PlannerTasksScreen:444`, `TaskDetail:833` | **LIVE** |
| POST | `/tasks/:id/restore` | `restoreTask` | `restoreTask` | `…('restore')` | `task.restore` | ídem | `PlannerTrashScreen:119`, `TaskDetail:854` | **LIVE** |
| POST | `/tasks/:id/reactivate` | `reactivateTask` | `reactivateTask` | `…('reactivate')` | `cancel_own`/`cancel_any` | ídem | `PlannerTasksScreen:416`, `TaskDetail:879` | **LIVE** |
| POST | `/tasks/:id/complete` | `completeTask` | `completeTask` | `…('complete')` | `complete_assigned`/`_unassigned`/`_any` | ídem | `productiveAdapters:137` | **LIVE** |
| POST | `/tasks/:id/verify` | `verifyTask` | `verifyTask` | `…('verify')` | `task.verify` | ídem | `productiveAdapters:139` | **LIVE** |
| GET | `/tasks/:id/audit` | `getTaskAuditHistory` | idem | — | `planner.view` | — | `TaskDetail:489` | **LIVE** |
| GET | `/tasks/:id/evidence` | `getTaskEvidenceHistory` | idem | — | `planner.view` | — | `TaskDetail:488` | **LIVE (siempre vacío)** |
| POST | `/tasks/:id/evidence/:fulfillmentId` | `submitTaskEvidence` | `submitTaskEvidence` | — | `planner.view` + `complete_assigned` | `X-Mutation-Id`, `Idempotency-Key` | `TaskDetail:764` | **DEAD — grant-blocked (§9)** |

### 20.2 Tasks — V1 (`routes/planner.js:76-87`)

| METHOD | PATH | Controller | RPC | Capability | Frontend | reachable |
|---|---|---|---|---|---|---|
| GET | `/v1/tasks/:taskId/fulfillment` | `getTaskFulfillmentV1` | — | `planner.view` | `TaskDetail:487`, `TaskForm:315` | **LIVE** |
| PUT | `/v1/tasks/:taskId/assignment` | `updateTaskAssignmentV1` | `update_planner_task_assignment_v1` | `planner.view` + `edit_own`/`edit_any` | `TaskForm:706` | **LIVE** |
| POST | `/v1/tasks/:taskId/claim` | `claimTaskV1` | `claim_planner_task_v1` | `planner.view` + `complete_assigned` | `TaskDetail:693` | **LIVE** |
| POST | `/v1/tasks/:taskId/release` | `releaseTaskV1` | `release_planner_task_v1` | `planner.view` + `complete_assigned` | `TaskDetail:908` | **LIVE** |
| POST | `/v1/tasks/:taskId/archive` | `archiveTaskV1` | `archive_planner_task_v1` | **`task.archive` = false** | `TaskDetail:937` | **UNREACHABLE (403)** |
| POST | `/v1/tasks/:taskId/unarchive` | `unarchiveTaskV1` | `unarchive_planner_task_v1` | **`task.archive` = false** | `TaskDetail:957` | **UNREACHABLE (403)** |
| POST | `/v1/tasks/:taskId/fulfillments/:fid/complete` | `completeTaskFulfillmentV1` | `mutate_planner_task_fulfillment_v1('complete')` | `planner.view` + complete | `TaskDetail:733` | **LIVE** |
| POST | `…/verify` | `verifyTaskFulfillmentV1` | `…('verify')` | `planner.view` + `task.verify` | `TaskDetail:789` | **LIVE** |
| POST | `…/request-correction` | `requestTaskCorrectionV1` | `…('request_correction')` | `planner.view` + `task.verify` | importado, **nunca invocado** | **API LIVE / UI DEAD** |
| POST | `…/resubmit` | `resubmitTaskFulfillmentV1` | `…('resubmit')` | `planner.view` + responsible | `TaskDetail:807` | **LIVE** |
| POST | `…/revert` | `revertTaskFulfillmentV1` | `…('revert')` | ídem | importado, **nunca invocado** | **API LIVE / UI DEAD** |
| POST | `…/reopen` | `reopenTaskFulfillmentV1` | `…('reopen')` | `planner.view` + `task.verify` | importado, **nunca invocado** | **API LIVE / UI DEAD** |

### 20.3 Responsibilities (`routes/planner.js:39-49`)

| METHOD | PATH | Controller | Servicio | Tabla/RPC | Capability | Frontend | reachable |
|---|---|---|---|---|---|---|---|
| GET | `/responsibilities?lifecycle=` | `list` | `listResponsibilities` (+`materializeHousehold`) | `planner_responsibilities`, `_members`, `_occurrences` | `planner.view` | `ResponsibilitiesScreen:18` | **LIVE** |
| POST | `/responsibilities` | `create` | `createResponsibility` | INSERT `_responsibilities` + DELETE/INSERT `_members` + `materializeHousehold` | **`task.create_household`** | `ResponsibilityFormScreen:35` | **LIVE** |
| GET | `/responsibilities/:id` | `get` | `getResponsibility` → `listResponsibilities` → `materializeHousehold` (**2 veces**) | SELECT | `planner.view` | `ResponsibilityDetail:17`, `Form:28` | **LIVE** |
| PATCH | `/responsibilities/:id` | `update` | `updateResponsibility` | UPDATE + members + `materializeHousehold` | **`planner.view` sólo** | `ResponsibilityFormScreen:35` | **LIVE** |
| POST | `/responsibilities/:id/pause` | `pause` | `setLifecycle('paused')` | UPDATE | **`planner.view`** | `ResponsibilityDetail:21` | **LIVE** |
| POST | `/responsibilities/:id/resume` | `resume` | `setLifecycle('active')` | UPDATE + `materializeHousehold` | **`planner.view`** | `ResponsibilityDetail:21` | **LIVE** |
| POST | `/responsibilities/:id/archive` | `archive` | `setLifecycle('archived')` | UPDATE | **`planner.view`** | `ResponsibilityDetail:21` | **LIVE** |
| POST | `/responsibilities/:id/unarchive` | `unarchive` | `setLifecycle('active')` | UPDATE + `materializeHousehold` | **`planner.view`** | `ResponsibilityDetail:21` | **LIVE** |
| POST | `/responsibilities/:id/trash` | `trash` | `setLifecycle('trashed')` | UPDATE | **`planner.view`** | `ResponsibilityDetail:21` | **LIVE** |
| POST | `/responsibilities/:id/restore` | `restore` | `setLifecycle('active')` | UPDATE + `materializeHousehold` | **`planner.view`** | **nunca invocado** | **API LIVE / UI DEAD** |
| POST | `/responsibilities/:id/current-task/replace-assignee` | `replaceCurrentAssignee` | → `updateTaskAssignmentV1` | `update_planner_task_assignment_v1` | `edit_own`/`edit_any` (de la **Task**) | `ResponsibilityDetail:22` | **LIVE** |

### 20.4 Lectores transversales

| METHOD | PATH | Tablas | Filtros | Nota |
|---|---|---|---|---|
| GET | `/summary` | `planner_tasks`, `planner_events`, `planner_goals` | tasks: `household`, `status<>'cancelled'`, `trashed_at IS NULL` | **NO** filtra `archived_at` |
| GET | `/attention` | `planner_task_fulfillments`, `planner_tasks`, `planner_plans`(vacío), `planner_events` | fulfillments: `status IN ('awaiting_verification','correction_requested')`, `retired_at IS NULL`, `inactive_at IS NULL` | **NO** filtra `archived_at`; lee `planner_plans` vacío |
| GET | `/search` | `planner_tasks`, `planner_events`, `planner_plans` | `isActiveTask` = `trashed_at IS NULL AND status<>'cancelled'` | **NO** filtra `archived_at` |
| GET | `/calendar` | `planner_tasks` | `trashed_at IS NULL` | **NO** filtra `archived_at` ni `status` |
| GET | `/trash` | `planner_tasks`, `planner_events`, `planner_goals`, `planner_goal_milestones` | `trashed_at IS NOT NULL` | **NO incluye responsibilities** |
| GET | `/activity` | `planner_activity_log` | `entity_type ∈ ('task','event','goal','milestone')` | **Tasks nunca escriben aquí** |
| GET | `/capabilities` | `households.config`, `household_members` | — | proyección |

---

## 22. FRONTEND REAL (PART S)

### 21.1 Task screens y componentes

| Artefacto | Ruta | Estado |
|---|---|---|
| `PlannerTasksScreen` | `screens/planner/PlannerTasksScreen.tsx:178` | **LIVE** — componente embebido en `PlannerScreen.tsx:757-772` (**no es ruta propia**) |
| `TaskDetailScreen` | `screens/planner/TaskDetailScreen.tsx:427` | **LIVE** — ruta `TaskDetail` + deep link `tasks/:entityId` |
| `TaskForm` | `screens/planner/TaskForm.tsx:165` | **LIVE** — 2 superficies: sheet embebida + rutas `CreateTask`/`EditTask` |
| `CreateTaskScreen` / `EditTaskScreen` | wrappers de 5 líneas | **LIVE** |
| `TaskRow` | `PlannerTasksScreen.tsx:95-176` | **LIVE** |
| Task ActionSheet (lista) | `PlannerTasksScreen.tsx:617-639` | **LIVE** |
| Task ActionSheet (detalle) | `TaskDetailScreen.tsx:1418-1440` | **LIVE** |
| Checklist | `TaskDetailScreen.tsx:1334-1348`, toggle `:968-982` | **LIVE** |
| Evidencia (lectura) | `TaskDetailScreen.tsx:1351-1394` | **LIVE (siempre vacío)** |
| `EvidencePhotoPicker` | `components/planner/EvidencePhotoPicker.tsx:18` | **LIVE** — único entrypoint `TaskDetailScreen:1443-1456` |
| Home task widget (1-tap) | `screens/home/HomePlannerSections.tsx:367` | **LIVE** — montado en los 4 Homes |
| Home task widget (legacy) | `HomeAdulto.tsx:129-239`, `HomeAdolescente.tsx:142-208`, `HomeAdultoMayor.tsx:131-155` | **UNREACHABLE** — dentro de `{false ? … : null}` |
| Quick Action → Task | `components/planner/QuickActionsMenu.tsx:73,77-81` | **LIVE** |
| `components/ui/QuickActionSheet.tsx` | `:16` | **DEAD** — sólo re-export, nunca renderizado |
| Deep Link → Task | `App.tsx:48`, parser `plannerDeepLinkParser.ts:259-265` | **LIVE** |
| Calendar: chip de tarea | `PlannerCalendarComponents.tsx:213-261` | **LIVE** |
| `GoalDetailScreen.tsx` | `:64` | **DEAD** — nunca importado |
| `PlannerGoalsScreen.tsx`, `PlannerSchedulesScreen.tsx`, `PlannerPlansScreen.tsx` | | **DEAD** |

### 21.2 Responsibilities

| Elemento | Ruta | Estado |
|---|---|---|
| Lista (filtros Activas/Pausadas/Archivadas) | `screens/planner/ResponsibilitiesScreen.tsx:13` | **LIVE** — ruta `Responsibilities` |
| Form create/edit | `ResponsibilityFormScreen.tsx:20` | **LIVE** — rutas `ResponsibilityCreate`/`ResponsibilityEdit` |
| Detalle + lifecycle | `ResponsibilityDetailScreen.tsx:12` | **LIVE** — ruta `ResponsibilityDetail` |
| Tipos | `services/plannerResponsibilities.ts:4-29` | **LIVE** |
| Piezas embebidas en Tasks | `PlannerTasksScreen.tsx:560-563` (entrada), `:478,491-494` (oculta "Cancelar" si `responsibility_id`), `TaskDetailScreen.tsx:1250-1256` (link al origen) | **LIVE** |
| "Se repite" / asignación / rotación | `ResponsibilityFormScreen.tsx:41,44,45` | **LIVE** |
| Deep links | — | **NOT FOUND** |
| Capability `responsibility.*` | — | **NOT FOUND** (no existe en el union del frontend ni en backend) |

### 21.3 Acciones visibles → endpoint → capability

| UI Label | Cliente | Endpoint | Tabla/RPC | Capability | State dependency | REACHABLE? | WORKS STRUCTURALLY? |
|---|---|---|---|---|---|---|---|
| **Crear tarea** (Quick Action / `+`) | `createPlannerTask` | `POST /tasks` | `planner_tasks` | `task.create_household` (JS+SQL) | — | ✔ | ✔ |
| **Editar** | `updatePlannerTask` | `PATCH /tasks/:id` | `planner_tasks` | `edit_own`/`edit_any` | no cancelled/trashed | ✔ | ✔ |
| **Completar** (lista) | `completePlannerTask` | `POST /tasks/:id/complete` | `planner_task_fulfillments` | `complete_*` | `status==='pending'` ∧ `!trashed` | ✔ | ✔ |
| **Enviar a revisión** / **Completar** (detalle) | `completePlannerTaskFulfillmentV1` | `POST /v1/…/complete` | `planner_task_fulfillments` | `complete_*` | `fulfillment.status==='pending'` | ✔ | ✔ |
| **Verificar** (lista) | `verifyPlannerTask` | `POST /tasks/:id/verify` | `planner_task_fulfillments` | `task.verify` | `status==='awaiting_verification'` ∧ **yo no la completé** | ✔ | ✔ |
| **Verificar** (detalle) | `verifyPlannerTaskFulfillmentV1` | `POST /v1/…/verify` | ídem | `task.verify` | ídem | ✔ | ✔ |
| **Revisar** (`awaiting_verification`) | `verifyPlannerTask` | `POST /tasks/:id/verify` | ídem | `task.verify` | `!isCompleter` | ✔ | ✔ |
| **Reenviar** (`correction_requested`) | `resubmitPlannerTaskFulfillmentV1` | `POST /v1/…/resubmit` | `planner_task_fulfillments` | responsible | `status==='correction_requested'` | ✔ | ✔ |
| **Me encargo** (claim) | `claimPlannerTaskV1` | `POST /v1/…/claim` | config+assignees | `complete_assigned` | `availableActions` incluye `claim` | ✔ | ✔ |
| **Devolver** (release) | `releasePlannerTaskV1` | `POST /v1/…/release` | config+assignees | `complete_assigned` | `kind='members'` ∧ 1 assignee = yo ∧ `shared` ∧ `pending` | ✔ | ✔ |
| **Cancelar tarea** (lista) | `cancelPlannerTask` | `DELETE /tasks/:id` | `planner_tasks` | `cancel_own`/`cancel_any` | `!cancelled` ∧ **sin `responsibility_id`** | ✔ | ✔ |
| **Cancelar tarea** (detalle) | — | — | — | — | — | **NO EXISTE** (`enqueuePlannerTaskCancel` importado, nunca invocado) |
| **Reactivar** | `reactivatePlannerTask` | `POST /tasks/:id/reactivate` | `planner_tasks` | `cancel_*` | `status==='cancelled'` | ✔ | ✔ |
| **Mover a la papelera** | `trashPlannerTask` | `POST /tasks/:id/trash` | `planner_tasks` | **`task.restore`** | `!trashed` | ✔ | ✔ |
| **Restaurar** (detalle) | `restorePlannerTask` | `POST /tasks/:id/restore` | `planner_tasks` | `task.restore` | `trashed` | ✔ | ✔ |
| **Restaurar** (lista) | — | — | — | — | `trashed` | **DEAD** (`onPress` vacío, `PlannerTasksScreen.tsx:497`) |
| **Restaurar** (Papelera) | `restorePlannerTask` | `POST /tasks/:id/restore` | `planner_tasks` | `task.restore` | `item.type==='task'` | ✔ | ✔ |
| **Archivar** (detalle) | `archivePlannerTaskV1` | `POST /v1/…/archive` | `planner_tasks` | **`task.archive` = false** | `completed`\|`verified` ∧ `!trashed` | ✔ (botón visible) | **NO — siempre 403** |
| **Desarchivar** (detalle) | `unarchivePlannerTaskV1` | `POST /v1/…/unarchive` | ídem | **`task.archive` = false** | `archived_at` | ✔ (botón visible) | **NO — siempre 403** |
| **Archivar/Desarchivar** (lista) | — | — | — | — | — | **DEAD** (`:501,503` onPress vacío) |
| Ver `Archivadas` | `listPlannerTasks` | `GET /tasks?include_archived=true` | `planner_tasks` | `planner.view` | `archived_at` truthy | ✔ | ✔ (siempre vacío hoy) |
| **Enviar foto** (evidence) | `submitTaskEvidence` | `POST /tasks/:id/evidence/:fid` | `planner_task_evidence_attempts` | `complete_assigned` | `requires_verification===true` ∧ `fulfillment.status==='pending'` | ✔ | **NO — grant-blocked** |
| **Pedir corrección** | `requestPlannerTaskCorrectionV1` | `POST /v1/…/request-correction` | `planner_task_fulfillments` | `task.verify` | — | **DEAD** (importado, nunca invocado) |
| **Revertir** | `revertPlannerTaskFulfillmentV1` | `POST /v1/…/revert` | ídem | responsible | — | **DEAD** |
| **Reabrir** | `reopenPlannerTaskFulfillmentV1` | `POST /v1/…/reopen` | ídem | `task.verify` | — | **DEAD** |
| **Ver auditoría** | `getTaskAuditHistory` | `GET /tasks/:id/audit` | `audit_events` | `planner.view` | — | ✔ | ✔ |
| **Ver evidencia** (historial) | `getTaskEvidenceHistory` | `GET /tasks/:id/evidence` | `planner_task_evidence_attempts` | `planner.view` | — | ✔ | ✔ (siempre vacío) |
| **Guardar como preset** | `planner.presets-drafts` | `POST /planner/drafts`, `/presets` | `planner_drafts`, `planner_presets` | — | `!trashed` | ✔ | ✔ (0 filas hoy) |

### 21.4 Responsabilidades — acciones visibles

| UI Label | Cliente | Endpoint | Capability | REACHABLE? | WORKS? |
|---|---|---|---|---|---|
| **Ver responsabilidades** (fila en Tasks) | `listResponsibilities` | `GET /responsibilities` | `planner.view` | ✔ | ✔ |
| **Crear responsabilidad** | `createResponsibility` | `POST /responsibilities` | **`task.create_household`** | ✔ | ✔ |
| **Editar responsabilidad** | `updateResponsibility` | `PATCH /responsibilities/:id` | `planner.view` | ✔ | ✔ |
| **Pausar / Reanudar / Archivar / Desarchivar / Papelera** | `changeResponsibilityLifecycle` | `POST /responsibilities/:id/{action}` | `planner.view` | ✔ | ✔ |
| **Restaurar** | `changeResponsibilityLifecycle('restore')` | `POST /responsibilities/:id/restore` | `planner.view` | **DEAD** (nunca invocado) |
| **Cambiar responsable de la tarea actual** | `replaceResponsibilityCurrentAssignee` | `POST /responsibilities/:id/current-task/replace-assignee` | `edit_own`/`edit_any` (Task) | ✔ | ✔ |
| **Eliminar responsabilidad** | — | — | — | **NO EXISTE** | — |

### 21.5 Branches de status en UI

| Superficie | Branches / etiquetas |
|---|---|
| `PlannerTasksScreen` vistas (`:317-323`) | `Pendientes` = `['pending','awaiting_verification'` ∧ `!archived_at`; `Hechas` = `['completed','verified'` ∧ `!archived_at`; `Archivadas` = `archived_at` truthy; `trashed_at` siempre filtrada (`:318`) |
| `PlannerTasksScreen` ActionSheet (`:466-507`) | `cancelled∧!trashed`→Reactivar; `pending`→Completar; `awaiting_verification∧!isCompleter`→Revisar; `!cancelled∧!responsibility_id`→Cancelar; `!trashed`→Papelera; `trashed`→Restaurar (**DEAD**); `completed\|verified`→Archivar/Desarchivar (**DEAD**) |
| `PlannerTasksScreen` inline (`:134-135,158-170`) | sólo `primaryAction.key ∈ ['verify','reactivate','submit_for_verification']`. `claim`, `complete`, `resubmit`, `restore` **se descartan** |
| `TaskDetailScreen` badge (`:418-425`) | `pending`→"Pendiente"; `completed`→"Completada"; `awaiting_verification`→"En verificación"; `verified`→"Verificada"; `cancelled`→"Cancelada". `correction_requested` definido en `:424` = **clave muerta** |
| `TaskDetailScreen` primaria (`:646-677`) | `cancelled`/`trashed`→ninguna; `isClaimedByMe`→"Devolver"; `isClaimable`→"Me encargo"; `isPending`→"Enviar a revisión"/"Completar"; `isAwaitingVerification`→"Verificar"; `isCorrectionRequested`→"Reenviar"; `completed`/`verified`→**ninguna** |
| `TaskDetailScreen` menú (`:999-1020`) | `!cancelled∧!trashed`→Editar; `!trashed`→Preset; `completed\|verified`→Archivar/Desarchivar; `cancelled`→Reactivar; `!trashed`→Papelera; `trashed`→Restaurar. **NO hay "Cancelar tarea"** |
| `PlannerCalendarComponents.tsx:213-227` | 4 ramas con etiquetas; menú `:230-261` |
| `PlannerPlanDetailScreenV1.tsx:538-542` | 3 ramas |
| `PlannerTrashScreen.tsx:53-63` | mapa `STATUS_LABELS` por `item.status` (typed `string`) |
| `HomePlannerSections.tsx:49-52` | sólo `pending`/`awaiting_verification` |

### 21.6 Assignment UI

| Capacidad | UI | Evidencia |
|---|---|---|
| Elegir responsable | **SÍ** — ActionSheet con chips `Sin responsable` / `Disponible para tomar` / un chip por miembro; cada tap **reemplaza** | `TaskForm.tsx:1194-1200` |
| **Multi-assignee** | **UNREACHABLE** — el rail de avatares multi-select está dentro de `{false ? (…): null}` (`TaskForm.tsx:827` → `:1114-1115`); el ActionSheet sólo permite 1 miembro. El texto "Tarea compartida: cualquiera de las N personas…" es **código muerto** (`:1022-1026`) | |
| Modo `each_person` | **NO CONFIGURABLE** — los 3 caminos de `TaskForm.tsx:679-707` envían siempre `fulfillmentMode: 'shared_once'` (`:684,:690,:699`). El tipo existe y **se lee/etiqueta** en el detalle (`TaskDetailScreen.tsx:1307-1313` → "Individual (cada uno completa)") pero ningún control lo establece | |
| `legacy_unassigned` | **NO SE ENVÍA NUNCA** — el comentario en `TaskForm.tsx:693-702` dice que se usaría para "unassigned" pero el código envía `assignmentKind:'members', memberIds: []` | |
| Claim / Release | **SÍ** (`TaskDetailScreen.tsx:655-657,686-707` / `:651-653,894-921`), gated por `availableActions`, no por capability | |
| `change_assignment` como action key | **DEAD** — la clave existe en el tipo (`types/plannerTaskV1.ts:19`) y en el label map, pero ningún handler la ejecuta | |

### 21.7 Recurrencia UI para Tasks

| Búsqueda | Resultado |
|---|---|
| Control de repetición/frecuencia en `TaskForm` | **NOT FOUND** — el payload (`TaskForm.tsx:621-642`) no incluye ningún campo de recurrencia; `CreatePlannerTaskPayload` tampoco |
| `recurrenceRule` | existe sólo en `PlannerTaskFormValues` (`plannerTaskAdapters.ts:75`) y en el adapter **DEAD** `plannerTaskFormContractAdapter` (`:404-423`) |
| `recurrence`/`recurrenceSummary` en `PlannerTask` | sólo lectura (`plannerTasks.ts:85-91`); el backend **nunca los emite**; se calculan en `plannerTaskAdapters.ts:284,291,307` y sólo entran al `accessibilityLabel`, que `PlannerTasksScreen` **no consume** |
| DB: columna `recurrence` en `planner_tasks` | **NO EXISTE** |
| Recurrencia real disponible | **sólo vía Responsibility** (`ResponsibilityFormScreen.tsx:17,45`) |

### 21.8 Capabilities consumidas en UI

| Capability | ¿Se lee? | Dónde |
|---|---|---|
| `planner.view` | **SÍ** | `PlannerScreen.tsx:567` |
| `planner.search` | **SÍ** | `QuickActionsMenu.tsx:103-104` |
| `task.create_personal` / `task.create_household` | **SÍ** | `plannerQuickActions.ts:50-51` (guard local re-implementado) |
| `task.complete_assigned` / `_any` / `_unassigned` | **SÍ** | `homeTaskOneTapEligibility.ts:98,105,110` |
| **`task.verify`** | **NO** | `canVerifyTask` (`plannerCapabilitiesAdapter.ts:174-176`) tiene **0 callers**. La verificación se habilita por `availableActions`/aggregate |
| **`task.archive`** | **NO** | declarado (`:38,:79`), **0 lecturas**. El botón se muestra por `isCompleted\|\|isVerified` sin capability ⇒ **siempre 403** |
| `task.restore` | **NO** | `canRestoreFromTrash` **0 callers** |
| `task.edit_own` / `task.edit_any` | **NO** | `canEditOwnTask`/`canEditAnyTask` **0 callers** |
| `task.cancel_own` | **NO** | `canCancelOwnTask` **0 callers** |
| `task.assign_self` / `task.assign_members` | **NO** | ninguna lectura |
| `responsibility.*` | **NO EXISTE** | — |
| Otros DEAD | `canEditOwnEvent`, `canManageEventParticipants`, `canCloseOwnGoal`, `canRestoreGoal`, `plannerCapabilitiesAdapter.canCreateAnyTask`, `evaluateQuickActionCapabilities`, `getEnabledQuickActions`, `isQuickActionEnabled`, `hasAllPlannerCapabilities`, `hasAnyPlannerCapabilities`, `canSearchPlanner` | **0 callers** |
| `services/planner/plannerTransitionCoordinator.ts` | **DEAD** (archivo completo, 0 importers) | |

### 21.9 Clientes DEAD

`createPlannerTaskMutation` (`plannerTasks.ts:299`), `completePlannerTaskOptimistic` (`:657`), `submitPlannerTaskForVerification` (`:383`, sólo referenciada por un test huérfano), `deletePlannerEvidencePhoto`/`getEvidencePhotoUrl` (`plannerEvidence.ts:38,54`), `services/tasks.ts` (archivo completo), `components/ui/QuickActionSheet.tsx`, `plannerTaskCreateFormAdapter`/`plannerTaskEditFormAdapter`/`plannerMutationReducers`/`getPlannerTaskCacheKeys`/`plannerTaskVisualStateMatrix`/`plannerFrontendCoreRootAdapters`/`plannerFrontendCoreTabs`, `changeResponsibilityLifecycle('restore')`.

### 21.10 Bug de navegación detectado

`PlannerPlanDetailScreenV1.tsx:528-533` navega a `TaskDetail` con `{ taskId }`, pero `parsePlannerEntityDetailParams` exige `entityId` UUID (`navigation/plannerNavigationContract.ts:322-324`). El `catch` de `TaskDetailScreen.tsx:437-442` deja `entityId=''` → `load()` retorna en `:464` **sin setear `loading=false`** ⇒ **pantalla en estado de carga infinito al abrir una Task desde Plan Detail**.

---

## 23. CROSS-PLANNER (PART T)

| SOURCE | DESTINATION | ID SPACE | READ/WRITE | LIVE? | WHAT BREAKS IF TASK CHANGES | WHAT BREAKS IF RESPONSIBILITY CHANGES |
|---|---|---|---|---|---|---|
| **Auth** (`auth.uid`) | `current_person_id()` → `current_household_member_id()` | uuid / uuid | R | ✔ | Actor derivado cambia ⇒ todas las capabilities `*_own` cambian de eje | Idem (el guard de `materialize_…` usa el mismo actor) |
| **Household** | `households.config.permissions[cap][role]` | text/jsonb | READ | ✔ (11 de 116 households) | Un override de `task.*` cambia la autorización de Tasks | **No existe override `responsibility.*`** ⇒ Responsibilities no son configurables |
| **Plans** (`planner_goals`) | `planner_tasks.goal_id` | uuid | READ+WRITE | ✔ (0 filas con vínculo hoy) | Cambiar `status` de Task cambia `progress_mode='tasks'`; borrar Plan ⇒ `SET NULL` silencioso | `task_defaults.goal_id` puede apuntar a cualquier Plan (validado en DB por FK) |
| **Plans v2 (`planner_plans`)** | `planner_tasks` | — | READ | **DEAD (0 filas)** | Ninguna | Ninguna. **Pero `attention` y `search` leen esta tabla ⇒ Plans invisibles** |
| **Calendar** | `planner_tasks` (`due_date`,`due_time`,`status`,`archived_at`) | uuid | READ | ✔ | `archived_at` **no** se filtra ⇒ Task archivada sigue en calendario | Tasks materializadas aparecen como cualquier otra |
| **Home / Summary** | `planner_tasks.status`, `assigned_to_member_id`, `requires_verification` | uuid | READ | ✔ | `awaiting_verification` cuenta como **pendiente**; `archived_at` no se filtra | Tasks materializadas entran al summary |
| **Home one-tap complete** | `POST /tasks/:id/complete` | uuid | WRITE | ✔ | Idem | Idem |
| **Attention** | `planner_task_fulfillments.status` (**no** `planner_tasks.status`) | uuid | READ | ✔ | Con `each_person`, una Task `pending` puede generar attention | Idem |
| **Search** | `planner_tasks.title/description/status` | uuid | READ | ✔ | `archived_at` no se filtra ⇒ Task archivada **es buscable** | Idem |
| **Activity** (`planner_activity_log`) | `entity_type='task'` | uuid | READ | ✔ **pero Tasks nunca escriben** | Tasks no aparecen en el feed Activity | Responsibilities tampoco |
| **Audit** (`audit_events`) | `aggregate_type='task'` | uuid | WRITE+READ | ✔ (5 filas) | Toda mutación Task audita | **Responsibilities NO auditan** |
| **Trash transversal** | `planner_tasks.trashed_at` | uuid | READ | ✔ | — | **Responsibilities NO aparecen** |
| **Notifications** | — | — | — | **NOT FOUND** | Ninguna ruta Task→notificación | Ninguna |
| **Deep Links** | `tasks/:entityId` (App.tsx:48) | uuid | READ | ✔ | — | **Responsibilities sin deep link** |
| **Inventory** | `origin_module='inventory'`, `origin_entity_type='inventory_item'`, `origin_entity_id` | uuid (sin FK) | WRITE→READ | ✔ **LEGACY ACTIVE** | Si Task se cancela, `inventory_restock_requests.planner_task_id` **sigue apuntando** (no hay trigger que lo limpie) | N/A |
| **Presets / Drafts** | `entity_type='task'` | uuid | WRITE | **EMPTY (0 filas)** | Sin datos | N/A |
| **Drafts autosave** | `planner_drafts` | — | WRITE | ✔ cableado, 0 filas | — | — |
| **Homi/AI** | — | — | — | **NOT FOUND** | Ninguna | Ninguna |
| **Finance** | `origin_module='finance'` permitido por CHECK | — | **NOT FOUND** | **DEAD** | — | — |
| **Schedules** | `household_schedule_blocks` | — | **NOT FOUND** (tabla legacy, sin vínculo Task) | **DEAD** | — | — |

**Dos roturas estructurales de integración confirmadas:**
1. **Tasks no están en el feed Activity transversal**; usan `audit_events`. Eventos y Goals sí usan `planner_activity_log`. Dos auditorías paralelas para el mismo dominio Planner.
2. **Responsibilities no están en el Trash transversal ni en Activity**, y **no tienen audit**. Sólo existen en su propia pantalla.

---

## 24. LOCAL DATA (PART U)

Todas las consultas bajo `SET LOCAL default_transaction_read_only = on`. **RUNTIME READ-ONLY VERIFIED.**

### 24.1 Conteos

| Tabla | Filas |
|---|---|
| `planner_tasks` | **3** |
| `planner_task_assignment_configs` | **3** |
| `planner_task_assignees` | **0** |
| `planner_task_assignees` (`revoked_at IS NULL`) | **0** |
| `planner_task_fulfillments` | **3** |
| `planner_task_fulfillments` (`retired_at IS NULL`) | **3** |
| `planner_task_evidence_attempts` | **0** |
| `planner_responsibilities` | **0** |
| `planner_responsibility_members` | **0** |
| `planner_responsibility_occurrences` | **0** |
| `planner_goals` (Plan root vivo) | **1** |
| `planner_plans` (root paralela) | **0** |
| `planner_plan_requirements` | **0** |
| `planner_presets` | **0** |
| `planner_drafts` | **0** |
| `inventory_restock_requests` con `planner_task_id` | **0** |
| `tasks` (legacy no-planner) | **0** |
| `households` | **116** |
| `household_members` | **15** |
| `people` | **146** |
| `planner_activity_log` | **1** (no-task) |
| `audit_events` con `aggregate_type='task'` | **5** (`task.created`×3, `task.cancelled`×1, `task.completed`×1) |

### 24.2 Distribuciones

**`planner_tasks.status`:** `pending`=1, `completed`=1, `cancelled`=1. (`awaiting_verification`=0, `verified`=0)

**`planner_task_fulfillments` (status × scope × current × active):**
| status | scope | current | active | n |
|---|---|---|---|---|
| `pending` | `shared` | true | true | 1 |
| `pending` | `shared` | true | **false** (inactive) | 1 |
| `completed` | `shared` | true | true | 1 |

**`planner_task_assignment_configs`:** `anyone` / `shared_once` / `legacy_backfill=false` → **3 filas**.

**`planner_responsibilities`:** sin filas (0).

### 24.3 No-null counts sobre `planner_tasks` (de 3 filas)

| Campo | No-null |
|---|---|
| `responsibility_id` | **0** |
| `responsibility_occurrence_sequence` | **0** |
| `goal_id` | **0** |
| `assigned_to_member_id` | **0** |
| `requires_verification = true` | **0** |
| `trashed_at` | **0** |
| `archived_at` | **0** |
| `cancelled_at` | **1** |
| `origin_module` | **0** |
| `origin_entity_id` | **0** |
| `checklist <> '[]'` | **0** |
| `estimated_duration_minutes` | **0** |
| `due_date` | **3** |

**Distribución `origin_module` × `origin_entity_type`:** `(NULL, NULL)` → 3 filas.

### 24.4 `planner_m11_1a_backfill_report()` (RUNTIME VERIFIED)

```
tasks_total: 3, assignment_configs: 3, fulfillments_current: 3, assignees_active: 0,
legacy_unassigned: 0, unmappable_actors: 0, creator_unmappable: 0,
actor/member mismatches: 0 en todas las categorías,
pending_terminal_metadata: 0, completed_inconsistent: 0,
awaiting_verification_inconsistent: 0, verified_inconsistent: 0, cancelled_inconsistent: 0,
state_timestamp_inconsistent: 0, derived_household_inconsistent: 0, count_inconsistent: 0,
cancelled_inactive: 1, blocking_rows: 0
```
**⇒ Las invariantes diferidas de la fundación M11.1A se sostienen en los datos locales actuales.** Esto valida el *shape*, **no** el comportamiento de los RPCs (no se ejercitaron).

### 24.5 Roles y permisos presentes

`household_members`: `coordinator`/active = 13, `adult`/active = 2. Sin `child`, `adolescent`, `senior`, `guest` en datos locales ⇒ **los defaults por rol de esas clases no son ejercitables con los datos actuales**.
`households`: 11 de 116 con `config.permissions` presente.
`planner_current_actor_has_capability(h,'task.archive')` = `false` (3 households muestreados).

### 24.6 Veredicto de datos

**`EMPTY DB FOUNDATION`** para todo el dominio Tasks/Responsibilities salvo el esqueleto mínimo de 3 Tasks. **No hay datos deRuntime representativos**: 0 assignees, 0 evidence, 0 responsibilities, 0 occurrences, 0 planes, 0 vínculos Task→Plan, 0 origins, 0 archivados, 0 verificaciones. **Ninguna afirmación sobre comportamiento con `each_person`, `claim`, `rotation`, `after_completion`, evidence o archive puede validarse con datos locales.**

---

## 25. TESTS (PART V)

### 25.1 Cableado del sistema

- `package.json` **no usa globbing**: cada script delega en `tests/run.js`, que despacha una tabla explícita `commands` (`tests/run.js:12-721`) y una tabla explícita `suites` (`:723-865`).
- `scripts/tsconfig.test.json` (MODIFICADO en el working tree) añade `../scripts/planner_plans_single_root_tests.ts` y `../front/mi-front-limpio/types/Plan.ts`. Los `.ts` listados se emiten a `scripts/compiled/scripts/*.js`. **Estar en `include` ≠ ejecutarse.**
- `tests/db/run.js` (MODIFICADO) — default `LOCAL_DATABASE_URL` = `127.0.0.1:54322`; `tests/run.js:404,417` usan `127.0.0.1:56222`. **Dos puertos por defecto distintos para el mismo cluster.**
- `tests/db/run.js:31-38`: si no conecta, imprime `SKIPPED` y **`return` en `:37`** ⇒ las 5 suites hijas de `:75-80` **nunca se ejecutan** sin `HOMEPLUS_TEST_REQUIRE_LOCAL_DB=1`.

### 25.2 Suites cableadas que afirman algo sobre Tasks

| FILE | Cableado | Tipo | Contrato afirmado | Entidades |
|---|---|---|---|---|
| `scripts/planner_v1_frontend_tasks_tests.ts` | `tests/run.js:266-270`; suites `:775,:793` | PURE | `TaskForm` crea/actualiza por enqueue; `PlannerTasksScreen` completa/verifica/cancela/reactiva/trasega por enqueue; `PlannerTrashScreen` restaura por enqueue; **prohíbe llamar los servicios directos** | CURRENT — vigente |
| `scripts/planner_v1_m8_tests.js` | `tests/run.js:190-194`; suites `:775,:785` | PURE | `TASK_LIMIT===3`; orden por `due_date`/prioridad; **exclusión de `cancelled`/`completed`/`verified`/`trashed`**; DTO mínima; `counts.tasks` = pool eligible; `pending/today/overdue/awaiting_verification` | CURRENT |
| `scripts/planner_v1_m9_tests.js` | `tests/run.js:195-199`; suites `:775,:776,:786` | PURE | `SUMMARY_TASK_MAX===3`; estados permitidos `{pending, awaiting_verification}`; parser de DTO con `version`; one-tap resolviendo `task.complete_any/assigned/unassigned` | CURRENT |
| `scripts/planner_g0_3_cache_tests.ts` | `tests/run.js:154`; suites `:727,:775,:850` | PURE | `plannerKeys.tasks.list`; invalidación por mutación `kind:'task'`; `counts.overdue_tasks` | CURRENT |
| `scripts/homeplus_g0_4_contract_tests.js` | `tests/run.js:712` | PURE | Telemetría con `entity_kind:'task'`, `action:'task.complete'` | CURRENT |
| `scripts/homeplus_g0_4_database_tests.js` | `tests/db/run.js:77` | **DB-MUT** | `INSERT planner_tasks` + `complete_planner_task_with_audit` → `outcome='updated'`, `status='completed'`; `audit_events` correlacionado; sin outbox; rollback real | CURRENT — **ejercita el único camino de completion verificado por suite cableada** |
| `scripts/planner_g0_2_contract_tests.js` | runner `planner_g0_2_runtime_runner.js:183`, invocado por `tests/integration/run.js:69` (`npm run test:g0.2`) | **DB-MUT + RED** | Catálogo de capabilities incluye `task.assign_self/members`, `task.archive`, `task.restore`; 403 sin capability; 401/404 envelopes; `X-Mutation-Id`; 422 sin `Idempotency-Key`; 422 sin `If-Match`; 412 stale; replay 201; cleanup | **CONTRADICE CURRENT** — ver §25.4 |
| `scripts/finance_5f_payment_attention_tests.js` | `tests/run.js:578-582` | PURE (cliente fake) | Fixture con `planner_task_fulfillments` en `awaiting_verification` + `planner_tasks` en `pending` | CURRENT |
| `scripts/planner_m11_11a_2c_attention_activity_tests.ts` | sólo `tsconfig.test.json:55` (**compilado, nunca ejecutado**) | PURE | Atención usa fuentes de verification/correction de **Task** y excluye cancelados | CURRENT |
| `scripts/planner_v1_m8/m9`, `planner_m11_7a/7b/7c`, `planner_v1_shared_s2_*`, `planner_p1_structure_contract_tests.ts`, `planner_v1_presets_drafts_*`, `planner_v1_frontend_core_integration_tests.ts` | `tests/run.js` | PURE | `'task'` como `entity_kind`/`entityType`; `version_conflict_v2`; `task.surfaces`; adaptadores productivos; `external_entity_id` refs | CURRENT |
| `docs/implementation/planner/PLANNER_V0_SCHEMA_CHECKS.sql` | `tests/db/run.js:62-70` | **DB-READ** | Existencia de `planner_tasks` + 14 columnas; RLS; `priority ∈ ('low','normal','high')` **y NO `medium`/`critical`**; 5 statuses; índices/triggers | CURRENT — **la fuente más fiable de invariantes de DB cableada** |

### 25.3 Suites huérfanas con cobertura real de Tasks (NO se ejecutan)

| FILE | Tipo | Qué cubre |
|---|---|---|
| `scripts/planner_m11_1a_contract_tests.js` | PURE | `assignment_kind`, 5 estados de fulfillment, revokes, FKs, deferred constraint, `personal_tasks_not_supported`, `protected_task_lifecycle_field`, overrides, **paridad de `DEFAULT_CAPABILITY_MATRIX`** |
| `scripts/planner_m11_1a_database_tests.js` (1274 líneas) | DB-MUT | 48 mutaciones; **`shared_once` 1 fulfillment**; **`each_person` 1 fulfillment por miembro + proyección `pending`→`completed`**; privilegios `INSERT/UPDATE` revocados; trashed/reactivate |
| `scripts/planner_m11_1b_contract_tests.js` | PURE | 9 exports del controller; 16 `operation` kinds; 4 RPC canónicos; sin `p_actor_*`; "el servicio no escribe `planner_tasks` directamente"; 10 acciones de auditoría |
| `scripts/planner_m11_1b_database_tests.js` (849 líneas) | DB-MUT | 25 mutaciones; `each_person` 2 fulfillments; **`claim` exclusivo + replay**; ciclo correction/resubmit/revert/reopen; carreras de verificación |
| `scripts/planner_m11_1b_http_tests.js` | PURE | UUID inválido nunca alcanza el RPC; `shared_once` |
| `scripts/planner_m11_3a_contract_tests.js` | PURE | El Plan Graph **no crea FK ni altera `planner_tasks`**; `entityType:'task'` **rechazado** como entidad de graph |
| `tests/planner_e11_focal.test.js` | PURE | 17 exports de `planner.tasks.service` (incluye `archiveTaskV1`, `releaseTaskV1`, `submitTaskEvidence`) |
| `tests/planner_presets_p2_2a.test.js` + `_r1` | PURE | Presets de `entity_type:'task'`; `taskToPresetPayload` **debe descartar** `assigned_to_member_id, assignment_kind, due_date, due_time, goal_id, responsibility_id, status, completed_at, fulfillment` |
| `tests/planner_slice2_pure.test.js`, `tests/planner_plans_v1_lifecycle_pure.test.js` | PURE | **DEAD**: redefinen localmente la lógica y se afirman a sí mismos; no importan producción |

### 25.4 Contradicciones y staleness

| Severidad | FILE:LINE | Afirmación | Realidad verificada |
|---|---|---|---|
| **P0** | `scripts/planner_g0_2_contract_tests.js:177, :202, :241` | `POST /api/planner/tasks` con `{visibility:'personal'}` devuelve **201** | `planner.tasks.service.js:642-648` **lanza 400 `personal_tasks_not_supported`**. Además `:175`/`:200` envían body `personal` y `:154` acepta `task \|\| error` pero `:177/:202/:241` exigen 201 ⇒ **3 asserts fallan** |
| **P1** | `scripts/planner_m11_1b_contract_tests.js:102` | "la suite HTTP está cableada como gate ejecutable" | `planner_m11_1b_http_tests.js` **no está cableado** a ningún runner ⇒ afirmación falsa |
| **P1** | `front/mi-front-limpio/tests/plannerTasksContract.test.js:144-167` | "Solo paths `*Task*` modificados; backend untouched" | El working tree tiene **5 archivos backend modificados** ⇒ los asserts fallan hoy. **Guard de ownership, no de contrato** |
| **P1** | `front/.../plannerTasksContract.test.js:135-141` | `PlannerTasksScreen` contiene `'Abrir detalle de tarea'` | El accessibilityLabel real es `` `Abrir tarea ${task.title}` `` (`PlannerTasksScreen.tsx:143`) ⇒ **assert falla**. Es assert de substring sobre fuente, no evidencia de runtime |
| **P2** | `tests/planner_slice2_pure.test.js:104, :226-228` | `status:'failed'` de Plan es "legacy preserved" | `planner_goals_status_check` ya no incluye `failed` ⇒ STALE (pero el fichero es DEAD) |
| **P2** | `tests/db/run.js:37` | — | `return` temprano ⇒ **las 5 suites hijas nunca se ejecutan** sin env var. **Gate silencioso** |
| **P2** | `tests/run.js:404,:417` vs `tests/db/run.js:9` | — | Dos puertos por defecto (56222 vs 54322) para el mismo cluster |

### 25.5 Cobertura de los contratos exigidos

| Contrato | ¿Suite cableada? |
|---|---|
| `materialize_planner_responsibility_v1` | **NOT FOUND** — cero matches en `tests/`, `scripts/`, `front/*/tests/` |
| `planner_responsibility_members` | **NOT FOUND** |
| `planner_responsibility_occurrences` | **NOT FOUND** (sólo un assert **negativo** sobre el texto del servicio: `tests/planner_responsibilities_p2_1.test.js:39`) |
| Endpoints de Responsibilities | **NOT FOUND** |
| `planner_task_evidence_attempts` (comportamiento) | **NOT FOUND** (sólo existencia de export en `tests/planner_e11_focal.test.js:59-65`, huérfano) |
| `release_planner_task_v1` | **NOT FOUND** (cero matches en cualquier test) |
| `task.archive` | **NOT FOUND** como elegibilidad; sólo existencia de export (huérfano). **Ningún test verifica `status IN ('completed','verified')`** |
| `each_person` | **Sólo huérfanas** (`planner_m11_1a_database_tests.js:1118-1168`, `planner_m11_1b_database_tests.js:389-423`) |
| `claim` | **Sólo huérfanas** |

### 25.6 Tests de Responsibilities — veredicto

`tests/planner_responsibilities_p2_1.test.js` es **PURE, HUÉRFANO**, con 30 casos sobre el dominio. Verificado que el dominio y la migración satisfacen lo afirmado. **Pero ninguna suite — cableada o no — ejerce la materialización, los miembros ni las ocurrencias contra la DB.**

### 25.7 Qué NO se ejecutó en esta auditoría

**No se ejecutó ninguna suite.** Ni DB-mutante (prohibido), ni pura, ni de red. Razón: la instrucción es read-only y varias suites cableadas (`planner_g0_2`, `homeplus_g0_4`) requieren **DB mutation** y/o **red**. Las suites puras cableadas **no tienen cobertura de `each_person`, `claim`, `release`, evidence, responsibilities ni archive**, por lo que ejecutarlas no habría producido evidencia sobre los hallazgos de mayor riesgo. Los archivos pasan `node --check` (9 de 10; el restante es `.ts`).

---

## 26. DUPLICATE AUTHORITIES (PART W)

| CONCEPT | AUTHORITY A | AUTHORITY B | AUTHORITY C | WHICH WRITES | WHICH READS | CURRENT DIVERGENCE |
|---|---|---|---|---|---|---|
| **Task status** | `planner_task_fulfillments.status` | `planner_tasks.status` | (frontend) `aggregate.state` (`planner_task_aggregate_v1` local reimplementado en `planner.tasks.service.js:961-988`) | A: RPCs V0/V1 + trigger `sync_foundation_from_v0` (sólo `inactive_at`). B: `planner_refresh_task_v0_projection` (interno) + `mutate_planner_task_v0` (`cancelled`, reactivate) | B: TODOS (list, summary, search, calendar, attention, frontend, `isResolved` de responsibilities). A: attention, verify V0, `calculateProgressFromTasks` | **B es proyección de A, pero B tiene un estado propio (`cancelled`) que A no.** `correction_requested` de A se proyecta a `pending` en B. **La proyección puede re-derivarse en cualquier momento y pisar `cancelled`** si se llama `planner_refresh_task_v0_projection` sin el guard (sólo la hace con `status='cancelled'` → fuerza `cancelled`, mitigado) |
| **Assignment (semántica)** | `planner_task_assignment_configs` | `planner_tasks.assigned_to_member_id` | `planner_tasks.trg_planner_tasks_sync_foundation_from_v0` | A: RPCs + `materialize_…`. B: `planner_refresh_task_v0_projection` (sólo si exactamente 1 assignee). C: deriva B desde A | A: `complete_*`, `claim`, `release`, `buildV1Aggregate`, TaskDetail. B: list, summary, home one-tap, TaskDetail | **B es subconjunto de A.** Con 0/N assignees B=NULL ⇒ **cualquier consumidor de B ve "sin responsable" cuando hay N responsables**. Home one-tap y `listTasks?assigned_to_member_id` quedan ciegos con multi-assignee |
| **Assignment (membresía)** | `planner_task_assignees` (activa) | `planner_responsibility_members` (plantilla) | — | A: RPCs. B: `replaceMembers` | A: `complete_*`, `claim`, `release`, proyección. B: `materializeHousehold` | **No son la misma autoridad**: B es plantilla de la regla, A es la asignación de una Task concreta. Se acoplan sólo en el instante de la materialización |
| **Completion (actor)** | `planner_task_fulfillments.completed_by_*` | `planner_tasks.completed_by_*` | `planner_activity_log.previous_state/next_state` (Tasks no escriben) | A: RPCs. B: proyección (`ORDER BY completed_at DESC LIMIT 1` = **el último**, no el agregado) | B: TaskDetail. A: verify, `canManageOwn` | **Con `each_person` y N completadores, B muestra sólo UNO de los N.** La Task se declara `completed`/`verified` con N actores registrados en A |
| **Verification (actor)** | `planner_task_fulfillments.verified_by_*` | `planner_tasks.verified_by_*` | `planner_task_evidence_attempts.reviewed_by_member_id` (**nunca escrito**) | A: RPCs. B: proyección (`ORDER BY verified_at DESC LIMIT 1`). C: nadie | B: TaskDetail. C: nadie | **Con `each_person`, B muestra 1 de N verificadores.** `evidence.review_result` es un **segundo sistema de review, totalmente desconectado** del fulfillment y sin writer |
| **Verification (config)** | `planner_tasks.requires_verification` | `planner_responsibilities.task_defaults->>'requires_verification'` | `planner_task_evidence_attempts` (implícito: `requires_verification` ⇒ foto obligatoria) | A: create/update Task. B: `materialize_…` | A: `complete_*` RPCs, `submitTaskEvidence`, TaskDetail. B: `materialize_…` | **No hay normalización**: el valor se copia de la regla en cada materialización. Editar la regla **no** cambia Tasks existentes ⇒ ** Tasks de distintas generaciones pueden tener `requires_verification` distinto bajo la misma responsibility** |
| **Due date** | `planner_tasks.due_date` | `planner_responsibilities.anchor_date` + `schedule_*` + `due_time` | — | A: create/update Task. B: `materialize_…` calcula | A: list, summary, calendar, search, attention | **B no se realinea con A.** Editar `anchor_date` sólo afecta la próxima Task |
| **Recurrence** | `planner_responsibilities.schedule_*` (**JS calcula**) | `planner_task_evidence_attempts` no aplica | `PlannerTask.recurrence` (**tipo muerto, nunca emitido**) | B: `nextOccurrence()` en `planner.responsibilities.domain.js` | B: `materializeOne` | **La recurrencia no pertenece a Task.** El tipo frontend `PlannerTaskRecurrenceProjection` sugiere lo contrario y no tiene fuente |
| **Responsibility membership** | `planner_responsibility_members` | `planner_task_assignees` | `planner_responsibility_occurrences.rotation_slot_member_id` | A: `replaceMembers`. B: RPCs. C: `materialize_…` (rotation) | A: `materializeHousehold`. C: `materializeOne:118` (prev slot) | **Tres representaciones del mismo "quién"**: plantilla, asignados de la Task, y slot de rotación histórico. `rotation_slot_member_id` puede quedar NULL (`SET NULL`) y romper la continuidad de la rotación |
| **Task generation** | `materialize_planner_responsibility_v1` (SQL, atómico) | `planner.tasks.service.createTask` (V0 RPC) | `materializeHousehold` (JS, N responsibility → 1 Task cada una) | A: `materializeHousehold`. B: `POST /tasks`, `inventory.service.js:556` | ambos | **Dos generadores de Task** que comparten la misma tabla y el mismo trigger de bootstrap. `materialize_…` **no pasa por `mutate_planner_task_v0`** ⇒ no valida `task.create_household` por capability de creación, no emite `audit_events`, no usa idempotency keys |
| **Trash** | `planner_tasks.trashed_at` | `planner_responsibilities.trashed_at` + `lifecycle='trashed'` | `planner_responsibility_occurrences.resolved_at` (**no es trash**) | A: `mutate_planner_task_v0`. B: `setLifecycle` | A: 6 servicios. B: **sólo la pantalla de Responsibilities** | **B no aparece en el Trash transversal.** Trasear una responsibility **no** afecta sus Tasks ya materializadas |
| **Archive** | `planner_tasks.archived_at` (**UNREACHABLE**) | `planner_responsibilities.lifecycle='archived'` | `planner_goals.archived_at` | A: nadie (403). B: `setLifecycle` | A: **sólo** `listTasks:486`. B: `ResponsibilityDetailScreen` | **Modelos incompatibles**: flag vs estado. Y el de Task **no tiene consumidor real** |
| **Ownership ("own")** | `planner_tasks.created_by_member_id` | `planner_task_fulfillments.responsible_member_id` / `completed_by_member_id` (`canManageOwn`) | `planner_task_assignees.member_id` | — | capabilities: A. `canManageOwn`: B. `isAssignee` (complete): C | **Tres criterios distintos de "mío"** para tres decisiones distintas (editar/cancelar vs gestionar cumplimiento vs completar). **Ninguno** usa `assigned_to_member_id` |
| **Scope (household/personal)** | `planner_tasks.household_id` (implícito) | `planner_tasks.visibility` (**NO EXISTE**) | `planner_responsibilities.household_id` (implícito) | — | todos | **Tasks y Responsibilities son household-only sin columna que lo declare.** La "visibilidad" de Task es la de todo el household (RLS sin filtro) ⇒ **cualquier miembro activo ve TODAS las Tasks del hogar** |
| **Plan relation** | `planner_tasks.goal_id` | `planner_plan_requirements.external_entity_id` (**0 filas, Task rechazada**) | `planner_plans` (**0 filas**) | A: `mutate_planner_task_v0`. B/C: nadie | A: `listTasks`, `calculateProgressFromTasks`, PlanDetail | **B y C son DEAD.** Un solo vínculo vivo, sin duplicado real. **Pero `attention`/`search` leen C ⇒ Plans invisibles** |
| **Evidence** | `planner_task_evidence_attempts` (**sin escritura posible**) | `planner_task_fulfillments.correction_comment` / `resubmission_note` | `planner_task_fulfillments.status='correction_requested'` | B/C: RPCs `mutate_planner_task_fulfillment_v1`. A: nadie | TaskDetail renderiza las tres | **Tres sistemas paralelos de "rechazo/corrección"**: (1) el ciclo fulfillment `correction_requested`→`resubmit` es el ÚNICO vivo; (2) `evidence.review_result='correction_requested'` nunca se escribe; (3) `evidence.review_comment` nunca se escribe |
| **Actividad** | `audit_events` | `planner_activity_log` | `planner.observability` / `telemetry` | A: todos los RPCs de Task. B: Events/Goals/Plans. C: `completeTask` (telemetry) | A: `GET /tasks/:id/audit`. B: `GET /activity`. C: sólo telemetría | **Tasks usan A; Events/Goals usan B.** El feed Activity transversal **nunca muestra Tasks** |
| **Idempotency** | `planner_v2_reserve_idempotency` (`mutation_id` + `payload_hash`) | 5 constraints/unique de `materialize_…` | `planner_idempotency_keys` | A: todos los RPCs V0/V1. B: la RPC de materialización | A: `mutate_…v0`, `update_…v1`, `claim`, `release`, `mutate_…fulfillment_v1` | **La materialización de Responsibilities NO usa A**: no tiene `mutation_id`, no emite audit, no puede correlacionarse |

---

## 27. LIVE / DEAD / UNREACHABLE (PART X)

### 27.1 LIVE CURRENT

| Pieza | Evidencia de alcanzabilidad |
|---|---|
| `planner_tasks` root + 39 columnas | 3 filas en DB; 6 endpoints vivos |
| `planner_task_assignment_configs` | 3 filas; `update_planner_task_assignment_v1` + `claim` + `release` |
| `planner_task_assignees` | 0 filas pero cableada en 6 writers |
| `planner_task_fulfillments` (autoridad) | 3 filas; 6 acciones + verify V0 |
| `planner_tasks.status` como **proyección** | `planner_refresh_task_v0_projection` invocada por todos los RPCs |
| V0 task mutations (`create/update/cancel/reactivate/trash/restore/complete/verify`) | `mutate_planner_task_v0` + 13 endpoints |
| V1 assignment/claim/release/fulfillment-mutate | 8 endpoints |
| `claim` / `release` UI | `TaskDetailScreen:686-707`, `:894-921` |
| `resubmit` UI | `TaskDetailScreen:800-821` |
| Trash + Restore de Task | 2 endpoints + `PlannerTrashScreen` |
| Cancel + Reactivate de Task | `PlannerTasksScreen:346-424` |
| Checklist | `TaskDetailScreen:968-982` + `planner_tasks.checklist` |
| `origin_module='inventory'` | `inventory.service.js:540-556` |
| `goal_id` ↔ Plan | `mutate_planner_task_v0` + `PlanDetailV1` + `calculateProgressFromTasks` |
| Responsabilities CRUD + lifecycle + `replace-assignee` | 11 endpoints + 3 pantallas |
| `materialize_planner_responsibility_v1` | invocada desde `materializeHousehold` en 10 call-sites |
| `planner_responsibility_members` | `replaceMembers` en create/update |
| `planner_responsibility_occurrences` | INSERT en la RPC + UPDATE en `materializeOne` |
| `audit_events` para Task | 5 filas locales |
| Deferred invariant enforcement (4 constraint triggers) | `planner_m11_1a_backfill_report()` con `blocking_rows: 0` |

### 27.2 DEAD CODE

| Pieza | Evidencia |
|---|---|
| `tasks` (tabla legacy no-planner) | 0 filas, 0 consumidores backend |
| `front/mi-front-limpio/services/tasks.ts` (archivo completo) | 0 importers; modela `status: 'pendiente'\|'en_progreso'\|'completada'` inexistente |
| `components/ui/QuickActionSheet.tsx` | 0 renders |
| `screens/planner/GoalDetailScreen.tsx`, `PlannerGoalsScreen.tsx`, `PlannerSchedulesScreen.tsx`, `PlannerPlansScreen.tsx` | 0 imports |
| `services/planner/plannerTransitionCoordinator.ts` (archivo completo) | 0 importers |
| `createPlannerTaskMutation`, `completePlannerTaskOptimistic`, `submitPlannerTaskForVerification` | 0 referencias |
| `deletePlannerEvidencePhoto`, `getEvidencePhotoUrl` | 0 llamadas |
| `plannerTaskCreateFormAdapter`, `plannerTaskEditFormAdapter`, `plannerMutationReducers`, `getPlannerTaskCacheKeys`, `plannerTaskVisualStateMatrix`, `plannerFrontendCoreRootAdapters`, `plannerFrontendCoreTabs` | 0 imports |
| `canVerifyTask`, `canRestoreFromTrash`, `canCancelOwnTask`, `canEditOwnTask`, `canEditAnyTask`, `canCreateAnyTask`, `canSearchPlanner`, `evaluateQuickActionCapabilities`, `getEnabledQuickActions`, `isQuickActionEnabled`, `hasAllPlannerCapabilities`, `hasAnyPlannerCapabilities` | 0 callers |
| `resolveOwnershipCapability` | 0 callers; además devuelve capability sin sufijo (bug latente) |
| Proyecciones `fulfillmentSummary`, `assignmentSummary`, `exceptionalIndicator`, `recurrenceSummary`, `temporalLabel` | se calculan (`plannerTaskAdapters.ts:277-292`) y sólo entran al `accessibilityLabel`, que `PlannerTasksScreen` no consume |
| `PlannerTaskRecurrenceProjection`, `PlannerTask.recurrence`, `recurrenceRule` | sin writer ni reader real |
| `PlannerTaskScope` (`types/plannerTaskV1.ts:13`) | ninguna API lo transporta |
| `statusColors.correction_requested` (`TaskDetailScreen:424`) | clave inexistente en `PlannerTaskStatus` |
| `changeResponsibilityLifecycle('restore')` | nunca invocado |
| `requestPlannerTaskCorrectionV1`, `revertPlannerTaskFulfillmentV1`, `reopenPlannerTaskFulfillmentV1` | importados, nunca invocados |
| `enqueuePlannerTaskCancel` en `TaskDetailScreen:20` | importado, nunca invocado |
| Botones Archivar/Desarchivar/Restaurar de la lista | `onPress` vacío (`PlannerTasksScreen:497,501,503`) |
| `isAssignedToMe` (`PlannerTasksScreen:469`) | declarado, nunca usado |
| Bloque `{false ? … : null}` de `TaskForm.tsx:827-1115` (287 líneas) | incluye el rail multi-assignee, tipo, título duplicado, sugerencias, nota, plan, prioridad |
| Texto "Tarea compartida: cualquiera de las N personas puede completarla" (`TaskForm:1022-1026`) | dentro del bloque muerto |
| Bloques legacy de Home (`HomeAdulto:129-239`, `HomeAdolescente:142-208`, `HomeAdultoMayor:131-155`) | `{false ? … : null}` |
| `planner_current_actor_has_capability` cases ausentes | `planner.search`, `task.create_personal`, `task.assign_self`, `task.assign_members`, `task.archive` ⇒ 5 capabilities sin contraparte SQL |
| `planner_m11_1a_backfill_report()` | 0 callers |
| `planner_task_v1_assert_payload_hash` / `…complete_idempotency` / `planner_task_audit_v1` / `planner_task_aggregate_v1` para `authenticated` | revocados; sólo `service_role` |
| `planner_plan_external_link_dto` / `planner_plan_validate_external_link` respecto a Task | 0 filas, `task` rechazado |

### 27.3 UNREACHABLE

| Pieza | Por qué |
|---|---|
| `POST /v1/tasks/:id/archive` | `task.archive` = `false` en los 6 roles (JS) y `else false` (SQL) ⇒ **403 siempre** |
| `POST /v1/tasks/:id/unarchive` | ídem |
| `archive_planner_task_v1` / `unarchive_planner_task_v1` | ídem |
| `planner_tasks.archived_at` (escapable) | 0 filas (nadie puede escribirla) ⇒ **la vista "Archivadas" está estructuralmente vacía** |
| `GET /tasks/:id/evidence` |LIVE pero **siempre devuelve `[]`** (0 filas, sin writer) |
| `POST /tasks/:id/evidence/:fulfillmentId` | **grant-blocked** para el cliente `authenticated` ⇒ la foto se sube a Storage y el registro falla ⇒ **el usuario pierde la foto** |
| `evidence.review_result` / `review_comment` / `reviewed_by_member_id` / `reviewed_at` | sin writer, sin endpoint, sin UI |
| `each_person` como modo alcanzable | el tipo y el RPC existen; **ningún control de UI lo establece** (`TaskForm` siempre `shared_once`) ⇒ inalcanzable desde la app |
| Multi-assignee (N) | el rail de selección está en código muerto; el ActionSheet sólo permite 1 |
| Re-asignación con historial / `legacy_unassigned` | requiere flags que la UI nunca manda ⇒ **409 permanente** si se intentara |
| `PlannerScreen` → `PlannerSearch` / `PlannerAttentionActivity` | entry-points por flag con default `false` (`PlannerScreen:611-614`) ⇒ **UNREACHABLE por defecto** |
| `respuesta #1 de lista: rápido` — `submitTaskEvidence` sin `fulfillmentId` (`plannerTasks.ts:630`) | **no existe ruta backend** (sólo `POST /tasks/:id/evidence/:fulfillmentId`) |
| `TaskDetail` abierto desde Plan Detail | bug de params ⇒ `entityId=''` ⇒ loading infinito |
| `PlannerTasksScreen` como ruta | **no es ruta**: componente embebido |
| 6 capacidades `task.*` (`create_personal`, `assign_self`, `assign_members`, `archive` + 2 helpers) | sin consumidor real |
| 21 capabilities JS sin contraparte SQL | divergencia latente (§19.2) |

### 27.4 LEGACY ACTIVE

| Pieza | Evidencia |
|---|---|
| `planner_tasks` como proyección V0 (`assigned_to_member_id`, `completed_by_*`, `verified_by_*`) | 12 columnas maintained por trigger/RPC; leídas por 6 servicios |
| `planner_tasks.priority` `medium`/`critical` | **tolerdos** en el backend (`normalizePriority:178-185`) y en la UI (`priorityLabelsWithLegacy`, `PlannerCalendarComponents:221`), pero **prohibidos por el CHECK** ⇒ código muerto tolerado |
| `origin_*` como trail de auditoría | `origin_module='inventory'` es el único origen vivo |
| `legacy_unassigned` | `assignment_kind` de migración Y kind actual de `unassigned` responsibilities ⇒ **doble semántica** |
| V0 task endpoints junto a V1 | `POST /tasks/:id/complete` convive con `POST /v1/…/fulfillments/:fid/complete`; **ambos vivos**, con selección de fulfillment distinta |
| `planner_goals` como root de Plan mientras `planner_plans` existe | 1 fila en `planner_goals`, 0 en `planner_plans`; los lectores de `planner_plans` son stale |

### 27.5 EMPTY DB FOUNDATION

`planner_responsibilities`, `planner_responsibility_members`, `planner_responsibility_occurrences`, `planner_task_assignees`, `planner_task_evidence_attempts`, `planner_plans`, `planner_plan_requirements`, `planner_presets`, `planner_drafts`, `inventory_restock_requests`, `tasks` (legacy), `planner_activity_log` (para Tasks).

**Criterio aplicado:** una pieza es `EMPTY DB FOUNDATION` si tiene esquema completo + código completo + endpoints vivos + **0 filas** + **ninguna suite cableada que la ejercite**. **No se cuenta como "implementada y funcionando".**

---

## 28. CURRENT CONTRACT GRAPH (PART Y)

Graph derivado exclusivamente de la evidencia (flechas = escritura o dependencia real comprobada).

```
auth.uid()  (JWT)
   │
   ├─► current_person_id()            [SECURITY DEFINER, STABLE]
   │      └─► people.id
   │             └─► current_household_member_id(household_id)  [SECURITY DEFINER, STABLE]
   │                    └─► household_members.id  +  .role  +  .status='active'
   │                            │
   │                            ├─► is_active_household_member(household_id)   ── RLS de las 8 tablas
   │                            └─► planner_current_actor_has_capability(household_id, cap)
   │                                    ├─ household.config.permissions[cap][role]  (override, 11/116 households)
   │                                    └─ DEFAULT (SQL: 12 caps / JS: 33 caps)  ◄── DIVERGENCIA
   │
   ▼
household_id
   │
   ├──► planner_responsibilities                      [23 cols, 0 filas]
   │      lifecycle: active|paused|archived|trashed   ◄── ÚNICO mecanismo de borrado lógico
   │      assignment_kind: fixed|rotation|claimable|unassigned
   │      schedule_kind + interval/unit/weekdays/month_day/anchor_date/due_time
   │      task_defaults (jsonb: priority, template_key, estimated_duration_minutes,
   │                     checklist, requires_verification, goal_id)
   │      next_sequence   ◄── ÚNICO writer: materialize_planner_responsibility_v1
   │      requires_adjustment_reason  ◄── BLOQUEA la materialización
   │      created_by_member_id ──FK──► household_members (NO ACTION)
   │      │
   │      ├──► planner_responsibility_members         [5 cols, 0 filas]
   │      │      (responsibility_id, household_id, member_id, position, created_at)
   │      │      PK(responsibility_id, member_id) · UNIQUE(responsibility_id, position)
   │      │      grants: SELECT/INSERT/UPDATE/DELETE a authenticated, SIN capability
   │      │      ◄── ROL: plantilla de asignación (rotación / fixed)
   │      │      NO afecta Tasks existentes
   │      │
   │      └──► planner_responsibility_occurrences      [11 cols, 0 filas]
   │             (…, sequence, occurrence_key, scheduled_date,
   │              rotation_slot_member_id, task_id NOT NULL UNIQUE,
   │              resolved_at, resolution_status)
   │             UNIQUE(responsibility_id, sequence) · UNIQUE(responsibility_id, occurrence_key)
   │             UNIQUE parcial: 1 sola occurrence con resolved_at IS NULL
   │             │
   │             │ task_id ──FK──► planner_tasks   ON DELETE RESTRICT
   │             │
   │             └── GENERATED BY, NOT GENERATOR ──► planner_tasks
   │
   │   ╔═══════════════════════════════════════════════════════════════════╗
   │   ║  FLUJO DE MATERIALIZACIÓN (pull, sin scheduler)                 ║
   │   ║  10 call-sites: GET /tasks · POST /tasks/:id/complete            ║
   │   ║                  POST /tasks/:id/verify · runTaskV1Mutation       ║
   │   ║                  GET+POST+PATCH /responsibilities                 ║
   │   ║                  POST /responsibilities/:id/{resume,restore,      ║
   │   ║                                             unarchive}            ║
   │   ║                                                                   ║
   │   ║  JS calcula (planner.responsibilities.domain.js):                 ║
   │   ║    validateRule → requires_adjustment_reason                      ║
   │   ║    nextOccurrence (días UTC, sin timezone real)                   ║
   │   ║    assignmentForOccurrence (fixed/rotation/claimable/unassigned)  ║
   │   ║              ↓                                                   ║
   │   ║  RPC materialize_planner_responsibility_v1  [SECURITY DEFINER]    ║
   │   ║    FOR UPDATE · next_sequence CAS · 1-live guard ·               ║
   │   ║    unique_violation → 'duplicate' · NO mutation_id · NO audit     ║
   │   ╚═══════════════════════════════════════════════════════════════════╝
   │
   ▼
planner_tasks                                       [39 cols, 3 filas]  ◄══ ROOT ÚNICA
   │
   │  title, description, due_date, due_time, priority, category,
   │  template_key, checklist, estimated_duration_minutes,
   │  requires_verification,
   │  created_by_member_id ──► household_members   (define "own")
   │  created_by_person_id ──► people
   │  version (opt. lock, trigger-managed, NO NULL)
   │  trashed_at / trashed_by_member_id
   │  cancelled_at / _by_member_id / _reason / _from_status
   │  archived_at   ◄══ ESCRIBIBLE POR NADIE (task.archive = false)
   │
   ├─ goal_id ──FK──► planner_goals(id)  ON DELETE SET NULL
   │                   ◄── ÚNICO VÍNCULO TASK→PLAN. 0 filas con vínculo.
   │                   ◄── calculateProgressFromTasks (progress_mode='tasks')
   │                   ◄── planner_plans / planner_plan_requirements = DEAD
   │
   ├─ responsibility_id ──FK──► planner_responsibilities ON DELETE RESTRICT
   │   responsibility_occurrence_sequence  (shape CHECK, UNIQUE parcial)
   │       ◄══ SEMÁNTICA = ORIGEN / TEMPLATE SOURCE + vínculo de instancia.
   │           NO es ownership, NO es grouping, NO es label.
   │
   ├─ origin_module / origin_entity_type / origin_entity_id / origin_reason
   │       ◄══ METADATA SIN FK. Único writer externo vivo: inventory.service.js
   │           ('inventory' / 'inventory_item' / low_stock|out_of_stock)
   │           'planner'/'responsibility' escrito por la RPC de materialización
   │           'assets' | 'finance' | 'geni' | 'automation' = NOT FOUND
   │
   ├─ ASSIGNEE (PROYECCIÓN, no autoridad)
   │     assigned_to_member_id ◄── planner_refresh_task_v0_projection
   │                             (sólo si EXACTAMENTE 1 assignee activo)
   │
   ├─ ESTADO (PROYECCIÓN, no autoridad)
   │     status ∈ {pending, completed, awaiting_verification, verified, cancelled}
   │     completed_by_member_id / _person_id / completed_at
   │     verified_by_member_id / _person_id / verified_at
   │       ◄── planner_refresh_task_v0_projection ◄── planner_task_aggregate_v1
   │           ÚNICO estado propio de Task: 'cancelled'
   │
   ├─────────────────► planner_task_assignment_configs   [8 cols, 3 filas]  1:1
   │     assignment_kind ∈ {anyone, members, legacy_unassigned}
   │     fulfillment_mode ∈ {shared_once, each_person}
   │     legacy_backfill (migración Y 'unassigned' de responsibilities)
   │     version ◄══ opt. lock REAL de PUT /v1/…/assignment
   │     ESCRITURA: authenticated = SOLO SELECT (5 constraint triggers / RPCs)
   │
   ├─────────────────► planner_task_assignees           [8 cols, 0 filas]  N:1 soft-revoke
   │     member_id ──FK──► household_members ON DELETE RESTRICT
   │     UNIQUE parcial (task_id, member_id) WHERE revoked_at IS NULL
   │
   ├─────────────────► planner_task_fulfillments        [23 cols, 3 filas]  ◄══ AUTORIDAD
   │     fulfillment_scope ∈ {shared, individual}
   │     responsible_member_id (individual ⇒ NOT NULL)
   │     status ∈ {pending, completed, awaiting_verification,
   │                correction_requested, verified}   ◄══ 5º estado, Task no lo tiene
   │     completed_by_* / verified_by_* / correction_requested_* / resubmitted_*
   │     inactive_at  (task cancelled)  ·  retired_at (assignment superseded)
   │     version ◄══ opt. lock REAL de POST /v1/…/{complete,verify,…}
   │     1 shared por Task (unique parcial)  |  N individual = N assignees
   │
   ├─(DEAD)─────────► planner_task_evidence_attempts  [16 cols, 0 filas]
   │     fulfillment_id ──FK──► planner_task_fulfillments ON DELETE SET NULL
   │     photo_reference = URL PÚBLICA (bucket 'planner-evidence', cliente)
   │     review_result / review_comment / reviewed_by_* / reviewed_at
   │         ◄══ SIN WRITER, SIN RPC, SIN UI
   │     authenticated = SOLO SELECT  ⇒  INSERT del backend = PERMISSION DENIED
   │
   ▼
CONSUMIDORES (lectores de planner_tasks.status / assigned_to_member_id)

   listTasks ......................... trashed + archived + cancelled(status)  ✔ ambos
   Home Summary ...................... trashed SÓLO            ✘ archived NO
   Attention (awaiting_verif.) ....... lee planner_task_fulfillments  ◄══ OTRA autoridad
   Attention (correction) ............ lee planner_task_fulfillments
   Search ............................. trashed + cancelled       ✘ archived NO
   Calendar ........................... trashed SÓLO            ✘ archived NO, ✘ status NO
   Trash transversal ................. trashed_at IS NOT NULL  ✘ NO responsibilities
   Activity transversal .............. planner_activity_log    ✘ Tasks NUNCA escriben
   Audit de Task ..................... audit_events             ✔ (13 action kinds)
   Home one-tap ...................... lee assigned_to_member_id  ✘ ciego con N assignees
   calculateProgressFromTasks ........ NO excluye archived_at
   isResolved (responsibilities) ...... lee status + requires_verification
   Frontend ......................... lee status + assigned_to_member_id

   ╔═══════════════════════════════════════════════════════════════════════╗
   ║  AUSENTES DEL GRAPH                                                ║
   ║  · planner_activity_log ← Task      (0 flechas de escritura)         ║
   ║  · Notifications ← Task             (NOT FOUND)                     ║
   ║  · Homi/AI ← Task                   (NOT FOUND)                     ║
   ║  · Schedules ← Task                 (NOT FOUND)                     ║
   ║  · Finance ← Task                   (origin_module='finance' sin writer)║
   ║  · Trash ← Responsibility          (NOT FOUND)                     ║
   ║  · Activity ← Responsibility        (NOT FOUND)                     ║
   ║  · audit_events ← Responsibility    (NOT FOUND)                     ║
   ║  · Deep Link → Responsibility        (NOT FOUND)                     ║
   ║  · capability responsibility.*       (NOT FOUND)                     ║
   ╚═══════════════════════════════════════════════════════════════════════╝
```

---

## 29. CONTRADICTIONS (PARTE 29)

| # | Contradicción | Lado A | Lado B | Evidencia |
|---|---|---|---|---|
| **C-1** | **Evidence: la UI pide foto, la DB la prohíbe** | `EvidencePhotoPicker:84-88` **exige** foto | `planner_task_evidence_attempts` = SELECT-only para `authenticated` ⇒ el INSERT falla ⇒ **la foto se pierde** | `planner.tasks.service.js:1473-1486` vs `20260914000001:126-127` |
| **C-2** | **Evidence: la rama de verificación viola su propio CHECK** | `submitTaskEvidence:1489-1497` pone `status='awaiting_verification'` sin actores | `planner_task_fulfillment_state_actor_check` exige `completed_by_person_id` y `completed_at` NOT NULL en `awaiting_verification` | `:1489-1497` vs `20260722010000:499-504` |
| **C-3** | **Evidence: RPC revocado** | `submitTaskEvidence:1515` llama `planner_refresh_task_v0_projection` | esa función tiene `revoke all … from authenticated` | `20260722010000:1878-1879` |
| **C-4** | **Archive: la UI ofrece una acción que el sistema prohíbe** | `TaskDetailScreen:1006-1010` muestra Archivar/Desarchivar | `task.archive = false` en los 6 roles + `else false` en SQL ⇒ **403 siempre** | `plannerCapabilities.js:107,…` vs `20260722010000:47-61` |
| **C-5** | **Archive: filtro incompleto** | `listTasks:485-487` filtra `archived_at` | summary, attention, calendar, search, trash **no** lo filtran | 4 servicios |
| **C-6** | **`awaiting_verification`: dos autoridades** | Summary/UI leen `planner_tasks.status` | Attention lee `planner_task_fulfillments.status` | `planner.summary.service.js:42` vs `planner.attention.service.js:131` |
| **C-7** | **`assigned_to_member_id` no es "el responsable"** | La UI y home one-tap lo leen como tal | Se puebla **sólo** con exactamente 1 assignee | `20260722020000:153-160` |
| **C-8** | **Tres definiciones de "mío"** | `created_by_member_id` (capabilities) | `responsible_member_id`/`completed_by_member_id` (`canManageOwn`); `planner_task_assignees.member_id` (`isAssignee`) | `planner.tasks.service.js:1013` vs `:738-740` |
| **C-9** | **`resolveOwnershipCapability` devuelve capability inexistente** | `return fallbackAny ? \`${action}_any\` : action` | `task.edit` no existe en el catálogo | `plannerCapabilities.js:414-424` (0 callers) |
| **C-10** | **Responsibilities sin capability** | RLS UPDATE + controller exigen `planner.view` | cualquier `child`/`guest` puede editar/pausar/archivar/borra**r** cualquier responsibility | `planner_responsibilities_update` policy |
| **C-11** | **Responsibilities: 3 operaciones idénticas** | `restore`, `resume`, `unarchive` → `lifecycle('active')` | las tres borran `paused_at`+`archived_at`+`trashed_at` | `planner.responsibilities.controller.js:37-39`, `service:205` |
| **C-12** | **Responsibilities mutables por cualquier actor, Tasks no** | Task UPDATE exige `edit_own`/`edit_any` | Responsibility UPDATE exige sólo `is_active_household_member` | policies |
| **C-13** | **Occurrences forjables por `authenticated`** | `materialize_…` es la única frontera atómica | `grant SELECT, INSERT, UPDATE on planner_responsibility_occurrences to authenticated` + policies sin capability ⇒ un cliente puede resolver/crear occurrences y evadir el one-live guard | `20260916000001:103,122-127` |
| **C-14** | **Materialización sin auditoría ni idempotency keys** | Todos los demás RPCs usan `planner_v2_reserve_idempotency` + `audit_events` | `materialize_…` no usa ninguno; puede crear N Tasks por request sin traza | `20260916000001:132-219` |
| **C-15** | **`origin_module`: JS ≠ DB** | backend acepta `{inventory,assets,finance,geni,automation}` | DB acepta además `planner` ⇒ 400 en un valor que la DB permite | `planner.tasks.service.js:11-17` vs `20260916000002` |
| **C-16** | **`origin_*` no es actualizable** | el trigger guard incluye `origin_*` en `v_ordinary_edit` | `mutate_planner_task_v0('update')` no los toca ⇒ **inmutable de facto** | `20260722010000:1383-1386` vs `20260722020000:1114-1123` |
| **C-17** | **`requires_verification` no se propaga** | la responsibility tiene `task_defaults.requires_verification` | cada Task materializada congela el valor ⇒ bajo una misma responsibility hay Tasks con verification distinta | `20260916000001:189` |
| **C-18** | **`correction_requested` reaparece como `pending`** | fulfillment `correction_requested` | `planner_refresh_task_v0_projection` mapea a `pending` ⇒ la Task "descompleta" | `20260722020000:144` |
| **C-19** | **Dos endpoints de completion con selección de fulfillment distinta** | `POST /tasks/:id/complete` toma la 1ª `shared` (orden por responsible=actor) | `POST /v1/…/:fid/complete` toma la indicada | `20260722010000:1581-1586` |
| **C-20** | **`verify` V0 no acepta `fulfillmentId`** | V1 sí | V0 toma la `awaiting_verification` más antigua ⇒ **con `each_person` hay que llamar N veces y el orden importa** | `20260722010000:1685-1692` |
| **C-21** | **Dos sistemas de review de evidencia** | ciclo `correction_requested`→`resubmit` (vivo) | `evidence.review_result='correction_requested'` (nunca escrito) | `20260722020000:814-832` vs `20260914000001:103-105` |
| **C-22** | **Tasks fuera del feed Activity** | Events/Goals escriben `planner_activity_log` | Tasks escriben sólo `audit_events` ⇒ el feed transversal nunca muestra Tasks | `planner.activity.service.js` (sin imports desde tasks) |
| **C-23** | **Responsibilities fuera de Trash y Activity** | `GET /planner/trash` incluye tasks/events/goals/milestones | **no** incluye responsibilities | `planner.trash.service.js:205-227` |
| **C-24** | **Trash usa la capability `restore`** | no existe `task.trash` | `trashTask` exige `task.restore` | `planner.tasks.controller.js:335` |
| **C-25** | **`calendar` no filtra `status`** |其它 superficies filtran `cancelled` | `planner.calendar.service.js:212` sólo filtra `trashed_at` | |
| **C-26** | **`getResponsibility` materializa dos veces** | `get` → `getResponsibility` → `materializeHousehold` | `getResponsibility` → `listResponsibilities` → `materializeHousehold` otra vez | `planner.responsibilities.service.js:166-167` |
| **C-27** | **Timezone decorativo** | `dateOnly(date, household.timezone)` | `households.timezone` **no existe** ⇒ siempre `'UTC'`; `nextOccurrence` trabaja en UTC puro | `service:14-18,139` + columnas de `households` |
| **C-28** | **`responsibility` muda una Task sin cleanup** | `setLifecycle('trashed')` | `PlannerTasksScreen:493` oculta "Cancelar" si `responsibility_id` ⇒ la Task queda **sin forma de cancelarse desde la lista** | `planner.responsibilities.service.js:203-213` |
| **C-29** | **2 base de datos para Plan** | root vivo `planner_goals` (1 fila) | `planner_plans` leída por attention/search (0 filas) ⇒ **Plans invisibles** | `planner.attention.service.js:233`, `planner.search.service.js:245` |
| **C-30** | **`TaskDetail` desde Plan Detail no carga** | `PlannerPlanDetailScreenV1:529` navega con `{taskId}` | el parser exige `entityId` UUID ⇒ loading infinito | `plannerNavigationContract.ts:322-324` |
| **C-31** | **Evidence: la rama sin `fulfillmentId` no tiene ruta** | `plannerTasks.ts:628-630` ofrece ambos paths | backend declara sólo `POST /tasks/:id/evidence/:fulfillmentId` | `routes/planner.js:89` |
| **C-32** | **Test G0.2 afirma 201 en Task personal** | `planner_g0_2_contract_tests.js:177,202,241` | backend devuelve 400 `personal_tasks_not_supported` | |
| **C-33** | **`planner_g0_4_database_tests` es la única prueba cableada de completion** | `homeplus_g0_4_database_tests.js` (DB-MUT) | ninguna otra suite cableada ejercita `complete`/`verify`/assignment | `tests/db/run.js:77` |
| **C-34** | **`priority` legacy tolerado en código, prohibido en DB** | `normalizePriority` acepta `medium`/`critical`; `priorityLabelsWithLegacy` | CHECK `IN ('low','normal','high')` | `planner.tasks.service.js:178-185` vs `20260713001000:23-25` |
| **C-35** | **`planner_tasks` sin filtro de visibilidad** | `planner_goals.visibility`/`owner_person_id` existen | Tasks: todo miembro activo ve **todas** las Tasks del hogar; `toVisibilityInput` fuerza `scopeKind:'household'` | `planner.search.service.js:67-73` |

---

## 30. UNKNOWNS

| # | Unknown | Por qué NO se puede responder con evidencia |
|---|---|---|
| **U-1** | ¿El bucket `planner-evidence` permite upload público? | El cliente sube **directo** a Supabase Storage con las llaves del navegador. Las policies del bucket están fuera del catálogo `public` inspeccionado y fuera del alcance read-only de este audit. **No se exploró.** Determina si el usuario pierde la foto o sólo el registro |
| **U-2** | ¿Los overrides `households.config.permissions` activos en los 11 households con `permissions` tocan capacidades `task.*`? | El contenido de `config` no se inspeccionó por privacidad; sólo se verificó la **existencia** de la clave y la presencia de roles coordinator/adult. Si algún household tiene `task.archive:true`, la ruta de archive dejaría de estar bloqueada |
| **U-3** | ¿Existe un scheduler externo (Supabase Cron, GitHub Action, cron del host) que invoque `materializeHousehold`? | No hay cron en el repo ni script npm. Un cron **externo al repo** no es observable desde el árbol. **No se verificó fuera del repo** |
| **U-4** | ¿Los RPCs de Task funcionan en runtime? | Ejercitarlos exige **mutación de DB** (prohibida en esta sesión). El único dato de runtime es `planner_m11_1a_backfill_report()` (invariantes de shape, no de comportamiento). **Ninguna transición fue ejecutada** |
| **U-5** | ¿`each_person` funciona? | Igual que U-4, y además **no hay control de UI** que lo produzca y **ninguna suite cableada** que lo ejercite ⇒ doblemente inaccesible |
| **U-6** | ¿`claim`/`release` funcionan bajo concurrencia? | `scripts/planner_m11_1b_database_tests.js:475-487,655-736` los cubre pero es **huérfana** y DB-MUT |
| **U-7** | ¿La DB remota tiene datos reales? | Sólo se auditó la DB **local**. La evidencia de `data count` es de la local, no de producción |
| **U-8** | ¿Existe una versión anterior de `planner_tasks` con otra raíz en uso? | `git log` muestra 39 migraciones aplicadas de forma acumulativa; la tabla legacy `tasks` tiene 0 filas. No hay evidencia de una tercera raíz |
| **U-9** | ¿`planner_restore_rpc` / `restore_goal_rpc` restauran también las Tasks colgadas por `SET NULL`? | No hay código que registre el `goal_id` perdido ⇒ **irrecuperable** por diseño actual |
| **U-10** | ¿Cuál es el `payload_hash` esperado por `planner_task_v1_assert_payload_hash` en `submitTaskEvidence`? | **`submitTaskEvidence` NO calcula ni envía `mutation_id`/`idempotency_key`/`payload_hash` al RPC** — de hecho no llama a ningún RPC de mutación. Recibe `correlation` pero **lo ignora por completo** ⇒ la evidencia, aun funcionando, **no sería idempotente**. `planner.tasks.service.js:1368-1518` |
| **U-11** | ¿Por qué `planner_responsibilities` tiene 0 filas tras 6 meses de migración? | Sin evidencia. Sólo se sabe que el código y las rutas existen y que ninguna suite cableada las ejercita |
| **U-12** | ¿Existe un consumer fuera de `backend/src` que escriba `planner_tasks` directamente (ETL, script, webhook)? | Se grepeó `backend/src`, `scripts/`, `front/`. Un cliente externo con service_role no es observable |

---

## 31. HUMAN QUESTIONS (PART Z)

Sólo decisiones que CURRENT **no puede** responder. **No se responden aquí.**

---

**HQ-01**
**QUESTION:** ¿`task.archive` debe existir como concepto, y quién debe poder archivar?
**WHY CURRENT CANNOT ANSWER:** El concepto está implementado de extremo a extremo (columna, índice, 2 RPCs, 2 endpoints, cliente, UI) pero **inaccesible por diseño**: `task.archive = false` para los 6 roles en JS y ausente en SQL. CURRENT no dice si es una feature no estrenada, una feature retirada, o un error de default.
**EVIDENCE:** `20260914000002_planner_task_release_archive.sql:168,272`; `plannerCapabilities.js:107,147,187,227,267,307`; `planner_current_actor_has_capability` sin case; `planner_current_actor_has_capability(h,'task.archive') = false` (runtime); `TaskDetailScreen:1006-1010` muestra el botón.
**WHAT DECISION AFFECTS:** default de la matriz JS, case SQL, gating de UI (`TaskDetailScreen:1006`), y el filtro `archived_at` en summary/attention/calendar/search.

---

**HQ-02**
**QUESTION:** ¿Evidence es un requisito de `requires_verification`, o un canal independiente?
**WHY CURRENT CANNOT ANSWER:** Hay **tres** mecanismos de "revisión" coexistiendo: (a) el ciclo `fulfillment.correction_requested`→`resubmit` (vivo), (b) `evidence.review_result ∈ {verified, correction_requested}` (sin writer), (c) la foto obligatoria en la UI. Ninguno declara su relación con los otros dos.
**EVIDENCE:** `planner_task_evidence_attempts` sin funcion SQL que la mencione; `review_*` sin writer; `EvidencePhotoPicker:84-88`; `requires_verification` como unico config; `submitTaskEvidence` sin idempotency (U-10).
**WHAT DECISION AFFECTS:** si `requires_verification=true` **debe** exigir evidencia; si `evidence` es la fuente de la verificación o un comentario; qué se elimina (b) o (a); y si Evidence necesita su propio RPC.

---

**HQ-03**
**QUESTION:** ¿Task Personal debe existir?
**WHY CURRENT CANNOT ANSWER:** CURRENT la rechaza **explícitamente y en dos capas**, pero mantiene `task.create_personal = true` para 5 roles, el tipo `PlannerTaskScope`, y `planner_goals.visibility/owner_person_id` sí soporta scope personal. El rechazo puede ser "decidido" o "diferido"; CURRENT no lo dice.
**EVIDENCE:** `planner.tasks.controller.js:60-66`; `planner.tasks.service.js:642-648`; `plannerCapabilities.js:96,…`; `types/plannerTaskV1.ts:13`; `planner.search.service.js:67-73`.
**WHAT DECISION AFFECTS:** si `planner_tasks` gana `visibility`/`owner_person_id`, si `task.create_personal` se cablea, y si summary/attention/search deben anadir un filtro de visibilidad (hoy inexistente).

---

**HQ-04**
**QUESTION:** ¿Responsibility debe seguir **generando** Tasks, o sólo **agruparlas**?
**WHY CURRENT CANNOT ANSWER:** CURRENT hace las dos cosas parcialmente y de forma contradictoria: `planner_tasks.responsibility_id` funciona como **origin/template source** (la RPC copia los valores), mientras la UI lo trata como **grouping** (`PlannerTasksScreen:560-563` lista por responsabilidad) y `TaskDetailScreen:1250-1256` lo muestra como "origen". Además `lifecycle='trashed'` no afecta las Tasks ya generadas, y `TaskForm` no ofrece "crear desde responsabilidad".
**EVIDENCE:** `20260916000001:178-216`; `PlannerTasksScreen:478,491-494,560-563`; `TaskDetailScreen:1250-1256`; `setLifecycle:203-213`.
**WHAT DECISION AFFECTS:** `planner_tasks.responsibility_id` (`origin` vs `parent` vs `tag`), `planner_responsibility_occurrences`, el comportamiento de `trash`, y si el generador debe salir de la request path.

---

**HQ-05**
**QUESTION:** ¿La recurrencia debe dejar de depender de un request de lectura?
**WHY CURRENT CANNOT ANSWER:** No hay scheduler, y `materializeHousehold` se ejecuta en 10 call-sites, incluido **`GET /tasks`** (un `GET` que **crea Tasks**). CURRENT no dice si esto es intencional (pull) o un accidente.
**EVIDENCE:** `planner.tasks.controller.js:34,173,226,322`; `planner.responsibilities.service.js:150,166,181,199,211`; `package.json` sin script de scheduler; sin `node-cron`.
**WHAT DECISION AFFECTS:** presencia de un cron/worker, la semantica de `GET /tasks` (hoy no idempotente respecto de la creacion de Tasks), y el `outcome` que se devuelve al usuario.

---

**HQ-06**
**QUESTION:** ¿Debe haber capacidades `responsibility.*`?
**WHY CURRENT CANNOT ANSWER:** No existe ninguna. `POST /responsibilities` usa `task.create_household` (un `child` no puede crear Tasks pero sí podría… no, no puede crear Responsibilities) mientras `PATCH`/pause/archive/trash exigen **sólo** `planner.view`, y la RLS UPDATE no exige capability. CURRENT no dice si la ausencia es intentional.
**EVIDENCE:** `planner.responsibilities.controller.js:22,25-26`; `planner_responsibilities_update` policy; `planner_responsibility_members_*` policies.
**WHAT DECISION AFFECTS:** matriz de capacidades, policies RLS de las 3 tablas, y si `createResponsibility` debe reutilizar `task.create_household`.

---

**HQ-07**
**QUESTION:** ¿`correction_requested` debe existir a nivel Task, o sólo a nivel Fulfillment?
**WHY CURRENT CANNOT ANSWER:** La fila de fulfillment tiene 5 estados; la Task tiene 5 distintos **sin** `correction_requested`. La proyección mapea `correction_requested → 'pending'`, lo que hace que una Task "descomplete" visualmente y **vuelva a contar en `counts.tasks` y en la lista "Pendientes"** mientras sigue having un fulfillment esperando corrección. Además la UI define una clave de color para un estado Task que no existe (`TaskDetailScreen:424`).
**EVIDENCE:** `planner_task_fulfillment_status_check`; `planner_tasks_status_check`; `20260722020000:144`; `TaskDetailScreen:424`; `planner.summary.service.js:42`.
**WHAT DECISION AFFECTS:** `planner_tasks_status_check`, `planner_task_aggregate_v1`, `planner_refresh_task_v0_projection`, `TASK_STATUSES` (backend), `PlannerTaskStatus` (frontend), `TASK_ELEGIBLE_STATUSES`, y las ramas de las 6 superficies que leen `status`.

---

**HQ-08**
**QUESTION:** ¿Cuál es el modelo de "tarea propia" para capacidades?
**WHY CURRENT CANNOT ANSWER:** Hay **tres** criterios distintos conviviendo (`created_by_member_id` para capabilities, `responsible_member_id`/`completed_by_member_id` para `canManageOwn`, `planner_task_assignees.member_id` para `isAssignee`), y `resolveOwnershipCapability` — el único helper que formaliza la regla — está muerto y además devuelve una capability inexistente.
**EVIDENCE:** `plannerCapabilities.js:414-424` (0 callers, `:423` devuelve `action` sin sufijo); `planner.tasks.service.js:1013` vs `:738-740` vs `:991`.
**WHAT DECISION AFFECTS:** las 4 capabilities `*_own`/`*_any` de Task, la policy UPDATE de `planner_tasks`, el guard `planner_guard_task_fulfillment_projection:1308`, y si el assignee debería tener derecho de edición.

---

**HQ-09**
**QUESTION:** ¿`planner_responsibility_occurrences` debe seguir siendo escribible por `authenticated`?
**WHY CURRENT CANNOT ANSWER:** La tabla tiene `SELECT, INSERT, UPDATE` concedidos a `authenticated` y policies que sólo exigen `is_active_household_member`. Eso permite a un cliente **resolver** occurrences (`resolved_at`) y **crear** occurrences nuevas, eludiendo `materialize_planner_responsibility_v1` (locking, `next_sequence`, one-live guard, validación de miembros). CURRENT no dice si es una concesion deliberada para tests o un descuido.
**EVIDENCE:** `20260916000001:103,122-127`; `planner_responsibilities.service.js:104` (el writer legítimo es el backend).
**WHAT DECISION AFFECTS:** los grants, las 2 policies, y si el ledger es append-only.

---

**HQ-10**
**QUESTION:** ¿`planner_tasks` y `planner_responsibilities` deben compartir el mismo modelo de borrado lógico (`trashed_at` + `deleted_at`)?
**WHY CURRENT CANNOT ANSWER:** Task tiene `trashed_at` (columna) + `cancelled` (estado). Responsibility tiene `lifecycle` (4 valores, uno de los cuales es `trashed`) + `paused_at`/`archived_at`/`trashed_at`. **Cancel no existe en Responsibility**; **`archive` es un flag en Task y un estado en Responsibility**; `restore`/`resume`/`unarchive` son la misma operación en Responsibility. Y Responsibility no aparece en el Trash transversal.
**EVIDENCE:** columnas de ambas tablas; `planner.responsibilities.controller.js:37-39`; `planner.trash.service.js:205-227`; `planner.tasks.controller.js:335` (trash usa `task.restore`).
**WHAT DECISION AFFECTS:** `planner_responsibilities.lifecycle`, la inclusion en `GET /planner/trash`, `planner_activity_log`, `audit_events`, y si `archive` es un eje transversal o un concepto por dominio.

---

**HQ-11**
**QUESTION:** ¿Tasks deben aparecer en el feed Activity transversal?
**WHY CURRENT CANNOT ANSWER:** Events y Goals escriben `planner_activity_log`; Tasks escriben `audit_events`. Hay **dos** auditorías paralelas para el mismo dominio Planner y **ninguna** razón declarada para la separación. Responsibilities no audita en ninguna.
**EVIDENCE:** `planner.activity.service.js` importado por events/goals/plans pero **no** por tasks/responsibilities; `audit_events` con 5 filas `task.*`; `planner_activity_log` con 1 fila no-task.
**WHAT DECISION AFFECTS:** `GET /planner/activity`, `ALLOWED_ENTITY_TYPES` (`'task'` ya está incluido pero nunca se usa), la retención, y si `planner_activity_log` se elimina para Tasks.

---

**HQ-12**
**QUESTION:** ¿El vínculo Task↔Plan debe seguir siendo `planner_tasks.goal_id` (FK a `planner_goals`)?
**WHY CURRENT CANNOT ANSWER:** Es el único vínculo vivo, pero coexiste con `planner_plan_requirements` (tabla diseñada para links externos, 0 filas, con `task` explícitamente **rechazado** por test) y con `planner_plans` (0 filas, leída por attention/search ⇒ **Plans invisibles**). La reconstrucción de Plans está en curso en este mismo árbol. CURRENT no dice cuál es la raíz final ni qué pasa con `planner_goals`.
**EVIDENCE:** `planner_tasks_goal_id_fkey` `ON DELETE SET NULL`; `scripts/planner_m11_3a_contract_tests.js:185-189`; `planner.attention.service.js:233`; `planner.search.service.js:245`; `planner_plans` 0 filas, `planner_goals` 1 fila.
**WHAT DECISION AFFECTS:** `planner_tasks.goal_id`, el cálculo de `progress_mode='tasks'`, la autorización de escritura (`mutate_planner_task_v0` no valida `visibility='personal'`), y la traducción `lifecycle↔status`.

---

**HQ-13**
**QUESTION:** ¿Debe haber una capability `task.trash` separada de `task.restore`?
**WHY CURRENT CANNOT ANSWER:** Trash usa `task.restore` con un comentario explícito ("trash uses restore capability"). No hay `task.trash` en el catálogo JS ni en SQL. Un `guest` no puede trash **ni** restore.
**EVIDENCE:** `planner.tasks.controller.js:335`; catálogo `plannerCapabilities.js:26-69`; `planner_current_actor_has_capability` (sin `task.trash`).
**WHAT DECISION AFFECTS:** matriz JS, case SQL, policy UPDATE, guard `planner_guard_task_fulfillment_projection:1360`.

---

**HQ-14**
**QUESTION:** ¿`assigned_to_member_id` debe seguir existiendo en `planner_tasks`?
**WHY CURRENT CANNOT ANSWER:** Es una proyeccion que **se pierde** con 0 o N assignees. La usan `listTasks?assigned_to_member_id`, `planner.summary.service.js`, home one-tap completion, y `TaskDetailScreen`. Con `each_person` o multi-assignee, todos quedan ciegos. CURRENT no dice si es un residuo V0 que debe eliminarse o un campo de lectura rapida que debe mantenerse con otra semantica.
**EVIDENCE:** `20260722020000:153-160`; `planner.tasks.service.js:515-517`; `homeTaskOneTapEligibility.ts:98-110`.
**WHAT DECISION AFFECTS:** `planner_tasks.assigned_to_member_id`, `planner_sync_task_foundation_from_v0`, el filtro `assigned_to_member_id` del list, y la elegibilidad del one-tap de Home.

---

## 32. EVIDENCE REGISTRY (PART 32)

### 32.1 Migraciones leídas (íntegral o por sección)

| Migración | Contenido relevante |
|---|---|
| `202606230001_planner_mvp.sql` | Definición original de `planner_tasks` (19 cols), 4 CHECKs, 5 índices, 3 policies, grants, trigger `updated_at` |
| `202606230002_planner_table_grants.sql` | `grant select, insert, update, delete on planner_tasks to authenticated` (superseded por M11.1A) |
| `202607080003_planner_tasks_origin_fields.sql` | 4 columnas `origin_*` + CHECKs + 2 índices |
| `202607080004_planner_goals.sql:115-119` | FK `goal_id` + `idx_planner_tasks_goal` |
| `20260712000000_planner_version_columns.sql` | `version`, `version_positive`, trigger `increment_planner_version` |
| `20260713001000_normalize_planner_task_priorities.sql` | Normalización de `priority` a `('low','normal','high')` |
| `20260713003000_add_planner_trash_restore.sql` | `trashed_at`, `trashed_by_member_id` |
| `20260713004000_add_planner_cancellation_metadata.sql` | `cancelled_at`, `_by_member_id`, `_reason`, `_from_status` |
| `20260713005000_create_planner_activity_log.sql` | `planner_activity_log` (11 cols) |
| **`20260722010000_m11_1a_task_fulfillment_foundation.sql`** | **Núcleo**: `planner_current_actor_has_capability`, validaciones de backfill, FKs compuestos, 4 policies, las 3 tablas (`configs`/`assignees`/`fulfillments`), 3 CHECKs de estado, invariantes diferidas, `planner_create_current_task_fulfillments`, `planner_bootstrap_task_foundation`, `planner_sync_task_foundation_from_v0`, `planner_guard_task_fulfillment_projection`, `planner_refresh_task_v0_projection`, `complete_planner_task_with_audit`, `verify_planner_task_fulfillment_with_audit`, `planner_m11_1a_backfill_report`, revokes |
| **`20260722020000_m11_1b_task_fulfillment_operations.sql`** | `resubmitted_*`, `planner_task_aggregate_v1`, `planner_refresh_task_v0_projection` v2 (proyecta `assigned_to_member_id`), `update_planner_task_assignment_v1`, `claim_planner_task_v1`, `mutate_planner_task_fulfillment_v1`, `mutate_planner_task_v0` |
| `20260715010000_remove_broken_legacy_rpcs.sql` | Contexto de RPCs eliminados |
| `20260914000001_planner_task_checklist_evidence_duration.sql` | `estimated_duration_minutes`, `checklist` + validador, **`planner_task_evidence_attempts`** + grants |
| `20260914000002_planner_task_release_archive.sql` | `archived_at` + índice, `release_planner_task_v1`, `archive_planner_task_v1`, `unarchive_planner_task_v1` |
| **`20260916000001_planner_responsibilities_p2_1.sql`** | **Núcleo Responsibilities**: las 3 tablas, 2 columnas en `planner_tasks`, 3 CHECKs, 2 índices, 5 índices únicos, `planner_responsibility_touch_version`, RLS + 9 policies, grants, **`materialize_planner_responsibility_v1`**, comments |
| `20260916000002_planner_tasks_origin_module_include_planner.sql` | Amplía `origin_module_check` con `'planner'` |
| `20260916000003_planner_task_assignment_legacy_check_unidirectional.sql` | Hace `planner_task_assignment_legacy_check` unidireccional |
| `20261003000001/2/3_planner_plan_*` (untracked) | Lane Plans; **no tocan Tasks** |

### 32.2 Backend — archivos leídos

`backend/src/routes/planner.js` · `backend/src/routes/planner.v1.js` · `backend/src/controllers/planner.tasks.controller.js` · `backend/src/controllers/planner.responsibilities.controller.js` · `backend/src/services/planner.tasks.service.js` · `backend/src/services/planner.responsibilities.service.js` · `backend/src/services/planner.context.service.js` · `backend/src/domain/planner.responsibilities.domain.js` · `backend/src/lib/plannerCapabilities.js` · `backend/src/config/supabase.js` · `backend/src/constants/planner.constants.js` · `backend/src/services/planner.trash.service.js` · `backend/src/services/planner.summary.service.js` (extractos) · `backend/src/services/planner.attention.service.js` (extractos) · `backend/src/services/planner.search.service.js` (extractos) · `backend/src/services/planner.goals.service.js` (extractos) · `backend/src/services/planner.plans.v1.service.js` (extractos) · `backend/src/services/inventory.service.js` (extractos) · `backend/src/services/planner.activity.service.js` (extractos) · `package.json`

### 32.3 Frontend — archivos auditados por subagente

`front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx` · `TaskDetailScreen.tsx` · `TaskForm.tsx` · `CreateTaskScreen.tsx` · `EditTaskScreen.tsx` · `ResponsibilitiesScreen.tsx` · `ResponsibilityFormScreen.tsx` · `ResponsibilityDetailScreen.tsx` · `PlannerTrashScreen.tsx` · `PlannerCalendarComponents.tsx` · `PlannerPlanDetailScreenV1.tsx` · `PlannerScreen.tsx` · `GoalDetailScreen.tsx` · `screens/home/HomePlannerSections.tsx` · `HomeAdulto.tsx` · `HomeAdolescente.tsx` · `HomeAdultoMayor.tsx` · `components/planner/EvidencePhotoPicker.tsx` · `QuickActionsMenu.tsx` · `PlannerSheetHost.tsx` · `components/ui/QuickActionSheet.tsx` · `services/plannerTasks.ts` · `plannerResponsibilities.ts` · `plannerEvidence.ts` · `plannerTrash.ts` · `plannerSummary.ts` · `services/tasks.ts` · `services/plannerCapabilities.ts` · `services/plannerCapabilitiesAdapter.ts` · `services/planner/plannerQuickActions.ts` · `homeTaskOneTapEligibility.ts` · `adapters/planner/plannerTaskAdapters.ts` · `types/plannerTaskV1.ts` · `navigation/HomeTabNavigator.tsx` · `navigation/plannerNavigationContract.ts` · `navigation/types.ts` · `App.tsx`

### 32.4 Tests — archivos clasificados

`package.json` · `tests/run.js` · `tests/db/run.js` · `tests/integration/run.js` · `scripts/tsconfig.test.json` · `docs/implementation/planner/PLANNER_V0_SCHEMA_CHECKS.sql` · 21 suites cableadas · 21 suites huérfanas (inventario en §25)

### 32.5 Consultas SQL ejecutadas (todas read-only, en transacción rollback)

1. `information_schema.columns` → 39+8+8+23+16+23+5+11 columnas de las 8 tablas
2. `pg_constraint` (contype `c`,`f`,`p`,`u`) → 47 CHECKs, 43 FKs, 14 PK/UNIQUE
3. `pg_class` → `relrowsecurity`/`relforcerowsecurity` de las 8 tablas
4. `pg_policies` → 17 policies de las 8 tablas
5. `information_schema.role_table_grants` → 20 filas de grants
6. `pg_trigger` (no internal) → 18 triggers
7. `pg_trigger` (internal/RI) → 82 constraint triggers de FK
8. `pg_proc` (`prosrc ILIKE`) → 16 funciones que referencian `planner_tasks`, 1 que referencia `planner_responsibilit`, **0** que referencien `evidence_attempt`
9. `pg_proc` + `proacl` → 24 funciones del dominio con SECURITY y ACL
10. `pg_get_functiondef` → `is_active_household_member`, `current_household_member_id`
11. Row counts de las 16 tablas relevantes
12. Distribuciones: `planner_tasks.status`, `planner_task_fulfillments` (status×scope×current×active), `planner_task_assignment_configs`, `planner_responsibilities`
13. No-null counts de las 13 columnas clave de `planner_tasks`
14. `origin_module` × `origin_entity_type` distribution
15. `public.planner_m11_1a_backfill_report()`
16. `household_members` role/status; `households` con `config.permissions`; `planner_current_actor_has_capability(h,'task.archive')`
17. `planner_goals`, `planner_plans`, `planner_plan_requirements`, `tasks`, `inventory_restock_requests`, `planner_presets`, `audit_events` columnas y conteos

### 32.6 Comandos git ejecutados (todos read-only)

`git rev-parse HEAD` ×3 · `git status --short` ×3 · `git diff --name-only` ×3 · `git diff --cached --name-only` ×1 · `git diff --stat` ×1 · `git diff backend/src/services/planner.tasks.service.js` ×1 · `git worktree list` ×1

### 32.7 Marcas de evidencia usadas

`STATIC CONFIRMED` · `RUNTIME READ-ONLY VERIFIED` · `INFERRED` · `UNKNOWN` · `INCONCLUSIVE` · `NOT FOUND` · `DEAD` · `UNREACHABLE` · `LIVE` · `LEGACY ACTIVE` · `EMPTY DB FOUNDATION`
Distinción aplicada: `IMPLEMENTED` (código existe) / `WIRED` (hay consumidor) / `REACHABLE` (hay camino desde la UI) / `RUNTIME EXERCISED` (ejercitado con datos o ejecución). **Ninguna pieza de este documento está marcada `RUNTIME EXERCISED`** salvo `planner_m11_1a_backfill_report()` (invocada, read-only) y las lecturas del catálogo.
