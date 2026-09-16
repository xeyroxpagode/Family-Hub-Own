# PLANNER fragment — HomePlus — Design System V2

> Fragment crudo de implementación visual/interactiva.
> Fuente única: documento principal `HomePlus — Desing system v1(1).md`, archivo de comprensión `Design system v1(1).txt` y `source_map_HomePlus_Design_System_V2.md` generado para este mismo documento.
> No fusionar con otros documentos.

---

## 1. Rol del módulo en la demo

* `Planner` aparece como módulo de navegación y como núcleo operativo del hogar.
* `Planner` agrupa internamente:
  * `Tasks`.
  * `Calendar`.
  * `Goals`.
* Para este fragment MVP visual/interactivo:
  * `Tasks` y `Calendar` son extraíbles para demo.
  * `Goals` aparece dentro de Planner, pero queda **POST_MVP / no desarrollar en este fragment**.
* `Responsabilidades` aparece como eje organizador interno de `Tasks`.
* `Tasks` aparece como gestión de tareas con dependencias, recurrencias, subtareas y verificación, pero varias de esas capacidades quedan **POST_MVP** para este fragment.
* `Calendar` aparece como gestión de eventos familiares y personales.
* Planner tiene lugar propio en la navegación principal: `Home | People | + | Planner | More`.
* Planner no vive en More.
* El módulo debe sentirse integrado al ecosistema porque Home muestra tareas/eventos y conduce al módulo que administra esa información.
* El documento aporta principalmente UI, navegación, componentes, feedback y reglas de interacción. No aporta contratos backend completos.

---

## 2. Información encontrada para las 7 condiciones MVP

### 2.1 Pantalla visualmente terminada

#### Navegación principal

* Bottom Navigation congelada V1:
  * `[Home] [People] [+] [Planner] [More]`.
* Planner usa ícono `📋` en Bottom Nav.
* Planner es visible para todos.
* Estado visual de tab:
  * activo: ícono filled, texto `prim-600`, peso `600`;
  * inactivo: ícono outline, texto `text-tertiary`, peso `400`.
* Badge sobre tab:
  * `badge sm` anclado top-right del ícono;
  * solo `success` o `alert` en Bottom Nav;
  * nunca `error` en Bottom Nav;
  * siempre texto + color, nunca solo color.
* Tap en tab activo:
  * scroll to top;
  * refresh de pantalla actual.

#### Navegación interna de Planner

* `TabBar` para subsecciones internas de dominio.
* Uso explícito:
  * `Planner: Tasks | Calendar | Goals`.
* Altura: `44px`.
* Indicador activo:
  * `3px prim-500`;
  * `radius-full`;
  * animado con slide.
* Tab activo:
  * `text prim-600`;
  * `weight 600`.
* Tab inactivo:
  * `text text-tertiary`;
  * `weight 400`.
* Máximo 5 tabs por dominio.
* `Goals` queda como tab presente en la estructura de diseño, pero **POST_MVP / no desarrollar lógica**.

#### Estructura de archivos/rutas detectada

* `app/(tabs)/_layout.tsx` — Bottom Nav: `Home | People | + | Planner | More`.
* `app/(tabs)/planner/_layout.tsx` — Tab Bar: `Tasks | Calendar | Goals`.
* `app/(tabs)/planner/tasks.tsx` — sección Tasks.
* `app/(tabs)/planner/calendar.tsx` — sección Calendar.
* `app/(tabs)/planner/goals.tsx` — aparece en estructura, pero queda **POST_MVP / no desarrollar en este fragment**.

#### FAB / acción principal

* FAB es acción principal de creación.
* Posición: esquina inferior derecha, zona de pulgar.
* Diámetro normal: `56px`.
* Diámetro Adulto Mayor: `64px`.
* Fondo: `prim-500`.
* Texto/icono: blanco.
* Sombra: `elevated`.
* Ícono: `+`.
* Visible en:
  * `Tasks (Planner) → Crear tarea`.
  * `Calendar (Planner) → Crear evento`.
* No visible en Home.
* Acción principal siempre debe estar en zona de pulgar.

#### Tasks visual

* Acción principal de Tasks: checkbox 1-tap.
* Tarea se completa con un solo toque en el checkbox, sin abrir detalle.
* Checkbox:
  * tamaño visual normal: `24×24px`;
  * touch target normal: `44×44px`;
  * borde `divider-strong 1.5px`;
  * radio `radius-sm 6px`.
* Checkbox Adulto Mayor:
  * `32×32px`;
  * touch target `56×56px`.
* Estados visuales del checkbox:
  * `Unchecked`: borde `divider-strong`, fondo transparente.
  * `Pressed`: fondo `prim-50`, borde `prim-300`, feedback inmediato `<100ms`.
  * `Checked`: fondo `success-500`, borde `success-500`.
* Checked muestra ícono check blanco `14px`.
* Al completar:
  * háptico `light`;
  * título de tarea tachado;
  * color de título `text-tertiary`;
  * animación `fill 300ms ease-out`;
  * animación `scale 0.9→1.0 200ms ease-out`.
* Regla validación UX:
  * acción principal de Tasks = checkbox 1-tap;
  * no abrir detalle para completar.

#### Listas / items

* `ListItem` base:
  * leading + título + trailing;
  * subtítulo debajo.
* Altura:
  * estándar `56px`;
  * compacto `48px`.
* Padding horizontal: `20px`.
* Gap leading-contenido: `12px`.
* Touch target mínimo: `44px`.
* Adulto Mayor:
  * altura `64px`;
  * touch target `56px`.
* Leading posible relevante para Planner:
  * `Checkbox`;
  * `Avatar`;
  * `Icon`.
* Trailing posible relevante para Planner:
  * `Badge`;
  * `Chip`;
  * `chevron`.
* Estados del list item:
  * default: fondo transparente;
  * pressed: `bg prim-50`, feedback inmediato `<100ms`;
  * selected: `bg prim-50 + borde izquierdo 3px prim-500`;
  * disabled: `opacity 0.5`.
* Separador:
  * `1px divider`;
  * indentado al contenido, no al leading;
  * o sin separador entre grupos lógicos.

#### Chips / filtros

* Chips son seleccionables y accionables para filtros de dominio.
* Variantes:
  * default;
  * outline.
