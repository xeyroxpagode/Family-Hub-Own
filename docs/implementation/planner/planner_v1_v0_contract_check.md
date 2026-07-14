# Planner V1 — verificación de contratos V0

Auditado contra rama `v1`, commit `a9d869b5755a90188dd8b964506251e56af74632`, el 2026-07-14. Resultado global: **V0 CONTRACT GATE FAILED**.

## 1. Resumen

| Clasificación | Cantidad |
|---|---:|
| AVAILABLE | 2 |
| PARTIAL | 12 |
| MISSING | 3 |
| RUNTIME_REQUIRED | 0 |
| Total | 17 |

La clasificación es del contrato deployable que V1 necesita, no sólo de archivos locales. Por eso version/idempotency/migraciones son `PARTIAL`: existen y pasan en local, pero la lista remota no contiene sus migraciones Planner.

## 2. Matriz contractual

### V0-C01 — identidad canónica: AVAILABLE

- `backend/src/services/planner/planner.context.service.js` resuelve y entrega `userId`, `householdId`, `membershipId`.
- `docs/implementation/planner/PLANNER_V0_CONTRACT.md` declara `membershipId` como actor canónico.
- No se observó que V1 necesite un alias adicional.

**Uso V1 permitido:** ownership/assignment/participación por membership ID.

### V0-C02 — hogar activo y contexto server-side: AVAILABLE

- `resolvePlannerContext` deriva hogar activo desde la identidad autenticada y valida membresía activa.
- Los routers Planner aplican auth/context antes de servicios.

**Uso V1 permitido:** endpoints scoped sin confiar en `householdId` enviado por el cliente.

### V0-C03 — membresía/capabilities: PARTIAL

- Membresía y `role` existen.
- `backend/src/lib/householdPermissions.js` expone el permiso de invitación mediante config `invite_members`; la respuesta family publica `current_member.can_invite`. Este permiso pertenece al dominio Household y no es contrato requerido por Planner V1: Quick Actions V1 filtra exclusivamente por capabilities Task/Event/Goal.
- No se encontró ninguno de los nombres normativos `planner.view`, `planner.search`, `task.*`, `event.*`, `goal.*`, `planner.templates.*`, `planner.audit.view` o `planner.settings.manage` en código de enforcement/proyección.
- Los servicios Planner no verifican capabilities; derivarlas de `role` en V1 sería un workaround.

**Falta:** proyección pública y enforcement server-side de la lista normativa completa (Task/Event/Goal). Invite queda fuera del alcance de Quick Actions V1.

### V0-C04 — errores tipados: PARTIAL

- Los controladores Planner usan `code` y status en varios caminos.
- La forma observada es plana, normalmente `{ error, code }`; no coincide de manera uniforme con el envelope normativo.
- `front/mi-front-limpio/src/services/api.ts` normaliza sólo una parte de statuses y no conserva un `request_id` canónico en todos los errores.

**Falta:** schema único, 422/429, request ID y tests de contrato.

### V0-C05 — version/concurrencia: PARTIAL

- La base local contiene `version` en las cuatro entidades esperadas, triggers y RPCs; los checks oficiales pasan.
- Cliente/servidor usan `If-Match`/version en acciones existentes.
- El contrato V0 permite ausencia del header en algunos caminos, mientras la norma V1 lo exige para mutaciones de entidades existentes.
- Las migraciones que materializan Planner no figuran en remoto.

**Falta:** obligatoriedad uniforme, contract tests y despliegue remoto.

### V0-C06 — idempotencia: PARTIAL

- Existe `planner_idempotency_keys` local y dos RPCs; frontend genera/envía `Idempotency-Key` en mutaciones inspeccionadas.
- El contrato actual admite que el header falte.
- La migración no aparece aplicada remotamente.

**Falta:** requerimiento uniforme, retry contract probado y despliegue remoto.

### V0-C07 — headers de mutación: PARTIAL

- `Authorization`, `Idempotency-Key` e `If-Match` están presentes en piezas existentes.
- Búsqueda global de `X-Mutation-Id`/`mutation_id` no encontró contrato ni implementación.

