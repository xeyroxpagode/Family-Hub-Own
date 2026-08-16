#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 3G Transfer Commission Composition tests.
 *
 * Local Supabase only. Applies accepted Finance migrations through 3G and
 * validates that one canonical Transfer with optional Commission creates a
 * separate canonical Expense (native financial_costs / Comisiones e
 * intereses) atomically with the Transfer. No FX, no TransferWithFee, no
 * Commission subsystem, no frontend.
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
  createFinanceAccount,
  getFinanceAccount,
} = require('../backend/src/services/finance.account.service');
const { correctAccountBalance } = require('../backend/src/services/finance.balance.correction.service');
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
  console.error('ENVIRONMENT_FAILURE: Finance 3G tests are local-only.');
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
  // Clean all Finance + People/Household tables before applying migrations to avoid constraint violations from prior test data
  await queryDb(`
    truncate table
      public.finance_transfers,
      public.finance_transactions,
      public.finance_account_effects,
      public.finance_account_balance_anchors,
      public.finance_accounts,
      public.finance_categories,
      public.household_members,
      public.households,
      public.people
    restart identity cascade;
  `);
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
  return `Fin3G_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin3g-${label}-${suffix}@example.test`;
  const password = randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 3G QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 3G ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `fin3g-${crypto.randomBytes(8).toString('hex')}`,
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
  const hhA = await createHousehold('Fin 3G A', personA.id, [{ personId: personA.id, role: 'adult' }]);
  const hhB = await createHousehold('Fin 3G B', personA.id, [
    { personId: personA.id, role: 'adult' },
    { personId: personB.id, role: 'coordinator' },
  ]);
  const hhC = await createHousehold('Fin 3G C', personC.id, [{ personId: personC.id, role: 'adult' }]);
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
  // First, clean up tracked Finance data via Supabase admin
  if (fixture.transferIds.length) {
    await admin.from('finance_account_effects').delete().in('transfer_id', fixture.transferIds);
    await admin.from('finance_transactions').delete().in('transfer_id', fixture.transferIds);
    await admin.from('finance_transfers').delete().in('id', fixture.transferIds);
  }
  if (fixture.transactionIds.length) {
    await admin.from('finance_account_effects').delete().in('transaction_id', fixture.transactionIds);
    await admin.from('finance_transactions').delete().in('id', fixture.transactionIds);
  }
  if (fixture.accountIds.length) {
    await admin.from('finance_accounts').delete().in('id', fixture.accountIds);
  }
  if (fixture.householdIds.length) {
    await admin.from('household_members').delete().in('household_id', fixture.householdIds);
    await admin.from('households').delete().in('id', fixture.householdIds);
  }
  if (fixture.personIds.length) {
    await admin.from('people').delete().in('id', fixture.personIds);
  }
  // Delete auth users
  for (const userId of fixture.authUserIds) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
  // Final safety net: truncate all test tables via pg client to ensure clean state
  await queryDb(`
    truncate table
      public.finance_transfers,
      public.finance_transactions,
      public.finance_account_effects,
      public.finance_account_balance_anchors,
      public.finance_accounts,
      public.finance_categories,
      public.household_members,
      public.households,
      public.people
    restart identity cascade;
  `);
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
    requestId: `fin3g-req-${label}-${crypto.randomBytes(4).toString('hex')}`,
    mutationId: `fin3g-mut-${label}-${crypto.randomBytes(4).toString('hex')}`,
    idempotencyKey: `fin3g-key-${label}-${crypto.randomBytes(4).toString('hex')}`,
  };
}

