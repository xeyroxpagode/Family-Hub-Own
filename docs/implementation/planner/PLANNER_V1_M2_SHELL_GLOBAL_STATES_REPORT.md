# Planner V1 — M2 Shell & Global States Report

**Versión:** V1.M2
**Owner:** Planner V1
**Branch:** `v1`
**Estado:** `M2 STATUS: PASSED`
**Commit previo:** `ee3e132 feat(planner): complete M1 navigation and transport`

## 1. Metadata

| Campo | Valor |
|---|---|
| Microfase | M2 — Planner Shell and Global States |
| Precondición | M1 STATUS: PASSED (commit `ee3e132`) |
| Branch base | `v1` |
| Working tree antes | limpio |
| Foco | Shell único, estados globales canónicos, resolver puro, error boundary, accessibility base |

## 2. Baseline

| Check | Estado |
|---|---|
| Branch | `v1` |
| Working tree antes de M2 | limpio |
| Commit M1 | `ee3e132` presente |
| Decisiones abiertas | ninguna |
| Migraciones pendientes | ninguna |
| Migration parity | vigente |

## 3. Auditoría focalizada (mapeo ownership)

| Concern | Estado anterior | Owner anterior | Owner final (M2) | Acción |
|---|---|---|---|---|
| Header del Planner | título + slogan legacy + overflow | `PlannerScreen.tsx` (local) | `PlannerScreen.tsx` (refactorizado) | `CENTRALIZE` |
| Tabs | tipo local `PlannerInternalTab` | `PlannerScreen.tsx` | canonical `PlannerTabKey` (M1) | `ADAPT` |
| Initial loading | `Skeleton` + `loading` bool | `PlannerScreen.tsx` | shell-state `initial_loading` + skeleton del shell | `CENTRALIZE` |
| Refresh | `RefreshControl` + `refreshing` | `PlannerScreen.tsx` | shell-state `refreshing` (preserva contenido) | `CENTRALIZE` |
| Empty | ninguno a nivel shell; cada tab vacío | tabs hijos | shell-state `empty` global; tabs mantienen su empty interno | `CENTRALIZE` |
| Partial | ninguno | ninguno | shell-state `partial` con `unavailableSections` + chrome de aviso | `DEFER_TO_CHILD` (sección `partialSections` queda informativa en M2; M8 conectará el grafo) |
| Offline stale | ninguno | ninguno | shell-state `offline_stale` con contenido visible | `CENTRALIZE` |
| Offline empty | ninguno | ninguno | shell-state `offline_empty` sin promover a empty de producto | `CENTRALIZE` |
| Forbidden | `ErrorState` + `canViewPlanner` no estaba aplicado | mixto | shell-state `forbidden` | `CENTRALIZE` |
| Not found | `ErrorState` plano | mixto | shell-state `not_found`, separado de forbidden | `CENTRALIZE` |
| Conflict | `Alert.alert` ad-hoc en cada screen | `PlannerTasksScreen.tsx` / `PlannerCalendarScreen.tsx` | shell-state `conflict` (sin LWW) | `CENTRALIZE` |
| Recoverable error | `ErrorState` plano | `PlannerScreen.tsx` | `PlannerStateView.recoverable_error` con mapa `server/timeout/validation/unknown` | `CENTRALIZE` |
| Fatal render error | `Modal` blanco | sin boundary | `PlannerErrorBoundary` | `CENTRALIZE` (creado) |
| Retry | `onRetry`/`onRefresh` ad-hoc | cada screen | shell-state `Retry` dirigido (no global refetch) | `CENTRALIZE` |
| Legacy stats cards | 4 tarjetas (`Pendientes`, `Hoy`, `Vencidas`, `A revisar`) | `PlannerScreen.tsx` | retiradas; Summary queda como fuente canónica para M8/M9 | `REMOVE_LEGACY` |
| Modal ownership | `Modal` de Task/Event local en PlannerScreen | `PlannerScreen.tsx` (compat bridge) | sigue en `PlannerScreen.tsx` con marca `compat-bridge-until-M3`; `PlannerSheetHost` diferido a M3 | `DEFER_TO_M3` |
| Capabilities `planner.view` | no consumido por el shell | `canViewPlanner` adaptador disponible | `PlannerScreen` consume `canViewPlanner` + `capabilitiesReady` | `CENTRALIZE` |
| Household switch | heredado de HomePlus Core | Core lifecycle | Shell respeta y no muestra datos del hogar previo (state keyed + abort silent) | `KEEP` |
| Sign-out | heredado | Core lifecycle | Shell limpia su `useFocusEffect` y aborta resumen en curso | `KEEP` |

