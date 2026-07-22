const { createHttpError } = require('../lib/httpErrors')
const {
  GOAL_STATUS_TRANSITIONS,
  GOAL_VISIBILITY_VALUES,
  GOAL_CATEGORIES,
  GOAL_TARGET_TYPES,
  GOAL_PROGRESS_MODES,
  GOAL_PROGRESS_MODE_TARGET_TYPE_MAP,
} = require('../constants/planner.constants')
const { assertExpectedVersion } = require('../lib/versionHelpers')
const {
  pickGoalActivityState,
  pickMilestoneActivityState,
  recordPlannerActivity,
} = require('./planner.activity.service')

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '')
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key)
const throwSupabaseError = (error) => {
  const isRlsViolation =
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    (typeof error.message === 'string' && error.message.toLowerCase().includes('row-level security'))

  if (isRlsViolation) {
    throw createHttpError(403, 'No tenes permiso para realizar esta accion sobre metas.', 'rls_violation')
  }

  const httpError = createHttpError(500, error.message, error.code ?? 'internal_error')
  httpError.details = error.details
  httpError.hint = error.hint
  throw httpError
}

const isValidDateOnly = (value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))

const parseLimit = (value) => {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100
  }
  return Math.min(parsed, 100)
}

const isTrueQuery = (value) => value === true || value === 'true' || value === '1'

const calculateProgressFromMilestones = async (client, goalId) => {
  const { data: milestones, error } = await client
    .from('planner_goal_milestones')
    .select('achieved')
    .eq('goal_id', goalId)
    .is('deleted_at', null)
    .is('trashed_at', null)

  if (error) {
    console.error('[calculateProgressFromMilestones]', error)
    return { percentage: null, total: 0, completed: 0 }
  }

  const total = milestones?.length ?? 0
  if (total === 0) {
    return { percentage: null, total: 0, completed: 0 }
  }

  const achieved = milestones.filter((m) => m.achieved).length
  const percentage = Math.round((achieved / total) * 100)
  return { percentage, total, completed: achieved }
}

const validateProgressMode = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'steps'
  }
  if (!GOAL_PROGRESS_MODES.includes(value)) {
    throw createHttpError(400, 'progress_mode invalido.', 'invalid_progress_mode')
  }
  return value
}

const validateProgressModeTargetTypeCompatibility = (progressMode, targetType) => {
  const allowed = GOAL_PROGRESS_MODE_TARGET_TYPE_MAP[progressMode]
  if (!allowed) {
    if (targetType !== null && targetType !== undefined) {
      throw createHttpError(
        400,
        `progress_mode '${progressMode}' no permite target_type. target_type debe ser null.`,
        'incompatible_progress_mode_target_type',
      )
    }
    return
  }
  if (targetType === null || targetType === undefined) {
    throw createHttpError(
      400,
      `progress_mode '${progressMode}' requiere target_type.`,
      'incompatible_progress_mode_target_type',
    )
  }
  if (!allowed.includes(targetType)) {
    throw createHttpError(
      400,
      `target_type '${targetType}' no es compatible con progress_mode '${progressMode}'.`,
      'incompatible_progress_mode_target_type',
    )
  }
}

const calculateProgressFromTasks = async (client, householdId, goalId) => {
  const { data: tasks, error } = await client
    .from('planner_tasks')
    .select('status')
    .eq('household_id', householdId)
    .eq('goal_id', goalId)
    .neq('status', 'cancelled')
    .is('trashed_at', null)

  if (error) {
    console.error('[calculateProgressFromTasks]', error)
    return { percentage: null, total: 0, completed: 0, pending: 0 }
  }

  const computableTasks = tasks ?? []
  const total = computableTasks.length

  if (total === 0) {
    return { percentage: null, total: 0, completed: 0, pending: 0 }
  }

  const completed = computableTasks.filter(
    (t) => t.status === 'completed' || t.status === 'verified'
  ).length

  const percentage = Math.round((completed / total) * 100)
  return { percentage, total, completed, pending: total - completed }
}

