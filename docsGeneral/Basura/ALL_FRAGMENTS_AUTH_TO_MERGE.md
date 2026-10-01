**\# AUTH \+ ONBOARDING fragment — HomePlus — SECCION 1 PRODUCTO**

**\#\# 1\. Información encontrada**

**\#\#\# Objetivo del módulo**

\* El documento no define un objetivo técnico de AUTH.  
\* El documento sí define un objetivo de adopción/onboarding relacionado: HomePlus debe dar valor desde el minuto 1 con un solo usuario activo, independientemente de si la familia se suma o no.  
\* El onboarding de nuevos miembros debe mostrar valor individual rápido: cada persona debe ver lo que le importa a ella, no lo que le importa al Coordinador.  
\* El Coordinador como perfil psicográfico de adopción es distinto del rol oficial Coordinador dentro del sistema.

**\#\#\# Entidades**

**\#\#\#\# Cuenta**

\* Pertenece al usuario, no al hogar.  
\* Incluye:  
  \* perfil  
  \* preferencias  
  \* idioma  
  \* configuración personal

**\#\#\#\# Persona**

\* Entidad transversal.  
\* Pertenece a una Cuenta.  
\* Puede participar en varios hogares mediante membresías independientes.  
\* Datos encontrados:  
  \* nombre  
  \* apellido  
  \* foto  
  \* fecha de nacimiento  
  \* género  
  \* contacto

**\#\#\#\# Hogar**

\* Unidad organizativa principal.  
\* Todo ocurre dentro de un hogar.  
\* Cada hogar funciona como entidad independiente.

**\#\#\#\# Membresía**

\* Relación entre Persona y Hogar.  
\* Posee un único rol activo.  
\* Permite que una persona pertenezca a varios hogares con roles independientes.

**\#\#\#\# Roles oficiales encontrados**

El documento y el archivo de comprensión mencionan estos roles oficiales:

\* Coordinador  
\* Adulto  
\* Adolescente  
\* Niño  
\* Adulto Mayor  
\* Invitado  
\* Empleado Familiar

Mapeo al set de roles MVP solicitado:

| Nombre en documento | Nombre MVP |  
| \--- | \--- |  
| Coordinador | Coordinator |  
| Adulto | Adult |  
| Adolescente | Adolescent |  
| Niño | Child |  
| Adulto Mayor | Senior |  
| Invitado | Guest |

\`Empleado Familiar\` aparece como rol oficial en la fuente, pero no pertenece al set de roles MVP solicitado para este fragment.

**\#\#\# Campos**

**\#\#\#\# Cuenta**

\* perfil  
\* preferencias  
\* idioma  
\* configuración personal

No se encontraron campos técnicos de autenticación para Cuenta.

**\#\#\#\# Persona**

\* nombre  
\* apellido  
\* foto  
\* fecha de nacimiento  
\* género  
\* contacto

**\#\#\#\# Membresía**

\* rol activo único

No se encontraron otros campos de membresía relacionados con onboarding o invitaciones.

**\#\#\# Tipos**

\* \`Cuenta\` aparece como entidad de base de datos en el archivo de comprensión.  
\* \`Persona\` aparece como entidad de base de datos en el archivo de comprensión.  
\* \`Hogar\` aparece como entidad de base de datos en el archivo de comprensión.  
\* \`Membresía\` aparece como entidad de base de datos en el archivo de comprensión.  
\* Los roles aparecen como roles oficiales del sistema.

**\#\#\# Valores por defecto**

No se encontraron valores por defecto para AUTH, onboarding, cuenta, persona, membresía, invitaciones o creación de hogar.

**\#\#\# Restricciones**

\* La privacidad individual tiene prioridad sobre la conveniencia.  
\* La información privada pertenece a quien la genera.  
\* Los Coordinadores administran el hogar, no la vida privada de las personas.  
\* Ningún rol obtiene acceso automático a información privada por el solo hecho de tener rol dentro del hogar.  
\* Cada membresía posee un único rol activo.  
\* Cada hogar funciona como entidad independiente.

**\#\#\# Relaciones**

| Origen | Relación | Destino | Notas |  
| \--- | \--- | \--- | \--- |  
| Persona | pertenece a | Cuenta | Relación explícita en archivo de comprensión. |  
| Membresía | vincula | Persona | Relación explícita en archivo de comprensión. |  
| Membresía | vincula | Hogar | Relación explícita en archivo de comprensión. |  
| Membresía | referencia | Rol | La membresía posee un único rol activo. |  
| Persona | participa en | Hogar | Relación mediada por membresía; roles independientes por hogar. |

**\#\#\# Cardinalidad**

\* Una Persona puede participar en varios Hogares.  
\* Una Membresía vincula una Persona con un Hogar.  
\* Cada Membresía posee un único rol activo.  
\* Una persona con perfil psicográfico de Coordinador puede tener cualquiera de los roles técnicos oficiales dentro de un hogar.

**\#\#\# Estados posibles**

**\#\#\#\# Estados de Membresía encontrados**

\* Pendiente  
\* Activa  
\* Suspendida  
\* Finalizada

**\#\#\#\# Estados de adopción/onboarding encontrados**

Estos aparecen como etapas de adopción, no como estados técnicos de una entidad:

1\. Un solo usuario activo.  
2\. Invitación con fricción mínima.  
3\. Adopción natural por conveniencia.  
4\. Sistema del hogar.

**\#\#\#\# Estados de AUTH no encontrados**

No se encontraron estados para:

\* cuenta  
\* sesión  
\* refresh token  
\* login  
\* logout

**\#\#\# Reglas de negocio**

\* HomePlus debe funcionar con un solo usuario activo desde el inicio.  
\* El valor del producto crece con la adopción familiar, pero no depende de ella.  
\* El Coordinador puede usar HomePlus como sistema personal antes de que otros miembros se sumen.  
\* El Coordinador invita a la familia.  
\* Cada nuevo miembro debe encontrar valor individual rápidamente durante el onboarding.  
\* Los miembros se suman por conveniencia propia, no por obligación del Coordinador.  
\* Existe un riesgo de adopción: el Coordinador carga todo, invita a la familia, nadie se suma y abandona.  
\* La mitigación descrita es que el producto tenga utilidad completa para el Coordinador aunque nadie más se sume.  
\* El rol técnico Coordinador no debe confundirse con el perfil psicográfico Coordinador.  
\* Cada hogar es una entidad independiente.  
\* Los roles son independientes por hogar.

**\#\#\# Permisos**

**\#\#\#\# Coordinator / Coordinador**

Puede:

\* aprobar ingresos  
\* cambiar roles  
\* expulsar miembros  
\* transferir coordinación

No puede:

\* eliminar hogares  
\* administrar la vida privada de las personas  
\* acceder automáticamente a información privada por ser Coordinador

**\#\#\#\# Adult / Adulto**

Puede:

\* invitar miembros

No puede:

\* aprobar ingresos

**\#\#\#\# Adolescent / Adolescente**

\* No se encontraron permisos específicos de AUTH, onboarding, hogar o invitaciones para este rol.  
\* El archivo de comprensión lo describe como rol de autonomía progresiva, pero no define acciones de autenticación u onboarding.

**\#\#\#\# Child / Niño**

\* No se encontraron permisos específicos de AUTH, onboarding, hogar o invitaciones para este rol.  
\* El archivo de comprensión indica que no administra información familiar crítica.

**\#\#\#\# Senior / Adulto Mayor**

\* Mantiene permisos equivalentes a Adulto según el archivo de comprensión.  
\* En este fragment, eso implica heredar la capacidad de invitar si se toma Adulto como referencia.  
\* No se encontraron reglas técnicas adicionales para onboarding de Senior.

**\#\#\#\# Guest / Invitado**

\* Acceso mínimo.  
\* Participación limitada.  
\* No se encontraron permisos específicos de AUTH, onboarding, hogar o invitaciones.

**\#\#\# Flujos**

**\#\#\#\# Register**

No se encontró flujo técnico de registro.

No se encontraron:

\* pasos  
\* campos  
\* validaciones  
\* creación de credenciales  
\* creación de sesión  
\* creación explícita de hogar durante registro  
\* respuesta esperada  
\* errores

**\#\#\#\# Login**

No se encontró flujo técnico de login.

No se encontraron:

\* credenciales requeridas  
\* sesión  
\* token  
\* errores  
\* respuesta

**\#\#\#\# Refresh Token**

No se encontró flujo de refresh token.

No se encontraron:

\* entidad RefreshToken  
\* expiración  
\* rotación  
\* revocación  
\* endpoint  
\* errores

**\#\#\#\# Logout**

No se encontró flujo de logout.

No se encontraron:

\* invalidación de sesión  
\* invalidación de refresh token  
\* endpoint  
\* errores

**\#\#\#\# Crear hogar durante registro**

\* No se encontró flujo técnico.  
\* El documento sí establece que el producto debe funcionar con un solo usuario activo desde el primer uso.  
\* El archivo de comprensión define \`Hogar\` como unidad organizativa principal.  
\* No se especifica si el hogar se crea automáticamente durante el registro, manualmente después, o como parte de un wizard de onboarding.

**\#\#\#\# Invitar miembros durante onboarding**

\* El documento indica que el Coordinador invita a la familia.  
\* La invitación debe tener fricción mínima.  
\* El onboarding de cada nuevo miembro debe optimizarse para que el valor individual sea visible en los primeros 60 segundos.  
\* Adulto aparece con permiso para invitar.  
\* No se encontró entidad \`Invitation\`.  
\* No se encontraron tokens, códigos, expiración ni estados de invitación.

**\#\#\#\# Aceptar invitación**

\* No se encontró flujo MVP de aceptar invitación.  
\* Aparece una evolución post-MVP donde un link de invitación abre una web app instantánea.

**\#\#\#\# Onboarding por rol**

\* Existen roles oficiales.  
\* El documento indica que cada persona debe ver lo que le importa a ella durante el onboarding.  
\* No se encontraron pasos específicos por rol.  
\* No se encontraron pantallas, campos, permisos iniciales o reglas de branching por rol.

**\#\#\# APIs**

No se encontraron endpoints ni contratos API para:

\* Register  
\* Login  
\* Refresh Token  
\* Logout  
\* Crear hogar durante registro  
\* Invitar miembro  
\* Aceptar invitación  
\* Onboarding por rol

No se encontraron:

\* método HTTP  
\* ruta  
\* request  
\* response  
\* errores  
\* códigos de estado

**\#\#\# Request**

No se encontraron estructuras de request para AUTH u onboarding.

**\#\#\# Response**

No se encontraron estructuras de response para AUTH u onboarding.

**\#\#\# UI**

No se encontraron pantallas detalladas para:

\* Login  
\* Register  
\* Crear hogar  
\* Invitar miembro  
\* Aceptar invitación  
\* Onboarding por rol

Información UI/conceptual encontrada:

\* El onboarding debe mostrar valor individual al nuevo miembro.  
\* Cada persona debe ver lo que le importa a ella, no lo que le importa al Coordinador.  
\* El valor individual debe ser visible en los primeros 60 segundos.

**\#\#\# Componentes UI**

No se encontraron componentes UI específicos para AUTH u onboarding.

**\#\#\# Navegación**

No se encontró navegación específica para AUTH u onboarding.

**\#\#\# Eventos del sistema**

No se encontraron nombres técnicos de eventos para:

\* auth.registered  
\* auth.logged\_in  
\* auth.logged\_out  
\* auth.token\_refreshed  
\* household.created  
\* invitation.created  
\* invitation.accepted

Eventos conceptuales sin nombre técnico:

\* Coordinador invita familia.  
\* Miembro se suma por conveniencia.  
\* Ingreso al hogar puede ser aprobado por Coordinador.  
\* Rol de miembro puede ser cambiado por Coordinador.  
\* Miembro puede ser expulsado por Coordinador.  
\* Coordinación puede ser transferida por Coordinador.

**\#\#\# Dependencias**

\* AUTH depende conceptualmente de Cuenta y Persona.  
\* Onboarding depende conceptualmente de Hogar, Membresía y Roles.  
\* Invitación depende conceptualmente de Hogar, Persona/Membresía y permisos por rol.  
\* La aceptación de invitación requiere una definición futura porque no hay entidad ni flujo técnico en esta fuente.

**\#\#\# Restricciones arquitectónicas**

\* Separar Cuenta de Hogar.  
\* Separar Persona de Membresía.  
\* La pertenencia al hogar se modela mediante Membresía.  
\* Cada Membresía tiene un único rol activo.  
\* Los roles son independientes por hogar.  
\* Cada hogar funciona como entidad independiente.  
\* La privacidad individual limita lo que un rol puede ver o administrar.  
\* Las acciones que afectan al hogar deben ser visibles y los cambios relevantes deben quedar registrados.

**\#\#\# Casos de uso**

\* Un usuario empieza a usar HomePlus solo.  
\* El Coordinador usa HomePlus aunque la familia todavía no participe.  
\* El Coordinador invita a la familia.  
\* Un nuevo miembro se suma porque encuentra valor individual.  
\* Una persona pertenece a más de un hogar con roles independientes.

**\#\#\# Casos especiales**

\* Coordinador como perfil psicográfico no equivale necesariamente al rol técnico Coordinator.  
\* Una persona con perfil psicográfico de Coordinador puede tener cualquier rol técnico dentro de un hogar.  
\* El escenario de muerte ocurre si el Coordinador carga todo, invita a la familia, nadie se suma y abandona.  
\* Empleado Familiar aparece como rol oficial en la fuente, pero queda fuera del set de roles MVP solicitado.

**\#\#\# Edge cases**

\* El documento no define qué ocurre si una invitación no es aceptada.  
\* El documento no define qué ocurre si una invitación expira.  
\* El documento no define qué ocurre si un usuario ya tiene Cuenta y recibe una invitación.  
\* El documento no define qué ocurre si un usuario pertenece a más de un hogar al registrarse o aceptar invitación.  
\* El documento no define qué ocurre si el único Coordinador abandona el hogar.  
\* El documento no define cómo se recupera acceso a una cuenta.  
\* El documento no define cómo se revoca una sesión.

**\#\#\# Datos mockeados**

No se encontraron datos mockeados para AUTH u onboarding.

**\#\#\# Funcionalidades REAL**

\* Cuenta como entidad conceptual de usuario.  
\* Persona como entidad transversal vinculada a Cuenta.  
\* Hogar como unidad organizativa.  
\* Membresía como vínculo Persona-Hogar.  
\* Rol activo único por membresía.  
\* Roles oficiales del sistema.  
\* Separación entre Coordinador psicográfico y Coordinador técnico.  
\* Valor desde el primer uso con un solo usuario activo.  
\* Invitación familiar mencionada conceptualmente.  
\* Permisos parciales sobre ingresos, roles, expulsión, transferencia de coordinación e invitación.  
\* Separación de datos por hogar a nivel conceptual.  
\* Restricciones de privacidad individual.

**\#\#\# Funcionalidades MOCK**

No se encontró información MOCK para AUTH u onboarding.

**\#\#\# Funcionalidades POST\_MVP**

\* Web app instantánea por link de invitación como puente de adopción.  
\* Empleado Familiar como rol fuera del set MVP solicitado para este fragment.

**\---**

**\#\# 2\. Clasificación para implementación**

**\#\#\# REAL**

\* Modelar separación conceptual entre Cuenta, Persona, Hogar y Membresía si otra fuente técnica lo confirma.  
\* Considerar que una Persona pertenece a una Cuenta.  
\* Considerar que una Membresía vincula Persona con Hogar.  
\* Considerar que cada Membresía tiene un único rol activo.  
\* Usar los roles MVP solicitados con el mapeo:  
  \* Coordinador → Coordinator  
  \* Adulto → Adult  
  \* Adolescente → Adolescent  
  \* Niño → Child  
  \* Adulto Mayor → Senior  
  \* Invitado → Guest  
\* Mantener separada la noción de Coordinador psicográfico y Coordinator como rol técnico.  
\* Considerar que el producto debe permitir valor inicial con un solo usuario activo.  
\* Considerar la invitación familiar como flujo requerido pero no definido técnicamente en esta fuente.  
\* Respetar privacidad individual frente a permisos de hogar.

**\#\#\# MOCK**

No se encontró información que deba simularse para AUTH u onboarding en este documento.

**\#\#\# POST\_MVP**

\* Web app instantánea abierta desde link de invitación.  
\* Empleado Familiar como rol fuera del set MVP solicitado.

**\#\#\# IGNORAR**

No se incluye contenido en esta categoría dentro del fragment.

**\---**

**\#\# 3\. Información faltante**

| Tema | Información faltante | Impacto |  
| \--- | \--- | \--- |  
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

**\#\#\# Contradicciones o riesgos**

\* El documento menciona 7 roles oficiales, pero el MVP solicitado para este fragment usa 6 roles; \`Empleado Familiar\` debe quedar fuera del MVP.  
\* “Coordinador” aparece como perfil psicográfico y como rol técnico; mezclarlos produciría permisos incorrectos.  
\* El documento habla de invitación con fricción mínima, pero no define aceptación, tokens, estados ni entidad \`Invitation\`.  
\* La fuente permite entender separación Cuenta/Persona/Hogar, pero no define si \`Cuenta\` equivale a \`User\` o \`Account\` en implementación.  
\* La fuente contiene información conceptual de adopción, no una especificación técnica de AUTH.

**\---**

**\#\# 4\. Fuente**

\* Archivo: \`HomePlus — SECCION 1 PRODUCTO.md\`  
  \* Sección: \`TARGET USERS\`  
  \* Sección: \`IDENTIDAD LATAM\`  
  \* Sección: \`ADOPCIÓN — MODELO Y RIESGOS\`  
  \* Sección: \`DECISIONES DE PRODUCTO TOMADAS\`  
  \* Sección: \`PRINCIPIO DE VISIBILIDAD\`  
\* Archivo: \`Seccion 1 Producto.txt\`  
  \* Sección: \`OUTPUT 1 — ENTITIES\`  
  \* Sección: \`OUTPUT 2 — RELATIONSHIPS\`  
  \* Sección: \`OUTPUT 5 — BUSINESS RULES\`  
  \* Sección: \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`  
  \* Sección: \`OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS\`  
\* Archivo: \`source\_map\_HomePlus\_SECCION\_1\_PRODUCTO.md\`  
  \* Sección: \`4.1 AUTH\`  
  \* Sección: \`4.2 ONBOARDING\`  
  \* Sección: \`8. Mapa de permisos\`  
  \* Sección: \`9. Mapa de flujos\`  
  \* Sección: \`10. Mapa de APIs\`  
  \* Sección: \`11. Mapa de UI\`  
  \* Sección: \`13. Restricciones arquitectónicas detectadas\`  
  \* Sección: \`18. Información faltante\`

**\# AUTH \+ ONBOARDING fragment — HomePlus — SECCION 2 PRINCIPIOS DEL PRODUCTO**

**\#\# 1\. Información encontrada**

**\#\#\# Objetivo del módulo**

**\#\#\#\# AUTH**

No se encontró una definición explícita del objetivo de AUTH en este documento.

La información implementable relacionada con AUTH aparece de forma indirecta a través de las entidades \`Cuenta\`, \`Persona\` y \`Perfil Personal\`, y a través de restricciones de privacidad, separación de datos y pertenencia a hogares.

**\#\#\#\# ONBOARDING**

El onboarding debe priorizar simplicidad y adopción inicial.

Información explícita encontrada:

\* El onboarding debe entregar valor en aproximadamente 60 segundos.  
\* El primer uso no debe exponer todas las funcionalidades del sistema.  
\* Las funcionalidades complejas deben quedar fuera del onboarding inicial.  
\* Cada miembro debe encontrar valor individual desde el primer uso.  
\* El Home posterior al onboarding se adapta por rol.

**\---**

**\#\#\# Entidades**

**\#\#\#\# Cuenta**

\* Pertenece al usuario, no al hogar.  
\* Incluye perfil, preferencias, idioma y configuración personal.  
\* Funciona como entidad individual asociada al usuario.

**\#\#\#\# Persona**

\* Entidad transversal.  
\* Toda Persona pertenece a una Cuenta.  
\* Una Persona puede participar en uno o más hogares.

**\#\#\#\# Perfil Personal**

\* Pertenece a la Cuenta.  
\* Contiene preferencias, idioma y configuración personal.

**\#\#\#\# Hogar**

\* Unidad organizativa principal.  
\* Todo ocurre dentro de un hogar.  
\* Cada hogar funciona como entidad independiente.

**\#\#\#\# Membresía**

\* Relación entre una Persona y un Hogar.  
\* Posee rol.  
\* Posee estado.  
\* Permite representar la participación de una Persona dentro de un Hogar.

**\#\#\#\# Rol**

Roles oficiales encontrados en el documento:

\* Coordinador.  
\* Adulto.  
\* Adolescente.  
\* Niño.  
\* Adulto Mayor.  
\* Invitado.  
\* Empleado Familiar.

Mapeo al MVP solicitado:

\* Coordinador → Coordinator.  
\* Adulto → Adult.  
\* Adolescente → Adolescent.  
\* Niño → Child.  
\* Adulto Mayor → Senior.  
\* Invitado → Guest.

\`Empleado Familiar\` aparece en la fuente como rol oficial, pero queda fuera del MVP solicitado para este fragment.

**\#\#\#\# Invitación**

\* Aparece como flujo de ingreso al hogar.  
\* Flujo encontrado: Invitación → Aceptación → Aprobación → Ingreso al hogar.

**\---**

**\#\#\# Campos**

**\#\#\#\# Cuenta**

Campos o atributos conceptuales encontrados:

\* perfil.  
\* preferencias.  
\* idioma.  
\* configuración personal.

No se encontraron tipos de datos.

**\#\#\#\# Persona**

Relaciones encontradas:

\* pertenece a una Cuenta.  
\* puede participar en uno o más Hogares.

No se encontraron campos técnicos adicionales.

**\#\#\#\# Membresía**

Campos o atributos conceptuales encontrados:

\* Persona.  
\* Hogar.  
\* Rol.  
\* Estado.

No se encontraron tipos de datos.

**\#\#\#\# Rol**

Campo conceptual encontrado:

\* cada Membresía posee un único rol activo.

No se encontró estructura técnica de tabla, enum o permisos por endpoint.

**\#\#\#\# Invitación**

No se encontraron campos técnicos.

No se encontró:

\* token.  
\* código.  
\* expiración.  
\* email destino.  
\* estado de invitación.  
\* created\_at.  
\* accepted\_at.  
\* approved\_at.

**\---**

**\#\#\# Tipos**

Tipos explícitos o semánticos encontrados:

\* \`Cuenta\`: entidad de usuario.  
\* \`Persona\`: entidad transversal.  
\* \`Hogar\`: unidad organizativa principal.  
\* \`Membresía\`: relación Persona-Hogar.  
\* \`Rol\`: rol dentro de una membresía.  
\* \`Invitación\`: workflow de ingreso al hogar.

No se encontraron tipos técnicos de AUTH:

\* Session.  
\* RefreshToken.  
\* AccessToken.  
\* PasswordCredential.  
\* EmailCredential.

**\---**

**\#\#\# Valores por defecto**

No se encontraron valores por defecto para Register, Login, Refresh Token o Logout.

Valores/reglas por defecto relacionados con onboarding y membresía:

\* Los compromisos compartidos son visibles por defecto en el hogar.  
\* Los datos personales privados permanecen privados por defecto.  
\* Cada membresía posee un único rol activo.  
\* El Home no es configurable por el usuario en MVP; se adapta por rol y contexto.

**\---**

**\#\#\# Restricciones**

**\#\#\#\# Privacidad individual**

\* La privacidad individual prevalece sobre la coordinación cuando se trata de datos personales.  
\* El Coordinador no puede acceder a datos privados de otros miembros.  
\* La Cuenta pertenece al usuario, no al hogar.

**\#\#\#\# Coordinación compartida**

\* Los compromisos compartidos son visibles por defecto.  
\* Las responsabilidades compartidas son visibles.  
\* Las acciones que afectan al hogar deben quedar registradas.

**\#\#\#\# Separación por hogar**

\* Un usuario puede pertenecer a múltiples hogares.  
\* Cada hogar funciona como entidad independiente.  
\* Los roles son independientes por hogar.  
\* Una misma Persona puede tener distinto rol en distintos hogares.  
\* La memoria familiar pertenece al hogar y no se comparte automáticamente entre hogares.

**\#\#\#\# Poder del Coordinador**

\* El Coordinador administra el hogar.  
\* El Coordinador no administra la vida privada de las personas.  
\* Los poderes del Coordinador están definidos y acotados.  
\* Toda acción unilateral relevante del Coordinador queda registrada en auditoría permanente.  
\* El Coordinador no puede eliminar hogares.

**\#\#\#\# Onboarding**

\* El onboarding debe priorizar adopción sobre completitud funcional.  
\* El onboarding no debe exponer todas las funcionalidades en el primer uso.  
\* La complejidad debe resolverse por diseño y defaults, no trasladarse al usuario.

**\---**

**\#\#\# Relaciones**

Relaciones explícitas encontradas:

| Origen | Relación | Destino | Nota |  
| \------ | \-------- | \------- | \---- |  
| Cuenta | owns / pertenece a | Persona | La Cuenta posee o contiene la Persona asociada. |  
| Persona | participa en | Hogar | Una Persona puede participar en uno o más hogares. |  
| Membresía | links | Persona | La Membresía vincula Persona con Hogar. |  
| Membresía | links | Hogar | La Membresía vincula Persona con Hogar. |  
| Membresía | has\_role | Rol | Cada Membresía posee rol. |  
| Coordinador | approves | Invitación / ingreso | El Coordinador autoriza entrada de nuevos miembros. |  
| Coordinador | changes | Rol | Puede modificar roles dentro de los roles oficiales. |  
| Coordinador | expels | Persona / miembro | Puede remover miembros del hogar, conservando historial. |  
| Persona | has | Perfil Personal | El perfil pertenece al ámbito de Cuenta/Persona. |

**\---**

**\#\#\# Cardinalidad**

Información encontrada:

\* Una Cuenta se asocia con una Persona.  
\* Una Persona puede participar en uno o más Hogares.  
\* Una Membresía vincula una Persona con un Hogar.  
\* Una Membresía posee un único rol activo.  
\* Un Hogar puede tener múltiples miembros mediante Membresías.

No se encontraron cardinalidades formales adicionales.

**\---**

**\#\#\# Estados posibles**

**\#\#\#\# Membresía**

Estados encontrados:

\* Pendiente.  
\* Activa.  
\* Suspendida.  
\* Finalizada.

No se encontró mapeo técnico a nombres en inglés.

**\#\#\#\# Invitación**

No se encontraron estados técnicos de Invitación.

Solo se encontró el flujo:

\* Invitación.  
\* Aceptación.  
\* Aprobación.  
\* Ingreso al hogar.

**\#\#\#\# Sesión / Token / RefreshToken**

No se encontraron estados.

**\---**

**\#\#\# Reglas de negocio**

**\#\#\#\# AUTH**

\* La Cuenta pertenece al usuario, no al hogar.  
\* La Persona funciona como entidad transversal asociada a Cuenta.  
\* La Persona puede participar en uno o más hogares.  
\* Los datos personales privados no se comparten automáticamente con el hogar.  
\* La pertenencia a un hogar se representa mediante Membresía.

**\#\#\#\# ONBOARDING**

\* El onboarding debe entregar valor rápidamente.  
\* La adopción inicial tiene prioridad sobre mostrar completitud funcional.  
\* El usuario no debe tener que configurar complejidad avanzada para obtener valor inicial.  
\* El rol asignado afecta la experiencia posterior, especialmente Home.

**\#\#\#\# Invitación e ingreso**

\* La invitación y la aceptación son pasos previos obligatorios antes del ingreso aprobado.  
\* El Coordinador autoriza la entrada de nuevos miembros.  
\* El Adulto puede invitar personas, pero no aprobar ingresos.  
\* El ingreso al hogar queda ligado a una Membresía con rol.

**\#\#\#\# Roles**

\* Existen roles oficiales definidos por el documento.  
\* Para este fragment MVP se consideran solo: Coordinator, Adult, Adolescent, Child, Senior y Guest.  
\* Cada Membresía posee un único rol activo.  
\* Las relaciones familiares son informativas y no modifican permisos automáticamente.

**\#\#\#\# Auditoría**

\* Toda acción del Coordinador que afecte miembros o configuraciones queda registrada.  
\* La auditoría es visible para todos los miembros del hogar.  
\* La auditoría no puede borrarse.

**\---**

**\#\#\# Permisos**

**\#\#\#\# Coordinator / Coordinador**

Puede:

\* Autorizar la entrada de nuevos miembros al hogar.  
\* Cambiar roles dentro de los roles oficiales.  
\* Expulsar o remover miembros.  
\* Transferir coordinación.  
\* Administrar configuraciones operativas del hogar.

No puede:

\* Acceder a datos privados de otros miembros.  
\* Eliminar hogares.  
\* Borrar auditoría de sus propias acciones.  
\* Desactivar funciones del sistema para otros miembros.

Condiciones:

\* Las acciones unilaterales relevantes quedan auditadas.  
\* Las acciones sobre miembros o configuraciones son visibles en el historial del hogar.

**\#\#\#\# Adult / Adulto**

Puede:

\* Invitar personas.  
\* Administrar operaciones familiares.

No puede:

\* Aprobar ingresos.

**\#\#\#\# Adolescent / Adolescente**

Información encontrada:

\* Autonomía progresiva.  
\* Puede recibir permisos adicionales.

Para este fragment, solo es relevante la autonomía progresiva y el onboarding/experiencia por rol.

**\#\#\#\# Child / Niño**

\* Tiene acceso simplificado.  
\* No administra información familiar crítica.

**\#\#\#\# Senior / Adulto Mayor**

\* Tiene experiencia adaptada.  
\* Home prioriza personas, eventos, recordatorios y coordinación.  
\* Permisos equivalentes a Adulto según el archivo de comprensión.

**\#\#\#\# Guest / Invitado**

\* Acceso mínimo.  
\* Participación limitada.

**\---**

**\#\#\# Flujos**

**\#\#\#\# Register**

No encontrado.

No se encontró:

\* flujo de registro.  
\* creación de credenciales.  
\* validación de email.  
\* creación de Cuenta.  
\* creación de Persona.  
\* creación de sesión posterior al registro.  
\* errores.  
\* request.  
\* response.

**\#\#\#\# Login**

No encontrado.

No se encontró:

\* flujo de login.  
\* credenciales.  
\* sesión.  
\* tokens.  
\* errores.  
\* request.  
\* response.

**\#\#\#\# Refresh Token**

No encontrado.

No se encontró:

\* entidad RefreshToken.  
\* rotación de token.  
\* expiración.  
\* revocación.  
\* endpoint.  
\* request.  
\* response.

**\#\#\#\# Logout**

No encontrado.

No se encontró:

\* invalidación de sesión.  
\* invalidación de refresh token.  
\* endpoint.  
\* request.  
\* response.

**\#\#\#\# Crear hogar durante registro**

No encontrado explícitamente.

Información relacionada encontrada:

\* Hogar es la unidad organizativa principal.  
\* Todo ocurre dentro de un hogar.  
\* Una Persona puede participar en uno o más hogares.  
\* La Membresía conecta Persona con Hogar.

No se encontró el flujo específico \`Register → Crear Hogar → Crear Membresía inicial\`.

**\#\#\#\# Invitar miembros durante onboarding**

Parcial.

Información encontrada:

\* Adulto puede invitar personas.  
\* Coordinador puede autorizar la entrada de nuevos miembros.  
\* La Invitación y Aceptación son pasos previos obligatorios antes del ingreso.  
\* Flujo encontrado: Invitación → Aceptación → Aprobación → Ingreso al hogar.

No se encontró que este flujo ocurra específicamente dentro del onboarding.

**\#\#\#\# Onboarding por rol**

Parcial.

Información encontrada:

\* El Home se adapta por rol.  
\* Coordinador tiene visión completa del hogar.  
\* Adulto tiene visión operativa.  
\* Adolescente tiene más foco en tareas, eventos y coordinación.  
\* Niño tiene experiencia simplificada.  
\* Adulto Mayor tiene experiencia adaptada con prioridad en personas, eventos, recordatorios y coordinación.  
\* Invitado tiene acceso mínimo.

No se encontró una secuencia de pantallas o pasos de onboarding por rol.

**\---**

**\#\#\# APIs**

No se encontraron endpoints definidos.

| Acción | Método | Ruta | Request | Response | Errores | Estado en esta fuente |  
| \------ | \------ | \---- | \------- | \-------- | \------- | \--------------------- |  
| Register | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado |  
| Login | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado |  
| Refresh Token | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado |  
| Logout | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado |  
| Crear hogar durante registro | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado explícitamente |  
| Invitar miembro | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API |  
| Aceptar invitación | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Flujo mencionado sin contrato API |  
| Aprobar ingreso | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API |

**\---**

**\#\#\# Request**

No se encontraron requests para:

\* Register.  
\* Login.  
\* Refresh Token.  
\* Logout.  
\* Crear hogar durante registro.  
\* Invitar miembros durante onboarding.  
\* Aceptar invitación.  
\* Aprobar ingreso.

**\---**

**\#\#\# Response**

No se encontraron responses para:

\* Register.  
\* Login.  
\* Refresh Token.  
\* Logout.  
\* Crear hogar durante registro.  
\* Invitar miembros durante onboarding.  
\* Aceptar invitación.  
\* Aprobar ingreso.

**\---**

**\#\#\# UI**

**\#\#\#\# Login**

No encontrado.

**\#\#\#\# Register**

No encontrado.

**\#\#\#\# Onboarding**

Parcial.

Información encontrada:

\* Debe ser simple.  
\* Debe entregar valor rápido.  
\* No debe exponer todas las funcionalidades en el primer uso.  
\* Las features complejas deben quedar fuera del primer uso.

No se encontraron:

\* pantallas.  
\* inputs.  
\* botones.  
\* validaciones.  
\* estados visuales.  
\* pasos del wizard.

**\#\#\#\# Create Household**

No encontrado como pantalla.

**\#\#\#\# Invite Member**

Mencionado como acción permitida para Adulto, pero no como pantalla.

**\#\#\#\# Accept Invitation**

Mencionado como parte del flujo de Invitación, pero no como pantalla.

**\#\#\#\# Home post-onboarding por rol**

Información encontrada:

\* Home no es configurable por usuario en MVP.  
\* Home se adapta por rol.  
\* Home funciona como centro operativo.  
\* Home resume información y conduce a los módulos que administran esa información.

**\---**

**\#\#\# Componentes UI**

No se encontraron componentes específicos de AUTH.

Componentes relacionados con onboarding/post-onboarding:

\* Home adaptado por rol.

No se encontraron componentes de:

\* formulario de registro.  
\* formulario de login.  
\* selector de rol durante onboarding.  
\* creador de hogar.  
\* invitador de miembros.  
\* aceptación de invitación.

**\---**

**\#\#\# Navegación**

Información encontrada:

\* Las funciones de uso diario deben estar en navegación primaria.  
\* Las funciones de uso semanal deben estar a un tap.  
\* Las funciones ocasionales viven en More o Configuración.  
\* El usuario no debería tener que aprender dónde está cada cosa.  
\* Home es punto de entrada operativo después del onboarding.

No se encontró navegación específica de Auth antes del login.

**\---**

**\#\#\# Eventos del sistema**

No se encontraron nombres técnicos de eventos.

Eventos conceptuales no definidos técnicamente:

\* usuario registrado.  
\* usuario logueado.  
\* token refrescado.  
\* usuario deslogueado.  
\* hogar creado.  
\* invitación creada.  
\* invitación aceptada.  
\* ingreso aprobado.  
\* miembro ingresó al hogar.  
\* rol asignado.

**\---**

**\#\#\# Dependencias**

AUTH depende conceptualmente de:

\* Cuenta.  
\* Persona.  
\* Perfil Personal.

ONBOARDING depende conceptualmente de:

\* AUTH.  
\* Hogar.  
\* Membresía.  
\* Invitación.  
\* Rol.  
\* Home adaptado por rol.

Crear hogar durante registro depende conceptualmente de:

\* Hogar.  
\* Persona.  
\* Membresía.  
\* Rol inicial.

Invitar miembros durante onboarding depende conceptualmente de:

\* Invitación.  
\* Membresía.  
\* Rol.  
\* Permisos de Adulto y Coordinador.  
\* Aprobación de ingreso por Coordinador.

**\---**

**\#\#\# Restricciones arquitectónicas**

\* La interfaz debe mantenerse simple independientemente de la complejidad interna.  
\* La complejidad no debe trasladarse al usuario como configuración obligatoria.  
\* Los defaults deben funcionar para la mayoría de usuarios.  
\* Cada módulo debe entregar valor individual desde el primer uso.  
\* La coordinación colectiva crece con la adopción.  
\* Las acciones relevantes del Coordinador quedan auditadas.  
\* Los hogares son independientes.  
\* Roles, permisos y datos operativos se interpretan por hogar.  
\* La privacidad individual no se anula por pertenecer a un hogar.

**\---**

**\#\#\# Casos de uso**

Casos de uso encontrados de forma explícita o parcial:

\* Una Persona participa en uno o más hogares.  
\* Un Coordinador autoriza la entrada de nuevos miembros.  
\* Un Adulto invita personas.  
\* Un usuario ingresa al hogar mediante Invitación → Aceptación → Aprobación → Ingreso.  
\* Un Coordinador cambia roles.  
\* Un Coordinador administra configuraciones operativas del hogar.  
\* El onboarding entrega valor rápido sin mostrar toda la complejidad.  
\* La experiencia post-onboarding se adapta por rol.

**\---**

**\#\#\# Casos especiales**

\* Una Persona puede pertenecer a múltiples hogares.  
\* Los roles son independientes entre hogares.  
\* Una Persona puede ser Coordinador en un hogar y Adulto en otro.  
\* El Coordinador tiene poder operativo, pero no puede acceder a datos privados de otros miembros.  
\* El Coordinador no puede eliminar hogares.  
\* Las relaciones familiares no modifican permisos automáticamente.  
\* El documento menciona \`Empleado Familiar\` como rol oficial, pero no forma parte del MVP solicitado para este fragment.

**\---**

**\#\#\# Edge cases**

\* No se define qué ocurre si un usuario registra Cuenta/Persona pero no crea ni se une a ningún hogar.  
\* No se define qué ocurre si una invitación se acepta pero el Coordinador no aprueba el ingreso.  
\* No se define qué ocurre si el Coordinador cambia el rol durante onboarding.  
\* No se define qué ocurre si un Adulto invita a alguien pero no hay Coordinador disponible para aprobar.  
\* No se define expiración, revocación ni reutilización de invitaciones.  
\* No se define si el primer usuario de un hogar recibe automáticamente rol Coordinator.  
\* No se define si crear hogar durante registro es obligatorio u opcional.

**\---**

**\#\#\# Datos mockeados**

No se encontraron datos mockeados para AUTH u ONBOARDING en este documento.

**\---**

**\#\#\# Funcionalidades REAL**

Información real extraíble desde esta fuente:

\* Cuenta como entidad individual del usuario.  
\* Persona como entidad transversal asociada a Cuenta.  
\* Hogar como unidad organizativa principal.  
\* Membresía como vínculo Persona-Hogar.  
\* Rol dentro de Membresía.  
\* Estados de Membresía: Pendiente, Activa, Suspendida, Finalizada.  
\* Invitación como flujo de ingreso.  
\* Flujo conceptual: Invitación → Aceptación → Aprobación → Ingreso al hogar.  
\* Coordinador aprueba ingresos.  
\* Adulto puede invitar personas.  
\* Onboarding debe ser simple y entregar valor rápido.  
\* Home posterior al onboarding se adapta por rol.  
\* Separación de datos y roles por hogar.  
\* Auditoría de acciones relevantes del Coordinador.

**\---**

**\#\#\# Funcionalidades MOCK**

No se encontraron funcionalidades MOCK aplicables a AUTH u ONBOARDING.

**\---**

**\#\#\# Funcionalidades POST\_MVP**

\* Descubrimiento guiado post-onboarding si las features core no se descubren.  
\* \`Empleado Familiar\` como rol fuera del MVP solicitado para este fragment.

**\---**

**\#\# 2\. Clasificación para implementación**

**\#\#\# REAL**

**\#\#\#\# AUTH**

\* Implementar la separación conceptual entre Cuenta, Persona, Hogar y Membresía.  
\* Considerar que Cuenta pertenece al usuario, no al hogar.  
\* Considerar que Persona pertenece a Cuenta.  
\* Considerar que Persona puede participar en uno o más hogares.  
\* Considerar que Membresía representa la relación Persona-Hogar.  
\* Considerar que Membresía incluye rol y estado.  
\* Respetar privacidad individual de datos personales.  
\* Respetar separación de datos por hogar.

**\#\#\#\# ONBOARDING**

\* El onboarding debe priorizar adopción y simplicidad.  
\* El onboarding debe entregar valor rápido.  
\* El onboarding no debe exponer todas las funcionalidades del producto al primer uso.  
\* El rol debe afectar la experiencia posterior.  
\* El Home posterior al onboarding debe adaptarse por rol.  
\* El ingreso de miembros al hogar debe pasar por Invitación → Aceptación → Aprobación → Ingreso, según la fuente.  
\* El Coordinador aprueba ingresos.  
\* El Adulto puede invitar personas.

**\#\#\#\# Roles MVP**

\* Coordinator: basado en Coordinador.  
\* Adult: basado en Adulto.  
\* Adolescent: basado en Adolescente.  
\* Child: basado en Niño.  
\* Senior: basado en Adulto Mayor.  
\* Guest: basado en Invitado.

**\---**

**\#\#\# MOCK**

No se encontró información MOCK aplicable a AUTH u ONBOARDING en este documento.

**\---**

**\#\#\# POST\_MVP**

\* Descubrimiento guiado post-onboarding si las features core no son descubiertas.  
\* \`Empleado Familiar\` queda fuera del MVP solicitado para este fragment.

**\---**

**\#\#\# IGNORAR**

No se incluye contenido clasificado como IGNORAR en este fragment.

**\---**

**\#\# 3\. Información faltante**

**\#\#\# AUTH**

\* No se encontró flujo Register.  
\* No se encontró flujo Login.  
\* No se encontró flujo Refresh Token.  
\* No se encontró flujo Logout.  
\* No se encontró entidad Session.  
\* No se encontró entidad RefreshToken.  
\* No se encontró entidad AccessToken.  
\* No se encontraron campos de credenciales.  
\* No se encontraron reglas de contraseña.  
\* No se encontraron reglas de email.  
\* No se encontraron reglas de validación.  
\* No se encontraron endpoints.  
\* No se encontraron requests.  
\* No se encontraron responses.  
\* No se encontraron errores.  
\* No se encontraron eventos técnicos de auth.  
\* No se encontró UI de Login.  
\* No se encontró UI de Register.

**\#\#\# Crear hogar durante registro**

\* No se encontró flujo explícito de creación de hogar durante registro.  
\* No se encontró si crear hogar es obligatorio u opcional.  
\* No se encontró si el primer miembro recibe automáticamente rol Coordinator.  
\* No se encontró request/response.  
\* No se encontró UI.  
\* No se encontró transacción/atomicidad entre Cuenta, Persona, Hogar y Membresía.

**\#\#\# Invitar miembros durante onboarding**

\* No se encontró que la invitación ocurra específicamente durante onboarding.  
\* No se encontró pantalla de invitación.  
\* No se encontró token/código de invitación.  
\* No se encontró expiración.  
\* No se encontró revocación.  
\* No se encontraron estados técnicos de invitación.  
\* No se encontró request/response.  
\* No se encontró manejo de errores.

**\#\#\# Aceptar invitación**

\* No se encontró endpoint.  
\* No se encontró request/response.  
\* No se encontró si aceptar invitación crea Cuenta/Persona o requiere usuario existente.  
\* No se encontró si aceptar invitación deja Membresía Pendiente hasta aprobación.  
\* No se encontró si una invitación aceptada puede rechazarse luego.

**\#\#\# Onboarding por rol**

\* No se encontraron pasos concretos.  
\* No se encontró selector de rol.  
\* No se encontró quién asigna rol durante onboarding.  
\* No se encontró qué ve cada rol durante el onboarding inicial.  
\* No se encontró si el onboarding cambia según edad, permisos o tipo de membresía.  
\* No se encontró estructura UI.

**\#\#\# Contradicciones o riesgos**

\* El documento y archivo de comprensión mencionan siete roles oficiales, incluyendo \`Empleado Familiar\`; el MVP solicitado para este fragment incluye seis roles y excluye \`Empleado Familiar\`.  
\* El documento define que el Adulto puede invitar personas, pero no aprobar ingresos; el flujo MVP debe contemplar esa separación si se usa esta fuente.  
\* La fuente menciona flujo Invitación → Aceptación → Aprobación → Ingreso, pero no define estados técnicos de invitación.  
\* La fuente define estados de Membresía en español; el MVP puede requerir nombres técnicos posteriores.  
\* El archivo de comprensión usa en algunas reglas el nombre \`FamilyHub\`, mientras el documento principal usa \`HomePlus\`.

**\---**

**\#\# 4\. Fuente**

\* Archivo: \`HomePlus — SECCION 2 PRINCIPIOS DEL PRODUCTO.md\`  
  \* Sección: \`DECISIONES FUNDACIONALES\`.  
  \* Sección: \`PRINCIPIOS RECTORES\`.  
  \* Apartado: \`3. El Coordinador administra el hogar. No administra personas.\`  
  \* Apartado: \`4. Privacidad no es opacidad\`.  
  \* Apartado: \`6. Priorización por frecuencia de uso. No por complejidad técnica.\`  
  \* Sección: \`PRIORIDADES ARQUITECTÓNICAS\`.  
  \* Apartado: \`Tradeoff 4: Simplicidad en onboarding vs. Completitud funcional\`.  
  \* Apartado: separación e independencia entre hogares.  
  \* Sección: \`QUÉ NUNCA HACEMOS\`.

\* Archivo: \`Seccion 2 Principios de producto.txt\`  
  \* Sección: \`OUTPUT 1 — ENTITIES\`.  
  \* Sección: \`OUTPUT 2 — RELATIONSHIPS\`.  
  \* Sección: \`OUTPUT 5 — BUSINESS RULES\`.  
  \* Sección: \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`.

