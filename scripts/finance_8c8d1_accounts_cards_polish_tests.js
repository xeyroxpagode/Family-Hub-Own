#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 8C + 8D.1 closure tests: ACCOUNT floor=0 and
 * insufficient-funds guard.
 *
 * Local Supabase only. Applies the closure migration, then proves:
 *   * a normal ACCOUNT is created/corrected only to >= 0
 *   * legacy negative / UNKNOWN rows stay readable but cannot debit
 *   * expense / transfer (+ commission) cannot drive an ACCOUNT below zero
 *   * credit-card debt semantics are unaffected
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
for (const rel of ['backend/.env.test.local', 'backend/.env.local', 'backend/.env', '.env.test.local', '.env.local']) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) {
    const parsed = require('../backend/node_modules/dotenv').parse(fs.readFileSync(abs));
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
} = require('../backend/src/constants/finance.constants');
const { resolveFinanceContext } = require('../backend/src/services/finance.context.service');
const {
  createFinanceAccount,
  getFinanceAccount,
  createInitialBalanceAnchor,
} = require('../backend/src/services/finance.account.service');
const { createTransfer } = require('../backend/src/services/finance.transfer.service');
const { correctAccountBalance } = require('../backend/src/services/finance.balance.correction.service');
const { createExpense } = require('../backend/src/services/finance.transaction.service');

loadTestEnvironment({ required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] });

const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`ENVIRONMENT_FAILURE: missing env: ${missing.join(', ')}`);
  process.exit(2);
}

const supabaseUrl = new URL(process.env.SUPABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(supabaseUrl.hostname)) {
  console.error('ENVIRONMENT_FAILURE: Stage 8C/8D.1 closure tests are local-only.');
  process.exit(2);
}

const databaseUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:56222/postgres';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let passCount = 0;
let failCount = 0;
const fixture = { authUserIds: [], personIds: [], accountIds: [] };

function assert(condition, message) {
  if (condition) { passCount += 1; console.log(`  PASS: ${message}`); return true; }
  failCount += 1; console.error(`  FAIL: ${message}`); return false;
}

function equal(actual, expected, message) {
  return assert(actual === expected, `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

async function expectError(fn, expectedCode, message) {
  let error = null;
  try { await fn(); } catch (caught) { error = caught; }
  if (!error) { failCount += 1; console.error(`  FAIL: ${message} (expected ${expectedCode}, got success)`); return; }
  if (error.code !== expectedCode) {
    failCount += 1;
    console.error(`  FAIL: ${message} (expected ${expectedCode}, got ${error.code}: ${error.message})`);
    return;
  }
  passCount += 1; console.log(`  PASS: ${message} (code=${error.code})`);
}

async function queryDb(sql, params = []) {
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, statement_timeout: 20000 });
  await client.connect();
  try { return await client.query(sql, params); } finally { await client.end(); }
}

async function applyMigration(rel) {
  await queryDb(fs.readFileSync(path.join(root, rel), 'utf8'));
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin8c8d1-${label}-${suffix}@example.test`;
  const password = `Fin8c8d1_${crypto.randomBytes(18).toString('base64url')}!9a`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `Fin 8C/8D.1 QA ${label}` } });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 8C/8D.1 ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function signIn(email, password) {
  const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(`sign in failed: ${error?.message}`);
  return data.session.access_token;
}

function track(result) { fixture.accountIds.push(result.account.id); return result.account; }

async function account(ctx, overrides = {}) {
  return track(await createFinanceAccount(ctx, {
    name: `Cuenta ${crypto.randomBytes(4).toString('hex')}`,
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.ACCOUNT,
    ...overrides,
  }));
}

async function knownAccount(ctx, amount, overrides = {}) {
  return account(ctx, { initialBalance: { amount, effectiveDate: '2026-09-01' }, ...overrides });
}

function correlation(label) {
  return {
    requestId: `fin8c8d1-req-${label}-${crypto.randomBytes(4).toString('hex')}`,
    mutationId: `fin8c8d1-mut-${label}-${crypto.randomBytes(4).toString('hex')}`,
    idempotencyKey: `fin8c8d1-key-${label}-${crypto.randomBytes(4).toString('hex')}`,
  };
}

async function transfer(ctx, body, label = 'transfer') {
  const result = await createTransfer(ctx, body, correlation(label));
  fixture.transactionIds = fixture.transactionIds || [];
  if (result.transfer.commission) fixture.transactionIds.push(result.transfer.commission.expenseId);
  return result.transfer;
}

async function refreshed(ctx, accountId) {
  return (await getFinanceAccount(ctx, accountId)).account;
}

async function cleanup() {
  if (fixture.accountIds.length) await admin.from('finance_accounts').delete().in('id', fixture.accountIds);
  if (fixture.personIds.length) await admin.from('people').delete().in('id', fixture.personIds);
  for (const userId of fixture.authUserIds) await admin.auth.admin.deleteUser(userId).catch(() => {});
}

