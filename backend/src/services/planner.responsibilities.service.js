const { createHttpError } = require('../lib/httpErrors')
const tasksService = require('./planner.tasks.service')
const {
  ASSIGNMENT_KINDS,
  SCHEDULE_KINDS,
  LIFECYCLES,
  assignmentForOccurrence,
  isResolved,
  nextOccurrence,
  validateRule,
} = require('../domain/planner.responsibilities.domain')

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const dateOnly = (date = new Date(), timeZone = 'UTC') => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}
const previousDate = (value) => new Date(Date.parse(`${value}T00:00:00.000Z`) - 86400000).toISOString().slice(0, 10)
const dbError = (error) => { if (error) throw createHttpError(500, error.message, error.code ?? 'responsibility_storage_error') }

function normalizeInput(body, partial = false) {
  const result = {}
  const put = (key, value) => { if (!partial || Object.prototype.hasOwnProperty.call(body, key)) result[key] = value }
  if (!partial || 'title' in body) {
    const title = String(body.title ?? '').trim()
    if (!title) throw createHttpError(400, 'Qué hay que hacer es obligatorio.', 'validation_error')
    put('title', title)
  }
  if (!partial || 'description' in body) put('description', String(body.description ?? '').trim() || null)
  if (!partial || 'assignmentKind' in body) {
    if (!ASSIGNMENT_KINDS.includes(body.assignmentKind)) throw createHttpError(400, 'Quién se ocupa no es válido.', 'validation_error')
    put('assignment_kind', body.assignmentKind)
  }
  const schedule = body.schedule
  if (!partial || schedule) {
    if (!schedule || !SCHEDULE_KINDS.includes(schedule.kind)) throw createHttpError(400, 'La repetición no es válida.', 'validation_error')
    const interval = Number(schedule.interval ?? 1)
    if (!Number.isInteger(interval) || interval < 1 || interval > 999) throw createHttpError(400, 'El intervalo no es válido.', 'validation_error')
    put('schedule_kind', schedule.kind)
    put('schedule_interval', interval)
    put('schedule_unit', schedule.unit ?? null)
    put('weekdays', schedule.weekdays ?? [])
    put('month_day', schedule.monthDay ?? null)
    put('anchor_date', schedule.anchorDate)
    put('due_time', schedule.time ?? null)
  }
  if (!partial || 'taskDefaults' in body) put('task_defaults', body.taskDefaults ?? {})
  return result
}

const memberIdsFrom = (body) => Array.isArray(body.memberIds) ? body.memberIds.filter((id) => UUID_RE.test(id)) : []

async function activeMemberIds(context) {
  const { data, error } = await context.client.from('household_members').select('id').eq('household_id', context.householdId).eq('status', 'active')
  dbError(error)
  return (data ?? []).map((item) => item.id)
}

async function replaceMembers(context, responsibilityId, memberIds) {
  const { error: deleteError } = await context.client.from('planner_responsibility_members').delete().eq('responsibility_id', responsibilityId).eq('household_id', context.householdId)
  dbError(deleteError)
  if (!memberIds.length) return
  const rows = memberIds.map((memberId, position) => ({ responsibility_id: responsibilityId, household_id: context.householdId, member_id: memberId, position }))
  const { error } = await context.client.from('planner_responsibility_members').insert(rows)
  dbError(error)
}

function scheduleFrom(row) {
  return { kind: row.schedule_kind, interval: row.schedule_interval, unit: row.schedule_unit, weekdays: row.weekdays, monthDay: row.month_day, anchorDate: row.anchor_date }
}

async function loadMembers(context, ids) {
  if (!ids.length) return new Map()
  const { data, error } = await context.client.from('planner_responsibility_members').select('*').in('responsibility_id', ids).order('position')
  dbError(error)
  const map = new Map(ids.map((id) => [id, []]))
  for (const row of data ?? []) map.get(row.responsibility_id)?.push(row)
  return map
}

async function refreshAdjustment(context, row, configuredIds, eligibleIds) {
  const check = validateRule({ assignmentKind: row.assignment_kind, memberIds: configuredIds, schedule: scheduleFrom(row) }, eligibleIds)
  if (row.requires_adjustment_reason !== check.reason) {
    const { error } = await context.client.from('planner_responsibilities').update({ requires_adjustment_reason: check.reason }).eq('id', row.id).eq('household_id', context.householdId)
    dbError(error)
    row.requires_adjustment_reason = check.reason
  }
  return check
}

