# HomePlus — Planner Final

**Estado del documento:** especificación normativa final v2 — decisiones funcionales, visuales y técnicas cerradas  
**Fecha de snapshot:** 2026-07-11  
**Alcance:** Planner completo de HomePlus  
**Módulos cubiertos:** Tasks, Events, Calendar, Goals, Milestones, Verification, Quick Actions, Home summary, Templates, Task Packs, Recommendations, Realtime, Offline limitado, Telemetría, Audit e integración con Inventory  
**Módulos fuera de implementación:** Geni, Finance, Assets, Medication, Documents y Feed; únicamente se definen contratos de extensión  
**Autoridad:** este archivo reemplaza cualquier decisión previa contradictoria sobre Planner  
**Estado del código actual:** usable end-to-end, pero todavía no cumple toda esta especificación  

---

# 0. Propósito del documento

Este documento es la fuente única de verdad para terminar Planner.

A partir de su aprobación:

- no quedan alternativas de producto abiertas;
- no se rediseña cada pantalla durante la implementación;
- toda diferencia con el repositorio se registra como gap;
- backend, base de datos y frontend se implementan mediante vertical slices;
- Geni y Finance no condicionan el funcionamiento de Planner;
- las animaciones se implementan únicamente cuando los flujos, estados y layouts estén cerrados.

Planner no se considera terminado solamente porque guarda datos correctamente. Se considera terminado cuando una persona puede convertir una necesidad doméstica en un plan claro, ejecutarlo con pocas interacciones y recuperarse fácilmente cuando algo cambia.

> **La complejidad vive dentro de HomePlus; la persona recibe claridad, recomendaciones y acciones simples.**

---

# 1. Declaración final del producto

Planner es el sistema operativo de coordinación doméstica de HomePlus.

Su responsabilidad es transformar:

```text
necesidad
→ plan
→ acción
→ seguimiento
→ resultado
→ aprendizaje estructurado
```

Planner debe responder cinco preguntas:

1. ¿Qué necesita atención ahora?
2. ¿Qué ocurre y cuándo?
3. ¿Quién es responsable?
4. ¿Qué estamos intentando conseguir?
5. ¿Cuál es el siguiente paso más útil?

Planner no debe sentirse como:

- una planilla;
- un gestor empresarial;
- una colección de formularios;
- una lista interminable de chips;
- una herramienta de vigilancia familiar;
- una experiencia punitiva;
- un chatbot indispensable para operar.

Planner debe sentirse:

- rápido;
- ordenado;
- tranquilo;
- predecible;
- colaborativo;
- reversible;
- inteligente incluso sin IA generativa.

---

# 2. Principios normativos

Todas las decisiones de Planner deben cumplir estos principios.

## P1. Organization-first

La pantalla siempre debe dejar claro:

- dónde está la persona;
- qué información importa;
- qué puede hacer ahora;
- qué ocurrirá después.

## P2. Action-first

El estado principal de una entidad debe incluir una acción útil, no únicamente información.

## P3. Automation-first, control-always

El sistema recomienda, precompleta y organiza. La persona conserva autoridad final.

Flujo esperado:

```text
intención
→ sugerencia
→ preview
→ confirmación
→ ejecución
→ corrección o deshacer
```

## P4. Progressive disclosure

La ruta cotidiana muestra lo mínimo. La capacidad avanzada sigue disponible, pero no compite con la acción principal.

## P5. Recommend before asking

Planner debe proponer defaults basados en contexto antes de abrir selectores.

## P6. No fake intelligence

No mostrar:

- porcentajes inventados;
- riesgo opaco;
- mensajes de Geni simulados;
- recomendaciones sin evidencia;
- carga familiar calculada con datos incompletos.

## P7. Human and non-punitive

No usar:

- “Fracasaste”.
- “Miembro irresponsable”.
- rankings familiares;
- culpa por rachas;
- colores rojos para estados normales;
- mensajes moralizantes.

## P8. Reversible by default

Editar, reabrir, restaurar y deshacer deben ser posibles cuando no rompan integridad.

## P9. Safe under chaos

Un usuario puede tocar repetidamente, cambiar de pantalla, perder conexión o cambiar de hogar. La app debe seguir siendo coherente.

## P10. Backend authority

El frontend nunca decide por sí solo:

- permisos;
- household;
- transición de estado;
- progreso canónico;
- acceso a entidades privadas;
- resultado de una operación concurrente.

## P11. Geni-ready, Geni-independent

Planner expone herramientas estructuradas para Geni, pero funciona completamente sin Geni.

## P12. One source of truth

Home, Planner, Search y Realtime usan los mismos contratos y read models.

---

# 3. Alcance definitivo

## 3.1 Planner Core Final

Obligatorio antes de declarar “solo faltan animaciones”:

- Tasks.
- Events.
- Month, Week, Day y Agenda.
- Goals y Milestones.
- Verification.
- Quick Actions.
- Home summary.
- Search.
- Estados completos de UI.
- Permissions y privacidad.
- Archive, Trash y Restore.
- Realtime multiusuario.
- Offline limitado.
- Concurrencia e idempotencia.
- Telemetría y Audit.
- QA automatizado.
- Performance medida.
- Integración funcional con Inventory.
- Templates y Task Packs básicos.
- Recommendations Engine determinístico.

## 3.2 Planner Product Complete

También forma parte del producto final:

- TaskDetail y EventDetail completos.
- Goal lifecycle completo.
- Vincular Tasks existentes.
- Task dentro de Milestone.
- Historial numeric.
- Participants.
- Notes, Comments y Activity.
- Reminders.
- Recurrencia avanzada.
- Evidence links.
- Templates personalizadas.
- Exportación.
- Saved filters quedan fuera de Planner v2. Solo podrán agregarse mediante una futura decisión basada en telemetría; no bloquean el cierre.

## 3.3 Extensiones preparadas, no implementadas aquí

### Geni

Planner define:

- tool contracts;
- preview;
- commit;
- permissions;
- idempotency;
- audit;
- rollback.

No define:

- modelo;
- prompts;
- conversación;
- UI completa de Geni;
- memoria conversacional.

### Finance

Planner puede recibir referencias y eventos de Finance, pero no calcula:

- balances;
- presupuestos;
- movimientos;
- cuentas;
- deudas.

### Otros módulos

Assets, Medication, Documents y Feed se conectan mediante adapters futuros.

## 3.4 Integración permitida ahora

Inventory sí entra porque ya existe y debe poder originar Tasks, recomendaciones y packs.

---

# 4. Terminología canónica

| Término | Definición |
|---|---|
| Household | Hogar activo que delimita datos, permisos y realtime. |
| Membership | Relación de una persona con un hogar. Los responsables siempre se referencian por membership. |
| Task | Acción concreta que puede completarse. |
| Event | Hecho temporal que ocurre en una fecha u horario. |
| Goal | Resultado que el hogar o una persona quiere alcanzar. |
| Milestone | Paso significativo dentro de una Goal. No es una Task. |
| Task Pack | Conjunto revisable de Tasks para resolver una situación. |
| Template | Estructura reutilizable para crear una Goal, rutina o Task Pack. |
| Routine | Template recurrente orientada a ejecución repetida. |
| Recommendation | Propuesta explicable y reversible generada por reglas. |
| Personal | Visible solo para owner y participantes explícitos. |
| Household | Visible para miembros activos con capability correspondiente. |
| Archive | Oculta sin eliminar. |
| Trash | Soft delete temporal con posibilidad de restore. |
| Audit | Registro técnico inmutable de acciones relevantes. |
| Activity | Timeline humano visible dentro de la entidad. |
| Telemetry | Datos de uso y rendimiento sin contenido doméstico sensible. |

---

# 5. Decisiones finales cerradas

## 5.1 Navegación

- Planner mantiene tres tabs internas: `Tareas`, `Calendario`, `Metas`.
- Planner abre por defecto en la última tab utilizada.
- Primera entrada sin preferencia: `Tareas`.
- Tap en una card abre Detail.
- Crear y editar usan bottom sheet grande cuando el contexto lo permite.
- Flujos complejos usan screen completa.
- Back durante submit no cierra silenciosamente.
- Search es un flujo unificado de Planner con filtros por tipo.
- Home resume; Planner administra.
- Quick Actions inicia creaciones globales.

## 5.2 Tasks

- `due_date` es opcional.
- `due_time` solo existe si hay `due_date`.
- Una Task sin fecha se muestra en `Sin fecha`, no como error.
- Prioridades finales: `low`, `normal`, `high`.
- Se elimina `critical`; los valores existentes migran a `high`.
- Urgencia y prioridad no son lo mismo.
- Overdue es derivado.
- Responsable es `household_members.id`.
- Default global: `Sin asignar`.
- Planner puede sugerir un responsable y guardarlo si la sugerencia es visible en el preview.
- Una Task puede pertenecer a una Goal.
- Una Task puede pertenecer a un Milestone de esa misma Goal.
- Una Task solo pertenece a una Goal a la vez.
- Tasks personales existen.
- Tasks recurrentes existen.
- TaskDetail dedicado entra.
- Bulk actions existen únicamente en contextos explícitos: selección, pack, template o administración.
- Completed y Verified pueden reabrirse con permisos.
- Cancel y Trash son conceptos distintos.
- Restore entra.

## 5.3 Segmentación de Tasks

Segment principal visible:

- `Hoy`.
- `Próximas`.
- `Hechas`.

Reglas:

- vencidas aparecen primero dentro de `Hoy`, bajo sección `Necesitan atención`;
- awaiting verification aparece en `Hoy` o `Próximas` según fecha, con estado visible;
- `Mías`, `Sin asignar`, Tipos, prioridades y estados viven en Filter Sheet;
- no se muestran varias filas permanentes de filtros;
- `Sin fecha` aparece como sección dentro de Próximas y como filtro.

## 5.4 Gestos

- Tap: abrir Detail.
- Swipe derecho: acción positiva contextual.
- Swipe izquierdo: revelar acciones.
- Long press: menú contextual.
- `•••`: mismo menú que long press.
- Swipe nunca elimina directamente.
- Long press nunca edita directamente.
- Drag solo aparece en modo Reordenar.
- Todo gesto tiene alternativa visible y accesible.

## 5.5 Events

- Estado final: `scheduled` o `cancelled`.
- Archive y Trash se representan con timestamps, no nuevos status.
- `all_day` entra.
- End es opcional en request; backend completa un default.
- Evento timed sin end: start + 60 minutos.
- Evento all-day sin end: mismo día.
- Participants y RSVP entran.
- Visibility personal y household entra.
- Recurrence canónica usa RFC 5545 RRULE.
- Scopes: `this_occurrence`, `this_and_following`, `entire_series`.
- Conflict detection es advisory, no bloqueante.
- Tasks pueden vincularse a Event mediante link explícito.
- Calendar diferencia visualmente Tasks y Events.
- Month no se satura con títulos completos.

## 5.6 Goals

- Modos: `steps`, `tasks`, `numeric`, `boolean`, `none`.
- Default: `steps`.
- Goal no se completa automáticamente al llegar a 100%.
- `null` no es `0`.
- `awaiting_verification` no cuenta en progreso.
- Status finales: `active`, `completed`, `closed`.
- `failed` se migra a `closed`.
- Copy visible: `Cerrada`, nunca `Fallida`.
- Archive es timestamp separado.
- Owner obligatorio.
- Responsable principal opcional.
- Participants entran.
- Personal es owner-only hasta compartir explícitamente.
- Coordinator no ve Goals personales ajenas.
- Priority: low, normal, high.
- Pin es preferencia por usuario.
- Reopen, Duplicate, Archive y Restore entran.
- Numeric usa endpoint atómico e historial.
- `none` significa sin fórmula, no sin acciones.
- Goal recurrente crea nueva instancia; no resetea la anterior.

## 5.7 Quick Actions

Orden final:

1. Nueva tarea.
2. Nuevo evento.
3. Nueva meta.
4. Invitar persona, separado visualmente y solo con capability.

Inventory no agrega una quinta acción global. Sus acciones son contextuales dentro de Inventory, Home o Recommendations.

## 5.8 Home

- Puede completar una Task simple en un tap.
- Si requiere verificación, la envía a revisión.
- No permite editar, cancelar ni administrar lifecycle complejo.
- Muestra máximo:
  - tres Tasks;
  - tres Events;
  - una Goal.
- Si no hay Goal relevante, la sección se omite.
- Home consume un summary backend determinístico.
- No calcula riesgo ni progreso localmente.

## 5.9 Archive, Trash y Delete

- Archive: reversible, no destructivo.
- Trash: soft delete reversible durante 30 días.
- Hard delete: job posterior a retención, salvo datos de Audit.
- Entidades activas con relaciones requieren resolución antes de hard delete.
- El usuario puede Restore desde Trash si conserva permisos.
- Audit preserva identificadores y snapshots mínimos.

## 5.10 Realtime

Realtime robusto forma parte del cierre, no queda como aspiración futura.

## 5.11 Offline

Entra soporte offline limitado:

- lectura cacheada;
- create/update/complete de Task;
- toggle Milestone;
- create Task simple;
- cola con idempotency.

Acciones destructivas, verification sensible, series recurrentes y cambios masivos requieren conexión.

---

# 6. Roles y capabilities

## 6.1 Regla

Los roles entregan defaults. Las capabilities son la autoridad.

`households.config.permissions` puede ajustar capacidades, pero no violar invariantes estructurales.

## 6.2 Roles técnicos

- coordinator;
- adult;
- adolescent;
- child;
- senior;
- guest.

## 6.3 Capabilities Planner

```text
planner.view
planner.search
task.create_household
task.create_personal
task.assign_self
task.assign_members
task.edit_own
task.edit_any
task.complete_assigned
task.complete_unassigned
task.complete_any
task.verify
task.cancel_own
task.cancel_any
task.archive
task.restore
event.create_household
event.create_personal
event.edit_own
event.edit_any
event.cancel_own
event.cancel_any
event.manage_participants
goal.create_household
goal.create_personal
goal.edit_own
goal.edit_any
goal.complete_own
goal.complete_any
goal.close_own
goal.close_any
goal.manage_participants
goal.archive
goal.restore
planner.templates.use
planner.templates.manage
planner.audit.view
planner.settings.manage
```

## 6.4 Defaults por rol

| Capability resumida | Coordinator | Adult | Adolescent | Child | Senior | Guest |
|---|---:|---:|---:|---:|---:|---:|
| Ver Planner | Sí | Sí | Sí | Sí, guiado | Sí | Limitado |
| Crear Task household | Sí | Sí | Sí | No | Sí | No |
| Crear Task personal | Sí | Sí | Sí | Sí, guiado | Sí | No |
| Asignar a otros | Sí | Sí | No | No | Sí | No |
| Completar asignada | Sí | Sí | Sí | Sí | Sí | Sí |
| Completar cualquier household | Sí | No | No | No | No | No |
| Verificar | Sí | Sí | No | No | Sí | No |
| Crear Event household | Sí | Sí | Sí | No | Sí | No |
| Crear Event personal | Sí | Sí | Sí | No | Sí | No |
| Crear Goal household | Sí | Sí | Sí | No | Sí | No |
| Crear Goal personal | Sí | Sí | Sí | Sí, simple | Sí | No |
| Administrar templates | Sí | No | No | No | No | No |
| Ver Audit técnico | Sí | No | No | No | No | No |

## 6.5 Invariantes de permisos

- Nadie verifica su propia Task.
- Coordinator no accede automáticamente a contenido personal ajeno.
- Assignee de una Task compartida puede verla.
- Participant de Goal personal puede verla según su rol en esa Goal.
- Guest solo ve entidades explícitamente compartidas o asignadas.
- Backend omite referencias a entidades privadas no visibles.
- El frontend no recibe metadata para luego ocultarla.

## 6.6 Salida de un miembro

Antes de salida voluntaria:

- Goals household owned deben transferirse;
- Tasks abiertas asignadas pueden reasignarse o quedar sin asignar;
- Events organizados deben transferirse cuando sean series activas.

En salida forzada:

- Goals household pasan al coordinator designado;
- Tasks household quedan sin assignee;
- Goals personales quedan ocultas y preservadas durante la retención;
- Activity y Audit conservan snapshot del actor;
- no se rompe ninguna FK histórica.

---

# 7. Modelo mental de los dominios

## 7.1 Task

Una Task representa trabajo ejecutable.

Debe poder responder:

- qué;
- cuándo;
- quién;
- para qué;
- en qué estado;
- de dónde surgió.

No debe contener lógica financiera, de inventario o médica propia.

## 7.2 Event

Un Event representa algo que ocurre en el tiempo.

No se usa Event para representar una obligación sin horario. Eso es una Task.

## 7.3 Goal

Una Goal representa un resultado, no una lista decorativa.

El modo define su interacción principal.

## 7.4 Milestone

Un Milestone representa un cambio significativo de etapa.

No se completa automáticamente cuando todas sus Tasks terminan. Planner puede sugerirlo.

## 7.5 Template

Una Template describe una estructura reusable. No crea entidades hasta mostrar preview y recibir confirmación.

## 7.6 Task Pack

Un Pack es una instancia revisable de varias Tasks. Puede provenir de Template, Recommendation, Inventory o Geni.

---

# 8. Máquinas de estados

## 8.1 Task

```text
pending
├── complete → completed
├── complete requires_verification → awaiting_verification
├── cancel → cancelled
└── trash → deleted_at

awaiting_verification
├── verify by another eligible member → verified
├── return → pending
├── cancel → cancelled
└── trash → deleted_at

completed
├── reopen → pending
├── archive → archived_at
└── trash → deleted_at

verified
├── reopen with capability → pending
├── archive → archived_at
└── trash → deleted_at

cancelled
├── restore → pending
├── archive → archived_at
└── trash → deleted_at
```

Reglas:

- `status` nunca se modifica por PATCH genérico;
- complete y verify son idempotentes;
- reabrir limpia timestamps terminales y registra Activity;
- archive no cambia status;
- Trash no borra Activity ni Audit.