* Estado selected:
  * fondo `prim-500`;
  * texto blanco;
  * borde `prim-500`.
* Estado default:
  * fondo `prim-50`;
  * texto `prim-600`;
  * borde `prim-200`.
* Tamaños:
  * `sm`: altura `28px`, padding horizontal `10px`, fuente `caption`, radio `radius-sm`;
  * `md`: altura `32px`, padding horizontal `12px`, fuente `body S`, radio `radius-sm`.
* El documento no define nombres concretos de filtros para la pantalla Planner en el documento principal.

#### Badges

* Badges son indicadores de estado no interactivos.
* Variantes disponibles:
  * Success;
  * Warning;
  * Error;
  * Info;
  * Neutral.
* Tamaños:
  * `sm`: altura `20px`, padding horizontal `8px`, fuente `label`, dot `6px`;
  * `md`: altura `24px`, padding horizontal `10px`, fuente `caption`, dot `8px`.
* Regla de accesibilidad:
  * siempre texto + color;
  * ejemplo de `accessibilityLabel`: `[N] tareas pendientes`.

#### Cards aplicables

* Card estándar:
  * `bg surface-card`;
  * `radius-md 12px`;
  * padding `16px`;
  * sombra `0px 2px 8px rgba(0,0,0,0.06)`;
  * borde ninguno por defecto u opcional `1px divider-strong`.
* Card destacada:
  * para Briefing, Atención Requerida, Reconocimiento;
  * `border-left 4px prim-500`;
  * sombra `0px 4px 16px rgba(193,127,89,0.12)`.
* Card alerta:
  * contexto de atención/vencimiento;
  * `bg alert-100`;
  * `border-left 4px alert-500`;
  * acción principal en `prim-600`.
* Regla de cards:
  * no más de 1 acción primaria por card;
  * acciones secundarias como ghost button o link text.

#### Bottom Sheet para crear/editar

* Bottom Sheet es la opción principal mobile para crear/editar.
* Sirve para:
  * crear/editar tarea;
  * crear/editar evento;
  * filtros simples si aplica.
* Estructura visual:
  * drag handle `32×4px`, color `divider`;
  * título `H3 text-primary`;
  * contenido;
  * footer sticky con `[Acción secundaria] [Acción primaria]`.
* Fondo: `surface-card`.
* Radio superior: `radius-lg 16px`.
* Padding: `24px`.
* Overlay: `surface-overlay`.
* Backdrop: blur `4px` si el SO lo soporta.
* Alturas:
  * `25%` quick actions / confirmaciones simples;
  * `50%` formularios simples / filtros;
  * `75%` formularios complejos / listas;
  * `90%` casi full screen / edición detallada.
* Animación:
  * entrada `slide-up + fade-in 300ms ease-out`;
  * salida `slide-down + fade-out 200ms ease-in`;
  * overlay `fade-in 300ms / fade-out 200ms`.

#### Modal de confirmación

* Modal centrado solo para confirmaciones con consecuencia.
* Aplicable a eliminación de tarea/evento si se implementa esa acción visual.
* Estructura:
  * ícono contextual `48px`;
  * título `H3 center`;
  * descripción opcional `body text-secondary`;
  * `[Cancelar] [Confirmar]`.
* Fondo: `surface-card`.
* Radio: `radius-lg 16px`.
* Padding: `24px`.
* Max-width: `320px`.
* Gap: `16px`.
* Overlay: `surface-overlay`.
* Animación: `scale(0.95→1) + fade-in 250ms ease-out`.
* Prohibición:
  * nunca para formularios;
  * nunca para navegación entre niveles.

#### Progress Bar

* ProgressBar aparece para tareas / Goals con color `prim-500`.
* Track: `bg-secondary`, altura `6px`, `radius-full`.
* Fill: `prim-500`, altura `6px`, `radius-full`.
* Transición: `width 600ms ease-out`.
* Regla emocional:
  * nunca muestra “atraso” o “deuda” visual;
  * si alguien está atrasado en una tarea, se muestra como “pendiente” sin color de error;
  * color de error solo en bloqueos reales.
* Para este fragment:
  * ProgressBar puede inspirar progreso visual de tareas si hay datos;
  * Goals queda **POST_MVP**.

#### Empty State

* Empty State es la primera experiencia por dominio.
* Estructura:
  * ilustración sutil `120px`, tint `prim-100`;
  * título `H3 text-primary`;
  * descripción `body text-secondary`;
  * acción sugerida con botón secondary o ghost.
* Copy explícito para Tasks:
  * título: `Acá van a aparecer tus tareas`.
  * descripción: `Cuando alguien te asigne una tarea, la vas a ver acá.`
* Empty state funciona como tutorial implícito.
* No usar tooltips.
* No usar carruseles de features.
* Conexión implícita en archivo de comprensión:
  * `EmptyState` puede sugerir `FabButton` para primera acción.

#### Skeleton / Loading

* Skeleton aparece cuando los datos tardan más de `300ms` en cargar.
* Card skeleton con fondo `prim-50`.
* Animación pulse:
  * opacidad `0.3 → 0.6 → 0.3`;
  * ciclo `1.5s ease-in-out`.
* Transición a contenido:
  * fade-in `300ms`;
  * skeletons se disuelven.

#### Pantallas Home que exponen Planner como dependencia externa

**Dependencia externa / no desarrollar en este fragment.**

* Home — Coordinador muestra card de tareas agrupadas:
  * `Mis pendientes (2)`;
  * agrupación `Compras`;
  * tareas con checkbox 1-tap.
* Home — Coordinador muestra próximos eventos:
  * card `📅 Sábado: Asado familiar`;
  * hora y participantes.
* Home — Adulto Mayor muestra eventos:
  * `📅 Miércoles: Control médico`;
  * `10:30 · Clínica Familiar`.
* Home resume información y debe conducir al módulo correspondiente.

---

### 2.2 Datos creíbles

#### Datos explícitos para tareas

