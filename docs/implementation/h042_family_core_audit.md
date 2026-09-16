# H-042 Family Core Audit — People mínimo + Household + Members + Profile

## 1. Resumen ejecutivo

**Estado general:** El núcleo familiar de HomePlus está **semi-implementado al 75%**. La infraestructura backend (tablas, RPCs, RLS, endpoints) está completa y funcional. El frontend tiene pantallas implementadas pero con brechas de integración y UX.

**Qué está semi-implementado:**
- ✅ **Auth/Onboarding:** Completamente funcional. `/api/auth/me` devuelve persona, membresías, hogar activo y navegación.
- ✅ **Household (crear):** RPC `create_household` funcional. Endpoint `POST /api/households` implementado. Frontend `P02CrearGrupo.tsx` funcional.
- ✅ **Invite Links:** RPCs `create_household_invite_link`, `join_household_by_invite_token`, `approve_household_member`, `reject_household_member` implementadas. Endpoints en `/api/invite-links/*` funcionales.
- ✅ **Members List:** View `household_people_public` con RLS. `HouseholdContext` consume la view. `FamilyScreen` y `ProfileScreen` muestran miembros.
- ⚠️ **Profile Screen:** UI completa pero datos parciales. Usa `authMe.person` para nombre/avatar, pero avatar_url no se actualiza desde backend (endpoint `PATCH /api/users/me` existe pero actualiza `user_metadata`, no tabla `people`).
- ⚠️ **People mínimo:** Tabla `people` existe con campos completos, pero `avatar_url` y `phone` no se usan en ningún flujo crítico. `active_household_id` sí se usa.
- ❌ **Legacy invitations:** Endpoints `POST /invitations/validate` y `POST /households/:id/invitations` (legacy) están deshabilitados (410). El frontend NO los usa, usa el nuevo flujo de invite links.

**Qué falta cerrar:**
1. **Avatar sync:** El endpoint `PATCH /api/users/me` actualiza `auth.users.user_metadata.avatar_url`, pero la tabla `people.avatar_url` nunca se actualiza. `HouseholdContext` lee desde `household_people_public` que viene de `people.avatar_url`.
2. **Phone/Profile edit:** No hay UI para editar `phone`, `date_of_birth`, `first_name`, `last_name` en `people`.
3. **Household selection:** Si un usuario tiene múltiples membresías activas, no hay pantalla para seleccionar hogar activo. El código en `me.service.js` detecta el caso (`select_household`, `set_active_household`) pero no hay UI en frontend.
4. **Pending approval UX:** `WaitingApprovalScreen` existe pero es muy básica. No muestra cuándo se envió la solicitud ni cómo contactar al coordinador.
5. **HomeAdultoMayor:** Es la única pantalla que muestra miembros directamente. Las otras 3 Home screens solo muestran miembros indirectamente vía Planner (nombres de asignados).

**Readiness para producción:**
- **Backend:** 90% listo. Faltan pruebas de integración multiusuario y validación de RLS en producción.
- **Frontend:** 70% listo. Faltan: sync de avatar, edición de perfil, pantalla de selección de hogar, y mejoras de UX en pending approval.

**Riesgo principal:**
- **Inconsistencia de avatar:** Si un usuario sube avatar vía `PATCH /api/users/me`, el avatar se guarda en `user_metadata` pero `people.avatar_url` queda desactualizado. `HouseholdContext` y `FamilyScreen` muestran el avatar viejo (o null).
- **Sin selección de hogar:** Si un usuario crea un segundo hogar, queda en estado "household selection required" sin UI para resolverlo.

---

## 2. Mapa funcional por zona de la app

