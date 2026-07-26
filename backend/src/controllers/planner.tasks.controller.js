'use strict';

const { getPlannerContext } = require('../services/planner.context.service');
const tasksService = require('../services/planner.tasks.service');
const {
  requireMutationId,
  parseRequiredExpectedVersion,
} = require('../lib/plannerMutationContracts');
const {
  requireIdempotencyKey,
  hashIdempotencyRequest,
  withIdempotency,
} = require('../lib/plannerIdempotencyAdapter');
const { resolveCapabilities, assertCapability, hasCapability } = require('../lib/plannerCapabilities');
const { createHttpError, sendApiError } = require('../lib/httpErrors');
const { telemetry } = require('../config/telemetry');

/**
 * Build the capability projection for the current request context.
 * Used for enforcement before mutations.
 */
function buildCapabilities(context) {
  return resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
}

const listTasks = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');
    const payload = await tasksService.listTasks(context, req.query ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const getTaskById = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');
    const payload = await tasksService.getTaskById(context, req.params.id);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const createTask = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    tasksService.assertTaskCreateBody(req.body ?? {});

    if (req.body?.visibility === 'personal') {
      throw createHttpError(
        400,
        'Las tareas personales todavía no están disponibles.',
        'personal_tasks_not_supported',
      );
    }
    assertCapability(capabilities, 'task.create_household');

    const operation = 'planner.tasks.create';
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
      () => tasksService.createTask(context, req.body ?? {}),
    );

    // Echo mutation ID on success for correlation
    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const updateTask = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    const task = await tasksService.getTaskOrThrow(context.client, context.householdId, req.params.id);
    assertCapability(
      capabilities,
      task.created_by_member_id === context.membershipId ? 'task.edit_own' : 'task.edit_any',
    );

    const operation = 'planner.tasks.update';
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
      () => tasksService.updateTask(context, req.params.id, req.body ?? {}, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const cancelTask = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    const task = await tasksService.getTaskOrThrow(context.client, context.householdId, req.params.id);
    assertCapability(
      capabilities,
      task.created_by_member_id === context.membershipId ? 'task.cancel_own' : 'task.cancel_any',
    );

    const operation = 'planner.tasks.cancel';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const body = req.body ?? {};
    const requestHash = hashIdempotencyRequest({
      method: 'DELETE',
      operation,
      params: { id: req.params.id },
      body,
      expectedVersion,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => tasksService.cancelTask(context, req.params.id, expectedVersion, body),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const completeTask = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');
    const completionAuth = await tasksService.getTaskCompletionAuthorization(context, req.params.id);
    let completionAllowed = false;
    if (completionAuth.assignmentKind === 'legacy_unassigned') {
      completionAllowed = hasCapability(capabilities, 'task.complete_unassigned')
        || hasCapability(capabilities, 'task.complete_any');
    } else if (completionAuth.assignmentKind === 'anyone' || completionAuth.isAssignee) {
      completionAllowed = hasCapability(capabilities, 'task.complete_assigned');
    } else {
      completionAllowed = hasCapability(capabilities, 'task.complete_any');
    }
    if (!completionAllowed) {
      assertCapability(capabilities, 'task.complete_any');
    }

    const operation = 'planner.tasks.complete';
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
      () => tasksService.completeTask(context, req.params.id, expectedVersion, {
        requestId: req.requestId,
        mutationId,
      }),
    );

    await telemetry.track('planner_mutation_succeeded', {
      action: 'task.complete',
      entity_kind: 'task',
      audited: Boolean(result.body?.correlation?.audit_event_id),
    }, { requestId: req.requestId, mutationId }).catch(() => {});
    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    await telemetry.track('planner_mutation_failed', {
      action: 'task.complete',
      entity_kind: 'task',
      error_code: error?.code ?? 'unknown_error',
    }, { requestId: req.requestId, mutationId: req.mutationId }).catch(() => {});
    return sendApiError(res, error, req);
  }
};

