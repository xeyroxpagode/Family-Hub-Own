#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 4F Papelera Read + Minimal UI tests.
 *
 * Local Supabase only. Validates canonical Trash read for Expense/Income
 * and the minimal Papelera surface integration.
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
const readService = require('../backend/src/services/finance.read.service');

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
  console.error('ENVIRONMENT_FAILURE: Finance 4F tests are local-only.');
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
  return `Fin4F_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin4f-${label}-${suffix}@example.test`;
  const password = await randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 4F QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPersonDb(authUserId, label) {
  const { rows } = await queryDb(
    `INSERT INTO people (auth_user_id, display_name, default_language, personal_settings) 
     VALUES ($1, $2, 'es-419', '{}') RETURNING *`,
    [authUserId, `Fin 4F ${label}`]
  );
  const person = rows[0];
  fixture.personIds.push(person.id);
  return person;
}

async function createHouseholdDb(name, ownerPersonId, members) {
  const slug = `fin4f-${crypto.randomBytes(8).toString('hex')}`;
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
    requestId: `fin4f-req-${label}-${crypto.randomBytes(4).toString('hex')}`,
    mutationId: `fin4f-mut-${label}-${crypto.randomBytes(4).toString('hex')}`,
    idempotencyKey: `fin4f-key-${label}-${crypto.randomBytes(4).toString('hex')}`,
  };
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
  const hhA = await createHouseholdDb('Fin 4F A', personA.id, [{ personId: personA.id, role: 'adult' }]);
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

// F01 — Personal trashed Expense appears in Personal Papelera
async function testF01() {
  await runTest('F01 — Personal trashed Expense appears in Personal Papelera', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    
    const resolved = await resolvedContext(userA.user, tokenA, FINANCE_CONTEXT_TYPES.PERSONAL);
    const trashResult = await readService.listFinanceTrash(resolved, {});
    
    const found = trashResult.movements.some(m => m.id === tx.id);
    assert(found, 'Personal trashed Expense appears in Personal Papelera');
    equal(trashResult.contextType, 'personal', 'Context type is personal');
    assert(trashResult.movements.length > 0, 'Papelera has movements');
  });
}

// F02 — Personal trashed Income appears
async function testF02() {
  await runTest('F02 — Personal trashed Income appears', async () => {
    const cat = await nativeCategory('salary');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'income', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    
    const resolved = await resolvedContext(userA.user, tokenA, FINANCE_CONTEXT_TYPES.PERSONAL);
    const trashResult = await readService.listFinanceTrash(resolved, {});
    
    const found = trashResult.movements.some(m => m.id === tx.id);
    assert(found, 'Personal trashed Income appears in Personal Papelera');
    const movement = trashResult.movements.find(m => m.id === tx.id);
    equal(movement.transactionType, 'income', 'Movement type is income');
  });
}

// F03 — ACTIVE Expense does NOT appear
async function testF03() {
  await runTest('F03 — ACTIVE Expense does NOT appear', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    const resolved = await resolvedContext(userA.user, tokenA, FINANCE_CONTEXT_TYPES.PERSONAL);
    const trashResult = await readService.listFinanceTrash(resolved, {});
    
    const found = trashResult.movements.some(m => m.id === tx.id);
    assert(!found, 'ACTIVE Expense does NOT appear in Papelera');
  });
}

// F04 — ACTIVE Income does NOT appear
async function testF04() {
  await runTest('F04 — ACTIVE Income does NOT appear', async () => {
    const cat = await nativeCategory('salary');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'income', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    const resolved = await resolvedContext(userA.user, tokenA, FINANCE_CONTEXT_TYPES.PERSONAL);
    const trashResult = await readService.listFinanceTrash(resolved, {});
    
    const found = trashResult.movements.some(m => m.id === tx.id);
    assert(!found, 'ACTIVE Income does NOT appear in Papelera');
  });
}

