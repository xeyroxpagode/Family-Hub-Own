#!/usr/bin/env node
'use strict';

/** Finance V1.1 - Stage 8D.7 Credit Card Lifecycle Interactions tests. */

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
const { createCardInstallmentPurchase, createExpense } = require('../backend/src/services/finance.transaction.service');
const { createTransfer } = require('../backend/src/services/finance.transfer.service');

loadTestEnvironment({ required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] });
if (!['127.0.0.1', 'localhost'].includes(new URL(process.env.SUPABASE_URL).hostname)) {
  console.error('ENVIRONMENT_FAILURE: local-only.');
  process.exit(2);
}

const databaseUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:56222/postgres';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const publicClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

let passCount = 0;
let failCount = 0;
const fixture = { authUserIds: [], personIds: [], householdIds: [], accountIds: [], dueIds: [], transactionIds: [] };

function assert(condition, message) {
  if (condition) { passCount += 1; console.log(`  PASS: ${message}`); }
  else { failCount += 1; console.error(`  FAIL: ${message}`); }
}
function equal(actual, expected, message) { assert(actual === expected, `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`); }
function mid(label) { return `fin8d7-${label}-${crypto.randomBytes(8).toString('hex')}`; }
function idem(label) { return `idem8d7-${label}-${crypto.randomBytes(8).toString('hex')}`; }
function hash(payload) { return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'); }

async function queryDb(sql, params = []) {
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, statement_timeout: 30000 });
  await client.connect();
  try { return await client.query(sql, params); } finally { await client.end(); }
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin8d7-${label}-${suffix}@example.test`;
  const password = `Fin8D7_${crypto.randomBytes(18).toString('base64url')}!9a`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  const { data: person, error: personError } = await admin.from('people').insert({ auth_user_id: data.user.id, display_name: `Fin 8D7 ${label}`, default_language: 'es-419', personal_settings: {} }).select('*').single();
  if (personError) throw personError;
  fixture.personIds.push(person.id);
  return { user: data.user, person, email, password };
}

async function signIn(email, password) {
  const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(`sign in failed: ${error?.message}`);
  return data.session.access_token;
}

async function financeContext(actor, contextType = FINANCE_CONTEXT_TYPES.PERSONAL) {
  const accessToken = await signIn(actor.email, actor.password);
  return resolveFinanceContext({ user: { id: actor.user.id }, accessToken }, contextType);
}

async function createHouseholdContext(actor, label) {
  const ctx = await financeContext(actor);
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const { data: household, error } = await admin.from('households').insert({
    name: `HH 8D7 ${label} ${suffix}`,
    slug: `hh-8d7-${label}-${suffix}`,
    created_by_person_id: ctx.personId,
  }).select('*').single();
  if (error) throw error;
  fixture.householdIds.push(household.id);
  await queryDb("insert into public.household_members (household_id, person_id, role, status, joined_at) values ($1, $2, 'coordinator', 'active', now())", [household.id, ctx.personId]);
  await queryDb('update public.people set active_household_id = $1 where id = $2', [household.id, ctx.personId]);
  return financeContext(actor, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
}

async function createAccount(ctx, name, amount, currency = 'ARS', accountType = FINANCE_ACCOUNT_TYPES.ACCOUNT) {
  const initialBalance = amount === null ? undefined : { amount, effectiveDate: '2026-01-01' };
  const timing = accountType === FINANCE_ACCOUNT_TYPES.CREDIT_CARD ? { closingDay: 28, dueDay: 8 } : {};
  const res = await createFinanceAccount(ctx, { name, currency, accountType, initialBalance, ...timing });
  fixture.accountIds.push(res.account.id);
  return res.account;
}

async function createDue(ctx, body) {
  const payload = { due: body.title ?? 'Due 8D7', amount: body.amount, card: body.targetCreditCardAccountId };
  const { data, error } = await ctx.client.rpc('finance_payment_due_create_oneoff_v1', {
    p_mutation_id: mid('due'),
    p_idempotency_key: idem('due'),
    p_payload_hash: hash(payload),
    p_created_by_person_id: ctx.personId,
    p_kind: body.kind ?? 'CREDIT_CARD',
    p_title: body.title ?? 'Due 8D7',
    p_currency: body.currency ?? 'ARS',
    p_expected_amount_known: body.expectedAmountKnown ?? true,
    p_expected_amount: body.amount ?? null,
    p_due_date: body.dueDate ?? '2026-09-10',
    p_category_id: null,
    p_target_credit_card_account_id: body.targetCreditCardAccountId ?? null,
    p_financial_context_type: ctx.contextType,
    p_owner_person_id: ctx.contextType === FINANCE_CONTEXT_TYPES.PERSONAL ? ctx.personId : null,
    p_household_id: ctx.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD ? ctx.householdId : null,
  });
  if (error) throw error;
  fixture.dueIds.push(data.id);
  return data;
}

async function ensureCardDues(ctx, asOfDate) {
  const { data, error } = await ctx.client.rpc('finance_ensure_closed_credit_card_payment_dues_v1', {
    p_as_of_date: asOfDate,
  });
  if (error) throw error;
  return data;
}

async function createCardExpense(ctx, cardId, body = {}) {
  const result = await createExpense(ctx, {
    amount: body.amount ?? '10000',
    currency: body.currency ?? 'ARS',
    date: body.date ?? '2026-08-10',
    description: body.description ?? 'Compra tarjeta 8D7',
    notes: body.notes ?? null,
    account: cardId,
  });
  fixture.transactionIds.push(result.transaction.id);
  return result.transaction;
}

async function correctTransactionRpc(ctx, transactionId, corrections = {}, label = 'correct') {
  const payload = { transactionId, corrections, label };
  const { data, error } = await ctx.client.rpc('finance_correct_transaction_v1', {
    p_transaction_id: transactionId,
    p_mutation_id: mid(label),
    p_idempotency_key: idem(label),
    p_payload_hash: hash(payload),
    p_created_by_person_id: ctx.personId,
    p_amount: corrections.amount ?? null,
    p_currency: corrections.currency ?? null,
    p_transaction_date: corrections.transactionDate ?? null,
    p_description: corrections.description ?? null,
    p_category_id: corrections.categoryId ?? null,
    p_account_id: corrections.accountId ?? null,
    p_notes: corrections.notes ?? null,
    p_clear_description: corrections.clearDescription ?? false,
    p_clear_category: corrections.clearCategory ?? false,
    p_clear_account: corrections.clearAccount ?? false,
    p_clear_notes: corrections.clearNotes ?? false,
  });
  if (error) throw error;
  fixture.transactionIds.push(data.id);
  return data;
}

async function settle(ctx, dueId, body, identity = {}) {
  const mutationId = identity.mutationId ?? mid('settle');
  const payloadHash = identity.payloadHash ?? hash({ dueId, ...body, mutationId });
  const { data, error } = await ctx.client.rpc('finance_payment_settle_credit_card_due_v1', {
    p_due_id: dueId,
    p_mutation_id: mutationId,
    p_idempotency_key: identity.idempotencyKey ?? idem('settle'),
    p_payload_hash: payloadHash,
    p_created_by_person_id: ctx.personId,
    p_source_account_id: body.sourceAccountId,
    p_source_amount: body.sourceAmount,
    p_destination_amount: body.destinationAmount ?? null,
    p_actual_date: body.actualDate ?? '2026-09-01',
  });
  if (error) throw error;
  return data;
}

async function transferLifecycle(ctx, rpc, transferId, label) {
  const { data, error } = await ctx.client.rpc(rpc, {
    p_transfer_id: transferId,
    p_mutation_id: mid(label),
    p_idempotency_key: idem(label),
    p_payload_hash: hash({ rpc, transferId, label }),
    p_created_by_person_id: ctx.personId,
  });
  if (error) throw error;
  return data;
}

async function transactionLifecycle(ctx, rpc, transactionId, label) {
  const { data, error } = await ctx.client.rpc(rpc, {
    p_transaction_id: transactionId,
    p_mutation_id: mid(label),
    p_idempotency_key: idem(label),
    p_payload_hash: hash({ rpc, transactionId, label }),
    p_created_by_person_id: ctx.personId,
  });
  if (error) throw error;
  return data;
}

async function expectReject(label, fn, code) {
  try {
    await fn();
    assert(false, `${label} rejected`);
  } catch (error) {
    const msg = String(error.message ?? '');
    assert(error.code === code || msg.includes(code) || error.code === '23514' || error.code === '42501' || error.code === 'P0008', `${label} rejected (${code})`);
  }
}

async function progress(dueId) {
  const r = await queryDb('select paid_so_far::text, remaining::text, is_partially_paid from public.finance_payment_due_progress_v1($1)', [dueId]);
  return r.rows[0];
}

async function dueRow(dueId) {
  const r = await queryDb('select id, status, expected_amount::text, due_date::text, cycle_close_date::text, actual_amount::text, actual_date, paid_at, actual_account_id from public.finance_payment_dues where id = $1', [dueId]);
  return r.rows[0];
}

async function dueForCardCycle(cardId, cycleCloseDate) {
  const r = await queryDb(`
    select id, status, expected_amount::text, due_date::text, cycle_close_date::text
    from public.finance_payment_dues
    where kind = 'CREDIT_CARD'
      and target_credit_card_account_id = $1
      and cycle_close_date = $2
    order by created_at, id
  `, [cardId, cycleCloseDate]);
  return r.rows[0] ?? null;
}

async function accountBalance(accountId) {
  const r = await queryDb(`
    with latest_anchor as (
      select amount, effective_date, created_at
      from public.finance_account_balance_anchors
      where account_id = $1
      order by effective_date desc, created_at desc, id desc
      limit 1
    ), effect_sum as (
      select coalesce(sum(e.effect_amount), 0::numeric) amount
      from public.finance_account_effects e
      cross join latest_anchor a
      where e.account_id = $1
        and e.effect_status = 'ACTIVE'
        and (
          e.transaction_date > a.effective_date
          or (e.transaction_date = a.effective_date and e.transaction_created_at > a.created_at)
        )
    )
    select ((select amount from latest_anchor) + (select amount from effect_sum))::text as b
  `, [accountId]);
  return r.rows[0].b;
}

async function installmentRows(rootTransactionId) {
  const r = await queryDb(`
    select p.id as plan_id, p.closing_day_snapshot, p.due_day_snapshot,
           i.id as row_id, i.ordinal, i.amount::text, i.cycle_close_date::text, i.cycle_due_date::text
    from public.finance_credit_card_installment_plans p
    join public.finance_credit_card_installments i on i.installment_plan_id = p.id
    where p.expense_root_transaction_id = $1
    order by i.ordinal
  `, [rootTransactionId]);
  return r.rows;
}

async function cleanup() {
  if (fixture.dueIds.length) await queryDb('delete from public.finance_payment_due_settlements where payment_due_id = any($1::uuid[])', [fixture.dueIds]).catch(() => {});
  if (fixture.accountIds.length) await queryDb('delete from public.finance_payment_due_settlements s using public.finance_transfers t where s.transfer_id = t.id and (t.source_account_id = any($1::uuid[]) or t.destination_account_id = any($1::uuid[]))', [fixture.accountIds]).catch(() => {});
  if (fixture.dueIds.length) await queryDb('delete from public.finance_payment_dues where id = any($1::uuid[])', [fixture.dueIds]).catch(() => {});
  if (fixture.accountIds.length) await queryDb('delete from public.finance_account_effects where account_id = any($1::uuid[])', [fixture.accountIds]).catch(() => {});
  if (fixture.accountIds.length) await queryDb('delete from public.finance_transfers where source_account_id = any($1::uuid[]) or destination_account_id = any($1::uuid[])', [fixture.accountIds]).catch(() => {});
  if (fixture.transactionIds.length) await queryDb('delete from public.finance_credit_card_installment_plans where expense_root_transaction_id = any($1::uuid[])', [fixture.transactionIds]).catch(() => {});
  if (fixture.transactionIds.length) await queryDb('delete from public.finance_transactions where id = any($1::uuid[])', [fixture.transactionIds]).catch(() => {});
  if (fixture.accountIds.length) await queryDb('delete from public.finance_accounts where id = any($1::uuid[])', [fixture.accountIds]).catch(() => {});
  if (fixture.personIds.length) {
    try { await admin.from('people').update({ active_household_id: null }).in('id', fixture.personIds); } catch {}
  }
  if (fixture.householdIds.length) await queryDb('delete from public.household_members where household_id = any($1::uuid[])', [fixture.householdIds]).catch(() => {});
  if (fixture.householdIds.length) await queryDb('delete from public.households where id = any($1::uuid[])', [fixture.householdIds]).catch(() => {});
  if (fixture.personIds.length) {
    try { await admin.from('people').delete().in('id', fixture.personIds); } catch {}
  }
  for (const id of fixture.authUserIds) await admin.auth.admin.deleteUser(id).catch(() => {});
}

async function main() {
  console.log('FINANCE_8D7_LOCAL_SUPABASE_MODE=CONNECT');

  const actorA = await createAuthUser('A');
  const actorB = await createAuthUser('B');
  const ctxA = await financeContext(actorA);
  const ctxB = await financeContext(actorB);

  try {
    console.log('\nA - INSTALLMENT ROOT LIFECYCLE');
    const card = await createAccount(ctxA, 'Visa 8D7 Lifecycle', '0', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const purchase = await createCardInstallmentPurchase(ctxA, { amount: '120000', currency: 'ARS', date: '2026-08-10', description: 'Cuotas 8D7', account: card.id, installmentCount: 3 }, { mutationId: mid('inst'), idempotencyKey: idem('inst') });
    fixture.transactionIds.push(purchase.transactionId);
    const beforeRows = await installmentRows(purchase.transactionId);
    equal(beforeRows.length, 3, 'A1 plan has 3 installment rows');
    equal(await accountBalance(card.id), '-120000.0000', 'A2 full card debt exists before trash');
    await transactionLifecycle(ctxA, 'finance_trash_transaction_v1', purchase.transactionId, 'tx-trash');
    const trashed = await queryDb('select status from public.finance_transactions where id = $1', [purchase.transactionId]);
    equal(trashed.rows[0].status, 'TRASHED', 'A3 root Expense trashed');
    const effectStatus = await queryDb("select effect_status from public.finance_account_effects where transaction_id = $1 and effect_role = 'PRIMARY'", [purchase.transactionId]);
    equal(effectStatus.rows[0].effect_status, 'REVERSED', 'A4 root primary effect reversed');
    equal(await accountBalance(card.id), '0.0000', 'A5 card full debt removed by trash');
    const trashedRows = await installmentRows(purchase.transactionId);
    equal(trashedRows.length, 3, 'A6 plan rows preserved after trash');
    equal(JSON.stringify(trashedRows.map((r) => r.row_id)), JSON.stringify(beforeRows.map((r) => r.row_id)), 'A7 same installment row IDs after trash');
    equal(JSON.stringify(trashedRows.map((r) => [r.cycle_close_date, r.cycle_due_date])), JSON.stringify(beforeRows.map((r) => [r.cycle_close_date, r.cycle_due_date])), 'A8 cycle snapshots unchanged after trash');
    const computeTrashed = await queryDb('select cycle_charges::text, future_commitments::text, seeded_due::text from public.finance_compute_card_cycle_due_v1($1, $2, $3)', [card.id, '2026-08-28', 28]);
    equal(computeTrashed.rows[0].future_commitments, '0', 'A9 future commitments exclude trashed root');
    await transactionLifecycle(ctxA, 'finance_restore_transaction_v1', purchase.transactionId, 'tx-restore');
    equal(await accountBalance(card.id), '-120000.0000', 'A10 full card debt restored exactly once');
    const restoredRows = await installmentRows(purchase.transactionId);
    equal(JSON.stringify(restoredRows.map((r) => r.row_id)), JSON.stringify(beforeRows.map((r) => r.row_id)), 'A11 restore reused same rows');
    equal(JSON.stringify(restoredRows.map((r) => [r.closing_day_snapshot, r.due_day_snapshot])), JSON.stringify(beforeRows.map((r) => [r.closing_day_snapshot, r.due_day_snapshot])), 'A12 restore kept plan snapshots');
    const countsAfterRestore = await queryDb('select (select count(*)::int from public.finance_credit_card_installment_plans where expense_root_transaction_id = $1) plans, (select count(*)::int from public.finance_account_effects where transaction_id = $1) effects', [purchase.transactionId]);
    equal(Number(countsAfterRestore.rows[0].plans), 1, 'A13 no duplicate installment plan');
    equal(Number(countsAfterRestore.rows[0].effects), 1, 'A14 no duplicate account effect');

    console.log('\nB - SETTLEMENT LIFECYCLE');
    const settlementCard = await createAccount(ctxA, 'Visa Settlement 8D7', '-40000', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const source = await createAccount(ctxA, 'Source Settlement 8D7', '100000', 'ARS');
    const due = await createDue(ctxA, { targetCreditCardAccountId: settlementCard.id, amount: '40000' });
    const sA = await settle(ctxA, due.id, { sourceAccountId: source.id, sourceAmount: '15000' });
    const sB = await settle(ctxA, due.id, { sourceAccountId: source.id, sourceAmount: '25000' });
    equal((await progress(due.id)).paid_so_far, '40000.0000', 'B1 active settlements count to paidSoFar');
    equal((await dueRow(due.id)).status, 'PAID', 'B2 due is PAID when complete');
    await transferLifecycle(ctxA, 'finance_trash_transfer_v1', sB.transfer_id, 'trash-settlement-b');
    const afterTrash = await progress(due.id);
    equal(afterTrash.paid_so_far, '15000.0000', 'B3 trashed settlement stops counting');
    equal(afterTrash.remaining, '25000.0000', 'B4 remaining increases after trash');
    equal((await dueRow(due.id)).status, 'PENDING', 'B5 PAID -> PENDING reconciled');
    const bLink = await queryDb('select count(*)::int n from public.finance_payment_due_settlements where transfer_id = $1 and payment_due_id = $2', [sB.transfer_id, due.id]);
    equal(Number(bLink.rows[0].n), 1, 'B6 settlement link remains historical');
    await transferLifecycle(ctxA, 'finance_restore_transfer_v1', sB.transfer_id, 'restore-settlement-b');
    equal((await progress(due.id)).remaining, '0.0000', 'B7 restore settlement counts again');
    equal((await dueRow(due.id)).status, 'PAID', 'B8 PENDING -> PAID reconciled');
    await transferLifecycle(ctxA, 'finance_trash_transfer_v1', sB.transfer_id, 'trash-settlement-b2');
    const sC = await settle(ctxA, due.id, { sourceAccountId: source.id, sourceAmount: '25000' });
    assert(sC.transfer_id, 'B9 replacement settlement C accepted');
    await expectReject('B10 over-settlement restore', () => transferLifecycle(ctxA, 'finance_restore_transfer_v1', sB.transfer_id, 'restore-over'), 'finance_payment_settlement_exceeds_remaining');
    equal((await progress(due.id)).paid_so_far, '40000.0000', 'B11 paidSoFar never exceeds Due after rejected restore');

    console.log('\nC - ACCOUNT FLOOR ON RESTORE');
    const exactCard = await createAccount(ctxA, 'Exact Restore Card', '-5000', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const exactSource = await createAccount(ctxA, 'Exact Restore Source', '5000', 'ARS');
    const exactDue = await createDue(ctxA, { targetCreditCardAccountId: exactCard.id, amount: '5000' });
    const exactSettlement = await settle(ctxA, exactDue.id, { sourceAccountId: exactSource.id, sourceAmount: '5000' });
    await transferLifecycle(ctxA, 'finance_trash_transfer_v1', exactSettlement.transfer_id, 'trash-exact');
    await transferLifecycle(ctxA, 'finance_restore_transfer_v1', exactSettlement.transfer_id, 'restore-exact');
    equal(await accountBalance(exactSource.id), '0.0000', 'C1 exact source balance allowed on restore');
    const floorCard = await createAccount(ctxA, 'Floor Restore Card', '-10000', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const floorSource = await createAccount(ctxA, 'Floor Restore Source', '10000', 'ARS');
    const floorDue = await createDue(ctxA, { targetCreditCardAccountId: floorCard.id, amount: '10000' });
    const floorSettlement = await settle(ctxA, floorDue.id, { sourceAccountId: floorSource.id, sourceAmount: '10000' });
    await transferLifecycle(ctxA, 'finance_trash_transfer_v1', floorSettlement.transfer_id, 'trash-floor');
    await createTransfer(ctxA, { sourceAccount: floorSource.id, destinationAccount: floorCard.id, amount: '10000', date: '2026-09-02', description: 'Spend restored funds' }, { mutationId: mid('spend'), idempotencyKey: idem('spend'), requestId: null });
    await expectReject('C2 insufficient source balance on restore', () => transferLifecycle(ctxA, 'finance_restore_transfer_v1', floorSettlement.transfer_id, 'restore-floor'), 'finance_account_insufficient_funds');
    equal(await accountBalance(floorSource.id), '0.0000', 'C3 failed restore does not make ACCOUNT negative');

    console.log('\nD - MULTI-DUE AND GENERAL CARD PAYMENT');
    const isoCard = await createAccount(ctxA, 'Isolation Card', '-30000', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const isoSource = await createAccount(ctxA, 'Isolation Source', '50000', 'ARS');
    const dueA = await createDue(ctxA, { targetCreditCardAccountId: isoCard.id, amount: '10000', title: 'Due A' });
    const dueB = await createDue(ctxA, { targetCreditCardAccountId: isoCard.id, amount: '10000', title: 'Due B' });
    const dueASettlement = await settle(ctxA, dueA.id, { sourceAccountId: isoSource.id, sourceAmount: '10000' });
    await settle(ctxA, dueB.id, { sourceAccountId: isoSource.id, sourceAmount: '10000' });
    await transferLifecycle(ctxA, 'finance_trash_transfer_v1', dueASettlement.transfer_id, 'trash-isolation-a');
    equal((await progress(dueA.id)).paid_so_far, '0', 'D1 Due A affected by its settlement trash');
    equal((await progress(dueB.id)).paid_so_far, '10000.0000', 'D2 Due B isolated from Due A trash');
    const general = await createTransfer(ctxA, { sourceAccount: isoSource.id, destinationAccount: isoCard.id, amount: '15000', date: '2026-09-03', description: 'General card payment' }, { mutationId: mid('general'), idempotencyKey: idem('general'), requestId: null });
    const generalLink = await queryDb('select count(*)::int n from public.finance_payment_due_settlements where transfer_id = $1', [general.transfer.id]);
    equal(Number(generalLink.rows[0].n), 0, 'D3 general card payment does not auto-link to Due');
    equal((await progress(dueB.id)).paid_so_far, '10000.0000', 'D4 general card payment does not change Due progress');
    await transferLifecycle(ctxA, 'finance_trash_transfer_v1', general.transfer.id, 'trash-general');
    equal((await progress(dueB.id)).paid_so_far, '10000.0000', 'D5 general transfer trash does not affect Due progress');
    await transferLifecycle(ctxA, 'finance_restore_transfer_v1', general.transfer.id, 'restore-general');
    assert(Number((await accountBalance(isoCard.id)).replace('.0000', '')) > -30000, 'D6 general overpayment lifecycle remains separate from Due');

    console.log('\nE - PAYMENTDUE INVARIANTS');
    const statuses = await queryDb("select count(*)::int n from public.finance_payment_dues where status = 'PARTIALLY_PAID'");
    equal(Number(statuses.rows[0].n), 0, 'E1 PARTIALLY_PAID absent');
    const invariantRows = await queryDb(`
      select d.id, d.status, p.remaining::numeric as remaining
      from public.finance_payment_dues d
      cross join lateral public.finance_payment_due_progress_v1(d.id) p
      where d.kind = 'CREDIT_CARD'
        and ((d.status = 'PAID' and p.remaining::numeric > 0) or (d.status = 'PENDING' and p.remaining::numeric = 0))
    `);
    equal(Number(invariantRows.rows.length), 0, 'E2 no PAID/PENDING progress contradiction');
    await expectReject('E3 amount lock after settlement', () => ctxA.client.rpc('finance_payment_due_edit_v1', { p_due_id: dueB.id, p_mutation_id: mid('edit-lock'), p_idempotency_key: idem('edit-lock'), p_payload_hash: hash({ edit: dueB.id }), p_created_by_person_id: ctxA.personId, p_title: null, p_expected_amount_known: true, p_expected_amount: '11000', p_due_date: null, p_category_id: null, p_clear_category: false }).then((r) => { if (r.error) throw r.error; }), 'finance_payment_due_settled_immutable');
    await expectReject('E4 cancel lock after settlement', () => ctxA.client.rpc('finance_payment_due_cancel_v1', { p_due_id: dueB.id, p_mutation_id: mid('cancel-lock'), p_idempotency_key: idem('cancel-lock'), p_payload_hash: hash({ cancel: dueB.id }), p_created_by_person_id: ctxA.personId }).then((r) => { if (r.error) throw r.error; }), 'finance_payment_due_settled_cannot_cancel');

    console.log('\nF - PRIVACY / RLS');
    await expectReject('F1 personal non-owner transfer trash', () => transferLifecycle(ctxB, 'finance_trash_transfer_v1', sA.transfer_id, 'non-owner-trash'), 'finance_transfer_owner_authority_forbidden');
    const directInsert = await ctxA.client.from('finance_payment_due_settlements').insert({ payment_due_id: dueB.id, transfer_id: general.transfer.id, created_by_person_id: ctxA.personId });
    assert(directInsert.error, 'F2 direct settlement-link mutation denied');
    const hhCtx = await createHouseholdContext(actorA, 'security');
    const hhCard = await createAccount(hhCtx, 'HH Card 8D7', '-1000', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const hhSource = await createAccount(hhCtx, 'HH Source 8D7', '1000', 'ARS');
    const hhDue = await createDue(hhCtx, { targetCreditCardAccountId: hhCard.id, amount: '1000' });
    const hhSettlement = await settle(hhCtx, hhDue.id, { sourceAccountId: hhSource.id, sourceAmount: '100' });
    await expectReject('F3 household non-member transfer trash', () => transferLifecycle(ctxB, 'finance_trash_transfer_v1', hhSettlement.transfer_id, 'hh-nonmember-trash'), 'finance_transfer_owner_authority_forbidden');

    console.log('\nG - CONCURRENCY');
    const concCard = await createAccount(ctxA, 'Concurrency Card', '-40000', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const concSource = await createAccount(ctxA, 'Concurrency Source', '100000', 'ARS');
    const concDue = await createDue(ctxA, { targetCreditCardAccountId: concCard.id, amount: '40000' });
    await settle(ctxA, concDue.id, { sourceAccountId: concSource.id, sourceAmount: '15000' });
    const concOld = await settle(ctxA, concDue.id, { sourceAccountId: concSource.id, sourceAmount: '25000' });
    await transferLifecycle(ctxA, 'finance_trash_transfer_v1', concOld.transfer_id, 'trash-conc-old');
    const race = await Promise.allSettled([
      transferLifecycle(ctxA, 'finance_restore_transfer_v1', concOld.transfer_id, 'race-restore'),
      settle(ctxA, concDue.id, { sourceAccountId: concSource.id, sourceAmount: '25000' }),
    ]);
    equal(race.filter((r) => r.status === 'fulfilled').length, 1, 'G1 concurrent restore vs settlement admits only one');
    equal((await progress(concDue.id)).paid_so_far, '40000.0000', 'G2 concurrent restore vs settlement cannot overpay Due');
    const floorRaceCard = await createAccount(ctxA, 'Floor Race Card', '-10000', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const floorRaceSource = await createAccount(ctxA, 'Floor Race Source', '10000', 'ARS');
    const floorRaceDue = await createDue(ctxA, { targetCreditCardAccountId: floorRaceCard.id, amount: '10000' });
    const floorRaceSettlement = await settle(ctxA, floorRaceDue.id, { sourceAccountId: floorRaceSource.id, sourceAmount: '10000' });
    await transferLifecycle(ctxA, 'finance_trash_transfer_v1', floorRaceSettlement.transfer_id, 'trash-floor-race');
    const floorRace = await Promise.allSettled([
      transferLifecycle(ctxA, 'finance_restore_transfer_v1', floorRaceSettlement.transfer_id, 'race-floor-restore'),
      createTransfer(ctxA, { sourceAccount: floorRaceSource.id, destinationAccount: floorRaceCard.id, amount: '10000', date: '2026-09-04', description: 'Race spend' }, { mutationId: mid('race-spend'), idempotencyKey: idem('race-spend'), requestId: null }),
    ]);
    equal(floorRace.filter((r) => r.status === 'fulfilled').length, 1, 'G3 concurrent account debit vs restore admits only one debit');
    equal(await accountBalance(floorRaceSource.id), '0.0000', 'G4 concurrent debit vs restore leaves ACCOUNT non-negative');
    const sameLifecycle = await Promise.allSettled([
      transferLifecycle(ctxA, 'finance_trash_transfer_v1', general.transfer.id, 'same-trash-1'),
      transferLifecycle(ctxA, 'finance_trash_transfer_v1', general.transfer.id, 'same-trash-2'),
    ]);
    equal(sameLifecycle.filter((r) => r.status === 'fulfilled').length, 2, 'G5 same lifecycle concurrent requests are idempotent');
    const effectCount = await queryDb('select count(*)::int n from public.finance_account_effects where transfer_id = $1', [general.transfer.id]);
    equal(Number(effectCount.rows[0].n), 2, 'G6 same lifecycle does not duplicate effects');

    console.log('\nH - A2 POST-DUE SOURCE CHANGE');
    const a2Card = await createAccount(ctxA, 'A2 Correction Card', '0', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const a2Expense = await createCardExpense(ctxA, a2Card.id, { amount: '10000', date: '2026-08-10', description: 'A2 original payable' });
    await ensureCardDues(ctxA, '2026-08-28');
    const a2Due = await dueForCardCycle(a2Card.id, '2026-08-28');
    fixture.dueIds.push(a2Due.id);
    equal(a2Due.expected_amount, '10000.0000', 'H1 original materialized Due amount 10000');
    const a2Corrected = await correctTransactionRpc(ctxA, a2Expense.id, { amount: '6000' }, 'a2-reduce');
    const a2AfterCorrection = await dueRow(a2Due.id);
    equal(a2AfterCorrection.id, a2Due.id, 'H2 source correction preserves Due identity');
    equal(a2AfterCorrection.expected_amount, '6000.0000', 'H3 unsettled Due reconciled to reduced payable');
    equal(a2AfterCorrection.status, 'PENDING', 'H4 reduced payable Due stays PENDING');
    const a2History = await queryDb('select old.status as old_status, new.status as new_status, new.corrected_from_transaction_id from public.finance_transactions old join public.finance_transactions new on new.id = $2 where old.id = $1', [a2Expense.id, a2Corrected.id]);
    equal(a2History.rows[0].old_status, 'SUPERSEDED', 'H5 correction history preserves old source');
    equal(a2History.rows[0].new_status, 'ACTIVE', 'H6 correction history creates active replacement');
    equal(a2History.rows[0].corrected_from_transaction_id, a2Expense.id, 'H7 correction chain preserved');

    const a2TrashCard = await createAccount(ctxA, 'A2 Trash Card', '0', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const a2TrashExpense = await createCardExpense(ctxA, a2TrashCard.id, { amount: '7000', date: '2026-08-10', description: 'A2 trash payable' });
    await ensureCardDues(ctxA, '2026-08-28');
    const a2TrashDue = await dueForCardCycle(a2TrashCard.id, '2026-08-28');
    fixture.dueIds.push(a2TrashDue.id);
    await transactionLifecycle(ctxA, 'finance_trash_transaction_v1', a2TrashExpense.id, 'a2-trash-zero');
    const a2AfterTrash = await dueRow(a2TrashDue.id);
    equal(a2AfterTrash.id, a2TrashDue.id, 'H8 source trash preserves Due identity');
    equal(a2AfterTrash.status, 'CANCELLED', 'H9 unsettled Due cancelled when payable becomes zero');
    const a2TrashDueCount = await queryDb("select count(*)::int n from public.finance_payment_dues where kind = 'CREDIT_CARD' and target_credit_card_account_id = $1 and cycle_close_date = '2026-08-28'", [a2TrashCard.id]);
    equal(Number(a2TrashDueCount.rows[0].n), 1, 'H10 no duplicate Due generated after zero reconciliation');
    const a2ZeroDueCount = await queryDb("select count(*)::int n from public.finance_payment_dues where kind = 'CREDIT_CARD' and target_credit_card_account_id = $1 and cycle_close_date = '2026-08-28' and expected_amount::numeric = 0", [a2TrashCard.id]);
    equal(Number(a2ZeroDueCount.rows[0].n), 0, 'H11 no zero Due generated');

    const a2SettledCard = await createAccount(ctxA, 'A2 Settled Card', '0', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const a2SettledSource = await createAccount(ctxA, 'A2 Settled Source', '50000', 'ARS');
    const a2SettledExpense = await createCardExpense(ctxA, a2SettledCard.id, { amount: '10000', date: '2026-08-10', description: 'A2 settled payable' });
    await ensureCardDues(ctxA, '2026-08-28');
    const a2SettledDue = await dueForCardCycle(a2SettledCard.id, '2026-08-28');
    fixture.dueIds.push(a2SettledDue.id);
    const a2SettledBefore = await dueRow(a2SettledDue.id);
    await settle(ctxA, a2SettledDue.id, { sourceAccountId: a2SettledSource.id, sourceAmount: '3000', actualDate: '2026-08-20' });
    await expectReject('H12 settled Due source correction', () => correctTransactionRpc(ctxA, a2SettledExpense.id, { amount: '8000' }, 'a2-settled-correct'), 'finance_payment_due_settled_immutable');
    const a2SettledAfterCorrectionReject = await dueRow(a2SettledDue.id);
    equal(a2SettledAfterCorrectionReject.expected_amount, a2SettledBefore.expected_amount, 'H13 settled Due amount unchanged after rejected correction');
    equal(a2SettledAfterCorrectionReject.due_date, a2SettledBefore.due_date, 'H14 settled Due date unchanged after rejected correction');
    await expectReject('H15 settled Due source trash', () => transactionLifecycle(ctxA, 'finance_trash_transaction_v1', a2SettledExpense.id, 'a2-settled-trash'), 'finance_payment_due_settled_immutable');
    const a2SettledAfterTrashReject = await dueRow(a2SettledDue.id);
    equal(a2SettledAfterTrashReject.expected_amount, a2SettledBefore.expected_amount, 'H16 settled Due amount unchanged after rejected trash');
    equal(a2SettledAfterTrashReject.due_date, a2SettledBefore.due_date, 'H17 settled Due date unchanged after rejected trash');
    const a2SettledLinks = await queryDb('select count(*)::int n from public.finance_payment_due_settlements where payment_due_id = $1', [a2SettledDue.id]);
    equal(Number(a2SettledLinks.rows[0].n), 1, 'H18 settlement link remains intact after rejected source changes');

    console.log('\nI - B1 INSTALLMENT DEEP CORRECTION');
    const b1Card = await createAccount(ctxA, 'B1 Installment Card', '0', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const b1OtherCard = await createAccount(ctxA, 'B1 Other Card', '0', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const b1Purchase = await createCardInstallmentPurchase(ctxA, { amount: '120000', currency: 'ARS', date: '2026-08-10', description: 'B1 cuotas', account: b1Card.id, installmentCount: 3 }, { mutationId: mid('b1-inst'), idempotencyKey: idem('b1-inst') });
    fixture.transactionIds.push(b1Purchase.transactionId);
    await ensureCardDues(ctxA, '2026-08-28');
    const b1Due = await dueForCardCycle(b1Card.id, '2026-08-28');
    fixture.dueIds.push(b1Due.id);
    const b1RowsBefore = await installmentRows(b1Purchase.rootTransactionId);
    const b1DueBefore = await dueRow(b1Due.id);
    const b1Meta = await correctTransactionRpc(ctxA, b1Purchase.transactionId, { description: 'B1 metadata corregida', notes: 'nota metadata' }, 'b1-meta');
    assert(b1Meta.id !== b1Purchase.transactionId, 'I1 non-structural correction creates safe replacement');
    equal(b1Meta.corrected_from_transaction_id, b1Purchase.transactionId, 'I2 non-structural correction preserves history chain');
    const b1RowsAfterMeta = await installmentRows(b1Purchase.rootTransactionId);
    equal(JSON.stringify(b1RowsAfterMeta.map((r) => r.row_id)), JSON.stringify(b1RowsBefore.map((r) => r.row_id)), 'I3 non-structural correction keeps same installment rows');
    equal(JSON.stringify(b1RowsAfterMeta.map((r) => [r.closing_day_snapshot, r.due_day_snapshot])), JSON.stringify(b1RowsBefore.map((r) => [r.closing_day_snapshot, r.due_day_snapshot])), 'I4 non-structural correction keeps snapshots');
    equal((await dueRow(b1Due.id)).expected_amount, b1DueBefore.expected_amount, 'I5 non-structural correction leaves Due amount unchanged');
    await expectReject('I6 installment amount correction', () => correctTransactionRpc(ctxA, b1Meta.id, { amount: '90000' }, 'b1-amount'), 'finance_installment_structural_correction_forbidden');
    await expectReject('I7 installment date correction', () => correctTransactionRpc(ctxA, b1Meta.id, { transactionDate: '2026-08-20' }, 'b1-date'), 'finance_installment_structural_correction_forbidden');
    await expectReject('I8 installment card/account correction', () => correctTransactionRpc(ctxA, b1Meta.id, { accountId: b1OtherCard.id }, 'b1-card'), 'finance_installment_structural_correction_forbidden');
    await expectReject('I9 installment account clear correction', () => correctTransactionRpc(ctxA, b1Meta.id, { clearAccount: true }, 'b1-clear-account'), 'finance_installment_structural_correction_forbidden');
    const b1PlanEdit = await ctxA.client.from('finance_credit_card_installment_plans').update({ installment_count: 4 }).eq('expense_root_transaction_id', b1Purchase.rootTransactionId);
    assert(!b1PlanEdit.error, 'I10 installment_count direct edit request is safely absorbed by RLS');
    const b1PlanAfterEdit = await queryDb('select installment_count::int c from public.finance_credit_card_installment_plans where expense_root_transaction_id = $1', [b1Purchase.rootTransactionId]);
    equal(Number(b1PlanAfterEdit.rows[0].c), 3, 'I10 installment_count persisted value unchanged');
    const b1RowsAfterRejects = await installmentRows(b1Purchase.rootTransactionId);
    equal(JSON.stringify(b1RowsAfterRejects.map((r) => r.row_id)), JSON.stringify(b1RowsBefore.map((r) => r.row_id)), 'I11 rejected structural corrections keep rows unchanged');
    equal(JSON.stringify(b1RowsAfterRejects.map((r) => [r.amount, r.cycle_close_date, r.cycle_due_date])), JSON.stringify(b1RowsBefore.map((r) => [r.amount, r.cycle_close_date, r.cycle_due_date])), 'I12 rejected structural corrections keep allocation and cycles unchanged');
    equal((await dueRow(b1Due.id)).expected_amount, b1DueBefore.expected_amount, 'I13 rejected structural corrections keep Dues unchanged');

    console.log('\nJ - C1 SETTLEMENT IMMUTABILITY');
    const c1Card = await createAccount(ctxA, 'C1 Settlement Card', '-10000', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const c1OtherCard = await createAccount(ctxA, 'C1 Other Card', '-10000', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const c1Source = await createAccount(ctxA, 'C1 Source', '50000', 'ARS');
    const c1OtherSource = await createAccount(ctxA, 'C1 Other Source', '50000', 'ARS');
    const c1Due = await createDue(ctxA, { targetCreditCardAccountId: c1Card.id, amount: '10000', title: 'C1 Due' });
    const c1Settlement = await settle(ctxA, c1Due.id, { sourceAccountId: c1Source.id, sourceAmount: '5000' });
    const c1TransferBefore = await queryDb('select source_account_id, destination_account_id, source_amount::text, destination_amount::text from public.finance_transfers where id = $1', [c1Settlement.transfer_id]);
    const c1EditSourceAmount = await ctxA.client.from('finance_transfers').update({ source_amount: '4000' }).eq('id', c1Settlement.transfer_id);
    assert(!c1EditSourceAmount.error, 'J1 settlement sourceAmount edit request is safely absorbed by RLS');
    equal((await queryDb('select source_amount::text v from public.finance_transfers where id = $1', [c1Settlement.transfer_id])).rows[0].v, c1TransferBefore.rows[0].source_amount, 'J1 settlement sourceAmount persisted value unchanged');
    const c1EditDestinationAmount = await ctxA.client.from('finance_transfers').update({ destination_amount: '4000' }).eq('id', c1Settlement.transfer_id);
    assert(!c1EditDestinationAmount.error, 'J2 settlement destinationAmount edit request is safely absorbed by RLS');
    equal((await queryDb('select destination_amount::text v from public.finance_transfers where id = $1', [c1Settlement.transfer_id])).rows[0].v, c1TransferBefore.rows[0].destination_amount, 'J2 settlement destinationAmount persisted value unchanged');
    const c1EditSourceAccount = await ctxA.client.from('finance_transfers').update({ source_account_id: c1OtherSource.id }).eq('id', c1Settlement.transfer_id);
    assert(!c1EditSourceAccount.error, 'J3 settlement source Account edit request is safely absorbed by RLS');
    equal((await queryDb('select source_account_id v from public.finance_transfers where id = $1', [c1Settlement.transfer_id])).rows[0].v, c1TransferBefore.rows[0].source_account_id, 'J3 settlement source Account persisted value unchanged');
    const c1EditDestinationCard = await ctxA.client.from('finance_transfers').update({ destination_account_id: c1OtherCard.id }).eq('id', c1Settlement.transfer_id);
    assert(!c1EditDestinationCard.error, 'J4 settlement destination Card edit request is safely absorbed by RLS');
    equal((await queryDb('select destination_account_id v from public.finance_transfers where id = $1', [c1Settlement.transfer_id])).rows[0].v, c1TransferBefore.rows[0].destination_account_id, 'J4 settlement destination Card persisted value unchanged');
    await transferLifecycle(ctxA, 'finance_trash_transfer_v1', c1Settlement.transfer_id, 'c1-trash');
    equal((await progress(c1Due.id)).paid_so_far, '0', 'J5 trash reverses settlement progress');
    await transferLifecycle(ctxA, 'finance_restore_transfer_v1', c1Settlement.transfer_id, 'c1-restore');
    equal((await progress(c1Due.id)).paid_so_far, '5000.0000', 'J6 restore reapplies settlement progress');
    await transferLifecycle(ctxA, 'finance_trash_transfer_v1', c1Settlement.transfer_id, 'c1-trash-real-reversal');
    const c1Replacement = await settle(ctxA, c1Due.id, { sourceAccountId: c1Source.id, sourceAmount: '5000' });
    assert(c1Replacement.transfer_id, 'J7 new canonical replacement settlement created');
    const c1OldLink = await queryDb('select count(*)::int n from public.finance_payment_due_settlements where transfer_id = $1 and payment_due_id = $2', [c1Settlement.transfer_id, c1Due.id]);
    equal(Number(c1OldLink.rows[0].n), 1, 'J8 old settlement link remains historical');
    const c1AllLinks = await queryDb('select count(*)::int n from public.finance_payment_due_settlements where payment_due_id = $1', [c1Due.id]);
    equal(Number(c1AllLinks.rows[0].n), 2, 'J9 replacement settlement does not delete old history');
  } finally {
    await cleanup();
  }

  console.log(`\nFINANCE_8D7_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) { process.exitCode = 1; console.error('FINANCE_STAGE_8D7_LIFECYCLE_INTERACTIONS_TESTS=FAIL'); }
  else console.log('FINANCE_STAGE_8D7_LIFECYCLE_INTERACTIONS_TESTS=PASS');
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_8D7_LIFECYCLE_INTERACTIONS_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