\* Archivo: \`source\_map\_HomePlus\_SECCION\_2\_PRINCIPIOS\_DEL\_PRODUCTO.md\`  
  \* Sección: \`4.1 AUTH\`.  
  \* Sección: \`4.2 ONBOARDING\`.  
  \* Sección: \`9. Mapa de flujos\`.  
  \* Sección: \`10. Mapa de APIs\`.  
  \* Sección: \`11. Mapa de UI\`.  
  \* Sección: \`12. Mapa de eventos del sistema\`.  
  \* Sección: \`18. Información faltante\`.

**\# AUTH \+ ONBOARDING fragment — HomePlus — SECCION 3 FILOSOFIA**

**\#\# 1\. Información encontrada**

**\#\#\# Objetivo del módulo**

No se encontró una sección específica de Auth ni un objetivo técnico para autenticación.

Sí se encontró información transversal útil para Auth \+ Onboarding:

\* La identidad operativa se organiza alrededor de \`Cuenta\`, \`Persona\`, \`Hogar\` y \`Membership\`.  
\* \`Cuenta\` pertenece al usuario, no al hogar.  
\* \`Persona\` representa a una persona, pertenece a una cuenta y puede participar en uno o más hogares.  
\* \`Hogar\` es la unidad organizativa principal: todo ocurre dentro de un hogar.  
\* \`Membership\` representa la relación entre persona y hogar.  
\* La coordinación depende del contexto del hogar: los roles son independientes por hogar y los datos no se cruzan entre hogares.

**\#\#\# Entidades**

**\#\#\#\# Cuenta**

\* Entidad Core.  
\* Pertenece al usuario, no al hogar.  
\* Se menciona que contiene perfil, preferencias e idioma.  
\* No se definen credenciales ni campos de autenticación.

**\#\#\#\# Persona**

\* Entidad People.  
\* Representa una persona.  
\* Pertenece a una cuenta.  
\* Puede participar en uno o más hogares.

**\#\#\#\# Hogar**

\* Entidad Core.  
\* Es la unidad organizativa principal.  
\* Todo ocurre dentro de un hogar.

**\#\#\#\# Membership**

\* Entidad People.  
\* Relaciona persona y hogar.  
\* Tiene rol asociado.  
\* Estados encontrados:  
  \* \`Pendiente\`  
  \* \`Activa\`  
  \* \`Suspendida\`  
  \* \`Finalizada\`

**\#\#\#\# Rol**

Roles encontrados y mapeo al MVP:

| Nombre en documento | Nombre MVP |  
| \------------------- | \---------- |  
| Coordinador | Coordinator |  
| Adulto | Adult |  
| Adolescente | Adolescent |  
| Niño | Child |  
| AdultoMayor / Adulto Mayor | Senior |  
| Invitado | Guest |

**\#\#\#\# Invitación**

\* Aparece como workflow conceptual.  
\* Flujo encontrado: \`Invitación → Aceptación → Aprobación → Ingreso al hogar\`.  
\* No se define una entidad técnica con campos.

**\#\#\# Campos**

**\#\#\#\# Cuenta**

Campos mencionados sin tipo ni contrato:

\* perfil  
\* preferencias  
\* idioma

No se encontraron campos para:

\* email  
\* password  
\* provider  
\* avatar  
\* nombre  
\* teléfono  
\* estado de cuenta  
\* verificación de email

**\#\#\#\# Persona**

No se definen campos técnicos.

Solo se indica que:

\* pertenece a una cuenta  
\* puede participar en uno o más hogares

**\#\#\#\# Membership**

Campos implícitos por relaciones:

\* persona  
\* hogar  
\* rol  
\* estado

No se definen nombres técnicos, tipos ni restricciones.

**\#\#\#\# Onboarding**

Preguntas encontradas en onboarding/configuración periódica:

\* disponibilidad diaria para tareas del hogar:  
  \* \`1-2hs\`  
  \* \`3-4hs\`  
  \* \`5+hs\`  
\* existencia de limitación física o de salud que afecte capacidad  
\* período de alta carga externa, con ejemplos:  
  \* exámenes  
  \* proyecto laboral intenso  
  \* cuidado de alguien

No se define cómo se guardan estas respuestas ni si pertenecen a \`Persona\`, \`Membership\` u otra entidad.

**\#\#\# Tipos**

No se encontraron tipos técnicos formales.

Solo aparecen valores enumerables conceptuales para:

\* disponibilidad diaria  
\* estados de Membership  
\* roles

**\#\#\# Valores por defecto**

No se encontraron valores por defecto para Auth, sesión, token, usuario, cuenta, persona, hogar, invitación ni onboarding.

**\#\#\# Restricciones**

\* La cuenta pertenece al usuario, no al hogar.  
\* La persona puede participar en más de un hogar.  
\* Los roles son contextuales al hogar.  
\* Los datos de un hogar no se cruzan con los de otro.  
\* Las relaciones familiares son informativas y no modifican permisos automáticamente.  
\* Ningún rol obtiene acceso automático a datos privados personales.  
\* Los Coordinadores no pueden eliminar hogares.

**\#\#\# Relaciones**

| Origen | Relación | Destino | Estado |  
| \------ | \-------- | \------- | \------ |  
| Persona | pertenece a | Cuenta | explícita |  
| Persona | tiene | Membership | explícita |  
| Membership | vincula | Hogar | explícita |  
| Membership | tiene rol | Coordinador / Adulto / Adolescente / Niño / AdultoMayor / Invitado | explícita |  
| Persona | participa en | Hogar | explícita/conceptual |  
| Invitación | deriva en | aceptación, aprobación e ingreso al hogar | conceptual |

**\#\#\# Cardinalidad**

\* Una \`Persona\` pertenece a una \`Cuenta\`.  
\* Una \`Persona\` puede participar en uno o más \`Hogar\`.  
\* Una \`Persona\` puede tener múltiples \`Membership\`, una por contexto de hogar.  
\* Cada \`Membership\` vincula una persona con un hogar y un rol.

No se definen cardinalidades máximas para hogares, miembros o invitaciones.

**\#\#\# Estados posibles**

**\#\#\#\# Membership**

Estados encontrados:

\* \`Pendiente\`  
\* \`Activa\`  
\* \`Suspendida\`  
\* \`Finalizada\`

**\#\#\#\# Invitation**

No se encontraron estados técnicos.

**\#\#\#\# Session / Token / RefreshToken**

No se encontraron estados.

**\#\#\#\# Onboarding**

No se encontraron estados.

**\#\#\# Reglas de negocio**

**\#\#\#\# Identidad y hogar**

\* La coordinación se define por contexto de hogar.  
\* Una persona puede tener roles distintos en hogares distintos.  
\* Los roles no se heredan entre hogares.  
\* Los datos no se cruzan entre hogares.

**\#\#\#\# Invitaciones**

\* El flujo conceptual de invitación incluye aceptación, aprobación e ingreso al hogar.  
\* Adulto puede invitar personas.  
\* Coordinador aprueba ingresos.

**\#\#\#\# Roles**

\* Coordinador es responsable administrativo principal.  
\* Adulto es miembro operativo con permisos amplios.  
\* Adolescente tiene autonomía progresiva.  
\* Niño tiene experiencia simplificada.  
\* Adulto Mayor tiene experiencia adaptada.  
\* Invitado tiene participación limitada y acceso mínimo.

**\#\#\#\# Onboarding**

\* En onboarding o configuración periódica, cada miembro responde sobre disponibilidad, limitaciones y carga externa.  
\* La disponibilidad declarada sirve como información de contexto para distribución de carga, pero el documento no define implementación Auth ni endpoints.

**\#\#\# Permisos**

| Rol MVP | Permisos encontrados |  
| \------- | \-------------------- |  
| Coordinator | Aprueba ingresos, cambia roles, expulsa miembros, transfiere coordinación; administra personas, permisos y configuración en el hogar. |  
| Adult | Invita personas, crea/reasigna tareas y administra operaciones. |  
| Adolescent | Tiene autonomía progresiva; crea eventos familiares y administra tareas propias. |  
| Child | Tiene experiencia simplificada; no administra información familiar crítica. |  
| Senior | Tiene experiencia adaptada. |  
| Guest | Participación limitada; acceso mínimo. |

Permisos transversales encontrados:

\* Las relaciones familiares no modifican permisos automáticamente.  
\* Los permisos dependen del rol dentro de la membresía del hogar.  
\* Ningún rol obtiene acceso automático a datos privados personales.

**\#\#\# Flujos**

**\#\#\#\# Register**

No encontrado.

**\#\#\#\# Login**

No encontrado.

**\#\#\#\# Refresh Token**

No encontrado.

**\#\#\#\# Logout**

No encontrado.

**\#\#\#\# Crear hogar durante registro**

No encontrado.

**\#\#\#\# Invitar miembros durante onboarding**

Parcialmente encontrado.

Flujo conceptual disponible:

1\. Invitación.  
2\. Aceptación.  
3\. Aprobación.  
4\. Ingreso al hogar.

Información adicional:

\* Adulto puede invitar personas.  
\* Coordinador aprueba ingresos.

No se define si este flujo ocurre durante onboarding, después del registro o desde gestión de miembros.

**\#\#\#\# Onboarding por rol**

Parcialmente encontrado.

El documento describe roles y algunas experiencias/permisos por rol, pero no define un flujo de onboarding específico para cada rol MVP.

Información encontrada por rol:

\* Coordinator: rol administrativo principal.  
\* Adult: rol operativo amplio.  
\* Adolescent: autonomía progresiva.  
\* Child: experiencia simplificada.  
\* Senior: experiencia adaptada.  
\* Guest: acceso mínimo.

**\#\#\# APIs**

No se encontraron endpoints ni contratos API.

No se encontraron:

\* método HTTP  
\* ruta  
\* request  
\* response  
\* errores  
\* payload de register  
\* payload de login  
\* payload de refresh token  
\* payload de logout  
\* payload de creación de hogar  
\* payload de invitación  
\* payload de aceptación de invitación

**\#\#\# Request**

No encontrado.

**\#\#\# Response**

No encontrado.

**\#\#\# UI**

No se encontraron pantallas ni componentes específicos para:

\* Login  
\* Register  
\* Refresh Token  
\* Logout  
\* Crear hogar durante registro  
\* Invitar miembros durante onboarding  
\* Aceptar invitación  
\* Onboarding por rol

Se encontró solamente información conceptual sobre:

\* roles por hogar  
\* experiencia simplificada/adaptada para algunos roles  
\* preguntas de disponibilidad durante onboarding/configuración periódica

**\#\#\# Componentes UI**

No se encontraron componentes UI concretos para Auth \+ Onboarding.

**\#\#\# Navegación**

No se encontró navegación específica de Auth \+ Onboarding.

**\#\#\# Eventos del sistema**

No se encontraron nombres técnicos de eventos.

Eventos conceptuales sin nombre técnico:

\* invitación creada  
\* invitación aceptada  
\* ingreso aprobado  
\* miembro ingresado al hogar  
\* cambio de rol  
\* expulsión de miembro

**\#\#\# Dependencias**

Auth \+ Onboarding depende conceptualmente de:

\* Cuenta  
\* Persona  
\* Hogar  
\* Membership  
\* Role  
\* Invitación  
\* Permisos por rol

**\#\#\# Restricciones arquitectónicas**

\* Separación de datos por hogar.  
\* Roles independientes por hogar.  
\* Contexto operativo definido por la membresía activa.  
\* Privacidad individual en datos personales.  
\* Los cambios importantes de membresía/rol aparecen vinculados a auditoría, pero no se define implementación.

**\#\#\# Casos de uso**

Casos de uso encontrados o parcialmente encontrados:

\* Persona vinculada a cuenta.  
\* Persona ingresa a hogar mediante invitación, aceptación, aprobación e ingreso.  
\* Coordinador aprueba ingresos.  
\* Adulto invita personas.  
\* Coordinador cambia roles.  
\* Coordinador expulsa miembros.  
\* Miembro responde preguntas de disponibilidad/capacidad durante onboarding o configuración periódica.

**\#\#\# Casos especiales**

\* Una misma persona puede tener distintos roles en distintos hogares.  
\* Las relaciones familiares no cambian permisos automáticamente.  
\* La aprobación aparece como paso intermedio entre aceptación e ingreso al hogar.

**\#\#\# Edge cases**

\* Falta definir qué ocurre si una invitación es aceptada pero no aprobada.  
\* Falta definir qué ocurre si la membresía queda \`Pendiente\`, \`Suspendida\` o \`Finalizada\`.  
\* Falta definir cómo se selecciona el hogar activo después de login.  
\* Falta definir si register crea siempre una persona.  
\* Falta definir si register crea siempre un hogar o puede unirse por invitación.

**\#\#\# Datos mockeados**

No se encontró información mockeada para Auth \+ Onboarding.

**\#\#\# Funcionalidades REAL**

Información real extraíble para MVP desde este documento:

\* Cuenta como identidad de usuario, sin campos de auth definidos.  
\* Persona asociada a cuenta.  
\* Hogar como contexto operativo.  
\* Membership como relación persona-hogar.  
\* Rol asociado a membership.  
\* Roles MVP encontrados en español y mapeables a inglés.  
\* Invitación como flujo conceptual hacia ingreso al hogar.  
\* Adulto puede invitar personas.  
\* Coordinador aprueba ingresos.  
\* Separación de datos por hogar.  
\* Roles independientes por hogar.  
\* Preguntas de onboarding sobre disponibilidad/capacidad/carga externa, sin contrato técnico.

**\#\#\# Funcionalidades MOCK**

No se encontró información mockeada para este módulo.

**\#\#\# Funcionalidades POST\_MVP**

\* Uso avanzado de disponibilidad, carga temporal y capacidad para ajustar carga operativa automáticamente.  
\* Gestión avanzada de cambio de rol, expulsión y transferencia de coordinación, si excede la gestión básica de miembros del MVP.  
\* Soporte completo de múltiples hogares con selector/contexto avanzado, si excede la separación mínima por hogar requerida por MVP.

**\---**

**\#\# 2\. Clasificación para implementación**

**\#\#\# REAL**

**\#\#\#\# Identidad base**

\* Implementar el concepto de \`Cuenta\` como identidad del usuario.  
\* Implementar el concepto de \`Persona\` asociada a cuenta.  
\* No se pueden derivar campos técnicos desde este documento.

**\#\#\#\# Hogar y membresía**

\* Implementar \`Hogar\` como unidad organizativa principal.  
\* Implementar \`Membership\` como relación entre persona y hogar.  
\* La membresía debe contener rol dentro del hogar.  
\* Los datos deben separarse por hogar.  
\* Los roles son independientes por hogar.

**\#\#\#\# Roles MVP**

Usar los siguientes mapeos:

| Documento | MVP |  
| \--------- | \--- |  
| Coordinador | Coordinator |  
| Adulto | Adult |  
| Adolescente | Adolescent |  
| Niño | Child |  
| AdultoMayor / Adulto Mayor | Senior |  
| Invitado | Guest |

**\#\#\#\# Invitaciones**

\* Existe flujo conceptual de invitación.  
\* Secuencia encontrada: \`Invitación → Aceptación → Aprobación → Ingreso al hogar\`.  
\* Adulto puede invitar personas.  
\* Coordinador aprueba ingresos.

**\#\#\#\# Onboarding**

\* El documento menciona onboarding/configuración periódica con preguntas de disponibilidad y capacidad.  
\* No define flujo técnico de onboarding por rol.

**\#\#\# MOCK**

No se encontró información para simular Auth \+ Onboarding con mock.

**\#\#\# POST\_MVP**

\* Ajustes avanzados de carga a partir de disponibilidad/capacidad/carga externa.  
\* Automatización de distribución contextual de tareas.  
\* Gestión avanzada de múltiples hogares más allá de la separación mínima de datos por hogar.  
\* Gestión avanzada de miembros como expulsión, transferencia de coordinación o workflows completos de cambio de rol, si no forman parte de la gestión básica MVP.

**\#\#\# IGNORAR**

No aplica.

**\---**

**\#\# 3\. Información faltante**

**\#\#\# Auth**

\* No se encontró Register.  
\* No se encontró Login.  
\* No se encontró Refresh Token.  
\* No se encontró Logout.  
\* No se encontró Session.  
\* No se encontró RefreshToken.  
\* No se encontraron endpoints.  
\* No se encontraron request/response.  
\* No se encontraron errores.  
\* No se encontraron campos de credenciales.  
\* No se encontró política de expiración de tokens.  
\* No se encontró rotación de refresh token.  
\* No se encontró invalidación de sesión.

**\#\#\# Register \+ creación de hogar**

\* No se define si el registro crea una cuenta, una persona, un hogar o una membresía.  
\* No se define creación de hogar durante registro.  
\* No se define si el primer usuario del hogar se convierte automáticamente en Coordinator.  
\* No se define si register puede aceptar una invitación existente.

**\#\#\# Invitations**

\* No se definen campos de invitación.  
\* No se define token/código de invitación.  
\* No se define expiración.  
\* No se definen estados.  
\* No se define si la aceptación crea membership inmediatamente o si queda pendiente de aprobación.  
\* No se define quién puede aceptar una invitación.  
\* No se define qué errores existen para invitaciones inválidas, vencidas, usadas o rechazadas.

**\#\#\# Onboarding**

\* No se define onboarding por cada rol MVP.  
\* No se define estructura de pantallas.  
\* No se define orden de pasos.  
\* No se define si onboarding ocurre antes o después de crear hogar.  
\* No se define si onboarding ocurre antes o después de aceptar invitación.  
\* No se define dónde se guardan las respuestas de disponibilidad/capacidad.  
\* No se define si las preguntas de disponibilidad son obligatorias.

**\#\#\# Roles y permisos**

\* Faltan permisos para todas las acciones MVP de Auth \+ Household.  
\* Faltan permisos específicos para aceptar invitación.  
\* Faltan permisos específicos para crear hogar.  
\* Faltan permisos específicos para editar configuración básica del hogar.  
\* Faltan restricciones completas para Guest, Child, Senior y Adolescent.  
\* El documento menciona aprobación de ingresos por Coordinator, pero el MVP también pide aceptar invitación; la relación entre aceptación y aprobación queda ambigua.

**\#\#\# Entidades y nombres**

\* \`Cuenta\`, \`Account\`, \`User\` y \`Persona\` no están normalizados.  
\* No se define si \`Cuenta\` y \`User\` son equivalentes.  
\* No se define si \`Persona\` existe siempre por cuenta o puede haber múltiples personas por cuenta.  
\* No se definen ids, timestamps ni claves foráneas.

**\#\#\# Contradicciones o riesgos**

\* El flujo encontrado de invitación incluye aprobación antes del ingreso, pero el MVP solicitado solo explicita aceptar invitación. Debe validarse si aprobación es obligatoria en MVP o si queda como paso posterior.  
\* El documento presenta roles por hogar y pertenencia a múltiples hogares; para MVP debe extraerse solo la separación mínima por hogar y no convertir esto en multi-hogar avanzado.  
\* Las preguntas de disponibilidad pertenecen a onboarding/configuración, pero su uso real para distribución de carga puede expandir Planner; no debe implementarse como automatización avanzada desde este fragment.

**\---**

**\#\# 4\. Fuente**

\* Archivo: \`HomePlus — SECCION 3 FILOSOFIA.md\`  
  \* Sección: \`POLARIDADES RESUELTAS\`  
  \* Apartado: \`1. AUTONOMÍA INDIVIDUAL vs COHESIÓN GRUPAL\`  
  \* Apartado: \`5. OPTIMIZACIÓN DE TAREAS vs RESPETO AL CONTEXTO HUMANO\`  
  \* Apartado: \`6. ADOPCIÓN GRADUAL vs COMPROMISO TOTAL\`  
  \* Apartado: \`EJEMPLOS FILOSÓFICOS: CÓMO HomePlus DISUELVE LA JERARQUÍA FAMILIAR TRADICIONAL\`  
  \* Subapartado: \`A. Multi-hogar real: la identidad no es una, es contextual\`

\* Archivo: \`Seccion 3 Filosofia.txt\`  
  \* Sección: \`OUTPUT 1 — ENTITIES\`  
  \* Sección: \`OUTPUT 2 — RELATIONSHIPS\`  
  \* Sección: \`OUTPUT 4 — DATA FLOWS\`  
  \* Sección: \`OUTPUT 5 — BUSINESS RULES\`  
  \* Sección: \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`  
  \* Sección: \`OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS\`

\* Archivo: \`source\_map\_HomePlus\_SECCION\_3\_FILOSOFIA.md\`  
  \* Sección: \`4.1 AUTH\`  
  \* Sección: \`4.2 ONBOARDING\`  
  \* Sección: \`4.3 HOUSEHOLD\`  
  \* Sección: \`4.4 MEMBERSHIP\`  
  \* Sección: \`4.5 INVITATIONS\`  
  \* Sección: \`4.6 ROLES & PERMISSIONS\`  
  \* Sección: \`17. Contradicciones detectadas\`  
  \* Sección: \`18. Información faltante\`

**\# AUTH fragment — HomePlus — Sección 4: Emotional Design**

**\#\# 1\. Información encontrada**

**\#\#\# Objetivo del módulo**

\* El documento no define un objetivo funcional de AUTH.  
\* El documento aporta reglas transversales útiles para AUTH \+ ONBOARDING:  
  \* la cuenta pertenece a la persona, no al hogar;  
  \* la persona puede participar en hogares mediante membresías;  
  \* los roles operan por hogar;  
  \* la privacidad individual tiene prioridad;  
  \* la experiencia de incorporación debe evitar fricción emocional, especialmente para Invitado y Adulto Mayor.

**\#\#\# Entidades**

\* \`Account\`:  
  \* Cuenta de usuario.  
  \* Pertenece a la persona, no al hogar.  
  \* Incluye perfil, preferencias, idioma y configuración personal.  
\* \`Person\`:  
  \* Entidad transversal.  
  \* Pertenece a una cuenta.  
  \* Participa en uno o más hogares.  
\* \`Household\`:  
  \* Unidad organizativa principal.  
  \* Todo ocurre dentro de un hogar.  
\* \`Membership\`:  
  \* Relación entre persona y hogar.  
  \* Permite asociar una persona a un hogar.  
  \* Tiene un rol dentro del hogar.  
\* \`Invitation\`:  
  \* Flujo de invitación detectado como \`Invitación → Aceptación → Aprobación → Ingreso\`.  
  \* People gestiona invitaciones.  
\* \`Role\`:  
  \* Roles detectados en el archivo asociado y mapeables al alcance MVP:  
    \* Coordinador → \`Coordinator\`  
    \* Adulto → \`Adult\`  
    \* Adolescente → \`Adolescent\`  
    \* Niño → \`Child\`  
    \* Adulto Mayor / \`SeniorAdult\` → \`Senior\`  
    \* Invitado → \`Guest\`

**\#\#\# Campos**

\* No se definen campos técnicos de AUTH.  
\* \`Account\` menciona atributos conceptuales:  
  \* perfil;  
  \* preferencias;  
  \* idioma;  
  \* configuración personal.  
\* Para la invitación del Invitado se mencionan elementos conceptuales de contenido:  
  \* por qué se lo invita;  
  \* qué podrá ver;  
  \* qué podrá hacer;  
  \* por cuánto tiempo, si aplica.  
\* No se definen campos para:  
  \* email;  
  \* password;  
  \* provider;  
  \* access token;  
  \* refresh token;  
  \* expiración;  
  \* dispositivo;  
  \* código de invitación;  
  \* token de invitación.

**\#\#\# Tipos**

\* No se definen tipos técnicos.  
\* No se definen tipos para campos de cuenta, credenciales, sesión, token o invitación.

**\#\#\# Valores por defecto**

\* No se definen valores por defecto para AUTH.  
\* Para \`Senior\`, el documento indica una experiencia simplificada por defecto.  
\* Para \`Guest\`, el documento indica experiencia limitada por arquitectura y onboarding breve.

**\#\#\# Restricciones**

\* La cuenta pertenece a la persona, no al hogar.  
\* Los roles son independientes por hogar: una persona puede tener un rol en un hogar y otro rol en otro hogar.  
\* La composición del hogar no modifica la arquitectura de roles y permisos; solo afecta el tono emocional.  
\* La privacidad individual tiene prioridad sobre la conveniencia.  
\* La coordinación está por encima de la jerarquía: quienes coordinan administran el hogar, no la vida privada.  
\* Ningún rol obtiene acceso automático a información privada solo por tener ese rol.  
\* Para \`Guest\`, los límites deben ser claros desde el inicio.  
\* Para \`Guest\`, las funciones no disponibles no deberían mostrarse como opciones bloqueadas; lo visible debería ser lo que efectivamente puede hacer.  
\* Para \`Senior\`, el sistema no debe exigir aprender mecánicas complejas ni generar sensación de carga.  
\* Para \`Senior\`, las funciones sensibles o configurables no deben asumirse por defecto.

**\#\#\# Relaciones**

\* \`Person\` pertenece a \`Account\`.  
\* \`Person\` tiene \`Membership\`.  
\* \`Household\` posee \`Membership\`.  
\* \`Membership\` tiene rol.  
\* \`Membership\` puede tener los roles del alcance MVP:  
  \* \`Coordinator\`;  
  \* \`Adult\`;  
  \* \`Adolescent\`;  
  \* \`Child\`;  
  \* \`Senior\`;  
  \* \`Guest\`.  
\* \`People\` gestiona \`Invitation\`.  
\* Flujo conceptual detectado:  
  \* \`Coordinator\` → invitación → \`Person\`.  
  \* \`Person\` → aceptación → \`Membership\`.

**\#\#\# Cardinalidad**

\* \`Person\` puede participar en uno o más hogares.  
\* No se define cardinalidad técnica para:  
  \* una cuenta y múltiples personas;  
  \* múltiples cuentas por persona;  
  \* múltiples invitaciones por persona;  
  \* múltiples hogares por cuenta.

**\#\#\# Estados posibles**

\* \`Membership\` tiene estados detectados:  
  \* \`Pendiente\`;  
  \* \`Activa\`;  
  \* \`Suspendida\`;  
  \* \`Finalizada\`.  
\* No se definen estados para:  
  \* \`Account\`;  
  \* sesión;  
  \* access token;  
  \* refresh token;  
  \* invitación.

**\#\#\# Reglas de negocio**

\* La privacidad individual tiene prioridad sobre la conveniencia.  
\* Los datos pertenecen a los usuarios; el sistema administra, no posee.  
\* Los roles son independientes por hogar.  
\* La incorporación de nuevos miembros debe tener bienvenida real.  
\* El \`Guest\` debe tener bienvenida sin presión.  
\* El \`Guest\` debe tener claridad de límites.  
\* El \`Guest\` debe tener participación sin ambigüedad.  
\* El onboarding del \`Guest\` debe ser breve y cálido, sin tutoriales innecesarios.  
\* El \`Guest\` debe saber qué puede y qué no puede hacer sin descubrirlo por ensayo y error.  
\* La experiencia del \`Senior\` debe priorizar simplicidad y pertenencia activa.  
\* La experiencia del \`Senior\` debe evitar carga, complejidad y sensación de monitoreo.

**\#\#\# Permisos**

\* No se define matriz completa de permisos AUTH.  
\* \`Coordinator\` aparece como origen conceptual de invitación a una \`Person\`.  
\* \`Coordinator\` puede aprobar ingresos según la descripción de rol del archivo asociado.  
\* \`Adult\` aparece como rol con permiso de invitar según la descripción de rol del archivo asociado.  
\* \`Guest\` tiene acceso mínimo y participación limitada.  
\* No se detallan permisos de AUTH para:  
  \* register;  
  \* login;  
  \* refresh token;  
  \* logout;  
  \* crear hogar durante registro;  
  \* aceptar invitación;  
  \* cambiar contraseña;  
  \* revocar sesión.

**\#\#\# Flujos**

\* \`Register\`: no encontrado.  
\* \`Login\`: no encontrado.  
\* \`Refresh Token\`: no encontrado.  
\* \`Logout\`: no encontrado.  
\* Crear hogar durante registro: no encontrado.  
\* Invitar miembros durante onboarding:  
  \* se detecta flujo conceptual \`Coordinator\` → invitación → \`Person\`;  
  \* no se definen pasos técnicos;  
  \* no se define si ocurre durante registro, onboarding o gestión posterior.  
\* Aceptar invitación:  
  \* se detecta \`Person\` → aceptación → \`Membership\`;  
  \* el archivo asociado describe el flujo \`Invitación → Aceptación → Aprobación → Ingreso\`;  
  \* no se definen campos, validaciones ni pantallas.  
\* Onboarding por rol:  
  \* \`Guest\`: onboarding breve, cálido, con límites claros.  
  \* \`Senior\`: experiencia simplificada, orientada a contribuir sin carga.  
  \* Para \`Coordinator\`, \`Adult\`, \`Adolescent\` y \`Child\` no se define flujo técnico de onboarding.  
\* Incorporación de miembro nuevo:  
  \* el documento describe bienvenida real e integración gradual;  
  \* no se define como flujo técnico MVP.

**\#\#\# APIs**

\* No se encontraron endpoints.  
\* No se encontraron métodos HTTP.  
\* No se encontraron rutas.  
\* No se encontraron contratos de API.

**\#\#\# Request**

\* No se encontraron estructuras de request.

**\#\#\# Response**

\* No se encontraron estructuras de response.

**\#\#\# UI**

\* No se describen pantallas de Login.  
\* No se describen pantallas de Register.  
\* No se describen formularios de credenciales.  
\* No se describen pantallas de refresh token o logout.  
\* Para \`Guest\` se describe experiencia de onboarding:  
  \* breve;  
  \* cálida;  
  \* sin tutoriales innecesarios;  
  \* con límites claros;  
  \* sin mostrar funciones no disponibles como opciones bloqueadas.  
\* Para \`Senior\` se describe interfaz simplificada por defecto.  
\* Para nuevo miembro se menciona bienvenida real e integración gradual, sin estructura de pantalla.

**\#\#\# Componentes UI**

\* No se definen componentes UI concretos para AUTH.  
\* No se definen inputs, botones ni estados visuales para Login/Register.

**\#\#\# Navegación**

\* No se define navegación AUTH.  
\* No se define redirección post-login.  
\* No se define redirección post-register.  
\* No se define navegación de aceptación de invitación.

**\#\#\# Eventos del sistema**

\* No se definen nombres técnicos de eventos.  
\* Eventos conceptuales detectados:  
  \* invitación creada/enviada;  
  \* invitación aceptada;  
  \* ingreso de persona al hogar mediante membresía;  
  \* incorporación de nuevo miembro.  
\* No se encontraron eventos técnicos para:  
  \* \`auth.registered\`;  
  \* \`auth.logged\_in\`;  
  \* \`auth.logged\_out\`;  
  \* \`auth.token\_refreshed\`.

**\#\#\# Dependencias**

\* \`Account\`.  
\* \`Person\`.  
\* \`Household\`.  
\* \`Membership\`.  
\* \`Invitation\`.  
\* \`Role\`.  
\* Privacidad individual.  
\* Reglas de roles por hogar.

**\#\#\# Restricciones arquitectónicas**

\* \`Account\` pertenece a \`Person\`, no a \`Household\`.  
\* \`Person\` participa en hogares mediante \`Membership\`.  
\* \`Membership\` concentra la relación persona/hogar/rol.  
\* Los roles son por hogar, no globales.  
\* La composición del hogar no altera la arquitectura de roles y permisos.  
\* La experiencia puede cambiar por rol, pero el documento no define cambios técnicos de permisos para todos los roles MVP.

**\#\#\# Casos de uso**

\* Invitado recibe una invitación con contexto claro.  
\* Invitado entra a una experiencia breve y cálida.  
\* Invitado entiende límites desde el inicio.  
\* Adulto Mayor usa una experiencia simplificada.  
\* Nuevo miembro se incorpora a un hogar con historia y necesita contexto e integración gradual.

**\#\#\# Casos especiales**

\* \`Guest\` puede sentir exclusión si el acceso mínimo se presenta como experiencia hostil.  
\* \`Guest\` puede sentir ambigüedad si no sabe qué puede y qué no puede hacer.  
\* \`Senior\` puede abandonar si la experiencia se siente como trabajo, complejidad o monitoreo.  
\* Nuevo miembro puede necesitar contexto para entender el hogar al que ingresa.

**\#\#\# Edge cases**

\* Incorporación de miembro nuevo:  
  \* situación: nuevo miembro se suma a un hogar con historia, dinámicas y rachas establecidas;  
  \* postura: bienvenida real e integración gradual;  
  \* necesidad: contexto, primera acción de bajo riesgo y reconocimiento de incorporación.  
\* Invitado:  
  \* riesgo: experiencia hostil por acceso mínimo;  
  \* postura: límites claros y tono cálido.  
\* Adulto Mayor:  
  \* riesgo: carga, complejidad o sensación de monitoreo;  
  \* postura: simplicidad y pertenencia activa.

**\#\#\# Datos mockeados**

\* No se detectan datos mockeados para AUTH \+ ONBOARDING.

**\#\#\# Funcionalidades REAL**

\* Separación conceptual \`Account\` / \`Person\` / \`Household\` / \`Membership\`.  
\* Relación \`Person\` → \`Membership\` → \`Household\`.  
\* Rol asociado a \`Membership\`.  
\* Roles MVP reconocibles:  
  \* \`Coordinator\`;  
  \* \`Adult\`;  
  \* \`Adolescent\`;  
  \* \`Child\`;  
  \* \`Senior\`;  
  \* \`Guest\`.  
\* Invitación conceptual a nuevo miembro.  
\* Aceptación conceptual que confirma ingreso mediante \`Membership\`.  
\* Onboarding del \`Guest\` con límites claros y experiencia breve.  
\* Experiencia simplificada para \`Senior\`.  
\* Privacidad individual como restricción transversal.

**\#\#\# Funcionalidades MOCK**

\* No se encontró información mockeable para AUTH \+ ONBOARDING.

**\#\#\# Funcionalidades POST\_MVP**

\* Bienvenida ceremonial de nuevo miembro.  
\* Integración gradual de nuevo miembro con mecanismos no definidos como flujo técnico MVP.  
\* Configuración avanzada de experiencia por rol.  
\* Funciones configurables para \`Senior\` no asumidas por defecto.

**\#\# 2\. Clasificación para implementación**

**\#\#\# REAL**

\* Usar \`Account\` como cuenta perteneciente a \`Person\`, no a \`Household\`.  
\* Usar \`Person\` como entidad que participa en hogares mediante \`Membership\`.  
\* Usar \`Membership\` como relación entre \`Person\`, \`Household\` y \`Role\`.  
\* Considerar que los roles son independientes por hogar.  
\* Considerar los roles MVP detectados:  
  \* \`Coordinator\`;  
  \* \`Adult\`;  
  \* \`Adolescent\`;  
  \* \`Child\`;  
  \* \`Senior\`;  
  \* \`Guest\`.  
\* Considerar invitación y aceptación como flujo conceptual ligado a ingreso al hogar mediante \`Membership\`.  
\* Para onboarding de \`Guest\`, aplicar límites claros y experiencia breve/cálida.  
\* Para onboarding de \`Senior\`, aplicar experiencia simplificada y evitar carga.  
\* Mantener privacidad individual como restricción transversal.

**\#\#\# MOCK**

\* No se encontró información para simular en AUTH \+ ONBOARDING.

**\#\#\# POST\_MVP**

\* Bienvenida ceremonial para nuevo miembro.  
\* Integración gradual avanzada de nuevo miembro.  
\* Configuración avanzada de experiencia por rol.  
\* Personalización avanzada de funciones para \`Senior\`.

**\#\#\# IGNORAR**

\* No se incluye información.

**\#\# 3\. Información faltante**

\* No se define \`Register\`.  
\* No se define \`Login\`.  
\* No se define \`Refresh Token\`.  
\* No se define \`Logout\`.  
\* No se define creación de hogar durante registro.  
\* No se define flujo técnico completo de invitación durante onboarding.  
\* No se define flujo técnico completo de aceptación de invitación.  
\* No se define onboarding técnico para \`Coordinator\`, \`Adult\`, \`Adolescent\` o \`Child\`.  
\* No se definen campos obligatorios de \`Account\`.  
\* No se definen credenciales.  
\* No se definen tokens.  
\* No se definen refresh tokens.  
\* No se definen sesiones.  
\* No se definen expiraciones.  
\* No se definen validaciones.  
\* No se definen errores.  
\* No se definen endpoints.  
\* No se definen request/response.  
\* No se define pantalla de Login.  
\* No se define pantalla de Register.  
\* No se define pantalla de creación de hogar durante registro.  
\* No se define pantalla de invitación de miembros durante onboarding.  
\* No se define pantalla de aceptación de invitación.  
\* No se define matriz completa de permisos por rol para acciones AUTH.  
\* \`Membership\` tiene estados en español en el archivo asociado, pero el documento no define equivalentes técnicos ni transiciones.  
\* \`Invitation\` aparece como flujo, pero no se definen estados, tokens, expiración ni single-use.  
\* El archivo asociado describe un paso de aprobación entre aceptación e ingreso; no se aclara si ese paso pertenece al MVP o a una variante posterior.  
\* El archivo asociado declara siete roles oficiales, mientras que el alcance de este fragment solo acepta seis roles MVP; para este fragment se retienen únicamente los roles del alcance MVP.  
\* La información del documento es principalmente emocional/arquitectónica, no contractual.

**\#\# 4\. Fuente**

\* Archivo: \`HomePlus — SECCION 4 EMOTIONAL DESING.md\`  
  \* Sección: \`Pertenencia\`  
  \* Sección: \`Pertenencia activa — Adulto Mayor\`  
  \* Sección: \`Carga — para el Adulto Mayor\`  
  \* Sección: \`Exclusión — para el Invitado\`  
  \* Sección: \`Principios emocionales según composición del hogar\`  
  \* Sección: \`Emociones del Invitado\`  
  \* Sección: \`Situaciones de edge case — D — Incorporación de miembro nuevo\`  
\* Archivo: \`Seccion 4 Emotional Design.txt\`  
  \* Sección: \`OUTPUT 1 — ENTITIES\`  
  \* Sección: \`OUTPUT 2 — RELATIONSHIPS\`  
  \* Sección: \`OUTPUT 4 — DATA FLOWS\`  
  \* Sección: \`OUTPUT 5 — BUSINESS RULES\`  
  \* Sección: \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`  