const calculateProgress = async (context, goal) => {
  if (goal.status === 'completed') {
    return 100
  }

  if (goal.status === 'closed') {
    return 0
  }

  const mode = goal.progress_mode ?? 'steps'

  if (mode === 'boolean') {
    if (goal.target_type === 'boolean') {
      return goal.current_value >= 1 ? 100 : 0
    }
    return goal.status === 'completed' ? 100 : 0
  }

  if (mode === 'numeric') {
    if (goal.target_value === null || goal.target_value === undefined) {
      return null
    }
    const target = Number(goal.target_value)
    const current = Number(goal.current_value)
    if (target <= 0) {
      return current > 0 ? 100 : 0
    }
    const percentage = Math.min(Math.max(Math.round((current / target) * 100), 0), 100)
    return percentage
  }

  if (mode === 'steps') {
    const result = await calculateProgressFromMilestones(context.client, goal.id)
    return result.percentage
  }

  if (mode === 'tasks') {
    const result = await calculateProgressFromTasks(context.client, context.householdId, goal.id)
    return result.percentage
  }

  if (mode === 'none') {
    return null
  }

  return null
}

const attachProgress = async (context, goal) => {
  if (goal.status === 'completed') {
    return { ...goal, progress_percentage: 100 }
  }

  if (goal.status === 'closed') {
    return { ...goal, progress_percentage: 0 }
  }

  const mode = goal.progress_mode ?? 'steps'

  if (mode === 'tasks') {
    const result = await calculateProgressFromTasks(context.client, context.householdId, goal.id)
    return {
      ...goal,
      progress_percentage: result.percentage,
      tasks_total: result.total,
      tasks_completed: result.completed,
      tasks_pending: result.pending,
    }
  }

  if (mode === 'steps') {
    const result = await calculateProgressFromMilestones(context.client, goal.id)
    return {
      ...goal,
      progress_percentage: result.percentage,
      milestones_total: result.total,
      milestones_completed: result.completed,
    }
  }

  const percentage = await calculateProgress(context, goal)
  return { ...goal, progress_percentage: percentage }
}

const getGoalOrThrow = async (client, householdId, goalId) => {
  const { data, error } = await client
    .from('planner_goals')
    .select('*')
    .eq('id', goalId)
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .is('trashed_at', null)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }
  if (!data) {
    throw createHttpError(404, 'Meta no encontrada.', 'goal_not_found')
  }
  return data
}

const getGoalForTrashOperation = async (client, householdId, goalId) => {
  const { data, error } = await client
    .from('planner_goals')
    .select('*')
    .eq('id', goalId)
    .eq('household_id', householdId)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }
  if (!data) {
    throw createHttpError(404, 'Meta no encontrada.', 'goal_not_found')
  }
  return data
}

const validateNullableDate = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null
  }
  if (!isValidDateOnly(value)) {
    throw createHttpError(400, `${fieldName} invalido.`, 'validation_error')
  }
  return value
}

const validateVisibility = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'household'
  }
  if (!GOAL_VISIBILITY_VALUES.includes(value)) {
    throw createHttpError(400, 'visibility invalido.', 'invalid_visibility')
  }
  return value
}

const validateCategory = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'home'
  }
  if (!GOAL_CATEGORIES.includes(value)) {
    throw createHttpError(400, 'category invalido.', 'invalid_category')
  }
  return value
}

const validateTargetType = (value) => {
  if (value === undefined || value === null || value === '') {
    return null
  }
  if (!GOAL_TARGET_TYPES.includes(value)) {
    throw createHttpError(400, 'target_type invalido.', 'invalid_target_type')
  }
  return value
}

const validateNonNegativeNumeric = (value, fieldName, allowNull = true) => {
  if (allowNull && (value === undefined || value === null || value === '')) {
    return null
  }
  if (!allowNull && (value === undefined || value === null)) {
    throw createHttpError(400, `${fieldName} es obligatorio.`, 'validation_error')
  }
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw createHttpError(400, `${fieldName} debe ser >= 0.`, 'validation_error')
  }
  return numericValue
}

