# AUTH fragment — HomePlus — UX writing guide para geni

## 1. Información encontrada

### Objetivo del módulo

El documento no define AUTH como módulo técnico. La información útil para AUTH aparece de forma indirecta en:

* identidad de cuenta/persona/perfil;
* onboarding inicial;
* configuración inicial del hogar;
* selección de rol;
* invitación a miembros;
* copy de sesión expirada;
* permisos visibles en copy de error.

### Entidades

| Entidad | Información explícita encontrada | Uso para este fragment |
| ------- | -------------------------------- | ---------------------- |
| Cuenta | Pertenece al usuario, no al hogar. Incluye perfil, preferencias, idioma y configuración personal. | Base conceptual de Account/User. No se definen credenciales ni tokens. |
| Persona | Representa a un miembro. Pertenece a una Cuenta. | Identidad operativa dentro del hogar. |
| PerfilPersonal | Pertenece a la Cuenta. Incluye preferencias, idioma y configuración personal. | Fuente de preferencia de tratamiento/tono. |
| Hogar | Unidad organizativa principal. Todo ocurre dentro de un hogar. | Se crea/configura durante onboarding. |
| Membresía | Relación entre Persona y Hogar. | Relación necesaria para ingreso al hogar. |
| Invitación | Flujo de ingreso: Invitación → Aceptación → Aprobación → Ingreso al hogar. | Base conceptual de invitaciones durante onboarding. |
| Rol | Define tratamiento, visibilidad y restricciones por miembro. | Usado en onboarding por rol. |

No se encuentran entidades explícitas para:

* Session;
* Token;
* RefreshToken;
* Password;
* LoginCredential;
* RegisterRequest;
* AuthProvider.

### Campos

#### Campos presentes para onboarding

| Campo | Información encontrada | Detalle |
| ----- | ---------------------- | ------- |
| Nombre del hogar | Pregunta: “¿Cómo le dicen a su casa?” | Placeholder: “Casa de los Robles”. |
| Rol | Pregunta: “¿Cuál es su rol en el hogar?” | Opciones mostradas en onboarding: Coordinador, Adulto, Adolescente, Niño, Adulto Mayor. |
| Preferencia horaria | Pregunta: “¿A qué hora prefiere que le avise de las cosas del día?” | No se define tipo ni formato. |
| Tono / tratamiento | Pregunta: “¿Cómo quiere que le hable?” | Ejemplos: “Mariana / Sra. García”. |
| Preferencias personales | Asociadas a Cuenta / PerfilPersonal. | No se detalla esquema. |
| Idioma | Asociado a Cuenta / PerfilPersonal. | No se detalla esquema. |
| Configuración personal | Asociada a Cuenta / PerfilPersonal. | No se detalla esquema. |

#### Campos no encontrados para AUTH técnico

No se encuentran campos para:

* email;
* password;
* password_hash;
* access_token;
* refresh_token;
* expires_at;
* device_id;
* session_id;
* logout_at;
* last_login_at.

### Tipos

* El documento indica idioma general del producto: Castellano LATAM.
* El documento indica formato de producto: Mobile-first.
* No hay tipos técnicos para campos de AUTH.
* No hay tipos técnicos para campos de onboarding.

### Valores por defecto

* Durante onboarding, el tratamiento por defecto es **usted**.
* El tuteo se activa solo después de que el usuario configura su preferencia de tratamiento en el perfil.
* En el campo “Nombre del hogar”, el placeholder es “Casa de los Robles”.

### Restricciones

* La Cuenta pertenece al usuario, no al hogar.
* La Persona pertenece a una Cuenta.
* La Membresía vincula Persona y Hogar.
* La selección y presentación por rol debe respetar el tratamiento definido para cada rol.
* Cada miembro ve solo lo que le corresponde.
* La privacidad es prioridad en HomePlus.
* El Invitado no recibe contexto del hogar, no ve nombres de otros miembros, no ve tareas ajenas y no ve métricas familiares.
* El Niño y el Adolescente usan siempre nombre de pila; no apellido; no diminutivo salvo configuración explícita por la familia.
* Adulto y Adulto Mayor usan el nombre exacto configurado en el perfil; se respetan “Doña” y “Don” si fueron ingresados.
* Coordinador puede ver información que otros roles no ven.

### Relaciones

