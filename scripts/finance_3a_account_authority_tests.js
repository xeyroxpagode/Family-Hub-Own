#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 3A Account Authority + First-use tests.
 *
 * Local Supabase only. Re-applies accepted Finance migrations 2B, 2C and 3A,
 * then validates persistent Account authority, explicit first-use creation,
 * Personal/Household ownership, UNKNOWN balance semantics and lifecycle.
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
  getFinanceAccount,
  listFinanceAccounts,
  unarchiveFinanceAccount,
  updateFinanceAccount,
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
  console.error('ENVIRONMENT_FAILURE: Finance 3A tests are local-only.');
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

async function accountRowCount() {
  const exists = await queryDb("select to_regclass('public.finance_accounts') as table_name");
  if (!exists.rows[0].table_name) return 0;
  const count = await queryDb('select count(*)::int as count from public.finance_accounts');
  return count.rows[0].count;
}

async function applyMigrations() {
  const before = await accountRowCount();
  await applyMigration('supabase/migrations/20260813010000_finance_category_authority_v1_1.sql');
  await applyMigration('supabase/migrations/20260813020000_finance_expense_income_transactions_v1_1.sql');
  await applyMigration('supabase/migrations/20260814010000_finance_account_authority_v1_1.sql');
  await applyMigration('supabase/migrations/20260814020000_finance_balance_anchor_account_effects_v1_1.sql');
  await new Promise((resolve) => setTimeout(resolve, 250));
  const after = await accountRowCount();
  equal(after, before, 'A02 migration creates zero Account rows');
}

