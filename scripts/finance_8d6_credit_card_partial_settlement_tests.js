#!/usr/bin/env node
'use strict';

/** Finance V1.1 - Stage 8D.6 Partial Credit Card PaymentDue Settlement tests. */

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
function mid(label) { return `fin8d6-${label}-${crypto.randomBytes(8).toString('hex')}`; }
function idem(label) { return `idem8d6-${label}-${crypto.randomBytes(8).toString('hex')}`; }
function hash(payload) { return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'); }

async function queryDb(sql, params = []) {
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, statement_timeout: 30000 });
  await client.connect();
  try { return await client.query(sql, params); } finally { await client.end(); }
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin8d6-${label}-${suffix}@example.test`;
  const password = `Fin8D6_${crypto.randomBytes(18).toString('base64url')}!9a`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.message}`);
  fixture.authUserIds.push(data.user.id);
  const { data: person, error: personError } = await admin.from('people').insert({ auth_user_id: data.user.id, display_name: `Fin 8D6 ${label}`, default_language: 'es-419', personal_settings: {} }).select('*').single();
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

async function createAccount(ctx, name, amount, currency = 'ARS', accountType = FINANCE_ACCOUNT_TYPES.ACCOUNT) {
  const initialBalance = amount === null ? undefined : { amount, effectiveDate: '2026-01-01' };
  const timing = accountType === FINANCE_ACCOUNT_TYPES.CREDIT_CARD ? { closingDay: 28, dueDay: 8 } : {};
  const res = await createFinanceAccount(ctx, { name, currency, accountType, initialBalance, ...timing });
  fixture.accountIds.push(res.account.id);
  return res.account;
}

async function createDue(ctx, body) {
  const payload = {
    kind: body.kind ?? 'CREDIT_CARD',
    title: body.title ?? 'Due 8D6',
    currency: body.currency ?? 'ARS',
    amount: body.amount ?? null,
    dueDate: body.dueDate ?? '2026-09-10',
    targetCard: body.targetCreditCardAccountId ?? null,
    contextType: ctx.contextType,
  };
  const { data, error } = await ctx.client.rpc('finance_payment_due_create_oneoff_v1', {
    p_mutation_id: mid('due'),
    p_idempotency_key: idem('due'),
    p_payload_hash: hash(payload),
    p_created_by_person_id: ctx.personId,
    p_kind: payload.kind,
    p_title: payload.title,
    p_currency: payload.currency,
    p_expected_amount_known: body.expectedAmountKnown ?? true,
    p_expected_amount: payload.amount,
    p_due_date: payload.dueDate,
    p_category_id: null,
    p_target_credit_card_account_id: payload.targetCard,
    p_financial_context_type: ctx.contextType,
    p_owner_person_id: ctx.contextType === FINANCE_CONTEXT_TYPES.PERSONAL ? ctx.personId : null,
    p_household_id: ctx.contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD ? ctx.householdId : null,
  });
  if (error) throw error;
  fixture.dueIds.push(data.id);
  return data;
}

