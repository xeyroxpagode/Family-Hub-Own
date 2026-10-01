# AUTH + ONBOARDING fragment — HomePlus — SECCION 3 FILOSOFIA

## 1. Información encontrada

### Objetivo del módulo

No se encontró una sección específica de Auth ni un objetivo técnico para autenticación.

Sí se encontró información transversal útil para Auth + Onboarding:

* La identidad operativa se organiza alrededor de `Cuenta`, `Persona`, `Hogar` y `Membership`.
* `Cuenta` pertenece al usuario, no al hogar.
* `Persona` representa a una persona, pertenece a una cuenta y puede participar en uno o más hogares.
* `Hogar` es la unidad organizativa principal: todo ocurre dentro de un hogar.
* `Membership` representa la relación entre persona y hogar.
* La coordinación depende del contexto del hogar: los roles son independientes por hogar y los datos no se cruzan entre hogares.

### Entidades

#### Cuenta

* Entidad Core.
* Pertenece al usuario, no al hogar.
* Se menciona que contiene perfil, preferencias e idioma.
* No se definen credenciales ni campos de autenticación.

#### Persona

* Entidad People.
* Representa una persona.
* Pertenece a una cuenta.
* Puede participar en uno o más hogares.

#### Hogar

* Entidad Core.
* Es la unidad organizativa principal.
* Todo ocurre dentro de un hogar.

#### Membership

* Entidad People.
* Relaciona persona y hogar.
* Tiene rol asociado.
* Estados encontrados:
  * `Pendiente`
  * `Activa`
  * `Suspendida`
  * `Finalizada`

#### Rol

Roles encontrados y mapeo al MVP:

| Nombre en documento | Nombre MVP |
| ------------------- | ---------- |
| Coordinador | Coordinator |
| Adulto | Adult |
| Adolescente | Adolescent |
| Niño | Child |
| AdultoMayor / Adulto Mayor | Senior |
| Invitado | Guest |

#### Invitación

* Aparece como workflow conceptual.
* Flujo encontrado: `Invitación → Aceptación → Aprobación → Ingreso al hogar`.
* No se define una entidad técnica con campos.

### Campos

#### Cuenta

Campos mencionados sin tipo ni contrato:

* perfil
* preferencias
* idioma

No se encontraron campos para:

* email
* password
* provider
* avatar
* nombre
* teléfono
* estado de cuenta
* verificación de email

#### Persona

No se definen campos técnicos.

Solo se indica que:

* pertenece a una cuenta
* puede participar en uno o más hogares

#### Membership

Campos implícitos por relaciones:

* persona
* hogar
* rol
* estado

No se definen nombres técnicos, tipos ni restricciones.

#### Onboarding

Preguntas encontradas en onboarding/configuración periódica:

* disponibilidad diaria para tareas del hogar:
  * `1-2hs`
  * `3-4hs`
  * `5+hs`
* existencia de limitación física o de salud que afecte capacidad
* período de alta carga externa, con ejemplos:
  * exámenes
  * proyecto laboral intenso
  * cuidado de alguien

No se define cómo se guardan estas respuestas ni si pertenecen a `Persona`, `Membership` u otra entidad.

### Tipos

No se encontraron tipos técnicos formales.

Solo aparecen valores enumerables conceptuales para:

* disponibilidad diaria
* estados de Membership
* roles

### Valores por defecto

No se encontraron valores por defecto para Auth, sesión, token, usuario, cuenta, persona, hogar, invitación ni onboarding.

### Restricciones

* La cuenta pertenece al usuario, no al hogar.
* La persona puede participar en más de un hogar.
* Los roles son contextuales al hogar.
* Los datos de un hogar no se cruzan con los de otro.
* Las relaciones familiares son informativas y no modifican permisos automáticamente.
* Ningún rol obtiene acceso automático a datos privados personales.
* Los Coordinadores no pueden eliminar hogares.

### Relaciones

| Origen | Relación | Destino | Estado |
| ------ | -------- | ------- | ------ |
| Persona | pertenece a | Cuenta | explícita |
| Persona | tiene | Membership | explícita |
| Membership | vincula | Hogar | explícita |
| Membership | tiene rol | Coordinador / Adulto / Adolescente / Niño / AdultoMayor / Invitado | explícita |
| Persona | participa en | Hogar | explícita/conceptual |
| Invitación | deriva en | aceptación, aprobación e ingreso al hogar | conceptual |

### Cardinalidad

