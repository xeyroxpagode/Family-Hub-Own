#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Client } = require('../backend/node_modules/pg');

const DATABASE_URL = process.env.LOCAL_DATABASE_URL
  || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  console.error('ENVIRONMENT_FAILURE: M11.1A database tests are local-only.');
  process.exit(1);
}

const LEGACY_PREFIX = 'M11.1A legacy fixture';
const INVALID_PREFIX = 'M11.1A invalid fixture';
let assertions = 0;

function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

async function connect() {
  const client = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
  });
  await client.connect();
  return client;
}

async function runAs(client, accountId, fn) {
  await client.query(`select set_config('request.jwt.claim.sub', $1, false)`, [accountId]);
  await client.query('set role authenticated');
  try {
    return await fn();
  } finally {
    await client.query('reset role');
  }
}

async function expectFailure(fn, message, code) {
  let error = null;
  try {
    await fn();
  } catch (caught) {
    error = caught;
  }
  check(Boolean(error), message);
  if (code) check(error?.code === code, `${message} uses SQLSTATE ${code}`);
  return error;
}

async function expectTransactionFailure(client, fn, message, code) {
  await client.query('begin');
  let error;
  try {
    await fn();
    await client.query('set constraints all immediate');
    await client.query('commit');
  } catch (caught) {
    error = caught;
    await client.query('rollback').catch(() => {});
  }
  check(Boolean(error), message);
  if (code) check(error?.code === code, `${message} uses SQLSTATE ${code}`);
  return error;
}

async function insertAccount(client, label) {
  const accountId = crypto.randomUUID();
  const personId = crypto.randomUUID();
  await client.query(
    `insert into auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values ($1, 'authenticated', 'authenticated', $2, '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, now(), now())`,
    [accountId, `m11-${label}-${accountId}@example.test`],
  );
  await client.query(
    `insert into public.people (id, auth_user_id, display_name, default_language, personal_settings)
     values ($1, $2, $3, 'es-419', '{}'::jsonb)`,
    [personId, accountId, `M11 ${label}`],
  );
  return { accountId, personId };
}

async function insertHousehold(client, owner, label) {
  const householdId = crypto.randomUUID();
  await client.query(
    `insert into public.households (
      id, name, slug, timezone, default_language, config, created_by_person_id
    ) values ($1,$2,$3,'America/Argentina/Buenos_Aires','es-419','{}'::jsonb,$4)`,
    [householdId, `M11 ${label}`, `m11-${label}-${householdId}`, owner.personId],
  );
  return householdId;
}

async function insertMember(client, householdId, account, role, status = 'active') {
  const membershipId = crypto.randomUUID();
  await client.query(
    `insert into public.household_members (
      id, household_id, person_id, role, status, joined_at,
      household_onboarding_status, household_onboarding_completed_at
    ) values ($1,$2,$3,$4,$5,now(),'completed',now())`,
    [membershipId, householdId, account.personId, role, status],
  );
  if (status === 'active') {
    await client.query(
      `update public.people set active_household_id=$1 where id=$2`,
      [householdId, account.personId],
    );
  }
  return membershipId;
}

