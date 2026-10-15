const { createHttpError } = require('../lib/httpErrors')
const { supabaseAdmin } = require('../config/supabase')

const getTrashedTasks = async (context, limit) => {
  const { data, error } = await context.client
    .from('planner_tasks')
    .select('*, household_members!trashed_by_member_id(id, person_id, role, people(display_name, avatar_url))')
    .eq('household_id', context.householdId)
    .not('trashed_at', 'is', null)
    .order('trashed_at', { ascending: false })
    .limit(limit ?? 100)

  if (error) {
    throw createHttpError(500, error.message, 'internal_error')
  }

return (data ?? []).map((task) => ({
      type: 'task',
      id: task.id,
      household_id: task.household_id,
      title: task.title,
      status: task.status,
      trashed_at: task.trashed_at,
      trashed_by_member_id: task.trashed_by_member_id,
      trashed_by_display_name: task.household_members?.people?.display_name ?? null,
      version: task.version,
      parent: null,
      child_count: 0,
      restore_requires_parent: false,
    }))
}

const getTrashedEvents = async (context, limit) => {
  const { data, error } = await context.client
    .from('planner_events')
    .select('*, household_members!trashed_by_member_id(id, person_id, role, people(display_name, avatar_url))')
    .eq('household_id', context.householdId)
    .not('trashed_at', 'is', null)
    .order('trashed_at', { ascending: false })
    .limit(limit ?? 100)

  if (error) {
    throw createHttpError(500, error.message, 'internal_error')
  }

return (data ?? []).map((event) => ({
      type: 'event',
      id: event.id,
      household_id: event.household_id,
      title: event.title,
      status: event.status,
      trashed_at: event.trashed_at,
      trashed_by_member_id: event.trashed_by_member_id,
      trashed_by_display_name: event.household_members?.people?.display_name ?? null,
      version: event.version,
      parent: null,
      child_count: 0,
      restore_requires_parent: false,
    }))
}

const getTrashedGoals = async (context, limit) => {
  const adminClient = supabaseAdmin
  if (!adminClient) {
    return []
  }

  // The admin client bypasses RLS, so the Personal branch is narrowed here:
  // a Personal Plan carries no household and is only ever listed for its owner
  // (Technical Truth §2.2).
  // Gate1 P0-A: guard personId to avoid invalid PostgREST `or` when context is partial.
  const personClause = context.personId
    ? `,and(visibility.eq.personal,owner_person_id.eq.${context.personId})`
    : ''
  const { data, error } = await adminClient
    .from('planner_goals')
    .select(`
      *,
      household_members!trashed_by_member_id(id, person_id, role, people(display_name, avatar_url))
    `)
    .or(`household_id.eq.${context.householdId}${personClause}`)
    .not('trashed_at', 'is', null)
    .order('trashed_at', { ascending: false })
    .limit(limit ?? 100)

  if (error) {
    throw createHttpError(500, error.message, 'internal_error')
  }

  const goals = (data ?? []).filter((g) => g.trashed_at !== null)

  const goalIds = goals.map((g) => g.id)
  let milestoneCounts = {}
  if (goalIds.length > 0) {
    const { data: milestones } = await adminClient
      .from('planner_goal_milestones')
      .select('goal_id, id')
      .in('goal_id', goalIds)
      .is('trashed_at', null)
      .is('deleted_at', null)

    if (milestones) {
      for (const m of milestones) {
        milestoneCounts[m.goal_id] = (milestoneCounts[m.goal_id] ?? 0) + 1
      }
    }
  }

return goals.map((goal) => ({
      type: 'goal',
      id: goal.id,
      household_id: goal.household_id,
      title: goal.title,
      status: goal.status,
      trashed_at: goal.trashed_at,
      trashed_by_member_id: goal.trashed_by_member_id,
      trashed_by_display_name: goal.household_members?.people?.display_name ?? null,
      version: goal.version,
      parent: null,
      child_count: milestoneCounts[goal.id] ?? 0,
      restore_requires_parent: false,
    }))
}

const getTrashedIndependentMilestones = async (context, limit) => {
  const adminClient = supabaseAdmin
  if (!adminClient) {
    return []
  }

  const { data: trashedGoals } = await adminClient
    .from('planner_goals')
    .select('id')
    .eq('household_id', context.householdId)
    .not('trashed_at', 'is', null)

  const trashedGoalIds = (trashedGoals ?? []).map((g) => g.id)

  // Gate1 P0-A: PostgREST requires !inner to filter on an embedded table.
  // Without it, `.eq('planner_goals.household_id', …)` fails and takes down
  // the whole `type=all` Trash read even when tasks/events are healthy.
  let query = adminClient
    .from('planner_goal_milestones')
    .select(`
      *,
      planner_goals!goal_id!inner(id, title, household_id),
      household_members!trashed_by_member_id(id, person_id, role, people(display_name, avatar_url))
    `)
    .eq('planner_goals.household_id', context.householdId)
    .not('trashed_at', 'is', null)

  if (trashedGoalIds.length > 0) {
    query = query.not('goal_id', 'in', `(${trashedGoalIds.join(',')})`)
  }

  query = query.order('trashed_at', { ascending: false }).limit(limit ?? 100)

  const { data, error } = await query

  if (error) {
    throw createHttpError(500, error.message, 'internal_error')
  }

  const milestones = data ?? []

  const milestoneItems = await Promise.all(
    milestones.map(async (ms) => {
      const parentGoal = ms.planner_goals || null
      const parentIsTrashed = parentGoal
        ? await checkGoalIsTrashed(context, parentGoal.id)
        : false

      return {
        type: 'milestone',
        id: ms.id,
        household_id: parentGoal?.household_id ?? context.householdId,
        title: ms.title,
        status: ms.achieved ? 'achieved' : 'pending',
        trashed_at: ms.trashed_at,
        trashed_by_member_id: ms.trashed_by_member_id,
        trashed_by_display_name: ms.household_members?.people?.display_name ?? null,
        version: ms.version,
        parent: parentGoal
          ? {
              type: 'goal',
              id: parentGoal.id,
              title: parentGoal.title,
            }
          : null,
        child_count: 0,
        restore_requires_parent: parentIsTrashed,
      }
    })
  )

  return milestoneItems.filter((item) => !item.restore_requires_parent)
}