| Origen | Relación | Destino | Clasificación |
| ------ | -------- | ------- | ------------- |
| Cuenta | owns / pertenece a | Persona | Explícita en archivo de comprensión. |
| Persona | belongs_to / participa en | Hogar | Explícita en archivo de comprensión. |
| Membresía | links | Persona | Explícita en archivo de comprensión. |
| Membresía | links | Hogar | Explícita en archivo de comprensión. |
| Membresía | has | Rol | Explícita en archivo de comprensión. |
| Persona | has | PerfilPersonal | Explícita en archivo de comprensión. |
| Coordinador | can_approve | Invitación | Explícita en archivo de comprensión. |
| Adulto | can_create | Invitación | Explícita en archivo de comprensión. |

### Cardinalidad

* Persona pertenece a una Cuenta.
* Membresía relaciona una Persona con un Hogar.
* No se especifican cardinalidades técnicas adicionales.

### Estados posibles

#### Estados encontrados

| Entidad / Caso | Estados o situaciones encontradas |
| -------------- | --------------------------------- |
| Membresía | Pendiente, Activa, Suspendida, Finalizada. |
| Invitación | Flujo conceptual: Invitación → Aceptación → Aprobación → Ingreso al hogar. |
| Sesión | Sesión expirada. |

#### Estados no encontrados

No se definen estados para:

* sesión activa;
* sesión revocada;
* token válido;
* token expirado;
* refresh token usado;
* refresh token revocado;
* usuario registrado;
* usuario verificado.

### Reglas de negocio

#### AUTH

* El único comportamiento relacionado con sesión es el estado de sesión expirada.
* Copy para sesión expirada: “Tu sesión terminó por seguridad. Volvé a entrar, es rápido.”
* El documento no describe login, register, refresh token ni logout como flujos técnicos.

#### ONBOARDING

* El onboarding configura el hogar inicial.
* El onboarding solicita el nombre del hogar.
* El onboarding solicita el rol del usuario en el hogar.
* El onboarding solicita preferencia horaria.
* El onboarding solicita preferencia de tono/tratamiento.
* Durante onboarding se usa “usted” como tratamiento por defecto.
* El tuteo solo se activa después de configurar la preferencia de tratamiento.
* Después del primer paso se invita a sumar miembros del hogar.
* Después de invitar, el copy indica que la invitación fue enviada y que los miembros aparecerán cuando acepten.
* El estado sin invitados debe comunicar privacidad: “Cada miembro ve solo lo que le corresponde. La privacidad es prioridad en HomePlus.”

#### Roles en onboarding / tratamiento

| Rol del documento | Mapeo MVP | Información encontrada |
| ----------------- | --------- | ---------------------- |
| Coordinador | Coordinator | Tono de colega, informativo, respetuoso y directo. Puede ver información que otros roles no ven. |
| Adulto | Adult | Tono de par, cálido, colaborativo, sin autoridad. Tratamiento: usted o nombre según preferencia del perfil. |
| Adolescente | Adolescent | Tono de mentor joven, motivacional, sin condescendencia. Tratamiento por nombre de pila. |
| Niño | Child | Tono acompañante lúdico, simple, visual y positivo. Tratamiento por nombre de pila. |
| Adulto Mayor | Senior | Tono paciente, claro, con prioridad en lo esencial. Tratamiento: usted + nombre. |
| Invitado | Guest | Tono neutral, funcional, con contexto mínimo. Tratamiento: usted. |

### Permisos

| Rol | Permiso / restricción encontrada | Fuente documental |
| --- | -------------------------------- | ----------------- |
| Coordinador / Coordinator | Puede ver información que otros roles no ven. | Tabla de tono por rol y reglas de tratamiento. |
| Coordinador / Coordinator | Puede aprobar invitaciones. | Archivo de comprensión asociado. |
| Adulto / Adult | Puede crear invitaciones. | Archivo de comprensión asociado. |
| Invitado / Guest | No recibe contexto del hogar. | Reglas de tratamiento. |
| Invitado / Guest | No ve nombres de otros miembros. | Reglas de tratamiento. |
| Invitado / Guest | No ve tareas ajenas. | Reglas de tratamiento. |
| Invitado / Guest | No ve métricas familiares. | Reglas de tratamiento. |
| Niño / Child | Ante permiso denegado, copy específico: “Esta sección es solo para adultos del hogar.” | Errores y edge cases. |

No se encuentran permisos completos para:

* Register;
* Login;
* Refresh Token;
* Logout;
* creación de hogar;
* aceptación de invitación;
* cambio de rol durante onboarding.

### Flujos

#### Register

No se encuentra flujo técnico de Register.

Información relacionada encontrada:

1. Pantalla Splash: “HomePlus — Todo tu hogar en un solo lugar.”
2. Pantalla Inicio: “Bienvenida, Mariana. Vamos a configurar tu hogar en 3 minutos.”
3. Configuración inicial del hogar y perfil.

No se indica si Register ocurre antes, durante o después de estas pantallas.

#### Login

No se encuentra flujo técnico de Login.

Información relacionada encontrada:

* Copy de sesión expirada: “Tu sesión terminó por seguridad. Volvé a entrar, es rápido.”

El documento sugiere una acción de volver a entrar, pero no define pantalla, credenciales, endpoint ni respuesta.

#### Refresh Token

No se encuentra información sobre Refresh Token.

#### Logout

No se encuentra información sobre Logout.

#### Crear hogar durante registro / onboarding

Flujo conceptual encontrado:

1. Inicio de onboarding: “Vamos a configurar tu hogar en 3 minutos.”
2. Pregunta de nombre del hogar: “¿Cómo le dicen a su casa?”
3. Placeholder: “Casa de los Robles”.
4. Primer valor visible: “Primer paso listo. Ahora sumemos a los miembros del hogar.”
5. Copy alternativo: “Ya tiene su espacio. Cuando invite a alguien, todo se conecta solo.”

El documento habla de “hogar”, “casa” y “espacio”. No define si estas etiquetas representan la misma entidad técnica, aunque el archivo de comprensión define Hogar como unidad organizativa principal.

#### Invitar miembros durante onboarding

Flujo conceptual encontrado:

1. Pantalla de invitación: “HomePlus funciona mejor con todos. ¿A quién invita primero?”
2. Después de invitar: “Invitación enviada. Cuando la acepten, aparecen acá.”
3. Sin invitados todavía: “Cada miembro ve solo lo que le corresponde. La privacidad es prioridad en HomePlus.”
4. Empty state adicional: “Todavía no hay miembros invitados. ¿Agregamos al primero?”

El archivo de comprensión asociado define el flujo de ingreso como:

1. Invitación.
2. Aceptación.
3. Aprobación.
4. Ingreso al hogar.

#### Aceptar invitación

Se encuentra mención indirecta: “Cuando la acepten, aparecen acá.”

No se encuentra pantalla ni contrato técnico de aceptación de invitación.

#### Onboarding por rol

Información encontrada:

1. El onboarding pregunta: “¿Cuál es su rol en el hogar?”
2. Opciones mostradas en esa pregunta: Coordinador, Adulto, Adolescente, Niño, Adulto Mayor.
3. La tabla de tono por rol también define Invitado.
4. El tratamiento y la visibilidad cambian por rol.

### APIs

No hay APIs definidas.

| Acción | Método | Ruta | Request | Response | Errores | Estado |
| ------ | ------ | ---- | ------- | -------- | ------- | ------ |
| Register | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado |
| Login | No encontrado | No encontrado | No encontrado | No encontrado | Sesión expirada aparece como edge case de UI, no como error API. | No encontrado |
| Refresh Token | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado |
| Logout | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado |
| Crear hogar | No encontrado | No encontrado | Acción mencionada sin contrato API. | No encontrado | No encontrado | Parcial / mencionado sin detalle |
| Invitar miembro | No encontrado | No encontrado | Acción mencionada sin contrato API. | No encontrado | No encontrado | Parcial / mencionado sin detalle |
| Aceptar invitación | No encontrado | No encontrado | Acción mencionada indirectamente sin contrato API. | No encontrado | No encontrado | Parcial / mencionado sin detalle |

### Request

No se encuentran estructuras de request.

### Response

No se encuentran estructuras de response.

### UI

#### Pantallas / componentes encontrados

