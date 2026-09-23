'use strict';

const { createHttpError } = require('../lib/httpErrors');
const { assertExpectedVersion } = require('../lib/versionHelpers');
const {
  requireMutationId,
  parseRequiredExpectedVersion,
} = require('../lib/plannerMutationContracts');
const {
  requireIdempotencyKey,
  hashIdempotencyRequest,
  withIdempotency,
} = require('../lib/plannerIdempotencyAdapter');
const { getPlannerContext } = require('../services/planner.context.service');
const { resolveCapabilities, assertCapability } = require('../lib/plannerCapabilities');
const {
  pickGoalActivityState,
  recordPlannerActivity,
} = require('./planner.activity.service');

const PLAN_LIFECYCLE_VALUES = [
  'preparation',
  'active',
  'paused',
  'completed',
  'cancelled',
];

const PLAN_LIFECYCLE_TRANSITIONS = {
  preparation: ['active', 'cancelled'],
  active: ['paused', 'completed', 'cancelled'],
  paused: ['active', 'completed', 'cancelled'],
  completed: ['reopen', 'archive'],
  cancelled: ['reopen', 'archive'],
};

const PLAN_SCOPE_VALUES = ['personal', 'household'];

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);

const throwSupabaseError = (error) => {
  const isRlsViolation =
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    (typeof error.message === 'string' && error.message.toLowerCase().includes('row-level security'));

  if (isRlsViolation) {
    throw createHttpError(403, 'No tenes permiso para realizar esta accion sobre planes.', 'rls_violation');
  }

  const httpError = createHttpError(500, error.message, error.code ?? 'internal_error');
  httpError.details = error.details;
  httpError.hint = error.hint;
  throw httpError;
};

const isValidDateOnly = (value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));

const parseLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100;
  }
  return Math.min(parsed, 100);
};

const isTrueQuery = (value) => value === true || value === 'true' || value === '1';

const validateLifecycle = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'preparation';
  }
  if (!PLAN_LIFECYCLE_VALUES.includes(value)) {
    throw createHttpError(400, 'lifecycle invalido.', 'invalid_lifecycle');
  }
  return value;
};

const validateScope = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'household';
  }
  if (!PLAN_SCOPE_VALUES.includes(value)) {
    throw createHttpError(400, 'scope invalido.', 'invalid_scope');
  }
  return value;
};

const validateNullableDate = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (!isValidDateOnly(value)) {
    throw createHttpError(400, `${fieldName} invalido.`, 'validation_error');
  }
  return value;
};

const validateLifecycleTransition = (fromLifecycle, toLifecycle) => {
  if (!hasOwn(PLAN_LIFECYCLE_TRANSITIONS, fromLifecycle)) {
    throw createHttpError(400, 'Lifecycle origen invalido.', 'invalid_lifecycle');
  }
  const allowed = PLAN_LIFECYCLE_TRANSITIONS[fromLifecycle];
  if (!allowed.includes(toLifecycle)) {
    throw createHttpError(409, 'Transicion de lifecycle invalida.', 'invalid_lifecycle_transition');
  }
};

const toPlanDto = (goal, milestones) => {
  const progress = goal.progress_percentage ?? null;
  const tasksTotal = goal.tasks_total ?? null;
  const tasksCompleted = goal.tasks_completed ?? null;
  const tasksPending = goal.tasks_pending ?? null;
  const milestonesTotal = goal.milestones_total ?? (milestones?.length ?? 0);
  const milestonesCompleted = goal.milestones_completed ?? (milestones?.filter(m => m.achieved).length ?? 0);

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
    progress: progress !== null ? {
      percentage: progress,
      tasks: tasksTotal !== null ? { total: tasksTotal, completed: tasksCompleted, pending: tasksPending } : undefined,
      milestones: milestonesTotal !== null ? { total: milestonesTotal, completed: milestonesCompleted } : undefined,
    } : undefined,
  };
};

