# frontend_navigation_shell_v1.md

## 0. Propósito del documento

Este documento define la **navegación premium final de HomePlus para el MVP**.

Su objetivo es que Antigravity/Codex pueda implementar un shell de navegación consistente, simple, familiar y visualmente premium sin rediseñar cada pantalla ni tocar backend.

Este documento usa como base:

- `frontend_all_extractions_master.md`;
- `frontend_premium_extraction_index.md`;
- `frontend_premium_design_system_v1.md`.

No define implementación técnica de backend, contratos API, estructura de base de datos ni layouts finales de Home, Planner o Familia. Define solamente la arquitectura de navegación, reglas visuales del shell, comportamiento de tabs, headers, quick actions, sheets, deep navigation y estados globales.

---

## 1. Principio central de navegación

La navegación de HomePlus debe sentirse como un **centro operativo familiar**, no como un dashboard empresarial ni una app saturada de módulos.

Principio rector:

> HomePlus navega por frecuencia de uso, no por cantidad de features.

Traducción práctica:

- lo diario vive en tabs principales;
- lo contextual vive en `+` / Quick Actions;
- lo ocasional vive en More;
- lo inteligente/Geni aparece como capa transversal, no como tab;
- Home siempre es el punto de regreso;
- los módulos administran, Home resume;
- la navegación debe permitir demostrar colaboración real sin exponer todo el producto como si estuviera completo.

La app debe sentirse:

- iOS premium;
- simple;
- cálida;
- rápida;
- familiar;
- con pocas decisiones visibles;
- con acciones importantes a 1–2 taps;
- sin menús técnicos;
- sin pestañas de módulos mock.

---

## 2. Decisión final sobre la estructura actual

### 2.1 Decisión

**Mantener la estructura V1 actual:**

`Home | Familia/People | + | Planner | More/Profile`

Esta estructura aparece repetida como navegación V1 congelada en el master y es la más compatible con el MVP.

No se recomienda reemplazarla por:

- tab dedicado para Geni;
- tab dedicado para Finance;
- tab dedicado para Inventory;
- tab dedicado para Profile;
- navegación tipo dashboard con muchas secciones;
- sidebar desktop para MVP;
- Home configurable por usuario.

### 2.2 Ajuste recomendado de naming

La arquitectura interna puede conservar nombres técnicos en inglés, pero la UI del MVP debería sentirse familiar y local.

| Tab visual MVP | Route interna sugerida | Rol |
|---|---|---|
| Home | `HomeTab` | Centro operativo y resumen. |
| Familia | `PeopleTab` | Miembros, invitaciones, solicitudes y coordinación humana básica. |
| + | `AddTab` / `QuickActions` | Acciones rápidas globales. No es pantalla normal. |
| Planner | `PlannerTab` | Tareas y eventos reales mínimos. |
| Más | `MoreTab` | Perfil, Settings y módulos demo premium. |

### 2.3 Por qué no cambiarla

La estructura resuelve bien el MVP porque:

- Home queda como entrada obligatoria;
- Planner queda visible para la demo real de tareas/eventos;
- Familia queda visible para la demo multiusuario/invitaciones;
- `+` permite crear tarea/evento sin saturar headers;
- More aloja módulos mock sin prometer que son core real;
- Profile puede vivir en avatar/header y dentro de More sin gastar un tab.

### 2.4 Regla de estabilidad

La Bottom Tab V1 es una decisión de producto, no un detalle visual.

No cambiar los tabs para resolver problemas puntuales de una pantalla. Si algo no entra:

1. primero intentar Quick Actions;
2. luego More;
3. luego una pantalla secundaria;
4. nunca agregar un sexto tab para MVP.

---

## 3. Estructura global de navegación

La app se organiza en cuatro capas:

1. **Boot / sesión inicial**
2. **Auth stack**
3. **Post-auth gate stack**
4. **Private shell**

### 3.1 Boot / sesión inicial

Pantalla o estado inicial que decide si el usuario entra a Auth, a creación/unión de hogar o a la app privada.

Responsabilidades:

- verificar sesión local;
- obtener usuario actual si existe sesión;
- resolver estado de navegación inicial;
- mostrar loading inicial premium;
- evitar parpadeos entre Login y Home;
- manejar backend inaccesible de forma clara.

Reglas:

- no mostrar Bottom Tabs durante boot;
- no mostrar Login si ya hay sesión válida y `/me` todavía está cargando;
- si el backend no responde, mostrar estado de recuperación, no pantalla rota;
- si la sesión expiró, enviar a estado de sesión vencida.

### 3.2 Auth stack

El Auth stack aparece cuando no hay sesión válida o cuando el usuario debe volver a autenticarse.

Pantallas permitidas:

| Pantalla | Uso | Bottom Tabs |
|---|---|---|
| Splash/Welcome | Entrada visual o transición corta. | No |
| Login | Iniciar sesión. | No |
| Register | Crear cuenta. | No |
| Forgot Password | Recuperación. | No |
| Check Email / Verify Email | Confirmación de email si aplica. | No |
| Session Expired | Sesión vencida con acción de volver a entrar. | No |

Reglas Auth:

- Auth no usa Bottom Nav.
- Auth puede usar `AppHeader` simple o branding superior.
- Auth prioriza inputs legibles, CTA primario y copy humano.
- Auth no debe mezclar creación de hogar dentro del formulario de registro.
- Registro exitoso no crea hogar automáticamente.
- Después de login/register, la navegación se decide por el estado del usuario actual.

### 3.3 Post-auth gate stack

Es el conjunto de pantallas privadas previas al Home cuando el usuario ya está autenticado pero todavía no puede entrar al hogar activo.

