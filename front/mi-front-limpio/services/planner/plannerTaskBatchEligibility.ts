/**
 * Planner Tasks Patch 3 — Batch eligibility engine (puro, sin React Native).
 *
 * Regla: Selection != Eligibility. Cualquier Task del result set puede
 * seleccionarse; cada acción calcula después su subset elegible.
 *
 * Prioridad de derivación (sin duplicar dominio manualmente):
 * 1. `availableActions` / helpers CURRENT cuando la señal existe;
 * 2. capabilities canónicas;
 * 3. estado/datos explícitos necesarios;
 * 4. backend como autoridad final (el coordinator reporta forbidden/invalid).
 *
 * IMPORTANTE (decisión explícita Patch 3): assignment NO se deriva de edit.
 * `task.assign_self` cubre auto-asignación (target = solo yo);
 * `task.assign_members` cubre asignar a otros o vaciar responsables.
 * El backend revalida cada mutación (autoridad final).
 */

export type BatchAction =
  | 'date'
  | 'time'
  | 'assignees'
  | 'priority'
  | 'plan'
  | 'complete'
  | 'cancel'
  | 'reactivate'
  | 'trash';

export type BatchSetAction = 'date' | 'time' | 'assignees' | 'priority' | 'plan';
export type BatchTransitionAction = 'complete' | 'cancel' | 'reactivate' | 'trash';

export type BatchIneligibilityReason =
  | 'trashed'
  | 'evidence_required'
  | 'pending_steps'
  | 'incompatible_state'
  | 'missing_permission'
  | 'missing_date'
  | 'individual_flow_required';

export const BATCH_REASON_LABELS: Record<BatchIneligibilityReason, string> = {
  trashed: 'en papelera',
  evidence_required: 'requieren evidencia',
  pending_steps: 'tienen pasos pendientes',
  incompatible_state: 'estado incompatible',
  missing_permission: 'sin permiso',
  missing_date: 'sin fecha',
  individual_flow_required: 'requieren revisión individual',
};

/** Vista estructural mínima que el engine necesita de una Task. */
export type BatchTaskView = {
  id: string;
  status: string;
  version: number;
  requires_verification?: boolean | null;
  checklist?: Array<{ text: string; checked: boolean }> | null;
  trashed_at?: string | null;
  availableActions?: Array<{ action: string; fulfillmentId?: string | null; disabledReason?: string | null }> | null;
  assigned_to_member_id?: string | null;
  created_by_member_id?: string | null;
  due_date?: string | null;
};

export type BatchCapabilityProjection = Record<string, boolean> | null | undefined;

export type BatchEligibilityContext = {
  capabilities: BatchCapabilityProjection;
  /** Membership id del actor actual (para assign_self / complete_assigned / edit_own). */
  myMembershipId: string;
  /**
   * Target de un REPLACE de responsables. Solo se usa para `assignees`:
   * - `[]` (vaciar) o ids distintos de mí → requiere `task.assign_members`.
   * - `[miId]` exclusivamente → basta `task.assign_self`.
   */
  targetMemberIds?: string[];
};

export type BatchEligibility = { eligible: boolean; reasons: BatchIneligibilityReason[] };

const hasCap = (capabilities: BatchCapabilityProjection, capability: string): boolean =>
  Boolean(capabilities && capabilities[capability] === true);

const isTrashed = (task: BatchTaskView): boolean => Boolean(task.trashed_at);

const hasPendingSteps = (task: BatchTaskView): boolean =>
  Array.isArray(task.checklist) && task.checklist.some((step) => !step.checked);

/**
 * Señal CURRENT prioritaria: si `availableActions` está presente (array no
 * vacío), la presencia de la key —sin `disabledReason`— es la palabra del
 * backend sobre permiso+estado para esa acción. La ausencia de la key en un
 * vocabulario que no la contempla NO condena: se cae a capabilities+estado.
 */
const announcesAction = (task: BatchTaskView, actionKey: string): boolean | null => {
  if (!Array.isArray(task.availableActions) || task.availableActions.length === 0) return null;
  return task.availableActions.some((entry) => entry.action === actionKey && !entry.disabledReason);
};

const isOwner = (task: BatchTaskView, myMembershipId: string): boolean =>
  Boolean(task.created_by_member_id) && task.created_by_member_id === myMembershipId;

const hasEditCap = (task: BatchTaskView, ctx: BatchEligibilityContext): boolean =>
  isOwner(task, ctx.myMembershipId)
    ? hasCap(ctx.capabilities, 'task.edit_own')
    : hasCap(ctx.capabilities, 'task.edit_any');

