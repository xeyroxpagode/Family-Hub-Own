# HomePlus Core Contracts

**Versión:** G0.3.1  
**Fecha:** 2026-07-14  
**Estado del contrato:** `G0.3.1 STATUS: PASSED` tras blocker closure.  
**Branch:** `homeplus-core-infrastructure-parity`  
**Commit auditado:** `6a018a577530d2cb28135afc41deaab59ba81d14`

## Boundary

HomePlus Core contiene mecanismos reutilizables y no contiene políticas de producto. La dependencia permitida es `Domain -> Core`; `Core -> Domain` está prohibida. Auth y Household no importan caches ni catálogos Planner.

```text
HomePlus Core
├── HTTP transport + base errors
├── request/mutation identity
├── mutation header contracts
├── capability engine
├── server-state primitives
├── request cancellation
├── household/session lifecycle registries
└── contract test helpers

Planner
├── capability catalog and matrix
├── query keys
├── invalidation graph and TTL policy
├── concrete optimistic patches
├── error-message catalog
└── idempotency persistence adapter
```

El Core no puede contener keys o reglas concretas de `task`, `event` o `goal`. Esos términos son válidos en adapters, políticas y tests de Planner.

## HTTP transport

`front/mi-front-limpio/services/api.ts` es el cliente HTTP compartido para los módulos activos conectados al backend; delega el enlace de abort/timeout a `services/core/requestControl.ts`. Su contrato incluye:

- bearer `Authorization` cuando existe sesión;
- `X-Request-Id` seguro en cada request;
- `AbortSignal`, timeout y registro global de cancelación;
- serialización JSON o `FormData` sin fijar incorrectamente `Content-Type`;
- parsing del envelope canónico y compatibilidad con respuestas legacy;
- diferenciación explícita de `AbortError`;
- redacción de body en logs de desarrollo;
- `Cache-Control: no-cache` para lecturas.

No se infiere política desde prefijos URL. Cada wrapper declara un `operationKind` cuando el default no alcanza.

## Operation policies

| Kind | Mutation ID | Idempotency-Key | If-Match | Uso |
| --- | --- | --- | --- | --- |
| `READ_ONLY` | N/A | N/A | N/A | GET |
| `CREATE_IDEMPOTENT` | requerido | requerido | N/A | create con replay contract |
| `VERSIONED_MUTATION` | requerido | requerido | requerido | entidad existente versionada |
| `NON_VERSIONED_MUTATION` | requerido | opcional | N/A | mutación sin versión contractual |
| `AUTH_SESSION_MUTATION` | opcional | N/A | N/A | login/register/logout/refresh |

El frontend genera los headers requeridos. El backend valida mediante `backend/src/lib/mutationContracts.js`. Exigir un header no equivale a persistir replay: la persistencia de idempotencia permanece en el adapter Planner hasta que exista un store global aprobado.

## Request context

`requestContextMiddleware` se registra antes del parser JSON y de health/rutas, de modo que hasta un body JSON inválido recibe correlación. Acepta `X-Request-Id` únicamente si coincide con `[A-Za-z0-9._:-]{1,128}`; de lo contrario genera UUID. Expone:

```text
req.requestId
req.mutationId | null
X-Request-Id response header
X-Mutation-Id response header (si la entrada fue válida)
```

No inspecciona ni registra tokens, cuerpos o secretos. Aplica también a 404 y al handler final 5xx.

## Error envelope