const listGoals = async (context, query) => {
  const limit = parseLimit(query.limit)
  let request = context.client
    .from('planner_goals')
    .select('*')
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .is('trashed_at', null)

  if (query.status) {
    request = request.eq('status', query.status)
  }
  if (query.category) {
    request = request.eq('category', query.category)
  }
  if (query.visibility) {
    request = request.eq('visibility', query.visibility)
  }
  if (isTrueQuery(query.only_mine)) {
    request = request.eq('created_by_member_id', context.membershipId)
  }
  if (query.ends_at_from) {
    if (!isValidDateOnly(query.ends_at_from)) {
      throw createHttpError(400, 'ends_at_from invalido.', 'validation_error')
    }
    request = request.gte('ends_at', query.ends_at_from)
  }
  if (query.ends_at_to) {
    if (!isValidDateOnly(query.ends_at_to)) {
      throw createHttpError(400, 'ends_at_to invalido.', 'validation_error')
    }
    request = request.lte('ends_at', query.ends_at_to)
  }

  const { data, error } = await request.limit(500)

  if (error) {
    throwSupabaseError(error)
  }

  const sliced = (data ?? []).slice(0, limit)
  const withProgress = await Promise.all(sliced.map((goal) => attachProgress(context, goal)))

  return { goals: withProgress }
}

const getGoalById = async (context, goalId) => {
  const goal = await getGoalOrThrow(context.client, context.householdId, goalId)

  const { data: milestones, error: milestonesError } = await context.client
    .from('planner_goal_milestones')
    .select('*')
    .eq('goal_id', goalId)
    .is('deleted_at', null)
    .is('trashed_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (milestonesError) {
    throwSupabaseError(milestonesError)
  }

  return { goal: await attachProgress(context, goal), milestones: milestones ?? [] }
}

const createGoal = async (context, body) => {
  const title = normalizeString(body?.title)
  if (!title) {
    throw createHttpError(400, 'title es obligatorio.', 'validation_error')
  }

  const visibility = validateVisibility(body?.visibility)
  const progressMode = validateProgressMode(body?.progress_mode)
  const targetType = validateTargetType(body?.target_type)
  validateProgressModeTargetTypeCompatibility(progressMode, targetType)

  const payload = {
    household_id: context.householdId,
    title,
    description: hasOwn(body, 'description') ? normalizeString(body.description) || null : null,
    visibility,
    category: validateCategory(body?.category),
    progress_mode: progressMode,
    target_type: targetType,
    target_value: validateNonNegativeNumeric(body?.target_value, 'target_value', true),
    current_value: hasOwn(body, 'current_value') ? validateNonNegativeNumeric(body.current_value, 'current_value', false) : 0,
    unit: hasOwn(body, 'unit') ? normalizeString(body.unit) || null : null,
    starts_at: validateNullableDate(body?.starts_at, 'starts_at'),
    ends_at: validateNullableDate(body?.ends_at, 'ends_at'),
    created_by_member_id: context.membershipId,
    status: 'active',
  }

  const { data, error } = await context.client
    .from('planner_goals')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error)
  }

  recordPlannerActivity(context, {
    entityType: 'goal',
    entityId: data.id,
    action: 'goal.created',
    previousState: null,
    nextState: pickGoalActivityState(data),
  }).catch(() => {})

  return { goal: await attachProgress(context, data) }
}