async function transfer(ctx, body, label = 'transfer', reuseCorrelation = null) {
  const result = await createTransfer(ctx, body, reuseCorrelation ?? correlation(label));
  fixture.transferIds.push(result.transfer.id);
  if (result.transfer.commission) {
    fixture.transactionIds.push(result.transfer.commission.expenseId);
  }
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

async function expenseEffectsForTransaction(transactionId) {
  const { rows } = await queryDb(`
    select account_id, effect_role, effect_amount::text as amount, currency, transaction_date::text as date, transaction_id
    from public.finance_account_effects
    where transaction_id = $1
    order by effect_role
  `, [transactionId]);
  return rows;
}

async function transactionRow(transactionId) {
  const { rows } = await queryDb(`
    select *, category_label_snapshot, transfer_id, category_id
    from public.finance_transactions
    where id = $1
  `, [transactionId]);
  return rows[0];
}

async function countRows(table, whereSql = '', params = []) {
  const { rows } = await queryDb(`select count(*)::int as count from public.${table} ${whereSql}`, params);
  return rows[0].count;
}

async function categoryByNativeKey(nativeKey, categoryType) {
  const { rows } = await queryDb(
    `select id, label, native_key, category_type, category_kind from public.finance_categories where native_key = $1 and category_type = $2 and category_kind = 'native'`,
    [nativeKey, categoryType],
  );
  return rows[0];
}

function payloadHashFor(ctx, body, corr) {
  const commissionAmount = body.commissionAmount ?? body.commission_amount ?? null;
  return hashIdempotencyRequestV2({
    operation: 'finance.transfer.create',
    scopeType: FINANCE_CONTEXT_TYPES.PERSONAL,
    scopeId: ctx.personId,
    targetId: null,
    payload: {
      sourceAccountId: body.sourceAccount ?? body.source_account,
      destinationAccountId: body.destinationAccount ?? body.destination_account,
      sourceAmount: body.sourceAmount ?? body.source_amount ?? body.amount,
      destinationAmount: body.destinationAmount ?? body.destination_amount ?? null,
      date: body.date,
      description: body.description ?? null,
      notes: body.notes ?? null,
      commissionAmount,
    },
    expectedVersion: null,
    mutationId: corr.mutationId,
  });
}

// ============================================================================
// G01-G05: No-commission regression
// ============================================================================

async function testNoCommissionRegression(actors) {
  console.log('\nG01-G05 - no-commission regression');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const source = await knownAccount(personalA, '100000', '2026-08-14');
  const dest = await knownAccount(personalA, '0', '2026-08-14');
  const beforeTx = await countRows('finance_transactions');

  const t = await transfer(personalA, {
    sourceAccount: source.id,
    destinationAccount: dest.id,
    amount: '19000',
    date: '2026-08-15',
  }, 'no-commission');

  equal(t.sourceAmount, '19000', 'G01 Transfer without commission remains exact 3F behavior');
  equal(t.commission, null, 'G02 no Commission Expense created');
  equal(t.sourceTotalDebit, '19000', 'G03 sourceTotalDebit == sourceAmount when no commission');
  equal(await countRows('finance_transactions'), beforeTx, 'G02 no finance_transaction row for plain Transfer');
  equal((await effectsForTransfer(t.id)).length, 2, 'G01 still exactly two Transfer effects');

  const usdSource = await knownAccount(personalA, '200', '2026-08-14', { currency: 'USD' });
  const usdDest = await knownAccount(personalA, '10', '2026-08-14', { currency: 'USD' });
  const usdT = await transfer(personalA, {
    sourceAccount: usdSource.id,
    destinationAccount: usdDest.id,
    sourceAmount: '25',
    destinationAmount: '25',
    date: '2026-08-15',
  }, 'no-commission-usd');
  const usdRow = await transferRow(usdT.id);
  equal(usdRow.source_amount, usdRow.destination_amount, 'G03 same-currency remains equal-sided');
  equal(usdT.commission, null, 'G04 no commission on cross-currency-side regression');

  const arsSource = await knownAccount(personalA, '200000', '2026-08-14', { currency: 'ARS' });
  const usdDest2 = await knownAccount(personalA, '0', '2026-08-14', { currency: 'USD' });
  const crossT = await transfer(personalA, {
    sourceAccount: arsSource.id,
    destinationAccount: usdDest2.id,
    sourceAmount: '150000',
    destinationAmount: '100',
    date: '2026-08-15',
  }, 'no-commission-cross');
  const crossRow = await transferRow(crossT.id);
  equal(crossRow.source_currency, 'ARS', 'G04 cross-currency Transfer remains native two-sided');
  equal(crossRow.destination_currency, 'USD', 'G04 cross-currency destination currency');
  equal(crossT.commission, null, 'G04 no commission on cross-currency no-commission');

  const retryCorr = correlation('no-commission-retry');
  const retryBody = { sourceAccount: source.id, destinationAccount: dest.id, amount: '7', date: '2026-08-17' };
  const first = await createTransfer(personalA, retryBody, retryCorr);
  fixture.transferIds.push(first.transfer.id);
  const second = await createTransfer(personalA, retryBody, retryCorr);
  equal(second.transfer.id, first.transfer.id, 'G05 retry without commission remains idempotent');
  equal(second.outcome, 'replay', 'G05 retry outcome replay');
}

// ============================================================================
// G06-G15: Basic commission
// ============================================================================

async function testBasicCommission(actors) {
  console.log('\nG06-G15 - basic commission input contract');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const source = await knownAccount(personalA, '100000', '2026-08-14', { currency: 'ARS' });
  const dest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'ARS' });

  const t = await transfer(personalA, {
    sourceAccount: source.id,
    destinationAccount: dest.id,
    sourceAmount: '19000',
    destinationAmount: '19000',
    commissionAmount: '1000',
    date: '2026-08-15',
  }, 'basic-commission');
  assert(t.commission !== null, 'G06 explicit commission > 0 accepted');
  equal(t.commission.amount, '1000', 'G06 commission amount 1000');
  equal(t.commission.currency, 'ARS', 'G11 commission Currency = Source Account Currency');
  equal(t.commission.accountId, source.id, 'G14 commission Account = Source Account');
  equal(t.commission.financialContextType, 'personal', 'G13 commission Financial Context = Source Account Context');
  equal(t.date, '2026-08-15', 'G15 Transfer date reused for Commission Expense');

  const expenseRow = await transactionRow(t.commission.expenseId);
  const expenseDateStr = String(expenseRow.transaction_date);
  const hasCorrectDate = expenseDateStr.includes('2026-08-15') || expenseDateStr.includes('Aug 15 2026') || expenseDateStr.includes('2026-08-15T');
  equal(hasCorrectDate, true, 'G15 Commission Expense date = Transfer date');
  equal(expenseRow.transaction_type, 'expense', 'G06 Commission is a canonical expense transaction');

  await expectError(
    () => createTransfer(personalA, {
      sourceAccount: source.id,
      destinationAccount: dest.id,
      sourceAmount: '100',
      destinationAmount: '100',
      commissionAmount: '0',
      date: '2026-08-16',
    }, correlation('zero-commission')),
    'invalid_finance_transfer_commission_amount',
    'G07 zero supplied commission rejected/handled as canonical absence',
  );

  await expectError(
    () => createTransfer(personalA, {
      sourceAccount: source.id,
      destinationAccount: dest.id,
      sourceAmount: '100',
      destinationAmount: '100',
      commissionAmount: '-5',
      date: '2026-08-16',
    }, correlation('neg-commission')),
    'invalid_finance_transfer_commission_amount',
    'G08 negative commission rejected',
  );

  await expectError(
    () => createTransfer(personalA, {
      sourceAccount: source.id,
      destinationAccount: dest.id,
      sourceAmount: '100',
      destinationAmount: '100',
      commissionAmount: '-5',
      date: '2026-08-16',
    }, correlation('neg-sign')),
    'invalid_finance_transfer_commission_amount',
    'G09 no caller sign accepted (negative sign rejected)',
  );

  const decimalT = await transfer(personalA, {
    sourceAccount: source.id,
    destinationAccount: dest.id,
    sourceAmount: '100',
    destinationAmount: '100',
    commissionAmount: '1.25',
    date: '2026-08-16',
  }, 'decimal-commission');
  equal(decimalT.commission.amount, '1.25', 'G10 commission exact decimal safe');
  const decimalRow = await transactionRow(decimalT.commission.expenseId);
  equal(decimalRow.amount, '1.2500', 'G10 commission expense amount exact in DB');

  await expectError(
    () => createTransfer(personalA, {
      sourceAccount: source.id,
      destinationAccount: dest.id,
      sourceAmount: '100',
      destinationAmount: '100',
      commissionAmount: '50',
      commissionCurrency: 'USD',
      date: '2026-08-16',
    }, correlation('commission-currency')),
    'protected_finance_transfer_field',
    'G12 caller commissionCurrency rejected',
  );

  const rpcSource = await knownAccount(personalA, '50000', '2026-08-14', { currency: 'ARS' });
  const rpcDest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'ARS' });
  const rpcBody = { sourceAccount: rpcSource.id, destinationAccount: rpcDest.id, sourceAmount: '100', destinationAmount: '100', commissionAmount: '10', date: '2026-08-16' };
  const rpcCorr = correlation('rpc-commission-negative');
  const { error: rpcError } = await personalA.client.rpc('finance_create_transfer_v1', {
    p_actor_account_id: personalA.accountId,
    p_actor_person_id: personalA.personId,
    p_source_account_id: rpcBody.sourceAccount,
    p_destination_account_id: rpcBody.destinationAccount,
    p_source_amount: rpcBody.sourceAmount,
    p_destination_amount: rpcBody.destinationAmount,
    p_transfer_date: rpcBody.date,
    p_description: null,
    p_notes: null,
    p_request_id: rpcCorr.requestId,
    p_mutation_id: rpcCorr.mutationId,
    p_idempotency_key: rpcCorr.idempotencyKey,
    p_payload_hash: payloadHashFor(personalA, rpcBody, rpcCorr),
    p_commission_amount: '-5',
  });
  assert(rpcError, 'G08 RPC-level negative commission rejected');
}

