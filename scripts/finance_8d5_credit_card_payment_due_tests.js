#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 8D.5 Automatic Cycle PaymentDue tests.
 *
 * Local Supabase only. Validates:
 *   - one-time card Expense assigned to its cycle (full amount)
 *   - installment contributes only its current-cycle amount
 *   - future installments excluded; future commitments kept as debt, not Due
 *   - strong idempotency (re-run catch-up does not duplicate)
 *   - unique card+cycle
 *   - no card balance effect from Due creation
 *   - zero-cycle (no purchases) creates no Due
 *   - refund cycle credit + debt-at-close cap
 *   - CRITICAL seeded-due formula (future commitments do not inflate Due)
 *   - as-of-close: payment/refund after close do NOT retroactively affect
 *   - multi-cycle catch-up materializes every missing payable closed cycle
 *   - no CardStatement entity
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
for (const rel of ['backend/.env.test.local', 'backend/.env.local', 'backend/.env', '.env.test.local', '.env.local']) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) {
    const parsed = require('../backend/node_modules/dotenv').parse(fs.readFileSync(abs));
    for (const [key, value] of Object.entries(parsed)) if (process.env[key] === undefined) process.env[key] = value;
  }
}

const { Client } = require('../backend/node_modules/pg');
const { createClient } = require('../backend/node_modules/@supabase/supabase-js');
const { loadTestEnvironment } = require('../tests/helpers/environment');
const { FINANCE_ACCOUNT_TYPES, FINANCE_CONTEXT_TYPES } = require('../backend/src/constants/finance.constants');
const { resolveFinanceContext } = require('../backend/src/services/finance.context.service');
const { createFinanceAccount } = require('../backend/src/services/finance.account.service');
const { createExpense, createCardInstallmentPurchase } = require('../backend/src/services/finance.transaction.service');
const { createRefund } = require('../backend/src/services/finance.refund.service');
const { createTransfer } = require('../backend/src/services/finance.transfer.service');

loadTestEnvironment({ required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] });
const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter((name) => !process.env[name]);
if (missing.length) { console.error(`ENVIRONMENT_FAILURE: ${missing.join(', ')}`); process.exit(2); }
if (!['127.0.0.1', 'localhost'].includes(new URL(process.env.SUPABASE_URL).hostname)) { console.error('ENVIRONMENT_FAILURE: local-only.'); process.exit(2); }

const databaseUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:56222/postgres';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const publicClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

let passCount = 0, failCount = 0;
const fixture = { authUserIds: [], personIds: [], accountIds: [], transactionIds: [] };

function assert(c, m) { if (c) { passCount++; console.log(`  PASS: ${m}`); } else { failCount++; console.error(`  FAIL: ${m}`); } }
function equal(a, b, m) { return assert(a === b, `${m} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})`); }

async function queryDb(sql, params = []) {
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, statement_timeout: 20000 });
  await client.connect();
  try { return await client.query(sql, params); } finally { await client.end(); }
}
async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table} insert failed: ${error.message}`);
  return data;
}
async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin8d5-${label}-${suffix}@example.test`;
  const password = `Fin8D5_${crypto.randomBytes(18).toString('base64url')}!9a`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `Fin 8D.5 QA ${label}` } });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}