const buildGoalPatch = async (context, body, existingGoal) => {
  const patch = {}

  if (hasOwn(body, 'title')) {
    const title = normalizeString(body.title)
    if (!title) {
      throw createHttpError(400, 'title no puede estar vacio.', 'validation_error')
    }
    patch.title = title
  }

  if (hasOwn(body, 'description')) {
    patch.description = normalizeString(body.description) || null
  }

  if (hasOwn(body, 'visibility')) {
    patch.visibility = validateVisibility(body.visibility)
  }

  if (hasOwn(body, 'category')) {
    patch.category = validateCategory(body.category)
  }

  if (hasOwn(body, 'progress_mode')) {
    patch.progress_mode = validateProgressMode(body.progress_mode)
  }

  if (hasOwn(body, 'target_type')) {
    patch.target_type = validateTargetType(body.target_type)
  }

  if (hasOwn(body, 'target_value')) {
    patch.target_value = validateNonNegativeNumeric(body.target_value, 'target_value', true)
  }

  if (hasOwn(body, 'current_value')) {
    patch.current_value = Number(body.current_value)
    if (!Number.isFinite(patch.current_value) || patch.current_value < 0) {
      throw createHttpError(400, 'current_value debe ser >= 0.', 'validation_error')
    }
  }

  if (hasOwn(body, 'unit')) {
    patch.unit = normalizeString(body.unit) || null
  }

  if (hasOwn(body, 'starts_at')) {
    patch.starts_at = validateNullableDate(body.starts_at, 'starts_at')
  }

  if (hasOwn(body, 'ends_at')) {
    patch.ends_at = validateNullableDate(body.ends_at, 'ends_at')
  }

  if (hasOwn(body, 'status')) {
    throw createHttpError(400, 'status no se modifica con PATCH. Usá POST /goals/:id/complete o POST /goals/:id/close.', 'validation_error')
  }

  if (Object.keys(patch).length > 0) {
    const resolvedMode = hasOwn(patch, 'progress_mode')
      ? patch.progress_mode
      : (existingGoal.progress_mode ?? 'steps')
    const resolvedTargetType = hasOwn(patch, 'target_type')
      ? patch.target_type
      : existingGoal.target_type
    validateProgressModeTargetTypeCompatibility(resolvedMode, resolvedTargetType)
  }

  return patch
}

const updateGoal = async (context, goalId, body, expectedVersion) => {
  const existing = await getGoalOrThrow(context.client, context.householdId, goalId)
  assertExpectedVersion(existing.version, expectedVersion)
  const patch = await buildGoalPatch(context, body ?? {}, existing)

  if (Object.keys(patch).length === 0) {
    return { goal: await attachProgress(context, existing) }
  }

  const previousState = pickGoalActivityState(existing)

  const query = context.client
    .from('planner_goals')
    .update(patch)
    .eq('id', goalId)
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .is('trashed_at', null)

  if (expectedVersion !== null && expectedVersion !== undefined) {
    query.eq('version', expectedVersion)
  }

  const { data, error } = await query.select('*').maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }
  if (!data) {
    if (expectedVersion !== null && expectedVersion !== undefined) {
      throw createHttpError(409, 'Esta meta cambió en otro dispositivo. Actualizá y volvé a intentar.', 'version_conflict')
    }
    throw createHttpError(404, 'Meta no encontrada.', 'goal_not_found')
  }

  recordPlannerActivity(context, {
    entityType: 'goal',
    entityId: data.id,
    action: 'goal.updated',
    previousState,
    nextState: pickGoalActivityState(data),
  }).catch(() => {})

  return { goal: await attachProgress(context, data) }
}

const trashMilestone = async (context, goalId, milestoneId, expectedVersion) => {
  await getGoalForMilestone(context.client, context.householdId, goalId)

  const { data: milestoneBefore, error: fetchBeforeError } = await context.client
    .from('planner_goal_milestones')
    .select('*')
    .eq('id', milestoneId)
    .eq('goal_id', goalId)
    .is('deleted_at', null)
    .is('trashed_at', null)
    .maybeSingle()

  if (fetchBeforeError) {
    throwSupabaseError(fetchBeforeError)
  }
  if (!milestoneBefore) {
    throw createHttpError(404, 'Hito no encontrado.', 'milestone_not_found')
  }

  const previousState = pickMilestoneActivityState(milestoneBefore)

  const { data: result, error: rpcError } = await context.client.rpc(
    'trash_milestone_rpc',
    {
      p_goal_id: goalId,
      p_milestone_id: milestoneId,
      p_expected_version: expectedVersion ?? null,
      p_member_id: context.membershipId,
    }
  )

  if (rpcError) {
    if (rpcError.code === '42501') {
      throw createHttpError(403, 'No tenes permiso para realizar esta accion sobre metas.', 'rls_violation')
    }
    if (rpcError.code === '40007') {
      throw createHttpError(409, 'Este hito cambió en otro dispositivo. Actualizá y volvé a intentar.', 'version_conflict')
    }
    throwSupabaseError(rpcError)
  }

  if (!result || result.success === false) {
    if (result?.error === 'milestone_not_found') {
      throw createHttpError(404, 'Hito no encontrado.', 'milestone_not_found')
    }
    throw createHttpError(404, 'Hito no encontrado.', 'milestone_not_found')
  }

  const { data: milestone, error: fetchError } = await context.client
    .from('planner_goal_milestones')
    .select('*')
    .eq('id', milestoneId)
    .eq('goal_id', goalId)
    .maybeSingle()

  if (fetchError) {
    throwSupabaseError(fetchError)
  }

  recordPlannerActivity(context, {
    entityType: 'milestone',
    entityId: milestoneId,
    action: 'milestone.trashed',
    previousState,
    nextState: pickMilestoneActivityState(milestone),
    metadata: { goal_id: goalId },
  }).catch(() => {})

  return { milestone }
}

