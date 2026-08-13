#!/usr/bin/env node
'use strict';

/**
 * Finance V1 — Stage 1B Financial Context Authority database tests.
 *
 * Local Supabase only (REMOTE_SUPABASE_USED=NO). The resolver Finance is not
 * exposed via a REST route yet (that is deferred to 1C/1E), so these tests
 * exercise backend/src/services/finance.context.service.js directly using a
 * real authenticated access token obtained from local Supabase Auth.
 *
 * Cases covered (per DIRECTIVA DE CONTROL GENERAL stage 1B):
 *
 *   CASE 1 — Personal: authenticates -> Person exists -> resolves PERSONAL,
 *            householdId null, no Household requirement.
 *   CASE 2 — Household: Person + active_household_id + active membership ->
 *            resolves exactly that Household.
 *   CASE 3 — Multiple memberships: belongs to A/B/C, active=B -> HOUSEHOLD
 *            resolves B only; A/C cannot become Finance target via resolver.
 *   CASE 4 — No active Household: HOUSEHOLD denied; PERSONAL still resolvable.
 *   CASE 5 — Inactive membership: active_household_id present but membership
 *            not active -> HOUSEHOLD denied.
 *   CASE 6 — Arbitrary householdId injection: caller-supplied householdId is
 *            rejected by contract (FINANCE_HOUSEHOLD_ID_FORBIDDEN).
 *   CASE 7 — Invalid context type: rejected with INVALID_FINANCE_CONTEXT_TYPE.
 *   CASE 8 — No Finance duplicates: resolver reuses canonical auth/household
 *            authorities; no FinanceUser / FinanceHousehold /
 *            FinanceMembership / FinancePermissions / Finance-specific auth
 *            middleware are introduced.
 */

// Load environment FIRST, before any other imports that depend on Supabase config
const fs = require('node:fs');
const path = require('node:path');
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

// Now safe to import modules that read process.env at import time
const crypto = require('node:crypto');
const { Client } = require('../backend/node_modules/pg');
const { createClient } = require('../backend/node_modules/@supabase/supabase-js');
const { loadTestEnvironment } = require('../tests/helpers/environment');
const { resolveFinanceContext, FINANCE_CONTEXT_TYPES } = require('../backend/src/services/finance.context.service');
const { isValidFinanceContextType } = require('../backend/src/constants/finance.constants');

// ---------- Environment guard ----------

