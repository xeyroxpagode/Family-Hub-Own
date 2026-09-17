# Planner V1 Domain Reconciliation Audit

Estado: auditoria parcial. Solo se completa la seccion A.

Rango auditado:

- V1 funcional historica: `f093bffaa7a7db6db7fc1b0072ba90352325a90a`.
- Current WIP: `9369893d568645739ce9c3acd2952e87b810e1fe`.
- Rama: `planner-v1-domain-reconciliation-audit`.

Restricciones aplicadas:

- No se implemento codigo.
- No se corrigieron dominios.
- No se modificaron migraciones.
- No se ejecuto Supabase.
- No se reviso el UX completo de Task, Event o Plan.

## A. Shared - estado comparativo

### Alcance

Esta seccion audita Shared / Reliability / Sheet / Idempotency. El objetivo es definir que se debe conservar, restaurar, reimplementar o validar antes de abrir los carriles completos de Tasks, Events, Plans o Presets/Drafts.

Fuentes principales:

- `docs/implementation/planner/PLANNER_V1_V1_TO_CURRENT_DELTA_INVENTORY.md`.
- `docs/implementation/planner/PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`.
- `docs/implementation/planner/PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md`.
- `docs/implementation/planner/PLANNER_V1_MIGRATION_LEDGER.md`.
- Reports existentes de Reliability e Integration, especialmente `M11_SHARED_IDEMPOTENCY_RESOLUTION_REPORT.md`, `M11_INT_01_PHASE_2_R2_CORRECTION_REPORT.md`, `M11_INT_01_PHASE_2_R2C_INDEPENDENT_REAUDIT.md`, `M11_7A_RELIABILITY_DURABLE_OPERATION_FOUNDATION_REPORT.md`.

Archivos inspeccionados:

- `backend/src/lib/mutationContracts.js`.
- `backend/src/lib/plannerMutationContracts.js`.
- `backend/src/lib/plannerIdempotencyAdapter.js`.
- `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx`.
- `front/mi-front-limpio/context/PlannerSheetContext.tsx`.
- `front/mi-front-limpio/services/planner/plannerMutationIntent.ts`.
- `front/mi-front-limpio/services/planner/plannerPayloadFilter.ts`.
- `front/mi-front-limpio/services/planner/plannerSheetState.ts`.
- `front/mi-front-limpio/services/planner/reliability/*`.
- `supabase/migrations/20260722090000_m11_int_01_shared_mutation_authority_foundation.sql`.
- `supabase/migrations/20260803120000_planner_v2_reserve_idempotency_mutation_dedupe.sql`.

### A.1 Matriz V1 vs Current

