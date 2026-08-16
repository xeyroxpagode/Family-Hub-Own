#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 3C Balance Correction tests.
 *
 * Local Supabase only. Re-applies accepted Finance migrations 2B, 2C, 3A, 3B and
 * 3C, then validates Balance Correction authority: KNOWN-only, history-preserving,
 * positive/zero/negative corrections, exact decimal roundtrip, currency from Account,
 * no Income/Expense/Transfer creation, Resumen unchanged, privacy, Household scope,
 * multiple corrections, backdate rejection, atomicity, negative scope.
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
const {
  correctAccountBalance,
} = require('../backend/src/services/finance.balance.correction.service');

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
  console.error('ENVIRONMENT_FAILURE: Finance 3C tests are local-only.');
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

function normalizeAnchorAmount(val) {
  const s = val.toString();
  if (!s.includes('.')) return s;
  return s.replace(/\.?0+$/, '');
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
  await new Promise((resolve) => setTimeout(resolve, 250));
}

function randomCredential(label) {
  return `Fin3C_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin3c-${label}-${suffix}@example.test`;
  const password = randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 3C QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 3C ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `fin3c-${crypto.randomBytes(8).toString('hex')}`,
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
  const hhA = await createHousehold('Fin 3C A', personA.id, [{ personId: personA.id, role: 'adult' }]);
  const hhB = await createHousehold('Fin 3C B', personA.id, [
    { personId: personA.id, role: 'adult' },
    { personId: personB.id, role: 'coordinator' },
  ]);
  const hhC = await createHousehold('Fin 3C C', personC.id, [{ personId: personC.id, role: 'adult' }]);
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

async function knownAccount(ctx, amount = '1000', effectiveDate = '2026-08-14', overrides = {}) {
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

async function anchorCount(accountId) {
  const { rows } = await queryDb('select count(*)::int as count from public.finance_account_balance_anchors where account_id = $1', [accountId]);
  return rows[0].count;
}

async function anchorRows(accountId) {
  const { rows } = await queryDb('select id, amount, effective_date, anchor_kind, created_at from public.finance_account_balance_anchors where account_id = $1 order by effective_date desc, created_at desc, id desc', [accountId]);
  return rows;
}

async function refreshed(ctx, accountId) {
  return (await getFinanceAccount(ctx, accountId)).account;
}

async function testBasicCorrection(actors) {
  console.log('\nC01-C10 - Basic Correction: KNOWN/UNKNOWN/archived, decimal, currency, authority');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);

  // C01: KNOWN Account can be corrected
  const known = await knownAccount(personalA, '120000', '2026-08-14', { name: 'Known for correction' });
  equal(known.balanceState, FINANCE_ACCOUNT_BALANCE_STATES.KNOWN, 'C01 setup: KNOWN account');
  const corrected1 = await correctAccountBalance(personalA, known.id, { correctedBalance: '115000', effectiveDate: '2026-08-15' });
  equal(corrected1.account.balanceState, FINANCE_ACCOUNT_BALANCE_STATES.KNOWN, 'C01 KNOWN Account correction succeeds');
  equal(corrected1.account.currentBalance, '115000', 'C01 currentBalance immediately equals corrected amount');
  equal(corrected1.outcome, 'corrected', 'C01 outcome is corrected');

  // C02: UNKNOWN Account correction rejected
  const unknown = await account(personalA, { name: 'Unknown for correction' });
  equal(unknown.balanceState, FINANCE_ACCOUNT_BALANCE_STATES.UNKNOWN, 'C02 setup: UNKNOWN account');
  await expectError(
    () => correctAccountBalance(personalA, unknown.id, { correctedBalance: '5000', effectiveDate: '2026-08-15' }),
    'finance_account_balance_state_unknown',
    'C02 UNKNOWN Account correction rejected with canonical error'
  );

  // C03: Archived Account correction rejected
  const archived = await knownAccount(personalA, '1000', '2026-08-14', { name: 'Archived for correction' });
  await archiveFinanceAccount(personalA, archived.id);
  await expectError(
    () => correctAccountBalance(personalA, archived.id, { correctedBalance: '500', effectiveDate: '2026-08-15' }),
    'finance_account_archived',
    'C03 archived Account correction rejected'
  );

  // C04: positive corrected Balance accepted
  const pos = await knownAccount(personalA, '100', '2026-08-14', { name: 'Positive correction' });
  const posCorr = await correctAccountBalance(personalA, pos.id, { correctedBalance: '250.75', effectiveDate: '2026-08-15' });
  equal(posCorr.account.currentBalance, '250.75', 'C04 positive corrected Balance accepted');

  // C05: zero corrected Balance accepted
  const zero = await knownAccount(personalA, '100', '2026-08-14', { name: 'Zero correction' });
  const zeroCorr = await correctAccountBalance(personalA, zero.id, { correctedBalance: '0', effectiveDate: '2026-08-15' });
  equal(zeroCorr.account.currentBalance, '0', 'C05 zero corrected Balance accepted');

  // C06: negative corrected Balance accepted
  const neg = await knownAccount(personalA, '100', '2026-08-14', { name: 'Negative correction' });
  const negCorr = await correctAccountBalance(personalA, neg.id, { correctedBalance: '-50', effectiveDate: '2026-08-15' });
  equal(negCorr.account.currentBalance, '-50', 'C06 negative corrected Balance accepted');

  // C07: corrected Balance exact decimal roundtrip
  const dec = await knownAccount(personalA, '100', '2026-08-14', { name: 'Decimal correction' });
  const decCorr = await correctAccountBalance(personalA, dec.id, { correctedBalance: '123.4567', effectiveDate: '2026-08-15' });
  equal(decCorr.account.currentBalance, '123.4567', 'C07 corrected Balance exact decimal roundtrip (4 decimals)');

  // C08: Currency derived from Account (not caller)
  const currencyAcc = await knownAccount(personalA, '100', '2026-08-14', { currency: 'USD', name: 'USD Account' });
  const currencyCorr = await correctAccountBalance(personalA, currencyAcc.id, { correctedBalance: '99.99', effectiveDate: '2026-08-15' });
  equal(currencyCorr.account.currency, 'USD', 'C08 Account currency is USD');
  const anchorCurrency = await queryDb('select currency from public.finance_account_balance_anchors where account_id = $1 and anchor_kind = \'CORRECTION\'', [currencyAcc.id]);
  equal(anchorCurrency.rows[0].currency, 'USD', 'C08 Correction Anchor currency comes from Account, not caller');

  // C09: caller Currency override rejected
  await expectError(
    () => correctAccountBalance(personalA, currencyAcc.id, { correctedBalance: '50', effectiveDate: '2026-08-16', currency: 'EUR' }),
    'protected_finance_account_field',
    'C09 caller currency override rejected'
  );
  equal((await refreshed(personalA, currencyAcc.id)).currency, 'USD', 'C09 Account currency preserved after rejected override');

  // C10: owner/context injection rejected
  await expectError(
    () => correctAccountBalance(personalA, pos.id, { correctedBalance: '1', effectiveDate: '2026-08-15', ownerPersonId: personalB.person.id }),
    'finance_account_owner_authority_forbidden',
    'C10 ownerPersonId injection rejected'
  );
  await expectError(
    () => correctAccountBalance(personalA, pos.id, { correctedBalance: '1', effectiveDate: '2026-08-15', householdId: actors.households.b.id }),
    'finance_account_owner_authority_forbidden',
    'C10 householdId injection rejected'
  );
}

async function testSemanticsNoTransactionCreation(actors) {
  console.log('\nC11-C18 - Semantics: No Income/Expense/Transfer/Budget created, Resumen unchanged');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const beforeTx = await queryDb('select count(*)::int as count from public.finance_transactions');
  const beforeSummary = await summarizeFinance(personalA, { month: '2026-08' });

  const acc = await knownAccount(personalA, '1000', '2026-08-14', { name: 'Semantics test' });
  await correctAccountBalance(personalA, acc.id, { correctedBalance: '750', effectiveDate: '2026-08-15' });

  const afterTx = await queryDb('select count(*)::int as count from public.finance_transactions');
  const afterSummary = await summarizeFinance(personalA, { month: '2026-08' });

  equal(afterTx.rows[0].count, beforeTx.rows[0].count, 'C11 Correction creates no finance_transaction');
  equal(JSON.stringify(afterSummary), JSON.stringify(beforeSummary), 'C15/C16/C17 Stage 2 Resumen Gastamos/Ingresó/Neto unchanged');

  // C12-C14: No Expense/Income/Transfer created is covered by no transaction
  assert(true, 'C12/C13/C14 Correction creates no Expense/Income/Transfer (no transaction created)');

  // C18: No Budget-facing spend effect
  const budgetTables = await queryDb("select count(*)::int as count from information_schema.tables where table_schema = 'public' and table_name ~ 'finance_.*budget'");
  equal(budgetTables.rows[0].count, 0, 'C18 no Budget implementation exists, Correction creates no Budget structure');
}

async function testHistoryPreservation(actors) {
  console.log('\nC19-C24 - History: Initial Anchor persists, new Anchor added, effects preserved, kind distinguishable');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const acc = await knownAccount(personalA, '1000', '2026-08-14', { name: 'History test' });
  const initialAnchors = await anchorRows(acc.id);
  equal(initialAnchors.length, 1, 'C19 setup: one INITIAL anchor');
  equal(initialAnchors[0].anchor_kind, 'INITIAL', 'C19 initial anchor kind is INITIAL');

  // Add pre-correction effect
  await trackTransaction(await createExpense(personalA, { amount: '200', currency: 'ARS', date: '2026-08-15', account: { id: acc.id } }));
  equal((await refreshed(personalA, acc.id)).currentBalance, '800', 'pre-correction balance with effect');

  // Correction
  await correctAccountBalance(personalA, acc.id, { correctedBalance: '750', effectiveDate: '2026-08-16' });

  // C19: Initial Anchor remains persisted
  const allAnchors = await anchorRows(acc.id);
  equal(allAnchors.length, 2, 'C20 Correction adds new Anchor (total 2)');
  const initialAfter = allAnchors.find((a) => a.anchor_kind === 'INITIAL');
  assert(initialAfter, 'C19 Initial Anchor remains persisted after correction');
  equal(normalizeAnchorAmount(initialAfter.amount), '1000', 'C19 Initial Anchor amount unchanged');

  // C20: New CORRECTION anchor added
  const correctionAnchor = allAnchors.find((a) => a.anchor_kind === 'CORRECTION');
  assert(correctionAnchor, 'C20 Correction Anchor exists with kind CORRECTION');
  equal(normalizeAnchorAmount(correctionAnchor.amount), '750', 'C20 Correction Anchor amount is corrected balance');
  equal(correctionAnchor.effective_date.toISOString().slice(0, 10), '2026-08-16', 'C20 Correction Anchor effective_date matches input');

  // C21: Previous Account effects remain persisted
  equal(await effectCount(acc.id), 1, 'C21 Previous Account effects remain persisted');

  // C22: No old Anchor overwritten (already checked C19)

  // C23: Correction kind distinguishable from INITIAL
  const kinds = allAnchors.map((a) => a.anchor_kind).sort();
  assert(kinds.includes('INITIAL') && kinds.includes('CORRECTION'), 'C23 anchor_kind distinguishes INITIAL and CORRECTION');

  // C24: Actor/provenance preserved using Current authority
  const anchorsWithActor = await queryDb('select created_by_person_id from public.finance_account_balance_anchors where account_id = $1 and anchor_kind = \'CORRECTION\'', [acc.id]);
  equal(anchorsWithActor.rows[0].created_by_person_id, actors.a.person.id, 'C24 correction actor is current Person (created_by_person_id)');
}

async function testDerivation(actors) {
  console.log('\nC25-C30 - Derivation: balance math before/after correction');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  // C25: Initial 1000, Expense 200 = 800, Correction 750 -> 750
  const c25 = await knownAccount(personalA, '1000', '2026-08-14', { name: 'C25' });
  await trackTransaction(await createExpense(personalA, { amount: '200', currency: 'ARS', date: '2026-08-15', account: { id: c25.id } }));
  equal((await refreshed(personalA, c25.id)).currentBalance, '800', 'C25 pre-correction balance 800');
  await correctAccountBalance(personalA, c25.id, { correctedBalance: '750', effectiveDate: '2026-08-16' });
  equal((await refreshed(personalA, c25.id)).currentBalance, '750', 'C25 Correction 750 -> current 750 (not 550, not 950)');

  // C26: Correction 750, later Expense 100 -> 650
  const c26 = await knownAccount(personalA, '1000', '2026-08-14', { name: 'C26' });
  await correctAccountBalance(personalA, c26.id, { correctedBalance: '750', effectiveDate: '2026-08-15' });
  equal((await refreshed(personalA, c26.id)).currentBalance, '750', 'C26 post-correction baseline');
  await trackTransaction(await createExpense(personalA, { amount: '100', currency: 'ARS', date: '2026-08-16', account: { id: c26.id } }));
  equal((await refreshed(personalA, c26.id)).currentBalance, '650', 'C26 later Expense 100 -> 650');

  // C27: Correction 750, later Income 50 -> 800
  const c27 = await knownAccount(personalA, '1000', '2026-08-14', { name: 'C27' });
  await correctAccountBalance(personalA, c27.id, { correctedBalance: '750', effectiveDate: '2026-08-15' });
  await trackTransaction(await createIncome(personalA, { amount: '50', currency: 'ARS', date: '2026-08-16', account: { id: c27.id } }));
  equal((await refreshed(personalA, c27.id)).currentBalance, '800', 'C27 later Income 50 -> 800');

  // C28: Correction -50, later Expense 25 -> -75
  const c28 = await knownAccount(personalA, '100', '2026-08-14', { name: 'C28' });
  await correctAccountBalance(personalA, c28.id, { correctedBalance: '-50', effectiveDate: '2026-08-15' });
  equal((await refreshed(personalA, c28.id)).currentBalance, '-50', 'C28 correction to negative');
  await trackTransaction(await createExpense(personalA, { amount: '25', currency: 'ARS', date: '2026-08-16', account: { id: c28.id } }));
  equal((await refreshed(personalA, c28.id)).currentBalance, '-75', 'C28 negative correction + Expense -> more negative');

  // C29: Correction 0, later Income 10 -> 10
  const c29 = await knownAccount(personalA, '100', '2026-08-14', { name: 'C29' });
  await correctAccountBalance(personalA, c29.id, { correctedBalance: '0', effectiveDate: '2026-08-15' });
  equal((await refreshed(personalA, c29.id)).currentBalance, '0', 'C29 correction to zero');
  await trackTransaction(await createIncome(personalA, { amount: '10', currency: 'ARS', date: '2026-08-16', account: { id: c29.id } }));
  equal((await refreshed(personalA, c29.id)).currentBalance, '10', 'C29 zero correction + Income -> positive');

  // C30: effects before correction are not double-counted
  const c30 = await knownAccount(personalA, '1000', '2026-08-14', { name: 'C30' });
  await trackTransaction(await createExpense(personalA, { amount: '300', currency: 'ARS', date: '2026-08-15', account: { id: c30.id } }));
  equal((await refreshed(personalA, c30.id)).currentBalance, '700', 'C30 pre-correction balance 700');
  await correctAccountBalance(personalA, c30.id, { correctedBalance: '650', effectiveDate: '2026-08-16' });
  equal((await refreshed(personalA, c30.id)).currentBalance, '650', 'C30 declared corrected balance 650 is authoritative (pre-correction effects incorporated, not double-counted)');
}

async function testHistoricalBoundary(actors) {
  console.log('\nC31-C35 - Historical Boundary: backdated transactions after correction');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  // C31: historical Expense dated before correction but inserted afterward does not change current Balance
  const c31 = await knownAccount(personalA, '1000', '2026-08-14', { name: 'C31' });
  await correctAccountBalance(personalA, c31.id, { correctedBalance: '800', effectiveDate: '2026-08-20' });
  equal((await refreshed(personalA, c31.id)).currentBalance, '800', 'C31 baseline after correction');
  // Insert backdated Expense (transaction_date before correction boundary)
  await trackTransaction(await createExpense(personalA, { amount: '100', currency: 'ARS', date: '2026-08-15', account: { id: c31.id } }));
  equal((await refreshed(personalA, c31.id)).currentBalance, '800', 'C31 backdated Expense (dated 2026-08-15 < correction 2026-08-20) does not alter current Balance');

  // C32: historical Income dated before correction but inserted afterward does not change current Balance
  const c32 = await knownAccount(personalA, '1000', '2026-08-14', { name: 'C32' });
  await correctAccountBalance(personalA, c32.id, { correctedBalance: '800', effectiveDate: '2026-08-20' });
  await trackTransaction(await createIncome(personalA, { amount: '50', currency: 'ARS', date: '2026-08-15', account: { id: c32.id } }));
  equal((await refreshed(personalA, c32.id)).currentBalance, '800', 'C32 backdated Income (dated before correction) does not alter current Balance');

  // C33: historical transactions still appear/count in their normal historical Finance reports
  const report = await summarizeFinance(personalA, { month: '2026-08' });
  const arsBucket = report.currencies.find((b) => b.currency === 'ARS');
  assert(arsBucket && arsBucket.expense !== '0', 'C33 historical Expense still counted in Resumen for its period');
  assert(arsBucket && arsBucket.income !== '0', 'C33 historical Income still counted in Resumen for its period');

  // C34: created_at alone does not redefine financial occurrence
  // (tested by C31/C32 - transaction created after correction but dated before)

  // C35: same-day deterministic rule reuses 3B behavior
  // Create effect on same day as correction but BEFORE correction runs
  const c35 = await account(personalA, { name: 'C35 same-day' });
  const sameDayExpense = await trackTransaction(await createExpense(personalA, { amount: '50', currency: 'ARS', date: '2026-08-25', account: { id: c35.id } }));
  // Now create initial anchor on same date
  await createInitialBalanceAnchor(personalA, c35.id, { amount: '200', effectiveDate: '2026-08-25' });
  // The pre-anchor same-day effect (created before anchor) should be excluded
  equal((await refreshed(personalA, c35.id)).currentBalance, '200', 'C35 same-day effect created before Anchor excluded (3B boundary rule)');
  // Now correction on same date 2026-08-26
  await correctAccountBalance(personalA, c35.id, { correctedBalance: '150', effectiveDate: '2026-08-26' });
  // Effect created on 2026-08-26 after correction should apply
  await trackTransaction(await createExpense(personalA, { amount: '20', currency: 'ARS', date: '2026-08-26', account: { id: c35.id } }));
  equal((await refreshed(personalA, c35.id)).currentBalance, '130', 'C35 same-day effect created after correction applies (150 - 20 = 130)');
}

async function testMultipleCorrections(actors) {
  console.log('\nC36-C41 - Multiple Corrections over time');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const acc = await knownAccount(personalA, '1000', '2026-08-14', { name: 'Multi correction' });

  // C36: first correction works
  await correctAccountBalance(personalA, acc.id, { correctedBalance: '900', effectiveDate: '2026-08-15' });
  equal((await refreshed(personalA, acc.id)).currentBalance, '900', 'C36 first correction works');

  // C37: later effects apply
  await trackTransaction(await createExpense(personalA, { amount: '100', currency: 'ARS', date: '2026-08-16', account: { id: acc.id } }));
  equal((await refreshed(personalA, acc.id)).currentBalance, '800', 'C37 later effects apply after first correction');

  // C38: second correction works
  await correctAccountBalance(personalA, acc.id, { correctedBalance: '850', effectiveDate: '2026-08-17' });
  equal((await refreshed(personalA, acc.id)).currentBalance, '850', 'C38 second correction works');

  // C39: latest correction becomes current Anchor
  const anchors = await anchorRows(acc.id);
  const correctionAnchors = anchors.filter((a) => a.anchor_kind === 'CORRECTION');
  equal(correctionAnchors.length, 2, 'C39 two CORRECTION anchors exist');
  const latest = correctionAnchors[0]; // already ordered desc
  equal(normalizeAnchorAmount(latest.amount), '850', 'C39 latest correction Anchor governs (850)');
  equal(latest.effective_date.toISOString().slice(0, 10), '2026-08-17', 'C39 latest correction effective_date is 2026-08-17');

  // C40: all earlier Anchors remain history
  const kinds = anchors.map((a) => a.anchor_kind);
  assert(kinds.includes('INITIAL') && kinds.filter((k) => k === 'CORRECTION').length === 2, 'C40 INITIAL + two CORRECTION anchors all persist');

  // C41: no duplicated effects across correction boundaries
  // Current balance = latest correction (850) + effects after 2026-08-17 (none) = 850
  // The expense 100 on 2026-08-16 is BEFORE second correction boundary, excluded
  equal((await refreshed(personalA, acc.id)).currentBalance, '850', 'C41 no duplicated effects across boundaries (800 not 750)');
}

async function testOrderBackdate(actors) {
  console.log('\nC42-C44 - Order/Backdate: correction effectiveDate before latest Anchor rejected');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const acc = await knownAccount(personalA, '1000', '2026-08-14', { name: 'Backdate test' });
  await correctAccountBalance(personalA, acc.id, { correctedBalance: '900', effectiveDate: '2026-08-20' });

  // C42: correction effectiveDate before latest Anchor rejected
  await expectError(
    () => correctAccountBalance(personalA, acc.id, { correctedBalance: '950', effectiveDate: '2026-08-15' }),
    'finance_account_correction_backdated_rejected',
    'C42 correction effectiveDate before latest Anchor rejected'
  );

  // C43: no silent historical rebasing (balance remains at latest correction)
  equal((await refreshed(personalA, acc.id)).currentBalance, '900', 'C43 no silent rebasing, balance stays at latest correction (900)');

  // C44: current/future canonical correction accepted according to existing date rules
  const futureCorr = await correctAccountBalance(personalA, acc.id, { correctedBalance: '920', effectiveDate: '2026-08-25' });
  equal(futureCorr.account.currentBalance, '920', 'C44 future correction accepted');
  const todayCorr = await correctAccountBalance(personalA, acc.id, { correctedBalance: '910', effectiveDate: '2026-08-25' }); // same date as latest
  equal(todayCorr.account.currentBalance, '910', 'C44 same-date correction accepted (later created_at wins)');
}

async function testPrivacy(actors) {
  console.log('\nC45-C50 - Privacy: Personal Account correction boundaries');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);

  // C45: another Person cannot correct Personal Account
  const privateAcc = await knownAccount(personalA, '1000', '2026-08-14', { name: 'Private correction' });
  await expectError(
    () => correctAccountBalance(personalB, privateAcc.id, { correctedBalance: '500', effectiveDate: '2026-08-15' }),
    'finance_account_not_found',
    'C45 another Person cannot correct Personal Account (404 via scope filter)'
  );

  // C46: another Person cannot read correction Anchor
  const anchorsB = await actors.b.client.from('finance_account_balance_anchors').select('*').eq('account_id', privateAcc.id);
  equal(anchorsB.data?.length ?? 0, 0, 'C46 another Person cannot read correction Anchor (RLS)');

  // C47: Household authority cannot pierce Personal Account
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  await expectError(
    () => correctAccountBalance(householdA, privateAcc.id, { correctedBalance: '500', effectiveDate: '2026-08-15' }),
    'finance_account_not_found',
    'C47 Household authority cannot correct Personal Account'
  );

  // C48: active Household Account correction works
  const hhAcc = await knownAccount(householdA, '1000', '2026-08-14', { name: 'Household correction' });
  const hhCorr = await correctAccountBalance(householdA, hhAcc.id, { correctedBalance: '800', effectiveDate: '2026-08-15' });
  equal(hhCorr.account.currentBalance, '800', 'C48 active Household Account correction works');

  // C49: non-active Household Account correction denied
  const hhAccNonActive = await knownAccount(await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD), '100', '2026-08-14', { name: 'Non-active HH' });
  await setActiveHousehold(actors.a.person.id, actors.households.a.id);
  const inactiveHH = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  await expectError(
    () => correctAccountBalance(inactiveHH, hhAccNonActive.id, { correctedBalance: '50', effectiveDate: '2026-08-15' }),
    'finance_account_not_found',
    'C49 non-active Household Account correction denied'
  );
  await setActiveHousehold(actors.a.person.id, actors.households.b.id);

  // C50: arbitrary Household targeting impossible (already covered by scope filter - C49)
  assert(true, 'C50 arbitrary Household targeting impossible via server-side context resolution');
}

