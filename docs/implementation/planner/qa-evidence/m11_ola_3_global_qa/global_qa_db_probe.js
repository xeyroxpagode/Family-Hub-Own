#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const integrationRoot = 'C:\\Users\\thega\\Desktop\\HomePlus-worktrees\\integration';
const { Client } = require(path.join(integrationRoot, 'backend', 'node_modules', 'pg'));

const DATABASE_URL = process.env.LOCAL_DATABASE_URL
  || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  throw new Error('ENVIRONMENT_FAILURE: local PostgreSQL only');
}

const PREFIX = `m11_ola3_qa_${crypto.randomUUID().slice(0, 8)}`;
const evidence = { prefix: PREFIX, checks: [], findings: [], cleanup: null };
const ids = { accounts: [], people: [], households: [], presets: [], revisions: [], drafts: [] };

function record(ok, message, details = {}) {
  evidence.checks.push({ ok, message, details });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${message}${Object.keys(details).length ? ` ${JSON.stringify(details)}` : ''}`);
  return ok;
}

function finding(id, severity, message, details = {}) {
  evidence.findings.push({ id, severity, message, details });
  console.log(`FINDING ${severity} ${id}: ${message} ${JSON.stringify(details)}`);
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

async function runAs(client, accountId, fn) {
  await client.query('reset role').catch(() => {});
  await client.query(`select set_config('request.jwt.claim.sub', $1, false)`, [accountId]);
  await client.query('set role authenticated');
  try {
    return await fn();
  } finally {
    await client.query('reset role');
  }
}

async function expectError(fn, message) {
  try {
    await fn();
    record(false, message, { error: 'no_error' });
    return null;
  } catch (error) {
    record(true, message, { code: error.code, message: error.message });
    return error;
  }
}

async function account(client, label) {
  const accountId = crypto.randomUUID();
  const personId = crypto.randomUUID();
  ids.accounts.push(accountId);
  ids.people.push(personId);
  await client.query(
    `insert into auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values ($1, 'authenticated', 'authenticated', $2, '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())`,
    [accountId, `${PREFIX}_${label}@example.test`],
  );
  await client.query(
    `insert into public.people (id, auth_user_id, display_name, default_language, personal_settings)
     values ($1, $2, $3, 'es-419', '{}'::jsonb)`,
    [personId, accountId, `${PREFIX} ${label}`],
  );
  return { accountId, personId };
}

async function household(client, owner, label) {
  const householdId = crypto.randomUUID();
  ids.households.push(householdId);
  await client.query(
    `insert into public.households (
      id, name, slug, timezone, default_language, config, created_by_person_id
    ) values ($1, $2, $3, 'America/Argentina/Buenos_Aires', 'es-419',
      '{"permissions":{"planner.templates.manage":{"coordinator":true,"adult":false},"planner.templates.use":{"coordinator":true,"adult":true},"planner.view":{"coordinator":true,"adult":true}}}'::jsonb,
      $4)`,
    [householdId, `${PREFIX} ${label}`, `${PREFIX}-${label}-${householdId}`, owner.personId],
  );
  return householdId;
}

async function member(client, householdId, user, role = 'coordinator', status = 'active', makeActive = true) {
  const memberId = crypto.randomUUID();
  const storedRole = status === 'pending' ? null : role;
  await client.query(
    `insert into public.household_members (
      id, household_id, person_id, role, status, joined_at,
      household_onboarding_status, household_onboarding_completed_at
    ) values ($1, $2, $3, $4, $5, now(), 'completed', now())`,
    [memberId, householdId, user.personId, storedRole, status],
  );
  if (status === 'active' && makeActive) {
    await client.query('update public.people set active_household_id=$1 where id=$2', [householdId, user.personId]);
  }
  return memberId;
}