Pantallas permitidas:

| Pantalla | Cuándo aparece | Bottom Tabs |
|---|---|---|
| Create Household | Usuario autenticado sin hogar activo. | No |
| Join Household | Usuario autenticado sin hogar activo o invitado por link. | No |
| Pending Approval | Usuario pidió unirse y espera aprobación. | No |
| Household Onboarding | Usuario activo pero falta onboarding mínimo. | No, salvo decisión explícita posterior |

Reglas:

- Estas pantallas son privadas, pero no pertenecen al shell principal.
- No mostrar tabs hasta que haya hogar activo y navegación `home` habilitada.
- No usar More/Profile para resolver falta de hogar.
- El usuario debe poder cerrar sesión desde estas pantallas.
- El copy debe explicar el estado sin culpar al usuario.

### 3.4 Private shell

Es la app principal luego de tener sesión válida y hogar activo.

Incluye:

- Root Tabs;
- headers por tab;
- Quick Actions Sheet;
- bottom sheets de creación/edición;
- modales de confirmación;
- pantallas de detalle livianas;
- estados globales de sesión/offline.

Root Tabs:

`HomeTab` → `PeopleTab` → `QuickActions` → `PlannerTab` → `MoreTab`

Reglas:

- Home debe ser la pantalla inicial.
- Cambiar de tab no debe resetear datos innecesariamente.
- Las tabs principales deben conservar estado cuando sea útil.
- Quick Actions no crea historial de tab como pantalla normal.
- El shell debe respetar safe area y padding inferior del Design System.

---

## 4. Home Tabs del MVP

### 4.1 Tab 1 — Home

Rol:

- centro operativo;
- resumen accionable;
- punto de regreso;
- primera pantalla privada.

Home no debe administrar información profunda. Toda card o bloque debe navegar al módulo dueño.

Header recomendado:

- saludo breve o título `Home`;
- subtítulo contextual del hogar;
- avatar/perfil a la derecha;
- selector de hogar solo si hay 2+ hogares reales;
- no más de una acción contextual.

No incluir en Home header:

- buscador global si no existe búsqueda real;
- botón de crear tarea si ya existe `+`;
- múltiples iconos;
- métricas de demo saturadas.

### 4.2 Tab 2 — Familia / People

Rol:

- miembros del hogar;
- invitaciones;
- solicitudes pendientes;
- roles visibles;
- coordinación humana básica.

Label recomendado para UI en español:

`Familia`

Nombre técnico aceptable:

`People`

Header recomendado:

- título `Familia`;
- subtítulo con cantidad de miembros o estado del hogar;
- acción secundaria: invitar, solo si corresponde por rol;
- aprobación de solicitudes como bloque/card, no necesariamente icono persistente.

No incluir aquí:

- feed social completo como core real;
- Presence GPS real;
- perfil individual complejo;
- permisos finos post-MVP.

### 4.3 Tab central — Add / Quick Actions

Rol:

- acción rápida global;
- creación de tareas/eventos;
- acceso visual a Geni demo;
- acciones frecuentes y contextuales.

No es una tab de contenido. Tocar `+` abre un sheet, no cambia a una pantalla raíz.

Label accesible:

`Agregar`

Label visual:

- puede ser solo `+` en el botón;
- puede mostrar micro-label `Agregar` si el diseño lo permite;
- siempre debe tener accessibility label.

### 4.4 Tab 4 — Planner

Rol:

- tareas reales;
- eventos reales;
- calendario mínimo;
- coordinación diaria operativa.

Header recomendado:

- título `Planner`;
- segmented control interno para `Tareas` y `Calendario` o `Eventos`;
- filtros mínimos como sheet, no como barra saturada;
- acción primaria puede ser omitida si `+` ya crea tarea/evento.

No incluir en navegación principal:

- Goals como tab propia;
- subtareas como navegación profunda por defecto;
- comentarios/adjuntos si son post-MVP;
- automatizaciones reales.

### 4.5 Tab 5 — More / Profile

Rol:

- acceso a perfil;
- Settings;
- módulos demo premium;
- herramientas de menor frecuencia.

Label recomendado para UI en español:

`Más`

Contenido sugerido de alto nivel:

1. Perfil / Cuenta.
2. Configuración del hogar.
3. Finance demo.
4. Inventory demo.
5. FamilyCloud demo.
6. Presence demo.
7. Geni demo / historial visual si existe.
8. Ayuda / Acerca de / Cerrar sesión.

Reglas:

- More no es dashboard.
- More no debe tener widgets extensos.
- More muestra accesos con indicadores rápidos opcionales.
- Profile no debe ser tab separada en MVP.
- Settings vive dentro de More.

---

## 5. Tab bar premium

### 5.1 Principio visual

La tab bar debe sentirse como una superficie flotante premium, cálida y liviana.

Debe usar el Design System:

- fondo glass en iOS cuando sea legible;
- fallback cálido/opaco en Android/Web;
- sombra floating suave;
- border sutil;
- radius alto;
- safe area correcta;
- active state terracota;
- texto oscuro cálido;
- sin rojo, sin badges agresivos.

### 5.2 Estructura visual

La tab bar contiene:

- 4 tabs normales;
- 1 botón central elevado `+`;
- icono por tab;
- label corto por tab;
- indicador activo sutil;
- área táctil cómoda.

Altura recomendada:

| Plataforma | Altura visible | Safe area | Padding contenido |
|---|---:|---:|---:|
| iOS | 64–72 | obligatorio | contenido con bottom inset 96 mínimo |
| Android | 64–72 | según dispositivo | contenido con bottom inset 96 mínimo |
| Web mobile | 64–72 | simulado | contenido con bottom inset 96 mínimo |
| Tablet | 68–76 | obligatorio | puede aumentar a 112 si hay FAB/sheet |