\* Archivo: \`source\_map\_HomePlus\_SECCION\_4\_EMOTIONAL\_DESING.md\`  
  \* Sección: \`4.1 AUTH\`  
  \* Sección: \`4.2 ONBOARDING\`  
  \* Sección: \`9. Mapa de flujos\`  
  \* Sección: \`10. Mapa de APIs\`  
  \* Sección: \`19. Recomendación de fragments a generar\`

**\# AUTH fragment — HomePlus — SECCION 5 RELATIONSHIP PHILOSOPHY**

**\#\# 1\. Información encontrada**

**\#\#\# Objetivo del módulo**

No se encontró un objetivo específico de AUTH en este documento.

La información útil para este fragmento es contextual y transversal: el documento establece que el ecosistema comparte Personas, Roles y Permisos, y que las conexiones entre entidades deben respetar privacidad, rol y ámbito dentro del hogar.

**\#\#\# Entidades**

**\#\#\#\# Cuenta**

\* Entidad asociada al usuario.  
\* Pertenece al usuario, no al hogar.  
\* El documento de comprensión la describe como parte del dominio People.  
\* No se encontraron campos técnicos de autenticación asociados a Cuenta.

**\#\#\#\# Persona**

\* Representa a un miembro del ecosistema.  
\* Pertenece a una Cuenta.  
\* Puede participar en múltiples hogares mediante Membership.  
\* Puede relacionarse con dominios operativos como responsable, participante o sujeto de una entidad, siempre bajo reglas de visibilidad por rol y ámbito.

**\#\#\#\# Membership**

\* Relación entre Persona y Hogar.  
\* Tiene un Rol asociado.  
\* Cada Membership posee un único rol activo.  
\* El archivo de comprensión lista estados de Membership: Pendiente, Activa, Suspendida, Finalizada.

**\#\#\#\# Hogar**

\* Unidad organizativa independiente.  
\* Un usuario puede pertenecer a múltiples hogares.  
\* Cada hogar tiene sus propios roles, módulos y datos.  
\* No existen relaciones entre hogares.  
\* La operación debe ocurrir dentro de un contexto de hogar activo.

**\#\#\#\# Rol**

Roles encontrados en español y mapeables al set solicitado para MVP:

| Rol en documento | Rol MVP equivalente |  
| \--- | \--- |  
| Coordinador | Coordinator |  
| Adulto | Adult |  
| Adolescente | Adolescent |  
| Niño | Child |  
| AdultoMayor / Adulto Mayor | Senior |  
| Invitado | Guest |

Rol adicional encontrado:

| Rol en documento | Clasificación |  
| \--- | \--- |  
| EmpleadoFamiliar / Empleado Familiar | POST\_MVP |

**\#\#\#\# Invitacion**

\* Aparece en el archivo de comprensión como workflow conceptual.  
\* No aparece como entidad de datos completa con campos técnicos.  
\* Flujo encontrado: Invitación → Aceptación → Aprobación, si corresponde → Ingreso al hogar.

**\#\#\# Campos**

**\#\#\#\# Cuenta**

Campos mencionados en el archivo de comprensión:

\* perfil  
\* preferencias  
\* idioma

No se encontraron tipos, obligatoriedad, defaults ni restricciones para esos campos.

**\#\#\#\# Persona**

No se encontraron campos concretos de Persona para implementación.

**\#\#\#\# Membership**

No se encontraron campos técnicos como \`person\_id\`, \`household\_id\`, \`role\_id\`, \`status\`, \`created\_at\` o equivalentes.

Sí se encontró la relación conceptual:

\* Persona → Membership  
\* Membership → Hogar  
\* Membership → Rol

**\#\#\#\# Invitacion**

No se encontraron campos como token, código, email, teléfono, rol invitado, expiración, invitado por, fecha de aceptación o estado.

**\#\#\#\# Auth / Session / Token**

No se encontraron campos para:

\* credenciales  
\* password  
\* password hash  
\* provider  
\* sesión  
\* access token  
\* refresh token  
\* expiración de token  
\* revocación de token  
\* dispositivo

**\#\#\# Tipos**

No se encontraron tipos técnicos para entidades de AUTH, Session, Token, RefreshToken, Register, Login ni Logout.

**\#\#\# Valores por defecto**

No se encontraron valores por defecto para AUTH u onboarding.

**\#\#\# Restricciones**

\* La autenticación o pertenencia al sistema no otorga visibilidad automática sobre información de otros miembros.  
\* La visibilidad depende del rol del usuario y del ámbito de la entidad consultada.  
\* Si una relación existe pero el usuario no tiene visibilidad sobre todos sus eslabones, esa relación no debe mostrarse.  
\* Cada hogar mantiene datos independientes.  
\* No existen relaciones entre hogares.  
\* Las relaciones familiares registradas, como Madre, Padre, Hijo, Hija, Abuelo, Abuela, Hermano, Hermana o Tutor, son informativas y no modifican permisos automáticamente.  
\* El rol activo pertenece a la Membership dentro de un hogar, no a la Cuenta global.

**\#\#\# Relaciones**

| Origen | Relación | Destino | Uso para este fragment |  
| \--- | \--- | \--- | \--- |  
| Persona | belongs\_to | Cuenta | Separar identidad/cuenta de membresía en hogar. |  
| Persona | has | Membership | Modelar pertenencia a hogares. |  
| Membership | belongs\_to | Hogar | Asociar ingreso del usuario/persona a un hogar. |  
| Membership | has | Rol | Determinar permisos por hogar. |  
| Persona | has | RelacionFamiliar | Relación informativa, sin impacto automático en permisos. |  
| Invitacion | conduce a | Membership / ingreso al hogar | Flujo conceptual de ingreso por invitación. |

**\#\#\# Cardinalidad**

\* Una Persona puede participar en múltiples hogares.  
\* Cada Membership posee un único rol activo.  
\* No se encontró cardinalidad técnica para Cuenta ↔ Persona.  
\* No se encontró cardinalidad técnica para Invitacion ↔ Persona/Hogar.

**\#\#\# Estados posibles**

**\#\#\#\# Membership**

Estados encontrados:

\* Pendiente  
\* Activa  
\* Suspendida  
\* Finalizada

No se encontró mapeo técnico a enums en inglés.

**\#\#\#\# Invitation**

No se encontraron estados de invitación.

**\#\#\#\# Session / Token**

No se encontraron estados de sesión ni token.

**\#\#\#\# Onboarding**

No se encontraron estados de onboarding.

**\#\#\# Reglas de negocio**

\* Los permisos dependen del rol dentro del hogar.  
\* La relación familiar entre personas no modifica permisos.  
\* Un usuario puede tener roles distintos en distintos hogares, porque el rol está asociado a la Membership.  
\* Un hogar no puede relacionar sus entidades con entidades de otro hogar.  
\* La operación debe respetar el contexto del hogar activo.  
\* Adulto aparece con capacidad para invitar personas.  
\* Coordinador aparece con capacidad para aprobar ingresos, cambiar roles y expulsar miembros.  
\* No se encontró si Coordinador también puede crear invitaciones.  
\* No se encontró si Guest, Child, Adolescent o Senior pueden invitar miembros.

**\#\#\# Permisos**

Permisos encontrados explícitamente o en el archivo de comprensión:

| Rol | Permisos encontrados relevantes para AUTH / onboarding |  
| \--- | \--- |  
| Coordinator / Coordinador | Aprueba ingresos, cambia roles, expulsa miembros. |  
| Adult / Adulto | Invita personas; crea y reasigna tareas según comprensión, pero lo relacionado con tareas no forma parte de este fragmento. |  
| Adolescent / Adolescente | Autonomía progresiva; puede recibir permisos adicionales configurables. No se detallan permisos de onboarding. |  
| Child / Niño | Acceso mínimo; no administra información familiar crítica. No se detallan permisos de onboarding. |  
| Senior / AdultoMayor | Experiencia adaptada. No se detallan permisos de onboarding. |  
| Guest / Invitado | Participación limitada; acceso mínimo. No se detallan permisos de onboarding. |

Permisos generales aplicables:

\* Los permisos se determinan por rol y ámbito.  
\* Ningún rol obtiene acceso automático a información privada de otros miembros.  
\* Las relaciones solo pueden mostrarse si el usuario tiene visibilidad sobre las entidades involucradas.

**\#\#\# Flujos**

**\#\#\#\# Register**

No se encontró flujo de Register.

**\#\#\#\# Login**

No se encontró flujo de Login.

**\#\#\#\# Refresh Token**

No se encontró flujo de Refresh Token.

**\#\#\#\# Logout**

No se encontró flujo de Logout.

**\#\#\#\# Crear hogar durante registro**

No se encontró flujo de creación de hogar durante registro.

Información relacionada encontrada:

\* Hogar es la unidad organizativa principal.  
\* Cada hogar es independiente.  
\* Membership vincula Persona con Hogar y Rol.

**\#\#\#\# Invitar miembros durante onboarding**

No se encontró flujo específico de invitación durante onboarding.

Información relacionada encontrada:

\* Invitacion aparece como workflow conceptual.  
\* Flujo conceptual: Invitación → Aceptación → Aprobación, si corresponde → Ingreso al hogar.  
\* Adulto puede invitar personas.  
\* Coordinador aprueba ingresos.

**\#\#\#\# Onboarding por rol**

No se encontró flujo de onboarding por rol.

Información relacionada encontrada:

\* El rol condiciona permisos y visibilidad.  
\* Cada Membership tiene un único rol activo.  
\* La experiencia puede variar por rol, pero no se encontraron pasos de onboarding, pantallas ni reglas de progresión.

**\#\#\# APIs**

No se encontraron endpoints ni contratos API para:

\* Register  
\* Login  
\* Refresh Token  
\* Logout  
\* Crear hogar durante registro  
\* Invitar miembros durante onboarding  
\* Aceptar invitación  
\* Completar onboarding  
\* Asignar rol durante onboarding

**\#\#\# Request**

No se encontraron requests.

**\#\#\# Response**

No se encontraron responses.

**\#\#\# UI**

No se encontraron pantallas, componentes ni estructura UI para:

\* Login  
\* Register  
\* Logout  
\* Session expired  
\* Crear hogar durante registro  
\* Invite Member  
\* Accept Invitation  
\* Onboarding por rol

**\#\#\# Componentes UI**

No se encontraron componentes UI específicos de AUTH u onboarding.

**\#\#\# Navegación**

Información transversal encontrada:

\* Las entidades relacionadas deben exponerse como enlaces navegables en sus vistas de detalle.  
\* Si una navegación genera un ciclo, el sistema debe reutilizar la instancia existente en el stack y no duplicarla.

No se encontró navegación específica de AUTH u onboarding.

**\#\#\# Eventos del sistema**

No se encontraron eventos técnicos con nombre para:

\* auth.registered  
\* auth.logged\_in  
\* auth.logged\_out  
\* auth.token\_refreshed  
\* household.created durante registro  
\* invitation.created  
\* invitation.accepted  
\* onboarding.completed

**\#\#\# Dependencias**

AUTH / onboarding, según esta fuente, depende conceptualmente de:

\* Cuenta  
\* Persona  
\* Hogar  
\* Membership  
\* Rol  
\* Permisos  
\* Invitacion, si el ingreso ocurre por invitación

**\#\#\# Restricciones arquitectónicas**

\* Separar Cuenta de Persona y Membership.  
\* Separar identidad global de permisos por hogar.  
\* No derivar permisos desde relaciones familiares.  
\* No cruzar datos entre hogares.  
\* Aplicar visibilidad por rol y ámbito.  
\* No mostrar relaciones cuando el usuario no tenga visibilidad completa sobre ellas.  
\* Mantener el contexto de hogar activo para operaciones posteriores al ingreso.

**\#\#\# Casos de uso**

Casos de uso encontrados solo de forma conceptual:

\* Usuario/persona pertenece a uno o más hogares.  
\* Persona ingresa a hogar mediante Membership.  
\* Invitación permite ingreso al hogar mediante aceptación y eventual aprobación.  
\* Rol activo dentro del hogar determina permisos y visibilidad.

**\#\#\# Casos especiales**

\* Una Persona puede tener diferentes roles en diferentes hogares.  
\* Una relación familiar no cambia permisos.  
\* Un rol adicional, Empleado Familiar, aparece fuera del set de roles MVP solicitado.  
\* Senior / AdultoMayor aparece en el archivo de comprensión, pero no aparece en la tabla principal de visibilidad por rol del documento principal.

**\#\#\# Edge cases**

\* Riesgo de confundir Cuenta con Persona.  
\* Riesgo de asignar permisos globales al usuario en lugar de permisos por Membership/Hogar.  
\* Riesgo de usar parentesco como permiso, aunque el documento lo prohíbe.  
\* Riesgo de mezclar datos entre hogares.  
\* Riesgo de asumir que Adulto puede aprobar ingresos; el documento de comprensión solo indica que Adulto invita y Coordinador aprueba.  
\* Riesgo de asumir tokens, expiración o seguridad de invitación; no están definidos en esta fuente.

**\#\#\# Datos mockeados**

No se encontraron datos mockeados para AUTH u onboarding.

**\#\#\# Funcionalidades REAL**

\* Separación Cuenta / Persona / Membership / Hogar / Rol como base conceptual.  
\* Membership como vínculo Persona-Hogar-Rol.  
\* Rol activo por Membership.  
\* Aislamiento de datos por hogar.  
\* Permisos por rol y ámbito.  
\* Relaciones familiares informativas sin efecto automático en permisos.  
\* Invitación como workflow conceptual de ingreso al hogar.  
\* Adulto invita personas.  
\* Coordinador aprueba ingresos, cambia roles y expulsa miembros.

**\#\#\# Funcionalidades MOCK**

No se encontró información MOCK para AUTH u onboarding.

**\#\#\# Funcionalidades POST\_MVP**

\* Empleado Familiar como rol fuera del set de roles MVP solicitado.  
\* Cualquier personalización avanzada de permisos para Adolescente queda fuera de esta extracción porque no tiene contrato ni regla implementable en esta fuente.

**\---**

**\#\# 2\. Clasificación para implementación**

**\#\#\# REAL**

\* Cuenta y Persona deben tratarse como conceptos separados.  
\* Persona se vincula al hogar mediante Membership.  
\* Membership pertenece a un Hogar y tiene un Rol.  
\* Cada Membership tiene un único rol activo.  
\* El rol se interpreta dentro del hogar, no globalmente en la Cuenta.  
\* El sistema debe respetar separación de datos por hogar.  
\* No existen relaciones entre hogares.  
\* Las relaciones familiares son informativas y no modifican permisos.  
\* Los permisos dependen de rol y ámbito.  
\* Invitación existe como flujo conceptual de ingreso: Invitación → Aceptación → Aprobación, si corresponde → Ingreso al hogar.  
\* Adulto puede invitar personas.  
\* Coordinador puede aprobar ingresos, cambiar roles y expulsar miembros.

**\#\#\# MOCK**

No se encontró información para simular AUTH u onboarding con texto fijo, datos dummy o comportamiento falso.

**\#\#\# POST\_MVP**

\* Empleado Familiar queda fuera del set de roles MVP solicitado.  
\* Permisos adicionales configurables para Adolescente están mencionados sin detalle suficiente y no deben convertirse en obligación de MVP desde esta fuente.

**\#\#\# IGNORAR**

No se incluye contenido de temas fuera de alcance para este fragmento.

**\---**

**\#\# 3\. Información faltante**

| Área | Información faltante | Impacto |  
| \--- | \--- | \--- |  
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

\* La tabla principal de visibilidad incluye Coordinador, Adulto, Adolescente, Niño, Invitado y Empleado Familiar, pero no incluye AdultoMayor/Senior.  
\* El set MVP solicitado incluye Senior, mientras que la fuente principal visible de permisos no detalla su visibilidad.  
\* El archivo de comprensión indica que Adulto invita personas y Coordinador aprueba ingresos, pero no define si Coordinador también puede crear invitaciones.  
\* Membership tiene estados en español, pero el prompt no define estados esperados para Membership y la fuente no da mapeo técnico.  
\* Invitacion aparece como workflow, no como entidad implementable completa.

**\---**

**\#\# 4\. Fuente**

\* Archivo principal: \`HomePlus — SECCION 5 RELATIONSHIP PHILOSOPHY(1).md\`  
\* Secciones del archivo principal:  
  \* Metadata / título: \`Filosofía de Relaciones del Ecosistema\`  
  \* \`\# 5\. Filosofía de Relaciones del Ecosistema\`  
  \* \`\#\# 5.1 El ecosistema como red de entidades\`  
  \* \`\#\#\# 5.2.1 Persona\`  
  \* \`\#\# 5.5 Límites de privacidad en las relaciones entre módulos\`  
  \* \`\#\#\# 5.5.1 Principio de privacidad individual\`  
  \* \`\#\#\# 5.5.2 Ámbitos de visibilidad\`  
  \* \`\#\#\# 5.5.4 Tabla de visibilidad por rol en relaciones cruzadas\`  
  \* \`\#\# 5.7 Relaciones familiares: informativas, no permisivas\`  
  \* \`\#\# 5.8 Multi-Hogar y aislamiento entre hogares\`  
  \* \`\#\# 5.9 Principios de diseño para nuevas relaciones\`  
\* Archivo de comprensión asociado: \`Seccion 5 filsofia de las relaciones(1).txt\`  
\* Secciones del archivo de comprensión:  
  \* \`OUTPUT 1 — ENTITIES\`  
  \* \`OUTPUT 2 — RELATIONSHIPS\`  
  \* \`OUTPUT 5 — BUSINESS RULES\`  
  \* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`  
  \* \`OUTPUT 7 — MISSING/IMPLIED\`  
  \* \`OUTPUT 8 — GRAPH EDGES\`  
\* Source map usado: \`source\_map\_HomePlus\_SECCION\_5\_RELATIONSHIP\_PHILOSOPHY.md\`  
\* Secciones del source map:  
  \* \`\# 4.1 AUTH\`  
  \* \`\# 4.2 ONBOARDING\`  
  \* \`\# 4.4 MEMBERSHIP\`  
  \* \`\# 4.5 INVITATIONS\`  
  \* \`\# 4.6 ROLES & PERMISSIONS\`

**\# AUTH \+ ONBOARDING fragment — HomePlus — SECCION 6 UX PHILOSOPHY**

**\#\# 1\. Información encontrada**

**\#\#\# Objetivo del módulo**

**\#\#\#\# AUTH**

No hay una sección dedicada a Auth. El documento no define Register, Login, Refresh Token, Logout, Session ni contratos de autenticación.

La información implementable relacionada con Auth aparece solo de forma indirecta a través de las entidades \`Account\`, \`Person\`, \`Membership\`, \`Role\` e \`Invitation\` del archivo de comprensión.

**\#\#\#\# ONBOARDING**

El onboarding debe lograr que el usuario experimente valor concreto dentro del primer minuto de uso.

Valor significa que el usuario:

\* vio algo que antes no sabía,  
\* completó una acción que antes requería coordinar,  
\* o entendió algo de su hogar que no había visto.

El onboarding no debe funcionar como tutorial largo. La app debe enseñar usándose.

**\---**

**\#\#\# Entidades**

**\#\#\#\# Account**

Entidad del dominio core.

Información encontrada:

\* Pertenece al usuario, no al hogar.  
\* Contiene perfil.  
\* Contiene preferencias.  
\* Contiene idioma.  
\* Contiene configuración personal.

**\#\#\#\# Person**

Entidad del dominio people/core.

Información encontrada:

\* Toda persona pertenece a una cuenta.  
\* Puede participar en uno o más hogares.  
\* Contiene nombre.  
\* Contiene apellido.  
\* Contiene foto.  
\* Contiene fecha de nacimiento.  
\* Contiene género.  
\* Contiene contacto.

**\#\#\#\# Household**

Entidad organizativa principal.

Información encontrada aplicable a este fragment:

\* El onboarding del Coordinador incluye el nombre del hogar.  
\* El archivo de comprensión define \`Household\` como unidad organizativa principal.  
\* Todo ocurre dentro de un hogar.

**\#\#\#\# Membership**

Entidad de relación entre una persona y un hogar.

Información encontrada:

\* Relaciona una \`Person\` con un \`Household\`.  
\* Posee un único rol activo.  
\* Estados encontrados en el archivo de comprensión:  
  \* Pendiente.  
  \* Activa.  
  \* Suspendida.  
  \* Finalizada.

**\#\#\#\# Role**

Entidad de rol dentro del hogar.

Roles encontrados en el documento o archivo de comprensión:

| Nombre en documento | Nombre para MVP |  
| \------------------- | \--------------- |  
| Coordinador | Coordinator |  
| Adulto | Adult |  
| Adolescente | Adolescent |  
| Niño | Child |  
| Adulto Mayor | Senior |  
| Invitado | Guest |

También aparece \`Empleado Familiar\` como rol oficial en el archivo de comprensión, pero no forma parte de los roles MVP de este fragment.

**\#\#\#\# Invitation**

Flujo de invitación a un hogar.

Información encontrada:

\* El onboarding del Coordinador incluye “Invitar miembros”.  
\* Invitar miembros puede postergarse.  
\* El archivo de comprensión describe el flujo conceptual:  
  \* Invitación.  
  \* Aceptación.  
  \* Aprobación, si corresponde.  
  \* Ingreso.  
\* El archivo de comprensión indica que \`Invitation\` crea \`Membership\`.

**\---**

**\#\#\# Campos**

**\#\#\#\# Account**

Campos encontrados:

\* perfil.  
\* preferencias.  
\* idioma.  
\* configuración personal.

Campos no encontrados:

\* email.  
\* password.  
\* provider.  
\* session id.  
\* refresh token.  
\* expiración de token.  
\* device.

**\#\#\#\# Person**

Campos encontrados:

\* nombre.  
\* apellido.  
\* foto.  
\* fecha de nacimiento.  
\* género.  
\* contacto.

**\#\#\#\# Membership**

Campos encontrados:

\* persona.  
\* hogar.  
\* rol activo.  
\* estado.

No se definen tipos técnicos para estos campos.

**\#\#\#\# Role**

Campo o valor encontrado:

\* rol dentro del hogar.

No se define un enum técnico en inglés. El documento usa nombres en español.

**\#\#\#\# Invitation**

Campos no encontrados:

\* token.  
\* código.  
\* expiración.  
\* email invitado.  
\* teléfono invitado.  
\* invited\_by.  
\* accepted\_at.  
\* household\_id.  
\* invited\_role.

**\#\#\#\# Onboarding por rol**

**\#\#\#\#\# Coordinator / Coordinador**

Campos o inputs encontrados:

\* nombre del hogar.  
\* invitación de miembros.  
\* preferencia horaria.  
\* tono.

**\#\#\#\#\# Adult / Adulto**

Campos o inputs encontrados:

\* nombre.  
\* rol.  
\* preferencia horaria.  
\* tono.

**\#\#\#\#\# Adolescent / Adolescente**

Campos o inputs encontrados:

\* avatar.  
\* color.

El detalle aparece solo en la tabla de adaptación UX por rol, no en el flujo detallado de onboarding por rol.

**\#\#\#\#\# Child / Niño**

Campos o inputs encontrados:

\* avatar.  
\* color.  
\* lista de ejemplo.  
\* primera tarea de ejemplo.

**\#\#\#\#\# Senior / Adulto Mayor**

Campos o inputs encontrados:

\* nombre.  
\* tratamiento.  
\* letra más grande.  
\* medicación.  
\* horario.  
\* contacto de emergencia.

Valor por defecto encontrado:

\* letra más grande: default sí.

**\#\#\#\#\# Guest / Invitado**

No se encuentra flujo de onboarding ni campos específicos para Guest.

**\---**

**\#\#\# Tipos**

No se encuentran tipos técnicos para campos de Auth, Account, Person, Membership, Role, Invitation ni preferencias de onboarding.

**\---**

**\#\#\# Valores por defecto**

Valores por defecto encontrados:

\* Senior / Adulto Mayor:  
  \* letra más grande: default sí.

No se encuentran otros defaults técnicos.

**\---**

**\#\#\# Restricciones**

Restricciones encontradas para onboarding:

\* El usuario debe ver valor concreto en el primer minuto de uso.  
\* Onboarding no debe tener scroll.  
\* Cada paso debe caber en una pantalla.  
\* No debe haber carrusel de features.  
\* No debe haber tooltips.  
\* No debe haber videos de onboarding.  
\* No debe pedirse permiso de notificación antes de mostrar valor.  
\* No debe forzarse a invitar miembros.  
\* No deben solicitarse datos innecesarios, como edad exacta o dirección.  
\* No deben mostrarse pantallas vacías después del onboarding.  
\* No debe hacerse un tour por la app.  
\* Si una pantalla se puede omitir, no era necesaria.  
\* La app debe enseñar usándose.  
\* El empty state de cada dominio explica qué va a aparecer ahí y sugiere la primera acción.

Restricciones encontradas para relación usuario/persona/hogar:

\* \`Account\` pertenece al usuario, no al hogar.  
\* \`Person\` pertenece a \`Account\`.  
\* \`Person\` puede participar en uno o más hogares.  
\* \`Membership\` relaciona una persona con un hogar.  
\* Cada membresía posee un único rol activo.

**\---**

**\#\#\# Relaciones**

| Entidad origen | Relación | Entidad destino | Clasificación |  
| \-------------- | \-------- | \--------------- | \------------- |  
| Account | owns | Person | explícita |  
| Person | belongs\_to | Account | explícita |  
| Person | has\_membership | Membership | explícita |  
| Membership | belongs\_to | Household | explícita |  
| Membership | has\_role | Role | explícita |  
| Household | contains | Membership | explícita |  
| Invitation | creates | Membership | explícita |  
| Invitation | approved\_by | Role | implícita / requiere validación |

**\---**

**\#\#\# Cardinalidad**

Información encontrada:

\* Toda \`Person\` pertenece a una \`Account\`.  
\* Una \`Person\` puede participar en uno o más \`Household\`.  
\* Una \`Membership\` pertenece a un \`Household\`.  
\* Una \`Membership\` posee un único rol activo.

No se encuentran cardinalidades técnicas adicionales.

**\---**

**\#\#\# Estados posibles**

**\#\#\#\# Membership**

Estados encontrados:

\* Pendiente.  
\* Activa.  
\* Suspendida.  
\* Finalizada.

No se encuentran reglas de transición entre estados.

**\#\#\#\# Invitation**

El documento de comprensión describe un flujo conceptual, no un enum técnico:

\* Invitación.  
\* Aceptación.  
\* Aprobación, si corresponde.  
\* Ingreso.

**\#\#\#\# Auth / Session / RefreshToken**

No se encuentran estados.

**\#\#\#\# Onboarding**

No se encuentra enum técnico de estado.

Estado conceptual encontrado:

\* el onboarding termina navegando a Home con primer valor visible.

**\---**

**\#\#\# Reglas de negocio**

**\#\#\#\# Primer valor por rol**

| Rol | Primer valor | Tiempo objetivo | Qué ve |  
| \--- | \------------ | \--------------- | \------ |  
| Coordinator / Coordinador | Ve el estado de su hogar en un solo lugar | 45–60s | Briefing con miembros, tareas pendientes del hogar, próximos eventos |  
| Adult / Adulto | Ve sus tareas y eventos del día | 30–45s | “Hoy tenés 2 tareas y 1 evento.” |  
| Adolescent / Adolescente | Ve su lista personal y puede completar algo | 20–30s | “Jose, estas son tus tareas para mañana.” |  
| Child / Niño | Ve su lista del día con íconos y completa su primera tarea | 15–20s | Avatar \+ “Luca, tu lista de hoy” \+ animación al completar |  
| Senior / Adulto Mayor | Ve su medicación del día y entiende que la app le avisa | 40–50s | Card de medicación \+ “¿Quiere que le avise a las 9?” |

No se encuentra primer valor específico para Guest / Invitado.

**\#\#\#\# Onboarding por rol**

\* El onboarding cambia según rol.  
\* La adaptación por rol no es solo filtrar contenido.  
\* Cambia la jerarquía de información, el lenguaje visual, la densidad cognitiva y el nivel de agencia.

**\#\#\#\# Invitaciones durante onboarding**

\* El Coordinador puede invitar miembros durante onboarding.  
\* La invitación de miembros puede postergarse.  
\* No se debe forzar a invitar miembros.

**\#\#\#\# Aprendizaje del producto**

\* La app se aprende usándose.  
\* Los empty states guían la primera acción.  
\* La primera tarea creada muestra un toast sutil: “Tu primera tarea. Cuando alguien la complete, te avisamos.”

**\---**

**\#\#\# Permisos**

Permisos encontrados de forma explícita o parcial:

\* Coordinator / Coordinador:  
  \* puede invitar miembros durante onboarding.  
  \* puede postergar la invitación de miembros.  
\* Child / Niño:  
  \* en la tabla de adaptación UX, no crea items; solo completa.

Permisos ausentes:

\* No se define matriz de permisos Auth.  
\* No se define quién puede registrar usuarios.  
\* No se define quién puede aceptar invitaciones.  
\* No se define quién puede aprobar invitaciones.  
\* No se definen permisos específicos para Guest / Invitado.  
\* No se define permiso para Refresh Token ni Logout.

**\---**

**\#\#\# Flujos**

**\#\#\#\# Register**

No encontrado como flujo técnico.

No se encuentran pasos de registro, credenciales, validaciones, creación de sesión ni response.

**\#\#\#\# Login**

No encontrado.

**\#\#\#\# Refresh Token**

No encontrado.

**\#\#\#\# Logout**

No encontrado.

**\#\#\#\# Crear hogar durante registro**

No se encuentra vinculado a Register técnico.

Sí aparece en onboarding de Coordinator como configuración inicial del hogar:

1\. Bienvenida \+ nombre del hogar.  
2\. Invitar miembros.  
3\. Preferencia horaria \+ tono.  
4\. Home con primer valor.

**\#\#\#\# Invitar miembros durante onboarding**

Flujo encontrado para Coordinator:

1\. Paso de invitar miembros.  
2\. El paso puede postergarse.  
3\. El onboarding continúa hacia preferencia horaria \+ tono.  
4\. Luego navega a Home.

No se encuentra contrato técnico para crear invitaciones.

**\#\#\#\# Aceptar invitación**

Solo aparece en el archivo de comprensión como parte del flujo conceptual:

1\. Invitación.  
2\. Aceptación.  
3\. Aprobación, si corresponde.  
4\. Ingreso.

No se encuentra UI, API ni estados técnicos de aceptación.

**\#\#\#\# Onboarding de Coordinator / Coordinador**

Flujo encontrado:

1\. Bienvenida \+ nombre del hogar.  
2\. Invitar miembros, puede postergar.  
3\. Preferencia horaria \+ tono.  
4\. Home con primer valor.

Duración objetivo:

\* \~60 segundos.

**\#\#\#\# Onboarding de Adult / Adulto**

Flujo encontrado:

1\. Bienvenida \+ nombre \+ rol.  
2\. Preferencia horaria \+ tono.  
3\. Home con primer valor.

Duración objetivo:

\* \~30 segundos.

**\#\#\#\# Onboarding de Adolescent / Adolescente**

Información encontrada:

\* La tabla de adaptación UX indica onboarding de 2 pasos: avatar \+ color.

Información no encontrada:

\* No aparece el diagrama detallado de pasos en la sección 6.3.  
\* No se define navegación final explícita para este rol en el flujo detallado.

**\#\#\#\# Onboarding de Child / Niño**

Flujo encontrado:

1\. Elegir avatar y color.  
2\. Ver lista de ejemplo.  
3\. Completar primera tarea.  
4\. Home con primer valor.

Duración objetivo:

\* \~25 segundos.

**\#\#\#\# Onboarding de Senior / Adulto Mayor**

Flujo encontrado:

1\. Bienvenida \+ nombre \+ tratamiento.  
2\. Letra más grande, default sí.  
3\. Medicación \+ horario \+ contacto de emergencia.  
4\. Home con primer valor.

Duración objetivo:

\* \~60 segundos.

**\#\#\#\# Onboarding de Guest / Invitado**

No encontrado.

**\---**

**\#\#\# APIs**

No se encuentran endpoints, métodos, rutas, request, response ni errores.

Acciones mencionadas sin contrato API:

| Acción | Estado |  
| \------ | \------ |  
| registrar usuario | no encontrado |  
| iniciar sesión | no encontrado |  
| refrescar token | no encontrado |  
| cerrar sesión | no encontrado |  
| guardar nombre del hogar | acción mencionada sin contrato API |  
| invitar miembros | acción mencionada sin contrato API |  
| postergar invitación de miembros | acción mencionada sin contrato API |  
| guardar preferencia horaria | acción mencionada sin contrato API |  
| guardar tono / tratamiento | acción mencionada sin contrato API |  
| aceptar invitación | acción conceptual sin contrato API |  
| completar tarea de ejemplo | acción mencionada sin contrato API |

**\---**

**\#\#\# Request**

No se encuentran requests.

**\---**

**\#\#\# Response**

No se encuentran responses.

**\---**

**\#\#\# UI**

**\#\#\#\# Pantallas Auth**

No se encuentra pantalla de Login.

No se encuentra pantalla de Register.

No se encuentra pantalla de Refresh Token.

No se encuentra pantalla de Logout.

**\#\#\#\# UI de onboarding**

Información encontrada:

\* Onboarding no tiene scroll.  
\* Cada paso cabe en una pantalla.  
\* Onboarding no usa carrusel de features.  
\* Onboarding no usa tooltips.  
\* Onboarding no usa videos.  
\* Onboarding no debe pedir permisos de notificación antes de mostrar valor.  
\* Onboarding no debe mostrar pantallas vacías al terminar.  
\* Onboarding termina en Home con primer valor visible.  
\* El empty state de cada dominio explica qué aparecerá ahí y sugiere la primera acción.

**\#\#\#\# UI por rol**

**\#\#\#\#\# Coordinator / Coordinador**

\* Home inicial muestra estado del hogar.  
\* Ve briefing con miembros, tareas pendientes del hogar y próximos eventos.

**\#\#\#\#\# Adult / Adulto**

\* Home inicial muestra tareas y eventos del día.  
\* Ejemplo de copy: “Hoy tenés 2 tareas y 1 evento.”

**\#\#\#\#\# Adolescent / Adolescente**

\* Ve lista personal.  
\* Puede completar algo.  
\* Ejemplo de copy: “Jose, estas son tus tareas para mañana.”

**\#\#\#\#\# Child / Niño**

\* Ve avatar.  
\* Ve “Luca, tu lista de hoy”.  
\* Ve lista del día con íconos.  
\* Puede completar su primera tarea.  
\* Hay animación al completar.

**\#\#\#\#\# Senior / Adulto Mayor**

\* Ve medicación del día.  
\* Ve copy de aviso: “¿Quiere que le avise a las 9?”  
\* Usa diseño asistivo.  
\* El onboarding guiado es paso a paso con confirmación explícita.  
\* No usa timer.  
\* No usa “saltar”.

**\#\#\#\#\# Guest / Invitado**

No se encuentra UI específica.

**\---**

**\#\#\# Componentes UI**

Componentes o patrones encontrados:

\* pantalla de paso de onboarding.  
\* empty state guiado.  
\* toast sutil para primera tarea creada.  
\* Home como destino final del onboarding.  
\* card de medicación para Senior.  
\* lista de ejemplo para Child.  
\* avatar y color para Child.  
\* avatar y color para Adolescent, según tabla de adaptación UX.

No se encuentran componentes de formulario Auth.

**\---**

**\#\#\# Navegación**

Información encontrada:

\* Home es la pantalla inicial.  
\* El usuario no puede cambiar Home como punto de entrada principal.  
\* El onboarding de cada rol termina en Home.  
\* El objetivo es llegar a primer valor visible, no completar todo el setup.

No se encuentra navegación para Login/Register.

**\---**

**\#\#\# Eventos del sistema**

No se encuentran nombres técnicos de eventos del sistema.

Eventos conceptuales encontrados o implícitos por flujo:

\* onboarding iniciado.  
\* nombre del hogar ingresado.  
\* miembros invitados.  
\* invitación postergada.  
\* preferencias guardadas.  
\* onboarding completado.  
\* invitación aceptada.  
\* membresía creada.

Estos nombres no aparecen como eventos técnicos en el documento.

**\---**

**\#\#\# Dependencias**

Dependencias encontradas:

\* Account depende de Person para representar identidad operativa.  
\* Person depende de Membership para participar en un hogar.  
\* Membership depende de Household.  
\* Membership depende de Role.  
\* Invitation crea Membership.  
\* Onboarding depende del Role para variar pasos, jerarquía y primer valor.  
\* Onboarding de Coordinator depende de Household e Invitation.  
\* Onboarding termina en Home para mostrar primer valor.

**\---**

**\#\#\# Restricciones arquitectónicas**

Restricciones encontradas:

\* Account pertenece al usuario, no al hogar.  
\* Person pertenece a Account.  
\* Person puede participar en uno o más hogares.  
\* Membership representa la relación Person-Household.  
\* Membership posee un único rol activo.  
\* La privacidad individual tiene prioridad sobre la conveniencia.  
\* Información privada pertenece a quien la genera.  
\* Coordinadores administran el hogar, no la vida privada.

No se encuentran restricciones técnicas de tokens, sesiones, RLS, cookies, JWT, refresh token rotation ni single-use tokens.

**\---**

**\#\#\# Casos de uso**

Casos de uso encontrados:

\* Usuario Coordinator entra por primera vez y nombra el hogar.  
\* Coordinator invita miembros durante onboarding.  
\* Coordinator posterga invitación de miembros.  
\* Adult entra y configura nombre, rol, preferencia horaria y tono.  
\* Adolescent configura avatar y color, según tabla de adaptación UX.  
\* Child elige avatar y color, ve lista de ejemplo y completa primera tarea.  
\* Senior configura nombre, tratamiento, letra grande, medicación, horario y contacto de emergencia.  
\* Usuario llega a Home con valor visible antes de completar configuración total.  
\* Usuario aprende con empty states en lugar de tutorial.

**\---**

**\#\#\# Casos especiales**

Casos especiales encontrados:

\* Coordinator puede postergar invitaciones.  
\* Senior tiene letra grande por defecto.  
\* Senior usa onboarding guiado sin timer y sin “saltar”.  
\* Child tiene onboarding con tarea/lista de ejemplo.  
\* Adolescent aparece con onboarding resumido en tabla, pero sin flujo detallado en sección 6.3.  
\* Guest aparece como rol oficial, pero sin onboarding específico.

**\---**

**\#\#\# Edge cases**

Edge cases encontrados o ausencias relevantes:

\* No pedir permisos de notificación antes de mostrar valor.  
\* No forzar invitación de miembros.  
\* No pedir datos innecesarios.  
\* No mostrar pantallas vacías después del onboarding.  
\* No usar tour de app.  
\* Si una pantalla puede omitirse, no era necesaria.  
\* No hay definición sobre qué ocurre si se abandona onboarding.  
\* No hay definición sobre reintento de invitación.  
\* No hay definición sobre aceptación de invitación expirada.  
\* No hay definición sobre usuario ya perteneciente a un hogar.  
\* No hay definición sobre cambio de rol durante onboarding.

**\---**

**\#\#\# Datos mockeados**

Datos o comportamientos de ejemplo detectados:

\* Lista de ejemplo para Child.  
\* Primera tarea de ejemplo para Child.  
\* Copy de primer valor para Adult: “Hoy tenés 2 tareas y 1 evento.”  
\* Copy de primer valor para Adolescent: “Jose, estas son tus tareas para mañana.”  
\* Copy de primer valor para Child: “Luca, tu lista de hoy.”  
\* Copy de primer valor para Senior: “¿Quiere que le avise a las 9?”

Estos datos aparecen como experiencia de onboarding / primer valor. El documento no define que deban persistirse como datos reales del dominio.

**\---**

**\#\#\# Funcionalidades REAL**

Funcionalidades reales encontradas para este fragment:

\* Onboarding por rol.  
\* Primer valor visible dentro de 60 segundos.  
\* Nombre/configuración inicial del hogar para Coordinator.  
\* Invitar miembros durante onboarding de Coordinator.  
\* Postergar invitación de miembros.  
\* Guardar preferencia horaria.  
\* Guardar tono / tratamiento.  
\* Configurar avatar y color para Child.  
\* Configurar avatar y color para Adolescent, según tabla de adaptación UX.  
\* Letra grande por defecto para Senior.  
\* Capturar medicación \+ horario \+ contacto de emergencia en onboarding de Senior.  
\* Navegar a Home al finalizar onboarding.  
\* Empty states como guía de uso.  
\* Relación Account → Person.  
\* Relación Person → Membership.  
\* Relación Membership → Household.  
\* Relación Membership → Role.  
\* Relación Invitation → Membership.

**\---**

**\#\#\# Funcionalidades MOCK**

Funcionalidades o datos tratables como mock/demo desde este documento:

\* Lista de ejemplo para Child.  
\* Primera tarea de ejemplo para Child.  
\* Copies de primer valor usados como ejemplos.

**\---**

**\#\#\# Funcionalidades POST\_MVP**

Información existente pero no implementable ahora dentro de este fragment:

\* \`Empleado Familiar\` aparece como rol oficial en el archivo de comprensión, pero queda fuera de los roles MVP solicitados.

**\---**

**\#\# 2\. Clasificación para implementación**

**\#\#\# REAL**

Implementable para MVP v1.0 desde este documento:

\* \`Account\` como entidad de cuenta/perfil del usuario, solo con los campos explícitos encontrados.  
\* \`Person\` como entidad operativa asociada a \`Account\`, solo con los campos explícitos encontrados.  
\* Relación \`Account\` → \`Person\`.  
\* Relación \`Person\` → \`Membership\`.  
\* Relación \`Membership\` → \`Household\`.  
\* Relación \`Membership\` → \`Role\`.  
\* \`Membership\` con un único rol activo.  
\* Estados de \`Membership\` encontrados:  
  \* Pendiente.  
  \* Activa.  
  \* Suspendida.  
  \* Finalizada.  
\* Roles MVP encontrados y mapeados:  
  \* Coordinador → Coordinator.  
  \* Adulto → Adult.  
  \* Adolescente → Adolescent.  
  \* Niño → Child.  
  \* Adulto Mayor → Senior.  
  \* Invitado → Guest.  
\* Onboarding por rol.  
\* Primer valor visible en menos de 60 segundos.  
\* Flujo de Coordinator:  
  \* nombre del hogar.  
  \* invitar miembros.  
  \* poder postergar invitación.  
  \* preferencia horaria.  
  \* tono.  
  \* Home.  
\* Flujo de Adult:  
  \* bienvenida \+ nombre \+ rol.  
  \* preferencia horaria \+ tono.  
  \* Home.  
\* Flujo parcial de Adolescent:  
  \* avatar \+ color.  
\* Flujo de Child:  
  \* avatar \+ color.  
  \* lista de ejemplo.  
  \* completar primera tarea.  
  \* Home.  
\* Flujo de Senior:  
  \* nombre \+ tratamiento.  
  \* letra más grande con default sí.  
  \* medicación \+ horario \+ contacto emergencia.  
  \* Home.  
\* Invitación durante onboarding de Coordinator.  
\* Aceptación de invitación como flujo conceptual de \`Invitation\`.  
\* Empty states como guía.  
\* No tutorial largo.  
\* No pedir permisos de notificación antes de mostrar valor.  
\* No forzar invitaciones.

No implementable desde este documento por falta de información:

\* Register técnico.  
\* Login.  
\* Refresh Token.  
\* Logout.  
\* Session.  
\* RefreshToken.  
\* Endpoints Auth.

**\---**

**\#\#\# MOCK**

Debe tratarse como dato demo o comportamiento simulado si se usa en MVP:

\* Lista de ejemplo para Child.  
\* Primera tarea de ejemplo para Child.  
\* Copies de ejemplo de primer valor.

No convertir estos datos de ejemplo en modelo completo de Planner desde este fragment.

**\---**

**\#\#\# POST\_MVP**

Información detectada pero fuera del MVP de este fragment:

\* Empleado Familiar como rol adicional no incluido en la lista de roles MVP solicitados.

**\---**

**\#\#\# IGNORAR**

No se incluye contenido fuera de alcance en este fragment.

**\---**

**\#\# 3\. Información faltante**

| Área | Información faltante | Por qué importa | Impacto |  
| \---- | \-------------------- | \--------------- | \------- |  
| Auth | Register técnico | Es obligatorio para MVP Auth | No se puede implementar desde este documento. |  
| Auth | Login | Es obligatorio para MVP Auth | No se puede implementar desde este documento. |  
| Auth | Refresh Token | Es obligatorio para MVP Auth | No se puede implementar desde este documento. |  
| Auth | Logout | Es obligatorio para MVP Auth | No se puede implementar desde este documento. |  
| Auth | Session | Necesario para sesión/autenticación | Entidad ausente. |  
| Auth | RefreshToken | Necesario para refresh | Entidad ausente. |  
| Auth | email/password/provider | Necesario para registro/login | Campos ausentes. |  
| Auth | expiración de sesión/token | Necesario para seguridad | No definido. |  
| Auth | errores de autenticación | Necesario para UI/API | No definido. |  
| Auth | endpoints, métodos, rutas, request, response | Necesario para integración frontend/backend | No definido. |  
| Crear hogar durante registro | El documento solo muestra nombre/configuración del hogar en onboarding de Coordinator | El alcance pide crear hogar durante registro | No se puede afirmar integración con Register. |  
| Household | campos técnicos de Household | Necesario para crear hogar | Solo aparece nombre del hogar en onboarding. |  
| Invitations | token/código/expiración/single-use | Necesario para invitación segura | No definido. |  
| Invitations | aceptar invitación con UI/API | MVP lo requiere | Solo aparece flujo conceptual. |  
| Invitations | aprobación “si corresponde” | Afecta reglas de ingreso | No se define cuándo corresponde ni quién aprueba. |  
| Membership | transiciones entre Pendiente/Activa/Suspendida/Finalizada | Necesario para aceptar invitación e ingreso | No definido. |  
| Roles | permisos por rol | Necesario para autorización | Solo hay información parcial de UX/agencia. |  
| Roles | Guest / Invitado | Rol MVP solicitado | Aparece como rol, pero no tiene onboarding ni permisos. |  
| Roles | Adolescent / Adolescente | Rol MVP solicitado | Tiene onboarding resumido en tabla, pero no flujo detallado en sección 6.3. |  
| Roles | Empleado Familiar | Aparece en comprensión | No pertenece al MVP solicitado y no tiene flujo aquí. |  
| Onboarding | persistencia de preferencia horaria | Necesario para implementar formulario | Tipo y destino no definidos. |  
| Onboarding | persistencia de tono/tratamiento | Necesario para implementar formulario | Tipo y destino no definidos. |  
| Onboarding | abandono/reanudación de onboarding | Caso común | No definido. |  
| Onboarding | validaciones de nombre, avatar, color, contacto | Necesario para formularios | No definido. |  
| Eventos del sistema | nombres técnicos | Necesario para tracking/auditoría/event bus | Solo hay eventos conceptuales. |  
| Arquitectura | RLS/separación por hogar | Necesario para seguridad de datos | No aparece en este documento. |

**\#\#\# Contradicciones o dudas detectadas**

\* \`Adolescent / Adolescente\` aparece con onboarding de 2 pasos en la tabla de adaptación UX, pero no aparece en el flujo detallado de la sección 6.3.  
\* \`Guest / Invitado\` aparece como rol oficial en el archivo de comprensión, pero no tiene flujo de onboarding, campos ni permisos.  
\* \`Crear hogar durante registro\` no aparece como parte de Register; solo aparece nombre/configuración del hogar durante onboarding de Coordinator.  
\* \`Aceptar invitación\` aparece solo como flujo conceptual dentro de \`Invitation\`; no se define pantalla, token, validaciones ni endpoint.  
\* \`Account\`, \`Person\` y \`User\` no están normalizados: \`User\` no aparece como entidad explícita; la información disponible usa \`Account\` y \`Person\`.

**\---**

**\#\# 4\. Fuente**

\* Archivo: \`HomePlus — SECCION 6 UX PHILOSOPHY(1).md\`  
  \* Sección: \`2.3 Reglas de scroll\`.  
  \* Sección: \`4. Adaptación por rol\`.  
  \* Sección: \`4.1 Tabla comparativa de adaptación UX por rol\`.  
  \* Sección: \`4.3 Adulto Mayor: diseño asistivo, no solo "fuente grande"\`.  
  \* Sección: \`6. Onboarding y primer valor\`.  
  \* Sección: \`6.1 Principio: 60 segundos hasta valor visible\`.  
  \* Sección: \`6.2 No tutoriales largos\`.  
  \* Sección: \`6.3 Flujo de onboarding por rol\`.  
  \* Sección: \`6.4 Qué no tiene el onboarding\`.  
  \* Sección: \`8. Tabla de decisiones UX\`, decisiones \`UX-10\` y \`UX-11\`.

\* Archivo: \`Seccion 6 filosofia ux(1).txt\`  
  \* Sección: \`OUTPUT 1 — ENTITIES\`.  
  \* Sección: \`OUTPUT 2 — RELATIONSHIPS\`.  
  \* Sección: \`OUTPUT 5 — BUSINESS RULES\`.  
  \* Sección: \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`.  
  \* Sección: \`OUTPUT 7 — MISSING / IMPLIED CONNECTIONS\`.

\* Archivo: \`source\_map\_HomePlus\_SECCION\_6\_UX\_PHILOSOPHY.md\`  
  \* Sección: \`4.1 AUTH\`.  
  \* Sección: \`4.2 ONBOARDING\`.  
  \* Sección: \`5. Mapa de entidades\`.  
  \* Sección: \`6. Mapa de relaciones\`.  
  \* Sección: \`7. Mapa de estados\`.  
  \* Sección: \`18. Información faltante\`.  
  \* Sección: \`21. Instrucciones para futuras extracciones\`.

**\# AUTH \+ ONBOARDING fragment — HomePlus — SECCION 7 AI PHILOSOPHY \- GENI**

**\#\# 1\. Información encontrada**

**\#\#\# Objetivo del módulo**

No se encontró un objetivo explícito de AUTH ni de ONBOARDING en este documento.

El documento está centrado en la filosofía y restricciones de Geni. La información útil para AUTH \+ ONBOARDING es indirecta y se limita a entidades transversales, roles, permisos y privacidad.

**\#\#\# Entidades**

**\#\#\#\# Cuenta**

\* Pertenece al usuario, no al hogar.  
\* Incluye, según el archivo de comprensión: perfil, preferencias, idioma, configuración personal y memoria personal de Geni.  
\* No se define como entidad de autenticación operativa.  
\* No se describen credenciales, email, password, hash, sesiones, refresh tokens ni dispositivos.

**\#\#\#\# Persona**

\* Es una entidad transversal.  
\* Toda Persona pertenece a una Cuenta.  
\* Una Persona puede participar en uno o más Hogares.

**\#\#\#\# Membership**

\* Relaciona una Persona con un Hogar.  
\* Posee un único rol activo por hogar.  
\* Los roles son independientes entre hogares.  
\* Estados encontrados en el archivo de comprensión:  
  \* Pendiente  
  \* Activa  
  \* Suspendida  
  \* Finalizada

**\#\#\#\# Invitación**

\* Aparece como flujo de ingreso al hogar.  
\* Flujo encontrado:  
  \* Invitación → Aceptación → Aprobación → Ingreso  
\* No se vincula explícitamente con el onboarding de registro en este documento.

**\#\#\#\# Rol**

Roles encontrados y mapeables al MVP:

| Nombre en documento | Rol MVP |  
| \------------------- | \------- |  
| Coordinador | Coordinator |  
| Adulto | Adult |  
| Adolescente | Adolescent |  
| Niño | Child |  
| Adulto Mayor | Senior |  
| Invitado | Guest |

**\#\#\# Campos**

**\#\#\#\# Cuenta**

Campos/conceptos mencionados, sin tipo técnico:

\* perfil  
\* preferencias  
\* idioma  
\* configuración personal  
\* memoria personal de Geni

**\#\#\#\# Contexto de perfil usado por Geni**

Datos mencionados para personalización de contexto, sin contrato de Auth:

\* rol del miembro  
\* nombre  
\* preferencias de notificación  
\* idioma

**\#\#\#\# Membership**

Información mencionada:

\* Persona vinculada  
\* Hogar vinculado  
\* rol activo  
\* estado de membresía

No hay definición de tipos, obligatoriedad, índices, claves, timestamps ni validaciones.

**\#\#\# Tipos**

No se encontraron tipos técnicos para Auth.

No se encontraron tipos para:

\* email  
\* password  
\* password\_hash  
\* access token  
\* refresh token  
\* session  
\* device  
\* verification code  
\* invitation code

**\#\#\# Valores por defecto**

No se encontraron valores por defecto para Auth ni Onboarding.

**\#\#\# Restricciones**

\* Los datos privados no deben compartirse automáticamente entre miembros.  
\* Ningún rol obtiene acceso automático a memoria privada de Geni, metas privadas, documentos privados o finanzas personales de otro miembro.  
\* Los datos sensibles o credenciales no se guardan como memorias de Geni.  
\* Las memorias personales de otros miembros no se cargan en el contexto de otro miembro.  
\* La información de dominios donde el miembro no tiene permisos no se carga.  
\* El output se filtra por la matriz de permisos del miembro que consulta.

**\#\#\# Relaciones**

| Origen | Relación | Destino | Nota |  
| \------ | \-------- | \------- | \---- |  
| Persona | pertenece a | Cuenta | Relación explícita en archivo de comprensión. |  
| Persona | participa en | Hogar | Puede participar en uno o más hogares. |  
| Membership | vincula | Persona | Relación de membresía. |  
| Membership | vincula | Hogar | Relación de membresía. |  
| Membership | tiene rol | Rol | Un único rol activo por hogar. |  
| Invitación | dispara | Membership | Relación encontrada en archivo de comprensión. |

**\#\#\# Cardinalidad**

\* Una Cuenta puede tener múltiples Personas en distintos Hogares.  
\* Una Persona puede participar en uno o más Hogares.  
\* Cada Membership posee un único rol activo por Hogar.  
\* Los roles son independientes entre Hogares.

**\#\#\# Estados posibles**

**\#\#\#\# Membership**

Estados encontrados:

\* Pendiente  
\* Activa  
\* Suspendida  
\* Finalizada

**\#\#\#\# Auth / Session / Token**

No se encontraron estados.

**\#\#\#\# Onboarding**

No se encontraron estados.

**\#\#\#\# Invitación**

No se encontró una lista formal de estados de invitación en este documento.

**\#\#\# Reglas de negocio**

\* Toda Persona pertenece a una Cuenta.  
\* Una Cuenta puede tener múltiples Personas en distintos Hogares.  
\* Cada Membership posee un único rol activo por Hogar.  
\* Los roles son independientes entre Hogares.  
\* Las relaciones familiares son informativas y no modifican permisos automáticamente.  
\* El Coordinador puede aprobar ingresos, cambiar roles, expulsar miembros, transferir coordinación y administrar configuraciones del hogar.  
\* El Coordinador no puede eliminar hogares.  
\* El Adulto puede invitar personas.  
\* El Adulto no puede aprobar ingresos.  
\* El Adolescente puede recibir permisos adicionales configurables.  
\* Ningún rol obtiene acceso automático a información privada de otro miembro.

**\#\#\# Permisos**

**\#\#\#\# Coordinator / Coordinador**

Permisos encontrados:

\* aprobar ingresos  
\* cambiar roles  
\* expulsar miembros  
\* transferir coordinación  
\* administrar configuraciones del hogar

Restricción encontrada:

\* no puede eliminar hogares

**\#\#\#\# Adult / Adulto**

Permisos encontrados:

\* invitar personas  
\* crear/reasignar tareas  
\* crear eventos  
\* administrar operaciones familiares

Restricción encontrada:

\* no puede aprobar ingresos

**\#\#\#\# Adolescent / Adolescente**

Permisos encontrados:

\* crear eventos familiares  
\* administrar tareas propias  
\* puede recibir permisos adicionales configurables

**\#\#\#\# Child / Niño**

Información encontrada:

\* experiencia simplificada  
\* no administra información familiar crítica

**\#\#\#\# Senior / Adulto Mayor**

Información encontrada:

\* experiencia adaptada  
\* Home prioriza personas, eventos, recordatorios, medicación y coordinación

**\#\#\#\# Guest / Invitado**

Información encontrada:

\* acceso mínimo  
\* participación limitada

**\#\#\# Flujos**

**\#\#\#\# Register**

No encontrado.

**\#\#\#\# Login**

No encontrado.

**\#\#\#\# Refresh Token**

No encontrado.

**\#\#\#\# Logout**

No encontrado.

**\#\#\#\# Crear hogar durante registro**

No encontrado.

**\#\#\#\# Invitar miembros durante onboarding**

No encontrado explícitamente.

Información relacionada encontrada, pero no vinculada a onboarding:

\* Invitación → Aceptación → Aprobación → Ingreso  
\* Adulto puede invitar personas.  
\* Coordinador puede aprobar ingresos.

**\#\#\#\# Onboarding por rol**

No encontrado como flujo.

Información relacionada encontrada:

\* El documento define tono de Geni por rol, pero no define pasos, pantallas ni reglas funcionales de onboarding por rol.

Tonos encontrados por rol:

| Rol MVP | Tono encontrado |  
| \------- | \--------------- |  
| Coordinator | Colega. Informativo, respetuoso, directo. |  
| Adult | Par. Cálido, colaborativo, sin autoridad. |  
| Adolescent | Mentor joven. Motivacional, sin condescendencia. |  
| Child | Acompañante lúdico. Simple, visual, positivo. |  
| Senior | Paciente, claro, con prioridad en lo esencial. |  
| Guest | Neutral, funcional, con contexto mínimo. |

**\#\#\# APIs**

No se encontraron endpoints ni contratos API para:

\* register  
\* login  
\* refresh token  
\* logout  
\* crear hogar durante registro  
\* invitar miembros durante onboarding  
\* aceptar invitación  
\* onboarding por rol

No hay Request ni Response.

**\#\#\# Request**

No encontrado.

**\#\#\# Response**

No encontrado.

**\#\#\# UI**

No se encontraron pantallas ni componentes para:

\* Login  
\* Register  
\* Logout  
\* Onboarding  
\* Crear hogar durante registro  
\* Invitar miembros durante onboarding  
\* Aceptar invitación

Información UI relacionada, sin estructura de pantalla:

\* El tono de Geni varía por rol.  
\* El contexto de Geni puede usar rol, nombre, preferencias de notificación e idioma.

**\#\#\# Componentes UI**

No encontrados para Auth \+ Onboarding.

**\#\#\# Navegación**

No se encontró navegación de Auth ni Onboarding.

**\#\#\# Eventos del sistema**

No se encontraron eventos técnicos para:

\* auth.registered  
\* auth.logged\_in  
\* auth.logged\_out  
\* auth.token\_refreshed  
\* onboarding.started  
\* onboarding.completed  
\* household.created\_during\_registration  
\* invitation.created\_during\_onboarding  
\* invitation.accepted

**\#\#\# Dependencias**

Dependencias explícitas o claramente derivadas del documento:

\* Auth depende conceptualmente de Cuenta y Persona.  
\* Onboarding depende conceptualmente de Persona, Hogar, Membership y Rol.  
\* Invitaciones dependen conceptualmente de Membership.  
\* La personalización por rol depende del rol activo del miembro.  
\* El filtrado de información depende de la matriz de permisos del miembro.

**\#\#\# Restricciones arquitectónicas**

\* El output y contexto se filtran por permisos del miembro.  
\* Información privada de otro miembro no se carga automáticamente.  
\* Credenciales y datos sensibles no se guardan como memoria.  
\* Cada Membership tiene un único rol activo por hogar.  
\* Los roles son independientes entre hogares.

No se encontraron restricciones arquitectónicas sobre:

\* JWT  
\* refresh tokens  
\* cookies  
\* sesiones  
\* expiración de sesión  
\* rotación de tokens  
\* single-use invitation token  
\* hashing de password  
\* email verification  
\* reset password

**\#\#\# Casos de uso**

No se encontraron casos de uso operativos de Auth.

Casos de uso indirectos relacionados con onboarding/membership:

\* Una Persona ingresa a un Hogar mediante Invitación → Aceptación → Aprobación → Ingreso.  
\* El Coordinador aprueba ingresos.  
\* El Adulto puede invitar personas, pero no aprobar ingresos.  
\* El rol activo dentro del hogar determina permisos y tono/contexto.

**\#\#\# Casos especiales**

\* Una Cuenta puede tener múltiples Personas en distintos Hogares.  
\* Los roles son independientes entre Hogares.  
\* Las relaciones familiares no modifican permisos automáticamente.  
\* Ningún rol tiene acceso automático a información privada de otro miembro.

**\#\#\# Edge cases**

\* Riesgo de confundir Persona con Cuenta, porque el documento las separa pero no define el modelo de Auth.  
\* Riesgo de tratar Membership como Auth, cuando el documento solo la presenta como relación Persona-Hogar.  
\* Riesgo de usar tono por rol como si fuera onboarding por rol; el documento no define ese flujo.  
\* Riesgo de implementar invitaciones de onboarding usando este documento; el flujo existe como ingreso al hogar, pero no está conectado explícitamente al registro/onboarding.

**\#\#\# Datos mockeados**

No se encontraron datos mockeados para Auth \+ Onboarding.

**\#\#\# Funcionalidades REAL**

Información potencialmente implementable como base transversal, pero incompleta:

\* Cuenta como entidad asociada al usuario.  
\* Persona como entidad transversal asociada a Cuenta.  
\* Membership como relación Persona-Hogar.  
\* Rol activo por hogar.  
\* Filtrado por permisos del miembro.  
\* Restricción de privacidad sobre datos personales y datos de otros miembros.

**\#\#\# Funcionalidades MOCK**

No encontradas para Auth \+ Onboarding.

**\#\#\# Funcionalidades POST\_MVP**

\* Memoria personal de Geni asociada a Cuenta.  
\* Memoria familiar asociada al Hogar.  
\* Personalización avanzada del tono de Geni por rol.  
\* Contextualización de Geni con actividad reciente, briefing anterior, memorias y permisos.

**\#\# 2\. Clasificación para implementación**

**\#\#\# REAL**

Usable para MVP v1.0 solo como información parcial/transversal:

\* Cuenta pertenece al usuario, no al hogar.  
\* Persona pertenece a Cuenta.  
\* Persona puede participar en uno o más Hogares.  
\* Membership vincula Persona y Hogar.  
\* Membership posee un único rol activo por hogar.  
\* Roles mapeables al MVP:  
  \* Coordinador → Coordinator  
  \* Adulto → Adult  
  \* Adolescente → Adolescent  
  \* Niño → Child  
  \* Adulto Mayor → Senior  
  \* Invitado → Guest  
\* El rol activo impacta permisos.  
\* Las relaciones familiares no modifican permisos automáticamente.  
\* El Adulto puede invitar personas.  
\* El Coordinador puede aprobar ingresos, cambiar roles, expulsar miembros, transferir coordinación y administrar configuraciones del hogar.  
\* El Adulto no puede aprobar ingresos.  
\* Ningún rol obtiene acceso automático a información privada de otro miembro.  
\* Los datos sensibles o credenciales no deben guardarse como memorias.

**\#\#\# MOCK**

No se encontró información MOCK para Auth \+ Onboarding.

**\#\#\# POST\_MVP**

\* Memoria personal de Geni.  
\* Memoria familiar de Geni.  
\* Contexto avanzado de Geni por rol, permisos, actividad reciente, memorias y briefing anterior.  
\* Tono personalizado de Geni por rol.

**\#\#\# IGNORAR**

No se incluye contenido ignorado en este fragment.

**\#\# 3\. Información faltante**

**\#\#\# AUTH**

\* No hay flujo de Register.  
\* No hay flujo de Login.  
\* No hay flujo de Refresh Token.  
\* No hay flujo de Logout.  
\* No hay entidad Session.  
\* No hay entidad RefreshToken.  
\* No hay access token.  
\* No hay campos de email/password.  
\* No hay validaciones.  
\* No hay expiraciones.  
\* No hay reglas de rotación de refresh token.  
\* No hay errores.  
\* No hay endpoints.  
\* No hay Request/Response.  
\* No hay UI de Login/Register.

**\#\#\# ONBOARDING**

\* No hay flujo de onboarding.  
\* No hay creación de hogar durante registro.  
\* No hay invitación de miembros durante onboarding.  
\* No hay aceptar invitación como parte de onboarding.  
\* No hay pasos por rol.  
\* No hay pantallas.  
\* No hay componentes.  
\* No hay formularios.  
\* No hay campos.  
\* No hay validaciones.  
\* No hay estados.  
\* No hay eventos del sistema.

**\#\#\# HOUSEHOLD relacionado con onboarding**

\* Se menciona ingreso al hogar mediante invitación, aceptación, aprobación e ingreso, pero no se define contrato.  
\* No hay token/código de invitación.  
\* No hay expiración de invitación.  
\* No hay definición de quién recibe o consume la invitación.  
\* No hay request/response para aceptar invitación.

**\#\#\# Roles y permisos**

\* Los permisos no están completos para todas las acciones de Auth \+ Onboarding.  
\* No se define quién puede crear hogar durante registro.  
\* No se define si Guest puede ser invitado durante onboarding.  
\* No se define si Child/Senior requieren tratamiento especial durante onboarding.  
\* No se define matriz completa de permisos.

**\#\#\# Contradicciones o riesgos**

\* El documento aporta roles y permisos desde la perspectiva de Geni/People, no desde Auth.  
\* \`Cuenta\` y \`Persona\` aparecen separadas, pero no se define cómo se crean durante Register.  
\* \`Membership\` tiene estados encontrados, pero no se conectan a un flujo técnico de invitación/onboarding.  
\* El tono por rol puede parecer onboarding por rol, pero no lo es.  
\* La invitación aparece como flujo de ingreso al hogar, pero no explícitamente como parte del onboarding.  
\* No debe usarse este documento para diseñar tokens, sesiones, endpoints ni pantallas de Auth.

**\#\# 4\. Fuente**

\* Archivo: \`HomePlus — SECCION 7 AI PHILOSOPHY \- GENI(1).md\`  
\* Secciones:  
  \* \`7.2.2 Restricciones Absolutas\`  
  \* \`7.5.3 Qué NO Recuerda Geni\`  
  \* \`7.5.4 Cómo Contextualiza Geni\`  
  \* \`7.7.2 Tono por Rol\`  
  \* \`7.8.1 Qué Datos Entran al Contexto de Geni\`  
  \* \`7.8.2 Qué NUNCA Entra al Contexto de Geni\`  
\* Archivo de comprensión asociado: \`Seccion 7 Filosofia de la ai \- geni(1).txt\`  
\* Secciones:  
  \* \`OUTPUT 1 — ENTITIES\`  
  \* \`OUTPUT 2 — RELATIONSHIPS\`  
  \* \`OUTPUT 5 — BUSINESS RULES\`  
  \* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`  
