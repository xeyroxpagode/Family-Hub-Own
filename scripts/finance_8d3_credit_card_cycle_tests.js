#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 8D.3 Credit Card Cycle tests.
 *
 * Local Supabase only. Validates the deterministic temporal card-cycle truth:
 *   - first-cycle rule (before/on/after closing day)
 *   - month-end clamping (closing 31 across Feb/Mar, leap year)
 *   - due date strictly after close (same/next month)
 *   - consecutive installment cycles (no skips, one per cycle)
 *   - 8D.2 amounts unchanged, no new transactions/effects/PaymentDue
 *   - timing snapshot: editing card timing does NOT rewrite old schedule
 *   - historical cards (NULL timing) are rejected for new plans
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
const { FINANCE_ACCOUNT_TYPES, FINANCE_CONTEXT_TYPES } = require('../backend/src/constants/finance.constants');
const { resolveFinanceContext } = require('../backend/src/services/finance.context.service');
const { createFinanceAccount } = require('../backend/src/services/finance.account.service');
const { createExpense } = require('../backend/src/services/finance.transaction.service');
const { createCreditCardInstallmentPlan, getCreditCardInstallmentPlan } = require('../backend/src/services/finance.installment.service');

loadTestEnvironment({ required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] });

const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`ENVIRONMENT_FAILURE: missing env: ${missing.join(', ')}`);
  process.exit(2);
}