### 5.3 Glass / fallback

#### iOS

Usar glass moderado:

- fondo translúcido cálido;
- blur suave;
- borde superior sutil;
- sombra floating;
- legibilidad siempre prioritaria.

#### Android

Usar fallback:

- surface cálida opaca o semiopaca;
- border sutil;
- elevation moderada;
- no depender de blur nativo;
- evitar blur costoso en dispositivos lentos.

#### Web

Usar:

- surface cálida;
- box-shadow suave;
- backdrop blur solo si no afecta legibilidad;
- focus states visibles;
- hover opcional, nunca requerido.

### 5.4 Iconos

Los iconos deben ser simples, redondeados y consistentes.

Recomendación semántica:

| Tab | Icono sugerido | Regla |
|---|---|---|
| Home | casa / home rounded | No usar dashboard grid. |
| Familia | users / family | Evitar iconos corporativos de equipo. |
| + | plus | Botón circular, no tab icon normal. |
| Planner | calendar-check / checklist | Debe comunicar tareas + eventos. |
| Más | grid / user-circle / dots | Puede combinar perfil y herramientas. |

Reglas:

- Todos los iconos normales deben tener mismo stroke/peso visual.
- No mezclar estilos filled/outline sin intención.
- Active puede usar filled suave o stroke terracota.
- Inactive usa texto/ícono muted.
- El `+` siempre tiene jerarquía visual mayor.

### 5.5 Labels

Labels recomendados:

- Home
- Familia
- Agregar / solo accesible en `+`
- Planner
- Más

Reglas:

- máximo 8–10 caracteres visibles por label;
- no usar labels técnicos largos;
- no usar `People` en UI final en español si el resto está localizado;
- no usar `Profile` como label si el tab también aloja módulos;
- no ocultar labels de tabs normales en Senior mode.

### 5.6 Active state

Active state recomendado:

- icono terracota;
- label terracota o text primary;
- fondo pill muy suave detrás del icono o indicador inferior corto;
- transición 160–240ms;
- haptic `selection` al cambiar tab.

No usar:

- rojo para active;
- badges grandes;
- subrayados gruesos;
- animación tipo bounce exagerado;
- color distinto por cada tab;
- active state que cambie layout.

### 5.7 Badges en tab bar

Permitidos solo si aportan acción real.

Reglas:

- máximo 1 badge visible en toda la tab bar en condiciones normales;
- si hay solicitudes pendientes, badge en Familia;
- si hay tareas vencidas reales, badge sutil en Planner;
- no badgear módulos mock;
- no usar número si no es confiable;
- no usar badge rojo salvo error crítico real;
- preferir punto terracota/ámbar sobre contador.

### 5.8 Safe area

Reglas obligatorias:

- tab bar nunca pisa el home indicator;
- contenido scrolleable debe tener padding bottom suficiente;
- sheets deben aparecer por encima de tab bar o cubrirla con overlay, nunca quedar mezcladas;
- toast no debe tapar tabs críticas;
- en Android con navegación gestual, respetar insets reales si están disponibles.

### 5.9 Comportamiento iOS

- Glass permitido si legible.
- Haptics recomendados: `selection` en tab, `light` en `+`.
- Gestos de cierre en sheets permitidos.
- Safe area obligatoria.
- Transición suave entre tabs.
- No usar back button visible en tab roots.

### 5.10 Comportamiento Android

- Fallback opaco/translúcido para tab bar.
- Elevation moderada.
- System back debe cerrar sheet primero.
- Si no hay sheet y se está en una tab distinta de Home, back vuelve a Home.
- Si se está en Home root, back puede salir de la app según comportamiento nativo.
- Haptics no son garantía; feedback visual debe ser suficiente.

### 5.11 Comportamiento Web

- MVP web, si existe, mantiene bottom nav en ancho mobile.
- En ancho amplio, usar contenedor centrado o layout tablet; no introducir sidebar MVP.
- Focus visible en tabs y botones.
- Hover puede mejorar, pero no reemplaza active/focus.
- Quick Actions debe abrir como sheet/panel responsive, no como menú tiny.

---

## 6. Botón central `+` / AddTab

### 6.1 Rol

El `+` es el acceso principal a acciones rápidas y contextuales.

No es:

- una pantalla;
- una tab persistente;
- un dashboard;
- un menú de todos los módulos;
- un reemplazo de More.

### 6.2 Comportamiento

Al tocar `+`:

1. emitir haptic `light` o `selection` si plataforma soporta;
2. abrir `Quick Actions Sheet` desde abajo;
3. aplicar overlay suave;
4. mantener el contexto actual detrás;
5. no cambiar tab activa;
6. cerrar con gesto, tap fuera o botón cerrar;
7. volver al mismo lugar si se cancela.

### 6.3 Visual

El botón debe:

- estar centrado visualmente en la tab bar;
- sobresalir levemente de la superficie;
- tener shape circular o squircle premium;
- usar terracota como color principal;
- usar icono `+` blanco/crema;
- tener sombra floating suave;
- respetar área táctil mínima de 44×44;
- no parecer botón de emergencia.

### 6.4 Estados

| Estado | Visual | Acción |
|---|---|---|
| Default | Terracota, sombra suave | Abre Quick Actions. |
| Pressed | Scale 0.98, sombra menor | Mantiene respuesta <100ms. |
| Disabled | No recomendado | Solo si app no tiene hogar activo o está bloqueada. |
| Loading | Evitar | Si una acción carga, mostrar loading dentro del sheet, no en el botón. |