| Componente | V1 | Current WIP | Contrato esperado | Mejora post-V1 valida | Regresion observada | Dependencias | Decision |
|---|---|---|---|---|---|---|---|
| 1. Mutation identity | `plannerMutationIntent.ts` generaba `mutationId` estable por intento. Backend exigia `X-Mutation-Id` para create/versioned. | Se conserva el contrato. Reliability agrega `localOperationId` derivado de `mutationId`, `idempotencyKey` y `requestHash`. Backend V2 tambien persiste `mutation_id`. | La autoridad de identidad de intento en cliente es `PlannerMutationIntent`. La autoridad durable en servidor es la fila de `planner_idempotency_keys` con `mutation_id` ligado a actor/scope/operation/key/hash. | `planner_idempotency_keys_mutation_uidx` y V2 binding detectan reuse peligroso de `mutation_id`. | La migracion base V2 deja que un mismo `mutation_id` choque con el indice unico y puede terminar como `23505`/500 antes del fix 20260803120000. | Tasks, Events, Plans, Presets/Drafts consumen la misma identidad para retry/replay/audit. | `KEEP_CURRENT` + `NEEDS_DB_VALIDATION` para 20260803120000. |
| 2. Idempotency key | Create y versioned mutation usaban `Idempotency-Key`; V0 `withIdempotency` permitia missing key como rollout. | Se conserva y se agrega identidad V2 `(actor_person_id, scope_type, scope_id, operation, idempotency_key)`. Productive reliability puede recordar `mutationId` por `idempotencyKey`. | El key canonico viene del intent y debe ser estable hasta exito, conflicto terminal o descarte explicito. No debe regenerarse por timeout ni por retry. | Personal scope ya no necesita household falso: `scope_id = actor_person_id`. | La frontera productiva todavia mezcla V0 HTTP con runtime frontend; no hay RPCs atomicos operation-specific en allowlist. | Todos los dominios. | `REIMPLEMENT_CURRENT_CONTRACT`. |
| 3. Request hash | V1 legacy hash cubria `method`, `operation`, sorted `params`, sorted `body`, `expected_version`. | Current mantiene legacy hash y agrega `hashIdempotencyRequestV2` con operation/scope/target/payload/expected/mutation. SQL tiene `planner_canonical_request_hash_v2`. | Backend debe recomputar hash canonico desde argumentos normalizados. JS y SQL deben coincidir para objetos, arrays, null y caracteres escapados. | R2C corrige canonicalizacion de objetos dentro de arrays y conserva V0 hashes. | Dos semanticas conviven: V0 legacy no recurre arrays como V2; el runtime local usa FNV-1a y no SHA-256. Es aceptable solo si se mantiene como identidad local, no como autoridad DB. | Shared y todos los dominios. | `KEEP_CURRENT`. |
| 4. Reserve / complete / replay | V1 usa `reserve_planner_idempotency_key` y `complete_planner_idempotency_key` separados del dominio. Replays devuelven status/body guardado. | Current agrega helpers privados V2 reserve/complete/recover y frontera `invokeAtomicPlannerMutationV2`, pero el allowlist V2 esta vacio. Legacy V0 sigue disponible. | Nuevas mutaciones deben ser RPCs atomicos: auth/scope/capability, reserve/replay, version/business, mutate, audit y complete en una transaccion. | `planner_v2_reserve_idempotency`, `planner_v2_complete_idempotency`, `planner_v2_recover_idempotency` definen estado `in_flight`, `completed`, `failed_stable`, `abandoned`. | Si los dominios siguen usando legacy reserve separado, quedan ventanas de respuesta perdida y filas `in_flight` persistidas fuera de la transaccion efectiva. | Tasks/Events deben portar RPCs; Plans/Presets/Drafts no deben crear mecanismo paralelo. | `SHARED_BLOCKER`. |
| 5. Lost response | V1 podia tener dominio exitoso pero completion fallida o respuesta HTTP perdida; el retry dependia de haber guardado el response. | Current V2 pretende resolverlo atomizando effect/audit/completion. Runtime marca abort/timeout como ambiguo y conserva operacion para retry. | Si DB commit fue exitoso, retry exacto debe replayar el resultado canonico sin duplicar effect/audit. Si commit no fue exitoso, retry debe ejecutar una sola vez. | `recoverPersistedPlannerOperation` marca in-flight local como `uncertain`. V2 recovery tiene `effect_proven`, `no_effect_proven`, `ambiguous`. | Mientras el dominio no consuma RPC atomico V2, la garantia existe como contrato/fundacion, no como comportamiento universal. | Todos. | `REIMPLEMENT_CURRENT_CONTRACT`. |
| 6. Retries | V1 reutilizaba intent en el form, pero no habia runtime durable compartido. | Current runtime encola, guarda, rehidrata, hace retry con backoff y jitter, y respeta `Retry-After`. | Retry debe reutilizar `mutationId`, `idempotencyKey`, expected version y payload normalizado. No puede duplicar entidad, auditoria, recurrencia ni hijos. | `DEFAULT_PLANNER_RETRY_POLICY`: 5 intentos, base 1s, max 60s, jitter 0.2. | Runtime puede quedar indisponible (`planner_reliability_runtime_unavailable`) si no se inicializo para la sesion/scope antes del submit. | Tasks/Events/Plans/Presets/Drafts dependen de inicializacion Shared. | `KEEP_CURRENT` + `SHARED_BLOCKER` para wiring. |
| 7. Error classification | V1 backend tenia codigos shared basicos y legacy `idempotency_key_conflict`; V1 frontend no tenia classifier reliability. | Current agrega canonical codes backend y classifier frontend. `ApiError` se clasifica en retryable, terminal, conflict, auth, validation o uncertain. | Terminales: validation, auth, not_found, version_conflict, idempotency_conflict, retry_exhausted/manual review. Reintentables: network, 408/timeout ambiguous, 429, 5xx, unknown retryable. | Se normalizan `version_conflict_v2`, `idempotency_conflict`, `idempotency_in_flight`; 5xx no se persisten como replay estable. | `errorClassifier.ts` clasifica todo HTTP 409 como `idempotency_conflict`, lo cual puede mezclar `idempotency_in_flight` con conflicto terminal si no se revisa por `code`. | Todos los dominios que expongan 409 no-idempotency. | `PORT_OLD_LOGIC` no; `REIMPLEMENT_CURRENT_CONTRACT` con ajuste de clasificacion. |
| 8. Planner Reliability runtime | No existia en V1. | `runtime.ts` mantiene `activeRuntimes`, inicia con `openPlannerReliabilityRuntime*`, restaura store, scheduler y realtime; destruye en `disposePlannerReliabilityRuntimes`. Lifecycle se registra en import con session/household cleanup. | El runtime lo inicializa Shared al resolver auth + household, y lo destruyen los lifecycle bindings de session/household. Un solo runtime activo por scope. | Runtime nuevo cubre queue durable, scheduler, retry, reconciliation e invalidacion. | Debe validarse que todos los entrypoints productivos abran runtime antes de submit. El contrato existe pero es un blocker si PlannerScreen/surfaces no lo inicializan para scope personal/household. | Todos. | `KEEP_CURRENT` + `SHARED_BLOCKER`. |
| 9. Auth y household scope | V1 dependia principalmente de household/member en idempotency legacy. | Current V2 define `actor_account_id`, `actor_person_id`, `scope_type`, `scope_id`; personal permite `household_id = null`. | Personal: `scope_type=personal`, `scope_id=actor_person_id`, `household_id=null`, `actor_membership_id=null`. Household: `scope_type=household`, `scope_id=household_id`, membership como autorizacion/audit actual. | Migration 20260722090000 relaja `household_id` y `actor_member_id` en idempotency, extiende audit personal. | Frontend runtime usa `activeHouseholdId ?? null` y owner local `authenticatedUserId`, no necesariamente `person_id`; requiere alineacion con backend person identity en dominio. | Events personal, Plans personal, Tasks personal si se habilita, Presets/Drafts privados. | `REIMPLEMENT_CURRENT_CONTRACT`. |
| 10. PlannerSheet lifecycle | V1 reducer bloqueaba close mientras submit y exigia matching `activeIntentId`. | Current conserva reducer y agrega `plan_form`. Host corrige submit end con `createMutationId`. | El sheet cierra despues de exito terminal confirmado/replayed/noop y submit lock liberado con el mismo intent. Debe quedar abierto ante resultado incierto, pending, retrying o conflict que requiere accion. | Fix current elimina el bug `SUBMIT_END` stale para task/event/goal. | La V1 historica tenia bug confirmado: `sheet.endSubmit('task_intent')`/`event_intent`/`goal_intent` no matcheaba `mutationId`, dejaba `isSubmitting` pegado y reenvios con misma identidad. | Tasks/Events/Plans forms. | `KEEP_CURRENT`. |
| 11. Submit / close / stale intent | V1 `beginSubmit` recibia intent real desde form, pero `onSaved` usaba constantes hardcodeadas. | Current `TaskFormHost` y `EventFormHost` llaman `sheet.endSubmit(createMutationId)` antes de `requestClose('success')`; `PlanFormHost` usa intent local. | `SUBMIT_END` stale debe ignorarse; eso es correcto. El host debe enviar el intent real. | Documentacion inline registra el bug Android observado: POST 201 + submit_succeeded + sheet abierto. | Si `createMutationId` fuera null en create no se libera el lock; el caso normal lo setea en ref al abrir. | Task/Event/Plan. | `KEEP_CURRENT`. |
| 12. Payload normalization | V1 no tenia `plannerPayloadFilter.ts`. | Current agrega `omitUndefinedPlannerPayloadProperties` para borrar props `undefined` antes de Reliability. | Ausencia de campo opcional debe omitirse. `null` debe usarse solo cuando el contrato quiere borrar/representar ausencia explicita. | Evita `planner_reliability_undefined_hash_property` antes de red. | El filtro es superficial; no elimina `undefined` anidados. Esto es correcto si los builders solo generan undefined top-level, pero debe validarse por dominio. | Task/Event payload builders, Plans graph, Presets/Drafts. | `KEEP_CURRENT` + `DOMAIN_OWNED` para payloads anidados. |
| 13. Null y undefined | V1 legacy JSON stringify omitia undefined implicitamente y preservaba null. | Current V2 SQL/JS omite null-valued object properties para hash V2, mientras runtime local rechaza undefined y preserva null en stableStringify. | Optional absent: omitir propiedad. Explicit clear: usar `null` si el DTO/RPC lo permite. Arrays no deben contener holes ni undefined. | SQL/JS V2 hash parity cubre null property/null array. | Riesgo de drift: `hashIdempotencyRequestV2` strippea null object properties; runtime local incluye null en FNV. Si el local hash solo identifica pending operation, no es autoridad DB. | Todos. | `KEEP_CURRENT` + `NEEDS_DB_VALIDATION`. |
| 14. Cache invalidation y reconciliation | V1 host hacia invalidacion dirigida al cerrar submit. No habia reconciliation runtime. | Current mantiene invalidacion dirigida en Host y agrega `reconcile()` por adapter, realtime bridge e invalidacion por domain en productive adapters. | Reconciliation debe correr solo despues de resultado confirmatorio (`created`, `updated`, `noop`, `replay`) y no despues de resultado incierto. | Current invalida tasks/events/plans por domain/action/entity y soporta cleanup de operaciones confirmadas despues de retention. | Doble invalidacion posible: Host invalida en `onSaved` y adapter invalida al reconciliar. No es funcionalmente incorrecto, pero puede generar refetch redundante. Personal scope no invalida por `plannerCache` household. | Todos; personal/private requiere tratamiento especifico por dominio. | `KEEP_CURRENT` con seguimiento `DOMAIN_OWNED`. |

