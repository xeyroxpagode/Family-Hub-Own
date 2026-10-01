# AUTH + ONBOARDING fragment — HomePlus — SECCION 2 PRINCIPIOS DEL PRODUCTO

## 1. Información encontrada

### Objetivo del módulo

#### AUTH

No se encontró una definición explícita del objetivo de AUTH en este documento.

La información implementable relacionada con AUTH aparece de forma indirecta a través de las entidades `Cuenta`, `Persona` y `Perfil Personal`, y a través de restricciones de privacidad, separación de datos y pertenencia a hogares.

#### ONBOARDING

El onboarding debe priorizar simplicidad y adopción inicial.

Información explícita encontrada:

* El onboarding debe entregar valor en aproximadamente 60 segundos.
* El primer uso no debe exponer todas las funcionalidades del sistema.
* Las funcionalidades complejas deben quedar fuera del onboarding inicial.
* Cada miembro debe encontrar valor individual desde el primer uso.
* El Home posterior al onboarding se adapta por rol.

---

### Entidades

#### Cuenta

* Pertenece al usuario, no al hogar.
* Incluye perfil, preferencias, idioma y configuración personal.
* Funciona como entidad individual asociada al usuario.

#### Persona

* Entidad transversal.
* Toda Persona pertenece a una Cuenta.
* Una Persona puede participar en uno o más hogares.

#### Perfil Personal

* Pertenece a la Cuenta.
* Contiene preferencias, idioma y configuración personal.

#### Hogar

* Unidad organizativa principal.
* Todo ocurre dentro de un hogar.
* Cada hogar funciona como entidad independiente.

#### Membresía

* Relación entre una Persona y un Hogar.
* Posee rol.
* Posee estado.
* Permite representar la participación de una Persona dentro de un Hogar.

#### Rol

Roles oficiales encontrados en el documento:

* Coordinador.
* Adulto.
* Adolescente.
* Niño.
* Adulto Mayor.
* Invitado.
* Empleado Familiar.

Mapeo al MVP solicitado:

* Coordinador → Coordinator.
* Adulto → Adult.
* Adolescente → Adolescent.
* Niño → Child.
* Adulto Mayor → Senior.
* Invitado → Guest.

`Empleado Familiar` aparece en la fuente como rol oficial, pero queda fuera del MVP solicitado para este fragment.

#### Invitación

* Aparece como flujo de ingreso al hogar.
* Flujo encontrado: Invitación → Aceptación → Aprobación → Ingreso al hogar.

---

### Campos

#### Cuenta

Campos o atributos conceptuales encontrados:

* perfil.
* preferencias.
* idioma.
* configuración personal.

No se encontraron tipos de datos.

#### Persona

Relaciones encontradas:

* pertenece a una Cuenta.
* puede participar en uno o más Hogares.

No se encontraron campos técnicos adicionales.

#### Membresía

Campos o atributos conceptuales encontrados:

* Persona.
* Hogar.
* Rol.
* Estado.

No se encontraron tipos de datos.

#### Rol

Campo conceptual encontrado:

* cada Membresía posee un único rol activo.

No se encontró estructura técnica de tabla, enum o permisos por endpoint.

#### Invitación

No se encontraron campos técnicos.

No se encontró:

* token.
* código.
* expiración.
* email destino.
* estado de invitación.
* created_at.
* accepted_at.
* approved_at.

---

### Tipos

Tipos explícitos o semánticos encontrados:

* `Cuenta`: entidad de usuario.
* `Persona`: entidad transversal.
* `Hogar`: unidad organizativa principal.
* `Membresía`: relación Persona-Hogar.
* `Rol`: rol dentro de una membresía.
* `Invitación`: workflow de ingreso al hogar.

No se encontraron tipos técnicos de AUTH:

* Session.
* RefreshToken.
* AccessToken.
* PasswordCredential.
* EmailCredential.

---

### Valores por defecto

No se encontraron valores por defecto para Register, Login, Refresh Token o Logout.

Valores/reglas por defecto relacionados con onboarding y membresía:

* Los compromisos compartidos son visibles por defecto en el hogar.
* Los datos personales privados permanecen privados por defecto.
* Cada membresía posee un único rol activo.
* El Home no es configurable por el usuario en MVP; se adapta por rol y contexto.