async function main() {
  console.log('FINANCE_8C8D1_CLOSURE_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigration('supabase/migrations/20260905000000_finance_account_floor_insufficient_funds_v1_1.sql');

  const user = await createAuthUser('a');
  const person = await createPerson(user.user.id, 'A');
  const accessToken = await signIn(user.email, user.password);
  const ctx = await resolveFinanceContext({ user: { id: user.user.id }, accessToken }, 'personal');

  try {
    console.log('\nC. ACCOUNT floor = 0');
    const zero = await account(ctx, { initialBalance: { amount: '0', effectiveDate: '2026-09-01' } });
    equal(zero.currentBalance, '0', 'C10 ACCOUNT create with 0 is valid');
    const positive = await account(ctx, { initialBalance: { amount: '500', effectiveDate: '2026-09-01' } });
    equal(positive.currentBalance, '500', 'C11 ACCOUNT create with positive is valid');
    await expectError(
      () => account(ctx, { initialBalance: { amount: '-50', effectiveDate: '2026-09-01' } }),
      'finance_account_negative_balance_not_allowed',
      'C12 negative initial balance rejected with human code',
    );

    const correctable = await knownAccount(ctx, '100');
    const correctedZero = await correctAccountBalance(ctx, correctable.id, {
      correctedBalance: '0', effectiveDate: '2026-09-02',
      mutationId: crypto.randomUUID(), idempotencyKey: `k-${crypto.randomUUID()}`,
    });
    equal(correctedZero.account.currentBalance, '0', 'C13 correction to 0 valid');
    await expectError(
      () => correctAccountBalance(ctx, correctable.id, {
        correctedBalance: '-1', effectiveDate: '2026-09-03',
        mutationId: crypto.randomUUID(), idempotencyKey: `k-${crypto.randomUUID()}`,
      }),
      'finance_account_negative_balance_not_allowed',
      'C14 fresh negative correction rejected',
    );

    console.log('\nC. legacy negative / UNKNOWN remain readable');
    const legacyNeg = await insertOne('finance_accounts', {
      financial_context_type: 'personal',
      owner_person_id: person.id,
      household_id: null,
      name: 'Legacy Negativa',
      currency: 'ARS',
      account_type: FINANCE_ACCOUNT_TYPES.ACCOUNT,
      closing_day: null,
      due_day: null,
      balance_state: FINANCE_ACCOUNT_BALANCE_STATES.KNOWN,
      status: FINANCE_ACCOUNT_STATUSES.ACTIVE,
      archived_at: null,
      created_by_person_id: person.id,
      updated_by_person_id: person.id,
    });
    fixture.accountIds.push(legacyNeg.id);
    await insertOne('finance_account_balance_anchors', {
      account_id: legacyNeg.id,
      amount: '-500',
      currency: 'ARS',
      effective_date: '2026-08-01',
      anchor_kind: 'INITIAL',
      created_by_person_id: person.id,
    });
    equal((await refreshed(ctx, legacyNeg.id)).currentBalance, '-500', 'C15 historical negative row remains readable');

    const unknown = await account(ctx);
    equal(unknown.balanceState, FINANCE_ACCOUNT_BALANCE_STATES.UNKNOWN, 'C16 UNKNOWN account readable with balanceState UNKNOWN');
    equal(unknown.currentBalance, null, 'C16 UNKNOWN account currentBalance null');

    console.log('\nD. insufficient funds');
    const expAcct = await knownAccount(ctx, '100');
    await createExpense(ctx, { amount: '100', currency: 'ARS', date: '2026-09-02', account: expAcct.id });
    equal((await refreshed(ctx, expAcct.id)).currentBalance, '0', 'D18 expense equal to available balance is valid');
    await expectError(
      () => createExpense(ctx, { amount: '1', currency: 'ARS', date: '2026-09-02', account: expAcct.id }),
      'finance_account_insufficient_funds',
      'D17 expense that would make ACCOUNT negative rejected',
    );

    const trSrc = await knownAccount(ctx, '50');
    const trDest = await knownAccount(ctx, '0');
    await transfer(ctx, { sourceAccount: trSrc.id, destinationAccount: trDest.id, sourceAmount: '50', destinationAmount: '50', date: '2026-09-02' }, 'equal');
    equal((await refreshed(ctx, trSrc.id)).currentBalance, '0', 'D20 transfer equal to balance valid');
    await expectError(
      () => transfer(ctx, { sourceAccount: trSrc.id, destinationAccount: trDest.id, sourceAmount: '1', destinationAmount: '1', date: '2026-09-02' }, 'over'),
      'finance_account_insufficient_funds',
      'D19 transfer over balance rejected',
    );

    const feeSrc = await knownAccount(ctx, '60');
    await expectError(
      () => transfer(ctx, { sourceAccount: feeSrc.id, destinationAccount: trDest.id, sourceAmount: '50', destinationAmount: '50', commissionAmount: '20', date: '2026-09-02' }, 'fee-over'),
      'finance_account_insufficient_funds',
      'D21 transfer + fee over available rejected',
    );

    await expectError(
      () => transfer(ctx, { sourceAccount: unknown.id, destinationAccount: trDest.id, sourceAmount: '1', destinationAmount: '1', date: '2026-09-02' }, 'unknown-src'),
      'finance_account_insufficient_funds',
      'D24 legacy UNKNOWN cannot be debit source',
    );
    await expectError(
      () => transfer(ctx, { sourceAccount: legacyNeg.id, destinationAccount: trDest.id, sourceAmount: '1', destinationAmount: '1', date: '2026-09-02' }, 'neg-src'),
      'finance_account_insufficient_funds',
      'D25 legacy negative cannot be debit source',
    );

    console.log('\nF. credit card debt is unaffected');
    const card = await track(await createFinanceAccount(ctx, {
      name: 'Visa', currency: 'ARS', accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
      closingDay: 28, dueDay: 8, initialBalance: { amount: '0', effectiveDate: '2026-09-01' },
    }));
    await createExpense(ctx, { amount: '500', currency: 'ARS', date: '2026-09-02', account: card.id });
    equal((await refreshed(ctx, card.id)).currentBalance, '-500', 'F36 card expense grows debt (no ACCOUNT floor)');
  } finally {
    await cleanup();
  }

  console.log(`\nFINANCE_8C8D1_CLOSURE_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_8C8D1_CLOSURE_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_8C8D1_CLOSURE_TESTS=PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_8C8D1_CLOSURE_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});