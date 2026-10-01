# AUTH fragment — HomePlus — Eventos del sistema v1

## 1. Información encontrada

### Objetivo del módulo

#### AUTH

* El documento principal solo describe explícitamente el registro de usuario.
* El registro ocurre cuando un nuevo usuario crea cuenta en `auth.users`.
* El registro dispara el evento de sistema `user.registered`.
* No se encontró descripción explícita de Login, Refresh Token ni Logout.

#### ONBOARDING

* El onboarding se describe como un flujo que el usuario completa después del registro.
* El flujo de onboarding incluye explícitamente:
  * crear/perfilar hogar;
  * invitar miembros;
  * configurar preferencias;
  * finalizar onboarding.
* La finalización del onboarding dispara el evento `user.onboarding_completed`.
* La creación del primer hogar dispara el evento `household.created`.
* La invitación de miembros dispara el evento `member.invited`.
* La aceptación de invitación dispara `invitation.accepted` y crea un registro en `household_members`.

---

### Entidades

| Entidad | Información encontrada | Uso dentro de este fragment |
| ------- | ---------------------- | --------------------------- |
| `auth.users` | Tabla/sistema de autenticación mencionado como origen del registro de usuario. | Registro de cuenta. |
| `UserAccount` | Cuenta del usuario. Pertenece al usuario, no al hogar. | Cuenta personal vinculable a membresía. |
| `Household` | Unidad máxima de aislamiento de datos. Tabla `households`. | Hogar creado durante onboarding. |
| `HouseholdMember` | Modelo Persona ≠ Usuario. Tabla `household_members`. `user_id` nullable para miembros sin cuenta. | Membresía/persona dentro del hogar. |
| `Membership` | Relación entre Persona y Hogar. Estados encontrados: `pending`, `active`, `suspended`, `finalized`. | Estado de pertenencia al hogar. |
| `Invitation` | Invitaciones pendientes a un hogar. Tabla `invitations`. | Invitación de miembros durante onboarding. |
| `AuditLog` | Registro inmutable append-only de acciones. Tabla `audit_logs`. | Consumidor de eventos relevantes. |
| `Role` / roles declarados | Roles declarados como entidades de rol en el archivo de comprensión. | Rol sugerido en invitación y rol asignado al miembro. |

---

### Campos

#### Evento `user.registered`

| Campo | Información encontrada |
| ----- | ---------------------- |
| Trigger | Nuevo usuario crea cuenta en `auth.users` usando Supabase Auth. |
| Payload | `{ user_id, email, phone, registered_at }` |
| Consumidores relevantes | Auditoría en Supabase Auth. |
| Prioridad | `BA` / baja. |
| Offline | `D` / descartar: no puede registrarse sin conexión. |

#### Evento `user.onboarding_completed`

| Campo | Información encontrada |
| ----- | ---------------------- |
| Trigger | Usuario completa el flujo de onboarding. |
| Pasos mencionados | Crear/perfilar hogar, invitar miembros, configurar preferencias. |
| Payload | `{ user_id, member_id, household_id, steps_completed: [], completed_at }` |
| Prioridad | `BA` / baja. |
| Offline | `Q` / se encola. |

#### Evento `household.created`

| Campo | Información encontrada |
| ----- | ---------------------- |
| Trigger | Usuario crea su primer hogar mediante `INSERT INTO households`. |
| Payload | `{ household_id, name, slug, timezone, default_language, created_by: user_id }` |
| Consumidores relevantes | Auditoría. |
| Prioridad | `BA` / baja. |
| Offline | `S` / solo online. |

#### Evento `member.invited`

| Campo | Información encontrada |
| ----- | ---------------------- |
| Trigger | Coordinador, o adulto con permiso, crea una invitación en `invitations`. |
| Payload | `{ household_id, invitation_id, invited_by: member_id, email, phone, suggested_role, message, token, expires_at }` |
| Consumidores relevantes | Notificación al invitado vía email/SMS; email transaccional al invitado; auditoría; aviso de invitación pendiente al coordinador. |
| Prioridad | `ME` / media. |
| Offline | `Q` / se encola y se envía al sincronizar. |

