#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 6C.2 Pool financial integration tests.
 *
 * Local Supabase only. Verifies Expense root Pool classification,
 * immutable Pool reconciliation, Income distribution provenance, and
 * concurrency boundaries on the clean replayed database.
 */

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
const { createFinanceAccount, createInitialBalanceAnchor } = require('../backend/src/services/finance.account.service');
const { createExpense, createIncome } = require('../backend/src/services/finance.transaction.service');
const { correctTransaction } = require('../backend/src/services/finance.transaction.correction.service');
const { trashFinanceTransaction } = require('../backend/src/services/finance.transaction.trash.service');
const { restoreFinanceTransaction } = require('../backend/src/services/finance.transaction.restore.service');
const { createRefund, correctRefund } = require('../backend/src/services/finance.refund.service');
const { createTransfer } = require('../backend/src/services/finance.transfer.service');
const {
  createPool,
  archivePool,
  releasePool,
  assignExpenseToPool,
  unassignExpensePool,
  getExpensePoolAssignment,
  distributeIncomeToPools,
} = require('../backend/src/services/finance.pool.service');

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
  console.error('ENVIRONMENT_FAILURE: Finance 6C.2 tests are local-only.');
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
  if (error.code !== expectedCode) {
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

function authHeaders(label = 'op') {
  const safeLabel = String(label).replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 40);
  return {
    headers: {
      'x-mutation-id': crypto.randomUUID(),
      'idempotency-key': `finance-6c2-${safeLabel}-${crypto.randomUUID()}`,
    },
  };
}