## 4. Ownership anterior vs final

Antes de M2:
- `PlannerScreen.tsx` mezclaba shell, header, stats legacy, tabs, modal local de formularios, summary fetch, errores planos.
- Las tabs conocían su tipo local (`PlannerInternalTab`).
- No existía autoridad única para estados globales; cada screen decidía.

Después de M2:
- `PlannerScreen.tsx` es el shell único y delega el estado global al resolver puro.
- Las tabs usan `PlannerTabKey` (autoridad M1).
- `services/planner/plannerShellState.ts` define `PlannerShellState` y `resolvePlannerShellState`.
- `components/planner/PlannerStateView.tsx` renderiza el chrome global.
- `components/planner/PlannerErrorBoundary.tsx` captura errores de render.
- Compatibility bridge: Task/Event modales aún viven localmente en el Shell hasta M3 (documentado in-file con `compat-bridge-until-M3`).

## 5. State model y priority

Discriminated union cerrada (`PlannerShellState`):

```text
initial_loading
refreshing          // no reemplaza contenido
ready
empty               // del shell; no del individual tab
partial             // unavailableSections: PlannerSectionKey[]
offline_stale
offline_empty
forbidden
not_found
conflict            // requestId preservado; nunca LWW
recoverable_error   // PlannerShellErrorInfo { errorClass, code, requestId, isRetryable }
fatal_error         // errorId opaco (pln_<ts>_<rand>) — emitido solo por ErrorBoundary
```

Priority (determinístico, documentado en `plannerShellState.ts`):

1. Auth/household preparation aún en curso → `initial_loading`
2. Capabilities no listas → `initial_loading` (deny-safe)
3. `planner.view` denegado → `forbidden` (vence offline_empty)
4. `initialLoading && !hasUsableContent` → `initial_loading`
5. `isOffline && !hasUsableContent` → `offline_empty`
6. Error de servicio y `!hasUsableContent`:
   - class `not_found` → `not_found`
   - class `conflict` → `conflict` (con requestId)
   - class `forbidden` → `forbidden`
   - resto (`validation|server|timeout|offline|unknown`) → `recoverable_error`
7. Empty online sin error → `empty`
8. `partialSections` presente y contenido usable → `partial`
9. Offline con contenido usable → `offline_stale`
10. Refreshing sobre contenido existente → `refreshing` (contenido permanece visible)
11. Default → `ready`

Abort nunca aparece como estado funcional. El resolver y `toPlannerShellErrorInfo` redacted pura y exclusivamente a `errorClass/code/requestId/isRetryable`; el `original Error` no cruza al shell.

`shellStateShowsActiveContent` y `shellStateRequiresChrome` codifican la decisión de UI. `shellStateRequiresSkeleton` separa chrome vs spinner.

## 6. Header

- Título `Planner` (sin slogan).
- Sin tarjetas estadísticas heredadas (Pendientes / Hoy / Vencidas / A revisar).
- Sin Search y sin Central Action Button futuros (deferidos a M7/M4).
- Sin botones deshabilitados placeholder.
- Safe areas respetadas (`SafeAreaView edges={['top']}`).
- Jerarquía simple: `AppText variant="title1"` semantics.

## 7. Tabs