| Dato encontrado | Contexto | Uso posible en demo | Clasificación |
| --- | --- | --- | --- |
| `Mis pendientes (2)` | Home Coordinador | título/resumen de tareas pendientes | DEMO PREMIUM / dependencia Home |
| `Compras` | agrupación de tareas en Home | responsabilidad/grupo visual | REAL parcial / demo |
| `Comprar leche y pan` | tarea visible en Home | tarea mock de lista | DEMO PREMIUM |
| `Pagar servicios` | tarea visible en Home | tarea mock de lista | DEMO PREMIUM |
| `tareas pendientes/vencidas` | flujo de datos hacia Home > Atención Requerida | filtro o resumen de tareas urgentes | REAL parcial |
| `Lista de tareas con prioridad, responsable y fecha` | flujo de datos hacia Home > Atención Requerida | datos mínimos para cards/lista | REAL parcial, campos sin tipo |
| `Tareas por responsable` | flujo de datos hacia Home > Carga Familiar | resumen por miembro | MOCK / dependencia Home |
| `Distribución de carga semanal` | Home > Carga Familiar | dato de balance de tareas | MOCK / dependencia Home |
| `Checkbox 1-tap + timestamp` | flujo Usuario completa tarea → Planner > Tasks | dato de completado local | REAL parcial |

#### Responsabilidades / categorías explícitas

| Dato encontrado | Contexto | Uso posible en demo | Clasificación |
| --- | --- | --- | --- |
| `Responsabilidades` | eje organizador de Tasks | agrupación de tareas | REAL parcial |
| `Compras` | responsabilidad tipo | categoría visible | REAL parcial / demo |
| `Mascotas` | responsabilidad tipo | categoría visible | REAL parcial / demo |
| `Limpieza` | responsabilidad tipo | categoría visible | REAL parcial / demo |
| `Vehículos` | responsabilidad tipo | categoría visible | POST_MVP / puede ser categoría visual si ya aparece |

#### Datos explícitos para eventos

| Dato encontrado | Contexto | Uso posible en demo | Clasificación |
| --- | --- | --- | --- |
| `Sábado: Asado familiar` | Home Coordinador > Próximos Eventos | evento mock | DEMO PREMIUM |
| `14:00 · Participan 5 personas` | Home Coordinador > Próximos Eventos | hora + participantes | DEMO PREMIUM |
| `Miércoles: Control médico` | Home Adulto Mayor > Eventos | evento mock | DEMO PREMIUM |
| `10:30 · Clínica Familiar` | Home Adulto Mayor > Eventos | hora + lugar | DEMO PREMIUM |
| `Evento con fecha, participantes, ubicación` | flujo Calendar → FamilyCloud | campos visibles de evento | REAL parcial / POST_MVP para integración externa |

#### Datos temporales / estados visibles

| Dato encontrado | Uso posible | Clasificación |
| --- | --- | --- |
| `pendiente` | mostrar tarea atrasada sin error visual | REAL parcial |
| `vencida` | condición calculada, no estado | REAL parcial |
| `checked` | estado visual de checkbox | REAL visual |
| `unchecked` | estado visual de checkbox | REAL visual |
| `pressed` | feedback inmediato | REAL visual |
| `selected` | estado de ListItem / Chip | REAL visual |
| `disabled` | estado de ListItem / Input/Button | REAL visual |

---

### 2.3 Acción interactiva

| Acción encontrada | Dónde aparece | Resultado visible | Clasificación |
| --- | --- | --- | --- |
| Crear tarea | FAB visible en Tasks | abre creación desde acción principal | REAL parcial, sin formulario/API |
| Crear tarea | Quick Actions | acción rápida desde botón `+` central | REAL parcial / dependencia externa |
| Crear evento | FAB visible en Calendar | abre creación desde acción principal | REAL parcial, sin formulario/API |
| Crear evento | Quick Actions | acción rápida desde botón `+` central | REAL parcial / dependencia externa |
| Ver pendientes | Quick Actions | acceso a pendientes | REAL parcial / dependencia externa |
| Completar tarea | Checkbox 1-tap | checked + tachado + háptico + animación | REAL visual |
| Editar tarea | Bottom Sheet crear/editar | edición en contexto | REAL parcial, campos no definidos |
| Editar evento | Bottom Sheet crear/editar | edición en contexto | REAL parcial, campos no definidos |
| Eliminar tarea | Modal de confirmación | cancelar/confirmar | REAL parcial, sin API |
| Eliminar evento | Modal de confirmación | cancelar/confirmar | REAL parcial, sin API |
| Cambiar tab interna | TabBar Tasks/Calendar/Goals | indicador activo cambia con slide | REAL visual |
| Refrescar pantalla actual | tap en tab activo de Bottom Nav | scroll to top + refresh | REAL visual |
| Filtrar | Chips de dominio | chip selected/unselected | REAL visual, filtros no nombrados |
| Abrir perfil por avatar | Avatar | perfil de persona | Dependencia externa / no desarrollar en este fragment |
| Buscar Tasks | SearchGlobal busca Tasks | resultados agrupados / acción ejecutable | Dependencia externa / no desarrollar en este fragment |

#### Acciones por rol encontradas en archivo de comprensión

| Rol | Acción Planner encontrada | Clasificación | Nota |
| --- | --- | --- | --- |
| Adulto | puede crear tareas | REAL parcial | permisos incompletos; no extrapolar backend |
| Adulto | puede reasignar | REAL parcial | permisos incompletos; no hay contrato |
| Adolescente | crea tareas propias | REAL parcial | permisos ampliables; no hay detalle técnico |
| Adolescente | crea eventos | REAL parcial | no hay contrato de Calendar |
| Niño | solo completa tareas | REAL parcial / visual | experiencia simplificada |
| Adulto Mayor | experiencia adaptada: fuente grande, alto contraste, sin gestos complejos | REAL visual | afecta Tasks/Calendar UI |

---

### 2.4 Feedback inmediato

#### Feedback de botones

* Todo tap en botón recibe háptico:
  * iOS: `light`;
  * Android: `clockTick`.
* Adulto Mayor:
  * háptico `medium`.
* Loading de botón:
  * mantiene ancho;
  * texto se reemplaza por spinner;
  * botón permanece visualmente en estado active;
  * mínimo `400ms` de loading para evitar flicker;
  * spinner aparece solo si operación `>300ms`.

#### Feedback de checkbox de tarea

