#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 3D Credit Card purchase semantics tests.
 *
 * Local Supabase only. Applies accepted Finance migrations through 3D and
 * validates that CREDIT_CARD remains a finance_accounts type while Expense
 * purchases create one canonical Expense and one signed Account effect.
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
  FINANCE_ACCOUNT_TYPES,
  FINANCE_CONTEXT_TYPES,
} = require('../backend/src/constants/finance.constants');
const { resolveFinanceContext } = require('../backend/src/services/finance.context.service');
const {
  archiveFinanceAccount,
  createFinanceAccount,
  getFinanceAccount,
  unarchiveFinanceAccount,
} = require('../backend/src/services/finance.account.service');
const { correctAccountBalance } = require('../backend/src/services/finance.balance.correction.service');
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
  console.error('ENVIRONMENT_FAILURE: Finance 3D tests are local-only.');
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

async function applyMigrations() {
  await applyMigration('supabase/migrations/20260813010000_finance_category_authority_v1_1.sql');
  await applyMigration('supabase/migrations/20260813020000_finance_expense_income_transactions_v1_1.sql');
  await applyMigration('supabase/migrations/20260814010000_finance_account_authority_v1_1.sql');
  await applyMigration('supabase/migrations/20260814020000_finance_balance_anchor_account_effects_v1_1.sql');
  await applyMigration('supabase/migrations/20260814030000_finance_balance_correction_v1_1.sql');
  await applyMigration('supabase/migrations/20260814040000_finance_credit_card_purchase_semantics_v1_1.sql');
  await new Promise((resolve) => setTimeout(resolve, 250));
}

