# AUTH fragment — HomePlus — SECCION 5 RELATIONSHIP PHILOSOPHY

## 1. Información encontrada

### Objetivo del módulo

No se encontró un objetivo específico de AUTH en este documento.

La información útil para este fragmento es contextual y transversal: el documento establece que el ecosistema comparte Personas, Roles y Permisos, y que las conexiones entre entidades deben respetar privacidad, rol y ámbito dentro del hogar.

### Entidades

#### Cuenta

* Entidad asociada al usuario.
* Pertenece al usuario, no al hogar.
* El documento de comprensión la describe como parte del dominio People.
* No se encontraron campos técnicos de autenticación asociados a Cuenta.

#### Persona

* Representa a un miembro del ecosistema.
* Pertenece a una Cuenta.
* Puede participar en múltiples hogares mediante Membership.
* Puede relacionarse con dominios operativos como responsable, participante o sujeto de una entidad, siempre bajo reglas de visibilidad por rol y ámbito.

#### Membership

* Relación entre Persona y Hogar.
* Tiene un Rol asociado.
* Cada Membership posee un único rol activo.
* El archivo de comprensión lista estados de Membership: Pendiente, Activa, Suspendida, Finalizada.

#### Hogar

* Unidad organizativa independiente.
* Un usuario puede pertenecer a múltiples hogares.
* Cada hogar tiene sus propios roles, módulos y datos.
* No existen relaciones entre hogares.
* La operación debe ocurrir dentro de un contexto de hogar activo.

#### Rol

Roles encontrados en español y mapeables al set solicitado para MVP:

| Rol en documento | Rol MVP equivalente |
| --- | --- |
| Coordinador | Coordinator |
| Adulto | Adult |
| Adolescente | Adolescent |
| Niño | Child |
| AdultoMayor / Adulto Mayor | Senior |
| Invitado | Guest |

Rol adicional encontrado:

| Rol en documento | Clasificación |
| --- | --- |
| EmpleadoFamiliar / Empleado Familiar | POST_MVP |

#### Invitacion

* Aparece en el archivo de comprensión como workflow conceptual.
* No aparece como entidad de datos completa con campos técnicos.
* Flujo encontrado: Invitación → Aceptación → Aprobación, si corresponde → Ingreso al hogar.

### Campos

#### Cuenta

Campos mencionados en el archivo de comprensión:

* perfil
* preferencias
* idioma

No se encontraron tipos, obligatoriedad, defaults ni restricciones para esos campos.

#### Persona

No se encontraron campos concretos de Persona para implementación.

#### Membership

No se encontraron campos técnicos como `person_id`, `household_id`, `role_id`, `status`, `created_at` o equivalentes.

Sí se encontró la relación conceptual:

* Persona → Membership
* Membership → Hogar
* Membership → Rol

#### Invitacion

No se encontraron campos como token, código, email, teléfono, rol invitado, expiración, invitado por, fecha de aceptación o estado.

#### Auth / Session / Token

No se encontraron campos para:

* credenciales
* password
* password hash
* provider
* sesión
* access token
* refresh token
* expiración de token
* revocación de token
* dispositivo

### Tipos

No se encontraron tipos técnicos para entidades de AUTH, Session, Token, RefreshToken, Register, Login ni Logout.

### Valores por defecto

No se encontraron valores por defecto para AUTH u onboarding.

### Restricciones

* La autenticación o pertenencia al sistema no otorga visibilidad automática sobre información de otros miembros.
* La visibilidad depende del rol del usuario y del ámbito de la entidad consultada.
* Si una relación existe pero el usuario no tiene visibilidad sobre todos sus eslabones, esa relación no debe mostrarse.
* Cada hogar mantiene datos independientes.
* No existen relaciones entre hogares.
* Las relaciones familiares registradas, como Madre, Padre, Hijo, Hija, Abuelo, Abuela, Hermano, Hermana o Tutor, son informativas y no modifican permisos automáticamente.
* El rol activo pertenece a la Membership dentro de un hogar, no a la Cuenta global.

### Relaciones

| Origen | Relación | Destino | Uso para este fragment |
| --- | --- | --- | --- |
| Persona | belongs_to | Cuenta | Separar identidad/cuenta de membresía en hogar. |
| Persona | has | Membership | Modelar pertenencia a hogares. |
| Membership | belongs_to | Hogar | Asociar ingreso del usuario/persona a un hogar. |
| Membership | has | Rol | Determinar permisos por hogar. |
| Persona | has | RelacionFamiliar | Relación informativa, sin impacto automático en permisos. |
| Invitacion | conduce a | Membership / ingreso al hogar | Flujo conceptual de ingreso por invitación. |

