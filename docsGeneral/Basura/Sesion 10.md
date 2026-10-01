\# PROMPT B — FRONTEND PLANNER MVP \#\# CONTEXTO Ya se implementó backend Planner bajo:  
txt  
/api/planner

Incluye:  
tasks CRUD;  
complete;  
verify;  
events CRUD;  
calendar day/week/month;  
summary.  
Ahora implementar frontend Planner MVP rápido.  
Prioridad:  
funcionalidad;  
persistencia;  
demo multi-dispositivo;  
no refactor grande;  
no usar Supabase directo para Planner nuevo.  
REGLA PRINCIPAL  
NO usar services legacy para Planner nuevo:  
no usar services/tasks.ts;  
no usar services/events.ts;  
no usar services/schedules.ts;  
no usar Supabase directo.  
Crear services REST nuevos:  
services/plannerTasks.ts;  
services/plannerEvents.ts;  
services/plannerCalendar.ts;  
services/plannerSummary.ts;  
services/plannerTemplates.ts.  
Usar token Bearer igual que patrón existente en services/api.ts.  
No mandar household\_id.  
El backend resuelve active household.

OBJETIVO  
Crear Planner tab propio y UI funcional para:  
Tasks  
listar tareas;  
crear tarea;  
editar tarea;  
cancelar/eliminar tarea;  
completar tarea;  
verificar tarea;  
asignar miembro;  
prioridad;  
fecha límite;  
templates predefinidas.  
Events  
listar eventos;  
crear evento;  
editar evento;  
cancelar/eliminar evento;  
recurrence simple.  
Calendar  
vista Día;  
vista Semana;  
vista Mes agenda;  
eventos;  
tareas con fecha.

SERVICES  
services/plannerTasks.ts  
Funciones:  
listPlannerTasks(accessToken, filters?)  
createPlannerTask(accessToken, payload)  
updatePlannerTask(accessToken, taskId, payload)  
cancelPlannerTask(accessToken, taskId)  
completePlannerTask(accessToken, taskId)  
verifyPlannerTask(accessToken, taskId)

Tipos:  
export type PlannerTaskStatus \=  
  | 'pending'  
  | 'completed'  
  | 'awaiting\_verification'  
  | 'verified'  
  | 'cancelled';

export type PlannerTaskPriority \=  
  | 'low'  
  | 'medium'  
  | 'high'  
  | 'critical';

export type PlannerTaskTemplateKey \=  
  | 'cleaning'  
  | 'shopping'  
  | 'pets'  
  | 'medication'  
  | 'studies'  
  | 'payments';

services/plannerEvents.ts  
Funciones:  
listPlannerEvents(accessToken, filters?)  
createPlannerEvent(accessToken, payload)  
updatePlannerEvent(accessToken, eventId, payload)  
cancelPlannerEvent(accessToken, eventId)

Tipos:  
export type PlannerEventStatus \=  
  | 'scheduled'  
  | 'cancelled';

export type PlannerEventRecurrence \=  
  | 'none'  
  | 'daily'  
  | 'weekly'  
  | 'monthly';

services/plannerCalendar.ts  
Función:  
getPlannerCalendar(accessToken, params)

Params:  
{  
  view: 'day' | 'week' | 'month';  
  date: string;  
}

services/plannerSummary.ts  
Función:  
getPlannerSummary(accessToken)

services/plannerTemplates.ts  
Constante:  
export const PLANNER\_TASK\_TEMPLATES \= \[  
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
\] as const;

NAVIGATION  
Agregar Planner como tab propio en Bottom Navigation.  
Objetivo:  
Home | People | \+ | Planner | More

Revisar:  
navigation/HomeTabNavigator.tsx  
navigation/types.ts

Estado actual: no hay Planner tab real, puede existir CalendarTab.  
Opción preferida:  
reemplazar/renombrar CalendarTab por PlannerTab;  
Planner tab abre PlannerScreen;  
Calendar queda dentro de Planner.  
No esconder Planner en More.  
No romper Home/People/More.

SCREENS  
Crear/adaptar:  
screens/planner/PlannerScreen.tsx  
screens/planner/PlannerTasksScreen.tsx  
screens/planner/PlannerCalendarScreen.tsx  
screens/planner/CreateTaskScreen.tsx  
screens/planner/EditTaskScreen.tsx  
screens/planner/CreateEventScreen.tsx  
screens/planner/EditEventScreen.tsx

Si por velocidad conviene agrupar pantallas o usar modales, se permite, pero deben existir flujos completos.

