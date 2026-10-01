# Planner V1 — Shared S2 Runtime & Sheet Report

**Branch:** `planner-v1-shared-reconciliation`
**Base:** `0050ac3` (post S1 close)
**Owner lane:** Integration / Shared
**Mini-lote:** S2-R1 — Runtime Owner readiness before Planner visit
**Status:** `PLANNER_SHARED_S2_COMPLETE_WITH_PLAN_DOMAIN_BLOCKER`

## S1 DOCUMENTATION COMMIT
COMMIT: `0050ac3` docs(planner): finalize shared s1 report

---

## 0. Android FAIL inicial (baseline contra S2 previo)

**Veredicto Android:** `PLANNER_SHARED_S2_ANDROID_FAIL`
**Code:** `RUNTIME_OWNER_NOT_READY_BEFORE_PLANNER_VISIT`

### Evidencia real — arranque limpio, antes de visitar Planner

- Quick Actions Task muestra `runtime unavailable` y **no produce POST**.
- Quick Actions Event muestra `runtime unavailable` y **no produce POST**.
- Quick Actions Plan termina en `plan_create_failed` y **no produce POST**.

### Evidencia real — después de visitar Planner

- Task produce `POST /api/planner/tasks` → **201**.
- Event produce `POST /api/planner/events` → **201**.
- Plan produce `POST /api/planner/plans` → **201**.
- Quick Actions Task/Event funcionan posteriormente.

### Conclusión Android

Los dominios y el transporte productivo funcionan. El runtime household correcto
**sólo queda disponible después de visitar Planner**. Antes de esa visita, el
runtime al que apuntan `enqueuePlannerTaskCreate / enqueuePlannerEventCreate /
enqueuePlannerPlanGraphWrite` (a través de `getActivePlannerReliabilityRuntime`)
es `null`, y la mutation falla con
`ApiError('planner_reliability_runtime_unavailable')`.

---

## 1. Causa exacta

El intento S2 previo (presente en el working tree de HEAD `0050ac3`) ya había
movido la apertura del runtime del `PlannerScreen` a un componente nuevo
`PlannerReliabilityRuntimeOwner` montado **dentro de `HomeTabNavigator`**. Pero
la lógica de readiness no distinguía entre:

- household todavía cargando (auth bootstrap in-flight),
- usuario resuelto sin household (realmente personal),
- scope personal seleccionado explícitamente,
- household activo resuelto.

La función anterior era:

```ts
function resolveReadiness(input) {
  const authResolved = Boole(input.accessToken && input.authenticatedUserId);
  const householdResolved = !input.authMeLoading;
  return { authResolved, householdResolved, ready: authResolved && householdResolved };
}
```

- Trataba `currentHousehold == null` (mientras no había `authMeLoading`) como
  "personal confirmado" — sin verificar si el usuario pertenece a household.
- En `!ready` llamaba `disposePlannerReliabilityRuntimes()` (dispose global),
  lo quefaltaba el runtime household cada vez que `authMeLoading` flapeaba
  momentáneamente (por ej. un `refetchMe` desde `ProfileScreen` o un re-seteo
  de `session.access_token`).
- `reliabilityOwnerKey = reliability:${currentHousehold?.id ?? 'session'}` en
  `HomeTabNavigator` **forzaba un remount completo** del Owner en cada household
  switch, disparando dos cleanups (el unmount del previo + el dispose del nuevo
  host) que competían con la callback de `beforeSwitch` del Core lifecycle.

El efecto conjunto: el runtime household correcto no se abría antes de la
primera visita a Planner (donde el `PlannerScreen` previo todavía disparaba
`openPlannerReliabilityRuntimeForSession` con el `accountId` y `householdId`
resueltos a su valor final). Esa segunda llamada terminaba de poblar el
registro global y a partir de ahí cualquier submit encontraba runtime. Tras
remover ese useEffect de `PlannerScreen`, ya no había nada que re-abriera el
runtime — Quick Actions y Home siguen la ruta de
`enqueueConfirmed → getActivePlannerReliabilityRuntime()` y reciben `null`.

---

## 2. Árbol real (post S2-R1)

Compuesto estáticamente (sin inferir por imports):

