const { supabaseAdmin, hasSupabaseAdmin } = require('../config/supabase')

const isProduction = () => process.env.NODE_ENV === 'production'

const logFailure = (context, error) => {
  if (isProduction()) {
    return
  }
  console.warn('[planner.activity]', {
    message: 'Failed to record activity log entry',
    error: error?.message ?? String(error),
    code: error?.code ?? null,
    householdId: context?.householdId,
    membershipId: context?.membershipId,
  })
}

const pickTaskActivityState = (task) => {
  if (!task) return null
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    assigned_to_member_id: task.assigned_to_member_id ?? null,
    due_date: task.due_date ?? null,
    due_time: task.due_time ?? null,
    requires_verification: task.requires_verification ?? null,
    version: task.version,
    trashed_at: task.trashed_at ?? null,
    cancelled_at: task.cancelled_at ?? null,
    cancelled_from_status: task.cancelled_from_status ?? null,
    goal_id: task.goal_id ?? null,
  }
}

const pickEventActivityState = (event) => {
  if (!event) return null
  return {
    id: event.id,
    title: event.title,
    status: event.status,
    starts_at: event.starts_at,
    ends_at: event.ends_at ?? null,
    all_day: event.all_day ?? null,
    recurrence: event.recurrence ?? null,
    version: event.version,
    trashed_at: event.trashed_at ?? null,
    cancelled_at: event.cancelled_at ?? null,
    cancelled_from_status: event.cancelled_from_status ?? null,
    parent_event_id: event.parent_event_id ?? null,
    original_occurrence_start_at: event.original_occurrence_start_at ?? null,
  }
}

const pickGoalActivityState = (goal) => {
  if (!goal) return null
  return {
    id: goal.id,
    title: goal.title,
    status: goal.status,
    category: goal.category ?? null,
    visibility: goal.visibility ?? null,
    progress_mode: goal.progress_mode ?? null,
    target_type: goal.target_type ?? null,
    target_value: goal.target_value ?? null,
    current_value: goal.current_value ?? null,
    version: goal.version,
    trashed_at: goal.trashed_at ?? null,
    closed_at: goal.closed_at ?? null,
    closed_reason: goal.closed_reason ?? null,
    completed_at: goal.completed_at ?? null,
  }
}

const pickMilestoneActivityState = (milestone) => {
  if (!milestone) return null
  return {
    id: milestone.id,
    goal_id: milestone.goal_id,
    title: milestone.title,
    achieved: milestone.achieved ?? null,
    achieved_at: milestone.achieved_at ?? null,
    sort_order: milestone.sort_order ?? null,
    version: milestone.version,
    trashed_at: milestone.trashed_at ?? null,
  }
}

const recordPlannerActivity = async (context, input) => {
  if (!hasSupabaseAdmin) {
    if (!isProduction()) {
      console.warn('[planner.activity]', {
        message: 'supabaseAdmin not available; activity log skipped',
        householdId: context?.householdId,
      })
    }
    return
  }

  const {
    entityType,
    entityId,
    action,
    previousState,
    nextState,
    metadata,
  } = input

  if (!entityType || !entityId || !action) {
    if (!isProduction()) {
      console.warn('[planner.activity]', {
        message: 'Missing required fields for activity log',
        entityType,
        entityId,
        action,
      })
    }
    return
  }

  try {
    const payload = {
      household_id: context.householdId,
      actor_member_id: context.membershipId ?? null,
      actor_person_id: context.personId ?? null,
      entity_type: entityType,
      entity_id: entityId,
      action,
      previous_state: previousState ?? null,
      next_state: nextState ?? null,
      metadata: metadata ?? {},
    }

    const { error } = await supabaseAdmin
      .from('planner_activity_log')
      .insert(payload)

    if (error) {
      logFailure(context, error)
    }
  } catch (error) {
    logFailure(context, error)
  }
}

const ALLOWED_ENTITY_TYPES = Object.freeze(['task', 'event', 'goal', 'milestone'])

const parseListLimit = (value) => {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 50
  }
  return Math.min(parsed, 100)
}

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0

const listActivity = async (context, query) => {
  const limit = parseListLimit(query?.limit)
  const entityType = isNonEmptyString(query?.entity_type) ? query.entity_type.trim() : null
  const entityId = isNonEmptyString(query?.entity_id) ? query.entity_id.trim() : null
  const action = isNonEmptyString(query?.action) ? query.action.trim() : null

  if (entityType !== null && !ALLOWED_ENTITY_TYPES.includes(entityType)) {
    const error = new Error('entity_type invalido.')
    error.statusCode = 400
    error.code = 'validation_error'
    throw error
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (entityId !== null && !uuidPattern.test(entityId)) {
    const error = new Error('entity_id debe ser un uuid valido.')
    error.statusCode = 400
    error.code = 'validation_error'
    throw error
  }

  let request = context.client
    .from('planner_activity_log')
    .select('*')
    .eq('household_id', context.householdId)

  if (entityType !== null) {
    request = request.eq('entity_type', entityType)
  }
  if (entityId !== null) {
    request = request.eq('entity_id', entityId)
  }
  if (action !== null) {
    request = request.eq('action', action)
  }

  const { data, error } = await request
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    const httpError = new Error(error.message)
    httpError.statusCode = 500
    httpError.code = error.code ?? 'internal_error'
    throw httpError
  }

  return { items: data ?? [] }
}

module.exports = {
  listActivity,
  pickEventActivityState,
  pickGoalActivityState,
  pickMilestoneActivityState,
  pickTaskActivityState,
  recordPlannerActivity,
}