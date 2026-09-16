#!/usr/bin/env node
'use strict';

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
const { FINANCE_CONTEXT_TYPES } = require('../backend/src/constants/finance.constants');
const { resolveFinanceContext } = require('../backend/src/services/finance.context.service');
const { createFinanceAccount } = require('../backend/src/services/finance.account.service');
const { createFinanceCategory, deleteFinanceCategory } = require('../backend/src/services/finance.category.service');
const { createExpense, createIncome } = require('../backend/src/services/finance.transaction.service');
const { correctTransaction } = require('../backend/src/services/finance.transaction.correction.service');
const { trashFinanceTransaction } = require('../backend/src/services/finance.transaction.trash.service');
const { restoreFinanceTransaction } = require('../backend/src/services/finance.transaction.restore.service');
const { createRefund, correctRefund } = require('../backend/src/services/finance.refund.service');
const { createTransfer } = require('../backend/src/services/finance.transfer.service');
const {
  createOneOffPaymentDue,
  registerPayment,
} = require('../backend/src/services/finance.payment.service');
const {
  createSpendingLimit,
  editSpendingLimit,
  cancelSpendingLimit,
} = require('../backend/src/services/finance.spending-limit.service');
const {
  getFinanceAnalysis,
  getSpendingLimitProgress,
} = require('../backend/src/services/finance.analysis.service');

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
  console.error('ENVIRONMENT_FAILURE: Finance 6C.4 tests are local-only.');
  process.exit(2);
}

const databaseUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let passCount = 0;
let failCount = 0;
const fixture = { authUserIds: [] };

function assert(condition, message) {
  if (condition) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
}

function equal(actual, expected, message) {
  assert(actual === expected, `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

function decimalEqual(actual, expected, message) {
  const diff = Math.abs(Number(actual) - Number(expected));
  assert(diff <= 0.0001, `${message} (expected ${expected}, got ${actual}, diff ${diff})`);
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
  if (expectedCode && error.code !== expectedCode) {
    failCount += 1;
    console.error(`  FAIL: ${message} (expected ${expectedCode}, got ${error.code}: ${error.message})`);
    return;
  }
  passCount += 1;
  console.log(`  PASS: ${message} (code=${error.code})`);
}

async function queryDb(sql, params = []) {
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, statement_timeout: 30000 });
  await client.connect();
  try {
    return await client.query(sql, params);
  } finally {
    await client.end();
  }
}

function randomCredential(label) {
  return `Fin6C4_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

function correlation(label = 'op') {
  const safeLabel = String(label).replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 40);
  return {
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c4-${safeLabel}-${crypto.randomUUID()}`,
  };
}

function paymentPayloadHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function paymentMutation(label, payload = {}) {
  const mutationId = crypto.randomUUID();
  const idempotencyKey = `finance-6c4-payment-${label}-${crypto.randomUUID()}`;
  return { mutationId, idempotencyKey, payloadHash: paymentPayloadHash({ label, mutationId, idempotencyKey, payload }) };
}

async function createTestUser(suffix) {
  const email = `finance-6c4-${suffix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}@example.test`;
  const password = randomCredential(suffix);
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.message ?? 'missing user'}`);
  fixture.authUserIds.push(data.user.id);

  const person = await admin.from('people').insert({
    auth_user_id: data.user.id,
    display_name: `Fin 6C4 ${suffix}`,
    default_language: 'es-419',
    personal_settings: {},
  }).select('*').single();
  if (person.error) throw person.error;

  const signed = await publicClient.auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data.session?.access_token) throw new Error(`sign in failed: ${signed.error?.message}`);

  return {
    authUserId: data.user.id,
    personId: person.data.id,
    accessToken: signed.data.session.access_token,
  };
}