// F05 — Another Person's Personal trashed transaction is invisible
async function testF05() {
  await runTest('F05 — Another Person\'s Personal trashed transaction is invisible', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    
    // User B's personal context should not see User A's trashed transaction
    const resolvedB = await resolvedContext(userB.user, tokenB, FINANCE_CONTEXT_TYPES.PERSONAL);
    const trashResult = await readService.listFinanceTrash(resolvedB, {});
    
    const found = trashResult.movements.some(m => m.id === tx.id);
    assert(!found, 'Another Person\'s Personal trashed transaction is invisible');
  });
}

// F06 — Active Household trashed transaction appears in Household Papelera
async function testF06() {
  await runTest('F06 — Active Household trashed transaction appears in Household Papelera', async () => {
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientHouseholdA, contextHouseholdA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    await trashTransaction(clientHouseholdA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    
    const resolved = await resolvedContext(userA.user, tokenA, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
    const trashResult = await readService.listFinanceTrash(resolved, {});
    
    const found = trashResult.movements.some(m => m.id === tx.id);
    assert(found, 'Household trashed Expense appears in Household Papelera');
    equal(trashResult.contextType, 'household', 'Context type is household');
  });
}

// F07 — Inactive/arbitrary Household data is inaccessible
async function testF07() {
  await runTest('F07 — Inactive/arbitrary Household data is inaccessible', async () => {
    // Create another household that User A is NOT a member of
    const userC = await createAuthUser('c');
    const personC = await createPersonDb(userC.user.id, 'C');
    const hhC = await createHouseholdDb('Fin 4F C', personC.id, [{ personId: personC.id, role: 'adult' }]);
    await setActiveHouseholdDb(personC.id, hhC.household.id);
    const tokenC = await signIn(userC.email, userC.password);
    const clientC = tokenClient(tokenC);
    const contextC = await resolvedContext(userC.user, tokenC, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
    
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientC, contextC, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label);
    
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    
    await trashTransaction(clientC, tx.id, mutationId, idempotencyKey, payloadHash, personC.id);
    
    // User A's household context should NOT see Household C's trashed transaction
    const resolvedA = await resolvedContext(userA.user, tokenA, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
    const trashResult = await readService.listFinanceTrash(resolvedA, {});
    
    const found = trashResult.movements.some(m => m.id === tx.id);
    assert(!found, 'Inactive/arbitrary Household data is inaccessible');
    
    // Cleanup C
    fixture.authUserIds.push(userC.user.id);
    fixture.personIds.push(personC.id);
    fixture.householdIds.push(hhC.household.id);
  });
}

// F08 — Ordering uses trashed_at DESC
async function testF08() {
  await runTest('F08 — Ordering uses trashed_at DESC', async () => {
    const cat = await nativeCategory('food');
    
    // Create first transaction, trash it
    const tx1 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 10000, 'ARS', '2026-08-10', cat.id, cat.label);
    const mutationId1 = crypto.randomUUID();
    const idempotencyKey1 = crypto.randomUUID();
    const payloadHash1 = hashPayload({ transactionId: tx1.id });
    await trashTransaction(clientPersonalA, tx1.id, mutationId1, idempotencyKey1, payloadHash1, personA.id);
    
    // Small delay to ensure different trashed_at
    await new Promise(r => setTimeout(r, 50));
    
    // Create second transaction, trash it
    const tx2 = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-12', cat.id, cat.label);
    const mutationId2 = crypto.randomUUID();
    const idempotencyKey2 = crypto.randomUUID();
    const payloadHash2 = hashPayload({ transactionId: tx2.id });
    await trashTransaction(clientPersonalA, tx2.id, mutationId2, idempotencyKey2, payloadHash2, personA.id);
    
    const resolved = await resolvedContext(userA.user, tokenA, FINANCE_CONTEXT_TYPES.PERSONAL);
    const trashResult = await readService.listFinanceTrash(resolved, {});
    
    // Most recently trashed should be first
    assert(trashResult.movements.length >= 2, 'At least 2 trashed movements');
    const first = trashResult.movements[0];
    const second = trashResult.movements[1];
    
    // trashed_at of first should be >= second (DESC order)
    const firstTrashed = new Date(first.trashedAt).getTime();
    const secondTrashed = new Date(second.trashedAt).getTime();
    assert(firstTrashed >= secondTrashed, 'Ordering uses trashed_at DESC (most recent first)');
  });
}

// F09 — Papelera empty state exists (implicitly tested by empty results)
async function testF09() {
  await runTest('F09 — Papelera empty state exists', async () => {
    // Fresh context with no trashed transactions
    const userD = await createAuthUser('d');
    const personD = await createPersonDb(userD.user.id, 'D');
    const tokenD = await signIn(userD.email, userD.password);
    const resolved = await resolvedContext(userD.user, tokenD, FINANCE_CONTEXT_TYPES.PERSONAL);
    
    const trashResult = await readService.listFinanceTrash(resolved, {});
    
    equal(trashResult.movements.length, 0, 'Papelera is empty for fresh context');
    equal(trashResult.contextType, 'personal', 'Context type is personal');
    
    fixture.authUserIds.push(userD.user.id);
    fixture.personIds.push(personD.id);
  });
}

// F10 — Finance overflow has real Papelera entry (frontend static check)
async function testF10() {
  await runTest('F10 — Finance overflow has real Papelera entry (static)', () => {
    const screen = fs.readFileSync(path.join(root, 'front/mi-front-limpio/screens/finance/FinanceScreen.tsx'), 'utf8');
    assert(screen.includes('openPapelera'), 'FinanceScreen has openPapelera function');
    assert(screen.includes('Papelera'), 'FinanceScreen overflow contains Papelera label');
    assert(screen.includes('trash-outline'), 'FinanceScreen uses trash icon for Papelera');
    assert(screen.includes('FinancePapelera'), 'FinanceScreen navigates to FinancePapelera');
  });
}

// F11 — Selecting Papelera reaches the real surface (frontend static check)
async function testF11() {
  await runTest('F11 — Selecting Papelera reaches the real surface (static)', () => {
    const screen = fs.readFileSync(path.join(root, 'front/mi-front-limpio/screens/finance/FinancePapeleraScreen.tsx'), 'utf8');
    assert(screen.includes('export function FinancePapeleraScreen'), 'FinancePapeleraScreen component exists');
    assert(screen.includes('listFinanceTrash'), 'FinancePapeleraScreen calls listFinanceTrash service');
    assert(screen.includes('Papelera vac'), 'FinancePapeleraScreen has empty state');
  });
}

// F12 — No Restore action exists yet
async function testF12() {
  await runTest('F12 — No Restore action exists yet', () => {
    const screen = fs.readFileSync(path.join(root, 'front/mi-front-limpio/screens/finance/FinancePapeleraScreen.tsx'), 'utf8');
    const detailSheet = fs.readFileSync(path.join(root, 'front/mi-front-limpio/components/finance/MovementDetailSheet.tsx'), 'utf8');
    
    assert(!screen.includes('Restaurar'), 'No Restore in Papelera screen');
    assert(!screen.includes('restaurar'), 'No restore in Papelera screen');
    assert(!detailSheet.includes('Restaurar'), 'No Restore in MovementDetailSheet');
    assert(!screen.includes('restore'), 'No restore endpoint call in Papelera screen');
  });
}

// F13 — No hard-delete action exists
async function testF13() {
  await runTest('F13 — No hard-delete action exists', () => {
    const screen = fs.readFileSync(path.join(root, 'front/mi-front-limpio/screens/finance/FinancePapeleraScreen.tsx'), 'utf8');
    
    assert(!screen.includes('Eliminar definitivamente'), 'No hard delete in Papelera screen');
    assert(!screen.includes('eliminar definitivamente'), 'No hard delete in Papelera screen');
    assert(!screen.includes('hard.delete'), 'No hard delete endpoint call');
  });
}

// F14 — Transfer projection is not pulled into this slice
async function testF14() {
  await runTest('F14 — Transfer projection is not pulled into this slice', async () => {
    const resolved = await resolvedContext(userA.user, tokenA, FINANCE_CONTEXT_TYPES.PERSONAL);
    const trashResult = await readService.listFinanceTrash(resolved, {});
    
    const hasTransfer = trashResult.movements.some(m => m.transactionType === 'transfer');
    assert(!hasTransfer, 'No transfer transactions in Papelera');
    
    // Verify service doesn't include TRANSFER type
    const serviceCode = fs.readFileSync(path.join(root, 'backend/src/services/finance.read.service.js'), 'utf8');
    assert(serviceCode.includes('FINANCE_TRANSACTION_TYPES.INCOME') && serviceCode.includes('FINANCE_TRANSACTION_TYPES.EXPENSE'), 'Service only queries EXPENSE and INCOME types');
    assert(!serviceCode.includes('TRANSFER'), 'Service does not include TRANSFER type in trash query');
  });
}

// F15 — Account Activity excludes TRASHED movements from its normal active recent list
async function testF15() {
  await runTest('F15 — Account Activity excludes TRASHED movements from active list', async () => {
    const account = await createAccount(clientPersonalA, contextPersonalA, 'Test Activity Account', 'ARS');
    await createBalanceAnchor(clientPersonalA, contextPersonalA, account.id, 100000, '2026-08-01');
    
    const cat = await nativeCategory('food');
    const tx = await createTransaction(clientPersonalA, contextPersonalA, 'expense', 20000, 'ARS', '2026-08-15', cat.id, cat.label, account.id, -20000);
    
    // Verify it appears in account activity BEFORE trash
    const activityBefore = await clientPersonalA
      .from('finance_account_effects')
      .select('id, transaction_id, effect_status')
      .eq('account_id', account.id)
      .eq('transaction_id', tx.id);
    assert(!activityBefore.error, 'Activity query works');
    assert(activityBefore.data.length > 0, 'Effect exists before trash');
    
    // Trash the transaction
    const mutationId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const payloadHash = hashPayload({ transactionId: tx.id });
    await trashTransaction(clientPersonalA, tx.id, mutationId, idempotencyKey, payloadHash, personA.id);
    
    // Verify account effect is REVERSED
    const effects = await effectsForTransaction(tx.id);
    assert(effects.length > 0, 'Effect row exists');
    equal(effects[0].effect_status, 'REVERSED', 'Effect is REVERSED after trash');
    
    // Verify the activity service filters out TRASHED transactions
    const activityService = require('../backend/src/services/finance.account.activity.service');
    const context = await resolvedContext(userA.user, tokenA, FINANCE_CONTEXT_TYPES.PERSONAL);
    const activityResult = await activityService.listFinanceAccountActivity(context, account.id, { limit: 10 });
    
    const foundInActivity = activityResult.activity.some(a => a.transactionId === tx.id);
    assert(!foundInActivity, 'TRASHED transaction excluded from Account Activity');
  });
}

async function main() {
  try {
    await setup();
    
    await testF01();
    await testF02();
    await testF03();
    await testF04();
    await testF05();
    await testF06();
    await testF07();
    await testF08();
    await testF09();
    await testF10();
    await testF11();
    await testF12();
    await testF13();
    await testF14();
    await testF15();
    
    console.log(`\nFINANCE_STAGE_4F_TESTS pass=${passCount} fail=${failCount}`);
    if (failCount > 0) {
      console.error('FINANCE_STAGE_4F_PAPELERA_READ_UI_TESTS=FAIL');
      process.exit(1);
    }
    console.log('FINANCE_STAGE_4F_PAPELERA_READ_UI_TESTS=PASS');
  } finally {
    await cleanup();
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});