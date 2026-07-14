'use strict';

const { getPlannerContext } = require('../services/planner.context.service');
const goalsService = require('../services/planner.goals.service');
const {
  requireMutationId,
  parseRequiredExpectedVersion,
} = require('../lib/plannerMutationContracts');
const {
  requireIdempotencyKey,
  hashIdempotencyRequest,
  withIdempotency,
} = require('../lib/idempotencyHelpers');
const { resolveCapabilities, assertCapability } = require('../lib/plannerCapabilities');
const { sendApiError } = require('../lib/httpErrors');

function buildCapabilities(context) {
  return resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
}

const listGoals = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');
    const payload = await goalsService.listGoals(context, req.query ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const getGoalById = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');
    const payload = await goalsService.getGoalById(context, req.params.id);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const createGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);

    const isPersonal = req.body?.visibility === 'personal';
    const requiredCap = isPersonal ? 'goal.create_personal' : 'goal.create_household';
    assertCapability(capabilities, requiredCap);

    const operation = 'planner.goals.create';
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
      () => goalsService.createGoal(context, req.body ?? {}),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const updateGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.edit_own');

    const operation = 'planner.goals.update';
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
      () => goalsService.updateGoal(context, req.params.id, req.body ?? {}, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const deleteGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.restore'); // delete = trash

    const operation = 'planner.goals.trash';
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
      () => goalsService.trashGoal(context, req.params.id, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const restoreGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.restore');

    const operation = 'planner.goals.restore';
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
      () => goalsService.restoreGoal(context, req.params.id, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const completeGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.complete_own');

    const operation = 'planner.goals.complete';
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
      () => goalsService.completeGoal(context, req.params.id, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const closeGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.close_own');

    const operation = 'planner.goals.close';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const closedReason = req.body?.closed_reason ?? null;
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { id: req.params.id },
      body: { closed_reason: closedReason },
      expectedVersion,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => goalsService.closeGoal(context, req.params.id, expectedVersion, closedReason),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const failGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.close_own');

    const operation = 'planner.goals.fail';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const closedReason = req.body?.closed_reason ?? req.body?.reason ?? null;
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { id: req.params.id },
      body: { closed_reason: closedReason },
      expectedVersion,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => goalsService.failGoal(context, req.params.id, expectedVersion, closedReason),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const reopenGoal = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.close_own'); // reopen uses close capability

    const operation = 'planner.goals.reopen';
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
      () => goalsService.reopenGoal(context, req.params.id, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const listMilestones = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');
    const payload = await goalsService.listMilestones(context, req.params.goalId);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const createMilestone = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.edit_own'); // milestones under goal use goal edit

    const operation = 'planner.goals.milestones.create';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { goalId: req.params.goalId },
      body: req.body ?? {},
      expectedVersion: null,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 201 },
      () => goalsService.createMilestone(context, req.params.goalId, req.body ?? {}),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const updateMilestone = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.edit_own');

    const operation = 'planner.goals.milestones.update';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const requestHash = hashIdempotencyRequest({
      method: 'PATCH',
      operation,
      params: { goalId: req.params.goalId, milestoneId: req.params.milestoneId },
      body: req.body ?? {},
      expectedVersion,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => goalsService.updateMilestone(context, req.params.goalId, req.params.milestoneId, req.body ?? {}, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const deleteMilestone = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.restore'); // delete = trash

    const operation = 'planner.goals.milestones.trash';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { goalId: req.params.goalId, milestoneId: req.params.milestoneId },
      body: {},
      expectedVersion,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => goalsService.deleteMilestone(context, req.params.goalId, req.params.milestoneId, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const trashMilestone = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.restore');

    const operation = 'planner.goals.milestones.trash';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { goalId: req.params.goalId, milestoneId: req.params.milestoneId },
      body: {},
      expectedVersion,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => goalsService.trashMilestone(context, req.params.goalId, req.params.milestoneId, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const restoreMilestone = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'goal.restore');

    const operation = 'planner.goals.milestones.restore';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { goalId: req.params.goalId, milestoneId: req.params.milestoneId },
      body: {},
      expectedVersion,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => goalsService.restoreMilestone(context, req.params.goalId, req.params.milestoneId, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  closeGoal,
  completeGoal,
  createGoal,
  createMilestone,
  deleteGoal,
  deleteMilestone,
  failGoal,
  getGoalById,
  listGoals,
  listMilestones,
  reopenGoal,
  restoreGoal,
  restoreMilestone,
  trashGoal: deleteGoal,
  trashMilestone,
  updateGoal,
  updateMilestone,
};