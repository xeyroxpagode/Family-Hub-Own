# Entregable 2 — Contrato DB/API Planner MVP

## 0\. Objetivo

Definir el contrato exacto de base de datos y API para implementar **Planner MVP v1.0** en HomePlus.

Este contrato debe permitir que Codex implemente backend \+ DB sin volver a decidir arquitectura.

La prioridad es:

* funcionalidad persistente;

* implementación rápida;

* no romper Auth/Household;

* no usar legacy Planner;

* soportar Tasks, Events, Calendar, Templates predefinidas y Verification Flow;

* dejar listo el backend para conectar frontend y Home después.

---

# 1\. Reglas globales

## 1.1 No usar legacy

No usar, modificar, migrar ni borrar:

* tasks;

* events;

* schedules.

Esas tablas existen pero pertenecen al modelo legacy con public.users.

Crear tablas nuevas:

* planner\_tasks;

* planner\_events.

## 1.2 No usar public.users

Planner nuevo debe usar el modelo final:

* people;

* households;

* household\_members.

Nunca guardar referencias a public.users.

## 1.3 Active household

El frontend **no manda household\_id**.

El backend debe resolver el household activo usando:

1. token del usuario autenticado;

2. authFinalMiddleware;

3. people.auth\_user\_id \= req.user.id;

4. people.active\_household\_id;

5. membership active en household\_members.

Todas las operaciones Planner ocurren sobre ese active\_household.

## 1.4 Auth

Todas las rutas Planner deben usar:

authFinalMiddleware

No usar middleware legacy.

## 1.5 Rutas base

Todas las rutas nuevas cuelgan de:

/api/planner

No usar:

/api/households/:hid/...

Razón: para MVP rápido, el backend resuelve el active household y el frontend no administra IDs de hogares.

---

# 2\. Constantes globales

## 2.1 Task statuses

Estados oficiales MVP:

pending  
completed  
awaiting\_verification  
verified

Estado técnico agregado para eliminación/cancelación rápida:

cancelled

Valores permitidos en DB:

pending  
completed  
awaiting\_verification  
verified  
cancelled

## 2.2 Event statuses

Valores permitidos:

scheduled  
cancelled

## 2.3 Task priorities

Valores permitidos:

low  
medium  
high  
critical

Default:

medium

## 2.4 Event recurrence

Valores permitidos:

none  
daily  
weekly  
monthly

Default:

none

No implementar:

* RRULE;

* EXDATE;

* excepciones;

* reglas complejas;

* series editables.

## 2.5 Templates predefinidas

Templates MVP obligatorias:

| key | label |
| :---- | :---- |
| cleaning | Limpieza |
| shopping | Compras |
| pets | Mascotas |
| medication | Medicación |
| studies | Estudios |
| payments | Pagos |

Reglas:

* son constantes del sistema;

* no tienen tabla propia;

* no tienen CRUD;

* no requieren endpoint;

* backend valida template\_key si viene;

* frontend tendrá su propia constante para mostrar y precargar formularios.

---

# 3\. Tabla planner\_tasks

## 3.1 Propósito

Guardar tareas reales del Planner MVP asociadas a un household activo.

Soporta:

* crear;

* editar;

* cancelar/eliminar;

* completar;

* asignar miembro;

* fecha límite;

* prioridad;

* template predefinida;

* verification flow.

## 3.2 Columnas

**create** **table** **if** **not** **exists** **public**.planner\_tasks (  
  **id** uuid **primary** **key** **default** gen\_random\_uuid(),

  household\_id uuid **not** **null** **references** **public**.households(**id**) **on** **delete** **cascade**,

  title text **not** **null**,  
  description text **null**,

  status text **not** **null** **default** 'pending',  
  priority text **not** **null** **default** 'medium',

  template\_key text **null**,  
  **category** text **null**,

  due\_date date **null**,  
  due\_time time **null**,

  requires\_verification boolean **not** **null** **default** **false**,

  created\_by\_person\_id uuid **not** **null** **references** **public**.people(**id**) **on** **delete** **cascade**,  
  assigned\_to\_member\_id uuid **null** **references** **public**.household\_members(**id**) **on** **delete** **set** **null**,  
  completed\_by\_person\_id uuid **null** **references** **public**.people(**id**) **on** **delete** **set** **null**,  
  verified\_by\_person\_id uuid **null** **references** **public**.people(**id**) **on** **delete** **set** **null**,

  completed\_at timestamptz **null**,  
  verified\_at timestamptz **null**,

  created\_at timestamptz **not** **null** **default** now(),  
  updated\_at timestamptz **not** **null** **default** now()  
);

