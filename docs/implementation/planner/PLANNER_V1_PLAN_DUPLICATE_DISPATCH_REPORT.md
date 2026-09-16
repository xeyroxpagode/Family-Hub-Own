# Planner V1 — PLAN-DUP-01 Duplicate Dispatch Report

**Worktree:** `C:\Users\thega\Desktop\HomePlus-worktrees\plans-reconciliation`
**Branch:** `planner-v1-plans-reconciliation`
**Base:** `0e91879` (`SHARED_S2_COMMIT`)
**Status:** `READY_FOR_ANDROID_VALIDATION`

## Evidencia Android — CHECKPOINT

### Create: PASS

Cada apertura independiente del formulario produjo:
- una identidad nueva;
- un handler;
- un enqueue;
- una ejecución de adapter;
- un POST /api/planner/plans;
- un callback terminal.

No hubo duplicación.

### Activate: PASS_SINGLE_DISPATCH

Un toque produjo:
- un handler;
- un intent;
- un enqueue;
- una ejecución;
- un POST /api/planner/plans/:id/mutations;
- un único 409 invalid_transition;
- un único callback terminal.

El 409 es esperado por ausencia de estructura válida. No representa falla de single dispatch.

### Structure: NOT_EXERCISABLE

STRUCTURE_RUNTIME_VALIDATION_BLOCKED_BY_EMPTY_EDITOR

La pantalla actual de edición estructural no permite agregar ningún:
- hito;
- requisito;
- medición;
- condición;
- tarea;
- evento;
- vínculo estructural.

Por lo tanto no fue posible producir un changeset real ni validar manualmente
POST /api/planner/plans/:id/structure.

Esto no debe marcarse como PASS ni como FAIL de single dispatch.

### Android pre-fix

Android observó una sola acción humana con requests duplicados:

- Plan Create: dos `POST /api/planner/plans` → 201.
- Plan Structure: dos `POST /api/planner/plans/:id/structure` → 200.
- Activate: dos `POST /api/planner/plans/:id/mutations` → 409.

Task y Event no duplicaban. Shared S2 quedó fuera de causa: el runtime global estaba abierto antes de visitar Planner.

## Identidad

La duplicación pre-fix podía generar identidades diferentes:

- Plan Create creaba `createPlanWriteIntent(request)` dentro de cada submit callback.
- Plan Structure dependía de `pendingIntent` en state; dos callbacks antes del commit de React podían ver `null` y crear dos intents distintos.
- Plan Activate creaba `createPlanWriteIntent(request)` dentro de cada lifecycle handler.

Por eso Reliability veía operaciones legítimas distintas, no un replay deduplicable.

## Etapa de duplicación

La conversión de una acción en dos ocurría antes de Reliability:

1. UI handler / submit callback podía entrar más de una vez durante la ventana in-flight.
2. Cada entrada creaba o podía crear identidad propia.
3. Cada identidad ejecutaba su propio `enqueuePlannerPlan*`.
4. El runtime y adapter ejecutaban una vez por operación recibida.

No hay evidencia de backend duplicando un único request ni de runtime ejecutando dos veces una misma operación.

## Comparación V1

Referencia revisada: `f093bffaa7a7db6db7fc1b0072ba90352325a90a`.

- Una acción producía un create/transition desde handler directo.
- El bloqueo vivía en estado local del formulario/acción.
- La navegación a Detail ocurría después del terminal exitoso.
- Las acciones se ejecutaban directamente desde handlers, sin Reliability.

Clasificación:

- `KEEP_CURRENT`: mantener transporte Reliability.
- `REIMPLEMENT_WITH_RELIABILITY`: conservar handler directo, pero con single-flight estructural.
- `FIX_INTENT_STABILITY`: identidad estable por intención humana.
- `FIX_RUNTIME_DISPATCH`: no aplicado; runtime no fue la causa.
- `REMOVE_DUPLICATE_HOST`: no aplicado; no se confirmó host duplicado.
- `REMOVE_EFFECT_SIDE_EFFECT`: no aplicado; no se detectó escritura productiva en effect.

## Causa

Plans no tenía el mismo contrato de entrada única que Task/Event:

- Create: identidad creada dentro del submit callback y sin guard síncrono por intención.
- Structure: guard dependía de `submitting`/`pendingIntent` de React state, no de una adquisición síncrona.
- Activate: lifecycle handler sin single-flight por plan/transition/version.

React state no es una barrera síncrona entre dos callbacks del mismo gesto/tap rápido. Cuando entraban dos callbacks, Reliability recibía dos operaciones con identidad distinta.

## Corrección

- Nuevo `createPlanWriteSingleFlightGate()` puro para adquirir/liberar una operación in-flight de forma síncrona.
- Plan Create ahora crea una identidad estable por apertura de sheet y bloquea una segunda entrada mientras está in-flight.
- Structure Save usa gate síncrono y `pendingIntentRef` para que retry conserve identidad y callbacks simultáneos no creen una segunda.
- Activate/lifecycle usa gate por `planId:transition:version` antes de crear intent y enqueuear.
- Se agregó instrumentación dev-only `[PlanWriteTrace]` con tags cortos para surface, stage, mutation, idempotency, local operation y plan.
- No se cambió backend, reglas de activación, Tasks/Events, Presets/Drafts ni UX general de Plans.

## Tests

Ejecutados:

- `npm run typecheck` — PASS.
- `node tests/run.js planner-plan-duplicate-dispatch` — PASS, 14 assertions.
- `npm run test:frontend` — PASS.
- `npm run test:planner` — PASS, incluye `planner-v1-plan-duplicate-dispatch`.
- `git diff --check` — PASS.

Suite agregada:

- `scripts/planner_v1_plan_duplicate_dispatch_tests.ts`.
- Cubre single dispatch, double tap in-flight, stale terminal callback, terminal release y nueva identidad post-terminal.

## CONCLUSIÓN

La duplicación en Create y Activate quedó corregida.
La defensa Structure tiene tests focalizados, pero su validación Android queda
pendiente hasta que exista un editor estructural funcional.

## Resultado

`PLANNER_V1_PLAN_DUPLICATE_DISPATCH_CHECKPOINT_READY`
