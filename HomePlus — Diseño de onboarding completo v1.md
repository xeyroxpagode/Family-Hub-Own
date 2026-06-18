**# HomePlus — Diseño de Onboarding Completo V2**

**\*\*Versión:\*\* 2.0 (reescritura completa tras auditoría contra Final Spec V1)**

**\*\*Fecha:\*\* Junio 2026**

**\*\*Dependencias:\*\* Final Spec V1 (documento canónico), Design System V2, UX Philosophy V2**

**\*\*Idioma:\*\* Castellano LATAM**

**\*\*Plataforma:\*\* Mobile-first (375×812px base), React Native / Expo**

**\*\*Modos:\*\* `normal` | `senior` (PUX-03)**

**> \*\*Principio rector:\*\* 60 segundos hasta el primer valor visible. Cada pantalla, 1 acción principal. Sin tutoriales. Sin feature carousel. Los flujos por rol derivan exactamente de los permisos y capacidades definidos en Final Spec V1 §04.**

**---**

**## 1. DIAGRAMA DE FLUJO COMPLETO**

**┌─────────────────────────┐**

**│ SPLASH (2.5s) │**

**│ Logo + "Todo tu hogar │**

**│ en un solo lugar" │**

**└───────────┬─────────────┘**

**│**

**┌───────────▼─────────────┐**

**│ BIENVENIDA (1 pant) │**

**│ "Bienvenida a │**

**│ HomePlus" │**

**│ \[Crear cuenta] \[Entrar] │**

**└───┬─────────────────┬───┘**

**│ │**

**┌───▼──────────┐ ┌────▼──────────────┐**

**│ CREAR CUENTA │ │ INICIAR SESIÓN │**

**│ (2 pantallas)│ │ (1 pantalla) │**

**│ │ │ │**

**│ P1: Email + │ │ Email + Password │**

**│ Password │ │ ¿Olvidaste? → │**

**│ P2: Nombre │ │ Recuperación │**

**│ │ │ │**

**│ Social: │ │ → HOME (existente)│**

**│ Google/Apple │ │ │**

**└──────┬───────┘ └────────────────────┘**

**│**

**│ (usuario NUEVO)**

**│**

**┌──────▼──────────────────────┐**

**│ ¿QUÉ ROL TENÉS EN │**

**│ TU HOGAR? │**

**│ │**

**│ ○ Coordinador/a ──→ Flujo COORDINADOR**

**│ ○ Adulto ──→ Flujo ADULTO**

**│ ○ Adolescente ──→ Flujo ADOLESCENTE**

**│ ○ Niño/a ──→ Flujo NIÑO**

**│ ○ Adulto Mayor ──→ Flujo ADULTO MAYOR**

**└──────┬──────────────────────┘**

**│**

**│ (Coordinador)**

**│**

**┌──────▼──────────────────────┐ ⏱ \~10s acumulado**

**│ CREACIÓN DEL HOGAR │**

**│ (3 pantallas) │**

**│ │**

**│ P1: Tipo de hogar │**

**│ P2: Nombre + Foto (opt) │**

**│ P3: Disponibilidad horaria │**

**└──────┬──────────────────────┘**

**│**

**┌──────▼──────────────────────┐ ⏱ \~25s acumulado**

**│ PERSONALIZACIÓN │**

**│ (2 pantallas) │**

**│ │**

**│ P1: Foto perfil + │**

**│ nombre completo │**

**│ P2: Preferencia tono │**

**│ + notificaciones │**

**└──────┬──────────────────────┘**

**│**

**┌──────▼──────────────────────┐ ⏱ \~40s acumulado**

**│ PRIMER VALOR VISIBLE │ ← OBJETIVO: ≤60s**

**│ (1 pantalla) │**

**│ │**

**│ "Tu hogar está listo." │**

**│ Geni sugiere 1ª tarea │**

**│ \[Crear primera tarea] │**

**└──────┬──────────────────────┘**

**│**

**┌──────▼──────────────────────┐ ⏱ \~55s acumulado**

**│ INVITACIÓN A MIEMBROS │**

**│ (1 pantalla) │**

**│ │**

**│ "¿A quién invitás │**

**│ primero?" │**

**│ \[Invitar] \[Después] │**

**└──────┬──────────────────────┘**

**│**

**│ (tap "Después")**

**│**

**┌──────▼──────────────────────┐**

**│ HOME POST-ONBOARDING │**

**│ │**

**│ Briefing de Geni │**

**│ Card de bienvenida │**

**│ Empty states por dominio │**

**│ │**

**│ Bottom Nav congelada: │**

**│ \[Home] \[People] \[+] │**

**│ \[Planner] \[More] │**

**└─────────────────────────────┘**



**\*.txt**

**Plaintext**

**### Flujos Alternativos por Rol**

**FLUJO ADULTO (2 pantallas, \~30s) FLUJO ADOLESCENTE (2 pantallas, \~25s)**

**┌──────────────────────────────┐ ┌──────────────────────────────┐**

**│ P1: Aceptar invitación │ │ P1: Nombre + Avatar + Color │**

**│ + ver resumen del hogar │ │ P2: Preferencia notif. │**

**│ P2: Nombre + Foto + Horario │ │ + tono │**

**│ + Tratamiento │ │ → HOME (ya tiene hogar) │**

**│ → HOME (ya tiene hogar) │ └──────────────────────────────┘**

**└──────────────────────────────┘**



**FLUJO NIÑO (3 pantallas, \~25s) FLUJO ADULTO MAYOR (4 pantallas, \~60s)**

**┌──────────────────────────────┐ ┌──────────────────────────────┐**

**│ P1: ¡Hola! Elegí avatar │ │ P1: Bienvenida + nombre │**

**│ y color │ │ + tratamiento (Don/Doña) │**

**│ P2: Lista demo con tareas │ │ P2: ¿Letra más grande? │**

**│ P3: Completá tu 1ª tarea │ │ (default: Sí) │**

**│ → HOME │ │ P3: Medicación + horario │**

**└──────────────────────────────┘ │ P4: Contacto de emergencia │**

**│ → HOME │**

**FLUJO INVITADO (1 pantalla, \~15s) └──────────────────────────────┘**

**┌──────────────────────────────┐**

**│ P1: Aceptar invitación → │ FLUJO EMPLEADO FAMILIAR**

**│ Ver resumen mínimo │ (2 pantallas, \~20s)**

**│ → HOME │ ┌──────────────────────────────┐**

**└──────────────────────────────┘ │ P1: Aceptar invitación │**

**│ + ver responsabilidades │**

**│ + horario asignado │**

**│ P2: Perfil mínimo │**

**│ → HOME │**

**└──────────────────────────────┘**



**\*.txt**

**Plaintext**

**### Bifurcaciones y Estados**

**LOGIN SOCIAL: RECUPERACIÓN DE CONTRASEÑA:**

**\[Google] → Auth → OK → HOME Pantalla email → "Te enviamos un link"**

**\[Apple] → Auth → OK → HOME Email con link → Nueva contraseña → OK**



**ERRORES:**

**• Email ya registrado → Toast: "Ese email ya tiene cuenta. ¿Querés entrar?"**