async function seedLegacy() {
  const client = await connect();
  try {
    await client.query('begin');
    const owner = await insertAccount(client, 'legacy-owner');
    const reviewer = await insertAccount(client, 'legacy-reviewer');
    const householdId = await insertHousehold(client, owner, 'legacy');
    const ownerMemberId = await insertMember(client, householdId, owner, 'coordinator');
    const reviewerMemberId = await insertMember(client, householdId, reviewer, 'adult');

    const rows = [
      ['pending assigned', 'pending', ownerMemberId, false, null, null, null, null],
      ['pending null', 'pending', null, false, null, null, null, null],
      ['completed assigned', 'completed', ownerMemberId, false, ownerMemberId, owner.personId, null, null],
      ['awaiting assigned', 'awaiting_verification', ownerMemberId, true, ownerMemberId, owner.personId, null, null],
      ['verified assigned', 'verified', ownerMemberId, true, ownerMemberId, owner.personId, reviewerMemberId, reviewer.personId],
      ['cancelled null', 'cancelled', null, false, null, null, null, null],
    ];

    for (const [suffix, status, assignee, requiresVerification, completedMember, completedPerson, verifiedMember, verifiedPerson] of rows) {
      await client.query(
        `insert into public.planner_tasks (
          id, household_id, title, status, requires_verification,
          created_by_person_id, created_by_member_id, assigned_to_member_id,
          completed_by_member_id, completed_by_person_id, completed_at,
          verified_by_member_id, verified_by_person_id, verified_at,
          cancelled_at, cancelled_from_status
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          case when $4 in ('completed','awaiting_verification','verified') then now() else null end,
          $11,$12,case when $4='verified' then now() else null end,
          case when $4='cancelled' then now() else null end,
          case when $4='cancelled' then 'pending' else null end
        )`,
        [
          crypto.randomUUID(), householdId, `${LEGACY_PREFIX} ${suffix}`, status,
          requiresVerification, owner.personId, ownerMemberId, assignee,
          completedMember, completedPerson, verifiedMember, verifiedPerson,
        ],
      );
    }
    await client.query('commit');
    console.log(`SEEDED_LEGACY household=${householdId} tasks=${rows.length}`);
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function seedInvalidLegacy(kind) {
  const client = await connect();
  try {
    await client.query('begin');
    const owner = await insertAccount(client, `invalid-${kind}-owner`);
    const other = await insertAccount(client, `invalid-${kind}-other`);
    const householdId = await insertHousehold(client, owner, `invalid-${kind}-primary`);
    const otherHouseholdId = await insertHousehold(client, other, `invalid-${kind}-other`);
    const ownerMemberId = await insertMember(client, householdId, owner, 'coordinator');
    const otherMemberId = await insertMember(client, otherHouseholdId, other, 'coordinator');

    const values = {
      status: 'pending',
      requiresVerification: false,
      creatorMember: ownerMemberId,
      creatorPerson: owner.personId,
      assignee: null,
      completedMember: null,
      completedPerson: null,
      completedAt: null,
      verifiedMember: null,
      verifiedPerson: null,
      verifiedAt: null,
      cancelledAt: null,
      cancelledMember: null,
      cancelledReason: null,
      cancelledFromStatus: null,
      trashedAt: null,
      trashedMember: null,
    };

    if (kind === 'creator-unmappable') values.creatorMember = null;
    if (kind === 'assignee-cross-household') values.assignee = otherMemberId;
    if (kind === 'completion-cross-household') {
      values.status = 'completed';
      values.completedMember = otherMemberId;
      values.completedPerson = other.personId;
      values.completedAt = new Date();
    }
    if (kind === 'verification-cross-household') {
      values.status = 'verified';
      values.requiresVerification = true;
      values.completedMember = ownerMemberId;
      values.completedPerson = owner.personId;
      values.completedAt = new Date();
      values.verifiedMember = otherMemberId;
      values.verifiedPerson = other.personId;
      values.verifiedAt = new Date();
    }
    if (kind === 'cancellation-cross-household') {
      values.status = 'cancelled';
      values.cancelledAt = new Date();
      values.cancelledMember = otherMemberId;
      values.cancelledFromStatus = 'pending';
    }
    if (kind === 'trash-cross-household') {
      values.trashedAt = new Date();
      values.trashedMember = otherMemberId;
    }
    if (kind === 'member-person-mismatch') {
      values.status = 'completed';
      values.completedMember = ownerMemberId;
      values.completedPerson = other.personId;
      values.completedAt = new Date();
    }
    if (kind === 'pending-terminal-metadata') values.completedAt = new Date();
    if (kind === 'completed-inconsistent') values.status = 'completed';
    if (kind === 'awaiting-verification-inconsistent') {
      values.status = 'awaiting_verification';
      values.requiresVerification = true;
      values.completedMember = ownerMemberId;
      values.completedPerson = owner.personId;
      values.completedAt = new Date();
      values.verifiedMember = ownerMemberId;
      values.verifiedPerson = owner.personId;
      values.verifiedAt = new Date();
    }
    if (kind === 'verified-inconsistent') {
      values.status = 'verified';
      values.requiresVerification = true;
      values.completedMember = ownerMemberId;
      values.completedPerson = owner.personId;
      values.completedAt = new Date();
      values.verifiedMember = ownerMemberId;
      values.verifiedPerson = owner.personId;
    }
    if (kind === 'cancelled-inconsistent') {
      values.status = 'cancelled';
      values.cancelledFromStatus = 'pending';
    }

    const supportedKinds = new Set([
      'creator-unmappable',
      'assignee-cross-household',
      'completion-cross-household',
      'verification-cross-household',
      'cancellation-cross-household',
      'trash-cross-household',
      'member-person-mismatch',
      'pending-terminal-metadata',
      'completed-inconsistent',
      'awaiting-verification-inconsistent',
      'verified-inconsistent',
      'cancelled-inconsistent',
    ]);
    if (!supportedKinds.has(kind)) throw new Error(`Unknown invalid legacy fixture kind: ${kind}`);

    await client.query(
      `insert into public.planner_tasks (
        household_id,title,status,requires_verification,
        created_by_person_id,created_by_member_id,assigned_to_member_id,
        completed_by_member_id,completed_by_person_id,completed_at,
        verified_by_member_id,verified_by_person_id,verified_at,
        cancelled_at,cancelled_by_member_id,cancelled_reason,cancelled_from_status,
        trashed_at,trashed_by_member_id
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
      )`,
      [
        householdId, `${INVALID_PREFIX} ${kind}`, values.status, values.requiresVerification,
        values.creatorPerson, values.creatorMember, values.assignee,
        values.completedMember, values.completedPerson, values.completedAt,
        values.verifiedMember, values.verifiedPerson, values.verifiedAt,
        values.cancelledAt, values.cancelledMember, values.cancelledReason,
        values.cancelledFromStatus, values.trashedAt, values.trashedMember,
      ],
    );
    await client.query('commit');
    console.log(`SEEDED_INVALID_LEGACY kind=${kind}`);
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function assertLegacyBackfill(client) {
  const result = await client.query(
    `select
      count(*)::int as tasks,
      count(c.*)::int as configs,
      count(f.*)::int as fulfillments,
      count(*) filter (where c.assignment_kind='legacy_unassigned')::int as ambiguous,
      count(*) filter (where f.inactive_at is not null)::int as inactive
    from public.planner_tasks t
    left join public.planner_task_assignment_configs c on c.task_id=t.id
    left join public.planner_task_fulfillments f on f.task_id=t.id and f.retired_at is null
    where t.title like $1`,
    [`${LEGACY_PREFIX}%`],
  );
  const row = result.rows[0];
  check(row.tasks === 6, 'legacy fixture contains every requested status variant');
  check(row.configs === 6, 'legacy backfill creates one assignment config per Task');
  check(row.fulfillments === 6, 'legacy backfill creates one current fulfillment per Task');
  check(row.ambiguous === 2, 'legacy NULL assignees remain explicitly ambiguous');
  check(row.inactive === 1, 'cancelled legacy Task has no active obligation');

  const mapped = await client.query(
    `select t.status as task_status, f.status as fulfillment_status,
      t.completed_by_member_id is not distinct from f.completed_by_member_id as completed_actor_preserved,
      t.verified_by_member_id is not distinct from f.verified_by_member_id as verified_actor_preserved
    from public.planner_tasks t
    join public.planner_task_fulfillments f on f.task_id=t.id and f.retired_at is null
    where t.title like $1 order by t.title`,
    [`${LEGACY_PREFIX}%`],
  );
  check(mapped.rows.every((item) => item.completed_actor_preserved), 'completion actors survive backfill');
  check(mapped.rows.every((item) => item.verified_actor_preserved), 'verification actors survive backfill');
  check(
    mapped.rows.filter((item) => item.task_status !== 'cancelled')
      .every((item) => item.task_status === item.fulfillment_status),
    'all non-cancelled legacy statuses map explicitly',
  );

  const report = (await client.query(
    `select public.planner_m11_1a_backfill_report() as report`,
  )).rows[0].report;
  check(report.tasks_total === 6 && report.legacy_unassigned === 2, 'backfill report preserves total and legacy_unassigned counts');
  const blockingCategories = [
    'assignee_cross_household',
    'completion_actor_cross_household',
    'verification_actor_cross_household',
    'cancellation_actor_cross_household',
    'trash_actor_cross_household',
    'member_person_mismatch',
    'pending_terminal_metadata',
    'completed_inconsistent',
    'awaiting_verification_inconsistent',
    'verified_inconsistent',
    'cancelled_inconsistent',
    'derived_household_inconsistent',
    'count_inconsistent',
    'blocking_rows',
  ];
  check(
    blockingCategories.every((category) => report[category] === 0),
    `valid backfill reports zero for every blocking category: ${JSON.stringify(report)}`,
  );
}

async function createTaskAs(client, actor, householdId, memberId, title, options = {}) {
  return runAs(client, actor.accountId, async () => {
    const result = await client.query(
      `insert into public.planner_tasks (
        household_id, title, requires_verification, created_by_person_id,
        created_by_member_id, assigned_to_member_id
      ) values ($1,$2,$3,$4,$5,$6) returning *`,
      [householdId, title, Boolean(options.requiresVerification), actor.personId, memberId, options.assignedTo ?? null],
    );
    return result.rows[0];
  });
}

async function insertTaskWithProtectedMetadataAs(
  client, actor, householdId, memberId, title, metadata,
) {
  const fields = Object.keys(metadata);
  const placeholders = fields.map((_, index) => `$${index + 6}`);
  return runAs(client, actor.accountId, () => client.query(
    `insert into public.planner_tasks (
       household_id,title,created_by_person_id,created_by_member_id,${fields.join(',')}
     ) values ($1,$2,$3,$4,${placeholders.join(',')}) returning *`,
    [householdId, title, actor.personId, memberId, ...Object.values(metadata)],
  ));
}

async function plannerFootprint(client, householdId) {
  return (await client.query(
    `select
      (select count(*) from public.planner_tasks where household_id=$1)::int as tasks,
      (select count(*) from public.planner_task_assignment_configs where household_id=$1)::int as configs,
      (select count(*) from public.planner_task_assignees where household_id=$1)::int as assignees,
      (select count(*) from public.planner_task_fulfillments where household_id=$1)::int as fulfillments,
      (select count(*) from public.audit_events where household_id=$1)::int as audits`,
    [householdId],
  )).rows[0];
}

async function setPermissionOverride(client, householdId, capability, role, value) {
  const current = (await client.query(
    `select config from public.households where id=$1`, [householdId],
  )).rows[0].config ?? {};
  const config = structuredClone(current);
  config.permissions ??= {};
  config.permissions[capability] ??= {};
  config.permissions[capability][role] = value;
  await client.query(`update public.households set config=$1::jsonb where id=$2`, [JSON.stringify(config), householdId]);
}

async function completeAs(client, actor, householdId, taskId, version, memberId, spoof = null) {
  return runAs(client, actor.accountId, async () => {
    const result = await client.query(
      `select public.complete_planner_task_with_audit($1,$2,$3,$4,$5,$6,$7) as result`,
      [
        householdId, taskId, version,
        spoof?.memberId ?? memberId,
        spoof?.accountId ?? actor.accountId,
        `req-${crypto.randomUUID()}`, `mut-${crypto.randomUUID()}`,
      ],
    );
    return result.rows[0].result;
  });
}

async function verifyAs(client, actor, householdId, taskId, version) {
  return runAs(client, actor.accountId, async () => {
    const result = await client.query(
      `select public.verify_planner_task_fulfillment_with_audit($1,$2,$3,$4,$5) as result`,
      [householdId, taskId, version, `req-${crypto.randomUUID()}`, `mut-${crypto.randomUUID()}`],
    );
    return result.rows[0].result;
  });
}

async function cleanupFixture(client, householdIds, accounts) {
  const accountIds = accounts.map((item) => item.accountId);
  await client.query('begin');
  try {
    await client.query('set local session_replication_role=replica');
    await client.query(`delete from public.outbox_events where household_id = any($1::uuid[])`, [householdIds]);
    await client.query(`delete from public.audit_events where household_id = any($1::uuid[])`, [householdIds]);
    await client.query('set local session_replication_role=origin');
    await client.query(`delete from public.planner_tasks where household_id = any($1::uuid[])`, [householdIds]);
    await client.query(`update public.people set active_household_id=null where auth_user_id = any($1::uuid[])`, [accountIds]);
    await client.query(`delete from public.households where id = any($1::uuid[])`, [householdIds]);
    await client.query(`delete from public.people where auth_user_id = any($1::uuid[])`, [accountIds]);
    await client.query(`delete from auth.users where id = any($1::uuid[])`, [accountIds]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

async function assertFixtureClean(client, householdIds, accounts) {
  const accountIds = accounts.map((item) => item.accountId);
  const result = await client.query(
    `select
      (select count(*) from public.households where id=any($1::uuid[]))::int as households,
      (select count(*) from public.planner_tasks where household_id=any($1::uuid[]))::int as tasks,
      (select count(*) from public.audit_events where household_id=any($1::uuid[]))::int as audits,
      (select count(*) from public.people where auth_user_id=any($2::uuid[]))::int as people,
      (select count(*) from auth.users where id=any($2::uuid[]))::int as users`,
    [householdIds, accountIds],
  );
  check(
    Object.values(result.rows[0]).every((value) => value === 0),
    `fixture cleanup leaves no household, Task, audit, person, or auth rows: ${JSON.stringify(result.rows[0])}`,
  );
}

async function assertLegacyAndClean() {
  const client = await connect();
  try {
    await assertLegacyBackfill(client);
    const fixture = await client.query(
      `select distinct t.household_id, p.auth_user_id
       from public.planner_tasks t
       join public.household_members hm on hm.household_id=t.household_id
       join public.people p on p.id=hm.person_id
       where t.title like $1`,
      [`${LEGACY_PREFIX}%`],
    );
    const householdIds = [...new Set(fixture.rows.map((row) => row.household_id))];
    const accounts = [...new Set(fixture.rows.map((row) => row.auth_user_id))]
      .map((accountId) => ({ accountId }));
    await cleanupFixture(client, householdIds, accounts);
    await assertFixtureClean(client, householdIds, accounts);
    console.log(`\nM11.1A BACKFILL: ${assertions} assertions passed.`);
  } finally {
    await client.end();
  }
}

async function assertInvalidFixturesClean() {
  const client = await connect();
  try {
    const row = (await client.query(
      `select
        (select count(*) from public.planner_tasks where title like $1)::int as tasks,
        (select count(*) from public.households where name like 'M11 invalid-%')::int as households,
        (select count(*) from public.people where display_name like 'M11 invalid-%')::int as people,
        (select count(*) from auth.users where email like 'm11-invalid-%')::int as users`,
      [`${INVALID_PREFIX}%`],
    )).rows[0];
    check(Object.values(row).every((value) => value === 0), `invalid legacy reset leaves zero fixtures: ${JSON.stringify(row)}`);
  } finally {
    await client.end();
  }
}

async function assertGlobalClean() {
  const client = await connect();
  try {
    const row = (await client.query(
      `select
        (select count(*) from public.planner_tasks where title like 'M11%')::int as tasks,
        (select count(*) from public.planner_task_assignment_configs)::int as configs,
        (select count(*) from public.planner_task_assignees)::int as assignees,
        (select count(*) from public.planner_task_fulfillments)::int as fulfillments,
        (select count(*) from public.households where name like 'M11%')::int as households,
        (select count(*) from public.people where display_name like 'M11%')::int as people,
        (select count(*) from auth.users where email like 'm11-%')::int as users,
        (select count(*) from public.audit_events)::int as audits,
        (select count(*) from public.outbox_events)::int as outbox,
        exists (
          select 1 from supabase_migrations.schema_migrations
          where version='20260722010000'
        ) as target_migration`,
    )).rows[0];
    check(
      row.tasks === 0 && row.configs === 0 && row.assignees === 0
        && row.fulfillments === 0 && row.households === 0 && row.people === 0
        && row.users === 0 && row.audits === 0 && row.outbox === 0
        && row.target_migration === true,
      `clean reconstruction contains no M11.1A fixtures and includes target migration: ${JSON.stringify(row)}`,
    );
  } finally {
    await client.end();
  }
}

async function runDatabaseTests() {
  const client = await connect();
  let households = [];
  let accounts = [];
  try {
    const owner = await insertAccount(client, 'owner');
    const adult = await insertAccount(client, 'adult');
    const adolescent = await insertAccount(client, 'adolescent');
    const guest = await insertAccount(client, 'guest');
    const outsider = await insertAccount(client, 'outsider');
    const suspended = await insertAccount(client, 'suspended');
    const noMembership = await insertAccount(client, 'no-membership');
    accounts = [owner, adult, adolescent, guest, outsider, suspended, noMembership];

    const householdId = await insertHousehold(client, owner, 'primary');
    const otherHouseholdId = await insertHousehold(client, outsider, 'other');
    households = [householdId, otherHouseholdId];
    const ownerMemberId = await insertMember(client, householdId, owner, 'coordinator');
    const adultMemberId = await insertMember(client, householdId, adult, 'adult');
    const adolescentMemberId = await insertMember(client, householdId, adolescent, 'adolescent');
    const guestMemberId = await insertMember(client, householdId, guest, 'guest');
    const outsiderMemberId = await insertMember(client, otherHouseholdId, outsider, 'coordinator');
    await insertMember(client, householdId, suspended, 'adult', 'suspended');

    await client.query(
      `update public.households
       set config = jsonb_build_object('permissions', jsonb_build_object(
         'planner.view', jsonb_build_object('guest', false),
         'task.complete_assigned', jsonb_build_object('guest', true),
         'task.edit_own', jsonb_build_object('guest', false)
       ))
       where id=$1`,
      [householdId],
    );

    const privileges = await client.query(
      `select
        has_table_privilege('authenticated','public.planner_task_assignment_configs','INSERT') as config_insert,
        has_table_privilege('authenticated','public.planner_task_assignees','UPDATE') as assignee_update,
        has_table_privilege('authenticated','public.planner_task_fulfillments','INSERT') as fulfillment_insert`,
    );
    check(Object.values(privileges.rows[0]).every((value) => value === false), 'authenticated clients cannot write canonical slice tables directly');

    const anyoneTask = await createTaskAs(client, owner, householdId, ownerMemberId, 'M11 anyone');
    const anyoneConfig = await client.query(
      `select assignment_kind, legacy_backfill from public.planner_task_assignment_configs where task_id=$1`,
      [anyoneTask.id],
    );
    check(anyoneConfig.rows[0].assignment_kind === 'anyone', 'new V0 NULL assignment maps to anyone');
    check(anyoneConfig.rows[0].legacy_backfill === false, 'new clients cannot create legacy_unassigned');
    const cleanFoundation = (await client.query(
      `select t.status,t.cancelled_at,t.cancelled_by_member_id,t.cancelled_reason,
        t.cancelled_from_status,t.trashed_at,t.trashed_by_member_id,
        f.version as fulfillment_version
       from public.planner_tasks t
       join public.planner_task_fulfillments f on f.task_id=t.id and f.retired_at is null
       where t.id=$1`,
      [anyoneTask.id],
    )).rows[0];
    check(
      cleanFoundation.status === 'pending'
        && cleanFoundation.cancelled_at === null
        && cleanFoundation.cancelled_by_member_id === null
        && cleanFoundation.cancelled_reason === null
        && cleanFoundation.cancelled_from_status === null
        && cleanFoundation.trashed_at === null
        && cleanFoundation.trashed_by_member_id === null
        && cleanFoundation.fulfillment_version === 1,
      'clean pending Task bootstraps canonical fulfillment at version 1',
    );

    const protectedInsertCases = [
      ['cancelled_at', { cancelled_at: new Date() }],
      ['cancelled_by_member_id own', { cancelled_by_member_id: ownerMemberId }],
      ['cancelled_by_member_id same household', { cancelled_by_member_id: adultMemberId }],
      ['cancelled_reason', { cancelled_reason: 'spoofed reason' }],
      ['cancelled_from_status', { cancelled_from_status: 'pending' }],
      ['trashed_at', { trashed_at: new Date() }],
      ['trashed_by_member_id own', { trashed_by_member_id: ownerMemberId }],
      ['trashed_by_member_id same household', { trashed_by_member_id: adultMemberId }],
      ['combined lifecycle metadata', {
        cancelled_at: new Date(),
        cancelled_by_member_id: adultMemberId,
        cancelled_reason: 'spoofed combination',
        cancelled_from_status: 'pending',
        trashed_at: new Date(),
        trashed_by_member_id: adultMemberId,
      }],
    ];
    for (const [label, metadata] of protectedInsertCases) {
      const before = await plannerFootprint(client, householdId);
      await expectFailure(
        () => insertTaskWithProtectedMetadataAs(
          client, owner, householdId, ownerMemberId, `M11 protected insert ${label}`, metadata,
        ),
        `authenticated Task INSERT rejects ${label}`,
      );
      const after = await plannerFootprint(client, householdId);
      check(
        JSON.stringify(after) === JSON.stringify(before),
        `${label} rejection creates no Task, config, assignee, fulfillment, or audit`,
      );
    }

    await expectFailure(
      () => createTaskAs(client, owner, householdId, ownerMemberId, 'M11 cross household insert', { assignedTo: outsiderMemberId }),
      'Task INSERT rejects an assignee from another household',
    );
    await expectFailure(
      () => runAs(client, owner.accountId, () => client.query(
        `update public.planner_tasks set assigned_to_member_id=$1 where id=$2`,
        [outsiderMemberId, anyoneTask.id],
      )),
      'Task UPDATE rejects an assignee from another household',
    );
    await expectFailure(
      () => runAs(client, owner.accountId, () => client.query(
        `update public.planner_tasks set household_id=$1 where id=$2`,
        [otherHouseholdId, anyoneTask.id],
      )),
      'Task household_id is immutable',
      '42501',
    );
    await expectTransactionFailure(
      client,
      () => client.query(
        `update public.planner_task_assignment_configs set household_id=$1 where task_id=$2`,
        [otherHouseholdId, anyoneTask.id],
      ),
      'assignment config cannot disagree with Task household',
      '23503',
    );
    await expectTransactionFailure(
      client,
      () => client.query(
        `insert into public.planner_task_assignees(task_id,household_id,member_id)
         values ($1,$2,$3)`,
        [anyoneTask.id, householdId, outsiderMemberId],
      ),
      'canonical assignee must belong to Task household',
      '23503',
    );
    await expectTransactionFailure(
      client,
      () => client.query(
        `update public.planner_task_fulfillments set household_id=$1
         where task_id=$2 and retired_at is null`,
        [otherHouseholdId, anyoneTask.id],
      ),
      'fulfillment cannot disagree with Task household',
      '23503',
    );
    await expectTransactionFailure(
      client,
      () => client.query(
        `update public.planner_task_fulfillments
         set status='completed', completed_by_member_id=$1,
             completed_by_person_id=$2, completed_at=now()
         where task_id=$3 and retired_at is null`,
        [adultMemberId, owner.personId, anyoneTask.id],
      ),
      'fulfillment member/person actors must identify the same membership',
      '23503',
    );
    await expectTransactionFailure(
      client,
      () => client.query(
        `update public.planner_task_fulfillments set completed_at=now()
         where task_id=$1 and retired_at is null`,
        [anyoneTask.id],
      ),
      'pending fulfillment cannot carry terminal timestamps',
      '23514',
    );
    await expectTransactionFailure(
      client,
      () => client.query(
        `insert into public.planner_task_fulfillments(
           task_id,household_id,fulfillment_scope,responsible_member_id
         ) values ($1,$2,'individual',$3)`,
        [anyoneTask.id, householdId, ownerMemberId],
      ),
      'a Task cannot persist mixed shared and individual current fulfillments',
      '23514',
    );

    const guestOwnedTask = (await client.query(
      `insert into public.planner_tasks(
        household_id,title,created_by_person_id,created_by_member_id,assigned_to_member_id
       ) values ($1,'M11 guest owned',$2,$3,$3) returning *`,
      [householdId, guest.personId, guestMemberId],
    )).rows[0];
    const guestInvisible = await runAs(client, guest.accountId, () => client.query(
      `select count(*)::int as count from public.planner_tasks where household_id=$1`,
      [householdId],
    ));
    check(guestInvisible.rows[0].count === 0, 'planner_tasks SELECT requires planner.view');
    await expectFailure(
      () => completeAs(
        client, guest, householdId, guestOwnedTask.id, guestOwnedTask.version, guestMemberId,
      ),
      'RPC rejects completion when planner.view=false and task.complete_assigned=true',
      '42501',
    );
    const deniedOwnUpdate = await runAs(client, guest.accountId, () => client.query(
      `update public.planner_tasks set title='forbidden own edit' where id=$1`,
      [guestOwnedTask.id],
    ));
    check(deniedOwnUpdate.rowCount === 0, 'own Task UPDATE requires task.edit_own');
    await expectFailure(
      () => runAs(client, adolescent.accountId, () => client.query(
        `update public.planner_tasks set title='forbidden foreign edit' where id=$1`,
        [anyoneTask.id],
      )),
      'foreign Task UPDATE requires task.edit_any',
      '42501',
    );

    const reassigned = await runAs(client, owner.accountId, () => client.query(
      `update public.planner_tasks set assigned_to_member_id=$1 where id=$2 returning *`,
      [adultMemberId, anyoneTask.id],
    ));
    const reassignedShape = await client.query(
      `select c.assignment_kind, a.member_id, f.fulfillment_scope, f.responsible_member_id
       from public.planner_task_assignment_configs c
       join public.planner_task_assignees a on a.task_id=c.task_id and a.revoked_at is null
       join public.planner_task_fulfillments f on f.task_id=c.task_id and f.retired_at is null
       where c.task_id=$1`,
      [anyoneTask.id],
    );
    check(
      reassignedShape.rows[0].assignment_kind === 'members'
        && reassignedShape.rows[0].member_id === adultMemberId
        && reassignedShape.rows[0].fulfillment_scope === 'shared'
        && reassignedShape.rows[0].responsible_member_id === null,
      'V0 assignment edit synchronizes canonical assignment and pending fulfillment',
    );

    const cancelled = await runAs(client, owner.accountId, () => client.query(
      `update public.planner_tasks
       set status='cancelled', cancelled_at=now(), cancelled_by_member_id=$1,
           cancelled_from_status='pending'
       where id=$2 returning *`,
      [ownerMemberId, anyoneTask.id],
    ));
    const cancelledFulfillment = await client.query(
      `select inactive_at from public.planner_task_fulfillments where task_id=$1 and retired_at is null`,
      [anyoneTask.id],
    );
    check(cancelled.rows[0].status === 'cancelled' && Boolean(cancelledFulfillment.rows[0].inactive_at), 'V0 cancel keeps obligation but makes it inactive');
    const reactivated = await runAs(client, owner.accountId, () => client.query(
      `update public.planner_tasks
       set status='pending', cancelled_at=null, cancelled_by_member_id=null, cancelled_from_status=null
       where id=$1 returning *`,
      [anyoneTask.id],
    ));
    const reactivatedFulfillment = await client.query(
      `select inactive_at from public.planner_task_fulfillments where task_id=$1 and retired_at is null`,
      [anyoneTask.id],
    );
    check(reactivated.rows[0].status === 'pending' && reactivatedFulfillment.rows[0].inactive_at === null, 'V0 reactivate restores the same obligation');
    const trashed = await runAs(client, owner.accountId, () => client.query(
      `update public.planner_tasks set trashed_at=now(), trashed_by_member_id=$1 where id=$2 returning *`,
      [ownerMemberId, anyoneTask.id],
    ));
    const trashedFulfillment = await client.query(
      `select id,status,version from public.planner_task_fulfillments
       where task_id=$1 and retired_at is null`,
      [anyoneTask.id],
    );
    const trashedCompletion = await completeAs(
      client, adult, householdId, anyoneTask.id, trashed.rows[0].version, adultMemberId,
    );
    check(trashedCompletion.outcome === 'not_found', 'trashed Task cannot be completed operationally');
    const restored = await runAs(client, owner.accountId, () => client.query(
      `update public.planner_tasks set trashed_at=null, trashed_by_member_id=null where id=$1 returning *`,
      [anyoneTask.id],
    ));
    check(Boolean(trashed.rows[0].trashed_at) && restored.rows[0].trashed_at === null, 'V0 trash and restore remain compatible');
    const restoredFulfillment = await client.query(
      `select id,status,version from public.planner_task_fulfillments
       where task_id=$1 and retired_at is null`,
      [anyoneTask.id],
    );
    check(
      JSON.stringify(restoredFulfillment.rows[0]) === JSON.stringify(trashedFulfillment.rows[0]),
      'trash/restore preserves the canonical fulfillment unchanged',
    );

    const assignedTask = await createTaskAs(
      client, owner, householdId, ownerMemberId, 'M11 assigned', { assignedTo: adultMemberId },
    );
    const assignedShape = await client.query(
      `select c.assignment_kind, c.fulfillment_mode, f.fulfillment_scope, f.responsible_member_id
       from public.planner_task_assignment_configs c
       join public.planner_task_fulfillments f on f.task_id=c.task_id and f.retired_at is null
       where c.task_id=$1`,
      [assignedTask.id],
    );
    check(
      assignedShape.rows[0].assignment_kind === 'members'
        && assignedShape.rows[0].fulfillment_mode === 'shared_once'
        && assignedShape.rows[0].fulfillment_scope === 'shared'
        && assignedShape.rows[0].responsible_member_id === null,
      'members + shared_once creates one shared fulfillment',
    );

    const completionParityTask = await createTaskAs(
      client, owner, householdId, ownerMemberId, 'M11 completion capability parity',
      { assignedTo: adultMemberId },
    );
    await setPermissionOverride(client, householdId, 'planner.view', 'adult', true);
    await setPermissionOverride(client, householdId, 'task.complete_assigned', 'adult', false);
    await expectFailure(
      () => completeAs(
        client, adult, householdId, completionParityTask.id,
        completionParityTask.version, adultMemberId,
      ),
      'RPC rejects completion when planner.view=true and task.complete_assigned=false',
      '42501',
    );
    await setPermissionOverride(client, householdId, 'task.complete_assigned', 'adult', true);
    const allowedCompletion = await completeAs(
      client, adult, householdId, completionParityTask.id,
      completionParityTask.version, adultMemberId,
    );
    check(
      allowedCompletion.outcome === 'updated',
      'RPC allows completion when planner.view=true and task.complete_assigned=true',
    );

    await expectFailure(
      () => completeAs(client, guest, householdId, assignedTask.id, assignedTask.version, guestMemberId),
      'unassigned guest cannot fulfill another member obligation',
      '42501',
    );
    await expectFailure(
      () => completeAs(
        client, adult, householdId, assignedTask.id, assignedTask.version, adultMemberId,
        { memberId: ownerMemberId, accountId: adult.accountId },
      ),
      'completion rejects actor membership spoofing',
      '42501',
    );

    const completed = await completeAs(client, adult, householdId, assignedTask.id, assignedTask.version, adultMemberId);
    check(completed.outcome === 'updated' && completed.task.status === 'completed', 'assigned member completes through canonical fulfillment');
    check(Boolean(completed.fulfillment_id && completed.audit_event_id), 'completion is atomic with fulfillment and durable audit');
    const completedCount = await client.query(
      `select count(*)::int as count from public.planner_task_fulfillments where task_id=$1 and retired_at is null`,
      [assignedTask.id],
    );
    check(completedCount.rows[0].count === 1, 'completion does not duplicate fulfillments');

    await expectFailure(
      () => runAs(client, adult.accountId, () => client.query(
        `update public.planner_tasks set status='pending', completed_by_member_id=null,
           completed_by_person_id=null, completed_at=null where id=$1`,
        [assignedTask.id],
      )),
      'completed to pending cannot be written directly',
      '42501',
    );

    const historyBefore = await client.query(
      `select jsonb_build_object(
        'task_assignee',t.assigned_to_member_id,
        'config',to_jsonb(c),
        'assignees',(select jsonb_agg(to_jsonb(a) order by a.id) from public.planner_task_assignees a where a.task_id=t.id),
        'fulfillments',(select jsonb_agg(to_jsonb(f) order by f.id) from public.planner_task_fulfillments f where f.task_id=t.id)
       ) as snapshot
       from public.planner_tasks t
       join public.planner_task_assignment_configs c on c.task_id=t.id
       where t.id=$1`,
      [assignedTask.id],
    );
    const historyError = await expectFailure(
      () => runAs(client, owner.accountId, () => client.query(
        `update public.planner_tasks set assigned_to_member_id=$1 where id=$2`,
        [ownerMemberId, assignedTask.id],
      )),
      'assignment change with operational history is rejected atomically',
      'P0001',
    );
    check(
      `${historyError.message} ${historyError.detail ?? ''}`.includes('assignment_history_requires_explicit_transition'),
      'historical assignment rejection exposes the stable transition code',
    );
    const historyAfter = await client.query(
      `select jsonb_build_object(
        'task_assignee',t.assigned_to_member_id,
        'config',to_jsonb(c),
        'assignees',(select jsonb_agg(to_jsonb(a) order by a.id) from public.planner_task_assignees a where a.task_id=t.id),
        'fulfillments',(select jsonb_agg(to_jsonb(f) order by f.id) from public.planner_task_fulfillments f where f.task_id=t.id)
       ) as snapshot
       from public.planner_tasks t
       join public.planner_task_assignment_configs c on c.task_id=t.id
       where t.id=$1`,
      [assignedTask.id],
    );
    check(
      JSON.stringify(historyAfter.rows[0].snapshot) === JSON.stringify(historyBefore.rows[0].snapshot),
      'failed historical reassignment preserves Task, config, assignees, and fulfillments exactly',
    );

    await expectFailure(
      () => runAs(client, adult.accountId, () => client.query(
        `update public.planner_tasks set completed_by_member_id=$1 where id=$2`,
        [ownerMemberId, anyoneTask.id],
      )),
      'direct Supabase actor spoofing is rejected',
      '42501',
    );

    const verifyTask = await createTaskAs(
      client, owner, householdId, ownerMemberId, 'M11 verify',
      { assignedTo: adultMemberId, requiresVerification: true },
    );
    const awaiting = await completeAs(client, adult, householdId, verifyTask.id, verifyTask.version, adultMemberId);
    check(awaiting.task.status === 'awaiting_verification', 'requires_verification projects awaiting_verification to V0');
    const selfVerify = await verifyAs(client, adult, householdId, verifyTask.id, awaiting.task.version);
    check(selfVerify.outcome === 'self_verification', 'completion actor cannot verify own fulfillment');
    await setPermissionOverride(client, householdId, 'planner.view', 'coordinator', false);
    await setPermissionOverride(client, householdId, 'task.verify', 'coordinator', true);
    await expectFailure(
      () => verifyAs(client, owner, householdId, verifyTask.id, awaiting.task.version),
      'RPC rejects verification when planner.view=false and task.verify=true',
      '42501',
    );
    await setPermissionOverride(client, householdId, 'planner.view', 'coordinator', true);
    await setPermissionOverride(client, householdId, 'task.verify', 'coordinator', false);
    await expectFailure(
      () => verifyAs(client, owner, householdId, verifyTask.id, awaiting.task.version),
      'RPC rejects verification when planner.view=true and task.verify=false',
      '42501',
    );
    await setPermissionOverride(client, householdId, 'task.verify', 'coordinator', true);
    const verified = await verifyAs(client, owner, householdId, verifyTask.id, awaiting.task.version);
    check(
      verified.outcome === 'updated' && verified.task.status === 'verified',
      'RPC allows verification when planner.view=true and task.verify=true',
    );
    check(Boolean(verified.audit_event_id), 'verification records durable audit in the same transaction');
    await expectFailure(
      () => runAs(client, owner.accountId, () => client.query(
        `update public.planner_tasks set status='pending', completed_by_member_id=null,
           completed_by_person_id=null, completed_at=null, verified_by_member_id=null,
           verified_by_person_id=null, verified_at=null where id=$1`,
        [verifyTask.id],
      )),
      'verified to pending cannot be written directly',
      '42501',
    );
    const staleVerify = await verifyAs(client, owner, householdId, verifyTask.id, awaiting.task.version);
    check(staleVerify.outcome === 'version_conflict', 'stale verification version is rejected');

    const raceTask = await createTaskAs(
      client, owner, householdId, ownerMemberId, 'M11 complete verify race',
      { assignedTo: adultMemberId, requiresVerification: true },
    );
    const raceAwaiting = await completeAs(client, adult, householdId, raceTask.id, raceTask.version, adultMemberId);
    const raceCompleteClient = await connect();
    const raceVerifyClient = await connect();
    try {
      const raceOutcomes = await Promise.all([
        completeAs(raceCompleteClient, adult, householdId, raceTask.id, raceAwaiting.task.version, adultMemberId),
        verifyAs(raceVerifyClient, owner, householdId, raceTask.id, raceAwaiting.task.version),
      ]);
      check(raceOutcomes.filter((item) => item.outcome === 'updated').length === 1, 'concurrent complete and verify produce one state transition');
      check(
        raceOutcomes.every((item) => ['updated', 'noop', 'version_conflict'].includes(item.outcome)),
        'concurrent complete and verify resolve without invalid intermediate state',
      );
    } finally {
      await raceCompleteClient.end();
      await raceVerifyClient.end();
    }

    const crossRead = await runAs(client, outsider.accountId, () => client.query(
      `select count(*)::int as count from public.planner_task_fulfillments where household_id=$1`,
      [householdId],
    ));
    check(crossRead.rows[0].count === 0, 'RLS prevents cross-household fulfillment reads');
    const suspendedRead = await runAs(client, suspended.accountId, () => client.query(
      `select count(*)::int as count from public.planner_task_fulfillments where household_id=$1`,
      [householdId],
    ));
    check(suspendedRead.rows[0].count === 0, 'RLS rejects suspended membership reads');
    const noMembershipRead = await runAs(client, noMembership.accountId, () => client.query(
      `select count(*)::int as count from public.planner_task_fulfillments where household_id=$1`,
      [householdId],
    ));
    check(noMembershipRead.rows[0].count === 0, 'RLS rejects authenticated users without membership');
    await expectFailure(
      () => completeAs(client, outsider, householdId, anyoneTask.id, anyoneTask.version, outsiderMemberId),
      'other-household actor cannot complete Task',
      '42501',
    );

    const sharedTask = await createTaskAs(
      client, owner, householdId, ownerMemberId, 'M11 shared concurrency', { assignedTo: adultMemberId },
    );
    await client.query(
      `insert into public.planner_task_assignees (task_id, household_id, member_id) values ($1,$2,$3)`,
      [sharedTask.id, householdId, ownerMemberId],
    );
    const sharedCount = await client.query(
      `select count(*)::int as count, min(version)::int as version
       from public.planner_task_fulfillments where task_id=$1 and retired_at is null`,
      [sharedTask.id],
    );
    check(sharedCount.rows[0].count === 1, 'several people shared_once creates exactly one shared fulfillment');
    const sharedAuditBefore = await client.query(
      `select count(*)::int as count from public.audit_events
       where aggregate_id=$1 and action='task.completed'`,
      [sharedTask.id],
    );

    const concurrentA = await connect();
    const concurrentB = await connect();
    try {
      const outcomes = await Promise.all([
        completeAs(concurrentA, owner, householdId, sharedTask.id, sharedTask.version, ownerMemberId),
        completeAs(concurrentB, adult, householdId, sharedTask.id, sharedTask.version, adultMemberId),
      ]);
      check(outcomes.filter((item) => item.outcome === 'updated').length === 1, 'concurrent shared completion has exactly one winner');
      check(outcomes.filter((item) => item.outcome === 'noop').length === 1, 'equivalent concurrent shared completion returns one silent noop');
    } finally {
      await concurrentA.end();
      await concurrentB.end();
    }
    const sharedFinal = await client.query(
      `select t.version as task_version,t.completed_by_member_id,
        f.version as fulfillment_version,f.completed_by_member_id as fulfillment_actor,
        count(a.id)::int as audit_count
       from public.planner_tasks t
       join public.planner_task_fulfillments f on f.task_id=t.id and f.retired_at is null
       left join public.audit_events a on a.aggregate_id=t.id and a.action='task.completed'
       where t.id=$1
       group by t.version,t.completed_by_member_id,f.version,f.completed_by_member_id`,
      [sharedTask.id],
    );
    check(sharedFinal.rows[0].task_version === sharedTask.version + 1, 'shared concurrency increments Task version exactly once');
    check(sharedFinal.rows[0].fulfillment_version === sharedCount.rows[0].version + 1, 'shared concurrency increments fulfillment version exactly once');
    check(sharedFinal.rows[0].audit_count === sharedAuditBefore.rows[0].count + 1, 'shared concurrency writes exactly one completion audit');
    check(
      sharedFinal.rows[0].completed_by_member_id === sharedFinal.rows[0].fulfillment_actor,
      'shared concurrency preserves one canonical winning actor in Task and fulfillment',
    );

    const eachTask = await createTaskAs(
      client, owner, householdId, ownerMemberId, 'M11 each person', { assignedTo: adultMemberId },
    );
    await client.query(
      `insert into public.planner_task_assignees (task_id, household_id, member_id) values ($1,$2,$3)`,
      [eachTask.id, householdId, ownerMemberId],
    );
    await expectTransactionFailure(
      client,
      async () => {
        await client.query(
          `update public.planner_task_assignment_configs set fulfillment_mode='each_person' where task_id=$1`,
          [eachTask.id],
        );
        await client.query(
          `update public.planner_task_fulfillments set retired_at=now()
           where task_id=$1 and retired_at is null`,
          [eachTask.id],
        );
        await client.query(
          `insert into public.planner_task_fulfillments(
             task_id,household_id,fulfillment_scope,responsible_member_id
           ) values ($1,$2,'individual',$3)`,
          [eachTask.id, householdId, adultMemberId],
        );
      },
      'each_person rejects fewer current fulfillments than active assignees',
      '23514',
    );
    await client.query('begin');
    try {
      await client.query(
        `update public.planner_task_assignment_configs set fulfillment_mode='each_person' where task_id=$1`,
        [eachTask.id],
      );
      await client.query(
        `update public.planner_task_fulfillments set retired_at=now()
         where task_id=$1 and retired_at is null`,
        [eachTask.id],
      );
      await client.query(`select public.planner_create_current_task_fulfillments($1)`, [eachTask.id]);
      await client.query('set constraints all immediate');
      await client.query('commit');
    } catch (error) {
      await client.query('rollback').catch(() => {});
      throw error;
    }
    const eachCount = await client.query(
      `select count(*)::int as count from public.planner_task_fulfillments where task_id=$1 and retired_at is null`,
      [eachTask.id],
    );
    check(eachCount.rows[0].count === 2, 'each_person creates one fulfillment per concrete member');
    const firstEach = await completeAs(client, adult, householdId, eachTask.id, eachTask.version, adultMemberId);
    check(firstEach.task.status === 'pending', 'partial each_person completion keeps V0 projection pending');
    const secondEach = await completeAs(client, owner, householdId, eachTask.id, firstEach.task.version, ownerMemberId);
    check(secondEach.task.status === 'completed', 'all each_person obligations completed project completed');
    const liveReport = (await client.query(
      `select public.planner_m11_1a_backfill_report() as report`,
    )).rows[0].report;
    check(
      liveReport.blocking_rows === 0 && liveReport.count_inconsistent === 0,
      `backfill report does not flag valid live each_person state: ${JSON.stringify(liveReport)}`,
    );

    const goal = (await client.query(
      `insert into public.planner_goals (
        household_id,title,visibility,category,status,created_by_member_id,trashed_at,trashed_by_member_id
      ) values ($1,'M11 restore goal','household','home','active',$2,now(),$2) returning *`,
      [householdId, ownerMemberId],
    )).rows[0];
    await expectFailure(
      () => runAs(client, owner.accountId, () => client.query(
        `select public.restore_goal_rpc($1,$2,$3)`, [goal.id, goal.version, adultMemberId],
      )),
      'Goal restore rejects spoofed member id',
      '42501',
    );
    const restoredGoal = await runAs(client, owner.accountId, () => client.query(
      `select public.restore_goal_rpc($1,$2,null) as result`, [goal.id, goal.version],
    ));
    check(restoredGoal.rows[0].result.success === true, 'Goal restore derives authenticated actor internally');
    check(restoredGoal.rows[0].result.version === goal.version + 1, 'Goal restore increments version');
    await expectFailure(
      () => runAs(client, owner.accountId, () => client.query(
        `select public.restore_goal_rpc($1,$2,null)`, [goal.id, goal.version],
      )),
      'Goal restore rejects stale version',
      '40007',
    );

    const milestone = (await client.query(
      `insert into public.planner_goal_milestones (
        goal_id,title,trashed_at,trashed_by_member_id
      ) values ($1,'M11 restore milestone',now(),$2) returning *`,
      [goal.id, ownerMemberId],
    )).rows[0];
    const restoredMilestone = await runAs(client, owner.accountId, () => client.query(
      `select public.restore_milestone_rpc($1,$2,$3,null) as result`,
      [goal.id, milestone.id, milestone.version],
    ));
    check(restoredMilestone.rows[0].result.success === true, 'Milestone restore derives authenticated actor internally');
    check(restoredMilestone.rows[0].result.version === milestone.version + 1, 'Milestone restore increments version');

    const guestGoal = (await client.query(
      `insert into public.planner_goals (
        household_id,title,visibility,category,status,created_by_member_id,trashed_at,trashed_by_member_id
      ) values ($1,'M11 guest restore','household','home','active',$2,now(),$2) returning *`,
      [householdId, ownerMemberId],
    )).rows[0];
    await expectFailure(
      () => runAs(client, guest.accountId, () => client.query(
        `select public.restore_goal_rpc($1,$2,null)`, [guestGoal.id, guestGoal.version],
      )),
      'Goal restore enforces current capability matrix',
      '42501',
    );

    const finalShared = await client.query(
      `select count(*)::int as count from public.planner_task_fulfillments where task_id=$1 and retired_at is null`,
      [sharedTask.id],
    );
    check(finalShared.rows[0].count === 1, 'retries and concurrency never duplicate shared fulfillment');

    console.log(`\nM11.1A DATABASE: ${assertions} assertions passed.`);
  } finally {
    try {
      if (households.length || accounts.length) {
        await cleanupFixture(client, households, accounts);
        await assertFixtureClean(client, households, accounts);
      }
    } finally {
      await client.end();
    }
  }
}

const invalidArg = process.argv.find((arg) => arg.startsWith('--seed-invalid='));
if (invalidArg) {
  seedInvalidLegacy(invalidArg.split('=')[1]).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else if (process.argv.includes('--seed-legacy')) {
  seedLegacy().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else if (process.argv.includes('--assert-backfill')) {
  assertLegacyAndClean().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else if (process.argv.includes('--assert-invalid-clean')) {
  assertInvalidFixturesClean().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else if (process.argv.includes('--assert-global-clean')) {
  assertGlobalClean().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else {
  runDatabaseTests().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
