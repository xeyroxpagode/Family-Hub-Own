# frontend_planner_ux_final.md

## 0. Propósito del documento

Este documento define la **UX final premium de Planner para HomePlus MVP**.

Su objetivo es que Antigravity/Codex pueda convertir Planner en una herramienta diaria simple, clara y agradable, manteniendo la funcionalidad real existente y reduciendo la carga visual.

Este documento usa como base:

- `frontend_all_extractions_master.md`;
- `frontend_premium_extraction_index.md`;
- `frontend_premium_design_system_v1.md`;
- `frontend_navigation_shell_v1.md`.

Este documento **no implementa código**, **no toca backend**, **no cambia endpoints**, **no elimina funcionalidad real** y **no convierte mocks en features reales**.

Planner debe conservar Tasks y Events/Calendar como funcionalidades reales del MVP, y debe presentar Goals/Metas solo como experiencia visual premium de “Próximamente” cuando no exista backend real.

---

## 1. Principio central de Planner

Planner debe pasar de “panel administrativo” a **herramienta diaria simple para coordinar tareas y eventos del hogar**.

Principio rector:

> Planner no debe mostrar todo lo que sabe. Debe mostrar lo que ayuda a decidir qué hacer ahora.

Traducción práctica:

- Tareas y eventos son reales y diarios.
- Metas son visual premium / próximamente, no feature real del MVP.
- El usuario no debe sentir que entra a una planilla.
- La pantalla principal debe priorizar acción, no diagnóstico.
- Los filtros avanzados existen bajo demanda.
- Los estados importantes se ven en la card.
- Los datos técnicos o secundarios viven en detalle.
- Las tareas completadas y canceladas no deben contaminar la vista diaria.
- El calendario muestra eventos, no tareas, para evitar mezcla mental.
- Las acciones frecuentes deben estar a 1 tap; las decisiones destructivas deben pedir confirmación.

Planner debe sentirse:

- simple;
- diario;
- confiable;
- visualmente liviano;
- cálido;
- rápido;
- familiar;
- no punitivo;
- no corporativo;
- no saturado.

---

## 2. Decisión de alcance MVP

### 2.1 Real MVP

Planner real del MVP incluye:

- listar tareas;
- crear tarea;
- editar tarea si ya existe en la app;
- completar tarea;
- cancelar tarea si ya existe en la app;
- mostrar responsable;
- mostrar fecha/vencimiento si existe;
- mostrar estado;
- mostrar prioridad si existe;
- mostrar responsabilidad/categoría si existe;
- mostrar tareas vencidas como condición calculada visual, no como estado persistido;
- listar eventos;
- crear evento si ya existe funcionalidad real;
- editar evento si ya existe funcionalidad real;
- cancelar evento si ya existe funcionalidad real;
- mostrar mes + agenda de eventos;
- navegar desde Home hacia Tareas o Calendario;
- refrescar Home y Planner al crear/completar/editar/cancelar.

### 2.2 Mock / Demo Premium

Planner puede incluir como demo premium:

- Metas “Próximamente”;
- cards visuales de progreso de metas sin backend real;
- sugerencias de Geni relacionadas con Planner, siempre marcadas internamente como mock;
- templates visuales sugeridos si no crean lógica real compleja;
- indicadores suaves de carga familiar si no alteran datos reales.

### 2.3 Post-MVP

Quedan fuera del MVP real salvo que ya existan completamente:

- subtareas;
- dependencias;
- comentarios;
- adjuntos;
- timeline/auditoría completa;
- recurrencia avanzada;
- notificaciones push/email reales;
- offline sync;
- automatizaciones reales;
- Geni creando o reasignando tareas;
- Goals reales con milestones;
- streaks;
- métricas históricas de carga;
- búsqueda global real dentro de Planner;
- integración real Inventory → Task;
- integración real Assets → Task;
- álbum automático desde Event → FamilyCloud.

### 2.4 Regla de no eliminación

Si alguna funcionalidad real ya existe en el proyecto, este documento **no autoriza eliminarla**. La instrucción es reorganizar su visibilidad:

- lo frecuente queda en vista principal;
- lo secundario queda en detalle;
- lo avanzado queda en sheet/filtros;
- lo destructivo queda detrás de confirmación;
- lo técnico queda oculto salvo que ayude al usuario.

---

## 3. Problema UX que resuelve Planner

Planner resuelve la coordinación diaria del hogar:

- qué hay que hacer;
- quién lo tiene que hacer;
- qué vence pronto;
- qué ya se completó;
- qué eventos vienen;
- qué necesita atención sin abrir múltiples apps.

Planner no debe resolver:

- toda la administración del hogar;
- todas las métricas familiares;
- todo el historial de colaboración;
- el feed social;
- las finanzas;
- la presencia;
- la inteligencia artificial real.

La pantalla debe evitar tres problemas clásicos:

1. **Sobrecarga visual**: demasiadas cards, badges, filtros y datos hacen que nadie quiera usar la app.
2. **Sensación punitiva**: mostrar “quién no hizo” con tono acusatorio rompe la confianza familiar.
3. **Ambición de dashboard**: si Planner intenta mostrar reportes, métricas, calendario, tareas, metas, actividad y automatizaciones a la vez, deja de ser una herramienta diaria.

---

## 4. Planner Shell

### 4.1 Estructura general

Planner debe tener una estructura simple:

1. Header compacto.
2. Tabs internas / segmented control.
3. Contenido según segmento.
4. Botón contextual principal.
5. Sheets para crear, filtros y opciones.
6. Detalle bajo demanda.

Segmentos recomendados:

- `Tareas` — real MVP.
- `Calendario` — real MVP.
- `Metas` — demo premium / próximamente.

En caso de que el proyecto actual tenga solo Tasks y Events, mantener 2 segmentos visibles (`Tareas`, `Calendario`) y ubicar `Metas` como card inferior “Próximamente” o item en More/Planner, no como tab falsa.

### 4.2 Header

Header recomendado:

- título: `Planner`;
- subtítulo contextual corto;
- acción secundaria: filtro o menú compacto;
- no más de una acción visible;
- no duplicar el botón `+` global.

