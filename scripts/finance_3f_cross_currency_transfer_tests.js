#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 3F Cross-Currency Transfer tests.
 *
 * Local Supabase only. Applies accepted Finance migrations through 3F and
 * validates the same canonical Transfer authority with two native side amounts
 * and currencies. No FX, no rates, no commission, no frontend.
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
const { createExpense, createIncome } = require('../backend/src/services/finance.transaction.service');
const { summarizeFinance } = require('../backend/src/services/finance.read.service');
const { createTransfer } = require('../backend/src/services/finance.transfer.service');
const { hashIdempotencyRequestV2 } = require('../backend/src/lib/plannerIdempotencyAdapter');

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
  console.error('ENVIRONMENT_FAILURE: Finance 3F tests are local-only.');
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
  transferIds: [],
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
  await applyMigration('supabase/migrations/20260814050000_finance_canonical_transfer_v1_1.sql');
  await applyMigration('supabase/migrations/20260814060000_finance_cross_currency_transfer_v1_1.sql');
  await applyMigration('supabase/migrations/20260814070000_finance_transfer_commission_composition_v1_1.sql');
  await new Promise((resolve) => setTimeout(resolve, 300));
}

function randomCredential(label) {
  return `Fin3F_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin3f-${label}-${suffix}@example.test`;
  const password = randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 3F QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 3F ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `fin3f-${crypto.randomBytes(8).toString('hex')}`,
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
  if (error || !data.session) throw new Error(`sign in failed: ${error?.code || 'unknown'}: ${error?.message}`);
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
  const hhA = await createHousehold('Fin 3F A', personA.id, [{ personId: personA.id, role: 'adult' }]);
  const hhB = await createHousehold('Fin 3F B', personA.id, [
    { personId: personA.id, role: 'adult' },
    { personId: personB.id, role: 'coordinator' },
  ]);
  const hhC = await createHousehold('Fin 3F C', personC.id, [{ personId: personC.id, role: 'adult' }]);
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
  if (fixture.transferIds.length) {
    await admin.from('finance_account_effects').delete().in('transfer_id', fixture.transferIds);
    await admin.from('finance_transfers').delete().in('id', fixture.transferIds);
  }
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

function correlation(label) {
  return {
    requestId: `fin3f-req-${label}-${crypto.randomBytes(4).toString('hex')}`,
    mutationId: `fin3f-mut-${label}-${crypto.randomBytes(4).toString('hex')}`,
    idempotencyKey: `fin3f-key-${label}-${crypto.randomBytes(4).toString('hex')}`,
  };
}

async function transfer(ctx, body, label = 'transfer', reuseCorrelation = null) {
  const result = await createTransfer(ctx, body, reuseCorrelation ?? correlation(label));
  fixture.transferIds.push(result.transfer.id);
  return result.transfer;
}

async function refreshed(ctx, accountId) {
  return (await getFinanceAccount(ctx, accountId)).account;
}

async function transferRow(transferId) {
  const { rows } = await queryDb('select * from public.finance_transfers where id = $1', [transferId]);
  return rows[0];
}

async function effectsForTransfer(transferId) {
  const { rows } = await queryDb(`
    select account_id, effect_role, effect_amount::text as amount, currency, transaction_date::text as date, transfer_id, transaction_id
    from public.finance_account_effects
    where transfer_id = $1
    order by effect_role
  `, [transferId]);
  return rows;
}

async function countRows(table, whereSql = '', params = []) {
  const { rows } = await queryDb(`select count(*)::int as count from public.${table} ${whereSql}`, params);
  return rows[0].count;
}

function payloadHashFor(ctx, body, corr) {
  return hashIdempotencyRequestV2({
    operation: 'finance.transfer.create',
    scopeType: FINANCE_CONTEXT_TYPES.PERSONAL,
    scopeId: ctx.personId,
    targetId: null,
    payload: {
      sourceAccountId: body.sourceAccount,
      destinationAccountId: body.destinationAccount,
      sourceAmount: body.sourceAmount,
      destinationAmount: body.destinationAmount,
      date: body.date,
      description: body.description ?? null,
      notes: body.notes ?? null,
    },
    expectedVersion: null,
    mutationId: corr.mutationId,
  });
}

async function testSameCurrencyRegression(actors) {
  console.log('\nF01-F06 - same-currency regression');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const arsSource = await knownAccount(personalA, '1000', '2026-08-14');
  const arsDest = await knownAccount(personalA, '0', '2026-08-14');
  const ars = await transfer(personalA, { sourceAccount: arsSource.id, destinationAccount: arsDest.id, amount: '100', date: '2026-08-15' }, 'same-ars');
  const arsRow = await transferRow(ars.id);
  equal(ars.sourceAmount, '100', 'F01 ARS -> ARS canonical Transfer still PASS');
  equal(arsRow.source_amount, arsRow.destination_amount, 'F03 same-currency sourceAmount == destinationAmount');
  equal(arsRow.source_currency, 'ARS', 'F03 same-currency source currency snapshot');
  equal(arsRow.destination_currency, 'ARS', 'F03 same-currency destination currency snapshot');

  const usdSource = await knownAccount(personalA, '200', '2026-08-14', { currency: 'USD' });
  const usdDest = await knownAccount(personalA, '10', '2026-08-14', { currency: 'USD' });
  const usd = await transfer(personalA, {
    sourceAccount: usdSource.id,
    destinationAccount: usdDest.id,
    sourceAmount: '25',
    destinationAmount: '25',
    date: '2026-08-15',
  }, 'same-usd');
  equal(usd.destinationAmount, '25', 'F02 USD -> USD still PASS');
  await expectError(() => createTransfer(personalA, {
    sourceAccount: usdSource.id,
    destinationAccount: usdDest.id,
    sourceAmount: '100',
    destinationAmount: '90',
    date: '2026-08-16',
  }, correlation('same-mismatch')), 'finance_transfer_same_currency_amount_mismatch_3f', 'F04 same-currency differing amounts rejected');
  equal((await effectsForTransfer(usd.id)).length, 2, 'F05 all 3E paired-effect invariants remain');

  const retryCorrelation = correlation('same-retry');
  const retryBody = { sourceAccount: arsSource.id, destinationAccount: arsDest.id, amount: '7', date: '2026-08-17' };
  const first = await createTransfer(personalA, retryBody, retryCorrelation);
  fixture.transferIds.push(first.transfer.id);
  const second = await createTransfer(personalA, retryBody, retryCorrelation);
  equal(second.transfer.id, first.transfer.id, 'F06 same-currency retry remains idempotent');
  equal(second.outcome, 'replay', 'F06 same-currency retry outcome replay');
}

async function testCrossCurrencyBasicNoFxAndDecimal(actors) {
  console.log('\nF07-F27 - cross-currency native truth, no FX, decimal safety');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const source = await knownAccount(personalA, '200000', '2026-08-14', { currency: 'ARS' });
  const destination = await knownAccount(personalA, '10', '2026-08-14', { currency: 'USD' });
  const beforeTx = await countRows('finance_transactions');
  const moved = await transfer(personalA, {
    sourceAccount: source.id,
    destinationAccount: destination.id,
    sourceAmount: '150000',
    destinationAmount: '100',
    date: '2026-08-15',
  }, 'cross-basic');
  const row = await transferRow(moved.id);
  const effects = await effectsForTransfer(moved.id);
  const sourceEffect = effects.find((effect) => effect.effect_role === 'TRANSFER_SOURCE');
  const destinationEffect = effects.find((effect) => effect.effect_role === 'TRANSFER_DESTINATION');

  equal(moved.type, 'transfer', 'F07 ARS Account -> USD Account PASS');
  equal(row.source_amount, '150000.0000', 'F08 sourceAmount 150000 preserved exactly in DB');
  equal(moved.sourceAmount, '150000', 'F08 sourceAmount 150000 preserved exactly in API');
  equal(row.destination_amount, '100.0000', 'F09 destinationAmount 100 preserved exactly in DB');
  equal(moved.destinationAmount, '100', 'F09 destinationAmount 100 preserved exactly in API');
  equal(row.source_currency, 'ARS', 'F10 source Currency ARS');
  equal(row.destination_currency, 'USD', 'F11 destination Currency USD');
  equal(effects.length, 2, 'F12/F13 one Transfer identity and exactly two effects');
  equal(sourceEffect.amount, '-150000.0000', 'F14 Source effect = -150000 ARS');
  equal(sourceEffect.currency, 'ARS', 'F14 Source effect currency ARS');
  equal(destinationEffect.amount, '100.0000', 'F15 Destination effect = +100 USD');
  equal(destinationEffect.currency, 'USD', 'F15 Destination effect currency USD');
  equal(await countRows('finance_transactions'), beforeTx, 'F22 no conversion transaction or Income/Expense pair');
  equal((await refreshed(personalA, source.id)).currentBalance, '50000', 'F28 KNOWN Source decreases by sourceAmount');
  equal((await refreshed(personalA, destination.id)).currentBalance, '110', 'F29 KNOWN Destination increases by destinationAmount');

  await expectError(() => createTransfer(personalA, {
    sourceAccount: source.id,
    destinationAccount: destination.id,
    amount: '1',
    date: '2026-08-16',
  }, correlation('amount-only-cross')), 'invalid_finance_transfer_destination_amount', 'F19 no automatic destination amount for cross-currency');
  await expectError(() => createTransfer(personalA, {
    sourceAccount: source.id,
    destinationAccount: destination.id,
    sourceAmount: '1',
    date: '2026-08-16',
  }, correlation('source-only-cross')), 'invalid_finance_transfer_destination_amount', 'F20 no automatic source/destination completion');

  const arbitrarySource = await knownAccount(personalA, '2000', '2026-08-14', { currency: 'ARS' });
  const arbitraryDest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'USD' });
  const arbitrary = await transfer(personalA, {
    sourceAccount: arbitrarySource.id,
    destinationAccount: arbitraryDest.id,
    sourceAmount: '1000',
    destinationAmount: '7.25',
    date: '2026-08-17',
  }, 'arbitrary');
  equal(arbitrary.destinationAmount, '7.25', 'F23 arbitrary 1000 ARS -> 7.25 USD accepted without ratio validation');

  const largeSource = await knownAccount(personalA, '99999999999999.9999', '2026-08-14', { currency: 'ARS' });
  const largeDestination = await knownAccount(personalA, '0', '2026-08-14', { currency: 'USD' });
  const large = await transfer(personalA, {
    sourceAccount: largeSource.id,
    destinationAccount: largeDestination.id,
    sourceAmount: '99999999999999.9999',
    destinationAmount: '12345678901234.1234',
    date: '2026-08-18',
  }, 'large');
  const largeRow = await transferRow(large.id);
  const largeEffects = await effectsForTransfer(large.id);
  equal(largeRow.source_amount, '99999999999999.9999', 'F24 exact large source decimal preserved');
  equal(largeRow.destination_amount, '12345678901234.1234', 'F25 exact destination decimal preserved');
  equal(largeEffects.find((effect) => effect.effect_role === 'TRANSFER_SOURCE').amount, '-99999999999999.9999', 'F27 source Account effect exact');
  equal(largeEffects.find((effect) => effect.effect_role === 'TRANSFER_DESTINATION').amount, '12345678901234.1234', 'F27 destination Account effect exact');

  const serviceText = fs.readFileSync(path.join(root, 'backend/src/services/finance.transfer.service.js'), 'utf8');
  assert(!/Number\s*\(|parseFloat\s*\(|parseInt\s*\(/.test(serviceText), 'F26 no JS Number canonical path in Transfer service');

  const transferColumns = await queryDb("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'finance_transfers'");
  const forbiddenColumnNames = transferColumns.rows.map((row) => row.column_name).filter((name) => /exchange|fx|rate|gain|loss|base_currency|converted|conversion/i.test(name));
  equal(forbiddenColumnNames.length, 0, 'F16-F22 no exchange rate, FX service field, gain/loss or conversion column stored');
}

async function testBalancesContextsPrivacyAndReports(actors) {
  console.log('\nF30-F44/F65-F69 - balances, contexts, privacy, reporting');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const householdC = await resolvedContext(actors.c, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  const negativeSource = await knownAccount(personalA, '10', '2026-08-14', { currency: 'ARS' });
  const negativeDest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'USD' });
  await transfer(personalA, {
    sourceAccount: negativeSource.id,
    destinationAccount: negativeDest.id,
    sourceAmount: '50',
    destinationAmount: '1',
    date: '2026-08-15',
  }, 'negative');
  equal((await refreshed(personalA, negativeSource.id)).currentBalance, '-40', 'F30 Source may become negative');

  const unknownSource = await account(personalA, { currency: 'ARS' });
  const knownDest = await knownAccount(personalA, '2', '2026-08-14', { currency: 'USD' });
  await transfer(personalA, {
    sourceAccount: unknownSource.id,
    destinationAccount: knownDest.id,
    sourceAmount: '1000',
    destinationAmount: '3',
    date: '2026-08-15',
  }, 'unknown-source');
  equal((await refreshed(personalA, unknownSource.id)).balanceState, FINANCE_ACCOUNT_BALANCE_STATES.UNKNOWN, 'F31 UNKNOWN Source remains UNKNOWN');
  equal((await refreshed(personalA, knownDest.id)).currentBalance, '5', 'F33 mixed KNOWN/UNKNOWN works without inventing zero');

  const knownSource = await knownAccount(personalA, '1000', '2026-08-14', { currency: 'ARS' });
  const unknownDest = await account(personalA, { currency: 'USD' });
  await transfer(personalA, {
    sourceAccount: knownSource.id,
    destinationAccount: unknownDest.id,
    sourceAmount: '300',
    destinationAmount: '2',
    date: '2026-08-15',
  }, 'unknown-dest');
  equal((await refreshed(personalA, unknownDest.id)).balanceState, FINANCE_ACCOUNT_BALANCE_STATES.UNKNOWN, 'F32 UNKNOWN Destination remains UNKNOWN');

  const ppArs = await knownAccount(personalA, '500', '2026-08-14', { currency: 'ARS' });
  const ppUsd = await knownAccount(personalA, '0', '2026-08-14', { currency: 'USD' });
  await transfer(personalA, { sourceAccount: ppArs.id, destinationAccount: ppUsd.id, sourceAmount: '150', destinationAmount: '1', date: '2026-08-16' }, 'pp');
  assert(true, 'F34 own Personal ARS -> own Personal USD PASS');

  const hhArs = await knownAccount(householdA, '500', '2026-08-14', { currency: 'ARS' });
  const hhUsd = await knownAccount(householdA, '0', '2026-08-14', { currency: 'USD' });
  await transfer(householdA, { sourceAccount: hhArs.id, destinationAccount: hhUsd.id, sourceAmount: '150', destinationAmount: '1', date: '2026-08-16' }, 'hh');
  assert(true, 'F35 Household ARS -> Household USD PASS');

  await createIncome(householdA, { amount: '1000', currency: 'ARS', financialContext: FINANCE_CONTEXT_TYPES.HOUSEHOLD, date: '2026-09-01' }).then((r) => fixture.transactionIds.push(r.transaction.id));
  await createExpense(householdA, { amount: '100', currency: 'ARS', financialContext: FINANCE_CONTEXT_TYPES.HOUSEHOLD, date: '2026-09-02' }).then((r) => fixture.transactionIds.push(r.transaction.id));
  const beforeHouseholdSummary = await summarizeFinance(householdA, { month: '2026-09' });
  const beforePersonalSummary = await summarizeFinance(personalA, { month: '2026-09' });
  const personalUsd = await knownAccount(personalA, '20', '2026-08-14', { currency: 'USD', name: 'Private USD' });
  const householdArsReceive = await knownAccount(householdA, '100', '2026-08-14', { currency: 'ARS' });
  const contribution = await transfer(householdA, {
    sourceAccount: personalUsd.id,
    destinationAccount: householdArsReceive.id,
    sourceAmount: '5',
    destinationAmount: '7500',
    date: '2026-09-03',
  }, 'contribution');
  equal(JSON.stringify(await summarizeFinance(householdA, { month: '2026-09' })), JSON.stringify(beforeHouseholdSummary), 'F36/F37 Personal -> active Household remains Transfer / not Household Income');

  const householdArsPay = await knownAccount(householdA, '10000', '2026-08-14', { currency: 'ARS' });
  const personalUsdReceive = await knownAccount(personalA, '1', '2026-08-14', { currency: 'USD', name: 'Private USD Dest' });
  const reimbursement = await transfer(householdA, {
    sourceAccount: householdArsPay.id,
    destinationAccount: personalUsdReceive.id,
    sourceAmount: '1500',
    destinationAmount: '1',
    date: '2026-09-04',
  }, 'reimbursement');
  equal(JSON.stringify(await summarizeFinance(personalA, { month: '2026-09' })), JSON.stringify(beforePersonalSummary), 'F38/F39 Household -> own Personal remains Transfer / not Personal Income');

  const memberContributionRead = await actors.b.client.from('finance_transfers').select('*').eq('id', contribution.id);
  equal((memberContributionRead.data ?? []).length, 0, 'F42 cross-currency Personal->Household does not expose private Personal Transfer row');
  const memberPersonalAccountRead = await actors.b.client.from('finance_accounts').select('id,name,currency').eq('id', personalUsd.id);
  equal((memberPersonalAccountRead.data ?? []).length, 0, 'F42 private Personal Account id/name/currency hidden from Household member');
  const memberPersonalEffects = await actors.b.client.from('finance_account_effects').select('*').eq('account_id', personalUsd.id);
  equal((memberPersonalEffects.data ?? []).length, 0, 'F42 private Personal effects hidden from Household member');
  const memberReimbursementRead = await actors.b.client.from('finance_transfers').select('*').eq('id', reimbursement.id);
  equal((memberReimbursementRead.data ?? []).length, 0, 'F43 Household->Personal destination internals hidden from other members');

  const otherPersonSource = await knownAccount(personalB, '10', '2026-08-14', { currency: 'ARS' });
  await expectError(() => createTransfer(personalA, {
    sourceAccount: otherPersonSource.id,
    destinationAccount: ppUsd.id,
    sourceAmount: '1',
    destinationAmount: '1',
    date: '2026-08-17',
  }, correlation('other-person')), 'finance_transfer_source_not_found', 'F40 other Person Personal Account denied');

  await setActiveHousehold(actors.a.person.id, actors.households.a.id);
  const inactiveCtx = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  await expectError(() => createTransfer(inactiveCtx, {
    sourceAccount: hhArs.id,
    destinationAccount: hhUsd.id,
    sourceAmount: '1',
    destinationAmount: '1',
    date: '2026-08-17',
  }, correlation('inactive')), 'finance_transfer_source_not_found', 'F41 non-active Household Account denied');
  await setActiveHousehold(actors.a.person.id, actors.households.b.id);

  const otherHouseholdSource = await knownAccount(householdC, '10', '2026-08-14', { currency: 'ARS' });
  await expectError(() => createTransfer(householdA, {
    sourceAccount: otherHouseholdSource.id,
    destinationAccount: hhUsd.id,
    sourceAmount: '1',
    destinationAmount: '1',
    date: '2026-08-17',
  }, correlation('other-hh')), 'finance_transfer_source_not_found', 'F44 RLS remains Account-authority based');

  const reportBefore = await summarizeFinance(personalA, { month: '2026-10' });
  await transfer(personalA, { sourceAccount: ppArs.id, destinationAccount: ppUsd.id, sourceAmount: '1', destinationAmount: '0.01', date: '2026-10-01' }, 'report');
  const reportAfter = await summarizeFinance(personalA, { month: '2026-10' });
  equal(JSON.stringify(reportAfter), JSON.stringify(reportBefore), 'F65-F69 cross-currency Transfer does not alter Expense/Income/Net/Budget or invent aggregate');
}

async function testCreditCardArchiveHistoryAtomicityAndIdempotency(actors) {
  console.log('\nF45-F64/F70-F73 - card, archive, history, atomicity, idempotency');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const source = await knownAccount(personalA, '200000', '2026-08-14', { currency: 'ARS' });
  const card = await knownAccount(personalA, '-200', '2026-08-14', {
    currency: 'USD',
    accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
  });
  const beforeTx = await countRows('finance_transactions');
  const cardTransfer = await transfer(personalA, {
    sourceAccount: source.id,
    destinationAccount: card.id,
    sourceAmount: '150000',
    destinationAmount: '100',
    date: '2026-08-15',
  }, 'card-cross');
  const cardEffects = await effectsForTransfer(cardTransfer.id);
  equal((await refreshed(personalA, source.id)).currentBalance, '50000', 'F45/F46 ACCOUNT ARS -> CREDIT_CARD USD uses declared ARS sourceAmount');
  equal(cardEffects.find((effect) => effect.account_id === card.id).amount, '100.0000', 'F47 Card receives declared USD destinationAmount');
  equal((await refreshed(personalA, card.id)).currentBalance, '-100', 'F48 known negative Card debt changes by destinationAmount only');
  equal(await countRows('finance_transactions'), beforeTx, 'F49-F51 no Payment, Expense or Income');
  await expectError(() => createTransfer(personalA, {
    sourceAccount: card.id,
    destinationAccount: source.id,
    sourceAmount: '1',
    destinationAmount: '1500',
    date: '2026-08-15',
  }, correlation('card-source')), 'finance_transfer_credit_card_source_deferred', 'F52 CREDIT_CARD Source remains rejected');

  const archivedSource = await knownAccount(personalA, '10', '2026-08-14', { currency: 'ARS' });
  const archivedDest = await knownAccount(personalA, '1', '2026-08-14', { currency: 'USD' });
  await archiveFinanceAccount(personalA, archivedSource.id);
  await expectError(() => createTransfer(personalA, { sourceAccount: archivedSource.id, destinationAccount: archivedDest.id, sourceAmount: '1', destinationAmount: '1', date: '2026-08-16' }, correlation('arch-src')), 'finance_transfer_source_archived', 'F27 archived Source rejected');
  await unarchiveFinanceAccount(personalA, archivedSource.id);
  await archiveFinanceAccount(personalA, archivedDest.id);
  await expectError(() => createTransfer(personalA, { sourceAccount: archivedSource.id, destinationAccount: archivedDest.id, sourceAmount: '1', destinationAmount: '1', date: '2026-08-16' }, correlation('arch-dst')), 'finance_transfer_destination_archived', 'F27 archived Destination rejected');
  await unarchiveFinanceAccount(personalA, archivedDest.id);
  const historicalArchive = await transfer(personalA, { sourceAccount: archivedSource.id, destinationAccount: archivedDest.id, sourceAmount: '1', destinationAmount: '0.01', date: '2026-08-16' }, 'archived-preserve');
  await archiveFinanceAccount(personalA, archivedSource.id);
  equal(await countRows('finance_account_effects', 'where transfer_id = $1', [historicalArchive.id]), 2, 'F27 historical cross-currency Transfers remain preserved');
  await unarchiveFinanceAccount(personalA, archivedSource.id);

  const historicalSource = await knownAccount(personalA, '1000', '2026-08-20', { currency: 'ARS' });
  const historicalDest = await knownAccount(personalA, '10', '2026-08-20', { currency: 'USD' });
  const preAnchor = await transfer(personalA, { sourceAccount: historicalSource.id, destinationAccount: historicalDest.id, sourceAmount: '100', destinationAmount: '1', date: '2026-08-10' }, 'pre-anchor');
  equal((await refreshed(personalA, historicalSource.id)).currentBalance, '1000', 'F70 pre-Anchor cross-currency effect does not double-apply');
  await transfer(personalA, { sourceAccount: historicalSource.id, destinationAccount: historicalDest.id, sourceAmount: '100', destinationAmount: '1', date: '2026-08-21' }, 'post-anchor');
  equal((await refreshed(personalA, historicalSource.id)).currentBalance, '900', 'F71 post-Anchor source native effect applies');
  equal((await refreshed(personalA, historicalDest.id)).currentBalance, '11', 'F71 post-Anchor destination native effect applies');
  await correctAccountBalance(personalA, historicalSource.id, { correctedBalance: '800', effectiveDate: '2026-08-22' });
  await transfer(personalA, { sourceAccount: historicalSource.id, destinationAccount: historicalDest.id, sourceAmount: '50', destinationAmount: '0.5', date: '2026-08-23' }, 'post-correction');
  equal((await refreshed(personalA, historicalSource.id)).currentBalance, '750', 'F72 post-Correction effects apply');
  const preAnchorRow = await transferRow(preAnchor.id);
  equal(`${preAnchorRow.source_currency}->${preAnchorRow.destination_currency}`, 'ARS->USD', 'F73 history preserves both native sides');

  const atomicSource = await knownAccount(personalA, '1000', '2026-08-14', { currency: 'ARS' });
  const atomicDest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'USD' });
  const ok = await transfer(personalA, { sourceAccount: atomicSource.id, destinationAccount: atomicDest.id, sourceAmount: '100', destinationAmount: '1', date: '2026-08-24' }, 'atomic-ok');
  equal(await countRows('finance_transfers', 'where id = $1', [ok.id]), 1, 'F61 operation + both native effects commit atomically');
  equal(await countRows('finance_account_effects', 'where transfer_id = $1', [ok.id]), 2, 'F61 exactly two native effects committed');

  const failureBody = { sourceAccount: atomicSource.id, destinationAccount: atomicDest.id, sourceAmount: '111', destinationAmount: '1.11', date: '2026-08-25' };
  for (const point of ['after_transfer', 'after_source_effect', 'after_destination_effect']) {
    const corr = correlation(`fail-${point}`);
    const { error } = await personalA.client.rpc('finance_create_transfer_v1', {
      p_actor_account_id: personalA.accountId,
      p_actor_person_id: personalA.personId,
      p_source_account_id: failureBody.sourceAccount,
      p_destination_account_id: failureBody.destinationAccount,
      p_source_amount: failureBody.sourceAmount,
      p_destination_amount: failureBody.destinationAmount,
      p_transfer_date: failureBody.date,
      p_description: null,
      p_notes: null,
      p_request_id: corr.requestId,
      p_mutation_id: corr.mutationId,
      p_idempotency_key: corr.idempotencyKey,
      p_payload_hash: payloadHashFor(personalA, failureBody, corr),
      p_test_failure_point: point,
    });
    assert(error, `F62-F64 forced ${point} rejects`);
    equal(await countRows('finance_transfers', 'where mutation_id = $1', [corr.mutationId]), 0, `F62-F64 ${point} leaves zero Transfer truth`);
    equal(await countRows('finance_account_effects', 'where created_by_person_id = $1 and transaction_date = $2 and effect_type = $3', [personalA.personId, failureBody.date, 'transfer']), 0, `F62-F64 ${point} leaves no half-transfer`);
  }

  const retrySource = await knownAccount(personalA, '1000', '2026-08-14', { currency: 'ARS' });
  const retryDest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'USD' });
  const retryCorrelation = correlation('cross-retry');
  const retryBody = { sourceAccount: retrySource.id, destinationAccount: retryDest.id, sourceAmount: '1500', destinationAmount: '1', date: '2026-08-26' };
  const first = await createTransfer(personalA, retryBody, retryCorrelation);
  fixture.transferIds.push(first.transfer.id);
  const second = await createTransfer(personalA, retryBody, retryCorrelation);
  equal(second.transfer.id, first.transfer.id, 'F53 same mutation identity + same two amounts -> one Transfer');
  equal(await countRows('finance_account_effects', 'where transfer_id = $1 and effect_role = $2', [first.transfer.id, 'TRANSFER_SOURCE']), 1, 'F54 one Source effect on retry');
  equal(await countRows('finance_account_effects', 'where transfer_id = $1 and effect_role = $2', [first.transfer.id, 'TRANSFER_DESTINATION']), 1, 'F55 one Destination effect on retry');
  await expectError(() => createTransfer(personalA, { ...retryBody, sourceAmount: '1600' }, retryCorrelation), 'idempotency_conflict', 'F56 same identity but changed sourceAmount conflicts');
  await expectError(() => createTransfer(personalA, { ...retryBody, destinationAmount: '2' }, retryCorrelation), 'idempotency_conflict', 'F57 same identity but changed destinationAmount conflicts');
  const otherDest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'USD' });
  await expectError(() => createTransfer(personalA, { ...retryBody, destinationAccount: otherDest.id }, retryCorrelation), 'idempotency_conflict', 'F58 same identity but changed destination Account conflicts');
}