#### Evento `invitation.accepted`

| Campo | Información encontrada |
| ----- | ---------------------- |
| Trigger | Invitado acepta invitación vía token. |
| Cambio de estado | `invitations.status = 'accepted'`. |
| Efecto | Se crea `household_members`. |
| Payload | `{ invitation_id, household_id, member_id, user_id, display_name, role, accepted_at }` |
| Consumidores relevantes | Notificación al coordinador; auditoría. |
| Prioridad | `ME` / media. |
| Offline | `Q`. |

#### Evento `invitation.expired`

| Campo | Información encontrada |
| ----- | ---------------------- |
| Trigger | CRON detecta `expires_at < now()` con `status = 'pending'`. |
| Cambio de estado | `status = 'expired'`. |
| Payload | `{ invitation_id, household_id, email, phone, invited_by: member_id, expires_at }` |
| Consumidores relevantes | Notificación al coordinador; auditoría. |
| Prioridad | `BA` / baja. |
| Offline | `S` / cron server-side. |

#### Evento `invitation.cancelled`

| Campo | Información encontrada |
| ----- | ---------------------- |
| Trigger | Coordinador cancela invitación. |
| Cambio de estado | `status = 'cancelled'`. |
| Payload | `{ invitation_id, household_id, email, phone, cancelled_by: member_id }` |
| Consumidores relevantes | Auditoría. |
| Prioridad | `BA` / baja. |
| Offline | `Q`. |

#### Evento `member.joined`

| Campo | Información encontrada |
| ----- | ---------------------- |
| Trigger | Se crea `household_members` con `status = 'active'`. |
| Casos de origen | Post-aceptación o creación directa por coordinador. |
| Payload | `{ household_id, member_id, user_id, display_name, role, joined_at }` |
| Consumidores relevantes | Notificación a todos los miembros; auditoría. |
| Prioridad | `ME` / media. |
| Offline | `Q`. |

#### Evento `member.role_changed`

| Campo | Información encontrada |
| ----- | ---------------------- |
| Trigger | Coordinador cambia `role` de un miembro en `household_members`. |
| Payload | `{ household_id, member_id, display_name, old_role, new_role, changed_by: member_id }` |
| Consumidores relevantes | Notificación al miembro afectado; confirmación al coordinador; auditoría. |
| Prioridad | `ME` / media. |
| Offline | `Q`. |

---

### Tipos

* No se encontraron tipos formales para los campos de payload.
* Los tipos solo pueden inferirse por nombre de campo, pero este fragment no los fija como contrato.
* `steps_completed` aparece como arreglo vacío `[]` en el payload de `user.onboarding_completed`.
* `old_config` y `new_config` aparecen como objetos `{}` en `household.settings_changed`, pero ese evento pertenece principalmente a configuración de hogar, no a AUTH.

---

### Valores por defecto

* No se encontraron valores por defecto para registro, sesión, token, invitación u onboarding.
* No se encontró duración por defecto de invitaciones.
* No se encontró idioma ni timezone por defecto del hogar; solo aparecen como campos en `household.created`.

---

### Estados posibles

#### Auth / sesión

* No se encontraron estados de sesión.
* No se encontraron estados de token.
* No se encontró entidad `Session`.
* No se encontró entidad `RefreshToken`.

#### Invitation

Estados encontrados de forma explícita o por transición:

* `pending`
* `accepted`
* `expired`
* `cancelled`

Uso encontrado:

* `pending` aparece como condición para expiración.
* `accepted` aparece cuando el invitado acepta el token.
* `expired` aparece cuando vence una invitación pendiente.
* `cancelled` aparece cuando el coordinador cancela la invitación.

#### Membership / HouseholdMember

Estados encontrados:

* `pending`
* `active`
* `suspended`
* `finalized`

Uso encontrado:

* `active` aparece cuando se crea `household_members` en `member.joined`.
* `finalized` aparece cuando el coordinador remueve un miembro mediante soft-delete.
* `pending` y `suspended` aparecen como estados de membresía, pero no se detalla flujo dentro del documento principal.

#### Onboarding

* No se encontraron estados intermedios del onboarding.
* Solo aparece la finalización mediante `completed_at` y `steps_completed: []`.

---

### Restricciones

* El registro no puede realizarse sin conexión.
* La creación del primer hogar requiere conexión.
* La finalización del onboarding puede encolarse.
* La invitación de miembros puede encolarse y enviarse al sincronizar.
* La expiración de invitaciones se procesa server-side por CRON.
* El modelo separa Persona de Usuario: `household_members.user_id` puede ser nullable.
* La cuenta de usuario pertenece al usuario, no al hogar.
* `household_id` existe en las tablas de coordinación para filtrar por hogar.
* RLS se declara como última línea de defensa y filtra por `household_id` y `member_id`.
* El coordinador no puede eliminar hogares; solo el sistema puede hacerlo al cerrar la cuenta del último miembro.

---

### Relaciones

| Origen | Relación encontrada | Destino | Clasificación dentro del fragment |
| ------ | ------------------- | ------- | --------------------------------- |
| `auth.users` | se vincula mediante `user_id` | `household_members` | REAL |
| `Household` | contiene | `HouseholdMember` | REAL |
| `HouseholdMember` | pertenece a | `Household` | REAL |
| `HouseholdMember` | se vincula con | `UserAccount` | REAL |
| `HouseholdMember` | tiene rol | `CoordinatorRole` / `AdultRole` / `TeenRole` / `ChildRole` / `SeniorRole` / `GuestRole` | REAL, con normalización pendiente para `TeenRole` → rol MVP `Adolescent` |
| `CoordinatorRole` | aprueba | `Invitation` | REAL |
| `CoordinatorRole` | administra | `Household` | REAL |
| `CoordinatorRole` | cambia rol de | `HouseholdMember` | REAL |
| `CoordinatorRole` | expulsa/remueve | `HouseholdMember` | REAL |

---

### Cardinalidad

* El documento indica que `Household` contiene `HouseholdMember`.
* El documento indica que `HouseholdMember` pertenece a `Household`.
* El documento no explicita cardinalidades numéricas.
* El modelo permite miembros sin cuenta mediante `household_members.user_id nullable`.
* Un `HouseholdMember` puede estar vinculado a una `UserAccount`, pero el documento no define si una cuenta puede estar vinculada a múltiples hogares en este fragment.

---

### Reglas de negocio

#### Registro

* Un nuevo usuario crea cuenta en `auth.users`.
* Al registrarse se emite `user.registered`.
* El registro no funciona offline.

#### Onboarding

* El usuario completa onboarding después de crear/perfilar hogar, invitar miembros y configurar preferencias.
* Al completarse, se emite `user.onboarding_completed`.
* El payload guarda `steps_completed: []`, pero no define contenido obligatorio de ese arreglo.

#### Crear hogar durante onboarding

* El usuario crea su primer hogar mediante inserción en `households`.
* El evento asociado es `household.created`.
* El payload incluye `created_by: user_id`.

#### Invitar miembros durante onboarding

* El coordinador, o adulto con permiso, crea una invitación en `invitations`.
* El payload de invitación incluye email, phone, suggested_role, message, token y expires_at.
* La invitación puede enviarse al sincronizar si fue creada offline.

#### Aceptar invitación

* El invitado acepta la invitación vía token.
* La invitación pasa a `accepted`.
* Se crea un registro en `household_members`.
* El payload incluye `role` y `accepted_at`.

#### Ingreso al hogar

* `member.joined` ocurre cuando se crea `household_members` con `status = 'active'`.
* Puede originarse post-aceptación o por creación directa del coordinador.