## 3.3 Constraints

**alter** **table** **public**.planner\_tasks  
  **add** **constraint** planner\_tasks\_status\_check  
  **check** (status **in** (  
    'pending',  
    'completed',  
    'awaiting\_verification',  
    'verified',  
    'cancelled'  
  ));

**alter** **table** **public**.planner\_tasks  
  **add** **constraint** planner\_tasks\_priority\_check  
  **check** (priority **in** (  
    'low',  
    'medium',  
    'high',  
    'critical'  
  ));

**alter** **table** **public**.planner\_tasks  
  **add** **constraint** planner\_tasks\_template\_key\_check  
  **check** (  
    template\_key **is** **null**  
    **or** template\_key **in** (  
      'cleaning',  
      'shopping',  
      'pets',  
      'medication',  
      'studies',  
      'payments'  
    )  
  );

**alter** **table** **public**.planner\_tasks  
  **add** **constraint** planner\_tasks\_title\_not\_empty\_check  
  **check** (length(trim(title)) \> 0);

## 3.4 Índices

**create** **index** **if** **not** **exists** planner\_tasks\_household\_idx  
  **on** **public**.planner\_tasks (household\_id);

**create** **index** **if** **not** **exists** planner\_tasks\_household\_status\_idx  
  **on** **public**.planner\_tasks (household\_id, status);

**create** **index** **if** **not** **exists** planner\_tasks\_household\_due\_date\_idx  
  **on** **public**.planner\_tasks (household\_id, due\_date);

**create** **index** **if** **not** **exists** planner\_tasks\_assigned\_to\_member\_idx  
  **on** **public**.planner\_tasks (assigned\_to\_member\_id);

**create** **index** **if** **not** **exists** planner\_tasks\_template\_key\_idx  
  **on** **public**.planner\_tasks (template\_key);

## 3.5 Reglas de datos

### Creación

Al crear una tarea:

* status default: pending;

* priority default: medium;

* created\_by\_person\_id: persona autenticada;

* household\_id: active household resuelto por backend.

### Assignment

Si viene assigned\_to\_member\_id:

* debe existir en household\_members;

* debe pertenecer al mismo household\_id;

* debe tener status='active'.

### Completar

Si requires\_verification=false:

pending → completed

Si requires\_verification=true:

pending → awaiting\_verification

Setear:

* completed\_by\_person\_id;

* completed\_at;

* updated\_at.

### Verificar

Solo aplica si:

status \= awaiting\_verification

Al verificar:

awaiting\_verification → verified

Setear:

* verified\_by\_person\_id;

* verified\_at;

* updated\_at.

Regla ideal:

* quien verifica no debería ser la misma persona que completó.

Regla mínima:

* quien verifica debe ser miembro active del household.

### Eliminar

No hard delete.

DELETE /api/planner/tasks/:id debe hacer:

status \= cancelled

La tarea cancelada no aparece en listados normales.

---

# 4\. Tabla planner\_events

## 4.1 Propósito

Guardar eventos reales del Planner MVP asociados a un household activo.

Soporta:

* crear;

* editar;

* cancelar/eliminar;

* listar;

* calendar;

* recurrencia simple.

## 4.2 Columnas

**create** **table** **if** **not** **exists** **public**.planner\_events (  
  **id** uuid **primary** **key** **default** gen\_random\_uuid(),

  household\_id uuid **not** **null** **references** **public**.households(**id**) **on** **delete** **cascade**,

  title text **not** **null**,  
  description text **null**,

  status text **not** **null** **default** 'scheduled',

  starts\_at timestamptz **not** **null**,  
  ends\_at timestamptz **null**,  
  all\_day boolean **not** **null** **default** **false**,

  location\_name text **null**,

  recurrence text **not** **null** **default** 'none',

  created\_by\_person\_id uuid **not** **null** **references** **public**.people(**id**) **on** **delete** **cascade**,

  created\_at timestamptz **not** **null** **default** now(),  
  updated\_at timestamptz **not** **null** **default** now()  
);

## 4.3 Constraints

**alter** **table** **public**.planner\_events  
  **add** **constraint** planner\_events\_status\_check  
  **check** (status **in** (  
    'scheduled',  
    'cancelled'  
  ));

