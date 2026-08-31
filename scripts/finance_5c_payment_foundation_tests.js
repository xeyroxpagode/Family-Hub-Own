#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 5C Payment Foundation + Recurrence tests.
 *
 * Local Supabase only. Applies Stage 5C migration, then validates:
 * - One-off Payment Due (NORMAL known/unknown amount)
 * - Recurring Payment Series + first occurrence
 * - Exactly one PENDING per active series
 * - Recurrence date advancement with month-end clamping
 * - Cancellation (single due, recurring due with advancement, series)
 * - Editing (pending due, series affecting current due)
 * - Idempotency (create, cancel, edit replay)
 * - Context isolation (PERSONAL / HOUSEHOLD)
 * - Credit Card obligation validation
 * - Read contracts (list, detail, ordering, overdue derivation)
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
  FINANCE_CONTEXT_TYPES,
  FINANCE_ACCOUNT_TYPES,
} = require('../backend/src/constants/finance.constants');
const { resolveFinanceContext } = require('../backend/src/services/finance.context.service');
const {
  createFinanceAccount,
  listFinanceAccounts,
} = require('../backend/src/services/finance.account.service');
const {
  createFinanceCategory,
  listFinanceCategories,
} = require('../backend/src/services/finance.category.service');
const {
  createOneOffPaymentDue,
  createPaymentSeries,
  listPaymentDues,
  getPaymentDueDetail,
  listPaymentSeries,
  getPaymentSeriesDetail,
  cancelPaymentDue,
  cancelPaymentSeries,
  editPaymentDue,
  editPaymentSeries,
  PAYMENT_KINDS,
  PAYMENT_DUE_STATUSES,
  PAYMENT_SERIES_STATUSES,
  RECURRENCE_UNITS,
} = require('../backend/src/services/finance.payment.service');

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
  console.error('ENVIRONMENT_FAILURE: Finance 5C tests are local-only.');
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
  categoryIds: [],
  paymentDueIds: [],
  paymentSeriesIds: [],
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
  if (await tableExists('finance_payment_dues')) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return;
  }

  // Apply all Finance migrations up to Stage 4, then 5C
  const migrations = [
    'supabase/migrations/20260813010000_finance_category_authority_v1_1.sql',
    'supabase/migrations/20260813020000_finance_expense_income_transactions_v1_1.sql',
    'supabase/migrations/20260814010000_finance_account_authority_v1_1.sql',
    'supabase/migrations/20260814020000_finance_balance_anchor_account_effects_v1_1.sql',
    'supabase/migrations/20260814030000_finance_balance_correction_v1_1.sql',
    'supabase/migrations/20260814040000_finance_credit_card_purchase_semantics_v1_1.sql',
    'supabase/migrations/20260814050000_finance_canonical_transfer_v1_1.sql',
    'supabase/migrations/20260814060000_finance_cross_currency_transfer_v1_1.sql',
    'supabase/migrations/20260814070000_finance_transfer_commission_composition_v1_1.sql',
    'supabase/migrations/20260814080000_finance_account_effect_status_foundation_v1_1.sql',
    'supabase/migrations/20260815020000_finance_transaction_lifecycle_foundation_v1_1.sql',
    'supabase/migrations/20260815030000_finance_transaction_trash_mutation_v1_1.sql',
    'supabase/migrations/20260819000000_finance_transaction_restore_mutation_v1_1.sql',
    'supabase/migrations/20260819010000_finance_transfer_regression_repair_v1_1.sql',
    'supabase/migrations/20260819020000_finance_transaction_correction_v1_1.sql',
    'supabase/migrations/20260824083947_finance_refund_persistence_root_transaction_id_v1_1.sql',
    'supabase/migrations/20260824093347_finance_refund_events_persistence_v1_1.sql',
    'supabase/migrations/20260824103000_finance_refund_end_to_end_v1_1.sql',
    'supabase/migrations/20260824120000_finance_balance_correction_idempotency_v1_1.sql',
    // Stage 5C
    'supabase/migrations/20260825000000_finance_payment_foundation_v1_1.sql',
  ];

  for (const mig of migrations) {
    await applyMigration(mig);
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

function randomCredential(label) {
  return `Fin5C_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin5c-${label}-${suffix}@example.test`;
  const password = randomCredential(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 5C QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 5C ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function createHousehold(name, ownerPersonId, members) {
  const household = await insertOne('households', {
    name,
    slug: `fin5c-${crypto.randomBytes(8).toString('hex')}`,
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

function makeMutationId(label) {
  return `fin5c-${label}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
}

function makeIdempotencyKey(label) {
  return `idem-${label}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
}

function makePayloadHash(payload) {
  // Simple deterministic hash for testing (not cryptographic)
  const crypto = require('node:crypto');
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

async function setupActors() {
  const userA = await createAuthUser('a');
  const userB = await createAuthUser('b');
  const userC = await createAuthUser('c');
  const personA = await createPerson(userA.user.id, 'A');
  const personB = await createPerson(userB.user.id, 'B');
  const personC = await createPerson(userC.user.id, 'C');
  const hhA = await createHousehold('Fin 5C A', personA.id, [{ personId: personA.id, role: 'adult' }]);
  const hhB = await createHousehold('Fin 5C B', personA.id, [
    { personId: personA.id, role: 'adult' },
    { personId: personB.id, role: 'coordinator' },
  ]);
  const hhC = await createHousehold('Fin 5C C', personC.id, [{ personId: personC.id, role: 'adult' }]);
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
  if (fixture.paymentDueIds.length) {
    await admin.from('finance_payment_dues').delete().in('id', fixture.paymentDueIds);
  }
  if (fixture.paymentSeriesIds.length) {
    await admin.from('finance_payment_series').delete().in('id', fixture.paymentSeriesIds);
  }
  if (fixture.categoryIds.length) {
    await admin.from('finance_categories').delete().in('id', fixture.categoryIds);
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

async function trackDue(result) {
  fixture.paymentDueIds.push(result.paymentDue.id);
  return result.paymentDue;
}

async function trackSeries(result) {
  fixture.paymentSeriesIds.push(result.paymentSeries.id);
  fixture.paymentDueIds.push(result.firstDue.id);
  return { paymentSeries: result.paymentSeries, firstDue: result.firstDue };
}

async function trackCategory(result) {
  fixture.categoryIds.push(result.category.id);
  return result.category;
}

async function trackAccount(result) {
  fixture.accountIds.push(result.account.id);
  return result.account;
}

// =============================================================================
// TEST SUITES
// =============================================================================

async function testOneOffPaymentDue(actors) {
  console.log('\n=== ONE-OFF PAYMENT DUE TESTS ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  // 1. create NORMAL known amount
  const cat = await trackCategory(await createFinanceCategory(personalA, { type: 'expense', label: 'Test Cat' }));
  const due1 = await trackDue(await createOneOffPaymentDue(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Internet',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '15000',
    dueDate: '2026-09-10',
    categoryId: cat.id,
    mutationId: makeMutationId('oneoff-known'),
    idempotencyKey: makeIdempotencyKey('oneoff-known'),
    payloadHash: makePayloadHash({ kind: 'NORMAL', title: 'Internet', amount: '15000', dueDate: '2026-09-10' }),
  }));
  equal(due1.kind, 'NORMAL', '5C-01 NORMAL one-off created');
  equal(due1.expectedAmountKnown, true, '5C-01 expectedAmountKnown true');
  equal(due1.expectedAmount, '15000', '5C-01 expectedAmount correct');
  equal(due1.status, 'PENDING', '5C-01 status PENDING');
  equal(due1.paymentSeriesId, null, '5C-01 no series for one-off');

  // 2. create NORMAL unknown amount
  const due2 = await trackDue(await createOneOffPaymentDue(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Luz (a confirmar)',
    currency: 'ARS',
    expectedAmountKnown: false,
    dueDate: '2026-09-15',
    mutationId: makeMutationId('oneoff-unknown'),
    idempotencyKey: makeIdempotencyKey('oneoff-unknown'),
    payloadHash: makePayloadHash({ kind: 'NORMAL', title: 'Luz', known: false, dueDate: '2026-09-15' }),
  }));
  equal(due2.expectedAmountKnown, false, '5C-02 UNKNOWN amount created');
  equal(due2.expectedAmount, null, '5C-02 expectedAmount is null when unknown');

  // 3. zero expected amount rejected when KNOWN
  await expectError(
    () => createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Zero test',
      currency: 'ARS',
      expectedAmountKnown: true,
      expectedAmount: '0',
      dueDate: '2026-09-20',
      mutationId: makeMutationId('zero-known'),
      idempotencyKey: makeIdempotencyKey('zero-known'),
      payloadHash: makePayloadHash({ kind: 'NORMAL', amount: '0' }),
    }),
    'finance_payment_expected_amount_positive',
    '5C-03 zero expected amount rejected when KNOWN',
  );

  // 4. negative rejected
  await expectError(
    () => createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Negative test',
      currency: 'ARS',
      expectedAmountKnown: true,
      expectedAmount: '-100',
      dueDate: '2026-09-20',
      mutationId: makeMutationId('neg-known'),
      idempotencyKey: makeIdempotencyKey('neg-known'),
      payloadHash: makePayloadHash({ kind: 'NORMAL', amount: '-100' }),
    }),
    'finance_payment_expected_amount_positive',
    '5C-04 negative expected amount rejected',
  );

  // 5. due date required
  await expectError(
    () => createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'No date',
      currency: 'ARS',
      expectedAmountKnown: true,
      expectedAmount: '100',
      mutationId: makeMutationId('no-date'),
      idempotencyKey: makeIdempotencyKey('no-date'),
      payloadHash: makePayloadHash({ kind: 'NORMAL', noDate: true }),
    }),
    'invalid_finance_payment_due_date',
    '5C-05 due date required',
  );

  // 6. currency valid
  await expectError(
    () => createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Bad currency',
      currency: 'ARSX',
      expectedAmountKnown: true,
      expectedAmount: '100',
      dueDate: '2026-09-20',
      mutationId: makeMutationId('bad-curr'),
      idempotencyKey: makeIdempotencyKey('bad-curr'),
      payloadHash: makePayloadHash({ kind: 'NORMAL', currency: 'ARSX' }),
    }),
    'invalid_finance_payment_currency',
    '5C-06 invalid currency rejected',
  );

  // 7. category optional
  const due3 = await trackDue(await createOneOffPaymentDue(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'No category',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '5000',
    dueDate: '2026-09-25',
    mutationId: makeMutationId('no-cat'),
    idempotencyKey: makeIdempotencyKey('no-cat'),
    payloadHash: makePayloadHash({ kind: 'NORMAL', noCat: true }),
  }));
  equal(due3.categoryId, null, '5C-07 category optional');

  // 8. no Account invented
  const due4 = await trackDue(await createOneOffPaymentDue(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'No account',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '5000',
    dueDate: '2026-09-25',
    mutationId: makeMutationId('no-acc'),
    idempotencyKey: makeIdempotencyKey('no-acc'),
    payloadHash: makePayloadHash({ kind: 'NORMAL', noAcc: true }),
  }));
  // Verify no account fields in response
  assert(!('accountId' in due4) && !('account_id' in due4), '5C-08 no Account invented on one-off');

  // 9. cancel one-off preserves row
  const cancelled = await cancelPaymentDue(personalA, due1.id, {
    mutationId: makeMutationId('cancel-oneoff'),
    idempotencyKey: makeIdempotencyKey('cancel-oneoff'),
    payloadHash: makePayloadHash({ cancel: due1.id }),
  });
  equal(cancelled.paymentDue.status, 'CANCELLED', '5C-09 one-off cancel preserves row as CANCELLED');
  const stillExists = await admin.from('finance_payment_dues').select('*').eq('id', due1.id).single();
  assert(stillExists.data !== null && stillExists.data.status === 'CANCELLED', '5C-09 cancelled row exists in DB');
}