const hasCompleteCap = (task: BatchTaskView, ctx: BatchEligibilityContext): boolean => {
  if (task.assigned_to_member_id === ctx.myMembershipId) return hasCap(ctx.capabilities, 'task.complete_assigned');
  if (!task.assigned_to_member_id) {
    return hasCap(ctx.capabilities, 'task.complete_unassigned') || hasCap(ctx.capabilities, 'task.complete_any');
  }
  return hasCap(ctx.capabilities, 'task.complete_any');
};

const hasCancelCap = (task: BatchTaskView, ctx: BatchEligibilityContext): boolean =>
  isOwner(task, ctx.myMembershipId)
    ? hasCap(ctx.capabilities, 'task.cancel_own')
    : hasCap(ctx.capabilities, 'task.cancel_any');

/**
 * Assignment respeta capabilities reales de assignment (Patch 3 §5):
 * target solo-yo → `task.assign_self`; cualquier otro target (incluido
 * vaciar) → `task.assign_members`. Nunca se deriva de edit.
 */
const hasAssignCapForTarget = (ctx: BatchEligibilityContext): { ok: boolean } => {
  const target = ctx.targetMemberIds ?? [];
  const selfOnly = target.length === 1 && target[0] === ctx.myMembershipId;
  if (selfOnly) return { ok: hasCap(ctx.capabilities, 'task.assign_self') };
  return { ok: hasCap(ctx.capabilities, 'task.assign_members') };
};

const OPERATIONAL_STATUSES = new Set(['pending']);

/**
 * Product Truth Patch 3 §13 (correctiva, reemplaza S-03/S-04 históricas):
 * Fecha/hora, Responsables, Prioridad y Plan solo sobre Tasks operativas
 * cuyo significado todavía puede modificarse con seguridad = pending normal.
 * - awaiting_verification / Evidence activa → NO propiedades batch.
 * - correction requested / reenvío pendiente → NO propiedades batch.
 * - completed / verified → NO propiedades batch.
 * - cancelled → NO propiedades batch.
 * - trashed → fuera de esta superficie.
 * Los estados se derivan de campos/fulfillment/availableActions CURRENT;
 * no se inventa ningún `task.status` ficticio.
 */
const checkSetGuard = (task: BatchTaskView, ctx: BatchEligibilityContext): BatchEligibility => {
  const reasons: BatchIneligibilityReason[] = [];
  if (isTrashed(task)) reasons.push('trashed');
  if (task.status === 'awaiting_verification') {
    reasons.push('individual_flow_required');
  } else if (task.status === 'correction_requested') {
    reasons.push('individual_flow_required');
  } else if (task.status !== 'pending') {
    reasons.push('incompatible_state');
  } else if (!OPERATIONAL_STATUSES.has(task.status)) {
    reasons.push('incompatible_state');
  }
  if (!hasEditCap(task, ctx)) reasons.push('missing_permission');
  return { eligible: reasons.length === 0, reasons };
};

export const canBatchDate = (task: BatchTaskView, ctx: BatchEligibilityContext): BatchEligibility =>
  checkSetGuard(task, ctx);

export const canBatchPriority = (task: BatchTaskView, ctx: BatchEligibilityContext): BatchEligibility =>
  checkSetGuard(task, ctx);

export const canBatchPlan = (task: BatchTaskView, ctx: BatchEligibilityContext): BatchEligibility =>
  checkSetGuard(task, ctx);

export const canBatchTime = (task: BatchTaskView, ctx: BatchEligibilityContext): BatchEligibility => {
  const base = checkSetGuard(task, ctx);
  if (!task.due_date) return { eligible: false, reasons: [...base.reasons, 'missing_date'] };
  return base;
};

export const canBatchAssignees = (task: BatchTaskView, ctx: BatchEligibilityContext): BatchEligibility => {
  const reasons: BatchIneligibilityReason[] = [];
  if (isTrashed(task)) reasons.push('trashed');
  if (task.status === 'awaiting_verification' || task.status === 'correction_requested') {
    reasons.push('individual_flow_required');
  } else if (task.status !== 'pending') {
    reasons.push('incompatible_state');
  }
  if (!hasAssignCapForTarget(ctx).ok) reasons.push('missing_permission');
  return { eligible: reasons.length === 0, reasons };
};

