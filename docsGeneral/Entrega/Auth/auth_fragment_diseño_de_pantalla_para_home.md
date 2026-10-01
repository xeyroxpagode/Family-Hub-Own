# AUTH fragment — HomePlus — Diseño de Pantallas de Home V1

## 1. Información encontrada

### Objetivo del módulo

No se encontró un objetivo explícito para AUTH como módulo independiente.

El documento muestra el resultado posterior al onboarding: el usuario llega a Home en estado de primer uso, con el hogar ya listo y acciones sugeridas para comenzar.

### Entidades

#### Cuenta

* Entidad raíz del usuario.
* Contiene perfil, preferencias e idioma.
* No pertenece al hogar.

#### Persona

* Individuo con cuenta.
* Se vincula con el hogar mediante membresías.

#### PerfilPersonal

* Contiene preferencias, idioma y configuración personal.
* Pertenece a la Cuenta, no al hogar.

#### Hogar

* Unidad organizativa principal del producto.
* En el estado post-onboarding aparece como ya creado: “Tu hogar está listo”.

#### Membresía

* Relación entre Persona y Hogar.
* Posee un único rol activo.
* Estados encontrados: Pendiente, Activa, Suspendida, Finalizada.

#### Rol

Roles encontrados en el documento:

* Coordinador
* Adulto
* Adolescente
* Niño
* Adulto Mayor
* Invitado

Mapeo para MVP solicitado:

| Nombre en documento | Nombre MVP |
| --- | --- |
| Coordinador | Coordinator |
| Adulto | Adult |
| Adolescente | Adolescent |
| Niño | Child |
| Adulto Mayor | Senior |
| Invitado | Guest |

#### Invitación

* Entidad conceptual para ingreso al hogar.
* Flujo descrito en archivo de comprensión: Invitación → Aceptación → Aprobación → Ingreso.

#### HomeScreen

* Pantalla de destino posterior al onboarding.
* Se adapta por rol.

### Campos

#### Cuenta

* perfil
* preferencias
* idioma

No se encontraron tipos, validaciones ni obligatoriedad de estos campos.

#### Membresía

* rol activo único
* estado

No se encontraron nombres técnicos de columnas ni tipos.

#### Invitación

No se encontraron campos técnicos.

### Estados posibles

#### Membresía

Estados encontrados:

* Pendiente
* Activa
* Suspendida
* Finalizada

#### Home post-onboarding

Estado encontrado:

* Primer Uso Post-Onboarding

### Reglas de negocio

* Cuenta no pertenece al hogar.
* Persona se vincula con Hogar mediante Membresía.
* Cada Membresía tiene un único rol activo.
* La adaptación por rol cambia el contenido del Home, no la estructura de navegación.
* El usuario llega a un estado de Home posterior al onboarding.
* En primer uso post-onboarding, Home muestra cards de acción sugerida y empty states informativos.
* La transición desde primer uso a estado normal ocurre automáticamente al crear la primera tarea o después de 24 horas.

### Relaciones

| Entidad origen | Relación | Entidad destino | Clasificación |
| --- | --- | --- | --- |
| Cuenta | owns | Persona | explícita en comprensión |
| Membresía | links | Persona | explícita en comprensión |
| Membresía | links | Hogar | explícita en comprensión |
| Membresía | has_role | Rol | explícita en comprensión |
| Invitación | deriva en ingreso | Hogar / Membresía | conceptual |
| HomeScreen | se adapta por | Rol | explícita en documento |

### Cardinalidad

* Una Membresía posee un único rol activo.
* La Cuenta no pertenece directamente al Hogar.
* La Persona se conecta al Hogar a través de Membresía.

No se encontraron otras cardinalidades técnicas.

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

Solo se encontró una señal post-onboarding: el Home muestra “Tu hogar está listo”, lo que indica que el hogar ya existe al llegar a esa pantalla.

#### Invitar miembros durante onboarding

No se encontró flujo completo de invitación durante onboarding.

Se encontró una acción sugerida en primer uso post-onboarding:

* “Invitá a alguien →”
* Texto de apoyo: “Tu hogar está solo”

#### Aceptar invitación

No se encontró pantalla ni API de aceptación de invitación.

El archivo de comprensión menciona el flujo conceptual:

* Invitación → Aceptación → Aprobación → Ingreso

#### Onboarding por rol

Información encontrada por rol:

| Rol | Información encontrada |
| --- | --- |
| Coordinator | Home post-onboarding con hogar listo, acciones sugeridas y resumen inicial. |
| Adult | Primer uso con briefing de bienvenida y empty states informativos. |
| Adolescent | Primer uso con briefing de bienvenida; aparecen elementos elegidos en onboarding como avatar y color. |
| Child | Primer uso con lista demo del onboarding completada y avatar visible. |
| Senior | Se menciona onboarding de 3 pasos completado y datos configurados en onboarding. |
| Guest | Se menciona onboarding mínimo y Home con empty states. |

No se encontró el flujo paso a paso de onboarding para ningún rol.

### APIs

No se encontraron endpoints para:

* Register
* Login
* Refresh Token
* Logout
* Crear hogar durante registro
* Invitar miembros durante onboarding
* Aceptar invitación
* Onboarding por rol

No se encontraron request, response ni errores.

### UI

#### Primer Uso Post-Onboarding

Elementos encontrados:

* Saludo al usuario.
* Texto: “Tu hogar está listo”.
* Briefing de bienvenida: “Bienvenida a tu hogar. Estas son tus primeras acciones.”
* Sección “Para empezar”.
* Card de acción: “Creá tu primera tarea →”.
* Card de acción: “Invitá a alguien →”.
* Texto de apoyo: “Tu hogar está solo”.
* Resumen inicial con 0 tareas y 0 eventos.

#### Reglas UI relacionadas

* Onboarding sin tutorial.
* Empty states como guía.
* La app se aprende usándose.
* El empty state reemplaza tutoriales.

### Componentes UI

* Cards de acción sugerida.
* Empty states informativos.
* HomeScreen adaptada por rol.

No se encontraron componentes específicos de login, register, refresh token o logout.

### Navegación

* Después del onboarding, el usuario cae en Home.
* Bottom Nav se mantiene igual para todos los roles.
* La adaptación por rol cambia el contenido disponible, no la estructura de navegación.

### Eventos del sistema

No se encontraron nombres técnicos de eventos de Auth.

Eventos conceptuales encontrados:

| Evento conceptual | Cuándo ocurre | Resultado |
| --- | --- | --- |
| usuario completa onboarding | Al completar onboarding o al primer uso tras instalación | Home entra en estado Primer Uso |
| primera tarea creada | Al crear la primera tarea | Home pasa automáticamente a estado Normal |
| paso de tiempo | Después de 24 horas en primer uso | Home pasa automáticamente a estado Normal |

### Dependencias

* AUTH depende de Cuenta y Persona, pero el documento no define autenticación.
* ONBOARDING depende de Hogar, Membresía, Rol e Invitación, pero sin contratos completos.
* Home necesita rol/membresía para adaptar contenido post-onboarding.

### Restricciones arquitectónicas

* Cuenta no pertenece al hogar.
* Persona se relaciona con Hogar mediante Membresía.
* La adaptación por rol no cambia la navegación base.
* No se encontraron políticas técnicas de sesión, tokens, RLS, expiración ni revocación.

### Casos de uso

#### Primer uso posterior al onboarding

El usuario entra a Home después de onboarding. La pantalla muestra que el hogar está listo y ofrece acciones iniciales.

#### Invitación sugerida

Si el hogar está solo, Home sugiere invitar a alguien.

#### Onboarding sin tutorial

La guía inicial ocurre mediante empty states y cards de acción sugerida, no mediante tutorial separado.

### Casos especiales / Edge cases

* Usuario recién instalado o que completa onboarding entra en Primer Uso.
* Si crea la primera tarea, el Home pasa a Normal.
* Si pasan 24 horas, el Home pasa a Normal.
* No se encontró caso de usuario sin hogar.
* No se encontró caso de invitación expirada.
* No se encontró caso de sesión expirada.
* No se encontró caso de logout offline.

### Datos mockeados

No se encontraron datos mockeados específicos de Auth.

El estado inicial post-onboarding usa datos simples de Home para orientar al usuario, pero no define mocks de Auth.

### Funcionalidades REAL

* Cuenta como entidad raíz del usuario.
* Persona vinculada a Cuenta.
* Persona vinculada a Hogar mediante Membresía.
* Membresía con rol activo único.
* Roles usados para adaptar el Home post-onboarding.
* Estado Primer Uso Post-Onboarding.
* Cards de acción inicial post-onboarding.
* Invitación sugerida como acción inicial.

### Funcionalidades MOCK

No se encontró funcionalidad MOCK propia de Auth.

### Funcionalidades POST_MVP

