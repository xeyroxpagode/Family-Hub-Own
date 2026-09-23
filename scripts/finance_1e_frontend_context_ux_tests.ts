import fs from 'node:fs';
import path from 'node:path';
import {
  FINANCE_CONTEXT_TYPES,
  FINANCE_TAB_LABELS,
  FINANCE_TABS,
  financeContextLabel,
  financeContextViewState,
  financeSelectorOptions,
  selectFinanceContext,
  selectFinanceTab,
} from '../front/mi-front-limpio/services/finance/financeContext';

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

runTest('T1-T4 More to Finance navigation and App Shell boundary', () => {
  const moreScreen = read('front/mi-front-limpio/screens/MoreScreen.tsx');
  const navTypes = read('front/mi-front-limpio/navigation/types.ts');
  const homeTabs = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');

  assert(navTypes.includes('Finance: import(\'./financeNavigation\').FinanceEntryParams | undefined'), 'MoreStackParamList registers Finance');
  assert(moreScreen.includes("label: 'Finanzas'") && moreScreen.includes("screen: 'Finance'"), 'More screen exposes Finanzas entry');
  assert(homeTabs.includes('<MoreStack.Screen name="Finance" component={FinanceScreen} />'), 'MoreStack opens Finance root');
  assert(homeTabs.includes('<AppTopBar') && homeTabs.includes('<HouseholdSwitcherSheet'), 'Finance remains under existing App Shell owner');
  assert(!homeTabs.includes('<Tab.Screen\n            name="FinanceTab"'), 'No Finance bottom tab created');
});

