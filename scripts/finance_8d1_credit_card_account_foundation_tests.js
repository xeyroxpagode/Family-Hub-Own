#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 8D.1 Credit Card Account Foundation tests.
 *
 * Local Supabase only. Applies the 8D.1 timing-metadata migration, then
 * validates the create/read/edit contract for closing_day / due_day plus the
 * historical-card compatibility strategy.
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
  FINANCE_CONTEXT_TYPES,
} = require('../backend/src/constants/finance.constants');
const { resolveFinanceContext } = require('../backend/src/services/finance.context.service');
const {
  createFinanceAccount,
  getFinanceAccount,
  listFinanceAccounts,
  updateFinanceAccount,
} = require('../backend/src/services/finance.account.service');

loadTestEnvironment({ required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] });

const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`ENVIRONMENT_FAILURE: missing env: ${missing.join(', ')}`);
  process.exit(2);
}

const supabaseUrl = new URL(process.env.SUPABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(supabaseUrl.hostname)) {
  console.error('ENVIRONMENT_FAILURE: Finance 8D.1 tests are local-only.');
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

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin8d1-${label}-${suffix}@example.test`;
  const password = `Fin8D1_${crypto.randomBytes(18).toString('base64url')}!9a`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 8D.1 QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 8D.1 ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
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

async function track(result) {
  fixture.accountIds.push(result.account.id);
  return result.account;
}

async function createCard(ctx, overrides = {}) {
  return createFinanceAccount(ctx, {
    name: 'Visa 8D1',
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
    closingDay: 28,
    dueDay: 8,
    initialBalance: { amount: '0', effectiveDate: '2026-09-01' },
    ...overrides,
  });
}

async function cleanup() {
  if (fixture.accountIds.length) {
    await admin.from('finance_accounts').delete().in('id', fixture.accountIds);
  }
  if (fixture.personIds.length) {
    await admin.from('people').delete().in('id', fixture.personIds);
  }
  for (const userId of fixture.authUserIds) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
}

async function main() {
  console.log('FINANCE_8D1_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigration('supabase/migrations/20260904000000_finance_credit_card_timing_metadata_v1_1.sql');

  const user = await createAuthUser('a');
  const person = await createPerson(user.user.id, 'A');
  const accessToken = await signIn(user.email, user.password);
  const ctx = await resolveFinanceContext({ user: { id: user.user.id }, accessToken }, FINANCE_CONTEXT_TYPES.PERSONAL);

  try {
    console.log('\nD01-D05 - ACCOUNT creation unchanged');
    const account = await track(await createFinanceAccount(ctx, {
      name: 'Mercado Pago',
      currency: 'ARS',
      accountType: FINANCE_ACCOUNT_TYPES.ACCOUNT,
      initialBalance: { amount: '0', effectiveDate: '2026-09-01' },
    }));
    equal(account.accountType, FINANCE_ACCOUNT_TYPES.ACCOUNT, 'D01 ACCOUNT create works');
    equal(account.closingDay, null, 'D02 ACCOUNT has null closingDay');
    equal(account.dueDay, null, 'D03 ACCOUNT has null dueDay');
    equal(account.currentBalance, '0', 'D04 ACCOUNT default balance 0 is valid');

    console.log('\nD06-D10 - CREDIT_CARD closing/due required');
    await expectError(() => createCard(ctx, { closingDay: undefined }), 'finance_credit_card_closing_day_required', 'D06 card creation requires closing day');
    await expectError(() => createCard(ctx, { dueDay: undefined }), 'finance_credit_card_due_day_required', 'D07 card creation requires due day');
    await expectError(() => createCard(ctx, { closingDay: 0 }), 'finance_credit_card_closing_day_out_of_range', 'D08 closing day 0 invalid');
    await expectError(() => createCard(ctx, { closingDay: 32 }), 'finance_credit_card_closing_day_out_of_range', 'D08 closing day 32 invalid');
    await expectError(() => createCard(ctx, { dueDay: 0 }), 'finance_credit_card_due_day_out_of_range', 'D09 due day 0 invalid');
    await expectError(() => createCard(ctx, { dueDay: 32 }), 'finance_credit_card_due_day_out_of_range', 'D09 due day 32 invalid');

    console.log('\nD11-D14 - CREDIT_CARD boundaries');
    const card = await track(await createCard(ctx));
    equal(card.closingDay, 28, 'D11 closing day 28 persists');
    equal(card.dueDay, 8, 'D11 due day 8 persists');
    equal(card.currentBalance, '0', 'D12 new card default debt 0');
    const cardMin = await track(await createFinanceAccount(ctx, {
      name: 'Visa Min', currency: 'ARS', accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
      closingDay: 1, dueDay: 1, initialBalance: { amount: '0', effectiveDate: '2026-09-01' },
    }));
    equal(cardMin.closingDay, 1, 'D13 closing day 1 valid');
    const cardMax = await track(await createFinanceAccount(ctx, {
      name: 'Visa Max', currency: 'ARS', accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
      closingDay: 31, dueDay: 31, initialBalance: { amount: '0', effectiveDate: '2026-09-01' },
    }));
    equal(cardMax.dueDay, 31, 'D14 due day 31 valid');

    console.log('\nD15-D16 - read/list/detail DTO');
    const detail = await getFinanceAccount(ctx, card.id);
    equal(detail.account.closingDay, 28, 'D15 detail exposes closingDay');
    equal(detail.account.dueDay, 8, 'D15 detail exposes dueDay');
    const list = await listFinanceAccounts(ctx);
    const listedCard = list.accounts.find((a) => a.id === card.id);
    assert(listedCard && listedCard.closingDay === 28 && listedCard.dueDay === 8, 'D16 list exposes closingDay/dueDay');

    console.log('\nD17-D18 - ACCOUNT rejects card timing');
    await expectError(() => createFinanceAccount(ctx, {
      name: 'Nope Card Days', currency: 'ARS', accountType: FINANCE_ACCOUNT_TYPES.ACCOUNT, closingDay: 28,
    }), 'finance_account_timing_not_supported', 'D17 ACCOUNT cannot receive card timing metadata');

    console.log('\nD19-D20 - edit');
    const edited = await updateFinanceAccount(ctx, card.id, { name: 'Visa Renamed', closingDay: 5, dueDay: 20 });
    equal(edited.account.name, 'Visa Renamed', 'D19 edit renames card');
    equal(edited.account.closingDay, 5, 'D19 edit updates closingDay');
    equal(edited.account.dueDay, 20, 'D19 edit updates dueDay');
    await expectError(() => updateFinanceAccount(ctx, account.id, { closingDay: 5 }), 'finance_account_timing_not_supported', 'D20 ACCOUNT edit rejects card timing');

    console.log('\nD21 - historical card compatibility');
    const historical = await insertOne('finance_accounts', {
      financial_context_type: FINANCE_CONTEXT_TYPES.PERSONAL,
      owner_person_id: person.id,
      household_id: null,
      name: 'Visa Histórica',
      currency: 'ARS',
      account_type: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
      closing_day: null,
      due_day: null,
      balance_state: FINANCE_ACCOUNT_BALANCE_STATES.UNKNOWN,
      status: FINANCE_ACCOUNT_STATUSES.ACTIVE,
      archived_at: null,
      created_by_person_id: person.id,
      updated_by_person_id: person.id,
    });
    fixture.accountIds.push(historical.id);
    const historicalDetail = await getFinanceAccount(ctx, historical.id);
    equal(historicalDetail.account.closingDay, null, 'D21 historical card null closingDay readable');
    equal(historicalDetail.account.dueDay, null, 'D21 historical card null dueDay readable');
  } finally {
    await cleanup();
  }

  console.log(`\nFINANCE_8D1_CREDIT_CARD_ACCOUNT_FOUNDATION_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_8D1_CREDIT_CARD_ACCOUNT_FOUNDATION_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_8D1_CREDIT_CARD_ACCOUNT_FOUNDATION_TESTS=PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_8D1_CREDIT_CARD_ACCOUNT_FOUNDATION_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});