async function createPerson(authUserId, label) {
  const p = await insertOne('people', { auth_user_id: authUserId, display_name: `Fin 8D.5 ${label}`, default_language: 'es-419', personal_settings: {} });
  fixture.personIds.push(p.id);
  return p;
}
async function signIn(email, password) {
  const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error('sign in failed');
  return data.session.access_token;
}
async function personalContext(user, email, password) {
  const accessToken = await signIn(email, password);
  return resolveFinanceContext({ user: { id: user.id }, accessToken }, FINANCE_CONTEXT_TYPES.PERSONAL);
}
async function createCard(ctx, name, closing = 28, due = 8) {
  const r = await createFinanceAccount(ctx, { name, currency: 'ARS', accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD, closingDay: closing, dueDay: due, initialBalance: { amount: '0', effectiveDate: '2026-01-01' } });
  fixture.accountIds.push(r.account.id);
  return r.account;
}
async function createAcct(ctx, name, balance) {
  const r = await createFinanceAccount(ctx, { name, currency: 'ARS', accountType: FINANCE_ACCOUNT_TYPES.ACCOUNT, initialBalance: { amount: balance, effectiveDate: '2026-01-01' } });
  fixture.accountIds.push(r.account.id);
  return r.account;
}
function installmentPurchase(ctx, accountId, amount, count, date) {
  return createCardInstallmentPurchase(ctx, { amount, currency: 'ARS', date, description: `Cuotas ${count}`, account: accountId, installmentCount: count }, { mutationId: crypto.randomBytes(8).toString('hex'), idempotencyKey: `k:${crypto.randomBytes(8).toString('hex')}` });
}
async function ensureAs(ctx, date) {
  const { data, error } = await ctx.client.rpc('finance_ensure_closed_credit_card_payment_dues_v1', { p_as_of_date: date });
  if (error) throw new Error(`ensure failed: ${error.message}`);
  return data;
}
async function computeRow(cardId, close, closingDay) {
  const r = await queryDb('select (cycle_charges)::text c, (cycle_refunds)::text r, (cycle_net_charge)::text net, (debt_at_close)::text debt, (future_commitments)::text future, (seeded_due)::text s from public.finance_compute_card_cycle_due_v1($1, $2, $3)', [cardId, close, closingDay]);
  return r.rows[0];
}

// Robust ordered cleanup (checkpoint item 3).
async function cleanup() {
  const accounts = fixture.accountIds;
  const transactions = fixture.transactionIds;
  const persons = fixture.personIds;

  if (accounts.length) await queryDb('delete from public.finance_payment_dues where target_credit_card_account_id = any($1::uuid[])', [accounts]);
  if (accounts.length) await queryDb('delete from public.finance_account_effects where account_id = any($1::uuid[])', [accounts]);
  if (persons.length) await queryDb('delete from public.finance_refund_events where created_by_person_id = any($1::uuid[])', [persons]);
  if (transactions.length) await queryDb('delete from public.finance_credit_card_installment_plans where expense_root_transaction_id = any($1::uuid[])', [transactions]);
  if (accounts.length) await queryDb('delete from public.finance_transfers where source_account_id = any($1::uuid[]) or destination_account_id = any($1::uuid[])', [accounts]);
  if (transactions.length) await queryDb('delete from public.finance_transactions where id = any($1::uuid[])', [transactions]);
  if (accounts.length) await queryDb('delete from public.finance_accounts where id = any($1::uuid[])', [accounts]);

  if (persons.length) await admin.from('people').update({ active_household_id: null }).in('id', persons);
  if (persons.length) { const r = await admin.from('people').delete().in('id', persons); if (r.error) throw new Error(`people delete failed: ${r.error.message}`); }
  for (const u of fixture.authUserIds) await admin.auth.admin.deleteUser(u).catch(() => {});
}