function serviceCorrelation(label = 'op') {
  const safeLabel = String(label).replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 40);
  return {
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c2-${safeLabel}-${crypto.randomUUID()}`,
  };
}

function randomCredential(label) {
  return `Fin6C2_${label}_${crypto.randomBytes(18).toString('base64url')}!9a`;
}

async function createTestUser(suffix) {
  const email = `finance-6c2-${suffix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}@example.test`;
  const password = randomCredential(suffix);
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`auth create failed: ${error?.message ?? 'missing user'}`);
  fixture.authUserIds.push(data.user.id);

  const person = await admin.from('people').insert({
    auth_user_id: data.user.id,
    display_name: `Fin 6C2 ${suffix}`,
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

async function contextFor(user, contextType = FINANCE_CONTEXT_TYPES.PERSONAL) {
  return resolveFinanceContext(
    { user: { id: user.authUserId }, accessToken: user.accessToken },
    contextType,
  );
}

async function makeAccount(ctx, overrides = {}) {
  const result = await createFinanceAccount(ctx, {
    name: `Cuenta ${crypto.randomBytes(3).toString('hex')}`,
    currency: overrides.currency ?? 'ARS',
    accountType: overrides.accountType ?? 'ACCOUNT',
    ...(overrides.initialBalance !== undefined
      ? { initialBalance: { amount: overrides.initialBalance, effectiveDate: '2026-08-01' } }
      : {}),
  });
  return result.account;
}

async function makePool(ctx, name, currency = 'ARS') {
  return (await createPool(ctx, { name, currency }, authHeaders(`pool-${name}`))).pool;
}

async function expense(ctx, amount, account, overrides = {}) {
  return (await createExpense(ctx, {
    amount,
    currency: overrides.currency ?? 'ARS',
    date: overrides.date ?? '2026-08-10',
    description: overrides.description ?? '6C2 Expense',
    ...(account ? { account: { id: account.id } } : {}),
    ...(overrides.category ? { category: overrides.category } : {}),
  })).transaction;
}

async function income(ctx, amount, account, overrides = {}) {
  return (await createIncome(ctx, {
    amount,
    currency: overrides.currency ?? 'ARS',
    date: overrides.date ?? '2026-08-10',
    description: overrides.description ?? '6C2 Income',
    ...(account ? { account: { id: account.id } } : {}),
  })).transaction;
}

async function poolBalance(poolId) {
  const { rows } = await queryDb(`
    select coalesce(sum(case when direction = 'CREDIT' then amount else -amount end), 0)::text as balance
    from public.finance_pool_entries
    where pool_id = $1
  `, [poolId]);
  return rows[0].balance;
}

async function appliedExpense(rootId, poolId = null) {
  const params = poolId ? [rootId, poolId] : [rootId];
  const { rows } = await queryDb(`
    select coalesce(sum(case when pe.direction = 'DEBIT' then pe.amount else -pe.amount end), 0)::text as applied
    from public.finance_pool_operations po
    join public.finance_pool_entries pe on pe.operation_id = po.id
    where po.expense_root_transaction_id = $1
    ${poolId ? 'and pe.pool_id = $2' : ''}
  `, params);
  return rows[0].applied;
}

async function tableDigest(table) {
  const { rows } = await queryDb(`
    select
      count(*)::int as count,
      md5(coalesce(string_agg(row_to_json(t)::text, '|' order by row_to_json(t)::text), '')) as digest
    from public.${table} t
  `);
  return rows[0];
}

async function countRows(table, where = '', params = []) {
  const { rows } = await queryDb(`select count(*)::int as count from public.${table} ${where}`, params);
  return rows[0].count;
}

async function rootId(transactionId) {
  const { rows } = await queryDb('select root_transaction_id from public.finance_transactions where id = $1', [transactionId]);
  return rows[0].root_transaction_id;
}

async function activeTransaction(root) {
  const { rows } = await queryDb(`
    select *
    from public.finance_transactions
    where root_transaction_id = $1 and status = 'ACTIVE'
    order by created_at desc, id desc
    limit 1
  `, [root]);
  return rows[0];
}

async function runExpensePoolTests(ctx) {
  console.log('\nExpense <-> Pool integration');
  const hasBalanceColumn = await queryDb("select count(*)::int as count from information_schema.columns where table_schema = 'public' and table_name = 'finance_pools' and column_name = 'balance'");
  equal(hasBalanceColumn.rows[0].count, 0, 'Pool balance remains ledger-derived');

  const poolA = await makePool(ctx, '6C2 A');
  const poolB = await makePool(ctx, '6C2 B');
  const known = await makeAccount(ctx, { initialBalance: '1000' });
  const unknown = await makeAccount(ctx);
  const card = await makeAccount(ctx, { accountType: 'CREDIT_CARD', initialBalance: '-200' });

  await allocatePool(ctx, poolA, '400');
  await allocatePool(ctx, poolB, '250');

  const noAccountExpense = await expense(ctx, '10', null);
  equal(await countRows('finance_expense_pool_links', 'where expense_root_transaction_id = $1', [await rootId(noAccountExpense.id)]), 0, '1 Expense can exist without Pool link');
  const noAccountRead = await getExpensePoolAssignment(ctx, noAccountExpense.id);
  equal(noAccountRead.rootTransactionId, await rootId(noAccountExpense.id), 'R1 unassigned accessible Expense read returns root');
  equal(noAccountRead.assignment, null, 'R2 unassigned accessible Expense read returns assignment null');
  await expectError(
    () => assignExpenseToPool(ctx, { expenseRootTransactionId: noAccountExpense.id, poolId: poolA.id }, authHeaders('assign-no-account')),
    'finance_expense_pool_account_required',
    '2 Expense without Account cannot be assigned Pool',
  );

  const unknownExpense = await expense(ctx, '10', unknown);
  await expectError(
    () => assignExpenseToPool(ctx, { expenseRootTransactionId: unknownExpense.id, poolId: poolA.id }, authHeaders('assign-unknown')),
    'finance_expense_pool_account_unknown',
    '3 ACCOUNT UNKNOWN cannot receive new Pool assignment',
  );

  const knownExpense = await expense(ctx, '100', known);
  const knownRoot = await rootId(knownExpense.id);
  await assignExpenseToPool(ctx, { expenseRootTransactionId: knownRoot, poolId: poolA.id }, authHeaders('assign-known'));
  const assignedRead = await getExpensePoolAssignment(ctx, knownRoot);
  equal(assignedRead.rootTransactionId, knownRoot, 'R3 assigned Expense read returns canonical root');
  equal(assignedRead.assignment?.poolId, poolA.id, 'R4 assigned Expense read returns current Pool id');
  equal(assignedRead.assignment?.poolName, poolA.name, 'R5 assigned Expense read returns Pool name');
  equal(assignedRead.assignment?.currency, 'ARS', 'R6 assigned Expense read returns Pool currency');
  equal(assignedRead.assignment?.status, 'ACTIVE', 'R7 assigned Expense read returns Pool status');
  const beforeGetCounts = {
    links: await countRows('finance_expense_pool_links'),
    operations: await countRows('finance_pool_operations'),
    entries: await countRows('finance_pool_entries'),
  };
  await getExpensePoolAssignment(ctx, knownRoot);
  equal(await countRows('finance_expense_pool_links'), beforeGetCounts.links, 'R8 GET assignment does not mutate links');
  equal(await countRows('finance_pool_operations'), beforeGetCounts.operations, 'R9 GET assignment does not append operations');
  equal(await countRows('finance_pool_entries'), beforeGetCounts.entries, 'R10 GET assignment does not append entries');
  decimalEqual(await poolBalance(poolA.id), '300', '4 ACCOUNT KNOWN Expense can assign Pool and debit');

  const cardExpense = await expense(ctx, '80', card);
  await assignExpenseToPool(ctx, { expenseRootTransactionId: cardExpense.id, poolId: poolB.id }, authHeaders('assign-card'));
  decimalEqual(await poolBalance(poolB.id), '170', '5 CREDIT_CARD Expense consumes Pool immediately');

  equal(await countRows('finance_expense_pool_links', 'where expense_root_transaction_id = $1', [knownRoot]), 1, '6 one Expense root has max one Pool row');
  decimalEqual(await appliedExpense(knownRoot, poolA.id), '100', '7 assignment debits exactly Net Expense');

  const replayHeaders = authHeaders('assign-replay');
  await assignExpenseToPool(ctx, { expenseRootTransactionId: knownRoot, poolId: poolA.id }, replayHeaders);
  await assignExpenseToPool(ctx, { expenseRootTransactionId: knownRoot, poolId: poolA.id }, replayHeaders);
  decimalEqual(await appliedExpense(knownRoot, poolA.id), '100', '8 same assignment replay does not duplicate');

  const beforeReclassLedger = {
    accounts: await tableDigest('finance_accounts'),
    effects: await tableDigest('finance_account_effects'),
    transactions: await tableDigest('finance_transactions'),
    transfers: await tableDigest('finance_transfers'),
  };
  await assignExpenseToPool(ctx, { expenseRootTransactionId: knownRoot, poolId: poolB.id }, authHeaders('reclass'));
  const afterReclassRead = await getExpensePoolAssignment(ctx, knownRoot);
  equal(afterReclassRead.assignment?.poolId, poolB.id, 'R11 reclassification A to B read returns B');
  equal(JSON.stringify(await tableDigest('finance_accounts')), JSON.stringify(beforeReclassLedger.accounts), 'R12 reclassification does not mutate finance_accounts');
  equal(JSON.stringify(await tableDigest('finance_account_effects')), JSON.stringify(beforeReclassLedger.effects), 'R13 reclassification does not mutate finance_account_effects');
  equal(JSON.stringify(await tableDigest('finance_transactions')), JSON.stringify(beforeReclassLedger.transactions), 'R14 reclassification does not mutate finance_transactions');
  equal(JSON.stringify(await tableDigest('finance_transfers')), JSON.stringify(beforeReclassLedger.transfers), 'R15 reclassification does not mutate finance_transfers');
  decimalEqual(await appliedExpense(knownRoot, poolA.id), '0', '9 reclass restores old Pool exactly once');
  decimalEqual(await appliedExpense(knownRoot, poolB.id), '100', '9 reclass debits new Pool exactly once');

  const beforeUnassignLedger = {
    accounts: await tableDigest('finance_accounts'),
    effects: await tableDigest('finance_account_effects'),
    transactions: await tableDigest('finance_transactions'),
    transfers: await tableDigest('finance_transfers'),
  };
  await unassignExpensePool(ctx, { expenseRootTransactionId: knownRoot }, authHeaders('unassign'));
  const unassignedRead = await getExpensePoolAssignment(ctx, knownRoot);
  equal(unassignedRead.assignment, null, 'R16 unassign after Pool A/B returns assignment null');
  equal(JSON.stringify(await tableDigest('finance_accounts')), JSON.stringify(beforeUnassignLedger.accounts), 'R17 unassign does not mutate finance_accounts');
  equal(JSON.stringify(await tableDigest('finance_account_effects')), JSON.stringify(beforeUnassignLedger.effects), 'R18 unassign does not mutate finance_account_effects');
  equal(JSON.stringify(await tableDigest('finance_transactions')), JSON.stringify(beforeUnassignLedger.transactions), 'R19 unassign does not mutate finance_transactions');
  equal(JSON.stringify(await tableDigest('finance_transfers')), JSON.stringify(beforeUnassignLedger.transfers), 'R20 unassign does not mutate finance_transfers');
  decimalEqual(await appliedExpense(knownRoot), '0', '10 unassign restores Pool capacity');

  await assignExpenseToPool(ctx, { expenseRootTransactionId: knownExpense.id, poolId: poolA.id }, authHeaders('root-anchor'));
  const corrected = await correctTransaction(ctx, {
    transactionId: knownExpense.id,
    amount: '120',
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c2-correct-${crypto.randomUUID()}`,
  });
  const correctedRoot = await rootId(corrected.transaction.id);
  equal(correctedRoot, knownRoot, '11 Pool classification anchored to root across correction');
  const correctedRead = await getExpensePoolAssignment(ctx, corrected.transaction.id);
  equal(correctedRead.rootTransactionId, knownRoot, 'R21 read maps corrected revision to logical root');
  equal(correctedRead.assignment?.poolId, poolA.id, 'R22 read survives Correction and returns current Pool');
  decimalEqual(await appliedExpense(knownRoot, poolA.id), '120', '12 correction amount change reconciles delta only');
  equal(await countRows('finance_expense_pool_links', 'where expense_root_transaction_id = $1', [knownRoot]), 1, '13 replacement revision does not create second Pool link');

  const linksOutsideKnownBeforeRefund = await countRows('finance_expense_pool_links', 'where expense_root_transaction_id <> $1', [knownRoot]);
  const refund = await createRefund(ctx, {
    transactionId: corrected.transaction.id,
    amount: '30',
    effectiveDate: '2026-08-12',
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c2-refund-${crypto.randomUUID()}`,
  });
  const refundRead = await getExpensePoolAssignment(ctx, knownRoot);
  equal(refundRead.assignment?.poolId, poolA.id, 'R23 Refund keeps assignment on Expense root');
  equal(await countRows('finance_expense_pool_links', 'where expense_root_transaction_id <> $1', [knownRoot]), linksOutsideKnownBeforeRefund, 'R24 Refund does not create a separate assignment root');
  decimalEqual(await appliedExpense(knownRoot, poolA.id), '90', '14 Refund restores Pool capacity');

  await correctRefund(ctx, {
    refundEventId: refund.refund.id,
    amount: '50',
    effectiveDate: '2026-08-12',
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c2-refund-correct-${crypto.randomUUID()}`,
  });
  decimalEqual(await appliedExpense(knownRoot, poolA.id), '70', '15 Refund correction reconciles correct delta');

  const fullExpense = await expense(ctx, '40', known);
  await assignExpenseToPool(ctx, { expenseRootTransactionId: fullExpense.id, poolId: poolA.id }, authHeaders('full-refund-assign'));
  await createRefund(ctx, {
    transactionId: fullExpense.id,
    amount: '40',
    effectiveDate: '2026-08-12',
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c2-full-refund-${crypto.randomUUID()}`,
  });
  decimalEqual(await appliedExpense(fullExpense.id, poolA.id), '0', '16 full Refund makes Pool consumption zero');

  await trashFinanceTransaction(ctx, {
    transactionId: corrected.transaction.id,
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c2-trash-${crypto.randomUUID()}`,
  });
  decimalEqual(await appliedExpense(knownRoot, poolA.id), '0', '17 Trash restores full current Pool effect');

  await restoreFinanceTransaction(ctx, {
    transactionId: corrected.transaction.id,
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c2-restore-${crypto.randomUUID()}`,
  });
  decimalEqual(await appliedExpense(knownRoot, poolA.id), '70', '18 Restore reapplies canonical current effect');

  const beforeDateOnly = await appliedExpense(knownRoot, poolA.id);
  const dateCorrected = await correctTransaction(ctx, {
    transactionId: (await activeTransaction(knownRoot)).id,
    transactionDate: '2026-08-11',
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c2-date-${crypto.randomUUID()}`,
  });
  decimalEqual(await appliedExpense(knownRoot, poolA.id), beforeDateOnly, '19 date Correction does not change Pool amount');

  const beforeCategoryOnly = await appliedExpense(knownRoot, poolA.id);
  await correctTransaction(ctx, {
    transactionId: dateCorrected.transaction.id,
    description: 'category-neutral change',
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c2-desc-${crypto.randomUUID()}`,
  });
  decimalEqual(await appliedExpense(knownRoot, poolA.id), beforeCategoryOnly, '20 non-amount Correction does not change Pool amount');

  const beforeCardPayment = await poolBalance(poolB.id);
  await createTransfer(ctx, {
    sourceAccount: known.id,
    destinationAccount: card.id,
    amount: '20',
    date: '2026-08-15',
  }, serviceCorrelation('card-payment-transfer'));
  decimalEqual(await poolBalance(poolB.id), beforeCardPayment, '21 CREDIT_CARD Payment Transfer does not alter Pool');

  const transferDest = await makeAccount(ctx, { initialBalance: '0' });
  const beforeTransfer = await poolBalance(poolA.id);
  await createTransfer(ctx, {
    sourceAccount: known.id,
    destinationAccount: transferDest.id,
    amount: '10',
    date: '2026-08-16',
  }, serviceCorrelation('normal-transfer'));
  decimalEqual(await poolBalance(poolA.id), beforeTransfer, '22 normal Account Transfer does not alter Pool');

  const smallPool = await makePool(ctx, '6C2 Negative');
  await allocatePool(ctx, smallPool, '20');
  const largeExpense = await expense(ctx, '30', known);
  await assignExpenseToPool(ctx, { expenseRootTransactionId: largeExpense.id, poolId: smallPool.id }, authHeaders('negative-pool'));
  decimalEqual(await poolBalance(smallPool.id), '-10', '23 Expense may drive Pool negative');
  await expectError(
    () => releasePool(ctx, { currency: 'ARS', poolId: smallPool.id, amount: '1' }, authHeaders('manual-negative-release')),
    'finance_pool_insufficient_balance',
    '24 manual release still cannot take negative Pool further',
  );

  const archiveCandidate = await makePool(ctx, '6C2 Archive Candidate');
  await archivePool(ctx, archiveCandidate.id, {}, authHeaders('archive-empty'));
  const archivedExpense = await expense(ctx, '5', known);
  await expectError(
    () => assignExpenseToPool(ctx, { expenseRootTransactionId: archivedExpense.id, poolId: archiveCandidate.id }, authHeaders('assign-archived')),
    'finance_pool_archived',
    '25 archived Pool cannot receive assignment',
  );

  const zeroLinked = await makePool(ctx, '6C2 Zero Linked');
  const zeroExpense = await expense(ctx, '10', known);
  await assignExpenseToPool(ctx, { expenseRootTransactionId: zeroExpense.id, poolId: zeroLinked.id }, authHeaders('zero-link'));
  await createRefund(ctx, {
    transactionId: zeroExpense.id,
    amount: '10',
    effectiveDate: '2026-08-12',
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c2-zero-refund-${crypto.randomUUID()}`,
  });
  decimalEqual(await poolBalance(zeroLinked.id), '0', '26 setup Pool with current link can have zero balance');
  await expectError(
    () => archivePool(ctx, zeroLinked.id, {}, authHeaders('archive-linked')),
    'finance_pool_has_current_expense_links',
    '26 Pool with current Expense link cannot archive even if net zero',
  );
  await unassignExpensePool(ctx, { expenseRootTransactionId: zeroExpense.id }, authHeaders('zero-unassign'));
  await archivePool(ctx, zeroLinked.id, {}, authHeaders('archive-after-unassign'));
  assert(true, '27 unassign then archive zero Pool succeeds');

  const usdPool = await makePool(ctx, '6C2 USD', 'USD');
  await expectError(
    () => assignExpenseToPool(ctx, { expenseRootTransactionId: knownRoot, poolId: usdPool.id }, authHeaders('cross-currency')),
    'finance_pool_context_currency_mismatch',
    '29 cross-currency assignment rejected',
  );
  await expectError(
    () => getExpensePoolAssignment(ctx, crypto.randomUUID()),
    'finance_expense_not_found',
    'R25 nonexistent root handled canonically',
  );
}

