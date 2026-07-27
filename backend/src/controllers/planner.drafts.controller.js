'use strict';

const { getPlannerContext } = require('../services/planner.context.service');
const draftsService = require('../services/planner.drafts.service');
const { requireIdempotencyKey } = require('../lib/plannerIdempotencyAdapter');
const {
  requireMutationId,
  parseExpectedVersion,
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

function requireMutationTransport(req, res, versionRequired = false) {
  const mutationId = requireMutationId(req);
  requireIdempotencyKey(req);
  res.set('X-Mutation-Id', mutationId);
  return {
    mutationId,
    expectedVersion: versionRequired ? parseRequiredExpectedVersion(req) : parseExpectedVersion(req),
  };
}

function sendMutation(res, result, operationId) {
  return res.status(result.outcome === 'created' ? 201 : 200).json({
    data: result.draft ?? result.data ?? {},
    outcome: result.outcome ?? 'updated',
    version: result.draft?.version ?? result.version ?? null,
    operationId,
  });
}

const listDrafts = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.view');
    const payload = await draftsService.listDrafts(context, req.query ?? {});
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const getDraft = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.view');
    const payload = await draftsService.getDraft(context, req.params.id);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const recoverDraft = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.view');
    const payload = await draftsService.recoverDraft(context, req.query.client_draft_key, req.query.entity_type);
    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const autosaveDraft = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.view');
    const mutation = requireMutationTransport(req, res, false);
    const result = await draftsService.autosaveDraft(context, req.body ?? {}, mutation.expectedVersion);
    return sendMutation(res, result, mutation.mutationId);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const trashDraft = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.view');
    const mutation = requireMutationTransport(req, res, true);
    const result = await draftsService.trashDraft(context, req.params.id, mutation.expectedVersion, {
      requestId: req.requestId,
      mutationId: mutation.mutationId,
    });
    return sendMutation(res, result, mutation.mutationId);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const restoreDraft = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.view');
    const mutation = requireMutationTransport(req, res, true);
    const result = await draftsService.restoreDraft(context, req.params.id, mutation.expectedVersion, {
      requestId: req.requestId,
      mutationId: mutation.mutationId,
    });
    return sendMutation(res, result, mutation.mutationId);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const prepareActivationPayload = async (req, res) => {
  try {
    const context = await getPlannerContext(req);
    assertCapability(buildCapabilities(context), 'planner.view');
    const result = await draftsService.prepareActivationPayload(context, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  autosaveDraft,
  getDraft,
  listDrafts,
  prepareActivationPayload,
  recoverDraft,
  restoreDraft,
  trashDraft,
};