const restoreMilestone = async (context, goalId, milestoneId, expectedVersion) => {
  const { data: parentGoal, error: goalError } = await context.client
    .from('planner_goals')
    .select('id, trashed_at')
    .eq('id', goalId)
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .maybeSingle()

  if (goalError) {
    throwSupabaseError(goalError)
  }
  if (!parentGoal) {
    throw createHttpError(404, 'Meta no encontrada.', 'goal_not_found')
  }
  if (parentGoal.trashed_at !== null) {
    throw createHttpError(
      409,
      'Este hito pertenece a una meta que está en la papelera. Restaurá primero la meta.',
      'parent_goal_in_trash'
    )
  }

  const { data: result, error: rpcError } = await context.client.rpc(
    'restore_milestone_rpc',
    {
      p_goal_id: goalId,
      p_milestone_id: milestoneId,
      p_expected_version: expectedVersion ?? null,
    }
  )

  if (rpcError) {
    if (rpcError.code === '42501') {
      throw createHttpError(403, 'No tenes permiso para realizar esta accion sobre metas.', 'rls_violation')
    }
    if (rpcError.code === '40007') {
      throw createHttpError(409, 'Este hito cambió en otro dispositivo. Actualizá y volvé a intentar.', 'version_conflict')
    }
    throwSupabaseError(rpcError)
  }

  if (!result || result.success === false) {
    if (result?.error === 'milestone_not_found') {
      throw createHttpError(404, 'Hito no encontrado.', 'milestone_not_found')
    }
    throw createHttpError(404, 'Hito no encontrado.', 'milestone_not_found')
  }

  const { data: milestone, error: fetchError } = await context.client
    .from('planner_goal_milestones')
    .select('*')
    .eq('id', milestoneId)
    .eq('goal_id', goalId)
    .maybeSingle()

  if (fetchError) {
    throwSupabaseError(fetchError)
  }

  recordPlannerActivity(context, {
    entityType: 'milestone',
    entityId: milestoneId,
    action: 'milestone.restored',
    previousState: null,
    nextState: pickMilestoneActivityState(milestone),
    metadata: { goal_id: goalId },
  }).catch(() => {})

  return { milestone }
}

const deleteGoal = async (context, goalId, expectedVersion) => {
  return trashGoal(context, goalId, expectedVersion)
}

const trashGoal = async (context, goalId, expectedVersion) => {
  const existing = await getGoalForTrashOperation(context.client, context.householdId, goalId)
  assertExpectedVersion(existing.version, expectedVersion)

  if (existing.trashed_at !== null) {
    return { goal: await attachProgress(context, existing) }
  }

  const previousState = pickGoalActivityState(existing)

  const query = context.client
    .from('planner_goals')
    .update({
      trashed_at: new Date().toISOString(),
      trashed_by_member_id: context.membershipId,
    })
    .eq('id', goalId)
    .eq('household_id', context.householdId)

  if (expectedVersion !== null && expectedVersion !== undefined) {
    query.eq('version', expectedVersion)
  }

  const { data, error } = await query.select('*').maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }
  if (!data) {
    if (expectedVersion !== null && expectedVersion !== undefined) {
      throw createHttpError(409, 'Esta meta cambió en otro dispositivo. Actualizá y volvé a intentar.', 'version_conflict')
    }
    throw createHttpError(404, 'Meta no encontrada.', 'goal_not_found')
  }

  recordPlannerActivity(context, {
    entityType: 'goal',
    entityId: data.id,
    action: 'goal.trashed',
    previousState,
    nextState: pickGoalActivityState(data),
  }).catch(() => {})

  return { goal: await attachProgress(context, data) }
}

