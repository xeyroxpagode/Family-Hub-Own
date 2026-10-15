# PLANS · CREATE FAILURE TRACE V1

**Tipo de documento:** traza READ-ONLY de fallo + matriz de evidencia. **NO corrige. NO implementa. NO escribe migraciones. NO modifica código, DB, env ni documentos existentes.**

**Worktree auditado:** `C:\Users\thega\Desktop\HomePlus-worktrees\planner-current`
**HEAD auditado:** `79f877f152072e759c11511bd91807273c4e1c13`
**Fecha de la sesión:** 2026-10-03
**Documento hermano:** `PLANS_GOALS_VS_PLANS_SALVAGE_MATRIX_V1.md`
**Inputs leídos completos:** `PLANS_RECONSTRUCTION_DISCOVERY_V1.md`, `PLANS_CAPABILITY_MAP_CURRENT_V1.md`, `PLANS_RECONSTRUCTION_PLAN_V1.md`
**Product Truth (CLOSED):** `C:\Users\thega\Downloads\PLANS_PRODUCT_TRUTH_V1_AND_FIGMA_AUDIT.md`

### 0. Etiquetas

| Etiqueta | Significado |
|---|---|
| `STATIC CONFIRMED` | Evidencia directa en archivo, con `file:line`, re-leída en esta sesión |
| `RUNTIME READ-ONLY VERIFIED` | Observado contra la DB local real (`supabase_db_HomePlus`, `127.0.0.1:56222`) sólo con `SELECT` y funciones de lectura, dentro de `SET LOCAL default_transaction_read_only = on` |
| `RUNTIME REPRODUCED` | Observado en la app real. **En esta sesión: ninguna** |
| `NOT REPRODUCED` | No alcanzado; la ruta no se ejecutó |
| `BLOCKED` | No verificable bajo las reglas de esta sesión |
| `NOT FOUND` | Buscado explícitamente, ausente |
| `INFERRED` | Razonamiento, no observación |
| `UNKNOWN` | Sin evidencia suficiente |
| `REFUTED` | Una afirmación previa (mia o heredada) queda contradicha por esta sesión |

> **Honestidad de esta sesión, declarada de entrada:** la fase de runtime (A4) **NO se ejecutó**. No se abrió la app, no se tocó "Crear", no se escribió ninguna fila. Motivo y evidencia en §2. Por lo tanto **ninguna** afirmación de este documento está etiquetada `RUNTIME REPRODUCED`. Todo lo relativo al comportamiento observable del usuario es `STATIC CONFIRMED` o `INFERRED`, y está marcado como tal.

---

## 1. PREFLIGHT

| Ítem | Valor | Verificación |
|---|---|---|
| `git rev-parse --show-toplevel` | `C:/Users/thega/Desktop/HomePlus-worktrees/planner-current` | `STATIC CONFIRMED` |
| `git rev-parse HEAD` | `79f877f152072e759c11511bd91807273c4e1c13` | `STATIC CONFIRMED` |
| `git branch --show-current` | **(vacío) ⇒ `(detached HEAD)`** | `STATIC CONFIRMED`. **NO corregido** |
| `git status --short` | `?? PLANS_CAPABILITY_MAP_CURRENT_V1.md` · `?? PLANS_RECONSTRUCTION_DISCOVERY_V1.md` · `?? PLANS_RECONSTRUCTION_PLAN_V1.md` | `STATIC CONFIRMED` |
| Archivos tracked modificados | **0** | `STATIC CONFIRMED` |
| Archivos staged | **0** | No se ejecutó `git add` |
| `git worktree list` | 6 worktrees; este = `79f877f (detached HEAD)` | `STATIC CONFIRMED` |
| Base local `homecloud/v2-latest-base` | `82997ad` | `STATIC CONFIRMED` |
| Base remota `origin/homecloud/v2-latest-base` | `79f877f` (coincide con HEAD) | `STATIC CONFIRMED` |
| Stash preexistente | No inspeccionado ni tocado | — |

### 1.1 Estado de partida y de salida

| | Inicio | Salida |
|---|---|---|
| Untracked | 3 (los documentos de sesiones previas) | 5 (los 3 anteriores + los 2 de esta sesión) |
| Tracked diff | 0 | 0 |
| Staged | 0 | 0 |
| HEAD | `79f877f` | `79f877f` (sin commits) |

**Archivos escritos por esta sesión (únicos):**
1. `PLANS_CREATE_FAILURE_TRACE_V1.md` (este documento)
2. `PLANS_GOALS_VS_PLANS_SALVAGE_MATRIX_V1.md`

Ningún otro archivo creado, modificado, commiteado ni borrado.

---

## 2. RUNTIME OWNERSHIP

### 2.1 Required result block

```
APP RUNTIME OWNER:      homecloud-current   (NO planner-current)
BACKEND RUNTIME OWNER:  homecloud-current   (NO planner-current)
API TARGET:             UNKNOWN / NO APPRAACHABLE FROM planner-current
SUPABASE TARGET (front): REMOTE — Cloudflare tunnel hostnames, NO resolubles
SUPABASE TARGET (back):  LOCAL (127.0.0.1:56221 en planner-current/.env; 192.168.0.26:56221 en homecloud-current/.env; ambos = misma stack Docker local)
SAFE LOCAL QA WRITE:    NO
```

### 2.2 Evidencia — procesos y puertos

| Ítem | Valor | Evidencia |
|---|---|---|
| Metro / Expo | `:8081` escuchando, `OwningProcess = 3076` | `Get-NetTCPConnection -State Listen` |
| Dueño de Metro | `node ...\HomePlus-worktrees\homecloud-current\front\mi-front-limpio\node_modules\expo\bin\cli start -c --go` | `Get-CimInstance Win32_Process`, PID 3076 |
| Backend HTTP | `:3001` escuchando, `OwningProcess = 2748` (`node index.js`) | idem |
| Vite `Figma-app` | `:8443` (PID 8296), `:8085` (PID 26904, `Gei-Hockey-Managment-System`), `:8086` (PID 3392, `Figma-app`) | idem |
| Stack Supabase local | contenedores `supabase_kong_HomePlus` (`:56221`), `supabase_db_HomePlus` (`:56222`), `auth`, `rest`, `realtime`, `studio` (`:56223`), `inbucket` (`:56224`), `analytics` (`:56227`) — todos `Up` | `docker ps` |

### 2.3 Determinación del dueño del backend `:3001` (método y por qué es concluyente)

El `CommandLine` del proceso es sólo `node index.js` (no contiene ruta). Se determinaron **dos** métodos independientes:

**Método 1 — cadena de procesos:**
```
PID 29676  npm-cli.js start
  └─ PID 18104  cmd.exe /d /s /c node index.js
       └─ PID 2748  node index.js   (escucha :3001)
```
Sin ruta en la cadena ⇒ insuficiente por sí solo.

**Método 2 — `LastAccessTime` de archivos fuente** (decisivo):
`homecloud-current` tiene un archivo backend modificado sin commitear (`git status --short` → ` M backend/src/services/homecloudIntakeService.js`). Los dos worktrees comparten `backend/src` sin diferencias entre `79f877f` y `04ac77c` (`git diff --stat 79f877f 04ac77c` → sólo frontend/services de homecloud, `scripts/`, `tests/run.js`). Por lo tanto `backend/src` es **idéntico** y no discrimina por contenido: discrimina **el hecho de haber sido leído**.

| Archivo | `planner-current` LastAccessTime | `homecloud-current` LastAccessTime |
|---|---|---|
| `backend/src/services/homecloudIntakeService.js` | `2026-10-03T00:17:01` | **`2026-10-03T18:12:23`** |
| `backend/src/services/planner.goals.service.js` | `2026-10-03T00:17:01` | **`2026-10-03T18:12:22`** |
| `backend/src/controllers/planner.goals.controller.js` | `2026-10-03T00:17:01` | **`2026-10-03T18:12:22`** |
| `backend/src/services/planner.plans.v1.service.js` | `2026-10-03T00:17:53` | **`2026-10-03T18:12:22`** |
| `backend/src/routes/planner.js` | `2026-10-03T00:17:16` | **`2026-10-03T18:12:22`** |
| `backend/src/services/planner.plans.service.js` | `2026-10-03T00:17:01` | **`2026-10-03T18:12:22`** |
| `backend/index.js` | `2026-10-03T18:19:00` *(lectura mía)* | `2026-10-03T18:12:22` |

`Get-Process -Id 2748 | Select StartTime` → **`2026-10-03T18:12:22`**. Los seis archivos de `homecloud-current` fueron leídos **en el mismo segundo** en que arrancó el proceso, y ninguno de los de `planner-current` en esa ventana.

> **Conclusión (evidencia confirmada, con matiz de fiabilidad):** el backend `:3001` que está vivo fue cargado desde `homecloud-current`. La métrica `LastAccessTime` puede estar deshabilitada o ser perezosa en Windows, así que se etiqueta `INFERRED (alta confianza)`, apoyada en la coincidencia exacta con `StartTime`. **No se buscó una prueba adicional** (matar/reiniciar el proceso de otro worktree está fuera de la autoridad de esta sesión).

