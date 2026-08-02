'use strict';

const { createHttpError } = require('../lib/httpErrors');
const {
  buildPlannerAccessContext,
  isVisibleInPlannerContext,
} = require('../lib/plannerGlobalSurfaces');

const SEARCH_PROJECTION_VERSION = 'planner.global_active_search.v1';
const SEARCH_LIMIT_DEFAULT = 30;
const SEARCH_LIMIT_MAX = 50;
const SEARCH_ENTITY_TYPES = Object.freeze(['task', 'event', 'plan']);
const SEARCH_CONTEXT_ACTIVE = 'active';
const GROUP_LABELS = Object.freeze({
  task: 'Tareas',
  event: 'Eventos',
  plan: 'Planes',
});

function normalizeSearchQuery(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function parseSearchLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return SEARCH_LIMIT_DEFAULT;
  return Math.min(parsed, SEARCH_LIMIT_MAX);
}

function buildIlikePattern(query) {
  return `%${query.replace(/[%_]/g, (match) => `\\${match}`)}%`;
}

function lower(value) {
  return typeof value === 'string' ? value.toLocaleLowerCase() : '';
}

function titleOf(row, fallback = 'Sin titulo') {
  const candidate = row?.title ?? row?.objective;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : fallback;
}

function isActiveTask(row) {
  return row && row.trashed_at === null && row.status !== 'cancelled';
}

function isActiveEvent(row) {
  return row && row.trashed_at === null && row.status !== 'cancelled';
}

function isActivePlan(row) {
  return (
    row &&
    row.trashed_at === null &&
    row.archived_at === null &&
    row.lifecycle !== 'draft'
  );
}

function toVisibilityInput(row, entityType) {
  if (entityType === 'plan') {
    return {
      scopeKind: row.scope === 'personal' ? 'personal' : 'household',
      ownerPersonId: row.owner_person_id ?? row.created_by_person_id ?? '',
      householdId: row.household_id ?? null,
    };
  }
  return {
    scopeKind: 'household',
    ownerPersonId: row.created_by_person_id ?? '',
    householdId: row.household_id ?? null,
  };
}

function matchScore(row, query, fields) {
  const needle = lower(query);
  const values = fields.map((field) => lower(row[field])).filter(Boolean);
  let best = 100;
  for (const value of values) {
    if (value === needle) best = Math.min(best, 0);
    else if (value.startsWith(needle)) best = Math.min(best, 1);
    else if (value.includes(needle)) best = Math.min(best, 2);
  }
  return best;
}

function compareIsoDesc(left, right) {
  const a = left ?? '';
  const b = right ?? '';
  if (a === b) return 0;
  return b.localeCompare(a);
}

function compareIsoAsc(left, right) {
  const a = left ?? '9999-12-31T23:59:59.999Z';
  const b = right ?? '9999-12-31T23:59:59.999Z';
  if (a === b) return 0;
  return a.localeCompare(b);
}

function rankTask(left, right) {
  const due = (left.due_date ?? '9999-12-31').localeCompare(right.due_date ?? '9999-12-31');
  if (due !== 0) return due;
  const created = compareIsoDesc(left.created_at, right.created_at);
  if (created !== 0) return created;
  return String(left.id).localeCompare(String(right.id));
}

function rankEvent(left, right) {
  const starts = compareIsoAsc(left.starts_at, right.starts_at);
  if (starts !== 0) return starts;
  const created = compareIsoDesc(left.created_at, right.created_at);
  if (created !== 0) return created;
  return String(left.id).localeCompare(String(right.id));
}

function rankPlan(left, right) {
  const updated = compareIsoDesc(left.updated_at, right.updated_at);
  if (updated !== 0) return updated;
  const created = compareIsoDesc(left.created_at, right.created_at);
  if (created !== 0) return created;
  return String(left.id).localeCompare(String(right.id));
}

function rankRows(rows, entityType, query) {
  const fields = entityType === 'plan' ? ['objective', 'description'] : ['title', 'description'];
  const ranker = entityType === 'task' ? rankTask : entityType === 'event' ? rankEvent : rankPlan;
  return [...rows].sort((left, right) => {
    const score = matchScore(left, query, fields) - matchScore(right, query, fields);
    if (score !== 0) return score;
    return ranker(left, right);
  });
}

function buildDestination(entityType, entityId) {
  return {
    entityType,
    entityId,
    surfaceOrigin: 'search',
  };
}