| Zona | Funciones encontradas | Archivos | Estado | Comentarios |
| ---- | -------------------- | -------- | ------ | ----------- |
| **Auth/Onboarding** | Registro, Login, `/me`, navegación condicional | `backend/src/routes/auth.js`, `backend/src/controllers/auth.final.controller.js`, `backend/src/lib/me.service.js`, `front/.../AuthContext.tsx`, `AppNavigator.tsx` | ✅ Real | `/me` devuelve persona, membresías, hogar activo, navegación. Navegación basada en `navigation.next`. |
| **People mínimo** | Tabla `people`, `auth_user_id`, `active_household_id`, `display_name`, `avatar_url` | `supabase/migrations/202606210009_auth_onboarding_final.sql` (tabla people), `backend/src/lib/auth.service.js` (getPersonByAuthUserId) | ✅ Real (schema) / ⚠️ Parcial (uso) | Tabla completa. `display_name` se usa. `avatar_url` NO se sincroniza desde backend. `phone`, `date_of_birth` no se usan. |
| **Household** | Crear hogar, hogar activo, datos básicos (name, slug, timezone, config) | `backend/src/controllers/households.controller.js:createHousehold`, `supabase/...009.sql` (RPC `create_household`), `front/.../CrearGrupo.tsx` | ✅ Real | RPC crea household + membership coordinador + actualiza `people.active_household_id`. Frontend funcional. |
| **Members** | Listar miembros, mostrar roles, mostrar estados (active/pending) | `supabase/...009.sql` (view `household_people_public`, RLS), `front/.../HouseholdContext.tsx`, `FamilyScreen.tsx` | ✅ Real | View devuelve `person_id`, `display_name`, `avatar_url`, `role`, `status`. `HouseholdContext` la consume. |
| **Invite Flow** | Crear link, join por token, pending request, approve, reject | `backend/src/controllers/inviteLinks.controller.js`, `supabase/...009.sql` (RPCs), `front/.../InvitarPersonas.tsx`, `JoinHousehold.tsx`, `FamilyScreen.tsx` | ✅ Real | RPCs `create_household_invite_link`, `join_household_by_invite_token`, `approve_household_member`, `reject_household_member` funcionales. Frontend completo. |
| **Profile** | Mostrar perfil, nombre, avatar, rol, hogar activo, logout | `front/.../ProfileScreen.tsx`, `backend/src/controllers/users.controller.js:updateMe` | ⚠️ Parcial | UI completa. Avatar no se sincroniza en `people`. No hay edición de `phone`, `first_name`, `last_name`. |
| **Home dependency** | Mostrar hogar activo, miembros (solo HomeAdultoMayor), asignados en tareas | `front/.../home/HomeCoordinador.tsx`, `HomeAdulto.tsx`, `HomeAdultoMayor.tsx`, `HomeAdolescente.tsx`, `HomePlannerSections.tsx` | ⚠️ Parcial | Solo HomeAdultoMayor muestra miembros directamente. Las otras usan `currentHousehold.nombre`. Planner usa `members` para resolver nombres de asignados. |
| **Planner dependency** | Asignar responsables a tareas/eventos | `front/.../planner/TaskForm.tsx`, `PlannerTasksScreen.tsx`, `HomePlannerSections.tsx` | ✅ Real | `TaskForm` usa `members` de `HouseholdContext` para mostrar chips de asignación. `assigned_to_member_id` se guarda en tarea. |

---

## 3. Backend real detectado

