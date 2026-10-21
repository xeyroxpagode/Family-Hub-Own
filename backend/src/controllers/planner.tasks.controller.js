'use strict';

const { getPlannerContext } = require('../services/planner.context.service');
const tasksService = require('../services/planner.tasks.service');
const evidenceService = require('../services/planner.task-evidence.service');
const {
  requireMutationId,
  parseRequiredExpectedVersion,
} = require('../lib/plannerMutationContracts');
const {
  requireIdempotencyKey,
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

// S7-01: origin_* lo emite el SERVIDOR. La via HTTP publica de Planner
// rechaza el intento de inyectarlo.
const PROTECTED_ORIGIN_FIELDS = Object.freeze([
  'origin_module',
  'origin_entity_type',
  'origin_entity_id',
  'origin_reason',
]);

function assertNoOriginInjection(body) {
  const field = PROTECTED_ORIGIN_FIELDS.find((key) =>
    Object.prototype.hasOwnProperty.call(body ?? {}, key),
  );
  if (field) {
    throw createHttpError(
      400,
      'La referencia de origen la define el servidor y no se puede enviar.',
      'protected_task_origin_field',
      { field },
    );
  }
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
    assertNoOriginInjection(req.body);

    const operation = 'planner.tasks.create';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const payload = await tasksService.createTask(context, req.body ?? {}, {
      requestId: req.requestId,
      mutationId,
      idempotencyKey,
      operation,
    });

    // Echo mutation ID on success for correlation
    res.set('X-Mutation-Id', mutationId);
    return res.status(201).json(payload);
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
    const payload = await tasksService.updateTask(context, req.params.id, req.body ?? {}, expectedVersion, {
      requestId: req.requestId,
      mutationId,
      idempotencyKey,
      operation,
    });

    res.set('X-Mutation-Id', mutationId);
    return res.status(200).json(payload);
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
    const payload = await tasksService.cancelTask(context, req.params.id, expectedVersion, body, {
      requestId: req.requestId,
      mutationId,
      idempotencyKey,
      operation,
    });

    res.set('X-Mutation-Id', mutationId);
    return res.status(200).json(payload);
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
    const payload = await tasksService.completeTask(context, req.params.id, expectedVersion, {
      requestId: req.requestId,
      mutationId,
      idempotencyKey,
      operation,
    });
    await telemetry.track('planner_mutation_succeeded', {
      action: 'task.complete',
      entity_kind: 'task',
      audited: Boolean(payload?.correlation?.audit_event_id),
    }, { requestId: req.requestId, mutationId }).catch(() => {});
    res.set('X-Mutation-Id', mutationId);
    return res.status(200).json(payload);
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

    const payload = await options.execute(
      context,
      body,
      expectedVersion,
      {
        idempotencyKey,
        mutationId,
        operation: options.operation,
        requestId: req.requestId,
      },
    );
    res.set('X-Mutation-Id', mutationId);
    return res.status(200).json(payload);
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

const releaseTaskV1 = (req, res) => runTaskV1Mutation(req, res, {
  operation: 'planner.v1.tasks.release',
  execute: (context, _body, expectedVersion, correlation) => tasksService.releaseTaskV1(
    context,
    req.params.taskId,
    expectedVersion,
    correlation,
  ),
});

const archiveTaskV1 = (req, res) => runTaskV1Mutation(req, res, {
  operation: 'planner.v1.tasks.archive',
  execute: (context, _body, expectedVersion, correlation) => tasksService.archiveTaskV1(
    context,
    req.params.taskId,
    expectedVersion,
    correlation,
  ),
});

const unarchiveTaskV1 = (req, res) => runTaskV1Mutation(req, res, {
  operation: 'planner.v1.tasks.unarchive',
  execute: (context, _body, expectedVersion, correlation) => tasksService.unarchiveTaskV1(
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
    const payload = await tasksService.verifyTask(context, req.params.id, expectedVersion, {
      requestId: req.requestId,
      mutationId,
      idempotencyKey,
      operation,
    });
    res.set('X-Mutation-Id', mutationId);
    return res.status(200).json(payload);
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
    const payload = await tasksService.trashTask(context, req.params.id, expectedVersion, {
      requestId: req.requestId,
      mutationId,
      idempotencyKey,
      operation,
    });

    res.set('X-Mutation-Id', mutationId);
    return res.status(200).json(payload);
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
    const payload = await tasksService.restoreTask(context, req.params.id, expectedVersion, {
      requestId: req.requestId,
      mutationId,
      idempotencyKey,
      operation,
    });

    res.set('X-Mutation-Id', mutationId);
    return res.status(200).json(payload);
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
    const payload = await tasksService.reactivateTask(context, req.params.id, expectedVersion, {
      requestId: req.requestId,
      mutationId,
      idempotencyKey,
      operation,
    });

    res.set('X-Mutation-Id', mutationId);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const submitTaskEvidence = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');

    const operation = 'planner.tasks.evidence.submit';
    const mutationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const payload = await tasksService.submitTaskEvidence(context, req.params.id, req.params.fulfillmentId, req.body ?? {}, {
      requestId: req.requestId,
      mutationId,
      idempotencyKey,
      operation,
    });

    res.set('X-Mutation-Id', mutationId);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const getTaskEvidenceHistory = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');

    const payload = await tasksService.getTaskEvidenceHistory(context, req.params.id);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const registerTaskEvidenceArtifact = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const payload = await evidenceService.registerArtifact(context, req.params.id, req.body ?? {});
    return res.status(201).json({ artifact: payload });
  } catch (error) { return sendApiError(res, error, req); }
};

const authorizeTaskEvidenceArtifact = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const payload = await evidenceService.authorizeArtifactUpload(context, req.params.id, req.params.artifactId);
    return res.status(200).json(payload);
  } catch (error) { return sendApiError(res, error, req); }
};

const confirmTaskEvidenceArtifact = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const payload = await evidenceService.confirmArtifact(context, req.params.id, req.params.artifactId);
    return res.status(200).json({ artifact: payload });
  } catch (error) { return sendApiError(res, error, req); }
};

