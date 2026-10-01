# PLANNER ↔ INVENTORY — Especificación de relación

**Producto:** HomePlus  
**Módulo base:** Planner  
**Módulo relacionado:** Inventory / Inventario  
**Archivo derivado de:** `planner.md` + fragments Planner disponibles  
**Objetivo:** aislar todo lo que Planner se relaciona con Inventory para implementación, planificación, QA y futuras decisiones.

---

## 1. Resumen ejecutivo

La relación Planner ↔ Inventory existe principalmente a través de **Tasks**.

Inventory no aparece como submódulo interno de Planner, sino como un dominio externo capaz de **disparar, sugerir o generar tareas** dentro de Planner cuando ocurre una condición operativa del inventario.

La relación más repetida en los fragments es:

```txt
Inventory / Stock bajo / Item pendiente
        ↓
Automatización o sugerencia de Geni
        ↓
Task en Planner
        ↓
Home / Notificaciones / Realtime / Auditoría
```

El caso principal es **stock bajo → tarea de reposición / compra**.

También aparecen relaciones futuras o a revisar con:

- productos o consumibles del hogar;
- medicamentos;
- vencimientos de items;
- shopping list / lista de compras;
- sugerencias de compra cerca de supermercado;
- responsabilidad `Compras`;
- automatizaciones prearmadas.

---

## 2. Alcance específico

Este archivo incluye únicamente la relación entre Planner e Inventory.

Incluye:

- Tasks generadas desde Inventory.
- Stock bajo.
- Reposición.
- Compra de items.
- ShoppingList cuando aparece relacionada con Task.
- Vencimientos de items cuando aparecen relacionados con tareas/notificaciones.
- Medicación cuando aparece como item de inventario que puede disparar acciones.
- Geni sugeriendo tareas desde Inventory.
- Automatizaciones `Stock bajo → Task`.
- Home mostrando tareas derivadas de Inventory.
- Realtime/offline/audit aplicados a tareas generadas por Inventory.
- Decisiones pendientes para modelar la relación técnicamente.

No incluye:

- especificación completa del módulo Inventory;
- tablas completas de inventario;
- CRUD de Inventory;
- UI completa de Inventory;
- modelo de compras completo;
- módulos Assets o Finance salvo cuando ayudan a diferenciar límites.

---

## 3. Clasificación por estado

### 3.1 CORE RELACIONAL

La integración conceptual central es:

- Inventory detecta una necesidad operativa.
- Planner la transforma en una Task accionable.
- La Task se asigna a un miembro o queda sin asignar según reglas.
- La Task aparece en Planner y puede resumirse en Home.

### 3.2 POST-MVP / FUTURE

La mayoría de relaciones Inventory ↔ Planner aparecen como **futuras, avanzadas o de integración**, no como contrato MVP cerrado.

Entrarían como Post-MVP:

- Inventory real generando tareas automáticamente.
- Stock bajo con automatización configurable.
- ShoppingList conectada a Task.
- Vencimientos de items generando tareas.
- Medicación generando tareas operativas.
- Sugerencia por cercanía a supermercado.
- Tarjetas de integración Inventory en Home.

### 3.3 MOCK / DEMO

Para demo premium se puede mostrar:

- una card mock de “Stock bajo”;
- una tarea mock generada por Inventory;
- una sugerencia de Geni tipo “El stock de leche está bajo…”;
- una integración visual Inventory → Planner sin backend completo.

No debe fingirse como real si no existe backend conectado.

### 3.4 A REVISIÓN

Quedan pendientes:

- definir tablas reales de Inventory;
- definir evento técnico `inventory.low_stock_detected` o equivalente;
- definir si Inventory crea Task directamente o pasa por Automations/Geni;
- definir cómo se referencia el item de inventario desde `tasks`;
- definir aprobación requerida antes de crear tareas automáticas;
- definir permisos por rol para aceptar, rechazar o configurar automatizaciones;
- definir si medicamentos generan Task, Notification o ambas.

---

## 4. Entidades involucradas

### 4.1 Desde Planner

#### `Task`

Entidad principal donde aterriza la integración.

Campos relevantes ya definidos en Planner:

- `id`
- `household_id`
- `title`
- `description`
- `visibility`
- `status`
- `priority`
- `start_date`
- `due_date`
- `due_time`
- `recurrence_rule`
- `recurrence_end`
- `responsibility_id`
- `goal_id`
- `created_by`
- `assigned_to`
- `completed_by`
- `completed_at`
- `requires_verification`
- `verified_by`
- `verified_at`
- `parent_task_id`
- `event_id`
- `deleted_at`
- `created_at`
- `updated_at`

Uso para Inventory:

- crear tarea de compra;
- crear tarea de reposición;
- crear tarea de revisión de vencimiento;
- crear tarea de limpieza asociada al inventario;
- crear tarea por producto/consumible/medicación.

#### `Responsibility`

Inventory se relaciona con Planner mediante responsabilidades operativas.

Responsabilidades mencionadas relacionadas:

- `Compras`
- `Limpieza`
- `Mascotas`

La responsabilidad más directa es `Compras`, porque agrupa adquisición de consumibles y productos del hogar.

#### `Notification`

Inventory puede derivar en notificaciones, especialmente:

- stock bajo;
- medicamento próximo a vencer;
- tarea creada;
- tarea asignada;
- tarea vencida.

#### `Automation`

Inventory puede alimentar automatizaciones.

Caso explícito:

```txt
Inventory > Stock bajo → Automatizaciones > Tasks
```

#### `Geni`

Geni puede:

- detectar o recibir contexto de stock bajo;
- sugerir crear una tarea;
- sugerir crear una automatización recurrente;
- no ejecutar unilateralmente acciones permanentes sin aprobación.

---

### 4.2 Desde Inventory

Las entidades de Inventory no están completamente especificadas en Planner, pero aparecen referencias conceptuales a:

#### `Inventory`

Dominio externo que puede generar Tasks.

#### `InventoryItem`

Item de inventario.

Relaciones encontradas:

- puede generar `ShoppingList`;
- puede generar `Task` según relaciones cruzadas;
- puede estar por debajo de `min_quantity`.

#### `StockItem`

Aparece en Home como entidad que dispara reposición hacia `Task`.

Relación:

```txt
StockItem triggers_reorder Task
```

#### `ShoppingList`

Aparece como entidad intermedia:

```txt
InventoryItem → ShoppingList → Task
```

No se define contrato completo de `ShoppingList`.

#### `Consumable` / `HouseholdProduct` / `Medication`

Pueden disparar tareas en Planner según fragments de emotional design.

Estado:

- relación conceptual;
- no hay triggers completos;
- no hay UI definida;
- no hay endpoint definido.

#### `ExpiryRecord`

Aparece como relación faltante sugerida:

- debería disparar `Task`;
- está marcada como implied/futura;
- no aparece como tabla/contrato implementado en Planner.

---

## 5. Flujos principales

### 5.1 Stock bajo → tarea de reposición

Flujo base:

```txt
inventory_items.quantity < inventory_items.min_quantity
        ↓
Stock bajo detectado
        ↓
Automatización o Geni propone acción
        ↓
Crear Task en Planner
        ↓
Task visible en Planner / Home
        ↓
Notificación al responsable si corresponde
```

Ejemplo de Task:

```txt
Título: Comprar leche
Responsabilidad: Compras
Prioridad: Media
Estado inicial: pending
Visibilidad: household
Origen: Inventory / Stock bajo
```

Estado:

- integración explícita como relación;
- no hay endpoint específico de Inventory definido;
- no hay pantalla de aprobación definida;
- implementación concreta pendiente.

---

### 5.2 InventoryItem → ShoppingList → Task

Flujo detectado:

```txt
InventoryItem
  → ShoppingList
  → Task
```

Uso esperado:

- un item con stock bajo entra a una lista de compras;
- la lista genera una tarea accionable;
- la tarea se asigna a un miembro o queda pendiente de asignación;
- Planner gestiona estado, vencimiento, completion y verificación si aplica.

Pendiente:

- definir si la Task representa un item individual o una lista completa;
- definir si varias reposiciones se agrupan en una sola Task;
- definir si `ShoppingList` vive en Inventory, Planner o módulo separado.

---

### 5.3 Consumible / producto del hogar → Task

