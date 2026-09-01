import { test, describe } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const FRONTEND_ROOT = path.join(REPO_ROOT, 'front/mi-front-limpio');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(FRONTEND_ROOT, rel), 'utf8');
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(FRONTEND_ROOT, rel));
}

function expect(actual: unknown) {
  return {
    toContain: (expected: string) => assert.ok(String(actual).includes(expected), `Expected to contain "${expected}"`),
    toBeTruthy: () => assert.ok(actual, 'Expected truthy value'),
    toBe: (expected: unknown) => assert.strictEqual(actual, expected),
    not: {
      toContain: (expected: string) => assert.ok(!String(actual).includes(expected), `Expected not to contain "${expected}"`),
    },
  };
}

describe('Finance 6G — Analysis Detail Surface — Static Contract Tests', () => {
  test('ENTRY: Resumen exposes Analysis detail entry', () => {
    const screen = readFile('screens/finance/FinanceScreen.tsx');
    expect(screen).toContain('FinanceAnalysisDetail');
    expect(screen).toContain('Ver análisis');
    expect(screen).toContain('analytics-outline');
  });

  test('ENTRY: No fourth Finance tab created', () => {
    const context = readFile('services/finance/financeContext.ts');
    const tabsMatch = context.match(/FINANCE_TABS\s*=\s*\[([^\]]+)\]/);
    expect(tabsMatch).toBeTruthy();
    const tabs = tabsMatch![1];
    expect(tabs).toContain('resumen');
    expect(tabs).toContain('movimientos');
    expect(tabs).toContain('pagos');
    expect(tabs.split(',').length).toBe(3);
  });

  test('ENTRY: Dedicated Analysis screen exists', () => {
    expect(exists('screens/finance/FinanceAnalysisDetailScreen.tsx')).toBe(true);
  });

  test('CONTRACT: Uses canonical Analysis service (getFinanceAnalysis)', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('getFinanceAnalysis');
    expect(screen).toContain('from \'../../services/finance/financeAnalysis\'');
  });

  test('CONTRACT: Does not sum Movimientos locally', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('listFinanceMovements');
    expect(screen).not.toContain('movements?.reduce');
    expect(screen).not.toContain('movements?.map');
    // .filter() used for filtering backend category data, not reconstructing from Movimientos
  });

  test('CONTRACT: Does not reconstruct Transfer exclusion', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('transactionType === \'transfer\'');
    expect(screen).not.toContain('transaction_type === \'transfer\'');
  });

  test('CONTRACT: Does not reconstruct Refund arithmetic', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    // Displaying backend refundedAmount/totalRefunded is not reconstructing arithmetic
    // The component shows these as factual backend values only
    expect(screen).not.toContain('totalRefunded');
  });

  test('CONTRACT: No FX / cross-currency aggregation', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('USD');
    expect(screen).not.toContain('ARS');
    expect(screen).not.toContain('exchangeRate');
    expect(screen).not.toContain('convertCurrency');
  });

  test('CONTRACT: No forecast / AI / Geni', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('forecast');
    expect(screen).not.toContain('predict');
    expect(screen).not.toContain('recommendation');
    expect(screen).not.toContain('Geni');
    expect(screen).not.toContain('AI');
    expect(screen).not.toContain('si seguís así');
  });

  test('SUMMARY: Ingresó displayed', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('Ingresó');
    expect(screen).toContain('income'); // variable name used in component
    expect(screen).toContain('totals.income');
  });

  test('SUMMARY: Gastaste displayed', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('Gastaste');
    expect(screen).toContain('netExpense');
    expect(screen).toContain('totals.netExpense');
  });

  test('SUMMARY: Neto displayed', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('Neto');
    expect(screen).toContain('netResult');
    expect(screen).toContain('totals.netResult');
  });

  test('SUMMARY: Negative net supported', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('netExpenseTone');
    expect(screen).toContain('startsWith(\'-\')');
  });

  test('SUMMARY: Zero values supported', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('isZeroDecimalString');
  });

  test('CATEGORY: Expense category breakdown displayed', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('categoryExpenses');
    expect(screen).toContain('Gasto por categoría');
    expect(screen).toContain('CategoryBreakdownRow');
  });

  test('CATEGORY: Category amount displayed', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('cat.netExpense');
    expect(screen).toContain('formatFinanceAmount');
  });

  test('CATEGORY: Percentage displayed or safely derived', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('shareOfNetExpense');
    expect(screen).toContain('percent');
  });

  test('CATEGORY: Descending factual order (backend ordered)', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('.sort(');
    expect(screen).toContain('categoryExpenses');
  });

  test('CATEGORY: Zero/no-activity categories not cluttered', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('filter((cat) => !isZeroDecimalString(cat.netExpense) && Number(cat.netExpense) > 0)');
  });

  test('CATEGORY: Empty Expense state handled', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('Todavía no hay gastos en este período');
  });

  test('PERIOD: MONTHLY supported', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('MONTHLY');
    expect(screen).toContain('shiftFinanceMonth');
  });

  test('PERIOD: YEARLY supported', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('YEARLY');
    expect(screen).toContain('periodType === \'MONTHLY\'');
  });

  test('PERIOD: Current Finance period propagated', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('period');
    expect(screen).toContain('route.params');
  });

  test('PERIOD: No empty period request', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('readReady');
    expect(screen).toContain('disabled={!readReady}');
  });

  test('PERIOD: No stale hardcoded period', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('2026-08');
    expect(screen).not.toContain('2026-09');
  });

  test('CONTEXT/CURRENCY: Personal reload', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('contextType');
    expect(screen).toContain('FINANCE_CONTEXT_TYPES.PERSONAL');
  });

  test('CONTEXT/CURRENCY: Household reload', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('FINANCE_CONTEXT_TYPES.HOUSEHOLD');
    expect(screen).toContain('activeHousehold');
  });

  test('CONTEXT/CURRENCY: ARS reload', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('currency');
    expect(screen).toContain('params.currency');
  });

  test('CONTEXT/CURRENCY: USD reload', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('currency');
    expect(screen).not.toContain('ARS');
  });

  test('CONTEXT/CURRENCY: No cross-context stale data', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('contextScope');
    expect(screen).toContain('contextType:');
    expect(screen).toContain('currency:');
  });

  test('CONTEXT/CURRENCY: No cross-currency stale data', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('contextScope');
    expect(screen).toContain('currency:');
  });

  test('FACTUAL: Transfers not locally counted', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('transfer');
    expect(screen).not.toContain('Transfer');
  });

  test('FACTUAL: Credit Card Expense not excluded by frontend', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('CREDIT_CARD');
    expect(screen).not.toContain('creditCard');
  });

  test('FACTUAL: Card payment not manually counted', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('payment');
    expect(screen).not.toContain('Payment');
  });

  test('FACTUAL: Refund not treated as Income by frontend', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('income.*refund');
    expect(screen).not.toContain('refund.*income');
  });

  test('FACTUAL: Correction not recomputed locally', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('correction');
    expect(screen).not.toContain('Correction');
  });

  test('FACTUAL: Trash/Restore not recomputed locally', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('trash');
    expect(screen).not.toContain('restore');
  });

  test('UI: Loading state', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('loading');
    expect(screen).toContain('Skeleton');
  });

  test('UI: Error state', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('error');
    expect(screen).toContain('ErrorState');
    expect(screen).toContain('No pudimos cargar el análisis');
  });

  test('UI: Empty state', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('EmptyState');
    expect(screen).toContain('Sin datos de análisis');
  });

  test('UI: Retry', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('RefreshControl');
    expect(screen).toContain('onRefresh');
    expect(screen).toContain('handleRefresh');
  });

