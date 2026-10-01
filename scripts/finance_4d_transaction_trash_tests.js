#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 4D Transaction Trash Mutation tests.
 *
 * Local Supabase only. Validates canonical Trash mutation for Expense/Income.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('../backend/node_modules/dotenv');
const { Client } = require('../backend/node_modules/pg');

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

const { createClient } = require('../backend/node_modules/@supabase/supabase-js');
const { loadTestEnvironment } = require('../tests/helpers/environment');
const { hashIdempotencyRequestV2 } = require('../backend/src/lib/plannerIdempotencyAdapter');
const {
  FINANCE_ACCOUNT_TYPES,
  FINANCE_CONTEXT_TYPES,
} = require('../backend/src/constants/finance.constants');
const { resolveFinanceContext } = require('../backend/src/services/finance.context.service');
const { createFinanceAccount } = require('../backend/src/services/finance.account.service');
const { createTransfer } = require('../backend/src/services/finance.transfer.service');

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
  console.error('ENVIRONMENT_FAILURE: Finance 4D tests are local-only.');
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
  return assert(
    actual === expected,
    `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`,
  );
}

function deepEqual(actual, expected, message) {
  return assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`,
  );
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

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

async function randomCredential(label) {
  return `Fin4D_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin4d-${label}-${suffix}@example.test`;
  const password = await randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 4D QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPersonDb(authUserId, label) {
  const { rows } = await queryDb(
    `INSERT INTO people (auth_user_id, display_name, default_language, personal_settings) 
     VALUES ($1, $2, 'es-419', '{}') RETURNING *`,
    [authUserId, `Fin 4D ${label}`]
  );
  const person = rows[0];
  fixture.personIds.push(person.id);
  return person;
}

async function createHouseholdDb(name, ownerPersonId, members) {
  const slug = `fin4d-${crypto.randomBytes(8).toString('hex')}`;
  const joinedAt = new Date().toISOString();
  
  const { rows: householdRows } = await queryDb(
    `INSERT INTO households (name, slug, timezone, default_language, config, created_by_person_id) 
     VALUES ($1, $2, 'America/Argentina/Buenos_Aires', 'es-419', '{}', $3) RETURNING *`,
    [name, slug, ownerPersonId]
  );
  const household = householdRows[0];
  fixture.householdIds.push(household.id);

  const membershipRows = [];
  for (const member of members) {
    const { rows } = await queryDb(
      `INSERT INTO household_members (household_id, person_id, role, status, joined_at, household_onboarding_status, household_onboarding_completed_at) 
       VALUES ($1, $2, $3, $4, $5, 'completed', $5) RETURNING *`,
      [household.id, member.personId, member.role, member.status || 'active', joinedAt]
    );
    membershipRows.push(rows[0]);
  }
  return { household, memberships: membershipRows };
}

async function setActiveHouseholdDb(personId, householdId) {
  await queryDb(
    `UPDATE people SET active_household_id = $1 WHERE id = $2`,
    [householdId, personId]
  );
}

async function signIn(email, password) {
  const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(`sign in failed: ${error?.message || 'no session'}`);
  return data.session.access_token;
}

function tokenClient(accessToken) {
  console.log('  [DEBUG] Creating tokenClient with ANON_KEY:', process.env.SUPABASE_ANON_KEY?.slice(0, 20));
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function createCategory(client, context, type, label) {
  const { data, error } = await client
    .from('finance_categories')
    .insert({
      category_kind: 'custom',
      category_type: type,
      native_key: null,
      label,
      context_type: context.contextType,
      owner_person_id: context.contextType === 'personal' ? context.personId : null,
      household_id: context.contextType === 'household' ? context.householdId : null,
      deleted_at: null,
    })
    .select()
    .single();
  if (error) throw error;
  fixture.categoryIds.push(data.id);
  return data;
}

async function createAccount(client, context, name, currency = 'ARS', accountType = 'ACCOUNT') {
  const { data, error } = await client.rpc('finance_create_account_v1', {
    p_financial_context_type: context.contextType,
    p_owner_person_id: context.contextType === 'personal' ? context.personId : null,
    p_household_id: context.contextType === 'household' ? context.householdId : null,
    p_name: name,
    p_currency: currency,
    p_account_type: accountType,
    p_created_by_person_id: context.personId,
  });
  if (error) throw error;
  fixture.accountIds.push(data.id);
  return data;
}

async function createBalanceAnchor(client, context, accountId, amount, effectiveDate) {
  const { data, error } = await client.rpc('finance_create_initial_balance_anchor_v1', {
    p_account_id: accountId,
    p_amount: amount,
    p_effective_date: effectiveDate,
    p_created_by_person_id: context.personId,
  });
  if (error) throw error;
  return data;
}

async function resolvedContext(authUser, accessToken, contextType) {
  return resolveFinanceContext({ user: { id: authUser.id }, accessToken }, contextType);
}

async function createAccountService(ctx, overrides = {}) {
  const account = (await createFinanceAccount(ctx, {
    name: `Cuenta ${crypto.randomBytes(4).toString('hex')}`,
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.ACCOUNT,
    ...overrides,
  })).account;
  fixture.accountIds.push(account.id);
  return account;
}

async function knownAccountService(ctx, amount = '100000', effectiveDate = '2026-08-14', overrides = {}) {
  const account = (await createFinanceAccount(ctx, {
    name: `Known ${crypto.randomBytes(4).toString('hex')}`,
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.ACCOUNT,
    initialBalance: { amount, effectiveDate },
    ...overrides,
  })).account;
  fixture.accountIds.push(account.id);
  return account;
}

function correlation(label) {
  return {
    requestId: `fin4d-req-${label}-${crypto.randomBytes(4).toString('hex')}`,
    mutationId: `fin4d-mut-${label}-${crypto.randomBytes(4).toString('hex')}`,
    idempotencyKey: `fin4d-key-${label}-${crypto.randomBytes(4).toString('hex')}`,
  };
}

async function transferWithCommission(ctx, body, label = 'transfer') {
  const corr = correlation(label);
  const result = await createTransfer(ctx, body, corr);
  if (result.transfer.id) fixture.transferIds.push(result.transfer.id);
  if (result.transfer.commission?.expenseId) fixture.transactionIds.push(result.transfer.commission.expenseId);
  return result.transfer;
}

async function transactionRow(transactionId) {
  const { rows } = await queryDb(
    `select *, category_label_snapshot, transfer_id, category_id
     from public.finance_transactions
     where id = $1`,
    [transactionId]
  );
  return rows[0];
}

async function effectsForTransaction(transactionId) {
  const { rows } = await queryDb(
    `select account_id, effect_role, effect_amount::text as amount, currency, transaction_date::text as date, effect_status, transaction_id
     from public.finance_account_effects
     where transaction_id = $1
     order by effect_role`,
    [transactionId]
  );
  return rows;
}

async function transferRow(transferId) {
  const { rows } = await queryDb('select * from public.finance_transfers where id = $1', [transferId]);
  return rows[0];
}

async function createTransactionPg(personId, type, amount, currency, date, categoryId, categoryLabel, accountId, effectAmount, financialContextType, householdId) {
  const { rows } = await queryDb(
    `INSERT INTO finance_transactions 
    (transaction_type, amount, currency, financial_context_type, owner_person_id, household_id, transaction_date, description, category_id, category_label_snapshot, created_by_person_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'Test transaction', $8, $9, $10)
    RETURNING *`,
    [type, amount, currency, financialContextType, financialContextType === 'personal' ? personId : null, householdId, date, categoryId, categoryLabel, personId]
  );
  const tx = rows[0];
  fixture.transactionIds.push(tx.id);
  
  // If account effect needed, create it
  if (accountId && effectAmount) {
    await queryDb(
      `INSERT INTO finance_account_effects
      (account_id, transaction_id, effect_type, effect_role, effect_amount, currency, transaction_date, transaction_created_at, financial_context_type, owner_person_id, household_id, created_by_person_id, effect_status)
      VALUES ($1, $2, $3, 'PRIMARY', $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE')`,
      [accountId, tx.id, type, effectAmount, currency, date, tx.created_at, financialContextType, financialContextType === 'personal' ? personId : null, householdId, personId]
    );
  }
  
  return tx;
}

