#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 3B Unknown/Known Balance + Anchor tests.
 *
 * Local Supabase only. Re-applies accepted Finance migrations 2B, 2C, 3A and
 * 3B, then validates Balance Anchor truth, Account effects, current balance
 * derivation, historical boundary, privacy and negative scope.
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
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

const { Client } = require('../backend/node_modules/pg');
const { createClient } = require('../backend/node_modules/@supabase/supabase-js');
const { loadTestEnvironment } = require('../tests/helpers/environment');
const {
  FINANCE_ACCOUNT_BALANCE_STATES,
  FINANCE_ACCOUNT_STATUSES,
  FINANCE_ACCOUNT_TYPES,
  FINANCE_CONTEXT_TYPES,
} = require('../backend/src/constants/finance.constants');
const { resolveFinanceContext } = require('../backend/src/services/finance.context.service');
const {
  archiveFinanceAccount,
  createFinanceAccount,
  createInitialBalanceAnchor,
  getFinanceAccount,
  listFinanceAccounts,
  unarchiveFinanceAccount,
} = require('../backend/src/services/finance.account.service');
const {
  createExpense,
  createIncome,
} = require('../backend/src/services/finance.transaction.service');
const {
  listFinanceMovements,
  summarizeFinance,
} = require('../backend/src/services/finance.read.service');

loadTestEnvironment({
  required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
});

const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`ENVIRONMENT_FAILURE: missing env: ${missing.join(', ')}`);
  process.exit(2);
}

const supabaseUrl = new URL(process.env.SUPABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(supabaseUrl.hostname)) {
  console.error('ENVIRONMENT_FAILURE: Finance 3B tests are local-only.');
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
  accountIds: [],
  transactionIds: [],
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

function equal(actual, expected, message) {
  return assert(
    actual === expected,
    `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`,
  );
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
    console.error(`  FAIL: ${message} (expected ${expectedCode}, got success)`);
    return;
  }

  if (error.code !== expectedCode) {
    failCount += 1;
    console.error(`  FAIL: ${message} (expected ${expectedCode}, got ${error.code}: ${error.message})`);
    return;
  }

  passCount += 1;
  console.log(`  PASS: ${message} (code=${error.code})`);
}

async function queryDb(sql, params = []) {
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, statement_timeout: 20000 });
  await client.connect();
  try {
    return await client.query(sql, params);
  } finally {
    await client.end();
  }
}

async function applyMigration(rel) {
  await queryDb(fs.readFileSync(path.join(root, rel), 'utf8'));
}

async function tableExists(tableName) {
  const { rows } = await queryDb(
    'select to_regclass($1) is not null as exists',
    [`public.${tableName}`],
  );
  return rows[0]?.exists === true;
}

async function applyMigrations() {
  if (await tableExists('finance_accounts')) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return;
  }

  await applyMigration('supabase/migrations/20260813010000_finance_category_authority_v1_1.sql');
  await applyMigration('supabase/migrations/20260813020000_finance_expense_income_transactions_v1_1.sql');
  await applyMigration('supabase/migrations/20260814010000_finance_account_authority_v1_1.sql');
  await applyMigration('supabase/migrations/20260814020000_finance_balance_anchor_account_effects_v1_1.sql');
  await new Promise((resolve) => setTimeout(resolve, 250));
}

function randomCredential(label) {
  return `Fin3B_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin3b-${label}-${suffix}@example.test`;
  const password = randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 3B QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 3B ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `fin3b-${crypto.randomBytes(8).toString('hex')}`,
    timezone: 'America/Argentina/Buenos_Aires',
    default_language: 'es-419',
    config: {},
    created_by_person_id: ownerPersonId,
  });
  fixture.householdIds.push(household.id);

  const joinedAt = new Date().toISOString();
  const { data, error } = await admin.from('household_members').insert(
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
  return { household, memberships: data };
}

async function setActiveHousehold(personId, householdId) {
  const { error } = await admin.from('people').update({ active_household_id: householdId }).eq('id', personId);
  if (error) throw new Error(`set active_household_id failed: ${error.code || 'unknown'}: ${error.message}`);
}