const getPlanOrThrow = async (client, householdId, planId) => {
  const { data, error } = await client
    .from('planner_goals')
    .select('*')
    .eq('id', planId)
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .is('trashed_at', null)
    .maybeSingle();

  if (error) {
    throwSupabaseError(error);
  }
  if (!data) {
    throw createHttpError(404, 'Plan no encontrado.', 'plan_not_found');
  }
  return data;
};

const getPlanForTrashOperation = async (client, householdId, planId) => {
  const { data, error } = await client
    .from('planner_goals')
    .select('*')
    .eq('id', planId)
    .eq('household_id', householdId)
    .maybeSingle();

  if (error) {
    throwSupabaseError(error);
  }
  if (!data) {
    throw createHttpError(404, 'Plan no encontrado.', 'plan_not_found');
  }
  return data;
};

const getMilestones = async (client, planId) => {
  const { data, error } = await client
    .from('planner_goal_milestones')
    .select('*')
    .eq('goal_id', planId)
    .is('deleted_at', null)
    .is('trashed_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throwSupabaseError(error);
  }
  return data ?? [];
};

const listPlans = async (context, query) => {
  const limit = parseLimit(query.limit);
  let request = context.client
    .from('planner_goals')
    .select('*')
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .is('trashed_at', null);

  if (query.lifecycle) {
    request = request.eq('lifecycle', query.lifecycle);
  }
  if (query.scope) {
    request = request.eq('visibility', query.scope);
  }
  if (isTrueQuery(query.only_mine)) {
    request = request.eq('created_by_member_id', context.membershipId);
  }
  if (query.archived === 'true') {
    request = request.not('archived_at', 'is', null);
  } else if (query.archived === 'false') {
    request = request.is('archived_at', null);
  }

  const { data, error } = await request.limit(500);

  if (error) {
    throwSupabaseError(error);
  }

  const sliced = (data ?? []).slice(0, limit);
  const plansWithMilestones = await Promise.all(
    sliced.map(async (goal) => {
      const milestones = await getMilestones(context.client, goal.id);
      return toPlanDto(goal, milestones);
    })
  );

  return { plans: plansWithMilestones };
};

const getPlanById = async (context, planId) => {
  const goal = await getPlanOrThrow(context.client, context.householdId, planId);
  const milestones = await getMilestones(context.client, planId);
  return { plan: toPlanDto(goal, milestones), milestones };
};

const createPlan = async (context, body) => {
  const title = normalizeString(body?.title);
  if (!title) {
    throw createHttpError(400, 'title es obligatorio.', 'validation_error');
  }

  const scope = validateScope(body?.scope);
  const isPersonal = scope === 'personal';
  const requiredCap = isPersonal ? 'goal.create_personal' : 'goal.create_household';

  const capabilities = resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
  assertCapability(capabilities, requiredCap);

  const payload = {
    household_id: context.householdId,
    title,
    description: hasOwn(body, 'description') ? normalizeString(body.description) || null : null,
    visibility: scope,
    category: 'home',
    progress_mode: 'none',
    target_type: null,
    target_value: null,
    current_value: 0,
    unit: null,
    starts_at: null,
    ends_at: validateNullableDate(body?.targetDate, 'targetDate'),
    target_date: validateNullableDate(body?.targetDate, 'targetDate'),
    created_by_member_id: context.membershipId,
    status: 'active',
    lifecycle: 'preparation',
  };

  const { data, error } = await context.client
    .from('planner_goals')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throwSupabaseError(error);
  }

  recordPlannerActivity(context, {
    entityType: 'goal',
    entityId: data.id,
    action: 'goal.created',
    previousState: null,
    nextState: pickGoalActivityState(data),
  }).catch(() => {});

  const milestones = [];
  return { plan: toPlanDto(data, milestones) };
};

