'use strict';

const { createHttpError, assertUuid } = require('../lib/httpErrors');
const { assertExpectedVersion } = require('../lib/versionHelpers');
const { resolveCapabilities, assertCapability } = require('../lib/plannerCapabilities');
const {
  applyPlanReadScope,
  callPlanWriter,
  resolvePlanWriterTransition,
  unwrapPlanWriterResult,
} = require('../lib/plannerGoalWriteAuthority');
const { toPlanDto } = require('./planner.plans.v1.dto');
const {
  pickGoalActivityState,
  recordPlannerActivity,
} = require('./planner.activity.service');

const WRITER_MESSAGES = {
  forbidden: 'No tenes permiso para realizar esta accion sobre planes.',
  versionConflict: 'Este Plan cambio en otro dispositivo. Actualiza y volve a intentar.',
};

const WRITER_ERRORS = {
  goal_not_found: { status: 404, message: 'Plan no encontrado.', code: 'plan_not_found' },
  invalid_lifecycle_transition: {
    status: 409,
    message: 'Transicion de lifecycle invalida.',
    code: 'invalid_lifecycle_transition',
  },
  invalid_transition: { status: 400, message: 'Transicion invalida.', code: 'invalid_transition' },
};

const PLAN_LIFECYCLE_VALUES = [
  'preparation',
  'active',
  'paused',
  'completed',
  'cancelled',
];

const PLAN_LIFECYCLE_TRANSITIONS = {
  preparation: ['active', 'archive'],
  active: ['paused', 'completed', 'cancelled', 'archive'],
  paused: ['resume', 'completed', 'cancelled', 'archive'],
  completed: ['reopen', 'archive'],
  cancelled: ['reopen', 'archive'],
};

const PLAN_SCOPE_VALUES = ['household'];

const toActorAwarePlanDto = (context, goal) => {
  const capabilities = resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
  const isOwner = goal.visibility === 'personal'
    ? goal.owner_person_id === context.personId
    : goal.created_by_member_id === context.membershipId;
  const can = (own, any) => capabilities[isOwner ? own : any] === true;
  return toPlanDto(goal, [], {
    edit: can('goal.edit_own', 'goal.edit_any'),
    complete: can('goal.complete_own', 'goal.complete_any'),
    close: can('goal.close_own', 'goal.close_any'),
    archive: capabilities['goal.archive'] === true,
    trash: capabilities['goal.restore'] === true,
  });
};

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
    if (value === 'personal') {
      throw createHttpError(400, 'Los Planes son solo de hogar.', 'personal_plans_not_supported');
    }
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
  if (toLifecycle === 'unarchive') return;
  if (!hasOwn(PLAN_LIFECYCLE_TRANSITIONS, fromLifecycle)) {
    throw createHttpError(400, 'Lifecycle origen invalido.', 'invalid_lifecycle');
  }
  const allowed = PLAN_LIFECYCLE_TRANSITIONS[fromLifecycle];
  if (!allowed.includes(toLifecycle)) {
    throw createHttpError(409, 'Transicion de lifecycle invalida.', 'invalid_lifecycle_transition');
  }
};

const PLAN_NOT_FOUND = { status: 404, message: 'Plan no encontrado.', code: 'plan_not_found' };

const getPlanOrThrow = async (context, planId) => {
  // A malformed id must answer like a missing one: never a driver 500, and
  // never a distinguishable signal.
  const id = assertUuid(planId, PLAN_NOT_FOUND);
  const { data, error } = await applyPlanReadScope(
    context.client
      .from('planner_goals')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .is('trashed_at', null),
    context,
  ).maybeSingle();

  if (error) {
    throwSupabaseError(error);
  }
  if (!data) {
    throw createHttpError(404, 'Plan no encontrado.', 'plan_not_found');
  }
  return data;
};

const getPlanForTrashOperation = async (context, planId) => {
  const { data, error } = await applyPlanReadScope(
    context.client
      .from('planner_goals')
      .select('*')
      .eq('id', planId),
    context,
  ).maybeSingle();

  if (error) {
    throwSupabaseError(error);
  }
  if (!data) {
    throw createHttpError(404, 'Plan no encontrado.', 'plan_not_found');
  }
  return data;
};

