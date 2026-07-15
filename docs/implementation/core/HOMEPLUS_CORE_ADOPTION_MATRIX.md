# HomePlus Core Adoption Matrix

**Corte:** 2026-07-14 / branch `homeplus-core-infrastructure-parity` / commit auditado `6a018a5` + working tree G0.3.1  
**Estado:** `G0.3.1 STATUS: PASSED` tras blocker closure.  
**Leyenda:** `CORE_SHARED`, `DOMAIN_ADAPTER`, `DOMAIN_POLICY`, `LEGACY_DUPLICATE`, `NOT_APPLICABLE`, `MISSING`, `RUNTIME_REQUIRED`.

## Active module inventory

| Módulo | Backend activo | Frontend activo | Mutaciones | Server state | Household-scoped | Estado |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Auth | Sí | Sí | Sí | AuthContext/session | No | conectado |
| Household | Sí | Sí | Sí | AuthMe + HouseholdContext | Sí | conectado |
| Invite links / join requests | Sí | Sí | Sí | refresh puntual | Sí | conectado |
| Invitations legacy | ruta bloqueada | no flujo productivo | bloqueadas | no | Sí | compatibilidad deshabilitada |
| People/Profile | Sí | Sí | Sí | context/refetch | actor | conectado |
| Users legacy | Sí | sin consumidor principal detectado | Sí | no | actor | ruta de compatibilidad |
| Home | vía Planner/Auth | Sí | no propias | adapters Planner/context | Sí | conectado |
| Planner | Sí | Sí | Sí | cache Planner sobre Core | Sí | conectado |
| Inventory | Sí | Sí | Sí | estado de pantalla + realtime | Sí | conectado; sin cache global |
| Tasks legacy | no ruta Express activa | navegación no registrada | direct Supabase delete | local | Sí | legacy desconectado |
| Events/Schedules legacy | no ruta Express activa | navegación no registrada | direct Supabase delete | local | Sí | legacy desconectado |
| Feed | no backend | pantalla con datos mock/local | no productivas | local | visual | no conectado |

## Infrastructure matrix

| Concern | Core actual | Planner | Auth | Household | Profile | Home | Otros | Gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API client | CORE_SHARED | DOMAIN_ADAPTER | CORE_SHARED | CORE_SHARED | CORE_SHARED | DOMAIN_ADAPTER | Inventory CORE_SHARED; legacy direct Supabase | LEGACY_DUPLICATE desconectado |
| Error envelope | CORE_SHARED | DOMAIN_ADAPTER | COMPAT wrapper | COMPAT wrapper | COMPAT wrapper | heredado | Inventory COMPAT wrapper | retiro gradual |
| Request ID | CORE_SHARED | CORE_SHARED | CORE_SHARED | CORE_SHARED | CORE_SHARED | heredado | Inventory CORE_SHARED | ninguno activo |
| Mutation ID | CORE_SHARED | DOMAIN_POLICY | AUTH special | DOMAIN_POLICY frontend | DOMAIN_POLICY frontend | N/A | Inventory default non-versioned | backend legacy no enforcement |
| Idempotency | mecanismo CORE | Planner persistence | N/A | frontend declara create | frontend N/A | N/A | Inventory no contrato | store durable no Planner MISSING |
| Version/If-Match | CORE_SHARED | DOMAIN_POLICY | N/A | N/A | N/A | N/A | Inventory sin versión contractual | ninguno probado |
| Abort/timeout | CORE_SHARED | CORE_SHARED | CORE_SHARED | CORE_SHARED | CORE_SHARED | CORE_SHARED | Inventory CORE_SHARED | legacy desconectado |
| Cache core | CORE_SHARED | DOMAIN_ADAPTER | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | DOMAIN_ADAPTER | Inventory local | ninguno aplicable |
| Query keys | mecanismo genérico | DOMAIN_POLICY | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | usa Planner | Inventory N/A | ninguno |
| Household scope | CORE_SHARED | DOMAIN_POLICY | NOT_APPLICABLE | CORE_SHARED | actor-scoped | usa Planner | Inventory explícito | legacy desconectado |
| Context generation | CORE_SHARED | DOMAIN_ADAPTER | lifecycle | lifecycle | por refetch | usa Planner | Inventory lifecycle de pantalla | handler global futuro condicionado |
| Sign-out cleanup | CORE_SHARED | DOMAIN_ADAPTER | CORE_SHARED | CORE_SHARED | context clear | heredado | requests globales | ninguno activo conocido |
| Capabilities engine | CORE_SHARED | DOMAIN_ADAPTER | NOT_APPLICABLE | DOMAIN_ADAPTER | NOT_APPLICABLE | usa Planner | Inventory permisos backend propios | catálogo Inventory MISSING/no inventar |
| Capability catalog | mecanismo registrable | DOMAIN_POLICY | NOT_APPLICABLE | permisos reales solamente | NOT_APPLICABLE | Planner | otros N/A | ninguno legítimo |
| Contract tests | CORE_SHARED | DOMAIN_POLICY | source adoption | source adoption | compile/adoption | compile | schema/runtime | G0.2 PASS (115) |

