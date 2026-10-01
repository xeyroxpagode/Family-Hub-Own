# AUTH fragment — HomePlus — Api + TestCases + Edgecases V1(2)

## 1. Información encontrada

### Objetivo del módulo

El documento define contratos de API para autenticación y acceso inicial al sistema HomePlus. El alcance explícito cubre registro, login, refresh token, logout, creación automática de hogar durante el registro, membresía inicial con rol `coordinator`, invitación de miembros y aceptación de invitaciones.

### Entidades

| Entidad | Información encontrada | Fuente |
| ------- | ---------------------- | ------ |
| `auth.users` | Se crea durante `POST /api/auth/register`. Forma parte de Supabase Auth. | Documento principal, `1.1 POST /api/auth/register`; comprensión, `SupabaseAuth` |
| Usuario autenticado | Login devuelve `user: { id, email, display_name }`. | Documento principal, `1.2 POST /api/auth/login` |
| `households` | Se crea automáticamente durante register junto con el usuario. | Documento principal, `1.1 POST /api/auth/register` |
| `household_members` | Se crea automáticamente durante register con rol `coordinator`. También se genera al aceptar invitación. | Documento principal, `1.1 POST /api/auth/register`, `1.13 POST /api/households/:hid/invitations/:iid/accept`; comprensión, `HouseholdMembers` |
| `invitations` | Invitaciones pendientes para unirse a un hogar. | Documento principal, `1.12 POST /api/households/:hid/invitations`, `1.13 POST /api/households/:hid/invitations/:iid/accept`; comprensión, `Invitations` |
| Refresh token | Token enviado en register/login/refresh. Se invalida en logout. | Documento principal, `1.1`, `1.2`, `1.3`, `1.4` |

### Campos

#### Register

Endpoint: `POST /api/auth/register`

Request:

```json
{ "email": "...", "password": "...", "display_name": "...", "language": "...", "phone": "..." }
```

Campos obligatorios explícitos:

* `email`
* `password`
* `display_name`

Campos opcionales explícitos:

* `language?`
* `phone?`

Response 201:

```json
{ "user_id": "...", "member_id": "...", "household_id": "...", "token": "...", "refresh_token": "...", "expires_at": "..." }
```

Response 409:

```json
{ "error": "email_already_registered", "code": "auth/email_taken" }
```

#### Login

Endpoint: `POST /api/auth/login`

Request:

```json
{ "email": "...", "password": "..." }
```

Response 200:

```json
{
  "token": "...",
  "refresh_token": "...",
  "expires_at": "...",
  "user": {
    "id": "...",
    "email": "...",
    "display_name": "..."
  },
  "households": [
    { "id": "...", "name": "...", "slug": "...", "role": "..." }
  ]
}
```

Response 401:

```json
{ "error": "invalid_credentials", "code": "auth/wrong_password" }
```

#### Refresh Token

Endpoint: `POST /api/auth/refresh`

Request:

```json
{ "refresh_token": "..." }
```

Response 200:

```json
{ "token": "...", "refresh_token": "...", "expires_at": "..." }
```

Response 401:

```json
{ "error": "invalid_refresh_token", "code": "auth/expired_refresh" }
```

#### Logout

Endpoint: `POST /api/auth/logout`

Request:

```json
{}
```

Response 200:

```json
{ "logged_out": true }
```

#### Crear hogar durante registro

El register crea:

* `auth.users`
* `households`
* `household_members`

El miembro inicial queda con rol:

```text
coordinator
```

El response de register incluye:

```text
household_id
member_id
user_id
token
refresh_token
expires_at
```

#### Invitación de miembros durante onboarding

Endpoint: `POST /api/households/:hid/invitations`

Request:

```json
{ "email": "...", "phone": "...", "suggested_role": "...", "message": "..." }
```

Campos obligatorios explícitos:

* `email`

Campos opcionales explícitos:

* `phone?`
* `suggested_role?`
* `message?`

Response 201:

```json
{ "invitation_id": "...", "token": "...", "expires_at": "..." }
```

Valor por defecto explícito:

```text
suggested_role = 'adult'
```

Restricciones explícitas:

* El token es único.
* El token es single-use.
* El token expira en 7 días.

#### Aceptar invitación

Endpoint: `POST /api/households/:hid/invitations/:iid/accept`

Request:

```json
{ "token": "..." }
```

Response 200:

```json
{ "member_id": "...", "household_id": "...", "role": "...", "joined_at": "..." }
```

Response 409:

```json
{ "error": "token_already_used", "code": "invitation/expired_or_used" }
```

### Tipos

El documento no define tipos formales para los campos de Auth. Los contratos indican valores por forma JSON, pero no especifican tipos como `string`, `uuid`, `datetime` o `boolean` salvo por inferencia del nombre del campo.

### Valores por defecto

| Campo | Valor por defecto encontrado | Fuente |
| ----- | ---------------------------- | ------ |
| Rol del miembro creado durante register | `coordinator` | Documento principal, `1.1 POST /api/auth/register` |
| `suggested_role` en invitación | `'adult'` | Documento principal, `1.12 POST /api/households/:hid/invitations` |
| Idioma HTTP | `Accept-Language: es-419` por defecto | Documento principal, `Convenciones Generales` |

### Restricciones

| Restricción | Información encontrada | Fuente |
| ----------- | ---------------------- | ------ |
| Auth HTTP | Bearer token JWT de Supabase en header `Authorization: Bearer <token>`. | Documento principal, `Convenciones Generales` |
| Register | Endpoint público. | Documento principal, `1.1 POST /api/auth/register` |
| Login | Endpoint público. | Documento principal, `1.2 POST /api/auth/login` |
| Refresh | Requiere Bearer con token actual válido o expirado. | Documento principal, `1.3 POST /api/auth/refresh` |
| Logout | Requiere Bearer. | Documento principal, `1.4 POST /api/auth/logout` |
| Logout | Invalida `refresh_token` en servidor. | Documento principal, `1.4 POST /api/auth/logout` |
| Invitación | Solo rol `coordinator` puede crear invitaciones. | Documento principal, `1.12 POST /api/households/:hid/invitations` |
| Aceptación de invitación | Requiere usuario logueado cuyo email coincide con el email de la invitación. | Documento principal, `1.13 POST /api/households/:hid/invitations/:iid/accept` |
| Aceptación de invitación | Debe ser atómica mediante `UPDATE invitations SET status='accepted' WHERE token=X AND status='pending'` + unique constraint. | Documento principal, `1.13`; Edge Case `EC-1` |
| RLS | Toda query se filtra por `household_id` del miembro autenticado. | Documento principal, `Convenciones Generales` |
| Último coordinator | El único `coordinator` activo no puede auto-removerse. | Documento principal, `TC-A7`, `EC-12`; comprensión, reglas de negocio |

### Relaciones

| Origen | Relación | Destino | Fuente |
| ------ | -------- | ------- | ------ |
| `Households` | contiene | `HouseholdMembers` | Archivo de comprensión, `OUTPUT 2 — RELATIONSHIPS` |
| `HouseholdMembers` | pertenece a | `Households` | Archivo de comprensión, `OUTPUT 2 — RELATIONSHIPS` |
| `HouseholdMembers` | referencia | `SupabaseAuth` | Archivo de comprensión, `OUTPUT 2 — RELATIONSHIPS` |
| `Coordinador` / `coordinator` | crea | `Invitations` | Archivo de comprensión, `OUTPUT 2 — RELATIONSHIPS`; Documento principal, `1.12` |
| `Invitations` | genera | `HouseholdMembers` | Archivo de comprensión, `OUTPUT 2 — RELATIONSHIPS`; Documento principal, `1.13` |
| Register | crea | `auth.users` + `households` + `household_members` | Documento principal, `1.1` |