async function testContextIsolation(actors) {
  console.log('\n=== CONTEXT ISOLATION TESTS ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const personalB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const householdB = await resolvedContext(actors.b, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  // 10. PERSONAL isolation
  const duePersonal = await trackDue(await createOneOffPaymentDue(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Personal due',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '1000',
    dueDate: '2026-09-10',
    mutationId: makeMutationId('personal-due'),
    idempotencyKey: makeIdempotencyKey('personal-due'),
    payloadHash: makePayloadHash({ personal: true }),
  }));

  const personalList = await listPaymentDues(personalA, {});
  const otherPersonalList = await listPaymentDues(personalB, {});
  assert(personalList.paymentDues.some((candidate) => candidate.id === duePersonal.id), '5C-10 PERSONAL owner sees own due');
  equal(otherPersonalList.paymentDues.length, 0, '5C-10 other PERSONAL sees no dues');

  // 11. HOUSEHOLD membership enforcement
  const dueHousehold = await trackDue(await createOneOffPaymentDue(householdA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Household due',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '2000',
    dueDate: '2026-09-10',
    mutationId: makeMutationId('hh-due'),
    idempotencyKey: makeIdempotencyKey('hh-due'),
    payloadHash: makePayloadHash({ household: true }),
  }));

  const hhListA = await listPaymentDues(householdA, {});
  const hhListB = await listPaymentDues(householdB, {});
  equal(hhListA.paymentDues.length, 1, '5C-11 HOUSEHOLD member A sees household due');
  equal(hhListB.paymentDues.length, 1, '5C-11 HOUSEHOLD member B sees household due');

  // 12. arbitrary household/owner injection rejected
  await expectError(
    () => createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Injection attempt',
      currency: 'ARS',
      expectedAmountKnown: true,
      expectedAmount: '1000',
      dueDate: '2026-09-10',
      ownerPersonId: actors.b.person.id, // forbidden
      mutationId: makeMutationId('inj-person'),
      idempotencyKey: makeIdempotencyKey('inj-person'),
      payloadHash: makePayloadHash({ injection: 'personId' }),
    }),
    'finance_payment_owner_authority_forbidden',
    '5C-12 ownerPersonId injection rejected',
  );

  await expectError(
    () => createOneOffPaymentDue(householdA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Injection attempt',
      currency: 'ARS',
      expectedAmountKnown: true,
      expectedAmount: '1000',
      dueDate: '2026-09-10',
      householdId: actors.households.c.id, // forbidden
      mutationId: makeMutationId('inj-household'),
      idempotencyKey: makeIdempotencyKey('inj-household'),
      payloadHash: makePayloadHash({ injection: 'householdId' }),
    }),
    'finance_payment_owner_authority_forbidden',
    '5C-12 householdId injection rejected',
  );
}