**Falta:** `X-Mutation-Id` generado por intención y propagado a API, logs, idempotencia/outbox y telemetría.

### V0-C08 — feature flags: MISSING

- No se encontró registry, provider, hook, endpoint ni nombres de flags.
- No existe un nombre físico verificable para habilitar Search.

**Regla:** Search debe permanecer inaccesible; no se acepta constante local o variable inventada por V1. V1 implementa solo el entry point de Search; el feature flag de Search sigue siendo contrato V0 y bloquea únicamente la exposición del entry point. La falta de Search backend no bloquea V1 porque Search productiva no pertenece a V1.

### V0-C09 — cache por hogar: MISSING

- `services/api.ts` usa `cache: 'no-store'` para GET Planner.
- `AppRefreshContext.tsx` sólo lleva timestamps; no almacena entidades ni segrega query keys.
- No se encontró React Query, cache adapter ni key factory Planner.

**Falta:** API pública de cache, keys con household, cancelación y cleanup de sesión/contexto.

### V0-C10 — invalidación dirigida: MISSING

- Cambios Planner disparan timestamps `plannerChangedAt/homeChangedAt` y consumidores refetchan de forma amplia.
- No existe grafo mutation→keys ni patch/rollback transaccional.

**Falta:** invalidación dirigida y tests que prohíban global refetch.

### V0-C11 — telemetría base: PARTIAL

- `backend/src/middleware/plannerObservability.js` registra requests lentos/errores principalmente en desarrollo.
- No se encontró proveedor de eventos de producto, schema de eventos ni test de PII.
- Console logs no satisfacen el contrato normativo.

**Falta:** adapter público, allowlist de propiedades, redacción y correlación con request/mutation ID.

### V0-C12 — audit/outbox: PARTIAL

- Existe una tabla `planner_activity_log` y escrituras best-effort de actividad.
- La documentación V0 no la presenta como outbox durable.
- Schema local: `outbox_table=0`, `audit_table=0`, `activity_table=1`.

**Falta:** outbox transaccional/retry y contrato de auditoría durable. No se acepta doble escritura desde V1.

### V0-C13 — cancel/archive/trash: PARTIAL

- Hay acciones/estados de cancelación y trash/restore.
- No hay contrato separado de archive que cubra la taxonomía normativa completa.

**Uso V1:** conservar cancel/trash existentes; no agregar Archive en V1 ni mapearlo silenciosamente a trash. Archive no pertenece a V1 y su ausencia no debe bloquear M1.

### V0-C14 — migraciones aplicadas: PARTIAL

- Local: último registro `20260713005000`; Planner schema y checks presentes.
- Remoto consultado: último registro compartido `202607050001`; columnas remotas vacías para migraciones locales Planner desde `202607080001` hasta `20260713005000`.
- Esto demuestra divergencia, no sólo falta de documentación.

**Falta:** aplicar mediante el proceso autorizado y verificar parity. Esta auditoría no aplicó ni creó migraciones.

### V0-C15 — tests V0: PARTIAL

- Existe `PLANNER_V0_SCHEMA_CHECKS.sql` y documentación de walkthroughs manuales.
- `backend/package.json` no define test; frontend tampoco.
- No se encontraron archivos test/spec ni CI.

**Falta:** tests automatizados de contracts, services, API, UI e integración.

### V0-C16 — compilación/lint: PARTIAL

- Frontend `tsc --noEmit`: PASS.
- Backend `node --check` en 16 archivos: PASS.
- Backend ESLint: FAIL con 4 errores existentes:
  - `backend/src/middleware/plannerObservability.js`: `redactSensitive` sin uso;
  - `backend/src/services/planner/planner.goals.service.js`: `getMilestoneForTrashOperation` sin uso;
  - mismo archivo: `validateStatus` sin uso;
  - mismo archivo: cast boolean redundante (`no-extra-boolean-cast`).
- Frontend lint no está disponible.

