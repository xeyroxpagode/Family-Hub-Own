# H-042.4B Family Members Backend

## Alcance

Implementacion backend para Familia/Members sin cambios de frontend. Incluye lectura agregada para FamilyScreen, miembros activos, detalle seguro, cambio manual de rol, solicitudes de cambio de rol y finalizacion de miembros.

Queda fuera: Feed, GPS, Finance, Inventory, Family Cloud, pantallas, mocks y flujos legacy de invitations.

## Tabla nueva

`public.household_role_change_requests`

Campos principales:
- `household_id`
- `membership_id`
- `requested_by_member_id`
- `from_role` (se expone como `current_role` en la API)
- `requested_role`
- `reason`
- `status`: `pending`, `approved`, `rejected`, `canceled`
- `reviewed_by_member_id`
- `reviewed_at`
- `resolution_note`

La migracion usa constraints simples para status y roles. La consistencia cross-row entre `household_id`, `membership_id`, `requested_by_member_id` y `reviewed_by_member_id` se valida con trigger, no con subqueries dentro de `CHECK`.

## RLS y RPC

RLS:
- select: coordinator activo del hogar o miembro solicitante.
- insert: miembro activo creando solicitud propia.
- update: coordinator activo.
- delete: bloqueado.

RPCs agregadas:
- `change_household_member_role(uuid, uuid, text)`
- `create_household_role_change_request(uuid, text, text)`
- `approve_household_role_change_request(uuid, uuid)`
- `reject_household_role_change_request(uuid, uuid, text)`
- `cancel_household_role_change_request(uuid, uuid)`

Las RPCs son `security definer`, usan `current_person_id()`, validan membresia active y bloquean dejar el hogar sin `coordinator`.

## Endpoints

- `GET /api/households/:household_id/family`: miembro active. Devuelve household, current_member, members, join_requests, invite_links, role_requests y limits.
- `GET /api/households/:household_id/members`: miembro active. Devuelve miembros active con datos publicos seguros.
- `GET /api/households/:household_id/members/:membership_id`: miembro active. Devuelve detalle publico seguro.
- `POST /api/households/:household_id/members/:membership_id/finalize`: solo coordinator. Usa RPC existente `finalize_household_member`.
- `PATCH /api/households/:household_id/members/:membership_id/role`: solo coordinator. Usa `change_household_member_role`.
- `POST /api/households/:household_id/role-requests`: miembro active. Crea solicitud propia.
- `GET /api/households/:household_id/role-requests?status=pending|all`: coordinator ve todas; miembro comun ve propias.
- `POST /api/households/:household_id/role-requests/:request_id/approve`: solo coordinator.
- `POST /api/households/:household_id/role-requests/:request_id/reject`: solo coordinator.
- `POST /api/households/:household_id/role-requests/:request_id/cancel`: solicitante de la solicitud pending.

## Permisos

- `coordinator`: administra miembros, join requests, invite links relevantes y role requests.
- `adult`, `adolescent`, `child`, `senior`, `guest`: acceden como miembros activos, ven datos publicos seguros y pueden solicitar cambio de rol.
- `pending`, `suspended`, `finalized`: no acceden a Family hub ni endpoints de members.

## Regla ultimo coordinator

No se puede:
- finalizar al ultimo `coordinator`.
- cambiar el rol del ultimo `coordinator` a otro rol.
- aprobar o crear una solicitud que baje al ultimo `coordinator`.

## Workflow role requests

1. Un miembro active crea una solicitud para su propia membership.
2. No puede crear una segunda solicitud `pending`.
3. Coordinator aprueba o rechaza.
4. Si aprueba, la RPC actualiza `household_members.role` y marca la solicitud `approved`.
5. El solicitante puede cancelar su solicitud si sigue `pending`.
6. Un cambio manual de rol por coordinator aprueba automaticamente una solicitud pending del mismo miembro al mismo rol.

## QA ejecutado

- `node -c backend/index.js`: OK.
- `node -c backend/src/routes/households.js`: OK.
- `node -c backend/src/controllers/households.controller.js`: OK.
- `node -c backend/src/lib/householdMembers.service.js`: OK.
- `node -c backend/src/constants/householdConstants.js`: OK.
- `node -c backend/src/routes/inviteLinks.js`: OK.
- `node -c backend/src/controllers/inviteLinks.controller.js`: OK.
- `supabase db lint`: intentado; no pudo conectar porque la DB local no estaba escuchando en `127.0.0.1:54322`.
- SQL: validacion estatica/visual. No quedan subqueries dentro de `CHECK`; las subqueries existentes estan en triggers, policies o funciones.

## Checklist curl/Postman

Usar `Authorization: Bearer <token>` y reemplazar IDs.

1. Coordinator: `GET /api/households/<household_id>/family` -> 200.
2. Adult: `GET /api/households/<household_id>/family` -> 200.
3. Pending user: `GET /api/households/<household_id>/family` -> 403.
4. Coordinator: `GET /api/households/<household_id>/members` -> 200.
5. Member detail: `GET /api/households/<household_id>/members/<membership_id>` -> 200.
6. Coordinator patch role: `PATCH /api/households/<household_id>/members/<membership_id>/role` body `{ "role": "adult" }` -> 200.
7. Coordinator baja ultimo coordinator: same endpoint body `{ "role": "adult" }` -> 409.
8. Member creates role request: `POST /api/households/<household_id>/role-requests` body `{ "requested_role": "adult", "reason": "opcional" }` -> 201.
9. Segunda pending del mismo member: same request -> 409.
10. Coordinator approve: `POST /api/households/<household_id>/role-requests/<request_id>/approve` -> 200.
11. Coordinator reject: `POST /api/households/<household_id>/role-requests/<request_id>/reject` body `{ "resolution_note": "opcional" }` -> 200.
12. Requester cancel: `POST /api/households/<household_id>/role-requests/<request_id>/cancel` -> 200.
13. Coordinator finalize member: `POST /api/households/<household_id>/members/<membership_id>/finalize` -> 200.
14. Coordinator finaliza ultimo coordinator: same endpoint -> 409.
15. User de otro household accede a family/members/detail -> 403 o 404.

## Riesgos

- La migracion queda pendiente de aplicar en la DB objetivo.
- El frontend actual puede no consumir aun los nuevos endpoints/campos.
- Las rutas legacy de invitations siguen deshabilitadas y no deben revivirse.
- `supabase db lint` requiere stack local levantado; no se ejecuto contra una DB activa en esta sesion.
