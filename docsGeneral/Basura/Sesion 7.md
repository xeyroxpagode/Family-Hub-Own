Etapa AUTH-CIERRE 1 — Cierre frontend Auth/HOUSE Quiero cerrar AUTH/HOUSE para poder pasar a Planner. No hagas etapa de inspección larga. Tomá como fuente de verdad el progreso ya implementado en las etapas previas: Etapa 2: schema/RLS final. Etapa 3: backend Auth final. Etapa 4: create household final. Etapa 5: invite links / join pending / approve-reject según contrato final. Etapa 6: frontend migrado parcialmente a /api/auth/me, login/register/logout y create household. Asumí que el backend Auth/HOUSE final ya está implementado. No reescribas backend. El objetivo es cerrar el flujo desde frontend usando los endpoints finales existentes. Solo tocá backend si hay un bloqueo directo e inevitable para completar el flujo, y en ese caso hacé el cambio mínimo posible. Objetivo final Cerrar este flujo multiusuario básico desde la app: Coordinator registra/login ↓ Coordinator crea household ↓ Coordinator genera invite link reusable ↓ Varios usuarios usan el link ↓ Cada usuario queda pending ↓ Coordinator ve varias solicitudes pending ↓ Coordinator aprueba o rechaza cada solicitud por membership\_id ↓ Aprobados quedan active con role asignado ↓ Rechazados quedan finalized/rejected y fuera del hogar ↓ Pending no entra a Home ↓ Active entra a Home con active\_household No implementar un caso hardcodeado de dos usuarios. Debe funcionar con N miembros normales dentro de un household. Para smoke se probarán 3 a 5 usuarios, pero la lógica no debe depender de una cantidad fija. Alcance permitido Implementar únicamente lo necesario para cerrar AUTH/HOUSE como puerta funcional hacia Planner desde frontend. Frontend permitido front/mi-front-limpio/services/api.ts front/mi-front-limpio/services/households.ts front/mi-front-limpio/services/invitations.ts front/mi-front-limpio/context/AuthContext.tsx front/mi-front-limpio/context/HouseholdContext.tsx front/mi-front-limpio/navigation/AppNavigator.tsx front/mi-front-limpio/navigation/types.ts front/mi-front-limpio/screens/Login.tsx front/mi-front-limpio/screens/Registro.tsx front/mi-front-limpio/screens/CrearGrupo.tsx front/mi-front-limpio/screens/InvitarPersonas.tsx front/mi-front-limpio/screens/JoinHousehold.tsx front/mi-front-limpio/screens/ProfileScreen.tsx Crear una pantalla WaitingApproval si no existe. Crear una pantalla o sección mínima de JoinRequests si es necesario. Backend permitido solo por bloqueo Solo si el frontend necesita un endpoint final ya definido por contrato y el cableado visible falta o está roto. Si tocás backend, debe ser cambio mínimo en: backend/src/routes/inviteLinks.js backend/src/controllers/inviteLinks.controller.js backend/src/routes/households.js backend/src/controllers/households.controller.js backend/index.js Antes de tocar backend, confirmá en la respuesta final qué bloqueo obligó a hacerlo. No tocar No tocar: Planner. Tasks. Events. Calendar. migrations. Supabase cloud. OAuth Google/Apple. password recovery avanzado. settings avanzados. profile/avatar. members CRUD completo. onboarding largo. multi-hogar avanzado. cleanup global legacy. refactor global. rediseño visual grande. Reglas obligatorias Modelo final Usar el modelo final: people household\_members.person\_id household\_members.role household\_members.status household\_invite\_links active\_household /api/auth/me No usar modelo legacy: public.users household\_members.user\_id rol coordinador invitations used\_at used\_by rol\_asignado join\_household\_by\_token create\_household\_rpc Reglas de navegación /api/auth/me es la fuente de verdad. La app debe navegar así: sin sesión → Login/Register sesión sin household → Create/Join Household membership pending → Waiting Approval membership active \+ active\_household → Home membership rejected/finalized → estado rechazado o volver a Join/Create No decidir navegación leyendo tablas legacy desde frontend. Después de cada acción importante, refrescar /api/auth/me: login; register; create household; join invite link; approve/reject si afecta estado visible; refresh manual desde Waiting Approval. Reglas invite/join Invite link debe ser reusable. Varios usuarios pueden usar el mismo link. Cada join crea o devuelve membership pending. No asignar role al hacer join. No activar acceso al hacer join. Pending no entra a Home. Approve asigna role y pasa a active. Reject pasa a finalized o estado equivalente final. Approve/reject opera por membership\_id. La lista pending debe soportar varias solicitudes. UI mínima requerida Login/Register loading; error visible; success/navegación; validaciones mínimas; después de login/register refrescar /api/auth/me. Create Household crear hogar; loading/error; después de crear refrescar /api/auth/me. Invite Link Management crear link; mostrar link/token; copiar/compartir si hay patrón disponible; feedback de success/error; no mostrar flujo legacy. Join Household aceptar token/link; pedir login/register si no hay sesión; enviar join; pending → Waiting Approval; active existente → refrescar /api/auth/me; error visible si link inválido/revocado/vencido. Waiting Approval mensaje claro de solicitud pendiente; botón refrescar; botón cerrar sesión o cambiar cuenta; no mostrar datos internos del hogar. Pending Requests para coordinator Puede estar en ProfileScreen, InvitarPersonas o una pantalla simple. Debe incluir: listar solicitudes pending; mostrar nombre de persona si está disponible; selector de role mínimo; botón aprobar; botón rechazar; actualizar lista después de cada acción. No hace falta UI perfecta. Tiene que ser usable y clara. Services esperados Usar o adaptar services existentes. No poner lógica de endpoints hardcodeada dentro de pantallas si puede ir en service. Services mínimos esperados: authApi.getMe() householdsApi.createHousehold() inviteLinksApi.createInviteLink() inviteLinksApi.revokeInviteLink() inviteLinksApi.joinByToken() householdsApi.listJoinRequests() householdsApi.approveJoinRequest() householdsApi.rejectJoinRequest() Si ya existen nombres equivalentes, usarlos. Checks obligatorios Ejecutar: git status \--short git diff \--check Ejecutar además el check disponible del proyecto: TypeScript; lint; build; o el comando más cercano ya usado en etapas anteriores. También buscar que no se hayan introducido usos nuevos de: public.users user\_id rol coordinador invitations used\_at used\_by rol\_asignado join\_household\_by\_token create\_household\_rpc Si aparecen solo en código legacy no tocado, reportarlo como legacy existente, no como bloqueo. Salida esperada Responder con: Veredicto: Archivos tocados: Backend tocado: Qué quedó funcionando: Qué se dejó fuera: Checks ejecutados: Legacy existente no tocado: Smoke recomendado: Riesgos restantes: No escribir explicación larga. No proponer etapas futuras salvo bloqueos reales. No seguir mejorando después de que el flujo funcione.  
Mostrar más  
lunes, 4:35 p.m.