const cancelTaskEvidenceArtifact = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const payload = await evidenceService.cancelArtifact(context, req.params.id, req.params.artifactId);
    return res.status(200).json({ artifact: payload });
  } catch (error) { return sendApiError(res, error, req); }
};

const submitTaskEvidenceV2 = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const idempotencyKey = requireIdempotencyKey(req);
    const payload = await evidenceService.submitEvidence(context, req.params.id, req.params.fulfillmentId, req.body ?? {}, idempotencyKey);
    return res.status(200).json(payload);
  } catch (error) { return sendApiError(res, error, req); }
};

const reviewTaskEvidenceV2 = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const payload = await evidenceService.reviewEvidence(context, req.params.id, req.params.fulfillmentId, req.params.submissionId, req.body ?? {});
    return res.status(200).json(payload);
  } catch (error) { return sendApiError(res, error, req); }
};

const getTaskEvidenceHistoryV2 = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    return res.status(200).json(await evidenceService.history(context, req.params.id));
  } catch (error) { return sendApiError(res, error, req); }
};

const getTaskEvidenceMediaAccess = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    return res.status(200).json(await evidenceService.signedMediaAccess(context, req.params.id, req.params.artifactId));
  } catch (error) { return sendApiError(res, error, req); }
};

const getTaskAuditHistory = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    const capabilities = buildCapabilities(context);
    assertCapability(capabilities, 'planner.view');

    const payload = await tasksService.getTaskAuditHistory(context, req.params.id);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  cancelTask,
  completeTask,
  createTask,
  getTaskById,
  getTaskEvidenceHistory,
  getTaskEvidenceHistoryV2,
  getTaskEvidenceMediaAccess,
  getTaskAuditHistory,
  listTasks,
  reactivateTask,
  restoreTask,
  submitTaskEvidence,
  submitTaskEvidenceV2,
  registerTaskEvidenceArtifact,
  authorizeTaskEvidenceArtifact,
  cancelTaskEvidenceArtifact,
  confirmTaskEvidenceArtifact,
  reviewTaskEvidenceV2,
  trashTask,
  updateTask,
  verifyTask,
  claimTaskV1,
  releaseTaskV1,
  archiveTaskV1,
  unarchiveTaskV1,
  completeTaskFulfillmentV1,
  getTaskFulfillmentV1,
  reopenTaskFulfillmentV1,
  requestTaskCorrectionV1,
  resubmitTaskFulfillmentV1,
  revertTaskFulfillmentV1,
  updateTaskAssignmentV1,
  verifyTaskFulfillmentV1,
};