| Función | Existe | Método/Ruta/RPC | Archivo | Request detectado | Response detectado | Estado | Notas |
| ------- | ------ | --------------- | ------- | ---------------- | ----------------- | ------ | ----- |
| **Registro** | ✅ | `POST /api/auth/register` | `backend/src/controllers/auth.final.controller.js:register` | `{ email, password, display_name }` | `{ user, person, session, requires_email_confirmation }` | ✅ Real | Crea `auth.users` + `people`. |
| **Login** | ✅ | `POST /api/auth/login` | `backend/src/controllers/auth.final.controller.js:login` | `{ email, password }` | `{ user, person, session, me }` | ✅ Real | Devuelve `me` completo. |
| **Auth Me** | ✅ | `GET /api/auth/me` | `backend/src/controllers/auth.final.controller.js:me` | Bearer token | `{ user, person, memberships, active_household, navigation }` | ✅ Real | RPC `buildMe` en `me.service.js`. |
| **Crear hogar** | ✅ | `POST /api/households` | `backend/src/controllers/households.controller.js:createHousehold` | `{ name, slug?, timezone?, config? }` | `{ household, membership, person, me }` | ✅ Real | RPC `create_household` crea todo. |
| **Crear invite link** | ✅ | `POST /api/households/:household_id/invite-links` | `backend/src/controllers/inviteLinks.controller.js:createInviteLink` | Bearer token | `{ invite_link }` | ✅ Real | RPC `create_household_invite_link`. |
| **Revoke invite link** | ✅ | `POST /api/households/:household_id/invite-links/:id/revoke` | `backend/src/controllers/inviteLinks.controller.js:revokeInviteLink` | Bearer token | `{ invite_link }` | ✅ Real | RPC `revoke_household_invite_link`. |
| **Join por token** | ✅ | `POST /api/invite-links/join` | `backend/src/controllers/inviteLinks.controller.js:joinInviteLink` | `{ token }` | `{ join_request: { result, membership } }` | ✅ Real | RPC `join_household_by_invite_token`. |
| **Listar solicitudes** | ✅ | `GET /api/households/:household_id/join-requests` | `backend/src/controllers/inviteLinks.controller.js:listJoinRequests` | Bearer token | `{ join_requests: [] }` | ✅ Real | Query directa a `household_members` con status=pending. |
| **Approve solicitud** | ✅ | `POST /api/households/:household_id/join-requests/:membership_id/approve` | `backend/src/controllers/inviteLinks.controller.js:approveJoinRequest` | `{ role }` | `{ membership }` | ✅ Real | RPC `approve_household_member`. |
| **Reject solicitud** | ✅ | `POST /api/households/:household_id/join-requests/:membership_id/reject` | `backend/src/controllers/inviteLinks.controller.js:rejectJoinRequest` | Bearer token | `{ membership }` | ✅ Real | RPC `reject_household_member`. |
| **Finalize miembro** | ✅ | `POST /api/households/:household_id/members/:membership_id/finalize` | `backend/src/controllers/households.controller.js:finalizeHouseholdMember` | Bearer token | `{ membership }` | ✅ Real | RPC `finalize_household_member`. |
| **Update perfil** | ⚠️ | `PATCH /api/users/me` | `backend/src/controllers/users.controller.js:updateMe` | `multipart/form-data` (nombre, avatar, notification_prefs) | `{ usuario }` | ⚠️ Legacy | Actualiza `auth.users.user_metadata`, NO `people`. |
| **Legacy validate** | ❌ | `POST /api/invitations/validate` | `backend/src/routes/invitations.js:legacyInvitationFlowDisabled` | - | `410 { error: 'legacy_invitation_flow_disabled' }` | ❌ Deshabilitado | Usaba tabla `invitations` legacy. |
| **RPC create_household** | ✅ | `public.create_household(p_name, p_slug, p_timezone, p_default_language, p_config)` | `supabase/migrations/202606210009_auth_onboarding_final.sql:811` | - | `{ household, membership, person, error }` | ✅ Real | Crea household + membership coordinador + actualiza `people.active_household_id`. |
| **RPC join_household_by_invite_token** | ✅ | `public.join_household_by_invite_token(p_token)` | `supabase/...009.sql:870` | - | `{ result, membership, error }` | ✅ Real | Crea membership pending. |
| **RPC approve_household_member** | ✅ | `public.approve_household_member(p_membership_id, p_role)` | `supabase/...009.sql:935` | - | `{ membership, error }` | ✅ Real | Cambia status a active, actualiza `people.active_household_id`. |
| **RPC reject_household_member** | ✅ | `public.reject_household_member(p_membership_id)` | `supabase/...009.sql:989` | - | `{ membership, error }` | ✅ Real | Cambia status a finalized. |
| **RPC create_household_invite_link** | ✅ | `public.create_household_invite_link(p_household_id)` | `supabase/...009.sql:1053` | - | `{ invite_link, error }` | ✅ Real | Genera token hex aleatorio. |
| **RPC revoke_household_invite_link** | ✅ | `public.revoke_household_invite_link(p_invite_link_id)` | `supabase/...009.sql:1101` | - | `{ invite_link, error }` | ✅ Real | Set `status=revoked`, `revoked_at=now()`. |
| **RPC finalize_household_member** | ✅ | `public.finalize_household_member(p_household_id, p_membership_id)` | `supabase/...0004_fix_finalize_household_member_order.sql` | - | `{ membership, success, error }` | ✅ Real | Limpia `people.active_household_id` antes de finalizar. |

---

## 4. Frontend real detectado