### 2.4 Variables de entorno — sólo host/puerto, sin secretos

| Clave | `planner-current` | `homecloud-current` | Clasificación |
|---|---|---|---|
| `front/.env` `EXPO_PUBLIC_API_URL` | `https://understood-populations-sauce-dolls.trycloudflare.com` | `http://192.168.0.26:3001` | planner-current = **REMOTE (Cloudflare tunnel)** · homecloud-current = host local por IP de LAN |
| `front/.env` `EXPO_PUBLIC_SUPABASE_URL` | `https://member-alone-overhead-regardless.trycloudflare.com` | `http://192.168.0.26:56221` | planner-current = **REMOTE (Cloudflare tunnel)** · homecloud-current = LOCAL |
| `backend/.env` `SUPABASE_URL` | `http://127.0.0.1:56221` | `http://192.168.0.26:56221` | **ambos LOCAL** |
| `backend/.env` `PORT` | `3001` | `3001` | LOCAL |
| `backend/.env` `SUPABASE_JWKS_URL` | `http://127.0.0.1:56221/auth/v1/.well-known/jwks.json` | `http://192.168.0.26:56221/...` | LOCAL |
| Otros secretos (`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_MAPS_API_KEY`) | — | — | **NO impresos.** Sólo longitud |

Resolución DNS de los dos hostnames de tunnel de `planner-current`:
```
understood-populations-sauce-dolls.trycloudflare.com  → "Host desconocido"
member-alone-overhead-regardless.trycloudflare.com     → "Host desconocido"
Invoke-WebRequest ambos                                → "No se puede resolver el nombre remoto"
```
`RUNTIME VERIFIED`: **los tunnels de `planner-current` están caídos.** No son "remotos activos": son **hostnames no resolubles**.

### 2.5 Verificación de los 5 gates de la excepción "CONTROLLED LOCAL QA WRITE"

| # | Precondición exigida | Resultado | Detalle |
|---|---|---|---|
| 1 | Backend apunta a Supabase **LOCAL** | **FAIL** | El backend vivo es de `homecloud-current`. El de `planner-current` (`.env` local) no está corriendo; arrancar uno nuevo exige liberar el puerto `:3001` de otro worktree = acción fuera de la autoridad de esta sesión |
| 2 | Frontend apunta al backend **LOCAL correcto** | **FAIL** | `planner-current/.env` apunta a un tunnel `trycloudflare.com` **no resoluble**. El único Metro vivo es el de `homecloud-current` |
| 3 | Supabase URL/host es **localhost / 127.0.0.1** | **FAIL** | `EXPO_PUBLIC_SUPABASE_URL` de `planner-current` es `https://member-alone-overhead-regardless.trycloudflare.com` |
| 4 | **No** hay Cloudflare tunnel/remoto involucrado | **FAIL** | Hay **dos** URLs `trycloudflare.com` en el `.env` del frontend auditado |
| 5 | **No** se tocará proyecto Supabase remoto | **PASS (no ejercitado)** | No se ejecutó ninguna escritura |

**3 de 5 precondiciones fallan de forma independiente.** Ninguna es subsanable sin modificar `.env` (archivo existente, prohibido) o sin operar sobre el runtime de otro worktree.

### 2.6 Veredicto de la fase de runtime

```
RUNTIME WRITE BLOCKED — ENVIRONMENT NOT PROVEN LOCAL
```

Refuerzo factual, más fuerte que "no probado": el entorno de `planner-current` está **probadamente NO local** (tunnels configurados, no resolubles) y los únicos runtimes vivos pertenecen a **otro worktree**, explícitamente excluido por el encargo ("No usar homecloud-current por accidente").

**No se creó ninguna fila QA.** `__QA_PLANS_CREATE_TRACE_20261003__` no existe en ninguna tabla (§4) y no se intentó crearla. La autorización de "como máximo una creación de Plan QA" queda **sin usar**.

**Logos no disponibles:** `Get-ChildItem -Recurse -Include *.log,*.out` (excluyendo `node_modules`/`.git`) devuelve **un solo** archivo: `front/mi-front-limpio/.expo/dev/logs/start.log`, `LastWriteTime = 2026-09-30`. No hay log de backend persistido (el backend usa `morgan('dev')` a consola de una ventana de PowerShell no capturable). `STATIC CONFIRMED`.

---

## 3. STATIC CREATE TRACE

Flujo reconstruido tal como se ejecuta cuando el usuario toca **Planes → + → Crear plan**. Cada eslabón con `file:line` re-leído en esta sesión.

### 3.0 Entrada al tab

| Paso | Valor | Evidencia |
|---|---|---|
| Tab raíz | `PlannerScreen` registrado como `PlannerTab` → `PlannerHome` | `navigation/HomeTabNavigator.tsx:192` |
| Sub-tab `plans` | renderiza `PlannerPlanListScreen` inline (**no** navega a la ruta `PlanList`) | `screens/planner/PlannerScreen.tsx:786-787` |
| Label del sub-tab | `case 'plans': return 'Planes'` | `PlannerScreen.tsx:805-806` |
| `PlannerPlansScreen` | **no registrado en ninguna parte** ⇒ código muerto | `NOT FOUND` en `HomeTabNavigator.tsx` |

### 3.1 Botón "+"

| Campo | Valor |
|---|---|
| SCREEN | `PlannerPlanListScreen` — ícono `+` `PlannerPlanListScreen.tsx:139-141`; `EmptyState` con `actionLabel="Crear plan"` `:149-150` |
| CLIENT | `createPlan()` → `navigation.navigate(ROUTE_NAMES.PlanCreate)` `PlannerPlanListScreen.tsx:88-90` |
| ROUTE | `ROUTE_NAMES.PlanCreate = 'CreateGoal'` `navigation/plannerNavigationContract.ts:151` |
| SCREEN montada | `CreateGoalScreen` `HomeTabNavigator.tsx:197` |

`STATIC CONFIRMED`. `ROUTE_NAMES.PlanCreate` **no** apunta a `PlannerPlanCreateScreen`; apunta a `CreateGoalScreen`, que es un wrapper de 6 líneas (`screens/planner/CreateGoalScreen.tsx:1-6` → `<GoalForm mode="create" />`).

### 3.2 FORM

| Campo | Valor |
|---|---|
| Form | `GoalForm` `mode="create"`, **no embebido** ⇒ `embedded=false`, `createMutationId=undefined`, `onSaved=undefined` (`CreateGoalScreen.tsx:5` pasa sólo `mode`) |
| Campos visibles | Nombre de la meta (`:567-586`), Descripción opcional (`:594-609`), Categoría (`:611-662`, default `home`), Visibilidad (`:664-704`, chips `household`/`personal`, default `household`), "Cómo queres avanzar" colapsable (`:706-861`, `progressMode` inicial **`null`**), "Fechas" colapsable (`:863-986`, `starts_at`/`ends_at`) |
| **No existe** | Campo "Fecha objetivo" (`target_date`) en el formulario. **No existe** campo "Scope" (el concepto equivalente es `visibility`). **No existe** sub-formulario de componentes |
| Botón | "Crear meta" `GoalForm.tsx:988-1001` |
| Gate del botón | `isFormReady` `:179-184` = `!authLoading && !loading && !saving && accessToken && title.trim()` |

**Mapeo de los valores QA solicitados** (no ejecutados, sólo cómo se covertirían):

| Valor QA pedido | Campo real | Efecto |
|---|---|---|
| Título `__QA_PLANS_CREATE_TRACE_20261003__` | `title` | texto libre |
| Descripción vacío | `description` | `description.trim() \|\| null` → `null` (`GoalForm.tsx:417`) |
| Fecha objetivo vacío | **no hay campo** | `starts_at`/`ends_at` quedan `''` → `null` (`GoalForm.tsx:425-426`). `target_date` queda NULL (default DB) |
| Scope: Hogar | `visibility = 'household'` | default del estado (`:162`) |
| Sin componentes | — | no aplica: el formulario no ofrece componentes |

**Detalle del payload noteworthy:** `progressMode` inicial es `null`, y `validateAndBuildPayload` inicializa `let resolvedMode = 'steps'` y sólo lo sobrescribe `if (progressMode)` (`:353-360`) ⇒ **el payload de create SIEMPRE envía `progress_mode: 'steps'`**, aunque el usuario no toque el selector. `STATIC CONFIRMED` `GoalForm.tsx:353,359,420`.

### 3.3 PAYLOAD SHAPE

`GoalForm.handleSubmit` `:430-493` → `validateAndBuildPayload()` `:334-428` devuelve (`GoalForm.tsx:415-427`):

