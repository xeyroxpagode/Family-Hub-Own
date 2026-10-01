**Producto: HomePlus — Sistema Operativo del Hogar**



**Versión: 2.0 (reescritura tras auditoría contra Final Spec V1 y Design System V2)**



**Fecha: Junio 2026**



**Dependencias: Final Spec V1 (documento canónico), Design System V2, UX Philosophy V2, UX Writing Guide V1**



**Plataforma: Mobile-first (375×812px base), React Native / Expo**



**Backend: Supabase Auth (email+password, Google OAuth, Apple OAuth, magic link, 2FA, biometría)**



**Principio rector: El login es la puerta de entrada a un hogar. Debe sentirse como volver a casa, no como pasar un control de seguridad.**



**Alineación con Final Spec V1 §03.05 y §05.11: La Cuenta pertenece al usuario. El Hogar es un ente separado. El flujo de autenticación respeta esta separación: el usuario se autentica con su Cuenta personal, y luego selecciona o ingresa a un Hogar. Las credenciales son de la persona, no del hogar.**



**1. DIAGRAMA DE FLUJO AUTH**

**Flujos secundarios:**



**\*.txt**

**Plaintext**

**─── SESIÓN EXPIRADA ───**

**Usuario en cualquier pantalla → token JWT expiró (Supabase 401)**

&#x20; **→ SESIÓN EXPIRADA (Pantalla 7)**

&#x20; **→ Email pre-rellenado, solo pide contraseña (o biometría)**

&#x20; **→ RE-AUTENTICACIÓN → HOME**

**─── LOGOUT / CAMBIAR CUENTA ───**

**Perfil → Configuración → Cerrar sesión**

&#x20; **→ CONFIRMAR LOGOUT (Pantalla 8A, Bottom Sheet 25%)**

&#x20; **→ LOGOUT EJECUTADO → Limpiar sesión → LOGIN**

**Perfil → Configuración → Cambiar cuenta**

&#x20; **→ SELECTOR CUENTAS (Pantalla 8B, Bottom Sheet 50%)**

&#x20; **→ Cambiar a otra cuenta guardada → HOME**

**─── ELIMINAR CUENTA ───**

**Perfil → Configuración → Eliminar cuenta**

&#x20; **→ ADVERTENCIA (Pantalla 9A)**

&#x20; **→ CONFIRMAR CON CONTRASEÑA (Pantalla 9B)**

&#x20; **→ CUENTA ELIMINADA (Pantalla 9C) → BIENVENIDA**

**Lista de estados cubiertos por el flujo:**



**Estado	Pantallas afectadas**

**Empty	Login, Registro, Recuperación (inputs vacíos)**

**Loading	Todos los submits de botones (spinner + overlay)**

**Error	Credenciales inválidas, red caída, token expirado, tasa limitada, 2FA incorrecto**

**Success	Login exitoso, registro exitoso, verificación completada, 2FA validado, biometría aceptada**

**Offline	Sin conexión: toast informativo, datos preservados en inputs**

**2. DESCRIPCIÓN DETALLADA DE CADA PANTALLA**

**FORMATO DE ESPECIFICACIÓN**

**Cada pantalla se documenta con:**



**Objetivo: qué debe lograr el usuario**

**Jerarquía visual: qué elemento destaca más, orden de lectura (según UX Philosophy §2.1)**

**Componentes DS usados: qué componentes del Design System V2**

**Copy exacto: todo el texto en pantalla en castellano LATAM**

**Validaciones y mensajes de error: reglas + copy de error**

**Estados: default, loading, success, error, disabled**

**Comportamiento del teclado: tipo, foco, next/submit**

**Transiciones: desde/hacia otras pantallas (con fallback prefers-reduced-motion)**

**A11y: accessibilityLabel, roles, focus**

**2.1 LOGIN PRINCIPAL**

**Pantalla: AuthLoginScreen**

**Ruta: /(auth)/login**



**Objetivo**

**Permitir que un usuario con cuenta existente ingrese a HomePlus de la forma más fluida posible. Funciona como pantalla independiente (usuario que vuelve) y dentro del flow de onboarding (segunda visita).**