async function testCreditCardObligation(actors) {
  console.log('\n=== CREDIT CARD OBLIGATION TESTS ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  // Create a CREDIT_CARD account
  const ccAccount = await trackAccount(await createFinanceAccount(personalA, {
    name: 'Visa',
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
  }));

  // 13. CREDIT_CARD due requires target card
  await expectError(
    () => createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.CREDIT_CARD,
      title: 'Visa payment',
      currency: 'ARS',
      expectedAmountKnown: true,
      expectedAmount: '180000',
      dueDate: '2026-09-05',
      mutationId: makeMutationId('cc-no-target'),
      idempotencyKey: makeIdempotencyKey('cc-no-target'),
      payloadHash: makePayloadHash({ kind: 'CREDIT_CARD', noTarget: true }),
    }),
    'finance_payment_credit_card_target_required',
    '5C-13 CREDIT_CARD due requires target card',
  );

  // 14. target must actually be CREDIT_CARD
  const normalAccount = await trackAccount(await createFinanceAccount(personalA, {
    name: 'Checking',
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.ACCOUNT,
  }));

  await expectError(
    () => createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.CREDIT_CARD,
      title: 'Visa payment',
      currency: 'ARS',
      expectedAmountKnown: true,
      expectedAmount: '180000',
      dueDate: '2026-09-05',
      targetCreditCardAccountId: normalAccount.id,
      mutationId: makeMutationId('cc-wrong-type'),
      idempotencyKey: makeIdempotencyKey('cc-wrong-type'),
      payloadHash: makePayloadHash({ kind: 'CREDIT_CARD', wrongTarget: true }),
    }),
    'finance_payment_target_card_type_mismatch',
    '5C-14 target must be CREDIT_CARD type',
  );

  // 15. target context compatible (personal CC for personal due)
  const ccDue = await trackDue(await createOneOffPaymentDue(personalA, {
    kind: PAYMENT_KINDS.CREDIT_CARD,
    title: 'Visa payment',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '180000',
    dueDate: '2026-09-05',
    targetCreditCardAccountId: ccAccount.id,
    mutationId: makeMutationId('cc-valid'),
    idempotencyKey: makeIdempotencyKey('cc-valid'),
    payloadHash: makePayloadHash({ kind: 'CREDIT_CARD', target: ccAccount.id }),
  }));
  equal(ccDue.kind, 'CREDIT_CARD', '5C-15 CREDIT_CARD due created');
  equal(ccDue.targetCreditCardAccountId, ccAccount.id, '5C-15 target card stored');

  // 16. no paying source Account stored
  assert(!('accountId' in ccDue) && !('payingAccountId' in ccDue), '5C-16 no paying source Account on CREDIT_CARD due');
}

