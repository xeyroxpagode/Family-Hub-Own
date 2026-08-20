#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 4G Transaction Restore Mutation tests.
 *
 * Local Supabase only. Validates canonical Restore mutation for Expense/Income.
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
  FINANCE_TRANSACTION_TYPES,
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
  console.error('ENVIRONMENT_FAILURE: Finance 4G tests are local-only.');
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
  return `Fin4G_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin4g-${label}-${suffix}@example.test`;
  const password = await randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 4G QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPersonDb(authUserId, label) {
  const { rows } = await queryDb(
    `INSERT INTO people (auth_user_id, display_name, default_language, personal_settings) 
     VALUES ($1, $2, 'es-419', '{}') RETURNING *`,
    [authUserId, `Fin 4G ${label}`]
  );
  const person = rows[0];
  fixture.personIds.push(person.id);
  return person;
}

async function createHouseholdDb(name, ownerPersonId, members) {
  const slug = `fin4g-${crypto.randomBytes(8).toString('hex')}`;
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
    requestId: `fin4g-req-${label}-${crypto.randomBytes(4).toString('hex')}`,
    mutationId: `fin4g-mut-${label}-${crypto.randomBytes(4).toString('hex')}`,
    idempotencyKey: `fin4g-key-${label}-${crypto.randomBytes(4).toString('hex')}`,
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
    `select *, category_label_snapshot, transfer_id, category_id, status, trashed_at
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

async function restoreTransaction(client, transactionId, mutationId, idempotencyKey, payloadHash, personId) {
  const { data, error } = await client.rpc('finance_restore_transaction_v1', {
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

async function listTrash(client, context) {
  const { data, error } = await client
    .from('finance_transactions')
    .select('id, transaction_type, amount, currency, transaction_date, description, category_id, category_label_snapshot, created_at, updated_at, status, trashed_at')
    .eq('financial_context_type', context.contextType)
    .eq(context.contextType === 'personal' ? 'owner_person_id' : 'household_id', context.contextType === 'personal' ? context.personId : context.householdId)
    .is(context.contextType === 'personal' ? 'household_id' : 'owner_person_id', null)
    .eq('status', 'TRASHED')
    .in('transaction_type', ['expense', 'income'])
    .order('trashed_at', { ascending: false });
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
  const hhA = await createHouseholdDb('Fin 4G A', personA.id, [{ personId: personA.id, role: 'adult' }]);
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

// G01 — Expense without Account
async function testG01() {
  await runTest('G01 — Expense without Account', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, null, null);
    
    equal(tx.status, 'ACTIVE', 'Transaction starts as ACTIVE');
    equal(tx.trashed_at, null, 'trashed_at is null initially');
    
    // Trash it first
    const trashMutationId = crypto.randomUUID();
    const trashIdempotencyKey = crypto.randomUUID();
    const trashPayloadHash = hashPayload({ transactionId: tx.id });
    
    const { error: trashError } = await trashTransaction(clientPersonalA, tx.id, trashMutationId, trashIdempotencyKey, trashPayloadHash, personA.id);
    assert(!trashError, `Trash succeeded: ${trashError?.message}`);
    
    // Verify TRASHED
    const txTrashed = await transactionRow(tx.id);
    equal(txTrashed.status, 'TRASHED', 'Transaction is TRASHED');
    assert(txTrashed.trashed_at !== null, 'trashed_at is non-null');
    
    // Now restore
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { data, error } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Restore succeeded: ${error?.message}`);
    equal(data.status, 'ACTIVE', 'Transaction becomes ACTIVE');
    equal(data.trashed_at, null, 'trashed_at is NULL after restore');
  });
}

