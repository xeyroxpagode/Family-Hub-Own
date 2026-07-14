# Planner V1 — especificación final previa a implementación

> **V1 STATUS: NOT READY**
> Auditoría ejecutada: 2026-07-14T00:41:20-03:00
> Repositorio: `C:/Users/thega/Desktop/HomePlus`
> Rama: `v1`
> Commit auditado: `a9d869b5755a90188dd8b964506251e56af74632`

## 1. Dictamen

No se puede iniciar la implementación de Planner V1 sobre el estado auditado. V0 dejó disponibles la identidad canónica de miembro y la resolución server-side del hogar activo, y dejó implementaciones locales útiles de `version` e idempotencia. Sin embargo, faltan contratos públicos que V1 consume de manera directa: capabilities de Planner, feature flags, cache/query keys segregadas por hogar, invalidación dirigida, `X-Mutation-Id`, outbox/auditoría durable y una base automatizada de tests. Además, las migraciones de Planner V0 están presentes y pasan los checks en la base local, pero no aparecen aplicadas en la base remota consultada.

Estas carencias no pueden ocultarse con permisos por rol en frontend, refetch global, flags constantes, eventos de consola ni dobles escrituras best-effort. Hacerlo violaría las fuentes normativas. Primero debe cerrarse el gate V0 descrito en este documento y en `planner_v1_v0_contract_check.md`.

No se rediseña V1. Las decisiones físicas siguientes fijan dónde debe implementarse cada pieza una vez que el gate V0 esté cerrado.

## 2. Autoridad y alcance

Fuentes, en orden de autoridad:

1. `docs/polish-final/planner_final_polish.md`, leído desde `HEAD` porque el sparse checkout no lo materializa.
2. `docs/polish-final/planner_final_gap_map.md`, leído desde `HEAD` por la misma razón.
3. Código, migraciones y documentos V0 del commit auditado.
4. `planner_v1_implementation_ready_draft.md`, convertido por esta auditoría y no usado para contradecir evidencia.

El commit normativo `5a04a47db9c98f725515ed3fb3d02965504aa8ab` es ancestro de `HEAD`. Esta auditoría verifica solamente las bases V0 necesarias para V1. V2, V3 y V4 quedan fuera de alcance salvo dependencias públicas que bloqueen V1.

## 3. Evidencia de V0 consumida por V1

| Contrato | Estado auditado | Evidencia real | Consecuencia para V1 |
|---|---|---|---|
| Identidad canónica | AVAILABLE | `backend/src/services/planner/planner.context.service.js` resuelve `userId`, `householdId`, `membershipId` | Puede usarse sin alias de miembro |
| Hogar activo server-side | AVAILABLE | El mismo servicio valida hogar y membresía activa | Ningún payload V1 debe enviar `householdId` como autoridad |
| Membresía y capabilities | PARTIAL | Existe rol/membresía; no existe proyección ni verificación de capabilities Planner | Bloquea acciones, Search, estados y seguridad UI/API |
| Errores tipados | PARTIAL | Controladores devuelven envelopes planos `{ error, code }`; faltan envelope canónico, `request_id` consistente y cobertura de estados | Bloquea estados globales y observabilidad confiable |
| `version` / concurrencia | PARTIAL | Columnas, triggers, RPCs y `If-Match` existen localmente; el contrato V0 admite ausencia del header y el remoto no tiene las migraciones | No hay garantía deployable |
| Idempotencia | PARTIAL | `Idempotency-Key` y store/RPC existen localmente; migración remota ausente | Mutaciones no tienen garantía deployable |
| Headers de mutación | PARTIAL | `Authorization`, `Idempotency-Key` e `If-Match` aparecen; `X-Mutation-Id` no existe | Bloquea correlación y deduplicación completa |
| Feature flags | MISSING | No se encontró registro, servicio ni nombre real de flag | Search debe permanecer inaccesible |
| Cache por hogar | MISSING | GET usa `no-store`; frontend usa timestamps de refresh, no cache de entidades | Bloquea aislamiento, switch y optimismo seguro |
| Invalidación dirigida | MISSING | `AppRefreshContext` dispara refetch global por timestamps | Bloquea resumen y one-tap conforme a norma |
| Telemetría base | PARTIAL | `plannerObservability.js` registra latencia/error en desarrollo; no existe proveedor de eventos de producto | Bloquea matriz de eventos V1 |
| Audit/outbox | PARTIAL | Existe `planner_activity_log` best-effort; no hay outbox ni auditoría durable | Bloquea side effects confiables |
| Cancelación/archivo/trash | PARTIAL | Cancelación y trash existen; archivo no está modelado como contrato separado | No extender V1 a archivo sin base explícita |
| Migraciones aplicadas | PARTIAL | Local llega a `20260713005000`; remoto se detiene en `202607050001` | Gate de despliegue bloqueado |
| Tests V0 | PARTIAL | Hay SQL manual/documental; no hay runner ni archivos automatizados | No existe red de regresión para empezar V1 |
| Compilación/lint | PARTIAL | Frontend TypeScript pasa; backend syntax pasa; ESLint backend tiene 4 errores existentes | Baseline no está completamente verde |
| Compatibilidad cliente-servidor | PARTIAL | CRUD básico coincide; Summary, errores, cache y headers no cumplen contrato V1 | Requiere corrección de base antes de UI V1 |

