# **Etapa 1 — Delta técnico actual vs `auth_final.md`**

## **Resumen ejecutivo**

El repo actual está funcionalmente en un modelo viejo: `auth.users + public.users + households + household_members.user_id + invitations`.

El contrato final exige: `auth.users + people + households + household_members.person_id + household_invite_links`.

Lo más importante:

* Supabase Auth ya existe y es reutilizable.  
* No encontré tablas propias `sessions` ni `refresh_tokens`, eso está alineado.  
* Falta completamente `people`.  
* Falta completamente `/api/auth/me`.  
* `household_members` usa `user_id`, no `person_id`.  
* Los roles están en español: `coordinador`, `adulto`, `adolescente`, `adulto_mayor`.  
* No hay estados de membership `pending/active/suspended/finalized`.  
* Invitaciones actuales son `invitations`, single-use, con `used_at`, expiran en 24h y al usarse dan acceso directo.  
* Frontend navega por estado local de Supabase \+ queries directas, no por `/api/auth/me`.  
* Planner/Tasks/Events/Schedules también dependen de `public.users.id`, así que el cambio impacta fuera de Auth.

Mi conclusión: conviene una migración limpia MVP, no compatibilidad prolongada con el modelo viejo.

## **Backend actual vs requerido**

### **`backend/src/controllers/auth.controller.js`**

Qué hace hoy:

* `signUp` llama `supabase.auth.signUp`.  
* Guarda `nombre` en `user_metadata`.  
* Devuelve `usuario`, no devuelve contrato completo de sesión.  
* `login` llama `supabase.auth.signInWithPassword`.  
* Devuelve `session` y `usuario`.

Contradicciones:

* Endpoint actual es `/api/auth/signup`, no `/api/auth/register`.  
* Register no crea `people`.  
* No vincula `people.auth_user_id`.  
* No devuelve estructura final con `user`, `person`, sesión Supabase.  
* No existe `/api/auth/me`.  
* No existen refresh/logout wrappers backend.  
* No hay OAuth Google/Apple desde backend.  
* Perfil vive indirectamente en metadata o `public.users`, no en `people`.

Reutilizable:

* Uso de Supabase Auth para email/password.  
* Manejo básico de errores.  
* Login con Supabase Auth.

Cambiar o crear nuevo:

* Conviene modificar este archivo o reemplazarlo con contrato final.  
* Agregar `register`, `login`, `me`, `refresh`, `logout`, recovery/OAuth si se decide backend wrapper.  
* `register` debe crear `auth.users + people + session`, sin household.

### **`backend/src/routes/auth.js`**

Qué hace hoy:

* Expone `POST /signup`.  
* Expone `POST /login`.

Contradicciones:

* Falta `POST /register`.  
* Falta `GET /me`.  
* Falta `POST /refresh`.  
* Falta `POST /logout`.  
* Falta recovery/OAuth.

Reutilizable:

* Router Express simple.

Cambiar o crear nuevo:

* Modificar directamente.  
* Mantener `/signup` solo como alias temporal si el frontend viejo lo necesitara, pero para MVP final no conviene.

### **`backend/src/controllers/households.controller.js`**

Qué hace hoy:

* Crea household con `nombre`, `tipo`, `created_by = userId`.  
* Crea membership con `user_id = userId`, `rol = coordinador`.  
* Crea invitación en `invitations` con `rol_asignado`, token 24h.  
* Valida invitación: si token válido, crea membership directa con rol asignado, marca `used_at/used_by`.

Contradicciones:

* Usa `user_id`, no `person_id`.  
* Usa `rol`, no `role`.  
* Usa `coordinador`, no `coordinator`.  
* Household usa `nombre/tipo/created_by`, no `name/slug/timezone/default_language/config/created_by_person_id`.  
* No setea `people.active_household_id`.  
* Crear household no es realmente transacción DB única; hace insert \+ compensación manual.  
* Invitaciones son `invitations`, no `household_invite_links`.  
* Expiran en 24h, no 7 días.  
* Tienen `used_at`, flujo single-use.  
* Join da acceso directo, no crea `pending`.  
* No hay approve/reject.  
* No hay `status` de membership.

