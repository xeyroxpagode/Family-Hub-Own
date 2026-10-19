'use strict';

const {
  buildPlannerAccessContext,
  isVisibleInPlannerContext,
} = require('../lib/plannerGlobalSurfaces');
const {
  PAYMENT_ATTENTION_REASONS,
  loadPaymentAttention,
} = require('./finance.payment.attention.service');

const ATTENTION_PROJECTION_VERSION = 'planner.global_attention.v1';
const ATTENTION_LIMIT_DEFAULT = 50;
const ATTENTION_LIMIT_MAX = 100;
const ATTENTION_SOURCE_ENTITIES = Object.freeze(['task', 'event', 'plan', 'payment']);

const ATTENTION_REASONS = Object.freeze({
  TASK_AWAITING_VERIFICATION: 'task_awaiting_verification',
  TASK_CORRECTION_REQUESTED: 'task_correction_requested',
  EVENT_RSVP_REQUIRED: 'event_rsvp_required',
  // Canonical Plan attention: unresolved Required components (frozen §26).
  // Replaces the retired `plan_blocker` / `plan_review_required` reasons, which
  // described Plan states the canonical lifecycle never had.
  PLAN_UNRESOLVED_REQUIRED: 'plan_unresolved_required',
  PAYMENT_OVERDUE: PAYMENT_ATTENTION_REASONS.OVERDUE,
  PAYMENT_DUE_TODAY: PAYMENT_ATTENTION_REASONS.DUE_TODAY,
  PAYMENT_DUE_SOON: PAYMENT_ATTENTION_REASONS.DUE_SOON,
});

const SEVERITY_ORDER = Object.freeze([
  ATTENTION_REASONS.TASK_CORRECTION_REQUESTED,
  ATTENTION_REASONS.PAYMENT_OVERDUE,
  ATTENTION_REASONS.PLAN_UNRESOLVED_REQUIRED,
  ATTENTION_REASONS.PAYMENT_DUE_TODAY,
  ATTENTION_REASONS.TASK_AWAITING_VERIFICATION,
  ATTENTION_REASONS.EVENT_RSVP_REQUIRED,
  ATTENTION_REASONS.PAYMENT_DUE_SOON,
]);

function severityRank(reason) {
  const idx = SEVERITY_ORDER.indexOf(reason);
  return idx === -1 ? SEVERITY_ORDER.length : idx;
}

function parseAttentionLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return ATTENTION_LIMIT_DEFAULT;
  return Math.min(parsed, ATTENTION_LIMIT_MAX);
}

function titleOf(row, fallback) {
  const candidate = row && (row.title || row.objective);
  return typeof candidate === 'string' && candidate.trim()
    ? candidate.trim()
    : (fallback || 'Sin titulo');
}

function buildDedupeKey(reason, entityType, entityId, personId) {
  return `attention:${reason}:${entityType}:${entityId}:${personId}`;
}

function buildAttentionId(reason, entityType, entityId, personId) {
  return `attn:${reason}:${entityType}:${entityId}:${personId}`;
}

function toVisibilityInput(row, entityType) {
  if (entityType === 'plan') {
    return {
      scopeKind: row.scope === 'personal' ? 'personal' : 'household',
      ownerPersonId: row.owner_person_id || row.created_by_person_id || '',
      householdId: row.household_id || null,
    };
  }
  return {
    scopeKind: 'household',
    ownerPersonId: row.created_by_person_id || '',
    householdId: row.household_id || null,
  };
}

function toAttentionDTO(params) {
  const {
    attentionId, dedupeKey, reason, entityType, entityId,
    title, summary, severity, createdAt, updatedAt,
    personRecipientId, primaryAction, destination,
  } = params;
  return {
    attentionId,
    dedupeKey,
    entityType,
    entityId,
    title,
    summary,
    reason,
    severity,
    createdAt: createdAt || null,
    updatedAt: updatedAt || null,
    personRecipientId,
    unresolved: true,
    priorityScore: severityRank(reason),
    primaryAction: primaryAction || null,
    destination: destination || { entityType, entityId, surfaceOrigin: 'attention' },
    sourceVersion: ATTENTION_PROJECTION_VERSION,
  };
}

