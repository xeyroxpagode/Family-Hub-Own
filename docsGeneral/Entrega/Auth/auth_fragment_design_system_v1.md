# AUTH + ONBOARDING fragment — HomePlus — Design System V2

## 1. Información encontrada

### Objetivo del módulo

El documento no define un objetivo funcional de AUTH. Solo aporta reglas visuales y de interacción reutilizables para pantallas de autenticación, registro y onboarding si esas pantallas existen en otros documentos.

Para ONBOARDING, el archivo de comprensión sí registra una intención UX explícita: flujo de ingreso adaptado por rol, sin tutoriales ni tooltips, con objetivo de llegar al primer valor visible en 60 segundos.

### Entidades

#### Cuenta

* Aparece como entidad arquitectónica.
* Pertenece al usuario, no al hogar.
* Incluye perfil, preferencias e idioma.
* No se define como entidad de autenticación técnica.
* No se definen credenciales, password, email, sesión, token ni refresh token.

#### Onboarding

* Aparece como feature UX.
* Se describe como flujo de ingreso adaptado por rol.
* Se asocia a configuración inicial de preferencias de usuario.
* No se define modelo de datos propio.

#### Roles encontrados para el alcance MVP

El archivo de comprensión registra roles en español. Para este fragment se conservan únicamente los roles dentro del alcance MVP:

| Rol en documento | Rol MVP equivalente | Información explícita encontrada |
| ---------------- | ------------------- | -------------------------------- |
| Coordinador | Coordinator | Responsable administrativo principal del hogar. Visión completa y gestión de miembros. |
| Adulto | Adult | Miembro operativo con amplios permisos. Puede invitar. |
| Adolescente | Adolescent | Autonomía progresiva. Permisos ampliables. |
| Niño | Child | Experiencia simplificada. Rachas visuales sin presión. |
| Adulto Mayor | Senior | Experiencia adaptada: fuente grande, alto contraste, sin gestos complejos, medicación priorizada. |
| Invitado | Guest | Acceso mínimo y participación limitada. |

### Campos

#### Campos específicos de AUTH

No se encontraron campos explícitos para:

* Register.
* Login.
* Refresh Token.
* Logout.
* Session.
* Token.
* RefreshToken.
* Password.
* Email.
* Errores de credenciales.

#### Campos o datos mencionados para ONBOARDING

El archivo de comprensión registra el flujo `Onboarding por rol` con los siguientes datos de preferencias de usuario:

* nombre.
* rol.
* horario.
* medicación.
* contacto emergencia.

No se indican tipos, obligatoriedad, validaciones, valores por defecto ni estructura persistente.

#### Campos UI reutilizables para formularios

El documento define reglas generales de inputs aplicables a formularios:

* Todos los inputs tienen label arriba.
* El placeholder complementa al label, no lo reemplaza.
* `accessibilityLabel` es obligatorio en todo input.
* Estados visuales de input:
  * default.
  * focus.
  * filled.
  * error.
  * disabled.

### Tipos

No se encuentran tipos de datos para entidades AUTH u ONBOARDING.

Tipos visuales o de diseño encontrados:

* `ThemeMode = 'normal' | 'senior'`.
* `ColorScheme = 'light' | 'dark'`.

Estos tipos pertenecen al Design System, no al dominio funcional de AUTH.

### Valores por defecto

No se encontraron valores por defecto de AUTH u ONBOARDING.

Valores visuales reutilizables:

* Skeleton aparece cuando los datos tardan más de 300 ms en cargar.
* Toast dura 4 segundos por defecto.
* Toast en modo Adulto Mayor dura 8 segundos.
* Loading de botón debe mantenerse al menos 400 ms para evitar flicker.

### Restricciones

#### Formularios

