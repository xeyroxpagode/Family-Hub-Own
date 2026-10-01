# AUTH fragment — HomePlus — Diseño ed pantallas de Auth v1

## 1. Información encontrada

### Objetivo del módulo

* El documento define Auth como la entrada a HomePlus.
* El login se presenta como “la puerta de entrada a un hogar”.
* La Cuenta pertenece al usuario y el Hogar es un ente separado.
* El usuario se autentica con su Cuenta personal y luego selecciona o ingresa a un Hogar.
* Las credenciales son de la persona, no del hogar.
* Plataforma indicada: mobile-first, base 375×812px, React Native / Expo.
* Backend indicado: Supabase Auth.

### Entidades

* `Cuenta`:
  * Pertenece al usuario.
  * No pertenece al hogar.
  * En el archivo de comprensión se indica que incluye Perfil, Preferencias, Idioma, Configuración personal y memoria personal.
* `Persona`:
  * Entidad central que representa un usuario.
  * Pertenece a una Cuenta.
  * Participa en uno o más hogares.
* `Hogar`:
  * Ente separado de la Cuenta.
  * Unidad organizativa principal.
  * Todo ocurre dentro de un hogar.
* `Membership`:
  * Relación entre Persona y Hogar.
  * Posee un único rol.
  * Estados encontrados en el archivo de comprensión: Pendiente, Activa, Suspendida, Finalizada.
* `Role`:
  * Asociado a Membership.
* `SupabaseAuth`:
  * Servicio de autenticación para email+password, Google OAuth, Apple OAuth, magic link, 2FA y biometría.
* `SupabaseSession`:
  * Manejo de sesiones JWT con refresh token de 7 días.
* `GoogleOAuth`:
  * Proveedor de login social Google.
* `AppleOAuth`:
  * Proveedor de login social Apple.
* `AuthLoginScreen`:
  * Pantalla de login principal con email/password y social login.
* `AuthRegisterScreen`:
  * Registro standalone de una pantalla.
  * No pide nombre.
* `AuthSessionExpiredScreen`:
  * Re-autenticación con email pre-rellenado tras sesión expirada.
* `AuthLogoutConfirmSheet`:
  * Bottom sheet 25% para confirmar cierre de sesión.
* `LoginFlow`:
  * Flujo completo de autenticación: credenciales → JWT → Onboarding/Home.
  * El archivo de comprensión incluye 2FA en este flujo, pero este fragment no desarrolla 2FA porque queda fuera del alcance solicitado.
* `RegisterFlow`:
  * Flujo de registro: email+password → verificación → onboarding.
* `LogoutFlow`:
  * Cierre de sesión con limpieza de tokens.

### Roles encontrados y mapeo MVP

| Rol en documento | Rol MVP equivalente | Información explícita encontrada |
| ---------------- | ------------------- | -------------------------------- |
| Coordinador | Coordinator | Responsable administrativo principal del hogar. Puede aprobar ingresos, cambiar roles y expulsar miembros. |
| Adulto | Adult | Miembro operativo con amplios permisos. No puede aprobar ingresos. |
| Adolescente | Adolescent | Miembro con autonomía progresiva. Puede recibir autorizaciones adicionales. |
| Niño | Child | Miembro con experiencia simplificada. No administra información familiar crítica. |
| AdultoMayor | Senior | Miembro con experiencia adaptada. Mantiene permisos equivalentes a Adulto. |
| Invitado | Guest | Acceso mínimo. Participación limitada. |

### Relaciones

* Persona → Cuenta:
  * La Persona pertenece a una Cuenta.
* Persona → Hogar:
  * La Persona participa en uno o más hogares.
* Membership → Persona:
  * Membership vincula Persona.
* Membership → Hogar:
  * Membership vincula Hogar.
* Membership → Role:
  * Membership tiene un rol.
* SupabaseAuth → SupabaseSession:
  * SupabaseAuth gestiona SupabaseSession.
* SupabaseAuth → JWT Token + Refresh Token → SupabaseSession:
  * El flujo de datos establece una sesión activa con JWT Token + Refresh Token.
* Coordinador → Invitación → Persona:
  * El archivo de comprensión menciona un flujo de datos donde el Coordinador envía una invitación a una Persona para invitar nuevo miembro al hogar.
  * No hay entidad Invitation detallada, campos, estados, token, expiración, aceptación ni API.
* Membership → Rol, estado → Hogar:
  * El archivo de comprensión indica que Membership entrega rol y estado al Hogar para definir permisos de acceso.

### Campos

#### Login

* `email`:
  * Input label: `Email`.
  * Placeholder: `Email`.
  * Tipo de teclado: `email-address`.
  * Foco inicial: sí.
  * Return key: `next` hacia Password.
* `password` / `contraseña`:
  * Input label: `Contraseña`.
  * Placeholder: `Contraseña`.
  * Tipo de teclado: default.
  * Return key: `go`, ejecuta submit.
  * Tiene toggle de visibilidad con ícono de ojo.
