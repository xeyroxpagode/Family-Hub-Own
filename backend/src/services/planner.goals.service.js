const { createHttpError } = require('../lib/httpErrors')
const {
  GOAL_STATUSES,
  GOAL_STATUS_TRANSITIONS,
  GOAL_VISIBILITY_VALUES,
  GOAL_CATEGORIES,
  GOAL_TARGET_TYPES,
} = require('../constants/planner.constants')

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '')
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key)
const throwSupabaseError = (error) => {
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

const calculateProgress = (goal) => {
  if (goal.status === 'completed') {
    return 100
  }
  if (goal.target_type === 'boolean') {
    return goal.current_value >= 1 ? 100 : 0
  }
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

const attachProgress = (goal) => ({
  ...goal,
  progress_percentage: calculateProgress(goal),
})

const getGoalOrThrow = async (client, householdId, goalId) => {
  const { data, error } = await client
    .from('planner_goals')
    .select('*')
    .eq('id', goalId)
    .eq('household_id', householdId)
    .is('deleted_at', null)
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

const validateStatus = (value) => {
  if (!value || !GOAL_STATUSES.includes(value)) {
    throw createHttpError(400, 'status invalido.', 'validation_error')
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
  const withProgress = sliced.map(attachProgress)

  return { goals: withProgress }
}

const getGoalById = async (context, goalId) => {
  const goal = await getGoalOrThrow(context.client, context.householdId, goalId)

  const { data: milestones, error: milestonesError } = await context.client
    .from('planner_goal_milestones')
    .select('*')
    .eq('goal_id', goalId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (milestonesError) {
    throwSupabaseError(milestonesError)
  }

  return { goal: attachProgress(goal), milestones: milestones ?? [] }
}

const createGoal = async (context, body) => {
  const title = normalizeString(body?.title)
  if (!title) {
    throw createHttpError(400, 'title es obligatorio.', 'validation_error')
  }

  const visibility = validateVisibility(body?.visibility)

  const payload = {
    household_id: context.householdId,
    title,
    description: hasOwn(body, 'description') ? normalizeString(body.description) || null : null,
    visibility,
    category: validateCategory(body?.category),
    target_type: validateTargetType(body?.target_type),
    target_value: validateNonNegativeNumeric(body?.target_value, 'target_value', true),
    current_value: validateNonNegativeNumeric(body?.current_value, 'current_value', false),
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

  return { goal: attachProgress(data) }
}

const buildGoalPatch = async (context, body) => {
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
    throw createHttpError(400, 'status no se modifica con PATCH. Usa POST /goals/:id/complete o POST /goals/:id/fail.', 'validation_error')
  }

  return patch
}

const updateGoal = async (context, goalId, body) => {
  await getGoalOrThrow(context.client, context.householdId, goalId)
  const patch = await buildGoalPatch(context, body ?? {})

  if (Object.keys(patch).length === 0) {
    const goal = await getGoalOrThrow(context.client, context.householdId, goalId)
    return { goal: attachProgress(goal) }
  }

  const { data, error } = await context.client
    .from('planner_goals')
    .update(patch)
    .eq('id', goalId)
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }
  if (!data) {
    throw createHttpError(404, 'Meta no encontrada.', 'goal_not_found')
  }

  return { goal: attachProgress(data) }
}

const deleteGoal = async (context, goalId) => {
  await getGoalOrThrow(context.client, context.householdId, goalId)

  const { data, error } = await context.client
    .from('planner_goals')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }
  if (!data) {
    throw createHttpError(404, 'Meta no encontrada.', 'goal_not_found')
  }

  return { goal: attachProgress(data) }
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

const completeGoal = async (context, goalId) => {
  const goal = await getGoalOrThrow(context.client, context.householdId, goalId)
  if (goal.status === 'completed') {
    return { goal: attachProgress(goal) }
  }

  validateGoalTransition(goal.status, 'completed')

  const { data, error } = await context.client
    .from('planner_goals')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }
  if (!data) {
    throw createHttpError(404, 'Meta no encontrada.', 'goal_not_found')
  }

  return { goal: attachProgress(data) }
}

const failGoal = async (context, goalId) => {
  const goal = await getGoalOrThrow(context.client, context.householdId, goalId)
  if (goal.status === 'failed') {
    return { goal: attachProgress(goal) }
  }

  validateGoalTransition(goal.status, 'failed')

  const { data, error } = await context.client
    .from('planner_goals')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }
  if (!data) {
    throw createHttpError(404, 'Meta no encontrada.', 'goal_not_found')
  }

  return { goal: attachProgress(data) }
}

const getGoalForMilestone = async (client, householdId, goalId) => {
  const { data, error } = await client
    .from('planner_goals')
    .select('id, household_id')
    .eq('id', goalId)
    .eq('household_id', householdId)
    .is('deleted_at', null)
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
    achieved: hasOwn(body, 'achieved') ? Boolean(body.achieved) : false,
    achieved_at: Boolean(body?.achieved) ? new Date().toISOString() : null,
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

  return { milestone: data }
}

const updateMilestone = async (context, goalId, milestoneId, body) => {
  await getGoalForMilestone(context.client, context.householdId, goalId)

  const { data: existing, error: fetchError } = await context.client
    .from('planner_goal_milestones')
    .select('*')
    .eq('id', milestoneId)
    .eq('goal_id', goalId)
    .is('deleted_at', null)
    .maybeSingle()

  if (fetchError) {
    throwSupabaseError(fetchError)
  }
  if (!existing) {
    throw createHttpError(404, 'Milestone no encontrado.', 'milestone_not_found')
  }

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
    patch.achieved = Boolean(body.achieved)
    if (patch.achieved) {
      patch.achieved_at = existing.achieved_at ?? new Date().toISOString()
    } else {
      patch.achieved_at = null
    }
  }

  if (Object.keys(patch).length === 0) {
    return { milestone: existing }
  }

  const { data, error } = await context.client
    .from('planner_goal_milestones')
    .update(patch)
    .eq('id', milestoneId)
    .eq('goal_id', goalId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }
  if (!data) {
    throw createHttpError(404, 'Milestone no encontrado.', 'milestone_not_found')
  }

  return { milestone: data }
}

const deleteMilestone = async (context, goalId, milestoneId) => {
  await getGoalForMilestone(context.client, context.householdId, goalId)

  const { data: existing, error: fetchError } = await context.client
    .from('planner_goal_milestones')
    .select('*')
    .eq('id', milestoneId)
    .eq('goal_id', goalId)
    .is('deleted_at', null)
    .maybeSingle()

  if (fetchError) {
    throwSupabaseError(fetchError)
  }
  if (!existing) {
    throw createHttpError(404, 'Milestone no encontrado.', 'milestone_not_found')
  }

  const { data, error } = await context.client
    .from('planner_goal_milestones')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', milestoneId)
    .eq('goal_id', goalId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }
  if (!data) {
    throw createHttpError(404, 'Milestone no encontrado.', 'milestone_not_found')
  }

  return { milestone: data }
}

module.exports = {
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
  updateGoal,
  updateMilestone,
}