* Los inputs no deben usar placeholder como reemplazo del label.
* Todo input debe tener `accessibilityLabel`.
* Los modales centrados nunca deben usarse para formularios.
* Los modales centrados nunca deben usarse para navegación entre niveles.
* El modal centrado se reserva para confirmaciones con consecuencia.
* El Bottom Sheet es la opción principal mobile para crear/editar o alojar formularios simples/complejos, pero el documento no lo vincula explícitamente a Login/Register.

#### Feedback e interacción

* Toda acción del usuario recibe feedback visual en menos de 100 ms.
* Spinner solo si la operación tarda más de 300 ms.
* El botón en loading mantiene su ancho y reemplaza el texto por spinner.
* El botón en loading permanece visualmente en estado active.
* Todo tap en botón recibe feedback háptico.
* En modo Adulto Mayor el háptico de botón es más perceptible.
* Toast se muestra arriba, nunca abajo.
* Solo puede haber un toast visible a la vez.

#### Onboarding

* No usar tooltips.
* No usar carruseles de features.
* No usar videos de onboarding.
* Empty State funciona como tutorial implícito.
* El onboarding debe apuntar a primer valor visible en 60 segundos.

#### Modo Adulto Mayor

* Todo componente acepta `mode: 'normal' | 'senior'`.
* El ThemeProvider inyecta el modo globalmente.
* En modo senior se incrementan tamaños, contraste y touch targets.
* El modo senior evita gestos complejos.

### Relaciones

* Onboarding por rol → Cuenta: el archivo de comprensión indica que las preferencias de usuario capturadas durante onboarding tienen destino `Cuenta`.
* Cuenta → usuario: la Cuenta pertenece al usuario, no al hogar.
* ThemeProvider → modo senior: el ThemeProvider soporta la adaptación visual por modo.

No se encontró relación explícita entre:

* Register → Cuenta.
* Login → Session.
* Refresh Token → Token.
* Register → crear hogar.
* Onboarding → crear hogar.
* Onboarding → invitar miembros.

### Cardinalidad

No se encontró cardinalidad implementable para AUTH u ONBOARDING.

### Estados posibles

#### Estados AUTH

No se encontraron estados de sesión, token, registro, login, logout o refresh token.

#### Estados UI de Button

* default.
* hover.
* active/pressed.
* disabled.
* loading.

#### Estados UI de Input

* default.
* focus.
* filled.
* error.
* disabled.

#### Estados UI de Toast

* success.
* alert.
* error.
* info.

### Reglas de negocio

#### AUTH

No se encontraron reglas de negocio funcionales para AUTH.

#### ONBOARDING

* Onboarding sin tutoriales ni tooltips.
* Empty states como guía.
* 60 segundos hasta primer valor visible.
* Adaptación por rol como jerarquía distinta de información, no solo filtro visual.

### Permisos

No se encontraron permisos específicos de AUTH.

Permisos/alcances de roles encontrados en el archivo de comprensión y útiles para onboarding por rol:

* Coordinator/Coordinador: gestión de miembros y visión completa.
* Adult/Adulto: puede invitar.
* Adolescent/Adolescente: autonomía progresiva; permisos ampliables.
* Child/Niño: experiencia simplificada.
* Senior/Adulto Mayor: experiencia adaptada, medicación priorizada.
* Guest/Invitado: acceso mínimo y participación limitada.

No se define matriz de permisos completa.

### Flujos

#### Register

No encontrado.

#### Login

No encontrado.

#### Refresh Token

No encontrado.

#### Logout

No encontrado.

#### Crear hogar durante registro

No encontrado.

#### Invitar miembros durante onboarding

No encontrado como flujo de onboarding. Solo se registra que el rol Adulto puede invitar y que Coordinador gestiona miembros, sin pasos ni contrato.

#### Onboarding por rol

Información encontrada:

1. Captura o configuración de preferencias de usuario.
2. Datos mencionados: nombre, rol, horario, medicación, contacto emergencia.
3. Destino: Cuenta.
4. Propósito: configurar experiencia inicial adaptada al rol.
5. Restricción UX: sin tutoriales ni tooltips.
6. Restricción UX: empty states como guía.
7. Objetivo UX: 60 segundos hasta primer valor visible.