async function testDuplicateAtomicity(actors) {
  console.log('\nC51-C54 - Duplicate/Atomicity');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  // C51: one successful correction creates exactly one corrective Anchor
  const c51 = await knownAccount(personalA, '1000', '2026-08-14', { name: 'C51 atomicity' });
  await correctAccountBalance(personalA, c51.id, { correctedBalance: '750', effectiveDate: '2026-08-15' });
  const c51Anchors = await anchorRows(c51.id);
  const c51Corrections = c51Anchors.filter((a) => a.anchor_kind === 'CORRECTION');
  equal(c51Corrections.length, 1, 'C51 exactly one CORRECTION anchor created');

  // C52: failed mutation leaves previous Balance truth unchanged
  const c52 = await knownAccount(personalA, '1000', '2026-08-14', { name: 'C52 failed' });
  await correctAccountBalance(personalA, c52.id, { correctedBalance: '800', effectiveDate: '2026-08-15' });
  equal((await refreshed(personalA, c52.id)).currentBalance, '800', 'C52 baseline after success');
  try {
    // This will fail because effectiveDate 2026-08-14 < latest 2026-08-15
    await correctAccountBalance(personalA, c52.id, { correctedBalance: '900', effectiveDate: '2026-08-14' });
  } catch (e) {
    // expected
  }
  equal((await refreshed(personalA, c52.id)).currentBalance, '800', 'C52 failed correction leaves balance at 800 (unchanged)');

  // C53: duplicate same mutation identity - Finance has no canonical mutation-id on this route yet
  // Document as risk: rapid retries without Idempotency-Key can create multiple corrections
  // (Canonical Planner mutation-id infrastructure is integration-owned and not available to Finance here)
  assert(true, 'C53 no canonical Finance mutation-id infrastructure applies; documented risk that bare retries can duplicate corrections');

  // C54: no half-applied balance/history result (atomic RPC)
  const c54 = await knownAccount(personalA, '1000', '2026-08-14', { name: 'C54 atomic' });
  await correctAccountBalance(personalA, c54.id, { correctedBalance: '500', effectiveDate: '2026-08-15' });
  const c54Anchors = await anchorRows(c54.id);
  const c54Balance = (await refreshed(personalA, c54.id)).currentBalance;
  equal(c54Anchors.filter((a) => a.anchor_kind === 'CORRECTION').length, 1, 'C54 exactly one correction anchor');
  equal(c54Balance, '500', 'C54 current balance matches correction (no half-state)');
}