Reutilizable:

* Validación de coordinator antes de crear invitaciones.  
* Idea de token opaco.  
* Patrón de errores HTTP.  
* Concepto de atomicidad, aunque debe moverse a RPC/transacción real.

Cambiar o crear nuevo:

* `createHousehold` puede reescribirse en el mismo controller.  
* Para invitaciones conviene crear controller nuevo tipo `inviteLinks.controller.js`, porque el modelo final es otro.  
* `validateInvitation` debería eliminarse o reemplazarse por join request pending.

### **`backend/src/routes/households.js`**

Qué hace hoy:

* `POST /api/households`.  
* `POST /api/households/:household_id/invitations`.

Contradicciones:

* Ruta de creación de hogar existe, pero contrato interno no.  
* La ruta de invitaciones apunta al flujo viejo.  
* Faltan endpoints de members pending, approve/reject.

Reutilizable:

* `POST /api/households` como URL canónica.

Cambiar o crear nuevo:

* Modificar `POST /api/households`.  
* Agregar rutas tipo:  
  * `POST /api/households/:household_id/invite-links`  
  * `GET /api/households/:household_id/join-requests`  
  * `POST /api/households/:household_id/members/:membership_id/approve`  
  * `POST /api/households/:household_id/members/:membership_id/reject`

### **`backend/src/routes/invitations.js`**

Qué hace hoy:

* `POST /api/invitations/validate`.

Contradicciones:

* El flujo final no es “validate invitation”.  
* El link final crea membership `pending`.  
* No debe marcar `used_at`.  
* No debe activar acceso.

Reutilizable:

* Poco. Solo estructura Express.

Cambiar o crear nuevo:

* Mejor crear rutas nuevas para invite links.  
* Dejar `invitations.js` fuera del flujo final o eliminarlo después de migrar.

### **`backend/src/controllers/users.controller.js`**

Qué hace hoy:

* `updateMe` modifica `auth.users.user_metadata`.  
* Sube avatar a Supabase Storage.  
* Maneja `notification_prefs`.

Contradicciones:

* Perfil final es `people`, no metadata ni `public.users`.  
* `notification_prefs` actual no coincide con `people.personal_settings`.  
* No actualiza `people.display_name/avatar_url/default_language/app_onboarding_status`.

Reutilizable:

* Upload/compress de avatar.  
* Validación JSON de preferencias como patrón.  
* Storage bucket si se mantiene.

Cambiar o crear nuevo:

* Conviene migrar a `people.controller.js` o reescribir `users.controller.js` como compatibilidad.  
* Finalmente debería operar sobre `people`.

### **`backend/src/middleware/authMiddleware.js`**

Qué hace hoy:

* Lee Bearer token.  
* Usa `supabase.auth.getUser(token)`.  
* Setea `req.user`.

Contradicciones:

* No carga `person`.  
* Los endpoints finales necesitan resolver `people` por `auth_user_id`.

Reutilizable:

* Sí, es una buena base.  
* Debe extenderse o acompañarse con helper `requirePerson`.

Cambiar o crear nuevo:

* Modificar para poder adjuntar `req.authUser`.  
* Agregar helper/middleware que cargue `req.person`.

### **`backend/src/config/supabase.js`**

Qué hace hoy:

* Crea cliente Supabase con `SUPABASE_URL` y `SUPABASE_KEY`.

Contradicciones / riesgos:

* No distingue anon key vs service role.  
* Para crear `people`, households atómicos y admin auth puede requerirse service role explícito.  
* Si `SUPABASE_KEY` es service role, hay que cuidar que no se use como cliente de usuario accidentalmente.

Reutilizable:

* Sí, pero conviene separar:  
  * `supabaseAdmin`  
  * `supabaseAnon` o cliente user-token si aplica.