* Feedback inmediato `<100ms` en pressed.
* Checked:
  * fondo `success-500`;
  * borde `success-500`;
  * check blanco;
  * título tachado;
  * texto `text-tertiary`;
  * háptico `light`;
  * animación fill + scale.

#### Toast

* Toast aparece arriba, nunca abajo.
* No compite con Bottom Nav ni acciones inferiores.
* Duración default: `4s`.
* Adulto Mayor: `8s`.
* Variantes:
  * Success;
  * Alert;
  * Error;
  * Info.
* Máximo 1 toast visible a la vez.
* Si llega otro, el actual se descarta.
* Nunca toast para tareas completadas por otros miembros.
* Toast con `Deshacer` dura `5s`.
* Deshacer se usa como ventana de reversión para completado.

#### Modal / eliminación

* Toda eliminación requiere confirmación.
* Modal solo para confirmaciones con consecuencia.
* Eliminar es grave; completar es cotidiano y debe tener deshacer.

#### Skeleton / carga

* Skeleton si datos tardan `>300ms`.
* Pulse animation.
* Fade-in al contenido.

#### Empty state

* Empty state como tutorial implícito.
* Acción sugerida con botón secondary o ghost.
* No tooltips.
* No carruseles.

#### Motion / senior

* Modo Adulto Mayor respeta `prefers-reduced-motion`.
* Si el SO pide reducción, animaciones se eliminan.
* Adulto Mayor evita gestos complejos.

---

### 2.5 Service aislado

No se encontró contrato explícito de service ni nombres de funciones.

Pistas extraíbles para un service local/mock o aislado:

| Dato/acción | Qué debería entregar/ejecutar según documento | Clasificación |
| --- | --- | --- |
| Lista de tareas | tareas con prioridad, responsable y fecha para Home > Atención Requerida | REAL parcial / campos sin tipo |
| Tareas pendientes/vencidas | resumen para Atención Requerida | REAL parcial |
| Tareas por responsable | distribución semanal para Carga Familiar | MOCK / dependencia Home |
| Completar tarea | `Checkbox 1-tap + timestamp` hacia Planner > Tasks | REAL parcial |
| Crear tarea | acción desde FAB o Quick Actions | REAL parcial, sin contrato |
| Crear evento | acción desde FAB o Quick Actions | REAL parcial, sin contrato |
| Eventos próximos | eventos con fecha, hora, participantes y ubicación si aparecen | REAL parcial / demo |
| Home summary | Home consume tareas/eventos, pero no administra | Dependencia externa |

Restricciones para service:

* No se encontraron endpoints.
* No se encontraron request/response.
* No se encontraron nombres de métodos.
* No se encontraron tipos de campos.
* Para demo puede ser local/mock, pero el documento no define implementación.

---

### 2.6 Navegación coherente

#### Entrada principal

* Planner se entra desde Bottom Nav.
* Planner no vive en More.
* Calendar no es tab principal; vive dentro de Planner.
* Tasks no es tab principal independiente; vive dentro de Planner.
* Goals vive dentro de Planner, pero queda **POST_MVP** para este fragment.

#### Bottom Nav

```txt
[ Home ] [ People ] [ + ] [ Planner ] [ More ]
```

* Estructura oficial inmutable.
* No modificar sin enmienda a la Final Spec.
* Planner destino:
  * `Planner (§24.08)`;
  * contenido principal: `Tasks, Calendar, Goals`;
  * visible para todos.

#### Quick Actions

**Dependencia externa / no desarrollar en este fragment.**

* El botón `+` central abre panel flotante.
* Quick Actions tiene Geni fijo primero.
* Acciones relacionadas con Planner:
  * Crear tarea;
  * Crear evento;
  * Ver pendientes.
* Orden:
  * fijadas por usuario;
  * más usadas por frecuencia + recencia;
  * menos usadas.

#### Navegación interna

* Planner usa Tab Bar interna:
  * `Tasks | Calendar | Goals`.
* Máximo 5 tabs por dominio.
* No crear un tab separado de Calendar en Bottom Nav.

#### Progressive Disclosure

* 4 niveles:
  * Home → Dominio → Detalle → Configuración avanzada.
* Más de 4 niveles de navegación es fallo.
* Objetivo:
  * 95% de acciones en ≤3 niveles.
* Complejidad avanzada nunca visible por defecto.

---

### 2.7 Conexión con Home o More

#### Home

**Dependencia externa / no desarrollar Home en este fragment.**

* Home contiene enlaces a Planner.
* Home contiene enlaces a Calendar.
* Home muestra tareas agrupadas.
* Home muestra próximos eventos.
* Home puede mostrar tareas pendientes/vencidas en Atención Requerida.
* Home puede mostrar distribución de tareas por responsable en Carga Familiar.
* Home resume información, no la administra.
* Toda información mostrada en Home debe conducir al módulo correspondiente.
* Home siempre es la pantalla inicial.

#### More

* Planner no vive en More.
* More contiene herramientas especializadas Tier 3.
* More no afecta implementación de Planner salvo como contraste de navegación.

#### Quick Actions

**Dependencia externa / no desarrollar Quick Actions en este fragment.**

* Quick Actions se abre desde el botón `+` central.
* Acciones extraíbles relacionadas con Planner:
  * Crear tarea.
  * Crear evento.
  * Ver pendientes.

---

## 3. Clasificación para implementación

### REAL MÍNIMO

* Planner como tab de Bottom Nav.
* Estructura de Bottom Nav:
  * `Home | People | + | Planner | More`.
* Planner como contenedor de:
  * Tasks;
  * Calendar;
  * Goals solo como tab contextual **POST_MVP**, sin lógica.
* TabBar interna:
  * `Tasks | Calendar | Goals`.
* Tasks:
  * listar visualmente tareas;
  * completar tarea con checkbox 1-tap;
  * estado visual checked/unchecked/pressed;
  * tarea completada con título tachado;
  * feedback háptico;
  * toast con Deshacer 5s;
  * empty state de tareas;
  * skeleton loading si carga >300ms.
* Crear tarea:
  * FAB en Tasks;
  * BottomSheet para crear/editar;
  * sin contrato API.
* Editar tarea:
  * BottomSheet;
  * sin campos definidos.
* Eliminar tarea:
  * Modal centrado de confirmación;
  * sin API.