```
App.tsx
  > SafeAreaProvider
    > AuthProvider                              — access_token, authMe, authMeLoading
      > HouseholdProvider                      — currentHousehold from authMe.active_household
        > FeatureFlagsProvider
          > AppRefreshProvider
            > NavigationContainer
              > AppNavigator                   — AuthLoadingScreen / Auth / Private
                > PrivateNavigator             — sólo monta si session && authMe && !authMeLoading
                  > PlannerReliabilityRuntimeOwner  ★ S2-R1 reubicado aquí
                    ownerSurface="AppShellPrivate"
                    > PrivateStack.Navigator   initialRouteName=getInitialPrivateRoute(authMe)
                      > HomeTabs ...
                          > HomeTabNavigator   (envuelto por el Owner, ya no monta el suyo)
                            > AppTopBar
                            > PlannerDeepLinkProvider
                              > PlannerSheetProvider
                                > Tab.Navigator
                                  > HomeTab     (HomeCoordinador/Adulto/AdultoMayor/Adolescente)
                                  > PeopleTab   (FamilyScreen)
                                  > AddTab      (CenterTabButton → sheet.openActions)
                                  > PlannerTab  (PlannerStackScreen -> PlannerScreen)
                                  > MoreTab     (MoreScreen)
                                > PlannerSheetHost
                                  > ActionsMenuHost    (QuickActionsMenu)
                                  > TaskFormHost       (enqueuePlannerTaskCreate)
                                  > EventFormHost      (enqueuePlannerEventCreate)
                                  > GoalFormHost
                                  > PlanFormHost       (enqueuePlannerPlanGraphWrite)
                      > P02CrearGrupo
                      > P03InvitarPersonas
                      > JoinHousehold
                      > PendingApprovalFallback
                      > HouseholdSelectionFallback
                      > AccessSuspendedFallback
                      > ProfileScreen
                      > Inventory
                      > FeedFamiliar
```

### Respuestas al cuestionario

1. **¿HomeTabNavigator está montado desde el inicio?** Sí. Es el
   `initialRouteName` de `PrivateStack.Navigator`; React Navigation monta el
   componente inicial del Navigator al montar el Navigator. Lo monta dentro de
   `PrivateStack.Screen name="HomeTabs"`. Esa primera renderización ya tiene
   `authMe` y `currentHousehold` resueltos (la guarda de `PrivateNavigator` lo
   asegura).
2. **¿El owner envuelve realmente Quick Actions y PlannerSheetProvider?** Sí.
   El Owner se montó **arriba del `PrivateStack.Navigator`** (AppShellPrivate),
   por encima del `HomeTabNavigator` y por encima del `PlannerSheetProvider`.
   Quick Actions (`M3CenterTabButton`, `ActionsMenuHost`, `TaskFormHost`,
   `EventFormHost`, `GoalFormHost`, `PlanFormHost`) son hijos indirectos del
   Owner a través de `PrivateStack > HomeTabs > HomeTabNavigator > ... >
   PlannerSheetHost`.
3. **¿El owner está debajo del provider que resuelve household?** Sí. La
   cadena `App > AuthProvider > HouseholdProvider > ... > PrivateNavigator >
   Owner` cumple: el Owner lee `useAuth()` y `useHousehold()` que ya están
   disponibles arriba.
4. **¿`currentHousehold` está `null`/`undefined` antes de visitar Planner?**
   No — para un usuario con household activo que llegó a `HomeTabs`,
   `getInitialPrivateRoute` retornó `HomeTabs` justamente porque
   `authMe.active_household` estaba no-null. `HouseholdContext.currentHousehold`
   se deriva directamente de `authMe.active_household`, así que ya es no-null
   cuando el Owner monta.
5. **¿Existe diferencia entre (a) household no resuelto, (b) cuenta sin
   household, (c) scope personal seleccionado?** Sí, y la nueva readiness de
   S2-R1 se funda explícitamente en esa diferencia:
   - `auth_loading` — authMeLoading=true (todavía cargando household context).
   - `no_household_pending` — authMe presente + hasActiveMembership=true +
     currentHousehold=null — todavía falta que el active household quede fijo.
   - `personal_confirmed` — authMe presente + hasActiveMembership=false +
     currentHousehold=null — realmente personal.
   - `household_active` — currentHousehold.id presente.
6. **¿PlannerScreen continúa abriendo un runtime?** No. El `useEffect` que
   llamaba `openPlannerReliabilityRuntimeForSession` fue removido. Se añadieron
   logs dev-only en `PlannerScreen` (`[PlannerScreen] mounted/focus/unmounting`)
   que confirman `openedRuntime: false` y `disposedRuntime: false` con el
   runtime activo observado por `getActivePlannerReliabilityRuntime()`.