## 8.2 Event

```text
scheduled
├── update
├── cancel → cancelled
├── archive
└── trash

cancelled
├── restore → scheduled
├── archive
└── trash
```

## 8.3 Goal

```text
active
├── complete → completed
├── close → closed
├── archive
└── trash

completed
├── reopen → active
├── duplicate
├── archive
└── trash

closed
├── reopen → active
├── duplicate
├── archive
└── trash
```

## 8.4 Milestone

```text
open
├── achieve
├── edit
├── reorder
└── trash

achieved
├── reopen
├── edit
├── reorder
└── trash
```

---

# 9. Presupuesto de fricción

| Flujo | Presupuesto máximo |
|---|---|
| Completar Task | 1 tap |
| Verificar Task | 1 tap |
| Toggle Milestone | 1 tap |
| Completar Goal boolean | 1 tap |
| Crear Task simple | Escribir + hasta 3 interacciones |
| Crear Task desde Goal | Escribir + Guardar |
| Crear Event simple | Título + fecha/hora + Guardar |
| Crear Goal simple | Título + Guardar |
| Añadir Milestone | Escribir + submit |
| Reasignar | Abrir selector + elegir |
| Reprogramar | Elegir sugerencia o fecha |
| Repetir rutina | 1–2 taps |
| Aplicar Task Pack | Elegir + revisar + confirmar |
| Aplicar Goal Template | Elegir + preview + confirmar |
| Corregir recomendación | 1 tap sobre la sugerencia |

Un flujo que supere este presupuesto debe justificarlo por riesgo, privacidad o consecuencias.

---

# 10. Creación inteligente sin Geni

## 10.1 Principio

Planner debe sentirse inteligente antes de integrar IA generativa.

## 10.2 Fuentes de contexto

- tab actual;
- fecha seleccionada;
- Goal o Milestone de origen;
- Inventory item de origen;
- household activo;
- historial estructurado;
- preferences;
- capabilities;
- disponibilidad;
- carga agregada;
- template seleccionada.

## 10.3 Inferencias permitidas

- Tipo probable;
- fecha extraída de lenguaje natural;
- horario sugerido;
- responsable habitual;
- prioridad;
- duración;
- Goal;
- Milestone;
- reminder;
- recurrence;
- template relacionada.

## 10.4 Reglas de confianza

- alta confianza: precompletar y mostrar;
- media: mostrar chip `Sugerido`;
- baja: no aplicar, mostrar opción;
- asignar a otra persona siempre se muestra antes de guardar;
- sugerencias rechazadas repetidamente dejan de mostrarse;
- correcciones recurrentes alimentan family patterns.

## 10.5 Copy

Usar:

- `Sugerido`.
- `Usado la última vez`.
- `Según esta rutina`.
- `Podés cambiarlo`.

No usar:

- `La IA decidió`.
- `Asignación óptima`.
- `Esto es lo mejor para tu familia`.

---

# 11. Task Packs, Routines y Templates

## 11.1 Task Pack

Contenido mínimo:

- nombre;
- descripción breve;
- Tasks habilitables;
- offsets de fecha;
- responsables sugeridos;
- duración total estimada;
- Goal opcional;
- Milestones opcionales.

## 11.2 Preview

Debe mostrar:

- cantidad de Tasks;
- rango temporal;
- responsables;
- conflictos;
- elementos desactivados;
- datos que requieren decisión.

Acciones:

- Crear todo.
- Editar.
- Cancelar.

## 11.3 Creación

La operación es transaccional.

- Todas las entidades válidas se crean.
- Si una validación falla, no se deja un pack silenciosamente incompleto.
- El backend devuelve el resultado por entidad.
- `template_run_id` permite trazabilidad.

## 11.4 Routines

Una Routine es una Template recurrente orientada a ejecución.

Pantalla de ejecución:

- progreso de la sesión;
- Task actual;
- próxima Task;
- completar;
- omitir;
- pausar;
- pedir ayuda.

Editar Routine es un flujo separado.

## 11.5 Templates iniciales

- Limpieza semanal.
- Limpieza profunda de cocina.
- Limpieza de baño.
- Preparar visitas.
- Preparar cumpleaños.
- Preparar vacaciones.
- Rutina de mascotas.
- Revisión mensual del hogar.

## 11.6 Template personalizada

Se puede guardar una estructura existente como Template si el usuario tiene capability.

La instancia existente no queda vinculada dinámicamente a cambios posteriores de la Template.

---

# 12. Recommendations Engine

## 12.1 Responsabilidad

Proponer acciones determinísticas, explicables y reversibles.

## 12.2 Categorías

### Captura

- Tipo;
- fecha;
- responsable;
- Goal;
- Template.

### Ejecución

- siguiente Task;
- reprogramación;
- Task vencida;
- Milestone listo para revisar.

### Organización

- crear Goal desde varias Tasks;
- convertir repetición en Routine;
- aplicar Task Pack;
- redistribuir carga.

### Inventory

- reponer;
- revisar vencimiento;
- crear lista de compra;
- generar pack de revisión.

## 12.3 Ranking

El ranking usa:

- relevancia contextual;
- cercanía temporal;
- confianza;
- frecuencia;
- feedback;
- permissions.

No usa métricas morales.

## 12.4 Límites

- máximo una recommendation dominante por superficie;
- máximo tres en un sheet dedicado;
- no reaparecer inmediatamente después de rechazo;
- toda recomendación indica la consecuencia;
- ninguna acción masiva sin preview.

---

# 13. Sistema visual y de interacción

## 13.1 Mensaje visual

Planner debe transmitir calma y dirección.

La jerarquía se expresa mediante:

- espacio;
- tipografía;
- orden;
- tamaño;
- contraste moderado.

No mediante:

- muchas cajas;
- múltiples colores fuertes;
- badges repetidos;
- textos explicativos permanentes.

## 13.2 Tokens

Planner usa el Design System global.

Semántica:

- `background`;
- `surface`;
- `surfaceElevated`;
- `textPrimary`;
- `textSecondary`;
- `borderSubtle`;
- `primaryTerracotta`;
- `sage`;
- `warning`;
- `danger`;
- `success`.

Terracotta representa:

- acción principal;
- selección;
- foco.

No colorear cada Tipo con un color fuerte.

## 13.3 Tipografía

- títulos claros y cortos;
- system font;
- máximo tres jerarquías visibles por pantalla;
- metadata en caption;
- evitar mayúsculas sostenidas;
- no usar texto pequeño para acciones esenciales.

## 13.4 Iconografía

- sin emojis como iconos funcionales;
- wrapper único `AppIcon`;
- set base: Ionicons de Expo;
- nombres semánticos internos, no nombres de librería en screens;
- stroke y tamaño consistentes;
- icon-only button mínimo 44×44;
- toda acción icon-only tiene accessibility label.

Iconos normativos:

| Acción | Icono semántico |
|---|---|
| Crear | add |
| Completar | checkmark |
| Verificar | shield-checkmark |
| Calendar | calendar |
| Goal | flag |
| Task | checkmark-circle |
| Filter | options |
| Search | search |
| More | ellipsis-horizontal |
| Archive | archive |
| Delete | trash |
| Restore | arrow-undo |
| Repeat | repeat |
| Reminder | notifications |
| Participants | people |
| Private | lock-closed |
| Household | home |

## 13.5 Cards

Una card:

- tiene una superficie;
- usa border sutil o shadow, no ambos intensos;
- no contiene múltiples botones permanentes;
- puede tener una acción 1-tap;
- no muestra más de un badge dominante.

## 13.6 Copy diet

Eliminar texto que:

- repite el título;
- explica una interacción obvia;
- describe la aplicación;
- llena espacio;
- no cambia una decisión.

Evitar:

- `Gestioná tus tareas de manera simple`.
- `Acá podés ver todas tus metas`.
- `Organizá mejor tu día`.

Preferir:

- `Hoy`.
- `3 pendientes`.
- `Crear tarea`.
- `No hay tareas para hoy`.

## 13.7 Feedback

### Inline

Para validaciones y contexto local.

### Toast/Snackbar

Para éxito, deshacer o error recuperable.

### Alert

Solo para consecuencias importantes o decisiones ambiguas.

## 13.8 Motion

Motion se implementa al final, pero el contrato queda definido:

- feedback táctil inmediato;
- transiciones 160–220 ms;
- sheets con spring moderado;
- completion sin confetti agresivo;
- skeleton únicamente en primera carga;
- reduce motion respetado;
- no animar cada render ni cada cambio de texto.

---

# 14. Contrato global de gestos

| Interacción | Resultado | Seguridad |
|---|---|---|
| Tap card | Detail | Sin mutation |
| Swipe right Task pending | Complete | Optimistic + rollback |
| Swipe right awaiting | Verify si puede | Si no puede, abre Detail |
| Swipe left | Reveal menu | No ejecuta destructivo |
| Long press | Context menu | Misma lista que `•••` |
| Drag | Reorder mode | Version + rollback |
| Pull-to-refresh | Reconcile | Mantiene datos visibles |
| Double tap button | Una mutation | Lock + idempotency |
| Back while dirty | Discard confirmation | No durante auto-save |
| Back while submitting | Mantener hasta resolver o cancelar request seguro | No duplicar |

---

# 15. Arquitectura de navegación

```text
HomeTabs
├── Home
├── People
├── CenterQuickAction
├── PlannerTab
│   └── PlannerStack
│       ├── PlannerHome
│       │   ├── TasksTab
│       │   ├── CalendarTab
│       │   └── GoalsTab
│       ├── TaskDetail
│       ├── CreateTask
│       ├── EditTask
│       ├── EventDetail
│       ├── CreateEvent
│       ├── EditEvent
│       ├── GoalDetail
│       ├── CreateGoal
│       ├── EditGoal
│       ├── TemplateLibrary
│       ├── TemplatePreview
│       ├── TaskPackPreview
│       ├── PlannerSearch
│       ├── PlannerArchive
│       └── PlannerTrash
└── More
```

## 15.1 Route params

- IDs únicamente.
- Contexto mínimo de presentación opcional.
- Nunca pasar objetos completos canónicos.
- Backend revalida entidad y permisos.
- `returnTo` tipado.
- `initialTab` permitido.
- `initialSheet` consumido una vez y limpiado.

## 15.2 Deep links

- entidad inexistente → Not Found;
- sin permiso → Forbidden;
- hogar incorrecto → ofrecer cambiar hogar si existe membership activa;
- entidad borrada → mostrar estado y Restore si corresponde.

---

# 16. Planner Shell

## Objetivo

Contener las tres perspectivas sin sumar ruido.

## Layout

1. Top bar global.
2. Título `Planner`.
3. Search icon.
4. Tabs `Tareas`, `Calendario`, `Metas`.
5. Contenido.
6. FAB contextual discreto cuando corresponda.

No mostrar:

- cuatro stat cards permanentes;
- slogans;
- resumen duplicado de Home;
- filtros de las tres tabs simultáneamente.

## Estados

- resolving household;
- membership pending;
- forbidden;
- initial loading;
- stale cache;
- partial error;
- offline;
- ready.

## Cambio de household

1. cerrar sheets;
2. abortar requests;
3. limpiar cache scoped;
4. cancelar subscription;
5. resolver nuevo contexto;
6. cargar cache;
7. suscribir realtime;
8. reconciliar.

---

# 17. Tasks — lista principal

## 17.1 Header

- título según segment: `Hoy`, `Próximas`, `Hechas`;
- search;
- filter;
- contador solo si aporta;
- botón crear.

## 17.2 Segments

### Hoy

Orden:

1. Necesitan atención.
2. Vencidas.
3. Hoy por horario.
4. Hoy sin horario.
5. En revisión.

No duplicar una Task en dos secciones.

### Próximas

Secciones:

- Mañana.
- Esta semana.
- Más adelante.
- Sin fecha.

### Hechas

- Completadas.
- Verificadas.
- Canceladas, solo mediante filtro.
- Archivadas, fuera de la lista principal.

## 17.3 TaskCard

Información normal:

- título;
- fecha/hora humana;
- responsable si no es obvio;
- un estado dominante.

Información condicional:

- `Vencida`;
- `Por revisar`;
- `Requiere revisión`;
- Goal;
- origen Inventory;
- prioridad alta.

No mostrar por defecto:

- descripción;
- category chip;
- status chip redundante;
- creator;
- ID;
- varias etiquetas de origen.

## 17.4 Acción 1-tap

- trailing check control visible para pending;
- awaiting: shield control para verificadores;
- si el usuario no puede verificar, el control abre Detail;
- completed desaparece de segmento activo mediante animación posterior.

## 17.5 Empty states

| Estado | Copy | Acción |
|---|---|---|
| Sin Tasks | `Todavía no hay tareas.` | `Crear tarea` |
| Hoy vacío | `No hay tareas para hoy.` | `Ver próximas` |
| Próximas vacío | `No hay tareas próximas.` | `Crear tarea` |
| Hechas vacío | `Todavía no hay tareas terminadas.` | Ninguna |
| Filtro vacío | `No encontramos tareas con estos filtros.` | `Limpiar filtros` |
| Mías vacío | `No tenés tareas asignadas.` | Ninguna |
| Atención vacío | `Nada necesita atención.` | Ninguna |

## 17.6 Loading

- primera carga: skeleton de 3 cards;
- refresh: mantener cards y mostrar indicador;
- pagination: footer;
- nunca reemplazar lista por spinner blanco.

## 17.7 Error parcial

Mantener cache y mostrar:

`No pudimos actualizar. Mostramos la última información disponible.`

---

# 18. TaskDetail

## Objetivo

Comprender y operar una Task sin mostrar un formulario completo.

## Layout

1. Back.
2. Título.
3. Status.
4. Acción principal.
5. Momento.
6. Responsable.
7. Goal/Milestone si visible.
8. Descripción.
9. Checklist.
10. Dependencias.
11. Reminders.
12. Activity.
13. `•••`.

## Acción principal por estado

| Estado | Acción |
|---|---|
| pending | Completar |
| awaiting_verification, verifier | Verificar |
| awaiting_verification, no verifier | Esperando revisión |
| completed | Reabrir |
| verified | Reabrir, si puede |
| cancelled | Restaurar |

## Menú

- Editar.
- Reasignar.
- Cambiar fecha.
- Mover de Goal.
- Duplicar.
- Archivar.
- Cancelar.
- Enviar a Trash.

## Realtime

Si la Task cambia mientras está abierta:

- aplicar cambio no conflictivo;
- mostrar `Actualizada por [persona]`;
- si el formulario está dirty, mostrar conflict banner.

---

# 19. TaskForm

## 19.1 Ruta rápida

```text
¿Qué hay que hacer?
[ título ]

Sugerido
Hoy · Sin asignar · Limpieza

[Guardar]
```

## 19.2 Campos visibles

- title;
- suggestion row;
- date summary;
- assignee summary;
- Tipo summary.

## 19.3 Opciones

### Secundarias

- fecha;
- hora;
- responsable;
- Tipo;
- Goal;
- Milestone;
- prioridad.

### Avanzadas

- description;
- verification;
- recurrence;
- reminder;
- estimated duration;
- visibility;
- dependencies;
- Inventory source read-only;
- checklist.

## 19.4 Defaults

### Global Quick Action

- due date: none;
- assignee: none;
- priority: normal;
- visibility: household;
- Tipo: inferred or other.

### Desde Today

- due date: today.

### Desde Calendar

- selected date;
- selected time if slot.

### Desde Goal

- goal preselected;
- milestone if context;
- no automatic due date;
- suggestion based on Goal target date.

### Desde Inventory

- origin fields locked;
- title/type suggested;
- no automatic assignee.

## 19.5 Validation

- title trimmed, 1–120;
- description max 2,000;
- due_time requires due_date;
- assignee active;
- Goal accessible and active;
- Milestone belongs to Goal;
- personal Task cannot silently assign an unshared member;
- recurrence valid;
- version required in edit.

## 19.6 Submit

- button locked;
- idempotency key;
- optimistic temporary entity only if queue supports it;
- success returns to origin;
- from Goal returns GoalDetail;
- `Crear otra` available after save, not checked by default.

---

# 20. Task Filters Sheet

## Filtros

- responsable;
- Mías;
- Sin asignar;
- status;
- Tipo;
- priority;
- Goal;
- date range;
- with/without date;
- verification;
- origin;
- visibility;
- archived.

## Reglas

- contador en botón Filter;
- `Aplicar`;
- `Limpiar`;
- no aplicar cada tap con refetch agresivo;
- filtros persistidos por tab durante la sesión;
- saved views quedan fuera hasta demostrar necesidad.

---

# 21. Calendar

## 21.1 Month

Objetivo: panorama.

Muestra:

- número de día;
- hasta tres indicadores;
- color/tipo diferenciado;
- selección;
- agenda del día debajo.

No muestra:

- todos los títulos dentro de celdas;
- más de tres dots;
- tareas sin fecha.

## 21.2 Week

Objetivo: entender distribución.

Muestra:

- siete días;
- bloques horarios;
- all-day row;
- Task markers;
- conflictos;
- agenda del día seleccionado.

## 21.3 Day

Objetivo: ejecutar.

Muestra:

- timeline;
- all-day;
- Tasks;
- Events;
- tiempo libre;
- acción crear con fecha heredada.

## 21.4 Agenda

Orden:

1. all-day Events;
2. timed Events;
3. Tasks con hora;
4. Tasks sin hora.

## 21.5 Diferenciación

- Event: icon calendar y bloque temporal.
- Task: icon check circle y control complete.
- Goals y Milestones no aparecen como items de Calendar en Planner v2. Sus fechas se muestran en Goals y Home.

## 21.6 Empty states

- `Día tranquilo.`
- `No hay eventos esta semana.`
- Month vacío no muestra card explicativa dentro de cada celda.

---

# 22. EventDetail

## Layout