```jsonc
{
  "title": "<trimmed>",
  "description": null,          // o string
  "visibility": "household",    // | "personal"
  "category": "home",           // | family|finance|health|education|other
  "progress_mode": "steps",     // | tasks|numeric|boolean|none
  "target_type": null,          // | count|percentage|amount|boolean
  "target_value": null,         // number >= 0
  "current_value": 0,           // number >= 0
  "unit": null,                 // string
  "starts_at": null,            // "YYYY-MM-DD"
  "ends_at": null               // "YYYY-MM-DD"
}
```

En `mode === 'create'` **sin** `createMutationId`, el bloque `payloadWithVersion` (`:437-453`) **no aplica**: la rama `mode === 'create' && createMutationId` es falsa, y la rama `mode === 'edit'` es falsa ⇒ `payloadWithVersion = payload` (sin `expected_version`).

**Campos que Product Truth marca como "no conceptos centrales de V1" y que este payload exige/envía:** `category` (obligatorio en DB), `progress_mode` (obligatorio en DB, default `'steps'`), `target_type`. `STATIC CONFIRMED` contra Product Truth §02.

### 3.4 CLIENT FUNCTION

| Campo | Valor |
|---|---|
| CLIENT | `createGoal(accessToken, payloadWithVersion, { idempotencyKey: goalCreateKeyRef.current, mutationId: createMutationId })` `GoalForm.tsx:463-466` |
| Implementación | `services/plannerGoals.ts:166-183` |
| Método | `POST` |
| Path | `/api/planner/goals` |
| Base URL | `process.env.EXPO_PUBLIC_API_URL` resuelto en `services/api.ts:5-25`; **en web** se reescribe el hostname a `localhost` si no es loopback (`api.ts:14-19`) |
| Headers explícitos | `Idempotency-Key: planner.goals.create-<uuid>` (`plannerGoals.ts:171-172`; `services/idempotency.ts:1-15`) |
| `X-Mutation-Id` | **NO lo pone `plannerGoals.ts`** (`:173-175` sólo si `options.mutationId`), **pero `requestJson` lo inyecta automáticamente**: `api.ts:417-425`, `carriesMutationIdentity = operationKind !== READ_ONLY && !== AUTH_SESSION_MUTATION`; `createGoal` usa `operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT` (`plannerGoals.ts:178`) ⇒ `mutationId ?? generateMutationId()` |

> **Hipótesis refutada en esta sesión.** Antes de verificar `api.ts` era candidato principal un `422 mutation_id_required` (el backend lo exige: `controllers/planner.goals.controller.js:59` → `lib/mutationContracts.js:57-63`). **`REFUTED`**: `api.ts:417-425` garantiza la cabecera. **Este no es el fallo.**

### 3.5 HTTP

| Campo | Valor |
|---|---|
| METHOD | `POST` |
| URL | `{EXPO_PUBLIC_API_URL}/api/planner/goals` |
| ROUTE server | `router.post('/goals', goalsController.createGoal)` `backend/src/routes/planner.js:124`; router montado en `app.use('/api/planner', plannerRoutes)` `backend/index.js:91` |
| Headers derivados | `Accept`, `Content-Type: application/json`, `X-Request-Id`, `Authorization: Bearer <access_token>`, `X-Mutation-Id` (generado), `Idempotency-Key` |

### 3.6 CAPABILITY CHECK

| Campo | Valor |
|---|---|
| CONTROLLER | `createGoal` `backend/src/controllers/planner.goals.controller.js:49-80` |
| Contexto | `getPlannerContext(req)` `:51` |
| Capabilities | `resolveCapabilities({role, membershipStatus, household})` `:17-23, :52` |
| Check | `isPersonal = req.body?.visibility === 'personal'` `:54`; `requiredCap = isPersonal ? 'goal.create_personal' : 'goal.create_household'` `:55`; `assertCapability(...)` `:56` |
| Mutación | `requireMutationId(req)` `:59` ⇒ **422** si falta · `requireIdempotencyKey(req)` `:60` ⇒ **422** si falta |
| Idempotencia | `hashIdempotencyRequest(...)` `:61-67` → `withIdempotency(..., successStatus: 201)` `:69-73` |
| Respuesta | `res.set('X-Mutation-Id', mutationId)`; `res.status(result.status).json(result.body)` `:75-76` |

### 3.7 SERVICE

| Campo | Valor |
|---|---|
| SERVICE | `createGoal` `backend/src/services/planner.goals.service.js:377-424` |
| Validaciones | `title` no vacío `:378-381` (400 `validation_error`) · `validateVisibility` `:383` · `validateProgressMode` `:384` · `validateTargetType` `:385` · `validateProgressModeTargetTypeCompatibility` `:386` · `validateCategory` `:393` · `validateNonNegativeNumeric` `:396-397` · `validateNullableDate` `:399-400` |
| Payload insertado | `:388-403` — **incluye `status: 'active'` explícito** (`:402`) y **NO escribe `lifecycle`** |
| **TABLE** | **`planner_goals`** — `.from('planner_goals').insert(payload).select('*').single()` `:405-409` |
| RPC | **ninguno** |
| RLS | `planner_goals_insert_active_household` (INSERT): `WITH CHECK is_active_household_member(household_id) AND created_by_member_id = current_household_member_id(household_id)` — `RUNTIME READ-ONLY VERIFIED` (`pg_policies`) |
| Actividad | `recordPlannerActivity({entityType:'goal', action:'goal.created'})` `:415-421`, `.catch(()=>{})` — **fire-and-forget, no bloquea** |
| RESPONSE DTO | **fila cruda + `progress_percentage`** inyectado por `attachProgress` `:186-220` (llamado en `:423`). Tipo `PlannerGoal` (30 campos, `services/plannerGoals.ts:29-61`) |

### 3.8 SQL / constraints evaluados en el INSERT

`RUNTIME READ-ONLY VERIFIED` (`information_schema.columns` + `pg_constraint`):

| Constraint | Definición | ¿El payload create lo satisface? |
|---|---|---|
| `planner_goals_household_id` NOT NULL, FK→`households` ON DELETE CASCADE | ✓ | `context.householdId` ✓ |
| `planner_goals_title_not_blank_check` | `length(btrim(title)) > 0` | ✓ |
| `planner_goals_visibility_check` | `in ('household','personal')` | ✓ |
| `planner_goals_category_check` | 6 valores | ✓ (`home`) |
| `planner_goals_progress_mode_check` | `steps|tasks|numeric|boolean|none` | ✓ (`steps`) |
| `planner_goals_target_type_check` | NULL o 4 valores | ✓ (NULL) |
| `planner_goals_target_value_check` | NULL o `>= 0` | ✓ (NULL) |
| `planner_goals_current_value_check` | `>= 0` | ✓ (0) |
| `planner_goals_status_check` | `active|completed|closed` | ✓ (`active`) |
| `planner_goals_lifecycle_check` | `preparation|active|paused|completed|cancelled` | ✓ (default `'preparation'`, **el payload no lo escribe**) |
| `planner_goals_version_positive` | `>= 1` | ✓ (default 1) |
| `planner_goals_created_by_member_id` FK→`household_members` SET NULL | ✓ | `context.membershipId` ✓ |
| TRIGGER `trg_planner_goals_sync_status` | BEFORE INSERT **o** UPDATE; si `NEW.lifecycle is not null` ⇒ `NEW.status := planner_goal_project_status(NEW.lifecycle)` | `prosrc` `RUNTIME READ-ONLY VERIFIED`. En INSERT sobrescribe `status='active'` con `planner_goal_project_status('preparation') = 'active'` ⇒ **sin cambio** |
| TRIGGER `trg_planner_goals_updated_at` / `trg_planner_goals_increment_version` | BEFORE UPDATE | no aplican en INSERT |

> **No se identificó ningún defecto de esquema, constraint o trigger que bloquee este INSERT.** `STATIC CONFIRMED` sobre constraints + `RUNTIME READ-ONLY VERIFIED` sobre su definición vigente.

### 3.9 POST-CREATE NAVIGATION

| Campo | Valor |
|---|---|
| Código | `navigation.navigate('GoalDetail', { goalId: goal.id })` `GoalForm.tsx:475` |
| Ruta literal | `'GoalDetail'` = `ROUTE_NAMES.PlanDetail` `plannerNavigationContract.ts:144` |
| Ids enviados | **`goal.id`, un id de `planner_goals`** (`planner.goals.service.js:405-409` devuelve la fila insertada) |
| `markPlannerChanged()` | `GoalForm.tsx:467` |
| Ramas alternativas | `onSaved` (no, no embebido) `:469-470` · `routeReturnTo === 'PlannerHome'` (no, no se pasó `returnTo`) `:471-473` |
| Screen montada | `HomeTabNavigator.tsx:199` → `GoalDetail` = **`PlannerPlanDetailScreen`** |

### 3.10 DETAIL