* Una `Persona` pertenece a una `Cuenta`.
* Una `Persona` puede participar en uno o más `Hogar`.
* Una `Persona` puede tener múltiples `Membership`, una por contexto de hogar.
* Cada `Membership` vincula una persona con un hogar y un rol.

No se definen cardinalidades máximas para hogares, miembros o invitaciones.

### Estados posibles

#### Membership

Estados encontrados:

* `Pendiente`
* `Activa`
* `Suspendida`
* `Finalizada`

#### Invitation

No se encontraron estados técnicos.

#### Session / Token / RefreshToken

No se encontraron estados.

#### Onboarding

No se encontraron estados.

### Reglas de negocio

#### Identidad y hogar

* La coordinación se define por contexto de hogar.
* Una persona puede tener roles distintos en hogares distintos.
* Los roles no se heredan entre hogares.
* Los datos no se cruzan entre hogares.

#### Invitaciones

* El flujo conceptual de invitación incluye aceptación, aprobación e ingreso al hogar.
* Adulto puede invitar personas.
* Coordinador aprueba ingresos.

#### Roles

* Coordinador es responsable administrativo principal.
* Adulto es miembro operativo con permisos amplios.
* Adolescente tiene autonomía progresiva.
* Niño tiene experiencia simplificada.
* Adulto Mayor tiene experiencia adaptada.
* Invitado tiene participación limitada y acceso mínimo.

#### Onboarding

* En onboarding o configuración periódica, cada miembro responde sobre disponibilidad, limitaciones y carga externa.
* La disponibilidad declarada sirve como información de contexto para distribución de carga, pero el documento no define implementación Auth ni endpoints.

### Permisos

| Rol MVP | Permisos encontrados |
| ------- | -------------------- |
| Coordinator | Aprueba ingresos, cambia roles, expulsa miembros, transfiere coordinación; administra personas, permisos y configuración en el hogar. |
| Adult | Invita personas, crea/reasigna tareas y administra operaciones. |
| Adolescent | Tiene autonomía progresiva; crea eventos familiares y administra tareas propias. |
| Child | Tiene experiencia simplificada; no administra información familiar crítica. |
| Senior | Tiene experiencia adaptada. |
| Guest | Participación limitada; acceso mínimo. |

Permisos transversales encontrados:

* Las relaciones familiares no modifican permisos automáticamente.
* Los permisos dependen del rol dentro de la membresía del hogar.
* Ningún rol obtiene acceso automático a datos privados personales.

### Flujos

#### Register

No encontrado.

#### Login

No encontrado.

#### Refresh Token

No encontrado.

#### Logout

No encontrado.

#### Crear hogar durante registro

No encontrado.

#### Invitar miembros durante onboarding

Parcialmente encontrado.

Flujo conceptual disponible:

1. Invitación.
2. Aceptación.
3. Aprobación.
4. Ingreso al hogar.

Información adicional:

* Adulto puede invitar personas.
* Coordinador aprueba ingresos.

No se define si este flujo ocurre durante onboarding, después del registro o desde gestión de miembros.

#### Onboarding por rol

Parcialmente encontrado.

El documento describe roles y algunas experiencias/permisos por rol, pero no define un flujo de onboarding específico para cada rol MVP.

Información encontrada por rol:

* Coordinator: rol administrativo principal.
* Adult: rol operativo amplio.
* Adolescent: autonomía progresiva.
* Child: experiencia simplificada.
* Senior: experiencia adaptada.
* Guest: acceso mínimo.

### APIs

No se encontraron endpoints ni contratos API.

No se encontraron:

* método HTTP
* ruta
* request
* response
* errores
* payload de register
* payload de login
* payload de refresh token
* payload de logout
* payload de creación de hogar
* payload de invitación
* payload de aceptación de invitación

### Request

No encontrado.

### Response

No encontrado.

### UI

No se encontraron pantallas ni componentes específicos para:

* Login
* Register
* Refresh Token
* Logout
* Crear hogar durante registro
* Invitar miembros durante onboarding
* Aceptar invitación
* Onboarding por rol

Se encontró solamente información conceptual sobre:

* roles por hogar
* experiencia simplificada/adaptada para algunos roles
* preguntas de disponibilidad durante onboarding/configuración periódica

### Componentes UI

No se encontraron componentes UI concretos para Auth + Onboarding.

### Navegación

No se encontró navegación específica de Auth + Onboarding.

### Eventos del sistema

No se encontraron nombres técnicos de eventos.

Eventos conceptuales sin nombre técnico:

* invitación creada
* invitación aceptada
* ingreso aprobado
* miembro ingresado al hogar
* cambio de rol
* expulsión de miembro

