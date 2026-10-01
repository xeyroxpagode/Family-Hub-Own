#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 8D.2 Credit Card Installment Foundation tests.
 *
 * Local Supabase only. Applies the 8D.2 migration, then validates the dormant
 * installment domain foundation:
 *   - card-only invariant
 *   - one-plan-per-root idempotency
 *   - installments count bounds (2..60)
 *   - exact numeric(18,4) allocation (no floating point)
 *   - installment rows are NOT finance_transactions / account effects / PaymentDue
 *   - existing card / ACCOUNT expenses remain untouched
 *   - PERSONAL + HOUSEHOLD privacy
 *   - no user-reachable mutation is exposed (normal Expense path never creates plans)
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
for (const rel of ['backend/.env.test.local', 'backend/.env.local', 'backend/.env', '.env.test.local', '.env.local']) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) {
    const parsed = require('../backend/node_modules/dotenv').parse(fs.readFileSync(abs));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

const { Client } = require('../backend/node_modules/pg');
const { createClient } = require('../backend/node_modules/@supabase/supabase-js');
const { loadTestEnvironment } = require('../tests/helpers/environment');
const {
  FINANCE_ACCOUNT_TYPES,
  FINANCE_CONTEXT_TYPES,
} = require('../backend/src/constants/finance.constants');
const { resolveFinanceContext } = require('../backend/src/services/finance.context.service');
const { createFinanceAccount } = require('../backend/src/services/finance.account.service');
const { createExpense } = require('../backend/src/services/finance.transaction.service');
const {
  createCreditCardInstallmentPlan,
  getCreditCardInstallmentPlan,
} = require('../backend/src/services/finance.installment.service');

loadTestEnvironment({ required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] });

const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`ENVIRONMENT_FAILURE: missing env: ${missing.join(', ')}`);
  process.exit(2);
}

const supabaseUrl = new URL(process.env.SUPABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(supabaseUrl.hostname)) {
  console.error('ENVIRONMENT_FAILURE: Finance 8D.2 tests are local-only.');
  process.exit(2);
}

const databaseUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:56222/postgres';
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
  planIds: [],
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
    return null;
  }
  if (error.code !== expectedCode) {
    failCount += 1;
    console.error(`  FAIL: ${message} (expected ${expectedCode}, got ${error.code}: ${error.message})`);
    return null;
  }
  passCount += 1;
  console.log(`  PASS: ${message} (code=${error.code})`);
  return error;
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

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.code || 'unknown'}: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin8d2-${label}-${suffix}@example.test`;
  const password = `Fin8D2_${crypto.randomBytes(18).toString('base64url')}!9a`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Fin 8D.2 QA ${label}` },
  });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.code || 'unknown'}: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', {
    auth_user_id: authUserId,
    display_name: `Fin 8D.2 ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  });
  fixture.personIds.push(person.id);
  return person;
}

async function signIn(email, password) {
  const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(`sign in failed: ${error?.message || 'no session'}`);
  return data.session.access_token;
}

async function personalContext(user, email, password) {
  const accessToken = await signIn(email, password);
  return resolveFinanceContext({ user: { id: user.id }, accessToken }, FINANCE_CONTEXT_TYPES.PERSONAL);
}

async function createCard(ctx, name) {
  const result = await createFinanceAccount(ctx, {
    name,
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD,
    closingDay: 28,
    dueDay: 8,
    initialBalance: { amount: '0', effectiveDate: '2026-08-01' },
  });
  fixture.accountIds.push(result.account.id);
  return result.account;
}

async function createAccount(ctx, name, balance) {
  const result = await createFinanceAccount(ctx, {
    name,
    currency: 'ARS',
    accountType: FINANCE_ACCOUNT_TYPES.ACCOUNT,
    initialBalance: { amount: balance, effectiveDate: '2026-08-01' },
  });
  fixture.accountIds.push(result.account.id);
  return result.account;
}

async function createCardExpense(ctx, accountId, amount, description) {
  const result = await createExpense(ctx, {
    amount,
    currency: 'ARS',
    date: '2026-09-01',
    description,
    account: accountId,
  });
  fixture.transactionIds.push(result.transaction.id);
  return result.transaction;
}

async function createPlan(ctx, transactionId, count) {
  const result = await createCreditCardInstallmentPlan(ctx, {
    expenseRootTransactionId: transactionId,
    installmentCount: count,
  });
  fixture.planIds.push(result.planId);
  return result;
}

async function verifyPlanExact(planId, expectedCount, expectedTotalText, label) {
  const res = await queryDb(
    `select
       count(*)::int as cnt,
       count(distinct i.ordinal)::int as distinct_ord,
       min(i.ordinal)::int as min_ord,
       max(i.ordinal)::int as max_ord,
       min(i.amount)::text as min_amount,
       (sum(i.amount) = p.total_amount) as exact_sum,
       sum(i.amount)::text as sum_text,
       p.total_amount::text as total_text
     from public.finance_credit_card_installments i
     join public.finance_credit_card_installment_plans p on p.id = i.installment_plan_id
     where p.id = $1
     group by p.total_amount`,
    [planId],
  );
  const row = res.rows[0];
  if (!row) return assert(false, `${label}: plan rows missing`);
  assert(row.cnt === expectedCount, `${label}: has ${expectedCount} installments`);
  assert(row.distinct_ord === expectedCount, `${label}: ordinal values are unique`);
  assert(row.min_ord === 1, `${label}: ordinals start at 1`);
  assert(row.max_ord === expectedCount, `${label}: ordinals end at N (no gaps)`);
  assert(row.min_amount !== '0' && !row.min_amount.startsWith('-'), `${label}: every installment amount positive`);
  assert(row.exact_sum === true, `${label}: exact sum equals purchase total (${row.sum_text} == ${row.total_text})`);
  equal(row.total_text, expectedTotalText, `${label}: plan total matches root expense amount`);
}

async function countRows(table, filter) {
  let request = admin.from(table).select('id', { count: 'exact', head: true });
  if (filter) request = request.in('id', filter);
  const { count, error } = await request;
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count;
}

async function countOwned(table, ownerColumn, ownerValue) {
  const { count, error } = await admin.from(table).select('id', { count: 'exact', head: true }).eq(ownerColumn, ownerValue);
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count;
}

async function cleanup() {
  if (fixture.planIds.length) {
    await admin.from('finance_credit_card_installment_plans').delete().in('id', fixture.planIds);
  }
  if (fixture.transactionIds.length) {
    await admin.from('finance_transactions').delete().in('id', fixture.transactionIds);
  }
  if (fixture.accountIds.length) {
    await admin.from('finance_accounts').delete().in('id', fixture.accountIds);
  }
  if (fixture.personIds.length) {
    await admin.from('people').update({ active_household_id: null }).in('id', fixture.personIds);
  }
  for (const householdId of fixture.householdIds) {
    await admin.from('household_members').delete().eq('household_id', householdId);
    await admin.from('households').delete().eq('id', householdId);
  }
  if (fixture.personIds.length) {
    await admin.from('people').delete().in('id', fixture.personIds);
  }
  for (const userId of fixture.authUserIds) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
}

async function main() {
  console.log('FINANCE_8D2_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigration('supabase/migrations/20260906000000_finance_credit_card_installment_foundation_v1_1.sql');

  const userA = await createAuthUser('a');
  const personA = await createPerson(userA.user.id, 'A');
  const ctxA = await personalContext(userA.user, userA.email, userA.password);

  const userB = await createAuthUser('b');
  const personB = await createPerson(userB.user.id, 'B');

  const userC = await createAuthUser('c');
  const personC = await createPerson(userC.user.id, 'C');

  try {
    const account = await createAccount(ctxA, 'Cuenta ARS', '1000000');
    const card = await createCard(ctxA, 'Visa 8D2');

    const accountExpense = await createCardExpense(ctxA, account.id, '50000', 'Gasto cuenta normal');
    const normalCardExpense = await createCardExpense(ctxA, card.id, '20000', 'Compra tarjeta sin cuotas');

    console.log('\nI01 - ACCOUNT Expense cannot own a plan');
    await expectError(
      () => createPlan(ctxA, accountExpense.id, 3),
      'finance_installment_requires_credit_card',
      'I01 ACCOUNT-backed expense plan rejected',
    );

    console.log('\nI02 - existing normal card Expense has no plan');
    const noPlan = await getCreditCardInstallmentPlan(ctxA, normalCardExpense.id);
    equal(noPlan.plan, null, 'I02 normal card expense yields no installment plan');
    equal(normalCardExpense.amount, 20000, 'I02 normal card expense amount unchanged');
    equal(normalCardExpense.type, 'expense', 'I02 normal card expense type unchanged');

    console.log('\nI03-I05 - count bounds');
    await expectError(() => createPlan(ctxA, normalCardExpense.id, 0), 'invalid_finance_installment_count', 'I03 count 0 invalid');
    await expectError(() => createPlan(ctxA, normalCardExpense.id, -3), 'invalid_finance_installment_count', 'I04 negative count invalid');
    await expectError(() => createPlan(ctxA, normalCardExpense.id, 61), 'finance_installment_count_exceeds_max', 'I05 over bound (61) invalid');

    console.log('\nI06-I07 - divisible allocation 120000 / 3');
    const divExpense = await createCardExpense(ctxA, card.id, '120000', 'Compra divisible');
    await createPlan(ctxA, divExpense.id, 3);
    await verifyPlanExact(fixture.planIds[0], 3, '120000.0000', 'I06 divisible exact');

    console.log('\nI08 - exact 40000 distribution');
    const divRows = await queryDb(
      `select ordinal, amount::text as amount from public.finance_credit_card_installments where installment_plan_id = $1 order by ordinal`,
      [fixture.planIds[0]],
    );
    equal(divRows.rows[0].amount, '40000.0000', 'I08 cuota 1 = 40000');
    equal(divRows.rows[1].amount, '40000.0000', 'I08 cuota 2 = 40000');
    equal(divRows.rows[2].amount, '40000.0000', 'I08 cuota 3 = 40000');

    console.log('\nI09 - non-divisible allocation 100000 / 3 (deterministic remainder to last)');
    const nonDivExpense = await createCardExpense(ctxA, card.id, '100000', 'Compra no divisible');
    await createPlan(ctxA, nonDivExpense.id, 3);
    await verifyPlanExact(fixture.planIds[1], 3, '100000.0000', 'I09 non-divisible exact');
    const nonDivRows = await queryDb(
      `select ordinal, amount::text as amount from public.finance_credit_card_installments where installment_plan_id = $1 order by ordinal`,
      [fixture.planIds[1]],
    );
    equal(nonDivRows.rows[0].amount, '33333.3333', 'I09 cuota 1 base');
    equal(nonDivRows.rows[1].amount, '33333.3333', 'I09 cuota 2 base');
    equal(nonDivRows.rows[2].amount, '33333.3334', 'I09 cuota 3 receives remainder');

    console.log('\nI10 - count 2 valid');
    const count2Expense = await createCardExpense(ctxA, card.id, '250000', 'Compra dos cuotas');
    await createPlan(ctxA, count2Expense.id, 2);
    await verifyPlanExact(fixture.planIds[2], 2, '250000.0000', 'I10 count 2');

    console.log('\nI11 - larger count valid (12)');
    const count12Expense = await createCardExpense(ctxA, card.id, '600000', 'Compra doce cuotas');
    await createPlan(ctxA, count12Expense.id, 12);
    await verifyPlanExact(fixture.planIds[3], 12, '600000.0000', 'I11 count 12');

    console.log('\nI12 - tiny-value edge case handled safely');
    const tinyExpense = await createCardExpense(ctxA, card.id, '0.0001', 'Compra diminuta');
    await expectError(
      () => createPlan(ctxA, tinyExpense.id, 2),
      'finance_installment_total_too_small_for_count',
      'I12 tiny total cannot split into positive installments',
    );

    console.log('\nI13 - duplicate plan idempotency');
    await expectError(
      () => createPlan(ctxA, divExpense.id, 3),
      'finance_credit_card_installment_plan_exists',
      'I13 second plan on same root rejected',
    );

    console.log('\nI14 - read model DTO');
    const readPlan = await getCreditCardInstallmentPlan(ctxA, divExpense.id);
    assert(readPlan.plan !== null, 'I14 read model returns a plan');
    equal(readPlan.plan.installmentCount, 3, 'I14 installmentCount');
    equal(readPlan.plan.totalAmount, '120000.0000', 'I14 totalAmount string');
    equal(readPlan.plan.currency, 'ARS', 'I14 currency');
    equal(readPlan.plan.installments.length, 3, 'I14 installments length');
    equal(readPlan.plan.installments[0].ordinal, 1, 'I14 first ordinal');
    equal(readPlan.plan.installments[2].amount, '40000.0000', 'I14 amount as canonical string');

    console.log('\nI15-I18 - no secondary financial effects');
    const txnBefore = await countOwned('finance_transactions', 'created_by_person_id', personA.id);
    const effectsBefore = await queryDb(
      `select count(*)::int as n from public.finance_account_effects e join public.finance_accounts a on a.id = e.account_id where a.owner_person_id = $1`,
      [personA.id],
    );
    const paymentDuesBefore = await countOwned('finance_payment_dues', 'created_by_person_id', personA.id);

    const effectsCount = await queryDb(
      `select count(*)::int as n from public.finance_account_effects e join public.finance_accounts a on a.id = e.account_id where a.owner_person_id = $1`,
      [personA.id],
    );
    const txnAfter = await countOwned('finance_transactions', 'created_by_person_id', personA.id);
    const paymentDuesAfter = await countOwned('finance_payment_dues', 'created_by_person_id', personA.id);

    equal(txnAfter, txnBefore, 'I15 installment creation creates no finance_transactions');
    equal(effectsCount.rows[0].n, effectsBefore.rows[0].n, 'I16 installment creation creates no account effects');
    equal(paymentDuesAfter, paymentDuesBefore, 'I17 installment creation creates no PaymentDue');

    const installmentTxnLink = await queryDb(
      `select count(*)::int as n from public.finance_credit_card_installments i join public.finance_transactions t on t.id = i.id where false`,
    );
    equal(installmentTxnLink.rows[0].n, 0, 'I18 installment rows have no transaction identity');

    console.log('\nI19 - PERSONAL privacy');
    const ctxB = await personalContext(userB.user, userB.email, userB.password);
    const crossRead = await getCreditCardInstallmentPlan(ctxB, divExpense.id);
    equal(crossRead.plan, null, 'I19 user B cannot read user A plan');
    await expectError(
      () => createCreditCardInstallmentPlan(ctxB, { expenseRootTransactionId: divExpense.id, installmentCount: 2 }),
      'finance_transaction_not_found',
      'I19 user B cannot create plan on user A expense',
    );

    console.log('\nI20 - HOUSEHOLD privacy / membership');
    const household = await insertOne('households', {
      name: 'Casa 8D2',
      slug: `fin8d2-${crypto.randomBytes(8).toString('hex')}`,
      timezone: 'America/Argentina/Buenos_Aires',
      default_language: 'es-419',
      config: {},
      created_by_person_id: personA.id,
    });
    fixture.householdIds.push(household.id);
    const joinedAt = new Date().toISOString();
    await admin.from('household_members').insert([
      { household_id: household.id, person_id: personA.id, role: 'coordinator', status: 'active', joined_at: joinedAt, household_onboarding_status: 'completed', household_onboarding_completed_at: joinedAt },
      { household_id: household.id, person_id: personB.id, role: 'adult', status: 'active', joined_at: joinedAt, household_onboarding_status: 'completed', household_onboarding_completed_at: joinedAt },
    ]);
    await admin.from('people').update({ active_household_id: household.id }).in('id', [personA.id, personB.id]);

    const tokenA = await signIn(userA.email, userA.password);
    const ctxAHousehold = await resolveFinanceContext({ user: { id: userA.user.id }, accessToken: tokenA }, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
    const householdCard = await createCard(ctxAHousehold, 'Visa Casa 8D2');
    const householdExpense = await createCardExpense(ctxAHousehold, householdCard.id, '90000', 'Compra casa en cuotas');
    await createPlan(ctxAHousehold, householdExpense.id, 3);
    await verifyPlanExact(fixture.planIds[4], 3, '90000.0000', 'I20 household plan');

    const tokenB = await signIn(userB.email, userB.password);
    const ctxBHousehold = await resolveFinanceContext({ user: { id: userB.user.id }, accessToken: tokenB }, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
    const memberRead = await getCreditCardInstallmentPlan(ctxBHousehold, householdExpense.id);
    assert(memberRead.plan !== null && memberRead.plan.installmentCount === 3, 'I20 household member can read plan');

    const ctxCPersonal = await personalContext(userC.user, userC.email, userC.password);
    const outsiderRead = await getCreditCardInstallmentPlan(ctxCPersonal, householdExpense.id);
    equal(outsiderRead.plan, null, 'I20 non-member cannot read household plan');

    console.log('\nI21 - no user-reachable mutation from normal Expense path');
    const dormantCheck = await queryDb(
      `select count(*)::int as n from public.finance_credit_card_installment_plans p join public.finance_transactions t on t.root_transaction_id = p.expense_root_transaction_id where t.id = $1`,
      [normalCardExpense.id],
    );
    equal(dormantCheck.rows[0].n, 0, 'I21 normal Expense path never created a plan');
  } finally {
    await cleanup();
  }

  console.log(`\nFINANCE_8D2_CREDIT_CARD_INSTALLMENT_FOUNDATION_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_8D2_CREDIT_CARD_INSTALLMENT_FOUNDATION_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_8D2_CREDIT_CARD_INSTALLMENT_FOUNDATION_TESTS=PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_8D2_CREDIT_CARD_INSTALLMENT_FOUNDATION_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});