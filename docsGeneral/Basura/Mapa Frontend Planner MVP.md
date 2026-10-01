# Entregable 3 — Mapa Frontend Planner MVP

## 0\. Objetivo

Definir exactamente qué debe tocar Codex en frontend para implementar Planner MVP rápido y persistente usando el contrato DB/API definido en el Entregable 2\.

Este mapa no implementa todavía. Sirve para que Codex sepa:

* qué services crear;

* qué services legacy evitar;

* qué pantallas crear/adaptar;

* cómo agregar Planner a Bottom Navigation;

* cómo manejar Tasks, Events, Calendar, Templates y Verification;

* qué tocar en Home;

* qué no tocar;

* cómo validar que el frontend quedó listo.

---

# 1\. Punto de partida real del frontend

Según auditoría previa:

## Existe

* screens/calendar/CalendarScreen.tsx

  * pantalla Calendar existente;

  * mezcla schedules/events;

  * usa lógica legacy;

  * puede servir visualmente como base.

* Home por roles:

  * screens/home/HomeCoordinador.tsx

  * screens/home/HomeAdulto.tsx

  * screens/home/HomeAdolescente.tsx

  * screens/home/HomeAdultoMayor.tsx

* Services legacy:

  * services/tasks.ts

  * services/events.ts

  * services/schedules.ts

* API base:

  * services/api.ts

  * ya maneja backend \+ Bearer token para Auth/Household.

* Auth context:

  * context/AuthContext.tsx

  * contiene session/access token y authMe.

* Household context:

  * context/HouseholdContext.tsx

  * expone información de hogar/miembros, aunque mezcla final \+ legacy.

## No existe o no sirve

* No hay Planner tab real.

* No hay Planner screen central.

* No hay services Planner REST nuevos.

* No hay Tasks screen final.

* No hay Create/Edit Task final.

* No hay Create/Edit Event final separado.

* No hay Calendar final conectado a /api/planner/calendar.

* Home usa datos Planner legacy o directos a Supabase.

---

# 2\. Reglas frontend globales

## 2.1 No usar Supabase directo para Planner nuevo

Planner nuevo debe consumir backend REST:

/api/planner/\*

No usar:

* supabase.from('tasks');

* supabase.from('events');

* supabase.from('schedules');

* tablas legacy;

* services legacy para writes.

## 2.2 No borrar services legacy todavía

No borrar:

* services/tasks.ts;

* services/events.ts;

* services/schedules.ts.

Pueden seguir existiendo por compatibilidad mientras se migra Home/Calendar.

Pero Planner nuevo debe usar nuevos services:

* plannerTasks.ts;

* plannerEvents.ts;

* plannerCalendar.ts;

* plannerSummary.ts;

* plannerTemplates.ts.

## 2.3 Usar token desde AuthContext

Todos los services Planner deben recibir o resolver access token igual que el patrón existente de services/api.ts.

Regla:

* usar Authorization: Bearer \<access\_token\>;

* si no hay token, devolver error controlado;

* no mandar household\_id;

* backend resuelve active household.

## 2.4 No tocar Auth/Household

No reescribir:

* AuthContext;

* login/register;

* /me;

* create household;

* invite links.

Solo consumir datos ya disponibles.

## 2.5 No tocar mocks no Planner

No tocar ni reemplazar:

* Presence mock;

* Actividad Familiar mock;

* Carga Familiar dummy;

* Finance mock;

* Inventory mock;

* Photos;

* Voice;

* Challenges;

* SOS;

* Geni.

Home solo debe conectarse a Planner donde muestra tareas/eventos/resumen.

---

# 3\. Services frontend a crear

## 3.1 services/plannerTasks.ts

Debe consumir:

GET    /api/planner/tasks  
POST   /api/planner/tasks  
PATCH  /api/planner/tasks/:id  
DELETE /api/planner/tasks/:id  
POST   /api/planner/tasks/:id/complete  
POST   /api/planner/tasks/:id/verify

### Funciones esperadas

listPlannerTasks(accessToken, filters?)  
createPlannerTask(accessToken, payload)  
updatePlannerTask(accessToken, taskId, payload)  
cancelPlannerTask(accessToken, taskId)  
completePlannerTask(accessToken, taskId)  
verifyPlannerTask(accessToken, taskId)

### Tipos mínimos

**export type** PlannerTaskStatus \=  
  | 'pending'  
  | 'completed'  
  | 'awaiting\_verification'  
  | 'verified'  
  | 'cancelled';

