'use strict';

const { getPlannerContext } = require('../services/planner.context.service');
const { resolveCapabilities, assertCapability } = require('../lib/plannerCapabilities');
const { sendApiError } = require('../lib/httpErrors');

const ACTIVITY_PROJECTION_VERSION = 'planner.global_activity.v1';
const ACTIVITY_LIMIT_DEFAULT = 50;
const ACTIVITY_LIMIT_MAX = 100;

const NOISE_MARKERS = Object.freeze([
  'request', 'retry', 'queue', 'sync', 'cache', 'replay', 'noop', 'heartbeat',
  'timeout', 'polling', 'invalidation', 'route_visit', 'screen_open', 'click',
  'search_query', 'keyboard', 'view', 'read',
]);

function buildCapabilities(context) {
  return resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
}

function parseLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return ACTIVITY_LIMIT_DEFAULT;
  return Math.min(parsed, ACTIVITY_LIMIT_MAX);
}

function entityTypeLabel(entityType) {
  const labels = { task: 'Tarea', event: 'Evento', goal: 'Plan', plan: 'Plan', milestone: 'Hito' };
  return labels[entityType] || 'Elemento';
}

function actionLabel(action) {
  const labels = {
    create: 'creada', created: 'creada', update: 'editada', updated: 'editada',
    complete: 'completada', completed: 'completada', verify: 'verificada', verified: 'verificada',
    correction_requested: 'con correccion solicitada', cancel: 'cancelada', cancelled: 'cancelada',
    trash: 'enviada a papelera', trashed: 'enviada a papelera', restore: 'restaurada', restored: 'restaurada',
    reactivate: 'reactivada', reactivated: 'reactivada', close: 'cerrada', closed: 'cerrada',
    reopen: 'reabierta', reopened: 'reabierta', fail: 'fallida', failed: 'fallida',
  };
  return labels[action] || action;
}

function isNoiseAction(action) {
  if (!action || typeof action !== 'string') return true;
  return NOISE_MARKERS.some((marker) => action.includes(marker));
}

function toCanonicalEntityType(entityType) {
  return entityType === 'goal' ? 'plan' : entityType;
}

function toActivityItem(entry) {
  const entityType = toCanonicalEntityType(entry.entity_type);
  const correlationKey = entry.metadata?.correlation_key || entry.metadata?.process_id || null;
  return {
    activityId: `activity:${entry.id}`,
    entityType,
    entityId: entry.entity_id,
    actorPersonId: entry.actor_person_id || null,
    timestamp: entry.created_at,
    eventType: entry.action,
    summary: `${entityTypeLabel(entityType)} ${actionLabel(entry.action)}`,
    sourceModule: 'planner',
    householdId: entry.household_id,
    destination: { entityType, entityId: entry.entity_id, surfaceOrigin: 'activity' },
    resultStatus: entry.metadata?.result || null,
    correlationKey,
    grouping: { entityKey: `${entityType}:${entry.entity_id}`, processKey: correlationKey },
  };
}

function dayKeyFromTimestamp(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date(0);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function groupActivity(items) {
  const byDay = new Map();
  for (const item of items) {
    const date = item.timestamp ? new Date(item.timestamp) : new Date(0);
    const dateKey = dayKeyFromTimestamp(item.timestamp);
    if (!byDay.has(dateKey)) {
      byDay.set(dateKey, { dateKey, label: date.toLocaleDateString(), items: [] });
    }
    byDay.get(dateKey).items.push(item);
  }
  return [...byDay.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

async function listActivity(req, res) {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');

    const limit = parseLimit(req.query?.limit);
    const { data, error } = await context.client
      .from('planner_activity_log')
      .select('*')
      .eq('household_id', context.householdId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      const httpError = new Error(error.message);
      httpError.statusCode = 500;
      httpError.code = error.code || 'internal_error';
      throw httpError;
    }

    const items = (data || [])
      .filter((entry) => !isNoiseAction(entry.action))
      .filter((entry) => entry.actor_person_id)
      .map(toActivityItem);

    return res.status(200).json({
      projectionVersion: ACTIVITY_PROJECTION_VERSION,
      generatedAt: new Date().toISOString(),
      limit,
      groups: groupActivity(items),
    });
  } catch (error) {
    return sendApiError(res, error, req);
  }
}

module.exports = { listActivity };