PLANNER SCREEN  
Debe mostrar:  
header Planner;  
resumen rápido:  
pendientes;  
hoy;  
próximos eventos;  
tabs internas:  
Tareas;  
Calendario.  
Debe permitir:  
cambiar tab;  
refresh;  
navegar a crear tarea;  
navegar a crear evento.  
Estados:  
loading;  
empty;  
error.

TASKS UI  
Lista  
Mostrar por tarea:  
title;  
status;  
priority;  
due date;  
due time;  
template/category;  
assigned member;  
requires verification;  
completed/awaiting/verified badge.  
Acciones:  
completar;  
verificar;  
editar;  
cancelar.  
Crear tarea  
Campos:  
template picker;  
title;  
description;  
priority;  
due\_date;  
due\_time;  
assigned\_to\_member\_id;  
requires\_verification.  
Template picker:  
al elegir template, setea template\_key;  
setea category;  
si title está vacío, setea defaultTitle.  
Members:  
usar HouseholdContext o service/vista existente;  
seleccionar miembros active;  
enviar assigned\_to\_member\_id.  
No enviar person\_id.  
Editar tarea  
Pantalla aparte.  
Ideal:  
reutilizar formulario.  
No editar status desde form.  
Completar tarea  
Llamar:  
completePlannerTask

Backend decide:  
completed;  
awaiting\_verification.  
Verificar tarea  
Si status:  
awaiting\_verification

mostrar botón verificar.  
Llamar:  
verifyPlannerTask

Si backend rechaza por misma persona, mostrar error simple.  
Cancelar tarea  
Llamar:  
cancelPlannerTask

UI debe ocultar canceladas de lista normal.

EVENTS UI  
Crear evento  
Campos:  
title;  
description;  
starts\_at;  
ends\_at;  
all\_day;  
location\_name;  
recurrence:  
none;  
daily;  
weekly;  
monthly.  
Editar evento  
Pantalla aparte.  
Reusar formulario si se puede.  
Cancelar evento  
Llamar:  
cancelPlannerEvent

UI debe ocultar cancelados.

CALENDAR UI  
Usar:  
getPlannerCalendar

Vistas:  
Día;  
Semana;  
Mes.  
Vista Mes:  
agenda mensual agrupada por día;  
no grid premium obligatorio.  
Mostrar items:  
event;  
task.  
Event item:  
título;  
hora;  
ubicación;  
recurrence;  
badge Evento;  
editar;  
cancelar.  
Task item:  
título;  
due time;  
prioridad;  
status;  
badge Tarea;  
completar;  
editar.  
Estados:  
loading;  
empty;  
error;  
refresh.  
Empty:  
No hay tareas ni eventos en este rango.

MEMBERS PARA ASSIGNMENT  
Para asignar task, necesitamos enviar:  
assigned\_to\_member\_id

Buscar miembros activos desde:  
HouseholdContext;  
o vista/service existente.  
Datos mínimos:  
{  
  id: string; // household\_members.id  
  person\_id: string;  
  display\_name: string;  
  avatar\_url?: string | null;  
  role?: string;  
  status: string;  
}

Filtrar:  
status \=== 'active'

Fallback:  
si no se puede mostrar nombre, mostrar Miembro;  
no bloquear crear tarea si assigned member es null.

QUICK ACTIONS  
Si el botón central \+ ya existe y conectarlo es barato:  
agregar Crear tarea;  
agregar Crear evento.  
Si requiere refactor:  
no hacerlo en este prompt;  
Planner debe funcionar con botones internos.

HOME  
No hacer integración profunda en este prompt salvo que sea muy barato.  
Si es barato:  
preparar plannerSummaryService;  
no tocar mocks no Planner.  
Si implica refactor:  
dejar para Prompt C.

ESTADOS UX  
Agregar mínimo:  
loading;  
empty;  
error;  
saving;  
disabled submit;  
success simple;  
retry.  
No hace falta sistema complejo de toasts.  
Puede ser:  
Alert;  
texto temporal;  
snackbar existente.

