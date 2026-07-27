'use strict';

const { createHttpError } = require('../lib/httpErrors');
const { CANONICAL_ERROR_CODES } = require('../lib/mutationContracts');

const PLAN_GRAPH_ENTITIES = Object.freeze([
  'plan',
  'milestone',
  'measurement',
  'manual_condition',
  'requirement',
]);

const PLAN_TRANSITIONS = Object.freeze([
  'activate',
  'pause',
  'resume',
  'complete',
  'close',
  'reopen',
  'archive',
  'unarchive',
  'trash',
  'restore',
]);

function mapPlanRpcError(error) {
  if (!error) return null;
  const code = error.code;
  if (code === '42501') {
    return createHttpError(403, 'No tenes permiso para modificar este Plan.', 'forbidden');
  }
  if (code === '40007') {
    let details = null;
    try { details = error.details ? JSON.parse(error.details) : null; } catch (_) { details = null; }
    return createHttpError(
      412,
      'La version del grafo cambio. Actualiza y reintenta.',
      'version_conflict_v2',
      details,
    );
  }
  if (code === 'P0008') {
    return createHttpError(409, 'La operacion ya fue usada con otros datos.', CANONICAL_ERROR_CODES.IDEMPOTENCY_CONFLICT);
  }
  if (code === 'P0009') {
    return createHttpError(409, 'La operacion todavia se esta procesando.', CANONICAL_ERROR_CODES.IDEMPOTENCY_IN_FLIGHT);
  }
  if (code === 'P0002') {
    return createHttpError(404, 'Plan o elemento no encontrado.', 'not_found');
  }
  if (code === '55000') {
    return createHttpError(409, 'La operacion no es valida para el estado actual.', 'invalid_transition');
  }
  if (code === '22023' || code === '22P02' || code === '22003' || code === '22007'
    || code === '23514' || code === '23505' || code === '23503' || code === '23502') {
    return createHttpError(422, 'El grafo del Plan no es valido.', 'validation_error');
  }
  const mapped = createHttpError(500, 'Error interno.', 'internal_error');
  mapped.supabaseError = { code, message: error.message, details: error.details, hint: error.hint };
  return mapped;
}

function assertGraphWriteInput(input) {
  if (!PLAN_GRAPH_ENTITIES.includes(input?.entityType)) {
    throw createHttpError(400, 'Tipo de elemento de Plan invalido.', 'validation_error');
  }
  if (typeof input?.action !== 'string' || !input.action.trim()) {
    throw createHttpError(400, 'Accion de Plan invalida.', 'validation_error');
  }
  if (input.entityType === 'plan' && input.action === 'create') {
    const scope = input.payload?.scope ?? 'personal';
    if (scope !== 'personal' && scope !== 'household') {
      throw createHttpError(422, 'Scope de Plan invalido.', 'validation_error');
    }
    if (typeof input.payload?.objective !== 'string' || !input.payload.objective.trim()) {
      throw createHttpError(422, 'El objetivo del Plan es obligatorio.', 'validation_error');
    }
  }
  if (input.entityType !== 'plan'
    && (!Number.isInteger(input.expectedPlanVersion) || input.expectedPlanVersion < 1)) {
    throw createHttpError(422, 'expectedPlanVersion es obligatorio.', 'expected_plan_version_required');
  }
  if (input.entityType === 'plan' && input.action === 'transition') {
    const transition = input.payload?.transition;
    if (!PLAN_TRANSITIONS.includes(transition)) {
      throw createHttpError(400, 'Transicion de Plan invalida.', 'invalid_transition');
    }
  }
}

function targetReached(measurement) {
  if (measurement.target_value === null || measurement.target_value === undefined) return false;
  if (measurement.target_operator === 'lte') return Number(measurement.current_value) <= Number(measurement.target_value);
  if (measurement.target_operator === 'eq') return Number(measurement.current_value) === Number(measurement.target_value);
  return Number(measurement.current_value) >= Number(measurement.target_value);
}

function structuralActions(plan) {
  if (plan.trashed_at) return ['restore'];
  if (plan.lifecycle === 'draft') return ['update', 'activate', 'trash'];
  if (plan.lifecycle === 'active') return ['update', 'pause', 'complete', 'close', 'trash'];
  if (plan.lifecycle === 'paused') return ['update', 'resume', 'complete', 'close', 'trash'];
  if (plan.lifecycle === 'completed' || plan.lifecycle === 'closed') {
    return [plan.archived_at ? 'unarchive' : 'archive', 'reopen', 'trash'];
  }
  return [];
}

function toPlanDto(plan) {
  return {
    id: plan.id,
    version: plan.version,
    scope: plan.scope,
    ownerPersonId: plan.owner_person_id,
    householdId: plan.household_id,
    objective: plan.objective,
    description: plan.description,
    lifecycle: plan.trashed_at ? 'trash' : plan.lifecycle,
    targetDate: plan.target_date,
    finalizationKind: plan.finalization_kind,
    archivedAt: plan.archived_at,
    trashedAt: plan.trashed_at,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at,
    availableActions: structuralActions(plan),
  };
}