\* Source map usado: \`source\_map\_HomePlus\_SECCION\_7\_AI\_PHILOSOPHY\_GENI.md\`  
\* Secciones:  
  \* \`4.1 AUTH\`  
  \* \`4.2 ONBOARDING\`  
  \* \`5. Mapa de entidades\`  
  \* \`6. Mapa de relaciones\`  
  \* \`8. Mapa de permisos\`  
  \* \`9. Mapa de flujos\`  
  \* \`18. Información faltante\`  
  \* \`19. Recomendación de fragments a generar\`

**\# AUTH \+ ONBOARDING fragment — SECCION\_8\_DATA\_PHILOSOPHY**

**\#\# 1\. Información encontrada**

**\#\#\# Objetivo del módulo**

No se define un objetivo funcional explícito para Auth ni para Onboarding. El documento funciona como una fuente de restricciones transversales de datos, privacidad, seguridad, consentimiento, cierre de cuenta y permisos.

**\#\#\# Entidades**

| Entidad | Información explícita encontrada | Relevancia para Auth / Onboarding |  
|---|---|---|  
| Cuenta | Pertenece al usuario, no al hogar. Incluye perfil, preferencias, idioma, configuración personal y memoria personal. | Base conceptual para cuenta de usuario. No define credenciales ni sesión. |  
| Persona | Pertenece a una cuenta. Participa en uno o más hogares. Contiene nombre, apellido, foto, fecha de nacimiento, género, contacto y rol. | Base conceptual para identidad del miembro dentro del hogar. |  
| Hogar | Unidad organizativa principal. Todo ocurre dentro de un hogar. | Afecta creación/ingreso al hogar, pero no se define creación durante registro. |  
| Membresía | Relación entre una persona y un hogar. Estados: Pendiente, Activa, Suspendida, Finalizada. | Útil para ingreso al hogar e invitaciones, pero no se define contrato técnico. |  
| Invitación | Flujo indicado en archivo de comprensión: Invitación → Aceptación → Aprobación → Ingreso al hogar. | Útil para onboarding/invitación, pero sin endpoints ni request/response. |  
| Rol | Roles encontrados en archivo de comprensión: Coordinador, Adulto, Adolescente, Niño, AdultoMayor, Invitado. | Útil para onboarding por rol y permisos iniciales. |

**\#\#\# Campos**

| Entidad | Campos encontrados | Tipo definido |  
|---|---|---|  
| Cuenta | perfil, preferencias, idioma, configuración personal, memoria personal | No |  
| Persona | nombre, apellido, foto, fecha de nacimiento, género, contacto, rol | No |  
| Membresía | estado: Pendiente, Activa, Suspendida, Finalizada | No |  
| Cierre de cuenta | solicitud de cierre, período de gracia de 30 días, eliminación en día 30 | Parcial: plazos definidos, tipos no definidos |  
| Consentimiento | confirmación explícita para datos sensibles durante onboarding | No |

No se encuentran campos para password, password hash, access token, refresh token, expiración de sesión, device, IP de sesión, email verification, reset password ni logout.

**\#\#\# Tipos**

No se definen tipos técnicos para los campos de Auth u Onboarding.

**\#\#\# Valores por defecto**

No se definen valores por defecto para Auth.

Para Onboarding se encuentra una regla general: cada dato sensible pide confirmación explícita. No se define un valor booleano, nombre de campo ni almacenamiento técnico del consentimiento.

**\#\#\# Restricciones**

\* Contraseñas, tokens y claves aparecen como datos que no se guardan; el documento indica que nunca se almacenan.  
\* Toda comunicación cliente-servidor debe usar TLS 1.3.  
\* Datos generales en reposo usan AES-256.  
\* Datos sensibles usan AES-256 \+ clave por hogar.  
\* RLS filtra cada consulta a nivel de base de datos por permisos del miembro que la origina; no es un filtro de capa de aplicación.  
\* Si la capa de aplicación falla, la base de datos no debe entregar datos que el miembro no debería ver.  
\* El acceso a un documento requiere autenticación del miembro, permiso explícito sobre el documento, descifrado con clave del hogar y descifrado con clave del documento.  
\* El usuario puede solicitar cierre de cuenta.  
\* Antes del cierre, HomePlus ofrece exportación completa.  
\* El cierre de cuenta tiene 30 días de gracia.  
\* Si el usuario no revierte el cierre, se eliminan todos los datos del usuario en el día 30\.  
\* Si el usuario es el último miembro del hogar, se elimina el hogar completo en el día 30\.  
\* Si el hogar sigue existiendo, ciertos datos del hogar permanecen aunque el miembro cierre su cuenta.  
\* El registro de auditoría permanece porque pertenece al sistema.

**\#\#\# Relaciones**

| Origen | Relación | Destino | Estado |  
|---|---|---|---|  
| Cuenta | owns / pertenece a | Persona | Explícita en archivo de comprensión |  
| Persona | participa en | Hogar | Explícita en archivo de comprensión |  
| Membresía | links | Persona | Explícita en archivo de comprensión |  
| Membresía | links | Hogar | Explícita en archivo de comprensión |  
| Invitación | deriva en | Aceptación → Aprobación → Ingreso al hogar | Explícita en archivo de comprensión |  
| Coordinador | aprueba | incorporación de niño al hogar | Explícita en documento principal |  
| Usuario que cierra cuenta | puede provocar eliminación de | Hogar completo, si es último miembro | Explícita en documento principal |

**\#\#\# Cardinalidad**

\* Persona participa en uno o más hogares, según archivo de comprensión.  
\* Cuenta pertenece al usuario, no al hogar.  
\* La relación Persona/Hogar se expresa mediante Membresía.  
\* No se define cardinalidad de sesiones, tokens, invitaciones, hogares por cuenta ni miembros por hogar.

**\#\#\# Estados posibles**

| Entidad / proceso | Estados encontrados | Notas |  
|---|---|---|  
| Membresía | Pendiente, Activa, Suspendida, Finalizada | Aparece en archivo de comprensión. No se mapea a enums técnicos en inglés. |  
| Cierre de cuenta | Día 0 solicitud, 30 días de gracia, Día 30 eliminación | Es flujo temporal, no enum técnico. |  
| Sesión / token | No encontrado | No hay estados de sesión. |  
| Invitación | No se listan estados técnicos | Solo aparece flujo conceptual. |  
| Onboarding | No encontrado | No hay estado global de onboarding. |

**\#\#\# Reglas de negocio**

\* La familia/usuario es dueña de sus datos; HomePlus administra, no es propietario.  
\* El usuario puede ver sus datos, exportarlos, solicitar eliminación total, saber qué datos existen y cerrar su cuenta llevándose copia antes del borrado final.  
\* No se cruzan datos de otros hogares; cada hogar es una bóveda aislada.  
\* Los datos personales del miembro se eliminan al cierre de cuenta si se completa el período de gracia.  
\* Si el hogar continúa existiendo tras el cierre de cuenta de un miembro:  
  \* las tareas del hogar creadas por ese miembro se transfieren al coordinador;  
  \* los eventos del hogar creados por ese miembro se transfieren al coordinador;  
  \* los registros de auditoría permanecen.  
\* Consentimiento informado: onboarding paso a paso; cada dato sensible pide confirmación explícita.  
\* Para niños, el coordinador aprueba explícitamente la incorporación al hogar.  
\* Para niños, los datos recolectados son mínimos: nombre, avatar, tareas asignadas y rachas.  
\* El coordinador puede ver y eliminar todos los datos del niño.  
\* Base legal indicada para procesamiento: consentimiento explícito en onboarding \+ interés legítimo de funcionamiento del hogar.  
\* Privacy by design se apoya en privacidad por defecto, minimización y RLS.

**\#\#\# Permisos**

| Rol MVP | Nombre en documento | Información encontrada |  
|---|---|---|  
| Coordinator | Coordinador | Responsable administrativo principal del hogar. Aprueba ingresos, cambia roles, expulsa miembros y transfiere coordinación. Aprueba explícitamente incorporación de niños. Puede ver y eliminar todos los datos del niño. |  
| Adult | Adulto | Miembro operativo con amplios permisos. Invita personas, crea/reasigna tareas y crea eventos. |  
| Adolescent | Adolescente | Miembro con autonomía progresiva. Crea eventos familiares, crea gastos, administra tareas propias. Puede recibir permisos adicionales. |  
| Child | Niño | Miembro con experiencia simplificada. No administra información familiar crítica. Sus datos recolectados son mínimos. |  
| Senior | AdultoMayor | Miembro con experiencia adaptada. Home prioriza personas, eventos, recordatorios, medicación y coordinación. |  
| Guest | Invitado | Acceso mínimo. Participación limitada. |

No se encuentra matriz completa de permisos para Register, Login, Refresh Token, Logout, creación de hogar durante registro, invitación durante onboarding ni aceptación de invitación.

**\#\#\# Flujos**

**\#\#\#\# Register**

No encontrado.

**\#\#\#\# Login**

No encontrado.

**\#\#\#\# Refresh Token**

No encontrado.

**\#\#\#\# Logout**

No encontrado.

**\#\#\#\# Crear hogar durante registro**

No encontrado.

**\#\#\#\# Invitar miembros durante onboarding**

No se encuentra como flujo de onboarding. Solo se encuentra, en archivo de comprensión, el flujo conceptual: Invitación → Aceptación → Aprobación → Ingreso al hogar. También se encuentra que Adulto puede invitar personas y Coordinador puede aprobar ingresos.

**\#\#\#\# Aceptar invitación**

Parcial. El archivo de comprensión menciona “Aceptación” dentro del flujo Invitación → Aceptación → Aprobación → Ingreso al hogar. No hay contrato técnico ni pasos detallados.

**\#\#\#\# Onboarding por rol**

Parcial. El documento no define pantallas ni pasos por rol. El archivo de comprensión sí describe roles y responsabilidades generales. El documento principal agrega reglas específicas para incorporación de niños y consentimiento explícito.

**\#\#\#\# Cierre de cuenta**

1\. Usuario solicita cierre desde Configuración.  
2\. HomePlus ofrece exportación completa antes de proceder.  
3\. Existe período de gracia de 30 días.  
4\. Si no revierte, se eliminan todos los datos del usuario el día 30\.  
5\. Si el usuario es el último miembro del hogar, se elimina el hogar completo el día 30\.

**\#\#\# APIs**

No se definen endpoints.

Acciones mencionadas sin contrato API:

\* solicitar cierre de cuenta;  
\* revertir cierre durante período de gracia;  
\* exportar datos antes del cierre;  
\* eliminar datos personales al cierre definitivo;  
\* autenticar miembro para acceder a documentos;  
\* aplicar RLS por permisos del miembro;  
\* registrar consentimiento explícito durante onboarding;  
\* aprobar incorporación de niño al hogar;  
\* aceptar invitación, solo como paso conceptual;  
\* aprobar ingreso al hogar, solo como paso conceptual.

No se encuentran métodos HTTP, rutas, request, response ni errores.

**\#\#\# Request**

No encontrado.

**\#\#\# Response**

No encontrado.

**\#\#\# UI**

| Pantalla / ubicación | Información encontrada | Nivel de detalle |  
|---|---|---|  
| Configuración → Exportar Datos | Mecanismo de exportación. El usuario selecciona dominios, rango de fechas y formato. | Parcial |  
| Configuración → Mis Datos | Inventario de datos visible. | Mencionado |  
| Configuración → Privacidad | Log de accesos a datos. | Mencionado |  
| Configuración | Solicitud de cierre de cuenta. | Parcial |  
| Onboarding paso a paso | Cada dato sensible pide confirmación explícita. | Mencionado |  
| Settings → Cuenta | Perfil, Seguridad, Privacidad, según archivo de comprensión. | Mencionado |

No se encuentran pantallas de Login, Register, Refresh Token, Logout, Create Household, Invite Member o Accept Invitation.

**\#\#\# Componentes UI**

No se definen componentes UI específicos para Auth ni Onboarding.

**\#\#\# Navegación**

\* Configuración → Exportar Datos.  
\* Configuración → Mis Datos.  
\* Configuración → Privacidad.  
\* Settings → Cuenta: Perfil, Seguridad, Privacidad.

No se encuentra navegación de onboarding ni flujo de pantallas.

**\#\#\# Eventos del sistema**

No se definen nombres técnicos de eventos.

Eventos conceptuales detectados:

\* solicitud de cierre de cuenta;  
\* exportación previa al cierre;  
\* reversión posible durante período de gracia;  
\* eliminación definitiva de cuenta/datos personales;  
\* eliminación de hogar si el usuario era último miembro;  
\* consentimiento explícito registrado durante onboarding;  
\* aprobación de incorporación de niño al hogar;  
\* aceptación de invitación;  
\* aprobación de ingreso al hogar.

**\#\#\# Dependencias**

\* Household: por creación/ingreso al hogar y eliminación del hogar si el último miembro cierra cuenta.  
\* Membership: por relación Persona/Hogar y estados de membresía.  
\* Invitations: por flujo Invitación → Aceptación → Aprobación → Ingreso.  
\* Roles & Permissions: por RLS, visibilidad y reglas por rol.  
\* Audit: porque acciones importantes deben dejar registro y los registros permanecen.  
\* Exportación: porque debe ofrecerse antes del cierre de cuenta.  
\* Planner: porque tareas/eventos del hogar creados por un miembro que cierra cuenta se transfieren al coordinador.

**\#\#\# Restricciones arquitectónicas**

\* RLS debe aplicarse a nivel de base de datos.  
\* TLS 1.3 obligatorio para toda comunicación cliente-servidor.  
\* AES-256 para datos generales en reposo.  
\* AES-256 \+ clave por hogar para datos sensibles.  
\* No se deben almacenar contraseñas, tokens ni claves como datos persistidos del hogar.  
\* La separación por hogar es obligatoria: no se cruzan datos entre hogares.  
\* Auditoría permanente para acciones importantes sobre datos del hogar.  
\* Privacy by design: privacidad por defecto \+ minimización \+ RLS.

**\#\#\# Casos de uso**

\* Usuario consulta sus datos.  
\* Usuario exporta datos.  
\* Usuario solicita cierre de cuenta.  
\* Usuario revierte cierre dentro del período de gracia.  
\* Sistema elimina datos personales al día 30 si no se revierte.  
\* Sistema elimina hogar si el usuario que cierra cuenta era el último miembro.  
\* Coordinador aprueba incorporación de niño al hogar.  
\* Miembro accede a datos protegidos solo si está autenticado y autorizado.

**\#\#\# Casos especiales**

\* Si el hogar sigue existiendo, datos del hogar creados por el usuario pueden permanecer y transferirse al coordinador.  
\* Registros de auditoría permanecen aunque el usuario cierre cuenta.  
\* Datos personales y datos del hogar tienen tratamiento distinto al cierre de cuenta.  
\* El documento menciona que no se guardan tokens, pero el MVP requiere Refresh Token. Esto queda como contradicción/ambigüedad pendiente de definición.

**\#\#\# Edge cases**

\* Último miembro cierra cuenta → eliminación del hogar completo.  
\* Cierre de cuenta solicitado pero revertido dentro de 30 días → no se especifican detalles de restauración.  
\* Invitación aceptada requiere aprobación antes de ingreso, según archivo de comprensión; no se define qué pasa si se rechaza o expira.  
\* Incorporación de niño requiere aprobación explícita del coordinador; no se define proceso alternativo si no hay coordinador padre/madre.

**\#\#\# Datos mockeados**

No se encuentran datos mockeados para Auth u Onboarding.

**\#\#\# Funcionalidades REAL**

\* Cierre de cuenta con período de gracia de 30 días.  
\* Exportación previa al cierre.  
\* Eliminación de datos personales al cierre definitivo.  
\* Eliminación de hogar si el usuario era el último miembro.  
\* RLS por permisos del miembro.  
\* Requisito de autenticación para acceder a documentos protegidos.  
\* Consentimiento explícito durante onboarding para datos sensibles.  
\* Aprobación explícita del coordinador para incorporar niños al hogar.  
\* Roles base para experiencia/permisos: Coordinator, Adult, Adolescent, Child, Senior, Guest.

**\#\#\# Funcionalidades MOCK**

No encontrado.

**\#\#\# Funcionalidades POST\_MVP**

\* Rachas aparecen en los datos mínimos recolectados de niños, pero para esta entrega deben quedar POST\_MVP.  
\* Inventario de datos visible, log de accesos, exportación completa multi-formato y cumplimiento normativo detallado pueden afectar diseño, pero no hay que convertirlos en endpoints MVP de Auth salvo que otra fuente lo defina.

**\#\# 2\. Clasificación para implementación**

**\#\#\# REAL**

\* Usar Cuenta como entidad del usuario y Persona como entidad miembro/persona vinculada a hogares, según archivo de comprensión.  
\* Modelar la pertenencia Persona/Hogar mediante Membresía si se trabaja el ingreso al hogar.  
\* Considerar estados de Membresía encontrados: Pendiente, Activa, Suspendida, Finalizada.  
\* Respetar roles MVP mapeados desde español:  
  \* Coordinador → Coordinator  
  \* Adulto → Adult  
  \* Adolescente → Adolescent  
  \* Niño → Child  
  \* AdultoMayor → Senior  
  \* Invitado → Guest  
\* Aplicar RLS por permisos del miembro a nivel de base de datos.  
\* Exigir autenticación del miembro para acceso a datos protegidos.  
\* No persistir contraseñas, tokens ni claves como datos almacenados en claro o como dato funcional del hogar.  
\* Usar TLS 1.3 para comunicación cliente-servidor.  
\* Usar AES-256 para datos generales en reposo.  
\* Usar AES-256 \+ clave por hogar para datos sensibles.  
\* Implementar consentimiento explícito durante onboarding para datos sensibles si otro documento define el flujo técnico.  
\* Para incorporación de Child/Niño, requerir aprobación explícita del Coordinator/Coordinador.  
\* Cierre de cuenta, si entra al alcance de implementación: solicitud desde Configuración, exportación previa, 30 días de gracia, eliminación al día 30\.

**\#\#\# MOCK**

No se encontró información para simular en Auth u Onboarding.

**\#\#\# POST\_MVP**

\* Rachas/streaks mencionadas para niños.  
\* Exportación completa multi-formato si no está dentro del MVP técnico de Auth.  
\* Inventario de datos visible y log de accesos si se tratan como Settings/Privacidad avanzada.  
\* Cumplimiento normativo detallado como DPO, notificación de brechas y registro formal de bases de datos.

**\#\#\# IGNORAR**

No aplica para este fragment.

**\#\# 3\. Información faltante**

| Tema | Información faltante | Por qué importa | Impacto en implementación |  
|---|---|---|---|  
| Register | No aparece flujo, entidad, API, request, response, validaciones ni errores. | Es obligatorio en MVP. | Debe completarse desde otras fuentes. |  
| Login | No aparece flujo, API, credenciales, validación, response ni errores. | Es obligatorio en MVP. | Debe completarse desde otras fuentes. |  
| Refresh Token | No aparece flujo ni entidad RefreshToken. Además el documento dice que tokens no se almacenan. | Es obligatorio en MVP y puede chocar con la política de no almacenar tokens. | Requiere definición externa; no inventar solución. |  
| Logout | No aparece flujo, invalidación de sesión/token ni endpoint. | Es obligatorio en MVP. | Debe completarse desde otras fuentes. |  
| Crear hogar durante registro | No aparece flujo. Solo se define Hogar como unidad organizativa y aislamiento de datos. | Es obligatorio en MVP. | Debe completarse desde otras fuentes. |  
| Invitar miembros durante onboarding | No aparece como onboarding. Solo existe flujo conceptual de invitación en archivo de comprensión. | Es obligatorio en MVP. | Debe completarse desde otras fuentes. |  
| Aceptar invitación | Solo aparece como paso conceptual “Aceptación”. | Falta contrato y estados. | Implementación pendiente de otras fuentes. |  
| Onboarding por rol | No se definen pasos/pantallas por rol. Solo descripciones de roles y reglas para niños. | Es obligatorio en MVP. | Debe completarse desde otras fuentes. |  
| Estados de invitación | No se definen estados técnicos como pending/accepted/expired/revoked. | Necesario para invitaciones. | No se puede implementar desde este documento. |  
| Estados de cuenta | No se define enum de cuenta. | Necesario para login/cierre/suspensión. | Requiere otra fuente. |  
| Estados de sesión | No se definen. | Necesario para auth real. | Requiere otra fuente. |  
| Campos de credenciales | No hay email, password, password hash, provider, verification, recovery. | Necesarios para Register/Login. | Requiere otra fuente. |  
| Seguridad de tokens | “Tokens no se almacenan” es ambiguo frente a Refresh Token. | Puede cambiar arquitectura. | Resolver en etapa de merge con otra fuente. |  
| APIs | No hay rutas, métodos, request, response ni errores. | Necesario para backend. | No generar endpoints desde este documento. |  
| UI Auth | No hay Login/Register/Logout ni pantallas de invitación. | Necesario para frontend. | No generar UI desde este documento. |  
| Permisos por rol | Hay descripciones generales, no matriz completa. | Necesario para autorización. | Usar solo como contexto parcial. |  
| Consentimientos | No se define almacenamiento técnico, auditoría de consentimiento ni revocación genérica. | Necesario para onboarding. | Debe completarse desde otras fuentes. |  
| Cierre de cuenta | Hay flujo temporal, pero no API, jobs, estados ni recuperación. | Si se implementa, requiere precisión técnica. | Queda parcial. |

**\#\# 4\. Fuente**

\* Archivo principal: \`HomePlus — SECCION 8 DATA PHILOSOPHY.md\`  
  \* Sección 8.1.1 — Ownership — Los datos son del usuario, HomePlus administra  
  \* Sección 8.1.3 — Minimización — Solo se guarda lo necesario para coordinar  
  \* Sección 8.1.4 — Transparencia — El usuario sabe qué se guarda y por qué  
  \* Sección 8.1.5 — Trazabilidad — Las acciones importantes dejan huella  
  \* Sección 8.4.3 — Opt-in vs Opt-out  
  \* Sección 8.5 — Seguridad  
  \* Sección 8.5.1 — Cifrado en Tránsito y en Reposo  
  \* Sección 8.5.2 — Cifrado Especial de Documentos  
  \* Sección 8.5.3 — Row Level Security (RLS)  
  \* Sección 8.6.3 — Mecanismo de Exportación  
  \* Sección 8.6.4 — Qué Pasa al Cerrar la Cuenta  
  \* Sección 8.7.1 — Ley 25.326 — Argentina  
  \* Sección 8.7.2 — COPPA  
  \* Sección 8.7.3 — GDPR  
\* Archivo de comprensión asociado: \`Seccion 8 Filosofia de la Informacion.txt\`  
  \* OUTPUT 1 — ENTITIES  
  \* OUTPUT 2 — RELATIONSHIPS  
  \* Reglas detectadas sobre cierre de cuenta, RLS, roles, invitación y membresía  
\* Source map usado: \`source\_map\_SECCION\_8\_DATA\_PHILOSOPHY.md\`  
  \* 4.1 AUTH  
  \* 4.2 ONBOARDING

**\# AUTH \+ ONBOARDING fragment — HomePlus — Design System V1**

**\#\# 1\. Información encontrada**

**\#\#\# Objetivo del módulo**

El documento no define un objetivo funcional de AUTH. Solo aporta reglas visuales y de interacción reutilizables para pantallas de autenticación, registro y onboarding si esas pantallas existen en otros documentos.

Para ONBOARDING, el archivo de comprensión sí registra una intención UX explícita: flujo de ingreso adaptado por rol, sin tutoriales ni tooltips, con objetivo de llegar al primer valor visible en 60 segundos.

**\#\#\# Entidades**

**\#\#\#\# Cuenta**

\* Aparece como entidad arquitectónica.  
\* Pertenece al usuario, no al hogar.  
\* Incluye perfil, preferencias e idioma.  
\* No se define como entidad de autenticación técnica.  
\* No se definen credenciales, password, email, sesión, token ni refresh token.

**\#\#\#\# Onboarding**

\* Aparece como feature UX.  
\* Se describe como flujo de ingreso adaptado por rol.  
\* Se asocia a configuración inicial de preferencias de usuario.  
\* No se define modelo de datos propio.

**\#\#\#\# Roles encontrados para el alcance MVP**

El archivo de comprensión registra roles en español. Para este fragment se conservan únicamente los roles dentro del alcance MVP:

| Rol en documento | Rol MVP equivalente | Información explícita encontrada |  
| \---------------- | \------------------- | \-------------------------------- |  
| Coordinador | Coordinator | Responsable administrativo principal del hogar. Visión completa y gestión de miembros. |  
| Adulto | Adult | Miembro operativo con amplios permisos. Puede invitar. |  
| Adolescente | Adolescent | Autonomía progresiva. Permisos ampliables. |  
| Niño | Child | Experiencia simplificada. Rachas visuales sin presión. |  
| Adulto Mayor | Senior | Experiencia adaptada: fuente grande, alto contraste, sin gestos complejos, medicación priorizada. |  
| Invitado | Guest | Acceso mínimo y participación limitada. |

**\#\#\# Campos**

**\#\#\#\# Campos específicos de AUTH**

No se encontraron campos explícitos para:

\* Register.  
\* Login.  
\* Refresh Token.  
\* Logout.  
\* Session.  
\* Token.  
\* RefreshToken.  
\* Password.  
\* Email.  
\* Errores de credenciales.

**\#\#\#\# Campos o datos mencionados para ONBOARDING**

El archivo de comprensión registra el flujo \`Onboarding por rol\` con los siguientes datos de preferencias de usuario:

\* nombre.  
\* rol.  
\* horario.  
\* medicación.  
\* contacto emergencia.

No se indican tipos, obligatoriedad, validaciones, valores por defecto ni estructura persistente.

**\#\#\#\# Campos UI reutilizables para formularios**

El documento define reglas generales de inputs aplicables a formularios:

\* Todos los inputs tienen label arriba.  
\* El placeholder complementa al label, no lo reemplaza.  
\* \`accessibilityLabel\` es obligatorio en todo input.  
\* Estados visuales de input:  
  \* default.  
  \* focus.  
  \* filled.  
  \* error.  
  \* disabled.

**\#\#\# Tipos**

No se encuentran tipos de datos para entidades AUTH u ONBOARDING.

Tipos visuales o de diseño encontrados:

\* \`ThemeMode \= 'normal' | 'senior'\`.  
\* \`ColorScheme \= 'light' | 'dark'\`.

Estos tipos pertenecen al Design System, no al dominio funcional de AUTH.

**\#\#\# Valores por defecto**

No se encontraron valores por defecto de AUTH u ONBOARDING.

Valores visuales reutilizables:

\* Skeleton aparece cuando los datos tardan más de 300 ms en cargar.  
\* Toast dura 4 segundos por defecto.  
\* Toast en modo Adulto Mayor dura 8 segundos.  
\* Loading de botón debe mantenerse al menos 400 ms para evitar flicker.

**\#\#\# Restricciones**

**\#\#\#\# Formularios**

\* Los inputs no deben usar placeholder como reemplazo del label.  
\* Todo input debe tener \`accessibilityLabel\`.  
\* Los modales centrados nunca deben usarse para formularios.  
\* Los modales centrados nunca deben usarse para navegación entre niveles.  
\* El modal centrado se reserva para confirmaciones con consecuencia.  
\* El Bottom Sheet es la opción principal mobile para crear/editar o alojar formularios simples/complejos, pero el documento no lo vincula explícitamente a Login/Register.

**\#\#\#\# Feedback e interacción**

\* Toda acción del usuario recibe feedback visual en menos de 100 ms.  
\* Spinner solo si la operación tarda más de 300 ms.  
\* El botón en loading mantiene su ancho y reemplaza el texto por spinner.  
\* El botón en loading permanece visualmente en estado active.  
\* Todo tap en botón recibe feedback háptico.  
\* En modo Adulto Mayor el háptico de botón es más perceptible.  
\* Toast se muestra arriba, nunca abajo.  
\* Solo puede haber un toast visible a la vez.

**\#\#\#\# Onboarding**

\* No usar tooltips.  
\* No usar carruseles de features.  
\* No usar videos de onboarding.  
\* Empty State funciona como tutorial implícito.  
\* El onboarding debe apuntar a primer valor visible en 60 segundos.

**\#\#\#\# Modo Adulto Mayor**

\* Todo componente acepta \`mode: 'normal' | 'senior'\`.  
\* El ThemeProvider inyecta el modo globalmente.  
\* En modo senior se incrementan tamaños, contraste y touch targets.  
\* El modo senior evita gestos complejos.

**\#\#\# Relaciones**

\* Onboarding por rol → Cuenta: el archivo de comprensión indica que las preferencias de usuario capturadas durante onboarding tienen destino \`Cuenta\`.  
\* Cuenta → usuario: la Cuenta pertenece al usuario, no al hogar.  
\* ThemeProvider → modo senior: el ThemeProvider soporta la adaptación visual por modo.

No se encontró relación explícita entre:

\* Register → Cuenta.  
\* Login → Session.  
\* Refresh Token → Token.  
\* Register → crear hogar.  
\* Onboarding → crear hogar.  
\* Onboarding → invitar miembros.

**\#\#\# Cardinalidad**

No se encontró cardinalidad implementable para AUTH u ONBOARDING.

**\#\#\# Estados posibles**

**\#\#\#\# Estados AUTH**

No se encontraron estados de sesión, token, registro, login, logout o refresh token.

**\#\#\#\# Estados UI de Button**

\* default.  
\* hover.  
\* active/pressed.  
\* disabled.  
\* loading.

**\#\#\#\# Estados UI de Input**

\* default.  
\* focus.  
\* filled.  
\* error.  
\* disabled.

**\#\#\#\# Estados UI de Toast**

\* success.  
\* alert.  
\* error.  
\* info.

**\#\#\# Reglas de negocio**

**\#\#\#\# AUTH**

No se encontraron reglas de negocio funcionales para AUTH.

**\#\#\#\# ONBOARDING**

\* Onboarding sin tutoriales ni tooltips.  
\* Empty states como guía.  
\* 60 segundos hasta primer valor visible.  
\* Adaptación por rol como jerarquía distinta de información, no solo filtro visual.

**\#\#\# Permisos**

No se encontraron permisos específicos de AUTH.

Permisos/alcances de roles encontrados en el archivo de comprensión y útiles para onboarding por rol:

\* Coordinator/Coordinador: gestión de miembros y visión completa.  
\* Adult/Adulto: puede invitar.  
\* Adolescent/Adolescente: autonomía progresiva; permisos ampliables.  
\* Child/Niño: experiencia simplificada.  
\* Senior/Adulto Mayor: experiencia adaptada, medicación priorizada.  
\* Guest/Invitado: acceso mínimo y participación limitada.

No se define matriz de permisos completa.

**\#\#\# Flujos**

**\#\#\#\# Register**

No encontrado.

**\#\#\#\# Login**

No encontrado.

**\#\#\#\# Refresh Token**

No encontrado.

**\#\#\#\# Logout**

No encontrado.

**\#\#\#\# Crear hogar durante registro**

No encontrado.

**\#\#\#\# Invitar miembros durante onboarding**

No encontrado como flujo de onboarding. Solo se registra que el rol Adulto puede invitar y que Coordinador gestiona miembros, sin pasos ni contrato.

**\#\#\#\# Onboarding por rol**

Información encontrada:

1\. Captura o configuración de preferencias de usuario.  
2\. Datos mencionados: nombre, rol, horario, medicación, contacto emergencia.  
3\. Destino: Cuenta.  
4\. Propósito: configurar experiencia inicial adaptada al rol.  
5\. Restricción UX: sin tutoriales ni tooltips.  
6\. Restricción UX: empty states como guía.  
7\. Objetivo UX: 60 segundos hasta primer valor visible.

No se definen pantallas, pasos, validaciones, persistencia ni endpoints.

**\#\#\# APIs**

No se encontraron endpoints.

No se encontraron contratos para:

\* request.  
\* response.  
\* errores.  
\* status codes.  
\* cookies.  
\* headers.  
\* refresh token.  
\* logout.

**\#\#\# Request**

No encontrado.

**\#\#\# Response**

No encontrado.

**\#\#\# UI**

**\#\#\#\# Componentes aplicables a AUTH/ONBOARDING**

\* Button.  
\* Input Field.  
\* Toast / Snackbar.  
\* Skeleton / Loading.  
\* Empty State.  
\* Bottom Sheet.  
\* Modal de confirmación, solo para consecuencias o cierre de formulario con cambios sin guardar.

**\#\#\#\# Button**

Variantes visuales:

\* primary.  
\* secondary.  
\* tertiary.  
\* danger.  
\* ghost.

Tamaños estándar:

\* sm: altura 36 px, touch target 44 px.  
\* md: altura 44 px, touch target 44 px.  
\* lg: altura 52 px, touch target 52 px.

Tamaños Adulto Mayor:

\* sm: altura 44 px, touch target 56 px.  
\* md: altura 56 px, touch target 56 px.  
\* lg: altura 64 px, touch target 64 px.

Reglas:

\* En loading mantiene ancho.  
\* Texto se reemplaza por spinner.  
\* Loading mínimo de 400 ms.  
\* Spinner aparece solo si la operación supera 300 ms.  
\* Feedback háptico en tap.

**\#\#\#\# Input Field**

Estados visuales:

\* default: borde \`divider-strong\`, fondo \`surface-card\`.  
\* focus: borde primario, ring primario suave.  
\* filled: borde \`divider-strong\`, fondo primario sutil.  
\* error: borde error, ring error, texto de error debajo.  
\* disabled: borde divider, fondo secundario, texto disabled, opacidad 0.6.

Tamaños:

\* sm: 36 px.  
\* md: 44 px.  
\* lg: 52 px.

Reglas:

\* label arriba obligatorio.  
\* placeholder no reemplaza label.  
\* \`accessibilityLabel\` obligatorio.

**\#\#\#\# Toast / Snackbar**

\* Notificación no intrusiva.  
\* Posición top.  
\* Duración default: 4 s.  
\* Duración Adulto Mayor: 8 s.  
\* Variantes: success, alert, error, info.  
\* Máximo un toast visible a la vez.

**\#\#\#\# Skeleton / Loading**

\* Aparece cuando los datos tardan más de 300 ms.  
\* Usa animación pulse.  
\* Transición a contenido mediante fade-in.

**\#\#\#\# Empty State**

\* Primera experiencia por dominio.  
\* Funciona como tutorial implícito.  
\* Estructura visual:  
  \* ilustración sutil.  
  \* título.  
  \* descripción.  
  \* acción sugerida.  
\* No se usan tooltips ni carruseles de features.

**\#\#\#\# Bottom Sheet**

\* Opción principal mobile para crear/editar.  
\* Mantiene contexto.  
\* Alturas disponibles: 25%, 50%, 75%, 90%.  
\* Footer fijo con acción secundaria y acción primaria.  
\* Puede alojar formularios simples o complejos.

**\#\#\#\# Modal de confirmación**

\* Solo para confirmaciones con consecuencia.  
\* Estructura:  
  \* ícono contextual.  
  \* título.  
  \* descripción opcional.  
  \* cancelar.  
  \* confirmar.  
\* Usos explícitos:  
  \* eliminación.  
  \* expulsión.  
  \* cambios de rol.  
  \* cierre de formulario con cambios sin guardar.  
\* Nunca para formularios.  
\* Nunca para navegación entre niveles.

**\#\#\# Componentes UI**

Componentes core relevantes para este fragment:

\* \`Button\`.  
\* \`Input\`.  
\* \`Toast\`.  
\* \`Skeleton\`.  
\* \`EmptyState\`.  
\* \`BottomSheet\`.  
\* \`Modal\`.  
\* \`ThemeProvider\`.

**\#\#\# Navegación**

No se encontró navegación específica para Login, Register u Onboarding.

El documento sí define navegación global de la app, pero no aporta rutas de AUTH. No se extraen rutas para este fragment.

**\#\#\# Eventos del sistema**

No se encontraron eventos técnicos de AUTH.

No se encontraron nombres como:

\* \`auth.registered\`.  
\* \`auth.logged\_in\`.  
\* \`auth.logged\_out\`.  
\* \`auth.token\_refreshed\`.

El flujo \`Onboarding por rol\` aparece como flujo de datos conceptual, sin nombre de evento técnico.

**\#\#\# Dependencias**

Dependencias técnicas del Design System aplicables a interfaces AUTH/ONBOARDING:

\* React Native / Expo.  
\* ThemeProvider.  
\* Tokens centralizados.  
\* Fuentes Fraunces, Inter y JetBrains Mono.  
\* Soporte light/dark.  
\* Soporte normal/senior.  
\* Respeto de \`prefers-reduced-motion\`.

**\#\#\# Restricciones arquitectónicas**

No se encontraron restricciones arquitectónicas propias de AUTH como:

\* RLS.  
\* separación por household en auth.  
\* soft delete de sesiones.  
\* atomicidad de registro.  
\* single-use tokens.  
\* refresh token rotation.

Restricciones transversales aplicables a UI:

\* Mobile-first absoluto.  
\* Toda pantalla se diseña primero en 375×812 px.  
\* Todo componente acepta modo normal/senior.  
\* El modo senior debe ser estructural, no solo zoom.  
\* Los componentes interactivos deben cumplir touch target mínimo.  
\* \`accessibilityLabel\` en inputs y componentes interactivos.

**\#\#\# Casos de uso**

**\#\#\#\# Encontrados**

\* Configurar experiencia inicial adaptada al rol durante onboarding.  
\* Capturar preferencias de usuario para Cuenta durante onboarding.  
\* Guiar al usuario con empty states en lugar de tutoriales explícitos.

**\#\#\#\# No encontrados**

\* Registro de usuario.  
\* Inicio de sesión.  
\* Renovación de token.  
\* Cierre de sesión.  
\* Creación de hogar durante registro.  
\* Invitación de miembros durante onboarding.

**\#\#\# Casos especiales**

\* Modo Adulto Mayor requiere mayor contraste, mayor tamaño y touch targets más grandes.  
\* Si el sistema solicita reducción de movimiento, las animaciones se eliminan o reducen.  
\* Los formularios no deben usar modales centrados.  
\* El cierre de formulario con cambios sin guardar puede usar modal de confirmación.

**\#\#\# Edge cases**

\* Spinner aparece solo si la operación supera 300 ms.  
\* Loading visual mínimo de botón: 400 ms para evitar flicker.  
\* Skeleton aparece si la carga inicial o refresh supera 300 ms.  
\* Solo puede existir un toast visible a la vez; si llega otro, reemplaza al actual.  
\* Placeholder no reemplaza label.  
\* \`accessibilityLabel\` obligatorio en inputs.

**\#\#\# Datos mockeados**

No se encontraron datos mockeados para AUTH u ONBOARDING.

**\#\#\# Funcionalidades REAL**

\* Patrones UI para formularios de AUTH/ONBOARDING.  
\* Estados visuales de Button e Input.  
\* Feedback de loading, skeleton y toast.  
\* Reglas de accesibilidad.  
\* Onboarding sin tutoriales/tooltips/carruseles.  
\* EmptyState como guía implícita.  
\* Adaptación por rol como criterio UX.  
\* Captura conceptual de preferencias de usuario durante onboarding.

**\#\#\# Funcionalidades MOCK**

No se encontraron funcionalidades MOCK para AUTH u ONBOARDING.

**\#\#\# Funcionalidades POST\_MVP**

No se encontró información POST\_MVP explícita para AUTH u ONBOARDING dentro del alcance permitido de este fragment.

**\---**

**\#\# 2\. Clasificación para implementación**

**\#\#\# REAL**

**\#\#\#\# AUTH**

Implementable desde este documento únicamente como UI transversal mínima:

\* Usar \`Button\` para acciones principales/secundarias de pantallas de autenticación si esas pantallas existen en otro documento.  
\* Usar \`Input\` con label visible y \`accessibilityLabel\` obligatorio.  
\* Usar estados visuales de error en input para validaciones visuales.  
\* Usar loading en botones con spinner si la operación supera 300 ms.  
\* Mantener loading mínimo 400 ms para evitar flicker.  
\* Usar Toast superior para feedback no intrusivo.  
\* Usar Skeleton si la carga supera 300 ms.  
\* No usar modal centrado para formularios.  
\* Usar modal centrado solo para consecuencias o cierre de formulario con cambios sin guardar.  
\* Soportar modos \`normal\` y \`senior\` desde ThemeProvider.

No implementable desde este documento:

\* Register funcional.  
\* Login funcional.  
\* Refresh Token.  
\* Logout.  
\* Sesiones.  
\* Tokens.  
\* Endpoints.

**\#\#\#\# ONBOARDING**

Implementable desde este documento como reglas UX mínimas:

\* Onboarding adaptado por rol.  
\* Captura conceptual de preferencias: nombre, rol, horario, medicación y contacto emergencia.  
\* Destino conceptual de preferencias: Cuenta.  
\* No usar tooltips.  
\* No usar carruseles de features.  
\* No usar videos de onboarding.  
\* Usar empty states como guía implícita.  
\* Diseñar para llegar a primer valor visible en 60 segundos.  
\* Adaptación por rol como jerarquía distinta de información, no solo filtro visual.  
\* Soportar variante Senior con tamaños, contraste y touch targets mayores.

**\#\#\# MOCK**

No se encontró información MOCK para AUTH u ONBOARDING en este documento.

**\#\#\# POST\_MVP**

No se encontró información POST\_MVP explícita para AUTH u ONBOARDING dentro del alcance permitido.

**\#\#\# IGNORAR**

No se incluye contenido fuera del alcance de este fragment.

**\---**

**\#\# 3\. Información faltante**

| Área | Información faltante | Por qué importa | Impacto en implementación |  
| \---- | \-------------------- | \--------------- | \------------------------- |  
| Register | No hay flujo, campos, validaciones, request, response ni errores. | Register es obligatorio para MVP. | Debe definirse en otra fuente. |  
| Login | No hay flujo, campos, validaciones, request, response ni errores. | Login es obligatorio para MVP. | Debe definirse en otra fuente. |  
| Refresh Token | No hay entidad, token, expiración, rotación, endpoint ni errores. | Refresh Token es obligatorio para MVP. | Debe definirse en otra fuente. |  
| Logout | No hay flujo, endpoint, invalidación de sesión ni respuesta. | Logout es obligatorio para MVP. | Debe definirse en otra fuente. |  
| Crear hogar durante registro | No hay pasos, relación Register → Hogar ni contrato. | Es parte obligatoria del MVP. | Debe definirse en otra fuente. |  
| Invitar miembros durante onboarding | No hay flujo, token, invitación, aceptación ni permisos detallados. | Es parte obligatoria del MVP. | Debe definirse en otra fuente. |  
| Onboarding por rol | Solo hay reglas UX y preferencias conceptuales; no hay pantallas ni pasos. | Se requiere para implementar onboarding real. | Fragment parcial/mínimo. |  
| Cuenta | Se menciona como entidad de usuario, pero sin modelo técnico. | Puede confundirse con Account/Auth User. | Requiere validación en merge posterior. |  
| Roles | Hay descripciones generales, no matriz completa de permisos. | Los permisos afectan onboarding, invitaciones y acceso. | No asumir permisos adicionales. |  
| Campos de onboarding | Se mencionan datos sin tipo ni obligatoriedad. | Se necesitan esquemas y validaciones. | No inferir tipos. |  
| APIs | No hay endpoints ni contratos. | Backend no puede implementarse desde este documento. | Debe completarse con otra fuente. |  
| Eventos del sistema | No hay eventos \`auth.\*\` ni onboarding técnico. | Útil para auditoría, notificaciones o tracking. | No inventar eventos. |  
| Estados | No hay estados de sesión, registro, token u onboarding. | Necesarios para UI/logic. | Solo usar estados visuales del Design System. |  
| Errores | No hay errores de credenciales, duplicado, token expirado ni sesión inválida. | Necesarios para UX/API. | Debe definirse en otra fuente. |  
| Seguridad | No hay RLS, single-use tokens, refresh rotation ni privacidad auth. | Crítico para implementación. | No implementar desde este fragment. |

**\#\#\# Contradicciones detectadas**

No se detectan contradicciones internas específicas de AUTH u ONBOARDING. El riesgo principal es insuficiencia: el documento es un Design System y no una especificación funcional de autenticación.

**\#\#\# Dudas y dependencias no definidas**

\* No queda definido si \`Cuenta\` corresponde a \`Account\`, \`User\` o perfil de usuario.  
\* No queda definido cómo se persisten las preferencias de onboarding.  
\* No queda definido qué rol puede invitar durante onboarding.  
\* No queda definido si la selección de rol ocurre durante Register, después de Register o al aceptar invitación.  
\* No queda definido si el hogar se crea antes, durante o después del registro.  
\* No queda definido si Adulto Mayor/Senior modifica solo la UI o también los pasos del onboarding.

**\---**

**\#\# 4\. Fuente**

\* Archivo: \`HomePlus — Desing system v1(1).md\`  
  \* Sección: \`4.1 Botones\`  
  \* Sección: \`4.4 Input Fields\`  
  \* Sección: \`4.11 Modal y Bottom Sheet\`  
  \* Sección: \`4.13 Toast / Snackbar\`  
  \* Sección: \`4.15 Empty State\`  
  \* Sección: \`4.16 Skeleton / Loading\`  
  \* Sección: \`6.6 Lo que NUNCA aparece en HomePlus\`  
  \* Sección: \`7. IMPLEMENTACIÓN RECOMENDADA\`  
  \* Sección: \`8. LISTA DE VERIFICACIÓN DE IMPLEMENTACIÓN\`

\* Archivo: \`Design system v1(1).txt\`  
  \* Sección: \`OUTPUT 1 — ENTITIES\`  
  \* Sección: \`OUTPUT 2 — RELATIONSHIPS\`  
  \* Sección: \`OUTPUT 4 — DATA FLOWS\`  
  \* Sección: \`OUTPUT 5 — BUSINESS RULES\`  
  \* Sección: \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`