async function testRecurrence(actors) {
  console.log('\n=== RECURRENCE TESTS ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  // 17. monthly first occurrence
  const series1 = await trackSeries(await createPaymentSeries(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Internet Mensual',
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '15000',
    recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH,
    recurrenceIntervalCount: 1,
    recurrenceAnchorDate: '2026-09-10',
    mutationId: makeMutationId('monthly-series'),
    idempotencyKey: makeIdempotencyKey('monthly-series'),
    payloadHash: makePayloadHash({ series: 'monthly', anchor: '2026-09-10' }),
  }));
  equal(series1.paymentSeries.status, 'ACTIVE', '5C-17 series ACTIVE');
  equal(series1.firstDue.status, 'PENDING', '5C-17 first due PENDING');
  equal(series1.firstDue.dueDate, '2026-09-10', '5C-17 first due on anchor date');
  equal(series1.firstDue.paymentSeriesId, series1.paymentSeries.id, '5C-17 first due linked to series');

  // 18. exactly one PENDING materialized
  const dues1 = await listPaymentDues(personalA, { paymentSeriesId: series1.paymentSeries.id, status: 'PENDING' });
  equal(dues1.paymentDues.length, 1, '5C-18 exactly one PENDING due for active series');
  const seriesCount = await queryDb(
    `select count(*)::int as cnt from finance_payment_dues where payment_series_id = $1 and status = 'PENDING'`,
    [series1.paymentSeries.id]
  );
  equal(seriesCount.rows[0].cnt, 1, '5C-18 DB confirms exactly one PENDING');

  // 19. monthly Jan31 -> Feb last day -> Mar31
  const seriesJan31 = await trackSeries(await createPaymentSeries(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Monthly Jan31',
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '1000',
    recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH,
    recurrenceIntervalCount: 1,
    recurrenceAnchorDate: '2026-01-31',
    mutationId: makeMutationId('jan31-series'),
    idempotencyKey: makeIdempotencyKey('jan31-series'),
    payloadHash: makePayloadHash({ series: 'jan31', anchor: '2026-01-31' }),
  }));
  equal(seriesJan31.firstDue.dueDate, '2026-01-31', '5C-19 first due Jan 31');

  // Advance by cancelling first due
  await cancelPaymentDue(personalA, seriesJan31.firstDue.id, {
    mutationId: makeMutationId('cancel-jan31-1'),
    idempotencyKey: makeIdempotencyKey('cancel-jan31-1'),
    payloadHash: makePayloadHash({ cancel: seriesJan31.firstDue.id, step: 1 }),
  });
  const duesAfter1 = await listPaymentDues(personalA, { paymentSeriesId: seriesJan31.paymentSeries.id, status: 'PENDING' });
  equal(duesAfter1.paymentDues[0].dueDate, '2026-02-28', '5C-19 Jan31 -> Feb28 (non-leap)');

  await cancelPaymentDue(personalA, duesAfter1.paymentDues[0].id, {
    mutationId: makeMutationId('cancel-jan31-2'),
    idempotencyKey: makeIdempotencyKey('cancel-jan31-2'),
    payloadHash: makePayloadHash({ cancel: duesAfter1.paymentDues[0].id, step: 2 }),
  });
  const duesAfter2 = await listPaymentDues(personalA, { paymentSeriesId: seriesJan31.paymentSeries.id, status: 'PENDING' });
  equal(duesAfter2.paymentDues[0].dueDate, '2026-03-31', '5C-19 Feb28 -> Mar31');

  await cancelPaymentDue(personalA, duesAfter2.paymentDues[0].id, {
    mutationId: makeMutationId('cancel-jan31-3'),
    idempotencyKey: makeIdempotencyKey('cancel-jan31-3'),
    payloadHash: makePayloadHash({ cancel: duesAfter2.paymentDues[0].id, step: 3 }),
  });
  const duesAfter3 = await listPaymentDues(personalA, { paymentSeriesId: seriesJan31.paymentSeries.id, status: 'PENDING' });
  equal(duesAfter3.paymentDues[0].dueDate, '2026-04-30', '5C-19 Mar31 -> Apr30');

  // 20. annual Feb29 clamping
  const seriesFeb29 = await trackSeries(await createPaymentSeries(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Annual Feb29',
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '1000',
    recurrenceIntervalUnit: RECURRENCE_UNITS.YEAR,
    recurrenceIntervalCount: 1,
    recurrenceAnchorDate: '2024-02-29', // leap year
    mutationId: makeMutationId('feb29-series'),
    idempotencyKey: makeIdempotencyKey('feb29-series'),
    payloadHash: makePayloadHash({ series: 'feb29', anchor: '2024-02-29' }),
  }));
  equal(seriesFeb29.firstDue.dueDate, '2024-02-29', '5C-20 first due Feb 29 (leap)');

  await cancelPaymentDue(personalA, seriesFeb29.firstDue.id, {
    mutationId: makeMutationId('cancel-feb29-1'),
    idempotencyKey: makeIdempotencyKey('cancel-feb29-1'),
    payloadHash: makePayloadHash({ cancel: seriesFeb29.firstDue.id, step: 1 }),
  });
  const duesFeb29_1 = await listPaymentDues(personalA, { paymentSeriesId: seriesFeb29.paymentSeries.id, status: 'PENDING' });
  equal(duesFeb29_1.paymentDues[0].dueDate, '2025-02-28', '5C-20 2025 non-leap -> Feb 28');

  await cancelPaymentDue(personalA, duesFeb29_1.paymentDues[0].id, {
    mutationId: makeMutationId('cancel-feb29-2'),
    idempotencyKey: makeIdempotencyKey('cancel-feb29-2'),
    payloadHash: makePayloadHash({ cancel: duesFeb29_1.paymentDues[0].id, step: 2 }),
  });
  const duesFeb29_2 = await listPaymentDues(personalA, { paymentSeriesId: seriesFeb29.paymentSeries.id, status: 'PENDING' });
  equal(duesFeb29_2.paymentDues[0].dueDate, '2026-02-28', '5C-20 2026 non-leap -> Feb 28');

  await cancelPaymentDue(personalA, duesFeb29_2.paymentDues[0].id, {
    mutationId: makeMutationId('cancel-feb29-3'),
    idempotencyKey: makeIdempotencyKey('cancel-feb29-3'),
    payloadHash: makePayloadHash({ cancel: duesFeb29_2.paymentDues[0].id, step: 3 }),
  });
  const duesFeb29_3 = await listPaymentDues(personalA, { paymentSeriesId: seriesFeb29.paymentSeries.id, status: 'PENDING' });
  equal(duesFeb29_3.paymentDues[0].dueDate, '2027-02-28', '5C-20 2027 non-leap -> Feb 28');

  await cancelPaymentDue(personalA, duesFeb29_3.paymentDues[0].id, {
    mutationId: makeMutationId('cancel-feb29-4'),
    idempotencyKey: makeIdempotencyKey('cancel-feb29-4'),
    payloadHash: makePayloadHash({ cancel: duesFeb29_3.paymentDues[0].id, step: 4 }),
  });
  const duesFeb29_4 = await listPaymentDues(personalA, { paymentSeriesId: seriesFeb29.paymentSeries.id, status: 'PENDING' });
  equal(duesFeb29_4.paymentDues[0].dueDate, '2028-02-29', '5C-20 2028 leap -> back to Feb 29');

  // 21. every 2 weeks
  const series2w = await trackSeries(await createPaymentSeries(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Biweekly',
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '5000',
    recurrenceIntervalUnit: RECURRENCE_UNITS.WEEK,
    recurrenceIntervalCount: 2,
    recurrenceAnchorDate: '2026-09-07',
    mutationId: makeMutationId('2week-series'),
    idempotencyKey: makeIdempotencyKey('2week-series'),
    payloadHash: makePayloadHash({ series: '2week', anchor: '2026-09-07' }),
  }));
  equal(series2w.firstDue.dueDate, '2026-09-07', '5C-21 first due Sep 7');
  await cancelPaymentDue(personalA, series2w.firstDue.id, {
    mutationId: makeMutationId('cancel-2w-1'),
    idempotencyKey: makeIdempotencyKey('cancel-2w-1'),
    payloadHash: makePayloadHash({ cancel: series2w.firstDue.id }),
  });
  const dues2w = await listPaymentDues(personalA, { paymentSeriesId: series2w.paymentSeries.id, status: 'PENDING' });
  equal(dues2w.paymentDues[0].dueDate, '2026-09-21', '5C-21 2 weeks -> Sep 21');

  // 22. custom every N days
  const series30d = await trackSeries(await createPaymentSeries(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Every 30 days',
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '1000',
    recurrenceIntervalUnit: RECURRENCE_UNITS.DAY,
    recurrenceIntervalCount: 30,
    recurrenceAnchorDate: '2026-09-01',
    mutationId: makeMutationId('30day-series'),
    idempotencyKey: makeIdempotencyKey('30day-series'),
    payloadHash: makePayloadHash({ series: '30day', anchor: '2026-09-01' }),
  }));
  equal(series30d.firstDue.dueDate, '2026-09-01', '5C-22 first due Sep 1');
  await cancelPaymentDue(personalA, series30d.firstDue.id, {
    mutationId: makeMutationId('cancel-30d-1'),
    idempotencyKey: makeIdempotencyKey('cancel-30d-1'),
    payloadHash: makePayloadHash({ cancel: series30d.firstDue.id }),
  });
  const dues30d = await listPaymentDues(personalA, { paymentSeriesId: series30d.paymentSeries.id, status: 'PENDING' });
  equal(dues30d.paymentDues[0].dueDate, '2026-10-01', '5C-22 30 days -> Oct 1');

  // 23. custom every N months
  const series3m = await trackSeries(await createPaymentSeries(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Quarterly',
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '30000',
    recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH,
    recurrenceIntervalCount: 3,
    recurrenceAnchorDate: '2026-09-15',
    mutationId: makeMutationId('3month-series'),
    idempotencyKey: makeIdempotencyKey('3month-series'),
    payloadHash: makePayloadHash({ series: '3month', anchor: '2026-09-15' }),
  }));
  equal(series3m.firstDue.dueDate, '2026-09-15', '5C-23 first due Sep 15');
  await cancelPaymentDue(personalA, series3m.firstDue.id, {
    mutationId: makeMutationId('cancel-3m-1'),
    idempotencyKey: makeIdempotencyKey('cancel-3m-1'),
    payloadHash: makePayloadHash({ cancel: series3m.firstDue.id }),
  });
  const dues3m = await listPaymentDues(personalA, { paymentSeriesId: series3m.paymentSeries.id, status: 'PENDING' });
  equal(dues3m.paymentDues[0].dueDate, '2026-12-15', '5C-23 3 months -> Dec 15');
}

