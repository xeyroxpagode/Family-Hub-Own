#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 1C Ownership & Privacy Enforcement tests.
 *
 * Local Supabase only. No Finance tables, migrations, RLS helpers, routes, UI,
 * or permission-role mapping are created for this stage. These tests exercise
 * the executable Finance context authority contract directly.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('../backend/node_modules/dotenv');

const root = path.resolve(__dirname, '..');
for (const rel of ['backend/.env.test.local', 'backend/.env.local', 'backend/.env', '.env.test.local', '.env.local']) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) {
    const parsed = dotenv.parse(fs.readFileSync(abs));
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

const { Client } = require('../backend/node_modules/pg');
const { createClient } = require('../backend/node_modules/@supabase/supabase-js');
const { loadTestEnvironment } = require('../tests/helpers/environment');
const { resolveFinanceContext, FINANCE_CONTEXT_TYPES } = require('../backend/src/services/finance.context.service');
const { isValidFinanceContextType } = require('../backend/src/constants/finance.constants');
const { setActiveHousehold: setActiveHouseholdController } = require('../backend/src/controllers/households.controller');

loadTestEnvironment({
  required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
});

const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter(
  (name) => !process.env[name],
);
if (missing.length) {
  console.error(`ENVIRONMENT_FAILURE: missing env: ${missing.join(', ')}`);
  process.exit(2);
}

const url = new URL(process.env.SUPABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
  console.error('ENVIRONMENT_FAILURE: Finance 1C tests are local-only.');
  process.exit(2);
}

const databaseUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let passCount = 0;
let failCount = 0;
const fixture = {
  authUserIds: [],
  personIds: [],
  householdIds: [],
  membershipIds: [],
};

function assert(condition, message) {
  if (condition) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return true;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
  return false;
}

function assertEqual(actual, expected, message) {
  return assert(
    actual === expected,
    `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`,
  );
}

function randomCredential(label) {
  return `Fin1C_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin1c-${label}-${suffix}@example.test`;
  const password = randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 1C QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 1C ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `fin1c-${crypto.randomBytes(8).toString('hex')}`,
    timezone: 'America/Argentina/Buenos_Aires',
    default_language: 'es-419',
    config: {},
    created_by_person_id: ownerPersonId,
  });
  fixture.householdIds.push(household.id);

  const joinedAt = new Date().toISOString();
  const { data: memberships, error } = await admin.from('household_members').insert(
    members.map((member) => ({
      household_id: household.id,
      person_id: member.personId,
      role: member.role,
      status: member.status || 'active',
      joined_at: joinedAt,
      household_onboarding_status: 'completed',
      household_onboarding_completed_at: joinedAt,
    })),
  ).select('*');
  if (error) throw new Error(`household_members insert failed: ${error.code || 'unknown'}: ${error.message}`);
  for (const membership of memberships) fixture.membershipIds.push(membership.id);
  return { household, memberships };
}

async function setActiveHouseholdByAdmin(personId, householdId) {
  const { error } = await admin.from('people').update({ active_household_id: householdId }).eq('id', personId);
  if (error) throw new Error(`set active_household_id failed: ${error.code || 'unknown'}: ${error.message}`);
}

async function switchActiveHouseholdViaCurrent(userId, accessToken, householdId) {
  let statusCode = 200;
  let payload = null;
  const req = { user: { id: userId }, accessToken, params: { household_id: householdId } };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return body;
    },
  };

  await setActiveHouseholdController(req, res);
  if (statusCode !== 200) {
    throw new Error(`canonical active household switch failed: ${statusCode} ${payload?.code || 'unknown'}`);
  }
  return payload;
}

