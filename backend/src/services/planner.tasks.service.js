const { createHttpError } = require('../lib/httpErrors')
const {
  TASK_PRIORITIES,
  TASK_STATUS_ORDER,
  TASK_TEMPLATE_KEYS,
} = require('../constants/planner.constants')

const ALLOWED_ORIGIN_MODULES = Object.freeze([
  'inventory',
  'assets',
  'finance',
  'geni',
  'automation',
])

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '')
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key)
const throwSupabaseError = (error) => {
  const isRlsViolation =
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    (typeof error.message === 'string' && error.message.toLowerCase().includes('row-level security'))

  if (isRlsViolation) {
    throw createHttpError(403, 'No tenes permiso para realizar esta accion sobre tareas.', 'rls_violation')
  }

  const httpError = createHttpError(500, error.message, error.code ?? 'internal_error')
  httpError.details = error.details
  httpError.hint = error.hint
  throw httpError
}

const isValidDateOnly = (value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))

const isValidTimeOnly = (value) =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)

const isTrueQuery = (value) => value === true || value === 'true' || value === '1'

const parseLimit = (value) => {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100
  }

  return Math.min(parsed, 100)
}

const sortTasks = (tasks) =>
  [...tasks].sort((left, right) => {
    const statusDiff = (TASK_STATUS_ORDER[left.status] ?? 99) - (TASK_STATUS_ORDER[right.status] ?? 99)

    if (statusDiff !== 0) {
      return statusDiff
    }

    const leftDue = left.due_date ?? '9999-12-31'
    const rightDue = right.due_date ?? '9999-12-31'

    if (leftDue !== rightDue) {
      return leftDue.localeCompare(rightDue)
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  })

const validatePriority = (priority) => {
  if (priority === undefined || priority === null || priority === '') {
    return 'medium'
  }

  if (!TASK_PRIORITIES.includes(priority)) {
    throw createHttpError(400, 'Prioridad invalida.', 'invalid_priority')
  }

  return priority
}

const validateTemplateKey = (templateKey) => {
  if (templateKey === undefined || templateKey === null || templateKey === '') {
    return null
  }

  if (!TASK_TEMPLATE_KEYS.includes(templateKey)) {
    throw createHttpError(400, 'Template invalida.', 'invalid_template_key')
  }

  return templateKey
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

const validateNullableTime = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (!isValidTimeOnly(value)) {
    throw createHttpError(400, `${fieldName} invalido.`, 'validation_error')
  }

  return value
}

const validateOriginModule = (value) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (!ALLOWED_ORIGIN_MODULES.includes(value)) {
    throw createHttpError(400, 'origin_module invalido.', 'validation_error')
  }

  return value
}

const validateOriginEntityType = (value) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const normalized = String(value).trim()

  if (normalized.length === 0) {
    throw createHttpError(400, 'origin_entity_type no puede estar vacio.', 'validation_error')
  }

  return normalized
}

const validateOriginEntityId = (value) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!uuidPattern.test(String(value))) {
    throw createHttpError(400, 'origin_entity_id debe ser un uuid valido.', 'validation_error')
  }

  return String(value)
}

const validateOriginReason = (value) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const normalized = String(value).trim()

  if (normalized.length === 0) {
    throw createHttpError(400, 'origin_reason no puede estar vacio.', 'validation_error')
  }

  return normalized
}

const validateGoalId = async (client, householdId, goalId) => {
  if (goalId === undefined || goalId === null || goalId === '') {
    return null
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!uuidPattern.test(String(goalId))) {
    throw createHttpError(400, 'goal_id debe ser un uuid valido.', 'validation_error')
  }

  const { data, error } = await client
    .from('planner_goals')
    .select('id')
    .eq('id', goalId)
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    throw createHttpError(400, 'goal_id no encontrado o no pertenece al household.', 'validation_error')
  }

  return goalId
}

const validateAssignment = async (client, householdId, assignedToMemberId) => {
  if (assignedToMemberId === undefined || assignedToMemberId === null || assignedToMemberId === '') {
    return null
  }

  const { data, error } = await client
    .from('household_members')
    .select('id')
    .eq('id', assignedToMemberId)
    .eq('household_id', householdId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    throw createHttpError(400, 'assigned_to_member_id invalido.', 'validation_error')
  }

  return assignedToMemberId
}

