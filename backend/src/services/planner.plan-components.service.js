'use strict';

// Plan components service — Task/Event link surface for Events, Plan-local
// Measurements, and the single-server Readiness + factual Progress readers.
//
// Authority: overnight frozen Product Truth §§20-32. Tasks link through the
// canonical V0 writer (planner.tasks.service); Events link through
// link/unlink_planner_event_to_plan; Measurements are Plan-local only.
// Readiness comes from get_planner_plan_readiness_v1 — the frontend must
// present it, never recalculate it.

const { createHttpError } = require('../lib/httpErrors');
const { throwPlanWriterError } = require('../lib/plannerGoalWriteAuthority');

const WRITER_MESSAGES = {
  forbidden: 'No tenes permiso para realizar esta accion sobre el plan.',
  versionConflict: 'Este plan cambió en otro dispositivo. Actualizá y volvé a intentar.',
};

const COMPONENT_ERRORS = {
  event_not_found: { status: 404, message: 'Evento no encontrado.', code: 'event_not_found' },
  plan_not_found: { status: 404, message: 'Plan no encontrado.', code: 'plan_not_found' },
  measurement_not_found: { status: 404, message: 'Medición no encontrada.', code: 'measurement_not_found' },
  personal_events_not_supported: { status: 400, message: 'Los Planes son solo de hogar.', code: 'personal_events_not_supported' },
  expected_version_required: { status: 422, message: 'If-Match es obligatorio.', code: 'expected_version_required' },
  validation_error: { status: 400, message: 'Payload inválido.', code: 'validation_error' },
  invalid_plan_classification: { status: 400, message: 'Clasificación inválida (necessary/supporting).', code: 'invalid_plan_classification' },
  target_required: { status: 400, message: 'La medición requerida necesita un objetivo.', code: 'target_required' },
  plan_locked: { status: 409, message: 'El plan no admite cambios de componentes en su estado actual.', code: 'plan_locked' },
  event_not_operational: { status: 409, message: 'El evento no está operativo.', code: 'event_not_operational' },
  measurement_in_trash: { status: 409, message: 'La medición está en la papelera.', code: 'measurement_in_trash' },
};

const unwrapComponentResult = (result, key) => {
  if (result && result.success === true) {
    return key ? result[key] : result;
  }
  const failure = result?.error ?? 'plan_not_found';
  const mapped = COMPONENT_ERRORS[failure] ?? COMPONENT_ERRORS.plan_not_found;
  throw createHttpError(mapped.status, mapped.message, mapped.code);
};

const callComponentWriter = async (context, rpcName, params) => {
  const { data, error } = await context.client.rpc(rpcName, params);
  if (error) {
    throwPlanWriterError(error, WRITER_MESSAGES, rpcName);
  }
  return data;
};

const normalizeClassification = (value) => {
  if (value === undefined || value === null || value === '') return 'necessary';
  const normalized = String(value).trim().toLowerCase();
  if (normalized !== 'necessary' && normalized !== 'supporting') {
    throw createHttpError(400, 'Clasificación inválida (necessary/supporting).', 'invalid_plan_classification');
  }
  return normalized;
};

const linkEventToPlan = async (context, eventId, body, planIdFromRoute) => {
  const goalId = (typeof body?.goal_id === 'string' && body.goal_id)
    || (typeof body?.goalId === 'string' && body.goalId)
    || planIdFromRoute;
  if (!goalId) {
    throw createHttpError(400, 'goal_id es obligatorio.', 'validation_error');
  }
  const result = await callComponentWriter(context, 'link_planner_event_to_plan', {
    p_event_id: eventId,
    p_goal_id: goalId,
    p_classification: normalizeClassification(body?.plan_classification ?? body?.classification),
    p_expected_version: body?.expected_version ?? null,
    p_context_household_id: context.householdId,
  });
  return { event: unwrapComponentResult(result, 'event') };
};

const unlinkEventFromPlan = async (context, eventId, body) => {
  const result = await callComponentWriter(context, 'unlink_planner_event_from_plan', {
    p_event_id: eventId,
    p_expected_version: body?.expected_version ?? null,
    p_context_household_id: context.householdId,
  });
  return { event: unwrapComponentResult(result, 'event') };
};

const MEASUREMENT_OPERATORS = Object.freeze(['gte', 'lte', 'eq']);

const validateMeasurementBody = (body, { requireTarget = false } = {}) => {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const unit = typeof body?.unit === 'string' ? body.unit.trim() : '';
  if (!name) throw createHttpError(400, 'name es obligatorio.', 'validation_error');
  if (!unit) throw createHttpError(400, 'unit es obligatorio.', 'validation_error');
  const operator = body?.target_operator ?? body?.targetOperator ?? 'gte';
  if (!MEASUREMENT_OPERATORS.includes(operator)) {
    throw createHttpError(400, 'target_operator debe ser gte, lte o eq.', 'validation_error');
  }
  const classification = normalizeClassification(body?.classification ?? body?.plan_classification);
  const target = body?.target_value ?? body?.targetValue ?? null;
  if (requireTarget && classification === 'necessary' && (target === null || target === undefined)) {
    throw createHttpError(400, 'La medición requerida necesita un objetivo.', 'target_required');
  }
  return { name, unit, operator, classification, target };
};

const createMeasurement = async (context, planId, body, correlation = {}) => {
  const validated = validateMeasurementBody(body, { requireTarget: true });
  const result = await callComponentWriter(context, 'create_planner_plan_measurement_v1', {
    p_goal_id: planId,
    p_name: validated.name,
    p_unit: validated.unit,
    p_current_value: body?.current_value ?? body?.currentValue ?? 0,
    p_target_value: validated.target,
    p_target_operator: validated.operator,
    p_classification: validated.classification,
    p_operation_id: correlation.mutationId ?? correlation.operation ?? 'planner.measurement.create',
    p_context_household_id: context.householdId,
  });
  return { measurement: unwrapComponentResult(result, 'measurement') };
};

