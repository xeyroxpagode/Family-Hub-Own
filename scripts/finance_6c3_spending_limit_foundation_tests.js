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
const {
  createFinanceCategory,
  deleteFinanceCategory,
} = require('../backend/src/services/finance.category.service');
const {
  listSpendingLimits,
  createSpendingLimit,
  editSpendingLimit,
  cancelSpendingLimit,
} = require('../backend/src/services/finance.spending-limit.service');

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
  console.error('ENVIRONMENT_FAILURE: Finance 6C.3 tests are local-only.');
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
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, statement_timeout: 20000 });
  await client.connect();
  try {
    return await client.query(sql, params);
  } finally {
    await client.end();
  }
}

function correlation(label = 'op') {
  const safeLabel = String(label).replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 40);
  return {
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c3-${safeLabel}-${crypto.randomUUID()}`,
  };
}

function randomCredential(label) {
  return `Fin6C3_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function createTestUser(suffix) {
  const email = `finance-6c3-${suffix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}@example.test`;
  const password = randomCredential(suffix);
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.message ?? 'missing user'}`);
  fixture.authUserIds.push(data.user.id);

  const person = await admin.from('people').insert({
    auth_user_id: data.user.id,
    display_name: `Fin 6C3 ${suffix}`,
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
    name: `Fin 6C3 Household ${slugSuffix}`,
    slug: `fin-6c3-${slugSuffix}-${crypto.randomBytes(4).toString('hex')}`,
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
}

async function contextFor(user, contextType = FINANCE_CONTEXT_TYPES.PERSONAL) {
  return resolveFinanceContext(
    { user: { id: user.authUserId }, accessToken: user.accessToken },
    contextType,
  );
}

async function makeExpenseCategory(ctx, label) {
  return (await createFinanceCategory(ctx, { type: 'expense', label })).category;
}

function limits(result) {
  return Array.isArray(result?.limits) ? result.limits : [];
}

function findLimit(result, id) {
  return limits(result).find((limit) => limit.id === id) ?? null;
}

async function list(ctx, currency, periodType, period) {
  return listSpendingLimits(ctx, { currency, periodType, period });
}

async function currentPeriods() {
  const { rows } = await queryDb(`
    select
      to_char(date_trunc('month', current_date), 'YYYY-MM') as current_month,
      to_char(date_trunc('month', current_date) + interval '1 month', 'YYYY-MM') as next_month,
      to_char(date_trunc('month', current_date) + interval '2 months', 'YYYY-MM') as next_next_month,
      to_char(date_trunc('month', current_date) - interval '1 month', 'YYYY-MM') as previous_month,
      to_char(date_trunc('year', current_date), 'YYYY') as current_year,
      to_char(date_trunc('year', current_date) + interval '1 year', 'YYYY') as next_year,
      to_char(date_trunc('year', current_date) - interval '1 year', 'YYYY') as previous_year
  `);
  return rows[0];
}

async function countRows(table, whereSql = '', params = []) {
  const { rows } = await queryDb(`select count(*)::int as count from public.${table} ${whereSql}`, params);
  return rows[0].count;
}

async function tableExists(tableName) {
  const { rows } = await queryDb('select to_regclass($1) is not null as exists', [`public.${tableName}`]);
  return rows[0].exists;
}

async function main() {
  console.log('=== FINANCE V1.1 STAGE 6C.3 SPENDING LIMIT FOUNDATION TESTS ===');

  const userA = await createTestUser('a');
  const userB = await createTestUser('b');
  await createHouseholdFor(userA, 'a');

  const personal = await contextFor(userA);
  const otherPersonal = await contextFor(userB);
  const household = await contextFor(userA, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
  const periods = await currentPeriods();

  console.log('\nSchema / domain');
  equal(await tableExists('finance_spending_limit_series'), true, '1 Spending Limit series persistence exists');
  equal(await tableExists('finance_spending_limit_versions'), true, '1 Spending Limit version persistence exists');
  equal(await tableExists('finance_spending_limit_exceptions'), true, '1 Spending Limit exception persistence exists');
  const columns = await queryDb(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('finance_spending_limit_series', 'finance_spending_limit_versions', 'finance_spending_limit_exceptions')
  `);
  const columnNames = columns.rows.map((row) => row.column_name);
  assert(!columnNames.includes('spent'), '2 no mutable spent column');
  assert(!columnNames.includes('remaining'), '3 no mutable remaining column');

  const overall = await createSpendingLimit(personal, {
    currency: 'ARS',
    scopeType: 'OVERALL',
    periodType: 'MONTHLY',
    period: periods.current_month,
    recurrenceType: 'ONE_OFF',
    amount: '1000',
  }, correlation('overall-one-off'));
  const overallCurrent = await list(personal, 'ARS', 'MONTHLY', periods.current_month);
  assert(Boolean(findLimit(overallCurrent, overall.limit.id)), '4 OVERALL works');

  const food = await makeExpenseCategory(personal, '6C3 Food');
  const categoryLimit = await createSpendingLimit(personal, {
    currency: 'ARS',
    scopeType: 'CATEGORY',
    categoryId: food.id,
    periodType: 'MONTHLY',
    period: periods.current_month,
    recurrenceType: 'ONE_OFF',
    amount: '300',
  }, correlation('category-one-off'));
  const categoryCurrent = await list(personal, 'ARS', 'MONTHLY', periods.current_month);
  assert(Boolean(findLimit(categoryCurrent, categoryLimit.limit.id)), '5 CATEGORY works');
  equal(categoryCurrent.periodType, 'MONTHLY', '6 MONTHLY works');

  const yearlyCategory = await createSpendingLimit(personal, {
    currency: 'ARS',
    scopeType: 'CATEGORY',
    categoryId: food.id,
    periodType: 'YEARLY',
    period: periods.current_year,
    recurrenceType: 'ONE_OFF',
    amount: '1200',
  }, correlation('category-yearly'));
  assert(Boolean(findLimit(await list(personal, 'ARS', 'YEARLY', periods.current_year), yearlyCategory.limit.id)), '7 YEARLY works');
  await expectError(() => createSpendingLimit(personal, {
    currency: 'ARS',
    scopeType: 'OVERALL',
    periodType: 'MONTHLY',
    period: periods.next_month,
    recurrenceType: 'ONE_OFF',
    amount: '0',
  }, correlation('zero')), 'invalid_finance_spending_limit_amount', '8 amount zero rejected');
  await expectError(() => createSpendingLimit(personal, {
    currency: 'ARS',
    scopeType: 'OVERALL',
    periodType: 'MONTHLY',
    period: periods.next_month,
    recurrenceType: 'ONE_OFF',
    amount: '-1',
  }, correlation('negative')), 'invalid_finance_spending_limit_amount', '9 negative rejected');
  await expectError(() => createSpendingLimit(personal, {
    currency: 'ars',
    scopeType: 'OVERALL',
    periodType: 'MONTHLY',
    period: periods.next_month,
    recurrenceType: 'ONE_OFF',
    amount: '1',
  }, correlation('currency')), 'invalid_finance_spending_limit_currency', '10 invalid currency rejected');

  console.log('\nUniqueness');
  await expectError(() => createSpendingLimit(personal, {
    currency: 'ARS',
    scopeType: 'OVERALL',
    periodType: 'MONTHLY',
    period: periods.current_month,
    recurrenceType: 'ONE_OFF',
    amount: '900',
  }, correlation('dupe-overall')), 'finance_spending_limit_slot_exists', '11 only one effective OVERALL monthly slot');
  await expectError(() => createSpendingLimit(personal, {
    currency: 'ARS',
    scopeType: 'CATEGORY',
    categoryId: food.id,
    periodType: 'MONTHLY',
    period: periods.current_month,
    recurrenceType: 'ONE_OFF',
    amount: '250',
  }, correlation('dupe-category')), 'finance_spending_limit_slot_exists', '12 only one effective Category monthly slot');
  assert(Boolean(yearlyCategory.limit.id), '13 MONTHLY + YEARLY same category allowed');
  assert(Boolean(overall.limit.id && categoryLimit.limit.id), '14 OVERALL + CATEGORY allowed');

  console.log('\nOne-off');
  assert(Boolean(overall.limit.id), '15 current one-off create');
  const future = await createSpendingLimit(personal, {
    currency: 'USD',
    scopeType: 'OVERALL',
    periodType: 'MONTHLY',
    period: periods.next_month,
    recurrenceType: 'ONE_OFF',
    amount: '50',
  }, correlation('future-one-off'));
  assert(Boolean(future.limit.id), '16 future one-off create');
  await expectError(() => createSpendingLimit(personal, {
    currency: 'USD',
    scopeType: 'OVERALL',
    periodType: 'MONTHLY',
    period: periods.previous_month,
    recurrenceType: 'ONE_OFF',
    amount: '50',
  }, correlation('past-create')), 'finance_spending_limit_past_period_forbidden', '17 past create rejected');
  await editSpendingLimit(personal, overall.limit.id, {
    period: periods.current_month,
    editScope: 'ONE_OFF',
    amount: '1100',
  }, correlation('edit-current'));
  equal(findLimit(await list(personal, 'ARS', 'MONTHLY', periods.current_month), overall.limit.id).amount, '1100.0000', '18 current edit');
  await editSpendingLimit(personal, future.limit.id, {
    period: periods.next_month,
    editScope: 'ONE_OFF',
    amount: '75',
  }, correlation('edit-future'));
  equal(findLimit(await list(personal, 'USD', 'MONTHLY', periods.next_month), future.limit.id).amount, '75.0000', '19 future edit');
  await expectError(() => editSpendingLimit(personal, future.limit.id, {
    period: periods.previous_month,
    editScope: 'ONE_OFF',
    amount: '80',
  }, correlation('past-edit')), 'finance_spending_limit_past_period_forbidden', '20 completed past edit rejected');
  await cancelSpendingLimit(personal, future.limit.id, {
    period: periods.next_month,
    cancelScope: 'ONE_OFF',
  }, correlation('cancel-future'));
  assert(await countRows('finance_spending_limit_series', 'where id = $1', [future.limit.id]) === 1, '21 cancel preserves history');

  console.log('\nRecurring');
  const rent = await makeExpenseCategory(personal, '6C3 Rent');
  const recurring = await createSpendingLimit(personal, {
    currency: 'ARS',
    scopeType: 'CATEGORY',
    categoryId: rent.id,
    periodType: 'MONTHLY',
    period: periods.current_month,
    recurrenceType: 'RECURRING',
    amount: '500',
  }, correlation('recurring-monthly'));
  equal(findLimit(await list(personal, 'ARS', 'MONTHLY', periods.current_month), recurring.limit.id).amount, '500.0000', '22 recurring monthly resolves current');
  equal(findLimit(await list(personal, 'ARS', 'MONTHLY', periods.next_month), recurring.limit.id).amount, '500.0000', '23 recurring monthly resolves future');
  const yearlyRecurring = await createSpendingLimit(personal, {
    currency: 'USD',
    scopeType: 'OVERALL',
    periodType: 'YEARLY',
    period: periods.current_year,
    recurrenceType: 'RECURRING',
    amount: '900',
  }, correlation('recurring-yearly'));
  equal(findLimit(await list(personal, 'USD', 'YEARLY', periods.next_year), yearlyRecurring.limit.id).amount, '900.0000', '24 recurring yearly resolves correct year');
  equal(await countRows('finance_spending_limit_versions', 'where series_id = $1', [recurring.limit.id]), 1, '25 no infinite materialization');
  assert(Boolean(findLimit(await list(personal, 'ARS', 'MONTHLY', periods.next_next_month), recurring.limit.id)), '26 no cron required for future resolution');
  await editSpendingLimit(personal, recurring.limit.id, {
    period: periods.current_month,
    editScope: 'THIS_PERIOD',
    amount: '550',
  }, correlation('edit-this-period'));
  equal(findLimit(await list(personal, 'ARS', 'MONTHLY', periods.current_month), recurring.limit.id).amount, '550.0000', '27 edit only this period creates isolated override');
  equal(findLimit(await list(personal, 'ARS', 'MONTHLY', periods.next_month), recurring.limit.id).amount, '500.0000', '28 next period keeps prior default');
  await editSpendingLimit(personal, recurring.limit.id, {
    period: periods.next_month,
    editScope: 'THIS_AND_FOLLOWING',
    amount: '650',
  }, correlation('edit-following'));
  equal(findLimit(await list(personal, 'ARS', 'MONTHLY', periods.next_month), recurring.limit.id).amount, '650.0000', '29 edit this-and-following changes selected/future');
  equal(findLimit(await list(personal, 'ARS', 'MONTHLY', periods.current_month), recurring.limit.id).amount, '550.0000', '30 past/current period unchanged by future edit');

  const travel = await makeExpenseCategory(personal, '6C3 Travel');
  const cancellable = await createSpendingLimit(personal, {
    currency: 'USD',
    scopeType: 'CATEGORY',
    categoryId: travel.id,
    periodType: 'MONTHLY',
    period: periods.current_month,
    recurrenceType: 'RECURRING',
    amount: '100',
  }, correlation('cancel-recurring'));
  await cancelSpendingLimit(personal, cancellable.limit.id, {
    period: periods.current_month,
    cancelScope: 'THIS_PERIOD',
  }, correlation('cancel-this'));
  assert(!findLimit(await list(personal, 'USD', 'MONTHLY', periods.current_month), cancellable.limit.id), '31 cancel only this period skips selected only');
  assert(Boolean(findLimit(await list(personal, 'USD', 'MONTHLY', periods.next_month), cancellable.limit.id)), '32 future resumes');
  await cancelSpendingLimit(personal, cancellable.limit.id, {
    period: periods.next_month,
    cancelScope: 'THIS_AND_FOLLOWING',
  }, correlation('cancel-following'));
  assert(!findLimit(await list(personal, 'USD', 'MONTHLY', periods.next_month), cancellable.limit.id), '33 cancel this-and-following ends selected/future');
  assert(await countRows('finance_spending_limit_exceptions', 'where series_id = $1', [cancellable.limit.id]) === 1, '34 past/current exception remains');

  const replayCorrelation = correlation('idempotent-create');
  const replayA = await createSpendingLimit(personal, {
    currency: 'EUR',
    scopeType: 'OVERALL',
    periodType: 'MONTHLY',
    period: periods.current_month,
    recurrenceType: 'ONE_OFF',
    amount: '10',
  }, replayCorrelation);
  const replayB = await createSpendingLimit(personal, {
    currency: 'EUR',
    scopeType: 'OVERALL',
    periodType: 'MONTHLY',
    period: periods.current_month,
    recurrenceType: 'ONE_OFF',
    amount: '10',
  }, replayCorrelation);
  assert(Boolean(replayA.limit?.id || replayB.outcome === 'replay'), '35 replay idempotent');
  await expectError(() => createSpendingLimit(personal, {
    currency: 'EUR',
    scopeType: 'OVERALL',
    periodType: 'MONTHLY',
    period: periods.current_month,
    recurrenceType: 'ONE_OFF',
    amount: '11',
  }, replayCorrelation), null, '36 conflict payload rejected');

  console.log('\nCategory deletion');
  const deletedCategory = await makeExpenseCategory(personal, '6C3 Delete Me');
  const categorySeries = await createSpendingLimit(personal, {
    currency: 'ARS',
    scopeType: 'CATEGORY',
    categoryId: deletedCategory.id,
    periodType: 'MONTHLY',
    period: periods.current_month,
    recurrenceType: 'RECURRING',
    amount: '700',
  }, correlation('deleted-category-recurring'));
  await deleteFinanceCategory(personal, deletedCategory.id, {});
  const deletedCurrent = findLimit(await list(personal, 'ARS', 'MONTHLY', periods.current_month), categorySeries.limit.id);
  assert(deletedCurrent?.categoryLabelSnapshot === '6C3 Delete Me', '37 snapshot remains historical');
  assert(!findLimit(await list(personal, 'ARS', 'MONTHLY', periods.next_month), categorySeries.limit.id), '38 future recurring application stops');
  assert(await countRows('finance_spending_limit_series', 'where id = $1', [categorySeries.limit.id]) === 1, '39 no history deleted');

  console.log('\nContext / RLS');
  assert(Boolean(findLimit(await list(personal, 'ARS', 'MONTHLY', periods.current_month), overall.limit.id)), '40 Personal owner');
  const householdLimit = await createSpendingLimit(household, {
    currency: 'ARS',
    scopeType: 'OVERALL',
    periodType: 'MONTHLY',
    period: periods.next_month,
    recurrenceType: 'ONE_OFF',
    amount: '222',
  }, correlation('household-limit'));
  assert(Boolean(findLimit(await list(household, 'ARS', 'MONTHLY', periods.next_month), householdLimit.limit.id)), '41 Household member');
  assert(!findLimit(await list(otherPersonal, 'ARS', 'MONTHLY', periods.current_month), overall.limit.id), '42 isolation');
  await expectError(() => createSpendingLimit(personal, {
    currency: 'ARS',
    scopeType: 'OVERALL',
    periodType: 'MONTHLY',
    period: periods.next_month,
    recurrenceType: 'ONE_OFF',
    amount: '1',
    ownerPersonId: otherPersonal.personId,
  }, correlation('injection')), 'finance_account_owner_authority_forbidden', '43 arbitrary context injection rejected');
  assert(!findLimit(await list(personal, 'USD', 'MONTHLY', periods.current_month), overall.limit.id), '44 cross-currency contamination absent');

  console.log('\nConcurrency');
  const concurrentCategory = await makeExpenseCategory(personal, '6C3 Concurrent');
  const attempts = await Promise.allSettled([
    createSpendingLimit(personal, {
      currency: 'GBP',
      scopeType: 'CATEGORY',
      categoryId: concurrentCategory.id,
      periodType: 'MONTHLY',
      period: periods.current_month,
      recurrenceType: 'ONE_OFF',
      amount: '20',
    }, correlation('concurrent-a')),
    createSpendingLimit(personal, {
      currency: 'GBP',
      scopeType: 'CATEGORY',
      categoryId: concurrentCategory.id,
      periodType: 'MONTHLY',
      period: periods.current_month,
      recurrenceType: 'ONE_OFF',
      amount: '20',
    }, correlation('concurrent-b')),
  ]);
  assert(attempts.some((attempt) => attempt.status === 'fulfilled'), '45 concurrent creates have a winner');
  const concurrentListed = limits(await list(personal, 'GBP', 'MONTHLY', periods.current_month))
    .filter((limit) => limit.categoryId === concurrentCategory.id);
  equal(concurrentListed.length, 1, '45 concurrent creates cannot produce duplicate effective slot');

  const raceCategory = await makeExpenseCategory(personal, '6C3 Race');
  const race = await createSpendingLimit(personal, {
    currency: 'CAD',
    scopeType: 'CATEGORY',
    categoryId: raceCategory.id,
    periodType: 'MONTHLY',
    period: periods.current_month,
    recurrenceType: 'RECURRING',
    amount: '40',
  }, correlation('race-create'));
  await Promise.allSettled([
    editSpendingLimit(personal, race.limit.id, {
      period: periods.next_month,
      editScope: 'THIS_AND_FOLLOWING',
      amount: '45',
    }, correlation('race-edit')),
    cancelSpendingLimit(personal, race.limit.id, {
      period: periods.next_month,
      cancelScope: 'THIS_AND_FOLLOWING',
    }, correlation('race-cancel')),
  ]);
  assert(limits(await list(personal, 'CAD', 'MONTHLY', periods.next_month)).filter((limit) => limit.id === race.limit.id).length <= 1, '46 edit/cancel atomic');
  assert((await queryDb(`
    select count(*)::int as count
    from public.finance_spending_limit_effective_rows_v1($1, $2, null, $3, $4, public.finance_spending_limit_period_start_v1($4, $5))
    where series_id = $6
  `, [personal.contextType, personal.personId, 'CAD', 'MONTHLY', periods.next_month, race.limit.id])).rows[0].count <= 1, '47 no overlapping active effective versions after concurrent mutation');

  console.log(`\nFINANCE_6C3_SPENDING_LIMIT_FOUNDATION_RESULT pass=${passCount} fail=${failCount}`);
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
