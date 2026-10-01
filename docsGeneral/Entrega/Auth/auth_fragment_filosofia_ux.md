# AUTH + ONBOARDING fragment — HomePlus — SECCION 6 UX PHILOSOPHY

## 1. Información encontrada

### Objetivo del módulo

#### AUTH

No hay una sección dedicada a Auth. El documento no define Register, Login, Refresh Token, Logout, Session ni contratos de autenticación.

La información implementable relacionada con Auth aparece solo de forma indirecta a través de las entidades `Account`, `Person`, `Membership`, `Role` e `Invitation` del archivo de comprensión.

#### ONBOARDING

El onboarding debe lograr que el usuario experimente valor concreto dentro del primer minuto de uso.

Valor significa que el usuario:

* vio algo que antes no sabía,
* completó una acción que antes requería coordinar,
* o entendió algo de su hogar que no había visto.

El onboarding no debe funcionar como tutorial largo. La app debe enseñar usándose.

---

### Entidades

#### Account

Entidad del dominio core.

Información encontrada:

* Pertenece al usuario, no al hogar.
* Contiene perfil.
* Contiene preferencias.
* Contiene idioma.
* Contiene configuración personal.

#### Person

Entidad del dominio people/core.

Información encontrada:

* Toda persona pertenece a una cuenta.
* Puede participar en uno o más hogares.
* Contiene nombre.
* Contiene apellido.
* Contiene foto.
* Contiene fecha de nacimiento.
* Contiene género.
* Contiene contacto.

#### Household

Entidad organizativa principal.

Información encontrada aplicable a este fragment:

* El onboarding del Coordinador incluye el nombre del hogar.
* El archivo de comprensión define `Household` como unidad organizativa principal.
* Todo ocurre dentro de un hogar.

#### Membership

Entidad de relación entre una persona y un hogar.

Información encontrada:

* Relaciona una `Person` con un `Household`.
* Posee un único rol activo.
* Estados encontrados en el archivo de comprensión:
  * Pendiente.
  * Activa.
  * Suspendida.
  * Finalizada.

#### Role

Entidad de rol dentro del hogar.

Roles encontrados en el documento o archivo de comprensión:

| Nombre en documento | Nombre para MVP |
| ------------------- | --------------- |
| Coordinador | Coordinator |
| Adulto | Adult |
| Adolescente | Adolescent |
| Niño | Child |
| Adulto Mayor | Senior |
| Invitado | Guest |

También aparece `Empleado Familiar` como rol oficial en el archivo de comprensión, pero no forma parte de los roles MVP de este fragment.

#### Invitation

Flujo de invitación a un hogar.

Información encontrada:

* El onboarding del Coordinador incluye “Invitar miembros”.
* Invitar miembros puede postergarse.
* El archivo de comprensión describe el flujo conceptual:
  * Invitación.
  * Aceptación.
  * Aprobación, si corresponde.
  * Ingreso.
* El archivo de comprensión indica que `Invitation` crea `Membership`.

---

### Campos

#### Account

Campos encontrados:

* perfil.
* preferencias.
* idioma.
* configuración personal.

Campos no encontrados:

* email.
* password.
* provider.
* session id.
* refresh token.
* expiración de token.
* device.

#### Person

Campos encontrados:

* nombre.
* apellido.
* foto.
* fecha de nacimiento.
* género.
* contacto.

#### Membership

Campos encontrados:

* persona.
* hogar.
* rol activo.
* estado.

No se definen tipos técnicos para estos campos.

#### Role

Campo o valor encontrado:

* rol dentro del hogar.

No se define un enum técnico en inglés. El documento usa nombres en español.

#### Invitation

Campos no encontrados:

* token.
* código.
* expiración.
* email invitado.
* teléfono invitado.
* invited_by.
* accepted_at.
* household_id.
* invited_role.

#### Onboarding por rol

##### Coordinator / Coordinador

Campos o inputs encontrados:

* nombre del hogar.
* invitación de miembros.
* preferencia horaria.
* tono.

##### Adult / Adulto

Campos o inputs encontrados:

* nombre.
* rol.
* preferencia horaria.
* tono.

##### Adolescent / Adolescente

Campos o inputs encontrados:

* avatar.
* color.

