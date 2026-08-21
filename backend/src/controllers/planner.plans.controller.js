'use strict';

const { createSupabaseForToken } = require('../config/supabase');
const { getAuthenticatedPerson, requireActiveMembership } = require('../lib/householdMembers.service');
const { resolveCapabilities, assertCapability } = require('../lib/plannerCapabilities');
const { createHttpError, sendApiError } = require('../lib/httpErrors');
const { OPERATION_KINDS, requireMutationContract } = require('../lib/mutationContracts');
const { hashIdempotencyRequestV2 } = require('../lib/plannerIdempotencyAdapter');
const plansService = require('../services/planner.plans.service');

async function getPlanActorContext(req) {
  if (!req.user?.id || !req.accessToken) {
    throw createHttpError(401, 'No autenticado.', 'not_authenticated');
  }
  const client = createSupabaseForToken(req.accessToken);
  const person = await getAuthenticatedPerson(client, req.user.id);
  if (!person) throw createHttpError(403, 'No existe person para el usuario autenticado.', 'person_not_found');
  return { client, accountId: req.user.id, personId: person.id, person };
}

async function getHouseholdCapabilityContext(context, householdId) {
  const membership = await requireActiveMembership(context.client, context.personId, householdId);
  const { data: household, error } = await context.client
    .from('households').select('*').eq('id', householdId).maybeSingle();
  if (error || !household) throw createHttpError(403, 'No perteneces a este hogar.', 'wrong_household');
  const capabilities = resolveCapabilities({
    role: membership.role,
    membershipStatus: membership.status,
    household,
  });
  assertCapability(capabilities, 'planner.view');
  return { household, membership, capabilities };
}

function capabilityForWrite(authorization, entityType, action, payload) {
  if (authorization.scope === 'personal') return null;
  const own = authorization.created_by_member_id === authorization.actorMembershipId;
  if (entityType !== 'plan') {
    if (action === 'trash' || action === 'restore') return 'goal.restore';
    return own ? 'goal.edit_own' : 'goal.edit_any';
  }
  const transition = action === 'transition' ? payload?.transition : action;
  if (transition === 'archive' || transition === 'unarchive') return 'goal.archive';
  if (transition === 'trash' || transition === 'restore') return 'goal.restore';
  if (transition === 'complete') return own ? 'goal.complete_own' : 'goal.complete_any';
  if (transition === 'close' || transition === 'reopen') return own ? 'goal.close_own' : 'goal.close_any';
  return own ? 'goal.edit_own' : 'goal.edit_any';
}

async function assertBackendWriteAuthorization(context, input) {
  if (input.entityType === 'plan' && input.action === 'create') {
    if ((input.payload?.scope ?? 'personal') === 'personal') return { scope: 'personal' };
    const householdId = input.payload?.household_id;
    if (!householdId) throw createHttpError(422, 'household_id es obligatorio.', 'validation_error');
    const householdContext = await getHouseholdCapabilityContext(context, householdId);
    assertCapability(householdContext.capabilities, 'goal.create_household');
    return {
      scope: 'household',
      householdId,
      membershipId: householdContext.membership.id,
    };
  }

  const authorization = await plansService.getPlanAuthorizationContext(context, input.planId);
  if (authorization.scope === 'personal') {
    if (authorization.owner_person_id !== context.personId) {
      throw createHttpError(403, 'No tenes permiso para modificar este Plan.', 'forbidden');
    }
    return { scope: 'personal' };
  }
  const householdContext = await getHouseholdCapabilityContext(context, authorization.household_id);
  authorization.actorMembershipId = householdContext.membership.id;
  assertCapability(householdContext.capabilities, capabilityForWrite(
    authorization, input.entityType, input.action, input.payload,
  ));
  return {
    scope: 'household',
    householdId: authorization.household_id,
    membershipId: householdContext.membership.id,
  };
}

async function listPlans(req, res) {
  try {
    const context = await getPlanActorContext(req);
    const result = await plansService.listPlans(context, req.query ?? {});
    return res.status(200).json(result);
  } catch (error) {
    return sendApiError(res, error, req);
  }
}