// G02 — Expense with Account
async function testG02() {
  await runTest('G02 — Expense with Account', async () => {
    const account = await createAccount(clientPersonalA, contextPersonalA, 'Test Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const balanceBefore = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceBefore, '100000.0000', 'Balance before expense is 100000');
    
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    
    const balanceAfterExpense = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterExpense, '80000.0000', 'Balance after expense is 80000');
    
    // Trash it
    const trashMutationId = crypto.randomUUID();
    const trashIdempotencyKey = crypto.randomUUID();
    const trashPayloadHash = hashPayload({ transactionId: tx.id });
    
    const { error: trashError } = await trashTransaction(clientPersonalA, tx.id, trashMutationId, trashIdempotencyKey, trashPayloadHash, personA.id);
    assert(!trashError, `Trash succeeded: ${trashError?.message}`);
    
    const balanceAfterTrash = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterTrash, '100000.0000', 'Balance returns to 100000 after trash');
    
    // Now restore
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { data, error } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Restore succeeded: ${error?.message}`);
    equal(data.status, 'ACTIVE', 'Transaction becomes ACTIVE');
    
    // Check effect is ACTIVE
    const { rows: effects } = await queryDb(
      `SELECT effect_status FROM finance_account_effects WHERE transaction_id = $1 AND account_id = $2`,
      [tx.id, account.id]
    );
    equal(effects?.[0]?.effect_status, 'ACTIVE', 'Effect becomes ACTIVE');
    
    const balanceAfterRestore = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterRestore, '80000.0000', 'Balance returns to 80000 after restore');
  });
}

// G03 — Income with Account
async function testG03() {
  await runTest('G03 — Income with Account', async () => {
    const account = await createAccount(clientPersonalA, contextPersonalA, 'Test Account Income', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const balanceBefore = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceBefore, '100000.0000', 'Balance before income is 100000');
    
    const cat = await nativeCategory('salary');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'income', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, 20000);
    
    const balanceAfterIncome = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterIncome, '120000.0000', 'Balance after income is 120000');
    
    // Trash it
    const trashMutationId = crypto.randomUUID();
    const trashIdempotencyKey = crypto.randomUUID();
    const trashPayloadHash = hashPayload({ transactionId: tx.id });
    
    const { error: trashError } = await trashTransaction(clientPersonalA, tx.id, trashMutationId, trashIdempotencyKey, trashPayloadHash, personA.id);
    assert(!trashError, `Trash succeeded: ${trashError?.message}`);
    
    const balanceAfterTrash = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterTrash, '100000.0000', 'Balance returns to 100000 after trash');
    
    // Now restore
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { data, error } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Restore succeeded: ${error?.message}`);
    equal(data.status, 'ACTIVE', 'Transaction becomes ACTIVE');
    
    const { rows: effects } = await queryDb(
      `SELECT effect_status FROM finance_account_effects WHERE transaction_id = $1 AND account_id = $2`,
      [tx.id, account.id]
    );
    equal(effects?.[0]?.effect_status, 'ACTIVE', 'Effect becomes ACTIVE');
    
    const balanceAfterRestore = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterRestore, '120000.0000', 'Balance returns to 120000 after restore');
  });
}

// G04 — Pre-Anchor effect
async function testG04() {
  await runTest('G04 — Pre-Anchor effect', async () => {
    const account = await createAccount(clientPersonalA, contextPersonalA, 'Pre-Anchor Account', 'ARS');
    
    // Create expense BEFORE anchor
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-07-15', cat.id, cat.label, account.id, -20000);
    
    // Now create anchor AFTER the expense
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const balanceBeforeTrash = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceBeforeTrash, '100000.0000', 'Balance is 100000 (pre-anchor expense not counted)');
    
    // Trash the old expense
    const trashMutationId = crypto.randomUUID();
    const trashIdempotencyKey = crypto.randomUUID();
    const trashPayloadHash = hashPayload({ transactionId: tx.id });
    
    const { error: trashError } = await trashTransaction(clientPersonalA, tx.id, trashMutationId, trashIdempotencyKey, trashPayloadHash, personA.id);
    assert(!trashError, `Trash succeeded: ${trashError?.message}`);
    
    const balanceAfterTrash = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterTrash, '100000.0000', 'Balance remains 100000 after trash (no phantom movement)');
    
    // Now restore the old expense
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { data, error } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Restore succeeded: ${error?.message}`);
    equal(data.status, 'ACTIVE', 'Transaction becomes ACTIVE');
    
    // Balance MUST STILL remain 100000 (pre-anchor effect not counted)
    const balanceAfterRestore = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterRestore, '100000.0000', 'Balance remains 100000 after restore (no phantom movement)');
  });
}

// G05 — Negative Balance
async function testG05() {
  await runTest('G05 — Negative Balance', async () => {
    const account = await createAccount(clientPersonalA, contextPersonalA, 'Negative Balance Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 10000, '2026-08-01');
    
    const balanceBefore = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceBefore, '10000.0000', 'Initial balance is 10000');
    
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 15000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -15000);
    
    const balanceAfterExpense = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterExpense, '-5000.0000', 'Balance after expense is -5000 (negative allowed)');
    
    // Trash it
    const trashMutationId = crypto.randomUUID();
    const trashIdempotencyKey = crypto.randomUUID();
    const trashPayloadHash = hashPayload({ transactionId: tx.id });
    
    const { error: trashError } = await trashTransaction(clientPersonalA, tx.id, trashMutationId, trashIdempotencyKey, trashPayloadHash, personA.id);
    assert(!trashError, `Trash succeeded: ${trashError?.message}`);
    
    const balanceAfterTrash = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterTrash, '10000.0000', 'Balance returns to 10000 after trash');
    
    // Restore
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { data, error } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Restore succeeded: ${error?.message}`);
    equal(data.status, 'ACTIVE', 'Transaction becomes ACTIVE');
    
    const balanceAfterRestore = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterRestore, '-5000.0000', 'Balance returns to -5000 after restore (negative allowed)');
  });
}