* Calendar:
  * sección dentro de Planner;
  * FAB en Calendar para crear evento;
  * crear/editar evento con BottomSheet;
  * eliminar evento con Modal si aparece en demo;
  * sin vistas día/semana/mes definidas en este documento.
* Feedback global:
  * botón con loading/spinner si operación >300ms;
  * skeleton >300ms;
  * acciones con feedback <100ms.

### DEMO PREMIUM

* Datos mock extraíbles:
  * `Comprar leche y pan`;
  * `Pagar servicios`;
  * `Mis pendientes (2)`;
  * `Compras`;
  * `Sábado: Asado familiar`;
  * `14:00 · Participan 5 personas`;
  * `Miércoles: Control médico`;
  * `10:30 · Clínica Familiar`.
* Home puede mostrar snippets de Planner, pero Home no se desarrolla en este fragment.
* Carga Familiar usa tareas por responsable y distribución semanal, pero para MVP visual queda como mock externo de Home.

### LOCAL / ASYNCSTORAGE / MOCK SERVICE

El documento no menciona AsyncStorage ni service local, pero sí aporta datos/acciones que podrían aislarse en una capa demo sin backend real:

* lista local de tareas;
* lista local de eventos;
* completar tarea con timestamp;
* filtrar visualmente por estado/categoría si se usan Chips;
* crear tarea desde FAB/QuickActions;
* crear evento desde FAB/QuickActions;
* resumen local de pendientes para Home;
* resumen local de próximos eventos para Home.

No se deben inventar nombres de funciones ni endpoints desde este fragment.

### POST_MVP

* Goals dentro de Planner.
* Hitos / Milestones.
* Dependencias de tareas.
* Recurrencias de tareas.
* Subtareas.
* Verificación como aprobación opcional post-completado, porque el documento dice que no crea estado separado y contradice los estados MVP esperados.
* Plantillas reutilizables, porque el documento no define templates MVP constantes ni CRUD.
* Adjuntos en tareas.
* Comentarios en tareas.
* Timeline de tarea.
* Automatizaciones que generan tareas.
* Integraciones externas que generan tareas.
* Auditoría completa de Planner.
* Offline sync / cola de sincronización.
* Geni real sobre Planner.
* FamilyCloud derivado de eventos.
* Recap anual con datos de Planner.

### IGNORAR

* No desarrollar dominios externos desde este fragment.
* No desarrollar Goals como feature real.
* No desarrollar IA real.
* No desarrollar automatizaciones reales.
* No desarrollar auditoría real.
* No desarrollar offline sync.
* No desarrollar storage/OCR.
* No desarrollar presencia GPS ni geocercas.

---

## 4. UI extraíble

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |
| --- | --- | --- | --- | --- | --- |
| BottomNav | `Home | People | + | Planner | More` | tocar Planner, tocar tab activo para refresh | active/inactive/badge | navegación principal | REAL MÍNIMO |
| Planner Tab | entrada principal al módulo | abrir Planner | tab activo/inactivo | BottomNav → Planner | REAL MÍNIMO |
| Planner TabBar | `Tasks | Calendar | Goals` | cambiar sección | active/inactive, indicador slide | dentro de Planner | REAL MÍNIMO / Goals POST_MVP |
| Tasks Screen | lista de tareas | crear, completar, editar, eliminar visualmente | empty, skeleton, checkbox states, toast | Planner → Tasks | REAL MÍNIMO |
| Task ListItem | checkbox + título + subtítulo/trailing | completar 1-tap, abrir detalle si se decide después | default/pressed/selected/disabled | dentro de Tasks | REAL MÍNIMO |
| CheckboxTarea | estado de una tarea | completar tarea sin abrir detalle | unchecked/pressed/checked, haptic, tachado | dentro de Task List | REAL MÍNIMO |
| FAB en Tasks | botón `+` | crear tarea | pressed/loading según botón | Tasks | REAL MÍNIMO |
| Create/Edit Task BottomSheet | formulario no especificado | acción secundaria + acción primaria | 50/75/90%, overlay, slide/fade | desde FAB o edición | REAL parcial |
| Delete Task Modal | confirmación de eliminación | cancelar/confirmar | scale/fade, overlay | desde acción de eliminar | REAL parcial |
| Calendar Screen | sección Calendar dentro de Planner | crear evento | no define day/week/month | Planner → Calendar | REAL parcial |
| FAB en Calendar | botón `+` | crear evento | pressed/loading según botón | Calendar | REAL MÍNIMO |
| Create/Edit Event BottomSheet | formulario no especificado | acción secundaria + acción primaria | 50/75/90%, overlay, slide/fade | desde Calendar/FAB | REAL parcial |
| Delete Event Modal | confirmación de eliminación | cancelar/confirmar | scale/fade, overlay | desde acción de eliminar | REAL parcial |
| Quick Actions Panel | Geni fijo + acciones dinámicas Planner | crear tarea, crear evento, ver pendientes | fade + slide up, backdrop blur | botón `+` central | Dependencia externa |
| Empty State Tasks | ilustración + título + descripción + acción sugerida | acción sugerida | primera experiencia | Tasks sin datos | REAL visual |
| Skeleton | cards/lista en carga | no interactivo | pulse, fade-in contenido | carga inicial/refresh | REAL visual |
| Toast | mensaje breve + acción | deshacer completado | success/alert/error/info, top | feedback global | REAL visual |
| Home Task Card | `Mis pendientes (2)`, tareas agrupadas | checkbox 1-tap visible en Home | card/lista | Home → Planner | Dependencia externa |
| Home Event Card | próximos eventos | abrir Calendar si se conecta | card | Home → Calendar | Dependencia externa |

---