**export type** PlannerTaskPriority \=  
  | 'low'  
  | 'medium'  
  | 'high'  
  | 'critical';

**export type** PlannerTaskTemplateKey \=  
  | 'cleaning'  
  | 'shopping'  
  | 'pets'  
  | 'medication'  
  | 'studies'  
  | 'payments';

**export type** PlannerTask \= {  
  id: string;  
  household\_id: string;  
  title: string;  
  description?: string | null;  
  status: PlannerTaskStatus;  
  priority: PlannerTaskPriority;  
  template\_key?: PlannerTaskTemplateKey | null;  
  category?: string | null;  
  due\_date?: string | null;  
  due\_time?: string | null;  
  requires\_verification: boolean;  
  created\_by\_person\_id: string;  
  assigned\_to\_member\_id?: string | null;  
  completed\_by\_person\_id?: string | null;  
  verified\_by\_person\_id?: string | null;  
  completed\_at?: string | null;  
  verified\_at?: string | null;  
  created\_at: string;  
  updated\_at: string;  
  assigned\_member?: {  
    id: string;  
    person\_id: string;  
    display\_name?: string | null;  
    avatar\_url?: string | null;  
    role?: string | null;  
  } | null;  
};

### Payload create

**export type** CreatePlannerTaskPayload \= {  
  title: string;  
  description?: string;  
  priority?: PlannerTaskPriority;  
  template\_key?: PlannerTaskTemplateKey;  
  category?: string;  
  due\_date?: string;  
  due\_time?: string;  
  assigned\_to\_member\_id?: string;  
  requires\_verification?: boolean;  
};

### Payload update

**export type** UpdatePlannerTaskPayload \= Partial\<CreatePlannerTaskPayload\>;

---

## 3.2 services/plannerEvents.ts

Debe consumir:

GET    /api/planner/events  
POST   /api/planner/events  
PATCH  /api/planner/events/:id  
DELETE /api/planner/events/:id

### Funciones esperadas

listPlannerEvents(accessToken, filters?)  
createPlannerEvent(accessToken, payload)  
updatePlannerEvent(accessToken, eventId, payload)  
cancelPlannerEvent(accessToken, eventId)

### Tipos mínimos

**export type** PlannerEventStatus \=  
  | 'scheduled'  
  | 'cancelled';

**export type** PlannerEventRecurrence \=  
  | 'none'  
  | 'daily'  
  | 'weekly'  
  | 'monthly';

**export type** PlannerEvent \= {  
  id: string;  
  household\_id: string;  
  title: string;  
  description?: string | null;  
  status: PlannerEventStatus;  
  starts\_at: string;  
  ends\_at?: string | null;  
  all\_day: boolean;  
  location\_name?: string | null;  
  recurrence: PlannerEventRecurrence;  
  created\_by\_person\_id: string;  
  created\_at: string;  
  updated\_at: string;  
};

### Payload create

**export type** CreatePlannerEventPayload \= {  
  title: string;  
  description?: string;  
  starts\_at: string;  
  ends\_at?: string;  
  all\_day?: boolean;  
  location\_name?: string;  
  recurrence?: PlannerEventRecurrence;  
};

### Payload update

**export type** UpdatePlannerEventPayload \= Partial\<CreatePlannerEventPayload\>;

---

## 3.3 services/plannerCalendar.ts

Debe consumir:

GET /api/planner/calendar?view=day|week|month\&date=YYYY-MM-DD

### Funciones esperadas

getPlannerCalendar(accessToken, params)

### Tipos mínimos

**export type** PlannerCalendarView \=  
  | 'day'  
  | 'week'  
  | 'month';

**export type** PlannerCalendarEventItem \= {  
  type: 'event';  
  id: string;  
  occurrence\_id?: string;  
  title: string;  
  description?: string | null;  
  starts\_at: string;  
  ends\_at?: string | null;  
  all\_day: boolean;  
  location\_name?: string | null;  
  recurrence: PlannerEventRecurrence;  
  is\_recurring\_occurrence?: boolean;  
  status: PlannerEventStatus;  
};

**export type** PlannerCalendarTaskItem \= {  
  type: 'task';  
  id: string;  
  title: string;  
  description?: string | null;  
  due\_date?: string | null;  
  due\_time?: string | null;  
  status: PlannerTaskStatus;  
  priority: PlannerTaskPriority;  
  template\_key?: PlannerTaskTemplateKey | null;  
  category?: string | null;  
  assigned\_to\_member\_id?: string | null;  
  requires\_verification: boolean;  
};