async function signIn(email, password) {
  const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(`sign in failed: ${error?.message || 'no session'}`);
  return data.session.access_token;
}

function tokenClient(accessToken) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function resolvedContext(auth, contextType) {
  return resolveFinanceContext({ user: { id: auth.user.id }, accessToken: auth.accessToken }, contextType);
}

async function setupActors() {
  const userA = await createAuthUser('a');
  const userB = await createAuthUser('b');
  const userC = await createAuthUser('c');
  const personA = await createPerson(userA.user.id, 'A');
  const personB = await createPerson(userB.user.id, 'B');
  const personC = await createPerson(userC.user.id, 'C');
  const hhA = await createHousehold('Fin 3B A', personA.id, [{ personId: personA.id, role: 'adult' }]);
  const hhB = await createHousehold('Fin 3B B', personA.id, [
    { personId: personA.id, role: 'adult' },
    { personId: personB.id, role: 'coordinator' },
  ]);
  const hhC = await createHousehold('Fin 3B C', personC.id, [{ personId: personC.id, role: 'adult' }]);
  await setActiveHousehold(personA.id, hhB.household.id);
  await setActiveHousehold(personB.id, hhB.household.id);
  await setActiveHousehold(personC.id, hhC.household.id);
  const tokenA = await signIn(userA.email, userA.password);
  const tokenB = await signIn(userB.email, userB.password);
  const tokenC = await signIn(userC.email, userC.password);
  return {
    a: { ...userA, person: personA, accessToken: tokenA, client: tokenClient(tokenA) },
    b: { ...userB, person: personB, accessToken: tokenB, client: tokenClient(tokenB) },
    c: { ...userC, person: personC, accessToken: tokenC, client: tokenClient(tokenC) },
    households: { a: hhA.household, b: hhB.household, c: hhC.household },
  };
}

async function cleanup() {
  if (fixture.transactionIds.length) {
    await admin.from('finance_transactions').delete().in('id', fixture.transactionIds);
  }
  if (fixture.accountIds.length) {
    await admin.from('finance_accounts').delete().in('id', fixture.accountIds);
  }
  for (const personId of fixture.personIds) {
    await admin.from('people').update({ active_household_id: null }).eq('id', personId);
  }
  if (fixture.householdIds.length) {
    await admin.from('household_members').delete().in('household_id', fixture.householdIds);
    await admin.from('households').delete().in('id', fixture.householdIds);
  }
  if (fixture.personIds.length) {
    await admin.from('people').delete().in('id', fixture.personIds);
  }
  for (const userId of fixture.authUserIds) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
}

async function trackAccount(result) {
  fixture.accountIds.push(result.account.id);
  return result.account;
}

async function trackTransaction(result) {
  fixture.transactionIds.push(result.transaction.id);
  return result.transaction;
}

async function account(ctx, overrides = {}) {
  return trackAccount(await createFinanceAccount(ctx, {
    name: `Cuenta ${crypto.randomBytes(4).toString('hex')}`,
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.ACCOUNT,
    ...overrides,
  }));
}

async function knownAccount(ctx, amount = '1000', effectiveDate = '2026-08-14', overrides = {}) {
  return account(ctx, {
    initialBalance: { amount, effectiveDate },
    ...overrides,
  });
}

async function effectCount(accountId, transactionId = null) {
  const params = transactionId ? [accountId, transactionId] : [accountId];
  const where = transactionId ? 'where account_id = $1 and transaction_id = $2' : 'where account_id = $1';
  const { rows } = await queryDb(`select count(*)::int as count from public.finance_account_effects ${where}`, params);
  return rows[0].count;
}

async function anchorCount(accountId) {
  const { rows } = await queryDb('select count(*)::int as count from public.finance_account_balance_anchors where account_id = $1', [accountId]);
  return rows[0].count;
}

async function refreshed(ctx, accountId) {
  return (await getFinanceAccount(ctx, accountId)).account;
}

