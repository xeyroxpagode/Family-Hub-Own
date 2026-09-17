# AUTH fragment — HomePlus — Diseño de onboarding completo v1.md

## 1. Información encontrada

### Objetivo del módulo

Este documento define el flujo de entrada a HomePlus desde la pantalla de bienvenida hasta el acceso al Home post-onboarding. Para AUTH + ONBOARDING cubre:

* Registro con email y contraseña.
* Login con email y contraseña.
* Login social como alternativa.
* Recuperación de contraseña.
* Selección de rol.
* Creación de hogar durante el registro del rol Coordinator.
* Personalización inicial de perfil.
* Invitación inicial de miembros.
* Aceptación de invitación para roles que entran a un hogar existente.
* Variantes de onboarding por rol.

No define contratos backend ni endpoints formales.

---

### Entidades

#### Cuenta / Account

Información encontrada:

* La cuenta se crea desde el flujo “Crear cuenta”.
* El documento captura credenciales y nombre inicial durante registro.
* El archivo de comprensión describe `Cuenta` como perteneciente al usuario, no al hogar, con perfil, preferencias, idioma y configuración.
* La cuenta puede quedar creada aunque el onboarding no esté terminado; en ese caso se retoma donde quedó.

Campos encontrados asociados a cuenta/onboarding:

* `email`
* `password`
* `nombre`
* `nombre_completo`
* `foto_perfil` opcional
* `tratamiento` / preferencia de tono
* `preferencia_notificaciones`
* modo visual `normal` / `senior`, como modo de experiencia indicado por el documento

#### Persona / Person

Información encontrada:

* El documento captura nombre inicial y luego nombre completo/foto dentro del onboarding.
* El archivo de comprensión describe `Persona` con nombre, apellido, foto, fecha de nacimiento, género y contacto.
* El documento principal no define todos esos campos como parte del registro; solo los referencia o los captura parcialmente en pantallas de onboarding.

Campos explícitos en el documento principal:

* `nombre`
* `nombre_completo`
* `foto_perfil` opcional
* avatar/color en algunos flujos por rol
* tratamiento o forma de trato

#### Hogar / Household

Información encontrada:

* El rol Coordinator crea un hogar durante onboarding.
* La creación del hogar tiene 3 pasos:
  * tipo de hogar
  * nombre y foto opcional
  * disponibilidad horaria
* El archivo de comprensión describe `Hogar` como unidad organizativa principal.

Campos encontrados:

* `tipo_hogar`
* `nombre_hogar`
* `foto_hogar` opcional
* `disponibilidad_horaria`
* `horario_preferido_aviso`

Valores encontrados para `tipo_hogar`:

* Familia con hijos
* Familia extendida
* Pareja
* Convivientes

Valores encontrados para disponibilidad:

* 1 a 2 horas por día
* 3 a 4 horas por día
* 5 horas o más

Valores encontrados para horario preferido:

* Mañana
* Media mañana
* Tarde
* Noche

#### Membership / Membresía

Información encontrada:

* Los roles que llegan por invitación aceptan el ingreso a un hogar existente.
* El archivo de comprensión describe `Membership` como relación Persona ↔ Hogar.
* El documento principal muestra invitaciones pendientes y aceptación de invitación como parte del ingreso.

Estados encontrados en archivo de comprensión:

* Pendiente
* Activa
* Suspendida
* Finalizada

El documento principal no define un contrato técnico para crear o activar la membresía.

#### Invitation / Invitación

Información encontrada:

* El Coordinator puede invitar miembros durante onboarding.
* La invitación inicial es opcional y postergable.
* La invitación puede enviarse con nombre del miembro y email o teléfono.
* Existe una opción de compartir link.
* El link es único del hogar y válido por 7 días.
* El link se comparte con share sheet nativo.
* El toast posterior al copiado informa que vence en 7 días.

Campos encontrados:

* `nombre_miembro`
* `email_o_telefono`
* `link_invitacion`
* `fecha_expiracion` implícita por validez de 7 días
* `hogar_destino`, implícito en el contenido del link

#### Role / Rol

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

* Coordinator se selecciona en onboarding inicial y crea hogar.
* Adult, Adolescent, Child y Senior aparecen en la selección de rol o en flujos por rol.
* Guest no aparece como opción en selección inicial; llega por invitación.
* La pantalla de selección de rol solo muestra Coordinator, Adult, Adolescent, Child y Senior.