### Cardinalidad

El documento no define cardinalidad formal con notación 1:N o N:M para Auth. El archivo de comprensión sí declara relaciones conceptuales:

* `Households` contiene `HouseholdMembers`.
* `HouseholdMembers` pertenece a `Households`.
* `Invitations` genera `HouseholdMembers`.

### Estados posibles

#### Invitación

Estados explícitos encontrados:

* `pending`
* `accepted`
* `cancelled`

Uso encontrado:

* La aceptación atómica exige `status='pending'`.
* La aceptación actualiza a `status='accepted'`.
* La cancelación devuelve `status: 'cancelled'`.

#### Membership / miembro del hogar

Estados explícitos encontrados:

* `active`
* `finalized`
* `suspended`

Uso encontrado:

* `status='finalized'` dispara `member.left`.
* `status='suspended'` suspende temporalmente.
* Para bloquear auto-remoción del último coordinador se cuenta `role='coordinator' AND status='active'`.

#### Sesión / token

Estados explícitos encontrados:

* token actual válido o expirado para `POST /api/auth/refresh`.
* refresh token inválido o expirado en error `invalid_refresh_token` / `auth/expired_refresh`.

No se define una entidad de sesión ni una tabla de refresh tokens.

### Roles

Roles dentro del alcance MVP solicitados y encontrados de forma directa o equivalente:

| Rol MVP | Nombre encontrado | Fuente |
| ------- | ----------------- | ------ |
| Coordinator | `coordinator`, `Coordinador` | Documento principal, endpoints Auth/Members; comprensión, `OUTPUT 1 — ENTITIES` |
| Adult | `adult`, `Adulto` | Documento principal, invitación default; comprensión, `OUTPUT 1 — ENTITIES` |
| Adolescent | `Adolescente` | Comprensión, `OUTPUT 1 — ENTITIES` |
| Child | `Nino` | Comprensión, `OUTPUT 1 — ENTITIES` |
| Senior | `AdultoMayor` | Comprensión, `OUTPUT 1 — ENTITIES` |
| Guest | `Invitado` | Comprensión, `OUTPUT 1 — ENTITIES` |

El documento principal no lista explícitamente los valores aceptados para `suggested_role` en invitaciones.

### Reglas de negocio

* Register crea usuario, hogar y miembro inicial en una sola operación documentada.
* El miembro inicial del hogar creado durante register recibe rol `coordinator`.
* Login devuelve token, refresh token, expiración, datos del usuario y lista de hogares asociados.
* Refresh recibe `refresh_token` y devuelve nuevo `token`, `refresh_token` y `expires_at`.
* Logout invalida el `refresh_token` en servidor.
* Solo `coordinator` puede crear invitaciones.
* La invitación usa token único, single-use y con expiración de 7 días.
* La aceptación de invitación requiere usuario logueado cuyo email coincide con el de la invitación.
* La aceptación de invitación debe ser atómica para evitar doble uso del token.
* Cada membresía posee un único rol activo, según el archivo de comprensión.
* `Persona ≠ Usuario`: `user_id` puede ser nullable en `household_members`, según el archivo de comprensión.
* El único `coordinator` activo no puede auto-removerse; debe transferir rol primero.

### Permisos

| Acción | Auth requerida | Permiso / rol | Fuente |
| ------ | -------------- | ------------- | ------ |
| Register | Pública | No requiere usuario autenticado. | Documento principal, `1.1` |
| Login | Pública | No requiere usuario autenticado. | Documento principal, `1.2` |
| Refresh token | Bearer | Token actual válido o expirado. | Documento principal, `1.3` |
| Logout | Bearer | Usuario autenticado. | Documento principal, `1.4` |
| Crear invitación | Bearer | Rol `coordinator`. | Documento principal, `1.12` |
| Aceptar invitación | Bearer | Usuario logueado cuyo email coincide con el de la invitación. | Documento principal, `1.13` |
| Editar datos propios de miembro | Bearer | El propio miembro. | Documento principal, `1.11` |
| Editar rol/status de miembro | Bearer | `coordinator`. | Documento principal, `1.11` |