const restoreGoal = async (context, goalId, expectedVersion) => {
  const { data: result, error: rpcError } = await context.client.rpc(
    'restore_goal_rpc',
    {
      p_goal_id: goalId,
      p_expected_version: expectedVersion ?? null,
    }
  )

  if (rpcError) {
    if (rpcError.code === '42501') {
      throw createHttpError(403, 'No tenes permiso para realizar esta accion sobre metas.', 'rls_violation')
    }
    if (rpcError.code === '40007') {
      throw createHttpError(409, 'Esta meta cambió en otro dispositivo. Actualizá y volvé a intentar.', 'version_conflict')
    }
    throwSupabaseError(rpcError)
  }

  if (!result || result.success === false) {
    if (result?.error === 'goal_not_found') {
      throw createHttpError(404, 'Meta no encontrada.', 'goal_not_found')
    }
    throw createHttpError(404, 'Meta no encontrada.', 'goal_not_found')
  }

  if (result.already_restored) {
    const { data: goal, error: fetchError } = await context.client
      .from('planner_goals')
      .select('*')
      .eq('id', goalId)
      .eq('household_id', context.householdId)
      .maybeSingle()
    if (fetchError) {
      throwSupabaseError(fetchError)
    }
    return { goal: await attachProgress(context, goal) }
  }

  const { data: goal, error: fetchError } = await context.client
    .from('planner_goals')
    .select('*')
    .eq('id', goalId)
    .eq('household_id', context.householdId)
    .maybeSingle()

  if (fetchError) {
    throwSupabaseError(fetchError)
  }

  recordPlannerActivity(context, {
    entityType: 'goal',
    entityId: goalId,
    action: 'goal.restored',
    previousState: null,
    nextState: pickGoalActivityState(goal),
  }).catch(() => {})

  return { goal: await attachProgress(context, goal) }
}

const validateGoalTransition = (fromStatus, toStatus) => {
  if (!hasOwn(GOAL_STATUS_TRANSITIONS, fromStatus)) {
    throw createHttpError(400, 'Status origen invalido.', 'invalid_status')
  }
  const allowed = GOAL_STATUS_TRANSITIONS[fromStatus]
  if (!allowed.includes(toStatus)) {
    throw createHttpError(409, 'Transicion invalida.', 'invalid_status_transition')
  }
}

const completeGoal = async (context, goalId, expectedVersion) => {
  const goal = await getGoalOrThrow(context.client, context.householdId, goalId)
  assertExpectedVersion(goal.version, expectedVersion)

  if (goal.status === 'completed') {
    return { goal: { ...goal, progress_percentage: 100 } }
  }

  validateGoalTransition(goal.status, 'completed')

  const previousState = pickGoalActivityState(goal)

  const query = context.client
    .from('planner_goals')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .is('trashed_at', null)

  if (expectedVersion !== null && expectedVersion !== undefined) {
    query.eq('version', expectedVersion)
  }

  const { data, error } = await query.select('*').maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }
  if (!data) {
    if (expectedVersion !== null && expectedVersion !== undefined) {
      throw createHttpError(409, 'Esta meta cambió en otro dispositivo. Actualizá y volvé a intentar.', 'version_conflict')
    }
    throw createHttpError(404, 'Meta no encontrada.', 'goal_not_found')
  }

  recordPlannerActivity(context, {
    entityType: 'goal',
    entityId: data.id,
    action: 'goal.completed',
    previousState,
    nextState: pickGoalActivityState(data),
  }).catch(() => {})

  return { goal: { ...data, progress_percentage: 100 } }
}