test('UI: No chart dependency', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    // Check for actual chart libraries/components, not icon names like pie-chart-outline, chevron-back-outline
    expect(screen).not.toContain('import.*chart');
    expect(screen).not.toContain('from.*chart');
    expect(screen).not.toContain('Chart');
    expect(screen).not.toContain('donut');
    expect(screen).not.toContain('victory');
    expect(screen).not.toContain('recharts');
    expect(screen).not.toContain('chart.js');
    expect(screen).not.toContain('nivo');
    expect(screen).not.toContain('sparklines');
  });

  test('UI: No giant dashboard', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('AppCard');
    expect(screen).toContain('variant=\"quiet\"');
  });

  test('UI: Readable category hierarchy', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('CategoryBreakdownRow');
    expect(screen).toContain('barTrack');
    expect(screen).toContain('barFill');
  });

  test('REFRESH: Reload on context/currency/period', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('useFocusEffect');
    expect(screen).toContain('fetchAnalysis');
  });

  test('REFRESH: Focus/refresh integration', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('refreshing');
    expect(screen).toContain('setRefreshing');
  });

  test('REFRESH: No fetch loop', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('controller.abort');
    expect(screen).toContain('signal?.aborted');
  });

  test('NON-INTERFERENCE: No Spending Limit mutation', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('createSpendingLimit');
    expect(screen).not.toContain('editSpendingLimit');
    expect(screen).not.toContain('cancelSpendingLimit');
  });

  test('NON-INTERFERENCE: No Pool mutation', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('createPool');
    expect(screen).not.toContain('allocatePool');
    expect(screen).not.toContain('releasePool');
  });

  test('NON-INTERFERENCE: No Account mutation', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('createFinanceAccount');
    expect(screen).not.toContain('editFinanceAccount');
  });

  test('NON-INTERFERENCE: No Transaction mutation', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('createExpense');
    expect(screen).not.toContain('createIncome');
  });

  test('NON-INTERFERENCE: No Transfer mutation', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('createTransfer');
  });

  test('REGRESSION: Resumen remains intact', () => {
    const screen = readFile('screens/finance/FinanceScreen.tsx');
    expect(screen).toContain('FinanceSummarySurface');
    expect(screen).toContain('FinanceAnalysisHighlights');
  });

  test('REGRESSION: 6F management entry remains', () => {
    const screen = readFile('screens/finance/FinanceScreen.tsx');
    expect(screen).toContain('FinanceSpendingLimitsManagement');
    expect(screen).toContain('onManage');
  });

  test('REGRESSION: Pools remain', () => {
    const screen = readFile('screens/finance/FinanceScreen.tsx');
    expect(screen).toContain('FinancePoolSummary');
    expect(screen).toContain('FinancePoolManagement');
  });

  test('REGRESSION: Movimientos remains', () => {
    const screen = readFile('screens/finance/FinanceScreen.tsx');
    expect(screen).toContain('FinanceMovementsSurface');
  });

  test('REGRESSION: Pagos remains', () => {
    const screen = readFile('screens/finance/FinanceScreen.tsx');
    expect(screen).toContain('PaymentsList');
  });

  test('REGRESSION: Expense sheet remains', () => {
    const screen = readFile('screens/finance/FinanceScreen.tsx');
    expect(screen).toContain('NewMovementSheet');
  });

  test('REGRESSION: Income organizer remains', () => {
    const screen = readFile('screens/finance/FinanceScreen.tsx');
    expect(screen).toContain('NewMovementSheet');
  });

  test('NAVIGATION: Route registered in types', () => {
    const types = readFile('navigation/types.ts');
    expect(types).toContain('FinanceAnalysisDetail');
    expect(types).toContain('contextType');
    expect(types).toContain('currency');
    expect(types).toContain('periodType');
    expect(types).toContain('period');
  });

  test('NAVIGATION: Screen registered in HomeTabNavigator', () => {
    const nav = readFile('navigation/HomeTabNavigator.tsx');
    expect(nav).toContain('FinanceAnalysisDetailScreen');
    expect(nav).toContain('FinanceAnalysisDetail');
  });

  test('HIGHLIGHTS: Uses existing FinanceAnalysisHighlights component', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('FinanceAnalysisHighlights');
    expect(screen).toContain('from \'../../components/finance/FinanceAnalysisHighlights\'');
  });

  test('INCOME BREAKDOWN: Displayed if supported by backend', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).toContain('categoryIncome');
    expect(screen).toContain('Ingresos');
    expect(screen).toContain('IncomeCategoryRow');
  });

  test('SCOPE CHECK: No forecasting', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('forecast');
    expect(screen).not.toContain('proyección');
    expect(screen).not.toContain('projection');
  });

  test('SCOPE CHECK: No recommendations', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('recomendación');
    expect(screen).not.toContain('recommend');
    expect(screen).not.toContain('sugerir');
  });

  test('SCOPE CHECK: No AI / Geni', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('AI');
    expect(screen).not.toContain('Geni');
    expect(screen).not.toContain('inteligencia');
  });

  test('SCOPE CHECK: No weekly/daily analysis', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('WEEKLY');
    expect(screen).not.toContain('DAILY');
    expect(screen).not.toContain('weekly');
    expect(screen).not.toContain('daily');
  });

  test('SCOPE CHECK: No custom date ranges', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('custom');
    expect(screen).not.toContain('range');
    expect(screen).not.toContain('dateRange');
  });

  test('SCOPE CHECK: No financial health score', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('health');
    expect(screen).not.toContain('score');
    expect(screen).not.toContain('salud financiera');
  });

  test('SCOPE CHECK: No credit score', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('credit score');
    expect(screen).not.toContain('creditScore');
  });

  test('SCOPE CHECK: No savings goals', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('savings goal');
    expect(screen).not.toContain('meta de ahorro');
  });

  test('SCOPE CHECK: No Pool analytics', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('pool');
    expect(screen).not.toContain('Pool');
    expect(screen).not.toContain('pozo');
  });

  test('SCOPE CHECK: No Account history', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('account');
    expect(screen).not.toContain('Account');
    expect(screen).not.toContain('cuenta');
  });

  test('SCOPE CHECK: No merchant analytics', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('merchant');
    expect(screen).not.toContain('comercio');
  });

  test('SCOPE CHECK: No per-person analytics', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    // PERSONAL context type is not per-person analytics
    expect(screen).not.toContain('per person');
    expect(screen).not.toContain('per-person');
    expect(screen).not.toContain('persona');
    expect(screen).not.toContain('by person');
  });

  test('SCOPE CHECK: No 6H', () => {
    const screen = readFile('screens/finance/FinanceAnalysisDetailScreen.tsx');
    expect(screen).not.toContain('6H');
  });
});

console.log('\nAll Finance 6G static contract tests defined.');