- título;
- fecha/hora;
- recurrence;
- location;
- participants;
- RSVP;
- description;
- linked Tasks;
- reminders;
- Activity;
- menu.

## Acciones

- Editar.
- Responder.
- Agregar Task.
- Duplicar.
- Cancelar.
- Restaurar.
- Archive.
- Trash.

## Conflicts

Banner:

`Se superpone con 1 evento.`

Acción:

`Ver conflicto`.

No bloquear guardado salvo policy futura.

---

# 23. EventForm

## Ruta rápida

- title;
- date;
- start time or all-day;
- end default;
- Save.

## Secundarios

- location;
- participants;
- recurrence;
- reminder.

## Avanzados

- description;
- visibility;
- linked Tasks;
- conference/external adapter futuro.

## Recurrence editor

Presets:

- no repetir;
- diariamente;
- semanalmente;
- mensualmente;
- personalizado.

Custom usa RRULE, pero muestra lenguaje humano.

## Edit scope

Antes de editar serie recurrente:

- Solo este evento.
- Este y los siguientes.
- Toda la serie.

Cancelar toda una serie requiere confirmación.

---

# 24. Goals — lista

## 24.1 Header

- `Metas`;
- search;
- filter;
- `+`.

Segments:

- `Activas`.
- `Finalizadas`.

## 24.2 Para continuar

Máximo una card.

Selección server-side:

1. pinned visible;
2. Task vencida;
3. Task de hoy;
4. Milestone próximo;
5. fecha objetivo cercana;
6. última Goal activa.

No se muestra si no existe una acción real.

## 24.3 GoalCard

Muestra:

- título;
- próximo paso o contexto;
- progreso solo si real;
- fecha o private indicator cuando aporte.

No muestra:

- tres chips;
- current/target y porcentaje simultáneamente;
- buttons permanentes;
- technical mode.

## 24.4 Finalizadas

Subfiltros en sheet:

- todas;
- logradas;
- cerradas;
- archivadas.

Orden: fecha terminal descendente.

---

# 25. GoalForm

## Ruta rápida

- title;
- category default `home`;
- visibility default `household`;
- Save.

Category y visibility se muestran como resumen editable, no como filas de chips permanentes.

## Más opciones

- description;
- progress mode;
- priority;
- responsible;
- start;
- target date;
- template;
- recurrence;
- participants.

## Progress mode chooser

Copy:

- `Por pasos`.
- `Por tareas`.
- `Con una cantidad`.
- `Sí o no`.
- `Sin medida`.

No mostrar nombres técnicos.

## Post-create

Después de crear:

### Steps

- Agregar primer paso.
- Ahora no.

### Tasks

- Crear tarea.
- Vincular existente.
- Ahora no.

### Numeric

- Registrar primer avance.
- Ahora no.

### Boolean

- Abrir meta.
- Ahora no.

### None

- Agregar nota.
- Crear tarea.
- Ahora no.

El prompt aparece una sola vez mediante `just_created`.

---

# 26. GoalDetail común

## Shell

- back;
- title;
- one-line metadata;
- pin;
- `•••`;
- status;
- progress only if real.

## Secciones comunes

- acción principal;
- next step;
- mode content;
- target date;
- responsible/participants;
- notes;
- comments;
- Activity;
- reminders/files collapsed.

## Menú activo

- Editar.
- Duplicar.
- Cambiar responsable.
- Participantes.
- Archivar.
- Cerrar.
- Trash.

## Menú finalizado

- Reabrir.
- Duplicar.
- Archivar.
- Exportar.
- Trash.

Finalizada abre read-only salvo acciones administrativas.

---

# 27. Goal mode: Steps

## Acción principal

`Agregar paso`.

## Milestone row

- checkbox/toggle;
- title;
- target date if any;
- Task summary;
- menu.

## Composer

- autofocus;
- max 120;
- submit keyboard;
- Cancelar;
- Agregar.

## Reorder

- entra por `Reordenar`;
- handles temporales;
- optimistic;
- rollback;
- version.

## Relaciones

- Task de Milestone siempre tiene goal_id;
- mover Task de Goal limpia milestone;
- completar todas las Tasks no completa el Milestone;
- mostrar suggestion `Todas las tareas están listas. ¿Marcar paso como logrado?`.

---

# 28. Goal mode: Tasks

## Acción principal

`Crear tarea`.

Secondary:

`Vincular existente`.

## Secciones

- Necesitan atención.
- Hoy.
- Próximas.
- Sin fecha.
- En revisión.
- Terminadas, collapsed.

## Progreso

```text
completed + verified
--------------------
total computable
```

Excluye:

- cancelled;
- trashed.

Incluye en denominador:

- pending;
- awaiting verification;
- completed;
- verified.

Cero computables → null.

---

# 29. Goal mode: Numeric

## Acción principal

`Sumar avance`.

## Endpoint

Atómico, con delta.

No usar PATCH absoluto como interacción primaria.

## Quick increments

Dependen de unidad:

- count: +1, +5, +10;
- amount: +1.000, +5.000 y +10.000 en la moneda de la Goal; el usuario puede cambiar el valor manualmente, pero los tres presets son fijos en v2;
- percentage: +5%, +10%, +25%.

## History

Cada entry incluye:

- delta;
- previous;
- resulting;
- note;
- actor;
- source;
- idempotency key;
- reversed_at.

## Correction

`Corregir valor` crea entry de ajuste; no reescribe historia.

## Exceeding target

Permitido.

Copy:

`Objetivo superado por X`.

## Target inválido

`Falta definir el objetivo.`

Acción:

`Definir objetivo`.

---

# 30. Goal mode: Boolean

## Acción principal

`Marcar como lograda`.

No muestra barra ni porcentaje.

Estado active:

`Pendiente`.

Estado completed:

`Lograda`.

---

# 31. Goal mode: None

No muestra barra ni porcentaje.

Copy:

`Sin una medida fija`.

Acciones según contenido:

- Crear tarea.
- Agregar paso.
- Agregar nota.
- Marcar lograda.
- Cerrar.

---

# 32. Goal lifecycle

## Complete

Copy confirmación breve únicamente si existen Tasks abiertas:

`Todavía quedan 3 tareas abiertas. Podés marcar la meta como lograda igual.`

## Close

Copy:

`Cerrar meta`

Descripción:

`Dejará de aparecer entre las activas. Podés reabrirla después.`

## Reopen

- status active;
- mantiene historia;
- incrementa reopen_count;
- no restaura automáticamente Tasks canceladas;
- Activity obligatoria.

## Duplicate

Preview permite incluir:

- Milestones.
- Tasks.
- Participants.
- Reminders.
- Dates relative.

No copia:

- Activity;
- Comments;
- Progress history;
- Evidence privada sin selección.

## Archive

No cambia status.

## Trash

Soft delete 30 días.

---

# 33. Vincular Tasks existentes

## Entrada

Desde GoalDetail:

`Vincular tareas`.

## Selector

- multi-select;
- search;
- filters;
- solo Tasks visibles;
- explica conflictos.

## Elegibles

- same household;
- no trash;
- no Goal o movable;
- personal compatible;
- se pueden vincular Tasks activas; las finalizadas solo pueden vincularse en modo lectura y no cuentan como nueva ejecución.

## Conflictos

Antes del batch:

- Task ya en otra Goal;
- personal no compartida;
- Milestone incompatible;
- Task finalizada;
- permissions.

## Aplicación

Transacción batch.

Mover de Goal:

- cambia goal_id;
- limpia goal_milestone_id;
- registra Activity.

---

# 34. Participants, Notes, Comments y Activity

## 34.1 Goal roles

- owner;
- editor;
- participant;
- viewer.

## 34.2 Permisos

| Acción | Owner | Editor | Participant | Viewer |
|---|---:|---:|---:|---:|
| Ver | Sí | Sí | Sí | Sí |
| Editar info | Sí | Sí | No | No |
| Milestones | Sí | Sí | Toggle únicamente | No |
| Tasks | Sí | Sí | Sí | No |
| Comentar | Sí | Sí | Sí | No |
| Evidence | Sí | Sí | Sí | No |
| Complete | Sí | Sí | No | No |
| Close | Sí | No | No | No |
| Reopen | Sí | No | No | No |
| Participants | Sí | No | No | No |
| Trash | Sí | No | No | No |

## 34.3 Notes

Contenido organizativo.

Puede ser:

- principal;
- adicional;
- personal del owner;
- compartida.

## 34.4 Comments

Mensaje colaborativo con author y timestamp.

- editar durante 15 minutos;
- delete own;
- rate limit;
- no markdown complejo;
- mentions futuras.

## 34.5 Activity

Generada por sistema.

Ejemplos:

- Task vinculada.
- Milestone logrado.
- Progreso sumado.
- Goal reabierta.
- Participant agregado.

No duplicar cada cambio menor de UI.

---

# 35. Quick Actions

## Layout

Header:

`Crear`

Acciones principales:

- Tarea.
- Evento.
- Meta.

Separador.

Acción household:

- Invitar persona, si puede.

## Comportamiento

- abre desde cualquier tab;
- no navega primero a una pantalla vacía;
- una sola instancia;
- initial action consumida una vez;
- cerrar con swipe down o backdrop;
- safe area;
- keyboard-safe.

## Fallos

Si no tiene ninguna acción:

- no abrir sheet vacío;
- mostrar toast `No tenés permisos para crear en este hogar.`

---

# 36. Home integration

## Data source

`GET /api/planner/summary`.

## Respuesta

- up to 3 tasks;
- up to 3 events;
- 1 goal;
- counts;
- freshness;
- partial_errors.

## Selección

Backend-only.

## Task 1-tap

Permitido.

- optimistic;
- rollback;
- haptic;
- snackbar;
- Home y Planner actualizan por cache/realtime.

## Empty

- Tasks: `No hay tareas pendientes.`
- Events: `No hay eventos próximos.`
- Goals: omitir.

## Error parcial

Una sección puede fallar sin ocultar las demás.

---

# 37. Search

## Scope

Búsqueda unificada:

- Tasks.
- Events.
- Goals.
- Templates.

## Entrada

Search icon en Planner.

## Resultados

Agrupados por tipo, con filtros.

## Backend

- server-side;
- normalized text;
- accent-insensitive;
- cursor pagination;
- household scoped;
- personal permissions.

## Empty

`No encontramos resultados para “…”`

Acciones:

- limpiar filtros;
- crear entity si corresponde.

---

# 38. Empty, loading, error y offline

## 38.1 Estados distintos

```text
loading
refreshing
empty
filtered_empty
forbidden
not_found
offline_stale
pending_sync
partial_error
fatal_error
conflict
```

## 38.2 Regla

Nunca usar empty para representar un error.

## 38.3 Catálogo mínimo

| Superficie | Empty | CTA |
|---|---|---|
| Planner sin hogar | `Necesitás un hogar activo para usar Planner.` | Crear/cambiar |
| Membership pending | `Tu ingreso todavía está pendiente.` | Volver |
| Tasks | `Todavía no hay tareas.` | Crear |
| Today | `No hay tareas para hoy.` | Ver próximas |
| Calendar day | `Día tranquilo.` | Crear |
| Goals | `Todavía no hay metas.` | Crear |
| Steps | `Agregá el primer paso.` | Agregar |
| Goal Tasks | `Todavía no hay tareas vinculadas.` | Crear/Vincular |
| Numeric history | `Los avances van a aparecer acá.` | Sumar |
| Templates custom | `Todavía no guardaste plantillas.` | Crear desde estructura |
| Archive | `No hay elementos archivados.` | Ninguna |
| Trash | `La papelera está vacía.` | Ninguna |
| Search | `No encontramos resultados.` | Limpiar |

---

# 39. Guardas anti-crash

## 39.1 Frontend

- route params validated;
- UUID guard;
- Error Boundary global y por feature;
- AbortController;
- stale request token;
- mounted guard;
- mutation lock;
- entity mutex;
- cleanup subscription;
- no setState after unmount;
- no object access without null handling;
- pagination bounds;
- list keys stable;
- form draft safe;
- keyboard and safe-area handling;
- image/file failure fallback;
- modal singleton.

## 39.2 Backend

- context server-side;
- membership active;
- capability validation;
- state transition service;
- idempotency;
- optimistic concurrency;
- transactions;
- rate limits;
- input size limits;
- recurrence expansion cap;
- cursor cap;
- typed errors;
- outbox;
- audit;
- timeout;
- retry only internal safe jobs.

## 39.3 Database

- FK;
- CHECK;
- unique partial indexes;
- RLS;
- soft delete;
- timestamps;
- version;
- no cross-household;
- task milestone matches goal;
- participant membership active when created;
- owner required;
- recurrence uniqueness;
- idempotency uniqueness.

---

# 40. Casos de caos obligatorios

## Taps

- Guardar diez veces.
- Complete y Cancel casi simultáneos.
- Swipe durante refresh.
- Long press y navegación simultánea.
- Abrir dos sheets.
- Back durante submit.
- Tap en action disabled.
- Deep link repetido.

## Contexto

- cambio de household con form abierto;
- role changed;
- membership finalized;
- Goal archived por otro;
- assignee leaves;
- Inventory item deleted;
- timezone changed;
- session expired.

## Red

- timeout;
- offline;
- response after screen closed;
- duplicated request;
- 401;
- 403;
- 404;
- 409;
- 422;
- 429;
- 500;
- realtime disconnect;
- missing event;
- duplicated event.

## Resultado normativo

Ningún caso produce:

- crash;
- data leak;
- duplicate entity;
- silent overwrite;
- permanent spinner;
- blank screen;
- impossible status.

---

# 41. Arquitectura backend

## Servicios lógicos

```text
PlannerContextService
PlannerPermissionService
TaskService
TaskVerificationService
EventService
CalendarProjectionService
GoalService
GoalProgressService
TemplateService
TaskPackService
RecommendationService
ReminderService
PlannerSummaryService
PlannerSearchService
RealtimeOutboxService
PlannerActivityService
PlannerAuditService
PlannerTelemetryService
OfflineMutationService
InventoryPlannerAdapter
```

## Regla de despliegue

Son límites de código y contratos. No se separan en microservicios desplegados hasta existir necesidad real.

## Controller rule

Controllers:

- parsean;
- llaman service;
- devuelven typed response.

No contienen reglas de dominio.

---

# 42. Modelo de datos final

Los nombres pueden ajustarse a convenciones existentes, pero la semántica es normativa.

## 42.1 `planner_tasks`

```text
id uuid pk
household_id uuid not null
visibility text household|personal
title varchar(120) not null
description text null
type_key text not null
priority text low|normal|high not null default normal
due_date date null
due_time time null
timezone text null
estimated_minutes integer null
assigned_to_member_id uuid null
created_by_member_id uuid not null
completed_by_member_id uuid null
verified_by_member_id uuid null
requires_verification boolean not null default false
status text pending|awaiting_verification|completed|verified|cancelled
goal_id uuid null
goal_milestone_id uuid null
recurrence_rule text null
series_task_id uuid null
occurrence_key text null
template_id uuid null
template_run_id uuid null
origin_module text null
origin_entity_type text null
origin_entity_id uuid null
origin_action text null
origin_metadata jsonb null
completed_at timestamptz null
verified_at timestamptz null
cancelled_at timestamptz null
archived_at timestamptz null
deleted_at timestamptz null
delete_after timestamptz null
version integer not null default 1
created_at timestamptz
updated_at timestamptz
```

Constraints:

- due_time requires due_date;
- goal_milestone_id requires goal_id;
- milestone belongs to goal;
- verified requires completed_by and verified_by distinct;
- occurrence unique per series;
- active assignee in same household at assignment time.

## 42.2 `planner_task_checklist_items`

- task_id;
- title;
- achieved;
- sort_order;
- version;
- timestamps;
- deleted_at.

## 42.3 `planner_task_dependencies`

- task_id;
- depends_on_task_id;
- dependency_type;
- no self dependency;
- cycle prevented in service.

## 42.4 `planner_events`

```text
id
household_id
visibility
title
description
starts_at
ends_at
all_day
timezone
location_name
location_details
status scheduled|cancelled
recurrence_rule
series_event_id
original_occurrence_start_at
created_by_member_id
owner_member_id
archived_at
deleted_at
delete_after
version
created_at
updated_at
```

## 42.5 `planner_event_participants`

- event_id;
- member_id;
- role organizer|participant;
- response needs_action|accepted|declined|tentative;
- responded_at;
- timestamps.

## 42.6 `planner_event_task_links`

- event_id;
- task_id;
- relation preparation|follow_up|general;
- created_by_member_id;
- timestamps.

## 42.7 `planner_goals`

```text
id
household_id
visibility household|personal
title
description
category home|family|finance|health|education|other
priority low|normal|high
progress_mode steps|tasks|numeric|boolean|none
target_type count|amount|percentage|boolean|null
target_value numeric null
current_value numeric null
unit text null
starts_at timestamptz null
ends_at timestamptz null
status active|completed|closed
owner_member_id
responsible_member_id null
template_id null
template_run_id null
recurrence_rule null
closed_reason text null
completed_at null
closed_at null
reopened_at null
reopen_count integer
archived_at null
archived_by_member_id null
deleted_at null
delete_after null
version integer
created_at
updated_at
```

## 42.8 `planner_goal_milestones`

- id;
- goal_id;
- title;
- note;
- target_date;
- achieved;
- achieved_at;
- sort_order;
- version;
- deleted_at;
- timestamps.

## 42.9 `planner_goal_progress_entries`

- id;
- goal_id;
- delta;
- previous_value;
- resulting_value;
- note;
- source manual|automation|integration|correction;
- idempotency_key;
- created_by_member_id;
- reversed_at;
- reversed_by_member_id;
- timestamps.

## 42.10 `planner_goal_participants`

- goal_id;
- member_id;
- role owner|editor|participant|viewer;
- timestamps;
- unique goal/member.

Owner también está en Goal para integridad rápida.

## 42.11 `planner_goal_notes`

- id;
- goal_id;
- author_member_id;
- visibility shared|author_only;
- body;
- deleted_at;
- timestamps.