Subtítulos posibles:

- `Hoy y próximos días`;
- `Tareas y eventos del hogar`;
- `Lo importante de esta semana`;
- `Organizá sin sobrecargar`.

Regla: el subtítulo debe calmar, no vender.

### 4.3 Tabs internas

Usar `SegmentedControl` del Design System.

Orden:

1. Tareas.
2. Calendario.
3. Metas, solo si se decide mostrar como próximamente.

Reglas:

- El segmento activo debe ser claro pero suave.
- No usar colores fuertes para todos los segmentos.
- La transición entre segmentos debe durar 160–240ms.
- Mantener estado de scroll por segmento si es posible.
- Si el usuario llega desde Home card de tareas, abrir `Tareas`.
- Si llega desde Home próximos eventos, abrir `Calendario`.
- Si llega desde Geni mock a metas, mostrar `Metas` solo como preview y no prometer backend.

### 4.4 Botón contextual

El botón contextual depende del segmento:

| Segmento | CTA principal | Forma recomendada |
|---|---|---|
| Tareas | `Nueva tarea` | botón pill/primary o mini FAB contextual |
| Calendario | `Nuevo evento` | botón pill/primary o mini FAB contextual |
| Metas | `Próximamente` / sin acción real | botón disabled o CTA `Ver preview` |

Reglas:

- No mostrar `Nueva tarea` y `Nuevo evento` a la vez en la misma barra principal.
- No mostrar CTA contextual si el Quick Actions Sheet ya está abierto.
- Si el empty state ya tiene CTA, no duplicar otro CTA flotante grande.
- El botón contextual debe respetar safe area y no competir con tab bar.

### 4.5 Cómo evitar resumen global pesado

Planner no debe abrir con un dashboard de métricas.

No mostrar arriba:

- porcentaje de carga familiar;
- gráficos históricos;
- ranking de miembros;
- número total de tareas de todo el mes;
- cards de Finance/Inventory/Assets;
- Geni briefing extenso;
- feed de actividad.

Sí puede mostrar una franja liviana si aporta:

- `3 tareas para hoy`;
- `1 vencida`;
- `2 eventos esta semana`;
- `Sin pendientes urgentes`.

Formato recomendado:

- una línea compacta o chips suaves;
- máximo 3 datos;
- sin gráficos;
- sin tono acusatorio.

Ejemplo bueno:

`Hoy: 3 tareas · 1 evento · 1 vencida`

Ejemplo malo:

`Valeria hizo 83%, Tomás 11%, Roberto 6% esta semana`

Ese tipo de dato queda para demo avanzada/post-MVP, no para Planner principal.

---

## 5. Tareas — UX final

### 5.1 Principio de Tareas

Tareas debe responder rápido:

> ¿Qué tengo que hacer, qué está vencido y qué puedo completar ahora?

La lista no debe obligar a interpretar un sistema. Debe leerse como una agenda doméstica clara.

### 5.2 Layout final

Estructura recomendada para segmento `Tareas`:

1. Summary compacta opcional.
2. Segmentos primarios.
3. Lista de tareas activas.
4. Empty state o loading/error state.
5. Filtros avanzados en sheet.
6. Completadas/canceladas bajo demanda.

Layout visual:

- fondo `background.base`;
- padding horizontal 20px;
- gap entre secciones 16–24px;
- cards con radius 18–24;
- sombras suaves solo en cards destacadas;
- no usar tabla;
- no usar columnas densas en mobile.

### 5.3 Segmentos primarios

Segmentos internos dentro de `Tareas`:

- `Hoy`;
- `Próximas`;
- `Todas`.

Alternativa si el backend no permite segmentar por fecha:

- `Activas`;
- `Mías`;
- `Todas`.

Decisión recomendada para MVP:

1. Usar `Activas` como vista por defecto si hay incertidumbre de fechas.
2. Mostrar vencidas arriba dentro de Activas.
3. Permitir `Mías` si existe responsable/persona actual.
4. Enviar filtros avanzados a sheet.

### 5.4 Filtros avanzados

Los filtros avanzados no deben ocupar espacio permanente.

Abrir desde icono/filter pill del header o barra secundaria.

Filtros posibles si existen datos:

- responsable;
- estado;
- prioridad;
- responsabilidad/categoría;
- fecha;
- requiere verificación;
- vencidas;
- completadas;
- canceladas.

Reglas:

- No mostrar filtros que no tengan datos reales.
- No mostrar 8 chips horizontales permanentes.
- No usar badges largos como `Pendiente de verificación por coordinador`.
- Si hay un filtro activo, mostrar un chip compacto `Filtros: 2`.
- Incluir acción `Limpiar filtros`.
- Mantener filtros al volver del detalle si no confunde.

### 5.5 Orden de prioridad en lista

Orden recomendado para tareas activas:

1. Vencidas.
2. Vencen hoy.
3. Requieren acción del usuario actual.
4. Alta prioridad.
5. Próximas por fecha.
6. Sin fecha.
7. Completadas/canceladas ocultas.

Reglas:

- `Vencida` es condición calculada visual, no estado persistido.
- Una tarea vencida no debe parpadear ni usar rojo agresivo.
- Usar danger suave para borde/pill, no toda la card roja.
- Una tarea sin fecha no debe parecer error.
- Una tarea asignada a otro miembro puede aparecer con menor énfasis si no es urgente.

### 5.6 Task Card

La card de tarea debe mostrar solo lo necesario para decidir.

Contenido visible recomendado:

- checkbox/status control;
- título;
- responsable/avatar o `Sin responsable` si aplica;
- fecha o vencimiento;
- prioridad, solo si es alta o media relevante;
- responsabilidad/categoría, como pill corto;
- estado derivado breve si hace falta.

No mostrar en card por defecto:

- descripción larga;
- historial;
- comentarios;
- adjuntos;
- subtareas;
- IDs;
- created_at/updated_at;
- datos de auditoría;
- verificación larga;
- repeticiones complejas;
- métricas de incumplimiento;
- más de 2 pills.

Estructura sugerida:

```text
[checkbox] Sacar la basura
           Tomás · Hoy 20:00
           Limpieza · Alta
```

Para vencida:

```text
[!] Comprar medicación
    Valeria · Venció ayer
    Salud
```

Para hecha:

```text
[✓] Regar plantas
    Hecha hoy por Ana
```

La tarea hecha debe verse más liviana, no desaparecer instantáneamente si eso puede confundir. Puede moverse a `Hechas` después de feedback breve.

### 5.7 Estados visibles

Estados visibles en card:

| Estado / condición | Cómo mostrar |
|---|---|
| Pendiente | card normal, checkbox vacío |
| En progreso | pill suave `En progreso` si existe |
| Completada | checkbox completo, texto tertiary/tachado suave |
| Cancelada | oculta por defecto; visible en historial/filtro |
| Vencida | pill/borde danger suave; calculado por fecha |
| Próxima a vencer | warning suave si vence hoy/pronto |
| Requiere verificación | pill corto `Revisión` solo si aplica |
| Verificada | ocultar en card salvo que el flujo lo necesite |

### 5.8 Estados ocultos al detalle

Mover al detalle:

- descripción;
- fecha completa;
- creador;
- última edición;
- verificación completa;
- historial;
- comentarios si existieran;
- adjuntos si existieran;
- subtareas si existieran;
- recurrencia;
- dependencias;
- auditoría;
- integración con Goal.

Regla: si un dato no cambia la decisión rápida, no pertenece a la card.

### 5.9 Reglas de prioridad

Si existe prioridad:

- `Alta`: visible siempre, warning/danger suave según vencimiento.
- `Media`: visible solo si ayuda a ordenar.
- `Baja`: ocultar en card; mostrar en detalle.
- Sin prioridad: no mostrar nada.

No usar prioridad como color dominante de toda la card.

Si no existe prioridad en backend:

- no inventar prioridad;
- ordenar por fecha/estado;
- no mostrar chips falsos.

### 5.10 Reglas de verificación

La verificación aparece en el master como feature posible, pero con contradicciones de estado. Decisión UX para MVP:

- No crear un sistema nuevo si backend no lo tiene.
- Si existen campos o estados reales de verificación, mostrarlos.
- Si no existen, ocultar verificación del flujo principal.
- No bloquear completar tarea por una UI de verificación mock.

Modelo visual flexible:

| Caso real disponible | UI recomendada |
|---|---|
| `requires_verification = false` | checkbox normal `Completar` |
| `requires_verification = true`, tarea no hecha | acción `Marcar como hecha` |
| hecha pero no verificada | estado derivado `En revisión` / `Revisión` |
| verificada | estado `Verificada` en detalle o historial |
| rechazada/reabierta si existe | mostrar en detalle con copy factual |

Quién puede verificar:

- si backend define permisos, respetarlos;
- si no está definido, no inventar permisos;
- coordinador puede aparecer como verificador solo si el producto real lo soporta;
- no mostrar botones que fallen por falta de endpoint.

Copy recomendado:

- `Hecha, pendiente de revisión`;
- `Revisada por Ana`;
- `Necesita revisión`;
- `Marcar como hecha`.

Copy prohibido:

- `Esperando que el coordinador apruebe tu obediencia`;
- `No cumpliste`;
- `Fallaste la tarea`.

### 5.11 Canceladas y hechas

Reglas:

- Completadas no deben saturar la vista diaria.
- Canceladas no deben aparecer mezcladas con activas.
- Mostrar sección `Hechas hoy` colapsable si aporta confianza.
- Mostrar `Ver hechas` como acción secundaria.
- Mostrar `Ver canceladas` solo en filtros o detalle/historial.
- No borrar visualmente una tarea completada sin feedback.

Flujo recomendado al completar:

1. Usuario toca checkbox.
2. Haptic light.
3. Checkbox se llena.
4. Título pasa a tachado suave.
5. Toast: `Tarea completada` con `Deshacer` si existe.
6. Lista reordena después de 500–900ms o en próximo refresh.
7. Home se refresca.

Si hay error:

- revertir visualmente;
- toast factual: `No se pudo completar. Reintentá.`;
- no culpar al usuario.

---

## 6. Task Detail

### 6.1 Principio

Task Detail existe para entender y ajustar una tarea, no para convertir cada tarea en proyecto.

Debe abrirse cuando el usuario toca la card, no cuando toca el checkbox.

### 6.2 Formato recomendado

Usar bottom sheet alto o pantalla detalle según complejidad real:

- Sheet mediano para lectura rápida / acciones simples.
- Sheet alto para edición ligera.
- Pantalla full si el proyecto ya tiene muchos campos reales.

Para MVP premium, preferir bottom sheet alto con scroll interno.

### 6.3 Contenido

Orden recomendado:

1. Título.
2. Estado y acción principal.
3. Responsable.
4. Fecha/vencimiento.
5. Responsabilidad/categoría.
6. Prioridad si existe.
7. Descripción si existe.
8. Verificación si aplica.
9. Acciones secundarias.
10. Información avanzada colapsada.

Contenido avanzado colapsado:

- historial;
- comentarios;
- adjuntos;
- recurrencia;
- dependencias;
- creado por;
- última actualización.

### 6.4 Acciones

Acciones primarias posibles:

- `Completar`;
- `Marcar como hecha`;
- `Verificar` si aplica y existe;
- `Guardar cambios` en modo edición.

Acciones secundarias:

- `Editar`;
- `Cambiar responsable` si existe;
- `Reprogramar` si existe fecha;
- `Cancelar tarea`.

Reglas:

- No mostrar 6 botones visibles juntos.
- Agrupar acciones secundarias en menú.
- Acción destructiva siempre en confirm sheet.
- No usar rojo para todo el detalle; solo para cancelar/eliminar.

### 6.5 Layout

- Header del sheet con handle.
- Título grande pero no hero.
- Status pill debajo del título.
- Datos clave en filas limpias.
- Footer sticky solo si hay acción principal.
- Safe area inferior respetada.
- Scroll suave.

### 6.6 Motion