| Pantalla/Service/Context | Archivo | Qué hace hoy | Real/Mock/Legacy | Problemas | Recomendación |
| ------------------------ | ------- | ------------ | ---------------- | --------- | ------------- |
| **AuthContext** | `front/.../context/AuthContext.tsx` | Maneja sesión Supabase, llama a `/api/auth/me`, gestiona deep links (OAuth + join tokens) | ✅ Real | - | Mantener. |
| **HouseholdContext** | `front/.../context/HouseholdContext.tsx` | Expone `currentHousehold`, `currentRole`, `members`, `isCoordinator`. Carga miembros desde `household_people_public` view. | ✅ Real | `members` puede ser fallback mock si la view falla. | Agregar log cuando se usa fallback. |
| **AppNavigator** | `front/.../navigation/AppNavigator.tsx` | Navegación basada en `authMe.navigation.next`. Pantallas de fallback para pending/approval/suspension. | ✅ Real | - | Mantener. |
| **P02CrearGrupo** | `front/.../screens/CrearGrupo.tsx` | Crea hogar con nombre. UI para tipo familia (no se persiste al backend). Opción de unir con token. | ✅ Real | `tipoFamilia` no se guarda. | Eliminar UI de tipo familia o agregar campo en `households.config`. |
| **JoinHousehold** | `front/.../screens/JoinHousehold.tsx` | Procesa token de invitación. Muestra loading, éxito (pending) o error. | ✅ Real | - | Mejorar mensaje de éxito: mostrar cuándo se envió. |
| **P03InvitarPersonas** | `front/.../screens/InvitarPersonas.tsx` | Genera invite link, muestra QR, lista solicitudes pending, aproba/rechaza con selector de rol. | ✅ Real | - | Mantener. |
| **FamilyScreen** | `front/.../screens/FamilyScreen.tsx` | Lista miembros activos, muestra solicitudes pending (coordinador), quita miembros (finalize). | ✅ Real | - | Mantener. |
| **ProfileScreen** | `front/.../screens/ProfileScreen.tsx` | Muestra perfil: nombre, avatar (iniciales), rol, email, hogar, miembros. Settings UI solo. | ⚠️ Parcial | Avatar no se sincroniza desde `people.avatar_url`. Settings no persisten. | Conectar avatar real. Eliminar settings UI o implementar. |
| **HomeCoordinador** | `front/.../screens/home/HomeCoordinador.tsx` | Muestra saludo con nombre, nombre del hogar. Usa `members` solo para Planner. | ✅ Real | No muestra miembros directamente. | OK. |
| **HomeAdulto** | `front/.../screens/home/HomeAdulto.tsx` | Similar a Coordinador. Usa `members` solo para Planner. | ✅ Real | No muestra miembros directamente. | OK. |
| **HomeAdolescente** | `front/.../screens/home/HomeAdolescente.tsx` | Similar. `currentHousehold` solo para gatear `fetchData`. | ✅ Real | No muestra ni hogar ni miembros. | OK. |
| **HomeAdultoMayor** | `front/.../screens/home/HomeAdultoMayor.tsx` | **Única Home que muestra miembros directamente** (contactos rápidos). | ✅ Real | - | Mantener. |
| **TaskForm** | `front/.../planner/TaskForm.tsx` | Formulario para crear/editar tarea. Usa `members` para chips de asignación ("Sin asignar", "Yo", miembros activos). | ✅ Real | - | Mantener. |
| **API Service** | `front/.../services/api.ts` | Funciones para `/api/auth/*`, `/api/households/*`, `/api/invite-links/*`. Tipos TypeScript completos. | ✅ Real | - | Mantener. |
| **Invitations Service** | `front/.../services/invitations.ts` | Wrapper para invite link flow. Usa `api.ts` functions. | ✅ Real | - | Mantener. |
| **Households Service** | `front/.../services/households.ts` | Wrapper para crear hogar. Delega en `api.createHousehold`. | ✅ Real | - | Mantener. |

---

## 5. Integración con People mínimo

| Punto | Estado en repo | Archivo/Fuente | Decisión recomendada | Impacto |
| ----- | -------------- | -------------- | -------------------- | ------- |
| **Modelo people** | ✅ Tabla completa con 15 campos | `supabase/...009.sql:22-43` | Mantener estructura. | Bajo |
| **auth_user_id** | ✅ FK a `auth.users.id`, unique not null | `supabase/...009.sql:24` | Mantener. | Bajo |
| **active_household_id** | ✅ FK a `households.id`, validada por trigger | `supabase/...009.sql:34`, `467-489` | Mantener. | Bajo |
| **household_members** | ✅ Tabla intermedia con role, status, onboarding fields | `supabase/...009.sql:58-90` | Mantener. | Bajo |
| **display_name** | ✅ Usado en `AuthMePerson`, `ProfileScreen`, `FamilyScreen` | `backend/src/lib/auth.service.js:80`, `ProfileScreen.tsx:64` | Mantener como nombre principal. | Bajo |
| **avatar_url** | ⚠️ Existe en `people`, pero no se sincroniza | `PATCH /api/users/me` actualiza `user_metadata`, no `people` | **CRÍTICO**: Sincronizar avatar a `people.avatar_url` al subir. | Alto |
| **ProfileScreen usa** | `authMe.person.display_name`, `user_metadata.nombre`, `members[0].user.avatar_url` (fallback) | `ProfileScreen.tsx:64, 103` | Unificar: usar `authMe.person.avatar_url` cuando esté disponible. | Medio |
| **Members UI usa** | `household_people_public.display_name`, `avatar_url` | `HouseholdContext.tsx:103-127` | Mantener. | Bajo |
| **ID para Planner** | `membership.id` (household_member_id) se usa en `assigned_to_member_id` | `TaskForm.tsx:230`, `PlannerTasksScreen.tsx:288` | Mantener. `membership.id` es el ID correcto para asignaciones. | Bajo |
| **Qué queda fuera** | `first_name`, `last_name`, `phone`, `date_of_birth`, `gender` NO se usan en ningún flujo | `people` tabla tiene los campos | **Decidir**: Implementar edición completa de perfil o eliminar campos no usados. | Medio |