* Botón primario:
  * Texto: `Entrar`.
  * Deshabilitado hasta tener email + password.
* Social login:
  * Botón: `Continuar con Google`.
  * Botón: `Continuar con Apple`.
* Link de recuperación:
  * Texto: `¿Olvidaste tu contraseña?`.
  * El flujo de recuperación no se desarrolla en este fragment porque el alcance solicitado no lo incluye.
* Link a registro:
  * Texto pre-link: `¿No tenés cuenta?`.
  * Botón/link: `Crear cuenta`.

#### Register

* `email`:
  * Input label: `Email`.
  * Placeholder: `Email`.
  * Tipo de teclado: `email-address`.
  * Foco inicial: sí.
* `password` / `contraseña`:
  * Input label: `Contraseña`.
  * Placeholder: `Contraseña`.
  * Tiene toggle de visibilidad.
* `confirm_password` / `confirmar contraseña`:
  * Input label: `Confirmar contraseña`.
  * Placeholder: `Confirmar contraseña`.
  * Tiene toggle de visibilidad.
* `terms_accepted` / checkbox de términos:
  * Texto: `Acepto los Términos y Condiciones y la Política de Privacidad.`
  * Debe estar marcado para continuar.
* Helper de contraseña:
  * Texto: `Mínimo 8 caracteres`.
* Botón primario:
  * Texto: `Crear cuenta`.
  * Deshabilitado hasta validación.
* Social register/login:
  * Botón: `Continuar con Google`.
  * Botón: `Continuar con Apple`.
* Link a login:
  * Texto pre-link: `¿Ya tenés cuenta?`.
  * Botón/link: `Entrar`.
* Nombre:
  * El documento indica explícitamente que no se pide nombre en el registro standalone.
  * El nombre se pide en onboarding.

#### Refresh Token / Session

* `JWT Token`:
  * Token de sesión.
  * Expira según configuración de Supabase.
  * El documento indica default de 1 hora.
* `Refresh Token`:
  * Dura 7 días según el documento.
  * Si expira, el usuario vuelve a login completo.
* `email pre-rellenado`:
  * En sesión expirada, la pantalla muestra el email no editable.
* `password`:
  * En sesión expirada se pide contraseña para re-autenticación.

#### Logout

* Sesión Supabase actual.
* Storage local.
* Token.
* Botón danger:
  * Texto: `Cerrar sesión`.
* Botón ghost:
  * Texto: `Cancelar`.

### Tipos

* `email` usa teclado `email-address`.
* `password` usa teclado default.
* `confirm_password` usa teclado default.
* Checkbox de términos usa componente Checkbox.
* JWT y Refresh Token son gestionados por SupabaseSession según el documento.
* No se definen tipos de base de datos para Cuenta, Persona, Hogar, Membership, Role ni sesión.

### Valores por defecto

* Login:
  * Inputs vacíos.
  * Botón `Entrar` deshabilitado.
  * Botones sociales habilitados y visibles.
  * Link de recuperación visible.
* Register:
  * Inputs vacíos.
  * Checkbox sin marcar.
  * Botón `Crear cuenta` deshabilitado.
  * Helper `Mínimo 8 caracteres` visible.
* Token JWT:
  * Expiración default indicada: 1 hora.
* Refresh token:
  * Duración indicada: 7 días.
* Login screen:
  * El email tiene autofocus.
* Register screen:
  * El email tiene autofocus.

### Restricciones

#### Seguridad

* No se debe mostrar “Email no encontrado” separado de “Contraseña incorrecta”.
* El mensaje de credenciales inválidas debe ser unificado:
  * `Ese email o contraseña no son correctos. ¿Probás de nuevo?`
* La recuperación de contraseña no revela si el email existe.
* Supabase Auth aplica rate limiting por IP.
* La app agrega cooldown visual después de intentos fallidos.
* Las contraseñas nunca se almacenan en logs, analytics ni crash reports.
* El email verificado es requerido para que la cuenta quede completamente activa.
* No existe checkbox `Recordarme`.
* La sesión se mantiene con refresh token de Supabase.

#### UX / UI

* Loading mínimo de 400ms en botones para evitar flicker.
* Spinner visible solo si la operación excede 300ms.
* Durante loading de login/register, se usa overlay para prevenir doble tap.
* Todas las transiciones respetan `prefers-reduced-motion`; si está activo, duración 0ms.
* Login debe cargar en menos de 2s.
* Logo, tagline e íconos sociales son estáticos/locales y no bloquean el render inicial.
* Inputs usan label arriba + placeholder complementario.
* El toggle de visibilidad de contraseña siempre está presente en campos password.

#### Cuenta / Hogar

* La Cuenta pertenece al usuario.
* El Hogar es un ente separado.
* El usuario se autentica con su Cuenta personal.
* Luego selecciona o ingresa a un Hogar.
* Las credenciales son de la persona, no del hogar.