### Flujos

#### Register

1. Usuario nuevo envía `POST /api/auth/register` con `email`, `password`, `display_name` y opcionales `language`, `phone`.
2. El sistema crea `auth.users`.
3. El sistema crea `households`.
4. El sistema crea `household_members` con rol `coordinator`.
5. El sistema devuelve `user_id`, `member_id`, `household_id`, `token`, `refresh_token`, `expires_at`.
6. El sistema dispara `user.registered`.

#### Login

1. Usuario registrado envía `POST /api/auth/login` con `email` y `password`.
2. Si las credenciales son correctas, el sistema devuelve `token`, `refresh_token`, `expires_at`, `user` y `households`.
3. Si la contraseña es incorrecta, devuelve `401` con `invalid_credentials`.
4. Test case: luego de 5 intentos fallidos aplica backoff exponencial manejado por Supabase Auth.

#### Refresh Token

1. Usuario envía `POST /api/auth/refresh` con Bearer token actual, válido o expirado.
2. Request incluye `{ refresh_token }`.
3. Si el refresh token es válido, devuelve nuevo `token`, nuevo `refresh_token` y `expires_at`.
4. Si el refresh token es inválido o expirado, devuelve `401` con `invalid_refresh_token`.

#### Logout

1. Usuario autenticado envía `POST /api/auth/logout`.
2. Request vacío `{}`.
3. El sistema invalida `refresh_token` en servidor.
4. El sistema devuelve `{ logged_out: true }`.

#### Crear hogar durante registro

1. Ocurre dentro de `POST /api/auth/register`.
2. El documento no define un request separado de configuración de hogar dentro del register.
3. El response incluye `household_id`.
4. El miembro inicial queda asociado al hogar como `coordinator`.

#### Invitar miembros durante onboarding

1. Un `coordinator` autenticado envía `POST /api/households/:hid/invitations`.
2. Request incluye `email` y opcionales `phone`, `suggested_role`, `message`.
3. Si `suggested_role` no se envía, default `'adult'`.
4. El sistema genera `invitation_id`, `token`, `expires_at`.
5. El token es único, single-use y expira en 7 días.
6. El sistema dispara `member.invited`.

#### Aceptar invitación

1. Usuario logueado cuyo email coincide con la invitación envía `POST /api/households/:hid/invitations/:iid/accept`.
2. Request incluye `{ token }`.
3. El sistema ejecuta aceptación atómica sobre invitación `pending`.
4. Si la aceptación es válida, devuelve `member_id`, `household_id`, `role`, `joined_at`.
5. El sistema dispara `member.joined`.
6. Si el token ya fue usado o no está disponible, devuelve `409` con `token_already_used`.

#### Onboarding por rol

El documento contiene roles y permisos asociados a endpoints, pero no define un flujo de onboarding por rol, pantallas específicas, pasos condicionales ni configuración inicial diferenciada por rol.

### APIs