Voy a hacer una pasada corta y quirúrgica por el frontend y los endpoints existentes para que el plan quede aterrizado en el repo real. Como estamos en modo Plan, no voy a editar archivos todavía.

Ya aparece una base importante: los endpoints finales de invite links existen en backend, y el frontend todavía conserva varias piezas legacy de `invitations`/`rol`. Voy a leer solo los puntos de cableado para convertir eso en un plan de cierre sin tocar Planner ni migraciones.

El servicio `invitations.ts` está claramente en el modelo viejo y es el candidato natural a reemplazar por `inviteLinksApi`. También vi que backend ya expone rutas finales para `join-requests` por `membership_id`, así que el plan puede evitar cambios backend salvo que una prueba lo contradiga.

Hay dos cosas a proteger en la implementación: `HouseholdContext` sigue leyendo tablas legacy para Home/Profile, pero la navegación nueva ya se basa en `/api/auth/me`; y las pantallas de invitación/join todavía llaman RPC/tablas legacy. El plan va a cerrar solo ese flujo visible, dejando los restos legacy internos reportados como existentes.

Voy a hacer una verificación no mutante rápida de los checks probables para que el plan no prometa un comando que ya sabemos que no existe. Después cierro con un plan implementable, compacto y sin etapa larga.

El `git diff --check` actual pasa; PowerShell bloquea `npx.ps1`, así que el plan debe usar `npx.cmd` para TypeScript/ESLint en Windows. Voy a validar esos equivalentes ahora.

Plan

# **AUTH-CIERRE 1 Frontend Auth/HOUSE**

## **Summary**

Cerrar el flujo visible Auth/HOUSE usando los endpoints finales ya existentes, sin reescribir backend. La navegación quedará gobernada por `/api/auth/me`; invite/join/approve/reject saldrán de Supabase legacy y pasarán por API backend.

## **Key Changes**

* En `services/api.ts`, agregar tipos y wrappers finales:  
  * `createInviteLink(householdId)`  
  * `revokeInviteLink(householdId, inviteLinkId)`  
  * `joinByToken(token)`  
  * `listJoinRequests(householdId)`  
  * `approveJoinRequest(householdId, membershipId, role)`  
  * `rejectJoinRequest(householdId, membershipId)`  