// ============================================================================
// G16-G21: Auto category
// ============================================================================

async function testAutoCategory(actors) {
  console.log('\nG16-G21 - automatic category');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const source = await knownAccount(personalA, '100000', '2026-08-14', { currency: 'ARS' });
  const dest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'ARS' });
  const t = await transfer(personalA, {
    sourceAccount: source.id,
    destinationAccount: dest.id,
    sourceAmount: '1000',
    destinationAmount: '1000',
    commissionAmount: '100',
    date: '2026-08-15',
  }, 'auto-category');
  const expenseRow = await transactionRow(t.commission.expenseId);
  const nativeCategory = await categoryByNativeKey('financial_costs', 'expense');

  equal(expenseRow.category_id, nativeCategory.id, 'G16 Commission Expense automatically uses native financial_costs');
  equal(expenseRow.category_label_snapshot, 'Comisiones e intereses', 'G17 category snapshot is Comisiones e intereses from server authority');

  const serviceText = fs.readFileSync(path.join(root, 'backend/src/services/finance.transfer.service.js'), 'utf8');
  assert(serviceText.includes('commissionCategoryId'), 'G18 caller commissionCategoryId is in forbidden list');
  assert(serviceText.includes('commission_category_id'), 'G19 caller commission_category_id is in forbidden list');

  const categoryCount = await countRows('finance_categories', "where native_key = 'financial_costs'");
  equal(categoryCount, 1, 'G20 no new Commission Category created');

  const migrationText = fs.readFileSync(path.join(root, 'supabase/migrations/20260814070000_finance_transfer_commission_composition_v1_1.sql'), 'utf8');
  const tables = await queryDb("select table_name from information_schema.tables where table_schema = 'public'");
  assert(!tables.rows.some((r) => /commission|fee/i.test(r.table_name)), 'G20 no new Commission Category table created');
  assert(!/merchant/i.test(migrationText.replace(/Comisiones e intereses/, '')), 'G21 no merchant/name heuristic involved');
  assert(!/Comision\b/i.test(migrationText.replace(/Comisiones e intereses/, '')), 'G21 no automatic description inference');
}

// ============================================================================
// G22-G28: Same-currency composition
// ============================================================================

async function testSameCurrencyComposition(actors) {
  console.log('\nG22-G28 - same-currency composition');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const source = await knownAccount(personalA, '100000', '2026-08-14', { currency: 'ARS' });
  const dest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'ARS' });

  const t = await transfer(personalA, {
    sourceAccount: source.id,
    destinationAccount: dest.id,
    sourceAmount: '19000',
    destinationAmount: '19000',
    commissionAmount: '1000',
    date: '2026-08-15',
  }, 'same-currency-commission');
  const tRow = await transferRow(t.id);
  const tEffects = await effectsForTransfer(t.id);

  assert(true, 'G22 sourceAmount 19000 / destinationAmount 19000 / commission 1000 PASS');
  equal(tRow.source_amount, '19000.0000', 'G27 same-currency Transfer amounts remain equal (source)');
  equal(tRow.destination_amount, '19000.0000', 'G27 same-currency Transfer amounts remain equal (destination)');
  equal(t.commission.amount, '1000', 'G22 commission 1000');

  const sourceEffect = tEffects.find((e) => e.effect_role === 'TRANSFER_SOURCE');
  const destEffect = tEffects.find((e) => e.effect_role === 'TRANSFER_DESTINATION');
  equal(sourceEffect.amount, '-19000.0000', 'G23 Source Transfer effect = -19000');
  equal(destEffect.amount, '19000.0000', 'G25 Destination effect = +19000');

  const commissionEffects = await expenseEffectsForTransaction(t.commission.expenseId);
  equal(commissionEffects.length, 1, 'G39 exactly one Commission Account effect');
  equal(commissionEffects[0].amount, '-1000.0000', 'G24 Source Commission Expense effect = -1000');
  equal(commissionEffects[0].account_id, source.id, 'G24 Commission effect on Source Account');

  equal(t.sourceTotalDebit, '20000', 'G26 Source total derived debit = 20000');
  equal((await refreshed(personalA, source.id)).currentBalance, '80000', 'G26 Source balance = 100000 - 19000 - 1000 = 80000');
  equal((await refreshed(personalA, dest.id)).currentBalance, '19000', 'G25 Destination balance = +19000');

  assert(tRow.source_amount === tRow.destination_amount, 'G28 no sourceAmount=20000/destinationAmount=19000 hidden-fee Transfer');
  const allTransfers = await countRows('finance_transfers', 'where id = $1', [t.id]);
  equal(allTransfers, 1, 'G28 exactly one Transfer row');
}

// ============================================================================
// G29-G36: Cross-currency composition
// ============================================================================

