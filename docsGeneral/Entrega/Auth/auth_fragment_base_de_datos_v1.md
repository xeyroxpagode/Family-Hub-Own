# AUTH fragment — HomePlus — Esquema de base de datos v1

## 1. Información encontrada

### Objetivo del módulo

* El documento define HomePlus sobre Supabase, incluyendo Supabase Auth, PostgreSQL, Realtime y RLS.
* Auth no aparece como dominio con tabla propia, sino como dependencia de plataforma mediante `auth.users`.
* La cuenta autenticada de Supabase se vincula con la persona del hogar mediante `household_members.user_id`.
* El modelo central es **Persona ≠ Usuario**: una persona del hogar puede existir sin cuenta porque `household_members.user_id` es nullable.
* El registro/login aparece como flujo conceptual desde `auth.users` hacia `household_members` para vincular la cuenta con una membresía del hogar.
* Crear el primer hogar está parcialmente cubierto por la política RLS de `households`: cualquier usuario autenticado puede insertar un hogar.

### Entidades

#### `auth.users`

* Entidad externa de Supabase Auth.
* Aparece en el diagrama relacional conceptual.
* No está definida como tabla propia en el esquema.
* Se relaciona con `household_members` mediante `household_members.user_id`.

#### `households`

Hogares. Unidad máxima de aislamiento de datos.

Campos encontrados:

| Campo | Tipo | Nullable | Default | Notas |
| ----- | ---- | -------- | ------- | ----- |
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `name` | `text` | NO | — | Nombre del hogar |
| `slug` | `text` | NO | — | Slug único para URLs/invitaciones |
| `timezone` | `text` | NO | `'America/Argentina/Buenos_Aires'` | IANA timezone |
| `default_language` | `text` | NO | `'es-419'` | Idioma por defecto |
| `config` | `jsonb` | NO | `'{}'` | Configuración del hogar |
| `created_at` | `timestamptz` | NO | `now()` | — |
| `updated_at` | `timestamptz` | NO | `now()` | — |

Restricciones encontradas:

* PK: `id`.
* FK: no tiene FK declaradas.
* Índice: `idx_households_slug` UNIQUE sobre `slug`.
* RLS:
  * SELECT: miembros del hogar vía `household_members`.
  * INSERT: cualquier usuario autenticado.
  * UPDATE: solo Coordinador del hogar.
  * DELETE: prohibido para miembros; solo sistema `service_role` durante cierre de cuenta cuando es el último miembro.

#### `household_members`

Modelo Persona ≠ Usuario. Una persona puede existir sin cuenta.

Campos encontrados:

| Campo | Tipo | Nullable | Default | Notas |
| ----- | ---- | -------- | ------- | ----- |
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `household_id` | `uuid` | NO | — | FK → `households.id` |
| `user_id` | `uuid` | SÍ | `NULL` | FK → `auth.users.id`. `NULL` = miembro sin cuenta |
| `first_name` | `text` | NO | — | Nombre de pila |
| `last_name` | `text` | SÍ | `NULL` | Apellido |
| `display_name` | `text` | NO | — | Nombre visible en el hogar |
| `date_of_birth` | `date` | SÍ | `NULL` | Fecha de nacimiento |
| `gender` | `text` | SÍ | `NULL` | Opcional |
| `role` | `text` | NO | `'adult'` | `'coordinator'`, `'adult'`, `'teen'`, `'child'`, `'senior'`, `'guest'`, `'family_employee'` |
| `avatar_url` | `text` | SÍ | `NULL` | URL a foto de perfil |
| `status` | `text` | NO | `'pending'` | `'pending'`, `'active'`, `'suspended'`, `'finalized'` |
| `joined_at` | `timestamptz` | NO | `now()` | — |
| `left_at` | `timestamptz` | SÍ | `NULL` | Fecha de salida del hogar |
| `created_at` | `timestamptz` | NO | `now()` | — |
| `updated_at` | `timestamptz` | NO | `now()` | — |

