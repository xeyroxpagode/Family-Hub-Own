# AUTH + ONBOARDING fragment — HomePlus — SECCION 7 AI PHILOSOPHY - GENI

## 1. Información encontrada

### Objetivo del módulo

No se encontró un objetivo explícito de AUTH ni de ONBOARDING en este documento.

El documento está centrado en la filosofía y restricciones de Geni. La información útil para AUTH + ONBOARDING es indirecta y se limita a entidades transversales, roles, permisos y privacidad.

### Entidades

#### Cuenta

* Pertenece al usuario, no al hogar.
* Incluye, según el archivo de comprensión: perfil, preferencias, idioma, configuración personal y memoria personal de Geni.
* No se define como entidad de autenticación operativa.
* No se describen credenciales, email, password, hash, sesiones, refresh tokens ni dispositivos.

#### Persona

* Es una entidad transversal.
* Toda Persona pertenece a una Cuenta.
* Una Persona puede participar en uno o más Hogares.

#### Membership

* Relaciona una Persona con un Hogar.
* Posee un único rol activo por hogar.
* Los roles son independientes entre hogares.
* Estados encontrados en el archivo de comprensión:
  * Pendiente
  * Activa
  * Suspendida
  * Finalizada

#### Invitación

* Aparece como flujo de ingreso al hogar.
* Flujo encontrado:
  * Invitación → Aceptación → Aprobación → Ingreso
* No se vincula explícitamente con el onboarding de registro en este documento.

#### Rol

Roles encontrados y mapeables al MVP:

| Nombre en documento | Rol MVP |
| ------------------- | ------- |
| Coordinador | Coordinator |
| Adulto | Adult |
| Adolescente | Adolescent |
| Niño | Child |
| Adulto Mayor | Senior |
| Invitado | Guest |

### Campos

#### Cuenta

Campos/conceptos mencionados, sin tipo técnico:

* perfil
* preferencias
* idioma
* configuración personal
* memoria personal de Geni

#### Contexto de perfil usado por Geni

Datos mencionados para personalización de contexto, sin contrato de Auth:

* rol del miembro
* nombre
* preferencias de notificación
* idioma

#### Membership

Información mencionada:

* Persona vinculada
* Hogar vinculado
* rol activo
* estado de membresía

No hay definición de tipos, obligatoriedad, índices, claves, timestamps ni validaciones.

### Tipos

No se encontraron tipos técnicos para Auth.

No se encontraron tipos para:

* email
* password
* password_hash
* access token
* refresh token
* session
* device
* verification code
* invitation code

### Valores por defecto

No se encontraron valores por defecto para Auth ni Onboarding.

### Restricciones

* Los datos privados no deben compartirse automáticamente entre miembros.
* Ningún rol obtiene acceso automático a memoria privada de Geni, metas privadas, documentos privados o finanzas personales de otro miembro.
* Los datos sensibles o credenciales no se guardan como memorias de Geni.
* Las memorias personales de otros miembros no se cargan en el contexto de otro miembro.
* La información de dominios donde el miembro no tiene permisos no se carga.
* El output se filtra por la matriz de permisos del miembro que consulta.

### Relaciones

| Origen | Relación | Destino | Nota |
| ------ | -------- | ------- | ---- |
| Persona | pertenece a | Cuenta | Relación explícita en archivo de comprensión. |
| Persona | participa en | Hogar | Puede participar en uno o más hogares. |
| Membership | vincula | Persona | Relación de membresía. |
| Membership | vincula | Hogar | Relación de membresía. |
| Membership | tiene rol | Rol | Un único rol activo por hogar. |
| Invitación | dispara | Membership | Relación encontrada en archivo de comprensión. |

### Cardinalidad

* Una Cuenta puede tener múltiples Personas en distintos Hogares.
* Una Persona puede participar en uno o más Hogares.
* Cada Membership posee un único rol activo por Hogar.
* Los roles son independientes entre Hogares.

