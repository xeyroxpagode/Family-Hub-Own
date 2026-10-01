#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 8D.4 Installment Purchase Integration tests (backend).
 *
 * Local Supabase only. Validates:
 *   - atomic creation (one Expense + FULL debt effect + plan + schedule)
 *   - full card debt (purchase total, not first installment)
 *   - exact preview amounts (divisible + remainder)
 *   - idempotency: same payload -> replay; different persisted payload -> conflict
 *     (amount / installmentCount / description / notes / category)
 *   - one Movement only
 *   - "un pago" normal path creates no plan
 *   - ACCOUNT rejected for installments
 *   - count 2..60 bounds
 *   - no PaymentDue created
 *   - failed attempt leaves no residue (structural atomicity)
 *   - robust ordered cleanup + residue verification
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

loadTestEnvironment({ required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] });
const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter((name) => !process.env[name]);
if (missing.length) { console.error(`ENVIRONMENT_FAILURE: missing env: ${missing.join(', ')}`); process.exit(2); }
if (!['127.0.0.1', 'localhost'].includes(new URL(process.env.SUPABASE_URL).hostname)) { console.error('ENVIRONMENT_FAILURE: local-only.'); process.exit(2); }

const databaseUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:56222/postgres';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const publicClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

let passCount = 0, failCount = 0;
const fixture = { authUserIds: [], personIds: [], accountIds: [], transactionIds: [] };

function assert(c, m) { if (c) { passCount++; console.log(`  PASS: ${m}`); } else { failCount++; console.error(`  FAIL: ${m}`); } }
function equal(a, b, m) { return assert(a === b, `${m} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})`); }

async function expectError(fn, expectedCode, m) {
  let e = null; try { await fn(); } catch (caught) { e = caught; }
  if (!e) { failCount++; console.error(`  FAIL: ${m} (expected ${expectedCode}, got success)`); return null; }
  if (e.code !== expectedCode) { failCount++; console.error(`  FAIL: ${m} (expected ${expectedCode}, got ${e.code})`); return null; }
  passCount++; console.log(`  PASS: ${m} (code=${e.code})`); return e;
}

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
  const email = `fin8d4-${label}-${suffix}@example.test`;
  const password = `Fin8D4_${crypto.randomBytes(18).toString('base64url')}!9a`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `Fin 8D.4 QA ${label}` } });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  return { user: data.user, email, password };
}

async function createPerson(authUserId, label) {
  const p = await insertOne('people', { auth_user_id: authUserId, display_name: `Fin 8D.4 ${label}`, default_language: 'es-419', personal_settings: {} });
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
async function createCard(ctx, name) {
  const r = await createFinanceAccount(ctx, { name, currency: 'ARS', accountType: FINANCE_ACCOUNT_TYPES.CREDIT_CARD, closingDay: 28, dueDay: 8, initialBalance: { amount: '0', effectiveDate: '2026-01-01' } });
  fixture.accountIds.push(r.account.id);
  return r.account;
}
async function createAcct(ctx, name, balance) {
  const r = await createFinanceAccount(ctx, { name, currency: 'ARS', accountType: FINANCE_ACCOUNT_TYPES.ACCOUNT, initialBalance: { amount: balance, effectiveDate: '2026-01-01' } });
  fixture.accountIds.push(r.account.id);
  return r.account;
}

async function nativeExpenseCategoryIds(count) {
  const res = await queryDb(`select id from public.finance_categories where category_kind='native' and category_type='expense' and deleted_at is null order by id limit $1`, [count]);
  if (res.rows.length < count) throw new Error('not enough native expense categories');
  return res.rows.map((r) => r.id);
}

const uid = () => `${crypto.randomBytes(6).toString('hex')}`;
const iKey = () => `finance.installment_purchase.create:${crypto.randomBytes(12).toString('hex')}`;

function purchasePayload(ctx, accountId, overrides = {}) {
  return createCardInstallmentPurchase(ctx, {
    amount: overrides.amount ?? '120000',
    currency: 'ARS',
    date: '2026-08-10',
    description: overrides.description ?? 'Cuotas 3',
    account: accountId,
    installmentCount: overrides.installmentCount ?? 3,
    ...(overrides.notes !== undefined ? { notes: overrides.notes } : {}),
    ...(overrides.category !== undefined ? { category: overrides.category } : {}),
  }, { mutationId: overrides.mutationId, idempotencyKey: overrides.idempotencyKey });
}

// Robust ordered cleanup + residue verification (checkpoint item 3).
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
  const peopleDel = { error: null };
  if (persons.length) { const r = await admin.from('people').delete().in('id', persons); peopleDel.error = r.error; }
  if (peopleDel.error) throw new Error(`cleanup people delete failed: ${peopleDel.error.message}`);
  for (const u of fixture.authUserIds) await admin.auth.admin.deleteUser(u).catch(() => {});
}