async function testCancellationAdvancement(actors) {
  console.log('\n=== CANCELLATION / ADVANCEMENT TESTS ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  // 24. cancelling recurring occurrence retains it
  const series = await trackSeries(await createPaymentSeries(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Retain on cancel',
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '1000',
    recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH,
    recurrenceIntervalCount: 1,
    recurrenceAnchorDate: '2026-09-10',
    mutationId: makeMutationId('retain-series'),
    idempotencyKey: makeIdempotencyKey('retain-series'),
    payloadHash: makePayloadHash({ series: 'retain', anchor: '2026-09-10' }),
  }));

  await cancelPaymentDue(personalA, series.firstDue.id, {
    mutationId: makeMutationId('cancel-retain'),
    idempotencyKey: makeIdempotencyKey('cancel-retain'),
    payloadHash: makePayloadHash({ cancel: series.firstDue.id }),
  });
  const cancelledDue = await getPaymentDueDetail(personalA, series.firstDue.id);
  equal(cancelledDue.paymentDue.status, 'CANCELLED', '5C-24 cancelled due retains CANCELLED status');
  equal(cancelledDue.paymentDue.paymentSeriesId, series.paymentSeries.id, '5C-24 cancelled due retains series link');

  // 25. next occurrence generated exactly once
  const duesAfterCancel = await listPaymentDues(personalA, { paymentSeriesId: series.paymentSeries.id, status: 'PENDING' });
  equal(duesAfterCancel.paymentDues.length, 1, '5C-25 exactly one new PENDING after cancel');
  equal(duesAfterCancel.paymentDues[0].dueDate, '2026-10-10', '5C-25 next occurrence Oct 10');

  // 26. retry does not duplicate
  const samePayloadHash = makePayloadHash({ cancel: series.firstDue.id });
  await cancelPaymentDue(personalA, series.firstDue.id, {
    mutationId: makeMutationId('cancel-retain-retry'), // different mutationId but same payload
    idempotencyKey: makeIdempotencyKey('cancel-retain-retry'),
    payloadHash: samePayloadHash,
  });
  const duesAfterRetry = await listPaymentDues(personalA, { paymentSeriesId: series.paymentSeries.id, status: 'PENDING' });
  equal(duesAfterRetry.paymentDues.length, 1, '5C-26 retry does not duplicate PENDING');
  equal(duesAfterRetry.paymentDues[0].id, duesAfterCancel.paymentDues[0].id, '5C-26 same occurrence returned on retry');

  // 27. cancelling series cancels current pending
  const series2 = await trackSeries(await createPaymentSeries(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Series cancel test',
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '1000',
    recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH,
    recurrenceIntervalCount: 1,
    recurrenceAnchorDate: '2026-09-10',
    mutationId: makeMutationId('series-cancel'),
    idempotencyKey: makeIdempotencyKey('series-cancel'),
    payloadHash: makePayloadHash({ series: 'series-cancel', anchor: '2026-09-10' }),
  }));

  const beforeCancel = await listPaymentDues(personalA, { paymentSeriesId: series2.paymentSeries.id, status: 'PENDING' });
  equal(beforeCancel.paymentDues.length, 1, '5C-27 has PENDING before series cancel');

  await cancelPaymentSeries(personalA, series2.paymentSeries.id, {
    mutationId: makeMutationId('cancel-series'),
    idempotencyKey: makeIdempotencyKey('cancel-series'),
    payloadHash: makePayloadHash({ cancelSeries: series2.paymentSeries.id }),
  });

  const seriesAfterCancel = await getPaymentSeriesDetail(personalA, series2.paymentSeries.id);
  equal(seriesAfterCancel.paymentSeries.status, 'CANCELLED', '5C-27 series status CANCELLED');

  const duesAfterSeriesCancel = await listPaymentDues(personalA, { paymentSeriesId: series2.paymentSeries.id, status: 'PENDING' });
  equal(duesAfterSeriesCancel.paymentDues.length, 0, '5C-27 no PENDING after series cancel');

  const allDues = await listPaymentDues(personalA, { paymentSeriesId: series2.paymentSeries.id, status: 'CANCELLED' });
  equal(allDues.paymentDues.length, 1, '5C-27 original due now CANCELLED');

  // 28. cancelled series creates no replacement
  await cancelPaymentSeries(personalA, series2.paymentSeries.id, {
    mutationId: makeMutationId('cancel-series-retry'),
    idempotencyKey: makeIdempotencyKey('cancel-series-retry'),
    payloadHash: makePayloadHash({ cancelSeries: series2.paymentSeries.id }),
  });
  const duesAfterSeriesCancelRetry = await listPaymentDues(personalA, { paymentSeriesId: series2.paymentSeries.id, status: 'PENDING' });
  equal(duesAfterSeriesCancelRetry.paymentDues.length, 0, '5C-28 retry series cancel creates no PENDING');

  // 29. history unchanged
  const history = await queryDb(
    `select id, status, due_date from finance_payment_dues where payment_series_id = $1 order by due_date`,
    [series2.paymentSeries.id]
  );
  equal(history.rows.length, 1, '5C-29 history has 1 row');
  equal(history.rows[0].status, 'CANCELLED', '5C-29 history row is CANCELLED');
}

