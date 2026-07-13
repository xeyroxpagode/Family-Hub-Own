const { createHttpError } = require('../lib/httpErrors')

const toDateOnly = (date) => date.toISOString().slice(0, 10)

const addDays = (date, days) => {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

const getSummary = async (context) => {
  const today = toDateOnly(new Date())
  const now = new Date()
  const nextWeek = addDays(now, 7)

  const tasksQuery = context.client
    .from('planner_tasks')
    .select('*')
    .eq('household_id', context.householdId)
    .neq('status', 'cancelled')
    .is('trashed_at', null)
    .limit(500)

  const eventsQuery = context.client
    .from('planner_events')
    .select('*')
    .eq('household_id', context.householdId)
    .eq('status', 'scheduled')
    .is('trashed_at', null)
    .gte('starts_at', now.toISOString())
    .lte('starts_at', nextWeek.toISOString())
    .order('starts_at', { ascending: true })
    .limit(20)

  const [tasksResult, eventsResult] = await Promise.all([tasksQuery, eventsQuery])

  if (tasksResult.error) {
    throw createHttpError(500, tasksResult.error.message, 'internal_error')
  }

  if (eventsResult.error) {
    throw createHttpError(500, eventsResult.error.message, 'internal_error')
  }

  const tasks = tasksResult.data ?? []
  const pendingTasks = tasks.filter((task) => task.status === 'pending')
  const tasksToday = tasks.filter((task) => task.due_date === today)
  const overdueTasks = tasks.filter((task) => task.status === 'pending' && task.due_date && task.due_date < today)
  const awaitingVerificationTasks = tasks.filter((task) => task.status === 'awaiting_verification')
  const upcomingEvents = eventsResult.data ?? []

  return {
    pending_tasks_count: pendingTasks.length,
    today_tasks_count: tasksToday.length,
    overdue_tasks_count: overdueTasks.length,
    awaiting_verification_count: awaitingVerificationTasks.length,
    upcoming_events_count: upcomingEvents.length,
    tasks_today: tasksToday,
    overdue_tasks: overdueTasks,
    awaiting_verification_tasks: awaitingVerificationTasks,
    upcoming_events: upcomingEvents,
    briefing_text: `Hoy tienes ${tasksToday.length} tareas y ${upcomingEvents.length} eventos.`,
  }
}

module.exports = {
  getSummary,
}
