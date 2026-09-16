# M11.1A — Task Fulfillment Data & Security Foundation

## Veredicto

M11.1A quedó implementado dentro del alcance autorizado.

La implementación agrega una base canónica y aditiva para assignment y
fulfillment, conserva la proyección Planner V0, corrige el actor y el versionado
de restore para Goal/Milestone y mantiene fuera de alcance evidencia,
recurrencia, Plans, presets, notificaciones y la migración visual de Tasks.

## Snapshot Git

- Raíz: `C:/Users/thega/Desktop/HomePlus`
- Rama: `v1`
- Commit inicial: `c2a544b docs(planner): freeze Planner V1 functional specification`
- Estado inicial: limpio.
- Operaciones Git incompletas: ninguna.
- Commit/push durante M11.1A: ninguno.

## Autoridades leídas

- `M11_PLANNER_V1_TECHNICAL_GAP_AUDIT.md`
- `PLANNER_V1_M11_APPROVAL_PACKET.md`
- `PLANNER_V1_M11_FINAL_DECISION_REGISTRY.md`
- `PLANNER_V1_M11_UX_UI_FREEZE_CONTRACT.md`
- secciones aplicables de `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`
- secuencia completa de migraciones Planner y contratos activos de Tasks,
  Goals, Milestones, contexto Household, capabilities, RLS, RPCs y pruebas.

## Esquema aplicado y drift

Supabase local estaba disponible. Antes de implementar se compararon:

- las migraciones versionadas;
- el historial aplicado local;
- columnas, políticas RLS y firmas de RPC de Planner;
- conteos y actores de las Tasks locales existentes.

No se detectó drift local. La secuencia se reprodujo desde cero con
`supabase db reset` y terminó con las 34 migraciones alineadas, incluida:

`20260722010000_m11_1a_task_fulfillment_foundation.sql`

El proyecto está enlazado a un entorno compartido, pero no había
`SUPABASE_ACCESS_TOKEN` ni `SUPABASE_DB_PASSWORD`. No se solicitó ni imprimió
ningún secreto y no se ejecutó ninguna migración compartida. La verificación
remota queda pendiente antes de desplegar.

Snapshot local anterior al primer reset:

- Tasks totales: 5;
- `assigned_to_member_id IS NULL`: 1;
- `pending`: 3;
- `awaiting_verification`: 1;
- `cancelled`: 1;
- actores completion no mapeables: 0;
- actores verification no mapeables: 0.

El entorno local fue reseteado deliberadamente para las pruebas de base limpia
y backfill. El reset final dejó cero fixtures y cero Tasks locales.

## Migración creada

La migración es aditiva. No elimina ni renombra columnas, tablas o datos
legacy. Crea:

- `planner_task_assignment_configs`;
- `planner_task_assignees`;
- `planner_task_fulfillments`;
- índices parciales de unicidad y consulta;
- versiones, timestamps y triggers de actualización;
- RLS de lectura por household/capability;
- bloqueo de escritura directa para `authenticated` sobre las tablas
  canónicas;
- helpers internos de bootstrap, sincronización y proyección;
- RPC transaccional de completion sobre fulfillment;
- RPC transaccional de verification sobre fulfillment;
- restore seguro y versionado de Goal/Milestone;
- consulta interna `planner_m11_1a_backfill_report()`.

Todas las funciones `SECURITY DEFINER` nuevas o reemplazadas usan
`search_path = pg_catalog, public`.

## Modelo de assignment

Una Task tiene exactamente una configuración actual:

```text
assignment_kind
  anyone
  members
  legacy_unassigned

fulfillment_mode
  shared_once
  each_person
```

`legacy_unassigned`:

- solo se genera durante el backfill;
- exige `legacy_backfill = true` por constraint;
- no está expuesto como opción nueva;
- no puede ser escrito directamente por clientes autenticados;
- aparece separado en el reporte de backfill.

Las Tasks nuevas creadas por el contrato V0 con
`assigned_to_member_id = NULL` se representan canónicamente como `anyone`, no
como `legacy_unassigned`. Una edición V0 de assignee sincroniza la configuración,
revoca la asignación anterior y crea la obligación pendiente correspondiente
sin dual-write circular.

`planner_task_assignees` conserva filas revocadas y garantiza como máximo una
asignación activa equivalente por Task/miembro.

## Modelo de fulfillment

Cada fulfillment conserva:

- Task y household;
- scope `shared` o `individual`;
- miembro responsable cuando corresponde;
- `pending`, `completed`, `awaiting_verification`,
  `correction_requested` o `verified`;
- actores membership/person de completion y verification;
- timestamps de completion, verification y correction;
- comentario mínimo de correction;
- version, `created_at`, `updated_at`;
- `inactive_at` para lifecycle cancelado;
- `retired_at` para preservar obligaciones reemplazadas.

Reglas estructurales probadas:

- `anyone` produce una obligación compartida;
- una persona produce una obligación individual;
- varias personas + `shared_once` produce una obligación compartida;
- varias personas + `each_person` produce una obligación por miembro;
- cancelled mantiene historia pero no una obligación activa;
- índices parciales evitan fulfillments actuales duplicados.

No se agregó ningún campo simulado de evidencia o archivo.

## Backfill legacy

Mapeo aplicado:

```text
assigned_to_member_id presente
→ assignment_kind members
→ fulfillment_mode shared_once
→ una obligación individual responsable para el assignee legacy

assigned_to_member_id NULL
→ assignment_kind legacy_unassigned
→ fulfillment_mode shared_once
→ una obligación compartida sin reinterpretar responsabilidad
```

Estados:

- `pending` → fulfillment `pending`;
- `completed` → `completed`;
- `awaiting_verification` → `awaiting_verification`;
- `verified` → `verified`;
- `cancelled` → fulfillment con estado previo conservador e `inactive_at`.

El backfill preserva actores membership/person, timestamps, requirement de
verification y versión. Aborta ante assignees de otro household, estados de
completion sin `completed_at`, estados verified sin `verified_at` o conteos
Task/config/fulfillment inconsistentes.

Prueba de backfill real sobre fixtures pre-migración:

- Tasks: 6;
- assignment configs: 6;
- fulfillments actuales: 6;
- filas `legacy_unassigned`: 2;
- cancelled inactivas: 1;
- actores completion no mapeables: 0;
- actores verification no mapeables: 0;
- todos los estados no cancelados preservados: PASS.

Estado del reset final:

- Tasks: 0;
- configs: 0;
- fulfillments: 0;
- `legacy_unassigned`: 0;
- actores no mapeables: 0.

Las filas ambiguas reales deben volver a contarse en staging/producción antes
del despliegue; el snapshot local inicial indicaba una.

## Compatibilidad Planner V0

Fuente canónica M11.1A:

```text
planner_task_assignment_configs
planner_task_assignees
planner_task_fulfillments
```

Proyección temporal V0:

```text
planner_tasks.status
planner_tasks.assigned_to_member_id
planner_tasks.completed_by_*
planner_tasks.verified_by_*
planner_tasks.completed_at
planner_tasks.verified_at
```

Dirección de sincronización:

- create V0 → trigger crea assignment y fulfillment;
- edit V0 de assignee → trigger actualiza assignment y obligación pendiente;
- complete/verify V0 → RPC muta fulfillment canónico y deriva la proyección
  `planner_tasks` dentro de la misma transacción;
- cancel/reactivate → activa o inactiva la obligación sin perderla;
- trash/restore conserva la obligación y respeta la precedencia de lifecycle.

Home Summary, Calendar y listados siguen leyendo `planner_tasks`, por lo que
mantienen sus DTO y orden actuales. Las pruebas M8/M9 y las assertions de
proyección confirmaron compatibilidad. `assigned_to_member_id` no fue eliminado.

## Seguridad

La identidad efectiva se resuelve mediante:

```text
auth.uid()
→ people.auth_user_id
→ current_person_id()
→ current_household_member_id(household_id)
→ membership activa
```

Los IDs legacy de actor en la firma de completion se validan contra el actor
derivado y nunca son autoridad. Las nuevas tablas no conceden INSERT/UPDATE/
DELETE a `authenticated`; las escrituras ocurren mediante triggers/RPCs
`SECURITY DEFINER` con validación equivalente.

Para el slice se agregó `planner_current_actor_has_capability()`. Primero lee
un booleano de `households.config.permissions`, que es la autoridad Household
actual. Cuando no existe, reproduce únicamente los defaults ya vigentes en
`plannerCapabilities.js` para `planner.view`, create/complete/verify de Task y
restore de Goal. No se agregó una matriz futura ni se modificó el catálogo de
capabilities.

También se cerró:

- insert directo de Task con actor de creación spoofed;
- update directo de campos de completion/verification legacy;
- completion por hogar ajeno, miembro suspendido/no miembro o persona no
  asignada sin capability;
- lectura entre hogares de assignment/fulfillment;
- escritura directa de fulfillment;
- self-verification;
- actor spoofing en restore Goal.

## Restore Goal y Milestone

`restore_goal_rpc` y `restore_milestone_rpc` ahora:

- derivan persona y membership desde auth;
- ignoran como autoridad el `p_member_id` compatible y rechazan mismatch;
- exigen capability `goal.restore`;
- respetan privacidad de Goal personal;
- exigen expected version;
- bloquean y comparan la fila antes de restaurar;
- incrementan version mediante el trigger existente;
- rechazan stale version.

El backend dejó de enviar member ID a ambos restore RPC. El servicio frontend
requiere `expectedVersion`, siempre envía `If-Match`, y Papelera pasa
`item.version` para Goal y Milestone.

## Pruebas ejecutadas

### Migración y base de datos