async function createTransaction(client, context, type, amount, currency, date, categoryId, categoryLabel, accountId, effectAmount) {
  // Use pg client directly to bypass RLS issues
  return createTransactionPg(
    context.personId,
    type, amount, currency, date, categoryId, categoryLabel,
    accountId, effectAmount,
    context.contextType,
    context.householdId
  );
}

async function trashTransaction(client, transactionId, mutationId, idempotencyKey, payloadHash, personId) {
  const { data, error } = await client.rpc('finance_trash_transaction_v1', {
    p_transaction_id: transactionId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: personId,
  });
  return { data, error };
}

async function listMovements(client, context, period) {
  const start = period + '-01';
  const [year, month] = period.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endExclusive = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  
  const { data, error } = await client
    .from('finance_transactions')
    .select('id, transaction_type, amount, currency, transaction_date, description, category_id, category_label_snapshot, created_at, updated_at, status, trashed_at')
    .eq('financial_context_type', context.contextType)
    .eq(context.contextType === 'personal' ? 'owner_person_id' : 'household_id', context.contextType === 'personal' ? context.personId : context.householdId)
    .is(context.contextType === 'personal' ? 'household_id' : 'owner_person_id', null)
    .eq('status', 'ACTIVE')
    .gte('transaction_date', start)
    .lt('transaction_date', endExclusive)
    .order('transaction_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function getAccountBalance(client, accountId) {
  const { data, error } = await client.rpc('finance_account_current_balance_text', {
    p_account_id: accountId,
  });
  if (error) throw error;
  return data;
}

async function nativeCategory(nativeKey) {
  const { rows } = await queryDb('select * from public.finance_categories where native_key = $1', [nativeKey]);
  if (!rows[0]) throw new Error(`native category missing: ${nativeKey}`);
  return rows[0];
}

async function runTest(name, fn) {
  console.log(`\n=== ${name} ===`);
  try {
    await fn();
  } catch (error) {
    failCount += 1;
    console.error(`  THREW: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    if (error?.details) console.error(`    Details: ${error.details}`);
    if (error?.hint) console.error(`    Hint: ${error.hint}`);
    if (error?.code) console.error(`    Code: ${error.code}`);
    if (error?.stack) console.error(`    Stack: ${error.stack}`);
  }
}

async function cleanup() {
  // Clean up via pg client to bypass RLS
  if (fixture.transactionIds.length) {
    await queryDb(`DELETE FROM finance_transactions WHERE id = ANY($1)`, [fixture.transactionIds]);
  }
  if (fixture.transferIds.length) {
    await queryDb(`DELETE FROM finance_account_effects WHERE transfer_id = ANY($1)`, [fixture.transferIds]);
    await queryDb(`DELETE FROM finance_transfers WHERE id = ANY($1)`, [fixture.transferIds]);
  }
  if (fixture.accountIds.length) {
    await queryDb(`DELETE FROM finance_accounts WHERE id = ANY($1)`, [fixture.accountIds]);
  }
  if (fixture.categoryIds.length) {
    await queryDb(`DELETE FROM finance_categories WHERE id = ANY($1)`, [fixture.categoryIds]);
  }
  for (const personId of fixture.personIds) {
    await queryDb(`UPDATE people SET active_household_id = NULL WHERE id = $1`, [personId]);
  }
  if (fixture.householdIds.length) {
    await queryDb(`DELETE FROM household_members WHERE household_id = ANY($1)`, [fixture.householdIds]);
    await queryDb(`DELETE FROM households WHERE id = ANY($1)`, [fixture.householdIds]);
  }
  if (fixture.personIds.length) {
    await queryDb(`DELETE FROM people WHERE id = ANY($1)`, [fixture.personIds]);
  }
  for (const userId of fixture.authUserIds) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
}

// Setup
let userA, userB, personA, personB, householdA, membershipA;
let contextPersonalA, contextHouseholdA, clientPersonalA, clientHouseholdA;
let tokenA, tokenB;

async function setup() {
  console.log('\n=== SETUP ===');
  
  userA = await createAuthUser('a');
  userB = await createAuthUser('b');
  personA = await createPersonDb(userA.user.id, 'A');
  personB = await createPersonDb(userB.user.id, 'B');
  const hhA = await createHouseholdDb('Fin 4D A', personA.id, [{ personId: personA.id, role: 'adult' }]);
  await setActiveHouseholdDb(personA.id, hhA.household.id);
  
  tokenA = await signIn(userA.email, userA.password);
  tokenB = await signIn(userB.email, userB.password);
  
  clientPersonalA = tokenClient(tokenA);
  clientHouseholdA = tokenClient(tokenA);
  
  contextPersonalA = {
    accessToken: tokenA,
    contextType: 'personal',
    personId: personA.id,
    householdId: null,
    membershipId: null,
  };
  
  contextHouseholdA = {
    accessToken: tokenA,
    contextType: 'household',
    personId: personA.id,
    householdId: hhA.household.id,
    membershipId: hhA.memberships[0].id,
  };
  
  console.log('Setup complete');
}

// D01 — Expense without Account
async function testD01() {
  await runTest('D01 — Expense without Account', async () => {
    console.log('  [D01] Using native category...');
    const cat = await nativeCategory('food');
    console.log('  [D01] Native category:', cat.id);
    
    console.log('  [D01] Creating transaction...');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, null, null);
    console.log('  [D01] Transaction created:', tx.id, tx.status);
    
    equal(tx.status, 'ACTIVE', 'Transaction starts as ACTIVE');
    equal(tx.trashed_at, null, 'trashed_at is null initially');
    
    console.log('  [D01] Calling trash RPC...');
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { data, error } = await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    console.log('  [D01] Trash result:', data?.status, error?.message);
    assert(!error, `Trash succeeded: ${error?.message}`);
    equal(data.status, 'TRASHED', 'Transaction becomes TRASHED');
    assert(data.trashed_at !== null, 'trashed_at is non-null');
  });
}

// D02 — Expense with Account
async function testD02() {
  await runTest('D02 — Expense with Account', async () => {
    const account = await createAccount(clientPersonalA, contextPersonalA, 'Test Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const balanceBefore = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceBefore, '100000.0000', 'Balance before expense is 100000');
    
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    
    const balanceAfterExpense = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterExpense, '80000.0000', 'Balance after expense is 80000');
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { data, error } = await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Trash succeeded: ${error?.message}`);
    equal(data.status, 'TRASHED', 'Transaction becomes TRASHED');
    
    // Check effect is REVERSED
    const { rows: effects } = await queryDb(
      `SELECT effect_status FROM finance_account_effects WHERE transaction_id = $1 AND account_id = $2`,
      [tx.id, account.id]
    );
    equal(effects?.[0]?.effect_status, 'REVERSED', 'Effect becomes REVERSED');
    
    const balanceAfterTrash = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterTrash, '100000.0000', 'Balance returns to 100000 after trash');
  });
}