function envelope(title) {
  return {
    adapter_key: 'planner.task.template.v1',
    payload_schema: 'planner.template_payload',
    payload_version: 1,
    payload: { title, category: 'qa', placeholders: [] },
  };
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function createPresetRpc(client, source, name, env, mutationId) {
  const result = await client.query(
    `select public.planner_create_preset_v1($1,$2,$3,$4::jsonb,$5,$6,$7) as result`,
    ['task', source, name, JSON.stringify(env), fingerprint(env.payload), `${mutationId}-req`, mutationId],
  );
  const body = result.rows[0].result;
  ids.presets.push(body.preset.id);
  ids.revisions.push(body.revision.id);
  return body;
}

async function autosaveDraftRpc(client, key, env, expectedVersion = null, intendedHouseholdId = null) {
  const result = await client.query(
    `select public.planner_autosave_draft_v1($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) as result`,
    [key, 'task', intendedHouseholdId ? 'household' : 'personal', intendedHouseholdId, null, null,
      JSON.stringify(env), fingerprint(env.payload), expectedVersion],
  );
  const body = result.rows[0].result;
  ids.drafts.push(body.draft.id);
  return body;
}

async function catalogChecks(client) {
  const objects = await client.query(`
    select
      to_regprocedure('public.planner_create_preset_v1(text,text,text,jsonb,text,text,text)') as create_preset,
      to_regprocedure('public.planner_autosave_draft_v1(text,text,text,uuid,uuid,uuid,jsonb,text,integer)') as autosave_draft,
      to_regprocedure('public.write_planner_plan_graph_rpc(text,text,text,text,text,uuid,uuid,integer,integer,jsonb,text)') as write_plan,
      to_regprocedure('public.create_planner_event_v1(jsonb,text,text,text,uuid,uuid,text,uuid,text,text)') as create_event,
      to_regprocedure('public.mutate_planner_task_v0(uuid,uuid,text,integer,jsonb,text,text,text,text,text)') as mutate_task
  `);
  const row = objects.rows[0];
  for (const [key, value] of Object.entries(row)) record(Boolean(value), `catalog has ${key}`, { value });

  const duplicateMigrations = await client.query(`
    select version, count(*)::int as count
      from supabase_migrations.schema_migrations
     group by version
    having count(*) > 1
  `);
  record(duplicateMigrations.rowCount === 0, 'no duplicate migration versions', { duplicates: duplicateMigrations.rows });

  const helperGrants = await client.query(`
    select proname, has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute
      from pg_proc p
     where pronamespace = 'public'::regnamespace
       and proname in ('planner_v2_reserve_idempotency','planner_v2_complete_idempotency','planner_v2_append_audit')
     order by proname
  `);
  for (const grant of helperGrants.rows) {
    record(grant.authenticated_execute === false, `private helper not executable by authenticated: ${grant.proname}`);
  }

  const directTableGrants = await client.query(`
    select relname,
      has_table_privilege('authenticated', c.oid, 'insert') as ins,
      has_table_privilege('authenticated', c.oid, 'update') as upd,
      has_table_privilege('authenticated', c.oid, 'delete') as del
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public'
      and c.relname in ('planner_events','planner_event_participants','planner_presets','planner_preset_revisions','planner_drafts','planner_plans')
    order by relname
  `);
  for (const grant of directTableGrants.rows) {
    record(!grant.ins && !grant.upd && !grant.del, `authenticated direct mutations revoked: ${grant.relname}`, grant);
  }
}

async function presetDraftBehavior(client) {
  const owner = await account(client, 'owner');
  const other = await account(client, 'other');
  const inactive = await account(client, 'inactive');
  const house = await household(client, owner, 'home');
  await member(client, house, owner, 'coordinator', 'active', true);
  await member(client, house, other, 'adult', 'active', true);
  await member(client, house, inactive, 'adult', 'suspended', false);

  const env = envelope(`${PREFIX} preset`);

  await runAs(client, owner.accountId, async () => {
    const first = await createPresetRpc(client, 'personal', `${PREFIX} personal`, env, `${PREFIX}-same-mutation`);
    const second = await createPresetRpc(client, 'personal', `${PREFIX} personal`, env, `${PREFIX}-same-mutation`);
    record(first.outcome === 'created' && second.outcome === 'created', 'duplicate preset RPC calls both execute', {
      firstPreset: first.preset.id,
      secondPreset: second.preset.id,
      sameMutationId: `${PREFIX}-same-mutation`,
    });
    if (first.preset.id !== second.preset.id) {
      finding('QA-PD-01', 'P1', 'Preset create is not idempotent: same mutation/request payload creates a second preset.', {
        firstPreset: first.preset.id,
        secondPreset: second.preset.id,
      });
    }

    const update = await client.query(
      `select public.planner_update_preset_metadata_v1($1,$2,$3,$4,$5) as result`,
      [first.preset.id, first.preset.version, `${PREFIX} renamed`, `${PREFIX}-upd-req`, `${PREFIX}-upd-mut`],
    );
    record(update.rows[0].result.outcome === 'updated', 'preset metadata update succeeds');
    const replayError = await expectError(
      () => client.query(
        `select public.planner_update_preset_metadata_v1($1,$2,$3,$4,$5) as result`,
        [first.preset.id, first.preset.version, `${PREFIX} renamed`, `${PREFIX}-upd-req`, `${PREFIX}-upd-mut`],
      ),
      'same preset update mutation with old version does not replay',
    );
    if (replayError) {
      finding('QA-PD-02', 'P1', 'Preset update retry with same mutation returns version_conflict instead of stable replay.', {
        sqlstate: replayError.code,
      });
    }

    const draftOne = await autosaveDraftRpc(client, `${PREFIX}-draft`, envelope(`${PREFIX} draft A`));
    const draftNoop = await autosaveDraftRpc(client, `${PREFIX}-draft`, envelope(`${PREFIX} draft A`), draftOne.draft.version);
    record(draftNoop.outcome === 'noop' && draftNoop.draft.id === draftOne.draft.id, 'draft autosave retry noops by client draft key');

    const trash = await client.query(
      `select public.planner_trash_draft_v1($1,$2,$3,$4) as result`,
      [draftOne.draft.id, draftOne.draft.version, `${PREFIX}-trash-req`, `${PREFIX}-trash-mut`],
    );
    record(trash.rows[0].result.outcome === 'updated', 'draft trash succeeds');
    const trashRetryError = await expectError(
      () => client.query(
        `select public.planner_trash_draft_v1($1,$2,$3,$4) as result`,
        [draftOne.draft.id, draftOne.draft.version, `${PREFIX}-trash-req`, `${PREFIX}-trash-mut`],
      ),
      'same draft trash mutation with old version does not replay',
    );
    if (trashRetryError) {
      finding('QA-PD-03', 'P1', 'Draft trash retry with same mutation returns version_conflict instead of stable replay.', {
        sqlstate: trashRetryError.code,
      });
    }
  });

  await runAs(client, other.accountId, async () => {
    const row = await client.query(
      `select count(*)::int as count from public.planner_drafts where owner_person_id <> public.current_person_id() and client_draft_key like $1`,
      [`${PREFIX}%`],
    );
    record(row.rows[0].count === 0, 'draft RLS hides another owner drafts', row.rows[0]);
  });

  await runAs(client, inactive.accountId, async () => {
    await expectError(
      () => autosaveDraftRpc(client, `${PREFIX}-inactive-household-draft`, envelope('inactive'), null, house),
      'inactive household member cannot autosave household draft',
    );
  });

  await runAs(client, owner.accountId, async () => {
    await expectError(
      () => client.query(`insert into public.planner_drafts (client_draft_key, entity_type, owner_person_id, intended_scope, adapter_key, payload_schema, payload_version, payload, content_fingerprint)
        values ($1,'task',public.current_person_id(),'personal','planner.task.template.v1','planner.template_payload',1,'{}'::jsonb,'x')`, [`${PREFIX}-direct`]),
      'authenticated direct draft insert is blocked',
    );
    await expectError(
      () => client.query(`insert into public.planner_presets (entity_type, source, owner_person_id, created_by_person_id, name)
        values ('task','personal',public.current_person_id(),public.current_person_id(),$1)`, [`${PREFIX} direct preset`]),
      'authenticated direct preset insert is blocked',
    );
  });
}

async function cleanup(client) {
  await client.query('reset role').catch(() => {});
  await client.query('begin');
  try {
    await client.query('set local session_replication_role=replica');
    if (ids.households.length || ids.people.length) {
      await client.query(`delete from public.audit_events where actor_person_id = any($1::uuid[]) or household_id = any($2::uuid[])`, [ids.people, ids.households]);
      await client.query(`delete from public.planner_idempotency_keys where actor_person_id = any($1::uuid[]) or household_id = any($2::uuid[])`, [ids.people, ids.households]);
    }
    await client.query('set local session_replication_role=origin');
    await client.query(`delete from public.planner_drafts where owner_person_id = any($1::uuid[]) or client_draft_key like $2`, [ids.people, `${PREFIX}%`]);
    await client.query(`delete from public.planner_preset_revisions where preset_id = any($1::uuid[])`, [ids.presets]);
    await client.query(`delete from public.planner_presets where id = any($1::uuid[]) or created_by_person_id = any($2::uuid[])`, [ids.presets, ids.people]);
    await client.query(`update public.people set active_household_id=null where id = any($1::uuid[])`, [ids.people]);
    await client.query(`delete from public.household_members where person_id = any($1::uuid[]) or household_id = any($2::uuid[])`, [ids.people, ids.households]);
    await client.query(`delete from public.households where id = any($1::uuid[])`, [ids.households]);
    await client.query(`delete from public.people where id = any($1::uuid[])`, [ids.people]);
    await client.query(`delete from auth.users where id = any($1::uuid[])`, [ids.accounts]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }

  const residual = await client.query(`
    select
      (select count(*)::int from auth.users where email like $1) as users,
      (select count(*)::int from public.people where display_name like $2) as people,
      (select count(*)::int from public.households where name like $2) as households,
      (select count(*)::int from public.planner_presets where name like $2) as presets,
      (select count(*)::int from public.planner_drafts where client_draft_key like $3) as drafts
  `, [`${PREFIX}%`, `${PREFIX}%`, `${PREFIX}%`]);
  evidence.cleanup = residual.rows[0];
  record(Object.values(residual.rows[0]).every((value) => value === 0), 'QA probe fixture cleanup is zero', residual.rows[0]);
}

async function main() {
  const client = await connect();
  try {
    await catalogChecks(client);
    await presetDraftBehavior(client);
  } finally {
    await cleanup(client).catch((error) => {
      evidence.cleanupError = { message: error.message, code: error.code };
      console.error(`CLEANUP_ERROR: ${error.stack || error}`);
    });
    await client.end();
  }

  const outPath = path.join(__dirname, 'global_qa_db_probe_summary.json');
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.log(`SUMMARY_WRITTEN=${outPath}`);
  console.log(`QA_DB_PROBE_FINDINGS=${evidence.findings.length}`);
}

main().catch((error) => {
  evidence.fatal = { message: error.message, code: error.code, stack: error.stack };
  const outPath = path.join(__dirname, 'global_qa_db_probe_summary.json');
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.error(error.stack || error);
  process.exitCode = 1;
});

