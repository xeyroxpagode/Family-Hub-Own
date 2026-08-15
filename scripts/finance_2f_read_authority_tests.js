#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 2F-A Minimum Read Authority tests.
 *
 * Local Supabase only. Stage 2B + 2C migrations are idempotent-reapplied.
 * Validates Movimientos + Resumen minimum read projection over canonical
 * finance_transactions: privacy, scope, period (transaction_date), ordering,
 * category historical snapshot, currency separation, exact counting,
 * Net = Income - Expense, decimal-safe totals, empty-period truth, and the
 * full 2F-A negative scope (no Account-linked reads/Transfer/Refund/Payment/
 * Budget/Analysis, no frontend read expansion).
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
  FINANCE_CATEGORY_TYPES,
  FINANCE_CONTEXT_TYPES,
  FINANCE_TRANSACTION_TYPES,
} = require('../backend/src/constants/finance.constants');
const { resolveFinanceContext } = require('../backend/src/services/finance.context.service');
const {
  createFinanceCategory,
  deleteFinanceCategory,
  updateFinanceCategory,
} = require('../backend/src/services/finance.category.service');
const {
  createExpense,
  createIncome,
} = require('../backend/src/services/finance.transaction.service');
const {
  listFinanceMovements,
  summarizeFinance,
  normalizePeriodMonth,
  periodRange,
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
  console.error('ENVIRONMENT_FAILURE: Finance 2F-A tests are local-only.');
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
  categoryIds: [],
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

async function applyMigrations() {
  await applyMigration('supabase/migrations/20260813010000_finance_category_authority_v1_1.sql');
  await applyMigration('supabase/migrations/20260813020000_finance_expense_income_transactions_v1_1.sql');
  await applyMigration('supabase/migrations/20260814010000_finance_account_authority_v1_1.sql');
  await applyMigration('supabase/migrations/20260814020000_finance_balance_anchor_account_effects_v1_1.sql');
  await new Promise((resolve) => setTimeout(resolve, 250));
}

function randomCredential(label) {
  return `Fin2F_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function insertFinanceTransaction(row) {
  const { data, error } = await admin.from('finance_transactions').insert(row).select('id').single();
  if (error) throw new Error(`finance_transactions insert failed: ${error.code || 'unknown'}: ${error.message}`);
  fixture.transactionIds.push(data.id);
  return data;
}

async function insertFinanceTransactions(rows) {
  const { data, error } = await admin.from('finance_transactions').insert(rows).select('id');
  if (error) throw new Error(`finance_transactions bulk insert failed: ${error.code || 'unknown'}: ${error.message}`);
  for (const row of data ?? []) fixture.transactionIds.push(row.id);
  return data ?? [];
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin2f-${label}-${suffix}@example.test`;
  const password = randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 2F QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 2F ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `fin2f-${crypto.randomBytes(8).toString('hex')}`,
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
  const hhA = await createHousehold('Fin 2F A', personA.id, [{ personId: personA.id, role: 'adult' }]);
  const hhB = await createHousehold('Fin 2F B', personA.id, [
    { personId: personA.id, role: 'adult' },
    { personId: personB.id, role: 'coordinator' },
  ]);
  const hhC = await createHousehold('Fin 2F C', personC.id, [{ personId: personC.id, role: 'adult' }]);
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
  if (fixture.categoryIds.length) {
    await admin.from('finance_categories').delete().in('id', fixture.categoryIds);
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

async function track(result) {
  fixture.transactionIds.push(result.transaction.id);
  return result;
}

async function nativeCategory(nativeKey) {
  const { rows } = await queryDb('select * from public.finance_categories where native_key = $1', [nativeKey]);
  if (!rows[0]) throw new Error(`native category missing: ${nativeKey}`);
  return rows[0];
}

const FIXED_MONTH = '2026-08';
const PRIOR_MONTH = '2026-07';

async function testMovementsRead(actors) {
  console.log('\nT01-T18 - Movimientos minimum read authority');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  const expense = await track(await createExpense(personalA, { amount: 42000, currency: 'ARS', date: '2026-08-13', description: 'Supermercado' }));
  const income = await track(await createIncome(personalA, { amount: 300000, currency: 'ARS', date: '2026-08-13' }));

  let res = await listFinanceMovements(personalA, { month: FIXED_MONTH });
  const ids = res.movements.map((m) => m.id);
  assert(ids.includes(expense.transaction.id), 'T01 Personal Expense appears in Personal movements');
  assert(ids.includes(income.transaction.id), 'T02 Personal Income appears in Personal movements');

  res = await listFinanceMovements(personalB, { month: FIXED_MONTH });
  assert(!res.movements.some((m) => m.id === expense.transaction.id), 'T03 another Person Personal transaction does not appear');

  const hhExpense = await track(await createExpense(householdA, { amount: 7777, currency: 'ARS', date: '2026-08-13' }));
  const hhIncome = await track(await createIncome(householdA, { amount: 5555, currency: 'ARS', date: '2026-08-13' }));
  res = await listFinanceMovements(householdA, { month: FIXED_MONTH });
  assert(res.movements.some((m) => m.id === hhExpense.transaction.id), 'T04 Household Expense appears in active Household movements');
  assert(res.movements.some((m) => m.id === hhIncome.transaction.id), 'T05 Household Income appears in active Household movements');

  // non-active Household: person C active HH=C; person A household facts live in HH B (active) and (later) HH A
  const householdC = await resolvedContext(actors.c, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  res = await listFinanceMovements(householdC, { month: FIXED_MONTH });
  assert(!res.movements.some((m) => m.id === hhExpense.transaction.id), 'T06 non-active Household transaction does not appear');

  await expectError(
    () => listFinanceMovements(personalA, { month: FIXED_MONTH, householdId: actors.households.a.id }),
    'finance_read_owner_id_forbidden',
    'T07 arbitrary householdId targeting rejected/not supported',
  );
  await expectError(
    () => listFinanceMovements(personalA, { month: FIXED_MONTH, personId: actors.b.person.id }),
    'finance_read_owner_id_forbidden',
    'T08 arbitrary personId targeting rejected/not supported',
  );

  res = await listFinanceMovements(personalA, { month: FIXED_MONTH });
  const expenseDto = res.movements.find((m) => m.id === expense.transaction.id);
  const incomeDto = res.movements.find((m) => m.id === income.transaction.id);
  equal(expenseDto.amount, '42000.0000', 'T09 Expense retains positive canonical amount as decimal string');
  equal(incomeDto.amount, '300000.0000', 'T09 Income retains positive canonical amount as decimal string');
  equal(expenseDto.transactionType, FINANCE_TRANSACTION_TYPES.EXPENSE, 'T10 transactionType preserved (expense)');
  equal(incomeDto.transactionType, FINANCE_TRANSACTION_TYPES.INCOME, 'T10 transactionType preserved (income)');
  equal(expenseDto.currency, 'ARS', 'T11 currency preserved');
  equal(expenseDto.transactionDate, '2026-08-13', 'T12 transaction_date preserved');
  equal(incomeDto.description, null, 'T13 description null preserved');
  equal(expenseDto.description, 'Supermercado', 'T14 description present preserved');

  const native = await nativeCategory('food');
  const catExpense = await track(await createExpense(personalA, { amount: 100, currency: 'ARS', date: '2026-08-13', category: native.id }));
  res = await listFinanceMovements(personalA, { month: FIXED_MONTH });
  const catDto = res.movements.find((m) => m.id === catExpense.transaction.id);
  equal(catDto.categoryId, native.id, 'T15 snapshot preserves category identity');
  equal(catDto.categoryLabelSnapshot, native.label, 'T15 snapshot preserves category label');

  const custom = await createFinanceCategory(personalA, { type: FINANCE_CATEGORY_TYPES.EXPENSE, label: 'Delivery' });
  fixture.categoryIds.push(custom.category.id);
  const customExpense = await track(await createExpense(personalA, { amount: 200, currency: 'ARS', date: '2026-08-13', category: custom.category.id }));
  await updateFinanceCategory(personalA, custom.category.id, { label: 'Comidas afuera' });
  res = await listFinanceMovements(personalA, { month: FIXED_MONTH });
  const renamedDto = res.movements.find((m) => m.id === customExpense.transaction.id);
  equal(renamedDto.categoryLabelSnapshot, 'Delivery', 'T16 renamed Category does not rewrite historical label');

  await deleteFinanceCategory(personalA, custom.category.id);
  res = await listFinanceMovements(personalA, { month: FIXED_MONTH });
  const afterDeleteDto = res.movements.find((m) => m.id === customExpense.transaction.id);
  assert(Boolean(afterDeleteDto), 'T17 deleted Category does not remove movement');
  equal(afterDeleteDto.categoryLabelSnapshot, 'Delivery', 'T17 historical label survives category delete');

  // Ordering: deterministic DESC transaction_date, then created_at DESC, then id DESC
  const o1 = await track(await createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-08-01', description: 'oldest' }));
  await new Promise((r) => setTimeout(r, 30));
  const o2 = await track(await createExpense(personalA, { amount: 2, currency: 'ARS', date: '2026-08-31', description: 'newest' }));
  await new Promise((r) => setTimeout(r, 30));
  const o3 = await track(await createExpense(personalA, { amount: 3, currency: 'ARS', date: '2026-08-15', description: 'mid' }));
  const t1 = await track(await createExpense(personalA, { amount: 4, currency: 'ARS', date: '2026-08-15', description: 'tie1' }));
  await new Promise((r) => setTimeout(r, 30));
  const t2 = await track(await createExpense(personalA, { amount: 5, currency: 'ARS', date: '2026-08-15', description: 'tie2' }));

  res = await listFinanceMovements(personalA, { month: FIXED_MONTH });
  const dates = res.movements.map((m) => m.transactionDate);
  const sorted = [...dates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  assert(JSON.stringify(dates) === JSON.stringify(sorted), 'T18a descending transaction_date ordering');

  const midIdx = res.movements.findIndex((m) => m.id === o3.transaction.id);
  const tie1Idx = res.movements.findIndex((m) => m.id === t1.transaction.id);
  const tie2Idx = res.movements.findIndex((m) => m.id === t2.transaction.id);
  // same transaction_date => created_at DESC then id DESC
  assert(tie2Idx < tie1Idx, 'T18b created_at DESC tie-breaker for equal transaction_date');
  assert(tie1Idx < midIdx, 'T18b created_at DESC deterministic');
  assert(midIdx >= 0, 'T18 mid present');
}

async function testPeriodContract(actors) {
  console.log('\nT19-T25 - Period contract (transaction_date, no TZ shift)');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  await expectError(
    () => listFinanceMovements(personalA, {}),
    'finance_period_required',
    'T19 period is explicit canonical consumption path for movements',
  );
  await expectError(
    () => summarizeFinance(personalA, {}),
    'finance_period_required',
    'T19 period is explicit canonical consumption path for summary',
  );

  const currentMonthTx = await track(await createExpense(personalA, { amount: 7, currency: 'ARS', date: '2026-08-16' }));
  let res = await listFinanceMovements(personalA, { month: FIXED_MONTH });
  assert(res.movements.some((m) => m.id === currentMonthTx.transaction.id), 'T19 current month includes current-month facts');

  res = await listFinanceMovements(personalA, { month: PRIOR_MONTH });
  assert(!res.movements.some((m) => m.id === currentMonthTx.transaction.id), 'T20 prior month excludes current-month query');

  const priorMonthTx = await track(await createExpense(personalA, { amount: 9, currency: 'ARS', date: '2026-07-04' }));
  res = await listFinanceMovements(personalA, { month: PRIOR_MONTH });
  assert(res.movements.some((m) => m.id === priorMonthTx.transaction.id), 'T21 selected month includes correct prior-month facts');

  // created today (now) but financial date in previous month belongs to previous financial month
  const crossMonthTx = await track(await createExpense(personalA, { amount: 11, currency: 'ARS', date: '2026-07-31' }));
  res = await listFinanceMovements(personalA, { month: FIXED_MONTH });
  assert(!res.movements.some((m) => m.id === crossMonthTx.transaction.id), 'T22 financial-date-in-previous month belongs to previous financial month');
  res = await listFinanceMovements(personalA, { month: PRIOR_MONTH });
  assert(res.movements.some((m) => m.id === crossMonthTx.transaction.id), 'T22 previous financial month includes it');

  // created_at never decides financial period: a row inserted into prior month but with a created_at far in future
  const row = await persistedTransactionRow(crossMonthTx.transaction.id);
  assert(row.transaction_date.toISOString().slice(0, 10) === '2026-07-31', 'T23 transaction_date persisted as July');
  assert(row.created_at.toISOString().slice(0, 10) !== '2026-07-31', 'T23 created_at is not the financial-period date (created_at does not decide period)');
  res = await listFinanceMovements(personalA, { month: '2026-07' });
  assert(res.movements.some((m) => m.id === crossMonthTx.transaction.id), 'T23 created_at-independent selection uses transaction_date');

  // T24 month boundaries (exactly include first and last day-of-month)
  const firstDay = await track(await createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-08-01' }));
  const lastDay = await track(await createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-08-31' }));
  const outBefore = await track(await createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-07-31' }));
  const outAfter = await track(await createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-09-01' }));
  res = await listFinanceMovements(personalA, { month: FIXED_MONTH });
  assert(res.movements.some((m) => m.id === firstDay.transaction.id), 'T24a includes first day-of-month');
  assert(res.movements.some((m) => m.id === lastDay.transaction.id), 'T24b includes last day-of-month');
  assert(!res.movements.some((m) => m.id === outBefore.transaction.id), 'T24c excludes day before month');
  assert(!res.movements.some((m) => m.id === outAfter.transaction.id), 'T24d excludes day after month');

  // T25 DATE semantics do not shift due to timezone: an ISO date stored as DATE returns as the same YYYY-MM-DD string.
  const jan = await track(await createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-01-15' }));
  res = await listFinanceMovements(personalA, { month: '2026-01' });
  const janDto = res.movements.find((m) => m.id === jan.transaction.id);
  equal(janDto.transactionDate, '2026-01-15', 'T25 DATE-only financial occurrence returns unchanged YYYY-MM-DD');

  // normalizePeriodMonth boundaries / range helper consistency
  equal(normalizePeriodMonth('2026-02'), '2026-02', 'T24 normalizePeriodMonth accepts YYYY-MM');
  const rangeFeb = periodRange('2026-02');
  equal(rangeFeb.start, '2026-02-01', 'T24 periodRange start');
  equal(rangeFeb.endExclusive, '2026-03-01', 'T24 periodRange endExclusive');
  const rangeDec = periodRange('2026-12');
  equal(rangeDec.endExclusive, '2027-01-01', 'T24 periodRange December->January rollover');
  let threwBad = false;
  try { normalizePeriodMonth('2026-13'); } catch { threwBad = true; }
  assert(threwBad, 'T24 normalizePeriodMonth rejects month 13 (throw)');
  let threwFmt = false;
  try { normalizePeriodMonth('aug-2026'); } catch { threwFmt = true; }
  assert(threwFmt, 'T24 normalizePeriodMonth rejects non-YYYY-MM');
}

async function testSummaryBasics(actors) {
  console.log('\nT26-T35 - Summary minimum aggregates per currency');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);

  // Use an isolated month that no other test stage writes into.
  // T26 single Expense 42000 ARS
  const summaryMonth = '2024-02';
  await track(await createExpense(personalA, { amount: 42000, currency: 'ARS', date: `${summaryMonth}-02` }));
  let s = await summarizeFinance(personalA, { month: summaryMonth });
  let ars = s.currencies.find((c) => c.currency === 'ARS');
  equal(ars.expense, '42000', 'T26 expense total = 42000');
  equal(ars.income, '0', 'T26 income total = 0');
  equal(ars.net, '-42000', 'T26 net = -42000 (within ARS bucket)');

  // T27 single Income 800000 ARS (independent household/person to keep tests clean)
  const summaryMonth2 = '2026-03';
  await track(await createIncome(personalB, { amount: 800000, currency: 'ARS', date: `${summaryMonth2}-02` }));
  s = await summarizeFinance(personalB, { month: summaryMonth2 });
  ars = s.currencies[0];
  equal(ars.expense, '0', 'T27 expense total = 0');
  equal(ars.income, '800000', 'T27 income total = 800000');
  equal(ars.net, '800000', 'T27 net = 800000');

  // T28 combined: Expense 42000 + Income 800000 ARS -> net 758000 (person A, clean month November 2025)
  const summaryMonth3 = '2025-11';
  await track(await createExpense(personalA, { amount: 42000, currency: 'ARS', date: `${summaryMonth3}-02` }));
  await track(await createIncome(personalA, { amount: 800000, currency: 'ARS', date: `${summaryMonth3}-03` }));
  s = await summarizeFinance(personalA, { month: summaryMonth3 });
  ars = s.currencies.find((c) => c.currency === 'ARS');
  equal(ars.expense, '42000', 'T28 expense total = 42000');
  equal(ars.income, '800000', 'T28 income total = 800000');
  equal(ars.net, '758000', 'T28 net = 758000');

  // T29 multiple expenses exact once
  const month4 = '2025-12';
  await track(await createExpense(personalA, { amount: 100, currency: 'ARS', date: `${month4}-01` }));
  await track(await createExpense(personalA, { amount: 50, currency: 'ARS', date: `${month4}-02` }));
  await track(await createExpense(personalA, { amount: 25, currency: 'ARS', date: `${month4}-03` }));
  s = await summarizeFinance(personalA, { month: month4 });
  ars = s.currencies.find((c) => c.currency === 'ARS');
  equal(ars.expense, '175', 'T29 multiple expenses summed exactly once');
  equal(ars.income, '0', 'T29 income untouched');

  // T30 multiple incomes exact once
  const month5 = '2025-10';
  await track(await createIncome(personalA, { amount: 1000, currency: 'ARS', date: `${month5}-01` }));
  await track(await createIncome(personalA, { amount: 500, currency: 'ARS', date: `${month5}-02` }));
  s = await summarizeFinance(personalA, { month: month5 });
  ars = s.currencies.find((c) => c.currency === 'ARS');
  equal(ars.income, '1500', 'T30 multiple incomes summed exactly once');
  equal(ars.expense, '0', 'T30 expense untouched');

  // T31 null Category transaction still counts
  const month6 = '2025-09';
  await track(await createExpense(personalA, { amount: 33, currency: 'ARS', date: `${month6}-01`, category: null }));
  s = await summarizeFinance(personalA, { month: month6 });
  ars = s.currencies.find((c) => c.currency === 'ARS');
  equal(ars.expense, '33', 'T31 null Category transaction still counts');

  // T32 null Description transaction still counts
  const month7 = '2025-08';
  await track(await createIncome(personalA, { amount: 22, currency: 'ARS', date: `${month7}-01`, description: null }));
  s = await summarizeFinance(personalA, { month: month7 });
  ars = s.currencies.find((c) => c.currency === 'ARS');
  equal(ars.income, '22', 'T32 null Description transaction still counts');

  // T33 Personal summary excludes Household transactions
  const personalMonth = '2025-07';
  await track(await createExpense(personalA, { amount: 5, currency: 'ARS', date: `${personalMonth}-01` }));
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  await track(await createExpense(householdA, { amount: 6, currency: 'ARS', date: `${personalMonth}-02` }));
  s = await summarizeFinance(personalA, { month: personalMonth });
  ars = s.currencies.find((c) => c.currency === 'ARS');
  equal(ars.expense, '5', 'T33 Personal summary excludes Household transactions');

  // T34 Household summary excludes Personal transactions
  s = await summarizeFinance(householdA, { month: personalMonth });
  ars = s.currencies.find((c) => c.currency === 'ARS');
  equal(ars.expense, '6', 'T34 Household summary excludes Personal transactions');

  // T35 active Household A excludes B (via person C cannot see B; person A active=B sees B only)
  await track(await createExpense(householdA, { amount: 8, currency: 'ARS', date: `${personalMonth}-03` }));
  const householdCctx = await resolvedContext(actors.c, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  s = await summarizeFinance(householdCctx, { month: personalMonth });
  assert(!s.currencies.some((c) => c.currency === 'ARS'), 'T35 active Household A (B in code) excludes C; no ARS bucket');
}

async function testMulticurrencyAndEmpty(actors) {
  console.log('\nT36-T41 - Multicurrency separation, no FX, empty period truth');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const month = '2024-06';
  await track(await createExpense(personalA, { amount: 100, currency: 'ARS', date: `${month}-01` }));
  await track(await createExpense(personalA, { amount: 20, currency: 'USD', date: `${month}-02` }));
  await track(await createIncome(personalA, { amount: 5, currency: 'USD', date: `${month}-03` }));

  let s = await summarizeFinance(personalA, { month });
  const ars = s.currencies.find((c) => c.currency === 'ARS');
  const usd = s.currencies.find((c) => c.currency === 'USD');
  assert(ars && usd, 'T36 ARS and USD facts produce separate summary buckets');
  equal(ars.expense, '100', 'T36 ARS expense = 100');
  equal(usd.expense, '20', 'T36 USD expense = 20');

  // T37 ARS + USD never summed into one numeric total (no combined single currency)
  assert(s.currencies.length === 2, 'T37 exactly two currency buckets, never combined');
  assert(!('total' in s) && !('total' in ars) && !('total' in usd), 'T37 no single numeric combined total');

  // T38 no FX conversion exists: no rate/exchange fields anywhere
  const serviceText = fs.readFileSync(path.join(root, 'backend/src/services/finance.read.service.js'), 'utf8');
  assert(!/exchange|fx|rate_to|convertCurrency|toCurrency|fx_rate/i.test(serviceText), 'T38 no FX conversion in read service');

  // T39 no implicit default currency (no ARS/USD/EUR fabricated, no default param)
  assert(!/DEFAULT_CURRENCY|defaultCurrency/i.test(serviceText), 'T39 no default currency constant introduced');
  let noFactsMonth = '2023-01';
  const noFacts = await summarizeFinance(personalA, { month: noFactsMonth });
  equal(noFacts.currencies.length, 0, 'T39/T41 empty period fabricates no currency buckets');

  // T40 movement list preserves each movement's native currency
  let mov = await listFinanceMovements(personalA, { month });
  const arsMov = mov.movements.find((m) => m.currency === 'ARS');
  const usdMov = mov.movements.find((m) => m.currency === 'USD');
  assert(arsMov.currency === 'ARS' && usdMov.currency === 'USD', 'T40 movement list preserves native currency');
  assert(mov.movements.every((m) => m.currency !== 'EUR'), 'T40 no fabricated currency on movements');

  // T41 empty period: currencies = [] and movements = []
  const emptyMov = await listFinanceMovements(personalA, { month: '2023-02' });
  equal(emptyMov.movements.length, 0, 'T41 empty period returns empty movements array');
  equal(emptyMov.currencies ?? null, null, 'T41 empty movements response has no fabricated currency keys');
  const emptySum = await summarizeFinance(personalA, { month: '2023-02' });
  equal(emptySum.currencies.length, 0, 'T41 empty period returns empty currencies array');
  assert(!emptySum.currencies.some((c) => ['ARS', 'USD', 'EUR'].includes(c.currency)), 'T41 no ARS/USD/EUR zero buckets fabricated');
}

async function testLargeDecimalRoundtrip(actors) {
  console.log('\nT54-T59 - Decimal-safe movement amount roundtrip');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const month = '2024-03';
  const large = '99999999999999.9999';
  const inserted = await insertFinanceTransaction({
    transaction_type: FINANCE_TRANSACTION_TYPES.EXPENSE,
    amount: large,
    currency: 'ARS',
    financial_context_type: FINANCE_CONTEXT_TYPES.PERSONAL,
    owner_person_id: actors.a.person.id,
    household_id: null,
    transaction_date: `${month}-01`,
    description: 'precision sentinel',
    category_id: null,
    category_label_snapshot: null,
    created_by_person_id: actors.a.person.id,
  });

  const dbAmount = await persistedTransactionAmountText(inserted.id);
  equal(dbAmount, large, 'T54 DB amount stored at exact numeric(18,4) scale');

  const rawNumeric = await personalA.client
    .from('finance_transactions')
    .select('amount')
    .eq('id', inserted.id)
    .single();
  if (rawNumeric.error) throw rawNumeric.error;
  assert(typeof rawNumeric.data.amount === 'number', 'T55 uncast PostgREST numeric path returns JS Number in current runtime');
  assert(String(rawNumeric.data.amount) !== large, 'T55 uncast JS Number path is lossy for the large sentinel');

  const rawText = await personalA.client
    .from('finance_transactions')
    .select('amount:amount::text')
    .eq('id', inserted.id)
    .single();
  if (rawText.error) throw rawText.error;
  equal(rawText.data.amount, large, 'T56 amount::text preserves exact PostgREST value');

  const movements = await listFinanceMovements(personalA, { month });
  const movement = movements.movements.find((m) => m.id === inserted.id);
  assert(Boolean(movement), 'T57 large decimal movement is readable');
  equal(typeof movement.amount, 'string', 'T57 movement amount is serialized as string');
  equal(movement.amount, large, 'T57 movement amount equals DB exact decimal text');

  const summary = await summarizeFinance(personalA, { month });
  const ars = summary.currencies.find((c) => c.currency === 'ARS');
  equal(ars.expense, large, 'T58 summary expense uses exact decimal source amount');
  equal(ars.income, '0', 'T58 summary income remains zero');
  equal(ars.net, `-${large}`, 'T58 summary net preserves exact decimal scale');
  equal(dbAmount, movement.amount, 'T59 DB amount equals movement response amount');
  equal(rawText.data.amount, movement.amount, 'T59 PostgREST text amount equals movement response amount');
}

async function testNoSilentMovementTruncation(actors) {
  console.log('\nT60 - No silent movement truncation in month-scoped read');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const month = '2024-07';
  const rows = Array.from({ length: 205 }, (_, index) => ({
    transaction_type: FINANCE_TRANSACTION_TYPES.EXPENSE,
    amount: '1.0000',
    currency: 'ARS',
    financial_context_type: FINANCE_CONTEXT_TYPES.PERSONAL,
    owner_person_id: actors.a.person.id,
    household_id: null,
    transaction_date: `${month}-${String((index % 28) + 1).padStart(2, '0')}`,
    description: `bulk-${index}`,
    category_id: null,
    category_label_snapshot: null,
    created_by_person_id: actors.a.person.id,
  }));
  const inserted = await insertFinanceTransactions(rows);
  const insertedIds = new Set(inserted.map((row) => row.id));

  const movements = await listFinanceMovements(personalA, { month });
  const returnedInserted = movements.movements.filter((movement) => insertedIds.has(movement.id));
  equal(returnedInserted.length, 205, 'T60 month-scoped read returns >200 rows without default truncation');
  assert(!('hasMore' in movements) && !('truncated' in movements), 'T60 no truncation metadata needed because list is not bounded');
}

async function testNegativeScope() {
  console.log('\nT42-T53 - Negative scope: no Account-linked read/Transfer/Refund/Payment/Budget/Analysis/frontend read expansion');
  const serviceText = fs.readFileSync(path.join(root, 'backend/src/services/finance.read.service.js'), 'utf8');
  const controllerText = fs.readFileSync(path.join(root, 'backend/src/controllers/finance.read.controller.js'), 'utf8');
  const routeText = fs.readFileSync(path.join(root, 'backend/src/routes/finance.js'), 'utf8');
  const readBackend = `${serviceText}\n${controllerText}`;

  // Identifier-based checks: detect actual implementation of the forbidden
  // domain concepts, never mere English prose in doc comments.
  assert(!/\baccountId\b|\baccount_id\b|AccountRepository/i.test(readBackend), 'T42 no Account-linked movement/summary implementation');
  assert(!/\bbalance\b|\baccount_balance\b|BalanceService/i.test(readBackend), 'T43 no Balance implementation');
  assert(!/\bcreateTransfer\b|TransferService|finance_transfer|TransactionTypes\.TRANSFER\b|\btransfer\b/i.test(readBackend), 'T44 no Transfer implementation');
  assert(!/\bcreateRefund\b|RefundService|\brefund\b/i.test(readBackend), 'T45 no Refund implementation');
  assert(!/\bcreatePayment\b|PaymentService|\bpayment\b|paymentMethod/i.test(readBackend), 'T46 no Payment implementation');
  assert(!/\bbudget\b|BudgetService|finance_budget/i.test(readBackend), 'T47 no Budget implementation');
  assert(!/analytics|report_engine|spending_composition|\bcomparison\b|previous_month/i.test(readBackend), 'T48 no Analysis/report engine');

  // T49 no Category management expansion (read service does not mutate categories)
  assert(!/createFinanceCategory|updateFinanceCategory|deleteFinanceCategory/i.test(serviceText), 'T49 no Category management expansion in read service');

  // T50 after 2F-B, frontend consumes the accepted read contract through the
  // existing API client surface. Backend remains the read authority.
  const feRoot = path.join(root, 'front/mi-front-limpio');
  const feFrontendWiringHits = scanFrontendForReadContractWiring(feRoot);
  assert(feFrontendWiringHits.length > 0, 'T50 frontend wires the 2F read contract through API services');

  // T51 no new migration
  const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((name) => /finance/i.test(name)).sort();
  assert(
    JSON.stringify(migrations) === JSON.stringify([
      '20260813010000_finance_category_authority_v1_1.sql',
      '20260813020000_finance_expense_income_transactions_v1_1.sql',
      '20260814010000_finance_account_authority_v1_1.sql',
      '20260814020000_finance_balance_anchor_account_effects_v1_1.sql',
      '20260814030000_finance_balance_correction_v1_1.sql',
      '20260814040000_finance_credit_card_purchase_semantics_v1_1.sql',
      '20260814050000_finance_canonical_transfer_v1_1.sql',
'20260814060000_finance_cross_currency_transfer_v1_1.sql',
      '20260814070000_finance_transfer_commission_composition_v1_1.sql',
    ]),
    'T51 only accepted 2B/2C/3A/3B/3C/3D/3E/3F/3G Finance migrations remain',
  );

  // T52 no direct donor architecture import: read service should not import planner.context.service
  assert(!/planner\.context\.service|planner\.events|planner\.schema/i.test(serviceText), 'T52 no Planner donor architecture import');

  // T53 no Finance-specific auth/permission/reliability subsystem invented
  assert(!/FinanceRole|finance_roles|FinancePermission|FinanceACL|finance_can_access/i.test(readBackend), 'T53 no Finance-specific auth/permission subsystem');

  // Route contract: only /movements and /summary GET additions; no extra read paths invented
  const getRoutes = routeText.split('\n').filter((l) => /router\.get/.test(l));
  assert(getRoutes.some((l) => /\/movements/.test(l)), 'GET /movements route added');
  assert(getRoutes.some((l) => /\/summary/.test(l)), 'GET /summary route added');
  assert(!/router\.post.*movements|router\.post.*summary|router\.patch.*movements|router\.delete.*movements/i.test(routeText), 'T42-T48 no mutation routes on read endpoints');

  // read service does not call insert/update/delete on finance_transactions
  assert(!/\.insert\(|\.update\(|\.delete\(|\.upsert\(/i.test(serviceText), 'T42-T48 read service is read-only (no insert/update/delete)');
  assert(!/\.from\(['"]finance_(accounts|ledger|reports|read_model|movement_rows)['"]\)|materialized\s+view/i.test(readBackend), 'T51/T52 no new read-model/ledger/report tables invented');
}

function scanFrontendForReadContractWiring(feRoot) {
  if (!fs.existsSync(feRoot)) return [];
  const hits = [];
  function* walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        yield* walk(p);
      } else if (/\.(ts|tsx)$/.test(e.name)) {
        yield p;
      }
    }
  }
  for (const file of walk(feRoot)) {
    const text = fs.readFileSync(file, 'utf8');
    if (/finance\/(movements|summary)/i.test(text)) {
      hits.push(file);
    }
  }
  return hits;
}

async function persistedTransactionRow(id) {
  const { rows } = await queryDb('select * from public.finance_transactions where id = $1', [id]);
  if (!rows[0]) throw new Error(`transaction missing: ${id}`);
  return rows[0];
}

async function persistedTransactionAmountText(id) {
  const { rows } = await queryDb('select amount::text as amount from public.finance_transactions where id = $1', [id]);
  if (!rows[0]) throw new Error(`transaction missing: ${id}`);
  return rows[0].amount;
}

async function testStaticRouteContract() {
  // No FX / no default currency / decimal-safe in source
  const serviceText = fs.readFileSync(path.join(root, 'backend/src/services/finance.read.service.js'), 'utf8');
  assert(serviceText.includes('TEN_THOUSAND'), 'decimal-safe aggregation uses BigInt scaled by 10^4 (numeric(18,4) scale)');
  assert(/compute (Expense|expense)/i.test(serviceText) || serviceText.includes('FINANCE_TRANSACTION_TYPES.EXPENSE'), 'canonical expense aggregation symbol exists');
}

async function testDatesNoTzShift() {
  // Static-only checks handled in testNegativeScope; kept as a no-op anchor
  // so the suite remains isolated and ordered.
}

async function main() {
  console.log('FINANCE_2F_A_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigrations();
  const actors = await setupActors();

  try {
    await testMovementsRead(actors);
    await testPeriodContract(actors);
    await testSummaryBasics(actors);
    await testMulticurrencyAndEmpty(actors);
    await testLargeDecimalRoundtrip(actors);
    await testNoSilentMovementTruncation(actors);
    await testNegativeScope();
    await testStaticRouteContract();
    await testDatesNoTzShift();
  } finally {
    await cleanup();
  }

  console.log(`\nFINANCE_2F_A_READ_AUTHORITY_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_2F_A_MINIMUM_READ_AUTHORITY_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_2F_A_MINIMUM_READ_AUTHORITY_TESTS=PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_2F_A_MINIMUM_READ_AUTHORITY_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