async function materializeOne(context, row, configuredIds, eligibleIds, today) {
  const validation = await refreshAdjustment(context, row, configuredIds, eligibleIds)
  if (row.lifecycle !== 'active' || !validation.valid) return { outcome: 'not_eligible' }

  const { data: open, error: openError } = await context.client.from('planner_responsibility_occurrences').select('id,task_id,sequence,scheduled_date,rotation_slot_member_id').eq('responsibility_id', row.id).is('resolved_at', null).maybeSingle()
  dbError(openError)
  let afterDate = null
  if (open) {
    const { data: task, error: taskError } = await context.client.from('planner_tasks').select('status,requires_verification,completed_at,verified_at').eq('id', open.task_id).maybeSingle()
    dbError(taskError)
    if (!task || !isResolved({ status: task.status, requiresVerification: task.requires_verification })) return { outcome: 'live_exists', taskId: open.task_id }
    const resolvedAt = task.verified_at ?? task.completed_at ?? new Date().toISOString()
    afterDate = row.schedule_kind === 'after_completion' ? dateOnly(new Date(resolvedAt), context.household?.timezone ?? 'UTC') : today
  }

  const schedule = scheduleFrom(row)
  let scheduledDate
  if (afterDate) scheduledDate = nextOccurrence(schedule, afterDate)
  else {
    const start = row.anchor_date > today ? row.anchor_date : today
    scheduledDate = nextOccurrence(schedule, previousDate(start))
  }
  let previousSlotMemberId = open?.rotation_slot_member_id ?? null
  if (!previousSlotMemberId && Number(row.next_sequence) > 1) {
    const { data: previous, error: previousError } = await context.client.from('planner_responsibility_occurrences').select('rotation_slot_member_id').eq('responsibility_id', row.id).not('rotation_slot_member_id', 'is', null).order('sequence', { ascending: false }).limit(1).maybeSingle()
    dbError(previousError); previousSlotMemberId = previous?.rotation_slot_member_id ?? null
  }
  const assignment = assignmentForOccurrence({ assignmentKind: row.assignment_kind, memberIds: configuredIds, schedule }, eligibleIds, Number(row.next_sequence), previousSlotMemberId)
  if (!assignment.valid) return { outcome: 'not_eligible' }
  const occurrenceKey = `${row.next_sequence}:${scheduledDate}`
  const { data, error } = await context.client.rpc('materialize_planner_responsibility_v1', {
    p_household_id: context.householdId,
    p_responsibility_id: row.id,
    p_sequence: row.next_sequence,
    p_occurrence_key: occurrenceKey,
    p_scheduled_date: scheduledDate,
    p_assignment_kind: assignment.assignmentKind,
    p_member_ids: assignment.memberIds,
    p_rotation_slot_member_id: assignment.slotMemberId ?? null,
  })
  dbError(error)
  return data
}

async function materializeHousehold(context) {
  const today = dateOnly(new Date(), context.household?.timezone ?? 'UTC')
  const { data: rows, error } = await context.client.from('planner_responsibilities').select('*').eq('household_id', context.householdId).eq('lifecycle', 'active')
  dbError(error)
  const memberMap = await loadMembers(context, (rows ?? []).map((row) => row.id))
  const eligible = await activeMemberIds(context)
  const results = []
  for (const row of rows ?? []) results.push(await materializeOne(context, row, (memberMap.get(row.id) ?? []).map((item) => item.member_id), eligible, today))
  return results
}

async function listResponsibilities(context, query = {}) {
  let request = context.client.from('planner_responsibilities').select('*').eq('household_id', context.householdId).order('updated_at', { ascending: false })
  if (query.lifecycle) request = request.eq('lifecycle', query.lifecycle)
  const { data: rows, error } = await request
  dbError(error)
  const memberMap = await loadMembers(context, (rows ?? []).map((row) => row.id))
  const ids = (rows ?? []).map((row) => row.id)
  let occurrences = []
  if (ids.length) {
    const result = await context.client.from('planner_responsibility_occurrences').select('responsibility_id,task_id,sequence,scheduled_date,resolved_at,resolution_status').in('responsibility_id', ids).order('sequence', { ascending: false })
    dbError(result.error); occurrences = result.data ?? []
  }
  return { responsibilities: (rows ?? []).map((row) => ({ ...row, members: memberMap.get(row.id) ?? [], occurrences: occurrences.filter((item) => item.responsibility_id === row.id).slice(0, 10), current_occurrence: occurrences.find((item) => item.responsibility_id === row.id && !item.resolved_at) ?? null })) }
}