Detalle reproducible: `planner_v1_v0_contract_check.md`.

## 4. Estado por bloque V1

| Bloque V1 | Estado | Evidencia/decisión |
|---|---|---|
| Shell Planner | PARTIAL | `PlannerScreen.tsx` ya es el shell físico, pero mezcla carga, estadísticas y sheets contextuales; además muestra slogan prohibido |
| Tabs Tasks / Calendar / Goals | PARTIAL | Existen y filtran, pero no persisten por cuenta+hogar ni restauran correctamente tras switch |
| `PlannerSheetHost` único | MISSING | Hay un `QuickActionSheet` global y modales separados en `PlannerScreen`; no hay host único ni lock de submit |
| Quick Actions | PARTIAL | Task/Event/Goal existen en orden; faltan filtro por capability, estados seguros y garantía one-instance (Invite queda fuera del alcance de Quick Actions V1) |
| Create Goal | PARTIAL | Reutiliza `GoalForm`, pero orden/campos/redirect no cumplen el flujo rápido y acepta `current_value` del cliente |
| Search | BLOCKED_BY_V0 | No hay screen, endpoint, query contract ni feature flag real |
| Estados globales y error boundary | BLOCKED_BY_V0 | No hay error boundary; errores públicos son parciales y faltan capabilities/cache |
| Cambio de hogar | BLOCKED_BY_V0 | El switch funciona, pero no cierra host, cancela requests ni limpia cache segregada |
| Home summary backend | CONFLICT | El endpoint actual calcula counts/briefing y falla como unidad; la norma exige proyección determinística con secciones y `partial_errors` |
| Home summary frontend | CONFLICT | `HomePlannerSections.tsx` hace cuatro requests y ranking cliente; la norma exige una proyección backend y one-tap con rollback |
| Deep links y route params | PARTIAL | Linking sólo declara pantallas raíz y faltan detalles/search; params no siguen el contrato final de IDs + procedencia |
| Telemetría | PARTIAL | Hay logs técnicos parciales, pero faltan proveedor/eventos de producto y tests de PII |
| Accesibilidad runtime | RUNTIME_REQUIRED | Hay primitives parciales; faltan focus restore y validación VoiceOver/TalkBack, teclado, safe areas y fuente grande |
| QA/rollback/DONE | BLOCKED_BY_V0 | No hay runner frontend/backend ni E2E; no se puede declarar DONE verificable |

Totales: `COMPLIANT 0`, `PARTIAL 6`, `MISSING 1`, `CONFLICT 2`, `BLOCKED_BY_V0 4`, `RUNTIME_REQUIRED 1`.

## 5. Decisiones físicas finales

### 5.1 Shell y navegación

