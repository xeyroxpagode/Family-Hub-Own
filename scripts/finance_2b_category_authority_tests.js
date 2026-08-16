#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 2B Category Authority tests.
 *
 * Local Supabase only. Applies the idempotent 2B migration to the local DB,
 * then validates native catalog, custom Personal/Household ownership, RLS,
 * lifecycle/delete selectability, and 2A transaction compatibility.
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
  FINANCE_CATEGORY_KINDS,
  FINANCE_CATEGORY_TYPES,
  FINANCE_CONTEXT_TYPES,
} = require('../backend/src/constants/finance.constants');
const { resolveFinanceContext } = require('../backend/src/services/finance.context.service');
const {
  FINANCE_CATEGORY_HISTORICAL_SNAPSHOT_CONTRACT,
  createFinanceCategory,
  deleteFinanceCategory,
  listFinanceCategories,
  updateFinanceCategory,
} = require('../backend/src/services/finance.category.service');
const { normalizeFinanceTransactionContract, FINANCE_TRANSACTION_TYPES } = require('../backend/src/services/finance.transactionContract.service');

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
  console.error('ENVIRONMENT_FAILURE: Finance 2B tests are local-only.');
  process.exit(2);
}

const databaseUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const expectedExpense = Object.freeze([
  ['food', 'Alimentación'],
  ['housing', 'Vivienda'],
  ['utilities', 'Servicios y facturas'],
  ['transport', 'Transporte'],
  ['health', 'Salud'],
  ['education', 'Educación'],
  ['shopping', 'Compras'],
  ['leisure', 'Ocio'],
  ['subscriptions', 'Suscripciones'],
  ['pets', 'Mascotas'],
  ['taxes', 'Impuestos y tasas'],
  ['financial_costs', 'Comisiones e intereses'],
]);

const expectedIncome = Object.freeze([
  ['salary', 'Sueldo'],
  ['independent_work', 'Trabajo independiente'],
  ['sales', 'Ventas'],
  ['returns', 'Rendimientos'],
]);