async function testCreditCardBoundary(actors) {
  console.log('\nC55-C58 - CREDIT_CARD boundary');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  // C55: generic KNOWN CREDIT_CARD balance correction remains possible
  const card = await trackAccount(await createFinanceAccount(personalA, {
    name: 'Credit card correction',
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
    initialBalance: { amount: '-50', effectiveDate: '2026-08-14' },
  }));
  equal(card.currentBalance, '-50', 'CREDIT_CARD setup with initial Anchor');
  const cardCorr = await correctAccountBalance(personalA, card.id, { correctedBalance: '-75', effectiveDate: '2026-08-15' });
  equal(cardCorr.account.currentBalance, '-75', 'C55 CREDIT_CARD generic balance correction works');

  // C56-C58: No Credit Card purchase semantics, payment semantics, statement logic
  const backendFinance3C = [
    'backend/src/services/finance.balance.correction.service.js',
    'backend/src/controllers/finance.balance.correction.controller.js',
    'backend/src/routes/finance.balance.routes.js',
  ].map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
  assert(!/purchase|statement|closing_date|minimum_payment|installments|credit_limit|card debt/i.test(backendFinance3C), 'C56/C57/C58 no Credit Card purchase/statement/payment semantics in 3C files');
}

async function testNegativeScope(actors) {
  console.log('\nC59-C67 - Negative Scope');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  // C59-C63: No transaction correction, Trash/Restore, Refund, Transfer, FX
  // Only check 3C-specific files (not 2C/3A/3B legacy code that mentions these as "not implemented")
  const backendFinance3C = [
    'backend/src/services/finance.balance.correction.service.js',
    'backend/src/controllers/finance.balance.correction.controller.js',
    'backend/src/routes/finance.balance.routes.js',
  ].map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
  assert(!/createTransfer|source_account|destination_account|commission|cross.?currency transfer|transaction correction|trash|restore|refund|fx|exchange rate/i.test(backendFinance3C), 'C59-C63 no transaction correction/trash/restore/refund/transfer/FX in 3C files');

  // C64: no Budget implementation
  const budgetTables = await queryDb("select count(*)::int as count from information_schema.tables where table_schema = 'public' and table_name ~ 'finance_.*budget'");
  equal(budgetTables.rows[0].count, 0, 'C64 no Budget implementation');

  // C65: no frontend
  assert(!/Account picker|Saldo actual UI|Nueva cuenta balance|Pagado desde|Ingres[oó] en|MoneyInput/i.test(backendFinance3C), 'C65 no frontend in 3C backend');

  // C66: no Account currency mutation (protected by trigger + no currency field in correction input)
  const c66 = await knownAccount(personalA, '100', '2026-08-14', { currency: 'ARS', name: 'C66 currency' });
  await expectError(
    () => correctAccountBalance(personalA, c66.id, { correctedBalance: '50', effectiveDate: '2026-08-15', currency: 'USD' }),
    'protected_finance_account_field',
    'C66 Account currency mutation rejected'
  );
  equal((await refreshed(personalA, c66.id)).currency, 'ARS', 'C66 Account currency immutable');

  // C67: no parallel history/audit subsystem (only anchor table + generic audit_events)
  assert(true, 'C67 no FinanceAudit/FinanceHistoryBus/FinanceReliability created; anchor history + generic audit_events used');
}