**export type** PlannerCalendarItem \=  
  | PlannerCalendarEventItem  
  | PlannerCalendarTaskItem;

**export type** PlannerCalendarResponse \= {  
  view: PlannerCalendarView;  
  date: string;  
  range: {  
    from: string;  
    to: string;  
  };  
  items: PlannerCalendarItem\[\];  
};

---

## 3.4 services/plannerSummary.ts

Debe consumir:

GET /api/planner/summary

### Función esperada

getPlannerSummary(accessToken)

### Tipo mínimo

**export type** PlannerSummary \= {  
  pending\_tasks\_count: number;  
  today\_tasks\_count: number;  
  overdue\_tasks\_count: number;  
  awaiting\_verification\_count: number;  
  upcoming\_events\_count: number;  
  tasks\_today: PlannerTask\[\];  
  overdue\_tasks: PlannerTask\[\];  
  awaiting\_verification\_tasks: PlannerTask\[\];  
  upcoming\_events: PlannerEvent\[\];  
  briefing\_text: string;  
};

---

## 3.5 services/plannerTemplates.ts

No consume backend.

Debe exponer constante:

**export** **const** PLANNER\_TASK\_TEMPLATES \= \[  
  {  
    key: 'cleaning',  
    label: 'Limpieza',  
    defaultTitle: 'Tarea de limpieza',  
    category: 'Limpieza',  
  },  
  {  
    key: 'shopping',  
    label: 'Compras',  
    defaultTitle: 'Hacer compras',  
    category: 'Compras',  
  },  
  {  
    key: 'pets',  
    label: 'Mascotas',  
    defaultTitle: 'Cuidar mascota',  
    category: 'Mascotas',  
  },  
  {  
    key: 'medication',  
    label: 'Medicación',  
    defaultTitle: 'Revisar medicación',  
    category: 'Medicación',  
  },  
  {  
    key: 'studies',  
    label: 'Estudios',  
    defaultTitle: 'Organizar estudios',  
    category: 'Estudios',  
  },  
  {  
    key: 'payments',  
    label: 'Pagos',  
    defaultTitle: 'Realizar pago',  
    category: 'Pagos',  
  },  
\] **as** **const**;

Uso:

* mostrar chips/cards de templates;

* al elegir template, precargar:

  * template\_key;

  * title;

  * category.

---

# 4\. Pantallas frontend

## 4.1 Pantalla principal Planner

Path sugerido:

screens/planner/PlannerScreen.tsx

### Objetivo

Ser entrada principal del módulo Planner.

### Debe mostrar

* header Planner;

* resumen rápido:

  * tareas pendientes;

  * tareas de hoy;

  * eventos próximos;

* tabs internas:

  * Tareas;

  * Calendario.

### Acciones

* cambiar tab interna;

* ir a crear tarea;

* ir a crear evento;

* refresh;

* navegar desde cards a detalle/lista.

### Data

* puede usar getPlannerSummary;

* puede delegar Tasks a PlannerTasksScreen;

* puede delegar Calendar a PlannerCalendarScreen.

### Estados

* loading;

* empty;

* error;

* refresh.

---

## 4.2 Planner Tasks Screen

Path sugerido:

screens/planner/PlannerTasksScreen.tsx

### Objetivo

Listar y operar tareas.

### Debe mostrar

Para cada task:

* título;

* status;

* prioridad;

* fecha límite;

* hora límite si existe;

* template/categoría;

* miembro asignado si existe;

* badge de verification;

* acciones.

### Acciones por task

* completar;

* verificar si status awaiting\_verification;

* editar;

* eliminar/cancelar.

### Acciones generales

* crear tarea;

* filtrar rápido si es barato:

  * Todas;

  * Hoy;

  * Pendientes;

  * Awaiting;

  * Completadas.

### Comportamiento completar

* si task no requiere verification:

  * complete → completed;

* si requiere verification:

  * complete → awaiting\_verification.

El frontend no calcula transición. Llama endpoint complete.

### Comportamiento verificar

* visible para task awaiting\_verification;

* llama verifyPlannerTask;

* si backend rechaza por misma persona, mostrar error simple.

### Empty state

No hay tareas todavía. Creá la primera tarea del hogar.