### Dependencias

Auth + Onboarding depende conceptualmente de:

* Cuenta
* Persona
* Hogar
* Membership
* Role
* Invitación
* Permisos por rol

### Restricciones arquitectónicas

* Separación de datos por hogar.
* Roles independientes por hogar.
* Contexto operativo definido por la membresía activa.
* Privacidad individual en datos personales.
* Los cambios importantes de membresía/rol aparecen vinculados a auditoría, pero no se define implementación.

### Casos de uso

Casos de uso encontrados o parcialmente encontrados:

* Persona vinculada a cuenta.
* Persona ingresa a hogar mediante invitación, aceptación, aprobación e ingreso.
* Coordinador aprueba ingresos.
* Adulto invita personas.
* Coordinador cambia roles.
* Coordinador expulsa miembros.
* Miembro responde preguntas de disponibilidad/capacidad durante onboarding o configuración periódica.

### Casos especiales

* Una misma persona puede tener distintos roles en distintos hogares.
* Las relaciones familiares no cambian permisos automáticamente.
* La aprobación aparece como paso intermedio entre aceptación e ingreso al hogar.

### Edge cases

* Falta definir qué ocurre si una invitación es aceptada pero no aprobada.
* Falta definir qué ocurre si la membresía queda `Pendiente`, `Suspendida` o `Finalizada`.
* Falta definir cómo se selecciona el hogar activo después de login.
* Falta definir si register crea siempre una persona.
* Falta definir si register crea siempre un hogar o puede unirse por invitación.

### Datos mockeados

No se encontró información mockeada para Auth + Onboarding.

### Funcionalidades REAL

Información real extraíble para MVP desde este documento:

* Cuenta como identidad de usuario, sin campos de auth definidos.
* Persona asociada a cuenta.
* Hogar como contexto operativo.
* Membership como relación persona-hogar.
* Rol asociado a membership.
* Roles MVP encontrados en español y mapeables a inglés.
* Invitación como flujo conceptual hacia ingreso al hogar.
* Adulto puede invitar personas.
* Coordinador aprueba ingresos.
* Separación de datos por hogar.
* Roles independientes por hogar.
* Preguntas de onboarding sobre disponibilidad/capacidad/carga externa, sin contrato técnico.

### Funcionalidades MOCK

No se encontró información mockeada para este módulo.

### Funcionalidades POST_MVP

* Uso avanzado de disponibilidad, carga temporal y capacidad para ajustar carga operativa automáticamente.
* Gestión avanzada de cambio de rol, expulsión y transferencia de coordinación, si excede la gestión básica de miembros del MVP.
* Soporte completo de múltiples hogares con selector/contexto avanzado, si excede la separación mínima por hogar requerida por MVP.

---

## 2. Clasificación para implementación

### REAL

#### Identidad base

* Implementar el concepto de `Cuenta` como identidad del usuario.
* Implementar el concepto de `Persona` asociada a cuenta.
* No se pueden derivar campos técnicos desde este documento.

#### Hogar y membresía

* Implementar `Hogar` como unidad organizativa principal.
* Implementar `Membership` como relación entre persona y hogar.
* La membresía debe contener rol dentro del hogar.
* Los datos deben separarse por hogar.
* Los roles son independientes por hogar.

#### Roles MVP

Usar los siguientes mapeos:

| Documento | MVP |
| --------- | --- |
| Coordinador | Coordinator |
| Adulto | Adult |
| Adolescente | Adolescent |
| Niño | Child |
| AdultoMayor / Adulto Mayor | Senior |
| Invitado | Guest |

#### Invitaciones

* Existe flujo conceptual de invitación.
* Secuencia encontrada: `Invitación → Aceptación → Aprobación → Ingreso al hogar`.
* Adulto puede invitar personas.
* Coordinador aprueba ingresos.

#### Onboarding

* El documento menciona onboarding/configuración periódica con preguntas de disponibilidad y capacidad.
* No define flujo técnico de onboarding por rol.

### MOCK

No se encontró información para simular Auth + Onboarding con mock.

### POST_MVP

* Ajustes avanzados de carga a partir de disponibilidad/capacidad/carga externa.
* Automatización de distribución contextual de tareas.
* Gestión avanzada de múltiples hogares más allá de la separación mínima de datos por hogar.
* Gestión avanzada de miembros como expulsión, transferencia de coordinación o workflows completos de cambio de rol, si no forman parte de la gestión básica MVP.

### IGNORAR

No aplica.

---

## 3. Información faltante

### Auth