- El shell seguirá siendo `front/mi-front-limpio/src/screens/planner/PlannerScreen.tsx`; se refactoriza, no se crea un shell paralelo.
- Los nombres de rutas reales se conservan: `PlannerHome`, `CreateTask`, `EditTask`, `CreateEvent`, `EditEvent`, `CreateGoal`, `EditGoal`, `GoalDetail`, `PlannerTrash`.
- Se agregan a `front/mi-front-limpio/src/navigation/types.ts` las rutas faltantes que V1 usa: `TaskDetail`, `EventDetail` y `PlannerSearch`. No se agrega Archive en V1.
- Los params de rutas de detalle contienen sólo IDs y metadatos de navegación (`source`, `returnTo`, `justCreated`); nunca objetos de dominio.
- `front/mi-front-limpio/App.tsx` incorporará paths anidados del stack Planner. `HomeTabNavigator.tsx` sigue siendo el único compositor del stack y tabs.
- El tipo de tab se exporta desde `navigation/types.ts` como `PlannerTabKey = 'tasks' | 'calendar' | 'goals'`; se elimina el tipo local duplicado. La vista se llama Calendar aunque administre entidades Event.
- La persistencia vive en el nuevo adaptador `front/mi-front-limpio/src/services/plannerPreferences.ts`, sobre el AsyncStorage ya instalado. Clave física: `planner:last-tab:${accountId}:${householdId}`. Si falta un componente de identidad no se persiste.

### 5.2 Host único de sheets

- Nuevo contexto: `front/mi-front-limpio/src/context/PlannerSheetContext.tsx`.
- Nuevo host: `front/mi-front-limpio/src/components/planner/PlannerSheetHost.tsx`.
- Se monta exactamente una vez en `HomeTabNavigator.tsx`, al mismo nivel que `QuickActionSheet` ocupa hoy.
- El host absorbe el modal global de `QuickActionSheet.tsx` y los modales task/event de `PlannerScreen.tsx`; éstos dejan de montar `Modal` por su cuenta.
- Reutiliza `TaskForm`, `EventForm` y `GoalForm` mediante sus variantes embedded. No duplica lógica de creación.
- Estado público mínimo del contexto: `open(kind, source)`, `close(reason)`, `activeKind`, `isOpen`, `isSubmitting`.
- `close` queda bloqueado durante submit. Back, backdrop, swipe, cambio de hogar y sign-out atraviesan el mismo cierre idempotente. Al cerrar, restaura foco al disparador cuando sigue montado.
- El doble disparo actual del botón central se corrige en `CenterTabButton.tsx`: una sola ruta de activación, no `onPress` más `onPressOut`.

### 5.3 Quick Actions y capabilities

Quick Actions V1 contiene exclusivamente tres acciones, en este orden:

1. Crear tarea.
2. Crear evento.
3. Crear meta.

Invitar persona no forma parte de Quick Actions de Planner V1; el flujo de invitaciones pertenece al dominio People/Household y queda fuera del alcance de V1.

Presentación visual obligatoria de cada acción:

- superficie o botón circular;
- icono reconocible centrado dentro del círculo;
- nombre visible de la acción;
- iconografía consistente con el Design System (sin emojis como iconografía final);
- estados `normal`, `pressed`, `disabled`, `loading` y `focus`;
- área táctil accesible mínima;
- feedback visual al presionar.

Acciones:

- círculo con icono de tarea + nombre `Crear tarea`;
- círculo con icono de calendario + nombre `Crear evento`;
- círculo con icono de meta/objetivo + nombre `Crear meta`.

No se define una librería de iconos nueva desde V1: la implementación debe reutilizar la librería real ya presente en el repositorio y confirmada en la fase de implementación. No se agrega una cuarta acción ni un espacio reservado para Invite.

| Acción | Capability pública requerida | Destino |
|---|---|---|
| Task | `task.create_household` o `task.create_personal` | host `task` |
| Event | `event.create_household` o `event.create_personal` | host `event` |
| Goal | `goal.create_household` o `goal.create_personal` | host `goal` |

El backend sigue siendo la autoridad sobre las capabilities; no se derivan permisos desde roles. La capability de invitación puede seguir existiendo en People/Household, pero no es dependencia ni criterio de Planner V1.

