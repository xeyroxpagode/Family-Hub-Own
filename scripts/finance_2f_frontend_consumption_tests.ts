import fs from 'node:fs';
import path from 'node:path';
import {
  financeMonthFromLocalDate,
  formatFinanceDateGroupLabel,
  isCurrentFinanceMonth,
  shiftFinanceMonth,
} from '../front/mi-front-limpio/services/finance/financePeriod';
import {
  financeMovementTitle,
  formatFinanceAmount,
  formatFinanceDecimalString,
  isZeroDecimalString,
} from '../front/mi-front-limpio/services/finance/financeDisplay';

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

runTest('T01-T07 selected period and date-only safety', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const period = read('front/mi-front-limpio/services/finance/financePeriod.ts');

  assertEqual(financeMonthFromLocalDate(new Date(2026, 7, 14, 23, 30)), '2026-08', 'T01 current local month produces YYYY-MM');
  assertEqual(shiftFinanceMonth('2026-01', 'previous'), '2025-12', 'T02 previous-month navigation handles January boundary');
  assertEqual(shiftFinanceMonth('2026-12', 'next'), '2027-01', 'T03 next-month navigation handles December boundary');
  assert(screen.includes('selectedPeriod') && screen.includes('<FinanceSummarySurface') && screen.includes('<FinanceMovementsSurface'), 'T04 Resumen and Movimientos share selected period state');
  assert(screen.includes('period={selectedPeriod}') && read('front/mi-front-limpio/services/finance/financeMovements.ts').includes('encodeQuery({ contextType, period })'), 'T05 requests always send explicit period');
  assert(period.includes('getFullYear()') && period.includes('getMonth() + 1') && !period.includes('toISOString()'), 'T06 no UTC-derived implicit month dependency');
  assertEqual(formatFinanceDateGroupLabel('2026-08-13', new Date(2026, 7, 14, 12)), 'AYER', 'T07 transaction DATE grouping cannot timezone-shift day');
});

