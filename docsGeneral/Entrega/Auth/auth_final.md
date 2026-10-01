# AUTH + ONBOARDING — Implementation Spec

## 1. Objetivo

AUTH + ONBOARDING es el módulo de entrada a HomePlus.

El módulo resuelve:

* registrar una persona con cuenta autenticable;
* autenticar una cuenta existente;
* manejar sesión mediante Supabase Auth;
* refrescar o cerrar sesión;
* crear o vincular la entidad `people` de HomePlus;
* determinar qué hogar está visualizando el usuario;
* crear el primer hogar después del registro;
* crear la membresía inicial del creador con rol `coordinator`;
* generar links de invitación reutilizables y temporales;
* permitir que una persona solicite ingreso a un hogar mediante link;
* permitir que el Coordinator apruebe o rechace solicitudes de ingreso;
* asociar persona, hogar, membership y rol;
* guiar el primer uso de la app mediante onboarding de producto;
* evitar repetir onboarding cuando una persona ya lo completó en otro dispositivo.

El MVP incluye autenticación real con email/password, Google OAuth y Apple OAuth mediante Supabase Auth. También incluye recuperación de contraseña delegada a Supabase, refresh/logout como wrappers sobre Supabase, creación atómica de hogar, memberships, rol `coordinator`, links de invitación, aprobación de ingresos, separación por household y navegación inicial basada en `GET /api/auth/me`.

El MVP no crea el hogar durante `POST /api/auth/register`. El registro crea la identidad autenticable y la persona de HomePlus. Después del registro o login, la persona puede crear un hogar o solicitar ingreso a uno existente mediante link.

Queda fuera del MVP todo lo que no sea estrictamente necesario para autenticar, crear o unirse a un hogar, aprobar ingreso o completar onboarding inicial. No se desarrolla Planner, Tasks, Calendar, Feed, SOS, Inventory, HomeCloud, Geni avanzado, Presence, Finanzas, Offline Sync, Goals, Milestones, Streaks, Templates, Comentarios ni Adjuntos.

---

## 2. Alcance MVP

### REAL

Debe implementarse:

* Register con email/password.
* Login con email/password.
* Google OAuth mediante Supabase Auth.
* Apple OAuth mediante Supabase Auth.
* Recuperación de contraseña delegada a Supabase Auth.
* Refresh Token delegado a Supabase Auth.
* Logout delegado a Supabase Auth.
* Sesión autenticada con Supabase Auth.
* Access token / refresh token / expiración gestionados por Supabase.
* Usuario autenticado asociado a `auth.users`.
* Persona de HomePlus asociada a `people`.
* Usuario/persona no autenticado limitado a pantallas y endpoints públicos.
* `GET /api/auth/me` como fuente de verdad para navegación inicial.
* Registro que crea `auth.users`, `people` y sesión de Supabase, sin crear hogar.
* Creación atómica de hogar mediante `POST /api/households`.
* Creación de membership inicial del creador con rol `coordinator`.
* Asignación automática de `people.active_household_id` al crear el primer hogar o al seleccionar un hogar.
* Multi-hogar preparado mediante `people` + `household_members`.
* Links de invitación reutilizables y temporales.
* Uso de link de invitación para solicitar ingreso a un hogar.
* Creación de `household_members` con `status = pending` al usar un link válido.
* Aprobación de ingreso por Coordinator.
* Rechazo de ingreso por Coordinator.
* Asignación de rol real por Coordinator.
* Separación de datos por `household_id`.
* RLS por household/membership.
* Roles MVP técnicos:
  * `coordinator`.
  * `adult`.
  * `adolescent`.
  * `child`.
  * `senior`.
  * `guest`.
* Onboarding inicial de app.
* Estado global de onboarding en `people`.
* Estado específico de onboarding por hogar/membership si aplica.
* Pantalla de espera para usuario con membership `pending`.
* Eventos del sistema relacionados con registro, login, logout, refresh, creación de hogar, link de invitación, solicitud de ingreso, aprobación/rechazo y onboarding.

### MOCK

Puede simularse únicamente si la implementación real del módulo destino no existe aún:

* Contenido educativo del onboarding de app.
* Mensajes introductorios de valor inicial.
* Ejemplos visuales del flujo Child.
* Sugerencias iniciales de “primer valor visible” como contenido fijo, sin IA real.
* Briefing o mensaje de bienvenida post-onboarding si aparece en Home, sin Geni real.

No hay MOCK para register, login, social login, recovery, refresh, logout, creación de hogar, links de invitación, memberships, aprobación de ingresos ni roles.

### POST_MVP

Existe en fragments o decisiones anteriores, pero no debe implementarse en este MVP de AUTH + ONBOARDING:

* `family_employee` / Empleado Familiar.
* Magic link.
* 2FA.
* Biometría.
* Selector avanzado de cuenta.
* Cerrar todas las sesiones.
* Gestión avanzada de múltiples hogares.
* Permisos delegables para que Adult cree links o apruebe ingresos.
* CRUD completo de miembros.
* Configuración avanzada del hogar.
* Eliminación/cierre de cuenta y período de gracia de 30 días.
* Exportación de datos.
* Geni real o aprendizaje del hogar.
* Configuración avanzada de permisos.
* Invitaciones individuales single-use por email como flujo principal.
* Códigos manuales tipo `FAM-8K2P`; el MVP usa link, no join code tipeable.

### IGNORAR

No desarrollar dentro de este archivo:

* Planner.
* Tasks.
* Events.
* Calendar.
* Home Dashboard salvo redirección post-auth/post-onboarding.
* Feed.
* SOS.
* Inventory.
* Assets.
* HomeCloud.
* Geni IA avanzada.
* Automations.
* Presence GPS.
* Finanzas.
* Offline Sync.
* Goals.
* Milestones.
* Streaks.
* Templates.
* Comentarios.
* Adjuntos.

---

## 3. Modelo de dominio

### `auth.users`

Entidad externa de Supabase Auth.

Responsabilidad:

* email;
* password;
* provider;
* sesión;
* access token;
* refresh token;
* autenticación;
* recuperación de contraseña;
* Google OAuth;
* Apple OAuth.

Uso en este módulo:

* Se crea durante `POST /api/auth/register`.
* Se crea o identifica durante login social.
* Es origen del usuario autenticado.
* Se vincula con HomePlus mediante `people.auth_user_id`.
* No contiene lógica de hogar.
* No se usa como FK directa desde `household_members`.

Campos técnicos propios de Supabase Auth no se redefinen en HomePlus:

* password hash;
* provider identities;
* session id;
* refresh token storage;
* email verification internal state;
* OAuth provider metadata.

Restricciones:

* HomePlus no implementa tabla propia `sessions`.
* HomePlus no implementa tabla propia `refresh_tokens`.
* HomePlus no duplica password hashes.

---

### `people`

Entidad de persona/perfil de HomePlus.

Representa a una persona humana dentro de HomePlus. No es una cuenta de autenticación; la cuenta autenticable es `auth.users`.

Responsabilidad:

* identidad visible de la persona;
* datos personales globales;
* preferencias básicas;
* idioma;
* estado de onboarding global;
* hogar actualmente seleccionado/visualizado;
* vínculo opcional con `auth.users`.

Campos definitivos MVP:

| Campo | Tipo sugerido | Nullable | Default | Nota |
|---|---:|---:|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `auth_user_id` | `uuid` | SÍ | `NULL` | FK → `auth.users.id`, UNIQUE WHERE NOT NULL |
| `display_name` | `text` | NO | — | Nombre visible global |
| `first_name` | `text` | SÍ | `NULL` | Nombre de pila |
| `last_name` | `text` | SÍ | `NULL` | Apellido |
| `avatar_url` | `text` | SÍ | `NULL` | Foto de perfil |
| `phone` | `text` | SÍ | `NULL` | Teléfono opcional |
| `date_of_birth` | `date` | SÍ | `NULL` | Fecha de nacimiento opcional |
| `gender` | `text` | SÍ | `NULL` | Opcional |
| `default_language` | `text` | NO | `'es-419'` | Idioma preferido |
| `personal_settings` | `jsonb` | NO | `'{}'` | Preferencias personales básicas |
| `active_household_id` | `uuid` | SÍ | `NULL` | Hogar actualmente seleccionado/visualizado |
| `app_onboarding_status` | `text` | NO | `'not_started'` | `not_started`, `in_progress`, `completed` |
| `app_onboarding_completed_at` | `timestamptz` | SÍ | `NULL` | Fecha de onboarding global completo |
| `created_at` | `timestamptz` | NO | `now()` | Automático |
| `updated_at` | `timestamptz` | NO | `now()` | Automático |

Restricciones:

* `people.auth_user_id` es nullable y único cuando no es null.
* Una persona puede existir sin cuenta autenticada.
* Una cuenta autenticada debe vincularse como máximo con una persona principal.
* `people.active_household_id` define qué hogar visualiza/opera actualmente la persona.
* `people.active_household_id` solo puede apuntar a un hogar donde la persona tenga una membership `active`.
* Si la persona tiene una sola membership activa, el sistema puede setear ese hogar como activo automáticamente.
* Si la persona tiene varias memberships activas, puede cambiar el hogar activo desde selector de hogar.

Casos soportados:

* usuario registrado con cuenta propia;
* miembro precargado sin cuenta;
* niño sin login propio;
* adulto mayor cargado por otro miembro;
* invitado que luego crea cuenta;
* persona con múltiples hogares y roles distintos.

---

### `households`

Hogar. Unidad organizativa principal y unidad máxima de aislamiento de datos.

Campos definitivos MVP:

| Campo | Tipo | Nullable | Default | Nota |
|---|---:|---:|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `name` | `text` | NO | — | Nombre del hogar |
| `slug` | `text` | NO | — | Único para URLs internas |
| `timezone` | `text` | NO | `'America/Argentina/Buenos_Aires'` | IANA timezone |
| `default_language` | `text` | NO | `'es-419'` | Idioma por defecto |
| `config` | `jsonb` | NO | `'{}'` | Configuración básica del hogar |
| `created_by_person_id` | `uuid` | NO | — | FK → `people.id` |
| `created_at` | `timestamptz` | NO | `now()` | Automático |
| `updated_at` | `timestamptz` | NO | `now()` | Automático |

Relaciones:

* `households` 1──N `household_members`.
* `households` 1──N `household_invite_links`.
* `households.created_by_person_id` apunta a `people.id`.

Restricciones:

* `slug` debe ser único.
* El hogar no se crea durante register.
* El hogar se crea mediante `POST /api/households`.
* Crear hogar debe ser atómico junto con la membership inicial del creador.
* El primer miembro del hogar debe quedar `active` con rol `coordinator`.
* El creador del hogar debe quedar con `people.active_household_id = households.id`.

RLS esperada:

* SELECT: solo miembros del hogar con membership válida.
* INSERT: usuario autenticado/persona válida, mediante operación controlada.
* UPDATE: solo Coordinator del hogar.
* DELETE: no disponible para usuarios normales; cierre/eliminación queda fuera del MVP.

---

### Membership / `household_members`

Representa la relación entre una persona y un hogar.

No representa identidad global. La identidad global vive en `people`. La autenticación vive en `auth.users`.

Campos definitivos MVP:

| Campo | Tipo | Nullable | Default | Nota |
|---|---:|---:|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `household_id` | `uuid` | NO | — | FK → `households.id` ON DELETE CASCADE |
| `person_id` | `uuid` | NO | — | FK → `people.id` |
| `role` | `text` | SÍ | `NULL` | Null permitido solo si `status='pending'` |
| `status` | `text` | NO | `'pending'` | `pending`, `active`, `suspended`, `finalized` |
| `joined_at` | `timestamptz` | SÍ | `NULL` | Se completa al pasar a `active` |
| `left_at` | `timestamptz` | SÍ | `NULL` | Se completa al finalizar/salir |
| `household_onboarding_status` | `text` | NO | `'not_started'` | `not_started`, `in_progress`, `completed` |
| `household_onboarding_completed_at` | `timestamptz` | SÍ | `NULL` | Opcional si aplica onboarding específico por hogar |
| `created_at` | `timestamptz` | NO | `now()` | Automático |
| `updated_at` | `timestamptz` | NO | `now()` | Automático |