const listPlans = async (context, query) => {
  const limit = parseLimit(query.limit);
  const onlyMine = isTrueQuery(query.only_mine);

  let request = context.client
    .from('planner_goals')
    .select('*')
    .is('deleted_at', null)
    .is('trashed_at', null)
    .eq('visibility', 'household');

  if (query.lifecycle) {
    request = request.eq('lifecycle', query.lifecycle);
  }
  if (query.scope && query.scope !== 'household') {
    throw createHttpError(400, 'Los Planes son solo de hogar.', 'personal_plans_not_supported');
  }

  request = applyPlanReadScope(request, context, { onlyMine });

  // Frozen §25/§38: an archived Plan leaves the default active surface. The
  // default list therefore EXCLUDES archived Plans; `archived=true` is the
  // explicit archived view and `archived=all` returns both.
  if (query.archived === 'true') {
    request = request.not('archived_at', 'is', null);
  } else if (query.archived !== 'all') {
    request = request.is('archived_at', null);
  }

  const { data, error } = await request.limit(500);

  if (error) {
    throwSupabaseError(error);
  }

  const sliced = (data ?? []).slice(0, limit);
  return { plans: sliced.map((goal) => toActorAwarePlanDto(context, goal)) };
};

const getPlanById = async (context, planId) => {
  const goal = await getPlanOrThrow(context, planId);
  if (goal.visibility !== 'household') {
    throw createHttpError(404, 'Plan no encontrado.', 'plan_not_found');
  }
  const components = require('./planner.plan-components.service');
  const { readiness, progress } = await components.getPlanReadiness(context, planId);
  // Milestones are NOT Plan V1 components (frozen §20): the read contract does
  // not publish a legacy component list. Readiness/progress stay the authority.
  return { plan: toActorAwarePlanDto(context, goal), readiness, progress };
};

const createPlan = async (context, body) => {
  const title = normalizeString(body?.title);
  if (!title) {
    throw createHttpError(400, 'title es obligatorio.', 'validation_error');
  }

  const scope = validateScope(body?.scope);
  const requiredCap = 'goal.create_household';

  const capabilities = resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
  assertCapability(capabilities, requiredCap);

  // Write authority: create_goal_rpc derives the actor from auth.uid() and
  // enforces the Personal/Hogar owner shape plus goal.create_personal /
  // goal.create_household. The JS assertion above is a cheap pre-check over
  // the same matrix; the database is the authority.
  const result = await callPlanWriter(
    context,
    'create_goal_rpc',
    {
      p_visibility: scope,
      p_title: title,
      p_description: hasOwn(body, 'description') ? normalizeString(body.description) || null : null,
      p_target_date: validateNullableDate(body?.targetDate, 'targetDate'),
      p_context_household_id: context.householdId,
    },
    WRITER_MESSAGES,
  );

  const data = unwrapPlanWriterResult(result, { errors: WRITER_ERRORS });

  recordPlannerActivity(context, {
    entityType: 'goal',
    entityId: data.id,
    action: 'goal.created',
    previousState: null,
    nextState: pickGoalActivityState(data),
  }).catch(() => {});

  return { plan: toActorAwarePlanDto(context, data) };
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
    patch.target_date = validateNullableDate(body.targetDate, 'targetDate');
  }

  if (hasOwn(body, 'lifecycle')) {
    throw createHttpError(400, 'lifecycle no se modifica con PATCH. Usa las transiciones dedicadas.', 'validation_error');
  }

  // Scope is immutable in V1 (Technical Truth §2.2). Beyond the explicit check
  // above, `update_goal_rpc` does not even accept `visibility`,
  // `owner_person_id`, `household_id` or `created_by_*` as arguments, so a Plan
  // can never change owner or authorship through a normal update.
  if (hasOwn(body, 'visibility')) {
    throw createHttpError(400, 'No se puede cambiar el scope de un Plan existente.', 'invalid_scope_change');
  }

  return patch;
};