\* Archivo: \`source\_map\_HomePlus\_Design\_System\_V2.md\`  
  \* Sección: \`4.1 AUTH\`  
  \* Sección: \`4.2 ONBOARDING\`  
  \* Sección: \`5. Mapa de entidades\`  
  \* Sección: \`7. Mapa de estados\`  
  \* Sección: \`8. Mapa de permisos\`  
  \* Sección: \`9. Mapa de flujos\`  
  \* Sección: \`10. Mapa de APIs\`  
  \* Sección: \`11. Mapa de UI\`  
  \* Sección: \`18. Información faltante\`  
  \* Sección: \`19. Recomendación de fragments a generar\`

**\# AUTH fragment — HomePlus — Diseño de onboarding completo v1.md**

**\#\# 1\. Información encontrada**

**\#\#\# Objetivo del módulo**

Este documento define el flujo de entrada a HomePlus desde la pantalla de bienvenida hasta el acceso al Home post-onboarding. Para AUTH \+ ONBOARDING cubre:

\* Registro con email y contraseña.  
\* Login con email y contraseña.  
\* Login social como alternativa.  
\* Recuperación de contraseña.  
\* Selección de rol.  
\* Creación de hogar durante el registro del rol Coordinator.  
\* Personalización inicial de perfil.  
\* Invitación inicial de miembros.  
\* Aceptación de invitación para roles que entran a un hogar existente.  
\* Variantes de onboarding por rol.

No define contratos backend ni endpoints formales.

**\---**

**\#\#\# Entidades**

**\#\#\#\# Cuenta / Account**

Información encontrada:

\* La cuenta se crea desde el flujo “Crear cuenta”.  
\* El documento captura credenciales y nombre inicial durante registro.  
\* El archivo de comprensión describe \`Cuenta\` como perteneciente al usuario, no al hogar, con perfil, preferencias, idioma y configuración.  
\* La cuenta puede quedar creada aunque el onboarding no esté terminado; en ese caso se retoma donde quedó.

Campos encontrados asociados a cuenta/onboarding:

\* \`email\`  
\* \`password\`  
\* \`nombre\`  
\* \`nombre\_completo\`  
\* \`foto\_perfil\` opcional  
\* \`tratamiento\` / preferencia de tono  
\* \`preferencia\_notificaciones\`  
\* modo visual \`normal\` / \`senior\`, como modo de experiencia indicado por el documento

**\#\#\#\# Persona / Person**

Información encontrada:

\* El documento captura nombre inicial y luego nombre completo/foto dentro del onboarding.  
\* El archivo de comprensión describe \`Persona\` con nombre, apellido, foto, fecha de nacimiento, género y contacto.  
\* El documento principal no define todos esos campos como parte del registro; solo los referencia o los captura parcialmente en pantallas de onboarding.

Campos explícitos en el documento principal:

\* \`nombre\`  
\* \`nombre\_completo\`  
\* \`foto\_perfil\` opcional  
\* avatar/color en algunos flujos por rol  
\* tratamiento o forma de trato

**\#\#\#\# Hogar / Household**

Información encontrada:

\* El rol Coordinator crea un hogar durante onboarding.  
\* La creación del hogar tiene 3 pasos:  
  \* tipo de hogar  
  \* nombre y foto opcional  
  \* disponibilidad horaria  
\* El archivo de comprensión describe \`Hogar\` como unidad organizativa principal.

Campos encontrados:

\* \`tipo\_hogar\`  
\* \`nombre\_hogar\`  
\* \`foto\_hogar\` opcional  
\* \`disponibilidad\_horaria\`  
\* \`horario\_preferido\_aviso\`

Valores encontrados para \`tipo\_hogar\`:

\* Familia con hijos  
\* Familia extendida  
\* Pareja  
\* Convivientes

Valores encontrados para disponibilidad:

\* 1 a 2 horas por día  
\* 3 a 4 horas por día  
\* 5 horas o más

Valores encontrados para horario preferido:

\* Mañana  
\* Media mañana  
\* Tarde  
\* Noche

**\#\#\#\# Membership / Membresía**

Información encontrada:

\* Los roles que llegan por invitación aceptan el ingreso a un hogar existente.  
\* El archivo de comprensión describe \`Membership\` como relación Persona ↔ Hogar.  
\* El documento principal muestra invitaciones pendientes y aceptación de invitación como parte del ingreso.

Estados encontrados en archivo de comprensión:

\* Pendiente  
\* Activa  
\* Suspendida  
\* Finalizada

El documento principal no define un contrato técnico para crear o activar la membresía.

**\#\#\#\# Invitation / Invitación**

Información encontrada:

\* El Coordinator puede invitar miembros durante onboarding.  
\* La invitación inicial es opcional y postergable.  
\* La invitación puede enviarse con nombre del miembro y email o teléfono.  
\* Existe una opción de compartir link.  
\* El link es único del hogar y válido por 7 días.  
\* El link se comparte con share sheet nativo.  
\* El toast posterior al copiado informa que vence en 7 días.

Campos encontrados:

\* \`nombre\_miembro\`  
\* \`email\_o\_telefono\`  
\* \`link\_invitacion\`  
\* \`fecha\_expiracion\` implícita por validez de 7 días  
\* \`hogar\_destino\`, implícito en el contenido del link

**\#\#\#\# Role / Rol**

Roles MVP encontrados o mapeables desde el documento:

| Nombre en documento | Nombre MVP |  
|---|---|  
| Coordinador/a | Coordinator |  
| Adulto | Adult |  
| Adolescente | Adolescent |  
| Niño/a | Child |  
| Adulto Mayor | Senior |  
| Invitado | Guest |

Información encontrada:

\* Coordinator se selecciona en onboarding inicial y crea hogar.  
\* Adult, Adolescent, Child y Senior aparecen en la selección de rol o en flujos por rol.  
\* Guest no aparece como opción en selección inicial; llega por invitación.  
\* La pantalla de selección de rol solo muestra Coordinator, Adult, Adolescent, Child y Senior.

**\#\#\#\# AuthService**

Información encontrada en archivo de comprensión:

\* Email/password.  
\* Google OAuth.  
\* Apple OAuth.

El documento principal presenta Google/Apple como botones de login social, pero no define implementación backend ni contrato API.

**\#\#\#\# Session / Token / RefreshToken**

Información encontrada:

\* El documento menciona “Token expirado” con el mensaje: “El link ya no es válido. Pedí uno nuevo.”  
\* Esa mención está asociada a links, no a refresh token.  
\* No se encuentra entidad \`Session\`.  
\* No se encuentra entidad \`RefreshToken\`.  
\* No se encuentra flujo de refresh token.

**\---**

**\#\#\# Campos y validaciones**

**\#\#\#\# Registro — Paso 1: credenciales**

Campos:

\* Email  
\* Contraseña

Validaciones:

| Campo | Regla | Mensaje |  
|---|---|---|  
| Email | formato válido tipo \`x@y.z\` | “Ese email no es válido. ¿Lo revisás?” |  
| Email | no vacío | botón deshabilitado |  
| Password | mínimo 8 caracteres | “Mínimo 8 caracteres.” |  
| Password | no vacío | botón deshabilitado |

Estados UI encontrados:

| Estado | Comportamiento |  
|---|---|  
| Default | inputs vacíos; botón Continuar deshabilitado |  
| Válido | email válido \+ contraseña ≥ 8; botón habilitado |  
| Error email | borde de error y texto debajo |  
| Error pass | validación on-blur, no on-type |  
| Loading | spinner en botón y overlay anti doble tap |  
| Error red | toast superior |  
| Email ya registrado | toast con acción para ir a Login |  
| Login social | flujo nativo del sistema operativo, overlay con spinner |

**\#\#\#\# Registro — Paso 2: nombre**

Campo:

\* Nombre

Validaciones:

| Campo | Regla | Mensaje |  
|---|---|---|  
| Nombre | no vacío | botón deshabilitado |  
| Nombre | máximo 40 caracteres | “Un poco más corto, por favor.” |  
| Nombre | solo letras, espacios y acentos | “Solo letras y espacios.” |

Estados UI encontrados:

| Estado | Comportamiento |  
|---|---|  
| Default | input vacío; botón deshabilitado |  
| Nombre ingresado | botón habilitado |  
| Loading | spinner en botón |  
| Error | toast de error genérico |  
| Éxito | transición directa a selección de rol |

**\#\#\#\# Login**

Campos encontrados:

\* Email  
\* Password

Información encontrada:

\* Login aparece como una pantalla de una sola etapa.  
\* Desde bienvenida se accede mediante “Ya tengo cuenta” / “Entrar”.  
\* El flujo muestra email \+ password.  
\* Incluye recuperación de contraseña.  
\* En caso de éxito lleva a Home para usuario existente.

Validaciones específicas de login:

\* No se definen validaciones propias para login más allá de email/password como campos de entrada.

**\#\#\#\# Recuperación de contraseña**

Flujo encontrado:

1\. Pantalla de email.  
2\. Mensaje: “Te enviamos un link”.  
3\. Email con link.  
4\. Nueva contraseña.  
5\. OK.

Edge case encontrado:

\* Token/link expirado: “El link ya no es válido. Pedí uno nuevo.”

No se define endpoint, expiración exacta del link de recuperación ni estructura del token.

**\#\#\#\# Creación de hogar**

Campos:

| Paso | Campo | Reglas / comportamiento |  
|---|---|---|  
| Tipo de hogar | tipo seleccionado | cards seleccionables |  
| Nombre y foto | nombre del hogar | no vacío; máximo 30 caracteres |  
| Nombre y foto | foto del hogar | opcional |  
| Disponibilidad horaria | disponibilidad | cards de 1-2h, 3-4h, 5h+ |  
| Disponibilidad horaria | horario preferido | selector/bottom sheet con franjas |

Reglas de acceso por tipo de hogar encontradas:

| Tipo | Comportamiento documentado |  
|---|---|  
| Familia con hijos | visibilidad total sobre niños; moderada sobre adolescentes |  
| Familia extendida | visibilidad segmentada por núcleo |  
| Pareja | visibilidad equitativa; ambos pueden ser co-coordinadores |  
| Convivientes | máxima privacidad individual; solo tareas/gastos comunes visibles |

El documento no define cómo estas reglas se transforman en permisos técnicos.

**\#\#\#\# Invitación a miembros durante onboarding**

Campos:

\* Nombre del miembro  
\* Email o teléfono

Acciones:

\* Enviar invitación  
\* Compartir link  
\* Después lo hago

Flujo de link:

1\. Tap en “Compartir link”.  
2\. Se genera link único del hogar válido por 7 días.  
3\. Se abre share sheet nativo con opciones como WhatsApp, mensajes, mail o copiar link.  
4\. El link incluye un texto de invitación con persona invitante y hogar.  
5\. Toast: “Link copiado. Vence en 7 días.”

Regla de negocio:

\* La invitación inicial es postergable.  
\* Coordinator debe poder usar HomePlus solo desde el minuto 1 sin obligarlo a invitar a alguien.

**\---**

**\#\#\# Flujos**

**\#\#\#\# Register**

Flujo encontrado:

1\. Splash.  
2\. Bienvenida.  
3\. Crear cuenta paso 1: email \+ password o social login.  
4\. Crear cuenta paso 2: nombre.  
5\. Selección de rol.  
6\. Continuación según rol.

Para Coordinator:

1\. Selección de rol Coordinator.  
2\. Creación del hogar en 3 pasos.  
3\. Personalización de perfil.  
4\. Primer valor visible.  
5\. Invitación a miembros.  
6\. Home post-onboarding.

Información explícita:

\* El registro tiene 2 pantallas.  
\* El primer paso captura credenciales.  
\* El segundo captura nombre.  
\* Social login Google/Apple aparece como alternativa.  
\* El registro exitoso transiciona a selección de rol.

**\#\#\#\# Login**

Flujo encontrado:

1\. Bienvenida.  
2\. Entrar / Ya tengo cuenta.  
3\. Login con email \+ password.  
4\. Recuperación si corresponde.  
5\. Home para usuario existente.

Información explícita:

\* Login es una pantalla.  
\* Incluye email, password y acceso a recuperación.

**\#\#\#\# Refresh Token**

No encontrado.

Información relacionada pero no equivalente:

\* Se menciona token/link expirado como error de link inválido.  
\* No hay flujo de renovación de sesión.  
\* No hay entidad RefreshToken.  
\* No hay endpoint, request, response ni errores de refresh token.

**\#\#\#\# Logout**

No encontrado.

No hay flujo de cierre de sesión, acción UI, endpoint, invalidación de token ni estado post-logout.

**\#\#\#\# Crear hogar durante registro**

Flujo encontrado para Coordinator:

1\. Tipo de hogar.  
2\. Nombre \+ foto opcional.  
3\. Disponibilidad horaria.  
4\. Personalización de perfil.  
5\. Entrada al hogar.

Información explícita:

\* Solo el rol Coordinator continúa hacia creación de hogar desde la pantalla de selección.  
\* La foto del hogar es opcional.  
\* El nombre del hogar es obligatorio y tiene máximo 30 caracteres.  
\* La disponibilidad se captura en franjas, no como horas exactas.

**\#\#\#\# Invitar miembros durante onboarding**

Flujo encontrado:

1\. Pantalla “¿A quién invitás primero?”.  
2\. Captura nombre del miembro y email/teléfono.  
3\. Enviar invitación o compartir link.  
4\. También puede postergarse.  
5\. Si se comparte link, el link vence en 7 días.

Información explícita:

\* La invitación es una opción natural, no un requisito obligatorio.  
\* El link se comparte con share sheet nativo.

**\#\#\#\# Aceptar invitación**

Flujos encontrados por rol:

\* Adult: acepta invitación, ve resumen del hogar, personaliza datos y entra al Home.  
\* Guest: acepta invitación, ve resumen mínimo y entra al Home con acceso limitado.

Información explícita para Adult:

\* Llega por invitación de un Coordinator.  
\* Ya existe un hogar.  
\* Pantalla de aceptación muestra hogar, miembros y tipo de hogar.  
\* CTA: “Unirme al hogar”.  
\* Acción alternativa: “No es mi hogar”.

Información explícita para Guest:

\* Llega por invitación.  
\* CTA: “Aceptar invitación”.  
\* Se le informa que solo ve lo necesario para participar.

**\#\#\#\# Onboarding por rol**

**\#\#\#\#\# Coordinator**

Flujo encontrado:

1\. Register.  
2\. Selección de rol Coordinator.  
3\. Crear hogar.  
4\. Personalización de perfil.  
5\. Primer valor visible.  
6\. Invitación a miembros.  
7\. Home.

Campos específicos:

\* tipo de hogar  
\* nombre hogar  
\* foto hogar opcional  
\* disponibilidad horaria  
\* horario preferido de aviso  
\* nombre completo  
\* foto de perfil opcional  
\* tratamiento  
\* preferencia de notificaciones

**\#\#\#\#\# Adult**

Flujo encontrado:

1\. Aceptar invitación \+ ver resumen del hogar.  
2\. Nombre \+ foto \+ horario \+ tratamiento.  
3\. Home.

Campos específicos:

\* nombre completo  
\* foto opcional  
\* horario preferido de aviso  
\* tratamiento

Permiso/capacidad encontrada:

\* Adult usa una navegación completa con permisos de Adult.  
\* El documento no detalla contrato técnico de permisos.

**\#\#\#\#\# Adolescent**

Flujo encontrado:

1\. Avatar \+ color \+ nombre.  
2\. Tono \+ notificaciones.  
3\. Home.

Campos específicos:

\* nombre  
\* avatar  
\* color  
\* tono  
\* preferencia de notificaciones

Información explícita:

\* El documento presenta franja “Entre 13 y 17 años” en la selección de rol.  
\* No se pregunta edad exacta.

**\#\#\#\#\# Child**

Flujo encontrado:

1\. Avatar \+ color \+ nombre.  
2\. Lista demo.  
3\. Primera tarea interactiva.  
4\. Home.

Campos específicos:

\* nombre  
\* avatar  
\* color

Información explícita:

\* El documento presenta franja “Entre 6 y 12 años” en la selección de rol.  
\* No se pregunta edad exacta.  
\* La lista demo aparece antes de la primera interacción real.

**\#\#\#\#\# Senior**

Flujo encontrado dentro del alcance Auth/Onboarding:

1\. Bienvenida \+ nombre \+ tratamiento.  
2\. Selección de tamaño de letra.  
3\. Entrada a Home tras completar onboarding.

Campos específicos dentro del alcance:

\* nombre  
\* tratamiento  
\* preferencia de tamaño de letra / modo senior

Información explícita:

\* Senior tiene permisos equivalentes a Adult, con experiencia adaptada.  
\* El modo senior usa letra grande por defecto.  
\* La opción de letra grande aparece seleccionada por default.  
\* El usuario puede reducirla.

**\#\#\#\#\# Guest**

Flujo encontrado:

1\. Aceptar invitación.  
2\. Ver resumen mínimo.  
3\. Home.

Información explícita:

\* Guest llega por invitación.  
\* Tiene acceso mínimo.  
\* Solo ve contexto autorizado.  
\* La pantalla explica que solo ve lo necesario para participar.

**\---**

**\#\#\# UI y componentes**

**\#\#\#\# Pantallas encontradas**

\* Splash Screen.  
\* Pantalla de bienvenida.  
\* Crear cuenta paso 1: credenciales.  
\* Crear cuenta paso 2: nombre.  
\* Login Screen.  
\* Selección de rol.  
\* Creación de hogar paso 1: tipo de hogar.  
\* Creación de hogar paso 2: nombre y foto.  
\* Creación de hogar paso 3: disponibilidad horaria.  
\* Personalización de perfil paso 1: foto y nombre completo.  
\* Personalización de perfil paso 2: tratamiento y notificaciones.  
\* Primer valor visible.  
\* Invitación a miembros.  
\* Pantallas por rol para Adult, Adolescent, Child, Senior y Guest.

**\#\#\#\# Componentes UI encontrados**

\* Botón primario.  
\* Botón ghost/secundario.  
\* Inputs con label.  
\* Toggle de visibilidad de contraseña.  
\* Cards seleccionables.  
\* Radio cards.  
\* Progress bar de registro.  
\* Divider.  
\* Toast superior.  
\* Overlay anti doble tap durante loading.  
\* Bottom sheet para selección/creación en acciones del onboarding.  
\* Share sheet nativo para link de invitación.  
\* Avatar personal.  
\* Avatar del hogar.

**\#\#\#\# Reglas UI encontradas**

\* Cada pantalla tiene una acción principal.  
\* Sin tutoriales.  
\* Sin carrusel de features.  
\* Chips informativos fijos en bienvenida.  
\* Inputs con label arriba; placeholder no reemplaza label.  
\* Foto de perfil y foto del hogar son opcionales.  
\* Loading mínimo de 400ms en botones según archivo de comprensión.  
\* Onboarding mobile-first con base 375×812px.  
\* Modo senior aumenta tamaño de letra y targets táctiles.

**\---**

**\#\#\# Estados globales del onboarding**

| Escenario | Comportamiento encontrado |  
|---|---|  
| Pantallas solo UI | funcionan offline, sin backend |  
| Pantallas con backend | muestran toast de sin conexión; datos no se pierden |  
| Splash | carga offline sin problema |  
| Registro no completado | se descarta y vuelve a bienvenida |  
| Cuenta creada y onboarding incompleto | retoma donde quedó |  
| Timeout mayor a 7 días | se reinicia onboarding del hogar, no el registro |

**\---**

**\#\#\# Edge cases encontrados**

\* Email inválido.  
\* Email vacío.  
\* Contraseña vacía.  
\* Contraseña menor a 8 caracteres.  
\* Email ya registrado.  
\* Red caída.  
\* Error genérico al crear cuenta.  
\* Token/link expirado.  
\* Registro incompleto descartado.  
\* Cuenta creada con onboarding incompleto retoma progreso.  
\* Timeout mayor a 7 días reinicia onboarding del hogar.  
\* Invitación inicial postergada.  
\* Link de invitación vencido después de 7 días.  
\* Acción “No es mi hogar” en aceptación de invitación Adult.

**\---**

**\#\#\# APIs, request y response**

No se encuentran endpoints formales.

Acciones mencionadas sin contrato API:

| Acción | Método | Ruta | Request | Response | Errores | Estado |  
|---|---|---|---|---|---|---|  
| Crear cuenta | No definido | No definido | Email, password y nombre aparecen en UI | No definido | email inválido, password débil, red caída, email registrado, error genérico | Mencionado sin contrato |  
| Login | No definido | No definido | Email \+ password aparecen en UI | No definido | No definido en detalle | Mencionado sin contrato |  
| Login social Google/Apple | No definido | No definido | No definido | OK → Home | No definido | Mencionado sin contrato |  
| Recuperación de contraseña | No definido | No definido | Email aparece en flujo | Link → nueva contraseña → OK | token/link expirado | Mencionado sin contrato |  
| Refresh Token | No definido | No definido | No definido | No definido | No definido | No encontrado |  
| Logout | No definido | No definido | No definido | No definido | No definido | No encontrado |  
| Crear hogar | No definido | No definido | tipo, nombre, foto opcional, disponibilidad | No definido | No definido | Mencionado sin contrato |  
| Enviar invitación | No definido | No definido | nombre del miembro \+ email/teléfono | No definido | No definido | Mencionado sin contrato |  
| Compartir link | No definido | No definido | No definido | link único válido 7 días | link expirado implícito | Mencionado sin contrato |  
| Aceptar invitación | No definido | No definido | No definido | ingreso al hogar | link/token inválido implícito | Mencionado sin contrato |

**\---**

**\#\#\# Permisos**

Información explícita encontrada:

\* Coordinator crea hogar durante onboarding.  
\* Coordinator puede invitar miembros.  
\* Adult llega por invitación de Coordinator.  
\* Guest llega por invitación y tiene acceso mínimo.  
\* Guest solo ve contexto autorizado.  
\* Senior tiene permisos equivalentes a Adult, con experiencia adaptada.  
\* La pantalla inicial de selección no muestra Guest porque Guest se asigna por invitación.  
\* Los permisos técnicos por acción no están definidos como matriz ni reglas backend.

**\---**

**\#\#\# Restricciones arquitectónicas y de experiencia**

\* Plataforma mobile-first.  
\* React Native / Expo.  
\* Modos \`normal\` y \`senior\`.  
\* Objetivo rector: 60 segundos hasta primer valor visible.  
\* Una acción principal por pantalla.  
\* Sin tutoriales.  
\* Sin feature carousel.  
\* Configuración completa postergable.  
\* Permisos de notificación se piden después del primer valor visible, no al inicio.  
\* Invitación a miembros es postergable.  
\* Foto de perfil y hogar siempre opcionales durante onboarding.  
\* Disponibilidad se captura en 3 franjas, no como horas exactas.  
\* No se pregunta edad exacta; se usa franja etaria por rol.  
\* El flujo debe retomar si la cuenta ya fue creada y el onboarding no terminó.

**\---**

**\#\#\# Eventos del sistema**

No se encuentran nombres técnicos de eventos.

Eventos conceptuales detectados:

\* Cuenta creada.  
\* Login exitoso.  
\* Login social exitoso.  
\* Recuperación de contraseña solicitada.  
\* Link/token expirado.  
\* Rol seleccionado.  
\* Hogar creado.  
\* Perfil personalizado.  
\* Primer valor visible completado.  
\* Invitación enviada.  
\* Link de invitación generado/copied.  
\* Invitación aceptada.  
\* Onboarding completado.  
\* Onboarding retomado.

**\---**

**\#\#\# Dependencias**

\* Documento principal de onboarding.  
\* Archivo de comprensión asociado.  
\* Source map generado para este documento.  
\* Componentes del Design System mencionados por el documento.  
\* Backend para registro, login e invitación.  
\* Autenticación nativa del sistema operativo para login social.  
\* Share sheet nativo para compartir link.

**\---**

**\#\# 2\. Clasificación para implementación**

**\#\#\# REAL**

Debe considerarse implementable para MVP v1.0 desde este documento:

**\#\#\#\# Register**

\* Pantalla de bienvenida con CTA “Crear cuenta”.  
\* Registro en 2 pasos.  
\* Paso 1: email \+ contraseña.  
\* Paso 1: validación de email.  
\* Paso 1: contraseña mínima de 8 caracteres.  
\* Paso 1: botón deshabilitado hasta datos válidos.  
\* Paso 1: estados default, válido, error, loading y red caída.  
\* Paso 1: acción ante email ya registrado para redirigir a Login.  
\* Paso 2: nombre.  
\* Paso 2: nombre obligatorio.  
\* Paso 2: máximo 40 caracteres.  
\* Paso 2: solo letras, espacios y acentos.  
\* Éxito de registro → selección de rol.

**\#\#\#\# Login**

\* Pantalla de login con email \+ password.  
\* Acceso desde “Ya tengo cuenta” / “Entrar”.  
\* Login exitoso → Home de usuario existente.  
\* Recuperación de contraseña desde login.

**\#\#\#\# Login social**

\* Botones “Continuar con Google” y “Continuar con Apple”.  
\* Flujo nativo del sistema operativo.  
\* Overlay con spinner y texto de conexión.  
\* OK → Home.

**\#\#\#\# Recuperación de contraseña**

\* Pantalla de email.  
\* Envío de link.  
\* Nueva contraseña.  
\* OK.  
\* Error de token/link expirado.

**\#\#\#\# Crear hogar durante registro**

\* Solo Coordinator continúa a creación de hogar desde selección de rol.  
\* Paso 1: tipo de hogar.  
\* Paso 2: nombre y foto opcional.  
\* Paso 3: disponibilidad horaria.  
\* Nombre de hogar obligatorio.  
\* Nombre de hogar máximo 30 caracteres.  
\* Disponibilidad en franjas.  
\* Horario preferido de aviso.

**\#\#\#\# Invitar miembros durante onboarding**

\* Pantalla de invitación tras primer valor visible.  
\* Nombre del miembro.  
\* Email o teléfono.  
\* Enviar invitación.  
\* Compartir link.  
\* Postergar invitación.  
\* Link único del hogar válido 7 días.  
\* Share sheet nativo.  
\* Toast de link copiado y vencimiento.

**\#\#\#\# Onboarding por rol**

\* Coordinator: registro \+ selección de rol \+ creación de hogar \+ personalización \+ invitación \+ Home.  
\* Adult: aceptar invitación \+ resumen del hogar \+ personalización \+ Home.  
\* Adolescent: avatar/color/nombre \+ tono/notificaciones \+ Home.  
\* Child: avatar/color/nombre \+ lista demo \+ primera tarea interactiva \+ Home.  
\* Senior: nombre/tratamiento \+ letra grande por defecto \+ Home.  
\* Guest: aceptar invitación \+ resumen mínimo \+ Home.

**\#\#\#\# Retoma y estados globales**

\* Registro no completado se descarta.  
\* Cuenta creada con onboarding incompleto retoma donde quedó.  
\* Timeout mayor a 7 días reinicia onboarding del hogar, no el registro.  
\* Pantallas con backend muestran toast de sin conexión y no pierden datos.

**\#\#\# MOCK**

Información que puede simularse durante esta extracción de Auth/Onboarding:

\* Lista demo del flujo Child.  
\* Primera tarea interactiva en “onboarding mode” del flujo Child, si todavía no existe implementación real de Planner.  
\* Sugerencias iniciales del “primer valor visible” como opciones fijas de onboarding, sin lógica inteligente real.

**\#\#\# POST\_MVP**

No se encontró información de POST\_MVP aplicable directamente a Auth dentro del alcance pedido.

**\#\#\# IGNORAR**

No se incluye contenido ignorado por el prompt.

**\---**

**\#\# 3\. Información faltante**

| Tema | Información faltante | Por qué importa | Impacto en implementación |  
|---|---|---|---|  
| User vs Account vs Person | El documento no separa completamente \`User\`, \`Account\` y \`Person\` en el flujo principal. | Define modelo de identidad y relación con hogar. | Requiere definición en etapa de merge o documento backend. |  
| Register API | No hay método, ruta, request, response ni errores backend. | Es necesario para implementar el registro real. | Solo puede extraerse flujo UI y validaciones. |  
| Login API | No hay método, ruta, request, response ni errores backend. | Es necesario para autenticación real. | Solo puede extraerse pantalla y flujo. |  
| Login social backend | No se define cómo se intercambia el token nativo con backend. | Es necesario para persistir sesión. | La implementación queda incompleta. |  
| Refresh Token | No aparece flujo ni entidad \`RefreshToken\`. | Es obligatorio para MVP según prompt. | Queda pendiente de otra fuente. |  
| Logout | No aparece flujo ni acción. | Es obligatorio para MVP según prompt. | Queda pendiente de otra fuente. |  
| Session | No se define entidad ni estado de sesión. | Afecta login, refresh y logout. | Requiere otra fuente. |  
| Recuperación de contraseña | No hay expiración del link ni contrato API. | Afecta seguridad y errores. | Solo se conoce flujo UX. |  
| Token expirado | Se menciona “token expirado”, pero parece referirse a link inválido. | Puede confundirse con refresh token. | No debe usarse para inferir refresh token. |  
| Crear hogar API | No hay contrato backend para crear hogar. | Necesario para persistir hogar y membership. | Solo se conoce flujo/campos UI. |  
| Membership al crear hogar | No se define explícitamente cómo se crea la membresía del Coordinator. | Es necesaria para permisos y acceso al hogar. | Relación implícita; requiere validación. |  
| Invitación API | No hay método, ruta, request, response ni errores. | Necesario para invitaciones reales. | Solo se conoce flujo UI/link. |  
| Aceptar invitación API | No hay contrato técnico. | Necesario para activar membresía. | Queda pendiente. |  
| Estados de invitación | El documento muestra pendiente y link válido 7 días, pero no enum completo. | Afecta expiración, reenvío y aceptación. | Requiere definición adicional. |  
| Permisos por rol | Hay capacidades generales, pero no matriz técnica por acción. | Afecta autorización backend. | No se deben inventar permisos. |  
| Reglas por tipo de hogar | Se describen comportamientos de visibilidad, no reglas técnicas. | Afecta privacidad y autorización. | Requiere definición posterior. |  
| Validaciones de login | No se detallan errores de credenciales inválidas. | Afecta UX y backend. | Pendiente. |  
| Teléfono en invitación | No se define formato ni validación. | Afecta envío y compatibilidad. | Pendiente. |  
| Nombre del miembro invitado | No se define validación. | Afecta creación de invitación. | Pendiente. |  
| Foto de perfil/hogar | No se definen formatos, límites ni almacenamiento. | Afecta upload. | Pendiente. |  
| Onboarding Senior | El flujo completo contiene pasos de otros dominios; para este fragment solo se extrajo lo aplicable a Auth/Onboarding. | Evita mezclar módulos. | Se necesita fragment específico de otros módulos si se habilitan después. |  
| Métrica 60 segundos | El documento dice objetivo ≤60s, pero algunos acumulados de pantalla superan ese tiempo antes del primer valor. | Afecta alcance UX. | Contradicción a revisar en merge. |  
| Nombre del documento | El archivo se llama v1, pero el encabezado interno dice V2 / versión 2.0. | Afecta trazabilidad. | Mantener ambos datos en fuente. |

**\---**

**\#\# 4\. Fuente**

\* Archivo principal: \`HomePlus — Diseño de onboarding completo v1.md\`  
  \* Encabezado / metadatos.  
  \* \`\#\# 1\. DIAGRAMA DE FLUJO COMPLETO\`  
  \* \`\#\#\# Flujos Alternativos por Rol\`  
  \* \`\#\#\# Bifurcaciones y Estados\`  
  \* \`\#\#\# 2.2 PANTALLA DE BIENVENIDA\`  
  \* \`\#\#\# 2.3 CREAR CUENTA — PASO 1: CREDENCIALES\`  
  \* \`\#\#\# 2.4 CREAR CUENTA — PASO 2: NOMBRE\`  
  \* \`\#\#\# 2.5 SELECCIÓN DE ROL\`  
  \* \`\#\#\# 2.6 CREACIÓN DEL HOGAR — PASO 1: TIPO DE HOGAR\`  
  \* \`\#\#\# 2.7 CREACIÓN DEL HOGAR — PASO 2: NOMBRE Y FOTO\`  
  \* \`\#\#\# 2.8 CREACIÓN DEL HOGAR — PASO 3: DISPONIBILIDAD HORARIA\`  
  \* \`\#\#\# 2.9 PERSONALIZACIÓN DEL PERFIL — PASO 1: FOTO Y NOMBRE COMPLETO\`  
  \* \`\#\#\# 2.10 PERSONALIZACIÓN DEL PERFIL — PASO 2: TONO Y NOTIFICACIONES\`  
  \* \`\#\#\# 2.11 PRIMER VALOR VISIBLE — ⏱ OBJETIVO: ≤60s DESDE SPLASH\`  
  \* \`\#\#\# 2.12 INVITACIÓN A MIEMBROS\`  
  \* \`\#\# 3\. VARIACIONES POR ROL\`  
  \* \`\#\#\# 3.1 FLUJO ADULTO\`  
  \* \`\#\#\# 3.2 FLUJO ADOLESCENTE\`  
  \* \`\#\#\# 3.3 FLUJO NIÑO\`  
  \* \`\#\#\# 3.4 FLUJO ADULTO MAYOR\`  
  \* \`\#\#\# 3.5 FLUJO INVITADO\`  
  \* \`\#\# 5\. DECISIONES DE ONBOARDING\`  
  \* \`\#\# 6\. ESTADOS GLOBALES DEL ONBOARDING\`  
\* Archivo de comprensión asociado: \`Diseño de onboarding completo v1.txt\`  
  \* \`OUTPUT 1 — ENTITIES\`  
  \* \`OUTPUT 2 — RELATIONSHIPS\`  
  \* \`OUTPUT 5 — BUSINESS RULES\`  
  \* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`  
  \* \`OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS\`  
\* Source map usado: \`source\_map\_HomePlus\_Diseño\_de\_onboarding\_completo\_v1.md\`  
  \* \`\# 4.1 AUTH\`  
  \* \`\# 4.2 ONBOARDING\`  
  \* \`\# 4.3 HOUSEHOLD\`  
  \* \`\# 4.5 INVITATIONS\`  
  \* \`\# 4.6 ROLES & PERMISSIONS\`

**\# AUTH fragment — HomePlus — Diseño ed pantallas de Auth v1**

**\#\# 1\. Información encontrada**

**\#\#\# Objetivo del módulo**

\* El documento define Auth como la entrada a HomePlus.  
\* El login se presenta como “la puerta de entrada a un hogar”.  
\* La Cuenta pertenece al usuario y el Hogar es un ente separado.  
\* El usuario se autentica con su Cuenta personal y luego selecciona o ingresa a un Hogar.  
\* Las credenciales son de la persona, no del hogar.  
\* Plataforma indicada: mobile-first, base 375×812px, React Native / Expo.  
\* Backend indicado: Supabase Auth.

**\#\#\# Entidades**

\* \`Cuenta\`:  
  \* Pertenece al usuario.  
  \* No pertenece al hogar.  
  \* En el archivo de comprensión se indica que incluye Perfil, Preferencias, Idioma, Configuración personal y memoria personal.  
\* \`Persona\`:  
  \* Entidad central que representa un usuario.  
  \* Pertenece a una Cuenta.  
  \* Participa en uno o más hogares.  
\* \`Hogar\`:  
  \* Ente separado de la Cuenta.  
  \* Unidad organizativa principal.  
  \* Todo ocurre dentro de un hogar.  
\* \`Membership\`:  
  \* Relación entre Persona y Hogar.  
  \* Posee un único rol.  
  \* Estados encontrados en el archivo de comprensión: Pendiente, Activa, Suspendida, Finalizada.  
\* \`Role\`:  
  \* Asociado a Membership.  
\* \`SupabaseAuth\`:  
  \* Servicio de autenticación para email+password, Google OAuth, Apple OAuth, magic link, 2FA y biometría.  
\* \`SupabaseSession\`:  
  \* Manejo de sesiones JWT con refresh token de 7 días.  
\* \`GoogleOAuth\`:  
  \* Proveedor de login social Google.  
\* \`AppleOAuth\`:  
  \* Proveedor de login social Apple.  
\* \`AuthLoginScreen\`:  
  \* Pantalla de login principal con email/password y social login.  
\* \`AuthRegisterScreen\`:  
  \* Registro standalone de una pantalla.  
  \* No pide nombre.  
\* \`AuthSessionExpiredScreen\`:  
  \* Re-autenticación con email pre-rellenado tras sesión expirada.  
\* \`AuthLogoutConfirmSheet\`:  
  \* Bottom sheet 25% para confirmar cierre de sesión.  
\* \`LoginFlow\`:  
  \* Flujo completo de autenticación: credenciales → JWT → Onboarding/Home.  
  \* El archivo de comprensión incluye 2FA en este flujo, pero este fragment no desarrolla 2FA porque queda fuera del alcance solicitado.  
\* \`RegisterFlow\`:  
  \* Flujo de registro: email+password → verificación → onboarding.  
\* \`LogoutFlow\`:  
  \* Cierre de sesión con limpieza de tokens.

**\#\#\# Roles encontrados y mapeo MVP**

| Rol en documento | Rol MVP equivalente | Información explícita encontrada |  
| \---------------- | \------------------- | \-------------------------------- |  
| Coordinador | Coordinator | Responsable administrativo principal del hogar. Puede aprobar ingresos, cambiar roles y expulsar miembros. |  
| Adulto | Adult | Miembro operativo con amplios permisos. No puede aprobar ingresos. |  
| Adolescente | Adolescent | Miembro con autonomía progresiva. Puede recibir autorizaciones adicionales. |  
| Niño | Child | Miembro con experiencia simplificada. No administra información familiar crítica. |  
| AdultoMayor | Senior | Miembro con experiencia adaptada. Mantiene permisos equivalentes a Adulto. |  
| Invitado | Guest | Acceso mínimo. Participación limitada. |

**\#\#\# Relaciones**

\* Persona → Cuenta:  
  \* La Persona pertenece a una Cuenta.  
\* Persona → Hogar:  
  \* La Persona participa en uno o más hogares.  
\* Membership → Persona:  
  \* Membership vincula Persona.  
\* Membership → Hogar:  
  \* Membership vincula Hogar.  
\* Membership → Role:  
  \* Membership tiene un rol.  
\* SupabaseAuth → SupabaseSession:  
  \* SupabaseAuth gestiona SupabaseSession.  
\* SupabaseAuth → JWT Token \+ Refresh Token → SupabaseSession:  
  \* El flujo de datos establece una sesión activa con JWT Token \+ Refresh Token.  
\* Coordinador → Invitación → Persona:  
  \* El archivo de comprensión menciona un flujo de datos donde el Coordinador envía una invitación a una Persona para invitar nuevo miembro al hogar.  
  \* No hay entidad Invitation detallada, campos, estados, token, expiración, aceptación ni API.  
\* Membership → Rol, estado → Hogar:  
  \* El archivo de comprensión indica que Membership entrega rol y estado al Hogar para definir permisos de acceso.

**\#\#\# Campos**

**\#\#\#\# Login**

\* \`email\`:  
  \* Input label: \`Email\`.  
  \* Placeholder: \`Email\`.  
  \* Tipo de teclado: \`email-address\`.  
  \* Foco inicial: sí.  
  \* Return key: \`next\` hacia Password.  
\* \`password\` / \`contraseña\`:  
  \* Input label: \`Contraseña\`.  
  \* Placeholder: \`Contraseña\`.  
  \* Tipo de teclado: default.  
  \* Return key: \`go\`, ejecuta submit.  
  \* Tiene toggle de visibilidad con ícono de ojo.  
\* Botón primario:  
  \* Texto: \`Entrar\`.  
  \* Deshabilitado hasta tener email \+ password.  
\* Social login:  
  \* Botón: \`Continuar con Google\`.  
  \* Botón: \`Continuar con Apple\`.  
\* Link de recuperación:  
  \* Texto: \`¿Olvidaste tu contraseña?\`.  
  \* El flujo de recuperación no se desarrolla en este fragment porque el alcance solicitado no lo incluye.  
\* Link a registro:  
  \* Texto pre-link: \`¿No tenés cuenta?\`.  
  \* Botón/link: \`Crear cuenta\`.

**\#\#\#\# Register**

\* \`email\`:  
  \* Input label: \`Email\`.  
  \* Placeholder: \`Email\`.  
  \* Tipo de teclado: \`email-address\`.  
  \* Foco inicial: sí.  
\* \`password\` / \`contraseña\`:  
  \* Input label: \`Contraseña\`.  
  \* Placeholder: \`Contraseña\`.  
  \* Tiene toggle de visibilidad.  
\* \`confirm\_password\` / \`confirmar contraseña\`:  
  \* Input label: \`Confirmar contraseña\`.  
  \* Placeholder: \`Confirmar contraseña\`.  
  \* Tiene toggle de visibilidad.  
\* \`terms\_accepted\` / checkbox de términos:  
  \* Texto: \`Acepto los Términos y Condiciones y la Política de Privacidad.\`  
  \* Debe estar marcado para continuar.  
\* Helper de contraseña:  
  \* Texto: \`Mínimo 8 caracteres\`.  
\* Botón primario:  
  \* Texto: \`Crear cuenta\`.  
  \* Deshabilitado hasta validación.  
\* Social register/login:  
  \* Botón: \`Continuar con Google\`.  
  \* Botón: \`Continuar con Apple\`.  
\* Link a login:  
  \* Texto pre-link: \`¿Ya tenés cuenta?\`.  
  \* Botón/link: \`Entrar\`.  
\* Nombre:  
  \* El documento indica explícitamente que no se pide nombre en el registro standalone.  
  \* El nombre se pide en onboarding.

**\#\#\#\# Refresh Token / Session**

\* \`JWT Token\`:  
  \* Token de sesión.  
  \* Expira según configuración de Supabase.  
  \* El documento indica default de 1 hora.  
\* \`Refresh Token\`:  
  \* Dura 7 días según el documento.  
  \* Si expira, el usuario vuelve a login completo.  
\* \`email pre-rellenado\`:  
  \* En sesión expirada, la pantalla muestra el email no editable.  
\* \`password\`:  
  \* En sesión expirada se pide contraseña para re-autenticación.

**\#\#\#\# Logout**

\* Sesión Supabase actual.  
\* Storage local.  
\* Token.  
\* Botón danger:  
  \* Texto: \`Cerrar sesión\`.  
\* Botón ghost:  
  \* Texto: \`Cancelar\`.

**\#\#\# Tipos**

\* \`email\` usa teclado \`email-address\`.  
\* \`password\` usa teclado default.  
\* \`confirm\_password\` usa teclado default.  
\* Checkbox de términos usa componente Checkbox.  
\* JWT y Refresh Token son gestionados por SupabaseSession según el documento.  
\* No se definen tipos de base de datos para Cuenta, Persona, Hogar, Membership, Role ni sesión.

**\#\#\# Valores por defecto**

\* Login:  
  \* Inputs vacíos.  
  \* Botón \`Entrar\` deshabilitado.  
  \* Botones sociales habilitados y visibles.  
  \* Link de recuperación visible.  
\* Register:  
  \* Inputs vacíos.  
  \* Checkbox sin marcar.  
  \* Botón \`Crear cuenta\` deshabilitado.  
  \* Helper \`Mínimo 8 caracteres\` visible.  
\* Token JWT:  
  \* Expiración default indicada: 1 hora.  
\* Refresh token:  
  \* Duración indicada: 7 días.  
\* Login screen:  
  \* El email tiene autofocus.  
\* Register screen:  
  \* El email tiene autofocus.

**\#\#\# Restricciones**

**\#\#\#\# Seguridad**

\* No se debe mostrar “Email no encontrado” separado de “Contraseña incorrecta”.  
\* El mensaje de credenciales inválidas debe ser unificado:  
  \* \`Ese email o contraseña no son correctos. ¿Probás de nuevo?\`  
\* La recuperación de contraseña no revela si el email existe.  
\* Supabase Auth aplica rate limiting por IP.  
\* La app agrega cooldown visual después de intentos fallidos.  
\* Las contraseñas nunca se almacenan en logs, analytics ni crash reports.  
\* El email verificado es requerido para que la cuenta quede completamente activa.  
\* No existe checkbox \`Recordarme\`.  
\* La sesión se mantiene con refresh token de Supabase.

**\#\#\#\# UX / UI**

\* Loading mínimo de 400ms en botones para evitar flicker.  
\* Spinner visible solo si la operación excede 300ms.  
\* Durante loading de login/register, se usa overlay para prevenir doble tap.  
\* Todas las transiciones respetan \`prefers-reduced-motion\`; si está activo, duración 0ms.  
\* Login debe cargar en menos de 2s.  
\* Logo, tagline e íconos sociales son estáticos/locales y no bloquean el render inicial.  
\* Inputs usan label arriba \+ placeholder complementario.  
\* El toggle de visibilidad de contraseña siempre está presente en campos password.

**\#\#\#\# Cuenta / Hogar**

\* La Cuenta pertenece al usuario.  
\* El Hogar es un ente separado.  
\* El usuario se autentica con su Cuenta personal.  
\* Luego selecciona o ingresa a un Hogar.  
\* Las credenciales son de la persona, no del hogar.

**\#\#\# Estados posibles**

**\#\#\#\# Estados UI globales cubiertos por el flujo Auth**

\* Empty.  
\* Loading.  
\* Error.  
\* Success.  
\* Offline.

**\#\#\#\# Login**

\* DEFAULT:  
  \* Inputs vacíos con placeholder visible.  
  \* Botón \`Entrar\` deshabilitado.  
  \* Botones sociales habilitados y visibles.  
  \* Link \`¿Olvidaste tu contraseña?\` visible.  
\* FILLED:  
  \* Email \+ password con datos.  
  \* Botón \`Entrar\` habilitado.  
  \* Password muestra bullets o texto según toggle.  
\* FOCUS:  
  \* Input activo con borde/ring de foco.  
  \* Label visible arriba del input.  
  \* Teclado visible según tipo de input.  
\* ERROR:  
  \* Input con borde/ring de error.  
  \* Texto de error debajo en caption.  
  \* Botón deshabilitado si hay errores.  
\* LOADING:  
  \* Botón reemplaza texto por spinner.  
  \* Overlay sutil sobre pantalla.  
  \* Inputs y links deshabilitados visualmente.  
  \* Si la autenticación tarda más de 3s, aparece el texto \`Conectando con tu hogar...\`.  
\* ERROR GENERAL:  
  \* Toast superior.  
  \* El formulario permanece visible.  
  \* El usuario puede reintentar.  
\* SUCCESS:  
  \* Transición a Home si onboarding completo.  
  \* Transición a Onboarding si es primera vez.  
  \* El documento también menciona transición a 2FA si está configurado; este fragment no desarrolla 2FA por estar fuera del alcance solicitado.

**\#\#\#\# Register**

\* DEFAULT:  
  \* Inputs vacíos.  
  \* Checkbox sin marcar.  
  \* Botón \`Crear cuenta\` deshabilitado.  
  \* Helper \`Mínimo 8 caracteres\` visible.  
\* FILLED:  
  \* Todos los campos válidos.  
  \* Checkbox marcado.  
  \* Botón habilitado.  
  \* Passwords muestran bullets.  
\* ERROR:  
  \* Error inline debajo del input correspondiente.  
  \* Botón deshabilitado hasta corregir errores.  
\* LOADING:  
  \* Botón con spinner.  
  \* Overlay sutil para prevenir doble tap.  
  \* Mínimo 400ms.  
\* SUCCESS:  
  \* Cuenta creada → navegación a Verificación de Email.  
  \* Si es login social → navegación a Onboarding.  
\* ERROR de red:  
  \* Toast superior: \`Sin conexión. Probá de nuevo en un momento.\`

**\#\#\#\# Session / Refresh Token**

\* JWT expirado durante uso:  
  \* La app intercepta el 401 de Supabase.  
  \* Redirige a Sesión Expirada.  
\* Refresh token expirado:  
  \* El refresh token dura 7 días.  
  \* Si expira, se requiere Login completo.  
\* Sesión expirada:  
  \* Se muestra pantalla de re-login.  
  \* Email visible no editable.  
  \* Se pide contraseña.

**\#\#\#\# Logout**

\* Tap en \`Cerrar sesión\`:  
  \* Loading en botón danger.  
  \* Al completar, limpia sesión local.  
  \* Transición a Login principal.  
\* Tap en \`Cancelar\`:  
  \* Cierra el bottom sheet.  
  \* Vuelve a la pantalla anterior.

**\#\#\# Reglas de negocio**

\* La cuenta no está completamente activa hasta la verificación de email.  
\* Cada membresía posee un único rol activo.  
\* Las relaciones familiares son informativas y no modifican permisos automáticamente.  
\* Coordinador puede aprobar ingresos, cambiar roles y expulsar miembros.  
\* Adulto no puede aprobar ingresos.  
\* AdultoMayor mantiene permisos equivalentes a Adulto.  
\* El registro standalone es solo credenciales \+ aceptación de términos.  
\* El nombre se pide en onboarding, no en register.  
\* El email es la única identidad necesaria para crear la cuenta en registro standalone.  
\* El registro con social login navega a Onboarding.  
\* El login exitoso navega a Home si el onboarding ya está completo.  
\* El login exitoso navega a Onboarding si es primera vez.  
\* Logout en un dispositivo solo afecta ese dispositivo.  
\* Supabase permite múltiples sesiones por usuario.

**\#\#\# Permisos**

\* Coordinator / Coordinador:  
  \* Puede aprobar ingresos.  
  \* Puede cambiar roles.  
  \* Puede expulsar miembros.  
\* Adult / Adulto:  
  \* No puede aprobar ingresos.  
\* Adolescent / Adolescente:  
  \* Puede recibir autorizaciones adicionales.  
\* Child / Niño:  
  \* No administra información familiar crítica.  
\* Senior / AdultoMayor:  
  \* Mantiene permisos equivalentes a Adulto.  
\* Guest / Invitado:  
  \* Tiene acceso mínimo y participación limitada.

No se encontró una matriz completa de permisos por acción MVP para Register, Login, Refresh Token, Logout, creación de hogar, invitaciones u onboarding por rol.

**\#\#\# Flujos**

**\#\#\#\# Login email/password**

1\. Usuario ingresa email y contraseña en \`AuthLoginScreen\`.  
2\. La app valida formato de email y presencia de password.  
3\. Usuario toca \`Entrar\`.  
4\. SupabaseAuth autentica credenciales.  
5\. SupabaseAuth devuelve JWT Token \+ Refresh Token.  
6\. SupabaseSession establece sesión activa.  
7\. Resultado de navegación:  
   \* Home si el usuario ya tiene onboarding completo.  
   \* Onboarding si es primera vez.  
   \* El documento menciona 2FA si está configurado; no se desarrolla en este fragment.

**\#\#\#\# Login social Google/Apple**

1\. Usuario toca \`Continuar con Google\` o \`Continuar con Apple\`.  
2\. Se abre flow nativo del sistema operativo.  
3\. Se muestra overlay con spinner y texto \`Conectando...\`.  
4\. SupabaseAuth recibe OAuth token.  
5\. SupabaseAuth establece sesión.  
6\. Resultado de navegación:  
   \* Home si corresponde a cuenta existente/onboarding completo.  
   \* Onboarding si corresponde a primera vez o registro social.

**\#\#\#\# Register email/password**

1\. Usuario abre \`AuthRegisterScreen\` desde \`Crear cuenta\`.  
2\. Usuario ingresa email, contraseña y confirmación.  
3\. Usuario acepta términos y privacidad con checkbox.  
4\. La app valida email, contraseña, coincidencia de contraseñas y checkbox.  
5\. Usuario toca \`Crear cuenta\`.  
6\. SupabaseAuth crea la cuenta.  
7\. Se envía verificación de email.  
8\. Navega a pantalla de Verificación de Email.  
9\. Después de verificación, el flujo continúa a Onboarding según el archivo de comprensión.

**\#\#\#\# Register social Google/Apple**

1\. Usuario toca \`Continuar con Google\` o \`Continuar con Apple\` desde registro.  
2\. Se usa OAuth.  
3\. Si el registro/login social es exitoso, navega a Onboarding.

**\#\#\#\# Refresh Token / sesión expirada**

1\. Usuario está en cualquier pantalla.  
2\. Token JWT expira.  
3\. Supabase devuelve 401\.  
4\. La app intercepta el 401\.  
5\. Redirige a \`AuthSessionExpiredScreen\`.  
6\. La pantalla muestra email pre-rellenado y no editable.  
7\. El usuario re-autentica con contraseña.  
8\. Si re-autenticación es correcta, vuelve a Home.  
9\. Si el refresh token expiró, se requiere Login completo.

**\#\#\#\# Logout**

1\. Usuario va a Perfil → Configuración → Cerrar sesión.  
2\. Se abre \`AuthLogoutConfirmSheet\`, bottom sheet 25%.  
3\. Usuario toca \`Cerrar sesión\`.  
4\. Se ejecuta logout.  
5\. Se destruye sesión de Supabase.  
6\. Se limpia storage local.  
7\. Se invalida token.  
8\. Navega a Login.

**\#\#\#\# Crear hogar durante registro**

\* No se encontró flujo implementable.  
\* El documento indica que el usuario se autentica con su Cuenta y luego selecciona o ingresa a un Hogar.  
\* El documento no define creación de hogar durante register.

**\#\#\#\# Invitar miembros durante onboarding**

\* El archivo de comprensión menciona un flujo de datos \`Coordinador → Invitación → Persona\` para invitar nuevo miembro al hogar.  
\* No se encontró flujo implementable de invitación durante onboarding.  
\* No se encontró pantalla, API, request, response, token/código, expiración ni aceptación.

**\#\#\#\# Onboarding por rol**

\* No se encontró flujo implementable.  
\* Solo se encontraron roles y descripciones generales.  
\* No se encontraron pantallas, pasos, campos, permisos configurables ni bifurcaciones por rol dentro de onboarding.

**\#\#\# APIs**

No se encontraron endpoints HTTP propios definidos.

| Acción | Método | Ruta | Request | Response | Errores | Estado |  
| \------ | \------ | \---- | \------- | \-------- | \------- | \------ |  
| Pantalla Login | UI route | \`/(auth)/login\` | email, password | Navegación a Home / Onboarding. El documento también menciona 2FA si configurado. | credenciales inválidas, email no verificado, cuenta eliminada, conexión caída, OAuth error, tasa limitada | Parcial |  
| Login email/password | Acción Supabase | No definido | Email \+ Password | JWT Token \+ Refresh Token / sesión activa | error unificado, rate limit | Acción mencionada sin contrato API |  
| Login Google | Acción OAuth | No definido | OAuth token Google | Supabase session | provider error, email vinculado a otro método | Acción mencionada sin contrato API |  
| Login Apple | Acción OAuth | No definido | OAuth token Apple | Supabase session | provider error, email vinculado a otro método | Acción mencionada sin contrato API |  
| Pantalla Registro | UI route | \`/(auth)/register\` | email, password, confirm password, terms checkbox | navegación a verificación email / onboarding en social login | email inválido, email existente, password débil, mismatch, sin red | Parcial |  
| Register | Acción Supabase | No definido | Email \+ Password | Cuenta creada \+ envío de verificación | email existente, red | Acción mencionada sin contrato API |  
| Refresh token | Acción Supabase | No definido | Refresh token | nueva sesión/JWT | refresh expirado → login completo | Mencionado sin detalle |  
| Logout | Acción Supabase/local | No definido | sesión actual | sesión destruida, storage limpio, token invalidado | no detallado | Acción mencionada sin contrato API |  
| Crear hogar durante registro | — | — | — | — | — | No encontrado |  
| Invitar miembros durante onboarding | — | — | — | — | — | No encontrado |  
| Onboarding por rol | — | — | — | — | — | No encontrado |

**\#\#\# Request**

\* Login email/password:  
  \* Email.  
  \* Password.  
\* Register:  
  \* Email.  
  \* Password.  
  \* Confirm password aparece en UI para validación cliente.  
  \* Checkbox de términos aparece en UI.  
\* Refresh token:  
  \* Refresh token mencionado conceptualmente.  
  \* No hay request formal.  
\* Logout:  
  \* Sesión actual mencionada conceptualmente.  
  \* No hay request formal.

**\#\#\# Response**

\* Login:  
  \* JWT Token \+ Refresh Token.  
  \* SupabaseSession activa.  
  \* Navegación a Home u Onboarding según estado del usuario.  
\* Register:  
  \* Cuenta creada.  
  \* Envío de verificación.  
  \* Navegación a Verificación de Email.  
  \* Social login desde registro navega a Onboarding.  
\* Refresh token:  
  \* Nueva sesión/JWT implícito por SupabaseSession.  
  \* No hay response formal.  
\* Logout:  
  \* Sesión destruida.  
  \* Storage local limpio.  
  \* Token invalidado.  
  \* Navegación a Login.

**\#\#\# UI**

**\#\#\#\# AuthLoginScreen**

\* Ruta: \`/(auth)/login\`.  
\* Objetivo: permitir que un usuario con cuenta existente ingrese a HomePlus.  
\* Componentes:  
  \* Logo.  
  \* Heading \`HomePlus\`.  
  \* Tagline \`El lugar donde tu hogar se organiza solo.\`  
  \* Input Email.  
  \* Input Contraseña.  
  \* Toggle de visibilidad de contraseña.  
  \* Link \`¿Olvidaste tu contraseña?\`.  
  \* Botón primario \`Entrar\`.  
  \* Divider \`o\`.  
  \* Botón social Google.  
  \* Botón social Apple.  
  \* Texto \`¿No tenés cuenta?\`.  
  \* Botón/link \`Crear cuenta\`.  
\* A11y:  
  \* Botón Entrar: \`Entrar a HomePlus\`.  
  \* Botón Google: \`Continuar con Google\`.  
  \* Botón Apple: \`Continuar con Apple\`.  
  \* Link recuperación: \`Recuperar contraseña\`.  
  \* Link crear cuenta: \`Crear cuenta nueva\`.

**\#\#\#\# AuthRegisterScreen**

\* Ruta: \`/(auth)/register\`.  
\* Objetivo: crear una cuenta nueva de HomePlus.  
\* Es registro standalone.  
\* Es una pantalla independiente fuera del onboarding.  
\* Flujo mínimo: credenciales \+ aceptar términos.  
\* Componentes:  
  \* Header con back.  
  \* Heading \`Creá tu cuenta\`.  
  \* Subtítulo \`Es rápido, solo un minuto.\`  
  \* Input Email.  
  \* Input Contraseña.  
  \* Input Confirmar contraseña.  
  \* Toggle de visibilidad en ambos password inputs.  
  \* Helper \`Mínimo 8 caracteres\`.  
  \* Checkbox de términos y privacidad.  
  \* Botón primario \`Crear cuenta\`.  
  \* Divider \`o\`.  
  \* Botón Google.  
  \* Botón Apple.  
  \* Texto \`¿Ya tenés cuenta?\`.  
  \* Botón/link \`Entrar\`.  
\* A11y:  
  \* Input Email: \`Email\`.  
  \* Input Contraseña: \`Contraseña nueva\`.  
  \* Input Confirmar: \`Confirmar contraseña\`.  
  \* Checkbox: \`Acepto los Términos y Condiciones\`.  
  \* Botón Crear cuenta: \`Crear cuenta\`.

**\#\#\#\# AuthSessionExpiredScreen**

\* Objetivo: notificar al usuario que su sesión expiró por seguridad y permitir re-autenticación con mínima fricción.  
\* Email aparece pre-rellenado y no editable.  
\* Solo pide contraseña.  
\* Copy:  
  \* Heading: \`Tu sesión terminó\`.  
  \* Subtítulo: \`Por seguridad, te pedimos que vuelvas a entrar. Es solo un segundo.\`  
  \* Botón: \`Entrar\`.  
  \* Link: \`¿Olvidaste tu contraseña?\`.  
  \* Botón ghost: \`Cambiar de cuenta\`.  
\* La opción \`Cambiar de cuenta\` aparece en la UI, pero el selector de cuenta no se desarrolla en este fragment porque no forma parte del alcance solicitado.

**\#\#\#\# AuthLogoutConfirmSheet**

\* Pantalla: \`AuthLogoutConfirmSheet\`.  
\* Tipo: Bottom Sheet 25%.  
\* Copy:  
  \* Título: \`¿Querés cerrar sesión?\`  
  \* Subtítulo: \`Tus datos quedan guardados. Cuando vuelvas, todo va a estar como siempre.\`  
  \* Botón danger: \`Cerrar sesión\`.  
  \* Botón ghost: \`Cancelar\`.  
\* Estados:  
  \* Tap en \`Cerrar sesión\`: loading en botón danger, mínimo 400ms; al completar, limpia sesión local y transiciona a Login principal.  
  \* Tap en \`Cancelar\`: cierra el sheet y vuelve a pantalla anterior.

**\#\#\# Componentes UI**

\* Logo.  
\* Heading.  
\* Body S.  
\* Input.  
\* Toggle de visibilidad.  
\* Link.  
\* Button primary.  
\* Button secondary.  
\* Button ghost.  
\* Button danger.  
\* Divider.  
\* Checkbox.  
\* Toast.  
\* Bottom Sheet.  
\* Spinner.  
\* Overlay.  
\* KeyboardAvoidingView.

**\#\#\# Navegación**

\* App cold start sin sesión → Login.  
\* Login → Home si onboarding completo.  
\* Login → Onboarding si primera vez.  
\* Login → Registro.  
\* Registro → Login por back.  
\* Registro → Verificación Email después de crear cuenta con email/password.  
\* Registro → Onboarding con Google/Apple.  
\* Sesión expirada → pantalla de re-login.  
\* Re-autenticación exitosa → Home.  
\* Logout ejecutado → Login.

**\#\#\# Eventos del sistema**

No hay nombres técnicos de eventos definidos en el documento.

Eventos conceptuales encontrados:

\* cuenta creada.  
\* login exitoso.  
\* sesión establecida.  
\* token refrescado.  
\* sesión expirada.  
\* logout ejecutado.  
\* onboarding requerido después de registro/primer login.

**\#\#\# Dependencias**

\* Supabase Auth.  
\* SupabaseSession.  
\* Google OAuth.  
\* Apple OAuth.  
\* React Native / Expo.  
\* Design System V2.  
\* UX Philosophy V2.  
\* UX Writing Guide V1.  
\* Cuenta.  
\* Persona.  
\* Hogar.  
\* Membership.  
\* Role.  
\* Settings/Profile como origen de logout.

**\#\#\# Restricciones arquitectónicas**

\* Backend Auth delegado a Supabase Auth.  
\* No se definen endpoints propios.  
\* Cuenta y Hogar están separados.  
\* Credenciales pertenecen a Persona/Cuenta, no a Hogar.  
\* El usuario se autentica antes de seleccionar o ingresar a un Hogar.  
\* SupabaseSession maneja JWT y refresh token.  
\* JWT default de sesión: 1 hora.  
\* Refresh token: 7 días.  
\* Logout destruye sesión Supabase, limpia storage local e invalida token.  
\* Password nunca en logs, analytics ni crash reports.  
\* \`prefers-reduced-motion\` debe llevar transiciones a 0ms.  
\* La pantalla Login debe renderizar sin depender de red.

**\#\#\# Casos de uso**

\* Usuario existente entra con email/password.  
\* Usuario existente entra con Google.  
\* Usuario existente entra con Apple.  
\* Usuario nuevo crea cuenta con email/password.  
\* Usuario nuevo usa Google/Apple desde registro y va a Onboarding.  
\* Usuario con JWT expirado re-autentica desde pantalla de sesión expirada.  
\* Usuario cierra sesión desde Perfil/Configuración.

**\#\#\# Casos especiales / Edge cases**

\* Login sin conexión:  
  \* Toast: \`Sin conexión. Cuando vuelva, entrás sin problema.\`  
  \* Los campos no se limpian.  
\* Registro sin conexión:  
  \* Toast: \`Sin conexión. Probá de nuevo en un momento.\`  
  \* Los datos persisten en inputs.  
\* Sesión expirada sin conexión:  
  \* No se puede re-autenticar sin conexión.  
  \* Toast superior informativo.  
\* JWT expirado durante uso:  
  \* Interceptar 401 de Supabase.  
  \* Redirigir a Sesión Expirada.  
\* Refresh token expirado:  
  \* Login completo.  
\* Registro con email existente:  
  \* Validación on-blur.  
  \* Mensaje: \`Ese email ya tiene cuenta. ¿Querés entrar?\` con botón \`\[Entrar\]\`.  
\* Login social con email que ya existe como email+password:  
  \* Supabase vincula el provider a la cuenta existente.  
  \* Usuario entra normalmente.  
\* Login social con email vinculado a otra cuenta social:  
  \* Supabase devuelve error.  
  \* Toast: \`Ese email ya está vinculado a otra forma de entrar. ¿Probás con email y contraseña?\`  
\* Login con cuenta eliminada menor a 30 días:  
  \* Mensaje: \`Esta cuenta ya no existe. Si querés, podés crear una nueva.\`  
\* Login con cuenta eliminada mayor a 30 días:  
  \* Mensaje unificado: \`Ese email o contraseña no son correctos.\`  
\* Sesión activa en 2+ dispositivos:  
  \* Soportado por Supabase.  
\* Logout en un dispositivo:  
  \* Solo afecta ese dispositivo.  
\* Intentos fallidos:  
  \* 3 intentos: cooldown 60s.  
  \* 5 intentos: cooldown 5 minutos.  
  \* 10 intentos: cooldown 15 minutos y sugerencia de recuperación.  
\* Error genérico Supabase Auth:  
  \* Mensaje: \`Algo no salió bien. ¿Probás de nuevo? Si no, revisá tu conexión.\`  
\* Timeout Supabase:  
  \* Mensaje: \`El servidor tarda en responder. ¿Probás de nuevo?\`

**\#\#\# Datos mockeados**

No se encontró información mockeada aplicable a AUTH dentro del alcance de este fragment.

**\#\#\# Funcionalidades REAL encontradas**

\* Register con email/password.  
\* Register social con Google/Apple como ruta hacia onboarding.  
\* Login con email/password.  
\* Login social con Google/Apple.  
\* Refresh token conceptual gestionado por SupabaseSession.  
\* Manejo de JWT expirado mediante pantalla de sesión expirada.  
\* Logout con confirmación.  
\* Limpieza de sesión/storage/token al logout.  
\* Separación Cuenta/Hogar.  
\* Onboarding como destino después de registro, social login o primer login.  
\* Nombre diferido a onboarding.  
\* Roles básicos encontrados en el archivo de comprensión.

**\#\#\# Funcionalidades MOCK encontradas**

No se encontró información MOCK para AUTH.

**\#\#\# Funcionalidades POST\_MVP encontradas**

Dentro del documento existen funcionalidades Auth no solicitadas para este fragment:

\* 2FA opcional.  
\* Biometría opt-in.  
\* Selector de cuenta.  
\* Cerrar todas las sesiones.  
\* Eliminación de cuenta con soft-delete de 30 días.

No se desarrollan como implementación en este fragment porque el alcance solicitado para AUTH \+ ONBOARDING se limita a Register, Login, Refresh Token, Logout, crear hogar durante registro, invitar miembros durante onboarding y onboarding por rol.

**\---**

**\#\# 2\. Clasificación para implementación**

**\#\#\# REAL**

\* Implementar pantalla \`AuthLoginScreen\` con ruta \`/(auth)/login\`.  
\* Implementar login email/password usando Supabase Auth.  
\* Implementar login social Google.  
\* Implementar login social Apple.  
\* Implementar validaciones UI de login:  
  \* Email formato básico.  
  \* Email vacío sin mensaje, botón disabled.  
  \* Password vacío sin mensaje, botón disabled.  
  \* Credenciales inválidas con mensaje unificado.  
  \* Email no verificado con opción de reenvío mencionada.  
  \* Cuenta eliminada con mensaje de cuenta inexistente.  
  \* Error de conexión.  
  \* Error OAuth Google.  
  \* Error OAuth Apple.  
  \* Tasa limitada.  
\* Implementar estados UI de login:  
  \* DEFAULT.  
  \* FILLED.  
  \* FOCUS.  
  \* ERROR.  
  \* LOADING.  
  \* ERROR GENERAL.  
  \* SUCCESS.  
\* Implementar pantalla \`AuthRegisterScreen\` con ruta \`/(auth)/register\`.  
\* Implementar register email/password usando Supabase Auth.  
\* Implementar social register con Google/Apple como navegación a Onboarding.  
\* Implementar validaciones UI de registro:  
  \* Email formato básico.  
  \* Email ya registrado.  
  \* Contraseña mínimo 8 caracteres.  
  \* Contraseña con al menos 1 número o carácter especial.  
  \* Confirmación de contraseña igual a contraseña.  
  \* Checkbox de términos obligatorio.  
  \* Error de conexión.  
\* Implementar estados UI de registro:  
  \* DEFAULT.  
  \* FILLED.  
  \* ERROR.  
  \* LOADING.  
  \* SUCCESS.  
\* Implementar que el registro standalone no pida nombre.  
\* Implementar que el nombre quede diferido a Onboarding.  
\* Implementar navegación desde Register a Verificación de Email después de crear cuenta con email/password.  
\* Implementar navegación hacia Onboarding cuando corresponda, sin definir pantallas internas de onboarding desde este documento.  
\* Implementar manejo conceptual de refresh token mediante SupabaseSession.  
\* Implementar JWT expirado → interceptar 401 Supabase → pantalla de Sesión Expirada.  
\* Implementar Refresh Token expirado → Login completo.  
\* Implementar \`AuthSessionExpiredScreen\` con email pre-rellenado y no editable.  
\* Implementar re-login por contraseña desde sesión expirada.  
\* Implementar \`AuthLogoutConfirmSheet\` como bottom sheet 25%.  
\* Implementar logout desde Perfil/Configuración.  
\* Implementar logout con destrucción de sesión Supabase, limpieza de storage local e invalidación de token.  
\* Implementar navegación post-logout a Login.  
\* Implementar reglas de seguridad anti-enumeración.  
\* Implementar cooldown visual por intentos fallidos según documento.  
\* Implementar separación conceptual Cuenta/Hogar en la navegación post-auth.  
\* Registrar roles MVP encontrados para uso posterior:  
  \* Coordinator.  
  \* Adult.  
  \* Adolescent.  
  \* Child.  
  \* Senior.  
  \* Guest.

**\#\#\# MOCK**

No se encontró información MOCK aplicable a AUTH en este documento.

**\#\#\# POST\_MVP**

\* 2FA opcional: existe en el documento, pero no se desarrolla en este fragment.  
\* Biometría opt-in: existe en el documento, pero no se desarrolla en este fragment.  
\* Selector de cuenta: existe en el documento, pero no se desarrolla en este fragment.  
\* Logout global / cerrar todas las sesiones: existe en el documento, pero no se desarrolla en este fragment.  
\* Eliminación de cuenta y soft-delete: existe en el documento, pero no se desarrolla en este fragment.

**\#\#\# IGNORAR**

No se incluye contenido de módulos marcados como ignorar para esta entrega.

**\---**

**\#\# 3\. Información faltante**

| Tema | Información faltante | Por qué importa | Impacto en implementación |  
| \---- | \-------------------- | \--------------- | \------------------------- |  
| Register API | No hay endpoint, método HTTP, request/response contractual ni códigos de error backend. | El documento delega en Supabase Auth y define UI/UX, no contrato backend propio. | Implementación depende de SDK Supabase o de una definición posterior. |  
| Login API | No hay endpoint propio ni contrato request/response. | MVP exige login real. | Hay que implementar con Supabase SDK o definir wrapper API fuera de este documento. |  
| Refresh Token | No hay endpoint propio ni payload definido. | MVP exige Refresh Token. | Solo puede extraerse como manejo SupabaseSession con refresh token de 7 días. |  
| Logout API | No hay endpoint propio ni request/response. | MVP exige logout. | Solo se sabe que debe destruir sesión Supabase, limpiar storage local e invalidar token. |  
| Crear hogar durante registro | No se define flujo, pantalla, campos, API ni relación con Register. | MVP lo exige. | No puede implementarse desde este documento sin otra fuente. |  
| Contradicción Register vs crear hogar | El documento dice que Register standalone es solo credenciales \+ términos, y que el nombre se pide en onboarding. | El MVP solicitado pide crear hogar durante registro. | Extraer Register sin crear hogar y marcar creación de hogar como faltante. |  
| Invitar miembros durante onboarding | No hay pantalla, campos, API, token/código, expiración, aceptación ni estados de invitación. | MVP lo exige. | No puede implementarse desde este documento sin otra fuente. |  
| Invitación | Solo aparece un flujo de datos \`Coordinador → Invitación → Persona\`; no hay entidad Invitation implementable. | Invitaciones son parte del MVP. | Información insuficiente para crear modelo o endpoints. |  
| Aceptar invitación | No se encontró flujo. | MVP Household/Onboarding lo exige. | Faltante total. |  
| Onboarding por rol | No hay pantallas, pasos, permisos, campos ni comportamiento diferenciado por rol. | MVP lo exige. | Solo pueden extraerse roles generales, no flujo. |  
| Roles y permisos | Hay descripciones generales, pero no matriz completa por acción. | MVP necesita permisos por rol. | Implementación de permisos queda incompleta. |  
| Cuenta / Persona | No hay modelo completo ni campos técnicos. | Auth depende de estas entidades. | No se pueden definir migraciones completas. |  
| Household / Membership | Hay relaciones y estados de Membership, pero no estructura implementable completa. | Auth deriva hacia hogar después de login/register. | Hace falta otra fuente para crear hogar, membresía e invitaciones. |  
| Email verification | Register navega a verificación, pero no hay endpoint contractual. | El documento indica que email verificado es requerido. | Debe resolverse con Supabase o con definición posterior. |  
| Eventos del sistema | No hay nombres técnicos. | Puede necesitarse auditoría/event bus. | Solo se pueden registrar eventos conceptuales. |  
| Errores backend | Hay copies de UI, pero no mapping estable error-code → copy. | Necesario para frontend robusto. | Requiere definición posterior. |  
| 2FA en navegación de login | Login success puede ir a 2FA si está configurado. | El flujo de login del documento lo menciona. | Este fragment no desarrolla 2FA por alcance; hay que decidir en merge si queda POST\_MVP. |  
| Biometría en sesión expirada | SessionExpired menciona biometría como alternativa. | El documento la incluye. | Este fragment implementa contraseña; biometría queda fuera del alcance solicitado. |

**\---**

**\#\# 4\. Fuente**

\* Archivo: \`HomePlus — Diseño ed pantallas de Auth v1.md\`  
  \* Sección: Cabecera / metadata del documento.  
  \* Sección: Alineación con Final Spec V1 §03.05 y §05.11.  
  \* Sección: \`1. DIAGRAMA DE FLUJO AUTH\`.  
  \* Sección: \`2.1 LOGIN PRINCIPAL\`.  
  \* Sección: \`2.2 REGISTRO (Standalone)\`.  
  \* Sección: \`2.7 SESIÓN EXPIRADA / RE-LOGIN\`.  
  \* Sección: \`2.8 LOGOUT / CAMBIAR CUENTA\`.  
  \* Sección: \`2.8A — CONFIRMAR LOGOUT\`.  
  \* Sección: \`3. MATRIZ DE SEGURIDAD\`.  
  \* Sección: \`3.2 Principios de seguridad aplicados\`.  
  \* Sección: \`4. EDGE CASES\`.  
  \* Sección: \`4.1 Sin conexión a internet\`.  
  \* Sección: \`4.2 Token expirado\`.  
  \* Sección: \`4.3 Email ya registrado\`.  
  \* Sección: \`4.5 Múltiples dispositivos\`.  
  \* Sección: \`4.7 Intento de fuerza bruta\`.  
  \* Sección: \`4.8 Error de Supabase Auth (lado servidor)\`.  
  \* Sección: \`5. DECISIONES DE AUTH TOMADAS\`.  
\* Archivo: \`Diseño de pantallas auth.txt\`  
  \* Sección: \`OUTPUT 1 — ENTITIES\`.  
  \* Sección: \`OUTPUT 2 — RELATIONSHIPS\`.  
  \* Sección: \`OUTPUT 4 — DATA FLOWS\`.  
  \* Sección: \`OUTPUT 5 — BUSINESS RULES\`.  
  \* Sección: \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`.  