Estados:

| Estado | Significado |
|---|---|
| `pending` | Solicitud de ingreso creada, espera aprobación del Coordinator. |
| `active` | Miembro aprobado, puede acceder al hogar según rol. |
| `suspended` | Acceso bloqueado temporalmente. |
| `finalized` | Membership terminada/salida lógica/soft delete. |

Reglas:

* Una persona puede tener memberships en múltiples hogares.
* Una membership pertenece a un solo hogar.
* Cada membership tiene un único rol activo.
* `role` puede ser `NULL` solo cuando `status = 'pending'`.
* `role` es obligatorio cuando `status = 'active'`.
* `joined_at` se completa al aprobar la solicitud o al crear la membership inicial del creador.
* `left_at` se completa al finalizar la membership.
* Rechazar una solicitud marca la membership como `finalized`.
* No usar `removed`; el equivalente lógico es `finalized`.
* `household_members` usa `person_id`, no `user_id`.
* Un mismo `person_id` no debe tener dos memberships activas o pending en el mismo household.

Índices sugeridos:

* `idx_hm_household` sobre `household_id`.
* `idx_hm_person` sobre `person_id`.
* `idx_hm_status` sobre `status`.
* índice único parcial sobre `(household_id, person_id)` para estados activos/pending según estrategia final.

RLS esperada:

* SELECT: miembros activos del hogar pueden ver información permitida del hogar; usuarios pending no ven datos internos.
* INSERT: solo operación backend controlada para creación de hogar o solicitud por link.
* UPDATE: Coordinator para `role` y `status`; propio miembro solo para datos permitidos si existieran.
* DELETE físico: no usar. Finalización lógica mediante `status='finalized'`.

---

### Role / Rol

Roles técnicos oficiales MVP:

| Rol funcional | Valor técnico final | Estado |
|---|---|---|
| Coordinator | `coordinator` | REAL |
| Adult | `adult` | REAL |
| Adolescent | `adolescent` | REAL |
| Child | `child` | REAL |
| Senior | `senior` | REAL |
| Guest | `guest` | REAL |

Rol adicional:

| Nombre | Valor técnico | Clasificación |
|---|---|---|
| Empleado Familiar | `family_employee` | POST_MVP / fuera del MVP |

Reglas:

* No usar `teen` como valor técnico final.
* Si aparece `teen` en documentación vieja o schema anterior, tratarlo como alias documental/migración de `adolescent`.
* No mezclar inglés/español en DB/API.
* El usuario puede declarar un rol en onboarding como dato UX, pero no asigna rol técnico.
* El rol técnico final dentro del hogar lo define el Coordinator.
* Excepción: quien crea un hogar recibe automáticamente rol `coordinator`.

Permisos MVP por rol en AUTH + ONBOARDING:

| Rol | Permisos relevantes |
|---|---|
| `coordinator` | Crear links de invitación, revocar links, aprobar ingresos, rechazar ingresos, asignar rol, cambiar rol, finalizar/suspender memberships según reglas. |
| `adult` | No crea links en MVP. No aprueba ingresos en MVP. Permisos delegables POST_MVP. |
| `adolescent` | Sin permisos técnicos de Auth adicionales en MVP. |
| `child` | Sin permisos técnicos de Auth adicionales en MVP. |
| `senior` | Experiencia adaptada; permisos según rol real asignado, no por edad. |
| `guest` | Acceso mínimo y limitado; no administra Auth/Onboarding. |

---

### `household_invite_links`

Entidad de link de invitación reutilizable y temporal para solicitar ingreso a un hogar.

No es un join code tipeable. No se implementan códigos manuales tipo `FAM-8K2P` en MVP.

Campos definitivos MVP:

| Campo | Tipo | Nullable | Default | Nota |
|---|---:|---:|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `household_id` | `uuid` | NO | — | FK → `households.id` |
| `created_by_member_id` | `uuid` | NO | — | FK → `household_members.id` del Coordinator creador |
| `token` | `text` | NO | — | Token opaco del link, único |
| `status` | `text` | NO | `'active'` | `active`, `expired`, `revoked` |
| `expires_at` | `timestamptz` | NO | `now() + interval '7 days'` | Expira en 7 días |
| `revoked_at` | `timestamptz` | SÍ | `NULL` | Fecha de revocación |
| `created_at` | `timestamptz` | NO | `now()` | Automático |
| `updated_at` | `timestamptz` | NO | `now()` | Automático |

Reglas:

* Solo `coordinator` puede crear links en MVP.
* Solo `coordinator` puede revocar links en MVP.
* El link puede usarse múltiples veces mientras esté `active`, no vencido y no revocado.
* No existe estado `used`, porque el link no es single-use.
* Usar el link no da acceso automático al hogar.
* Usar el link crea una membership `pending` con `role = null`.
* El usuario pending no ve datos internos del hogar.
* El Coordinator aprueba o rechaza la solicitud.
* El Coordinator asigna el rol técnico al aprobar.
* Duplicados por `person_id + household_id` deben prevenirse.
* Si ya existe membership `pending`, devolver la existente.
* Si ya existe membership `active`, no crear otra.
* Si existía membership `finalized`, se puede crear una nueva solicitud `pending` según implementación final.

---

### Session / Token / RefreshToken

No hay tabla propia `sessions` ni `refresh_tokens` en HomePlus MVP.

Definición:

* `session` significa sesión autenticada de Supabase Auth.
* Incluye conceptualmente `access_token`, `refresh_token`, `expires_at` y usuario autenticado.
* HomePlus no persiste refresh tokens en tabla propia.
* HomePlus puede exponer wrappers API para refresh/logout, pero internamente delega en Supabase Auth.

Reglas:

* `POST /api/auth/login`, `POST /api/auth/register` y social login devuelven o establecen sesión Supabase.
* `POST /api/auth/refresh` renueva sesión mediante Supabase.
* `POST /api/auth/logout` cierra sesión actual mediante Supabase.
* Logout global/todas las sesiones queda POST_MVP.
* Si refresh falla, frontend navega a sesión expirada/login.

---

### OnboardingState

Hay dos niveles de onboarding.

#### Onboarding global de app

Vive en `people`.

Campos:

* `people.app_onboarding_status`.
* `people.app_onboarding_completed_at`.

Estados:

* `not_started`.
* `in_progress`.
* `completed`.

Propósito:

* interiorizar a la persona en la app;
* explicar el valor de HomePlus;
* configurar preferencias iniciales;
* evitar repetir onboarding cuando la persona entra desde otro dispositivo;
* permitir una opción visible de “Ya tengo cuenta” antes de registrar o loguear.

Reglas:

* El onboarding inicial no depende de conocer la familia.
* El onboarding inicial no depende de tener un rol técnico confirmado.
* El onboarding inicial puede ocurrir antes de register/login o al primer uso del dispositivo.
* Si la persona ya tiene cuenta y `app_onboarding_status = completed`, no debe repetirse el onboarding global.

#### Onboarding específico de hogar/membership

Vive en `household_members` si aplica.

Campos:

* `household_members.household_onboarding_status`.
* `household_members.household_onboarding_completed_at`.

Propósito:

* configurar información contextual de ese hogar;
* adaptar pantallas según rol real asignado;
* completar pasos específicos tras crear hogar o ser aprobado.

Reglas:

* Puede ser liviano en MVP.
* No reemplaza el onboarding global de app.
* No debe bloquear la existencia de la cuenta.

---

## 4. Reglas de negocio

### Reglas generales

* `auth.users` autentica.
* `people` representa a la persona/perfil global de HomePlus.
* `household_members` vincula persona + hogar + rol + estado.
* `households` representa el hogar.
* No existe `accounts` como tabla técnica.
* No existe `persons` separado de `people`.
* La cuenta autenticable no pertenece al hogar.
* La persona puede pertenecer a múltiples hogares.
* Los roles son contextuales por hogar.
* Los datos de un hogar no se cruzan con datos de otro.
* `people.active_household_id` define el hogar actualmente visualizado/operado.
* RLS debe filtrar por household y membership.
* Ningún rol obtiene acceso automático a información privada de otra persona por tener rol.
* Las relaciones familiares son informativas y no modifican permisos automáticamente.

### Usuario no autenticado

Puede:

* Ver onboarding inicial de app.
* Elegir “Ya tengo cuenta”.
* Usar `POST /api/auth/register`.
* Usar `POST /api/auth/login`.
* Usar Google OAuth.
* Usar Apple OAuth.
* Iniciar recuperación de contraseña.
* Abrir un link de invitación y luego registrarse/loguearse para solicitar ingreso.

No puede:

* Crear hogar.
* Crear links de invitación.
* Solicitar ingreso efectivo sin autenticarse.
* Acceder a households.
* Acceder a household_members.
* Ver datos internos de un hogar.

### Usuario autenticado

Puede:

* Enviar Bearer token JWT de Supabase.
* Consultar `GET /api/auth/me`.
* Crear una persona `people` si aún no existe para su `auth.users.id`.
* Crear un hogar mediante `POST /api/households`.
* Solicitar ingreso usando link de invitación.
* Cerrar sesión.
* Recuperar/renovar sesión si Supabase lo permite.

No puede automáticamente:

* Ver hogares donde no tiene membership activa.
* Elegir rol técnico dentro de un hogar.
* Aprobarse a sí mismo.
* Acceder a datos internos de un hogar con membership `pending`.

### Register

Reglas finales:

* Endpoint público.
* Crea usuario en `auth.users` mediante Supabase Auth.
* Crea o vincula `people` con `people.auth_user_id = auth.users.id`.
* Crea sesión Supabase.
* No crea `households`.
* No crea `household_members`.
* No asigna rol técnico.
* No setea `people.active_household_id` salvo que una regla posterior lo haga al crear/unirse a hogar.
* Después de register, frontend llama `GET /api/auth/me`.
* Si la persona no tiene hogar activo, frontend muestra opciones: crear hogar o usar link de invitación.

Validaciones mínimas:

* Email requerido.
* Email con formato válido.
* Password requerido.
* Password mínimo 8 caracteres.
* `display_name` requerido si el registro crea `people` en el mismo paso.
* `display_name` máximo 40 caracteres.
* Normalización de email pendiente de política exacta Supabase/backend.

Errores esperados:

* Email duplicado.
* Email inválido.
* Password inválido.
* Password débil.
* Error de red.
* Error genérico Supabase.

### Login

Reglas finales:

* Endpoint público o flujo Supabase Auth directo.
* Recibe email/password.
* Devuelve o establece sesión Supabase.
* No decide navegación final por sí solo.
* Después de login, frontend llama `GET /api/auth/me`.
* No revelar si falló email o password.
* Rate limit/backoff se delega a Supabase Auth salvo política adicional definida.

### Social login

Reglas finales:

* Google OAuth es REAL en MVP.
* Apple OAuth es REAL en MVP.
* Ambos se implementan mediante Supabase Auth.
* Si social login crea un `auth.users` nuevo, el backend debe crear o vincular `people`.
* Si social login corresponde a un `auth.users` existente, debe resolver la persona asociada por `people.auth_user_id`.
* Después de social login, frontend llama `GET /api/auth/me`.

### Recuperación de contraseña

Reglas finales:

* Es REAL en MVP.
* Se delega a Supabase Auth.
* Debe soportar forgot password, reset password, email de recuperación, redirect seguro y manejo de errores.
* No se implementa tabla propia.
* No se inventa token propio de recuperación.

### Refresh Token

Reglas finales:

* Delegado a Supabase Auth.
* No hay tabla propia `refresh_tokens`.
* `POST /api/auth/refresh`, si existe, es wrapper sobre Supabase.
* Si se usa Supabase SDK directo, el wrapper puede ser una capa de compatibilidad del backend.
* Si refresh falla, se considera sesión expirada.