#### Cambio de rol

* El coordinador cambia el `role` de un miembro en `household_members`.
* El payload conserva `old_role`, `new_role` y `changed_by`.

---

### Permisos

| Rol encontrado | Información explícita encontrada | Clasificación para AUTH/ONBOARDING |
| -------------- | -------------------------------- | ---------------------------------- |
| `CoordinatorRole` | Responsable administrativo. Aprueba ingresos, cambia roles, expulsa miembros. No puede eliminar hogares. También administra hogares y aprueba invitaciones según relaciones. | REAL |
| `AdultRole` | Miembro operativo. Invita, crea/reasigna tareas, crea eventos. No aprueba ingresos. | REAL para invitar miembros; no se usa para aprobar ingresos. |
| `TeenRole` | Autonomía progresiva. Crea eventos familiares, gastos, administra tareas propias. | REAL como rol encontrado; requiere normalización posterior contra rol MVP `Adolescent`. |
| `ChildRole` | Experiencia simplificada. No administra información crítica. | REAL como rol encontrado. |
| `SeniorRole` | Experiencia adaptada. Mismos permisos que Adulto salvo configuraciones específicas. | REAL como rol encontrado. |
| `GuestRole` | Acceso mínimo. Participación limitada. | REAL como rol encontrado. |

Permisos específicos detectados en eventos:

* `member.invited`: lo crea Coordinador o adulto con permiso.
* `invitation.cancelled`: la cancela Coordinador.
* `member.role_changed`: lo ejecuta Coordinador.
* `member.removed`: lo ejecuta Coordinador.

---

### Flujos

#### Register

1. Nuevo usuario crea cuenta en `auth.users`.
2. Se emite `user.registered`.
3. Payload disponible: `{ user_id, email, phone, registered_at }`.
4. La acción no puede hacerse offline.

#### Crear hogar durante onboarding

1. Usuario crea su primer hogar.
2. Se inserta registro en `households`.
3. Se emite `household.created`.
4. Payload disponible: `{ household_id, name, slug, timezone, default_language, created_by: user_id }`.
5. La acción es solo online.

#### Invitar miembros durante onboarding

1. Coordinador, o adulto con permiso, crea invitación en `invitations`.
2. Se emite `member.invited`.
3. Payload disponible: `{ household_id, invitation_id, invited_by: member_id, email, phone, suggested_role, message, token, expires_at }`.
4. La acción puede encolarse y enviarse al sincronizar.

#### Aceptar invitación

1. Invitado acepta invitación vía token.
2. `invitations.status` pasa a `accepted`.
3. Se crea `household_members`.
4. Se emite `invitation.accepted`.
5. Payload disponible: `{ invitation_id, household_id, member_id, user_id, display_name, role, accepted_at }`.
6. El ingreso posterior queda representado por `member.joined` cuando `household_members.status = 'active'`.

#### Completar onboarding

1. Usuario completa el flujo de onboarding.
2. El flujo completo menciona crear/perfilar hogar, invitar miembros y configurar preferencias.
3. Se emite `user.onboarding_completed`.
4. Payload disponible: `{ user_id, member_id, household_id, steps_completed: [], completed_at }`.
5. La acción puede encolarse.

#### Onboarding por rol

* El documento no define flujo diferenciado por rol.
* El documento sí incluye `suggested_role` en invitaciones.
* El documento sí incluye `role` al aceptar invitación y al crear/activar `household_members`.
* El documento sí enumera roles de dominio, pero no define pantallas, pasos ni reglas de onboarding específicas para cada rol MVP.

#### Login

* No encontrado.

#### Refresh Token

* No encontrado.

#### Logout

* No encontrado.

---

### APIs

* No se encontraron endpoints HTTP.
* No se encontraron métodos.
* No se encontraron rutas.
* No se encontraron contratos request/response.
* No se encontraron códigos de error.

Acciones mencionadas sin contrato API:

| Acción | Evento asociado | Estado del contrato |
| ------ | --------------- | ------------------- |
| Register | `user.registered` | Acción mencionada sin contrato API. |
| Completar onboarding | `user.onboarding_completed` | Acción mencionada sin contrato API. |
| Crear primer hogar | `household.created` | Acción mencionada sin contrato API. |
| Invitar miembro | `member.invited` | Acción mencionada sin contrato API. |
| Aceptar invitación | `invitation.accepted` | Acción mencionada sin contrato API. |
| Expirar invitación | `invitation.expired` | Evento cron mencionado sin contrato API. |
| Cancelar invitación | `invitation.cancelled` | Acción mencionada sin contrato API. |
| Cambiar rol | `member.role_changed` | Acción mencionada sin contrato API. |

---

### Request

* No se encontraron requests de API.
* Los payloads de eventos no deben tratarse como request bodies confirmados.

---

### Response

* No se encontraron responses de API.
* Los payloads de eventos no deben tratarse como response bodies confirmados.

---

### UI

* No se encontró pantalla de Login.
* No se encontró pantalla de Register.
* No se encontró pantalla detallada de onboarding.
* No se encontró pantalla de creación de hogar durante onboarding.
* No se encontró pantalla de invitación de miembros durante onboarding.
* No se encontró pantalla de aceptación de invitación.
* No se encontraron formularios, inputs, botones ni estados visuales.

---

### Componentes UI

* No se encontraron componentes UI específicos para AUTH u ONBOARDING.

---

### Navegación

* No se encontró navegación específica para Login, Register u Onboarding.

---

### Eventos del sistema

| Evento | Cuándo ocurre | Payload encontrado | Clasificación |
| ------ | ------------- | ------------------ | ------------- |
| `user.registered` | Nuevo usuario crea cuenta en `auth.users`. | `{ user_id, email, phone, registered_at }` | REAL |
| `user.onboarding_completed` | Usuario completa onboarding. | `{ user_id, member_id, household_id, steps_completed: [], completed_at }` | REAL |
| `household.created` | Usuario crea su primer hogar. | `{ household_id, name, slug, timezone, default_language, created_by: user_id }` | REAL para onboarding. |
| `member.invited` | Coordinador o adulto con permiso crea invitación. | `{ household_id, invitation_id, invited_by: member_id, email, phone, suggested_role, message, token, expires_at }` | REAL para onboarding. |
| `invitation.accepted` | Invitado acepta invitación por token. | `{ invitation_id, household_id, member_id, user_id, display_name, role, accepted_at }` | REAL como dependencia del flujo de invitación. |
| `invitation.expired` | CRON vence invitación pendiente. | `{ invitation_id, household_id, email, phone, invited_by: member_id, expires_at }` | REAL como edge case de invitación. |
| `invitation.cancelled` | Coordinador cancela invitación. | `{ invitation_id, household_id, email, phone, cancelled_by: member_id }` | REAL como edge case de invitación. |
| `member.joined` | Se crea `household_members` activo. | `{ household_id, member_id, user_id, display_name, role, joined_at }` | REAL como resultado de aceptación/alta. |
| `member.role_changed` | Coordinador cambia rol de miembro. | `{ household_id, member_id, display_name, old_role, new_role, changed_by: member_id }` | REAL como gestión básica de rol. |

No se encontraron:

* `auth.logged_in`
* `auth.logged_out`
* `auth.token_refreshed`

---

### Dependencias

* Supabase Auth aparece como origen del registro en `auth.users`.
* `household_members` depende de la vinculación con `user_id` para miembros con cuenta.
* `Household` es necesario para completar onboarding cuando se crea el primer hogar.
* `Invitation` es necesaria para invitar miembros durante onboarding.
* `Role` aparece como `suggested_role` en invitación y `role` en aceptación, alta y cambio de rol.
* RLS depende de `household_id` y `member_id`.
* Auditoría consume eventos relevantes de People/Auth.
* Notificaciones/email aparecen como consumidores de invitaciones y cambios visibles para miembros.