No se definen pantallas, pasos, validaciones, persistencia ni endpoints.

### APIs

No se encontraron endpoints.

No se encontraron contratos para:

* request.
* response.
* errores.
* status codes.
* cookies.
* headers.
* refresh token.
* logout.

### Request

No encontrado.

### Response

No encontrado.

### UI

#### Componentes aplicables a AUTH/ONBOARDING

* Button.
* Input Field.
* Toast / Snackbar.
* Skeleton / Loading.
* Empty State.
* Bottom Sheet.
* Modal de confirmación, solo para consecuencias o cierre de formulario con cambios sin guardar.

#### Button

Variantes visuales:

* primary.
* secondary.
* tertiary.
* danger.
* ghost.

Tamaños estándar:

* sm: altura 36 px, touch target 44 px.
* md: altura 44 px, touch target 44 px.
* lg: altura 52 px, touch target 52 px.

Tamaños Adulto Mayor:

* sm: altura 44 px, touch target 56 px.
* md: altura 56 px, touch target 56 px.
* lg: altura 64 px, touch target 64 px.

Reglas:

* En loading mantiene ancho.
* Texto se reemplaza por spinner.
* Loading mínimo de 400 ms.
* Spinner aparece solo si la operación supera 300 ms.
* Feedback háptico en tap.

#### Input Field

Estados visuales:

* default: borde `divider-strong`, fondo `surface-card`.
* focus: borde primario, ring primario suave.
* filled: borde `divider-strong`, fondo primario sutil.
* error: borde error, ring error, texto de error debajo.
* disabled: borde divider, fondo secundario, texto disabled, opacidad 0.6.

Tamaños:

* sm: 36 px.
* md: 44 px.
* lg: 52 px.

Reglas:

* label arriba obligatorio.
* placeholder no reemplaza label.
* `accessibilityLabel` obligatorio.

#### Toast / Snackbar

* Notificación no intrusiva.
* Posición top.
* Duración default: 4 s.
* Duración Adulto Mayor: 8 s.
* Variantes: success, alert, error, info.
* Máximo un toast visible a la vez.

#### Skeleton / Loading

* Aparece cuando los datos tardan más de 300 ms.
* Usa animación pulse.
* Transición a contenido mediante fade-in.

#### Empty State

* Primera experiencia por dominio.
* Funciona como tutorial implícito.
* Estructura visual:
  * ilustración sutil.
  * título.
  * descripción.
  * acción sugerida.
* No se usan tooltips ni carruseles de features.

#### Bottom Sheet

* Opción principal mobile para crear/editar.
* Mantiene contexto.
* Alturas disponibles: 25%, 50%, 75%, 90%.
* Footer fijo con acción secundaria y acción primaria.
* Puede alojar formularios simples o complejos.

#### Modal de confirmación

* Solo para confirmaciones con consecuencia.
* Estructura:
  * ícono contextual.
  * título.
  * descripción opcional.
  * cancelar.
  * confirmar.
* Usos explícitos:
  * eliminación.
  * expulsión.
  * cambios de rol.
  * cierre de formulario con cambios sin guardar.
* Nunca para formularios.
* Nunca para navegación entre niveles.

### Componentes UI

Componentes core relevantes para este fragment:

* `Button`.
* `Input`.
* `Toast`.
* `Skeleton`.
* `EmptyState`.
* `BottomSheet`.
* `Modal`.
* `ThemeProvider`.

### Navegación

No se encontró navegación específica para Login, Register u Onboarding.

El documento sí define navegación global de la app, pero no aporta rutas de AUTH. No se extraen rutas para este fragment.

### Eventos del sistema

No se encontraron eventos técnicos de AUTH.

No se encontraron nombres como:

* `auth.registered`.
* `auth.logged_in`.
* `auth.logged_out`.
* `auth.token_refreshed`.

El flujo `Onboarding por rol` aparece como flujo de datos conceptual, sin nombre de evento técnico.

