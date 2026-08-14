import fs from 'node:fs';
import path from 'node:path';
import {
  MONEY_INPUT_CURRENCIES,
  formatMoneyInputDisplay,
  isMoneyInputCurrency,
  parseMoneyInputText,
} from '../front/mi-front-limpio/services/finance/moneyInputValue';

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

function listFiles(dir: string): string[] {
  const full = path.join(repositoryRoot, dir);
  const entries = fs.readdirSync(full, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(rel);
    return [rel];
  });
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

runTest('T01-T10 amount contract', () => {
  const empty = parseMoneyInputText('', 'ARS');
  assertEqual(empty.status, 'empty', 'T01 empty state supported');
  assertEqual(empty.technicalValue, null, 'T01 empty has no technical value');

  const integer = parseMoneyInputText('42000', 'ARS');
  assertEqual(integer.status, 'valid', 'T02 valid integer amount');
  assertEqual(integer.technicalValue, { amount: '42000', currency: 'ARS' }, 'T02 technical integer value');

  const decimal = parseMoneyInputText('42000,50', 'ARS');
  assertEqual(decimal.status, 'valid', 'T03 valid decimal amount');
  assertEqual(decimal.technicalValue, { amount: '42000.5', currency: 'ARS' }, 'T03 canonical decimal uses dot');

  assertEqual(parseMoneyInputText('0', 'ARS').status, 'zero', 'T04 zero recognized invalid for submit');
  assertEqual(parseMoneyInputText('-42000', 'ARS').status, 'invalid', 'T05 negative user-entered financial amount not accepted as canonical magnitude');
  assertEqual(parseMoneyInputText('42a000', 'ARS').status, 'invalid', 'T06 invalid characters handled safely');

  const formatted = parseMoneyInputText('42.000,50', 'ARS');
  assertEqual(formatted.canonicalAmount, '42000.5', 'T07 formatting does not change canonical amount');
  assertEqual(formatMoneyInputDisplay(formatted.canonicalAmount), '42.000,5', 'T07 display formatting remains localized');
  assertEqual(parseMoneyInputText('1.000', 'ARS').canonicalAmount, '1000', 'T08 editing formatted value does not corrupt amount');

  const cleared = parseMoneyInputText('   ', 'ARS');
  assertEqual(cleared.status, 'empty', 'T09 clearing amount returns to empty state');
  assertEqual(parseMoneyInputText('1,2345', 'ARS').canonicalAmount, '1.2345', 'T10 four decimal places are preserved');
  assertEqual(parseMoneyInputText('1,23456', 'ARS').status, 'invalid', 'T10 no silent rounding beyond supported precision');
});

