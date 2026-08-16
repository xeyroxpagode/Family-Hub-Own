#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 4C Transaction Lifecycle Foundation tests.
 *
 * Local Supabase only. Applies migrations up to 4C, then validates:
 * - status column exists with ACTIVE/TRASHED CHECK
 * - trashed_at column exists (nullable)
 * - Existing/new Expense/Income remain ACTIVE with NULL trashed_at
 * - Invalid status rejected
 * - Consistency: ACTIVE -> NULL trashed_at, TRASHED -> non-NULL trashed_at
 * - Direct client UPDATE/DELETE remains blocked
 * - Stage 4B Account Balance behavior unchanged
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
  console.error('ENVIRONMENT_FAILURE: Finance 4C tests are local-only.');
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
  await applyMigration('supabase/migrations/20260814050000_finance_canonical_transfer_v1_1.sql');
  await applyMigration('supabase/migrations/20260814060000_finance_cross_currency_transfer_v1_1.sql');
  await applyMigration('supabase/migrations/20260814070000_finance_transfer_commission_composition_v1_1.sql');
  await applyMigration('supabase/migrations/20260814080000_finance_account_effect_status_foundation_v1_1.sql');
  await applyMigration('supabase/migrations/20260815020000_finance_transaction_lifecycle_foundation_v1_1.sql');
  await new Promise((resolve) => setTimeout(resolve, 250));
}