---

### Restricciones

#### Privacidad individual

* La privacidad individual prevalece sobre la coordinación cuando se trata de datos personales.
* El Coordinador no puede acceder a datos privados de otros miembros.
* La Cuenta pertenece al usuario, no al hogar.

#### Coordinación compartida

* Los compromisos compartidos son visibles por defecto.
* Las responsabilidades compartidas son visibles.
* Las acciones que afectan al hogar deben quedar registradas.

#### Separación por hogar

* Un usuario puede pertenecer a múltiples hogares.
* Cada hogar funciona como entidad independiente.
* Los roles son independientes por hogar.
* Una misma Persona puede tener distinto rol en distintos hogares.
* La memoria familiar pertenece al hogar y no se comparte automáticamente entre hogares.

#### Poder del Coordinador

* El Coordinador administra el hogar.
* El Coordinador no administra la vida privada de las personas.
* Los poderes del Coordinador están definidos y acotados.
* Toda acción unilateral relevante del Coordinador queda registrada en auditoría permanente.
* El Coordinador no puede eliminar hogares.

#### Onboarding

* El onboarding debe priorizar adopción sobre completitud funcional.
* El onboarding no debe exponer todas las funcionalidades en el primer uso.
* La complejidad debe resolverse por diseño y defaults, no trasladarse al usuario.

---

### Relaciones

Relaciones explícitas encontradas:

| Origen | Relación | Destino | Nota |
| ------ | -------- | ------- | ---- |
| Cuenta | owns / pertenece a | Persona | La Cuenta posee o contiene la Persona asociada. |
| Persona | participa en | Hogar | Una Persona puede participar en uno o más hogares. |
| Membresía | links | Persona | La Membresía vincula Persona con Hogar. |
| Membresía | links | Hogar | La Membresía vincula Persona con Hogar. |
| Membresía | has_role | Rol | Cada Membresía posee rol. |
| Coordinador | approves | Invitación / ingreso | El Coordinador autoriza entrada de nuevos miembros. |
| Coordinador | changes | Rol | Puede modificar roles dentro de los roles oficiales. |
| Coordinador | expels | Persona / miembro | Puede remover miembros del hogar, conservando historial. |
| Persona | has | Perfil Personal | El perfil pertenece al ámbito de Cuenta/Persona. |

---

### Cardinalidad

Información encontrada:

* Una Cuenta se asocia con una Persona.
* Una Persona puede participar en uno o más Hogares.
* Una Membresía vincula una Persona con un Hogar.
* Una Membresía posee un único rol activo.
* Un Hogar puede tener múltiples miembros mediante Membresías.

No se encontraron cardinalidades formales adicionales.

---

### Estados posibles

#### Membresía

Estados encontrados:

* Pendiente.
* Activa.
* Suspendida.
* Finalizada.

No se encontró mapeo técnico a nombres en inglés.

#### Invitación

No se encontraron estados técnicos de Invitación.

Solo se encontró el flujo:

* Invitación.
* Aceptación.
* Aprobación.
* Ingreso al hogar.

#### Sesión / Token / RefreshToken

No se encontraron estados.

---

### Reglas de negocio

#### AUTH

* La Cuenta pertenece al usuario, no al hogar.
* La Persona funciona como entidad transversal asociada a Cuenta.
* La Persona puede participar en uno o más hogares.
* Los datos personales privados no se comparten automáticamente con el hogar.
* La pertenencia a un hogar se representa mediante Membresía.

#### ONBOARDING

* El onboarding debe entregar valor rápidamente.
* La adopción inicial tiene prioridad sobre mostrar completitud funcional.
* El usuario no debe tener que configurar complejidad avanzada para obtener valor inicial.
* El rol asignado afecta la experiencia posterior, especialmente Home.

#### Invitación e ingreso

* La invitación y la aceptación son pasos previos obligatorios antes del ingreso aprobado.
* El Coordinador autoriza la entrada de nuevos miembros.
* El Adulto puede invitar personas, pero no aprobar ingresos.
* El ingreso al hogar queda ligado a una Membresía con rol.

#### Roles