El detalle aparece solo en la tabla de adaptación UX por rol, no en el flujo detallado de onboarding por rol.

##### Child / Niño

Campos o inputs encontrados:

* avatar.
* color.
* lista de ejemplo.
* primera tarea de ejemplo.

##### Senior / Adulto Mayor

Campos o inputs encontrados:

* nombre.
* tratamiento.
* letra más grande.
* medicación.
* horario.
* contacto de emergencia.

Valor por defecto encontrado:

* letra más grande: default sí.

##### Guest / Invitado

No se encuentra flujo de onboarding ni campos específicos para Guest.

---

### Tipos

No se encuentran tipos técnicos para campos de Auth, Account, Person, Membership, Role, Invitation ni preferencias de onboarding.

---

### Valores por defecto

Valores por defecto encontrados:

* Senior / Adulto Mayor:
  * letra más grande: default sí.

No se encuentran otros defaults técnicos.

---

### Restricciones

Restricciones encontradas para onboarding:

* El usuario debe ver valor concreto en el primer minuto de uso.
* Onboarding no debe tener scroll.
* Cada paso debe caber en una pantalla.
* No debe haber carrusel de features.
* No debe haber tooltips.
* No debe haber videos de onboarding.
* No debe pedirse permiso de notificación antes de mostrar valor.
* No debe forzarse a invitar miembros.
* No deben solicitarse datos innecesarios, como edad exacta o dirección.
* No deben mostrarse pantallas vacías después del onboarding.
* No debe hacerse un tour por la app.
* Si una pantalla se puede omitir, no era necesaria.
* La app debe enseñar usándose.
* El empty state de cada dominio explica qué va a aparecer ahí y sugiere la primera acción.

Restricciones encontradas para relación usuario/persona/hogar:

* `Account` pertenece al usuario, no al hogar.
* `Person` pertenece a `Account`.
* `Person` puede participar en uno o más hogares.
* `Membership` relaciona una persona con un hogar.
* Cada membresía posee un único rol activo.

---

### Relaciones

| Entidad origen | Relación | Entidad destino | Clasificación |
| -------------- | -------- | --------------- | ------------- |
| Account | owns | Person | explícita |
| Person | belongs_to | Account | explícita |
| Person | has_membership | Membership | explícita |
| Membership | belongs_to | Household | explícita |
| Membership | has_role | Role | explícita |
| Household | contains | Membership | explícita |
| Invitation | creates | Membership | explícita |
| Invitation | approved_by | Role | implícita / requiere validación |

---

### Cardinalidad

Información encontrada:

* Toda `Person` pertenece a una `Account`.
* Una `Person` puede participar en uno o más `Household`.
* Una `Membership` pertenece a un `Household`.
* Una `Membership` posee un único rol activo.

No se encuentran cardinalidades técnicas adicionales.

---

### Estados posibles

#### Membership

Estados encontrados:

* Pendiente.
* Activa.
* Suspendida.
* Finalizada.

No se encuentran reglas de transición entre estados.

#### Invitation

El documento de comprensión describe un flujo conceptual, no un enum técnico:

* Invitación.
* Aceptación.
* Aprobación, si corresponde.
* Ingreso.

#### Auth / Session / RefreshToken

No se encuentran estados.

#### Onboarding

No se encuentra enum técnico de estado.

Estado conceptual encontrado:

* el onboarding termina navegando a Home con primer valor visible.

---

### Reglas de negocio

#### Primer valor por rol

| Rol | Primer valor | Tiempo objetivo | Qué ve |
| --- | ------------ | --------------- | ------ |
| Coordinator / Coordinador | Ve el estado de su hogar en un solo lugar | 45–60s | Briefing con miembros, tareas pendientes del hogar, próximos eventos |
| Adult / Adulto | Ve sus tareas y eventos del día | 30–45s | “Hoy tenés 2 tareas y 1 evento.” |
| Adolescent / Adolescente | Ve su lista personal y puede completar algo | 20–30s | “Jose, estas son tus tareas para mañana.” |
| Child / Niño | Ve su lista del día con íconos y completa su primera tarea | 15–20s | Avatar + “Luca, tu lista de hoy” + animación al completar |
| Senior / Adulto Mayor | Ve su medicación del día y entiende que la app le avisa | 40–50s | Card de medicación + “¿Quiere que le avise a las 9?” |