| Pantalla / Componente | Información encontrada |
| --------------------- | ---------------------- |
| Splash | “HomePlus — Todo tu hogar en un solo lugar.” |
| Inicio de onboarding | “Bienvenida, Mariana. Vamos a configurar tu hogar en 3 minutos.” |
| Pregunta nombre del hogar | “¿Cómo le dicen a su casa?” Placeholder: “Casa de los Robles”. |
| Pregunta rol | “¿Cuál es su rol en el hogar?” Opciones: Coordinador, Adulto, Adolescente, Niño, Adulto Mayor. |
| Pregunta preferencia horaria | “¿A qué hora prefiere que le avise de las cosas del día?” |
| Pregunta tono / tratamiento | “¿Cómo quiere que le hable?” Ejemplos: “Mariana / Sra. García”. |
| Primer valor visible | “Primer paso listo. Ahora sumemos a los miembros del hogar.” |
| Espacio creado | “Ya tiene su espacio. Cuando invite a alguien, todo se conecta solo.” |
| Pantalla de invitación | “HomePlus funciona mejor con todos. ¿A quién invita primero?” |
| Después de invitar | “Invitación enviada. Cuando la acepten, aparecen acá.” |
| Sin invitados todavía | “Cada miembro ve solo lo que le corresponde. La privacidad es prioridad en HomePlus.” |
| Empty state sin miembros invitados | “Todavía no hay miembros invitados. ¿Agregamos al primero?” |
| Sesión expirada | “Tu sesión terminó por seguridad. Volvé a entrar, es rápido.” |
| Permiso denegado general | “No tenés acceso a esta sección. Solo visible para el Coordinador del hogar.” |
| Permiso denegado Niño | “Esta sección es solo para adultos del hogar.” |
| Error al guardar | “No se pudo guardar. ¿Probás de nuevo? Si persiste, revisamos la conexión.” |
| Datos inconsistentes | “Hay un dato que no coincide. ¿Lo revisamos juntos?” |

### Componentes UI

* Pantalla de bienvenida.
* Preguntas de personalización.
* Pantalla de invitación.
* Estado vacío sin invitados.
* Mensaje de sesión expirada.
* Mensaje de permiso denegado.
* Mensaje de error al guardar.
* Mensaje de datos inconsistentes.

No se encuentran componentes técnicos como:

* formulario de email/password;
* formulario de login;
* recuperación de contraseña;
* pantalla de refresh token;
* botón de logout;
* verificación de email;
* aceptación de invitación por token/código.

### Navegación

* El documento no define navegación técnica para AUTH.
* El onboarding fluye desde bienvenida hacia configuración del hogar y luego invitación de miembros.
* No se define ruta ni stack de navegación.

### Eventos del sistema

No se encuentran nombres técnicos de eventos.

Eventos conceptuales presentes:

| Evento conceptual | Cuándo ocurre | Qué produce |
| ----------------- | ------------- | ----------- |
| Sesión expirada | Cuando termina la sesión por seguridad. | El usuario debe volver a entrar. |
| Hogar configurado / espacio creado | Luego del primer paso de onboarding. | Se invita a sumar miembros. |
| Invitación enviada | Después de invitar a un miembro. | El invitado aparece cuando acepte. |
| Invitación aceptada | Mencionada indirectamente. | El miembro aparece en el hogar. |

No se encuentran eventos técnicos como:

* `auth.registered`;
* `auth.logged_in`;
* `auth.logged_out`;
* `auth.token_refreshed`;
* `household.created`;
* `invitation.created`;
* `invitation.accepted`.

### Dependencias

* AUTH depende de Cuenta / Persona / PerfilPersonal para identidad de usuario.
* Onboarding depende de Hogar para configurar el espacio inicial.
* Onboarding depende de Rol para adaptar tono, tratamiento y visibilidad.
* Invitaciones dependen de Hogar, Persona/Membresía y Rol.
* Permisos afectan mensajes de acceso denegado y visibilidad.

### Restricciones arquitectónicas

* La Cuenta pertenece al usuario, no al hogar.
* Hogar es la unidad organizativa principal.
* Todo ocurre dentro de un hogar.
* Cada miembro ve solo lo que le corresponde.
* Invitado tiene acceso mínimo y sin contexto del hogar.
* Coordinador tiene visibilidad ampliada.
* El tratamiento por defecto durante onboarding es “usted”.

### Casos de uso

| Caso de uso | Información encontrada |
| ----------- | ---------------------- |
| Configurar hogar inicial | Pregunta por nombre del hogar y copy de espacio creado. |
| Seleccionar rol | Pregunta de rol con opciones explícitas. |
| Configurar tratamiento | Pregunta de tono/tratamiento y regla de usted por defecto. |
| Configurar horario de avisos | Pregunta de preferencia horaria. |
| Invitar miembro | Pantalla de invitación y confirmación de envío. |
| Ver estado sin invitados | Empty state de miembros invitados y copy de privacidad. |
| Volver a entrar por sesión expirada | Copy de sesión expirada. |
| Mostrar permiso denegado | Copy general y copy específico para Niño. |

### Casos especiales

