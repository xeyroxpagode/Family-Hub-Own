# PLANS · CAPABILITY MAP CURRENT V1

**Tipo:** mapa forense READ-ONLY de capabilities/autorización que afectan a Plans. **NO diseña TARGET. NO recomienda arquitectura. NO decide `goal.*` vs `plan.*`. NO corrige código. NO implementa.**
**Worktree:** `C:\Users\thega\Desktop\HomePlus-worktrees\planner-current`
**HEAD:** `79f877f152072e759c11511bd91807273c4e1c13` (detached, no corregido)
**Fecha:** 2026-10-03
**Documentos hermanos (no modificados):** `PLANS_RECONSTRUCTION_DISCOVERY_V1.md`, `PLANS_RECONSTRUCTION_PLAN_V1.md`
**Único archivo escrito en esta sesión:** este documento. Ningún `git add/commit/push/reset/clean/stash/switch/checkout/merge/rebase`. Ningún SQL de escritura. Toda consulta DB con `SET LOCAL default_transaction_read_only = on`.

Etiquetas usadas: `STATIC CONFIRMED` (leído en archivo con `file:line`) · `RUNTIME READ-ONLY VERIFIED` (observado contra Supabase local `127.0.0.1:56222` sólo con SELECT) · `INFERRED` · `UNKNOWN` · `INCONCLUSIVE` · `NOT FOUND` (buscado, ausente).

---

## 1. Executive factual summary

- Existen **dos autoridades CURRENT de capabilities**: JS (`backend/src/lib/plannerCapabilities.js` + `capabilityEngine.js`) y SQL (tres funciones: `planner_current_actor_has_capability`, `planner_plan_actor_has_capability`, `planner_event_actor_has_capability`). `STATIC CONFIRMED`.
- Los **6 roles** son idénticos en JS y SQL, sin traducción: `coordinator, adult, adolescent, child, senior, guest`. `STATIC CONFIRMED`.
- Existen **11 capability keys `goal.*` en JS**; SQL (`planner_plan_actor_has_capability`) sólo representa **9** (faltan `goal.create_personal` y `goal.manage_participants`, que caen a `else false`). `STATIC CONFIRMED`.
- De las 11: **9 MATCH** JS=SQL por rol (incluido `goal.archive`, que ambas autoridades niegan a los 6 roles), **2 DIVERGENCE** (`goal.create_personal`, `goal.manage_participants`: `true` en JS para varios roles, `false` efectivo en SQL salvo override). `STATIC CONFIRMED`.
- **No existe namespace `plan.*`** en `backend/src` (0 hits de capability `plan.<verbo>`). `STATIC CONFIRMED`.
- `planner.view` es la dependencia no-`goal` central: gate de lectura en ~20 controllers/services JS y precondición de `planner_plan_can_read` / `planner_plan_can_mutate` en SQL. `STATIC CONFIRMED`.
- `households.config = { permissions: { "<capability>": { "<role>": boolean } } }`, parcial por clave; lo no-booleano cae a defaults. JS y SQL interpretan igual (override booleano gana, si no default/`CASE`, si no `false`). Keys desconocidas se **ignoran** (caen a `false`), no se rechazan. `STATIC CONFIRMED`.
- **Uso real de overrides:** 10 de 97 households tienen `config.permissions`, con sólo 6 keys (`approve_members, assign_coordinator, edit_config, invite_members, manage_roles, remove_members`). **Cero overrides `goal.*`, `planner.*`, `task.*`, `event.*`.** `RUNTIME READ-ONLY VERIFIED`.
- `goal.manage_participants` no tiene ningún consumidor (sólo catálogo+matriz JS). `STATIC CONFIRMED` → clasificada `DEAD`.
- `goal.archive` es `false` en los 6 roles JS y `when 'goal.archive' then false` en SQL; tiene callers (backend + SQL mapping + UI parcial) pero **ningún actor puede pasar el check sin override**. `STATIC CONFIRMED` → `UNREACHABLE` (no `DEAD`: el cableado existe).
- **Seguridad (sólo lo que afecta authorization):** `trash_goal_rpc` es ejecutable por `anon` (`RUNTIME READ-ONLY VERIFIED` vía `has_function_privilege`), no verifica capability y acepta `p_member_id` del llamante; el backend nunca lo llama. Explotación **no intentada** → `INCONCLUSIVE` en exploit, `CONFIGURATION CONFIRMED` en configuración. `write_planner_plan_graph_rpc` también es ejecutable por `anon` a nivel de grant, pero exige `auth.uid()` + persona → falla cerrado (`STATIC CONFIRMED`, `NOT EXPLOITED`). La vista `planner_legacy_goal_plan_projection` otorga todo a `anon`/`authenticated` pero `information_schema` la declara no actualizable → `INCONCLUSIVE`.
- `planner_goals` (tabla legacy): `anon` conserva grants totales y la policy `planner_goals_select_visible` **no filtra `trashed_at`** (sí `can_select/can_update_planner_goal`, que sí lo filtran) → goals trasteados visibles por SELECT directo. `RUNTIME READ-ONLY VERIFIED`.
- Sistema `planner_goals` (V1): autorización = `planner.view` + capabilities `goal.*` own (casi nunca `any`) en backend + RLS **sin capabilities** (sólo membresía/visibilidad/creador). Sistema `planner_plans` (canónico): autorización = `planner.view` + `goal.*` own/any en backend + `planner_plan_can_read/can_mutate` en SQL + RLS SELECT-only + escrituras sólo vía RPC `service_role`. `STATIC CONFIRMED`.

---

## 2. Preflight

| Ítem | Valor | Cómo |
|---|---|---|
| `git rev-parse --show-toplevel` | `C:/Users/thega/Desktop/HomePlus-worktrees/planner-current` | `STATIC CONFIRMED` |
| `HEAD` | `79f877f152072e759c11511bd91807273c4e1c13` | `git rev-parse HEAD` |
| Branch | `(detached HEAD)` — `git branch --show-current` vacío | `STATIC CONFIRMED`, **no corregido** |
| `git status --short` | `?? PLANS_RECONSTRUCTION_DISCOVERY_V1.md` · `?? PLANS_RECONSTRUCTION_PLAN_V1.md` | `STATIC CONFIRMED` |
| `git worktree list` | 6 worktrees; este = `79f877f (detached HEAD)` | `STATIC CONFIRMED` |
| `git log --oneline -5` | `79f877f chore(qa): snapshot homecloud slice 01` · `80d1e38` · `18318be` · `b92cbd0` · `613f7c6` | `STATIC CONFIRMED` |
| Remoto | `origin https://github.com/xeyroxpagode/Family-Hub-Own.git` | `STATIC CONFIRMED` |
| DB local | Supabase local corriendo; `postgresql://postgres:postgres@127.0.0.1:56222/postgres`; `supabase_migrations.schema_migrations = 112` | `RUNTIME READ-ONLY VERIFIED` |
| Filas | `planner_plans 0` · `planner_goals 1` (`preparation`/`active`, `visibility=household`) · `planner_plan_measurements 0` · `history 0` · `requirements 0` · `tasks 3` · `events 0` · `households 97` | `RUNTIME READ-ONLY VERIFIED` |

**Deviations respecto al Discovery anterior:**
1. `git status` ya no está limpio: los 2 untracked son los documentos hermanos de la sesión anterior (esperado; no son cambios de código). Ningún archivo existente modificado.
2. `households`: **97** hoy vs 103 en Discovery. `household_members` por rol hoy: `coordinator 12`, `adult 2` (sólo 2 de los 6 roles tienen miembros reales). `RUNTIME READ-ONLY VERIFIED`. Causa de la diferencia no investigada (fuera de alcance; sólo se registra).
3. Detached HEAD confirmado igual que en Discovery; no se tocó.

---

## 3. Authority / source inventory

### 3.1 Autoridad JS

| Fuente | Contenido | `file:line` |
|---|---|---|
| `backend/src/lib/plannerCapabilities.js` | Catálogo `PLANNER_CAPABILITIES` (30 keys), `PLANNER_ROLES` (6), `DEFAULT_CAPABILITY_MATRIX`, `readConfiguredPermission`, `resolveCapabilities`, `hasCapability`, `assertCapability`, `resolveOwnershipCapability` | `:26-69, :71-78, :91-332, :342-353, :364-375, :382-398, :414-424` |
| `backend/src/lib/capabilityEngine.js` | `createCapabilityCatalog`, `projectCapabilities` (resolver `=== true`), `hasCapability` (`projection[cap] === true`), `assertCapability` (lanza 403) | `:5-11, :13-15, :17-19, :21-29` |
| `backend/src/lib/householdPermissions.js` | `readHouseholdPermission` + `DEFAULT_HOUSEHOLD_PERMISSIONS` (6 household + 4 `homecloud.*`); misma semántica de override que planner | `STATIC CONFIRMED` (vía inventario) |
| `backend/src/lib/homecloudCapabilities.js` | Único validador estricto `assertKnownHomeCloudCapability` (400 `homecloud_unknown_capability`); planner **no** tiene equivalente | `:107-117` (vía inventario) |

### 3.2 Autoridad SQL (funciones de capability)

| Función | Cubre | Definición |
|---|---|---|
| `planner_current_actor_has_capability(uuid,text)` | `planner.view`, `task.*` (parcial), `goal.restore`, `planner.templates.*`; resto `else false` | `supabase/migrations/20260722010000_m11_1a_task_fulfillment_foundation.sql:14-63`, reemplazada por `20260918000001_planner_preset_templates_capability.sql:21-73` (añade `templates.use/manage`) |
| `planner_plan_actor_has_capability(uuid,text)` | `planner.view` + 9 `goal.*` (sin `create_personal`, sin `manage_participants`); `goal.archive → false` | `20260722040000_m11_3a_plan_graph_foundation.sql:317-360` |
| `planner_event_actor_has_capability(uuid,text)` | `planner.view` + `event.*` (7 keys) | `20260722030000_m11_2a_event_domain_foundation.sql:323-366` |
| `can_select_planner_goal(uuid)` / `can_update_planner_goal(uuid)` | RLS goals: membresía activa + `visibility/creador`; v2 exige `trashed_at IS NULL` | `202607080004_planner_goals.sql:177-215` + `20260713003000_add_planner_trash_restore.sql:66-106`; cuerpo runtime con `trashed_at` `RUNTIME READ-ONLY VERIFIED` (prosrc) |
| `planner_plan_can_read(uuid,bool)` | personal⇒dueño; household⇒miembro + `planner.view` + (draft⇒creador) | `20260722040000:362-382` |
| `planner_plan_can_mutate(uuid,text)` | personal⇒dueño; household⇒miembro + `planner.view` + draft-creador + mapeo acción→`goal.*` (`archive/unarchive→goal.archive`, `trash/restore→goal.restore`, `complete→complete_own/any`, `close/reopen→close_own/any`, resto→edit_own/any por `created_by_member_id`) | `20260722040000:384-422` |
| `planner_event_can_view` / `planner_event_can_mutate` | scope personal/household + capabilities `event.*` | `20260722030000:368-422` |
| `planner_plan_authorization_context_rpc(uuid)` | contexto leído por el backend (`scope, household_id, created_by_member_id…`) | `20260722040000:424-437`; consumido en `backend/src/services/planner.plans.service.js:268-275` |
| `planner_plan_v1_authorization_context_rpc(uuid)` | definida, **nunca invocada desde backend** | `20260908000001_planner_canonical_plan_lifecycle.sql:69-90` |