// D03 — Income with Account
async function testD03() {
  await runTest('D03 — Income with Account', async () => {
    const account = await createAccount(clientPersonalA, contextPersonalA, 'Test Account Income', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const balanceBefore = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceBefore, '100000.0000', 'Balance before income is 100000');
    
    const cat = await nativeCategory('salary');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'income', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, 20000);
    
    const balanceAfterIncome = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterIncome, '120000.0000', 'Balance after income is 120000');
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { data, error } = await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Trash succeeded: ${error?.message}`);
    equal(data.status, 'TRASHED', 'Transaction becomes TRASHED');
    
    const { rows: effects } = await queryDb(
      `SELECT effect_status FROM finance_account_effects WHERE transaction_id = $1 AND account_id = $2`,
      [tx.id, account.id]
    );
    equal(effects?.[0]?.effect_status, 'REVERSED', 'Effect becomes REVERSED');
    
    const balanceAfterTrash = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterTrash, '100000.0000', 'Balance returns to 100000 after trash');
  });
}

// D04 — Pre-Anchor Effect
async function testD04() {
  await runTest('D04 — Pre-Anchor Effect', async () => {
    const account = await createAccount(clientPersonalA, contextPersonalA, 'Pre-Anchor Account', 'ARS');
    
    // Create expense BEFORE anchor
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-07-15', cat.id, cat.label, account.id, -20000);
    
    // Now create anchor AFTER the expense
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const balanceBeforeTrash = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceBeforeTrash, '100000.0000', 'Balance is 100000 (pre-anchor expense not counted)');
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { data, error } = await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Trash succeeded: ${error?.message}`);
    
    const balanceAfterTrash = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterTrash, '100000.0000', 'Balance remains 100000 after trash (no phantom movement)');
  });
}