Restricciones encontradas:

* PK: `id`.
* FK: `household_id` → `households.id` ON DELETE CASCADE.
* FK: `user_id` → `auth.users.id` ON DELETE SET NULL.
* Índices:
  * `idx_hm_household` sobre `household_id`.
  * `idx_hm_user` sobre `user_id`.
  * `idx_hm_household_user` UNIQUE sobre `(household_id, user_id)` WHERE `user_id IS NOT NULL`.
  * `idx_hm_status` sobre `status`.
* RLS:
  * SELECT: miembros del mismo `household_id`.
  * INSERT: solo Coordinador del household.
  * UPDATE: propio miembro para datos personales o Coordinador para `role` y `status`.
  * DELETE: solo Coordinador mediante soft-delete lógico: `status='finalized'`, `left_at=now()`.

#### `invitations`

Invitaciones pendientes para unirse a un hogar.

Campos encontrados:

| Campo | Tipo | Nullable | Default | Notas |
| ----- | ---- | -------- | ------- | ----- |
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `household_id` | `uuid` | NO | — | FK → `households.id` |
| `invited_by` | `uuid` | NO | — | FK → `household_members.id` |
| `email` | `text` | SÍ | `NULL` | Email del invitado |
| `phone` | `text` | SÍ | `NULL` | Teléfono del invitado |
| `token` | `text` | NO | — | Token único de invitación |
| `suggested_role` | `text` | NO | `'adult'` | Rol sugerido |
| `message` | `text` | SÍ | `NULL` | Mensaje personalizado |
| `status` | `text` | NO | `'pending'` | `'pending'`, `'accepted'`, `'expired'`, `'cancelled'` |
| `expires_at` | `timestamptz` | NO | `now() + interval '7 days'` | Expiración |
| `accepted_at` | `timestamptz` | SÍ | `NULL` | Fecha de aceptación |
| `created_at` | `timestamptz` | NO | `now()` | — |

Restricciones encontradas:

* PK: `id`.
* FK: `household_id` → `households.id`.
* FK: `invited_by` → `household_members.id`.
* Índices:
  * `idx_inv_household` sobre `household_id`.
  * `idx_inv_token` UNIQUE sobre `token`.
  * `idx_inv_email` sobre `email`.
  * `idx_inv_status` sobre `status`.
* RLS:
  * SELECT: miembros del `household_id`.
  * INSERT: solo Coordinador del household.
  * UPDATE: miembros del household para cancelar o invitado para aceptar vía token.
  * DELETE: solo Coordinador.

#### `audit_logs`

Registro inmutable de acciones. Relevante para Auth/Onboarding solo por acciones de invitación, ingreso y salida.

Campos relevantes encontrados:

| Campo | Tipo | Nullable | Default | Notas |
| ----- | ---- | -------- | ------- | ----- |
| `id` | `bigint` | NO | `identity` | PK autoincremental |
| `household_id` | `uuid` | NO | — | FK → `households.id` |
| `actor_id` | `uuid` | SÍ | `NULL` | FK → `household_members.id` |
| `action` | `text` | NO | — | `'create'`, `'update'`, `'delete'`, `'export'`, `'invite'`, `'join'`, `'leave'`, `'annul'` |
| `entity_type` | `text` | NO | — | Tabla afectada |
| `entity_id` | `uuid` | SÍ | `NULL` | ID de la entidad afectada |
| `old_values` | `jsonb` | SÍ | `NULL` | Valores antes del cambio |
| `new_values` | `jsonb` | SÍ | `NULL` | Valores después del cambio |
| `origin` | `text` | NO | — | `'app'`, `'web'`, `'api'`, `'system'` |
| `ip_address` | `inet` | SÍ | `NULL` | IP del actor |
| `created_at` | `timestamptz` | NO | `now()` | — |

Restricciones encontradas:

* Tabla append-only.
* SELECT: ningún miembro del hogar directamente; solo sistema/service_role.
* INSERT: triggers internos/service_role.
* UPDATE: prohibido.
* DELETE: prohibido.