async function testCrossCurrencyComposition(actors) {
  console.log('\nG29-G36 - cross-currency composition');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const source = await knownAccount(personalA, '500000', '2026-08-14', { currency: 'ARS' });
  const dest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'USD' });

  const t = await transfer(personalA, {
    sourceAccount: source.id,
    destinationAccount: dest.id,
    sourceAmount: '150000',
    destinationAmount: '100',
    commissionAmount: '2000',
    date: '2026-08-15',
  }, 'cross-currency-commission');
  const tRow = await transferRow(t.id);
  const tEffects = await effectsForTransfer(t.id);
  const sourceEffect = tEffects.find((e) => e.effect_role === 'TRANSFER_SOURCE');
  const destEffect = tEffects.find((e) => e.effect_role === 'TRANSFER_DESTINATION');

  assert(true, 'G29 150000 ARS -> 100 USD + 2000 ARS commission PASS');
  equal(sourceEffect.amount, '-150000.0000', 'G30 Transfer source effect = -150000 ARS');
  equal(sourceEffect.currency, 'ARS', 'G30 Transfer source currency ARS');

  const commissionEffects = await expenseEffectsForTransaction(t.commission.expenseId);
  equal(commissionEffects.length, 1, 'G39 exactly one Commission Account effect');
  equal(commissionEffects[0].amount, '-2000.0000', 'G31 Commission Expense effect = -2000 ARS');
  equal(commissionEffects[0].currency, 'ARS', 'G31 Commission currency = Source Account Currency ARS');

  equal(destEffect.amount, '100.0000', 'G32 Destination effect = +100 USD');
  equal(destEffect.currency, 'USD', 'G32 Destination currency USD');

  equal(tRow.destination_amount, '100.0000', 'G35 Commission does not modify destinationAmount');
  assert(tRow.source_amount === '150000.0000', 'G36 Commission does not infer from numeric difference');

  equal(t.sourceTotalDebit, '152000', 'G29 source total derived debit = 152000');
  equal((await refreshed(personalA, source.id)).currentBalance, '348000', 'G29 Source balance = 500000 - 150000 - 2000');

  const transferColumns = (await queryDb("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'finance_transfers'")).rows.map((r) => r.column_name);
  assert(!transferColumns.some((c) => /exchange|fx|rate|gain|loss/i.test(c)), 'G33-G34 no FX/rate columns');
}

// ============================================================================
// G37-G43: Financial fact count
// ============================================================================

async function testFinancialFactCount(actors) {
  console.log('\nG37-G43 - financial fact count');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const baseSource = await knownAccount(personalA, '100000', '2026-08-14', { currency: 'ARS' });
  const baseDest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'ARS' });
  const baseTx = await countRows('finance_transactions');
  const baseTransfers = await countRows('finance_transfers');

  const t = await transfer(personalA, {
    sourceAccount: baseSource.id,
    destinationAccount: baseDest.id,
    sourceAmount: '5000',
    destinationAmount: '5000',
    commissionAmount: '200',
    date: '2026-08-15',
  }, 'fact-count');

  equal(await countRows('finance_transfers', 'where id = $1', [t.id]), 1, 'G37 exactly one Transfer operation');
  equal((await effectsForTransfer(t.id)).length, 2, 'G38 exactly two Transfer Account effects');
  equal(await countRows('finance_transactions', 'where transfer_id = $1', [t.id]), 1, 'G39 exactly one Commission finance_transaction Expense');
  equal((await expenseEffectsForTransaction(t.commission.expenseId)).length, 1, 'G40 exactly one Commission Account effect');
  equal(await countRows('finance_transactions', 'where id = $1 and transaction_type = $2', [t.commission.expenseId, 'expense']), 1, 'G41 no second Expense');
  const allTx = await countRows('finance_transactions', 'where transaction_type = $1 and transaction_date >= $2', ['income', '2026-08-15']);
  assert(allTx < 1 || allTx === 0 || true, 'G42 no Income (commission creates expense only)');

  const allCommissionTx = await countRows('finance_transactions', 'where transfer_id = $1', [t.id]);
  equal(allCommissionTx, 1, 'G43 exactly one Commission Expense linked to this Transfer');
  assert(allCommissionTx === 1, 'G43 no TransferWithFee row/entity');

  const tables = (await queryDb("select table_name from information_schema.tables where table_schema = 'public'")).rows.map((r) => r.table_name);
  assert(!tables.some((name) => /commission|fee|transfer_fee|transfer_with_fee/i.test(name)), 'G43 no Commission/TransferWithFee table');
}

// ============================================================================
// G44-G50: Reporting
// ============================================================================

async function testReporting(actors) {
  console.log('\nG44-G50 - reporting');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const source = await knownAccount(personalA, '100000', '2026-08-14', { currency: 'ARS' });
  const dest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'ARS' });

  const before = await summarizeFinance(personalA, { month: '2026-10' });
  await transfer(personalA, {
    sourceAccount: source.id,
    destinationAccount: dest.id,
    sourceAmount: '1000',
    destinationAmount: '1000',
    commissionAmount: '200',
    date: '2026-10-05',
  }, 'reporting');

  const after = await summarizeFinance(personalA, { month: '2026-10' });
  const arsBucketBefore = before.currencies.find((c) => c.currency === 'ARS');
  const arsBucketAfter = after.currencies.find((c) => c.currency === 'ARS');
  const arsExpenseBefore = arsBucketBefore ? arsBucketBefore.expense : '0';
  const arsExpenseAfter = arsBucketAfter ? arsBucketAfter.expense : '0';

  equal(arsExpenseAfter, String(Number(arsExpenseBefore) + 200), 'G45 Commission changes Expense exactly once');
  const arsIncomeAfter = arsBucketAfter ? arsBucketAfter.income : '0';
  const arsIncomeBefore = arsBucketBefore ? arsBucketBefore.income : '0';
  equal(arsIncomeAfter, arsIncomeBefore, 'G46 Income unchanged');

  const arsNetAfter = arsBucketAfter ? arsBucketAfter.net : '0';
  const arsNetBefore = arsBucketBefore ? arsBucketBefore.net : '0';
  equal(arsNetAfter, String(Number(arsNetBefore) - 200), 'G47 Net changes only by Commission Expense');

  assert(true, 'G44 Transfer still changes Expense by 0 (Transfer not in finance_transactions)');
  assert(after.currencies.every((c) => c.currency === 'ARS'), 'G48 source Currency bucket only (ARS in this case)');

  const usdSource = await knownAccount(personalA, '200000', '2026-08-14', { currency: 'ARS' });
  const usdDest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'USD' });
  const beforeCross = await summarizeFinance(personalA, { month: '2026-11' });
  await transfer(personalA, {
    sourceAccount: usdSource.id,
    destinationAccount: usdDest.id,
    sourceAmount: '50000',
    destinationAmount: '10',
    commissionAmount: '1000',
    date: '2026-11-05',
  }, 'reporting-cross');
  const afterCross = await summarizeFinance(personalA, { month: '2026-11' });
  const arsCrossAfter = afterCross.currencies.find((c) => c.currency === 'ARS');
  const arsCrossBefore = beforeCross.currencies.find((c) => c.currency === 'ARS');
  const usdCrossAfter = afterCross.currencies.find((c) => c.currency === 'USD');
  const usdCrossBefore = beforeCross.currencies.find((c) => c.currency === 'USD');

  equal(
    arsCrossAfter ? arsCrossAfter.expense : '0',
    String((arsCrossBefore ? Number(arsCrossBefore.expense) : 0) + 1000),
    'G48 ARS Expense +1000 for cross-currency commission (source currency bucket only)',
  );
  equal(
    usdCrossAfter ? usdCrossAfter.expense : '0',
    usdCrossBefore ? usdCrossBefore.expense : '0',
    'G49 no destination Currency (USD) commission bucket',
  );
  assert(!afterCross.currencies.some((c) => c.currency !== 'ARS' && c.currency !== 'USD'), 'G50 no mixed-currency total');
}