async function testEditing(actors) {
  console.log('\n=== EDITING TESTS ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const cat = await trackCategory(await createFinanceCategory(personalA, { type: 'expense', label: 'Edit Cat' }));

  // 30. edit pending one-off
  const due = await trackDue(await createOneOffPaymentDue(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Original title',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '1000',
    dueDate: '2026-09-10',
    categoryId: cat.id,
    mutationId: makeMutationId('edit-oneoff'),
    idempotencyKey: makeIdempotencyKey('edit-oneoff'),
    payloadHash: makePayloadHash({ edit: 'oneoff', original: true }),
  }));

  const edited = await editPaymentDue(personalA, due.id, {
    title: 'Edited title',
    dueDate: '2026-09-15',
    mutationId: makeMutationId('edit-oneoff-exec'),
    idempotencyKey: makeIdempotencyKey('edit-oneoff-exec'),
    payloadHash: makePayloadHash({ edit: 'oneoff', title: 'Edited title', dueDate: '2026-09-15' }),
  });
  equal(edited.paymentDue.title, 'Edited title', '5C-30 edit one-off title');
  equal(edited.paymentDue.dueDate, '2026-09-15', '5C-30 edit one-off dueDate');

  // 31. edit amount KNOWN -> UNKNOWN
  const dueKnown = await trackDue(await createOneOffPaymentDue(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Known to Unknown',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '5000',
    dueDate: '2026-09-20',
    mutationId: makeMutationId('known-unknown'),
    idempotencyKey: makeIdempotencyKey('known-unknown'),
    payloadHash: makePayloadHash({ knownToUnknown: true, original: 'known' }),
  }));

  const editedKnownUnknown = await editPaymentDue(personalA, dueKnown.id, {
    expectedAmountKnown: false,
    mutationId: makeMutationId('known-unknown-exec'),
    idempotencyKey: makeIdempotencyKey('known-unknown-exec'),
    payloadHash: makePayloadHash({ knownToUnknown: true, exec: true }),
  });
  equal(editedKnownUnknown.paymentDue.expectedAmountKnown, false, '5C-31 KNOWN -> UNKNOWN');
  equal(editedKnownUnknown.paymentDue.expectedAmount, null, '5C-31 amount null when UNKNOWN');

  // 32. edit amount UNKNOWN -> KNOWN
  const dueUnknown = await trackDue(await createOneOffPaymentDue(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Unknown to Known',
    currency: 'ARS',
    expectedAmountKnown: false,
    dueDate: '2026-09-25',
    mutationId: makeMutationId('unknown-known'),
    idempotencyKey: makeIdempotencyKey('unknown-known'),
    payloadHash: makePayloadHash({ unknownToKnown: true, original: 'unknown' }),
  }));

  const editedUnknownKnown = await editPaymentDue(personalA, dueUnknown.id, {
    expectedAmountKnown: true,
    expectedAmount: '7500',
    mutationId: makeMutationId('unknown-known-exec'),
    idempotencyKey: makeIdempotencyKey('unknown-known-exec'),
    payloadHash: makePayloadHash({ unknownToKnown: true, exec: true, amount: '7500' }),
  });
  equal(editedUnknownKnown.paymentDue.expectedAmountKnown, true, '5C-32 UNKNOWN -> KNOWN');
  equal(editedUnknownKnown.paymentDue.expectedAmount, '7500', '5C-32 amount set when KNOWN');

  // 33. edit series recurrence updates current future occurrence
  const series = await trackSeries(await createPaymentSeries(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Series to edit',
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '1000',
    recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH,
    recurrenceIntervalCount: 1,
    recurrenceAnchorDate: '2026-09-10',
    mutationId: makeMutationId('edit-series'),
    idempotencyKey: makeIdempotencyKey('edit-series'),
    payloadHash: makePayloadHash({ editSeries: true, anchor: '2026-09-10' }),
  }));

  const originalDueDate = series.firstDue.dueDate;
  const editedSeries = await editPaymentSeries(personalA, series.paymentSeries.id, {
    recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH,
    recurrenceIntervalCount: 2, // change to every 2 months
    recurrenceAnchorDate: '2026-09-10', // same anchor
    mutationId: makeMutationId('edit-series-exec'),
    idempotencyKey: makeIdempotencyKey('edit-series-exec'),
    payloadHash: makePayloadHash({ editSeries: true, interval: 2 }),
  });
  equal(editedSeries.paymentSeries.recurrenceIntervalCount, 2, '5C-33 series interval updated');
  // Current PENDING due should reflect new recurrence (next from anchor with new interval)
  // Since anchor is same and current due was on anchor, next would be anchor + 2 months
  // But the current due stays on anchor date since it's the first occurrence
  equal(editedSeries.currentDue.dueDate, '2026-09-10', '5C-33 current due remains on anchor');

  // Now cancel current and verify next uses new interval
  await cancelPaymentDue(personalA, editedSeries.currentDue.id, {
    mutationId: makeMutationId('cancel-after-edit'),
    idempotencyKey: makeIdempotencyKey('cancel-after-edit'),
    payloadHash: makePayloadHash({ cancelAfterEdit: true }),
  });
  const nextDue = await listPaymentDues(personalA, { paymentSeriesId: series.paymentSeries.id, status: 'PENDING' });
  equal(nextDue.paymentDues[0].dueDate, '2026-11-10', '5C-33 next due uses new 2-month interval');

  // 34. edit series defaults does not rewrite terminal history
  const seriesHist = await trackSeries(await createPaymentSeries(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'History test',
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '1000',
    recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH,
    recurrenceIntervalCount: 1,
    recurrenceAnchorDate: '2026-09-10',
    mutationId: makeMutationId('history-series'),
    idempotencyKey: makeIdempotencyKey('history-series'),
    payloadHash: makePayloadHash({ history: true, anchor: '2026-09-10' }),
  }));

  // Cancel first due (becomes history)
  await cancelPaymentDue(personalA, seriesHist.firstDue.id, {
    mutationId: makeMutationId('cancel-hist-1'),
    idempotencyKey: makeIdempotencyKey('cancel-hist-1'),
    payloadHash: makePayloadHash({ cancelHist: seriesHist.firstDue.id }),
  });
  const secondDue = (await listPaymentDues(personalA, { paymentSeriesId: seriesHist.paymentSeries.id, status: 'PENDING' })).paymentDues[0];

  // Edit series title and default amount
  await editPaymentSeries(personalA, seriesHist.paymentSeries.id, {
    title: 'New Title',
    defaultExpectedAmount: '2000',
    mutationId: makeMutationId('edit-history'),
    idempotencyKey: makeIdempotencyKey('edit-history'),
    payloadHash: makePayloadHash({ editHistory: true, newTitle: 'New Title' }),
  });

  // Verify cancelled due retains original title and amount
  const cancelledDetail = await getPaymentDueDetail(personalA, seriesHist.firstDue.id);
  equal(cancelledDetail.paymentDue.title, 'History test', '5C-34 cancelled due retains original title');
  equal(cancelledDetail.paymentDue.expectedAmount, '1000', '5C-34 cancelled due retains original amount');

  // Verify current PENDING due reflects new defaults
  const currentDetail = await getPaymentDueDetail(personalA, secondDue.id);
  equal(currentDetail.paymentDue.title, 'New Title', '5C-34 current due reflects new title');
  equal(currentDetail.paymentDue.expectedAmount, '2000', '5C-34 current due reflects new amount');

  // 35. still exactly one pending occurrence
  const pendingCount = await queryDb(
    `select count(*)::int as cnt from finance_payment_dues where payment_series_id = $1 and status = 'PENDING'`,
    [seriesHist.paymentSeries.id]
  );
  equal(pendingCount.rows[0].cnt, 1, '5C-35 exactly one PENDING after series edit');
}