### Roles encontrados

Valores de `household_members.role` en el documento:

| Valor en documento | Rol MVP relacionado | Clasificación |
| ------------------ | ------------------- | ------------- |
| `coordinator` | Coordinator | REAL |
| `adult` | Adult | REAL |
| `teen` | Adolescent | REAL con riesgo de naming |
| `child` | Child | REAL |
| `senior` | Senior | REAL |
| `guest` | Guest | REAL |
| `family_employee` | No incluido en roles MVP solicitados | POST_MVP / fuera del fragment MVP |

Información explícita adicional desde el archivo de comprensión asociado:

* CoordinatorRole: responsable administrativo; aprueba ingresos, cambia roles, expulsa miembros y no puede eliminar hogares.
* AdultRole: miembro operativo; invita, crea/reasigna tareas y crea eventos; no aprueba ingresos.
* TeenRole: autonomía progresiva; crea eventos familiares, gastos y administra tareas propias.
* ChildRole: experiencia simplificada; no administra información crítica.
* SeniorRole: experiencia adaptada; mismos permisos que Adulto salvo configuraciones específicas.
* GuestRole: acceso mínimo; participación limitada.

### Relaciones

Relaciones explícitas encontradas:

| Entidad origen | Relación | Entidad destino | Notas |
| -------------- | -------- | --------------- | ----- |
| `auth.users` | se vincula con | `household_members` | Mediante `household_members.user_id` |
| `households` | 1 a N | `household_members` | Relación clave del documento |
| `household_members` | N a 1 | `auth.users` | Una membresía puede apuntar a usuario Supabase; `user_id` puede ser `NULL` |
| `Household` | contains | `HouseholdMember` | En archivo de comprensión |
| `HouseholdMember` | belongs_to | `Household` | En archivo de comprensión |
| `HouseholdMember` | links_to | `UserAccount` | En archivo de comprensión; `UserAccount` no tiene tabla propia en documento principal |
| `CoordinatorRole` | approves | `Invitation` | En archivo de comprensión |
| `CoordinatorRole` | manages | `Household` | En archivo de comprensión |
| `CoordinatorRole` | changes_role_of | `HouseholdMember` | En archivo de comprensión |
| `CoordinatorRole` | expels | `HouseholdMember` | En archivo de comprensión |
| `HouseholdMember` | has_role | Roles encontrados | En archivo de comprensión |

### Cardinalidad

* `households 1──N household_members N──1 auth.users`.
* `households 1──N [todas las tablas de coordinación con household_id]`.
* `invitations.household_id` apunta a un hogar.
* `invitations.invited_by` apunta al miembro que invita.

### Estados posibles

#### Membership / `household_members.status`

* `pending`
* `active`
* `suspended`
* `finalized`

#### Invitation / `invitations.status`

* `pending`
* `accepted`
* `expired`
* `cancelled`

No se encontraron estados de sesión, access token, refresh token o logout.

### Reglas de negocio

* Un hogar es la unidad máxima de aislamiento de datos.
* Una persona puede existir sin cuenta porque `household_members.user_id` permite `NULL`.
* El usuario autenticado puede crear un hogar mediante INSERT en `households`.
* Los miembros de un hogar pueden ver miembros del mismo `household_id`.
* Solo el Coordinador puede insertar miembros del hogar según RLS de `household_members`.
* El propio miembro puede actualizar sus datos personales.
* El Coordinador puede actualizar `role` y `status` de miembros.
* El Coordinador puede finalizar miembros mediante soft-delete lógico: `status='finalized'`, `left_at=now()`.
* El token de invitación es único.
* Las invitaciones expiran por defecto a los 7 días.
* La invitación puede aceptarse vía token según la política RLS de UPDATE.
* El Coordinador no puede eliminar hogares; solo el sistema puede hacerlo durante el cierre de cuenta del último miembro.
* La membresía de un hogar tiene estados `pending`, `active`, `suspended`, `finalized`.
* El Adulto Mayor tiene permisos equivalentes a Adulto salvo configuraciones específicas de experiencia.

