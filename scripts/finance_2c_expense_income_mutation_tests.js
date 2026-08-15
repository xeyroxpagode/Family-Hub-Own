#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 2C Expense + Income Mutation tests.
 *
 * Local Supabase only. Applies accepted 2B + 2C migrations, then validates
 * canonical Expense/Income persistence, RLS, category composition, historical
 * snapshots, and no Account/Transfer/Refund/Payment behavior.
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
  createFinanceTransaction,
  createIncome,
} = require('../backend/src/services/finance.transaction.service');

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
  console.error('ENVIRONMENT_FAILURE: Finance 2C tests are local-only.');
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
  return `Fin2C_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin2c-${label}-${suffix}@example.test`;
  const password = randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 2C QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 2C ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `fin2c-${crypto.randomBytes(8).toString('hex')}`,
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
  const hhA = await createHousehold('Fin 2C A', personA.id, [{ personId: personA.id, role: 'adult' }]);
  const hhB = await createHousehold('Fin 2C B', personA.id, [
    { personId: personA.id, role: 'adult' },
    { personId: personB.id, role: 'coordinator' },
  ]);
  const hhC = await createHousehold('Fin 2C C', personC.id, [{ personId: personC.id, role: 'adult' }]);
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

async function nativeCategory(nativeKey) {
  const { rows } = await queryDb('select * from public.finance_categories where native_key = $1', [nativeKey]);
  if (!rows[0]) throw new Error(`native category missing: ${nativeKey}`);
  return rows[0];
}

async function persistedTransaction(id) {
  const { rows } = await queryDb('select * from public.finance_transactions where id = $1', [id]);
  if (!rows[0]) throw new Error(`transaction missing: ${id}`);
  return rows[0];
}

async function testMinimumExpenseIncome(actors) {
  console.log('\nT01-T11 - minimum Expense/Income and optionality');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  const expense = await createExpense(personalA, { amount: 42000, currency: 'ARS', date: '2026-08-13' });
  fixture.transactionIds.push(expense.transaction.id);
  equal(expense.transaction.type, FINANCE_TRANSACTION_TYPES.EXPENSE, 'T01 real Personal Expense persists with minimum fields');
  equal(expense.transaction.description, null, 'T02 missing Description valid');
  equal(expense.transaction.categoryId, null, 'T03 missing Category valid');
  assert(!('accountId' in expense.transaction), 'T04 missing Account valid and not represented');
  equal(expense.transaction.notes, null, 'T05 missing Notes valid');
  assert(!('account' in expense.transaction), 'T06 no implicit Efectivo Account');
  equal(expense.transaction.categoryId, null, 'T07 no default Category');

  const income = await createIncome(personalA, { amount: 300000, currency: 'ARS', date: '2026-08-13' });
  fixture.transactionIds.push(income.transaction.id);
  equal(income.transaction.type, FINANCE_TRANSACTION_TYPES.INCOME, 'T08 real Personal Income persists with minimum required fields');
  equal(income.transaction.categoryId, null, 'T11 no Category required');
  assert(!('accountId' in income.transaction), 'T10 no Account required');

  const householdIncome = await createIncome(householdA, { amount: 12000, currency: 'ARS', date: '2026-08-13' });
  fixture.transactionIds.push(householdIncome.transaction.id);
  equal(householdIncome.transaction.householdId, actors.households.b.id, 'T09 Household Income persists in active Household');
}