let passCount = 0;
let failCount = 0;
const fixture = {
  authUserIds: [],
  personIds: [],
  householdIds: [],
  categoryIds: [],
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

async function applyMigration() {
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260813010000_finance_category_authority_v1_1.sql'), 'utf8');
  await queryDb(migration);
  await new Promise((resolve) => setTimeout(resolve, 250));
}

function randomCredential(label) {
  return `Fin2B_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin2b-${label}-${suffix}@example.test`;
  const password = randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 2B QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 2B ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `fin2b-${crypto.randomBytes(8).toString('hex')}`,
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

async function resolvedContext(auth, contextType) {
  return resolveFinanceContext({ user: { id: auth.user.id }, accessToken: auth.accessToken }, contextType);
}

async function setupActors() {
  const userA = await createAuthUser('a');
  const userB = await createAuthUser('b');
  const personA = await createPerson(userA.user.id, 'A');
  const personB = await createPerson(userB.user.id, 'B');
  const hhA = await createHousehold('Fin 2B A', personA.id, [{ personId: personA.id, role: 'adult' }]);
  const hhB = await createHousehold('Fin 2B B', personA.id, [
    { personId: personA.id, role: 'adult' },
    { personId: personB.id, role: 'coordinator' },
  ]);
  const hhC = await createHousehold('Fin 2B C', personA.id, [{ personId: personA.id, role: 'adult' }]);
  await setActiveHousehold(personA.id, hhB.household.id);
  await setActiveHousehold(personB.id, hhB.household.id);
  const tokenA = await signIn(userA.email, userA.password);
  const tokenB = await signIn(userB.email, userB.password);
  return {
    a: { ...userA, person: personA, accessToken: tokenA },
    b: { ...userB, person: personB, accessToken: tokenB },
    households: { a: hhA.household, b: hhB.household, c: hhC.household },
  };
}

async function cleanup() {
  if (fixture.categoryIds.length) {
    await admin.from('finance_categories').delete().in('id', fixture.categoryIds);
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

async function testCatalog() {
  console.log('\nCATALOG - exact native baseline');
  const { rows } = await queryDb(`
    select native_key, label, category_type, category_kind, context_type, owner_person_id, household_id
    from public.finance_categories
    where category_kind = 'native'
    order by category_type, sort_order
  `);
  const expense = rows.filter((row) => row.category_type === FINANCE_CATEGORY_TYPES.EXPENSE);
  const income = rows.filter((row) => row.category_type === FINANCE_CATEGORY_TYPES.INCOME);

  equal(expense.length, 12, 'exactly 12 native Expense categories');
  equal(income.length, 4, 'exactly 4 native Income categories');
  equal(rows.length, 16, 'exactly 16 native categories total');
  assert(!rows.some((row) => row.native_key === 'other' || row.label.toLowerCase() === 'otros'), 'no native Otros category');

  for (const [id, label] of expectedExpense) {
    const row = expense.find((candidate) => candidate.native_key === id);
    assert(Boolean(row), `Expense native ID exists: ${id}`);
    equal(row?.label, label, `Expense native label frozen: ${id}`);
    equal(row?.category_type, FINANCE_CATEGORY_TYPES.EXPENSE, `Expense native type assignment: ${id}`);
  }
  for (const [id, label] of expectedIncome) {
    const row = income.find((candidate) => candidate.native_key === id);
    assert(Boolean(row), `Income native ID exists: ${id}`);
    equal(row?.label, label, `Income native label frozen: ${id}`);
    equal(row?.category_type, FINANCE_CATEGORY_TYPES.INCOME, `Income native type assignment: ${id}`);
  }
  assert(rows.every((row) => row.category_kind === FINANCE_CATEGORY_KINDS.NATIVE), 'T01 native distinction works');
  assert(rows.every((row) => row.context_type === null && row.owner_person_id === null && row.household_id === null), 'native categories are system-owned global definitions');
}

async function testNativeImmutability(actor) {
  console.log('\nT01-T09/T32 - native immutability');
  const personal = await resolvedContext(actor, FINANCE_CONTEXT_TYPES.PERSONAL);
  const { categories } = await listFinanceCategories(personal, { type: FINANCE_CATEGORY_TYPES.EXPENSE });
  const native = categories.find((category) => category.nativeKey === 'food');

  assert(Boolean(native), 'T02 native Expense available');
  assert(categories.some((category) => category.nativeKey === 'food'), 'T09 native identity is nativeKey, not label');
  const incomeList = await listFinanceCategories(personal, { type: FINANCE_CATEGORY_TYPES.INCOME });
  assert(incomeList.categories.some((category) => category.nativeKey === 'salary'), 'T03 native Income available');
  await expectError(() => updateFinanceCategory(personal, native.id, { label: 'Comida' }), 'native_finance_category_immutable', 'T04 native cannot be renamed');
  await expectError(() => deleteFinanceCategory(personal, native.id), 'native_finance_category_immutable', 'T05 native cannot be deleted');
  await expectError(() => deleteFinanceCategory(personal, native.id, { archived_at: new Date().toISOString() }), 'finance_category_archive_not_supported', 'T06 native cannot be archived');
  await expectError(() => updateFinanceCategory(personal, native.id, { type: FINANCE_CATEGORY_TYPES.INCOME }), 'protected_finance_category_field', 'T07 native cannot change type');
  await expectError(() => updateFinanceCategory(personal, native.id, { categoryKind: FINANCE_CATEGORY_KINDS.CUSTOM }), 'protected_finance_category_field', 'T08 native cannot become custom');
  const nativeAfter = await queryDb('select deleted_at from public.finance_categories where native_key = $1', ['food']);
  equal(nativeAfter.rows[0].deleted_at, null, 'T32 native cannot enter custom delete lifecycle');
}

async function testPersonalCustom(actors) {
  console.log('\nT10-T18 - Personal custom ownership and privacy');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);

  const expense = await createFinanceCategory(personalA, { type: FINANCE_CATEGORY_TYPES.EXPENSE, label: 'Viajes' });
  fixture.categoryIds.push(expense.category.id);
  equal(expense.category.type, FINANCE_CATEGORY_TYPES.EXPENSE, 'T10 current Person can create Personal custom Expense category');

  const income = await createFinanceCategory(personalA, { type: FINANCE_CATEGORY_TYPES.INCOME, label: 'Alquiler temporal' });
  fixture.categoryIds.push(income.category.id);
  equal(income.category.type, FINANCE_CATEGORY_TYPES.INCOME, 'T11 current Person can create Personal custom Income category');

  const dbRow = await queryDb('select owner_person_id, household_id, context_type from public.finance_categories where id = $1', [expense.category.id]);
  equal(dbRow.rows[0].owner_person_id, actors.a.person.id, 'T12 Personal category derives current Person server-side');
  equal(dbRow.rows[0].household_id, null, 'T12 Personal category has no household scope');

  await expectError(() => createFinanceCategory(personalA, { type: FINANCE_CATEGORY_TYPES.EXPENSE, label: 'X', personId: actors.b.person.id }), 'finance_category_owner_authority_forbidden', 'T13 arbitrary personId rejected');
  await expectError(() => createFinanceCategory(personalA, { type: FINANCE_CATEGORY_TYPES.EXPENSE, label: 'X', ownerPersonId: actors.b.person.id }), 'finance_category_owner_authority_forbidden', 'T14 ownerPersonId injection rejected');

  const bList = await listFinanceCategories(personalB, { type: FINANCE_CATEGORY_TYPES.EXPENSE });
  assert(!bList.categories.some((category) => category.id === expense.category.id), 'T15 another Person cannot read Personal custom category');
  await expectError(() => updateFinanceCategory(personalB, expense.category.id, { label: 'Otro' }), 'finance_category_not_found', 'T16 another Person cannot edit it');
  await expectError(() => deleteFinanceCategory(personalB, expense.category.id), 'finance_category_not_found', 'T17 another Person cannot delete it');

  const householdB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const householdBList = await listFinanceCategories(householdB, { type: FINANCE_CATEGORY_TYPES.EXPENSE });
  assert(!householdBList.categories.some((category) => category.id === expense.category.id), 'T18 Household membership/role does not pierce Personal privacy');
  return expense.category;
}

async function testHouseholdCustom(actors) {
  console.log('\nT19-T25 - Household custom ownership and active Household boundary');
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const created = await createFinanceCategory(householdA, { type: FINANCE_CATEGORY_TYPES.EXPENSE, label: 'Casa compartida' });
  fixture.categoryIds.push(created.category.id);

  const dbRow = await queryDb('select context_type, household_id, owner_person_id from public.finance_categories where id = $1', [created.category.id]);
  equal(dbRow.rows[0].household_id, actors.households.b.id, 'T19 create Household custom category uses active Household');
  equal(dbRow.rows[0].context_type, FINANCE_CONTEXT_TYPES.HOUSEHOLD, 'T23 Household custom category remains Household scoped');
  equal(dbRow.rows[0].owner_person_id, null, 'T23 Household custom has no Personal owner');

  await expectError(() => createFinanceCategory(householdA, { type: FINANCE_CATEGORY_TYPES.EXPENSE, label: 'A target', householdId: actors.households.a.id }), 'finance_category_owner_authority_forbidden', 'T20/T21 cannot target another Household by request');
  await expectError(() => createFinanceCategory(householdA, { type: FINANCE_CATEGORY_TYPES.EXPENSE, label: 'Membership target', membershipId: 'caller-membership' }), 'finance_category_owner_authority_forbidden', 'T22 membershipId injection rejected');

  const personalList = await listFinanceCategories(personalA, { type: FINANCE_CATEGORY_TYPES.EXPENSE });
  assert(!personalList.categories.some((category) => category.id === created.category.id), 'T24 Household query does not expose Personal custom categories / Personal query does not expose Household custom');

  await setActiveHousehold(actors.a.person.id, actors.households.a.id);
  const householdAfterSwitch = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const switchedList = await listFinanceCategories(householdAfterSwitch, { type: FINANCE_CATEGORY_TYPES.EXPENSE });
  assert(!switchedList.categories.some((category) => category.id === created.category.id), 'T20 multiple memberships do not allow targeting non-active Household B after switch to A');
  await expectError(() => updateFinanceCategory(householdAfterSwitch, created.category.id, { label: 'Nope' }), 'finance_category_not_found', 'T25 active membership/authority enforced');
  await setActiveHousehold(actors.a.person.id, actors.households.b.id);

  return created.category;
}

async function testLifecycleAndCompatibility(actors, personalCategory, householdCategory) {
  console.log('\nT26-T45 - lifecycle, transaction compatibility and historical safety');
  const personal = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const household = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  assert(Boolean(personalCategory.id), 'T26 custom Create PASS');
  const renamed = await updateFinanceCategory(personal, personalCategory.id, { label: 'Comidas afuera' });
  equal(renamed.category.label, 'Comidas afuera', 'T27 custom Edit/rename PASS');
  const renamedRow = await queryDb('select category_type, owner_person_id from public.finance_categories where id = $1', [personalCategory.id]);
  equal(renamedRow.rows[0].category_type, FINANCE_CATEGORY_TYPES.EXPENSE, 'T35 category type remains stable after creation');
  equal(renamedRow.rows[0].owner_person_id, actors.a.person.id, 'T33 ownership cannot change through Edit');

  await expectError(() => updateFinanceCategory(personal, personalCategory.id, { ownerPersonId: actors.b.person.id, label: 'X' }), 'finance_category_owner_authority_forbidden', 'T33 ownership cannot change through Edit via injection');
  await expectError(() => updateFinanceCategory(personal, personalCategory.id, { categoryKind: FINANCE_CATEGORY_KINDS.NATIVE }), 'protected_finance_category_field', 'T34 custom cannot become native');
  await expectError(() => updateFinanceCategory(personal, personalCategory.id, { type: FINANCE_CATEGORY_TYPES.INCOME }), 'protected_finance_category_field', 'T35 type mutation rejected after creation');

  const deleted = await deleteFinanceCategory(household, householdCategory.id);
  equal(deleted.category.selectable, false, 'T28 custom Delete PASS');
  const afterDelete = await listFinanceCategories(household, { type: FINANCE_CATEGORY_TYPES.EXPENSE });
  assert(!afterDelete.categories.some((category) => category.id === householdCategory.id), 'T29 deleted category not returned as current selectable');
  await expectError(() => deleteFinanceCategory(household, householdCategory.id, { archived_at: new Date().toISOString() }), 'finance_category_archive_not_supported', 'T30 no Archive operation exists');
  assert(!('archiveFinanceCategory' in require('../backend/src/services/finance.category.service')), 'T30 no Archive operation exists');
  assert(!('unarchiveFinanceCategory' in require('../backend/src/services/finance.category.service')), 'T31 no Unarchive operation exists');

  const quickExpense = normalizeFinanceTransactionContract({
    type: FINANCE_TRANSACTION_TYPES.EXPENSE,
    amount: 42000,
    currency: 'ARS',
    financialContext: personal,
    date: '2026-08-13',
    category: null,
    description: 'Supermercado',
  });
  equal(quickExpense.category, null, 'T36 2A Transaction remains valid with category = null');
  equal(quickExpense.category, null, 'T37 no default Category assigned');
  equal(quickExpense.description, 'Supermercado', 'T38 Description does not infer Category');

  const incomeWithExpenseCategoryShape = normalizeFinanceTransactionContract({
    type: FINANCE_TRANSACTION_TYPES.INCOME,
    amount: 5000,
    currency: 'ARS',
    financialContext: personal,
    date: '2026-08-13',
    category: { categoryId: personalCategory.id, categoryType: FINANCE_CATEGORY_TYPES.EXPENSE },
  });
  equal(incomeWithExpenseCategoryShape.type, FINANCE_TRANSACTION_TYPES.INCOME, 'T39 Category does not determine Transaction type');
  const transfer = normalizeFinanceTransactionContract({
    type: FINANCE_TRANSACTION_TYPES.TRANSFER,
    amount: 5000,
    currency: 'ARS',
    financialContext: personal,
    date: '2026-08-13',
    category: null,
  });
  equal(transfer.category, null, 'T40 Transfer has no Expense/Income category requirement');

  equal(FINANCE_CATEGORY_HISTORICAL_SNAPSHOT_CONTRACT.ownerStage, '2C', 'T41/T44 2C owns category snapshot persistence');
  assert(FINANCE_CATEGORY_HISTORICAL_SNAPSHOT_CONTRACT.requiredTransactionFields.includes('category_id'), 'T41 category_id future contract locked');
  assert(FINANCE_CATEGORY_HISTORICAL_SNAPSHOT_CONTRACT.requiredTransactionFields.includes('category_label_snapshot'), 'T41 category_label_snapshot future contract locked');
  equal(FINANCE_CATEGORY_HISTORICAL_SNAPSHOT_CONTRACT.renameRule, 'category_rename_must_not_rewrite_historical_snapshot', 'T42 rename must not imply historical snapshot rewrite');
  equal(FINANCE_CATEGORY_HISTORICAL_SNAPSHOT_CONTRACT.deleteRule, 'category_delete_must_not_delete_historical_facts', 'T43 delete must not imply historical fact delete');

  const serviceSource = fs.readFileSync(path.join(root, 'backend/src/services/finance.category.service.js'), 'utf8');
  const migrationSource = fs.readFileSync(path.join(root, 'supabase/migrations/20260813010000_finance_category_authority_v1_1.sql'), 'utf8');
  assert(!/category_versions|event sourcing|versioning framework/i.test(`${serviceSource}\n${migrationSource}`), 'T45 no category versioning framework introduced');
}

async function testSchemaAndStaticNoOutOfScope() {
  console.log('\nSchema/static - minimal 2B surface');
  const table = await queryDb("select to_regclass('public.finance_categories') as table_name");
  equal(table.rows[0].table_name, 'finance_categories', 'finance_categories schema exists');
  const rls = await queryDb("select relrowsecurity from pg_class where oid = 'public.finance_categories'::regclass");
  equal(rls.rows[0].relrowsecurity, true, 'RLS enabled on finance_categories');
  const columns = await queryDb(`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'finance_categories'
    order by ordinal_position
  `);
  const names = columns.rows.map((row) => row.column_name);
  for (const forbidden of ['archived_at', 'restored_at', 'category_version', 'merchant_id', 'tags', 'payment_method']) {
    assert(!names.includes(forbidden), `minimal schema excludes ${forbidden}`);
  }

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((name) => /finance/i.test(name));
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
    'only accepted 2B/2C/3A/3B/3C/3D/3E/3F/3G/4B/4C Finance migrations exist',
  );

  const backendText = [
    'backend/src/services/finance.category.service.js',
    'backend/src/controllers/finance.categories.controller.js',
    'backend/src/routes/finance.js',
    'backend/src/services/finance.transactionContract.service.js',
  ].map((rel) => fs.readFileSync(path.join(root, rel), 'utf8')).join('\n');
  assert(!/FinanceRole|FINANCE_ROLES|FinancePermission|FinanceACL|finance_can_access/i.test(backendText), 'no Finance role/permission package invented');
  assert(!/finance_expenses|finance_incomes|ExpenseService|IncomeService|TransferService|BudgetService/i.test(backendText), 'no separate Expense/Income/Transfer/Budget persistence implemented');
  assert(!/infer|categorize|merchant|ocr|payment method/i.test(backendText), 'no category inference machinery introduced');
}

async function main() {
  console.log('FINANCE_2B_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigration();
  const actors = await setupActors();

  try {
    await testCatalog();
    await testNativeImmutability(actors.a);
    const personalCategory = await testPersonalCustom(actors);
    const householdCategory = await testHouseholdCustom(actors);
    await testLifecycleAndCompatibility(actors, personalCategory, householdCategory);
    await testSchemaAndStaticNoOutOfScope();
  } finally {
    await cleanup();
  }

  console.log(`\nFINANCE_2B_CATEGORY_AUTHORITY_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_2B_CATEGORY_AUTHORITY_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_2B_CATEGORY_AUTHORITY_TESTS=PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_2B_CATEGORY_AUTHORITY_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