const buildPlanPatch = async (context, body, existingPlan) => {
  const patch = {};

  if (hasOwn(body, 'title')) {
    const title = normalizeString(body.title);
    if (!title) {
      throw createHttpError(400, 'title no puede estar vacio.', 'validation_error');
    }
    patch.title = title;
  }

  if (hasOwn(body, 'description')) {
    patch.description = normalizeString(body.description) || null;
  }

  if (hasOwn(body, 'scope')) {
    const scope = validateScope(body.scope);
    if (scope !== existingPlan.visibility) {
      throw createHttpError(400, 'No se puede cambiar el scope de un Plan existente.', 'invalid_scope_change');
    }
  }

  if (hasOwn(body, 'targetDate')) {
    const targetDate = validateNullableDate(body.targetDate, 'targetDate');
    patch.target_date = targetDate;
    patch.ends_at = targetDate;
  }

  if (hasOwn(body, 'lifecycle')) {
    throw createHttpError(400, 'lifecycle no se modifica con PATCH. Usa las transiciones dedicadas.', 'validation_error');
  }

  return patch;
};

const updatePlan = async (context, planId, body, expectedVersion) => {
  const existing = await getPlanOrThrow(context.client, context.householdId, planId);
  assertExpectedVersion(existing.version, expectedVersion);

  const capabilities = resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
  assertCapability(capabilities, 'goal.edit_own');

  const patch = await buildPlanPatch(context, body ?? {}, existing);

  if (Object.keys(patch).length === 0) {
    const milestones = await getMilestones(context.client, planId);
    return { plan: toPlanDto(existing, milestones) };
  }

  const previousState = pickGoalActivityState(existing);

  const query = context.client
    .from('planner_goals')
    .update(patch)
    .eq('id', planId)
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .is('trashed_at', null);

  if (expectedVersion !== null && expectedVersion !== undefined) {
    query.eq('version', expectedVersion);
  }

  const { data, error } = await query.select('*').maybeSingle();

  if (error) {
    throwSupabaseError(error);
  }
  if (!data) {
    if (expectedVersion !== null && expectedVersion !== undefined) {
      throw createHttpError(409, 'Este Plan cambio en otro dispositivo. Actualiza y volve a intentar.', 'version_conflict');
    }
    throw createHttpError(404, 'Plan no encontrado.', 'plan_not_found');
  }

  recordPlannerActivity(context, {
    entityType: 'goal',
    entityId: data.id,
    action: 'goal.updated',
    previousState,
    nextState: pickGoalActivityState(data),
  }).catch(() => {});

  const milestones = await getMilestones(context.client, planId);
  return { plan: toPlanDto(data, milestones) };
};