**Jerarquía Visual**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│  bg: bg-primary (#FBFAF8)            │**

**│                                      │**

**│            🌿                        │ ← Logo HomePlus, 64×64px**

**│                                      │   prim-500**

**│         HomePlus                    │ ← Display (Fraunces 700, 32px/40px)**

**│                                      │   text-primary (#2D2A26)**

**│  El lugar donde tu hogar             │ ← Body S (Inter 400, 14px/20px)**

**│  se organiza solo.                   │   text-secondary (#6B6560)**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ 📧 Email                     │    │ ← CAPA 2: ACCIÓN (inputs)**

**│  │ mariana@email.com            │    │   Input md (44px)**

**│  └──────────────────────────────┘    │   type: email-address**

**│                                      │   keyboard: email**

**│  ┌──────────────────────────────┐    │**

**│  │ 🔑 Contraseña           👁️  │    │ ← Input md + toggle visibilidad**

**│  │ ••••••••                     │    │   type: password**

**│  └──────────────────────────────┘    │   keyboard: default**

**│                                      │**

**│         ¿Olvidaste tu contraseña?    │ ← Link text-link (prim-500)**

**│                                      │   caption (12px), alineado derecha**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │         Entrar               │    │ ← Botón primario, lg (52px)**

**│  └──────────────────────────────┘    │   full-width**

**│                                      │   disabled hasta email + pass**

**│                                      │**

**│  ──────────── o ────────────         │ ← Divider + "o" caption**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ G   Continuar con Google     │    │ ← Botón secondary, lg (52px)**

**│  └──────────────────────────────┘    │   Google icon 20px**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │    Continuar con Apple       │    │ ← Botón secondary, lg (52px)**

**│  └──────────────────────────────┘    │   Apple icon 20px**

**│                                      │**

**│                                      │**

**│  ¿No tenés cuenta?                  │ ← CAPA 4: EXPLORACIÓN**

**│  ┌──────────────────────────────┐    │   Body S + link**

**│  │       Crear cuenta           │    │ ← Botón ghost, md (44px)**

**│  └──────────────────────────────┘    │   prim-600**

**└──────────────────────────────────────┘**

**Jerarquía por capas (UX Philosophy §2.1)**

**Capa	Elemento	Justificación**

**Capa 1: ATENCIÓN	Logo + nombre + tagline	«Estoy en el lugar correcto.» Identidad de marca inmediata. Menos de 2s de lectura.**

**Capa 2: ACCIÓN	Inputs + botón Entrar + social login	El usuario vino a entrar. Los inputs son la acción principal. Social login igual de prominente.**

**Capa 3: CONTEXTO	Link de recuperación	Solo visible si el usuario tiene fricción.**

**Capa 4: EXPLORACIÓN	Link a crear cuenta	Para nuevos usuarios que llegaron acá por error.**

**Componentes del Design System V2 usados**

**Componente	Variante	Tamaño	Notas**

**Logo	ícono home-leaf	64×64px	prim-500, centrado**

**Heading	Fraunces 700	32px/40px	«HomePlus»**

**Body S	Inter 400	14px/20px	Tagline, text-secondary**

**Input	default	md (44px)	Email + Password. Label arriba. accessibilityLabel obligatorio (DS V2 §7.5).**

**Toggle visibilidad	ícono ojo	20px	text-tertiary, solo en password**

**Link	text-link	caption (12px)	«¿Olvidaste tu contraseña?»**

**Botón primario	primary	lg (52px)	«Entrar». Háptico light / clockTick (DS V2 §5.1).**

**Divider	divider + texto	—	«o» en caption**

**Botón social	secondary	lg (52px)	Google + Apple. Háptico light / clockTick.**

**Link secundario	ghost	md (44px)	«Crear cuenta»**

**Espaciado	space-5	20px	Márgenes laterales**

**Espaciado	space-4	16px	Gap entre elementos**

**Copy Exacto**

**Elemento	Texto**

**Logo + nombre	HomePlus**

**Tagline	El lugar donde tu hogar se organiza solo.**

**Input email (label)	Email**

**Input email (placeholder)	Email**

**Input password (label)	Contraseña**

**Input password (placeholder)	Contraseña**

**Link recuperación	¿Olvidaste tu contraseña?**

**Botón primario	Entrar**

**Divider	o**

**Botón Google	Continuar con Google**

**Botón Apple	Continuar con Apple**

**Link crear cuenta	Crear cuenta**

**Texto pre-link	¿No tenés cuenta?**

**Validaciones y Mensajes de Error**

**Validación	Regla	Momento	Mensaje de error**

**Email formato	Regex básico: algo@algo.algo	on-blur	Ese email no es válido. ¿Lo revisás?**

**Email vacío	—	—	(botón deshabilitado, sin mensaje)**

**Password vacío	—	—	(botón deshabilitado, sin mensaje)**

**Credenciales inválidas	Email + password no coinciden	on-submit	Ese email o contraseña no son correctos. ¿Probás de nuevo?**

**Email no verificado	Email existe pero no verificado	on-submit	Tu email todavía no está verificado. ¿Reenviamos el link? → \[Reenviar]**

**Cuenta eliminada	user marcado como deleted	on-submit	Esta cuenta ya no existe. Si querés, podés crear una nueva. → \[Crear cuenta]**

**Conexión caída	Sin red	on-submit	Sin conexión. Cuando vuelva, entrás sin problema.**

**Google OAuth error	Error del provider	on-tap	No se pudo conectar con Google. ¿Probás de nuevo?**

**Apple OAuth error	Error del provider	on-tap	No se pudo conectar con Apple. ¿Probás de nuevo?**

**Tasa limitada	Demasiados intentos	on-submit	Muchos intentos. Esperá un minuto y probá de nuevo.**

**🔒 REGLA DE SEGURIDAD CRÍTICA (S-01): Nunca mostrar «Email no encontrado» como mensaje separado de «Contraseña incorrecta». El mensaje DEBE ser unificado: «Ese email o contraseña no son correctos. ¿Probás de nuevo?». Esto evita que un atacante pueda enumerar emails existentes (OWASP AT-008).**



**Estados**

**DEFAULT**

**Inputs vacíos con placeholder visible.**

**Botón «Entrar» deshabilitado (bg: prim-300 #E3BAA0, text: white).**

**Botones sociales habilitados y visibles.**

**Link «¿Olvidaste tu contraseña?» visible.**

**FILLED (email + password con datos)**

**Botón «Entrar» habilitado (bg: prim-500 #C17F59, text: white).**

**Ambos inputs muestran texto ingresado.**

**Password muestra bullets (•) o texto según toggle.**

**FOCUS (en un input)**

**Input activo: borde 2px prim-500 #C17F59, ring 3px prim-100 #F2E0D4 (DS V2 §4.4).**

**Label permanece visible arriba del input.**

**Teclado visible según tipo de input.**

**ERROR (en un campo)**

**Input: borde 2px error-500 #C46B6B, ring 3px error-100 #F5E2E2 (DS V2 §4.4).**

**Texto de error debajo en caption (12px, error-600 #A85050).**

**El otro input permanece en su estado.**

**Botón deshabilitado si hay errores.**

**LOADING (tap en «Entrar»)**

**Botón: texto se reemplaza por spinner prim-500 sobre bg prim-600 #A86B45.**

**Overlay sutil (surface-overlay rgba(45,42,38,0.50) al 30%) sobre toda la pantalla para prevenir doble tap.**

**Inputs y links se deshabilitan visualmente (opacity 0.5, no interactivos).**

**Mínimo 400ms de loading para evitar flicker (DS V2 §4.1). El spinner aparece solo si la operación excede 300ms.**

**Si la autenticación tarda >3s, aparece texto debajo del botón: «Conectando con tu hogar...»**

**LOADING (tap en Google/Apple)**

**Se abre flow nativo del SO. Mientras tanto:**

**Overlay con spinner centrado + texto «Conectando...»**

**Toda la pantalla detrás del overlay con opacity reducida.**

**ERROR GENERAL (on-submit)**

**Toast en zona superior (Top, DS V2 §4.13): borde izquierdo error-500 #C46B6B 3px, bg error-100 #F5E2E2.**

**Duración 4s. Háptico warning (DS V2 §4.13).**

**El formulario permanece visible. El usuario puede reintentar inmediatamente.**

**SUCCESS**

**Transición crossfade 300ms a:**

**Home (si ya tiene onboarding completo)**

**Pantalla 2FA (si tiene 2FA configurado)**

**Onboarding (si es primera vez)**

**Comportamiento del Teclado**

**Campo	Tipo de teclado	Foco inicial	Return key**

**Email	email-address	SÍ (autofocus al entrar a la pantalla)	next → foco a Password**

**Password	default	No	go → ejecuta submit**

**Return key: Email = next, Password = go (dispara «Entrar»).**

**Safe area: El formulario se desplaza hacia arriba para que el input activo quede visible sobre el teclado (KeyboardAvoidingView).**

**Scroll: No hay scroll en esta pantalla. Todo cabe en 375×812px.**

**Al cerrar teclado: tap fuera de los inputs o botón «Done» en iOS.**

**Transiciones**

**Desde	Hacia	Tipo	Duración	Reduced Motion**

**Bienvenida (Onboarding)	Login	Stack push, slide right→left	250ms ease-out	0ms**

**Cualquier pantalla (sesión expirada)	Login	Crossfade	300ms	0ms**

**App cold start (sin sesión)	Login	Fade-in	300ms	0ms**

**Login → Home	Home	Crossfade	300ms	0ms**

**Login → 2FA	2FA	Stack push, slide right→left	250ms ease-out	0ms**

**Login → Onboarding	Onboarding	Stack push, slide right→left	250ms ease-out	0ms**

**Login → Registro	Registro	Stack push, slide right→left	250ms ease-out	0ms**

**Login → Recuperación	Recuperación	Stack push, slide right→left	250ms ease-out	0ms**

**Motion: Todas las transiciones respetan prefers-reduced-motion. Si el SO tiene la preferencia activada, la duración es 0ms (instantáneo) (DS V2 §5.2, §7.1).**



**A11y**

**Elemento	accessibilityLabel	accessibilityRole	Notas**

**Input Email	«Email»	none (input)	Focus ring visible, 3px prim-100**

**Input Password	«Contraseña»	none (input)	Focus ring visible, toggle anuncia estado**

**Botón Entrar	«Entrar a HomePlus»	button	Anuncia «cargando» durante spinner**

**Botón Google	«Continuar con Google»	button**	

**Botón Apple	«Continuar con Apple»	button**	

**Link recuperación	«Recuperar contraseña»	link**	

**Link crear cuenta	«Crear cuenta nueva»	link**	

**Notas de Diseño**

**Performance: La pantalla de login DEBE cargar en <2s. Es la primera impresión. El logo y el tagline son estáticos (no dependen de red). Los botones sociales cargan sus íconos de assets locales. Nada bloquea el render inicial.**

**Login social como alternativa, no como fuga: Los botones de Google y Apple son secondary (mismo tamaño lg 52px que el botón primario «Entrar»), no ghost ni pequeños.**

**Orden de botones sociales: Google primero, Apple segundo. Refleja adopción LATAM.**

**«Entrar» no «Iniciar sesión»: El UX Writing Guide prohíbe lenguaje corporativo. «Entrar» es más humano y coloquial LATAM.**

**Placeholder vs Label: Los inputs usan label arriba + placeholder complementario (DS V2 §4.4). El placeholder dice «Email» / «Contraseña». No «Ingresá tu email» (brevedad radical, UX Writing §1.2).**

**Toggle de visibilidad: El ojo 👁️ cambia entre eye y eye-off. Especialmente útil en mobile donde los errores de tipeo son frecuentes.**

**El botón de crear cuenta está deliberadamente como ghost al final: No compite con la acción principal (Entrar). Pero es accesible para nuevos usuarios que llegaron por error.**

**Háptico: Todo tap en botón recibe háptico light (iOS) / clockTick (Android) (DS V2 §5.1).**

**2.2 REGISTRO (Standalone)**

**Pantalla: AuthRegisterScreen**

**Ruta: /(auth)/register**



**Objetivo**

**Crear una cuenta nueva de HomePlus. Esta pantalla funciona de forma independiente (fuera del onboarding) para usuarios que llegan directo desde «Crear cuenta» en el Login. A diferencia del onboarding, este flujo es mínimo: credenciales + aceptar términos.**



**Jerarquía Visual**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│  ← Volver                            │ ← Header con botón back**

**│                                      │**

**│  Creá tu cuenta                      │ ← H1 (Fraunces 600, 28px/36px)**

**│                                      │   text-primary**

**│  Es rápido, solo un minuto.          │ ← Body S, text-secondary**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ 📧 Email                     │    │ ← Input md (44px)**

**│  │ mariana@email.com            │    │   type: email-address**

**│  └──────────────────────────────┘    │   autofocus**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ 🔑 Contraseña           👁️  │    │ ← Input md + toggle**

**│  │ ••••••••                     │    │   type: password**

**│  └──────────────────────────────┘    │**

**│  Mínimo 8 caracteres                 │ ← Caption, text-tertiary**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ 🔑 Confirmar contraseña  👁️ │    │ ← Input md + toggle**

**│  │ ••••••••                     │    │   type: password**

**│  └──────────────────────────────┘    │**

**│                                      │**

**│  ┌──┐                                │ ← Checkbox (24×24px, DS V2 §4.6)**

**│  │  │ Acepto los Términos y          │   touch target 44×44px**

**│  └──┘ Condiciones y la Política      │   + texto body S**

**│       de Privacidad.                 │   Links en prim-500**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │       Crear cuenta           │    │ ← Botón primario, lg (52px)**

**│  └──────────────────────────────┘    │   disabled hasta validación**

**│                                      │**

**│  ──────────── o ────────────         │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ G   Continuar con Google     │    │ ← Botón secondary, lg (52px)**

**│  └──────────────────────────────┘    │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │    Continuar con Apple       │    │ ← Botón secondary, lg (52px)**

**│  └──────────────────────────────┘    │**

**│                                      │**

**│  ¿Ya tenés cuenta?                  │ ← Body S + link**

**│  ┌──────────────────────────────┐    │**

**│  │          Entrar              │    │ ← Botón ghost, md (44px)**

**│  └──────────────────────────────┘    │**

**└──────────────────────────────────────┘**

**Componentes del Design System V2 usados**

**Componente	Variante	Tamaño	Notas**

**Heading	Fraunces 600	28px/36px	«Creá tu cuenta»**

**Body S	Inter 400	14px/20px	Subtítulo, text-secondary**

**Input Email	default	md (44px)	type: email-address. accessibilityLabel: «Email»**

**Input Password	default	md (44px)	×2 (contraseña + confirmar). accessibilityLabel en cada uno**

**Toggle visibilidad	ícono ojo	20px	En ambos password inputs**

**Caption	Inter 500	12px/16px	«Mínimo 8 caracteres»**

**Checkbox	—	24×24px	prim-500 #C17F59 cuando checked. Touch target 44×44px (DS V2 §4.6)**

**Link en texto	text-link	body S	Términos y Privacidad**

**Botón primario	primary	lg (52px)	«Crear cuenta». Háptico light / clockTick**

**Botones sociales	secondary	lg (52px)	Google + Apple. Háptico light / clockTick**

**Botón ghost	ghost	md (44px)	«Entrar»**

**Divider	divider + texto	—	«o»**

**Copy Exacto**

**Elemento	Texto**

**Heading	Creá tu cuenta**

**Subtítulo	Es rápido, solo un minuto.**

**Input email (label)	Email**

**Input email (placeholder)	Email**

**Input password (label)	Contraseña**

**Input password (placeholder)	Contraseña**

**Input confirmar (label)	Confirmar contraseña**

**Input confirmar (placeholder)	Confirmar contraseña**

**Helper password	Mínimo 8 caracteres**

**Checkbox	Acepto los Términos y Condiciones y la Política de Privacidad.**

**Botón primario	Crear cuenta**

**Divider	o**

**Botón Google	Continuar con Google**

**Botón Apple	Continuar con Apple**

**Link login	Entrar**

**Texto pre-link	¿Ya tenés cuenta?**

**Validaciones y Mensajes de Error**

**Validación	Regla	Momento	Mensaje**

**Email formato	algo@algo.algo	on-blur	Ese email no es válido. ¿Lo revisás?**

**Email ya registrado	Query a Supabase	on-blur	Ese email ya tiene cuenta. ¿Querés entrar? → \[Entrar]**

**Contraseña longitud	≥ 8 caracteres	on-blur	Mínimo 8 caracteres.**

**Contraseña fortaleza	Al menos 1 número o carácter especial	on-blur	Sumale un número o un signo para que sea más segura.**

**Contraseñas coinciden	Pass1 === Pass2	on-blur (confirmar)	Las contraseñas no coinciden.**

**Checkbox aceptado	Debe estar checked	on-submit	Marcá la casilla para continuar. (inline, sin toast)**

**Conexión caída	Sin red	on-submit	Sin conexión. Probá de nuevo en un momento.**

**Estados**

**DEFAULT**

**Inputs vacíos. Placeholders visibles.**

**Checkbox sin marcar.**

**Botón «Crear cuenta» deshabilitado (prim-300 #E3BAA0).**

**Helper text «Mínimo 8 caracteres» en caption text-tertiary #9B9590.**

**FILLED (todos los campos válidos + checkbox)**

**Botón habilitado (prim-500 #C17F59).**

**Checkbox marcado con check prim-500.**

**Ambos inputs password muestran bullets.**

**ERROR (validación inline)**

**Input con error: borde 2px error-500 #C46B6B, ring 3px error-100 #F5E2E2 (DS V2 §4.4).**

**Texto de error debajo del input en caption error-600 #A85050.**

**El botón permanece disabled hasta que todos los errores se corrigen.**

**LOADING (tap en «Crear cuenta»)**

**Botón: spinner prim-500 sobre bg prim-600 #A86B45.**

**Overlay sutil previene doble tap.**

**Mínimo 400ms (DS V2 §4.1). Spinner visible solo si >300ms.**

**SUCCESS**

**Cuenta creada → Stack push a Verificación de Email (Pantalla 4A).**

**Si es login social → Stack push a Onboarding.**

**ERROR (on-submit, red)**

**Toast superior (Top, DS V2 §4.13): «Sin conexión. Probá de nuevo en un momento.»**

**Comportamiento del Teclado**

**Campo	Tipo de teclado	Foco	Return key**

**Email	email-address	SÍ (autofocus)	next → Password**

**Contraseña	default	—	next → Confirmar**

**Confirmar	default	—	go → submit**

**El formulario hace scroll si es necesario en pantallas pequeñas (<568px altura).**

**KeyboardAvoidingView activo.**

**Transiciones**

**Desde	Hacia	Tipo	Duración	Reduced Motion**

**Login → Registro	Registro	Stack push, slide right→left	250ms ease-out	0ms**

**Registro → Login (back)	Login	Stack pop	250ms ease-out	0ms**

**Registro → Verificación Email	Verificación	Stack push, slide right→left	250ms ease-out	0ms**

**Registro → Onboarding (Google/Apple)	Onboarding	Stack push, slide right→left	250ms ease-out	0ms**

**A11y**

**Elemento	accessibilityLabel	accessibilityRole**

**Input Email	«Email»	none (input)**

**Input Contraseña	«Contraseña nueva»	none (input)**

**Input Confirmar	«Confirmar contraseña»	none (input)**

**Checkbox	«Acepto los Términos y Condiciones»	checkbox**

**Botón Crear cuenta	«Crear cuenta»	button**

**Notas de Diseño**

**No pedimos nombre en el registro standalone. El nombre se pide en el onboarding. Esto mantiene el registro en 1 pantalla y reduce fricción. El email es la única identidad necesaria para crear la cuenta.**

**El checkbox de términos NO es un link que abre webview. Los términos y privacidad son links (text-link) que abren bottom sheet con el texto o webview. El checkbox es el mecanismo de aceptación.**

**«Creá tu cuenta» en lugar de «Registrarse»: Consistente con el tono Geni: simple, directo, sin vocabulario corporativo.**

**La helper text de contraseña («Mínimo 8 caracteres») está siempre visible en caption. No es un error. Es ayuda contextual.**

**Validación de fortaleza progresiva: No bloqueamos al usuario con requisitos absurdos. Solo pedimos ≥8 caracteres + al menos 1 número o signo. Si quiere poner «12345678», lo dejamos (es su decisión), pero sugerimos mejorarlo.**

**2.3 RECUPERACIÓN DE CONTRASEÑA**

**Son 3 pantallas en secuencia.**



**2.3A — INGRESAR EMAIL**

**Pantalla: AuthRecoveryEmailScreen**



**Objetivo**

**Permitir al usuario iniciar el flujo de recuperación de contraseña ingresando su email.**



**Jerarquía Visual**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│  ← Volver                            │**

**│                                      │**

**│  ¿Olvidaste tu                       │ ← H1 (Fraunces 600, 28px/36px)**

**│  contraseña?                         │**

**│                                      │**

**│  No pasa nada. Te enviamos           │ ← Body (Inter 400, 16px/24px)**

**│  un link para que elijas             │   text-secondary**

**│  una nueva.                          │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ 📧 Email                     │    │ ← Input md (44px)**

**│  │ mariana@email.com            │    │   type: email-address**

**│  └──────────────────────────────┘    │   autofocus**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │       Enviar link            │    │ ← Botón primario, lg (52px)**

**│  └──────────────────────────────┘    │   disabled hasta email válido**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ Volver al inicio de sesión   │    │ ← Botón ghost, md (44px)**

**│  └──────────────────────────────┘    │**

**└──────────────────────────────────────┘**

**Copy Exacto**

**Elemento	Texto**

**Heading	¿Olvidaste tu contraseña?**

**Subtítulo	No pasa nada. Te enviamos un link para que elijas una nueva.**

**Input email (label)	Email**

**Input email (placeholder)	Email**

**Botón primario	Enviar link**

**Botón ghost	Volver al inicio de sesión**

**Validaciones**

**Validación	Regla	Mensaje**

**Email formato	algo@algo.algo	Ese email no es válido. ¿Lo revisás?**

**Email no registrado	Query a Supabase	(no se revela. Ver matriz de seguridad §3)**

**🔒 REGLA DE SEGURIDAD (S-01): Si el email NO existe en el sistema, NO mostramos error. Mostramos éxito igual. «Si ese email tiene cuenta, ya te llegó el link.» Esto evita enumeración de emails.**



**Estados**

**DEFAULT: Input vacío, botón disabled.**

**FILLED: Email válido, botón enabled.**

**LOADING: Spinner en botón. Overlay. Mínimo 400ms (DS V2 §4.1).**

**SUCCESS: → Transición a Pantalla 3B (Confirmación de envío).**

**ERROR (red): Toast superior (Top, DS V2 §4.13): «Sin conexión. Cuando vuelva, te mandamos el link.»**

**2.3B — CONFIRMACIÓN DE ENVÍO**

**Pantalla: AuthRecoverySentScreen**



**Objetivo**

**Confirmar que el link fue enviado (o que lo será si el email existe) y guiar al usuario a revisar su bandeja de entrada.**



**Jerarquía Visual**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│  ← Volver                            │**

**│                                      │**

**│            📧                        │ ← Ícono email, 64×64px**

**│                                      │   prim-300 (#E3BAA0)**

**│  ¡Listo! Revisá tu correo            │ ← H1 (Fraunces 600, 28px/36px)**

**│                                      │**

**│  Si mariana@email.com tiene          │ ← Body, text-secondary**

**│  cuenta, ya le llegó un link.        │**

**│                                      │**

**│  ┌──────────────────────────────────┐│ ← Card info (info-100 #E4E9ED bg,**

**│  │ 💡 El link vence en 1 hora.     ││   borde izq info-500 #7A8B9B 4px,**

**│  │ Si no lo ves, revisá en spam.   ││   padding 16px, radius-md 12px)**

**│  └──────────────────────────────────┘│   texto info-600 #5F707F**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │    Abrir app de correo       │    │ ← Botón primary, lg (52px)**

**│  └──────────────────────────────┘    │   (deep link a mail app)**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │       Reenviar link          │    │ ← Botón ghost, md (44px)**

**│  └──────────────────────────────┘    │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ Volver al inicio de sesión   │    │ ← Botón ghost, md (44px)**

**│  └──────────────────────────────┘    │**

**└──────────────────────────────────────┘**

**Copy Exacto**

**Elemento	Texto**

**Heading	¡Listo! Revisá tu correo**

**Subtítulo	Si mariana@email.com tiene cuenta, ya le llegó un link.**

**Card info	El link vence en 1 hora. Si no lo ves, revisá en spam.**

**Botón primario	Abrir app de correo**

**Botón ghost 1	Reenviar link**

**Botón ghost 2	Volver al inicio de sesión**

**Estados**

**DEFAULT: Instrucciones visibles.**

**Reenviar (loading): Botón ghost muestra spinner. Toast superior al terminar: «Link reenviado. Revisá tu correo.»**

**Reenviar (error): Toast superior: «No se pudo reenviar. ¿Probás de nuevo?»**

**2.3C — NUEVA CONTRASEÑA (desde el link)**

**Pantalla: AuthRecoveryNewPasswordScreen**

**Ruta: /(auth)/recovery?token=xxx**



**Objetivo**

**Permitir al usuario establecer una nueva contraseña después de hacer clic en el magic link de recuperación.**



**Jerarquía Visual**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│                                      │**

**│  Elegí una contraseña                │ ← H1 (Fraunces 600, 28px/36px)**

**│  nueva                              │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ 🔑 Contraseña nueva     👁️  │    │ ← Input md (44px)**

**│  │ ••••••••                     │    │**

**│  └──────────────────────────────┘    │**

**│  Mínimo 8 caracteres                 │ ← Caption, text-tertiary**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ 🔑 Confirmar contraseña  👁️ │    │ ← Input md (44px)**

**│  │ ••••••••                     │    │**

**│  └──────────────────────────────┘    │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │     Cambiar contraseña       │    │ ← Botón primario, lg (52px)**

**│  └──────────────────────────────┘    │**

**└──────────────────────────────────────┘**

**Validaciones y Estados**

**Situación	Comportamiento**

**Token inválido/expirado	Al cargar la pantalla: «El link ya no es válido. Pedí uno nuevo.» → Botón «Volver al inicio de sesión».**

**Contraseñas no coinciden	Validación on-blur: «Las contraseñas no coinciden.»**

**Éxito	Toast superior success: «Contraseña actualizada.» → Transición a Login.**

**2.4 VERIFICACIÓN DE EMAIL**

**Son 3 pantallas en secuencia.**



**2.4A — POST-REGISTRO: REVISÁ TU EMAIL**

**Pantalla: AuthVerifyEmailSentScreen**



**Objetivo**

**Informar al usuario que debe verificar su email antes de continuar, y ofrecer opciones para reenviar el link.**



**Jerarquía Visual**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│                                      │**

**│            ✉️                        │ ← Ícono email con check**

**│                                      │   prim-300 (#E3BAA0), 64×64px**

**│  Te mandamos un link                 │ ← H1 (Fraunces 600, 28px/36px)**

**│                                      │**

**│  Verificá tu email para              │ ← Body, text-secondary**

**│  activar tu cuenta.                  │**

**│                                      │**

**│  Se lo enviamos a:                   │ ← Caption, text-tertiary**

**│  mariana@email.com                   │ ← Body semibold, text-primary**

**│                                      │**

**│  ┌──────────────────────────────────┐│ ← Card info (info-100 #E4E9ED bg,**

**│  │ 💡 Si no lo ves en unos         ││   borde izq info-500 4px)**

**│  │ minutos, revisá en spam.        ││**

**│  └──────────────────────────────────┘│**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │    Abrir app de correo       │    │ ← Botón primary, lg (52px)**

**│  └──────────────────────────────┘    │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │       Reenviar link          │    │ ← Botón ghost, md (44px)**

**│  └──────────────────────────────┘    │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │       Cambiar email          │    │ ← Botón ghost, md (44px)**

**│  └──────────────────────────────┘    │   (vuelve a registro)**

**└──────────────────────────────────────┘**

**Copy Exacto**

**Elemento	Texto**

**Heading	Te mandamos un link**

**Subtítulo	Verificá tu email para activar tu cuenta.**

**Email del usuario	mariana@email.com**

**Card info	Si no lo ves en unos minutos, revisá en spam.**

**Botón primario	Abrir app de correo**

**Ghost 1	Reenviar link**

**Ghost 2	Cambiar email**

**2.4B — VERIFICANDO... (transición automática)**

**El usuario hace clic en el link del email → La app se abre con el token → Se muestra un estado de carga breve:**



**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│                                      │**

**│            ⟳ (animación)             │ ← Spinner prim-500**

**│                                      │**

**│     Verificando tu cuenta...         │ ← H2 (Fraunces 600, 24px/32px)**

**│                                      │   text-primary**

**└──────────────────────────────────────┘**

**Duración: Mientras Supabase procesa el token. Normalmente <1s.**



**2.4C — EMAIL VERIFICADO**

**Pantalla: AuthVerifyEmailSuccessScreen**



**Jerarquía Visual**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│                                      │**

**│            🎯                        │ ← Ícono éxito, 64×64px**

**│                                      │   success-500 (#6B9E7A)**

**│  ¡Todo listo!                        │ ← H1 (Fraunces 600, 28px/36px)**

**│                                      │**

**│  Tu email está verificado.           │ ← Body, text-secondary**

**│  Ahora sí, entremos a tu hogar.      │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │    Entrar a HomePlus        │    │ ← Botón primario, lg (52px)**

**│  └──────────────────────────────┘    │   Háptico light / clockTick**

**└──────────────────────────────────────┘**

**Copy Exacto**

**Elemento	Texto**

**Heading	¡Todo listo!**

**Subtítulo	Tu email está verificado. Ahora sí, entremos a tu hogar.**

**Botón	Entrar a HomePlus**

**Transiciones**

**Tap en «Entrar a HomePlus» → Onboarding (primera vez) o Home (si ya completó onboarding).**

**2.5 2FA (TWO-FACTOR AUTHENTICATION)**

**El 2FA es opcional y configurable desde Perfil > Seguridad. Si está activo, aparece después del login exitoso y antes de llegar al Home.**



**2.5A — CÓDIGO 2FA**

**Pantalla: Auth2FAChallengeScreen**



**Jerarquía Visual**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│  ← Cancelar                          │ ← Vuelve al login**

**│                                      │**

**│  🔐 Verificación extra               │ ← H2 (Fraunces 600, 24px/32px)**

**│                                      │**

**│  Para asegurarnos de que sos         │ ← Body, text-secondary**

**│  vos, ingresá el código.             │**

**│                                      │**

**│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐     │ ← 6 inputs individuales**

**│  │  │ │  │ │  │ │  │ │  │ │  │     │   36×44px cada uno**

**│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘     │   radius-sm (6px)**

**│                                      │   border: divider-strong (#D5CFC7)**

**│                                      │   foco automático en 1°**

**│                                      │   auto-avance al escribir**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │         Verificar            │    │ ← Botón primario, lg (52px)**

**│  └──────────────────────────────┘    │   habilitado con 6 dígitos**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │   Usar código de backup      │    │ ← Botón ghost, md (44px)**

**│  └──────────────────────────────┘    │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │    Reenviar código (30s)     │    │ ← Botón ghost, md (44px)**

**│  └──────────────────────────────┘    │   con countdown**

**└──────────────────────────────────────┘**

**Comportamiento de los 6 inputs**

**Autofocus: Primer input recibe foco al abrir pantalla.**

**Auto-avance: Al escribir un dígito, el foco salta al siguiente input automáticamente.**

**Auto-submit: Al escribir el sexto dígito, se ejecuta la verificación automáticamente (sin necesidad de tocar «Verificar»).**

**Backspace: Borra el input actual. Si está vacío, salta al anterior y lo borra.**

**Pegado: Si el usuario pega un código de 6 dígitos, se distribuye automáticamente en los 6 inputs.**

**Teclado: number-pad (solo números).**

**Validaciones y Estados**

**Situación	Comportamiento**

**6 dígitos ingresados	Auto-submit. Botón muestra spinner.**

**Código incorrecto	Shake suave en los inputs + borde 2px error-500. Texto: «Ese código no es válido. ¿Probás de nuevo?» Se limpian los inputs. Foco vuelve al primero.**

**Código expirado	«El código ya venció. Te mandamos uno nuevo.» → Se reenvía automáticamente.**

**3 intentos fallidos	«Demasiados intentos. Usá un código de backup o esperá 5 minutos.»**

**Countdown reenvío	El botón «Reenviar código» muestra cuenta regresiva: «Reenviar código (25s)». Se habilita a los 30s.**

**2.5B — MÉTODO DE 2FA (Configuración)**

**Pantalla: Auth2FASetupScreen**

**Acceso: Perfil > Seguridad > Autenticación en dos pasos**



**Jerarquía Visual**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│  ← Volver                            │**

**│                                      │**

**│  Autenticación en                    │ ← H1 (Fraunces 600, 28px/36px)**

**│  dos pasos                          │**

**│                                      │**

**│  Una capa más de seguridad           │ ← Body, text-secondary**

**│  para tu cuenta.                     │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ 📱 App de autenticación      │    │ ← Card seleccionable**

**│  │ Google Authenticator,    →   │    │   Recomendado (badge prim-500)**

**│  │ Authy, etc.                  │    │**

**│  └──────────────────────────────┘    │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ 💬 SMS                       │    │ ← Card**

**│  │ Código por mensaje       →   │    │**

**│  └──────────────────────────────┘    │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ 🎫 Códigos de backup         │    │ ← Card**

**│  │ Por si perdés el acceso  →   │    │**

**│  └──────────────────────────────┘    │**

**└──────────────────────────────────────┘**

**Flujo de configuración (Authenticator App)**

**Usuario elige «App de autenticación»**

**Se muestra QR code + clave manual**

**Usuario escanea con su app**

**Ingresa código de 6 dígitos para confirmar**

**Se generan 8 códigos de backup (ver abajo)**

**Códigos de Backup**

**8 códigos de 8 dígitos.**

**Cada código se puede usar 1 sola vez.**

**Se muestran en una pantalla con opción «Copiar todos» y «Descargar como texto».**

**Advertencia: «Guardalos en un lugar seguro. Fuera del teléfono. No los pierdas.»**

**2.6 AUTENTICACIÓN BIOMÉTRICA**

**2.6A — CONFIGURACIÓN DE BIOMETRÍA**

**Pantalla: AuthBiometricSetupScreen**

**Acceso: Desde Perfil > Seguridad, o sugerido después del primer login exitoso.**



**Jerarquía Visual**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│                                      │**

**│          🖐️ / 😊                     │ ← Ícono biométrico**

**│                                      │   (huella en Android,**

**│                                      │   Face ID en iOS)**

**│                                      │   64×64px, prim-500 (#C17F59)**

**│  ¿Querés entrar                      │ ← H1 (Fraunces 600, 28px/36px)**

**│  más rápido?                        │**

**│                                      │**

**│  Activá el acceso con tu             │ ← Body, text-secondary**

**│  huella o Face ID y entrá            │**

**│  sin poner la contraseña.            │**

**│                                      │**

**│  ┌──────────────────────────────────┐│ ← Card info (info-100 #E4E9ED bg,**

**│  │ 🔒 Tu información biométrica   ││   borde izq info-500 4px,**

**│  │ nunca sale de tu teléfono.     ││   padding 16px, radius-md 12px)**

**│  │ Solo vos podés desbloquear     ││**

**│  │ HomePlus de esta forma.       ││**

**│  └──────────────────────────────────┘│**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │   Activar acceso rápido      │    │ ← Botón primario, lg (52px)**

**│  └──────────────────────────────┘    │   (gatilla OS biometric dialog)**

**│                                      │   Háptico light / clockTick**

**│  ┌──────────────────────────────┐    │**

**│  │        No, gracias           │    │ ← Botón ghost, md (44px)**

**│  └──────────────────────────────┘    │**

**└──────────────────────────────────────┘**

**Copy Exacto**

**Elemento	Texto**

**Heading	¿Querés entrar más rápido?**

**Subtítulo	Activá el acceso con tu huella o Face ID y entrá sin poner la contraseña.**

**Card info	Tu información biométrica nunca sale de tu teléfono. Solo vos podés desbloquear HomePlus de esta forma.**

**Botón primario	Activar acceso rápido**

**Botón ghost	No, gracias**

**Estados**

**Default: Instrucciones visibles.**

**Tap «Activar acceso rápido»: Se dispara diálogo biométrico del SO.**

**Si el usuario autentica → Toast superior success: «Acceso rápido activado.» → Vuelve a Seguridad.**

**Si el usuario cancela → Sin cambios. Puede reintentar.**

**Si el dispositivo no soporta biometría → No se muestra esta pantalla.**

**2.6B — PANTALLA DE DESBLOQUEO BIOMÉTRICO**

**Pantalla: AuthBiometricUnlockScreen**

**Se muestra: Al abrir la app cuando hay sesión activa y biometría configurada.**



**Jerarquía Visual**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│                                      │**

**│                                      │**

**│          🖐️ / 😊                     │ ← Ícono biométrico**

**│                                      │   80×80px**

**│                                      │   prim-300 (#E3BAA0)**

**│  Desbloqueá HomePlus                │ ← H2 (Fraunces 600, 24px/32px)**

**│                                      │**

**│  Usá tu huella o Face ID             │ ← Body S, text-secondary**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │      Usar contraseña         │    │ ← Botón ghost, md (44px)**

**│  └──────────────────────────────┘    │   (fallback)**

**└──────────────────────────────────────┘**

**Comportamiento**

**La pantalla se muestra.**

**Inmediatamente (sin esperar tap del usuario) se dispara el diálogo biométrico del SO.**

**Si el usuario autentica → Crossfade 300ms a Home.**

**Si el usuario cancela el diálogo del SO → El ícono biométrico queda visible. El usuario puede:**

**Tocar el ícono biométrico para reintentar.**

**Tocar «Usar contraseña» para ir al fallback.**

**Si la biometría falla 3 veces → El SO bloquea la biometría. Se muestra automáticamente la pantalla de fallback.**

**Fallback: Contraseña**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│                                      │**

**│  🔑 Ingresá tu contraseña            │ ← H2 (Fraunces 600, 24px/32px)**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ 🔑 Contraseña           👁️  │    │ ← Input md (44px)**

**│  │ ••••••••                     │    │   autofocus**

**│  └──────────────────────────────┘    │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │          Entrar              │    │ ← Botón primario, lg (52px)**

**│  └──────────────────────────────┘    │   Háptico light / clockTick**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │  ¿Olvidaste tu contraseña?   │    │ ← Link text-link**

**│  └──────────────────────────────┘    │**

**└──────────────────────────────────────┘**

**2.7 SESIÓN EXPIRADA / RE-LOGIN**

**Pantalla: AuthSessionExpiredScreen**



**Objetivo**

**Notificar al usuario que su sesión expiró por seguridad y permitirle re-autenticarse con mínima fricción. El email ya está pre-llenado. Solo se pide la contraseña (o biometría).**



**Jerarquía Visual**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│  bg: bg-primary (#FBFAF8)            │**

**│                                      │**

**│            🔒                        │ ← Ícono candado, 48×48px**

**│                                      │   prim-300 (#E3BAA0)**

**│  Tu sesión terminó                   │ ← H2 (Fraunces 600, 24px/32px)**

**│                                      │**

**│  Por seguridad, te pedimos           │ ← Body, text-secondary**

**│  que vuelvas a entrar.               │**

**│  Es solo un segundo.                 │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ 📧 mariana@email.com         │    │ ← Email visible, no editable**

**│  └──────────────────────────────┘    │   bg: prim-50 (#FAF3ED)**

**│                                      │   text: text-primary (#2D2A26)**

**│                                      │   radius-sm (6px), 44px altura**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ 🔑 Contraseña           👁️  │    │ ← Input md (44px), autofocus**

**│  │ ••••••••                     │    │**

**│  └──────────────────────────────┘    │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │          Entrar              │    │ ← Botón primario, lg (52px)**

**│  └──────────────────────────────┘    │   Háptico light / clockTick**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │  ¿Olvidaste tu contraseña?   │    │ ← Link text-link**

**│  └──────────────────────────────┘    │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │     Cambiar de cuenta        │    │ ← Botón ghost, md (44px)**

**│  └──────────────────────────────┘    │**

**└──────────────────────────────────────┘**

**Copy Exacto**

**Elemento	Texto**

**Heading	Tu sesión terminó**

**Subtítulo	Por seguridad, te pedimos que vuelvas a entrar. Es solo un segundo.**

**Email (pre-llenado, no editable)	mariana@email.com**

**Input contraseña (label)	Contraseña**

**Input contraseña (placeholder)	Contraseña**

**Botón	Entrar**

**Link	¿Olvidaste tu contraseña?**

**Botón ghost	Cambiar de cuenta**

**Comportamiento**

**Si el dispositivo tiene biometría configurada para HomePlus, en lugar de pedir contraseña, se dispara el diálogo biométrico automáticamente.**

**Si la biometría falla → fallback a contraseña (misma pantalla).**

**Si el usuario elige «Cambiar de cuenta» → va al Selector de Cuenta (Pantalla 8B), y de ahí puede ir al Login principal.**

**Notas de Diseño**

**«Es solo un segundo.» — El copy reduce la fricción emocional. La sesión expiró «por seguridad», no por un error del usuario.**

**El email NO es editable. Si el usuario quiere cambiar de cuenta, tiene el botón «Cambiar de cuenta».**

**Esta pantalla NUNCA muestra el mensaje «Sesión expirada» crudo. Siempre contextualizado con tono Geni.**

**2.8 LOGOUT / CAMBIAR CUENTA**

**2.8A — CONFIRMAR LOGOUT**

**Pantalla: AuthLogoutConfirmSheet (Bottom Sheet, 25%)**



**Jerarquía Visual**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│  Overlay: surface-overlay            │**

**│  rgba(45,42,38,0.50)                 │**

**│                                      │**

**│  ┌────────────────────────────────────┐**

**│  │ ─── drag handle (32×4px, divider) │ ← Bottom Sheet 25%**

**│  │                                    │   bg: surface-card (#FFFFFF)**

**│  │ ¿Querés cerrar sesión?             │   radius-top: radius-lg (16px)**

**│  │                                    │ ← H3 (Inter 600, 20px/28px)**

**│  │ Tus datos quedan guardados.        │   text-primary**

**│  │ Cuando vuelvas, todo va a          │ ← Body S, text-secondary**

**│  │ estar como siempre.                │**

**│  │                                    │**

**│  │ ┌──────────────────────────────┐   │**

**│  │ │       Cerrar sesión          │   │ ← Botón danger, md (44px)**

**│  │ └──────────────────────────────┘   │   bg: error-500 (#C46B6B)**

**│  │                                    │   Háptico light / clockTick**

**│  │ ┌──────────────────────────────┐   │**

**│  │ │         Cancelar             │   │ ← Botón ghost, md (44px)**

**│  │ └──────────────────────────────┘   │**

**│  └────────────────────────────────────┘**

**└──────────────────────────────────────┘**

**Copy Exacto**

**Elemento	Texto**

**Título	¿Querés cerrar sesión?**

**Subtítulo	Tus datos quedan guardados. Cuando vuelvas, todo va a estar como siempre.**

**Botón danger	Cerrar sesión**

**Botón ghost	Cancelar**

**Estados**

**Tap «Cerrar sesión»: Loading en botón danger (mínimo 400ms, DS V2 §4.1). Al completar → limpia sesión local → transición a Login principal.**

**Tap «Cancelar»: Sheet se cierra (slide-down + fade-out, 200ms ease-in). Vuelve a la pantalla anterior.**

**Motion: Animación de entrada slide-up + fade-in, 300ms ease-out. Salida slide-down + fade-out, 200ms ease-in. Overlay fade-in 300ms / fade-out 200ms. Con prefers-reduced-motion: 0ms (DS V2 §5.2, §7.1).**



**2.8B — SELECTOR DE CUENTA**

**Pantalla: AuthAccountPickerSheet (Bottom Sheet, 50%)**



**Objetivo**

**Permitir cambiar entre múltiples cuentas guardadas en el dispositivo sin necesidad de hacer logout completo. Refleja la filosofía de Final Spec §03.05: «La Cuenta pertenece al usuario. No al hogar.»**



**Jerarquía Visual**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│  Overlay: surface-overlay            │**

**│                                      │**

**│  ┌────────────────────────────────────┐**

**│  │ ─── drag handle                    │ ← Bottom Sheet 50%**

**│  │                                    │**

**│  │ Cambiar de cuenta                  │ ← H3 (Inter 600, 20px/28px)**

**│  │                                    │**

**│  │ ┌────────────────────────────────┐ │**

**│  │ │ 👤 Mariana García          ✓  │ │ ← List item (cuenta activa)**

**│  │ │    mariana@email.com          │ │   leading: avatar sm (32px)**

**│  │ │    Casa de los Robles         │ │   trailing: check prim-500**

**│  │ └────────────────────────────────┘ │   altura: 56px (DS V2 §4.12)**

**│  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │   separador: divider (#E8E3DC)**

**│  │ ┌────────────────────────────────┐ │**

**│  │ │ 👤 Tomás García                │ │ ← List item (otra cuenta)**

**│  │ │    tomas@email.com             │ │**

**│  │ │    Depto. Centro               │ │**

**│  │ └────────────────────────────────┘ │**

**│  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │**

**│  │                                    │**

**│  │ ┌────────────────────────────────┐ │**

**│  │ │ + Agregar otra cuenta          │ │ ← List item (acción)**

**│  │ └────────────────────────────────┘ │**

**│  │                                    │**

**│  │ ┌────────────────────────────────┐ │**

**│  │ │ Cerrar todas las sesiones      │ │ ← List item (danger)**

**│  │ └────────────────────────────────┘ │   text: error-500**

**│  └────────────────────────────────────┘**

**└──────────────────────────────────────┘**

**Comportamiento**

**Tap en otra cuenta: Guarda la sesión actual, cambia a la nueva. Si la sesión de la nueva expiró, pide contraseña (igual que Pantalla 7).**

**Tap en «+ Agregar otra cuenta»: Cierra el sheet → Login principal.**

**Tap en «Cerrar todas las sesiones»: Modal centrado de confirmación → Logout de todas → Login principal.**

**2.9 ELIMINAR CUENTA**

**Son 3 pantallas en secuencia. Usa modal centrado para la confirmación final (acción destructiva, DS V2 §4.11).**



**2.9A — ADVERTENCIA**

**Pantalla: AuthDeleteAccountWarningScreen**



**Jerarquía Visual**

**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│  ← Cancelar                          │**

**│                                      │**

**│            ⚠️                        │ ← Ícono alerta, 48×48px**

**│                                      │   alert-500 (#D4944A)**

**│  Eliminar tu cuenta                  │ ← H1 (Fraunces 600, 28px/36px)**

**│                                      │**

**│  ┌──────────────────────────────────┐│ ← Card alerta (DS V2 §4.3)**

**│  │ Esto es definitivo.             ││   bg: alert-100 (#F7EBDB)**

**│  │                                  ││   borde izq: alert-500 4px**

**│  │ • Tus datos se borran en 30     ││   padding: 16px**

**│  │   días.                         ││   radius-md (12px)**

**│  │ • No vas a poder entrar más.    ││**

**│  │ • Si sos coordinador de un      ││**

**│  │   hogar, elegí un reemplazo     ││**

**│  │   antes de eliminar tu cuenta.  ││**

**│  └──────────────────────────────────┘│**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ Quiero eliminar mi cuenta    │    │ ← Botón danger, lg (52px)**

**│  └──────────────────────────────┘    │   Háptico light / clockTick**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │       No, cancelar           │    │ ← Botón ghost, md (44px)**

**│  └──────────────────────────────┘    │**

**└──────────────────────────────────────┘**

**Copy Exacto**

**Elemento	Texto**

**Heading	Eliminar tu cuenta**

**Card alerta (viñetas)	Esto es definitivo. • Tus datos se borran en 30 días. • No vas a poder entrar más. • Si sos coordinador de un hogar, elegí un reemplazo antes de eliminar tu cuenta.**

**Botón danger	Quiero eliminar mi cuenta**

**Botón ghost	No, cancelar**

**2.9B — CONFIRMAR CON CONTRASEÑA**

**Pantalla: AuthDeleteAccountConfirmScreen**



**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│  ← Volver                            │**

**│                                      │**

**│  Confirmá que sos vos                │ ← H1 (Fraunces 600, 28px/36px)**

**│                                      │**

**│  Para eliminar tu cuenta,            │ ← Body, text-secondary**

**│  ingresá tu contraseña.              │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │ 🔑 Contraseña           👁️  │    │ ← Input md (44px), autofocus**

**│  │ ••••••••                     │    │**

**│  └──────────────────────────────┘    │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │     Eliminar cuenta          │    │ ← Botón danger, lg (52px)**

**│  └──────────────────────────────┘    │   disabled si input vacío**

**└──────────────────────────────────────┘**

**Validaciones**

**Situación	Comportamiento**

**Contraseña incorrecta	«Esa contraseña no es correcta. ¿Probás de nuevo?»**

**3 intentos fallidos	«Demasiados intentos. Por seguridad, esperá 15 minutos.» (cooldown enforced)**

**2.9C — CUENTA ELIMINADA**

**Pantalla: AuthDeleteAccountDoneScreen**



**\*.txt**

**Plaintext**

**┌──────────────────────────────────────┐**

**│                                      │**

**│            ✓                         │ ← Ícono check, 64×64px**

**│                                      │   success-500 (#6B9E7A)**

**│  Tu cuenta fue eliminada             │ ← H1 (Fraunces 600, 28px/36px)**

**│                                      │**

**│  Tus datos se van a borrar           │ ← Body, text-secondary**

**│  por completo en 30 días.            │**

**│                                      │**

**│  Si querés volver, creá una          │ ← Body S, text-secondary**

**│  cuenta nueva.                       │**

**│                                      │**

**│  ┌──────────────────────────────┐    │**

**│  │     Volver al inicio         │    │ ← Botón primario, lg (52px)**

**│  └──────────────────────────────┘    │   Háptico light / clockTick**

**└──────────────────────────────────────┘**

**Copy Exacto**

**Elemento	Texto**

**Heading	Tu cuenta fue eliminada**

**Subtítulo	Tus datos se van a borrar por completo en 30 días.**

**Subtexto	Si querés volver, creá una cuenta nueva.**

**Botón	Volver al inicio**

**3. MATRIZ DE SEGURIDAD**

**3.1 Información revelada vs. ocultada por pantalla**

**Pantalla	Información REVELADA	Información OCULTADA	Justificación**

**Login	— (nada hasta submit)	Si el email existe o no en la DB	Evitar enumeración de cuentas. Mensaje unificado: «Ese email o contraseña no son correctos.»**

**Login (error)	Mensaje unificado de credenciales inválidas	Cuál de los dos campos falló	Evitar ataques de diccionario dirigidos (OWASP AT-008).**

**Registro	Si el email YA está registrado (on-blur)	—	Necesario para UX: el usuario debe saber que ya tiene cuenta para no crear duplicado.**

**Recuperación (envío)	«Si ese email tiene cuenta, ya te llegó el link.»	Si el email existe o no	Misma protección anti-enumeración que Login.**

**Recuperación (nueva pass)	—	—	Solo accesible con token válido del magic link. Token expira en 1h.**

**2FA	Si el código es válido o no	Método de 2FA del usuario (hasta autenticación exitosa)	No revelar si el usuario usa SMS o authenticator.**

**Biométrico	—	—	La biometría se procesa 100% en el dispositivo. Nunca sale del enclave seguro del SO (Secure Enclave iOS / TEE Android).**

**Sesión expirada	Email pre-llenado	—	El email ya era visible en la sesión anterior. No es información nueva.**

**Logout	—	—	Sin riesgo. Es salida voluntaria.**

**Eliminar cuenta	—	—	Requiere contraseña para confirmar. 3 intentos máximos.**

**3.2 Principios de seguridad aplicados**

**#	Principio	Implementación**

**S-01	No enumeración de emails	Login y Recuperación usan mensajes genéricos. El mensaje NUNCA dice «Email no encontrado». Cumple OWASP AT-008.**

**S-02	Rate limiting	Supabase Auth aplica rate limiting por IP. La app agrega cooldown visual después de 3 intentos fallidos.**

**S-03	Tokens con expiración	Magic links expiran en 1h. Token JWT de sesión expira según configuración de Supabase (default: 1h, refresh: 7d).**

**S-04	Biometría local	Face ID / Huella se procesan exclusivamente en el Secure Enclave (iOS) / TEE (Android). HomePlus nunca ve datos biométricos.**

**S-05	2FA opcional	El usuario decide si activarlo. No es forzado. Se recomienda para coordinadores de hogar.**

**S-06	Códigos de backup	8 códigos de un solo uso. Generados del lado del servidor. Hasheados en DB.**

**S-07	Logout limpia todo	Al hacer logout: se destruye la sesión de Supabase, se limpia el storage local, se invalida el token.**

**S-08	Eliminación con soft-delete	La cuenta se marca como eliminada (soft-delete). Borrado físico a los 30 días. Ventana de arrepentimiento.**

**S-09	Contraseña nunca en logs	Las contraseñas nunca se almacenan en logs, analytics ni crash reports.**

**S-10	Email verificado requerido	La cuenta no está completamente activa hasta que el email se verifica. Se bloquea el acceso hasta entonces.**

**4. EDGE CASES**

**4.1 Sin conexión a internet**

**Pantalla	Comportamiento**

**Login	Al hacer submit sin conexión: Toast superior (Top, DS V2 §4.13): «Sin conexión. Cuando vuelva, entrás sin problema.» Los campos no se limpian.**

**Registro	Al hacer submit: Toast superior: «Sin conexión. Probá de nuevo en un momento.» Los datos persisten en los inputs.**

**Recuperación	Al pedir link: Toast superior: «Sin conexión. Cuando vuelva, te mandamos el link.»**

**2FA	El código 2FA funciona offline si es TOTP (authenticator app). Si es SMS, requiere conexión.**

**Biométrico	Funciona 100% offline. No requiere conexión.**

**Sesión expirada	No se puede reautenticar sin conexión. Toast superior informativo.**

**Splash / Carga inicial	La app carga offline sin problema. Muestra login.**

**4.2 Token expirado**

**Situación	Comportamiento**

**Magic link >1h	«El link ya no es válido. Pedí uno nuevo.» → Botón a Recuperación.**

**JWT expirado durante uso	La app intercepta el 401 de Supabase → Redirige a Sesión Expirada (Pantalla 7).**

**Refresh token expirado	El refresh token de Supabase dura 7 días. Si expira → Login completo.**

**Token de verificación de email expirado	«El link de verificación ya no es válido. ¿Reenviamos?» → Botón para reenviar.**

**4.3 Email ya registrado**

**Situación	Comportamiento**

**Registro con email existente	Validación on-blur: «Ese email ya tiene cuenta. ¿Querés entrar?» con botón \[Entrar] que redirige a Login.**

**Login social con email que ya existe como email+password	Supabase vincula el provider a la cuenta existente. El usuario entra normalmente.**

**Login social con email que ya está vinculado a OTRA cuenta social	Supabase devuelve error. Toast superior: «Ese email ya está vinculado a otra forma de entrar. ¿Probás con email y contraseña?»**

**4.4 Cuenta eliminada**

**Situación	Comportamiento**

**Login en cuenta eliminada (<30 días)	«Esta cuenta ya no existe. Si querés, podés crear una nueva.» → Botón \[Crear cuenta].**

**Login en cuenta eliminada (>30 días)	«Ese email o contraseña no son correctos.» (la cuenta ya no existe en DB).**

**Recuperación en cuenta eliminada	«Si ese email tiene cuenta, ya te llegó el link.» (no se revela que fue eliminada).**

**Re-crear cuenta con email de cuenta eliminada (>30 días)	Se permite. Es un registro nuevo.**

**4.5 Múltiples dispositivos**

**Situación	Comportamiento**

**Sesión activa en 2+ dispositivos	Soportado. Supabase permite múltiples sesiones por usuario.**

**Logout en un dispositivo	Solo afecta ese dispositivo. Las otras sesiones siguen activas.**

**«Cerrar todas las sesiones»	Desde el Selector de Cuenta (8B), invalida TODOS los refresh tokens. Todos los dispositivos van a Sesión Expirada.**

**Eliminar cuenta	Invalida todas las sesiones activas. Todos los dispositivos van a Bienvenida.**

**4.6 Coordinador elimina su cuenta**

**Situación	Comportamiento**

**El usuario es el ÚNICO coordinador	Se muestra advertencia adicional: «Sos el coordinador de Casa de los Robles. Si te vas, el hogar se queda sin coordinador. Elegí a alguien antes de eliminar tu cuenta.» Si no hay otro adulto → no se permite eliminar hasta designar reemplazo.**

**Hay otro coordinador o adulto	La eliminación procede normalmente. Sus datos en el hogar pasan a estado 'memorialized'.**

**4.7 Intento de fuerza bruta**

**Situación	Comportamiento**

**3 intentos fallidos (login)	Mensaje: «Muchos intentos. Esperá un minuto y probá de nuevo.» Cooldown de 60s.**

**5 intentos fallidos (login)	Cooldown de 5 minutos.**

**10 intentos fallidos (login)	Cooldown de 15 minutos. Se sugiere recuperación de contraseña.**

**Rate limiting de Supabase	Supabase aplica rate limiting por IP independientemente. La app muestra: «Demasiados intentos desde esta conexión. Esperá un rato.»**

**4.8 Error de Supabase Auth (lado servidor)**

**Error	Mensaje al usuario**

**AuthApiError genérico	«Algo no salió bien. ¿Probás de nuevo? Si no, revisá tu conexión.»**

**AuthSessionMissingError	Redirige a Login. Sin mensaje (es una condición normal de sesión expirada).**

**AuthRetryableFetchError (timeout)	«El servidor tarda en responder. ¿Probás de nuevo?»**

**AuthPKCEGrantCodeExchangeError	«No se pudo completar la verificación. Volvé a intentarlo.»**

**5. DECISIONES DE AUTH TOMADAS**

**#	Decisión	Alternativa considerada	Por qué esta**

**A-01	Mensaje de error unificado «Email o contraseña no son correctos»	Mostrar «Email no encontrado» y «Contraseña incorrecta» por separado.	Seguridad anti-enumeración. Es un estándar de seguridad moderno (OWASP AT-008). No revelamos qué parte falló.**

**A-02	Login social tan prominente como email	Login social como botón pequeño al final.	En LATAM, Google es el método preferido para muchos usuarios. No queremos que se sienta como opción secundaria.**

**A-03	2FA opcional, no forzado	2FA obligatorio para todas las cuentas.	HomePlus es un producto familiar, no una app bancaria. Muchos usuarios (niños, adultos mayores) no manejan 2FA. Lo recomendamos para coordinadores.**

**A-04	Biometría opt-in	Biometría forzada si el dispositivo la soporta.	Respetamos la decisión del usuario. Para algunos, la biometría genera desconfianza. Se sugiere con una pantalla amable, no se impone.**

**A-05	Email pre-llenado en sesión expirada	Pedir email de nuevo.	Reduce fricción. El usuario ya está frustrado porque su sesión expiró. No le pidamos el email de nuevo. Solo la contraseña (o biometría).**

**A-06	Registro standalone de 1 pantalla (sin nombre)	Pedir nombre y apellido en el registro.	El nombre se pide en el onboarding. El registro es solo credenciales. Menos fricción = más registros completados.**

**A-07	Recuperación con mensaje unificado «Si ese email tiene cuenta...»	«Email no encontrado» o «Link enviado» (solo si existe).	Misma protección anti-enumeración que A-01. Consistencia con el principio de seguridad.**

**A-08	Eliminación de cuenta con soft-delete de 30 días	Borrado inmediato e irreversible.	Ventana de arrepentimiento. Un usuario puede cambiar de opinión. Un coordinador que se va puede revertirlo en 30 días.**

**A-09	El botón primario dice «Entrar», no «Iniciar sesión»	«Iniciar sesión» / «Log in» / «Ingresar».	UX Writing Guide: sin lenguaje corporativo. «Entrar» es coloquial LATAM y más humano.**

**A-10	3 intentos máximos en pantalla de eliminación	Sin límite de intentos.	Prevenir fuerza bruta en la acción más destructiva de la app.**

**A-11	Códigos de backup de 2FA: 8 códigos de 8 dígitos	10 códigos de 6 dígitos.	8 dígitos es estándar moderno (más entropía). 8 códigos es suficiente sin ser abrumador de almacenar.**

**A-12	Teclado number-pad en inputs de código 2FA	Teclado estándar.	6 dígitos numéricos. El teclado numérico es más rápido y tiene teclas más grandes.**

**A-13	Validación de email on-blur, no on-type	Validación en tiempo real mientras escribe.	Evita mostrar «Email inválido» mientras el usuario está a mitad de escribir. Más amable.**

**A-14	Toggle de visibilidad de contraseña siempre presente	Sin toggle (solo bullets).	Mobile tiene alta tasa de error de tipeo. Ver la contraseña reduce frustración y reintentos.**

**A-15	Bottom sheet para confirmar logout	Modal centrado.	Es una acción frecuente pero no destructiva. El bottom sheet es menos interruptivo que un modal (DS V2 §4.11).**

**A-16	Modal centrado para eliminar cuenta	Bottom sheet.	Es una acción destructiva e irreversible. El modal centrado comunica más seriedad y requiere atención plena (DS V2 §4.11).**

**A-17	Mínimo 400ms de loading en botones	Spinner sin delay mínimo, o delay de 800ms.	DS V2 §4.1: «Mínimo 400ms de loading para evitar flicker. El feedback inmediato ocurre al press; el spinner aparece solo si la operación >300ms.» Un spinner que aparece y desaparece en <300ms confunde al usuario.**

**A-18	No «Recordarme» (Remember Me)	Checkbox de «Recordarme».	Mobile-first: el usuario ya está en su dispositivo personal. No hay concepto de «dispositivo compartido» en el happy path. La sesión se mantiene con refresh token de Supabase.**

**6. REFERENCIA RÁPIDA: TOKENS DEL DESIGN SYSTEM V2 USADOS**

**6.1 Colores**

**Token	Valor	Uso en Auth**

**prim-500	#C17F59	Botón primario, links, foco de inputs, logo**

**prim-600	#A86B45	Botón primario active/pressed, texto en links**

**prim-300	#E3BAA0	Botón disabled, íconos decorativos**

**prim-100	#F2E0D4	Ring de foco en inputs (3px)**

**prim-50	#FAF3ED	Bg de email pre-llenado, surface tint**

**bg-primary	#FBFAF8	Fondo de pantalla**

**surface-card	#FFFFFF	Fondo de cards, inputs**

**surface-overlay	rgba(45,42,38,0.50)	Overlay de bottom sheets y modales**

**text-primary	#2D2A26	Headings, texto principal**

**text-secondary	#6B6560	Subtítulos, body text**

**text-tertiary	#9B9590	Captions, helper text**

**text-link	#C17F59	Links clickeables**

**divider	#E8E3DC	Líneas divisorias, separadores de lista**

**divider-strong	#D5CFC7	Bordes de inputs default (1.5px)**

**error-500	#C46B6B	Borde y texto de error, botón danger**

**error-100	#F5E2E2	Ring de error en inputs (3px)**

**error-600	#A85050	Texto de error**

**success-500	#6B9E7A	Íconos de éxito, badge en nav**

**alert-500	#D4944A	Ícono de advertencia (eliminar cuenta)**

**alert-100	#F7EBDB	Card de alerta (bg)**

**info-100	#E4E9ED	Card informativa (bg)**

**info-500	#7A8B9B	Borde izq de card informativa (4px)**

**info-600	#5F707F	Texto en card informativa**

**6.2 Tipografía**

**Token	Uso en Auth**

**Display (Fraunces 700, 32px/40px)	«HomePlus» en Login**

**H1 (Fraunces 600, 28px/36px)	Títulos de pantalla**

**H2 (Fraunces 600, 24px/32px)	Subtítulos, 2FA, sesión expirada**

**H3 (Inter 600, 20px/28px)	Títulos de bottom sheets**

**Body (Inter 400, 16px/24px)	Texto descriptivo**

**Body S (Inter 400, 14px/20px)	Subtítulos, helper text, links**

**Caption (Inter 500, 12px/16px)	Mensajes de error, helper**

**6.3 Espaciado**

**Token	Valor	Uso**

**space-5	20px	Márgenes horizontales de pantalla**

**space-4	16px	Gap entre elementos, padding de cards**

**space-3	12px	Gap entre label e input, entre botones**

**space-8	32px	Separación entre logo y formulario**

**6.4 Radios**

**Token	Valor	Uso**

**radius-sm	6px	Inputs, chips, email pre-llenado**

**radius-md	12px	Cards, botones, avatares**

**radius-lg	16px	Bottom sheets, modales**

**6.5 Componentes**

**Componente	Variantes usadas	Referencia DS V2**

**Button	primary, secondary, danger, ghost (md 44px, lg 52px)	§4.1**

**Input	default, error, disabled (md 44px)	§4.4**

**Card	estándar, alerta, info	§4.3**

**Bottom Sheet	25%, 50%	§4.11**

**Modal centrado	(eliminar cuenta, max-width 320px)	§4.11**

**Toast	success, error, info (Top, 4s)	§4.13**

**Divider	con texto «o»	§1.4**

**Checkbox	24×24px, touch target 44×44px	§4.6**

**List Item	leading avatar + título + subtítulo + trailing	§4.12**

**6.6 Motion**

**Elemento	Duración	Easing	Reduced Motion**

**Stack push	250ms	ease-out	0ms**

**Crossfade	300ms	ease-out	0ms**

**Fade-in	300ms	ease-out	0ms**

**Bottom sheet enter	300ms	ease-out	0ms**

**Bottom sheet exit	200ms	ease-in	0ms**

**Modal enter	250ms	ease-out (scale 0.95→1)	0ms**

**Toast enter	300ms	ease-out (slide-down + fade-in)	0ms**

**Toast exit	200ms	ease-in (fade-out)	0ms**

**Button spinner min	400ms	—	—**

**Regla: Todas las duraciones se anulan a 0ms cuando prefers-reduced-motion: reduce está activo en el SO (DS V2 §5.2, §7.1).**



**6.7 Háptico**

**Interacción	iOS	Android	Referencia**

**Tap en botón	light	clockTick	DS V2 §5.1**

**Toast de error	warning	effectClick	DS V2 §4.13**

**Documento canónico de diseño de Auth para HomePlus V2. Auditado y reescrito contra Final Spec V1 (documento maestro) y Design System V2 (aprobado). Cada pantalla, copy, validación, transición, valor de espaciado y decisión responde a los principios del Design System V2, el tono del UX Writing Guide, la arquitectura de pantalla de la UX Philosophy §6, las restricciones de seguridad (OWASP AT-008), y la filosofía de separación Cuenta-Hogar de la Final Spec §03.05 y §05.11. El login no es una barrera: es la puerta de entrada a un hogar.**





