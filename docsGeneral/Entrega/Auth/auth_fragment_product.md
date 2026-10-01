# AUTH + ONBOARDING fragment — HomePlus — SECCION 1 PRODUCTO

## 1. Información encontrada

### Objetivo del módulo

* El documento no define un objetivo técnico de AUTH.
* El documento sí define un objetivo de adopción/onboarding relacionado: HomePlus debe dar valor desde el minuto 1 con un solo usuario activo, independientemente de si la familia se suma o no.
* El onboarding de nuevos miembros debe mostrar valor individual rápido: cada persona debe ver lo que le importa a ella, no lo que le importa al Coordinador.
* El Coordinador como perfil psicográfico de adopción es distinto del rol oficial Coordinador dentro del sistema.

### Entidades

#### Cuenta

* Pertenece al usuario, no al hogar.
* Incluye:
  * perfil
  * preferencias
  * idioma
  * configuración personal

#### Persona

* Entidad transversal.
* Pertenece a una Cuenta.
* Puede participar en varios hogares mediante membresías independientes.
* Datos encontrados:
  * nombre
  * apellido
  * foto
  * fecha de nacimiento
  * género
  * contacto

#### Hogar

* Unidad organizativa principal.
* Todo ocurre dentro de un hogar.
* Cada hogar funciona como entidad independiente.

#### Membresía

* Relación entre Persona y Hogar.
* Posee un único rol activo.
* Permite que una persona pertenezca a varios hogares con roles independientes.

#### Roles oficiales encontrados

El documento y el archivo de comprensión mencionan estos roles oficiales:

* Coordinador
* Adulto
* Adolescente
* Niño
* Adulto Mayor
* Invitado
* Empleado Familiar

Mapeo al set de roles MVP solicitado:

| Nombre en documento | Nombre MVP |
| --- | --- |
| Coordinador | Coordinator |
| Adulto | Adult |
| Adolescente | Adolescent |
| Niño | Child |
| Adulto Mayor | Senior |
| Invitado | Guest |

`Empleado Familiar` aparece como rol oficial en la fuente, pero no pertenece al set de roles MVP solicitado para este fragment.

### Campos

#### Cuenta

* perfil
* preferencias
* idioma
* configuración personal

No se encontraron campos técnicos de autenticación para Cuenta.

#### Persona

* nombre
* apellido
* foto
* fecha de nacimiento
* género
* contacto

#### Membresía

* rol activo único

No se encontraron otros campos de membresía relacionados con onboarding o invitaciones.

### Tipos

* `Cuenta` aparece como entidad de base de datos en el archivo de comprensión.
* `Persona` aparece como entidad de base de datos en el archivo de comprensión.
* `Hogar` aparece como entidad de base de datos en el archivo de comprensión.
* `Membresía` aparece como entidad de base de datos en el archivo de comprensión.
* Los roles aparecen como roles oficiales del sistema.

### Valores por defecto

No se encontraron valores por defecto para AUTH, onboarding, cuenta, persona, membresía, invitaciones o creación de hogar.

### Restricciones

* La privacidad individual tiene prioridad sobre la conveniencia.
* La información privada pertenece a quien la genera.
* Los Coordinadores administran el hogar, no la vida privada de las personas.
* Ningún rol obtiene acceso automático a información privada por el solo hecho de tener rol dentro del hogar.
* Cada membresía posee un único rol activo.
* Cada hogar funciona como entidad independiente.

### Relaciones

| Origen | Relación | Destino | Notas |
| --- | --- | --- | --- |
| Persona | pertenece a | Cuenta | Relación explícita en archivo de comprensión. |
| Membresía | vincula | Persona | Relación explícita en archivo de comprensión. |
| Membresía | vincula | Hogar | Relación explícita en archivo de comprensión. |
| Membresía | referencia | Rol | La membresía posee un único rol activo. |
| Persona | participa en | Hogar | Relación mediada por membresía; roles independientes por hogar. |

### Cardinalidad

* Una Persona puede participar en varios Hogares.
* Una Membresía vincula una Persona con un Hogar.
* Cada Membresía posee un único rol activo.
* Una persona con perfil psicográfico de Coordinador puede tener cualquiera de los roles técnicos oficiales dentro de un hogar.

### Estados posibles

#### Estados de Membresía encontrados

* Pendiente
* Activa
* Suspendida
* Finalizada

#### Estados de adopción/onboarding encontrados

Estos aparecen como etapas de adopción, no como estados técnicos de una entidad:

1. Un solo usuario activo.
2. Invitación con fricción mínima.
3. Adopción natural por conveniencia.
4. Sistema del hogar.

#### Estados de AUTH no encontrados