### 6.5 Feedback

- Tap: scale 0.98 y haptic light.
- Sheet open: transición 280–320ms.
- Action selected: haptic según acción.
- Success: toast + haptic success.
- Error: toast/error inline + haptic warning.

---

## 7. Quick Actions Sheet

### 7.1 Principio

Quick Actions debe responder a la pregunta:

> “¿Qué puedo hacer ahora, desde cualquier lugar, sin navegar?”

No debe responder:

> “¿Qué features existen en HomePlus?”

### 7.2 Estructura visual

El sheet debe usar `AppBottomSheet` + `GlassSurface` si la plataforma lo permite.

Estructura recomendada:

1. handle superior;
2. título breve: `Acciones rápidas`;
3. Geni fijo como card/action destacada;
4. acciones reales principales;
5. acciones mock/demo premium separadas visualmente;
6. próximos estados o sugerencias pequeñas;
7. cerrar/cancelar implícito por gesto o botón.

Altura:

- contenido simple: 45–55%;
- con muchas acciones: hasta 75%;
- nunca full screen para acciones rápidas salvo accesibilidad/Senior.

### 7.3 Orden recomendado

Orden final del MVP:

| Orden | Acción | Tipo | Destino |
|---:|---|---|---|
| 1 | Geni | Mock premium / visual | Geni demo o sugerencias rápidas. |
| 2 | Crear tarea | Real MVP | Create Task Sheet. |
| 3 | Crear evento | Real MVP | Create Event Sheet. |
| 4 | Invitar familiar | Real MVP si household invite UI está lista | Invite Link Sheet. |
| 5 | Solicitudes pendientes | Real MVP condicional para coordinator | Familia / requests. |
| 6 | Agregar gasto | Mock premium | Finance demo. |
| 7 | Agregar item | Mock premium | Inventory demo. |
| 8 | Check-in / estado | Mock premium | Presence demo. |
| 9 | Subir documento | Mock premium / post-MVP | FamilyCloud demo. |

### 7.4 Acciones reales

Para MVP, solo deben tratarse como reales si tienen flujo funcional conectado:

- Crear tarea.
- Crear evento.
- Invitar familiar / compartir link.
- Ver solicitudes pendientes.
- Completar tarea no vive en Quick Actions; se hace desde lista/card.

Reglas:

- acciones reales van arriba;
- deben funcionar sin simular;
- si fallan, mostrar error claro;
- deben refrescar datos del módulo correspondiente;
- deben ser demostrables entre dispositivos cuando aplique.

### 7.5 Acciones mock

Acciones mock permitidas:

- Preguntar a Geni / abrir Geni demo.
- Agregar gasto.
- Agregar item de inventario.
- Check-in Presence.
- Subir documento.
- Automatización sugerida.

Reglas:

- se pueden abrir como demo visual;
- no deben parecer datos críticos reales;
- no deben interferir con la demo real de tareas/eventos;
- deben estar debajo o visualmente separadas;
- no usar labels como “falso” o “fake”; usar “Vista demo” si hace falta.

### 7.6 Estados próximos

El sheet puede mostrar una sección pequeña de “Sugerido” o “Próximo” si no satura.

Ejemplos:

- “Crear tarea de compras”.
- “Revisar evento de mañana”.
- “Geni puede ayudarte a ordenar la semana”.

Reglas:

- máximo 2 sugerencias visibles;
- no mostrar IA real si no existe;
- si una sugerencia es mock, no debe guardar cambios reales;
- no convertir el sheet en Home alternativo.

### 7.7 Visual de acciones

Cada acción debe ser un `ActionPill` o fila compacta premium:

- icono suave;
- título corto;
- subtítulo opcional de una línea;
- estado opcional `Demo`, `Nuevo`, `Pendiente`;
- área táctil cómoda;
- sin metadata larga.

No usar:

- cards enormes para cada acción;
- grid de 12 iconos;
- emojis como sistema principal;
- chips con textos largos;
- más de 8–9 acciones visibles sin scroll.

---

## 8. Header system

### 8.1 Principio

El header debe orientar, no competir con el contenido.

Regla:

> Un header de HomePlus puede tener título, contexto y una acción. Si necesita más, la pantalla está intentando resolver demasiado desde arriba.

Usar `AppHeader` del Design System.

### 8.2 Variantes permitidas

| Variante | Uso |
|---|---|
| Large | Home, pantallas principales con scroll inicial. |
| Compact | Planner, Familia, More, detalles. |
| Glass | Header flotante/contextual sobre scroll o superficies premium. |
| Auth | Logo/título + copy, sin navegación principal. |

### 8.3 Header Home

Debe incluir:

- título/saludo corto;
- contexto del hogar;
- avatar a la derecha;
- selector de hogar solo si hay 2+ hogares reales;
- posible indicador de estado backend/offline si afecta toda la app.

No debe incluir:

- botón `+` duplicado;
- buscador global si no existe;
- tres acciones;
- dropdowns complejos;
- métricas demo.

### 8.4 Header Planner

Debe incluir:

- título `Planner`;
- segmented control interno para `Tareas` / `Calendario` si aplica;
- filtro como acción secundaria o sheet;
- no más de una acción visible.

Reglas:

- crear tarea/evento preferentemente desde `+` o CTA contextual dentro de Planner;
- no duplicar create en header, empty state y footer a la vez;
- deep links pueden abrir Planner con segmento preseleccionado.

### 8.5 Header Familia

Debe incluir:

- título `Familia`;
- subtítulo con miembros/estado;
- acción `Invitar` si corresponde;
- solicitudes pendientes como card/section o badge sutil.

No debe incluir:

- feed completo en header;
- Presence GPS;
- controles de roles avanzados permanentes.

### 8.6 Header Perfil / More

More puede usar:

- header compacto `Más`;
- card superior de perfil;
- avatar/nombre;
- acceso a editar perfil;
- settings como primera sección.

Reglas:

- Profile no debe ocupar tab separada;
- logout no debe ser acción principal arriba;
- cerrar sesión debe requerir confirmación.

### 8.7 Header Auth

Debe ser más emocional y simple:

- logo/nombre HomePlus;
- título claro;
- subtítulo humano;
- sin Bottom Nav;
- sin selector de hogar;
- sin acciones múltiples.

---

## 9. Back behavior

### 9.1 Regla general

La navegación debe sentirse predecible:

1. cerrar overlay/sheet primero;
2. volver dentro del stack actual;
3. volver a tab raíz;
4. volver a Home;
5. salir de la app solo desde Home root.

### 9.2 iOS

- Usar back button visible en pantallas apiladas.
- No mostrar back en raíces de tabs.
- Sheets se cierran con gesto y botón si corresponde.
- Si hay cambios sin guardar, confirmar antes de cerrar.

### 9.3 Android

System back debe seguir este orden:

1. si hay bottom sheet abierto, cerrarlo;
2. si hay modal abierto, cerrarlo o confirmar;
3. si hay pantalla de detalle, volver;
4. si está en tab distinta de Home, cambiar a Home;
5. si está en Home root, permitir salida según nativo.

### 9.4 Web

- Browser back debe cerrar panel/sheet si fue abierto como estado navegable.
- Si no se modela como historial, al menos no debe romper el shell.
- Focus debe volver al elemento que abrió el sheet cuando se cierra.

### 9.5 Cambios sin guardar

Aplica a:

- crear tarea;
- editar tarea;
- crear evento;
- editar evento;
- invitar/configurar miembro;
- editar perfil/settings.

Regla:

- si el usuario escribió algo, cerrar sheet/modal debe pedir confirmación suave;
- si no escribió nada, cerrar sin fricción;
- nunca perder input silenciosamente.

---

## 10. Deep navigation

### 10.1 Principio

Deep navigation debe llevar al usuario al contexto correcto sin romper el modelo de tabs.

Regla:

> Un deep link hacia un dato operativo debe activar el tab dueño antes de abrir detalle o sheet.

### 10.2 Abrir Planner en tab específica

Casos:

- Home card de tareas → Planner con segmento `Tareas`.
- Home card de eventos → Planner con segmento `Calendario/Eventos`.
- Notificación de tarea → Planner/Tareas + detalle o focus.
- Notificación de evento → Planner/Calendario + detalle o focus.

Reglas:

- actualizar active tab a Planner;
- preseleccionar segmento correcto;
- si hay item específico, hacer focus visual breve;
- si el item no existe, mostrar error state y permitir volver.

### 10.3 Abrir crear tarea

Desde:

- `+` Quick Actions;
- empty state de Planner;
- card de Home si no hay tareas;
- sugerencia de Geni demo si está habilitada.

Comportamiento recomendado:

- abrir Create Task Sheet;
- no navegar a pantalla full si el formulario es simple;
- al guardar, cerrar sheet;
- mostrar toast success;
- refrescar Planner y Home;
- si el usuario estaba en Home, puede permanecer en Home con card actualizada;
- ofrecer acción secundaria `Ver en Planner` en toast si se implementa.

### 10.4 Abrir crear evento

Desde:

- `+` Quick Actions;
- Planner/Calendario empty state;
- Home próximos eventos empty state.

Comportamiento:

- abrir Create Event Sheet;
- al guardar, cerrar sheet;
- refrescar Home y Planner;
- si el usuario estaba en Planner/Calendar, mantener ese contexto;
- si estaba en Home, volver a Home con refetch y feedback.

### 10.5 Volver a Home con refetch

Casos donde debe ocurrir:

- después de crear hogar;
- después de aceptar/aprobar miembro si cambia el estado del hogar;
- después de crear tarea desde Home;
- después de crear evento desde Home;
- después de completar tarea desde Home;
- después de logout/login de otro usuario;
- después de sesión recuperada.

Reglas:

- no hacer reload visual brusco;
- usar refetch silencioso si ya hay datos;
- mostrar skeleton solo si no hay contenido previo;
- si falla refetch, conservar último estado visible y mostrar warning suave.

### 10.6 Deep navigation desde módulos mock

Si un módulo mock abre una pantalla demo:

- debe vivir dentro de More o como modal demo;
- no debe crear una nueva tab;
- no debe bloquear la navegación real;
- volver debe regresar al origen;
- no debe disparar refetch real salvo que toque datos reales.

---

## 11. Modales y bottom sheets

### 11.1 Regla general

HomePlus debe preferir bottom sheets para creación/edición ligera y modales centrados para confirmaciones críticas.

### 11.2 Bottom sheets permitidos

| Sheet | Uso | Tipo |
|---|---|---|
| Quick Actions Sheet | Acciones rápidas globales. | Global |
| Create Task Sheet | Crear tarea real. | Real MVP |
| Create Event Sheet | Crear evento real. | Real MVP |
| Invite Link Sheet | Compartir invitación. | Real MVP si existe UI |
| Member Approval Sheet | Aprobar/rechazar solicitud. | Real MVP si existe UI |
| Filter Sheet | Filtros Planner/Familia. | Real MVP |
| Geni Demo Sheet | Sugerencias/briefing visual. | Mock premium |
| Demo Module Quick Sheet | Acciones mock. | Mock premium |