No se encuentra primer valor específico para Guest / Invitado.

#### Onboarding por rol

* El onboarding cambia según rol.
* La adaptación por rol no es solo filtrar contenido.
* Cambia la jerarquía de información, el lenguaje visual, la densidad cognitiva y el nivel de agencia.

#### Invitaciones durante onboarding

* El Coordinador puede invitar miembros durante onboarding.
* La invitación de miembros puede postergarse.
* No se debe forzar a invitar miembros.

#### Aprendizaje del producto

* La app se aprende usándose.
* Los empty states guían la primera acción.
* La primera tarea creada muestra un toast sutil: “Tu primera tarea. Cuando alguien la complete, te avisamos.”

---

### Permisos

Permisos encontrados de forma explícita o parcial:

* Coordinator / Coordinador:
  * puede invitar miembros durante onboarding.
  * puede postergar la invitación de miembros.
* Child / Niño:
  * en la tabla de adaptación UX, no crea items; solo completa.

Permisos ausentes:

* No se define matriz de permisos Auth.
* No se define quién puede registrar usuarios.
* No se define quién puede aceptar invitaciones.
* No se define quién puede aprobar invitaciones.
* No se definen permisos específicos para Guest / Invitado.
* No se define permiso para Refresh Token ni Logout.

---

### Flujos

#### Register

No encontrado como flujo técnico.

No se encuentran pasos de registro, credenciales, validaciones, creación de sesión ni response.

#### Login

No encontrado.

#### Refresh Token

No encontrado.

#### Logout

No encontrado.

#### Crear hogar durante registro

No se encuentra vinculado a Register técnico.

Sí aparece en onboarding de Coordinator como configuración inicial del hogar:

1. Bienvenida + nombre del hogar.
2. Invitar miembros.
3. Preferencia horaria + tono.
4. Home con primer valor.

#### Invitar miembros durante onboarding

Flujo encontrado para Coordinator:

1. Paso de invitar miembros.
2. El paso puede postergarse.
3. El onboarding continúa hacia preferencia horaria + tono.
4. Luego navega a Home.

No se encuentra contrato técnico para crear invitaciones.

#### Aceptar invitación

Solo aparece en el archivo de comprensión como parte del flujo conceptual:

1. Invitación.
2. Aceptación.
3. Aprobación, si corresponde.
4. Ingreso.

No se encuentra UI, API ni estados técnicos de aceptación.

#### Onboarding de Coordinator / Coordinador

Flujo encontrado:

1. Bienvenida + nombre del hogar.
2. Invitar miembros, puede postergar.
3. Preferencia horaria + tono.
4. Home con primer valor.

Duración objetivo:

* ~60 segundos.

#### Onboarding de Adult / Adulto

Flujo encontrado:

1. Bienvenida + nombre + rol.
2. Preferencia horaria + tono.
3. Home con primer valor.

Duración objetivo:

* ~30 segundos.

#### Onboarding de Adolescent / Adolescente

Información encontrada:

* La tabla de adaptación UX indica onboarding de 2 pasos: avatar + color.

Información no encontrada:

* No aparece el diagrama detallado de pasos en la sección 6.3.
* No se define navegación final explícita para este rol en el flujo detallado.

#### Onboarding de Child / Niño

Flujo encontrado:

1. Elegir avatar y color.
2. Ver lista de ejemplo.
3. Completar primera tarea.
4. Home con primer valor.

Duración objetivo:

* ~25 segundos.

#### Onboarding de Senior / Adulto Mayor

Flujo encontrado:

1. Bienvenida + nombre + tratamiento.
2. Letra más grande, default sí.
3. Medicación + horario + contacto de emergencia.
4. Home con primer valor.

Duración objetivo:

* ~60 segundos.

#### Onboarding de Guest / Invitado

No encontrado.

---

### APIs

No se encuentran endpoints, métodos, rutas, request, response ni errores.

Acciones mencionadas sin contrato API:

| Acción | Estado |
| ------ | ------ |
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

---

### Request

No se encuentran requests.

---

### Response

No se encuentran responses.

---

### UI

#### Pantallas Auth