| Acción | Método | Ruta | Request | Response | Errores | Estado |
| ------ | ------ | ---- | ------- | -------- | ------- | ------ |
| Register | POST | `/api/auth/register` | `{ email, password, display_name, language?, phone? }` | 201 `{ user_id, member_id, household_id, token, refresh_token, expires_at }` | 409 `{ error: "email_already_registered", code: "auth/email_taken" }` | Definido |
| Login | POST | `/api/auth/login` | `{ email, password }` | 200 `{ token, refresh_token, expires_at, user: { id, email, display_name }, households: [{ id, name, slug, role }] }` | 401 `{ error: "invalid_credentials", code: "auth/wrong_password" }` | Definido |
| Refresh Token | POST | `/api/auth/refresh` | `{ refresh_token }` | 200 `{ token, refresh_token, expires_at }` | 401 `{ error: "invalid_refresh_token", code: "auth/expired_refresh" }` | Definido |
| Logout | POST | `/api/auth/logout` | `{}` | 200 `{ logged_out: true }` | No encontrado | Definido parcial |
| Crear invitación | POST | `/api/households/:hid/invitations` | `{ email, phone?, suggested_role?, message? }` | 201 `{ invitation_id, token, expires_at }` | No encontrado | Definido parcial |
| Aceptar invitación | POST | `/api/households/:hid/invitations/:iid/accept` | `{ token }` | 200 `{ member_id, household_id, role, joined_at }` | 409 `{ error: "token_already_used", code: "invitation/expired_or_used" }` | Definido |

### UI

No se encontró estructura de UI implementable para Auth/Onboarding en este documento.

No se encontraron detalles de:

* pantalla de Login
* pantalla de Register
* pantalla de Create Household durante register
* wizard de onboarding
* pantalla de Invite Members
* pantalla de Accept Invitation
* inputs UI
* botones UI
* navegación UI post-login
* estados vacíos o errores visuales

### Componentes UI

No encontrados para este fragment.

### Navegación

No encontrada para Auth/Onboarding en el documento principal.

### Eventos del sistema

| Evento | Cuándo ocurre | Payload | Fuente |
| ------ | ------------- | ------- | ------ |
| `user.registered` | Register exitoso. | No definido. | Documento principal, `1.1`; Test Case `TC-A1` |
| `member.invited` | Creación de invitación. | No definido. | Documento principal, `1.12` |
| `member.joined` | Aceptación de invitación / miembro unido. | `{ member_id, display_name, role }` en realtime. | Documento principal, `1.13`; `PARTE 2: Realtime Events` |
| `member.left` | `status='finalized'` en miembro. | `{ member_id, display_name }` en realtime. | Documento principal, `1.11`; `PARTE 2: Realtime Events` |
| `member.role_changed` | Cambio de rol de miembro. | `{ member_id, old_role, new_role }` en realtime. | Documento principal, `1.11`; `PARTE 2: Realtime Events` |

No se encontraron eventos técnicos con estos nombres:

* `auth.logged_in`
* `auth.logged_out`
* `auth.token_refreshed`

### Dependencias

* Supabase Auth para JWT y `auth.users`.
* Supabase / PostgreSQL con RLS por `household_id`.
* `households` para creación automática de hogar durante register.
* `household_members` para membresía inicial y aceptación de invitación.
* `invitations` para invitación y aceptación.
* Roles para permisos de invitación y edición de miembros.
* Unique constraint / actualización atómica para aceptación de invitación.

### Restricciones arquitectónicas

* Stack declarado: Supabase con PostgreSQL + Auth + Storage + Edge Functions + Realtime.
* Auth usa Bearer token JWT de Supabase.
* Errores siguen formato general `{ error: string, code: string, field?: string, details?: any }`.
* Content-Type default: `application/json`, salvo endpoints multipart.
* RLS filtra toda query por `household_id` del miembro autenticado.
* El documento es derivado y declara que FinalSpec V1 gana en contradicciones, pero FinalSpec V1 no está disponible en este contexto.
* `Persona ≠ Usuario`: `user_id` nullable en `household_members` según archivo de comprensión.

### Casos de uso / Test cases