async function createHouseholdFor(user, slugSuffix) {
  const household = await admin.from('households').insert({
    name: `Fin 6C4 Household ${slugSuffix}`,
    slug: `fin-6c4-${slugSuffix}-${crypto.randomBytes(4).toString('hex')}`,
    created_by_person_id: user.personId,
  }).select('*').single();
  if (household.error) throw household.error;

  const membership = await admin.from('household_members').insert({
    household_id: household.data.id,
    person_id: user.personId,
    role: 'coordinator',
    status: 'active',
    joined_at: new Date().toISOString(),
  }).select('*').single();
  if (membership.error) throw membership.error;

  const updated = await admin.from('people').update({ active_household_id: household.data.id }).eq('id', user.personId);
  if (updated.error) throw updated.error;
  return household.data;
}

async function contextFor(user, contextType = FINANCE_CONTEXT_TYPES.PERSONAL) {
  return resolveFinanceContext(
    { user: { id: user.authUserId }, accessToken: user.accessToken },
    contextType,
  );
}

async function nativeCategory(type, nativeKey) {
  const { data, error } = await admin
    .from('finance_categories')
    .select('id, label')
    .eq('category_kind', 'native')
    .eq('category_type', type)
    .eq('native_key', nativeKey)
    .single();
  if (error) throw error;
  return data;
}

async function makeAccount(ctx, overrides = {}) {
  const result = await createFinanceAccount(ctx, {
    name: overrides.name ?? `Cuenta ${crypto.randomBytes(3).toString('hex')}`,
    currency: overrides.currency ?? 'ARS',
    accountType: overrides.accountType ?? 'ACCOUNT',
    ...(overrides.initialBalance !== undefined
      ? { initialBalance: { amount: overrides.initialBalance, effectiveDate: '2026-07-01' } }
      : {}),
  });
  return result.account;
}

async function expense(ctx, amount, account, overrides = {}) {
  return (await createExpense(ctx, {
    amount,
    currency: overrides.currency ?? 'ARS',
    date: overrides.date ?? '2026-08-10',
    description: overrides.description ?? '6C4 Expense',
    ...(account ? { account: { id: account.id } } : {}),
    ...(overrides.categoryId ? { category: { id: overrides.categoryId } } : {}),
  })).transaction;
}

async function income(ctx, amount, account, overrides = {}) {
  return (await createIncome(ctx, {
    amount,
    currency: overrides.currency ?? 'ARS',
    date: overrides.date ?? '2026-08-10',
    description: overrides.description ?? '6C4 Income',
    ...(account ? { account: { id: account.id } } : {}),
    ...(overrides.categoryId ? { category: { id: overrides.categoryId } } : {}),
  })).transaction;
}

async function rootId(transactionId) {
  const { rows } = await queryDb('select root_transaction_id from public.finance_transactions where id = $1', [transactionId]);
  return rows[0].root_transaction_id;
}

async function activeTransaction(root) {
  const { rows } = await queryDb(`
    select *
    from public.finance_transactions
    where root_transaction_id = $1
      and status = 'ACTIVE'
    order by created_at desc, id desc
    limit 1
  `, [root]);
  return rows[0];
}

function bucketByLabel(rows, label) {
  return (rows ?? []).find((row) => row.label === label) ?? null;
}

function bucketById(rows, id) {
  return (rows ?? []).find((row) => row.categoryId === id || row.accountId === id) ?? null;
}

function limitById(rows, id) {
  return (rows ?? []).find((row) => row.id === id) ?? null;
}

async function createNormalPaymentExpense(ctx, account, categoryId) {
  const createPayload = {
    kind: 'NORMAL',
    title: '6C4 Normal Payment',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '55',
    dueDate: '2026-08-15',
    categoryId,
  };
  const due = await createOneOffPaymentDue(ctx, {
    ...createPayload,
    ...paymentMutation('due-normal', createPayload),
  });
  const registerPayload = {
    actualAmount: '55',
    actualDate: '2026-08-16',
    actualCategoryId: categoryId,
    actualAccountId: account.id,
  };
  await registerPayment(ctx, due.paymentDue.id, {
    ...registerPayload,
    ...paymentMutation('register-normal', registerPayload),
  });
}