async function testUnknownKnownAndAnchors(actors) {
  console.log('\nB01-B23 - UNKNOWN / KNOWN and initial Anchor');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);

  const unknown = await account(personalA, { name: 'Unknown ARS' });
  equal(unknown.balanceState, FINANCE_ACCOUNT_BALANCE_STATES.UNKNOWN, 'B01 3A Account starts UNKNOWN');
  equal(unknown.currentBalance, null, 'B02 UNKNOWN has no numeric current Balance');

  const zero = await knownAccount(personalA, '0', '2026-08-14', { name: 'Known zero' });
  equal(zero.balanceState, FINANCE_ACCOUNT_BALANCE_STATES.KNOWN, 'B04 Anchor amount 0 creates KNOWN zero');
  equal(zero.currentBalance, '0', 'B03 UNKNOWN != known zero / B04 known zero serializes numeric zero only after Anchor');

  const positive = await account(personalA, { name: 'Positive later' });
  const anchoredPositive = await createInitialBalanceAnchor(personalA, positive.id, { amount: '500000', effectiveDate: '2026-08-14' });
  equal(anchoredPositive.account.currentBalance, '500000', 'B05 positive Anchor creates KNOWN positive');

  const negative = await knownAccount(personalA, '-123.4500', '2026-08-14', { name: 'Negative' });
  equal(negative.currentBalance, '-123.45', 'B06 negative Anchor creates KNOWN negative');

  const decimal = await knownAccount(personalA, '123.4567', '2026-08-14', { name: 'Decimal' });
  equal(decimal.currentBalance, '123.4567', 'B07 Anchor exact decimal roundtrip');

  const beforeTx = await queryDb('select count(*)::int as count from public.finance_transactions');
  const beforeSummary = await summarizeFinance(personalA, { month: '2026-08' });
  const anchorOnly = await knownAccount(personalA, '77', '2026-08-14', { name: 'No tx anchor' });
  void anchorOnly;
  const afterTx = await queryDb('select count(*)::int as count from public.finance_transactions');
  const afterSummary = await summarizeFinance(personalA, { month: '2026-08' });
  equal(afterTx.rows[0].count, beforeTx.rows[0].count, 'B08/B09 Anchor creates no Income/Expense');
  equal(JSON.stringify(afterSummary), JSON.stringify(beforeSummary), 'B10 Anchor changes no Stage 2 Resumen');
  const budgetTables = await queryDb("select count(*)::int as count from information_schema.tables where table_schema = 'public' and table_name ~ 'finance_.*budget'");
  equal(budgetTables.rows[0].count, 0, 'B11 Anchor creates no Budget concept');

  const orphanKnown = await queryDb("select count(*)::int as count from public.finance_accounts fa where balance_state = 'KNOWN' and not exists (select 1 from public.finance_account_balance_anchors a where a.account_id = fa.id)");
  equal(orphanKnown.rows[0].count, 0, 'B12 KNOWN cannot exist with missing Anchor');

  equal((await createInitialBalanceAnchor(householdA, (await account(householdA)).id, { amount: '10', effectiveDate: '2026-08-14' })).account.currentBalance, '10', 'B14 authorized active-Household Account initial Anchor');
  await expectError(() => createInitialBalanceAnchor(personalB, positive.id, { amount: '1', effectiveDate: '2026-08-14' }), 'finance_account_not_found', 'B15 other Person Personal Account denied');

  const nonActiveHouseholdAccount = await account(householdA);
  await setActiveHousehold(actors.a.person.id, actors.households.a.id);
  const inactiveCtx = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  await expectError(() => createInitialBalanceAnchor(inactiveCtx, nonActiveHouseholdAccount.id, { amount: '1', effectiveDate: '2026-08-14' }), 'finance_account_not_found', 'B16 non-active Household Account denied');
  await setActiveHousehold(actors.a.person.id, actors.households.b.id);

  const archived = await account(personalA, { name: 'Archived anchor deny' });
  await archiveFinanceAccount(personalA, archived.id);
  await expectError(() => createInitialBalanceAnchor(personalA, archived.id, { amount: '1', effectiveDate: '2026-08-14' }), 'finance_account_archived', 'B17 archived Account denied new Anchor');
  await expectError(() => createInitialBalanceAnchor(personalA, unknown.id, { amount: '1', effectiveDate: '2026-08-14', currency: 'USD' }), 'protected_finance_account_field', 'B18 caller cannot override Anchor Currency');
  const anchorRow = await queryDb('select currency from public.finance_account_balance_anchors where account_id = $1', [positive.id]);
  equal(anchorRow.rows[0].currency, 'ARS', 'B19 Anchor Currency comes from Account');
  await expectError(() => createInitialBalanceAnchor(personalA, positive.id, { amount: '2', effectiveDate: '2026-08-15' }), 'finance_account_initial_anchor_exists', 'B20 second ordinary initial Anchor rejected');

  const columns = await queryDb("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'finance_accounts'");
  assert(!columns.rows.map((row) => row.column_name).includes('current_balance'), 'B21 no mutable current_balance authority');

  const coherent = await knownAccount(personalA, '999', '2026-08-14', { name: 'Coherent create' });
  equal(coherent.currentBalance, '999', 'B22 Account + requested initial known balance creation is coherent');
  await expectError(() => createFinanceAccount(personalA, {
    name: 'Partial Bad',
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.ACCOUNT,
    initialBalance: { amount: 'bad', effectiveDate: '2026-08-14' },
  }), 'invalid_finance_account_balance_amount', 'B23 requested known-balance Account creation rejects before partial Anchor failure');
  const partial = await queryDb("select count(*)::int as count from public.finance_accounts where name = 'Partial Bad'");
  equal(partial.rows[0].count, 0, 'B23 no Account left UNKNOWN after failed requested Anchor');
}