**alter** **table** **public**.planner\_events  
  **add** **constraint** planner\_events\_recurrence\_check  
  **check** (recurrence **in** (  
    'none',  
    'daily',  
    'weekly',  
    'monthly'  
  ));

**alter** **table** **public**.planner\_events  
  **add** **constraint** planner\_events\_title\_not\_empty\_check  
  **check** (length(trim(title)) \> 0);

**alter** **table** **public**.planner\_events  
  **add** **constraint** planner\_events\_ends\_after\_starts\_check  
  **check** (ends\_at **is** **null** **or** ends\_at \>= starts\_at);

## 4.4 Índices

**create** **index** **if** **not** **exists** planner\_events\_household\_idx  
  **on** **public**.planner\_events (household\_id);

**create** **index** **if** **not** **exists** planner\_events\_household\_starts\_at\_idx  
  **on** **public**.planner\_events (household\_id, starts\_at);

**create** **index** **if** **not** **exists** planner\_events\_household\_status\_idx  
  **on** **public**.planner\_events (household\_id, status);

**create** **index** **if** **not** **exists** planner\_events\_recurrence\_idx  
  **on** **public**.planner\_events (recurrence);

## 4.5 Reglas de datos

### Creación

Al crear evento:

* status default: scheduled;

* recurrence default: none;

* created\_by\_person\_id: persona autenticada;

* household\_id: active household resuelto por backend.

### Recurrencia

Guardar solo el valor:

none | daily | weekly | monthly

No crear copias físicas de eventos recurrentes.

Las ocurrencias se expanden virtualmente en:

GET /api/planner/calendar

### Eliminar

No hard delete.

DELETE /api/planner/events/:id debe hacer:

status \= cancelled

El evento cancelado no aparece en listados normales.

---

# 5\. RLS mínima

## 5.1 Activar RLS

**alter** **table** **public**.planner\_tasks **enable** **row** **level** security;  
**alter** **table** **public**.planner\_events **enable** **row** **level** security;

## 5.2 Regla general

Un usuario puede operar sobre una fila Planner si:

1. existe people con auth\_user\_id \= auth.uid();

2. esa persona tiene membership active;

3. esa membership pertenece al household\_id de la fila.

## 5.3 Helpers recomendados

Si ya existen helpers equivalentes, reutilizarlos.

Si no existen, crear helpers mínimos.

### current\_person\_id

**create** **or** **replace** **function** **public**.current\_person\_id()  
returns uuid  
language sql  
security **definer**  
stable  
**as** $$  
  **select** p.**id**  
  **from** **public**.people p  
  **where** p.auth\_user\_id \= auth.uid()  
  **limit** 1  
$$;

### is\_active\_member\_of\_household

**create** **or** **replace** **function** **public**.is\_active\_member\_of\_household(target\_household\_id uuid)  
returns boolean  
language sql  
security **definer**  
stable  
**as** $$  
  **select** **exists** (  
    **select** 1  
    **from** **public**.household\_members hm  
    **join** **public**.people p **on** p.**id** \= hm.person\_id  
    **where** p.auth\_user\_id \= auth.uid()  
      **and** hm.household\_id \= target\_household\_id  
      **and** hm.status \= 'active'  
  )  
$$;

## 5.4 Policies sugeridas

### Tasks SELECT

**create** policy planner\_tasks\_select\_active\_household  
**on** **public**.planner\_tasks  
**for** **select**  
**using** (  
  **public**.is\_active\_member\_of\_household(household\_id)  
);

### Tasks INSERT

**create** policy planner\_tasks\_insert\_active\_household  
**on** **public**.planner\_tasks  
**for** **insert**  
**with** **check** (  
  **public**.is\_active\_member\_of\_household(household\_id)  
);

### Tasks UPDATE

**create** policy planner\_tasks\_update\_active\_household  
**on** **public**.planner\_tasks  
**for** **update**  
**using** (  
  **public**.is\_active\_member\_of\_household(household\_id)  
)  
**with** **check** (  
  **public**.is\_active\_member\_of\_household(household\_id)  
);

### Tasks DELETE

No se necesita DELETE real si el backend usa status='cancelled'.

Si se crea, mantener misma regla active household.

### Events SELECT

**create** policy planner\_events\_select\_active\_household  
**on** **public**.planner\_events  
**for** **select**  
**using** (  
  **public**.is\_active\_member\_of\_household(household\_id)  
);