async function getPlanGraph(req, res) {
  try {
    const context = await getPlanActorContext(req);
    const result = await plansService.getPlanGraph(context, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return sendApiError(res, error, req);
  }
}

async function writePlanGraph(req, res) {
  try {
    const context = await getPlanActorContext(req);
    const entityType = req.body?.entityType;
    const action = req.body?.action;
    const isCreate = action === 'create';
    const contract = requireMutationContract(
      req,
      isCreate ? OPERATION_KINDS.CREATE_IDEMPOTENT : OPERATION_KINDS.VERSIONED_MUTATION,
    );
    const payload = req.body?.payload ?? {};
    const expectedPlanVersion = req.body?.expectedPlanVersion;
    const input = {
      entityType,
      action,
      planId: req.params.id ?? req.body?.planId ?? null,
      entityId: req.body?.entityId ?? null,
      expectedVersion: contract.expectedVersion,
      expectedPlanVersion,
      operationId: contract.mutationId,
      idempotencyKey: contract.idempotencyKey,
      payload,
      requestId: req.requestId ?? null,
    };
    plansService.assertGraphWriteInput(input);
    const authorization = await assertBackendWriteAuthorization(context, input);
    const operation = `planner.plans.${entityType}.${action}`;
    const scopeId = authorization.scope === 'household'
      ? authorization.householdId
      : context.personId;
    input.payloadHash = hashIdempotencyRequestV2({
      operation,
      scopeType: authorization.scope,
      scopeId,
      targetId: input.entityId ?? input.planId,
      payload: input.payload,
      expectedVersion: input.expectedVersion,
      mutationId: contract.mutationId,
    });
    input.canonicalReserved = false;
    input.canonicalOperation = operation;
    const result = await plansService.writePlanGraph(context, input);
    res.set('X-Mutation-Id', contract.mutationId);
    return res.status(isCreate ? 201 : 200).json(result);
  } catch (error) {
    if (error?.storedEnvelope && error?.statusCode) {
      return res
        .set('X-Request-Id', req.requestId ?? '')
        .status(error.statusCode)
        .json(error.storedEnvelope);
    }
    return sendApiError(res, error, req);
  }
}

async function applyPlanStructureChangeset(req, res) {
  try {
    const context = await getPlanActorContext(req);
    const contract = requireMutationContract(req, OPERATION_KINDS.VERSIONED_MUTATION);
    const planId = req.params.id;
    const operations = req.body?.operations ?? [];
    const input = {
      planId,
      expectedPlanVersion: contract.expectedVersion,
      operations,
      operationId: contract.mutationId,
      idempotencyKey: contract.idempotencyKey,
      requestId: req.requestId ?? null,
    };
    plansService.assertStructureChangesetInput(input);
    const authorization = await assertBackendWriteAuthorization(context, {
      entityType: 'plan',
      action: 'update',
      planId,
      payload: {},
    });
    const operation = 'planner.plans.structure.apply';
    const scopeId = authorization.scope === 'household'
      ? authorization.householdId
      : context.personId;
    input.payloadHash = hashIdempotencyRequestV2({
      operation,
      scopeType: authorization.scope,
      scopeId,
      targetId: planId,
      payload: {
        planId,
        expectedPlanVersion: contract.expectedVersion,
        operations,
      },
      expectedVersion: contract.expectedVersion,
      mutationId: contract.mutationId,
    });
    const result = await plansService.applyPlanStructureChangeset(context, input);
    res.set('X-Mutation-Id', contract.mutationId);
    return res.status(200).json(result);
  } catch (error) {
    if (error?.storedEnvelope && error?.statusCode) {
      return res
        .set('X-Request-Id', req.requestId ?? '')
        .status(error.statusCode)
        .json(error.storedEnvelope);
    }
    return sendApiError(res, error, req);
  }
}

async function getLegacyCompatibilityReport(req, res) {
  try {
    const context = await getPlanActorContext(req);
    const result = await plansService.getLegacyCompatibilityReport(context);
    return res.status(200).json(result);
  } catch (error) {
    return sendApiError(res, error, req);
  }
}

module.exports = {
  assertBackendWriteAuthorization,
  capabilityForWrite,
  getLegacyCompatibilityReport,
  getPlanActorContext,
  getPlanGraph,
  listPlans,
  applyPlanStructureChangeset,
  writePlanGraph,
};