### A.2 Contrato canonico recomendado

Autoridad unica de identidad:

- En frontend, la autoridad de intento es `PlannerMutationIntent`.
- En transporte, `X-Mutation-Id` y `Idempotency-Key` son obligatorios para create/versioned segun `OPERATION_KINDS`.
- En backend, la autoridad durable es `planner_idempotency_keys` con identidad `(actor_person_id, scope_type, scope_id, operation, idempotency_key)` y binding adicional de `mutation_id`, `operation_class`, `payload_hash`, `actor_account_id`.
- `audit_events` no es replay store.

Respuesta de exact replay:

- Exact replay = mismo actor/person, scope, operation, idempotency key, mutation id y payload hash.
- Si la fila esta `completed` o `failed_stable`, debe devolver el `response_status` y `response_body` guardados con outcome `replay` o equivalente publico.
- No debe reejecutar dominio, auditoria, recurrencia, hijos ni cache side effects persistentes.
- Debe revalidar auth, visibilidad y autoridad actual antes de entregar datos guardados, segun Shared Contracts.

Misma identidad con payload diferente:

- Debe responder `409 idempotency_conflict`.
- Nunca debe reemplazar la fila ni mutar payload/mutation binding.
- Nunca debe exponer SQLSTATE, constraint, hint ni detalles internos.