* En `services/invitations.ts`, reemplazar el flujo legacy por un facade de invite links final, o crear exports equivalentes consumidos por pantallas sin tocar tablas `invitations`.  
* En `AuthContext.tsx`, mantener `/api/auth/me` como fuente de verdad y asegurar `refetchMe()` después de login/register/join/approve/reject cuando corresponda.  
* En `HouseholdContext.tsx`, dejar de depender del lookup legacy para decisiones de navegación; derivar hogar activo, membresía activa y `isCoordinator` desde `authMe`. Si hace falta compatibilidad para Home/Profile existentes, mapear solo en memoria sin llamar tablas legacy.  
* En `AppNavigator.tsx`/`types.ts`, convertir `PendingApprovalFallback` en una pantalla real `WaitingApproval` y tratar estados:  
  * sin sesión: auth stack  
  * sesión sin hogar: create/join  
  * pending: waiting approval  
  * active \+ active\_household: Home  
  * rejected/finalized/none: create/join o estado claro de rechazo  
* En `CrearGrupo.tsx`, después de crear hogar usar `refetchMe()` y navegar según `/api/auth/me`; no agregar lógica legacy.  
* En `InvitarPersonas.tsx`, generar invite link reusable, mostrar token/link, compartir, revocar y listar solicitudes pending N.  
* En `JoinHousehold.tsx`, usar `joinByToken`, no asignar role, refrescar `/api/auth/me`, y enviar pending a `WaitingApproval`.  
* En `ProfileScreen.tsx` o `InvitarPersonas.tsx`, agregar sección mínima `JoinRequests` para coordinator:  
  * lista `join_requests`  
  * nombre si backend lo expone; si no, mostrar `person_id` abreviado  
  * selector de role final (`adult`, `adolescent`, `child`, `senior`, `guest`)  
  * aprobar/rechazar por `membership_id`  
  * recargar lista y `/api/auth/me` tras cada acción

## **Backend**

* No tocar backend por defecto.  
* Solo tocarlo si el frontend descubre un bloqueo directo, por ejemplo si `listJoinRequests` no devuelve datos suficientes para renderizar una solicitud usable. En ese caso, cambio mínimo en `inviteLinks.controller.js` para incluir datos públicos de `people`, manteniendo el contrato final.

## **Test Plan**

* Ejecutar:  
  * `git status --short`  
  * `git diff --check`  
  * `npx.cmd tsc --noEmit` en `front/mi-front-limpio`  
  * `npx.cmd eslint .` en `backend`  
* Buscar usos legacy nuevos con `rg` para:  
  * `public.users`, `user_id`, `rol`, `coordinador`, `invitations`, `used_at`, `used_by`, `rol_asignado`, `join_household_by_token`, `create_household_rpc`  
* Smoke recomendado:  
  * coordinator register/login  
  * create household  
  * generate one reusable invite link  
  * 3 a 5 usuarios entran con el mismo link  
  * todos quedan pending y no entran a Home  
  * coordinator aprueba algunos y rechaza otros por `membership_id`  
  * aprobados entran a Home con `active_household`  
  * rechazados quedan fuera y pueden volver a create/join

## **Assumptions**

* Backend Auth/HOUSE final ya está implementado y sus rutas existentes son la fuente de contrato.  
* Roles finales aceptados por approve son `adult`, `adolescent`, `child`, `senior`, `guest`; no se asigna `coordinator` a usuarios invitados desde la UI mínima.  
* Legacy detectado fuera del flujo tocado se reporta como existente no tocado, no como bloqueo.

No hagas cambios grandes de arquitectura. Si el flujo requiere tocar más de 8 archivos o reescribir backend, frená y explicá el bloqueo antes de seguir. \- Si no tocaste backend, no ejecutes eslint backend. \- Si tocaste backend, ejecutá `npx.cmd eslint .` en `backend`.  
lunes, 4:39 p.m.  
Plan

# **AUTH-CIERRE 1 Frontend Auth/HOUSE Acotado**

## **Summary**

Cerrar el flujo Auth/HOUSE con cambios mínimos y sin arquitectura nueva. Límite operativo: si requiere tocar más de 8 archivos o reescribir backend, frenar y reportar bloqueo antes de seguir.

## **Key Changes**

* Tocar como máximo estos archivos frontend:  
  * `front/mi-front-limpio/services/api.ts`  
  * `front/mi-front-limpio/services/invitations.ts`  
  * `front/mi-front-limpio/context/AuthContext.tsx`  
  * `front/mi-front-limpio/navigation/AppNavigator.tsx`  
  * `front/mi-front-limpio/navigation/types.ts`  
  * `front/mi-front-limpio/screens/InvitarPersonas.tsx`  
  * `front/mi-front-limpio/screens/JoinHousehold.tsx`  
  * `front/mi-front-limpio/screens/ProfileScreen.tsx`  