const hydrateMembers = async (client, tasks) => {
  const assignedMemberIds = [...new Set(tasks.map((task) => task.assigned_to_member_id).filter(Boolean))]
  const completedPersonIds = [...new Set(tasks.map((task) => task.completed_by_person_id).filter(Boolean))]
  const verifiedPersonIds = [...new Set(tasks.map((task) => task.verified_by_person_id).filter(Boolean))]

  if (assignedMemberIds.length === 0 && completedPersonIds.length === 0 && verifiedPersonIds.length === 0) {
    return tasks
  }

  const { data, error } = await client
    .from('household_members')
    .select('id, person_id, role, people(id, display_name, avatar_url)')
    .or(
      assignedMemberIds.length > 0
        ? `id.in.(${assignedMemberIds.join(',')})` +
            (completedPersonIds.length > 0 ? `,person_id.in.(${completedPersonIds.join(',')})` : '') +
            (verifiedPersonIds.length > 0 ? `,person_id.in.(${verifiedPersonIds.join(',')})` : '')
        : completedPersonIds.length > 0
          ? `person_id.in.(${completedPersonIds.join(',')})` +
              (verifiedPersonIds.length > 0 ? `,person_id.in.(${verifiedPersonIds.join(',')})` : '')
          : verifiedPersonIds.length > 0
            ? `person_id.in.(${verifiedPersonIds.join(',')})`
            : '',
    )

  if (error) {
    return tasks
  }

  const membersByMembershipId = new Map()
  const peopleByPersonId = new Map()

  ;(data ?? []).forEach((member) => {
    membersByMembershipId.set(member.id, {
      id: member.id,
      person_id: member.person_id,
      display_name: member.people?.display_name ?? null,
      avatar_url: member.people?.avatar_url ?? null,
      role: member.role,
    })
    if (!peopleByPersonId.has(member.person_id)) {
      peopleByPersonId.set(member.person_id, {
        id: member.person_id,
        person_id: member.person_id,
        display_name: member.people?.display_name ?? null,
        avatar_url: member.people?.avatar_url ?? null,
        role: member.role,
      })
    }
  })

  return tasks.map((task) => {
    const hydrated = { ...task }

    if (task.assigned_to_member_id && membersByMembershipId.has(task.assigned_to_member_id)) {
      hydrated.assigned_member = membersByMembershipId.get(task.assigned_to_member_id)
    }

    if (task.completed_by_person_id && peopleByPersonId.has(task.completed_by_person_id)) {
      hydrated.completed_member = peopleByPersonId.get(task.completed_by_person_id)
    }

    if (task.verified_by_person_id && peopleByPersonId.has(task.verified_by_person_id)) {
      hydrated.verified_member = peopleByPersonId.get(task.verified_by_person_id)
    }

    return hydrated
  })
}

const getTaskOrThrow = async (client, householdId, taskId) => {
  const { data, error } = await client
    .from('planner_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('household_id', householdId)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    throw createHttpError(404, 'Task no encontrada.', 'task_not_found')
  }

  return data
}

const listTasks = async (context, query) => {
  const limit = parseLimit(query.limit)
  let request = context.client
    .from('planner_tasks')
    .select('*')
    .eq('household_id', context.householdId)

  if (query.status) {
    request = request.eq('status', query.status)
  } else if (!isTrueQuery(query.include_cancelled)) {
    request = request.neq('status', 'cancelled')
  }

  if (query.goal_id) {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidPattern.test(String(query.goal_id))) {
      throw createHttpError(400, 'goal_id debe ser un uuid valido.', 'validation_error')
    }

    const { data: goalExists, error: goalErr } = await context.client
      .from('planner_goals')
      .select('id')
      .eq('id', query.goal_id)
      .eq('household_id', context.householdId)
      .is('deleted_at', null)
      .maybeSingle()

    if (goalErr) {
      throwSupabaseError(goalErr)
    }
    if (!goalExists) {
      throw createHttpError(404, 'Meta no encontrada o sin acceso.', 'goal_not_found')
    }

    request = request.eq('goal_id', query.goal_id)
  }

  if (query.assigned_to_member_id) {
    request = request.eq('assigned_to_member_id', query.assigned_to_member_id)
  }

  if (query.template_key) {
    request = request.eq('template_key', query.template_key)
  }

  if (query.from) {
    if (!isValidDateOnly(query.from)) {
      throw createHttpError(400, 'from invalido.', 'validation_error')
    }

    request = request.gte('due_date', query.from)
  }

  if (query.to) {
    if (!isValidDateOnly(query.to)) {
      throw createHttpError(400, 'to invalido.', 'validation_error')
    }

    request = request.lte('due_date', query.to)
  }

  const { data, error } = await request.limit(500)

  if (error) {
    throwSupabaseError(error)
  }

  const sorted = sortTasks(data ?? []).slice(0, limit)
  const hydrated = await hydrateMembers(context.client, sorted)

  return { tasks: hydrated }
}