const updateMeasurement = async (context, measurementId, body, expectedVersion, correlation = {}) => {
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);
  const pick = (...keys) => {
    for (const key of keys) {
      if (has(key)) return body[key];
    }
    return undefined;
  };
  const result = await callComponentWriter(context, 'update_planner_plan_measurement_v1', {
    p_measurement_id: measurementId,
    p_expected_version: expectedVersion ?? null,
    p_name: pick('name') ?? null,
    p_current_value: pick('current_value', 'currentValue') ?? null,
    p_target_value: has('target_value') || has('targetValue') ? (pick('target_value', 'targetValue') ?? null) : null,
    p_unit: pick('unit') ?? null,
    p_target_operator: pick('target_operator', 'targetOperator') ?? null,
    p_classification: pick('classification', 'plan_classification') ?? null,
    p_set_name: has('name'),
    p_set_current: has('current_value') || has('currentValue'),
    p_set_target: has('target_value') || has('targetValue'),
    p_set_unit: has('unit'),
    p_set_operator: has('target_operator') || has('targetOperator'),
    p_set_classification: has('classification') || has('plan_classification'),
    p_operation_id: correlation.mutationId ?? correlation.operation ?? 'planner.measurement.update',
    p_context_household_id: context.householdId,
  });
  return { measurement: unwrapComponentResult(result, 'measurement') };
};

const trashMeasurement = async (context, measurementId, expectedVersion) => {
  const result = await callComponentWriter(context, 'trash_planner_plan_measurement_v1', {
    p_measurement_id: measurementId,
    p_expected_version: expectedVersion ?? null,
    p_context_household_id: context.householdId,
  });
  return { measurement: unwrapComponentResult(result, 'measurement') };
};

const restoreMeasurement = async (context, measurementId, expectedVersion) => {
  const result = await callComponentWriter(context, 'restore_planner_plan_measurement_v1', {
    p_measurement_id: measurementId,
    p_expected_version: expectedVersion ?? null,
    p_context_household_id: context.householdId,
  });
  return { measurement: unwrapComponentResult(result, 'measurement') };
};

const listMeasurements = async (context, planId) => {
  const result = await callComponentWriter(context, 'get_planner_plan_measurements_v1', {
    p_goal_id: planId,
    p_context_household_id: context.householdId,
  });
  if (result && result.success === true) {
    return { measurements: result.measurements ?? [] };
  }
  return { measurements: unwrapComponentResult(result, 'measurements') };
};

const listTrashedMeasurements = async (context, planId) => {
  const result = await callComponentWriter(context, 'get_planner_plan_trashed_measurements_v1', {
    p_goal_id: planId,
    p_context_household_id: context.householdId,
  });
  return { measurements: unwrapComponentResult(result, 'measurements') };
};

const listMeasurementHistory = async (context, planId, measurementId) => {
  const result = await callComponentWriter(context, 'get_planner_plan_measurement_history_v1', {
    p_goal_id: planId,
    p_measurement_id: measurementId,
    p_context_household_id: context.householdId,
  });
  return { history: unwrapComponentResult(result, 'history') };
};

const getPlanReadiness = async (context, planId) => {
  const result = await callComponentWriter(context, 'get_planner_plan_readiness_v1', {
    p_goal_id: planId,
    p_context_household_id: context.householdId,
  });
  if (result && result.success === true) {
    return { readiness: result.readiness, progress: result.progress };
  }
  unwrapComponentResult(result);
  throw createHttpError(500, 'Respuesta de readiness inválida.', 'internal_error');
};

// Linked components with the versions the UI needs for link/unlink.
// Reads go through RLS; the link RPCs remain the only writers.
const getPlanComponents = async (context, planId) => {
  const { data: plan, error: planError } = await context.client
    .from('planner_goals')
    .select('id, household_id, trashed_at, deleted_at')
    .eq('id', planId)
    .maybeSingle();
  if (planError || !plan || plan.deleted_at || plan.household_id !== context.householdId) {
    throw createHttpError(404, 'Plan no encontrado.', 'plan_not_found');
  }
  const { data: tasks, error: tasksError } = await context.client
    .from('planner_tasks')
    .select('id, title, status, version, plan_classification, due_date')
    .eq('goal_id', planId)
    .is('trashed_at', null)
    .order('created_at', { ascending: true });
  if (tasksError) {
    // Component reads can drift from the physical Planner schema just like a
    // writer can. Keep the public error safe, but retain the SQLSTATE in the
    // project-standard diagnostic mapper instead of turning it into an opaque
    // 500 that cannot be diagnosed from the backend logs.
    throwPlanWriterError(tasksError, WRITER_MESSAGES, 'get_plan_components.tasks');
  }
  const { data: events, error: eventsError } = await context.client
    .from('planner_events')
    .select('id, title, status, lifecycle, version, plan_classification, starts_at, ends_at, start_date, end_date, schedule_type, all_day')
    .eq('goal_id', planId)
    .is('trashed_at', null)
    .neq('lifecycle', 'trash')
    .order('created_at', { ascending: true });
  if (eventsError) {
    throwPlanWriterError(eventsError, WRITER_MESSAGES, 'get_plan_components.events');
  }
  return { tasks: tasks ?? [], events: events ?? [] };
};

module.exports = {
  linkEventToPlan,
  unlinkEventFromPlan,
  createMeasurement,
  updateMeasurement,
  trashMeasurement,
  restoreMeasurement,
  listMeasurements,
  listTrashedMeasurements,
  listMeasurementHistory,
  getPlanReadiness,
  getPlanComponents,
};