function paymentSourceToAttentionDTO(item) {
  return toAttentionDTO({
    attentionId: item.attentionId,
    dedupeKey: item.dedupeKey,
    reason: item.reason,
    entityType: item.entityType,
    entityId: item.entityId,
    title: item.title,
    summary: item.summary,
    severity: item.severity,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    personRecipientId: item.personRecipientId,
    primaryAction: item.primaryAction,
    destination: item.destination,
  });
}

// ---- TASK SOURCES ----

async function loadAwaitingVerificationTasks(context) {
  const { data, error } = await context.client
    .from('planner_task_fulfillments')
    .select('task_id,responsible_member_id,household_id,completed_at,retired_at,inactive_at')
    .eq('household_id', context.householdId)
    .eq('status', 'awaiting_verification')
    .is('retired_at', null)
    .is('inactive_at', null)
    .limit(ATTENTION_LIMIT_MAX);

  if (error || !data || data.length === 0) return [];

  const taskIds = [...new Set(data.map((f) => f.task_id))].filter(Boolean);
  if (taskIds.length === 0) return [];

  // Frozen §38: ATTENTION excludes archived AND trashed.
  const { data: tasks, error: taskError } = await context.client
    .from('planner_tasks')
    .select('id,household_id,title,due_date,due_time,created_by_person_id,created_at,updated_at,trashed_at,archived_at')
    .in('id', taskIds)
    .is('trashed_at', null)
    .is('archived_at', null)
    .neq('status', 'cancelled');

  if (taskError || !tasks || tasks.length === 0) return [];

  const accessContext = buildPlannerAccessContext(context);
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  return data
    .filter((f) => {
      const task = taskMap.get(f.task_id);
      return task && isVisibleInPlannerContext(toVisibilityInput(task, 'task'), accessContext);
    })
    .map((f) => {
      const task = taskMap.get(f.task_id);
      return toAttentionDTO({
        attentionId: buildAttentionId(ATTENTION_REASONS.TASK_AWAITING_VERIFICATION, 'task', task.id, context.personId),
        dedupeKey: buildDedupeKey(ATTENTION_REASONS.TASK_AWAITING_VERIFICATION, 'task', task.id, context.personId),
        reason: ATTENTION_REASONS.TASK_AWAITING_VERIFICATION,
        entityType: 'task',
        entityId: task.id,
        title: titleOf(task),
        summary: 'Requiere verificacion.',
        severity: 'high',
        createdAt: f.completed_at || task.updated_at,
        updatedAt: task.updated_at || task.created_at,
        personRecipientId: context.personId,
        primaryAction: { label: 'Verificar', capability: 'task.verify' },
      });
    });
}

async function loadCorrectionPendingTasks(context) {
  const { data, error } = await context.client
    .from('planner_task_fulfillments')
    .select('task_id,responsible_member_id,household_id,retired_at,inactive_at')
    .eq('household_id', context.householdId)
    .eq('status', 'correction_requested')
    .is('retired_at', null)
    .is('inactive_at', null)
    .limit(ATTENTION_LIMIT_MAX);

  if (error || !data || data.length === 0) return [];

  const taskIds = [...new Set(data.map((f) => f.task_id))].filter(Boolean);
  if (taskIds.length === 0) return [];

  // Frozen §38: ATTENTION excludes archived AND trashed.
  const { data: tasks, error: taskError } = await context.client
    .from('planner_tasks')
    .select('id,household_id,title,description,created_by_person_id,created_at,updated_at,trashed_at,archived_at')
    .in('id', taskIds)
    .is('trashed_at', null)
    .is('archived_at', null)
    .neq('status', 'cancelled');

  if (taskError || !tasks || tasks.length === 0) return [];

  const accessContext = buildPlannerAccessContext(context);
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const items = [];
  for (const f of data) {
    const task = taskMap.get(f.task_id);
    if (!task) continue;
    if (!isVisibleInPlannerContext(toVisibilityInput(task, 'task'), accessContext)) continue;
    if (f.responsible_member_id && f.responsible_member_id !== context.membershipId) continue;

    items.push(toAttentionDTO({
      attentionId: buildAttentionId(ATTENTION_REASONS.TASK_CORRECTION_REQUESTED, 'task', task.id, context.personId),
      dedupeKey: buildDedupeKey(ATTENTION_REASONS.TASK_CORRECTION_REQUESTED, 'task', task.id, context.personId),
      reason: ATTENTION_REASONS.TASK_CORRECTION_REQUESTED,
      entityType: 'task',
      entityId: task.id,
      title: titleOf(task),
      summary: 'Correccion solicitada. Revisa y reenvia.',
      severity: 'critical',
      createdAt: task.updated_at || task.created_at,
      updatedAt: task.updated_at || task.created_at,
      personRecipientId: context.personId,
      primaryAction: { label: 'Corregir', capability: 'task.complete_assigned' },
    }));
  }
  return items;
}