## Error endpoint classification

El wrapper global intercepta todas las rutas registradas antes de enviar JSON de error.

| Grupo | Clasificación | Nota |
| --- | --- | --- |
| Planner tasks/events/goals/capabilities | MIGRATED | usa `sendApiError` en controllers principales |
| Auth | COMPATIBILITY_WRAPPER | `sendError` legacy se normaliza globalmente |
| Household/invite links | COMPATIBILITY_WRAPPER | shapes planas quedan canónicas en middleware |
| People/Profile/Users | COMPATIBILITY_WRAPPER | incluye multipart y errores legacy |
| Inventory | COMPATIBILITY_WRAPPER | controllers existentes no se reescribieron masivamente |
| 404 y final 5xx | MIGRATED | request context y envelope globales |
| Legacy invitation disabled | COMPATIBILITY_WRAPPER | mantiene status funcional y forma canónica |

## Mutation adoption

| Operación | Frontend kind | Backend contract | Resultado |
| --- | --- | --- | --- |
| Auth register/login/logout | AUTH_SESSION_MUTATION | semántica Auth existente | sin headers Planner |
| Planner GET | READ_ONLY | no mutation headers | correcto |
| Planner create | CREATE_IDEMPOTENT | header + persistencia Planner | correcto |
| Planner update/action | VERSIONED_MUTATION | header + If-Match + persistencia Planner | correcto |
| Create household/invite/join/approve/reject | CREATE_IDEMPOTENT en wrappers nuevos | RPC/controllers legacy no poseen store durable Core | excepción documentada; no afirmar replay backend |
| Set active household | NON_VERSIONED_MUTATION | RPC funcional | correcto; no If-Match ficticio |
| Profile/avatar | NON_VERSIONED_MUTATION | entidad sin versión contractual | correcto |
| Inventory mutations | default NON_VERSIONED_MUTATION | endpoints sin versión/idempotencia contractual | deuda de dominio, no generalizada |

No se creó una tabla global de idempotencia ni se reutilizó `planner_idempotency_keys`, porque cualquiera de las dos opciones excedería el boundary o modificaría migraciones ya aplicadas.

## Direct data access exceptions

- Supabase Auth y storage/session SDK siguen siendo infraestructura propia del proveedor y no duplican HTTP de negocio.
- Inventory realtime usa un channel ligado al montaje de `InventarioScreen`; no mantiene cache paralela global.
- `services/tasks.ts`, `events.ts` y `schedules.ts` contienen deletes directos pero sus pantallas no están registradas en la navegación activa. Se clasifican `LEGACY_DUPLICATE`, no como módulos productivos migrados.
- Feed usa estado mock/local; no se inventó backend ni cache.

## Adoption evidence

`scripts/homeplus_core_contract_tests.js` comprueba que Core/Auth/Household respetan el boundary, que request/error middleware son globales, que no existe inferencia por URL Planner y que Household/Planner usan el engine común. TypeScript y los tests G0.3 validan consumidores reales.

## G0.3.1 blocker closure evidence

`scripts/planner_g0_2_runtime_runner.js` creó un hogar QA efímero con memberships coordinator/child, obtuvo una sesión real en memoria, ejecutó 9/9 bloques y 115 assertions con exit code 0 y eliminó el fixture. Los tres documentos G0.2 faltantes fueron reconstruidos con aclaración histórica. No se persistieron secrets.

La revalidación corrigió el nombre del handler de `/api/planner/capabilities` y defectos del test original; no añadió un mecanismo paralelo ni alteró la clasificación de adopción.