### Logout

Reglas finales:

* Delegado a Supabase Auth.
* No hay tabla propia `sessions`.
* `POST /api/auth/logout`, si existe, cierra la sesión actual.
* Cerrar todas las sesiones queda POST_MVP.
* Frontend debe limpiar estado local seguro y navegar a login/bienvenida.

### Current User / Me

Reglas finales:

* `GET /api/auth/me` es obligatorio.
* Es la fuente de verdad para navegación inicial.
* El frontend no decide estado del usuario solo con storage local.
* Se llama al abrir la app, después de register, login, social login, refresh y cambio de hogar.
* Devuelve `user`, `person`, `memberships` y `active_household`.
* No devuelve `account`, porque no existe tabla `accounts`.

Debe resolver:

* usuario no autenticado;
* usuario autenticado sin `people`;
* usuario autenticado con `people` pero sin hogar;
* usuario autenticado con membership `pending`;
* usuario autenticado con membership `active`;
* usuario autenticado con varias memberships activas;
* usuario con hogar activo inválido o nulo.

### Crear hogar

Reglas finales:

* Crear hogar ocurre después de register/login.
* Endpoint: `POST /api/households`.
* Requiere usuario autenticado.
* Requiere `people` asociada al usuario.
* Crea en una operación atómica:
  1. `households`.
  2. `household_members` del creador.
  3. `role = 'coordinator'`.
  4. `status = 'active'`.
  5. `joined_at = now()`.
  6. `people.active_household_id = household.id`.
* Si falla cualquier paso, no debe persistir creación parcial.
* Debe resolver la tensión RLS del primer Coordinator mediante función backend/RPC/Edge Function/service role controlado.

Estados rotos prohibidos:

* hogar sin creador;
* hogar sin Coordinator;
* persona con hogar activo pero sin membership active;
* membership apuntando a hogar fallido;
* household creado sin membership inicial.

### Crear link de invitación

Reglas finales:

* Solo `coordinator` puede crear links en MVP.
* Endpoint sugerido: `POST /api/households/:hid/invite-links`.
* Crea `household_invite_links`.
* Link reusable.
* Link temporal.
* Link con token opaco.
* Expira en 7 días.
* Puede revocarse.
* No es código manual tipeable.
* No asigna rol.
* No da acceso automático.

### Usar link de invitación

Reglas finales:

* Usuario abre link.
* Si no está autenticado, debe registrarse o iniciar sesión.
* Si está autenticado, se identifica su `people`.
* Endpoint sugerido: `POST /api/invite-links/:token/join`.
* Si el link es válido, crea `household_members` con:
  * `person_id` actual;
  * `household_id` del link;
  * `status = 'pending'`;
  * `role = null`.
* Si ya existe membership `pending`, devuelve la existente.
* Si ya existe membership `active`, no crea otra.
* Si el link está vencido/revocado/inexistente, devuelve error.
* El usuario queda en pantalla de espera.

### Aprobar ingreso

Reglas finales:

* Solo `coordinator` puede aprobar ingresos.
* Endpoint: `POST /api/households/:hid/members/:member_id/approve`.
* Request incluye rol técnico asignado.
* Aprobar cambia:
  * `status = 'active'`;
  * `role = <rol_asignado>`;
  * `joined_at = now()`.
* Si la persona no tiene `active_household_id`, puede setearse al household aprobado.
* Si ya tenía otro hogar activo, no debe cambiarse automáticamente salvo decisión UX explícita.

### Rechazar ingreso

Reglas finales:

* Solo `coordinator` puede rechazar ingresos.
* Endpoint: `POST /api/households/:hid/members/:member_id/reject`.
* Rechazar marca:
  * `status = 'finalized'`;
  * `left_at = now()`.
* No borrar físicamente la fila.
* El usuario rechazado no accede a datos internos del hogar.

### Onboarding

Reglas finales:

* El onboarding principal es introducción a la app, no a la familia.
* El onboarding no depende de aprobación familiar.
* El onboarding puede empezar antes de login/register.
* Debe haber una opción visible para “Ya tengo cuenta”.
* Si la persona ya tiene cuenta y `people.app_onboarding_status = completed`, no se repite el onboarding global.
* El Role Selection del onboarding es declarativo/UX.
* Role Selection no asigna rol técnico.
* El Coordinator asigna el rol técnico final al aprobar el ingreso.
* Excepción: quien crea un hogar recibe rol técnico `coordinator` automáticamente.

---

## 5. API

### Convenciones generales

* JSON por defecto.
* Auth mediante `Authorization: Bearer <token>` cuando aplica.
* Token JWT de Supabase.
* Errores con forma general:

```json
{
  "error": "string",
  "code": "string",
  "field": "string opcional",
  "details": {}
}
```

* `Accept-Language: es-419` por defecto.
* RLS debe filtrar toda query por `household_id` y membership del usuario/persona autenticada.
* Todos los endpoints protegidos derivan la persona actual desde `auth.users.id` → `people.auth_user_id`.

---

### `POST /api/auth/register`

Método: `POST`.

Ruta: `/api/auth/register`.

Descripción:

Registra un usuario nuevo, crea o vincula su persona HomePlus y establece sesión Supabase. No crea hogar ni membership.

Permisos:

* Público.
* No requiere Bearer token.

Request body:

```json
{
  "email": "...",
  "password": "...",
  "display_name": "...",
  "language": "es-419",
  "phone": "..."
}
```

Campos obligatorios:

* `email`.
* `password`.
* `display_name`.

Campos opcionales:

* `language`.
* `phone`.

Response exitosa:

HTTP `201`.

```json
{
  "user": {
    "id": "...",
    "email": "..."
  },
  "person": {
    "id": "...",
    "display_name": "...",
    "active_household_id": null,
    "app_onboarding_status": "not_started"
  },
  "session": {
    "token": "...",
    "refresh_token": "...",
    "expires_at": "..."
  }
}
```

Efectos:

* Crea `auth.users` mediante Supabase Auth.
* Crea `people` con `auth_user_id = auth.users.id`.
* Crea sesión Supabase.
* No crea `households`.
* No crea `household_members`.
* No asigna rol técnico.
* Dispara evento de usuario registrado.

Errores posibles:

| HTTP | Error | Código |
|---:|---|---|
| 400 | email inválido | `auth/invalid_email` |
| 400 | password inválido/débil | `auth/weak_password` |
| 400 | display_name inválido | `auth/invalid_display_name` |
| 409 | email ya registrado | `auth/email_taken` |
| 500 | error interno | `auth/register_failed` |

Navegación posterior:

* Frontend llama `GET /api/auth/me`.
* Si no hay memberships, mostrar crear hogar o usar link.

---

### `POST /api/auth/login`

Método: `POST`.

Ruta: `/api/auth/login`.

Descripción:

Autentica usuario existente con email/password mediante Supabase Auth.

Permisos:

* Público.
* No requiere Bearer token.

Request body:

```json
{
  "email": "...",
  "password": "..."
}
```

Response exitosa:

HTTP `200`.

```json
{
  "session": {
    "token": "...",
    "refresh_token": "...",
    "expires_at": "..."
  },
  "user": {
    "id": "...",
    "email": "..."
  }
}
```

Efectos:

* Establece sesión Supabase.
* No decide hogar activo por sí solo.
* Frontend debe llamar `GET /api/auth/me`.

Errores posibles:

| HTTP | Error | Código |
|---:|---|---|
| 401 | credenciales inválidas | `auth/invalid_credentials` |
| 429 | demasiados intentos | `auth/rate_limited` |
| 500 | error interno | `auth/login_failed` |

Reglas:

* No revelar si falló email o password.
* Backoff/rate limit delegado a Supabase salvo política adicional.

---

### Social login — Google / Apple

Implementación:

* Google OAuth REAL en MVP.
* Apple OAuth REAL en MVP.
* Delegado a Supabase Auth.

Endpoints:

* Pueden resolverse con Supabase SDK directo o wrappers backend si el stack lo requiere.
* Si se exponen wrappers, deben considerarse parte del módulo Auth.

Efectos tras login social exitoso:

* Supabase devuelve sesión.
* Backend crea `people` si no existe para `auth_user_id`.
* Backend vincula `people` existente si corresponde.
* Frontend llama `GET /api/auth/me`.

Errores posibles:

* OAuth cancelado por usuario.
* OAuth provider error.
* Email/provider ya vinculado a otra cuenta según reglas Supabase.
* No se pudo crear/vincular `people`.

---

### Recuperación de contraseña

Implementación:

* REAL en MVP.
* Delegada a Supabase Auth.
* No hay token propio de HomePlus.

Acciones esperadas:

* iniciar recuperación / forgot password;
* enviar email de recuperación;
* abrir redirect seguro;
* permitir setear nueva contraseña;
* manejar link inválido/vencido;
* volver a login o sesión según flujo Supabase.

Contrato API:

* Puede exponerse como wrappers propios o resolverse con Supabase SDK.
* Si se crean wrappers, deben documentarse como wrappers sobre Supabase y no como sistema propio.

---

### `POST /api/auth/refresh`

Método: `POST`.

Ruta: `/api/auth/refresh`.

Descripción:

Renueva sesión usando refresh token mediante Supabase Auth.

Permisos:

* Puede requerir refresh token válido.
* No requiere tabla propia de refresh tokens.

Request body:

```json
{
  "refresh_token": "..."
}
```

Response exitosa:

HTTP `200`.

```json
{
  "session": {
    "token": "...",
    "refresh_token": "...",
    "expires_at": "..."
  }
}
```

Errores posibles:

| HTTP | Error | Código |
|---:|---|---|
| 401 | refresh token inválido | `auth/invalid_refresh_token` |
| 401 | refresh token expirado | `auth/expired_refresh_token` |

Reglas:

* Delegado a Supabase.
* Si falla, frontend navega a sesión expirada/login.

---

### `POST /api/auth/logout`

Método: `POST`.

Ruta: `/api/auth/logout`.

Descripción:

Cierra la sesión actual mediante Supabase Auth.

Permisos:

* Requiere sesión activa o token reconocible.

Request body:

```json
{}
```

Response exitosa:

HTTP `200`.

```json
{
  "logged_out": true
}
```

Efectos:

* Cierra sesión actual.
* Limpia estado local del frontend.
* No cierra todas las sesiones.
* No elimina `people`.
* No modifica memberships.

Errores:

* Sesión ya inválida.
* Error Supabase.

---

### `GET /api/auth/me`

Método: `GET`.

Ruta: `/api/auth/me`.

Descripción:

Devuelve el estado actual del usuario/persona para decidir navegación, hogar activo, memberships y onboarding.

Permisos:

* Requiere Bearer token.

Response exitosa:

HTTP `200`.

```json
{
  "user": {
    "id": "...",
    "email": "..."
  },
  "person": {
    "id": "...",
    "display_name": "...",
    "active_household_id": "...",
    "app_onboarding_status": "completed"
  },
  "memberships": [
    {
      "id": "...",
      "household_id": "...",
      "household_name": "...",
      "role": "coordinator",
      "status": "active",
      "household_onboarding_status": "completed"
    }
  ],
  "active_household": {
    "id": "...",
    "name": "...",
    "role": "coordinator",
    "member_id": "..."
  }
}
```

Response autenticado sin hogar:

HTTP `200`.

```json
{
  "user": {
    "id": "...",
    "email": "..."
  },
  "person": {
    "id": "...",
    "display_name": "...",
    "active_household_id": null,
    "app_onboarding_status": "completed"
  },
  "memberships": [],
  "active_household": null
}
```

Response no autenticado:

HTTP `401`.

```json
{
  "error": "unauthorized",
  "code": "auth/unauthorized"
}
```

Reglas:

* No devuelve `account`.
* Si no existe `people` para el usuario autenticado, backend debe crearla o devolver error controlado según política final.
* `active_household` solo se devuelve si `people.active_household_id` corresponde a membership `active`.
* Si `active_household_id` es inválido, backend debe devolver `active_household: null` y opcionalmente corregirlo.
* Memberships `pending` pueden aparecer para navegación a pantalla de espera, sin exponer datos internos.

---

### `POST /api/households`

Método: `POST`.

Ruta: `/api/households`.

Descripción:

Crea un hogar y la membership inicial del creador con rol `coordinator` en una operación atómica.

Permisos:

* Requiere Bearer token.
* Requiere `people` asociada al usuario autenticado.

Request body:

```json
{
  "name": "Casa de los Robles",
  "timezone": "America/Argentina/Buenos_Aires",
  "default_language": "es-419"
}
```

Campos obligatorios:

* `name`.

Campos opcionales:

* `timezone`.
* `default_language`.

Response exitosa:

HTTP `201`.

```json
{
  "household": {
    "id": "...",
    "name": "Casa de los Robles",
    "slug": "casa-de-los-robles"
  },
  "member": {
    "id": "...",
    "role": "coordinator",
    "status": "active",
    "joined_at": "..."
  },
  "active_household_id": "..."
}
```

Efectos atómicos:

* Crea `households`.
* Crea `household_members` para el creador.
* Setea `role = 'coordinator'`.
* Setea `status = 'active'`.
* Setea `joined_at = now()`.
* Setea `people.active_household_id = household.id`.

Errores posibles:

| HTTP | Error | Código |
|---:|---|---|
| 400 | nombre inválido | `household/invalid_name` |
| 401 | no autenticado | `auth/unauthorized` |
| 409 | slug duplicado no resuelto | `household/slug_conflict` |
| 500 | fallo transaccional | `household/create_failed` |

Reglas:

* Si falla cualquier paso, rollback completo.
* Debe ejecutarse con transacción/RPC/Edge Function/backend controlado.
* No permitir household sin Coordinator.

---

### `POST /api/households/:hid/invite-links`

Método: `POST`.

Ruta: `/api/households/:hid/invite-links`.

Descripción:

Crea un link de invitación temporal y reutilizable para solicitar ingreso al hogar.

Permisos:

* Requiere Bearer token.
* Requiere membership `active` en el household.
* Requiere rol `coordinator`.

Path params:

* `hid`: household id.

Request body:

```json
{}
```

Response exitosa:

HTTP `201`.

```json
{
  "invite_link": {
    "id": "...",
    "url": "https://homeplus.app/invite/...",
    "token": "...",
    "status": "active",
    "expires_at": "..."
  }
}
```

Efectos:

* Crea `household_invite_links`.
* Setea `created_by_member_id` con la membership del Coordinator.
* Setea `expires_at = now() + 7 days`.

Errores posibles:

| HTTP | Error | Código |
|---:|---|---|
| 401 | no autenticado | `auth/unauthorized` |
| 403 | no es coordinator | `household/forbidden` |
| 404 | hogar inexistente/no visible | `household/not_found` |
| 500 | error creando link | `invite_link/create_failed` |

---

### `POST /api/households/:hid/invite-links/:link_id/revoke`

Método: `POST`.

Ruta: `/api/households/:hid/invite-links/:link_id/revoke`.

Descripción:

Revoca un link de invitación activo.

Permisos:

* Requiere Bearer token.
* Requiere rol `coordinator`.

Response exitosa:

HTTP `200`.

```json
{
  "invite_link": {
    "id": "...",
    "status": "revoked",
    "revoked_at": "..."
  }
}
```

Errores posibles:

| HTTP | Error | Código |
|---:|---|---|
| 401 | no autenticado | `auth/unauthorized` |
| 403 | no permitido | `household/forbidden` |
| 404 | link inexistente | `invite_link/not_found` |
| 409 | link ya vencido/revocado | `invite_link/not_active` |

---

### `POST /api/invite-links/:token/join`

Método: `POST`.

Ruta: `/api/invite-links/:token/join`.

Descripción:

Usa un link de invitación para solicitar ingreso a un hogar. No activa la membership automáticamente.

Permisos:

* Requiere Bearer token.
* Requiere `people` asociada al usuario autenticado.

Path params:

* `token`: token opaco del link.

Request body:

```json
{}
```

Response exitosa nueva solicitud:

HTTP `201`.

```json
{
  "membership": {
    "id": "...",
    "household_id": "...",
    "status": "pending",
    "role": null
  },
  "household_preview": {
    "id": "...",
    "name": "..."
  }
}
```

Response si ya estaba pending:

HTTP `200`.

```json
{
  "membership": {
    "id": "...",
    "household_id": "...",
    "status": "pending",
    "role": null
  },
  "already_pending": true
}
```

Errores posibles:

| HTTP | Error | Código |
|---:|---|---|
| 401 | no autenticado | `auth/unauthorized` |
| 404 | link inexistente | `invite_link/not_found` |
| 409 | link vencido | `invite_link/expired` |
| 409 | link revocado | `invite_link/revoked` |
| 409 | persona ya es miembro active | `household/already_member` |
| 500 | error creando solicitud | `household/join_failed` |

Reglas:

* No asigna rol.
* No da acceso a datos internos.
* Crea membership `pending`.
* Previene duplicados por `person_id + household_id`.

---

### `POST /api/households/:hid/members/:member_id/approve`

Método: `POST`.

Ruta: `/api/households/:hid/members/:member_id/approve`.

Descripción:

Aprueba una solicitud de ingreso pendiente y asigna rol técnico.

Permisos:

* Requiere Bearer token.
* Requiere membership `active` en el hogar.
* Requiere rol `coordinator`.

Path params:

* `hid`: household id.
* `member_id`: id de `household_members` pendiente.

Request body:

```json
{
  "role": "adult"
}
```

Valores válidos de `role`:

* `adult`.
* `adolescent`.
* `child`.
* `senior`.
* `guest`.
* `coordinator` solo si se decide permitir múltiples coordinators; si no, queda restringido a cambios posteriores.

Response exitosa:

HTTP `200`.

```json
{
  "member": {
    "id": "...",
    "household_id": "...",
    "person_id": "...",
    "role": "adult",
    "status": "active",
    "joined_at": "..."
  }
}
```

Efectos:

* `status = 'active'`.
* `role = request.role`.
* `joined_at = now()`.
* Opcionalmente setea `people.active_household_id` si estaba null.

Errores posibles:

| HTTP | Error | Código |
|---:|---|---|
| 401 | no autenticado | `auth/unauthorized` |
| 403 | no permitido | `household/forbidden` |
| 404 | member no encontrado | `member/not_found` |
| 409 | member no está pending | `member/not_pending` |
| 400 | rol inválido | `member/invalid_role` |

---

### `POST /api/households/:hid/members/:member_id/reject`

Método: `POST`.

Ruta: `/api/households/:hid/members/:member_id/reject`.

Descripción:

Rechaza una solicitud de ingreso pendiente.

Permisos:

* Requiere Bearer token.
* Requiere rol `coordinator`.

Request body:

```json
{}
```

Response exitosa:

HTTP `200`.

```json
{
  "member": {
    "id": "...",
    "status": "finalized",
    "left_at": "..."
  }
}
```

Efectos:

* `status = 'finalized'`.
* `left_at = now()`.
* No borra físicamente.
* No da acceso al hogar.

Errores posibles:

| HTTP | Error | Código |
|---:|---|---|
| 401 | no autenticado | `auth/unauthorized` |
| 403 | no permitido | `household/forbidden` |
| 404 | member no encontrado | `member/not_found` |
| 409 | member no está pending | `member/not_pending` |

---

### Completar onboarding global de app

Acción requerida con contrato mínimo propuesto.

Endpoint sugerido:

```http
POST /api/onboarding/app/complete
```

Permisos:

* Requiere Bearer token.

Request body:

```json
{
  "steps_completed": ["intro", "value", "preferences"]
}
```

Response exitosa:

```json
{
  "person": {
    "id": "...",
    "app_onboarding_status": "completed",
    "app_onboarding_completed_at": "..."
  }
}
```

Efectos:

* `people.app_onboarding_status = 'completed'`.
* `people.app_onboarding_completed_at = now()`.
* Puede disparar evento de onboarding completado.

Pendiente:

* Definir lista exacta de pasos.

---

## 6. UI

### Principios UI aplicables

* Mobile-first.
* Inputs con label visible arriba.
* Placeholder no reemplaza label.
* Todo input debe tener `accessibilityLabel`.
* Botones muestran feedback en menos de 100 ms.
* Spinner solo si la operación tarda más de 300 ms.
* Botón loading mantiene ancho y evita flicker.
* Toast por defecto dura 4 segundos.
* Toast en modo Senior dura 8 segundos.
* Modales centrados no se usan para formularios.
* Bottom sheets pueden usarse para confirmaciones o formularios simples si aplica.

---

### Welcome / Introducción inicial

Objetivo:

* Introducir HomePlus.
* Permitir empezar onboarding de app.
* Permitir acceso visible a “Ya tengo cuenta”.

Estructura:

* Logo/nombre HomePlus.
* Mensaje breve de valor.
* Botón principal: “Empezar”.
* Link/botón secundario visible: “Ya tengo cuenta”.

Navegación:

* “Empezar” → onboarding inicial de app o register según variante.
* “Ya tengo cuenta” → Login.

Estados:

* Loading mínimo si se consulta sesión existente.
* Si ya hay sesión local válida → llamar `GET /api/auth/me`.

---

### Onboarding inicial de app

Objetivo:

* Interiorizar al usuario en la app.
* Mostrar valor del producto.
* Configurar preferencias iniciales.
* No enseñar la familia ni depender de rol técnico.

Componentes:

* Slides o pantallas breves.
* Opción visible para “Ya tengo cuenta”.
* Preferencias mínimas opcionales.
* Botón continuar.
* Botón omitir si se decide permitir.

Inputs posibles:

* nombre o tratamiento;
* idioma;
* preferencia de tono;
* preferencia de horario;
* modo visual normal/senior si aplica.

Navegación:

* Si usuario no tiene cuenta → Register.
* Si usuario ya tiene cuenta → Login.
* Si `people.app_onboarding_status = completed` → no repetir.

Errores:

* No requiere errores complejos si es local.
* Si falla persistencia al completar onboarding, mostrar retry.

---

### Register

Objetivo:

* Crear cuenta autenticable y persona HomePlus.

Inputs:

* Email.
* Contraseña.
* Confirmar contraseña si UI lo usa.
* Nombre visible / `display_name`.
* Teléfono opcional.

Componentes:

* Email input.
* Password input con toggle de visibilidad.
* Confirm password UI-only si aplica.
* Nombre visible.
* Botón principal: “Crear cuenta”.
* Botones social login Google/Apple si se ofrecen en esta pantalla.
* Link: “Ya tengo cuenta”.

Validaciones UI:

* Email requerido y válido.
* Password mínimo 8 caracteres.
* Confirm password coincide si existe.
* Nombre visible requerido.

Loading:

* Botón deshabilitado durante request.
* Spinner si tarda más de 300 ms.

Errores:

* Email ya registrado.
* Password débil.
* Email inválido.
* Error de red.
* Error genérico.

Navegación exitosa:

* Llamar `GET /api/auth/me`.
* Si no hay hogares: Create Household o usar link.
* Si llegó desde invite link: continuar join link.

---

### Login

Objetivo:

* Autenticar cuenta existente.

Inputs:

* Email.
* Contraseña.

Componentes:

* Email input.
* Password input con toggle.
* Botón: “Entrar”.
* Botón Google.
* Botón Apple.
* Link: “¿Olvidaste tu contraseña?”.
* Link: “Crear cuenta”.

Loading:

* Botón en loading durante submit.
* Mantener layout estable.

Errores:

* Credenciales inválidas.
* Rate limited.
* Red caída.
* Sesión no pudo iniciar.

Navegación exitosa:

* Llamar `GET /api/auth/me`.
* Si `app_onboarding_status != completed`, continuar onboarding global o marcar según flujo.
* Si hay active household válido → Home.
* Si hay memberships pending → Waiting Approval.
* Si no hay memberships → Create Household / Invite Link.

---

### Social login

Objetivo:

* Permitir ingresar con Google o Apple.

Componentes:

* Botón “Continuar con Google”.
* Botón “Continuar con Apple”.

Reglas:

* REAL en MVP.
* Delegado a Supabase.
* Al volver del provider, resolver o crear `people`.
* Llamar `GET /api/auth/me`.

Errores:

* Usuario canceló.
* Provider falló.
* Cuenta ya vinculada.
* No se pudo crear `people`.

---

### Password Recovery

Objetivo:

* Recuperar acceso a cuenta mediante Supabase Auth.

Pantallas:

* Solicitar email.
* Confirmación de email enviado.
* Reset password desde link.
* Link inválido/vencido.

Inputs:

* Email.
* Nueva contraseña.
* Confirmar nueva contraseña.

Reglas:

* REAL en MVP.
* Delegado a Supabase.
* No token propio.

---

### Create Household

Objetivo:

* Crear el primer hogar o un hogar nuevo desde una persona autenticada.

Inputs mínimos MVP:

* Nombre del hogar.

Inputs opcionales:

* Timezone.
* Idioma.
* Foto hogar si storage está definido; si no, POST_MVP.
* Tipo de hogar si se decide persistir en `config`; si no, POST_MVP.

Componentes:

* Input nombre del hogar.
* Botón “Crear hogar”.
* Mensaje de creación atómica.

Loading:

* Botón en loading.
* Evitar doble submit.

Errores:

* Nombre inválido.
* Slug conflict.
* Sesión inválida.
* Error transaccional.

Navegación exitosa:

* `GET /api/auth/me`.
* Home o onboarding específico de hogar si aplica.

---

### Invite Link Management

Objetivo:

* Permitir al Coordinator crear, copiar y revocar links de invitación.

Componentes:

* Botón “Crear link de invitación”.
* Card con link activo.
* Botón copiar link.
* Botón compartir link nativo.
* Botón revocar.
* Texto de expiración: “Vence en 7 días”.

Loading:

* Loading al crear/revocar.

Errores:

* No autorizado.
* No es Coordinator.
* Link ya revocado/vencido.
* Error de red.

Empty state:

* “Todavía no creaste links de invitación.”

---

### Accept / Join by Invite Link

Objetivo:

* Permitir que una persona solicite ingreso a un hogar mediante link.

Estados:

1. No autenticado:
   * mostrar bienvenida contextual;
   * opciones Login/Register.
2. Autenticado:
   * mostrar hogar destino mínimo;
   * botón “Solicitar ingreso”.
3. Solicitud creada:
   * navegar a Waiting Approval.
4. Link vencido/revocado/inválido:
   * mostrar error y pedir nuevo link.

Componentes:

* Nombre del hogar, si se permite mostrar preview.
* Mensaje de seguridad.
* Botón “Solicitar ingreso”.
* Login/Register si no autenticado.

No mostrar:

* miembros del hogar;
* tareas;
* datos internos;
* métricas familiares;
* información privada.

---

### Waiting Approval / Solicitud pendiente

Objetivo:

* Informar que la solicitud fue enviada y espera aprobación del Coordinator.

Componentes:

* Nombre del hogar.
* Estado “Solicitud pendiente”.
* Mensaje: “Tu solicitud fue enviada. Cuando te aprueben vas a poder entrar al hogar.”
* Botón cerrar sesión.
* Botón volver o cambiar cuenta.
* Cancelar solicitud queda opcional/POST_MVP salvo contrato posterior.

Reglas:

* Usuario pending no ve datos internos.
* Si la solicitud pasa a active, `GET /api/auth/me` redirige a Home/onboarding específico.
* Si pasa a finalized por rechazo, mostrar estado rechazado o permitir solicitar nuevo link según UX.

---

### Approval Requests para Coordinator

Objetivo:

* Permitir al Coordinator aprobar/rechazar solicitudes pendientes.

Componentes:

* Lista de pending members.
* Nombre visible de la persona.
* Fecha de solicitud.
* Selector de rol técnico.
* Botón aprobar.
* Botón rechazar.

Reglas:

* El Coordinator asigna el rol real.
* El usuario no asigna su rol técnico.
* Aprobar activa membership.
* Rechazar finaliza membership.

Errores:

* Solicitud ya procesada.
* Rol inválido.
* No autorizado.

---

### Role Selection

Objetivo:

* Recoger señal declarativa/UX sobre cómo el usuario se identifica o qué experiencia espera.

Reglas:

* No asigna rol técnico.
* No otorga permisos.
* No reemplaza aprobación del Coordinator.
* Para creador de hogar, el rol técnico será `coordinator` automáticamente al crear hogar.
* Para solicitantes, el rol técnico lo define el Coordinator.

---

### Session Expired

Objetivo:

* Permitir reautenticación cuando refresh falla o sesión expira.

Componentes:

* Mensaje de sesión expirada.
* Email prellenado si está disponible.
* Password input.
* Botón entrar.
* Link recuperar contraseña.

Navegación:

* Re-login exitoso → `GET /api/auth/me`.
* Cancelar → Login/Bienvenida.

---

### Logout Confirm

Objetivo:

* Confirmar cierre de sesión actual.

Componentes:

* Bottom sheet o confirmación.
* Texto: cerrar sesión en este dispositivo.
* Botón confirmar.
* Botón cancelar.

Reglas:

* Cierra sesión actual.
* No afecta todas las sesiones.

---

## 7. Flujos

### App start

```text
Abrir app
↓
Buscar sesión local Supabase
↓
Si no hay sesión
  ↓
  Welcome / Onboarding inicial / Login
↓
Si hay sesión
  ↓
  GET /api/auth/me
  ↓
  Resolver navegación
```

Navegación desde `GET /api/auth/me`:

```text
401
↓
Login / Welcome

200 sin people
↓
Crear people o error recuperable

200 con people.app_onboarding_status != completed
↓
Onboarding inicial de app

200 con memberships []
↓
Create Household o abrir invite link

200 con membership pending y sin active household
↓
Waiting Approval

200 con active_household válido
↓
Home del hogar activo

200 con múltiples active y active_household null
↓
Selector de hogar
```

---

### Register

```text
Register form
↓
POST /api/auth/register
↓
Supabase crea auth.users
↓
Backend crea people con auth_user_id
↓
Supabase crea session
↓
GET /api/auth/me
↓
Si onboarding global no completo → onboarding app
↓
Si no tiene household → Create Household o Invite Link
```

No ocurre:

```text
Register
↓
Create Household
↓
Create Membership
```

Ese flujo queda descartado.

---

### Login email/password

```text
Login form
↓
POST /api/auth/login
↓
Supabase valida credenciales
↓
Devuelve session
↓
GET /api/auth/me
↓
Resolver navegación según person, onboarding, memberships y active_household
```

---

### Social login

```text
Tap Google / Apple
↓
Supabase OAuth
↓
Provider autentica
↓
Supabase crea/recupera auth.users
↓
Backend crea/vincula people
↓
GET /api/auth/me
↓
Resolver navegación
```

---

### Refresh Token

```text
Access token expira
↓
Supabase refresh / POST /api/auth/refresh
↓
Si refresh OK
  ↓
  Continuar sesión
  ↓
  GET /api/auth/me si hace falta revalidar estado
↓
Si refresh falla
  ↓
  Session Expired / Login
```

---

### Logout

```text
Usuario toca cerrar sesión
↓
Confirmación
↓
POST /api/auth/logout / Supabase signOut
↓
Limpiar estado local
↓
Login / Welcome
```

---

### Crear hogar

```text
Usuario autenticado sin hogar o decide crear hogar
↓
Create Household screen
↓
POST /api/households
↓
Transacción:
  Create household
  Create household_members
  role = coordinator
  status = active
  joined_at = now()
  people.active_household_id = household.id
↓
GET /api/auth/me
↓
Home / onboarding específico de hogar si aplica
```

---

### Crear link de invitación

```text
Coordinator en hogar activo
↓
Invite Link Management
↓
POST /api/households/:hid/invite-links
↓
Crear household_invite_links
↓
Mostrar link
↓
Copiar o compartir link
```

---

### Usar link de invitación

```text
Usuario abre link
↓
Si no autenticado: Register/Login
↓
Si autenticado: resolver people
↓
POST /api/invite-links/:token/join
↓
Validar link active/not expired/not revoked
↓
Crear o devolver household_members pending
↓
Waiting Approval
```

---

### Aprobar ingreso

```text
Coordinator ve solicitud pending
↓
Selecciona rol técnico
↓
POST /api/households/:hid/members/:member_id/approve
↓
status = active
role = rol asignado
joined_at = now()
↓
Usuario aprobado verá acceso en próximo GET /api/auth/me
```

---

### Rechazar ingreso

```text
Coordinator ve solicitud pending
↓
POST /api/households/:hid/members/:member_id/reject
↓
status = finalized
left_at = now()
↓
Usuario rechazado no accede al hogar
```

---

### Onboarding inicial de app

```text
Abrir app sin sesión o primer uso
↓
Welcome / Introducción
↓
Opción visible: Ya tengo cuenta
↓
Usuario puede seguir onboarding o ir a Login
↓
Si completa onboarding y tiene cuenta/persona
  people.app_onboarding_status = completed
↓
Si ya tenía cuenta y onboarding completed
  no repetir onboarding en dispositivo nuevo
```

---

### Onboarding por rol / membership

```text
Persona tiene membership active
↓
Si household_onboarding_status != completed
  mostrar configuración ligera específica del hogar/rol si aplica
↓
Completar
↓
household_members.household_onboarding_status = completed
↓
Home
```

Regla:

* Este onboarding no asigna rol técnico.
* El rol técnico ya fue asignado por Coordinator o por creación de hogar.

---

## 8. Eventos del sistema

### Eventos encontrados y/o adoptados para MVP

#### `user.registered`

Cuándo ocurre:

* Nuevo usuario crea cuenta en `auth.users`.

Produce:

* Cuenta Supabase creada.
* `people` creada/vinculada.

Payload sugerido:

```json
{
  "user_id": "...",
  "person_id": "...",
  "email": "...",
  "registered_at": "..."
}
```

Módulo afectado:

* Auth.
* Auditoría si aplica.

---

#### `auth.logged_in`

Cuándo ocurre:

* Usuario inicia sesión con email/password, Google o Apple.

Estado:

* Evento conceptual si no existe nombre técnico previo.

Produce:

* Sesión activa.

Módulo afectado:

* Auth.

---

#### `auth.logged_out`

Cuándo ocurre:

* Usuario cierra sesión actual.

Estado:

* Evento conceptual si no existe nombre técnico previo.

Produce:

* Sesión actual cerrada.

Módulo afectado:

* Auth.

---

#### `auth.token_refreshed`

Cuándo ocurre:

* Sesión se renueva correctamente.

Estado:

* Evento conceptual si no existe nombre técnico previo.

Produce:

* Nuevo access token/session.

Módulo afectado:

* Auth.

---

#### `password.recovery_requested`

Cuándo ocurre:

* Usuario solicita recuperación de contraseña.

Estado:

* Evento conceptual si se decide auditar.

Produce:

* Email Supabase de recuperación.

Módulo afectado:

* Auth.

---

#### `household.created`

Cuándo ocurre:

* Usuario crea un hogar mediante `POST /api/households`.

Produce:

* Household creado.
* Membership coordinator creada.
* Hogar activo seteado.

Payload sugerido:

```json
{
  "household_id": "...",
  "name": "...",
  "slug": "...",
  "timezone": "...",
  "default_language": "...",
  "created_by_person_id": "...",
  "created_by_member_id": "..."
}
```

Módulo afectado:

* Household mínimo para Auth.
* Audit.

---

#### `invite_link.created`

Cuándo ocurre:

* Coordinator crea link de invitación.

Estado:

* Nombre adoptado para reemplazar `member.invited` cuando se usa link reusable.

Produce:

* `household_invite_links` creado.

Payload sugerido:

```json
{
  "household_id": "...",
  "invite_link_id": "...",
  "created_by_member_id": "...",
  "expires_at": "..."
}
```

Módulo afectado:

* Auth/Onboarding.
* Audit.

---

#### `invite_link.revoked`

Cuándo ocurre:

* Coordinator revoca link.

Produce:

* Link pasa a `revoked`.

Módulo afectado:

* Auth/Onboarding.
* Audit.

---

#### `invite_link.expired`

Cuándo ocurre:

* Cron/server detecta link vencido o se evalúa `expires_at < now()`.

Produce:

* Link pasa a `expired` si se persiste el estado.

Módulo afectado:

* Auth/Onboarding.

---

#### `member.join_requested`

Cuándo ocurre:

* Persona usa link válido y solicita ingreso.

Produce:

* `household_members` creado con `status='pending'` y `role=null`.

Payload sugerido:

```json
{
  "household_id": "...",
  "member_id": "...",
  "person_id": "...",
  "invite_link_id": "...",
  "requested_at": "..."
}
```

Módulo afectado:

* Auth/Onboarding.
* Notificación al Coordinator si existe.
* Audit.

---

#### `member.approved`

Cuándo ocurre:

* Coordinator aprueba solicitud pendiente.

Produce:

* Membership pasa a `active`.
* Rol técnico queda asignado.

Payload sugerido:

```json
{
  "household_id": "...",
  "member_id": "...",
  "person_id": "...",
  "approved_by_member_id": "...",
  "role": "adult",
  "approved_at": "..."
}
```

Módulo afectado:

* Auth/Onboarding.
* Audit.

---

#### `member.rejected`

Cuándo ocurre:

* Coordinator rechaza solicitud pendiente.

Produce:

* Membership pasa a `finalized`.

Payload sugerido:

```json
{
  "household_id": "...",
  "member_id": "...",
  "person_id": "...",
  "rejected_by_member_id": "...",
  "rejected_at": "..."
}
```

Módulo afectado:

* Auth/Onboarding.
* Audit.

---

#### `user.onboarding_completed`

Cuándo ocurre:

* Persona completa onboarding global de app.

Produce:

* `people.app_onboarding_status = completed`.

Payload sugerido:

```json
{
  "user_id": "...",
  "person_id": "...",
  "steps_completed": [],
  "completed_at": "..."
}
```

Módulo afectado:

* Onboarding.

---

#### `member.onboarding_completed`

Cuándo ocurre:

* Persona completa onboarding específico de hogar/membership si aplica.

Produce:

* `household_members.household_onboarding_status = completed`.

Payload sugerido:

```json
{
  "household_id": "...",
  "member_id": "...",
  "person_id": "...",
  "steps_completed": [],
  "completed_at": "..."
}
```

Módulo afectado:

* Onboarding.
* Household mínimo.

---

## 9. Edge Cases

### Auth

| Caso | Comportamiento esperado |
|---|---|
| Email repetido en register | 409 `auth/email_taken`. |
| Email inválido | 400 `auth/invalid_email`. |
| Password débil | 400 `auth/weak_password`. |
| Credenciales inválidas | 401 `auth/invalid_credentials`. |
| OAuth cancelado | Volver a Login sin crear estado parcial. |
| OAuth exitoso sin people | Crear/vincular `people` antes de navegar. |
| Refresh token inválido | Cerrar sesión local y mostrar Login/Session Expired. |
| Refresh token expirado | Cerrar sesión local y mostrar Login/Session Expired. |
| Logout con sesión ya inválida | Considerar logout local exitoso o devolver error controlado. |
| Usuario autenticado sin people | Crear people o devolver error recuperable; no navegar a Home. |

### Register / People

| Caso | Comportamiento esperado |
|---|---|
| Register crea `auth.users` pero falla `people` | Rollback si posible o compensación inmediata; no dejar usuario sin perfil sin manejar. |
| Persona sin cuenta | `people.auth_user_id = null`; puede existir por carga interna futura. |
| Cuenta intenta vincularse a people ya vinculado | Rechazar o resolver mediante flujo explícito. |
| Usuario nuevo sin hogar | `GET /api/auth/me` devuelve memberships vacío y active_household null. |

### Active household

| Caso | Comportamiento esperado |
|---|---|
| `active_household_id = null` y una sola membership active | Backend/frontend puede setear automáticamente. |
| `active_household_id` apunta a hogar sin membership active | Devolver `active_household: null` y corregir o pedir selección. |
| Persona con varios hogares active | Mostrar selector o abrir active_household guardado. |
| Usuario intenta acceder hogar A desde contexto hogar B | RLS bloquea. |

### Crear hogar

| Caso | Comportamiento esperado |
|---|---|
| Falla crear household | No crear membership. |
| Falla crear membership coordinator | Rollback household. |
| Falla setear active_household_id | Rollback o corregir antes de responder éxito. |
| Slug duplicado | Regenerar o devolver 409 según política. |
| Usuario no autenticado | 401. |
| Usuario sin people | 409/500 controlado; crear people si política lo permite. |

### Invite links

| Caso | Comportamiento esperado |
|---|---|
| Link inexistente | 404 `invite_link/not_found`. |
| Link vencido | 409 `invite_link/expired`. |
| Link revocado | 409 `invite_link/revoked`. |
| Link activo usado por persona nueva | Crear membership pending. |
| Link usado por persona ya pending | Devolver pending existente. |
| Link usado por persona ya active | No crear duplicado; devolver error o estado ya miembro. |
| Link usado por persona finalized | Permitir nueva solicitud pending según implementación final. |
| Usuario pending intenta ver datos internos | Bloquear por API/RLS. |
| Link compartido con varias personas | Permitido mientras esté activo. |

### Aprobación / rechazo

| Caso | Comportamiento esperado |
|---|---|
| No coordinator intenta aprobar | 403. |
| No coordinator intenta rechazar | 403. |
| Coordinator aprueba member no pending | 409 `member/not_pending`. |
| Coordinator aprueba con rol inválido | 400 `member/invalid_role`. |
| Coordinator rechaza solicitud | status `finalized`, no delete físico. |
| Usuario se autoaprueba | Prohibido. |
| Usuario elige rol en onboarding | Solo dato UX, no técnico. |

### Onboarding

| Caso | Comportamiento esperado |
|---|---|
| App nueva en dispositivo sin sesión | Mostrar welcome/onboarding con opción “Ya tengo cuenta”. |
| Usuario ya hizo onboarding en otro dispositivo | Login + `GET /api/auth/me`; si completed, no repetir. |
| Onboarding incompleto | Puede retomarse con `in_progress`. |
| Usuario pending | Pantalla de espera, no Home. |
| Usuario aprobado pero onboarding hogar incompleto | Mostrar onboarding específico si aplica. |

---

## 10. Restricciones arquitectónicas

* Supabase Auth es la fuente de sesión, access token, refresh token, OAuth y recuperación de contraseña.
* No crear tabla propia `sessions`.
* No crear tabla propia `refresh_tokens`.
* No guardar password hashes fuera de Supabase Auth.
* `auth.users` no contiene lógica de hogar.
* `people` es la entidad de persona/perfil global.
* `household_members` es la entidad de relación persona-hogar.
* `household_members` debe usar `person_id`, no `user_id`.
* Separación por hogar debe existir en RLS, no solo en frontend/backend.
* Usuario con membership `pending` no puede leer datos internos del hogar.
* Crear hogar + membership coordinator + active_household debe ser atómico.
* Usar transacción, RPC, Edge Function o backend con service role controlado para creación atómica.
* Links de invitación usan token opaco, no código manual.
* Links de invitación son multiuso, temporales y revocables.
* Link de invitación no concede acceso directo.
* Role técnico se asigna por Coordinator, salvo creador de hogar.
* `finalized` se usa como soft delete lógico de membership.
* Email verification no bloquea onboarding inicial de app.
* Si Supabase exige email verification, puede bloquear acciones autenticadas posteriores según configuración.
* Google/Apple OAuth son REAL en MVP.
* Password recovery es REAL y delegado a Supabase.

---

## 11. Dependencias

AUTH depende de:

* Supabase Auth.
* `auth.users`.
* `people`.
* `households`.
* `household_members`.
* `household_invite_links`.
* RLS.
* Roles técnicos.
* Sesión Supabase.

ONBOARDING depende de:

* `people.app_onboarding_status`.
* `people.app_onboarding_completed_at`.
* `household_members.household_onboarding_status` si aplica.
* `household_members.household_onboarding_completed_at` si aplica.
* `GET /api/auth/me`.

Crear hogar depende de:

* Usuario autenticado.
* `people` existente.
* Operación atómica.
* Capacidad de insertar `households` y `household_members` con privilegio controlado.

Invite links dependen de:

* Household existente.
* Membership active del creador.
* Rol `coordinator`.
* Token opaco único.
* Expiración.

Aprobación depende de:

* Membership pending.
* Coordinator active en el mismo household.
* Rol técnico válido.

Frontend depende de:

* `GET /api/auth/me` para decidir navegación.
* Estados de onboarding.
* Estados de membership.
* `active_household`.

---

## 12. Checklist de implementación

### Register

#### Tarea

Implementar registro real.

#### Objetivo

Crear `auth.users`, `people` y sesión Supabase sin crear hogar.

#### Backend

* Endpoint `POST /api/auth/register` o wrapper sobre Supabase.
* Crear usuario Supabase.
* Crear `people` con `auth_user_id`.
* Validar email/password/display_name.
* Manejar rollback/compensación si falla `people`.
* Devolver session.

#### Frontend

* Pantalla Register.
* Inputs email/password/display_name.
* Google/Apple login disponibles.
* Loading y errores.
* Llamar `GET /api/auth/me` al terminar.

#### QA

* Registro exitoso.
* Email duplicado.
* Password débil.
* Error de red.
* No se crea household.
* No se crea membership.

#### Criterio de finalización

Usuario registrado puede iniciar sesión, existe `people` vinculada y `GET /api/auth/me` devuelve memberships vacío si no creó/se unió a hogar.

---

### Login

#### Tarea

Implementar login email/password.

#### Objetivo

Autenticar y obtener sesión Supabase.

#### Backend

* Endpoint `POST /api/auth/login` o Supabase SDK.
* Validar credenciales mediante Supabase.
* No revelar detalle de fallo.

#### Frontend

* Pantalla Login.
* Email/password.
* Link recovery.
* Botones Google/Apple.
* Llamar `GET /api/auth/me`.

#### QA

* Login exitoso.
* Password incorrecta.
* Email inexistente.
* Rate limit.
* Navegación correcta según memberships.

#### Criterio de finalización

Login establece sesión y navegación se resuelve solo con `GET /api/auth/me`.

---

### Social login

#### Tarea

Implementar Google OAuth y Apple OAuth.

#### Objetivo

Permitir todos los tipos de ingreso requeridos en MVP.

#### Backend

* Configurar providers Supabase.
* Crear/vincular `people` tras OAuth.
* Manejar errores de provider.

#### Frontend

* Botones Google/Apple.
* Redirect/deep link.
* Loading.
* Error si usuario cancela.

#### QA

* Google login nuevo.
* Google login existente.
* Apple login nuevo.
* Apple login existente.
* Cancelación provider.
* `people` creada/vinculada.

#### Criterio de finalización

Google y Apple permiten ingresar y `GET /api/auth/me` devuelve persona coherente.

---

### Password Recovery

#### Tarea

Implementar recuperación de contraseña delegada a Supabase.

#### Objetivo

Permitir reset profesional de password.

#### Backend

* Configurar Supabase recovery.
* Redirect seguro.
* Manejo de link inválido/vencido.