async function testStaticContracts() {
  console.log('\nF59-F84 - static negative scope and registration');
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
    'F50 exact Finance migration allow-list includes 3G migration',
  );
  const runJs = fs.readFileSync(path.join(root, 'tests/run.js'), 'utf8');
  assert(runJs.includes('finance-3f-cross-currency-transfer') && runJs.includes("'finance-3f'"), 'F52 node tests/run.js finance-3f registered');
  assert(runJs.includes('finance-3f-cross-currency-transfer') && /finance:\s*\[[\s\S]*finance-3f-cross-currency-transfer/.test(runJs), 'F52 aggregate Finance suite includes 3F');

  const tableNames = (await queryDb("select table_name from information_schema.tables where table_schema = 'public'")).rows.map((row) => row.table_name);
  assert(!tableNames.some((name) => /cross_currency_transfers|transfer_fx|converted_transfer|exchange_operation|finance_.*rate|gain|loss/i.test(name)), 'F76-F80 no FX/rate/gain/loss/second Transfer authority table');
  assert(tableNames.includes('finance_transfers'), 'F59 shared 3E Transfer table authority reused');
  assert(!tableNames.some((name) => /finance_.*(budget|payment|commission|fee|statement|installment)/i.test(name)), 'F74/F83 no Commission, Budget, Payment or Stage 4 lifecycle table');
  const transferColumns = (await queryDb("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'finance_transfers'")).rows.map((row) => row.column_name);
  assert(!transferColumns.some((name) => /commission|fee/i.test(name)), 'F74/F75 no Commission or TransferWithFee persisted on Transfer');

  const repoText = [
    'backend/src/services/finance.transfer.service.js',
    'backend/src/routes/finance.js',
    'supabase/migrations/20260814060000_finance_cross_currency_transfer_v1_1.sql',
  ].map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
  assert(!/CrossCurrencyTransferService|finance_cross_currency_transfers|transfer_fx_operations|converted_transfer|exchange_operation/i.test(repoText), 'F80 no second Transfer authority in code');
  assert(!/fetch\s*\(|axios|currencyService|fxService|market-rate|marketRateProvider/i.test(repoText), 'F76-F79 no FX service/rate provider or automatic conversion path');
  assert(!/FinanceIdempotency|finance_mutation_registry|CrossCurrencyRetry|TransferRetryManager/i.test(repoText), 'F59/F60 shared 3E idempotency authority reused without retry subsystem');
  assert(!/\/cross-currency-transfer|crossCurrencyTransfer/i.test(repoText), 'F80 same canonical Transfer endpoint reused');
  assert(!/income.*conversion|expense.*conversion|conversion.*income|conversion.*expense/i.test(repoText), 'F81 no Income/Expense conversion pair');
  const frontendText = fs.existsSync(path.join(root, 'front/mi-front-limpio/screens/finance'))
    ? fs.readdirSync(path.join(root, 'front/mi-front-limpio/screens/finance')).join('\n')
    : '';
  assert(!/TransferForm|Mover dinero|AccountPicker/i.test(frontendText), 'F82 no frontend');
}

async function assertFixtureCleanup() {
  const people = await queryDb("select count(*)::int as count from public.people where display_name like 'Fin 3F %'");
  equal(people.rows[0].count, 0, 'fixture cleanup leaves no 3F people');
  const households = await queryDb("select count(*)::int as count from public.households where name like 'Fin 3F %'");
  equal(households.rows[0].count, 0, 'fixture cleanup leaves no 3F households');
  const transfers = await queryDb("select count(*)::int as count from public.finance_transfers where mutation_id like 'fin3f-%'");
  equal(transfers.rows[0].count, 0, 'fixture cleanup leaves no 3F transfers');
}

async function main() {
  console.log('FINANCE_3F_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigrations();
  const actors = await setupActors();

  try {
    await testSameCurrencyRegression(actors);
    await testCrossCurrencyBasicNoFxAndDecimal(actors);
    await testBalancesContextsPrivacyAndReports(actors);
    await testCreditCardArchiveHistoryAtomicityAndIdempotency(actors);
    await testStaticContracts();
  } finally {
    await cleanup();
  }

  await assertFixtureCleanup();

  console.log(`\nFINANCE_3F_CROSS_CURRENCY_TRANSFER_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_3F_CROSS_CURRENCY_TRANSFER_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_3F_CROSS_CURRENCY_TRANSFER_TESTS=PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_3F_CROSS_CURRENCY_TRANSFER_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
