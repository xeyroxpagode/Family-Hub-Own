const { createHttpError } = require('../lib/httpErrors')
const { resolveCapabilities, assertCapability, hasCapability } = require('../lib/plannerCapabilities')
const { hashIdempotencyRequestV2 } = require('../lib/plannerIdempotencyAdapter')
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
const PROTECTED_TASK_CREATE_FIELDS = Object.freeze([
  'status',
  'completed_by_member_id',
  'completed_by_person_id',
  'completed_at',
  'verified_by_member_id',
  'verified_by_person_id',
  'verified_at',
  'cancelled_at',
  'cancelled_by_member_id',
  'cancelled_reason',
  'cancelled_from_status',
  'trashed_at',
  'trashed_by_member_id',
  'version',
])

const assertTaskCreateBody = (body) => {
  const protectedField = PROTECTED_TASK_CREATE_FIELDS.find((field) => hasOwn(body, field))
  if (protectedField) {
    throw createHttpError(
      400,
      'La creaciÃ³n de tareas no acepta estado ni metadata de lifecycle.',
      'protected_task_lifecycle_field',
    )
  }
}

const resolveContextCapabilities = (context) => resolveCapabilities({
  role: context.membership?.role,
  membershipStatus: context.membership?.status,
  household: context.household,
})

const assertTaskCompletionCapabilities = (context, completionAuth) => {
  const capabilities = resolveContextCapabilities(context)
  assertCapability(capabilities, 'planner.view')

  let allowed = false
  if (completionAuth.assignmentKind === 'legacy_unassigned') {
    allowed = hasCapability(capabilities, 'task.complete_unassigned')
      || hasCapability(capabilities, 'task.complete_any')
  } else if (completionAuth.assignmentKind === 'anyone' || completionAuth.isAssignee) {
    allowed = hasCapability(capabilities, 'task.complete_assigned')
  } else {
    allowed = hasCapability(capabilities, 'task.complete_any')
  }

  if (!allowed) assertCapability(capabilities, 'task.complete_any')
}

const assertTaskVerificationCapabilities = (context) => {
  const capabilities = resolveContextCapabilities(context)
  assertCapability(capabilities, 'planner.view')
  assertCapability(capabilities, 'task.verify')
}

const V1_ASSIGNMENT_KINDS = Object.freeze(['anyone', 'members'])
const V1_FULFILLMENT_MODES = Object.freeze(['shared_once', 'each_person'])
const V1_FULFILLMENT_ACTIONS = Object.freeze([
  'complete',
  'verify',
  'request_correction',
  'resubmit',
  'revert',
  'reopen',
])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const V1_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const assertV1Uuid = (value, fieldName) => {
  if (typeof value !== 'string' || !V1_UUID_RE.test(value)) {
    throw createHttpError(400, `${fieldName} debe ser un UUID válido.`, 'validation_error')
  }
}