- Apertura sheet: 280–320ms.
- Overlay fade: 160–220ms.
- Tap card: scale 0.98 por 90ms.
- Completar dentro del detalle: misma animación que lista.
- Cierre al guardar: sheet baja, toast aparece después.

---

## 7. Crear tarea

### 7.1 Principio

Crear tarea debe ser rápido. El usuario no debe configurar un proyecto para pedir algo simple del hogar.

Regla:

> Una tarea básica debe poder crearse con título, responsable opcional y fecha rápida.

### 7.2 Formato

Usar `AppBottomSheet` o pantalla modal corta.

Recomendado:

- sheet alto en mobile;
- modal centrado solo en web/tablet si corresponde;
- footer sticky con `Crear tarea`;
- botón secundario `Cancelar` o cierre por swipe.

### 7.3 Vista principal

Campos principales visibles:

1. Título.
2. Responsable.
3. Fecha rápida.
4. Responsabilidad/categoría.
5. Botón `Crear tarea`.

Título:

- placeholder: `¿Qué hay que hacer?`;
- requerido;
- máximo visual recomendado: 80 caracteres antes de mostrar contador/advertencia;
- no usar label técnico `name`.

Responsable:

- mostrar miembros reales del hogar si existen;
- permitir `Sin asignar` si el backend lo permite;
- si hay un solo usuario, preseleccionar usuario actual o dejar claro `Para mí`;
- no mostrar roles técnicos como primer dato.

Fecha rápida:

- `Hoy`;
- `Mañana`;
- `Este finde` si se decide;
- `Elegir fecha`.

Responsabilidad/categoría:

- chips cortos: `Compras`, `Limpieza`, `Mascotas`, `Casa`, `Otro`;
- no convertir responsabilidades en dominio separado;
- si no existe backend para responsabilidad, usar solo campo visual si ya está mapeado o esconderlo.

### 7.4 Más opciones

Colapsar bajo `Más opciones`:

- descripción;
- prioridad;
- hora exacta;
- requiere verificación;
- repetir/recurrencia si existe real;
- notas internas si existen;
- goal si existe real, pero recomendado ocultar en MVP.

Reglas:

- `Más opciones` debe estar cerrado por defecto.
- No más de 5 campos visibles inicialmente.
- Si el usuario abre opciones, conservarlas durante esa creación.
- No mostrar adjuntos/comentarios si no son reales.

### 7.5 Templates

Templates pueden ser útiles como demo premium, pero no deben complicar el flujo.

Ubicación recomendada:

- fila horizontal debajo del título;
- máximo 4 sugerencias;
- visibles solo si no distraen.

Templates posibles:

- `Sacar basura`;
- `Comprar algo`;
- `Limpiar cocina`;
- `Pagar servicio`.

Reglas:

- Template completa título/categoría si existe;
- no crea tareas automáticamente;
- no requiere backend nuevo;
- no mostrar “automatizaciones” como si fueran reales.

### 7.6 Opción “Otro”

`Otro` debe servir para no bloquear al usuario si las categorías no alcanzan.

Reglas:

- `Otro` no abre formulario largo obligatorio.
- Puede permitir texto libre si el backend lo permite.
- Si no se puede guardar categoría libre, guardar sin categoría y no prometer otra cosa.

### 7.7 Verificación en crear tarea

Si existe soporte real:

- mostrar toggle `Requiere revisión` dentro de `Más opciones`;
- explicar en microcopy: `Útil para tareas importantes`;
- no mostrar por defecto en tareas simples;
- no activar automáticamente.

Si no existe soporte real:

- ocultar toggle;
- no usar mock en formulario real.

### 7.8 Validaciones

Validaciones visibles:

- título requerido;
- fecha inválida;
- responsable inválido o no disponible;
- error de permisos;
- error de red/backend.

Copy:

- `Escribí un título para la tarea.`
- `No se pudo crear la tarea. Reintentá.`
- `No tenés permiso para crear tareas en este hogar.`
- `Elegí una fecha válida.`

Reglas:

- Validar inline cuando sea campo puntual.
- Toast para errores generales.
- No limpiar el formulario si falla.
- Botón loading al guardar.
- Deshabilitar doble submit.

---

## 8. Editar tarea

### 8.1 Principio

Editar tarea debe respetar lo que ya existe y no forzar al usuario a reconfigurar todo.

### 8.2 Entrada

Desde Task Detail:

- botón `Editar`;
- menú de tres puntos si hay muchas acciones;
- no desde swipe oculto como única vía.

### 8.3 Campos editables

Mostrar los mismos campos que crear tarea, pero con datos cargados:

- título;
- responsable;
- fecha;
- responsabilidad/categoría;
- descripción;
- prioridad;
- verificación si existe;
- estado si ya existe edición real.

Reglas:

- No cambiar estado por accidente al editar texto.
- Si tarea está completada, edición debe ser secundaria o restringida según backend.
- Si tarea está cancelada, mostrar modo lectura o permitir restaurar solo si existe real.
- Si cambia responsable, usar feedback claro.

### 8.4 Guardado

Al guardar:

- botón loading;
- cierre suave;
- toast `Tarea actualizada`;
- refetch Planner y Home;
- mantener segmento actual;
- si falla, conservar cambios en pantalla.

---

## 9. Confirmar cancelar tarea

### 9.1 Cuándo pedir confirmación

Siempre que una acción deje una tarea cancelada, eliminada o irrelevante para la vista real.

### 9.2 Confirm sheet

Título:

`¿Cancelar esta tarea?`

Body:

`La tarea dejará de aparecer entre las pendientes. Vas a poder verla desde filtros o historial si está disponible.`

Acciones:

- Primaria destructiva: `Cancelar tarea`.
- Secundaria: `Volver`.

Reglas:

- No usar `Eliminar` si el backend cancela/soft-deletea.
- No usar copy dramático.
- No ocultar que desaparecerá de pendientes.
- Haptic warning al confirmar.
- Toast: `Tarea cancelada`.

---

## 10. Calendario — UX final

### 10.1 Principio de Calendario

Calendario debe responder:

> ¿Qué eventos vienen y cuándo pasan?