### Events INSERT

**create** policy planner\_events\_insert\_active\_household  
**on** **public**.planner\_events  
**for** **insert**  
**with** **check** (  
  **public**.is\_active\_member\_of\_household(household\_id)  
);

### Events UPDATE

**create** policy planner\_events\_update\_active\_household  
**on** **public**.planner\_events  
**for** **update**  
**using** (  
  **public**.is\_active\_member\_of\_household(household\_id)  
)  
**with** **check** (  
  **public**.is\_active\_member\_of\_household(household\_id)  
);

---

# 6\. Backend context obligatorio

Crear helper/service backend para resolver contexto Planner.

Nombre sugerido:

planner.context.service.js

## 6.1 Función sugerida

getPlannerContext(req)

Debe devolver:

{  
  "person": {},  
  "household": {},  
  "membership": {},  
  "householdId": "uuid",  
  "personId": "uuid",  
  "membershipId": "uuid",  
  "role": "coordinator | adult | adolescent | child | senior | guest"  
}

## 6.2 Lógica

1. Recibe req.user.id desde authFinalMiddleware.

2. Busca people por auth\_user\_id.

3. Lee active\_household\_id.

4. Valida que exista membership active en ese household.

5. Devuelve contexto.

6. Si falla, lanza error claro.

## 6.3 Errores

| Caso | HTTP | Código |
| :---- | ----: | :---- |
| Sin token | 401 | not\_authenticated |
| No existe person | 403 | person\_not\_found |
| Sin active household | 403 | no\_active\_household |
| Sin membership active | 403 | not\_active\_household\_member |

---

# 7\. Endpoints Tasks

## 7.1 GET /api/planner/tasks

Lista tareas del active household.

### Query opcional

| Query | Tipo | Uso |
| :---- | :---- | :---- |
| status | string | filtrar por status |
| assigned\_to\_member\_id | uuid | filtrar por miembro asignado |
| from | date | filtrar due\_date desde |
| to | date | filtrar due\_date hasta |
| template\_key | string | filtrar por template |
| include\_cancelled | boolean | incluir canceladas |
| limit | number | límite simple |

### Regla default

Si include\_cancelled no es true:

status \!= cancelled

### Orden

1. pending;

2. awaiting\_verification;

3. verified;

4. completed;

5. por due\_date;

6. por created\_at desc.

### Response

{  
  "tasks": \[  
    {  
      "id": "uuid",  
      "household\_id": "uuid",  
      "title": "Tarea",  
      "description": **null**,  
      "status": "pending",  
      "priority": "medium",  
      "template\_key": "cleaning",  
      "category": "Limpieza",  
      "due\_date": "2026-06-22",  
      "due\_time": "18:00",  
      "requires\_verification": **false**,  
      "created\_by\_person\_id": "uuid",  
      "assigned\_to\_member\_id": "uuid",  
      "completed\_by\_person\_id": **null**,  
      "verified\_by\_person\_id": **null**,  
      "completed\_at": **null**,  
      "verified\_at": **null**,  
      "created\_at": "ISO",  
      "updated\_at": "ISO",  
      "assigned\_member": {  
        "id": "membership uuid",  
        "person\_id": "uuid",  
        "display\_name": "Nombre",  
        "avatar\_url": **null**,  
        "role": "adult"  
      }  
    }  
  \]  
}

assigned\_member es deseable si puede hidratarse rápido. Si no, puede omitirse en backend y resolverse en frontend.

---

## 7.2 POST /api/planner/tasks

Crea tarea en active household.

### Body

{  
  "title": "string",  
  "description": "string opcional",  
  "priority": "low | medium | high | critical opcional",  
  "template\_key": "cleaning | shopping | pets | medication | studies | payments opcional",  
  "category": "string opcional",  
  "due\_date": "YYYY-MM-DD opcional",  
  "due\_time": "HH:mm opcional",  
  "assigned\_to\_member\_id": "uuid opcional",  
  "requires\_verification": **false**  
}

### Validaciones

* title requerido y no vacío;

* priority default medium;

* template\_key debe estar permitido si viene;

* assigned\_to\_member\_id debe pertenecer a active household y tener status active;

* requires\_verification default false.

### Backend setea

{  
  "household\_id": "active\_household\_id",  
  "status": "pending",  
  "created\_by\_person\_id": "current person id"  
}

### Response

{  
  "task": {}  
}

---