const mapV1Outcome = (data, expectedVersion) => {
  const outcome = data?.outcome
  if (outcome === 'updated' || outcome === 'noop' || outcome === 'replay') return data

  const definitions = {
    not_found: [404, 'Tarea no encontrada.', 'task_not_found'],
    invalid_assignment: [400, 'La configuraciÃ³n de asignaciÃ³n no es vÃ¡lida.', 'invalid_assignment'],
    assignment_member_not_active: [400, 'Una persona asignada no es miembro activo.', 'assignment_member_not_active'],
    assignment_member_wrong_household: [400, 'Una persona asignada pertenece a otro hogar.', 'assignment_member_wrong_household'],
    assignment_history_requires_explicit_transition: [409, 'La asignaciÃ³n tiene historial y requiere confirmaciÃ³n explÃ­cita.', 'assignment_history_requires_explicit_transition'],
    legacy_assignment_requires_explicit_resolution: [409, 'La asignaciÃ³n legacy requiere resoluciÃ³n explÃ­cita.', 'legacy_assignment_requires_explicit_resolution'],
    already_claimed: [409, 'Otra persona ya tomÃ³ esta tarea.', 'already_claimed'],
    fulfillment_not_current: [409, 'El cumplimiento ya no es una obligaciÃ³n actual.', 'fulfillment_not_current'],
    fulfillment_not_responsible: [403, 'No sos responsable de este cumplimiento.', 'fulfillment_not_responsible'],
    fulfillment_invalid_transition: [409, 'La transiciÃ³n de cumplimiento no es vÃ¡lida.', 'fulfillment_invalid_transition'],
    self_verification_not_allowed: [409, 'La misma persona no puede verificar su cumplimiento.', 'self_verification_not_allowed'],
    task_not_operational: [409, 'La tarea no estÃ¡ operativa.', 'task_not_operational'],
    planner_forbidden: [403, 'No tenés permiso para realizar esta acción.', 'planner_forbidden'],
    idempotency_conflict: [409, 'La operación ya fue procesada con otros datos.', 'idempotency_conflict'],
    idempotency_context_required: [422, 'Falta el contexto canónico de idempotencia.', 'idempotency_context_required'],
    expected_version_required: [422, 'If-Match es obligatorio.', 'expected_version_required'],
  }

  if (outcome === 'version_conflict') {
    throw createHttpError(412, 'La versiÃ³n cambiÃ³. ActualizÃ¡ y reintentÃ¡.', 'version_conflict_v2', {
      current: Number(data.current_version),
      expected: Number(expectedVersion),
    })
  }

  const definition = definitions[outcome]
  if (!definition) {
    throw createHttpError(500, 'Respuesta transaccional invÃ¡lida.', 'planner_task_v1_transaction_failed')
  }
  throw createHttpError(definition[0], definition[1], definition[2])
}
const throwSupabaseError = (error) => {
  if (error?.code === 'P0008') {
    throw createHttpError(409, 'La operación ya fue procesada con otros datos.', 'idempotency_conflict')
  }
  if (error?.code === 'P0009') {
    throw createHttpError(409, 'La operación ya se está procesando. Reintentá en unos segundos.', 'idempotency_in_flight')
  }
  if (
    error?.message === 'assignment_history_requires_explicit_transition'
    || error?.details === 'assignment_history_requires_explicit_transition'
  ) {
    throw createHttpError(
      409,
      'La asignación tiene historial y requiere una transición explícita.',
      'assignment_history_requires_explicit_transition',
    )
  }

  const isRlsViolation =
    error.code === '42501' ||
    error.code === 'PGRST301' ||
    (typeof error.message === 'string' && error.message.toLowerCase().includes('row-level security'))

  if (isRlsViolation) {
    throw createHttpError(403, 'No tenes permiso para realizar esta accion sobre tareas.', 'rls_violation')
  }

  const httpError = createHttpError(500, 'Error interno.', 'internal_error')
  httpError.internalCode = error.code ?? null
  httpError.details = error.details
  httpError.hint = error.hint
  throw httpError
}

const normalizePriority = (priority) => {
  if (priority === undefined || priority === null || priority === '') {
    return 'normal'
  }
  if (priority === 'medium') return 'normal'
  if (priority === 'critical') return 'high'
  return priority
}

const validatePriority = (priority) => {
  const normalized = normalizePriority(priority)
  if (!TASK_PRIORITIES.includes(normalized)) {
    throw createHttpError(400, 'Prioridad invalida.', 'invalid_task_priority')
  }
  return normalized
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
    .is('trashed_at', null)
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
  const completedMemberIds = [...new Set(tasks.map((task) => task.completed_by_member_id).filter(Boolean))]
  const verifiedMemberIds = [...new Set(tasks.map((task) => task.verified_by_member_id).filter(Boolean))]
  const completedPersonIds = [...new Set(tasks.map((task) => task.completed_by_person_id).filter(Boolean))]
    .filter((pid) => !tasks.some((t) => t.completed_by_member_id && t.completed_by_person_id === pid && completedMemberIds.includes(t.completed_by_member_id)))
  const verifiedPersonIds = [...new Set(tasks.map((task) => task.verified_by_person_id).filter(Boolean))]
    .filter((pid) => !tasks.some((t) => t.verified_by_member_id && t.verified_by_person_id === pid && verifiedMemberIds.includes(t.verified_by_member_id)))

  const hasAnyIds =
    assignedMemberIds.length > 0 ||
    completedMemberIds.length > 0 ||
    verifiedMemberIds.length > 0 ||
    completedPersonIds.length > 0 ||
    verifiedPersonIds.length > 0

  if (!hasAnyIds) {
    return tasks
  }

  const allMemberIdFilters = []
  if (assignedMemberIds.length > 0) allMemberIdFilters.push(`id.in.(${assignedMemberIds.join(',')})`)
  if (completedMemberIds.length > 0) allMemberIdFilters.push(`id.in.(${completedMemberIds.join(',')})`)
  if (verifiedMemberIds.length > 0) allMemberIdFilters.push(`id.in.(${verifiedMemberIds.join(',')})`)

  const allPersonIdFilters = []
  if (completedPersonIds.length > 0) allPersonIdFilters.push(`person_id.in.(${completedPersonIds.join(',')})`)
  if (verifiedPersonIds.length > 0) allPersonIdFilters.push(`person_id.in.(${verifiedPersonIds.join(',')})`)

  const orFilter = [...allMemberIdFilters, ...allPersonIdFilters].join(',')

  if (!orFilter) {
    return tasks
  }

  const { data, error } = await client
    .from('household_members')
    .select('id, person_id, role, people(id, display_name, avatar_url)')
    .or(orFilter)

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

    if (task.completed_by_member_id && membersByMembershipId.has(task.completed_by_member_id)) {
      hydrated.completed_member = membersByMembershipId.get(task.completed_by_member_id)
    } else if (task.completed_by_person_id && peopleByPersonId.has(task.completed_by_person_id)) {
      hydrated.completed_member = peopleByPersonId.get(task.completed_by_person_id)
    }

    if (task.verified_by_member_id && membersByMembershipId.has(task.verified_by_member_id)) {
      hydrated.verified_member = membersByMembershipId.get(task.verified_by_member_id)
    } else if (task.verified_by_person_id && peopleByPersonId.has(task.verified_by_person_id)) {
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
    .is('trashed_at', null)
    .maybeSingle()

  if (error) {
    throwSupabaseError(error)
  }

  if (!data) {
    throw createHttpError(404, 'Tarea no encontrada.', 'task_not_found')
  }

  return data
}

const getTaskById = async (context, taskId) => {
  const task = await getTaskOrThrow(context.client, context.householdId, taskId)
  return { task }
}

const getTaskForTrashOperation = async (client, householdId, taskId) => {
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
    throw createHttpError(404, 'Tarea no encontrada.', 'task_not_found')
  }

  return data
}