---

### Restricciones arquitectónicas

* Persona ≠ Usuario.
* `user_id` nullable en `household_members`.
* `household_id` en tablas de coordinación.
* RLS filtra por hogar del miembro autenticado.
* RLS se considera última línea de defensa.
* El modelo separa ciclo de vida de negocio y eliminación mediante soft-delete en dominios donde aplica; para miembros aparece `status = 'finalized'` y `left_at = now()` al remover.
* UUID como PK en entidades y BIGINT identity en logs, según decisiones arquitectónicas generales del archivo de comprensión.

---

### Casos de uso

* Registrar usuario.
* Crear primer hogar durante onboarding.
* Completar onboarding después de crear/perfilar hogar, invitar miembros y configurar preferencias.
* Invitar miembro con email o phone, rol sugerido, mensaje, token y expiración.
* Aceptar invitación vía token.
* Crear membresía/miembro activo tras aceptar invitación.
* Cambiar rol de miembro por coordinador.

---

### Casos especiales

* Registro offline: no se puede realizar.
* Creación de hogar offline: solo online.
* Finalización de onboarding offline: se encola.
* Invitación offline: se encola y se envía al sincronizar.
* Expiración de invitación: la procesa CRON server-side cuando `expires_at < now()` y `status = 'pending'`.
* Miembros sin cuenta: permitidos por `household_members.user_id nullable`.

---

### Edge cases

* Invitación expirada.
* Invitación cancelada por coordinador.
* Miembro creado directamente por coordinador, además del caso post-aceptación.
* Miembro removido con `status = 'finalized'` y `left_at = now()`.
* Cambio de rol con registro de `old_role` y `new_role`.

---

### Datos mockeados

* No se encontró información mockeada aplicable a AUTH + ONBOARDING.

---

### Funcionalidades REAL

* Register como evento `user.registered`.
* Crear primer hogar como evento `household.created`.
* Completar onboarding como evento `user.onboarding_completed`.
* Invitar miembros como evento `member.invited`.
* Aceptar invitación como evento `invitation.accepted`.
* Crear `household_members` al aceptar invitación.
* Activar miembro mediante `member.joined` con `status = 'active'`.
* Usar `suggested_role` en invitación.
* Usar `role` en aceptación, alta de miembro y cambio de rol.
* Vincular `auth.users` con `household_members.user_id`.
* Aplicar separación Persona ≠ Usuario.
* Aplicar separación de datos por hogar mediante `household_id` y RLS.

---

### Funcionalidades MOCK

* No se encontró información MOCK para AUTH + ONBOARDING.

---

### Funcionalidades POST_MVP

* No se encontró información POST_MVP aplicable a AUTH + ONBOARDING dentro del alcance solicitado.

---

## 2. Clasificación para implementación

### REAL

#### Register

* Implementable desde este documento solo a nivel de evento/conocimiento parcial.
* Evento: `user.registered`.
* Trigger: nuevo usuario crea cuenta en `auth.users`.
* Payload: `{ user_id, email, phone, registered_at }`.
* Offline: no puede registrarse sin conexión.

#### Crear hogar durante registro/onboarding

* Implementable desde este documento como creación del primer hogar.
* Evento: `household.created`.
* Trigger: usuario crea su primer hogar mediante `INSERT INTO households`.
* Payload: `{ household_id, name, slug, timezone, default_language, created_by: user_id }`.
* Offline: solo online.

#### Invitar miembros durante onboarding

* Implementable desde este documento como invitación creada en `invitations`.
* Evento: `member.invited`.
* Actor: Coordinador o adulto con permiso.
* Payload: `{ household_id, invitation_id, invited_by: member_id, email, phone, suggested_role, message, token, expires_at }`.
* Offline: se encola y se envía al sincronizar.

#### Aceptar invitación