## 5. Datos demo extraíbles

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |
| --- | --- | --- | --- | --- |
| `Mis pendientes (2)` | Tasks/Home | encabezado de resumen o card | Documento principal §6.1 | DEMO PREMIUM / dependencia Home |
| `Compras` | Tasks | grupo/responsabilidad | Documento principal §6.1 / comprensión OUTPUT 1 | REAL parcial / demo |
| `Comprar leche y pan` | Tasks | tarea visible | Documento principal §6.1 | DEMO PREMIUM |
| `Pagar servicios` | Tasks | tarea visible | Documento principal §6.1 | DEMO PREMIUM |
| `Sábado: Asado familiar` | Events/Calendar | evento visible | Documento principal §6.1 | DEMO PREMIUM |
| `14:00 · Participan 5 personas` | Events/Calendar | hora + participantes | Documento principal §6.1 | DEMO PREMIUM |
| `Miércoles: Control médico` | Events/Calendar | evento visible senior | Documento principal §6.2 | DEMO PREMIUM |
| `10:30 · Clínica Familiar` | Events/Calendar | hora + ubicación | Documento principal §6.2 | DEMO PREMIUM |
| `priority / responsable / fecha` | Tasks | campos visuales para lista/resumen | Comprensión OUTPUT 4 | REAL parcial, tipos ausentes |
| `timestamp` | Tasks | marca de completado | Comprensión OUTPUT 4 | REAL parcial |
| `Compras` | Responsabilidades | responsabilidad tipo | Comprensión OUTPUT 1 | REAL parcial |
| `Mascotas` | Responsabilidades | responsabilidad tipo | Comprensión OUTPUT 1 | REAL parcial |
| `Limpieza` | Responsabilidades | responsabilidad tipo | Comprensión OUTPUT 1 | REAL parcial |
| `Vehículos` | Responsabilidades | responsabilidad tipo | Comprensión OUTPUT 1 | POST_MVP / demo visual si se conserva |

---

## 6. Acciones extraíbles

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |
| --- | --- | --- | --- | --- |
| Abrir Planner | Todos | tab Planner activo | REAL MÍNIMO | Documento principal §4.8 |
| Cambiar a Tasks | Todos | tab Tasks activo | REAL MÍNIMO | Documento principal §4.17 |
| Cambiar a Calendar | Todos | tab Calendar activo | REAL MÍNIMO | Documento principal §4.17 |
| Crear tarea | no especificado | FAB abre creación | REAL parcial | Documento principal §4.2 |
| Crear tarea | no especificado | Quick Actions ofrece acción | REAL parcial / dependencia externa | Documento principal §4.9 |
| Crear evento | no especificado | FAB abre creación | REAL parcial | Documento principal §4.2 |
| Crear evento | no especificado | Quick Actions ofrece acción | REAL parcial / dependencia externa | Documento principal §4.9 |
| Ver pendientes | no especificado | Quick Actions ofrece acceso | REAL parcial / dependencia externa | Documento principal §4.9 |
| Completar tarea | no especificado | checkbox checked, tachado, háptico, animación | REAL visual | Documento principal §4.6 |
| Completar tarea | Usuario | checkbox 1-tap + timestamp hacia Planner > Tasks | REAL parcial | Comprensión OUTPUT 4 |
| Editar tarea | no especificado | BottomSheet crear/editar | REAL parcial | Documento principal §4.11 |
| Editar evento | no especificado | BottomSheet crear/editar | REAL parcial | Documento principal §4.11 |
| Eliminar tarea | no especificado | Modal de confirmación | REAL parcial | Documento principal §4.11 / comprensión OUTPUT 5 |
| Eliminar evento | no especificado | Modal de confirmación | REAL parcial | Documento principal §4.11 / comprensión OUTPUT 5 |
| Filtrar | no especificado | Chip selected/unselected | REAL visual, filtros no definidos | Documento principal §4.5 |
| Refresh pantalla | no especificado | scroll to top + refresh | REAL visual | Documento principal §4.8 |
| Crear tareas | Adulto | puede crear tareas | REAL parcial, permisos incompletos | Comprensión OUTPUT 1 |
| Reasignar | Adulto | puede reasignar | REAL parcial, permisos incompletos | Comprensión OUTPUT 1 |
| Crear tareas propias | Adolescente | tareas propias visibles | REAL parcial, permisos incompletos | Comprensión OUTPUT 1 |
| Crear eventos | Adolescente | eventos visibles | REAL parcial, permisos incompletos | Comprensión OUTPUT 1 |
| Completar tareas | Niño | tarea completada | REAL visual/parcial | Comprensión OUTPUT 1 |
| Verificar tarea | no especificado | aprobación post-completado | POST_MVP / contradictorio | Comprensión OUTPUT 1 / source_map |

---

## 7. Home / More / Quick Actions

### Home

**Dependencia externa / no desarrollar en este fragment.**

* Home puede mostrar información de Planner:
  * tareas pendientes;
  * tareas vencidas;
  * tareas agrupadas por responsabilidad;
  * próximos eventos.
* Home > Atención Requerida puede recibir:
  * tareas pendientes/vencidas;
  * lista de tareas con prioridad, responsable y fecha.
* Home > Carga Familiar puede recibir:
  * tareas por responsable;
  * distribución de carga semanal.
* Carga Familiar es visible solo para Coordinador.
* Para este fragment:
  * tareas/eventos que aparecen en Home sirven como snippets/demo;
  * Home no administra tareas ni eventos;
  * Home debe conducir al módulo dueño.

### More

* Planner no vive en More.
* Planner vive en Bottom Nav.
* More es solo contraste de navegación para este fragment.
* No extraer cards de More para Planner.

### Quick Actions

**Dependencia externa / no desarrollar en este fragment.**

* Quick Actions se abre desde el botón `+` central de Bottom Nav.
* Panel flotante:
  * fondo con blur `4px` + overlay;
  * card `surface-card`;
  * radio `radius-lg 16px`;
  * padding `8px`;
  * animación `fade in + slide up 200ms ease-out`.
* Geni es slot fijo primero, pero IA real no se desarrolla en este fragment.
* Acciones Planner encontradas:
  * Crear tarea;
  * Crear evento;
  * Ver pendientes.

---