const supabaseUrl = new URL(process.env.SUPABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(supabaseUrl.hostname)) {
  console.error('ENVIRONMENT_FAILURE: Finance 8D.3 tests are local-only.');
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
const fixture = { authUserIds: [], personIds: [], accountIds: [], transactionIds: [], planIds: [] };

function assert(condition, message) {
  if (condition) { passCount += 1; console.log(`  PASS: ${message}`); return true; }
  failCount += 1; console.error(`  FAIL: ${message}`); return false;
}
function equal(actual, expected, message) {
  return assert(actual === expected, `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

async function expectError(fn, expectedCode, message) {
  let error = null;
  try { await fn(); } catch (caught) { error = caught; }
  if (!error) { failCount += 1; console.error(`  FAIL: ${message} (expected ${expectedCode}, got success)`); return null; }
  if (error.code !== expectedCode) { failCount += 1; console.error(`  FAIL: ${message} (expected ${expectedCode}, got ${error.code})`); return null; }
  passCount += 1; console.log(`  PASS: ${message} (code=${error.code})`);
  return error;
}

async function queryDb(sql, params = []) {
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, statement_timeout: 20000 });
  await client.connect();
  try { return await client.query(sql, params); } finally { await client.end(); }
}

async function applyMigration(rel) {
  await queryDb(fs.readFileSync(path.join(root, rel), 'utf8'));
}

async function sqlFn(name, args, label) {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(', ');
  const res = await queryDb(`select public.${name}(${placeholders})::text as v`, args);
  const v = res.rows[0] ? res.rows[0].v : null;
  console.log(`  ${label}: ${name}(${args.map(JSON.stringify).join(', ')}) = ${v}`);
  return v;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.message}`);
  return data;
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin8d3-${label}-${suffix}@example.test`;
  const password = `Fin8D3_${crypto.randomBytes(18).toString('base64url')}!9a`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `Fin 8D.3 QA ${label}` } });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const person = await insertOne('people', { auth_user_id: authUserId, display_name: `Fin 8D.3 ${label}`, default_language: 'es-419', personal_settings: {} });
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

async function createCard(ctx, name, closingDay, dueDay) {
  const result = await createFinanceAccount(ctx, { name, currency: 'ARS', accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD, closingDay, dueDay, initialBalance: { amount: '0', effectiveDate: '2026-01-01' } });
  fixture.accountIds.push(result.account.id);
  return result.account;
}

async function createCardExpense(ctx, accountId, amount, description, date) {
  const result = await createExpense(ctx, { amount, currency: 'ARS', date, description, account: accountId });
  fixture.transactionIds.push(result.transaction.id);
  return result.transaction;
}

async function createPlan(ctx, transactionId, count) {
  const result = await createCreditCardInstallmentPlan(ctx, { expenseRootTransactionId: transactionId, installmentCount: count });
  fixture.planIds.push(result.planId);
  return result;
}

async function readPlanRows(planId) {
  const res = await queryDb(
    `select i.ordinal, i.amount::text as amount, i.cycle_close_date::text as close, i.cycle_due_date::text as due,
            p.closing_day_snapshot, p.due_day_snapshot
     from public.finance_credit_card_installments i
     join public.finance_credit_card_installment_plans p on p.id = i.installment_plan_id
     where p.id = $1 order by i.ordinal`, [planId]);
  return res.rows;
}

async function cleanup() {
  const accounts = fixture.accountIds;
  const transactions = fixture.transactionIds;
  const persons = fixture.personIds;

  if (fixture.planIds.length) await queryDb('delete from public.finance_credit_card_installment_plans where id = any($1::uuid[])', [fixture.planIds]);
  if (accounts.length) await queryDb('delete from public.finance_payment_dues where target_credit_card_account_id = any($1::uuid[])', [accounts]);
  if (accounts.length) await queryDb('delete from public.finance_account_effects where account_id = any($1::uuid[])', [accounts]);
  if (persons.length) await queryDb('delete from public.finance_refund_events where created_by_person_id = any($1::uuid[])', [persons]);
  if (accounts.length) await queryDb('delete from public.finance_transfers where source_account_id = any($1::uuid[]) or destination_account_id = any($1::uuid[])', [accounts]);
  if (transactions.length) await queryDb('delete from public.finance_transactions where id = any($1::uuid[])', [transactions]);
  if (accounts.length) await queryDb('delete from public.finance_accounts where id = any($1::uuid[])', [accounts]);

  if (persons.length) await admin.from('people').update({ active_household_id: null }).in('id', persons);
  if (persons.length) { const r = await admin.from('people').delete().in('id', persons); if (r.error) throw new Error(`cleanup people delete failed: ${r.error.message}`); }
  for (const userId of fixture.authUserIds) await admin.auth.admin.deleteUser(userId).catch(() => {});
}

async function main() {
  console.log('FINANCE_8D3_LOCAL_SUPABASE_MODE=CONNECT');
  await applyMigration('supabase/migrations/20260907000000_finance_credit_card_cycle_v1_1.sql');
  await applyMigration('supabase/migrations/20260907000001_finance_credit_card_installment_purchase_v1_1.sql');
  await applyMigration('supabase/migrations/20260907000003_finance_credit_card_cycle_stability_checkpoint_v1_1.sql');

  console.log('\nG01 - first-cycle rule: before / on / after closing (closing 28)');
  equal(await sqlFn('finance_card_first_close_date_v1', ['2026-08-10', 28], 'G01'), '2026-08-28', 'G01 purchase before close -> same-month close');
  equal(await sqlFn('finance_card_first_close_date_v1', ['2026-08-28', 28], 'G01'), '2026-08-28', 'G01 purchase ON close -> same-month close');
  equal(await sqlFn('finance_card_first_close_date_v1', ['2026-08-29', 28], 'G01'), '2026-09-28', 'G01 purchase after close -> next-month close');

  console.log('\nG02 - month-end clamp: closing 31 across Feb/Mar');
  equal(await sqlFn('finance_card_close_in_month_v1', [2026, 1, 31], 'G02'), '2026-01-31', 'G02 Jan 31');
  equal(await sqlFn('finance_card_close_in_month_v1', [2026, 2, 31], 'G02'), '2026-02-28', 'G02 Feb clamps to 28');
  equal(await sqlFn('finance_card_close_in_month_v1', [2026, 3, 31], 'G02'), '2026-03-31', 'G02 Mar back to 31');

  console.log('\nG03 - leap year (closing 29/31 in Feb 2024)');
  equal(await sqlFn('finance_card_close_in_month_v1', [2024, 2, 31], 'G03'), '2024-02-29', 'G03 leap Feb clamps 31 -> 29');
  equal(await sqlFn('finance_card_close_in_month_v1', [2024, 2, 29], 'G03'), '2024-02-29', 'G03 leap Feb 29 valid');
  equal(await sqlFn('finance_card_close_in_month_v1', [2023, 2, 29], 'G03'), '2023-02-28', 'G03 non-leap Feb 29 -> 28');

  console.log('\nG04 - due date strictly after close (same/next month)');
  equal(await sqlFn('finance_card_due_date_for_close_v1', ['2026-09-28', 8], 'G04'), '2026-10-08', 'G04 close 28 Sep due 8 -> 8 Oct');
  equal(await sqlFn('finance_card_due_date_for_close_v1', ['2026-09-05', 20], 'G04'), '2026-09-20', 'G04 close 5 Sep due 20 -> 20 Sep');
  equal(await sqlFn('finance_card_due_date_for_close_v1', ['2026-09-15', 15], 'G04'), '2026-10-15', 'G04 close 15 Sep due 15 -> 15 Oct');
  equal(await sqlFn('finance_card_due_date_for_close_v1', ['2026-01-31', 1], 'G04'), '2026-02-01', 'G04 close 31 Jan due 1 -> 1 Feb');

  console.log('\nG05 - consecutive installments (closing 31, 3 cuotas)');
  equal(await sqlFn('finance_card_cycle_close_date_v1', ['2026-01-31', 31, 1], 'G05'), '2026-01-31', 'G05 ordinal 1');
  equal(await sqlFn('finance_card_cycle_close_date_v1', ['2026-01-31', 31, 2], 'G05'), '2026-02-28', 'G05 ordinal 2 clamps');
  equal(await sqlFn('finance_card_cycle_close_date_v1', ['2026-01-31', 31, 3], 'G05'), '2026-03-31', 'G05 ordinal 3 back to 31');

  const userA = await createAuthUser('a');
  await createPerson(userA.user.id, 'A');
  const ctxA = await personalContext(userA.user, userA.email, userA.password);

  try {
    const card = await createCard(ctxA, 'Visa 8D3', 28, 8);

    // Historical card (null timing) from QA: ensure NOT invented. Use a direct insert to simulate historical.
    const historicalCard = await insertOne('finance_accounts', {
      id: undefined, name: 'Historica 8D3', currency: 'ARS', account_type: 'CREDIT_CARD',
      financial_context_type: 'personal', owner_person_id: fixture.personIds[0], household_id: null,
      balance_state: 'UNKNOWN', status: 'ACTIVE', closing_day: null, due_day: null, created_by_person_id: fixture.personIds[0],
    });
    fixture.accountIds.push(historicalCard.id);

    console.log('\nG06 - plan creation materializes cycle dates + snapshots (120000 / 3, buy 2026-08-10)');
    const divExpense = await createCardExpense(ctxA, card.id, '120000', 'Compra 8D3', '2026-08-10');
    await createPlan(ctxA, divExpense.id, 3);
    const rows = await readPlanRows(fixture.planIds[0]);
    equal(rows.length, 3, 'G06 three installments');
    equal(rows[0].close, '2026-08-28', 'G06 cuota 1 close 28 Aug');
    equal(rows[0].due, '2026-09-08', 'G06 cuota 1 due 8 Sep');
    equal(rows[1].close, '2026-09-28', 'G06 cuota 2 close 28 Sep');
    equal(rows[1].due, '2026-10-08', 'G06 cuota 2 due 8 Oct');
    equal(rows[2].close, '2026-10-28', 'G06 cuota 3 close 28 Oct');
    equal(rows[2].due, '2026-11-08', 'G06 cuota 3 due 8 Nov');
    equal(rows[0].closing_day_snapshot, 28, 'G06 closing snapshot = 28');
    equal(rows[0].due_day_snapshot, 8, 'G06 due snapshot = 8');
    equal(rows[0].amount, '40000.0000', 'G06 amount 1 = 40000');
    equal(rows[2].amount, '40000.0000', 'G06 amount 3 = 40000');

    console.log('\nG07 - buy AFTER close moves first cycle to next month (2026-08-29)');
    const afterCloseExpense = await createCardExpense(ctxA, card.id, '90000', 'Compra after close', '2026-08-29');
    await createPlan(ctxA, afterCloseExpense.id, 3);
    const afterRows = await readPlanRows(fixture.planIds[1]);
    equal(afterRows[0].close, '2026-09-28', 'G07 first cycle next month close');

    console.log('\nG08 - no new transactions / effects / PaymentDue from plan creation');
    const txnBefore = await queryDb(`select count(1)::int n from public.finance_transactions where created_by_person_id = $1`, [fixture.personIds[0]]);
    const effBefore = await queryDb(`select count(1)::int n from public.finance_account_effects e join public.finance_accounts a on a.id=e.account_id where a.owner_person_id = $1`, [fixture.personIds[0]]);
    const pdBefore = await queryDb(`select count(1)::int n from public.finance_payment_dues where created_by_person_id = $1`, [fixture.personIds[0]]);
    equal(txnBefore.rows[0].n, 2, 'G08 exactly 2 transactions (the two purchases)');
    equal(effBefore.rows[0].n, 2, 'G08 exactly 2 account effects');
    equal(pdBefore.rows[0].n, 0, 'G08 no PaymentDue');

    console.log('\nG09 - historical card (NULL timing) rejected for new plan');
    const histExpense = await createCardExpense(ctxA, historicalCard.id, '50000', 'Historical purchase', '2026-08-10');
    await expectError(() => createPlan(ctxA, histExpense.id, 3), 'credit_card_timing_required', 'G09 null timing rejected');

    console.log('\nG10 - timing edit does NOT rewrite old schedule; new plan uses new timing');
    const beforeEditRows = await readPlanRows(fixture.planIds[0]);
    // edit card closing/due
    const { data: updatedCard, error: updErr } = await admin.from('finance_accounts').update({ closing_day: 10, due_day: 20 }).eq('id', card.id).select('*').single();
    if (updErr) throw new Error(updErr.message);
    // old schedule unchanged materialized
    const afterEditRows = await readPlanRows(fixture.planIds[0]);
    equal(afterEditRows[0].close, beforeEditRows[0].close, 'G10 old schedule close unchanged');
    equal(afterEditRows[0].closing_day_snapshot, 28, 'G10 old snapshot still 28');
    // new plan uses new timing (snapshot 10/20)
    const newExpense = await createCardExpense(ctxA, card.id, '60000', 'Compra new timing', '2026-08-05');
    await createPlan(ctxA, newExpense.id, 2);
    const newRows = await readPlanRows(fixture.planIds[2]);
    equal(newRows[0].closing_day_snapshot, 10, 'G10 new snapshot = 10');
    equal(newRows[0].due_day_snapshot, 20, 'G10 new snapshot = 20');
    equal(newRows[0].close, '2026-08-10', 'G10 new first close = 10 Aug (10/20 timing, buy 5 Aug)');
    equal(newRows[0].due, '2026-08-20', 'G10 new first due = 20 Aug');

    console.log('\nG11 - one-time purchase cycle stability (timing edit does NOT move history)');
    const cardStable = await createCard(ctxA, 'Visa Stable 8D3', 28, 8);
    const oneTime = await createCardExpense(ctxA, cardStable.id, '40000', 'Compra una vez', '2026-09-10');
    const frozenBefore = await queryDb('select card_cycle_close_date::text c from public.finance_transactions where id = $1', [oneTime.id]);
    equal(frozenBefore.rows[0].c, '2026-09-28', 'G11 one-time purchase frozen to 28 Sep at creation');

    // Edit card timing to 5 / 20.
    const { error: updErr2 } = await admin.from('finance_accounts').update({ closing_day: 5, due_day: 20 }).eq('id', cardStable.id);
    if (updErr2) throw new Error(updErr2.message);

    const frozenAfter = await queryDb('select card_cycle_close_date::text c from public.finance_transactions where id = $1', [oneTime.id]);
    equal(frozenAfter.rows[0].c, '2026-09-28', 'G11 frozen cycle unchanged after timing edit');

    // Cycle assignment must use the frozen snapshot, not the NEW closing day (5).
    const stableSep = await queryDb("select (cycle_charges)::text c from public.finance_compute_card_cycle_due_v1($1, '2026-09-28', 5)", [cardStable.id]);
    equal(stableSep.rows[0].c, '40000.0000', 'G11 purchase still assigned to 28 Sep (no drift)');
    const stableOct = await queryDb("select (cycle_charges)::text c from public.finance_compute_card_cycle_due_v1($1, '2026-10-05', 5)", [cardStable.id]);
    equal(stableOct.rows[0].c, '0', 'G11 purchase did NOT drift to the new 5-day cycle');
  } finally {
    await cleanup();
  }

  console.log(`\nFINANCE_8D3_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_8D3_CREDIT_CARD_CYCLE_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_8D3_CREDIT_CARD_CYCLE_TESTS=PASS');
  }
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_8D3_CREDIT_CARD_CYCLE_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});