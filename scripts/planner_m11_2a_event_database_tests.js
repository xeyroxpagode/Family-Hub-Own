#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');

const pgModule = require.resolve('pg', {
  paths: [
    path.resolve(__dirname, '..', 'backend'),
    path.resolve(__dirname, '..', '..', '..', 'HomePlus', 'backend'),
  ],
});
const { Client } = require(pgModule);

const DATABASE_URL = process.env.LOCAL_DATABASE_URL
  || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  console.error('ENVIRONMENT_FAILURE: M11.2A database tests are local-only.');
  process.exit(1);
}

const PREFIX = `M11.2A ${crypto.randomUUID()}`;
let assertions = 0;
const fixture = { accountIds: [], personIds: [], householdIds: [] };
const knownBlockers = [];

function check(value, message) {
  assert.ok(value, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

function equal(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function recordBlocker(condition, id, message) {
  if (condition) {
    console.log(`PASS: ${message}`);
    assertions += 1;
    return;
  }
  knownBlockers.push(`${id}: ${message}`);
  console.error(`BLOCKED: ${id}: ${message}`);
}

async function connect() {
  const client = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 5000,
    statement_timeout: 20000,
  });
  await client.connect();
  return client;
}

async function runAs(client, accountId, callback) {
  await client.query(`select set_config('request.jwt.claim.sub', $1, false)`, [accountId]);
  await client.query('set role authenticated');
  try {
    return await callback();
  } finally {
    await client.query('reset role');
  }
}

async function expectFailure(callback, message, code) {
  let caught = null;
  try {
    await callback();
  } catch (error) {
    caught = error;
  }
  check(Boolean(caught), message);
  if (code) equal(caught?.code, code, `${message} uses SQLSTATE ${code}`);
  return caught;
}

async function insertAccount(client, label) {
  const accountId = crypto.randomUUID();
  const personId = crypto.randomUUID();
  fixture.accountIds.push(accountId);
  fixture.personIds.push(personId);
  await client.query(
    `insert into auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values ($1, 'authenticated', 'authenticated', $2, '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, now(), now())`,
    [accountId, `m11-2a-${label}-${accountId}@example.test`],
  );
  await client.query(
    `insert into public.people (id, auth_user_id, display_name, default_language, personal_settings)
     values ($1,$2,$3,'es-419','{}'::jsonb)`,
    [personId, accountId, `${PREFIX} ${label}`],
  );
  return { accountId, personId };
}

async function insertHousehold(client, owner, label) {
  const householdId = crypto.randomUUID();
  fixture.householdIds.push(householdId);
  await client.query(
    `insert into public.households (
      id, name, slug, timezone, default_language, config, created_by_person_id
    ) values ($1,$2,$3,'America/Argentina/Buenos_Aires','es-419','{}'::jsonb,$4)`,
    [householdId, `${PREFIX} ${label}`, `m11-2a-${label}-${householdId}`, owner.personId],
  );
  return householdId;
}

async function insertMember(client, householdId, account, role, status = 'active', setActive = true) {
  const memberId = crypto.randomUUID();
  await client.query(
    `insert into public.household_members (
      id, household_id, person_id, role, status, joined_at,
      household_onboarding_status, household_onboarding_completed_at
    ) values ($1,$2,$3,$4,$5,now(),'completed',now())`,
    [memberId, householdId, account.personId, role, status],
  );
  if (status === 'active' && setActive) {
    await client.query('update public.people set active_household_id=$1 where id=$2', [householdId, account.personId]);
  }
  return memberId;
}

async function createEvent(client, actor, payload, suffix) {
  const mutationId = `m11.2a.${suffix}.mutation`;
  const idempotencyKey = `m11.2a.${suffix}.key`;
  const requestHash = hash({ payload, suffix });
  const operation = 'planner.events.v1.create';
  const result = await canonicalMutation(client, actor, {
    householdId: payload.householdId,
    operation,
    idempotencyKey,
    requestHash,
    successStatus: 201,
  }, async () => {
    const { rows } = await client.query(
      `select public.create_planner_event_v1($1::jsonb,$2,$3) as result`,
      [payload, `m11.2a.${suffix}.request`, mutationId],
    );
    return rows[0].result;
  });
  return { result, mutationId, idempotencyKey, requestHash, operation };
}

async function mutateEvent(client, actor, args) {
  const requestHash = args.requestHash ?? hash(args);
  return canonicalMutation(client, actor, {
    householdId: args.householdId,
    operation: `planner.events.v1.${args.action}`,
    idempotencyKey: args.idempotencyKey,
    requestHash,
    successStatus: 200,
  }, async () => {
    const { rows } = await client.query(
      `select public.mutate_planner_event_v1(
        $1,$2,$3,$4::jsonb,$5,$6,$7,$8
      ) as result`,
      [args.eventId, args.action, args.editScope ?? 'this_occurrence', args.patch ?? {},
        args.expectedVersion, args.expectedSeriesVersion ?? null,
        args.requestId, args.mutationId],
    );
    return rows[0].result;
  });
}

async function mutateParticipant(client, actor, args) {
  const requestHash = args.requestHash ?? hash(args);
  return canonicalMutation(client, actor, {
    householdId: args.householdId,
    operation: `planner.events.v1.participants.${args.action}`,
    idempotencyKey: args.idempotencyKey,
    requestHash,
    successStatus: 200,
  }, async () => {
    const { rows } = await client.query(
      `select public.mutate_planner_event_participant_v1(
        $1,$2,$3,$4,$5,$6,$7,$8,$9
      ) as result`,
      [args.eventId, args.action, args.personId, args.memberId ?? null, args.value ?? null,
        args.expectedEventVersion, args.expectedParticipantVersion ?? null,
        args.requestId, args.mutationId],
    );
    return rows[0].result;
  });
}

async function canonicalMutation(client, actor, options, mutationFn) {
  const householdId = options.householdId ?? actor.householdId;
  const reservation = await runAs(client, actor.accountId, async () => {
    const { rows } = await client.query(
      `select public.reserve_planner_idempotency_key($1,$2,$3,$4,$5) as result`,
      [householdId, actor.memberId, options.idempotencyKey,
        options.operation, options.requestHash],
    );
    return rows[0].result;
  });
  if (reservation.status === 'replay') {
    return { ...reservation.response_body, outcome: 'replay' };
  }
  if (reservation.status !== 'reserved') {
    const error = new Error(`canonical reservation is ${reservation.status}`);
    error.code = 'idempotency_in_flight';
    throw error;
  }
  const body = await runAs(client, actor.accountId, mutationFn);
  await runAs(client, actor.accountId, () => client.query(
    `select public.complete_planner_idempotency_key($1,$2,$3,$4,$5,$6::jsonb)`,
    [householdId, actor.memberId, options.idempotencyKey,
      options.operation, options.successStatus, body],
  ));
  return body;
}

async function getDto(client, actor, eventId) {
  const { rows } = await runAs(client, actor.accountId, () => client.query(
    'select public.planner_event_v1_dto($1) as dto', [eventId],
  ));
  return rows[0].dto;
}

async function cleanup(client) {
  await client.query('reset role').catch(() => {});
  if (fixture.personIds.length) {
    await client.query(
      'update public.people set active_household_id=null where id = any($1::uuid[])',
      [fixture.personIds],
    );
  }
  if (fixture.householdIds.length) {
    await client.query('alter table public.audit_events disable trigger audit_events_prevent_update_delete');
    try {
      await client.query('delete from public.audit_events where household_id = any($1::uuid[])', [fixture.householdIds]);
    } finally {
      await client.query('alter table public.audit_events enable trigger audit_events_prevent_update_delete');
    }
  }
  if (fixture.householdIds.length) {
    await client.query('delete from public.planner_events where household_id = any($1::uuid[])', [fixture.householdIds]);
    await client.query('delete from public.households where id = any($1::uuid[])', [fixture.householdIds]);
  }
  if (fixture.personIds.length) {
    await client.query('delete from public.people where id = any($1::uuid[])', [fixture.personIds]);
  }
  if (fixture.accountIds.length) {
    await client.query('delete from auth.users where id = any($1::uuid[])', [fixture.accountIds]);
  }
  const { rows } = await client.query(
    `select count(*)::int as count from public.people where display_name like $1`, [`${PREFIX}%`],
  );
  equal(rows[0].count, 0, 'cleanup removed every M11.2A person fixture');
}

async function main() {
  const client = await connect();
  try {
    if (process.argv.includes('--assert-clean')) {
      const { rows } = await client.query(
        `select public.planner_m11_2a_backfill_report() as report,
          (select count(*)::int from public.planner_events where title like 'M11.2A %') as fixture_count`,
      );
      equal(rows[0].fixture_count, 0, 'final database has no M11.2A Event fixtures');
      for (const [key, value] of Object.entries(rows[0].report)) {
        if (key !== 'events_total') equal(value, 0, `final backfill report ${key} has zero blockers`);
      }
      console.log(`\nM11.2A EVENT CLEAN ASSERTION: PASS (${assertions} assertions)`);
      return;
    }

    const owner = await insertAccount(client, 'owner');
    const participant = await insertAccount(client, 'participant');
    const outsider = await insertAccount(client, 'outsider');
    const inactive = await insertAccount(client, 'inactive');
    const primaryHousehold = await insertHousehold(client, owner, 'primary');
    const otherHousehold = await insertHousehold(client, outsider, 'other');
    const ownerMember = await insertMember(client, primaryHousehold, owner, 'coordinator');
    const participantMember = await insertMember(client, primaryHousehold, participant, 'adult');
    const outsiderMember = await insertMember(client, otherHousehold, outsider, 'coordinator');
    owner.memberId = ownerMember;
    owner.householdId = primaryHousehold;
    participant.memberId = participantMember;
    participant.householdId = primaryHousehold;
    outsider.memberId = outsiderMember;
    outsider.householdId = otherHousehold;
    await insertMember(client, primaryHousehold, inactive, 'adult', 'suspended', false);
    await insertMember(client, otherHousehold, owner, 'adult', 'active', false);

    const timedPayload = {
      scope: 'household', householdId: primaryHousehold, title: `${PREFIX} timed`,
      scheduling: {
        type: 'timed', startsAt: '2026-08-10T13:00:00.000Z',
        endsAt: '2026-08-10T14:30:00.000Z', durationMinutes: null,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      location: { type: 'other', payload: { display_name: 'Biblioteca', normalized_address: 'Calle 1' } },
      attendanceRequired: false,
    };
    const created = await createEvent(client, owner, timedPayload, 'household.create');
    equal(created.result.outcome, 'created', 'household Event V1 creates successfully');
    const householdEventId = created.result.data.event.id;
    equal(created.result.data.event.scope, 'household', 'household ownership is explicit');
    equal(created.result.data.event.scheduling.type, 'timed', 'timed scheduling is normalized');
    equal(created.result.data.event.location.type, 'other', 'structured other location is returned');
    equal(created.result.data.event.participants.length, 1, 'creator is the initial participant');
    equal(created.result.data.event.participants[0].personId, owner.personId, 'creator participant identity is correct');

    let directUpdateError = null;
    await client.query('begin');
    try {
      await runAs(client, owner.accountId, () => client.query(
        'update public.planner_events set title=$1 where id=$2',
        [`${PREFIX} direct bypass`, householdEventId],
      ));
    } catch (error) {
      directUpdateError = error;
    } finally {
      await client.query('rollback');
    }
    recordBlocker(Boolean(directUpdateError), 'M11.2A-AUD-02',
      'authenticated direct Event UPDATE must be rejected');
    let directInsertError = null;
    await client.query('begin');
    try {
      await runAs(client, owner.accountId, () => client.query(
        `insert into public.planner_events (
          household_id, title, starts_at, all_day, recurrence,
          created_by_person_id, created_by_member_id
        ) values ($1,$2,'2026-08-11T13:00:00Z',false,'none',$3,$4)`,
        [primaryHousehold, `${PREFIX} direct insert bypass`, owner.personId, ownerMember],
      ));
    } catch (error) {
      directInsertError = error;
    } finally {
      await client.query('rollback');
    }
    recordBlocker(Boolean(directInsertError), 'M11.2A-AUD-02',
      'authenticated direct Event INSERT must be rejected');
    await expectFailure(
      () => runAs(client, owner.accountId, () => client.query(
        'delete from public.planner_events where id=$1', [householdEventId],
      )),
      'authenticated direct Event DELETE is rejected',
      '42501',
    );

    const replay = (await createEvent(client, owner, timedPayload, 'household.create')).result;
    equal(replay.outcome, 'replay', 'identical create replay is idempotent');
    equal(replay.data.event.id, householdEventId, 'create replay keeps the same Event identity');
    const auditCount = await client.query(
      `select count(*)::int as count from public.audit_events
       where action='event.created' and aggregate_id=$1`, [householdEventId],
    );
    equal(auditCount.rows[0].count, 1, 'create audit is written exactly once');
    await expectFailure(
      () => createEvent(client, owner, { ...timedPayload, title: `${PREFIX} conflicting replay` }, 'household.create'),
      'same idempotency key with a different payload is rejected',
      '40007',
    );
    for (const [suffix, scheduling] of [
      ['invalid-zone', { ...timedPayload.scheduling, timeZone: 'not/a-zone' }],
      ['equal-end', { ...timedPayload.scheduling, endsAt: timedPayload.scheduling.startsAt }],
      ['end-and-duration', { ...timedPayload.scheduling, durationMinutes: 30 }],
    ]) {
      await expectFailure(
        () => runAs(client, owner.accountId, () => client.query(
          'select public.create_planner_event_v1($1::jsonb,$2,$3)',
          [{ ...timedPayload, title: `${PREFIX} ${suffix}`, scheduling },
            `m11.2a.${suffix}.request`, `m11.2a.${suffix}.mutation`],
        )),
        `${suffix} timed schedule is rejected safely`,
        '22023',
      );
    }

    const allDayPayload = {
      scope: 'household', householdId: primaryHousehold, title: `${PREFIX} all day`,
      scheduling: { type: 'all_day', startDate: '2026-09-02', endDate: '2026-09-04' },
      location: { type: 'home', payload: {} },
      recurrenceRule: { frequency: 'weekly', interval: 1 },
    };
    const recurringCreated = await createEvent(client, owner, allDayPayload, 'recurring.create');
    const recurringEventId = recurringCreated.result.data.event.id;
    equal(recurringCreated.result.data.event.scheduling.startDate, '2026-09-02', 'all-day start date remains semantic');
    equal(recurringCreated.result.data.event.scheduling.endDate, '2026-09-04', 'all-day end date remains semantic');
    equal(recurringCreated.result.data.event.householdId, primaryHousehold, 'household DTO retains household identity');
    equal(recurringCreated.result.data.event.location.type, 'home', 'home location remains semantic');
    check(Boolean(recurringCreated.result.data.event.recurrence.seriesId), 'recurring Event has a series identity');
    check(Boolean(recurringCreated.result.data.event.recurrence.occurrenceKey), 'recurring Event has a concrete occurrence identity');

    equal(await getDto(client, outsider, householdEventId), null, 'other-household access is rejected');
    equal(await getDto(client, inactive, householdEventId), null, 'inactive membership cannot read household Event');
    const outsiderDirectHousehold = await runAs(client, outsider.accountId, () => client.query(
      'select count(*)::int as count from public.planner_events where id=$1', [householdEventId],
    ));
    equal(outsiderDirectHousehold.rows[0].count, 0, 'direct RLS rejects other-household Event read');
    const inactiveDirectHousehold = await runAs(client, inactive.accountId, () => client.query(
      'select count(*)::int as count from public.planner_events where id=$1', [householdEventId],
    ));
    equal(inactiveDirectHousehold.rows[0].count, 0, 'direct RLS rejects inactive household member');

    let dto = await getDto(client, owner, householdEventId);
    const added = await mutateParticipant(client, owner, {
      eventId: householdEventId, action: 'add', personId: participant.personId,
      memberId: participantMember, value: 'pending', expectedEventVersion: dto.version,
      requestId: 'm11.2a.participant.add.request', mutationId: 'm11.2a.participant.add.mutation',
      idempotencyKey: 'm11.2a.participant.add.key',
    });
    equal(added.data.event.participants.length, 2, 'participant is stored separately from Event');
    let participantRow = added.data.event.participants.find((row) => row.personId === participant.personId);
    equal(participantRow.rsvp, 'pending', 'new participant RSVP starts pending');
    equal(participantRow.attendance, 'not_recorded', 'new participant attendance starts independently');

    const rsvp = await mutateParticipant(client, participant, {
      eventId: householdEventId, action: 'rsvp', personId: participant.personId,
      value: 'maybe', expectedEventVersion: added.version,
      expectedParticipantVersion: participantRow.version,
      requestId: 'm11.2a.rsvp.request', mutationId: 'm11.2a.rsvp.mutation',
      idempotencyKey: 'm11.2a.rsvp.key',
    });
    participantRow = rsvp.data.event.participants.find((row) => row.personId === participant.personId);
    equal(participantRow.rsvp, 'maybe', 'participant can record own RSVP');
    equal(participantRow.attendance, 'not_recorded', 'RSVP never overwrites attendance');

    await expectFailure(() => mutateParticipant(client, owner, {
      eventId: householdEventId, action: 'attendance', personId: participant.personId,
      value: 'present', expectedEventVersion: rsvp.version,
      expectedParticipantVersion: participantRow.version,
      requestId: 'm11.2a.attendance.disabled.request', mutationId: 'm11.2a.attendance.disabled.mutation',
      idempotencyKey: 'm11.2a.attendance.disabled.key',
    }), 'attendance is rejected while disabled', '55000');

    const attendanceEnabled = await mutateEvent(client, owner, {
      eventId: householdEventId, action: 'update', editScope: 'this_occurrence',
      patch: { attendanceRequired: true }, expectedVersion: rsvp.version,
      requestId: 'm11.2a.attendance.enable.request', mutationId: 'm11.2a.attendance.enable.mutation',
      idempotencyKey: 'm11.2a.attendance.enable.key',
    });
    participantRow = attendanceEnabled.data.event.participants.find((row) => row.personId === participant.personId);
    const attendance = await mutateParticipant(client, owner, {
      eventId: householdEventId, action: 'attendance', personId: participant.personId,
      value: 'present', expectedEventVersion: attendanceEnabled.version,
      expectedParticipantVersion: participantRow.version,
      requestId: 'm11.2a.attendance.request', mutationId: 'm11.2a.attendance.mutation',
      idempotencyKey: 'm11.2a.attendance.key',
    });
    participantRow = attendance.data.event.participants.find((row) => row.personId === participant.personId);
    equal(participantRow.attendance, 'present', 'attendance records when enabled');
    equal(participantRow.rsvp, 'maybe', 'attendance never overwrites RSVP');

    await expectFailure(() => runAs(client, owner.accountId, () => client.query(
      `insert into public.planner_event_participants (
        event_id, person_id, member_id, invited_by_person_id, invited_by_member_id
      ) values ($1,$2,$3,$4,$5)`,
      [householdEventId, outsider.personId, outsiderMember, owner.personId, ownerMember],
    )), 'direct participant insertion is rejected before cross-household spoofing can bypass the RPC', '42501');

    const seriesId = recurringCreated.result.data.event.recurrence.seriesId;
    const firstKey = recurringCreated.result.data.event.recurrence.occurrenceKey;
    check(!recurringCreated.result.data.event.recurrence.availableEditScopes.includes('this_and_following'), 'unsafe split is not exposed on the first occurrence');
    const occurrenceIds = [recurringEventId];
    for (const [date, key] of [['2026-09-09', '2026-09-09'], ['2026-09-16', '2026-09-16']]) {
      const id = crypto.randomUUID();
      occurrenceIds.push(id);
      await client.query(
        `insert into public.planner_events (
          id, household_id, scope, owner_person_id, lifecycle, title, status,
          schedule_type, starts_at, ends_at, all_day, start_date, end_date,
          location_type, location_payload, location_name, attendance_required,
          recurrence, series_id, occurrence_key, occurrence_original_start_date,
          created_by_person_id, created_by_member_id
        ) values ($1,$2,'household',null,'scheduled',$3,'scheduled','all_day',
          $4::date::timestamp at time zone 'UTC',$4::date::timestamp at time zone 'UTC',true,$4,$4,
          'home','{}'::jsonb,'home',false,'none',$5,$6,$4,$7,$8)`,
        [id, primaryHousehold, `${PREFIX} recurring`, date, seriesId, key, owner.personId, ownerMember],
      );
    }
    dto = await getDto(client, owner, occurrenceIds[1]);
    check(dto.recurrence.availableEditScopes.includes('this_and_following'), 'safe series split scope is exposed after first occurrence');
    const occurrenceEdit = await mutateEvent(client, owner, {
      eventId: occurrenceIds[1], action: 'update', editScope: 'this_occurrence',
      patch: { title: `${PREFIX} one occurrence` }, expectedVersion: dto.version,
      requestId: 'm11.2a.occurrence.edit.request', mutationId: 'm11.2a.occurrence.edit.mutation',
      idempotencyKey: 'm11.2a.occurrence.edit.key',
    });
    equal(occurrenceEdit.data.event.title, `${PREFIX} one occurrence`, 'single occurrence edit changes target occurrence');
    equal((await getDto(client, owner, occurrenceIds[2])).title, `${PREFIX} recurring`, 'single occurrence edit leaves future occurrence unchanged');

    dto = await getDto(client, owner, occurrenceIds[1]);
    const split = await mutateEvent(client, owner, {
      eventId: occurrenceIds[1], action: 'update', editScope: 'this_and_following',
      patch: {
        title: `${PREFIX} split future`,
        recurrenceRule: { frequency: 'weekly', interval: 2 },
        scheduling: { type: 'all_day', startDate: '2026-09-10', endDate: '2026-09-10' },
      },
      expectedVersion: dto.version, expectedSeriesVersion: dto.recurrence.seriesVersion,
      requestId: 'm11.2a.series.split.request', mutationId: 'm11.2a.series.split.mutation',
      idempotencyKey: 'm11.2a.series.split.key',
    });
    const newSeriesId = split.data.event.recurrence.seriesId;
    check(newSeriesId !== seriesId, 'series split creates a distinct series identity');
    equal((await getDto(client, owner, recurringEventId)).recurrence.seriesId, seriesId, 'pre-boundary occurrence stays in original series');
    equal((await getDto(client, owner, occurrenceIds[2])).recurrence.seriesId, newSeriesId, 'following occurrence moves atomically to new series');
    equal((await getDto(client, owner, occurrenceIds[2])).title, `${PREFIX} split future`, 'split patch applies to following occurrences');
    equal(split.data.event.scheduling.startDate, '2026-09-10', 'all-day split applies semantic boundary date delta');
    equal((await getDto(client, owner, occurrenceIds[2])).scheduling.startDate, '2026-09-17',
      'all-day split preserves relative semantic date offset');
    const splitReplay = await mutateEvent(client, owner, {
      eventId: occurrenceIds[1], action: 'update', editScope: 'this_and_following',
      patch: {
        title: `${PREFIX} split future`,
        recurrenceRule: { frequency: 'weekly', interval: 2 },
        scheduling: { type: 'all_day', startDate: '2026-09-10', endDate: '2026-09-10' },
      },
      expectedVersion: dto.version, expectedSeriesVersion: dto.recurrence.seriesVersion,
      requestId: 'm11.2a.series.split.request', mutationId: 'm11.2a.series.split.mutation',
      idempotencyKey: 'm11.2a.series.split.key',
    });
    equal(splitReplay.outcome, 'replay', 'series split replay is idempotent');
    const splitAudit = await client.query(
      `select count(*)::int as count from public.audit_events
       where action='event.series_split' and mutation_id='m11.2a.series.split.mutation'`,
    );
    equal(splitAudit.rows[0].count, 1, 'series split audit is exactly once');

    dto = await getDto(client, owner, occurrenceIds[1]);
    const cancelledOccurrence = await mutateEvent(client, owner, {
      eventId: occurrenceIds[1], action: 'cancel', editScope: 'this_occurrence', patch: {},
      expectedVersion: dto.version,
      requestId: 'm11.2a.cancel.occurrence.request', mutationId: 'm11.2a.cancel.occurrence.mutation',
      idempotencyKey: 'm11.2a.cancel.occurrence.key',
    });
    equal(cancelledOccurrence.data.event.lifecycle, 'cancelled', 'occurrence cancellation affects target occurrence');
    equal((await getDto(client, owner, occurrenceIds[2])).lifecycle, 'scheduled', 'occurrence cancellation leaves series sibling scheduled');

    dto = await getDto(client, owner, occurrenceIds[2]);
    const cancelledSeries = await mutateEvent(client, owner, {
      eventId: occurrenceIds[2], action: 'cancel', editScope: 'whole_series', patch: {},
      expectedVersion: dto.version, expectedSeriesVersion: dto.recurrence.seriesVersion,
      requestId: 'm11.2a.cancel.series.request', mutationId: 'm11.2a.cancel.series.mutation',
      idempotencyKey: 'm11.2a.cancel.series.key',
    });
    equal(cancelledSeries.data.event.lifecycle, 'cancelled', 'whole-series cancellation cancels selected occurrence');
    equal((await getDto(client, owner, occurrenceIds[1])).lifecycle, 'cancelled', 'whole-series cancellation cancels all occurrences in split series');

    const draftPayload = { ...timedPayload, title: `${PREFIX} draft lifecycle`, lifecycle: 'draft' };
    const draftCreated = await createEvent(client, owner, draftPayload, 'lifecycle.draft.create');
    const draftTrashed = await mutateEvent(client, owner, {
      eventId: draftCreated.result.data.event.id, action: 'trash', expectedVersion: draftCreated.result.version,
      requestId: 'm11.2a.lifecycle.draft.trash.request', mutationId: 'm11.2a.lifecycle.draft.trash.mutation',
      idempotencyKey: 'm11.2a.lifecycle.draft.trash.key',
    });
    const draftRestored = await mutateEvent(client, owner, {
      eventId: draftCreated.result.data.event.id, action: 'restore', expectedVersion: draftTrashed.version,
      requestId: 'm11.2a.lifecycle.draft.restore.request', mutationId: 'm11.2a.lifecycle.draft.restore.mutation',
      idempotencyKey: 'm11.2a.lifecycle.draft.restore.key',
    });
    equal(draftRestored.data.event.lifecycle, 'draft', 'trash/restore preserves draft lifecycle');

    const cancelledLifecycle = await createEvent(client, owner,
      { ...timedPayload, title: `${PREFIX} cancelled lifecycle` }, 'lifecycle.cancelled.create');
    const lifecycleCancelled = await mutateEvent(client, owner, {
      eventId: cancelledLifecycle.result.data.event.id, action: 'cancel',
      expectedVersion: cancelledLifecycle.result.version,
      requestId: 'm11.2a.lifecycle.cancel.request', mutationId: 'm11.2a.lifecycle.cancel.mutation',
      idempotencyKey: 'm11.2a.lifecycle.cancel.key',
    });
    const cancelledTrashed = await mutateEvent(client, owner, {
      eventId: cancelledLifecycle.result.data.event.id, action: 'trash',
      expectedVersion: lifecycleCancelled.version,
      requestId: 'm11.2a.lifecycle.cancelled.trash.request', mutationId: 'm11.2a.lifecycle.cancelled.trash.mutation',
      idempotencyKey: 'm11.2a.lifecycle.cancelled.trash.key',
    });
    const cancelledRestored = await mutateEvent(client, owner, {
      eventId: cancelledLifecycle.result.data.event.id, action: 'restore',
      expectedVersion: cancelledTrashed.version,
      requestId: 'm11.2a.lifecycle.cancelled.restore.request', mutationId: 'm11.2a.lifecycle.cancelled.restore.mutation',
      idempotencyKey: 'm11.2a.lifecycle.cancelled.restore.key',
    });
    equal(cancelledRestored.data.event.lifecycle, 'cancelled', 'trash/restore preserves cancelled lifecycle');

    await expectFailure(() => mutateEvent(client, owner, {
      eventId: householdEventId, action: 'update', editScope: 'this_occurrence',
      patch: { title: 'stale' }, expectedVersion: 1,
      requestId: 'm11.2a.stale.request', mutationId: 'm11.2a.stale.mutation',
      idempotencyKey: 'm11.2a.stale.key',
    }), 'stale Event version is rejected', '40001');

    const concurrentPayload = { ...timedPayload, title: `${PREFIX} concurrent` };
    const c1 = await connect();
    const c2 = await connect();
    try {
      const settled = await Promise.allSettled([
        createEvent(c1, owner, concurrentPayload, 'concurrent'),
        createEvent(c2, owner, concurrentPayload, 'concurrent'),
      ]);
      equal(settled.filter((item) => item.status === 'fulfilled').length, 1,
        'concurrent equivalent creates have one effective mutation while reservation is in flight');
      const rejected = settled.find((item) => item.status === 'rejected');
      recordBlocker(rejected?.reason?.code === 'idempotency_in_flight', 'M11.2A-AUD-06',
        `concurrent canonical reservation must return in_flight instead of ${rejected?.reason?.code ?? 'unknown'}`);
      const recovered = (await createEvent(client, owner, concurrentPayload, 'concurrent')).result;
      equal(recovered.outcome, 'replay', 'lost/in-flight response recovers as canonical replay');
    } finally {
      await c1.end();
      await c2.end();
    }

    const v0Id = crypto.randomUUID();
    await runAs(client, owner.accountId, () => client.query(
      `insert into public.planner_events (
        id, household_id, title, starts_at, all_day, recurrence,
        created_by_person_id, created_by_member_id
      ) values ($1,$2,$3,'2026-10-01T15:00:00Z',false,'none',$4,$5)`,
      [v0Id, primaryHousehold, `${PREFIX} V0`, owner.personId, ownerMember],
    ));
    const v0Row = await client.query('select * from public.planner_events where id=$1', [v0Id]);
    equal(v0Row.rows[0].status, 'scheduled', 'V0 status projection remains scheduled');
    equal(v0Row.rows[0].recurrence, 'none', 'V0 recurrence field remains unchanged');
    equal(v0Row.rows[0].scope, 'household', 'V0 insert receives additive household scope default');
    equal(v0Row.rows[0].duration_minutes, 60, 'V0 no-end timed Event receives a non-breaking duration projection');

    await runAs(client, owner.accountId, () => client.query(
      `update public.planner_events set recurrence='weekly' where id=$1`, [v0Id],
    ));
    const v0Recurring = await client.query(
      'select id, series_id, occurrence_key from public.planner_events where id=$1', [v0Id],
    );
    equal(v0Recurring.rows[0].id, v0Id, 'V0 recurrence bridge preserves Event identity');
    check(Boolean(v0Recurring.rows[0].series_id), 'V0 none-to-recurring update creates series identity');
    check(Boolean(v0Recurring.rows[0].occurrence_key), 'V0 none-to-recurring update creates occurrence identity');
    const v0RecurringInsertId = crypto.randomUUID();
    await runAs(client, owner.accountId, () => client.query(
      `insert into public.planner_events (
        id, household_id, title, starts_at, all_day, recurrence,
        created_by_person_id, created_by_member_id
      ) values ($1,$2,$3,'2026-10-08T15:00:00Z',false,'weekly',$4,$5)`,
      [v0RecurringInsertId, primaryHousehold, `${PREFIX} V0 recurring insert`, owner.personId, ownerMember],
    ));
    const v0RecurringInsert = await client.query(
      'select series_id, occurrence_key from public.planner_events where id=$1', [v0RecurringInsertId],
    );
    check(Boolean(v0RecurringInsert.rows[0].series_id), 'post-migration V0 recurring insert creates series identity');
    check(Boolean(v0RecurringInsert.rows[0].occurrence_key), 'post-migration V0 recurring insert creates stable occurrence identity');

    const solo = await insertAccount(client, 'personal-no-household');
    const personalPayload = {
      scope: 'personal', title: `${PREFIX} personal no household`,
      scheduling: {
        type: 'timed', startsAt: '2026-11-01T10:00:00Z', durationMinutes: 60,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
    };
    let personalCreateError = null;
    try {
      await runAs(client, solo.accountId, () => client.query(
        'select public.create_planner_event_v1($1::jsonb,$2,$3)',
        [personalPayload, 'm11.2a.personal.request', 'm11.2a.personal.mutation'],
      ));
    } catch (error) {
      personalCreateError = error;
    }
    recordBlocker(!personalCreateError, 'M11.2A-AUD-01',
      'person without household or membership must create a private personal Event');

    const strandedReservation = await client.query(
      `select count(*)::int as count from public.planner_idempotency_keys
       where household_id=$1 and idempotency_key='m11.2a.attendance.disabled.key'
         and response_status=0`, [primaryHousehold],
    );
    recordBlocker(strandedReservation.rows[0].count === 0, 'M11.2A-AUD-06',
      'failed mutation must not leave a permanent in-flight canonical reservation');

    const report = await client.query('select public.planner_m11_2a_backfill_report() as report');
    for (const [key, value] of Object.entries(report.rows[0].report)) {
      if (key !== 'events_total') equal(value, 0, `backfill report ${key} has zero blockers`);
    }

    if (knownBlockers.length) {
      throw new Error(`CORRECTION BLOCKED:\n${knownBlockers.join('\n')}`);
    }

    console.log(`\nM11.2A EVENT DATABASE TESTS: PASS (${assertions} assertions before cleanup)`);
  } finally {
    try {
      await cleanup(client);
    } finally {
      await client.end();
    }
  }
}

main().catch((error) => {
  console.error(`\nM11.2A EVENT DATABASE TESTS: FAIL\n${error.stack ?? error}`);
  process.exitCode = 1;
});
