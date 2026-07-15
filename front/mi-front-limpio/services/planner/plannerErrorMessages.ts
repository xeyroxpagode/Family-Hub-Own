import { registerApiErrorMessages } from '../core/apiErrorCatalog';

export function registerPlannerErrorMessages() {
  registerApiErrorMessages({
    version_conflict: 'Este elemento cambió en otro dispositivo. Actualizá y volvé a intentar.',
    version_conflict_v2: 'La versión de la entidad cambió. Actualizá y reintentá.',
    idempotency_in_flight: 'La operación ya está en curso. Esperá un momento e intentá de nuevo.',
    idempotency_key_conflict: 'Esta operación ya se procesó con otros datos.',
    task_in_trash: 'Esta tarea está en la papelera. Restaurala primero desde Papelera.',
    event_in_trash: 'Este evento está en la papelera. Restauralo primero desde Papelera.',
    parent_goal_in_trash: 'La meta padre está en la papelera. Restaurala primero.',
    planner_forbidden: 'No tenés permiso para realizar esta acción.',
    goal_not_found: 'Meta no encontrada.',
    milestone_not_found: 'Hito no encontrado.',
    invalid_status_transition: 'Transición de estado no permitida.',
    cannot_verify_own_completion: 'No podés verificar tu propia completación.',
    invalid_template_key: 'Tipo de plantilla inválido.',
    invalid_task_priority: 'Prioridad de tarea inválida.',
    invalid_recurrence: 'Recurrencia inválida.',
    invalid_visibility: 'Visibilidad inválida.',
    invalid_category: 'Categoría inválida.',
    incompatible_progress_mode_target_type: 'Modo de progreso incompatible con el tipo de objetivo.',
  });
}
