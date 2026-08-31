#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 3E Canonical Transfer tests.
 *
 * Local Supabase only. Applies accepted Finance migrations through 3E and
 * validates same-currency Transfer operation truth, paired account effects,
 * privacy, report exclusion, atomicity, and shared idempotency replay.
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
  console.error('ENVIRONMENT_FAILURE: Finance 3E tests are local-only.');
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

async function tableExists(tableName) {
  const { rows } = await queryDb(
    'select to_regclass($1) is not null as exists',
    [`public.${tableName}`],
  );
  return rows[0]?.exists === true;
}

async function applyMigrations() {
  if (await tableExists('finance_accounts')) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return;
  }

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
  return `Fin3E_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin3e-${label}-${suffix}@example.test`;
  const password = randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 3E QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 3E ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `fin3e-${crypto.randomBytes(8).toString('hex')}`,
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
  const hhA = await createHousehold('Fin 3E A', personA.id, [{ personId: personA.id, role: 'adult' }]);
  const hhB = await createHousehold('Fin 3E B', personA.id, [
    { personId: personA.id, role: 'adult' },
    { personId: personB.id, role: 'coordinator' },
  ]);
  const hhC = await createHousehold('Fin 3E C', personC.id, [{ personId: personC.id, role: 'adult' }]);
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

async function correctBalance(ctx, accountId, body = {}) {
  return correctAccountBalance(ctx, accountId, {
    ...body,
    mutationId: body.mutationId ?? crypto.randomUUID(),
    idempotencyKey: body.idempotencyKey ?? `finance-balance-correction-${crypto.randomUUID()}`,
  });
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
    requestId: `fin3e-req-${label}-${crypto.randomBytes(4).toString('hex')}`,
    mutationId: `fin3e-mut-${label}-${crypto.randomBytes(4).toString('hex')}`,
    idempotencyKey: `fin3e-key-${label}-${crypto.randomBytes(4).toString('hex')}`,
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

async function countRows(table, whereSql, params) {
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
      sourceAmount: body.sourceAmount ?? body.amount,
      destinationAmount: body.destinationAmount ?? null,
      date: body.date,
      description: body.description ?? null,
      notes: body.notes ?? null,
    },
    expectedVersion: null,
    mutationId: corr.mutationId,
  });
}