- `supabase db reset` completo: PASS.
- reset hasta `20260715010000` + 6 fixtures legacy + `supabase migration up --local`: PASS.
- `node scripts/planner_m11_1a_database_tests.js`: **54/54 PASS**.
- `supabase migration list --local`: 34/34 alineadas.
- `supabase db lint --local --level error`: PASS.

La suite DB cubre:

- todos los status legacy;
- assigned presente y NULL;
- verification, actores y timestamps;
- conteos antes/después;
- `anyone`, single, group shared y `each_person`;
- miembro activo mismo hogar, otro hogar, suspendido y usuario sin membership;
- acceso directo Supabase y actor spoofing;
- lectura/escritura de fulfillment;
- self-verification;
- restore Goal/Milestone correcto, stale y spoofed;
- concurrencia shared completion;
- concurrencia complete/verify;
- cancel/reactivate/trash/restore V0;
- no duplicación de fulfillments.

### Contrato e idempotencia

- `node scripts/planner_m11_1a_contract_tests.js`: **24/24 PASS**.

Incluye:

- misma key/same payload → replay sin segunda mutación;
- misma key/different payload → 409 conflict;
- fallo simulado al persistir replay → reserva in-flight y ningún efecto
  duplicado;
- wiring de RPC y restore versionado;
- garantías estáticas de migración aditiva y `search_path`.

### Salud existente

- frontend TypeScript `--noEmit`: PASS.
- `node tests/static/backend-syntax.js`: PASS, 97 archivos.
- Planner M8: PASS, 115 assertions.
- Planner M9: PASS, 50 assertions.
- `git diff --check`: PASS.

No se generó coverage ni snapshots y no se instalaron dependencias.

## Archivos modificados

- `supabase/migrations/20260722010000_m11_1a_task_fulfillment_foundation.sql`
- `backend/src/services/planner.tasks.service.js`
- `backend/src/controllers/planner.tasks.controller.js`
- `backend/src/services/planner.goals.service.js`
- `front/mi-front-limpio/services/plannerGoals.ts`
- `front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx`
- `scripts/planner_m11_1a_database_tests.js`
- `scripts/planner_m11_1a_contract_tests.js`
- `docs/implementation/planner/M11_1A_TASK_FULFILLMENT_FOUNDATION_REPORT.md`

No se modificaron rutas, formularios o pantallas visibles de Tasks, Home,
Calendar, Events, navegación, manifests, package files, lockfiles ni documentos
congelados.

## Riesgos restantes

1. Falta verificar drift y conteos en el entorno compartido antes de aplicar la
   migración.
2. `legacy_unassigned` debe resolverse explícitamente antes de retirar la
   compatibilidad V0; no debe convertirse en `anyone` por defecto.
3. La función SQL de capabilities replica un subconjunto de defaults backend
   como fallback. M11.1B debe consolidar tests de paridad cuando Household
   publique una autoridad normalizada única.
4. Planner V0 sigue mostrando `assigned_to_member_id = NULL` como “Sin
   asignar”, aunque una Task nueva NULL se represente internamente como
   `anyone`. Es una limitación de presentación temporal hasta M11.1C.
5. Un cambio de assignment con fulfillment histórico conserva la obligación
   cumplida; la UX futura debe advertir y decidir cómo crear obligaciones nuevas.
6. Correction/revert existen solo como capacidad estructural del estado. Sus
   operaciones públicas y UI pertenecen a M11.1B.
7. Activity legacy continúa siendo best-effort para mutaciones fuera de los
   RPC transaccionales complete/verify.

## Rollback conceptual

La migración no destruye el contrato V0, por lo que el rollback seguro es:

1. detener nuevas mutaciones Planner;
2. verificar/proyectar el último estado canónico a `planner_tasks`;
3. revertir backend/frontend a los servicios V0 anteriores;
4. retirar los triggers y policies M11.1A que interceptan la proyección;
5. conservar las tres tablas nuevas como datos de recuperación;
6. solo después de exportar y verificar que no existen escrituras V1 exclusivas,
   eliminar funciones/tablas/índices nuevos en una migración de rollback
   explícita.

No debe hacerse rollback eliminando las tablas inmediatamente, porque podrían
contener historia canónica creada después del despliegue.

## Estado final Git

Working tree esperado: únicamente los nueve archivos M11.1A listados, sin
commit ni push. No hay merge, rebase, cherry-pick o conflictos en curso.

## Recomendación para M11.1B

Continuar con operaciones públicas de fulfillment sobre esta base:

- assign multi y cambio `shared_once` / `each_person`;
- complete por fulfillment concreto;
- request correction, resubmit, revert y reopen;
- DTO V1 de assignment/fulfillment;
- tests de paridad capability Household/SQL/backend;
- migración explícita de las filas `legacy_unassigned` solo con decisión de
  producto/datos.

No iniciar M11.1C ni evidencia, recurrence, Plans, presets o notificaciones en
ese bloque.

M11_1A_COMPLETE