const listTasks = async (context, query) => {
  const limit = parseLimit(query.limit)
  let request = context.client
    .from('planner_tasks')
    .select('*')
    .eq('household_id', context.householdId)
    .is('trashed_at', null)

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
      .is('trashed_at', null)
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

const normalizeNullableUuid = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null
  if (!UUID_RE.test(String(value))) {
    throw createHttpError(400, `${fieldName} debe ser un uuid valido.`, 'validation_error')
  }
  return String(value)
}

const mapV0Outcome = (data, expectedVersion) => {
  const outcome = data?.outcome
  if (['created', 'updated', 'noop', 'replay'].includes(outcome)) return data

  const definitions = {
    not_found: [404, 'Tarea no encontrada.', 'task_not_found'],
    planner_forbidden: [403, 'No tenes permiso para realizar esta accion sobre tareas.', 'planner_forbidden'],
    forbidden: [403, 'No tenes permiso para realizar esta accion sobre tareas.', 'planner_forbidden'],
    validation_error: [400, 'Payload de tarea invalido.', 'validation_error'],
    invalid_transition: [409, 'Transicion de tarea invalida.', 'task_invalid_transition'],
    invalid_state: [409, 'La task no esta awaiting_verification.', 'task_not_awaiting_verification'],
    self_verification: [409, 'La misma persona no puede verificar su completion.', 'cannot_verify_own_completion'],
    task_not_operational: [409, 'La tarea no esta operativa.', 'task_not_operational'],
    task_in_trash: [409, 'La tarea esta en la papelera. Restaurala desde alli.', 'task_in_trash'],
    idempotency_conflict: [409, 'La operacion ya fue procesada con otros datos.', 'idempotency_conflict'],
    idempotency_context_required: [422, 'Falta el contexto canonico de idempotencia.', 'idempotency_context_required'],
    expected_version_required: [422, 'If-Match es obligatorio.', 'expected_version_required'],
  }

  if (outcome === 'version_conflict') {
    throw createHttpError(412, 'La version de la entidad cambio. Actualiza y reintenta.', 'version_conflict_v2', {
      current: Number(data.current_version),
      expected: Number(expectedVersion),
    })
  }

  const definition = definitions[outcome]
  if (!definition) {
    throw createHttpError(500, 'Respuesta transaccional invalida.', 'planner_task_v0_transaction_failed')
  }
  throw createHttpError(definition[0], definition[1], definition[2])
}

const invokeTaskV0AtomicMutation = async (context, {
  action,
  taskId,
  expectedVersion,
  payload,
  correlation,
}) => {
  const operation = correlation.operation
  const payloadHash = hashIdempotencyRequestV2({
    operation,
    scopeType: 'household',
    scopeId: context.householdId,
    targetId: taskId ?? null,
    payload,
    expectedVersion: expectedVersion ?? null,
    mutationId: correlation.mutationId,
  })

  const { data, error } = await context.client.rpc('mutate_planner_task_v0', {
    p_household_id: context.householdId,
    p_task_id: taskId ?? null,
    p_action: action,
    p_expected_version: expectedVersion ?? null,
    p_payload: payload ?? {},
    p_request_id: correlation.requestId ?? null,
    p_mutation_id: correlation.mutationId,
    p_idempotency_key: correlation.idempotencyKey,
    p_operation: operation,
    p_payload_hash: payloadHash,
  })

  if (error) throwSupabaseError(error)
  return data
}

