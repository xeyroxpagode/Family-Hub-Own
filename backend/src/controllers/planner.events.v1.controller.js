'use strict';

const {
  getEventV1Context,
  getEventV1HouseholdMutationContext,
} = require('../services/planner.events.v1.context.service');
const eventsV1 = require('../services/planner.events.v1.service');
const {
  requireMutationId,
  parseRequiredExpectedVersion,
} = require('../lib/plannerMutationContracts');
const {
  requireIdempotencyKey,
  hashIdempotencyRequestV2,
  invokeAtomicPlannerMutationV2,
} = require('../lib/plannerIdempotencyAdapter');
const { createHttpError, sendApiError } = require('../lib/httpErrors');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(value, field = 'id') {
  if (!UUID_PATTERN.test(String(value ?? ''))) {
    throw createHttpError(400, `${field} no es un UUID válido.`, 'validation_error');
  }
  return value;
}

function canonicalMutationBody(result) {
  return result.replay && result.body && typeof result.body === 'object'
    ? { ...result.body, outcome: 'replay' }
    : result.body;
}

function mutationContractV2(req, operation) {
  const mutationId = requireMutationId(req);
  const idempotencyKey = requireIdempotencyKey(req);
  return {
    mutationId,
    idempotencyKey,
    requestId: req.requestId ?? mutationId,
  };
}

async function listEventsV1(req, res) {
  try {
    const context = await getEventV1Context(req);
    return res.status(200).json(await eventsV1.listEventsV1(context, req.query));
  } catch (error) {
    return sendApiError(res, error, req);
  }
}

async function getEventV1(req, res) {
  try {
    const context = await getEventV1Context(req);
    return res.status(200).json(await eventsV1.getEventV1(context, requireUuid(req.params.id)));
  } catch (error) {
    return sendApiError(res, error, req);
  }
}

async function createEventV1(req, res) {
  try {
    const context = await getEventV1Context(req);
    const operation = 'planner.events.v1.create';
    const mutation = mutationContractV2(req, operation);
    const scopeType = req.body?.scope ?? 'household';
    const scopeId = scopeType === 'personal' ? context.personId : (req.body?.householdId ?? context.householdId);
    if (!scopeId) throw createHttpError(400, 'scopeId required', 'validation_error');

    const rpcAdapter = async (client) => {
      const { data, error } = await client.rpc('create_planner_event_v1', {
        p_payload: req.body ?? {},
        p_request_id: mutation.requestId,
        p_mutation_id: mutation.mutationId,
        p_idempotency_key: mutation.idempotencyKey,
        p_actor_account_id: context.accountId,
        p_actor_person_id: context.personId,
        p_scope_type: scopeType,
        p_scope_id: scopeId,
        p_payload_hash: null,
        p_operation: operation,
      });
      if (error) throw error;
      return data;
    };

    const result = await invokeAtomicPlannerMutationV2(context, {
      idempotencyKey: mutation.idempotencyKey,
      mutationId: mutation.mutationId,
      operation,
      operationClass: 'CREATE_IDEMPOTENT',
      scopeType,
      scopeId,
      rpcAdapter,
      payload: req.body ?? {},
      expectedVersion: null,
      targetId: null,
      requestId: mutation.requestId,
    });

    res.set('X-Mutation-Id', mutation.mutationId);
    return res.status(result.status).json(canonicalMutationBody(result));
  } catch (error) {
    return sendApiError(res, error, req);
  }
}

