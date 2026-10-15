#!/usr/bin/env node
'use strict';

/**
 * Plans · R4b — Plan write authority database contract.
 *
 * Exercises the single write authority over `planner_goals` against the LOCAL
 * Supabase database: create (Personal / Hogar), update, the lifecycle machine,
 * trash/restore, actor derivation, capability authorization, RLS visibility and
 * the grant cutover.
 *
 * Authority: PLANS_TECHNICAL_TRUTH_V1 §2.2, §4, §5, §6, §15, §22, §26, §31.
 *
 * Everything runs inside one transaction that is rolled back at the end, and the
 * connection string must be loopback: this suite never touches a remote host.
 */

const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { Client } = require('../backend/node_modules/pg');

const DATABASE_URL =
  process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:56222/postgres';

const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
  console.error('ENVIRONMENT_FAILURE: R4b database tests are restricted to local PostgreSQL.');
  process.exit(1);
}

let assertions = 0;

function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

const WRITERS = [
  ['create_goal_rpc', 'p_visibility text, p_title text, p_description text, p_target_date date, p_context_household_id uuid'],
  ['update_goal_rpc', 'p_goal_id uuid, p_expected_version integer, p_context_household_id uuid, p_title text, p_description text, p_target_date date, p_set_title boolean, p_set_description boolean, p_set_target_date boolean'],
  ['transition_goal_rpc', 'p_goal_id uuid, p_transition text, p_expected_version integer, p_context_household_id uuid, p_closed_reason text'],
  ['trash_goal_rpc', 'p_goal_id uuid, p_expected_version integer, p_member_id uuid, p_context_household_id uuid'],
  ['restore_goal_rpc', 'p_goal_id uuid, p_expected_version integer, p_member_id uuid, p_context_household_id uuid'],
];

async function expectFailure(client, sql, params, message, expectedCode) {
  const savepoint = `sp_${crypto.randomBytes(4).toString('hex')}`;
  await client.query(`savepoint ${savepoint}`);
  let failure = null;
  try {
    await client.query(sql, params);
  } catch (error) {
    failure = error;
  }
  await client.query(`rollback to savepoint ${savepoint}`);
  await client.query(`release savepoint ${savepoint}`);
  check(failure !== null, message);
  if (expectedCode) {
    check(failure.code === expectedCode, `${message} (SQLSTATE ${failure.code})`);
  }
}