\* Archivo: \`source\_map\_HomePlus\_Disenio\_pantallas\_Auth\_v1.md\`  
  \* Sección: \`4.1 AUTH\`.  
  \* Sección: \`4.2 ONBOARDING\`.  
  \* Sección: \`8. Mapa de permisos\`.  
  \* Sección: \`9. Mapa de flujos\`.  
  \* Sección: \`10. Mapa de APIs\`.  
  \* Sección: \`11. Mapa de UI\`.  
  \* Sección: \`17. Contradicciones detectadas\`.  
  \* Sección: \`18. Información faltante\`.

**\# AUTH fragment — HomePlus — Diseño de Pantallas de Home V1**

**\#\# 1\. Información encontrada**

**\#\#\# Objetivo del módulo**

No se encontró un objetivo explícito para AUTH como módulo independiente.

El documento muestra el resultado posterior al onboarding: el usuario llega a Home en estado de primer uso, con el hogar ya listo y acciones sugeridas para comenzar.

**\#\#\# Entidades**

**\#\#\#\# Cuenta**

\* Entidad raíz del usuario.  
\* Contiene perfil, preferencias e idioma.  
\* No pertenece al hogar.

**\#\#\#\# Persona**

\* Individuo con cuenta.  
\* Se vincula con el hogar mediante membresías.

**\#\#\#\# PerfilPersonal**

\* Contiene preferencias, idioma y configuración personal.  
\* Pertenece a la Cuenta, no al hogar.

**\#\#\#\# Hogar**

\* Unidad organizativa principal del producto.  
\* En el estado post-onboarding aparece como ya creado: “Tu hogar está listo”.

**\#\#\#\# Membresía**

\* Relación entre Persona y Hogar.  
\* Posee un único rol activo.  
\* Estados encontrados: Pendiente, Activa, Suspendida, Finalizada.

**\#\#\#\# Rol**

Roles encontrados en el documento:

\* Coordinador  
\* Adulto  
\* Adolescente  
\* Niño  
\* Adulto Mayor  
\* Invitado

Mapeo para MVP solicitado:

| Nombre en documento | Nombre MVP |  
| \--- | \--- |  
| Coordinador | Coordinator |  
| Adulto | Adult |  
| Adolescente | Adolescent |  
| Niño | Child |  
| Adulto Mayor | Senior |  
| Invitado | Guest |

**\#\#\#\# Invitación**

\* Entidad conceptual para ingreso al hogar.  
\* Flujo descrito en archivo de comprensión: Invitación → Aceptación → Aprobación → Ingreso.

**\#\#\#\# HomeScreen**

\* Pantalla de destino posterior al onboarding.  
\* Se adapta por rol.

**\#\#\# Campos**

**\#\#\#\# Cuenta**

\* perfil  
\* preferencias  
\* idioma

No se encontraron tipos, validaciones ni obligatoriedad de estos campos.

**\#\#\#\# Membresía**

\* rol activo único  
\* estado

No se encontraron nombres técnicos de columnas ni tipos.

**\#\#\#\# Invitación**

No se encontraron campos técnicos.

**\#\#\# Estados posibles**

**\#\#\#\# Membresía**

Estados encontrados:

\* Pendiente  
\* Activa  
\* Suspendida  
\* Finalizada

**\#\#\#\# Home post-onboarding**

Estado encontrado:

\* Primer Uso Post-Onboarding

**\#\#\# Reglas de negocio**

\* Cuenta no pertenece al hogar.  
\* Persona se vincula con Hogar mediante Membresía.  
\* Cada Membresía tiene un único rol activo.  
\* La adaptación por rol cambia el contenido del Home, no la estructura de navegación.  
\* El usuario llega a un estado de Home posterior al onboarding.  
\* En primer uso post-onboarding, Home muestra cards de acción sugerida y empty states informativos.  
\* La transición desde primer uso a estado normal ocurre automáticamente al crear la primera tarea o después de 24 horas.

**\#\#\# Relaciones**

| Entidad origen | Relación | Entidad destino | Clasificación |  
| \--- | \--- | \--- | \--- |  
| Cuenta | owns | Persona | explícita en comprensión |  
| Membresía | links | Persona | explícita en comprensión |  
| Membresía | links | Hogar | explícita en comprensión |  
| Membresía | has\_role | Rol | explícita en comprensión |  
| Invitación | deriva en ingreso | Hogar / Membresía | conceptual |  
| HomeScreen | se adapta por | Rol | explícita en documento |

**\#\#\# Cardinalidad**

\* Una Membresía posee un único rol activo.  
\* La Cuenta no pertenece directamente al Hogar.  
\* La Persona se conecta al Hogar a través de Membresía.

No se encontraron otras cardinalidades técnicas.

**\#\#\# Flujos**

**\#\#\#\# Register**

No se encontró flujo de Register.

**\#\#\#\# Login**

No se encontró flujo de Login.

**\#\#\#\# Refresh Token**

No se encontró flujo de Refresh Token.

**\#\#\#\# Logout**

No se encontró flujo de Logout.

**\#\#\#\# Crear hogar durante registro**

No se encontró flujo de creación de hogar durante registro.

Solo se encontró una señal post-onboarding: el Home muestra “Tu hogar está listo”, lo que indica que el hogar ya existe al llegar a esa pantalla.

**\#\#\#\# Invitar miembros durante onboarding**

No se encontró flujo completo de invitación durante onboarding.

Se encontró una acción sugerida en primer uso post-onboarding:

\* “Invitá a alguien →”  
\* Texto de apoyo: “Tu hogar está solo”

**\#\#\#\# Aceptar invitación**

No se encontró pantalla ni API de aceptación de invitación.

El archivo de comprensión menciona el flujo conceptual:

\* Invitación → Aceptación → Aprobación → Ingreso

**\#\#\#\# Onboarding por rol**

Información encontrada por rol:

| Rol | Información encontrada |  
| \--- | \--- |  
| Coordinator | Home post-onboarding con hogar listo, acciones sugeridas y resumen inicial. |  
| Adult | Primer uso con briefing de bienvenida y empty states informativos. |  
| Adolescent | Primer uso con briefing de bienvenida; aparecen elementos elegidos en onboarding como avatar y color. |  
| Child | Primer uso con lista demo del onboarding completada y avatar visible. |  
| Senior | Se menciona onboarding de 3 pasos completado y datos configurados en onboarding. |  
| Guest | Se menciona onboarding mínimo y Home con empty states. |

No se encontró el flujo paso a paso de onboarding para ningún rol.

**\#\#\# APIs**

No se encontraron endpoints para:

\* Register  
\* Login  
\* Refresh Token  
\* Logout  
\* Crear hogar durante registro  
\* Invitar miembros durante onboarding  
\* Aceptar invitación  
\* Onboarding por rol

No se encontraron request, response ni errores.

**\#\#\# UI**

**\#\#\#\# Primer Uso Post-Onboarding**

Elementos encontrados:

\* Saludo al usuario.  
\* Texto: “Tu hogar está listo”.  
\* Briefing de bienvenida: “Bienvenida a tu hogar. Estas son tus primeras acciones.”  
\* Sección “Para empezar”.  
\* Card de acción: “Creá tu primera tarea →”.  
\* Card de acción: “Invitá a alguien →”.  
\* Texto de apoyo: “Tu hogar está solo”.  
\* Resumen inicial con 0 tareas y 0 eventos.

**\#\#\#\# Reglas UI relacionadas**

\* Onboarding sin tutorial.  
\* Empty states como guía.  
\* La app se aprende usándose.  
\* El empty state reemplaza tutoriales.

**\#\#\# Componentes UI**

\* Cards de acción sugerida.  
\* Empty states informativos.  
\* HomeScreen adaptada por rol.

No se encontraron componentes específicos de login, register, refresh token o logout.

**\#\#\# Navegación**

\* Después del onboarding, el usuario cae en Home.  
\* Bottom Nav se mantiene igual para todos los roles.  
\* La adaptación por rol cambia el contenido disponible, no la estructura de navegación.

**\#\#\# Eventos del sistema**

No se encontraron nombres técnicos de eventos de Auth.

Eventos conceptuales encontrados:

| Evento conceptual | Cuándo ocurre | Resultado |  
| \--- | \--- | \--- |  
| usuario completa onboarding | Al completar onboarding o al primer uso tras instalación | Home entra en estado Primer Uso |  
| primera tarea creada | Al crear la primera tarea | Home pasa automáticamente a estado Normal |  
| paso de tiempo | Después de 24 horas en primer uso | Home pasa automáticamente a estado Normal |

**\#\#\# Dependencias**

\* AUTH depende de Cuenta y Persona, pero el documento no define autenticación.  
\* ONBOARDING depende de Hogar, Membresía, Rol e Invitación, pero sin contratos completos.  
\* Home necesita rol/membresía para adaptar contenido post-onboarding.

**\#\#\# Restricciones arquitectónicas**

\* Cuenta no pertenece al hogar.  
\* Persona se relaciona con Hogar mediante Membresía.  
\* La adaptación por rol no cambia la navegación base.  
\* No se encontraron políticas técnicas de sesión, tokens, RLS, expiración ni revocación.

**\#\#\# Casos de uso**

**\#\#\#\# Primer uso posterior al onboarding**

El usuario entra a Home después de onboarding. La pantalla muestra que el hogar está listo y ofrece acciones iniciales.

**\#\#\#\# Invitación sugerida**

Si el hogar está solo, Home sugiere invitar a alguien.

**\#\#\#\# Onboarding sin tutorial**

La guía inicial ocurre mediante empty states y cards de acción sugerida, no mediante tutorial separado.

**\#\#\# Casos especiales / Edge cases**

\* Usuario recién instalado o que completa onboarding entra en Primer Uso.  
\* Si crea la primera tarea, el Home pasa a Normal.  
\* Si pasan 24 horas, el Home pasa a Normal.  
\* No se encontró caso de usuario sin hogar.  
\* No se encontró caso de invitación expirada.  
\* No se encontró caso de sesión expirada.  
\* No se encontró caso de logout offline.

**\#\#\# Datos mockeados**

No se encontraron datos mockeados específicos de Auth.

El estado inicial post-onboarding usa datos simples de Home para orientar al usuario, pero no define mocks de Auth.

**\#\#\# Funcionalidades REAL**

\* Cuenta como entidad raíz del usuario.  
\* Persona vinculada a Cuenta.  
\* Persona vinculada a Hogar mediante Membresía.  
\* Membresía con rol activo único.  
\* Roles usados para adaptar el Home post-onboarding.  
\* Estado Primer Uso Post-Onboarding.  
\* Cards de acción inicial post-onboarding.  
\* Invitación sugerida como acción inicial.

**\#\#\# Funcionalidades MOCK**

No se encontró funcionalidad MOCK propia de Auth.

**\#\#\# Funcionalidades POST\_MVP**

\* Detalles visuales de onboarding por rol como avatar/color/lista demo solo aparecen como señales de experiencia post-onboarding y no definen flujo MVP obligatorio.

**\---**

**\#\# 2\. Clasificación para implementación**

**\#\#\# REAL**

\* Modelar separación conceptual entre Cuenta y Hogar.  
\* Modelar Persona como sujeto vinculado a la Cuenta.  
\* Modelar Membresía como relación Persona ↔ Hogar.  
\* Asociar un único rol activo a cada Membresía.  
\* Considerar roles MVP mapeados desde español:  
  \* Coordinador → Coordinator  
  \* Adulto → Adult  
  \* Adolescente → Adolescent  
  \* Niño → Child  
  \* Adulto Mayor → Senior  
  \* Invitado → Guest  
\* Al finalizar onboarding, dirigir al usuario a Home en estado de Primer Uso.  
\* En Primer Uso Post-Onboarding, mostrar acciones sugeridas:  
  \* Crear primera tarea.  
  \* Invitar a alguien.  
\* Usar empty states como guía inicial en lugar de tutorial.  
\* Cambiar de Primer Uso a Normal cuando se crea la primera tarea o después de 24 horas.

**\#\#\# MOCK**

No se encontró MOCK propio para Auth.

**\#\#\# POST\_MVP**

\* Detalles de personalización post-onboarding por rol que no definen flujos de Auth:  
  \* avatar/color visible para Adolescente.  
  \* avatar visible para Niño.  
  \* lista demo del onboarding para Niño.  
  \* onboarding de 3 pasos mencionado para Senior.

**\#\#\# IGNORAR**

No se incluye contenido ignorado.

**\---**

**\#\# 3\. Información faltante**

| Área | Información faltante | Por qué importa | Impacto |  
| \--- | \--- | \--- | \--- |  
| Register | Flujo completo de registro | MVP obligatorio | No se puede implementar desde este documento. |  
| Register | Campos, tipos y validaciones | Formulario y backend | Requiere otra fuente. |  
| Register | Creación de Cuenta/Persona | Modelo de usuario | Solo hay entidades conceptuales. |  
| Login | Flujo completo de login | MVP obligatorio | No se puede implementar desde este documento. |  
| Login | Credenciales, errores y sesión | Seguridad | Requiere otra fuente. |  
| Refresh Token | Entidad token, expiración, rotación, revocación | Seguridad | No aparece. |  
| Logout | Invalidación de sesión/token | Seguridad | No aparece. |  
| Crear hogar durante registro | Pasos, UI, API y relación con register | MVP obligatorio | Solo aparece “Tu hogar está listo” posterior. |  
| Invitar miembros durante onboarding | Formulario, permisos, token/código, expiración | MVP obligatorio | Solo aparece una card de acción sugerida. |  
| Aceptar invitación | Pantalla, token/código, estados técnicos | MVP obligatorio | Solo aparece flujo conceptual en comprensión. |  
| Onboarding por rol | Pasos concretos por rol | MVP obligatorio | Solo se ven resultados post-onboarding por rol. |  
| Roles | Permisos backend por rol | Seguridad | Documento define visibilidad de Home, no permisos de Auth. |  
| Membresía | Campos técnicos y transiciones de estado | DB/API | Solo hay definición conceptual. |  
| APIs | Endpoints, request, response, errores | Implementación backend | No encontrados. |  
| Eventos técnicos | auth.registered, auth.logged\_in, auth.logged\_out, auth.token\_refreshed | Integración y auditoría | No encontrados. |  
| Seguridad | RLS, hashing, sesiones, cookies, JWT, refresh token, single-use tokens | Seguridad Auth | No encontrados. |

**\#\#\# Contradicciones o riesgos**

\* El documento se centra en Home, no en Auth.  
\* “Primer Uso Post-Onboarding” no debe confundirse con el flujo de onboarding completo.  
\* “Tu hogar está listo” indica un resultado, no define cómo se crea el hogar.  
\* “Invitá a alguien” indica una acción sugerida, no define invitaciones implementables.  
\* La comprensión menciona Invitación → Aceptación → Aprobación → Ingreso, pero no define estados técnicos, token ni expiración.  
\* Los roles aparecen como adaptación visual de Home, no como matriz completa de permisos backend.  
\* La información encontrada no alcanza para implementar Register/Login/Refresh/Logout.

**\---**

**\#\# 4\. Fuente**

\* Archivo: \`HomePlus — Diseño de Pantallas de Home V1.md\`  
  \* Sección: Encabezado / Alcance.  
  \* Sección: \`0.4 Reglas Universales del Home\`.  
  \* Sección: \`0.5 Bottom Navigation — Congelada para todos los roles\`.  
  \* Sección: \`1.5 Estados del Home — Coordinador\` → \`Estado 6: Primer Uso Post-Onboarding\`.  
  \* Sección: \`3.6 Estados del Home — Adolescente\`.  
  \* Sección: \`4.5 Contenido de Cada Bloque — Niño\`.  
  \* Sección: \`4.7 Estados del Home — Niño\`.  
  \* Sección: \`5.5 Contenido de Cada Bloque — Adulto Mayor\`.  
  \* Sección: \`5.6 Estados del Home — Adulto Mayor\`.  
  \* Sección: \`6.6 Estados del Home — Invitado\`.  
  \* Sección: \`9.2 Cualquier Estado → PRIMER USO\`.  
\* Archivo: \`Diseño de pantallas home v1.txt\`  
  \* Sección: \`OUTPUT 1 — ENTITIES\`.  
  \* Sección: \`OUTPUT 2 — RELATIONSHIPS\`.  
  \* Sección: \`OUTPUT 5 — BUSINESS RULES\`.  
  \* Sección: \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`.  
\* Archivo: \`source\_map\_HomePlus\_Diseno\_de\_Pantallas\_de\_Home\_V1.md\`  
  \* Sección: \`4.1 AUTH\`.  
  \* Sección: \`4.2 ONBOARDING\`.  
  \* Sección: \`7. Mapa de estados\`.  
  \* Sección: \`9. Mapa de flujos\`.  
  \* Sección: \`10. Mapa de APIs\`.  
  \* Sección: \`11. Mapa de UI\`.  
  \* Sección: \`12. Mapa de eventos del sistema\`.  
  \* Sección: \`13. Restricciones arquitectónicas detectadas\`.  
  \* Sección: \`18. Información faltante\`.  
  \* Sección: \`19. Recomendación de fragments a generar\`.