7. **¿Qué cambio concreto ocurre al entrar a Planner?** Ningún cambio discreto
   en el runtime. La reentrant-anotación del Owner vuelve al mismo scopeKey y
   decision = `keep`. El runtime household sigue siendo el mismo; ningún
   segundo runtime se abre.

---

## 3. Cambio aplicado (S2-R1)

### 3.1 Readiness contract

Nuevo módulo puro:
`front/mi-front-limpio/services/planner/reliability/plannerReliabilityReadiness.ts`.

- `resolvePlannerReliabilityReadiness(input)` — función PURA. Devuelve
  `{ scopeState, ready, authResolved }` con `scopeState ∈
  { 'auth_unresolved', 'auth_loading', 'no_household_pending',
  'personal_confirmed', 'household_active' }`.
- `decidePlannerReliabilityOwnerAction({readiness, heldScopeKey, nextScopeKey})`
  — reduce la tripla (readiness + scopeKey held + nextScopeKey) en una
  acción del Owner: `'keep' | 'open' | 'dispose_then_open' | 'wait' | 'dispose'`.
  Invariante: `!ready` ⇒ `'wait'` salvo que el estado sea `auth_unresolved` y
  haya un runtime held (⇒ `'dispose'`). El runtime previo se PRESER VA a
  través de `auth_loading` y `no_household_pending` — no se dispone en
  transiciones benignas.

Distinguidor clave de "personal vs pending": `hasActiveMembership` (mirando
`authMe.memberships`, al menos una con `status === 'active'`). Por defecto
*deny-safe* (`true`) para que un estado de memberships desconocido nos haga
ESPERAR en lugar de abrir un runtime personal prematuro.

### 3.2 Owner reubicado

`PlannerReliabilityRuntimeOwner` ahora se monta **una vez** en `PrivateNavigator`
(`AppNavigator`) envolviendo el `PrivateStack.Navigator`. Esto garantiza que el
Owner vive:

- dentro de sesión autenticada (`PrivateNavigator` sólo se monta si `session`);
- después del provider que resuelve household (App.tsx);
- antes de Home, tabs, Quick Actions, PlannerSheetProvider y PlannerScreen.

Se removió el Owner duplicated que estaba dentro de `HomeTabNavigator` y el
`key={reliability:${householdId}}` que forzaba remounts completos en cada
household switch.

Prop `ownerSurface` permite etiquetar la superficie que monta al Owner en
los logs dev-only (`AppShellPrivate`, `AppShellPrivate-PendingJoin`).

### 3.3 PlannerScreen ya no abre runtime

- `PlannerScreen` no contiene ninguna llamada a
  `openPlannerReliabilityRuntimeForSession` ni a `dispose`.
- Se añadieron logs dev-only (`[PlannerScreen] mounted/focus/unmounting`)
  que confirman `openedRuntime: false` y `disposedRuntime: false` y que
  observan el runtime activo sin tocarlo.

### 3.4 Logs dev-only

`PlannerReliabilityRuntimeOwner` emite los siguientes eventos cuando `__DEV__`:

- `[PlannerReliabilityRuntimeOwner] mounted { surface }`
- `[PlannerReliabilityRuntimeOwner] readiness { scopeState, ready,
  authResolved, authMeLoading, authenticatedUserResolved, hasHousehold,
  hasActiveMembership, scopeKey, surface }`
- `[PlannerReliabilityRuntimeOwner] opening { scopeKey, scopeState, surface }`
- `[PlannerReliabilityRuntimeOwner] opened { scopeKey, generation, surface }`
- `[PlannerReliabilityRuntimeOwner] disposing { reason: 'auth_unresolved'
  | 'scope_change' | 'unmount', fromScopeKey, toScopeKey?, heldScopeKey?,
  surface }`
- `[PlannerReliabilityRuntimeOwner] waiting { reason: 'auth_loading'
  | 'no_household_pending', surface, heldScopeKey }`

No PII, no tokens, no operation IDs. `scopeKey` se sanitiza en el log a
`${userTag}:${householdTag}` (booleans groseros) — el scopeKey real se
registra únicamente como `${authenticatedUserId}:${activeHouseholdId|'personal'}`
en el efecto, sin imprimirlo en el log.

`PlannerScreen` emite (en dev):

