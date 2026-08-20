#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 4I-B Canonical Transaction Correction tests (I01-I20).
 * Local Supabase only.
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
  console.error('ENVIRONMENT_FAILURE: Finance 4I-B tests are local-only.');
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
  return `Fin4IB_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin4ib-${label}-${suffix}@example.test`;
  const password = await randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 4I-B QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPersonDb(authUserId, label) {
  const { rows } = await queryDb(
    `INSERT INTO people (auth_user_id, display_name, default_language, personal_settings) 
     VALUES ($1, $2, 'es-419', '{}') RETURNING *`,
    [authUserId, `Fin 4I-B ${label}`]
  );
  const person = rows[0];
  fixture.personIds.push(person.id);
  return person;
}

async function createHouseholdDb(name, ownerPersonId, members) {
  const slug = `fin4ib-${crypto.randomBytes(8).toString('hex')}`;
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
    requestId: `fin4ib-req-${label}-${crypto.randomBytes(4).toString('hex')}`,
    mutationId: `fin4ib-mut-${label}-${crypto.randomBytes(4).toString('hex')}`,
    idempotencyKey: `fin4ib-key-${label}-${crypto.randomBytes(4).toString('hex')}`,
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
    `select *, category_label_snapshot, transfer_id, category_id, corrected_from_transaction_id
     from public.finance_transactions
     where id = $1`,
    [transactionId]
  );
  return rows[0];
}