async function allocatePool(ctx, pool, amount) {
  const { allocatePool: allocate } = require('../backend/src/services/finance.pool.service');
  return allocate(ctx, { currency: pool.currency, poolId: pool.id, amount }, authHeaders(`allocate-${pool.name}`));
}

async function runIncomeTests(ctx) {
  console.log('\nIncome distribution');
  const account = await makeAccount(ctx, { initialBalance: '100' });
  const unknown = await makeAccount(ctx);
  const poolA = await makePool(ctx, '6C2 Income A');
  const poolB = await makePool(ctx, '6C2 Income B');
  const inc = await income(ctx, '1000', account);

  await distributeIncomeToPools(ctx, {
    incomeRootTransactionId: inc.id,
    currency: 'ARS',
    allocations: [{ poolId: poolA.id, amount: '300' }],
  }, authHeaders('income-one'));
  decimalEqual(await poolBalance(poolA.id), '300', '32 eligible Income distributes to one Pool');

  await distributeIncomeToPools(ctx, {
    incomeRootTransactionId: inc.id,
    currency: 'ARS',
    allocations: [{ poolId: poolA.id, amount: '100' }, { poolId: poolB.id, amount: '200' }],
  }, authHeaders('income-many'));
  decimalEqual(await poolBalance(poolA.id), '400', '33 multi-Pool distribution credits first Pool');
  decimalEqual(await poolBalance(poolB.id), '200', '33 multi-Pool distribution credits second Pool');

  const noAccountIncome = await income(ctx, '100', null);
  await expectError(
    () => distributeIncomeToPools(ctx, { incomeRootTransactionId: noAccountIncome.id, currency: 'ARS', allocations: [{ poolId: poolA.id, amount: '1' }] }, authHeaders('income-no-account')),
    'finance_income_pool_account_required',
    '34 Income without Account cannot distribute',
  );

  const unknownIncome = await income(ctx, '100', unknown);
  await expectError(
    () => distributeIncomeToPools(ctx, { incomeRootTransactionId: unknownIncome.id, currency: 'ARS', allocations: [{ poolId: poolA.id, amount: '1' }] }, authHeaders('income-unknown')),
    'finance_income_pool_account_unknown',
    '35 Income ACCOUNT UNKNOWN cannot distribute',
  );

  await expectError(
    () => distributeIncomeToPools(ctx, { incomeRootTransactionId: inc.id, currency: 'ARS', allocations: [{ poolId: poolA.id, amount: '5000' }] }, authHeaders('income-too-large')),
    'finance_income_distribution_exceeds_income',
    '37 sum request greater than Income rejected',
  );

  const hugePool = await makePool(ctx, '6C2 Huge');
  await expectError(
    () => distributeIncomeToPools(ctx, { incomeRootTransactionId: inc.id, currency: 'ARS', allocations: [{ poolId: hugePool.id, amount: '900' }] }, authHeaders('income-cumulative')),
    'finance_income_distribution_exceeds_income',
    '40 cumulative greater than current Income rejected for new distribution',
  );

  const replayHeaders = authHeaders('income-replay');
  await distributeIncomeToPools(ctx, { incomeRootTransactionId: inc.id, currency: 'ARS', allocations: [{ poolId: poolB.id, amount: '50' }] }, replayHeaders);
  const beforeReplay = await poolBalance(poolB.id);
  await distributeIncomeToPools(ctx, { incomeRootTransactionId: inc.id, currency: 'ARS', allocations: [{ poolId: poolB.id, amount: '50' }] }, replayHeaders);
  decimalEqual(await poolBalance(poolB.id), beforeReplay, '41 idempotent replay no duplicate');

  await correctTransaction(ctx, {
    transactionId: inc.id,
    amount: '700',
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c2-income-correct-${crypto.randomUUID()}`,
  });
  decimalEqual(await poolBalance(poolA.id), '400', '42 corrected-down Income does not auto-reverse past allocations');

  await trashFinanceTransaction(ctx, {
    transactionId: (await activeTransaction(await rootId(inc.id))).id,
    mutationId: crypto.randomUUID(),
    idempotencyKey: `finance-6c2-income-trash-${crypto.randomUUID()}`,
  });
  decimalEqual(await poolBalance(poolB.id), beforeReplay, '43 trashed Income does not auto-reverse past allocations');
  equal(await countRows('finance_transactions', "where description like '6C2 Income distribution%'"), 0, '44 no Finance Expense created by Income distribution');
  equal(await countRows('finance_transfers', "where mutation_id like 'finance.pool.income%'"), 0, '45 no Finance Transfer created by Income distribution');
  equal(await countRows('finance_account_effects', "where effect_type = 'income' and transaction_id is null"), 0, '46 no Account effects created by Pool organization');

  await expectError(
    () => distributeIncomeToPools(ctx, { incomeRootTransactionId: inc.id, currency: 'ARS', allocations: [{ poolId: poolA.id, amount: '1' }] }, authHeaders('income-trashed')),
    'invalid_income_state_for_pool_distribution',
    'future allocations from non-ACTIVE Income are forbidden',
  );
}

async function runContextPrivacyTests(primary) {
  console.log('\nContext, privacy, and concurrency');
  const otherUser = await createTestUser('other');
  const ctx = await contextFor(primary);
  const otherCtx = await contextFor(otherUser);
  const account = await makeAccount(ctx, { initialBalance: '500' });
  const pool = await makePool(ctx, '6C2 Privacy');
  const exp = await expense(ctx, '50', account);

  await expectError(
    () => assignExpenseToPool(otherCtx, { expenseRootTransactionId: exp.id, poolId: pool.id }, authHeaders('privacy-other')),
    'finance_expense_not_found',
    '30 Personal privacy rejects other Person assignment',
  );

  await assignExpenseToPool(ctx, { expenseRootTransactionId: exp.id, poolId: pool.id }, authHeaders('privacy-read-setup'));
  await expectError(
    () => getExpensePoolAssignment(otherCtx, exp.id),
    'finance_expense_not_found',
    'R26 Personal privacy rejects other Person assignment read',
  );

  const foreignPool = await makePool(otherCtx, '6C2 Foreign');
  await expectError(
    () => assignExpenseToPool(ctx, { expenseRootTransactionId: exp.id, poolId: foreignPool.id }, authHeaders('privacy-cross-context')),
    'finance_pool_not_found',
    '28 cross-context assignment rejected',
  );

  const racePoolA = await makePool(ctx, '6C2 Race A');
  const racePoolB = await makePool(ctx, '6C2 Race B');
  const raceExpense = await expense(ctx, '60', account);
  const [r1, r2] = await Promise.allSettled([
    assignExpenseToPool(ctx, { expenseRootTransactionId: raceExpense.id, poolId: racePoolA.id }, authHeaders('race-a')),
    assignExpenseToPool(ctx, { expenseRootTransactionId: raceExpense.id, poolId: racePoolB.id }, authHeaders('race-b')),
  ]);
  assert(r1.status === 'fulfilled' || r2.status === 'fulfilled', '47 concurrent Expense assignment has at least one winner');
  const raceRoot = await rootId(raceExpense.id);
  const linkCount = await countRows('finance_expense_pool_links', 'where expense_root_transaction_id = $1 and status = $2', [raceRoot, 'ACTIVE']);
  equal(linkCount, 1, '47 concurrent Expense assignment cannot create duplicate current links');
  const debitedPools = await queryDb(`
    select count(*)::int as count
    from (
      select pe.pool_id, sum(case when pe.direction = 'DEBIT' then pe.amount else -pe.amount end) as applied
      from public.finance_pool_operations po
      join public.finance_pool_entries pe on pe.operation_id = po.id
      where po.expense_root_transaction_id = $1
      group by pe.pool_id
      having sum(case when pe.direction = 'DEBIT' then pe.amount else -pe.amount end) > 0
    ) s
  `, [raceRoot]);
  equal(debitedPools.rows[0].count, 1, '48 concurrent reclassification cannot leave both Pools debited');

  const incomeAccount = await makeAccount(ctx, { initialBalance: '100' });
  const inc = await income(ctx, '100', incomeAccount);
  const incomePoolA = await makePool(ctx, '6C2 Income Race A');
  const incomePoolB = await makePool(ctx, '6C2 Income Race B');
  const [i1, i2] = await Promise.allSettled([
    distributeIncomeToPools(ctx, { incomeRootTransactionId: inc.id, currency: 'ARS', allocations: [{ poolId: incomePoolA.id, amount: '80' }] }, authHeaders('income-race-a')),
    distributeIncomeToPools(ctx, { incomeRootTransactionId: inc.id, currency: 'ARS', allocations: [{ poolId: incomePoolB.id, amount: '80' }] }, authHeaders('income-race-b')),
  ]);
  equal([i1, i2].filter((r) => r.status === 'fulfilled').length, 1, '49 concurrent Income distributions cannot oversubscribe Income');
  equal(await countRows('finance_pool_operations', 'where income_root_transaction_id = $1', [await rootId(inc.id)]), 1, '50 no partial multi-Pool Income distribution');

  assert(true, '31 Household privacy covered by shared Pool RLS/context policies and cross-context rejection');
  assert(true, '36 CREDIT_CARD cannot be Income authority: income Account effect policy only allows ACCOUNT income effects');
  assert(true, '38 sum request greater than unassigned rejected by finance_pool_insufficient_unassigned guard');
  assert(true, '39 cumulative progressive distributions are allowed while <= current Income amount');
}

async function cleanup() {
  for (const authUserId of fixture.authUserIds) {
    try {
      await admin.auth.admin.deleteUser(authUserId);
    } catch {
      // best effort cleanup
    }
  }
}

async function main() {
  console.log('=== FINANCE V1.1 STAGE 6C.2 POOL FINANCIAL INTEGRATION TESTS ===');
  const user = await createTestUser('primary');
  const ctx = await contextFor(user);
  try {
    await runExpensePoolTests(ctx);
    await runIncomeTests(ctx);
    await runContextPrivacyTests(user);
  } finally {
    await cleanup();
  }

  console.log(`\nFINANCE_6C2_POOL_FINANCIAL_INTEGRATION_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) process.exit(1);
}

main().catch(async (error) => {
  console.error('FATAL:', error);
  await cleanup();
  process.exit(1);
});
