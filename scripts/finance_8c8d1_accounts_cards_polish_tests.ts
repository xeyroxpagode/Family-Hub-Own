import fs from 'node:fs';
import path from 'node:path';

const repositoryRoot = path.resolve(__dirname, '..', '..', '..');

let passCount = 0;
let failCount = 0;

function read(rel: string): string {
  return fs.readFileSync(path.join(repositoryRoot, rel), 'utf8');
}

function assert(condition: boolean, message: string): void {
  if (condition) { passCount += 1; console.log(`  PASS: ${message}`); return; }
  failCount += 1; console.error(`  FAIL: ${message}`);
}

function runTest(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`);
  try { fn(); } catch (error) { failCount += 1; console.error(`  THREW: ${error instanceof Error ? error.message : String(error)}`); }
}

runTest('A. Accounts reachable from Resumen → Tu dinero', () => {
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const poolSummary = read('front/mi-front-limpio/components/finance/FinancePoolSummary.tsx');

  assert(poolSummary.includes('onOpenAccounts') && poolSummary.includes('Cuentas'), 'A1 Tu dinero exposes a Cuentas entry');
  assert(financeScreen.includes('onOpenAccounts={openAccounts}'), 'A2 Resumen wires Tu dinero Cuentas entry to FinanceAccounts');
  assert(!financeScreen.includes('accessibilityLabel="Abrir Cuentas"'), 'A3 duplicate Cuentas overflow entry removed');
  assert(financeScreen.includes('accessibilityLabel="Abrir Papelera"'), 'A3 Papelera remains in overflow');
});

runTest('B / E / F / G. Account / Card surfaces', () => {
  const accountForm = read('front/mi-front-limpio/components/finance/AccountFormSheet.tsx');
  const accountDetail = read('front/mi-front-limpio/components/finance/AccountDetailSheet.tsx');
  const accountEdit = read('front/mi-front-limpio/components/finance/AccountEditSheet.tsx');
  const moneyInputValue = read('front/mi-front-limpio/services/finance/moneyInputValue.ts');

  assert(moneyInputValue.includes('USD') && moneyInputValue.includes('EUR'), 'B5/B6 currency registry exposes ARS + USD (+ EUR)');
  const chooseCurrency = accountForm.slice(accountForm.indexOf('const chooseCurrency'), accountForm.indexOf('const submit'));
  assert(chooseCurrency.includes("setAmountText('')"), 'B7 currency switch clears the amount');

  assert(!accountDetail.includes('Corregir saldo') && !accountDetail.includes('Establecer saldo'), 'E27 detail no longer exposes separate Corregir saldo / Establecer saldo action');
  assert(accountDetail.includes('Editar') && accountDetail.includes('Archivar'), 'E27 overflow reduced to Editar + Archivar');
  assert(accountEdit.includes('createFinanceAccountBalanceAnchor') && accountEdit.includes('correctFinanceAccountBalance'), 'E29 edit uses canonical anchor/correction for balance');
  assert(accountEdit.includes('updateFinanceAccount'), 'E28 edit still renames via metadata update');

  assert(accountDetail.includes('Pagar tarjeta'), 'F38 card detail exposes Pagar tarjeta primary action');
  assert(accountDetail.includes('size="content"'), 'G42 short detail uses content-driven sheet height');
});

console.log(`\nFINANCE_8C8D1_ACCOUNTS_CARDS_POLISH_FRONTEND_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_8C8D1_ACCOUNTS_CARDS_POLISH_FRONTEND_TESTS=FAIL');
  process.exit(1);
}
console.log('FINANCE_STAGE_8C8D1_ACCOUNTS_CARDS_POLISH_FRONTEND_TESTS=PASS');