# HomePlus Core Lifecycle Contract

**Versión:** G0.3.1
**Owner:** HomePlus Core
**Implementación:** `front/mi-front-limpio/services/core/lifecycle.ts`
**Branch:** `homeplus-core-infrastructure-parity`
**Commit auditado:** `6a018a577530d2cb28135afc41deaab59ba81d14`
**Estado:** `G0.3.1 STATUS: PASSED`

## Invariants

1. Auth y Household no conocen dominios concretos.
2. Los handlers se registran en el composition root, no dentro de contexts.
3. Orden menor ejecuta primero; empate se resuelve por nombre.
4. Cambiar household invalida el contexto anterior antes de aceptar writes nuevos.
5. Una respuesta capturada en una generación anterior no puede escribir en la actual.
6. Sign-out es idempotente y los cleanups concurrentes comparten ejecución.
7. Un handler fallido no impide ejecutar los siguientes cleanups de sesión.

## Household switch

Entrada:

```ts
runHouseholdSwitch({
  fromHouseholdId,
  toHouseholdId,
  activate: () => Promise<T>,
})
```

Secuencia:

```text
validate current selection
  -> beforeSwitch (ordered)
      -> cancel registered requests
          -> activateNewHousehold
              -> refresh canonical AuthMe/Household context
                  -> afterSwitch (ordered)
                      -> clear old Planner scope + advance generation
```

Si `beforeSwitch` o `activate` falla, se ejecuta `rollbackSwitch` para los handlers preparados en orden inverso y se propaga el error. La UI no cambia `currentHousehold` hasta que `setActiveHousehold` y `refetchMe` terminan, por lo que A permanece canónico si activar B falla.

Los errores de `afterSwitch` se acumulan en el resultado porque la activación del backend ya ocurrió; no se finge rollback remoto. Los consumidores pueden informar degradación y recargar, sin volver silenciosamente a un household que el servidor ya dejó de considerar activo.

## Session lifecycle

Entrada:

```ts
markSessionActive();
await runSessionCleanup();
```

Secuencia de sign-out:

```text
backend logout attempt
  -> Core cancelAll requests
      -> domain cleanup handlers
          -> clear state + advance generation
              -> local Supabase signOut
                  -> clear AuthMe
```

`markSessionActive` habilita una nueva ejecución. Después del primer cleanup completo, invocaciones repetidas devuelven `[]`. Invocaciones simultáneas reciben la misma promise. Cada error se devuelve en el array de resultados y no detiene otros handlers.

## Registered handlers

| Nombre | Order | Household | Session | Ownership |
| --- | ---: | --- | --- | --- |
| `core.requests` | 10 | cancela requests antes de switch | cancela requests | Core transport |
| `planner.server-state` | 100 | limpia scope anterior y avanza generación después de activar | limpia cache/mutations y avanza generación | Planner adapter |

Home, Profile y Household no registran cleanup porque no mantienen un server-state cache propio. Inventory conserva estado de pantalla y una suscripción realtime cuyo cleanup pertenece al ciclo de montaje de la pantalla; su migración a un handler global se difiere hasta que exista state fuera de la pantalla.

## Cancellation

Cada `requestJson` crea un `AbortController` interno, encadena el signal externo, programa timeout opcional y se registra en `appRequestRegistry`. En `finally`:

- elimina el timer;
- elimina el listener externo;
- desregistra el controller.

Un abort produce `AbortError`, no `ApiError`. El caller puede tratarlo como navegación/cambio de contexto, no como falla funcional.

## Idempotency and safety

- Registrar dos veces el mismo nombre reemplaza el handler anterior.
- `registerLifecycleHandlers` tiene guard de inicialización.
- `clearScope` y `clearSession` toleran estado vacío.
- La generación nunca disminuye en producción.
- Rollback de optimistic state restaura todas las keys capturadas, incluidas keys que no existían.

## Tests

`scripts/homeplus_core_frontend_tests.ts` verifica orden, rollback, cancelación scoped/global, snapshot multi-key, late-response y cleanup once-per-session. `scripts/planner_g0_3_cache_tests.ts` verifica además aislamiento A/B y políticas de invalidación Planner.

Comando:

```powershell
npm.cmd run test:core
```

## Blocker closure evidence

El lifecycle no requirió rediseño. El cierre añadió evidencia G0.2 real: fixture local efímero, sesión child generada en memoria, 115 assertions y cleanup completo con exit code 0. Los tres contratos G0.2 reconstruidos documentan el transporte/capabilities usado por esta infraestructura. G0.3 y los boundary tests se reejecutaron; no se persistieron credenciales.

Las correcciones de closure quedaron fuera del lifecycle: nombre del handler de capabilities y harness runtime G0.2. Los handlers household/session y su orden permanecen sin cambios.

## G0.4 feature projection lifecycle

`core.feature-flags` runs after request cancellation and before Planner server-state cleanup. After a successful household switch it removes the old household projection; `FeatureFlagsProvider` loads the new authenticated server projection. Session cleanup clears every account/household flag projection. Missing/error state is `{}` and therefore deny-safe.