| Campo | Valor |
|---|---|
| DETAIL SCREEN | `PlannerPlanDetailScreen` `screens/planner/PlannerPlanDetailScreen.tsx:28` |
| Params | `parsePlannerEntityDetailParams(route.params)` `:34-40`; si lanza ⇒ fallback `{ entityId: route.params?.goalId ?? '' }` `:38`. `route.params = { goalId }` ⇒ **`entityId` = el id de `planner_goals`** |
| Carga | `getCanonicalPlanGraph({ accessToken }, params.entityId)` `:53` |
| CLIENT | `getCanonicalPlanGraph` `services/planner/plannerPlans.ts:345-350` → `requestJson('/api/planner/plans/${encodeURIComponent(planId)}')` |
| METHOD/URL | `GET {API}/api/planner/plans/<goalId>` |
| ROUTE server | `router.get('/plans/:id', plansController.getPlanGraph)` `routes/planner.js:71` |
| CONTROLLER | `getPlanGraph` `controllers/planner.plans.controller.js:93-101` — **`sin `assertCapability`** |
| SERVICE | `getPlanGraph` `services/planner.plans.service.js:259-266` |
| RPC | **`read_planner_plan_graph_rpc(p_plan_id)`** `:260` |
| **TABLE** | **`planner_plans`** (la RPC lee `public.planner_plans`) |
| ID SPACE | **`planner_plans.id`** — espacio **disjunto** del id recibido |
| RLS | 1 sola policy: `planner_plans_select` USING `planner_plan_can_read(id,false)` — `RUNTIME READ-ONLY VERIFIED` (`pg_policies`) |
| Resultado con id de goals | RPC devuelve `NULL` ⇒ `if (!data) throw createHttpError(404, 'Plan no encontrado.', 'not_found')` `planner.plans.service.js:264` |
| Render del error | `if (error || !graph)` → `<ErrorState title="No pudimos cargar el plan" description={error ?? 'Plan no encontrado.'} …/>` `PlannerPlanDetailScreen.tsx:164-175` |

### 3.11 RUNTIME READ-ONLY VERIFICATION of the SQL-layer precondition

Con el **id real** que hoy existe en `planner_goals` (`22f53d7f-f535-4548-b70b-86a45d020c1c`, created por el mismo tipo de request):

```sql
BEGIN;
SET LOCAL default_transaction_read_only = on;
-- 1) el id de goals NO existe en planner_plans
SELECT g.id, (p.id IS NOT NULL) AS exists_in_plans
FROM planner_goals g LEFT JOIN planner_plans p ON p.id = g.id;
--   → 22f53d7f-… | f

-- 2) la RPC de detalle devuelve NULL para ese id
SELECT public.read_planner_plan_graph_rpc(g.id) IS NULL AS rpc_returns_null
FROM planner_goals g;
--   → t
COMMIT;
```

`RUNTIME READ-ONLY VERIFIED`. **La precondición SQL del defecto cross-ID está probada con el id real de la tabla, no inferida.** Lo que falta es la ejecución del POST y de la navegación (§2.6).

### 3.12 Other static sites with the same cross-table binding (NOT exercised)

| # | Site | Id space produced | Screen mounted | Table read | Coherent? |
|---|---|---|---|---|---|
| 1 | `GoalForm.tsx:475` (create) | `planner_goals` | `PlannerPlanDetailScreen` | `planner_plans` | **NO** |
| 2 | `PlannerPlanListScreen.tsx:82-85` (`openPlan`, lista) | `planner_goals` (`listPlansV1`) | `PlannerPlanDetailScreen` | `planner_plans` | **NO** |
| 3 | `plannerNavigationContract.ts:408-416` `ENTITY_DETAIL_ROUTES.plan = ROUTE_NAMES.PlanDetail` → usado por `navigation/plannerNavigationHelpers.ts:175` | según origen | `PlannerPlanDetailScreen` | `planner_plans` | **depende del origen** |
| 4 | `services/planner/plannerDeepLinkCoordinator.ts:276` `screen: 'GoalDetail'` (`homeplus://planner/goals/:id`) | `planner_goals` (el path dice `goals`) | `PlannerPlanDetailScreen` | `planner_plans` | **NO** |
| 5 | `screens/planner/PlannerAttentionActivityScreen.tsx:188` `navigate('GoalDetail', {entityId})` | `planner_plans` (`planner.attention.service.js:233,264`) | `PlannerPlanDetailScreen` | `planner_plans` | **SÍ** |
| 6 | `screens/planner/PlannerPlanCreateScreen.tsx:105` `navigate('PlanDetail', {planId})` (literal `PlanDetail`) | `planner_goals` (`createPlanV1`) | `PlannerPlanDetailScreenV1` (`HomeTabNavigator.tsx:202`) | `planner_goals` (`/v1/plans/:id`) | **SÍ** — pero la pantalla que lo emite es **inalcanzable**: nadie navega al nombre de ruta `'CreatePlan'` (`NOT FOUND` en todo `front/`) |
| 7 | `screens/planner/TaskForm.tsx:535` `replace('PlanDetail', {planId: returnToPlanId})` | `planner_goals` | `PlannerPlanDetailScreenV1` | `planner_goals` | **SÍ** |
| 8 | `screens/planner/TaskForm.tsx:714` `replace('GoalDetail', {goalId})` | `planner_goals` | `PlannerPlanDetailScreen` | `planner_plans` | **NO** |

`STATIC CONFIRMED` (grep exhaustivo de `'CreatePlan'`, `ROUTE_NAMES.PlanCreate`, `'GoalDetail'`, `'PlanDetail'` sobre `front/mi-front-limpio/**/*.ts(x)` → 14 coincidencias, todas listadas arriba).

### 3.13 Create paths that write `planner_plans` — INALCANZABLES

| Path | Evidencia | Estado |
|---|---|---|
| `PlannerSheetHost.tsx:465` `enqueuePlannerPlanGraphWrite(request, intent, 'create')` → `POST /api/planner/plans` → `write_planner_plan_graph_rpc` → **`planner_plans`** | `PlannerSheetHost.tsx:402,465,512`; surface `PlannerPlanMinimalCreateSurface` | El sheet state `plan_form` existe (`services/planner/plannerSheetState.ts:23,56,216`) pero **`NOT FOUND` cualquier opener** |
| Quick Action `create_goal` | `services/planner/plannerQuickActions.ts:114` (key), **`:126` `implemented: false`**; filtros `components/planner/QuickActionsMenu.tsx:51,98` | **OCULTO en UI** |
| `PlannerPlanCreateScreen` → `createPlanV1` (`POST /api/planner/v1/plans` → `planner_goals`) | `HomeTabNavigator.tsx:219` registra `'CreatePlan'` | **INALCANZABLE**: nadie navega a `'CreatePlan'` |

> **Consecuencia factual, `STATIC CONFIRMED`:** en la app actual **no existe ningún camino de usuario que escriba `planner_plans`**. `planner_plans` tiene 0 filas (`RUNTIME READ-ONLY VERIFIED`) y ningún writer alcanzable. Ésta es la misma afirmación del Discovery, **re-verificada en este worktree**.

---

## 4. BEFORE DB

`RUNTIME READ-ONLY VERIFIED` — `postgresql://…@127.0.0.1:56222/postgres`, contenedor `supabase_db_HomePlus`, PostgreSQL 17.6, cada bloque con `BEGIN; SET LOCAL default_transaction_read_only = on; … COMMIT;`.

```
BEFORE planner_goals: 1
BEFORE planner_plans: 0
```

Conteo completo de tablas del dominio:

| Tabla | Filas |
|---|---|
| `planner_goals` | **1** |
| `planner_plans` | **0** |
| `planner_goal_milestones` | 0 |
| `planner_plan_milestones` | 0 |
| `planner_plan_measurements` | 0 |
| `planner_plan_measurement_history` | 0 |
| `planner_plan_requirements` | 0 |
| `planner_plan_manual_conditions` | 0 |
| `planner_plan_operations` | 0 |
| `planner_plan_legacy_goal_links` | 0 |
| `planner_tasks` | 3 |
| `planner_events` | 0 |
| `planner_activity_log` | 1 |
| `supabase_migrations.schema_migrations` | **112** |

`⇒ La DB local está a la altura exacta del worktree.` `RUNTIME READ-ONLY VERIFIED`

### 4.1 Fila existente en `planner_goals`

| Columna | Valor |
|---|---|
| `id` | `22f53d7f-f535-4548-b70b-86a45d020c1c` |
| `household_id` | `df17a2bc-fdf9-49cd-b0d3-411f2e394b72` |
| `title` | `hdjs` |
| `lifecycle` | `preparation` |
| `status` | `active` |
| `visibility` | `household` |
| `category` | `home` |
| `progress_mode` | `steps` |
| `current_value` / `target_value` / `unit` | `0` / NULL / NULL |
| `starts_at` / `ends_at` / **`target_date`** | NULL / NULL / **NULL** |
| `created_by_member_id` | `4e1ded1b-b7d5-49af-8a98-37f2d629dfaf` (**no NULL**) |
| `version` | 1 |
| `trashed_at` / `archived_at` / `deleted_at` | NULL / NULL / NULL |
| `created_at` | `2026-09-25 12:56:32.903036+00` |