* Existen roles oficiales definidos por el documento.
* Para este fragment MVP se consideran solo: Coordinator, Adult, Adolescent, Child, Senior y Guest.
* Cada Membresía posee un único rol activo.
* Las relaciones familiares son informativas y no modifican permisos automáticamente.

#### Auditoría

* Toda acción del Coordinador que afecte miembros o configuraciones queda registrada.
* La auditoría es visible para todos los miembros del hogar.
* La auditoría no puede borrarse.

---

### Permisos

#### Coordinator / Coordinador

Puede:

* Autorizar la entrada de nuevos miembros al hogar.
* Cambiar roles dentro de los roles oficiales.
* Expulsar o remover miembros.
* Transferir coordinación.
* Administrar configuraciones operativas del hogar.

No puede:

* Acceder a datos privados de otros miembros.
* Eliminar hogares.
* Borrar auditoría de sus propias acciones.
* Desactivar funciones del sistema para otros miembros.

Condiciones:

* Las acciones unilaterales relevantes quedan auditadas.
* Las acciones sobre miembros o configuraciones son visibles en el historial del hogar.

#### Adult / Adulto

Puede:

* Invitar personas.
* Administrar operaciones familiares.

No puede:

* Aprobar ingresos.

#### Adolescent / Adolescente

Información encontrada:

* Autonomía progresiva.
* Puede recibir permisos adicionales.

Para este fragment, solo es relevante la autonomía progresiva y el onboarding/experiencia por rol.

#### Child / Niño

* Tiene acceso simplificado.
* No administra información familiar crítica.

#### Senior / Adulto Mayor

* Tiene experiencia adaptada.
* Home prioriza personas, eventos, recordatorios y coordinación.
* Permisos equivalentes a Adulto según el archivo de comprensión.

#### Guest / Invitado

* Acceso mínimo.
* Participación limitada.

---

### Flujos

#### Register

No encontrado.

No se encontró:

* flujo de registro.
* creación de credenciales.
* validación de email.
* creación de Cuenta.
* creación de Persona.
* creación de sesión posterior al registro.
* errores.
* request.
* response.

#### Login

No encontrado.

No se encontró:

* flujo de login.
* credenciales.
* sesión.
* tokens.
* errores.
* request.
* response.

#### Refresh Token

No encontrado.

No se encontró:

* entidad RefreshToken.
* rotación de token.
* expiración.
* revocación.
* endpoint.
* request.
* response.

#### Logout

No encontrado.

No se encontró:

* invalidación de sesión.
* invalidación de refresh token.
* endpoint.
* request.
* response.

#### Crear hogar durante registro

No encontrado explícitamente.

Información relacionada encontrada:

* Hogar es la unidad organizativa principal.
* Todo ocurre dentro de un hogar.
* Una Persona puede participar en uno o más hogares.
* La Membresía conecta Persona con Hogar.

No se encontró el flujo específico `Register → Crear Hogar → Crear Membresía inicial`.

#### Invitar miembros durante onboarding

Parcial.

Información encontrada:

* Adulto puede invitar personas.
* Coordinador puede autorizar la entrada de nuevos miembros.
* La Invitación y Aceptación son pasos previos obligatorios antes del ingreso.
* Flujo encontrado: Invitación → Aceptación → Aprobación → Ingreso al hogar.

No se encontró que este flujo ocurra específicamente dentro del onboarding.

#### Onboarding por rol

Parcial.

Información encontrada:

* El Home se adapta por rol.
* Coordinador tiene visión completa del hogar.
* Adulto tiene visión operativa.
* Adolescente tiene más foco en tareas, eventos y coordinación.
* Niño tiene experiencia simplificada.
* Adulto Mayor tiene experiencia adaptada con prioridad en personas, eventos, recordatorios y coordinación.
* Invitado tiene acceso mínimo.

No se encontró una secuencia de pantallas o pasos de onboarding por rol.

---

### APIs

No se encontraron endpoints definidos.

| Acción | Método | Ruta | Request | Response | Errores | Estado en esta fuente |
| ------ | ------ | ---- | ------- | -------- | ------- | --------------------- |
| Register | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado |
| Login | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado |
| Refresh Token | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado |
| Logout | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado |
| Crear hogar durante registro | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado explícitamente |
| Invitar miembro | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API |
| Aceptar invitación | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Flujo mencionado sin contrato API |
| Aprobar ingreso | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API |