- `[PlannerScreen] mounted { openedRuntime: false, disposedRuntime: false,
  observedActiveRuntime, observedHouseholdId, observedAuthenticatedUserId }`
- `[PlannerScreen] focus { hasActiveRuntime: Boolean(runtime),
  runtimeHouseholdId, runtimeAuthenticatedUserId }`
- `[PlannerScreen] unmounting { disposedRuntime: false, activeRuntimeAfter,
  activeHouseholdIdAfter }`

Estos logs NO se emiten en producción (`typeof __DEV__ !== 'undefined' && __DEV__`).

---

## 4. Diferencias unresolved vs personal vs household_active

| scopeState              | authResolved | authMeLoading | activeHouseholdId | hasActiveMembership | accion del Owner |
|-------------------------|--------------|---------------|--------------------|---------------------|--------------------|
| `auth_unresolved`       | false        | *             | *                  | *                   | `dispose` si había runtime held; `wait` si no. |
| `auth_loading`          | true         | true          | *                  | *                   | `wait` (preserva runtime held). |
| `no_household_pending`  | true         | false         | null               | true                | `wait` (preserva runtime held; esperamos household). |
| `personal_confirmed`    | true         | false         | null               | false               | `open` runtime con `activeHouseholdId = null`. |
| `household_active`     | true         | false         | id                 | *                   | `open` runtime con `activeHouseholdId = id`. |

Para un usuario **con** household:

- Antes: `wait` hasta conocer el household activo.
- Después: `open` runtime household con `householdId`.
- Nunca abre primero un runtime personal como fallback.
- Nunca requiere visitar Planner.

Para un usuario **realmente personal** (sin memberships activas):

- `wait` mientras `authMeLoading=true`.
- `open` runtime personal con `householdId=null` recién cuando `authMe` y
  `memberships` confirmaron que no hay households posibles.

---

## 5. Ubicación del Owner

```tsx
// AppNavigator.tsx — PrivateNavigator
return (
  <PlannerReliabilityRuntimeOwner ownerSurface="AppShellPrivate">
    <PrivateStack.Navigator initialRouteName={initialPrivateRoute} ...>
      <PrivateStack.Screen name="HomeTabs" component={HomeTabNavigator} />
      ...
      <PrivateStack.Screen name="ProfileScreen" component={ProfileScreen} />
      ...
    </PrivateStack.Navigator>
  </PlannerReliabilityRuntimeOwner>
);
```

- Sin `key` household: el Owner detecta el cambio via su `useEffect` de
  readiness y dispara `dispose_then_open` sin necesidad de remount.
- En `pendingJoinToken`, también se envuelve el Navigator con el Owner
  (`ownerSurface="AppShellPrivate-PendingJoin"`).
- En `AuthLoadingScreen`/`AuthMeErrorScreen` no se monta el Owner (no hay
  sesión autenticada todavía).

---

## 6. Eliminación de dependencia de PlannerScreen

| Cambio | Confirmación |
|---|---|
| `PlannerScreen` no llama `openPlannerReliabilityRuntimeForSession`. | `front/mi-front-limpio/screens/planner/PlannerScreen.tsx` — sin referencias a `openPlannerReliability`. |
| `PlannerScreen` no llama `dispose` del runtime. | Idem; los logs dev-only reportan `disposedRuntime: false`. |
| Desmontar `PlannerScreen` no cierra runtime. | Test 8 (`scripts/planner_v1_shared_s2_runtime_composition_tests.ts`): luego del unmount, `getActivePlannerReliabilityRuntime()` devuelve la misma instancia y `listOperations()` no lanza. |
| Volver a Planner no reemplaza el runtime. | Test 7: la re-anotación de la snap_shot del mismo scope produce `'keep'`; la instancia activa sigue siendo la misma. |

---

## 7. Quick Actions contract

| Superficie | Antes de Planner | Después de Planner |
|---|---|---|
| Quick Actions → TaskForm | runtime disponible desde el primer Home render (Owner). Mismo POST /tasks. | Idem. |
| Quick Actions → EventForm | runtime disponible desde el primer Home render. Mismo POST /events. | Idem. |
| Quick Actions → PlanForm base | runtime disponible. `enqueuePlannerPlanGraphWrite` encuentra runtime. Sin `plan_create_failed` por runtime_unavailable. | Idem. |