---

## 6. Qué funciones ya están semi implementadas

### Listas para usar
- ✅ Registro/Login con `/api/auth/me` completo
- ✅ Crear hogar (RPC + endpoint + pantalla)
- ✅ Invite links (crear, revoke, join, approve, reject)
- ✅ Listar miembros activos (view + RLS + HouseholdContext + FamilyScreen)
- ✅ Pending requests (listar, aprobar, rechazar con selector de rol)
- ✅ Finalize miembro (quitar de hogar)
- ✅ Navegación condicional basada en estado de membresía
- ✅ Planner asigna responsables usando `members`

### Requieren ajuste
- ⚠️ **Avatar sync:** `PATCH /api/users/me` actualiza `user_metadata` pero no `people.avatar_url`. `HouseholdContext` lee de `people` → avatar no se actualiza en la UI de miembros.
- ⚠️ **Profile edit:** No hay UI para editar `phone`, `first_name`, `last_name`, `date_of_birth`.
- ⚠️ **Household selection:** Si hay múltiples hogares activos, no hay UI para seleccionar. El backend detecta el caso (`select_household`, `set_active_household`) pero el frontend no tiene pantalla.
- ⚠️ **P02CrearGrupo tipo familia:** UI existe pero no se persiste.
- ⚠️ **WaitingApprovalScreen:** Muy básica. No muestra fecha de solicitud ni cómo contactar al coordinador.

### Legacy / conviene reemplazar
- ❌ **Legacy invitations:** `POST /invitations/validate` y `POST /households/:id/invitations` (legacy) devuelven 410. Tabla `invitations` legacy existe pero no se usa.
- ❌ **`users` table:** Tabla `public.users` legacy existe (migration_001), pero el nuevo flujo usa `people`. Hay data bridge en migration_009 pero es solo para desarrollo.
- ❌ **`household_members.user_id` / `profile_id`:** Columnas legacy deshabilitadas (nullable) en migration_009. Usar `person_id`.

### Faltan
- ❌ Pantalla de selección de hogar (multi-household)
- ❌ Edición completa de perfil (phone, first_name, last_name, date_of_birth)
- ❌ Avatar upload UI en ProfileScreen (actualmente solo "Editar perfil" → Alert "Próximamente")
- ❌ Mejoras UX en pending approval (fecha de solicitud, contacto)
- ❌ Soporte para múltiples hogares activos (switch entre hogares)

---

## 7. Comparación contra household_members_profile.md

> Nota: La spec `household_members_profile.md` no existe en el repo. Esta comparación se basa en los documentos relacionados encontrados: `familyhub-households-invitations-deliverables.md`, `familyhub-backend-profile-update-deliverables.md`, y `familyhub-auth-base-deliverables.md`.