### Error state

Mostrar mensaje simple \+ botón retry.

---

## 4.3 Create Task Screen

Path sugerido:

screens/planner/CreateTaskScreen.tsx

### Objetivo

Crear tarea real persistente.

### Campos

* template picker;

* título;

* descripción;

* prioridad;

* fecha límite;

* hora límite;

* miembro asignado;

* requiere verificación.

### Template picker

Al elegir template:

* set template\_key;

* set category;

* si title está vacío, set default title.

### Members

Para selector de miembro:

* usar HouseholdContext si ya trae members activos;

* o usar vista/service existente mínimo;

* enviar assigned\_to\_member\_id.

No enviar person\_id.

### Submit

Llama:

createPlannerTask(accessToken, payload)

### Después de guardar

* volver a Tasks;

* refrescar lista;

* mostrar success simple.

### Validaciones frontend

* title requerido;

* no bloquear si no hay assigned member;

* priority default medium;

* requires verification default false.

---

## 4.4 Edit Task Screen

Path sugerido:

screens/planner/EditTaskScreen.tsx

### Objetivo

Editar tarea existente.

### Reglas

* pantalla aparte;

* idealmente reutilizar TaskForm;

* no editar status desde formulario;

* status cambia por complete/verify/delete.

### Campos editables

* título;

* descripción;

* prioridad;

* template;

* category;

* fecha límite;

* hora límite;

* miembro asignado;

* requires verification.

### Submit

Llama:

updatePlannerTask(accessToken, taskId, payload)

### Después de guardar

* volver a Tasks;

* refrescar.

---

## 4.5 Planner Calendar Screen

Path sugerido:

screens/planner/PlannerCalendarScreen.tsx

Puede reutilizar visualmente partes de:

screens/calendar/CalendarScreen.tsx

pero debe consumir:

plannerCalendar.ts

No debe consumir services legacy.

### Objetivo

Mostrar Calendar MVP:

* Día;

* Semana;

* Mes;

* eventos;

* tareas con fecha;

* recurrencias virtuales devueltas por backend.

### UI mínima

* selector de vista:

  * Día;

  * Semana;

  * Mes;

* fecha actual;

* botones:

  * anterior;

  * hoy;

  * siguiente;

* lista/agenda de items.

### Vista Día

Mostrar items del día.

### Vista Semana

Mostrar items agrupados por día de semana.

### Vista Mes

Mostrar agenda mensual agrupada por día.

No requiere grid calendario premium.

### Item Event

Mostrar:

* título;

* hora;

* ubicación;

* recurrence si aplica;

* badge Evento.

Acciones:

* editar;

* eliminar/cancelar.

### Item Task

Mostrar:

* título;

* due time;

* prioridad;

* status;

* badge Tarea.

Acciones:

* completar;

* abrir/editar.

### Empty state

No hay tareas ni eventos en este rango.

---

## 4.6 Create Event Screen

Path sugerido:

screens/planner/CreateEventScreen.tsx

### Campos

* título;

* descripción;

* fecha/hora inicio;

* fecha/hora fin;

* all\_day;

* ubicación;

* recurrence:

  * none;

  * daily;

  * weekly;

  * monthly.

### Submit

Llama:

createPlannerEvent(accessToken, payload)

### Después de guardar

* volver a Calendar;

* refrescar;

* success simple.

---

## 4.7 Edit Event Screen

Path sugerido:

screens/planner/EditEventScreen.tsx

### Campos editables

* título;

* descripción;

* starts\_at;

* ends\_at;

* all\_day;

* location\_name;

* recurrence.

### Submit

Llama:

updatePlannerEvent(accessToken, eventId, payload)

### Eliminar/cancelar

Llama:

cancelPlannerEvent(accessToken, eventId)

---

# 5\. Componentes opcionales

Codex puede crearlos si ayudan, pero no son obligatorios.

components/planner/TaskCard.tsx  
components/planner/EventCard.tsx  
components/planner/TaskForm.tsx  
components/planner/EventForm.tsx  
components/planner/TemplatePicker.tsx  
components/planner/CalendarAgenda.tsx  
components/planner/PlannerStatusBadge.tsx  
components/planner/PriorityBadge.tsx

Regla:

* si crearlos consume demasiado, hacerlo inline;

* si hay duplicación fuerte, extraer form/card.

---

# 6\. Navegación

## 6.1 Bottom Navigation

