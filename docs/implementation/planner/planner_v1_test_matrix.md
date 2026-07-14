# Planner V1 — matriz de pruebas

## 1. Baseline ejecutado en la auditoría

| Check | Resultado | Evidencia/nota |
|---|---|---|
| `git status --short` inicial | PASS | Worktree limpio; warning no bloqueante al leer ignore global |
| raíz/branch/SHA | PASS | `C:/Users/thega/Desktop/HomePlus`, `v1`, `a9d869b5755a90188dd8b964506251e56af74632` |
| frontend `tsc --noEmit` | PASS | TypeScript sin errores |
| backend `node --check` (16 archivos Planner relacionados) | PASS | 0 fallas de sintaxis |
| backend ESLint sobre archivos auditados | FAIL | 4 errores existentes: 3 símbolos sin uso y 1 `no-extra-boolean-cast` |
| frontend lint | NOT AVAILABLE | Sin script/configuración utilizable |
| backend tests | NOT AVAILABLE | Sin script/runner/archivos de tests |
| frontend tests | NOT AVAILABLE | Sin script/runner/archivos de tests |
| integration/E2E | NOT AVAILABLE | Sin harness ni CI encontrada |
| `supabase db lint` | PASS con warnings | 2 variables PL/pgSQL no usadas, no bloqueantes para schema check |
| `PLANNER_V0_SCHEMA_CHECKS.sql` local | PASS | Todos los checks declarados pasaron; consulta read-only |
| inspección schema local adicional | PASS/PARTIAL | 6 tablas Planner, 17 policies, 1 activity log, 1 idempotency store; 0 outbox y 0 audit table |
| migration parity local/remoto | FAIL | Remoto termina en `202607050001`; migraciones Planner locales posteriores no figuran aplicadas |
| `git diff --check` antes de entregables | PASS | Sin whitespace errors |

Versiones registradas: Node `v24.13.0`, npm `11.6.2`, Supabase CLI `2.90.0`. No se instaló ninguna dependencia.

### Comandos efectivos y bloqueo

| Comando ejecutado | Working directory | Resultado | ¿Bloquea V1? | Runtime adicional |
|---|---|---|---|---|
| `git status --short` | repo root | PASS, limpio al inicio | no | no |
| `git branch --show-current` / `git rev-parse HEAD` / `git rev-parse --show-toplevel` | repo root | PASS | no | no |
| `.\node_modules\.bin\tsc.cmd --noEmit` | `front/mi-front-limpio` | PASS | no | no |
| `node --check <archivo>` sobre los 16 JS Planner/context/routes/controllers/services auditados | `backend` | PASS, 0 fallas | no | no |
| `.\node_modules\.bin\eslint.cmd <archivos Planner auditados>` | `backend` | FAIL, 4 errores existentes | sí, baseline estático | no |
| `npm.cmd test` | no ejecutado | NOT AVAILABLE: ningún script/running framework en ambos packages | sí | G0 debe instalar/publicar runner mediante proceso separado |
| `supabase status` | repo root | PASS para DB/API local; servicio vector no requerido estaba reiniciando | no para schema; revisar stack completo antes de runtime | sí |
| `supabase migration list` | repo root | FAIL parity: remoto sin migraciones Planner locales | sí | acceso al proyecto remoto |
| `supabase db lint` | repo root | PASS con 2 warnings | no por sí solo | no |
| `PLANNER_V0_SCHEMA_CHECKS.sql` vía `psql` read-only en DB local | repo root | PASS completo | no local; no prueba remoto | repetir en remoto autorizado |
| consulta SQL read-only de tablas/policies/version/idempotency/outbox | repo root | PASS/PARTIAL; outbox/audit ausentes | sí | repetir tras G0 |
| `git diff --check` | repo root | PASS | no | no |

No se ejecutó `npm test` literalmente porque la inspección previa de `package.json` demostró que el script no existe; ejecutar un comando inventado no agregaba evidencia. Los placeholders `<archivo>`/`<archivos ...>` describen el batch efectivo inspeccionado y no se presentan como comando público futuro.