// G06 — UNKNOWN Balance
async function testG06() {
  await runTest('G06 — UNKNOWN Balance', async () => {
    // Account without balance anchor = UNKNOWN
    const account = await createAccount(clientPersonalA, contextPersonalA, 'Unknown Balance Account', 'ARS');
    // NO balance anchor created
    
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    
    // Trash it
    const trashMutationId = crypto.randomUUID();
    const trashIdempotencyKey = crypto.randomUUID();
    const trashPayloadHash = hashPayload({ transactionId: tx.id });
    
    const { error: trashError } = await trashTransaction(clientPersonalA, tx.id, trashMutationId, trashIdempotencyKey, trashPayloadHash, personA.id);
    assert(!trashError, `Trash succeeded: ${trashError?.message}`);
    
    // Restore
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { data, error } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Restore succeeded: ${error?.message}`);
    equal(data.status, 'ACTIVE', 'Transaction becomes ACTIVE');
    
    // Balance should remain UNKNOWN (restoring does not fabricate known balance)
    const balanceAfterRestore = await getAccountBalance(clientPersonalA, account.id);
    // The balance function returns 'UNKNOWN' text when no anchor exists
    assert(balanceAfterRestore === 'UNKNOWN' || balanceAfterRestore === null || balanceAfterRestore === '', `Balance remains UNKNOWN: ${balanceAfterRestore}`);
  });
}

// G07 — Atomic failure
async function testG07() {
  await runTest('G07 — Atomic failure', async () => {
    const account = await createAccount(clientPersonalA, contextPersonalA, 'Atomic Test', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    
    // Trash it first
    const trashMutationId = crypto.randomUUID();
    const trashIdempotencyKey = crypto.randomUUID();
    const trashPayloadHash = hashPayload({ transactionId: tx.id });
    
    const { error: trashError } = await trashTransaction(clientPersonalA, tx.id, trashMutationId, trashIdempotencyKey, trashPayloadHash, personA.id);
    assert(!trashError, `Trash succeeded: ${trashError?.message}`);
    
    // Verify no half-state after successful restore
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { data, error } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Restore succeeded: ${error?.message}`);
    
    // Verify no half-state
    const { rows: txCheck } = await queryDb(
      `SELECT status, trashed_at FROM finance_transactions WHERE id = $1`,
      [tx.id]
    );
    
    const { rows: effectCheck } = await queryDb(
      `SELECT effect_status FROM finance_account_effects WHERE transaction_id = $1 AND account_id = $2`,
      [tx.id, account.id]
    );
    
    equal(txCheck[0]?.status, 'ACTIVE', 'Transaction is ACTIVE');
    equal(txCheck[0]?.trashed_at, null, 'trashed_at is NULL');
    equal(effectCheck[0]?.effect_status, 'ACTIVE', 'Effect is ACTIVE');
    
    // Verify forbidden states don't exist
    const forbidden1 = txCheck[0]?.status === 'ACTIVE' && effectCheck[0]?.effect_status === 'REVERSED';
    const forbidden2 = txCheck[0]?.status === 'TRASHED' && effectCheck[0]?.effect_status === 'ACTIVE';
    assert(!forbidden1, 'Forbidden state: ACTIVE transaction + REVERSED effect');
    assert(!forbidden2, 'Forbidden state: TRASHED transaction + ACTIVE effect');
  });
}

