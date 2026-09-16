# HomePlus — Current State Deep Audit

**Fecha:** 27 de junio de 2026  
**Alcance:** backend/, front/mi-front-limpio/, supabase/, docs/  
**Objetivo:** Auditoría técnica del estado actual del repo antes de la profesionalización.

> **Nota de actualización 10/07/2026:** El estado de Planner Goals descrito en este documento (mock con barra 60%) quedó desactualizado. A la fecha de esta nota:
> - Existe DB real de goals/milestones (`planner_goals`, `planner_goal_milestones`, `planner_tasks.goal_id`) con RLS y migraciones `202607080004_planner_goals.sql`, `202607080005_fix_planner_goals_insert_rls.sql`, `202607100001_add_progress_mode_to_goals.sql`.
> - Existe API real `/api/planner/goals` con CRUD, complete/fail, milestones y validacion de `progress_mode`.
> - `progress_mode` (`steps | tasks | numeric | boolean | none`) es el campo primario de UX; `target_type` queda como detalle para numeric/boolean.
> - El frontend `GoalForm` usa progress_mode y labels humanos (Phase 2 completada).
> - La UX visible NO es final: GoalDetail sigue siendo CRUD, PlannerGoalsScreen es visualmente pesado y las cards pueden mostrar 0% falso cuando `progress_percentage` es null.
> - Cualquier mención a "Goals mock / placeholder / POST_MVP" en este documento debe leerse como "historico al 27/06"; el estado real actual está en `docs/implementation/planner_goals_final.md` secciones 16 bis a 16 quater.
> - El siguiente paso para Goals es rediseño UX, no mas features.

---

## 1. Executive Summary

### Qué módulos parecen reales

- **Auth:** Implementado y funcional con Supabase Auth + backend Express. Flujo completo de registro, login, logout, password recovery.
- **Household:** Creación de hogares vía RPC `create_household` con membresía automática como coordinator.
- **Members/Invite flow:** Sistema de invite links con tokens reusables + join requests pendientes que requieren aprobación del coordinator.
- **Planner Tasks:** CRUD completo de tareas con estados (pending, completed, awaiting_verification, verified, cancelled), prioridades y verificación.
- **Planner Events:** CRUD de eventos con recurrencia (daily, weekly, monthly) y overrides de ocurrencias individuales.
- **Planner Calendar:** Vista de calendario integrada con eventos y tareas.
- **Family/Members screen:** Listado de miembros, aprobación de solicitudes, remoción de miembros (finalize).
- **Home screens:** Vistas por rol (Adulto, Adolescente, Coordinador, Adulto Mayor) con secciones del planner embebidas.

### Qué módulos parecen mock/demo

- **Planner Goals:** La pestaña "Metas" muestra cards estáticas con progreso hardcodeado (60% completado), badges de "Próximamente" y mensajes de "Vista demo".
- **HomeAdulto:** Secciones completas comentadas/bloqueadas con `if (false)` (schedule, actividad familiar, tareas, calendar strip). Solo muestra status toggle y wellbeing.
- **Family activity feed:** Array `MOCK_ACTIVITY` hardcodeado en `HomeAdulto.tsx`.
- **Wellbeing:** Funcional pero sin persistencia visible en backend.

### Qué módulos parecen parciales

- **Inventory:** Existe pantalla `InventarioScreen.tsx` pero no hay backend ni services asociados visibles.
- **Finance:** No encontrado en backend ni frontend.
- **Geni:** No encontrado.
- **Presence:** Toggle "En casa/Salí" en HomeAdulto, pero sin persistencia o realtime visible.
- **SOS:** No encontrado.
- **FamilyCloud/Documents:** No encontrado.
- **Notifications/Realtime:** No hay implementación visible de WebSockets, Supabase Realtime o sistema de notificaciones.
- **Profile/Settings:** Existe `ProfileScreen.tsx` pero sin integración completa visible.

### Qué partes parecen legacy