CRITERIO DONE  
Frontend Planner queda listo si:  
Planner aparece en Bottom Nav;  
Planner usa /api/planner;  
no usa Supabase directo;  
no usa services legacy para Planner nuevo;  
Tasks list funciona;  
Create Task funciona;  
Edit Task funciona;  
Complete Task funciona;  
Verify Task funciona;  
Cancel Task funciona;  
Templates precargan formulario;  
Events list/calendar funciona;  
Create Event funciona;  
Edit Event funciona;  
Cancel Event funciona;  
recurrence se puede elegir;  
Calendar Día funciona;  
Calendar Semana funciona;  
Calendar Mes funciona;  
Calendar muestra tasks con due\_date;  
Calendar muestra events;  
loading/empty/error básicos existen;  
Home/People/More no se rompen.  
Comandos  
Correr los que existan:  
TypeScript check si existe;  
Expo start/build si corresponde;  
lint si existe.  
Si algún comando falla por scope, corregir.  
Respuesta final esperada de Codex  
Responder con:  
archivos creados/modificados;  
pantallas creadas;  
services creados;  
navegación modificada;  
comandos corridos;  
errores encontrados;  
qué queda pendiente para Home integration.  
Implementá ahora.  
Mostrar más  
lunes, 11:50 p.m.  
Procesado durante 15m 14s

Implementado el Planner MVP frontend.

**Archivos creados**

* Services REST: \[plannerTasks.ts\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/services/plannerTasks.ts), \[plannerEvents.ts\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/services/plannerEvents.ts), \[plannerCalendar.ts\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/services/plannerCalendar.ts), \[plannerSummary.ts\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/services/plannerSummary.ts), \[plannerTemplates.ts\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/services/plannerTemplates.ts)  
* Pantallas Planner: \[PlannerScreen.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/planner/PlannerScreen.tsx), \[PlannerTasksScreen.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx), \[PlannerCalendarScreen.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx)  
* Flujos create/edit: \[CreateTaskScreen.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/planner/CreateTaskScreen.tsx), \[EditTaskScreen.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/planner/EditTaskScreen.tsx), \[CreateEventScreen.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/planner/CreateEventScreen.tsx), \[EditEventScreen.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/planner/EditEventScreen.tsx)  
* Formularios/helpers compartidos: \[TaskForm.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/planner/TaskForm.tsx), \[EventForm.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/planner/EventForm.tsx), \[plannerShared.ts\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/screens/planner/plannerShared.ts)

**Archivos modificados**

* \[HomeTabNavigator.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/navigation/HomeTabNavigator.tsx): Bottom nav ahora es `Home | People | + | Planner | More`; Planner tiene stack propio; `+` permite crear tarea/evento.  
* \[types.ts\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/navigation/types.ts): tabs nuevas y `PlannerStackParamList`.

**Validación**

* `npx.cmd tsc --noEmit`: pasó.  
* Búsqueda de `supabase` / services legacy dentro de Planner nuevo: sin matches.  
* `expo start`: primero falló por red restringida (`fetch failed`); con permisos elevados no mostró error pero el comando llegó al timeout de verificación y no dejó listener en `8081`, así que no quedó URL usable confirmada.

Notas: no integré Home con summary todavía; queda para Prompt C. También vi \[front/mi-front-limpio/.env\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/.env) ya modificado en el worktree, pero no lo toqué.