const updatePlan = async (context, planId, body, expectedVersion) => {
  const existing = await getPlanOrThrow(context, planId);
  assertExpectedVersion(existing.version, expectedVersion);
  if (['completed', 'cancelled'].includes(existing.lifecycle)) {
    throw createHttpError(409, 'Reabrí el Plan antes de editarlo.', 'plan_locked');
  }

  const capabilities = resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
  const isOwner = existing.created_by_member_id === context.membershipId;
  assertCapability(capabilities, isOwner ? 'goal.edit_own' : 'goal.edit_any');

  const patch = await buildPlanPatch(context, body ?? {}, existing);

  const previousState = pickGoalActivityState(existing);

  // Write authority: update_goal_rpc owns the writable surface (title,
  // description, target_date), derives the actor from auth.uid() and applies
  // goal.edit_own / goal.edit_any plus the optimistic version check.
  const result = await callPlanWriter(
    context,
    'update_goal_rpc',
    {
      p_goal_id: planId,
      p_expected_version: expectedVersion ?? null,
      p_context_household_id: context.householdId,
      p_title: patch.title ?? null,
      p_description: hasOwn(patch, 'description') ? patch.description : null,
      p_target_date: hasOwn(patch, 'target_date') ? patch.target_date : null,
      p_set_title: hasOwn(patch, 'title'),
      p_set_description: hasOwn(patch, 'description'),
      p_set_target_date: hasOwn(patch, 'target_date'),
    },
    WRITER_MESSAGES,
  );

  const data = unwrapPlanWriterResult(result, { errors: WRITER_ERRORS });

  if (hasOwn(patch, 'title') || hasOwn(patch, 'description') || hasOwn(patch, 'target_date')) {
    recordPlannerActivity(context, {
      entityType: 'goal',
      entityId: data.id,
      action: 'goal.updated',
      previousState,
      nextState: pickGoalActivityState(data),
    }).catch(() => {});
  }

  return { plan: toActorAwarePlanDto(context, data) };
};

const transitionPlan = async (context, planId, expectedVersion, transition, extraFields = {}) => {
  const goal = await getPlanOrThrow(context, planId);
  assertExpectedVersion(goal.version, expectedVersion);

  const currentLifecycle = goal.lifecycle;
  validateLifecycleTransition(currentLifecycle, transition);

  const capabilities = resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });

  // Ownership for the `goal.*_own` / `goal.*_any` split. A Personal Plan is owned
  // by its person, a Hogar Plan by the membership that authored it — the same
  // rule the writer applies.
  const isOwner =
    goal.visibility === 'personal'
      ? goal.owner_person_id === context.personId
      : goal.created_by_member_id === context.membershipId;

  let requiredCap;
  switch (transition) {
    case 'active':
    case 'resume':
      requiredCap = isOwner ? 'goal.edit_own' : 'goal.edit_any';
      break;
    case 'paused':
      requiredCap = isOwner ? 'goal.edit_own' : 'goal.edit_any';
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
      // Archive asserts the capability that actually governs it. It used to
      // assert `goal.edit_own`, which silently elided the (then denied)
      // `goal.archive` capability — a second, lying gate.
      requiredCap = 'goal.archive';
      break;
    default:
      requiredCap = 'goal.edit_own';
  }
  assertCapability(capabilities, requiredCap);

  const previousState = pickGoalActivityState(goal);

  const writerTransition = resolvePlanWriterTransition(transition, currentLifecycle);
  if (!writerTransition) {
    throw createHttpError(400, 'Transicion invalida.', 'invalid_transition');
  }

  // Completion gate (frozen §§26/32): Readiness NEVER auto-completes, but a
  // normal Complete with unresolved Required components returns the
  // structured block. Explicit confirmUnresolved completes without mutating
  // children. Single SERVER readiness authority — never recalculated here.
  if (writerTransition === 'complete') {
    const confirmUnresolved = extraFields.confirmUnresolved === true || extraFields.confirm_unresolved === true;
    if (!confirmUnresolved) {
      const components = require('./planner.plan-components.service');
      const { readiness } = await components.getPlanReadiness(context, planId);
      if (readiness && readiness.ready !== true) {
        const blocked = createHttpError(
          409,
          'El plan tiene componentes requeridos sin resolver.',
          'readiness_unresolved',
        );
        blocked.details = { readiness };
        throw blocked;
      }
    }
  }

  // Write authority: transition_goal_rpc owns the state machine. It accepts only
  // preparation/active/paused/completed/cancelled, never cascades to children,
  // and leaves `status` as a derived projection of `lifecycle`.
  const result = await callPlanWriter(
    context,
    'transition_goal_rpc',
    {
      p_goal_id: planId,
      p_transition: writerTransition,
      p_expected_version: expectedVersion ?? null,
      p_context_household_id: context.householdId,
      p_closed_reason: extraFields.closedReason ?? extraFields.closed_reason ?? null,
    },
    WRITER_MESSAGES,
  );

  const data = unwrapPlanWriterResult(result, { errors: WRITER_ERRORS });

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

  return { plan: toActorAwarePlanDto(context, data) };
};

