#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 4B Account Effect Status Foundation tests.
 *
 * Local Supabase only. Applies migrations up to 4B, then validates:
 * - effect_status column exists with ACTIVE/REVERSED CHECK
 * - Existing effects default to ACTIVE
 * - Current balance function filters ACTIVE only
 * - Anchor semantics unchanged
 * - Pre-Anchor reversal does NOT create phantom balance movement
 * - Direct client UPDATE remains forbidden
 * - Stage 3 regression remains green
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
  console.error('ENVIRONMENT_FAILURE: Finance 4B tests are local-only.');
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

async function tableExists(tableName) {
  const { rows } = await queryDb(
    'select to_regclass($1) is not null as exists',
    [`public.${tableName}`],
  );
  return rows[0]?.exists === true;
}

async function applyMigrations() {
  if (await tableExists('finance_account_effects')) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return;
  }

  await applyMigration('supabase/migrations/20260813010000_finance_category_authority_v1_1.sql');
  await applyMigration('supabase/migrations/20260813020000_finance_expense_income_transactions_v1_1.sql');
  await applyMigration('supabase/migrations/20260814010000_finance_account_authority_v1_1.sql');
  await applyMigration('supabase/migrations/20260814020000_finance_balance_anchor_account_effects_v1_1.sql');
  await applyMigration('supabase/migrations/20260814080000_finance_account_effect_status_foundation_v1_1.sql');
  await new Promise((resolve) => setTimeout(resolve, 250));
}

function randomCredential(label) {
  return `Fin4B_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin4b-${label}-${suffix}@example.test`;
  const password = randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 4B QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 4B ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `fin4b-${crypto.randomBytes(8).toString('hex')}`,
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
  const hhA = await createHousehold('Fin 4B A', personA.id, [{ personId: personA.id, role: 'adult' }]);
  const hhB = await createHousehold('Fin 4B B', personA.id, [
    { personId: personA.id, role: 'adult' },
    { personId: personB.id, role: 'coordinator' },
  ]);
  const hhC = await createHousehold('Fin 4B C', personC.id, [{ personId: personC.id, role: 'adult' }]);
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

async function effectCount(accountId, transactionId = null) {
  const params = transactionId ? [accountId, transactionId] : [accountId];
  const where = transactionId ? 'where account_id = $1 and transaction_id = $2' : 'where account_id = $1';
  const { rows } = await queryDb(`select count(*)::int as count from public.finance_account_effects ${where}`, params);
  return rows[0].count;
}

async function effectStatus(accountId, transactionId) {
  const { rows } = await queryDb(
    'select effect_status from public.finance_account_effects where account_id = $1 and transaction_id = $2',
    [accountId, transactionId]
  );
  return rows[0]?.effect_status;
}

async function refreshed(ctx, accountId) {
  return (await getFinanceAccount(ctx, accountId)).account;
}

async function setEffectStatusViaInternal(accountId, transactionId, status) {
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, statement_timeout: 20000 });
  await client.connect();
  try {
    await client.query('begin');
    await client.query("select set_config('app.finance_account_effect_mutation', 'on', true)");
    await client.query(
      'select public.finance_account_effect_mutation($1, $2, $3)',
      [accountId, transactionId, status]
    );
    await client.query('commit');
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
}