### 4.2 Búsqueda de la fila QA

```sql
SELECT id FROM planner_goals WHERE title ILIKE '%QA_PLANS_CREATE_TRACE%';   → 0 rows
SELECT id FROM planner_plans WHERE objective ILIKE '%QA_PLANS_CREATE_TRACE%'; → 0 rows
```
`RUNTIME READ-ONLY VERIFIED`. **No existe fila QA previa.** (Si existiera, la instrucción era reutilizarla y no crear otra.)

### 4.3 Otros baselines relevantes

| Sonda | Resultado |
|---|---|
| `planner_tasks.goal_id` no nulo | **0 de 3** |
| Goals con `lifecycle='preparation'` | 1 |
| Goals `visibility='personal'` | 0 |
| Goals `archived_at` / `trashed_at` / `deleted_at` no nulos | 0 / 0 / 0 |
| `planner_activity_log` | 1 fila: `entity_type='goal'`, `entity_id=22f53d7f-…`, `action='goal.created'`, `created_at=2026-09-25 12:56:32.912124+00` |
| Requirements `external` | 0 |
| `planner_idempotency_keys` | 11 filas |

---

## 5. RUNTIME REPRODUCTION

```
RUNTIME WRITE BLOCKED — ENVIRONMENT NOT PROVEN LOCAL
```

| Paso | Resultado |
|---|---|
| 1. Levantar/usar runtime del worktree `planner-current` | **NOT RUN** — Metro vivo es de `homecloud-current`; `planner-current/.env` apunta a tunnels no resolubles; arrancar el backend de `planner-current` exige tomar el puerto `:3001` de otro worktree |
| 2. Abrir la app real | **NOT RUN** |
| 3. Ir a Planner → Planes → + → Nuevo Plan | **NOT RUN** |
| 4. Cargar título `__QA_PLANS_CREATE_TRACE_20261003__` | **NOT RUN** |
| 5. Tocar "Crear meta" **una** sola vez | **NOT RUN** — **0 taps**. No se hizo retry ni doble toque |
| 6. Capturar request/URL/method/payload/status/body | **NOT RUN** |
| 7. Capturar logs backend / frontend | **NOT RUN** — no hay log persistido (§2.6) |
| 8. Capturar navegación posterior, route, id, detail, tabla | **NOT RUN** |

**No se ha capturado ninguno de los 18 puntos de evidencia solicitados porque ninguno ocurrió.** No se sustituye por simulación: lo que se hizo en su lugar es la traza estática completa (§3) y la verificación SQL read-only de la precondición (§3.11).

---

## 6. HTTP EVIDENCE

```
NO HAY EVIDENCIA HTTP DE RUNTIME.
```

Motivo: no se ejecutó ninguna petición desde la app (§2, §5). Lo único observado a nivel HTTP fue, contra el backend **de `homecloud-current`**, en modo lectura y sin autenticación:

| Sonda | Resultado | Etiqueta |
|---|---|---|
| `GET http://127.0.0.1:3001/health` | `200` · `{"ok":true,"service":"homeplus-backend","timestamp":"2026-10-03T21:19:08.463Z","env":"development"}` | `RUNTIME VERIFIED` (servicio vivo) |
| `GET http://127.0.0.1:3001/` | `200` · "El servidor de FamilyHub est� funcionando correctamente!" | `RUNTIME VERIFIED` |
| `GET https://understood-populations-sauce-dolls.trycloudflare.com/health` | `No se puede resolver el nombre remoto` | `RUNTIME VERIFIED` (tunnel muerto) |
| `GET https://member-alone-overhead-regardless.trycloudflare.com/rest/v1/` | `No se puede resolver el nombre remoto` | `RUNTIME VERIFIED` (tunnel muerto) |

Lo que la traza estática **predice** para el `POST /api/planner/goals` del caso QA, marcado como **predicción, no observación**:

| Escenario | Status | Body (predicho) | Base |
|---|---|---|---|
| Actor con `goal.create_household` y miembro activo del household | **201** | `{ "goal": { …30 campos…, "progress_percentage": <n> } }` | `planner.goals.controller.js:71,76` + `planner.goals.service.js:423` |
| Falta `X-Mutation-Id` (no ocurre: lo inyecta `api.ts`) | 422 | `mutation_id_required` | `mutationContracts.js:57-63` |
| Falta `Idempotency-Key` (no ocurre) | 422 | `idempotency_key_required` | `mutationContracts.js:75-81` |
| `title` vacío (no ocurre: el botón está gateado) | 400 | `validation_error` | `planner.goals.service.js:379-381` |
| Rol sin `goal.create_household` (p. ej. `child`, `guest`) | 403 | `planner_forbidden` | `planner.goals.controller.js:56` |
| RLS violada (no esperable: `created_by_member_id` viene del servidor) | 403 | `rls_violation` | `planner.goals.service.js:411-413` + `throwSupabaseError` |

Y para el `GET /api/planner/plans/<goalId>` posterior, predicho:

| Escenario | Status | Body (predicho) | Base |
|---|---|---|---|
| id que sólo existe en `planner_goals` | **404** | `{ error: { code: 'not_found', message: 'Plan no encontrado.' } }` | `planner.plans.service.js:264` + `planner.attention`/`sendApiError` |
| id existente en `planner_plans` | 200 | `toPlanGraphDto(...)` | `planner.plans.service.js:265` |

---

## 7. BACKEND EVIDENCE

Sin ejecución de la app, la evidencia de backend es **código re-leído + SQL read-only**. Ningún log de backend existe (§2.6).

### 7.1 Controller / service / RPC / tabla del create

```
POST /api/planner/goals
  routes/planner.js:124
    → planner.goals.controller.createGoal            :49-80
        getPlannerContext(req)                        :51
        resolveCapabilities(...)                      :52
        assertCapability(goal.create_household)       :54-56
        requireMutationId(req)                        :59
        requireIdempotencyKey(req)                    :60
        withIdempotency(successStatus:201)            :69-73
          → planner.goals.service.createGoal          :377-424
              INSERT INTO public.planner_goals         :405-409
              (RLS: planner_goals_insert_active_household)
              triggers: planner_goals_sync_status (INSERT/UPDATE)
              recordPlannerActivity(goal.created)      :415-421
              attachProgress → +progress_percentage   :423 / :186-220
      201 { goal }
```

### 7.2 Idempotencia en la capa goals

`plannerIdempotencyAdapter.withIdempotency` `:153-232`:
- reserva vía RPC `reserve_planner_idempotency_key` `:118-124` con `p_household_id`, `p_actor_member_id`, `p_idempotency_key`, `p_operation='planner.goals.create'`, `p_request_hash` (SHA-256 de método+operación+params+body+expected_version, `:45-56`);
- `status='replay'` ⇒ devuelve la respuesta almacenada `:165-171`;
- `status='in_flight'` ⇒ **409 `idempotency_in_flight`** `:175-183`;
- errores 4xx del service ⇒ se **persisten** y se relanzan `:194-208`;
- 2xx ⇒ `complete_planner_idempotency_key` `:216-229`, con **swallow** del error de persistencia (`:227`).

⇒ **Pieza real y viva en el sistema goals.** No es decorativa.

### 7.3 SQL/RLS de la escritura

| Elemento | Estado | Etiqueta |
|---|---|---|
| Tabla | `planner_goals` | `STATIC CONFIRMED` |
| INSERT directo (no RPC) | sí | `STATIC CONFIRMED` |
| Policy INSERT | `planner_goals_insert_active_household`, **sin capability** | `RUNTIME READ-ONLY VERIFIED` |
| `relacl planner_goals` | `{postgres=arwdDxtm, **anon=arwdDxtm**, **authenticated=arwdDxtm**, service_role=arwdDxtm}` | `RUNTIME READ-ONLY VERIFIED` |
| `relforcerowsecurity` | `false` | `RUNTIME READ-ONLY VERIFIED` |
| Trigger de sync | `planner_goals_sync_status` BEFORE INSERT OR UPDATE | `RUNTIME READ-ONLY VERIFIED` (`prosrc`) |
| Trigger de versión | `trg_planner_goals_increment_version` BEFORE UPDATE | `RUNTIME READ-ONLY VERIFIED` |

---

## 8. DB AFTER

No hubo write. Por lo tanto **AFTER == BEFORE**, verificado:

| Sonda | Resultado |
|---|---|
| ROW CREATED? | **NO** (no se intentó ninguna creación) |
| TABLE | **NONE** |
| ID | **NONE** |
| LIFECYCLE | **N/A** |
| VISIBILITY/SCOPE | **N/A** |
| TRASHED | **N/A** |
| ARCHIVED | **N/A** |
| `planner_goals` después | **1** (= antes) |
| `planner_plans` después | **0** (= antes) |
| `planner_activity_log` después | 1 (= antes) |
| `__QA_PLANS_CREATE_TRACE_20261003__` | sigue sin existir en ninguna tabla |