### Estados posibles

#### Estados UI globales cubiertos por el flujo Auth

* Empty.
* Loading.
* Error.
* Success.
* Offline.

#### Login

* DEFAULT:
  * Inputs vacíos con placeholder visible.
  * Botón `Entrar` deshabilitado.
  * Botones sociales habilitados y visibles.
  * Link `¿Olvidaste tu contraseña?` visible.
* FILLED:
  * Email + password con datos.
  * Botón `Entrar` habilitado.
  * Password muestra bullets o texto según toggle.
* FOCUS:
  * Input activo con borde/ring de foco.
  * Label visible arriba del input.
  * Teclado visible según tipo de input.
* ERROR:
  * Input con borde/ring de error.
  * Texto de error debajo en caption.
  * Botón deshabilitado si hay errores.
* LOADING:
  * Botón reemplaza texto por spinner.
  * Overlay sutil sobre pantalla.
  * Inputs y links deshabilitados visualmente.
  * Si la autenticación tarda más de 3s, aparece el texto `Conectando con tu hogar...`.
* ERROR GENERAL:
  * Toast superior.
  * El formulario permanece visible.
  * El usuario puede reintentar.
* SUCCESS:
  * Transición a Home si onboarding completo.
  * Transición a Onboarding si es primera vez.
  * El documento también menciona transición a 2FA si está configurado; este fragment no desarrolla 2FA por estar fuera del alcance solicitado.

#### Register

* DEFAULT:
  * Inputs vacíos.
  * Checkbox sin marcar.
  * Botón `Crear cuenta` deshabilitado.
  * Helper `Mínimo 8 caracteres` visible.
* FILLED:
  * Todos los campos válidos.
  * Checkbox marcado.
  * Botón habilitado.
  * Passwords muestran bullets.
* ERROR:
  * Error inline debajo del input correspondiente.
  * Botón deshabilitado hasta corregir errores.
* LOADING:
  * Botón con spinner.
  * Overlay sutil para prevenir doble tap.
  * Mínimo 400ms.
* SUCCESS:
  * Cuenta creada → navegación a Verificación de Email.
  * Si es login social → navegación a Onboarding.
* ERROR de red:
  * Toast superior: `Sin conexión. Probá de nuevo en un momento.`

#### Session / Refresh Token

* JWT expirado durante uso:
  * La app intercepta el 401 de Supabase.
  * Redirige a Sesión Expirada.
* Refresh token expirado:
  * El refresh token dura 7 días.
  * Si expira, se requiere Login completo.
* Sesión expirada:
  * Se muestra pantalla de re-login.
  * Email visible no editable.
  * Se pide contraseña.

#### Logout

* Tap en `Cerrar sesión`:
  * Loading en botón danger.
  * Al completar, limpia sesión local.
  * Transición a Login principal.
* Tap en `Cancelar`:
  * Cierra el bottom sheet.
  * Vuelve a la pantalla anterior.

### Reglas de negocio

* La cuenta no está completamente activa hasta la verificación de email.
* Cada membresía posee un único rol activo.
* Las relaciones familiares son informativas y no modifican permisos automáticamente.
* Coordinador puede aprobar ingresos, cambiar roles y expulsar miembros.
* Adulto no puede aprobar ingresos.
* AdultoMayor mantiene permisos equivalentes a Adulto.
* El registro standalone es solo credenciales + aceptación de términos.
* El nombre se pide en onboarding, no en register.
* El email es la única identidad necesaria para crear la cuenta en registro standalone.
* El registro con social login navega a Onboarding.
* El login exitoso navega a Home si el onboarding ya está completo.
* El login exitoso navega a Onboarding si es primera vez.
* Logout en un dispositivo solo afecta ese dispositivo.
* Supabase permite múltiples sesiones por usuario.

### Permisos

* Coordinator / Coordinador:
  * Puede aprobar ingresos.
  * Puede cambiar roles.
  * Puede expulsar miembros.
* Adult / Adulto:
  * No puede aprobar ingresos.
* Adolescent / Adolescente:
  * Puede recibir autorizaciones adicionales.
* Child / Niño:
  * No administra información familiar crítica.
* Senior / AdultoMayor:
  * Mantiene permisos equivalentes a Adulto.
* Guest / Invitado:
  * Tiene acceso mínimo y participación limitada.

No se encontró una matriz completa de permisos por acción MVP para Register, Login, Refresh Token, Logout, creación de hogar, invitaciones u onboarding por rol.

### Flujos

#### Login email/password

1. Usuario ingresa email y contraseña en `AuthLoginScreen`.
2. La app valida formato de email y presencia de password.
3. Usuario toca `Entrar`.
4. SupabaseAuth autentica credenciales.
5. SupabaseAuth devuelve JWT Token + Refresh Token.
6. SupabaseSession establece sesión activa.
7. Resultado de navegación:
   * Home si el usuario ya tiene onboarding completo.
   * Onboarding si es primera vez.
   * El documento menciona 2FA si está configurado; no se desarrolla en este fragment.