function randomCredential(label) {
  return `Fin3A_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin3a-${label}-${suffix}@example.test`;
  const password = randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 3A QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 3A ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `fin3a-${crypto.randomBytes(8).toString('hex')}`,
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
  const hhA = await createHousehold('Fin 3A A', personA.id, [{ personId: personA.id, role: 'adult' }]);
  const hhB = await createHousehold('Fin 3A B', personA.id, [
    { personId: personA.id, role: 'adult' },
    { personId: personB.id, role: 'coordinator' },
  ]);
  const hhC = await createHousehold('Fin 3A C', personC.id, [{ personId: personC.id, role: 'adult' }]);
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

async function persistedAccount(id) {
  const { rows } = await queryDb('select * from public.finance_accounts where id = $1', [id]);
  if (!rows[0]) throw new Error(`account missing: ${id}`);
  return rows[0];
}

async function testFirstUse(actors) {
  console.log('\nA01-A09 - first-use and zero Account state');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const firstList = await listFinanceAccounts(personalA);
  equal(firstList.accounts.length, 0, 'A01 0 Accounts is valid');

  await listFinanceMovements(personalA, { month: '2026-08' });
  await summarizeFinance(personalA, { month: '2026-08' });
  equal((await listFinanceAccounts(personalA)).accounts.length, 0, 'A03 Finance reads do not create Account');

  const expense = await trackTransaction(await createExpense(personalA, { amount: 10, currency: 'ARS', date: '2026-08-14' }));
  const income = await trackTransaction(await createIncome(personalA, { amount: 20, currency: 'ARS', date: '2026-08-14' }));
  assert(!('accountId' in expense) && !('accountId' in income), 'A04/A05 Expense and Income without Account remain valid');
  equal((await listFinanceAccounts(personalA)).accounts.length, 0, 'A09 Account only exists after explicit POST/create');

  const defaults = await queryDb("select count(*)::int as count from public.finance_accounts where name in ('Efectivo', 'Ahorros', 'Cash', 'Savings', 'Default Account', 'Primary Account')");
  equal(defaults.rows[0].count, 0, 'A06/A07 no Efectivo/Ahorros/default Account seeded');

  const txColumns = await queryDb(`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'finance_transactions'
  `);
  assert(!txColumns.rows.map((row) => row.column_name).includes('account_id'), 'A08 no hidden default Account ID / no transaction account_id');
}

async function testCreateAndUnknownBalance(actors) {
  console.log('\nA10-A30 - create contract and UNKNOWN balance');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  const personalAccount = await trackAccount(await createFinanceAccount(personalA, {
    name: '  Mercado Pago  ',
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.ACCOUNT,
  }));
  equal(personalAccount.name, 'Mercado Pago', 'A10/A14/A15 create Personal ACCOUNT with trimmed required name');
  equal(personalAccount.accountType, FINANCE_ACCOUNT_TYPES.ACCOUNT, 'A20 ACCOUNT accepted');
  equal(personalAccount.currency, 'ARS', 'A16/A17 explicit uppercase currency persisted');
  equal(personalAccount.status, FINANCE_ACCOUNT_STATUSES.ACTIVE, 'new Account is ACTIVE');
  equal(personalAccount.balanceState, FINANCE_ACCOUNT_BALANCE_STATES.UNKNOWN, 'A24 newly created Account balance state is UNKNOWN');
  assert(!('balance' in personalAccount) && personalAccount.currentBalance === null, 'A25 UNKNOWN is not represented as numeric zero');

  const card = await trackAccount(await createFinanceAccount(personalA, {
    name: 'Visa Galicia',
    currency: 'USD',
    accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
  }));
  equal(card.accountType, FINANCE_ACCOUNT_TYPES.CREDIT_CARD, 'A11/A21 Personal CREDIT_CARD type persists as type only');

  const householdAccount = await trackAccount(await createFinanceAccount(householdA, {
    name: 'Casa comun',
    currency: 'ARS',
    account_type: FINANCE_ACCOUNT_TYPES.ACCOUNT,
  }));
  equal(householdAccount.householdId, actors.households.b.id, 'A12 active-Household ACCOUNT derives active Household');

  const movementCount = await queryDb('select count(*)::int as count from public.finance_transactions where owner_person_id = $1 or household_id = $2', [actors.a.person.id, actors.households.b.id]);
  assert(movementCount.rows[0].count >= 0, 'A13 Account persists independently before any Account-linked movement');

  await expectError(() => createFinanceAccount(personalA, { currency: 'ARS', accountType: 'ACCOUNT' }), 'invalid_finance_account_name', 'A14 missing Name rejected');
  await expectError(() => createFinanceAccount(personalA, { name: '   ', currency: 'ARS', accountType: 'ACCOUNT' }), 'invalid_finance_account_name', 'A15 whitespace Name rejected');
  await expectError(() => createFinanceAccount(personalA, { name: 'X', accountType: 'ACCOUNT' }), 'finance_account_currency_required', 'A16 missing Currency rejected');
  await expectError(() => createFinanceAccount(personalA, { name: 'X', currency: 'ars', accountType: 'ACCOUNT' }), 'invalid_finance_account_currency', 'A18 lowercase Currency rejected');
  await expectError(() => createFinanceAccount(personalA, { name: 'X', currency: 'AR', accountType: 'ACCOUNT' }), 'invalid_finance_account_currency', 'A18 invalid Currency rejected');
  await expectError(() => createFinanceAccount(personalA, { name: 'X', currency: 'ARS' }), 'finance_account_type_required', 'A19 Type required');
  await expectError(() => createFinanceAccount(personalA, { name: 'X', currency: 'ARS', accountType: 'CASH' }), 'invalid_finance_account_type', 'A22 arbitrary type rejected');
  await expectError(() => createFinanceAccount(personalA, { name: 'Visa Foo', currency: 'ARS' }), 'finance_account_type_required', 'A23 no Type inferred from Name');

  const beforeTx = await queryDb('select count(*)::int as count from public.finance_transactions');
  const beforeAnchors = await queryDb("select count(*)::int as count from information_schema.tables where table_schema = 'public' and table_name ~ 'finance_.*(anchor|balance)'");
  await expectError(() => createFinanceAccount(personalA, { name: 'X', currency: 'ARS', accountType: 'ACCOUNT', balance: 0 }), 'finance_account_balance_field_not_supported', 'A29 caller balance rejected');
  await expectError(() => createFinanceAccount(personalA, { name: 'X', currency: 'ARS', accountType: 'ACCOUNT', currentBalance: 0 }), 'finance_account_balance_field_not_supported', 'A29 caller currentBalance rejected');
  await expectError(() => createFinanceAccount(personalA, { name: 'X', currency: 'ARS', accountType: 'ACCOUNT', openingBalance: 0 }), 'finance_account_balance_field_not_supported', 'A29 caller openingBalance rejected');
  await expectError(() => createFinanceAccount(personalA, { name: 'X', currency: 'ARS', accountType: 'ACCOUNT', anchorAmount: 1 }), 'finance_account_balance_field_not_supported', 'A30 caller anchor fields rejected');
  const afterTx = await queryDb('select count(*)::int as count from public.finance_transactions');
  const afterAnchors = await queryDb("select count(*)::int as count from information_schema.tables where table_schema = 'public' and table_name ~ 'finance_.*(anchor|balance)'");
  equal(afterTx.rows[0].count, beforeTx.rows[0].count, 'A27/A28 no Income/Expense created to represent Account balance');
  equal(afterAnchors.rows[0].count, beforeAnchors.rows[0].count, 'A26 no opening balance row/fact/table created');

  return { personalAccount, card, householdAccount };
}

async function testOwnershipAndPrivacy(actors, created) {
  console.log('\nA31-A46 - ownership, privacy and active Household authority');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const householdB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  const personalRow = await persistedAccount(created.personalAccount.id);
  equal(personalRow.owner_person_id, actors.a.person.id, 'A31 Personal derives current Person server-side');
  equal(personalRow.household_id, null, 'A32 Personal has no household owner');

  const listB = await listFinanceAccounts(personalB);
  assert(!listB.accounts.some((account) => account.id === created.personalAccount.id), 'A33 another Person cannot list Personal Account');
  await expectError(() => getFinanceAccount(personalB, created.personalAccount.id), 'finance_account_not_found', 'A34 another Person cannot read detail');
  await expectError(() => updateFinanceAccount(personalB, created.personalAccount.id, { name: 'Nope' }), 'finance_account_not_found', 'A35 another Person cannot edit');
  await expectError(() => archiveFinanceAccount(personalB, created.personalAccount.id), 'finance_account_not_found', 'A36 another Person cannot archive');
  await expectError(() => unarchiveFinanceAccount(personalB, created.personalAccount.id), 'finance_account_not_found', 'A36 another Person cannot unarchive');
  const householdRoleList = await listFinanceAccounts(householdB);
  assert(!householdRoleList.accounts.some((account) => account.id === created.personalAccount.id), 'A37 coordinator/membership does not pierce Personal Account privacy');

  const householdRow = await persistedAccount(created.householdAccount.id);
  equal(householdRow.household_id, actors.households.b.id, 'A38 Household derives active Household server-side');
  equal(householdRow.owner_person_id, null, 'A39 Household has no Personal owner');

  await expectError(() => createFinanceAccount(personalA, { name: 'X', currency: 'ARS', accountType: 'ACCOUNT', personId: actors.b.person.id }), 'finance_account_owner_authority_forbidden', 'A41 arbitrary personId rejected');
  await expectError(() => createFinanceAccount(personalA, { name: 'X', currency: 'ARS', accountType: 'ACCOUNT', ownerPersonId: actors.b.person.id }), 'finance_account_owner_authority_forbidden', 'A42 arbitrary ownerPersonId rejected');
  await expectError(() => createFinanceAccount(householdA, { name: 'X', currency: 'ARS', accountType: 'ACCOUNT', householdId: actors.households.a.id }), 'finance_account_owner_authority_forbidden', 'A43 arbitrary householdId rejected');
  await expectError(() => createFinanceAccount(householdA, { name: 'X', currency: 'ARS', accountType: 'ACCOUNT', membershipId: 'caller-membership' }), 'finance_account_owner_authority_forbidden', 'A44 arbitrary membershipId rejected');

  await setActiveHousehold(actors.a.person.id, actors.households.a.id);
  const afterSwitchCtx = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const switchedList = await listFinanceAccounts(afterSwitchCtx);
  assert(!switchedList.accounts.some((account) => account.id === created.householdAccount.id), 'A40 additional non-active Household membership cannot target Account');
  const switchedAccount = await trackAccount(await createFinanceAccount(afterSwitchCtx, { name: 'Cuenta HH A', currency: 'ARS', accountType: 'ACCOUNT' }));
  equal(switchedAccount.householdId, actors.households.a.id, 'A45 global Household switch A->B changes future HOUSEHOLD authority');
  const activeAfter = await queryDb('select active_household_id from public.people where id = $1', [actors.a.person.id]);
  equal(activeAfter.rows[0].active_household_id, actors.households.a.id, 'A46 Finance request does not mutate active Household');
  await setActiveHousehold(actors.a.person.id, actors.households.b.id);
}

async function testReadEditLifecycle(actors, created) {
  console.log('\nA47-A67 - read, edit and lifecycle');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  const personalList = await listFinanceAccounts(personalA);
  assert(personalList.accounts.some((account) => account.id === created.personalAccount.id), 'A47 list Personal shows current Person Accounts');
  assert(!personalList.accounts.some((account) => account.id === created.householdAccount.id), 'A47 Personal list excludes Household Accounts');

  const householdList = await listFinanceAccounts(householdA);
  assert(householdList.accounts.some((account) => account.id === created.householdAccount.id), 'A48 list Household shows active Household Accounts');
  assert(!householdList.accounts.some((account) => account.id === created.personalAccount.id), 'A48 Household list excludes Personal Accounts');
  assert(householdList.accounts.every((account) => account.status === FINANCE_ACCOUNT_STATUSES.ACTIVE), 'A49 default list shows ACTIVE only');

  const emptyPersonal = await resolvedContext(actors.c, FINANCE_CONTEXT_TYPES.PERSONAL);
  equal((await listFinanceAccounts(emptyPersonal)).accounts.length, 0, 'A50 0 Account list returns [] truthfully');

  const detail = await getFinanceAccount(personalA, created.personalAccount.id);
  equal(detail.account.id, created.personalAccount.id, 'A51 Account detail returns canonical persisted metadata');
  assert(!('balance' in detail.account) && detail.account.balanceState === FINANCE_ACCOUNT_BALANCE_STATES.UNKNOWN && detail.account.currentBalance === null, 'A52 unknown balance detail does not fabricate 0');

  const renamed = await updateFinanceAccount(personalA, created.personalAccount.id, { name: '  Mercado Pago Principal  ' });
  equal(renamed.account.name, 'Mercado Pago Principal', 'A53 Account Name can be safely renamed');
  await expectError(() => updateFinanceAccount(personalA, created.personalAccount.id, { financialContextType: 'household' }), 'protected_finance_account_field', 'A54 Financial Context cannot change via edit');
  await expectError(() => updateFinanceAccount(personalA, created.personalAccount.id, { ownerPersonId: actors.b.person.id }), 'finance_account_owner_authority_forbidden', 'A55 owner Person cannot change via edit');
  await expectError(() => updateFinanceAccount(personalA, created.personalAccount.id, { householdId: actors.households.a.id }), 'finance_account_owner_authority_forbidden', 'A56 Household cannot change via edit');
  await expectError(() => updateFinanceAccount(personalA, created.personalAccount.id, { balanceState: 'KNOWN' }), 'protected_finance_account_field', 'A57 balance state cannot be caller-mutated through generic edit');
  await expectError(() => updateFinanceAccount(personalA, created.personalAccount.id, { lifecycle: 'ARCHIVED' }), 'protected_finance_account_field', 'A58 lifecycle cannot be caller-mutated through generic edit');
  await expectError(() => updateFinanceAccount(personalA, created.personalAccount.id, { accountType: 'CREDIT_CARD' }), 'protected_finance_account_field', 'A67 Type mutation is not silently opened');
  await expectError(() => updateFinanceAccount(personalA, created.personalAccount.id, { currency: 'USD' }), 'protected_finance_account_field', 'A67 Currency mutation is not silently opened');

  const archived = await archiveFinanceAccount(personalA, created.personalAccount.id);
  equal(archived.account.status, FINANCE_ACCOUNT_STATUSES.ARCHIVED, 'A59 Archive ACTIVE -> ARCHIVED');
  equal((await persistedAccount(created.personalAccount.id)).id, created.personalAccount.id, 'A60 archived Account remains persisted');
  assert(!(await listFinanceAccounts(personalA)).accounts.some((account) => account.id === created.personalAccount.id), 'A61 archived Account disappears from normal active list');
  assert((await listFinanceAccounts(personalA, { includeArchived: true, status: FINANCE_ACCOUNT_STATUSES.ARCHIVED })).accounts.some((account) => account.id === created.personalAccount.id), 'A62 archived Account available through explicit archived read path');
  const unarchived = await unarchiveFinanceAccount(personalA, created.personalAccount.id);
  equal(unarchived.account.status, FINANCE_ACCOUNT_STATUSES.ACTIVE, 'A63 Unarchive ARCHIVED -> ACTIVE');
  assert((await listFinanceAccounts(personalA)).accounts.some((account) => account.id === created.personalAccount.id), 'A64 unarchived Account returns to normal list');

  const routeText = fs.readFileSync(path.join(root, 'backend/src/routes/finance.js'), 'utf8');
  const accountService = fs.readFileSync(path.join(root, 'backend/src/services/finance.account.service.js'), 'utf8');
  assert(!/router\.delete\(['"]\/accounts/.test(routeText), 'A65 no hard-delete Account endpoint');
  assert(!/trash|restore|Papelera/i.test(accountService), 'A66 no generic Finance Trash use for Account');
}

async function testRlsAndNegativeScope(actors, created) {
  console.log('\nA68-A80 - RLS and negative scope');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  const bReadPersonal = await actors.b.client
    .from('finance_accounts')
    .select('*')
    .eq('id', created.personalAccount.id);
  if (bReadPersonal.error) throw bReadPersonal.error;
  equal(bReadPersonal.data.length, 0, 'RLS Personal SELECT owner-only');

  const cReadHousehold = await actors.c.client
    .from('finance_accounts')
    .select('*')
    .eq('id', created.householdAccount.id);
  if (cReadHousehold.error) throw cReadHousehold.error;
  equal(cReadHousehold.data.length, 0, 'RLS Household SELECT active Household only');

  const directProtectedUpdate = await actors.a.client
    .from('finance_accounts')
    .update({ balance_state: 'UNKNOWN', currency: 'USD' })
    .eq('id', created.personalAccount.id)
    .select('*');
  assert(Boolean(directProtectedUpdate.error), 'RLS/DB trigger blocks protected Account field mutation');

  const columns = await queryDb(`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'finance_accounts'
  `);
  const accountColumns = columns.rows.map((row) => row.column_name);
  for (const forbidden of ['current_balance', 'opening_balance', 'anchor_amount', 'balance_anchor', 'credit_limit', 'payment_due']) {
    assert(!accountColumns.includes(forbidden), `A68-A71 no out-of-stage Account column: ${forbidden}`);
  }

  const txColumns = await queryDb(`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'finance_transactions'
  `);
  assert(!txColumns.rows.map((row) => row.column_name).includes('account_id'), 'A72/A73 no Account-linked Expense/Income and no account_id added');

  const routeText = fs.readFileSync(path.join(root, 'backend/src/routes/finance.js'), 'utf8');
  const accountService = fs.readFileSync(path.join(root, 'backend/src/services/finance.account.service.js'), 'utf8');
  const migrationText = fs.readFileSync(path.join(root, 'supabase/migrations/20260814010000_finance_account_authority_v1_1.sql'), 'utf8');
  assert(!/transfer|source_account|destination_account|commission|fx|exchange/i.test(accountService), 'A74-A76 no Transfer/cross-currency/commission implementation');
  assert(!/finance_credit_cards|statement|closing_date|minimum_payment|installments|credit_limit|card debt/i.test(migrationText), 'A71 no Credit Card debt behavior/schema');
  assert(routeText.includes("router.post('/accounts'") && !/Account selector|Agregar cuenta|Cuentas screen/i.test(accountService), 'A77 no Account frontend implemented by 3A');
  assert(!/insert into public\.finance_accounts/i.test(migrationText), 'A78 no default Account suggestions persisted');
  assert(!/donor|ledger|double.?entry|AccountRepository|FinanceACL|FinancePermission|finance_can_access/i.test(accountService), 'A79/A80 no donor account architecture or Finance auth subsystem');

  const before = await queryDb('select count(*)::int as count from public.finance_transactions');
  await getFinanceAccount(personalA, created.card.id);
  const after = await queryDb('select count(*)::int as count from public.finance_transactions');
  equal(after.rows[0].count, before.rows[0].count, 'Account exists/read without movement side effects');
}

async function testStaticContracts() {
  console.log('\nStatic contract - routes, migrations and aggregate registration');
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
    'accepted Finance migration allow-list includes 3G and 4B/4C migrations',
  );

  const runJs = fs.readFileSync(path.join(root, 'tests/run.js'), 'utf8');
  assert(runJs.includes('finance-3a-account-authority') && runJs.includes("'finance-3a'"), 'node tests/run.js finance-3a registered');
  assert(runJs.includes('finance-3a-account-authority') && /finance:\s*\[[\s\S]*finance-3a-account-authority/.test(runJs), 'aggregate Finance suite includes 3A');
}

async function assertFixtureCleanup() {
  const accounts = fixture.accountIds.length
    ? await queryDb('select count(*)::int as count from public.finance_accounts where id = any($1::uuid[])', [fixture.accountIds])
    : { rows: [{ count: 0 }] };
  equal(accounts.rows[0].count, 0, 'fixture cleanup leaves no 3A account rows');
}

async function main() {
  console.log('FINANCE_3A_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigrations();
  const actors = await setupActors();

  try {
    await testFirstUse(actors);
    const created = await testCreateAndUnknownBalance(actors);
    await testOwnershipAndPrivacy(actors, created);
    await testReadEditLifecycle(actors, created);
    await testRlsAndNegativeScope(actors, created);
    await testStaticContracts();
  } finally {
    await cleanup();
  }

  await assertFixtureCleanup();

  console.log(`\nFINANCE_3A_ACCOUNT_AUTHORITY_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_3A_ACCOUNT_AUTHORITY_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_3A_ACCOUNT_AUTHORITY_TESTS=PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_3A_ACCOUNT_AUTHORITY_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