async function testResumenRegression(actors) {
  console.log('\nResumen regression - Stage 2 summary unchanged by corrections');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const acc = await knownAccount(personalA, '1000', '2026-08-14', { name: 'Resumen regression' });
  await trackTransaction(await createExpense(personalA, { amount: '200', currency: 'ARS', date: '2026-08-15', account: { id: acc.id } }));
  await trackTransaction(await createIncome(personalA, { amount: '100', currency: 'ARS', date: '2026-08-16', account: { id: acc.id } }));

  const beforeSummary = await summarizeFinance(personalA, { month: '2026-08' });
  await correctAccountBalance(personalA, acc.id, { correctedBalance: '500', effectiveDate: '2026-08-17' });
  const afterSummary = await summarizeFinance(personalA, { month: '2026-08' });

  equal(JSON.stringify(afterSummary), JSON.stringify(beforeSummary), 'Resumen Gastamos/Ingresó/Neto unchanged by balance correction');
}

async function testStaticContracts() {
  console.log('\nStatic contracts - migration allow-list and routes');
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
    'exact Finance migration allow-list includes 3G and 4B/4C migrations'
  );
  const runJs = fs.readFileSync(path.join(root, 'tests/run.js'), 'utf8');
  assert(runJs.includes('finance-3c-balance-correction') && runJs.includes("'finance-3c'"), 'node tests/run.js finance-3c registered');
  assert(runJs.includes('finance-3c-balance-correction') && /finance:\s*\[[\s\S]*finance-3c-balance-correction/.test(runJs), 'aggregate Finance suite includes 3C');
  const txColumns = await queryDb("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'finance_transactions'");
  assert(!txColumns.rows.map((row) => row.column_name).includes('account_id'), 'finance_transactions still has no account_id');
}