Las capabilities Planner son nombres normativos, pero hoy no tienen implementación real. No se permite derivarlas del rol ni asumir `true`. Hasta que V0 las entregue desde servidor y las haga cumplir en mutaciones, Task/Event/Goal no pueden considerarse implementables. Quick Actions se filtra exclusivamente por las capabilities de Task/Event/Goal.

### 5.4 Create Goal

- Se modifica `GoalForm.tsx`; no se crea otro formulario. Quick Create no se convierte en el formulario completo.
- Campos visibles inicialmente: título; categoría con default `home`; visibilidad con default `household`; Guardar.
- Quedan dentro de “Más opciones” colapsadas y no bloquean create: descripción, modo de progreso, prioridad, responsable, participantes, inicio, fecha objetivo, target y unidad, template, recurrencia, hitos.
- `current_value` inicial se fija server-side en cero y deja de ser editable/enviable en create.
- Submit genera `Idempotency-Key` y `X-Mutation-Id`, abre una sola mutación y bloquea todos los cierres.
- Draft se conserva durante submit y tras error; retry reutiliza la misma intención/idempotency.
- Éxito: invalidación dirigida del goal, lista Goals y Home Summary; navegación a `GoalDetail` con `{ goalId, source: 'quick_action', justCreated: true }`.
- Error: conserva draft, muestra error tipado con `request_id` cuando exista y permite retry con la misma intención/idempotency conforme al contrato servidor.

### 5.4.1 Post-create de Goal

Después del éxito de create goal, exactamente en este orden:

1. incorporar la respuesta canónica a cache;
2. actualizar Goals;
3. actualizar Planner Summary;
4. abrir GoalDetail;
5. mostrar una acción post-create exactamente una vez.

Acciones post-create por tipo de meta (one-shot mediante `justCreated` o estado equivalente):

- Steps: agregar primer paso / ahora no.
- Tasks: crear tarea / vincular existente / ahora no.
- Numeric: registrar primer avance / ahora no.
- Boolean: abrir meta / ahora no.
- None: agregar nota / crear tarea / ahora no.

La acción se muestra exactamente una vez por goal recién creado. Si el usuario sale y reentra a GoalDetail el `justCreated` no se repite. Se agregan tests y criterios DONE correspondientes en `planner_v1_test_matrix.md` y `planner_v1_implementation_order.md`.

### 5.5 Search

V1 implementa únicamente el entry point: icono de Search en top bar; route; tipos de navegación; feature flag necesario para exposición futura; telemetría de apertura; fallback; back behavior; estados visuales base; deep-link readiness.

V1 no implementa endpoint, controller, service, resultados reales, ranking, índices, filtros reales, paginación ni búsqueda productiva. No se crea `planner.search.controller.js`, no se crea `planner.search.service.js`, no se declara Search API productiva, no se introducen query/cache de resultados ni tests que exijan resultados reales en V1.

- Screen físico: `front/mi-front-limpio/src/screens/planner/PlannerSearchScreen.tsx` como placeholder gated con estados visuales base y mensaje fallback.
- El icono vive en el header de `PlannerScreen.tsx`; nunca abre un sheet.
- En el estado actual no existe feature flag real. El icono debe permanecer oculto mientras Search no sea funcional; no se inventará `planner_search_enabled` ni equivalente. El feature flag de Search se conserva como contrato V0 necesario para exposición futura: su ausencia bloquea únicamente la exposición del entry point, no bloquea el resto de V1.

### 5.6 Home Summary

Se conserva `GET /api/planner/summary` y se reemplaza su contrato en `backend/src/services/planner/planner.summary.service.js`; no se crea un segundo endpoint.

Contrato de respuesta requerido:

```ts
type PlannerSummary = {
  household_id: string;
  generated_at: string;
  projection_version: string;
  counts: {
    overdue_tasks: number;
    today_tasks: number;
    awaiting_verification: number;
    upcoming_events: number;
    active_goals: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    due_at: string | null;
    assigned_membership_id: string | null;
    version: number;
  }>;
  events: Array<{
    id: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    version: number;
  }>;
  goal: {
    id: string;
    name: string;
    target_value: number | null;
    current_value: number;
    unit: string | null;
    target_date: string | null;
    version: number;
  } | null;
  partial_errors: Array<{
    section: 'tasks' | 'events' | 'goals';
    code: string;
    request_id?: string;
  }>;
};
```