## 7.3 PATCH /api/planner/tasks/:id

Edita tarea.

### Body permitido

{  
  "title": "string opcional",  
  "description": "string opcional",  
  "priority": "low | medium | high | critical opcional",  
  "template\_key": "string opcional",  
  "category": "string opcional",  
  "due\_date": "YYYY-MM-DD opcional",  
  "due\_time": "HH:mm opcional",  
  "assigned\_to\_member\_id": "uuid opcional",  
  "requires\_verification": **true**  
}

### Regla importante

PATCH no debería usarse para cambiar estados del flujo.

Estados se cambian con:

* POST /complete;

* POST /verify;

* DELETE.

Esto evita saltear verification.

### Validaciones

* task debe pertenecer al active household;

* si cambia assignment, validar membership active;

* si cambia template\_key, validar constante;

* title no vacío si viene.

### Response

{  
  "task": {}  
}

---

## 7.4 DELETE /api/planner/tasks/:id

Cancela tarea.

### Acción

status \= cancelled  
updated\_at \= now()

### No hacer

* no hard delete;

* no borrar fila;

* no mover a papelera.

### Response

{  
  "task": {}  
}

---

## 7.5 POST /api/planner/tasks/:id/complete

Completa tarea.

### Reglas

Si:

requires\_verification \= false

entonces:

status \= completed

Si:

requires\_verification \= true

entonces:

status \= awaiting\_verification

Setear siempre:

* completed\_by\_person\_id \= current person;

* completed\_at \= now();

* updated\_at \= now().

### Idempotencia

Si la tarea ya está en:

* completed;

* awaiting\_verification;

* verified;

devolver la task actual sin romper.

### Response

{  
  "task": {}  
}

---

## 7.6 POST /api/planner/tasks/:id/verify

Verifica tarea.

### Reglas

Solo puede verificar si:

status \= awaiting\_verification

Usuario actual debe ser miembro active del household.

Regla deseada:

verified\_by\_person\_id \!= completed\_by\_person\_id

Si eso complica, no bloquear MVP, pero intentar implementarlo.

### Acción

status \= verified  
verified\_by\_person\_id \= current person  
verified\_at \= now()  
updated\_at \= now()

### Response

{  
  "task": {}  
}

### Errores posibles

| Caso | HTTP | Código |
| :---- | ----: | :---- |
| Task no existe en household | 404 | task\_not\_found |
| Task no está awaiting | 409 | task\_not\_awaiting\_verification |
| Misma persona verifica | 409 | cannot\_verify\_own\_completion |

---

# 8\. Endpoints Events

## 8.1 GET /api/planner/events

Lista eventos reales del active household.

### Query opcional

| Query | Tipo | Uso |
| :---- | :---- | :---- |
| from | ISO/date | inicio del rango |
| to | ISO/date | fin del rango |
| status | string | scheduled/cancelled |
| include\_cancelled | boolean | incluir cancelados |
| include\_recurring | boolean | expandir recurrencia virtual |

### Default

Si no viene rango:

from \= now()  
to \= now() \+ 30 días

Si include\_cancelled no es true:

status \!= cancelled

### Response

{  
  "events": \[  
    {  
      "id": "uuid",  
      "household\_id": "uuid",  
      "title": "Evento",  
      "description": **null**,  
      "status": "scheduled",  
      "starts\_at": "ISO",  
      "ends\_at": "ISO",  
      "all\_day": **false**,  
      "location\_name": "Lugar",  
      "recurrence": "weekly",  
      "created\_by\_person\_id": "uuid",  
      "created\_at": "ISO",  
      "updated\_at": "ISO"  
    }  
  \]  
}

---

## 8.2 POST /api/planner/events

Crea evento.

### Body

{  
  "title": "string",  
  "description": "string opcional",  
  "starts\_at": "ISO string",  
  "ends\_at": "ISO string opcional",  
  "all\_day": **false**,  
  "location\_name": "string opcional",  
  "recurrence": "none | daily | weekly | monthly opcional"  
}

### Validaciones

* title requerido y no vacío;

* starts\_at requerido;

* recurrence default none;

* si ends\_at existe, debe ser \>= starts\_at.

### Backend setea

{  
  "household\_id": "active\_household\_id",  
  "status": "scheduled",  
  "created\_by\_person\_id": "current person id"  
}

### Response

{  
  "event": {}  
}

---

## 8.3 PATCH /api/planner/events/:id

Edita evento.