#### Login social Google/Apple

1. Usuario toca `Continuar con Google` o `Continuar con Apple`.
2. Se abre flow nativo del sistema operativo.
3. Se muestra overlay con spinner y texto `Conectando...`.
4. SupabaseAuth recibe OAuth token.
5. SupabaseAuth establece sesión.
6. Resultado de navegación:
   * Home si corresponde a cuenta existente/onboarding completo.
   * Onboarding si corresponde a primera vez o registro social.

#### Register email/password

1. Usuario abre `AuthRegisterScreen` desde `Crear cuenta`.
2. Usuario ingresa email, contraseña y confirmación.
3. Usuario acepta términos y privacidad con checkbox.
4. La app valida email, contraseña, coincidencia de contraseñas y checkbox.
5. Usuario toca `Crear cuenta`.
6. SupabaseAuth crea la cuenta.
7. Se envía verificación de email.
8. Navega a pantalla de Verificación de Email.
9. Después de verificación, el flujo continúa a Onboarding según el archivo de comprensión.

#### Register social Google/Apple

1. Usuario toca `Continuar con Google` o `Continuar con Apple` desde registro.
2. Se usa OAuth.
3. Si el registro/login social es exitoso, navega a Onboarding.

#### Refresh Token / sesión expirada

1. Usuario está en cualquier pantalla.
2. Token JWT expira.
3. Supabase devuelve 401.
4. La app intercepta el 401.
5. Redirige a `AuthSessionExpiredScreen`.
6. La pantalla muestra email pre-rellenado y no editable.
7. El usuario re-autentica con contraseña.
8. Si re-autenticación es correcta, vuelve a Home.
9. Si el refresh token expiró, se requiere Login completo.

#### Logout

1. Usuario va a Perfil → Configuración → Cerrar sesión.
2. Se abre `AuthLogoutConfirmSheet`, bottom sheet 25%.
3. Usuario toca `Cerrar sesión`.
4. Se ejecuta logout.
5. Se destruye sesión de Supabase.
6. Se limpia storage local.
7. Se invalida token.
8. Navega a Login.

#### Crear hogar durante registro

* No se encontró flujo implementable.
* El documento indica que el usuario se autentica con su Cuenta y luego selecciona o ingresa a un Hogar.
* El documento no define creación de hogar durante register.

#### Invitar miembros durante onboarding

* El archivo de comprensión menciona un flujo de datos `Coordinador → Invitación → Persona` para invitar nuevo miembro al hogar.
* No se encontró flujo implementable de invitación durante onboarding.
* No se encontró pantalla, API, request, response, token/código, expiración ni aceptación.

#### Onboarding por rol

* No se encontró flujo implementable.
* Solo se encontraron roles y descripciones generales.
* No se encontraron pantallas, pasos, campos, permisos configurables ni bifurcaciones por rol dentro de onboarding.

### APIs

No se encontraron endpoints HTTP propios definidos.

| Acción | Método | Ruta | Request | Response | Errores | Estado |
| ------ | ------ | ---- | ------- | -------- | ------- | ------ |
| Pantalla Login | UI route | `/(auth)/login` | email, password | Navegación a Home / Onboarding. El documento también menciona 2FA si configurado. | credenciales inválidas, email no verificado, cuenta eliminada, conexión caída, OAuth error, tasa limitada | Parcial |
| Login email/password | Acción Supabase | No definido | Email + Password | JWT Token + Refresh Token / sesión activa | error unificado, rate limit | Acción mencionada sin contrato API |
| Login Google | Acción OAuth | No definido | OAuth token Google | Supabase session | provider error, email vinculado a otro método | Acción mencionada sin contrato API |
| Login Apple | Acción OAuth | No definido | OAuth token Apple | Supabase session | provider error, email vinculado a otro método | Acción mencionada sin contrato API |
| Pantalla Registro | UI route | `/(auth)/register` | email, password, confirm password, terms checkbox | navegación a verificación email / onboarding en social login | email inválido, email existente, password débil, mismatch, sin red | Parcial |
| Register | Acción Supabase | No definido | Email + Password | Cuenta creada + envío de verificación | email existente, red | Acción mencionada sin contrato API |
| Refresh token | Acción Supabase | No definido | Refresh token | nueva sesión/JWT | refresh expirado → login completo | Mencionado sin detalle |
| Logout | Acción Supabase/local | No definido | sesión actual | sesión destruida, storage limpio, token invalidado | no detallado | Acción mencionada sin contrato API |
| Crear hogar durante registro | — | — | — | — | — | No encontrado |
| Invitar miembros durante onboarding | — | — | — | — | — | No encontrado |
| Onboarding por rol | — | — | — | — | — | No encontrado |