const hydrateTaskResult = async (context, data, expectedVersion) => {
  const mapped = mapV0Outcome(data, expectedVersion)
  if (!mapped?.task) {
    throw createHttpError(500, 'Respuesta transaccional invalida.', 'planner_task_v0_transaction_failed')
  }
  const hydrated = await hydrateMembers(context.client, [mapped.task])
  return {
    task: hydrated[0],
    correlation: { audit_event_id: mapped.audit_event_id ?? null },
  }
}

const createTask = async (context, body, correlation = {}) => {
  assertTaskCreateBody(body)

  if (body?.visibility === 'personal') {
    throw createHttpError(
      400,
      'Las tareas personales todavía no están disponibles.',
      'personal_tasks_not_supported',
    )
  }

  const title = normalizeString(body?.title)

  if (!title) {
    throw createHttpError(400, 'title es obligatorio.', 'validation_error')
  }

  const payload = {
    title,
    description: hasOwn(body, 'description') ? normalizeString(body.description) || null : null,
    priority: validatePriority(body?.priority),
    template_key: validateTemplateKey(body?.template_key),
    category: hasOwn(body, 'category') ? normalizeString(body.category) || null : null,
    due_date: validateNullableDate(body?.due_date, 'due_date'),
    due_time: validateNullableTime(body?.due_time, 'due_time'),
    requires_verification: Boolean(body?.requires_verification),
    assigned_to_member_id: normalizeNullableUuid(body?.assigned_to_member_id, 'assigned_to_member_id'),
    goal_id: normalizeNullableUuid(body?.goal_id, 'goal_id'),
  }

  const originModule = validateOriginModule(body?.origin_module)

  if (originModule) {
    payload.origin_module = originModule
    payload.origin_entity_type = validateOriginEntityType(body?.origin_entity_type)
    payload.origin_entity_id = validateOriginEntityId(body?.origin_entity_id)
    payload.origin_reason = validateOriginReason(body?.origin_reason)
  }

  const data = await invokeTaskV0AtomicMutation(context, {
    action: 'create',
    taskId: null,
    expectedVersion: null,
    payload,
    correlation,
  })
  return hydrateTaskResult(context, data, null)
}

const getTaskCompletionAuthorization = async (context, taskId) => {
  await getTaskOrThrow(context.client, context.householdId, taskId)

  const { data: config, error: configError } = await context.client
    .from('planner_task_assignment_configs')
    .select('assignment_kind, fulfillment_mode')
    .eq('task_id', taskId)
    .eq('household_id', context.householdId)
    .maybeSingle()

  if (configError) throwSupabaseError(configError)
  if (!config) {
    throw createHttpError(500, 'La tarea no tiene una asignación canónica.', 'task_assignment_missing')
  }

  const { data: assignee, error: assigneeError } = await context.client
    .from('planner_task_assignees')
    .select('id')
    .eq('task_id', taskId)
    .eq('member_id', context.membershipId)
    .is('revoked_at', null)
    .maybeSingle()

  if (assigneeError) throwSupabaseError(assigneeError)
  return {
    assignmentKind: config.assignment_kind,
    fulfillmentMode: config.fulfillment_mode,
    isAssignee: Boolean(assignee),
  }
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
    if (body.assigned_to_member_id === undefined || body.assigned_to_member_id === null || body.assigned_to_member_id === '') {
      patch.assigned_to_member_id = null
    } else if (!UUID_RE.test(String(body.assigned_to_member_id))) {
      throw createHttpError(400, 'assigned_to_member_id invalido.', 'validation_error')
    } else {
      patch.assigned_to_member_id = String(body.assigned_to_member_id)
    }
  }

  if (hasOwn(body, 'requires_verification')) {
    patch.requires_verification = Boolean(body.requires_verification)
  }

  if (hasOwn(body, 'goal_id')) {
    if (body.goal_id === undefined || body.goal_id === null || body.goal_id === '') {
      patch.goal_id = null
    } else if (!UUID_RE.test(String(body.goal_id))) {
      throw createHttpError(400, 'goal_id debe ser un uuid valido.', 'validation_error')
    } else {
      patch.goal_id = String(body.goal_id)
    }
  }

  return patch
}

const updateTask = async (context, taskId, body, expectedVersion, correlation = {}) => {
  const patch = await buildTaskPatch(context, body ?? {})
  const data = await invokeTaskV0AtomicMutation(context, {
    action: 'update',
    taskId,
    expectedVersion,
    payload: patch,
    correlation,
  })
  return hydrateTaskResult(context, data, expectedVersion)
}