runTest('T5-T13 Financial Context selector uses active Household only', () => {
  const garcia = { id: 'household-a', name: 'Familia Garcia' };
  const perez = { id: 'household-b', name: 'Familia Perez' };
  const martinez = { id: 'household-c', name: 'Familia Martinez' };

  assertEqual(financeSelectorOptions(garcia).map((option) => option.label), ['Personal', 'Hogar'], 'active Garcia options stay fixed Personal/Hogar');
  assertEqual(financeSelectorOptions(perez).map((option) => option.label), ['Personal', 'Hogar'], 'multiple memberships ignored; selector labels stay fixed');
  assert(!financeSelectorOptions(perez).some((option) => option.label === martinez.name), 'Martinez is not listed when inactive');
  assertEqual(selectFinanceContext(FINANCE_CONTEXT_TYPES.PERSONAL, FINANCE_CONTEXT_TYPES.HOUSEHOLD), FINANCE_CONTEXT_TYPES.HOUSEHOLD, 'choose Household');
  assertEqual(selectFinanceContext(FINANCE_CONTEXT_TYPES.HOUSEHOLD, FINANCE_CONTEXT_TYPES.PERSONAL), FINANCE_CONTEXT_TYPES.PERSONAL, 'choose Personal');
  assertEqual(financeSelectorOptions(null).map((option) => option.label), ['Personal', 'Hogar'], 'no active Household keeps exact two-scope product model');
  assertEqual(financeContextLabel(FINANCE_CONTEXT_TYPES.HOUSEHOLD, perez, false), 'Familia Perez', 'Household label derives from current active Household');
  assertEqual(financeContextLabel(FINANCE_CONTEXT_TYPES.HOUSEHOLD, null, false), 'Contexto no disponible', 'unavailable Household has no fabricated label');
  assertEqual(financeContextLabel(FINANCE_CONTEXT_TYPES.HOUSEHOLD, garcia, true), 'Actualizando contexto', 'refresh hides stale Household label');

  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const appScreen = read('front/mi-front-limpio/components/ui/AppScreen.tsx');
  assert(financeScreen.includes('scopeTrigger'), 'Financial Context is a secondary header trigger');
  assert(financeScreen.includes('scopeSelectorVisible'), 'Financial Context uses one compact local menu visibility state');
  assert(financeScreen.includes('scopeAnchorRef') && financeScreen.includes('measureInWindow'), 'Financial Context menu is anchored to the header trigger');
  assert(financeScreen.includes('scopeMenuSurface') && financeScreen.includes('scopeMenuPosition'), 'Financial Context renders a compact positioned menu surface');
  assert(financeScreen.includes('scopeMenuDismissLayer') && financeScreen.includes('onRequestClose={closeScopeSelector}'), 'Financial Context menu closes on outside tap and Android back');
  assert(financeScreen.includes('chevron-up-outline'), 'open Financial Context trigger shows upward chevron');
  assert(financeScreen.includes("'checkmark-circle'"), 'selected Financial Context is marked with a check');
  assert(financeScreen.includes('if (current === nextContext) return current'), 'selecting current Financial Context avoids unnecessary reload state change');
  assert(!financeScreen.includes('title="Finanzas de"'), 'Financial Context menu has no extra title');
  assert(!/<ActionSheet[\s\S]*?scopeSelectorVisible[\s\S]*?<\/ActionSheet>/.test(financeScreen), 'Financial Context selector does not use bottom ActionSheet');
  assert(!financeScreen.includes('scopeSelector:'), 'permanent inline scope segmented control removed');
  assert(!financeScreen.includes('scopeOptionSelected'), 'scope selected pill styling removed');
  assert(!financeScreen.includes('selectorExpanded'), 'selector has no expanded dropdown state');
  assert(financeScreen.includes('allowVisibleBackExit'), 'visible Finance Back keeps one-tap exit');
  assert(!/dropdown|popover|backdrop/i.test(financeScreen), 'Financial Context selector does not create dropdown/popover/backdrop');
  assert(financeScreen.includes('safeAreaEdges={[\'right\', \'bottom\', \'left\']}'), 'Finance excludes duplicate top safe-area under AppTopBar');
  assert(appScreen.includes('safeAreaEdges?: Edges') && appScreen.includes('edges={safeAreaEdges}'), 'AppScreen supports explicit safe-area edges without changing App Shell');
  assert(!/>\s*Contexto financiero\s*</.test(financeScreen), 'Finance subtitle Contexto financiero removed');
  assert(!financeScreen.includes('LayoutAnimation.configureNext(selectorLayoutAnimation)'), 'selector expansion animation removed from compact shell');
  assert(!financeScreen.includes('maxHeight: selectorMaxHeight'), 'selector height is not animated through JS maxHeight interpolation');
  assert(!financeScreen.includes('useNativeDriver: false'), 'selector animation does not use JS-driven Animated fallback');
  assert(financeScreen.includes('<ActionSheet') && financeScreen.includes('visible={overflowVisible}'), 'shared ActionSheet remains available for Finance overflow');
});

runTest('T14-T17 tabs are exact and context-independent', () => {
  assertEqual(FINANCE_TABS, ['resumen', 'movimientos', 'pagos'] as const, 'exact tab keys');
  assertEqual(FINANCE_TABS.map((tab) => FINANCE_TAB_LABELS[tab]), ['Resumen', 'Movimientos', 'Pagos'], 'exact tab labels');
  assertEqual(selectFinanceTab('resumen', 'movimientos'), 'movimientos', 'tab switch changes only tab');
  assertEqual(selectFinanceContext(FINANCE_CONTEXT_TYPES.HOUSEHOLD, FINANCE_CONTEXT_TYPES.HOUSEHOLD), FINANCE_CONTEXT_TYPES.HOUSEHOLD, 'context remains stable while tabs switch');

  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert(financeScreen.includes('backgroundColor: colors.surface.muted') && financeScreen.includes('tabSelected'), 'primary tabs use HomePlus segmented styling');
  assert(financeScreen.includes('tone={selected ? \'inverse\' : \'secondary\'}'), 'selected primary tab uses inverse text over selected segment');
  // 3H: "Cuentas" is now a legitimate overflow menu item, not a primary tab/mode
  for (const forbidden of ['Planificar', 'Reports', 'Presupuesto', 'Analisis', 'Configuracion', 'Actividad', 'Archivados']) {
    assert(!financeScreen.includes(forbidden), `no extra primary Finance mode: ${forbidden}`);
  }
  assert(!financeScreen.includes('setActiveHousehold') && !financeScreen.includes('runHouseholdSwitch'), 'Finance context change does not call global Household switch');
});