### Request

* Login email/password:
  * Email.
  * Password.
* Register:
  * Email.
  * Password.
  * Confirm password aparece en UI para validación cliente.
  * Checkbox de términos aparece en UI.
* Refresh token:
  * Refresh token mencionado conceptualmente.
  * No hay request formal.
* Logout:
  * Sesión actual mencionada conceptualmente.
  * No hay request formal.

### Response

* Login:
  * JWT Token + Refresh Token.
  * SupabaseSession activa.
  * Navegación a Home u Onboarding según estado del usuario.
* Register:
  * Cuenta creada.
  * Envío de verificación.
  * Navegación a Verificación de Email.
  * Social login desde registro navega a Onboarding.
* Refresh token:
  * Nueva sesión/JWT implícito por SupabaseSession.
  * No hay response formal.
* Logout:
  * Sesión destruida.
  * Storage local limpio.
  * Token invalidado.
  * Navegación a Login.

### UI

#### AuthLoginScreen

* Ruta: `/(auth)/login`.
* Objetivo: permitir que un usuario con cuenta existente ingrese a HomePlus.
* Componentes:
  * Logo.
  * Heading `HomePlus`.
  * Tagline `El lugar donde tu hogar se organiza solo.`
  * Input Email.
  * Input Contraseña.
  * Toggle de visibilidad de contraseña.
  * Link `¿Olvidaste tu contraseña?`.
  * Botón primario `Entrar`.
  * Divider `o`.
  * Botón social Google.
  * Botón social Apple.
  * Texto `¿No tenés cuenta?`.
  * Botón/link `Crear cuenta`.
* A11y:
  * Botón Entrar: `Entrar a HomePlus`.
  * Botón Google: `Continuar con Google`.
  * Botón Apple: `Continuar con Apple`.
  * Link recuperación: `Recuperar contraseña`.
  * Link crear cuenta: `Crear cuenta nueva`.

#### AuthRegisterScreen

* Ruta: `/(auth)/register`.
* Objetivo: crear una cuenta nueva de HomePlus.
* Es registro standalone.
* Es una pantalla independiente fuera del onboarding.
* Flujo mínimo: credenciales + aceptar términos.
* Componentes:
  * Header con back.
  * Heading `Creá tu cuenta`.
  * Subtítulo `Es rápido, solo un minuto.`
  * Input Email.
  * Input Contraseña.
  * Input Confirmar contraseña.
  * Toggle de visibilidad en ambos password inputs.
  * Helper `Mínimo 8 caracteres`.
  * Checkbox de términos y privacidad.
  * Botón primario `Crear cuenta`.
  * Divider `o`.
  * Botón Google.
  * Botón Apple.
  * Texto `¿Ya tenés cuenta?`.
  * Botón/link `Entrar`.
* A11y:
  * Input Email: `Email`.
  * Input Contraseña: `Contraseña nueva`.
  * Input Confirmar: `Confirmar contraseña`.
  * Checkbox: `Acepto los Términos y Condiciones`.
  * Botón Crear cuenta: `Crear cuenta`.

#### AuthSessionExpiredScreen

* Objetivo: notificar al usuario que su sesión expiró por seguridad y permitir re-autenticación con mínima fricción.
* Email aparece pre-rellenado y no editable.
* Solo pide contraseña.
* Copy:
  * Heading: `Tu sesión terminó`.
  * Subtítulo: `Por seguridad, te pedimos que vuelvas a entrar. Es solo un segundo.`
  * Botón: `Entrar`.
  * Link: `¿Olvidaste tu contraseña?`.
  * Botón ghost: `Cambiar de cuenta`.
* La opción `Cambiar de cuenta` aparece en la UI, pero el selector de cuenta no se desarrolla en este fragment porque no forma parte del alcance solicitado.

#### AuthLogoutConfirmSheet

* Pantalla: `AuthLogoutConfirmSheet`.
* Tipo: Bottom Sheet 25%.
* Copy:
  * Título: `¿Querés cerrar sesión?`
  * Subtítulo: `Tus datos quedan guardados. Cuando vuelvas, todo va a estar como siempre.`
  * Botón danger: `Cerrar sesión`.
  * Botón ghost: `Cancelar`.
* Estados:
  * Tap en `Cerrar sesión`: loading en botón danger, mínimo 400ms; al completar, limpia sesión local y transiciona a Login principal.
  * Tap en `Cancelar`: cierra el sheet y vuelve a pantalla anterior.

### Componentes UI

* Logo.
* Heading.
* Body S.
* Input.
* Toggle de visibilidad.
* Link.
* Button primary.
* Button secondary.
* Button ghost.
* Button danger.
* Divider.
* Checkbox.
* Toast.
* Bottom Sheet.
* Spinner.
* Overlay.
* KeyboardAvoidingView.

### Navegación