Planner debe estar como tab principal.

Estructura objetivo:

Home | People | \+ | Planner | More

## 6.2 Estado actual

Codex detectó que no hay Planner tab real y que existe CalendarTab.

## 6.3 Acción esperada

Codex debe revisar:

navigation/HomeTabNavigator.tsx  
navigation/types.ts

Y aplicar una de estas opciones:

### Opción preferida

Reemplazar/renombrar CalendarTab por PlannerTab.

Planner tab abre:

PlannerScreen

Dentro de Planner se accede a Calendar.

### Opción alternativa

Agregar Planner tab nuevo si no rompe Bottom Nav.

### No hacer

* No esconder Planner dentro de More.

* No dejar Calendar como módulo principal separado si el MVP pide Planner.

* No romper Home/People/More.

---

# 7\. Quick Actions

Si el botón central \+ ya existe y es barato conectar:

Debe ofrecer:

* Crear tarea;

* Crear evento.

Si conectarlo consume mucho o requiere refactor grande:

* dejarlo para Home Integration / Prompt C;

* Planner debe funcionar con botones internos.

Prioridad:

1. Planner tab funcional.

2. Crear desde Planner.

3. Quick Actions si es barato.

---

# 8\. Members para asignar tarea

## 8.1 Necesidad

Create/Edit Task debe poder asignar tarea a un miembro.

Debe enviar:

assigned\_to\_member\_id

No enviar:

person\_id

## 8.2 Fuente de members

Usar lo ya disponible:

* HouseholdContext;

* vista household\_people\_public;

* service existente mínimo.

Codex debe buscar la forma más simple que ya funcione.

## 8.3 Datos necesarios para UI

Cada miembro debe exponer, idealmente:

{  
  id: string; *// household\_members.id*  
  person\_id: string;  
  display\_name: string;  
  avatar\_url?: string | null;  
  role?: string;  
  status: 'active' | string;  
}

Filtrar:

status \= active

## 8.4 Fallback

Si no se puede hidratar bien el nombre:

* mostrar Miembro asignado;

* no bloquear creación si no hay assigned member.

---

# 9\. Estados UX mínimos

Todas las pantallas Planner deben tener:

* loading;

* empty;

* error;

* saving;

* disabled submit;

* success simple;

* retry.

No hace falta sistema complejo de toasts si no existe. Puede ser:

* alert;

* snackbar existente;

* texto temporal;

* refresh simple.

## 9.1 Loading

* lista: spinner o skeleton simple.

* formulario: botón disabled.

## 9.2 Empty

Tasks:

No hay tareas todavía. Creá la primera tarea del hogar.

Calendar:

No hay tareas ni eventos en este rango.

Events:

No hay eventos todavía.

## 9.3 Error

Mensaje simple:

No pudimos cargar Planner. Intentá de nuevo.

Botón:

Reintentar

---

# 10\. Home Integration

Este mapa define qué tocar después, pero no obliga a hacerlo en el mismo prompt frontend.

## 10.1 Objetivo

Home debe consumir:

GET /api/planner/summary

Para mostrar:

* tareas pendientes;

* tareas de hoy;

* tareas vencidas;

* awaiting verification;

* próximos eventos;

* briefing simple.

## 10.2 Archivos detectados

Tocar solo si es fase Home:

screens/home/HomeCoordinador.tsx  
screens/home/HomeAdulto.tsx  
screens/home/HomeAdolescente.tsx  
screens/home/HomeAdultoMayor.tsx

## 10.3 No tocar

No tocar:

* Presence mock;

* Actividad Familiar mock;

* Carga Familiar dummy;

* Finance mock;

* Inventory mock;

* Photos;

* Voice;

* Challenges;

* SOS.

## 10.4 Regla

Si conectar Home es barato al terminar frontend Planner:

* Codex puede conectarlo en el mismo bloque.

Si implica refactor:

* dejar para Prompt C separado.

---

# 11\. Services legacy que NO deben usarse para Planner nuevo

No usar para Planner nuevo:

services/tasks.ts  
services/events.ts  
services/schedules.ts

Pueden quedar vivos para pantallas legacy hasta que se conecte Home.

Pero las nuevas pantallas Planner deben usar:

services/plannerTasks.ts  
services/plannerEvents.ts  
services/plannerCalendar.ts  
services/plannerSummary.ts  
services/plannerTemplates.ts

---

# 12\. QA frontend obligatorio