Por que un `23505` llego a 500:

- `20260722090000` creo `planner_idempotency_keys_mutation_uidx` sobre `mutation_id`.
- `planner_v2_reserve_idempotency` arbitraba primero por `(actor_person_id, scope_type, scope_id, operation, idempotency_key)`.
- Si un retry llegaba con el mismo `mutation_id` pero otro key/scope/operation antes de la lectura por identidad V2, el `INSERT` chocaba directamente contra el indice unico de `mutation_id`.
- Ese `23505` no estaba convertido a `P0008`/`idempotency_conflict`, por lo que se propagaba como error interno 500.
- `20260803120000` intercepta `mutation_id` antes del insert y mapea exact replay/in-flight/reclaim/conflict sin raw `23505`.

Errores terminales vs reintentables:

- Terminales: `idempotency_conflict`, `version_conflict_v2`, validation 400/422, authorization 401/403, not_found 404, invalid transition/lifecycle, retry exhausted/manual review, ambiguous recovery que requiere revision.
- Reintentables: network status 0, abort/timeout ambiguous, HTTP 408, 429 con `Retry-After`, HTTP 5xx, unknown retryable transport.
- Persistibles como `failed_stable`: 4xx/412 deterministas post-autorizacion y allowlisted. 5xx nunca debe persistirse como replay estable.
- `idempotency_in_flight` debe ser tratado como wait/retry, no como conflicto terminal.