### Estados posibles

#### Membership

Estados encontrados:

* Pendiente
* Activa
* Suspendida
* Finalizada

#### Auth / Session / Token

No se encontraron estados.

#### Onboarding

No se encontraron estados.

#### Invitación

No se encontró una lista formal de estados de invitación en este documento.

### Reglas de negocio

* Toda Persona pertenece a una Cuenta.
* Una Cuenta puede tener múltiples Personas en distintos Hogares.
* Cada Membership posee un único rol activo por Hogar.
* Los roles son independientes entre Hogares.
* Las relaciones familiares son informativas y no modifican permisos automáticamente.
* El Coordinador puede aprobar ingresos, cambiar roles, expulsar miembros, transferir coordinación y administrar configuraciones del hogar.
* El Coordinador no puede eliminar hogares.
* El Adulto puede invitar personas.
* El Adulto no puede aprobar ingresos.
* El Adolescente puede recibir permisos adicionales configurables.
* Ningún rol obtiene acceso automático a información privada de otro miembro.

### Permisos

#### Coordinator / Coordinador

Permisos encontrados:

* aprobar ingresos
* cambiar roles
* expulsar miembros
* transferir coordinación
* administrar configuraciones del hogar

Restricción encontrada:

* no puede eliminar hogares

#### Adult / Adulto

Permisos encontrados:

* invitar personas
* crear/reasignar tareas
* crear eventos
* administrar operaciones familiares

Restricción encontrada:

* no puede aprobar ingresos

#### Adolescent / Adolescente

Permisos encontrados:

* crear eventos familiares
* administrar tareas propias
* puede recibir permisos adicionales configurables

#### Child / Niño

Información encontrada:

* experiencia simplificada
* no administra información familiar crítica

#### Senior / Adulto Mayor

Información encontrada:

* experiencia adaptada
* Home prioriza personas, eventos, recordatorios, medicación y coordinación

#### Guest / Invitado

Información encontrada:

* acceso mínimo
* participación limitada

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

No encontrado explícitamente.

Información relacionada encontrada, pero no vinculada a onboarding:

* Invitación → Aceptación → Aprobación → Ingreso
* Adulto puede invitar personas.
* Coordinador puede aprobar ingresos.

#### Onboarding por rol

No encontrado como flujo.

Información relacionada encontrada:

* El documento define tono de Geni por rol, pero no define pasos, pantallas ni reglas funcionales de onboarding por rol.

Tonos encontrados por rol:

| Rol MVP | Tono encontrado |
| ------- | --------------- |
| Coordinator | Colega. Informativo, respetuoso, directo. |
| Adult | Par. Cálido, colaborativo, sin autoridad. |
| Adolescent | Mentor joven. Motivacional, sin condescendencia. |
| Child | Acompañante lúdico. Simple, visual, positivo. |
| Senior | Paciente, claro, con prioridad en lo esencial. |
| Guest | Neutral, funcional, con contexto mínimo. |

### APIs

No se encontraron endpoints ni contratos API para:

* register
* login
* refresh token
* logout
* crear hogar durante registro
* invitar miembros durante onboarding
* aceptar invitación
* onboarding por rol

No hay Request ni Response.

### Request

No encontrado.

### Response

No encontrado.

### UI

No se encontraron pantallas ni componentes para:

* Login
* Register
* Logout
* Onboarding
* Crear hogar durante registro
* Invitar miembros durante onboarding
* Aceptar invitación

Información UI relacionada, sin estructura de pantalla:

* El tono de Geni varía por rol.
* El contexto de Geni puede usar rol, nombre, preferencias de notificación e idioma.

### Componentes UI

No encontrados para Auth + Onboarding.

### Navegación

No se encontró navegación de Auth ni Onboarding.

### Eventos del sistema

No se encontraron eventos técnicos para:

* auth.registered
* auth.logged_in
* auth.logged_out
* auth.token_refreshed
* onboarding.started
* onboarding.completed
* household.created_during_registration
* invitation.created_during_onboarding
* invitation.accepted

