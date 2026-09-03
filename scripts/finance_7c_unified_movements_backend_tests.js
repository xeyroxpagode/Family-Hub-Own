#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 Stage 7C - Unified Movements Backend Tests.
 *
 * Local Supabase only. Validates:
 * 1. Expense row returned with kind EXPENSE, positive factual amounts, refund composition preserved
 * 2. Income row returned with kind INCOME, positive amount
 * 3. Transfer row returned with kind TRANSFER, source/destination account objects, positive amounts
 * 4. same-currency Transfer
 * 5. cross-currency Transfer
 * 6. commission: Transfer row association + separate Expense row both present
 * 7. card-payment Transfer: ACCOUNT -> CREDIT_CARD appears, no payment Expense fabricated
 * 8. deterministic mixed ordering: occurrence_date, created_at, id
 * 9. month filtering
 * 10. Personal isolation
 * 11. Household isolation
 * 12. no Personal<->Household leakage
 * 13. refund never emitted as Income
 * 14. SUPERSEDED excluded
 * 15. TRASHED excluded
 * 16. RESTORED ACTIVE included
 * 17. Transfer detail happy path
 * 18. Transfer detail authorization
 * 19. invalid UUID / not found behavior
 * 20. existing /movements Expense/Income compatibility
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
  FINANCE_ACCOUNT_TYPES,
} = require('../backend/src/constants/finance.constants');
const { resolveFinanceContext } = require('../backend/src/services/finance.context.service');
const {
  createFinanceCategory,
  deleteFinanceCategory,
} = require('../backend/src/services/finance.category.service');
const {
  createExpense,
  createIncome,
} = require('../backend/src/services/finance.transaction.service');
const {
  createTransfer,
} = require('../backend/src/services/finance.transfer.service');
const {
  listFinanceMovements,
  getTransferDetail,
  normalizePeriodMonth,
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
  console.error('ENVIRONMENT_FAILURE: Finance 7C tests are local-only.');
  process.exit(2);
}

const databaseUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:56222/postgres';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { createFinanceAccount } = require('../backend/src/services/finance.account.service');

let passCount = 0;
let failCount = 0;
const fixture = {
  authUserIds: [],
  personIds: [],
  householdIds: [],
  categoryIds: [],
  transactionIds: [],
  transferIds: [],
  accountIds: [],
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
  const pass = actual === expected;
  if (pass) {
    passCount += 1;
    console.log(`  PASS: ${message} (expected "${expected}", got "${actual}")`);
  } else {
    failCount += 1;
    console.error(`  FAIL: ${message} (expected "${expected}", got "${actual}")`);
  }
  return pass;
}