async function main() {
  console.log('FINANCE_8D5_LOCAL_SUPABASE_MODE=CONNECT');
  await queryDb(fs.readFileSync(path.join(root, 'supabase/migrations/20260907000000_finance_credit_card_cycle_v1_1.sql'), 'utf8'));
  await queryDb(fs.readFileSync(path.join(root, 'supabase/migrations/20260907000001_finance_credit_card_installment_purchase_v1_1.sql'), 'utf8'));
  await queryDb(fs.readFileSync(path.join(root, 'supabase/migrations/20260907000002_finance_credit_card_payment_due_v1_1.sql'), 'utf8'));
  await queryDb(fs.readFileSync(path.join(root, 'supabase/migrations/20260907000003_finance_credit_card_cycle_stability_checkpoint_v1_1.sql'), 'utf8'));

  const userA = await createAuthUser('a');
  const pid = (await createPerson(userA.user.id, 'A')).id;
  const ctxA = await personalContext(userA.user, userA.email, userA.password);

  try {
    const card = await createCard(ctxA, 'Visa 8D5');

    console.log('\nJ01 - one-time + installment in first cycle (close 28 Aug)');
    const normal = await createExpense(ctxA, { amount: '30000', currency: 'ARS', date: '2026-08-10', description: 'Compra una vez', account: card.id });
    fixture.transactionIds.push(normal.transaction.id);
    const inst = await installmentPurchase(ctxA, card.id, '120000', 3, '2026-08-10');
    fixture.transactionIds.push(inst.transactionId);

    console.log('\nJ02 - ensure materializes exactly one Due for Aug (30000 + cuota 40000 = 70000)');
    let res = await ensureAs(ctxA, '2026-08-31');
    console.log(`  ensure result: ${JSON.stringify(res)}`);
    const dues = await queryDb('select due_date::text d, expected_amount::text a, cycle_close_date::text c, kind, status from public.finance_payment_dues where target_credit_card_account_id = $1 order by cycle_close_date', [card.id]);
    equal(dues.rows.length, 1, 'J02 exactly one due');
    equal(dues.rows[0].a, '70000.0000', 'J02 seeded 70000 (30000 + 40000)');
    equal(dues.rows[0].d, '2026-09-08', 'J02 due date 8 Sep');
    equal(dues.rows[0].c, '2026-08-28', 'J02 cycle close 28 Aug');
    equal(dues.rows[0].kind, 'CREDIT_CARD', 'J02 kind CREDIT_CARD');
    equal(dues.rows[0].status, 'PENDING', 'J02 status PENDING');

    console.log('\nJ03 - future installments excluded (Sep/Oct not yet closed at as-of 2026-08-31)');
    const futureDues = await queryDb("select count(1)::int n from public.finance_payment_dues where target_credit_card_account_id = $1 and cycle_close_date > '2026-08-31'", [card.id]);
    equal(Number(futureDues.rows[0].n), 0, 'J03 no future-cycle dues yet');

    console.log('\nJ04 - idempotency (re-run produces no duplicate)');
    await ensureAs(ctxA, '2026-08-31');
    await ensureAs(ctxA, '2026-08-31');
    const duesAfter = await queryDb("select count(1)::int n from public.finance_payment_dues where target_credit_card_account_id = $1 and cycle_close_date = '2026-08-28'", [card.id]);
    equal(Number(duesAfter.rows[0].n), 1, 'J04 still exactly one due after re-run');

    console.log('\nJ05 - no card balance effect from Due creation (still 150000 debt)');
    const bal = await queryDb("select coalesce(sum(effect_amount),0)::text b from public.finance_account_effects where account_id = $1 and effect_status = 'ACTIVE'", [card.id]);
    equal(bal.rows[0].b, '-150000.0000', 'J05 balance unchanged (full debt 30000 + 120000)');

    console.log('\nJ06 - zero-cycle card (no purchases) creates no Due');
    const emptyCard = await createCard(ctxA, 'Visa Vacia 8D5', 15, 5);
    await ensureAs(ctxA, '2026-08-31');
    const emptyDues = await queryDb('select count(1)::int n from public.finance_payment_dues where target_credit_card_account_id = $1', [emptyCard.id]);
    equal(Number(emptyDues.rows[0].n), 0, 'J06 no Due for zero-charge card');

    console.log('\nJ07 - no CardStatement entity');
    const stmt = await queryDb("select to_regclass('public.finance_card_statements')::text v");
    equal(stmt.rows[0].v, null, 'J07 no CardStatement table');

    console.log('\nJ08 - unique card+cycle enforced');
    try {
      await queryDb("insert into public.finance_payment_dues (financial_context_type, owner_person_id, household_id, title, currency, expected_amount_known, expected_amount, due_date, kind, target_credit_card_account_id, cycle_close_date, status) values ('personal', $1, null, 'Visa 8D5', 'ARS', true, 1, '2026-09-08', 'CREDIT_CARD', $2, '2026-08-28', 'PENDING')", [pid, card.id]);
      equal(false, true, 'J08 duplicate insert unexpectedly succeeded');
    } catch (e) {
      assert(String(e.message).includes('finance_payment_dues_card_cycle_uidx') || e.code === '23505', 'J08 duplicate insert rejected (unique constraint)');
    }

    console.log('\nJ09 - refund reduces cycle credit (canonical)');
    const cardB = await createCard(ctxA, 'Visa Refund 8D5');
    const acctB = await createAcct(ctxA, 'Cuenta Refund 8D5', '1000000');
    const refundTxn = await createExpense(ctxA, { amount: '50000', currency: 'ARS', date: '2026-08-05', description: 'Compra a devolver', account: cardB.id });
    fixture.transactionIds.push(refundTxn.transaction.id);
    await createRefund(ctxA, { transactionId: refundTxn.transaction.id, amount: '20000', effectiveDate: '2026-08-10', mutationId: crypto.randomBytes(8).toString('hex'), idempotencyKey: `r:${crypto.randomBytes(8).toString('hex')}` });
    const j9 = await computeRow(cardB.id, '2026-08-28', 28);
    equal(j9.c, '50000.0000', 'J09 charges 50000');
    equal(j9.r, '20000.0000', 'J09 refunds 20000');
    equal(j9.net, '30000.0000', 'J09 net 30000');
    equal(j9.s, '30000.0000', 'J09 seeded 30000');

    console.log('\nJ10 - debt-at-close cap: pre-close card payment reduces debt (canonical transfer)');
    await createTransfer(ctxA, { sourceAccount: acctB.id, destinationAccount: cardB.id, amount: '25000', date: '2026-08-20', description: 'Pago antes del cierre' }, { mutationId: crypto.randomBytes(8).toString('hex'), idempotencyKey: `t:${crypto.randomBytes(8).toString('hex')}`, requestId: null });
    const j10 = await computeRow(cardB.id, '2026-08-28', 28);
    equal(j10.net, '30000.0000', 'J10 net charge still 30000');
    equal(j10.debt, '5000.0000', 'J10 debt at close 5000');
    equal(j10.s, '5000.0000', 'J10 seeded capped at 5000');

    console.log('\nJ11 - CRITICAL seeded-due formula: future commitments do not inflate Due');
    const cardC = await createCard(ctxA, 'Visa Formula 8D5');
    const acctC = await createAcct(ctxA, 'Cuenta Formula 8D5', '1000000');
    const instC = await installmentPurchase(ctxA, cardC.id, '120000', 3, '2026-08-05');
    fixture.transactionIds.push(instC.transactionId);
    await createTransfer(ctxA, { sourceAccount: acctC.id, destinationAccount: cardC.id, amount: '20000', date: '2026-08-20', description: 'Pago parcial antes del cierre' }, { mutationId: crypto.randomBytes(8).toString('hex'), idempotencyKey: `t:${crypto.randomBytes(8).toString('hex')}`, requestId: null });
    const j11 = await computeRow(cardC.id, '2026-08-28', 28);
    equal(j11.net, '40000.0000', 'J11 cycleNetCharge 40000 (current installment)');
    equal(j11.future, '80000.0000', 'J11 future commitments 80000');
    equal(j11.debt, '100000.0000', 'J11 total debt at close 100000');
    equal(j11.s, '20000.0000', 'J11 seededDue 20000 (40000 - pre-close payment)');
    await ensureAs(ctxA, '2026-08-31');
    const j11due = await queryDb("select expected_amount::text a from public.finance_payment_dues where target_credit_card_account_id = $1 and cycle_close_date = '2026-08-28'", [cardC.id]);
    equal(j11due.rows[0].a, '20000.0000', 'J11 materialized Due = 20000');

    console.log('\nJ12 - payment AFTER close does NOT retroactively affect that cycle');
    const cardD = await createCard(ctxA, 'Visa AfterClose 8D5');
    const acctD = await createAcct(ctxA, 'Cuenta AfterClose 8D5', '1000000');
    const instD = await installmentPurchase(ctxA, cardD.id, '120000', 3, '2026-08-05');
    fixture.transactionIds.push(instD.transactionId);
    await createTransfer(ctxA, { sourceAccount: acctD.id, destinationAccount: cardD.id, amount: '20000', date: '2026-09-01', description: 'Pago despues del cierre' }, { mutationId: crypto.randomBytes(8).toString('hex'), idempotencyKey: `t:${crypto.randomBytes(8).toString('hex')}`, requestId: null });
    await ensureAs(ctxA, '2026-08-31');
    const j12due = await queryDb("select expected_amount::text a from public.finance_payment_dues where target_credit_card_account_id = $1 and cycle_close_date = '2026-08-28'", [cardD.id]);
    equal(j12due.rows[0].a, '40000.0000', 'J12 Aug Due still 40000 (post-close payment excluded)');

    console.log('\nJ13 - refund AFTER close does NOT retroactively alter that cycle');
    const cardE = await createCard(ctxA, 'Visa RefundAfter 8D5');
    const instE = await installmentPurchase(ctxA, cardE.id, '120000', 3, '2026-08-05');
    fixture.transactionIds.push(instE.transactionId);
    await createRefund(ctxA, { transactionId: instE.transactionId, amount: '40000', effectiveDate: '2026-09-05', mutationId: crypto.randomBytes(8).toString('hex'), idempotencyKey: `r:${crypto.randomBytes(8).toString('hex')}` });
    await ensureAs(ctxA, '2026-08-31');
    const j13due = await queryDb("select expected_amount::text a from public.finance_payment_dues where target_credit_card_account_id = $1 and cycle_close_date = '2026-08-28'", [cardE.id]);
    equal(j13due.rows[0].a, '40000.0000', 'J13 Aug Due still 40000 (post-close refund excluded)');

    console.log('\nJ14 - multi-cycle catch-up materializes every missing payable closed cycle');
    const cardF = await createCard(ctxA, 'Visa Multi 8D5');
    const instF = await installmentPurchase(ctxA, cardF.id, '120000', 3, '2026-08-05');
    fixture.transactionIds.push(instF.transactionId);
    await ensureAs(ctxA, '2026-10-31');
    const multif = await queryDb('select cycle_close_date::text c, expected_amount::text a, due_date::text d from public.finance_payment_dues where target_credit_card_account_id = $1 order by cycle_close_date', [cardF.id]);
    equal(multif.rows.length, 3, 'J14 three dues (Aug, Sep, Oct)');
    equal(multif.rows[0].c, '2026-08-28', 'J14 Aug close');
    equal(multif.rows[0].a, '40000.0000', 'J14 Aug amount');
    equal(multif.rows[1].c, '2026-09-28', 'J14 Sep close');
    equal(multif.rows[1].a, '40000.0000', 'J14 Sep amount');
    equal(multif.rows[2].c, '2026-10-28', 'J14 Oct close');
    equal(multif.rows[2].a, '40000.0000', 'J14 Oct amount');
    equal(multif.rows[0].d, '2026-09-08', 'J14 due dates correct (Aug -> 8 Sep)');
    await ensureAs(ctxA, '2026-10-31');
    const j14count = await queryDb('select count(1)::int n from public.finance_payment_dues where target_credit_card_account_id = $1', [cardF.id]);
    equal(Number(j14count.rows[0].n), 3, 'J14 re-run adds zero duplicates');
  } finally {
    await cleanup();
  }

  console.log('\nJ15 - no fixture residue after cleanup');
  const residue = await queryDb(`select
    (select count(1) from public.finance_payment_dues where target_credit_card_account_id = any($2::uuid[])) +
    (select count(1) from public.finance_credit_card_installment_plans where expense_root_transaction_id = any($1::uuid[])) +
    (select count(1) from public.finance_transactions where id = any($1::uuid[])) +
    (select count(1) from public.finance_accounts where id = any($2::uuid[])) as n`,
    [fixture.transactionIds, fixture.accountIds]);
  equal(Number(residue.rows[0].n), 0, 'J15 no fixture residue');

  console.log(`\nFINANCE_8D5_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) { process.exitCode = 1; console.error('FINANCE_STAGE_8D5_AUTOMATIC_PAYMENTDUE_TESTS=FAIL'); }
  else console.log('FINANCE_STAGE_8D5_AUTOMATIC_PAYMENTDUE_TESTS=PASS');
}

main().catch(async (e) => { console.error('FINANCE_STAGE_8D5_AUTOMATIC_PAYMENTDUE_TESTS=ERROR'); console.error(e); await cleanup().catch(() => {}); process.exitCode = 1; });