## 2. Regla de automatización

Los casos siguientes son obligatorios, pero el repositorio no tiene framework de tests elegible. Por eso no se inventa Jest, Vitest, Supertest, Detox u otro runner desde V1. G0 debe publicar runner, convenciones, comandos y ubicación; luego cada fila debe vincularse a un test real. `AUTO-BLOCKED` significa “caso definido, ejecución bloqueada por base V0”, no aprobado manualmente.

## 3. Casos con ficha de ejecución completa

En las columnas `framework`, `archivo` y `comando`, `G0 REQUIRED` es un bloqueo demostrado: hoy no existe un valor físico verdadero que pueda escribirse sin inventar. La ficha deberá reemplazar esos tres valores por nombres reales antes de que el caso pueda pasar a implementación.

| ID | tipo | framework | archivo | precondición | fixture/helper | steps | expected | comando | dependencia de V0 | runtime/manual |
|---|---|---|---|---|---|---|---|---|---|---|
| V1-NAV-01 | type/navigation | G0 REQUIRED | G0 REQUIRED | G0 DONE; routes M1 | auth+household route fixture (G0) | Compilar params válidos e inválidos; parsear paths | Sólo IDs+metadata; objetos fallan typecheck | G0 REQUIRED | runner + error/context contract | no |
| V1-NAV-02 | navigation/E2E | G0 REQUIRED | G0 REQUIRED | M10 build runtime | signed-in/signed-out deep-link fixture (G0) | Abrir cold/warm links de tres kinds; back | Contexto y back stack determinísticos; 403/404 seguros | G0 REQUIRED | E2E runner + context | sí, cold start |
| V1-SHL-01 | component/integration | G0 REQUIRED | G0 REQUIRED | M2 | summary/list states fixture (G0) | Render loading/refresh/empty/partial/errors; retry | Sin blank screen, flicker ni fetch duplicado | G0 REQUIRED | component runner, error/cache | no |
| V1-SHL-03 | component | G0 REQUIRED | G0 REQUIRED | boundary M2 | throwing child helper (G0) | Forzar render throw; activar retry | Fallback accesible y evento seguro | G0 REQUIRED | telemetry/error contract | no |
| V1-TAB-01 | unit/component | G0 REQUIRED | G0 REQUIRED | M6 | fake storage + account/household fixture (G0) | Leer/escribir/cambiar contexto/corromper valor | Default Tasks; aislamiento por ambos IDs | G0 REQUIRED | test runner; identidad AVAILABLE | no |
| V1-SHEET-01 | component/E2E | G0 REQUIRED | G0 REQUIRED | M3 | navigation+focus harness (G0) | Abrir rápido desde varios disparadores; navegar | Una instancia y un evento/open | G0 REQUIRED | component/E2E runner | sí para foco |
| V1-SHEET-03 | component/E2E | G0 REQUIRED | G0 REQUIRED | M3 | back/backdrop/swipe helper (G0) | Cerrar por cada vía con/sin submit | Cierre idempotente; submit bloquea; foco vuelve | G0 REQUIRED | runner | sí para gestures/teclado |
| V1-QA-01 | unit/contract | G0 REQUIRED | G0 REQUIRED | M4 + capabilities G0 | capability matrix helper (G0) | Render cada combinación; forzar POST oculto | UI por capability; servidor responde 403 sin ella | G0 REQUIRED | capabilities + runner | no |
| V1-QA-04 | API integration | G0 REQUIRED | G0 REQUIRED | mutation contract G0 | same-intent request helper (G0) | Enviar double tap/retry con misma y nueva intención | Una entidad por intención; IDs correlacionados | G0 REQUIRED | idempotency+mutation ID+DB fixture | no |
| V1-GOAL-01 | component/API | G0 REQUIRED | G0 REQUIRED | M5 | goal draft/request fixture (G0) | Completar quick path; alterar `current_value`; submit | Orden correcto; server persiste cero; GoalDetail | G0 REQUIRED | capabilities/errors/idempotency | no |
| V1-GOAL-04 | integration | G0 REQUIRED | G0 REQUIRED | M5 | fault-response matrix helper (G0) | Responder 409/412/422/5xx/offline y retry | Draft intacto; no duplicado; error tipado | G0 REQUIRED | error/cache/mutation contracts | no |
| V1-SRCH-01 | contract/E2E | G0 REQUIRED | G0 REQUIRED | M7 | flag fixture (G0) | Probar flag off/on | Off: sin UI/ruta/API; on autorizado: entry point gated | G0 REQUIRED | flag | sí para navigation |
| V1-SRCH-02 | component | G0 REQUIRED | G0 REQUIRED | M7 | entry-point rendering fixture (G0) | Render del entry point en cada estado | Estados visuales base correctos; sin query en eventos | G0 REQUIRED | telemetry | no |
| V1-SUM-01 | API contract | G0 REQUIRED | G0 REQUIRED | M8 | seeded tasks/events/goals fixture (G0) | GET summary con exceso/empates/hogar vacío | Shape exacto, 3/3/1, orden estable | G0 REQUIRED | backend test runner + DB fixture | no |
| V1-SUM-03 | service/API integration | G0 REQUIRED | G0 REQUIRED | M8 | per-section failure injector (G0) | Fallar cada repositorio por separado | Otras secciones sobreviven; `partial_errors` correcto | G0 REQUIRED | integration runner | no |
| V1-SUM-04 | component/integration | G0 REQUIRED | G0 REQUIRED | M9 | network request counter (G0) | Montar/refrescar Home | Una request Summary; cero ranking/fan-out cliente | G0 REQUIRED | frontend runner + cache | no |
| V1-SUM-06 | cache integration | G0 REQUIRED | G0 REQUIRED | M9 | query-cache snapshot helper (G0) | One-tap; responder éxito y cada error | Patch dirigido; rollback exacto en todas las keys | G0 REQUIRED | cache keys/invalidation | no |
| V1-CTX-02 | integration/E2E | G0 REQUIRED | G0 REQUIRED | M7 | two-household delayed-response fixture (G0) | Iniciar A; cambiar a B; resolver A tarde | Nunca aparece dato A; keys A purgadas/selladas | G0 REQUIRED | cache/cancel/context token | sí |
| V1-CTX-03 | integration/E2E | G0 REQUIRED | G0 REQUIRED | M7 | authenticated session fixture (G0) | Abrir sheet/request; sign-out | Sheet cerrado, request abortada, cache/prefs limpiadas | G0 REQUIRED | lifecycle/cache runner | sí |
| V1-ERR-01 | API contract | G0 REQUIRED | G0 REQUIRED | error envelope G0 | status/error matrix helper (G0) | Forzar 400/401/403/404/409/412/422/429/5xx | Status/code/request_id consistentes; sin detalles sensibles | G0 REQUIRED | error contract | no |
| V1-OUT-01 | integration/chaos | G0 REQUIRED | G0 REQUIRED | outbox G0 | transactional failure/retry helper (G0) | Fallar tras commit; reiniciar worker; reintentar | Side effect lógico una vez; registro recuperable | G0 REQUIRED | outbox + worker harness | sí, proceso |
| V1-TEL-01 | schema/privacy unit | G0 REQUIRED | G0 REQUIRED | provider G0 + M11 | event allowlist/PII matcher (G0) | Emitir todos los caminos; inspeccionar payload | Schema/cardinalidad correctos; cero PII/query/IDs | G0 REQUIRED | telemetry provider/runner | no |
| V1-A11Y-01 | accessibility | G0 REQUIRED | G0 REQUIRED | M11 runtime build | accessibility audit harness (G0) | Recorrer shell/tabs/sheets/forms/search con lector | Roles/labels/foco/anuncios correctos | G0 REQUIRED | E2E accessibility support | sí, VoiceOver+TalkBack |
| V1-CHAOS-01 | integration/E2E | G0 REQUIRED | G0 REQUIRED | M12 | network fault proxy/helper (G0) | Timeout/abort/offline/reconnect/429 durante cada flujo | Estado recuperable; no corrupción/duplicado | G0 REQUIRED | error/cache/idempotency + E2E | sí |
| V1-CHAOS-02 | API/E2E | G0 REQUIRED | G0 REQUIRED | M12 | two-client version fixture (G0) | Leer misma version; mutar A y luego B | B recibe 412; refresh/merge controlado | G0 REQUIRED | version contract + runner | sí, dos clientes |

