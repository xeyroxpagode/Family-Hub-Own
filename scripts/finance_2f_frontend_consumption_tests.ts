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
  const decimalFormatterStart = display.indexOf('export function formatFinanceDecimalString');
  const decimalFormatterEnd = display.indexOf('export function formatFinanceAmount', decimalFormatterStart);
  const decimalFormatter = display.slice(decimalFormatterStart, decimalFormatterEnd);
  assert(!decimalFormatter.includes('Number(') && !decimalFormatter.includes('parseFloat') && !decimalFormatter.includes('parseInt'), 'T12 decimal string formatting does not use lossy Number conversion');
  assertEqual(formatFinanceDecimalString('9007199254740993.5'), '9.007.199.254.740.993,5', 'T12 large decimal string formats without precision loss');
  assert(screen.includes('movement.currency') && screen.includes('formatFinanceAmount(movement.amount, movement.currency'), 'T13 movement native currency preserved');
  assertEqual(financeMovementTitle('expense', 'Supermercado'), 'Supermercado', 'T14 description rendered when present');
  assertEqual(financeMovementTitle('expense', null), 'Gasto', 'T15 null description gets presentation-only Gasto fallback');
  assertEqual(financeMovementTitle('income', '   '), 'Ingreso', 'T15 blank description gets presentation-only Ingreso fallback');
  assert(service.includes('categoryLabelSnapshot: categoryLabel') && screen.includes('movement.categoryLabel') && screen.includes('{movement.categoryLabel}'), 'T16 categoryLabelSnapshot is normalized and rendered when present');
  assert(!/listFinanceExpenseCategories\(.*movement|categoryLabelSnapshot.*listFinanceExpenseCategories/s.test(screen), 'T17 no current Category lookup rewrites snapshot');
  const newMovement = read('front/mi-front-limpio/components/finance/NewMovementSheet.tsx');
  assert(!screen.includes('Sin categoria') && !screen.includes('Sin categoría') && newMovement.includes('Sin categoría') && !newMovement.includes('Sin categoria'), 'T18 null movement Category does not create fake list fallback, while forms use correct es-AR copy');
  assert(screen.includes('groupMovementsByTransactionDate') && service.includes('transactionDate: date') && screen.includes('movement.date'), 'T19 transaction date owns normalized grouping');
  assert(!screen.includes('.sort('), 'T20 backend ordering is preserved by the frontend');
  assert(screen.includes('Sin movimientos este mes') && screen.includes('No hay movimientos que coincidan con estos filtros'), 'T21 empty movement state adapts to all-selected vs subset filters');
  assert(screen.includes('accessibilityLabel="Nuevo movimiento"') && screen.includes('setNewMovementVisible(true)'), 'T22 local + remains available in empty state');
  assert(
    !screen.includes('styles.movementsHeader') &&
      !screen.includes('MOVIMIENTOS') &&
      screen.includes('<FinancePeriodControl period={period} onMovePeriod={onMovePeriod} />') &&
      screen.includes('<FinanceUtilityRow') &&
      screen.includes('<FinancePeriodNavigator') &&
      screen.includes('accessibilityLabel="Abrir Papelera"') &&
      screen.includes('accessibilityLabel="Nuevo movimiento"'),
    'T22 runtime IA keeps period, Papelera/+ actions, and removes redundant movement title labels',
  );
  assert(
    screen.includes('MovementTypeFilterKey') &&
      screen.includes('normalizeMovementFilters') &&
      screen.includes('toggleMovementFilter') &&
      screen.includes('<SegmentedControl') &&
      screen.includes('selectionMode="multiple"') &&
      screen.includes('testID="finance-movement-filter"') &&
      !screen.includes('filterPill') &&
      !screen.includes('styles.connectedFilter'),
    'T22 runtime IA uses one connected multiselect filter instead of floating chips',
  );
});

runTest('T23-T33 Resumen read and currency contract', () => {
  const service = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  const screen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');

  assert(service.includes("'/api/finance/summary") || service.includes('/api/finance/summary?'), 'T23 real summary service calls 2F-A endpoint');
  assert(screen.includes('Gastamos') && screen.includes('Ingresó') && screen.includes('Balance'), 'T24 one currency renders Gastamos/Ingresó/Balance');
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

  assert(read('front/mi-front-limpio/services/finance/financeMovements.ts').includes('accountName: movement.accountName ?? null'), 'T45 movement DTO preserves associated account when disclosure is allowed');
  assert(!/readFinanceTransfers|getFinanceTransfers|\/api\/finance\/transfers\?/.test(financeFrontend), 'T46 no Transfer read behavior added to 2F movement/summary consumption');
  assert(!/Budget|Presupuesto|budget/i.test(financeFrontend), 'T47 no Budget');
  assert(financeScreen.includes('<PaymentsList') && financeScreen.includes('paymentDetailRefreshNonce'), 'T48 current Finance surface includes accepted Payment implementation without mutating movement/summary reads');
  assert(financeScreen.includes('FinanceAnalysisDetail') && financeScreen.includes('getFinanceAnalysis'), 'T49 current Finance surface includes accepted Analysis route/read');
  assert(/createFinanceCategory/.test(financeFrontend) && !/updateFinanceCategory|deleteFinanceCategory|Category management/i.test(financeFrontend), 'T50 contextual category create is allowed; no category manager/edit/delete expansion');
  assert(runJs.includes('finance-2f-ui'), 'T51 frontend-only 2F-B test command is registered');
  [
    '20260813010000_finance_category_authority_v1_1.sql',
    '20260813020000_finance_expense_income_transactions_v1_1.sql',
    '20260831000003_finance_unified_movements_v1_1.sql',
  ].forEach((migration) => {
    assert(migrationFiles.includes(migration), `T52 required accepted Finance read migration exists: ${migration}`);
  });
  assert(!/FinanceDesignSystem|FinanceNavbar|FinanceAppShell|FinanceToast|FinanceQueryProvider|useFinanceQuery|FinanceReliability/i.test(financeFrontend), 'T53 no Finance design/reliability/API parallel subsystem');
});

console.log(`\nFINANCE_2F_FRONTEND_CONSUMPTION_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_2F_B_FRONTEND_CONSUMPTION_TESTS=FAIL');
  process.exit(1);
}

console.log('FINANCE_STAGE_2F_B_FRONTEND_CONSUMPTION_TESTS=PASS');