---

### Request

No se encontraron requests para:

* Register.
* Login.
* Refresh Token.
* Logout.
* Crear hogar durante registro.
* Invitar miembros durante onboarding.
* Aceptar invitación.
* Aprobar ingreso.

---

### Response

No se encontraron responses para:

* Register.
* Login.
* Refresh Token.
* Logout.
* Crear hogar durante registro.
* Invitar miembros durante onboarding.
* Aceptar invitación.
* Aprobar ingreso.

---

### UI

#### Login

No encontrado.

#### Register

No encontrado.

#### Onboarding

Parcial.

Información encontrada:

* Debe ser simple.
* Debe entregar valor rápido.
* No debe exponer todas las funcionalidades en el primer uso.
* Las features complejas deben quedar fuera del primer uso.

No se encontraron:

* pantallas.
* inputs.
* botones.
* validaciones.
* estados visuales.
* pasos del wizard.

#### Create Household

No encontrado como pantalla.

#### Invite Member

Mencionado como acción permitida para Adulto, pero no como pantalla.

#### Accept Invitation

Mencionado como parte del flujo de Invitación, pero no como pantalla.

#### Home post-onboarding por rol

Información encontrada:

* Home no es configurable por usuario en MVP.
* Home se adapta por rol.
* Home funciona como centro operativo.
* Home resume información y conduce a los módulos que administran esa información.

---

### Componentes UI

No se encontraron componentes específicos de AUTH.

Componentes relacionados con onboarding/post-onboarding:

* Home adaptado por rol.

No se encontraron componentes de:

* formulario de registro.
* formulario de login.
* selector de rol durante onboarding.
* creador de hogar.
* invitador de miembros.
* aceptación de invitación.

---

### Navegación

Información encontrada:

* Las funciones de uso diario deben estar en navegación primaria.
* Las funciones de uso semanal deben estar a un tap.
* Las funciones ocasionales viven en More o Configuración.
* El usuario no debería tener que aprender dónde está cada cosa.
* Home es punto de entrada operativo después del onboarding.

No se encontró navegación específica de Auth antes del login.

---

### Eventos del sistema

No se encontraron nombres técnicos de eventos.

Eventos conceptuales no definidos técnicamente:

* usuario registrado.
* usuario logueado.
* token refrescado.
* usuario deslogueado.
* hogar creado.
* invitación creada.
* invitación aceptada.
* ingreso aprobado.
* miembro ingresó al hogar.
* rol asignado.

---

### Dependencias

AUTH depende conceptualmente de:

* Cuenta.
* Persona.
* Perfil Personal.

ONBOARDING depende conceptualmente de:

* AUTH.
* Hogar.
* Membresía.
* Invitación.
* Rol.
* Home adaptado por rol.

Crear hogar durante registro depende conceptualmente de:

* Hogar.
* Persona.
* Membresía.
* Rol inicial.

Invitar miembros durante onboarding depende conceptualmente de:

* Invitación.
* Membresía.
* Rol.
* Permisos de Adulto y Coordinador.
* Aprobación de ingreso por Coordinador.

---

### Restricciones arquitectónicas

* La interfaz debe mantenerse simple independientemente de la complejidad interna.
* La complejidad no debe trasladarse al usuario como configuración obligatoria.
* Los defaults deben funcionar para la mayoría de usuarios.
* Cada módulo debe entregar valor individual desde el primer uso.
* La coordinación colectiva crece con la adopción.
* Las acciones relevantes del Coordinador quedan auditadas.
* Los hogares son independientes.
* Roles, permisos y datos operativos se interpretan por hogar.
* La privacidad individual no se anula por pertenecer a un hogar.

---

### Casos de uso

Casos de uso encontrados de forma explícita o parcial:

* Una Persona participa en uno o más hogares.
* Un Coordinador autoriza la entrada de nuevos miembros.
* Un Adulto invita personas.
* Un usuario ingresa al hogar mediante Invitación → Aceptación → Aprobación → Ingreso.
* Un Coordinador cambia roles.
* Un Coordinador administra configuraciones operativas del hogar.
* El onboarding entrega valor rápido sin mostrar toda la complejidad.
* La experiencia post-onboarding se adapta por rol.

