'use strict';

/**
 * Plan DTO — pure projection from a `planner_goals` row to the canonical Plan
 * contract consumed by the frontend.
 *
 * Kept dependency-free on purpose: this is the single authority for the Plan
 * shape, so it must be assertable without a database, a Supabase config or any
 * request context.
 *
 * Authority: PLANS_TECHNICAL_TRUTH_V1 §1.1 (`planner_goals` is the only Plan
 * root), §2.1 (`visibility` is the persisted scope), §4 (lifecycle), §5
 * (archive is not lifecycle), §6 (trash is orthogonal).
 */

/** Contract keys projected by {@link toPlanDto}, in projection order. */
const PLAN_DTO_FIELDS = Object.freeze([
  'id',
  'title',
  'description',
  'scope',
  'targetDate',
  'lifecycle',
  'archivedAt',
  'trashedAt',
  'createdAt',
  'updatedAt',
  'version',
  'progress',
  'availableActions',
]);

/**
 * SINGLE canonical Plan action authority (overnight frozen Product Truth
 * §§22-25). The frontend consumes this list; no other lifecycle map may
 * decide which actions a Plan exposes.
 *
 * Product vocabulary (matches the transition edge names):
 *   preparation → edit, activate, archive, trash (NO cancel)
 *   active      → edit, pause, complete, cancel, archive, trash
 *   paused      → edit, resume, complete, cancel, archive, trash
 *   completed   → reopen, archive/unarchive, trash
 *   cancelled   → reopen, archive/unarchive, trash
 * Archive is orthogonal (archive ⇄ unarchive, lifecycle preserved).
 * A trashed Plan is inert: restore only.
 */
const getPlanAvailableActions = (goal, permissions = null) => {
  if (!goal) return [];
  if (goal.trashed_at) return ['restore'];
  const archived = goal.archived_at !== null && goal.archived_at !== undefined;
  const archiveAction = archived ? 'unarchive' : 'archive';
  let lifecycleActions;
  switch (goal.lifecycle) {
    case 'preparation':
      lifecycleActions = ['edit', 'activate', archiveAction, 'trash']; break;
    case 'active':
      lifecycleActions = ['edit', 'pause', 'complete', 'cancel', archiveAction, 'trash']; break;
    case 'paused':
      lifecycleActions = ['edit', 'resume', 'complete', 'cancel', archiveAction, 'trash']; break;
    case 'completed':
    case 'cancelled':
      lifecycleActions = ['reopen', archiveAction, 'trash']; break;
    default:
      return [];
  }
  if (!permissions) return lifecycleActions;
  const allowed = {
    edit: permissions.edit,
    activate: permissions.edit,
    pause: permissions.edit,
    resume: permissions.edit,
    complete: permissions.complete,
    cancel: permissions.close,
    reopen: permissions.close,
    archive: permissions.archive,
    unarchive: permissions.archive,
    trash: permissions.trash,
  };
  return lifecycleActions.filter((action) => allowed[action] === true);
};

/**
 * @param {Record<string, any>} goal `planner_goals` row.
 * @param {Array<Record<string, any>>} [milestones] legacy `planner_goal_milestones`
 * rows. Accepted for call-site compatibility; Milestones are NOT Plan V1
 * components (frozen §20) and are therefore never projected into the DTO.
 */
const toPlanDto = (goal, milestones, permissions = null) => {
  // Milestones are NOT Plan V1 components (frozen §20): the argument is kept
  // for call-site compatibility and intentionally not projected.
  void milestones;
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    scope: goal.visibility,
    targetDate: goal.target_date ?? goal.ends_at,
    lifecycle: goal.lifecycle,
    archivedAt: goal.archived_at,
    trashedAt: goal.trashed_at,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at,
    version: goal.version,
    // Percentages and milestones are legacy compatibility fields, not Plan V1
    // progress authority. The aggregate factual projection is supplied by the
    // Plan readiness endpoint when available.
    progress: undefined,
    availableActions: getPlanAvailableActions(goal, permissions),
  };
};

module.exports = {
  PLAN_DTO_FIELDS,
  getPlanAvailableActions,
  toPlanDto,
};