Flujo conceptual:

```txt
Consumable / HouseholdProduct detecta necesidad
        ↓
Planner recibe o genera Task
```

Ejemplos:

- comprar alimento para perro;
- reponer productos de limpieza;
- comprar pañales;
- reponer leche;
- revisar stock de supermercado.

---

### 5.4 Medicación / vencimiento → Notification o Task

Hay dos lecturas en los fragments:

1. Medicamento próximo a vencer → `notifications table`.
2. Medicación puede disparar tareas en Planner.

Conclusión:

- para MVP, tratar medicación como **notificación** salvo decisión explícita;
- para Post-MVP, permitir que vencimientos generen Tasks;
- marcar `ExpiryRecord → Task` como pendiente de definición.

Ejemplos posibles:

```txt
Revisar vencimiento de medicamentos
Comprar medicación faltante
Reponer ibuprofeno
```

---

### 5.5 Stock bajo → Geni sugiere Task

Geni puede proponer:

```txt
“El stock de leche está bajo. ¿Creo una tarea de compras?”
```

Reglas:

- Geni sugiere, no impone.
- Geni no debe crear acciones permanentes sin aprobación explícita.
- Geni puede sugerir una task puntual.
- Geni puede sugerir una automatización futura.

---

### 5.6 Stock bajo → Geni sugiere automatización

Ejemplo explícito:

```txt
“Cada vez que el stock de pañales baje de 2 unidades, ¿creo una tarea de compra?”
```

Flujo:

```txt
Patrón repetido de stock bajo
        ↓
Geni detecta oportunidad
        ↓
Sugiere automatización
        ↓
Coordinador aprueba o rechaza
        ↓
Automation queda activa, pausada o archivada
```

Pendiente:

- endpoint para crear automation desde sugerencia;
- permisos de aprobación;
- UI de confirmación;
- logs/auditoría;
- reglas anti-spam.

---

### 5.7 Compras cerca / supermercado cercano

Relación encontrada:

```txt
ComprasCerca usa ubicación actual + items pendientes de Inventory
para sugerir compra si el usuario está cerca de un supermercado.
```

Esto cruza:

- Inventory;
- Presence / ubicación;
- Planner / Task;
- Notifications;
- Geni.

Estado:

- avanzado;
- no definido como Planner real asociado;
- no implementar como MVP sin aprobación.

---

## 6. Reglas de negocio

### 6.1 Regla principal

Inventory puede originar trabajo, pero Planner administra la ejecución.

Inventory responde:

- qué falta;
- qué está bajo;
- qué vence;
- qué conviene comprar/reponer.

Planner responde:

- qué tarea existe;
- quién la hace;
- cuándo vence;
- en qué estado está;
- si requiere verificación;
- si aparece en Home;
- cómo se audita.

---

### 6.2 Estado de Task

La Task generada desde Inventory debe usar estados normales de Planner:

- `pending`
- `in_progress`
- `completed`
- `cancelled`

`overdue` / vencida no es estado propio; se calcula por fecha.

---

### 6.3 Responsabilidad obligatoria

Toda Task requiere `responsibility_id`.

Para tareas de Inventory, default sugerido:

```txt
Responsibility: Compras
```

Si no existe `Compras`, opciones a decidir:

1. crear responsabilidad default `Compras`;
2. usar responsabilidad default `General`;
3. exigir configuración antes de activar integración.

---

### 6.4 Visibilidad

Por default, tareas generadas por Inventory deberían ser `household`, porque afectan coordinación doméstica.

Excepción posible:

- medicación personal;
- producto personal;
- inventario privado.

Estas excepciones requieren reglas de privacidad no definidas en Planner.

---

### 6.5 Asignación

Opciones posibles:

1. Task sin responsable (`assigned_to = null`).
2. Task asignada al miembro responsable de `Compras`.
3. Task asignada al Coordinador.
4. Task sugerida por Geni y asignada tras confirmación humana.

No hay regla final cerrada en los fragments.

---

### 6.6 Repetición / recurrencia

Para stock bajo repetido, se puede sugerir automatización.

No debe confundirse:

- recurrencia de Task: genera nuevas instancias y preserva historial;
- automatización de Inventory: observa stock y crea Task cuando se cumple condición.

---

### 6.7 Verificación

Puede aplicarse si la tarea de Inventory requiere confirmación.

Ejemplos:

- comprar producto crítico;
- reponer medicación;
- revisar vencimientos;
- limpiar heladera.

No hay regla específica; usar `requires_verification` solo si el caso lo justifica.

---

## 7. Modelo de datos recomendado para conectar Planner ↔ Inventory

> Esta sección es propuesta de implementación porque los fragments no definen campos técnicos finales para enlazar Task con InventoryItem.

### 7.1 Opción A — Campos genéricos en `tasks`

Agregar campos:

```sql
origin_module text null,        -- 'inventory', 'assets', 'finance', 'geni', 'automation'
origin_entity_type text null,   -- 'inventory_item', 'shopping_list', 'expiry_record'
origin_entity_id uuid null,
origin_reason text null         -- 'low_stock', 'expiry', 'manual_suggestion'
```

Ventaja:

- flexible para Inventory, Assets, Finance y futuros módulos.

Riesgo:

- menos integridad referencial fuerte.

---

### 7.2 Opción B — Tabla relacional específica

Crear tabla:

```sql
planner_task_sources (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id),
  task_id uuid not null references tasks(id),
  source_module text not null,
  source_entity_type text not null,
  source_entity_id uuid not null,
  source_reason text null,
  created_at timestamptz not null default now()
)
```

Ventaja:

- no contamina `tasks`;
- permite múltiples fuentes por tarea;
- auditable.

Riesgo:

- más complejidad.

---

### 7.3 Opción recomendada

Para HomePlus, conviene la **Opción B** si se planean muchas integraciones.

Para MVP rápido, conviene la **Opción A** o directamente no persistir origen hasta implementar Inventory real.

---

## 8. API / contratos disponibles y faltantes

### 8.1 APIs de Planner reutilizables

Inventory puede crear tareas usando el contrato existente:

```http
POST /api/households/:hid/tasks
```

Campos útiles:

```json
{
  "title": "Comprar leche",
  "responsibility_id": "...",
  "description": "Stock bajo detectado desde Inventory",
  "visibility": "household",
  "priority": "medium",
  "assigned_to": null,
  "due_date": "2026-07-09",
  "requires_verification": false
}
```

---

### 8.2 APIs faltantes

No se encontró contrato explícito para:

```http
POST /api/households/:hid/inventory/:itemId/create-task
POST /api/households/:hid/inventory/low-stock/run
POST /api/households/:hid/inventory/low-stock/automation
```

Tampoco se encontró:

- request/response de Inventory generando Task;
- endpoint para aprobar sugerencia de Geni desde Inventory;
- endpoint para agrupar varios items en una Task;
- endpoint para transformar ShoppingList en Task.

---

## 9. Eventos del sistema sugeridos

> No son contratos finales; son nombres recomendados para implementación futura.

### 9.1 Eventos Inventory

```txt
inventory.item_low_stock
inventory.item_restocked
inventory.item_expiring
inventory.shopping_list_created
inventory.shopping_list_ready
```

### 9.2 Eventos Planner derivados

```txt
task.created
notification.created
automation.triggered
geni.suggestion.created
```

### 9.3 Flujo de evento recomendado

```txt
inventory.item_low_stock
        ↓
automation.triggered
        ↓
task.created
        ↓
notification.created
        ↓
realtime household:{hid}
```

---

## 10. Home / UI

### 10.1 Home

Home puede mostrar tareas generadas por Inventory, pero no administra Inventory.

Ejemplos:

- “Comprar leche” en tareas de hoy.
- “Stock bajo: pañales” como atención requerida.
- “Hay 3 items pendientes para reponer.”
- Card mock/premium de Inventory.

Regla general:

```txt
Home resume; Planner administra tareas; Inventory administra stock.
```

---

### 10.2 Planner

En Planner, una Task generada por Inventory debería verse como una tarea normal, con contexto opcional:

```txt
Comprar leche
Responsabilidad: Compras
Origen: Inventario · Stock bajo
```

Componentes útiles:

- badge `Inventario`;
- badge `Stock bajo`;
- link a item de inventario;
- botón “Ver item”;
- acción “Marcar comprada/completada”;
- toast con deshacer si se completa por error.

---

### 10.3 Inventory

Desde Inventory se podría mostrar:

- botón “Crear tarea de compra”;
- sugerencia de Geni;
- automatización recomendada;
- historial de tareas generadas;
- estado de la Task vinculada.

Pendiente de definir porque no pertenece a Planner.

---

## 11. Geni / Intelligence

Geni puede operar como capa intermedia.

### 11.1 Sugerencia puntual

```txt
“El stock de leche está bajo. ¿Creo una tarea de compras?”
```

Acciones:

- Crear tarea.
- Ignorar.
- Recordar más tarde.
- Crear automatización.

---

### 11.2 Sugerencia de automatización

```txt
“Cada vez que el stock de pañales baje de 2 unidades, ¿creo una tarea de compra?”
```

Debe requerir aprobación explícita.

---

### 11.3 Tono

Geni debe presentar datos, no juicio.

Correcto:

```txt
“Hay 3 items por debajo del mínimo.”
```

Incorrecto:

```txt
“Nadie está controlando las compras.”
```

---

## 12. Realtime / Offline / Audit

### 12.1 Realtime

Cuando Inventory genera una Task, la actualización debe comportarse como cualquier Task:

- `task.created` en canal del household;
- clientes conectados actualizan Planner/Home;
- segundo dispositivo ve la tarea sin refresh manual si realtime está activo.

---

### 12.2 Offline

Si se crea una Task desde Inventory estando offline:

- se encola el cambio;
- se sincroniza al reconectar;
- conflicto se resuelve según regla general offline del producto;
- si el item ya fue repuesto por otro miembro, debe resolverse con auditoría o aviso.

Pendiente:

- regla específica para duplicados por stock bajo.

---

### 12.3 Audit

Debe auditarse:

- quién/qué generó la Task;
- si fue Geni, automation o usuario;
- item origen;
- motivo: stock bajo, vencimiento, reposición;
- cambios de asignación;
- completitud;
- cancelación.

---

## 13. Permisos

### 13.1 Crear tarea desde Inventory

Posibles permisos según reglas generales de Planner:

- Coordinador: puede crear y configurar.
- Adulto: puede crear tareas y administrar operaciones familiares.
- Senior: puede crear tareas si la regla de Planner lo permite.
- Adolescente: solo tareas propias o según permisos configurados.
- Niño: normalmente no crea tareas de household.
- Guest / empleado familiar: solo completar/comentar/adjuntar evidencia si está asignado, según el rol definido.

### 13.2 Configurar automatización

Debe requerir rol alto.

Recomendación:

- Coordinador: sí.
- Adulto: sí si permisos familiares lo permiten.
- Adolescente: no por default.
- Otros roles: no.

---

## 14. Casos de uso concretos

### Caso 1 — Comprar leche

```txt
Inventory detecta stock bajo de leche.
Geni pregunta: “El stock de leche está bajo. ¿Creo una tarea de compras?”
Usuario acepta.
Planner crea Task: Comprar leche.
Home muestra la tarea.
```

### Caso 2 — Pañales bajo umbral

```txt
Stock de pañales baja de 2 unidades.
Geni sugiere automatización permanente.
Coordinador aprueba.
Cada vez que ocurre, se crea Task de compra.
```

### Caso 3 — Comprar alimento para perro

```txt
Inventory detecta bajo stock de alimento para perro.
Planner crea/sugiere Task: Comprar alimento para perro.
Responsabilidad sugerida: Compras o Mascotas.
```

### Caso 4 — Limpiar heladera

```txt
Inventory detecta items vencidos o acumulación de vencimientos.
Planner puede crear Task: Limpiar heladera.
Estado: future / a revisión.
```

### Caso 5 — Revisar vencimientos

```txt
Inventory detecta items por vencer.
Puede generar Notification.
Post-MVP puede generar Task: Revisar vencimientos.
```

### Caso 6 — Compras cerca

```txt
Usuario está cerca de supermercado.
Inventory tiene items pendientes.
Geni/Presence sugiere compra.
Puede derivar a Task o notificación contextual.
Estado: avanzado.
```