### Permisos

#### Crear hogar durante registro

* `households.INSERT`: cualquier usuario autenticado.

#### Gestionar hogar

* `households.SELECT`: miembros del hogar vía `household_members`.
* `households.UPDATE`: solo Coordinador.
* `households.DELETE`: prohibido para miembros; solo sistema/service_role en cierre de cuenta del último miembro.

#### Gestión de miembros

* `household_members.SELECT`: miembros del mismo `household_id`.
* `household_members.INSERT`: solo Coordinador.
* `household_members.UPDATE`: propio miembro para datos personales o Coordinador para `role` y `status`.
* `household_members.DELETE`: solo Coordinador con soft-delete lógico.

#### Invitaciones

* `invitations.SELECT`: miembros del hogar.
* `invitations.INSERT`: solo Coordinador.
* `invitations.UPDATE`: miembros del hogar para cancelar o invitado para aceptar vía token.
* `invitations.DELETE`: solo Coordinador.

### Flujos

#### Register

Información encontrada:

* El documento usa Supabase Auth como plataforma.
* El archivo de comprensión asociado registra el flujo conceptual: `auth.users` con data `Registro/Login` hacia `household_members` para vincular `user_id`.
* `households.INSERT` permite que cualquier usuario autenticado cree un hogar.

Información no encontrada dentro del flujo:

* Pasos de registro.
* Request.
* Response.
* Validaciones.
* Errores.
* Creación explícita del primer `household_member`.
* Asignación explícita del rol `coordinator` al primer miembro.
* Transacción registro → hogar → miembro.

#### Login

Información encontrada:

* El archivo de comprensión asociado menciona `Registro/Login` como data flow desde `auth.users` hacia `household_members`.

Información no encontrada dentro del flujo:

* Pasos de login.
* Request.
* Response.
* Manejo de sesión.
* Errores.
* UI.

#### Refresh Token

* No se encontró información implementable sobre refresh token.
* No se encontraron entidades `Session`, `RefreshToken`, `AccessToken` ni campos equivalentes.
* No se encontró endpoint, request, response ni política de expiración de tokens Auth.

#### Logout

* No se encontró información implementable sobre logout.
* No se encontró endpoint, request, response, invalidación de sesión ni evento técnico de logout.

#### Crear hogar durante registro

Información encontrada:

* `households` puede insertarse por cualquier usuario autenticado.
* Los campos para crear un hogar son `name`, `slug`, `timezone`, `default_language` y `config`, además de campos automáticos.
* `timezone` tiene default `'America/Argentina/Buenos_Aires'`.
* `default_language` tiene default `'es-419'`.
* `config` tiene default `'{}'`.

Información no encontrada dentro del flujo:

* No se define el payload de creación.
* No se define si `slug` se genera automáticamente o lo envía el usuario.
* No se define cómo se crea el primer miembro del hogar.
* No se define cómo se asigna el rol Coordinator al usuario que creó el hogar.

#### Invitar miembros durante onboarding

Información encontrada:

* `invitations` modela invitaciones pendientes para unirse a un hogar.
* La invitación pertenece a un `household_id`.
* La invitación registra `invited_by` como `household_members.id`.
* La invitación puede tener `email`, `phone`, `token`, `suggested_role`, `message`, `status`, `expires_at`, `accepted_at`, `created_at`.
* `suggested_role` tiene default `'adult'`.
* `status` tiene default `'pending'`.
* `expires_at` tiene default `now() + interval '7 days'`.
* `token` tiene índice UNIQUE.
* Crear invitación por RLS: solo Coordinador.

Información no encontrada dentro del flujo:

* No se define endpoint.
* No se define request/response.
* No se define si `email` o `phone` son obligatorios; ambos son nullable.
* No se define cómo se entrega el token al invitado.
* No se define si el token es single-use más allá de ser único.

#### Aceptar invitación

Información encontrada:

* La política RLS de `invitations.UPDATE` permite que el invitado acepte vía token.
* `invitations.status` incluye `accepted`.
* `invitations.accepted_at` registra fecha de aceptación.

Información no encontrada dentro del flujo:

* No se define endpoint.
* No se define request/response.
* No se define validación de expiración.
* No se define cambio automático de `household_members.status` a `active`.
* No se define creación automática de `household_member` al aceptar.
* No se define vinculación entre usuario autenticado y miembro existente al aceptar.

#### Onboarding por rol

Información encontrada:

* El rol vive en `household_members.role`.
* Valores de rol encontrados: `coordinator`, `adult`, `teen`, `child`, `senior`, `guest`, `family_employee`.
* El documento principal no define pantallas ni pasos de onboarding por rol.
* El archivo de comprensión asociado describe permisos/rasgos conceptuales por rol.

Información no encontrada dentro del flujo:

* No se define UI de onboarding por rol.
* No se define qué preguntas o pasos corresponden a cada rol.
* No se define configuración diferencial por rol durante el onboarding.
* No se define validación exacta de `suggested_role`.

### APIs

No se encontraron endpoints definidos para Auth u Onboarding.

Acciones mencionadas sin contrato API:

| Acción | Estado en documento |
| ------ | ------------------- |
| Register | Mencionado sin detalle por data flow `Registro/Login` |
| Login | Mencionado sin detalle por data flow `Registro/Login` |
| Refresh Token | No encontrado |
| Logout | No encontrado |
| Crear hogar | Acción soportada por RLS/tabla, sin endpoint |
| Crear invitación | Acción soportada por RLS/tabla, sin endpoint |
| Aceptar invitación | Acción mencionada por RLS vía token, sin endpoint |
| Cancelar invitación | Acción mencionada por RLS UPDATE, sin endpoint |
| Actualizar miembro/rol/status | Acción soportada por RLS/tabla, sin endpoint |

No se encontraron:

* Método HTTP.
* Ruta.
* Request.
* Response.
* Errores.
* Códigos de estado.

### UI

No se encontró UI implementable para Auth/Onboarding.

No se encontraron:

* Pantalla Login.
* Pantalla Register.
* Pantalla Forgot Password.
* Pantalla Refresh Token.
* Pantalla Logout.
* Pantalla Create Household.
* Pantalla Invite Member.
* Pantalla Accept Invitation.
* Pantalla de onboarding por rol.

El archivo de comprensión asociado menciona pantallas `PeopleList` y `PersonProfile`, pero no define estructura de onboarding ni pantallas Auth.

### Componentes UI

No se encontraron componentes UI específicos para Auth/Onboarding.

### Navegación

No se encontró navegación específica para Auth/Onboarding.

El archivo de comprensión asociado menciona navegación global `BottomNavigation`, `QuickActions`, `MoreMenu`, `HomeDashboard` y `MultiHomeSelector`, pero no define navegación del flujo de registro, login u onboarding.

### Eventos del sistema

Eventos conceptuales encontrados, sin nombre técnico:

| Evento conceptual | Cuándo ocurre | Qué produce | Fuente documental |
| ----------------- | ------------- | ----------- | ----------------- |
| Registro/Login | `auth.users` registra o autentica | Vinculación con `household_members.user_id` | Archivo de comprensión `OUTPUT 4 — DATA FLOWS` |
| Hogar creado | INSERT en `households` | Crea hogar; puede generar audit log si aplica trigger | Documento principal `### 1.1 households`, `### 14.1 trigger_audit_log` |
| Invitación creada | INSERT en `invitations` | Invitación `pending` con token | Documento principal `### 1.3 invitations` |
| Invitación aceptada | UPDATE vía token | `status='accepted'`, `accepted_at` | Documento principal `### 1.3 invitations` |
| Member joined | Vinculación/ingreso de miembro | Membership vinculada/activa | Archivo de comprensión y estados de `household_members` |

No se encontraron nombres técnicos como:

* `auth.registered`
* `auth.logged_in`
* `auth.logged_out`
* `auth.token_refreshed`
* `household.created`
* `member.joined`
* `invitation.created`
* `invitation.accepted`

### Dependencias

* Supabase Auth.
* `auth.users`.
* `households`.
* `household_members`.
* `invitations`.
* RLS.
* `auth.uid()`.
* `audit_logs`, solo como auditoría transversal.

### Restricciones arquitectónicas

* Persona ≠ Usuario: `user_id` nullable en `household_members`.
* `household_id` en todas las tablas de coordinación.
* RLS como última línea de defensa.
* Las políticas RLS usan como patrón base `household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())`.
* Para datos personales o asignados, las políticas pueden usar `household_members.id` asociado a `auth.uid()`.
* Cada query se filtra por el hogar del miembro autenticado.
* `audit_logs` es append-only y no visible directamente para miembros del hogar.
* El borrado de miembros se modela como finalización lógica (`status='finalized'`, `left_at=now()`).
* El borrado de hogares está prohibido para miembros.

### Casos de uso encontrados

* Usuario autenticado crea su primer hogar.
* Coordinador actualiza configuración básica del hogar.
* Coordinador crea miembros del hogar.
* Coordinador cambia rol o estado de miembros.
* Miembro actualiza sus propios datos personales.
* Coordinador crea invitaciones.
* Invitado acepta invitación vía token.
* Coordinador elimina/finaliza miembros.

### Casos especiales / Edge cases

* Miembro sin cuenta: `household_members.user_id = NULL`.
* Un mismo `user_id` no puede repetirse dentro del mismo hogar por índice único parcial.
* Invitación puede tener `email = NULL`.
* Invitación puede tener `phone = NULL`.
* No se define si una invitación debe tener email, teléfono o ambos.
* Token de invitación único.
* Invitación expira a los 7 días por default.
* `household_members.role` incluye `family_employee`, que no forma parte de los roles MVP solicitados en este fragment.
* El documento usa `teen`, mientras el alcance solicitado usa Adolescent.
* `households.INSERT` permite crear hogar por usuario autenticado, pero `household_members.INSERT` solo permite Coordinador; esto deja incompleto el caso de creación del primer miembro.

### Datos mockeados

No se encontró información mockeada para Auth/Onboarding.

### Funcionalidades REAL encontradas

* Vinculación `auth.users` ↔ `household_members.user_id`.
* Crear hogar por usuario autenticado.
* Configuración básica del hogar mediante campos de `households`.
* Gestión básica de miembros mediante `household_members`.
* Roles en `household_members.role`.
* Estados de membresía.
* Invitaciones con token.
* Rol sugerido en invitación.
* Expiración de invitación.
* Aceptación de invitación vía token.
* RLS por household.
* Actualización de datos propios del miembro.
* Gestión de roles/status por Coordinador.

### Funcionalidades MOCK encontradas

No se encontró información MOCK para Auth/Onboarding.

### Funcionalidades POST_MVP encontradas

* `family_employee` aparece como valor de rol y como rol conceptual en el archivo de comprensión asociado, pero no forma parte de los roles MVP solicitados para este fragment.

## 2. Clasificación para implementación

### REAL

Información que debe implementarse en MVP v1.0 según lo explícitamente encontrado:

* Usar Supabase Auth como fuente externa de usuarios mediante `auth.users`.
* Vincular usuario autenticado con persona/membresía por `household_members.user_id`.
* Permitir personas sin cuenta usando `user_id = NULL`.
* Crear hogar con tabla `households`.
* Permitir INSERT en `households` para cualquier usuario autenticado.
* Gestionar configuración básica del hogar con:
  * `name`
  * `slug`
  * `timezone`
  * `default_language`
  * `config`
* Usar `timezone` default `'America/Argentina/Buenos_Aires'`.
* Usar `default_language` default `'es-419'`.
* Usar `config` default `'{}'`.
* Modelar miembros con `household_members`.
* Modelar membresía con estados:
  * `pending`
  * `active`
  * `suspended`
  * `finalized`
