'use strict';

const { createHttpError } = require('../lib/httpErrors');

function mapEventV1DatabaseError(error) {
  if (!error) return createHttpError(500, 'Error interno.', 'internal_error');
  if (error.code === '42501') return createHttpError(403, 'No tenés permiso para esta operación.', 'forbidden');
  if (error.code === '40007') return createHttpError(409, 'La clave idempotente ya fue usada con otros datos.', 'idempotency_key_conflict');
  if (error.code === '40001') {
    const match = String(error.message ?? '').match(/current=(\d+)\s+expected=(\d+)/);
    return createHttpError(
      412,
      'La versión cambió. Actualizá y reintentá.',
      'version_conflict_v2',
      match ? { current: Number(match[1]), expected: Number(match[2]) } : undefined,
    );
  }
  if (error.code === 'P0002') return createHttpError(404, 'Evento no encontrado.', 'not_found');
  if (error.code === '55000') return createHttpError(409, 'La operación no es válida para el estado actual.', 'invalid_transition');
  if (error.code === '22P02' || error.code === '22023' || error.code === '23514' || error.code === '23505') {
    return createHttpError(400, 'Los datos del evento no son válidos.', 'validation_error');
  }
  return createHttpError(500, 'Error interno.', 'internal_error');
}

async function rpc(context, name, params) {
  const { data, error } = await context.client.rpc(name, params);
  if (error) throw mapEventV1DatabaseError(error);
  return data;
}

async function listEventsV1(context, query = {}) {
  const scopes = query.scope ? [query.scope] : ['personal', 'household'];
  let request = context.client
    .from('planner_events')
    .select('id, starts_at, start_date')
    .in('scope', scopes)
    .order('starts_at', { ascending: true })
    .limit(Math.min(Math.max(Number(query.limit) || 100, 1), 500));
  if (query.lifecycle) request = request.eq('lifecycle', query.lifecycle);
  if (!query.include_trash) request = request.neq('lifecycle', 'trash');
  const { data, error } = await request;
  if (error) throw mapEventV1DatabaseError(error);

  const events = [];
  for (const row of data ?? []) {
    const dto = await rpc(context, 'planner_event_v1_dto', { p_event_id: row.id });
    if (dto) events.push(dto);
  }
  return { data: { events } };
}

async function getEventV1(context, eventId) {
  const event = await rpc(context, 'planner_event_v1_dto', { p_event_id: eventId });
  if (!event) throw createHttpError(404, 'Evento no encontrado.', 'not_found');
  return { data: { event } };
}

async function getEventMutationIdentity(context, eventId) {
  const { data, error } = await context.client
    .from('planner_events')
    .select('id, scope, household_id, owner_person_id')
    .eq('id', eventId)
    .maybeSingle();
  if (error) throw mapEventV1DatabaseError(error);
  if (!data) throw createHttpError(404, 'Evento no encontrado.', 'not_found');
  return data;
}

function createEventV1(context, payload, mutation) {
  return rpc(context, 'create_planner_event_v1', {
    p_payload: payload,
    p_request_id: mutation.requestId,
    p_mutation_id: mutation.mutationId,
  });
}

function mutateEventV1(context, eventId, action, editScope, patch, expectedVersion, expectedSeriesVersion, mutation) {
  return rpc(context, 'mutate_planner_event_v1', {
    p_event_id: eventId,
    p_action: action,
    p_edit_scope: editScope ?? 'this_occurrence',
    p_patch: patch ?? {},
    p_expected_version: expectedVersion,
    p_expected_series_version: expectedSeriesVersion ?? null,
    p_request_id: mutation.requestId,
    p_mutation_id: mutation.mutationId,
  });
}

function mutateParticipantV1(context, eventId, input, expectedEventVersion, mutation) {
  return rpc(context, 'mutate_planner_event_participant_v1', {
    p_event_id: eventId,
    p_action: input.action,
    p_person_id: input.personId,
    p_member_id: input.memberId ?? null,
    p_value: input.value ?? null,
    p_expected_event_version: expectedEventVersion,
    p_expected_participant_version: input.expectedParticipantVersion ?? null,
    p_request_id: mutation.requestId,
    p_mutation_id: mutation.mutationId,
  });
}

module.exports = {
  createEventV1,
  getEventV1,
  getEventMutationIdentity,
  listEventsV1,
  mapEventV1DatabaseError,
  mutateEventV1,
  mutateParticipantV1,
};