function toTaskResult(row) {
  return {
    id: `task:${row.id}`,
    entityType: 'task',
    entityId: row.id,
    title: titleOf(row),
    subtitle: row.due_date ? `Vence ${row.due_date}` : 'Tarea',
    metadata: {
      status: row.status,
      dueDate: row.due_date ?? null,
      dueTime: row.due_time ?? null,
      priority: row.priority ?? null,
    },
    destination: buildDestination('task', row.id),
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

function toEventResult(row) {
  return {
    id: `event:${row.id}`,
    entityType: 'event',
    entityId: row.id,
    title: titleOf(row),
    subtitle: row.starts_at ? `Evento ${row.starts_at}` : 'Evento',
    metadata: {
      status: row.status,
      startsAt: row.starts_at ?? null,
      endsAt: row.ends_at ?? null,
      allDay: Boolean(row.all_day),
      locationName: row.location_name ?? null,
    },
    destination: buildDestination('event', row.id),
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

function toPlanResult(row) {
  return {
    id: `plan:${row.id}`,
    entityType: 'plan',
    entityId: row.id,
    title: titleOf(row, 'Plan sin titulo'),
    subtitle: row.target_date ? `Plan - ${row.target_date}` : 'Plan',
    metadata: {
      lifecycle: row.lifecycle,
      scope: row.scope,
      targetDate: row.target_date ?? null,
    },
    destination: buildDestination('plan', row.id),
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

function normalizeResults({ rows, entityType, accessContext, query, limit }) {
  const activeFilter = entityType === 'task' ? isActiveTask : entityType === 'event' ? isActiveEvent : isActivePlan;
  const dto = entityType === 'task' ? toTaskResult : entityType === 'event' ? toEventResult : toPlanResult;
  const visibleRows = (rows ?? [])
    .filter(activeFilter)
    .filter((row) => isVisibleInPlannerContext(toVisibilityInput(row, entityType), accessContext));
  return rankRows(visibleRows, entityType, query).slice(0, limit).map(dto);
}

function buildGroups(resultsByType) {
  return SEARCH_ENTITY_TYPES.map((entityType) => ({
    entityType,
    label: GROUP_LABELS[entityType],
    results: resultsByType[entityType] ?? [],
  }));
}

async function loadTaskRows(context, query, limit) {
  const pattern = buildIlikePattern(query);
  const { data, error } = await context.client
    .from('planner_tasks')
    .select('id,household_id,title,description,status,priority,due_date,due_time,created_by_member_id,created_by_person_id,created_at,updated_at,version,trashed_at')
    .eq('household_id', context.householdId)
    .is('trashed_at', null)
    .neq('status', 'cancelled')
    .or(`title.ilike.${pattern},description.ilike.${pattern}`)
    .limit(limit * 3);
  if (error) throw createHttpError(500, error.message, 'search_tasks_failed');
  return data ?? [];
}

async function loadEventRows(context, query, limit) {
  const pattern = buildIlikePattern(query);
  const { data, error } = await context.client
    .from('planner_events')
    .select('id,household_id,title,description,status,starts_at,ends_at,all_day,location_name,created_by_member_id,created_by_person_id,created_at,updated_at,version,trashed_at')
    .eq('household_id', context.householdId)
    .is('trashed_at', null)
    .neq('status', 'cancelled')
    .or(`title.ilike.${pattern},description.ilike.${pattern},location_name.ilike.${pattern}`)
    .limit(limit * 3);
  if (error) throw createHttpError(500, error.message, 'search_events_failed');
  return data ?? [];
}

async function loadPlanRows(context, query, limit) {
  const pattern = buildIlikePattern(query);
  const { data, error } = await context.client
    .from('planner_plans')
    .select('id,scope,owner_person_id,household_id,objective,description,lifecycle,target_date,archived_at,trashed_at,version,created_at,updated_at')
    .or(`household_id.eq.${context.householdId},owner_person_id.eq.${context.personId}`)
    .is('trashed_at', null)
    .is('archived_at', null)
    .neq('lifecycle', 'draft')
    .or(`objective.ilike.${pattern},description.ilike.${pattern}`)
    .limit(limit * 3);
  if (error) throw createHttpError(500, error.message, 'search_plans_failed');
  return data ?? [];
}

async function searchActive(context, options = {}) {
  const query = normalizeSearchQuery(options.query);
  const limit = parseSearchLimit(options.limit);
  if (options.context && options.context !== SEARCH_CONTEXT_ACTIVE) {
    throw createHttpError(400, 'Search context no disponible en este paquete.', 'search_context_not_available');
  }
  const accessContext = buildPlannerAccessContext({
    personId: context.personId,
    householdId: context.householdId,
    membershipId: context.membershipId,
    role: context.role,
  });

  if (!query) {
    const groups = buildGroups({ task: [], event: [], plan: [] });
    return {
      projectionVersion: SEARCH_PROJECTION_VERSION,
      context: SEARCH_CONTEXT_ACTIVE,
      query,
      generatedAt: new Date().toISOString(),
      limit,
      total: 0,
      groups,
    };
  }

  const [taskRows, eventRows, planRows] = await Promise.all([
    loadTaskRows(context, query, limit),
    loadEventRows(context, query, limit),
    loadPlanRows(context, query, limit),
  ]);

  const resultsByType = {
    task: normalizeResults({ rows: taskRows, entityType: 'task', accessContext, query, limit }),
    event: normalizeResults({ rows: eventRows, entityType: 'event', accessContext, query, limit }),
    plan: normalizeResults({ rows: planRows, entityType: 'plan', accessContext, query, limit }),
  };
  const groups = buildGroups(resultsByType);
  return {
    projectionVersion: SEARCH_PROJECTION_VERSION,
    context: SEARCH_CONTEXT_ACTIVE,
    query,
    generatedAt: new Date().toISOString(),
    limit,
    total: groups.reduce((sum, group) => sum + group.results.length, 0),
    groups,
  };
}

module.exports = {
  GROUP_LABELS,
  SEARCH_CONTEXT_ACTIVE,
  SEARCH_ENTITY_TYPES,
  SEARCH_LIMIT_DEFAULT,
  SEARCH_LIMIT_MAX,
  SEARCH_PROJECTION_VERSION,
  buildGroups,
  isActiveEvent,
  isActivePlan,
  isActiveTask,
  normalizeResults,
  normalizeSearchQuery,
  parseSearchLimit,
  rankRows,
  searchActive,
  toEventResult,
  toPlanResult,
  toTaskResult,
};