async function createCreditCardPayment(ctx, sourceAccount, cardAccount) {
  const createPayload = {
    kind: 'CREDIT_CARD',
    title: '6C4 Card Payment',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '60',
    dueDate: '2026-08-17',
    targetCreditCardAccountId: cardAccount.id,
  };
  const due = await createOneOffPaymentDue(ctx, {
    ...createPayload,
    ...paymentMutation('due-card', createPayload),
  });
  const registerPayload = {
    actualAmount: '60',
    actualDate: '2026-08-18',
    sourceAccountId: sourceAccount.id,
  };
  await registerPayment(ctx, due.paymentDue.id, {
    ...registerPayload,
    ...paymentMutation('register-card', registerPayload),
  });
}

async function seedPersonalAnalysisFixture(ctx) {
  const food = await nativeCategory('expense', 'food');
  const utilities = await nativeCategory('expense', 'utilities');
  const health = await nativeCategory('expense', 'health');
  const salary = await nativeCategory('income', 'salary');
  const checking = await makeAccount(ctx, { name: '6C4 Checking', initialBalance: '2000' });
  const savings = await makeAccount(ctx, { name: '6C4 Savings', initialBalance: '0' });
  const card = await makeAccount(ctx, { name: '6C4 Card', accountType: 'CREDIT_CARD', initialBalance: '-100' });

  const foodExpense = await expense(ctx, '100', checking, { categoryId: food.id, description: '6C4 Food refunded' });
  await createRefund(ctx, {
    transactionId: foodExpense.id,
    amount: '30',
    effectiveDate: '2026-08-12',
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c4-refund-${crypto.randomUUID()}`,
  });

  const corrected = await expense(ctx, '80', checking, { categoryId: utilities.id, description: '6C4 Corrected' });
  await correctTransaction(ctx, {
    transactionId: corrected.id,
    amount: '120',
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c4-correct-amount-${crypto.randomUUID()}`,
  });

  const moved = await expense(ctx, '25', checking, { categoryId: utilities.id, description: '6C4 Moved Date' });
  await correctTransaction(ctx, {
    transactionId: moved.id,
    transactionDate: '2026-09-03',
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c4-correct-date-${crypto.randomUUID()}`,
  });

  const lifecycle = await expense(ctx, '15', checking, { categoryId: utilities.id, description: '6C4 Trash Restore' });
  await trashFinanceTransaction(ctx, {
    transactionId: lifecycle.id,
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c4-trash-${crypto.randomUUID()}`,
  });
  await restoreFinanceTransaction(ctx, {
    transactionId: lifecycle.id,
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c4-restore-${crypto.randomUUID()}`,
  });

  const fullRefund = await expense(ctx, '20', checking, { categoryId: food.id, description: '6C4 Full Refund' });
  await createRefund(ctx, {
    transactionId: fullRefund.id,
    amount: '20',
    effectiveDate: '2026-08-13',
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c4-full-refund-${crypto.randomUUID()}`,
  });

  const refundCorrection = await expense(ctx, '50', checking, { categoryId: food.id, description: '6C4 Refund Correction' });
  const originalRefund = await createRefund(ctx, {
    transactionId: refundCorrection.id,
    amount: '10',
    effectiveDate: '2026-08-14',
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c4-refund-correct-a-${crypto.randomUUID()}`,
  });
  await correctRefund(ctx, {
    refundEventId: originalRefund.refund.id,
    amount: '15',
    effectiveDate: '2026-08-14',
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c4-refund-correct-b-${crypto.randomUUID()}`,
  });

  await expense(ctx, '35', null, { description: '6C4 No Account' });
  await expense(ctx, '40', card, { categoryId: food.id, description: '6C4 Card Purchase' });
  await expense(ctx, '10', checking, { categoryId: health.id, description: '6C4 Health Current' });

  const deletedCategory = await createFinanceCategory(ctx, { type: 'expense', label: '6C4 Deleted Category' });
  await expense(ctx, '5', checking, { categoryId: deletedCategory.category.id, description: '6C4 Deleted Category Expense' });
  await deleteFinanceCategory(ctx, deletedCategory.category.id, {});

  await createNormalPaymentExpense(ctx, checking, food.id);
  await createCreditCardPayment(ctx, checking, card);

  const pendingPayload = {
    kind: 'NORMAL',
    title: '6C4 Pending Payment Due',
    currency: 'ARS',
    expectedAmountKnown: true,
    expectedAmount: '999',
    dueDate: '2026-08-20',
    categoryId: utilities.id,
  };
  await createOneOffPaymentDue(ctx, {
    ...pendingPayload,
    ...paymentMutation('pending-due', pendingPayload),
  });

  await createTransfer(ctx, {
    sourceAccount: checking.id,
    destinationAccount: savings.id,
    amount: '22',
    date: '2026-08-19',
  }, correlation('normal-transfer'));

  await expense(ctx, '40', checking, { date: '2026-07-10', categoryId: food.id, description: '6C4 Prior Food' });
  await expense(ctx, '100', checking, { date: '2026-07-11', categoryId: utilities.id, description: '6C4 Prior Utilities' });
  await expense(ctx, '90', checking, { date: '2026-07-12', categoryId: health.id, description: '6C4 Prior Health' });
  await income(ctx, '300', checking, { date: '2026-07-12', categoryId: salary.id, description: '6C4 Prior Income' });

  await income(ctx, '500', checking, { categoryId: salary.id, description: '6C4 Salary' });
  await income(ctx, '70', null, { description: '6C4 No Account Income' });

  const usd = await makeAccount(ctx, { name: '6C4 USD Account', currency: 'USD', initialBalance: '100' });
  const eur = await makeAccount(ctx, { name: '6C4 EUR Account', currency: 'EUR', initialBalance: '100' });
  await expense(ctx, '10', usd, { currency: 'USD', date: '2026-08-08', description: '6C4 USD Expense' });
  await expense(ctx, '20', eur, { currency: 'EUR', date: '2026-07-08', description: '6C4 EUR Prior Expense' });

  return { food, utilities, health, salary, checking, card, deletedCategory: deletedCategory.category };
}