* La pregunta de rol de onboarding no incluye Invitado, aunque Invitado sí aparece como rol en la tabla de tono.
* Coordinador ve información que otros roles no ven.
* Invitado no ve contexto del hogar ni datos de otros miembros.
* Niño recibe un copy de permiso denegado específico.
* El tuteo no se usa por defecto durante onboarding.

### Edge cases

| Edge case | Copy / información encontrada |
| --------- | ----------------------------- |
| Sesión expirada | “Tu sesión terminó por seguridad. Volvé a entrar, es rápido.” |
| Permiso denegado general | “No tenés acceso a esta sección. Solo visible para el Coordinador del hogar.” |
| Permiso denegado Niño | “Esta sección es solo para adultos del hogar.” |
| Error al guardar | “No se pudo guardar. ¿Probás de nuevo? Si persiste, revisamos la conexión.” |
| Datos inconsistentes | “Hay un dato que no coincide. ¿Lo revisamos juntos?” |
| Sin invitados todavía | “Cada miembro ve solo lo que le corresponde. La privacidad es prioridad en HomePlus.” |
| Sin miembros invitados | “Todavía no hay miembros invitados. ¿Agregamos al primero?” |

### Datos mockeados

No se detectan datos mockeados para AUTH + ONBOARDING en este documento.

### Funcionalidades REAL

* Identidad conceptual por Cuenta / Persona / PerfilPersonal.
* Configuración inicial del hogar durante onboarding.
* Selección de rol durante onboarding.
* Configuración de preferencia horaria.
* Configuración de tono/tratamiento.
* Invitación de miembros durante onboarding.
* Estado de invitación enviada.
* Mención indirecta de aceptación de invitación.
* Tratamiento por rol.
* Restricciones de visibilidad para Invitado.
* Copy de sesión expirada.
* Copy de permiso denegado.

### Funcionalidades MOCK

No se detectan funcionalidades MOCK para AUTH + ONBOARDING.

### Funcionalidades POST_MVP

* Permisos adicionales configurables para Adolescente aparecen asociados al rol, pero no se desarrollan para MVP.

## 2. Clasificación para implementación

### REAL

#### AUTH

* Usar Cuenta / Persona / PerfilPersonal como conceptos de identidad presentes en el documento.
* Implementar copy de sesión expirada si existe una pantalla/estado de sesión vencida en el MVP.
* Respetar que la Cuenta pertenece al usuario y no al hogar.
* Respetar que Persona pertenece a Cuenta y se vincula con Hogar mediante Membresía.

#### ONBOARDING

* Pantalla de bienvenida.
* Pregunta por nombre del hogar.
* Placeholder de nombre del hogar: “Casa de los Robles”.
* Pregunta por rol.
* Opciones de rol explícitas en onboarding: Coordinador, Adulto, Adolescente, Niño, Adulto Mayor.
* Configuración de preferencia horaria.
* Configuración de tono/tratamiento.
* Tratamiento por defecto: usted.
* Activación del tuteo solo luego de configurar preferencia.
* Crear/configurar hogar inicial durante onboarding como flujo conceptual.
* Invitar miembros durante onboarding.
* Confirmar invitación enviada.
* Mostrar estado sin invitados.
* Mostrar privacidad: cada miembro ve solo lo que le corresponde.
* Usar la tabla de tono por rol para adaptar microcopy por rol MVP.

#### HOUSEHOLD dentro de onboarding

* Hogar como unidad organizativa principal.
* Todo ocurre dentro de un hogar.
* Membresía como relación Persona-Hogar.
* Invitación como flujo de ingreso.

#### Roles MVP encontrados

* Coordinador → Coordinator.
* Adulto → Adult.
* Adolescente → Adolescent.
* Niño → Child.
* Adulto Mayor → Senior.
* Invitado → Guest.

### MOCK

No se encontró información que deba simularse como MOCK para AUTH + ONBOARDING en este documento.

### POST_MVP

* Permisos adicionales configurables para Adolescente: mencionados en archivo de comprensión, pero no detallados para implementación MVP.

### IGNORAR

No se incluye contenido de temas fuera de alcance.

## 3. Información faltante