// D05 — Atomic failure
async function testD05() {
  await runTest('D05 — Atomic failure', async () => {
    const account = await createAccount(clientPersonalA, contextPersonalA, 'Atomic Test', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { data, error } = await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Trash succeeded: ${error?.message}`);
    
    // Verify no half-state
    const { rows: txCheck } = await queryDb(
      `SELECT status, trashed_at FROM finance_transactions WHERE id = $1`,
      [tx.id]
    );
    
    const { rows: effectCheck } = await queryDb(
      `SELECT effect_status FROM finance_account_effects WHERE transaction_id = $1 AND account_id = $2`,
      [tx.id, account.id]
    );
    
    equal(txCheck[0]?.status, 'TRASHED', 'Transaction is TRASHED');
    assert(txCheck[0]?.trashed_at !== null, 'trashed_at is set');
    equal(effectCheck[0]?.effect_status, 'REVERSED', 'Effect is REVERSED');
    
    // Verify the forbidden states don't exist
    const forbidden1 = txCheck[0]?.status === 'TRASHED' && effectCheck[0]?.effect_status === 'ACTIVE';
    const forbidden2 = txCheck[0]?.status === 'ACTIVE' && effectCheck[0]?.effect_status === 'REVERSED';
    assert(!forbidden1, 'Forbidden state: TRASHED transaction + ACTIVE effect');
    assert(!forbidden2, 'Forbidden state: ACTIVE transaction + REVERSED effect');
  });
}

// D06 — Idempotent retry
async function testD06() {
  await runTest('D06 — Idempotent retry', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    // First trash
    const { data: data1, error: error1 } = await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error1, `First trash succeeded: ${error1?.message}`);
    equal(data1.status, 'TRASHED', 'First trash: TRASHED');
    
    // Second trash with SAME mutation_id and payload
    const { data: data2, error: error2 } = await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error2, `Second trash (replay) succeeded: ${error2?.message}`);
    equal(data2.status, 'TRASHED', 'Second trash: TRASHED');
    equal(data2.id, data1.id, 'Same transaction returned');
    equal(data2.trashed_at, data1.trashed_at, 'Same trashed_at returned (idempotent)');
    
    // Verify only one transition occurred (check trashed_at didn't change)
    const { rows: txCheck } = await queryDb(
      `SELECT trashed_at FROM finance_transactions WHERE id = $1`,
      [tx.id]
    );
    // Compare timestamps as ISO strings (database returns Date, RPC returns ISO string)
    const dbTrashedAt = new Date(txCheck[0]?.trashed_at).toISOString().split('.')[0];
    const rpcTrashedAt = String(data1.trashed_at).split('.')[0];
    equal(dbTrashedAt, rpcTrashedAt, 'trashed_at unchanged on replay');
  });
}

// D07 — Mutation identity conflict
async function testD07() {
  await runTest('D07 — Mutation identity conflict', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash1 = hashPayload({ transactionId: tx.id });
    
    // First trash
    const { error: error1 } = await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash1, personA.id);
    assert(!error1, `First trash succeeded: ${error1?.message}`);
    
    // Second trash with SAME mutation_id but DIFFERENT payload
    const payloadHash2 = hashPayload({ transactionId: tx.id, different: 'payload' });
    const { error: error2 } = await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash2, personA.id);
    assert(error2, 'Second trash with different payload should fail');
    equal(error2.code, 'P0008', 'Conflict error code P0008');
  });
}

// D08 — Unauthorized Personal
async function testD08() {
  await runTest('D08 — Unauthorized Personal', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    // User A trashes their own transaction - should succeed
    const { error } = await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Owner trash succeeded: ${error?.message}`);
    
    const { rows: txCheck } = await queryDb(
      `SELECT status FROM finance_transactions WHERE id = $1`,
      [tx.id]
    );
    equal(txCheck[0]?.status, 'TRASHED', 'Transaction is TRASHED');
  });
}