async function getResponsibility(context, id) {
  const result = await listResponsibilities(context)
  const responsibility = result.responsibilities.find((item) => item.id === id)
  if (!responsibility) throw createHttpError(404, 'Responsabilidad no encontrada.', 'responsibility_not_found')
  return { responsibility }
}

async function createResponsibility(context, body) {
  const payload = { ...normalizeInput(body), household_id: context.householdId, created_by_member_id: context.membershipId }
  const memberIds = memberIdsFrom(body)
  const validation = validateRule({ assignmentKind: body.assignmentKind, memberIds, schedule: body.schedule }, await activeMemberIds(context))
  payload.requires_adjustment_reason = validation.reason
  const { data, error } = await context.client.from('planner_responsibilities').insert(payload).select('*').single()
  dbError(error)
  await replaceMembers(context, data.id, memberIds)
  return getResponsibility(context, data.id)
}

async function updateResponsibility(context, id, body, expectedVersion) {
  const { data: currentRow, error: currentError } = await context.client.from('planner_responsibilities').select('*').eq('id', id).eq('household_id', context.householdId).maybeSingle()
  dbError(currentError)
  if (!currentRow) throw createHttpError(404, 'Responsabilidad no encontrada.', 'responsibility_not_found')
  const currentMemberMap = await loadMembers(context, [id])
  const current = { ...currentRow, members: currentMemberMap.get(id) ?? [] }
  if (expectedVersion != null && current.version !== expectedVersion) throw createHttpError(412, 'La responsabilidad cambió.', 'version_conflict')
  const payload = normalizeInput(body, true)
  const memberIds = 'memberIds' in body ? memberIdsFrom(body) : current.members.map((item) => item.member_id)
  const merged = { ...current, ...payload }
  payload.requires_adjustment_reason = validateRule({ assignmentKind: merged.assignment_kind, memberIds, schedule: scheduleFrom(merged) }, await activeMemberIds(context)).reason
  const { error } = await context.client.from('planner_responsibilities').update(payload).eq('id', id).eq('household_id', context.householdId).eq('version', current.version)
  dbError(error)
  if ('memberIds' in body) await replaceMembers(context, id, memberIds)
  return getResponsibility(context, id)
}

async function setLifecycle(context, id, lifecycle, expectedVersion) {
  if (!LIFECYCLES.includes(lifecycle)) throw createHttpError(400, 'Estado no válido.', 'validation_error')
  const timestamps = { paused_at: lifecycle === 'paused' ? new Date().toISOString() : null, archived_at: lifecycle === 'archived' ? new Date().toISOString() : null, trashed_at: lifecycle === 'trashed' ? new Date().toISOString() : null }
  let request = context.client.from('planner_responsibilities').update({ lifecycle, ...timestamps }).eq('id', id).eq('household_id', context.householdId)
  if (expectedVersion != null) request = request.eq('version', expectedVersion)
  const { data, error } = await request.select('id').maybeSingle()
  dbError(error)
  if (!data) throw createHttpError(412, 'La responsabilidad cambió.', 'version_conflict')
  return getResponsibility(context, id)
}

async function replaceCurrentAssignee(context, id, body, expectedVersion, correlation) {
  const { responsibility } = await getResponsibility(context, id)
  if (!responsibility.current_occurrence) throw createHttpError(409, 'No hay una tarea actual.', 'no_current_occurrence')
  return tasksService.updateTaskAssignmentV1(context, responsibility.current_occurrence.task_id, { assignmentKind: 'members', fulfillmentMode: 'shared_once', memberIds: body.memberIds }, expectedVersion, correlation)
}

module.exports = { createResponsibility, getResponsibility, listResponsibilities, materializeHousehold, replaceCurrentAssignee, setLifecycle, updateResponsibility }