### 3.3 Controllers / services / routes / RPCs

| Capa | Archivos |
|---|---|
| Controllers con checks `goal.*`/`planner.view` | `backend/src/controllers/planner.goals.controller.js` (15 asserts: `:29, :41, :86, :117, :148, :179, :210, :242, :274, :305, :317, :347, :378, :409, :440`), `planner.plans.controller.js` (`capabilityForWrite` `:35-48`, `assertBackendWriteAuthorization` `:50-81`), `planner.plans.v1.controller.js` (`:29, :41, :56-57, :87, :118, :149, :180, :211`) |
| Services | `services/planner.plans.service.js` (`structuralActions` `:140-149`, `toPlanDto` `:151-169`, RPC calls `:260, :269, :279, :326`), `services/planner.plans.v1.service.js` (doble enforcement `:248-253, :335-340, :394-425, :521-526, :643-648`), `services/planner.goals.service.js` (`restore_goal_rpc` `:738`, `trash_milestone_rpc` `:565`, `restore_milestone_rpc` `:638`) |
| Contexto identidad | `services/planner.context.service.js:4-71` (`getPlannerContext`), `:75-108` / `:110-177` (scope contexts) |
| Rutas | `routes/planner.js` (goals `:123-140`, plans canónicos `:69-74`, tasks `:76-102`, events `:104-118`, capabilities `:53`, trash `:57`, search `:58`, attention `:60`, summary `:121`), `routes/planner.v1.js:6-13` (8 endpoints V1), `routes/planner.presets-drafts.js` (sin `goal.*`) |
| RPCs llamados por backend | `read_planner_plan_graph_rpc`, `write_planner_plan_graph_rpc`, `apply_planner_plan_structure_changeset_rpc`, `restore_goal_rpc`, `planner_plan_authorization_context_rpc`. **Nunca llamados desde backend:** `trash_goal_rpc`, `can_select/can_update_planner_goal` (sólo RLS/RPC internos), `planner_plan_v1_authorization_context_rpc` |
| RLS + grants | §12 |
| `households.config` | §7–§8 |
| Frontend consumers | §13 (`services/plannerCapabilities.ts`, `services/planner/plannerCapabilitiesAdapter.ts`, `services/planner/plannerPlans.ts:567,1071-1104`, `screens/planner/PlannerPlansSurfaces.tsx:147-199`, `components/planner/QuickActionsMenu.tsx`, `services/planner/plannerQuickActions.ts`) |

Términos de búsqueda aplicados: `goal.` · `planner.` · `task.` · `event.` · `archive` · `trash` · `restore` · `complete` · `reopen` · `pause` · `resume` · `create` · `personal` · `household` · `manage` · `capability` · `capabilities` · `availableActions` · `households.config`. Semántica **no** asumida entre hits: cada sección distingue sistema `planner_goals` vs `planner_plans`.

---

## 4. Six role registry

`STATIC CONFIRMED`. Los 6 roles son literales idénticos en JS y SQL; SQL no traduce (usa `household_members.role` directo como `v_role`).

| # | ROLE KEY | Display/semantic name | SOURCE JS | SOURCE SQL | Default capability set | Override support |
|---|---|---|---|---|---|---|
| 1 | `coordinator` | (sin display name en código; es el valor de `household_members.role`) | `plannerCapabilities.js:72,92-131` | `planner_plan_actor_has_capability` (`20260722040000:332-357`), `planner_current_actor_has_capability` (`20260722010000:29-61` / `20260918000001:36-71`) | §5 (todo `goal.*` `true` salvo `archive=false`) | Sí: `config.permissions[<cap>][coordinator]` boolean en ambas autoridades |
| 2 | `adult` | idem | `:73,132-171` | idem | §5 (igual que coordinator en `goal.*`) | Sí |
| 3 | `adolescent` | idem | `:74,172-211` | idem | §5 (`create_household true`, `*_any false`, `manage false`, `restore true`) | Sí |
| 4 | `child` | idem | `:75,212-251` | idem | §5 (`create_household false`, `create_personal true`, `*_any false`, `manage false`, `restore true`) | Sí |
| 5 | `senior` | idem | `:76,252-291` | idem | §5 (igual que coordinator/adult en `goal.*`) | Sí |
| 6 | `guest` | idem | `:77,292-331` | idem | §5 (`create_* false`, `edit/complete/close_own true`, `*_any false`, `manage false`, `archive false`, `restore false`; `planner.view true`) | Sí |

Notas: `PLANNER_ROLES = Object.freeze([...])` (`:71-78`); rol desconocido o membresía no-`active` ⇒ proyección toda `false` en JS (`resolveCapabilities` `:368-370`); en SQL rol sin fila activa ⇒ `return false` (`:340`). Roles con miembros reales hoy: sólo `coordinator` (12) y `adult` (2) (`RUNTIME READ-ONLY VERIFIED`); `adolescent/child/senior/guest` sin miembros ⇒ sus defaults **no ejercitados en runtime**.

---

## 5. Exact `goal.*` catalog

Universo CURRENT: las 11 keys del catálogo JS (`plannerCapabilities.js:53-63`). No existe ninguna otra `goal.*` en JS ni en SQL (búsqueda `goal\.` completa; resto de hits son `goal.created/goal.restored…` strings de activity, no capabilities).

### 5.1 Matriz JS (defaults por rol) — `STATIC CONFIRMED`

| capability | coordinator | adult | adolescent | child | senior | guest |
|---|---|---|---|---|---|---|
| `goal.create_household` | true | true | true | false | true | false |
| `goal.create_personal` | true | true | true | true | true | false |
| `goal.edit_own` | true | true | true | true | true | true |
| `goal.edit_any` | true | true | false | false | true | false |
| `goal.complete_own` | true | true | true | true | true | true |
| `goal.complete_any` | true | true | false | false | true | false |
| `goal.close_own` | true | true | true | true | true | true |
| `goal.close_any` | true | true | false | false | true | false |
| `goal.manage_participants` | true | true | false | false | true | false |
| `goal.archive` | false | false | false | false | false | false |
| `goal.restore` | true | true | true | true | true | false |

Fuente filas: `:116-126, :156-166, :196-206, :236-246, :276-286, :316-326`.

### 5.2 Matriz SQL (defaults por rol en `planner_plan_actor_has_capability`) — `STATIC CONFIRMED`

| capability | coordinator | adult | adolescent | child | senior | guest |
|---|---|---|---|---|---|---|
| `goal.create_household` | true | true | true | false | true | false |
| `goal.create_personal` | **not represented** (→false) | not represented | not represented | not represented | not represented | not represented |
| `goal.edit_own` | true | true | true | true | true | true |
| `goal.edit_any` | true | true | false | false | true | false |
| `goal.complete_own` | true | true | true | true | true | true |
| `goal.complete_any` | true | true | false | false | true | false |
| `goal.close_own` | true | true | true | true | true | true |
| `goal.close_any` | true | true | false | false | true | false |
| `goal.manage_participants` | **not represented** (→false) | not represented | not represented | not represented | not represented | not represented |
| `goal.archive` | false (`when … then false`) | false | false | false | false | false |
| `goal.restore` | true | true | true | true | true | false |

Fuente: `20260722040000:346-358`. (`planner_current_actor_has_capability` sólo representa `goal.restore` con el mismo set por rol: `:59` / `20260918000001:66`.)

### 5.3 Fichas por capability

Formato: `JS=SÍ/NO` por rol resumido + veredicto + consumidores + UI + reachability. Valores permitidos: `true/false/conditional/not represented/unknown`.

**`goal.create_household`** — JS: coord/adult/adolescent/senior `true`, child/guest `false`. SQL: idéntico. **JS=SQL: MATCH.** Override posible: sí (ambas). JS source `:53,116,156,196,236,276,316`. SQL source `20260722040000:348`. CURRENT CONSUMERS: `planner.goals.controller.js:55-56` (DIRECT, `POST /goals` visibility≠personal), `planner.plans.v1.controller.js:56-57` + `planner.plans.v1.service.js:248-253` (DIRECT ×2, `POST /v1/plans` scope household), `planner.plans.controller.js:56` (DIRECT, `POST /plans` household create), `write_planner_plan_graph_rpc` `:838-842` (RPC INTERNAL: exige `planner.view` + `goal.create_household`). CURRENT UI: `QuickActionsMenu`/`plannerQuickActions.ts:49-62` (AUTH-DRIVEN pero `create_goal implemented:false` ⇒ DEAD en UI), `GoalForm`/crear plan (STATIC VISIBLE, sin gate de capabilities). RUNTIME REACHABLE: **conditional** (backend alcanzable; SQL `planner_plans` alcanzable; RLS `planner_goals` INSERT no verifica capability — ver §6). NOTES: es la única capability de create verificada en las dos capas del path canónico.

**`goal.create_personal`** — JS: todos `true` salvo guest. SQL: **not represented** (`else false`). **DIVERGENCE.** Override posible: sí (un override `true` la habilitaría en SQL aunque el default sea falso). JS source `:54`. SQL source: ausencia en `:346-358`. CONSUMERS: mismos call sites que `create_household` rama personal (`planner.goals.controller.js:55`, `planner.plans.v1.controller.js:56`, `planner.plans.v1.service.js:246`). RPC: **ninguno** (el writer canónico rama personal no verifica capability: `20260722040000:828-843` sólo valida scope/objective; el controller `:52` retorna sin check). UI: igual que `create_household`. RUNTIME REACHABLE: **conditional** — por backend JS sí (roles con `true`), por SQL `planner_plans` sí (nadie la pide), por RLS `planner_goals` sí (la policy INSERT no la pide). NOTES: la divergencia es latente, no bloqueante: ningún gate SQL la exige.

**`goal.edit_own`** — JS: 6×`true`. SQL: 6×`true`. **MATCH.** Override: sí. JS `:55`. SQL `:349`. CONSUMERS (DIRECT): `planner.goals.controller.js:86` (PATCH goal), `:317, :347` (milestones), `planner.plans.v1.controller.js:87` + `:118` (gate grueso transition) + `planner.plans.v1.service.js:340,405,408,423,425` (update + transitions active/paused/resume/default), `planner.plans.controller.js:40,47,73-75` vía `capabilityForWrite` (plan update/component ops own). RPC: `planner_plan_can_mutate` rama else (`:417-418`) + `apply_planner_plan_structure_changeset_rpc` (`20260722090002:258` exige `can_mutate 'edit'`). UI: canónico AUTH-DRIVEN (`availableActions`→`update`); V1/Goals STATIC (sin lectura de capabilities). REACHABLE: **true**.