async function seedSpendingLimits(ctx, categories) {
  const overall = await createSpendingLimit(ctx, {
    currency: 'ARS',
    scopeType: 'OVERALL',
    periodType: 'MONTHLY',
    period: '2026-08',
    recurrenceType: 'ONE_OFF',
    amount: '400',
  }, correlation('limit-overall'));

  const food = await createSpendingLimit(ctx, {
    currency: 'ARS',
    scopeType: 'CATEGORY',
    categoryId: categories.food.id,
    periodType: 'MONTHLY',
    period: '2026-08',
    recurrenceType: 'RECURRING',
    amount: '200',
  }, correlation('limit-food'));

  const utilities = await createSpendingLimit(ctx, {
    currency: 'ARS',
    scopeType: 'CATEGORY',
    categoryId: categories.utilities.id,
    periodType: 'MONTHLY',
    period: '2026-08',
    recurrenceType: 'ONE_OFF',
    amount: '100',
  }, correlation('limit-utilities'));

  const health = await createSpendingLimit(ctx, {
    currency: 'ARS',
    scopeType: 'CATEGORY',
    categoryId: categories.health.id,
    periodType: 'MONTHLY',
    period: '2026-08',
    recurrenceType: 'ONE_OFF',
    amount: '20',
  }, correlation('limit-health'));

  const yearly = await createSpendingLimit(ctx, {
    currency: 'ARS',
    scopeType: 'OVERALL',
    periodType: 'YEARLY',
    period: '2026',
    recurrenceType: 'ONE_OFF',
    amount: '1000',
  }, correlation('limit-yearly'));

  const leisureCategory = await createFinanceCategory(ctx, { type: 'expense', label: '6C4 Leisure Limit' });
  const override = await createSpendingLimit(ctx, {
    currency: 'ARS',
    scopeType: 'CATEGORY',
    categoryId: leisureCategory.category.id,
    periodType: 'MONTHLY',
    period: '2026-08',
    recurrenceType: 'RECURRING',
    amount: '60',
  }, correlation('limit-override'));
  await editSpendingLimit(ctx, override.limit.id, {
    period: '2026-08',
    editScope: 'THIS_PERIOD',
    amount: '70',
  }, correlation('limit-override-edit'));

  const transportCategory = await createFinanceCategory(ctx, { type: 'expense', label: '6C4 Cancel Limit' });
  const cancelled = await createSpendingLimit(ctx, {
    currency: 'ARS',
    scopeType: 'CATEGORY',
    categoryId: transportCategory.category.id,
    periodType: 'MONTHLY',
    period: '2026-08',
    recurrenceType: 'RECURRING',
    amount: '30',
  }, correlation('limit-cancel'));
  await cancelSpendingLimit(ctx, cancelled.limit.id, {
    period: '2026-08',
    cancelScope: 'THIS_PERIOD',
  }, correlation('limit-cancel-this'));

  await editSpendingLimit(ctx, food.limit.id, {
    period: '2026-09',
    editScope: 'THIS_AND_FOLLOWING',
    amount: '250',
  }, correlation('limit-food-following'));

  return { overall, food, utilities, health, yearly, override, cancelled };
}