### Body permitido

{  
  "title": "string opcional",  
  "description": "string opcional",  
  "starts\_at": "ISO opcional",  
  "ends\_at": "ISO opcional",  
  "all\_day": **false**,  
  "location\_name": "string opcional",  
  "recurrence": "none | daily | weekly | monthly opcional"  
}

### Regla

No cambiar status desde PATCH salvo que Codex lo necesite internamente.

Cancelar se hace con:

DELETE /api/planner/events/:id

### Validaciones

* evento debe pertenecer al active household;

* title no vacío si viene;

* recurrence válida si viene;

* ends\_at \>= starts\_at.

### Response

{  
  "event": {}  
}

---

## 8.4 DELETE /api/planner/events/:id

Cancela evento.

### Acción

status \= cancelled  
updated\_at \= now()

### No hacer

* no hard delete;

* no borrar fila;

* no borrar ocurrencias recurrentes;

* no implementar series avanzadas.

### Response

{  
  "event": {}  
}

---

# 9\. Endpoint Calendar

## 9.1 GET /api/planner/calendar

Devuelve items combinados de calendario.

### Query

view=day|week|month  
date=YYYY-MM-DD

### Defaults

Si no viene view:

day

Si no viene date:

hoy

## 9.2 Rangos

### Día

Desde inicio del día hasta fin del día.

### Semana

7 días desde la fecha base o semana calendario, lo más simple para Codex.

Prioridad: funcionalidad, no perfección cultural de semana.

### Mes

Primer día del mes hasta último día del mes.

Vista mes en frontend será agenda mensual agrupada por día.

## 9.3 Qué incluye

Calendar debe incluir:

1. eventos scheduled dentro del rango;

2. ocurrencias virtuales de eventos recurrentes dentro del rango;

3. tareas con due\_date dentro del rango y status no cancelled.

## 9.4 Response

{  
  "view": "day",  
  "date": "2026-06-22",  
  "range": {  
    "from": "ISO",  
    "to": "ISO"  
  },  
  "items": \[\]  
}

## 9.5 Event item

{  
  "type": "event",  
  "id": "event-id",  
  "occurrence\_id": "event-id:2026-06-22T10:00:00.000Z",  
  "title": "Evento",  
  "description": **null**,  
  "starts\_at": "ISO",  
  "ends\_at": "ISO",  
  "all\_day": **false**,  
  "location\_name": "Lugar",  
  "recurrence": "weekly",  
  "is\_recurring\_occurrence": **true**,  
  "status": "scheduled"  
}

Para eventos no recurrentes:

{  
  "is\_recurring\_occurrence": **false**  
}

## 9.6 Task item

{  
  "type": "task",  
  "id": "task-id",  
  "title": "Tarea",  
  "description": **null**,  
  "due\_date": "YYYY-MM-DD",  
  "due\_time": "HH:mm",  
  "status": "pending",  
  "priority": "medium",  
  "template\_key": "cleaning",  
  "category": "Limpieza",  
  "assigned\_to\_member\_id": "uuid",  
  "requires\_verification": **false**  
}

## 9.7 Recurrencia virtual

No guardar ocurrencias virtuales en DB.

Algoritmo simple:

* daily: sumar 1 día hasta rango to;

* weekly: sumar 7 días;

* monthly: sumar 1 mes;

* cortar cuando supera rango;

* solo incluir ocurrencias dentro del rango pedido.

No implementar:

* recurrence end;

* exceptions;

* skipped dates;

* timezones avanzados.

---

# 10\. Endpoint Summary

## 10.1 GET /api/planner/summary

Devuelve resumen para Home.

## 10.2 Response

{  
  "pending\_tasks\_count": 0,  
  "today\_tasks\_count": 0,  
  "overdue\_tasks\_count": 0,  
  "awaiting\_verification\_count": 0,  
  "upcoming\_events\_count": 0,  
  "tasks\_today": \[\],  
  "overdue\_tasks": \[\],  
  "awaiting\_verification\_tasks": \[\],  
  "upcoming\_events": \[\],  
  "briefing\_text": "Hoy tienes 3 tareas y 2 eventos."  
}

## 10.3 Reglas

### Pending tasks

status \= pending

### Today tasks

due\_date \= today  
status \!= cancelled

### Overdue tasks

due\_date \< today  
status \= pending

### Awaiting verification

status \= awaiting\_verification

### Upcoming events