const testEnvironment = loadTestEnvironment({
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
  console.error('ENVIRONMENT_FAILURE: Finance 1B tests are local-only.');
  process.exit(2);
}

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const databaseUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

// ---------- State ----------

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
  const same = actual === expected;
  if (same) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return true;
  }
  failCount += 1;
  console.error(`  FAIL: ${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
  return false;
}

function randomCredential(label) {
  return `Fin1B_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin1b-${label}-${suffix}@example.test`;
  const password = randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 1B QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 1B ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `fin1b-${crypto.randomBytes(8).toString('hex')}`,
    timezone: 'America/Argentina/Buenos_Aires',
    default_language: 'es-419',
    config: {},
    created_by_person_id: ownerPersonId,
  });
  fixture.householdIds.push(household.id);

  const joinedAt = new Date().toISOString();
  const { data: memberships, error: memberInsertError } = await admin.from('household_members').insert(
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
  if (memberInsertError) {
    throw new Error(`household_members insert failed: ${memberInsertError.code || 'unknown'}: ${memberInsertError.message}`);
  }
  for (const m of memberships) fixture.membershipIds.push(m.id);
  return { household, memberships };
}

async function setActiveHousehold(personId, householdId) {
  const { error } = await admin
    .from('people')
    .update({ active_household_id: householdId })
    .eq('id', personId);
  if (error) throw new Error(`set active_household_id failed: ${error.code || 'unknown'}: ${error.message}`);
}

async function expectSupabaseError(fn, expectedCode, message) {
  const { error } = await fn();
  if (!error) {
    failCount += 1;
    console.error(`  FAIL: ${message} (expected Supabase error ${expectedCode}, but no error was returned)`);
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
    console.error(`  FAIL: ${message} (expected error code ${expectedCode}, but no error was thrown)`);
    return null;
  }
  if (expectedCode !== undefined && error.code !== expectedCode) {
    failCount += 1;
    console.error(`  FAIL: ${message} (expected code ${expectedCode}, got ${error.code}: ${error.message})`);
    return null;
  }
  passCount += 1;
  console.log(`  PASS: ${message} (code=${error.code})`);
  return error;
}

// ---------- Cleanup ----------

async function cleanupFixture() {
  const errors = [];
  if (fixture.personIds.length) {
    const { error } = await admin
      .from('people')
      .update({ active_household_id: null })
      .in('id', fixture.personIds);
    if (error) errors.push(`people.active_household_id ${error.code}`);
  }
  for (const hhId of fixture.householdIds) {
    const { error: mErr } = await admin.from('household_members').delete().eq('household_id', hhId);
    if (mErr) errors.push(`household_members ${mErr.code}`);
    const { error: hErr } = await admin.from('households').delete().eq('id', hhId);
    if (hErr) errors.push(`households ${hErr.code}`);
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

async function cleanupPreviousFin1BFixtures() {
  const { data: households } = await admin
    .from('households')
    .select('id')
    .like('slug', 'fin1b-%');
  const { data: people } = await admin
    .from('people')
    .select('id, auth_user_id')
    .like('display_name', 'Fin 1B %');

  const householdIds = (households || []).map((row) => row.id);
  const peopleRows = people || [];
  const personIds = peopleRows.map((row) => row.id);

  if (personIds.length) {
    await admin.from('people').update({ active_household_id: null }).in('id', personIds);
  }
  if (householdIds.length) {
    await admin.from('household_members').delete().in('household_id', householdIds);
    await admin.from('households').delete().in('id', householdIds);
  }
  if (personIds.length) {
    await admin.from('people').delete().in('id', personIds);
  }
  for (const person of peopleRows) {
    if (person.auth_user_id) await admin.auth.admin.deleteUser(person.auth_user_id).catch(() => {});
  }
}

// ---------- Tests ----------

async function case1Personal() {
  console.log('\nCASE 1 — Personal resolution');
  const { user, email, password } = await createAuthUser('personal-owner');
  const person = await createPerson(user.id, 'PersonalOwner');
  // No active_household_id set on purpose.
  const accessToken = await login(email, password);

  const ctx = await resolveFinanceContext(
    { user: { id: user.id }, accessToken },
    FINANCE_CONTEXT_TYPES.PERSONAL,
  );
  assertEqual(ctx.contextType, FINANCE_CONTEXT_TYPES.PERSONAL, 'contextType is PERSONAL');
  assertEqual(ctx.personId, person.id, 'PERSONAL resolves current person');
  assert(ctx.householdId === null, 'PERSONAL has householdId=null');
  assert(ctx.household === null, 'PERSONAL does not load a household');
  assert(ctx.membership === null && ctx.membershipId === null, 'PERSONAL has no membership');
}

async function case2Household() {
  console.log('\nCASE 2 — Household resolution');
  const { user, email, password } = await createAuthUser('household-member');
  const person = await createPerson(user.id, 'HouseholdMember');
  const { household, memberships } = await createHousehold('Fin 1B Household 2', person.id, [
    { personId: person.id, role: 'coordinator', status: 'active' },
  ]);
  await setActiveHousehold(person.id, household.id);
  const accessToken = await login(email, password);

  const ctx = await resolveFinanceContext(
    { user: { id: user.id }, accessToken },
    FINANCE_CONTEXT_TYPES.HOUSEHOLD,
  );
  assertEqual(ctx.contextType, FINANCE_CONTEXT_TYPES.HOUSEHOLD, 'contextType is HOUSEHOLD');
  assertEqual(ctx.personId, person.id, 'HOUSEHOLD still has current person');
  assertEqual(ctx.householdId, household.id, 'HOUSEHOLD resolves exactly active household');
  assertEqual(ctx.household?.id, household.id, 'household row loaded');
  assertEqual(ctx.membershipId, memberships[0].id, 'membership row loaded');
  assert(ctx.membership?.status === 'active', 'membership is active');
}

async function case3MultipleMemberships() {
  console.log('\nCASE 3 — Multiple memberships, only active global household');
  const { user, email, password } = await createAuthUser('multi-member');
  const person = await createPerson(user.id, 'MultiMember');

  // Belongs to A, B, C
  const householdA = await createHousehold('Fin 1B Household A', person.id, [
    { personId: person.id, role: 'adult', status: 'active' },
  ]);
  const householdB = await createHousehold('Fin 1B Household B', person.id, [
    { personId: person.id, role: 'adult', status: 'active' },
  ]);
  const householdC = await createHousehold('Fin 1B Household C', person.id, [
    { personId: person.id, role: 'adult', status: 'active' },
  ]);

  // active global household is B
  await setActiveHousehold(person.id, householdB.household.id);
  const accessToken = await login(email, password);

  const ctx = await resolveFinanceContext(
    { user: { id: user.id }, accessToken },
    FINANCE_CONTEXT_TYPES.HOUSEHOLD,
  );
  assertEqual(ctx.contextType, FINANCE_CONTEXT_TYPES.HOUSEHOLD, 'contextType is HOUSEHOLD');
  assertEqual(ctx.householdId, householdB.household.id, 'HOUSEHOLD resolves only B');
  assert(ctx.householdId !== householdA.household.id, 'A is NOT selectable by Finance');
  assert(ctx.householdId !== householdC.household.id, 'C is NOT selectable by Finance');
  assert(ctx.membership?.household_id === householdB.household.id, 'membership is for B only');
}

async function case4NoActiveHousehold() {
  console.log('\nCASE 4 — No active household');
  const { user, email, password } = await createAuthUser('no-active');
  await createPerson(user.id, 'NoActivePerson');
  const accessToken = await login(email, password);

  await expectError(
    () => resolveFinanceContext({ user: { id: user.id }, accessToken }, FINANCE_CONTEXT_TYPES.HOUSEHOLD),
    'no_active_household',
    'HOUSEHOLD denied without active global household',
  );

  // Personal should still resolve
  const ctx = await resolveFinanceContext(
    { user: { id: user.id }, accessToken },
    FINANCE_CONTEXT_TYPES.PERSONAL,
  );
  assertEqual(ctx.contextType, FINANCE_CONTEXT_TYPES.PERSONAL, 'PERSONAL still resolvable where auth lifecycle permits');
}

async function case5InactiveMembership() {
  console.log('\nCASE 5 — Inactive membership on active household');
  const { user, email, password } = await createAuthUser('inactive-member');
  const person = await createPerson(user.id, 'InactiveMember');
  const { household } = await createHousehold('Fin 1B Inactive Household', person.id, [
    { personId: person.id, role: 'adult', status: 'suspended' },
  ]);

  await expectSupabaseError(
    () => admin.from('people').update({ active_household_id: household.id }).eq('id', person.id),
    '23514',
    'DB authority rejects active_household_id when membership is inactive',
  );

  // Force the otherwise-invalid state only in local test DB to prove deny-safe
  // service behavior if stale data ever reaches the resolver.
  await forceActiveHouseholdForInvalidFixture(person.id, household.id);
  const accessToken = await login(email, password);

  await expectError(
    () => resolveFinanceContext({ user: { id: user.id }, accessToken }, FINANCE_CONTEXT_TYPES.HOUSEHOLD),
    'not_active_household_member',
    'HOUSEHOLD denied when membership is inactive',
  );

  // Personal still resolves
  const ctx = await resolveFinanceContext(
    { user: { id: user.id }, accessToken },
    FINANCE_CONTEXT_TYPES.PERSONAL,
  );
  assertEqual(ctx.contextType, FINANCE_CONTEXT_TYPES.PERSONAL, 'PERSONAL still resolvable when membership inactive');
}

async function case6ArbitraryInjection() {
  console.log('\nCASE 6 — Arbitrary householdId injection is rejected');
  const { user, email, password } = await createAuthUser('injection-victim');
  const person = await createPerson(user.id, 'InjectionVictim');
  const { household: realHousehold } = await createHousehold('Fin 1B Real', person.id, [
    { personId: person.id, role: 'coordinator', status: 'active' },
  ]);
  await setActiveHousehold(person.id, realHousehold.id);
  const otherHouseholdId = crypto.randomUUID();
  const accessToken = await login(email, password);

  await expectError(
    () => resolveFinanceContext(
      { user: { id: user.id }, accessToken },
      FINANCE_CONTEXT_TYPES.HOUSEHOLD,
      { householdId: otherHouseholdId },
    ),
    'finance_household_id_forbidden',
    'Caller-supplied householdId is rejected (string)',
  );
  await expectError(
    () => resolveFinanceContext(
      { user: { id: user.id }, accessToken },
      FINANCE_CONTEXT_TYPES.HOUSEHOLD,
      { householdId: realHousehold.id },
    ),
    'finance_household_id_forbidden',
    'Even the matching active householdId is rejected when explicitly passed (no second authority)',
  );
  await expectError(
    () => resolveFinanceContext(
      { user: { id: user.id }, accessToken },
      FINANCE_CONTEXT_TYPES.HOUSEHOLD,
      { householdId: '' },
    ),
    'finance_household_id_forbidden',
    'Empty string householdId still rejected (caller must not coerce the resolver)',
  );
}

async function case7InvalidContextType() {
  console.log('\nCASE 7 — Invalid context type is rejected');
  const { user, email, password } = await createAuthUser('invalid-type');
  await createPerson(user.id, 'InvalidType');
  const accessToken = await login(email, password);

  await expectError(
    () => resolveFinanceContext({ user: { id: user.id }, accessToken }, 'user'),
    'invalid_finance_context_type',
    'lowercase "user" rejected',
  );
  await expectError(
    () => resolveFinanceContext({ user: { id: user.id }, accessToken }, 'private'),
    'invalid_finance_context_type',
    '"private" rejected',
  );
  await expectError(
    () => resolveFinanceContext({ user: { id: user.id }, accessToken }, 'PERSONAL'),
    'invalid_finance_context_type',
    'Uppercase "PERSONAL" rejected (canonical is lowercase "personal")',
  );
  await expectError(
    () => resolveFinanceContext({ user: { id: user.id }, accessToken }, null),
    'invalid_finance_context_type',
    'null rejected',
  );
  await expectError(
    () => resolveFinanceContext({ user: { id: user.id }, accessToken }, undefined),
    'invalid_finance_context_type',
    'undefined rejected',
  );
  assertEqual(isValidFinanceContextType('personal'), true, 'isValidFinanceContextType("personal")');
  assertEqual(isValidFinanceContextType('household'), true, 'isValidFinanceContextType("household")');
  assertEqual(isValidFinanceContextType('PERSONAL'), false, 'uppercase is not canonical');
  assertEqual(isValidFinanceContextType('family'), false, 'arbitrary string not canonical');
}

async function case8NoDuplicateAuthorities() {
  console.log('\nCASE 8 — No Finance identity/household/membership duplication');
  const root = path.resolve(__dirname, '..');

  function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8');
  }

  const financeServiceSource = read('backend/src/services/finance.context.service.js');
  const financeConstantsSource = read('backend/src/constants/finance.constants.js');

  const forbiddenSymbols = [
    'class FinanceUser',
    'class FinanceHousehold',
    'class FinanceMembership',
    'class FinancePermissions',
    'FinanceUser',
    'FinanceHousehold',
    'FinanceMembership',
    'FinancePermissions',
    'FINANCE_ROLE',
    'FINANCE_ROLES',
    'FinanceRole',
    'financeRole',
    'financePermissions',
    'createFinanceAuthMiddleware',
    'financeAuthMiddleware',
  ];
  for (const symbol of forbiddenSymbols) {
    assert(
      !financeServiceSource.includes(symbol) && !financeConstantsSource.includes(symbol),
      `No duplication symbol: "${symbol}"`,
    );
  }

  // Must reuse canonical auth.service / httpErrors / supabase config
  assert(financeServiceSource.includes("require('../config/supabase')"), 'resolver imports supabase config (canonical AUTH)');
  assert(financeServiceSource.includes("require('../lib/httpErrors')"), 'resolver imports httpErrors (canonical error contract)');
  assert(financeServiceSource.includes("require('../constants/finance.constants')"), 'resolver imports finance.constants');

  // Must NOT depend on Planner or introduce Finance-specific middleware.
  assert(!/require\([^)]*planner/i.test(financeServiceSource), 'resolver has no Planner require/import');
  assert(!/require\([^)]*middleware/i.test(financeServiceSource), 'resolver does not require middleware');

  // Constant shape
  assert(
    financeConstantsSource.includes("PERSONAL: 'personal'") &&
      financeConstantsSource.includes("HOUSEHOLD: 'household'"),
    'Canonical values are lowercase personal/household (aligned with repo-wide scopeType)',
  );
  assert(
    financeConstantsSource.includes('Object.freeze') &&
      financeConstantsSource.includes('FINANCE_CONTEXT_TYPES'),
    'FINANCE_CONTEXT_TYPES is frozen and exported from constants',
  );

  // Server index must not register a Finance route in 1B
  const index = read('backend/index.js');
  assert(!/app\.use\(['"]\/api\/finance/i.test(index), 'No Finance route is registered in 1B (deferred to 1C/1E)');
}

// ---------- Main ----------

async function main() {
  console.log('FINANCE_1B_LOCAL_SUPABASE_MODE=CONNECT');
  try {
    await cleanupPreviousFin1BFixtures();
    await case1Personal();
    await case2Household();
    await case3MultipleMemberships();
    await case4NoActiveHousehold();
    await case5InactiveMembership();
    await case6ArbitraryInjection();
    await case7InvalidContextType();
    await case8NoDuplicateAuthorities();
  } finally {
    console.log('\nCLEANUP_FIXTURE');
    await cleanupFixture();
  }

  console.log(`\nFINANCE_1B_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_1B_FINANCIAL_CONTEXT_AUTHORITY_DATABASE_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_1B_FINANCIAL_CONTEXT_AUTHORITY_DATABASE_TESTS=PASS');
  }
}

main().catch((error) => {
  console.error(`FATAL: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  cleanupFixture().finally(() => {
    process.exitCode = 1;
  });
});