runTest('T18-T22 truthful empty content and no simulated capability', () => {
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const financeService = read('front/mi-front-limpio/services/finance/financeContext.ts');
  const combined = `${financeScreen}\n${financeService}`;

  assert(!/[$€£]\s?\d|ARS\s?\d|USD\s?\d|EUR\s?\d|\d+[.,]\d{2}\s?(ARS|USD|EUR)/i.test(financeScreen), 'Resumen contains no mocked financial amount');
  assert(!/mock|fixture|transactionRows|movementRows|paymentRows|expenseRows|incomeRows/i.test(combined), 'no mocked transaction/payment data');
  // 3H: "Agregar cuenta" is legitimate CTA in 0-accounts empty state
  assert(!/Registrar gasto|Crear pago|Transferir|Crear presupuesto/.test(financeScreen), 'no fake persistence action exists');
  assert(!/Expense|Income|Transfer|Account|Budget|Payment/.test(financeService), 'frontend Finance service does not simulate backend capabilities');
  assert(!/\bfetch\s*\(/.test(financeScreen) && !financeScreen.includes('axios') && !financeScreen.includes('supabase.from'), 'no raw Finance data API is called in 1E UI');
});

runTest('T23-T25 stale/privacy-safe context states', () => {
  const garcia = { id: 'household-a', name: 'Familia Garcia' };
  const perez = { id: 'household-b', name: 'Familia Perez' };

  assertEqual(financeContextViewState(FINANCE_CONTEXT_TYPES.HOUSEHOLD, garcia, false), 'household_ready', 'Household A ready');
  assertEqual(financeContextLabel(FINANCE_CONTEXT_TYPES.HOUSEHOLD, perez, false), 'Familia Perez', 'after switch label is Household B');
  assertEqual(financeContextViewState(FINANCE_CONTEXT_TYPES.HOUSEHOLD, null, false), 'household_unavailable', 'invalid Household deny-safe state');
  assertEqual(financeContextViewState(FINANCE_CONTEXT_TYPES.PERSONAL, null, false), 'personal_ready', 'Personal never depends on Household');
  assertEqual(financeContextLabel(FINANCE_CONTEXT_TYPES.PERSONAL, perez, false), 'Personal', 'Personal mode does not expose Household identity as owner');
});

runTest('Static no backend/schema/navigation expansion', () => {
  const backendIndex = read('backend/index.js');
  const migrationFiles = fs.readdirSync(path.join(repositoryRoot, 'supabase/migrations')).filter((name) => name.endsWith('.sql'));
  const homeTabs = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');

assert(!/FinanceUser|FinanceHousehold|FinanceMembership|FinancePermission/i.test(backendIndex), 'no duplicate Finance identity authority');
  assert(!migrationFiles.some((name) => /finance_(user|household|membership|permission)/i.test(name)), 'no duplicate Finance identity migrations');
  assert(!financeScreen.includes('HouseholdSwitcherSheet') && !financeScreen.includes('AppTopBar'), 'Finance screen does not recreate global chrome');
  assert(!homeTabs.includes('FinanceStack') && !homeTabs.includes('FinanceNavigator'), 'no Finance-specific navigator');
});

console.log(`\nFINANCE_1E_FRONTEND_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_1E_FINAL_CONTEXT_UX_FRONTEND_TESTS=FAIL');
  process.exit(1);
}

console.log('FINANCE_STAGE_1E_FINAL_CONTEXT_UX_FRONTEND_TESTS=PASS');