* Agregar wrappers finales de invite links/join requests en `api.ts` y exponerlos desde `invitations.ts` para evitar reescribir pantallas de más.  
* Reemplazar en pantallas el uso de tablas/RPC legacy por endpoints:  
  * `POST /api/households/:household_id/invite-links`  
  * `POST /api/households/:household_id/invite-links/:invite_link_id/revoke`  
  * `POST /api/invite-links/join`  
  * `GET /api/households/:household_id/join-requests`  
  * `POST /api/households/:household_id/join-requests/:membership_id/approve`  
  * `POST /api/households/:household_id/join-requests/:membership_id/reject`  
* Convertir el fallback pending en `WaitingApproval` dentro de `AppNavigator.tsx` o como pantalla nueva solo si entra dentro del límite de 8 archivos.  
* En `ProfileScreen` o `InvitarPersonas`, agregar gestión mínima de pending requests para coordinator: listar N solicitudes, elegir role final, aprobar/rechazar por `membership_id`, recargar lista.

## **Backend**

* No tocar backend por defecto.  
* Si aparece un bloqueo directo e inevitable, frenar antes de superar el alcance y explicar:  
  * endpoint faltante/roto  
  * archivo backend mínimo requerido  
  * por qué frontend no puede resolverlo  
* Si se toca backend, ejecutar `npx.cmd eslint .` en `backend`.  
* Si no se toca backend, no ejecutar eslint backend.

## **Test Plan**

* Ejecutar siempre:  
  * `git status --short`  
  * `git diff --check`  
  * `npx.cmd tsc --noEmit` en `front/mi-front-limpio`  
* Ejecutar búsqueda legacy y reportar solo nuevos usos introducidos; legacy existente no tocado va separado.  
* Ejecutar eslint backend solo si hubo cambio backend.

## **Assumptions**

* Backend final ya existe y funciona.  
* No se toca Planner, migraciones, Supabase cloud ni cleanup legacy global.  
* Si el límite de 8 archivos no alcanza para cerrar el flujo, se detiene el trabajo y se reporta el bloqueo.

Implementar plan  
lunes, 4:39 p.m.  
Procesado durante 21m 20s

**Veredicto:** Implementado. Flujo frontend AUTH/HOUSE cerrado dentro del límite: 6 archivos tocados, sin backend.

**Archivos tocados:**

* `front/mi-front-limpio/services/api.ts`  
* `front/mi-front-limpio/services/invitations.ts`  
* `front/mi-front-limpio/context/HouseholdContext.tsx`  
* `front/mi-front-limpio/navigation/AppNavigator.tsx`  
* `front/mi-front-limpio/screens/InvitarPersonas.tsx`  
* `front/mi-front-limpio/screens/JoinHousehold.tsx`

**Backend tocado:** No. No ejecuté eslint backend por la regla indicada.

**Qué quedó funcionando:**

* Invite links reusable desde frontend usando `/api/households/:household_id/invite-links`.  
* Join por token usando `/api/invite-links/join`, dejando membership pending.  
* Pending no entra a Home: va a Waiting Approval.  
* Waiting Approval con refrescar y cerrar sesión/cambiar cuenta.  
* Coordinator lista solicitudes pending, elige role final y aprueba/rechaza por `membership_id`.  
* Approve/reject refresca lista y `/api/auth/me`.  
* `HouseholdContext` ya deriva hogar/rol activo desde `/api/auth/me`, sin leer tablas legacy.

**Qué se dejó fuera:**

* No se agregó backend para mostrar nombre de persona en pending requests; si backend no lo devuelve, se muestra `person_id` abreviado.  
* No se hizo cleanup global legacy ni migración de Planner/Home/Profile completo.  
* No se tocó UI avanzada ni multi-hogar avanzado.

**Checks ejecutados:**

* `git status --short`: ejecutado; el worktree ya tenía muchos cambios previos.  
* `git diff --check`: OK, solo warnings CRLF.  
* `npx.cmd tsc --noEmit` en `front/mi-front-limpio`: OK.  
* Búsqueda legacy con `rg`: ejecutada.

**Legacy existente no tocado:**

* Backend legacy en `backend/src/controllers/households.controller.js`, `backend/src/routes/invitations.js`, rutas `/api/invitations`.  
* Front legacy en `services/households.ts`, `types/database.ts`, pantallas Home/Profile/Family/Calendar.  
* Queda una capa de compatibilidad en `HouseholdContext` con nombres `rol/user_id` para no romper pantallas existentes, pero no consulta tablas legacy.