async function settle(ctx, dueId, body, identity = {}) {
  const mutationId = identity.mutationId ?? mid('settle');
  const idempotencyKey = identity.idempotencyKey ?? idem('settle');
  const payloadHash = identity.payloadHash ?? hash({ dueId, ...body, mutationId });
  const { data, error } = await ctx.client.rpc('finance_payment_settle_credit_card_due_v1', {
    p_due_id: dueId,
    p_mutation_id: mutationId,
    p_idempotency_key: idempotencyKey,
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

async function progress(dueId) {
  const r = await queryDb('select paid_so_far::text, remaining::text, is_partially_paid from public.finance_payment_due_progress_v1($1)', [dueId]);
  return r.rows[0];
}

async function dueRow(dueId) {
  const r = await queryDb('select id, status, expected_amount::text, actual_amount::text, transfer_id from public.finance_payment_dues where id = $1', [dueId]);
  return r.rows[0];
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

async function expectReject(label, fn, code) {
  try {
    await fn();
    assert(false, `${label} rejected`);
  } catch (error) {
    assert(String(error.message ?? '').includes(code) || error.code === code || error.code === '23514' || error.code === '42501' || error.code === 'P0008', `${label} rejected (${code})`);
  }
}

async function createHouseholdContext(actor) {
  const ctx = await financeContext(actor);
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const { data: household, error } = await admin.from('households').insert({ name: `HH 8D6 ${suffix}`, slug: `hh-8d6-${suffix}`, created_by_person_id: ctx.personId }).select('*').single();
  if (error) throw error;
  fixture.householdIds.push(household.id);
  await queryDb("insert into public.household_members (household_id, person_id, role, status, joined_at) values ($1, $2, 'coordinator', 'active', now())", [household.id, ctx.personId]);
  await queryDb('update public.people set active_household_id = $1 where id = $2', [household.id, ctx.personId]);
  return financeContext(actor, FINANCE_CONTEXT_TYPES.HOUSEHOLD);
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
  if (fixture.personIds.length) await admin.from('people').update({ active_household_id: null }).in('id', fixture.personIds);
  if (fixture.householdIds.length) await queryDb('delete from public.household_members where household_id = any($1::uuid[])', [fixture.householdIds]).catch(() => {});
  if (fixture.householdIds.length) await queryDb('delete from public.households where id = any($1::uuid[])', [fixture.householdIds]).catch(() => {});
  if (fixture.personIds.length) {
    try { await admin.from('people').delete().in('id', fixture.personIds); } catch {}
  }
  for (const id of fixture.authUserIds) await admin.auth.admin.deleteUser(id).catch(() => {});
}

async function main() {
  console.log('FINANCE_8D6_LOCAL_SUPABASE_MODE=CONNECT');
  await queryDb(fs.readFileSync(path.join(root, 'supabase/migrations/20260907000004_finance_credit_card_partial_settlement_v1_1.sql'), 'utf8'));

  const actorA = await createAuthUser('A');
  const actorB = await createAuthUser('B');
  const ctxA = await financeContext(actorA);
  const ctxB = await financeContext(actorB);

  try {
    console.log('\nA - BASIC PARTIAL');
    const card = await createAccount(ctxA, 'Visa 8D6', '-40000', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const source = await createAccount(ctxA, 'Cuenta 8D6', '100000', 'ARS');
    const due = await createDue(ctxA, { targetCreditCardAccountId: card.id, amount: '40000' });
    const s1 = await settle(ctxA, due.id, { sourceAccountId: source.id, sourceAmount: '10000' });
    equal(s1.paid_so_far, '10000.0000', 'A1 paidSoFar 10000');
    equal(s1.remaining, '30000.0000', 'A1 remaining 30000');
    equal((await dueRow(due.id)).status, 'PENDING', 'A1 status PENDING');
    const s2 = await settle(ctxA, due.id, { sourceAccountId: source.id, sourceAmount: '15000' });
    equal(s2.paid_so_far, '25000.0000', 'A2 paidSoFar 25000');
    equal(s2.remaining, '15000.0000', 'A2 remaining 15000');
    equal((await dueRow(due.id)).status, 'PENDING', 'A2 status PENDING');
    const s3 = await settle(ctxA, due.id, { sourceAccountId: source.id, sourceAmount: '15000' });
    equal(s3.paid_so_far, '40000.0000', 'A3 paidSoFar 40000');
    equal(s3.remaining, '0.0000', 'A3 remaining 0');
    equal((await dueRow(due.id)).status, 'PAID', 'A3 status PAID');

    console.log('\nB - BOUNDS');
    const boundsCard = await createAccount(ctxA, 'Bounds Card', '-40000', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const boundsSource = await createAccount(ctxA, 'Bounds Source', '100000', 'ARS');
    const zeroDue = await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '40000' });
    await expectReject('B4 zero', () => settle(ctxA, zeroDue.id, { sourceAccountId: boundsSource.id, sourceAmount: '0' }), 'invalid_finance_payment_actual_amount');
    const dueB = await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '40000' });
    await expectReject('B5 negative', () => settle(ctxA, dueB.id, { sourceAccountId: boundsSource.id, sourceAmount: '-1' }), 'invalid_finance_payment_actual_amount');
    await expectReject('B7 greater than remaining', () => settle(ctxA, dueB.id, { sourceAccountId: boundsSource.id, sourceAmount: '40000.0001' }), 'finance_payment_settlement_exceeds_remaining');
    await expectReject('B8 precision edge exact', () => settle(ctxA, dueB.id, { sourceAccountId: boundsSource.id, sourceAmount: '40000.0001' }), 'finance_payment_settlement_exceeds_remaining');
    const exact = await settle(ctxA, dueB.id, { sourceAccountId: boundsSource.id, sourceAmount: '40000' });
    equal(exact.remaining, '0.0000', 'B6 exact remaining allowed');

    console.log('\nC - TRANSFER TRUTH');
    const transferRows = await queryDb('select * from public.finance_transfers where id = $1', [s1.transfer_id]);
    equal(transferRows.rows.length, 1, 'C9 one partial creates one Transfer');
    const effects = await queryDb('select account_id, effect_role, effect_amount::text from public.finance_account_effects where transfer_id = $1 order by effect_role', [s1.transfer_id]);
    assert(effects.rows.some((e) => e.account_id === source.id && e.effect_role === 'TRANSFER_SOURCE' && e.effect_amount === '-10000.0000'), 'C10 source ACCOUNT effect negative');
    assert(effects.rows.some((e) => e.account_id === card.id && e.effect_role === 'TRANSFER_DESTINATION' && e.effect_amount === '10000.0000'), 'C11 destination CREDIT_CARD effect positive');
    const expenseCount = await queryDb("select count(*)::int n from public.finance_transactions where transaction_type = 'expense' and description = 'Due 8D6'");
    equal(Number(expenseCount.rows[0].n), 0, 'C12 no Expense created');
    equal(await accountBalance(card.id), '0.0000', 'C13 card debt decreased by destination amount');

    console.log('\nD - SOURCE');
    const srcCardDue = await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '1000' });
    await expectReject('D14 card source', () => settle(ctxA, srcCardDue.id, { sourceAccountId: boundsCard.id, sourceAmount: '1000' }), 'finance_payment_invalid_source_account');
    const unknown = await createAccount(ctxA, 'Unknown Source', null, 'ARS');
    const unknownDue = await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '1000' });
    await expectReject('D15 UNKNOWN source', () => settle(ctxA, unknownDue.id, { sourceAccountId: unknown.id, sourceAmount: '1000' }), 'finance_payment_invalid_source_account');
    const negAccountId = crypto.randomUUID();
    await queryDb("insert into public.finance_accounts (id, financial_context_type, owner_person_id, household_id, name, currency, account_type, balance_state, status, created_by_person_id, updated_by_person_id) values ($1, 'personal', $2, null, 'Legacy Negative', 'ARS', 'ACCOUNT', 'KNOWN', 'ACTIVE', $2, $2)", [negAccountId, ctxA.personId]);
    await queryDb("insert into public.finance_account_balance_anchors (account_id, amount, currency, effective_date, anchor_kind, created_by_person_id) values ($1, -100, 'ARS', '2026-01-01', 'INITIAL', $2)", [negAccountId, ctxA.personId]);
    fixture.accountIds.push(negAccountId);
    const negDue = await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '10' });
    await expectReject('D16 negative source', () => settle(ctxA, negDue.id, { sourceAccountId: negAccountId, sourceAmount: '10' }), 'finance_account_insufficient_funds');
    const archived = await createAccount(ctxA, 'Archived Source', '1000', 'ARS');
    await queryDb("update public.finance_accounts set status = 'ARCHIVED', archived_at = now() where id = $1", [archived.id]);
    const archivedDue = await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '10' });
    await expectReject('D17 archived source', () => settle(ctxA, archivedDue.id, { sourceAccountId: archived.id, sourceAmount: '10' }), 'finance_payment_invalid_source_account');
    const low = await createAccount(ctxA, 'Low Funds', '5', 'ARS');
    const lowDue = await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '10' });
    await expectReject('D18 insufficient funds', () => settle(ctxA, lowDue.id, { sourceAccountId: low.id, sourceAmount: '10' }), 'finance_account_insufficient_funds');
    const exactSource = await createAccount(ctxA, 'Exact Funds', '10000', 'ARS');
    const exactDue = await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '10000' });
    await settle(ctxA, exactDue.id, { sourceAccountId: exactSource.id, sourceAmount: '10000' });
    equal(await accountBalance(exactSource.id), '0.0000', 'D19 exact source balance allowed');

    console.log('\nE - CROSS CURRENCY');
    const usdCard = await createAccount(ctxA, 'USD Card', '-100', 'USD', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const arsSource = await createAccount(ctxA, 'ARS Source', '45000', 'ARS');
    const usdDue = await createDue(ctxA, { targetCreditCardAccountId: usdCard.id, amount: '100', currency: 'USD' });
    const cross = await settle(ctxA, usdDue.id, { sourceAccountId: arsSource.id, sourceAmount: '45000', destinationAmount: '40' });
    equal(cross.source_currency, 'ARS', 'E21 cross source currency ARS');
    equal(cross.destination_currency, 'USD', 'E21 cross destination currency USD');
    equal((await progress(usdDue.id)).paid_so_far, '40.0000', 'E22 destination amount drives paidSoFar');
    equal((await progress(usdDue.id)).remaining, '60.0000', 'E22 destination amount drives remaining');
    const noFxDue = await createDue(ctxA, { targetCreditCardAccountId: usdCard.id, amount: '10', currency: 'USD' });
    await expectReject('E23 no inferred FX', () => settle(ctxA, noFxDue.id, { sourceAccountId: arsSource.id, sourceAmount: '1000' }), 'invalid_finance_transfer_destination_amount');

    console.log('\nF - IDEMPOTENCY');
    const idemDue = await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '10000' });
    const mutationId = mid('idem');
    const idempotencyKey = idem('idem');
    const payloadHash = hash({ dueId: idemDue.id, source: boundsSource.id, sourceAmount: '3000' });
    const r1 = await settle(ctxA, idemDue.id, { sourceAccountId: boundsSource.id, sourceAmount: '3000' }, { mutationId, idempotencyKey, payloadHash });
    const r2 = await settle(ctxA, idemDue.id, { sourceAccountId: boundsSource.id, sourceAmount: '3000' }, { mutationId, idempotencyKey, payloadHash });
    equal(r2.transfer_id, r1.transfer_id, 'F24 retry returns same Transfer');
    equal(r2.settlement_id, r1.settlement_id, 'F24 retry returns same settlement link');
    const idemCount = await queryDb('select count(*)::int n from public.finance_payment_due_settlements where payment_due_id = $1', [idemDue.id]);
    equal(Number(idemCount.rows[0].n), 1, 'F24 no duplicate settlements');
    await expectReject('F25 same mutation different amount', () => settle(ctxA, idemDue.id, { sourceAccountId: boundsSource.id, sourceAmount: '4000' }, { mutationId, idempotencyKey, payloadHash: hash({ conflict: 'amount' }) }), 'P0008');
    await expectReject('F26 same mutation different source', () => settle(ctxA, idemDue.id, { sourceAccountId: source.id, sourceAmount: '3000' }, { mutationId, idempotencyKey, payloadHash: hash({ conflict: 'source' }) }), 'P0008');
    await expectReject('F27 same mutation different destination', () => settle(ctxA, usdDue.id, { sourceAccountId: arsSource.id, sourceAmount: '1', destinationAmount: '1' }, { mutationId, idempotencyKey, payloadHash: hash({ conflict: 'dest' }) }), 'P0008');

    console.log('\nG - CONCURRENCY');
    const concSource = await createAccount(ctxA, 'Concurrent Source', '100000', 'ARS');
    const concDue = await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '40000' });
    const concurrent = await Promise.allSettled([
      settle(ctxA, concDue.id, { sourceAccountId: concSource.id, sourceAmount: '25000' }),
      settle(ctxA, concDue.id, { sourceAccountId: concSource.id, sourceAmount: '25000' }),
    ]);
    equal(concurrent.filter((r) => r.status === 'fulfilled').length, 1, 'G28 only one concurrent 25000 accepted');
    equal((await progress(concDue.id)).paid_so_far, '25000.0000', 'G28 concurrent final paidSoFar not 50000');

    console.log('\nH - EDIT / CANCEL');
    const editableDue = await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '1000' });
    const editOk = await ctxA.client.rpc('finance_payment_due_edit_v1', { p_due_id: editableDue.id, p_mutation_id: mid('edit'), p_idempotency_key: idem('edit'), p_payload_hash: hash({ edit: 1 }), p_created_by_person_id: ctxA.personId, p_title: 'Edit OK', p_expected_amount_known: true, p_expected_amount: '1200', p_due_date: '2026-09-11', p_category_id: null, p_clear_category: false });
    assert(!editOk.error, 'H29 Due editable before settlement');
    const editLockDue = await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '5000' });
    await settle(ctxA, editLockDue.id, { sourceAccountId: boundsSource.id, sourceAmount: '1000' });
    await expectReject('H30 amount edit after partial', () => ctxA.client.rpc('finance_payment_due_edit_v1', { p_due_id: editLockDue.id, p_mutation_id: mid('edit2'), p_idempotency_key: idem('edit2'), p_payload_hash: hash({ edit: 2 }), p_created_by_person_id: ctxA.personId, p_title: null, p_expected_amount_known: true, p_expected_amount: '6000', p_due_date: null, p_category_id: null, p_clear_category: false }).then((r) => { if (r.error) throw r.error; }), 'finance_payment_due_settled_immutable');
    await expectReject('H31 date edit after partial', () => ctxA.client.rpc('finance_payment_due_edit_v1', { p_due_id: editLockDue.id, p_mutation_id: mid('edit3'), p_idempotency_key: idem('edit3'), p_payload_hash: hash({ edit: 3 }), p_created_by_person_id: ctxA.personId, p_title: null, p_expected_amount_known: null, p_expected_amount: null, p_due_date: '2026-09-12', p_category_id: null, p_clear_category: false }).then((r) => { if (r.error) throw r.error; }), 'finance_payment_due_settled_immutable');
    const cancelDue = await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '1000' });
    const cancelOk = await ctxA.client.rpc('finance_payment_due_cancel_v1', { p_due_id: cancelDue.id, p_mutation_id: mid('cancel'), p_idempotency_key: idem('cancel'), p_payload_hash: hash({ cancel: 1 }), p_created_by_person_id: ctxA.personId });
    assert(!cancelOk.error, 'H32 cancel before settlement preserves current contract');
    await expectReject('H33 cancel after partial', () => ctxA.client.rpc('finance_payment_due_cancel_v1', { p_due_id: editLockDue.id, p_mutation_id: mid('cancel2'), p_idempotency_key: idem('cancel2'), p_payload_hash: hash({ cancel: 2 }), p_created_by_person_id: ctxA.personId }).then((r) => { if (r.error) throw r.error; }), 'finance_payment_due_settled_cannot_cancel');

    console.log('\nI - MULTIPLE DUES');
    const dueA = await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '10000', title: 'Due A' });
    const dueB2 = await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '10000', title: 'Due B' });
    await settle(ctxA, dueA.id, { sourceAccountId: boundsSource.id, sourceAmount: '3000' });
    equal((await progress(dueA.id)).paid_so_far, '3000.0000', 'I34 Due A paidSoFar incremented');
    equal((await progress(dueB2.id)).paid_so_far, '0', 'I34 Due B unchanged');
    equal(dueA.id === dueB2.id, false, 'I35 no automatic due merge');

    console.log('\nJ - REGRESSION');
    const effectsBeforeDue = await queryDb('select count(*)::int n from public.finance_account_effects where account_id = $1', [boundsCard.id]);
    await createDue(ctxA, { targetCreditCardAccountId: boundsCard.id, amount: '777' });
    const effectsAfterDue = await queryDb('select count(*)::int n from public.finance_account_effects where account_id = $1', [boundsCard.id]);
    equal(effectsAfterDue.rows[0].n, effectsBeforeDue.rows[0].n, 'J36 PaymentDue creation has no account effect');
    const overCard = await createAccount(ctxA, 'Overpay Card', '-30000', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const overSource = await createAccount(ctxA, 'Overpay Source', '50000', 'ARS');
    await createTransfer(ctxA, { sourceAccount: overSource.id, destinationAccount: overCard.id, amount: '40000', date: '2026-09-01', description: 'General overpay' }, { mutationId: mid('general'), idempotencyKey: idem('general'), requestId: null });
    equal(await accountBalance(overCard.id), '10000.0000', 'J37/J38 general direct card overpayment still saldo a favor');
    const normalDue = await createDue(ctxA, { kind: 'NORMAL', targetCreditCardAccountId: null, amount: '1000' });
    await expectReject('J39 normal due not partial-settleable', () => settle(ctxA, normalDue.id, { sourceAccountId: boundsSource.id, sourceAmount: '500' }), 'finance_payment_kind_mismatch');
    const idemEnsure1 = await ctxA.client.rpc('finance_ensure_closed_credit_card_payment_dues_v1', { p_as_of_date: '2026-09-30' });
    const idemEnsure2 = await ctxA.client.rpc('finance_ensure_closed_credit_card_payment_dues_v1', { p_as_of_date: '2026-09-30' });
    assert(!idemEnsure1.error && !idemEnsure2.error, 'J40 8D.5 catch-up remains callable/idempotent');
    const purchase = await createCardInstallmentPurchase(ctxA, { amount: '12000', currency: 'ARS', date: '2026-08-10', description: 'Cuotas 8D6', account: overCard.id, installmentCount: 3 }, { mutationId: mid('inst'), idempotencyKey: idem('inst') });
    fixture.transactionIds.push(purchase.transactionId);
    const txCount = await queryDb('select count(*)::int n from public.finance_transactions where root_transaction_id = $1', [purchase.transactionId]);
    equal(Number(txCount.rows[0].n), 1, 'J42 8D.4 installment remains one movement');
    await expectReject('J43 8C floor remains green', () => createTransfer(ctxA, { sourceAccount: overSource.id, destinationAccount: overCard.id, amount: '999999', date: '2026-09-01', description: 'Floor fail' }, { mutationId: mid('floor'), idempotencyKey: idem('floor'), requestId: null }), 'finance_account_insufficient_funds');

    console.log('\nK - PRIVACY / RLS');
    const readAsB = await ctxB.client.from('finance_payment_due_settlements').select('*').eq('payment_due_id', dueA.id);
    equal((readAsB.data ?? []).length, 0, 'K44 personal ownership enforced on settlement read');
    await expectReject('K46 unauthorized create settlement', () => settle(ctxB, dueA.id, { sourceAccountId: boundsSource.id, sourceAmount: '1' }), 'finance_payment_owner_authority_forbidden');
    const hhCtx = await createHouseholdContext(actorA);
    const hhCard = await createAccount(hhCtx, 'HH Card', '-1000', 'ARS', FINANCE_ACCOUNT_TYPES.CREDIT_CARD);
    const hhSource = await createAccount(hhCtx, 'HH Source', '1000', 'ARS');
    const hhDue = await createDue(hhCtx, { targetCreditCardAccountId: hhCard.id, amount: '1000' });
    const hhSettlement = await settle(hhCtx, hhDue.id, { sourceAccountId: hhSource.id, sourceAmount: '100' });
    assert(hhSettlement.settlement_id, 'K45 household member can create settlement');
    const hhReadAsB = await ctxB.client.from('finance_payment_due_settlements').select('*').eq('payment_due_id', hhDue.id);
    equal((hhReadAsB.data ?? []).length, 0, 'K45 non-member cannot read household settlement');
  } finally {
    await cleanup();
  }

  console.log(`\nFINANCE_8D6_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) { process.exitCode = 1; console.error('FINANCE_STAGE_8D6_PARTIAL_CARD_SETTLEMENT_TESTS=FAIL'); }
  else console.log('FINANCE_STAGE_8D6_PARTIAL_CARD_SETTLEMENT_TESTS=PASS');
}

main().catch(async (error) => {
  console.error('FINANCE_STAGE_8D6_PARTIAL_CARD_SETTLEMENT_TESTS=ERROR');
  console.error(error);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