const cancelTask = async (context, taskId, expectedVersion, body = {}, correlation = {}) => {
  const payload = {
    reason: hasOwn(body, 'reason') ? normalizeString(body.reason) || null : null,
  }
  const data = await invokeTaskV0AtomicMutation(context, {
    action: 'cancel',
    taskId,
    expectedVersion,
    payload,
    correlation,
  })
  return hydrateTaskResult(context, data, expectedVersion)
}

const reactivateTask = async (context, taskId, expectedVersion, correlation = {}) => {
  const data = await invokeTaskV0AtomicMutation(context, {
    action: 'reactivate',
    taskId,
    expectedVersion,
    payload: {},
    correlation,
  })
  return hydrateTaskResult(context, data, expectedVersion)
}

const completeTask = async (context, taskId, expectedVersion, correlation = {}) => {
  const completionAuth = await getTaskCompletionAuthorization(context, taskId)
  assertTaskCompletionCapabilities(context, completionAuth)
  const data = await invokeTaskV0AtomicMutation(context, {
    action: 'complete',
    taskId,
    expectedVersion,
    payload: {},
    correlation,
  })
  return hydrateTaskResult(context, data, expectedVersion)
}

const verifyTaskViaFulfillment = async (context, taskId, expectedVersion, correlation = {}) => {
  assertTaskVerificationCapabilities(context)
  const data = await invokeTaskV0AtomicMutation(context, {
    action: 'verify',
    taskId,
    expectedVersion,
    payload: {},
    correlation,
  })
  return hydrateTaskResult(context, data, expectedVersion)
}

const trashTask = async (context, taskId, expectedVersion, correlation = {}) => {
  const data = await invokeTaskV0AtomicMutation(context, {
    action: 'trash',
    taskId,
    expectedVersion,
    payload: {},
    correlation,
  })
  return hydrateTaskResult(context, data, expectedVersion)
}

const restoreTask = async (context, taskId, expectedVersion, correlation = {}) => {
  const data = await invokeTaskV0AtomicMutation(context, {
    action: 'restore',
    taskId,
    expectedVersion,
    payload: {},
    correlation,
  })
  return hydrateTaskResult(context, data, expectedVersion)
}