## 12.1 Navigation

* Planner aparece en Bottom Nav.

* Home sigue funcionando.

* People sigue funcionando.

* More sigue funcionando.

* \+ no rompe.

## 12.2 Tasks

* abrir Planner → Tareas;

* crear tarea sin template;

* crear tarea con template;

* editar tarea;

* completar tarea sin verification;

* crear tarea con verification;

* completar tarea con verification;

* task pasa a awaiting verification;

* verificar task;

* eliminar/cancelar task;

* lista se refresca;

* task cancelada no aparece en lista normal.

## 12.3 Events

* abrir Planner → Calendario;

* crear evento;

* editar evento;

* eliminar/cancelar evento;

* crear evento con recurrence daily;

* crear evento weekly;

* crear evento monthly;

* evento cancelado no aparece en vista normal.

## 12.4 Calendar

* vista Día carga;

* vista Semana carga;

* vista Mes carga;

* tarea con due\_date aparece;

* evento aparece;

* recurrencia aparece como ocurrencia virtual;

* empty state aparece si no hay items.

## 12.5 Home

Solo si se conecta en esta fase:

* Home muestra summary;

* crear tarea cambia summary al refrescar;

* completar tarea cambia summary al refrescar;

* crear evento aparece en próximos eventos.

## 12.6 Multi-dispositivo

Flujo de demo:

Usuario A crea tarea asignada a Usuario B  
↓  
Usuario B refresca Planner y ve la tarea  
↓  
Usuario B completa la tarea  
↓  
Usuario A refresca y ve cambio  
↓  
Usuario A crea evento  
↓  
Usuario B refresca Calendar/Home y ve evento

No hace falta realtime. Refresh manual alcanza.

---

# 13\. Criterio DONE del Entregable 3

Frontend Planner queda DONE cuando:

* existe Planner tab propio;

* Planner usa backend /api/planner;

* no usa Supabase directo;

* services Planner nuevos existen;

* Tasks list funciona;

* Create Task funciona;

* Edit Task funciona;

* Complete Task funciona;

* Verification simple funciona;

* Cancel Task funciona;

* Templates precargan formulario;

* Events list/calendar funciona;

* Create Event funciona;

* Edit Event funciona;

* Cancel Event funciona;

* recurrence se puede elegir;

* Calendar Día/Semana/Mes renderiza;

* Calendar muestra tasks con due\_date;

* loading/empty/error básicos existen;

* Home no se rompió;

* Auth/Household no se tocaron innecesariamente.

---

# 14\. Archivos esperados

## Services

front/mi-front-limpio/services/plannerTasks.ts  
front/mi-front-limpio/services/plannerEvents.ts  
front/mi-front-limpio/services/plannerCalendar.ts  
front/mi-front-limpio/services/plannerSummary.ts  
front/mi-front-limpio/services/plannerTemplates.ts

## Screens

front/mi-front-limpio/screens/planner/PlannerScreen.tsx  
front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx  
front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx  
front/mi-front-limpio/screens/planner/CreateTaskScreen.tsx  
front/mi-front-limpio/screens/planner/EditTaskScreen.tsx  
front/mi-front-limpio/screens/planner/CreateEventScreen.tsx  
front/mi-front-limpio/screens/planner/EditEventScreen.tsx

## Navigation

front/mi-front-limpio/navigation/HomeTabNavigator.tsx  
front/mi-front-limpio/navigation/types.ts

## Optional components

front/mi-front-limpio/components/planner/TaskCard.tsx  
front/mi-front-limpio/components/planner/EventCard.tsx  
front/mi-front-limpio/components/planner/TaskForm.tsx  
front/mi-front-limpio/components/planner/EventForm.tsx  
front/mi-front-limpio/components/planner/TemplatePicker.tsx  
front/mi-front-limpio/components/planner/CalendarAgenda.tsx

## Home, solo fase integración

front/mi-front-limpio/screens/home/HomeCoordinador.tsx  
front/mi-front-limpio/screens/home/HomeAdulto.tsx  
front/mi-front-limpio/screens/home/HomeAdolescente.tsx  
front/mi-front-limpio/screens/home/HomeAdultoMayor.tsx

---

# 15\. Prompt derivado de este mapa

Este mapa se usará para el Prompt B:

Implementar Frontend Planner MVP rápido completo.

Debe ejecutarse solo después de que el Entregable 2 / Prompt A backend esté terminado.