// G08 — Idempotent retry
async function testG08() {
  await runTest('G08 — Idempotent retry', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    // Trash it first
    const trashMutationId = crypto.randomUUID();
    const trashIdempotencyKey = crypto.randomUUID();
    const trashPayloadHash = hashPayload({ transactionId: tx.id });
    
    const { error: trashError } = await trashTransaction(clientPersonalA, tx.id, trashMutationId, trashIdempotencyKey, trashPayloadHash, personA.id);
    assert(!trashError, `Trash succeeded: ${trashError?.message}`);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    // First restore
    const { data: data1, error: error1 } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error1, `First restore succeeded: ${error1?.message}`);
    equal(data1.status, 'ACTIVE', 'First restore: ACTIVE');
    
    // Second restore with SAME mutation_id and payload
    const { data: data2, error: error2 } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error2, `Second restore (replay) succeeded: ${error2?.message}`);
    equal(data2.status, 'ACTIVE', 'Second restore: ACTIVE');
    equal(data2.id, data1.id, 'Same transaction returned');
    equal(data2.trashed_at, data1.trashed_at, 'trashed_at is NULL on replay');
    
    // Verify only one transition occurred
    const { rows: txCheck } = await queryDb(
      `SELECT trashed_at FROM finance_transactions WHERE id = $1`,
      [tx.id]
    );
    // trashed_at should be NULL
    equal(txCheck[0]?.trashed_at, null, 'trashed_at is NULL (no duplicate transition)');
  });
}

// G09 — Mutation identity conflict
async function testG09() {
  await runTest('G09 — Mutation identity conflict', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    // Trash it first
    const trashMutationId = crypto.randomUUID();
    const trashIdempotencyKey = crypto.randomUUID();
    const trashPayloadHash = hashPayload({ transactionId: tx.id });
    
    const { error: trashError } = await trashTransaction(clientPersonalA, tx.id, trashMutationId, trashIdempotencyKey, trashPayloadHash, personA.id);
    assert(!trashError, `Trash succeeded: ${trashError?.message}`);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash1 = hashPayload({ transactionId: tx.id });
    
    // First restore
    const { error: error1 } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash1, personA.id);
    assert(!error1, `First restore succeeded: ${error1?.message}`);
    
    // Second restore with SAME mutation_id but DIFFERENT payload
    const payloadHash2 = hashPayload({ transactionId: tx.id, different: 'payload' });
    const { error: error2 } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash2, personA.id);
    assert(error2, 'Second restore with different payload should fail');
    equal(error2.code, 'P0008', 'Conflict error code P0008');
  });
}

