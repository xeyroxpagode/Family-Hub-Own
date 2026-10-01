#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('../backend/node_modules/dotenv');
const { Client } = require('../backend/node_modules/pg');
const { createClient } = require('../backend/node_modules/@supabase/supabase-js');
const readService = require('../backend/src/services/finance.read.service');
const refundService = require('../backend/src/services/finance.refund.service');

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

const databaseUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

function mutationId(label) {
  return `finance-4k-${label}-${crypto.randomUUID()}`;
}

function payloadHash(label) {
  return crypto.createHash('sha256').update(`${label}:${crypto.randomUUID()}`).digest('hex');
}

async function main() {
  const supabaseUrl = new URL(process.env.SUPABASE_URL);
  if (!['127.0.0.1', 'localhost'].includes(supabaseUrl.hostname)) {
    console.error('ENVIRONMENT_FAILURE: Finance 4K tests are local-only.');
    process.exit(2);
  }

  const pg = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, statement_timeout: 30000 });
  await pg.connect();

  try {
    console.log('\n=== SETUP ===');
    const email = `finance-4k-${Date.now()}-${crypto.randomBytes(4).toString('hex')}@example.test`;
    const password = `Finance4K_${crypto.randomBytes(12).toString('base64url')}!9a`;
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) throw authError;
    const authUserId = authData.user.id;

    const { rows: people } = await pg.query(
      `insert into people (auth_user_id, display_name, default_language, personal_settings)
       values ($1, 'Finance 4K QA', 'es-419', '{}') returning *`,
      [authUserId],
    );
    const personId = people[0].id;
    await pg.query(`select set_config('request.jwt.claim.sub', $1, false)`, [authUserId]);

    const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await userClient.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    const serviceFinanceContext = {
      client: userClient,
      contextType: 'personal',
      personId,
      householdId: null,
      membershipId: null,
    };

    let { rows: categoryRows } = await pg.query(
      `select id, label from finance_categories
       where category_kind = 'native' and category_type = 'expense' and deleted_at is null
       order by label limit 1`,
    );
    if (!categoryRows[0]) {
      await pg.query(fs.readFileSync(path.join(root, 'supabase/migrations/20260813010000_finance_category_authority_v1_1.sql'), 'utf8'));
      ({ rows: categoryRows } = await pg.query(
        `select id, label from finance_categories
         where category_kind = 'native' and category_type = 'expense' and deleted_at is null
         order by label limit 1`,
      ));
    }
    const category = categoryRows[0];
    if (!category) throw new Error('finance_4k_native_category_not_found');

    const { rows: accountRows } = await pg.query(
      `insert into finance_accounts
       (financial_context_type, owner_person_id, household_id, name, currency, account_type, balance_state, status, created_by_person_id, updated_by_person_id)
       values ('personal', $1, null, 'Cuenta 4K', 'ARS', 'ACCOUNT', 'KNOWN', 'ACTIVE', $1, $1)
       returning *`,
      [personId],
    );
    const accountId = accountRows[0].id;
    await pg.query(
      `insert into finance_account_balance_anchors (account_id, amount, currency, effective_date, created_by_person_id)
       values ($1, 100000, 'ARS', '2026-08-01', $2)`,
      [accountId, personId],
    );

    const { rows: txRows } = await pg.query(
      `insert into finance_transactions
       (transaction_type, amount, currency, financial_context_type, owner_person_id, household_id, transaction_date, description, category_id, category_label_snapshot, created_by_person_id)
       values ('expense', 10000, 'ARS', 'personal', $1, null, '2026-08-10', 'Supermercado', $2, $3, $1)
       returning *`,
      [personId, category.id, category.label],
    );
    const expense = txRows[0];
    await pg.query(
      `insert into finance_account_effects
       (account_id, transaction_id, effect_type, effect_role, effect_amount, currency, transaction_date, transaction_created_at, financial_context_type, owner_person_id, household_id, created_by_person_id, effect_status)
       values ($1, $2, 'expense', 'PRIMARY', -10000, 'ARS', '2026-08-10', $3, 'personal', $4, null, $4, 'ACTIVE')`,
      [accountId, expense.id, expense.created_at, personId],
    );

    console.log('\n=== CREATE / MULTIPLE / OVER-REFUND ===');
    const r1Service = await refundService.createRefund(serviceFinanceContext, {
      transactionId: expense.id,
      amount: '4000',
      effectiveDate: '2026-08-12',
      mutationId: mutationId('r1'),
      idempotencyKey: mutationId('idem-r1'),
    });
    const { rows: r1Rows } = await pg.query(`select * from finance_refund_events where id = $1`, [r1Service.refund.id]);
    const r1 = r1Rows[0];
    equal(r1.amount, '4000.0000', 'R1 amount is positive 4000');
    equal(r1Service.outcome, 'created', 'Node refund service creates R1 through backend mutation path');

    const { rows: r2Rows } = await pg.query(
      `select * from finance_create_refund_event_v1($1,$2,$3,$4,$5,3000,'2026-08-13')`,
      [expense.id, mutationId('r2'), mutationId('idem-r2'), payloadHash('r2'), personId],
    );
    const r2 = r2Rows[0];
    equal(r2.root_refund_event_id, r2.id, 'R2 is a separate logical refund');

    const { rows: totalRows } = await pg.query(`select finance_active_refund_total_for_expense_root_v1($1)::text as total`, [expense.root_transaction_id]);
    equal(totalRows[0].total, '7000.0000', 'Active refund total after R1+R2 is 7000');

    try {
      await pg.query(
        `select * from finance_create_refund_event_v1($1,$2,$3,$4,$5,4000,'2026-08-14')`,
        [expense.id, mutationId('over'), mutationId('idem-over'), payloadHash('over'), personId],
      );
      assert(false, 'Over-refund should reject');
    } catch (error) {
      assert(String(error.message).includes('finance_refund_total_exceeds_expense_amount'), 'Over-refund rejects');
    }

    console.log('\n=== CORRECTION / PROJECTION ===');
    const { rows: correctedRows } = await pg.query(
      `select * from finance_correct_refund_event_v1($1,$2,$3,$4,$5,1500,'2026-08-12')`,
      [r1.id, mutationId('correct-r1'), mutationId('idem-correct-r1'), payloadHash('correct-r1'), personId],
    );
    const r1v1 = correctedRows[0];
    equal(r1v1.root_refund_event_id, r1.root_refund_event_id, 'Correction preserves logical refund root');
    equal(r1v1.corrected_from_refund_event_id, r1.id, 'Correction links to previous active revision');

    const { rows: activePerRoot } = await pg.query(
      `select root_refund_event_id, count(*)::int as active_count
       from finance_refund_events
       where expense_root_transaction_id = $1 and status = 'ACTIVE'
       group by root_refund_event_id
       order by root_refund_event_id`,
      [expense.root_transaction_id],
    );
    assert(activePerRoot.every((row) => row.active_count === 1), 'Exactly one ACTIVE revision per logical refund');

    const { rows: effectRows } = await pg.query(
      `select refund_event_id, effect_amount::text amount, effect_status
       from finance_account_effects
       where transaction_id = $1 and effect_role = 'REFUND'
       order by created_at`,
      [expense.id],
    );
    assert(effectRows.some((row) => row.refund_event_id === r1.id && row.effect_status === 'REVERSED'), 'Old R1 projection is reversed');
    assert(effectRows.some((row) => row.refund_event_id === r1v1.id && row.amount === '1500.0000' && row.effect_status === 'ACTIVE'), 'Corrected R1 projection is active at 1500');
    assert(effectRows.some((row) => row.refund_event_id === r2.id && row.amount === '3000.0000' && row.effect_status === 'ACTIVE'), 'R2 projection remains active and untouched');

    const { rows: balanceRows } = await pg.query(`select finance_account_current_balance_text($1) as balance`, [accountId]);
    equal(balanceRows[0].balance, '94500.0000', 'Balance reflects expense -10000 + active refunds 4500');

    console.log('\n=== READ MODEL ===');
    const financeContext = {
      client: admin,
      contextType: 'personal',
      personId,
      householdId: null,
      membershipId: null,
    };
    const movements = await readService.listFinanceMovements(financeContext, { period: '2026-08' });
    const movement = movements.movements.find((item) => item.id === expense.id);
    assert(Boolean(movement), 'Expense remains one Movimiento row');
    equal(movement.totalRefunded, '4500', 'Movimiento totalRefunded is derived from active refund revisions');
    equal(movement.netAmount, '5500', 'Movimiento netAmount is gross minus refunded');
    assert(!movements.movements.some((item) => item.id === r1.id || item.id === r2.id || item.id === r1v1.id), 'Refund events are not Movimientos rows');

    const detail = await readService.getFinanceTransactionDetail(financeContext, expense.id);
    equal(detail.totalRefunded, '4500', 'Detail shows total refunded');
    equal(detail.netAmount, '5500', 'Detail shows net expense');
    equal(detail.refundCount, 2, 'Detail exposes two active logical refund events');

    console.log('\n=== TRASH / RESTORE ===');
    await pg.query(
      `select * from finance_trash_transaction_v1($1,$2,$3,$4,$5)`,
      [expense.id, mutationId('trash'), mutationId('idem-trash'), payloadHash('trash'), personId],
    );
    const { rows: trashedEffects } = await pg.query(
      `select count(*)::int as active_refunds
       from finance_account_effects
       where transaction_id = $1 and effect_role = 'REFUND' and effect_status = 'ACTIVE'`,
      [expense.id],
    );
    equal(trashedEffects[0].active_refunds, 0, 'Trash reverses refund projections');

    await pg.query(
      `select * from finance_restore_transaction_v1($1,$2,$3,$4,$5)`,
      [expense.id, mutationId('restore'), mutationId('idem-restore'), payloadHash('restore'), personId],
    );
    const { rows: restoredEffects } = await pg.query(
      `select count(*)::int as active_refunds
       from finance_account_effects
       where transaction_id = $1 and effect_role = 'REFUND' and effect_status = 'ACTIVE'`,
      [expense.id],
    );
    equal(restoredEffects[0].active_refunds, 2, 'Restore reactivates exactly the two current refund projections');

    console.log('\n=== NO ACCOUNT / FULL REFUND ===');
    const { rows: noAccountRows } = await pg.query(
      `insert into finance_transactions
       (transaction_type, amount, currency, financial_context_type, owner_person_id, household_id, transaction_date, description, category_id, category_label_snapshot, created_by_person_id)
       values ('expense', 10000, 'ARS', 'personal', $1, null, '2026-08-10', 'Sin cuenta', $2, $3, $1)
       returning *`,
      [personId, category.id, category.label],
    );
    const noAccountExpense = noAccountRows[0];
    await pg.query(
      `select * from finance_create_refund_event_v1($1,$2,$3,$4,$5,10000,'2026-08-15')`,
      [noAccountExpense.id, mutationId('full'), mutationId('idem-full'), payloadHash('full'), personId],
    );
    const { rows: noAccountEffects } = await pg.query(
      `select count(*)::int as count
       from finance_account_effects
       where transaction_id = $1 and effect_role = 'REFUND'`,
      [noAccountExpense.id],
    );
    equal(noAccountEffects[0].count, 0, 'No-account refund creates no Account effect');
    const noAccountDetail = await readService.getFinanceTransactionDetail(financeContext, noAccountExpense.id);
    equal(noAccountDetail.netAmount, '0', 'Full no-account refund leaves net 0');
    equal(noAccountDetail.status, 'ACTIVE', 'Full refund keeps Expense ACTIVE');

    console.log(`\nFINANCE_STAGE_4K_REFUND_TESTS pass=${passCount} fail=${failCount}`);
    console.log(failCount === 0 ? 'FINANCE_STAGE_4K_REFUND_END_TO_END=PASS' : 'FINANCE_STAGE_4K_REFUND_END_TO_END=FAIL');
    if (failCount > 0) process.exit(1);
  } finally {
    await pg.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