## **Database actual vs requerido**

### **Lo que existe**

En `supabase/migrations/`:

* `public.users`  
* `public.households`  
* `public.household_members`  
* `public.invitations`  
* `public.schedules`  
* `public.tasks`  
* `public.events`  
* RPCs:  
  * `ensure_public_user`  
  * `join_household_by_token`  
  * `create_household_rpc`  
  * `effective_uid`  
  * helpers RLS `is_household_member`, `is_household_coordinator`, `shares_household_with`

### **Principales contradicciones**

* Existe `public.users`; final dice no usarlo como perfil final.  
* No existe `people`.  
* `household_members.user_id` referencia `public.users(id)`.  
* Final exige `household_members.person_id`.  
* Roles actuales:  
  * `coordinador`  
  * `adulto`  
  * `adolescente`  
  * `adulto_mayor`  
* Roles finales:  
  * `coordinator`  
  * `adult`  
  * `adolescent`  
  * `child`  
  * `senior`  
  * `guest`  
* No existe `status` en `household_members`.  
* No existe `joined_at` nullable condicionado por `active`; hoy siempre default `now()`.  
* No existe `left_at`.  
* No existen campos de onboarding en `people` ni en `household_members`.  
* `invitations` tiene `used_at` y `used_by`.  
* Invitaciones expiran en 24h.  
* `join_household_by_token` inserta membership activa directa con rol.  
* No existe `household_invite_links`.  
* No existe `approve/reject`.  
* RLS usa `auth.uid()`/`effective_uid()` contra `user_id`.  
* No hay RLS basada en `people.auth_user_id -> people.id -> household_members.person_id`.

### **Impacto Planner/Tasks/Events/Schedules**

Estas tablas pueden romperse con el cambio:

* `schedules.user_id -> public.users(id)`  
* `tasks.created_by -> public.users(id)`  
* `tasks.assigned_to -> public.users(id)`  
* `events.created_by -> public.users(id)`  
* `events.assigned_to -> public.users(id)`

Aunque `auth_final.md` no pide implementar Planner en esta etapa, cualquier migración a `person_id` debe decidir si estas tablas pasan a:

* `created_by_person_id`  
* `assigned_to_person_id`  
* `person_id` en schedules

Si no se toca Planner todavía, al menos hay que evitar que RLS nuevo lo deje inconsistente.

### **SQL bajo `backend/sql/`**

Hay SQL duplicado y además un archivo viejo con modelo más antiguo:

* `backend/sql/migration_001_auth_base.sql` duplica parte del modelo `public.users`.  
* `backend/sql/migration_002_rls_auth.sql` habla de `grupos_familiares`, `miembros_grupo`, `perfiles`.  
* `backend/sql/rls_test.sql` también prueba `grupos_familiares/miembros_grupo/perfiles`.

Riesgo: esos archivos pueden confundir implementación. No parecen ser el source real actual si se usa `supabase/migrations`, pero deben marcarse como legacy.

## **Frontend actual vs requerido**

### **`AuthContext.tsx`**

Qué hace hoy:

* Usa Supabase directo.  
* Mantiene `session`, `user`, recovery, pending join token.  
* Login/register/logout/recovery van directo a `supabase.auth`.  
* Maneja deep links de auth y `familyhub://join?token=...`.

Contradicciones:

* Navegación inicial no usa `/api/auth/me`.  
* No guarda `person`.  
* No conoce `memberships`.  
* No conoce `active_household`.  
* Register no pasa por backend, por lo tanto no crea `people`.  
* Google aparece solo en UI como “próximamente”.  
* Apple no existe.  
* Password min en UI es 6, spec/Pending definition menciona mínimo 8\.

Reutilizable:

* Manejo de sesión Supabase en RN.  
* Deep links.  
* Recovery/update password.  
* Auto refresh.  
* Pending join token.

Cambio necesario:

* Después de sesión Supabase, llamar backend `/api/auth/me`.  
* El estado global debería ser `session + authUser + person + memberships + activeHousehold`.  
* Register debería pasar por backend o garantizar creación de `people`.

### **`HouseholdContext.tsx`**

Qué hace hoy:

* Con `user.id` consulta `getUserHousehold`.  
* Elige `currentHousehold`, `currentRole`, members.  
* `isCoordinator = currentRole === 'coordinador'`.

Contradicciones:

* Basado en `user_id`.  
* Basado en rol español.  
* No contempla `pending`.  
* No usa `people.active_household_id`.  
* No soporta multi-hogar real.  
* No diferencia “sin hogar” de “pending join”.

Reutilizable:

* Concepto de contexto household.  
* Loading/reloading y reload.

Cambio necesario:

* Alimentarse desde `/api/auth/me`.  
* Usar `person.id`, `active_household`, memberships con `status`.  
* `isCoordinator = role === 'coordinator' && status === 'active'`.

### **`services/`**

Estado actual:

* `api.ts` existe con `EXPO_PUBLIC_API_URL`.  
* `.env.example` no incluye `EXPO_PUBLIC_API_URL`.  
* `households.ts`, `invitations.ts`, `tasks.ts`, `events.ts`, `schedules.ts` usan Supabase directo.  
* Hay RPCs directas: `ensure_public_user`, `create_household_rpc`, `join_household_by_token`.

Contradicciones:

* Auth/household/invite final debería pasar por backend API.  
* Servicios siguen usando `public.users`, `household_members.user_id`, `rol`, `invitations`, `used_at`.

Reutilizable:

* Tipos de respuesta pueden inspirar nuevos tipos.  
* `api.ts` como cliente Axios, pero necesita interceptor Bearer token.

Cambio necesario:

* Crear servicios backend-first:  
  * `authMe`  
  * `register`  
  * `createHousehold`  
  * `createInviteLink`  
  * `joinInviteLink`  
  * `approveJoinRequest`  
  * `rejectJoinRequest`  
* Mantener Supabase directo solo para Auth session/OAuth/recovery si se decide así.

### **Navegación**

Qué hace hoy:

* Si hay `session`, entra a `PrivateNavigator`.  
* Si no hay household, va a `P02CrearGrupo`.  
* Si hay token pendiente, va a `JoinHousehold`.  
* Home varía por `currentRole` español.

Contradicciones:

* No usa `/api/auth/me` como fuente de verdad.  
* No contempla pantalla pending.  
* Join exitoso hoy lleva a Home porque ya quedó miembro directo.  
* No contempla onboarding global en `people`.  
* Role selection se trata como permisos reales en pantallas de Home.

Reutilizable:

* Estructura de stacks.  
* `AuthLoadingScreen`.  
* Deep link join.

Cambio necesario:

* Resolver navegación por `me`:  
  * no session \-\> auth stack  
  * session sin `person` \-\> error/recovery de perfil  
  * `app_onboarding_status != completed` \-\> onboarding global  
  * sin active household y sin memberships active \-\> crear hogar / unirse  
  * membership pending \-\> pending screen  
  * active household \-\> app  
* Home por rol debe mapear roles finales.

### **Pantallas**

`Login`:

* Reutilizable visualmente.  
* Usa Supabase directo vía context.  
* Falta OAuth real Google/Apple.

`Registro`:

* Reutilizable visualmente.  
* Usa Supabase directo.  
* Google “próximamente”, contradice MVP real.  
* Password mínimo 6\.  
* No crea `people`.

`CrearGrupo`:

* Existe y es útil.  
* Usa `createHousehold` directo Supabase/RPC.  
* Manda `tipo`, modelo que no está en `auth_final.md`.  
* Debe llamar `POST /api/households`.  
* Debe recibir household \+ membership coordinator \+ active\_household.

`InvitarPersonas`:

