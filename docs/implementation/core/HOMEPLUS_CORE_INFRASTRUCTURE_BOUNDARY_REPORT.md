# G0.3.1 — HomePlus Core Infrastructure Boundary & Global Parity Review

## 1. Metadata

| Campo | Valor |
| --- | --- |
| Fecha | 2026-07-14 |
| Rama de cierre | `homeplus-core-infrastructure-parity` |
| Commit base | `6a018a577530d2cb28135afc41deaab59ba81d14` |
| Commit G0.2 | `2642ba9` |
| Commit G0.1 | `437c6cb` |
| Repositorio | `C:/Users/thega/Desktop/HomePlus` |
| Scope | boundary/paridad de infraestructura; sin feature productiva |
| Commit/push | no/no |

## 2. Baseline

La tarea comenzó con working tree limpio en `v1` y el cierre de blockers preservó todos los cambios en `homeplus-core-infrastructure-parity`. `git log -6` confirmó G0.1, G0.2 y G0.3 consecutivos; HEAD fue `6a018a5 feat(planner): close V0 G0.3 server state and context`. Runtime: Node `v24.13.0`, npm `11.6.2`.

Baseline observado antes de modificar:

| Check | Resultado |
| --- | --- |
| Frontend TypeScript | PASS |
| Backend syntax | PASS (50 JS entonces) |
| Backend ESLint completo | FAIL: 5 unused vars preexistentes |
| G0.2 integration | RUNTIME_REQUIRED: faltan `SUPABASE_ANON_KEY` y `TEST_ACCESS_TOKEN` |
| G0.3 compile/test | FAIL: harness no reproducible con root limpio; expectations no probaban late writes reales |
| Schema lint | PASS con 2 warnings preexistentes |
| Migration parity | PASS |
| `git diff --check` | PASS |

En el baseline, los tres documentos G0.2 exigidos no existían en HEAD. Durante blocker closure fueron reconstruidos desde el commit, código y evidencia runtime actual; cada uno declara expresamente que no es evidencia contemporánea de la ejecución original.

## 3. Active modules

Se inspeccionaron rutas Express, navegación, contexts y servicios, no sólo nombres Planner. Auth, Household, invite links/join requests, People/Profile, Home, Planner e Inventory están conectados. Users conserva ruta backend de compatibilidad. Invitations legacy está explícitamente deshabilitado. Tasks/Events/Schedules legacy existen como servicios directos Supabase pero sus pantallas no están registradas. Feed es local/mock. El detalle está en `HOMEPLUS_CORE_ADOPTION_MATRIX.md`.

## 4. Infrastructure inventory

Antes de G0.3.1 coexistían:

- cliente HTTP global con políticas Planner inferidas por URL;
- request context sólo en el router Planner;
- envelope canónico sólo en controllers Planner y errores planos en el resto;
- parsers de mutation/version repartidos en archivos con nombre Planner y `versionHelpers`;
- engine y catálogo Planner mezclados;
- cache/gen/snapshot/cancel genéricos mezclados con keys/TTL/invalidation Planner;
- Auth/Household importando `plannerCache` para lifecycle global;
- servicios legacy directos Supabase fuera de navegación activa.

## 5. Core/domain classification

| Pieza | Conoce Planner | Funciona sin Planner | Consumidor no Planner | Antes | Acción / ownership final |
| --- | ---: | ---: | ---: | --- | --- |
| `api.ts` | parcialmente | sí | todos | shared con inferencia Planner | KEEP_CORE; quitar inferencia, policy explícita |
| `httpErrors` | comentarios/nombres | sí | global | lib común usada desigual | KEEP_CORE + envelope global |
| `requestContextMiddleware` | no | sí | global | montado en Planner | KEEP_CORE + MIGRATE global |
| `idempotencyHelpers` | persistencia Planner | no completamente | no | nombre engañoso | EXTRACT parser Core; RENAME adapter Planner; WRAP histórico |
| `plannerMutationContracts` | policy | mecanismo sí | no | mezclado | EXTRACT_CORE + WRAP_CORE |
| `versionHelpers` | no | sí | potencial | implementación paralela | WRAP_CORE / deprecate |
| `plannerCapabilities` | catálogo/reglas | engine sí | Household | mezclado | EXTRACT_CORE; KEEP_DOMAIN catalog |
| `plannerKeys` | sí | no | no | Planner | KEEP_DOMAIN |
| `plannerCache` | sí y no | mecanismo sí | lifecycle global lo importaba | mezclado | EXTRACT_CORE + DOMAIN facade |
| context token | no | sí | session/household | dentro cache Planner | EXTRACT_CORE generation |
| household cleanup | no | sí | toda app | context importaba Planner | EXTRACT lifecycle registry |
| sign-out cleanup | no | sí | toda app | Auth importaba Planner | EXTRACT lifecycle registry |
| optimistic snapshots | mecanismo no | sí | futuro | cache Planner | EXTRACT_CORE; patches Planner |
| invalidation graph | sí | no | no | Planner | KEEP_DOMAIN |