## 8. Backend/API detectado

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |
| --- | --- | --- | --- | --- | --- | --- |
| Listar tareas | No encontrado | No encontrado | No encontrado | No encontrado | acción necesaria para UI, sin contrato | Información faltante |
| Crear tarea | No encontrado | No encontrado | No encontrado | No encontrado | acción mencionada sin contrato API | REAL parcial |
| Editar tarea | No encontrado | No encontrado | No encontrado | No encontrado | acción mencionada sin contrato API | REAL parcial |
| Completar tarea | No encontrado | No encontrado | No encontrado | No encontrado | acción UI definida; sin contrato API | REAL visual/parcial |
| Eliminar tarea | No encontrado | No encontrado | No encontrado | No encontrado | confirmación UI definida; sin contrato API | REAL parcial |
| Verificar tarea | No encontrado | No encontrado | No encontrado | No encontrado | concepto mencionado; contradicción de estado | POST_MVP / requiere definición |
| Listar eventos | No encontrado | No encontrado | No encontrado | No encontrado | acción necesaria para Calendar/Home; sin contrato | Información faltante |
| Crear evento | No encontrado | No encontrado | No encontrado | No encontrado | acción mencionada sin contrato API | REAL parcial |
| Editar evento | No encontrado | No encontrado | No encontrado | No encontrado | BottomSheet crear/editar; sin contrato | REAL parcial |
| Eliminar evento | No encontrado | No encontrado | No encontrado | No encontrado | confirmación UI definida; sin contrato API | REAL parcial |
| Ver calendario | No encontrado | No encontrado | No encontrado | No encontrado | navegación UI mencionada | REAL parcial |

---

## 9. Modelo de datos detectado

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |
| --- | --- | --- | --- | --- | --- |
| Planner | Tasks | no especificado | sección interna | tab interna / pantalla | REAL MÍNIMO |
| Planner | Calendar | no especificado | sección interna | tab interna / pantalla | REAL MÍNIMO |
| Planner | Goals | no especificado | sección interna | tab visible, lógica no desarrollada | POST_MVP |
| Task | título | no especificado | ejemplo: `Comprar leche y pan`, `Pagar servicios` | texto principal de item | DEMO PREMIUM / REAL visual |
| Task | responsabilidad | no especificado | `Compras`, `Mascotas`, `Limpieza`, `Vehículos` | agrupación/eje organizador | REAL parcial |
| Task | prioridad | no especificado | no se listan valores | Home > Atención Requerida | REAL parcial, incompleto |
| Task | responsable | no especificado | no se listan entidades concretas | Home > Atención Requerida / Carga Familiar | REAL parcial, incompleto |
| Task | fecha | no especificado | fecha de vencimiento implícita | calcular pendiente/vencida | REAL parcial, incompleto |
| Task | timestamp completado | no especificado | `timestamp` | completar tarea | REAL parcial |
| Task | estado visual checkbox | visual | unchecked / pressed / checked | completar tarea 1-tap | REAL visual |
| Task | vencida | calculado | no es estado | mostrar como pendiente, no error | REAL parcial |
| Task | verificación | no especificado | aprobación opcional post-completado; no crea estado separado | flujo ambiguo | POST_MVP / contradicción |
| Event | título | no especificado | `Sábado: Asado familiar`, `Miércoles: Control médico` | card/lista de eventos | DEMO PREMIUM |
| Event | fecha | no especificado | sábado, miércoles | ordenar/mostrar próximos eventos | DEMO PREMIUM / REAL parcial |
| Event | hora | no especificado | `14:00`, `10:30` | mostrar evento | DEMO PREMIUM |
| Event | participantes | no especificado | `Participan 5 personas` | subtítulo de evento | DEMO PREMIUM |
| Event | ubicación | no especificado | `Clínica Familiar` | subtítulo de evento | DEMO PREMIUM |
| Calendar | evento | no especificado | evento con fecha, participantes, ubicación | listar eventos | REAL parcial |
| Chip | selected | visual | selected/unselected | filtros | REAL visual |
| Badge | variante | visual | success/warning/error/info/neutral | indicadores | REAL visual |
| ListItem | estado | visual | default/pressed/selected/disabled | lista de tareas/eventos | REAL visual |

---

## 10. Edge cases / errores / estados vacíos

| Caso | Comportamiento esperado | Fuente | Clasificación |
| --- | --- | --- | --- |
| Tareas sin datos | mostrar Empty State: `Acá van a aparecer tus tareas` | Documento principal §4.15 | REAL visual |
| Datos tardan >300ms | mostrar Skeleton | Documento principal §4.16 | REAL visual |
| Operación de botón >300ms | mostrar spinner | Documento principal §4.1 | REAL visual |
| Loading muy corto | mantener mínimo 400ms para evitar flicker | Documento principal §4.1 | REAL visual |
| Completar tarea | 1 tap, no abrir detalle | Documento principal §4.6 / §8.4 | REAL MÍNIMO |
| Completar por error | toast con `Deshacer` por 5s | Documento principal §4.13 / comprensión OUTPUT 5 | REAL visual |
| Otra persona completa tarea | nunca mostrar toast | Documento principal §4.13 / comprensión OUTPUT 5 | REAL visual |
| Tarea atrasada | mostrar como `pendiente`; no color de error por atraso | Documento principal §4.14 / comprensión OUTPUT 5 | REAL visual |
| Tarea vencida | no es estado; se calcula por fecha de vencimiento vs hoy | Comprensión OUTPUT 5 | REAL parcial |
| Eliminar tarea/evento | requiere modal de confirmación | Documento principal §4.11 / comprensión OUTPUT 5 | REAL parcial |
| Formulario en modal | prohibido; usar BottomSheet | Documento principal §4.11 | REAL restricción |
| Navegación en modal | prohibido; modal no navega entre niveles | Documento principal §4.11 | REAL restricción |
| Badge en Bottom Nav | nunca rojo/error; solo success o alert | Documento principal §4.5 / §4.8 | REAL restricción |
| Adulto Mayor | touch targets ≥56px, sin gestos complejos | Documento principal §4.6 / §4.12 / §8.3 | REAL visual |
| Reduced motion | eliminar animaciones si SO lo pide | Comprensión OUTPUT 5 / Documento principal §8.3 | REAL accesibilidad |
| Postergar evento | equivale a modificar fecha; no existe estado Postergado | Comprensión OUTPUT 5 | REAL parcial |
| Verificación de tarea | documento dice que no crea estado separado | Comprensión OUTPUT 1 / source_map | POST_MVP / contradicción |
| Calendar día/semana/mes | no encontrado | source_map | Información faltante |

---

## 11. Restricciones y prohibiciones detectadas

* Bottom Nav congelada:
  * `[Home] [People] [+] [Planner] [More]`.