async function expectDenied(client, sql, params, message) {
  await expectFailure(client, sql, params, message, '42501');
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  // A single long transaction poisons itself on the FIRST error, after which
  // every later statement fails with 25P02 and the real cause is unrecoverable.
  // Keep the recent failures so the one that actually poisoned the transaction
  // is identifiable (expected, savepoint-rolled-back failures are recorded too).
  const failureLog = [];
  const rawQuery = client.query.bind(client);
  client.query = async (...args) => {
    try {
      return await rawQuery(...args);
    } catch (error) {
      const sql = typeof args[0] === 'string' ? args[0] : '<prepared>';
      failureLog.push({
        message: error?.message ?? String(error),
        code: error?.code ?? null,
        sql: sql.replace(/\s+/g, ' ').slice(0, 200),
      });
      if (failureLog.length > 6) failureLog.shift();
      throw error;
    }
  };
  try {
    await client.connect();
  } catch (error) {
    if (process.env.HOMEPLUS_TEST_REQUIRE_LOCAL_DB === '1') throw error;
    console.log(
      'SKIPPED: local database unavailable (set HOMEPLUS_TEST_REQUIRE_LOCAL_DB=1 to make this fatal)',
    );
    return;
  }

  const runId = crypto.randomUUID();

  const accounts = {
    owner: crypto.randomUUID(),
    other: crypto.randomUUID(),
    guest: crypto.randomUUID(),
    child: crypto.randomUUID(),
    outsider: crypto.randomUUID(),
  };
  const people = {
    owner: crypto.randomUUID(),
    other: crypto.randomUUID(),
    guest: crypto.randomUUID(),
    child: crypto.randomUUID(),
    outsider: crypto.randomUUID(),
  };
  const householdId = crypto.randomUUID();
  const outsiderHouseholdId = crypto.randomUUID();
  const memberships = {
    owner: crypto.randomUUID(),
    other: crypto.randomUUID(),
    guest: crypto.randomUUID(),
    child: crypto.randomUUID(),
    outsider: crypto.randomUUID(),
  };

  /**
   * Run `fn` as `authenticated` with the given auth account.
   *
   * When `expectedSqlstate` is supplied the call becomes a NEGATIVE case: the
   * statement runs inside a savepoint, its error is asserted, and the savepoint
   * is rolled back. Without that rollback a deliberate 42501/22023 would poison
   * the surrounding transaction and every later statement would fail with
   * 25P02, hiding the real assertion results.
   */
const asActor = async (accountId, fn, expectedSqlstate) => {
    await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [accountId]);
    await client.query('set local role authenticated');
    if (!expectedSqlstate) {
      try {
        return await fn();
      } finally {
        await client.query('reset role');
        await client.query(`select set_config('request.jwt.claim.sub', '', true)`);
      }
    }
    const savepoint = `sp_actor_${crypto.randomBytes(4).toString('hex')}`;
    await client.query(`savepoint ${savepoint}`);
    let failure = null;
    let value = null;
    try {
      value = await fn();
    } catch (error) {
      failure = error;
    }
    await client.query(`rollback to savepoint ${savepoint}`);
    await client.query(`release savepoint ${savepoint}`);
    check(failure !== null, `expected ${expectedSqlstate} from the actor call`);
    check(
      failure && failure.code === expectedSqlstate,
      `expected SQLSTATE ${expectedSqlstate}, got ${failure && failure.code}`,
    );
    await client.query('reset role');
    await client.query(`select set_config('request.jwt.claim.sub', '', true)`);
    return value;
  };

  /**
   * Run `fn` inside a savepoint so an unexpected failure cannot poison the
   * surrounding transaction, and report what happened instead of throwing.
   */
  const attempt = async (label, fn) => {
    const savepoint = `sp_attempt_${crypto.randomBytes(4).toString('hex')}`;
    await client.query(`savepoint ${savepoint}`);
    try {
      const value = await fn();
      await client.query(`release savepoint ${savepoint}`);
      return { ok: true, value };
    } catch (error) {
      await client.query(`rollback to savepoint ${savepoint}`).catch(() => {});
      await client.query(`release savepoint ${savepoint}`).catch(() => {});
      console.error(`ATTEMPT_FAILED ${label}: ${error.code} ${error.message}`);
      return { ok: false, code: error.code ?? null, message: error.message };
    }
  };

  try {
    await client.query('begin');

    // -----------------------------------------------------------------------
    // Fixture: one household with a coordinator, an adult and a guest, plus an
    // unrelated household the actor does not belong to.
    // -----------------------------------------------------------------------

    for (const key of Object.keys(accounts)) {
      await client.query(
        `insert into auth.users (
          id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) values ($1, 'authenticated', 'authenticated', $2, '', now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          '{}'::jsonb, now(), now())`,
        [accounts[key], `r4b-${key}-${runId}@example.test`],
      );
      await client.query(
        `insert into public.people (id, auth_user_id, display_name, default_language, personal_settings)
         values ($1, $2, $3, 'es-419', '{}'::jsonb)`,
        [people[key], accounts[key], `R4B ${key}`],
      );
    }

    await client.query(
      `insert into public.households (id, name, slug, timezone, default_language, config, created_by_person_id)
       values ($1, 'R4B Household', $2, 'America/Argentina/Buenos_Aires', 'es-419', '{}'::jsonb, $3)`,
      [householdId, `r4b-${runId}`, people.owner],
    );
    await client.query(
      `insert into public.households (id, name, slug, timezone, default_language, config, created_by_person_id)
       values ($1, 'R4B Outsider', $2, 'America/Argentina/Buenos_Aires', 'es-419', '{}'::jsonb, $3)`,
      [outsiderHouseholdId, `r4b-out-${runId}`, people.outsider],
    );

    const roles = {
      owner: 'coordinator',
      other: 'adult',
      guest: 'guest',
      child: 'child',
      outsider: 'coordinator',
    };
    for (const key of ['owner', 'other', 'guest', 'child', 'outsider']) {
      await client.query(
        `insert into public.household_members (
          id, household_id, person_id, role, status, joined_at,
          household_onboarding_status, household_onboarding_completed_at
        ) values ($1, $2, $3, $4, 'active', now(), 'completed', now())`,
        [memberships[key], key === 'outsider' ? outsiderHouseholdId : householdId, people[key], roles[key]],
      );
    }
    await client.query('update public.people set active_household_id = $1 where id = $2', [
      householdId,
      people.owner,
    ]);
    await client.query('update public.people set active_household_id = $1 where id = $2', [
      householdId,
      people.other,
    ]);
    await client.query('update public.people set active_household_id = $1 where id = $2', [
      householdId,
      people.guest,
    ]);
    await client.query('update public.people set active_household_id = $1 where id = $2', [
      householdId,
      people.child,
    ]);
    await client.query('update public.people set active_household_id = $1 where id = $2', [
      outsiderHouseholdId,
      people.outsider,
    ]);

    /**
     * Run a writer RPC inside a savepoint.
     *
     * In PostgreSQL ANY raised error aborts the WHOLE transaction, so a single
     * deliberate negative case (40007, 42501, 22023) silently turns every later
     * assertion into 25P02. Running inside a savepoint keeps the transaction
     * usable, and a refusal is reported on BOTH channels:
     *   - `{ success: false, error, sqlstate }` when the writer returns a result
     *   - `{ success: false, error: <message>, sqlstate }` when it RAISES
     * so callers can assert either way without special-casing.
     */
    const guarded = async (label, sql, params) => {
      const savepoint = `sp_g_${crypto.randomBytes(4).toString('hex')}`;
      await client.query(`savepoint ${savepoint}`);
      try {
        const r = await client.query(sql, params);
        await client.query(`release savepoint ${savepoint}`);
        const value = r.rows[0] ? r.rows[0].result : null;
        return value && typeof value === 'object'
          ? { ...value, sqlstate: value.sqlstate ?? null }
          : value;
      } catch (error) {
        await client.query(`rollback to savepoint ${savepoint}`).catch(() => {});
        await client.query(`release savepoint ${savepoint}`).catch(() => {});
        return {
          success: false,
          error: error?.message ?? String(error),
          sqlstate: error?.code ?? null,
          __refused: true,
          __label: label,
        };
      }
    };

    const createGoal = (visibility, title, extra = {}) =>
      guarded(
        'create_goal_rpc',
        `select public.create_goal_rpc($1, $2, $3, $4, $5) as result`,
        [
          visibility,
          title,
          extra.description ?? null,
          extra.targetDate ?? null,
          householdId,
        ],
      );

    const updateGoal = (goalId, version, fields) =>
      guarded(
        'update_goal_rpc',
        `select public.update_goal_rpc($1, $2, $3, $4, $5, $6, $7, $8, $9) as result`,
        [
          goalId,
          version,
          householdId,
          fields.title ?? null,
          fields.description ?? null,
          fields.targetDate ?? null,
          fields.setTitle ?? false,
          fields.setDescription ?? false,
          fields.setTargetDate ?? false,
        ],
      );

    const transitionGoal = (goalId, verb, version, closedReason = null) =>
      guarded(
        'transition_goal_rpc',
        `select public.transition_goal_rpc($1, $2, $3, $4, $5) as result`,
        [goalId, verb, version, householdId, closedReason],
      );

    const trashGoal = (goalId, version, memberId = null) =>
      guarded(
        'trash_goal_rpc',
        `select public.trash_goal_rpc($1, $2, $3, $4) as result`,
        [goalId, version, memberId, householdId],
      );

    const restoreGoal = (goalId, version, memberId = null) =>
      guarded(
        'restore_goal_rpc',
        `select public.restore_goal_rpc($1, $2, $3, $4) as result`,
        [goalId, version, memberId, householdId],
      );

    // Read the current version WITHOUT switching role: RLS would hide a Plan the
    // acting member is not allowed to see, which is exactly the situation some
    // of the assertions below need to probe.
    const currentVersion = async (goalId) => {
      const rows = await client.query(`select version from public.planner_goals where id = $1`, [goalId]);
      return rows.rows[0]?.version ?? null;
    };

    // -----------------------------------------------------------------------
    // 1. Create — owner shape
    // -----------------------------------------------------------------------

    // `createGoal` is savepoint-guarded, so the refusal arrives as a result, not a
    // throw. Planner V1 Plans are HOUSEHOLD-ONLY: `create_goal_rpc` refuses a
    // Personal Plan with 22023, so creating one is a negative case here.
    const personalRefused = await asActor(accounts.owner, () =>
      createGoal('personal', 'R4B Personal Plan'),
    );
    check(
      personalRefused.success === false && personalRefused.sqlstate === '22023',
      `CREATE PERSONAL is refused (household-only) [${personalRefused.sqlstate ?? personalRefused.error}]`,
    );

    const householdPlan = await asActor(accounts.owner, () => createGoal('household', 'R4B Hogar Plan'));
    check(householdPlan.success === true, 'CREATE HOUSEHOLD succeeds');
    const householdGoal = householdPlan.goal;
    check(householdGoal.visibility === 'household', 'CREATE HOUSEHOLD persists visibility=household');
    check(householdGoal.household_id === householdId, 'CREATE HOUSEHOLD sets the context household');
    check(householdGoal.owner_person_id === null, 'CREATE HOUSEHOLD leaves owner_person_id NULL');
    check(
      householdGoal.created_by_person_id === people.owner,
      'CREATE HOUSEHOLD records the durable author',
    );
    check(
      householdGoal.created_by_member_id === memberships.owner,
      'CREATE HOUSEHOLD records the authoring membership',
    );
    check(householdGoal.lifecycle === 'preparation', 'CREATE HOUSEHOLD produces lifecycle=preparation');

    // Owner-shape CHECK.
    const ownerShape = await client.query(`
      select conname, convalidated
      from pg_constraint
      where conrelid = 'public.planner_goals'::regclass and conname = 'planner_goals_owner_shape'
    `);
    check(ownerShape.rowCount === 1, 'planner_goals carries the owner-shape CHECK');
    check(ownerShape.rows[0].convalidated === true, 'the owner-shape CHECK is validated');

    await expectFailure(
      client,
      `insert into public.planner_goals (
         household_id, title, visibility, owner_person_id, created_by_person_id
       ) values ($1, 'impossible', 'personal', $2, $2)`,
      [householdId, people.owner],
      'the owner-shape CHECK rejects a Personal Plan that also carries a household',
      '23514',
    );

    // Capability authorization on create.
    await asActor(accounts.guest, async () => {
      await expectDenied(
        client,
        `select public.create_goal_rpc('household', 'guest household plan', null, null, $1)`,
        [householdId],
        'a guest cannot CREATE a Hogar Plan (goal.create_household)',
      );
    });
    await asActor(accounts.outsider, async () => {
      await expectDenied(
        client,
        `select public.create_goal_rpc('household', 'outsider plan', null, null, $1)`,
        [householdId],
        'a non-member cannot CREATE a Plan in a household they do not belong to',
      );
    });

    // -----------------------------------------------------------------------
    // 2. Update — writable surface and immutable scope
    // -----------------------------------------------------------------------

    const updated = await asActor(accounts.owner, () =>
      updateGoal(householdGoal.id, householdGoal.version, {
        title: 'R4B Hogar Plan editado',
        setTitle: true,
      }),
    );
    check(updated.success === true, 'UPDATE own Hogar Plan succeeds');
    check(updated.goal.title === 'R4B Hogar Plan editado', 'UPDATE writes title');
    check(updated.goal.version > householdGoal.version, 'UPDATE increments the optimistic version');
    check(
      updated.goal.visibility === 'household' && updated.goal.household_id === householdId,
      'UPDATE cannot change the scope',
    );
    check(
      updated.goal.created_by_person_id === people.owner &&
        updated.goal.created_by_member_id === memberships.owner,
      'UPDATE cannot change authorship',
    );

    const described = await asActor(accounts.owner, () =>
      updateGoal(householdGoal.id, updated.goal.version, {
        description: 'R4B description',
        targetDate: '2026-12-31',
        setDescription: true,
        setTargetDate: true,
      }),
    );
    check(described.success === true, 'UPDATE writes description and target_date');
    check(described.goal.description === 'R4B description', 'UPDATE persisted the description');
    check(
      described.goal.target_date === '2026-12-31' && described.goal.ends_at === '2026-12-31',
      'UPDATE persisted target_date and its legacy compatibility projection',
    );

    const noop = await asActor(accounts.owner, () => updateGoal(householdGoal.id, described.goal.version, {}));
    check(noop.success === true, 'UPDATE with no writable field is a no-op success');
    check(noop.goal.version === described.goal.version, 'a no-op UPDATE does not bump the version');

    const planVersion = described.goal.version;

    // -----------------------------------------------------------------------
    // 3. Write boundary — grants and policies
    // -----------------------------------------------------------------------

    const grants = await client.query(`
      select
        has_table_privilege('anon', 'public.planner_goals', 'select') as anon_select,
        has_table_privilege('anon', 'public.planner_goals', 'insert') as anon_insert,
        has_table_privilege('anon', 'public.planner_goals', 'update') as anon_update,
        has_table_privilege('anon', 'public.planner_goals', 'delete') as anon_delete,
        has_table_privilege('authenticated', 'public.planner_goals', 'select') as auth_select,
        has_table_privilege('authenticated', 'public.planner_goals', 'insert') as auth_insert,
        has_table_privilege('authenticated', 'public.planner_goals', 'update') as auth_update,
        has_table_privilege('authenticated', 'public.planner_goals', 'delete') as auth_delete,
        has_table_privilege('service_role', 'public.planner_goals', 'select,insert,update,delete') as service_all
    `);
    check(grants.rows[0].anon_select === false, 'anon cannot read the Plan root');
    check(grants.rows[0].anon_insert === false, 'anon cannot insert into the Plan root');
    check(grants.rows[0].anon_update === false, 'anon cannot update the Plan root');
    check(grants.rows[0].anon_delete === false, 'anon cannot delete from the Plan root');
    check(grants.rows[0].auth_select === true, 'authenticated can read the Plan root');
    check(grants.rows[0].auth_insert === false, 'authenticated cannot INSERT directly');
    check(grants.rows[0].auth_update === false, 'authenticated cannot UPDATE directly');
    check(grants.rows[0].auth_delete === false, 'authenticated cannot DELETE directly');
    check(grants.rows[0].service_all === true, 'service_role keeps the internal maintenance path');

    const policies = await client.query(`
      select polcmd, count(*)::int as total
      from pg_policy
      where polrelid = 'public.planner_goals'::regclass
      group by polcmd
    `);
    check(policies.rowCount === 1, 'the Plan root exposes exactly one policy command');
    check(policies.rows[0].polcmd === 'r', 'the only policy on the Plan root is SELECT');

    await asActor(accounts.owner, async () => {
      await expectDenied(
        client,
        `insert into public.planner_goals (household_id, title, visibility, created_by_person_id)
         values ($1, 'direct insert', 'household', $2)`,
        [householdId, people.owner],
        'authenticated direct INSERT into the Plan root is denied',
        '42501',
      );
      await expectDenied(
        client,
        `update public.planner_goals set title = 'direct update' where id = $1`,
        [householdGoal.id],
        'authenticated direct UPDATE on the Plan root is denied',
        '42501',
      );
    });

    for (const [name, identity] of WRITERS) {
      const fn = await client.query(`
        select p.prosecdef as security_definer,
               has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
               has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec,
               pg_get_function_identity_arguments(p.oid) as args
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = $1
          and pg_get_function_identity_arguments(p.oid) = $2
      `, [name, identity]);
      check(fn.rowCount === 1, `${name} exists with its R4b signature`);
      check(fn.rows[0].security_definer === true, `${name} is SECURITY DEFINER`);
      check(fn.rows[0].anon_exec === false, `anon cannot execute ${name}`);
      check(fn.rows[0].auth_exec === true, `authenticated can execute ${name}`);
    }

    // -----------------------------------------------------------------------
    // 4. Version conflict
    // -----------------------------------------------------------------------

    await asActor(accounts.owner, async () => {
      await expectFailure(
        client,
        `select public.update_goal_rpc($1, $2, $3, 'stale title', null, null, true, false, false)`,
        [householdGoal.id, planVersion - 1, householdId],
        'UPDATE with a stale expected version is rejected',
        '40007',
      );
    });

    // -----------------------------------------------------------------------
    // 5. Lifecycle machine
    // -----------------------------------------------------------------------

    await asActor(accounts.owner, async () => {
      // These two are NEGATIVE cases. Whether the writer returns `{success:false}`
      // or RAISES (40007/22P02) both are legitimate refusals, and a RAISE aborts
      // the whole transaction in PostgreSQL — so they run inside a savepoint and
      // are asserted on whichever channel they used.
      const invalidFromPreparation = await attempt('preparation->complete', () =>
        transitionGoal(householdGoal.id, 'complete', planVersion),
      );
      check(
        invalidFromPreparation.ok
          ? invalidFromPreparation.value.success === false &&
              invalidFromPreparation.value.error === 'invalid_lifecycle_transition'
          : ['40007', '22023'].includes(invalidFromPreparation.code),
        `preparation -> completed is rejected [${invalidFromPreparation.code ?? invalidFromPreparation.value?.error}]`,
      );

      const invalidVerb = await attempt('retired verb', () =>
        transitionGoal(householdGoal.id, 'closed', planVersion),
      );
      check(
        invalidVerb.ok
          ? invalidVerb.value.success === false && invalidVerb.value.error === 'invalid_transition'
          : ['40007', '22023'].includes(invalidVerb.code),
        `a retired lifecycle value (closed) is rejected as a transition verb [${invalidVerb.code ?? invalidVerb.value?.error}]`,
      );

      const activated = await transitionGoal(householdGoal.id, 'activate', planVersion);
      check(activated.success === true, 'preparation -> active succeeds');
      check(activated.goal.lifecycle === 'active', 'activation persists lifecycle=active');
      check(activated.goal.activated_at !== null, 'activation records activated_at');
      check(activated.goal.status === 'active', 'status stays a derived projection of lifecycle');

      const paused = await transitionGoal(householdGoal.id, 'pause', activated.goal.version);
      check(paused.success === true, 'active -> paused succeeds');
      check(paused.goal.lifecycle === 'paused', 'pause persists lifecycle=paused');
      check(paused.goal.paused_at !== null, 'pause records paused_at');

      const resumed = await transitionGoal(householdGoal.id, 'resume', paused.goal.version);
      check(resumed.success === true, 'paused -> active succeeds');
      check(resumed.goal.lifecycle === 'active', 'resume persists lifecycle=active');

      const completed = await transitionGoal(householdGoal.id, 'complete', resumed.goal.version);
      check(completed.success === true, 'active -> completed succeeds');
      check(completed.goal.completed_at !== null, 'completion records completed_at');
      check(completed.goal.status === 'completed', 'status stays a derived projection of lifecycle');

      // User-confirmed decision: `goal.archive` is now GRANTED to the same roles as
      // `goal.edit_any` (coordinator, adult, senior), because archive/unarchive
      // are first-class Plan actions in the canonical availableActions vocabulary
      // and the service now gates them with their OWN capability instead of
      // silently eliding it behind `goal.edit_own`.
      const archiveAttempt = await attempt('archive', () =>
        transitionGoal(householdGoal.id, 'archive', completed.goal.version),
      );
      check(archiveAttempt.ok, `a coordinator CAN archive a Plan (goal.archive granted) [${archiveAttempt.code ?? 'ok'}]`);
      if (archiveAttempt.ok) {
        check(archiveAttempt.value.success === true, 'archive reports success');
        check(archiveAttempt.value.goal.archived_at !== null, 'archive records archived_at');
        check(
          archiveAttempt.value.goal.lifecycle === 'completed',
          'archive is orthogonal: it preserves lifecycle',
        );
        const unarchiveAttempt = await attempt('unarchive', () =>
          transitionGoal(householdGoal.id, 'unarchive', archiveAttempt.value.goal.version),
        );
        check(unarchiveAttempt.ok, `unarchive succeeds with the same authority [${unarchiveAttempt.code ?? 'ok'}]`);
        if (unarchiveAttempt.ok) {
          check(unarchiveAttempt.value.goal.archived_at === null, 'unarchive clears archived_at');
        }
      }

      // Archive/unarchive each bump the version, so the reopen that follows must
      // read the CURRENT version rather than reuse the pre-archive one.
      const versionBeforeReopen = await currentVersion(householdGoal.id);
      const reopened = await transitionGoal(householdGoal.id, 'reopen', versionBeforeReopen);
      check(reopened.success === true, 'completed -> active (reopen) succeeds');
      check(reopened.goal.lifecycle === 'active', 'reopen persists lifecycle=active');
      check(reopened.goal.completed_at === null, 'reopen clears completed_at');
      check(
        reopened.goal.closed_at === null && reopened.goal.closed_reason === null,
        'reopen clears cancelled metadata',
      );

      const cancelled = await transitionGoal(
        householdGoal.id,
        'cancel',
        reopened.goal.version,
        'cambio de plan',
      );
      check(cancelled.success === true, 'active -> cancelled succeeds');
      check(cancelled.goal.lifecycle === 'cancelled', 'cancel persists lifecycle=cancelled');
      check(cancelled.goal.status === 'closed', 'cancelled projects status=closed');
      check(cancelled.goal.closed_reason === 'cambio de plan', 'cancel records closed_reason');

      const reopenFromCancelled = await transitionGoal(householdGoal.id, 'reopen', cancelled.goal.version);
      check(reopenFromCancelled.success === true, 'cancelled -> active (reopen) succeeds');
      check(
        reopenFromCancelled.goal.closed_reason === null,
        'reopen after cancel clears the terminal reason',
      );

      // Frozen: Planner V1 Plans are household-only, so there is no Personal
      // variant of the lifecycle machine to exercise here. The Personal half of
      // this suite was retired together with `goal.create_personal` writes.
    });

    // Capability split: a guest owns nothing, so completing someone else's Plan
    // needs goal.complete_any, which a guest never holds.
    await asActor(accounts.guest, async () => {
      const version = await currentVersion(householdGoal.id);
await expectDenied(
        client,
        `select public.transition_goal_rpc($1, 'complete', $2, $3, null)`,
        [householdGoal.id, version, householdId],
        "a guest cannot complete another member's Plan (goal.complete_any)",
      );
    });

    // A second adult is not the author, so `goal.complete_any` applies and the
    // adult holds it.
    await asActor(accounts.other, async () => {
      const version = await currentVersion(householdGoal.id);
const result = await transitionGoal(householdGoal.id, 'complete', version);
      check(result.success === true, 'an adult with goal.complete_any can complete another member Plan');
    });

    // -----------------------------------------------------------------------
    // 6. Cross-actor isolation
    // -----------------------------------------------------------------------

    await asActor(accounts.outsider, async () => {
      const version = await currentVersion(householdGoal.id);
await expectDenied(
        client,
        `select public.update_goal_rpc($1, $2, $3, 'hijacked', null, null, true, false, false)`,
        [householdGoal.id, version, outsiderHouseholdId],
        'a member of another household cannot edit the Plan',
      );
      await expectDenied(
        client,
        `select public.transition_goal_rpc($1, 'activate', $2, $3, null)`,
        [householdGoal.id, version, outsiderHouseholdId],
        'a member of another household cannot transition the Plan',
      );
      await expectDenied(
        client,
        `select public.trash_goal_rpc($1, null, null, $2)`,
        [householdGoal.id, outsiderHouseholdId],
        'a member of another household cannot trash the Plan',
      );
    });

// Editing ANOTHER member's household Plan requires `goal.edit_any`
    // (coordinator/adult/senior). A `child` never holds it, so a child editing a
    // Plan it does not own is the real negative case. (An `adult` legitimately
    // CAN edit a household Plan — Plans are shared, household-only, so the old
    // Personal-Plan ownership-isolation case no longer has a counterpart.)
    await asActor(accounts.child, async () => {
      const version = await currentVersion(householdGoal.id);
      await expectDenied(
        client,
        `select public.update_goal_rpc($1, $2, $3, 'stolen', null, null, true, false, false)`,
        [householdGoal.id, version, householdId],
        'a role without goal.edit_any cannot edit another member Plan',
      );
    });

    // Sanity: the adult role DOES hold goal.edit_any and succeeds.
    const adultVersion = await currentVersion(householdGoal.id);
    const adultEdit = await asActor(accounts.other, () =>
      updateGoal(householdGoal.id, adultVersion, { title: 'adult edit', setTitle: true }),
    );
    check(
      adultEdit.success === true,
      `an adult holds goal.edit_any and may edit a household Plan [${adultEdit.sqlstate ?? 'ok'}]`,
    );

    // -----------------------------------------------------------------------
    // 7. Trash / Restore
    // -----------------------------------------------------------------------

    const trashHousehold = await asActor(accounts.owner, () =>
      trashGoal(householdGoal.id, null, memberships.owner),
    );
    check(trashHousehold.success === true, 'trash succeeds for the owning member');
    check(trashHousehold.goal.trashed_at !== null, 'trash records trashed_at');
    check(
      trashHousehold.goal.trashed_by_person_id === people.owner,
      'trash records the durable trash person',
    );
    check(
      trashHousehold.goal.trashed_by_member_id === memberships.owner,
      'trash records the trash membership for a Hogar Plan',
    );
    check(
      typeof trashHousehold.goal.trash_operation_id === 'string' &&
        trashHousehold.goal.trash_operation_id.length > 0,
      'trash records a trash_operation_id',
    );

    const trashedAgain = await asActor(accounts.owner, () =>
      trashGoal(householdGoal.id, null, memberships.owner),
    );
    check(trashedAgain.already_trashed === true, 'trash is idempotent');

    await asActor(accounts.other, async () => {
      const version = await currentVersion(householdGoal.id);
await expectDenied(
        client,
        `select public.restore_goal_rpc($1, $2, $3, $4)`,
        [householdGoal.id, version, memberships.other, householdId],
        "a non-author cannot restore another member's Plan",
      );
    });

    await asActor(accounts.other, async () => {
      await expectFailure(
        client,
        `select public.trash_goal_rpc($1, null, $2, $3)`,
        [householdGoal.id, crypto.randomUUID(), householdId],
        'a caller-supplied member id that contradicts the derived actor is rejected',
        '42501',
      );
    });

    const restored = await asActor(accounts.owner, () =>
      restoreGoal(householdGoal.id, null, memberships.owner),
    );
    check(restored.success === true, 'restore succeeds for the owning member');
    check(restored.goal.trashed_at === null, 'restore clears trashed_at');
    check(
      restored.goal.trashed_by_person_id === null &&
        restored.goal.trashed_by_member_id === null &&
        restored.goal.trash_operation_id === null,
      'restore clears the whole durable trash metadata set',
    );
    check(
      restored.goal.lifecycle === 'completed',
      'restore does not invent a lifecycle',
    );
    check(restored.goal.archived_at === null, 'restore does not un-archive');

    const restoredAgain = await asActor(accounts.owner, () =>
      restoreGoal(householdGoal.id, null, memberships.owner),
    );
    check(restoredAgain.already_restored === true, 'restore is idempotent');

    // -----------------------------------------------------------------------
    // 8. RLS visibility
    // -----------------------------------------------------------------------

    const visibleIds = async (accountId) =>
      asActor(accountId, async () => {
        const rows = await client.query(
          `select id, visibility, owner_person_id from public.planner_goals
           where id = any($1::uuid[]) order by id`,
          [[householdGoal.id]],
        );
        return rows.rows.map((row) => row.id);
      });

    const ownerSees = await visibleIds(accounts.owner);
    check(ownerSees.includes(householdGoal.id), 'the owner sees their Hogar Plan');

    const otherSees = await visibleIds(accounts.other);
    check(otherSees.includes(householdGoal.id), 'a member sees a Hogar Plan');

    const guestSees = await visibleIds(accounts.guest);
    check(guestSees.includes(householdGoal.id), 'a guest sees a Hogar Plan (planner.view)');

    const outsiderSees = await visibleIds(accounts.outsider);
    check(outsiderSees.length === 0, 'a member of another household sees nothing');

    const trashedHouseholdVisibility = await (async () => {
      await asActor(accounts.owner, () => trashGoal(householdGoal.id, null, memberships.owner));
      const visible = await asActor(accounts.other, async () => {
        const rows = await client.query(`select id from public.planner_goals where id = $1`, [
          householdGoal.id,
        ]);
        return rows.rows.map((row) => row.id);
      });
      await asActor(accounts.owner, () => restoreGoal(householdGoal.id, null, memberships.owner));
      return visible;
    })();
    check(
      trashedHouseholdVisibility.length === 0,
      'a trashed Hogar Plan leaves the read surface for every member',
    );

    // -----------------------------------------------------------------------
    // 9. No caller-supplied identity
    // -----------------------------------------------------------------------

    const actorDefinitions = await client.query(`
      select p.proname, pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('create_goal_rpc', 'update_goal_rpc', 'transition_goal_rpc', 'trash_goal_rpc', 'restore_goal_rpc')
    `);
    check(actorDefinitions.rowCount === 5, 'all five Plan writers exist');
    for (const row of actorDefinitions.rows) {
      check(
        /planner_goal_actor_context/.test(row.definition),
        `${row.proname} derives the actor from auth.uid() through the actor authority`,
      );
      check(
        !/p_person_id/.test(row.definition),
        `${row.proname} accepts no caller-supplied person identity`,
      );
    }

    const actorAuthority = await client.query(
      `select pg_get_functiondef(p.oid) as definition
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'planner_goal_actor_context'`,
    );
    check(
      /current_person_id\(\)/.test(actorAuthority.rows[0].definition),
      'the actor authority resolves the person from the authenticated session',
    );
    check(
      /is_active_household_member/.test(actorAuthority.rows[0].definition),
      'the actor authority validates the household context against the real membership',
    );

    // -----------------------------------------------------------------------
    // 10. Capability parity between SQL and the JS matrix
    // -----------------------------------------------------------------------

    const capabilityMatrix = await asActor(accounts.owner, async () => {
      const rows = await client.query(`
        select capability, public.planner_current_actor_has_capability($1, capability) as granted
        from unnest($2::text[]) as capability
      `, [householdId, [
        'goal.create_household',
        'goal.create_personal',
        'goal.edit_own',
        'goal.edit_any',
        'goal.complete_own',
        'goal.complete_any',
        'goal.close_own',
        'goal.close_any',
        'goal.archive',
        'goal.restore',
        'goal.manage_participants',
      ]]);
      return Object.fromEntries(rows.rows.map((row) => [row.capability, row.granted]));
    });

    for (const capability of [
      'goal.create_household',
      'goal.create_personal',
      'goal.edit_own',
      'goal.edit_any',
      'goal.complete_own',
      'goal.complete_any',
      'goal.close_own',
      'goal.close_any',
      'goal.restore',
    ]) {
      check(capabilityMatrix[capability] === true, `a coordinator holds ${capability} in SQL`);
    }
    // User-confirmed decision: `goal.archive` is granted (coordinator/adult/senior),
    // mirroring `goal.edit_any`.
    check(capabilityMatrix['goal.archive'] === true, 'a coordinator holds goal.archive in SQL');
    // `goal.manage_participants` IS part of the current catalog and both matrices
    // grant it to a coordinator. The previous assertion expected `false`, which
    // contradicted the SQL function and the JS DEFAULT_CAPABILITY_MATRIX.
    check(
      capabilityMatrix['goal.manage_participants'] === true,
      'a coordinator holds goal.manage_participants in SQL (matches the JS matrix)',
    );

    const guestMatrix = await asActor(accounts.guest, async () => {
      const rows = await client.query(`
        select capability, public.planner_current_actor_has_capability($1, capability) as granted
        from unnest($2::text[]) as capability
      `, [householdId, [
        'goal.create_household',
        'goal.create_personal',
        'goal.edit_own',
        'goal.edit_any',
        'goal.complete_own',
        'goal.complete_any',
        'goal.close_own',
        'goal.close_any',
        'goal.restore',
      ]]);
      return Object.fromEntries(rows.rows.map((row) => [row.capability, row.granted]));
    });
    for (const capability of [
      'goal.create_household',
      'goal.create_personal',
      'goal.edit_any',
      'goal.complete_any',
      'goal.close_any',
      'goal.restore',
    ]) {
      check(guestMatrix[capability] === false, `a guest does not hold ${capability} in SQL`);
    }
    for (const capability of ['goal.edit_own', 'goal.complete_own', 'goal.close_own']) {
      check(guestMatrix[capability] === true, `a guest still holds ${capability} in SQL`);
    }

    const childMatrix = await asActor(accounts.child, async () => {
      const rows = await client.query(`
        select capability, public.planner_current_actor_has_capability($1, capability) as granted
        from unnest($2::text[]) as capability
      `, [householdId, ['goal.create_household', 'goal.create_personal', 'goal.edit_any', 'goal.restore']]);
      return Object.fromEntries(rows.rows.map((row) => [row.capability, row.granted]));
    });
    check(
      childMatrix['goal.create_household'] === false,
      'a child cannot create a Hogar Plan in SQL (JS matrix parity)',
    );
    check(
      childMatrix['goal.create_personal'] === true,
      'a child can create a Personal Plan in SQL (JS matrix parity)',
    );
    check(
      childMatrix['goal.edit_any'] === false,
      'a child does not hold goal.edit_any in SQL (JS matrix parity)',
    );
    check(
      childMatrix['goal.restore'] === true,
      'a child holds goal.restore in SQL (JS matrix parity)',
    );

    // -----------------------------------------------------------------------
    // 11. Idempotent create retry (planner_idempotency_keys stays the authority)
    // -----------------------------------------------------------------------

    const idempotencyKey = `r4b-create-${runId}`;
    const operation = 'planner.plans.v1.create';
    const requestHash = crypto.createHash('sha256').update(`r4b-${runId}`).digest('hex');

    const reservation1 = await asActor(accounts.owner, () =>
      client.query(
        `select public.reserve_planner_idempotency_key($1, $2, $3, $4, $5) as result`,
        [householdId, memberships.owner, idempotencyKey, operation, requestHash],
      ).then((r) => r.rows[0].result),
    );
    check(reservation1.status === 'reserved', 'the first idempotent create reserves the key');

    const retryGoal = await asActor(accounts.owner, () => createGoal('household', 'R4B Idempotent Plan'));
    await asActor(accounts.owner, () =>
      client.query(
        `select public.complete_planner_idempotency_key($1, $2, $3, $4, 201, $5)`,
        [
          householdId,
          memberships.owner,
          idempotencyKey,
          operation,
          JSON.stringify({ plan: { id: retryGoal.goal.id } }),
        ],
      ),
    );

    const reservation2 = await asActor(accounts.owner, () =>
      client.query(
        `select public.reserve_planner_idempotency_key($1, $2, $3, $4, $5) as result`,
        [householdId, memberships.owner, idempotencyKey, operation, requestHash],
      ).then((r) => r.rows[0].result),
    );
    check(reservation2.status === 'replay', 'a retried idempotent create replays the stored response');
    check(
      reservation2.response_body.plan.id === retryGoal.goal.id,
      'the replayed response is the first created Plan',
    );

    const counted = await client.query(
      `select count(*)::int as total from public.planner_goals where title = 'R4B Idempotent Plan'`,
    );
    check(counted.rows[0].total === 1, 'an idempotent create retry never produces a second Plan');

    // -----------------------------------------------------------------------
    // 12. No child cascade
    // -----------------------------------------------------------------------

    const taskId = crypto.randomUUID();
    await client.query(
      `insert into public.planner_tasks (id, household_id, title, goal_id, created_by_person_id, created_by_member_id)
       values ($1, $2, 'R4B child task', $3, $4, $5)`,
      [taskId, householdId, householdGoal.id, people.owner, memberships.owner],
    );
    const beforeChild = await client.query(`select status from public.planner_tasks where id = $1`, [taskId]);
    await asActor(accounts.owner, async () => {
      const version = await currentVersion(householdGoal.id);
const reopened = await transitionGoal(householdGoal.id, 'reopen', version);
      check(reopened.success === true, 'reopen before the cascade assertion succeeds');
      const cancelled = await transitionGoal(householdGoal.id, 'cancel', reopened.goal.version);
      check(cancelled.success === true, 'cancel before the cascade assertion succeeds');
    });
    const afterChild = await client.query(`select status from public.planner_tasks where id = $1`, [taskId]);
    check(
      afterChild.rows[0].status === beforeChild.rows[0].status,
      'cancelling a Plan does not cascade to its Tasks',
    );
    check(
      afterChild.rows[0].status === 'pending',
      'the child Task keeps its own lifecycle when the Plan is cancelled',
    );

    const milestomeCount = await client.query(
      `select count(*)::int as total from public.planner_goal_milestones where goal_id = $1`,
      [householdGoal.id],
    );
    check(milestomeCount.rows[0].total === 0, 'the transition writer creates no Milestones');

    const statusProjection = await client.query(
      `select status, lifecycle from public.planner_goals where id = $1`,
      [householdGoal.id],
    );
    check(
      statusProjection.rows[0].status === 'closed' && statusProjection.rows[0].lifecycle === 'cancelled',
      'status remains a derived projection of lifecycle',
    );

    const lifecycleValues = await client.query(`
      select distinct lifecycle from public.planner_goals
      where id = any($1::uuid[])
    `, [[householdGoal.id, retryGoal.goal.id]]);
    for (const row of lifecycleValues.rows) {
      check(
        ['preparation', 'active', 'paused', 'completed', 'cancelled'].includes(row.lifecycle),
        `lifecycle value ${row.lifecycle} belongs to the canonical machine`,
      );
    }
  } catch (error) {
    // A single long transaction means ANY earlier error poisons it: every later
    // statement then fails with "current transaction is aborted", which hides
    // the real cause. Report the recent statement failures so the poisoning one
    // is identifiable, then surface the original error with its SQLSTATE.
    await client.query('rollback').catch(() => {});
    console.error('RECENT_STATEMENT_FAILURES:');
    for (const entry of failureLog) {
      console.error(`  ${entry.code} ${entry.message} :: ${entry.sql}`);
    }
    throw error;
  } finally {
    await client.query('rollback').catch(() => {});
    await client.end();
  }

  console.log(`HOMEPLUS PLANS R4B WRITE AUTHORITY DB: ${assertions} assertions passed.`);
}

main().catch((error) => {
  console.error(
    `DATABASE_FAILURE: ${error instanceof Error ? error.message : String(error)}`,
  );
  if (error && error.code) console.error(`SQLSTATE: ${error.code}`);
  if (error && error.position) console.error(`POSITION: ${error.position}`);
  if (error && error.detail) console.error(`DETAIL: ${error.detail}`);
  if (error && error.hint) console.error(`HINT: ${error.hint}`);
  if (error && error.__originalMessage) {
    console.error(`ORIGINAL: ${error.__originalMessage}`);
  }
  if (error && error.stack) console.error(error.stack);
  process.exitCode = 1;
});

module.exports = { main, WRITERS, DATABASE_URL };