const trashPlan = async (context, planId, expectedVersion) => {
  const capabilities = resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
  assertCapability(capabilities, 'goal.restore');

  const previousState = pickGoalActivityState(await getPlanForTrashOperation(context, planId));

  // Write authority: trash_goal_rpc derives the actor from auth.uid(), records
  // the durable trash metadata (trashed_at / trashed_by_person_id /
  // trashed_by_member_id / trash_operation_id) and rejects a mismatching
  // client-supplied member id instead of trusting it.
  const result = await callPlanWriter(
    context,
    'trash_goal_rpc',
    {
      p_goal_id: planId,
      p_expected_version: expectedVersion ?? null,
      p_member_id: context.membershipId,
      p_context_household_id: context.householdId,
    },
    WRITER_MESSAGES,
  );

  const data = unwrapPlanWriterResult(result, { errors: WRITER_ERRORS });

  if (!result.already_trashed) {
    recordPlannerActivity(context, {
      entityType: 'goal',
      entityId: data.id,
      action: 'goal.trashed',
      previousState,
      nextState: pickGoalActivityState(data),
    }).catch(() => {});
  }

  return { plan: toActorAwarePlanDto(context, data) };
};

const restorePlan = async (context, planId, expectedVersion) => {
  // Write authority: restore_goal_rpc (reused, not duplicated). It reverses
  // trash only — lifecycle, archive and children are untouched.
  const result = await callPlanWriter(
    context,
    'restore_goal_rpc',
    {
      p_goal_id: planId,
      p_expected_version: expectedVersion ?? null,
      p_member_id: context.membershipId,
      p_context_household_id: context.householdId,
    },
    WRITER_MESSAGES,
  );

  const goal = unwrapPlanWriterResult(result, { errors: WRITER_ERRORS });

  if (!result.already_restored) {
    recordPlannerActivity(context, {
      entityType: 'goal',
      entityId: planId,
      action: 'goal.restored',
      previousState: null,
      nextState: pickGoalActivityState(goal),
    }).catch(() => {});
  }

  return { plan: toActorAwarePlanDto(context, goal) };
};

const unarchivePlan = async (context, planId, expectedVersion) => {
  const capabilities = resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
  // Unarchive is the inverse of archive and asserts the same authority, so a
  // role can never unarchive what it could not archive.
  assertCapability(capabilities, 'goal.archive');

  const goal = await getPlanOrThrow(context, planId);
  assertExpectedVersion(goal.version, expectedVersion);

  if (goal.archived_at === null) {
    return { plan: toActorAwarePlanDto(context, goal) };
  }

  const previousState = pickGoalActivityState(goal);

  // Archive is a dimension, not a lifecycle. The writer only clears
  // `archived_at`; `lifecycle` is never touched here (Technical Truth §5).
  const result = await callPlanWriter(
    context,
    'transition_goal_rpc',
    {
      p_goal_id: planId,
      p_transition: 'unarchive',
      p_expected_version: expectedVersion ?? null,
      p_context_household_id: context.householdId,
    },
    WRITER_MESSAGES,
  );

  const data = unwrapPlanWriterResult(result, { errors: WRITER_ERRORS });

  recordPlannerActivity(context, {
    entityType: 'goal',
    entityId: data.id,
    action: 'goal.unarchived',
    previousState,
    nextState: pickGoalActivityState(data),
  }).catch(() => {});

  return { plan: toActorAwarePlanDto(context, data) };
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
  validateLifecycle,
  validateScope,
  validateLifecycleTransition,
  PLAN_LIFECYCLE_VALUES,
  PLAN_LIFECYCLE_TRANSITIONS,
  PLAN_SCOPE_VALUES,
};