- `PlannerTabKey` (`tasks | calendar | goals`) — autoridad M1.
- Default: `tasks`. Persistencia para M6 (`planner:last-tab:${accountId}:${householdId}`).
- Render con `accessibilityRole="tab"` y `accessibilityState={{ selected }}`.
- Sin alias; sin `task/event/goal` singulares; sin `events/goals` plurales extras.
- Sin refetch al cambiar tab; `refreshKey` se propaga sin reset.
- Contenido del tab activo se desmonta cuando la shell state muestra chrome (`showActiveContent=false`); el `refreshing` conserva el subtree montado.

## 8. Initial loading

- Skeleton vía `PlannerStateView` variante `initial_loading`.
- `Skeleton variant="screenSection"` (token existente, sin librería nueva).
- Sin flicker: el resolver `initial_loading` solo emerge cuando:
  - preparación de sesión/household/capabilities, o
  - `initialLoading && !hasUsableContent`.
- No se utiliza `pull-to-refresh` para salir del skeleton — `Retry` se ofrece cuando se tienen inputs estables.

## 9. Refresh

- `refreshing=true` y `hasUsableContent=true` → estado `refreshing`.
- Contenido permanece en árbol (no se renderiza chrome).
- `RefreshControl` en el shell con indicador no bloqueante.
- Deduplicación: la lógica de `existing refreshKey` previene doble fetch.
- Abort: `loadSummary(true)` se cancela en sign-out / household switch vía signal (silencioso).
- No usar timestamps como señal de refresh — `refreshKey` se incrementa en cada transición autorizada.

## 10. Empty

- Shell empty solo cuando hay cero contenido usable en Summary y `isEmpty=true` sin error.
- Cuando una tab individual está vacía, esa tab conserva su `EmptyState` interno.
- El shell nunca mezcla empty de producto con empty por error offline.
- Acción principal del empty global es `Volver`; no inventa Quick Actions ni formularios en M2.

## 11. Partial

La definición final del state usa `unavailableSections: readonly PlannerSectionKey[]`, alimentada por el grafo de secciones (no disponible aún en M2; la dimensión queda establecida para que M8/M9 conecten `plannerCache.invalidateKind` al resolver). El shell chrome para `partial` lista las secciones afectadas y ofrece `Reintentar`.

## 12. Offline

- `offline_stale`: contenido visible mientras no haya `refreshing`.
- `offline_empty`: chrome que explica falta de conexión; `Reintentar`; no aparece empty de producto.
- Detección de offline: derivada del último `PlannerError.class === 'offline'`. M2 no instala `net-info`.
- Falsa "sincronización" prohibida; la UI nunca afirma actualización sin revalidación puntual.

## 13. Forbidden / Not found / Conflict

- Forbidden: capability `planner.view` denegada. Mensaje claro "Sin acceso a Planner", acción primaria `Salir` (via `onGoBack`) y secundaria `Ajustes`.
- Not found: 404 o contexto inexistente. Mensaje "No encontramos este hogar"; volver al inicio mediante `goBack`.
- Conflict: nunca LWW. El shell conserva el `requestId`; UX sugiere `Recargar` (refetch dirigido de la sección). Form-level conflicts se cierran en M4/M5.

## 14. Recoverable error

- `PlannerShellErrorInfo` reemplaza el shape técnico; el chrome muestra copy según `errorClass` (`timeout`, `server`, `offline`, `validation`, `unknown`).
- `requestId` aparece como texto secundario corto ("Referencia X"), nunca como título principal.
- Abort se descarta: nunca llega al shell.
- Retry dirigido (no loop infinito, no refetch global).
- El cache sano se conserva; el shell nunca limpia cache como respuesta a un error recuperable.

## 15. Fatal render error