const transitionPlan = async (context, planId, expectedVersion, transition, extraFields = {}) => {
  const goal = await getPlanOrThrow(context.client, context.householdId, planId);
  assertExpectedVersion(goal.version, expectedVersion);

  const currentLifecycle = goal.lifecycle;
  validateLifecycleTransition(currentLifecycle, transition);

  const capabilities = resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });

  const isOwner = goal.created_by_member_id === context.membershipId;
  let requiredCap;
  switch (transition) {
    case 'active':
    case 'resume':
      requiredCap = 'goal.edit_own';
      break;
    case 'paused':
      requiredCap = 'goal.edit_own';
      break;
    case 'completed':
      requiredCap = isOwner ? 'goal.complete_own' : 'goal.complete_any';
      break;
    case 'cancelled':
      requiredCap = isOwner ? 'goal.close_own' : 'goal.close_any';
      break;
    case 'reopen':
      requiredCap = isOwner ? 'goal.close_own' : 'goal.close_any';
      break;
    case 'archive':
      requiredCap = 'goal.archive';
      break;
    default:
      requiredCap = 'goal.edit_own';
  }
  assertCapability(capabilities, requiredCap);

  const previousState = pickGoalActivityState(goal);

  const now = new Date().toISOString();
  const updateFields = { ...extraFields };

  switch (transition) {
    case 'active':
      updateFields.lifecycle = 'active';
      updateFields.status = 'active';
      break;
    case 'paused':
      updateFields.lifecycle = 'paused';
      break;
    case 'completed':
      updateFields.lifecycle = 'completed';
      updateFields.status = 'completed';
      updateFields.completed_at = now;
      break;
    case 'cancelled':
      updateFields.lifecycle = 'cancelled';
      updateFields.status = 'closed';
      updateFields.closed_at = now;
      updateFields.closed_reason = extraFields.closedReason ?? null;
      break;
    case 'reopen':
      updateFields.lifecycle = 'active';
      updateFields.status = 'active';
      updateFields.closed_at = null;
      updateFields.closed_reason = null;
      updateFields.completed_at = null;
      break;
    case 'archive':
      if (!['completed', 'cancelled'].includes(currentLifecycle)) {
        throw createHttpError(409, 'Solo se pueden archivar planes completados o cancelados.', 'invalid_archive_transition');
      }
      updateFields.archived_at = now;
      break;
  }

  const query = context.client
    .from('planner_goals')
    .update(updateFields)
    .eq('id', planId)
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .is('trashed_at', null);

  if (expectedVersion !== null && expectedVersion !== undefined) {
    query.eq('version', expectedVersion);
  }

  const { data, error } = await query.select('*').maybeSingle();

  if (error) {
    throwSupabaseError(error);
  }
  if (!data) {
    if (expectedVersion !== null && expectedVersion !== undefined) {
      throw createHttpError(409, 'Este Plan cambio en otro dispositivo. Actualiza y volve a intentar.', 'version_conflict');
    }
    throw createHttpError(404, 'Plan no encontrado.', 'plan_not_found');
  }

  const actionMap = {
    active: 'goal.activated',
    paused: 'goal.paused',
    completed: 'goal.completed',
    cancelled: 'goal.closed',
    reopen: 'goal.reopened',
    archive: 'goal.archived',
  };

  recordPlannerActivity(context, {
    entityType: 'goal',
    entityId: data.id,
    action: actionMap[transition] ?? 'goal.updated',
    previousState,
    nextState: pickGoalActivityState(data),
    metadata: extraFields.closedReason ? { closed_reason: extraFields.closedReason } : null,
  }).catch(() => {});

  const milestones = await getMilestones(context.client, planId);
  return { plan: toPlanDto(data, milestones) };
};

const trashPlan = async (context, planId, expectedVersion) => {
  const existing = await getPlanForTrashOperation(context.client, context.householdId, planId);
  assertExpectedVersion(existing.version, expectedVersion);

  if (existing.trashed_at !== null) {
    const milestones = await getMilestones(context.client, planId);
    return { plan: toPlanDto(existing, milestones) };
  }

  const capabilities = resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
  assertCapability(capabilities, 'goal.restore');

  const previousState = pickGoalActivityState(existing);

  const query = context.client
    .from('planner_goals')
    .update({
      trashed_at: new Date().toISOString(),
      trashed_by_member_id: context.membershipId,
    })
    .eq('id', planId)
    .eq('household_id', context.householdId);

  if (expectedVersion !== null && expectedVersion !== undefined) {
    query.eq('version', expectedVersion);
  }

  const { data, error } = await query.select('*').maybeSingle();

  if (error) {
    throwSupabaseError(error);
  }
  if (!data) {
    if (expectedVersion !== null && expectedVersion !== undefined) {
      throw createHttpError(409, 'Este Plan cambio en otro dispositivo. Actualiza y volve a intentar.', 'version_conflict');
    }
    throw createHttpError(404, 'Plan no encontrado.', 'plan_not_found');
  }

  recordPlannerActivity(context, {
    entityType: 'goal',
    entityId: data.id,
    action: 'goal.trashed',
    previousState,
    nextState: pickGoalActivityState(data),
  }).catch(() => {});

  const milestones = await getMilestones(context.client, planId);
  return { plan: toPlanDto(data, milestones) };
};