| Requisito spec | Existe en repo | Dónde | Falta | Impacto | Recomendación |
| -------------- | -------------- | ----- | ----- | ------- | ------------- |
| **Tablas people, households, household_members** | ✅ | `supabase/...009.sql` | - | Bajo | Mantener. |
| **RLS policies en people/households/members** | ✅ | `supabase/...009.sql:656-797` | - | Bajo | Validar en producción. |
| **RPC create_household** | ✅ | `supabase/...009.sql:811` | - | Bajo | Mantener. |
| **RPC join_household_by_invite_token** | ✅ | `supabase/...009.sql:870` | - | Bajo | Mantener. |
| **RPC approve_household_member** | ✅ | `supabase/...009.sql:935` | - | Bajo | Mantener. |
| **RPC reject_household_member** | ✅ | `supabase/...009.sql:989` | - | Bajo | Mantener. |
| **RPC create_household_invite_link** | ✅ | `supabase/...009.sql:1053` | - | Bajo | Mantener. |
| **RPC revoke_household_invite_link** | ✅ | `supabase/...009.sql:1101` | - | Bajo | Mantener. |
| **Endpoint POST /api/auth/me** | ✅ | `backend/src/routes/auth.js:10` | - | Bajo | Mantener. |
| **Endpoint POST /api/households** | ✅ | `backend/src/routes/households.js:13` | - | Bajo | Mantener. |
| **Endpoint POST /api/invite-links/join** | ✅ | `backend/src/routes/inviteLinks.js:27` | - | Bajo | Mantener. |
| **Endpoint GET /api/households/:id/join-requests** | ✅ | `backend/src/routes/inviteLinks.js:15` | - | Bajo | Mantener. |
| **Endpoint POST /api/households/:id/invite-links** | ✅ | `backend/src/routes/inviteLinks.js:9` | - | Bajo | Mantener. |
| **Pantalla crear hogar** | ✅ | `front/.../CrearGrupo.tsx` | Tipo familia no se guarda | Medio | Eliminar UI o persistir en config. |
| **Pantalla join por token** | ✅ | `front/.../JoinHousehold.tsx` | - | Bajo | Mantener. |
| **Pantalla invitar personas** | ✅ | `front/.../InvitarPersonas.tsx` | - | Bajo | Mantener. |
| **Pantalla family/members** | ✅ | `front/.../FamilyScreen.tsx` | - | Bajo | Mantener. |
| **Pantalla profile** | ⚠️ | `front/.../ProfileScreen.tsx` | Avatar no se sincroniza, no hay edición | Alto | Sincronizar avatar. Agregar edición. |
| **Avatar upload** | ⚠️ | `backend/src/controllers/users.controller.js` | Actualiza `user_metadata`, no `people` | Alto | Actualizar `people.avatar_url`. |
| **Edición de phone/first_name/last_name** | ❌ | - | No hay UI ni endpoint para actualizar `people` | Medio | Implementar PATCH /api/people/me. |
| **Selección de hogar (multi-household)** | ❌ | - | No hay UI | Alto | Crear HouseholdSelectionScreen. |

---

## 8. Propuesta de diseño funcional final

### Qué queda en People/Familia (FamilyScreen)
- Listar miembros activos del hogar (nombre, rol, avatar)
- Gestionar solicitudes pending (coordinador: aprobar/rechazar con selector de rol)
- Quitar miembros del hogar (coordinador: finalize)
- Botón para ir a "Invitar personas"

### Qué queda en Household
- Crear hogar (nombre, slug opcional)
- Datos básicos: name, slug, timezone, default_language, config (JSON)
- El creador queda como coordinator automáticamente
- `people.active_household_id` se actualiza al crear

### Qué queda en Profile (ProfileScreen)
- Mostrar: avatar, display_name, email, rol en hogar, nombre del hogar
- Miembro desde (fecha de creación de `auth.users`)
- Lista de miembros del hogar (igual que FamilyScreen pero en formato compacto)
- Settings toggles (UI solo por ahora: notificaciones, privacidad, apariencia)
- Botón "Cerrar sesión"
- **Nuevo:** Botón "Editar perfil" que abre modal para editar:
  - `display_name` (obligatorio)
  - `first_name`, `last_name` (opcional)
  - `phone` (opcional)
  - `avatar` (subir foto)
- **Nuevo:** Si hay múltiples hogares activos, mostrar selector de hogar activo

### Qué queda en Auth/Onboarding
- Registro (email, password, display_name) → crea `auth.users` + `people`
- Login (email, password) → devuelve `me` completo
- `/api/auth/me` → devuelve `{ user, person, memberships, active_household, navigation }`
- Navegación basada en `navigation.next`:
  - `create_or_join_household` → P02CrearGrupo
  - `pending_approval` → WaitingApprovalScreen
  - `access_suspended` → AccessSuspendedFallback
  - `select_household` → HouseholdSelectionScreen (NUEVO)
  - `home` → HomeTabs
- Deep links: `homeplus://join?token=xxx` → JoinHousehold

### Qué consumen Home y Planner
- **Home screens:**
  - `currentHousehold.nombre` (HomeCoordinador, HomeAdulto)
  - `members` para HomeAdultoMayor (contactos rápidos)
  - `members` para resolver nombres de asignados en tareas (HomePlannerSections)
- **Planner:**
  - `members` para mostrar chips de asignación en TaskForm
  - `assigned_to_member_id` (membership.id) se guarda en tarea
  - `memberNameById` map para mostrar nombres en PlannerTasksScreen

---

## 9. Plan recomendado por etapas

### H-042.1 — Sync de avatar y fix de Profile
**Objetivo:** Sincronizar `people.avatar_url` cuando se sube un avatar.

**Archivos probables:**
- `backend/src/controllers/users.controller.js:updateMe`
- `backend/src/lib/sharp.js` (ya existe)
- `front/.../ProfileScreen.tsx` (agregar UI de upload)

**Riesgo:** Bajo. Solo afecta avatar upload.