- **Tablas legacy:** `public.tasks`, `public.events`, `public.schedules` (migrations 003-005) coexisten con `public.planner_tasks`, `public.planner_events` (migration 001_planner_mvp).
- **Legacy invitations flow:** Ruta `/api/invitations` devuelve 410 (Gone) redirigiendo a invite links flow.
- **Old controllers:** `auth.controller.js` parece no usarse (reemplazado por `auth.final.controller.js`).
- **Households.service legacy:** Funciones `createHouseholdLegacy`, `getUserHousehold`, `getHouseholdMembers` marcadas como LEGACY en `households.ts`.
- **Middleware auth:** Existen `authMiddleware.js` y `authFinalMiddleware.js` (este último es el activo).

### Qué riesgos principales hay

1. **Service role key:** El backend usa `supabaseAdmin` con service role key para operaciones críticas. Si se expone, hay riesgo total.
2. **RLS bypass:** El backend bypasea RLS consistentemente vía service role. Un error en validaciones backend podría permitir acceso no autorizado.
3. **Tablas legacy activas:** `public.tasks`, `public.events`, `public.schedules` tienen RLS habilitado pero no se usan. Podrían causar confusión o usarse por error.
4. **Pending members:** Sistema de join requests depende de aprobación del coordinator. Si el coordinator no aprueba, usuarios quedan bloqueados sin feedback claro.
5. **Last coordinator protection:** RPC `finalize_household_member` previene remover al último coordinator, pero hay que verificar que no haya edge cases.
6. **AppRefreshContext:** Contexto global que marca cambios en planner/home/household pero sin criterio claro de qué pantallas lo escuchan.
7. **JWT ES256:** Hay migración `fix_es256_jwt` que sugiere problemas previos de validación de tokens.

### Qué NO conviene tocar todavía

1. **Tablas legacy (tasks, events, schedules):** No borrar sin confirmar que nada las usa. Podría haber código no descubierto.
2. **Service role operations:** No cambiar la estrategia de auth sin auditar todas las RPCs que usan SECURITY DEFINER.
3. **RLS policies existentes:** No modificar sin entender el flujo completo de auth y membership.
4. **AppRefreshContext:** No eliminar sin mapear todas las pantallas que dependen de `plannerChangedAt`, `homeChangedAt`, `householdChangedAt`.
5. **Migration 001_planner_mvp:** Las políticas RLS usan `is_active_household_member()`. Verificar que esta función existe y funciona antes de tocar.

---

## 2. Repo Source Map

### 2.1 Backend

**Entry points:** No hay `index.js` o `app.js` visible en el scan.

**Rutas:** `auth.js`, `households.js`, `planner.js`, `inviteLinks.js`, `invitations.js` (legacy), `users.js`

**Controllers:** `auth.final.controller.js`, `auth.controller.js` (legacy), `households.controller.js`, `inviteLinks.controller.js`, `planner.tasks.controller.js`, `planner.events.controller.js`, `planner.calendar.controller.js`, `planner.summary.controller.js`, `users.controller.js`

**Services:** `planner.context.service.js`, `planner.tasks.service.js`, `planner.events.service.js`, `planner.calendar.service.js`, `planner.summary.service.js`

**Middlewares:** `authFinalMiddleware.js` (activo), `authMiddleware.js` (legacy), `multipartForm.js`

**Helpers:** `auth.service.js`, `httpErrors.js`, `me.service.js`, `sharp.js`

**Endpoints reales:** POST `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/households`, `/api/households/:id/members/:id/finalize`, `/api/households/:id/invite-links`, `/api/households/:id/join-requests/:id/approve`, `/api/households/:id/join-requests/:id/reject`, `/api/invite-links/join`, `/api/planner/tasks`, `/api/planner/events`, `/api/planner/calendar`, `/api/planner/summary`, PATCH `/api/users/me`, GET `/api/auth/me`, `/api/auth/refresh`

**Endpoints legacy:** POST `/api/invitations/validate` (410 Gone)

### 2.2 Frontend

**Contextos:** `AuthContext`, `HouseholdContext`, `AppRefreshContext`

**Pantallas Auth:** `Splash`, `Login`, `Registro`, `ForgotPassword`, `UpdatePassword`, `AuthLoading`

**Pantallas Household:** `CrearGrupo`, `InvitarPersonas`, `JoinHousehold`, `FamilyScreen`

**Pantallas Home:** `HomeAdulto` (con secciones mock), `HomeAdolescente`, `HomeCoordinador`, `HomeAdultoMayor`, `HomePlannerSections`