No se encuentra pantalla de Login.

No se encuentra pantalla de Register.

No se encuentra pantalla de Refresh Token.

No se encuentra pantalla de Logout.

#### UI de onboarding

Información encontrada:

* Onboarding no tiene scroll.
* Cada paso cabe en una pantalla.
* Onboarding no usa carrusel de features.
* Onboarding no usa tooltips.
* Onboarding no usa videos.
* Onboarding no debe pedir permisos de notificación antes de mostrar valor.
* Onboarding no debe mostrar pantallas vacías al terminar.
* Onboarding termina en Home con primer valor visible.
* El empty state de cada dominio explica qué aparecerá ahí y sugiere la primera acción.

#### UI por rol

##### Coordinator / Coordinador

* Home inicial muestra estado del hogar.
* Ve briefing con miembros, tareas pendientes del hogar y próximos eventos.

##### Adult / Adulto

* Home inicial muestra tareas y eventos del día.
* Ejemplo de copy: “Hoy tenés 2 tareas y 1 evento.”

##### Adolescent / Adolescente

* Ve lista personal.
* Puede completar algo.
* Ejemplo de copy: “Jose, estas son tus tareas para mañana.”

##### Child / Niño

* Ve avatar.
* Ve “Luca, tu lista de hoy”.
* Ve lista del día con íconos.
* Puede completar su primera tarea.
* Hay animación al completar.

##### Senior / Adulto Mayor

* Ve medicación del día.
* Ve copy de aviso: “¿Quiere que le avise a las 9?”
* Usa diseño asistivo.
* El onboarding guiado es paso a paso con confirmación explícita.
* No usa timer.
* No usa “saltar”.

##### Guest / Invitado

No se encuentra UI específica.

---

### Componentes UI

Componentes o patrones encontrados:

* pantalla de paso de onboarding.
* empty state guiado.
* toast sutil para primera tarea creada.
* Home como destino final del onboarding.
* card de medicación para Senior.
* lista de ejemplo para Child.
* avatar y color para Child.
* avatar y color para Adolescent, según tabla de adaptación UX.

No se encuentran componentes de formulario Auth.

---

### Navegación

Información encontrada:

* Home es la pantalla inicial.
* El usuario no puede cambiar Home como punto de entrada principal.
* El onboarding de cada rol termina en Home.
* El objetivo es llegar a primer valor visible, no completar todo el setup.

No se encuentra navegación para Login/Register.

---

### Eventos del sistema

No se encuentran nombres técnicos de eventos del sistema.

Eventos conceptuales encontrados o implícitos por flujo:

* onboarding iniciado.
* nombre del hogar ingresado.
* miembros invitados.
* invitación postergada.
* preferencias guardadas.
* onboarding completado.
* invitación aceptada.
* membresía creada.

Estos nombres no aparecen como eventos técnicos en el documento.

---

### Dependencias

Dependencias encontradas:

* Account depende de Person para representar identidad operativa.
* Person depende de Membership para participar en un hogar.
* Membership depende de Household.
* Membership depende de Role.
* Invitation crea Membership.
* Onboarding depende del Role para variar pasos, jerarquía y primer valor.
* Onboarding de Coordinator depende de Household e Invitation.
* Onboarding termina en Home para mostrar primer valor.

---

### Restricciones arquitectónicas

Restricciones encontradas:

* Account pertenece al usuario, no al hogar.
* Person pertenece a Account.
* Person puede participar en uno o más hogares.
* Membership representa la relación Person-Household.
* Membership posee un único rol activo.
* La privacidad individual tiene prioridad sobre la conveniencia.
* Información privada pertenece a quien la genera.
* Coordinadores administran el hogar, no la vida privada.

No se encuentran restricciones técnicas de tokens, sesiones, RLS, cookies, JWT, refresh token rotation ni single-use tokens.

---

### Casos de uso

Casos de uso encontrados:

* Usuario Coordinator entra por primera vez y nombra el hogar.
* Coordinator invita miembros durante onboarding.
* Coordinator posterga invitación de miembros.
* Adult entra y configura nombre, rol, preferencia horaria y tono.
* Adolescent configura avatar y color, según tabla de adaptación UX.
* Child elige avatar y color, ve lista de ejemplo y completa primera tarea.
* Senior configura nombre, tratamiento, letra grande, medicación, horario y contacto de emergencia.
* Usuario llega a Home con valor visible antes de completar configuración total.
* Usuario aprende con empty states en lugar de tutorial.

