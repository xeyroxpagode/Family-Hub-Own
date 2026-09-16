# Planner V1 — M2 Shell State Contract

**Versión:** V1.M2
**Owner:** Planner V1
**Branch:** `v1`
**Estado:** `M2 STATUS: PASSED`
**Implementación:** `front/mi-front-limpio/services/planner/plannerShellState.ts`

## 1. Purpose

Único autoridad tipada para el estado global visible del Planner Shell. Su union discriminada cierra estados imposibles bajo TypeScript y el resolver puro convierte inputs lineales en exactamente un estado.

## 2. Union discriminada

```text
PlannerShellState =
  | { kind: 'initial_loading' }
  | { kind: 'refreshing' }
  | { kind: 'ready' }
  | { kind: 'empty' }
  | { kind: 'partial'; unavailableSections: readonly PlannerSectionKey[] }
  | { kind: 'offline_stale' }
  | { kind: 'offline_empty' }
  | { kind: 'forbidden' }
  | { kind: 'not_found' }
  | { kind: 'conflict'; requestId: string | null }
  | { kind: 'recoverable_error'; error: PlannerShellErrorInfo }
  | { kind: 'fatal_error'; errorId: string }
```

Garantías:

- Inmutabilidad (`readonly` en todo campo).
- Coherencia: el kind determina qué campos son válidos.
- Translado imposible bajo tipo: no existe `partial sin unavailableSections`, `fatal_error sin errorId`, etc.
- Imposibles: `'forbidden' && 'not_found'`, `'empty' && 'conflict'`, etc. — un solo `kind` activo a la vez.

## 3. Inputs tipados

```text
PlannerShellInputs =
  { authReady, householdReady, hasActiveHousehold, capabilitiesReady, canViewPlanner
    , initialLoading, refreshing, hasUsableContent, isEmpty, isOffline
    , partialSections?, error? }
```

Cuando error se omite, es null. `error.class === 'abort'` se descarta en el resolver y jamás

se materializa como estado funcional.

## 4. Priority (determinístico)

| # | Trigger | Estado final |
|---|---|---|
| 1 | `!authReady || !householdReady || !hasActiveHousehold` | `initial_loading` |
| 2 | `!capabilitiesReady` | `initial_loading` (deny-safe) |
| 3 | `canViewPlanner === false` | `forbidden` |
| 4 | `initialLoading && !hasUsableContent` | `initial_loading` |
| 5 | `isOffline && !hasUsableContent` | `offline_empty` |
| 6 | `shellError && !hasUsableContent`: class=`not_found` | `not_found` |
| 6 | class=`conflict` | `conflict` (con requestId) |
| 6 | class=`forbidden` | `forbidden` |
| 6 | resto (`validation|server|timeout|offline|unknown`) | `recoverable_error` |
| 7 | `!isOffline && !shellError && isEmpty && !hasUsableContent` | `empty` |
| 8 | `partialSections && hasUsableContent` | `partial` (preserva contenido) |
| 9 | `isOffline && hasUsableContent` | `offline_stale` |
| 10 | `refreshing && hasUsableContent` | `refreshing` |
| 11 | default con contenido | `ready` |

## 5. Output helpers

- `shellStateShowsActiveContent(state)` — true para `ready`, `refreshing`, `partial`, `offline_stale`.
- `shellStateRequiresChrome(state)` — opuesto del anterior.
- `shellStateRequiresSkeleton(state)` — true solo para `initial_loading` y `fatal_error`.

## 6. Ownership

- Resolver: aplicado únicamente en `PlannerScreen.tsx`. Las tabs no lo invocan directamente.
- State chrome: renderizado vía `components/planner/PlannerStateView.tsx`.
- Compatibilidad: `refreshing` no produce chrome; mantiene el contenido del tab activo. `partial` tampoco bloquea el tab.

## 7. Ejemplos

### Initial loading durante preparación de sesión