const failGoal = async (context, goalId, expectedVersion, closedReason) => {
  return closeGoal(context, goalId, expectedVersion, closedReason)
}

const closeGoal = async (context, goalId, expectedVersion, closedReason) => {
  const goal = await getGoalOrThrow(context.client, context.householdId, goalId)
  assertExpectedVersion(goal.version, expectedVersion)

  if (goal.status === 'closed') {
    return { goal: await attachProgress(context, goal) }
  }

  if (goal.status !== 'active') {
    throw createHttpError(409, 'Transicion invalida.', 'invalid_status_transition')
  }

  const previousState = pickGoalActivityState(goal)

  const query = context.client
    .from('planner_goals')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_reason: closedReason ?? null,
    })
    .eq('id', goalId)
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .is('trashed_at', null)

  if (expectedVersion !== null && expectedVersion !== undefined) {
    query.eq('version', expectedVersion)
  }

  const { data, error } = await query.select('*').maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }
  if (!data) {
    if (expectedVersion !== null && expectedVersion !== undefined) {
      throw createHttpError(409, 'Esta meta cambió en otro dispositivo. Actualizá y volvé a intentar.', 'version_conflict')
    }
    throw createHttpError(404, 'Meta no encontrada.', 'goal_not_found')
  }

  recordPlannerActivity(context, {
    entityType: 'goal',
    entityId: data.id,
    action: 'goal.closed',
    previousState,
    nextState: pickGoalActivityState(data),
    metadata: closedReason ? { closed_reason: closedReason } : null,
  }).catch(() => {})

  return { goal: await attachProgress(context, data) }
}

const reopenGoal = async (context, goalId, expectedVersion) => {
  const goal = await getGoalOrThrow(context.client, context.householdId, goalId)
  assertExpectedVersion(goal.version, expectedVersion)

  if (goal.status !== 'closed' && goal.status !== 'completed') {
    throw createHttpError(409, 'Transicion invalida.', 'invalid_status_transition')
  }

  const previousState = pickGoalActivityState(goal)

  const query = context.client
    .from('planner_goals')
    .update({
      status: 'active',
      closed_at: null,
      closed_reason: null,
      completed_at: null,
    })
    .eq('id', goalId)
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .is('trashed_at', null)

  if (expectedVersion !== null && expectedVersion !== undefined) {
    query.eq('version', expectedVersion)
  }

  const { data, error } = await query.select('*').maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }
  if (!data) {
    if (expectedVersion !== null && expectedVersion !== undefined) {
      throw createHttpError(409, 'Esta meta cambió en otro dispositivo. Actualizá y volvé a intentar.', 'version_conflict')
    }
    throw createHttpError(404, 'Meta no encontrada.', 'goal_not_found')
  }

  recordPlannerActivity(context, {
    entityType: 'goal',
    entityId: data.id,
    action: 'goal.reopened',
    previousState,
    nextState: pickGoalActivityState(data),
  }).catch(() => {})

  return { goal: await attachProgress(context, data) }
}

const getGoalForMilestone = async (client, householdId, goalId) => {
  const { data, error } = await client
    .from('planner_goals')
    .select('id, household_id')
    .eq('id', goalId)
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .is('trashed_at', null)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }
  if (!data) {
    throw createHttpError(404, 'Meta no encontrada.', 'goal_not_found')
  }
  return data
}

const listMilestones = async (context, goalId) => {
  await getGoalForMilestone(context.client, context.householdId, goalId)

  const { data, error } = await context.client
    .from('planner_goal_milestones')
    .select('*')
    .eq('goal_id', goalId)
    .is('deleted_at', null)
    .is('trashed_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throwSupabaseError(error)
  }

  return { milestones: data ?? [] }
}