**`goal.edit_any`** — JS: coord/adult/senior `true`. SQL: idéntico. **MATCH.** Override: sí. JS `:56`. SQL `:350`. CONSUMERS: **sin `assertCapability` literal en `backend/src`**; sólo vía `capabilityForWrite` (`planner.plans.controller.js:40,47`) y `transitionPlan` (`planner.plans.v1.service.js:411,414,417` con `isOwner`). Clasificación: INDIRECT (own/any mapping). RPC: `can_mutate` else-branch. UI: ninguna superficie distingue own/any. REACHABLE: **conditional** (sólo si el actor no es creador y tiene rol con `true`).

**`goal.complete_own`** — JS 6×`true`; SQL 6×`true`. **MATCH.** JS `:57`. SQL `:351`. CONSUMERS: `planner.goals.controller.js:179` (DIRECT `POST /goals/:id/complete`), `planner.plans.controller.js:45` (mapping), `planner.plans.v1.service.js:411` (isOwner). RPC: `can_mutate` `:413-414`. UI: V1 botones HARDCODED (`PlannerPlanDetailScreenV1.tsx:441-464`), canónico AUTH-DRIVEN (`complete` en `structuralActions`). REACHABLE: **true** (V1 y goals); canónico **conditional** (puerta `confirm_unresolved` + requirements).

**`goal.complete_any`** — JS/SQL: coord/adult/senior `true`. **MATCH.** JS `:58`. SQL `:352`. CONSUMERS: sólo mapping (igual que `edit_any`). INDIRECT. REACHABLE: **conditional**.

**`goal.close_own`** — JS 6×`true`; SQL 6×`true`. **MATCH.** JS `:59`. SQL `:353`. CONSUMERS: `planner.goals.controller.js:210` (close), `:242` (fail), `:274` (reopen usa close), `planner.plans.controller.js:46`, `planner.plans.v1.service.js:414,417`. RPC: `can_mutate` `:415-416`. UI: V1 (`cancelled`/`reopen`), canónico (`close` en `structuralActions` active/paused). REACHABLE: **true**.

**`goal.close_any`** — JS/SQL coord/adult/senior `true`. **MATCH.** JS `:60`. SQL `:354`. Sólo mapping. INDIRECT. REACHABLE: **conditional**.

**`goal.manage_participants`** — JS: coord/adult/senior `true`. SQL: **not represented**. **DIVERGENCE.** JS `:61`. CONSUMERS: **ninguno** (0 `assert/hasCapability` en `backend/src`; 0 referencias SQL; 0 UI). Clasificación: **DEAD**. REACHABLE: **false** (nadie la verifica). NOTES: ver §14.

**`goal.archive`** — JS 6×`false`; SQL `then false`. **MATCH (por denegación).** JS `:62`. SQL `:355`. CONSUMERS: `planner.plans.controller.js:43` (mapping archive/unarchive), `planner.plans.v1.controller.js:211` (DIRECT `unarchivePlan`), `planner.plans.v1.service.js:420,648` (transition archive + unarchive), `can_mutate` `:411`, CHECK `planner_plans_archive_terminal_only` (`20260722040000:49-50`), writer ramas archive/unarchive (`:996-999,1036-1041`; idénticas en `20260722049000:244-288`). UI: V1 `availableTransitions` incluye `archive` (`PlannerPlanDetailScreenV1.tsx:246-247`) pero las ramas completed/cancelled (`:466-494`) sólo renderizan Reabrir ⇒ **archive inrenderizable**; canónico `structuralActions` (`:145-147`) lo expone según `archived_at`. REACHABLE: **false** (todo caller desemboca en 403 sin override). NOTES: ver §15 caso especial.

**`goal.restore`** — JS: todos `true` salvo guest. SQL: idéntico (ambas funciones SQL). **MATCH.** JS `:63`. SQL `20260722040000:356` + `20260722010000:59`. CONSUMERS: `planner.goals.controller.js:117` (delete=trash), `:148` (restore), `:378,409,440` (milestones), `planner.plans.controller.js:39,44`, `planner.plans.v1.controller.js:149,180`, `planner.plans.v1.service.js:526`, `restore_goal_rpc` endurecido (`20260722010000:1770-1774` exige `goal.restore` + anti-spoofing). UI: papelera/Trash STATIC (sin gate), restore por RPC. REACHABLE: **true** (salvo guest).

---

## 6. Non-`goal` dependencies used by Plan (`PLAN AUTH DEPENDENCIES OUTSIDE goal.*`)

`STATIC CONFIRMED`. Alcance: sólo capabilities que participan directamente en leer/crear/mutar/ver-draft/archive/trash-restore/operar-componentes de Plan.

| Capability | Dónde participa en Plan | Evidencia |
|---|---|---|
| `planner.view` | Gate de lectura en `listPlans/getPlanById` (V1 + goals + canónico list), y **precondición** de `planner_plan_can_read` (`:378`) y `planner_plan_can_mutate` (`:402-404`); gate de `getHouseholdCapabilityContext` (todo write household canónico); search/summary/attention/activity/drafts/schedules | Controllers (lista §3.3/§8), `20260722040000:378,402-404,839` |
| `planner.search` | `GET /api/planner/search` (Search abre Plans por id del sistema canónico) | `search.controller.js:36-37` (vía inventario) |
| `task.create_household` | Crear Task desde/hacia un Plan (V1 `handleCreateTask` → TaskForm; link existente escribe `goal_id` vía tasks PATCH) | `planner.tasks.service.js` + RLS `20260722010000:300-329` |
| `task.edit_own` / `task.edit_any` | **Link/unlink Task en V1** = `PATCH /tasks/:id` con `goal_id` (ordinary edit, `20260722020000:1113-1139`); guard `task.edit_own/any` (`20260722010000:1387-1393`) | `PlannerPlanDetailScreenV1.tsx:198-211,213-238`; `planner.tasks.service.js:787-795,1117` |
| `task.restore` | RLS update tasks (`:331-…`); trash/restore de Task vinculada (no del Plan) | `20260722010000:331+` |
| `event.create_household` / `event.edit_own/any` / `event.cancel_*` | Sólo si un Event se vincula a un Plan vía requirement externo (sin writer UI CURRENT); validación de scope en `planner_plan_validate_external_link` (`20260722090002:172-183`) | `20260722090002:153-188,467-492` |
| `planner.templates.use/manage`, `planner.audit.view`, `planner.settings.manage` | **No participan** en Plan CURRENT (sólo presets/audit/settings) | Catálogo `:65-68`; SQL `20260918000001:68-69` |

No se amplía a todo Planner: `task.assign_*/complete_*/verify/cancel_*`, `event.manage_participants` no intervienen en paths de Plan.

---

## 7. JS vs SQL parity audit

Autoridades comparadas: JS `DEFAULT_CAPABILITY_MATRIX` vs SQL `planner_plan_actor_has_capability` CASE (la función que `can_read/can_mutate` y el writer canónico consultan). La comparación con `planner_current_actor_has_capability` se anota donde difiere.

| Capability | Veredicto | JS behavior | SQL behavior | Actual callers | Potential current effect |
|---|---|---|---|---|---|
| `goal.create_household` | MATCH | T×4 roles (no child/guest) | idéntico set | backend ×4 + writer RPC | ninguno |
| `goal.create_personal` | DIVERGENCE | T×5 (no guest) | **not represented** → `false` (override posible) | backend la exige; SQL nunca la pide | latente: un guest pasa backend pero SQL goals-RLS tampoco la pide; sin efecto bloqueante CURRENT |
| `goal.edit_own` | MATCH | T×6 | T×6 | §5.3 | ninguno |
| `goal.edit_any` | MATCH | T×3 | T×3 | sólo mapping | ninguno |
| `goal.complete_own` | MATCH | T×6 | T×6 | §5.3 | ninguno |
| `goal.complete_any` | MATCH | T×3 | T×3 | sólo mapping | ninguno |
| `goal.close_own` | MATCH | T×6 | T×6 | §5.3 | ninguno |
| `goal.close_any` | MATCH | T×3 | T×3 | sólo mapping | ninguno |
| `goal.manage_participants` | DIVERGENCE (JS_ONLY) | T×3 | **not represented** → `false` | **ninguno** | ninguno (DEAD) |
| `goal.archive` | MATCH (deny/deny) | F×6 | `then false` | mapping+callers que siempre deniegan | archive inalcanzable en ambas capas |
| `goal.restore` | MATCH | T×5 (no guest) | idéntico (ambas fns SQL) | §5.3 | ninguno |
| Fallback rol desconocido/inactivo | MATCH | todo `false` | `return false` | — | ninguno |
| Override `households.config` | MATCH | `permissions[cap][role]` boolean gana; si no default; si no `false` | `v_config->'permissions'->cap->role` boolean gana; si no CASE; si no `false` | `resolveCapabilities` vs los 3 `*_actor_has_capability` | ninguno |
| Unknown capability | MATCH (ignore/ignore) | `defaults[cap]===true` → `false` | `else false` | — | una key renombrada se deniega en ambas (ver §7 Q16) |
| `goal.*` en `planner_current_actor_has_capability` | DIVERGENCE (SQL_ONLY parcial) | n/a | sólo `goal.restore`; resto `else false` | RLS tasks + `restore_goal_rpc` endurecido | tasks-RLS nunca otorga `goal.*` salvo restore |
| Goals-RLS INSERT/UPDATE vs capabilities | DIVERGENCE | backend exige `goal.create_*/edit_own` | policies INSERT/UPDATE **no consultan capabilities** (sólo membresía+creador+visibilidad) | `POST/PATCH /goals`, `POST /v1/plans` writes | backend es el único enforcement de capabilities en sistema goals; SQL directo bypasea capabilities (sujeto a RLS) |
| `planner.view` guest | MATCH | `true` | `true` (las 3 fns) | — | guest puede leer (con resto de gates) |

Sin solución recomendada (regla del encargo). Clasificaciones usadas: `MATCH`, `DIVERGENCE`, `JS_ONLY`, `SQL_ONLY`, `UNKNOWN` (ningún `UNKNOWN` en esta tabla: todo lo listado fue leído).

---

## 8. `households.config` override system

Respuestas exactas (`STATIC CONFIRMED` salvo §8).