runTest('T11-T16 currency contract', () => {
  const component = read('front/mi-front-limpio/components/finance/MoneyInput.tsx');
  assert(component.includes('accessibilityLabel={`Moneda ${currency}`}') && component.includes('{currency}'), 'T11 Currency is visible');
  assertEqual(parseMoneyInputText('1000', 'USD').technicalValue, { amount: '1000', currency: 'USD' }, 'T12 canonical currency code produced');
  assertEqual(parseMoneyInputText('1000', 'EUR').canonicalAmount, '1000', 'T13 changing Currency preserves numeric magnitude');
  assert(!/exchangeRate|fxRate|convertCurrency|conversionRate|tipo de cambio/i.test(component), 'T14 no automatic FX conversion');
  assert(component.includes('sin convertir el valor'), 'T14 user-facing hint states no FX conversion');
  assert(!/currency\s*=\s*['"]ARS['"]/.test(component), 'T15 no hidden silent Currency default in component props');
  assertEqual(isMoneyInputCurrency('ARS'), true, 'T16 ARS supported');
  assertEqual(isMoneyInputCurrency('BRL'), true, 'T16 valid ISO-style code is accepted when backend exposes it');
  assertEqual(isMoneyInputCurrency('ars'), false, 'T16 lowercase invalid/unsupported selection cannot create canonical value');
  assertEqual(MONEY_INPUT_CURRENCIES, ['ARS', 'USD', 'EUR'] as const, 'T16 default visible currency options are not global authority');
});

runTest('T17-T23 component boundaries', () => {
  const component = read('front/mi-front-limpio/components/finance/MoneyInput.tsx');
  const helper = read('front/mi-front-limpio/services/finance/moneyInputValue.ts');
  const combined = `${component}\n${helper}`;

  assert(!/transactionType|Expense|Income|Transfer|createExpense|createIncome/i.test(combined), 'T17 component does not know Transaction type');
  assert(!/FinancialContext|FINANCE_CONTEXT|personal|household|ContextSelector/i.test(component), 'T18 component does not know Financial Context');
  assert(!/Category|categoryId|finance_categories/i.test(component), 'T19 component does not know Category');
  assert(!/Account|accountId|Efectivo|Cuenta|Tarjeta|Origen/i.test(component), 'T20 component does not know Account');
  assert(!/fetch\(|axios|supabase|POST|\/api\/finance/i.test(combined), 'T21 component performs no API mutation');
  assert(!/finance_transactions|insert|database|migration/i.test(combined), 'T22 component performs no DB persistence');
  assert(component.includes('onValueChange') && component.includes('onCurrencyChange'), 'T23 value can be consumed by future Expense and Income flows');
});

runTest('T24-T30 UX and accessibility static contract', () => {
  const component = read('front/mi-front-limpio/components/finance/MoneyInput.tsx');

  assert(component.includes('TextInput') && component.includes('onChangeText'), 'T24 amount input focus works through native TextInput');
  assert(component.includes('keyboardType') && component.includes('decimal-pad') && component.includes('inputMode="decimal"'), 'T25 numeric keyboard requested appropriately');
  assert(component.includes('setCurrencyExpanded(false)') && !component.includes("onValueChange(parseMoneyInputText(value"), 'T26 currency selection does not lose amount');
  assert(component.includes('memo(function MoneyInput') && component.includes('useMemo'), 'T27 repeated typing remains stable');
  assert(component.includes('selectionColor') && !component.includes('formatMoneyInputDisplay(value)'), 'T28 decimal editing remains stable without formatting loop');
  assert(component.includes('accessibilityLabel="Monto de dinero"') && component.includes('accessibilityHint="Cambia la moneda'), 'T29 accessibility labels present');
  assert(component.includes('minWidth: 0') && component.includes('minHeight: 76') && component.includes('touchTargets.normal'), 'T30 no layout overflow on normal mobile widths');
});

runTest('Static no backend/schema/navigation/debug expansion', () => {
  const frontendFiles = listFiles('front/mi-front-limpio').filter((file) => /\.(ts|tsx)$/.test(file));
  const productionText = frontendFiles.map((file) => read(file)).join('\n');
  const backendFiles = listFiles('backend/src').filter((file) => /\.(js|ts)$/.test(file));
  const backendText = backendFiles.map((file) => read(file)).join('\n');
  const migrationFiles = fs.readdirSync(path.join(repositoryRoot, 'supabase/migrations')).filter((name) => /finance/i.test(name)).sort();
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const navTypes = read('front/mi-front-limpio/navigation/types.ts');
  const homeTabs = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');

  assert(!financeScreen.includes('MoneyInput'), '2D does not mount MoneyInput into FinanceScreen');
  assert(!/MoneyInputHarness|MoneyInputDebug|FinanceMoneyInputPreview/.test(productionText), 'no permanent debug harness added');
  assert(!/DatePicker|Description|Notes|Category|Account|Guardar gasto|Guardar ingreso/.test(read('front/mi-front-limpio/components/finance/MoneyInput.tsx')), 'negative scope remains amount and currency only');
  assert(!/MoneyInput/.test(navTypes) && !/MoneyInput/.test(homeTabs), 'no navigation route added for MoneyInput');
  assert(!/MoneyInput|moneyInput/i.test(backendText), 'backend unchanged by MoneyInput');
  assertEqual(
    migrationFiles,
    [
      '20260813010000_finance_category_authority_v1_1.sql',
      '20260813020000_finance_expense_income_transactions_v1_1.sql',
    ],
    'no DB/schema change after 2C',
  );
});

console.log(`\nFINANCE_2D_MONEY_INPUT_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_2D_MONEYINPUT_TESTS=FAIL');
  process.exit(1);
}

console.log('FINANCE_STAGE_2D_MONEYINPUT_TESTS=PASS');