async function mutateEventV1(req, res) {
  try {
    const context = await getEventV1Context(req);
    const eventId = requireUuid(req.params.id);
    const identity = await eventsV1.getEventMutationIdentity(context, eventId);
    const operation = `planner.events.v1.${req.body?.action ?? 'unknown'}`;
    const mutation = mutationContractV2(req, operation);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const action = req.body?.action;
    const editScope = req.body?.edit_scope ?? 'this_occurrence';
    const patch = req.body?.patch ?? {};
    const expectedSeriesVersion = req.body?.expected_series_version ?? null;

    const scopeType = identity.scope;
    const scopeId = scopeType === 'personal' ? identity.owner_person_id : identity.household_id;

    const rpcAdapter = async (client) => {
      const { data, error } = await client.rpc('mutate_planner_event_v1', {
        p_event_id: eventId,
        p_action: action,
        p_edit_scope: editScope,
        p_patch: patch,
        p_expected_version: expectedVersion,
        p_expected_series_version: expectedSeriesVersion,
        p_request_id: mutation.requestId,
        p_mutation_id: mutation.mutationId,
        p_idempotency_key: mutation.idempotencyKey,
        p_actor_account_id: context.accountId,
        p_actor_person_id: context.personId,
        p_scope_type: scopeType,
        p_scope_id: scopeId,
        p_payload_hash: null,
        p_operation: operation,
      });
      if (error) throw error;
      return data;
    };

    const result = await invokeAtomicPlannerMutationV2(context, {
      idempotencyKey: mutation.idempotencyKey,
      mutationId: mutation.mutationId,
      operation,
      operationClass: 'UPDATE_IDEMPOTENT',
      scopeType,
      scopeId,
      rpcAdapter,
      payload: { action, editScope, patch, expectedVersion, expectedSeriesVersion },
      expectedVersion,
      targetId: eventId,
      requestId: mutation.requestId,
    });

    res.set('X-Mutation-Id', mutation.mutationId);
    return res.status(result.status).json(canonicalMutationBody(result));
  } catch (error) {
    return sendApiError(res, error, req);
  }
}

async function mutateParticipantV1(req, res) {
  try {
    const context = await getEventV1Context(req);
    const eventId = requireUuid(req.params.id);
    const identity = await eventsV1.getEventMutationIdentity(context, eventId);
    const operation = `planner.events.v1.participants.${req.body?.action ?? 'unknown'}`;
    const mutation = mutationContractV2(req, operation);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const action = req.body?.action;
    requireUuid(req.body?.personId, 'personId');
    if (req.body?.memberId != null) requireUuid(req.body.memberId, 'memberId');

    const scopeType = identity.scope;
    const scopeId = scopeType === 'personal' ? identity.owner_person_id : identity.household_id;

    const rpcAdapter = async (client) => {
      const { data, error } = await client.rpc('mutate_planner_event_participant_v1', {
        p_event_id: eventId,
        p_action: action,
        p_person_id: req.body?.personId,
        p_member_id: req.body?.memberId ?? null,
        p_value: req.body?.value ?? null,
        p_expected_event_version: expectedVersion,
        p_expected_participant_version: req.body?.expected_participant_version ?? null,
        p_request_id: mutation.requestId,
        p_mutation_id: mutation.mutationId,
        p_idempotency_key: mutation.idempotencyKey,
        p_actor_account_id: context.accountId,
        p_actor_person_id: context.personId,
        p_scope_type: scopeType,
        p_scope_id: scopeId,
        p_payload_hash: null,
        p_operation: operation,
      });
      if (error) throw error;
      return data;
    };

    const result = await invokeAtomicPlannerMutationV2(context, {
      idempotencyKey: mutation.idempotencyKey,
      mutationId: mutation.mutationId,
      operation,
      operationClass: 'UPDATE_IDEMPOTENT',
      scopeType,
      scopeId,
      rpcAdapter,
      payload: { action, personId: req.body?.personId, value: req.body?.value, expectedVersion },
      expectedVersion,
      targetId: eventId,
      requestId: mutation.requestId,
    });

    res.set('X-Mutation-Id', mutation.mutationId);
    return res.status(result.status).json(canonicalMutationBody(result));
  } catch (error) {
    return sendApiError(res, error, req);
  }
}

module.exports = {
  createEventV1,
  getEventV1,
  listEventsV1,
  mutateEventV1,
  mutateParticipantV1,
};