1. **¿Dónde se almacena?** Columna `households.config` (JSONB). Lectura SQL: `20260722010000:29-36`, `20260722040000:332-338`, `20260918000001:36-52`. Lectura JS: `plannerCapabilities.js:342-353`.
2. **¿Qué JSON shape usa?** `{ "permissions": { "<capability>": { "<role>": boolean } } }`, más claves hermanas (`setup_version`, defaults `get_default_household_permissions()` en `202606240001:49-104`, ampliado por `20260917000000:24-110`).
3. **¿Por household?** Sí: se lee `h.config` del household del actor (`join households h on h.id = hm.household_id`).
4. **¿Por role?** Sí: tercer nivel `<role>`; roles los 6 de §4.
5. **¿Por member/person?** No: no hay nivel por miembro ni por persona.
6. **¿Por capability key?** Sí: segundo nivel `<capability>` con el nombre canónico (`goal.archive`, `planner.view`, …).
7. **¿Puede establecer `true`?** Sí: cualquier boolean `true` almacenado gana al default (incluido habilitar `goal.archive`, hoy `false` global).
8. **¿Puede establecer `false`?** Sí: `false` almacenado deniega aunque el default sea `true`.
9. **¿Cómo se mezcla con defaults?** Override puntual por tripleta `(capability, role)`: si `jsonb_typeof == 'boolean'` se retorna; si no, default de matriz/CASE; `readConfiguredPermission` trata no-booleano como "usar default".
10. **¿Quién lo lee?** JS: `resolveCapabilities` (todos los controllers planner + `planner.plans.v1.service.js`, `planner.tasks.service.js:48`). SQL: las 3 `*_actor_has_capability`.
11. **¿JS y SQL lo interpretan igual?** Sí en lo observado: misma precedencia, misma granularidad, mismo trato de no-booleano. Diferencia de forma (JS `typeof block[role] === 'boolean'`; SQL `jsonb_typeof = 'boolean'`) sin efecto semántico detectado.
12. **¿Hay validación de keys?** No para planner: ningún CHECK, trigger ni `assertKnown*` sobre `config.permissions` para `goal.*/task.*/event.*/planner.*`. (Sólo HomeCloud valida las suyas: `homecloudCapabilities.js:107-117`.)
13. **¿Key desconocida: se acepta, ignora o rechaza?** Se **acepta el dato e ignora el efecto**: SQL `else false`, JS `=== true → false`. No hay error 400 ni log.
14. **¿Migrations históricas de capability names?** `NOT FOUND`: ninguna migración renombra capability keys; el CASE SQL creció por adición (`goal.restore` en M11.1A, `templates.*` en P2.2A), nunca por renombre.
15. **¿UI/config actual que escriba overrides?** `NOT FOUND` para `goal.*`: ningún writer de UI ni endpoint escribe `config.permissions` con keys planner en el código revisado (búsqueda `config.permissions` escritura sin hits planner).
16. **¿Qué pasaría CURRENT si una capability se renombrara?** Técnicamente: (a) la key vieja en overrides seguiría almacenada pero caería a `else false`/`===true→false` ⇒ denegación silenciosa para los roles que dependían del override; (b) la key nueva usaría defaults de matriz/CASE ⇒ cambio de comportamiento para todos los roles cuyos defaults difieran; (c) todo `assertCapability`/`CASE` con el literal viejo denegaría (backend 403 `planner_forbidden`; SQL `42501`); (d) no hay migración ni validador que lo detecte (Q12–Q14). Descripción técnica, sin recomendación.

### Real override usage — `RUNTIME READ-ONLY VERIFIED`

- Households: **97**; con `config.permissions`: **10**.
- Claves hermanas top-level en `config`: sólo `permissions`, `setup_version`.
- Capability keys reales en overrides (6, todas household-membership, cero planner): `approve_members`, `assign_coordinator`, `edit_config`, `invite_members`, `manage_roles`, `remove_members` (10 households cada una).
- Roles reales en overrides: los 6 (`adolescent, adult, child, coordinator, guest, senior`).
- `goal.*` overrides reales: **0**. `planner.*` / `task.*` / `event.*`: **0**. Keys desconocidas al mapa CURRENT: **0**.
- STATIC EVIDENCE: forma y lectura (§7 Q1–Q16). RUNTIME: agregados anteriores, sin imprimir configuración privada (sólo conteos y keys).

---

## 9. Capability consumer graph

Notación por consumidor: `DIRECT CHECK` (assert literal) · `INDIRECT THROUGH planner_plan_can_mutate` · `RLS CHECK` · `RPC INTERNAL CHECK` · `FRONTEND-ONLY CHECK` · `DEAD/NO CONSUMER`.

**`goal.create_household`** → `planner.goals.controller.js:55-56` DIRECT (`POST /goals`) → `planner.goals.service.js:377-406` (insert `planner_goals`) → RLS `planner_goals_insert_active_household` (sin capability) → `GoalForm.tsx:475` (STATIC, navega a `GoalDetail`).
→ `planner.plans.v1.controller.js:56-57` DIRECT → `planner.plans.v1.service.js:248-253` DIRECT (doble) → insert `planner_goals` → RLS idem.
→ `planner.plans.controller.js:56` DIRECT → `write_planner_plan_graph_rpc` RPC INTERNAL (`:838-842`) → `planner_plans` → `PlannerSheetHost.tsx:391,465` (STATIC, inalcanzable por `implemented:false`).

**`goal.create_personal`** → mismos 3 DIRECT JS (rama personal) → **sin** RPC INTERNAL (writer personal no la pide) → RLS goals INSERT (sin capability). FRONTEND: igual que household.

**`goal.edit_own`** → `planner.goals.controller.js:86` DIRECT (PATCH goal) → update `planner_goals` → RLS `planner_goals_update_visible` (sin capability).
→ `:317, :347` DIRECT (milestones) → `planner_goal_milestones` → RLS `can_update_planner_goal` (sin capability).
→ `planner.plans.v1.controller.js:87,118` DIRECT → `planner.plans.v1.service.js:340,405,408,423` DIRECT → update `planner_goals`.
→ `planner.plans.controller.js:40,47,73-75` INDIRECT (mapping own) → `writePlanGraph`/`applyPlanStructureChangeset` → `write_planner_plan_graph_rpc` / `apply_planner_plan_structure_changeset_rpc` RPC INTERNAL (`can_mutate 'edit'`) → `planner_plans` + tablas `planner_plan_*` → canónico AUTH-DRIVEN (`availableActions`→`update`, `PlannerPlansSurfaces.tsx:147-199`).

**`goal.edit_any`** → INDIRECT (mapping own/any) → mismos RPC/RLS que `edit_own`. Sin assert literal, sin UI que lo distinga.

**`goal.complete_own`** → `planner.goals.controller.js:179` DIRECT → `completeGoal` → `planner_goals` → `GoalDetailScreen.tsx` (HARDCODED buttons). → `planner.plans.controller.js:45` mapping → writer `transition complete` → RPC INTERNAL (`can_mutate` + gate `confirm_unresolved` `:1019-1027`) → `PlannerPlanDetailScreen.tsx` AUTH-DRIVEN. → V1 `transitionPlan` (`:411`) → update `planner_goals` → V1 HARDCODED buttons.

**`goal.complete_any`** → sólo mapping (V1 `isOwner`, canónico `created_by_member_id`). INDIRECT.

**`goal.close_own`** → `planner.goals.controller.js:210,242,274` DIRECT (close/fail/reopen) → `planner_goals`. → `planner.plans.controller.js:46` mapping → writer `close/reopen` (reopen borra `archived_at` `:1033-1035`) → `planner_plans`. → V1 `:414,417` → `planner_goals` (`cancelled`/`reopen`).

**`goal.close_any`** → sólo mapping. INDIRECT.

**`goal.manage_participants`** → **DEAD/NO CONSUMER** (catálogo+matriz únicamente).

**`goal.archive`** → `planner.plans.controller.js:43` mapping → writer `archive/unarchive` → RPC INTERNAL (`can_mutate`→`goal.archive`→`false` siempre) + CHECK terminal + ramas `:1036-1041`. → `planner.plans.v1.controller.js:211` DIRECT (`unarchivePlan`) → `planner.plans.v1.service.js:648` DIRECT → `planner_goals.archived_at=null`. → FRONTEND-ONLY: V1 labels (`getTransitionLabel` `:619-620`) sin botón (ramas `:466-494` sólo Reabrir); canónico AUTH-DRIVEN (`structuralActions` `:145-147`). Resultado CURRENT: 403/denegación en todos los caminos sin override.

**`goal.restore`** → `planner.goals.controller.js:117,148,378,409,440` DIRECT → `trashGoal` (UPDATE directo) / `restoreGoal`→`restore_goal_rpc` (`:738`) RPC INTERNAL (capability + anti-spoofing) → `planner_goals`. → `planner.plans.controller.js:39,44` mapping → writer `trash/restore` (canónico) → `planner_plans`. → V1 `:149,180` DIRECT → `trashPlan` (UPDATE) / `restorePlan`→`restore_goal_rpc` (`:569`). → Trash UI STATIC (`PlannerTrashScreen.tsx:112-161`, sin gate; backend aplica).

**`planner.view`** (no-`goal`, grafo de lectura) → DIRECT en `goals.controller :29,41,305`, `plans.v1.controller :29,41`, `plans.controller getHouseholdCapabilityContext :31` (puerta de todo write household), `activity :99`, `attention :20`, `drafts :46,57,68,79,113,125`, `events :29,41`, `search :36`, `summary :52`, `schedules :8`, `responsibilities :14`, `tasks :33,46,…` → RLS SELECT policies (RLS CHECK) + `can_read` (RPC INTERNAL). FRONTEND-ONLY: `PlannerScreen.tsx:183-184,567` (`canViewPlanner` gate del shell), `QuickActionsMenu` (search icon `:68-69`).

---

## 10. Plan action → authorization trace

Columnas: entrypoint · controller · service · capability check (JS) · SQL auth check · RPC · RLS · tabla · identidad · override · resultado CURRENT. Ambos sistemas por separado donde existen.