| Caso | Given | When | Then |
| ---- | ----- | ---- | ---- |
| Registro exitoso | Usuario nuevo con email válido. | `POST /api/auth/register` con email + password + display_name. | 201, se crea `household`, miembro con rol `coordinator`, token válido, dispara `user.registered`. |
| Registro duplicado | Usuario ya registrado. | `POST /api/auth/register` con mismo email. | 409 Conflict, `email_already_registered`. |
| Login exitoso | Usuario registrado. | `POST /api/auth/login` con credenciales correctas. | 200, token + lista de hogares + refresh_token. |
| Login fallido | Usuario registrado. | `POST /api/auth/login` con password incorrecta. | 401, `invalid_credentials`; rate-limiting: 5 intentos → backoff exponencial manejado por Supabase Auth. |
| Invitación flujo completo | Coordinator crea invitación para email X. | 1) POST invitations. 2) Invitado acepta con token. | 1) 201, se envía email con token. 2) 200, miembro unido, dispara `member.joined`. |
| Invitación race condition | 2 usuarios intentan aceptar mismo token simultáneamente. | POST concurrentes. | Solo el primero obtiene 200. Segundo recibe 409 `token_already_used`. |
| Coordinator no puede auto-removerse | Único coordinator activo. | `PATCH /members/:self` con `status='finalized'`. | 400 `cannot_remove_last_coordinator`; debe transferir rol primero. |

### Casos especiales / Edge cases

| Edge case | Comportamiento esperado | Mitigación |
| --------- | ----------------------- | ---------- |
| Race condition en aceptación de invitación | Solo el primer request obtiene 200; el segundo recibe 409 `token_already_used`. | `UPDATE invitations SET status='accepted' WHERE token=X AND status='pending'` atómico + unique constraint. |
| Coordinator se auto-remueve siendo el único activo | 400 `cannot_remove_last_coordinator`; mensaje: “Transfiere tu rol primero.” | Validación pre-transacción: `SELECT COUNT(*) WHERE role='coordinator' AND status='active'`; si `=1`, bloquear. |

### Datos mockeados

No se encontró información mock para Auth/Onboarding.

### Funcionalidades REAL

* Register.
* Login.
* Refresh Token.
* Logout.
* Crear hogar durante registro.
* Crear `household_members` inicial durante registro con rol `coordinator`.
* Crear invitación por `coordinator`.
* Aceptar invitación con token.
* Validación de token single-use en invitaciones.
* Expiración de invitación en 7 días.
* Default `suggested_role='adult'`.
* Eventos `user.registered`, `member.invited`, `member.joined`.

### Funcionalidades MOCK

No encontradas para este fragment.

### Funcionalidades POST_MVP

* Crear segundo hogar con `POST /api/households` aparece definido en el documento, pero no forma parte del flujo obligatorio de Auth solicitado para este fragmento, que solo requiere crear hogar durante registro.
* Login devuelve lista de hogares. El dato existe en el contrato, pero cualquier desarrollo de multi-hogar avanzado queda fuera de este fragmento.

---

## 2. Clasificación para implementación

### REAL

Implementable para MVP v1.0 desde este documento:

#### Register

* Endpoint público `POST /api/auth/register`.
* Request: `{ email, password, display_name, language?, phone? }`.
* Response 201: `{ user_id, member_id, household_id, token, refresh_token, expires_at }`.
* Error 409: `{ error: "email_already_registered", code: "auth/email_taken" }`.
* Efectos:
  * crea `auth.users`;
  * crea `households`;
  * crea `household_members`;
  * asigna rol `coordinator`;
  * dispara `user.registered`.

#### Login

* Endpoint público `POST /api/auth/login`.
* Request: `{ email, password }`.
* Response 200: `{ token, refresh_token, expires_at, user: { id, email, display_name }, households: [{ id, name, slug, role }] }`.
* Error 401: `{ error: "invalid_credentials", code: "auth/wrong_password" }`.
* Test case: 5 intentos fallidos → backoff exponencial manejado por Supabase Auth.

#### Refresh Token

* Endpoint `POST /api/auth/refresh`.
* Auth: Bearer con token actual válido o expirado.
* Request: `{ refresh_token }`.
* Response 200: `{ token, refresh_token, expires_at }`.
* Error 401: `{ error: "invalid_refresh_token", code: "auth/expired_refresh" }`.

#### Logout