const getV1Foundation = async (context, taskId, options = {}) => {
  let taskQuery = context.client
    .from('planner_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('household_id', context.householdId)
  if (!options.includeTrashed) taskQuery = taskQuery.is('trashed_at', null)

  const [taskResult, configResult, assigneeResult, fulfillmentResult] = await Promise.all([
    taskQuery.maybeSingle(),
    context.client
      .from('planner_task_assignment_configs')
      .select('*')
      .eq('task_id', taskId)
      .eq('household_id', context.householdId)
      .maybeSingle(),
    context.client
      .from('planner_task_assignees')
      .select('*')
      .eq('task_id', taskId)
      .eq('household_id', context.householdId)
      .is('revoked_at', null)
      .order('created_at', { ascending: true }),
    context.client
      .from('planner_task_fulfillments')
      .select('*')
      .eq('task_id', taskId)
      .eq('household_id', context.householdId)
      .order('created_at', { ascending: true }),
  ])

  for (const result of [taskResult, configResult, assigneeResult, fulfillmentResult]) {
    if (result.error) throwSupabaseError(result.error)
  }
  if (!taskResult.data || !configResult.data) {
    throw createHttpError(404, 'Tarea no encontrada.', 'task_not_found')
  }
  return {
    task: taskResult.data,
    config: configResult.data,
    assignees: assigneeResult.data ?? [],
    fulfillments: fulfillmentResult.data ?? [],
  }
}

const loadV1MemberMap = async (context, foundation) => {
  const ids = [...new Set([
    ...foundation.assignees.map((item) => item.member_id),
    ...foundation.fulfillments.flatMap((item) => [
      item.responsible_member_id,
      item.completed_by_member_id,
      item.verified_by_member_id,
      item.correction_requested_by_member_id,
      item.resubmitted_by_member_id,
    ]),
  ].filter(Boolean))]
  if (ids.length === 0) return new Map()

  const { data, error } = await context.client
    .from('household_members')
    .select('id, person_id, role, status, people(id, display_name, avatar_url)')
    .eq('household_id', context.householdId)
    .in('id', ids)
  if (error) throwSupabaseError(error)

  return new Map((data ?? []).map((member) => [member.id, {
    id: member.id,
    personId: member.person_id,
    displayName: member.people?.display_name ?? null,
    avatarUrl: member.people?.avatar_url ?? null,
    role: member.role,
    status: member.status,
  }]))
}

const buildV1Aggregate = (fulfillments) => {
  const current = fulfillments.filter((item) => !item.retired_at && !item.inactive_at)
  const counts = {
    total: current.length,
    pending: 0,
    completed: 0,
    awaitingVerification: 0,
    correctionRequested: 0,
    verified: 0,
  }
  current.forEach((item) => {
    if (item.status === 'pending') counts.pending += 1
    else if (item.status === 'completed') counts.completed += 1
    else if (item.status === 'awaiting_verification') counts.awaitingVerification += 1
    else if (item.status === 'correction_requested') counts.correctionRequested += 1
    else if (item.status === 'verified') counts.verified += 1
  })

  let state = 'pending'
  if (counts.correctionRequested > 0) state = 'correction_requested'
  else if (counts.total === 0 || counts.pending === counts.total) state = 'pending'
  else if (counts.pending > 0) state = 'partially_completed'
  else if (counts.awaitingVerification > 0) state = 'awaiting_verification'
  else if (counts.verified === counts.total) state = 'verified'
  else if (counts.completed + counts.verified === counts.total) state = 'completed'

  return { state, ...counts }
}

const canCompleteV1Fulfillment = (context, foundation, fulfillment, capabilities) => {
  const isAssignee = foundation.assignees.some((item) => item.member_id === context.membershipId)
  if (foundation.config.assignment_kind === 'legacy_unassigned') {
    return hasCapability(capabilities, 'task.complete_unassigned') || hasCapability(capabilities, 'task.complete_any')
  }
  if (fulfillment.fulfillment_scope === 'individual' && fulfillment.responsible_member_id === context.membershipId) {
    return hasCapability(capabilities, 'task.complete_assigned')
  }
  if (fulfillment.fulfillment_scope === 'shared' && foundation.config.assignment_kind === 'anyone') {
    return hasCapability(capabilities, 'task.complete_assigned')
  }
  if (fulfillment.fulfillment_scope === 'shared' && isAssignee) {
    return hasCapability(capabilities, 'task.complete_assigned')
  }
  return hasCapability(capabilities, 'task.complete_any')
}

const buildV1AvailableActions = (context, foundation) => {
  const capabilities = resolveContextCapabilities(context)
  const actions = []
  const operational = !foundation.task.trashed_at && foundation.task.status !== 'cancelled'
  if (!operational) return actions

  const editCapability = foundation.task.created_by_member_id === context.membershipId
    ? 'task.edit_own'
    : 'task.edit_any'
  if (hasCapability(capabilities, editCapability)) actions.push({ action: 'change_assignment' })

  const current = foundation.fulfillments.filter((item) => !item.retired_at && !item.inactive_at)
  if (
    foundation.config.assignment_kind === 'anyone'
    && current.some((item) => item.fulfillment_scope === 'shared' && item.status === 'pending')
    && hasCapability(capabilities, 'task.complete_assigned')
  ) actions.push({ action: 'claim' })

  current.forEach((fulfillment) => {
    const target = { fulfillmentId: fulfillment.id }
    const canComplete = canCompleteV1Fulfillment(context, foundation, fulfillment, capabilities)
    const canManageOwn = fulfillment.responsible_member_id === context.membershipId
      || fulfillment.completed_by_member_id === context.membershipId
      || hasCapability(capabilities, 'task.complete_any')
    const canVerify = hasCapability(capabilities, 'task.verify')
      && fulfillment.completed_by_member_id !== context.membershipId

    if (fulfillment.status === 'pending' && canComplete) actions.push({ action: 'complete', ...target })
    if (fulfillment.status === 'awaiting_verification' && canVerify) {
      actions.push({ action: 'verify', ...target }, { action: 'request_correction', ...target })
    }
    if (fulfillment.status === 'correction_requested' && canManageOwn) actions.push({ action: 'resubmit', ...target })
    if (fulfillment.status === 'completed' && canManageOwn) actions.push({ action: 'revert', ...target })
    if (fulfillment.status === 'verified' && hasCapability(capabilities, 'task.verify')) {
      actions.push({ action: 'reopen', ...target })
    }
  })
  return actions
}

const getTaskFulfillmentV1 = async (context, taskId) => {
  assertV1Uuid(taskId, 'taskId')
  const capabilities = resolveContextCapabilities(context)
  assertCapability(capabilities, 'planner.view')
  const foundation = await getV1Foundation(context, taskId)
  const members = await loadV1MemberMap(context, foundation)
  const member = (id) => (id ? members.get(id) ?? null : null)

  return {
    task: {
      taskId: foundation.task.id,
      taskVersion: foundation.task.version,
      assignment: {
        kind: foundation.config.assignment_kind,
        mode: foundation.config.fulfillment_mode,
        version: foundation.config.version,
        legacyResolutionRequired: foundation.config.assignment_kind === 'legacy_unassigned',
        assignees: foundation.assignees.map((item) => member(item.member_id)).filter(Boolean),
      },
      fulfillments: foundation.fulfillments.map((item) => ({
        id: item.id,
        scope: item.fulfillment_scope,
        responsibleMember: member(item.responsible_member_id),
        status: item.status,
        version: item.version,
        completedBy: member(item.completed_by_member_id),
        completedAt: item.completed_at,
        verifiedBy: member(item.verified_by_member_id),
        verifiedAt: item.verified_at,
        correctionRequestedBy: member(item.correction_requested_by_member_id),
        correctionRequestedAt: item.correction_requested_at,
        correctionComment: item.correction_comment,
        resubmittedBy: member(item.resubmitted_by_member_id),
        resubmittedAt: item.resubmitted_at,
        resubmissionNote: item.resubmission_note,
        inactiveAt: item.inactive_at,
        retiredAt: item.retired_at,
      })),
      aggregate: buildV1Aggregate(foundation.fulfillments),
      availableActions: buildV1AvailableActions(context, foundation),
    },
  }
}

const invokeTaskV1AtomicMutation = async (context, {
  operation,
  targetId,
  expectedVersion,
  payload,
  correlation,
  rpc,
}) => {
  const payloadHash = hashIdempotencyRequestV2({
    operation,
    scopeType: 'household',
    scopeId: context.householdId,
    targetId,
    payload,
    expectedVersion,
    mutationId: correlation.mutationId,
  })
  return rpc({
    payloadHash,
    operation,
    mutationId: correlation.mutationId,
    idempotencyKey: correlation.idempotencyKey,
  })
}

const assertV1EditCapability = async (context, taskId) => {
  const task = await getTaskOrThrow(context.client, context.householdId, taskId)
  const capabilities = resolveContextCapabilities(context)
  assertCapability(capabilities, 'planner.view')
  assertCapability(capabilities, task.created_by_member_id === context.membershipId ? 'task.edit_own' : 'task.edit_any')
}

const updateTaskAssignmentV1 = async (context, taskId, body, expectedVersion, correlation = {}) => {
  assertV1Uuid(taskId, 'taskId')
  const kind = body?.assignmentKind ?? body?.kind
  const mode = body?.fulfillmentMode ?? body?.mode
  const memberIds = body?.memberIds ?? body?.member_ids ?? []
  if (
    !V1_ASSIGNMENT_KINDS.includes(kind)
    || !V1_FULFILLMENT_MODES.includes(mode)
    || !Array.isArray(memberIds)
    || memberIds.some((memberId) => typeof memberId !== 'string' || !V1_UUID_RE.test(memberId))
    || new Set(memberIds).size !== memberIds.length
  ) {
    throw createHttpError(400, 'La configuraciÃ³n de asignaciÃ³n no es vÃ¡lida.', 'invalid_assignment')
  }

  await assertV1EditCapability(context, taskId)

  const payload = {
    assignmentKind: kind,
    fulfillmentMode: mode,
    memberIds,
    confirmHistoricalTransition: body?.confirmHistoricalTransition === true,
    confirmLegacyResolution: body?.confirmLegacyResolution === true,
  }
  const data = await invokeTaskV1AtomicMutation(context, {
    operation: correlation.operation,
    targetId: taskId,
    expectedVersion,
    payload,
    correlation,
    rpc: async (call) => {
      const { data: rpcData, error } = await context.client.rpc('update_planner_task_assignment_v1', {
        p_household_id: context.householdId,
        p_task_id: taskId,
        p_expected_version: expectedVersion,
        p_assignment_kind: kind,
        p_fulfillment_mode: mode,
        p_member_ids: memberIds,
        p_confirm_historical_transition: payload.confirmHistoricalTransition,
        p_confirm_legacy_resolution: payload.confirmLegacyResolution,
        p_request_id: correlation.requestId ?? null,
        p_mutation_id: call.mutationId,
        p_idempotency_key: call.idempotencyKey,
        p_operation: call.operation,
        p_payload_hash: call.payloadHash,
      })
      if (error) throwSupabaseError(error)
      return rpcData
    },
  })
  mapV1Outcome(data, expectedVersion)
  return getTaskFulfillmentV1(context, taskId)
}

const claimTaskV1 = async (context, taskId, expectedVersion, correlation = {}) => {
  assertV1Uuid(taskId, 'taskId')
  const capabilities = resolveContextCapabilities(context)
  assertCapability(capabilities, 'planner.view')
  assertCapability(capabilities, 'task.complete_assigned')
  const data = await invokeTaskV1AtomicMutation(context, {
    operation: correlation.operation,
    targetId: taskId,
    expectedVersion,
    payload: null,
    correlation,
    rpc: async (call) => {
      const { data: rpcData, error } = await context.client.rpc('claim_planner_task_v1', {
        p_household_id: context.householdId,
        p_task_id: taskId,
        p_expected_version: expectedVersion,
        p_request_id: correlation.requestId ?? null,
        p_mutation_id: call.mutationId,
        p_idempotency_key: call.idempotencyKey,
        p_operation: call.operation,
        p_payload_hash: call.payloadHash,
      })
      if (error) throwSupabaseError(error)
      return rpcData
    },
  })
  if (data?.outcome === 'already_claimed') {
    const current = await getTaskFulfillmentV1(context, taskId)
    throw createHttpError(409, 'Otra persona ya tomó esta tarea.', 'already_claimed', {
      current: current.task,
    })
  }
  mapV1Outcome(data, expectedVersion)
  return getTaskFulfillmentV1(context, taskId)
}

const assertV1FulfillmentCapability = async (context, taskId, fulfillmentId, action) => {
  const capabilities = resolveContextCapabilities(context)
  assertCapability(capabilities, 'planner.view')
  const foundation = await getV1Foundation(context, taskId)
  const fulfillment = foundation.fulfillments.find((item) => item.id === fulfillmentId)
  if (!fulfillment || fulfillment.retired_at || fulfillment.inactive_at) {
    throw createHttpError(409, 'El cumplimiento ya no es una obligaciÃ³n actual.', 'fulfillment_not_current')
  }
  if (['verify', 'request_correction', 'reopen'].includes(action)) {
    assertCapability(capabilities, 'task.verify')
  } else if (action === 'complete') {
    if (!canCompleteV1Fulfillment(context, foundation, fulfillment, capabilities)) {
      throw createHttpError(403, 'No sos responsable de este cumplimiento.', 'fulfillment_not_responsible')
    }
  } else {
    const responsible = fulfillment.responsible_member_id === context.membershipId
      || fulfillment.completed_by_member_id === context.membershipId
      || hasCapability(capabilities, 'task.complete_any')
    if (!responsible) {
      throw createHttpError(403, 'No sos responsable de este cumplimiento.', 'fulfillment_not_responsible')
    }
  }
}

const mutateTaskFulfillmentV1 = async (context, taskId, fulfillmentId, action, body, expectedVersion, correlation = {}) => {
  assertV1Uuid(taskId, 'taskId')
  assertV1Uuid(fulfillmentId, 'fulfillmentId')
  if (!V1_FULFILLMENT_ACTIONS.includes(action)) {
    throw createHttpError(409, 'La transiciÃ³n de cumplimiento no es vÃ¡lida.', 'fulfillment_invalid_transition')
  }
  await assertV1FulfillmentCapability(context, taskId, fulfillmentId, action)
  const payload = {
    action,
    comment: body?.comment ?? null,
    note: body?.note ?? null,
  }
  const data = await invokeTaskV1AtomicMutation(context, {
    operation: correlation.operation,
    targetId: fulfillmentId,
    expectedVersion,
    payload,
    correlation,
    rpc: async (call) => {
      const { data: rpcData, error } = await context.client.rpc('mutate_planner_task_fulfillment_v1', {
        p_household_id: context.householdId,
        p_task_id: taskId,
        p_fulfillment_id: fulfillmentId,
        p_action: action,
        p_expected_version: expectedVersion,
        p_comment: payload.comment,
        p_note: payload.note,
        p_request_id: correlation.requestId ?? null,
        p_mutation_id: call.mutationId,
        p_idempotency_key: call.idempotencyKey,
        p_operation: call.operation,
        p_payload_hash: call.payloadHash,
      })
      if (error) throwSupabaseError(error)
      return rpcData
    },
  })
  mapV1Outcome(data, expectedVersion)
  return getTaskFulfillmentV1(context, taskId)
}

module.exports = {
  assertTaskCompletionCapabilities,
  assertTaskCreateBody,
  assertTaskVerificationCapabilities,
  cancelTask,
  completeTask,
  createTask,
  getTaskCompletionAuthorization,
  getTaskById,
  getTaskOrThrow,
  listTasks,
  reactivateTask,
  restoreTask,
  trashTask,
  updateTask,
  verifyTask: verifyTaskViaFulfillment,
  claimTaskV1,
  getTaskFulfillmentV1,
  mutateTaskFulfillmentV1,
  updateTaskAssignmentV1,
}
