'use strict';

const { getPlannerContext } = require('../services/planner.context.service');
const presetsService = require('../services/planner.presets.service');
const { requireIdempotencyKey } = require('../lib/plannerIdempotencyAdapter');
const {
  requireMutationId,
  parseRequiredExpectedVersion,
} = require('../lib/plannerMutationContracts');
const { resolveCapabilities, assertCapability } = require('../lib/plannerCapabilities');
const { sendApiError } = require('../lib/httpErrors');

function buildCapabilities(context) {
  return resolveCapabilities({
    role: context.membership?.role,
    membershipStatus: context.membership?.status,
    household: context.household,
  });
}

function requireMutationTransport(req, res, expectedVersion = false) {
  const mutationId = requireMutationId(req);
  const idempotencyKey = requireIdempotencyKey(req);
  res.set('X-Mutation-Id', mutationId);
  return {
    idempotencyKey,
    mutationId,
    expectedVersion: expectedVersion ? parseRequiredExpectedVersion(req) : null,
  };
}

function sendMutation(res, result, operationId) {
  const status = result.response_status ?? (result.outcome === 'created' ? 201 : 200);
  return res.status(status).json({
    data: result.preset ?? result.revision ?? result.data ?? {},
    outcome: result.outcome ?? 'updated',
    version: result.preset?.version ?? result.revision?.version ?? result.version ?? null,
    operationId,
  });
}

const listPresets = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.templates.use');
    const payload = await presetsService.listPresets(context, req.query ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const getPreset = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.templates.use');
    const payload = await presetsService.getPreset(context, req.params.id);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const createPreset = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.templates.manage');
    const operationId = requireMutationId(req);
    const idempotencyKey = requireIdempotencyKey(req);
    res.set('X-Mutation-Id', operationId);
    const result = await presetsService.createPreset(context, req.body ?? {}, {
      idempotencyKey,
      requestId: req.requestId,
      mutationId: operationId,
    });
    return sendMutation(res, result, operationId);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const updatePresetMetadata = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.templates.manage');
    const mutation = requireMutationTransport(req, res, true);
    const result = await presetsService.updatePresetMetadata(context, req.params.id, req.body ?? {}, mutation.expectedVersion, {
      idempotencyKey: mutation.idempotencyKey,
      requestId: req.requestId,
      mutationId: mutation.mutationId,
    });
    return sendMutation(res, result, mutation.mutationId);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const startRevision = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.templates.manage');
    const mutation = requireMutationTransport(req, res, false);
    const result = await presetsService.startRevision(context, req.params.id);
    return sendMutation(res, result, mutation.mutationId);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const getRevision = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.templates.use');
    const payload = await presetsService.getRevision(context, req.params.revisionId);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const updateRevisionDraft = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.templates.manage');
    const mutation = requireMutationTransport(req, res, true);
    const result = await presetsService.updateRevisionDraft(context, req.params.revisionId, req.body ?? {}, mutation.expectedVersion);
    return sendMutation(res, result, mutation.mutationId);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const publishRevision = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.templates.manage');
    const mutation = requireMutationTransport(req, res, true);
    const result = await presetsService.publishRevision(context, req.params.revisionId, mutation.expectedVersion, {
      requestId: req.requestId,
      mutationId: mutation.mutationId,
    });
    return sendMutation(res, result, mutation.mutationId);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const listRevisionHistory = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.templates.use');
    const payload = await presetsService.listRevisionHistory(context, req.params.id);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const trashPreset = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.templates.manage');
    const mutation = requireMutationTransport(req, res, true);
    const result = await presetsService.trashPreset(context, req.params.id, mutation.expectedVersion, {
      requestId: req.requestId,
      mutationId: mutation.mutationId,
    });
    return sendMutation(res, result, mutation.mutationId);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const restorePreset = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.templates.manage');
    const mutation = requireMutationTransport(req, res, true);
    const result = await presetsService.restorePreset(context, req.params.id, mutation.expectedVersion, {
      requestId: req.requestId,
      mutationId: mutation.mutationId,
    });
    return sendMutation(res, result, mutation.mutationId);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const prepareApplicationPayload = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.templates.use');
    const result = await presetsService.prepareApplicationPayload(context, req.params.id, req.query?.revision_id ?? null);
    return res.status(200).json(result);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  createPreset,
  getPreset,
  getRevision,
  listPresets,
  listRevisionHistory,
  prepareApplicationPayload,
  publishRevision,
  restorePreset,
  startRevision,
  trashPreset,
  updatePresetMetadata,
  updateRevisionDraft,
};