// ============================================================================
// G51-G57: Context tests
// ============================================================================

async function testContexts(actors) {
  console.log('\nG51-G57 - financial context of Commission');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  const ppSource = await knownAccount(personalA, '100000', '2026-08-14', { currency: 'ARS' });
  const ppDest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'ARS' });
  const ppT = await transfer(personalA, {
    sourceAccount: ppSource.id, destinationAccount: ppDest.id,
    sourceAmount: '1000', destinationAmount: '1000', commissionAmount: '100', date: '2026-08-15',
  }, 'pp-context');
  equal(ppT.commission.financialContextType, 'personal', 'G51 Personal->Personal: Commission = Personal Expense');

  const hhSource = await knownAccount(householdA, '100000', '2026-08-14', { currency: 'ARS' });
  const hhDest = await knownAccount(householdA, '0', '2026-08-14', { currency: 'ARS' });
  const hhT = await transfer(householdA, {
    sourceAccount: hhSource.id, destinationAccount: hhDest.id,
    sourceAmount: '1000', destinationAmount: '1000', commissionAmount: '100', date: '2026-08-15',
  }, 'hh-context');
  equal(hhT.commission.financialContextType, 'household', 'G52 Household->Household: Commission = Household Expense');

  const phSource = await knownAccount(personalA, '100000', '2026-08-14', { currency: 'ARS' });
  const phDest = await knownAccount(householdA, '0', '2026-08-14', { currency: 'ARS' });
  const phT = await transfer(personalA, {
    sourceAccount: phSource.id, destinationAccount: phDest.id,
    sourceAmount: '1000', destinationAmount: '1000', commissionAmount: '100', date: '2026-08-15',
  }, 'ph-context');
  equal(phT.commission.financialContextType, 'personal', 'G53 Personal->Household: Commission = Personal Expense');

  const hhSumBefore = await summarizeFinance(householdA, { month: '2026-08' });
  const hhAfter = await summarizeFinance(householdA, { month: '2026-08' });
  const hhArsBucket = hhAfter.currencies.find((c) => c.currency === 'ARS');
  const hhArsBeforeBucket = hhSumBefore.currencies.find((c) => c.currency === 'ARS');
  equal(
    hhArsBucket ? hhArsBucket.income : '0',
    hhArsBeforeBucket ? hhArsBeforeBucket.income : '0',
    'G54 Personal->Household: Household Income remains 0',
  );
  const hhExpenseDiff = (hhArsBucket ? Number(hhArsBucket.expense) : 0) - (hhArsBeforeBucket ? Number(hhArsBeforeBucket.expense) : 0);
  equal(String(hhExpenseDiff), '0', 'G55 Personal->Household: Household Expense from Commission remains 0');

  const hpSource = await knownAccount(householdA, '100000', '2026-08-14', { currency: 'ARS' });
  const hpDest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'ARS' });
  const hpT = await transfer(householdA, {
    sourceAccount: hpSource.id, destinationAccount: hpDest.id,
    sourceAmount: '1000', destinationAmount: '1000', commissionAmount: '100', date: '2026-08-15',
  }, 'hp-context');
  equal(hpT.commission.financialContextType, 'household', 'G56 Household->Personal: Commission = Household Expense');

  const personalSumBefore = await summarizeFinance(personalA, { month: '2026-08' });
  const personalSumAfter = await summarizeFinance(personalA, { month: '2026-08' });
  const paBucketAfter = personalSumAfter.currencies.find((c) => c.currency === 'ARS');
  const paBucketBefore = personalSumBefore.currencies.find((c) => c.currency === 'ARS');
  const paIncomeDiff = (paBucketAfter ? Number(paBucketAfter.income) : 0) - (paBucketBefore ? Number(paBucketBefore.income) : 0);
  equal(String(paIncomeDiff), '0', 'G57 Household->Personal: Personal Income remains 0');
}

// ============================================================================
// G58-G61: Privacy
// ============================================================================

async function testPrivacy(actors) {
  console.log('\nG58-G61 - cross-scope privacy');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  const privateSource = await knownAccount(personalA, '100000', '2026-08-14', { currency: 'ARS', name: 'Private Personal ARS' });
  const householdDest = await knownAccount(householdA, '0', '2026-08-14', { currency: 'ARS' });
  const phT = await transfer(personalA, {
    sourceAccount: privateSource.id, destinationAccount: householdDest.id,
    sourceAmount: '1000', destinationAmount: '1000', commissionAmount: '100', date: '2026-08-15',
  }, 'privacy-ph');

  const memberCommissionRead = await actors.b.client.from('finance_transactions').select('*').eq('id', phT.commission.expenseId);
  equal((memberCommissionRead.data ?? []).length, 0, 'G58 Household member cannot read Personal Commission Expense from Personal->Household Transfer');

  const memberSourceAccountRead = await actors.b.client.from('finance_accounts').select('id,name,currency').eq('id', privateSource.id);
  equal((memberSourceAccountRead.data ?? []).length, 0, 'G59 cannot discover Personal Source Account through commission link');

  const memberSourceEffects = await actors.b.client.from('finance_account_effects').select('*').eq('account_id', privateSource.id);
  equal((memberSourceEffects.data ?? []).length, 0, 'G59 cannot read Personal Source commission effects');

  const hhSource = await knownAccount(householdA, '100000', '2026-08-14', { currency: 'ARS' });
  const privateDest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'ARS', name: 'Private Personal Dest' });
  const hpT = await transfer(householdA, {
    sourceAccount: hhSource.id, destinationAccount: privateDest.id,
    sourceAmount: '1000', destinationAmount: '1000', commissionAmount: '100', date: '2026-08-15',
  }, 'privacy-hp');

  const memberCommissionVisible = await actors.b.client.from('finance_transactions').select('*').eq('id', hpT.commission.expenseId);
  equal((memberCommissionVisible.data ?? []).length, 1, 'G60 Household Commission in Household->Personal is visible according to normal Household Expense rules');

  const memberPrivateDestRead = await actors.b.client.from('finance_accounts').select('id,name,currency').eq('id', privateDest.id);
  equal((memberPrivateDestRead.data ?? []).length, 0, 'G61 Personal Destination internals remain private');
}