* Existe UI de QR/share.  
* Pero crea `invitations`, role upfront y single-use.  
* Roles en español.  
* Debe crear/revocar `household_invite_links`.  
* No debería asignar rol al link.  
* Debe listar links activos/revocados/expirados si aplica, no “invitaciones pendientes” por `used_at`.

`JoinHousehold`:

* Existe pantalla de procesamiento de link.  
* Hoy llama RPC y al éxito dice “Te uniste al hogar”.  
* Final debe decir que la solicitud quedó pendiente.  
* Debe crear membership `pending` y navegar a pantalla de espera.

`AuthLoading/Splash`:

* Reutilizables.  
* Splash copy “Crear mi familia / Ya tengo un grupo” empuja modelo de hogar antes de persona; no es grave pero conviene ajustar al onboarding global.

## **Contradicciones Linear vs `auth_final.md`**

Contradicciones relevantes detectadas:

* H-004 dice “Crear hogar al registrarse”; `auth_final.md` dice register NO crea hogar.  
* H-004 usa `household_members.user_id`; final exige `person_id`.  
* H-003 propone RLS `WHERE household_id IN (... user_id = auth.uid())`; final requiere RLS vía `people.auth_user_id` y `person_id`.  
* H-005 define `invitations`, token único de un solo uso y accept directo; final exige `household_invite_links` reutilizables, revocables, 7 días, join pending.  
* H-006 habla de aceptar invitación; final habla de solicitar ingreso y aprobación coordinator.  
* H-007 “Onboarding por rol” puede confundirse como permiso real; final dice role selection es UX/declarativo.  
* H-028 smoke test dice “Registro \-\> hogar creado \-\> coordinator”; final separa registro de creación de hogar.  
* Roles del Linear están en español/viejos; final exige roles técnicos en inglés.

## **Mapa de impacto**

| Área | Estado actual | Requiere `auth_final` | Acción necesaria | Riesgo | Prioridad |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Auth register/login/session | Supabase Auth directo/back básico | Supabase Auth \+ `people` \+ sesión | Rehacer contrato register/login | Alto | P0 |
| `/api/auth/me` | No existe | Fuente de verdad navegación | Crear endpoint | Crítico | P0 |
| `people` | No existe | Perfil final | Crear tabla, constraints, vínculo auth | Crítico | P0 |
| `households` | `nombre/tipo/created_by user` | `name/slug/.../created_by_person_id` | Migrar schema/API | Alto | P0 |
| `household_members` | `user_id`, `rol`, sin status | `person_id`, `role`, `status` | Migración fuerte | Crítico | P0 |
| roles/status | Español, sin status | Inglés \+ pending/active/suspended/finalized | Normalizar DB/API/frontend | Crítico | P0 |
| invite links | `invitations`, 24h, single-use | `household_invite_links`, 7 días, reusable | Reemplazar flujo | Alto | P1 |
| approve/reject | No existe | Coordinator aprueba/rechaza | Crear endpoints y UI mínima | Alto | P1 |
| RLS | Basada en `user_id` | Basada en `person_id` \+ active membership | Reescribir helpers/policies | Crítico | P0 |
| frontend auth state | Supabase local | `/api/auth/me` | Refactor context | Alto | P1 |
| frontend household state | Query directa `user_id` | memberships/person/active household | Refactor context | Alto | P1 |
| navigation | session \+ household query | `me` decide flujo | Rehacer guards | Alto | P1 |
| onboarding | No persistido en `people` | global en `people` | Agregar campos/endpoints/pantalla | Medio | P2 |
| Planner/Tasks/Events | FKs a `public.users` | Debe alinearse a `person_id` o aislarse | Plan de migración posterior | Alto | P2/P3 |

## **Riesgos principales**