* Implementable desde este documento como aceptación por token.
* Evento: `invitation.accepted`.
* Trigger: invitado acepta invitación vía token.
* Cambio: `invitations.status = 'accepted'`.
* Efecto: se crea `household_members`.
* Payload: `{ invitation_id, household_id, member_id, user_id, display_name, role, accepted_at }`.

#### Completar onboarding

* Implementable desde este documento como cierre del flujo.
* Evento: `user.onboarding_completed`.
* Trigger: usuario completa crear/perfilar hogar, invitar miembros y configurar preferencias.
* Payload: `{ user_id, member_id, household_id, steps_completed: [], completed_at }`.
* Offline: se encola.

#### Roles del alcance MVP encontrados parcialmente

* `CoordinatorRole` aparece y tiene permisos administrativos explícitos.
* `AdultRole` aparece y puede invitar; no aprueba ingresos.
* `TeenRole` aparece, pero el prompt MVP espera `Adolescent`; requiere normalización posterior.
* `ChildRole` aparece.
* `SeniorRole` aparece.
* `GuestRole` aparece.

#### Relación usuario/persona/hogar

* `UserAccount` pertenece al usuario, no al hogar.
* `HouseholdMember` modela persona dentro del hogar.
* `household_members.user_id` puede ser nullable.
* `auth.users` se vincula con `household_members` mediante `user_id`.
* `Household` contiene `HouseholdMember`.
* `HouseholdMember` pertenece a `Household`.

#### Seguridad y separación de datos

* `household_id` se usa en tablas de coordinación.
* RLS filtra por `household_id` y `member_id`.
* RLS es última línea de defensa.

---

### MOCK

No se encontró información MOCK para este fragment.

---

### POST_MVP

No se encontró información POST_MVP aplicable a este fragment según el alcance solicitado.

---

### IGNORAR

No se incluye contenido clasificado fuera del alcance de este fragment.

---

## 3. Información faltante