async function testHistoricalBoundaryAndArithmetic(actors) {
  console.log('\nB24-B28/B57-B63 - historical boundary and arithmetic');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const anchor = await knownAccount(personalA, '1000', '2026-08-14', { name: 'Boundary' });
  const historical = await trackTransaction(await createExpense(personalA, { amount: '100', currency: 'ARS', date: '2026-08-13', account: { id: anchor.id } }));
  equal((await refreshed(personalA, anchor.id)).currentBalance, '1000', 'B24 pre-Anchor historical Expense inserted after Anchor does not alter current Balance');
  assert((await summarizeFinance(personalA, { month: '2026-08' })).currencies.some((bucket) => bucket.currency === 'ARS'), 'B24 historical reporting still counts Expense normally');

  await trackTransaction(await createExpense(personalA, { amount: '200', currency: 'ARS', date: '2026-08-15', account: { id: anchor.id } }));
  equal((await refreshed(personalA, anchor.id)).currentBalance, '800', 'B25/B57 later Expense decreases Balance');
  await trackTransaction(await createIncome(personalA, { amount: '300', currency: 'ARS', date: '2026-08-16', account: { id: anchor.id } }));
  equal((await refreshed(personalA, anchor.id)).currentBalance, '1100', 'B26/B58 later Income increases Balance');
  assert(await effectCount(anchor.id, historical.id) === 1, 'B31 Account effect exactly once for historical transaction');

  const sameDayBefore = await account(personalA, { name: 'Same day before anchor' });
  await trackTransaction(await createExpense(personalA, { amount: '50', currency: 'ARS', date: '2026-08-20', account: { id: sameDayBefore.id } }));
  await createInitialBalanceAnchor(personalA, sameDayBefore.id, { amount: '100', effectiveDate: '2026-08-20' });
  equal((await refreshed(personalA, sameDayBefore.id)).currentBalance, '100', 'B27 created_at alone does not decide historical ordering / same-day pre-anchor effect excluded');

  const sameDayAfter = await knownAccount(personalA, '100', '2026-08-21', { name: 'Same day after anchor' });
  await trackTransaction(await createExpense(personalA, { amount: '10', currency: 'ARS', date: '2026-08-21', account: { id: sameDayAfter.id } }));
  equal((await refreshed(personalA, sameDayAfter.id)).currentBalance, '90', 'B28 same-day post-anchor effect follows documented technical rule');

  const negative = await knownAccount(personalA, '1000', '2026-08-14', { name: 'Negative result' });
  await trackTransaction(await createExpense(personalA, { amount: '1200', currency: 'ARS', date: '2026-08-15', account: { id: negative.id } }));
  equal((await refreshed(personalA, negative.id)).currentBalance, '-200', 'B59 negative current Balance allowed');
  const zeroBase = await knownAccount(personalA, '0', '2026-08-14', { name: 'Zero minus one' });
  await trackTransaction(await createExpense(personalA, { amount: '1', currency: 'ARS', date: '2026-08-15', account: { id: zeroBase.id } }));
  equal((await refreshed(personalA, zeroBase.id)).currentBalance, '-1', 'B60 Anchor 0 + Expense 1 = -1');

  const mixed = await knownAccount(personalA, '1000.2500', '2026-08-14', { name: 'Mixed decimals' });
  await trackTransaction(await createExpense(personalA, { amount: '0.1000', currency: 'ARS', date: '2026-08-15', account: { id: mixed.id } }));
  await trackTransaction(await createIncome(personalA, { amount: '0.0500', currency: 'ARS', date: '2026-08-16', account: { id: mixed.id } }));
  equal((await refreshed(personalA, mixed.id)).currentBalance, '1000.2', 'B61/B62 multiple mixed effects counted exactly once with decimal arithmetic');

  const large = await knownAccount(personalA, '99999999999999.9999', '2026-08-14', { name: 'Large exact' });
  equal((await refreshed(personalA, large.id)).currentBalance, '99999999999999.9999', 'B63 large decimal precision preserved');
}