// ---- PLAN SOURCES ----

// ---- PLAN SOURCES ----
//
// The retired `PLAN_BLOCKER` / `PLAN_REVIEW_REQUIRED` sources are gone: they
// read `planner_plans` (the M11.3A legacy container, not the canonical root)
// and filtered on `lifecycle in ('blocked','review')`, states the canonical
// Plan lifecycle (preparation/active/paused/completed/cancelled) never has.
// Both were structurally dead and are removed rather than repointed: Attention
// is a CONSUMER of canonical authorities, it must not invent Plan states.
//
// A Plan is attention-worthy exactly when canonical Readiness says a Required
// component is unresolved (frozen §26/§38: exclude archived + trashed).

async function loadUnreadyPlans(context) {
  const { data, error } = await context.client
    .from('planner_goals')
    .select('id,visibility,owner_person_id,household_id,title,description,lifecycle,archived_at,trashed_at,version,updated_at,created_at')
    .eq('visibility', 'household')
    .eq('household_id', context.householdId)
    .is('deleted_at', null)
    .is('trashed_at', null)
    .is('archived_at', null)
    .in('lifecycle', ['preparation', 'active', 'paused'])
    .limit(ATTENTION_LIMIT_MAX);

  if (error || !data || data.length === 0) return [];

  const accessContext = buildPlannerAccessContext(context);
  const candidates = data.filter((p) => isVisibleInPlannerContext(toVisibilityInput(p, 'plan'), accessContext));
  if (candidates.length === 0) return [];

  const items = [];
  for (const plan of candidates) {
    let readiness = null;
    try {
      const { data: readinessData, error: readinessError } = await context.client.rpc(
        'get_planner_plan_readiness_v1',
        { p_goal_id: plan.id, p_context_household_id: context.householdId },
      );
      if (!readinessError && readinessData?.success) readiness = readinessData.readiness;
    } catch {
      readiness = null;
    }
    if (!readiness || readiness.ready === true) continue;

    items.push(toAttentionDTO({
      attentionId: buildAttentionId(ATTENTION_REASONS.PLAN_UNRESOLVED_REQUIRED, 'plan', plan.id, context.personId),
      dedupeKey: buildDedupeKey(ATTENTION_REASONS.PLAN_UNRESOLVED_REQUIRED, 'plan', plan.id, context.personId),
      reason: ATTENTION_REASONS.PLAN_UNRESOLVED_REQUIRED,
      entityType: 'plan',
      entityId: plan.id,
      title: titleOf(plan, 'Plan sin titulo'),
      summary: `${readiness.pendingTotal} componente(s) requerido(s) sin resolver.`,
      severity: readiness.pendingTotal > 1 ? 'high' : 'medium',
      createdAt: plan.updated_at || plan.created_at,
      updatedAt: plan.updated_at || plan.created_at,
      personRecipientId: context.personId,
      primaryAction: null,
    }));
  }
  return items;
}

// ---- EVENT SOURCES ----

