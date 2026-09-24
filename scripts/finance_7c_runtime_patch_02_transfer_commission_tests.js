'use strict';

/**
 * Finance V1.1 Stage 7C Runtime Patch 02 - Transfer root / commission dependency.
 *
 * Focused static + mocked-service matrix (no DB reset, no network):
 *   - TRANSFER WITHOUT COMMISSION: trash 1 root, commission null.
 *   - TRANSFER WITH COMMISSION: commission excluded as standalone trash row,
 *     disclosed inside the root Transfer DTO.
 *   - SQL migration: ACTIVE-only feed, transfer_id root exclusion, atomic
 *     trash/restore with commission, full-debit floor check, no schema changes.
 *   - Frontend root semantics + detail hierarchy + copy cleanup.
 *   - Expense/Income + Correction + Refund freeze.
 *   - Summary/Analysis still count the commission (no transfer_id exclusion there).
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const readService = require(path.join(root, 'backend/src/services/finance.read.service'));

const MIGRATION = 'supabase/migrations/20260917000050_finance_transfer_commission_lifecycle_v1_1.sql';

// ---------------------------------------------------------------------------
// Minimal in-memory PostgREST mock honoring eq/in/is filters.
// ---------------------------------------------------------------------------
function tableQuery(rows, onFilters) {
  const filters = [];
  const builder = {
    select() { return builder; },
    eq(col, val) { filters.push({ op: 'eq', col, val }); return builder; },
    in(col, vals) { filters.push({ op: 'in', col, vals }); return builder; },
    is(col, val) { filters.push({ op: 'is', col, val }); return builder; },
    order() { return builder; },
    then(resolve, reject) {
      if (typeof onFilters === 'function') onFilters(filters);
      const out = rows.filter((row) => filters.every((filter) => {
        if (filter.op === 'eq') return String(row[filter.col] ?? '') === String(filter.val ?? '');
        if (filter.op === 'is') {
          if (filter.val === null) return row[filter.col] === null || row[filter.col] === undefined;
          return row[filter.col] === filter.val;
        }
        if (filter.op === 'in') return (filter.vals ?? []).map(String).includes(String(row[filter.col] ?? ''));
        return true;
      }));
      return Promise.resolve({ data: out, error: null }).then(resolve, reject);
    },
  };
  return builder;
}

function readFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

async function main() {
  // -------------------------------------------------------------------------
  // 1. SQL migration exists + ACTIVE root feed model.
  // -------------------------------------------------------------------------
  const migration = readFile(MIGRATION);
  assert.match(migration, /finance_list_unified_movements_v1/, 'migration replaces unified movements');
  assert.match(migration, /ft\.transfer_id is null/, 'expense/income CTE excludes dependent commissions');
  assert.match(migration, /ft\.status = 'ACTIVE'/, 'transfer CTE returns ACTIVE transfers only');

  // -------------------------------------------------------------------------
  // 2. Atomic trash/restore with commission + idempotency + floor check.
  // -------------------------------------------------------------------------
  assert.match(migration, /finance_trash_transfer_v1/, 'migration replaces trash transfer');
  assert.match(migration, /finance_restore_transfer_v1/, 'migration replaces restore transfer');
  // Trash: commission ACTIVE -> TRASHED + PRIMARY effect ACTIVE -> REVERSED.
  assert.match(migration, /transaction_id = v_commission\.id/, 'trash/restore touch the commission PRIMARY effect');
  assert.match(migration, /set status = 'TRASHED'/, 'trash moves the dependent commission to TRASHED');
  assert.match(migration, /set status = 'ACTIVE',\s+trashed_at = null/, 'restore returns the commission to ACTIVE');
  // Full-debit floor check (source + commission) via canonical helper.
  assert.match(migration, /v_total_debit/, 'restore computes the full debit being reactivated');
  assert.match(migration, /v_commission\.amount/, 'restore floor check includes the commission amount');
  assert.match(migration, /finance_account_current_balance_text/, 'restore uses the canonical balance helper');
  // Idempotency guard preserved (insert reservation only when fresh).
  const reservationGuards = migration.match(/if v_idempotency_id is null then/g) ?? [];
  assert.equal(reservationGuards.length, 2, 'trash + restore insert idempotency reservation only when fresh');

  // -------------------------------------------------------------------------
  // 3. Migration rule: no schema changes, no new domain state.
  // -------------------------------------------------------------------------
  assert.doesNotMatch(migration, /alter table public\.finance_transfers\s+add column/i, 'no new transfer column');
  assert.doesNotMatch(migration, /alter table public\.finance_transactions\s+add column/i, 'no new transaction column');
  assert.doesNotMatch(migration, /create table/i, 'no new table');
  assert.doesNotMatch(migration, /DEPENDENT_TRASHED|TRANSFER_TRASHED/, 'no invented dependent lifecycle state');
  assert.doesNotMatch(migration, /REVERSED'.*finance_transactions_status_check|finance_transactions.*REVERSED/, 'no REVERSED transaction status invented');
  assert.doesNotMatch(migration, /finance_trash_transaction_v1|finance_restore_transaction_v1/, 'expense/income lifecycle frozen');

  // -------------------------------------------------------------------------
  // 4. Papelera root model (mocked service).
  // -------------------------------------------------------------------------
  const transactionRows = [
    {
      id: 'expense-root-1', root_transaction_id: 'expense-root-1', transfer_id: null,
      transaction_type: 'expense', amount: '10.0000', currency: 'ARS',
      financial_context_type: 'personal', owner_person_id: 'person-1', household_id: null,
      transaction_date: '2026-09-10', description: 'Gasto normal', category_id: 'category-1',
      category_label_snapshot: 'Comida', trashed_at: '2026-09-17T12:00:00Z',
      created_at: '2026-09-10T12:00:00Z', updated_at: '2026-09-17T12:00:00Z',
    },
    {
      // Dependent commission: TRASHED, must never surface as a standalone row.
      id: 'commission-1', root_transaction_id: 'commission-root-1', transfer_id: 'transfer-1',
      transaction_type: 'expense', amount: '3.0000', currency: 'ARS',
      financial_context_type: 'personal', owner_person_id: 'person-1', household_id: null,
      transaction_date: '2026-09-12', description: null, category_id: 'category-costs',
      category_label_snapshot: 'Comisiones e intereses', trashed_at: '2026-09-17T12:00:00Z',
      created_at: '2026-09-12T12:00:00Z', updated_at: '2026-09-17T12:00:00Z',
    },
  ];
  const transferRows = [{
    id: 'transfer-1', source_account_id: 'account-mp', destination_account_id: 'account-visa',
    source_amount: '5.0000', destination_amount: '5.0000', source_currency: 'ARS',
    destination_currency: 'ARS', transfer_date: '2026-09-12', description: null, notes: null,
    status: 'REVERSED',
    created_at: '2026-09-12T12:00:00Z',
    source_account: { id: 'account-mp', name: 'mercadopago', account_type: 'ACCOUNT', currency: 'ARS' },
    destination_account: { id: 'account-visa', name: 'Visa Signature', account_type: 'CREDIT_CARD', currency: 'ARS' },
  }];
  const commissionLookupRows = [{
    id: 'commission-1', root_transaction_id: 'commission-root-1', transfer_id: 'transfer-1',
    amount: '3.0000', currency: 'ARS', status: 'TRASHED',
    created_at: '2026-09-12T12:00:00Z',
  }];

  // finance_transactions serves two calls inside listFinanceTrash: the trash
  // listing (status TRASHED) and the commission lookup (transfer_id IN ...).
  // Each fresh builder records its own filters and applies them generically.
  const seenTransactionFilters = [];
  function transactionsBuilder() {
    const filters = [];
    const builder = {
      select() { return builder; },
      eq(col, val) { filters.push({ op: 'eq', col, val }); return builder; },
      in(col, vals) { filters.push({ op: 'in', col, vals }); return builder; },
      is(col, val) { filters.push({ op: 'is', col, val }); return builder; },
      order() { return builder; },
      then(resolve, reject) {
        seenTransactionFilters.push(filters);
        const wantsTrashed = filters.some(
          (filter) => filter.op === 'eq' && filter.col === 'status' && filter.val === 'TRASHED',
        );
        const dataset = wantsTrashed ? transactionRows : commissionLookupRows;
        const out = dataset.filter((row) => filters.every((filter) => {
          if (!(filter.col in row)) return true;
          if (filter.op === 'eq') return String(row[filter.col] ?? '') === String(filter.val ?? '');
          if (filter.op === 'is') {
            if (filter.val === null) return row[filter.col] === null || row[filter.col] === undefined;
            return row[filter.col] === filter.val;
          }
          if (filter.op === 'in') return (filter.vals ?? []).map(String).includes(String(row[filter.col] ?? ''));
          return true;
        }));
        return Promise.resolve({ data: out, error: null }).then(resolve, reject);
      },
    };
    return builder;
  }
  const client = {
    from(table) {
      if (table === 'finance_transactions') return transactionsBuilder();
      if (table === 'finance_transfers') return tableQuery(transferRows);
      throw new Error(`Unexpected table: ${table}`);
    },
  };

  const trash = await readService.listFinanceTrash({
    client,
    contextType: 'personal',
    personId: 'person-1',
    householdId: null,
    membershipId: null,
  });

  // Papelera root count = 2 (1 normal expense + 1 reversed transfer), zero
  // standalone commission rows.
  assert.equal(trash.movements.length, 2, 'papelera exposes root units only');
  assert.ok(
    !trash.movements.some((item) => item.id === 'commission-1'),
    'dependent commission has no standalone papelera row',
  );
  const trashedTransfer = trash.movements.find((item) => item.id === 'transfer-1');
  assert.equal(trashedTransfer.kind, 'TRANSFER', 'reversed transfer is one root row');
  assert.equal(trashedTransfer.trashedAt, null, 'no invented trash timestamp on transfers');
  assert.deepEqual(
    trashedTransfer.commission,
    { expenseRootTransactionId: 'commission-root-1', amount: '3.0000', currency: 'ARS' },
    'transfer trash DTO discloses the dependent commission additively',
  );
  // The transaction query must carry the canonical root exclusion.
  assert.ok(
    seenTransactionFilters.some((filters) => filters.some(
      (filter) => filter.op === 'is' && filter.col === 'transfer_id' && filter.val === null,
    )),
    'papelera transaction query excludes transfer_id dependents',
  );

  // -------------------------------------------------------------------------
  // 5. Transfer without commission: commission stays null.
  // -------------------------------------------------------------------------
  const lonelyClient = {
    from(table) {
      if (table === 'finance_transactions') return tableQuery([]);
      if (table === 'finance_transfers') return tableQuery([transferRows[0]]);
      throw new Error(`Unexpected table: ${table}`);
    },
  };
  const lonely = await readService.listFinanceTrash({
    client: lonelyClient,
    contextType: 'personal',
    personId: 'person-1',
    householdId: null,
    membershipId: null,
  });
  assert.equal(lonely.movements.length, 1, 'transfer without commission is a single root row');
  assert.equal(lonely.movements[0].commission, null, 'no commission disclosed when absent');

  // -------------------------------------------------------------------------
  // 6. Summary/Analysis regression: commission still counts financially.
  // -------------------------------------------------------------------------
  const readServiceSource = readFile('backend/src/services/finance.read.service.js');
  // summarizeFinance must not exclude the commission: it stays a real Expense.
  const summarizeSection = readServiceSource.slice(readServiceSource.indexOf('async function summarizeFinance'));
  assert.doesNotMatch(summarizeSection, /transfer_id/, 'summary still includes the commission expense');

  // -------------------------------------------------------------------------
  // 7. Frontend defensive root semantics.
  // -------------------------------------------------------------------------
  const movementsService = readFile('front/mi-front-limpio/services/finance/financeMovements.ts');
  assert.match(movementsService, /!movement\.transferId/, 'active feed defensively drops dependent commissions');
  assert.match(movementsService, /movement as FinanceTransactionTrashMovementDto\)\.transferId/, 'papelera defensively drops dependent commissions');
  assert.match(movementsService, /commission: FinanceTransferCommissionDto \| null/, 'transfer trash DTO carries commission');

  const financeScreen = readFile('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert.match(financeScreen, /if \(movement\.transferId\) return false/, 'filters never match a dependent commission');
  assert.match(financeScreen, /Comisión \$/, 'transfer root row shows concise commission copy');

  const transferDetail = readFile('front/mi-front-limpio/components/finance/TransferDetailSheet.tsx');
  assert.match(transferDetail, /Comisión/, 'active transfer detail discloses the commission');
  assert.doesNotMatch(transferDetail, /Se registra como gasto separado/, 'implementation helper copy removed');

  const trashDetail = readFile('front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx');
  assert.match(trashDetail, /movement\.commission/, 'trash detail reads the disclosed commission');
  assert.match(trashDetail, /label="Comisión"/, 'trash detail hierarchy includes Comisión');
  assert.match(trashDetail, /label="Monto"/, 'trash detail hierarchy includes Monto');

  // -------------------------------------------------------------------------
  // 8. New Transfer copy cleanup (fields and functionality frozen).
  // -------------------------------------------------------------------------
  const newMovement = readFile('front/mi-front-limpio/components/finance/NewMovementSheet.tsx');
  assert.doesNotMatch(newMovement, /Solo cuentas de tipo Cuenta\. Tarjetas de crédito no pueden ser origen\./, 'always-visible source constraint removed from the form');
  assert.match(newMovement, /Elegí una cuenta de origen primero\./, 'conditional source dependency hint kept');
  assert.match(newMovement, /subtitle="Solo cuentas de tipo Cuenta"/, 'picker explanation keeps the constraint where relevant');
  assert.doesNotMatch(newMovement, /Se registra como gasto separado en la cuenta de origen/, 'duplicate commission helper removed');
  assert.doesNotMatch(newMovement, /Se registra como Expense/, 'internal Expense term never exposed');
  assert.match(newMovement, /Se descuenta de la cuenta de origen\./, 'at most one concise commission helper');
  assert.doesNotMatch(newMovement, /No mostramos ni calculamos tipo de cambio/, 'FX narration removed');
  assert.match(newMovement, /Ingresá el monto que llega a destino\./, 'destination helper stays concise');
  assert.match(newMovement, /label="Monto"/, 'source amount keeps the Monto label');
  assert.match(newMovement, /label="Llega"/, 'destination amount keeps the Llega label');

  // -------------------------------------------------------------------------
  // 9. Expense/Income + Correction + Refund freeze.
  // -------------------------------------------------------------------------
  assert.doesNotMatch(migration, /finance_create_expense|finance_create_income/, 'no expense/income creation change');
  assert.doesNotMatch(
    migration,
    /create or replace function public\.finance_(refund|.*correct)/,
    'no refund/correction function change',
  );
  const trashRpc = readFile('supabase/migrations/20260815030000_finance_transaction_trash_mutation_v1_1.sql');
  assert.match(trashRpc, /finance_transaction_dependent_on_transfer/, 'dependent-transaction trash guard remains authoritative');
  const restoreRpc = readFile('supabase/migrations/20260819000000_finance_transaction_restore_mutation_v1_1.sql');
  assert.match(restoreRpc, /finance_transaction_dependent_on_transfer/, 'dependent-transaction restore guard remains authoritative');

  console.log('finance_7c_runtime_patch_02_transfer_commission_tests: PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
