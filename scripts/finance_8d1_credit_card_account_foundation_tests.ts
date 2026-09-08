import fs from 'node:fs';
import path from 'node:path';

import {
  getAccountBalancePresentation,
  toCanonicalSignedAccountBalance,
} from '../front/mi-front-limpio/services/finance/accountDisplay';

const repositoryRoot = path.resolve(__dirname, '..', '..', '..');

let passCount = 0;
let failCount = 0;

function read(rel: string): string {
  return fs.readFileSync(path.join(repositoryRoot, rel), 'utf8');
}

function assert(condition: boolean, message: string): void {
  if (condition) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
}

function equal<T>(actual: T, expected: T, message: string): void {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
}

function sliceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start === -1) return '';
  if (end === -1) return source.slice(start);
  return source.slice(start, end);
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

runTest('8D.1 balance presentation contract (saldo a favor / deuda)', () => {
  assert(
    toCanonicalSignedAccountBalance('85000', 'CREDIT_CARD') === '-85000',
    'positive UI debt stores canonical negative balance exactly',
  );
  assert(
    toCanonicalSignedAccountBalance('0', 'CREDIT_CARD') === '0',
    'zero debt stays canonical zero',
  );
  assert(
    toCanonicalSignedAccountBalance('5000', 'ACCOUNT') === '5000',
    'ACCOUNT balance is not negated',
  );

  const creditPositive = getAccountBalancePresentation({
    accountType: 'CREDIT_CARD',
    balanceState: 'KNOWN',
    currentBalance: '5000',
    currency: 'ARS',
  });
  assert(creditPositive.label === 'Saldo a favor' && creditPositive.displayAmount === '5000', 'CREDIT_CARD positive balance presents as Saldo a favor');

  const creditDebt = getAccountBalancePresentation({
    accountType: 'CREDIT_CARD',
    balanceState: 'KNOWN',
    currentBalance: '-85000',
    currency: 'ARS',
  });
  assert(creditDebt.label === 'Deuda actual' && creditDebt.displayAmount === '85000', 'CREDIT_CARD negative balance presents as Deuda actual without minus');

  const accountZero = getAccountBalancePresentation({
    accountType: 'ACCOUNT',
    balanceState: 'KNOWN',
    currentBalance: '0',
    currency: 'ARS',
  });
  assert(accountZero.label === 'Saldo actual' && accountZero.displayAmount === '0', 'ACCOUNT zero stays Saldo actual 0');
});

runTest('8D.1 AccountFormSheet card timing UX', () => {
  const form = read('front/mi-front-limpio/components/finance/AccountFormSheet.tsx');

  assert(form.includes('Día de cierre') && form.includes('Día de vencimiento'), 'create card exposes closing and due day fields');
  assert(form.includes('Ingresá un día de cierre entre 1 y 31.') && form.includes('Ingresá un día de vencimiento entre 1 y 31.'), 'human inline day validation copy, no technical codes');
  assert(!form.includes('invalid_credit_card_closing_day') && !form.includes('invalid_credit_card_due_day'), 'no raw RPC/DB technical validation codes in UI');
  assert(form.includes('...(isCreditCard ? { closingDay, dueDay } : {})'), 'create payload sends closing/due only for cards');

  const currencyBody = sliceBetween(form, 'const chooseCurrency', 'const submit');
  assert(!currencyBody.includes('setClosingDayText') && !currencyBody.includes('setDueDayText'), 'currency change retains day metadata');

  const typeBody = sliceBetween(form, 'const chooseAccountType', 'const chooseCurrency');
  assert(typeBody.includes("setClosingDayText('')") && typeBody.includes("setDueDayText('')"), 'type switch clears stale card timing');
  assert(typeBody.includes("parseMoneyInputText('0', currency)"), 'type switch resets amount to zero');
});

runTest('8D.1 AccountDetailSheet card timing display', () => {
  const detail = read('front/mi-front-limpio/components/finance/AccountDetailSheet.tsx');

  assert(detail.includes('Cierre') && detail.includes('Vencimiento'), 'card detail exposes Cierre/Vencimiento');
  assert(detail.includes('Configurar cierre y vencimiento'), 'historical card without days exposes actionable configuration path');
  assert(detail.includes('Datos de tarjeta incompletos'), 'historical card without days is not treated as debt 0');
});

runTest('8D.1 AccountEditSheet card timing edit', () => {
  const edit = read('front/mi-front-limpio/components/finance/AccountEditSheet.tsx');

  assert(edit.includes('Día de cierre') && edit.includes('Día de vencimiento'), 'card edit exposes closing/due for cards');
  assert(edit.includes('isCreditCard ? { closingDay, dueDay } : {}'), 'card edit sends closing/due only for cards');
  assert(edit.includes('parseDayText'), 'card edit validates human numeric day input');
});

console.log(`\nFINANCE_8D1_CREDIT_CARD_ACCOUNT_FOUNDATION_FRONTEND_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_8D1_CREDIT_CARD_ACCOUNT_FOUNDATION_FRONTEND_TESTS=FAIL');
  process.exit(1);
}
console.log('FINANCE_STAGE_8D1_CREDIT_CARD_ACCOUNT_FOUNDATION_FRONTEND_TESTS=PASS');