---

### Casos especiales

Casos especiales encontrados:

* Coordinator puede postergar invitaciones.
* Senior tiene letra grande por defecto.
* Senior usa onboarding guiado sin timer y sin “saltar”.
* Child tiene onboarding con tarea/lista de ejemplo.
* Adolescent aparece con onboarding resumido en tabla, pero sin flujo detallado en sección 6.3.
* Guest aparece como rol oficial, pero sin onboarding específico.

---

### Edge cases

Edge cases encontrados o ausencias relevantes:

* No pedir permisos de notificación antes de mostrar valor.
* No forzar invitación de miembros.
* No pedir datos innecesarios.
* No mostrar pantallas vacías después del onboarding.
* No usar tour de app.
* Si una pantalla puede omitirse, no era necesaria.
* No hay definición sobre qué ocurre si se abandona onboarding.
* No hay definición sobre reintento de invitación.
* No hay definición sobre aceptación de invitación expirada.
* No hay definición sobre usuario ya perteneciente a un hogar.
* No hay definición sobre cambio de rol durante onboarding.

---

### Datos mockeados

Datos o comportamientos de ejemplo detectados:

* Lista de ejemplo para Child.
* Primera tarea de ejemplo para Child.
* Copy de primer valor para Adult: “Hoy tenés 2 tareas y 1 evento.”
* Copy de primer valor para Adolescent: “Jose, estas son tus tareas para mañana.”
* Copy de primer valor para Child: “Luca, tu lista de hoy.”
* Copy de primer valor para Senior: “¿Quiere que le avise a las 9?”

Estos datos aparecen como experiencia de onboarding / primer valor. El documento no define que deban persistirse como datos reales del dominio.

---

### Funcionalidades REAL

Funcionalidades reales encontradas para este fragment:

* Onboarding por rol.
* Primer valor visible dentro de 60 segundos.
* Nombre/configuración inicial del hogar para Coordinator.
* Invitar miembros durante onboarding de Coordinator.
* Postergar invitación de miembros.
* Guardar preferencia horaria.
* Guardar tono / tratamiento.
* Configurar avatar y color para Child.
* Configurar avatar y color para Adolescent, según tabla de adaptación UX.
* Letra grande por defecto para Senior.
* Capturar medicación + horario + contacto de emergencia en onboarding de Senior.
* Navegar a Home al finalizar onboarding.
* Empty states como guía de uso.
* Relación Account → Person.
* Relación Person → Membership.
* Relación Membership → Household.
* Relación Membership → Role.
* Relación Invitation → Membership.

---

### Funcionalidades MOCK

Funcionalidades o datos tratables como mock/demo desde este documento:

* Lista de ejemplo para Child.
* Primera tarea de ejemplo para Child.
* Copies de primer valor usados como ejemplos.

---

### Funcionalidades POST_MVP

Información existente pero no implementable ahora dentro de este fragment:

* `Empleado Familiar` aparece como rol oficial en el archivo de comprensión, pero queda fuera de los roles MVP solicitados.

---

## 2. Clasificación para implementación

### REAL

Implementable para MVP v1.0 desde este documento:

* `Account` como entidad de cuenta/perfil del usuario, solo con los campos explícitos encontrados.
* `Person` como entidad operativa asociada a `Account`, solo con los campos explícitos encontrados.
* Relación `Account` → `Person`.
* Relación `Person` → `Membership`.
* Relación `Membership` → `Household`.
* Relación `Membership` → `Role`.
* `Membership` con un único rol activo.
* Estados de `Membership` encontrados:
  * Pendiente.
  * Activa.
  * Suspendida.
  * Finalizada.
* Roles MVP encontrados y mapeados:
  * Coordinador → Coordinator.
  * Adulto → Adult.
  * Adolescente → Adolescent.
  * Niño → Child.
  * Adulto Mayor → Senior.
  * Invitado → Guest.
* Onboarding por rol.
* Primer valor visible en menos de 60 segundos.
* Flujo de Coordinator:
  * nombre del hogar.
  * invitar miembros.
  * poder postergar invitación.
  * preferencia horaria.
  * tono.
  * Home.