* Modelar roles con valores encontrados:
  * `coordinator`
  * `adult`
  * `teen`
  * `child`
  * `senior`
  * `guest`
* Tratar `teen` como riesgo de naming frente al rol MVP Adolescent.
* Gestionar miembros según RLS:
  * SELECT por miembros del mismo hogar.
  * INSERT solo Coordinador.
  * UPDATE datos propios por el miembro.
  * UPDATE `role`/`status` por Coordinador.
  * DELETE/finalización por Coordinador.
* Modelar invitaciones con `invitations`.
* Crear invitación con:
  * `household_id`
  * `invited_by`
  * `email`
  * `phone`
  * `token`
  * `suggested_role`
  * `message`
  * `status`
  * `expires_at`
  * `accepted_at`
* Usar estados de invitación:
  * `pending`
  * `accepted`
  * `expired`
  * `cancelled`
* Usar `suggested_role` default `'adult'`.
* Usar `status` default `'pending'`.
* Usar `expires_at` default `now() + interval '7 days'`.
* Hacer `token` único.
* Permitir aceptar invitación vía token según RLS.
* Aplicar RLS con `auth.uid()` y `household_members`.
* Separar datos por `household_id`.
* Registrar auditoría como append-only cuando aplique, sin acceso directo de miembros.

### MOCK

No se encontró información que deba simularse como MOCK para Auth/Onboarding.

### POST_MVP

* `family_employee` / FamilyEmployeeRole aparece como rol adicional, pero no pertenece a los roles MVP solicitados para este fragment.
* No se debe convertir `family_employee` en rol MVP dentro de este fragment.

### IGNORAR

No se extrajo información para esta clasificación dentro de Auth/Onboarding.

## 3. Información faltante

### Contradicciones o tensiones detectadas

* El alcance MVP solicitado usa el rol **Adolescent**, pero el documento define el valor técnico `teen` en `household_members.role`.
* El documento principal dice que `invitations.INSERT` es solo Coordinador, pero el archivo de comprensión asociado describe AdultRole como rol que invita. Requiere validación posterior.
* `households.INSERT` permite que cualquier usuario autenticado cree su primer hogar, pero `household_members.INSERT` es solo Coordinador; no se define cómo se crea el primer miembro Coordinador cuando todavía no existe Coordinador.
* La aceptación de invitación está mencionada vía token en RLS, pero no se define si aceptar crea un nuevo `household_member`, actualiza uno existente o vincula `user_id` a una persona pendiente.
* El campo `suggested_role` existe, pero no se define lista explícita de valores válidos para ese campo ni si coincide exactamente con `household_members.role`.

### Reglas implícitas no definidas

* Registro → creación de hogar → creación de miembro inicial.
* Registro → asignación automática de rol Coordinator.
* Login → selección de hogar activo.
* Aceptar invitación → cambio de status de invitación.
* Aceptar invitación → activación de membresía.
* Aceptar invitación → vinculación con `auth.users`.
* Cancelar invitación → cambio de status a `cancelled`.
* Expirar invitación → cambio de status a `expired`.
* Uso único de token de invitación.
* Reglas de validación para email/teléfono.
* Reglas de normalización de `teen` a Adolescent.

### Dependencias no definidas

* No se define servicio/endpoint que coordine Supabase Auth con creación de hogar y miembro.
* No se define capa API para Auth/Onboarding.
* No se define edge function, trigger o transacción para crear el primer household y su primer member.
* No se define mecanismo de envío de invitaciones por email o teléfono.
* No se define mecanismo de expiración automática de invitaciones.

### Información ausente

#### Register

* Request.
* Response.
* Endpoint.
* Validaciones.
* Errores.
* Password/email/provider.
* Confirmación de email.
* Creación de perfil inicial.
* Creación de `household_member` inicial.
* Asignación de rol Coordinator.
* Atomicidad de creación.

#### Login