async function forceActiveHouseholdForInvalidFixture(personId, householdId) {
  const parsed = new URL(databaseUrl);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
    throw new Error('ENVIRONMENT_FAILURE: force fixture is restricted to local PostgreSQL');
  }

  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 3000 });
  await client.connect();
  try {
    await client.query('begin');
    await client.query('alter table public.people disable trigger trg_validate_people_active_household');
    await client.query('update public.people set active_household_id=$1 where id=$2', [householdId, personId]);
    await client.query('alter table public.people enable trigger trg_validate_people_active_household');
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    await client.query('alter table public.people enable trigger trg_validate_people_active_household').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function login(email, password) {
  const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(`Login failed: ${error?.code || 'missing_session'}: ${error?.message}`);
  }
  return data.session.access_token;
}

async function expectError(fn, expectedCode, message) {
  let error = null;
  try {
    await fn();
  } catch (caught) {
    error = caught;
  }
  if (!error) {
    failCount += 1;
    console.error(`  FAIL: ${message} (expected error ${expectedCode}, got success)`);
    return null;
  }
  if (error.code !== expectedCode) {
    failCount += 1;
    console.error(`  FAIL: ${message} (expected ${expectedCode}, got ${error.code}: ${error.message})`);
    return null;
  }
  passCount += 1;
  console.log(`  PASS: ${message} (code=${error.code})`);
  return error;
}

async function cleanupFixture() {
  const errors = [];
  if (fixture.personIds.length) {
    const { error } = await admin.from('people').update({ active_household_id: null }).in('id', fixture.personIds);
    if (error) errors.push(`people.active_household_id ${error.code}`);
  }
  for (const householdId of fixture.householdIds) {
    const { error: memberError } = await admin.from('household_members').delete().eq('household_id', householdId);
    if (memberError) errors.push(`household_members ${memberError.code}`);
    const { error: householdError } = await admin.from('households').delete().eq('id', householdId);
    if (householdError) errors.push(`households ${householdError.code}`);
  }
  for (const personId of fixture.personIds) {
    const { error } = await admin.from('people').delete().eq('id', personId);
    if (error) errors.push(`people ${error.code}`);
  }
  for (const userId of fixture.authUserIds) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) errors.push(`auth.users ${error.code || error.message}`);
  }
  if (errors.length) console.error('CLEANUP_ERRORS:', errors.join('; '));
}

async function cleanupPreviousFin1CFixtures() {
  const { data: households } = await admin.from('households').select('id').like('slug', 'fin1c-%');
  const { data: people } = await admin.from('people').select('id, auth_user_id').like('display_name', 'Fin 1C %');
  const householdIds = (households || []).map((row) => row.id);
  const peopleRows = people || [];
  const personIds = peopleRows.map((row) => row.id);

  if (personIds.length) await admin.from('people').update({ active_household_id: null }).in('id', personIds);
  if (householdIds.length) {
    await admin.from('household_members').delete().in('household_id', householdIds);
    await admin.from('households').delete().in('id', householdIds);
  }
  if (personIds.length) await admin.from('people').delete().in('id', personIds);
  for (const person of peopleRows) {
    if (person.auth_user_id) await admin.auth.admin.deleteUser(person.auth_user_id).catch(() => {});
  }

  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }).catch(() => ({ data: null }));
  for (const user of users?.users || []) {
    if (user.email?.startsWith('fin1c-') && user.email.endsWith('@example.test')) {
      await admin.auth.admin.deleteUser(user.id).catch(() => {});
    }
  }
}