Sheet success vs uncertain:

- Cerrar sheet despues de exito solo si el resultado es confirmado: `created`, `updated`, `noop` o `replay`, con submit lock liberado por el mismo `intentId`.
- Conservar abierto si el resultado es incierto, pending/retrying, runtime unavailable, timeout ambiguous, conflict revisable o validacion que requiere accion del usuario.
- Si el runtime informa operacion conservada para reintento, el sheet no debe presentarse como exito definitivo.

Inicializacion y destruccion del runtime:

- `openPlannerReliabilityRuntimeForSession` resuelve `accessToken`, `authenticatedUserId` y `activeHouseholdId`.
- `openPlannerReliabilityRuntime` instala lifecycle bindings, cierra runtimes previos de otro scope, crea `PlannerReliabilityRuntime`, lo guarda en `activeRuntimes` y llama `start()`.
- `start()` restaura store, arranca scheduler si online y emite reconciliation request.
- `disposePlannerReliabilityRuntimes` y `runtime.dispose()` destruyen scheduler/connectivity y limpian `activeRuntimes`.
- `installPlannerReliabilityLifecycleBindings` se registra en session cleanup y household beforeSwitch, y se invoca al importar `runtime.ts`.

Scope personal con `household_id = null`:

- En DB: `scope_type='personal'`, `scope_id=actor_person_id`, `household_id=null`, `actor_member_id=null`, `actor_person_id=current_person_id()`, `actor_account_id=auth.uid()`.
- En audit: `household_id=null`, `actor_membership_id=null`, `actor_person_id=current_person_id()`, `scope_type='personal'`, `scope_id=actor_person_id`.
- No se debe emular personal como household ni exigir membership para scope personal.

Propiedades opcionales, `null` y `undefined`:

- Campos opcionales ausentes deben omitirse.
- `undefined` no debe entrar en Reliability ni en hash material.
- `null` debe reservarse para clear/ausencia explicita cuando el DTO/RPC lo declare.
- Arrays no deben tener holes ni `undefined`.
- Cada dominio debe normalizar su payload antes de encolar.

### A.3 Regresiones confirmadas

1. Sheet lock stale en V1 historica: `PlannerSheetHost.tsx` llamaba `sheet.endSubmit('task_intent')`, `sheet.endSubmit('event_intent')` y `sheet.endSubmit('goal_intent')` despues de iniciar submit con el `mutationId` real. Resultado: `SUBMIT_END` stale, `isSubmitting` pegado, sheet abierto despues de 201 y reenvio del mismo `mutation_id`. Current corrige con `sheet.endSubmit(createMutationId)`. Decision: `KEEP_CURRENT`.

2. `23505` convertido en 500 en V2 reserve base: `20260722090000` no intercepta reuse de `mutation_id` antes del insert. El unique index de `mutation_id` puede tirar `23505`, que no es una respuesta canonica publica. `20260803120000` corrige el helper para convertir exact replay/in-flight/reclaim/conflict antes del insert. Decision: `KEEP_CURRENT` para la intencion, `NEEDS_DB_VALIDATION` para conservar o plegar el fix.

3. Runtime reliability net-new no presente en V1: esto no es regresion de V1, pero es blocker compartido si no se inicializa antes de los submits productivos. Decision: `SHARED_BLOCKER`.

4. `idempotency_in_flight` puede clasificarse como conflicto terminal por la regla frontend `status === 409 || code === 'idempotency_conflict'`. Debe priorizar `code === 'idempotency_in_flight'` como retry/wait. Decision: `REIMPLEMENT_CURRENT_CONTRACT`.

5. Payload `undefined` rompia hashing local. Current agrega filtro top-level. Decision: `KEEP_CURRENT`, con ownership por dominio para payloads anidados.

### A.4 Decision sobre migraciones

`20260722090000_m11_int_01_shared_mutation_authority_foundation.sql`:

- Decision: `KEEP_CURRENT` + `NEEDS_DB_VALIDATION`.
- Motivo: es la foundation Integration-owned correcta para actor/scope, personal audit, V2 identity, private helpers, recovery y grants parciales.
- Riesgo: conserva legacy reserve/complete y direct INSERT/UPDATE durante ventana de compatibilidad. No es final authority sin domain RPCs y lockdown posterior.