* Endpoint `POST /api/auth/logout`.
* Auth: Bearer.
* Request: `{}`.
* Response 200: `{ logged_out: true }`.
* Efecto: invalida `refresh_token` en servidor.

#### Crear hogar durante registro

* Se implementa como efecto de `POST /api/auth/register`.
* Crea `households`.
* Crea `household_members`.
* El miembro inicial queda como `coordinator`.
* El response devuelve `household_id` y `member_id`.

#### Invitar miembros durante onboarding

* Endpoint `POST /api/households/:hid/invitations`.
* Auth: Bearer, rol `coordinator`.
* Request: `{ email, phone?, suggested_role?, message? }`.
* Response 201: `{ invitation_id, token, expires_at }`.
* `suggested_role` default: `'adult'`.
* Token único, single-use, expira 7 días.
* Dispara `member.invited`.

#### Aceptar invitación

* Endpoint `POST /api/households/:hid/invitations/:iid/accept`.
* Auth: Bearer, usuario logueado cuyo email coincide con la invitación.
* Request: `{ token }`.
* Response 200: `{ member_id, household_id, role, joined_at }`.
* Error 409: `{ error: "token_already_used", code: "invitation/expired_or_used" }`.
* Atomicidad con update condicional sobre invitación `pending` + unique constraint.
* Dispara `member.joined`.

#### Roles MVP encontrados

* `coordinator` / Coordinador → Coordinator.
* `adult` / Adulto → Adult.
* Adolescente → Adolescent.
* Nino → Child.
* AdultoMayor → Senior.
* Invitado → Guest.

### MOCK

No se encontró información para simular Auth/Onboarding con texto fijo, datos dummy o comportamiento falso.

### POST_MVP

* Crear segundo hogar por endpoint dedicado `POST /api/households` queda fuera del fragmento Auth obligatorio, salvo que una etapa posterior decida incluirlo en Household.
* Soporte completo de múltiples hogares en login queda fuera del fragmento Auth obligatorio; el contrato devuelve `households`, pero no se desarrolla multi-hogar avanzado aquí.
* No hay implementación de UI de onboarding por rol; solo se registra como faltante.

### IGNORAR

Sin contenido aplicable para este fragmento.

---

## 3. Información faltante