### Dependencias

Dependencias técnicas del Design System aplicables a interfaces AUTH/ONBOARDING:

* React Native / Expo.
* ThemeProvider.
* Tokens centralizados.
* Fuentes Fraunces, Inter y JetBrains Mono.
* Soporte light/dark.
* Soporte normal/senior.
* Respeto de `prefers-reduced-motion`.

### Restricciones arquitectónicas

No se encontraron restricciones arquitectónicas propias de AUTH como:

* RLS.
* separación por household en auth.
* soft delete de sesiones.
* atomicidad de registro.
* single-use tokens.
* refresh token rotation.

Restricciones transversales aplicables a UI:

* Mobile-first absoluto.
* Toda pantalla se diseña primero en 375×812 px.
* Todo componente acepta modo normal/senior.
* El modo senior debe ser estructural, no solo zoom.
* Los componentes interactivos deben cumplir touch target mínimo.
* `accessibilityLabel` en inputs y componentes interactivos.

### Casos de uso

#### Encontrados

* Configurar experiencia inicial adaptada al rol durante onboarding.
* Capturar preferencias de usuario para Cuenta durante onboarding.
* Guiar al usuario con empty states en lugar de tutoriales explícitos.

#### No encontrados

* Registro de usuario.
* Inicio de sesión.
* Renovación de token.
* Cierre de sesión.
* Creación de hogar durante registro.
* Invitación de miembros durante onboarding.

### Casos especiales

* Modo Adulto Mayor requiere mayor contraste, mayor tamaño y touch targets más grandes.
* Si el sistema solicita reducción de movimiento, las animaciones se eliminan o reducen.
* Los formularios no deben usar modales centrados.
* El cierre de formulario con cambios sin guardar puede usar modal de confirmación.

### Edge cases

* Spinner aparece solo si la operación supera 300 ms.
* Loading visual mínimo de botón: 400 ms para evitar flicker.
* Skeleton aparece si la carga inicial o refresh supera 300 ms.
* Solo puede existir un toast visible a la vez; si llega otro, reemplaza al actual.
* Placeholder no reemplaza label.
* `accessibilityLabel` obligatorio en inputs.

### Datos mockeados

No se encontraron datos mockeados para AUTH u ONBOARDING.

### Funcionalidades REAL

* Patrones UI para formularios de AUTH/ONBOARDING.
* Estados visuales de Button e Input.
* Feedback de loading, skeleton y toast.
* Reglas de accesibilidad.
* Onboarding sin tutoriales/tooltips/carruseles.
* EmptyState como guía implícita.
* Adaptación por rol como criterio UX.
* Captura conceptual de preferencias de usuario durante onboarding.

### Funcionalidades MOCK

No se encontraron funcionalidades MOCK para AUTH u ONBOARDING.

### Funcionalidades POST_MVP

No se encontró información POST_MVP explícita para AUTH u ONBOARDING dentro del alcance permitido de este fragment.

---

## 2. Clasificación para implementación

### REAL

#### AUTH

Implementable desde este documento únicamente como UI transversal mínima:

* Usar `Button` para acciones principales/secundarias de pantallas de autenticación si esas pantallas existen en otro documento.
* Usar `Input` con label visible y `accessibilityLabel` obligatorio.
* Usar estados visuales de error en input para validaciones visuales.
* Usar loading en botones con spinner si la operación supera 300 ms.
* Mantener loading mínimo 400 ms para evitar flicker.
* Usar Toast superior para feedback no intrusivo.
* Usar Skeleton si la carga supera 300 ms.
* No usar modal centrado para formularios.
* Usar modal centrado solo para consecuencias o cierre de formulario con cambios sin guardar.
* Soportar modos `normal` y `senior` desde ThemeProvider.

No implementable desde este documento:

* Register funcional.
* Login funcional.
* Refresh Token.
* Logout.
* Sesiones.
* Tokens.
* Endpoints.

#### ONBOARDING