**Smoke recomendado:**

1. Coordinator register/login.  
2. Crear household.  
3. Generar un invite link reusable.  
4. 3 a 5 usuarios usan el mismo link.  
5. Verificar que quedan en Waiting Approval.  
6. Coordinator aprueba/rechaza cada pending por `membership_id`.  
7. Aprobados entran a Home; rechazados quedan fuera.

**Riesgos restantes:**

* La lista pending muestra nombre solo si backend lo agrega más adelante.  
* Home/Profile siguen usando estructuras UI legacy; el acceso principal ya queda gateado por `/api/auth/me`.

Se editaron 5 archivos+472-156Revisar cambios  
DeshacerRevisar  
front/mi-front-limpio/services/api.ts+91-0  
front/mi-front-limpio/services/invitations.ts+164-87  
front/mi-front-limpio/screens/InvitarPersonas.tsx+199-53  
Mostrar 2 archivos más  
lunes, 5:00 p.m.  
Desde la raíz del proyecto: supabase link \--project-ref pkidoxngqdwoummbdlop Luego: supabase db push Pero antes de correr db push, mejor preguntale a Codex que confirme qué migraciones detecta y si db push es seguro para tu caso. solo queda subir la migracion a supabase para confirmar bien el estado de el proyecto actual, estamos seguros de que funciona correctamente y podemos hacer el push?  
lunes, 5:27 p.m.  
Procesado durante 43s

No, todavía no confirmaría `supabase db push`.

Lo que sí confirmé localmente:

* Migraciones timestamped detectables:  
  * `202606210001_auth_base.sql`  
  * `202606210002_rls_auth.sql`  
  * `202606210003_schedules.sql`  
  * `202606210004_tasks.sql`  
  * `202606210005_events.sql`  
  * `202606210006_ensure_user_fn.sql`  
  * `202606210007_join_by_token_fn.sql`  
  * `202606210008_fix_es256_jwt.sql`  
  * `202606210009_auth_onboarding_final.sql`  
* Hay además `supabase/migrations/rls_test.sql`, que no parece una migración versionada normal. Eso es una bandera amarilla antes de push.  
* El repo muestra migraciones viejas `migration_001...migration_008` borradas y las nuevas `202606...` sin trackear. Eso puede estar bien como renombrado, pero conviene no empujar a remoto hasta confirmar historial.

Intenté linkear:

supabase link \--project-ref pkidoxngqdwoummbdlop

pero falló por autenticación:

Access token not provided. Supply an access token by running supabase login or setting the SUPABASE\_ACCESS\_TOKEN environment variable.

**Veredicto:** no hagas `supabase db push` aún. Primero hay que autenticarse y correr:

supabase migration list

Ahí confirmamos si el remoto no tiene migraciones aplicadas conflictivas y si Supabase va a intentar subir exactamente las `202606210001` a `202606210009`. También revisaría o sacaría `rls_test.sql` de `supabase/migrations` antes del push si no es una migración real.

lunes, 5:27 p.m.  
pero yo puedo agarrar esos 9 archivos, copiar su contenido, ponerlos en el sql editor en supabase y hacerlo manualmente no?  
lunes, 5:28 p.m.

Sí, podés, pero no te lo recomiendo como camino normal.

El problema no es copiar/pegar SQL; el problema es que si lo ejecutás manualmente en el SQL Editor, **Supabase CLI no registra esas migraciones como aplicadas** en su historial (`supabase_migrations.schema_migrations`). Después, cuando hagas `supabase db push`, la CLI puede intentar aplicar esas mismas migraciones de nuevo y chocar con tablas, policies, functions o constraints ya existentes.

Para hacerlo bien tenés dos caminos:

**Recomendado:** loguearte con Supabase CLI y usar `supabase db push`.  
supabase login  
supabase link \--project-ref pkidoxngqdwoummbdlop  
supabase migration list

1. supabase db push  
2. **Manual solo si aceptás el costo:** pegar los SQL en orden, del `202606210001...` al `202606210009...`, y después reconciliar/registrar el historial de migraciones para que la CLI no las duplique. Esto es más fácil de romper.

Además, no pegaría `rls_test.sql` como migración: parece archivo de prueba, no parte del set final.

Mi respuesta corta: **sí se puede manualmente, pero para este proyecto conviene usar `db push` después de login/link y `migration list`**. Así mantenés el estado remoto alineado con el repo.

lunes, 5:28 p.m.  