---

## 15. QA específico Planner ↔ Inventory

### 15.1 QA funcional básico

- [ ] Inventory puede disparar creación de Task de reposición.
- [ ] La Task creada aparece en Planner.
- [ ] La Task aparece en Home si corresponde.
- [ ] La Task usa responsabilidad válida.
- [ ] La Task queda asociada al household correcto.
- [ ] La Task respeta `visibility`.
- [ ] La Task respeta permisos del rol.
- [ ] La Task puede completarse como cualquier otra task.
- [ ] La Task puede cancelarse o eliminarse con soft-delete.
- [ ] La Task no se duplica si el stock bajo se detecta varias veces.

### 15.2 QA de Geni

- [ ] Geni sugiere crear task, no la crea unilateralmente si requiere aprobación.
- [ ] Geni sugiere automatización permanente solo con confirmación.
- [ ] Geni usa tono factual, no acusatorio.
- [ ] Geni no repite la misma sugerencia sin nueva información.

### 15.3 QA de Automatización

- [ ] Trigger `Stock bajo` crea tarea si automation está activa.
- [ ] Automation pausada no crea tarea.
- [ ] Automation archivada no crea tarea.
- [ ] Se registra log/auditoría.
- [ ] Se notifica al responsable si corresponde.

### 15.4 QA realtime

- [ ] Usuario A genera task desde Inventory.
- [ ] Usuario B la ve en Planner/Home.
- [ ] Completar la task en un dispositivo actualiza el otro.

### 15.5 QA offline

- [ ] Crear task derivada de Inventory offline se encola.
- [ ] Al reconectar se crea una sola task.
- [ ] Si otro usuario ya repuso el item, se resuelve conflicto.
- [ ] Queda auditado el conflicto.

---

## 16. Decisiones pendientes

1. ¿Inventory crea Task directamente o siempre mediante Automation/Geni?
2. ¿La Task representa un item o una lista de compras completa?
3. ¿Cómo se evita duplicar tareas por el mismo stock bajo?
4. ¿Qué responsabilidad se usa por default: `Compras` o `General`?
5. ¿Quién recibe la tarea si nadie está asignado a Compras?
6. ¿Medicamentos vencidos generan Notification, Task o ambas?
7. ¿Las tareas de inventario requieren verificación?
8. ¿Debe existir link directo desde Task hacia InventoryItem?
9. ¿Debe crearse tabla `planner_task_sources`?
10. ¿Qué roles pueden configurar automatizaciones de stock bajo?
11. ¿Qué parte aparece en MVP real y qué parte queda como mock premium?

---

## 17. Recomendación de implementación por fases

### Fase 1 — MVP seguro

- No implementar Inventory real completo.
- Crear solo Tasks reales manuales en Planner.
- Mostrar integración Inventory como mock/premium si hace falta.
- No agregar tablas nuevas sin decisión.

### Fase 2 — Integración mínima real

- Crear responsabilidad `Compras`.
- Permitir crear Task desde un item de Inventory.
- Guardar origen simple (`origin_module`, `origin_entity_id`) o tabla puente.
- Mostrar badge `Inventario` en Task.
- Evitar duplicados por item + motivo + status activo.

### Fase 3 — Automatización

- Implementar trigger `Stock bajo`.
- Crear Automation configurable.
- Requerir aprobación del Coordinador.
- Agregar audit log.
- Agregar notificaciones.

### Fase 4 — Inteligencia contextual

- Geni detecta patrones.
- Geni sugiere automatizaciones.
- ComprasCerca usa ubicación + items pendientes.
- Home muestra insights de inventario accionables.

---

## 18. Conclusión

La relación Planner ↔ Inventory debe entenderse como una integración operativa:

```txt
Inventory detecta necesidades.
Planner las convierte en tareas ejecutables.
Home las resume.
Geni las explica o sugiere.
Automations las repiten bajo reglas.
Realtime/Offline/Audit garantizan consistencia.
```

Para el MVP actual de HomePlus, esta integración conviene mantenerla como **future/post-MVP o mock premium**, salvo que se decida implementar un flujo mínimo real de `Stock bajo → Task`.