| Acción | Sistema | Entrypoint | Controller | Service cap check | SQL auth | RPC | RLS | Tabla | Identidad | Override | Resultado |
|---|---|---|---|---|---|---|---|---|---|---|---|
| READ PLAN | goals | `GET /goals/:id` | `planner.view` (`goals.controller:41`) | — (sólo view) | `can_select_planner_goal` | ninguno | `planner_goals_select_visible` | `planner_goals` | `person.active_household_id` (contexto) | n/a lectura | **Autorizable** (con asimetría trash §12) |
| READ PLAN | plans | `GET /plans/:id` | **sin assert** (`plans.controller:93-101`) | — | `planner_plan_can_read(id,false)` (dentro del RPC) | `read_planner_plan_graph_rpc` (SECURITY DEFINER v2) | `planner_plans_select` | `planner_plans` | `current_person_id()` derivado | no aplica | **Autorizable** (sólo SQL; backend no verifica) |
| CREATE PERSONAL | goals | `POST /goals` `visibility=personal` | `goal.create_personal` (`:55-56`) | — (controller) | **ninguno** (policy INSERT sin capability) | ninguno | INSERT policy | `planner_goals` | `membershipId` servidor (`created_by_member_id`) | posible | **Autorizable** (JS T×5; SQL no la pide) |
| CREATE PERSONAL | plans | `POST /plans` `scope=personal` | **ninguno** (`:52` retorna) | — | **ninguno** (writer sólo valida scope/objective) | `write_planner_plan_graph_rpc` | sin INSERT directo (sólo SELECT grant) | `planner_plans` | `current_person_id()` | no aplica | **Autorizable** (sin capability en ninguna capa) |
| CREATE HOUSEHOLD | goals | `POST /goals` | `goal.create_household` | — | ninguno (policy sin capability) | ninguno | INSERT policy | `planner_goals` | contexto household | posible | **Autorizable** (JS; SQL no la pide) |
| CREATE HOUSEHOLD | plans | `POST /plans` + `POST /plans/:id/mutations?action=create` | `goal.create_household` (`:56`) | — | `planner.view` + `goal.create_household` (`:838-842`) | `write_planner_plan_graph_rpc` | n/a (RPC) | `planner_plans` | `current_household_member_id` derivado | posible | **Autorizable**, pero **sin camino UI** (`implemented:false`) |
| EDIT PLAN | goals | `PATCH /goals/:id` | `goal.edit_own` (siempre own, `:86`) | `goal.edit_own` (`v1.service:340` análogo) | ninguno (policy sin capability) | ninguno | UPDATE policy | `planner_goals` | contexto | posible | **Autorizable** (sin distinción any) |
| EDIT PLAN | plans | `POST /plans/:id/structure` + mutations update | `capabilityForWrite` own?edit_own:edit_any (`:73-75`) | — | `can_mutate 'edit'` (`20260722090002:258`, `:849-854`) | `apply_…_changeset_rpc` / `write_…_graph_rpc` | SELECT-only | `planner_plans`+`planner_plan_*` | `owner_person_id` vs `current_person_id` (personal); member derivado (household) | posible | **Autorizable** |
| START/ACTIVATE | goals/V1 | `POST /v1/plans/:id/transition` `active` | `goal.edit_own` grueso (`:118`) | `goal.edit_own` (`:405`) + `PLAN_LIFECYCLE_TRANSITIONS` (`:29-35,101-109`) | ninguno | ninguno (UPDATE directo) | UPDATE policy | `planner_goals` | `isOwner` irrelevante (edit_own fijo) | posible | **Autorizable** (`preparation→active`) |
| START/ACTIVATE | plans | `POST /plans/:id/mutations` transition `activate` | mapping→edit_own/any | — | `can_mutate` + gate estructura (`:1001-1010`: exige ≥1 componente útil, rechaza external necessary sin bindear) | `write_…_graph_rpc` | SELECT-only | `planner_plans` | derivada | posible | **Condicional** (gate de estructura) |
| PAUSE | V1 | transition `paused` | `goal.edit_own` | `goal.edit_own` (`:408`) + mapa `active→paused` | ninguno | ninguno | UPDATE policy | `planner_goals` | — | posible | **Autorizable** |
| PAUSE | plans | transition `pause` | mapping edit | — | `can_mutate` + `active→paused` (`:1013-1015`) | writer | SELECT-only | `planner_plans` | derivada | posible | **Autorizable** |
| RESUME | V1 | transition `resume` | `goal.edit_own` | `goal.edit_own` (`:404-405`) pero `validateLifecycleTransition` **409** (`paused→[active,completed,cancelled]`, sin `resume`, `:29-35,101-109`) | — | — | — | — | — | — | **UNREACHABLE** (`STATIC CONFIRMED`: case existe, transición imposible) |
| RESUME | plans | transition `resume` | mapping edit | — | `can_mutate` + `paused→active` (`:1016-1018`) | writer | SELECT-only | `planner_plans` | derivada | posible | **Autorizable** |
| COMPLETE | goals | `POST /goals/:id/complete` | `goal.complete_own` (`:179`) | — | ninguno | ninguno | UPDATE policy | `planner_goals` | — | posible | **Autorizable** (a ciegas: sin gate de pendientes) |
| COMPLETE | V1 | transition `completed` | `goal.edit_own` + `isOwner?complete_own:complete_any` (`:411`) | mapa `:33` | ninguno | ninguno (UPDATE) | UPDATE policy | `planner_goals` | `created_by_member_id==membershipId` | posible | **Autorizable** |
| COMPLETE | plans | transition `complete` | mapping complete_own/any (`:45`) | — | `can_mutate` + gate `confirm_unresolved` si necessary insatisfechos (`:1019-1027`) | writer | SELECT-only | `planner_plans` | `created_by_member_id` vs actor member | posible | **Condicional** |
| CANCEL (=close) | goals | `POST /goals/:id/close|fail` | `goal.close_own` (`:210,:242`) | — | ninguno | ninguno | UPDATE policy | `planner_goals` | — | posible | **Autorizable** |
| CANCEL | V1 | transition `cancelled` | `isOwner?close_own:close_any` (`:414`) | mapa | ninguno | ninguno (UPDATE) | UPDATE policy | `planner_goals` | isOwner | posible | **Autorizable** |
| CANCEL | plans | transition `close` | mapping close_own/any (`:46`) | — | `can_mutate` + `active/paused→closed` (`:1030-1032`) | writer | SELECT-only | `planner_plans` | idem | posible | **Autorizable** |
| REOPEN | goals | `POST /goals/:id/reopen` | `goal.close_own` (`:274`) | — | ninguno | ninguno | UPDATE policy | `planner_goals` | — | posible | **Autorizable** |
| REOPEN | V1 | transition `reopen` | `isOwner?close_own:close_any` (`:417`) | mapa `:34` | ninguno | ninguno (UPDATE→`active`) | UPDATE policy | `planner_goals` | isOwner | posible | **Autorizable** |
| REOPEN | plans | transition `reopen` | mapping close_own/any | — | `can_mutate` + `completed/closed→active` **borrando `archived_at`** (`:1033-1035`) | writer | SELECT-only | `planner_plans` | idem | posible | **Autorizable** (con side-effect archive) |
| ARCHIVE | goals/V1 | transition `archive` (V1) | V1: `goal.archive` (`:420,425`) | mapa `:33-34` permite `archive` | ninguno (columna `planner_goals.archived_at` sin CHECK) | ninguno (UPDATE; con restricción completed/cancelled `:459-463`) | UPDATE policy | `planner_goals` | — | posible (única vía) | **UNREACHABLE sin override** (JS F×6) |
| ARCHIVE | plans | transition `archive` | mapping `goal.archive` (`:43`) | — | `can_mutate→goal.archive→false` + CHECK `archive_terminal_only` + ramas `:996,1036-1038` | writer | SELECT-only | `planner_plans` | derivada | posible (única vía) | **UNREACHABLE sin override** |
| UNARCHIVE | V1 | `POST /v1/plans/:id/unarchive` | `goal.archive` (`:211`) | `goal.archive` (`:648`) | ninguno | ninguno | UPDATE policy | `planner_goals` | — | posible | **UNREACHABLE sin override**; endpoint existe, UI sin llamadores |
| UNARCHIVE | plans | transition `unarchive` | mapping `goal.archive` | — | `can_mutate→false` + ramas `:998-999,1039-1041` | writer | SELECT-only | `planner_plans` | derivada | posible | **UNREACHABLE sin override** |
| TRASH | goals | `DELETE /goals/:id`, `POST /goals/:id/trash` | `goal.restore` (`:117`) | — | `trashGoal`: UPDATE directo (sin RPC); `restoreGoal`: `restore_goal_rpc` | mixto | UPDATE policy / RPC definer | `planner_goals` | `membershipId` servidor | posible | **Autorizable** |
| TRASH | V1 | `POST /v1/plans/:id/trash` | `goal.restore` (`:149`) | `goal.restore` (`:526`) | ninguno | ninguno (UPDATE `:531-535` vía inventario) | UPDATE policy | `planner_goals` | contexto | posible | **Autorizable** |
| TRASH | plans | transition `trash` | mapping `goal.restore` (`:39,44`) | — | `can_mutate trash` + ramas `:984-989,1042-1046` | writer | SELECT-only | `planner_plans` | derivada | posible | **Autorizable** (pero invisible en papelera UI: `planner_plans` ausente de `planner.trash.service.js` — citado de Discovery, no re-leído aquí → `INFERRED`) |
| RESTORE | goals | `POST /goals/:id/restore` | `goal.restore` (`:148`) | — | `goal.restore` + personal-owner + anti-spoofing (`20260722010000:1770-1777`) | `restore_goal_rpc` | definer | `planner_goals` | derivado interno | posible | **Autorizable** |
| RESTORE | V1 | `POST /v1/plans/:id/restore` | `goal.restore` (`:180`) | — | idem | `restore_goal_rpc` (`v1.service:569`) | definer | `planner_goals` | derivado | posible | **Autorizable** |
| RESTORE | plans | transition `restore` | mapping `goal.restore` | — | `can_mutate restore` + ramas `:988-989,1047-1051` | writer | SELECT-only | `planner_plans` | derivada | posible | **Autorizable** |
| LINK TASK | V1/goals | vincular existente / crear con `goal_id` | **tasks controller** (`task.edit_own/any`), **sin capability de Plan** | `mutate_planner_task_v0` ordinary-edit guard | **ninguna de Plan** | tasks RPC | tasks RLS | `planner_tasks.goal_id` | member derivado | n/a | **Autorizable** (autoridad Tasks, no Plans) |
| LINK TASK | plans | — | **NOT IMPLEMENTED** (sin endpoint link; índice único por-Plan permite multi-homing; citado Discovery §4.6) | — | `planner_plan_validate_external_link` existe pero el writer canónico fuerza `external_entity_id=NULL` | — | — | `planner_plan_requirements` (0 filas runtime) | — | — | **NOT IMPLEMENTED** como superficie |
| UNLINK TASK | V1/goals | desvincular | tasks PATCH `goal_id=null` (`tasks.service:787-795`) | ordinary edit | RPC `goal_id = NULL` (`20260722020000:1123`) | tasks RPC | tasks RLS | `planner_tasks` | — | n/a | **Autorizable** (fila Task persiste) |
| UNLINK TASK | plans | — | **NOT IMPLEMENTED** | — | — | — | — | — | — | — | **NOT IMPLEMENTED** |
| LINK/UNLINK EVENT | ambos | — | **NOT IMPLEMENTED** (sin writer UI; `plan_id/goal_id` en `planner_events`: NOT FOUND en 112 migraciones) | — | validador existe (`20260722090002:172-183`) con defectos citados en Discovery §5.3 (no re-verificados línea a línea aquí) | — | — | — | — | — | **NOT IMPLEMENTED** |
| CREATE MEASUREMENT | plans | mutations `entityType=measurement action=create` / changeset `entityType:'measurement'` | `capabilityForWrite`→edit_own/any (`:38-40`, entityType≠plan) | `assertStructureChangesetInput` (sin capability; el auth va por `assertBackendWriteAuthorization` con `action='update'`) | `can_mutate 'edit'` | writer / `apply_…_changeset_rpc` (`:371-417`) | SELECT-only | `planner_plan_measurements` + history | derivada | posible | **Autorizable** (sin superficie UI: `PlannerPlanStructureEditScreen.tsx:17-28` sólo milestones → `INFERRED` desde imports) |
| EDIT MEASUREMENT | plans | mutations update/set | idem | — | `can_mutate 'edit'` | writer | SELECT-only | idem | derivada | posible | **Autorizable** (misma ausencia UI) |
| RECORD MEASUREMENT VALUE | plans | mutations `record` | idem (`:38-40` trash/restore→restore; `record`→edit) | — | `can_mutate 'edit'` + historial (`:476-480`) | writer | SELECT-only | measurements + `measurement_history` | derivada | posible | **Autorizable** (misma ausencia UI) |
| CREATE/EDIT/RECORD MEASUREMENT | goals/V1 | — | **NOT IMPLEMENTED** (goals usan milestones + `current/target_value`; sin measurements) | — | — | — | — | — | — | — | **NOT IMPLEMENTED** |