---

### Casos especiales

* Una Persona puede pertenecer a múltiples hogares.
* Los roles son independientes entre hogares.
* Una Persona puede ser Coordinador en un hogar y Adulto en otro.
* El Coordinador tiene poder operativo, pero no puede acceder a datos privados de otros miembros.
* El Coordinador no puede eliminar hogares.
* Las relaciones familiares no modifican permisos automáticamente.
* El documento menciona `Empleado Familiar` como rol oficial, pero no forma parte del MVP solicitado para este fragment.

---

### Edge cases

* No se define qué ocurre si un usuario registra Cuenta/Persona pero no crea ni se une a ningún hogar.
* No se define qué ocurre si una invitación se acepta pero el Coordinador no aprueba el ingreso.
* No se define qué ocurre si el Coordinador cambia el rol durante onboarding.
* No se define qué ocurre si un Adulto invita a alguien pero no hay Coordinador disponible para aprobar.
* No se define expiración, revocación ni reutilización de invitaciones.
* No se define si el primer usuario de un hogar recibe automáticamente rol Coordinator.
* No se define si crear hogar durante registro es obligatorio u opcional.

---

### Datos mockeados

No se encontraron datos mockeados para AUTH u ONBOARDING en este documento.

---

### Funcionalidades REAL

Información real extraíble desde esta fuente:

* Cuenta como entidad individual del usuario.
* Persona como entidad transversal asociada a Cuenta.
* Hogar como unidad organizativa principal.
* Membresía como vínculo Persona-Hogar.
* Rol dentro de Membresía.
* Estados de Membresía: Pendiente, Activa, Suspendida, Finalizada.
* Invitación como flujo de ingreso.
* Flujo conceptual: Invitación → Aceptación → Aprobación → Ingreso al hogar.
* Coordinador aprueba ingresos.
* Adulto puede invitar personas.
* Onboarding debe ser simple y entregar valor rápido.
* Home posterior al onboarding se adapta por rol.
* Separación de datos y roles por hogar.
* Auditoría de acciones relevantes del Coordinador.

---

### Funcionalidades MOCK

No se encontraron funcionalidades MOCK aplicables a AUTH u ONBOARDING.

---

### Funcionalidades POST_MVP

* Descubrimiento guiado post-onboarding si las features core no se descubren.
* `Empleado Familiar` como rol fuera del MVP solicitado para este fragment.

---

## 2. Clasificación para implementación

### REAL

#### AUTH

* Implementar la separación conceptual entre Cuenta, Persona, Hogar y Membresía.
* Considerar que Cuenta pertenece al usuario, no al hogar.
* Considerar que Persona pertenece a Cuenta.
* Considerar que Persona puede participar en uno o más hogares.
* Considerar que Membresía representa la relación Persona-Hogar.
* Considerar que Membresía incluye rol y estado.
* Respetar privacidad individual de datos personales.
* Respetar separación de datos por hogar.

#### ONBOARDING

* El onboarding debe priorizar adopción y simplicidad.
* El onboarding debe entregar valor rápido.
* El onboarding no debe exponer todas las funcionalidades del producto al primer uso.
* El rol debe afectar la experiencia posterior.
* El Home posterior al onboarding debe adaptarse por rol.
* El ingreso de miembros al hogar debe pasar por Invitación → Aceptación → Aprobación → Ingreso, según la fuente.
* El Coordinador aprueba ingresos.
* El Adulto puede invitar personas.

#### Roles MVP

* Coordinator: basado en Coordinador.
* Adult: basado en Adulto.
* Adolescent: basado en Adolescente.
* Child: basado en Niño.
* Senior: basado en Adulto Mayor.
* Guest: basado en Invitado.

---

### MOCK

No se encontró información MOCK aplicable a AUTH u ONBOARDING en este documento.

---

### POST_MVP

* Descubrimiento guiado post-onboarding si las features core no son descubiertas.
* `Empleado Familiar` queda fuera del MVP solicitado para este fragment.

---

### IGNORAR

No se incluye contenido clasificado como IGNORAR en este fragment.

---

## 3. Información faltante

### AUTH