function toPlanGraphDto(raw) {
  const plan = raw.plan;
  const indicators = raw.indicators ?? {};
  return {
    plan: toPlanDto(plan),
    indicators: {
      milestoneCount: Number(indicators.milestone_count ?? 0),
      completedMilestoneCount: Number(indicators.completed_milestone_count ?? 0),
      measurementCount: Number(indicators.measurement_count ?? 0),
      reachedMeasurementCount: Number(indicators.reached_measurement_count ?? 0),
      necessaryRequirementCount: Number(indicators.necessary_requirement_count ?? 0),
      satisfiedNecessaryRequirementCount: Number(indicators.satisfied_necessary_requirement_count ?? 0),
      supportingRequirementCount: Number(indicators.supporting_requirement_count ?? 0),
    },
    milestones: (raw.milestones ?? []).map((row) => ({
      id: row.id, planId: row.plan_id, version: row.version, title: row.title,
      description: row.description, completionMode: row.completion_mode,
      lifecycle: row.trashed_at ? 'trash' : row.lifecycle,
      classification: row.classification, sortOrder: row.sort_order,
    })),
    measurements: (raw.measurements ?? []).map((row) => ({
      id: row.id, planId: row.plan_id, version: row.version, name: row.name,
      currentValue: Number(row.current_value),
      targetValue: row.target_value === null ? null : Number(row.target_value),
      unit: row.unit, targetOperator: row.target_operator,
      targetReached: targetReached(row), classification: row.classification,
      sortOrder: row.sort_order,
      history: (row.history ?? []).map((entry) => ({
        id: entry.id, value: Number(entry.value),
        previousValue: entry.previous_value === null ? null : Number(entry.previous_value),
        correctionOfId: entry.correction_of_id, recordedAt: entry.recorded_at,
      })),
    })),
    manualConditions: (raw.manualConditions ?? []).map((row) => ({
      id: row.id, planId: row.plan_id, version: row.version, label: row.label,
      isSatisfied: row.is_satisfied, classification: row.classification,
      sortOrder: row.sort_order,
    })),
    requirements: (raw.requirements ?? []).map((row) => ({
      id: row.id, planId: row.plan_id, parentRequirementId: row.parent_requirement_id,
      version: row.version, classification: row.classification, sortOrder: row.sort_order,
      subject: row.subject_type === 'external'
        ? { kind: 'external', externalKind: row.external_kind,
          externalReferenceKey: row.external_reference_key, externalEntityId: null,
          bindingState: 'pending_integration' }
        : row.subject_type === 'milestone'
          ? { kind: 'milestone', milestoneId: row.milestone_id }
          : row.subject_type === 'measurement'
            ? { kind: 'measurement', measurementId: row.measurement_id }
            : { kind: 'manual_condition', manualConditionId: row.manual_condition_id },
      satisfied: row.satisfied === true,
    })),
    draftIsolation: raw.draftIsolation,
  };
}

async function listPlans(context, filters = {}) {
  let query = context.client
    .from('planner_plans')
    .select('id,scope,owner_person_id,household_id,objective,description,lifecycle,target_date,finalization_kind,archived_at,trashed_at,version,created_at,updated_at')
    .is('trashed_at', null)
    .order('updated_at', { ascending: false });

  if (filters.scope === 'personal' || filters.scope === 'household') query = query.eq('scope', filters.scope);
  if (filters.lifecycle) query = query.eq('lifecycle', filters.lifecycle);
  if (filters.archived === 'true') query = query.not('archived_at', 'is', null);
  if (filters.archived !== 'true') query = query.is('archived_at', null);

  const { data, error } = await query;
  if (error) throw mapPlanRpcError(error);
  return { plans: (data ?? []).map(toPlanDto) };
}

async function getPlanGraph(context, planId) {
  const { data, error } = await context.client.rpc('read_planner_plan_graph_rpc', {
    p_plan_id: planId,
  });
  if (error) throw mapPlanRpcError(error);
  if (!data) throw createHttpError(404, 'Plan no encontrado.', 'not_found');
  return toPlanGraphDto(data);
}

async function getPlanAuthorizationContext(context, planId) {
  const { data, error } = await context.client.rpc('planner_plan_authorization_context_rpc', {
    p_plan_id: planId,
  });
  if (error) throw mapPlanRpcError(error);
  if (!data) throw createHttpError(404, 'Plan no encontrado.', 'not_found');
  return data;
}

async function writePlanGraph(context, input) {
  assertGraphWriteInput(input);
  const { data, error } = await context.client.rpc('write_planner_plan_graph_rpc', {
    p_mutation_id: input.operationId,
    p_idempotency_key: input.idempotencyKey,
    p_request_hash: input.payloadHash,
    p_entity_type: input.entityType,
    p_action: input.action,
    p_plan_id: input.planId ?? null,
    p_entity_id: input.entityId ?? null,
    p_expected_version: input.expectedVersion ?? null,
    p_expected_plan_version: input.expectedPlanVersion ?? null,
    p_payload: input.payload ?? {},
    p_request_id: input.requestId ?? null,
    p_canonical_reserved: input.canonicalReserved === true,
    p_canonical_operation: input.canonicalOperation ?? null,
  });
  if (error) throw mapPlanRpcError(error);
  if (data?.__planError === true) {
    const mapped = createHttpError(
      Number(data.status),
      data.message,
      data.code,
      data.details && Object.keys(data.details).length ? data.details : null,
    );
    mapped.storedEnvelope = data.body;
    throw mapped;
  }
  return data;
}

async function getLegacyCompatibilityReport(context) {
  const { data, error } = await context.client.rpc('planner_m11_3a_legacy_compatibility_report');
  if (error) throw mapPlanRpcError(error);
  return data;
}

module.exports = {
  PLAN_GRAPH_ENTITIES,
  PLAN_TRANSITIONS,
  assertGraphWriteInput,
  getLegacyCompatibilityReport,
  getPlanAuthorizationContext,
  getPlanGraph,
  listPlans,
  mapPlanRpcError,
  toPlanGraphDto,
  toPlanDto,
  writePlanGraph,
};