## 6. Problems found

1. Boundary invertido: Auth y Household dependían de Planner.
2. 404/5xx/Auth/Household/Profile/Inventory podían devolver shapes incompatibles.
3. Request ID no estaba garantizado fuera de Planner.
4. El frontend decidía headers por `path.startsWith('/api/planner')`.
5. `plannerCache.invalidatePrefix` comparaba JSON strings; un prefix terminado en `]` no matcheaba una key más larga.
6. Late responses no capturaban la generación al iniciar request; un `set` tardío podía estampar la generación nueva.
7. Sign-out restauraba token a cero, haciendo posible colisión con respuestas antiguas de generación cero.
8. Snapshot optimistic podía registrar sólo una key concreta aunque la operación afectara varias.
9. El proof de optimistic task usaba `householdId: ''`.
10. Avatar Profile usaba un `fetch` paralelo.
11. `versionHelpers` duplicaba parsing y emitía `409/version_conflict` distinto de `412/version_conflict_v2`.
12. Los tests G0.3 compilados no eran reproducibles desde root y simulaban late response sin ejecutar el write tardío.

## 7. Previous architecture

```text
AuthContext ───────────────┐
HouseholdContext ─────────┼──> plannerCache (global mechanics + Planner policy)
Planner services ─────────┘

Express
├── Planner router -> requestContext -> canonical errors
└── other routers  -> flat/heterogeneous errors
```

## 8. Final architecture

```text
App composition root
├── Core lifecycle registries
│   ├── core.requests handler
│   └── planner.server-state handler
├── AuthContext -> session lifecycle
├── Household switch UI -> household lifecycle
└── Planner adapters -> Core mechanisms

Core backend
├── mutationContracts
├── capabilityEngine
├── requestContextMiddleware (global)
├── errorEnvelopeMiddleware (global compatibility)
└── httpErrors

Core frontend
├── api transport
├── serverState + request registry
├── lifecycle
├── capabilities
└── apiErrorCatalog
```

Core no importa Planner. La composition root puede importar ambos para registrar adapters. No se introdujeron ciclos detectados por TypeScript/Node ni por los boundary tests.

## 9. Files created, extracted and modified

Core backend creados: `capabilityEngine.js`, `mutationContracts.js`, `errorEnvelopeMiddleware.js`. Core frontend creados: `services/core/{serverState,lifecycle,requestControl,capabilities,apiErrorCatalog}.ts`. Composition/adapters creados: `registerLifecycleHandlers.ts`, `plannerErrorMessages.ts`, `plannerIdempotencyAdapter.js`.

Tests creados: `homeplus_core_contract_tests.js`, `homeplus_core_frontend_tests.ts`. Se actualizaron harness G0.3, package scripts, API/client wrappers, contexts, switcher, Planner services/controllers/adapters, Express global registration y permisos Household. No hubo `git mv`; la implementación de idempotencia se extrajo preservando el path histórico como wrapper.

## 10. Maintained adapters

Se mantienen wrappers documentados en `plannerMutationContracts.js`, `idempotencyHelpers.js`, `versionHelpers.js`, `plannerCache.ts` y `errorEnvelopeMiddleware.js`. Sus condiciones de retiro están en `HOMEPLUS_CORE_CONTRACTS.md`; ninguno se conserva sin criterio.

## 11. Global transport

`requestJson` es el único `fetch` de negocio en módulos activos. Genera request identity, aplica auth, policy explícita, timeout/abort, cancel registry, no-cache GET, FormData y parsing uniforme. `updatePeopleAvatar` fue migrado al mismo cliente. Auth usa policy especial; no recibe headers Planner.

## 12. Global errors

El middleware global normaliza cualquier body de error, conserva envelopes canónicos, adjunta request ID y redacta 5xx. Planner registra mensajes específicos mediante un catálogo de frontend, sin introducir strings Planner en Core.

## 13. Mutation contracts

El parser/validator de mutation ID, idempotency key e expected version vive en Core. Planner conserva la decisión endpoint y su store RPC. Los wrappers frontend no Planner declaran semántica explícita, pero no se afirma replay durable donde el backend aún no lo implementa. No se reutilizó infraestructura persistente Planner como si fuera global.

## 14. Capability engine

El engine genérico proyecta/enforce/deny-safe. Planner mantiene catálogo/matriz/ownership. Household adapta permisos reales existentes. No se crearon capabilities Auth, Inventory o módulos hipotéticos.

## 15. Server-state core

El store genérico implementa key storage, statuses, TTL callback, scope, generation, late-write guard, structural prefix invalidation, full snapshots, rollback, cancellation y clear. `plannerCache` conserva keys, TTLs, invalidation graph y reconciliación concreta.

## 16. Household lifecycle

El switcher ejecuta `runHouseholdSwitch`; requests previos se cancelan antes de activar. Sólo después de `setActiveHousehold + refetchMe` se limpia el scope Planner anterior y avanza la generación. Si la activación falla, la UI conserva A y ejecuta rollback handlers preparados.

## 17. Session lifecycle