#### AuthService

Información encontrada en archivo de comprensión:

* Email/password.
* Google OAuth.
* Apple OAuth.

El documento principal presenta Google/Apple como botones de login social, pero no define implementación backend ni contrato API.

#### Session / Token / RefreshToken

Información encontrada:

* El documento menciona “Token expirado” con el mensaje: “El link ya no es válido. Pedí uno nuevo.”
* Esa mención está asociada a links, no a refresh token.
* No se encuentra entidad `Session`.
* No se encuentra entidad `RefreshToken`.
* No se encuentra flujo de refresh token.

---

### Campos y validaciones

#### Registro — Paso 1: credenciales

Campos:

* Email
* Contraseña

Validaciones:

| Campo | Regla | Mensaje |
|---|---|---|
| Email | formato válido tipo `x@y.z` | “Ese email no es válido. ¿Lo revisás?” |
| Email | no vacío | botón deshabilitado |
| Password | mínimo 8 caracteres | “Mínimo 8 caracteres.” |
| Password | no vacío | botón deshabilitado |

Estados UI encontrados:

| Estado | Comportamiento |
|---|---|
| Default | inputs vacíos; botón Continuar deshabilitado |
| Válido | email válido + contraseña ≥ 8; botón habilitado |
| Error email | borde de error y texto debajo |
| Error pass | validación on-blur, no on-type |
| Loading | spinner en botón y overlay anti doble tap |
| Error red | toast superior |
| Email ya registrado | toast con acción para ir a Login |
| Login social | flujo nativo del sistema operativo, overlay con spinner |

#### Registro — Paso 2: nombre

Campo:

* Nombre

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

#### Login

Campos encontrados:

* Email
* Password

Información encontrada:

* Login aparece como una pantalla de una sola etapa.
* Desde bienvenida se accede mediante “Ya tengo cuenta” / “Entrar”.
* El flujo muestra email + password.
* Incluye recuperación de contraseña.
* En caso de éxito lleva a Home para usuario existente.

Validaciones específicas de login:

* No se definen validaciones propias para login más allá de email/password como campos de entrada.

#### Recuperación de contraseña

Flujo encontrado:

1. Pantalla de email.
2. Mensaje: “Te enviamos un link”.
3. Email con link.
4. Nueva contraseña.
5. OK.

Edge case encontrado:

* Token/link expirado: “El link ya no es válido. Pedí uno nuevo.”

No se define endpoint, expiración exacta del link de recuperación ni estructura del token.

#### Creación de hogar

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

#### Invitación a miembros durante onboarding

Campos:

* Nombre del miembro
* Email o teléfono

Acciones:

* Enviar invitación
* Compartir link
* Después lo hago

Flujo de link:

1. Tap en “Compartir link”.
2. Se genera link único del hogar válido por 7 días.
3. Se abre share sheet nativo con opciones como WhatsApp, mensajes, mail o copiar link.
4. El link incluye un texto de invitación con persona invitante y hogar.
5. Toast: “Link copiado. Vence en 7 días.”

Regla de negocio:

* La invitación inicial es postergable.
* Coordinator debe poder usar HomePlus solo desde el minuto 1 sin obligarlo a invitar a alguien.

---

### Flujos

#### Register

Flujo encontrado:

1. Splash.
2. Bienvenida.
3. Crear cuenta paso 1: email + password o social login.
4. Crear cuenta paso 2: nombre.
5. Selección de rol.
6. Continuación según rol.

Para Coordinator:

1. Selección de rol Coordinator.
2. Creación del hogar en 3 pasos.
3. Personalización de perfil.
4. Primer valor visible.
5. Invitación a miembros.
6. Home post-onboarding.

Información explícita:

* El registro tiene 2 pantallas.
* El primer paso captura credenciales.
* El segundo captura nombre.
* Social login Google/Apple aparece como alternativa.
* El registro exitoso transiciona a selección de rol.

#### Login

Flujo encontrado:

1. Bienvenida.
2. Entrar / Ya tengo cuenta.
3. Login con email + password.
4. Recuperación si corresponde.
5. Home para usuario existente.

Información explícita:

* Login es una pantalla.
* Incluye email, password y acceso a recuperación.

#### Refresh Token

No encontrado.

Información relacionada pero no equivalente:

* Se menciona token/link expirado como error de link inválido.
* No hay flujo de renovación de sesión.
* No hay entidad RefreshToken.
* No hay endpoint, request, response ni errores de refresh token.

#### Logout

No encontrado.

No hay flujo de cierre de sesión, acción UI, endpoint, invalidación de token ni estado post-logout.

#### Crear hogar durante registro

Flujo encontrado para Coordinator:

1. Tipo de hogar.
2. Nombre + foto opcional.
3. Disponibilidad horaria.
4. Personalización de perfil.
5. Entrada al hogar.

Información explícita:

* Solo el rol Coordinator continúa hacia creación de hogar desde la pantalla de selección.
* La foto del hogar es opcional.
* El nombre del hogar es obligatorio y tiene máximo 30 caracteres.
* La disponibilidad se captura en franjas, no como horas exactas.

#### Invitar miembros durante onboarding

Flujo encontrado:

1. Pantalla “¿A quién invitás primero?”.
2. Captura nombre del miembro y email/teléfono.
3. Enviar invitación o compartir link.
4. También puede postergarse.
5. Si se comparte link, el link vence en 7 días.

Información explícita:

* La invitación es una opción natural, no un requisito obligatorio.
* El link se comparte con share sheet nativo.

#### Aceptar invitación

Flujos encontrados por rol:

* Adult: acepta invitación, ve resumen del hogar, personaliza datos y entra al Home.
* Guest: acepta invitación, ve resumen mínimo y entra al Home con acceso limitado.

Información explícita para Adult:

* Llega por invitación de un Coordinator.
* Ya existe un hogar.
* Pantalla de aceptación muestra hogar, miembros y tipo de hogar.
* CTA: “Unirme al hogar”.
* Acción alternativa: “No es mi hogar”.

Información explícita para Guest:

* Llega por invitación.
* CTA: “Aceptar invitación”.
* Se le informa que solo ve lo necesario para participar.

#### Onboarding por rol

##### Coordinator

Flujo encontrado:

1. Register.
2. Selección de rol Coordinator.
3. Crear hogar.
4. Personalización de perfil.
5. Primer valor visible.
6. Invitación a miembros.
7. Home.

Campos específicos:

* tipo de hogar
* nombre hogar
* foto hogar opcional
* disponibilidad horaria
* horario preferido de aviso
* nombre completo
* foto de perfil opcional
* tratamiento
* preferencia de notificaciones

##### Adult

Flujo encontrado:

1. Aceptar invitación + ver resumen del hogar.
2. Nombre + foto + horario + tratamiento.
3. Home.

Campos específicos:

* nombre completo
* foto opcional
* horario preferido de aviso
* tratamiento

Permiso/capacidad encontrada:

* Adult usa una navegación completa con permisos de Adult.
* El documento no detalla contrato técnico de permisos.

##### Adolescent

Flujo encontrado:

1. Avatar + color + nombre.
2. Tono + notificaciones.
3. Home.

Campos específicos:

* nombre
* avatar
* color
* tono
* preferencia de notificaciones

Información explícita:

* El documento presenta franja “Entre 13 y 17 años” en la selección de rol.
* No se pregunta edad exacta.

##### Child

Flujo encontrado:

1. Avatar + color + nombre.
2. Lista demo.
3. Primera tarea interactiva.
4. Home.

Campos específicos:

* nombre
* avatar
* color

Información explícita:

* El documento presenta franja “Entre 6 y 12 años” en la selección de rol.
* No se pregunta edad exacta.
* La lista demo aparece antes de la primera interacción real.

##### Senior

Flujo encontrado dentro del alcance Auth/Onboarding:

1. Bienvenida + nombre + tratamiento.
2. Selección de tamaño de letra.
3. Entrada a Home tras completar onboarding.

Campos específicos dentro del alcance:

* nombre
* tratamiento
* preferencia de tamaño de letra / modo senior

Información explícita:

* Senior tiene permisos equivalentes a Adult, con experiencia adaptada.
* El modo senior usa letra grande por defecto.
* La opción de letra grande aparece seleccionada por default.
* El usuario puede reducirla.

##### Guest

Flujo encontrado:

1. Aceptar invitación.
2. Ver resumen mínimo.
3. Home.

Información explícita:

* Guest llega por invitación.
* Tiene acceso mínimo.
* Solo ve contexto autorizado.
* La pantalla explica que solo ve lo necesario para participar.