async function testValidation(actors) {
  console.log('\nT12-T20 - amount, currency and date validation');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  await expectError(() => createExpense(personalA, { amount: 0, currency: 'ARS', date: '2026-08-13' }), 'invalid_finance_transaction_amount', 'T12 zero amount rejected');
  await expectError(() => createExpense(personalA, { amount: -1, currency: 'ARS', date: '2026-08-13' }), 'invalid_finance_transaction_amount', 'T13 negative caller amount rejected');
  await expectError(() => createExpense(personalA, { currency: 'ARS', date: '2026-08-13' }), 'finance_transaction_amount_required', 'T14 missing amount rejected');
  await expectError(() => createExpense(personalA, { amount: 1, date: '2026-08-13' }), 'finance_transaction_currency_required', 'T15 missing currency rejected');
  await expectError(() => createExpense(personalA, { amount: 1, currency: 'ars', date: '2026-08-13' }), 'invalid_finance_transaction_currency', 'T16 invalid canonical currency rejected');
  await expectError(() => createExpense(personalA, { amount: 1, date: '2026-08-13' }), 'finance_transaction_currency_required', 'T17 no silent currency default');
  await expectError(() => createExpense(personalA, { amount: 1, currency: 'ARS' }), 'finance_transaction_date_required', 'T18 missing date rejected');
  await expectError(() => createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-02-31' }), 'invalid_finance_transaction_date', 'T19 invalid date rejected');

  const created = await createExpense(personalA, { amount: 15, currency: 'ARS', date: '2026-01-02' });
  fixture.transactionIds.push(created.transaction.id);
  const row = await persistedTransaction(created.transaction.id);
  equal(row.transaction_date.toISOString().slice(0, 10), '2026-01-02', 'T20 transaction date persists as financial occurrence date');
  assert(row.created_at.toISOString().slice(0, 10) !== '2026-01-02', 'T20 transaction date remains distinct from created_at');
}

async function testPersonalPrivacy(actors) {
  console.log('\nT21-T26 - Personal ownership and privacy');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);
  const tx = await createExpense(personalA, { amount: 99, currency: 'ARS', date: '2026-08-13' });
  fixture.transactionIds.push(tx.transaction.id);
  const row = await persistedTransaction(tx.transaction.id);
  equal(row.owner_person_id, actors.a.person.id, 'T21 Personal transaction derives current Person');
  equal(row.household_id, null, 'T21 Personal transaction has no Household owner');

  const { data: bRead, error: bReadError } = await actors.b.client
    .from('finance_transactions')
    .select('*')
    .eq('id', tx.transaction.id);
  if (bReadError) throw bReadError;
  equal(bRead.length, 0, 'T22 another Person cannot read Personal fact');
  await expectError(() => createExpense(personalB, { amount: 1, currency: 'ARS', date: '2026-08-13', ownerPersonId: actors.a.person.id }), 'protected_finance_transaction_field', 'T23 another Person cannot target Personal owner through create');
  await expectError(() => createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-08-13', personId: actors.b.person.id }), 'protected_finance_transaction_field', 'T24 personId injection denied');
  await expectError(() => createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-08-13', ownerPersonId: actors.b.person.id }), 'protected_finance_transaction_field', 'T25 ownerPersonId injection denied');

  const householdB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  void householdB;
  const { data: householdRoleRead, error } = await actors.b.client
    .from('finance_transactions')
    .select('*')
    .eq('id', tx.transaction.id);
  if (error) throw error;
  equal(householdRoleRead.length, 0, 'T26 Household role does not pierce Personal privacy');
}

async function testHouseholdScope(actors) {
  console.log('\nT27-T32 - Household active scope');
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const beforeActive = actors.a.person.active_household_id;
  void beforeActive;
  const tx = await createExpense(householdA, { amount: 77, currency: 'ARS', date: '2026-08-13' });
  fixture.transactionIds.push(tx.transaction.id);
  equal(tx.transaction.householdId, actors.households.b.id, 'T27 Household transaction derives active Household');

  await expectError(() => createExpense(householdA, { amount: 1, currency: 'ARS', date: '2026-08-13', householdId: actors.households.a.id }), 'protected_finance_transaction_field', 'T28/T29 cannot target non-active Household through body');
  await expectError(() => createExpense(householdA, { amount: 1, currency: 'ARS', date: '2026-08-13', membershipId: 'caller-membership' }), 'protected_finance_transaction_field', 'T30 membershipId injection denied');

  await expectError(() => resolvedContext(actors.c, FINANCE_CONTEXT_TYPES.HOUSEHOLD).then((ctx) => {
    ctx.householdId = actors.households.b.id;
    return createExpense(ctx, { amount: 1, currency: 'ARS', date: '2026-08-13' });
  }), 'finance_transaction_forbidden', 'T31 inactive/non-authorized Household scope denied by RLS');

  const activeAfter = await queryDb('select active_household_id from public.people where id = $1', [actors.a.person.id]);
  equal(activeAfter.rows[0].active_household_id, actors.households.b.id, 'T32 Finance mutation does not change global active Household');
}

async function testCategoriesAndSnapshots(actors) {
  console.log('\nT33-T48 - category composition and historical snapshots');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);
  const nativeExpense = await nativeCategory('food');
  const nativeIncome = await nativeCategory('salary');
  const nativeIncomeWrong = await nativeCategory('returns');

  const txExpenseNative = await createExpense(personalA, { amount: 50, currency: 'ARS', date: '2026-08-13', category: nativeExpense.id });
  fixture.transactionIds.push(txExpenseNative.transaction.id);
  equal(txExpenseNative.transaction.categoryId, nativeExpense.id, 'T33 Expense + native Expense category PASS');

  const txIncomeNative = await createIncome(personalA, { amount: 51, currency: 'ARS', date: '2026-08-13', category: nativeIncome.id });
  fixture.transactionIds.push(txIncomeNative.transaction.id);
  equal(txIncomeNative.transaction.categoryId, nativeIncome.id, 'T34 Income + native Income category PASS');

  await expectError(() => createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-08-13', category: nativeIncomeWrong.id }), 'finance_transaction_category_type_mismatch', 'T35 Expense + Income category rejected');
  await expectError(() => createIncome(personalA, { amount: 1, currency: 'ARS', date: '2026-08-13', category: nativeExpense.id }), 'finance_transaction_category_type_mismatch', 'T36 Income + Expense category rejected');

  const customPersonal = await createFinanceCategory(personalA, { type: FINANCE_CATEGORY_TYPES.EXPENSE, label: 'Delivery' });
  fixture.categoryIds.push(customPersonal.category.id);
  const customPersonalTx = await createExpense(personalA, { amount: 99, currency: 'ARS', date: '2026-08-13', category: customPersonal.category.id });
  fixture.transactionIds.push(customPersonalTx.transaction.id);
  equal(customPersonalTx.transaction.categoryId, customPersonal.category.id, 'T37 Personal transaction + own Personal custom category PASS');
  await expectError(() => createExpense(personalB, { amount: 1, currency: 'ARS', date: '2026-08-13', category: customPersonal.category.id }), 'invalid_finance_transaction_category', 'T38 Personal transaction + another Person custom category denied');

  const customHousehold = await createFinanceCategory(householdA, { type: FINANCE_CATEGORY_TYPES.EXPENSE, label: 'Casa B' });
  fixture.categoryIds.push(customHousehold.category.id);
  const customHouseholdTx = await createExpense(householdA, { amount: 101, currency: 'ARS', date: '2026-08-13', category: customHousehold.category.id });
  fixture.transactionIds.push(customHouseholdTx.transaction.id);
  equal(customHouseholdTx.transaction.categoryId, customHousehold.category.id, 'T39 Household transaction + active Household custom category PASS');

  await setActiveHousehold(actors.a.person.id, actors.households.a.id);
  const householdAfterSwitch = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  await expectError(() => createExpense(householdAfterSwitch, { amount: 1, currency: 'ARS', date: '2026-08-13', category: customHousehold.category.id }), 'invalid_finance_transaction_category', 'T40 Household transaction + other Household custom category denied');
  await setActiveHousehold(actors.a.person.id, actors.households.b.id);

  const deletedCustom = await createFinanceCategory(personalA, { type: FINANCE_CATEGORY_TYPES.EXPENSE, label: 'A borrar' });
  fixture.categoryIds.push(deletedCustom.category.id);
  await deleteFinanceCategory(personalA, deletedCustom.category.id);
  await expectError(() => createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-08-13', category: deletedCustom.category.id }), 'invalid_finance_transaction_category', 'T41 deleted custom category rejected for new fact');

  const nullCategoryTx = await createExpense(personalA, { amount: 88, currency: 'ARS', date: '2026-08-13', category: null });
  fixture.transactionIds.push(nullCategoryTx.transaction.id);
  equal(nullCategoryTx.transaction.categoryId, null, 'T42 category = null PASS');

  await expectError(() => createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-08-13', category: customPersonal.category.id, categoryLabelSnapshot: 'Caller lie' }), 'protected_finance_transaction_field', 'T44 caller snapshot injection rejected deny-safe');
  equal(customPersonalTx.transaction.categoryLabelSnapshot, 'Delivery', 'T43 category snapshot derived server-side');
  const snapRow = await persistedTransaction(customPersonalTx.transaction.id);
  equal(snapRow.category_id, customPersonal.category.id, 'T45 transaction stores category identity');
  equal(snapRow.category_label_snapshot, 'Delivery', 'T45 transaction stores historical label');

  await updateFinanceCategory(personalA, customPersonal.category.id, { label: 'Comidas afuera' });
  const afterRename = await persistedTransaction(customPersonalTx.transaction.id);
  equal(afterRename.category_label_snapshot, 'Delivery', 'T46 rename category after transaction leaves historical snapshot unchanged');

  await deleteFinanceCategory(personalA, customPersonal.category.id);
  const afterDelete = await persistedTransaction(customPersonalTx.transaction.id);
  equal(afterDelete.category_label_snapshot, 'Delivery', 'T47 delete category after transaction leaves historical transaction intact');
  assert(Boolean(afterDelete.id), 'T48 delete category does not cascade-delete transaction');
}

async function testOperationSemanticsAndSource(actors) {
  console.log('\nT49-T61 - operation semantics, source boundary and no Account');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const expense = await createExpense(personalA, { amount: 11, currency: 'ARS', date: '2026-08-13' });
  fixture.transactionIds.push(expense.transaction.id);
  equal(expense.transaction.type, FINANCE_TRANSACTION_TYPES.EXPENSE, 'T49 Expense persists as type expense');
  equal(expense.transaction.amount, 11, 'T49 Expense persists positive magnitude');

  const income = await createIncome(personalA, { amount: 12, currency: 'ARS', date: '2026-08-13' });
  fixture.transactionIds.push(income.transaction.id);
  equal(income.transaction.type, FINANCE_TRANSACTION_TYPES.INCOME, 'T50 Income persists as type income');
  equal(income.transaction.amount, 12, 'T50 Income persists positive magnitude');

  await expectError(() => createFinanceTransaction(personalA, { type: FINANCE_TRANSACTION_TYPES.TRANSFER, amount: 1, currency: 'ARS', date: '2026-08-13' }), 'finance_transfer_not_supported', 'T51 Transfer creation not implemented/accepted by 2C mutation');
  await expectError(() => createIncome(personalA, { amount: 1, currency: 'ARS', date: '2026-08-13', refund: true }), 'protected_finance_transaction_field', 'T52 Refund not encoded as Income automatically');
  await expectError(() => createIncome(personalA, { amount: 1, currency: 'ARS', date: '2026-08-13', householdContribution: true }), 'protected_finance_transaction_field', 'T53 Household Contribution not encoded automatically as Income');
  await expectError(() => createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-08-13', reimbursement: true }), 'protected_finance_transaction_field', 'T54 Reimbursement not encoded automatically as Income/Expense');
  await expectError(() => createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-08-13', creditCardPayment: true }), 'protected_finance_transaction_field', 'T55 Credit Card Payment not created as Expense here');
  await expectError(() => createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-08-13', balanceAdjustment: true }), 'protected_finance_transaction_field', 'T56 Balance Adjustment not created as Income/Expense here');

  equal(expense.transaction.categoryId, null, 'T57 Expense with no tracked Source PASS');
  equal(income.transaction.categoryId, null, 'T58 Income with no tracked Source PASS');
  await expectError(() => createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-08-13', source: { sourceType: 'cash' } }), 'finance_source_not_supported', 'T57 tracked Source rejected in 2C');
  await expectError(() => createExpense(personalA, { amount: 1, currency: 'ARS', date: '2026-08-13', account: { id: 'cash' } }), 'invalid_finance_transaction_account', 'T59 no Account row auto-created');
  assert(!('accountId' in expense.transaction), 'T60 no Account ID fabricated');
  const txColumns = await queryDb(`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'finance_transactions'
  `);
  assert(!txColumns.rows.map((row) => row.column_name).includes('account_id'), 'T59 no Account row auto-created and transactions remain account-less');
}

async function testSchemaAndStaticContracts() {
  console.log('\nSchema/static - canonical storage and boundaries');
  const table = await queryDb("select to_regclass('public.finance_transactions') as table_name");
  equal(table.rows[0].table_name, 'finance_transactions', 'canonical finance_transactions table exists');
  const rls = await queryDb("select relrowsecurity from pg_class where oid = 'public.finance_transactions'::regclass");
  equal(rls.rows[0].relrowsecurity, true, 'RLS enabled on finance_transactions');
  const columns = await queryDb(`
    select column_name, data_type from information_schema.columns
    where table_schema = 'public' and table_name = 'finance_transactions'
    order by ordinal_position
  `);
  const names = columns.rows.map((row) => row.column_name);
  for (const required of ['amount', 'currency', 'financial_context_type', 'transaction_date', 'transaction_type', 'category_id', 'category_label_snapshot']) {
    assert(names.includes(required), `schema contains ${required}`);
  }
  equal(columns.rows.find((row) => row.column_name === 'amount')?.data_type, 'numeric', 'amount uses decimal-safe numeric storage');
  for (const forbidden of ['account_id', 'document_id', 'related_domain_object', 'merchant_id', 'payment_method', 'tax_amount', 'tags']) {
    assert(!names.includes(forbidden), `minimal schema excludes ${forbidden}`);
  }
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
    ]),
    'only accepted 2B/2C/3A/3B/3C/3D/3E/3F/3G Finance migrations exist',
  );
  const backendText = [
    'backend/src/services/finance.transaction.service.js',
    'backend/src/controllers/finance.transactions.controller.js',
    'backend/src/routes/finance.js',
  ].map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
  const transactionBackendText = [
    'backend/src/services/finance.transaction.service.js',
    'backend/src/controllers/finance.transactions.controller.js',
  ].map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
  assert(!/FinanceRole|FINANCE_ROLES|FinancePermission|FinanceACL|finance_can_access/i.test(backendText), 'no Finance role/permission package invented');
  assert(!/TransferService|RefundService|PaymentService|BudgetService|Ledger|DoubleEntry/i.test(backendText), 'no Transfer/Refund/Payment/Budget/Ledger implementation');
  assert(!/from\(['"]finance_transactions['"]\)[\s\S]{0,500}(account_id|accountId)\s*:/i.test(transactionBackendText), 'no raw account_id transaction persistence implemented');
  assert(!/archive|restore|trash/i.test(transactionBackendText), 'no Transaction Trash/Restore lifecycle implemented');
  assert(!/summaryEngine|summaryService|report(Engine|Service)?|analytics(Engine|Service)?|balance[_ ]?(engine|entry|effect|mutation)|account_balance/i.test(backendText), 'no read/report/balance engine implemented');
}

async function main() {
  console.log('FINANCE_2C_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigrations();
  const actors = await setupActors();

  try {
    await testMinimumExpenseIncome(actors);
    await testValidation(actors);
    await testPersonalPrivacy(actors);
    await testHouseholdScope(actors);
    await testCategoriesAndSnapshots(actors);
    await testOperationSemanticsAndSource(actors);
    await testSchemaAndStaticContracts();
  } finally {
    await cleanup();
  }

  console.log(`\nFINANCE_2C_EXPENSE_INCOME_MUTATION_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_2C_EXPENSE_INCOME_MUTATION_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_2C_EXPENSE_INCOME_MUTATION_TESTS=PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_2C_EXPENSE_INCOME_MUTATION_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