Auth ejecuta logout backend, registry cleanup y Supabase local sign-out. Planner se registra fuera de Auth. Cleanup es once-per-active-session, concurrent-safe e idempotente.

## 18. Adoption by module

Auth, Household, Invitations activas, Profile, Home, Planner e Inventory usan el transporte común donde aplica. Home consume adapters Planner en vez de mantener cache paralela. Inventory no fue forzado a cache/capabilities inexistentes. Servicios legacy desconectados se documentan y no justifican una migración productiva masiva.

## 19. Compatibility and rollout

| Consumidor | Contrato anterior | Nuevo | Compatibilidad | Riesgo / rollback |
| --- | --- | --- | --- | --- |
| API controllers legacy | error plano | envelope global | middleware | retirar middleware revierte forma, no recomendado |
| Planner imports | helpers con nombre Planner | Core + adapters | reexports | restaurar adapter previo por archivo |
| Auth/Household | import Planner directo | lifecycle registry | composition root | restaurar imports sólo como rollback temporal |
| Planner cache | store monolítico | facade + Core | API pública preservada | revertir `plannerCache.ts` junto con tests |
| HTTP wrappers | inferencia por URL | operation kind | defaults compatibles | revertir wrappers individualmente |

## 20. Tests after implementation

| Check | Resultado 2026-07-14 |
| --- | --- |
| Frontend TypeScript | PASS |
| Backend syntax | PASS, 55 JS |
| Backend ESLint completo | PASS; se limpiaron 3 unused vars del seed además de 2 en código activo |
| Boundary/backend contracts | PASS, 23 assertions |
| Core frontend/lifecycle | PASS, 15 assertions |
| G0.3 regression | PASS, 46 assertions |
| G0.2 integration | PASS; 9/9 bloques, 115 assertions, exit 0, fixture cleanup PASS |
| Planner schema SQL | PASS, todas las filas sin FAIL |
| `supabase db lint` | PASS exit 0; 2 warnings preexistentes de variables no usadas |
| Migration parity | PASS, 31/31 local=remote hasta `20260713005000` |
| `git diff --check` | PASS; sólo avisos LF/CRLF |

### 20.1 Blocker closure corrections

La ejecución real demostró un `CONTRACT_FAILURE`: `backend/src/routes/planner.js` registraba `capabilitiesController.getCapabilities`, pero el controller exporta `getPlannerCapabilities`; se corrigió el nombre y el backend volvió a iniciar. También demostró `TEST_DEFECT` en el harness original: URL Supabase usada como API, bearer omitido, shape `source` inexistente, bloques salteables y ausencia de cleanup. Se corrigió el test y se agregó un runner local efímero. No hubo rediseño del boundary ni cambio funcional de producto.

Los documentos reconstruidos resultantes son `PLANNER_V0_G0_2_SECURITY_TRANSPORT_REPORT.md`, `PLANNER_V0_CAPABILITIES_CONTRACT.md` y `PLANNER_V0_ERROR_TRANSPORT_CONTRACT.md`.

## 21. Dependencies

No se agregó ninguna dependencia runtime ni dev dependency. Se usaron TypeScript y `@types/node` ya declarados en el root lockfile. No Redux, React Query, event bus, DI u observabilidad.

## 22. Risks

- La normalización global puede revelar controllers con status/code legacy mal elegidos; el envelope evita shape drift pero no corrige semántica individual.
- Household/invite replay-sensitive todavía no tiene store durable global. Enviar header no garantiza idempotencia backend.
- Inventory realtime sigue ligado al lifecycle de pantalla, adecuado mientras no haya store global.
- El runner G0.2 necesita service role local para crear y eliminar el fixture efímero; rechaza Supabase remoto.
- Warnings SQL preexistentes deben tratarse en una fase autorizada sin editar migraciones aplicadas.

## 23. Rollback

El cambio no tiene migraciones ni dependencias. Puede revertirse por capas: composition/lifecycle, Planner facade/Core state, transport policy, middleware global y backend engines. Para evitar un estado incoherente, cada capa debe revertir simultáneamente su adapter, consumidores y tests. No borrar wrappers antes de migrar imports.

## 24. Legitimately deferred debt

1. Diseñar idempotencia durable global para dominios no Planner sólo en una fase que autorice schema/migración.
2. Migrar controllers legacy a `sendApiError` y retirar el wrapper cuando todos estén cubiertos.
3. Retirar paths legacy `users`, invitations y services direct Supabase cuando producto confirme que no hay consumidores.

## 25. Final status

```text
G0.3.1 STATUS: PASSED
```

Blocker closure ejecutó G0.2 contra el backend real aislado en `127.0.0.1:3101`, con sesión QA generada en memoria y fixture local completamente eliminado: 115 assertions, exit code 0. Los tres contratos G0.2 reconstruidos existen y aclaran el carácter posterior de la evidencia. G0.3, boundaries, TypeScript, syntax, ESLint, schema, migration parity y diff-check se revalidaron en el cierre. G0.4 queda autorizado como siguiente fase, pero no fue iniciado aquí.