### Cardinalidad

* Una Persona puede participar en múltiples hogares.
* Cada Membership posee un único rol activo.
* No se encontró cardinalidad técnica para Cuenta ↔ Persona.
* No se encontró cardinalidad técnica para Invitacion ↔ Persona/Hogar.

### Estados posibles

#### Membership

Estados encontrados:

* Pendiente
* Activa
* Suspendida
* Finalizada

No se encontró mapeo técnico a enums en inglés.

#### Invitation

No se encontraron estados de invitación.

#### Session / Token

No se encontraron estados de sesión ni token.

#### Onboarding

No se encontraron estados de onboarding.

### Reglas de negocio

* Los permisos dependen del rol dentro del hogar.
* La relación familiar entre personas no modifica permisos.
* Un usuario puede tener roles distintos en distintos hogares, porque el rol está asociado a la Membership.
* Un hogar no puede relacionar sus entidades con entidades de otro hogar.
* La operación debe respetar el contexto del hogar activo.
* Adulto aparece con capacidad para invitar personas.
* Coordinador aparece con capacidad para aprobar ingresos, cambiar roles y expulsar miembros.
* No se encontró si Coordinador también puede crear invitaciones.
* No se encontró si Guest, Child, Adolescent o Senior pueden invitar miembros.

### Permisos

Permisos encontrados explícitamente o en el archivo de comprensión:

| Rol | Permisos encontrados relevantes para AUTH / onboarding |
| --- | --- |
| Coordinator / Coordinador | Aprueba ingresos, cambia roles, expulsa miembros. |
| Adult / Adulto | Invita personas; crea y reasigna tareas según comprensión, pero lo relacionado con tareas no forma parte de este fragmento. |
| Adolescent / Adolescente | Autonomía progresiva; puede recibir permisos adicionales configurables. No se detallan permisos de onboarding. |
| Child / Niño | Acceso mínimo; no administra información familiar crítica. No se detallan permisos de onboarding. |
| Senior / AdultoMayor | Experiencia adaptada. No se detallan permisos de onboarding. |
| Guest / Invitado | Participación limitada; acceso mínimo. No se detallan permisos de onboarding. |

Permisos generales aplicables:

* Los permisos se determinan por rol y ámbito.
* Ningún rol obtiene acceso automático a información privada de otros miembros.
* Las relaciones solo pueden mostrarse si el usuario tiene visibilidad sobre las entidades involucradas.

### Flujos

#### Register

No se encontró flujo de Register.

#### Login

No se encontró flujo de Login.

#### Refresh Token

No se encontró flujo de Refresh Token.

#### Logout

No se encontró flujo de Logout.

#### Crear hogar durante registro

No se encontró flujo de creación de hogar durante registro.

Información relacionada encontrada:

* Hogar es la unidad organizativa principal.
* Cada hogar es independiente.
* Membership vincula Persona con Hogar y Rol.

#### Invitar miembros durante onboarding

No se encontró flujo específico de invitación durante onboarding.

Información relacionada encontrada:

* Invitacion aparece como workflow conceptual.
* Flujo conceptual: Invitación → Aceptación → Aprobación, si corresponde → Ingreso al hogar.
* Adulto puede invitar personas.
* Coordinador aprueba ingresos.

#### Onboarding por rol

No se encontró flujo de onboarding por rol.

Información relacionada encontrada:

* El rol condiciona permisos y visibilidad.
* Cada Membership tiene un único rol activo.
* La experiencia puede variar por rol, pero no se encontraron pasos de onboarding, pantallas ni reglas de progresión.

### APIs

No se encontraron endpoints ni contratos API para:

* Register
* Login
* Refresh Token
* Logout
* Crear hogar durante registro
* Invitar miembros durante onboarding
* Aceptar invitación
* Completar onboarding
* Asignar rol durante onboarding

### Request

No se encontraron requests.

### Response

No se encontraron responses.

### UI

No se encontraron pantallas, componentes ni estructura UI para:

* Login
* Register
* Logout
* Session expired
* Crear hogar durante registro
* Invite Member
* Accept Invitation
* Onboarding por rol

### Componentes UI

No se encontraron componentes UI específicos de AUTH u onboarding.

### Navegación

Información transversal encontrada:

* Las entidades relacionadas deben exponerse como enlaces navegables en sus vistas de detalle.
* Si una navegación genera un ciclo, el sistema debe reutilizar la instancia existente en el stack y no duplicarla.

No se encontró navegación específica de AUTH u onboarding.

### Eventos del sistema

No se encontraron eventos técnicos con nombre para:

* auth.registered
* auth.logged_in
* auth.logged_out
* auth.token_refreshed
* household.created durante registro
* invitation.created
* invitation.accepted
* onboarding.completed

### Dependencias

AUTH / onboarding, según esta fuente, depende conceptualmente de:

* Cuenta
* Persona
* Hogar
* Membership
* Rol
* Permisos
* Invitacion, si el ingreso ocurre por invitación

### Restricciones arquitectónicas

* Separar Cuenta de Persona y Membership.
* Separar identidad global de permisos por hogar.
* No derivar permisos desde relaciones familiares.
* No cruzar datos entre hogares.
* Aplicar visibilidad por rol y ámbito.
* No mostrar relaciones cuando el usuario no tenga visibilidad completa sobre ellas.
* Mantener el contexto de hogar activo para operaciones posteriores al ingreso.

### Casos de uso

Casos de uso encontrados solo de forma conceptual:

* Usuario/persona pertenece a uno o más hogares.
* Persona ingresa a hogar mediante Membership.
* Invitación permite ingreso al hogar mediante aceptación y eventual aprobación.
* Rol activo dentro del hogar determina permisos y visibilidad.

### Casos especiales

* Una Persona puede tener diferentes roles en diferentes hogares.
* Una relación familiar no cambia permisos.
* Un rol adicional, Empleado Familiar, aparece fuera del set de roles MVP solicitado.
* Senior / AdultoMayor aparece en el archivo de comprensión, pero no aparece en la tabla principal de visibilidad por rol del documento principal.

### Edge cases

* Riesgo de confundir Cuenta con Persona.
* Riesgo de asignar permisos globales al usuario en lugar de permisos por Membership/Hogar.
* Riesgo de usar parentesco como permiso, aunque el documento lo prohíbe.
* Riesgo de mezclar datos entre hogares.
* Riesgo de asumir que Adulto puede aprobar ingresos; el documento de comprensión solo indica que Adulto invita y Coordinador aprueba.
* Riesgo de asumir tokens, expiración o seguridad de invitación; no están definidos en esta fuente.

### Datos mockeados

No se encontraron datos mockeados para AUTH u onboarding.

### Funcionalidades REAL

* Separación Cuenta / Persona / Membership / Hogar / Rol como base conceptual.
* Membership como vínculo Persona-Hogar-Rol.
* Rol activo por Membership.
* Aislamiento de datos por hogar.
* Permisos por rol y ámbito.
* Relaciones familiares informativas sin efecto automático en permisos.
* Invitación como workflow conceptual de ingreso al hogar.
* Adulto invita personas.
* Coordinador aprueba ingresos, cambia roles y expulsa miembros.

### Funcionalidades MOCK

No se encontró información MOCK para AUTH u onboarding.

### Funcionalidades POST_MVP

* Empleado Familiar como rol fuera del set de roles MVP solicitado.
* Cualquier personalización avanzada de permisos para Adolescente queda fuera de esta extracción porque no tiene contrato ni regla implementable en esta fuente.

---

## 2. Clasificación para implementación

### REAL

* Cuenta y Persona deben tratarse como conceptos separados.
* Persona se vincula al hogar mediante Membership.
* Membership pertenece a un Hogar y tiene un Rol.
* Cada Membership tiene un único rol activo.
* El rol se interpreta dentro del hogar, no globalmente en la Cuenta.
* El sistema debe respetar separación de datos por hogar.
* No existen relaciones entre hogares.
* Las relaciones familiares son informativas y no modifican permisos.
* Los permisos dependen de rol y ámbito.
* Invitación existe como flujo conceptual de ingreso: Invitación → Aceptación → Aprobación, si corresponde → Ingreso al hogar.
* Adulto puede invitar personas.
* Coordinador puede aprobar ingresos, cambiar roles y expulsar miembros.

### MOCK

No se encontró información para simular AUTH u onboarding con texto fijo, datos dummy o comportamiento falso.

### POST_MVP

* Empleado Familiar queda fuera del set de roles MVP solicitado.
* Permisos adicionales configurables para Adolescente están mencionados sin detalle suficiente y no deben convertirse en obligación de MVP desde esta fuente.

### IGNORAR

No se incluye contenido de temas fuera de alcance para este fragmento.

---

## 3. Información faltante