* Detalles visuales de onboarding por rol como avatar/color/lista demo solo aparecen como señales de experiencia post-onboarding y no definen flujo MVP obligatorio.

---

## 2. Clasificación para implementación

### REAL

* Modelar separación conceptual entre Cuenta y Hogar.
* Modelar Persona como sujeto vinculado a la Cuenta.
* Modelar Membresía como relación Persona ↔ Hogar.
* Asociar un único rol activo a cada Membresía.
* Considerar roles MVP mapeados desde español:
  * Coordinador → Coordinator
  * Adulto → Adult
  * Adolescente → Adolescent
  * Niño → Child
  * Adulto Mayor → Senior
  * Invitado → Guest
* Al finalizar onboarding, dirigir al usuario a Home en estado de Primer Uso.
* En Primer Uso Post-Onboarding, mostrar acciones sugeridas:
  * Crear primera tarea.
  * Invitar a alguien.
* Usar empty states como guía inicial en lugar de tutorial.
* Cambiar de Primer Uso a Normal cuando se crea la primera tarea o después de 24 horas.

### MOCK

No se encontró MOCK propio para Auth.

### POST_MVP

* Detalles de personalización post-onboarding por rol que no definen flujos de Auth:
  * avatar/color visible para Adolescente.
  * avatar visible para Niño.
  * lista demo del onboarding para Niño.
  * onboarding de 3 pasos mencionado para Senior.

### IGNORAR

No se incluye contenido ignorado.

---

## 3. Información faltante

| Área | Información faltante | Por qué importa | Impacto |
| --- | --- | --- | --- |
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
| Eventos técnicos | auth.registered, auth.logged_in, auth.logged_out, auth.token_refreshed | Integración y auditoría | No encontrados. |
| Seguridad | RLS, hashing, sesiones, cookies, JWT, refresh token, single-use tokens | Seguridad Auth | No encontrados. |

### Contradicciones o riesgos

* El documento se centra en Home, no en Auth.
* “Primer Uso Post-Onboarding” no debe confundirse con el flujo de onboarding completo.
* “Tu hogar está listo” indica un resultado, no define cómo se crea el hogar.
* “Invitá a alguien” indica una acción sugerida, no define invitaciones implementables.
* La comprensión menciona Invitación → Aceptación → Aprobación → Ingreso, pero no define estados técnicos, token ni expiración.
* Los roles aparecen como adaptación visual de Home, no como matriz completa de permisos backend.
* La información encontrada no alcanza para implementar Register/Login/Refresh/Logout.

---

## 4. Fuente

* Archivo: `HomePlus — Diseño de Pantallas de Home V1.md`
  * Sección: Encabezado / Alcance.
  * Sección: `0.4 Reglas Universales del Home`.
  * Sección: `0.5 Bottom Navigation — Congelada para todos los roles`.
  * Sección: `1.5 Estados del Home — Coordinador` → `Estado 6: Primer Uso Post-Onboarding`.
  * Sección: `3.6 Estados del Home — Adolescente`.
  * Sección: `4.5 Contenido de Cada Bloque — Niño`.
  * Sección: `4.7 Estados del Home — Niño`.
  * Sección: `5.5 Contenido de Cada Bloque — Adulto Mayor`.
  * Sección: `5.6 Estados del Home — Adulto Mayor`.
  * Sección: `6.6 Estados del Home — Invitado`.
  * Sección: `9.2 Cualquier Estado → PRIMER USO`.
* Archivo: `Diseño de pantallas home v1.txt`
  * Sección: `OUTPUT 1 — ENTITIES`.
  * Sección: `OUTPUT 2 — RELATIONSHIPS`.
  * Sección: `OUTPUT 5 — BUSINESS RULES`.
  * Sección: `OUTPUT 6 — ARCHITECTURAL DECISIONS`.
* Archivo: `source_map_HomePlus_Diseno_de_Pantallas_de_Home_V1.md`
  * Sección: `4.1 AUTH`.
  * Sección: `4.2 ONBOARDING`.
  * Sección: `7. Mapa de estados`.
  * Sección: `9. Mapa de flujos`.
  * Sección: `10. Mapa de APIs`.
  * Sección: `11. Mapa de UI`.
  * Sección: `12. Mapa de eventos del sistema`.
  * Sección: `13. Restricciones arquitectónicas detectadas`.
  * Sección: `18. Información faltante`.
  * Sección: `19. Recomendación de fragments a generar`.