**Falta:** baseline estático verde y comandos oficiales.

### V0-C17 — compatibilidad cliente-servidor: PARTIAL

- CRUD principal usa las rutas/shapes V0 documentadas.
- Conflictos V1 comprobados:
  - Summary backend devuelve counts/listas/`briefing_text`, mientras la norma exige proyección 3/3/1 con `counts` (overdue_tasks, today_tasks, awaiting_verification, upcoming_events, active_goals) y `partial_errors` con section `'tasks'|'events'|'goals'`;
  - Home frontend hace cuatro requests y ranking cliente;
  - errors/headers son parciales;
  - create Goal acepta `current_value` del cliente;
  - navegación carece de details/Search y params finales.

**Falta:** corregir contratos indicados y protegerlos con tests.

## 3. Schema local verificado

Consulta read-only adicional:

| Métrica | Resultado |
|---|---:|
| tablas Planner | 6 |
| entidades con `version` | 4 |
| columnas de actor/member | 14 |
| policies Planner | 17 |
| tabla idempotency | 1 |
| RPCs idempotency | 2 |
| activity log | 1 |
| outbox | 0 |
| audit table | 0 |

El script oficial `docs/implementation/planner/PLANNER_V0_SCHEMA_CHECKS.sql` pasó todos sus SELECT checks: tablas, columnas Task/Event/Goal/Milestone, RPCs, RLS, constraints, version triggers e índices.

`supabase db lint` pasó con dos warnings no bloqueantes por variables PL/pgSQL sin uso (`v_active_coordinators_count` y `v_result`).

## 4. Evidencia de código especialmente relevante

| Archivo | Hallazgo |
|---|---|
| `front/mi-front-limpio/src/navigation/types.ts` | Rutas reales; faltan TaskDetail/EventDetail/Search y Goal en `initialSheet` |
| `front/mi-front-limpio/src/navigation/HomeTabNavigator.tsx` | Quick sheet global único para menú, pero Planner monta sheets contextuales aparte |
| `front/mi-front-limpio/src/components/ui/CenterTabButton.tsx` | `onPress` y `onPressOut` pueden ejecutar la misma apertura dos veces |
| `front/mi-front-limpio/src/screens/planner/PlannerScreen.tsx` | Tabs sin persistencia, slogan/stat cards, sin Search, modales task/event locales |
| `front/mi-front-limpio/src/components/planner/GoalForm.tsx` | Embedded disponible; redirect no va a GoalDetail y create envía progreso inicial |
| `front/mi-front-limpio/src/components/home/HomePlannerSections.tsx` | Fan-out de cuatro requests y ranking cliente; task no tiene complete one-tap |
| `front/mi-front-limpio/src/services/api.ts` | Sin timeout/AbortController; parsing parcial de errores; no mutation ID |
| `front/mi-front-limpio/src/context/AppRefreshContext.tsx` | Refresh por timestamps, no cache/invalidation |
| `front/mi-front-limpio/src/components/household/HouseholdSwitcherSheet.tsx` | Switch sin close/cancel/cache cleanup/stale-response token |
| `backend/src/services/planner/planner.summary.service.js` | Promise.all total, límites 500/20, counts/briefing, sin goal/partial errors |
| `backend/src/services/planner/planner.context.service.js` | Contexto correcto, pero sólo role, no capabilities |
| `backend/src/routes/planner.js` | Sin Search, flags ni permission middleware Planner |

## 5. Condición de aprobación

El gate pasa sólo cuando C03–C17 dejan de estar PARTIAL/MISSING en todo lo que V1 consume y existe evidencia en el entorno remoto objetivo. No alcanza con completar código local. La lista mínima de cierre está en G0 de `planner_v1_implementation_order.md`.

Aclaraciones sobre el alcance del gate para V1:

- La falta de Search backend no bloquea V1 porque Search productiva no pertenece a V1; V1 solo expone el entry point. El feature flag de Search sigue siendo contrato V0 necesario para exposición futura y bloquea únicamente la exposición del entry point.
- Archive no pertenece a V1; su ausencia no debe bloquear M1.
- Los contratos compartidos de V0 deben cerrarse antes de comenzar V1, conforme al proceso acordado.