#### Frontend

* Forgot password.
* Email sent.
* Reset password.
* Login posterior.

#### QA

* Solicitud exitosa.
* Email inválido.
* Link vencido.
* Nueva contraseña débil.
* Login con nueva contraseña.

#### Criterio de finalización

Usuario puede recuperar contraseña sin sistema propio de tokens.

---

### Refresh Token

#### Tarea

Implementar refresh delegado a Supabase.

#### Objetivo

Mantener sesión sin tabla propia.

#### Backend

* Wrapper `POST /api/auth/refresh` si aplica.
* Manejar invalid/expired refresh.

#### Frontend

* Interceptor/auto-refresh.
* Sesión expirada si falla refresh.

#### QA

* Refresh exitoso.
* Refresh inválido.
* Refresh vencido.

#### Criterio de finalización

Sesión se renueva por Supabase y no existe tabla propia de refresh tokens.

---

### Logout

#### Tarea

Implementar logout.

#### Objetivo

Cerrar sesión actual.

#### Backend

* Wrapper `POST /api/auth/logout` si aplica.
* Delegar a Supabase.

#### Frontend

* Confirmación.
* Limpiar estado local.
* Navegar a Login/Welcome.

#### QA

* Logout exitoso.
* Token inválido.
* Sesión actual cerrada.
* Otras sesiones no afectadas.

#### Criterio de finalización

Usuario cierra sesión actual sin modificar memberships ni people.

---

### Current User / Me

#### Tarea

Implementar `GET /api/auth/me`.

#### Objetivo

Resolver estado actual y navegación.

#### Backend

* Derivar user desde Supabase token.
* Buscar `people` por `auth_user_id`.
* Devolver memberships visibles.
* Resolver active_household.
* Validar active_household membership active.

#### Frontend

* Usar en app start.
* Usar tras login/register/social/refresh.
* Navegar según respuesta.

#### QA

* No autenticado.
* Sin hogar.
* Pending.
* Active único.
* Multi-hogar.
* active_household inválido.

#### Criterio de finalización

Frontend no depende de storage local para decidir navegación principal.

---

### Crear hogar

#### Tarea

Implementar `POST /api/households`.

#### Objetivo

Crear hogar y membership coordinator atómicamente.

#### Backend

* Insert `households`.
* Insert `household_members`.
* `role='coordinator'`.
* `status='active'`.
* Update `people.active_household_id`.
* Transacción/RPC/Edge Function.
* Resolver RLS primer coordinator.

#### Frontend

* Create Household screen.
* Input name.
* Loading y errores.
* Navegar tras `GET /api/auth/me`.

#### QA

* Creación exitosa.
* Fallo en household.
* Fallo en membership rollback.
* Active household seteado.
* No hogar sin coordinator.

#### Criterio de finalización

No existe estado parcial y creador entra como coordinator active.

---

### Crear invite link

#### Tarea

Implementar creación de link de invitación.

#### Objetivo

Permitir al Coordinator compartir acceso para solicitar ingreso.

#### Backend

* Tabla `household_invite_links`.
* Endpoint `POST /api/households/:hid/invite-links`.
* Validar coordinator.
* Token opaco único.
* Expira 7 días.

#### Frontend

* Pantalla/link card.
* Crear, copiar, compartir.
* Mostrar vencimiento.

#### QA

* Coordinator crea link.
* Adult no puede.
* Link expira.
* Link revocado.

#### Criterio de finalización

Coordinator puede generar link reusable temporal y compartirlo.

---

### Usar invite link

#### Tarea

Implementar solicitud de ingreso por link.

#### Objetivo

Crear membership pending sin acceso interno.

#### Backend

* Endpoint `POST /api/invite-links/:token/join`.
* Validar link.
* Crear `household_members.pending`.
* `role=null`.
* Prevenir duplicados.

#### Frontend

* Abrir link.
* Login/Register si no hay sesión.
* Solicitar ingreso.
* Waiting Approval.

#### QA

* Link válido.
* Link vencido.
* Link revocado.
* Ya pending.
* Ya active.
* Pending no ve datos.

#### Criterio de finalización

Usar link crea solicitud pending y no otorga acceso directo.

---

### Aprobar/rechazar ingreso

#### Tarea

Implementar approve/reject.

#### Objetivo

Permitir al Coordinator controlar ingreso real.

#### Backend

* Endpoint approve.
* Endpoint reject.
* Validar coordinator.
* Validar member pending.
* Approve asigna rol y activa.
* Reject finaliza.

#### Frontend

* Lista de solicitudes.
* Selector de rol.
* Botones aprobar/rechazar.
* Loading y errores.

#### QA

* Approve exitoso.
* Reject exitoso.
* No coordinator 403.
* Rol inválido.
* Solicitud ya procesada.

#### Criterio de finalización

Solo Coordinator puede activar o rechazar solicitudes.

---

### Onboarding inicial de app

#### Tarea

Implementar onboarding global.

#### Objetivo

Introducir app sin depender de familia/rol técnico y evitar repetición en dispositivos nuevos.

#### Backend

* Campos en `people`.
* Endpoint para completar onboarding si aplica.

#### Frontend

* Welcome.
* Onboarding breve.
* Opción “Ya tengo cuenta”.
* No repetir si completed.

#### QA

* Usuario nuevo.
* Usuario existente en nuevo dispositivo.
* Onboarding incompleto.
* Opción login visible.

#### Criterio de finalización

Onboarding se completa una vez por persona y no se repite innecesariamente.

---

## 13. Decisiones de implementación

1. **Modelo de identidad final:** usar `auth.users + people + households + household_members`.
2. **No usar `accounts`:** Supabase `auth.users` cumple la función de cuenta autenticable.
3. **No usar `persons` separado:** la entidad de persona/perfil se llama `people`.
4. **`people.auth_user_id` nullable unique:** permite personas con o sin cuenta.
5. **Register no crea hogar:** register crea `auth.users`, `people` y sesión Supabase.
6. **Register no crea membership:** no asigna rol técnico ni hogar activo.
7. **Session no es tabla propia:** session significa sesión Supabase Auth.
8. **No tabla propia de refresh tokens:** refresh/logout delegan en Supabase.
9. **`people.active_household_id` define hogar visualizado:** no define pertenencia; pertenencia vive en `household_members`.
10. **`household_members` usa `person_id`:** no usa `user_id` directo.
11. **Estados membership:** `pending`, `active`, `suspended`, `finalized`.
12. **Soft delete de membership:** usar `finalized`, no `removed`.
13. **Rol nullable en pending:** `household_members.role` puede ser null solo con `status='pending'`.
14. **Enum técnico roles:** `coordinator`, `adult`, `adolescent`, `child`, `senior`, `guest`.
15. **`teen` descartado:** si aparece, es alias documental/migración de `adolescent`.
16. **`family_employee` POST_MVP:** fuera del MVP.
17. **Crear hogar atómico:** `POST /api/households` crea household + membership coordinator + active_household.
18. **`households.created_by_person_id`:** apunta a `people.id`.
19. **Links, no códigos:** usar `household_invite_links`; no join codes tipeables.
20. **Invite links reutilizables y temporales:** multiuso, expiran y pueden revocarse.
21. **Invite link expira en 7 días:** default MVP.
22. **Invite link no da acceso directo:** crea membership pending.
23. **`household_invite_links.created_by_member_id`:** permiso depende de membership/rol en hogar.
24. **Solo Coordinator crea invite links:** Adult queda POST_MVP para permisos delegados.
25. **Solo Coordinator aprueba ingresos:** también rechaza y asigna roles.
26. **Approve/reject explícitos:** endpoints separados para claridad y QA.
27. **Reject marca `finalized`:** no borra físicamente.
28. **Usuario pending ve espera:** no ve datos internos del hogar.
29. **Onboarding global de app vive en `people`:** evita repetición por dispositivo.
30. **Onboarding específico de hogar vive en `household_members` si aplica.**
31. **Onboarding no depende de aprobación familiar:** es introducción a la app.
32. **Role Selection es declarativo/UX:** no asigna rol técnico.
33. **Rol técnico final lo define Coordinator:** excepto creador de hogar que es coordinator automático.
34. **`GET /api/auth/me` obligatorio:** fuente de verdad de navegación.
35. **`GET /api/auth/me` no devuelve account:** devuelve user, person, memberships y active_household.
36. **Social login REAL:** Google y Apple en MVP mediante Supabase Auth.
37. **Password recovery REAL:** delegado profesionalmente a Supabase Auth.
38. **Email verification no bloquea onboarding inicial:** puede bloquear acciones autenticadas si Supabase lo exige.
39. **RLS obligatorio:** separación por hogar debe estar en DB.
40. **No implementar gestión avanzada de hogares:** solo lo mínimo para Auth/Onboarding.

---

## 14. Pendiente de definición

| Qué falta | Por qué importa | Depende de ello |
|---|---|---|
| Política exacta de creación/vinculación de `people` tras OAuth | Google/Apple pueden devolver datos distintos o emails ya existentes | Social login, QA |
| Política exacta de normalización de email | Evita duplicados y conflictos | Register/Login |
| Password policy completa | Solo está definido mínimo 8 en fragments | Frontend/backend validation |
| Si `display_name` se pide antes o después del onboarding inicial | Register necesita crear `people`, pero onboarding puede empezar antes | UI register/onboarding |
| Cómo manejar `auth.users` creado pero falla insert en `people` | Evita usuario sin perfil HomePlus | Backend rollback/compensación |
| Estrategia técnica de transacción para crear hogar | Se necesita atomicidad y bypass controlado de RLS inicial | Backend Supabase/RPC/Edge Function |
| Generación exacta de `households.slug` | Debe ser único | Crear hogar |
| Si se permiten múltiples coordinators | Afecta approve role y permisos | Roles/members |
| Índice único exacto para evitar duplicados membership | Debe permitir historial finalized sin duplicar active/pending | DB schema |
| Si membership finalized puede reactivar o debe crear nueva pending | Afecta reingreso por link | Invite links |
| Endpoint público de preview de invite link | UX puede necesitar mostrar nombre del hogar antes de join | Invite link UI |
| Qué datos mínimos mostrar en `household_preview` | Seguridad vs UX | Join link |
| Lista exacta de pasos de onboarding global | Necesaria para persistir `steps_completed` | Onboarding API |
| Si onboarding específico por hogar es obligatorio en MVP | Puede simplificarse | Frontend onboarding |
| Política de email verification en Supabase | Puede bloquear acciones autenticadas según configuración | Auth/security |
| Storage seguro de tokens en cliente | No definido en fragments | Frontend security |
| Límites/rate limit de crear invite links | Evita spam/abuso | Backend/security |
| Si invite links activos múltiples por hogar están permitidos | Afecta UX y DB | Invite link management |
| Notificaciones al Coordinator por join request | No está en alcance Auth real | Notifications/Post-MVP |
| Notificación al usuario aprobado/rechazado | Puede ser polling via `GET /api/auth/me` en MVP | UX |
| Auditoría técnica exacta de eventos nuevos | Algunos eventos son adoptados tras decisión nueva | Audit/events |

---

## 15. A REVISIÓN

### 1. Register creaba hogar vs register solo crea persona

* Fragment anterior/API decía: `POST /api/auth/register` crea `auth.users`, `households`, `household_members` y devuelve `household_id`/`member_id`.
* Decisión final: register no crea hogar ni membership.
* Motivo: evita hogares duplicados durante onboarding y permite dos caminos posteriores: crear hogar o solicitar ingreso por link.
* Impacto: se reemplaza el contrato anterior de register. Crear hogar pasa a `POST /api/households`.
* Estado: Resuelto por decisión de implementación.

### 2. `household_members.user_id` vs `people` + `person_id`

* Fragment DB anterior decía: `household_members.user_id` nullable hacia `auth.users`.
* Decisión final: crear tabla `people` y usar `household_members.person_id`.
* Motivo: normalización simple y preparada para multi-hogar, personas sin cuenta y perfiles independientes de Auth.
* Impacto: requiere migrar/adaptar schema anterior.
* Estado: Resuelto por decisión de implementación.