No se encontraron estados para:

* cuenta
* sesión
* refresh token
* login
* logout

### Reglas de negocio

* HomePlus debe funcionar con un solo usuario activo desde el inicio.
* El valor del producto crece con la adopción familiar, pero no depende de ella.
* El Coordinador puede usar HomePlus como sistema personal antes de que otros miembros se sumen.
* El Coordinador invita a la familia.
* Cada nuevo miembro debe encontrar valor individual rápidamente durante el onboarding.
* Los miembros se suman por conveniencia propia, no por obligación del Coordinador.
* Existe un riesgo de adopción: el Coordinador carga todo, invita a la familia, nadie se suma y abandona.
* La mitigación descrita es que el producto tenga utilidad completa para el Coordinador aunque nadie más se sume.
* El rol técnico Coordinador no debe confundirse con el perfil psicográfico Coordinador.
* Cada hogar es una entidad independiente.
* Los roles son independientes por hogar.

### Permisos

#### Coordinator / Coordinador

Puede:

* aprobar ingresos
* cambiar roles
* expulsar miembros
* transferir coordinación

No puede:

* eliminar hogares
* administrar la vida privada de las personas
* acceder automáticamente a información privada por ser Coordinador

#### Adult / Adulto

Puede:

* invitar miembros

No puede:

* aprobar ingresos

#### Adolescent / Adolescente

* No se encontraron permisos específicos de AUTH, onboarding, hogar o invitaciones para este rol.
* El archivo de comprensión lo describe como rol de autonomía progresiva, pero no define acciones de autenticación u onboarding.

#### Child / Niño

* No se encontraron permisos específicos de AUTH, onboarding, hogar o invitaciones para este rol.
* El archivo de comprensión indica que no administra información familiar crítica.

#### Senior / Adulto Mayor

* Mantiene permisos equivalentes a Adulto según el archivo de comprensión.
* En este fragment, eso implica heredar la capacidad de invitar si se toma Adulto como referencia.
* No se encontraron reglas técnicas adicionales para onboarding de Senior.

#### Guest / Invitado

* Acceso mínimo.
* Participación limitada.
* No se encontraron permisos específicos de AUTH, onboarding, hogar o invitaciones.

### Flujos

#### Register

No se encontró flujo técnico de registro.

No se encontraron:

* pasos
* campos
* validaciones
* creación de credenciales
* creación de sesión
* creación explícita de hogar durante registro
* respuesta esperada
* errores

#### Login

No se encontró flujo técnico de login.

No se encontraron:

* credenciales requeridas
* sesión
* token
* errores
* respuesta

#### Refresh Token

No se encontró flujo de refresh token.

No se encontraron:

* entidad RefreshToken
* expiración
* rotación
* revocación
* endpoint
* errores

#### Logout

No se encontró flujo de logout.

No se encontraron:

* invalidación de sesión
* invalidación de refresh token
* endpoint
* errores

#### Crear hogar durante registro

* No se encontró flujo técnico.
* El documento sí establece que el producto debe funcionar con un solo usuario activo desde el primer uso.
* El archivo de comprensión define `Hogar` como unidad organizativa principal.
* No se especifica si el hogar se crea automáticamente durante el registro, manualmente después, o como parte de un wizard de onboarding.

#### Invitar miembros durante onboarding

* El documento indica que el Coordinador invita a la familia.
* La invitación debe tener fricción mínima.
* El onboarding de cada nuevo miembro debe optimizarse para que el valor individual sea visible en los primeros 60 segundos.
* Adulto aparece con permiso para invitar.
* No se encontró entidad `Invitation`.
* No se encontraron tokens, códigos, expiración ni estados de invitación.

#### Aceptar invitación

* No se encontró flujo MVP de aceptar invitación.
* Aparece una evolución post-MVP donde un link de invitación abre una web app instantánea.

#### Onboarding por rol

* Existen roles oficiales.
* El documento indica que cada persona debe ver lo que le importa a ella durante el onboarding.
* No se encontraron pasos específicos por rol.
* No se encontraron pantallas, campos, permisos iniciales o reglas de branching por rol.

### APIs

No se encontraron endpoints ni contratos API para:

* Register
* Login
* Refresh Token
* Logout
* Crear hogar durante registro
* Invitar miembro
* Aceptar invitación
* Onboarding por rol

No se encontraron:

* método HTTP
* ruta
* request
* response
* errores
* códigos de estado

### Request

No se encontraron estructuras de request para AUTH u onboarding.

### Response

No se encontraron estructuras de response para AUTH u onboarding.

### UI

No se encontraron pantallas detalladas para:

* Login
* Register
* Crear hogar
* Invitar miembro
* Aceptar invitación
* Onboarding por rol

Información UI/conceptual encontrada:

* El onboarding debe mostrar valor individual al nuevo miembro.
* Cada persona debe ver lo que le importa a ella, no lo que le importa al Coordinador.
* El valor individual debe ser visible en los primeros 60 segundos.

### Componentes UI

No se encontraron componentes UI específicos para AUTH u onboarding.

### Navegación

No se encontró navegación específica para AUTH u onboarding.

### Eventos del sistema

No se encontraron nombres técnicos de eventos para:

* auth.registered
* auth.logged_in
* auth.logged_out
* auth.token_refreshed
* household.created
* invitation.created
* invitation.accepted

Eventos conceptuales sin nombre técnico:

* Coordinador invita familia.
* Miembro se suma por conveniencia.
* Ingreso al hogar puede ser aprobado por Coordinador.
* Rol de miembro puede ser cambiado por Coordinador.
* Miembro puede ser expulsado por Coordinador.
* Coordinación puede ser transferida por Coordinador.

### Dependencias

* AUTH depende conceptualmente de Cuenta y Persona.
* Onboarding depende conceptualmente de Hogar, Membresía y Roles.
* Invitación depende conceptualmente de Hogar, Persona/Membresía y permisos por rol.
* La aceptación de invitación requiere una definición futura porque no hay entidad ni flujo técnico en esta fuente.

### Restricciones arquitectónicas

* Separar Cuenta de Hogar.
* Separar Persona de Membresía.
* La pertenencia al hogar se modela mediante Membresía.
* Cada Membresía tiene un único rol activo.
* Los roles son independientes por hogar.
* Cada hogar funciona como entidad independiente.
* La privacidad individual limita lo que un rol puede ver o administrar.
* Las acciones que afectan al hogar deben ser visibles y los cambios relevantes deben quedar registrados.

### Casos de uso

* Un usuario empieza a usar HomePlus solo.
* El Coordinador usa HomePlus aunque la familia todavía no participe.
* El Coordinador invita a la familia.
* Un nuevo miembro se suma porque encuentra valor individual.
* Una persona pertenece a más de un hogar con roles independientes.

### Casos especiales

* Coordinador como perfil psicográfico no equivale necesariamente al rol técnico Coordinator.
* Una persona con perfil psicográfico de Coordinador puede tener cualquier rol técnico dentro de un hogar.
* El escenario de muerte ocurre si el Coordinador carga todo, invita a la familia, nadie se suma y abandona.
* Empleado Familiar aparece como rol oficial en la fuente, pero queda fuera del set de roles MVP solicitado.

### Edge cases

* El documento no define qué ocurre si una invitación no es aceptada.
* El documento no define qué ocurre si una invitación expira.
* El documento no define qué ocurre si un usuario ya tiene Cuenta y recibe una invitación.
* El documento no define qué ocurre si un usuario pertenece a más de un hogar al registrarse o aceptar invitación.
* El documento no define qué ocurre si el único Coordinador abandona el hogar.
* El documento no define cómo se recupera acceso a una cuenta.
* El documento no define cómo se revoca una sesión.

### Datos mockeados

No se encontraron datos mockeados para AUTH u onboarding.

### Funcionalidades REAL

* Cuenta como entidad conceptual de usuario.
* Persona como entidad transversal vinculada a Cuenta.
* Hogar como unidad organizativa.
* Membresía como vínculo Persona-Hogar.
* Rol activo único por membresía.
* Roles oficiales del sistema.
* Separación entre Coordinador psicográfico y Coordinador técnico.
* Valor desde el primer uso con un solo usuario activo.
* Invitación familiar mencionada conceptualmente.
* Permisos parciales sobre ingresos, roles, expulsión, transferencia de coordinación e invitación.
* Separación de datos por hogar a nivel conceptual.
* Restricciones de privacidad individual.

### Funcionalidades MOCK

No se encontró información MOCK para AUTH u onboarding.

### Funcionalidades POST_MVP

* Web app instantánea por link de invitación como puente de adopción.
* Empleado Familiar como rol fuera del set MVP solicitado para este fragment.

---

## 2. Clasificación para implementación

### REAL

* Modelar separación conceptual entre Cuenta, Persona, Hogar y Membresía si otra fuente técnica lo confirma.
* Considerar que una Persona pertenece a una Cuenta.
* Considerar que una Membresía vincula Persona con Hogar.
* Considerar que cada Membresía tiene un único rol activo.
* Usar los roles MVP solicitados con el mapeo:
  * Coordinador → Coordinator
  * Adulto → Adult
  * Adolescente → Adolescent
  * Niño → Child
  * Adulto Mayor → Senior
  * Invitado → Guest