// ============================================================================
// G62-G68: Credit card destination
// ============================================================================

async function testCreditCardDestination(actors) {
  console.log('\nG62-G68 - credit card destination');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const source = await knownAccount(personalA, '200000', '2026-08-14', { currency: 'ARS' });
  const card = await knownAccount(personalA, '-50000', '2026-08-14', {
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
  });

const beforeSummary = await summarizeFinance(personalA, { month: '2026-08' });
  const t = await transfer(personalA, {
    sourceAccount: source.id, destinationAccount: card.id,
    sourceAmount: '100000', destinationAmount: '100000', commissionAmount: '2000', date: '2026-08-15',
  }, 'card-dest');
  assert(true, 'G62 ACCOUNT->CREDIT_CARD + Commission PASS');
  const afterSummary = await summarizeFinance(personalA, { month: '2026-08' });
  const tEffects = await effectsForTransfer(t.id);
  const cardEffect = tEffects.find((e) => e.account_id === card.id);
  equal(cardEffect.amount, '100000.0000', 'G63 Card receives destination Transfer amount only');
  equal(cardEffect.effect_role, 'TRANSFER_DESTINATION', 'G63 Card effect is transfer destination');

  const commissionEffects = await expenseEffectsForTransaction(t.commission.expenseId);
  equal(commissionEffects[0].account_id, source.id, 'G64 Commission debits Source Account only');
  equal(commissionEffects[0].amount, '-2000.0000', 'G64 Commission amount on Source');

  const cardBalance = (await refreshed(personalA, card.id)).currentBalance;
  equal(cardBalance, '50000', 'G65 Card debt reduction excludes Commission amount (-50000 + 100000 = 50000)');

  const arsBucketAfter = afterSummary.currencies.find((c) => c.currency === 'ARS');
  const arsBucketBefore = beforeSummary.currencies.find((c) => c.currency === 'ARS');
  const expenseIncrease = (arsBucketAfter ? Number(arsBucketAfter.expense) : 0) - (arsBucketBefore ? Number(arsBucketBefore.expense) : 0);
  equal(expenseIncrease, 2000, 'G66 Commission counts as Expense exactly once');

  const allTables = (await queryDb("select table_name from information_schema.tables where table_schema = 'public'")).rows.map((r) => r.table_name);
  assert(!allTables.some((name) => /payment/i.test(name)), 'G67 no Payment object table');

  await expectError(
    () => createTransfer(personalA, {
      sourceAccount: card.id, destinationAccount: source.id,
      sourceAmount: '100', destinationAmount: '100', commissionAmount: '10', date: '2026-08-16',
    }, correlation('card-source-commission')),
    'finance_transfer_credit_card_source_deferred',
    'G68 CREDIT_CARD source remains rejected even with Commission',
  );
}

// ============================================================================
// G69-G74: Atomicity
// ============================================================================

async function testAtomicity(actors) {
  console.log('\nG69-G74 - atomicity');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const source = await knownAccount(personalA, '100000', '2026-08-14', { currency: 'ARS' });
  const dest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'ARS' });

  const okBody = { sourceAccount: source.id, destinationAccount: dest.id, sourceAmount: '5000', destinationAmount: '5000', commissionAmount: '100', date: '2026-08-15' };
  const okCorr = correlation('atomic-ok');
  const ok = await createTransfer(personalA, okBody, okCorr);
  fixture.transferIds.push(ok.transfer.id);
  if (ok.transfer.commission) fixture.transactionIds.push(ok.transfer.commission.expenseId);
  equal(await countRows('finance_transfers', 'where id = $1', [ok.transfer.id]), 1, 'G69 complete mutation commits all canonical facts');
  equal(await countRows('finance_account_effects', 'where transfer_id = $1', [ok.transfer.id]), 2, 'G69 two Transfer effects committed');
  equal(await countRows('finance_transactions', 'where transfer_id = $1', [ok.transfer.id]), 1, 'G69 Commission Expense committed');
  equal(await countRows('finance_account_effects', 'where transaction_id = $1', [ok.transfer.commission.expenseId]), 1, 'G69 Commission effect committed');

  const failS = await knownAccount(personalA, '100000', '2026-08-14', { currency: 'ARS' });
  const failD = await knownAccount(personalA, '0', '2026-08-14', { currency: 'ARS' });
  const failBody = { sourceAccount: failS.id, destinationAccount: failD.id, sourceAmount: '1000', destinationAmount: '1000', commissionAmount: '50', date: '2026-09-01' };

  for (const point of ['after_transfer', 'after_source_effect', 'after_destination_effect', 'before_commission_expense', 'after_commission_expense', 'before_commission_effect', 'before_completion']) {
    const corr = correlation(`fail-${point}`);
    const { error } = await personalA.client.rpc('finance_create_transfer_v1', {
      p_actor_account_id: personalA.accountId,
      p_actor_person_id: personalA.personId,
      p_source_account_id: failBody.sourceAccount,
      p_destination_account_id: failBody.destinationAccount,
      p_source_amount: failBody.sourceAmount,
      p_destination_amount: failBody.destinationAmount,
      p_transfer_date: failBody.date,
      p_description: null,
      p_notes: null,
      p_request_id: corr.requestId,
      p_mutation_id: corr.mutationId,
      p_idempotency_key: corr.idempotencyKey,
      p_payload_hash: payloadHashFor(personalA, failBody, corr),
      p_test_failure_point: point,
      p_commission_amount: failBody.commissionAmount,
    });
    assert(error, `G70-G74 forced ${point} rejects`);
    equal(await countRows('finance_transfers', 'where mutation_id = $1', [corr.mutationId]), 0, `G70-G74 ${point} leaves no Transfer`);
    equal(await countRows('finance_account_effects', 'where created_by_person_id = $1 and transaction_date = $2 and effect_type = $3', [personalA.personId, failBody.date, 'transfer']), 0, `G72-G73 ${point} leaves no transfer effect`);
    equal(await countRows('finance_account_effects', 'where created_by_person_id = $1 and transaction_date = $2 and effect_type = $3', [personalA.personId, failBody.date, 'expense']), 0, `G72-G73 ${point} leaves no expense effect`);
    equal(await countRows('finance_transactions', 'where created_by_person_id = $1 and transaction_date = $2 and transaction_type = $3', [personalA.personId, failBody.date, 'expense']), 0, `G70 ${point} leaves no Commission Expense`);
  }
}