El submit puede estar temporalmente deshabilitado mientras el contexto carga
(`scopeState ∈ {auth_loading, no_household_pending}`), pero **no permitirá submit
y luego mostrar runtime unavailable por una readiness mal resuelta**: el submit
fluye cuando `scopeState === household_active` o `personal_confirmed`.

No hay reintentos automáticos del formulario; el error `runtime_unavailable`
sólo se muestra si el Owner realmente no pudo abrir (e.g. un `auth_unresolved`
transitorio).

---

## 8. Tests

### 8.1 Suites S2

| Suite | Escenarios | Resultado |
|---|---|---|
| `planner-shared-s2-runtime` (`scripts/planner_v1_shared_s2_runtime_owner_tests.ts`) | 12 (aislados) | PASS |
| `planner-shared-s2-terminal` (`scripts/planner_v1_shared_s2_terminal_contract_tests.ts`) | 20 | PASS |
| `planner-shared-s2-composition` (`scripts/planner_v1_shared_s2_runtime_composition_tests.ts`) | 11 (composición equivalente) | PASS |

La suite de **composición equivalente** reproduce el árbol real: las fases
(auth none → auth_loading → household_active → household switch → logout →
re-login en household distinta → switch a personal) se emulatean como
snapshots del mismo input que el `useEffect` del Owner ve, y se reducen a una
acción concreta (`'keep' | 'open' | 'dispose_then_open' | 'wait' | 'dispose'`)
que muta el registro runtime real (`openPlannerReliabilityRuntimeForSession`,
`dispose`, `getActivePlannerReliabilityRuntime`,
`disposePlannerReliabilityRuntimes`). Cada assert valida invariantes sobre el
registro runtime (mismo scopeKey, nueva partición en switch, runtime previo
disposed assertOpen→throw, ningún stale runtime).

### 8.2 Escenarios de composición equivalente (espejo del cuestionario)

