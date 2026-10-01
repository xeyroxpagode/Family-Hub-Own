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

runTest('A. Organization reachable from Resumen → Tu dinero and Papelera owned by Movimientos', () => {
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const poolSummary = read('front/mi-front-limpio/components/finance/FinancePoolSummary.tsx');
  const management = read('front/mi-front-limpio/components/finance/FinancePoolManagementScreen.tsx');

  assert(poolSummary.includes('onOrganize') && poolSummary.includes('Organizar'), 'A1 Tu dinero exposes Organization entry');
  assert(financeScreen.includes("navigation.navigate('FinancePoolManagement'"), 'A2 Resumen wires Organizar to Organization');
  assert(!financeScreen.includes('accessibilityLabel="Abrir Cuentas"'), 'A3 duplicate Cuentas overflow entry removed');
  assert(!financeScreen.includes('ellipsis-horizontal" size={22} color={colors.text.primary}'), 'A4 Finance header overflow removed');
  assert(financeScreen.includes('accessibilityLabel="Abrir Papelera"') && financeScreen.includes('onOpenTrash={openPapelera}'), 'A5 Papelera remains reachable from Movimientos');
  assert(management.includes('AccountDetailSheet') && management.includes('onPress={() => handleDetailAccount(account)}'), 'A6 Organization account rows navigate to detail');
  assert(management.includes('onPress={() => handleDetailAccount(card)}'), 'A7 Organization card rows navigate to detail');
});

runTest('B / E / F / G. Account / Card surfaces', () => {
  const accountForm = read('front/mi-front-limpio/components/finance/AccountFormSheet.tsx');
  const accountDetail = read('front/mi-front-limpio/components/finance/AccountDetailSheet.tsx');
  const accountEdit = read('front/mi-front-limpio/components/finance/AccountEditSheet.tsx');
  const moneyInputValue = read('front/mi-front-limpio/services/finance/moneyInputValue.ts');

  assert(moneyInputValue.includes('USD') && moneyInputValue.includes('EUR'), 'B5/B6 currency registry exposes ARS + USD (+ EUR)');
  const chooseCurrency = accountForm.slice(accountForm.indexOf('const chooseCurrency'), accountForm.indexOf('const submit'));
  assert(chooseCurrency.includes("setAmountText('')"), 'B7 currency switch clears the amount');
  assert(!accountForm.includes('No lo sé') && !accountForm.includes("type BalanceMode = 'unknown'"), 'B8 create flow no longer exposes UNKNOWN balance choice');
  assert(accountForm.includes('initialBalance: {') && accountForm.includes("?? (!amountText.trim() ? '0' : null)"), 'B9 create flow writes explicit zero-or-entered initial balance');
  assert(accountForm.includes('closingDayTouched') && accountForm.includes('submitAttempted'), 'B10 card day validation waits for touch or submit');
  assert(accountForm.includes('closingDayInvalid && (closingDayTouched || submitAttempted)'), 'B11 valid closing day values do not render a preventive error');
  assert(accountForm.includes('dueDayInvalid && (dueDayTouched || submitAttempted)'), 'B12 valid due day values do not render a preventive error');
  assert(accountForm.includes('onBlur={() => setClosingDayTouched(true)}') && accountForm.includes('onBlur={() => setDueDayTouched(true)}'), 'B13 invalid day errors can appear after field interaction');
  assert(!accountForm.includes('styles.contextSummary'), 'B14 duplicate financial context card removed from create form');

  assert(!accountDetail.includes('Corregir saldo') && !accountDetail.includes('Establecer saldo'), 'E27 detail no longer exposes separate Corregir saldo / Establecer saldo action');
  assert(accountDetail.includes('Editar') && accountDetail.includes('Archivar'), 'E27 overflow reduced to Editar + Archivar');
  assert(accountEdit.includes('createFinanceAccountBalanceAnchor') && accountEdit.includes('correctFinanceAccountBalance'), 'E29 edit uses canonical anchor/correction for balance');
  assert(accountEdit.includes('updateFinanceAccount'), 'E28 edit still renames via metadata update');
  assert(accountEdit.includes('closingDayTouched') && accountEdit.includes('submitAttempted'), 'E30 edit card day validation waits for touch or submit');
  assert(!accountEdit.includes('cardTimingValid && hasChange'), 'E31 edit submit can surface invalid day errors instead of hiding behind a disabled button');

  assert(accountDetail.includes('Pagar tarjeta'), 'F38 card detail exposes Pagar tarjeta primary action');
  assert(accountDetail.includes('COMPRAS RECIENTES') && accountDetail.includes("item.effectType === 'expense' || item.effectType === 'refund'"), 'F39 card detail filters recent purchases away from payment transfers');
  assert(accountDetail.includes('size="content"'), 'G42 short detail uses content-driven sheet height');
});

console.log(`\nFINANCE_8C8D1_ACCOUNTS_CARDS_POLISH_FRONTEND_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_8C8D1_ACCOUNTS_CARDS_POLISH_FRONTEND_TESTS=FAIL');
  process.exit(1);
}
console.log('FINANCE_STAGE_8C8D1_ACCOUNTS_CARDS_POLISH_FRONTEND_TESTS=PASS');