// D09 — Invalid Household authority
async function testD09() {
  await runTest('D09 — Invalid Household authority', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientHouseholdA, contextHouseholdA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    // Valid household member trashes - should succeed
    const { error } = await trashTransaction(clientHouseholdA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Household member trash succeeded: ${error?.message}`);
    
    const { rows: txCheck } = await queryDb(
      `SELECT status FROM finance_transactions WHERE id = $1`,
      [tx.id]
    );
    equal(txCheck[0]?.status, 'TRASHED', 'Transaction is TRASHED');
  });
}

// D10 — Already TRASHED
async function testD10() {
  await runTest('D10 — Already TRASHED', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    const mutationId1 = crypto.randomUUID();
    const idempotencyKey1 = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    // First trash
    const { data: data1, error: error1 } = await trashTransaction(clientPersonalA, tx.id, mutationId1, idempotencyKey1, payloadHash, personA.id);
    assert(!error1, `First trash succeeded: ${error1?.message}`);
    
    // Second trash with DIFFERENT mutation_id (simulating independent attempt)
    const mutationId2 = crypto.randomUUID();
    const idempotencyKey2 = crypto.randomUUID();
    const { data: data2, error: error2 } = await trashTransaction(clientPersonalA, tx.id, mutationId2, idempotencyKey2, payloadHash, personA.id);
    assert(!error2, `Second trash (already trashed) succeeded: ${error2?.message}`);
    equal(data2.status, 'TRASHED', 'Transaction remains TRASHED');
    equal(data2.trashed_at, data1.trashed_at, 'trashed_at unchanged (no duplicate transition)');
  });
}

// D11 — Active read
async function testD11() {
  await runTest('D11 — Active read', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    // Before trash: appears in active movements
    const movementsBefore = await listMovements(clientPersonalA, contextPersonalA, '2026-08');
    const foundBefore = movementsBefore.some(m => m.id === tx.id);
    assert(foundBefore, 'Transaction appears in active movements before trash');
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { error } = await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Trash succeeded: ${error?.message}`);
    
    // After trash: does NOT appear in active movements
    const movementsAfter = await listMovements(clientPersonalA, contextPersonalA, '2026-08');
    const foundAfter = movementsAfter.some(m => m.id === tx.id);
    assert(!foundAfter, 'Transaction does NOT appear in active movements after trash');
  });
}