* Mantener separada la noción de Coordinador psicográfico y Coordinator como rol técnico.
* Considerar que el producto debe permitir valor inicial con un solo usuario activo.
* Considerar la invitación familiar como flujo requerido pero no definido técnicamente en esta fuente.
* Respetar privacidad individual frente a permisos de hogar.

### MOCK

No se encontró información que deba simularse para AUTH u onboarding en este documento.

### POST_MVP

* Web app instantánea abierta desde link de invitación.
* Empleado Familiar como rol fuera del set MVP solicitado.

### IGNORAR

No se incluye contenido en esta categoría dentro del fragment.

---

## 3. Información faltante

| Tema | Información faltante | Impacto |
| --- | --- | --- |
| Register | Flujo completo, campos, validaciones, creación de cuenta/persona/hogar, tokens, errores, UI | No se puede implementar registro desde esta fuente. |
| Login | Credenciales, sesión, tokens, errores, UI | No se puede implementar login desde esta fuente. |
| Refresh Token | Entidad, campos, expiración, rotación, revocación, endpoint | No se puede implementar refresh token desde esta fuente. |
| Logout | Revocación de sesión/token, endpoint, errores | No se puede implementar logout desde esta fuente. |
| Crear hogar durante registro | No se define si el hogar se crea durante register, después de register o durante onboarding | Requiere otra fuente para evitar inventar flujo. |
| Cuenta | No hay campos técnicos de autenticación | Modelo incompleto. |
| Persona | Campos mencionados sin tipos | Requiere definición técnica posterior. |
| Membresía | Faltan campos como fechas, invitador, estado de aprobación, motivo de suspensión/finalización | Modelo incompleto. |
| Estados de membresía | Se mencionan estados en español, pero no se define transición entre ellos | Falta máquina de estados. |
| Invitaciones | Falta entidad Invitation, token/código, expiración, aceptación, estados, permisos y errores | MVP de invitaciones no puede implementarse desde esta fuente. |
| Onboarding por rol | Faltan pasos, pantallas, campos, reglas de branching y contenido específico por rol | Solo queda como criterio conceptual. |
| Permisos | Matriz incompleta por rol; especialmente Adolescent, Child, Senior y Guest para onboarding/invitaciones | Requiere otra fuente. |
| UI | No hay pantallas ni componentes para Login/Register/Onboarding/Invitar/Aceptar | Frontend no implementable desde esta fuente. |
| APIs | No hay endpoints, métodos, rutas, request, response ni errores | Backend no implementable desde esta fuente. |
| Eventos del sistema | No hay nombres técnicos ni payloads | Event tracking/auditoría requiere definición posterior. |

### Contradicciones o riesgos

* El documento menciona 7 roles oficiales, pero el MVP solicitado para este fragment usa 6 roles; `Empleado Familiar` debe quedar fuera del MVP.
* “Coordinador” aparece como perfil psicográfico y como rol técnico; mezclarlos produciría permisos incorrectos.
* El documento habla de invitación con fricción mínima, pero no define aceptación, tokens, estados ni entidad `Invitation`.
* La fuente permite entender separación Cuenta/Persona/Hogar, pero no define si `Cuenta` equivale a `User` o `Account` en implementación.
* La fuente contiene información conceptual de adopción, no una especificación técnica de AUTH.

---

## 4. Fuente

* Archivo: `HomePlus — SECCION 1 PRODUCTO.md`
  * Sección: `TARGET USERS`
  * Sección: `IDENTIDAD LATAM`
  * Sección: `ADOPCIÓN — MODELO Y RIESGOS`
  * Sección: `DECISIONES DE PRODUCTO TOMADAS`
  * Sección: `PRINCIPIO DE VISIBILIDAD`
* Archivo: `Seccion 1 Producto.txt`
  * Sección: `OUTPUT 1 — ENTITIES`
  * Sección: `OUTPUT 2 — RELATIONSHIPS`
  * Sección: `OUTPUT 5 — BUSINESS RULES`
  * Sección: `OUTPUT 6 — ARCHITECTURAL DECISIONS`
  * Sección: `OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS`
* Archivo: `source_map_HomePlus_SECCION_1_PRODUCTO.md`
  * Sección: `4.1 AUTH`
  * Sección: `4.2 ONBOARDING`
  * Sección: `8. Mapa de permisos`
  * Sección: `9. Mapa de flujos`
  * Sección: `10. Mapa de APIs`
  * Sección: `11. Mapa de UI`
  * Sección: `13. Restricciones arquitectónicas detectadas`
  * Sección: `18. Información faltante`