| Tema | Información faltante | Por qué importa | Impacto en implementación |
| ---- | -------------------- | --------------- | ------------------------- |
| Nombre/configuración del hogar en register | `POST /api/auth/register` crea `households`, pero el request no incluye `household_name`, `timezone`, `default_language` ni `config`. | El MVP exige crear hogar durante registro. | No queda definido cómo nombrar/configurar el hogar inicial desde register. |
| Tipos formales | No se especifican tipos de campos (`uuid`, `string`, `datetime`, etc.). | Necesario para DTOs, validación y schema. | Requiere definición externa o posterior; no inventar. |
| Validaciones de password/email | No se definen reglas de password, formato de email, normalización, confirmación de email ni verificación telefónica. | Afecta seguridad y UX de register/login. | Parcial; solo hay error por email duplicado y credenciales inválidas. |
| Refresh token storage | No se define tabla, entidad, expiración exacta, rotación, reuse detection ni revocación global. | Afecta seguridad de sesión. | Solo puede implementarse contrato superficial documentado. |
| Logout | Logout invalida `refresh_token`, pero request es `{}` y no se indica si invalida el refresh token actual, todos los tokens del usuario o tokens por device. | Afecta cierre de sesión y seguridad. | Requiere definición posterior. |
| Eventos Auth | Se define `user.registered`, pero no se definen `auth.logged_in`, `auth.logged_out` ni `auth.token_refreshed`. | Afecta catálogo de eventos e integración realtime/audit. | No inventar eventos no presentes. |
| Payload de `user.registered` y `member.invited` | Se mencionan eventos, pero no se define payload. | Afecta consumidores de eventos. | Evento usable solo como nombre conceptual/técnico sin contrato completo. |
| UI Auth | No hay pantallas, inputs visuales, botones, estados de carga, errores UI ni navegación. | Necesario para frontend. | Queda pendiente de otra fuente. |
| Onboarding por rol | Roles existen, pero no hay flujo, pasos, UI ni reglas de experiencia diferenciada por rol. | El MVP solicita onboarding por rol. | Solo se pueden extraer roles; flujo queda incompleto. |
| Valores permitidos para `suggested_role` | El documento define default `'adult'`, pero no enumera valores aceptados en invitaciones. | Afecta validación de invitaciones. | No limitar ni completar sin otra fuente. |
| Invitado sin cuenta | Aceptar invitación requiere usuario logueado cuyo email coincide. No se define flujo para aceptar invitación creando cuenta. | Afecta onboarding real de miembros nuevos. | Queda pendiente. |
| Validación previa de invitación | No se define endpoint para previsualizar/validar token antes de aceptar. | Afecta UX de invitaciones. | Queda pendiente. |
| Expiración de invitación | Se indica que expira en 7 días, pero no se define respuesta específica para token expirado distinta de `expired_or_used`. | Afecta manejo de errores. | Error ambiguo entre expirado/usado. |
| Cancelación de invitación | Existe `DELETE /api/households/:hid/invitations/:iid`, pero no forma parte directa del alcance Auth solicitado salvo gestión de invitaciones. | Afecta flujo de onboarding si se permite cancelar invitaciones. | Puede extraerse en fragment de invitations/household, no como Auth principal. |
| Privacidad de miembro | `date_of_birth` y `gender` solo visibles si públicos, pero no se define dónde se configura esa privacidad. | Afecta perfil/onboarding de miembro. | Queda pendiente. |
| Último coordinator | Se bloquea auto-remoción del último coordinator, pero no se define endpoint/flujo para transferir rol. | Afecta resolución del edge case. | La mitigación exige transferir rol, pero el flujo no está definido. |
| Precedencia FinalSpec | El documento dice que FinalSpec V1 gana en contradicción, pero FinalSpec V1 no está disponible en este contexto. | Afecta resolución de contradicciones. | No usar FinalSpec para completar huecos. |

---

## 4. Fuente

* Archivo: `HomePlus — Api + TestCases + Edgecases V1(2).md`
  * Sección: `Convenciones Generales`
  * Sección: `1. Auth & Members`
  * Sección: `1.1 POST /api/auth/register`
  * Sección: `1.2 POST /api/auth/login`
  * Sección: `1.3 POST /api/auth/refresh`
  * Sección: `1.4 POST /api/auth/logout`
  * Sección: `1.9 GET /api/households/:hid/members`
  * Sección: `1.10 GET /api/households/:hid/members/:mid`
  * Sección: `1.11 PATCH /api/households/:hid/members/:mid`
  * Sección: `1.12 POST /api/households/:hid/invitations`
  * Sección: `1.13 POST /api/households/:hid/invitations/:iid/accept`
  * Sección: `1.14 DELETE /api/households/:hid/invitations/:iid`
  * Sección: `PARTE 2: Realtime Events (Supabase Realtime / Broadcast)`
  * Sección: `PARTE 3: Test Cases > Auth`
  * Sección: `PARTE 4: Edge Cases`, casos `EC-1` y `EC-12`

* Archivo: `Api + Testcases + Edge cases v1(2).txt`
  * Sección: `OUTPUT 1 — ENTITIES`
  * Sección: `OUTPUT 2 — RELATIONSHIPS`
  * Sección: `OUTPUT 5 — BUSINESS RULES`
  * Sección: `OUTPUT 6 — ARCHITECTURAL DECISIONS`

* Archivo: `source_map_HomePlus_Api_TestCases_Edgecases_V1_2.md`
  * Sección: `4.1 AUTH`
  * Sección: `4.2 ONBOARDING`