`RUNTIME READ-ONLY VERIFIED` (re-contdeo ejecutado tras el análisis estático).

> La fila QA **no se creó y no se limpia**: no hay nada que limpiar. La evidencia QA prevista queda **sin generar**, y su generación depende de una decisión humana sobre el entorno (ver §13).

---

## 9. NAVIGATION TRACE

| # | Momento | Valor | Etiqueta |
|---|---|---|---|
| 1 | Ruta de lista | `PlannerTab` → `PlannerHome` (`PlannerScreen`), sub-tab `plans` → `PlannerPlanListScreen` | `STATIC CONFIRMED` |
| 2 | Tap en "+" | `createPlan()` | `STATIC CONFIRMED` |
| 3 | Ruta de create | `'CreateGoal'` → `CreateGoalScreen` → `GoalForm mode="create"` | `STATIC CONFIRMED` |
| 4 | Tap en "Crear meta" | `handleSubmit()` | `STATIC CONFIRMED` |
| 5 | Request | `POST {API}/api/planner/goals` | `STATIC CONFIRMED` |
| 6 | Bindings mutantes | `X-Mutation-Id` (generado en `api.ts:423`) · `Idempotency-Key: planner.goals.create-<uuid>` | `STATIC CONFIRMED` |
| 7 | Tabla escrita | `planner_goals` | `STATIC CONFIRMED` |
| 8 | Id producido | `planner_goals.id` | `STATIC CONFIRMED` |
| 9 | Navegación | `navigation.navigate('GoalDetail', { goalId: goal.id })` `GoalForm.tsx:475` | `STATIC CONFIRMED` |
| 10 | Nombre de ruta | `'GoalDetail'` (= `ROUTE_NAMES.PlanDetail`) | `STATIC CONFIRMED` |
| 11 | Id en la ruta | `{ goalId: <planner_goals.id> }` | `STATIC CONFIRMED` |
| 12 | Screen montada | `PlannerPlanDetailScreen` | `STATIC CONFIRMED` |
| 13 | Request de detail | `GET {API}/api/planner/plans/<planner_goals.id>` | `STATIC CONFIRMED` |
| 14 | Tabla consultada | **`planner_plans`** (vía `read_planner_plan_graph_rpc`) | `STATIC CONFIRMED` + `RUNTIME READ-ONLY VERIFIED` (NULL para el id real de goals) |
| 15 | Resultado del detail | `NULL` ⇒ `404 not_found` ⇒ `<ErrorState title="No pudimos cargar el plan" description="Plan no encontrado.">` | `STATIC CONFIRMED` para el código; `RUNTIME READ-ONLY VERIFIED` para el `NULL` |
| 16 | Reintento | el `ErrorState` ofrece "Reintentar" → `load()` → mismo `GET` → mismo 404 (idempotente en el fallo) | `STATIC CONFIRMED` |

**Respuesta a la distinción exigida en A2** (no asumir que "crear falla"):

| Categoría | ¿Se cumple en ESTE flujo? | Base |
|---|---|---|
| **CREATE REQUEST FAILURE** | **NO demostrado.** No se halló defecto estático que rechace el POST: capability, contratos de mutación, validaciones y constraints están todos satisfacibles con el payload de la app. | `STATIC CONFIRMED` (ausencia de defecto) |
| **CREATE SUCCEEDS BUT POST-CREATE NAVIGATION FAILS** | **SÍ, estructuralmente.** La navegación no "falla" en el sentido de error de React Navigation: navega correctamente a una screen que no puede leer el id. | `STATIC CONFIRMED` |
| **CREATE + NAVIGATION SUCCEED BUT DETAIL READ FAILS** | **SÍ — ésta es la cadena.** `planner_goals.id` → `GET /api/planner/plans/:id` → `planner_plans` → `NULL` → 404. Y el `NULL` está **probado en runtime** para el id real de goals. | `STATIC CONFIRMED` + `RUNTIME READ-ONLY VERIFIED` |
| **UI VALIDATION FAILURE** | **NO**, si el título tiene contenido: `isFormReady` sólo exige token + título no vacío. | `STATIC CONFIRMED` |
| **BACKEND AUTH/RLS FAILURE** | **NO esperado**: `created_by_member_id` lo pone el servidor (`:401`) y satisface el `WITH CHECK` de la policy INSERT. No hay línea que niegue `goal.create_household` a `coordinator`/`adult`/`adolescent`/`senior`. | `STATIC CONFIRMED` |

---

## 10. FAILURE CLASSIFICATION

### 10.1 Causa primaria

```
F10 — CROSS-ID TABLE READ
```

**Motivo factual:** el identificador producido por el INSERT en `planner_goals` se transmite sin transformación a un lector cuya tabla es `planner_plans`. Los dos espacios de id son disjuntos (ambos `gen_random_uuid()`, sin FK ni trigger que los enlace) y la precondición SQL —que el id de goals no existe en `planner_plans` y la RPC de detalle devuelve `NULL`— está **`RUNTIME READ-ONLY VERIFIED` con el id real**.

### 10.2 Causa contribuyente (no primaria)

```
F9 — INSERT SUCCESS + WRONG NAVIGATION
```

`GoalForm.tsx:475` es el primer punto de la cadena que deja de mirar `planner_goals`. No es una "navegación equivocada" en el sentido de nombre de ruta (usa el nombre canónico `ROUTE_NAMES.PlanDetail`), sino el **único punto donde el identificador cambia de familia de tabla sin que nadie lo note**. Se clasifica como contribuyente, no primaria, porque corregir el binding del lector sin corregir el emisor dejaría los sitios #2, #4 y #8 (§3.12) intactos.

### 10.3 Clasificación por capa (todas `STATIC CONFIRMED`, ninguna `RUNTIME REPRODUCED`)

| Capa | Veredicto |
|---|---|
| F1 Frontend validation | **NO** |
| F2 Frontend client/URL | **NO** — `api.ts` inyecta `X-Mutation-Id`; URL correcta |
| F3 Backend controller | **NO** — `createGoal` es correcto para su contrato |
| F4 Capability | **NO** — `goal.create_household` es `true` para coordinator/adult/adolescent/senior (`PLANS_CAPABILITY_MAP_CURRENT_V1.md §5.1`, re-verificado por referencia) |
| F5 Service validation | **NO** |
| F6 RLS / DB auth | **NO** |
| F7 SQL constraint | **NO** |
| F8 Insert success + response bug | **NO** |
| F9 Insert success + wrong navigation | **SÍ (contribuyente)** |
| **F10 Cross-ID table read** | **SÍ (PRIMARIA)** |
| F11 Detail failure unrelated to create | **NO** — la falla del detail **es caused by** el create: nace del id que el create produjo |
| F12 Environment / wrong server | **SÍ, pero ortogonal**: el entorno de runtime disponible pertenece a `homecloud-current` (§2). **No es la causa del defecto de código**; es la causa de que este documento no tenga evidencia `RUNTIME REPRODUCED` |
| F13 Other | Ver §11 |

---

## 11. ROOT CAUSE

### 11.1 Cadena causal

```
Dos tablas raíz de Plan, dos espacios de id, un nombre de ruta.

  ROUTE_NAMES.PlanDetail = 'GoalDetail'                      (plannerNavigationContract.ts:144)
  'GoalDetail'  ──registrado──▶  PlannerPlanDetailScreen      (HomeTabNavigator.tsx:199)
                                 └─ getCanonicalPlanGraph     (PlannerPlanDetailScreen.tsx:53)
                                    └─ GET /api/planner/plans/:id
                                       └─ read_planner_plan_graph_rpc  →  planner_plans
                                          ▲
                                          │  el id viene de planner_goals
  POST /api/planner/goals ──▶ INSERT planner_goals ──▶ goal.id
                                          │
  GoalForm.tsx:475  navigate('GoalDetail', { goalId: goal.id })
                                          │
                                          ▼
                              read_planner_plan_graph_rpc → NULL → 404
                              ErrorState "No pudimos cargar el plan"
```

**Una sola causa raíz estructural:** *la navegación de detalle de Plan está enlazada a `planner_plans` mientras que el productor de ese detalle está enlazado a `planner_goals`; no existe ningún mecanismo que detecte ni traduzca el desajuste de espacio de id.*

### 11.2 Agravantes verificados en esta sesión