`NOT IMPLEMENTED` = sin endpoint/superficie CURRENT. `UNREACHABLE` = existe pero ningún actor puede autorizarse sin override.

---

## 11. Identity model

Cadena CURRENT (`STATIC CONFIRMED`):

```
auth account (req.user.id + accessToken)
→ person (people.auth_user_id = account)            [planner.context.service.js:11-16]
→ household (people.active_household_id)            [:25-27]
→ member (household_members WHERE household_id + person_id + status='active') [:29-35]
→ role (membership.role: 6 valores §4)              [:68]
→ capability (resolveCapabilities({role, membershipStatus, household})) [plannerCapabilities.js:364]
```

SQL espejo: `effective_uid()` (`202606210009:560-573`) → `current_person_id()` (`:575-586`) → `current_household_member_id(h)` (`202607080004:162-175`) → `hm.role + h.config` en cada `*_actor_has_capability`.

Uso por path capability-sensitive:

| Path | `account_id` | `person_id` | `member_id` | `household_id` | actor cliente vs derivado |
|---|---|---|---|---|---|
| Todo backend planner (contexto) | `req.user.id` exigido | derivado (`people`) | derivado (`household_members`) | `person.active_household_id` o validado (`getHouseholdScopeContext :135-149`) | derivado; cliente **no** aporta actor |
| `planner.plans.controller` (`getPlanActorContext`, `getHouseholdCapabilityContext`) | exigido | derivado | derivado (`requireActiveMembership`) | del input (`household_id`/`planId→RPC ctx`) + `households` select | derivado |
| `write/apply` RPCs canónicos | `auth.uid()` exigido (`:806`) | `current_person_id()` | `current_household_member_id` | del plan/payload | **derivado**; sin params de actor |
| `restore_goal_rpc` endurecido | `auth.uid()` exigido | `current_person_id()` | derivado + `p_member_id` **rechazado si difiere** (`:1775-1777`) | del goal | derivado; `p_member_id` compat, no confiado |
| `trash_goal_rpc` / `trash/restore_milestone_rpc` legacy | **no exigido** | no usado | **`p_member_id` del llamante**; si NULL → `current_household_member_id(NULL)` (= NULL siempre) y filtro `household_id IN (SELECT … WHERE id = v_member_id)` | del goal vía `v_member_id` | **cliente-aportado y no validado contra el llamante** (`20260713003000:139-152,192-204`) |
| `POST /v1/events/:id/participants/mutations` | servidor (`p_actor_account_id`) | `p_actor_person_id` servidor + `p_person_id/p_member_id` **cliente por diseño** (invitar a otro) | idem | servidor | mixto intencional (`planner.events.v1.controller.js:175-196`, vía inventario) |
| `GET /schedules?person_id=` | — | query cliente | — | — | validado (`assertHouseholdMember` + `canViewSchedule`, vía inventario) |
| Tasks filtros/assign | — | — | `assigned_to_member_id` body/query | — | normalizado + UUID check; pertenencia en RLS `WITH CHECK` (`20260722010000:320-328`) |

Marcas: el único punto donde el cliente aporta el **actor autorizante** sin validación es `trash_goal_rpc` (+ milestones legacy). `restore_goal_rpc` lo endurece. El resto deriva el actor del token.

---

## 12. RLS / RPC / grant map

### 12.1 Policies por tabla (`STATIC CONFIRMED` en definición; vigencia `RUNTIME READ-ONLY VERIFIED` vía `pg_policies`)

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `planner_goals` | `planner_goals_select_visible`: `deleted_at IS NULL AND is_active AND (visibility='household' OR creator)` — **sin `trashed_at`** (`RUNTIME VERIFIED` qual) | `planner_goals_insert_active_household`: miembro activo + `created_by_member_id = current_…` (**sin capability**) | `planner_goals_update_visible`: `USING can_update_planner_goal(id)` + `WITH CHECK` membresía/visibilidad (**sin capability**) | sin policy (borrado vía UPDATE/RPC) |
| `planner_goal_milestones` | `…_select_goal_visible`: `deleted_at IS NULL AND can_select_planner_goal(goal_id)` | `WITH CHECK can_update_planner_goal(goal_id)` | `USING deleted AND can_update` + `WITH CHECK can_update` (endurecida `trashed_at` en `20260713003000:109-126`) | sin policy |
| `planner_plans` | `planner_plans_select`: `planner_plan_can_read(id,false)` | — (sin policy; `authenticated` sólo SELECT grant) | — | — |
| `planner_plan_milestones` | `…_select`: `trashed_at IS NULL AND can_read(plan_id,false)` | — | — | — |
| `planner_plan_measurements` | idem milestones (`RUNTIME VERIFIED` qual) | — | — | — |
| `planner_plan_measurement_history` | `…_select`: `can_read(plan_id,false)` **sin filtro `trashed_at`** (`RUNTIME VERIFIED` qual; gap residual: historial de measurement trasteada legible con plan vivo) | — | — | — |
| `planner_plan_requirements` / `manual_conditions` | `trashed_at IS NULL AND can_read` | — | — | — |
| `planner_plan_operations` | `actor_person_id = current_person_id()` | — | — | — |
| `planner_plan_legacy_goal_links` | `can_read(plan_id,true)` (incluye papelera) | — | — | — |
| `planner_tasks` | `planner_tasks_select_capability`: miembro activo + `planner_current_actor_has_capability('planner.view')` | `…_insert_capability`: + `task.create_household` + creador = actor + `status='pending'` + asignado válido | `…_update_capability` (misma base) | **sin policy DELETE** |
| `planner_events` | `planner_events_select_v1_scope`: personal⇒dueño; household⇒`planner_event_actor_has_capability('planner.view')` | sin policy (**sólo RPC**; `REVOKE insert,update,delete FROM authenticated`, `20260722030000:880-885`) | sin policy | sin policy |

`ENABLE RLS`: goals/milestones (`202607080004:221-222`), tasks/events (`202606230001:177-178`), plan-tablas (`20260722040000:630-637`), series/participants (`20260722030000:790-791`).

### 12.2 Grants (`RUNTIME READ-ONLY VERIFIED` vía `proacl` + `has_function_privilege`)

Tablas: `planner_plans`/`planner_plan_measurements`: `authenticated=SELECT`, `anon=(sin grants)`, `service_role=ALL` (verificado). `planner_goals`/`planner_tasks`: `anon=ALL` + `authenticated=ALL` (RLS como única defensa). `planner_events`: `anon=ALL`, `authenticated=REFERENCES,SELECT,TRIGGER,TRUNCATE` (sin INSERT/UPDATE/DELETE), `service_role=ALL`.

Funciones (`prosecdef=true` = SECURITY DEFINER todas salvo `read_…_v1` original invoker, hoy DEFINER v2):
- `anon EXECUTE = true` (`RUNTIME VERIFIED`): **`trash_goal_rpc`, `trash_milestone_rpc`, `soft_delete_goal_milestone_rpc`, `write_planner_plan_graph_rpc`** (ACL con `PUBLIC`+`anon`).
- `anon EXECUTE = false`: `restore_goal_rpc`, `restore_milestone_rpc`, `read_planner_plan_graph_rpc`, `apply_planner_plan_structure_changeset_rpc`, `mutate_planner_task_v0`, `create_planner_event_v1`, `planner_plan_actor_has_capability`, `planner_plan_can_read/mutate`, `planner_plan_authorization_context_rpc` (revoke public/anon + grant authenticated/service_role).
- Vista `planner_legacy_goal_plan_projection` (`security_invoker=true`, `20260722040000:1550`): grants **totales a `anon`, `authenticated`, `postgres`, `service_role`** (`RUNTIME VERIFIED`), pero `information_schema.views.is_updatable = NO` → escribibilidad `INCONCLUSIVE` (ver §16).

Dependencia de autorización por tabla: `planner_goals` = RLS (+ backend guard en API; RPC guard sólo en `restore_*` endurecidos); `planner_plans` y `planner_plan_*` = RLS SELECT + capability (`can_read`) + RPC guard (`can_mutate`) + backend guard (doble en create V1); `planner_tasks` = RLS + capability; `planner_events` = 1 policy SELECT + RPC guards.

---

## 13. Current Plan capability surfaces (frontend real)

`Figma-app` no es authority runtime (ningún código real consume Figma; no se usa como evidencia).