---

### UI y componentes

#### Pantallas encontradas

* Splash Screen.
* Pantalla de bienvenida.
* Crear cuenta paso 1: credenciales.
* Crear cuenta paso 2: nombre.
* Login Screen.
* Selección de rol.
* Creación de hogar paso 1: tipo de hogar.
* Creación de hogar paso 2: nombre y foto.
* Creación de hogar paso 3: disponibilidad horaria.
* Personalización de perfil paso 1: foto y nombre completo.
* Personalización de perfil paso 2: tratamiento y notificaciones.
* Primer valor visible.
* Invitación a miembros.
* Pantallas por rol para Adult, Adolescent, Child, Senior y Guest.

#### Componentes UI encontrados

* Botón primario.
* Botón ghost/secundario.
* Inputs con label.
* Toggle de visibilidad de contraseña.
* Cards seleccionables.
* Radio cards.
* Progress bar de registro.
* Divider.
* Toast superior.
* Overlay anti doble tap durante loading.
* Bottom sheet para selección/creación en acciones del onboarding.
* Share sheet nativo para link de invitación.
* Avatar personal.
* Avatar del hogar.

#### Reglas UI encontradas

* Cada pantalla tiene una acción principal.
* Sin tutoriales.
* Sin carrusel de features.
* Chips informativos fijos en bienvenida.
* Inputs con label arriba; placeholder no reemplaza label.
* Foto de perfil y foto del hogar son opcionales.
* Loading mínimo de 400ms en botones según archivo de comprensión.
* Onboarding mobile-first con base 375×812px.
* Modo senior aumenta tamaño de letra y targets táctiles.

---

### Estados globales del onboarding

| Escenario | Comportamiento encontrado |
|---|---|
| Pantallas solo UI | funcionan offline, sin backend |
| Pantallas con backend | muestran toast de sin conexión; datos no se pierden |
| Splash | carga offline sin problema |
| Registro no completado | se descarta y vuelve a bienvenida |
| Cuenta creada y onboarding incompleto | retoma donde quedó |
| Timeout mayor a 7 días | se reinicia onboarding del hogar, no el registro |

---

### Edge cases encontrados

* Email inválido.
* Email vacío.
* Contraseña vacía.
* Contraseña menor a 8 caracteres.
* Email ya registrado.
* Red caída.
* Error genérico al crear cuenta.
* Token/link expirado.
* Registro incompleto descartado.
* Cuenta creada con onboarding incompleto retoma progreso.
* Timeout mayor a 7 días reinicia onboarding del hogar.
* Invitación inicial postergada.
* Link de invitación vencido después de 7 días.
* Acción “No es mi hogar” en aceptación de invitación Adult.

---

### APIs, request y response

No se encuentran endpoints formales.

Acciones mencionadas sin contrato API:

| Acción | Método | Ruta | Request | Response | Errores | Estado |
|---|---|---|---|---|---|---|
| Crear cuenta | No definido | No definido | Email, password y nombre aparecen en UI | No definido | email inválido, password débil, red caída, email registrado, error genérico | Mencionado sin contrato |
| Login | No definido | No definido | Email + password aparecen en UI | No definido | No definido en detalle | Mencionado sin contrato |
| Login social Google/Apple | No definido | No definido | No definido | OK → Home | No definido | Mencionado sin contrato |
| Recuperación de contraseña | No definido | No definido | Email aparece en flujo | Link → nueva contraseña → OK | token/link expirado | Mencionado sin contrato |
| Refresh Token | No definido | No definido | No definido | No definido | No definido | No encontrado |
| Logout | No definido | No definido | No definido | No definido | No definido | No encontrado |
| Crear hogar | No definido | No definido | tipo, nombre, foto opcional, disponibilidad | No definido | No definido | Mencionado sin contrato |
| Enviar invitación | No definido | No definido | nombre del miembro + email/teléfono | No definido | No definido | Mencionado sin contrato |
| Compartir link | No definido | No definido | No definido | link único válido 7 días | link expirado implícito | Mencionado sin contrato |
| Aceptar invitación | No definido | No definido | No definido | ingreso al hogar | link/token inválido implícito | Mencionado sin contrato |

---

### Permisos

Información explícita encontrada:

* Coordinator crea hogar durante onboarding.
* Coordinator puede invitar miembros.
* Adult llega por invitación de Coordinator.
* Guest llega por invitación y tiene acceso mínimo.
* Guest solo ve contexto autorizado.
* Senior tiene permisos equivalentes a Adult, con experiencia adaptada.
* La pantalla inicial de selección no muestra Guest porque Guest se asigna por invitación.
* Los permisos técnicos por acción no están definidos como matriz ni reglas backend.

---

### Restricciones arquitectónicas y de experiencia

* Plataforma mobile-first.
* React Native / Expo.
* Modos `normal` y `senior`.
* Objetivo rector: 60 segundos hasta primer valor visible.
* Una acción principal por pantalla.
* Sin tutoriales.
* Sin feature carousel.
* Configuración completa postergable.
* Permisos de notificación se piden después del primer valor visible, no al inicio.
* Invitación a miembros es postergable.
* Foto de perfil y hogar siempre opcionales durante onboarding.
* Disponibilidad se captura en 3 franjas, no como horas exactas.
* No se pregunta edad exacta; se usa franja etaria por rol.
* El flujo debe retomar si la cuenta ya fue creada y el onboarding no terminó.

---

### Eventos del sistema

No se encuentran nombres técnicos de eventos.

Eventos conceptuales detectados:

* Cuenta creada.
* Login exitoso.
* Login social exitoso.
* Recuperación de contraseña solicitada.
* Link/token expirado.
* Rol seleccionado.
* Hogar creado.
* Perfil personalizado.
* Primer valor visible completado.
* Invitación enviada.
* Link de invitación generado/copied.
* Invitación aceptada.
* Onboarding completado.
* Onboarding retomado.

---

### Dependencias

* Documento principal de onboarding.
* Archivo de comprensión asociado.
* Source map generado para este documento.
* Componentes del Design System mencionados por el documento.
* Backend para registro, login e invitación.
* Autenticación nativa del sistema operativo para login social.
* Share sheet nativo para compartir link.

---

## 2. Clasificación para implementación

### REAL

Debe considerarse implementable para MVP v1.0 desde este documento:

#### Register

* Pantalla de bienvenida con CTA “Crear cuenta”.
* Registro en 2 pasos.
* Paso 1: email + contraseña.
* Paso 1: validación de email.
* Paso 1: contraseña mínima de 8 caracteres.
* Paso 1: botón deshabilitado hasta datos válidos.
* Paso 1: estados default, válido, error, loading y red caída.
* Paso 1: acción ante email ya registrado para redirigir a Login.
* Paso 2: nombre.
* Paso 2: nombre obligatorio.
* Paso 2: máximo 40 caracteres.
* Paso 2: solo letras, espacios y acentos.
* Éxito de registro → selección de rol.

#### Login

* Pantalla de login con email + password.
* Acceso desde “Ya tengo cuenta” / “Entrar”.
* Login exitoso → Home de usuario existente.
* Recuperación de contraseña desde login.

#### Login social

* Botones “Continuar con Google” y “Continuar con Apple”.
* Flujo nativo del sistema operativo.
* Overlay con spinner y texto de conexión.
* OK → Home.

#### Recuperación de contraseña

* Pantalla de email.
* Envío de link.
* Nueva contraseña.
* OK.
* Error de token/link expirado.

#### Crear hogar durante registro

* Solo Coordinator continúa a creación de hogar desde selección de rol.
* Paso 1: tipo de hogar.
* Paso 2: nombre y foto opcional.
* Paso 3: disponibilidad horaria.
* Nombre de hogar obligatorio.
* Nombre de hogar máximo 30 caracteres.
* Disponibilidad en franjas.
* Horario preferido de aviso.

#### Invitar miembros durante onboarding

* Pantalla de invitación tras primer valor visible.
* Nombre del miembro.
* Email o teléfono.
* Enviar invitación.
* Compartir link.
* Postergar invitación.
* Link único del hogar válido 7 días.
* Share sheet nativo.
* Toast de link copiado y vencimiento.

#### Onboarding por rol

* Coordinator: registro + selección de rol + creación de hogar + personalización + invitación + Home.
* Adult: aceptar invitación + resumen del hogar + personalización + Home.
* Adolescent: avatar/color/nombre + tono/notificaciones + Home.
* Child: avatar/color/nombre + lista demo + primera tarea interactiva + Home.
* Senior: nombre/tratamiento + letra grande por defecto + Home.
* Guest: aceptar invitación + resumen mínimo + Home.

