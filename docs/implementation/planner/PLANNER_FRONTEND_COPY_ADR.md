# Planner frontend copy ADR

**Status:** Accepted for V0.2
**Date:** 2026-07-13

## References

- `PLANNER_V0_CONTRACT.md` section 13 (Frontend copy contract)
- `PLANNER_V0_GAP_REPORT.md` section 6.1 (V0.2 next patch — small surface changes)

## Decisions

### Entity naming
- Use **Meta / Metas** for goals. Never use *Objetivo / Objetivos*.
- Use **Hito / Hitos** for milestones.
- Use **Tarea / Tareas** for tasks.
- Use **Evento / Eventos** for events.

### Trash / Papelera
- Screen title: **Papelera**.
- Action on a trashed row: **Restaurar**.
- Toast immediately after trashing: **Deshacer** (shown alongside "Movido a la papelera").
- **Restaurar** MUST NOT appear outside the Papelera screen.
- The following are FORBIDDEN in V0:
  - *Eliminar definitivamente*
  - *Vaciar papelera*
  - *Archivar*

### Cancellation / Reactivación
- Use **Cancelar tarea** / **Cancelar evento** ONLY for the lifecycle action that sets status to *cancelled*.
- Use **Reactivar tarea** / **Reactivar evento** for the inverse action (restores from *cancelled* to previous status).
- Use **Cerrar** for native sheet/dismiss buttons. **Cancelar** must NOT be used as a generic close/dismiss label.

### Status labels (canonical Spanish copy)

| Entity | Status | Label |
|--------|--------|-------|
| Tarea | pending | Pendiente |
| Tarea | completed | Completada |
| Tarea | awaiting_verification | En verificación |
| Tarea | verified | Verificada |
| Tarea | cancelled | Cancelada |
| Evento | scheduled | Programado |
| Evento | cancelled | Cancelado |
| Meta | active | Activa |
| Meta | completed | Lograda |
| Meta | closed | Cerrada |
| Hito (achieved) | achieved | Logrado |

### Filter tabs (plural forms, per contract section 13.6)
- Tasks tab for cancelled: **Canceladas**
- Events / calendar filter for cancelled: **Cancelados**

### Action labels
- Task complete: **Completar**
- Task verify: **Verificar**
- Task cancel: **Cancelar tarea**
- Task reactivate: **Reactivar tarea**
- Task move to trash: **Mover a la papelera**
- Event cancel: **Cancelar evento**
- Event reactivate: **Reactivar evento**
- Event move to trash: **Mover a la papelera**
- Goal complete: **Marcar lograda**
- Goal close: **Cerrar meta**
- Goal reopen: **Reabrir meta**
- Goal move to trash: **Mover a la papelera**
- Milestone move to trash: **Mover a la papelera**
- Restore (trash only): **Restaurar**

## Consequences

- Any new Planner screen MUST follow this copy source.
- Any mismatch between implemented UI and this ADR should be treated as a V0 contract regression and fixed in the next patch.
- When adding new status values or entities, update this ADR and `PLANNER_V0_CONTRACT.md` section 13 together.