Toda respuesta HTTP con status `>= 400` atraviesa `errorEnvelopeMiddleware` y sale como:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "request_id": "string|null",
    "details": {}
  }
}
```

`details` sólo se publica para errores `< 500`. Los 5xx se redactan como `Error interno.` y conservan diagnóstico sólo en logs del servidor. Los controllers ya canónicos pasan sin doble envoltura; los controllers legacy son normalizados por el wrapper global. Condición de retiro: migrar todos los controllers activos a `sendApiError` y verificar consumidores antes de eliminar `errorEnvelopeMiddleware`.

## Capability engine

Core ofrece `createCapabilityCatalog`, `projectCapabilities`, `hasCapability` y `assertCapability`. Reglas:

- catálogo de strings no vacíos;
- proyección booleana completa;
- ausencia, rol inválido o capability desconocida deniega;
- el backend vuelve a verificar; el frontend sólo usa la proyección para UX.

Planner conserva `PLANNER_CAPABILITIES`, matriz por rol, ownership y scopes. Household adapta únicamente permisos existentes (`invite_members`, `approve_members`, etc.); no se inventaron capabilities. Auth no usa capabilities.

## Server-state core

`createServerState` acepta keys `readonly unknown[]` y callbacks opcionales de TTL/scope. Provee:

- `get`, `getEntry`, `set`, `setPending`, `setError`, `delete`;
- `invalidate` e invalidación por prefijo estructural de arrays;
- `subscribe`, `dump`, `keysForScope`;
- captura/avance de generación y rechazo de writes de generaciones anteriores;
- snapshot completo de todas las keys afectadas, patch, reconcile y rollback exacto;
- clear por scope y por sesión;
- registro/cancelación de `AbortController`.

La generación es monótona durante la vida del proceso. Sign-out avanza la generación; no vuelve a cero, evitando que una respuesta antigua de la generación inicial vuelva a ser aceptada.

Planner mantiene `plannerKeys`, TTLs, invalidation graph, scopes y reconciliación concreta. `plannerCache` es un facade de compatibilidad sobre Core.

## Lifecycle contracts

Household lifecycle ejecuta handlers ordenados por `order` y `name`:

```text
beforeSwitch* -> activate -> afterSwitch*
                       failure -> rollbackSwitch* (orden inverso)
```

Session lifecycle ejecuta cleanup ordenado una vez por sesión activa, comparte la promise durante concurrencia y devuelve una lista de errores sin impedir otros handlers.

Los registros concretos se realizan en `services/registerLifecycleHandlers.ts`, composition root permitido para importar Core y dominios. Los registros Core no importan dominios.

## Compatibility adapters

| Adapter | Propósito | Retiro |
| --- | --- | --- |
| `plannerMutationContracts.js` | reexporta contratos Core + políticas Planner | cuando controllers Planner importen Core directamente |
| `idempotencyHelpers.js` | conserva imports históricos | cuando no queden imports legacy |
| `plannerIdempotencyAdapter.js` | persistencia en tablas/RPC Planner | sólo con store global aprobado; no renombrar como Core |
| `versionHelpers.js` | compatibilidad de imports sobre parsing/assert Core | cuando services importen `mutationContracts` |
| `plannerCache.ts` | API Planner sobre `createServerState` | mantener mientras sea el facade de política Planner |
| `errorEnvelopeMiddleware.js` | normaliza controllers legacy | tras migración endpoint por endpoint y tests de cliente |

## Reproducible checks

```powershell
npm.cmd run test:core
.\front\mi-front-limpio\node_modules\.bin\tsc.cmd --noEmit -p front\mi-front-limpio\tsconfig.json
Push-Location backend; npx.cmd eslint .; $code=$LASTEXITCODE; Pop-Location; exit $code
Get-Content -Raw docs\implementation\planner\PLANNER_V0_SCHEMA_CHECKS.sql |
  docker exec -i supabase_db_HomePlus psql -U postgres -d postgres -v ON_ERROR_STOP=1
supabase db lint
supabase migration list
git diff --check
```

G0.2 se ejecuta de forma reproducible con `node scripts/planner_g0_2_runtime_runner.js`: el runner carga las variables locales ignoradas, genera `TEST_ACCESS_TOKEN` mediante login real, ejecuta 115 assertions y elimina el fixture. Evidencia de cierre: exit code 0, secrets persistidos 0.

Los documentos reconstruidos son `PLANNER_V0_G0_2_SECURITY_TRANSPORT_REPORT.md`, `PLANNER_V0_CAPABILITIES_CONTRACT.md` y `PLANNER_V0_ERROR_TRANSPORT_CONTRACT.md`; ninguno se presenta como evidencia contemporánea del commit original.

La única corrección backend de closure fue alinear la ruta `/api/planner/capabilities` con el símbolo realmente exportado `getPlannerCapabilities`. El resto de correcciones se limitó al harness G0.2 (API URL, bearer, response shape, no-skip y cleanup); el boundary no cambió.