| Superficie | Control por capability | Clasificación |
|---|---|---|
| Shell planner (`PlannerScreen.tsx:183-184,567,585-586` + `plannerShellState.ts:97,117,222,247`): `canViewPlanner(planner.view)` ⇒ Forbidden | `planner.view` vía `GET /api/planner/capabilities` | AUTH-DRIVEN |
| Search icon (`:620-631,703-716`, `resolvePlannerSearchAccess`) | `planner.search` + flags | AUTH-DRIVEN |
| Quick actions (`QuickActionsMenu.tsx:68-101,184` + `plannerQuickActions.ts:49-62,88-128`): filtra por `requiredCapabilityGuard`; `create_goal implemented:false` | `task/event/goal.create_*` | AUTH-DRIVEN (con `create_goal` DEAD en UI) |
| Detalle canónico (`PlannerPlanDetailScreen.tsx:65-151,178-196` → `PlannerPlansSurfaces.tsx:147-199` render de `availableActions` + `edit_structure` inyectado `:1071-1082`) | `availableActions` del DTO (= `structuralActions` backend) | AUTH-DRIVEN (+ inyección HARDCODED de `edit_structure`) |
| Labels/validación (`plannerPlans.ts:1084-1104,612,1124-1130`, `isPlannerPlan :772-780`) | proyección local | HARDCODED |
| Detalle V1 (`PlannerPlanDetailScreenV1.tsx:240-250` transiciones, `:441-494` botones, `:597-603` papelera incondicional, `:611-623` labels) | lifecycle local, **0 lecturas de capabilities** | HARDCODED/STATIC VISIBLE (archive listado pero inrenderizable; trash siempre visible) |
| Lista (`PlannerPlanListScreen.tsx:92-159`: filtro `!trashedAt&&!archivedAt`, vistas open/completed/cancelled, Crear siempre) | ninguno | STATIC VISIBLE |
| Crear (`PlannerSheetHost.tsx:391-520` `PlanFormHost`, `PlannerPlansSurfaces.tsx:83-145,252-327`) | ninguno | STATIC VISIBLE |
| Papelera (`PlannerTrashScreen.tsx:112-161,217-235`: `handleRestore task/event/goal/milestone`, botón Restaurar por estado local) | ninguno | STATIC VISIBLE (TOAST/estado local; sin gate) |
| `GoalDetailScreen.tsx:149-261,677-777` + `PlannerGoalsScreen.tsx:239-261` (complete/close/reopen/trash por `goal.status`) | ninguno | HARDCODED/STATIC |
| `TRANSITION_CAPABILITY_MAP` + `getTransitionCapability` (`PlannerPlanV1.ts:88-118`) | ninguno (0 callers) | DEAD |
| `plannerCapabilitiesAdapter` `canComplete*/canCancel*/canRestore*` (`:164-224`, sólo `canViewPlanner` usado en screens) | ninguno vivo | DEAD |
| `planStructureContract` readiness/canComplete (`:354-431`), `PlannerPlan.ts:191` | ninguno (0 consumidores UI) | DEAD |
| Tasks/Events surfaces (`plannerEventsFrontend.ts:103-108,270-275,681`, `PlannerEventsV1Surfaces.tsx:486-498`, `TaskDetailScreen.tsx:613`, `PlannerTasksScreen.tsx:289,470`) | `availableActions` propios | AUTH-DRIVEN (referencia, no Plans) |
| `structuralActions` término en frontend | — | NOT FOUND (0 hits) |

---

## 14. `goal.manage_participants` and dead capabilities

| Capability | Estado | Evidencia |
|---|---|---|
| `goal.manage_participants` | **DEAD** | Sólo catálogo+matriz JS (`:61,124,164,204,244,284,324`); 0 asserts, 0 SQL, 0 UI. No decidir eliminación (regla). |
| `goal.archive` | **UNREACHABLE** (no DEAD: cableado completo, denegado) | §5.3/§15 |
| `task.archive` | **UNREACHABLE** | `false` ×6 (`:107,147,187,227,267,307`); RPCs `archive/unarchive_planner_task_v1` existen (`20260914000002:168,272`) y exigen `task.archive` (`:196,300`) ⇒ siempre `planner_forbidden` sin override |
| `TRANSITION_CAPABILITY_MAP` / `getTransitionCapability` | **DEAD** | `PlannerPlanV1.ts:88-118`, 0 callers |
| `canComplete*/canCancel*/canRestore*Goal` (adapter) | **DEAD** | `plannerCapabilitiesAdapter.ts:164-224`, 0 callers en screens |
| `planStructureContract` readiness + `PlanCompletionReadiness.canComplete` | **DEAD** | 0 consumidores UI |
| `PlannerPlansScreen`, `EditGoalScreen`, `services/plannerPlansV1.ts` (duplicado) | **DEAD** | Citado Discovery §2.8-2.9 (no re-leído aquí; `INFERRED` carry-over, marcado como no re-verificado) |
| `create_goal` Quick Action | **DEAD en UI** (`LEGACY_ACTIVE` en código: `implemented:false` + filtro) | `plannerQuickActions.ts:126`, `QuickActionsMenu.tsx:98` |
| `unarchivePlanV1` | **UNREACHABLE en UI** (0 llamadores fuera de módulo; citado inventario) | `plannerPlansV1Frontend.ts:144-161` |
| Resto `goal.*` (`create_*`, `edit_*`, `complete_*`, `close_*`, `restore`) | **ACTIVE** | Consumidores §9 |

`goal.manage_participants` se investigó hasta el final: sin consumidor directo, indirecto, RLS, RPC ni frontend. Se clasifica sin proponer eliminación.

---

## 15. Archive special case (`goal.archive`)

- **Defaults JS (6 roles):** `false` ×6 (`:125,165,205,245,285,325`). `STATIC CONFIRMED`.
- **Defaults SQL (6 roles):** `when 'goal.archive' then false` (`20260722040000:355`); `create_personal`/`manage_participants` ausentes por completo. `STATIC CONFIRMED`.
- **Household override:** misma vía que §7 (boolean por `(capability, role)`); es la única vía CURRENT de habilitación. Sin overrides reales (`RUNTIME READ-ONLY VERIFIED`: 0 `goal.*`).
- **Callers:** `capabilityForWrite` (`:43`), `unarchivePlan` controller (`:211`), `transitionPlan`/`unarchivePlan` service (`:420,648`), `can_mutate` (`:411`), ramas writer (`20260722040000:996-999,1036-1041` + `20260722049000:244-288`). `STATIC CONFIRMED`.
- **`planner_goals` path:** `transitionPlan` exige `goal.archive` + `archived_at=now()` sólo si `lifecycle ∈ (completed, cancelled)` (`:458-463`); columna `archived_at` existe (`20260908000001:47-58`), **sin CHECK** que la restrinja. Resultado sin override: 403.
- **`planner_plans` path:** `can_mutate(archive/unarchive)→goal.archive→false` ⇒ 403/42501; además CHECK `planner_plans_archive_terminal_only` (`archived_at NULL o lifecycle ∈ (completed,closed)`, verificado runtime) + noop-branches (`:996-999`) + updates (`:1036-1041`). `archive` sólo terminales; `unarchive` sólo terminales con `archived_at` seteado.
- **Lifecycle restrictions:** archive/unarchive ∉ lifecycles iniciales; sólo desde `completed/closed`; `reopen` resetea `archived_at=null` (`:1033-1035`) ⇒ reopen desarchiva como side-effect. `STATIC CONFIRMED`.
- **Frontend availability:** V1: listado en `availableTransitions` pero ramas completed/cancelled sólo-Reabrir ⇒ inrenderizable (`:240-250` vs `:466-494`). Canónico: expuesto vía `availableActions` según `archived_at` (`:145-147`) ⇒ visible pero denegado al actuar. `STATIC CONFIRMED`.
- **Por qué CURRENT aparece inalcanzable:** doble cerrojo — (1) autorización: `false` en ambas autoridades para los 6 roles y 0 overrides; (2) UI V1: sin botón. Ninguna de las dos depende de la otra.
- **STATIC CONFIRMED:** matrices, mapping, ramas writer, CHECK (definición), UI V1 (ramas), `structuralActions`, `TRANSITION_CAPABILITY_MAP`, `getTransitionLabel` labels.
- **RUNTIME READ-ONLY VERIFIED:** CHECK vigente (`pg_constraint`), 0 overrides `goal.*`, 0 filas `planner_plans` (archive sin objeto), 1 goal no-archivado (`archived_at NULL`), grants/anon (no afecta archive).
- **RUNTIME INCONCLUSIVE:** intento real de `archive` como cada rol con JWT (exigiría escritura; bloqueado por regla READ-ONLY); la sonda `planner_plan_actor_has_capability(…, 'goal.archive')` como `postgres` devuelve `false` pero también para `planner.view` ⇒ no discrimina matriz vs falta de contexto (carry-over Discovery §Phase 12, no repetida aquí).

---

## 16. Security findings relevant to capability map

Sólo findings que afectan authorization. Sin explotación intentada; sin escrituras. Formato: `CONFIGURATION CONFIRMED` / `EXPLOIT RUNTIME VERIFIED` / `NOT EXPLOITED` / `INCONCLUSIVE`.

| Finding | Estado | Evidencia |
|---|---|---|
| `trash_goal_rpc`: `SECURITY DEFINER`, ejecutable por `anon` (`has_function_privilege true`), **sin check de capability**, `p_member_id` del llamante sin validar contra el actor (`20260713003000:129-177`); backend nunca lo llama (trash por UPDATE directo) | CONFIGURATION CONFIRMED · EXPLOIT **INCONCLUSIVE** (no intentado por regla READ-ONLY) | `RUNTIME READ-ONLY VERIFIED` (ACL + priv), `STATIC CONFIRMED` (cuerpo sin guard) |
| `write_planner_plan_graph_rpc`: ejecutable por `anon` a nivel grant, pero exige `auth.uid() NOT NULL` + persona (`20260722040000:806-808`) ⇒ falla cerrado | CONFIGURATION CONFIRMED (grant) · NOT EXPLOITED (guard estático; sin intento runtime) | `RUNTIME READ-ONLY VERIFIED` (ACL), `STATIC CONFIRMED` (guard) |
| `trash_milestone_rpc` / `soft_delete_goal_milestone_rpc`: `anon EXECUTE true` (`RUNTIME VERIFIED`); `trash_milestone` sí exige `can_update_planner_goal` (`:252-254`) pero con `p_member_id` no validado; `soft_delete` exige `can_update` (`:42-43`) | CONFIGURATION CONFIRMED · exploit INCONCLUSIVE | ACL runtime + cuerpos estáticos |
| `restore_goal_rpc` / `restore_milestone_rpc` (endurecidos M11.1A): `anon EXECUTE false`, `auth.uid()` + `goal.restore` + owner-personal + anti-spoofing (`20260722010000:1758-1777,1812-1834`) | CONFIGURATION CONFIRMED (cerrado) · NOT EXPLOITED | `RUNTIME READ-ONLY VERIFIED` (ACL), `STATIC CONFIRMED` |
| `planner_legacy_goal_plan_projection`: grants totales a `anon`/`authenticated` (`RUNTIME VERIFIED`) pero `is_updatable=NO` / `is_insertable_into=NO` | CONFIGURATION CONFIRMED (grants) · escribibilidad INCONCLUSIVE (señales en conflicto) | `RUNTIME READ-ONLY VERIFIED` (ambas sondas) |
| Client-supplied `member_id` (`trash_goal_rpc`, milestones legacy) | CONFIGURATION CONFIRMED (spoofable en texto) · exploit INCONCLUSIVE | `STATIC CONFIRMED` |
| `restore_goal_rpc` `p_member_id` | CONFIGURATION CONFIRMED (rechazado si ≠ actor) | `STATIC CONFIRMED` |
| RLS bypass vía `service_role` | El backend usa cliente del actor (`createSupabaseForToken`), no `service_role`, en los paths leídos; `planner.trash.service.js` con `supabaseAdmin` **no re-leído en esta sesión** → INCONCLUSIVE (carry-over Discovery §2.7, no verificado aquí) | INCONCLUSIVE |
| `planner_goals` grants totales a `anon` + SELECT policy sin `trashed_at` | CONFIGURATION CONFIRMED · efecto parcial `RUNTIME VERIFIED` (policy qual; sin prueba de lectura como `anon`) | `RUNTIME READ-ONLY VERIFIED` (grants + qual); exploit INCONCLUSIVE |
| `planner_events`: `authenticated` sin INSERT/UPDATE/DELETE (revoke) + `anon` FULL | CONFIGURATION CONFIRMED | `RUNTIME READ-ONLY VERIFIED` |
| `planner_plans` + `planner_plan_*`: `anon` sin grants; `authenticated` sólo SELECT | CONFIGURATION CONFIRMED (cerrado a escritura directa) | `RUNTIME READ-ONLY VERIFIED` |