// A MISSING parent is NOT a trashed parent. The previous `data?.trashed_at !== null`
// evaluated to `true` for `undefined`, which silently hid every milestone whose
// Plan row could not be read from Trash.
const checkGoalIsTrashed = async (context, goalId) => {
  const adminClient = supabaseAdmin
  if (!adminClient || !goalId) {
    return false
  }
  const { data } = await adminClient
    .from('planner_goals')
    .select('trashed_at')
    .eq('id', goalId)
    .maybeSingle()
  return Boolean(data?.trashed_at)
}

// Event Series / Horarios and Responsibilities are recoverable Planner entities
// (frozen §22/§38: Trash owns discovery + restore of trashed Planner entities).
// RLS-scoped reads only; no admin/BYPASSRLS shortcut is used here.
const getTrashedSeries = async (context, limit) => {
  // `planner_event_series` has NO `title` column: the title is projected from
  // `event_defaults->>'title'`, exactly like `planner_event_series_v1_dto`.
  // Selecting a non-existent column made every `type=all` / `type=event_series`
  // Trash read fail with a 500, so the whole Trash screen was dead.
  const { data, error } = await context.client
    .from('planner_event_series')
    .select('id, household_id, lifecycle, trashed_at, version, created_at, event_defaults')
    .eq('household_id', context.householdId)
    .not('trashed_at', 'is', null)
    .order('trashed_at', { ascending: false })
    .limit(limit ?? 100)

  if (error) {
    throw createHttpError(500, 'No pudimos leer los horarios de la papelera.', 'trash_read_failed')
  }

  return (data ?? []).map((series) => ({
    type: 'event_series',
    id: series.id,
    household_id: series.household_id,
    title: series.event_defaults?.title ?? 'Horario',
    status: series.lifecycle,
    trashed_at: series.trashed_at,
    trashed_by_member_id: null,
    trashed_by_display_name: null,
    version: series.version,
    parent: null,
    child_count: 0,
    restore_requires_parent: false,
  }))
}

const getTrashedResponsibilities = async (context, limit) => {
  const { data, error } = await context.client
    .from('planner_responsibilities')
    .select('id, title, household_id, lifecycle, trashed_at, version, created_at')
    .eq('household_id', context.householdId)
    .not('trashed_at', 'is', null)
    .order('trashed_at', { ascending: false })
    .limit(limit ?? 100)

  if (error) {
    throw createHttpError(500, error.message, 'internal_error')
  }

  return (data ?? []).map((item) => ({
    type: 'responsibility',
    id: item.id,
    household_id: item.household_id,
    title: item.title,
    status: item.lifecycle,
    trashed_at: item.trashed_at,
    trashed_by_member_id: null,
    trashed_by_display_name: null,
    version: item.version,
    parent: null,
    child_count: 0,
    restore_requires_parent: false,
  }))
}

const listTrash = async (context, { type = 'all', limit = 100 }) => {
  // Gate1 P0-A: never let one broken branch (goals/milestones/series) take down
  // the whole Trash screen. Each branch degrades to [] with a server log so the
  // UI still renders tasks/events instead of "Error interno".
  let items = []
  const branchErrors = []

  const runBranch = async (name, fn) => {
    try {
      const rows = await fn()
      items.push(...(rows ?? []))
    } catch (err) {
      branchErrors.push({ branch: name, message: err?.message ?? String(err) })
    }
  }

  if (type === 'all' || type === 'tasks') {
    await runBranch('tasks', () => getTrashedTasks(context, limit))
  }

  if (type === 'all' || type === 'events') {
    await runBranch('events', () => getTrashedEvents(context, limit))
  }

  if (type === 'all' || type === 'goals') {
    await runBranch('goals', () => getTrashedGoals(context, limit))
    await runBranch('milestones', () => getTrashedIndependentMilestones(context, limit))
  }

  if (type === 'all' || type === 'event_series') {
    await runBranch('event_series', () => getTrashedSeries(context, limit))
  }

  if (type === 'all' || type === 'responsibilities') {
    await runBranch('responsibilities', () => getTrashedResponsibilities(context, limit))
  }

  if (branchErrors.length > 0) {
    console.warn('[planner.trash] partial degradation', { type, branchErrors: branchErrors.map((b) => b.branch) })
  }

  items.sort((a, b) => new Date(b.trashed_at).getTime() - new Date(a.trashed_at).getTime())

  return { items: items.slice(0, limit) }
}

module.exports = {
  listTrash,
}