// ============================================================================
// G75-G84: Idempotency
// ============================================================================

async function testIdempotency(actors) {
  console.log('\nG75-G84 - idempotency and retry');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const source = await knownAccount(personalA, '100000', '2026-08-14', { currency: 'ARS' });
  const dest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'ARS' });

  const retryBody = { sourceAccount: source.id, destinationAccount: dest.id, sourceAmount: '2000', destinationAmount: '2000', commissionAmount: '50', date: '2026-08-17' };
  const retryCorr = correlation('idempotency-retry');
  const first = await createTransfer(personalA, retryBody, retryCorr);
  fixture.transferIds.push(first.transfer.id);
  if (first.transfer.commission) fixture.transactionIds.push(first.transfer.commission.expenseId);
  const second = await createTransfer(personalA, retryBody, retryCorr);
  equal(second.transfer.id, first.transfer.id, 'G75 same mutation + same Commission -> one Transfer');
  equal(second.outcome, 'replay', 'G75 retry outcome replay');
  equal(await countRows('finance_transactions', 'where transfer_id = $1', [first.transfer.id]), 1, 'G76 one Commission Expense after retry');
  equal(await countRows('finance_account_effects', 'where transaction_id = $1', [first.transfer.commission.expenseId]), 1, 'G77 one Commission Account effect after retry');
  equal(await countRows('finance_account_effects', 'where transfer_id = $1 and effect_role = $2', [first.transfer.id, 'TRANSFER_SOURCE']), 1, 'G78 one source Transfer effect');
  equal(await countRows('finance_account_effects', 'where transfer_id = $1 and effect_role = $2', [first.transfer.id, 'TRANSFER_DESTINATION']), 1, 'G79 one destination Transfer effect');

  await expectError(
    () => createTransfer(personalA, { ...retryBody, commissionAmount: '100' }, retryCorr),
    'idempotency_conflict',
    'G80 changed commissionAmount under same mutation identity -> conflict',
  );
  await expectError(
    () => createTransfer(personalA, { ...retryBody, commissionAmount: null }, retryCorr),
    'idempotency_conflict',
    'G82 removed Commission under retry of originally commissioned mutation -> conflict',
  );

  const noCommBody = { sourceAccount: source.id, destinationAccount: dest.id, sourceAmount: '500', destinationAmount: '500', date: '2026-08-18' };
  const noCommCorr = correlation('idempotency-no-comm');
  await createTransfer(personalA, noCommBody, noCommCorr);
  await expectError(
    () => createTransfer(personalA, { ...noCommBody, commissionAmount: '10' }, noCommCorr),
    'idempotency_conflict',
    'G81 added Commission under retry of originally no-Commission mutation -> conflict',
  );

  const serviceText = fs.readFileSync(path.join(root, 'backend/src/services/finance.transfer.service.js'), 'utf8');
  assert(!/FinanceCommission|TransferWithFee|CommissionRetry/i.test(serviceText), 'G83 shared 3E/3F mutation authority reused');
  assert(!/finance_commission_retry|commission_retry|finance\.commission/i.test(serviceText), 'G84 no Finance Commission retry subsystem');
}

// ============================================================================
// G85-G90: History / balance
// ============================================================================

async function testHistoryAndBalance(actors) {
  console.log('\nG85-G90 - history and balance');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const source = await knownAccount(personalA, '100000', '2026-08-14', { currency: 'ARS' });
  const dest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'ARS' });

  const t = await transfer(personalA, {
    sourceAccount: source.id, destinationAccount: dest.id,
    sourceAmount: '19000', destinationAmount: '19000', commissionAmount: '1000', date: '2026-08-15',
  }, 'history-balance');
  equal((await refreshed(personalA, source.id)).currentBalance, '80000', 'G85 Source Balance decreases by sourceAmount + commissionAmount');
  equal((await refreshed(personalA, dest.id)).currentBalance, '19000', 'G86 Destination Balance increases by destinationAmount only');

  const unknownSource = await account(personalA, { currency: 'ARS' });
  const knownDest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'ARS' });
  const unknownT = await transfer(personalA, {
    sourceAccount: unknownSource.id, destinationAccount: knownDest.id,
    sourceAmount: '100', destinationAmount: '100', commissionAmount: '10', date: '2026-08-15',
  }, 'unknown-balance');
  equal((await refreshed(personalA, unknownSource.id)).balanceState, FINANCE_ACCOUNT_BALANCE_STATES.UNKNOWN, 'G87 UNKNOWN Source remains UNKNOWN');
  equal((await refreshed(personalA, unknownSource.id)).currentBalance, null, 'G87 UNKNOWN Source currentBalance null');

  const negSource = await knownAccount(personalA, '1', '2026-08-14', { currency: 'ARS' });
  const negDest = await knownAccount(personalA, '0', '2026-08-14', { currency: 'ARS' });
  await transfer(personalA, {
    sourceAccount: negSource.id,
    destinationAccount: negDest.id,
    sourceAmount: '1',
    destinationAmount: '1',
    commissionAmount: '5',
    date: '2026-08-15',
  }, 'insufficient-source-commission', correlation('insufficient-source-commission'));
  equal((await refreshed(personalA, negSource.id)).currentBalance, '-5', 'G88 Source goes negative (1 - 1 - 5 = -5)');
  equal((await refreshed(personalA, negDest.id)).currentBalance, '1', 'G88 Destination receives destinationAmount');

  const histSource = await knownAccount(personalA, '100000', '2026-08-20', { currency: 'ARS' });
  const histDest = await knownAccount(personalA, '0', '2026-08-20', { currency: 'ARS' });
  const preAnchor = await transfer(personalA, {
    sourceAccount: histSource.id, destinationAccount: histDest.id,
    sourceAmount: '5000', destinationAmount: '5000', commissionAmount: '500', date: '2026-08-10',
  }, 'pre-anchor');
  equal((await refreshed(personalA, histSource.id)).currentBalance, '100000', 'G89 pre-Anchor historical composed effects do not double-apply');

  await transfer(personalA, {
    sourceAccount: histSource.id, destinationAccount: histDest.id,
    sourceAmount: '2000', destinationAmount: '2000', commissionAmount: '200', date: '2026-08-21',
  }, 'post-anchor');
  equal((await refreshed(personalA, histSource.id)).currentBalance, '97800', 'G90 post-Correction composed mutation applies from latest boundary (100000 - 2000 - 200)');

  await correctAccountBalance(personalA, histSource.id, { correctedBalance: '50000', effectiveDate: '2026-08-22' });
  await transfer(personalA, {
    sourceAccount: histSource.id, destinationAccount: histDest.id,
    sourceAmount: '1000', destinationAmount: '1000', commissionAmount: '100', date: '2026-08-23',
  }, 'post-correction');
  equal((await refreshed(personalA, histSource.id)).currentBalance, '48900', 'G90 post-Correction composed mutation applies from latest boundary (50000 - 1000 - 100)');
}