- `PlannerErrorBoundary` captura errores del árbol Planner (render), no errores de red ordinarios.
- Genera `errorId` opaco (`pln_<timestampMs>_<rand>`) — sin stack, sin PII.
- Fallback accesible: `accessibilityRole="alert"`, `accessibilityLiveRegion="assertive"`.
- Acciones definidas: `Reintentar` (forzar remount del subtree) y `Salir de Planner` (callback seguro por host).
- Telemetría permitida: expone `onTelemetry('planner_shell_failed', { reason_kind: 'render', incident_id })`. La emisión se delega al consumidor (composition root). El componente mismo no emite — sink vacío por default.

## 16. Lifecycle

- **Household switch**: el shell no muestra datos del hogar previo. `useFocusEffect` con la carga silent termina bien. `loadSummary` aborta silenciosamente; `loadCapabilities` aborta silenciosamente. El estado del chrome se resuelve en `initial_loading` mientras la nueva sesión prepara. La persistencia de tab queda diferida a M6.
- **Sign-out**: `loadSummary`/`loadCapabilities` con `accessToken` falsy: bail-out; `setCapabilitiesReady(false)`. El shell vuelve a `initial_loading`. El usuario no ve `forbidden` intermedio (deny-safe).
- No se duplican handlers de `HomePlus Core` lifecycle. La propietaria sigue siendo Core; el shell solo consume el state.

## 17. Capabilities

- `canViewPlanner(projection)` del adapter M1, deny-safe: `false` si projection = `null` / undefined.
- `capabilitiesReady` deshabilita render de tabs hasta tener projection (no flicker).
- Capabilities como gates de UI; backend revalida.
- No se derivan capacidades desde rol. La separación `view` vs `create` se mantiene para que la apertura de formularios no caiga sobre `planner.view`.

## 18. Telemetría

Aún no se emite ningún evento V1 a un sink real. La estructura deja preparados:

- `planner_shell_failed` (render boundary; ya soportado por el contrato boundary, sin sink activo en M2)
- Posibles `planner_shell_state_changed` (solo si el catálogo V1-M11 los autoriza)

Reglas aplicadas:

- Sin títulos, descripciones, nombres ni queries.
- Sin errores raw ni stack.
- Sin household ID directamente (el boundary emite solo `incident_id`).
- Sin tokens.
- Sin un evento por render.

## 19. Accesibilidad

- `AppText variant="title1"` con `accessibilityRole="header"` sobre el título `Planner`.
- Tabs con `accessibilityRole="tablist"` / `accessibilityState.selected` y `accessibilityLabel` claro.
- Buttons `Reintentar`, `Salir`, action principal: `accessibilityLabel` explícito.
- `accessibilityLiveRegion` puesto en el chrome del shell (`assertive` en boundary, `polite` en state views).
- Minimum touch targets via `touchTargets` token.
- Contraste a través de tokens (`colors.danger.*`, `colors.warning.*`, `colors.terracotta.*`).
- Sin dependencia exclusiva de color: íconos diferencian estados.
- Reduced motion: el refactor no introduce animaciones nuevas; las que vivían en el chrome nativo se mantienen.

Las validaciones runtime de VoiceOver / TalkBack / teclado / safe areas quedan registradas como **`RUNTIME_REQUIRED` — M11**, **NO marcadas como PASS en M2**.

## 20. Compatibilidad

- Compat bridge: la propiedad local del modal de Task/Event en `PlannerScreen.tsx` se conserva hasta que M3 introduzca `PlannerSheetProvider` y `PlannerSheetHost`. Está documentada in-file con bloque comment `// compat-bridge-until-M3` para que M13 cleanup la retire por completo.
- No se introdujo adapter paralelo a M1.
- No se reescribieron contratos V0; el shell consume `plannerKeys`, `plannerCapabilitiesAdapter`, `plannerErrorAdapter` y `requirements` (Core).
- Capabilities adapter ganó dos alias mínimos (`can`, `canAny`, `canAll`) ya documentados en M1 + la función `evaluateQuickActionCapabilities` y el descriptor `QuickActionDescriptor`. Esto completa la superficie de tests M1 (sin alterar contratos ni autoridad).
- Lint verde en frontend (0 errors; warnings pre-existentes preservados).