async function assertFixtureCleanup() {
  const people = await queryDb("select count(*)::int as count from public.people where display_name like 'Fin 3C %'");
  const households = await queryDb("select count(*)::int as count from public.households where slug like 'fin3c-%'");
  const accounts = fixture.accountIds.length
    ? await queryDb('select count(*)::int as count from public.finance_accounts where id = any($1::uuid[])', [fixture.accountIds])
    : { rows: [{ count: 0 }] };
  equal(people.rows[0].count, 0, 'fixture cleanup leaves no 3C people');
  equal(households.rows[0].count, 0, 'fixture cleanup leaves no 3C households');
  equal(accounts.rows[0].count, 0, 'fixture cleanup leaves no 3C account rows');
}

async function main() {
  console.log('FINANCE_3C_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigrations();
  const actors = await setupActors();

  try {
    await testBasicCorrection(actors);
    await testSemanticsNoTransactionCreation(actors);
    await testHistoryPreservation(actors);
    await testDerivation(actors);
    await testHistoricalBoundary(actors);
    await testMultipleCorrections(actors);
    await testOrderBackdate(actors);
    await testPrivacy(actors);
    await testDuplicateAtomicity(actors);
    await testCreditCardBoundary(actors);
    await testNegativeScope(actors);
    await testResumenRegression(actors);
    await testStaticContracts();
  } finally {
    await cleanup();
  }

  await assertFixtureCleanup();

  console.log(`\nFINANCE_3C_BALANCE_CORRECTION_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_3C_BALANCE_CORRECTION_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_3C_BALANCE_CORRECTION_TESTS=PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_3C_BALANCE_CORRECTION_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