const createMilestone = async (context, goalId, body) => {
  await getGoalForMilestone(context.client, context.householdId, goalId)

  const title = normalizeString(body?.title)
  if (!title) {
    throw createHttpError(400, 'title es obligatorio.', 'validation_error')
  }

  const sortOrder = hasOwn(body, 'sort_order')
    ? Number(body.sort_order)
    : 0
  if (!Number.isFinite(sortOrder) || sortOrder < 0) {
    throw createHttpError(400, 'sort_order debe ser >= 0.', 'validation_error')
  }

  const payload = {
    goal_id: goalId,
    title,
    target_value: validateNonNegativeNumeric(body?.target_value, 'target_value', true),
    achieved: !!body.achieved,
    achieved_at: body?.achieved ? new Date().toISOString() : null,
    sort_order: Math.floor(sortOrder),
  }

  const { data, error } = await context.client
    .from('planner_goal_milestones')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error)
  }

  recordPlannerActivity(context, {
    entityType: 'milestone',
    entityId: data.id,
    action: 'milestone.created',
    previousState: null,
    nextState: pickMilestoneActivityState(data),
    metadata: { goal_id: goalId },
  }).catch(() => {})

  return { milestone: data }
}

const updateMilestone = async (context, goalId, milestoneId, body, expectedVersion) => {
  await getGoalForMilestone(context.client, context.householdId, goalId)

  const { data: existing, error: fetchError } = await context.client
    .from('planner_goal_milestones')
    .select('*')
    .eq('id', milestoneId)
    .eq('goal_id', goalId)
    .is('deleted_at', null)
    .is('trashed_at', null)
    .maybeSingle()

  if (fetchError) {
    throwSupabaseError(fetchError)
  }
  if (!existing) {
    throw createHttpError(404, 'Hito no encontrado.', 'milestone_not_found')
  }

  assertExpectedVersion(existing.version, expectedVersion)

  const patch = {}

  if (hasOwn(body, 'title')) {
    const title = normalizeString(body.title)
    if (!title) {
      throw createHttpError(400, 'title no puede estar vacio.', 'validation_error')
    }
    patch.title = title
  }

  if (hasOwn(body, 'target_value')) {
    patch.target_value = validateNonNegativeNumeric(body.target_value, 'target_value', true)
  }

  if (hasOwn(body, 'sort_order')) {
    const sortOrder = Number(body.sort_order)
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      throw createHttpError(400, 'sort_order debe ser >= 0.', 'validation_error')
    }
    patch.sort_order = Math.floor(sortOrder)
  }

  if (hasOwn(body, 'achieved')) {
    patch.achieved = !!body.achieved
    if (patch.achieved) {
      patch.achieved_at = existing.achieved_at ?? new Date().toISOString()
    } else {
      patch.achieved_at = null
    }
  }

  if (Object.keys(patch).length === 0) {
    return { milestone: existing }
  }

  const previousState = pickMilestoneActivityState(existing)

  const query = context.client
    .from('planner_goal_milestones')
    .update(patch)
    .eq('id', milestoneId)
    .eq('goal_id', goalId)
    .is('deleted_at', null)
    .is('trashed_at', null)

  if (expectedVersion !== null && expectedVersion !== undefined) {
    query.eq('version', expectedVersion)
  }

  const { data, error } = await query.select('*').maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }
  if (!data) {
    if (expectedVersion !== null && expectedVersion !== undefined) {
      throw createHttpError(409, 'Este hito cambió en otro dispositivo. Actualizá y volvé a intentar.', 'version_conflict')
    }
    throw createHttpError(404, 'Hito no encontrado.', 'milestone_not_found')
  }

  recordPlannerActivity(context, {
    entityType: 'milestone',
    entityId: data.id,
    action: 'milestone.updated',
    previousState,
    nextState: pickMilestoneActivityState(data),
    metadata: { goal_id: goalId },
  }).catch(() => {})

  return { milestone: data }
}

const deleteMilestone = async (context, goalId, milestoneId, expectedVersion) => {
  return trashMilestone(context, goalId, milestoneId, expectedVersion)
}

module.exports = {
  closeGoal,
  completeGoal,
  createGoal,
  createMilestone,
  deleteGoal,
  deleteMilestone,
  failGoal,
  getGoalById,
  getGoalOrThrow,
  listGoals,
  listMilestones,
  reopenGoal,
  restoreGoal,
  restoreMilestone,
  trashGoal,
  trashMilestone,
  updateGoal,
  updateMilestone,
  attachProgress,
}