| Tema | Información faltante | Por qué importa | Impacto en implementación |
| ---- | -------------------- | --------------- | ------------------------- |
| Login | No aparece flujo, evento, entidad, endpoint, request, response ni error. | Login es obligatorio para AUTH MVP. | Debe resolverse con otra fuente o quedar pendiente para merge. |
| Refresh Token | No aparece entidad `RefreshToken`, evento, expiración, rotación, endpoint ni payload. | Refresh Token es obligatorio para AUTH MVP. | No puede implementarse desde este documento. |
| Logout | No aparece flujo, evento, invalidación de sesión/token ni endpoint. | Logout es obligatorio para AUTH MVP. | No puede implementarse desde este documento. |
| Session | No aparece entidad `Session` ni estados de sesión. | Necesario para auth runtime. | Pendiente de otra fuente. |
| Register API | Solo existe evento `user.registered`; no hay endpoint ni contrato. | El evento no reemplaza un contrato API. | Request/response deben venir de otra fuente. |
| Errores de registro | No aparecen errores por email duplicado, contraseña inválida, email no verificado, teléfono inválido o falla de Supabase Auth. | Necesario para UX/API. | Pendiente. |
| Crear hogar atómico con registro | El documento separa `user.registered` y `household.created`, pero no define transacción ni rollback. | El MVP exige crear hogar durante registro/onboarding. | Riesgo de estados parciales. |
| Creación de membresía del usuario registrante | `member.joined` aparece, pero no se detalla explícitamente cómo el creador del hogar queda asociado como miembro/coordinador inicial. | Necesario para acceder al hogar creado. | Pendiente de definición. |
| Coordinator inicial | No se define explícitamente si `created_by` queda como `CoordinatorRole`. | Necesario para permisos iniciales del hogar. | Pendiente de otra fuente. |
| Onboarding por rol | No hay pasos, pantallas ni reglas diferentes para Coordinator, Adult, Adolescent, Child, Senior o Guest. | El prompt exige onboarding por rol. | Solo puede registrarse como faltante. |
| Rol Adolescent | El archivo de comprensión usa `TeenRole`, no `AdolescentRole`. | El MVP exige `Adolescent`. | Requiere normalización en etapa de merge. |
| `suggested_role` | No se define tipo ni lista cerrada de valores para `suggested_role`. | Afecta validación de invitaciones. | Pendiente. |
| `role` | No se define tipo ni enum técnico en eventos. | Afecta membresía y permisos. | Pendiente. |
| Invitación single-use | Hay `token` y `expires_at`, pero no se indica si el token es single-use. | Seguridad de invitaciones. | Pendiente. |
| Expiración de invitaciones | Existe `expires_at`, pero no se define duración por defecto. | UX y reglas de invitación. | Pendiente. |
| Aceptar invitación con usuario existente/nuevo | No se diferencia si el invitado ya tiene cuenta o debe registrarse. | Afecta flujo de onboarding invitado. | Pendiente. |
| Validación de email/phone en invitación | No aparece validación ni obligatoriedad de email vs phone. | Necesario para crear invitaciones. | Pendiente. |
| UI de AUTH | No hay pantallas ni formularios de Login/Register. | Necesario para frontend. | Pendiente. |
| UI de Onboarding | No hay estructura de pasos, inputs, botones ni estados visuales. | Necesario para frontend. | Pendiente. |
| APIs de onboarding | No hay endpoints para crear hogar, invitar miembro, aceptar invitación o completar onboarding. | Necesario para backend. | Pendiente. |
| Contradicción operativa offline | `user.onboarding_completed` puede encolarse, pero `household.created` es solo online. | Puede dejar pasos de onboarding parcialmente en cola. | Requiere definición posterior. |
| Configuración básica de hogar | `household.settings_changed` menciona `config`, timezone e idioma, pero no define estructura de config ni valores válidos. | Necesario para configuración básica. | Parcial; requiere otra fuente. |
| Permisos de Adult con permiso | `member.invited` dice “adulto con permiso”, pero no define cómo se concede ese permiso. | Afecta autorización de invitaciones. | Pendiente. |
| Auditoría | Se mencionan consumidores AU, pero no se detalla estructura del `audit_log` para estas acciones. | Trazabilidad. | Pendiente. |

---

## 4. Fuente

* Archivo principal: `HomePlus — Eventos del sistema v1.md`
  * Sección: `## Leyenda de Consumidores`
  * Sección: `## Leyenda de Prioridades`
  * Sección: `## Leyenda de Comportamiento Offline`
  * Sección: `## 1. PEOPLE & AUTH`
  * Sección: `### 1.1 member.invited`
  * Sección: `### 1.2 invitation.accepted`
  * Sección: `### 1.3 invitation.expired`
  * Sección: `### 1.4 invitation.cancelled`
  * Sección: `### 1.5 member.joined`
  * Sección: `### 1.6 member.removed`
  * Sección: `### 1.7 member.role_changed`
  * Sección: `### 1.8 user.registered`
  * Sección: `### 1.9 user.onboarding_completed`
  * Sección: `### 1.10 household.created`
  * Sección: `### 1.11 household.settings_changed`

* Archivo de comprensión asociado: `Esquema de base de datos v1.txt`
  * Sección: `OUTPUT 1 — ENTITIES`, bloque `CORE / AUTH`
  * Sección: `OUTPUT 1 — ENTITIES`, bloque `ROLES`
  * Sección: `OUTPUT 2 — RELATIONSHIPS`, bloque `CORE STRUCTURE`
  * Sección: `OUTPUT 4 — DATA FLOWS`, flujo `auth.users` → `household_members`
  * Sección: `OUTPUT 5 — BUSINESS RULES`
  * Sección: `OUTPUT 6 — ARCHITECTURAL DECISIONS`

* Source map usado como guía: `source_map_HomePlus_Eventos_del_sistema_v1.md`
  * Sección: `4.1 AUTH`
  * Sección: `4.2 ONBOARDING`