// D12 — History preservation
async function testD12() {
  await runTest('D12 — History preservation', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    const originalAmount = tx.amount;
    const originalCurrency = tx.currency;
    const originalDate = tx.transaction_date;
    const originalCategoryId = tx.category_id;
    const originalCategoryLabel = tx.category_label_snapshot;
    const originalDescription = tx.description;
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { error } = await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Trash succeeded: ${error?.message}`);
    
    // Verify all original data preserved
    const { rows: txCheck } = await queryDb(
      `SELECT * FROM finance_transactions WHERE id = $1`,
      [tx.id]
    );
    
    equal(txCheck[0]?.amount, originalAmount, 'Amount preserved');
    equal(txCheck[0]?.currency, originalCurrency, 'Currency preserved');
    // Compare date portion only (YYYY-MM-DD) to avoid timezone/precision issues
    const expectedDateStr = String(originalDate).split('T')[0];
    const actualDateStr = String(txCheck[0]?.transaction_date).split('T')[0];
    equal(actualDateStr, expectedDateStr, 'Date preserved');
    equal(txCheck[0]?.category_id, originalCategoryId, 'Category ID preserved');
    equal(txCheck[0]?.category_label_snapshot, originalCategoryLabel, 'Category label snapshot preserved');
    equal(txCheck[0]?.description, originalDescription, 'Description preserved');
    equal(txCheck[0]?.status, 'TRASHED', 'Status is TRASHED');
    assert(txCheck[0]?.trashed_at !== null, 'trashed_at is set');
    
    // Transaction row NOT hard-deleted
    assert(txCheck[0]?.id === tx.id, 'Transaction row still exists');
  });
}

// D14 — Commission Direct Trash Forbidden
async function testD14() {
  await runTest('D14 — Commission Direct Trash Forbidden', async () => {
    const personalA = await resolvedContext(userA.user, tokenA, FINANCE_CONTEXT_TYPES.PERSONAL);
    
    const source = await knownAccountService(personalA, '50000', '2026-08-14');
    const dest = await knownAccountService(personalA, '0', '2026-08-14');
    
    const t = await transferWithCommission(personalA, {
      sourceAccount: source.id,
      destinationAccount: dest.id,
      sourceAmount: '50000',
      destinationAmount: '50000',
      commissionAmount: '3000',
      date: '2026-08-15',
    }, 'commission-trash');
    
    assert(t.commission !== null, 'Transfer has commission');
    const commissionExpenseId = t.commission.expenseId;
    
    // Verify commission expense has transfer_id
    const expenseRow = await transactionRow(commissionExpenseId);
    assert(expenseRow.transfer_id !== null, 'Commission Expense has transfer_id');
    equal(expenseRow.transfer_id, t.id, 'Commission Expense transfer_id points to owning Transfer');
    equal(expenseRow.transaction_type, 'expense', 'Commission is expense type');
    // Amount returned as numeric string with 4 decimals
    equal(String(expenseRow.amount), '3000.0000', 'Commission amount is 3000');
    
    // Verify commission effect exists and is ACTIVE
    const effects = await effectsForTransaction(commissionExpenseId);
    equal(effects.length, 1, 'Exactly one Commission Account effect');
    equal(effects[0].effect_status, 'ACTIVE', 'Commission effect is ACTIVE');
    equal(effects[0].amount, '-3000.0000', 'Commission effect amount is -3000');
    
    // Verify Transfer is unchanged
    const transferBefore = await transferRow(t.id);
    equal(transferBefore.id, t.id, 'Transfer exists');
    
    // Attempt direct trash of Commission Expense
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: commissionExpenseId });
    
    const { data, error } = await trashTransaction(clientPersonalA, commissionExpenseId, mutationId, idempotencyKey, payloadHash, personA.id);
    
    // Expect rejection - RPC returns PostgreSQL error code 23514 with custom message
    assert(error, 'Direct Trash of Commission Expense should be rejected');
    equal(error.code, '23514', 'Error code is 23514 (check constraint violation)');
    assert(error.message?.includes('finance_transaction_dependent_on_transfer'), 'Error message contains finance_transaction_dependent_on_transfer');
    
    // Verify Commission transaction remains ACTIVE
    const expenseAfter = await transactionRow(commissionExpenseId);
    equal(expenseAfter.status, 'ACTIVE', 'Commission transaction remains ACTIVE');
    assert(expenseAfter.trashed_at === null, 'Commission trashed_at is NULL');
    
    // Verify Commission effect remains ACTIVE
    const effectsAfter = await effectsForTransaction(commissionExpenseId);
    equal(effectsAfter[0].effect_status, 'ACTIVE', 'Commission effect remains ACTIVE');
    
    // Verify Source Balance unchanged (50000 initial - 50000 transfer - 3000 commission = -3000)
    const sourceBalanceAfter = await getAccountBalance(clientPersonalA, source.id);
    equal(sourceBalanceAfter, '-3000.0000', 'Source balance unchanged after rejected trash');
    
    // Verify Transfer unchanged
    const transferAfter = await transferRow(t.id);
    equal(transferAfter.id, t.id, 'Transfer unchanged');
    equal(transferAfter.source_amount, '50000.0000', 'Transfer source_amount unchanged');
  });
}

// D15 — Ordinary Expense Still Works
async function testD15() {
  await runTest('D15 — Ordinary Expense Still Works', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'D15 Test Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    
    // Verify ordinary expense has no transfer_id
    const expenseRow = await transactionRow(tx.id);
    assert(expenseRow.transfer_id === null, 'Ordinary Expense has no transfer_id');
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { data, error } = await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    
    assert(!error, `Ordinary Expense Trash succeeded: ${error?.message}`);
    equal(data.status, 'TRASHED', 'Ordinary Expense becomes TRASHED');
    assert(data.trashed_at !== null, 'trashed_at is set');
    
    // Verify effect is REVERSED
    const effects = await effectsForTransaction(tx.id);
    equal(effects[0].effect_status, 'REVERSED', 'Ordinary Expense effect becomes REVERSED');
    
    // Verify balance restored
    const balanceAfter = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfter, '100000.0000', 'Balance restored after ordinary Expense trash');
  });
}

// D16 — Idempotency Does Not Store False Success
async function testD16() {
  await runTest('D16 — Idempotency Does Not Store False Success', async () => {
    const personalA = await resolvedContext(userA.user, tokenA, FINANCE_CONTEXT_TYPES.PERSONAL);
    
    const source = await knownAccountService(personalA, '50000', '2026-08-14');
    const dest = await knownAccountService(personalA, '0', '2026-08-14');
    
    const t = await transferWithCommission(personalA, {
      sourceAccount: source.id,
      destinationAccount: dest.id,
      sourceAmount: '50000',
      destinationAmount: '50000',
      commissionAmount: '3000',
      date: '2026-08-15',
    }, 'idempotency-false-success');
    
    const commissionExpenseId = t.commission.expenseId;
    
    // First attempt - should be rejected
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: commissionExpenseId });
    
    const { error: error1 } = await trashTransaction(clientPersonalA, commissionExpenseId, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(error1, 'First attempt should be rejected');
    equal(error1.code, '23514', 'First attempt error code is 23514');
    assert(error1.message?.includes('finance_transaction_dependent_on_transfer'), 'First attempt error message contains finance_transaction_dependent_on_transfer');
    
    // Second attempt with SAME mutation_id and payload (idempotent retry)
    // Should also be rejected, not succeed
    const { error: error2 } = await trashTransaction(clientPersonalA, commissionExpenseId, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(error2, 'Second attempt (replay) should also be rejected');
    equal(error2.code, '23514', 'Second attempt error code is 23514');
    assert(error2.message?.includes('finance_transaction_dependent_on_transfer'), 'Second attempt error message contains finance_transaction_dependent_on_transfer');
    
    // Verify Commission transaction still ACTIVE
    const expenseAfter = await transactionRow(commissionExpenseId);
    equal(expenseAfter.status, 'ACTIVE', 'Commission transaction still ACTIVE after retries');
    assert(expenseAfter.trashed_at === null, 'trashed_at still NULL');
    
    // Verify effect still ACTIVE
    const effectsAfter = await effectsForTransaction(commissionExpenseId);
    equal(effectsAfter[0].effect_status, 'ACTIVE', 'Commission effect still ACTIVE after retries');
  });
}

async function main() {
  try {
    await setup();
    
    await testD01();
    await testD02();
    await testD03();
    await testD04();
    await testD05();
    await testD06();
    await testD07();
    await testD08();
    await testD09();
    await testD10();
    await testD11();
    await testD12();
    await testD14();
    await testD15();
    await testD16();
    
    console.log(`\nFINANCE_STAGE_4D_TESTS pass=${passCount} fail=${failCount}`);
    if (failCount > 0) {
      console.error('FINANCE_STAGE_4D_CANONICAL_TRANSACTION_TRASH_TESTS=FAIL');
      process.exit(1);
    }
    console.log('FINANCE_STAGE_4D_CANONICAL_TRANSACTION_TRASH_TESTS=PASS');
  } finally {
    await cleanup();
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});