* App cold start sin sesión → Login.
* Login → Home si onboarding completo.
* Login → Onboarding si primera vez.
* Login → Registro.
* Registro → Login por back.
* Registro → Verificación Email después de crear cuenta con email/password.
* Registro → Onboarding con Google/Apple.
* Sesión expirada → pantalla de re-login.
* Re-autenticación exitosa → Home.
* Logout ejecutado → Login.

### Eventos del sistema

No hay nombres técnicos de eventos definidos en el documento.

Eventos conceptuales encontrados:

* cuenta creada.
* login exitoso.
* sesión establecida.
* token refrescado.
* sesión expirada.
* logout ejecutado.
* onboarding requerido después de registro/primer login.

### Dependencias

* Supabase Auth.
* SupabaseSession.
* Google OAuth.
* Apple OAuth.
* React Native / Expo.
* Design System V2.
* UX Philosophy V2.
* UX Writing Guide V1.
* Cuenta.
* Persona.
* Hogar.
* Membership.
* Role.
* Settings/Profile como origen de logout.

### Restricciones arquitectónicas

* Backend Auth delegado a Supabase Auth.
* No se definen endpoints propios.
* Cuenta y Hogar están separados.
* Credenciales pertenecen a Persona/Cuenta, no a Hogar.
* El usuario se autentica antes de seleccionar o ingresar a un Hogar.
* SupabaseSession maneja JWT y refresh token.
* JWT default de sesión: 1 hora.
* Refresh token: 7 días.
* Logout destruye sesión Supabase, limpia storage local e invalida token.
* Password nunca en logs, analytics ni crash reports.
* `prefers-reduced-motion` debe llevar transiciones a 0ms.
* La pantalla Login debe renderizar sin depender de red.

### Casos de uso

* Usuario existente entra con email/password.
* Usuario existente entra con Google.
* Usuario existente entra con Apple.
* Usuario nuevo crea cuenta con email/password.
* Usuario nuevo usa Google/Apple desde registro y va a Onboarding.
* Usuario con JWT expirado re-autentica desde pantalla de sesión expirada.
* Usuario cierra sesión desde Perfil/Configuración.

### Casos especiales / Edge cases

* Login sin conexión:
  * Toast: `Sin conexión. Cuando vuelva, entrás sin problema.`
  * Los campos no se limpian.
* Registro sin conexión:
  * Toast: `Sin conexión. Probá de nuevo en un momento.`
  * Los datos persisten en inputs.
* Sesión expirada sin conexión:
  * No se puede re-autenticar sin conexión.
  * Toast superior informativo.
* JWT expirado durante uso:
  * Interceptar 401 de Supabase.
  * Redirigir a Sesión Expirada.
* Refresh token expirado:
  * Login completo.
* Registro con email existente:
  * Validación on-blur.
  * Mensaje: `Ese email ya tiene cuenta. ¿Querés entrar?` con botón `[Entrar]`.
* Login social con email que ya existe como email+password:
  * Supabase vincula el provider a la cuenta existente.
  * Usuario entra normalmente.
* Login social con email vinculado a otra cuenta social:
  * Supabase devuelve error.
  * Toast: `Ese email ya está vinculado a otra forma de entrar. ¿Probás con email y contraseña?`
* Login con cuenta eliminada menor a 30 días:
  * Mensaje: `Esta cuenta ya no existe. Si querés, podés crear una nueva.`
* Login con cuenta eliminada mayor a 30 días:
  * Mensaje unificado: `Ese email o contraseña no son correctos.`
* Sesión activa en 2+ dispositivos:
  * Soportado por Supabase.
* Logout en un dispositivo:
  * Solo afecta ese dispositivo.
* Intentos fallidos:
  * 3 intentos: cooldown 60s.
  * 5 intentos: cooldown 5 minutos.
  * 10 intentos: cooldown 15 minutos y sugerencia de recuperación.
* Error genérico Supabase Auth:
  * Mensaje: `Algo no salió bien. ¿Probás de nuevo? Si no, revisá tu conexión.`
* Timeout Supabase:
  * Mensaje: `El servidor tarda en responder. ¿Probás de nuevo?`

### Datos mockeados

No se encontró información mockeada aplicable a AUTH dentro del alcance de este fragment.

### Funcionalidades REAL encontradas

* Register con email/password.
* Register social con Google/Apple como ruta hacia onboarding.
* Login con email/password.
* Login social con Google/Apple.
* Refresh token conceptual gestionado por SupabaseSession.
* Manejo de JWT expirado mediante pantalla de sesión expirada.
* Logout con confirmación.
* Limpieza de sesión/storage/token al logout.
* Separación Cuenta/Hogar.
* Onboarding como destino después de registro, social login o primer login.
* Nombre diferido a onboarding.
* Roles básicos encontrados en el archivo de comprensión.

### Funcionalidades MOCK encontradas

No se encontró información MOCK para AUTH.