async function dbSafetySnapshot() {
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 3000 });
  await client.connect();
  try {
    const trigger = await client.query("select tgname, tgenabled from pg_trigger where tgname='trg_validate_people_active_household'");
    const constraints = await client.query(
      "select conname, convalidated from pg_constraint where conname in ('people_active_household_id_fkey','household_members_pkey','household_members_household_id_fkey','household_members_person_id_fkey')",
    );
    const policies = await client.query(
      "select count(*)::int as n from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('people','households','household_members')",
    );
    const settings = await client.query("select name, setting from pg_settings where name in ('row_security','session_replication_role')");
    const finPeople = await client.query("select count(*)::int as n from public.people where display_name like 'Fin 1C %'");
    const finHouseholds = await client.query("select count(*)::int as n from public.households where slug like 'fin1c-%'");
    const finAuth = await client.query("select count(*)::int as n from auth.users where email like 'fin1c-%@example.test'");
    const orphanActive = await client.query(
      "select count(*)::int as n from public.people p left join public.household_members m on m.household_id = p.active_household_id and m.person_id = p.id and m.status='active' where p.active_household_id is not null and m.id is null",
    );
    return {
      trigger: trigger.rows,
      constraints: constraints.rows,
      policies: policies.rows[0].n,
      settings: settings.rows,
      finPeople: finPeople.rows[0].n,
      finHouseholds: finHouseholds.rows[0].n,
      finAuth: finAuth.rows[0].n,
      orphanActive: orphanActive.rows[0].n,
    };
  } finally {
    await client.end();
  }
}

async function assertDbSafety(label, expectNoFixture) {
  const state = await dbSafetySnapshot();
  const trigger = state.trigger.find((row) => row.tgname === 'trg_validate_people_active_household');
  const rowSecurity = state.settings.find((row) => row.name === 'row_security');
  const replication = state.settings.find((row) => row.name === 'session_replication_role');
  assert(trigger?.tgenabled === 'O', `${label}: active household trigger remains enabled`);
  assert(state.constraints.length >= 4 && state.constraints.every((row) => row.convalidated), `${label}: core constraints remain validated`);
  assert(state.policies >= 12, `${label}: canonical Current policies remain present`);
  assert(rowSecurity?.setting === 'on', `${label}: row_security remains on`);
  assert(replication?.setting === 'origin', `${label}: session_replication_role remains origin`);
  assertEqual(state.orphanActive, 0, `${label}: active_household invariants hold`);
  if (expectNoFixture) {
    assertEqual(state.finPeople, 0, `${label}: no residual Fin 1C people fixtures`);
    assertEqual(state.finHouseholds, 0, `${label}: no residual Fin 1C household fixtures`);
    assertEqual(state.finAuth, 0, `${label}: no residual Fin 1C auth fixtures`);
  }
}

async function testPersonalOwnerResolution() {
  console.log('\nT1 - Personal owner resolution');
  const { user, email, password } = await createAuthUser('personal-owner');
  const person = await createPerson(user.id, 'PersonalOwner');
  const accessToken = await login(email, password);
  const ctx = await resolveFinanceContext({ user: { id: user.id }, accessToken }, FINANCE_CONTEXT_TYPES.PERSONAL);
  assertEqual(ctx.contextType, FINANCE_CONTEXT_TYPES.PERSONAL, 'PERSONAL contextType');
  assertEqual(ctx.personId, person.id, 'PERSONAL resolves authenticated current Person');
  assertEqual(ctx.householdId, null, 'PERSONAL householdId is null');
  assertEqual(ctx.household, null, 'PERSONAL does not load household');
  assertEqual(ctx.membershipId, null, 'PERSONAL membershipId is null');
  assertEqual(ctx.membership, null, 'PERSONAL does not load membership');
  assert(!Array.isArray(ctx.memberships), 'PERSONAL does not expose membership list');
  assert(!Array.isArray(ctx.households), 'PERSONAL does not expose household list');
}