* Planner no debe moverse a More.
* Calendar no debe tener tab propio en Bottom Nav.
* Goals aparece dentro de Planner, pero no desarrollar lógica para este fragment.
* Responsabilidades no aparecen como dominio independiente; son eje organizador de Tasks.
* Acción principal de cada pantalla debe ser 1 tap.
* Si una acción principal requiere más pasos, el diseño debe rehacerse.
* Completar tarea no abre detalle.
* Toda acción del usuario recibe feedback en `<100ms`.
* Spinner solo si operación `>300ms`.
* Skeleton si carga `>300ms`.
* Toda eliminación requiere confirmación.
* Completar tarea tiene deshacer de `5s`.
* Toast arriba, no abajo.
* Máximo 1 toast visible.
* Nunca toast para tareas completadas por otros miembros.
* Sin badges rojos/error en Bottom Nav.
* Badge nunca comunica solo con color.
* No mostrar atraso como deuda visual.
* Tarea vencida no es estado; se calcula.
* Postergar evento no es estado; equivale a modificar fecha.
* No usar modales para formularios.
* No usar modales para navegación entre niveles.
* No usar tooltips ni carruseles para enseñar el módulo; usar Empty State.
* Más de 4 niveles de navegación es fallo.
* Objetivo: 95% de acciones en ≤3 niveles.
* Configuración avanzada nunca visible por defecto.
* Modo Adulto Mayor no es zoom; es re-arquitectura de interacción.
* Adulto Mayor:
  * fuente mayor;
  * alto contraste;
  * touch targets mayores;
  * sin gestos complejos.
* No inventar endpoints desde este documento.
* No asumir permisos de tasks/events desde la matriz de otros módulos.

---

## 12. Información faltante

| Falta | Por qué importa para Codex | Impacto |
| --- | --- | --- |
| Campos completos de Task | permite crear formulario real | BottomSheet queda visual sin contrato |
| Tipos de campos de Task | evita inventar schema | service/API no definible desde este documento |
| Estados backend de Task | MVP espera estados específicos, pero documento solo define estados visuales | riesgo de contradicción |
| Verification Flow MVP | documento dice que verificación no crea estado separado | requiere otra fuente para estados `pending/completed/awaiting_verification/verified` |
| Permisos para crear/editar/completar/verificar tareas | evita extrapolar roles | permisos incompletos |
| Request/response de tasks | necesario para backend real | no implementar API desde este fragment |
| Endpoint de listar tareas | necesario para datos reales | usar mock/local si es demo |
| Endpoint de completar tarea | necesario para sincronización real | solo hay interacción UI |
| Formulario de crear tarea | faltan labels/campos | Codex debería usar otra fuente o mock mínimo |
| Campos completos de Event | permite crear formulario real | Calendar queda visual parcial |
| Tipos de campos de Event | evita inventar schema | service/API no definible desde este documento |
| Recurrencia simple de eventos | MVP la pide, documento no la define | no extraer RRULE/EXDATE ni inventar simple recurrence |
| Vistas día/semana/mes | MVP las pide, documento solo dice Calendar | Calendar queda mínimo/parcial |
| Tareas con fecha dentro de Calendar | MVP la pide, documento no lo explicita | marcar como faltante |
| Estados vacíos de Calendar | no hay copy específico | Calendar empty state no definido |
| Filtros concretos de Tasks | Chips existen, pero no filtros del módulo | no inventar filtros |
| Prioridades | aparece como dato, sin valores | no inventar `low/medium/high` |
| Responsables | aparece como dato, sin entidad/campo concreto | depende de Members/People |
| Datos reales de Members | asignación de tareas/eventos depende de miembros | dependencia externa |
| Contrato de Home summary | Home consume Planner pero no hay API | integración real incompleta |
| Service aislado | no hay nombre ni contrato | solo se puede extraer como pista de mock/local |
| Errores de API | no se definen errores | no inventar mensajes backend |
| Criterio de orden de tareas/eventos | no aparece | listas quedan mock/visuales |

---

## 13. Fuente

### Documento principal

* Archivo: `HomePlus — Desing system v1(1).md`
* Secciones usadas:
  * Encabezado / alcance mobile-first React Native / Expo.
  * `1. Paleta de colores`.
  * `2. Tipografía`.
  * `3. Espaciado y Grid`.
  * `4.1 Botones`.
  * `4.2 Botón Flotante (FAB)`.
  * `4.3 Cards`.
  * `4.5 Chips / Badges`.
  * `4.6 Checkbox de Tarea (1-tap)`.
  * `4.7 Avatar`.
  * `4.8 Bottom Navigation Bar`.
  * `4.9 Quick Actions Panel`.
  * `4.11 Modal y Bottom Sheet`.
  * `4.12 List Item`.
  * `4.13 Toast / Snackbar`.
  * `4.14 Indicador de Progreso`.
  * `4.15 Empty State`.
  * `4.16 Skeleton / Loading`.
  * `4.17 Tab Bar`.
  * `6.1 Pantalla Home — Coordinador (Happy Path)`.
  * `6.2 Pantalla Home — Adulto Mayor`.
  * `7. Implementación recomendada` / estructura de archivos.
  * `8. Lista de verificación de implementación`.

### Archivo de comprensión asociado

* Archivo: `Design system v1(1).txt`
* Secciones usadas:
  * `OUTPUT 1 — ENTITIES`.
  * `OUTPUT 2 — RELATIONSHIPS`.
  * `OUTPUT 4 — DATA FLOWS`.
  * `OUTPUT 5 — BUSINESS RULES`.
  * `OUTPUT 6 — ARCHITECTURAL DECISIONS`.
  * `OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS`.
  * `OUTPUT 8 — GRAPH EDGES`.

### Source map generado previamente

* Archivo: `source_map_HomePlus_Design_System_V2.md`
* Secciones usadas:
  * `4.7 PLANNER`.
  * `4.8 TASKS`.
  * `4.9 EVENTS`.
  * `4.10 CALENDAR`.
  * `10. Mapa de APIs`.
  * `11. Mapa de UI`.
  * `12. Mapa de eventos del sistema`.
  * `13. Restricciones arquitectónicas detectadas`.
  * `17. Contradicciones detectadas`.
  * `18. Información faltante`.
  * `19. Recomendación de fragments a generar`.