### Funcionalidades POST_MVP encontradas

Dentro del documento existen funcionalidades Auth no solicitadas para este fragment:

* 2FA opcional.
* Biometría opt-in.
* Selector de cuenta.
* Cerrar todas las sesiones.
* Eliminación de cuenta con soft-delete de 30 días.

No se desarrollan como implementación en este fragment porque el alcance solicitado para AUTH + ONBOARDING se limita a Register, Login, Refresh Token, Logout, crear hogar durante registro, invitar miembros durante onboarding y onboarding por rol.

---

## 2. Clasificación para implementación

### REAL

* Implementar pantalla `AuthLoginScreen` con ruta `/(auth)/login`.
* Implementar login email/password usando Supabase Auth.
* Implementar login social Google.
* Implementar login social Apple.
* Implementar validaciones UI de login:
  * Email formato básico.
  * Email vacío sin mensaje, botón disabled.
  * Password vacío sin mensaje, botón disabled.
  * Credenciales inválidas con mensaje unificado.
  * Email no verificado con opción de reenvío mencionada.
  * Cuenta eliminada con mensaje de cuenta inexistente.
  * Error de conexión.
  * Error OAuth Google.
  * Error OAuth Apple.
  * Tasa limitada.
* Implementar estados UI de login:
  * DEFAULT.
  * FILLED.
  * FOCUS.
  * ERROR.
  * LOADING.
  * ERROR GENERAL.
  * SUCCESS.
* Implementar pantalla `AuthRegisterScreen` con ruta `/(auth)/register`.
* Implementar register email/password usando Supabase Auth.
* Implementar social register con Google/Apple como navegación a Onboarding.
* Implementar validaciones UI de registro:
  * Email formato básico.
  * Email ya registrado.
  * Contraseña mínimo 8 caracteres.
  * Contraseña con al menos 1 número o carácter especial.
  * Confirmación de contraseña igual a contraseña.
  * Checkbox de términos obligatorio.
  * Error de conexión.
* Implementar estados UI de registro:
  * DEFAULT.
  * FILLED.
  * ERROR.
  * LOADING.
  * SUCCESS.
* Implementar que el registro standalone no pida nombre.
* Implementar que el nombre quede diferido a Onboarding.
* Implementar navegación desde Register a Verificación de Email después de crear cuenta con email/password.
* Implementar navegación hacia Onboarding cuando corresponda, sin definir pantallas internas de onboarding desde este documento.
* Implementar manejo conceptual de refresh token mediante SupabaseSession.
* Implementar JWT expirado → interceptar 401 Supabase → pantalla de Sesión Expirada.
* Implementar Refresh Token expirado → Login completo.
* Implementar `AuthSessionExpiredScreen` con email pre-rellenado y no editable.
* Implementar re-login por contraseña desde sesión expirada.
* Implementar `AuthLogoutConfirmSheet` como bottom sheet 25%.
* Implementar logout desde Perfil/Configuración.
* Implementar logout con destrucción de sesión Supabase, limpieza de storage local e invalidación de token.
* Implementar navegación post-logout a Login.
* Implementar reglas de seguridad anti-enumeración.
* Implementar cooldown visual por intentos fallidos según documento.
* Implementar separación conceptual Cuenta/Hogar en la navegación post-auth.
* Registrar roles MVP encontrados para uso posterior:
  * Coordinator.
  * Adult.
  * Adolescent.
  * Child.
  * Senior.
  * Guest.

### MOCK

No se encontró información MOCK aplicable a AUTH en este documento.

### POST_MVP

* 2FA opcional: existe en el documento, pero no se desarrolla en este fragment.
* Biometría opt-in: existe en el documento, pero no se desarrolla en este fragment.
* Selector de cuenta: existe en el documento, pero no se desarrolla en este fragment.
* Logout global / cerrar todas las sesiones: existe en el documento, pero no se desarrolla en este fragment.
* Eliminación de cuenta y soft-delete: existe en el documento, pero no se desarrolla en este fragment.

### IGNORAR

No se incluye contenido de módulos marcados como ignorar para esta entrega.

---

## 3. Información faltante