async function loadRsvpRequiredEvents(context) {
  const { data, error } = await context.client
    .from('planner_event_participants')
    .select('event_id,person_id,rsvp_status')
    .eq('person_id', context.personId)
    .eq('rsvp_status', 'pending')
    .limit(ATTENTION_LIMIT_MAX);

  if (error || !data || data.length === 0) return [];

  const eventIds = [...new Set(data.map((p) => p.event_id))].filter(Boolean);
  if (eventIds.length === 0) return [];

  const { data: events, error: eventError } = await context.client
    .from('planner_events')
    .select('id,household_id,title,description,starts_at,ends_at,status,created_at,updated_at,trashed_at')
    .in('id', eventIds)
    .is('trashed_at', null)
    .neq('status', 'cancelled');

  if (eventError || !events || events.length === 0) return [];

  const accessContext = buildPlannerAccessContext(context);
  const eventMap = new Map(events.map((e) => [e.id, e]));

  const items = [];
  for (const p of data) {
    const event = eventMap.get(p.event_id);
    if (!event) continue;
    if (!isVisibleInPlannerContext(toVisibilityInput(event, 'event'), accessContext)) continue;

    const dateStr = event.starts_at ? new Date(event.starts_at).toLocaleDateString() : '';
    items.push(toAttentionDTO({
      attentionId: buildAttentionId(ATTENTION_REASONS.EVENT_RSVP_REQUIRED, 'event', event.id, context.personId),
      dedupeKey: buildDedupeKey(ATTENTION_REASONS.EVENT_RSVP_REQUIRED, 'event', event.id, context.personId),
      reason: ATTENTION_REASONS.EVENT_RSVP_REQUIRED,
      entityType: 'event',
      entityId: event.id,
      title: event.title || 'Evento sin titulo',
      summary: dateStr ? `Confirmar asistencia. ${dateStr}` : 'Confirmar asistencia.',
      severity: 'medium',
      createdAt: event.starts_at || event.created_at,
      updatedAt: event.updated_at || event.created_at,
      personRecipientId: context.personId,
      primaryAction: { label: 'Responder', capability: 'event.edit_own' },
    }));
  }
  return items;
}

// ---- MAIN EXPORT ----

async function listAttention(context, options = {}) {
  const limit = parseAttentionLimit(options.limit);

  const [verifyingTasks, correctionTasks, unreadyPlans, rsvpEvents, paymentAttention] = await Promise.all([
    loadAwaitingVerificationTasks(context),
    loadCorrectionPendingTasks(context),
    loadUnreadyPlans(context),
    loadRsvpRequiredEvents(context),
    loadPaymentAttention(context, { todayDate: options.todayDate, limit: ATTENTION_LIMIT_MAX }),
  ]);

  const allItems = [
    ...(verifyingTasks || []),
    ...(correctionTasks || []),
    ...(unreadyPlans || []),
    ...(rsvpEvents || []),
    ...(paymentAttention || []).map(paymentSourceToAttentionDTO),
  ];

  // Deduplication by source identity; Payment identity stays stable as reason evolves.
  const seen = new Set();
  const deduped = [];
  for (const item of allItems) {
    const key = item.dedupeKey || `${item.reason}:${item.entityType}:${item.entityId}:${item.personRecipientId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  // Priority: severity rank, then recency
  deduped.sort((a, b) => {
    const scoreDiff = severityRank(a.reason) - severityRank(b.reason);
    if (scoreDiff !== 0) return scoreDiff;
    const bTime = b.createdAt || '';
    const aTime = a.createdAt || '';
    if (aTime !== bTime) return bTime.localeCompare(aTime);
    return (a.attentionId || '').localeCompare(b.attentionId || '');
  });

  const trimmed = deduped.slice(0, limit);

  return {
    projectionVersion: ATTENTION_PROJECTION_VERSION,
    context: 'active',
    generatedAt: new Date().toISOString(),
    limit,
    total: trimmed.length,
    items: trimmed,
  };
}

module.exports = {
  ATTENTION_LIMIT_DEFAULT,
  ATTENTION_LIMIT_MAX,
  ATTENTION_PROJECTION_VERSION,
  ATTENTION_REASONS,
  ATTENTION_SOURCE_ENTITIES,
  buildAttentionId,
  buildDedupeKey,
  listAttention,
};