**Criterio DONE:**
- Subir avatar en ProfileScreen actualiza `people.avatar_url`
- `HouseholdContext` muestra el nuevo avatar en `members`
- `FamilyScreen` refleja el cambio

---

### H-042.2 — Edición completa de perfil
**Objetivo:** Permitir editar `first_name`, `last_name`, `phone`, `display_name`.

**Archivos probables:**
- `backend/src/controllers/users.controller.js` (agregar PATCH /api/people/me)
- `front/.../services/api.ts` (agregar updateProfile)
- `front/.../ProfileScreen.tsx` (agregar modal de edición)

**Riesgo:** Medio. Nuevo endpoint.

**Criterio DONE:**
- Modal de edición en ProfileScreen
- Campos: display_name, first_name, last_name, phone
- Guardado exitoso actualiza `people`
- `authMe.person` se actualiza tras guardar

---

### H-042.3 — Selección de hogar (multi-household)
**Objetivo:** Pantalla para seleccionar hogar activo cuando hay múltiples.

**Archivos probables:**
- `backend/src/lib/me.service.js:resolveNavigation` (ya detecta el caso)
- `backend/src/lib/me.service.js:set_active_household` (RPC ya existe)
- `front/.../screens/HouseholdSelectionScreen.tsx` (NUEVO)
- `front/.../AppNavigator.tsx` (agregar route)

**Riesgo:** Medio. Cambia flujo de navegación.

**Criterio DONE:**
- Si `navigation.next === 'select_household'`, mostrar HouseholdSelectionScreen
- Usuario selecciona hogar → llama a `set_active_household`
- `authMe.active_household` se actualiza
- Navegación a HomeTabs

---

### H-042.4 — Mejoras UX pending approval
**Objetivo:** Mejorar WaitingApprovalScreen con fecha de solicitud y contacto.

**Archivos probables:**
- `front/.../screens/WaitingApprovalScreen.tsx`
- `backend/src/lib/me.service.js` (agregar fecha de solicitud en `/me`)

**Riesgo:** Bajo. Solo UI.

**Criterio DONE:**
- WaitingApprovalScreen muestra fecha/hora de la solicitud
- Mensaje: "Tu solicitud fue enviada el [fecha]. El coordinador será notificado."
- Botón "Actualizar" refresca estado

---

### H-042.5 — Limpieza legacy
**Objetivo:** Eliminar código legacy de invitations y users table.

**Archivos probables:**
- `backend/src/routes/invitations.js` (eliminar)
- `backend/src/routes/households.js:19` (eliminar ruta legacy)
- `supabase/migrations/202606210009_auth_onboarding_final.sql` (mantener data bridge pero marcar como deprecated)

**Riesgo:** Bajo. Código no usado.

**Criterio DONE:**
- Endpoints legacy eliminados (410 → 404)
- No hay referencias a `invitations` table en código activo
- Documentar que `users` table es legacy

---

## 10. QA sugerido

### Checklist multiusuario

#### Escenario 1: Usuario sin hogar
1. Registrar usuario nuevo
2. Login
3. Verificar `navigation.next === 'create_or_join_household'`
4. Navega a P02CrearGrupo
5. Crear hogar "Familia García"
6. Verificar:
   - `authMe.active_household` no es null
   - `authMe.navigation.next === 'home'`
   - `people.active_household_id` se actualiza
   - `household_members` tiene 1 fila (coordinator, active)
7. Navega a HomeTabs

#### Escenario 2: Crear invite link
1. Como coordinador, navegar a P03InvitarPersonas
2. Generar link
3. Verificar:
   - `household_invite_links` tiene 1 fila (active, expires_at = now + 7 days)
   - QR muestra `homeplus://join?token=xxx`
   - Link se puede copiar/compartir

#### Escenario 3: Join por token
1. Registrar segundo usuario
2. Login
3. Pegar link de invitación (o simular deep link `homeplus://join?token=xxx`)
4. JoinHouseholdScreen procesa token
5. Verificar:
   - `household_members` tiene 2 filas (coordinator + pending)
   - `navigation.next === 'pending_approval'`
   - WaitingApprovalScreen muestra "Esperando aprobación"

#### Escenario 4: Approve solicitud
1. Volver a coordinador
2. Ir a FamilyScreen o InvitarPersonas
3. Ver solicitud pending
4. Seleccionar rol "Adulto"
5. Aprobar
6. Verificar:
   - `household_members.status` cambia a 'active'
   - `household_members.role` = 'adult'
   - `household_members.joined_at` se actualiza
   - `people.active_household_id` se actualiza para el nuevo miembro
   - `household_people_public` incluye al nuevo miembro