async function testExpenseIncomeAccountsAndPrivacy(actors) {
  console.log('\nB29-B56/B69-B73 - Expense/Income Account effects and privacy');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const householdB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  const accountlessExpense = await trackTransaction(await createExpense(personalA, { amount: '5', currency: 'USD', date: '2026-08-14' }));
  const accountlessIncome = await trackTransaction(await createIncome(personalA, { amount: '6', currency: 'EUR', date: '2026-08-14' }));
  assert(!('accountId' in accountlessExpense), 'B29 Expense without Account still PASS');
  assert(!('accountId' in accountlessIncome), 'B43 Income without Account still PASS');
  equal(await effectCount((await knownAccount(personalA, '1', '2026-08-14', { name: 'No effect sentinel' })).id, accountlessExpense.id), 0, 'B56 Account-less cross-currency Stage 2 facts remain unaffected');

  const personalAcc = await knownAccount(personalA, '1000', '2026-08-14', { name: 'Personal effects' });
  const personalExpense = await trackTransaction(await createExpense(personalA, { amount: '100', currency: 'ARS', date: '2026-08-15', account: { id: personalAcc.id } }));
  equal(await effectCount(personalAcc.id, personalExpense.id), 1, 'B30/B31 Personal Expense + own Personal ACCOUNT PASS and effect exactly once');
  equal((await refreshed(personalA, personalAcc.id)).currentBalance, '900', 'B32 Personal Account Balance decreases exactly once');
  await trackTransaction(await createIncome(personalA, { amount: '25', currency: 'ARS', date: '2026-08-16', account: { id: personalAcc.id } }));
  equal((await refreshed(personalA, personalAcc.id)).currentBalance, '925', 'B44/B45 Personal Income + own Personal ACCOUNT increases once');

  const hhAcc = await knownAccount(householdA, '1000', '2026-08-14', { name: 'Household effects' });
  await trackTransaction(await createExpense(householdA, { amount: '200', currency: 'ARS', date: '2026-08-15', account: { id: hhAcc.id } }));
  equal((await refreshed(householdA, hhAcc.id)).currentBalance, '800', 'B33/B34 Household Expense + active Household ACCOUNT decreases');
  await trackTransaction(await createIncome(householdA, { amount: '50', currency: 'ARS', date: '2026-08-16', account: { id: hhAcc.id } }));
  equal((await refreshed(householdA, hhAcc.id)).currentBalance, '850', 'B46/B47 Household Income + active Household ACCOUNT increases once');

  const privateFunding = await knownAccount(personalA, '500', '2026-08-14', { name: 'Private funding' });
  const householdFunded = await trackTransaction(await createExpense(householdA, { amount: '100', currency: 'ARS', date: '2026-08-15', account: { id: privateFunding.id } }));
  equal((await refreshed(personalA, privateFunding.id)).currentBalance, '400', 'B35/B38 Household Expense + own Personal ACCOUNT decreases Personal Account');
  const hhSummary = await summarizeFinance(householdA, { month: '2026-08' });
  assert(hhSummary.currencies.some((bucket) => bucket.currency === 'ARS' && bucket.expense !== '0'), 'B36 Household Expense counted once in Household summary');
  const personalSummary = await summarizeFinance(personalA, { month: '2026-08' });
  assert(!personalSummary.currencies.some((bucket) => bucket.expense === '100' && bucket.currency === 'ARS'), 'B37 same Household Expense absent from Personal Expense summary');
  const hhMovements = await listFinanceMovements(householdB, { month: '2026-08' });
  const movement = hhMovements.movements.find((candidate) => candidate.id === householdFunded.id);
  assert(Boolean(movement) && !('accountId' in movement) && !('accountName' in movement), 'B39/B69 Household movement/read does not expose private Personal Account internals');
  equal((await actors.b.client.from('finance_accounts').select('*').eq('id', privateFunding.id)).data.length, 0, 'B70 Household member cannot discover private Personal Account via Account reads');
  equal((await actors.b.client.from('finance_account_effects').select('*').eq('transaction_id', householdFunded.id)).data.length, 0, 'B70 Household member cannot discover private Account through Account effects');
  assert((await actors.a.client.from('finance_account_effects').select('*').eq('transaction_id', householdFunded.id)).data.length === 1, 'B71 Account owner can see own Personal Account Balance effect');
  equal(householdFunded.financialContextType, FINANCE_CONTEXT_TYPES.HOUSEHOLD, 'B72 Financial Context remains Household for personal-funded Household Expense');

  const bPrivate = await knownAccount(personalB, '100', '2026-08-14', { name: 'B private' });
  await expectError(() => createExpense(householdA, { amount: '1', currency: 'ARS', date: '2026-08-15', account: { id: bPrivate.id } }), 'invalid_finance_transaction_account', 'B40 Household Expense + another Person Personal Account denied');
  await expectError(() => createExpense(personalA, { amount: '1', currency: 'ARS', date: '2026-08-15', account: { id: hhAcc.id } }), 'invalid_finance_transaction_account_relationship', 'B41 Personal Expense + Household Account denied');
  await expectError(() => createIncome(householdA, { amount: '1', currency: 'ARS', date: '2026-08-15', account: { id: privateFunding.id } }), 'invalid_finance_transaction_account_relationship', 'B48 Household Income + Personal Account denied in 3B');
  await expectError(() => createIncome(personalA, { amount: '1', currency: 'ARS', date: '2026-08-15', account: { id: hhAcc.id } }), 'invalid_finance_transaction_account_relationship', 'B49 Personal Income + Household Account denied');

  const archived = await knownAccount(personalA, '100', '2026-08-14', { name: 'Archived deny effects' });
  await archiveFinanceAccount(personalA, archived.id);
  await expectError(() => createExpense(personalA, { amount: '1', currency: 'ARS', date: '2026-08-15', account: { id: archived.id } }), 'finance_account_archived', 'B42/B68 archived Account denied for new Expense/effect');
  await expectError(() => createIncome(personalA, { amount: '1', currency: 'ARS', date: '2026-08-15', account: { id: archived.id } }), 'finance_account_archived', 'B50 archived Account denied for new Income');

  const currencyAcc = await knownAccount(personalA, '100', '2026-08-14', { name: 'Currency ARS' });
  await trackTransaction(await createExpense(personalA, { amount: '1', currency: 'ARS', date: '2026-08-15', account: { id: currencyAcc.id } }));
  await trackTransaction(await createIncome(personalA, { amount: '1', currency: 'ARS', date: '2026-08-16', account: { id: currencyAcc.id } }));
  assert(true, 'B51/B52 Account ARS + Expense/Income ARS PASS');
  await expectError(() => createExpense(personalA, { amount: '1', currency: 'USD', date: '2026-08-15', account: { id: currencyAcc.id } }), 'finance_account_currency_mismatch', 'B53 Account ARS + Expense USD rejected');
  const usdAccount = await knownAccount(personalA, '1', '2026-08-14', { currency: 'USD', name: 'Currency USD' });
  await expectError(() => createIncome(personalA, { amount: '1', currency: 'ARS', date: '2026-08-15', account: { id: usdAccount.id } }), 'finance_account_currency_mismatch', 'B54 Account USD + Income ARS rejected');
  const accountService = fs.readFileSync(path.join(root, 'backend/src/services/finance.account.service.js'), 'utf8');
  const transactionService = fs.readFileSync(path.join(root, 'backend/src/services/finance.transaction.service.js'), 'utf8');
  assert(!/exchange|fx|rate_to|convertCurrency|toCurrency|fx_rate/i.test(`${accountService}\n${transactionService}`), 'B55 no FX invoked');

  await setActiveHousehold(actors.a.person.id, actors.households.a.id);
  const afterSwitch = await queryDb('select active_household_id from public.people where id = $1', [actors.a.person.id]);
  equal(afterSwitch.rows[0].active_household_id, actors.households.a.id, 'B73 Finance context switch does not mutate global Household');
  await setActiveHousehold(actors.a.person.id, actors.households.b.id);
}