## 42.12 `planner_goal_comments`

- id;
- goal_id;
- author_member_id;
- body;
- edited_at;
- deleted_at;
- timestamps.

## 42.13 `planner_reminders`

Polimórfica validada por service y trigger:

- id;
- household_id;
- entity_type task|event|goal|milestone;
- entity_id;
- recipient_member_id;
- reminder_type;
- scheduled_for;
- offset_minutes;
- channel in_app|push|email;
- status scheduled|sent|cancelled|failed;
- idempotency_key;
- timestamps.

## 42.14 `planner_templates`

- id;
- household_id nullable for system templates;
- kind goal|task_pack|routine;
- title;
- description;
- category;
- visibility system|household|personal;
- owner_member_id nullable;
- version;
- archived_at;
- deleted_at;
- timestamps.

## 42.15 Template children

- `planner_template_milestones`;
- `planner_template_tasks`;
- `planner_template_events`;
- `planner_template_dependencies`.

Usan offsets relativos, no fechas absolutas.

## 42.16 `planner_template_runs`

- template_id;
- household_id;
- requested_by_member_id;
- preview_hash;
- status previewed|committed|cancelled|failed;
- idempotency_key;
- result_summary;
- timestamps.

## 42.17 `planner_user_preferences`

- member_id;
- last_tab;
- default_task_visibility;
- default_event_visibility;
- quick_increment_preferences;
- notification preferences;
- reduce_motion override optional;
- timestamps.

## 42.18 `planner_goal_user_preferences`

- goal_id;
- member_id;
- pinned;
- muted;
- timestamps.

## 42.19 `planner_family_patterns`

Datos estructurados para recommendations y futura memoria:

- household_id;
- pattern_type;
- subject_key;
- member_id nullable;
- value_json;
- confidence;
- evidence_count;
- last_confirmed_at;
- rejected_count;
- disabled_at;
- version;
- timestamps.

No guarda contenido libre sensible salvo necesidad explícita.

## 42.20 `planner_activity`

- household_id;
- entity_type;
- entity_id;
- event_type;
- actor_member_id;
- payload_safe;
- occurred_at.

## 42.21 `planner_audit_log`

Append-only:

- request_id;
- mutation_id;
- actor;
- household;
- action;
- entity;
- before_hash;
- after_hash;
- result;
- metadata redacted;
- occurred_at.

## 42.22 `planner_outbox_events`

- event_id;
- event_type;
- household_id;
- entity_type;
- entity_id;
- entity_version;
- actor_member_id;
- mutation_id;
- payload;
- occurred_at;
- published_at;
- attempts;
- last_error.

## 42.23 `planner_idempotency_keys`

- household_id;
- member_id;
- key;
- operation;
- request_hash;
- response_snapshot;
- expires_at;
- unique scope.

---

# 43. Índices mínimos

## Tasks

- household/status/due_date;
- household/assigned/status;
- household/goal;
- household/goal/milestone;
- household/updated_at;
- partial active;
- origin lookup;
- recurrence occurrence unique.

## Events

- household/starts_at;
- household/status;
- series/original occurrence;
- participants/member.

## Goals

- household/status;
- household/owner;
- household/ends_at;
- household/category;
- active non-deleted;
- participants/member.

## Search

Índice normalizado o materialized search document.

Ninguna lista opera sin límite.

---

# 44. RLS y seguridad

## Regla base

Toda tabla Planner verifica household membership activa.

## Personal

- owner;
- participant explícito;
- backend no confía en visibility enviada sin capability.

## Insert

- household_id y actor se derivan;
- owner/creator deben coincidir con contexto salvo endpoint administrativo;
- relation IDs se revalidan.

## Update

- capability;
- version;
- entity not trashed;
- state transition.

## Delete

No DELETE normal desde cliente. Trash mediante UPDATE/RPC/service.

## Audit

RLS impide lectura salvo capability específica. Escritura solo server-side.

---

# 45. API final

Base:

`/api/planner`

## 45.1 Tasks

```text
GET    /tasks
POST   /tasks
GET    /tasks/:id
PATCH  /tasks/:id
POST   /tasks/:id/complete
POST   /tasks/:id/verify
POST   /tasks/:id/return
POST   /tasks/:id/reopen
POST   /tasks/:id/cancel
POST   /tasks/:id/restore
POST   /tasks/:id/archive
POST   /tasks/:id/unarchive
DELETE /tasks/:id              -> trash
POST   /tasks/:id/restore-trash
POST   /tasks/batch
POST   /tasks/reorder
```

Filters:

- status;
- segment;
- assignee;
- mine;
- unassigned;
- type;
- priority;
- goal_id;
- milestone_id;
- from;
- to;
- with_date;
- visibility;
- origin;
- archived;
- cursor;
- limit.

## 45.2 Events

```text
GET    /events
POST   /events
GET    /events/:id
PATCH  /events/:id
POST   /events/:id/cancel
POST   /events/:id/restore
POST   /events/:id/archive
POST   /events/:id/unarchive
DELETE /events/:id
POST   /events/:id/restore-trash
POST   /events/:id/occurrences/override
POST   /events/:id/occurrences/split
GET    /events/:id/conflicts
GET    /events/:id/participants
POST   /events/:id/participants
PATCH  /events/:id/participants/:memberId
DELETE /events/:id/participants/:memberId
```

## 45.3 Calendar

```text
GET /calendar?view=day|week|month&date=YYYY-MM-DD
GET /calendar/range?from=&to=
```

Respuesta incluye cursor/freshness y projection version.

## 45.4 Goals

```text
GET    /goals
POST   /goals
GET    /goals/:id
PATCH  /goals/:id
POST   /goals/:id/complete
POST   /goals/:id/close
POST   /goals/:id/reopen
POST   /goals/:id/duplicate
POST   /goals/:id/archive
POST   /goals/:id/unarchive
DELETE /goals/:id
POST   /goals/:id/restore-trash
POST   /goals/:id/progress
POST   /goals/:id/progress/:entryId/reverse
GET    /goals/:id/progress
GET    /goals/:id/milestones
POST   /goals/:id/milestones
PATCH  /goals/:id/milestones/:milestoneId
DELETE /goals/:id/milestones/:milestoneId
POST   /goals/:id/milestones/reorder
GET    /goals/:id/tasks
POST   /goals/:id/tasks/link
POST   /goals/:id/tasks/unlink
POST   /goals/:id/tasks/move
GET    /goals/:id/participants
POST   /goals/:id/participants
PATCH  /goals/:id/participants/:memberId
DELETE /goals/:id/participants/:memberId
GET    /goals/:id/activity
GET    /goals/:id/comments
POST   /goals/:id/comments
GET    /goals/:id/notes
POST   /goals/:id/notes
```

## 45.5 Templates y Packs

```text
GET    /templates
POST   /templates
GET    /templates/:id
PATCH  /templates/:id
POST   /templates/:id/preview
POST   /templates/:id/commit
POST   /packs/preview
POST   /packs/commit
```

## 45.6 Summary, Search, Recommendations

```text
GET  /summary
GET  /search
GET  /recommendations
POST /recommendations/:id/accept
POST /recommendations/:id/reject
POST /recommendations/:id/correct
```

## 45.7 Sync

```text
GET  /sync/catch-up?after=
POST /sync/mutations
```

---

# 46. Respuestas y errores

## Envelope éxito

```json
{
  "data": {},
  "meta": {
    "request_id": "uuid",
    "version": 3,
    "freshness": "live"
  }
}
```

## Error

```json
{
  "error": {
    "code": "planner_conflict",
    "message": "La tarea cambió en otro dispositivo.",
    "details": {},
    "request_id": "uuid"
  }
}
```

## Codes mínimos

```text
planner_validation_error
planner_unauthenticated
planner_forbidden
planner_not_found
planner_conflict
planner_invalid_transition
planner_idempotency_conflict
planner_household_required
planner_membership_inactive
planner_rate_limited
planner_dependency_conflict
planner_recurrence_invalid
planner_offline_required
planner_internal_error
```

Frontend nunca muestra el code técnico directamente.

---

# 47. Idempotencia y concurrencia

## Writes

Todas las mutations reciben:

- `Idempotency-Key`;
- `If-Match` o `version`;
- `X-Mutation-Id`.

## Conflict

409 devuelve:

- estado actual;
- versión;
- campos conflictivos;
- acciones posibles.

## Policy

- complete idempotente;
- verify idempotente;
- numeric delta idempotente;
- template commit idempotente;
- batch transaction idempotente;
- outbox comparte mutation_id.

## Merge

Auto-merge solo para campos independientes seguros.

No auto-merge:

- assignee;
- status;
- recurrence;
- privacy;
- participant roles;
- numeric current absolute.

---

# 48. Realtime

## Eventos

### Task

```text
task.created
task.updated
task.assigned
task.completed
task.awaiting_verification
task.verified
task.returned
task.reopened
task.cancelled
task.archived
task.trashed
task.restored
```

### Event

```text
event.created
event.updated
event.cancelled
event.restored
event.occurrence_overridden
event.series_split
event.participant_changed
event.rsvp_changed
```

### Goal

```text
goal.created
goal.updated
goal.progressed
goal.completed
goal.closed
goal.reopened
goal.archived
goal.trashed
milestone.created
milestone.updated
milestone.achieved
milestone.reordered
goal.task_link_changed
goal.participant_changed
```

### Template/Recommendation

```text
template.created
template.updated
template.instantiated
recommendation.accepted
recommendation.rejected
```

## Envelope

```json
{
  "event_id": "uuid",
  "event_type": "task.completed",
  "household_id": "uuid",
  "entity_type": "task",
  "entity_id": "uuid",
  "entity_version": 8,
  "actor_member_id": "uuid",
  "mutation_id": "uuid",
  "occurred_at": "ISO-8601",
  "payload": {}
}
```

## Cliente

- subscription household;
- personal channel;
- dedupe event_id;
- ignore mutation echo;
- apply next version;
- invalidate if gap;
- catch-up after reconnect;
- unsubscribe on household switch;
- batch high-frequency events;
- permission check before applying.

## Garantía

Transactional outbox.

DB sigue siendo canónica.

---

# 49. Offline limitado

## Lectura

- cache scoped;
- freshness visible;
- last synced timestamp;
- no blank screen.

## Queue permitida

- create Task;
- edit simple Task;
- complete Task;
- toggle Milestone;
- create personal Goal simple;
- comment draft local.

## Requiere online

- verify;
- destructive actions;
- participant changes;
- recurring series;
- template commit;
- batch move;
- numeric correction;
- permission change.

## Conflict UI

Copy:

`Cambió en otro dispositivo.`

Acciones:

- Ver versión actual.
- Aplicar mis cambios.
- Combinar, si está permitido.
- Descartar.

---

# 50. Cache y performance

## Query keys

Siempre incluyen household.

## Reglas

- normalized entity cache;
- list references IDs;
- directed invalidation;
- no global refetch;
- dedupe simultaneous requests;
- keep previous data;
- cursor pagination;
- list virtualization;
- debounce search;
- cache calendar ranges;
- prefetch Detail;
- no per-card fetch;
- batch member and Goal summaries.

## Budgets

| Métrica | Objetivo |
|---|---|
| Planner con cache | <300 ms percibidos |
| Primera carga normal | <1.5 s |
| Feedback 1-tap | <100 ms percibidos |
| Reconcile mutation | <1 s objetivo |
| Realtime | <2 s |
| Tab switch | sin blank frame |
| 1,000 items | scroll estable |
| Query | siempre limitada |

---

# 51. Telemetría

## 51.1 Producto

Eventos sin contenido doméstico:

```text
planner_opened
planner_tab_changed
task_create_started
task_create_completed
task_create_abandoned
task_completed
task_verified
event_created
goal_created
goal_post_create_action
template_previewed
template_committed
recommendation_shown
recommendation_accepted
recommendation_rejected
filter_applied
search_performed
undo_used
conflict_shown
offline_mutation_queued
```

Propiedades permitidas:

- screen;
- source;
- interaction_count;
- duration_ms;
- field_changed_count;
- entity_type;
- result;
- error_code;
- template_id;
- recommendation_type.

No incluir:

- title;
- description;
- note;
- comment;
- names;
- email;
- raw query sensible.

## 51.2 Técnica

- crash;
- API latency;
- render duration;
- retry;
- request loop;
- realtime reconnect;
- event gap;
- queue depth;
- conflict;
- job failure;
- notification delivery.

## 51.3 Consentimiento

Analytics y family learning deben estar separados.

---

# 52. Audit, Activity y Family Patterns

## Audit

Inmutable y técnico.

## Activity

Humano y visible.

## Family Patterns

Aprendizaje estructurado para recommendations y futura Geni.

Ejemplos:

```json
{
  "pattern_type": "preferred_assignee",
  "subject_key": "task_type:pets",
  "member_id": "uuid",
  "confidence": 0.82,
  "evidence_count": 12
}
```

Reglas:

- revisable;
- corregible;
- eliminable;
- desactivable;
- household scoped;
- no texto privado completo;
- expiración o reducción de confianza;
- feedback negativo registrado;
- ninguna inferencia sobre rasgos sensibles.

---

# 53. Integración con Inventory

## Ownership

Inventory es dueño de stock e items.

Planner es dueño de Tasks, Events y Goals.

## Origin contract

```text
origin_module = inventory
origin_entity_type
origin_entity_id
origin_action
origin_metadata mínima
```

## Casos

- low stock → suggestion;
- out of stock → purchase Task;
- expiry → Task/reminder;
- periodic review → Task Pack;
- completed purchase → offer stock update;
- Goal includes Inventory-origin Tasks.

## Reglas

- borrar Inventory item no borra Task;
- Task conserva snapshot mínimo;
- stock update requiere acción explícita o approved automation futura;
- adapter idempotente;
- unique origin fingerprint evita duplicados.

---

# 54. Contratos de extensión

## 54.1 Geni

Planner expone tools:

```text
planner.task.create
planner.task.update
planner.task.complete
planner.event.create
planner.event.update
planner.goal.create
planner.goal.add_milestone
planner.goal.link_task
planner.template.preview
planner.template.commit
planner.pack.preview
planner.pack.commit
planner.search
planner.summary.read
```

Cada tool define:

- schema;
- permissions;
- risk;
- confirmation;
- idempotency;
- rollback;
- audit.

Planner no implementa Geni en este alcance.

## 54.2 Finance

Campos de origen y eventos admiten:

```text
origin_module = finance
finance.payment_due
finance.goal_progress_source
```

Planner no interpreta montos financieros salvo numeric Goal explícita.

---

# 55. Arquitectura frontend

```text
features/planner/
├── domain/
│   ├── task.types.ts
│   ├── event.types.ts
│   ├── goal.types.ts
│   ├── transitions.ts
│   ├── permissions.ts
│   └── copy.ts
├── api/
│   ├── plannerClient.ts
│   ├── tasks.api.ts
│   ├── events.api.ts
│   ├── goals.api.ts
│   ├── templates.api.ts
│   ├── search.api.ts
│   └── queryKeys.ts
├── cache/
│   ├── plannerCache.ts
│   ├── mutations.ts
│   ├── optimistic.ts
│   └── realtimeReducer.ts
├── tasks/
├── calendar/
├── goals/
├── templates/
├── quick-actions/
├── search/
├── summary/
└── shared/
    ├── states/
    ├── cards/
    ├── sheets/
    ├── forms/
    ├── accessibility/
    └── telemetry/
```

## Reglas

- Screen orquesta.
- Hooks contienen fetching.
- Domain functions son puras.
- API no conoce UI.
- Cards no fetch.
- Forms comparten field components.
- Progress no se recalcula en frontend.
- No archivos monolíticos.
- `plannerShared.ts` se divide por dominio.

---

# 56. Accesibilidad

- touch target 44×44;
- screen reader labels;
- state announced after optimistic success/failure;
- swipe alternatives;
- long press alternatives;
- focus management sheets;
- dynamic type;
- contrast AA;
- no color-only state;
- reduce motion;
- keyboard navigation web;
- semantic headings;
- error linked to field;
- countdown/timer no depende de animation.

---

# 57. Copy normativo

## Acciones

- Crear tarea.
- Crear evento.
- Crear meta.
- Guardar.
- Completar.
- Verificar.
- Reabrir.
- Archivar.
- Restaurar.
- Cerrar meta.
- Enviar a papelera.
- Deshacer.

## Éxito

- `Tarea creada.`
- `Tarea completada.`
- `Enviada a revisión.`
- `Tarea verificada.`
- `Evento creado.`
- `Meta creada.`
- `Avance registrado.`
- `Cambios guardados.`

## Error

- `No pudimos guardar los cambios.`
- `La tarea cambió en otro dispositivo.`
- `Ya no tenés permiso para hacer esto.`
- `Este elemento ya no está disponible.`
- `No hay conexión. Guardamos el cambio para sincronizarlo.`

## Destructivos

- `Cancelar tarea`.
- `Enviar a papelera`.
- `Cerrar meta`.
- `Cancelar evento`.

No usar `Eliminar` cuando la acción real es soft delete.

---

# 58. Observabilidad

Debe existir:

- request ID;
- mutation ID;
- structured logs;
- endpoint latency;
- error rate;
- DB query duration;
- outbox lag;
- realtime reconnect;
- catch-up count;
- queue depth;
- conflict rate;
- template commit failure;
- recommendation acceptance;
- app version;
- migration version.

No incluir PII ni contenido doméstico en logs.

---

# 59. QA automatizado

## Unit

- progress por modo;
- transitions;
- permissions;
- overdue;
- risk;
- recurrence;
- summary ranking;
- recommendations;
- copy helpers;
- visibility.

## Integration

- API + DB + RLS;
- multi-household;
- personal sharing;
- complete/verify;
- Goal–Task–Milestone;
- numeric atomic;
- templates;
- Inventory adapter;
- outbox;
- idempotency;
- conflict;
- trash/restore.