1. RLS es el riesgo mayor. Cambiar `user_id` a `person_id` sin reescribir helpers puede abrir datos o bloquear toda la app.  
2. `public.users` está en todos lados. No es solo Auth: afecta frontend types, services, tasks, events, schedules y members.  
3. El flujo de invitación actual concede acceso directo. Es una contradicción de seguridad con `auth_final.md`.  
4. `/api/auth/me` no existe. Sin eso, el frontend seguirá tomando decisiones con modelo viejo.  
5. Atomicidad real de `POST /api/households`. Hoy hay compensación manual o RPC vieja, no transacción final con `people.active_household_id`.  
6. Roles en español están embebidos en UI, RLS, DB checks y servicios.  
7. Hay SQL legacy en `backend/sql` con nombres aún más viejos (`grupos_familiares`, `perfiles`) que puede confundir.

## **Estrategia recomendada**

Recomiendo **migración limpia MVP**.

Pros:

* Alinea rápido con `auth_final.md`.  
* Evita mantener dos modelos mentales (`public.users` y `people`).  
* Reduce bugs de RLS.  
* Hace que `/api/auth/me` sea la pieza central desde el inicio.  
* Es más simple para terminar hoy si se corta alcance a Auth/Onboarding.

Contras:

* Rompe servicios Planner/Tasks/Events hasta adaptarlos o aislarlos.  
* Requiere tocar DB, backend y frontend en secuencia.  
* No permite “parchear” rápido el flujo viejo de invitaciones.

No recomiendo compatibilidad plena con modelo viejo. Sería más lenta y peligrosa: habría que mapear `public.users -> people`, `user_id -> person_id`, roles español/inglés, invitaciones viejas/nuevas y RLS doble.

Estrategia híbrida aceptable solo como transición corta:

* Crear modelo final.  
* Mantener pantallas visuales.  
* Reescribir servicios Auth/Household/Invite hacia backend.  
* Dejar Planner temporalmente fuera o funcionando solo después de adaptar sus FKs.

## **Orden recomendado de implementación**

1. Congelar contrato final de DB mínimo: `people`, `households`, `household_members`, `household_invite_links`, enums/checks, índices.  
2. Crear migración limpia del modelo Auth/Onboarding final.  
3. Reescribir RLS helpers sobre `people.auth_user_id` y `household_members.person_id`.  
4. Implementar backend Auth:  
   * `POST /api/auth/register`  
   * `POST /api/auth/login`  
   * `GET /api/auth/me`  
   * `POST /api/auth/logout`  
   * refresh/recovery según decisión de wrappers.  
5. Implementar `POST /api/households` atómico, idealmente RPC/transacción con service role controlado.  
6. Implementar invite links:  
   * crear link  
   * revocar link  
   * join por token \-\> membership `pending`  
7. Implementar approve/reject:  
   * approve asigna rol final y activa  
   * reject marca `finalized`  
8. Adaptar frontend AuthContext para cargar `/api/auth/me`.  
9. Adaptar HouseholdContext y navegación según `me`.  
10. Adaptar pantallas existentes:  
    * Registro/Login  
    * CrearGrupo  
    * InvitarPersonas  
    * JoinHousehold  
    * Pending screen  
11. Recién después adaptar Planner/Tasks/Events/Schedules a `person_id`, o aislarlos si quedan fuera del MVP Auth.

## **Qué NO tocar todavía**

* No tocar Planner/Tasks/Events hasta cerrar el contrato Auth/Household.  
* No intentar arreglar `invitations` viejo: será reemplazado.  
* No construir CRUD avanzado de miembros.  
* No meter `family_employee`.  
* No implementar join code tipeable.  
* No hacer compatibilidad larga con `public.users`.  
* No hacer refactor visual grande del frontend.  
* No cambiar Home por rol hasta tener roles finales desde `/api/auth/me`.

## **Criterio para cerrar Etapa 1**

Etapa 1 queda cerrada cuando el equipo acepta este delta y decide explícitamente:

* migración limpia MVP vs híbrida corta;  
* si Planner se migra ahora o queda temporalmente aislado;  
* forma final de endpoints;  
* que `auth_final.md` manda sobre Linear;  
* que la próxima etapa ya puede escribir migraciones/código en el orden recomendado.