### 3. `accounts + persons` vs `people`

* Propuesta intermedia: crear `accounts`, `persons` y `household_members`.
* Decisión final: no usar `accounts` ni `persons`; usar `people`.
* Motivo: `auth.users` ya es cuenta autenticable; separar tres tablas sería sobre-normalización para MVP.
* Impacto: specs deben eliminar referencias a `accounts`.
* Estado: Resuelto por decisión de implementación.

### 4. `teen` vs `adolescent`

* Fragment DB anterior usaba `teen`.
* Decisión final: valor técnico oficial `adolescent`.
* Motivo: unificar backend/frontend/base de datos con roles MVP definidos.
* Impacto: si existe schema con `teen`, requiere migración o alias temporal.
* Estado: Resuelto por decisión de implementación.

### 5. Invitaciones single-use vs links reutilizables

* Fragment API anterior decía: invitación individual con token único, single-use, email obligatorio y aceptación directa.
* Decisión final: `household_invite_links` reusable, temporal, revocable, sin código manual.
* Motivo: UX familiar simple; un Coordinator comparte un link y las personas solicitan ingreso.
* Impacto: se reemplaza `invitations` como flujo principal MVP.
* Estado: Resuelto por decisión de implementación.

### 6. Join code vs link

* Propuesta intermedia: código reusable tipo Classroom.
* Decisión final: eliminar join code tipeable; usar solo link.
* Motivo: simplificar UX y evitar manejo manual de códigos.
* Impacto: endpoints usan token de link, no `code`.
* Estado: Resuelto por decisión de implementación.

### 7. Aceptación directa vs aprobación Coordinator

* Fragment API anterior decía: aceptar invitación crea/activa membership.
* Fragments conceptuales mencionaban Invitación → Aceptación → Aprobación → Ingreso.
* Decisión final: link crea membership pending; Coordinator aprueba y asigna rol.
* Motivo: link reusable no debe otorgar acceso automático al hogar.
* Impacto: requiere endpoints approve/reject y pantalla pending.
* Estado: Resuelto por decisión de implementación.

### 8. Adult puede invitar vs solo Coordinator

* Algunos fragments conceptuales permitían Adult con permiso.
* Decisión final: solo Coordinator crea invite links y aprueba ingresos en MVP.
* Motivo: seguridad y simplicidad.
* Impacto: permisos delegables quedan POST_MVP.
* Estado: Resuelto por decisión de implementación.

### 9. Onboarding después de aprobación vs onboarding de app

* Propuesta intermedia: onboarding por rol después de aprobación.
* Decisión final: onboarding principal es introducción a la app y no depende de aprobación familiar.
* Motivo: onboarding interioriza al usuario en la app; la familia ya es conocida por el usuario.
* Impacto: onboarding global vive en `people`; onboarding específico por hogar es separado/opcional.
* Estado: Resuelto por decisión de implementación.

### 10. Role Selection asigna rol vs dato UX

* Pantallas anteriores mostraban selección de rol.
* Decisión final: Role Selection es declarativo/UX y no asigna rol técnico.
* Motivo: el Coordinator define el rol final dentro del hogar.
* Impacto: frontend no debe confiar en Role Selection para permisos.
* Estado: Resuelto por decisión de implementación.

### 11. Social login POST_MVP vs REAL

* Merge anterior dejaba Google/Apple POST_MVP.
* Decisión final: Google/Apple son REAL en MVP.
* Motivo: fueron requisito previo del proyecto.
* Impacto: Auth debe incluir Supabase OAuth completo.
* Estado: Resuelto por decisión de implementación.

### 12. Password recovery POST_MVP vs REAL delegado

* Merge anterior dejaba recuperación de contraseña POST_MVP.
* Decisión final: recuperación es REAL y delegada a Supabase Auth.
* Motivo: flujo profesional básico de Auth.
* Impacto: UI/API deben contemplarlo.
* Estado: Resuelto por decisión de implementación.

### 13. Email verification bloqueante vs no bloqueante onboarding inicial

* Fragment UI mencionaba verificación.
* Decisión final: no bloquea onboarding inicial porque puede ocurrir antes de crear cuenta.
* Motivo: onboarding inicial no depende de cuenta. Supabase puede bloquear acciones autenticadas si se configura.
* Impacto: definir configuración Supabase exacta queda pendiente.
* Estado: Resuelto por decisión de implementación con pendiente técnica.

---

## 16. Fuentes usadas

### `auth_fragment_api_edgecases_testcases.md`

Información incorporada:

* Contratos base de register, login, refresh y logout como punto de partida.
* Errores de credenciales, refresh token e email duplicado.
* Idea de invitaciones, expiración y membership.

Información reemplazada por decisiones finales:

* Register ya no crea hogar ni membership.
* Invitaciones single-use ya no son flujo principal MVP.
* Accept invitation directo se reemplaza por solicitud pending + approval.

### `auth_fragment_base_de_datos_v1.md`

Información incorporada:

* `auth.users` como Supabase Auth.
* `households`.
* `household_members`.
* Estados `pending`, `active`, `suspended`, `finalized`.
* RLS y separación por hogar.
* Soft delete lógico.

Información reemplazada por decisiones finales:

* `household_members.user_id` se reemplaza por `household_members.person_id`.
* Se agrega `people` como entidad técnica.
* Se normaliza `teen` → `adolescent`.

### `auth_fragment_diseño_de_pantalla_de_auth(1).md`

Información incorporada:

* Pantallas Login, Register, Session Expired, Logout Confirm.
* Email/password.
* Google OAuth.
* Apple OAuth.
* Recuperación de contraseña.
* Sesión Supabase.

Información ajustada:

* Google/Apple pasan a REAL en MVP.
* Password recovery pasa a REAL delegado a Supabase.

### `auth_fragment_diseño_de_pantalla_para_onboarding(1).md`

Información incorporada:

* Welcome/onboarding.
* Selección de rol como pantalla/experiencia.
* Creación de hogar después de registro.
* Invitación inicial de miembros.
* Link válido por 7 días.
* Onboarding por rol/experiencia.

Información ajustada:

* Role Selection no asigna rol técnico.
* Onboarding principal es introducción a la app.
* Link crea solicitud pending y requiere aprobación.

### `auth_fragment_eventos_del_sistema_v1(1).md`

Información incorporada:

* `user.registered`.
* `user.onboarding_completed`.
* `household.created`.
* Invitaciones y aceptación como eventos base.
* Audit como consumidor.

Información ajustada:

* Eventos de invitación se adaptan a `invite_link.created`, `member.join_requested`, `member.approved`, `member.rejected`.

### `auth_fragment_design_system_v1(1).md`

Información incorporada:

* Reglas de inputs.
* Loading/spinner/toast.
* Accesibilidad.
* Senior mode / experiencia adaptada.

Información ignorada:

* Tokens visuales no necesarios para spec funcional.

### `auth_fragment_product(1).md`

Información incorporada:

* Valor desde minuto 1.
* Multi-hogar conceptual.
* Persona puede participar en varios hogares.
* Privacidad individual.

Información ignorada:

* Funcionalidades no Auth.

### `auth_fragment_principios_del_producto(1).md`

Información incorporada:

* Onboarding simple.
* Valor rápido.
* Separación por hogar.
* Datos privados por defecto.
* Empleado Familiar fuera de MVP.

Información ignorada:

* Módulos operativos fuera de Auth.

### `auth_fragment_philosophy(1).md`

Información incorporada:

* Cuenta/persona/hogar/membership.
* Roles por hogar.
* Datos no se cruzan entre hogares.

Información ignorada:

* Filosofía no implementable fuera de Auth.

### `auth_fragment_emotional_design(1).md`

Información incorporada:

* Privacidad individual.
* Guest limitado.
* Senior simplificado.
* Coordinador administra hogar, no vida privada.

Información ignorada:

* Copy emocional no contractual.

### `auth_fragment_filosofia_ux(1).md`

Información incorporada:

* Onboarding con valor en el primer minuto.
* App enseña usándose.
* Campos de onboarding por rol.

Información ajustada:

* Onboarding global no depende de rol técnico confirmado.

### `auth_fragment_final_spec(1).md`

Información incorporada:

* Cuenta pertenece al usuario.
* Membership como vínculo persona-hogar.
* Roles y permisos conceptuales.
* Guest limitado.

Información ignorada:

* Módulos no Auth.

### `auth_fragment_ai_philosophy(1).md`

Información incorporada:

* Privacidad de memoria/datos personales.
* Ningún rol accede automáticamente a datos privados.

Información ignorada:

* Geni avanzado.

### `auth_fragment_data_philosophy(1).md`

Información incorporada:

* RLS como filtro de base.
* Credenciales/tokens no se guardan como memorias.
* Seguridad y privacidad.

Información ignorada:

* Cierre de cuenta/exportación en MVP.

### `auth_fragment_relationship_philosophy(1).md`

Información incorporada:

* Relaciones por hogar.
* Roles independientes por hogar.
* No relaciones entre hogares.

Información ignorada:

* Relaciones operativas fuera de Auth.

### `auth_fragment_ux_writing_guide_para_geni(1).md`

Información incorporada:

* Copy y tratamiento.
* Nombre del hogar.
* Rol como pregunta de onboarding.
* Privacidad por rol.

Información ajustada:

* Rol de onboarding es declarativo/UX, no técnico.

### `auth_fragment_diseño_de_pantalla_para_home(1).md`

Información incorporada:

* Home como destino posterior.
* Primer uso post-onboarding.
* Adaptación por rol.

Información ignorada:

* Home Dashboard y cards no necesarias para Auth.

---

# Anexo — Decisiones finales aplicadas

```text
D1: usar auth.users + people + households + household_members.
D2: la tabla de persona/perfil se llama people.
D3: people.auth_user_id es nullable unique.
D4: register crea auth.users + people + session de Supabase; no crea hogar ni membership.
D5: people contiene datos personales globales, preferencias básicas y active_household_id.
D6: people.active_household_id define el hogar actualmente seleccionado/visualizado por la persona.
D7: household_members usa person_id como FK a people.
D8: membership statuses son pending, active, suspended, finalized.
D9: household_members.role puede ser null mientras status = pending.
D10: POST /api/households crea hogar + membership coordinator de forma atómica.
D11: households.created_by_person_id apunta a people.id.
D12: usar household_invite_links reutilizables y temporales; no usar join codes.
D13: household_invite_links.created_by_member_id apunta a household_members.id.
D14: invite link statuses son active, expired, revoked.
D15: invite link expira en 7 días.
D16: invite link es multiuso y previene duplicados por person_id + household_id.
D17: POST /api/invite-links/:token/join crea una membership pending.
D18: solo coordinator aprueba ingresos y asigna roles.
D19: solo coordinator crea invite links en MVP.
D20: usar endpoints approve/reject explícitos; reject marca finalized.
D21: usuario pending ve pantalla de espera sin datos internos del hogar.
D22: onboarding es introducción a la app y puede ocurrir antes de login/register o al primer uso del dispositivo. No depende de aprobación familiar.
D23: Role Selection es declarativo/UX. No asigna rol técnico. El rol técnico final lo define siempre el Coordinator, excepto el creador de un hogar, que queda coordinator automáticamente.
D24: onboarding principal de app vive en people. Onboarding específico de hogar/rol vive en household_members si aplica.
D25: GET /api/auth/me devuelve user, person, memberships y active_household.
D26: social login con Google y Apple es REAL en MVP mediante Supabase Auth.
D27: recuperación de contraseña es REAL y delegada a Supabase Auth.
D28: email verification no bloquea onboarding inicial de app; puede bloquear acciones autenticadas si Supabase lo exige.
D29: refresh/logout son wrappers sobre Supabase; no hay tabla propia de refresh tokens ni sessions.
```