## 6. Índice de evidencia por ruta y líneas

| Evidencia | Referencia auditada |
|---|---|
| Linking sólo raíz | `front/mi-front-limpio/App.tsx:L11-L25` |
| Param lists/rutas Planner reales | `front/mi-front-limpio/src/navigation/types.ts:L22-L52` |
| Stack y mount Quick Actions | `front/mi-front-limpio/src/navigation/HomeTabNavigator.tsx:L114-L145`, `:L169-L190`, `:L288-L292` |
| Acciones Task/Event/Goal actuales | `front/mi-front-limpio/src/components/ui/QuickActionSheet.tsx:L9-L142` |
| Activación doble potencial | `front/mi-front-limpio/src/components/ui/CenterTabButton.tsx:L33-L39` |
| Estado/tabs/cargas del shell | `front/mi-front-limpio/src/screens/planner/PlannerScreen.tsx:L18-L118`, `:L161-L199` |
| Stats y modales contextuales | `front/mi-front-limpio/src/screens/planner/PlannerScreen.tsx:L216-L348` |
| Goal embedded y submit/redirect | `front/mi-front-limpio/src/components/planner/GoalForm.tsx:L42-L48`, `:L421-L463` |
| API base y fetch/error handling | `front/mi-front-limpio/src/services/api.ts:L4-L24`, `:L305-L413` |
| Summary shape frontend actual | `front/mi-front-limpio/src/services/plannerSummary.ts:L5-L20` |
| Refresh timestamps globales | `front/mi-front-limpio/src/context/AppRefreshContext.tsx:L1-L56` |
| Switch sin lifecycle Planner | `front/mi-front-limpio/src/components/household/HouseholdSwitcherSheet.tsx:L117-L140` |
| Fan-out/ranking Home | `front/mi-front-limpio/src/components/home/HomePlannerSections.tsx:L53-L73`, `:L180-L203`, `:L284-L303`, `:L385-L389` |
| Contexto server-side | `backend/src/services/planner/planner.context.service.js:L4-L68` |
| Summary backend actual | `backend/src/services/planner/planner.summary.service.js:L11-L68` |
| Router Planner | `backend/src/routes/planner.js:L14-L73` |
| Permiso Invite proyectado | `backend/src/controllers/households.controller.js:L572-L578`, `front/mi-front-limpio/src/services/family.ts:L66-L75` |
| Contrato V0 identidad/contexto | `docs/implementation/planner/PLANNER_V0_CONTRACT.md:L56-L77` |
| Contrato V0 version/idempotencia | `docs/implementation/planner/PLANNER_V0_CONTRACT.md:L603-L785` |
| Contrato V0 endpoints/errores | `docs/implementation/planner/PLANNER_V0_CONTRACT.md:L790-L984` |
| Cache V0 declarada como no-store/refresh | `docs/implementation/planner/PLANNER_V0_CONTRACT.md:L1193-L1238` |
| Capabilities normativas | `docs/polish-final/planner_final_polish.md:L452-L493` |
| API/errors/idempotencia normativos | `docs/polish-final/planner_final_polish.md:L2865-L3105` |
| Query keys/invalidation normativas | `docs/polish-final/planner_final_polish.md:L3253-L3273` |
| Summary normativo | `docs/polish-final/planner_final_polish.md:L4908-L4937` |
| Reglas finales/no workaround | `docs/polish-final/planner_final_polish.md:L5131-L5169` |

Las dos referencias `docs/polish-final/*` fueron leídas desde `HEAD` con `git show` porque son tracked pero están fuera del sparse checkout materializado.

## 7. Dictamen

**V0 CONTRACT GATE FAILED — V1 NOT READY.**

No hay contradicción que requiera una decisión de producto: hay bases objetivamente ausentes o no desplegadas. Deben repararse en V0; V1 no puede crear sustitutos locales.