function randomCredential(label) {
  return `Fin3D_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin3d-${label}-${suffix}@example.test`;
  const password = randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 3D QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 3D ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `fin3d-${crypto.randomBytes(8).toString('hex')}`,
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
  const hhA = await createHousehold('Fin 3D A', personA.id, [{ personId: personA.id, role: 'adult' }]);
  const hhB = await createHousehold('Fin 3D B', personA.id, [
    { personId: personA.id, role: 'adult' },
    { personId: personB.id, role: 'coordinator' },
  ]);
  const hhC = await createHousehold('Fin 3D C', personC.id, [{ personId: personC.id, role: 'adult' }]);
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

async function card(ctx, overrides = {}) {
  return account(ctx, {
    name: `Tarjeta ${crypto.randomBytes(4).toString('hex')}`,
    accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
    ...overrides,
  });
}

async function knownCard(ctx, amount, effectiveDate = '2026-08-14', overrides = {}) {
  return card(ctx, {
    initialBalance: { amount, effectiveDate },
    ...overrides,
  });
}

async function refreshed(ctx, accountId) {
  return (await getFinanceAccount(ctx, accountId)).account;
}

async function effectRows(accountId, transactionId = null) {
  const params = transactionId ? [accountId, transactionId] : [accountId];
  const where = transactionId ? 'where account_id = $1 and transaction_id = $2' : 'where account_id = $1';
  const { rows } = await queryDb(`select * from public.finance_account_effects ${where} order by created_at`, params);
  return rows;
}

async function transactionRows(transactionId) {
  const { rows } = await queryDb('select * from public.finance_transactions where id = $1', [transactionId]);
  return rows;
}

async function tableExists(tableName) {
  const { rows } = await queryDb('select to_regclass($1) as table_name', [`public.${tableName}`]);
  return Boolean(rows[0].table_name);
}

function summaryAmount(summary, currency, field) {
  const bucket = summary.currencies.find((candidate) => candidate.currency === currency);
  return Number(bucket?.[field] ?? 0);
}

async function testTypeBoundary(actors) {
  console.log('\nD01-D05 - Account type boundary');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const control = await account(personalA, {
    name: 'Control ACCOUNT',
    initialBalance: { amount: '100', effectiveDate: '2026-08-14' },
  });
  const controlExpense = await trackTransaction(await createExpense(personalA, {
    amount: '10', currency: 'ARS', date: '2026-08-15', account: { id: control.id },
  }));
  equal(controlExpense.type, 'expense', 'D01 ACCOUNT still works as before');
  equal((await refreshed(personalA, control.id)).currentBalance, '90', 'D01 ACCOUNT balance decreases normally');

  const visa = await card(personalA, { name: 'Visa explicit' });
  const visaRows = await queryDb('select account_type from public.finance_accounts where id = $1', [visa.id]);
  equal(visaRows.rows[0].account_type, FINANCE_ACCOUNT_TYPES.CREDIT_CARD, 'D02 CREDIT_CARD remains finance_accounts entity type');
  equal(await tableExists('finance_credit_cards'), false, 'D03 no finance_credit_cards table exists');
  await expectError(
    () => createFinanceAccount(personalA, { name: 'Visa Sin Tipo', currency: 'ARS' }),
    'finance_account_type_required',
    'D04 Account type inference from Name remains forbidden',
  );
  const mastercardNamedAccount = await account(personalA, { name: 'Mastercard Caja', accountType: FINANCE_ACCOUNT_TYPES.ACCOUNT });
  equal(mastercardNamedAccount.accountType, FINANCE_ACCOUNT_TYPES.ACCOUNT, 'D05 Mastercard naming does not determine type');
}

async function testPurchaseSemantics(actors) {
  console.log('\nD06-D21 - Purchase, exact counting and UNKNOWN balance');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const zero = await knownCard(personalA, '0', '2026-08-14', { name: 'Known zero card' });
  const beforeSummary = await summarizeFinance(personalA, { month: '2026-08' });
  const purchase = await trackTransaction(await createExpense(personalA, {
    amount: '100', currency: 'ARS', date: '2026-08-15', account: { id: zero.id }, description: 'Card purchase zero',
  }));
  const txRows = await transactionRows(purchase.id);
  const effects = await effectRows(zero.id, purchase.id);
  const afterSummary = await summarizeFinance(personalA, { month: '2026-08' });
  const movements = await listFinanceMovements(personalA, { month: '2026-08' });

  equal(purchase.type, 'expense', 'D06/D07 Expense + Personal CREDIT_CARD persists as expense');
  equal(txRows.length, 1, 'D08/D09 no new transaction class and exactly one Expense row persists');
  equal(txRows[0].transaction_type, 'expense', 'D08 no credit_card_purchase/card_purchase transaction_type exists');
  equal(effects.length, 1, 'D10 exactly one Account effect persists');
  equal(effects[0].effect_amount, '-100.0000', 'D11 Account effect sign decreases signed Account balance');
  equal((await refreshed(personalA, zero.id)).currentBalance, '-100', 'D12 Anchor 0 + Expense 100 -> currentBalance -100');
  equal(summaryAmount(afterSummary, 'ARS', 'expense') - summaryAmount(beforeSummary, 'ARS', 'expense'), 100, 'D14 Expense remains counted once in Resumen');
  equal(movements.movements.filter((movement) => movement.id === purchase.id).length, 1, 'D15 no duplicate card-purchase financial row in Movimientos');

  const existingDebt = await knownCard(personalA, '-500', '2026-08-14', { name: 'Existing debt card' });
  await trackTransaction(await createExpense(personalA, {
    amount: '100', currency: 'ARS', date: '2026-08-15', account: { id: existingDebt.id },
  }));
  equal((await refreshed(personalA, existingDebt.id)).currentBalance, '-600', 'D13 Anchor -500 + Expense 100 -> currentBalance -600');

  const unknown = await card(personalA, { name: 'Unknown card' });
  const unknownPurchase = await trackTransaction(await createExpense(personalA, {
    amount: '50', currency: 'ARS', date: '2026-08-15', account: { id: unknown.id },
  }));
  equal(unknownPurchase.type, 'expense', 'D16/D17 UNKNOWN CREDIT_CARD purchase persists as Expense');
  equal((await effectRows(unknown.id, unknownPurchase.id)).length, 1, 'D18 UNKNOWN CREDIT_CARD purchase persists Account effect');
  const unknownAfter = await refreshed(personalA, unknown.id);
  equal(unknownAfter.balanceState, FINANCE_ACCOUNT_BALANCE_STATES.UNKNOWN, 'D19 UNKNOWN card balanceState remains UNKNOWN');
  equal(unknownAfter.currentBalance, null, 'D20 UNKNOWN card currentBalance remains null');
  assert(!unknownAfter.currentBalance, 'D21 system does not assume opening balance 0');
}

async function testContextPrivacy(actors) {
  console.log('\nD22-D31 - Context, privacy and relationship boundaries');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const householdB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  const personalCard = await knownCard(personalA, '0', '2026-08-14', { name: 'Personal card privacy' });
  await trackTransaction(await createExpense(personalA, {
    amount: '10', currency: 'ARS', date: '2026-08-15', account: { id: personalCard.id },
  }));
  equal((await refreshed(personalA, personalCard.id)).currentBalance, '-10', 'D22 Personal Expense + own Personal CREDIT_CARD PASS');

  const householdCard = await knownCard(householdA, '0', '2026-08-14', { name: 'Household card' });
  await trackTransaction(await createExpense(householdA, {
    amount: '20', currency: 'ARS', date: '2026-08-15', account: { id: householdCard.id },
  }));
  equal((await refreshed(householdA, householdCard.id)).currentBalance, '-20', 'D23 Household Expense + active Household CREDIT_CARD PASS');

  const privateFundingCard = await knownCard(personalA, '0', '2026-08-14', { name: 'Private funding card' });
  const beforeHousehold = await summarizeFinance(householdA, { month: '2026-08' });
  const beforePersonal = await summarizeFinance(personalA, { month: '2026-08' });
  const householdFunded = await trackTransaction(await createExpense(householdA, {
    amount: '30', currency: 'ARS', date: '2026-08-15', account: { id: privateFundingCard.id },
  }));
  const afterHousehold = await summarizeFinance(householdA, { month: '2026-08' });
  const afterPersonal = await summarizeFinance(personalA, { month: '2026-08' });
  const householdMovements = await listFinanceMovements(householdB, { month: '2026-08' });
  const movement = householdMovements.movements.find((candidate) => candidate.id === householdFunded.id);
  const bReadCard = await actors.b.client.from('finance_accounts').select('*').eq('id', privateFundingCard.id);
  const bReadEffects = await actors.b.client.from('finance_account_effects').select('*').eq('transaction_id', householdFunded.id);

  equal(householdFunded.financialContextType, FINANCE_CONTEXT_TYPES.HOUSEHOLD, 'D24/D25 personal-funded card Expense remains Household Expense');
  equal(summaryAmount(afterHousehold, 'ARS', 'expense') - summaryAmount(beforeHousehold, 'ARS', 'expense'), 30, 'D25 Household Expense counted once in Household');
  equal(summaryAmount(afterPersonal, 'ARS', 'expense') - summaryAmount(beforePersonal, 'ARS', 'expense'), 0, 'D26 Household Expense not duplicated into Personal spending');
  equal((await effectRows(privateFundingCard.id, householdFunded.id)).length, 1, 'D27 Personal card Account effect occurs once');
  assert(Boolean(movement) && !('accountId' in movement) && !('accountName' in movement), 'D28 Household member movement cannot discover private card internals');
  equal(bReadCard.data?.length ?? 0, 0, 'D28 Household member cannot read private Personal CREDIT_CARD');
  equal(bReadEffects.data?.length ?? 0, 0, 'D28 Household member cannot read private card effects');

  const bPrivateCard = await knownCard(personalB, '0', '2026-08-14', { name: 'B private card' });
  await expectError(
    () => createExpense(householdA, { amount: '1', currency: 'ARS', date: '2026-08-15', account: { id: bPrivateCard.id } }),
    'invalid_finance_transaction_account',
    'D29 other person Personal CREDIT_CARD denied',
  );
  await expectError(
    () => createExpense(personalA, { amount: '1', currency: 'ARS', date: '2026-08-15', account: { id: householdCard.id } }),
    'invalid_finance_transaction_account_relationship',
    'D30 Personal Expense + Household CREDIT_CARD denied',
  );

  const nonActiveHouseholdCard = await knownCard(householdA, '0', '2026-08-14', { name: 'Non-active HH card' });
  await setActiveHousehold(actors.a.person.id, actors.households.a.id);
  const inactiveHouseholdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  await expectError(
    () => createExpense(inactiveHouseholdA, { amount: '1', currency: 'ARS', date: '2026-08-15', account: { id: nonActiveHouseholdCard.id } }),
    'invalid_finance_transaction_account',
    'D31 non-active Household CREDIT_CARD denied',
  );
  await setActiveHousehold(actors.a.person.id, actors.households.b.id);
}

async function testCurrencyLifecycleCorrection(actors) {
  console.log('\nD32-D44 - Currency, lifecycle, correction and historical boundary');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const ars = await knownCard(personalA, '0', '2026-08-14', { currency: 'ARS', name: 'ARS card' });
  await trackTransaction(await createExpense(personalA, { amount: '1', currency: 'ARS', date: '2026-08-15', account: { id: ars.id } }));
  equal((await refreshed(personalA, ars.id)).currentBalance, '-1', 'D32 ARS Card + ARS Expense PASS');
  const usd = await knownCard(personalA, '0', '2026-08-14', { currency: 'USD', name: 'USD card' });
  await trackTransaction(await createExpense(personalA, { amount: '1', currency: 'USD', date: '2026-08-15', account: { id: usd.id } }));
  equal((await refreshed(personalA, usd.id)).currentBalance, '-1', 'D33 USD Card + USD Expense PASS');
  await expectError(
    () => createExpense(personalA, { amount: '1', currency: 'USD', date: '2026-08-15', account: { id: ars.id } }),
    'finance_account_currency_mismatch',
    'D34 ARS Card + USD Expense association rejected',
  );
  const backendText = fs.readFileSync(path.join(root, 'backend/src/services/finance.account.service.js'), 'utf8')
    + fs.readFileSync(path.join(root, 'backend/src/services/finance.transaction.service.js'), 'utf8');
  assert(!/exchange|fx|rate_to|convertCurrency|toCurrency|fx_rate/i.test(backendText), 'D35 no FX');

  const archived = await knownCard(personalA, '0', '2026-08-14', { name: 'Archived card' });
  const beforeArchiveTx = await trackTransaction(await createExpense(personalA, {
    amount: '25', currency: 'ARS', date: '2026-08-15', account: { id: archived.id },
  }));
  await archiveFinanceAccount(personalA, archived.id);
  await expectError(
    () => createExpense(personalA, { amount: '1', currency: 'ARS', date: '2026-08-16', account: { id: archived.id } }),
    'finance_account_archived',
    'D36 archived CREDIT_CARD cannot receive new purchase Expense',
  );
  equal((await refreshed(personalA, archived.id)).currentBalance, '-25', 'D37 archived Card preserves existing Balance');
  equal((await effectRows(archived.id, beforeArchiveTx.id)).length, 1, 'D38 archived Card preserves purchase effect/history');
  await unarchiveFinanceAccount(personalA, archived.id);
  await trackTransaction(await createExpense(personalA, { amount: '5', currency: 'ARS', date: '2026-08-16', account: { id: archived.id } }));
  equal((await refreshed(personalA, archived.id)).currentBalance, '-30', 'D39 unarchive restores purchase eligibility');

  const initial = await knownCard(personalA, '-100', '2026-08-14', { name: 'Initial anchor card' });
  equal(initial.currentBalance, '-100', 'D40 CREDIT_CARD initial Anchor remains generic 3B truth');
  const beforeCorrectionTxCount = (await queryDb('select count(*)::int as count from public.finance_transactions')).rows[0].count;
  const corrected = await correctAccountBalance(personalA, initial.id, { correctedBalance: '-500', effectiveDate: '2026-08-15' });
  const afterCorrectionTxCount = (await queryDb('select count(*)::int as count from public.finance_transactions')).rows[0].count;
  equal(corrected.account.currentBalance, '-500', 'D41 CREDIT_CARD Balance Correction remains generic 3C truth');
  equal(afterCorrectionTxCount, beforeCorrectionTxCount, 'D42 correction creates no Expense');
  await trackTransaction(await createExpense(personalA, { amount: '100', currency: 'ARS', date: '2026-08-16', account: { id: initial.id } }));
  equal((await refreshed(personalA, initial.id)).currentBalance, '-600', 'D43 after Correction -500, later purchase 100 -> -600');

  const historical = await knownCard(personalA, '0', '2026-08-20', { name: 'Historical card' });
  await trackTransaction(await createExpense(personalA, { amount: '100', currency: 'ARS', date: '2026-08-19', account: { id: historical.id } }));
  equal((await refreshed(personalA, historical.id)).currentBalance, '0', 'D44 historical pre-Anchor card Expense does not double-count Balance');
}

async function testIncomePaymentTransferAndNegativeScope(actors) {
  console.log('\nD45-D65 - Income, payment/transfer boundary and negative scope');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const cc = await knownCard(personalA, '-100', '2026-08-14', { name: 'Income denied card' });

  await expectError(
    () => createIncome(personalA, { amount: '10', currency: 'ARS', date: '2026-08-15', account: { id: cc.id } }),
    'finance_credit_card_income_denied',
    'D45 ordinary Income -> CREDIT_CARD remains rejected',
  );
  equal((await refreshed(personalA, cc.id)).currentBalance, '-100', 'D48 no automatic positive Account effect through Income to pay debt');

  const routeText = fs.readFileSync(path.join(root, 'backend/src/routes/finance.js'), 'utf8');
  const migrationText = fs.readFileSync(path.join(root, 'supabase/migrations/20260814040000_finance_credit_card_purchase_semantics_v1_1.sql'), 'utf8');
  const backendFinance = [
    'backend/src/services/finance.account.service.js',
    'backend/src/services/finance.transaction.service.js',
    'backend/src/services/finance.balance.correction.service.js',
  ].map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');

  assert(!/card refund|refund as Income|card_refund|refund.*CREDIT_CARD/i.test(backendFinance), 'D46/D47 card payment/refund are NOT implemented as Income');
  assert(!/credit-card-payment|card-payment|settlement|paid_status|PAID/i.test(routeText + backendFinance), 'D49 no Credit Card Payment mutation exists');
  assert(!/card.*transfer.*payment|transfer.*card.*settlement|commission/i.test(routeText + backendFinance), 'D50 no card Payment Transfer semantics implemented by 3D');
  assert(!/fake card payment|second Expense/i.test(backendFinance), 'D51 no second Expense created as fake card payment');
  assert(/effect_amount numeric\(18, 4\) not null/i.test(fs.readFileSync(path.join(root, 'supabase/migrations/20260814020000_finance_balance_anchor_account_effects_v1_1.sql'), 'utf8')), 'D52 effect schema remains signed and future-positive compatible');

  const cardTables = await queryDb("select table_name from information_schema.tables where table_schema = 'public' and table_name ~ '(credit_card|card_statement|card_transaction|card_payment|installment)'");
  equal(cardTables.rows.length, 0, 'D53/D57/D60/D61 no card-specific table/subsystem exists');
  const forbiddenFinanceTables = await queryDb("select table_name from information_schema.tables where table_schema = 'public' and table_name ~ 'finance_.*(budget|payment|statement|installment|credit_limit|available_credit)' ");
  equal(forbiddenFinanceTables.rows.length, 0, 'D53-D65 no statement/due/minimum/installment/credit-limit/budget/payment tables');
  assert(!/closing_date|due_date|minimum_payment|installments|credit_limit|available_credit|statement period|billing cycle/i.test(migrationText + backendFinance), 'D54-D59 no card billing/limit engine');
  assert(!/Account selector|Deuda actual UI|Credit Card icon|Nueva cuenta UI|Account Detail/i.test(backendFinance), 'D62 no frontend');
}

async function testStaticContracts() {
  console.log('\nStatic contracts - migration allow-list and aggregate registration');
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
    'exact Finance migration allow-list includes 3G migration',
  );
  const runJs = fs.readFileSync(path.join(root, 'tests/run.js'), 'utf8');
  assert(runJs.includes('finance-3d-credit-card-semantics') && runJs.includes("'finance-3d'"), 'node tests/run.js finance-3d registered');
  assert(runJs.includes('finance-3d-credit-card-semantics') && /finance:\s*\[[\s\S]*finance-3d-credit-card-semantics/.test(runJs), 'aggregate Finance suite includes 3D');
}

async function assertFixtureCleanup() {
  const people = await queryDb("select count(*)::int as count from public.people where display_name like 'Fin 3D %'");
  const households = await queryDb("select count(*)::int as count from public.households where slug like 'fin3d-%'");
  const accounts = fixture.accountIds.length
    ? await queryDb('select count(*)::int as count from public.finance_accounts where id = any($1::uuid[])', [fixture.accountIds])
    : { rows: [{ count: 0 }] };
  equal(people.rows[0].count, 0, 'fixture cleanup leaves no 3D people');
  equal(households.rows[0].count, 0, 'fixture cleanup leaves no 3D households');
  equal(accounts.rows[0].count, 0, 'fixture cleanup leaves no 3D account rows');
}

async function main() {
  console.log('FINANCE_3D_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigrations();
  const actors = await setupActors();

  try {
    await testTypeBoundary(actors);
    await testPurchaseSemantics(actors);
    await testContextPrivacy(actors);
    await testCurrencyLifecycleCorrection(actors);
    await testIncomePaymentTransferAndNegativeScope(actors);
    await testStaticContracts();
  } finally {
    await cleanup();
  }

  await assertFixtureCleanup();

  console.log(`\nFINANCE_3D_CREDIT_CARD_SEMANTICS_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_3D_CREDIT_CARD_SEMANTICS_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_3D_CREDIT_CARD_SEMANTICS_TESTS=PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_3D_CREDIT_CARD_SEMANTICS_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
