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

  const { data, error } = await adminClient
    .from('planner_goals')
    .select(`
      *,
      household_members!trashed_by_member_id(id, person_id, role, people(display_name, avatar_url))
    `)
    .eq('household_id', context.householdId)
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

  let query = adminClient
    .from('planner_goal_milestones')
    .select(`
      *,
      planner_goals!goal_id(id, title, household_id),
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

const checkGoalIsTrashed = async (context, goalId) => {
  const adminClient = supabaseAdmin
  if (!adminClient) {
    return false
  }
  const { data } = await adminClient
    .from('planner_goals')
    .select('trashed_at')
    .eq('id', goalId)
    .single()
  return data?.trashed_at !== null
}

const listTrash = async (context, { type = 'all', limit = 100 }) => {
  let items = []

  if (type === 'all' || type === 'tasks') {
    const tasks = await getTrashedTasks(context, limit)
    items.push(...tasks)
  }

  if (type === 'all' || type === 'events') {
    const events = await getTrashedEvents(context, limit)
    items.push(...events)
  }

  if (type === 'all' || type === 'goals') {
    const goals = await getTrashedGoals(context, limit)
    const independentMilestones = await getTrashedIndependentMilestones(context, limit)
    items.push(...goals, ...independentMilestones)
  }

  items.sort((a, b) => new Date(b.trashed_at).getTime() - new Date(a.trashed_at).getTime())

  return { items: items.slice(0, limit) }
}

module.exports = {
  listTrash,
}