Se editaron 19 archivos+1,994-177Revisar cambios  
DeshacerRevisar  
front/mi-front-limpio/services/plannerCalendar.ts+57-0  
front/mi-front-limpio/services/plannerEvents.ts+88-0  
front/mi-front-limpio/services/plannerSummary.ts+19-0  
Mostrar 16 archivos más  
12:05 a.m.  
\# Prompt B.1 — Fix funcional Planner \+ Quick Actions global \+ alineación visual \#\# Contexto Ya se implementaron: \* Planner DB/backend bajo `/api/planner` \* Planner frontend \* Services REST Planner \* Bottom nav con `Home | People | + | Planner | More` El frontend compila, pero en prueba manual fallan las acciones principales:  
txt  
GET /api/auth/me 200  
POST /api/planner/tasks 500  
POST /api/planner/events 500  
POST /api/planner/tasks 500  
POST /api/planner/events 500  
En la app aparece `Error interno` al crear tarea o evento. No avanzar a Home Integration todavía. \#\# Objetivo principal Corregir primero la creación real de tareas y eventos. La prioridad es que: \* Crear tarea funcione. \* Crear evento funcione. \* Calendar refleje eventos/tareas. \* Planner no crashee. \* No se use legacy. \* No se toque Auth/Household/Invite Links. \* No se haga refactor grande. \--- \# 1\. Debug funcional obligatorio Revisar por qué fallan: \* `POST /api/planner/tasks` \* `POST /api/planner/events` Agregar logs temporales/controlados si hace falta para ver: \* payload enviado desde frontend; \* payload recibido por backend; \* error exacto de Supabase; \* `error.message`; \* `error.details`; \* `error.hint`; \* stack si aplica. No dejar errores genéricos sin causa. \#\# Payload esperado para task  
json  
{  
  "title": "string",  
  "description": "string opcional",  
  "priority": "low | medium | high | critical",  
  "template\_key": "cleaning | shopping | pets | medication | studies | payments opcional",  
  "category": "string opcional",  
  "due\_date": "YYYY-MM-DD opcional",  
  "due\_time": "HH:mm opcional",  
  "assigned\_to\_member\_id": "uuid opcional",  
  "requires\_verification": false  
}  
Reglas: \* No enviar `household_id`. \* No enviar `person_id`. \* No enviar `assigned_to_member_id` si está vacío. \* Si no hay responsable, mandar `undefined` o no incluir el campo. \* Si hay responsable, debe ser `household_members.id`, no `people.id`. \* `due_time` debe ser compatible con Postgres `time`. \* `title` requerido. \* `priority` default `medium`. \#\# Payload esperado para event  
json  
{  
  "title": "string",  
  "description": "string opcional",  
  "starts\_at": "ISO string",  
  "ends\_at": "ISO string opcional",  
  "all\_day": false,  
  "location\_name": "string opcional",  
  "recurrence": "none | daily | weekly | monthly"  
}  
Reglas: \* No enviar `household_id`. \* `starts_at` debe ser ISO válido. \* `ends_at` debe ser ISO válido y mayor o igual a `starts_at`. \* Si `ends_at` está vacío, no enviarlo. \* `recurrence` default `none`. Corregir donde esté el problema: \* frontend payload; \* service REST; \* form; \* backend controller/service; \* validación; \* formato fecha/hora; \* assignment member id. Validar manualmente: \* crear tarea sin asignar; \* crear tarea asignada a miembro activo; \* crear tarea con template; \* crear tarea con `requires_verification`; \* crear evento simple; \* crear evento con recurrence `none`; \* crear evento con recurrence `weekly`. \--- \# 2\. Quick Actions correcto Se interpretó mal Quick Actions. Quick Actions NO debe ser una pantalla propia llamada `Crear`. Debe ser un menú global desplegable, siempre accesible desde el botón central `+` de la bottom tab bar. Bottom nav conceptual:  
txt  
Home | People | \+ | Planner | More  
El botón `+` debe: \* estar en el centro; \* ser circular; \* sobresalir/asomar desde la tab bar inferior; \* verse como acción principal flotante; \* idealmente quedar mitad dentro y mitad fuera de la tab bar; \* tener tamaño visual parecido a la altura de la tab bar; \* al tocarlo abrir un menú tipo bottom sheet / action sheet / floating menu; \* no navegar a una pantalla `Crear`. Acciones mínimas del menú: \* Crear tarea \* Crear evento Al tocar: \* Crear tarea → abrir `CreateTaskScreen` \* Crear evento → abrir `CreateEventScreen` Si hay una pantalla `Crear` creada solo para esto, eliminarla de la navegación principal o dejarla sin uso, pero no debe ser una tab visible como pantalla. \--- \# 3\. Estilo visual global de bottom nav Alinear la bottom nav con la identidad visual de la app. Referencia visual: el diseño tipo Figma donde el botón `+` central es circular, más grande y se asoma desde la tab bar. Cambiar bottom nav: \* fondo color arcilla/naranja principal de la app; \* usar texto blanco hueso / crema para labels; \* iconos también en blanco hueso; \* estado activo con contraste suave, no violeta; \* mantener Home, People, Planner, More bien visibles; \* botón `+` central destacado, circular y con sombra suave. No usar la estética negra/violeta para Planner/bottom nav si contradice el estilo arcilla/crema actual. \--- \# 4\. Consistencia visual Planner Planner ahora está funcionalmente encaminado, pero debe alinearse más con el estilo de app: \* usar paleta arcilla/naranja \+ blanco hueso/crema; \* reducir uso de violeta/negro en Planner; \* mantener cards redondeadas tipo More/Profile; \* formularios con bordes suaves; \* botones principales arcilla; \* textos oscuros sobre fondo claro; \* estados error claros pero no invasivos. No hacer rediseño enorme. Solo alinear colores y componentes principales. \--- \# 5\. Reemplazar emojis por iconos Eliminar emojis visibles en navegación/cards principales donde se pueda rápido. Usar iconos prefabricados del set ya disponible en el proyecto, por ejemplo: \* Ionicons \* Feather \* MaterialCommunityIcons \* cualquier librería ya instalada No instalar librerías nuevas salvo que ya exista una convención clara. Reemplazos esperados: \* Home \* People \* Planner \* More \* Crear tarea \* Crear evento \* Calendar \* Task \* Warning/error Si no hay tiempo, priorizar bottom nav y Quick Actions. \--- \# 6\. Animaciones y transiciones suaves Agregar solo mejoras simples si no rompen: \* transición suave al abrir Quick Actions; \* overlay/backdrop suave; \* escala u opacidad en botones; \* feedback al presionar; \* evitar cambios groseros de pantalla cuando se abre el menú `+`. No implementar sistema complejo de animaciones. No instalar dependencias pesadas. \--- \# 7\. No tocar por ahora No tocar todavía: \* Home integration con `/api/planner/summary`; \* mocks no Planner; \* Auth; \* Household; \* Invite Links; \* legacy `tasks/events/schedules`; \* Supabase directo en Planner frontend; \* módulos Finance/Inventory/Assets/Geni/etc. \--- \# 8\. Validación obligatoria Correr:  
txt  
npx.cmd tsc \--noEmit  
También probar manualmente: \* app abre; \* Home abre; \* People abre; \* More abre; \* Planner abre; \* botón `+` abre menú desplegable, no pantalla; \* Crear tarea desde `+` funciona; \* Crear evento desde `+` funciona; \* Crear tarea desde Planner funciona; \* Crear evento desde Planner funciona; \* Calendar muestra el evento creado; \* Tasks muestra la tarea creada; \* completar tarea funciona; \* no aparecen `POST /api/planner/tasks 500`; \* no aparecen `POST /api/planner/events 500`. \#\# Respuesta final esperada Responder con: \* causa exacta de los 500; \* archivos modificados; \* qué se cambió en payload/backend; \* qué se cambió en Quick Actions; \* qué se cambió visualmente; \* comandos corridos; \* estado final; \* errores pendientes si queda alguno.  
Mostrar más  
12:29 a.m.  
Procesado durante 12m 43s