runTest('T08-T22 Movimientos read and rendering contract', () => {
  const service = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const display = read('front/mi-front-limpio/services/finance/financeDisplay.ts');
  const financeFrontend = [
    ...listFiles('front/mi-front-limpio/screens/finance'),
    ...listFiles('front/mi-front-limpio/components/finance'),
    ...listFiles('front/mi-front-limpio/services/finance'),
  ].filter((file) => /\.(ts|tsx)$/.test(file)).map((file) => read(file)).join('\n');

  assert(service.includes("'/api/finance/movements") || service.includes('/api/finance/movements?'), 'T08 real movement service calls 2F-A endpoint');
  assert(!/supabase\s*\./.test(financeFrontend), 'T09 no direct Supabase read');
  assertEqual(formatFinanceAmount('42000', 'ARS', { sign: 'transaction', transactionType: 'expense' }), '-42.000 ARS', 'T10 Expense amount derives negative visual sign');
  assertEqual(formatFinanceAmount('800000', 'ARS', { sign: 'transaction', transactionType: 'income' }), '+800.000 ARS', 'T11 Income amount derives positive visual sign');
  assert(!display.includes('Number(') && !display.includes('parseFloat') && !display.includes('parseInt'), 'T12 decimal string formatting does not use lossy Number conversion');
  assertEqual(formatFinanceDecimalString('9007199254740993.5'), '9.007.199.254.740.993,5', 'T12 large decimal string formats without precision loss');
  assert(screen.includes('movement.currency') && screen.includes('formatFinanceAmount(movement.amount, movement.currency'), 'T13 movement native currency preserved');
  assertEqual(financeMovementTitle('expense', 'Supermercado'), 'Supermercado', 'T14 description rendered when present');
  assertEqual(financeMovementTitle('expense', null), 'Gasto', 'T15 null description gets presentation-only Gasto fallback');
  assertEqual(financeMovementTitle('income', '   '), 'Ingreso', 'T15 blank description gets presentation-only Ingreso fallback');
  assert(screen.includes('movement.categoryLabelSnapshot') && screen.includes('{movement.categoryLabelSnapshot}'), 'T16 categoryLabelSnapshot rendered when present');
  assert(!/listFinanceExpenseCategories\(.*movement|categoryLabelSnapshot.*listFinanceExpenseCategories/s.test(screen), 'T17 no current Category lookup rewrites snapshot');
  assert(!screen.includes('Sin categoria') && !screen.includes('Sin categoría'), 'T18 null Category does not create fake category');
  assert(screen.includes('groupMovementsByTransactionDate') && screen.includes('movement.transactionDate'), 'T19 transactionDate owns grouping');
  assert(!screen.includes('.sort('), 'T20 backend ordering is preserved by the frontend');
  assert(screen.includes('Sin movimientos en este periodo'), 'T21 empty movement period truthful');
  assert(screen.includes('accessibilityLabel="Nuevo movimiento"') && screen.includes('setNewMovementVisible(true)'), 'T22 local + remains available in empty state');
});

runTest('T23-T33 Resumen read and currency contract', () => {
  const service = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');

  assert(service.includes("'/api/finance/summary") || service.includes('/api/finance/summary?'), 'T23 real summary service calls 2F-A endpoint');
  assert(screen.includes('Gastamos') && screen.includes('Ingresó') && screen.includes('Neto'), 'T24 one currency renders Gastamos/Ingresó/Neto');
  assert(screen.includes('currencies.length > 1 ?') && screen.includes('currencySelector'), 'T25 one currency avoids unnecessary selector');
  assert(screen.includes('currencies.map((bucket)') && screen.includes('Resumen ${bucket.currency}'), 'T26 multiple currencies expose compact selector');
  assert(screen.includes('onSelectCurrency(bucket.currency)') && screen.includes('selectedSummaryBucket'), 'T27 currency switch changes displayed bucket only');
  assert(!/currencies\.reduce|total general|combined|ARS \+ USD/is.test(screen), 'T28 currencies are never summed together');
  assert(!/income\s*-\s*expense|expense\s*\+\s*income|Number\(selectedBucket/.test(screen), 'T29 frontend does not recompute Net');
  assert(screen.includes('Sin actividad financiera') && !screen.includes('$0 ARS'), 'T30 empty currencies [] does not fabricate zero ARS');
  assertEqual(formatFinanceAmount('10', 'ARS', { sign: 'net' }), '+10 ARS', 'T31 positive Net display correct');
  assertEqual(formatFinanceAmount('-10', 'ARS', { sign: 'net' }), '-10 ARS', 'T32 negative Net display correct');
  assertEqual(formatFinanceAmount('0', 'ARS', { sign: 'net' }), '0 ARS', 'T33 zero Net display neutral');
  assertEqual(isZeroDecimalString('0.0000'), true, 'T33 exact zero detection keeps neutral state');
});

runTest('T34-T38 Context and stale response safety', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');

  assert(screen.includes('readScopeKey') && screen.includes('selectedContext') && screen.includes('activeHousehold?.id'), 'T34 Personal to Household reloads reads');
  assert(screen.includes("FINANCE_CONTEXT_TYPES.HOUSEHOLD ? activeHousehold?.id ?? 'none'") && screen.includes('readKeyRef'), 'T35 Household A to B cannot show stale A response');
  assert(screen.includes('selectedPeriod') && screen.includes('readKeyRef.current !== requestKey'), 'T36 period August to July cannot show stale August response');
  assert(screen.includes('AbortController') && screen.includes('controller.abort()'), 'T37 late response is ignored/cancelled safely');
  assert(!/setActiveHousehold|HouseholdSwitcher|getUserHouseholds/.test(screen), 'T38 Finance Context switch still does not mutate global Household');
});

runTest('T39-T44 Create refresh and 2E behavior', () => {
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const sheet = read('front/mi-front-limpio/components/finance/NewMovementSheet.tsx');

  assert(screen.includes('handleCreateSuccess') && screen.includes("operation === 'expense'") && screen.includes('setReadRefreshNonce'), 'T39 successful Expense triggers real read refresh');
  assert(screen.includes('handleCreateSuccess') && screen.includes('Ingreso registrado') && screen.includes('setReadRefreshNonce'), 'T40 successful Income triggers real read refresh');
  assert(!/optimistic|fake|setMovements\(/i.test(screen), 'T41 no optimistic/fake movement row inserted');
  assert(!/setSummary|income\s*-\s*expense|expense\s*\+\s*income|Number\(selectedBucket/i.test(screen), 'T42 no frontend arithmetic mutates summary');
  assert(screen.includes('period: selectedPeriod') && !screen.includes('payload.date === selectedPeriod'), 'T43 create dated outside visible month is governed by backend refresh');
  // 3H: allow type cast in onSuccess call
  assert(/onSuccess\(submittedOperation/.test(sheet) && screen.includes('Gasto registrado') && screen.includes('Ingreso registrado') && screen.includes('duration={2000}'), 'T44 success toast remains accepted 2E behavior');
});

runTest('T45-T53 Negative scope', () => {
  const financeFrontend = [
    ...listFiles('front/mi-front-limpio/screens/finance'),
    ...listFiles('front/mi-front-limpio/components/finance'),
    ...listFiles('front/mi-front-limpio/services/finance'),
  ].filter((file) => /\.(ts|tsx)$/.test(file)).map((file) => read(file)).join('\n');
  const migrationFiles = fs.readdirSync(path.join(repositoryRoot, 'supabase/migrations')).filter((name) => /finance/i.test(name)).sort();
  const runJs = read('tests/run.js');
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');

  assert(!/accountId|account_id|accountName|Cuenta asociada/i.test(financeScreen), 'T45 movement/summary read UI remains account-less after 3H optional Account create UI');
  assert(!/readFinanceTransfers|getFinanceTransfers|\/api\/finance\/transfers\?/.test(financeFrontend), 'T46 no Transfer read behavior added to 2F movement/summary consumption');
  assert(!/Budget|Presupuesto|budget/i.test(financeFrontend), 'T47 no Budget');
  assert(!/Expected Payments|Due|Overdue|settlement|payment implementation/i.test(financeFrontend), 'T48 no Payment implementation');
  assert(!/AnalysisScreen|FinanceAnalysis|Ver analisis|Ver análisis|analysis route/i.test(financeFrontend), 'T49 no Analysis surface or route');
  assert(!/createFinanceCategory|updateFinanceCategory|deleteFinanceCategory|Category management/i.test(financeFrontend), 'T50 no category management');
  assert(runJs.includes('finance-2f-ui'), 'T51 frontend-only 2F-B test command is registered');
  assertEqual(
    migrationFiles,
    [
      '20260813010000_finance_category_authority_v1_1.sql',
      '20260813020000_finance_expense_income_transactions_v1_1.sql',
      '20260814010000_finance_account_authority_v1_1.sql',
      '20260814020000_finance_balance_anchor_account_effects_v1_1.sql',
      '20260814030000_finance_balance_correction_v1_1.sql',
      '20260814040000_finance_credit_card_purchase_semantics_v1_1.sql',
      '20260814050000_finance_canonical_transfer_v1_1.sql',
      '20260814060000_finance_cross_currency_transfer_v1_1.sql',
      '20260814070000_finance_transfer_commission_composition_v1_1.sql',
      '20260814080000_finance_account_effect_status_foundation_v1_1.sql',
    ],
    'T52 only accepted 2B/2C/3A/3B/3C/3D/3E/3F/3G/4B schema migrations exist',
  );
  assert(!/FinanceDesignSystem|FinanceNavbar|FinanceAppShell|FinanceToast|FinanceQueryProvider|useFinanceQuery|FinanceReliability/i.test(financeFrontend), 'T53 no Finance design/reliability/API parallel subsystem');
});

console.log(`\nFINANCE_2F_FRONTEND_CONSUMPTION_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_2F_B_FRONTEND_CONSUMPTION_TESTS=FAIL');
  process.exit(1);
}

console.log('FINANCE_STAGE_2F_B_FRONTEND_CONSUMPTION_TESTS=PASS');