async function expectError(fn, expectedCode, message) {
  try {
    await fn();
    failCount += 1;
    console.error(`  FAIL: ${message} - expected error ${expectedCode} but none thrown`);
    return false;
  } catch (error) {
    if (error.code === expectedCode) {
      passCount += 1;
      console.log(`  PASS: ${message} (code=${error.code})`);
      return true;
    }
    failCount += 1;
    console.error(`  FAIL: ${message} - expected code ${expectedCode}, got ${error.code}: ${error.message}`);
    return false;
  }
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

async function createAuthUser(label) {
  const email = `fin7c_${label}_${crypto.randomBytes(8).toString('hex')}@test.local`;
  const password = `Fin7C_${label}_${crypto.randomBytes(8).toString('base64url')}!9a`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser failed: ${error.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const { data, error } = await admin.from('people').insert({
    auth_user_id: authUserId,
    display_name: `Fin 7C ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  }).select('*').single();
  if (error) throw new Error(`create person failed: ${error.message}`);
  fixture.personIds.push(data.id);
  return data;
}

async function createHousehold(name, ownerPersonId, members = []) {
  const { data: household, error: hhError } = await admin
    .from('households')
    .insert({
      name,
      slug: `fin7c-${crypto.randomBytes(8).toString('hex')}`,
      timezone: 'America/Argentina/Buenos_Aires',
      default_language: 'es-419',
      config: {},
      created_by_person_id: ownerPersonId,
    })
    .select('*')
    .single();
  if (hhError) throw new Error(`create household failed: ${hhError.message}`);
  fixture.householdIds.push(household.id);

  // Add owner as member (required for active_household_id)
  // Plus any additional non-owner members
  const allMembers = [{ personId: ownerPersonId, role: 'adult' }, ...members];
  const joinedAt = new Date().toISOString();
  // Delete any existing live membership for these people in this household
  await admin.from('household_members').delete().eq('household_id', household.id);
  const { error: memError } = await admin.from('household_members').insert(
    allMembers.map((m) => ({
      household_id: household.id,
      person_id: m.personId,
      role: m.role,
      status: 'active',
      joined_at: joinedAt,
      household_onboarding_status: 'completed',
      household_onboarding_completed_at: joinedAt,
    }))
  );
  if (memError) throw new Error(`create household members failed: ${memError.message}`);
  return { household };
}

async function setActiveHousehold(personId, householdId) {
  const { error } = await admin.from('people').update({ active_household_id: householdId }).eq('id', personId);
  if (error) throw new Error(`set active household failed: ${error.message}`);
}

async function signIn(email, password) {
  const { data, error } = await admin.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign in failed: ${error.message}`);
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
  // Clean up any existing household memberships
  await admin.from('household_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const userA = await createAuthUser('a');
  const userB = await createAuthUser('b');
  const userC = await createAuthUser('c');
  const userD = await createAuthUser('d');
  const personA = await createPerson(userA.user.id, 'A');
  const personB = await createPerson(userB.user.id, 'B');
  const personC = await createPerson(userC.user.id, 'C');
  const personD = await createPerson(userD.user.id, 'D');

  const hhA = await createHousehold('Fin 7C A', personA.id, []);
  const hhB = await createHousehold('Fin 7C B', personD.id, [
    { personId: personA.id, role: 'adult' },
    { personId: personB.id, role: 'coordinator' },
  ]);
  const hhC = await createHousehold('Fin 7C C', personC.id, []);

  await setActiveHousehold(personA.id, hhB.household.id);
  await setActiveHousehold(personB.id, hhB.household.id);
  await setActiveHousehold(personC.id, hhC.household.id);
  await setActiveHousehold(personD.id, hhB.household.id);

  const tokenA = await signIn(userA.email, userA.password);
  const tokenB = await signIn(userB.email, userB.password);
  const tokenC = await signIn(userC.email, userC.password);
  const tokenD = await signIn(userD.email, userD.password);

  return {
    a: { ...userA, person: personA, accessToken: tokenA, client: tokenClient(tokenA) },
    b: { ...userB, person: personB, accessToken: tokenB, client: tokenClient(tokenB) },
    c: { ...userC, person: personC, accessToken: tokenC, client: tokenClient(tokenC) },
    d: { ...userD, person: personD, accessToken: tokenD, client: tokenClient(tokenD) },
    households: { a: hhA.household, b: hhB.household, c: hhC.household },
  };
}

async function cleanup() {
  if (fixture.transferIds.length) {
    await admin.from('finance_transfers').delete().in('id', fixture.transferIds);
  }
  if (fixture.transactionIds.length) {
    await admin.from('finance_transactions').delete().in('id', fixture.transactionIds);
  }
  if (fixture.categoryIds.length) {
    await admin.from('finance_categories').delete().in('id', fixture.categoryIds);
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

async function track(result) {
  if (result.transaction?.id) fixture.transactionIds.push(result.transaction.id);
  if (result.transfer?.id) fixture.transferIds.push(result.transfer.id);
  if (result.account?.id) fixture.accountIds.push(result.account.id);
  return result;
}

async function nativeCategory(nativeKey) {
  const { rows } = await queryDb('select * from public.finance_categories where native_key = $1', [nativeKey]);
  if (!rows[0]) throw new Error(`native category missing: ${nativeKey}`);
  return rows[0];
}

async function createAccount(ctx, { name, currency = 'ARS', accountType = FINANCE_ACCOUNT_TYPES.ACCOUNT }) {
  const result = await createFinanceAccount(ctx, {
    name,
    currency,
    accountType,
  });
  const data = result.account;
  fixture.accountIds.push(data.id);
  return data;
}

async function createExpenseWithAccount(ctx, params, accountId) {
  return track(await createExpense(ctx, { ...params, account: accountId }));
}

function correlation(label) {
  return {
    requestId: `fin7c-req-${label}-${crypto.randomBytes(4).toString('hex')}`,
    mutationId: `fin7c-mut-${label}-${crypto.randomBytes(4).toString('hex')}`,
    idempotencyKey: `fin7c-key-${label}-${crypto.randomBytes(4).toString('hex')}`,
  };
}

async function createTransferWithAccounts(ctx, params) {
  return track(await createTransfer(ctx, params, correlation('transfer')));
}

async function main() {
  console.log('\n=== FINANCE STAGE 7C UNIFIED MOVEMENTS BACKEND TESTS ===');
  const actors = await setupActors();

  try {
    await testExpenseRow(actors);
    await testIncomeRow(actors);
    await testTransferRow(actors);
    await testSameCurrencyTransfer(actors);
    await testCrossCurrencyTransfer(actors);
    await testCommission(actors);
    await testCardPaymentTransfer(actors);
    await testMixedOrdering(actors);
    await testMonthFiltering(actors);
    await testPersonalIsolation(actors);
    await testHouseholdIsolation(actors);
    await testNoLeakage(actors);
    await testRefundNotIncome(actors);
    await testSupersededExcluded(actors);
    await testTrashedExcluded(actors);
    await testRestoredIncluded(actors);
    await testTransferDetailHappyPath(actors);
    await testTransferDetailAuthorization(actors);
    await testTransferDetailNotFound(actors);
    await testBackwardCompatibility(actors);

    console.log(`\n=== FINANCE 7C RESULT: pass=${passCount} fail=${failCount} ===`);
    if (failCount > 0) process.exit(1);
  } finally {
    await cleanup();
  }
}

async function testExpenseRow(actors) {
  console.log('\nT1 - Expense row with kind EXPENSE, positive amounts, refund composition');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const expense = await track(await createExpense(personalA, { amount: 50000, currency: 'ARS', date: '2026-08-15', description: 'Test expense' }));
  const res = await listFinanceMovements(personalA, { period: '2026-08' });
  const m = res.movements.find((x) => x.id === expense.transaction.id);

  assert(m, 'Expense appears in movements');
  equal(m.kind, 'expense', 'kind is expense');
  equal(m.transactionType, 'expense', 'transactionType is expense');
  assert(Number(m.amount) > 0, 'amount is positive');
  equal(m.grossAmount, '50000.0000', 'grossAmount is positive');
  equal(m.totalRefunded, '0', 'totalRefunded is zero');
  equal(m.netAmount, '50000', 'netAmount equals gross amount without trailing zeros');
  assert(Array.isArray(m.refundEvents), 'refundEvents is array');
  equal(m.refundCount, 0, 'refundCount is zero');
}

async function testIncomeRow(actors) {
  console.log('\nT2 - Income row with kind INCOME, positive amount');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const income = await track(await createIncome(personalA, { amount: 100000, currency: 'ARS', date: '2026-08-15', description: 'Test income' }));
  const res = await listFinanceMovements(personalA, { period: '2026-08' });
  const m = res.movements.find((x) => x.id === income.transaction.id);

  assert(m, 'Income appears in movements');
  equal(m.kind, 'income', 'kind is income');
  equal(m.transactionType, 'income', 'transactionType is income');
  assert(Number(m.amount) > 0, 'amount is positive');
  equal(m.grossAmount, '100000.0000', 'grossAmount is positive');
}

async function testTransferRow(actors) {
  console.log('\nT3 - Transfer row with kind TRANSFER, account objects, positive amounts');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const acc1 = await createAccount(personalA, { name: 'Source', currency: 'ARS' });
  const acc2 = await createAccount(personalA, { name: 'Dest', currency: 'ARS' });

  const transfer = await createTransferWithAccounts(personalA, {
    sourceAccount: acc1.id,
    destinationAccount: acc2.id,
    sourceAmount: '25000',
    destinationAmount: '25000',
    date: '2026-08-15',
    description: 'Test transfer',
  });

  const res = await listFinanceMovements(personalA, { period: '2026-08' });
  const m = res.movements.find((x) => x.id === transfer.transfer.id);

  assert(m, 'Transfer appears in movements');
  equal(m.kind, 'transfer', 'kind is transfer');
  equal(m.transactionType, 'transfer', 'transactionType is transfer');
  assert(m.sourceAccount, 'sourceAccount present');
  assert(m.destinationAccount, 'destinationAccount present');
  equal(m.sourceAccount.id, acc1.id, 'sourceAccount id matches');
  equal(m.destinationAccount.id, acc2.id, 'destinationAccount id matches');
  assert(Number(m.sourceAmount) > 0, 'sourceAmount is positive');
  assert(Number(m.destinationAmount) > 0, 'destinationAmount is positive');
  equal(m.sourceAmount, '25000.0000', 'sourceAmount correct');
  equal(m.destinationAmount, '25000.0000', 'destinationAmount correct');
  assert(m.sourceCurrency === 'ARS', 'sourceCurrency is ARS');
  assert(m.destinationCurrency === 'ARS', 'destinationCurrency is ARS');
}

async function testSameCurrencyTransfer(actors) {
  console.log('\nT4 - Same-currency Transfer');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const acc1 = await createAccount(personalA, { name: 'SameSrc', currency: 'ARS' });
  const acc2 = await createAccount(personalA, { name: 'SameDst', currency: 'ARS' });

  await createTransferWithAccounts(personalA, {
    sourceAccount: acc1.id,
    destinationAccount: acc2.id,
    sourceAmount: '10000',
    destinationAmount: '10000',
    date: '2026-08-20',
  });

  const res = await listFinanceMovements(personalA, { period: '2026-08' });
  const m = res.movements.find((x) => x.kind === 'transfer' && x.sourceAmount === '10000.0000');
  assert(m, 'Same-currency transfer appears');
  equal(m.sourceAmount, m.destinationAmount, 'sourceAmount equals destinationAmount in same currency');
}

async function testCrossCurrencyTransfer(actors) {
  console.log('\nT5 - Cross-currency Transfer');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const acc1 = await createAccount(personalA, { name: 'CrossSrc', currency: 'ARS' });
  const acc2 = await createAccount(personalA, { name: 'CrossDst', currency: 'USD' });

  await createTransferWithAccounts(personalA, {
    sourceAccount: acc1.id,
    destinationAccount: acc2.id,
    sourceAmount: '150000',
    destinationAmount: '100',
    date: '2026-08-20',
  });

  const res = await listFinanceMovements(personalA, { period: '2026-08' });
  const m = res.movements.find((x) => x.kind === 'transfer' && x.sourceAmount === '150000.0000');
  assert(m, 'Cross-currency transfer appears');
  equal(m.sourceCurrency, 'ARS', 'sourceCurrency is ARS');
  equal(m.destinationCurrency, 'USD', 'destinationCurrency is USD');
  assert(Number(m.sourceAmount) !== Number(m.destinationAmount), 'amounts differ across currencies');
}

async function testCommission(actors) {
  console.log('\nT6 - Commission: Transfer row + separate Expense row');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const acc1 = await createAccount(personalA, { name: 'CommSrc', currency: 'ARS' });
  const acc2 = await createAccount(personalA, { name: 'CommDst', currency: 'ARS' });

  await createTransferWithAccounts(personalA, {
    sourceAccount: acc1.id,
    destinationAccount: acc2.id,
    sourceAmount: '20000',
    destinationAmount: '20000',
    date: '2026-08-20',
    commissionAmount: '1000',
  });

  const res = await listFinanceMovements(personalA, { period: '2026-08' });

  const transfer = res.movements.find((x) => x.kind === 'transfer' && x.sourceAmount === '20000.0000');
  assert(transfer, 'Transfer row present');
  assert(transfer.commission, 'Transfer has commission association');
  equal(transfer.commission.amount, '1000.0000', 'commission amount correct');
  equal(transfer.commission.currency, 'ARS', 'commission currency correct');

  const commissionExpense = res.movements.find((x) => x.kind === 'expense' && x.amount === '1000.0000');
  assert(commissionExpense, 'Commission Expense row present');
  equal(commissionExpense.transactionType, 'expense', 'commission is expense');
}

async function testCardPaymentTransfer(actors) {
  console.log('\nT7 - Card payment Transfer (ACCOUNT -> CREDIT_CARD)');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const acc = await createAccount(personalA, { name: 'Checking', currency: 'ARS' });
  const card = await createAccount(personalA, { name: 'Visa', currency: 'ARS', accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD });

  await createTransferWithAccounts(personalA, {
    sourceAccount: acc.id,
    destinationAccount: card.id,
    sourceAmount: '30000',
    destinationAmount: '30000',
    date: '2026-08-25',
  });

  const res = await listFinanceMovements(personalA, { period: '2026-08' });
  const transfer = res.movements.find((x) => x.kind === 'transfer' && x.destinationAccount.accountType === 'CREDIT_CARD');
  assert(transfer, 'ACCOUNT -> CREDIT_CARD transfer appears');
  equal(transfer.destinationAccount.accountType, 'CREDIT_CARD', 'destination is CREDIT_CARD');

  const extraExpense = res.movements.find((x) => x.kind === 'expense' && x.description === 'Pago tarjeta');
  assert(!extraExpense, 'No fabricated payment Expense');
}

async function testMixedOrdering(actors) {
  console.log('\nT8 - Deterministic mixed ordering');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const acc1 = await createAccount(personalA, { name: 'OrdSrc1', currency: 'ARS' });
  const acc2 = await createAccount(personalA, { name: 'OrdDst1', currency: 'ARS' });
  const acc3 = await createAccount(personalA, { name: 'OrdSrc2', currency: 'ARS' });
  const acc4 = await createAccount(personalA, { name: 'OrdDst2', currency: 'ARS' });

  // Create in mixed order: expense, transfer, income, transfer
  const expense = await track(await createExpense(personalA, { amount: 1000, currency: 'ARS', date: '2026-08-10', description: 'expense1' }));
  const transfer1 = await createTransferWithAccounts(personalA, { sourceAccount: acc1.id, destinationAccount: acc2.id, sourceAmount: '2000', destinationAmount: '2000', date: '2026-08-12' });
  const income = await track(await createIncome(personalA, { amount: 3000, currency: 'ARS', date: '2026-08-08', description: 'income1' }));
  const transfer2 = await createTransferWithAccounts(personalA, { sourceAccount: acc3.id, destinationAccount: acc4.id, sourceAmount: '4000', destinationAmount: '4000', date: '2026-08-15' });

  const res = await listFinanceMovements(personalA, { period: '2026-08' });
  const createdIds = new Set([
    transfer2.transfer.id,
    transfer1.transfer.id,
    expense.transaction.id,
    income.transaction.id,
  ]);
  const dates = res.movements.filter((m) => createdIds.has(m.id)).map((m) => m.transactionDate);

  // Should be ordered by occurrence_date DESC (transfer_date for transfers, transaction_date for txns)
  // So: 2026-08-15 (transfer2), 2026-08-12 (transfer1), 2026-08-10 (expense), 2026-08-08 (income)
  const expectedOrder = ['2026-08-15', '2026-08-12', '2026-08-10', '2026-08-08'];
  for (let i = 0; i < expectedOrder.length; i++) {
    assert(dates[i] === expectedOrder[i], `Ordering [${i}]: ${dates[i]} === ${expectedOrder[i]}`);
  }
}

async function testMonthFiltering(actors) {
  console.log('\nT9 - Month filtering');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  await track(await createExpense(personalA, { amount: 100, currency: 'ARS', date: '2026-07-15' }));
  await track(await createExpense(personalA, { amount: 200, currency: 'ARS', date: '2026-08-15' }));
  await track(await createExpense(personalA, { amount: 300, currency: 'ARS', date: '2026-09-15' }));

  const jul = await listFinanceMovements(personalA, { period: '2026-07' });
  const aug = await listFinanceMovements(personalA, { period: '2026-08' });
  const sep = await listFinanceMovements(personalA, { period: '2026-09' });

  assert(jul.movements.some((m) => m.amount === '100.0000'), 'July includes July expense');
  assert(!jul.movements.some((m) => m.amount === '200.0000'), 'July excludes August expense');
  assert(aug.movements.some((m) => m.amount === '200.0000'), 'August includes August expense');
  assert(!aug.movements.some((m) => m.amount === '100.0000'), 'August excludes July expense');
  assert(sep.movements.some((m) => m.amount === '300.0000'), 'September includes September expense');
}

async function testPersonalIsolation(actors) {
  console.log('\nT10 - Personal isolation');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);

  await track(await createExpense(personalA, { amount: 500, currency: 'ARS', date: '2026-08-15' }));
  const resB = await listFinanceMovements(personalB, { period: '2026-08' });

  assert(!resB.movements.some((m) => m.amount === '500.0000'), 'Person B does not see Person A expense');
}

async function testHouseholdIsolation(actors) {
  console.log('\nT11 - Household isolation');
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const householdC = await resolvedContext(actors.c, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  await track(await createExpense(householdA, { amount: 700, currency: 'ARS', date: '2026-08-15' }));
  const resC = await listFinanceMovements(householdC, { period: '2026-08' });

  assert(!resC.movements.some((m) => m.amount === '700.0000'), 'Household C does not see Household B expense');
}

async function testNoLeakage(actors) {
  console.log('\nT12 - No Personal<->Household leakage');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  await track(await createExpense(personalA, { amount: 800, currency: 'ARS', date: '2026-08-15' }));
  await track(await createExpense(householdA, { amount: 900, currency: 'ARS', date: '2026-08-15' }));

  const resPersonal = await listFinanceMovements(personalA, { period: '2026-08' });
  const resHousehold = await listFinanceMovements(householdA, { period: '2026-08' });

  assert(resPersonal.movements.some((m) => m.amount === '800.0000'), 'Personal sees personal expense');
  assert(!resPersonal.movements.some((m) => m.amount === '900.0000'), 'Personal does not see household expense');
  assert(resHousehold.movements.some((m) => m.amount === '900.0000'), 'Household sees household expense');
  assert(!resHousehold.movements.some((m) => m.amount === '800.0000'), 'Household does not see personal expense');
}

async function testRefundNotIncome(actors) {
  console.log('\nT13 - Refund never emitted as Income');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const expense = await track(await createExpense(personalA, { amount: 10000, currency: 'ARS', date: '2026-08-15' }));

  const { createRefund } = require('../backend/src/services/finance.refund.service');
  const refund = await createRefund(personalA, {
    transactionId: expense.transaction.id,
    amount: '3000',
    effectiveDate: '2026-08-16',
    mutationId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
  });

  const res = await listFinanceMovements(personalA, { period: '2026-08' });
  const incomeFromRefund = res.movements.find((m) => m.kind === 'income' && m.id === refund.refund.id);
  assert(!incomeFromRefund, 'Refund does not appear as Income kind');
  const expenseWithRefund = res.movements.find((m) => m.id === expense.transaction.id);
  assert(expenseWithRefund, 'Original expense still present');
  equal(expenseWithRefund.totalRefunded, '3000', 'totalRefunded updated');
  equal(expenseWithRefund.netAmount, '7000', 'netAmount reflects refund');
}

async function testSupersededExcluded(actors) {
  console.log('\nT14 - SUPERSEDED excluded');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const expense = await track(await createExpense(personalA, { amount: 5000, currency: 'ARS', date: '2026-08-15' }));
  const { correctTransaction } = require('../backend/src/services/finance.transaction.correction.service');
  const mutationId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();
  const payload = { transactionId: expense.transaction.id, amount: '3000' };
  const { hashIdempotencyRequestV2 } = require('../backend/src/lib/plannerIdempotencyAdapter');
  const payloadHash = await hashIdempotencyRequestV2({
    operation: 'finance.transaction.correct',
    scopeType: 'personal',
    scopeId: personalA.personId,
    targetId: expense.transaction.id,
    payload,
    expectedVersion: null,
    mutationId,
  });

  await correctTransaction(personalA, {
    ...payload,
    contextType: 'personal',
    mutationId,
    idempotencyKey,
    payloadHash,
  });

  const res = await listFinanceMovements(personalA, { period: '2026-08' });
  const superseded = res.movements.find((m) => m.id === expense.transaction.id);
  assert(!superseded, 'SUPERSEDED original not in movements');
  const replacement = res.movements.find((m) => m.amount === '3000.0000' && m.rootTransactionId !== m.id);
  assert(replacement, 'Replacement appears in movements');
}

async function testTrashedExcluded(actors) {
  console.log('\nT15 - TRASHED excluded');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const expense = await track(await createExpense(personalA, { amount: 100, currency: 'ARS', date: '2026-08-15' }));
  const { trashFinanceTransaction } = require('../backend/src/services/finance.transaction.trash.service');
  const mutationId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();
  const payload = { transactionId: expense.transaction.id };
  const { hashIdempotencyRequestV2 } = require('../backend/src/lib/plannerIdempotencyAdapter');
  const payloadHash = await hashIdempotencyRequestV2({
    operation: 'finance.transaction.trash',
    scopeType: 'personal',
    scopeId: personalA.personId,
    targetId: expense.transaction.id,
    payload,
    expectedVersion: null,
    mutationId,
  });

  await trashFinanceTransaction(personalA, { ...payload, contextType: 'personal', mutationId, idempotencyKey, payloadHash });

  const res = await listFinanceMovements(personalA, { period: '2026-08' });
  assert(!res.movements.some((m) => m.id === expense.transaction.id), 'TRASHED expense not in movements');
}

async function testRestoredIncluded(actors) {
  console.log('\nT16 - RESTORED ACTIVE included');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const expense = await track(await createExpense(personalA, { amount: 200, currency: 'ARS', date: '2026-08-15' }));
  const { trashFinanceTransaction } = require('../backend/src/services/finance.transaction.trash.service');
  const { restoreFinanceTransaction } = require('../backend/src/services/finance.transaction.restore.service');
  const mutationId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();
  const payload = { transactionId: expense.transaction.id };
  const { hashIdempotencyRequestV2 } = require('../backend/src/lib/plannerIdempotencyAdapter');
  const payloadHash = await hashIdempotencyRequestV2({
    operation: 'finance.transaction.trash',
    scopeType: 'personal',
    scopeId: personalA.personId,
    targetId: expense.transaction.id,
    payload,
    expectedVersion: null,
    mutationId,
  });

  await trashFinanceTransaction(personalA, { ...payload, contextType: 'personal', mutationId, idempotencyKey, payloadHash });

  const mutationId2 = crypto.randomUUID();
  const idempotencyKey2 = crypto.randomUUID();
  const payload2 = { transactionId: expense.transaction.id };
  const payloadHash2 = await hashIdempotencyRequestV2({
    operation: 'finance.transaction.restore',
    scopeType: 'personal',
    scopeId: personalA.personId,
    targetId: expense.transaction.id,
    payload: payload2,
    expectedVersion: null,
    mutationId: mutationId2,
  });

  await restoreFinanceTransaction(personalA, { ...payload2, contextType: 'personal', mutationId: mutationId2, idempotencyKey: idempotencyKey2, payloadHash: payloadHash2 });

  const res = await listFinanceMovements(personalA, { period: '2026-08' });
  assert(res.movements.some((m) => m.id === expense.transaction.id), 'RESTORED expense appears in movements');
}

async function testTransferDetailHappyPath(actors) {
  console.log('\nT17 - Transfer detail happy path');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const acc1 = await createAccount(personalA, { name: 'DetailSrc', currency: 'ARS' });
  const acc2 = await createAccount(personalA, { name: 'DetailDst', currency: 'ARS' });

  const transfer = await createTransferWithAccounts(personalA, {
    sourceAccount: acc1.id,
    destinationAccount: acc2.id,
    sourceAmount: '5000',
    destinationAmount: '5000',
    date: '2026-08-20',
    description: 'Detail test',
    notes: 'Notes here',
  });

  const detail = await getTransferDetail(personalA, transfer.transfer.id);

  assert(detail, 'Transfer detail returned');
  equal(detail.id, transfer.transfer.id, 'id matches');
  equal(detail.description, 'Detail test', 'description correct');
  equal(detail.notes, 'Notes here', 'notes correct');
  equal(detail.sourceAccount.id, acc1.id, 'source account id');
  equal(detail.sourceAccount.name, 'DetailSrc', 'source account name');
  equal(detail.destinationAccount.id, acc2.id, 'dest account id');
  equal(detail.destinationAccount.name, 'DetailDst', 'dest account name');
  equal(detail.sourceAmount, '5000.0000', 'sourceAmount correct');
  equal(detail.destinationAmount, '5000.0000', 'destinationAmount correct');
}

async function testTransferDetailAuthorization(actors) {
  console.log('\nT18 - Transfer detail authorization');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);

  const acc1 = await createAccount(personalA, { name: 'AuthSrc', currency: 'ARS' });
  const acc2 = await createAccount(personalA, { name: 'AuthDst', currency: 'ARS' });

  const transfer = await createTransferWithAccounts(personalA, {
    sourceAccount: acc1.id,
    destinationAccount: acc2.id,
    sourceAmount: '1000',
    destinationAmount: '1000',
    date: '2026-08-20',
  });

  await expectError(
    () => getTransferDetail(personalB, transfer.transfer.id),
    'finance_transfer_not_found',
    'Other person cannot read transfer detail'
  );
}

async function testTransferDetailNotFound(actors) {
  console.log('\nT19 - Transfer detail invalid UUID / not found');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  await expectError(
    () => getTransferDetail(personalA, 'not-a-uuid'),
    'validation_error',
    'Invalid UUID rejected'
  );

  await expectError(
    () => getTransferDetail(personalA, crypto.randomUUID()),
    'finance_transfer_not_found',
    'Non-existent transfer returns 404'
  );
}

async function testBackwardCompatibility(actors) {
  console.log('\nT20 - Existing /movements Expense/Income compatibility');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  await track(await createExpense(personalA, { amount: 1234, currency: 'ARS', date: '2026-08-01', description: 'compat' }));
  await track(await createIncome(personalA, { amount: 5678, currency: 'ARS', date: '2026-08-01', description: 'compat' }));

  const res = await listFinanceMovements(personalA, { period: '2026-08' });

  // Verify all existing FinanceMovementDto fields present
  for (const m of res.movements) {
    assert(m.id, 'id present');
    assert(m.rootTransactionId, 'rootTransactionId present');
    assert('transferId' in m, 'transferId present');
    assert(m.transactionType === 'expense' || m.transactionType === 'income' || m.transactionType === 'transfer', 'transactionType valid');
    assert(m.amount, 'amount present');
    assert(m.grossAmount, 'grossAmount present');
    assert(m.totalRefunded, 'totalRefunded present');
    assert(m.netAmount, 'netAmount present');
    assert(typeof m.refundCount === 'number', 'refundCount number');
    assert(Array.isArray(m.refundEvents), 'refundEvents array');
    assert(m.currency, 'currency present');
    assert(m.transactionDate, 'transactionDate present');
    assert('description' in m, 'description present');
    assert('categoryId' in m, 'categoryId present');
    assert('categoryLabelSnapshot' in m, 'categoryLabelSnapshot present');
    assert(m.createdAt, 'createdAt present');
    assert(m.updatedAt, 'updatedAt present');
    // New additive field
    assert(m.kind === 'expense' || m.kind === 'income' || m.kind === 'transfer', 'kind field present');
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