Reglas:

- no usar sheets anidados;
- no meter navegación profunda dentro de un sheet;
- un sheet debe tener título claro;
- formularios medianos pueden ocupar hasta 75–90%;
- si se vuelve demasiado largo, convertirlo en pantalla secundaria.

### 11.3 Modales permitidos

| Modal | Uso |
|---|---|
| Confirm Logout | Cerrar sesión. |
| Confirm Destructive | Eliminar/cancelar/rechazar. |
| Session Expired | Bloqueo por sesión vencida si no se usa pantalla dedicada. |
| Critical Error | Error global irrecuperable. |

Reglas:

- modal centrado solo para decisiones que requieren pausa;
- no usar modal para formularios comunes;
- no usar modal para Quick Actions;
- no usar modal para feedback que puede ser toast.

### 11.4 Overlay

- overlay cálido oscuro con opacidad moderada;
- no usar negro puro agresivo;
- tap fuera cierra solo si no hay cambios sin guardar;
- el contenido detrás no debe ser interactivo.

---

## 12. Estados globales de navegación

### 12.1 Loading inicial

Objetivo:

- evitar flicker;
- comunicar que la app está abriendo;
- no parecer congelada.

Visual recomendado:

- fondo crema;
- logo/nombre pequeño o skeleton de shell;
- mensaje corto si tarda más de lo normal;
- spinner mínimo solo si hace falta;
- no mostrar tabs vacías.

Estados:

| Estado | UI |
|---|---|
| Sesión local verificando | Splash/loading premium. |
| `/me` cargando | Skeleton shell o loader suave. |
| Datos privados cargando | Home skeleton si no hay cache; refetch silencioso si hay cache. |
| Demora | Texto humano: “Preparando tu hogar…” |

### 12.2 Offline / backend inaccesible

Diferenciar:

- sin internet del dispositivo;
- backend inaccesible;
- sesión inválida;
- error de permisos.

UI recomendada:

- banner sutil global si la app ya tiene datos;
- full error state solo si no hay datos para mostrar;
- acción `Reintentar`;
- copy no técnico;
- no cerrar sesión automáticamente por un error de red.

Reglas:

- si Home tenía datos, mantenerlos visibles con estado desactualizado;
- si no hay datos, mostrar ErrorState cálido;
- no romper tab bar;
- no mostrar stack trace ni códigos técnicos al usuario.

### 12.3 Sesión vencida

Cuando la sesión vence:

- cerrar sheets abiertos;
- mostrar `Session Expired` o modal bloqueante;
- explicar con tono claro;
- CTA primario: `Volver a iniciar sesión`;
- no perder contexto si puede recuperarse;
- no mostrar datos privados después de confirmar sesión inválida.

Copy recomendado:

- “Tu sesión venció. Volvé a iniciar sesión para seguir usando HomePlus.”

No usar:

- “token inválido”;
- “401”;
- “auth error”.

### 12.4 Usuario sin hogar

Si el usuario está autenticado pero sin hogar activo:

- no mostrar tabs;
- mostrar gate Create/Join Household;
- permitir crear hogar o unirse por invitación;
- permitir logout;
- copy orientado a primer valor.

### 12.5 Usuario pendiente de aprobación

Si el usuario pidió unirse y espera aprobación:

- mostrar pantalla dedicada;
- no mostrar Home vacío;
- explicar que el coordinador debe aprobar;
- permitir actualizar estado;
- permitir salir o probar crear otro hogar solo si el producto lo permite.

### 12.6 Error de permisos

Si el usuario intenta abrir algo sin permiso:

- mostrar ErrorState inline o pantalla liviana;
- CTA para volver al módulo dueño;
- no redirigir silenciosamente sin explicación;
- no exponer información privada.

---

## 13. Reglas para no saturar navegación

### 13.1 Reglas duras

- Máximo 5 slots en tab bar incluyendo `+`.
- `+` no cuenta como pantalla raíz.
- No agregar tabs por features mock.
- No agregar tabs por presión visual de demo.
- No duplicar acciones en header, card y footer al mismo tiempo.
- No meter módulos secundarios en Home tabs.
- No usar más de un badge normal en tab bar.
- No mostrar estados técnicos en labels.
- No usar labels de más de una palabra salvo excepción.

### 13.2 Profundidad

Objetivo:

- 95% de acciones frecuentes en 3 niveles o menos.
- Más de 4 niveles es fallo de navegación.

Ejemplos correctos:

- Home → Card de tareas → Planner/Tareas.
- `+` → Crear tarea → Guardar.
- Familia → Solicitud pendiente → Aprobar.
- More → Finance demo.

Ejemplos incorrectos:

- Home → More → Tools → Productivity → Tasks.
- Planner → Menú → Crear → Tipo → Form → Confirm.
- Familia → Settings → Members → Requests → User → Approve.

### 13.3 Reglas de badges

- Badge solo si pide atención real.
- No usar badge para decoración.
- No badgear Geni demo constantemente.
- No mostrar 99+.
- Preferir punto sutil cuando el número no es esencial.

### 13.4 Reglas de labels

- `Familia`, no `Gestión de miembros`.
- `Más`, no `Herramientas` si queda largo.
- `Planner` puede mantenerse porque es nombre de producto/módulo.
- `Agregar` debe existir para accesibilidad aunque visualmente sea `+`.

### 13.5 Reglas de mock

Los módulos mock pueden verse premium, pero la navegación debe revelar que son secundarios.