**Pantallas Planner:** `PlannerScreen` (tabs: tasks, calendar, goals), `PlannerTasksScreen`, `PlannerCalendarScreen`, `CreateTaskScreen`, `EditTaskScreen`, `CreateEventScreen`, `EditEventScreen`, `TaskForm`, `EventForm`

**Otras:** `ProfileScreen`, `InventarioScreen`, `FeedFamiliarScreen`

**Services:** `api.ts`, `households.ts`, `invitations.ts`, `plannerTasks.ts`, `plannerEvents.ts`, `plannerCalendar.ts`, `plannerSummary.ts`, `tasks.ts` (legacy), `events.ts` (legacy), `schedules.ts` (legacy)

**Componentes UI:** `AppText`, `AppScreen`, `AppInput`, `AppButton`, `AppCard`, `ActionPill`, `Skeleton`, `EmptyState`, `ErrorState`, `GlassSurface`, `AuthScreenLayout`, `AuthTextInput`, `AppLogo`

### 2.3 Supabase / Database

**Migraciones Auth:** `202606210001_auth_base.sql`, `202606210002_rls_auth.sql`, `202606210006_ensure_user_fn.sql`, `202606210007_join_by_token_fn.sql`, `202606210008_fix_es256_jwt.sql`, `202606210009_auth_onboarding_final.sql`

**Migraciones Legacy:** `202606210003_schedules.sql`, `202606210004_tasks.sql`, `202606210005_events.sql`

**Migraciones Planner:** `202606230001_planner_mvp.sql`, `202606230002_planner_table_grants.sql`, `202606230003_finalize_household_member.sql`, `202606230004_fix_finalize_household_member_order.sql`, `202606230005_planner_event_occurrence_overrides.sql`

**Tablas nuevas:** `planner_tasks`, `planner_events`, `household_members` (con role, status), `people` (mencionada, no verificada)

**Tablas legacy:** `tasks`, `events`, `schedules`, `users`, `invitations`

**Funciones RPC:** `create_household`, `finalize_household_member`, `create_household_invite_link`, `revoke_household_invite_link`, `join_household_by_invite_token`, `approve_household_member`, `reject_household_member`, `ensure_public_user`

**Helpers RLS:** `is_household_member`, `is_household_coordinator`, `shares_household_with`, `is_active_household_member` (no encontrada en migraciones), `current_person_id`, `effective_uid`

### 2.4 Docs

**Documentos fuente:** `docs/rls-policies/familyhub-rls-policies-deliverables.md`, `docs/auth-base/familyhub-auth-base-deliverables.md`, `docs/households-invitations/familyhub-households-invitations-deliverables.md`, `docs/profile-update/familyhub-backend-profile-update-deliverables.md`, `supabase/docs/reglas_negocio_invitaciones.md`

---

## 3. Module Matrix

| Módulo | Frontend | Backend | DB | Estado | Real/Mock |
|--------|----------|---------|-----|--------|-----------|
| Auth | ✅ | ✅ | ✅ | Real | Real |
| Household | ✅ | ✅ | ✅ | Real | Real |
| People/Members | ✅ | ✅ | ✅ | Real | Real |
| Invite links | ✅ | ✅ | ✅ | Real | Real |
| Home | ✅ | ❌ | ❌ | Parcial | Mix |
| Planner Tasks | ✅ | ✅ | ✅ | Real | Real |
| Planner Events | ✅ | ✅ | ✅ | Real | Real |
| Planner Goals | ✅ | ❌ | ❌ | Mock | Mock |
| Inventory | ✅ | ❌ | ❌ | Pendiente | N/A |
| Finance | ❌ | ❌ | ❌ | No encontrado | N/A |
| Presence | ✅ | ❌ | ❌ | Parcial | Mock |
| Settings | ✅ | ⚠️ | ⚠️ | Parcial | Real |

---

## 4. Real Implemented

**Auth:** Registro, login, logout, password recovery, session persistence, auto-refresh, deep linking, `/api/auth/me` con navegación contextual.

**Household:** Crear hogar con RPC, unirse con token, toggle tipo de familia (UI).

**Members:** Listado, roles, remoción con `finalize_household_member`, protección último coordinator.

**Invite flow:** Generate/revoke invite links, join by token, list/approve/reject join requests, QR code.

**Planner Tasks:** CRUD completo, estados, prioridades, verificación.