* Flujo de Adult:
  * bienvenida + nombre + rol.
  * preferencia horaria + tono.
  * Home.
* Flujo parcial de Adolescent:
  * avatar + color.
* Flujo de Child:
  * avatar + color.
  * lista de ejemplo.
  * completar primera tarea.
  * Home.
* Flujo de Senior:
  * nombre + tratamiento.
  * letra más grande con default sí.
  * medicación + horario + contacto emergencia.
  * Home.
* Invitación durante onboarding de Coordinator.
* Aceptación de invitación como flujo conceptual de `Invitation`.
* Empty states como guía.
* No tutorial largo.
* No pedir permisos de notificación antes de mostrar valor.
* No forzar invitaciones.

No implementable desde este documento por falta de información:

* Register técnico.
* Login.
* Refresh Token.
* Logout.
* Session.
* RefreshToken.
* Endpoints Auth.

---

### MOCK

Debe tratarse como dato demo o comportamiento simulado si se usa en MVP:

* Lista de ejemplo para Child.
* Primera tarea de ejemplo para Child.
* Copies de ejemplo de primer valor.

No convertir estos datos de ejemplo en modelo completo de Planner desde este fragment.

---

### POST_MVP

Información detectada pero fuera del MVP de este fragment:

* Empleado Familiar como rol adicional no incluido en la lista de roles MVP solicitados.

---

### IGNORAR

No se incluye contenido fuera de alcance en este fragment.

---

## 3. Información faltante

| Área | Información faltante | Por qué importa | Impacto |
| ---- | -------------------- | --------------- | ------- |
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

### Contradicciones o dudas detectadas

* `Adolescent / Adolescente` aparece con onboarding de 2 pasos en la tabla de adaptación UX, pero no aparece en el flujo detallado de la sección 6.3.
* `Guest / Invitado` aparece como rol oficial en el archivo de comprensión, pero no tiene flujo de onboarding, campos ni permisos.
* `Crear hogar durante registro` no aparece como parte de Register; solo aparece nombre/configuración del hogar durante onboarding de Coordinator.
* `Aceptar invitación` aparece solo como flujo conceptual dentro de `Invitation`; no se define pantalla, token, validaciones ni endpoint.
* `Account`, `Person` y `User` no están normalizados: `User` no aparece como entidad explícita; la información disponible usa `Account` y `Person`.

---

## 4. Fuente

* Archivo: `HomePlus — SECCION 6 UX PHILOSOPHY(1).md`
  * Sección: `2.3 Reglas de scroll`.
  * Sección: `4. Adaptación por rol`.
  * Sección: `4.1 Tabla comparativa de adaptación UX por rol`.
  * Sección: `4.3 Adulto Mayor: diseño asistivo, no solo "fuente grande"`.
  * Sección: `6. Onboarding y primer valor`.
  * Sección: `6.1 Principio: 60 segundos hasta valor visible`.
  * Sección: `6.2 No tutoriales largos`.
  * Sección: `6.3 Flujo de onboarding por rol`.
  * Sección: `6.4 Qué no tiene el onboarding`.
  * Sección: `8. Tabla de decisiones UX`, decisiones `UX-10` y `UX-11`.

* Archivo: `Seccion 6 filosofia ux(1).txt`
  * Sección: `OUTPUT 1 — ENTITIES`.
  * Sección: `OUTPUT 2 — RELATIONSHIPS`.
  * Sección: `OUTPUT 5 — BUSINESS RULES`.
  * Sección: `OUTPUT 6 — ARCHITECTURAL DECISIONS`.
  * Sección: `OUTPUT 7 — MISSING / IMPLIED CONNECTIONS`.

* Archivo: `source_map_HomePlus_SECCION_6_UX_PHILOSOPHY.md`
  * Sección: `4.1 AUTH`.
  * Sección: `4.2 ONBOARDING`.
  * Sección: `5. Mapa de entidades`.
  * Sección: `6. Mapa de relaciones`.
  * Sección: `7. Mapa de estados`.
  * Sección: `18. Información faltante`.
  * Sección: `21. Instrucciones para futuras extracciones`.