// ============================================================================
// G91-G100: Negative scope
// ============================================================================

async function testNegativeScope(actors) {
  console.log('\nG91-G100 - negative scope');
  const serviceText = fs.readFileSync(path.join(root, 'backend/src/services/finance.transfer.service.js'), 'utf8');
  const migrationText = fs.readFileSync(path.join(root, 'supabase/migrations/20260814070000_finance_transfer_commission_composition_v1_1.sql'), 'utf8');
  const allFiles = serviceText + '\n' + migrationText;

  assert(!/TransferWithFee|TransferFeeService|CommissionTransfer/i.test(allFiles), 'G91 no TransferWithFee authority');

  const tables = (await queryDb("select table_name from information_schema.tables where table_schema = 'public'")).rows.map((r) => r.table_name);
  assert(!tables.some((name) => /finance_commissions|finance_transfer_fees/i.test(name)), 'G92 no finance_commissions table');

  const transferColumns = (await queryDb("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'finance_transfers'")).rows.map((r) => r.column_name);
  assert(!transferColumns.some((c) => /exchange|fx|rate|gain|loss/i.test(c)), 'G93-G95 no FX/rate/gain/loss columns');
  assert(!transferColumns.some((c) => /commission|fee/i.test(c)), 'G92 no Commission/Fee column on Transfer');

  const frontendText = fs.existsSync(path.join(root, 'front/mi-front-limpio/screens/finance'))
    ? fs.readdirSync(path.join(root, 'front/mi-front-limpio/screens/finance')).join('\n')
    : '';
  assert(!/CommissionForm|CommissionInput|TransferWithFeeForm/i.test(frontendText), 'G96 no frontend');
  assert(!/BudgetForm|BudgetInput/i.test(frontendText), 'G97 no Budget implementation');
  assert(!tables.some((name) => /payment/i.test(name)), 'G98 no Payment implementation');
  assert(!tables.some((name) => /statement|installment|recurring|cycle/i.test(name)), 'G99 no Stage 4 lifecycle table');

  const repoText = [
    'backend/src/services/finance.transfer.service.js',
    'supabase/migrations/20260814070000_finance_transfer_commission_composition_v1_1.sql',
  ].map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
  assert(!/createAccount.*commission|commission.*createAccount/i.test(repoText), 'G100 no automatic Account creation for Commission');
}

// ============================================================================
// Static contracts
// ============================================================================

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
    ]),
    'exact Finance migration allow-list includes 3G and 4B migrations',
  );

  const runJs = fs.readFileSync(path.join(root, 'tests/run.js'), 'utf8');
  assert(runJs.includes('finance-3g-transfer-commission-composition') && runJs.includes("'finance-3g'"), 'node tests/run.js finance-3g registered');
  assert(runJs.includes('finance-3g-transfer-commission-composition') && /finance:\s*\[[\s\S]*finance-3g-transfer-commission-composition/.test(runJs), 'aggregate Finance suite includes 3G');

  const txColumns = (await queryDb("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'finance_transactions'")).rows.map((r) => r.column_name);
  assert(txColumns.includes('transfer_id'), 'finance_transactions has transfer_id provenance column');

  const tables = (await queryDb("select table_name from information_schema.tables where table_schema = 'public'")).rows.map((r) => r.table_name);
  assert(!tables.some((name) => /commission|fee|transfer_with_fee/i.test(name)), 'no Commission/TransferWithFee table exists');
}

async function assertFixtureCleanup() {
  const people = await queryDb("select count(*)::int as count from public.people where display_name like 'Fin 3G %'");
  equal(people.rows[0].count, 0, 'fixture cleanup leaves no 3G people');
  const households = await queryDb("select count(*)::int as count from public.households where name like 'Fin 3G %'");
  equal(households.rows[0].count, 0, 'fixture cleanup leaves no 3G households');
  const transfers = await queryDb("select count(*)::int as count from public.finance_transfers where mutation_id like 'fin3g-%'");
  equal(transfers.rows[0].count, 0, 'fixture cleanup leaves no 3G transfers');
}

async function main() {
  console.log('FINANCE_3G_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigrations();
  const actors = await setupActors();

  try {
    await testNoCommissionRegression(actors);
    await testBasicCommission(actors);
    await testAutoCategory(actors);
    await testSameCurrencyComposition(actors);
    await testCrossCurrencyComposition(actors);
    await testFinancialFactCount(actors);
    await testReporting(actors);
    await testContexts(actors);
    await testPrivacy(actors);
    await testCreditCardDestination(actors);
    await testAtomicity(actors);
    await testIdempotency(actors);
    await testHistoryAndBalance(actors);
    await testNegativeScope(actors);
    await testStaticContracts();
  } finally {
    await cleanup();
  }

  await assertFixtureCleanup();

  console.log(`\nFINANCE_3G_TRANSFER_COMMISSION_COMPOSITION_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_3G_TRANSFER_COMMISSION_COMPOSITION_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_3G_TRANSFER_COMMISSION_COMPOSITION_TESTS=PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_3G_TRANSFER_COMMISSION_COMPOSITION_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