Reglas: máximo 3 tasks, máximo 3 events, máximo 1 goal; selección y orden determinísticos backend-only; cada sección falla de forma independiente con errores parciales; no hay `briefing_text` como sustituto de datos; `generated_at` y `projection_version` siempre presentes; `counts` siempre presente. El discriminador de sección usa `section: 'tasks' | 'events' | 'goals'` salvo evidencia normativa superior explícita.

`front/mi-front-limpio/src/services/plannerSummary.ts` adopta exactamente ese tipo. `HomePlannerSections.tsx` elimina los cuatro requests y el ranking cliente, consume una sola proyección, permite one-tap complete de task y aplica optimismo sólo cuando existan cache e invalidación V0.

### 5.7 Query keys, cache e invalidación

**Estado real:** no existe librería/adaptador de cache Planner, no existen query keys y no existe registro de invalidaciones. `AppRefreshContext` sólo expone timestamps globales. Por tanto no hay nombres reales que puedan declararse como implementados.

El cierre V0 debe publicar, antes de V1, nombres físicos para estos scopes mínimos:

- detalle de entidad: household + kind + entity id;
- lista por tab/filtros: household + kind + filtros normalizados (tab keys: `tasks`/`calendar`/`goals`);
- Home Summary: household;
- Search: household + query normalizada + filtros (reservado para exposición futura; V1 no implementa Search productiva ni resultados);
- capabilities: account + household + membership.

Grafo de invalidación requerido, que deberá escribirse usando esos nombres públicos y no strings locales:

| Mutación | Actualiza/invalidará |
|---|---|
| create/update/complete/cancel task | task detail, task lists afectadas, Home Summary, Search si está activo |
| create/update/cancel event | event detail, event lists afectadas, Home Summary, Search si está activo |
| create/update/complete/close goal | goal detail, goal lists afectadas, Home Summary, Search si está activo |
| cambio de hogar | cancela requests del hogar anterior, purga/sella cache anterior, carga capabilities y prefs del nuevo hogar |
| sign-out | cierra sheets, cancela requests y elimina toda cache Planner de la sesión |

No se permite `refetchAll`, timestamps globales ni mezclar datos de dos household IDs.

### 5.8 Estados, switch y seguridad de contexto

- Nuevos componentes físicos: `components/planner/PlannerStateView.tsx` y `components/planner/PlannerErrorBoundary.tsx`.
- Estados explícitos: initial loading, refresh, empty, partial, offline, forbidden, not-found, conflict, generic error y retrying.
- El boundary registra el evento tipado, muestra fallback y jamás deja una pantalla en blanco.
- Cambio de hogar: cerrar host → bloquear nuevas mutaciones → cancelar requests → activar hogar → limpiar/sellar cache anterior → cargar capabilities/prefs → restaurar tab válida → renderizar.
- Toda respuesta lleva token lógico de account+household; una respuesta tardía del contexto anterior se descarta.
- Sign-out ejecuta la misma limpieza de host/requests/cache antes de desmontar navegación.

### 5.9 Telemetría

Eventos requeridos por el contrato normativo:

`planner_opened`, `planner_tab_changed`, `planner_quick_actions_opened`, `planner_quick_action_selected`, `planner_sheet_opened`, `planner_sheet_closed`, `planner_create_submitted`, `planner_create_succeeded`, `planner_create_failed`, `planner_search_opened`, `planner_summary_loaded`, `planner_summary_partial`, `planner_task_quick_completed`, `planner_household_switched`, `planner_error_shown`.

Propiedades permitidas: `entity_kind`, `source`, `tab`, `result_count_bucket`, `latency_bucket`, `error_code`, `has_partial_errors`, `household_context_changed`. No títulos, descripciones, queries crudas, emails, nombres ni IDs de persona/hogar/entidad. Como no existe proveedor de producto en el repo, la instrumentación queda bloqueada por V0; `console` no es implementación aceptable.

### 5.10 Accesibilidad

