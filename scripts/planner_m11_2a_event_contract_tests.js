#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
let assertions = 0;
let staticAssertions = 0;
let behavioralAssertions = 0;

function check(value, message) {
  assert.ok(value, message);
  assertions += 1;
  staticAssertions += 1;
  console.log(`PASS: ${message}`);
}

function behaviorCheck(value, message) {
  assert.ok(value, message);
  assertions += 1;
  behavioralAssertions += 1;
  console.log(`PASS BEHAVIOR: ${message}`);
}

function source(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

async function main() {
  const migrationPath = 'supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql';
  const migration = source(migrationPath);
  const controller = source('backend/src/controllers/planner.events.v1.controller.js');
  const service = source('backend/src/services/planner.events.v1.service.js');
  const context = source('backend/src/services/planner.events.v1.context.service.js');
  const dto = source('front/mi-front-limpio/services/plannerEventsV1.ts');

  check(migration.includes("scope in ('personal', 'household')"), 'schema freezes personal and household scope');
  check(migration.includes("lifecycle in ('draft', 'scheduled', 'cancelled', 'trash')"), 'schema freezes Event lifecycle');
  check(migration.includes("schedule_type in ('timed', 'all_day')"), 'schema separates timed and all-day schedules');
  check(migration.includes('Never convert this value through UTC'), 'all-day semantic date rule is documented in schema');
  check(migration.includes("location_type in ('home', 'other')"), 'structured location types are constrained');
  check(migration.includes("rsvp_status in ('pending', 'attending', 'declined', 'maybe')"), 'RSVP values are constrained');
  check(migration.includes("attendance_status in ('not_recorded', 'present', 'absent', 'excused')"), 'attendance values are constrained');
  check(migration.includes('attendance is disabled for this event'), 'attendance-disabled invariant is enforced');
  check(migration.includes('planner_event_series'), 'series definitions use a separate table');
  check(migration.includes('occurrence_key'), 'concrete occurrence identity is persisted');
  check(['this_occurrence', 'this_and_following', 'whole_series'].every((value) => migration.includes(value)), 'all required edit scopes are implemented');
  check(migration.includes('series cannot be split safely at this occurrence'), 'unsafe series split is rejected');
  check(controller.includes('invokeAtomicPlannerMutationV2'), 'controller consumes V2 atomic mutation frontier');
  check(controller.includes('rpcAdapter'), 'controller uses custom RPC adapter for operation-specific V2 RPCs');
  check(!migration.includes('audit_events_event_idempotency_uidx'), 'audit_events is not used as an idempotency store');
  check(!migration.includes('planner_event_replay_metadata'), 'Event-specific audit replay store was removed');
  check(migration.includes('planner_event_time_zone_is_valid'), 'IANA time zones are validated against PostgreSQL authority');
  check(migration.includes('num_nonnulls(v_ends_at, v_duration) <> 1'), 'timed scheduling requires exactly one end representation');
  check(migration.includes('trashed_from_lifecycle'), 'trash preserves the prior V1 lifecycle explicitly');
  check(migration.includes("set lifecycle = trashed_from_lifecycle"), 'restore consumes the preserved lifecycle');
  check(migration.includes("revoke insert, update, delete on public.planner_event_participants"), 'direct participant mutations are revoked');
  check(migration.includes("revoke insert, update, delete on public.planner_event_series"), 'direct series mutations are revoked');
  check(migration.includes("revoke insert, update, delete on public.planner_events"), 'direct planner_events mutations are revoked (RLS + RPC only)');
  check(migration.includes("v_non_temporal_patch := (p_patch - 'recurrenceRule') - 'scheduling'"), 'series scheduling uses an explicit non-temporal patch');
  check(migration.includes('v_start_delta'), 'timed series edits calculate a relative delta');
  check(migration.includes('v_date_delta'), 'all-day series edits calculate a semantic date delta');
  check(migration.includes('set search_path = pg_catalog, public'), 'SECURITY DEFINER functions use a safe search path');
  check(migration.includes('public.current_person_id()'), 'actor person is derived from auth context');
  check(migration.includes('public.current_household_member_id'), 'household actor is derived from auth context');
  check(migration.includes('event creation forbidden'), 'household create capability is enforced in RPC');
  check(migration.includes('planner_event_can_view'), 'RLS and RPC share Event visibility semantics');
  check(migration.includes('planner_event_can_mutate'), 'RLS and RPC share Event mutation semantics');
  check(migration.includes('creator is always the first participant') || migration.includes('Creator is always the first participant'), 'creator participant default is documented');
  check(migration.includes('planner_m11_2a_backfill_report'), 'migration exposes a zero-blocker backfill report');

  check(controller.includes('requireMutationId'), 'V1 controller requires canonical mutation identity');
  check(controller.includes('requireIdempotencyKey'), 'V1 controller requires canonical idempotency key');
  check(controller.includes('parseRequiredExpectedVersion'), 'V1 existing-entity mutations require expected version');
  check(controller.includes('hashIdempotencyRequestV2'), 'V1 controller uses V2 canonical request hashing');
  check(service.includes("'version_conflict_v2'"), 'V1 service maps stale versions to canonical error code');
  check(service.includes("'idempotency_key_conflict'"), 'V1 service maps idempotency conflicts');
  check(context.includes('does not require an active household'), 'personal read context is independent from active household');
  check(!controller.includes('personal_idempotency_contract_unavailable'), 'personal mutation blocker removed - personal scope now supported');
  check(controller.includes('requireUuid'), 'controller validates UUID inputs before RPC calls');

  for (const required of [
    'identity', 'version', 'scope', 'lifecycle', 'scheduling', 'location',
    'recurrence', 'participants', 'rsvp', 'attendance', 'availableActions',
  ]) {
    const token = required === 'identity' ? 'id: string' : required;
    check(dto.includes(token), `DTO publishes ${required}`);
  }
  check(dto.includes("'this_occurrence' | 'this_and_following' | 'whole_series'"), 'frontend DTO freezes edit-scope union');
  check(dto.includes("'pending' | 'attending' | 'declined' | 'maybe'"), 'frontend DTO freezes RSVP union');
  check(dto.includes("'not_recorded' | 'present' | 'absent' | 'excused'"), 'frontend DTO freezes attendance union');
  check(dto.includes('OPERATION_KINDS.CREATE_IDEMPOTENT'), 'frontend create uses canonical operation kind');
  check(dto.includes('OPERATION_KINDS.VERSIONED_MUTATION'), 'frontend mutations use canonical versioned operation kind');

  const changed = execFileSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' });
  for (const protectedPath of [
    'backend/src/routes/planner.js',
    'backend/src/lib/plannerCapabilities.js',
    'backend/src/controllers/planner.events.controller.js',
    'front/mi-front-limpio/services/plannerEvents.ts',
  ]) {
    check(!changed.includes(protectedPath), `${protectedPath} remains untouched for V0/shared ownership`);
  }
  check(!changed.includes('PlannerCalendar'), 'combined Calendar files remain untouched');
  check(!changed.includes('planner.plans'), 'Plan files remain untouched');

  const v0Service = source('backend/src/services/planner.events.service.js');
  check(v0Service.includes('createEvent,'), 'V0 create service export remains available');
  check(v0Service.includes('createOccurrenceOverride,'), 'V0 occurrence override export remains available');
  check(v0Service.includes('cancelEvent,'), 'V0 cancel service export remains available');

  check(service.includes('getEventV1,'), 'V1 get event service export is available');
  check(service.includes('listEventsV1,'), 'V1 list events service export is available');
  check(service.includes('getEventMutationIdentity,'), 'V1 mutation identity helper is available');

  const { mapEventV1DatabaseError } = require('../backend/src/services/planner.events.v1.service');
  const { buildApiErrorEnvelope } = require('../backend/src/lib/httpErrors');
  const invalidUuid = mapEventV1DatabaseError({ code: '22P02', message: 'raw uuid SQL' });
  behaviorCheck(invalidUuid.statusCode === 400 && invalidUuid.code === 'validation_error', 'invalid UUID maps to stable 400 validation error');
  behaviorCheck(!invalidUuid.message.includes('SQL'), 'invalid UUID response does not expose raw SQL');
  const constraint = mapEventV1DatabaseError({ code: '23514', message: 'relation planner_events constraint secret' });
  behaviorCheck(constraint.statusCode === 400 && !constraint.message.includes('planner_events'), 'constraint error uses a safe public message');
  const stale = mapEventV1DatabaseError({ code: '40001', message: 'version conflict current=7 expected=6' });
  behaviorCheck(stale.statusCode === 412 && stale.code === 'version_conflict_v2', 'stale version uses canonical status and code');
  behaviorCheck(stale.details?.current === 7 && stale.details?.expected === 6, 'stale version exposes sanitized current/expected details');
  const internal = buildApiErrorEnvelope(new Error('database secret'), { requestId: 'r1.request' });
  behaviorCheck(internal.envelope.error.message === 'Error interno.', '500 envelope sanitizes internal messages');
  behaviorCheck(internal.envelope.error.request_id === 'r1.request', 'error envelope preserves request correlation');

  console.log(`\nM11.2A EVENT CONTRACT TESTS: PASS (${staticAssertions} static assertions, ${behavioralAssertions} behavioral assertions, ${assertions} total)`);
}

main().catch((error) => {
  console.error(`\nM11.2A EVENT CONTRACT TESTS: FAIL\n${error.stack ?? error}`);
  process.exitCode = 1;
});