No debe mezclar tareas dentro del calendario MVP. Las tareas viven en `Tareas` y pueden verse en Home como “Hoy en casa”, pero el calendario debe mostrar eventos.

### 10.2 Estructura Mes + Agenda

Estructura recomendada:

1. Header de mes.
2. Grid mensual compacto.
3. Dots por días con eventos.
4. Agenda del día seleccionado.
5. Empty state del día/mes.
6. CTA `Nuevo evento`.

Regla: Mes + Agenda es más simple y demo-friendly que día/semana/mes completo.

### 10.3 Header de mes

Debe incluir:

- mes y año;
- flecha anterior;
- flecha siguiente;
- botón `Hoy` como secundario si hay espacio.

Ejemplo:

`Junio 2026    <  Hoy  >`

Reglas:

- No usar header gigante.
- No mostrar clima, finanzas o tareas.
- No mostrar selector de vista día/semana/mes si no está implementado.

### 10.4 Dots

Los dots indican eventos.

Reglas:

- máximo 3 dots visibles por día;
- si hay más, usar `+` o dot agregado;
- colores suaves, no saturados;
- no usar rojo salvo evento crítico real;
- dot no debe depender de tareas.

### 10.5 Agenda

La agenda muestra eventos del día seleccionado.

Event row/card debe mostrar:

- hora;
- título;
- participantes/miembros si existen;
- ubicación si existe;
- estado si no está programado normal.

No mostrar:

- descripción larga;
- metadata técnica;
- creador;
- auditoría;
- notificaciones;
- álbum automático;
- Geni insights.

### 10.6 Event row/card

Formato simple:

```text
09:00  Turno médico
       Ana · Clínica
```

Evento familiar:

```text
18:30  Reunión del cole
       Valeria, Tomás
```

Evento cancelado:

```text
Cancelado · Cumpleaños familiar
```

Reglas:

- Estados cancelados se ven suaves, no como error del sistema.
- Eventos completados pueden quedar en tertiary o moverse abajo.
- Eventos futuros dominan la agenda.

### 10.7 No mostrar tareas en Calendario

Decisión explícita:

- No mezclar tareas como eventos.
- No convertir fechas de tareas en bloques de calendario.
- No mostrar tareas vencidas en el grid mensual.
- No usar dots de tareas.

Motivo:

- reduce confusión;
- mantiene calendario limpio;
- evita duplicar Planner/Tareas;
- permite demo clara: tareas reales en un segmento, eventos reales en otro.

Si se necesita relación:

- en Tareas mostrar fecha;
- en Home mostrar “Hoy en casa” con tareas + eventos;
- en Event Detail, no listar tareas asociadas salvo feature real.

### 10.8 Estados vacíos

Día sin eventos:

Título: `No hay eventos este día.`

Body: `Podés crear uno si hay algo que la familia tenga que recordar.`

CTA: `Nuevo evento`.

Mes sin eventos:

Título: `Todavía no hay eventos este mes.`

Body: `Agregá turnos, reuniones o planes familiares para tenerlos a mano.`

CTA: `Crear evento`.

Regla: no usar empty state que diga “No hay nada” sin acción.

---

## 11. Event Detail

### 11.1 Principio

Event Detail debe permitir entender un evento y actuar sobre él sin abrir una pantalla pesada.

### 11.2 Formato

Preferir bottom sheet alto.

Contenido:

1. Título.
2. Fecha y hora.
3. Participantes.
4. Ubicación.
5. Descripción/notas.
6. Estado.
7. Acciones.

Acciones:

- `Editar`;
- `Cancelar evento`;
- `Compartir` solo si existe real;
- `Agregar a calendario externo` solo post-MVP/no mostrar si no existe.

### 11.3 Estados

| Estado | UI |
|---|---|
| Programado | normal |
| Completado | tertiary, bajo énfasis |
| Cancelado | pill suave, no ocupa agenda activa |

Reglas:

- `Postergado` no debe existir como estado si la fuente dice que se modifica fecha.
- Para postergar, usar editar fecha.
- No mostrar notificaciones reales si no existen.

---

## 12. Crear evento

### 12.1 Principio

Crear evento debe ser tan simple como agendar algo familiar.

### 12.2 Vista principal

Campos principales:

1. Título.
2. Fecha.
3. Hora inicio.
4. Hora fin opcional o duración.
5. Participantes.
6. Ubicación opcional.
7. CTA `Crear evento`.

### 12.3 Más opciones

Colapsar bajo `Más opciones`:

- descripción;
- recordatorio si existe real;
- evento de todo el día;
- repetición si existe real;
- privacidad si existe real.

Reglas:

- No mostrar FamilyCloud/álbum automático.
- No mostrar Geni automatizaciones.
- No mostrar invitaciones externas si no existen.
- No forzar participantes si el evento puede ser familiar general.

### 12.4 Fecha y hora rápida

Atajos permitidos:

- `Hoy`;
- `Mañana`;
- `Este finde`;
- `Elegir fecha`.

Para hora:

- selector simple;
- evitar rueda compleja si no está implementada bien;
- validar fin después de inicio.

### 12.5 Validaciones

- título requerido;
- fecha requerida;
- hora inválida;
- fin anterior a inicio;
- participante inválido;
- error de permisos;
- backend inaccesible.

Copy:

- `Escribí un título para el evento.`
- `Elegí una fecha válida.`
- `La hora de fin debe ser posterior al inicio.`
- `No se pudo crear el evento. Reintentá.`

---

## 13. Editar evento

### 13.1 Entrada

Desde Event Detail:

- botón `Editar`;
- menú secundario si hay acciones.

### 13.2 Campos

Mismos campos que crear evento, precargados.

Reglas:

- Cambiar fecha equivale a postergar.
- No agregar estado `Postergado`.
- Si un evento está cancelado, editar debe ser limitado o requerir restaurar si existe real.
- Al guardar, refrescar Agenda, Home y Planner.

### 13.3 Feedback

- Toast: `Evento actualizado`.
- Si cambia fecha: `Evento movido al [día]`.
- Si falla: `No se pudo actualizar. Reintentá.`.

---

## 14. Confirmar cancelar evento

### 14.1 Confirm sheet