Implementable desde este documento como reglas UX mínimas:

* Onboarding adaptado por rol.
* Captura conceptual de preferencias: nombre, rol, horario, medicación y contacto emergencia.
* Destino conceptual de preferencias: Cuenta.
* No usar tooltips.
* No usar carruseles de features.
* No usar videos de onboarding.
* Usar empty states como guía implícita.
* Diseñar para llegar a primer valor visible en 60 segundos.
* Adaptación por rol como jerarquía distinta de información, no solo filtro visual.
* Soportar variante Senior con tamaños, contraste y touch targets mayores.

### MOCK

No se encontró información MOCK para AUTH u ONBOARDING en este documento.

### POST_MVP

No se encontró información POST_MVP explícita para AUTH u ONBOARDING dentro del alcance permitido.

### IGNORAR

No se incluye contenido fuera del alcance de este fragment.

---

## 3. Información faltante

| Área | Información faltante | Por qué importa | Impacto en implementación |
| ---- | -------------------- | --------------- | ------------------------- |
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
| Eventos del sistema | No hay eventos `auth.*` ni onboarding técnico. | Útil para auditoría, notificaciones o tracking. | No inventar eventos. |
| Estados | No hay estados de sesión, registro, token u onboarding. | Necesarios para UI/logic. | Solo usar estados visuales del Design System. |
| Errores | No hay errores de credenciales, duplicado, token expirado ni sesión inválida. | Necesarios para UX/API. | Debe definirse en otra fuente. |
| Seguridad | No hay RLS, single-use tokens, refresh rotation ni privacidad auth. | Crítico para implementación. | No implementar desde este fragment. |

### Contradicciones detectadas

No se detectan contradicciones internas específicas de AUTH u ONBOARDING. El riesgo principal es insuficiencia: el documento es un Design System y no una especificación funcional de autenticación.

### Dudas y dependencias no definidas

* No queda definido si `Cuenta` corresponde a `Account`, `User` o perfil de usuario.
* No queda definido cómo se persisten las preferencias de onboarding.
* No queda definido qué rol puede invitar durante onboarding.
* No queda definido si la selección de rol ocurre durante Register, después de Register o al aceptar invitación.
* No queda definido si el hogar se crea antes, durante o después del registro.
* No queda definido si Adulto Mayor/Senior modifica solo la UI o también los pasos del onboarding.

---

## 4. Fuente

* Archivo: `HomePlus — Desing system v1(1).md`
  * Sección: `4.1 Botones`
  * Sección: `4.4 Input Fields`
  * Sección: `4.11 Modal y Bottom Sheet`
  * Sección: `4.13 Toast / Snackbar`
  * Sección: `4.15 Empty State`
  * Sección: `4.16 Skeleton / Loading`
  * Sección: `6.6 Lo que NUNCA aparece en HomePlus`
  * Sección: `7. IMPLEMENTACIÓN RECOMENDADA`
  * Sección: `8. LISTA DE VERIFICACIÓN DE IMPLEMENTACIÓN`

* Archivo: `Design system v1(1).txt`
  * Sección: `OUTPUT 1 — ENTITIES`
  * Sección: `OUTPUT 2 — RELATIONSHIPS`
  * Sección: `OUTPUT 4 — DATA FLOWS`
  * Sección: `OUTPUT 5 — BUSINESS RULES`
  * Sección: `OUTPUT 6 — ARCHITECTURAL DECISIONS`

* Archivo: `source_map_HomePlus_Design_System_V2.md`
  * Sección: `4.1 AUTH`
  * Sección: `4.2 ONBOARDING`
  * Sección: `5. Mapa de entidades`
  * Sección: `7. Mapa de estados`
  * Sección: `8. Mapa de permisos`
  * Sección: `9. Mapa de flujos`
  * Sección: `10. Mapa de APIs`
  * Sección: `11. Mapa de UI`
  * Sección: `18. Información faltante`
  * Sección: `19. Recomendación de fragments a generar`