### Dependencias

Dependencias explícitas o claramente derivadas del documento:

* Auth depende conceptualmente de Cuenta y Persona.
* Onboarding depende conceptualmente de Persona, Hogar, Membership y Rol.
* Invitaciones dependen conceptualmente de Membership.
* La personalización por rol depende del rol activo del miembro.
* El filtrado de información depende de la matriz de permisos del miembro.

### Restricciones arquitectónicas

* El output y contexto se filtran por permisos del miembro.
* Información privada de otro miembro no se carga automáticamente.
* Credenciales y datos sensibles no se guardan como memoria.
* Cada Membership tiene un único rol activo por hogar.
* Los roles son independientes entre hogares.

No se encontraron restricciones arquitectónicas sobre:

* JWT
* refresh tokens
* cookies
* sesiones
* expiración de sesión
* rotación de tokens
* single-use invitation token
* hashing de password
* email verification
* reset password

### Casos de uso

No se encontraron casos de uso operativos de Auth.

Casos de uso indirectos relacionados con onboarding/membership:

* Una Persona ingresa a un Hogar mediante Invitación → Aceptación → Aprobación → Ingreso.
* El Coordinador aprueba ingresos.
* El Adulto puede invitar personas, pero no aprobar ingresos.
* El rol activo dentro del hogar determina permisos y tono/contexto.

### Casos especiales

* Una Cuenta puede tener múltiples Personas en distintos Hogares.
* Los roles son independientes entre Hogares.
* Las relaciones familiares no modifican permisos automáticamente.
* Ningún rol tiene acceso automático a información privada de otro miembro.

### Edge cases

* Riesgo de confundir Persona con Cuenta, porque el documento las separa pero no define el modelo de Auth.
* Riesgo de tratar Membership como Auth, cuando el documento solo la presenta como relación Persona-Hogar.
* Riesgo de usar tono por rol como si fuera onboarding por rol; el documento no define ese flujo.
* Riesgo de implementar invitaciones de onboarding usando este documento; el flujo existe como ingreso al hogar, pero no está conectado explícitamente al registro/onboarding.

### Datos mockeados

No se encontraron datos mockeados para Auth + Onboarding.

### Funcionalidades REAL

Información potencialmente implementable como base transversal, pero incompleta:

* Cuenta como entidad asociada al usuario.
* Persona como entidad transversal asociada a Cuenta.
* Membership como relación Persona-Hogar.
* Rol activo por hogar.
* Filtrado por permisos del miembro.
* Restricción de privacidad sobre datos personales y datos de otros miembros.

### Funcionalidades MOCK

No encontradas para Auth + Onboarding.

### Funcionalidades POST_MVP

* Memoria personal de Geni asociada a Cuenta.
* Memoria familiar asociada al Hogar.
* Personalización avanzada del tono de Geni por rol.
* Contextualización de Geni con actividad reciente, briefing anterior, memorias y permisos.

## 2. Clasificación para implementación

### REAL

Usable para MVP v1.0 solo como información parcial/transversal:

* Cuenta pertenece al usuario, no al hogar.
* Persona pertenece a Cuenta.
* Persona puede participar en uno o más Hogares.
* Membership vincula Persona y Hogar.
* Membership posee un único rol activo por hogar.
* Roles mapeables al MVP:
  * Coordinador → Coordinator
  * Adulto → Adult
  * Adolescente → Adolescent
  * Niño → Child
  * Adulto Mayor → Senior
  * Invitado → Guest
* El rol activo impacta permisos.
* Las relaciones familiares no modifican permisos automáticamente.
* El Adulto puede invitar personas.
* El Coordinador puede aprobar ingresos, cambiar roles, expulsar miembros, transferir coordinación y administrar configuraciones del hogar.
* El Adulto no puede aprobar ingresos.
* Ningún rol obtiene acceso automático a información privada de otro miembro.
* Los datos sensibles o credenciales no deben guardarse como memorias.