Título:

`¿Cancelar este evento?`

Body:

`El evento dejará de aparecer como programado para la familia.`

Acciones:

- Primaria destructiva: `Cancelar evento`.
- Secundaria: `Volver`.

Reglas:

- No eliminar silenciosamente.
- Haptic warning al confirmar.
- Toast: `Evento cancelado`.
- Refetch Home y Planner.
- Mantener al usuario en Calendario.

---

## 15. Metas — Próximamente

### 15.1 Principio

Metas puede reforzar sensación premium, pero no debe prometer backend real si no existe.

### 15.2 Ubicación

Opciones:

1. Segmento `Metas` con estado `Próximamente`.
2. Card inferior en Planner.
3. Card en More como módulo demo.

Recomendación MVP:

- Si Planner ya tiene 3 segmentos, usar `Metas` como preview.
- Si Planner está pesado, no poner segmento; usar card inferior `Metas familiares — Próximamente`.

### 15.3 Visual premium

Card de Metas:

- surface soft/glass suave;
- icono simple;
- título `Metas familiares`;
- texto `Pronto vas a poder conectar objetivos con tareas.`;
- 2–3 cards mock pequeñas;
- CTA disabled o `Ver preview`.

Ejemplos mock:

- `Ordenar la casa antes del finde`;
- `Ahorrar para vacaciones`;
- `Mejorar rutina semanal`.

No mostrar:

- progreso real si no existe;
- crear meta real;
- hitos editables;
- integración con Finance real;
- Geni creando metas.

### 15.4 Copy obligatorio

Usar una señal clara:

- `Próximamente`;
- `Preview`;
- `Demo visual` solo internamente, no necesariamente al usuario final.

No decir:

- `Activado`;
- `IA generó esta meta`;
- `Conectado con tus finanzas` si no es real.

---

## 16. Empty states

### 16.1 Principio

Un empty state debe invitar a una acción útil, no confirmar ausencia.

### 16.2 Tareas vacías

Sin tareas activas:

Título: `No hay tareas pendientes.`

Body: `Podés crear una para coordinar algo simple del hogar.`

CTA: `Nueva tarea`.

Si es usuario solo:

Body alternativo: `Agregá recordatorios propios y HomePlus empieza a ordenarte el día.`

Si filtros activos:

Título: `No hay tareas con estos filtros.`

Body: `Probá limpiar filtros o cambiar responsable.`

CTA: `Limpiar filtros`.

### 16.3 Calendario vacío

Sin eventos:

Título: `No hay eventos próximos.`

Body: `Agregá turnos, reuniones o planes familiares para verlos acá.`

CTA: `Nuevo evento`.

### 16.4 Metas próximamente

Título: `Metas llega después.`

Body: `Primero hacemos que tareas y eventos funcionen simple y bien.`

CTA: no primaria real.

---

## 17. Loading states

### 17.1 Carga inicial

Usar skeleton si la carga tarda más de 300ms.

Skeleton recomendado:

- header real o skeleton de header;
- segmented control skeleton;
- 3 task cards skeleton;
- para calendario: grid skeleton + agenda row skeleton.

No usar:

- spinner grande en medio para listas;
- pantalla blanca;
- loaders diferentes por segmento.

### 17.2 Refresh

Pull-to-refresh o refetch tras acción:

- mantener contenido anterior;
- mostrar indicador liviano;
- no bloquear navegación;
- si hay error, conservar datos anteriores con mensaje.

### 17.3 Guardando

En forms:

- botón con loading;
- inputs siguen visibles;
- evitar doble submit;
- no cerrar hasta confirmar éxito;
- si tarda demasiado, mantener feedback `Guardando…`.

---

## 18. Error y offline states

### 18.1 Backend inaccesible

Mostrar banner/card suave:

Título: `No pudimos actualizar Planner.`

Body: `Mostramos la última información disponible. Reintentá en unos segundos.`

CTA: `Reintentar`.

Reglas:

- no borrar listas existentes;
- no cerrar sesión por error de red;
- no mostrar stack traces;
- no usar rojo total salvo error destructivo.

### 18.2 Offline

Si se detecta offline:

- banner compacto: `Sin conexión`;
- deshabilitar crear/editar si no hay sync real;
- permitir leer datos cacheados si ya existen;
- no prometer “se sincronizará después” si offline sync no existe.

Copy seguro:

`Sin conexión. Algunas acciones pueden no estar disponibles.`

Copy prohibido si no hay sync:

`Tus cambios se sincronizarán automáticamente.`

### 18.3 Sesión vencida

Planner no maneja auth profunda. Debe delegar al shell/global state.

Comportamiento:

- mostrar estado global de sesión vencida;
- navegar a Auth según Navigation Shell;
- no mostrar errores técnicos en Planner.

### 18.4 Error en acción puntual

Completar tarea falla:

- revertir checkbox;
- toast: `No se pudo completar. Reintentá.`;
- mantener tarea visible.

Crear tarea falla:

- mantener sheet abierto;
- mostrar error;
- conservar campos.

Cancelar evento falla:

- mantener Event Detail;
- toast: `No se pudo cancelar el evento.`.

---

## 19. Motion y haptics en Planner

### 19.1 Completar tarea

Motion:

- tap feedback inmediato <100ms;
- checkbox fill 300ms;
- scale 0.9 → 1.0 en 200ms;
- título pasa a tertiary/tachado suave;
- reorder diferido;
- toast después del estado visual.

Haptic:

- light al completar;
- success si el backend confirma y se desea reforzar;
- warning si falla y se revierte.

### 19.2 Abrir sheets

- sheet entra 280–320ms;
- overlay fade 160–220ms;
- handle visible;
- haptic light/selection al abrir acciones principales.

### 19.3 Cambiar filtros

- selection haptic al elegir chips;
- transición lista 160–240ms;
- no animar cada card individualmente si hay muchas;
- preservar scroll razonablemente.

### 19.4 Crear evento/tarea

Al guardar con éxito:

- cerrar sheet;
- haptic success;
- toast;
- nueva card puede aparecer con fade 160–240ms;
- no usar confetti.

### 19.5 Prohibiciones