function randomCredential(label) {
  return `Fin4C_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin4c-${label}-${suffix}@example.test`;
  const password = randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 4C QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 4C ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `fin4c-${crypto.randomBytes(8).toString('hex')}`,
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
  const hhA = await createHousehold('Fin 4C A', personA.id, [{ personId: personA.id, role: 'adult' }]);
  const hhB = await createHousehold('Fin 4C B', personA.id, [
    { personId: personA.id, role: 'adult' },
    { personId: personB.id, role: 'coordinator' },
  ]);
  const hhC = await createHousehold('Fin 4C C', personC.id, [{ personId: personC.id, role: 'adult' }]);
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

async function knownAccount(ctx, amount = '100000', effectiveDate = '2026-08-14', overrides = {}) {
  return account(ctx, {
    initialBalance: { amount, effectiveDate },
    ...overrides,
  });
}

async function getTransactionStatus(txId) {
  const { rows } = await queryDb(
    'select status, trashed_at from public.finance_transactions where id = $1',
    [txId]
  );
  return rows[0];
}

async function refreshed(ctx, accountId) {
  return (await getFinanceAccount(ctx, accountId)).account;
}

async function testSchemaAndDefaults(actors) {
  console.log('\n=== SCHEMA AND DEFAULTS ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  // Verify status column
  const statusCols = await queryDb(`
    select column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'public' and table_name = 'finance_transactions' and column_name = 'status'
  `);
  equal(statusCols.rows.length, 1, 'status column exists');
  equal(statusCols.rows[0].data_type, 'text', 'status is text');
  equal(statusCols.rows[0].is_nullable, 'NO', 'status is NOT NULL');
  equal(statusCols.rows[0].column_default, "'ACTIVE'::text", 'status defaults to ACTIVE');

  // Verify trashed_at column
  const trashedCols = await queryDb(`
    select column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'public' and table_name = 'finance_transactions' and column_name = 'trashed_at'
  `);
  equal(trashedCols.rows.length, 1, 'trashed_at column exists');
  equal(trashedCols.rows[0].data_type, 'timestamp with time zone', 'trashed_at is timestamptz');
  equal(trashedCols.rows[0].is_nullable, 'YES', 'trashed_at is nullable');
  equal(trashedCols.rows[0].column_default, null, 'trashed_at has no default');

  // Verify CHECK constraint for status
  const statusConstraints = await queryDb(`
    select conname, pg_get_constraintdef(oid) as def
    from pg_constraint
    where conrelid = 'public.finance_transactions'::regclass
      and contype = 'c'
      and conname = 'finance_transactions_status_check'
  `);
  equal(statusConstraints.rows.length, 1, 'status CHECK constraint exists');
  assert(statusConstraints.rows[0].def.includes("status = ANY (ARRAY['ACTIVE'::text, 'TRASHED'::text])"), 'CHECK allows only ACTIVE/TRASHED');

  // Verify consistency constraint
  const consistencyConstraints = await queryDb(`
    select conname, pg_get_constraintdef(oid) as def
    from pg_constraint
    where conrelid = 'public.finance_transactions'::regclass
      and contype = 'c'
      and conname = 'finance_transactions_status_trashed_at_consistency'
  `);
  equal(consistencyConstraints.rows.length, 1, 'consistency CHECK constraint exists');
  assert(consistencyConstraints.rows[0].def.includes("status = 'ACTIVE'"), 'ACTIVE requires NULL trashed_at');
  assert(consistencyConstraints.rows[0].def.includes("status = 'TRASHED'"), 'TRASHED requires non-NULL trashed_at');

  // New expense defaults
  const expense = await trackTransaction(await createExpense(personalA, { amount: '100', currency: 'ARS', date: '2026-08-15' }));
  const expStatus = await getTransactionStatus(expense.id);
  equal(expStatus.status, 'ACTIVE', 'New Expense defaults to ACTIVE');
  equal(expStatus.trashed_at, null, 'New Expense trashed_at is NULL');

  // New income defaults
  const income = await trackTransaction(await createIncome(personalA, { amount: '200', currency: 'ARS', date: '2026-08-16' }));
  const incStatus = await getTransactionStatus(income.id);
  equal(incStatus.status, 'ACTIVE', 'New Income defaults to ACTIVE');
  equal(incStatus.trashed_at, null, 'New Income trashed_at is NULL');
}

async function testExistingRowsDefaults(actors) {
  console.log('\n=== EXISTING ROWS DEFAULT TO ACTIVE ===');
  // Check all existing transactions have ACTIVE/NULL
  const { rows } = await queryDb(`
    select status, trashed_at
    from public.finance_transactions
  `);
  for (const row of rows) {
    equal(row.status, 'ACTIVE', 'Existing transaction has ACTIVE status');
    equal(row.trashed_at, null, 'Existing transaction has NULL trashed_at');
  }
  if (rows.length === 0) {
    console.log('  (no pre-existing transactions in test DB)');
  }
}

async function testInvalidStatusRejected(actors) {
  console.log('\n=== INVALID STATUS REJECTED ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const expense = await trackTransaction(await createExpense(personalA, { amount: '100', currency: 'ARS', date: '2026-08-15' }));

  const invalidStatuses = ['ARCHIVED', 'DELETED', 'RESTORED', 'REFUNDED'];
  for (const invalidStatus of invalidStatuses) {
    const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, statement_timeout: 20000 });
    await client.connect();
    try {
      await client.query('begin');
      try {
        await client.query("update public.finance_transactions set status = $1 where id = $2", [invalidStatus, expense.id]);
        failCount += 1;
        console.error(`  FAIL: ${invalidStatus} status was not rejected`);
      } catch (err) {
        if (err.code === '23514') {
          passCount += 1;
          console.log(`  PASS: ${invalidStatus} status rejected (check constraint)`);
        } else {
          failCount += 1;
          console.error(`  FAIL: ${invalidStatus} rejected with wrong error: ${err.code}: ${err.message}`);
        }
      }
      await client.query('rollback');
    } finally {
      await client.end();
    }
  }
}

async function testConsistencyConstraints(actors) {
  console.log('\n=== CONSISTENCY CONSTRAINTS ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const expense = await trackTransaction(await createExpense(personalA, { amount: '100', currency: 'ARS', date: '2026-08-15' }));

  // TRASHED + NULL trashed_at should be rejected
  {
    const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, statement_timeout: 20000 });
    await client.connect();
    try {
      await client.query('begin');
      try {
        await client.query("update public.finance_transactions set status = 'TRASHED' where id = $1", [expense.id]);
        failCount += 1;
        console.error('  FAIL: TRASHED with NULL trashed_at was not rejected');
      } catch (err) {
        if (err.code === '23514') {
          passCount += 1;
          console.log('  PASS: TRASHED with NULL trashed_at rejected');
        } else {
          failCount += 1;
          console.error(`  FAIL: wrong error: ${err.code}: ${err.message}`);
        }
      }
      await client.query('rollback');
    } finally {
      await client.end();
    }
  }

  // ACTIVE + non-NULL trashed_at should be rejected
  {
    const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, statement_timeout: 20000 });
    await client.connect();
    try {
      await client.query('begin');
      try {
        await client.query("update public.finance_transactions set trashed_at = now() where id = $1", [expense.id]);
        failCount += 1;
        console.error('  FAIL: ACTIVE with non-NULL trashed_at was not rejected');
      } catch (err) {
        if (err.code === '23514') {
          passCount += 1;
          console.log('  PASS: ACTIVE with non-NULL trashed_at rejected');
        } else {
          failCount += 1;
          console.error(`  FAIL: wrong error: ${err.code}: ${err.message}`);
        }
      }
      await client.query('rollback');
    } finally {
      await client.end();
    }
  }
}