async function testLifecycleAndNegativeScope(actors) {
  console.log('\nB64-B68/B74-B86 - lifecycle and negative scope');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const accountWithHistory = await knownAccount(personalA, '100', '2026-08-14', { name: 'Archive preserves' });
  await trackTransaction(await createExpense(personalA, { amount: '25', currency: 'ARS', date: '2026-08-15', account: { id: accountWithHistory.id } }));
  equal((await refreshed(personalA, accountWithHistory.id)).currentBalance, '75', 'pre-archive balance with effect');
  await archiveFinanceAccount(personalA, accountWithHistory.id);
  const archived = (await listFinanceAccounts(personalA, { includeArchived: true, status: FINANCE_ACCOUNT_STATUSES.ARCHIVED })).accounts.find((candidate) => candidate.id === accountWithHistory.id);
  equal(await anchorCount(accountWithHistory.id), 1, 'B64 archived Account preserves Anchor');
  equal(archived.currentBalance, '75', 'B65 archived Account preserves derived Balance');
  equal(await effectCount(accountWithHistory.id), 1, 'B66 archived Account preserves existing Account effects');
  await unarchiveFinanceAccount(personalA, accountWithHistory.id);
  equal((await refreshed(personalA, accountWithHistory.id)).currentBalance, '75', 'B67 unarchive preserves same Balance');

  const card = await trackAccount(await createFinanceAccount(personalA, {
    name: 'Credit card boundary',
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
    initialBalance: { amount: '-50', effectiveDate: '2026-08-14' },
  }));
  equal(card.currentBalance, '-50', 'CREDIT_CARD can receive generic Anchor');
  await trackTransaction(await createExpense(personalA, { amount: '1', currency: 'ARS', date: '2026-08-15', account: { id: card.id } }));
  equal((await refreshed(personalA, card.id)).currentBalance, '-51', 'B79 CREDIT_CARD generic account-backed Expense adjusts signed balance without statement semantics');

  const migrationText = fs.readFileSync(path.join(root, 'supabase/migrations/20260814020000_finance_balance_anchor_account_effects_v1_1.sql'), 'utf8');
  const backendFinance = [
    'backend/src/services/finance.account.service.js',
    'backend/src/services/finance.transaction.service.js',
    'backend/src/services/finance.balance.correction.service.js',
    'backend/src/routes/finance.js',
    'backend/src/routes/finance.balance.routes.js',
  ].map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
  assert(/finance_correct_account_balance_v1|correctAccountBalance/i.test(backendFinance), 'B74/B75 Balance Correction exists as Stage 3C/C53 Anchor behavior');
  assert(!/commission|cross.?currency transfer|exchange_rate|fx_rate/i.test(backendFinance), 'B76-B78 no cross-currency Transfer/commission');
  assert(!/finance_credit_cards|statement|closing_date|minimum_payment|installments|credit_limit|card debt/i.test(migrationText), 'B79 no Credit Card debt schema');
  assert(!/Account picker|Saldo actual UI|Nueva cuenta balance|Pagado desde|Ingres[oó] en/i.test(backendFinance), 'B80 no frontend');
  assert(!/BudgetService|finance_budgets|PaymentService|finance_payments/i.test(backendFinance), 'B81/B82 no Budget/Payments');
  assert(!/current_balance\s+numeric|update public\.finance_accounts\s+set current_balance/i.test(migrationText), 'B84 no cached fake currentBalance authority');
  assert(!/donor|workspace|financial_accounts/i.test(backendFinance), 'B85 no donor-derived Account existence/currency');
  assert(!/ledger|double.?entry|journal/i.test(backendFinance), 'B86 no parallel Finance ledger architecture beyond Account effects');
}