## E2E

- Quick Action Task/Event/Goal;
- Task from Goal;
- link existing;
- complete on device B;
- observe device A;
- change household;
- lose permission;
- offline queue;
- recurrence occurrence;
- Goal lifecycle;
- empty/error/loading;
- user taps repeatedly;
- Inventory origin;
- post-create prompts.

## Chaos

- random rapid interactions;
- network toggling;
- delayed responses;
- duplicate events;
- stale versions;
- process retry.

---

# 60. Matriz de aceptación por pantalla

Cada screen debe aprobar:

- initial loading;
- cached load;
- refresh;
- empty;
- filtered empty;
- error;
- partial error;
- offline;
- forbidden;
- not found;
- conflict;
- realtime update;
- accessibility;
- small device;
- large device;
- keyboard;
- reduce motion;
- double tap;
- back during submit.

---

# 61. Migración desde el estado actual

## Ya implementado y protegido

- Tasks CRUD.
- Complete/Verify.
- Events CRUD.
- Simple recurrence.
- occurrence override.
- Month/Week/Day/Agenda.
- Goals CRUD.
- cinco progress modes.
- Milestones.
- progress Tasks/Steps.
- TaskForm contextual.
- Goal filtering backend.
- Home real.
- RLS core.

## Migraciones prioritarias

1. membership IDs canónicos donde aún se usan person IDs;
2. priority 3-level;
3. visibility;
4. version;
5. archive/trash timestamps;
6. Goal status `failed` → `closed`;
7. goal_milestone_id;
8. progress entries;
9. participants;
10. templates;
11. outbox;
12. audit;
13. patterns;
14. reminders.

## Compatibilidad

- backfill explícito;
- dual-read breve únicamente si es necesario;
- no dual-write permanente;
- feature flags para UI nueva;
- migration tests;
- rollback plan.

---

# 62. Orden de implementación

## Vertical 0 — Contrato y safety

- types;
- errors;
- version;
- idempotency;
- outbox;
- capabilities;
- cache architecture;
- telemetry base.

## Vertical 1 — Quick Actions y Shell

- Create Goal;
- runtime QA;
- singleton sheets;
- tabs;
- search entry;
- states.

## Vertical 2 — Tasks action-first

- data migration;
- TaskDetail;
- cards;
- filters sheet;
- quick form;
- lifecycle;
- realtime;
- tests.

## Vertical 3 — Calendar final

- status;
- participants;
- RRULE;
- occurrence scopes;
- conflict;
- EventDetail;
- realtime;
- tests.

## Vertical 4 — Goals final

- status migration;
- lifecycle;
- mode sections;
- progress entries;
- milestone task relation;
- link existing;
- participants;
- notes/activity;
- tests.

## Vertical 5 — Templates, Packs y Recommendations

- schema;
- preview;
- commit;
- routines;
- deterministic suggestions;
- tests.

## Vertical 6 — Home, Search e Inventory

- read models;
- unified search;
- Inventory adapter;
- telemetry;
- tests.

## Vertical 7 — Offline, performance y hardening

- queue;
- conflicts;
- pagination;
- profiling;
- chaos;
- accessibility.

## Vertical 8 — Motion

Solo después de aprobar Definition of Closed.

---

# 63. Definition of Ready por vertical

Antes de codificar:

- user flows cerrados;
- permissions;
- state machine;
- DB migration;
- API contract;
- events;
- telemetry;
- UI states;
- copy;
- acceptance tests;
- rollback.

---

# 64. Definition of Closed

Planner está cerrado cuando pasan todos los gates.

## Functional Gate

- todos los flujos funcionan;
- no hay mocks;
- lifecycle completo;
- Inventory conectado.

## Organization Gate

- cada pantalla tiene jerarquía clara;
- próxima acción visible;
- no hay información repetida;
- no parece una planilla.

## Speed Gate

- presupuesto de fricción aprobado;
- context inherited;
- one-tap inmediato;
- templates y packs reducen creación manual.

## Stress Gate

- forms cortos;
- advanced collapsed;
- copy no punitivo;
- errores recuperables;
- recommendations limitadas.

## Predictability Gate

- gestures consistentes;
- undo;
- feedback uniforme;
- defaults explicables;
- realtime sin duplicados.

## Security Gate

- RLS;
- capabilities;
- privacy;
- cross-household tests;
- no metadata leakage.

## Reliability Gate

- anti-crash;
- idempotency;
- concurrency;
- offline;
- recovery.

## Performance Gate

- budgets;
- pagination;
- no N+1;
- no global refetch;
- profiling.

## Realtime Gate

- outbox;
- dedupe;
- reconnect;
- catch-up;
- household switch.

## QA Gate

- unit;
- integration;
- E2E;
- chaos;
- multi-role;
- multi-device.

## Intelligence-readiness Gate

- tools;
- templates;
- packs;
- recommendations;
- preview/commit;
- family patterns;
- audit.

## Documentation Gate

- DB;
- API;
- events;
- permissions;
- telemetry;
- runbooks;
- migrations.

Solo después:

> **Planner está funcional, técnica y experiencialmente cerrado. Solo quedan motion, haptics y refinamiento visual.**

---

# 65. Métrica principal

La métrica principal de Planner no es cantidad de features.

Es:

> **cuántas decisiones, pantallas y minutos le ahorra HomePlus a una familia para organizar una situación real.**

Métricas de apoyo:

- tiempo hasta primera Task;
- interacciones por creación;
- porcentaje de defaults aceptados;
- uso de Templates;
- packs confirmados sin cambios;
- abandonos;
- errores;
- conflicts;
- tiempo de recuperación;
- recommendations rechazadas;
- latencia percibida.

Estas métricas no deben convertirse en vigilancia familiar.

---

# 66. Fuentes consolidadas

Este documento fue construido a partir de:

- brief final de producto;
- Family Core;
- AppShell;
- Members backend;
- Planner Design Spec;
- Planner Final Flow Spec;
- Planner Goals UX Implementation Spec;
- Planner Goals Product UX Spec;
- Planner Goals source map;
- Planner Goals gap audits;
- Planner Total Progress Audit;
- Planner historical architecture;
- Planner MVP baseline;
- Planner Premium Screen Design;
- Source Map Maestro v3;
- investigación comparativa de productos de rutinas, foco, fitness, planificación y automatización;
- decisiones finales del usuario sobre filosofía, eficiencia, Geni-readiness, telemetría e integración.

Regla de precedencia:

1. `planner_final.md`.
2. Source Map Maestro v3 para trazabilidad.
3. Auditorías REAL_NOW para evidencia del código.
4. Specs de dominio para detalle histórico.
5. Documentos MVP como contexto.

---

# 67. Declaración final

No quedan decisiones funcionales abiertas dentro del alcance definido.

Cualquier nueva idea debe clasificarse como:

- corrección de contradicción;
- requisito legal o de seguridad;
- extensión futura;
- integración externa;
- mejora posterior basada en telemetría.

No debe reabrirse la arquitectura central durante la implementación sin una decisión explícita documentada.

`planner_final.md` es el contrato final de Planner.

---

# 68. Template Library

## Objetivo

Permitir reutilizar estructuras sin obligar a crear cada entidad manualmente.

## Tabs

- Recomendadas.
- Del hogar.
- Mías.

No mostrar tab vacía si el usuario no puede crear templates personales.

## TemplateCard

Muestra:

- title;
- kind;
- una línea de resultado;
- cantidad de Tasks/Milestones;
- duración estimada cuando exista.

No muestra:

- configuración interna;
- JSON;
- todos los items;
- author salvo template compartida.

## Acciones

- Tap → Preview.
- Long press/`•••`:
  - Editar, si owner.
  - Duplicar.
  - Archivar.
  - Enviar a Trash.

## Search y filters

- kind;
- category;
- household/system/personal;
- recently used.

## Empty

`Todavía no hay plantillas guardadas.`

CTA:

`Crear desde una meta o rutina`.

---

# 69. Template Preview

## Objetivo

Mostrar exactamente qué se creará.

## Header

- nombre;
- descripción;
- source;
- estimated result.

## Contenido

### Goal Template

- Goal data;
- Milestones;
- Tasks;
- dates;
- responsible suggestions;
- reminders.

### Task Pack

- Tasks grouped;
- date offsets;
- responsible;
- conflicts.

### Routine

- sequence;
- recurrence;
- estimated duration.

## Editing

Cada item puede:

- enable/disable;
- rename;
- reassign;
- change date;
- move group.

No se edita la Template original salvo acción explícita.

## Footer

- `Crear`.
- `Guardar como copia` aparece siempre que se modifique una Template de sistema o una Template sin permiso de edición.
- `Cancelar`.

## Validation

El backend devuelve preview token y hash.

Al commit:

- revalidar context;
- revalidar permissions;
- revalidar active members;
- detectar cambios desde preview;
- 409 si el preview quedó obsoleto.

---

# 70. Task Pack Preview

## Layout

1. Title.
2. Summary.
3. Conflicts.
4. Groups.
5. Tasks.
6. Responsible distribution.
7. Timeline.
8. Confirm.

## Summary example

```text
Preparar cumpleaños
8 tareas · 3 responsables · 5 días
```

## Conflict examples

- `Máximo ya tiene 4 tareas ese día.`
- `Esta tarea no tiene responsable.`
- `La fecha cae después del evento.`

Conflicts son advisory salvo:

- inactive member;
- forbidden assignment;
- invalid date;
- inaccessible Goal.

## Commit result

Mostrar:

- entities created;
- entities skipped, only if user disabled them;
- no silent partial failure.

---

# 71. Routine Execution

## Objetivo

Separar ejecución de administración.

## Layout

- routine title;
- session progress;
- current Task;
- timer optional;
- next Task;
- pause;
- skip;
- complete;
- menu.

## Reglas

- no mostrar editor;
- skip requiere motivo solo si configured;
- pause conserva state;
- session can resume;
- completing current advances;
- failure sync does not lose local session;
- Activity summarizes session, not every timer tick.

## End

```text
Rutina terminada
6 de 7 tareas completadas
```

Actions:

- Resolver pendiente.
- Finalizar.
- Repetir later.

No usar confetti obligatorio.

---

# 72. Reminders

## 72.1 Reminder Sheet

Campos:

- recipient;
- trigger type;
- date/time or offset;
- channel;
- repeat;
- quiet hours preview.

## 72.2 Trigger types

### Task

- at due time;
- before due;
- when assigned;
- when returned;
- pending verification.

### Event

- before start;
- custom;
- participant response reminder.

### Goal

- start date;
- before target;
- next step;
- weekly summary;
- check-in.

## 72.3 Delivery

- in-app always supported;
- push when permission and infrastructure available;
- email only if enabled.

## 72.4 Permission states

- not requested;
- granted;
- denied;
- unavailable.

Copy denied:

`Las notificaciones están desactivadas en este dispositivo.`

CTA:

`Abrir configuración`.

## 72.5 Quiet hours

Household defaults do not override personal notification preferences.

---

# 73. Archive

## Scope

Tabs:

- Tasks.
- Events.
- Goals.
- Templates.

## Actions

- Restore.
- Trash.

## Rules

- archived content is read-only until restore;
- archive preserves original status;
- search can include archive only by explicit filter;
- Home and default Planner lists exclude archive.

## Empty

`No hay elementos archivados.`

---

# 74. Trash

## Scope

Same entity groups.

## Row

- title;
- entity type;
- deletion date;
- days remaining.

## Actions

- Restore.
- Delete permanently, only when supported and with reinforced confirmation.

## Retention

30 days default.

## Copy

`Se eliminará definitivamente en 12 días.`

Hard delete confirmation:

`Esta acción no se puede deshacer.`

---

# 75. Evidence and file links

## Scope

Planner stores references, not file bytes.

Entities:

- Goal;
- Milestone;
- numeric progress entry;
- Task, optional.

## UI

- attachments collapsed;
- thumbnail only when safe;
- filename;
- owner;
- date;
- open;
- remove link.

## Security

- signed URLs;
- expiry;
- capability check;
- no public URL;
- file removal from Planner does not delete Documents resource unless explicitly requested through its module.

## Completion

Evidence is never mandatory in this specification.

---

# 76. Export

## Supported

### Goal

- PDF;
- CSV;
- JSON.

### Planner range

- CSV;
- JSON.

## PDF

Human-readable:

- Goal summary;
- progress;
- Milestones;
- Tasks;
- Activity summary.

## CSV

Structured, one relation per export section or separate files in bundle.

## JSON

Versioned schema for backup/interoperability.

## Security

- generated server-side;
- authorization at request and download;
- temporary signed URL;
- audit record;
- personal data warning.

---

# 77. Planner Preferences

## Screen

Accessible from Planner menu.

## Preferences

- default Task visibility;
- default Event visibility;
- first day of week;
- default Calendar view;
- time format;
- task completion haptics;
- recommendation learning;
- notification preferences;
- archived visibility;
- offline queue status;
- family patterns review entry.

## Rules

Household timezone is structural and edited outside Planner by allowed role.

---

# 78. Family Patterns Review

## Objective

Give transparency and control over learned structured patterns.

## Sections

- Responsible suggestions.
- Usual schedules.
- Routines.
- Templates.
- Rejected suggestions.
- Estimated durations.

## Pattern row

- human explanation;
- confidence expressed qualitatively;
- evidence count optional;
- last used;
- edit;
- remove;
- disable.

## Copy example

`Solemos asignar las tareas de mascotas a Gabriel.`

Actions:

- Cambiar.
- Dejar de sugerir.

No mostrar raw confidence decimal.

---

# 79. Canonical frontend types

The following shapes are normative. Exact naming may follow repository conventions.

```ts
type PlannerVisibility = 'household' | 'personal';
type PlannerPriority = 'low' | 'normal' | 'high';

type TaskStatus =
  | 'pending'
  | 'awaiting_verification'
  | 'completed'
  | 'verified'
  | 'cancelled';

type EventStatus = 'scheduled' | 'cancelled';

type GoalStatus = 'active' | 'completed' | 'closed';

type GoalProgressMode =
  | 'steps'
  | 'tasks'
  | 'numeric'
  | 'boolean'
  | 'none';

type GoalTargetType =
  | 'count'
  | 'amount'
  | 'percentage'
  | 'boolean'
  | null;

interface PlannerMemberSummary {
  membership_id: string;
  person_id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
}

interface PlannerTask {
  id: string;
  household_id: string;
  visibility: PlannerVisibility;
  title: string;
  description: string | null;
  type_key: string;
  priority: PlannerPriority;
  due_date: string | null;
  due_time: string | null;
  timezone: string | null;
  estimated_minutes: number | null;
  assigned_to_member_id: string | null;
  assignee: PlannerMemberSummary | null;
  created_by_member_id: string;
  requires_verification: boolean;
  status: TaskStatus;
  goal_id: string | null;
  goal_milestone_id: string | null;
  goal_summary: {
    id: string;
    title: string;
  } | null;
  origin: PlannerOrigin | null;
  completed_at: string | null;
  verified_at: string | null;
  cancelled_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  pending_sync: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

interface PlannerOrigin {
  module: string;
  entity_type: string;
  entity_id: string;
  action: string | null;
  display_label: string | null;
}

interface PlannerEvent {
  id: string;
  household_id: string;
  visibility: PlannerVisibility;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  timezone: string;
  location_name: string | null;
  status: EventStatus;
  recurrence_rule: string | null;
  series_event_id: string | null;
  original_occurrence_start_at: string | null;
  participants: PlannerEventParticipantSummary[];
  archived_at: string | null;
  deleted_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

interface PlannerEventParticipantSummary {
  membership_id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'organizer' | 'participant';
  response: 'needs_action' | 'accepted' | 'declined' | 'tentative';
}

interface PlannerGoal {
  id: string;
  household_id: string;
  visibility: PlannerVisibility;
  title: string;
  description: string | null;
  category: 'home' | 'family' | 'finance' | 'health' | 'education' | 'other';
  priority: PlannerPriority;
  progress_mode: GoalProgressMode;
  target_type: GoalTargetType;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  progress_percentage: number | null;
  progress_text: string;
  starts_at: string | null;
  ends_at: string | null;
  status: GoalStatus;
  owner_member_id: string;
  responsible_member_id: string | null;
  is_pinned_for_viewer: boolean;
  next_action: PlannerNextAction | null;
  risk_signal: PlannerRiskSignal | null;
  completed_at: string | null;
  closed_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

interface PlannerNextAction {
  kind:
    | 'create_task'
    | 'complete_task'
    | 'verify_task'
    | 'add_milestone'
    | 'toggle_milestone'
    | 'add_progress'
    | 'define_target'
    | 'review_goal';
  label: string;
  entity_id: string | null;
}

interface PlannerRiskSignal {
  code: 'target_close' | 'overdue_tasks' | 'target_close_with_remaining_work';
  message: string;
  facts: Record<string, number | string>;
}

interface PlannerGoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  note: string | null;
  target_date: string | null;
  achieved: boolean;
  achieved_at: string | null;
  sort_order: number;
  linked_task_count: number;
  linked_task_completed_count: number;
  version: number;
}
```

---

# 80. Canonical create and update payloads

## 80.1 Create Task

```ts
interface CreateTaskInput {
  title: string;
  description?: string | null;
  visibility?: PlannerVisibility;
  type_key?: string;
  priority?: PlannerPriority;
  due_date?: string | null;
  due_time?: string | null;
  timezone?: string | null;
  estimated_minutes?: number | null;
  assigned_to_member_id?: string | null;
  requires_verification?: boolean;
  goal_id?: string | null;
  goal_milestone_id?: string | null;
  recurrence_rule?: string | null;
  reminder_drafts?: ReminderDraft[];
  checklist?: Array<{ title: string }>;
  origin?: {
    module: string;
    entity_type: string;
    entity_id: string;
    action?: string | null;
    metadata?: Record<string, unknown>;
  };
}
```

Server ignores any client-provided:

- household_id;
- created_by_member_id;
- status;
- completed_by;
- verified_by;
- version initial value.

## 80.2 Update Task

```ts
interface UpdateTaskInput {
  version: number;
  title?: string;
  description?: string | null;
  visibility?: PlannerVisibility;
  type_key?: string;
  priority?: PlannerPriority;
  due_date?: string | null;
  due_time?: string | null;
  timezone?: string | null;
  estimated_minutes?: number | null;
  assigned_to_member_id?: string | null;
  requires_verification?: boolean;
  goal_id?: string | null;
  goal_milestone_id?: string | null;
  recurrence_rule?: string | null;
}
```

Status is forbidden.

## 80.3 Complete Task

```ts
interface CompleteTaskInput {
  version: number;
  idempotency_key: string;
  completed_at_client?: string;
}
```

## 80.4 Verify Task

```ts
interface VerifyTaskInput {
  version: number;
  idempotency_key: string;
}
```

## 80.5 Create Event

```ts
interface CreateEventInput {
  title: string;
  description?: string | null;
  visibility?: PlannerVisibility;
  starts_at: string;
  ends_at?: string | null;
  all_day?: boolean;
  timezone: string;
  location_name?: string | null;
  location_details?: string | null;
  recurrence_rule?: string | null;
  participant_member_ids?: string[];
  reminders?: ReminderDraft[];
  linked_task_ids?: string[];
}
```

## 80.6 Update Event

Includes `version` and recurrence scope when applicable.

```ts
interface UpdateEventInput {
  version: number;
  scope?: 'this_occurrence' | 'this_and_following' | 'entire_series';
  original_occurrence_start_at?: string;
  patch: Partial<CreateEventInput>;
}
```

## 80.7 Create Goal

```ts
interface CreateGoalInput {
  title: string;
  description?: string | null;
  visibility?: PlannerVisibility;
  category?: PlannerGoal['category'];
  priority?: PlannerPriority;
  progress_mode?: GoalProgressMode;
  target_type?: GoalTargetType;
  target_value?: number | null;
  unit?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  responsible_member_id?: string | null;
  participant_drafts?: Array<{
    member_id: string;
    role: 'editor' | 'participant' | 'viewer';
  }>;
  recurrence_rule?: string | null;
  template_id?: string | null;
}
```

Server sets:

- household;
- owner;
- status active;
- current default.

## 80.8 Update Goal

Includes `version`. Status is forbidden.

## 80.9 Goal progress

```ts
interface AddGoalProgressInput {
  version: number;
  delta: number;
  note?: string | null;
  idempotency_key: string;
}
```

## 80.10 Template Preview

```ts
interface TemplatePreviewInput {
  template_id: string;
  anchor_date?: string;
  goal_overrides?: Record<string, unknown>;
  task_overrides?: Record<string, Record<string, unknown>>;
  disabled_item_ids?: string[];
}
```

## 80.11 Template Commit

```ts
interface TemplateCommitInput {
  preview_token: string;
  preview_hash: string;
  idempotency_key: string;
}
```

---

# 81. Summary contract

```ts
interface PlannerSummary {
  household_id: string;
  generated_at: string;
  projection_version: string;
  tasks: PlannerTask[];
  events: PlannerEvent[];
  goal: PlannerGoal | null;
  counts: {
    overdue_tasks: number;
    today_tasks: number;
    awaiting_verification: number;
    upcoming_events: number;
    active_goals: number;
  };
  partial_errors: Array<{
    section: 'tasks' | 'events' | 'goals';
    code: string;
  }>;
}
```

Rules:

- summary never returns inaccessible personal items;
- no briefing_text pretending to be intelligence;
- optional deterministic sentence may be generated from returned facts, but UI can construct approved copy from codes;
- maximum sizes are enforced server-side.

---

# 82. Search contract

```ts
interface PlannerSearchResult {
  type: 'task' | 'event' | 'goal' | 'template';
  id: string;
  title: string;
  subtitle: string | null;
  matched_fields: string[];
  context: {
    date?: string;
    status?: string;
    assignee_name?: string;
  };
}
```

Search query is not stored in raw telemetry.

---

# 83. Recommendation contract

```ts
interface PlannerRecommendation {
  id: string;
  type: string;
  title: string;
  explanation: string;
  confidence_band: 'high' | 'medium';
  action: {
    kind: string;
    preview_required: boolean;
    payload: Record<string, unknown>;
  };
  source_facts: Array<{
    code: string;
    display_text: string;
  }>;
  expires_at: string | null;
}
```

No low-confidence recommendation is shown automatically.

---

# 84. Screen telemetry matrix

| Screen | Open | Primary action | Abandon | Error | Performance |
|---|---|---|---|---|---|
| PlannerShell | planner_opened | tab_changed | n/a | planner_load_failed | time_to_content |
| Tasks | tasks_viewed | task_completed | filter_abandoned | task_action_failed | list_render_ms |
| TaskForm | task_create_started | task_create_completed | task_create_abandoned | task_create_failed | submit_ms |
| Calendar | calendar_viewed | calendar_item_opened | n/a | calendar_load_failed | range_load_ms |
| EventForm | event_create_started | event_create_completed | event_create_abandoned | event_create_failed | submit_ms |
| Goals | goals_viewed | goal_opened | filter_abandoned | goals_load_failed | list_render_ms |
| GoalForm | goal_create_started | goal_create_completed | goal_create_abandoned | goal_create_failed | submit_ms |
| GoalDetail | goal_detail_viewed | goal_primary_action | n/a | goal_action_failed | detail_load_ms |
| TemplatePreview | template_previewed | template_committed | template_preview_abandoned | template_commit_failed | preview_ms |
| Search | planner_search_opened | search_result_opened | search_closed | search_failed | search_ms |

Telemetry never sends entity titles.

---

# 85. Notification and realtime interaction

A realtime update must not create duplicate in-app notifications for the local actor.

Rules:

- mutation echo updates state, no notification;
- remote meaningful change may show subtle toast;
- assignment to current user can notify;
- every update is not a notification;
- Activity can record more than notification layer exposes.

---

# 86. Destructive confirmation copy

## Cancel Task

Title:

`Cancelar tarea`

Body:

`Dejará de aparecer entre las pendientes. Podés restaurarla después.`

Action:

`Cancelar tarea`

## Trash Task

Title:

`Enviar a papelera`

Body:

`Podés restaurarla durante 30 días.`

## Cancel Event

Title:

`Cancelar evento`

Series prompt first when recurring.

## Close Goal

Title:

`Cerrar meta`

Body:

`Dejará de aparecer entre las activas. Podés reabrirla después.`

## Trash Goal

Body:

`La meta, sus pasos y sus vínculos dejarán de estar disponibles. Podés restaurarla durante 30 días.`

Tasks are not automatically trashed.

---

# 87. UI state transition behavior

## Optimistic allowed

- Task complete.
- Task verify.
- Milestone toggle.
- Pin.
- Reorder.
- Simple link/unlink.
- RSVP.

## Wait for server

- Create template commit.
- Batch move.
- Close Goal with open work.
- Trash.
- Restore complex entity.
- Recurring series changes.
- Participant role changes.
- Numeric correction.

## Rollback

- restore previous cache snapshot;
- show concise error;
- preserve user's position;
- never refetch to blank first.

---

# 88. Accessibility copy examples

Task checkbox:

- pending: `Completar tarea: Limpiar cocina`.
- awaiting verifier: `Verificar tarea: Limpiar cocina`.
- completed: `Tarea completada: Limpiar cocina`.

Swipe alternative menu:

`Más acciones para Limpiar cocina`.

Progress:

`Tres de cinco tareas terminadas`.

Never announce only:

`60 por ciento`

when semantic detail is available.

---

# 89. Code-gap protocol

After this document:

1. inspect repository;
2. produce `planner_final_gap_map.md`;
3. each gap references this section;
4. classify:
   - already compliant;
   - partial;
   - missing;
   - conflict;
   - migration risk;
5. no implementation task may redefine product behavior;
6. uncertainty becomes a documented issue against this spec;
7. only security, legal or proven usability evidence can reopen a decision.

---

# 90. Final implementation rule

A vertical slice is incomplete until it includes:

- migration;
- RLS;
- backend;
- API client;
- cache;
- UI;
- states;
- realtime;
- telemetry;
- tests;
- documentation.

Frontend-only visual changes do not close a domain gap.

Backend-only endpoints do not close a user flow.

---

# 91. Document completion status

This version defines:

- final product philosophy;
- all domains;
- state transitions;
- permissions;
- screens;
- gestures;
- information density;
- copy rules;
- create/edit flows;
- templates and packs;
- recommendations;
- backend services;
- DB target;
- API target;
- realtime;
- offline;
- telemetry;
- audit;
- family patterns;
- Inventory integration;
- extension contracts;
- QA;
- migration order;
- Definition of Closed.

La especificación continúa con una capa de cierre normativo en las secciones 92–119. Después de esa capa, el siguiente artefacto será `planner_final_gap_map.md`.

---

# 92. Regla de cierre técnico adaptable

Esta sección cierra las decisiones que antes dependían del código real.

## 92.1 Qué puede adaptarse

Solo pueden adaptarse al repositorio:

- nombres físicos de archivos;
- ubicación de carpetas;
- nombre exacto de helpers existentes;
- convención de nombres SQL;
- librería concreta de cache si ya existe una equivalente;
- wrapper visual ya adoptado por HomePlus;
- nombre interno del adapter de Inventory.

## 92.2 Qué no puede adaptarse

No puede cambiarse sin modificar esta especificación:

- comportamiento;
- permisos;
- estados;
- transiciones;
- privacidad;
- contratos lógicos;
- copy visible;
- límites;
- retención;
- reglas de conflicto;
- criterios de QA;
- arquitectura de seguridad.

## 92.3 Implementación genérica de calidad

Cuando el código actual no ofrezca una abstracción compatible:

1. se crea una interfaz estable;
2. se adapta la implementación existente;
3. se mantiene el comportamiento de este documento;
4. se evita duplicar lógica;
5. se documenta el mapping en el gap map.

---

# 93. Permisos definitivos

## 93.1 Matriz final por rol

### Coordinator

Puede:

- ver Planner household;
- crear, editar, asignar, completar, verificar, cancelar, archivar y restaurar contenido household;
- administrar Templates del hogar;
- administrar capabilities;
- transferir ownership household;
- ver Activity household;
- ver Audit técnico permitido.

No puede:

- ver contenido personal ajeno sin ser participant;
- verificar su propia Task;
- alterar Audit;
- reasignar una Task personal ajena sin acceso.

### Adult

Puede:

- crear Tasks, Events y Goals household o personales;
- asignar a miembros activos;
- editar entidades household creadas por él;
- editar cualquier Task household solo si es assignee, creator o tiene delegación explícita;
- completar Tasks asignadas o sin asignar;
- verificar Tasks ajenas;
- gestionar participants de Events propios;
- gestionar participants de Goals propias.

No puede:

- completar cualquier Task asignada a otra persona sin reasignación;
- administrar Templates household;
- cambiar capabilities;
- acceder a personales ajenas.

### Senior

Tiene las mismas capacidades operativas que Adult.

Diferencia:

- no administra capabilities;
- no administra Templates household;
- la UI no simplifica ni restringe automáticamente por edad;
- accesibilidad se resuelve mediante preferencias, no reduciendo autoridad.

### Adolescent

Puede:

- crear Task household;
- crear Task personal;
- crear Event personal y household;
- crear Goal personal y household;
- editar sus propias entidades;
- completar Tasks asignadas;
- completar Tasks sin asignar;
- participar y comentar.

No puede:

- asignar a otros;
- verificar;
- administrar participants;
- editar entidades ajenas;
- crear Templates household;
- ver Audit.

### Child

Puede:

- ver Tasks asignadas;
- completar Tasks asignadas;
- crear Task personal mediante flujo guiado;
- crear Goal personal `boolean`, `steps` o `none` mediante flujo guiado;
- ver Events explícitamente compartidos;
- responder RSVP propio.

No puede:

- crear contenido household;
- asignar;
- verificar;
- comentar;
- crear recurrencias;
- gestionar participants;
- ver listas completas de members desde Planner;
- crear automations o Templates.

`Guiado` significa:

- menos campos;
- sin opciones avanzadas;
- visibilidad personal por defecto;
- no asigna a terceros;
- confirmaciones claras;
- copy simple;
- ningún dato compartido sin elección explícita.

### Guest

Puede únicamente:

- ver Tasks asignadas;
- completar Tasks asignadas;
- ver Events donde es participant;
- responder RSVP;
- ver Goals donde es viewer o participant.

No puede crear, editar, asignar, comentar, verificar, archivar ni ver Search global.

## 93.2 Reapertura

- Task completed: creator, assignee, coordinator.
- Task verified: coordinator o el verifier original; assignee no puede reabrirla solo.
- Goal household completed/closed: owner o coordinator.
- Goal personal: owner.
- Event cancelled: organizer o coordinator si household.

## 93.3 `households.config.permissions`

Schema lógico:

```json
{
  "planner": {
    "adult_can_assign_members": true,
    "adolescent_can_create_household_tasks": true,
    "adolescent_can_create_household_events": true,
    "adolescent_can_create_household_goals": true,
    "senior_can_assign_members": true,
    "child_guided_personal_creation": true,
    "guest_can_complete_assigned_tasks": true
  }
}
```

Reglas:

- solo coordinator modifica;
- keys desconocidas se rechazan;
- defaults anteriores son canónicos;
- no puede habilitar auto-verificación;
- no puede abrir contenido personal;
- no puede dar administración a Child o Guest;
- cambio incrementa `permissions_version`.

## 93.4 Cambio de capability con pantalla abierta

- realtime invalida `PlannerContext`;
- se cancela la mutation aún no enviada;
- respuesta server 403 invalida cache de permisos;
- formulario dirty queda visible en read-only;
- se permite copiar texto local;
- no se permite guardar;
- copy: `Tus permisos cambiaron. Ya no podés guardar esta acción.`

---

# 94. Tipos y responsabilidades de Tasks

## 94.1 Decisión

`Tipo` y `Responsable` son conceptos distintos.

- Tipo clasifica el trabajo.
- Responsable es una Membership.
- No existe entidad `Responsibility` separada en Planner v2.

## 94.2 Catálogo de sistema

Orden final:

1. `general`
2. `cleaning`
3. `shopping`
4. `cooking`
5. `pets`
6. `study`
7. `health`
8. `payments`
9. `maintenance`
10. `other`

Labels:

- General.
- Limpieza.
- Compras.
- Cocina.
- Mascotas.
- Estudios.
- Salud.
- Pagos.
- Mantenimiento.
- Otro.

`Salud` y `Pagos` son categorías descriptivas. No implementan Medication ni Finance.

## 94.3 Iconos

| key | Ionicon |
|---|---|
| general | checkmark-circle-outline |
| cleaning | sparkles-outline |
| shopping | cart-outline |
| cooking | restaurant-outline |
| pets | paw-outline |
| study | book-outline |
| health | heart-outline |
| payments | receipt-outline |
| maintenance | construct-outline |
| other | ellipse-outline |

## 94.4 Color

- los Tipos no tienen colores fuertes propios;
- usan icono `textSecondary`;
- selected usa terracotta;
- Inventory origin usa sage;
- urgencia usa warning/danger;
- no se permite color personalizado en v2.

## 94.5 Tipos personalizados

Entran.

Permisos:

- coordinator crea, edita, archiva y reordena;
- adult/senior puede proponer uno mediante creación de Task, pero se guarda como `other` hasta aprobación;
- máximo 20 activos por household;
- title 1–30;
- icono elegido de allowlist;
- key UUID, no slug mutable.

Al archivar:

- Tasks históricas conservan type ID y snapshot label;
- no aparece en nuevas creaciones;
- se puede restaurar;
- no hard delete mientras tenga referencias.

## 94.6 Family Patterns

Los patrones usan `type_id`, no texto libre.

Templates de sistema usan system type IDs y pueden mapearse a custom solo durante preview.

---

# 95. Checklist y dependencias

## 95.1 Checklist

- máximo 30 items por Task;
- title 1–120;
- reordenable;
- cada toggle es idempotente;
- completar todos los items no completa la Task;
- al completar el último se muestra `Todos los pasos están listos. ¿Completar tarea?`;
- una Task puede completarse con items abiertos;
- si quedan items abiertos, requiere confirmación;
- con `requires_verification=true`, los items abiertos quedan visibles al verifier.

## 95.2 Dependencias

Solo existe un tipo en v2:

```text
blocks
```

A depende de B significa que A está bloqueada hasta que B esté:

- completed;
- verified;
- cancelled con acknowledgment.

## 95.3 Cancelación de prerequisite

Si B se cancela:

- A pasa a `dependency_attention`;
- no cambia su status persistido;
- creator/assignee elige:
  - continuar igualmente;
  - reemplazar dependencia;
  - cancelar A.

## 95.4 Completion

No se puede completar una Task con prerequisite pendiente.

Override:

- coordinator;
- creator si ambas Tasks son propias;
- requiere confirmación;
- registra Activity.

## 95.5 Ciclos

Backend ejecuta búsqueda de grafo en la transacción.

Rechaza:

- self dependency;
- ciclo directo;
- ciclo transitivo;
- cross-household;
- dependency trashed.

## 95.6 Offline

No se crean, editan ni eliminan dependencias offline.

Una Task cacheada como bloqueada no puede completarse offline.

---

# 96. Recurrencia de Tasks y Routines

## 96.1 Representación

- RFC 5545 RRULE;
- timezone IANA;
- `recurrence_exceptions`;
- serie canónica + occurrences materializadas.

## 96.2 Materialización

Job diario mantiene:

- próximos 90 días;
- mínimo 10 occurrences;
- máximo 366 occurrences por serie activas en ventana.

Se materializa antes si una vista solicita un rango no cubierto.

## 96.3 Occurrence

Cada occurrence es una Task real con:

- `series_task_id`;
- `occurrence_key`;
- status independiente;
- versión independiente.

## 96.4 Completion tardía

- completa esa occurrence;
- conserva fecha original;
- Activity marca `completed_late`;
- no modifica occurrences futuras.

## 96.5 Omitir

Acción `Omitir esta vez`:

- status cancelled;
- reason `skipped_occurrence`;
- no elimina;
- no afecta serie.

## 96.6 Edit scopes

- esta occurrence;
- esta y siguientes;
- toda la serie.

Cambiar responsable en serie:

- aplica a futuras pending;
- no cambia completed/verified;
- no cambia una occurrence con override explícito.

## 96.7 Timezone

- serie guarda timezone;
- UTC se deriva;
- cambiar household timezone no reinterpreta automáticamente series existentes;
- se ofrece migración con preview.

## 96.8 Pause y stop

- `paused_at`: no materializa nuevas occurrences;
- existentes permanecen;
- resume continúa desde próxima oportunidad;
- `stopped_at`: finaliza definitivamente;
- se puede duplicar, no reabrir serie detenida.

## 96.9 Routine

Una Routine instancia Tasks reales.

No existen items visuales sin entidad.

Una sesión:

- agrupa occurrences por `routine_session_id`;
- no duplica una occurrence existente;
- pause es local + server state;
- resume conserva progreso.

## 96.10 Streaks

Streaks quedan fuera de Planner v2.

Se guardan datos de occurrence suficientes para implementarlas después.

No se muestran rachas, récords ni copy asociado.

---

# 97. Calendar exacto

## 97.1 Semana

- default: lunes;
- usuario puede elegir domingo;
- se guarda en `planner_user_preferences`;
- locale no sobrescribe preferencia existente.

## 97.2 Escala

### Mobile

- 60 px por hora;
- divisiones de 15 minutos;
- viewport inicia una hora antes del primer item, mínimo 06:00;
- botón `Ahora`.

### Tablet/Web

- 72 px por hora;
- división de 15 minutos;
- columnas más anchas;
- max content 1.280 px.

## 97.3 Cross-midnight

- un Event conserva una entidad;
- se divide visualmente por día;
- primera parte indica continuación;
- no se generan clones.

## 97.4 Multi-day

- aparece en all-day strip;
- Month dibuja span;
- Week muestra barra superior;
- Day muestra `Continúa hasta…`.

## 97.5 Tasks sin hora

Se muestran en row `Tareas del día`, antes del timeline.

No ocupan un bloque horario.

## 97.6 Overlap

- layout por columnas;
- máximo tres columnas visibles;
- cuarto y siguientes se compactan en `+N`;
- tap abre overlap sheet;
- z-index por start time y duration.

## 97.7 Conflicts

Conflict advisory cuando:

- timed Events comparten al menos un participant;
- overlap mayor a 0;
- Events no están cancelled.

All-day solo conflictúa con otro all-day si comparten participant y ambos tienen `busy=true`.

Tasks no crean conflict duro.

## 97.8 Timezone y DST

- DB en UTC;
- entidad guarda timezone;
- UI usa timezone de entidad;
- Calendar default household timezone;
- librería debe soportar IANA y DST;
- no sumar milisegundos manualmente para días.

## 97.9 Month

- máximo 3 dots o indicators por día;
- luego `+N`;
- prioridad visual: Event timed, Event all-day, overdue Task, Task;
- titles viven en agenda inferior.

## 97.10 Drag and drop

Entra:

- Week y Day;
- web/tablet directo;
- mobile long press 350 ms y drag.

No entra en Month.

Al soltar:

- non-recurring: optimistic + undo;
- recurring: elegir scope antes de commit;
- Task sin hora arrastrada al timeline recibe due_time;
- arrastrar fuera del día cancela gesture.

---

# 98. Participants y RSVP

## 98.1 Invitación

Puede invitar:

- Event organizer;
- coordinator para Event household;
- adult/senior owner de Event propio.

## 98.2 Acceso

Ser participant concede acceso únicamente a ese Event personal.

No concede Search personal general ni acceso a otros Events.

## 98.3 RSVP

Estados:

- needs_action;
- accepted;
- declined;
- tentative.

Puede modificarse hasta `ends_at`.

Después queda read-only.

## 98.4 Participant list

Todos los participants pueden ver:

- display name;
- avatar;
- response.

Guest también, únicamente dentro del Event.

## 98.5 Salida del hogar

- participant se elimina de Events futuros;
- respuesta histórica queda en Activity snapshot;
- si organizer sale:
  - Event household pasa al coordinator más antiguo;
  - Event personal se cancela para el resto;
- series siguen misma regla.

## 98.6 Reminders RSVP

Si `needs_action`:

- primer reminder 24 horas después de invitación;
- segundo 24 horas antes del Event;
- no enviar si Event está a menos de 2 horas;
- máximo dos reminders.

---

# 99. Verification completa

## 99.1 Return

Endpoint:

```text
POST /tasks/:id/return
```

Requiere:

- reason 1–500;
- verifier capability;
- Task awaiting_verification.

Resultado:

- status pending;
- `returned_at`;
- `returned_by_member_id`;
- `verification_attempt` incrementado.

## 99.2 Visibilidad

Reason visible para:

- assignee;
- creator;
- verifiers;
- coordinator si household.

No aparece en card.

## 99.3 Reenvío

Puede completar nuevamente:

- assignee;
- creator si no assigned;
- member con `complete_any`.

Cada completion crea `planner_task_completion_attempts`.

## 99.4 Attempts

- sin límite técnico;
- UI muestra últimos 3;
- Activity conserva todos;
- recommendation puede sugerir dividir/reasignar después de 3 returns;
- no aplicar castigo.

## 99.5 Verifier ausente

Cualquier member con `task.verify` puede verificar.

No existe verifier fijo salvo assignment futura.

## 99.6 Personal Task

Coordinator solo verifica si:

- Task fue compartida;
- coordinator es participant explícito;
- no es quien la completó.

---

# 100. Recommendation Engine exacto

## 100.1 Score

Score 0–100:

```text
context relevance      30
pattern confidence     20
time relevance         15
availability/workload  15
user preference        10
fairness                5
recent feedback         5
```

## 100.2 Visibility threshold

- 75–100: high; puede preseleccionar con label `Sugerido`.
- 60–74: medium; se muestra como alternativa.
- <60: no se muestra automáticamente.

## 100.3 Evidence

Para crear patrón:

- mínimo 5 oportunidades;
- misma decisión en al menos 70%;
- mínimo 3 confirmaciones explícitas o correcciones consistentes.

## 100.4 Expiration

- captura: 24 h;
- scheduling: hasta que cambie entidad o 24 h;
- routine/template: 30 días;
- assignment: 7 días.

## 100.5 Rejection cooldown

- misma recommendation exacta: 30 días;
- mismo tipo: 7 días;
- 3 rechazos en 90 días deshabilitan el patrón hasta revisión.

## 100.6 Workload

Puntos por miembro:

```text
overdue Task                 5
high priority due today      4
normal due today             3
due next 7 days              1
each 30 estimated minutes    1
awaiting verification        0.5
```

Se consideran solo Tasks no canceladas/archivadas.

## 100.7 Tie-break

1. explicit preference;
2. habitual pattern;
3. lower workload;
4. last assigned oldest;
5. membership UUID ascending.

## 100.8 Explanation

Máximo dos hechos:

`Sugerido porque suele encargarse de Mascotas y tiene menos tareas esta semana.`

## 100.9 Fairness

En ventana de 30 días:

- si un miembro recibe >40% más workload que la mediana de elegibles;
- recommendation no lo preselecciona salvo preference explícita;
- muestra alternativa.

## 100.10 Datos permitidos

- Planner estructurado;
- Inventory structured origin;
- availability;
- Family Patterns consentidos.

No usa:

- mensajes;
- notas;
- comments;
- datos de Finance;
- contenido privado ajeno;
- inferencias sensibles.

---

# 101. Family Patterns exactos

## 101.1 Consentimiento

- household learning: opt-in del coordinator;
- personal learning: opt-in individual;
- product telemetry separado;
- Child y Guest no generan patterns;
- Adolescent genera patterns personales, nunca household assignment patterns.

## 101.2 Creación

Pattern se crea cuando cumple:

- 5 oportunidades;
- 70% consistencia;
- 3 acciones explícitas;
- ninguna prohibición activa.

## 101.3 Confidence

```text
confidence = confirmations / opportunities
```

Acotado 0–1.

Corrección:

- suma opportunity;
- resta confirmation del valor anterior;
- suma confirmation al nuevo valor.

Complete por sí solo no implica preferencia.

## 101.4 Decay

Cada 90 días sin evidencia:

- confidence × 0.9.

Si baja de 0.4:

- no se usa;
- queda archived.

A los 12 meses sin evidencia:

- se elimina salvo pin manual.

## 101.5 Sync

- server canonical;
- `version`;
- 409 en conflicto;
- cambios manuales ganan sobre aprendizaje automático;
- delete produce tombstone 30 días para evitar recreación inmediata.

## 101.6 Control

Usuario puede:

- ver;
- editar;
- pin;
- desactivar;
- eliminar;
- exportar JSON.

---

# 102. Templates y Packs definitivos

## 102.1 Editor

Screen completa con tabs:

- Información.
- Pasos.
- Tareas.
- Calendario.
- Reglas.

## 102.2 Versionado

- cada publicación crea versión immutable;
- draft editable;
- instancias guardan template_version_id;
- editar Template usada no cambia instancias;
- rollback crea nueva versión basada en anterior.

## 102.3 System Templates

- read-only;
- actualizadas por seed versionado;
- traducciones por locale key;
- usuario puede `Guardar como copia`;
- nunca se pisan copias household.

## 102.4 Permissions

- coordinator administra household templates;
- cualquier adult/senior puede crear personal;
- adolescent puede usar, no publicar;
- child/guest solo usar templates permitidas.

## 102.5 Favorites

Entran.

- per-member;
- máximo 20;
- orden manual;
- no altera Template.

## 102.6 Limits

- 100 household templates;
- 50 personal por member;
- 50 Tasks por Template;
- 20 Milestones;
- 10 Events;
- 100 checklist items totales;
- no Templates anidadas;
- dependency graph acyclic.

## 102.7 Preview token

- duración 15 minutos;
- one-time commit;
- ligado a member, household y template version;
- commit posterior devuelve 410;
- cambio de contexto devuelve 409.

## 102.8 Failure

Commit es all-or-nothing.

No existe partial success.

## 102.9 Guardar como copia

Aparece siempre cuando:

- system template fue modificada;
- user no tiene edit permission;
- quiere conservar variante.

---

# 103. Reminders y Notifications exactos

## 103.1 Providers

Implementación inicial:

- in-app notifications propias;
- Expo Push Notifications;
- email queda adapter no habilitado en Planner v2.

Abstracción:

```text
PlannerNotificationProvider
```

## 103.2 Defaults

### Task

- sin reminder por defecto si no tiene hora;
- con due_time: reminder 30 minutos antes;
- high priority: además 24 horas antes.

### Event

- timed: 30 minutos antes;
- all-day: día anterior a las 19:00;
- participant invite: in-app inmediata.

### Goal

- sin reminder por defecto;
- user activa manualmente;
- Template puede sugerir, preview lo muestra.

## 103.3 Quiet hours

Default:

```text
22:00–08:00
```

Timezone personal.

Urgencias no omiten quiet hours porque Planner no define emergencias.

Se difiere a 08:00.

## 103.4 Retry

Push:

- intento inmediato;
- +1 min;
- +5 min;
- +30 min;
- luego failed.

## 103.5 Expiration

- Task: 24 h después de due;
- Event: al start;
- Goal: 24 h después del scheduled check-in;
- invite: al Event end.

## 103.6 Dedup

Key:

```text
recipient + entity + reminder_type + scheduled_for
```

## 103.7 Snooze

- 10 minutos;
- 1 hora;
- mañana 09:00.

No snooze después de expiry.

## 103.8 Múltiples dispositivos

- fan-out a devices activos;
- leer in-app sincroniza read state;
- push ya entregada no se retira;
- action en un device actualiza todos por realtime.

## 103.9 Lock screen

Default:

- household: título permitido;
- personal: `Tenés un recordatorio de HomePlus`;
- user puede permitir contenido personal.

## 103.10 Menores

- Child: in-app y push a su propio device;
- no email;
- no copia automática a coordinator;
- assignment notification sí;
- contenido personal permanece privado.

---

# 104. Offline exacto

## 104.1 Storage

Adapters:

- Native: SQLite.
- Web: IndexedDB.

Payload sensible:

- AES-GCM;
- key por account en SecureStore/WebCrypto protected storage;
- DB file no se considera suficiente cifrado.

## 104.2 Queue limits

- 500 mutations;
- 10 MB;
- 7 días;
- al superar, bloquear nuevas offline writes y explicar.

## 104.3 Ordering

- FIFO por household + entity;
- máximo 3 entities en paralelo;
- dependencias usan `depends_on_mutation_id`.

## 104.4 Retry

```text
2s
5s
15s
60s
5m
15m
1h
```

Máximo 10 intentos.

Después: `failed_sync`.

## 104.5 IDs

- UUID v4 client-side;
- server respeta ID si no colisiona;
- mutation ID distinto del entity ID.

## 104.6 Rollback

- optimistic cache conserva before snapshot;
- permanent failure ofrece:
  - Reintentar.
  - Editar.
  - Descartar.

## 104.7 Conflicts

Field-level merge permitido para:

- description;
- note;
- reminder.

No permitido:

- status;
- assignee;
- visibility;
- recurrence;
- numeric progress;
- participants.

## 104.8 Logout

Con queue pendiente:

- modal obligatorio;
- `Sincronizar ahora`;
- `Descartar cambios y salir`;
- cancelar logout.

Forced token invalidation:

- queue se cifra y bloquea;
- solo el mismo account puede recuperarla por 7 días.

## 104.9 Household switch

- pausa queue anterior;
- no mezcla caches;
- badge indica pendientes;
- al volver, reanuda.

---

# 105. Realtime exacto

## 105.1 Tecnología

Usar Supabase Realtime porque es parte del stack.

Arquitectura:

- DB mutation;
- transactional outbox;
- publisher;
- private Broadcast channels;
- catch-up endpoint.

## 105.2 Channels

```text
planner:household:{household_id}
planner:member:{membership_id}
```

Household channel:

- contenido household visible.

Member channel:

- contenido personal;
- assignments;
- permissions;
- private recommendations.

## 105.3 Auth

- JWT Supabase;
- server valida membership;
- channel private;
- RLS no se reemplaza por channel security.

## 105.4 Ordering

Outbox agrega:

```text
sequence bigint generated
```

Cursor:

```text
sequence:event_id
```

Cliente procesa sequence ascendente.

## 105.5 Batch

- hasta 50 eventos;
- ventana 100 ms;
- payload máximo 64 KB;
- payload grande obliga invalidation/fetch.

## 105.6 Catch-up

```text
GET /api/planner/sync/catch-up?after_sequence=
```

- limit 500;
- paginado;
- si cursor expiró: `full_resync_required`.

## 105.7 Retention

- outbox published: 7 días;
- failed: 30 días;
- Activity no depende de outbox.

## 105.8 Retry publisher

- exponential;
- dead-letter después de 20 intentos;
- alerta operativa.

## 105.9 Multiple web tabs

- `BroadcastChannel`;
- una tab leader mantiene socket;
- followers reciben eventos;
- leader election por lease 10 s;
- fallback: cada tab socket si BroadcastChannel no existe.

---

# 106. Base de datos ejecutable: convenciones cerradas

## 106.1 Motor

PostgreSQL/Supabase.

## 106.2 Tipos

- IDs: `uuid`;
- time: `timestamptz`;
- date-only: `date`;
- time-only: `time without time zone`;
- money/progress: `numeric(18,4)`;
- version: `bigint`;
- sort_order: `integer`;
- payload: `jsonb`;
- RRULE: `text` validado por service y parser SQL básico.

## 106.3 Foreign keys

- household: `ON DELETE RESTRICT`;
- membership actor history: `ON DELETE RESTRICT`, membership usa soft delete;
- Goal on Task: `ON DELETE SET NULL`;
- Milestone on Task: `ON DELETE SET NULL`;
- checklist: `ON DELETE CASCADE` solo ante hard delete posterior;
- participants: `ON DELETE CASCADE` con entidad;
- templates referenced: `ON DELETE SET NULL`;
- Audit: sin FK destructiva a entidades.

## 106.4 Triggers

Todas las tablas mutables:

- `set_updated_at`;
- `increment_version`;
- invariant validation where SQL-capable;
- outbox enqueue para cambios de dominio;
- actor context desde request setting cuando corresponda.

## 106.5 Functions

Mínimas:

```text
current_person_id()
current_household_member_id(household_id)
is_active_household_member(household_id)
has_planner_capability(household_id, capability)
can_select_planner_entity(entity_type, entity_id)
can_update_planner_entity(entity_type, entity_id)
```

## 106.6 Grants

Authenticated:

- select/insert/update en tablas operativas mediante RLS;
- no direct delete;
- no direct Audit insert;
- no direct outbox insert;
- RPCs para lifecycle sensible.

Service role:

- jobs;
- outbox;
- cleanup;
- notifications.

## 106.7 Policies

Cada tabla tiene:

- select;
- insert;
- update.

Delete policy no existe para cliente.

Personal verifica owner/participant.

## 106.8 Migration strategy

- expand;
- backfill;
- dual compatibility;
- switch;
- contract.

No migration irreversible en el mismo release que activa nueva UI.

## 106.9 SQL tests

Cada migration incluye:

- happy path;
- RLS denial;
- cross-household;
- invalid state;
- constraint;
- rollback/forward-fix test.

Los nombres físicos pueden adaptarse; estas reglas no.

---

# 107. API cerrada

## 107.1 Base

Se conserva:

```text
/api/planner
```

Contract version header:

```text
X-Planner-Contract-Version: 2
```