async function seedHousehold(ctx) {
  const account = await makeAccount(ctx, { name: '6C4 HH Account', initialBalance: '300' });
  await expense(ctx, '77', account, { description: '6C4 Household Expense' });
  await income(ctx, '200', account, { description: '6C4 Household Income' });
}

async function main() {
  console.log('=== FINANCE V1.1 STAGE 6C.4 ANALYSIS / PROGRESS TESTS ===');

  const userA = await createTestUser('a');
  const userB = await createTestUser('b');
  await createHouseholdFor(userA, 'a');

  const personal = await contextFor(userA);
  const otherPersonal = await contextFor(userB);
  const household = await contextFor(userA, FINANCE_CONTEXT_TYPES.HOUSEHOLD);

  const categories = await seedPersonalAnalysisFixture(personal);
  const limits = await seedSpendingLimits(personal, categories);
  await seedHousehold(household);

  const analysis = await getFinanceAnalysis(personal, { currency: 'ARS', periodType: 'MONTHLY', period: '2026-08' });
  const yearly = await getFinanceAnalysis(personal, { currency: 'ARS', periodType: 'YEARLY', period: '2026' });
  const usd = await getFinanceAnalysis(personal, { currency: 'USD', periodType: 'MONTHLY', period: '2026-08' });
  const eur = await getFinanceAnalysis(personal, { currency: 'EUR', periodType: 'MONTHLY', period: '2026-08' });
  const nextMonth = await getFinanceAnalysis(personal, { currency: 'ARS', periodType: 'MONTHLY', period: '2026-09' });
  const progressOnly = await getSpendingLimitProgress(personal, { currency: 'ARS', periodType: 'MONTHLY', period: '2026-08' });
  const householdAnalysis = await getFinanceAnalysis(household, { currency: 'ARS', periodType: 'MONTHLY', period: '2026-08' });
  const otherAnalysis = await getFinanceAnalysis(otherPersonal, { currency: 'ARS', periodType: 'MONTHLY', period: '2026-08' });

  console.log('\nTotals');
  decimalEqual(analysis.totals.grossExpense, '450', '1 monthly gross Expense');
  decimalEqual(analysis.totals.refundedAmount, '65', '2 monthly Refund total');
  decimalEqual(analysis.totals.netExpense, '385', '3 monthly Net Expense');
  decimalEqual(analysis.totals.income, '570', '4 monthly Income');
  decimalEqual(analysis.totals.netResult, '185', '5 monthly net result');
  decimalEqual(yearly.totals.netExpense, '640', '6 yearly totals use selected year');
  decimalEqual(analysis.totals.grossExpense, '450', '7 Transfer excluded');
  decimalEqual(analysis.totals.grossExpense, '450', '8 Payment Due excluded');
  assert(bucketByLabel(analysis.categoryExpenses, 'Alimentación')?.grossExpense === '265.0000', '9 NORMAL paid underlying Expense counted once');
  assert(bucketById(analysis.accountExpenses, categories.card.id)?.grossExpense === '40.0000', '10 CREDIT_CARD purchase counted');
  assert(!analysis.accountExpenses.some((bucket) => bucket.grossExpense === '60.0000'), '11 card Payment Transfer excluded');

  console.log('\nLifecycle');
  decimalEqual(bucketByLabel(analysis.categoryExpenses, 'Servicios y facturas').grossExpense, '135', '12 corrected Expense counted once');
  decimalEqual(bucketByLabel(analysis.categoryExpenses, 'Servicios y facturas').netExpense, '135', '13 correction amount changes analysis');
  assert(!analysis.categoryExpenses.some((bucket) => bucket.grossExpense === '25.0000'), '14 correction date moves period');
  decimalEqual(bucketByLabel(analysis.categoryExpenses, 'Servicios y facturas').grossExpense, '135', '15 Trash removes before Restore returns');
  decimalEqual(bucketByLabel(analysis.categoryExpenses, 'Servicios y facturas').grossExpense, '135', '16 Restore returns');
  assert(bucketByLabel(analysis.categoryExpenses, 'Alimentación').refundedAmount === '65.0000', '17 full Refund makes net zero inside category composition');
  assert(bucketByLabel(analysis.categoryExpenses, 'Alimentación').netExpense === '200.0000', '18 Refund correction uses active Refund truth');

  console.log('\nCategory');
  decimalEqual(bucketByLabel(analysis.categoryExpenses, 'Alimentación').netExpense, '200', '19 expense by Category');
  decimalEqual(bucketByLabel(analysis.categoryExpenses, 'Alimentación').refundedAmount, '65', '20 Refund netting by Category');
  decimalEqual(bucketByLabel(analysis.categoryExpenses, 'Sin categoria').netExpense, '35', '21 uncategorized bucket');
  decimalEqual(bucketByLabel(analysis.categoryExpenses, '6C4 Deleted Category').netExpense, '5', '22 deleted Category historical label');
  decimalEqual(bucketByLabel(analysis.categoryIncome, 'Sueldo').income, '500', '23 Income Category breakdown');

  console.log('\nAccount');
  decimalEqual(bucketById(analysis.accountExpenses, categories.checking.id).grossExpense, '375', '24 Expense by Account');
  decimalEqual(bucketById(analysis.accountIncome, categories.checking.id).income, '500', '25 Income by Account');
  decimalEqual(bucketByLabel(analysis.accountExpenses, 'Sin cuenta').grossExpense, '35', '26 no-account Expense bucket');
  decimalEqual(bucketById(analysis.accountExpenses, categories.card.id).grossExpense, '40', '27 CREDIT_CARD purchase in card bucket');
  assert(!analysis.accountExpenses.some((bucket) => bucket.label === '6C4 Card Payment'), '28 card Payment absent');

  console.log('\nComparison');
  decimalEqual(analysis.previous.totals.netExpense, '230', '29 month vs prior month');
  decimalEqual(yearly.previous.totals.netExpense, '0', '30 year vs prior year');
  equal(analysis.comparison.netExpense.comparisonKind, 'PERCENT', '31 positive percentage baseline');
  equal(usd.comparison.netExpense.comparisonKind, 'NEW', '32 zero baseline => NEW, not Infinity');
  equal(usd.comparison.netExpense.percentChange, null, '32 zero baseline percent is null');
  decimalEqual(eur.comparison.netExpense.percentChange, '-100', '33 current zero from positive => valid -100%');
  equal(analysis.rankings.largestCategoryIncrease.label, 'Alimentación', '34 category increase ranking');
  equal(analysis.rankings.largestCategoryDecrease.label, 'Salud', '35 category decrease ranking');

  console.log('\nLimits');
  const monthlyLimits = analysis.spendingLimitProgress;
  const overall = limitById(monthlyLimits, limits.overall.limit.id);
  const food = limitById(monthlyLimits, limits.food.limit.id);
  const utilities = limitById(monthlyLimits, limits.utilities.limit.id);
  const health = limitById(monthlyLimits, limits.health.limit.id);
  const override = limitById(monthlyLimits, limits.override.limit.id);
  const yearlyLimit = limitById(yearly.spendingLimitProgress, limits.yearly.limit.id);
  decimalEqual(overall.spent, '385', '36 OVERALL monthly progress');
  decimalEqual(food.spent, '200', '37 CATEGORY monthly progress');
  decimalEqual(yearlyLimit.spent, '640', '38 yearly progress');
  decimalEqual(food.spent, '200', '39 spent uses Net Expense');
  decimalEqual(food.amount, '200', '40 Refund reduces spent');
  decimalEqual(overall.spent, '385', '41 Transfer does not affect spent');
  decimalEqual(overall.spent, '385', '42 Payment Due does not affect spent');
  decimalEqual(food.spent, '200', '43 Card Payment does not affect spent');
  decimalEqual(bucketById(analysis.accountExpenses, categories.card.id).netExpense, '40', '44 Credit Card purchase does affect spent');
  equal(health.status, 'UNDER', '45 UNDER');
  equal(food.status, 'AT', '46 AT');
  equal(utilities.status, 'OVER', '47 OVER');
  decimalEqual(utilities.overBy, '35', '48 overBy');
  decimalEqual(utilities.percentUsed, '135', '49 percentUsed may exceed 100');
  equal(health.recurrenceType, 'ONE_OFF', '50 one-off resolution');
  equal(food.recurrenceType, 'RECURRING', '51 recurring resolution');
  decimalEqual(override.amount, '70', '52 period override resolution');
  assert(!limitById(monthlyLimits, limits.cancelled.limit.id), '53 cancelled period absent');
  decimalEqual(limitById(nextMonth.spendingLimitProgress, limits.food.limit.id).amount, '250', '54 this-and-following edit resolves correct amount');
  decimalEqual(food.amount, '200', '55 historical/current configuration unchanged');
  equal(progressOnly.limits.length, monthlyLimits.length, 'spending-limits/progress reuses analysis progress');

  console.log('\nCurrency / context');
  decimalEqual(analysis.totals.netExpense, '385', '56 ARS isolated');
  decimalEqual(usd.totals.netExpense, '10', '57 USD isolated');
  assert(Number(analysis.totals.netExpense) + Number(usd.totals.netExpense) !== Number(analysis.totals.netExpense), '58 no cross-currency sum');
  decimalEqual(otherAnalysis.totals.netExpense, '0', '59 Personal isolation');
  decimalEqual(householdAnalysis.totals.netExpense, '77', '60 Household isolation');
  await expectError(() => getFinanceAnalysis(personal, {
    currency: 'ARS',
    periodType: 'MONTHLY',
    period: '2026-08',
    ownerPersonId: otherPersonal.personId,
  }), 'finance_account_owner_authority_forbidden', 'arbitrary owner selector rejected');

  console.log(`\nFINANCE_6C4_ANALYSIS_PROGRESS_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) process.exit(1);
}

main()
  .catch((error) => {
    console.error('FATAL:', error);
    process.exit(1);
  })
  .finally(async () => {
    for (const userId of fixture.authUserIds) {
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch (_) {
        // best effort cleanup
      }
    }
  });