* No se encontró Register.
* No se encontró Login.
* No se encontró Refresh Token.
* No se encontró Logout.
* No se encontró Session.
* No se encontró RefreshToken.
* No se encontraron endpoints.
* No se encontraron request/response.
* No se encontraron errores.
* No se encontraron campos de credenciales.
* No se encontró política de expiración de tokens.
* No se encontró rotación de refresh token.
* No se encontró invalidación de sesión.

### Register + creación de hogar

* No se define si el registro crea una cuenta, una persona, un hogar o una membresía.
* No se define creación de hogar durante registro.
* No se define si el primer usuario del hogar se convierte automáticamente en Coordinator.
* No se define si register puede aceptar una invitación existente.

### Invitations

* No se definen campos de invitación.
* No se define token/código de invitación.
* No se define expiración.
* No se definen estados.
* No se define si la aceptación crea membership inmediatamente o si queda pendiente de aprobación.
* No se define quién puede aceptar una invitación.
* No se define qué errores existen para invitaciones inválidas, vencidas, usadas o rechazadas.

### Onboarding

* No se define onboarding por cada rol MVP.
* No se define estructura de pantallas.
* No se define orden de pasos.
* No se define si onboarding ocurre antes o después de crear hogar.
* No se define si onboarding ocurre antes o después de aceptar invitación.
* No se define dónde se guardan las respuestas de disponibilidad/capacidad.
* No se define si las preguntas de disponibilidad son obligatorias.

### Roles y permisos

* Faltan permisos para todas las acciones MVP de Auth + Household.
* Faltan permisos específicos para aceptar invitación.
* Faltan permisos específicos para crear hogar.
* Faltan permisos específicos para editar configuración básica del hogar.
* Faltan restricciones completas para Guest, Child, Senior y Adolescent.
* El documento menciona aprobación de ingresos por Coordinator, pero el MVP también pide aceptar invitación; la relación entre aceptación y aprobación queda ambigua.

### Entidades y nombres

* `Cuenta`, `Account`, `User` y `Persona` no están normalizados.
* No se define si `Cuenta` y `User` son equivalentes.
* No se define si `Persona` existe siempre por cuenta o puede haber múltiples personas por cuenta.
* No se definen ids, timestamps ni claves foráneas.

### Contradicciones o riesgos

* El flujo encontrado de invitación incluye aprobación antes del ingreso, pero el MVP solicitado solo explicita aceptar invitación. Debe validarse si aprobación es obligatoria en MVP o si queda como paso posterior.
* El documento presenta roles por hogar y pertenencia a múltiples hogares; para MVP debe extraerse solo la separación mínima por hogar y no convertir esto en multi-hogar avanzado.
* Las preguntas de disponibilidad pertenecen a onboarding/configuración, pero su uso real para distribución de carga puede expandir Planner; no debe implementarse como automatización avanzada desde este fragment.

---

## 4. Fuente

* Archivo: `HomePlus — SECCION 3 FILOSOFIA.md`
  * Sección: `POLARIDADES RESUELTAS`
  * Apartado: `1. AUTONOMÍA INDIVIDUAL vs COHESIÓN GRUPAL`
  * Apartado: `5. OPTIMIZACIÓN DE TAREAS vs RESPETO AL CONTEXTO HUMANO`
  * Apartado: `6. ADOPCIÓN GRADUAL vs COMPROMISO TOTAL`
  * Apartado: `EJEMPLOS FILOSÓFICOS: CÓMO HomePlus DISUELVE LA JERARQUÍA FAMILIAR TRADICIONAL`
  * Subapartado: `A. Multi-hogar real: la identidad no es una, es contextual`

* Archivo: `Seccion 3 Filosofia.txt`
  * Sección: `OUTPUT 1 — ENTITIES`
  * Sección: `OUTPUT 2 — RELATIONSHIPS`
  * Sección: `OUTPUT 4 — DATA FLOWS`
  * Sección: `OUTPUT 5 — BUSINESS RULES`
  * Sección: `OUTPUT 6 — ARCHITECTURAL DECISIONS`
  * Sección: `OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS`

* Archivo: `source_map_HomePlus_SECCION_3_FILOSOFIA.md`
  * Sección: `4.1 AUTH`
  * Sección: `4.2 ONBOARDING`
  * Sección: `4.3 HOUSEHOLD`
  * Sección: `4.4 MEMBERSHIP`
  * Sección: `4.5 INVITATIONS`
  * Sección: `4.6 ROLES & PERMISSIONS`
  * Sección: `17. Contradicciones detectadas`
  * Sección: `18. Información faltante`