Corregido.

**Causa exacta de los 500**  
El backend apuntaba a una DB donde PostgREST no tenía `public.planner_tasks` ni `public.planner_events` en schema cache:

`PGRST205: Could not find the table 'public.planner_tasks' / 'public.planner_events'`

No era payload frontend. Las migraciones Planner no estaban aplicadas en la DB remota enlazada. Ejecuté `supabase db push` y quedaron aplicadas `202606230001` y `202606230002`.

**Cambios backend/DB**

* Agregué grants Planner:  
  * \[202606230001\_planner\_mvp.sql\](C:/Users/thega/Desktop/HomePlus/supabase/migrations/202606230001\_planner\_mvp.sql)  
  * \[202606230002\_planner\_table\_grants.sql\](C:/Users/thega/Desktop/HomePlus/supabase/migrations/202606230002\_planner\_table\_grants.sql)  
* Mejoré logging controlado de errores Planner con `message/details/hint/stack`:  
  * \[planner.tasks.controller.js\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/planner.tasks.controller.js)  
  * \[planner.events.controller.js\](C:/Users/thega/Desktop/HomePlus/backend/src/controllers/planner.events.controller.js)  
  * \[planner.tasks.service.js\](C:/Users/thega/Desktop/HomePlus/backend/src/services/planner.tasks.service.js)  
  * \[planner.events.service.js\](C:/Users/thega/Desktop/HomePlus/backend/src/services/planner.events.service.js)

**Quick Actions**  
El `+` ya no navega a una pantalla `Crear`. Ahora es botón central circular, sobresale de la tab bar y abre un modal/bottom sheet con:

* Crear tarea  
* Crear evento

Modificado en \[HomeTabNavigator.tsx\](C:/Users/thega/Desktop/HomePlus/front/mi-front-limpio/navigation/HomeTabNavigator.tsx).

**Visual**

* Bottom nav alineada a arcilla/crema.  
* `+` circular destacado con sombra.  
* Se quitaron emojis visibles del bottom nav.  
* No instalé librería de iconos nueva; `@expo/vector-icons` no está resoluble como dependencia directa del proyecto.

**Validación**

* `npx.cmd tsc --noEmit`: OK  
* Backend ESLint Planner: OK  
* `supabase db lint`: OK  
* `supabase db push`: OK  
* `supabase migration list`: `202606230001` y `202606230002` aplicadas local/remoto.  
* API real validada:  
  * Crear task con template \+ verification: OK  
  * Crear event weekly: OK  
  * Calendar day muestra task \+ event: OK  
  * Crear task asignada a `household_members.id`: OK  
  * Complete task: OK

Pendiente: no hice Home Integration todavía, como pediste. No validé visualmente en Expo esta vez; el comportamiento crítico API quedó probado contra backend real local.