status \= scheduled  
starts\_at entre now y now \+ 7 días

Puede incluir recurrencias si ya está implementada la expansión simple. Si complica, usar eventos reales primero y recurrencias en Calendar.

### Briefing

Generar texto simple determinístico:

Hoy tienes X tareas y Y eventos.

No usar Geni real.

---

# 11\. Validación de templates

## 11.1 Backend

Crear constante:

**const** TASK\_TEMPLATE\_KEYS \= \[  
  'cleaning',  
  'shopping',  
  'pets',  
  'medication',  
  'studies',  
  'payments',  
\];

Si template\_key viene y no está en esa lista:

400 validation\_error

## 11.2 No endpoint

No crear endpoint obligatorio para templates.

Razón:

* el MVP dice que no requieren endpoints;

* frontend puede tener constante equivalente;

* ahorra implementación.

---

# 12\. Errores API estándar

Usar errores simples.

| HTTP | Código | Cuándo |
| ----: | :---- | :---- |
| 401 | not\_authenticated | sin token o token inválido |
| 403 | person\_not\_found | no existe persona final |
| 403 | no\_active\_household | person no tiene household activo |
| 403 | not\_active\_household\_member | no tiene membership active |
| 400 | validation\_error | body inválido |
| 400 | invalid\_template\_key | template no permitido |
| 400 | invalid\_priority | prioridad no permitida |
| 400 | invalid\_recurrence | recurrence no permitida |
| 404 | task\_not\_found | task no existe en household |
| 404 | event\_not\_found | event no existe en household |
| 409 | task\_not\_awaiting\_verification | verify inválido |
| 409 | cannot\_verify\_own\_completion | misma persona intenta verificar |
| 500 | internal\_error | error inesperado |

No sobrediseñar sistema de errores.

---

# 13\. Archivos backend sugeridos

Codex puede adaptar según estructura real, pero el contrato espera algo equivalente a:

backend/src/routes/planner.js

backend/src/controllers/planner.tasks.controller.js  
backend/src/controllers/planner.events.controller.js  
backend/src/controllers/planner.calendar.controller.js  
backend/src/controllers/planner.summary.controller.js

backend/src/services/planner.context.service.js  
backend/src/services/planner.tasks.service.js  
backend/src/services/planner.events.service.js  
backend/src/services/planner.calendar.service.js  
backend/src/services/planner.summary.service.js

backend/src/constants/planner.constants.js

Registrar rutas en:

backend/index.js

---

# 14\. Criterio DONE del Entregable 2

El Entregable 2 queda implementado cuando:

## DB

* existe migración nueva;

* existen planner\_tasks;

* existen planner\_events;

* RLS está activa;

* policies mínimas funcionan;

* constraints están creadas;

* índices básicos están creados;

* no se tocaron tablas legacy.

## Backend

* rutas /api/planner/\* registradas;

* todas usan authFinalMiddleware;

* backend resuelve active household;

* frontend no necesita mandar household\_id;

* no se usa public.users.

## Tasks

* listar funciona;

* crear funciona;

* editar funciona;

* cancelar funciona;

* completar funciona;

* verificar funciona;

* assignment valida household;

* templates validan backend.

## Events

* listar funciona;

* crear funciona;

* editar funciona;

* cancelar funciona;

* recurrence se guarda.

## Calendar

* view=day funciona;

* view=week funciona;

* view=month funciona;

* muestra eventos;

* muestra tareas con fecha;

* expande recurrencia simple virtualmente.

## Summary

* devuelve conteos;

* devuelve arrays para Home;

* devuelve briefing simple.

## No incluido

* frontend;

* Home UI;

* templates CRUD;

* participants;

* comments;

* attachments;

* RRULE;

* EXDATE;

* Geni.

---

# 15\. Orden sugerido para Codex al implementar este contrato

1. Crear migración.

2. Crear helpers/RLS.

3. Crear constants.

4. Crear context service.

5. Crear tasks service/controller.

6. Crear events service/controller.

7. Crear calendar service/controller.

8. Crear summary service/controller.

9. Registrar routes.

10. Correr DB reset/lint.

11. Levantar backend.

12. Probar endpoints básicos.

---

# 16\. Prompt derivado de este contrato

Este contrato se usará para crear el Prompt A:

Implementar Planner Backend \+ DB MVP rápido completo.

Ese prompt debe copiar este contrato como fuente y pedir ejecución directa, sin auditoría ni alternativas.