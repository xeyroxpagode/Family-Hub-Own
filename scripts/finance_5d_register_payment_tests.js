#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 Stage 5D - Register Payment / Settlement Tests.
 *
 * Tests the canonical Registrar pago mutation:
 *   NORMAL Payment Due -> Expense
 *   CREDIT_CARD Payment Due -> Transfer
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('../backend/node_modules/dotenv');
const { createClient } = require('../backend/node_modules/@supabase/supabase-js');

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

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:55321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase keys. Set SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PAYMENT_KINDS = { NORMAL: 'NORMAL', CREDIT_CARD: 'CREDIT_CARD' };
const FINANCE_CONTEXT_TYPES = { PERSONAL: 'personal', HOUSEHOLD: 'household' };
const FINANCE_ACCOUNT_TYPES = { ACCOUNT: 'ACCOUNT', CREDIT_CARD: 'CREDIT_CARD' };

let passCount = 0;
let failCount = 0;

function pass(message) {
  passCount += 1;
  console.log(`  PASS: ${message}`);
}

function assert(condition, message) {
  if (condition) return pass(message);
  failCount += 1;
  console.error(`  FAIL: ${message}`);
}

function equal(actual, expected, message) {
  assert(actual === expected, `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

function uuid() {
  return crypto.randomUUID();
}

function mutationId(label) {
  return `finance-5d-${label}-${uuid()}`;
}

function idempotencyKey(label) {
  return `idem-5d-${label}-${uuid()}`;
}

function payloadHash(label) {
  return crypto.createHash('sha256').update(`${label}:${uuid()}`).digest('hex');
}

function decimal4(value) {
  if (value === null || value === undefined) return value;
  return Number(value).toFixed(4);
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateOnly(date);
}

async function createAuthUser(label) {
  const suffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const email = `fin5d-${label}-${suffix}@example.test`;
  const password = `Fin5D_${label}_${crypto.randomBytes(12).toString('base64url')}!9a`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const authUserId = data.user.id;

  const { data: people } = await admin.from('people').insert({
    auth_user_id: authUserId,
    display_name: `Fin5D ${label}`,
    default_language: 'es-419',
    personal_settings: {},
  }).select('*').single();

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await client.auth.signInWithPassword({ email, password });

  return {
    authUserId,
    personId: people.id,
    client,
    email,
    password,
  };
}

async function createHousehold(creator, name) {
  const { data: household } = await creator.client.from('households').insert({
    name,
    created_by_person_id: creator.personId,
  }).select('*').single();

  await creator.client.from('household_members').insert({
    household_id: household.id,
    person_id: creator.personId,
    role: 'COORDINATOR',
  });

  return household;
}

async function setActiveHousehold(personId, householdId) {
  await admin.from('people').update({ active_household_id: householdId }).eq('id', personId);
}

async function getCategory(personId, type = 'expense') {
  const { data } = await admin.from('finance_categories')
    .select('*')
    .eq('category_kind', 'native')
    .eq('category_type', type)
    .is('deleted_at', null)
    .order('sort_order')
    .limit(1);
  return data?.[0];
}

async function createAccount(person, body) {
  const contextType = body.contextType ?? 'personal';
  const { data, error } = await person.client.rpc('finance_create_account_v1', {
    p_financial_context_type: contextType,
    p_owner_person_id: contextType === 'personal' ? person.personId : null,
    p_household_id: contextType === 'household' ? body.householdId : null,
    p_name: body.name,
    p_currency: body.currency ?? 'ARS',
    p_account_type: body.accountType ?? 'ACCOUNT',
    p_created_by_person_id: person.personId,
    p_initial_anchor_amount: body.initialAmount ?? '100000',
    p_initial_anchor_effective_date: body.initialDate ?? '2026-08-01',
  });
  if (error) throw error;
  return data;
}

async function createOneOffPaymentDue(person, body) {
  const contextType = body.contextType ?? 'personal';
  const { data, error } = await person.client.rpc('finance_payment_due_create_oneoff_v1', {
    p_mutation_id: body.mutationId ?? mutationId('due'),
    p_idempotency_key: body.idempotencyKey ?? idempotencyKey('due'),
    p_payload_hash: body.payloadHash ?? payloadHash('due'),
    p_created_by_person_id: person.personId,
    p_kind: body.kind,
    p_title: body.title,
    p_currency: body.currency ?? 'ARS',
    p_expected_amount_known: body.expectedAmountKnown ?? false,
    p_expected_amount: body.expectedAmount ?? null,
    p_due_date: body.dueDate ?? '2026-09-10',
    p_category_id: body.categoryId ?? null,
    p_target_credit_card_account_id: body.targetCreditCardAccountId ?? null,
    p_financial_context_type: contextType,
    p_owner_person_id: contextType === 'personal' ? person.personId : null,
    p_household_id: contextType === 'household' ? body.householdId : null,
  });
  if (error) throw error;
  return data;
}

async function createPaymentSeries(person, body) {
  const contextType = body.contextType ?? 'personal';
  const { data, error } = await person.client.rpc('finance_payment_series_create_v1', {
    p_mutation_id: body.mutationId ?? mutationId('series'),
    p_idempotency_key: body.idempotencyKey ?? idempotencyKey('series'),
    p_payload_hash: body.payloadHash ?? payloadHash('series'),
    p_created_by_person_id: person.personId,
    p_kind: body.kind,
    p_title: body.title,
    p_currency: body.currency ?? 'ARS',
    p_default_expected_amount_known: body.defaultExpectedAmountKnown ?? false,
    p_default_expected_amount: body.defaultExpectedAmount ?? null,
    p_default_category_id: body.defaultCategoryId ?? null,
    p_target_credit_card_account_id: body.targetCreditCardAccountId ?? null,
    p_recurrence_interval_unit: body.recurrenceIntervalUnit ?? 'MONTH',
    p_recurrence_interval_count: body.recurrenceIntervalCount ?? 1,
    p_recurrence_anchor_date: body.recurrenceAnchorDate ?? '2026-09-10',
    p_financial_context_type: contextType,
    p_owner_person_id: contextType === 'personal' ? person.personId : null,
    p_household_id: contextType === 'household' ? body.householdId : null,
  });
  if (error) throw error;
  return data;
}

async function registerPayment(person, dueId, body) {
  const params = {
    p_due_id: dueId,
    p_mutation_id: body.mutationId ?? mutationId('register'),
    p_idempotency_key: body.idempotencyKey ?? idempotencyKey('register'),
    p_payload_hash: body.payloadHash ?? payloadHash('register'),
    p_created_by_person_id: person.personId,
    p_actual_amount: body.actualAmount ?? body.actual_amount,
    p_actual_date: body.actualDate ?? body.actual_date,
  };

  const { data, error } = body.kind === PAYMENT_KINDS.CREDIT_CARD
    ? await person.client.rpc('finance_payment_register_credit_card_v1', {
      ...params,
      p_source_account_id: body.sourceAccountId ?? body.source_account_id ?? null,
      p_destination_amount: body.destinationAmount ?? body.destination_amount ?? null,
    })
    : await person.client.rpc('finance_payment_register_normal_v1', {
      ...params,
      p_actual_category_id: body.actualCategoryId ?? body.actual_category_id ?? null,
      p_actual_account_id: body.actualAccountId ?? body.actual_account_id ?? null,
    });
  if (error) throw error;
  return paymentDueToDto(data);
}

function paymentDueToDto(row) {
  if (!row) return row;
  return {
    ...row,
    paymentSeriesId: row.payment_series_id ?? null,
    expectedAmountKnown: row.expected_amount_known,
    expectedAmount: row.expected_amount == null ? null : String(row.expected_amount).replace(/\.0000$/, ''),
    dueDate: row.due_date ?? null,
    targetCreditCardAccountId: row.target_credit_card_account_id ?? null,
    actualAmount: row.actual_amount == null ? null : String(row.actual_amount).replace(/\.0000$/, ''),
    actualDate: row.actual_date ?? null,
    paidAt: row.paid_at ?? null,
    actualCategoryId: row.actual_category_id ?? null,
    actualAccountId: row.actual_account_id ?? null,
    expenseRootTransactionId: row.expense_root_transaction_id ?? null,
    transferId: row.transfer_id ?? null,
  };
}

async function getPaymentDueDetail(adminClient, person, dueId) {
  const { data, error } = await adminClient
    .from('finance_payment_dues')
    .select(`
      *,
      finance_categories!category_id (id, label, category_type),
      finance_payment_series!payment_series_id (
        id, title, kind, currency,
        default_expected_amount_known, default_expected_amount,
        default_category_id, target_credit_card_account_id,
        recurrence_interval_unit, recurrence_interval_count, recurrence_anchor_date, status
      ),
      target_credit_card:finance_accounts!target_credit_card_account_id (id, name, currency, account_type)
    `)
    .eq('id', dueId)
    .single();
  if (error) throw error;
  data.expected_amount = decimal4(data.expected_amount);
  data.actual_amount = decimal4(data.actual_amount);
  return data;
}

async function getExpenseDetail(adminClient, expenseId) {
  const { data, error } = await adminClient
    .from('finance_transactions')
    .select('*, finance_account_effects(account_id, effect_type, effect_role, effect_amount, finance_accounts(id, name, currency))')
    .eq('id', expenseId)
    .single();
  if (error) throw error;
  data.amount = decimal4(data.amount);
  return data;
}

async function getTransferDetail(adminClient, transferId) {
  const { data, error } = await adminClient
    .from('finance_transfers')
    .select('*, finance_account_effects(account_id, effect_type, effect_role, effect_amount, finance_accounts(id, name, currency))')
    .eq('id', transferId)
    .single();
  if (error) throw error;
  data.source_amount = decimal4(data.source_amount);
  data.destination_amount = decimal4(data.destination_amount);
  return data;
}

async function main() {
  console.log('\n=== SETUP ===');
  const personalA = await createAuthUser('A');
  const personalB = await createAuthUser('B');

  const category = await getCategory(personalA.personId, 'expense');
  const financialCostsCategory = await getCategory(personalA.personId, 'expense');
  const today = dateOnly(new Date());
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const futureDueDate = addDays(today, 15);
  const pastDueDate = addDays(today, -5);

  const accountA = await createAccount(personalA, { name: 'Cuenta A', initialAmount: '500000' });
  const accountB = await createAccount(personalA, { name: 'Cuenta B', initialAmount: '200000' });

  const cardA = await createAccount(personalA, { name: 'Visa', accountType: 'CREDIT_CARD', initialAmount: '-100000' });

  console.log('\n=== NORMAL PAYMENT - KNOWN AMOUNT ===');
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Internet',
      expectedAmountKnown: true,
      expectedAmount: '25000',
      dueDate: futureDueDate,
      categoryId: category.id,
    });
    const registered = await registerPayment(personalA, due.id, {
      kind: PAYMENT_KINDS.NORMAL,
      actualAmount: '26450',
      actualDate: today,
      actualCategoryId: category.id,
      actualAccountId: accountA.id,
    });
    equal(registered.status, 'PAID', '5D-01 Due becomes PAID');
    equal(registered.actualAmount, '26450', '5D-02 actualAmount recorded');
    equal(registered.actualDate, today, '5D-03 actualDate recorded');
    assert(registered.expenseRootTransactionId, '5D-04 expenseRootTransactionId linked');
    assert(!registered.transferId, '5D-05 no transferId for NORMAL');

    const expense = await getExpenseDetail(admin, registered.expenseRootTransactionId);
    equal(expense.amount, '26450.0000', '5D-06 Expense amount = actual amount');
    equal(expense.transaction_type, 'expense', '5D-07 Expense type');
    equal(expense.category_id, category.id, '5D-08 Expense category');
    assert(expense.finance_account_effects?.some(e => e.account_id === accountA.id && e.effect_amount < 0), '5D-09 Account effect created');

    const dueAfter = await getPaymentDueDetail(admin, personalA, due.id);
    equal(dueAfter.expected_amount, '25000.0000', '5D-10 expected amount preserved');
  }

  console.log('\n=== NORMAL PAYMENT - UNKNOWN AMOUNT ===');
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Reparacion',
      expectedAmountKnown: false,
      dueDate: futureDueDate,
    });
    const registered = await registerPayment(personalA, due.id, {
      kind: PAYMENT_KINDS.NORMAL,
      actualAmount: '48320',
      actualDate: yesterday,
    });
    equal(registered.status, 'PAID', '5D-11 UNKNOWN due becomes PAID');
    equal(registered.actualAmount, '48320', '5D-12 actual amount recorded for UNKNOWN');
  }

  console.log('\n=== NORMAL PAYMENT - WITHOUT ACCOUNT ===');
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Suscripcion',
      expectedAmountKnown: true,
      expectedAmount: '5000',
      dueDate: futureDueDate,
    });
    const registered = await registerPayment(personalA, due.id, {
      kind: PAYMENT_KINDS.NORMAL,
      actualAmount: '5500',
      actualDate: today,
    });
    equal(registered.status, 'PAID', '5D-13 NORMAL payment without account succeeds');
    assert(!registered.actualAccountId, '5D-14 no actualAccountId when not provided');
    const expense = await getExpenseDetail(admin, registered.expenseRootTransactionId);
    assert(!expense.finance_account_effects?.length, '5D-15 no account effect when no account');
  }

  console.log('\n=== CATEGORY AT SETTLEMENT ===');
  {
    const cat2 = await getCategory(personalA.personId, 'expense');
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Transporte',
      expectedAmountKnown: true,
      expectedAmount: '10000',
      dueDate: futureDueDate,
      categoryId: category.id,
    });
    const registered = await registerPayment(personalA, due.id, {
      kind: PAYMENT_KINDS.NORMAL,
      actualAmount: '10500',
      actualDate: today,
      actualCategoryId: cat2.id,
    });
    equal(registered.actualCategoryId, cat2.id, '5D-16 payment-time category override works');
    const expense = await getExpenseDetail(admin, registered.expenseRootTransactionId);
    equal(expense.category_id, cat2.id, '5D-17 Expense receives payment-time category');
  }

  console.log('\n=== STATE GUARDS ===');
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Vencido pagado hoy',
      expectedAmountKnown: true,
      expectedAmount: '3000',
      dueDate: pastDueDate,
    });
    const registered = await registerPayment(personalA, due.id, {
      kind: PAYMENT_KINDS.NORMAL,
      actualAmount: '3000',
      actualDate: today,
    });
    equal(registered.status, 'PAID', '5D-18 past due can be paid today');
  }
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Cancelado',
      expectedAmountKnown: true,
      expectedAmount: '1000',
      dueDate: futureDueDate,
    });
    await admin.from('finance_payment_dues').update({ status: 'CANCELLED' }).eq('id', due.id);
    try {
      await registerPayment(personalA, due.id, { kind: PAYMENT_KINDS.NORMAL, actualAmount: '1000', actualDate: today });
      assert(false, '5D-19 CANCELLED rejected');
    } catch (e) {
      assert(e.message.includes('finance_payment_due_not_settleable') || e.code === '23514', '5D-19 CANCELLED cannot be paid');
    }
  }
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Ya pagado',
      expectedAmountKnown: true,
      expectedAmount: '2000',
      dueDate: futureDueDate,
    });
    await registerPayment(personalA, due.id, { kind: PAYMENT_KINDS.NORMAL, actualAmount: '2000', actualDate: today, mutationId: mutationId('pay1'), idempotencyKey: idempotencyKey('pay1'), payloadHash: payloadHash('pay1') });
    try {
      await registerPayment(personalA, due.id, { kind: PAYMENT_KINDS.NORMAL, actualAmount: '2000', actualDate: today, mutationId: mutationId('pay2'), idempotencyKey: idempotencyKey('pay2'), payloadHash: payloadHash('pay2') });
      assert(false, '5D-20 PAID rejected');
    } catch (e) {
      assert(e.message.includes('finance_payment_due_not_settleable') || e.code === '23514', '5D-20 PAID cannot be paid again');
    }
  }
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Monto cero',
      expectedAmountKnown: true,
      expectedAmount: '1000',
      dueDate: futureDueDate,
    });
    try {
      await registerPayment(personalA, due.id, { kind: PAYMENT_KINDS.NORMAL, actualAmount: '0', actualDate: today });
      assert(false, '5D-21 zero rejected');
    } catch (e) {
      assert(e.message.includes('finance_payment_actual_amount_positive') || e.code === '23514', '5D-21 zero actual amount rejected');
    }
  }
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Monto negativo',
      expectedAmountKnown: true,
      expectedAmount: '1000',
      dueDate: futureDueDate,
    });
    try {
      await registerPayment(personalA, due.id, { kind: PAYMENT_KINDS.NORMAL, actualAmount: '-500', actualDate: today });
      assert(false, '5D-22 negative rejected');
    } catch (e) {
      assert(e.message.includes('finance_payment_actual_amount_positive') || e.code === '23514', '5D-22 negative actual amount rejected');
    }
  }
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Fecha invalida',
      expectedAmountKnown: true,
      expectedAmount: '1000',
      dueDate: futureDueDate,
    });
    try {
      await registerPayment(personalA, due.id, { kind: PAYMENT_KINDS.NORMAL, actualAmount: '1000', actualDate: 'invalid' });
      assert(false, '5D-23 invalid date rejected');
    } catch (e) {
      assert(e.message.includes('invalid_finance_payment_actual_date') || e.code === '23514' || e.code === '22007', '5D-23 invalid date rejected');
    }
  }
  {
    const series = await createPaymentSeries(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Fecha futura',
      defaultExpectedAmountKnown: true,
      defaultExpectedAmount: '1000',
      recurrenceIntervalUnit: 'MONTH',
      recurrenceIntervalCount: 1,
      recurrenceAnchorDate: futureDueDate,
    });
    const due = series.first_due;
    const mid = mutationId('future-date');
    const ik = idempotencyKey('future-date');
    const ph = payloadHash('future-date');
    for (const attempt of [1, 2]) {
      try {
        await registerPayment(personalA, due.id, {
          kind: PAYMENT_KINDS.NORMAL,
          actualAmount: '1000',
          actualDate: tomorrow,
          mutationId: mid,
          idempotencyKey: ik,
          payloadHash: ph,
        });
        assert(false, `5D-24 future actual date rejected attempt ${attempt}`);
      } catch (e) {
        assert(e.message.includes('future_finance_payment_actual_date') || e.code === '23514', `5D-24 future actual date rejected attempt ${attempt}`);
      }
    }
    const dueAfter = await getPaymentDueDetail(admin, personalA, due.id);
    equal(dueAfter.status, 'PENDING', '5D-25 future-date rejection keeps due PENDING');
    equal(dueAfter.expense_root_transaction_id, null, '5D-26 future-date rejection creates no Expense');
    equal(dueAfter.transfer_id, null, '5D-27 future-date rejection creates no Transfer');
    const { data: seriesDues } = await admin
      .from('finance_payment_dues')
      .select('*')
      .eq('payment_series_id', series.series.id)
      .order('due_date');
    equal(seriesDues.length, 1, '5D-28 future-date rejection creates no next recurrence occurrence');
    equal(seriesDues[0].status, 'PENDING', '5D-29 rejected recurring due remains only PENDING');
    const validAfterReject = await registerPayment(personalA, due.id, {
      kind: PAYMENT_KINDS.NORMAL,
      actualAmount: '1000',
      actualDate: today,
    });
    equal(validAfterReject.status, 'PAID', '5D-30 valid retry after future-date rejection succeeds');
  }

  console.log('\n=== IDEMPOTENCY ===');
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Idempotencia',
      expectedAmountKnown: true,
      expectedAmount: '15000',
      dueDate: '2026-10-10',
    });
    const mid = mutationId('idem');
    const ik = idempotencyKey('idem');
    const ph = payloadHash('idem');
    const r1 = await registerPayment(personalA, due.id, { kind: PAYMENT_KINDS.NORMAL, actualAmount: '15000', actualDate: today, actualAccountId: accountA.id, mutationId: mid, idempotencyKey: ik, payloadHash: ph });
    const r2 = await registerPayment(personalA, due.id, { kind: PAYMENT_KINDS.NORMAL, actualAmount: '15000', actualDate: today, actualAccountId: accountA.id, mutationId: mid, idempotencyKey: ik, payloadHash: ph });
    equal(r2.expenseRootTransactionId, r1.expenseRootTransactionId, '5D-24 retry returns same Expense');
    equal(r2.id, r1.id, '5D-25 same Due returned');
    const expense = await getExpenseDetail(admin, r1.expenseRootTransactionId);
    const effects = await admin.from('finance_account_effects').select('*').eq('transaction_id', expense.id).eq('effect_role', 'PRIMARY');
    equal(effects.data?.length, 1, '5D-26 exactly one account effect on retry');
  }
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Conflicto',
      expectedAmountKnown: true,
      expectedAmount: '20000',
      dueDate: '2026-10-15',
    });
    const mid = mutationId('conflict');
    const ik = idempotencyKey('conflict');
    await registerPayment(personalA, due.id, { kind: PAYMENT_KINDS.NORMAL, actualAmount: '20000', actualDate: today, mutationId: mid, idempotencyKey: ik, payloadHash: payloadHash('conflict1') });
    try {
      await registerPayment(personalA, due.id, { kind: PAYMENT_KINDS.NORMAL, actualAmount: '25000', actualDate: today, mutationId: mid, idempotencyKey: ik, payloadHash: payloadHash('conflict2') });
      assert(false, '5D-27 conflicting payload rejected');
    } catch (e) {
      assert(e.message.includes('finance_payment_conflicting_payload') || e.code === 'P0008', '5D-27 conflicting payload under same idempotency key rejected');
    }
  }

  console.log('\n=== RECURRENCE ADVANCEMENT ===');
  {
    const series = await createPaymentSeries(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Internet Mensual',
      defaultExpectedAmountKnown: true,
      defaultExpectedAmount: '25000',
      recurrenceIntervalUnit: 'MONTH',
      recurrenceIntervalCount: 1,
      recurrenceAnchorDate: '2026-09-10',
      defaultCategoryId: category.id,
    });
    const due = series.first_due;
    const registered = await registerPayment(personalA, due.id, {
      kind: PAYMENT_KINDS.NORMAL,
      actualAmount: '26000',
      actualDate: today,
      actualCategoryId: category.id,
    });
    equal(registered.status, 'PAID', '5D-28 recurring Due becomes PAID');
    assert(registered.id === due.id, '5D-29 same Due row becomes PAID');

    const { data: nextDues } = await admin
      .from('finance_payment_dues')
      .select('*')
      .eq('payment_series_id', series.series.id)
      .eq('status', 'PENDING')
      .order('due_date')
      .limit(1);
    assert(nextDues.length === 1, '5D-30 exactly one next PENDING created');
    equal(nextDues[0].due_date, '2026-10-10', '5D-31 next due date correct (Oct 10)');
  }
  {
    const series = await createPaymentSeries(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Jan31 Recurrence',
      defaultExpectedAmountKnown: true,
      defaultExpectedAmount: '5000',
      recurrenceIntervalUnit: 'MONTH',
      recurrenceIntervalCount: 1,
      recurrenceAnchorDate: '2026-01-31',
    });
    const due1 = series.first_due;
    await registerPayment(personalA, due1.id, { kind: PAYMENT_KINDS.NORMAL, actualAmount: '5000', actualDate: '2026-01-31' });
    const { data: dues } = await admin
      .from('finance_payment_dues')
      .select('*')
      .eq('payment_series_id', series.series.id)
      .eq('status', 'PENDING')
      .order('due_date');
    equal(dues[0].due_date, '2026-02-28', '5D-32 Jan31 -> Feb28');
    await registerPayment(personalA, dues[0].id, { kind: PAYMENT_KINDS.NORMAL, actualAmount: '5000', actualDate: '2026-02-28' });
    const { data: dues2 } = await admin
      .from('finance_payment_dues')
      .select('*')
      .eq('payment_series_id', series.series.id)
      .eq('status', 'PENDING')
      .order('due_date');
    equal(dues2[0].due_date, '2026-03-31', '5D-33 Feb28 -> Mar31');
  }

  console.log('\n=== LINKAGE ===');
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Linkage',
      expectedAmountKnown: true,
      expectedAmount: '30000',
      dueDate: '2026-10-20',
    });
    const registered = await registerPayment(personalA, due.id, {
      kind: PAYMENT_KINDS.NORMAL,
      actualAmount: '31000',
      actualDate: today,
      actualAccountId: accountA.id,
    });
    const dueAfter = await getPaymentDueDetail(admin, personalA, due.id);
    assert(dueAfter.expense_root_transaction_id === registered.expenseRootTransactionId, '5D-33 Payment -> Expense root linkage');
    const expense = await getExpenseDetail(admin, registered.expenseRootTransactionId);
    assert(expense.root_transaction_id === registered.expenseRootTransactionId, '5D-34 Expense root matches linkage');
  }

  console.log('\n=== CORRECTION INTEGRATION ===');
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'Corregible',
      expectedAmountKnown: true,
      expectedAmount: '40000',
      dueDate: '2026-10-25',
      categoryId: category.id,
    });
    const registered = await registerPayment(personalA, due.id, {
      kind: PAYMENT_KINDS.NORMAL,
      actualAmount: '42000',
      actualDate: today,
      actualCategoryId: category.id,
    });
    const expenseRoot = registered.expenseRootTransactionId;

    const { data: corrected, error: correctionError } = await personalA.client.rpc('finance_correct_transaction_v1', {
      p_transaction_id: expenseRoot,
      p_mutation_id: mutationId('correct'),
      p_idempotency_key: idempotencyKey('correct'),
      p_payload_hash: payloadHash('correct'),
      p_created_by_person_id: personalA.personId,
      p_amount: '38000',
      p_category_id: category.id,
    });
    if (correctionError) throw correctionError;
    assert(corrected, '5D-35 canonical correction works');
    equal(corrected.root_transaction_id, expenseRoot, '5D-36 root_transaction_id preserved');
    equal(decimal4(corrected.amount), '38000.0000', '5D-37 corrected amount');

    const dueAfter = await getPaymentDueDetail(admin, personalA, due.id);
    equal(dueAfter.expense_root_transaction_id, expenseRoot, '5D-38 Payment still links to same logical root');
    equal(dueAfter.status, 'PAID', '5D-39 Payment remains PAID');
  }

  console.log('\n=== CREDIT_CARD PAYMENT ===');
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.CREDIT_CARD,
      title: 'Visa Pago',
      expectedAmountKnown: true,
      expectedAmount: '180000',
      dueDate: '2026-09-05',
      targetCreditCardAccountId: cardA.id,
    });
    const registered = await registerPayment(personalA, due.id, {
      kind: PAYMENT_KINDS.CREDIT_CARD,
      actualAmount: '180000',
      actualDate: today,
      sourceAccountId: accountA.id,
    });
    equal(registered.status, 'PAID', '5D-40 CREDIT_CARD Due becomes PAID');
    equal(registered.actualAmount, '180000', '5D-41 actualAmount recorded');
    assert(registered.transferId, '5D-42 transferId linked');
    assert(!registered.expenseRootTransactionId, '5D-43 no expenseRootTransactionId for CREDIT_CARD');

    const transfer = await getTransferDetail(admin, registered.transferId);
    equal(transfer.source_amount, '180000.0000', '5D-44 Transfer source amount');
    equal(transfer.destination_amount, '180000.0000', '5D-45 Transfer destination amount');
    equal(transfer.source_account_id, accountA.id, '5D-46 Transfer source = selected account');
    equal(transfer.destination_account_id, cardA.id, '5D-47 Transfer destination = target card');

    const effects = await admin.from('finance_account_effects').select('*').eq('transfer_id', registered.transferId);
    equal(effects.data?.length, 2, '5D-48 exactly two Transfer effects');
    const sourceEffect = effects.data.find(e => e.effect_role === 'TRANSFER_SOURCE');
    const destEffect = effects.data.find(e => e.effect_role === 'TRANSFER_DESTINATION');
    assert(sourceEffect && sourceEffect.effect_amount < 0 && sourceEffect.account_id === accountA.id, '5D-49 source effect correct');
    assert(destEffect && destEffect.effect_amount > 0 && destEffect.account_id === cardA.id, '5D-50 destination effect correct');

    const { data: cardBalance } = await personalA.client.rpc('finance_account_current_balance_text', { p_account_id: cardA.id });
    equal(cardBalance, '80000.0000', '5D-51 Card balance updated');
  }

  console.log('\n=== CREDIT_CARD - CROSS CURRENCY ===');
  {
    const accountUSD = await createAccount(personalA, { name: 'Cuenta USD', currency: 'USD', initialAmount: '5000' });
    const cardUSD = await createAccount(personalA, { name: 'Visa USD', accountType: 'CREDIT_CARD', currency: 'USD', initialAmount: '-1000' });
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.CREDIT_CARD,
      title: 'Visa USD Cross',
      currency: 'USD',
      expectedAmountKnown: true,
      expectedAmount: '100',
      dueDate: '2026-09-10',
      targetCreditCardAccountId: cardUSD.id,
    });
    const registered = await registerPayment(personalA, due.id, {
      kind: PAYMENT_KINDS.CREDIT_CARD,
      actualAmount: '100',
      actualDate: today,
      sourceAccountId: accountUSD.id,
      destinationAmount: '100',
    });
    equal(registered.status, 'PAID', '5D-52 cross-currency CREDIT_CARD works');
    const transfer = await getTransferDetail(admin, registered.transferId);
    equal(transfer.source_currency, 'USD', '5D-53 source currency USD');
    equal(transfer.destination_currency, 'USD', '5D-54 destination currency USD');
  }

  console.log('\n=== CREDIT_CARD GUARDS ===');
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.CREDIT_CARD,
      title: 'Card Source Rejected',
      expectedAmountKnown: true,
      expectedAmount: '50000',
      dueDate: '2026-09-15',
      targetCreditCardAccountId: cardA.id,
    });
    try {
      await registerPayment(personalA, due.id, {
        kind: PAYMENT_KINDS.CREDIT_CARD,
        actualAmount: '50000',
        actualDate: today,
        sourceAccountId: cardA.id,
      });
      assert(false, '5D-55 CREDIT_CARD as source rejected');
    } catch (e) {
      assert(e.message.includes('finance_payment_invalid_source_account') || e.code === '23514', '5D-55 CREDIT_CARD cannot be source');
    }
  }
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.CREDIT_CARD,
      title: 'No Source Account',
      expectedAmountKnown: true,
      expectedAmount: '50000',
      dueDate: '2026-09-15',
      targetCreditCardAccountId: cardA.id,
    });
    try {
      await registerPayment(personalA, due.id, {
        kind: PAYMENT_KINDS.CREDIT_CARD,
        actualAmount: '50000',
        actualDate: today,
      });
      assert(false, '5D-56 sourceAccountId required');
    } catch (e) {
      assert(e.message.includes('finance_payment_credit_card_source_required'), '5D-56 sourceAccountId required for CREDIT_CARD');
    }
  }

  console.log('\n=== CREDIT_CARD IDEMPOTENCY ===');
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.CREDIT_CARD,
      title: 'CC Idempotency',
      expectedAmountKnown: true,
      expectedAmount: '50000',
      dueDate: '2026-09-20',
      targetCreditCardAccountId: cardA.id,
    });
    const mid = mutationId('cc-idem');
    const ik = idempotencyKey('cc-idem');
    const ph = payloadHash('cc-idem');
    const r1 = await registerPayment(personalA, due.id, { kind: PAYMENT_KINDS.CREDIT_CARD, actualAmount: '50000', actualDate: today, sourceAccountId: accountA.id, mutationId: mid, idempotencyKey: ik, payloadHash: ph });
    const r2 = await registerPayment(personalA, due.id, { kind: PAYMENT_KINDS.CREDIT_CARD, actualAmount: '50000', actualDate: today, sourceAccountId: accountA.id, mutationId: mid, idempotencyKey: ik, payloadHash: ph });
    equal(r2.transferId, r1.transferId, '5D-57 retry returns same Transfer');
    const effects = await admin.from('finance_account_effects').select('*').eq('transfer_id', r1.transferId);
    equal(effects.data?.length, 2, '5D-58 exactly two effects on retry');
  }

  console.log('\n=== CREDIT_CARD RECURRENCE ===');
  {
    const series = await createPaymentSeries(personalA, {
      kind: PAYMENT_KINDS.CREDIT_CARD,
      title: 'Visa Mensual',
      defaultExpectedAmountKnown: true,
      defaultExpectedAmount: '180000',
      recurrenceIntervalUnit: 'MONTH',
      recurrenceIntervalCount: 1,
      recurrenceAnchorDate: '2026-09-05',
      targetCreditCardAccountId: cardA.id,
    });
    const due = series.first_due;
    const registered = await registerPayment(personalA, due.id, {
      kind: PAYMENT_KINDS.CREDIT_CARD,
      actualAmount: '180000',
      actualDate: today,
      sourceAccountId: accountA.id,
    });
    equal(registered.status, 'PAID', '5D-59 CC recurring Due becomes PAID');

    const { data: nextDues } = await admin
      .from('finance_payment_dues')
      .select('*')
      .eq('payment_series_id', series.series.id)
      .eq('status', 'PENDING')
      .order('due_date')
      .limit(1);
    assert(nextDues.length === 1, '5D-60 exactly one next PENDING for CC series');
    equal(nextDues[0].due_date, '2026-10-05', '5D-61 next CC due date correct');
  }

  console.log('\n=== ONE-OFF NO RECURRENCE ===');
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'One-off',
      expectedAmountKnown: true,
      expectedAmount: '10000',
      dueDate: '2026-10-30',
    });
    await registerPayment(personalA, due.id, { kind: PAYMENT_KINDS.NORMAL, actualAmount: '10000', actualDate: today });
    const { data: dues } = await admin
      .from('finance_payment_dues')
      .select('*')
      .eq('id', due.id);
    equal(dues[0].payment_series_id, null, '5D-62 one-off has no series');
    const { data: allDues } = await admin
      .from('finance_payment_dues')
      .select('*')
      .eq('owner_person_id', personalA.personId)
      .eq('financial_context_type', 'personal')
      .eq('status', 'PENDING');
    // The only PENDING should be from other tests; this one should be PAID
  }

  console.log('\n=== HTTP RUNTIME ===');
  const { data: sessionData } = await personalA.client.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? '';
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'HTTP Normal',
      expectedAmountKnown: true,
      expectedAmount: '5000',
      dueDate: futureDueDate,
    });
    const resp = await fetch(`${backendUrl}/api/finance/payments/dues/${due.id}/register?contextType=personal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Mutation-Id': mutationId('http'),
        'Idempotency-Key': idempotencyKey('http'),
        'X-Payload-Hash': payloadHash('http'),
      },
      body: JSON.stringify({
        actualAmount: '5000',
        actualDate: today,
        mutationId: mutationId('http'),
        idempotencyKey: idempotencyKey('http'),
        payloadHash: payloadHash('http'),
      }),
    });
    const body = await resp.json();
    console.log(`  HTTP Normal: ${resp.status} ${JSON.stringify(body.paymentDue?.status ?? body)}`);
    assert(resp.status === 200 || resp.status === 201, '5D-63 HTTP register NORMAL works');
    const dueAfter = await getPaymentDueDetail(admin, personalA, due.id);
    assert(dueAfter.expense_root_transaction_id, '5D-64 HTTP NORMAL creates Expense');
  }
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.CREDIT_CARD,
      title: 'HTTP CC',
      expectedAmountKnown: true,
      expectedAmount: '50000',
      dueDate: futureDueDate,
      targetCreditCardAccountId: cardA.id,
    });
    const resp = await fetch(`${backendUrl}/api/finance/payments/dues/${due.id}/register?contextType=personal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Mutation-Id': mutationId('http-cc'),
        'Idempotency-Key': idempotencyKey('http-cc'),
        'X-Payload-Hash': payloadHash('http-cc'),
      },
      body: JSON.stringify({
        actualAmount: '50000',
        actualDate: today,
        sourceAccountId: accountA.id,
        mutationId: mutationId('http-cc'),
        idempotencyKey: idempotencyKey('http-cc'),
        payloadHash: payloadHash('http-cc'),
      }),
    });
    const body = await resp.json();
    console.log(`  HTTP CC: ${resp.status} ${JSON.stringify(body.paymentDue?.status ?? body)}`);
    assert(resp.status === 200 || resp.status === 201, '5D-65 HTTP register CREDIT_CARD works');
    const dueAfter = await getPaymentDueDetail(admin, personalA, due.id);
    assert(dueAfter.transfer_id, '5D-66 HTTP CREDIT_CARD creates Transfer');
  }
  {
    const due = await createOneOffPaymentDue(personalA, {
      kind: PAYMENT_KINDS.NORMAL,
      title: 'HTTP Future Date',
      expectedAmountKnown: true,
      expectedAmount: '5000',
      dueDate: futureDueDate,
    });
    const resp = await fetch(`${backendUrl}/api/finance/payments/dues/${due.id}/register?contextType=personal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        actualAmount: '5000',
        actualDate: tomorrow,
        mutationId: mutationId('http-future'),
        idempotencyKey: idempotencyKey('http-future'),
        payloadHash: payloadHash('http-future'),
      }),
    });
    const body = await resp.json();
    console.log(`  HTTP Future Date: ${resp.status} ${JSON.stringify(body.error?.code ?? body)}`);
    equal(resp.status, 400, '5D-67 HTTP future actualDate rejected with client error');
    equal(body.error?.code, 'future_finance_payment_actual_date', '5D-68 HTTP future actualDate error code');
    const dueAfter = await getPaymentDueDetail(admin, personalA, due.id);
    equal(dueAfter.status, 'PENDING', '5D-69 HTTP future-date rejection keeps due PENDING');
    equal(dueAfter.expense_root_transaction_id, null, '5D-70 HTTP future-date rejection creates no Expense');
    equal(dueAfter.transfer_id, null, '5D-71 HTTP future-date rejection creates no Transfer');
  }

  console.log(`\nFINANCE_5D_REGISTER_PAYMENT_RESULT pass=${passCount} fail=${failCount}`);
  console.log(failCount === 0 ? 'FINANCE_STAGE_5D_REGISTER_PAYMENT_TESTS=PASS' : 'FINANCE_STAGE_5D_REGISTER_PAYMENT_TESTS=FAIL');
  if (failCount > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