Inputs: `{ authReady: false, householdReady: false, capabilitiesReady: true, canViewPlanner: true, hasUsableContent: false, initialLoading: false, isOffline: false }`

Output: `initial_loading`.

### Forbidden tras resolver capabilities

Inputs: `{ authReady: true, householdReady: true, capabilitiesReady: true, canViewPlanner: false }`

Output: `forbidden`.

### Refresh con contenido

Inputs: `{ refreshing: true, hasUsableContent: true, ... }`

Output: `refreshing`. (El chrome no se muestra; el contenido permanece.)

### Empty confirmado

Inputs: `{ isEmpty: true, hasUsableContent: false, isOffline: false, shellError: null, ... }`

Output: `empty`.

### Offline con contenido

Inputs: `{ isOffline: true, hasUsableContent: true, ... }`

Output: `offline_stale`. (El chrome no se muestra; el contenido permanece.)

### Offline sin datos

Inputs: `{ isOffline: true, hasUsableContent: false, ... }`

Output: `offline_empty`.

### Partials — error 409 sin contenido

Inputs: `{ shellError: 409 version_conflict_v2, hasUsableContent: false }`

Output: `conflict` con `requestId: <requestId del PlannerError>`.

### Recoverable — 500 sin contenido

Inputs: `{ shellError: 500, hasUsableContent: false }`

Output: `recoverable_error` con `{ errorClass: 'server', code: null, requestId: null, isRetryable: true }`.

### Abort

Inputs: `{ shellError: PlannerError{class:'abort'}, ... }`

`toPlannerShellErrorInfo` devuelve `null` → `shellError = null`. El resolver cae al paso 7/8/11 según contenido. El abort nunca se ve como estado de UI.

## 8. Retry / refresh / partial / offline

- `refreshing` no reemplaza el contenido: el shell mantiene `PlannerXXXScreen`. El `RefreshControl` muestra el spinner nativo.
- `empty`: el `onRetry` se ofrece sólo si data podría volver; por defecto, `onRetry` no aparece porque no hay servidor que revalidar.
- `partial`: chrome con lista de secciones afectadas; `onRetry` apunta al cache invalidado por sección (M8/M9 conectarán el grafo; M2 ya establece la firma).
- `offline_stale`: contenido persiste; mutaciones futuras son responsabilidad del ciclo de lifecyce HomePlus (no se habilitan writes en offline).
- `offline_empty`: chrome explica necesidad de conexión; reintento manual.

## 9. Prohibiciones

- `partial` no se transforma en error global cuando hay sección sana.
- `forbidden` y `not_found` jamás colapsan.
- `abort` jamás aparece como error funcional.
- `conflict` jamás se resuelve con LWW. La decisión sigue siendo refetch dirigido.
- Sin cadenas arbitrarias ni enums libre.
- Sin `console.log` en el resolver.
- I/O fuera del resolver (sin fetch, sin navegación, sin mutación de cache).
- Sin pasar `Error.original` a UI.
- Sin pasar tokens, household IDs, requests crudos.

## 10. Test coverage

Cubierto por `scripts/planner_v1_shell_state_tests.ts`. Cada guarismo de prioridad tiene uno o más casos. Las prioridades 1, 3, 5, 7, 8, 9, 10, 11 tienen aserts específicos; las condiciones 4/6 son las más estrictas y tienen tests dedicados que prueban los cuatro sub-branches.

## 11. Compatibility

- No se reescriben `PlannerTabKey` (`M1`) ni `PlannerErrorClass` (`M1`).
- La firma de `resolvePlannerShellState` cambia del concepto al código en esta M2; futuros hooks M6/M8 lo consumirán sin ruptura.
- `partialSections` queda libre de wire hasta M8.

## 12. Post-M2 update

Tras la implementación de M2, este contrato es el canónico para:Volver arriba mínimo superficie UI; predecible; no flicker; retries dirigidos sin destruir contexto.

Suite de tests: `npm.cmd run test:planner:m2`.
Resultado M2: 76 asserts pass, 0 fail.