async function main() {
  console.log('FINANCE_8D4_LOCAL_SUPABASE_MODE=CONNECT');
  await queryDb(fs.readFileSync(path.join(root, 'supabase/migrations/20260907000000_finance_credit_card_cycle_v1_1.sql'), 'utf8'));
  await queryDb(fs.readFileSync(path.join(root, 'supabase/migrations/20260907000001_finance_credit_card_installment_purchase_v1_1.sql'), 'utf8'));
  await queryDb(fs.readFileSync(path.join(root, 'supabase/migrations/20260907000003_finance_credit_card_cycle_stability_checkpoint_v1_1.sql'), 'utf8'));

  const userA = await createAuthUser('a');
  await createPerson(userA.user.id, 'A');
  const ctxA = await personalContext(userA.user, userA.email, userA.password);

  try {
    const card = await createCard(ctxA, 'Visa 8D4');
    const acct = await createAcct(ctxA, 'Cuenta 8D4', '1000000');

    console.log('\nH01 - count bounds (2..60)');
    await expectError(() => purchasePayload(ctxA, card.id, { installmentCount: 1, mutationId: uid(), idempotencyKey: iKey() }), 'invalid_finance_installment_count', 'H01 count 1 rejected');
    await expectError(() => purchasePayload(ctxA, card.id, { installmentCount: 61, mutationId: uid(), idempotencyKey: iKey() }), 'invalid_finance_installment_count', 'H01 count 61 rejected');

    console.log('\nH02 - ACCOUNT rejected for installments');
    await expectError(() => purchasePayload(ctxA, acct.id, { mutationId: uid(), idempotencyKey: iKey() }), 'finance_installment_requires_credit_card', 'H02 ACCOUNT rejected');

    console.log('\nH03 - atomic creation: 120000 / 3');
    const mutationId3 = uid(); const ik3 = iKey();
    const created = await purchasePayload(ctxA, card.id, { mutationId: mutationId3, idempotencyKey: ik3 });
    fixture.transactionIds.push(created.transactionId);
    equal(created.installmentCount, 3, 'H03 installmentCount 3');
    equal(created.totalAmount, '120000.0000', 'H03 totalAmount');
    equal(created.outcome, 'created', 'H03 outcome created');

    const tx = await queryDb('select amount::text a from public.finance_transactions where id = $1', [created.transactionId]);
    equal(tx.rows[0].a, '120000.0000', 'H03 one Expense amount 120000');
    const eff = await queryDb('select count(1)::int n, min(effect_amount)::text a from public.finance_account_effects where transaction_id = $1', [created.transactionId]);
    equal(eff.rows[0].n, 1, 'H03 exactly one account effect');
    equal(eff.rows[0].a, '-120000.0000', 'H03 FULL debt effect -120000');
    const plan = await queryDb('select count(i.id)::int c, min(p.total_amount)::text t from public.finance_credit_card_installment_plans p join public.finance_credit_card_installments i on i.installment_plan_id = p.id where p.expense_root_transaction_id = $1', [created.rootTransactionId]);
    equal(plan.rows[0].c, 3, 'H03 three schedule rows');
    equal(plan.rows[0].t, '120000.0000', 'H03 plan total 120000');

    console.log('\nH04 - full card debt (balance = -120000)');
    const bal = await queryDb("select coalesce(sum(effect_amount),0)::text b from public.finance_account_effects where account_id = $1 and effect_status = 'ACTIVE'", [card.id]);
    equal(bal.rows[0].b, '-120000.0000', 'H04 card effect sum -120000 (full debt)');

    console.log('\nH05 - exact preview amounts divisible 120000 / 3');
    const rows = await queryDb('select ordinal, amount::text a from public.finance_credit_card_installments where installment_plan_id = (select id from public.finance_credit_card_installment_plans where expense_root_transaction_id = $1) order by ordinal', [created.rootTransactionId]);
    equal(rows.rows[0].a, '40000.0000', 'H05 cuota 1');
    equal(rows.rows[1].a, '40000.0000', 'H05 cuota 2');
    equal(rows.rows[2].a, '40000.0000', 'H05 cuota 3');

    console.log('\nH06 - remainder allocation 100000 / 3');
    const c6 = await purchasePayload(ctxA, card.id, { amount: '100000', mutationId: uid(), idempotencyKey: iKey() });
    fixture.transactionIds.push(c6.transactionId);
    const r6 = await queryDb('select ordinal, amount::text a from public.finance_credit_card_installments where installment_plan_id = (select id from public.finance_credit_card_installment_plans where expense_root_transaction_id = $1) order by ordinal', [c6.rootTransactionId]);
    equal(r6.rows[0].a, '33333.3333', 'H06 cuota 1 base');
    equal(r6.rows[1].a, '33333.3333', 'H06 cuota 2 base');
    equal(r6.rows[2].a, '33333.3334', 'H06 cuota 3 remainder');

    console.log('\nH07 - idempotency: same payload replay');
    const dup = await purchasePayload(ctxA, card.id, { mutationId: mutationId3, idempotencyKey: ik3 });
    equal(dup.outcome, 'replay', 'H07 replay outcome');
    equal(dup.transactionId, created.transactionId, 'H07 replay returns same transaction id');
    const countAfterRetry = await queryDb('select count(1)::int n from public.finance_transactions where root_transaction_id = $1', [created.rootTransactionId]);
    equal(countAfterRetry.rows[0].n, 1, 'H07 still one transaction (no dup)');

    console.log('\nH11-H15 - idempotency conflict (same identity, different persisted payload)');
    await expectError(() => purchasePayload(ctxA, card.id, { amount: '130000', mutationId: mutationId3, idempotencyKey: ik3 }), 'idempotency_conflict', 'H11 different amount -> conflict');
    await expectError(() => purchasePayload(ctxA, card.id, { installmentCount: 4, mutationId: mutationId3, idempotencyKey: ik3 }), 'idempotency_conflict', 'H12 different installmentCount -> conflict');
    await expectError(() => purchasePayload(ctxA, card.id, { description: 'otra desc', mutationId: mutationId3, idempotencyKey: ik3 }), 'idempotency_conflict', 'H13 different description -> conflict');
    await expectError(() => purchasePayload(ctxA, card.id, { notes: 'una nota', mutationId: mutationId3, idempotencyKey: ik3 }), 'idempotency_conflict', 'H14 different notes -> conflict');

    const [catB] = await nativeExpenseCategoryIds(1);
    await expectError(() => purchasePayload(ctxA, card.id, { category: catB, mutationId: mutationId3, idempotencyKey: ik3 }), 'idempotency_conflict', 'H15 different category -> conflict');

    console.log('\nH16 - failed attempt leaves no residue (structural atomicity)');
    const beforeTx = await queryDb('select count(1)::int n from public.finance_transactions');
    const rpcRes = await ctxA.client.rpc('finance_create_card_installment_purchase_v1', {
      p_actor_account_id: ctxA.accountId,
      p_actor_person_id: ctxA.personId,
      p_mutation_id: uid(),
      p_idempotency_key: iKey(),
      p_payload_hash: crypto.randomBytes(32).toString('hex'),
      p_amount: '50000',
      p_currency: 'ARS',
      p_financial_context_type: 'personal',
      p_owner_person_id: fixture.personIds[0],
      p_household_id: null,
      p_transaction_date: '2026-08-10',
      p_description: null,
      p_notes: null,
      p_category_id: null,
      p_category_label_snapshot: null,
      p_account_id: card.id,
      p_installment_count: 1000,
    });
    assert(rpcRes.error !== null && rpcRes.error !== undefined, 'H16 invalid count raises at RPC');
    const afterTx = await queryDb('select count(1)::int n from public.finance_transactions');
    equal(afterTx.rows[0].n, beforeTx.rows[0].n, 'H16 no transaction residue after failed attempt');

    console.log('\nH08 - "un pago" normal expense creates no plan');
    const normal = await createExpense(ctxA, { amount: '30000', currency: 'ARS', date: '2026-08-10', description: 'Compra sin cuotas', account: card.id });
    fixture.transactionIds.push(normal.transaction.id);
    const normPlan = await queryDb('select count(1)::int n from public.finance_credit_card_installment_plans where expense_root_transaction_id = $1', [normal.transaction.id]);
    equal(normPlan.rows[0].n, 0, 'H08 no plan for un pago');

    console.log('\nH09 - no PaymentDue yet');
    const pd = await queryDb('select count(1)::int n from public.finance_payment_dues where created_by_person_id = $1', [fixture.personIds[0]]);
    equal(pd.rows[0].n, 0, 'H09 no PaymentDue rows');

    console.log('\nH10 - one Movement only');
    const allTx = await queryDb('select count(1)::int n from public.finance_transactions where root_transaction_id = $1', [created.rootTransactionId]);
    equal(allTx.rows[0].n, 1, 'H10 exactly one movement row for the purchase');
  } finally {
    await cleanup();
  }

  console.log('\nH17 - no fixture residue after cleanup');
  const residue = await queryDb(`select
    (select count(1) from public.finance_credit_card_installment_plans where expense_root_transaction_id = any($1::uuid[])) +
    (select count(1) from public.finance_transactions where id = any($1::uuid[])) +
    (select count(1) from public.finance_accounts where id = any($2::uuid[])) as n`,
    [fixture.transactionIds, fixture.accountIds]);
  equal(Number(residue.rows[0].n), 0, 'H17 no fixture residue');

  console.log(`\nFINANCE_8D4_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) { process.exitCode = 1; console.error('FINANCE_STAGE_8D4_INSTALLMENT_PURCHASE_TESTS=FAIL'); }
  else console.log('FINANCE_STAGE_8D4_INSTALLMENT_PURCHASE_TESTS=PASS');
}

main().catch(async (e) => { console.error('FINANCE_STAGE_8D4_INSTALLMENT_PURCHASE_TESTS=ERROR'); console.error(e); await cleanup().catch(() => {}); process.exitCode = 1; });