| # | Agravante | Evidencia |
|---|---|---|
| A1 | **La nomenclatura de versión está invertida**: `/v1/plans` → `planner_goals`; `/plans` → `planner_plans`. Un nombre "v1" que apunta al sistema viejo. | `routes/planner.v1.js:6-13` + `routes/planner.js:143` vs `routes/planner.js:69-74` |
| A2 | **`planner_plans` es inaccesible desde la UI**: 0 filas y ningún writer alcanzable (`create_goal` `implemented:false`; `plan_form` sin opener; `'CreatePlan'` sin navegar). | §3.13 |
| A3 | **El sistema "V1" (goals) tiene el bug de `resume`**: `case 'resume'` existe (`:404`) pero `paused → ['active','completed','cancelled']` (`:32`) no incluye `'resume'` ⇒ **409**. | `planner.plans.v1.service.js:29-35,101-109,404` |
| A4 | **`close` sin verificación**: `close` no comprueba ningún hijo. | `planner.plans.v1.service.js:1030` (canónico) / `planner.plans.service.js` (goals) |
| A5 | **`planner_plans` ausente de la papelera**: `planner.trash.service.js` no consulta `planner_plans` (sólo `planner_tasks:6`, `planner_events:35`, `planner_goals:69,125,133,136,195` con `supabaseAdmin:63,119,190`). Un Plan canónico trasteado es irrecuperable desde la UI. | `STATIC CONFIRMED` (re-leído) |
| A6 | **`planner_goals` visible por SELECT directo aunque esté trasteado**: policy `planner_goals_select_visible` filtra `deleted_at` pero **no** `trashed_at`. | `RUNTIME READ-ONLY VERIFIED` (`pg_policies.qual`) |
| A7 | **`planner_goals` con `anon=arwdDxtm`**: escritura directa por `anon` sujeta sólo a RLS, y la policy INSERT no verifica capability. | `RUNTIME READ-ONLY VERIFIED` (`pg_class.relacl`) |

### 11.3 Lo que **NO** es la causa

| Hipótesis | Estado |
|---|---|
| "El `POST` es rechazado por falta de `X-Mutation-Id`" | **`REFUTED`** — `api.ts:417-425` lo inyecta |
| "Falta `Idempotency-Key`" | **`REFUTED`** — `plannerGoals.ts:171-172` + `api.ts:426-429` |
| "El INSERT viola un CHECK" | **`REFUTED`** — los 10 CHECK de `planner_goals` se verificaron contra el payload (§3.8) |
| "El INSERT viola la RLS" | **`REFUTED`** como causa: `created_by_member_id` lo fija el servidor y satisface el `WITH CHECK` |
| "El form no tiene campo `Scope`/`Fecha objetivo`" | **Diferencia de producto, no de fallo**: el form tiene `visibility` y `starts_at`/`ends_at`; `target_date` queda NULL (default) y no bloquea nada |
| "La pantalla de create es `PlannerPlanCreateScreen`" | **`REFUTED`** — `ROUTE_NAMES.PlanCreate = 'CreateGoal'`; `PlannerPlanCreateScreen` es inalcanzable |

---

## 12. MIGRATION RELEVANCE

| Pregunta | Respuesta |
|---|---|
| ¿El problema requiere migration? | **NOT ENOUGH EVIDENCE** |
| ¿Se identificó algún defecto de esquema que lo cause? | **NO.** No falta ninguna columna, constraint, trigger ni FK. El `INSERT` es legal; el `SELECT` posterior también es legal — lo que falla es **a qué tabla se consulta**. |
| ¿Es un bug de *datos*? | **NO.** Es un bug de **binding de ruta → familia de tabla**. |
| ¿Es un bug de *esquema*? | **NO demostrado.** Que existan dos tablas raíz es una condición que **habilita** el bug, pero el bug no exige cambiar el esquema: exige que un lector y un escritor de Plan pertenezcan a la misma familia de tablas. |
| ¿La existencia de dos tablas implica migration? | **NO.** Declarar "requiere migration" sólo por tener dos tablas es exactamente el razonamiento que este documento rechaza. |

**Lo que sí puede afirmarse con evidencia:** la reparación de este defecto es, como mínimo, **una decisión de autoridad de tabla + un cambio de binding de ruta**. Si esa decisión implicara mover datos, entonces habría migration — pero eso lo determina una decisión humana, no esta traza.

**Lo que la evidencia SÍ demuestra sobre migration:** `planner_plans` tiene 0 filas, `planner_goals` tiene 1 fila, `planner_plan_legacy_goal_links` tiene 0 filas, `planner_tasks.goal_id` tiene 0 no-nulos, y las 112 migraciones aplicadas coinciden con el worktree ⇒ **en esta DB local, cualquier comparación de datos entre ambos sistemas es vacía**. `RUNTIME READ-ONLY VERIFIED`. **Esto NO dice nada sobre producción** y no se usa para autorizar nada.

---

## 13. UNKNOWNS

### 13.1 Blocked por esta sesión

| # | Unknown | Por qué |
|---|---|---|
| U1 | Si el `POST /api/planner/goals` devuelve **201** en runtime con una sesión real | Requiere app real + sesión autenticada en un entorno local probado; ambos bloqueados (§2) |
| U2 | Si el `INSERT` produce efectos colaterales no previstos (idempotency keys, `planner_activity_log`, `updated_at`) | Requiere la escritura |
| U3 | Status HTTP y body exactos observados | Ídem |
| U4 | Logs de backend y de frontend durante el intento | No existen logs persistidos (§2.6) |
| U5 | Si algún actor real (rol) obtiene 403 en `goal.create_household` durante este flujo | Requiere sesión por rol |
| U6 | Si el usuario real ve el `ErrorState` o si `PlannerScreen`／`GoalForm` lo intercepta antes | Requiere pantalla real |
| U7 | Comportamiento de `resume` (409) y de `archive` (403) en runtime | Requiere escritura |

### 13.2 Unknowns que persisten aunque se levante el runtime

| # | Unknown |
|---|---|
| U8 | Si `planner_goals` tiene datos en **producción**. `RUNTIME READ-ONLY VERIFIED` sólo para local (1 fila QA). Nada de este documento autoriza asumir que remoto esté vacío. |
| U9 | Si existe algún cliente fuera de este repo (web, otro branch) que cree Plans |
| U10 | Cuál es la autoridad canónica deseada. **No es una pregunta técnica y no se responde aquí.** |
| U11 | Si `planner_goals.trashed_at` sin `deleted_at` realmente es visible para un `anon` en la práctica (la policy lo permite; no se intentó lectura como `anon` — habría sido una sonda sin escritura pero con cambio de rol; no se ejecutó) |
| U12 | Por qué `homecloud-current` y no `planner-current` es el worktree con runtimes vivos (decisión del operador, no del código) |

### 13.3 Lo que hace falta para cerrar el punto U1–U7

Decisión humana requerida, no técnica:

1. Un entorno donde `front/.env` de `planner-current` apunte a **loopback** (o LAN local) en vez de a `trycloudflare.com` — eso implica **modificar un archivo existente**, prohibido en esta sesión.
2. Un backend **de `planner-current`** corriendo (o autorización para tomar el puerto `:3001` del backend de `homecloud-current`).
3. Una sesión autenticada real, o credenciales QA.

Con 1–3, esta traza se completa con evidencia `RUNTIME REPRODUCED` en una sola sesión.

---

## 14. EVIDENCE REGISTRY

### 14.1 Static (archivos re-leídos en esta sesión, `file:line`)

**Frontend**
- `navigation/plannerNavigationContract.ts` — `:141-163` (`ROUTE_NAMES`), `:144` (`PlanDetail:'GoalDetail'`), `:151` (`PlanCreate:'CreateGoal'`), `:161` (`PlanArchive`), `:405-416` (`ENTITY_DETAIL_ROUTES`, `resolveDetailRouteName`)
- `navigation/HomeTabNavigator.tsx` — `:192-220` (todas las registraciones de `PlannerStack`)
- `screens/planner/PlannerScreen.tsx` — `:786-787`, `:805-806`
- `screens/planner/PlannerPlanListScreen.tsx` — `:42-102`, `:113-160`
- `screens/planner/CreateGoalScreen.tsx` — `:1-6` (completo)
- `screens/planner/GoalForm.tsx` — `:135-184`, `:334-428`, `:430-493`, `:541-1011` (completo, 1121 líneas)
- `screens/planner/PlannerPlanDetailScreen.tsx` — `:28-198` (completo)
- `services/plannerGoals.ts` — `:1-61` (tipos), `:78-90` (`CreatePlannerGoalInput`), `:166-183` (`createGoal`)
- `services/api.ts` — `:5-29` (base URL), `:308-314`, `:316-324`, `:379-469` (`requestJson`, inyección de cabeceras)
- `services/idempotency.ts` — `:1-15` (completo)
- `services/planner/plannerPlans.ts` — `:345-350`, `:362-363`, `:413`
- `services/plannerPlansV1Frontend.ts` — `:1-80`
- `services/planner/plannerQuickActions.ts` — `:27,81,114,126,135-159`
- `services/planner/plannerSheetState.ts` — `:23,56,216,220`
- `components/planner/QuickActionsMenu.tsx` — `:51,98`
- `components/planner/PlannerSheetHost.tsx` — `:44-47,67,72,84,402,405,465,512,538,572,611,656`
- `screens/planner/PlannerPlanCreateScreen.tsx` — `:103,105,123,132`
- `screens/planner/TaskForm.tsx` — `:535,542,551,714,718,722`
- `screens/planner/PlannerAttentionActivityScreen.tsx` — `:188`
- `screens/planner/PlannerGoalsScreen.tsx` — `:413`
- `services/planner/plannerDeepLinkCoordinator.ts` — `:276`
- `navigation/plannerNavigationHelpers.ts` — `:48,128,175,318`