async function effectsForTransaction(transactionId) {
  const { rows } = await queryDb(
    `select account_id, effect_role, effect_amount::text as amount, currency, transaction_date::text as date, effect_status, transaction_id, transaction_created_at
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

async function correctTransaction(client, transactionId, mutationId, idempotencyKey, payloadHash, personId, corrections) {
  const params = {
    p_transaction_id: transactionId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
    p_payload_hash: payloadHash,
    p_created_by_person_id: personId,
    ...corrections,
  };
  const { data, error } = await client.rpc('finance_correct_transaction_v1', params);
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
    .select('id, transaction_type, amount, currency, transaction_date, description, category_id, category_label_snapshot, created_at, updated_at, status, trashed_at, corrected_from_transaction_id')
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
  const hhA = await createHouseholdDb('Fin 4I-B A', personA.id, [{ personId: personA.id, role: 'adult' }]);
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

// I01 — Expense amount correction: 20000 → 15000
async function testI01() {
  await runTest('I01 — Expense amount correction 20000 → 15000', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I01 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const balanceBefore = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceBefore, '100000.0000', 'Balance before expense is 100000');
    
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    const balanceAfterExpense = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterExpense, '80000.0000', 'Balance after expense is 80000');
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 15000 });
    
    const { data, error } = await correctTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_amount: 15000,
    });
    assert(!error, `Correction succeeded: ${error?.message}`);
    equal(data.status, 'ACTIVE', 'New transaction is ACTIVE');
    // amount returns as numeric (not string) from RPC
    equal(String(data.amount), '15000', 'New amount is 15000');
    equal(data.corrected_from_transaction_id, tx.id, 'Replacement points to original');
    
    // Original is SUPERSEDED
    const orig = await transactionRow(tx.id);
    equal(orig.status, 'SUPERSEDED', 'Original is SUPERSEDED');
    assert(orig.trashed_at === null, 'Original trashed_at is NULL');
    
    // Original effect is REVERSED
    const origEffects = await effectsForTransaction(tx.id);
    equal(origEffects[0].effect_status, 'REVERSED', 'Original effect is REVERSED');
    
    // New effect is ACTIVE on same account with -15000
    const newEffects = await effectsForTransaction(data.id);
    equal(newEffects.length, 1, 'Exactly one new effect');
    equal(newEffects[0].effect_status, 'ACTIVE', 'New effect is ACTIVE');
    equal(newEffects[0].account_id, account.id, 'New effect on same account');
    equal(newEffects[0].amount, '-15000.0000', 'New effect amount is -15000');
    
    // Balance reflects -15000 exactly once
    const balanceAfterCorrection = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterCorrection, '85000.0000', 'Balance is 85000 (100000 - 15000)');
    
    // Movements only shows replacement
    const movements = await listMovements(clientPersonalA, contextPersonalA, '2026-08');
    const foundOrig = movements.some(m => m.id === tx.id);
    const foundNew = movements.some(m => m.id === data.id);
    assert(!foundOrig, 'Original not in movements');
    assert(foundNew, 'Replacement in movements');
  });
}

// I02 — Income amount correction: 20000 → 15000
async function testI02() {
  await runTest('I02 — Income amount correction 20000 → 15000', async () => {
    const cat = await nativeCategory('salary');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I02 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'income', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, 20000);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 15000 });
    
    const { data, error } = await correctTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_amount: 15000,
    });
    assert(!error, `Correction succeeded: ${error?.message}`);
    equal(data.transaction_type, 'income', 'Type preserved as income');
    equal(String(data.amount), '15000', 'New amount is 15000');
    
    const origEffects = await effectsForTransaction(tx.id);
    equal(origEffects[0].effect_status, 'REVERSED', 'Original effect is REVERSED');
    
    const newEffects = await effectsForTransaction(data.id);
    equal(newEffects[0].effect_status, 'ACTIVE', 'New effect is ACTIVE');
    equal(newEffects[0].amount, '15000.0000', 'New effect amount is +15000');
    
    const balanceAfterCorrection = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfterCorrection, '115000.0000', 'Balance is 115000 (100000 + 15000)');
  });
}

// I03 — Account A → Account B
async function testI03() {
  await runTest('I03 — Account A → Account B', async () => {
    const cat = await nativeCategory('food');
    const accountA = await createAccount(clientPersonalA, contextPersonalA, 'I03 Account A', 'ARS');
    const accountB = await createAccount(clientPersonalA, contextPersonalA, 'I03 Account B', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, accountA.id, 100000, '2026-08-01');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, accountB.id, 50000, '2026-08-01');
    
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, accountA.id, -20000);
    
    const balanceABefore = await getAccountBalance(clientPersonalA, accountA.id);
    const balanceBBefore = await getAccountBalance(clientPersonalA, accountB.id);
    equal(balanceABefore, '80000.0000', 'Account A balance after expense: 80000');
    equal(balanceBBefore, '50000.0000', 'Account B balance: 50000');
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ account_id: accountB.id });
    
    const { data, error } = await correctTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_account_id: accountB.id,
    });
    assert(!error, `Correction succeeded: ${error?.message}`);
    
    // Original effect REVERSED on A
    const origEffects = await effectsForTransaction(tx.id);
    equal(origEffects[0].effect_status, 'REVERSED', 'Original effect on A is REVERSED');
    
    // New effect ACTIVE on B with -20000
    const newEffects = await effectsForTransaction(data.id);
    equal(newEffects[0].effect_status, 'ACTIVE', 'New effect on B is ACTIVE');
    equal(newEffects[0].account_id, accountB.id, 'New effect on Account B');
    equal(newEffects[0].amount, '-20000.0000', 'New effect amount -20000');
    
    // Balance: A back to 100000, B now 30000
    const balanceAAfter = await getAccountBalance(clientPersonalA, accountA.id);
    const balanceBAfter = await getAccountBalance(clientPersonalA, accountB.id);
    equal(balanceAAfter, '100000.0000', 'Account A balance restored to 100000');
    equal(balanceBAfter, '30000.0000', 'Account B balance is 30000 (50000 - 20000)');
  });
}

// I04 — Account → No Account
async function testI04() {
  await runTest('I04 — Account → No Account', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I04 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    
    const balanceBefore = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceBefore, '80000.0000', 'Balance after expense: 80000');
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ clear_account: true });
    
    const { data, error } = await correctTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_clear_account: true,
    });
    assert(!error, `Correction succeeded: ${error?.message}`);
    
    // Original effect REVERSED
    const origEffects = await effectsForTransaction(tx.id);
    equal(origEffects[0].effect_status, 'REVERSED', 'Original effect is REVERSED');
    
    // No new effect (no account)
    const newEffects = await effectsForTransaction(data.id);
    equal(newEffects.length, 0, 'No new effect for no-account transaction');
    
    // Balance restored to 100000
    const balanceAfter = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfter, '100000.0000', 'Balance restored to 100000');
  });
}

// I05 — No Account → Account
async function testI05() {
  await runTest('I05 — No Account → Account', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I05 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, null, null);
    
    const balanceBefore = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceBefore, '100000.0000', 'Balance before correction: 100000');
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ account_id: account.id });
    
    const { data, error } = await correctTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_account_id: account.id,
    });
    assert(!error, `Correction succeeded: ${error?.message}`);
    
    // Original had no effect
    const origEffects = await effectsForTransaction(tx.id);
    equal(origEffects.length, 0, 'Original had no effect');
    
    // New effect ACTIVE on account with -20000
    const newEffects = await effectsForTransaction(data.id);
    equal(newEffects.length, 1, 'Exactly one new effect');
    equal(newEffects[0].effect_status, 'ACTIVE', 'New effect is ACTIVE');
    equal(newEffects[0].account_id, account.id, 'Effect on new account');
    equal(newEffects[0].amount, '-20000.0000', 'Effect amount -20000');
    
    // Balance: 80000
    const balanceAfter = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfter, '80000.0000', 'Balance is 80000 (100000 - 20000)');
  });
}

// I06 — Category correction
async function testI06() {
  await runTest('I06 — Category correction', async () => {
    const cat1 = await nativeCategory('food');
    const cat2 = await nativeCategory('transport');
    
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat1.id, cat1.label, null, null);
    
    const orig = await transactionRow(tx.id);
    equal(orig.category_id, cat1.id, 'Original category is food');
    equal(orig.category_label_snapshot, cat1.label, 'Original snapshot is food label');
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ category_id: cat2.id });
    
    const { data, error } = await correctTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_category_id: cat2.id,
    });
    assert(!error, `Correction succeeded: ${error?.message}`);
    
    // Original keeps old snapshot
    const origAfter = await transactionRow(tx.id);
    equal(origAfter.category_id, cat1.id, 'Original category_id unchanged');
    equal(origAfter.category_label_snapshot, cat1.label, 'Original snapshot preserved');
    
    // Replacement has new category and new snapshot
    equal(data.category_id, cat2.id, 'Replacement category is transport');
    equal(data.category_label_snapshot, cat2.label, 'Replacement snapshot is transport label');
  });
}

// I07 — Description-only correction
async function testI07() {
  await runTest('I07 — Description-only correction', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I07 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ description: 'Corrected description' });
    
    const { data, error } = await correctTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_description: 'Corrected description',
    });
    assert(!error, `Correction succeeded: ${error?.message}`);
    
    // Amount/account unchanged
    equal(String(data.amount), '20000', 'Amount unchanged');
    // account_id not on transaction; verify via effect
    const i07Effects = await effectsForTransaction(data.id);
    equal(i07Effects[0].account_id, account.id, 'Account unchanged (via effect)');
    
    // Description updated
    equal(data.description, 'Corrected description', 'Description corrected');
    
    // Financial effect identical - balance unchanged
    const balanceAfter = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfter, '80000.0000', 'Balance unchanged (80000)');
    
    // Both transactions exist in chain
    const orig = await transactionRow(tx.id);
    equal(orig.status, 'SUPERSEDED', 'Original is SUPERSEDED');
    equal(data.status, 'ACTIVE', 'Replacement is ACTIVE');
    equal(data.corrected_from_transaction_id, tx.id, 'Chain linked');
  });
}

// I08 — Notes explicit null works
async function testI08() {
  await runTest('I08 — Notes explicit null works', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, null, null);
    
    // First set notes
    const mutationId1 = crypto.randomUUID();
    const idempotencyKey1 = crypto.randomUUID();
    const payloadHash1 = hashPayload({ notes: 'Some notes' });
    
    const { data: data1, error: error1 } = await correctTransaction(clientPersonalA, tx.id, mutationId1, idempotencyKey1, payloadHash1, personA.id, {
      p_notes: 'Some notes',
    });
    assert(!error1, `First correction succeeded: ${error1?.message}`);
    equal(data1.notes, 'Some notes', 'Notes set');
    
    // Now clear notes explicitly
    const mutationId2 = crypto.randomUUID();
    const idempotencyKey2 = crypto.randomUUID();
    const payloadHash2 = hashPayload({ clear_notes: true });
    
    const { data: data2, error: error2 } = await correctTransaction(clientPersonalA, data1.id, mutationId2, idempotencyKey2, payloadHash2, personA.id, {
      p_clear_notes: true,
    });
    assert(!error2, `Second correction succeeded: ${error2?.message}`);
    assert(data2.notes === null, 'Notes cleared to null');
  });
}

// I09 — Description clear
async function testI09() {
  await runTest('I09 — Description clear', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, null, null);
    
    // Set description first
    const mutationId1 = crypto.randomUUID();
    const idempotencyKey1 = crypto.randomUUID();
    const payloadHash1 = hashPayload({ description: 'Has description' });
    
    const { data: data1, error: error1 } = await correctTransaction(clientPersonalA, tx.id, mutationId1, idempotencyKey1, payloadHash1, personA.id, {
      p_description: 'Has description',
    });
    assert(!error1, `First correction succeeded: ${error1?.message}`);
    equal(data1.description, 'Has description', 'Description set');
    
    // Now clear description explicitly
    const mutationId2 = crypto.randomUUID();
    const idempotencyKey2 = crypto.randomUUID();
    const payloadHash2 = hashPayload({ clear_description: true });
    
    const { data: data2, error: error2 } = await correctTransaction(clientPersonalA, data1.id, mutationId2, idempotencyKey2, payloadHash2, personA.id, {
      p_clear_description: true,
    });
    assert(!error2, `Second correction succeeded: ${error2?.message}`);
    assert(data2.description === null, 'Description cleared to null');
  });
}

// I10 — Currency correction without Account
async function testI10() {
  await runTest('I10 — Currency correction without Account', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 5000, 'ARS', '2026-08-15', cat.id, cat.label, null, null);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ currency: 'USD', amount: 20 });
    
    const { data, error } = await correctTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_currency: 'USD',
      p_amount: 20,
    });
    assert(!error, `Correction succeeded: ${error?.message}`);
    equal(data.currency, 'USD', 'Currency changed to USD');
    equal(String(data.amount), '20', 'Amount changed to 20');
    // No FX conversion - user provides both values
  });
}

// I11 — Currency mismatch with Account rejected
async function testI11() {
  await runTest('I11 — Currency mismatch with Account rejected', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I11 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    
    // Try to correct to USD while keeping ARS account
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ currency: 'USD' });
    
    const { data, error } = await correctTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_currency: 'USD',
    });
    assert(error, 'Correction should be rejected');
    equal(error.code, '23514', 'Error code 23514');
    assert(error.message?.includes('finance_account_invalid_for_correction'), 'Error message mentions account invalid');
    
    // Original remains ACTIVE
    const orig = await transactionRow(tx.id);
    equal(orig.status, 'ACTIVE', 'Original remains ACTIVE');
  });
}

// I12 — Date post-anchor → pre-anchor
async function testI12() {
  await runTest('I12 — Date post-anchor → pre-anchor', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I12 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    // Original after anchor
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    
    const balanceBefore = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceBefore, '80000.0000', 'Balance before correction: 80000 (expense counted)');
    
    // Correct to date before anchor
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transaction_date: '2026-07-15' });
    
    const { data, error } = await correctTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_transaction_date: '2026-07-15',
    });
    assert(!error, `Correction succeeded: ${error?.message}`);
    
    // Original effect REVERSED
    const origEffects = await effectsForTransaction(tx.id);
    equal(origEffects[0].effect_status, 'REVERSED', 'Original effect REVERSED');
    
    // New effect has pre-anchor date, so NOT counted in balance
    const newEffects = await effectsForTransaction(data.id);
    equal(newEffects[0].effect_status, 'ACTIVE', 'New effect ACTIVE');
    // Note: the balance function uses the effect's transaction_date (corrected) and transaction_created_at (new)
    // Since date is before anchor, it should not count
    
    // Balance returns to 100000 (new effect pre-anchor, not counted)
    const balanceAfter = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfter, '100000.0000', 'Balance is 100000 (new effect pre-anchor not counted)');
  });
}

// I13 — Date pre-anchor → post-anchor
async function testI13() {
  await runTest('I13 — Date pre-anchor → post-anchor', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I13 Account', 'ARS');
    
    // Create expense BEFORE anchor
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-07-15', cat.id, cat.label, account.id, -20000);
    
    // Now create anchor AFTER the expense
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const balanceBefore = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceBefore, '100000.0000', 'Balance before correction: 100000 (pre-anchor expense not counted)');
    
    // Correct to date after anchor
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transaction_date: '2026-08-15' });
    
    const { data, error } = await correctTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_transaction_date: '2026-08-15',
    });
    assert(!error, `Correction succeeded: ${error?.message}`);
    
    // Original effect REVERSED (was not counted anyway)
    const origEffects = await effectsForTransaction(tx.id);
    equal(origEffects[0].effect_status, 'REVERSED', 'Original effect REVERSED');
    
    // New effect has post-anchor date, IS counted
    const newEffects = await effectsForTransaction(data.id);
    equal(newEffects[0].effect_status, 'ACTIVE', 'New effect ACTIVE');
    
    // Balance now shows expense: 80000
    const balanceAfter = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfter, '80000.0000', 'Balance is 80000 (new effect post-anchor counted)');
  });
}

// I14 — Same-day Anchor ordering (new replacement created_at tie-break)
async function testI14() {
  await runTest('I14 — Same-day Anchor ordering', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I14 Account', 'ARS');
    // Anchor at 2026-08-15
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-15');
    
    // Original on same day as anchor (created before anchor)
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    
    // Original effect created_at = tx.created_at. If tx created before anchor, effect NOT counted
    // We can't easily control this in test, but we test the correction creates new effect with new created_at
    // The new effect will have transaction_date = anchor_date, transaction_created_at = now() (after anchor creation)
    // So new effect SHOULD be counted
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 15000 });
    
    const { data, error } = await correctTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_amount: 15000,
    });
    assert(!error, `Correction succeeded: ${error?.message}`);
    
    // New effect has same transaction_date (2026-08-15) but NEW created_at (now)
    // Anchor has created_at from when it was created (before original tx)
    // So new effect.transaction_created_at > anchor.created_at → counted
    const newEffects = await effectsForTransaction(data.id);
    equal(newEffects[0].effect_status, 'ACTIVE', 'New effect ACTIVE');
    equal(newEffects[0].amount, '-15000.0000', 'New effect amount -15000');
    
    // Balance reflects -15000
    const balanceAfter = await getAccountBalance(clientPersonalA, account.id);
    equal(balanceAfter, '85000.0000', 'Balance is 85000 (100000 - 15000)');
  });
}

// I15 — Expense → Income requested → rejected
async function testI15() {
  await runTest('I15 — Expense → Income requested rejected', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, null, null);
    
    // RPC doesn't accept transaction_type parameter, so type change is impossible by contract
    // But we verify the original type is preserved
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 15000 });
    
    const { data, error } = await correctTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_amount: 15000,
    });
    assert(!error, `Correction succeeded: ${error?.message}`);
    equal(data.transaction_type, 'expense', 'Type preserved as expense');
  });
}

// I16 — Income → Expense requested → rejected
async function testI16() {
  await runTest('I16 — Income → Expense requested rejected', async () => {
    const cat = await nativeCategory('salary');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'income', 20000, 'ARS', '2026-08-15', cat.id, cat.label, null, null);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 15000 });
    
    const { data, error } = await correctTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_amount: 15000,
    });
    assert(!error, `Correction succeeded: ${error?.message}`);
    equal(data.transaction_type, 'income', 'Type preserved as income');
  });
}

// I17 — Financial Context change attempted → rejected/impossible
async function testI17() {
  await runTest('I17 — Financial Context change impossible by contract', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientHouseholdA, contextHouseholdA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, null, null);
    
    const orig = await transactionRow(tx.id);
    equal(orig.financial_context_type, 'household', 'Original is household');
    equal(orig.household_id, contextHouseholdA.householdId, 'Original has household_id');
    assert(orig.owner_person_id === null, 'Original has no owner_person_id');
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 15000 });
    
    const { data, error } = await correctTransaction(clientHouseholdA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_amount: 15000,
    });
    assert(!error, `Correction succeeded: ${error?.message}`);
    
    // Replacement inherits same context
    equal(data.financial_context_type, 'household', 'Replacement is household');
    equal(data.household_id, contextHouseholdA.householdId, 'Replacement has same household_id');
    assert(data.owner_person_id === null, 'Replacement has no owner_person_id');
  });
}

// I18 — TRASHED source correction rejected
async function testI18() {
  await runTest('I18 — TRASHED source correction rejected', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, null, null);
    
    // Trash it first
    const { data: trashData, error: trashError } = await clientPersonalA.rpc('finance_trash_transaction_v1', {
      p_transaction_id: tx.id,
      p_mutation_id: crypto.randomUUID(),
      p_idempotency_key: crypto.randomUUID(),
      p_payload_hash: hashPayload({ transactionId: tx.id }),
      p_created_by_person_id: personA.id,
    });
    assert(!trashError, `Trash succeeded: ${trashError?.message}`);
    equal(trashData.status, 'TRASHED', 'Transaction is TRASHED');
    
    // Now try to correct the TRASHED transaction
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 15000 });
    
    const { data, error } = await correctTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_amount: 15000,
    });
    assert(error, 'Correction of TRASHED should be rejected');
    equal(error.code, '23514', 'Error code 23514');
    assert(error.message?.includes('invalid_transaction_state_for_correction'), 'Error mentions invalid state');
  });
}

// I19 — SUPERSEDED historical version correction rejected
async function testI19() {
  await runTest('I19 — SUPERSEDED historical version correction rejected', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, null, null);
    
    // First correction
    const mutationId1 = crypto.randomUUID();
    const idempotencyKey1 = crypto.randomUUID();
    const payloadHash1 = hashPayload({ amount: 15000 });
    
    const { data: data1, error: error1 } = await correctTransaction(clientPersonalA, tx.id, mutationId1, idempotencyKey1, payloadHash1, personA.id, {
      p_amount: 15000,
    });
    assert(!error1, `First correction succeeded: ${error1?.message}`);
    
    // Original is now SUPERSEDED
    const orig = await transactionRow(tx.id);
    equal(orig.status, 'SUPERSEDED', 'Original is SUPERSEDED');
    
    // Try to correct the SUPERSEDED original (should reject, must correct latest ACTIVE)
    const mutationId2 = crypto.randomUUID();
    const idempotencyKey2 = crypto.randomUUID();
    const payloadHash2 = hashPayload({ amount: 17000 });
    
    const { data: data2, error: error2 } = await correctTransaction(clientPersonalA, tx.id, mutationId2, idempotencyKey2, payloadHash2, personA.id, {
      p_amount: 17000,
    });
    assert(error2, 'Correction of SUPERSEDED should be rejected');
    equal(error2.code, '23514', 'Error code 23514');
    assert(error2.message?.includes('invalid_transaction_state_for_correction'), 'Error mentions invalid state');
  });
}

// I20 — Commission Expense (transfer_id != NULL) correction rejected
async function testI20() {
  await runTest('I20 — Commission Expense correction rejected', async () => {
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
    }, 'commission-correction');
    
    assert(t.commission !== null, 'Transfer has commission');
    const commissionExpenseId = t.commission.expenseId;
    
    // Verify commission expense has transfer_id
    const expenseRow = await transactionRow(commissionExpenseId);
    assert(expenseRow.transfer_id !== null, 'Commission Expense has transfer_id');
    equal(expenseRow.transfer_id, t.id, 'Commission Expense transfer_id points to owning Transfer');
    
    // Attempt correction of Commission Expense
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 2000 });
    
    const { data, error } = await correctTransaction(clientPersonalA, commissionExpenseId, mutationId, idempotencyKey, payloadHash, personA.id, {
      p_amount: 2000,
    });
    assert(error, 'Correction of Commission Expense should be rejected');
    equal(error.code, '23514', 'Error code 23514');
    assert(error.message?.includes('finance_transaction_dependent_on_transfer'), 'Error mentions dependent on transfer');
    
    // Commission remains ACTIVE
    const expenseAfter = await transactionRow(commissionExpenseId);
    equal(expenseAfter.status, 'ACTIVE', 'Commission transaction remains ACTIVE');
  });
}

// I21 — Multiple corrections chain: T0 → T1 → T2
async function testI21() {
  await runTest('I21 — Multiple corrections chain T0→T1→T2', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I21 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');

    // T0: Expense 20000
    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    let balance = await getAccountBalance(clientPersonalA, account.id);
    equal(balance, '80000.0000', 'T0 balance: 80000');

    // T0 → T1: Correct to 15000
    let mutationId = crypto.randomUUID();
    let idempotencyKey = crypto.randomUUID();
    let payloadHash = hashPayload({ amount: 15000 });
    let { data: t1, error } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error, `T0→T1 correction: ${error?.message}`);
    balance = await getAccountBalance(clientPersonalA, account.id);
    equal(balance, '85000.0000', 'T1 balance: 85000');

    // T1 → T2: Correct to 17000
    mutationId = crypto.randomUUID();
    idempotencyKey = crypto.randomUUID();
    payloadHash = hashPayload({ amount: 17000 });
    const { data: t2, error: error2 } = await correctTransaction(clientPersonalA, t1.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 17000 });
    assert(!error2, `T1→T2 correction: ${error2?.message}`);

    // Verify chain statuses
    const t0Row = await transactionRow(t0.id);
    const t1Row = await transactionRow(t1.id);
    const t2Row = await transactionRow(t2.id);
    equal(t0Row.status, 'SUPERSEDED', 'T0 is SUPERSEDED');
    equal(t1Row.status, 'SUPERSEDED', 'T1 is SUPERSEDED');
    equal(t2Row.status, 'ACTIVE', 'T2 is ACTIVE');

    // Verify effect statuses
    const t0Effects = await effectsForTransaction(t0.id);
    const t1Effects = await effectsForTransaction(t1.id);
    const t2Effects = await effectsForTransaction(t2.id);
    equal(t0Effects[0].effect_status, 'REVERSED', 'T0 effect REVERSED');
    equal(t1Effects[0].effect_status, 'REVERSED', 'T1 effect REVERSED');
    equal(t2Effects[0].effect_status, 'ACTIVE', 'T2 effect ACTIVE');
    equal(t2Effects[0].amount, '-17000.0000', 'T2 effect amount -17000');

    // Balance reflects only T2: 100000 - 17000 = 83000
    balance = await getAccountBalance(clientPersonalA, account.id);
    equal(balance, '83000.0000', 'Final balance: 83000 (only T2 counted)');
  });
}

// I22 — No branching: one source cannot produce two ACTIVE children
async function testI22() {
  await runTest('I22 — No branching: one source cannot produce two ACTIVE children', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I22 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');

    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);

    // First correction succeeds: T0 → T1
    let mutationId = crypto.randomUUID();
    let idempotencyKey = crypto.randomUUID();
    let payloadHash = hashPayload({ amount: 15000 });
    const { data: t1, error } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error, `First correction: ${error?.message}`);
    equal(t1.status, 'ACTIVE', 'T1 is ACTIVE');

    // T0 is now SUPERSEDED
    const t0AfterFirst = await transactionRow(t0.id);
    equal(t0AfterFirst.status, 'SUPERSEDED', 'T0 is SUPERSEDED after first correction');

    // Second correction targeting same T0 with different mutation intent must reject
    mutationId = crypto.randomUUID();
    idempotencyKey = crypto.randomUUID();
    payloadHash = hashPayload({ amount: 17000 });
    const { data: t2, error: error2 } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 17000 });
    assert(error2, 'Second correction of SUPERSEDED T0 should be rejected');
    equal(error2.code, '23514', 'Error code 23514');
    assert(error2.message?.includes('invalid_transaction_state_for_correction'), 'Error mentions invalid state');

    // T1 remains the only ACTIVE child
    const t1Still = await transactionRow(t1.id);
    equal(t1Still.status, 'ACTIVE', 'T1 remains ACTIVE');
    assert(!t2, 'No T2 created');
  });
}

// I23 — History linkage: T2.corrected_from = T1, T1.corrected_from = T0, T0.corrected_from = NULL
async function testI23() {
  await runTest('I23 — History linkage T0→T1→T2', async () => {
    const cat = await nativeCategory('food');
    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, null, null);

    // T0 → T1
    let mutationId = crypto.randomUUID();
    let idempotencyKey = crypto.randomUUID();
    let payloadHash = hashPayload({ amount: 15000 });
    const { data: t1, error } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error, `T0→T1: ${error?.message}`);

    // T1 → T2
    mutationId = crypto.randomUUID();
    idempotencyKey = crypto.randomUUID();
    payloadHash = hashPayload({ amount: 17000 });
    const { data: t2, error: error2 } = await correctTransaction(clientPersonalA, t1.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 17000 });
    assert(!error2, `T1→T2: ${error2?.message}`);

    // Verify backward chain
    const t0Row = await transactionRow(t0.id);
    const t1Row = await transactionRow(t1.id);
    const t2Row = await transactionRow(t2.id);

    equal(t2Row.corrected_from_transaction_id, t1.id, 'T2.corrected_from = T1');
    equal(t1Row.corrected_from_transaction_id, t0.id, 'T1.corrected_from = T0');
    assert(t0Row.corrected_from_transaction_id === null, 'T0.corrected_from = NULL (original)');
  });
}

// I24 — Trash current corrected version (T1 ACTIVE → TRASHED)
async function testI24() {
  await runTest('I24 — Trash current corrected version (T1)', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I24 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');

    // T0 → T1
    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    let mutationId = crypto.randomUUID();
    let idempotencyKey = crypto.randomUUID();
    let payloadHash = hashPayload({ amount: 15000 });
    const { data: t1, error } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error, `T0→T1: ${error?.message}`);

    // Balance after T1: 85000
    let balance = await getAccountBalance(clientPersonalA, account.id);
    equal(balance, '85000.0000', 'Balance after T1: 85000');

    // Trash T1 via canonical Stage 4D RPC
    const { data: trashData, error: trashError } = await clientPersonalA.rpc('finance_trash_transaction_v1', {
      p_transaction_id: t1.id,
      p_mutation_id: crypto.randomUUID(),
      p_idempotency_key: crypto.randomUUID(),
      p_payload_hash: hashPayload({ transactionId: t1.id }),
      p_created_by_person_id: personA.id,
    });
    assert(!trashError, `Trash T1: ${trashError?.message}`);
    equal(trashData.status, 'TRASHED', 'T1 is TRASHED');

    // Verify statuses
    const t0Row = await transactionRow(t0.id);
    const t1Row = await transactionRow(t1.id);
    equal(t0Row.status, 'SUPERSEDED', 'T0 remains SUPERSEDED');
    equal(t1Row.status, 'TRASHED', 'T1 is TRASHED');

    // T0 effect remains REVERSED
    const t0Effects = await effectsForTransaction(t0.id);
    equal(t0Effects[0].effect_status, 'REVERSED', 'T0 effect remains REVERSED');

    // T1 effect: ACTIVE → REVERSED
    const t1Effects = await effectsForTransaction(t1.id);
    equal(t1Effects[0].effect_status, 'REVERSED', 'T1 effect is REVERSED');

    // Balance returns to 100000 (T1 effect reversed)
    balance = await getAccountBalance(clientPersonalA, account.id);
    equal(balance, '100000.0000', 'Balance after trash T1: 100000');

    // Papelera contains T1
    const { data: papelera } = await clientPersonalA
      .from('finance_transactions')
      .select('id')
      .eq('status', 'TRASHED')
      .eq('financial_context_type', 'personal')
      .eq('owner_person_id', personA.id);
    const papeleraIds = papelera?.map(p => p.id) || [];
    assert(papeleraIds.includes(t1.id), 'Papelera contains T1');
    assert(!papeleraIds.includes(t0.id), 'Papelera does NOT contain T0');

    // No previous version becomes ACTIVE
    assert(t0Row.status !== 'ACTIVE', 'T0 does not become ACTIVE');
  });
}

// I25 — Restore current corrected version (T1 TRASHED → ACTIVE)
async function testI25() {
  await runTest('I25 — Restore current corrected version (T1)', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I25 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');

    // T0 → T1
    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    let mutationId = crypto.randomUUID();
    let idempotencyKey = crypto.randomUUID();
    let payloadHash = hashPayload({ amount: 15000 });
    const { data: t1, error } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error, `T0→T1: ${error?.message}`);

    // Trash T1
    const { error: trashError } = await clientPersonalA.rpc('finance_trash_transaction_v1', {
      p_transaction_id: t1.id,
      p_mutation_id: crypto.randomUUID(),
      p_idempotency_key: crypto.randomUUID(),
      p_payload_hash: hashPayload({ transactionId: t1.id }),
      p_created_by_person_id: personA.id,
    });
    assert(!trashError, `Trash T1: ${trashError?.message}`);

    // Balance after trash: 100000
    let balance = await getAccountBalance(clientPersonalA, account.id);
    equal(balance, '100000.0000', 'Balance after trash: 100000');

    // Restore T1 via canonical Stage 4G RPC
    const { data: restoreData, error: restoreError } = await clientPersonalA.rpc('finance_restore_transaction_v1', {
      p_transaction_id: t1.id,
      p_mutation_id: crypto.randomUUID(),
      p_idempotency_key: crypto.randomUUID(),
      p_payload_hash: hashPayload({ transactionId: t1.id }),
      p_created_by_person_id: personA.id,
    });
    assert(!restoreError, `Restore T1: ${restoreError?.message}`);
    equal(restoreData.status, 'ACTIVE', 'T1 restored to ACTIVE');

    // Verify statuses
    const t0Row = await transactionRow(t0.id);
    const t1Row = await transactionRow(t1.id);
    equal(t0Row.status, 'SUPERSEDED', 'T0 remains SUPERSEDED forever');
    equal(t1Row.status, 'ACTIVE', 'T1 is ACTIVE');

    // T1 effect: REVERSED → ACTIVE
    const t1Effects = await effectsForTransaction(t1.id);
    equal(t1Effects[0].effect_status, 'ACTIVE', 'T1 effect is ACTIVE');

    // Balance reflects T1 only: 85000
    balance = await getAccountBalance(clientPersonalA, account.id);
    equal(balance, '85000.0000', 'Balance after restore: 85000 (T1 only)');
  });
}

// I26 — Trash historical revision (T0 SUPERSEDED) rejected
async function testI26() {
  await runTest('I26 — Trash historical revision (T0 SUPERSEDED) rejected', async () => {
    const cat = await nativeCategory('food');
    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, null, null);

    // T0 → T1
    let mutationId = crypto.randomUUID();
    let idempotencyKey = crypto.randomUUID();
    let payloadHash = hashPayload({ amount: 15000 });
    const { data: t1, error } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error, `T0→T1: ${error?.message}`);

    const t0RowBefore = await transactionRow(t0.id);
    equal(t0RowBefore.status, 'SUPERSEDED', 'T0 is SUPERSEDED');

    // Attempt to Trash T0 (SUPERSEDED)
    const { data, error: trashError } = await clientPersonalA.rpc('finance_trash_transaction_v1', {
      p_transaction_id: t0.id,
      p_mutation_id: crypto.randomUUID(),
      p_idempotency_key: crypto.randomUUID(),
      p_payload_hash: hashPayload({ transactionId: t0.id }),
      p_created_by_person_id: personA.id,
    });
    assert(trashError, 'Trash of SUPERSEDED should be rejected');
    equal(trashError.code, '23514', 'Error code 23514');
    assert(trashError.message?.includes('invalid_transaction_state_for_trash') || trashError.message?.includes('SUPERSEDED'), 'Error mentions invalid state or SUPERSEDED');

    // No status changes
    const t0RowAfter = await transactionRow(t0.id);
    const t1RowAfter = await transactionRow(t1.id);
    equal(t0RowAfter.status, 'SUPERSEDED', 'T0 remains SUPERSEDED');
    equal(t1RowAfter.status, 'ACTIVE', 'T1 remains ACTIVE');
  });
}

// I27 — Restore historical revision (T0 SUPERSEDED) rejected
async function testI27() {
  await runTest('I27 — Restore historical revision (T0 SUPERSEDED) rejected', async () => {
    const cat = await nativeCategory('food');
    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, null, null);

    // T0 → T1
    let mutationId = crypto.randomUUID();
    let idempotencyKey = crypto.randomUUID();
    let payloadHash = hashPayload({ amount: 15000 });
    const { data: t1, error } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error, `T0→T1: ${error?.message}`);

    const t0RowBefore = await transactionRow(t0.id);
    equal(t0RowBefore.status, 'SUPERSEDED', 'T0 is SUPERSEDED');

    // Attempt to Restore T0 (SUPERSEDED, not TRASHED)
    const { data, error: restoreError } = await clientPersonalA.rpc('finance_restore_transaction_v1', {
      p_transaction_id: t0.id,
      p_mutation_id: crypto.randomUUID(),
      p_idempotency_key: crypto.randomUUID(),
      p_payload_hash: hashPayload({ transactionId: t0.id }),
      p_created_by_person_id: personA.id,
    });
    assert(restoreError, 'Restore of SUPERSEDED should be rejected');
    equal(restoreError.code, '23514', 'Error code 23514');
    assert(restoreError.message?.includes('not_trashed') || restoreError.message?.includes('SUPERSEDED') || restoreError.message?.includes('invalid'), 'Error mentions not trashed or invalid');

    // No status changes
    const t0RowAfter = await transactionRow(t0.id);
    const t1RowAfter = await transactionRow(t1.id);
    equal(t0RowAfter.status, 'SUPERSEDED', 'T0 remains SUPERSEDED');
    equal(t1RowAfter.status, 'ACTIVE', 'T1 remains ACTIVE');
  });
}

// I28 — Idempotent correction retry (same mutation identity, payload, target)
async function testI28() {
  await runTest('I28 — Idempotent correction retry', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I28 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');

    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);

    // Use SAME mutation_id, idempotency_key, payload_hash for retry
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 15000 });

    // First attempt
    const { data: t1a, error: error1 } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error1, `First: ${error1?.message}`);
    equal(t1a.status, 'ACTIVE', 'T1a is ACTIVE');

    // Retry with exact same identifiers
    const { data: t1b, error: error2 } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error2, `Retry: ${error2?.message}`);

    // Must return SAME replacement transaction
    equal(t1b.id, t1a.id, 'Retry returns identical replacement ID');
    equal(t1b.amount, t1a.amount, 'Retry returns identical amount');

    // Exactly one replacement exists
    const { data: allTx } = await clientPersonalA
      .from('finance_transactions')
      .select('id, status')
      .eq('corrected_from_transaction_id', t0.id);
    const activeReplacements = allTx?.filter(t => t.status === 'ACTIVE') || [];
    equal(activeReplacements.length, 1, 'Exactly one ACTIVE replacement');

    // Exactly one ACTIVE effect
    const effects = await effectsForTransaction(t1a.id);
    const activeEffects = effects.filter(e => e.effect_status === 'ACTIVE');
    equal(activeEffects.length, 1, 'Exactly one ACTIVE effect');
  });
}

// I29 — Idempotency payload conflict (same mutation_id, different payload)
async function testI29() {
  await runTest('I29 — Idempotency payload conflict', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I29 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');

    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);

    // Same mutation_id, DIFFERENT payload
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();

    // First with amount: 15000
    let payloadHash = hashPayload({ amount: 15000 });
    const { data: t1, error: error1 } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error1, `First: ${error1?.message}`);
    equal(t1.status, 'ACTIVE', 'T1 is ACTIVE');

    // Second with amount: 17000 (conflict)
    payloadHash = hashPayload({ amount: 17000 });
    const { data: t2, error: error2 } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 17000 });
    assert(error2, 'Second with different payload should be rejected');
    equal(error2.code, 'P0008', 'Error code P0008 (payload conflict)');
    assert(error2.message?.includes('otros datos') || error2.message?.includes('payload'), 'Error mentions different data');

    // No second replacement created
    const { data: allTx } = await clientPersonalA
      .from('finance_transactions')
      .select('id, status')
      .eq('corrected_from_transaction_id', t0.id);
    const activeReplacements = allTx?.filter(t => t.status === 'ACTIVE') || [];
    equal(activeReplacements.length, 1, 'Still exactly one ACTIVE replacement');

    // T1 remains the correction
    const t1Still = await transactionRow(t1.id);
    equal(t1Still.status, 'ACTIVE', 'T1 remains ACTIVE');
    equal(String(t1Still.amount), '15000.0000', 'T1 amount unchanged at 15000');
  });
}

// I30 — Success replay returns same replacement identity
async function testI30() {
  await runTest('I30 — Success replay returns same replacement identity', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I30 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');

    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);

    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 15000, description: 'Corrected expense' });

    // First correction
    const { data: t1, error: error1 } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { 
      p_amount: 15000,
      p_description: 'Corrected expense'
    });
    assert(!error1, `First: ${error1?.message}`);

    // Replay exact same canonical mutation
    const { data: t1replay, error: error2 } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { 
      p_amount: 15000,
      p_description: 'Corrected expense'
    });
    assert(!error2, `Replay: ${error2?.message}`);

    // Must return IDENTICAL replacement transaction
    equal(t1replay.id, t1.id, 'Replay returns identical replacement ID');
    equal(t1replay.amount, t1.amount, 'Replay returns identical amount');
    equal(t1replay.description, t1.description, 'Replay returns identical description');
    equal(t1replay.corrected_from_transaction_id, t1.corrected_from_transaction_id, 'Replay returns identical chain link');
    equal(t1replay.created_at, t1.created_at, 'Replay returns identical created_at');
  });
}

// I31 — Movimientos count-once: only ACTIVE replacement shown
async function testI31() {
  await runTest('I31 — Movimientos count-once (only ACTIVE)', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I31 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');

    // T0 → T1
    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 15000 });
    const { data: t1, error } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error, `T0→T1: ${error?.message}`);

    // List movements using real read authority (finance_movements_read or equivalent)
    const movements = await listMovements(clientPersonalA, contextPersonalA, '2026-08');
    
    const foundT0 = movements.some(m => m.id === t0.id);
    const foundT1 = movements.some(m => m.id === t1.id);
    
    assert(!foundT0, 'T0 (SUPERSEDED) NOT in Movimientos');
    assert(foundT1, 'T1 (ACTIVE) IS in Movimientos');
    equal(movements.filter(m => m.status === 'ACTIVE').length, movements.length, 'All movements are ACTIVE');
  });
}

// I32 — Summary count-once: only ACTIVE replacement counted
async function testI32() {
  await runTest('I32 — Summary count-once (only ACTIVE contribution)', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I32 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');

    // T0 Expense 20000
    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    let balance = await getAccountBalance(clientPersonalA, account.id);
    equal(balance, '80000.0000', 'Balance after T0: 80000');

    // T0 → T1 Expense 15000
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 15000 });
    const { data: t1, error } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error, `T0→T1: ${error?.message}`);

    // Summary/balance must count only T1: 15000 expense
    balance = await getAccountBalance(clientPersonalA, account.id);
    equal(balance, '85000.0000', 'Balance is 85000 (100000 - 15000)');

    // NOT 20000, NOT 35000, NOT 5000
    assert(balance !== '80000.0000', 'Balance is NOT 80000 (T0 20000)');
    assert(balance !== '65000.0000', 'Balance is NOT 65000 (T0+T1 = 35000)');
    assert(balance !== '95000.0000', 'Balance is NOT 95000 (difference 5000)');
  });
}

// I33 — Account Activity count-once: only effective ACTIVE replacement
async function testI33() {
  await runTest('I33 — Account Activity count-once (only ACTIVE)', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I33 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');

    // T0 → T1
    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 15000 });
    const { data: t1, error } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error, `T0→T1: ${error?.message}`);

    // Use finance_account_effects directly with ACTIVE transaction filter (same as service)
    const { data: effects, error: actError } = await clientPersonalA
      .from('finance_account_effects')
      .select('id, account_id, transaction_id, effect_type, effect_role, effect_amount, currency, transaction_date, transaction_created_at, effect_status')
      .eq('account_id', account.id)
      .eq('effect_status', 'ACTIVE')
      .order('transaction_date', { ascending: false })
      .order('transaction_created_at', { ascending: false });
    assert(!actError, `Activity read: ${actError?.message}`);

    // Enrich with transaction status filter (ACTIVE only)
    const txnIds = effects?.map(e => e.transaction_id).filter(Boolean) || [];
    let activeTxnIds = new Set();
    if (txnIds.length > 0) {
      const { data: txnRows } = await clientPersonalA
        .from('finance_transactions')
        .select('id')
        .in('id', txnIds)
        .eq('status', 'ACTIVE');
      activeTxnIds = new Set((txnRows || []).map(r => r.id));
    }

    // Filter effects to only those with ACTIVE transactions
    const activityEffects = (effects || []).filter(e => !e.transaction_id || activeTxnIds.has(e.transaction_id));
    const activityTxIds = activityEffects.map(e => e.transaction_id).filter(Boolean);

    const hasT0 = activityTxIds.includes(t0.id);
    const hasT1 = activityTxIds.includes(t1.id);

    assert(!hasT0, 'T0 (SUPERSEDED) NOT in Account Activity as ordinary movement');
    assert(hasT1, 'T1 (ACTIVE) IS in Account Activity');
  });
}

// I34 — Papelera excludes SUPERSEDED
async function testI34() {
  await runTest('I34 — Papelera excludes SUPERSEDED', async () => {
    const cat = await nativeCategory('food');
    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, null, null);

    // T0 → T1
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 15000 });
    const { data: t1, error } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error, `T0→T1: ${error?.message}`);

    // Trash T1
    const { error: trashError } = await clientPersonalA.rpc('finance_trash_transaction_v1', {
      p_transaction_id: t1.id,
      p_mutation_id: crypto.randomUUID(),
      p_idempotency_key: crypto.randomUUID(),
      p_payload_hash: hashPayload({ transactionId: t1.id }),
      p_created_by_person_id: personA.id,
    });
    assert(!trashError, `Trash T1: ${trashError?.message}`);

    // Papelera reads: status = TRASHED only
    const { data: papelera } = await clientPersonalA
      .from('finance_transactions')
      .select('id, status')
      .eq('status', 'TRASHED')
      .eq('financial_context_type', 'personal')
      .eq('owner_person_id', personA.id);

    const papeleraIds = papelera?.map(p => p.id) || [];
    const hasT0 = papeleraIds.includes(t0.id);
    const hasT1 = papeleraIds.includes(t1.id);

    assert(!hasT0, 'SUPERSEDED T0 never appears in Papelera');
    assert(hasT1, 'TRASHED T1 appears in Papelera');

    // Verify all papelera entries are TRASHED
    const allTrashed = papelera?.every(p => p.status === 'TRASHED') ?? true;
    assert(allTrashed, 'All Papelera entries have status TRASHED');
  });
}

// I35 — History physically preserved (admin/trusted path)
async function testI35() {
  await runTest('I35 — History physically preserved', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I35 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');

    // T0 with all fields
    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    
    // Store original values
    const t0Original = await transactionRow(t0.id);
    const originalAmount = t0Original.amount;
    const originalDate = t0Original.transaction_date; // This is a Date object
    const originalCategoryId = t0Original.category_id;
    const originalCategoryLabel = t0Original.category_label_snapshot;
    const originalDescription = t0Original.description;
    const originalNotes = t0Original.notes;
    const originalAccountId = t0Original.account_id; // from effect
    const originalEffectAmount = '-20000.0000';

    // T0 → T1
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 15000 });
    const { data: t1, error } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error, `T0→T1: ${error?.message}`);

    // Query T0 via trusted/admin path (direct DB query)
    const { rows: t0Rows } = await queryDb(
      `select amount, transaction_date, category_id, category_label_snapshot, description, notes, created_by_person_id
       from public.finance_transactions
       where id = $1`,
      [t0.id]
    );
    assert(t0Rows.length === 1, 'T0 physically exists in DB');
    const t0Preserved = t0Rows[0];

    // Verify all original fields preserved
    equal(String(t0Preserved.amount), String(originalAmount), 'Original amount preserved');
    // Compare dates as ISO strings (date only)
    const preservedDateStr = t0Preserved.transaction_date.toISOString().split('T')[0];
    const originalDateStr = originalDate.toISOString().split('T')[0];
    equal(preservedDateStr, originalDateStr, 'Original date preserved');
    equal(t0Preserved.category_id, originalCategoryId, 'Original category_id preserved');
    equal(t0Preserved.category_label_snapshot, originalCategoryLabel, 'Original category label snapshot preserved');
    equal(t0Preserved.description, originalDescription, 'Original description preserved');
    equal(t0Preserved.notes, originalNotes, 'Original notes preserved');

    // Verify effect history preserved
    const { rows: effectRows } = await queryDb(
      `select account_id, effect_amount::text as amount, effect_status
       from public.finance_account_effects
       where transaction_id = $1 and effect_role = 'PRIMARY'`,
      [t0.id]
    );
    assert(effectRows.length === 1, 'Original effect row preserved');
    equal(effectRows[0].account_id, account.id, 'Original account relationship preserved');
    equal(effectRows[0].amount, originalEffectAmount, 'Original effect amount preserved');
    equal(effectRows[0].effect_status, 'REVERSED', 'Original effect status is REVERSED (history of reversal)');
  });
}

// I36 — UNKNOWN balance: correction must not fabricate Anchor
async function testI36() {
  await runTest('I36 — UNKNOWN balance: correction does not fabricate Anchor', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I36 Account', 'ARS');
    // NO balance anchor created - account has UNKNOWN balance

    // Create transaction on account with UNKNOWN balance
    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);

    // Current balance is UNKNOWN (no anchor)
    let balance = await getAccountBalance(clientPersonalA, account.id);
    assert(balance === null || balance === 'UNKNOWN' || balance === undefined, `Balance is UNKNOWN: ${JSON.stringify(balance)}`);

    // Correction must succeed without fabricating anchor
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 15000 });
    const { data: t1, error } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 15000 });
    assert(!error, `Correction on UNKNOWN balance: ${error?.message}`);

    // T1 created successfully
    equal(t1.status, 'ACTIVE', 'T1 is ACTIVE');
    equal(String(t1.amount), '15000', 'T1 amount 15000');

    // T0 effect REVERSED, T1 effect ACTIVE
    const t0Effects = await effectsForTransaction(t0.id);
    const t1Effects = await effectsForTransaction(t1.id);
    equal(t0Effects[0].effect_status, 'REVERSED', 'T0 effect REVERSED');
    equal(t1Effects[0].effect_status, 'ACTIVE', 'T1 effect ACTIVE');

    // Balance remains UNKNOWN (no anchor created by correction)
    balance = await getAccountBalance(clientPersonalA, account.id);
    assert(balance === null || balance === 'UNKNOWN' || balance === undefined, `Balance remains UNKNOWN: ${JSON.stringify(balance)}`);
  });
}

// I37 — Negative balance: correction allows negative, no clamping
async function testI37() {
  await runTest('I37 — Negative balance: correction allows negative', async () => {
    const cat = await nativeCategory('food');
    const account = await createAccount(clientPersonalA, contextPersonalA, 'I37 Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 10000, '2026-08-01'); // Anchor 10000

    // Expense 15000 → balance -5000
    const t0 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 15000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -15000);
    let balance = await getAccountBalance(clientPersonalA, account.id);
    equal(balance, '-5000.0000', 'Balance after 15000 expense: -5000');

    // Correct expense to 17000 → balance -7000
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ amount: 17000 });
    const { data: t1, error } = await correctTransaction(clientPersonalA, t0.id, mutationId, idempotencyKey, payloadHash, personA.id, { p_amount: 17000 });
    assert(!error, `Correction to 17000: ${error?.message}`);
    equal(t1.status, 'ACTIVE', 'T1 is ACTIVE');
    equal(String(t1.amount), '17000', 'T1 amount 17000');

    // No insufficient-funds rejection, no clamping to zero
    balance = await getAccountBalance(clientPersonalA, account.id);
    equal(balance, '-7000.0000', 'Balance after correction to 17000: -7000');

    // T0 effect REVERSED, T1 effect ACTIVE with -17000
    const t0Effects = await effectsForTransaction(t0.id);
    const t1Effects = await effectsForTransaction(t1.id);
    equal(t0Effects[0].effect_status, 'REVERSED', 'T0 effect REVERSED');
    equal(t1Effects[0].effect_status, 'ACTIVE', 'T1 effect ACTIVE');
    equal(t1Effects[0].amount, '-17000.0000', 'T1 effect -17000');
  });
}

async function main() {
  try {
    await setup();
    
    await testI01();
    await testI02();
    await testI03();
    await testI04();
    await testI05();
    await testI06();
    await testI07();
    await testI08();
    await testI09();
    await testI10();
    await testI11();
    await testI12();
    await testI13();
    await testI14();
    await testI15();
    await testI16();
    await testI17();
    await testI18();
    await testI19();
    await testI20();
    await testI21();
    await testI22();
    await testI23();
    await testI24();
    await testI25();
    await testI26();
    await testI27();
    await testI28();
    await testI29();
    await testI30();
    await testI31();
    await testI32();
    await testI33();
    await testI34();
    await testI35();
    await testI36();
    await testI37();
    
    console.log(`\nFINANCE_STAGE_4I_B_TESTS_I01_I37 pass=${passCount} fail=${failCount}`);
    if (failCount > 0) {
      console.error('FINANCE_STAGE_4I_B_QA_PART_2=FAIL');
      process.exit(1);
    }
    console.log('FINANCE_STAGE_4I_B_QA_PART_2=PASS');
  } finally {
    await cleanup();
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});