No se cambia URL sin necesidad.

## 107.2 Content

- JSON UTF-8;
- dates ISO 8601;
- UUID lowercase;
- null explícito;
- campos desconocidos rechazados en writes.

## 107.3 Pagination

Cursor opaque base64url:

```json
{
  "sort_value": "...",
  "id": "uuid"
}
```

- default 50;
- max 100;
- stable sort + id tie-break;
- no offset en listas grandes.

## 107.4 Sort defaults

Tasks:

```text
attention DESC, due_date ASC NULLS LAST, due_time ASC, created_at DESC, id ASC
```

Events:

```text
starts_at ASC, id ASC
```

Goals active:

```text
pinned DESC, next_action_rank DESC, ends_at ASC NULLS LAST, updated_at DESC
```

Finalized:

```text
terminal_at DESC, id ASC
```

## 107.5 Status codes

- 200 read/update/action idempotente;
- 201 create;
- 202 queued async export;
- 204 no body only for unlink/delete relation;
- 400 malformed;
- 401 auth;
- 403 permission;
- 404 hidden/not found;
- 409 version/idempotency/state conflict;
- 410 expired preview/cursor;
- 422 semantic validation;
- 429 rate;
- 500 internal;
- 503 dependency unavailable.

## 107.6 Retry

Client retries automatically:

- GET;
- HEAD;
- idempotent POST with key on network failure;
- max 2 foreground retries.

No automatic retry:

- validation;
- permission;
- conflict;
- destructive action without idempotency.

## 107.7 Idempotency retention

- ordinary mutations: 24 h;
- Template/Pack commit: 7 días;
- offline mutations: 7 días;
- export request: 24 h.

## 107.8 Field masks

No entran en v2.

Se usan:

- list summary schema;
- detail schema;
- dedicated projections.

## 107.9 OpenAPI

Obligatorio:

- OpenAPI 3.1;
- schemas compartidos;
- generated client types where feasible;
- examples;
- error codes;
- security;
- idempotency headers.

---

# 108. Diseño visual de producción

## 108.1 Grid

Spacing scale:

```text
4, 8, 12, 16, 20, 24, 32, 40
```

## 108.2 Radius

```text
small 10
medium 14
large 18
sheet 24
pill 999
```

## 108.3 Typography

```text
hero       34/41 semibold
title1     28/34 semibold
title2     22/28 semibold
title3     20/25 semibold
body       17/23 regular
bodySmall  15/20 regular
caption    13/17 regular
micro      11/14 medium
```

## 108.4 Breakpoints

- mobile: <600;
- tablet: 600–1023;
- desktop/web: >=1024.

Content max:

- forms 720;
- lists 960;
- Calendar 1280.

## 108.5 Cards

TaskCard:

- min height 72;
- padding 16;
- gap 12;
- title max 2 lines;
- metadata 1 line;
- description not shown.

GoalCard:

- min 88;
- title 2 lines;
- next action 2 lines;
- progress 4 px.

Agenda item:

- min 64;
- title 2;
- context 1.

## 108.6 Sheets

- mobile width 100%;
- max height 92%;
- top radius 24;
- tablet/web max width 640;
- form sheet max width 720;
- backdrop 32% black;
- drag handle 36×5.

## 108.7 FAB

- 56×56;
- bottom 16 + safe area;
- right 16 mobile;
- right content edge desktop;
- hidden while keyboard covers primary action;
- no extended label by default.

## 108.8 Pressed

- opacity 0.88;
- scale 0.98;
- 100 ms;
- disabled opacity 0.42;
- focus ring 2 px on web.

## 108.9 Contrast

WCAG AA.

No semantic information by color alone.

---

# 109. Motion y gestos finos

## 109.1 Swipe

- reveal threshold: 72 px o 35% de card;
- commit positive action: 45%;
- velocity commit: 800 px/s;
- destructive side never auto-commits;
- spring back if threshold not met.

## 109.2 Gesture arbitration

Horizontal begins when:

```text
abs(dx) > 12
and abs(dx) > 1.3 * abs(dy)
```

Vertical scroll wins otherwise.

## 109.3 Long press

- 450 ms general;
- 350 ms Calendar drag;
- haptic medium at activation;
- moving finger >10 px before activation cancels context menu.

## 109.4 Haptics

- selection: light;
- complete/verify: success;
- warning confirmation: warning;
- destructive confirmed: medium;
- error rollback: error;
- disabled under reduce motion/haptics preference.

## 109.5 Animation

- standard transition: 180 ms;
- enter sheet: spring stiffness 220, damping 22, mass 1;
- fade: 160 ms;
- reorder: 150 ms;
- optimistic removal: 180 ms collapse after server/queued acceptance;
- rollback: 180 ms restore.

## 109.6 Reduce motion

- no spring;
- fade <=100 ms;
- no scale;
- no parallax;
- no animated progress sweep.

---

# 110. Copy completo: reglas cerradas

## 110.1 Variante lingüística

Idioma base:

- español rioplatense moderado;
- `tenés`, `podés`, `querés`;
- sin lunfardo;
- traducciones futuras mediante ICU.

## 110.2 Plurales

Usar ICU MessageFormat.

Nunca concatenar `1 tareas`.

## 110.3 Principios

- una idea por mensaje;
- máximo 110 caracteres en toast;
- error dice qué pasó y qué hacer;
- no culpar;
- no mencionar backend, UUID, RLS ni sync internamente.

## 110.4 Catálogo por code

| Code | Copy |
|---|---|
| planner_validation_error | `Revisá los datos marcados.` |
| planner_unauthenticated | `Tu sesión terminó. Volvé a ingresar.` |
| planner_forbidden | `Ya no tenés permiso para hacer esto.` |
| planner_not_found | `Este elemento ya no está disponible.` |
| planner_conflict | `Cambió en otro dispositivo.` |
| planner_invalid_transition | `Esta acción ya no está disponible.` |
| planner_idempotency_conflict | `La acción ya fue procesada.` |
| planner_household_required | `Elegí un hogar para usar Planner.` |
| planner_membership_inactive | `Tu acceso a este hogar ya no está activo.` |
| planner_rate_limited | `Hiciste varias acciones seguidas. Probá de nuevo en un momento.` |
| planner_dependency_conflict | `Esta tarea depende de otra que todavía está pendiente.` |
| planner_recurrence_invalid | `La repetición no es válida.` |
| planner_offline_required | `Necesitás conexión para hacer esta acción.` |
| planner_internal_error | `Algo salió mal. Probá de nuevo.` |

## 110.5 Offline

- `Sin conexión. Mostramos la última información guardada.`
- `Cambio pendiente de sincronización.`
- `No pudimos sincronizar este cambio.`

## 110.6 Conflict

- `Usar versión actual.`
- `Aplicar mis cambios.`
- `Revisar diferencias.`

## 110.7 Participant

- `Invitación enviada.`
- `Aceptó.`
- `Tal vez asista.`
- `No asistirá.`
- `Todavía no respondió.`

## 110.8 Recurrence

- `Solo esta vez.`
- `Esta y las siguientes.`
- `Toda la serie.`
- `Omitir esta vez.`
- `Pausar repetición.`
- `Finalizar repetición.`

---

# 111. Telemetría y privacidad exactas

## 111.1 Providers iniciales

- Product analytics: PostHog mediante adapter.
- Crashes/performance: Sentry mediante adapter.
- Structured backend metrics: OpenTelemetry-compatible exporter.

El dominio no importa SDKs directamente.

## 111.2 Consent

- product analytics: opt-in;
- family learning: opt-in separado;
- crash/security essentials: habilitado con privacy notice;
- staging/test nunca mezcla datos prod.

## 111.3 Identifiers

- user pseudonymous ID;
- household HMAC ID;
- no email;
- no display name;
- no raw entity ID en product analytics;
- technical traces may use entity UUID only with restricted access.

## 111.4 Retention

- product events: 13 meses;
- session replay: deshabilitado para Planner;
- performance traces: 90 días;
- crash events: 180 días;
- security logs: 24 meses.

## 111.5 Sampling

- crashes: 100%;
- backend errors: 100%;
- performance prod: 20%;
- performance staging: 100%;
- product events consented: 100%;
- high-volume render events: 10%.

## 111.6 Access

- product dashboards: PM + product lead;
- technical: engineering leads;
- audit: restricted admins;
- access logged.

## 111.7 Deletion

- account deletion queues analytics erasure;
- completion target 30 días;
- household deletion removes household-level patterns;
- aggregate anonymous metrics may remain.

## 111.8 Minors

- Child product analytics disabled by default;
- Adolescent requires account-level consent policy;
- no behavioral recommendation profile shared outside household;
- no advertising use.

---

# 112. Audit y retención exactos

## 112.1 Audit retention

- domain/security audit: 24 meses;
- failed auth/security: 24 meses;
- Activity visible: lifetime entity + Trash retention;
- export logs: 12 meses.

## 112.2 Payload allowlist

Allowed:

- action;
- actor pseudonymous membership;
- entity type/id;
- field names changed;
- before/after hashes;
- permission result;
- request/mutation IDs.

Not allowed:

- title;
- description;
- comments;
- note body;
- file content;
- notification body.

## 112.3 Access

- technical audit: coordinator sees household administrative actions only;
- HomePlus restricted admin sees technical audit under support process;
- personal entity content never exposed through audit.

## 112.4 Hard delete

Hard delete removes domain content.

Audit retains:

- pseudonymous actor;
- entity hash;
- action;
- timestamp.

No recoverable content.

## 112.5 Partitioning

- monthly PostgreSQL partitions;
- archive after 6 months to lower-cost storage if available;
- purge job monthly;
- alert at 80% storage budget.

---

# 113. Inventory integration exacta mediante adapter

## 113.1 Regla

La semántica queda cerrada aunque los nombres físicos de Inventory se adapten.

Interface:

```ts
interface InventoryPlannerPort {
  getItemSummary(itemId: string): Promise<InventoryItemSummary>;
  validateOrigin(input: PlannerOriginInput): Promise<void>;
  proposeRestock(itemId: string): Promise<PlannerPackDraft>;
  applyStockAdjustment(input: StockAdjustmentInput): Promise<StockAdjustmentResult>;
}
```

## 113.2 Semantic statuses

Adapter mapea estado real a:

```text
in_stock
low_stock
out_of_stock
archived
```

## 113.3 Units

Planner trata quantity como:

```text
numeric value + unit code
```

No convierte unidades.

## 113.4 Restock

- low_stock crea Recommendation;
- out_of_stock puede crear Task tras confirmación;
- no auto-create sin approved automation futura.

## 113.5 Completion

Completar purchase Task muestra:

`¿Actualizar el stock?`

Opciones:

- Agregar cantidad.
- Ahora no.

Nunca modifica stock silenciosamente.

## 113.6 Multi-item purchase

Un Task Pack puede contener una Task por item o una Task de compra con múltiples origin links.

Se agrega tabla:

```text
planner_origin_links
```

para relaciones múltiples.

## 113.7 Fingerprint

```text
SHA-256(household + module + entity + action + recurrence_window)
```

Evita duplicados activos.

## 113.8 Rollback

Si Task completa pero stock adjustment falla:

- Task permanece completa;
- stock update queda failed separately;
- se ofrece reintentar;
- no revierte trabajo real de Planner.

---

# 114. Migración definitiva

## 114.1 Fases

### M1 Foundations

- version;
- archived/deleted/delete_after;
- idempotency;
- outbox;
- Audit.

### M2 Membership canonicalization

- agregar member IDs;
- backfill desde person + household;
- validar sin null;
- switch reads;
- contract old columns.

### M3 Enums

- medium → normal;
- critical → high;
- failed → closed;
- backfill timestamps.

### M4 Task relations

- visibility;
- type catalog;
- milestone_id;
- checklist;
- dependencies;
- completion attempts.

### M5 Events

- participant;
- RRULE;
- occurrence;
- links.

### M6 Goals

- participants;
- progress entries;
- notes/comments;
- lifecycle fields.

### M7 Templates

- templates;
- versions;
- runs;
- favorites.

### M8 Platform

- reminders;
- patterns;
- activity;
- origin links.

## 114.2 Compatibility

- backend supports old and new schema for máximo 2 releases;
- frontend old app supported N-1;
- writes go to new fields once backfill complete;
- no permanent dual-write.

## 114.3 Feature flags

```text
planner_v2_shell
planner_v2_tasks
planner_v2_calendar
planner_v2_goals
planner_v2_templates
planner_v2_realtime
planner_v2_offline
planner_v2_inventory
```

## 114.4 Rollback

- UI flag off;
- backend old read compatibility;
- DB forward-fix;
- no down migration after destructive contract phase;
- contract phase only after adoption >95% and 14 días stable.

---

# 115. QA exhaustivo cerrado

## 115.1 Test case schema

Cada caso contiene:

```text
id
domain
priority
role
device
network
preconditions
fixtures
steps
expected_ui
expected_api
expected_db
expected_event
expected_telemetry
cleanup
```

## 115.2 Cobertura mínima

- 100% state transitions;
- 100% permissions matrix;
- 100% RLS policies;
- 100% endpoints happy + one failure;
- 100% destructive actions;
- 100% offline-supported mutations;
- 100% realtime event types;
- all empty/error states.

## 115.3 Core E2E IDs

```text
PL-E2E-001 Quick Task
PL-E2E-002 Quick Event
PL-E2E-003 Quick Goal
PL-E2E-004 Task from Goal
PL-E2E-005 Link existing Task
PL-E2E-006 Complete no verification
PL-E2E-007 Complete and verify
PL-E2E-008 Return verification
PL-E2E-009 Reopen verified
PL-E2E-010 Recurring Task occurrence
PL-E2E-011 Recurring Event scope
PL-E2E-012 Calendar cross-midnight
PL-E2E-013 Goal steps
PL-E2E-014 Goal tasks
PL-E2E-015 Goal numeric
PL-E2E-016 Goal boolean
PL-E2E-017 Goal none
PL-E2E-018 Template preview/commit
PL-E2E-019 Pack transaction rollback
PL-E2E-020 Inventory restock
PL-E2E-021 Offline complete
PL-E2E-022 Offline conflict
PL-E2E-023 Realtime two devices
PL-E2E-024 Household switch
PL-E2E-025 Permission revoked
PL-E2E-026 Trash/restore
PL-E2E-027 Search privacy
PL-E2E-028 Guest scope
PL-E2E-029 Child guided flow
PL-E2E-030 Rapid tap chaos
```

## 115.4 Gate

No release con:

- crash core;
- privacy leak;
- duplicated mutation;
- unreconciled outbox;
- migration test failure;
- accessibility blocker.

---

# 116. Rollout y operación cerrados

## 116.1 Stages

1. development;
2. internal team;
3. closed beta households;
4. 10%;
5. 50%;
6. 100%.

Minimum stability:

- internal: 3 días;
- beta: 7 días;
- 10%: 3 días;
- 50%: 3 días.

## 116.2 Promotion gates

- crash-free sessions >=99.5%;
- API 5xx <0.5%;
- mutation conflict <2%;
- outbox lag p95 <5 s;
- realtime delivery p95 <2 s;
- no P0/P1 privacy issue;
- migrations verified.

## 116.3 Kill switches

- realtime;
- offline writes;
- recommendations;
- Inventory stock adjustment;
- Template commit;
- push notifications.

Core read remains available.

## 116.4 Frontend rollback

- Expo/EAS update channel;
- previous stable bundle;
- feature flags remote;
- native release N-1 compatible.

## 116.5 DB rollback

- forward-fix;
- flags disable new writes;
- restore backup only for catastrophic corruption;
- point-in-time recovery documented.

## 116.6 Seeds

System Templates:

- idempotent;
- stable IDs;
- versioned;
- localized;
- no overwrite user copies.

## 116.7 Alert thresholds

- 5xx >1% for 5 min;
- outbox lag >30 s;
- dead-letter >10;
- push failure >10%;
- sync queue failure >5%;
- DB latency p95 >500 ms;
- RLS denial spike 3× baseline.

## 116.8 Runbooks

Required:

```text
planner-realtime-outage.md
planner-outbox-backlog.md
planner-migration-rollback.md
planner-permission-incident.md
planner-offline-queue-recovery.md
planner-notification-failure.md
planner-inventory-adapter-failure.md
```

---

# 117. Eliminación de ambigüedades previas

Cualquier aparición anterior de estas expresiones queda subordinada a las secciones 92–116:

- configurable;
- opcional según uso;
- si se habilita;
- cuando exista;
- adapter futuro;
- según configuración;
- si está soportado.

Regla:

- si una capacidad fue definida aquí, entra;
- si fue excluida aquí, no entra;
- si es Geni/Finance/otro módulo, solo entra su contrato;
- nombres físicos se adaptan, semántica no.

---

# 118. Decisiones explícitamente fuera del cierre

No son decisiones pendientes de Planner:

- modelo o proveedor LLM de Geni;
- prompts de Geni;
- UI conversacional de Geni;
- balances y cuentas de Finance;
- lógica médica;
- archivos físicos de Documents;
- Asset maintenance domain;
- Feed social;
- Presence/GPS;
- SOS;
- streaks.

Planner conserva puntos de integración, pero no implementa esos dominios.

---

# 119. Nueva conclusión normativa

Con las secciones 92–118 quedan cerradas las decisiones funcionales, técnicas y visuales necesarias para implementar Planner dentro del alcance definido.

Lo único adaptable al código real es:

- naming;
- ubicación;
- wrappers;
- mapping de adapters;
- estrategia de refactor compatible.

Ya no corresponde que un implementador decida:

- permisos;
- estados;
- gestos;
- copy;
- limits;
- recurrence;
- realtime;
- offline;
- telemetry;
- retention;
- rollout;
- Inventory behavior.

El siguiente artefacto vuelve a ser:

```text
planner_final_gap_map.md
```

Ese documento no tomará decisiones de producto. Solo comparará el repositorio contra `planner_final.md`.