## 4. Cobertura funcional y contractual desglosada

Esta tabla es el índice de assertions que las fichas anteriores deben cubrir; no sustituye framework, archivo o comando.

| ID | Área | Caso / expectativa | Nivel | Estado actual | Microfase |
|---|---|---|---|---|---|
| V1-NAV-01 | Routes | Cada route acepta sólo IDs y metadata tipada; ningún objeto de dominio | type/unit | AUTO-BLOCKED | M1 |
| V1-NAV-02 | Deep link | Cold start a Task/Event/Goal detail resuelve auth, hogar y back stack | navigation/E2E | AUTO-BLOCKED | M10 |
| V1-NAV-03 | Deep link | ID inexistente/forbidden muestra 404/403 y no crash | integration/E2E | AUTO-BLOCKED | M10 |
| V1-NAV-04 | Search | Deep link con flag off no expone screen ni datos | navigation/integration | AUTO-BLOCKED | M7 |
| V1-SHL-01 | Shell | Initial loading, refresh y contenido no parpadean ni duplican fetch | component/integration | AUTO-BLOCKED | M2 |
| V1-SHL-02 | Estados | Empty/partial/offline/403/404/409/412/422/5xx tienen UI y retry correcto | component | AUTO-BLOCKED | M2 |
| V1-SHL-03 | Crash | Error de child cae en boundary y permite recuperación | component | AUTO-BLOCKED | M2 |
| V1-TAB-01 | Tabs | Default Tasks sin preferencia | unit/component | AUTO-BLOCKED | M6 |
| V1-TAB-02 | Tabs | Persiste y restaura por `accountId+householdId` | unit/integration | AUTO-BLOCKED | M6 |
| V1-TAB-03 | Tabs | Dos hogares/cuentas no comparten preferencia; valor corrupto usa Tasks | unit | AUTO-BLOCKED | M6 |
| V1-SHEET-01 | Host | Existe una única instancia aunque se navegue entre tabs/screens | component/E2E | AUTO-BLOCKED | M3 |
| V1-SHEET-02 | Host | Double tap del botón central abre una vez y no envía doble evento | component | AUTO-BLOCKED | M3 |
| V1-SHEET-03 | Host | Back/backdrop/swipe cierran una vez y restauran foco | component/E2E | AUTO-BLOCKED | M3 |
| V1-SHEET-04 | Host | Durante submit no cierra por ninguna vía | component/E2E | AUTO-BLOCKED | M3 |
| V1-SHEET-05 | Layout | Teclado, safe areas, orientación y fuente grande no ocultan acciones | visual/manual+E2E | RUNTIME REQUIRED | M3, M11 |
| V1-QA-01 | Capabilities | Task/Event/Goal se ven sólo con capability pública pertinente | unit/contract | AUTO-BLOCKED | M4 |
| V1-QA-02 | Security | Endpoint niega mutación sin capability aunque se fuerce UI | API integration | AUTO-BLOCKED | G0, M4 |
| V1-QA-04 | Idempotency | Dos taps/retry misma intención producen una entidad | API integration | AUTO-BLOCKED | M4, M5 |
| V1-QA-05 | Mutation ID | ID atraviesa cliente/API/log/outbox y no contiene PII | contract/integration | AUTO-BLOCKED | G0 |
| V1-QA-06 | Quick Actions | Quick Actions contiene exactamente tres acciones: Crear tarea / Crear evento / Crear meta (sin Invite) | component | AUTO-BLOCKED | M4 |
| V1-QA-07 | Quick Actions | Cada acción se renderiza como botón circular con icono dentro y nombre visible (`Crear tarea` / `Crear evento` / `Crear meta`) | component | AUTO-BLOCKED | M4 |
| V1-QA-08 | Quick Actions | Una sola activación por tap; doble tap no duplica submit ni evento de open | component | AUTO-BLOCKED | M4 |
| V1-QA-09 | Quick Actions | Estados `normal`, `pressed`, `disabled`, `loading` y `focus` visibles y diferenciables | component | AUTO-BLOCKED | M4 |
| V1-QA-10 | Quick Actions | Accesibilidad: target táctil mínimo, contraste, foco visible y anunciado por lector; emoji no usado como iconografía final | accessibility/manual | RUNTIME REQUIRED | M4, M11 |
| V1-GOAL-01 | Create Goal | Campos y orden rápido final; opcionales no bloquean create | component | AUTO-BLOCKED | M5 |
| V1-GOAL-02 | Create Goal | Backend fija `current_value=0` aunque cliente intente enviarlo | API integration | AUTO-BLOCKED | M5 |
| V1-GOAL-03 | Create Goal | Success abre GoalDetail con `justCreated` y source correcto | navigation/E2E | AUTO-BLOCKED | M5 |
| V1-GOAL-04 | Create Goal | 409/412/422/5xx/offline conservan draft y permiten retry seguro | component/integration | AUTO-BLOCKED | M5 |
| V1-GOAL-05 | Post-create | Tras éxito: respuesta canónica se incorpora a cache, Goals y Summary se actualizan, GoalDetail abre | cache integration | AUTO-BLOCKED | M5 |
| V1-GOAL-06 | Post-create | Acción post-create por tipo (Steps, Tasks, Numeric, Boolean, None) aparece exactamente una vez | component | AUTO-BLOCKED | M5 |
| V1-SRCH-01 | Search | Flag off oculta icono y endpoint; flag on habilita entry point | contract/E2E | AUTO-BLOCKED | M7 |
| V1-SRCH-02 | Search | Estados visuales base del entry point; sin query en eventos | component | AUTO-BLOCKED | M7 |
| V1-SUM-01 | Summary | JSON cumple shape final (counts + tareas + events + goal + partial_errors) y límites 3 tasks/3 events/1 goal | API contract | AUTO-BLOCKED | M8 |
| V1-SUM-02 | Summary | Orden determinístico para empates y timezone del hogar | service unit | AUTO-BLOCKED | M8 |
| V1-SUM-03 | Summary | Falla de una sección produce `partial_errors` con section `'tasks'|'events'|'goals'` y conserva las otras | service/API integration | AUTO-BLOCKED | M8 |
| V1-SUM-04 | Summary | Home hace una sola request, sin ranking/fan-out cliente | component/integration | AUTO-BLOCKED | M9 |
| V1-SUM-05 | One-tap | Complete optimista actualiza detail/list/Summary y luego confirma | cache integration | AUTO-BLOCKED | M9 |
| V1-SUM-06 | Rollback | 403/409/412/422/5xx/offline restaura exactamente todas las keys | cache integration | AUTO-BLOCKED | M9 |
| V1-SUM-07 | Counts | `counts` (overdue_tasks, today_tasks, awaiting_verification, upcoming_events, active_goals) se exponen siempre y son coherentes con secciones | API contract | AUTO-BLOCKED | M8 |
| V1-CACHE-01 | Isolation | Ninguna key omite household; cambio no muestra datos previos | unit/integration | AUTO-BLOCKED | G0, M7 |
| V1-CACHE-02 | Invalidation | Cada mutación toca sólo grafo dirigido, nunca refetch global | unit/integration | AUTO-BLOCKED | G0, M9 |
| V1-CTX-01 | Switch | Sheet abierto se cierra antes de activar nuevo hogar | E2E | AUTO-BLOCKED | M7 |
| V1-CTX-02 | Switch | Request tardía del hogar A se descarta después de activar B | integration/E2E | AUTO-BLOCKED | M7 |
| V1-CTX-03 | Sign-out | Cierra sheet, aborta requests y purga cache/prefs de sesión | integration/E2E | AUTO-BLOCKED | M7 |
| V1-ERR-01 | Errors | Envelope contiene status/code/request_id sin filtrar detalles | API contract | AUTO-BLOCKED | G0, M1 |
| V1-OUT-01 | Outbox | Side effect se entrega al menos una vez, retry no duplica efecto lógico | integration/chaos | AUTO-BLOCKED | G0 |
| V1-TEL-01 | Telemetry | Todos los eventos cumplen nombre, required props y cardinalidad | schema unit | AUTO-BLOCKED | M11 |
| V1-TEL-02 | Privacy | No aparecen títulos, nombres, emails, IDs ni query cruda | schema/unit | AUTO-BLOCKED | M11 |
| V1-A11Y-01 | Screen reader | Roles/labels/hints y orden de foco correctos en shell/sheets/forms/search | manual+E2E | RUNTIME REQUIRED | M11 |
| V1-A11Y-02 | Interaction | Target táctil, contraste, teclado y reduced motion conformes | manual/visual | RUNTIME REQUIRED | M11 |
| V1-CHAOS-01 | Network | Timeout, abort, offline/reconnect y 429 no corrompen estado | integration/E2E | AUTO-BLOCKED | M12 |
| V1-CHAOS-02 | Concurrency | Dos clientes sobre la misma version producen 412 y recovery | API/E2E | AUTO-BLOCKED | M12 |
| V1-CHAOS-03 | Process | Falla entre commit y side effect se recupera desde outbox | integration/chaos | AUTO-BLOCKED | G0, M12 |