## 21. Tests

- `scripts/planner_v1_shell_state_tests.ts` — 76 asserts pass.
- Suites en `tests/run.js`:
  - `compile-frontend-tests` — verde.
  - `planner-v1-m2` (compilado) — 76/76.
  - `planner` (queue V0 + M2) — 46 + 76 = verde.
  - `planner-m1` — sigue verde (no tocado).
- Regresión M1: el adapter agregado (`can/canAny/canAll/evaluateQuickActionCapabilities`) queda verificado por el M1 test suite (`planner_v1_capabilities_flags_tests.ts`).

## 22. Comandos

- `npm.cmd run test:planner:m2` — ejecuta compile + shell state M2.
- `npm.cmd run test:planner` — incluye la cola de V0 (46 g0.3) + M2 (76).
- `npm.cmd run quality` — typecheck + lint + frontend + backend + db + ...

Cross-platform: powerShell `npm.cmd`, unix `npm`. Exit codes fiables. Sin dependencias nuevas. Sin salidas no versionadas.

## 23. Archivos

### Creados

- `front/mi-front-limpio/components/planner/PlannerStateView.tsx`
- `front/mi-front-limpio/components/planner/PlannerErrorBoundary.tsx`
- `front/mi-front-limpio/components/planner/index.ts` (re-exports)
- `front/mi-front-limpio/services/planner/plannerShellState.ts`
- `scripts/planner_v1_shell_state_tests.ts`
- `docs/implementation/planner/PLANNER_V1_M2_SHELL_GLOBAL_STATES_REPORT.md`
- `docs/implementation/planner/PLANNER_V1_SHELL_STATE_CONTRACT.md`
- `docs/implementation/planner/PLANNER_V1_ERROR_BOUNDARY_CONTRACT.md`

### Modificados

- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx`
- `front/mi-front-limpio/services/planner/plannerCapabilitiesAdapter.ts` (aliases M1 + `evaluateQuickActionCapabilities`)
- `package.json` (comandos `test:planner:m1` / `test:planner:m2`)
- `tests/run.js` (suites `planner-m1`, `planner-m2`, integración en `planner` y `g0` de quality)
- `scripts/tsconfig.test.json` (incluye `planner_v1_shell_state_tests.ts` y `planner_v1_capabilities_flags_tests.ts`)
- `scripts/planner_v1_capabilities_flags_tests.ts` (cast de proyecciones parciales para alinearse con M1 `PlannerCapabilitiesProjection`)

## 24. Riesgos

- El hardware behavior de `hasUsableContent` se deriva de la respuesta Summary actual. Si el backend cambia los contadores en M8, el shell ya no flicker'ea correctamente. Mitigation: la base es `plannerShellState` que solo requiere `hasUsableContent: boolean`; un celulár de Summary production mantiene la fidelidad.
- `partialSections` queda informativa en M2. Hasta M8 conecte el grafo de sección real, una falla individual de un tab puede no elevar a `partial`; el resolver cae a `recoverable_error` si la sección produjo error global. Esto es esperado: el contrato `partial` existe para el caso donde `summary` produce errores parciales por sección, no por tab. Documentado.
- El boundary timeout permite reintentar pero NO salir del proceso si el sink de telemetría falla; aceptar error sink.

## 25. Rollback

Pasos:

1. `git revert` del commit M2.
2. `git revert` no aplica para `tests/run.js` ni `package.json` si fueron dimensionados antes del commit; restaurarlos con checkout del commit previo `ee3e132`.
3. La base de datos no se ve afectada (sin migraciones).
4. Re-ejecutar `npm.cmd run test:planner` para validar retornos al baseline g0.3 (46 asserts).

## 26. Estado final

```text
M2 STATUS: PASSED
M3 STATUS: AUTHORIZED
```