- Finance vive en More.
- Inventory vive en More.
- FamilyCloud vive en More.
- Presence vive en More o como resumen en Home, no tab.
- Geni vive en Quick Actions/Home briefing, no tab.
- SOS no debe ocupar tab en MVP.

---

## 14. Qué NO poner como tab

No crear tabs para:

| No tab | Dónde debe vivir |
|---|---|
| Geni | Quick Actions, Briefing, demo screen desde More si hace falta. |
| Finance | More + cards mock en Home. |
| Inventory | More + cards mock en Home si aplica. |
| Assets | More/demo. |
| FamilyCloud/HomeCloud | More/demo. |
| Presence | More/demo + resumen Home. |
| Feed | Familia o Home activity mock, no tab. |
| Goals | Planner sub-sección demo/post-MVP. |
| Search | Header/Quick Action post-MVP, no tab. |
| SOS | Gesture/panel especial demo, no tab. |
| Settings | More. |
| Profile | Avatar/Header + More. |
| Notifications | Header/bell post-MVP o inbox interno, no tab MVP. |
| Automations | More/Geni demo. |
| Calendar standalone | Dentro de Planner. |
| Tasks standalone | Dentro de Planner. |

Regla:

> Una feature que no es diaria, real y crítica para la demo no merece tab propia en MVP.

---

## 15. Reglas visuales de calidad del shell

### 15.1 El shell debe verse premium

Checklist visual:

- fondo crema global;
- tab bar flotante cálida;
- glass en iOS o fallback sólido elegante;
- `+` terracota con sombra suave;
- iconos consistentes;
- labels cortos;
- active state sutil;
- headers con aire;
- padding inferior correcto;
- no bordes negros;
- no rojo dominante;
- no tabs saturadas.

### 15.2 El shell debe sentirse rápido

- respuesta visual al tap <100ms;
- transición tabs 160–240ms;
- sheet 280–320ms;
- no bloquear tap por animación larga;
- skeleton si carga >300ms;
- refetch silencioso cuando hay datos previos.

### 15.3 El shell debe sentirse familiar

- labels humanos;
- copy no técnico;
- no usar términos como `membership`, `token`, `RPC`, `schema`;
- usar `Familia`, `Hogar`, `Invitar`, `Tareas`, `Eventos`;
- errores explicados como estados recuperables.

---

## 16. Accesibilidad

### 16.1 Reglas generales

- Todas las tabs deben tener accessibility label.
- El botón `+` debe anunciarse como `Agregar` o `Abrir acciones rápidas`.
- Active tab debe anunciar estado seleccionado.
- Focus debe volver al disparador al cerrar sheet/modal en Web.
- Contraste suficiente en glass.
- No depender solo de color para estados.
- Área táctil mínima de 44×44.
- Senior mode no debe ocultar labels.

### 16.2 Screen reader

Labels recomendados:

| Elemento | Accessibility label |
|---|---|
| Home tab | `Home, pestaña` |
| Familia tab | `Familia, pestaña` |
| Add button | `Abrir acciones rápidas` |
| Planner tab | `Planner, pestaña` |
| Más tab | `Más, pestaña` |
| Cerrar sheet | `Cerrar` |
| Back | `Volver` |

### 16.3 Reduced motion

Si reduced motion está activo:

- quitar transición animada de tabs;
- quitar scale decorativo;
- mantener feedback visual estático;
- mantener haptics solo si el sistema lo permite;
- no usar pulse en skeleton.

### 16.4 Contraste y legibilidad

- Texto sobre glass debe ser primary/secondary, no muted.
- Si el fondo compite, desactivar glass.
- Labels de tabs deben seguir siendo legibles en Senior mode.
- No usar microcopy en tab labels.

---

## 17. Performance

### 17.1 Reglas del shell

- Tab bar debe renderizar rápido y no depender de cálculos pesados.
- No recalcular badges con operaciones costosas en cada render.
- No montar todos los módulos demo pesados al inicio.
- Lazy load para pantallas de More/demo.
- Mantener Home/Planner/Familia optimizados porque son tabs reales.
- Blur debe tener fallback si afecta FPS.
- Animaciones no deben bloquear input.

### 17.2 Refetch

- Al volver a Home después de cambios reales, refetch silencioso.
- Si se crea tarea/evento, invalidar datos de Home y Planner.
- Si se aprueba miembro, invalidar Home y Familia.
- Si falla refetch, conservar datos previos.
- No hacer reload completo de app por cada acción.

### 17.3 Mock modules

- No cargar datasets mock enormes en boot.
- More puede cargar módulos demo bajo demanda.
- Cards mock de Home deben usar datos livianos.
- Geni demo no debe bloquear navegación.

---

## 18. Checklist de implementación

### 18.1 Arquitectura

- [ ] Existe Boot state antes de Auth/Private.
- [ ] Auth stack no muestra Bottom Tabs.
- [ ] Post-auth gate stack no muestra Bottom Tabs.
- [ ] Private shell usa Root Tabs.
- [ ] Home es tab inicial.
- [ ] Tabs finales: Home, Familia/People, +, Planner, Más/More.
- [ ] `+` abre sheet y no navega a pantalla raíz.
- [ ] More contiene Profile/Settings/módulos demo.
- [ ] Geni no tiene tab propia.

### 18.2 Tab bar

- [ ] Usa superficie glass/fallback según plataforma.
- [ ] Respeta safe area.
- [ ] Tiene padding bottom suficiente en pantallas.
- [ ] Active state usa terracota sutil.
- [ ] Iconos consistentes.
- [ ] Labels cortos.
- [ ] Botón `+` tiene haptic/feedback.
- [ ] No hay más de un badge normal.
- [ ] Badge no aparece en módulos mock.