| Tema | Información faltante | Por qué importa | Impacto en implementación |
| ---- | -------------------- | --------------- | ------------------------- |
| Register API | No hay endpoint, método HTTP, request/response contractual ni códigos de error backend. | El documento delega en Supabase Auth y define UI/UX, no contrato backend propio. | Implementación depende de SDK Supabase o de una definición posterior. |
| Login API | No hay endpoint propio ni contrato request/response. | MVP exige login real. | Hay que implementar con Supabase SDK o definir wrapper API fuera de este documento. |
| Refresh Token | No hay endpoint propio ni payload definido. | MVP exige Refresh Token. | Solo puede extraerse como manejo SupabaseSession con refresh token de 7 días. |
| Logout API | No hay endpoint propio ni request/response. | MVP exige logout. | Solo se sabe que debe destruir sesión Supabase, limpiar storage local e invalidar token. |
| Crear hogar durante registro | No se define flujo, pantalla, campos, API ni relación con Register. | MVP lo exige. | No puede implementarse desde este documento sin otra fuente. |
| Contradicción Register vs crear hogar | El documento dice que Register standalone es solo credenciales + términos, y que el nombre se pide en onboarding. | El MVP solicitado pide crear hogar durante registro. | Extraer Register sin crear hogar y marcar creación de hogar como faltante. |
| Invitar miembros durante onboarding | No hay pantalla, campos, API, token/código, expiración, aceptación ni estados de invitación. | MVP lo exige. | No puede implementarse desde este documento sin otra fuente. |
| Invitación | Solo aparece un flujo de datos `Coordinador → Invitación → Persona`; no hay entidad Invitation implementable. | Invitaciones son parte del MVP. | Información insuficiente para crear modelo o endpoints. |
| Aceptar invitación | No se encontró flujo. | MVP Household/Onboarding lo exige. | Faltante total. |
| Onboarding por rol | No hay pantallas, pasos, permisos, campos ni comportamiento diferenciado por rol. | MVP lo exige. | Solo pueden extraerse roles generales, no flujo. |
| Roles y permisos | Hay descripciones generales, pero no matriz completa por acción. | MVP necesita permisos por rol. | Implementación de permisos queda incompleta. |
| Cuenta / Persona | No hay modelo completo ni campos técnicos. | Auth depende de estas entidades. | No se pueden definir migraciones completas. |
| Household / Membership | Hay relaciones y estados de Membership, pero no estructura implementable completa. | Auth deriva hacia hogar después de login/register. | Hace falta otra fuente para crear hogar, membresía e invitaciones. |
| Email verification | Register navega a verificación, pero no hay endpoint contractual. | El documento indica que email verificado es requerido. | Debe resolverse con Supabase o con definición posterior. |
| Eventos del sistema | No hay nombres técnicos. | Puede necesitarse auditoría/event bus. | Solo se pueden registrar eventos conceptuales. |
| Errores backend | Hay copies de UI, pero no mapping estable error-code → copy. | Necesario para frontend robusto. | Requiere definición posterior. |
| 2FA en navegación de login | Login success puede ir a 2FA si está configurado. | El flujo de login del documento lo menciona. | Este fragment no desarrolla 2FA por alcance; hay que decidir en merge si queda POST_MVP. |
| Biometría en sesión expirada | SessionExpired menciona biometría como alternativa. | El documento la incluye. | Este fragment implementa contraseña; biometría queda fuera del alcance solicitado. |

---

## 4. Fuente

* Archivo: `HomePlus — Diseño ed pantallas de Auth v1.md`
  * Sección: Cabecera / metadata del documento.
  * Sección: Alineación con Final Spec V1 §03.05 y §05.11.
  * Sección: `1. DIAGRAMA DE FLUJO AUTH`.
  * Sección: `2.1 LOGIN PRINCIPAL`.
  * Sección: `2.2 REGISTRO (Standalone)`.
  * Sección: `2.7 SESIÓN EXPIRADA / RE-LOGIN`.
  * Sección: `2.8 LOGOUT / CAMBIAR CUENTA`.
  * Sección: `2.8A — CONFIRMAR LOGOUT`.
  * Sección: `3. MATRIZ DE SEGURIDAD`.
  * Sección: `3.2 Principios de seguridad aplicados`.
  * Sección: `4. EDGE CASES`.
  * Sección: `4.1 Sin conexión a internet`.
  * Sección: `4.2 Token expirado`.
  * Sección: `4.3 Email ya registrado`.
  * Sección: `4.5 Múltiples dispositivos`.
  * Sección: `4.7 Intento de fuerza bruta`.
  * Sección: `4.8 Error de Supabase Auth (lado servidor)`.
  * Sección: `5. DECISIONES DE AUTH TOMADAS`.
* Archivo: `Diseño de pantallas auth.txt`
  * Sección: `OUTPUT 1 — ENTITIES`.
  * Sección: `OUTPUT 2 — RELATIONSHIPS`.
  * Sección: `OUTPUT 4 — DATA FLOWS`.
  * Sección: `OUTPUT 5 — BUSINESS RULES`.
  * Sección: `OUTPUT 6 — ARCHITECTURAL DECISIONS`.
* Archivo: `source_map_HomePlus_Disenio_pantallas_Auth_v1.md`
  * Sección: `4.1 AUTH`.
  * Sección: `4.2 ONBOARDING`.
  * Sección: `8. Mapa de permisos`.
  * Sección: `9. Mapa de flujos`.
  * Sección: `10. Mapa de APIs`.
  * Sección: `11. Mapa de UI`.
  * Sección: `17. Contradicciones detectadas`.
  * Sección: `18. Información faltante`.