- Shell, tabs, icono Search, botón central, filas Quick Actions, campos y CTAs llevan `accessibilityRole`, label estable y hint sólo cuando agrega información.
- El target táctil mínimo, contraste, fuente grande, reduced motion, safe areas y teclado se verifican en dispositivo/emulador; no se aprueban por inspección de JSX.
- Al abrir un sheet el foco entra en título/primer control; al cerrar vuelve al disparador si existe. Los errores de submit se anuncian y enfocan sin borrar el draft.
- Tabs exponen selected state; loading no encierra foco; empty/error/partial son distinguibles por lector de pantalla.
- VoiceOver y TalkBack son runtime obligatorio en M11/M12.

### 5.11 Arquitectura frontend real

El repositorio organiza Planner por screens, components, services y contexts, no mediante un módulo `features/planner`. V1 se adapta a esa arquitectura y no crea un árbol paralelo. `HomeTabNavigator.tsx` conserva ownership de composición; `PlannerScreen.tsx` del shell; los forms actuales del dominio; services actuales del transporte. Las únicas piezas nuevas resueltas son el contexto/host singleton, state view, error boundary, preferencias y Search screen listados en el file map. Cache, flags y telemetría dependen de APIs V0 públicas y no se implementan como adapters privados V1.

## 6. API y contratos públicos

- Base actual: `EXPO_PUBLIC_API_URL`, con ajuste localhost web en `front/mi-front-limpio/src/services/api.ts`.
- Auth: bearer Supabase y hogar resuelto server-side; no introducir `householdId` autoritativo en bodies.
- Mutaciones: `Idempotency-Key`, `X-Mutation-Id` y, para entidades existentes, `If-Match`/`version` obligatorios.
- Error público final: status HTTP correcto y body tipado con `code`, `message` seguro, `request_id` y `details` no sensibles cuando corresponda. Debe preservar al menos 400, 401, 403, 404, 409, 412, 422, 429 y 5xx.
- Requests de Search, Summary y listas deben ser abortables. Un abort por navegación/switch no muestra error al usuario ni emite failure de producto.
- El servidor valida capabilities; ocultar o deshabilitar una acción en UI es sólo una mejora de UX.

## 7. Gate obligatorio antes de la primera línea V1

Todos deben estar cerrados y verificados:

1. Migraciones V0 de Planner aplicadas y listadas en el entorno remoto objetivo.
2. Proyección server-side de las capabilities normativas y enforcement en endpoints Planner.
3. Registro real de feature flags, incluyendo el flag decidido para Search.
4. Adaptador de cache con query keys públicas, scope por hogar, cancelación e invalidación dirigida.
5. `X-Mutation-Id` propagado y correlacionado en cliente, API e idempotencia/telemetría.
6. Outbox/auditoría durable para los side effects que lo requieren; `planner_activity_log` best-effort no basta.
7. Envelope de error público consolidado.
8. Runner y suites mínimas automatizadas para backend, frontend e integración.
9. Baseline estático verde o excepciones documentadas y aceptadas; hoy ESLint backend tiene cuatro errores.

No hay workaround permitido. Si cualquiera sigue abierto, el estado continúa `NOT READY`.

Aclaraciones sobre el alcance del gate:

- La falta de Search backend no bloquea V1 porque Search productiva no pertenece a V1; V1 sólo expone el entry point (icono, route, flag, telemetría de apertura, fallback, back behavior, estados base, deep-link readiness).
- Archive no pertenece a V1 y su ausencia no debe bloquear M1.
- El feature flag de Search bloquea únicamente la exposición del entry point de Search; no bloquea el resto de V1.
- Los contratos compartidos de V0 sí deben cerrarse antes de comenzar V1, conforme al proceso acordado. El gate V0 sigue fallando y no debe ocultarse.

## 8. Riesgos auditados