---

## 17. `planner_goals` vs `planner_plans` — AUTH ONLY

Veredictos permitidos: `SYSTEM A HAS` (goals) · `SYSTEM B HAS` (plans) · `BOTH` · `NEITHER` · `DIVERGENT`. Sin "mejor/peor".

| Dimensión | Veredicto | Detalle CURRENT |
|---|---|---|
| ROLE MODEL | BOTH | Mismos 6 roles; goals vía `resolveCapabilities`, plans vía `resolveCapabilities` + `*_actor_has_capability` |
| READ AUTH | DIVERGENT | A: backend `planner.view` + RLS `can_select` (sin capability, con asimetría trash). B: backend **sin check** en `getPlanGraph` + RPC `can_read` (con `planner.view` + draft-creador) + RLS SELECT-only |
| CREATE AUTH | DIVERGENT | A: backend `goal.create_*` (own/personal) + RLS sin capability. B: personal sin capability en ambas capas; household `goal.create_household` en ambas |
| EDIT AUTH | DIVERGENT | A: siempre `goal.edit_own` (sin any) + RLS sin capability. B: own/any por creador + `can_mutate edit` |
| LIFECYCLE AUTH | DIVERGENT | A: `edit_own` grueso + `complete/close_own-any` fino, sin gate de contenido (complete a ciegas; `resume` 409). B: mapping + gates (`confirm_unresolved`, activación con estructura, transiciones inválidas 55000; `resume` soportado) |
| ARCHIVE AUTH | BOTH (denegado) | A: `goal.archive` F×6, sin CHECK. B: `goal.archive` false + CHECK terminal + ramas. Ambos UNREACHABLE sin override |
| TRASH AUTH | BOTH | `goal.restore` en ambos (backend + `can_mutate`/RPC) |
| RESTORE AUTH | DIVERGENT | A: `goal.restore` + RPC endurecido (capability+anti-spoofing). B: `goal.restore` vía writer (sin RPC dedicado) |
| PERSONAL AUTH | DIVERGENT | A: `visibility='personal'` + creador en RLS; capabilities personales exigidas en backend. B: `owner_person_id = current_person_id()` en `can_read/can_mutate`; create personal sin capability |
| HOUSEHOLD AUTH | BOTH | `goal.create_household` + membresía activa en ambos |
| TASK LINK AUTH | DIVERGENT | A HAS (vía Tasks `edit_own/any`, `goal_id`). B: NOT IMPLEMENTED como superficie (sólo requirements externos sin UI) |
| EVENT LINK AUTH | NEITHER | Sin superficie en ninguno (sólo validador SQL sin writer UI) |
| MEASUREMENT AUTH | SYSTEM B HAS | A: NEITHER (goals no tienen measurements). B: `edit_own/any` + `can_mutate edit` vía writer/changeset (sin UI) |
| OVERRIDE SUPPORT | BOTH | Mismo `config.permissions` en JS y en las 3 fns SQL; uso real 0 en planner |
| RLS STRENGTH | DIVERGENT | A: SELECT/INSERT/UPDATE directos a `authenticated` (+ `anon` FULL en grants). B: SELECT-only a `authenticated`, `anon` sin grants, escrituras sólo RPC definer |
| RPC GUARDS | SYSTEM B HAS | A: sólo `restore_*` endurecidos (trash legacy sin guard). B: guards en create/mutate/transition + `auth.uid()` |
| IDENTITY MODEL | DIVERGENT | A: contexto household (`membershipId` servidor; `p_member_id` legacy no validado en trash). B: persona/miembro derivados de `auth` en SQL; sin params de actor |

---

## 18. Unknowns / blocked runtime checks

1. **Matriz efectiva como usuario autenticado** (los 6 roles × 11 capabilities vía JWT real): `INCONCLUSIVE` — bloqueado por READ-ONLY (exigiría actuar o suplantar sesión). Sólo evidencia estática + sondas como `postgres` (sin contexto actor).
2. **Exploit de `trash_goal_rpc` / writes como `anon`:** `INCONCLUSIVE` — no intentado (escritura prohibida aunque falle).
3. **Escribibilidad real de `planner_legacy_goal_plan_projection` como `anon`:** `INCONCLUSIVE` (grants totales vs `is_updatable=NO`).
4. **`planner.trash.service.js` (`supabaseAdmin`) y papelera `planner_plans`:** no re-leídos en esta sesión — carry-over de Discovery, `INFERRED`/no verificado aquí.
5. **Detalle `planner.goals.service.js` (updates, milestones) y `planner.trash/activity/attention/summary` services:** cubiertos sólo vía inventario por subagente (evidencia secundaria, no re-lectura propia línea a línea); sus `file:line` se citan como `STATIC CONFIRMED (inventario)`.
6. **Conteos globales `people`/`auth.users`:** no recontados (irrelevantes para capabilities; Discovery decía 125/194).
7. **Diferencia households 97 vs 103:** registrada, causa `UNKNOWN`.
8. **Writers UI de measurements/link-event:** ausencia afirmada por imports (`INFERRED` desde `PlannerPlanStructureEditScreen.tsx:17-28` citado en Discovery + `handleLinkTask` V1 leído aquí); búsqueda negativa completa de writers en frontend para `planner_plans` no exhaustiva línea a línea → `INCONCLUSIVE` residual menor.
9. **Figma-app:** excluida como authority por regla (mención única, §13).

---

## 19. Evidence registry

### Estática (archivos + líneas re-leídas en esta sesión)

- `backend/src/lib/plannerCapabilities.js` (completo, 434 líneas): catálogo `:26-69`, roles `:71-78`, matriz `:91-332`, override `:342-353`, `resolveCapabilities` `:364-375`, asserts `:382-398`.
- `backend/src/lib/capabilityEngine.js` (completo): `:5-29`.
- `backend/src/controllers/planner.plans.controller.js` (completo): mapping `:35-48`, auth `:50-81`, endpoints `:83-218`.
- `backend/src/controllers/planner.plans.v1.controller.js` (completo): 8 asserts.
- `backend/src/controllers/planner.goals.controller.js` `:1-120` + asserts `:117-440` (vía grep con líneas).
- `backend/src/services/planner.plans.service.js` `:1-200` (`structuralActions`, `toPlanDto`).
- `backend/src/services/planner.plans.v1.service.js` `:1-115` (vocabulario + `validateLifecycleTransition`), `:230-529` (create/update/transition/trash).
- `backend/src/services/planner.context.service.js` (completo).
- `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql`: capability `:317-360`, `can_read` `:362-382`, `can_mutate` `:384-422`, auth ctx `:424-437`, RLS `:630-671`, writer create-guard `:806-857`, transiciones `:979-1069`, grants `:1605-1627`.
- `supabase/migrations/20260722010000_m11_1a_task_fulfillment_foundation.sql`: capability `:14-68`, `restore_goal_rpc` `:1744-1794`, grants `:1864-1867`.
- `supabase/migrations/20260918000001_planner_preset_templates_capability.sql` (completo).
- `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql`: capability `:323-366`, RLS `:790-885`.
- `supabase/migrations/20260713003000_add_planner_trash_restore.sql`: `can_select/update` v2 `:66-106`, `trash_goal_rpc` `:129-177`, resto `:180-341`.
- `supabase/migrations/202607080004_planner_goals.sql`: helpers+RLS `:162-272`.
- `supabase/migrations/20260908000001_planner_canonical_plan_lifecycle.sql`: `:45-90`.
- `supabase/migrations/20260722049000_m11_3a_consume_shared_mutation_authority.sql`: ramas archive `:244-288`.
- `backend/src/routes/planner.js`: rutas `:39-140`; `routes/planner.v1.js:6-13` (vía inventario).
- `front/mi-front-limpio/screens/planner/PlannerPlanDetailScreenV1.tsx`: link/unlink `:194-238`, transiciones `:240-250`, botones `:441-494,597-623`.
- Búsquedas negativas: `goal.manage_participants` (sólo 7 hits en `plannerCapabilities.js`); `'plan.<verbo>'` capability (0 hits); `structuralActions` en frontend (0 hits).

### Runtime read-only (todas con `SET LOCAL default_transaction_read_only = on`)

- `schema_migrations = 112`; tablas: plans 0, goals 1 (`preparation`/`active`/`household`, `archived_at NULL`), measurements/history/requirements 0, tasks 3, events 0; households 97 (10 con `permissions`).
- Overrides: keys reales 6 household-only; roles reales 6; `goal.*`/`planner.*`/`task.*`/`event.*` 0; `config` top-keys: `permissions`, `setup_version`.
- `household_members` por rol: coordinator 12, adult 2.
- Policies (`pg_policies`): lista completa planner (§12.1); quals goals-selected sin `trashed_at`, measurements/history/plans quals verificados.
- `can_select/can_update_planner_goal` prosrc con `trashed_at IS NULL` (v2 vigente).
- `planner_plans_archive_terminal_only` vigente (`pg_constraint`).
- Grants: tablas por rol (§12.2/§16); `has_function_privilege('anon',…)` true: `trash_goal_rpc`, `trash_milestone_rpc`, `soft_delete_goal_milestone_rpc`, `write_planner_plan_graph_rpc`; false: `restore_*`, `read_…`, `apply_…`, `mutate_task`, `create_event`.
- Vista `planner_legacy_goal_plan_projection`: definición + grants totales + `is_updatable/is_insertable_into = NO`.
- Funciones `SECURITY DEFINER` verificadas (`prosecdef`).

### Secundaria (inventario por subagentes, no re-lectura propia)

- Resto de controllers/services (`tasks`, `events`, `activity`, `attention`, `drafts`, `search`, `summary`, `schedules`, `responsibilities`, `presets`, `capabilities`), `planner.goals.service.js`, resto de `planner.plans.service.js` / `planner.plans.v1.service.js`, frontend (`PlannerPlanDetailScreen.tsx`, `PlannerPlansSurfaces.tsx`, `plannerPlans.ts`, `QuickActionsMenu.tsx`, `plannerQuickActions.ts`, `PlannerTrashScreen.tsx`, `GoalDetailScreen.tsx`, adapters). Citados con `file:line` del inventario; confianza `STATIC CONFIRMED (inventario)`.
- Discovery V1 carry-overs marcados explícitamente (`INFERRED`/no re-verificado): papelera `planner_plans` ausente, defectos `validate_external_link`, `PlannerPlansScreen` muerta.

---

*Fin de PLANS_CAPABILITY_MAP_CURRENT_V1. STOP: sin Target, sin recomendaciones, sin cambios de código/migraciones. Espera revisión humana.*