async function testSchemaAndDefaults(actors) {
  console.log('\n=== SCHEMA AND DEFAULTS ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  // Verify column exists with correct constraint
  const columns = await queryDb(`
    select column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'public' and table_name = 'finance_account_effects' and column_name = 'effect_status'
  `);
  equal(columns.rows.length, 1, 'effect_status column exists');
  equal(columns.rows[0].data_type, 'text', 'effect_status is text');
  equal(columns.rows[0].is_nullable, 'NO', 'effect_status is NOT NULL');
  equal(columns.rows[0].column_default, "'ACTIVE'::text", 'effect_status defaults to ACTIVE');

  // Verify CHECK constraint
  const constraints = await queryDb(`
    select conname, pg_get_constraintdef(oid) as def
    from pg_constraint
    where conrelid = 'public.finance_account_effects'::regclass
      and contype = 'c'
      and conname = 'finance_account_effects_status_check'
  `);
  equal(constraints.rows.length, 1, 'effect_status CHECK constraint exists');
  assert(constraints.rows[0].def.includes("effect_status = ANY (ARRAY['ACTIVE'::text, 'REVERSED'::text])"), 'CHECK allows only ACTIVE/REVERSED');

  // Existing effects default to ACTIVE
  const anchor = await knownAccount(personalA, '100000', '2026-08-14', { name: 'Default ACTIVE' });
  const expense = await trackTransaction(await createExpense(personalA, { amount: '20000', currency: 'ARS', date: '2026-08-15', account: { id: anchor.id } }));
  const status = await effectStatus(anchor.id, expense.id);
  equal(status, 'ACTIVE', 'New effect defaults to ACTIVE');

  // Balance reflects ACTIVE effect
  equal((await refreshed(personalA, anchor.id)).currentBalance, '80000', 'ACTIVE effect counted in balance');
}

async function testCaseA_ActiveAfterAnchorReversed(actors) {
  console.log('\n=== CASE A: ACTIVE AFTER ANCHOR -> REVERSED ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const anchor = await knownAccount(personalA, '100000', '2026-08-14', { name: 'Case A' });
  const expense = await trackTransaction(await createExpense(personalA, { amount: '20000', currency: 'ARS', date: '2026-08-15', account: { id: anchor.id } }));
  equal((await refreshed(personalA, anchor.id)).currentBalance, '80000', 'Initial: ACTIVE expense after anchor -> 80000');

  // Reverse the effect via internal gated mutation
  await setEffectStatusViaInternal(anchor.id, expense.id, 'REVERSED');
  equal(await effectStatus(anchor.id, expense.id), 'REVERSED', 'Effect status changed to REVERSED');
  equal((await refreshed(personalA, anchor.id)).currentBalance, '100000', 'REVERSED effect excluded -> balance returns to 100000');
}

async function testCaseB_ReversedToActive(actors) {
  console.log('\n=== CASE B: REVERSED -> ACTIVE AFTER ANCHOR ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const anchor = await knownAccount(personalA, '100000', '2026-08-14', { name: 'Case B' });
  const expense = await trackTransaction(await createExpense(personalA, { amount: '20000', currency: 'ARS', date: '2026-08-15', account: { id: anchor.id } }));
  equal((await refreshed(personalA, anchor.id)).currentBalance, '80000', 'Initial ACTIVE expense -> 80000');

  await setEffectStatusViaInternal(anchor.id, expense.id, 'REVERSED');
  equal((await refreshed(personalA, anchor.id)).currentBalance, '100000', 'After REVERSED -> 100000');

  await setEffectStatusViaInternal(anchor.id, expense.id, 'ACTIVE');
  equal((await refreshed(personalA, anchor.id)).currentBalance, '80000', 'Reactivated to ACTIVE -> 80000');
}

async function testCaseC_EffectBeforeAnchor(actors) {
  console.log('\n=== CASE C: EFFECT BEFORE LATEST ANCHOR ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  // Create account with early expense, then later anchor
  const earlyAcc = await account(personalA, { name: 'Early expense' });
  const earlyExpense = await trackTransaction(await createExpense(personalA, { amount: '20000', currency: 'ARS', date: '2026-08-10', account: { id: earlyAcc.id } }));

  // Later add anchor at 100000 on 2026-08-14
  await createInitialBalanceAnchor(personalA, earlyAcc.id, { amount: '100000', effectiveDate: '2026-08-14' });
  equal((await refreshed(personalA, earlyAcc.id)).currentBalance, '100000', 'Anchor after early expense -> 100000 (pre-anchor effect excluded)');

  // Now reverse the pre-anchor effect - balance MUST remain 100000
  await setEffectStatusViaInternal(earlyAcc.id, earlyExpense.id, 'REVERSED');
  equal((await refreshed(personalA, earlyAcc.id)).currentBalance, '100000', 'Pre-anchor REVERSED -> balance still 100000 (no phantom movement)');

  // Reactivate - balance MUST remain 100000
  await setEffectStatusViaInternal(earlyAcc.id, earlyExpense.id, 'ACTIVE');
  equal((await refreshed(personalA, earlyAcc.id)).currentBalance, '100000', 'Pre-anchor ACTIVE again -> balance still 100000');
}

async function testCaseD_MultipleEffects(actors) {
  console.log('\n=== CASE D: MULTIPLE EFFECTS ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const anchor = await knownAccount(personalA, '100000', '2026-08-14', { name: 'Case D' });
  const expense = await trackTransaction(await createExpense(personalA, { amount: '20000', currency: 'ARS', date: '2026-08-15', account: { id: anchor.id } }));
  const income = await trackTransaction(await createIncome(personalA, { amount: '5000', currency: 'ARS', date: '2026-08-16', account: { id: anchor.id } }));
  const transferSrc = await trackTransaction(await createExpense(personalA, { amount: '10000', currency: 'ARS', date: '2026-08-17', account: { id: anchor.id } }));

  equal((await refreshed(personalA, anchor.id)).currentBalance, '75000', 'All ACTIVE: 100000 -20000 +5000 -10000 = 75000');

  // Reverse only expense
  await setEffectStatusViaInternal(anchor.id, expense.id, 'REVERSED');
  equal((await refreshed(personalA, anchor.id)).currentBalance, '95000', 'Expense REVERSED: 100000 +5000 -10000 = 95000');

  // Other effects remain untouched
  equal(await effectStatus(anchor.id, income.id), 'ACTIVE', 'Income still ACTIVE');
  equal(await effectStatus(anchor.id, transferSrc.id), 'ACTIVE', 'Transfer source still ACTIVE');
}

async function testCaseE_UnknownBalance(actors) {
  console.log('\n=== CASE E: UNKNOWN BALANCE ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const unknown = await account(personalA, { name: 'Unknown' });
  const expense = await trackTransaction(await createExpense(personalA, { amount: '20000', currency: 'ARS', date: '2026-08-15', account: { id: unknown.id } }));

  equal((await refreshed(personalA, unknown.id)).currentBalance, null, 'Account without anchor remains UNKNOWN (null)');
  equal(await effectStatus(unknown.id, expense.id), 'ACTIVE', 'Effect still ACTIVE but not counted without anchor');
}

async function testCaseF_CreditCard(actors) {
  console.log('\n=== CASE F: CREDIT CARD ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const card = await trackAccount(await createFinanceAccount(personalA, {
    name: 'Credit Card Case F',
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
    initialBalance: { amount: '0', effectiveDate: '2026-08-14' },
  }));
  equal(card.currentBalance, '0', 'CREDIT_CARD known zero anchor -> 0');

  // Insert transaction and effect directly via SQL since CREDIT_CARD expenses are blocked by service
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, statement_timeout: 20000 });
  await client.connect();
  let txId;
  try {
    await client.query('begin');
    // Insert transaction with both category_id and category_label_snapshot as null
    const txResult = await client.query(`
      insert into public.finance_transactions
      (transaction_type, amount, currency, financial_context_type, owner_person_id, household_id, transaction_date, description, notes, category_id, category_label_snapshot, created_by_person_id)
      values ('expense', '70000', 'ARS', 'personal', $1, null, '2026-08-15', 'Credit card expense', '', null, null, $1)
      returning id
    `, [actors.a.person.id]);
    txId = txResult.rows[0].id;
    fixture.transactionIds.push(txId);

    // Insert effect
    await client.query("select set_config('app.finance_account_effect_mutation', 'on', true)");
    await client.query(`
      insert into public.finance_account_effects
      (account_id, transaction_id, effect_type, effect_role, effect_amount, currency, transaction_date, transaction_created_at, financial_context_type, owner_person_id, household_id, created_by_person_id, effect_status)
      values ($1, $2, 'expense', 'PRIMARY', $3, 'ARS', '2026-08-15', (select created_at from public.finance_transactions where id = $2), 'personal', $4, null, $4, 'ACTIVE')
    `, [card.id, txId, '-70000', actors.a.person.id]);
    await client.query('commit');
  } finally {
    await client.end();
  }

  equal((await refreshed(personalA, card.id)).currentBalance, '-70000', 'Expense ACTIVE -> -70000');

  await setEffectStatusViaInternal(card.id, txId, 'REVERSED');
  equal((await refreshed(personalA, card.id)).currentBalance, '0', 'REVERSED -> 0');

  await setEffectStatusViaInternal(card.id, txId, 'ACTIVE');
  equal((await refreshed(personalA, card.id)).currentBalance, '-70000', 'Reactivated -> -70000');
}

async function testSecurityDirectUpdateBlocked(actors) {
  console.log('\n=== SECURITY: DIRECT CLIENT UPDATE BLOCKED ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const anchor = await knownAccount(personalA, '100000', '2026-08-14', { name: 'Security' });
  const expense = await trackTransaction(await createExpense(personalA, { amount: '20000', currency: 'ARS', date: '2026-08-15', account: { id: anchor.id } }));

  // Try direct UPDATE via anon client - should be blocked by RLS policy (0 rows affected)
  const { data: updateData, error: updateError } = await actors.a.client
    .from('finance_account_effects')
    .update({ effect_status: 'REVERSED' })
    .eq('account_id', anchor.id)
    .eq('transaction_id', expense.id)
    .select();

  // Supabase JS returns {data: [], error: null} when RLS blocks by making 0 rows visible
  // The key assertion is that the effect_status remains unchanged
  equal(updateData?.length ?? 0, 0, 'Direct client UPDATE affects 0 rows (blocked by RLS)');

  // Effect should still be ACTIVE
  equal(await effectStatus(anchor.id, expense.id), 'ACTIVE', 'Effect remains ACTIVE after blocked UPDATE attempt');

  // Try DELETE - should also be blocked (0 rows affected)
  const { data: deleteData, error: deleteError } = await actors.a.client
    .from('finance_account_effects')
    .delete()
    .eq('account_id', anchor.id)
    .eq('transaction_id', expense.id)
    .select();

  equal(deleteData?.length ?? 0, 0, 'Direct client DELETE affects 0 rows (blocked by RLS)');
  
  // Effect should still exist and be ACTIVE
  equal(await effectStatus(anchor.id, expense.id), 'ACTIVE', 'Effect still exists and is ACTIVE after blocked DELETE attempt');
}

async function testInternalMutationWorks(actors) {
  console.log('\n=== INTERNAL MUTATION WORKS (for testing) ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const anchor = await knownAccount(personalA, '100000', '2026-08-14', { name: 'Internal Mutation' });
  const expense = await trackTransaction(await createExpense(personalA, { amount: '20000', currency: 'ARS', date: '2026-08-15', account: { id: anchor.id } }));

  // Internal gated mutation should work
  await setEffectStatusViaInternal(anchor.id, expense.id, 'REVERSED');
  equal(await effectStatus(anchor.id, expense.id), 'REVERSED', 'Internal mutation works');
  equal((await refreshed(personalA, anchor.id)).currentBalance, '100000', 'Balance updated via internal mutation');

  await setEffectStatusViaInternal(anchor.id, expense.id, 'ACTIVE');
  equal(await effectStatus(anchor.id, expense.id), 'ACTIVE', 'Internal mutation reactivates');
  equal((await refreshed(personalA, anchor.id)).currentBalance, '80000', 'Balance updated again');
}

async function testAnchorSemanticsUnchanged(actors) {
  console.log('\n=== ANCHOR SEMANTICS UNCHANGED (regression) ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  // Same-day created_at boundary
  const sameDayAcc = await account(personalA, { name: 'Same day boundary' });
  await trackTransaction(await createExpense(personalA, { amount: '50', currency: 'ARS', date: '2026-08-20', account: { id: sameDayAcc.id } }));
  await createInitialBalanceAnchor(personalA, sameDayAcc.id, { amount: '100', effectiveDate: '2026-08-20' });
  equal((await refreshed(personalA, sameDayAcc.id)).currentBalance, '100', 'Same-day pre-anchor effect excluded (created_at rule)');

  const sameDayAfter = await knownAccount(personalA, '100', '2026-08-21', { name: 'Same day after' });
  await trackTransaction(await createExpense(personalA, { amount: '10', currency: 'ARS', date: '2026-08-21', account: { id: sameDayAfter.id } }));
  equal((await refreshed(personalA, sameDayAfter.id)).currentBalance, '90', 'Same-day post-anchor effect included');

  // Pre-anchor historical effect
  const histAcc = await knownAccount(personalA, '1000', '2026-08-14', { name: 'Historical' });
  await trackTransaction(await createExpense(personalA, { amount: '100', currency: 'ARS', date: '2026-08-13', account: { id: histAcc.id } }));
  equal((await refreshed(personalA, histAcc.id)).currentBalance, '1000', 'Pre-anchor historical expense excluded');

  // Multiple anchors - latest wins (only one INITIAL allowed per account)
  const multiAcc = await knownAccount(personalA, '500', '2026-08-10', { name: 'Multi anchor' });
  await trackTransaction(await createExpense(personalA, { amount: '100', currency: 'ARS', date: '2026-08-12', account: { id: multiAcc.id } }));
  // Cannot create second INITIAL anchor due to unique constraint - verify first anchor used
  equal((await refreshed(personalA, multiAcc.id)).currentBalance, '400', 'First anchor used: 500 - 100 = 400');
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
      '20260815030000_finance_transaction_trash_mutation_v1_1.sql',
      '20260819000000_finance_transaction_restore_mutation_v1_1.sql',
      '20260819010000_finance_transfer_regression_repair_v1_1.sql',
      '20260819020000_finance_transaction_correction_v1_1.sql',
      '20260824083947_finance_refund_persistence_root_transaction_id_v1_1.sql',
      '20260824093347_finance_refund_events_persistence_v1_1.sql',
      '20260824103000_finance_refund_end_to_end_v1_1.sql',
      '20260824120000_finance_balance_correction_idempotency_v1_1.sql',
    ]),
    'exact Finance migration allow-list includes current Stage 4 migrations',
  );
  const runJs = fs.readFileSync(path.join(root, 'tests/run.js'), 'utf8');
  assert(runJs.includes('finance-4b-effect-status') && runJs.includes("'finance-4b'"), 'node tests/run.js finance-4b registered');
  assert(runJs.includes('finance-4b-effect-status') && /finance:\s*\[[\s\S]*finance-4b-effect-status/.test(runJs), 'aggregate Finance suite includes 4B');
}

async function assertFixtureCleanup() {
  const people = await queryDb("select count(*)::int as count from public.people where display_name like 'Fin 4B %'");
  const households = await queryDb("select count(*)::int as count from public.households where slug like 'fin4b-%'");
  const accounts = fixture.accountIds.length
    ? await queryDb('select count(*)::int as count from public.finance_accounts where id = any($1::uuid[])', [fixture.accountIds])
    : { rows: [{ count: 0 }] };
  equal(people.rows[0].count, 0, 'fixture cleanup leaves no 4B people');
  equal(households.rows[0].count, 0, 'fixture cleanup leaves no 4B households');
  equal(accounts.rows[0].count, 0, 'fixture cleanup leaves no 4B account rows');
}

async function main() {
  console.log('FINANCE_4B_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigrations();
  const actors = await setupActors();

  try {
    await testSchemaAndDefaults(actors);
    await testCaseA_ActiveAfterAnchorReversed(actors);
    await testCaseB_ReversedToActive(actors);
    await testCaseC_EffectBeforeAnchor(actors);
    await testCaseD_MultipleEffects(actors);
    await testCaseE_UnknownBalance(actors);
    await testCaseF_CreditCard(actors);
    await testSecurityDirectUpdateBlocked(actors);
    await testInternalMutationWorks(actors);
    await testAnchorSemanticsUnchanged(actors);
    await testStaticContracts();
  } finally {
    await cleanup();
  }

  await assertFixtureCleanup();

  console.log(`\nFINANCE_4B_EFFECT_STATUS_FOUNDATION_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_4B_ACCOUNT_EFFECT_STATUS_FOUNDATION_BLOCKED');
  } else {
    console.log('FINANCE_STAGE_4B_ACCOUNT_EFFECT_STATUS_FOUNDATION_PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_4B_ACCOUNT_EFFECT_STATUS_FOUNDATION=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