**• Contraseña débil → Validación inline: "Mínimo 8 caracteres"**

**• Red caída → Toast: "Sin conexión. Probá de nuevo en un momento."**

**• Token expirado → "El link ya no es válido. Pedí uno nuevo."**



**\*.txt**

**Plaintext**

**---**

**## 2. DESCRIPCIÓN PANTALLA POR PANTALLA**

**### 2.1 SPLASH SCREEN**

**\*\*Duración:\*\* 2.5 segundos**

**\*\*Objetivo:\*\* Transmitir la esencia del producto mientras carga. No vender, no explicar.**

**#### Jerarquía Visual**

**┌──────────────────────────────────────┐**

**│ bg: prim-50 (#FAF3ED) │ ← Fondo crema suave**

**│ │**

**│ 🌿 (logo) │ ← Ícono hoja/hogar, 80×80px**

**│ │ Color: prim-500**

**│ HomePlus │ ← Display (Fraunces 700, 32px)**

**│ │ Color: prim-600**

**│ Todo tu hogar en un solo lugar. │ ← Body (Inter 400, 16px)**

**│ │ Color: text-secondary**

**│ ──●──────── │ ← Spinner sutil**

**│ │ Color: prim-300**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Componentes**

**| Elemento | Especificación |**

**|----------|---------------|**

**| Logo | Ícono vectorial `home-leaf`, 80×80px, prim-500 |**

**| Nombre | Fraunces 700, 32px/40px, prim-600 |**

**| Tagline | Inter 400, 16px/24px, text-secondary |**

**| Spinner | Dots animados, prim-300, opacidad 0.7 |**

**#### Copy**

**| Elemento | Texto |**

**|----------|-------|**

**| Nombre | HomePlus |**

**| Tagline | Todo tu hogar en un solo lugar. |**

**#### Estados**

**| Estado | Comportamiento |**

**|--------|---------------|**

**| \*\*Loading\*\* | Spinner animado. Si tarda >5s → "Cargando..." debajo del spinner |**

**| \*\*Error de carga\*\* | Si no inicializa en 10s → pantalla de error: "Algo no salió bien. ¿Probamos de nuevo?" + botón "Reintentar" |**

**| \*\*Sin conexión\*\* | Carga offline. El splash no necesita conexión |**

**#### Animación**

**- Logo: fade-in + scale 0.9→1, 400ms ease-out**

**- Tagline: fade-in con 200ms delay**

**- Spinner: aparece con 500ms delay**

**- Transición a Bienvenida: crossfade 300ms**

**---**

**### 2.2 PANTALLA DE BIENVENIDA**

**\*\*Duración objetivo:\*\* 5-8 segundos**

**\*\*Objetivo:\*\* Una sola frase de propuesta de valor. Dos caminos. Sin carrusel.**

**#### Jerarquía Visual**

**┌──────────────────────────────────────┐**

**│ bg: bg-primary (#FBFAF8) │**

**│ │**

**│ Bienvenida a │ ← H2 (Fraunces 600, 24px)**

**│ HomePlus │ text-primary**

**│ │**

**│ El lugar donde tu hogar │ ← Body L (Inter 400, 18px)**

**│ se organiza solo. │ text-secondary**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🏠 Calendario familiar │ │ ← Chips informativos (3)**

**│ │ 📋 Tareas de la casa │ │ sm, prim-50 bg, prim-600 text**

**│ │ 💜 Sin perseguir a nadie │ │ No interactivos**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Crear cuenta │ │ ← Botón primario, lg, 52px**

**│ └────────────────────────────────┘ │ full-width**

**│ │**

**│ Ya tengo cuenta → Entrar │ ← Botón ghost, md**

**│ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Componentes**

**| Elemento | Especificación |**

**|----------|---------------|**

**| Heading | Fraunces 600, 24px/32px, text-primary |**

**| Body | Inter 400, 18px/26px, text-secondary. Máx. 2 líneas |**

**| Chips (3) | Chip sm (28px), variante default, ícono 16px + texto |**

**| Botón primario | variant=primary, size=lg (52px), full-width, "Crear cuenta" |**

**| Botón secundario | variant=ghost, size=md, "Ya tengo cuenta" |**

**| Espaciado | 40px entre chips y botón; 16px entre botones |**

**#### Copy**

**| Elemento | Texto |**

**|----------|-------|**

**| Heading | Bienvenida a HomePlus |**

**| Subtexto | El lugar donde tu hogar se organiza solo. |**

**| Chip 1 | 🏠 Calendario familiar |**

**| Chip 2 | 📋 Tareas de la casa |**

**| Chip 3 | 💜 Sin perseguir a nadie |**

**| Botón primario | Crear cuenta |**

**| Botón secundario | Ya tengo cuenta |**

**---**

**### 2.3 CREAR CUENTA — PASO 1: CREDENCIALES**

**\*\*Duración objetivo:\*\* 15-20 segundos | \*\*⏱ Acumulado:\*\* \~25s**

**\*\*Objetivo:\*\* Capturar email y contraseña. Mínima fricción. Login social como alternativa.**

**#### Jerarquía Visual**

**┌──────────────────────────────────────┐**

**│ ← Volver Paso 1/2 │ ← Header + progress bar 2 pasos**

**│ ────────────────────────────────── │ (50% completado)**

**│ │**

**│ Creá tu cuenta │ ← H1 (Fraunces 600, 28px)**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Email │ │ ← Input md (44px)**

**│ │ joanna@email.com │ │ type: email**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Contraseña 👁️ │ │ ← Input md + toggle visibilidad**

**│ │ •••••••• │ │ type: password**

**│ └────────────────────────────────┘ │**

**│ Mínimo 8 caracteres │ ← Caption, text-tertiary**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Continuar │ │ ← Botón primario, lg**

**│ └────────────────────────────────┘ │ Deshabilitado hasta validación**

**│ │**

**│ ─────────── o ─────────── │ ← Divider**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ G Continuar con Google │ │ ← Botón secondary, lg**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Continuar con Apple │ │ ← Botón secondary, lg**

**│ └────────────────────────────────┘ │**

**│ │**

**│ Al crear tu cuenta aceptás los │ ← Caption, text-tertiary**

**│ Términos y la Política de Privacidad.│ Links en text-link (prim-500)**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Validaciones**

**| Campo | Regla | Mensaje de error |**

**|-------|-------|-----------------|**

**| Email | Formato válido (regex: x@y.z) | "Ese email no es válido. ¿Lo revisás?" |**

**| Email | No vacío | — (botón deshabilitado) |**

**| Password | ≥ 8 caracteres | "Mínimo 8 caracteres." |**

**| Password | No vacío | — (botón deshabilitado) |**

**#### Estados**

**| Estado | Comportamiento |**

**|--------|---------------|**

**| \*\*Default\*\* | Inputs vacíos. Botón Continuar disabled (prim-300) |**

**| \*\*Válido\*\* | Email válido + pass ≥ 8 → Botón habilitado (prim-500) |**

**| \*\*Error email\*\* | Borde error-500, texto error debajo en caption error-600 |**

**| \*\*Error pass\*\* | Validación on-blur, no on-type |**

**| \*\*Loading\*\* | Spinner en botón (prim-500). Overlay sutil anti doble-tap |**

**| \*\*Error red\*\* | Toast superior: "Sin conexión. Probá de nuevo en un momento." |**

**| \*\*Email ya registrado\*\* | Toast con acción: "Ese email ya tiene cuenta. ¿Querés entrar?" → redirige a Login |**

**| \*\*Login social\*\* | Flow nativo del SO. Overlay con spinner + "Conectando..." |**

**---**

**### 2.4 CREAR CUENTA — PASO 2: NOMBRE**

**\*\*Duración objetivo:\*\* 10 segundos | \*\*⏱ Acumulado:\*\* \~35s**

**\*\*Objetivo:\*\* Capturar el nombre propio. Humanizar la cuenta.**

**#### Jerarquía Visual**

**┌──────────────────────────────────────┐**

**│ ← Volver Paso 2/2 │**

**│ ────────────────────────────────── │ ← Progress bar 100%**

**│ │**

**│ ¿Cómo te llamás? │ ← H1 (Fraunces 600, 28px)**

**│ │**

**│ Así te va a llamar Geni. │ ← Body, text-secondary**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Nombre │ │ ← Input lg (52px)**

**│ │ Mariana │ │ type: text, autofocus**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Entrar a HomePlus │ │ ← Botón primario, lg**

**│ └────────────────────────────────┘ │ Deshabilitado si vacío**

**│ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Validaciones**

**| Campo | Regla | Mensaje de error |**

**|-------|-------|-----------------|**

**| Nombre | No vacío | — (botón deshabilitado) |**

**| Nombre | Máx. 40 caracteres | "Un poco más corto, por favor." |**

**| Nombre | Solo letras, espacios, acentos | "Solo letras y espacios." |**

**#### Estados**

**| Estado | Comportamiento |**

**|--------|---------------|**

**| \*\*Default\*\* | Input vacío, botón disabled |**

**| \*\*Nombre ingresado\*\* | Botón habilitado |**

**| \*\*Loading\*\* | Spinner en botón |**

**| \*\*Error\*\* | Toast: "No se pudo crear la cuenta. ¿Probás de nuevo?" |**

**| \*\*Éxito\*\* | Transición directa a selección de rol |**

**---**

**### 2.5 SELECCIÓN DE ROL**

**\*\*Duración objetivo:\*\* 10-15 segundos | \*\*⏱ Acumulado:\*\* \~45s**

**\*\*Objetivo:\*\* Determinar experiencia de onboarding y Home según rol.**

**#### Jerarquía Visual**

**┌──────────────────────────────────────┐**

**│ │**

**│ ¿Cuál es tu rol │ ← H1 (Fraunces 600, 28px)**

**│ en el hogar? │**

**│ │**

**│ Así armamos HomePlus │ ← Body, text-secondary**

**│ a tu medida. │**

**│ │**

**│ ┌────────────────────────────────┐ │ ← Cards seleccionables**

**│ │ 🏠 Coordinador/a │ │ (no radio buttons)**

**│ │ Organizás la casa │ │**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 👤 Adulto │ │**

**│ │ Formás parte del hogar │ │**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🎒 Adolescente │ │**

**│ │ Entre 13 y 17 años │ │**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🧸 Niño/a │ │**

**│ │ Entre 6 y 12 años │ │**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🌿 Adulto Mayor │ │**

**│ │ +60 años │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Continuar │ │ ← Botón primario, lg**

**│ └────────────────────────────────┘ │ Se habilita al seleccionar**

**│ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Especificación de Cards**

**| Estado | Borde | Fondo | Ícono |**

**|--------|-------|-------|-------|**

**| Default | 1px divider-strong | surface-card | text-tertiary |**

**| Selected | 2px prim-500 | prim-50 | prim-500 |**

**- Íconos: 32×32px**

**- Padding: 16px, gap ícono↔texto: 12px**

**- Título: body L semibold, text-primary**

**- Subtítulo: body S, text-secondary**

**#### Redirección por Rol**

**| Rol seleccionado | Destino |**

**|-----------------|---------|**

**| Coordinador/a | Creación del Hogar (§2.6) |**

**| Adulto | Flujo Adulto (§3.1) |**

**| Adolescente | Flujo Adolescente (§3.2) |**

**| Niño/a | Flujo Niño (§3.3) |**

**| Adulto Mayor | Flujo Adulto Mayor (§3.4) |**

**> \*\*Nota:\*\* Invitado y Empleado Familiar no aparecen como opción en esta pantalla porque son roles que se asignan por invitación: el Coordinador invita a la persona usando el flujo de People (§05.07) y el invitado acepta desde su flujo específico (§3.5, §3.6).**

**---**

**### 2.6 CREACIÓN DEL HOGAR — PASO 1: TIPO DE HOGAR**

**\*\*Duración objetivo:\*\* 10 segundos | \*\*⏱ Acumulado:\*\* \~55s**

**\*\*Objetivo:\*\* Categorizar la estructura del hogar para ajustar defaults y reglas de acceso.**

**#### Jerarquía Visual**

**┌──────────────────────────────────────┐**

**│ ← Atrás │**

**│ │**

**│ ¿Cómo es tu hogar? │ ← H1 (Fraunces 600, 28px)**

**│ │**

**│ Esto nos ayuda a sugerirte │ ← Body, text-secondary**

**│ lo que te sirve. │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 👨‍👩‍👧 Familia con hijos │ │ ← Cards seleccionables**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 👨‍👩‍👦‍👦 Familia extendida │ │**

**│ │ (abuelos, tíos, etc.) │ │**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 💑 Pareja │ │**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🏠 Convivientes │ │**

**│ │ (amigos, roommates) │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Continuar │ │**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Reglas de acceso por tipo de hogar**

**| Tipo | Comportamiento |**

**|------|---------------|**

**| Familia con hijos | Visibilidad total sobre niños. Moderada sobre adolescentes |**

**| Familia extendida | Visibilidad segmentada por núcleo |**

**| Pareja | Visibilidad equitativa. Ambos pueden ser co-coordinadores |**

**| Convivientes | Máxima privacidad individual. Solo tareas/gastos comunes visibles |**

**---**

**### 2.7 CREACIÓN DEL HOGAR — PASO 2: NOMBRE Y FOTO**

**\*\*Duración objetivo:\*\* 15-20 segundos | \*\*⏱ Acumulado:\*\* \~70s**

**\*\*Objetivo:\*\* Dar identidad al hogar. Nombre cálido. Foto opcional.**

**#### Jerarquía Visual**

**┌──────────────────────────────────────┐**

**│ ← Atrás │**

**│ │**

**│ ¿Cómo le dicen │ ← H1 (Fraunces 600, 28px)**

**│ a tu casa? │**

**│ │**

**│ ┌──────┐ │**

**│ │ 🏠 │ │ ← Avatar del hogar (72px)**

**│ │ Foto │ │ Tap → bottom sheet cámara/galería**

**│ └──────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Nombre del hogar │ │ ← Input lg (52px)**

**│ │ Casa de los Robles │ │ placeholder sugerido**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Continuar │ │ ← Botón primario, lg**

**│ └────────────────────────────────┘ │ Habilitado con nombre**

**│ │**

**│ También podés hacerlo después │ ← Caption, text-tertiary (foto)**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Validaciones**

**| Campo | Regla | Mensaje |**

**|-------|-------|---------|**

**| Nombre | No vacío | — (botón deshabilitado) |**

**| Nombre | Máx. 30 caracteres | "Un poco más corto." |**

**---**

**### 2.8 CREACIÓN DEL HOGAR — PASO 3: DISPONIBILIDAD HORARIA**

**\*\*Duración objetivo:\*\* 10 segundos | \*\*⏱ Acumulado:\*\* \~80s**

**\*\*Objetivo:\*\* Informar a Geni cuándo y cuánto tiempo tiene el coordinador para tareas del hogar.**

**#### Jerarquía Visual**

**┌──────────────────────────────────────┐**

**│ ← Atrás │**

**│ │**

**│ ¿Cuánto tiempo tenés │ ← H1 (Fraunces 600, 28px)**

**│ para las cosas de tu │**

**│ casa? │**

**│ │**

**│ Así Geni te sugiere tareas │ ← Body, text-secondary**

**│ cuando realmente podés. │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🕐 1 a 2 horas por día │ │ ← Cards seleccionables**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🕑 3 a 4 horas por día │ │**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🕒 5 horas o más │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ ¿A qué hora preferís que te │ │ ← Bottom sheet trigger**

**│ │ avise? 🌅 Mañana (8 AM) ▼ │ │ Opciones: Mañana, Media**

**│ └────────────────────────────────┘ │ mañana, Tarde, Noche**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Continuar │ │**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**---**

**### 2.9 PERSONALIZACIÓN DEL PERFIL — PASO 1: FOTO Y NOMBRE COMPLETO**

**\*\*Duración objetivo:\*\* 15 segundos | \*\*⏱ Acumulado:\*\* \~95s**

**\*\*Objetivo:\*\* Completar identidad del coordinador dentro del hogar.**

**┌──────────────────────────────────────┐**

**│ ← Atrás │**

**│ │**

**│ Ponete cara │ ← H1 (Fraunces 600, 28px)**

**│ │**

**│ ┌──────┐ │**

**│ │ 📷 │ │ ← Avatar personal (72px)**

**│ │ Foto │ │ Iniciales si no hay foto**

**│ └──────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Nombre completo │ │ ← Input lg**

**│ │ Mariana García │ │ Pre-rellenado del registro**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Continuar │ │**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**> \*\*Nota:\*\* El color de fondo del avatar se asigna por hash del nombre entre los 4 colores del Design System: arcilla (#F2E0D4), salvia (#D8E5DA), miel (#F2E6CC), lavanda (#E4DFF0).**

**---**

**### 2.10 PERSONALIZACIÓN DEL PERFIL — PASO 2: TONO Y NOTIFICACIONES**

**\*\*Duración objetivo:\*\* 15 segundos | \*\*⏱ Acumulado:\*\* \~110s**

**\*\*Objetivo:\*\* Configurar cómo Geni se comunica y con qué frecuencia.**

**┌──────────────────────────────────────┐**

**│ ← Atrás │**

**│ │**

**│ ¿Cómo querés que │ ← H1 (Fraunces 600, 28px)**

**│ te hable Geni? │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ ○ Mariana (tuteo) │ │ ← Radio cards**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ ○ Sra. García (usted) │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ────────────────────────────────── │ ← divider**

**│ │**

**│ ¿Cuánto te avisamos? │ ← H3 (Inter 600, 20px)**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🔔 Media │ │ ← Cards seleccionables**

**│ │ Lo importante del día │ │ Default: Media**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🔔🔔 Alta │ │**

**│ │ Cada novedad │ │**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🔕 Baja │ │**

**│ │ Solo lo urgente │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Entrar a mi hogar │ │ ← Botón primario, lg**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**---**

**### 2.11 PRIMER VALOR VISIBLE — ⏱ OBJETIVO: ≤60s DESDE SPLASH**

**\*\*Duración objetivo:\*\* 15-20 segundos**

**\*\*Objetivo:\*\* El coordinador completa SU PRIMERA ACCIÓN en HomePlus. No es una felicitación. Es "hagamos algo juntos ahora".**

**┌──────────────────────────────────────┐**

**│ │**

**│ 🎯 Tu hogar está listo │ ← H2 (Fraunces 600, 24px)**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 💬 Geni: │ │ ← Card destacada**

**│ │ │ │ borde izq prim-500 (4px)**

**│ │ "Mariana, vi que armaste │ │**

**│ │ tu hogar. ¿Arrancamos con │ │**

**│ │ algo concreto?" │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ Sugerencia para hoy: │ ← Caption, text-tertiary**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 📋 Crear la lista de │ │ ← Card de sugerencia**

**│ │ compras de la semana │ │ Tap → bottom sheet de creación**

**│ │ Tiempo estimado: 2 min → │ │**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 📅 Cargar los eventos │ │ ← Segunda sugerencia**

**│ │ fijos de la semana → │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ Nada, después │ ← Botón ghost (skip)**

**│ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Acciones al seleccionar una sugerencia**

**\*\*Si elige "Crear lista de compras":\*\* Bottom sheet 50% con:**

**- Título: "Lista de compras"**

**- Campo de texto para primer ítem (autofocus)**

**- Sugerencia de Geni: chips con ítems comunes (🥛Leche, 🍞Pan, 🥚Huevos, 🧈Manteca)**

**- Botón "Guardar" (sticky footer)**

**- Toast al guardar: "Tu primera lista. Cuando invites a alguien, la pueden completar entre todos."**

**\*\*Si elige "Cargar eventos":\*\* Bottom sheet 50% para crear primer evento.**

**> ⏱ \*\*Medición del principio "60 segundos":\*\* Entre el fin del Splash (\~2.5s) y el tap en "Crear lista de compras" transcurren aproximadamente 40-55 segundos si el usuario avanza sin detenerse. El primer valor visible (tarea creada) ocurre antes de los 60 segundos. ✓**

**---**

**### 2.12 INVITACIÓN A MIEMBROS**

**\*\*Duración objetivo:\*\* 10-15s (si invita), 3s (si posterga)**

**\*\*Objetivo:\*\* Ofrecer la invitación como opción natural. Postergable.**

**┌──────────────────────────────────────┐**

**│ │**

**│ ¿A quién invitás │ ← H1 (Fraunces 600, 28px)**

**│ primero? │**

**│ │**

**│ HomePlus funciona mejor │ ← Body, text-secondary**

**│ con todos. Pero sin apuro. │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 👤 Nombre del miembro │ │ ← Input lg**

**│ │ Mateo │ │**

**│ ├────────────────────────────────┤ │**

**│ │ 📧 Email o teléfono │ │ ← Input md**

**│ │ mateo@email.com │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Enviar invitación │ │ ← Botón primario, lg**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ─────────── o ─────────── │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 📱 Compartir link │ │ ← Botón secondary**

**│ └────────────────────────────────┘ │ Abre share sheet nativo**

**│ │**

**│ Después lo hago │ ← Botón ghost**

**│ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Flujo de Compartir Link**

**1. Tap en "Compartir link" → Link único del hogar (válido 7 días)**

**2. Share sheet nativo: WhatsApp, Mensajes, Mail, Copiar link**

**3. El link incluye: "Mariana te invitó a Casa de los Robles en HomePlus"**

**4. Toast: "Link copiado. Vence en 7 días."**

**---**

**### 2.13 HOME POST-ONBOARDING — COORDINADOR**

**\*\*Objetivo:\*\* El usuario llega a su Home funcional con la estructura oficial según Final Spec V1 §18.05.**

**> \*\*Regla canónica (§18.04):\*\* Home resume información. NO administra información. Toda card conduce al módulo que la administra.**

**#### Jerarquía Visual (Orden Oficial §18.05)**

**┌──────────────────────────────────────┐**

**│ \[Avatar] Casa de los Robles ▼ │ ← Header: Selector multi-hogar**

**│ │ (§24.13, visible solo si 2+ hogares)**

**│ │**

**│ Hola, Mariana 👋 │ ← Display (Fraunces 700, 32px)**

**│ Martes 12 de junio · 08:42 │ ← bodyS, text-secondary**

**│ │**

**│ ┌────────────────────────────────┐ │ ← CAPA 1: BRIEFING (§18.06)**

**│ │ 🧠 Briefing diario │ │ Card destacada**

**│ │ │ │ borde izq prim-500 (4px)**

**│ │ Bienvenida a Casa de los │ │**

**│ │ Robles. Ya tenés todo listo │ │**

**│ │ para arrancar. Estas son tus │ │**

**│ │ primeras acciones. │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │ ← CAPA 2: ATENCIÓN REQUERIDA**

**│ │ ⚠️ Atención requerida │ │ (§18.11, condicional)**

**│ │ Tu hogar está solo por ahora. │ │ Card alerta si aplica**

**│ │ \[Invitar miembros →] │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │ ← CAPA 3: CARGA FAMILIAR**

**│ │ ⚖️ Carga Familiar │ │ (§18.05, solo Coordinador)**

**│ │ Todavía no hay miembros para │ │**

**│ │ calcular la carga. │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │ ← CAPA 4: TAREAS**

**│ │ 📋 Mis pendientes (0) │ │ Agrupadas por Responsabilidad**

**│ │ │ │ (§18.14)**

**│ │ Sin tareas pendientes. │ │**

**│ │ ¿Creamos la primera? │ │**

**│ │ \[+ Crear tarea] │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │ ← CAPA 5: PRÓXIMOS EVENTOS**

**│ │ 📅 Sin eventos esta semana │ │ (§18.05)**

**│ │ ¿Agregamos el primero? │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ──────────────────────────────────── │ ← BOTTOM NAV (§24.04)**

**│ 🏠Home 👥People \[+] 📋Planner ⋯More │ CONGELADA V1**

**│ ──────────────────────────────────── │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Navegación disponible desde Home Post-Onboarding**

**| Tab | Destino | Contenido para Coordinador nuevo |**

**|-----|---------|----------------------------------|**

**| 🏠 \*\*Home\*\* | §18 | Briefing + Atención + Carga + Tareas + Eventos |**

**| 👥 \*\*People\*\* | §24.07 | Feed (vacío) + Presence (sin datos) + Personas (solo el Coordinador) |**

**| ➕ \*\*Quick Actions\*\* | §24.09 | Geni (fijo) + Crear tarea + Crear evento + Registrar gasto |**

**| 📋 \*\*Planner\*\* | §24.08 | Tasks (vacío) + Calendar (vacío) + Goals (vacío) |**

**| ⋯ \*\*More\*\* | §24.12 | Finance + Inventory + HomeCloud + Settings |**

**> \*\*SOS:\*\* Acceso vía swipe ↑ desde cualquier pantalla (§24.11). No está en Bottom Nav ni en Quick Actions.**

**#### Empty States por Dominio (Accediendo desde Bottom Nav)**

**##### People → Personas (§05)**

**┌──────────────────────────────────────┐**

**│ ← Home Personas │**

**│ │**

**│ 👤 │ ← Ícono 48px, prim-300**

**│ │**

**│ Todavía no invitaste a nadie. │ ← H3, text-primary**

**│ │**

**│ Cuando invites miembros, │ ← Body S, text-secondary**

**│ aparecen acá con su rol y │**

**│ foto. │**

**│ │**

**│ ┌──────────────────────────┐ │**

**│ │ + Invitar miembro │ │ ← Botón primario, md**

**│ └──────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**##### Planner → Tasks (§06)**

**┌──────────────────────────────────────┐**

**│ ← Home Tasks │**

**│ │**

**│ 📋 │ ← Ícono 48px, prim-300**

**│ │**

**│ Todavía no hay tareas │ ← H3, text-primary**

**│ en el hogar. │**

**│ │**

**│ Acá van a aparecer las compras, │ ← Body S, text-secondary**

**│ los trámites y todo lo que │**

**│ necesiten coordinar. │**

**│ │**

**│ ┌──────────────────────────┐ │**

**│ │ + Crear primera tarea │ │ ← Botón primario, md**

**│ └──────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**##### More → Finance (§07)**

**┌──────────────────────────────────────┐**

**│ ← More Finance │**

**│ │**

**│ 💰 │ ← Ícono 48px, prim-300**

**│ │**

**│ Todavía no hay gastos │ ← H3, text-primary**

**│ este mes. │**

**│ │**

**│ ┌──────────────────────────┐ │**

**│ │ + Agregar primer gasto │ │ ← Botón primario, md**

**│ └──────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**##### More → Inventory (§09)**

**┌──────────────────────────────────────┐**

**│ ← More Inventory │**

**│ │**

**│ 📦 │ ← Ícono 48px, prim-300**

**│ │**

**│ Todavía no hay productos │ ← H3, text-primary**

**│ en el inventario. │**

**│ │**

**│ Acá van a aparecer los │ ← Body S, text-secondary**

**│ consumibles del hogar y las │**

**│ alertas de stock bajo. │**

**│ │**

**│ ┌──────────────────────────┐ │**

**│ │ + Agregar primer ítem │ │ ← Botón primario, md**

**│ └──────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**##### People → Presence (§08, empty)**

**┌──────────────────────────────────────┐**

**│ ← People Presence │**

**│ │**

**│ 📍 │ ← Ícono 48px, prim-300**

**│ │**

**│ Sin datos de presencia │ ← H3, text-primary**

**│ todavía. │**

**│ │**

**│ Cuando los miembros activen │ ← Body S, text-secondary**

**│ su ubicación, vas a ver quién │**

**│ está en casa. │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**---**

**## 3. VARIACIONES POR ROL**

**### 3.1 FLUJO ADULTO (2 pantallas, \~30s)**

**El adulto llega por invitación de un Coordinador (§04.04, §05.07). Ya existe un hogar.**

**#### Pantalla A1: Aceptar Invitación**

**┌──────────────────────────────────────┐**

**│ │**

**│ ¡Te invitaron! │ ← H1 (Fraunces 600, 28px)**

**│ │**

**│ Mariana te sumó a │ ← Body L, text-secondary**

**│ Casa de los Robles. │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🏠 Casa de los Robles │ │ ← Card del hogar**

**│ │ │ │**

**│ │ Miembros: 👤👤👤 │ │ Avatares en grupo**

**│ │ Mariana, Tomás, Don Carlos │ │**

**│ │ Tipo: Familia con hijos │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Unirme al hogar │ │ ← Botón primario, lg**

**│ └────────────────────────────────┘ │**

**│ │**

**│ No es mi hogar │ ← Botón ghost (reporta error)**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Pantalla A2: Personalización**

**┌──────────────────────────────────────┐**

**│ ← Atrás │**

**│ │**

**│ Contame de vos │ ← H1**

**│ │**

**│ ┌──────┐ │**

**│ │ 📷 │ │ ← Avatar**

**│ └──────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Nombre completo │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ ¿A qué hora preferís que te │ │**

**│ │ avise? 🌅 Mañana (8 AM) ▼ │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ ¿Cómo te hablo? │ │**

**│ │ ○ Nombre ○ Usted │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Entrar a Casa de los Robles │ │ ← Botón primario**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Home Post-Onboarding — Adulto**

**Misma estructura oficial (§18.05) que el Coordinador pero con visibilidad operativa reducida (§18.23):**

**- \*\*Briefing:\*\* "Hola, Tomás. Tenés 0 tareas pendientes."**

**- \*\*Carga Familiar:\*\* No visible (solo Coordinador §18.05)**

**- \*\*Bottom Nav:\*\* `\[Home] \[People] \[+] \[Planner] \[More]` — completa, con permisos de Adulto (§04.04)**

**---**

**### 3.2 FLUJO ADOLESCENTE (2 pantallas, \~25s)**

**#### Pantalla T1: Avatar + Color**

**┌──────────────────────────────────────┐**

**│ │**

**│ ¡Bienvenido! │ ← H1 (Fraunces 600, 28px)**

**│ │**

**│ Elegí tu estilo │ ← Body, text-secondary**

**│ │**

**│ ┌──────┐ │**

**│ │ 🎒 │ │ ← Avatar xl (72px)**

**│ │Avatar│ │ Selector: 8 colores + emojis**

**│ └──────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Nombre │ │ ← Input lg**

**│ │ Jose │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Continuar │ │**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**\*\*Selector de avatar:\*\* 8 colores (4 del DS + coral, turquesa, violeta, grafito) + emojis (🎒 🎮 ⚽ 🎸 📚 🎨 🚲 🐱). Sin foto real (opcional después).**

**#### Pantalla T2: Tono + Notificaciones**

**┌──────────────────────────────────────┐**

**│ ← Atrás │**

**│ │**

**│ ¿Cómo te hablo? │ ← H1**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ ○ Directo (sin vueltas) │ │**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ ○ Tranqui (más relajado) │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ────────────────────────────────── │**

**│ │**

**│ Notificaciones │ ← H3**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🔔 Normal │ │ ← Default**

**│ │ 🔕 Pocas │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Entrar │ │**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Home Post-Onboarding — Adolescente**

**- \*\*Briefing:\*\* "Hola, Jose. Estas son tus misiones de hoy."**

**- Más foco en tareas, eventos y coordinación (§18.23)**

**- Rachas visibles (gamificación ligera, sin comparación con otros — §02.03)**

**- Sin tab Finance visible (según permisos §04.05)**

**- \*\*Bottom Nav:\*\* `\[Home] \[People] \[+] \[Planner] \[More]`**

**---**

**### 3.3 FLUJO NIÑO (3 pantallas, \~25s)**

**#### Pantalla N1: Avatar + Color**

**┌──────────────────────────────────────┐**

**│ │**

**│ ¡Hola! │ ← H1 grande, amigable**

**│ │**

**│ ¿Cómo querés que te │ ← Body L**

**│ vean en casa? │**

**│ │**

**│ ┌──────┐ │**

**│ │ 🧸 │ │ ← Avatar xl (72px)**

**│ │Person│ │ 6 animales: 🐶🐱🐰🦊🐼🐨**

**│ └──────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Nombre │ │**

**│ │ Luca │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ ¡Listo! │ │**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Pantalla N2: Lista Demo**

**┌──────────────────────────────────────┐**

**│ │**

**│ Esta es tu lista │ ← H1**

**│ del día │**

**│ │**

**│ Así te va a mostrar Geni │ ← Body S**

**│ lo que tenés que hacer. │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🧸 Ordenar tu cuarto │ │ ← Items demo**

**│ └────────────────────────────────┘ │ (no interactivos aún)**

**│ ┌────────────────────────────────┐ │**

**│ │ 📚 Hacer la tarea │ │**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🐶 Darle de comer a Moka │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ ¡Entendido! │ │ ← Botón primario, lg**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Pantalla N3: Primera Tarea Interactiva**

**┌──────────────────────────────────────┐**

**│ │**

**│ ¡Probemos! │ ← H1**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🧸 Ordenar tu cuarto │ │ ← Tarea real creada por Geni**

**│ │ │ │ (onboarding mode)**

**│ │ ☐ Tocá acá cuando │ │ Checkbox interactivo**

**│ │ termines │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ Tocá el círculo para │ ← Body S, text-secondary**

**│ completar tu primera misión. │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**\*\*Al completar:\*\* Checkbox 24×24px (touch target 44×44px) → fill success-500, animación 300ms ease-out + scale → háptico 'light' → animación sutil de partículas (3 estrellitas, 400ms, acent-500) → "¡Listo! 🎯" → transición a Home.**

**#### Home Post-Onboarding — Niño**

**- Experiencia simplificada (§18.23)**

**- Solo 1 card: "Mi lista de hoy" con tareas asignadas**

**- Sin métricas, sin finanzas, sin configuración**

**- Sin badges de error o alerta jamás (§UX-07)**

**- Tono: simple, positivo, visual**

**- \*\*Bottom Nav:\*\* `\[Home] \[People] \[+] \[Planner] \[More]` — completa, con permisos restringidos (§04.06)**

**---**

**### 3.4 FLUJO ADULTO MAYOR (4 pantallas, \~60s)**

**> \*\*Regla:\*\* El Adulto Mayor tiene permisos equivalentes a un Adulto (§04.07). Usa la misma Bottom Nav con experiencia adaptada (modo `senior`).**

**#### Pantalla S1: Bienvenida + Tratamiento**

**┌──────────────────────────────────────┐**

**│ │**

**│ Bienvenido a │ ← H1 senior (36px/44px)**

**│ HomePlus │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Nombre │ │ ← Input lg senior (64px altura)**

**│ │ Carlos │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ¿Cómo prefiere que le diga? │ ← Body L senior (22px)**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ ○ Carlos │ │ ← Cards seleccionables**

**│ └────────────────────────────────┘ │ (min 56px altura)**

**│ ┌────────────────────────────────┐ │**

**│ │ ○ Don Carlos │ │**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ ○ Carlos García │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Continuar │ │ ← Botón lg (64px)**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Pantalla S2: Tamaño de Letra**

**┌──────────────────────────────────────┐**

**│ │**

**│ ¿Ve bien la letra? │ ← H1 senior (36px)**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🔤 Letra grande │ │ ← Card con texto demo**

**│ │ │ │ en escala senior**

**│ │ Así de grande se va │ │ DEFAULT SELECCIONADA**

**│ │ a ver todo. │ │ Badge: Recomendado**

**│ │ \[RECOM] │ │**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🔤 Letra normal │ │ ← Card con texto 16px**

**│ │ Tamaño estándar. │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Continuar │ │**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**> \*\*Default: Letra grande.\*\* HomePlus recomienda activamente el modo accesible (§7.4). El usuario puede reducirlo, pero el default es la opción más segura.**

**#### Pantalla S3: Medicación + Horario (se registra en Inventory §09.11-§09.13)**

**┌──────────────────────────────────────┐**

**│ │**

**│ ¿Toma algún │ ← H1 senior**

**│ medicamento? │**

**│ │**

**│ Así le recordamos. │ ← Body L**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Medicamento │ │**

**│ │ Losartán │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ ¿A qué hora? │ │ ← Selector simplificado**

**│ │ 🌅 9:00 AM ▼ │ │ (horas fijas)**

**│ └────────────────────────────────┘ │**

**│ │**

**│ + Agregar otro │ ← Botón ghost**

**│ │**

**│ Después lo cargo │ ← Botón ghost (skip)**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Continuar │ │**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Pantalla S4: Contacto de Emergencia**

**┌──────────────────────────────────────┐**

**│ │**

**│ ¿A quién llamamos │ ← H1 senior**

**│ si necesita ayuda? │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Nombre del contacto │ │**

**│ │ Mariana │ │**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Teléfono │ │**

**│ │ +54 11 5555-0000 │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ ❤️ Este contacto va a │ │ ← Card info**

**│ │ aparecer en tu Home │ │ info-100 bg**

**│ │ por si lo necesitás. │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Entrar a HomePlus │ │**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Home Post-Onboarding — Adulto Mayor**

**Misma estructura oficial (§18.05) que los demás roles, con adaptaciones §4.3 del Design System:**

**- \*\*Modo `senior`:\*\* tipografía +25-35%, touch targets ≥56px, contraste AA+ (§7.4)**

**- \*\*Briefing:\*\* "Buen día, Don Carlos. Su medicación de las 9."**

**- \*\*Card de medicación prominente\*\* (card destacada, prim-500, borde izq 4px)**

**- \*\*Card de contacto de emergencia:\*\* 1-tap para llamar, siempre visible en Home**

**- \*\*Toast:\*\* duración 8s. Sin timeout en confirmaciones**

**- \*\*Sin gestos:\*\* solo tap. Sin pull-to-refresh**

**- \*\*Bottom Nav congelada:\*\* `\[Home] \[People] \[+] \[Planner] \[More]` con íconos + texto siempre visible**

**---**

**### 3.5 FLUJO INVITADO (1 pantalla, \~15s)**

**El Invitado es un rol con acceso mínimo (§04.08). Llega por invitación de un Coordinador o Adulto.**

**#### Pantalla I1: Aceptar**

**┌──────────────────────────────────────┐**

**│ │**

**│ Te invitaron como │ ← H1**

**│ invitado │**

**│ │**

**│ Mariana te sumó a │ ← Body**

**│ Casa de los Robles. │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ ℹ️ Como invitado, solo ves │ │ ← Card info**

**│ │ lo necesario para participar. │ │ info-100 bg**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Aceptar invitación │ │**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Home Post-Onboarding — Invitado**

**- Solo contexto autorizado por el Coordinador (§04.08)**

**- Sin acceso a Finanzas, Inventario, Configuración**

**- Sin métricas de carga familiar**

**- Bottom Nav con tabs visibles según permisos configurados**

**---**

**### 3.6 FLUJO EMPLEADO FAMILIAR (2 pantallas, \~20s)**

**El Empleado Familiar es un colaborador operativo (§17). Su onboarding es configurado por el Coordinador (§17.05).**

**#### Pantalla E1: Aceptar + Responsabilidades**

**┌──────────────────────────────────────┐**

**│ │**

**│ Te invitaron como │ ← H1**

**│ empleado del hogar │**

**│ │**

**│ Mariana te sumó a │ ← Body**

**│ Casa de los Robles. │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 📋 Tus responsabilidades: │ │ ← Card informativa**

**│ │ • Limpieza general │ │**

**│ │ • Compras del hogar │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ 🕐 Tu horario: │ │**

**│ │ Lunes 09:00-13:00 │ │**

**│ │ Miércoles 09:00-13:00 │ │**

**│ │ Viernes 09:00-13:00 │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Aceptar y comenzar │ │**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Pantalla E2: Perfil Mínimo**

**┌──────────────────────────────────────┐**

**│ │**

**│ Solo un par de datos │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Nombre │ │**

**│ │ Rosa │ │**

**│ └────────────────────────────────┘ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Teléfono (opcional) │ │**

**│ └────────────────────────────────┘ │**

**│ │**

**│ ┌────────────────────────────────┐ │**

**│ │ Entrar │ │**

**│ └────────────────────────────────┘ │**

**└──────────────────────────────────────┘**



**\*.txt**

**Plaintext**

**#### Home Post-Onboarding — Empleado Familiar**

**- Visión centrada en trabajo asignado (§18.23)**

**- Solo ve tareas de sus responsabilidades (§17.10)**

**- Geni con acceso limitado (§17.15-§17.17)**

**- No ve finanzas del hogar, documentos, métricas ni ubicación de otros miembros (salvo configuración explícita §17.13)**

**---**

**## 4. CATÁLOGO DE EMPTY STATES POST-ONBOARDING**

**### 4.1 Principios**

**- \*\*Informativos, no tristes.\*\* Un empty state nunca dice "qué vacío". Dice qué va a aparecer y sugiere la primera acción.**

**- \*\*Una acción sugerida por empty state.\*\* Regla del 1-tap.**

**- \*\*Consistentes con el tono del rol.\*\* Niño no ve el mismo empty state que Adulto.**

**- \*\*El empty state es el tutorial de la app\*\* (§6.2 del Design System). Sin tooltips ni carruseles.**

**### 4.2 Catálogo Completo (Dominios Oficiales §03.02)**

**| Pantalla | Rol | Copy | Acción |**

**|----------|-----|------|--------|**

**| \*\*Home\*\* (sin tareas) | Coordinador | "Sin tareas pendientes. ¿Creamos la primera?" | \[Crear tarea] |**

**| \*\*Home\*\* (sin tareas) | Adulto | "No tenés tareas pendientes. Cuando haya, aparecen acá." | — |**

**| \*\*Home\*\* (sin tareas) | Adolescente | "Sin misiones por ahora." | — |**

**| \*\*Home\*\* (sin tareas) | Niño | "¡Tu lista está vacía! Nada pendiente." | — |**

**| \*\*Home\*\* (sin miembros) | Coordinador | "Tu hogar está listo. Cuando invites a alguien, todo se conecta solo." | \[Invitar miembro] |**

**| \*\*People → Personas\*\* | Coordinador | "Todavía no invitaste a nadie. ¿Agregamos al primer miembro?" | \[Invitar miembro] |**

**| \*\*People → Personas\*\* (invitación pendiente) | Coordinador | "Mateo — Pendiente ⏳. Cuando acepte, aparece acá." | \[Reenviar] |**

**| \*\*People → Feed\*\* | Todos | "El feed está vacío. Cuando haya actividad en el hogar, aparece acá." | — |**

**| \*\*People → Presence\*\* | Todos | "Sin datos de presencia todavía. Cuando los miembros activen su ubicación, vas a ver quién está en casa." | — |**

**| \*\*Planner → Tasks\*\* | Coordinador/Adulto | "Acá van a aparecer las tareas del hogar. Compras, trámites, todo lo que necesiten coordinar." | \[+ Crear primera tarea] |**

**| \*\*Planner → Tasks\*\* | Niño | "Tu lista está vacía. ¡Nada por hacer!" | — |**

**| \*\*Planner → Calendar\*\* | Todos | "Calendario libre por ahora. ¿Agregamos algo?" | \[+ Crear primer evento] |**

**| \*\*Planner → Goals\*\* | Adulto/Coord. | "Sin metas todavía. ¿Te animás a crear la primera?" | \[+ Crear meta] |**

**| \*\*More → Finance\*\* | Adulto/Coord. | "Todavía no hay gastos este mes." | \[+ Agregar primer gasto] |**

**| \*\*More → Inventory\*\* | Adulto/Coord. | "El inventario está vacío. ¿Agregamos el primer producto?" | \[+ Agregar ítem] |**

**| \*\*More → Inventory\*\* (medicación Adulto Mayor) | Adulto Mayor | "No hay medicamentos cargados. Su coordinador puede agregarlos por usted." | — |**

**| \*\*More → HomeCloud\*\* | Adulto/Coord. | "La nube familiar está vacía. ¿Suben la primera foto o documento?" | \[+ Subir] |**

**| \*\*More → Settings\*\* | Coordinador | — (Settings nunca está vacío) | — |**

**---**

**## 5. DECISIONES DE ONBOARDING**

**| # | Decisión | Alternativa considerada | Fundamento (Final Spec V1) |**

**|---|----------|------------------------|---------------------------|**

**| OB-01 | \*\*5-7 pantallas máx. para Coordinador\*\* | 10+ pantallas | §6 UX Philosophy: 60s hasta valor. Configuración completa postergable |**

**| OB-02 | \*\*Permisos de notificación después del primer valor\*\* | Pedirlos al inicio | Sin valor visible → rechazo probable. Post-creación → mayor aceptación |**

**| OB-03 | \*\*Primer valor = acción concreta (crear tarea/evento)\*\* | Tour exploratorio | El usuario debe experimentar valor. Crear > mirar |**

**| OB-04 | \*\*Invitación postergable, no obligatoria\*\* | Forzar para "completar" | Coordinador debe poder usar HomePlus solo desde el minuto 1 |**

**| OB-05 | \*\*Foto de perfil/hogar siempre opcional\*\* | Foto obligatoria | Sin fricción innecesaria. No aporta al primer valor |**

**| OB-06 | \*\*Geni sugiere 2 opciones concretas\*\* | "¿Qué querés hacer?" abierto | Evita parálisis de elección. Basado en defaults del tipo de hogar |**

**| OB-07 | \*\*Tratamiento (tuteo/usted) se pregunta explícitamente\*\* | Deducirlo del rol | Cultural LATAM. No se asume |**

**| OB-08 | \*\*Disponibilidad en 3 franjas, no horas exactas\*\* | Time picker preciso | Menos fricción. Geni refina con datos de uso |**

**| OB-09 | \*\*Adulto Mayor: default letra grande\*\* | Pregunta neutral | Inclusión activa. El default es la opción más segura (§7.4) |**

**| OB-10 | \*\*Niño: lista demo → tarea real interactiva\*\* | Home directo | El niño necesita entender el concepto antes de usarlo |**

**| OB-11 | \*\*No preguntar edad exacta\*\* | Campo numérico | Minimización de datos. La franja etaria del rol es suficiente |**

**| OB-12 | \*\*Login social ofrecido, no impuesto\*\* | Solo email o solo social | Elección del usuario. Google dominante en LATAM |**

**| OB-13 | \*\*Bottom Nav CONGELADA\*\* | Tabs variables por rol | §24.04 + §25. La estructura `\[Home] \[People] \[+] \[Planner] \[More]` es inmutable en V1 |**

**| OB-14 | \*\*Sin dominio "Cuidados"\*\* | Tab dedicado a salud | No existe en §03.02. Medicación → Inventory (§09.11-§09.13). Eventos de salud → Calendar |**

**| OB-15 | \*\*Invitación vía link (WhatsApp-first)\*\* | Solo email | LATAM coordina por WhatsApp. El link es el camino de menor fricción |**

**| OB-16 | \*\*1 acción principal por pantalla\*\* | Múltiples CTAs | §6 UX Philosophy: regla del 1-tap |**

**| OB-17 | \*\*Chips informativos, no carrusel\*\* | 3-slide carousel | Sin swipe innecesario. 3 valores en <2s |**

**| OB-18 | \*\*Empty states con acción sugerida\*\* | Solo texto descriptivo | La app enseña usándose. El empty state es el mejor momento para la primera acción |**

**---**

**## 6. ESTADOS GLOBALES DEL ONBOARDING**

**### 6.1 Sin Conexión**

**| Tipo de pantalla | Comportamiento |**

**|-----------------|----------------|**

**| \*\*Solo UI\*\* (Bienvenida, Selección Rol, Tipo Hogar, Disponibilidad) | Funcionan offline. Sin backend |**

**| \*\*Con backend\*\* (Registro, Login, Invitación) | Toast: "Sin conexión. Cuando vuelva, continuamos donde estabas." Datos no se pierden |**

**| \*\*Splash\*\* | Carga offline sin problema |**

**### 6.2 Interrupción y Retoma**

**| Escenario | Comportamiento |**

**|-----------|---------------|**

**| Registro no completado | Se descarta. Vuelve a Bienvenida |**

**| Cuenta creada, onboarding no terminado | Retoma donde quedó. Datos preservados localmente |**

**| Timeout >7 días | Se reinicia onboarding del hogar (no el registro) |**

**### 6.3 Modo Oscuro**

**El onboarding respeta el tema del sistema. Si el teléfono está en modo oscuro, se aplica la paleta oscura del Design System V2 (§1.4). Excepción: Adulto Mayor fuerza modo claro con alto contraste (§7.4).**

**---**

**\*Documento canónico del Onboarding de HomePlus V2. Cada pantalla, cada copy, cada decisión responde a los principios de la Final Spec V1 (§01-§25), la paleta y componentes del Design System V2, y el principio de "60 segundos hasta el primer valor visible". El onboarding no es una barrera: es la primera experiencia de valor del usuario con su hogar. La navegación congelada `\[Home] \[People] \[+] \[Planner] \[More]` (§24.04, §25) es inmutable en V1.\***