### MOCK

No se encontró información MOCK para Auth + Onboarding.

### POST_MVP

* Memoria personal de Geni.
* Memoria familiar de Geni.
* Contexto avanzado de Geni por rol, permisos, actividad reciente, memorias y briefing anterior.
* Tono personalizado de Geni por rol.

### IGNORAR

No se incluye contenido ignorado en este fragment.

## 3. Información faltante

### AUTH

* No hay flujo de Register.
* No hay flujo de Login.
* No hay flujo de Refresh Token.
* No hay flujo de Logout.
* No hay entidad Session.
* No hay entidad RefreshToken.
* No hay access token.
* No hay campos de email/password.
* No hay validaciones.
* No hay expiraciones.
* No hay reglas de rotación de refresh token.
* No hay errores.
* No hay endpoints.
* No hay Request/Response.
* No hay UI de Login/Register.

### ONBOARDING

* No hay flujo de onboarding.
* No hay creación de hogar durante registro.
* No hay invitación de miembros durante onboarding.
* No hay aceptar invitación como parte de onboarding.
* No hay pasos por rol.
* No hay pantallas.
* No hay componentes.
* No hay formularios.
* No hay campos.
* No hay validaciones.
* No hay estados.
* No hay eventos del sistema.

### HOUSEHOLD relacionado con onboarding

* Se menciona ingreso al hogar mediante invitación, aceptación, aprobación e ingreso, pero no se define contrato.
* No hay token/código de invitación.
* No hay expiración de invitación.
* No hay definición de quién recibe o consume la invitación.
* No hay request/response para aceptar invitación.

### Roles y permisos

* Los permisos no están completos para todas las acciones de Auth + Onboarding.
* No se define quién puede crear hogar durante registro.
* No se define si Guest puede ser invitado durante onboarding.
* No se define si Child/Senior requieren tratamiento especial durante onboarding.
* No se define matriz completa de permisos.

### Contradicciones o riesgos

* El documento aporta roles y permisos desde la perspectiva de Geni/People, no desde Auth.
* `Cuenta` y `Persona` aparecen separadas, pero no se define cómo se crean durante Register.
* `Membership` tiene estados encontrados, pero no se conectan a un flujo técnico de invitación/onboarding.
* El tono por rol puede parecer onboarding por rol, pero no lo es.
* La invitación aparece como flujo de ingreso al hogar, pero no explícitamente como parte del onboarding.
* No debe usarse este documento para diseñar tokens, sesiones, endpoints ni pantallas de Auth.

## 4. Fuente

* Archivo: `HomePlus — SECCION 7 AI PHILOSOPHY - GENI(1).md`
* Secciones:
  * `7.2.2 Restricciones Absolutas`
  * `7.5.3 Qué NO Recuerda Geni`
  * `7.5.4 Cómo Contextualiza Geni`
  * `7.7.2 Tono por Rol`
  * `7.8.1 Qué Datos Entran al Contexto de Geni`
  * `7.8.2 Qué NUNCA Entra al Contexto de Geni`
* Archivo de comprensión asociado: `Seccion 7 Filosofia de la ai - geni(1).txt`
* Secciones:
  * `OUTPUT 1 — ENTITIES`
  * `OUTPUT 2 — RELATIONSHIPS`
  * `OUTPUT 5 — BUSINESS RULES`
  * `OUTPUT 6 — ARCHITECTURAL DECISIONS`
* Source map usado: `source_map_HomePlus_SECCION_7_AI_PHILOSOPHY_GENI.md`
* Secciones:
  * `4.1 AUTH`
  * `4.2 ONBOARDING`
  * `5. Mapa de entidades`
  * `6. Mapa de relaciones`
  * `8. Mapa de permisos`
  * `9. Mapa de flujos`
  * `18. Información faltante`
  * `19. Recomendación de fragments a generar`