* No se encontró flujo Register.
* No se encontró flujo Login.
* No se encontró flujo Refresh Token.
* No se encontró flujo Logout.
* No se encontró entidad Session.
* No se encontró entidad RefreshToken.
* No se encontró entidad AccessToken.
* No se encontraron campos de credenciales.
* No se encontraron reglas de contraseña.
* No se encontraron reglas de email.
* No se encontraron reglas de validación.
* No se encontraron endpoints.
* No se encontraron requests.
* No se encontraron responses.
* No se encontraron errores.
* No se encontraron eventos técnicos de auth.
* No se encontró UI de Login.
* No se encontró UI de Register.

### Crear hogar durante registro

* No se encontró flujo explícito de creación de hogar durante registro.
* No se encontró si crear hogar es obligatorio u opcional.
* No se encontró si el primer miembro recibe automáticamente rol Coordinator.
* No se encontró request/response.
* No se encontró UI.
* No se encontró transacción/atomicidad entre Cuenta, Persona, Hogar y Membresía.

### Invitar miembros durante onboarding

* No se encontró que la invitación ocurra específicamente durante onboarding.
* No se encontró pantalla de invitación.
* No se encontró token/código de invitación.
* No se encontró expiración.
* No se encontró revocación.
* No se encontraron estados técnicos de invitación.
* No se encontró request/response.
* No se encontró manejo de errores.

### Aceptar invitación

* No se encontró endpoint.
* No se encontró request/response.
* No se encontró si aceptar invitación crea Cuenta/Persona o requiere usuario existente.
* No se encontró si aceptar invitación deja Membresía Pendiente hasta aprobación.
* No se encontró si una invitación aceptada puede rechazarse luego.

### Onboarding por rol

* No se encontraron pasos concretos.
* No se encontró selector de rol.
* No se encontró quién asigna rol durante onboarding.
* No se encontró qué ve cada rol durante el onboarding inicial.
* No se encontró si el onboarding cambia según edad, permisos o tipo de membresía.
* No se encontró estructura UI.

### Contradicciones o riesgos

* El documento y archivo de comprensión mencionan siete roles oficiales, incluyendo `Empleado Familiar`; el MVP solicitado para este fragment incluye seis roles y excluye `Empleado Familiar`.
* El documento define que el Adulto puede invitar personas, pero no aprobar ingresos; el flujo MVP debe contemplar esa separación si se usa esta fuente.
* La fuente menciona flujo Invitación → Aceptación → Aprobación → Ingreso, pero no define estados técnicos de invitación.
* La fuente define estados de Membresía en español; el MVP puede requerir nombres técnicos posteriores.
* El archivo de comprensión usa en algunas reglas el nombre `FamilyHub`, mientras el documento principal usa `HomePlus`.

---

## 4. Fuente

* Archivo: `HomePlus — SECCION 2 PRINCIPIOS DEL PRODUCTO.md`
  * Sección: `DECISIONES FUNDACIONALES`.
  * Sección: `PRINCIPIOS RECTORES`.
  * Apartado: `3. El Coordinador administra el hogar. No administra personas.`
  * Apartado: `4. Privacidad no es opacidad`.
  * Apartado: `6. Priorización por frecuencia de uso. No por complejidad técnica.`
  * Sección: `PRIORIDADES ARQUITECTÓNICAS`.
  * Apartado: `Tradeoff 4: Simplicidad en onboarding vs. Completitud funcional`.
  * Apartado: separación e independencia entre hogares.
  * Sección: `QUÉ NUNCA HACEMOS`.

* Archivo: `Seccion 2 Principios de producto.txt`
  * Sección: `OUTPUT 1 — ENTITIES`.
  * Sección: `OUTPUT 2 — RELATIONSHIPS`.
  * Sección: `OUTPUT 5 — BUSINESS RULES`.
  * Sección: `OUTPUT 6 — ARCHITECTURAL DECISIONS`.

* Archivo: `source_map_HomePlus_SECCION_2_PRINCIPIOS_DEL_PRODUCTO.md`
  * Sección: `4.1 AUTH`.
  * Sección: `4.2 ONBOARDING`.
  * Sección: `9. Mapa de flujos`.
  * Sección: `10. Mapa de APIs`.
  * Sección: `11. Mapa de UI`.
  * Sección: `12. Mapa de eventos del sistema`.
  * Sección: `18. Información faltante`.