// G10 — Already ACTIVE
async function testG10() {
  await runTest('G10 — Already ACTIVE', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    // Transaction is already ACTIVE - attempt restore directly
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { data, error } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Restore on ACTIVE succeeded (idempotent): ${error?.message}`);
    equal(data.status, 'ACTIVE', 'Transaction remains ACTIVE');
    equal(data.trashed_at, null, 'trashed_at remains NULL');
    
    // Verify no state changes
    const { rows: txCheck } = await queryDb(
      `SELECT status, trashed_at FROM finance_transactions WHERE id = $1`,
      [tx.id]
    );
    equal(txCheck[0]?.status, 'ACTIVE', 'Transaction still ACTIVE');
    equal(txCheck[0]?.trashed_at, null, 'trashed_at still NULL');
  });
}

// G11 — Unauthorized Personal
async function testG11() {
  await runTest('G11 — Unauthorized Personal', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    // Trash it first (as owner)
    const trashMutationId = crypto.randomUUID();
    const trashIdempotencyKey = crypto.randomUUID();
    const trashPayloadHash = hashPayload({ transactionId: tx.id });
    
    const { error: trashError } = await trashTransaction(clientPersonalA, tx.id, trashMutationId, trashIdempotencyKey, trashPayloadHash, personA.id);
    assert(!trashError, `Trash succeeded: ${trashError?.message}`);
    
    // User B tries to restore User A's transaction - should fail
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { error } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personB.id);
    assert(error, 'Other user restore should be rejected');
    equal(error.code, '42501', 'Error code is 42501 (forbidden)');
  });
}

// G12 — Invalid Household
async function testG12() {
  await runTest('G12 — Invalid Household', async () => {
    // Create another household that User A is NOT a member of
    const userC = await createAuthUser('c');
    const personC = await createPersonDb(userC.user.id, 'C');
    const hhC = await createHouseholdDb('Fin 4G C', personC.id, [{ personId: personC.id, role: 'adult' }]);
    await setActiveHouseholdDb(personC.id, hhC.household.id);
    const tokenC = await signIn(userC.email, userC.password);
    const clientC = tokenClient(tokenC);
    const contextC = await resolvedContext(userC.user, tokenC, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
    
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientC, contextC, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    // Trash it as owner
    const trashMutationId = crypto.randomUUID();
    const trashIdempotencyKey = crypto.randomUUID();
    const trashPayloadHash = hashPayload({ transactionId: tx.id });
    
    const { error: trashError } = await trashTransaction(clientC, tx.id, trashMutationId, trashIdempotencyKey, trashPayloadHash, personC.id);
    assert(!trashError, `Trash succeeded: ${trashError?.message}`);
    
    // User A tries to restore Household C's transaction using their own context
    // This should fail because User A is not a member of Household C
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { error } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(error, 'Arbitrary household restore should be rejected');
    
    // Cleanup C
    fixture.authUserIds.push(userC.user.id);
    fixture.personIds.push(personC.id);
    fixture.householdIds.push(hhC.household.id);
  });
}

// G13 — History preservation
async function testG13() {
  await runTest('G13 — History preservation', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    const originalAmount = tx.amount;
    const originalCurrency = tx.currency;
    const originalDate = tx.transaction_date;
    const originalCategoryId = tx.category_id;
    const originalCategoryLabel = tx.category_label_snapshot;
    const originalDescription = tx.description;
    const originalId = tx.id;
    const originalCreatedAt = tx.created_at;
    
    // Trash it
    const trashMutationId = crypto.randomUUID();
    const trashIdempotencyKey = crypto.randomUUID();
    const trashPayloadHash = hashPayload({ transactionId: tx.id });
    
    const { error: trashError } = await trashTransaction(clientPersonalA, tx.id, trashMutationId, trashIdempotencyKey, trashPayloadHash, personA.id);
    assert(!trashError, `Trash succeeded: ${trashError?.message}`);
    
    // Restore it
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { error } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Restore succeeded: ${error?.message}`);
    
    // Verify all original data preserved
    const { rows: txCheck } = await queryDb(
      `SELECT * FROM finance_transactions WHERE id = $1`,
      [tx.id]
    );
    
    equal(txCheck[0]?.amount, originalAmount, 'Amount preserved');
    equal(txCheck[0]?.currency, originalCurrency, 'Currency preserved');
    const expectedDateStr = String(originalDate).split('T')[0];
    const actualDateStr = String(txCheck[0]?.transaction_date).split('T')[0];
    equal(actualDateStr, expectedDateStr, 'Date preserved');
    equal(txCheck[0]?.category_id, originalCategoryId, 'Category ID preserved');
    equal(txCheck[0]?.category_label_snapshot, originalCategoryLabel, 'Category label snapshot preserved');
    equal(txCheck[0]?.description, originalDescription, 'Description preserved');
    equal(txCheck[0]?.status, 'ACTIVE', 'Status is ACTIVE');
    equal(txCheck[0]?.trashed_at, null, 'trashed_at is NULL');
    equal(txCheck[0]?.id, originalId, 'Same row ID preserved');
    // Compare created_at as ISO strings to avoid precision issues
    const expectedCreatedAt = new Date(originalCreatedAt).toISOString();
    const actualCreatedAt = new Date(txCheck[0]?.created_at).toISOString();
    equal(actualCreatedAt, expectedCreatedAt, 'created_at preserved');
    
    // Transaction row NOT hard-deleted/recreated
    assert(txCheck[0]?.id === tx.id, 'Transaction row still exists (same row)');
  });
}