const restorePlan = async (context, planId, expectedVersion) => {
  const { data: result, error: rpcError } = await context.client.rpc(
    'restore_goal_rpc',
    {
      p_goal_id: planId,
      p_expected_version: expectedVersion ?? null,
    }
  );

  if (rpcError) {
    if (rpcError.code === '42501') {
      throw createHttpError(403, 'No tenes permiso para realizar esta accion sobre planes.', 'rls_violation');
    }
    if (rpcError.code === '40007') {
      throw createHttpError(409, 'Este Plan cambio en otro dispositivo. Actualiza y volve a intentar.', 'version_conflict');
    }
    throwSupabaseError(rpcError);
  }

  if (!result || result.success === false) {
    if (result?.error === 'goal_not_found') {
      throw createHttpError(404, 'Plan no encontrado.', 'plan_not_found');
    }
    throw createHttpError(404, 'Plan no encontrado.', 'plan_not_found');
  }

  if (result.already_restored) {
    const { data: goal, error: fetchError } = await context.client
      .from('planner_goals')
      .select('*')
      .eq('id', planId)
      .eq('household_id', context.householdId)
      .maybeSingle();
    if (fetchError) {
      throwSupabaseError(fetchError);
    }
    const milestones = await getMilestones(context.client, planId);
    return { plan: toPlanDto(goal, milestones) };
  }

  const { data: goal, error: fetchError } = await context.client
    .from('planner_goals')
    .select('*')
    .eq('id', planId)
    .eq('household_id', context.householdId)
    .maybeSingle();

  if (fetchError) {
    throwSupabaseError(fetchError);
  }

  recordPlannerActivity(context, {
    entityType: 'goal',
    entityId: planId,
    action: 'goal.restored',
    previousState: null,
    nextState: pickGoalActivityState(goal),
  }).catch(() => {});

  const milestones = await getMilestones(context.client, planId);
  return { plan: toPlanDto(goal, milestones) };
};

const unarchivePlan = async (context, planId, expectedVersion) => {
  const goal = await getPlanOrThrow(context.client, context.householdId, planId);
  assertExpectedVersion(goal.version, expectedVersion);

  if (goal.archived_at === null) {
    const milestones = await getMilestones(context.client, planId);
    return { plan: toPlanDto(goal, milestones) };
  }

  if (!['completed', 'cancelled'].includes(goal.lifecycle)) {
    throw createHttpError(409, 'Solo se pueden desarchivar planes completados o cancelados.', 'invalid_unarchive_transition');
  }

  const capabilities = resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
  assertCapability(capabilities, 'goal.archive');

  const previousState = pickGoalActivityState(goal);

  const query = context.client
    .from('planner_goals')
    .update({ archived_at: null })
    .eq('id', planId)
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .is('trashed_at', null);

  if (expectedVersion !== null && expectedVersion !== undefined) {
    query.eq('version', expectedVersion);
  }

  const { data, error } = await query.select('*').maybeSingle();

  if (error) {
    throwSupabaseError(error);
  }
  if (!data) {
    if (expectedVersion !== null && expectedVersion !== undefined) {
      throw createHttpError(409, 'Este Plan cambio en otro dispositivo. Actualiza y volve a intentar.', 'version_conflict');
    }
    throw createHttpError(404, 'Plan no encontrado.', 'plan_not_found');
  }

  recordPlannerActivity(context, {
    entityType: 'goal',
    entityId: data.id,
    action: 'goal.unarchived',
    previousState,
    nextState: pickGoalActivityState(data),
  }).catch(() => {});

  const milestones = await getMilestones(context.client, planId);
  return { plan: toPlanDto(data, milestones) };
};

module.exports = {
  createPlan,
  getPlanById,
  listPlans,
  updatePlan,
  transitionPlan,
  trashPlan,
  restorePlan,
  unarchivePlan,
  toPlanDto,
  getPlanOrThrow,
  getMilestones,
  validateLifecycle,
  validateScope,
  validateLifecycleTransition,
  PLAN_LIFECYCLE_VALUES,
  PLAN_LIFECYCLE_TRANSITIONS,
  PLAN_SCOPE_VALUES,
};