### 18.3 Quick Actions

- [ ] Sheet abre desde `+`.
- [ ] Geni aparece como acción destacada/mock.
- [ ] Crear tarea es acción real si está implementada.
- [ ] Crear evento es acción real si está implementada.
- [ ] Invitar familiar aparece si el usuario tiene hogar/permiso.
- [ ] Acciones mock están separadas visualmente.
- [ ] Sheet no supera cantidad razonable de acciones.
- [ ] Cierre respeta cambios sin guardar.

### 18.4 Headers

- [ ] Home header tiene título/contexto/avatar.
- [ ] Planner header no duplica `+` innecesariamente.
- [ ] Familia header muestra invitar o solicitudes sin saturar.
- [ ] More header incluye perfil como card/sección.
- [ ] Auth header no muestra tabs.
- [ ] No hay headers con más de una acción primaria.

### 18.5 Back/deep navigation

- [ ] Android back cierra sheets primero.
- [ ] Android back vuelve a Home desde otras tabs.
- [ ] iOS no muestra back en tab roots.
- [ ] Deep link a tarea abre Planner/Tareas.
- [ ] Deep link a evento abre Planner/Calendario.
- [ ] Crear tarea/evento refresca Home y Planner.
- [ ] Volver a Home tras cambios reales no hace reload brusco.

### 18.6 Estados

- [ ] Loading inicial evita flicker.
- [ ] Backend inaccesible muestra estado recuperable.
- [ ] Sesión vencida lleva a auth sin exponer datos privados.
- [ ] Usuario sin hogar ve Create/Join gate.
- [ ] Usuario pendiente ve Pending Approval.
- [ ] Error de permisos no expone datos.

### 18.7 Accesibilidad/performance

- [ ] Todas las tabs tienen labels accesibles.
- [ ] `+` tiene label accesible.
- [ ] Reduced motion está contemplado.
- [ ] Focus vuelve al disparador en Web.
- [ ] Blur tiene fallback.
- [ ] Módulos demo no se cargan todos al boot.

---

## 19. Fases sugeridas para implementar Navigation Shell

### Fase 1 — Auditoría y estabilización del flujo actual

Objetivo:

- no romper Auth/Onboarding ya funcional;
- identificar rutas actuales;
- mapear pantallas a Auth, gate o Private shell;
- asegurar que `/me` decide correctamente.

Entregable:

- mapa real de navegación actual;
- tabs existentes preservadas;
- pantallas privadas/gate separadas.

### Fase 2 — Root Tabs premium

Objetivo:

- implementar tab bar final visual;
- aplicar Design System;
- mantener estructura `Home | Familia | + | Planner | Más`;
- resolver safe area y fallback por plataforma.

Entregable:

- tab bar premium lista;
- `+` visual, aún puede abrir sheet básico;
- active states y haptics.

### Fase 3 — Quick Actions Sheet

Objetivo:

- convertir `+` en sheet real;
- agregar acciones reales mínimas;
- separar acciones mock;
- conectar creación de tarea/evento si ya existe UI.

Entregable:

- sheet usable;
- acciones ordenadas;
- feedback/haptics;
- cierre seguro.

### Fase 4 — Headers por tab

Objetivo:

- unificar headers;
- eliminar acciones duplicadas;
- usar avatar/perfil correctamente;
- preparar Familia/Planner para deep navigation.

Entregable:

- Home header;
- Planner header;
- Familia header;
- More/Profile header;
- Auth header separado.

### Fase 5 — Deep navigation y refetch

Objetivo:

- abrir Planner en segmento correcto;
- crear tarea/evento desde `+`;
- volver/refrescar Home;
- manejar detalles y errores.

Entregable:

- flujo demo real más sólido;
- cambios visibles entre Home y Planner;
- navegación consistente.

### Fase 6 — Estados globales y polish

Objetivo:

- loading inicial premium;
- sesión vencida;
- backend inaccesible;
- pending approval;
- reduced motion;
- accesibilidad y performance.

Entregable:

- shell listo para demo;
- navegación sin flicker;
- estados recuperables.

---

## 20. Límites del Navigation Shell

Este documento no debe:

- definir Home en detalle;
- definir Planner en detalle;
- definir diseño completo de Familia;
- crear contratos API;
- modificar backend;
- inventar permisos finos;
- convertir módulos mock en reales;
- crear un sistema de Search real;
- crear IA real de Geni;
- diseñar desktop/sidebar para MVP;
- agregar tabs fuera de la estructura V1;
- resolver offline sync real;
- definir almacenamiento real de documentos;
- definir push notifications reales.

Regla final:

> El Navigation Shell debe sostener el MVP real y permitir demo premium, no prometer que todo HomePlus ya está implementado.

---

## 21. Resumen final operativo

La navegación final recomendada para HomePlus MVP es:

`Home | Familia | + | Planner | Más`

Con estas decisiones:

- Home es la entrada inicial y resumen operativo.
- Familia contiene miembros, invitaciones y solicitudes.
- `+` abre Quick Actions Sheet, no una pantalla.
- Planner contiene tareas y eventos reales.
- Más contiene perfil, settings y módulos demo premium.
- Geni no tiene tab, vive en Quick Actions/Briefing/demo.
- Finance, Inventory, FamilyCloud, Presence, Goals, Feed, Automations, Search y SOS no tienen tab propia.
- El shell debe ser mobile-first, glass/fallback, cálido, premium, accesible y rápido.
- La estructura actual debe mantenerse, con polish visual y naming más familiar.

NAVIGATION SHELL READY