* Request.
* Response.
* Endpoint.
* Errores.
* Sesión.
* Selección de hogar.
* Recuperación de membresías del usuario.
* UI.

#### Refresh Token

* Entidad `RefreshToken`.
* Tabla de sesión.
* Campos de token.
* Expiración.
* Rotación.
* Endpoint.
* Request.
* Response.
* Errores.

#### Logout

* Endpoint.
* Request.
* Response.
* Invalidación de sesión/token.
* Evento técnico.
* UI.

#### Crear hogar durante registro

* Payload exacto.
* Response.
* Validación de `slug`.
* Generación de `slug`.
* Validación de `timezone`.
* Validación de `default_language`.
* Creación del primer miembro.
* Relación con `auth.uid()` en el momento de la creación.

#### Invitar miembros durante onboarding

* Endpoint.
* Request.
* Response.
* Envío real de invitación.
* Requerimiento mínimo de email o teléfono.
* Formato de token.
* Reglas de seguridad del token.
* Single-use token.
* Errores por expiración/cancelación.

#### Onboarding por rol

* Pasos por rol.
* Pantallas.
* Campos por rol.
* Configuración diferencial por rol.
* Permisos completos por rol.
* Restricciones específicas para Child/Guest/Senior.

### Campos mencionados sin tipo

* No se encontraron campos Auth propios como `password`, `email`, `provider`, `email_verified`, `access_token`, `refresh_token`, `session_id`.
* `UserAccount` aparece como entidad conceptual en archivo asociado, pero no tiene tabla/campos definidos en el documento principal.

### Endpoints mencionados sin request/response

* Register.
* Login.
* Crear hogar.
* Crear invitación.
* Aceptar invitación.
* Cancelar invitación.
* Actualizar miembro.
* Cambiar rol/status.

### Permisos mencionados sin detalle

* Permisos completos de Adult para invitar: aparece en archivo asociado, pero no coincide completamente con RLS del documento principal.
* Permisos de Guest en onboarding.
* Permisos de Child en onboarding.
* Permisos de Senior específicos, más allá de equivalencia general con Adult.
* Permisos del invitado externo al aceptar token.

### UI mencionada sin estructura

* No se encontró UI de Auth.
* No se encontró UI de Onboarding.
* `PeopleList` y `PersonProfile` aparecen como pantallas asociadas a People, pero no definen el flujo Auth/Onboarding.

## 4. Fuente

* Archivo principal: `HomePlus — Esquema de base de datos v1(1).md`
  * `# Producto: HomePlus — Sistema Operativo del Hogar`
  * `## 0. Diagrama Relacional Conceptual`
  * `### Relaciones clave`
  * `## 1. DOMINIO: Auth y Personas`
  * `### 1.1 households`
  * `### 1.2 household_members`
  * `### 1.3 invitations`
  * `### 1.4 audit_logs`
  * `### 14.1 trigger_audit_log`
  * `15.1 Decisiones Arquitectónicas`
  * `15.3 Convenciones de Nomenclatura`
  * `15.4 Principios de RLS`
* Archivo de comprensión asociado: `Esquema de base de datos v1(2).txt`
  * `OUTPUT 1 — ENTITIES`
  * `OUTPUT 2 — RELATIONSHIPS`
  * `OUTPUT 4 — DATA FLOWS`
  * `OUTPUT 5 — BUSINESS RULES`
  * `OUTPUT 6 — ARCHITECTURAL DECISIONS`
* Source map usado: `source_map_HomePlus_Esquema_de_base_de_datos_v1.md`
  * `# 4.1 AUTH`
  * `# 4.2 ONBOARDING`
  * `## 7. Mapa de estados`
  * `## 8. Mapa de permisos`
  * `## 9. Mapa de flujos`
  * `## 10. Mapa de APIs`
  * `## 11. Mapa de UI`
  * `## 12. Mapa de eventos del sistema`
  * `## 13. Restricciones arquitectónicas detectadas`
  * `## 18. Información faltante`