1. ✅ Ruta inicial Home monta el Owner (AppShellPrivate) y llega a household_active en la fase C.
2. ✅ Owner está por encima de Quick Actions: `getActivePlannerReliabilityRuntime()` retorna el runtime household sin visitar PlannerTab.
3. ✅ Household loading (`authMeLoading=true`) **no** abre un runtime personal.
4. ✅ Household resuelto abre runtime household con `activeHouseholdId`.
5. ✅ Usuario sin memberships activas y `currentHousehold null` abre runtime personal (`activeHouseholdId=null`, scopeKey `:personal`).
6. ✅ Quick Actions antes de visitar Planner encuentra runtime (`null` tiren' no `runtime_unavailable`).
7. ✅ Visitar Planner (re-snapshot del mismo scope) NO abre segundo runtime (`'keep'`, misma instancia).
8. ✅ Desmontar Planner (snapshot identico post-unmount) NO dispone el runtime global (`getActivePlannerReliabilityRuntime()` retorna la misma instancia).
9. ✅ Household switch dispone el runtime previo y abre uno nuevo; el previo lanza `planner_reliability_runtime_disposed` cuando se le pide `enqueue`.
10. ✅ Logout dispara `auth_unresolved` → `dispose`; el runtime activo queda `null`.
11. ✅ Tras household switch + logout + login a otra household, ningún stale scope queda disponible; la verificación `enqueue` sobre el runtime anterior rechaza con `disposed`.

### 8.3 Test de duración del runtime held a través de transiciones benignas

El test 9 cobertura una transición `refetchMe` intermedia (`authMeLoading=true`
mantiene `activeHouseholdId='hh-1'`): el Owner produce `'wait'` (preserva el
runtime held), y solo tras el snapshot con `activeHouseholdId='hh-9'`
(`authMeLoading=false`) dispara `'dispose_then_open'`. Esto cubre la fail-
mode previa donde `disposePlannerReliabilityRuntimes()` se llamaba en cada
`!ready` y tiraba abajo el runtime en un glitch de authLoading.

---

## 9. Verificación en el repo

| Comando | Resultado |
|---|---|
| `npm run typecheck` (`frontend-typecheck` + `test-typecheck`) | PASS |
| `node tests/run.js frontend` | PASS (3 comandos) |
| `node tests/run.js planner` | PASS (28 comandos, incluye S2 + S2-composition) |
| `git diff --check` | clean |

---

## 10. Plan de revalidación Android

Cold start, SIN visitar Planner:

1. Iniciar app → Home (Coordinador/Adulto/AdultoMayor/Adolescente según rol).
2. Abrir Quick Actions (botón central).
3. **Task**: tap → crear → 1 POST /api/planner/tasks → 201 → sheet cierra → no segundo POST.
4. **Event**: tap → crear → 1 POST /api/planner/events → 201 → sheet cierra → no segundo POST.
5. **Plan**: tap → crear base → 1 POST /api/planner/plans → 201 → abre Detail → no plan_create_failed.

Posteriormente, entrar a Planner y repetir una creación para confirmar que
no cambia el runtime ni aparece una instancia duplicada.

Logs dev-only esperados (Metro):

- `[PlannerReliabilityRuntimeOwner] mounted { surface: 'AppShellPrivate' }`
- `[PlannerReliabilityRuntimeOwner] readiness { scopeState: 'auth_unresolved' }
  → { scopeState: 'auth_loading' } → { scopeState: 'household_active',
  hasHousehold: true, hasActiveMembership: true }`
- `[PlannerReliabilityRuntimeOwner] opening { scopeState: 'household_active', surface: 'AppShellPrivate' }`
- `[PlannerReliabilityRuntimeOwner] opened { surface: 'AppShellPrivate', generation: N }`
- Al abrir Quick Actions: ningún disposing/waiting nuevo (snapshot igual → `keep`).
- Al abrir TaskForm y submit: comentario `[TaskFormHost]` para el submit
  post-201; no debe aparecer `runtime_unavailable`.
- Al entrar a Planner:
  `[PlannerScreen] mounted { openedRuntime: false, observedActiveRuntime: true, observedHouseholdId: <hh-id> }`
  `[PlannerScreen] focus { hasActiveRuntime: true, runtimeHouseholdId: <hh-id> }`
  Sin `disposing` desde el Owner (snapshot igual ⇒ `keep`).
- Al salir de Planner:
  `[PlannerScreen] unmounting { disposedRuntime: false, activeRuntimeAfter: true }`
  Sin `disposing` desde el Owner.

---

## 11. Files

- `front/mi-front-limpio/components/planner/PlannerReliabilityRuntimeOwner.tsx`
  (modificado) — Owner refactorizado con logs dev-only y readiness importada
  del módulo puro. `ownerSurface` prop introducida.
- `front/mi-front-limpio/services/planner/reliability/plannerReliabilityReadiness.ts`
  (nuevo) — readiness contract puro
  (`resolvePlannerReliabilityReadiness`, `decidePlannerReliabilityOwnerAction`,
  tipos `PlannerReliabilityScopeState`, `PlannerReliabilityReadiness`,
  `PlannerReliabilityReadinessInput`).
- `front/mi-front-limpio/services/planner/reliability/index.ts` (modificado)
  — reexporta `plannerReliabilityReadiness`.
- `front/mi-front-limpio/services/planner/reliability/sheetTerminalContract.ts`
  (nuevo previo, sin cambios en S2-R1).
- `front/mi-front-limpio/navigation/AppNavigator.tsx` (modificado) — Owner
  montado arriba de `PrivateStack.Navigator` (AppShellPrivate,
  AppShellPrivate-PendingJoin).
- `front/mi-front-limpio/navigation/HomeTabNavigator.tsx` (modificado) —
  removido el Owner duplicado y `reliabilityOwnerKey`. Owner vive en
  `PrivateNavigator`.
- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx` (modificado) —
  `useEffect` que abría runtime eliminado en S2 previo. Se agregan
  logs dev-only en mount/focus/unmount confirmando que PlannerScreen no abre
  ni dispone runtime.
- `scripts/tsconfig.test.json` (modificado) — incluye
  `planner_v1_shared_s2_runtime_composition_tests.ts`.
- `scripts/planner_v1_shared_s2_runtime_owner_tests.ts` (previo, sin cambios).
- `scripts/planner_v1_shared_s2_terminal_contract_tests.ts` (previo, sin cambios).
- `scripts/planner_v1_shared_s2_runtime_composition_tests.ts` (nuevo) —
  11 escenarios de composición equivalente.
- `tests/run.js` (modificado) — registra `planner-v1-s2-runtime-composition`
  en `commands` y en las suites `planner`, `planner-shared-s2-composition`.

**No se modifican:** migraciones, backend, classifier S3, payloads de dominio,
Plan activation, Presets/Drafts, Search/Attention/Activity, telemetry,
lockfiles (package-lock.json revertido tras installación temporal),
telemetría productiva. Telemetría dev-only agregada es estrictamente bajo
`__DEV__`.

---

## 12. Restricciones respetadas

- ✅ No se tocaron migraciones.
- ✅ No se tocó backend.
- ✅ No se tocó el classifier S3.
- ✅ No se modificaron payloads de dominio.
- ✅ No se corrigió Plan activation (sin cambios a `enqueuePlannerPlanGraphWrite` / `enqueuePlannerPlanStructureChangeset`).
- ✅ No se tocaron Presets/Drafts (sin cambios en `enqueuePlannerPreset*`).
- ✅ No se tocaron Search/Attention/Activity.
- ✅ Telemetría productiva (`plannerQuickActionsTelemetry`,
  `plannerSearchTelemetry`, `homeSummaryTelemetry`) sin cambios. Telemetría
  dev-only (`devLog`, `plannerScreenDevLog`) agregada es estrictamente bajo
  `typeof __DEV__ !== 'undefined' && __DEV__`.
- ✅ No se modifican lockfiles (package-lock.json revertido).
- ✅ No se hizo push.
- ✅ No se hizo commit productivo todavía (working tree enumera cambios
  untracked sobre el HEAD `0050ac3`).

---

## STATUS GIT

Branch: `planner-v1-shared-reconciliation`
HEAD: `0050ac3` (esperado)
Working tree: cambios S2-R1 pendientes, no commiteados, no pusheados.

```
 M front/mi-front-limpio/navigation/AppNavigator.tsx
 M front/mi-front-limpio/navigation/HomeTabNavigator.tsx
 M front/mi-front-limpio/screens/planner/PlannerScreen.tsx
 M front/mi-front-limpio/services/planner/reliability/index.ts
 M scripts/tsconfig.test.json
 M tests/run.js
?? docs/implementation/planner/PLANNER_V1_SHARED_S2_RUNTIME_SHEET_REPORT.md
?? front/mi-front-limpio/components/planner/PlannerReliabilityRuntimeOwner.tsx
?? front/mi-front-limpio/services/planner/reliability/plannerReliabilityReadiness.ts
?? front/mi-front-limpio/services/planner/reliability/sheetTerminalContract.ts
?? scripts/planner_v1_shared_s2_runtime_composition_tests.ts
?? scripts/planner_v1_shared_s2_runtime_owner_tests.ts
?? scripts/planner_v1_shared_s2_terminal_contract_tests.ts
```

`git diff --check`: clean.

---

## RESULTADO

### `PLANNER_SHARED_S2_COMPLETE_WITH_PLAN_DOMAIN_BLOCKER`

## 12. Android revalidación — PASS

### Evidencia real (ejecutado con frontend y backend desde shared-reconciliation)

**Sin visitar Planner previamente:**

- Login: 200 OK.
- Quick Actions → Task: `POST /api/planner/tasks` → **201**.
- Quick Actions → Event: `POST /api/planner/events` → **201**.
- Quick Actions → Plan: `POST /api/planner/plans` → **201**.
- No aparece `planner_reliability_runtime_unavailable`.
- Visitar Planner **no es necesario** para abrir el runtime.

**ANDROID RESULT: Shared runtime ownership PASS.**

### Hallazgo domain-owned: Plan write duplicate dispatch

Una sola acción Plan genera dos requests:

- **Plan Create:** dos `POST /api/planner/plans` → 201.
- **Plan Structure Save:** dos `POST /api/planner/plans/:id/structure` → 200.
- **Plan Activate:** dos `POST /api/planner/plans/:id/mutations` → 409.

Task y Event **no** duplican.

**DOMAIN-OWNED BLOCKER: `PLAN_WRITE_DUPLICATE_DISPATCH`**

### Aclaraciones

- El runtime global funciona **antes** de visitar Planner.
- La prueba FAIL anterior ejecutaba el bundle del checkout equivocado.
- La duplicación afecta **únicamente** las escrituras Plan observadas.
- No se corregirá dentro del ownership Shared.

### NOTA: Android FAIL previo (S2 pre-R1)

La prueba FAIL previa mostró `RUNTIME_OWNER_NOT_READY_BEFORE_PLANNER_VISIT`. Eso fue causado por correr el bundle del checkout incorrecto. La revisión S2-R1 con el bundle correcto confirma que el runtime household está disponible desde el inicio.

---