**Planner Events:** CRUD, recurrencia, overrides de ocurrencias.

**Planner Calendar:** Vista mensual, eventos + tareas.

**Home:** Vistas por rol, toggle presence (mock), wellbeing (sin persistencia).

---

## 5. Partial / Fragile

1. **HomeAdulto secciones bloqueadas** (`if (false)`) — P0, desbloquear y conectar con datos reales.
2. **Planner Goals demo** — Cards fake, decidir implementar o marcar "Próximamente".
3. **Presence sin persistencia** — Requiere sistema realtime, no esta semana.
4. **Wellbeing sin persistencia** — Decidir si se implementa o remueve.
5. **AppRefreshContext sin criterio** — Mapear usos antes de modificar.
6. **Legacy tables coexistiendo** — Verificar que nada las usa antes de deshabilitar.

---

## 6. Mock / Demo

- `MOCK_ACTIVITY` en `HomeAdulto.tsx` — Dentro de `if (false)`, remover.
- Planner Goals cards — Mezclado con datos reales, marcar con badge "Demo" o remover.
- Wellbeing — Sin persistencia, decidir implementar o quitar.

---

## 7. Legacy / Deprecated

- `auth.controller.js` — No usado, verificar git history antes de borrar.
- `authMiddleware.js` — No usado, verificar antes de borrar.
- `invitations routes` — 410 Gone, frontend podría llamar todavía.
- `createHouseholdInvitation`, `validateInvitation` — Sin uso, funciones largas.
- Tablas `tasks`, `events`, `schedules` — RLS habilitado, verificar DB antes de tocar.
- `public.users` vs `public.people` — Inconsistencia, verificar schema real.

---

## 8. Security / RLS / Permissions Risks

**Tablas con RLS:** users, households, household_members, invitations, schedules, tasks, events, planner_tasks, planner_events

**Helpers RLS:** `is_active_household_member()` no encontrada en migraciones — **verificar en DB**.

**Pending members:** Sin políticas explícitas, verificar acceso.

**Roles:** adolescent/child/guest sin limitaciones implementadas.

**Service role:** Sin audit log, recomendar loguear operaciones críticas.

**Riesgo entre hogares:** Si `is_active_household_member()` falla, hay fuga de datos.

---

## 9. UX / Visual Debt

**Auth:** ✅ Consistente.

**Home:** ⚠️ Incompleto — secciones comentadas, sin skeletons.

**Planner:** ✅ Mayormente completo — Goals es mock.

**Family/Members:** ✅ Completo — skeletons, empty states, error states.

**Profile:** ⚠️ No auditado — falta edición de perfil, preferencias.

---

## 10. Data Flow / Performance Risks

- **Fetch duplicado:** `PlannerScreen.loadSummary()` se llama múltiples veces.
- **Refresh agresivo:** `AppRefreshContext` sin debounce.
- **Scroll loss:** Al cambiar tabs en Planner.
- **Datos mock mezclados:** Planner Goals en misma vista que datos reales.

---

## 11. Critical Questions Before Implementation

1. ¿`is_active_household_member()` existe en DB?
2. ¿`public.people` existe o es `public.users`?
3. ¿Qué permisos tiene cada rol además de coordinator?
4. ¿Pending member puede ver algo del hogar?
5. ¿Las tablas legacy tienen datos que migrar?
6. ¿Qué secciones de HomeAdulto deben mostrar datos reales?
7. ¿Wellbeing/Presence se implementan o remueven?

---

## 12. Recommended Next Step

**P0 — Esta semana:**
1. Verificar `is_active_household_member()` en DB.
2. Confirmar schema `people` vs `users`.
3. Desbloquear HomeAdulto secciones comentadas.
4. Limpiar mocks obvios.

**P1 — Próxima semana:**
5. Decidir sobre Planner Goals.
6. Tests de RLS.
7. Audit log mínimo.

**Phase 1:** Core UI/UX premium (Auth, Home, Planner, Household/Members).

---

## Apéndice A: Archivos inspeccionados

**Backend:** 18+ archivos (routes, controllers, services, middleware, lib, config, sql)

**Frontend:** 25+ archivos (App, navigation, contexts, services, screens, components)

**Supabase:** 14 migraciones

**Docs:** 7 archivos

---

**Fin del documento de auditoría.**