#### Retoma y estados globales

* Registro no completado se descarta.
* Cuenta creada con onboarding incompleto retoma donde quedó.
* Timeout mayor a 7 días reinicia onboarding del hogar, no el registro.
* Pantallas con backend muestran toast de sin conexión y no pierden datos.

### MOCK

Información que puede simularse durante esta extracción de Auth/Onboarding:

* Lista demo del flujo Child.
* Primera tarea interactiva en “onboarding mode” del flujo Child, si todavía no existe implementación real de Planner.
* Sugerencias iniciales del “primer valor visible” como opciones fijas de onboarding, sin lógica inteligente real.

### POST_MVP

No se encontró información de POST_MVP aplicable directamente a Auth dentro del alcance pedido.

### IGNORAR

No se incluye contenido ignorado por el prompt.

---

## 3. Información faltante

| Tema | Información faltante | Por qué importa | Impacto en implementación |
|---|---|---|---|
| User vs Account vs Person | El documento no separa completamente `User`, `Account` y `Person` en el flujo principal. | Define modelo de identidad y relación con hogar. | Requiere definición en etapa de merge o documento backend. |
| Register API | No hay método, ruta, request, response ni errores backend. | Es necesario para implementar el registro real. | Solo puede extraerse flujo UI y validaciones. |
| Login API | No hay método, ruta, request, response ni errores backend. | Es necesario para autenticación real. | Solo puede extraerse pantalla y flujo. |
| Login social backend | No se define cómo se intercambia el token nativo con backend. | Es necesario para persistir sesión. | La implementación queda incompleta. |
| Refresh Token | No aparece flujo ni entidad `RefreshToken`. | Es obligatorio para MVP según prompt. | Queda pendiente de otra fuente. |
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

---

## 4. Fuente

* Archivo principal: `HomePlus — Diseño de onboarding completo v1.md`
  * Encabezado / metadatos.
  * `## 1. DIAGRAMA DE FLUJO COMPLETO`
  * `### Flujos Alternativos por Rol`
  * `### Bifurcaciones y Estados`
  * `### 2.2 PANTALLA DE BIENVENIDA`
  * `### 2.3 CREAR CUENTA — PASO 1: CREDENCIALES`
  * `### 2.4 CREAR CUENTA — PASO 2: NOMBRE`
  * `### 2.5 SELECCIÓN DE ROL`
  * `### 2.6 CREACIÓN DEL HOGAR — PASO 1: TIPO DE HOGAR`
  * `### 2.7 CREACIÓN DEL HOGAR — PASO 2: NOMBRE Y FOTO`
  * `### 2.8 CREACIÓN DEL HOGAR — PASO 3: DISPONIBILIDAD HORARIA`
  * `### 2.9 PERSONALIZACIÓN DEL PERFIL — PASO 1: FOTO Y NOMBRE COMPLETO`
  * `### 2.10 PERSONALIZACIÓN DEL PERFIL — PASO 2: TONO Y NOTIFICACIONES`
  * `### 2.11 PRIMER VALOR VISIBLE — ⏱ OBJETIVO: ≤60s DESDE SPLASH`
  * `### 2.12 INVITACIÓN A MIEMBROS`
  * `## 3. VARIACIONES POR ROL`
  * `### 3.1 FLUJO ADULTO`
  * `### 3.2 FLUJO ADOLESCENTE`
  * `### 3.3 FLUJO NIÑO`
  * `### 3.4 FLUJO ADULTO MAYOR`
  * `### 3.5 FLUJO INVITADO`
  * `## 5. DECISIONES DE ONBOARDING`
  * `## 6. ESTADOS GLOBALES DEL ONBOARDING`
* Archivo de comprensión asociado: `Diseño de onboarding completo v1.txt`
  * `OUTPUT 1 — ENTITIES`
  * `OUTPUT 2 — RELATIONSHIPS`
  * `OUTPUT 5 — BUSINESS RULES`
  * `OUTPUT 6 — ARCHITECTURAL DECISIONS`
  * `OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS`
* Source map usado: `source_map_HomePlus_Diseño_de_onboarding_completo_v1.md`
  * `# 4.1 AUTH`
  * `# 4.2 ONBOARDING`
  * `# 4.3 HOUSEHOLD`
  * `# 4.5 INVITATIONS`
  * `# 4.6 ROLES & PERMISSIONS`