| Riesgo | Evidencia | Control obligatorio |
|---|---|---|
| Seguridad sólo en UI | No existen capabilities Planner server-side | Capabilities V0 + tests de 403 forzado |
| Duplicación de entidades | Activación doble del botón central y mutaciones sin mutation ID | Host singleton, una ruta de press, idempotency + mutation ID |
| Fuga entre hogares | No hay cache segregada/cancelación; switch recarga sin token de contexto | Keys por hogar, abort, purge/seal y stale-response guard |
| Home inconsistente | Cuatro requests/ranking cliente; endpoint falla como unidad | Proyección backend 3/3/1 y `partial_errors` |
| Search accidentalmente pública | No existe feature flag real | No renderizar icono ni registrar ruta/endpoint antes de G0 |
| Side effects perdidos/duplicados | Activity log best-effort, sin outbox | Outbox transaccional y chaos test |
| Deploy local-only | Migraciones Planner ausentes del remoto | Migration parity como release gate |
| Regresiones invisibles | Sin runners/tests/CI | G0 automatizado antes de M1 |
| PII en observabilidad | No existe schema/allowlist de eventos | Adapter V0, allowlist y tests de privacidad |

Ninguno de estos riesgos se acepta mediante documentación solamente; todos requieren evidencia ejecutable.

## 9. QA, microfases, rollback y DONE

- Orden ejecutable condicionado: `planner_v1_implementation_order.md`.
- Archivos actuales y destinos físicos: `planner_v1_file_map.md`.
- Casos y comandos: `planner_v1_test_matrix.md`.
- Contratos V0: `planner_v1_v0_contract_check.md`.
- Decisiones abiertas: `planner_v1_open_decisions.md`.

Rollback se hace por microfase, sin mezclar schema, backend y frontend en una reversión opaca. V1 no comienza con una migración. Cualquier migración necesaria para cerrar el gate pertenece a la reparación V0 y debe probarse/aplicarse antes de M1. Cada microfase define rollback de navegación/UI/API/cache y no se marca DONE con flags forzados o código muerto.

QA combina checks automatizados y runtime. Los comandos hoy disponibles y sus resultados, así como cada caso futuro con su bloqueo físico, están en `planner_v1_test_matrix.md`. No se sustituye un caso `AUTO-BLOCKED` por walkthrough manual; VoiceOver/TalkBack, safe areas, teclado, cold links y conectividad sí requieren además evidencia runtime.

Las microfases vinculantes son G0 y M1–M13 de `planner_v1_implementation_order.md`. G0 no es trabajo V1: es la condición previa que impide empezar M1.

## 10. Criterio DONE global de V1

V1 sólo queda DONE cuando:

- el gate V0 está cerrado en local y entorno remoto;
- shell, tabs, host único, Quick Actions, Goal rápido (Quick Create + post-create), Search (entry point only), Summary (incluye counts) y deep links cumplen los contratos anteriores;
- capabilities se verifican en servidor y se reflejan en UI;
- no hay fuga de datos entre hogares ni respuesta tardía que contamine el contexto activo;
- query keys e invalidaciones dirigidas pasan tests;
- optimistic updates revierten ante 403/409/412/422/5xx y offline;
- todos los eventos de telemetría pasan pruebas de esquema y PII;
- lector de pantalla, teclado, safe areas, foco, targets táctiles y reduced motion pasan QA;
- unit, integration, contract, navigation y E2E críticos están verdes;
- TypeScript, syntax/lint, schema checks y migration parity están verdes;
- no quedan rutas duplicadas, sheets paralelos, estadísticas legacy ni código del flujo anterior.

En el commit auditado estos criterios no se cumplen. El dictamen final es **NOT READY**.

## 11. Definition of Ready final

Planner V1 está `IMPLEMENTATION READY` únicamente cuando, en una nueva auditoría sobre un SHA identificado:

1. los nueve puntos del gate de la sección 7 están PASS con evidencia local y remota;
2. todos los contratos V0 consumidos por M1–M13 son `AVAILABLE`, no `PARTIAL` o `MISSING`;
3. el file map contiene APIs físicas reales para cache, query keys, flags, capabilities, telemetría y outbox;
4. la test matrix contiene framework, archivo y comando reales para cada caso automatizable;
5. typecheck, lint, contract tests, schema checks y migration parity están verdes;
6. no queda una decisión abierta ni contradicción normativa.

Estado de esta auditoría: **NOT READY**. La primera línea de código V1 no debe escribirse todavía.