// G14 — Read consequence
async function testG14() {
  await runTest('G14 — Read consequence', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    // Before trash: appears in active movements
    const movementsBefore = await listMovements(clientPersonalA, contextPersonalA, '2026-08');
    const foundBefore = movementsBefore.some(m => m.id === tx.id);
    assert(foundBefore, 'Transaction appears in active movements before trash');
    
    // Trash it
    const trashMutationId = crypto.randomUUID();
    const trashIdempotencyKey = crypto.randomUUID();
    const trashPayloadHash = hashPayload({ transactionId: tx.id });
    
    const { error: trashError } = await trashTransaction(clientPersonalA, tx.id, trashMutationId, trashIdempotencyKey, trashPayloadHash, personA.id);
    assert(!trashError, `Trash succeeded: ${trashError?.message}`);
    
    // After trash: in Papelera, not in Movimientos
    const trashBeforeRestore = await listTrash(clientPersonalA, contextPersonalA);
    const foundInTrash = trashBeforeRestore.some(m => m.id === tx.id);
    assert(foundInTrash, 'Transaction appears in Papelera after trash');
    
    const movementsAfterTrash = await listMovements(clientPersonalA, contextPersonalA, '2026-08');
    const foundInMovementsAfterTrash = movementsAfterTrash.some(m => m.id === tx.id);
    assert(!foundInMovementsAfterTrash, 'Transaction does NOT appear in active movements after trash');
    
    // Now restore
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { error } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Restore succeeded: ${error?.message}`);
    
    // After restore: in Movimientos, not in Papelera
    const movementsAfterRestore = await listMovements(clientPersonalA, contextPersonalA, '2026-08');
    const foundInMovementsAfterRestore = movementsAfterRestore.some(m => m.id === tx.id);
    assert(foundInMovementsAfterRestore, 'Transaction appears in active movements after restore');
    
    const trashAfterRestore = await listTrash(clientPersonalA, contextPersonalA);
    const foundInTrashAfterRestore = trashAfterRestore.some(m => m.id === tx.id);
    assert(!foundInTrashAfterRestore, 'Transaction does NOT appear in Papelera after restore');
  });
}

// G15 — Account Activity
async function testG15() {
  await runTest('G15 — Account Activity', async () => {
    const account = await createAccount(clientPersonalA, contextPersonalA, 'Test Activity Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    
    // Trash it
    const trashMutationId = crypto.randomUUID();
    const trashIdempotencyKey = crypto.randomUUID();
    const trashPayloadHash = hashPayload({ transactionId: tx.id });
    
    const { error: trashError } = await trashTransaction(clientPersonalA, tx.id, trashMutationId, trashIdempotencyKey, trashPayloadHash, personA.id);
    assert(!trashError, `Trash succeeded: ${trashError?.message}`);
    
    // Verify account effect is REVERSED
    const effectsAfterTrash = await effectsForTransaction(tx.id);
    assert(effectsAfterTrash.length > 0, 'Effect row exists after trash');
    equal(effectsAfterTrash[0].effect_status, 'REVERSED', 'Effect is REVERSED after trash');
    
    // Restore
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    const { error } = await restoreTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    assert(!error, `Restore succeeded: ${error?.message}`);
    
    // Verify account effect is ACTIVE again
    const effectsAfterRestore = await effectsForTransaction(tx.id);
    assert(effectsAfterRestore.length > 0, 'Effect row exists after restore');
    equal(effectsAfterRestore[0].effect_status, 'ACTIVE', 'Effect is ACTIVE after restore');
    
    // Verify the activity service includes the restored transaction
    const activityService = require('../backend/src/services/finance.account.activity.service');
    const context = await resolvedContext(userA.user, tokenA, FINANCE_CONTEXT_TYPES.PERSONAL);
    const activityResult = await activityService.listFinanceAccountActivity(context, account.id, { limit: 10 });
    
    const foundInActivity = activityResult.activity.some(a => a.transactionId === tx.id);
    assert(foundInActivity, 'Restored transaction appears in Account Activity');
  });
}

// G16 — Commission provenance
async function testG16() {
  await runTest('G16 — Commission provenance', async () => {
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
    }, 'commission-restore');
    
    assert(t.commission !== null, 'Transfer has commission');
    const commissionExpenseId = t.commission.expenseId;
    
    // Verify commission expense has transfer_id
    const expenseRow = await transactionRow(commissionExpenseId);
    assert(expenseRow.transfer_id !== null, 'Commission Expense has transfer_id');
    equal(expenseRow.transfer_id, t.id, 'Commission Expense transfer_id points to owning Transfer');
    equal(expenseRow.transaction_type, 'expense', 'Commission is expense type');
    equal(String(expenseRow.amount), '3000.0000', 'Commission amount is 3000');
    
    // Trash the commission expense first (this should fail in 4D but we verify it was trashed somehow)
    // Actually, 4D prevents trashing commission expenses, so we need to manually set it to TRASHED
    // for this test. Let's manually set the status to TRASHED and effect to REVERSED
    await queryDb(
      `UPDATE finance_transactions SET status = 'TRASHED', trashed_at = now(), updated_at = now() WHERE id = $1`,
      [commissionExpenseId]
    );
    await queryDb(
      `UPDATE finance_account_effects SET effect_status = 'REVERSED' WHERE transaction_id = $1 AND effect_role = 'PRIMARY'`,
      [commissionExpenseId]
    );
    
    // Verify it's now TRASHED
    const expenseAfterTrash = await transactionRow(commissionExpenseId);
    equal(expenseAfterTrash.status, 'TRASHED', 'Commission transaction is TRASHED (manual for test)');
    
    // Attempt restore of Commission Expense
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: commissionExpenseId });
    
    const { data, error } = await restoreTransaction(clientPersonalA, commissionExpenseId, mutationId, idempotencyKey, payloadHash, personA.id);
    
    // Expect rejection - RPC returns PostgreSQL error code 23514 with custom message
    assert(error, 'Direct Restore of Commission Expense should be rejected');
    equal(error.code, '23514', 'Error code is 23514 (check constraint violation)');
    assert(error.message?.includes('finance_transaction_dependent_on_transfer'), 'Error message contains finance_transaction_dependent_on_transfer');
    
    // Verify Commission transaction remains TRASHED
    const expenseAfter = await transactionRow(commissionExpenseId);
    equal(expenseAfter.status, 'TRASHED', 'Commission transaction remains TRASHED');
    assert(expenseAfter.trashed_at !== null, 'Commission trashed_at is non-NULL');
    
    // Verify Commission effect remains REVERSED
    const effectsAfter = await effectsForTransaction(commissionExpenseId);
    equal(effectsAfter[0].effect_status, 'REVERSED', 'Commission effect remains REVERSED');
    
    // Verify Source Balance unchanged (after manual trash, effect is REVERSED so commission not counted: 50000 - 50000 = 0)
    const sourceBalanceAfter = await getAccountBalance(clientPersonalA, source.id);
    equal(sourceBalanceAfter, '0.0000', 'Source balance unchanged after rejected restore');
    
    // Verify Transfer unchanged
    const transferAfter = await transferRow(t.id);
    equal(transferAfter.id, t.id, 'Transfer unchanged');
    equal(transferAfter.source_amount, '50000.0000', 'Transfer source_amount unchanged');
  });
}

async function main() {
  try {
    await setup();
    
    await testG01();
    await testG02();
    await testG03();
    await testG04();
    await testG05();
    await testG06();
    await testG07();
    await testG08();
    await testG09();
    await testG10();
    await testG11();
    await testG12();
    await testG13();
    await testG14();
    await testG15();
    await testG16();
    
    console.log(`\nFINANCE_STAGE_4G_TESTS pass=${passCount} fail=${failCount}`);
    if (failCount > 0) {
      console.error('FINANCE_STAGE_4G_CANONICAL_TRANSACTION_RESTORE_TESTS=FAIL');
      process.exit(1);
    }
    console.log('FINANCE_STAGE_4G_CANONICAL_TRANSACTION_RESTORE_TESTS=PASS');
  } finally {
    await cleanup();
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});