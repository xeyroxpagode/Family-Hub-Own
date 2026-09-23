const ASSIGNMENT_KINDS = ['fixed', 'rotation', 'claimable', 'unassigned']
const SCHEDULE_KINDS = ['daily', 'weekdays', 'interval', 'monthly', 'after_completion']
const LIFECYCLES = ['active', 'paused', 'archived', 'trashed']

const pad = (value) => String(value).padStart(2, '0')
const parseDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) throw new Error('invalid_date')
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
}
const formatDate = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
const addDays = (date, count) => new Date(date.getTime() + count * 86400000)
const daysBetween = (from, to) => Math.floor((parseDate(to) - parseDate(from)) / 86400000)
const lastDay = (year, monthIndex) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()

function addMonthsClamped(value, months, preferredDay) {
  const source = parseDate(value)
  const first = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1))
  first.setUTCDate(Math.min(preferredDay ?? source.getUTCDate(), lastDay(first.getUTCFullYear(), first.getUTCMonth())))
  return formatDate(first)
}

function isCalendarMatch(date, schedule) {
  const candidate = formatDate(date)
  const elapsed = daysBetween(schedule.anchorDate, candidate)
  if (elapsed < 0) return false
  if (schedule.kind === 'daily') return true
  if (schedule.kind === 'interval') {
    if (schedule.unit === 'days') return elapsed % schedule.interval === 0
    if (schedule.unit === 'weeks') return elapsed % (schedule.interval * 7) === 0
    if (schedule.unit === 'months') {
      const anchor = parseDate(schedule.anchorDate)
      const months = (date.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + date.getUTCMonth() - anchor.getUTCMonth()
      return months >= 0 && months % schedule.interval === 0 && date.getUTCDate() === Math.min(anchor.getUTCDate(), lastDay(date.getUTCFullYear(), date.getUTCMonth()))
    }
  }
  if (schedule.kind === 'weekdays') {
    const week = Math.floor(elapsed / 7)
    return week % schedule.interval === 0 && schedule.weekdays.includes(date.getUTCDay())
  }
  if (schedule.kind === 'monthly') {
    const anchor = parseDate(schedule.anchorDate)
    const months = (date.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + date.getUTCMonth() - anchor.getUTCMonth()
    return months >= 0 && months % (schedule.interval ?? 1) === 0 && date.getUTCDate() === Math.min(schedule.monthDay, lastDay(date.getUTCFullYear(), date.getUTCMonth()))
  }
  return false
}

function nextOccurrence(schedule, afterDate) {
  if (!SCHEDULE_KINDS.includes(schedule.kind)) throw new Error('invalid_schedule_kind')
  if (schedule.kind === 'after_completion') {
    if (!afterDate) return schedule.anchorDate
    if (schedule.unit === 'days') return formatDate(addDays(parseDate(afterDate), schedule.interval))
    if (schedule.unit === 'weeks') return formatDate(addDays(parseDate(afterDate), schedule.interval * 7))
    return addMonthsClamped(afterDate, schedule.interval)
  }
  for (let cursor = addDays(parseDate(afterDate), 1), guard = 0; guard < 3700; cursor = addDays(cursor, 1), guard += 1) {
    if (isCalendarMatch(cursor, schedule)) return formatDate(cursor)
  }
  throw new Error('schedule_search_exhausted')
}

function validateRule(rule, eligibleMemberIds) {
  if (!ASSIGNMENT_KINDS.includes(rule.assignmentKind)) return { valid: false, reason: 'Elegí cómo se asigna.' }
  if (!SCHEDULE_KINDS.includes(rule.schedule.kind)) return { valid: false, reason: 'Elegí una repetición válida.' }
  const eligible = new Set(eligibleMemberIds)
  const configured = rule.memberIds ?? []
  if (rule.assignmentKind === 'fixed' && (!configured.length || configured.some((id) => !eligible.has(id)))) {
    return { valid: false, reason: 'Elegí un nuevo responsable.' }
  }
  if (rule.assignmentKind === 'rotation' && configured.filter((id) => eligible.has(id)).length < 2) {
    return { valid: false, reason: 'La rotación necesita al menos 2 integrantes.' }
  }
  return { valid: true, reason: null }
}

function assignmentForOccurrence(rule, eligibleMemberIds, sequence, previousSlotMemberId = null) {
  const validation = validateRule(rule, eligibleMemberIds)
  if (!validation.valid) return { ...validation, assignmentKind: null, memberIds: [] }
  if (rule.assignmentKind === 'claimable') return { ...validation, assignmentKind: 'anyone', memberIds: [] }
  if (rule.assignmentKind === 'unassigned') return { ...validation, assignmentKind: 'legacy_unassigned', memberIds: [] }
  const eligible = new Set(eligibleMemberIds)
  const members = rule.memberIds.filter((id) => eligible.has(id))
  if (rule.assignmentKind === 'rotation') {
    const previousIndex = previousSlotMemberId ? rule.memberIds.indexOf(previousSlotMemberId) : -1
    const start = previousIndex >= 0 ? (previousIndex + 1) % rule.memberIds.length : (sequence - 1) % rule.memberIds.length
    let slotMemberId = null
    for (let offset = 0; offset < rule.memberIds.length; offset += 1) {
      const candidate = rule.memberIds[(start + offset) % rule.memberIds.length]
      if (eligible.has(candidate)) { slotMemberId = candidate; break }
    }
    return { ...validation, assignmentKind: 'members', memberIds: [slotMemberId], slotMemberId }
  }
  return { ...validation, assignmentKind: 'members', memberIds: members }
}

function isResolved({ status, requiresVerification }) {
  return requiresVerification ? status === 'verified' : status === 'completed' || status === 'verified'
}

module.exports = {
  ASSIGNMENT_KINDS,
  SCHEDULE_KINDS,
  LIFECYCLES,
  addMonthsClamped,
  nextOccurrence,
  validateRule,
  assignmentForOccurrence,
  isResolved,
}
