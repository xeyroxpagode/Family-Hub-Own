#!/usr/bin/env node
'use strict';

/**
 * Plans · R3 — Plan root foundation database contract.
 *
 * Read-only against the local Supabase database. Asserts that `planner_goals`
 * carries the additive Personal/Hogar foundation required by
 * PLANS_TECHNICAL_TRUTH_V1 §2, and that the foundation did not weaken the
 * existing Plan invariants.
 *
 * Never connects to a remote host: the connection string must be loopback.
 */

const { Client } = require('../backend/node_modules/pg');

const databaseUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:56222/postgres';
let assertions = 0;

function check(condition, message) {
  if (!condition) throw new Error(`DB assertion failed: ${message}`);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

const FOUNDATION_COLUMNS = [
  'owner_person_id',
  'created_by_person_id',
  'trashed_by_person_id',
  'trash_operation_id',
  'activated_at',
  'paused_at',
];

async function main() {
  const parsed = new URL(databaseUrl);
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw new Error('ENVIRONMENT_FAILURE: Plan foundation suite only permits local PostgreSQL');
  }

  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
  } catch (error) {
    if (process.env.HOMEPLUS_TEST_REQUIRE_LOCAL_DB === '1') throw error;
    console.log('SKIPPED: local database unavailable (set HOMEPLUS_TEST_REQUIRE_LOCAL_DB=1 to make this fatal)');
    return;
  }

  try {
    const columns = await client.query(`
      select column_name, is_nullable, data_type
      from information_schema.columns
      where table_schema = 'public' and table_name = 'planner_goals'
    `);
    const byName = new Map(columns.rows.map((row) => [row.column_name, row]));

    for (const column of FOUNDATION_COLUMNS) {
      check(byName.has(column), `planner_goals exposes ${column}`);
      check(
        byName.get(column).is_nullable === 'YES',
        `planner_goals.${column} is nullable (additive foundation, no legacy row can break)`,
      );
    }

    check(
      byName.get('household_id').is_nullable === 'YES',
      'planner_goals.household_id accepts NULL so a Plan can be genuinely Personal',
    );
    check(
      byName.get('visibility').is_nullable === 'NO',
      'planner_goals.visibility stays mandatory (scope has exactly one persisted authority)',
    );
    check(
      byName.get('lifecycle').is_nullable === 'NO',
      'planner_goals.lifecycle stays mandatory (single lifecycle authority)',
    );

    const legacySurvivors = [
      'status',
      'category',
      'progress_mode',
      'target_type',
      'current_value',
      'target_value',
      'unit',
      'starts_at',
      'ends_at',
      'failed_at',
      'deleted_at',
    ];
    for (const column of legacySurvivors) {
      check(byName.has(column), `planner_goals.${column} survives the foundation (retirement is a later slice)`);
    }

    const shape = await client.query(`
      select
        (select count(*) from pg_constraint
          where conrelid = 'public.planner_goals'::regclass
            and conname = 'planner_goals_trash_actor_shape') as trash_shape_constraints,
        (select count(*) from public.planner_goals where trashed_at is not null) as trashed_goals,
        (select count(*) from public.planner_goals where visibility = 'personal') as personal_goals,
        (select count(*) from public.planner_goals where visibility = 'household') as household_goals
    `);
    check(
      Number(shape.rows[0].trash_shape_constraints) === 1,
      'planner_goals guards the trash actor shape',
    );

    const violations = await client.query(`
      select count(*) as count
      from public.planner_goals
      where trashed_at is not null
        and trashed_by_person_id is null
        and trashed_by_member_id is null
        and trash_operation_id is null
    `);
    check(
      Number(violations.rows[0].count) === 0,
      'no local Plan is trashed without a durable trash actor',
    );

    const authorship = await client.query(`
      select count(*) as unresolved
      from public.planner_goals g
      where g.created_by_member_id is not null
        and g.created_by_person_id is null
    `);
    check(
      Number(authorship.rows[0].unresolved) === 0,
      'every membership-authored Plan resolved a durable created_by_person_id',
    );

    const ownership = await client.query(`
      select
        count(*) filter (
          where visibility = 'household'
            and household_id is null
        ) as household_without_household,
        count(*) filter (
          where visibility = 'personal'
            and owner_person_id is not null
            and household_id is not null
        ) as conflicting_personal
      from public.planner_goals
    `);
    check(
      Number(ownership.rows[0].household_without_household) === 0,
      'no household Plan lost its household',
    );
    check(
      Number(ownership.rows[0].conflicting_personal) === 0,
      'no Personal Plan carries both an owner and a household',
    );

    const indexCheck = await client.query(`
      select indexname from pg_indexes
      where schemaname = 'public' and tablename = 'planner_goals'
    `);
    const indexNames = indexCheck.rows.map((row) => row.indexname);
    for (const index of [
      'idx_planner_goals_owner_person',
      'idx_planner_goals_created_by_person',
      'idx_planner_goals_personal',
    ]) {
      check(indexNames.includes(index), `planner_goals index ${index} exists`);
    }

    const legacyRoot = await client.query(`select count(*) as count from public.planner_plans`);
    console.log(
      `INFO: local Plan rows = ${
        Number(shape.rows[0].personal_goals) + Number(shape.rows[0].household_goals)
      } (personal ${shape.rows[0].personal_goals} / household ${shape.rows[0].household_goals}, trashed ${
        shape.rows[0].trashed_goals
      }); legacy planner_plans rows = ${legacyRoot.rows[0].count}`,
    );

    // -----------------------------------------------------------------------
    // Authorization foundation on the Plan root
    // -----------------------------------------------------------------------

    const privileges = await client.query(
      `select has_table_privilege('anon', 'public.planner_goals', 'select,insert,update,delete') as anon_any`,
    );
    check(
      privileges.rows[0].anon_any === false,
      'anon has no privilege on the Plan root',
    );

    const readPolicy = await client.query(`
      select pg_get_expr(pol.polqual, pol.polrelid) as predicate
      from pg_policy pol
      join pg_class c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'planner_goals'
        and pol.polname = 'planner_goals_select_visible'
        and pol.polcmd = 'r'
    `);
    check(readPolicy.rowCount === 1, 'the Plan root has exactly one SELECT policy');
    check(
      /trashed_at IS NULL/.test(readPolicy.rows[0].predicate),
      'the Plan SELECT policy hides trashed Plans',
    );
    check(
      /deleted_at IS NULL/.test(readPolicy.rows[0].predicate),
      'the Plan SELECT policy hides deleted Plans',
    );

    const writer = await client.query(`
      select
        has_function_privilege('anon', 'public.trash_goal_rpc(uuid,integer,uuid,uuid)', 'EXECUTE') as anon_exec,
        has_function_privilege('authenticated', 'public.trash_goal_rpc(uuid,integer,uuid,uuid)', 'EXECUTE') as authenticated_exec,
        p.prosecdef as security_definer,
        pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'trash_goal_rpc'
        and pg_get_function_identity_arguments(p.oid) = 'p_goal_id uuid, p_expected_version integer, p_member_id uuid, p_context_household_id uuid'
    `);
    check(writer.rowCount === 1, 'trash_goal_rpc exists');
    check(writer.rows[0].anon_exec === false, 'anon cannot execute the Plan trash writer');
    check(writer.rows[0].authenticated_exec === true, 'authenticated can execute the Plan trash writer');
    check(writer.rows[0].security_definer === true, 'the Plan trash writer is SECURITY DEFINER');
    check(
      /planner_goal_actor_context/.test(writer.rows[0].definition),
      'the Plan trash writer derives the actor through the shared actor authority',
    );
    check(
      /actor spoofing rejected/.test(writer.rows[0].definition),
      'the Plan trash writer rejects a client-supplied member id',
    );
    check(
      /planner_current_actor_has_capability\([^)]*'goal\.restore'\)/.test(writer.rows[0].definition),
      'the Plan trash writer authorizes through a goal.* capability',
    );

    // R4b: the Plan root has exactly one callable trash/restore authority. Two
    // live overloads of the same writer name would be ambiguous for PostgREST
    // and would leave a second, weaker write path on the root.
    const overloads = await client.query(`
      select p.proname, count(*)::int as overloads
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname in ('trash_goal_rpc', 'restore_goal_rpc')
      group by p.proname
    `);
    check(overloads.rowCount === 2, 'trash and restore each expose exactly one signature');
    for (const row of overloads.rows) {
      check(Number(row.overloads) === 1, `${row.proname} has a single signature`);
    }

    const sameWriterGrants = await client.query(`
      select proacl
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'restore_goal_rpc'
        and pg_get_function_identity_arguments(p.oid) = 'p_goal_id uuid, p_expected_version integer, p_member_id uuid, p_context_household_id uuid'
    `);
    check(
      /\{[^}]*\}/.test(sameWriterGrants.rows[0].proacl ?? ''),
      'the Plan restore writer grants are explicit',
    );
  } finally {
    await client.end();
  }

  console.log(`HOMEPLUS PLANS FOUNDATION DB: ${assertions} assertions passed.`);
}

main().catch((error) => {
  console.error(`DATABASE_FAILURE: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

module.exports = { main, FOUNDATION_COLUMNS, databaseUrl };