const getTaskFulfillmentV1 = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');
    const payload = await tasksService.getTaskFulfillmentV1(context, req.params.taskId);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const runTaskV1Mutation = async (req, res, options) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');

    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const body = req.body ?? {};
    const requestHash = hashIdempotencyRequest({
      method: req.method,
      operation: options.operation,
      params: {
        taskId: req.params.taskId,
        ...(req.params.fulfillmentId ? { fulfillmentId: req.params.fulfillmentId } : {}),
      },
      body,
      expectedVersion,
    });

    const result = await withIdempotency(
      context,
      {
        req,
        operation: options.operation,
        idempotencyKey,
        requestHash,
        successStatus: 200,
        recoverInFlight: true,
      },
      () => options.execute(context, body, expectedVersion, {
        requestId: req.requestId,
        mutationId,
        idempotencyKey,
        idempotencyOperation: options.operation,
        requestHash,
      }),
    );
    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const updateTaskAssignmentV1 = (req, res) => runTaskV1Mutation(req, res, {
  operation: 'planner.v1.tasks.assignment.update',
  execute: (context, body, expectedVersion, correlation) => tasksService.updateTaskAssignmentV1(
    context,
    req.params.taskId,
    body,
    expectedVersion,
    correlation,
  ),
});

const claimTaskV1 = (req, res) => runTaskV1Mutation(req, res, {
  operation: 'planner.v1.tasks.claim',
  execute: (context, _body, expectedVersion, correlation) => tasksService.claimTaskV1(
    context,
    req.params.taskId,
    expectedVersion,
    correlation,
  ),
});

const taskFulfillmentActionV1 = (action, operation) => (req, res) => runTaskV1Mutation(req, res, {
  operation,
  execute: (context, body, expectedVersion, correlation) => tasksService.mutateTaskFulfillmentV1(
    context,
    req.params.taskId,
    req.params.fulfillmentId,
    action,
    body,
    expectedVersion,
    correlation,
  ),
});

const completeTaskFulfillmentV1 = taskFulfillmentActionV1('complete', 'planner.v1.tasks.fulfillments.complete');
const verifyTaskFulfillmentV1 = taskFulfillmentActionV1('verify', 'planner.v1.tasks.fulfillments.verify');
const requestTaskCorrectionV1 = taskFulfillmentActionV1('request_correction', 'planner.v1.tasks.fulfillments.request_correction');
const resubmitTaskFulfillmentV1 = taskFulfillmentActionV1('resubmit', 'planner.v1.tasks.fulfillments.resubmit');
const revertTaskFulfillmentV1 = taskFulfillmentActionV1('revert', 'planner.v1.tasks.fulfillments.revert');
const reopenTaskFulfillmentV1 = taskFulfillmentActionV1('reopen', 'planner.v1.tasks.fulfillments.reopen');

const verifyTask = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');
    assertCapability(capabilities, 'task.verify');

    const operation = 'planner.tasks.verify';
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
      () => tasksService.verifyTask(context, req.params.id, expectedVersion, {
        requestId: req.requestId,
        mutationId,
      }),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const trashTask = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'task.restore'); // trash uses restore capability

    const operation = 'planner.tasks.trash';
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
      () => tasksService.trashTask(context, req.params.id, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const restoreTask = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'task.restore');

    const operation = 'planner.tasks.restore';
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
      () => tasksService.restoreTask(context, req.params.id, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const reactivateTask = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    const task = await tasksService.getTaskOrThrow(context.client, context.householdId, req.params.id);
    assertCapability(
      capabilities,
      task.created_by_member_id === context.membershipId ? 'task.cancel_own' : 'task.cancel_any',
    );

    const operation = 'planner.tasks.reactivate';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const body = req.body ?? {};
    const requestHash = hashIdempotencyRequest({
      method: 'POST',
      operation,
      params: { id: req.params.id },
      body,
      expectedVersion,
    });

    const result = await withIdempotency(
      context,
      { req, operation, idempotencyKey, requestHash, successStatus: 200 },
      () => tasksService.reactivateTask(context, req.params.id, expectedVersion),
    );

    res.set('X-Mutation-Id', mutationId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  cancelTask,
  completeTask,
  createTask,
  getTaskById,
  listTasks,
  reactivateTask,
  restoreTask,
  trashTask,
  updateTask,
  verifyTask,
  claimTaskV1,
  completeTaskFulfillmentV1,
  getTaskFulfillmentV1,
  reopenTaskFulfillmentV1,
  requestTaskCorrectionV1,
  resubmitTaskFulfillmentV1,
  revertTaskFulfillmentV1,
  updateTaskAssignmentV1,
  verifyTaskFulfillmentV1,
};
