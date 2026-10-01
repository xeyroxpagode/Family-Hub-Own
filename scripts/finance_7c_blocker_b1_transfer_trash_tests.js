'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const readService = require(path.join(root, 'backend/src/services/finance.read.service'));

function queryResult(data) {
  const builder = {
    select() { return builder; },
    eq() { return builder; },
    in() { return builder; },
    is() { return builder; },
    order() { return builder; },
    then(resolve, reject) { return Promise.resolve({ data, error: null }).then(resolve, reject); },
  };
  return builder;
}

async function main() {
  const transactionRows = [
    {
      id: 'expense-1', transaction_type: 'expense', amount: '10.0000', currency: 'ARS',
      transaction_date: '2026-09-10', description: 'Gasto', category_id: 'category-1',
      category_label_snapshot: 'Comida', trashed_at: '2026-09-17T12:00:00Z',
      created_at: '2026-09-10T12:00:00Z', updated_at: '2026-09-17T12:00:00Z',
    },
    {
      id: 'income-1', transaction_type: 'income', amount: '20.0000', currency: 'ARS',
      transaction_date: '2026-09-11', description: 'Ingreso', category_id: 'category-2',
      category_label_snapshot: 'Sueldo', trashed_at: '2026-09-17T11:00:00Z',
      created_at: '2026-09-11T12:00:00Z', updated_at: '2026-09-17T11:00:00Z',
    },
  ];
  const transferRows = [{
    id: 'transfer-1', source_account_id: 'account-ars', destination_account_id: 'account-usd',
    source_amount: '1200.0000', destination_amount: '1.0000', source_currency: 'ARS',
    destination_currency: 'USD', transfer_date: '2026-09-12', description: 'Cambio', notes: null,
    created_at: '2026-09-12T12:00:00Z',
    source_account: { id: 'account-ars', name: 'Pesos', account_type: 'ACCOUNT', currency: 'ARS' },
    destination_account: { id: 'account-usd', name: 'Dólares', account_type: 'ACCOUNT', currency: 'USD' },
  }];
  const client = {
    from(table) {
      if (table === 'finance_transactions') return queryResult(transactionRows);
      if (table === 'finance_transfers') return queryResult(transferRows);
      throw new Error(`Unexpected table: ${table}`);
    },
  };
  const result = await readService.listFinanceTrash({
    client,
    contextType: 'personal',
    personId: 'person-1',
    householdId: null,
    membershipId: null,
  });

  assert.equal(result.movements.find((item) => item.id === 'expense-1').kind, 'EXPENSE');
  assert.equal(result.movements.find((item) => item.id === 'income-1').kind, 'INCOME');
  const transfer = result.movements.find((item) => item.id === 'transfer-1');
  assert.equal(transfer.kind, 'TRANSFER');
  assert.equal(transfer.sourceAmount, '1200.0000');
  assert.equal(transfer.sourceCurrency, 'ARS');
  assert.equal(transfer.destinationAmount, '1.0000');
  assert.equal(transfer.destinationCurrency, 'USD');
  assert.equal(transfer.trashedAt, null);

  const routes = fs.readFileSync(path.join(root, 'backend/src/routes/finance.js'), 'utf8');
  const transferService = fs.readFileSync(path.join(root, 'backend/src/services/finance.transfer.service.js'), 'utf8');
  const screen = fs.readFileSync(
    path.join(root, 'front/mi-front-limpio/screens/finance/FinancePapeleraScreen.tsx'),
    'utf8',
  );
  const detail = fs.readFileSync(
    path.join(root, 'front/mi-front-limpio/components/finance/TrashMovementDetailSheet.tsx'),
    'utf8',
  );

  assert.match(routes, /transfers\/:transferId\/restore/);
  assert.match(transferService, /finance_restore_transfer_v1/);
  assert.match(screen, /movement\.kind === 'TRANSFER'/);
  assert.match(detail, /restoreFinanceTransfer/);
  assert.match(detail, /onRestoreSuccess\(\)/);
  console.log('finance_7c_blocker_b1_transfer_trash_tests: PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