## 5. Matriz de capabilities mínima

Matriz exclusiva para Quick Actions de Planner V1 (Task/Event/Goal). Invite queda fuera del alcance de Quick Actions V1.

| Contexto | Task | Event | Goal | Resultado esperado |
|---|---:|---:|---:|---|
| Ninguna capability | no | no | no | El botón puede ocultarse o mostrar estado informativo; jamás sheet vacío |
| Sólo personal | `task.create_personal` | `event.create_personal` | `goal.create_personal` | Acciones personales visibles, scope bloqueado a personal |
| Sólo household | `task.create_household` | `event.create_household` | `goal.create_household` | Acciones de hogar visibles y API enforcea membership |
| Mezcla parcial | por capability | por capability | por capability | Cada fila independiente; no derivar por rol |
| UI manipulada | cualquiera | cualquiera | cualquiera | Servidor decide; 403 tipado y sin side effect |

## 6. Matriz de invalidación/rollback

Los nombres físicos de query keys quedan bloqueados hasta G0. Una vez publicados, estos assertions son obligatorios:

| Mutación | Patch optimista permitido | Confirmación | Rollback |
|---|---|---|---|
| create Task/Event/Goal | insertar sólo si orden/filtros son determinísticos; de lo contrario invalidar | reemplazar temp por entidad/version server | retirar temp y restaurar snapshots |
| complete task one-tap | detail, listas afectadas y Summary | aplicar entidad/version server e invalidar Search afectado | restaurar todos los snapshots en una transacción lógica |
| update/cancel entity | detail + listas/Summary donde pertenezca | reconciliar respuesta server | restaurar status/version/posición previos |
| cambio de hogar | ninguno entre contextos | cargar keys del nuevo hogar | descartar responses y purgar/sellar keys anteriores |

## 7. Comandos que debe publicar G0

No existen hoy. El gate debe fijar, como mínimo, comandos no interactivos para:

- frontend typecheck, lint, unit/component y navigation tests;
- backend lint, unit, API contract e integration tests;
- schema checks y migration parity;
- E2E crítico en runtime móvil/web definido;
- prueba de esquema/PII de telemetría.

Ninguna fila `AUTO-BLOCKED` puede convertirse en PASS sólo por inspección manual. Los casos `RUNTIME REQUIRED` necesitan dispositivo/emulador y evidencia de QA además de automatización donde sea viable.