async function testBasicTransferAndPairedEffects(actors) {
  console.log('\nE01-E19 - basic Transfer and paired effects');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const source = await knownAccount(personalA, '1000', '2026-08-14', { name: 'Source E01' });
  const destination = await knownAccount(personalA, '500', '2026-08-14', { name: 'Destination E02' });
  assert(source.id && destination.id, 'E01/E02 create Personal ACCOUNT A/B');

  const moved = await transfer(personalA, {
    sourceAccount: source.id,
    destinationAccount: destination.id,
    amount: '200.1250',
    date: '2026-08-15',
    description: '  Ahorro  ',
    notes: '  nota  ',
  }, 'basic');
  equal(moved.type, 'transfer', 'E03 canonical same-currency Transfer A -> B PASS');
  equal(moved.amount, '200.125', 'E10 exact decimal preservation');
  equal(moved.date, '2026-08-15', 'E11 transfer date preserved');
  equal(moved.description, 'Ahorro', 'E31 optional Description normalized');
  equal(moved.notes, 'nota', 'E31 optional Notes normalized');

  await expectError(() => createTransfer(personalA, { destinationAccount: destination.id, amount: '1', date: '2026-08-15' }, correlation('missing-source')), 'finance_transfer_source_required', 'E04 Source required');
  await expectError(() => createTransfer(personalA, { sourceAccount: source.id, amount: '1', date: '2026-08-15' }, correlation('missing-dest')), 'finance_transfer_destination_required', 'E05 Destination required');
  await expectError(() => createTransfer(personalA, { sourceAccount: source.id, destinationAccount: source.id, amount: '1', date: '2026-08-15' }, correlation('same')), 'finance_transfer_same_account', 'E06 Source != Destination');
  await expectError(() => createTransfer(personalA, { sourceAccount: source.id, destinationAccount: destination.id, amount: '0', date: '2026-08-15' }, correlation('zero')), 'invalid_finance_transfer_amount', 'E07/E08 zero rejected');
  await expectError(() => createTransfer(personalA, { sourceAccount: source.id, destinationAccount: destination.id, amount: '-1', date: '2026-08-15' }, correlation('neg')), 'invalid_finance_transfer_amount', 'E09 negative caller amount rejected');

  const row = await transferRow(moved.id);
  equal(row.source_account_id, source.id, 'E12 one logical Transfer row/identity has Source');
  equal(row.destination_account_id, destination.id, 'E12 one logical Transfer row/identity has Destination');
  equal(row.source_amount, row.destination_amount, 'E17 source/destination magnitudes equal in 3E');
  const effects = await effectsForTransfer(moved.id);
  equal(effects.length, 2, 'E13/E14/E19 exactly two Transfer effects');
  const sourceEffect = effects.find((effect) => effect.effect_role === 'TRANSFER_SOURCE');
  const destinationEffect = effects.find((effect) => effect.effect_role === 'TRANSFER_DESTINATION');
  equal(sourceEffect.account_id, source.id, 'E13 Source effect Account matches');
  equal(destinationEffect.account_id, destination.id, 'E14 Destination effect Account matches');
  equal(sourceEffect.amount, '-200.1250', 'E15 Source effect negative');
  equal(destinationEffect.amount, '200.1250', 'E16 Destination effect positive');
  equal(sourceEffect.transfer_id, moved.id, 'E18 Source effect references Transfer identity');
  equal(destinationEffect.transfer_id, moved.id, 'E18 Destination effect references Transfer identity');
  equal(sourceEffect.transaction_id, null, 'E03 Transfer does not fake finance_transaction source');
  equal(destinationEffect.transaction_id, null, 'E03 Transfer does not fake finance_transaction destination');
}