No usar:

- confetti por completar tareas domésticas;
- shake para tareas vencidas;
- parpadeo rojo;
- animaciones >500ms;
- haptics por cada item de lista;
- transición pesada entre Tareas y Calendario.

---

## 20. Reglas visuales y de composición

### 20.1 Jerarquía

Orden de énfasis:

1. Acción pendiente o evento próximo.
2. Responsable/fecha.
3. Categoría/estado.
4. Descripción/detalle.
5. Metadata.

### 20.2 Cards permitidas

Permitidas:

- TaskCard;
- EventCard/EventRow;
- EmptyState card;
- ErrorState card;
- GoalPreview card;
- Summary compacta.

No permitidas en Planner principal:

- Finance card;
- Inventory card;
- Presence card;
- Activity feed completo;
- métricas de carga completas;
- Geni dashboard;
- gráficos grandes.

### 20.3 Badges y pills

Reglas:

- máximo 2 pills por card;
- pills de máximo 16 caracteres idealmente;
- usar `Alta`, `Vencida`, `Limpieza`, `Revisión`;
- no usar frases largas;
- no usar 4 colores en una card.

### 20.4 Metadata

Ocultar metadata si no aporta:

- IDs;
- timestamps técnicos;
- created_at;
- updated_at;
- fuente de sync;
- usuario creador si no modifica decisión.

Mostrar metadata solo en detalle si:

- ayuda a confiar;
- explica un error;
- resuelve responsabilidad;
- forma parte de auditoría real.

### 20.5 Densidad

Planner debe tener densidad media:

- no tan vacío que parezca incompleto;
- no tan cargado que parezca admin panel.

Regla mobile:

- 4–6 cards visibles parcialmente en una pantalla es razonable;
- más densidad requiere cards compactas, no texto más chico.

---

## 21. Accesibilidad

### 21.1 Targets táctiles

- Mínimo 44x44px.
- Checkboxes de tarea deben ser fáciles de tocar.
- No depender de swipe oculto.
- Acciones destructivas no deben estar pegadas a acciones primarias.

### 21.2 Texto

- Respetar Dynamic Type si la plataforma lo permite.
- No bajar body de 15–16px.
- Caption/micro solo para datos secundarios.
- Adulto mayor: mayor tamaño, menos densidad, acciones más explícitas.

### 21.3 Color

- No comunicar estado solo con color.
- Vencida debe tener texto/pill además de color.
- Cancelada debe tener label además de opacidad.
- Contraste alto para texto primario/secundario.

### 21.4 Screen readers

Labels recomendados:

- Checkbox: `Completar tarea: Sacar la basura`.
- Tarea vencida: `Tarea vencida: Comprar medicación, asignada a Valeria`.
- Evento: `Evento a las 18:30: Reunión del colegio`.
- Botón crear: `Crear nueva tarea` / `Crear nuevo evento`.

### 21.5 Motion reducido

Si reduced motion está activo:

- quitar scale decorativo;
- mantener cambios visuales instantáneos;
- no usar pulse skeleton;
- mantener feedback textual.

---

## 22. Performance

### 22.1 Listas

- Usar lista virtualizada para muchas tareas.
- No renderizar detalles completos en cada card.
- Memoizar TaskCard/EventRow si aplica.
- Evitar re-render global al tocar un checkbox.
- Paginar o limitar completadas/canceladas si hay muchas.

### 22.2 Calendario

- Renderizar mes actual y adyacentes mínimos.
- No recalcular dots de todo el año en cada render.
- No mezclar tareas en calendario para evitar cómputo extra.
- Agenda del día debe depender solo del día seleccionado.

### 22.3 Blur/glass

- Usar blur solo en tab bar/sheets si plataforma lo soporta.
- No poner blur en cada card.
- Android/Web fallback: surface opaca con sombra/borde.
- Evitar blur en listas largas.

### 22.4 Re-render por filtros

- Aplicar filtros sobre dataset memoizado.
- Debounce si hay búsqueda local.
- No animar layout de 50 cards simultáneamente.

### 22.5 Formularios

- Validación local simple antes de enviar.
- Evitar submits duplicados.
- Mantener inputs controlados sin lag.
- No bloquear toda la app al guardar.

---

## 23. Reglas por plataforma

### 23.1 iOS

- Sensación premium con glass en sheets/tab bar.
- Haptics light/selection/success.
- Safe area estricta.
- Bottom sheets con gesto natural.
- Sombras suaves.

### 23.2 Android

- Fallback sin blur pesado.
- Elevation controlada.
- Haptics si están disponibles, sin depender de ellos.
- Back físico cierra sheet antes de salir del tab.
- Evitar transparencias costosas.

### 23.3 Web

- Planner puede mantener ancho máximo.
- No expandir cards a todo el desktop si se ven vacías.
- Hover sutil en cards/botones.
- Modal centrado permitido para forms.
- Keyboard navigation en segment/filtros.

---

## 24. Deep navigation y refresh

### 24.1 Desde Home

- Card de tareas → Planner / segmento `Tareas`.
- Card de eventos → Planner / segmento `Calendario`.
- Empty state Home tarea → abrir Create Task Sheet.
- Empty state Home evento → abrir Create Event Sheet.

### 24.2 Desde Quick Actions

- `Nueva tarea` → Create Task Sheet.
- `Nuevo evento` → Create Event Sheet.
- Si se abre desde otro tab, mantener contexto post-guardar:
  - si estaba en Home, volver a Home y refrescar;
  - si estaba en Planner, mantener segmento correspondiente;
  - si se ofrece toast, acción secundaria `Ver en Planner`.

### 24.3 Desde notificación/deep link

- Activar tab Planner.
- Preseleccionar segmento.
- Abrir detalle o hacer focus visual.
- Si el item no existe, mostrar ErrorState y acción `Volver`.

### 24.4 Refetch

Refetch obligatorio después de:

- crear tarea;
- completar tarea;
- editar tarea;
- cancelar tarea;
- crear evento;
- editar evento;
- cancelar evento.

Refetch recomendado:

- Planner activo;
- Home si muestra tareas/eventos;
- datos de badges en tab bar si existen.