| Área | Información faltante | Impacto |
| --- | --- | --- |
| Register | No se encontró flujo, entidad, endpoint, request, response, validaciones ni errores. | No se puede implementar Register desde esta fuente. |
| Login | No se encontró flujo, endpoint, request, response, validaciones ni errores. | No se puede implementar Login desde esta fuente. |
| Refresh Token | No se encontró entidad RefreshToken, campos, estados, rotación, expiración ni endpoint. | No se puede implementar Refresh Token desde esta fuente. |
| Logout | No se encontró flujo, endpoint, invalidación de sesión/token ni response. | No se puede implementar Logout desde esta fuente. |
| Crear hogar durante registro | No se encontró flujo que conecte Register con creación de Hogar. | Solo puede extraerse Hogar como entidad/contexto, no el flujo de registro. |
| Cuenta | No se encontraron campos técnicos como email, password hash, provider, estado o timestamps. | Esquema insuficiente. |
| Persona | No se encontraron campos técnicos ni cardinalidad exacta Cuenta ↔ Persona. | Esquema insuficiente. |
| Membership | Se encontraron estados conceptuales, pero no campos ni mapeo técnico a enums. | Requiere definición posterior. |
| Roles | Hay roles encontrados, pero no permisos completos por acción MVP. | No alcanza para matriz completa de permisos. |
| Senior | AdultoMayor aparece en comprensión, pero no en la tabla principal de visibilidad del documento. | Riesgo de cobertura incompleta para Senior. |
| Empleado Familiar | Aparece como rol adicional fuera del set MVP. | No debe mezclarse con roles MVP. |
| Invitación | No se encontraron campos, estados, tokens, expiración, seguridad ni endpoints. | No se puede implementar invitación completa desde esta fuente. |
| Aceptar invitación | Se encontró workflow conceptual, pero no contrato técnico ni reglas de edge cases. | Flujo insuficiente. |
| Onboarding por rol | No se encontraron pasos, pantallas ni reglas de asignación/adaptación por rol. | No se puede implementar wizard de onboarding desde esta fuente. |
| UI | No se encontraron pantallas ni componentes Auth/Onboarding. | UI pendiente de otras fuentes. |
| Eventos del sistema | No se encontraron nombres técnicos de eventos. | No definir eventos desde esta fuente. |
| Auditoría | Se menciona como entidad transversal, pero no se define qué acciones Auth/Onboarding auditar. | Requiere definición posterior. |

Contradicciones o riesgos detectados:

* La tabla principal de visibilidad incluye Coordinador, Adulto, Adolescente, Niño, Invitado y Empleado Familiar, pero no incluye AdultoMayor/Senior.
* El set MVP solicitado incluye Senior, mientras que la fuente principal visible de permisos no detalla su visibilidad.
* El archivo de comprensión indica que Adulto invita personas y Coordinador aprueba ingresos, pero no define si Coordinador también puede crear invitaciones.
* Membership tiene estados en español, pero el prompt no define estados esperados para Membership y la fuente no da mapeo técnico.
* Invitacion aparece como workflow, no como entidad implementable completa.

---

## 4. Fuente

* Archivo principal: `HomePlus — SECCION 5 RELATIONSHIP PHILOSOPHY(1).md`
* Secciones del archivo principal:
  * Metadata / título: `Filosofía de Relaciones del Ecosistema`
  * `# 5. Filosofía de Relaciones del Ecosistema`
  * `## 5.1 El ecosistema como red de entidades`
  * `### 5.2.1 Persona`
  * `## 5.5 Límites de privacidad en las relaciones entre módulos`
  * `### 5.5.1 Principio de privacidad individual`
  * `### 5.5.2 Ámbitos de visibilidad`
  * `### 5.5.4 Tabla de visibilidad por rol en relaciones cruzadas`
  * `## 5.7 Relaciones familiares: informativas, no permisivas`
  * `## 5.8 Multi-Hogar y aislamiento entre hogares`
  * `## 5.9 Principios de diseño para nuevas relaciones`
* Archivo de comprensión asociado: `Seccion 5 filsofia de las relaciones(1).txt`
* Secciones del archivo de comprensión:
  * `OUTPUT 1 — ENTITIES`
  * `OUTPUT 2 — RELATIONSHIPS`
  * `OUTPUT 5 — BUSINESS RULES`
  * `OUTPUT 6 — ARCHITECTURAL DECISIONS`
  * `OUTPUT 7 — MISSING/IMPLIED`
  * `OUTPUT 8 — GRAPH EDGES`
* Source map usado: `source_map_HomePlus_SECCION_5_RELATIONSHIP_PHILOSOPHY.md`
* Secciones del source map:
  * `# 4.1 AUTH`
  * `# 4.2 ONBOARDING`
  * `# 4.4 MEMBERSHIP`
  * `# 4.5 INVITATIONS`
  * `# 4.6 ROLES & PERMISSIONS`