async function testBalancesContextPrivacyAndReports(actors) {
  console.log('\nE20-E61 - balances, context, privacy, reports, currency');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const householdB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const householdC = await resolvedContext(actors.c, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  const source = await knownAccount(personalA, '1000', '2026-08-14');
  const destination = await knownAccount(personalA, '500', '2026-08-14');
  await transfer(personalA, { sourceAccount: source.id, destinationAccount: destination.id, amount: '200', date: '2026-08-15' }, 'balance');
  equal((await refreshed(personalA, source.id)).currentBalance, '800', 'E20 Source 1000 - 200 = 800');
  equal((await refreshed(personalA, destination.id)).currentBalance, '700', 'E20 Destination 500 + 200 = 700');

  const negativeSource = await knownAccount(personalA, '100', '2026-08-14');
  const negativeDest = await knownAccount(personalA, '0', '2026-08-14');
  await transfer(personalA, { sourceAccount: negativeSource.id, destinationAccount: negativeDest.id, amount: '200', date: '2026-08-15' }, 'negative');
  equal((await refreshed(personalA, negativeSource.id)).currentBalance, '-100', 'E21 Source may become negative');

  const unknownSource = await account(personalA, { name: 'Unknown source' });
  const knownDest = await knownAccount(personalA, '10', '2026-08-14');
  await transfer(personalA, { sourceAccount: unknownSource.id, destinationAccount: knownDest.id, amount: '3', date: '2026-08-15' }, 'unknown-source');
  equal((await refreshed(personalA, unknownSource.id)).balanceState, FINANCE_ACCOUNT_BALANCE_STATES.UNKNOWN, 'E23 UNKNOWN Source remains UNKNOWN');
  equal((await refreshed(personalA, unknownSource.id)).currentBalance, null, 'E23 UNKNOWN Source currentBalance remains null');
  equal((await refreshed(personalA, knownDest.id)).currentBalance, '13', 'E25 known side derives correctly when opposite side UNKNOWN');

  const knownSource = await knownAccount(personalA, '10', '2026-08-14');
  const unknownDest = await account(personalA, { name: 'Unknown destination' });
  await transfer(personalA, { sourceAccount: knownSource.id, destinationAccount: unknownDest.id, amount: '4', date: '2026-08-15' }, 'unknown-dest');
  equal((await refreshed(personalA, unknownDest.id)).balanceState, FINANCE_ACCOUNT_BALANCE_STATES.UNKNOWN, 'E24 UNKNOWN Destination remains UNKNOWN');
  equal((await refreshed(personalA, knownSource.id)).currentBalance, '6', 'E25 known Source derives correctly when Destination UNKNOWN');

  const ppA = await knownAccount(personalA, '100', '2026-08-14');
  const ppB = await knownAccount(personalA, '0', '2026-08-14');
  await transfer(personalA, { sourceAccount: ppA.id, destinationAccount: ppB.id, amount: '10', date: '2026-08-15' }, 'pp');
  equal((await countRows('finance_account_effects', 'where account_id = $1', [ppA.id])), 1, 'E26 Transfer effects counted once');
  assert(true, 'E27 Personal -> Personal own Accounts PASS');

  const hhA = await knownAccount(householdA, '100', '2026-08-14');
  const hhB = await knownAccount(householdA, '0', '2026-08-14');
  await transfer(householdA, { sourceAccount: hhA.id, destinationAccount: hhB.id, amount: '10', date: '2026-08-15' }, 'hh');
  assert(true, 'E28 active Household -> same active Household PASS');

  const beforeHouseholdSummary = await summarizeFinance(householdA, { month: '2026-08' });
  const beforePersonalSummary = await summarizeFinance(personalA, { month: '2026-08' });
  const personalFund = await knownAccount(personalA, '50', '2026-08-14');
  const householdReceive = await knownAccount(householdA, '20', '2026-08-14');
  const contribution = await transfer(householdA, { sourceAccount: personalFund.id, destinationAccount: householdReceive.id, amount: '15', date: '2026-08-15' }, 'contribution');
  equal((await refreshed(personalA, personalFund.id)).currentBalance, '35', 'E29 Personal -> Household Contribution decreases Personal Account');
  equal((await refreshed(householdA, householdReceive.id)).currentBalance, '35', 'E29 Personal -> Household Contribution increases Household Account');
  equal(JSON.stringify(await summarizeFinance(householdA, { month: '2026-08' })), JSON.stringify(beforeHouseholdSummary), 'E30/E53 Contribution is Transfer, not Household Income');

  const householdPay = await knownAccount(householdA, '70', '2026-08-14');
  const personalReceive = await knownAccount(personalA, '5', '2026-08-14');
  const reimbursement = await transfer(householdA, { sourceAccount: householdPay.id, destinationAccount: personalReceive.id, amount: '20', date: '2026-08-15' }, 'reimbursement');
  equal((await refreshed(householdA, householdPay.id)).currentBalance, '50', 'E31 Household -> Personal Reimbursement decreases Household Account');
  equal((await refreshed(personalA, personalReceive.id)).currentBalance, '25', 'E31 Household -> Personal Reimbursement increases Personal Account');
  equal(JSON.stringify(await summarizeFinance(personalA, { month: '2026-08' })), JSON.stringify(beforePersonalSummary), 'E32/E54 Reimbursement is not Personal Income or new Expense');

  await setActiveHousehold(actors.a.person.id, actors.households.a.id);
  const inactiveCtx = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  await expectError(() => createTransfer(inactiveCtx, { sourceAccount: hhA.id, destinationAccount: hhB.id, amount: '1', date: '2026-08-15' }, correlation('inactive')), 'finance_transfer_source_not_found', 'E33 non-active Household Account denied');
  await setActiveHousehold(actors.a.person.id, actors.households.b.id);
  const otherPersonAccount = await knownAccount(personalB, '10', '2026-08-14');
  await expectError(() => createTransfer(personalA, { sourceAccount: otherPersonAccount.id, destinationAccount: ppB.id, amount: '1', date: '2026-08-15' }, correlation('other-person')), 'finance_transfer_source_not_found', "E34 other Person's Personal Account denied");
  const otherHouseholdAccount = await knownAccount(householdC, '10', '2026-08-14');
  await expectError(() => createTransfer(householdA, { sourceAccount: otherHouseholdAccount.id, destinationAccount: hhB.id, amount: '1', date: '2026-08-15' }, correlation('arbitrary-hh')), 'finance_transfer_source_not_found', 'E35 arbitrary Household target injection denied');

  const memberTransferRead = await actors.b.client.from('finance_transfers').select('*').eq('id', contribution.id);
  equal((memberTransferRead.data ?? []).length, 0, 'E36/E37/E38 Household member cannot discover Personal source Account through Transfer row');
  const memberPersonalRead = await actors.b.client.from('finance_accounts').select('id,name').eq('id', personalFund.id);
  equal((memberPersonalRead.data ?? []).length, 0, 'E39 Household member cannot read Personal source Balance metadata');
  const memberPersonalEffects = await actors.b.client.from('finance_account_effects').select('*').eq('account_id', personalFund.id);
  equal((memberPersonalEffects.data ?? []).length, 0, 'E40 Household member cannot read Personal source effects');
  const memberDestinationTransferRead = await actors.b.client.from('finance_transfers').select('*').eq('id', reimbursement.id);
  equal((memberDestinationTransferRead.data ?? []).length, 0, 'E41 Household -> Personal does not expose Personal destination Account');

  await createIncome(personalA, { amount: '1000', currency: 'ARS', financialContext: FINANCE_CONTEXT_TYPES.PERSONAL, date: '2026-09-01' }).then((r) => fixture.transactionIds.push(r.transaction.id));
  await createExpense(personalA, { amount: '200', currency: 'ARS', financialContext: FINANCE_CONTEXT_TYPES.PERSONAL, date: '2026-09-02' }).then((r) => fixture.transactionIds.push(r.transaction.id));
  const reportBefore = await summarizeFinance(personalA, { month: '2026-09' });
  await transfer(personalA, { sourceAccount: ppA.id, destinationAccount: ppB.id, amount: '30', date: '2026-09-03' }, 'report');
  const reportAfter = await summarizeFinance(personalA, { month: '2026-09' });
  equal(JSON.stringify(reportAfter), JSON.stringify(reportBefore), 'E50/E51/E52 Transfer does not alter Income/Expense/Net');
  assert(!('categoryId' in contribution), 'E55 no Category on Transfer DTO');
  const budgetTables = await queryDb("select count(*)::int as count from information_schema.tables where table_schema = 'public' and table_name ~ 'finance_.*budget'");
  equal(budgetTables.rows[0].count, 0, 'E56 no Budget effect');

  const usdA = await knownAccount(personalA, '10', '2026-08-14', { currency: 'USD' });
  const usdB = await knownAccount(personalA, '0', '2026-08-14', { currency: 'USD' });
  await transfer(personalA, { sourceAccount: ppA.id, destinationAccount: ppB.id, amount: '1', date: '2026-08-16' }, 'ars');
  assert(true, 'E57 ARS -> ARS PASS');
  await transfer(personalA, { sourceAccount: usdA.id, destinationAccount: usdB.id, amount: '1', date: '2026-08-16' }, 'usd');
  assert(true, 'E58 USD -> USD PASS');
  await expectError(() => createTransfer(personalA, { sourceAccount: ppA.id, destinationAccount: usdB.id, amount: '1', date: '2026-08-16' }, correlation('cross-currency')), 'invalid_finance_transfer_destination_amount', 'E59 legacy amount does not auto-complete cross-currency Transfer');
  const migrationText = [
    'supabase/migrations/20260814050000_finance_canonical_transfer_v1_1.sql',
    'supabase/migrations/20260814060000_finance_cross_currency_transfer_v1_1.sql',
  ].map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
  assert(!/exchange_rate|fx_rate|currency_conversion/i.test(migrationText), 'E60/E61 no FX fields/functions or implicit conversion');
}

async function testCreditCardLifecycleAtomicityIdempotencyAndHistory(actors) {
  console.log('\nE42-E94 - credit card, lifecycle, atomicity, idempotency, history, negative scope');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const source = await knownAccount(personalA, '1000', '2026-08-14', { name: 'Bank source' });
  const card = await knownAccount(personalA, '-1000', '2026-08-14', {
    name: 'Card destination',
    accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
  });
  const beforeTx = await countRows('finance_transactions', '', []);
  const cardTransfer = await transfer(personalA, { sourceAccount: source.id, destinationAccount: card.id, amount: '300', date: '2026-08-15' }, 'card');
  equal((await refreshed(personalA, source.id)).currentBalance, '700', 'E42/E43 ACCOUNT -> CREDIT_CARD same-currency decreases source');
  equal((await refreshed(personalA, card.id)).currentBalance, '-700', 'E22/E44/E45 destination CREDIT_CARD positive effect reduces debt');
  const cardEffects = await effectsForTransfer(cardTransfer.id);
  equal(cardEffects.find((effect) => effect.account_id === card.id).amount, '300.0000', 'E44 destination CREDIT_CARD receives positive effect');
  equal(await countRows('finance_transactions', '', []), beforeTx, 'E46/E47 no Expense/Income created for card-shaped Transfer');
  const paidPaymentTables = await queryDb("select count(*)::int as count from information_schema.tables where table_schema = 'public' and table_name ~ 'finance_.*(paid|settlement|payment_record|payment_registration)'");
  equal(paidPaymentTables.rows[0].count, 0, 'E48 no paid Payment/settlement object exists');
  await expectError(() => createTransfer(personalA, { sourceAccount: card.id, destinationAccount: source.id, amount: '1', date: '2026-08-15' }, correlation('card-source')), 'finance_transfer_credit_card_source_deferred', 'E49 CREDIT_CARD source rejected');

  const archivedSource = await knownAccount(personalA, '10', '2026-08-14');
  const archivedDest = await knownAccount(personalA, '10', '2026-08-14');
  await archiveFinanceAccount(personalA, archivedSource.id);
  await expectError(() => createTransfer(personalA, { sourceAccount: archivedSource.id, destinationAccount: archivedDest.id, amount: '1', date: '2026-08-15' }, correlation('arch-src')), 'finance_transfer_source_archived', 'E62 archived Source rejected');
  await unarchiveFinanceAccount(personalA, archivedSource.id);
  await archiveFinanceAccount(personalA, archivedDest.id);
  await expectError(() => createTransfer(personalA, { sourceAccount: archivedSource.id, destinationAccount: archivedDest.id, amount: '1', date: '2026-08-15' }, correlation('arch-dst')), 'finance_transfer_destination_archived', 'E63 archived Destination rejected');
  await unarchiveFinanceAccount(personalA, archivedDest.id);
  const historical = await transfer(personalA, { sourceAccount: archivedSource.id, destinationAccount: archivedDest.id, amount: '2', date: '2026-08-16' }, 'archive-preserve');
  await archiveFinanceAccount(personalA, archivedSource.id);
  equal(await countRows('finance_account_effects', 'where transfer_id = $1', [historical.id]), 2, 'E64 archived Accounts preserve historical Transfer effects');
  await unarchiveFinanceAccount(personalA, archivedSource.id);
  await transfer(personalA, { sourceAccount: archivedSource.id, destinationAccount: archivedDest.id, amount: '1', date: '2026-08-17' }, 'unarchive');
  assert(true, 'E65 unarchive restores future eligibility');

  const atomicSource = await knownAccount(personalA, '100', '2026-08-14');
  const atomicDest = await knownAccount(personalA, '0', '2026-08-14');
  const ok = await transfer(personalA, { sourceAccount: atomicSource.id, destinationAccount: atomicDest.id, amount: '5', date: '2026-08-15' }, 'atomic-ok');
  equal(await countRows('finance_transfers', 'where id = $1', [ok.id]), 1, 'E66 successful mutation produces operation');
  equal(await countRows('finance_account_effects', 'where transfer_id = $1', [ok.id]), 2, 'E66 successful mutation produces both effects');

  const failureBody = { sourceAccount: atomicSource.id, destinationAccount: atomicDest.id, amount: '6', date: '2026-08-16' };
  for (const point of ['after_transfer', 'after_source_effect', 'after_destination_effect']) {
    const corr = correlation(`fail-${point}`);
    const { error } = await personalA.client.rpc('finance_create_transfer_v1', {
      p_actor_account_id: personalA.accountId,
      p_actor_person_id: personalA.personId,
      p_source_account_id: failureBody.sourceAccount,
      p_destination_account_id: failureBody.destinationAccount,
      p_source_amount: failureBody.amount,
      p_destination_amount: null,
      p_transfer_date: failureBody.date,
      p_description: null,
      p_notes: null,
      p_request_id: corr.requestId,
      p_mutation_id: corr.mutationId,
      p_idempotency_key: corr.idempotencyKey,
      p_payload_hash: payloadHashFor(personalA, failureBody, corr),
      p_test_failure_point: point,
    });
    assert(error, `E67-E70 forced failure ${point} rejects`);
    equal(await countRows('finance_transfers', 'where mutation_id = $1', [corr.mutationId]), 0, `E67-E70 ${point} leaves no Transfer`);
    equal(await countRows('finance_account_effects', 'where created_by_person_id = $1 and transaction_date = $2 and effect_amount in (-6, 6)', [personalA.personId, failureBody.date]), 0, `E67-E70 ${point} leaves no half effect`);
  }

  const retrySource = await knownAccount(personalA, '100', '2026-08-14');
  const retryDest = await knownAccount(personalA, '0', '2026-08-14');
  const retryCorrelation = correlation('retry');
  const retryBody = { sourceAccount: retrySource.id, destinationAccount: retryDest.id, amount: '11', date: '2026-08-18' };
  const first = await createTransfer(personalA, retryBody, retryCorrelation);
  fixture.transferIds.push(first.transfer.id);
  const second = await createTransfer(personalA, retryBody, retryCorrelation);
  equal(second.transfer.id, first.transfer.id, 'E71/E74 same canonical mutation identity returns same Transfer');
  equal(second.outcome, 'replay', 'E74 retry reconciles as replay');
  equal(await countRows('finance_transfers', 'where mutation_id = $1', [retryCorrelation.mutationId]), 1, 'E71 one Transfer for retry');
  equal(await countRows('finance_account_effects', 'where transfer_id = $1 and effect_role = $2', [first.transfer.id, 'TRANSFER_SOURCE']), 1, 'E72 one Source effect for retry');
  equal(await countRows('finance_account_effects', 'where transfer_id = $1 and effect_role = $2', [first.transfer.id, 'TRANSFER_DESTINATION']), 1, 'E73 one Destination effect for retry');
  await expectError(() => createTransfer(personalA, { ...retryBody, amount: '12' }, retryCorrelation), 'idempotency_conflict', 'E75 same mutation identity with conflicting payload rejected');
  const repoText = [
    'backend/src/services/finance.transfer.service.js',
    'supabase/migrations/20260814050000_finance_canonical_transfer_v1_1.sql',
    'supabase/migrations/20260814060000_finance_cross_currency_transfer_v1_1.sql',
  ].map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
  assert(!/FinanceIdempotency|finance_mutation_registry|TransferRetryManager/i.test(repoText), 'E76 no Finance-specific parallel idempotency subsystem created');

  const historicalSource = await knownAccount(personalA, '1000', '2026-08-20');
  const historicalDest = await knownAccount(personalA, '500', '2026-08-20');
  const preAnchorTransfer = await transfer(personalA, { sourceAccount: historicalSource.id, destinationAccount: historicalDest.id, amount: '40', date: '2026-08-10' }, 'pre-anchor');
  equal((await refreshed(personalA, historicalSource.id)).currentBalance, '1000', 'E77 pre-Anchor Transfer effect does not double-apply current Balance');
  await transfer(personalA, { sourceAccount: historicalSource.id, destinationAccount: historicalDest.id, amount: '50', date: '2026-08-21' }, 'post-anchor');
  equal((await refreshed(personalA, historicalSource.id)).currentBalance, '950', 'E78 post-Anchor Transfer effect applies');
  await correctBalance(personalA, historicalSource.id, { correctedBalance: '900', effectiveDate: '2026-08-22' });
  await transfer(personalA, { sourceAccount: historicalSource.id, destinationAccount: historicalDest.id, amount: '10', date: '2026-08-23' }, 'post-correction');
  equal((await refreshed(personalA, historicalSource.id)).currentBalance, '890', 'E79 post-Correction Transfer applies from latest Anchor');
  equal(await countRows('finance_account_effects', 'where transfer_id = $1', [preAnchorTransfer.id]), 2, 'E80 original historical operation/effects remain persisted');

  const transferColumns = await queryDb("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'finance_transfers'");
  const transferColumnNames = transferColumns.rows.map((row) => row.column_name);
  assert(transferColumnNames.includes('source_currency') && transferColumnNames.includes('destination_currency'), 'E81 3F preserves side currency snapshots on same Transfer authority');
  assert(!transferColumnNames.some((name) => /exchange|fx|rate|gain|loss|converted|conversion/i.test(name)), 'E82 no FX/rate/gain-loss implementation');
  assert(!transferColumnNames.some((name) => /commission|fee/i.test(name)), 'E83/E84 no Commission or TransferWithFee');
  const budgetTables = await queryDb("select count(*)::int as count from information_schema.tables where table_schema = 'public' and table_name ~ 'finance_.*budget'");
  equal(budgetTables.rows[0].count, 0, 'E85 no Budget');
  assert(!/Expected Payment|expected_payment|paid_status/i.test(repoText), 'E86-E88 no Payment/Expected Payment/card settlement');
  const frontendText = fs.existsSync(path.join(root, 'front/mi-front-limpio/screens/finance'))
    ? fs.readdirSync(path.join(root, 'front/mi-front-limpio/screens/finance')).join('\n')
    : '';
  assert(!/TransferForm|Mover dinero|AccountPicker/i.test(frontendText), 'E89 no frontend');
  assert(!/updateFinanceTransfer|deleteFinanceTransfer|trash|restore/i.test(repoText), 'E90/E91 no Transfer edit or Trash/Restore');
  assert(!/ContributionService|finance_contributions|ReimbursementService|finance_reimbursements/i.test(repoText), 'E92/E93 no separate Contribution/Reimbursement financial class');
  assert(!/DoubleEntry|TransferLedger|finance_transfer_effects/i.test(repoText), 'E94 no parallel ledger/effect system');
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
  assert(runJs.includes('finance-3e-canonical-transfer') && runJs.includes("'finance-3e'"), 'node tests/run.js finance-3e registered');
  assert(runJs.includes('finance-3e-canonical-transfer') && /finance:\s*\[[\s\S]*finance-3e-canonical-transfer/.test(runJs), 'aggregate Finance suite includes 3E');
  const txColumns = await queryDb("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'finance_transactions'");
  assert(!txColumns.rows.map((row) => row.column_name).includes('account_id'), 'finance_transactions still has no account_id');
}

async function assertFixtureCleanup() {
  const people = await queryDb("select count(*)::int as count from public.people where display_name like 'Fin 3E %'");
  equal(people.rows[0].count, 0, 'fixture cleanup leaves no 3E people');
  const households = await queryDb("select count(*)::int as count from public.households where name like 'Fin 3E %'");
  equal(households.rows[0].count, 0, 'fixture cleanup leaves no 3E households');
  const transfers = await queryDb("select count(*)::int as count from public.finance_transfers where mutation_id like 'fin3e-%'");
  equal(transfers.rows[0].count, 0, 'fixture cleanup leaves no 3E transfers');
}

async function main() {
  console.log('FINANCE_3E_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigrations();
  const actors = await setupActors();

  try {
    await testBasicTransferAndPairedEffects(actors);
    await testBalancesContextPrivacyAndReports(actors);
    await testCreditCardLifecycleAtomicityIdempotencyAndHistory(actors);
    await testStaticContracts();
  } finally {
    await cleanup();
  }

  await assertFixtureCleanup();

  console.log(`\nFINANCE_3E_CANONICAL_TRANSFER_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_3E_CANONICAL_TRANSFER_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_3E_CANONICAL_TRANSFER_TESTS=PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_3E_CANONICAL_TRANSFER_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