**Backend**
- `backend/index.js` — `:1-108`
- `backend/src/routes/planner.js` — `:18,23,36-37` (middleware), `:39-140` (todas las rutas), `:142-143` (`presetsDraftsRouter`, `router.use('/v1', plansV1Router)`)
- `backend/src/routes/planner.v1.js` — `:1-15` (completo)
- `backend/src/controllers/planner.goals.controller.js` — `:1-130`
- `backend/src/services/planner.goals.service.js` — `:130-429` (`calculateProgressFromTasks`, `calculateProgress`, `attachProgress`, `getGoalOrThrow`, validadores, `listGoals`, `getGoalById`, `createGoal`)
- `backend/src/services/planner.plans.v1.service.js` — `:1-130`, `:380-579`
- `backend/src/services/planner.plans.service.js` — `:180-299`
- `backend/src/controllers/planner.plans.controller.js` — `:80-189`
- `backend/src/services/planner.trash.service.js` — `:2,6,35,63-69,88-89,119-139,158,190-195`
- `backend/src/services/planner.search.service.js` — `:217,231,245`
- `backend/src/services/planner.attention.service.js` — `:128,142,179,193,233,264,297,309`
- `backend/src/services/planner.summary.service.js` — `:301,337,373`
- `backend/src/lib/plannerMutationContracts.js` — `:1-26` (completo)
- `backend/src/lib/plannerIdempotencyAdapter.js` — `:1-232` (V0), `:282-325` (V2)
- `backend/src/lib/mutationContracts.js` — `:1-135`

**Migraciones**
- `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql` — `:180-210` (requirements/external), `:279-281` (índice único external), `:491-577` (satisfacción), `:975-1044` (transiciones + gates activate/complete)

### 14.2 Runtime read-only (todas con `SET LOCAL default_transaction_read_only = on`)

- Contos de 13 tablas del dominio + `schema_migrations = 112`
- Búsqueda de `__QA_PLANS_CREATE_TRACE_20261003__` en ambas tablas → 0 filas
- Fila completa de `planner_goals` (`22f53d7f-…`)
- `planner_tasks.goal_id` no nulo → 0 de 3
- `LEFT JOIN planner_goals → planner_plans` → `exists_in_plans = false`
- `read_planner_plan_graph_rpc('22f53d7f-…') IS NULL` → `true`
- `planner_activity_log` (1 fila)
- `information_schema.columns` de `planner_goals` (28) y `planner_plans` (25)
- `pg_constraint`: 10 CHECK + 3 FK en `planner_goals`; 8 CHECK + 6 FK en `planner_plans`; 6 FK hacia `planner_plans`; 18 FK en `planner_tasks` (incl. `planner_tasks_goal_id_fkey → planner_goals(id) ON DELETE SET NULL`); 8 CHECK en `planner_plan_requirements`; 7 CHECK en `planner_plan_measurements`; 5 índices únicos en `planner_plan_requirements`
- `pg_trigger` de ambas raíz (3 y 1)
- `pg_policies` de `planner_goals` (3) y `planner_plans` (1)
- `pg_class.relacl` / `relrowsecurity` / `relforcerowsecurity` de 4 tablas
- `pg_proc.prosrc` de `planner_goals_sync_status_from_lifecycle` y `planner_goal_project_status`
- `pg_get_viewdef` de `planner_plan_indicators` y `planner_legacy_goal_plan_projection`
- Columnas de `planner_plan_measurements` (15), `planner_plan_measurement_history` (10), `planner_plan_requirements` (18), `planner_plan_milestones` (17), `planner_plan_operations` (18), `planner_goal_milestones` (13), `planner_plan_legacy_goal_links` (5), `planner_activity_log` (11), `planner_tasks` (39)
- `classification` presente en 4 tablas
- `planner_events`: 0 columnas `plan*`/`goal*`
- Conteos de las 26 tablas `planner_*` (`planner_idempotency_keys = 11`, `planner_task_fulfillments = 3`, `planner_task_assignment_configs = 3`)

### 14.3 Runtime de procesos/puertos (OS, no DB)

- `Get-CimInstance Win32_Process` (PIDs 3076, 26464, 29676, 2748, 18104, 8296, 26904, 3392)
- `Get-NetTCPConnection -State Listen` (`8081`, `3001`, `8443`, `8085`, `8086`, `56221`-`56227`)
- `docker ps` (10 contenedores `supabase_*_HomePlus`)
- `Get-NetIPAddress -AddressFamily IPv4` (`192.168.0.26` = LAN de esta máquina; `100.81.185.53` = Tailscale)
- `LastAccessTime` de 7 archivos backend en 2 worktrees
- `Get-Process -Id 2748 | Select StartTime` → `2026-10-03T18:12:22`
- `[System.Net.Dns]::GetHostAddresses` de los 2 hostnames `trycloudflare.com` → `Host desconocido`
- `GET /health`, `GET /` en `127.0.0.1:3001`; `GET` a los 2 hostnames de tunnel

### 14.4 Secondary (no re-leído línea a línea en esta sesión)

- `PLANS_CAPABILITY_MAP_CURRENT_V1.md §5.1` (matriz `goal.create_household` por rol) — citado por referencia, **no re-derivado** de `plannerCapabilities.js` en esta sesión
- Resto de `planner.goals.service.js` (líneas 430-1170), resto de `planner.plans.service.js` (1-179, 300-373), resto de `planner.plans.v1.service.js` (131-379, 580-706), resto de `planner.goals.controller.js` (131-485) — citados por rangos, no re-leídos
- `supabase/migrations/20260722090002_*`, `20260722049000_*`, `20260908000001_*`, `20260908000002_*` — citados vía el Capability Map / Discovery, marcados como carry-over

---

## 15. VEREDICT FINAL — CREATE TRACE

```
SAFE LOCAL QA WRITE:          NO
RUNTIME WRITE BLOCKED — ENVIRONMENT NOT PROVEN LOCAL
CREATE REQUEST SENT:          NO
HTTP STATUS:                  NOT OBSERVED (static prediction: 201)
ROW CREATED:                  NO
TABLE:                        NONE
ID:                           NONE
POST-CREATE ROUTE:            'GoalDetail'  (= ROUTE_NAMES.PlanDetail)
DETAIL TABLE:                 planner_plans  (vía read_planner_plan_graph_rpc)
ERROR BEFORE/AFTER INSERT:    AFTER INSERT  (STATIC CONFIRMED; no RUNTIME REPRODUCED)
PRIMARY FAILURE CLASS:        F10 — CROSS-ID TABLE READ
CONTRIBUTING CLASS:           F9 — INSERT SUCCESS + WRONG NAVIGATION
CROSS-ID BUG REPRODUCED:      NOT REPRODUCED (write blocked);
                               precondition RUNTIME READ-ONLY VERIFIED
MIGRATION REQUIRED BY THIS BUG: NOT ENOUGH EVIDENCE
```

### Preguntas obligatorias de A7

| Pregunta | Respuesta |
|---|---|
| ¿El Plan se creó realmente? | **UNKNOWN (no reproducido).** No hay INSERT ejecutado. Estáticamente, el POST **no tiene defecto que lo rechace** y su destino es `planner_goals`; por tanto es **probable** que se cree — pero "probable" no es evidencia. |
| ¿En qué tabla? | **`planner_goals`** (`STATIC CONFIRMED`, `planner.goals.service.js:405-409`). `planner_plans`: ningún writer alcanzable desde la UI (`STATIC CONFIRMED`, §3.13). |
| ¿El error visible ocurre antes o después del INSERT? | **AFTER INSERT** (`STATIC CONFIRMED`). El `404` del detalle sólo puede ocurrir con un id ya existente; y `read_planner_plan_graph_rpc(<goals id>) IS NULL` está `RUNTIME READ-ONLY VERIFIED`. |
| ¿El ID creado se vuelve a consultar contra la misma tabla? | **NO** (`STATIC CONFIRMED`). `planner_goals.id` → lector de `planner_plans`. |
| ¿Existe cross-table ID bug en ESTE flujo reproducido? | **NOT REPRODUCED** (write blocked). La **precondición** sí está probada en runtime: el id real de `planner_goals` no existe en `planner_plans` y la RPC devuelve `NULL`. Estructuralmente el bug es `STATIC CONFIRMED` en 4 sitios (§3.12). |
| ¿El problema requiere migration? | **NOT ENOUGH EVIDENCE.** No se encontró defecto de esquema. El defecto es de binding ruta→tabla. Que existan dos tablas habilita el bug; no lo exige. |

---

*Fin de PLANS_CREATE_FAILURE_TRACE_V1. Ningún código modificado. Ninguna fila escrita. Ninguna migración escrita. Esperar revisión humana.*