async function testIdempotency(actors) {
  console.log('\n=== IDEMPOTENCY TESTS ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);

  // 36. create replay returns same logical result
  const payload = {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Idempotent create',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '1000',
    dueDate: '2026-09-10',
  };
  const mutationId = makeMutationId('idem-create');
  const idempotencyKey = makeIdempotencyKey('idem-create');
  const payloadHash = makePayloadHash(payload);

  const created1 = await trackDue(await createOneOffPaymentDue(personalA, {
    ...payload,
    mutationId,
    idempotencyKey,
    payloadHash,
  }));

  const created2 = await trackDue(await createOneOffPaymentDue(personalA, {
    ...payload,
    mutationId, // same mutationId
    idempotencyKey, // same idempotencyKey
    payloadHash, // same payloadHash
  }));

  equal(created1.id, created2.id, '5C-36 create replay returns same due ID');

  // 37. conflicting replay rejected
  await expectError(
    () => createOneOffPaymentDue(personalA, {
      ...payload,
      mutationId, // same mutationId
      idempotencyKey: makeIdempotencyKey('idem-create-conflict'), // different idempotencyKey
      payloadHash: makePayloadHash({ ...payload, amount: '2000' }), // different payload
    }),
    'finance_payment_conflicting_payload',
    '5C-37 conflicting payload with same mutationId rejected',
  );

  // 38. cancellation replay safe
  const dueToCancel = await trackDue(await createOneOffPaymentDue(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Cancel idem',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '1000',
    dueDate: '2026-09-20',
    mutationId: makeMutationId('cancel-idem-create'),
    idempotencyKey: makeIdempotencyKey('cancel-idem-create'),
    payloadHash: makePayloadHash({ cancelIdem: true }),
  }));

  const cancelPayloadHash = makePayloadHash({ cancel: dueToCancel.id });
  const cancelMutationId = makeMutationId('cancel-idem');
  const cancelIdemKey = makeIdempotencyKey('cancel-idem');

  await cancelPaymentDue(personalA, dueToCancel.id, {
    mutationId: cancelMutationId,
    idempotencyKey: cancelIdemKey,
    payloadHash: cancelPayloadHash,
  });

  // Replay cancellation
  const cancelled2 = await cancelPaymentDue(personalA, dueToCancel.id, {
    mutationId: cancelMutationId,
    idempotencyKey: cancelIdemKey,
    payloadHash: cancelPayloadHash,
  });
  equal(cancelled2.paymentDue.status, 'CANCELLED', '5C-38 cancellation replay returns CANCELLED');
  equal(cancelled2.paymentDue.id, dueToCancel.id, '5C-38 same due returned');

  // 39. series edit replay safe
  const series = await trackSeries(await createPaymentSeries(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Series idem edit',
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '1000',
    recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH,
    recurrenceIntervalCount: 1,
    recurrenceAnchorDate: '2026-09-10',
    mutationId: makeMutationId('series-idem'),
    idempotencyKey: makeIdempotencyKey('series-idem'),
    payloadHash: makePayloadHash({ seriesIdem: true, anchor: '2026-09-10' }),
  }));

  const editPayloadHash = makePayloadHash({ editSeries: series.paymentSeries.id, newTitle: 'Edited' });
  const editMutationId = makeMutationId('edit-idem');
  const editIdemKey = makeIdempotencyKey('edit-idem');

  const edited1 = await editPaymentSeries(personalA, series.paymentSeries.id, {
    title: 'Edited',
    mutationId: editMutationId,
    idempotencyKey: editIdemKey,
    payloadHash: editPayloadHash,
  });

  const edited2 = await editPaymentSeries(personalA, series.paymentSeries.id, {
    title: 'Edited',
    mutationId: editMutationId,
    idempotencyKey: editIdemKey,
    payloadHash: editPayloadHash,
  });

  equal(edited1.paymentSeries.title, 'Edited', '5C-39 series edit replay returns edited series');
  equal(edited1.paymentSeries.id, edited2.paymentSeries.id, '5C-39 same series ID on replay');
}