async function testCrossUserPersonalPrivacy() {
  console.log('\nT2/T3/T4 - Cross-user Personal privacy and roles');
  const userA = await createAuthUser('user-a');
  const userB = await createAuthUser('user-b');
  const personA = await createPerson(userA.user.id, 'UserA');
  const personB = await createPerson(userB.user.id, 'UserB');

  const sharedAdult = await createHousehold('Fin 1C Shared Adult', personA.id, [
    { personId: personA.id, role: 'coordinator', status: 'active' },
    { personId: personB.id, role: 'adult', status: 'active' },
  ]);
  await setActiveHouseholdByAdmin(personA.id, sharedAdult.household.id);
  await setActiveHouseholdByAdmin(personB.id, sharedAdult.household.id);

  const tokenB = await login(userB.email, userB.password);
  const adultCtx = await resolveFinanceContext({ user: { id: userB.user.id }, accessToken: tokenB }, FINANCE_CONTEXT_TYPES.PERSONAL);
  assertEqual(adultCtx.personId, personB.id, 'User B adult PERSONAL resolves User B');
  assert(adultCtx.personId !== personA.id, 'User B adult cannot receive User A Personal scope');

  const sharedCoordinator = await createHousehold('Fin 1C Shared Coordinator', personA.id, [
    { personId: personA.id, role: 'adult', status: 'active' },
    { personId: personB.id, role: 'coordinator', status: 'active' },
  ]);
  await setActiveHouseholdByAdmin(personB.id, sharedCoordinator.household.id);

  const coordinatorCtx = await resolveFinanceContext({ user: { id: userB.user.id }, accessToken: tokenB }, FINANCE_CONTEXT_TYPES.PERSONAL);
  assertEqual(coordinatorCtx.personId, personB.id, 'User B coordinator PERSONAL resolves User B');
  assert(coordinatorCtx.personId !== personA.id, 'Coordinator status does not pierce User A Personal scope');

  await expectError(
    () => resolveFinanceContext(
      { user: { id: userB.user.id }, accessToken: tokenB },
      FINANCE_CONTEXT_TYPES.PERSONAL,
      { personId: personA.id },
    ),
    'finance_person_id_forbidden',
    'User B cannot target User A via personId override',
  );
}