async function testSecurityDirectUpdateBlocked(actors) {
  console.log('\n=== SECURITY: DIRECT CLIENT UPDATE BLOCKED ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const expense = await trackTransaction(await createExpense(personalA, { amount: '100', currency: 'ARS', date: '2026-08-15' }));

  // Try direct UPDATE via anon client - should be blocked by RLS
  const { data: updateData, error: updateError } = await actors.a.client
    .from('finance_transactions')
    .update({ status: 'TRASHED' })
    .eq('id', expense.id)
    .select();

  equal(updateData?.length ?? 0, 0, 'Direct client UPDATE affects 0 rows (blocked by RLS)');
  equal((await getTransactionStatus(expense.id)).status, 'ACTIVE', 'Transaction remains ACTIVE after blocked UPDATE');

  // Try direct DELETE - should be blocked by RLS
  const { data: deleteData, error: deleteError } = await actors.a.client
    .from('finance_transactions')
    .delete()
    .eq('id', expense.id)
    .select();

  equal(deleteData?.length ?? 0, 0, 'Direct client DELETE affects 0 rows (blocked by RLS)');
  equal((await getTransactionStatus(expense.id)).status, 'ACTIVE', 'Transaction still exists after blocked DELETE');
}

async function testStage4BUnaffected(actors) {
  console.log('\n=== STAGE 4B ACCOUNT BALANCE UNCHANGED ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const anchor = await knownAccount(personalA, '100000', '2026-08-14', { name: '4B Check' });
  const expense = await trackTransaction(await createExpense(personalA, { amount: '20000', currency: 'ARS', date: '2026-08-15', account: { id: anchor.id } }));
  equal((await refreshed(personalA, anchor.id)).currentBalance, '80000', 'Expense ACTIVE reduces balance to 80000');

  // Add income
  await trackTransaction(await createIncome(personalA, { amount: '5000', currency: 'ARS', date: '2026-08-16', account: { id: anchor.id } }));
  equal((await refreshed(personalA, anchor.id)).currentBalance, '85000', 'Income increases balance to 85000');

  // Verify effect_status still works
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, statement_timeout: 20000 });
  await client.connect();
  try {
    await client.query('begin');
    await client.query("select set_config('app.finance_account_effect_mutation', 'on', true)");
    await client.query("select public.finance_account_effect_mutation($1, $2, 'REVERSED')", [anchor.id, expense.id]);
    await client.query('commit');
  } finally {
    await client.end();
  }
  equal((await refreshed(personalA, anchor.id)).currentBalance, '105000', 'REVERSED effect excluded, balance back to 105000');
}

async function testStaticContracts() {
  console.log('\n=== STATIC CONTRACTS ===');
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
    ]),
    'exact Finance migration allow-list includes 4C migration',
  );
  const runJs = fs.readFileSync(path.join(root, 'tests/run.js'), 'utf8');
  assert(runJs.includes('finance-4c-lifecycle') && runJs.includes("'finance-4c'"), 'node tests/run.js finance-4c registered');
  assert(runJs.includes('finance-4c-lifecycle') && /finance:\s*\[[\s\S]*finance-4c-lifecycle/.test(runJs), 'aggregate Finance suite includes 4C');
}

async function assertFixtureCleanup() {
  const people = await queryDb("select count(*)::int as count from public.people where display_name like 'Fin 4C %'");
  const households = await queryDb("select count(*)::int as count from public.households where slug like 'fin4c-%'");
  const accounts = fixture.accountIds.length
    ? await queryDb('select count(*)::int as count from public.finance_accounts where id = any($1::uuid[])', [fixture.accountIds])
    : { rows: [{ count: 0 }] };
  equal(people.rows[0].count, 0, 'fixture cleanup leaves no 4C people');
  equal(households.rows[0].count, 0, 'fixture cleanup leaves no 4C households');
  equal(accounts.rows[0].count, 0, 'fixture cleanup leaves no 4C account rows');
}

async function main() {
  console.log('FINANCE_4C_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigrations();
  const actors = await setupActors();

  try {
    await testSchemaAndDefaults(actors);
    await testExistingRowsDefaults(actors);
    await testInvalidStatusRejected(actors);
    await testConsistencyConstraints(actors);
    await testSecurityDirectUpdateBlocked(actors);
    await testStage4BUnaffected(actors);
    await testStaticContracts();
  } finally {
    await cleanup();
  }

  await assertFixtureCleanup();

  console.log(`\nFINANCE_4C_LIFECYCLE_FOUNDATION_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_4C_TRANSACTION_LIFECYCLE_FOUNDATION_BLOCKED');
  } else {
    console.log('FINANCE_STAGE_4C_TRANSACTION_LIFECYCLE_FOUNDATION_PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_4C_TRANSACTION_LIFECYCLE_FOUNDATION=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});