'use strict';

const { getPlannerContext } = require('../services/planner.context.service');
const plansV1Service = require('../services/planner.plans.v1.service');
const {
  requireMutationId,
  parseRequiredExpectedVersion,
} = require('../lib/plannerMutationContracts');
const {
  requireIdempotencyKey,
  hashIdempotencyRequest,
  withIdempotency,
} = require('../lib/plannerIdempotencyAdapter');
const { resolveCapabilities, assertCapability } = require('../lib/plannerCapabilities');
const { sendApiError } = require('../lib/httpErrors');
const { createHttpError } = require('../lib/httpErrors');

function buildCapabilities(context) {
  return resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
}

const listPlans = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');
    const payload = await plansV1Service.listPlans(context, req.query ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const componentsService = require('../services/planner.plan-components.service');

const getPlanReadiness = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');
    const payload = await componentsService.getPlanReadiness(context, req.params.id);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const listMeasurements = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');
    const payload = await componentsService.listMeasurements(context, req.params.id);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const listTrashedMeasurements = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.view');
    return res.status(200).json(await componentsService.listTrashedMeasurements(context, req.params.id));
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const listMeasurementHistory = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.view');
    return res.status(200).json(await componentsService.listMeasurementHistory(
      context, req.params.id, req.params.measurementId,
    ));
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const getPlanComponents = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');
    const payload = await componentsService.getPlanComponents(context, req.params.id);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const runComponentMutation = async (req, res, options) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, options.capability ?? 'goal.edit_own');

    const operation = options.operation;
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const expectedVersion = options.requireVersion === false
      ? null
      : parseRequiredExpectedVersion(req);
    const requestHash = hashIdempotencyRequest({
      method: options.method ?? 'POST',
      operation,
      params: { id: req.params.id, measurementId: req.params.measurementId, eventId: req.params.eventId },
      body: req.body ?? {},
      expectedVersion,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: options.successStatus ?? 200 },
      () => options.execute(context, req, expectedVersion, { mutationId, idempotencyKey, operation }),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const createMeasurement = (req, res) => runComponentMutation(req, res, {
  operation: 'planner.plans.v1.measurements.create',
  successStatus: 201,
  requireVersion: false,
  execute: (context, req, _expectedVersion, correlation) => componentsService.createMeasurement(
    context, req.params.id, req.body ?? {}, correlation,
  ),
});

const updateMeasurement = (req, res) => runComponentMutation(req, res, {
  operation: 'planner.plans.v1.measurements.update',
  method: 'PATCH',
  execute: (context, req, expectedVersion, correlation) => componentsService.updateMeasurement(
    context, req.params.measurementId, req.body ?? {}, expectedVersion, correlation,
  ),
});

const trashMeasurement = (req, res) => runComponentMutation(req, res, {
  operation: 'planner.plans.v1.measurements.trash',
  execute: (context, req, expectedVersion) => componentsService.trashMeasurement(
    context, req.params.measurementId, expectedVersion,
  ),
});

const restoreMeasurement = (req, res) => runComponentMutation(req, res, {
  operation: 'planner.plans.v1.measurements.restore',
  execute: (context, req, expectedVersion) => componentsService.restoreMeasurement(
    context, req.params.measurementId, expectedVersion,
  ),
});

const linkEvent = (req, res) => runComponentMutation(req, res, {
  operation: 'planner.plans.v1.events.link',
  requireVersion: false,
  execute: (context, req) => componentsService.linkEventToPlan(
    context, req.params.eventId, req.body ?? {}, req.params.id,
  ),
});

const unlinkEvent = (req, res) => runComponentMutation(req, res, {
  operation: 'planner.plans.v1.events.unlink',
  requireVersion: false,
  execute: (context, req) => componentsService.unlinkEventFromPlan(
    context, req.params.eventId, req.body ?? {},
  ),
});

const getPlanById = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');
    const payload = await plansV1Service.getPlanById(context, req.params.id);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const createPlan = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);

    if ((req.body?.scope ?? 'household') !== 'household') {
      throw createHttpError(400, 'Los Planes son solo de hogar.', 'personal_plans_not_supported');
    }
    assertCapability(capabilities, 'goal.create_household');

    const operation = 'planner.plans.v1.create';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: {},
      body: req.body ?? {},
      expectedVersion: null,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 201 },
      () => plansV1Service.createPlan(context, req.body ?? {}),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const updatePlan = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.edit_own');

    const operation = 'planner.plans.v1.update';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const requestHash = hashIdempotencyRequest({
      method: 'PATCH',
      operation,
      params: { id: req.params.id },
      body: req.body ?? {},
      expectedVersion,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => plansV1Service.updatePlan(context, req.params.id, req.body ?? {}, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const transitionPlan = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.edit_own');

    const operation = `planner.plans.v1.${req.body?.transition}`;
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { id: req.params.id },
      body: { transition: req.body?.transition, ...req.body },
      expectedVersion,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => plansV1Service.transitionPlan(context, req.params.id, expectedVersion, req.body?.transition, req.body ?? {}),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const trashPlan = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.restore');

    const operation = 'planner.plans.v1.trash';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { id: req.params.id },
      body: {},
      expectedVersion,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => plansV1Service.trashPlan(context, req.params.id, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const restorePlan = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.restore');

    const operation = 'planner.plans.v1.restore';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { id: req.params.id },
      body: {},
      expectedVersion,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => plansV1Service.restorePlan(context, req.params.id, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const unarchivePlan = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.edit_own');

    const operation = 'planner.plans.v1.unarchive';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { id: req.params.id },
      body: {},
      expectedVersion,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => plansV1Service.unarchivePlan(context, req.params.id, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  createPlan,
  getPlanById,
  getPlanReadiness,
  getPlanComponents,
  listPlans,
  listMeasurements,
  listTrashedMeasurements,
  listMeasurementHistory,
  createMeasurement,
  updateMeasurement,
  trashMeasurement,
  restoreMeasurement,
  linkEvent,
  unlinkEvent,
  updatePlan,
  transitionPlan,
  trashPlan,
  restorePlan,
  unarchivePlan,
};