async function testReadContracts(actors) {
  console.log('\n=== READ CONTRACTS TESTS ===');
  const personalA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.PERSONAL);
  const householdA = await resolvedContext(actors.a, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const cat = await trackCategory(await createFinanceCategory(personalA, { type: 'expense', label: 'Read Cat' }));
  const ccAccount = await trackAccount(await createFinanceAccount(personalA, {
    name: 'Visa Read',
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
  }));

  // Create test data
  const due1 = await trackDue(await createOneOffPaymentDue(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Early due',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '1000',
    dueDate: '2026-09-05',
    categoryId: cat.id,
    mutationId: makeMutationId('read-due1'),
    idempotencyKey: makeIdempotencyKey('read-due1'),
    payloadHash: makePayloadHash({ read: 1 }),
  }));

  const due2 = await trackDue(await createOneOffPaymentDue(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Late due',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '2000',
    dueDate: '2026-09-20',
    mutationId: makeMutationId('read-due2'),
    idempotencyKey: makeIdempotencyKey('read-due2'),
    payloadHash: makePayloadHash({ read: 2 }),
  }));

  const series = await trackSeries(await createPaymentSeries(personalA, {
    kind: PAYMENT_KINDS.CREDIT_CARD,
    title: 'Visa Series',
    currency: 'ARS',
    defaultExpectedAmountKnown: true,
    defaultExpectedAmount: '180000',
    targetCreditCardAccountId: ccAccount.id,
    recurrenceIntervalUnit: RECURRENCE_UNITS.MONTH,
    recurrenceIntervalCount: 1,
    recurrenceAnchorDate: '2026-09-10',
    mutationId: makeMutationId('read-series'),
    idempotencyKey: makeIdempotencyKey('read-series'),
    payloadHash: makePayloadHash({ readSeries: true }),
  }));

  // 40. list scoped correctly
  const personalList = await listPaymentDues(personalA, {});
  const householdList = await listPaymentDues(householdA, {});
  const readIds = [due1.id, due2.id, series.firstDue.id];
  assert(readIds.every((id) => personalList.paymentDues.some((due) => due.id === id)), '5C-40 PERSONAL list includes all 3 read-contract dues');
  assert(readIds.every((id) => !householdList.paymentDues.some((due) => due.id === id)), '5C-40 HOUSEHOLD list excludes personal read-contract dues');

  // 41. due ordering by date
  const ordered = await listPaymentDues(personalA, {});
  const orderedReadDues = ordered.paymentDues.filter((due) => readIds.includes(due.id));
  deepEqual(orderedReadDues.map((due) => due.dueDate), ['2026-09-05', '2026-09-10', '2026-09-20'], '5C-41 read-contract dues ordered by dueDate asc');

  // 42. overdue derived correctly (using a past date)
  const pastDue = await trackDue(await createOneOffPaymentDue(personalA, {
    kind: PAYMENT_KINDS.NORMAL,
    title: 'Past due',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '500',
    dueDate: '2020-01-01', // far in past
    mutationId: makeMutationId('overdue'),
    idempotencyKey: makeIdempotencyKey('overdue'),
    payloadHash: makePayloadHash({ overdue: true }),
  }));

  const pastDetail = await getPaymentDueDetail(personalA, pastDue.id);
  equal(pastDetail.paymentDue.overdue, true, '5C-42 past due is overdue');

  const futureDetail = await getPaymentDueDetail(personalA, due2.id);
  equal(futureDetail.paymentDue.overdue, false, '5C-42 future due not overdue');

  // 43. CANCELLED not reported as overdue
  await cancelPaymentDue(personalA, pastDue.id, {
    mutationId: makeMutationId('cancel-overdue'),
    idempotencyKey: makeIdempotencyKey('cancel-overdue'),
    payloadHash: makePayloadHash({ cancelOverdue: pastDue.id }),
  });
  const cancelledDetail = await getPaymentDueDetail(personalA, pastDue.id);
  equal(cancelledDetail.paymentDue.overdue, false, '5C-43 CANCELLED not overdue');

  // 44. detail returns recurrence/card metadata accurately
  const seriesDetail = await getPaymentSeriesDetail(personalA, series.paymentSeries.id);
  equal(seriesDetail.paymentSeries.kind, 'CREDIT_CARD', '5C-44 series kind CREDIT_CARD');
  assert(seriesDetail.paymentSeries.targetCreditCardAccountId === ccAccount.id, '5C-44 series target card correct');
  assert(seriesDetail.paymentSeries.recurrenceIntervalUnit === 'MONTH', '5C-44 series recurrence unit');
  assert(seriesDetail.paymentSeries.recurrenceIntervalCount === 1, '5C-44 series recurrence count');
  assert(seriesDetail.paymentSeries.recurrenceAnchorDate === '2026-09-10', '5C-44 series anchor date');

  const dueDetail = await getPaymentDueDetail(personalA, series.firstDue.id);
  equal(dueDetail.paymentDue.kind, 'CREDIT_CARD', '5C-44 due kind CREDIT_CARD');
  assert(dueDetail.paymentDue.targetCreditCardAccountId === ccAccount.id, '5C-44 due target card correct');
  assert(dueDetail.paymentDue.paymentSeriesId === series.paymentSeries.id, '5C-44 due linked to series');
}

async function main() {
  console.log('FINANCE_5C_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigrations();
  const actors = await setupActors();

  try {
    await testOneOffPaymentDue(actors);
    await testContextIsolation(actors);
    await testCreditCardObligation(actors);
    await testRecurrence(actors);
    await testCancellationAdvancement(actors);
    await testEditing(actors);
    await testIdempotency(actors);
    await testReadContracts(actors);
  } finally {
    await cleanup();
  }

  // Verify fixture cleanup
  const people = await queryDb("select count(*)::int as count from public.people where display_name like 'Fin 5C %'");
  const households = await queryDb("select count(*)::int as count from public.households where slug like 'fin5c-%'");
  const dues = await queryDb('select count(*)::int as count from public.finance_payment_dues where id = any($1::uuid[])', [fixture.paymentDueIds]);
  const series = await queryDb('select count(*)::int as count from public.finance_payment_series where id = any($1::uuid[])', [fixture.paymentSeriesIds]);
  const accounts = await queryDb('select count(*)::int as count from public.finance_accounts where id = any($1::uuid[])', [fixture.accountIds]);
  const categories = await queryDb('select count(*)::int as count from public.finance_categories where id = any($1::uuid[])', [fixture.categoryIds]);

  equal(people.rows[0].count, 0, 'fixture cleanup leaves no 5C people');
  equal(households.rows[0].count, 0, 'fixture cleanup leaves no 5C households');
  equal(dues.rows[0].count, 0, 'fixture cleanup leaves no 5C payment dues');
  equal(series.rows[0].count, 0, 'fixture cleanup leaves no 5C payment series');
  equal(accounts.rows[0].count, 0, 'fixture cleanup leaves no 5C accounts');
  equal(categories.rows[0].count, 0, 'fixture cleanup leaves no 5C categories');

  console.log(`\nFINANCE_5C_PAYMENT_FOUNDATION_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_5C_PAYMENT_FOUNDATION_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_5C_PAYMENT_FOUNDATION_TESTS=PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_5C_PAYMENT_FOUNDATION_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