`20260803120000_planner_v2_reserve_idempotency_mutation_dedupe.sql`:

- Decision: `NEEDS_DB_VALIDATION`; conservar semanticamente, pero revisar si debe mantenerse como migracion separada, plegarse a la foundation antes de integrar oficialmente, o reemplazarse por una R2/R3 Integration-owned corregida.
- Motivo: corrige un bug real de `23505`/500 interceptando `mutation_id` antes de insert y retornando replay/in-flight/reclaim/conflict seguro.
- Restriccion: no debe desplegarse remotamente ni validarse con Supabase en esta auditoria.
- Ownership: Integration/Shared, no dominio.

No se debe crear migracion nueva en esta etapa.

### A.5 Ownership de archivos

Integration / Shared:

- `backend/src/lib/mutationContracts.js`: autoridad de headers, operation kinds, expected version, codigos canonicos.
- `backend/src/lib/plannerMutationContracts.js`: bridge Planner temporal hacia Core; retirar solo cuando controladores consuman Core directo.
- `backend/src/lib/plannerIdempotencyAdapter.js`: legacy V0 adapter, V2 hash, V2 atomic frontier, V2 RPC error mapping.
- `supabase/migrations/20260722090000_m11_int_01_shared_mutation_authority_foundation.sql`.
- `supabase/migrations/20260803120000_planner_v2_reserve_idempotency_mutation_dedupe.sql` hasta decidir si se conserva/plega/reemplaza.
- `front/mi-front-limpio/services/planner/plannerMutationIntent.ts` como shared frontend identity bridge.
- `front/mi-front-limpio/services/planner/plannerPayloadFilter.ts` como helper shared minimo; dominios deciden donde aplicarlo.
- `front/mi-front-limpio/services/planner/reliability/*` como Reliability shared runtime.

Shared UI / Shell:

- `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx`.
- `front/mi-front-limpio/context/PlannerSheetContext.tsx`.
- `front/mi-front-limpio/services/planner/plannerSheetState.ts`.

Domain-owned call sites:

- Tasks: payload builders, create/update/lifecycle handlers, Task-specific adapters and RPCs.
- Events: payload builders, all-day/timed normalization, Event/participant/occurrence adapters and RPCs.
- Plans: graph write requests, structure changesets, lifecycle requests and Plan RPCs.
- Presets/Drafts: private/personal payloads, autosave supersession, preset revision flows.

### A.6 Dependencias por dominio

Tasks:

- Depende de mutation identity, idempotency, expected version, runtime ready, payload `undefined` filtering, error classifier y exact replay.
- Task fulfillment/recurrence necesita exactamente una ejecucion efectiva por retry.
- Decision: los arreglos de Shared deben completarse antes de auditar/corregir Tasks en profundidad. Clasificacion: `SHARED_BLOCKER` para identity/replay/runtime; `DOMAIN_OWNED` para payloads/task RPCs.

Events:

- Depende de personal scope real sin fake household, all-day payload normalization, recurrence/occurrence idempotency, retry/lost response y participant writes.
- Decision: Events no debe implementar replay propio ni audit-ledger como idempotency store. Clasificacion: `SHARED_BLOCKER` para personal idempotency; `DOMAIN_OWNED` para Event-specific RPCs/payloads.

Plans:

- Depende de runtime, graph writes, structure changesets, cache reconciliation y plan lifecycle terminal/uncertain results.
- `PlanFormHost` es net-new current. No existia en V1.
- Decision: no auditar UX completo todavia. Clasificacion: `DOMAIN_OWNED` para graph/lifecycle semantics; `SHARED_BLOCKER` para runtime/result contract.

Presets/Drafts:

- Depende de private/personal scope, runtime durable, autosave supersession, retries y draft discard/trash decision congelada por Functional Freeze.
- Decision: no abrir carril todavia. Clasificacion: `DOMAIN_OWNED` para draft/preset semantics; `SHARED_BLOCKER` para identity/scope/runtime.

### A.7 Plan de implementacion Shared

No autorizado para implementar en esta auditoria. Plan propuesto en tres mini-lotes maximos:

S1. identidad, idempotencia y replay:

- Definir y congelar en codigo/tests la autoridad unica: intent frontend, headers Core, V2 DB row.
- Decidir si `20260803120000` se conserva como migracion separada, se pliega a `20260722090000` antes del gate, o se reemplaza por una correccion Integration-owned equivalente.
- Asegurar que exact replay, same identity/different payload, `idempotency_in_flight`, `failed_stable` y raw `23505` tengan respuestas canonicas.
- Mantener `V2_RPC_ALLOWLIST` cerrado hasta que existan RPCs operation-specific revisadas.

S2. runtime, sheet y resultado terminal:

- Verificar que Planner inicializa `openPlannerReliabilityRuntimeForSession` para scope household y personal antes de submits productivos.
- Conservar fix de `PlannerSheetHost` que libera con el `mutationId` real.
- Definir contrato comun para cerrar sheet solo con resultado confirmado/replay/noop y mantener abierto ante uncertain/pending/conflict.
- Reducir doble invalidacion si se confirma que Host + adapter generan refetch redundante, sin cambiar comportamiento productivo.

S3. payload, errores, retry y validacion DB:

- Aplicar normalizacion de payload por dominio: omitir `undefined`, usar `null` solo para clear explicito, validar arrays sin holes.
- Ajustar classifier para tratar `idempotency_in_flight` como retry/wait y no como conflicto terminal.
- Confirmar terminales vs reintentables en tests shared frontend/backend.
- Validar DB solo en carril autorizado: hash parity, migration list, grants, reserve replay/conflict, no `23505` publico, personal scope con `household_id null`.

## Preguntas cerradas

1. Autoridad unica de `mutation_id` e idempotency key: `PlannerMutationIntent` en frontend, `X-Mutation-Id`/`Idempotency-Key` en transporte, `planner_idempotency_keys` V2 en backend. No `audit_events`.

2. Exact replay: devolver status/body guardado y outcome replay/noop equivalente, sin reejecutar dominio ni audit, despues de revalidar autoridad/visibilidad.

3. Misma identidad y payload diferente: `409 idempotency_conflict`, sin modificar fila existente y sin raw SQL.

4. `23505` a 500: el indice unico `mutation_id` podia chocar antes de la lectura/arbitraje por identidad V2; no habia mapping especifico. `20260803120000` lo intercepta.

5. Terminales/reintentables: terminales son conflicts/version/auth/validation/not_found/business final/manual review; reintentables son network/timeout/429/5xx/unknown retryable. `idempotency_in_flight` es wait/retry.

6. Cierre de sheet despues de exito: solo tras resultado confirmado `created`/`updated`/`noop`/`replay` y submit end con intent real.

7. Sheet abierto por resultado incierto: runtime unavailable, timeout ambiguous, pending/retrying, conflict revisable, validation visible o manual review.

8. Inicializacion/destruccion runtime: `openPlannerReliabilityRuntime*` inicializa; `disposePlannerReliabilityRuntimes`, `dispose()` y lifecycle session/household destruyen.

9. Scope personal: `scope_type=personal`, `scope_id=actor_person_id`, `household_id=null`, no membership.

10. Opcionales/null: opcionales ausentes se omiten; `undefined` prohibido; `null` solo si el contrato lo usa para clear/ausencia explicita.

11. Migracion 20260803120000: conservar semanticamente el fix, pero requiere decision Integration y validacion DB sobre si queda separada, plegada o reemplazada.

12. Shared vs dominio: Shared posee identity, idempotency, replay, runtime, sheet state, error classifier base, payload helper y migrations shared. Dominios poseen payload builders, RPCs operation-specific, lifecycle/business rules y adapters.

## Estado final de esta seccion

Clasificacion global A:

- `KEEP_CURRENT` para mutation contracts, sheet fix, payload filter, runtime foundation y V2 hash parity.
- `REIMPLEMENT_CURRENT_CONTRACT` para consumo atomico V2 por dominios y clasificacion `idempotency_in_flight`.
- `SHARED_BLOCKER` para reserve/complete/replay atomico, runtime readiness y migration decision.
- `DOMAIN_OWNED` para payloads profundos y operation-specific RPCs.
- `NEEDS_DB_VALIDATION` para migraciones y scope personal DB.

Veredicto A:

```text
PLANNER_SHARED_RECONCILIATION_AUDIT_COMPLETE
```