| Tema | Información faltante | Por qué importa | Impacto en implementación |
| ---- | -------------------- | --------------- | ------------------------- |
| Register | No hay flujo técnico, campos, validaciones, request, response ni errores. | Register es parte obligatoria del MVP AUTH. | No permite implementar registro real desde este documento. |
| Login | No hay pantalla, credenciales, contrato API ni errores de login. | Login es parte obligatoria del MVP AUTH. | Solo hay copy de sesión expirada; falta todo el flujo real. |
| Refresh Token | No hay entidad, endpoint, estados ni reglas de refresh token. | Refresh Token es parte obligatoria del MVP AUTH. | No implementable desde este documento. |
| Logout | No hay flujo, endpoint ni evento de logout. | Logout es parte obligatoria del MVP AUTH. | No implementable desde este documento. |
| Session / Token | No hay modelo de sesión ni token. | Necesario para AUTH real. | Falta diseño completo. |
| Crear hogar durante registro | Hay copy y flujo conceptual, pero no hay entidad técnica detallada ni endpoint. | Crear hogar durante registro/onboarding es obligatorio. | Implementación requiere otra fuente. |
| Primer usuario / Coordinador | No se aclara si el primer usuario creado queda como Coordinador. | Afecta permisos iniciales del hogar. | Regla crítica pendiente. |
| Invitación | Hay flujo conceptual y copy, pero no hay campos, token/código, expiración ni errores. | Invitaciones son parte del MVP. | Implementación requiere otra fuente. |
| Aceptar invitación | Solo aparece “Cuando la acepten”. No hay pantalla ni contrato. | Aceptar invitación es parte del MVP. | Implementación requiere otra fuente. |
| Aprobación de invitación | Archivo asociado menciona aprobación, pero no define cuándo aplica ni quién la ejecuta salvo relación Coordinador-aprueba. | Afecta ingreso al hogar. | Regla incompleta. |
| Roles disponibles en onboarding | La pregunta de onboarding lista Coordinador, Adulto, Adolescente, Niño y Adulto Mayor; Invitado aparece como rol, pero no como opción de onboarding. | El MVP incluye Guest. | Contradicción/parcialidad a resolver en merge. |
| Permisos | Hay restricciones de visibilidad y algunos permisos, pero no matriz completa. | Roles y permisos afectan onboarding, invitación y acceso. | No alcanza para implementar RBAC completo. |
| Campos de Cuenta | Cuenta incluye perfil/preferencias/idioma/configuración, pero sin tipos ni estructura. | Necesario para modelo de usuario. | Requiere definición externa. |
| Campos de Persona | Persona representa miembro y pertenece a Cuenta, pero no se listan campos. | Necesario para membership/onboarding. | Requiere definición externa. |
| PerfilPersonal | Se mencionan preferencias, idioma y configuración, sin esquema. | Necesario para tono/tratamiento. | Requiere definición externa. |
| Estados de Membresía | Se listan Pendiente, Activa, Suspendida, Finalizada; no se define transición. | Afecta invitación/ingreso. | Flujos incompletos. |
| UI de login/register | No hay estructura UI para login/register. | AUTH requiere pantallas. | No se puede extraer UI final. |
| Errores API | No hay códigos ni estructura de error. | Necesario para frontend/backend. | Debe completarse con otra fuente. |
| Eventos del sistema | No hay nombres técnicos de eventos. | Útil para auditoría/integraciones. | No implementable desde este documento. |

## 4. Fuente

* Archivo: `HomePlus — UX writing guide para geni(1).md`
  * Sección: Frontmatter — título, versión, idioma, formato.
  * Sección: `## 2. TABLA DE TONO POR ROL`.
  * Sección: `### 2.1 Reglas de tratamiento`.
  * Sección: `### 3.3 EMPTY STATES`.
  * Sección: `### 3.4 ERRORES Y EDGE CASES`.
  * Sección: `### 3.5 ONBOARDING`.
* Archivo: `UX writing guide para geni(1).txt`
  * Sección: `OUTPUT 1 — ENTITIES`.
  * Sección: `OUTPUT 2 — RELATIONSHIPS`.
  * Sección: `OUTPUT 5 — BUSINESS RULES`.
  * Sección: `OUTPUT 6 — ARCHITECTURAL DECISIONS`.
  * Sección: `OUTPUT 7 — MISSING / IMPLICIT CONNECTIONS`.
* Archivo: `source_map_HomePlus_UX_writing_guide_para_geni.md`
  * Sección: `4.1 AUTH`.
  * Sección: `4.2 ONBOARDING`.
  * Sección: `5. Mapa de entidades`.
  * Sección: `6. Mapa de relaciones`.
  * Sección: `7. Mapa de estados`.
  * Sección: `8. Mapa de permisos`.
  * Sección: `9. Mapa de flujos`.
  * Sección: `10. Mapa de APIs`.
  * Sección: `11. Mapa de UI`.
  * Sección: `18. Información faltante`.
