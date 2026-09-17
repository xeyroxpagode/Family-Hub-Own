# Sprint 3 — Inventory restock task → Home

## Current

- `POST /api/inventory/restock-requests/:request_id/approve` crea una tarea real de Planner con `origin_module: inventory`.
- La creación no asigna `due_date`.
- Después de aprobar, Inventory refresca su propio estado, pero no emite `markPlannerChanged()`.
- Home recibe tareas pendientes desde `/api/planner/summary`, pero sus secciones `Hoy` y `Próximamente` sólo muestran tareas con fecha de hoy o futura. Una tarea sin `due_date` queda fuera de ambas.

## Target obligatorio

`Inventory low stock → crear tarea de reposición → debe aparecer en Home si corresponde por fecha/atención`.

## Real gap

Hay dos contratos sin cerrar:

1. La tarea de reposición no define una fecha que permita ubicarla en `Hoy` o `Próximamente`, ni existe todavía una regla explícita para mostrarla en `Necesita atención` por su origen.
2. El frontend de Inventory no notifica el cambio global de Planner después de aprobar la reposición.

## Entrada mínima para Sprint 3

- Definir si la aprobación exige elegir fecha, usa hoy como fecha explícita o entra en `Necesita atención` por `origin_reason`.
- Emitir el mismo contrato `markPlannerChanged()` usado por Planner después de crear la tarea.
- Mantener la tarea real y su `origin_module/origin_reason`; no simular filas en Home.
- Verificar cambio de Household y evitar que una reposición aparezca en otro hogar.

## QA futuro

1. Generar alerta de stock bajo.
2. Aprobar la creación de tarea.
3. Confirmar la tarea en Planner con origen Inventory.
4. Confirmar su aparición en Home según la política de fecha/atención elegida.
5. Cambiar de Household y comprobar aislamiento.