---

## 25. Checklist de implementación

### 25.1 Shell

- [ ] Planner usa `AppScreen`.
- [ ] Header compacto con título `Planner`.
- [ ] Segmentos internos definidos.
- [ ] No hay dashboard global pesado arriba.
- [ ] CTA contextual cambia por segmento.
- [ ] Back físico/cierre de sheets funciona.

### 25.2 Tareas

- [ ] Lista muestra tareas activas.
- [ ] Vencidas se calculan visualmente, no como estado nuevo.
- [ ] Responsable visible si existe.
- [ ] Fecha visible si existe.
- [ ] Prioridad visible solo si aporta.
- [ ] Card no supera 2 pills principales.
- [ ] Checkbox completa sin abrir detalle.
- [ ] Completadas no saturan vista principal.
- [ ] Canceladas ocultas por defecto.
- [ ] Filtros avanzados en sheet.
- [ ] Error al completar revierte UI.

### 25.3 Crear/editar tarea

- [ ] Crear tarea tiene máximo 4–5 campos principales.
- [ ] Más opciones colapsado.
- [ ] Título requerido con error inline.
- [ ] Responsable no rompe si hay un solo usuario.
- [ ] Fecha rápida existe o selector simple.
- [ ] Verificación solo si hay soporte real.
- [ ] Submit loading y sin doble envío.
- [ ] Refetch Planner/Home al guardar.

### 25.4 Calendario

- [ ] Segmento Calendario usa Mes + Agenda.
- [ ] Header de mes simple.
- [ ] Dots solo representan eventos.
- [ ] Agenda muestra eventos del día.
- [ ] Tareas no aparecen en calendario.
- [ ] Estado vacío con CTA.
- [ ] Crear/editar/cancelar evento refresca Home/Planner.

### 25.5 Metas

- [ ] Metas no usa backend real si no existe.
- [ ] Se muestra como Próximamente/preview.
- [ ] No permite crear meta real falsa.
- [ ] No promete integración Finance/Geni real.

### 25.6 Estados

- [ ] Skeleton si carga >300ms.
- [ ] ErrorState conserva datos si hay cache.
- [ ] Offline no promete sync si no existe.
- [ ] Sesión vencida delega a shell global.
- [ ] Toasts son factuales y no culpan.

### 25.7 Visual QA

- [ ] Planner se lee en menos de 5 segundos.
- [ ] No hay más de 3 colores dominantes.
- [ ] Cards con spacing consistente.
- [ ] No hay badges largos.
- [ ] No hay metadata técnica visible.
- [ ] Dark/Android fallback no rompe legibilidad si aplica.
- [ ] Safe area inferior no tapa CTA.

---

## 26. Criterios de aceptación UX

Planner está listo visualmente si:

1. Un usuario entiende qué tiene pendiente sin abrir filtros.
2. Completar una tarea se siente inmediato.
3. Crear una tarea simple no requiere más de 3 decisiones principales.
4. Eventos se entienden como agenda, no como lista técnica.
5. El calendario no se contamina con tareas.
6. Metas se ven premium pero claramente no prometen feature real.
7. Tareas hechas/canceladas no saturan el día.
8. Las tareas vencidas se ven importantes sin parecer alarma.
9. El usuario puede volver a Home y ver el resumen actualizado.
10. La UI se siente HomePlus, no Trello/Asana/Google Calendar clonado.

---

## 27. Qué NO hacer

No hacer:

- convertir Planner en dashboard con 8 widgets;
- mostrar métricas de carga arriba de todo;
- mezclar tareas dentro del calendario;
- crear estado persistido `Vencida`;
- inventar endpoints;
- cambiar contratos backend;
- eliminar funcionalidad real para simplificar;
- mostrar Goals como feature real si no existe;
- mostrar Geni reasignando o completando tareas;
- mostrar subtareas/comentarios/adjuntos si no son reales;
- usar rojo agresivo para todo lo vencido;
- usar confetti al completar;
- esconder acciones reales detrás de gestos invisibles;
- llenar cada card con 4 badges;
- mostrar timestamps técnicos;
- usar copy acusatorio;
- usar “postergado” como estado si editar fecha resuelve el caso;
- prometer offline sync si no existe;
- crear una navegación paralela dentro de Planner.

---

## 28. Fases sugeridas de implementación

### Fase 1 — Shell visual de Planner

Objetivo:

- header compacto;
- segmented control;
- layout base;
- CTA contextual;
- estados loading/empty/error base.

No tocar backend.

### Fase 2 — Tareas livianas

Objetivo:

- TaskCard final;
- orden por prioridad/vencimiento;
- completar con feedback;
- filtros avanzados en sheet;
- crear/editar tarea con campos principales y más opciones.

No eliminar campos existentes: moverlos al detalle o más opciones.

### Fase 3 — Calendario Mes + Agenda

Objetivo:

- month header;
- grid con dots;
- agenda del día;
- create/edit/cancel event;
- empty states.

No mostrar tareas dentro del calendario.

### Fase 4 — Detalles y confirmaciones

Objetivo:

- Task Detail;
- Event Detail;
- confirm cancel task;
- confirm cancel event;
- motion/haptics coherentes.

### Fase 5 — Metas próximamente y polish premium

Objetivo:

- card/segment de Goals preview;
- microcopy premium;
- performance pass;
- accessibility pass;
- QA visual final.

---

## 29. Resumen ejecutivo para Codex/Antigravity

Implementar Planner como una pantalla de coordinación diaria con tres capas:

1. **Tareas reales**: lista clara, cards livianas, completar rápido, crear/editar bajo sheet, filtros bajo demanda.
2. **Calendario real**: Mes + Agenda, eventos solamente, crear/editar/cancelar con confirmaciones.
3. **Metas demo premium**: preview “Próximamente”, sin backend real ni promesas falsas.

Prioridad visual:

- menos widgets;
- menos badges;
- más claridad;
- acciones frecuentes visibles;
- opciones avanzadas escondidas;
- Home y Planner sincronizados por refetch;
- tono humano, factual y no acusatorio.

PLANNER UX READY
