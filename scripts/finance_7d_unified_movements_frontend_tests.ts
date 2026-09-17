import fs from 'node:fs';
import path from 'node:path';

const repositoryRoot = path.resolve(__dirname, '..', '..', '..');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
}

function read(rel: string): string {
  return fs.readFileSync(path.join(repositoryRoot, rel), 'utf8');
}

function runTest(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`);
  try {
    fn();
  } catch (error) {
    failCount += 1;
    console.error(`  THREW: ${error instanceof Error ? error.message : String(error)}`);
  }
}

runTest('T01-T03 Discriminated union includes EXPENSE, INCOME, TRANSFER', () => {
  const api = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  assert(api.includes("kind: 'EXPENSE'"), 'T01 FinanceExpenseMovementDto has kind EXPENSE');
  assert(api.includes("kind: 'INCOME'"), 'T02 FinanceIncomeMovementDto has kind INCOME');
  assert(api.includes("kind: 'TRANSFER'"), 'T03 FinanceTransferMovementDto has kind TRANSFER');
  assert(api.includes('FinanceUnifiedMovementDto') && api.includes('FinanceExpenseMovementDto') && api.includes('FinanceIncomeMovementDto') && api.includes('FinanceTransferMovementDto'), 'T03 Union type exists');
});

runTest('T04 listFinanceMovements remains canonical fetch owner', () => {
  const api = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  assert(api.includes('export const listFinanceMovements'), 'T04 listFinanceMovements is exported');
  assert(api.includes('/api/finance/movements?'), 'T04 listFinanceMovements targets /api/finance/movements');
});

runTest('T05 Existing endpoint remains /api/finance/movements', () => {
  const api = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  assert(api.includes('/api/finance/movements?'), 'T05 Endpoint is /api/finance/movements');
});

runTest('T06-T08 Expense/Income/Transfer direction presentation', () => {
  const display = read('front/mi-front-limpio/services/finance/financeDisplay.ts');
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(display.includes("transactionType === 'expense' ? '-' : '+'"), 'T06 Expense shows negative sign');
  assert(screen.includes('tone="danger"') && screen.includes("transactionType: 'expense'"), 'T06 Expense uses danger tone');
  assert(screen.includes('tone="success"') && screen.includes("transactionType: 'income'"), 'T07 Income uses success tone');
  assert(screen.includes('tone="primary"') && screen.includes('kind === \'TRANSFER\''), 'T08 Transfer uses neutral/primary tone');
});

runTest('T09 Same-currency Transfer renders one factual amount', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('isCrossCurrency') && screen.includes('sourceCurrency !== movement.destinationCurrency'), 'T09 Cross-currency detection exists');
  assert(screen.includes('movement.sourceAmount') && screen.includes('movement.sourceCurrency'), 'T09 Same-currency shows source amount');
});

runTest('T10 Cross-currency Transfer renders both factual amounts', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('formatFinanceAmount(movement.sourceAmount, movement.sourceCurrency') && screen.includes('formatFinanceAmount(movement.destinationAmount, movement.destinationCurrency'), 'T10 Cross-currency shows both amounts');
});

runTest('T11 No FX rate/calculation exists', () => {
  const api = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const display = read('front/mi-front-limpio/services/finance/financeDisplay.ts');
  assert(!/exchangeRate|fxRate|convertCurrency|calculateRate/i.test(`${api}\n${screen}\n${display}`), 'T11 No FX calculation in frontend');
});

runTest('T12 ACCOUNT -> CREDIT_CARD renders card-payment title/path', () => {
  const display = read('front/mi-front-limpio/services/finance/financeDisplay.ts');
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(display.includes('destinationAccount.accountType === \'CREDIT_CARD\'') && display.includes('Pago de tarjeta'), 'T12 financeTransferTitle detects CREDIT_CARD');
  assert(screen.includes('financeTransferTitle(movement)'), 'T12 screen uses financeTransferTitle');
});

runTest('T13 Commission Expense remains independent', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(!screen.includes('Comisión:'), 'T13 Commission is not merged inline into Transfer row in 7D');
  const api = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  assert(api.includes('commission: FinanceTransferCommissionDto | null'), 'T13 Commission DTO exists separately');
});

runTest('T14 Transfer is NOT passed to MovementDetailSheet', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('if (movement.kind === \'TRANSFER\') return;'), 'T14 handleMovementPress filters TRANSFER');
  assert(screen.includes('<View') && screen.includes('kind === \'TRANSFER\''), 'T14 Transfer row is rendered without row press');
});

runTest('T15-T16 Expense/Income still opens MovementDetailSheet', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('<MovementDetailSheet') && screen.includes('movement={selectedMovement}'), 'T15 MovementDetailSheet rendered');
  assert(screen.includes('kind === \'EXPENSE\'') && screen.includes('onMovementPress?.(movement)'), 'T15 Expense triggers detail');
  assert(screen.includes('kind === \'INCOME\'') && screen.includes('onMovementPress?.(movement)'), 'T16 Income triggers detail');
});

runTest('T17 Refund summary preserved for Expense', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('hasRefund') && screen.includes('totalRefunded') && screen.includes('netAmount'), 'T17 Refund summary in list row');
  const detail = read('front/mi-front-limpio/components/finance/MovementDetailSheet.tsx');
  assert(detail.includes('totalRefunded') && detail.includes('netAmount') && detail.includes('Gasto neto'), 'T17 Refund summary in detail');
});

runTest('T18 Full-refund Expense remains one row', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('kind === \'EXPENSE\'') && !screen.includes('split') && !screen.includes('separate'), 'T18 Expense renders as single row');
});

runTest('T19 Backend ordering is not replaced with kind/amount sort', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('groupMovementsByTransactionDate') && screen.includes('movement.date'), 'T19 Groups by movement.date');
  assert(!/\.sort\s*\(/.test(screen), 'T19 No client-side re-sort');
});

runTest('T20 movement.date used for unified date grouping', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('groupMovementsByTransactionDate') && screen.includes('indexByDate.get(movement.date)'), 'T20 Groups by movement.date');
});

runTest('T21 Month with only Transfer rows is not empty', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('groups.length === 0') && screen.includes('No hay gastos, ingresos ni transferencias'), 'T21 Empty state mentions all three kinds');
});

runTest('T22 Personal/Household request behavior preserved', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('contextType: selectedContext') && screen.includes('contextScope'), 'T22 Context passed to listFinanceMovements');
});

runTest('T23 readRefreshNonce behavior preserved', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('readRefreshNonce') && screen.includes('setReadRefreshNonce'), 'T23 readRefreshNonce used');
  assert(screen.includes('readRefreshNonce') && screen.includes('retryReads'), 'T23 readRefreshNonce triggers re-read');
});

runTest('T24 Stable React keys for unified kinds', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('key={`${movement.kind}:${movement.id}`}'), 'T24 Keys include kind prefix');
});

runTest('T25 TransferDetailSheet now exists (7E supersedes 7D)', () => {
  const files = fs.readdirSync(path.join(repositoryRoot, 'front/mi-front-limpio/components/finance')).filter(f => f.endsWith('.tsx'));
  const hasTransferDetail = files.some(f => f.includes('TransferDetail'));
  assert(hasTransferDetail, 'T25 TransferDetailSheet component exists');
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(screen.includes('TransferDetailSheet'), 'T25 TransferDetailSheet imported/used');
});

console.log(`\nFINANCE_7D_UNIFIED_MOVEMENTS_FRONTEND_TESTS pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_7D_UNIFIED_MOVEMENTS_FRONTEND_TESTS=FAIL');
  process.exit(1);
}

console.log('FINANCE_STAGE_7D_UNIFIED_MOVEMENTS_FRONTEND_TESTS=PASS');