async function testHouseholdPrivacyAndInjections() {
  console.log('\nT5/T6/T10/T11/T12 - Household active-only and injection denial');
  const { user, email, password } = await createAuthUser('multi-household');
  const person = await createPerson(user.id, 'MultiHousehold');
  const householdA = await createHousehold('Fin 1C Household A', person.id, [
    { personId: person.id, role: 'adult', status: 'active' },
  ]);
  const householdB = await createHousehold('Fin 1C Household B', person.id, [
    { personId: person.id, role: 'adult', status: 'active' },
  ]);
  await setActiveHouseholdByAdmin(person.id, householdA.household.id);
  const accessToken = await login(email, password);

  const ctx = await resolveFinanceContext({ user: { id: user.id }, accessToken }, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  assertEqual(ctx.householdId, householdA.household.id, 'HOUSEHOLD resolves active Household A');
  assert(ctx.householdId !== householdB.household.id, 'Additional membership B is not targeted while active=A');

  await expectError(
    () => resolveFinanceContext({ user: { id: user.id }, accessToken }, FINANCE_CONTEXT_TYPES.HOUSEHOLD, { householdId: householdB.household.id }),
    'finance_household_id_forbidden',
    'arbitrary householdId injection rejected',
  );
  await expectError(
    () => resolveFinanceContext({ user: { id: user.id }, accessToken }, FINANCE_CONTEXT_TYPES.PERSONAL, { ownerPersonId: crypto.randomUUID() }),
    'finance_owner_person_id_forbidden',
    'arbitrary ownerPersonId injection rejected',
  );
  await expectError(
    () => resolveFinanceContext({ user: { id: user.id }, accessToken }, FINANCE_CONTEXT_TYPES.HOUSEHOLD, { membershipId: householdB.memberships[0].id }),
    'finance_membership_id_forbidden',
    'arbitrary membershipId injection rejected',
  );
}

async function testDenySafeCases() {
  console.log('\nT7/T8/T9/T15/T16 - Deny-safe cases');
  const noPerson = await createAuthUser('no-person');
  const noPersonToken = await login(noPerson.email, noPerson.password);
  await expectError(
    () => resolveFinanceContext({ user: { id: noPerson.user.id }, accessToken: noPersonToken }, FINANCE_CONTEXT_TYPES.PERSONAL),
    'person_not_found',
    'no Person is denied',
  );

  const noActive = await createAuthUser('no-active');
  const noActivePerson = await createPerson(noActive.user.id, 'NoActive');
  const noActiveToken = await login(noActive.email, noActive.password);
  await expectError(
    () => resolveFinanceContext({ user: { id: noActive.user.id }, accessToken: noActiveToken }, FINANCE_CONTEXT_TYPES.HOUSEHOLD),
    'no_active_household',
    'HOUSEHOLD with no active Household denied',
  );
  const personalCtx = await resolveFinanceContext(
    { user: { id: noActive.user.id }, accessToken: noActiveToken },
    FINANCE_CONTEXT_TYPES.PERSONAL,
  );
  assertEqual(personalCtx.personId, noActivePerson.id, 'PERSONAL remains valid without active Household');

  const inactiveUser = await createAuthUser('inactive-member');
  const inactivePerson = await createPerson(inactiveUser.user.id, 'InactiveMember');
  const inactiveHousehold = await createHousehold('Fin 1C Inactive Household', inactivePerson.id, [
    { personId: inactivePerson.id, role: 'adult', status: 'suspended' },
  ]);
  await forceActiveHouseholdForInvalidFixture(inactivePerson.id, inactiveHousehold.household.id);
  const inactiveToken = await login(inactiveUser.email, inactiveUser.password);
  await expectError(
    () => resolveFinanceContext({ user: { id: inactiveUser.user.id }, accessToken: inactiveToken }, FINANCE_CONTEXT_TYPES.HOUSEHOLD),
    'not_active_household_member',
    'HOUSEHOLD with inactive membership denied',
  );
  const inactivePersonalCtx = await resolveFinanceContext(
    { user: { id: inactiveUser.user.id }, accessToken: inactiveToken },
    FINANCE_CONTEXT_TYPES.PERSONAL,
  );
  assertEqual(inactivePersonalCtx.personId, inactivePerson.id, 'PERSONAL remains valid with inactive membership fixture');

  await expectError(
    () => resolveFinanceContext({ user: { id: noActive.user.id }, accessToken: noActiveToken }, 'family'),
    'invalid_finance_context_type',
    'invalid context denied',
  );
  assertEqual(isValidFinanceContextType('family'), false, 'invalid context has no validation fallback');
}

async function testActiveHouseholdSwitch() {
  console.log('\nT13/T14 - Global active Household A to B switch');
  const { user, email, password } = await createAuthUser('switcher');
  const person = await createPerson(user.id, 'Switcher');
  const householdA = await createHousehold('Fin 1C Switch A', person.id, [
    { personId: person.id, role: 'adult', status: 'active' },
  ]);
  const householdB = await createHousehold('Fin 1C Switch B', person.id, [
    { personId: person.id, role: 'adult', status: 'active' },
  ]);
  await setActiveHouseholdByAdmin(person.id, householdA.household.id);
  const accessToken = await login(email, password);

  const personalBefore = await resolveFinanceContext({ user: { id: user.id }, accessToken }, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdBefore = await resolveFinanceContext({ user: { id: user.id }, accessToken }, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  assertEqual(householdBefore.householdId, householdA.household.id, 'initial HOUSEHOLD resolves A');
  assertEqual(personalBefore.personId, person.id, 'initial PERSONAL resolves same Person');

  const afterFinanceReads = await admin.from('people').select('active_household_id').eq('id', person.id).single();
  assertEqual(afterFinanceReads.data?.active_household_id, householdA.household.id, 'Finance context resolution does not mutate active Household');

  await switchActiveHouseholdViaCurrent(user.id, accessToken, householdB.household.id);
  const householdAfter = await resolveFinanceContext({ user: { id: user.id }, accessToken }, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const personalAfter = await resolveFinanceContext({ user: { id: user.id }, accessToken }, FINANCE_CONTEXT_TYPES.PERSONAL);
  assertEqual(householdAfter.householdId, householdB.household.id, 'subsequent HOUSEHOLD resolves B after Current switch');
  assertEqual(personalAfter.personId, personalBefore.personId, 'PERSONAL Person identity unchanged across A to B');
}

async function testStaticNoFinancePermissionOrSchema() {
  console.log('\nStatic 1C contract - no permission package or schema');
  const serviceSource = fs.readFileSync(path.join(root, 'backend/src/services/finance.context.service.js'), 'utf8');
  const constantsSource = fs.readFileSync(path.join(root, 'backend/src/constants/finance.constants.js'), 'utf8');
  const indexSource = fs.readFileSync(path.join(root, 'backend/index.js'), 'utf8');
  const combined = `${serviceSource}\n${constantsSource}`;
  const forbiddenSymbols = [
    'FinancePermissionService',
    'FinanceACL',
    'FinanceAuthorizationFramework',
    'FinancePolicyEngine',
    'FinanceRole',
    'FINANCE_ROLES',
    'is_finance_member',
    'is_finance_owner',
    'finance_can_access',
  ];
  for (const symbol of forbiddenSymbols) {
    assert(!combined.includes(symbol), `no Finance permission/RLS duplicate symbol: ${symbol}`);
  }
assert(!/FinanceUser|FinanceHousehold|FinanceMembership|FinancePermission/i.test(indexSource), 'No duplicate Finance identity authority is registered');

  const migrationsDir = path.join(root, 'supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'));
  const financeSchemaFiles = migrationFiles.filter((name) => /finance/i.test(name));
  assertEqual(
    JSON.stringify(financeSchemaFiles),
    JSON.stringify([
      '20260813010000_finance_category_authority_v1_1.sql',
      '20260813020000_finance_expense_income_transactions_v1_1.sql',
      '20260814010000_finance_account_authority_v1_1.sql',
      '20260814020000_finance_balance_anchor_account_effects_v1_1.sql',
      '20260814030000_finance_balance_correction_v1_1.sql',
      '20260814040000_finance_credit_card_purchase_semantics_v1_1.sql',
      '20260814050000_finance_canonical_transfer_v1_1.sql',
      '20260814060000_finance_cross_currency_transfer_v1_1.sql',
      '20260814070000_finance_transfer_commission_composition_v1_1.sql',
      '20260814080000_finance_account_effect_status_foundation_v1_1.sql',
      '20260815020000_finance_transaction_lifecycle_foundation_v1_1.sql',
    ]),
    'Only accepted 2B/2C/3A/3B/3C/3D/3E/3F/3G/4B/4C Finance migrations exist',
  );
}

async function main() {
  console.log('FINANCE_1C_LOCAL_SUPABASE_MODE=CONNECT');
  let cleaned = false;
  try {
    await cleanupPreviousFin1CFixtures();
    await assertDbSafety('PRE-1C-RUNTIME', false);
    await testPersonalOwnerResolution();
    await testCrossUserPersonalPrivacy();
    await testHouseholdPrivacyAndInjections();
    await testDenySafeCases();
    await testActiveHouseholdSwitch();
    await testStaticNoFinancePermissionOrSchema();
    await cleanupFixture();
    cleaned = true;
    await assertDbSafety('POST-1C-CLEANUP', true);
  } finally {
    if (!cleaned) {
      console.log('\nCLEANUP_FIXTURE');
      await cleanupFixture();
    }
  }

  console.log(`\nFINANCE_1C_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_1C_OWNERSHIP_PRIVACY_ENFORCEMENT_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_1C_OWNERSHIP_PRIVACY_ENFORCEMENT_TESTS=PASS');
  }
}

main().catch((error) => {
  console.error(`FATAL: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  cleanupFixture().finally(() => {
    process.exitCode = 1;
  });
});