export const canBatchComplete = (task: BatchTaskView, ctx: BatchEligibilityContext): BatchEligibility => {
  const reasons: BatchIneligibilityReason[] = [];
  if (isTrashed(task)) {
    reasons.push('trashed');
    return { eligible: false, reasons };
  }
  // Guard CURRENT que requiere flujo individual: nunca batch de evidencia ni
  // Approve / Request Change. `submit_for_verification` anunciado = evidencia.
  const announcedComplete = announcesAction(task, 'complete');
  const announcedSubmit = announcesAction(task, 'submit_for_verification');
  if (task.requires_verification || announcedSubmit === true) reasons.push('evidence_required');
  if (task.status !== 'pending') reasons.push('incompatible_state');
  if (hasPendingSteps(task)) reasons.push('pending_steps');
  if (announcedComplete === true) {
    // El backend ya autorizó complete para esta Task: permiso OK.
  } else if (announcedComplete === false && announcedSubmit !== true) {
    // Vocabulario presente pero sin `complete`: el backend no la ofrece.
    reasons.push('incompatible_state');
  } else if (!hasCompleteCap(task, ctx)) {
    reasons.push('missing_permission');
  }
  if (task.status === 'awaiting_verification' || task.status === 'correction_requested') {
    if (!reasons.includes('individual_flow_required')) reasons.push('individual_flow_required');
  }
  return { eligible: reasons.length === 0, reasons: [...new Set(reasons)] };
};

export const canBatchCancel = (task: BatchTaskView, ctx: BatchEligibilityContext): BatchEligibility => {
  const reasons: BatchIneligibilityReason[] = [];
  if (isTrashed(task)) reasons.push('trashed');
  if (task.status !== 'pending') reasons.push('incompatible_state');
  const announced = announcesAction(task, 'cancel');
  if (announced !== true && !hasCancelCap(task, ctx)) reasons.push('missing_permission');
  return { eligible: reasons.length === 0, reasons };
};

export const canBatchReactivate = (task: BatchTaskView, ctx: BatchEligibilityContext): BatchEligibility => {
  const reasons: BatchIneligibilityReason[] = [];
  if (isTrashed(task)) reasons.push('trashed');
  if (task.status !== 'cancelled') reasons.push('incompatible_state');
  const announced = announcesAction(task, 'reactivate');
  if (announced !== true && !hasCancelCap(task, ctx)) reasons.push('missing_permission');
  return { eligible: reasons.length === 0, reasons };
};

export const canBatchTrash = (task: BatchTaskView, ctx: BatchEligibilityContext): BatchEligibility => {
  const reasons: BatchIneligibilityReason[] = [];
  if (isTrashed(task)) {
    reasons.push('trashed');
    return { eligible: false, reasons };
  }
  // Patch 3 §24: el trash batch nunca es bypass del lifecycle de Evidence.
  // awaiting verification / correction activa → NO batch.
  if (task.status === 'awaiting_verification' || task.status === 'correction_requested') {
    reasons.push('individual_flow_required');
    return { eligible: false, reasons };
  }
  if (!hasCap(ctx.capabilities, 'task.restore')) reasons.push('missing_permission');
  return { eligible: reasons.length === 0, reasons };
};

const CHECKERS: Record<BatchAction, (task: BatchTaskView, ctx: BatchEligibilityContext) => BatchEligibility> = {
  date: canBatchDate,
  time: canBatchTime,
  assignees: canBatchAssignees,
  priority: canBatchPriority,
  plan: canBatchPlan,
  complete: canBatchComplete,
  cancel: canBatchCancel,
  reactivate: canBatchReactivate,
  trash: canBatchTrash,
};

export type BatchPartition = {
  action: BatchAction;
  eligible: BatchTaskView[];
  ineligible: Array<{ task: BatchTaskView; reasons: BatchIneligibilityReason[] }>;
};

/** Particiona la selección: Selection != Eligibility. */
export const partitionBatchSelection = (
  action: BatchAction,
  selectedTasks: BatchTaskView[],
  ctx: BatchEligibilityContext,
): BatchPartition => {
  const check = CHECKERS[action];
  const eligible: BatchTaskView[] = [];
  const ineligible: BatchPartition['ineligible'] = [];
  selectedTasks.forEach((task) => {
    const result = check(task, ctx);
    if (result.eligible) eligible.push(task);
    else ineligible.push({ task, reasons: result.reasons });
  });
  return { action, eligible, ineligible };
};

export type BatchReasonSummary = { reason: BatchIneligibilityReason; count: number; label: string };

/** Agrupa razones para el resumen parcial: `2 requieren evidencia`. */
export const summarizeIneligibility = (ineligible: BatchPartition['ineligible']): BatchReasonSummary[] => {
  const counts = new Map<BatchIneligibilityReason, number>();
  ineligible.forEach(({ reasons }) => {
    new Set(reasons).forEach((reason) => counts.set(reason, (counts.get(reason) ?? 0) + 1));
  });
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count, label: BATCH_REASON_LABELS[reason] }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
};

/**
 * Reconciliación: `selectedIds = selectedIds ∩ currentFilteredTaskIds`.
 * Preserva el orden del result set actual. IDs invisibles no se conservan.
 */
export const reconcileSelectedIds = (selectedIds: readonly string[], currentFilteredIds: readonly string[]): string[] => {
  const selected = new Set(selectedIds);
  return currentFilteredIds.filter((id) => selected.has(id));
};