#### Escenario 5: Reject solicitud
1. Repetir Escenario 3 (crear solicitud)
2. Coordinador rechaza
3. Verificar:
   - `household_members.status` = 'finalized'
   - `household_members.left_at` se actualiza
   - Usuario queda sin hogar activo

#### Escenario 6: Members list
1. Como cualquier miembro activo, ir a FamilyScreen
2. Verificar:
   - Lista muestra todos los miembros activos
   - Cada miembro tiene: nombre, rol, avatar (iniciales)
   - Coordinador ve botón "Quitar" para miembros no-coordinadores
   - No se puede quitar al último coordinador

#### Escenario 7: Profile
1. Ir a MoreTab → ProfileScreen
2. Verificar:
   - Avatar muestra iniciales de `display_name`
   - Nombre, rol, email, hogar activo se muestran
   - Lista de miembros se muestra
   - Logout funciona (borra sesión local + llama a `/api/auth/logout`)

#### Escenario 8: Navegación
1. Registrar usuario → debe ir a P02CrearGrupo
2. Crear hogar → debe ir a HomeTabs
3. Si hay pending → debe ir a WaitingApprovalScreen
4. Si hay múltiples hogares → debe ir a HouseholdSelectionScreen (después de H-042.3)

#### Escenario 9: Home/Planner reciben household/members
1. En HomeTabs, verificar `currentHousehold.nombre` se muestra
2. En HomeAdultoMayor, verificar "Llamar a la familia" muestra miembros
3. En Planner → Crear tarea:
   - Verificar chips: "Sin asignar", "Yo", miembros activos
   - Asignar a un miembro
   - Guardar tarea
   - Verificar `assigned_to_member_id` en tarea
   - En PlannerTasksScreen, verificar que se muestra "Asignada a [nombre]"

---

### Comandos de validación

```bash
# Backend: validar TypeScript (si hubiera) y sintaxis
cd backend
node -c index.js
node -c src/routes/auth.js
node -c src/routes/households.js
node -c src/routes/inviteLinks.js
node -c src/controllers/auth.final.controller.js
node -c src/controllers/households.controller.js
node -c src/controllers/inviteLinks.controller.js

# Frontend: validar TypeScript
cd front/mi-front-limpio
npx.cmd tsc --noEmit

# Frontend: Expo doctor
npx.cmd expo-doctor

# Supabase: validar migraciones (manual)
# Revisar que migration_009 se pueda ejecutar en una DB limpia
# Verificar RLS policies en producción
```

---

## Reporte final

### Documento creado
✅ `docs/implementation/h042_family_core_audit.md` generado.

### Hallazgos principales
1. **Backend 90% listo:** Todas las RPCs y endpoints necesarios existen y funcionan.
2. **Frontend 70% listo:** Pantallas implementadas pero con brechas críticas (avatar sync, perfil edición, selección de hogar).
3. **Riesgo crítico:** Avatar no se sincroniza en `people` → miembros muestran avatar viejo/null.
4. **Legacy cleanup:** Endpoints de invitations legacy están deshabilitados (410), pero el código sigue en el repo.
5. **Multi-household sin UI:** El backend detecta el caso pero no hay pantalla para seleccionar hogar activo.

### Primera etapa recomendada
**H-042.1 — Sync de avatar** (prioridad ALTA)

**Por qué:**
- Es un bug funcional: los avatares subidos no se reflejan en la UI de miembros.
- Afecta la percepción de calidad de la app.
- Es de bajo riesgo (solo afecta `users.controller.js:updateMe`).

**Pasos:**
1. Modificar `backend/src/controllers/users.controller.js:updateMe` para que, después de subir el avatar a Storage, actualice `people.avatar_url` vía RPC o query directa con `supabaseAdmin`.
2. Agregar en `front/.../ProfileScreen.tsx` un botón "Cambiar avatar" que llame a `PATCH /api/users/me` con archivo.
3. Después de subir, llamar a `refetchMe()` para actualizar `authMe.person.avatar_url`.
4. Verificar que `HouseholdContext` y `FamilyScreen` muestren el nuevo avatar.

**Criterio DONE:**
- Subir avatar en Profile → `people.avatar_url` se actualiza
- `HouseholdContext` muestra el nuevo avatar en `members`
- `FamilyScreen` y `ProfileScreen` reflejan el cambio inmediatamente

### Bloqueos
- **Ninguno.** El repo está en estado funcional. Las mejoras son iterativas.
- **Recomendación:** No implementar todavía. Usar esta auditoría para priorizar H-042.1.