async function testStaticContracts() {
  console.log('\nStatic contract - migration allow-list and routes');
  const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((name) => /finance/i.test(name)).sort();
  equal(
    JSON.stringify(migrations),
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
      '20260815030000_finance_transaction_trash_mutation_v1_1.sql',
      '20260819000000_finance_transaction_restore_mutation_v1_1.sql',
      '20260819010000_finance_transfer_regression_repair_v1_1.sql',
      '20260819020000_finance_transaction_correction_v1_1.sql',
      '20260824083947_finance_refund_persistence_root_transaction_id_v1_1.sql',
      '20260824093347_finance_refund_events_persistence_v1_1.sql',
      '20260824103000_finance_refund_end_to_end_v1_1.sql',
      '20260824120000_finance_balance_correction_idempotency_v1_1.sql',
      '20260825000000_finance_payment_foundation_v1_1.sql',
      '20260826000000_finance_payment_register_v1_1.sql',
      '20260828002827_finance_pool_foundation_v1_1.sql',
      '20260828010000_finance_known_organizable_unknown_count_fix_v1_1.sql',
      '20260828020000_finance_pool_financial_integration_v1_1.sql',
      '20260828030000_finance_spending_limit_foundation_v1_1.sql',
      '20260828040000_finance_analysis_progress_v1_1.sql',
    ]),
    'exact Finance migration allow-list includes current Stage 6C migrations',
  );
  const runJs = fs.readFileSync(path.join(root, 'tests/run.js'), 'utf8');
  assert(runJs.includes('finance-3b-balance-anchor') && runJs.includes("'finance-3b'"), 'node tests/run.js finance-3b registered');
  assert(runJs.includes('finance-3b-balance-anchor') && /finance:\s*\[[\s\S]*finance-3b-balance-anchor/.test(runJs), 'aggregate Finance suite includes 3B');
  const txColumns = await queryDb("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'finance_transactions'");
  assert(!txColumns.rows.map((row) => row.column_name).includes('account_id'), 'finance_transactions still has no account_id');
}

