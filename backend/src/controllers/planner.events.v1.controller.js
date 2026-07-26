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
  hashIdempotencyRequest,
  withIdempotency,
} = require('../lib/plannerIdempotencyAdapter');
const { createHttpError, sendApiError } = require('../lib/httpErrors');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(value, field = 'id') {
  if (!UUID_PATTERN.test(String(value ?? ''))) {
    throw createHttpError(400, `${field} no es un UUID válido.`, 'validation_error');
  }
  return value;
}

function rejectPersonalCanonicalIdempotencyGap() {
  throw createHttpError(
    503,
    'Las mutaciones de eventos personales están temporalmente no disponibles.',
    'personal_idempotency_contract_unavailable',
  );
}

function canonicalMutationBody(result) {
  return result.replay && result.body && typeof result.body === 'object'
    ? { ...result.body, outcome: 'replay' }
    : result.body;
}

function mutationContract(req, operation, expectedVersion = null) {
  const mutationId = requireMutationId(req);
  const idempotencyKey = requireIdempotencyKey(req);
  return {
    mutationId,
    idempotencyKey,
    requestId: req.requestId ?? mutationId,
    requestHash: hashIdempotencyRequest({
      method: req.method,
      operation,
      params: req.params ?? {},
      body: req.body ?? {},
      expectedVersion,
    }),
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
    const mutation = mutationContract(req, operation);
    if (req.body?.scope === 'personal') rejectPersonalCanonicalIdempotencyGap();
    const householdContext = await getEventV1HouseholdMutationContext(
      context,
      req.body?.householdId ?? context.householdId,
    );
    const result = await withIdempotency(
      householdContext,
      {
        req,
        operation,
        idempotencyKey: mutation.idempotencyKey,
        requestHash: mutation.requestHash,
        successStatus: 201,
      },
      () => eventsV1.createEventV1(householdContext, req.body ?? {}, mutation),
    );
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
    if (identity.scope === 'personal') rejectPersonalCanonicalIdempotencyGap();
    const householdContext = await getEventV1HouseholdMutationContext(context, identity.household_id);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const action = req.body?.action;
    const operation = `planner.events.v1.${action ?? 'unknown'}`;
    const mutation = mutationContract(req, operation, expectedVersion);
    const result = await withIdempotency(
      householdContext,
      {
        req,
        operation,
        idempotencyKey: mutation.idempotencyKey,
        requestHash: mutation.requestHash,
        successStatus: 200,
      },
      () => eventsV1.mutateEventV1(
        householdContext,
        eventId,
        action,
        req.body?.edit_scope ?? 'this_occurrence',
        req.body?.patch ?? {},
        expectedVersion,
        req.body?.expected_series_version ?? null,
        mutation,
      ),
    );
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
    if (identity.scope === 'personal') rejectPersonalCanonicalIdempotencyGap();
    const householdContext = await getEventV1HouseholdMutationContext(context, identity.household_id);
    const expectedVersion = parseRequiredExpectedVersion(req);
    const operation = `planner.events.v1.participants.${req.body?.action ?? 'unknown'}`;
    const mutation = mutationContract(req, operation, expectedVersion);
    requireUuid(req.body?.personId, 'personId');
    if (req.body?.memberId != null) requireUuid(req.body.memberId, 'memberId');
    const result = await withIdempotency(
      householdContext,
      {
        req,
        operation,
        idempotencyKey: mutation.idempotencyKey,
        requestHash: mutation.requestHash,
        successStatus: 200,
      },
      () => eventsV1.mutateParticipantV1(
        householdContext,
        eventId,
        req.body ?? {},
        expectedVersion,
        mutation,
      ),
    );
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
