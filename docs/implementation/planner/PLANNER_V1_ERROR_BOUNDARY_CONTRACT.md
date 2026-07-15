# Planner V1 — M2 Error Boundary Contract

**Versión:** V1.M2
**Owner:** Planner V1
**Branch:** `v1`
**Estado:** `M2 STATUS: PASSED`
**Implementación:** `front/mi-front-limpio/components/planner/PlannerErrorBoundary.tsx`

## 1. Alcance

Captura errores de render surgidos en cualquier subárbol del Planner (Shell + tabs + state chrome). Garantiza:

- Nunca pantalla blanca.
- Acceso a un fallback estructural accesible.
- Retry dirigido.
- Salida segura (host callback).

Queda explícitamente fuera del alcance:

- Errores de red ordinarios — esos fluyen por el shell state (`PlannerShellState.recoverable_error`).
- Reemplazo de los errores tipados del `plannerErrorAdapter`.
- Creación de un error boundary global para la app.

## 2. Captura

- React `Component.getDerivedStateFromError` produce un nuevo `incidentId` y marca el estado `failure` del boundary.
- `componentDidCatch` ejecuta el prefijo `onFailure({ incidentId })` y el callback `onTelemetry` con un payload mínimo: `{ eventName: 'planner_shell_failed', properties: { reason_kind: 'render', incident_id } }`.
- Nunca se propaga `original Error` fuera del componente.
- Nunca se imprimen stacks, ni siquiera a console (excepto donde el host decida explícitamente).
- El componente no intercepta el render-error completamente: si un subárbol/cuarto extremo lanzara, mantendría el screen funcional.

## 3. Fallback

- Renderiza un `View` con `accessibilityRole="alert"` y `accessibilityLiveRegion="assertive"`.
- Iconografía consistente con `HomePlusIcon` (sin emojis).
- Título: "Planner no está disponible".
- Descripción: "Algo falló al cargar Planner. Podés reintentar o volver a un área segura."
- ID opaco `Incidente pln_<timestampMs>_<rand<8>>>` visible como caption.
- Una acción principal "Reintentar" (siempre presente).
- Una acción secundaria solo cuando `onExit` se proporciona.

Niveles usados:

- `spacing[4]`/`spacing[6]` para padded area.
- `touchTargets.fab` para el círculo de ícono principal.
- `colors.danger.*` para iconografía.

## 4. Retry

- `onRetry(...)` callback opcional (útil en test / instrumentation). Si se omite, retry sigue funcionando vía `setState({ mode: 'mounting' })`.
- Incrementa `key` interno forzando remount del subtree → genera lifecycle fresco.
- `getDerivedStateFromError` ya solo emitió `failure` una vez; al re-entrar `mounting` el montaje del Planner recrea estado interno perdido (no confundir con datos: el shell debe refetch del backend al re-mount).
- No se llama a `componentDidCatch` en retry — solo captura nuevos errores de render.

## 5. Salida

- `onExit()` opcional.
- Si no se define, el botón "Salir de Planner" no aparece (no se renderiza un botón sin acción).
- Por defecto `exitLabel="Salir de Planner"`.
- El host (PlannerScreen) implementa `navigation.goBack` para volver a la raíz fuera de Planner.

## 6. Telemetría

- Definida como `PlannerErrorBoundaryTelemetry`.
- Solo emite un evento: `planner_shell_failed` cuando el catalog G0.4 V1 lo autorice.
- Propiedades: `reason_kind: 'render'` y `incident_id` (únicas properties permitidas en M2).
- No emite por render normal.
- No emite por cada detalle del UI.
- La signature no devuelve promesa ni error; sink failures se manejan en `try { ... } catch {}`.
- El identificador `incident_id` se mantiene dentro de `PlannerErrorBoundary.generatePlannerIncidentId` y sigue el patrón `pln_<tsMs>_<rand[8]>`.

Importante:

- No hay eventos especulativos; `planner_shell_state_changed` y demás aún no son parte del catálogo M2.
- `onTelemetry` puede dejarse `undefined` durante la integración — el componente sigue siendo seguro.

## 7. Redacción del incidente

- `errorId` (vía `generatePlannerIncidentId`): no contiene email, ni UUID, ni nombre, ni dirección, ni token.
- Los mensajes del fallback no incluyen respuestas del backend, ni nombres de familias, ni query strings, ni tokens, ni cookies.
- `requestId` del backend nunca se incluye en el boundary — el boundary solo tiene su propio `incident_id`.

## 8. Accessibility

- `accessibilityRole="alert"` en el contenedor fallback.
- `accessibilityLiveRegion="assertive"` para asegurar invasión clara al lector de pantalla.
- Etiquetas: `accessibilityLabel` en cada `AppButton`.
- Fuente: tokens de typography — escalable para adultos mayores.

Runtime VoiceOver / TalkBack queda registrado como `RUNTIME_REQUIRED` para M11 y **no se firma como PASS** en M2.

## 9. Limitaciones y fallbacks

- El boundary NO captura errores fuera del subtree que envuelve.
- Si una combinación de `useState` no funciona con React error boundary, el fallback no se dispara y el comportamiento del host queda preservado.
- Sin librerías nuevas para instrumentación: el telemetry hook es opcional.

## 10. Tests & Validación

Cubierto por `scripts/planner_v1_shell_state_tests.ts`:

- `toPlannerShellErrorInfo` con error produce shape redaction (`no original field`).
- `incident_id` cumple regex `^pln_\d+_[a-z0-9]+$` y no contiene `@` ni la palabra `household`.
- Sin event hooks registrados — el boundary maneja silencio sin sink.

Las pruebas runtime de boundary React se validan en construcción visual (M7/M11), no en M2.

## 11. Compatibility

- El boundary no requiere proveedor de telemetría.
- No interfiere con los hooks de HomePlus Core lifecycle.
- No introduce dependencias nuevas.

## 12. Post-M2 update

Frontera React para Planner shell. Estado final posterior a M2:

- Componente presente y montado por `PlannerScreen` en su raíz.
- 0 errores, 0 warnings nuevos en lint del frontend.
- M2 STATUS: PASSED.