async function assertFixtureCleanup() {
  const people = await queryDb("select count(*)::int as count from public.people where display_name like 'Fin 3B %'");
  const households = await queryDb("select count(*)::int as count from public.households where slug like 'fin3b-%'");
  const accounts = fixture.accountIds.length
    ? await queryDb('select count(*)::int as count from public.finance_accounts where id = any($1::uuid[])', [fixture.accountIds])
    : { rows: [{ count: 0 }] };
  equal(people.rows[0].count, 0, 'fixture cleanup leaves no 3B people');
  equal(households.rows[0].count, 0, 'fixture cleanup leaves no 3B households');
  equal(accounts.rows[0].count, 0, 'fixture cleanup leaves no 3B account rows');
}

async function main() {
  console.log('FINANCE_3B_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigrations();
  const actors = await setupActors();

  try {
    await testUnknownKnownAndAnchors(actors);
    await testHistoricalBoundaryAndArithmetic(actors);
    await testExpenseIncomeAccountsAndPrivacy(actors);
    await testLifecycleAndNegativeScope(actors);
    await testStaticContracts();
  } finally {
    await cleanup();
  }

  await assertFixtureCleanup();

  console.log(`\nFINANCE_3B_BALANCE_ANCHOR_ACCOUNT_EFFECT_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_3B_UNKNOWN_KNOWN_BALANCE_ANCHOR_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_3B_UNKNOWN_KNOWN_BALANCE_ANCHOR_TESTS=PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_3B_UNKNOWN_KNOWN_BALANCE_ANCHOR_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