const createTask = async (context, body) => {
  const title = normalizeString(body?.title)

  if (!title) {
    throw createHttpError(400, 'title es obligatorio.', 'validation_error')
  }

  const assignedToMemberId = await validateAssignment(
    context.client,
    context.householdId,
    body?.assigned_to_member_id,
  )

  const goalId = await validateGoalId(
    context.client,
    context.householdId,
    body?.goal_id,
  )

  const payload = {
    household_id: context.householdId,
    title,
    description: hasOwn(body, 'description') ? normalizeString(body.description) || null : null,
    priority: validatePriority(body?.priority),
    template_key: validateTemplateKey(body?.template_key),
    category: hasOwn(body, 'category') ? normalizeString(body.category) || null : null,
    due_date: validateNullableDate(body?.due_date, 'due_date'),
    due_time: validateNullableTime(body?.due_time, 'due_time'),
    requires_verification: Boolean(body?.requires_verification),
    created_by_person_id: context.personId,
    assigned_to_member_id: assignedToMemberId,
    goal_id: goalId,
  }

  const originModule = validateOriginModule(body?.origin_module)

  if (originModule) {
    payload.origin_module = originModule
    payload.origin_entity_type = validateOriginEntityType(body?.origin_entity_type)
    payload.origin_entity_id = validateOriginEntityId(body?.origin_entity_id)
    payload.origin_reason = validateOriginReason(body?.origin_reason)
  }

  const { data, error } = await context.client
    .from('planner_tasks')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throwSupabaseError(error)
  }

  return { task: data }
}

const buildTaskPatch = async (context, body) => {
  const patch = {}

  if (hasOwn(body, 'status')) {
    throw createHttpError(400, 'status no se modifica con PATCH.', 'validation_error')
  }

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

  if (hasOwn(body, 'priority')) {
    patch.priority = validatePriority(body.priority)
  }

  if (hasOwn(body, 'template_key')) {
    patch.template_key = validateTemplateKey(body.template_key)
  }

  if (hasOwn(body, 'category')) {
    patch.category = normalizeString(body.category) || null
  }

  if (hasOwn(body, 'due_date')) {
    patch.due_date = validateNullableDate(body.due_date, 'due_date')
  }

  if (hasOwn(body, 'due_time')) {
    patch.due_time = validateNullableTime(body.due_time, 'due_time')
  }

  if (hasOwn(body, 'assigned_to_member_id')) {
    patch.assigned_to_member_id = await validateAssignment(
      context.client,
      context.householdId,
      body.assigned_to_member_id,
    )
  }

  if (hasOwn(body, 'requires_verification')) {
    patch.requires_verification = Boolean(body.requires_verification)
  }

  if (hasOwn(body, 'goal_id')) {
    patch.goal_id = await validateGoalId(
      context.client,
      context.householdId,
      body.goal_id,
    )
  }

  return patch
}

const updateTask = async (context, taskId, body) => {
  await getTaskOrThrow(context.client, context.householdId, taskId)
  const patch = await buildTaskPatch(context, body ?? {})

  if (Object.keys(patch).length === 0) {
    return { task: await getTaskOrThrow(context.client, context.householdId, taskId) }
  }

  const { data, error } = await context.client
    .from('planner_tasks')
    .update(patch)
    .eq('id', taskId)
    .eq('household_id', context.householdId)
    .select('*')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    throw createHttpError(404, 'Task no encontrada.', 'task_not_found')
  }

  return { task: data }
}

const cancelTask = async (context, taskId) => {
  await getTaskOrThrow(context.client, context.householdId, taskId)

  const { data, error } = await context.client
    .from('planner_tasks')
    .update({ status: 'cancelled' })
    .eq('id', taskId)
    .eq('household_id', context.householdId)
    .select('*')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  return { task: data }
}

const completeTask = async (context, taskId) => {
  const task = await getTaskOrThrow(context.client, context.householdId, taskId)

  if (['completed', 'awaiting_verification', 'verified', 'cancelled'].includes(task.status)) {
    return { task }
  }

  const nextStatus = task.requires_verification ? 'awaiting_verification' : 'completed'

  const { data, error } = await context.client
    .from('planner_tasks')
    .update({
      status: nextStatus,
      completed_by_person_id: context.personId,
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('household_id', context.householdId)
    .select('*')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    throw createHttpError(404, 'Task no encontrada.', 'task_not_found')
  }

  const hydrated = await hydrateMembers(context.client, [data])
  return { task: hydrated[0] }
}

const verifyTask = async (context, taskId) => {
  const task = await getTaskOrThrow(context.client, context.householdId, taskId)

  if (task.status !== 'awaiting_verification') {
    throw createHttpError(409, 'La task no esta awaiting_verification.', 'task_not_awaiting_verification')
  }

  if (task.completed_by_person_id === context.personId) {
    throw createHttpError(409, 'La misma persona no puede verificar su completion.', 'cannot_verify_own_completion')
  }

  const { data, error } = await context.client
    .from('planner_tasks')
    .update({
      status: 'verified',
      verified_by_person_id: context.personId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('household_id', context.householdId)
    .select('*')
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    throw createHttpError(404, 'Task no encontrada.', 'task_not_found')
  }

  const hydrated = await hydrateMembers(context.client, [data])
  return { task: hydrated[0] }
}

module.exports = {
  cancelTask,
  completeTask,
  createTask,
  getTaskOrThrow,
  listTasks,
  updateTask,
  verifyTask,
}
