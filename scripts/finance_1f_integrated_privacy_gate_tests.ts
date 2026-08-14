import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  FINANCE_CONTEXT_TYPES,
  FINANCE_TABS,
  financeContextLabel,
  financeContextViewState,
  financeSelectorOptions,
  selectFinanceContext,
  selectFinanceTab,
} from '../front/mi-front-limpio/services/finance/financeContext';

const nodeRequire = createRequire(__filename);
const repositoryRoot = path.resolve(__dirname, '..', '..', '..');
const {
  noTrackedFinanceSource,
  personalFinanceSourceFromContext,
  householdFinanceSourceFromContext,
  resolveFinanceSourceContextBoundary,
  FINANCE_SOURCE_CONTEXT_RELATIONSHIPS,
  FINANCE_SOURCE_TYPES,
} = nodeRequire(path.join(repositoryRoot, 'backend/src/services/finance.sourceContext.service.js'));

type ResolvedFinanceContext = {
  contextType: 'personal' | 'household';
  personId: string;
  householdId: string | null;
  membershipId: string | null;
};

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

function assertThrowsCode(fn: () => unknown, expectedCode: string, message: string): void {
  try {
    fn();
    assert(false, `${message} expected code ${expectedCode} but did not throw`);
  } catch (error) {
    const actual = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : 'unknown';
    assert(actual === expectedCode, `${message} (code=${actual})`);
  }
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

const personalA: ResolvedFinanceContext = Object.freeze({
  contextType: FINANCE_CONTEXT_TYPES.PERSONAL,
  personId: 'person-a',
  householdId: null,
  membershipId: null,
});

const householdA: ResolvedFinanceContext = Object.freeze({
  contextType: FINANCE_CONTEXT_TYPES.HOUSEHOLD,
  personId: 'person-a',
  householdId: 'household-a',
  membershipId: 'membership-a',
});

const householdB: ResolvedFinanceContext = Object.freeze({
  contextType: FINANCE_CONTEXT_TYPES.HOUSEHOLD,
  personId: 'person-a',
  householdId: 'household-b',
  membershipId: 'membership-b',
});

runTest('T01-T10 Current/Context privacy authority integration', () => {
  const financeContextService = read('backend/src/services/finance.context.service.js');

  assert(financeContextService.includes("contextType: FINANCE_CONTEXT_TYPES.PERSONAL"), 'T01 Personal resolves through canonical personal context');
  assert(financeContextService.includes('householdId: null') && financeContextService.includes('membershipId: null'), 'T02 Personal is independent of Household');
  assert(financeContextService.includes('person.active_household_id'), 'T03 Household derives from active global Household');
  assert(financeContextService.includes(".eq('household_id', person.active_household_id)"), 'T04 multiple memberships cannot widen Household scope');
  assert(financeContextService.includes(".eq('status', 'active')"), 'T07 inactive membership denies Household');
  assert(financeContextService.includes('finance_person_id_forbidden'), 'T08 arbitrary person injection denied');
  assert(financeContextService.includes('finance_household_id_forbidden'), 'T09 arbitrary household injection denied');
  assert(financeContextService.includes('finance_membership_id_forbidden'), 'T10 arbitrary membership injection denied');
  assert(!financeContextService.includes('role ===') && !financeContextService.includes('currentRole'), 'T05/T06 roles do not pierce Personal privacy');
});

runTest('T11-T15 global Household switch and frontend selector integration', () => {
  const householdAOption = { id: 'household-a', name: 'Familia A' };
  const householdBOption = { id: 'household-b', name: 'Familia B' };
  const householdCOption = { id: 'household-c', name: 'Familia C' };
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');

  assertEqual(financeContextLabel(FINANCE_CONTEXT_TYPES.PERSONAL, householdAOption, false), 'Personal', 'T11 Personal label survives Household A');
  assertEqual(financeContextLabel(FINANCE_CONTEXT_TYPES.PERSONAL, householdBOption, false), 'Personal', 'T11 Personal label survives Household B');
  assertEqual(financeContextLabel(FINANCE_CONTEXT_TYPES.HOUSEHOLD, householdAOption, false), 'Familia A', 'T12 Household follows active A');
  assertEqual(financeContextLabel(FINANCE_CONTEXT_TYPES.HOUSEHOLD, householdBOption, false), 'Familia B', 'T12 Household follows active B after switch');
  assert(!financeSelectorOptions(householdBOption).some((option) => option.label === householdAOption.name), 'T13 stale A is not visible after B is current');
  assertEqual(financeSelectorOptions(householdBOption).map((option) => option.label), ['Personal', 'Familia B'], 'T14 selector after switch exposes Personal + B only');
  assert(!financeSelectorOptions(householdBOption).some((option) => option.label === householdCOption.name), 'T14 C is not listed when B is active');
  assert(!financeScreen.includes('setActiveHousehold') && !financeScreen.includes('runHouseholdSwitch'), 'T15 Finance selector never invokes global Household switch');
});

runTest('T16-T22 Finance UX, stale context and Back integration', () => {
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');

  assertEqual(selectFinanceTab('resumen', 'pagos'), 'pagos', 'T16 tabs switch without context mutation');
  assertEqual(selectFinanceContext(FINANCE_CONTEXT_TYPES.HOUSEHOLD, FINANCE_CONTEXT_TYPES.PERSONAL), FINANCE_CONTEXT_TYPES.PERSONAL, 'T17 context changes preserve independent tab state');
  assert(financeScreen.includes('styles.contextCard') && financeScreen.includes('selectorExpanded') && !/ActionSheet|selectorVisible|dropdown|popover|backdrop/i.test(financeScreen), 'T18 expandable selector remains one card');
  assert(financeScreen.includes('allowVisibleBackExit') && financeScreen.includes('handleVisibleBack'), 'T19 visible Back exits in one tap when expanded');
  assert(financeScreen.includes("navigation.addListener?.('beforeRemove'") && financeScreen.includes('event.preventDefault()'), 'T20 system Back collapses expanded selector first');
  assertEqual(financeContextViewState(FINANCE_CONTEXT_TYPES.PERSONAL, null, false), 'personal_ready', 'T21 no active Household leaves Personal valid');
  assertEqual(financeContextViewState(FINANCE_CONTEXT_TYPES.HOUSEHOLD, null, false), 'household_unavailable', 'T22 no unsafe Household fallback');
});

runTest('T23-T25 Source vs Context integrated boundary', () => {
  const personalSource = personalFinanceSourceFromContext(personalA);
  const householdSourceA = householdFinanceSourceFromContext(householdA);
  const householdSourceB = householdFinanceSourceFromContext(householdB);

  assertEqual(resolveFinanceSourceContextBoundary({ financialContext: personalA, source: noTrackedFinanceSource() }).relationship, FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.NO_TRACKED_SOURCE, 'T23 no tracked Source + Personal valid');
  assertEqual(resolveFinanceSourceContextBoundary({ financialContext: householdA, source: null }).relationship, FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.NO_TRACKED_SOURCE, 'T23 no tracked Source + Household valid');
  assertEqual(resolveFinanceSourceContextBoundary({ financialContext: personalA, source: personalSource }).relationship, FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.SAME_PERSONAL_CONTEXT, 'T23 Personal Source + Personal valid');
  assertEqual(resolveFinanceSourceContextBoundary({ financialContext: householdA, source: householdSourceA }).relationship, FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.SAME_HOUSEHOLD_CONTEXT, 'T23 Household Source + same Household valid');

  const personalFundedHousehold = resolveFinanceSourceContextBoundary({ financialContext: householdA, source: personalSource });
  assertEqual(personalFundedHousehold.relationship, FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.PERSONAL_FUNDED_HOUSEHOLD, 'T23 Personal Source + Household valid');
  assertEqual(personalFundedHousehold.financialAttribution.contextType, FINANCE_CONTEXT_TYPES.HOUSEHOLD, 'T25 Personal-funded Household attribution stays Household');
  assertEqual(personalFundedHousehold.disclosure.household.fundingRelationship, 'personal_funded', 'T25 disclosure is privacy-safe');
  assert(!('personId' in personalFundedHousehold.disclosure.household), 'T25 disclosure omits personal source internals');

  assertThrowsCode(() => resolveFinanceSourceContextBoundary({ financialContext: personalA, source: householdSourceA }), 'finance_household_source_personal_context_forbidden', 'T24 Household Source + Personal denied');
  assertThrowsCode(() => resolveFinanceSourceContextBoundary({ financialContext: householdA, source: householdSourceB }), 'finance_household_source_mismatch', 'T24 Cross-Household source denied');
  assertThrowsCode(() => resolveFinanceSourceContextBoundary({ financialContext: householdA, source: { sourceType: FINANCE_SOURCE_TYPES.PERSONAL, personId: 'person-b' } }), 'untrusted_finance_source_reference', 'T24 other Person/caller source injection denied');
});

runTest('T26-T29 no fake financial truth or parallel authority', () => {
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const financeFrontendService = read('front/mi-front-limpio/services/finance/financeContext.ts');
  const backendIndex = read('backend/index.js');
  const sourceFiles = [
    ...listFiles('backend/src').filter((file) => /\.(js|ts)$/.test(file)),
    ...listFiles('front/mi-front-limpio').filter((file) => /\.(ts|tsx|js|jsx)$/.test(file) && !file.includes('node_modules')),
  ];
  const productionText = sourceFiles.map((file) => read(file)).join('\n');

  assert(!/[$€£]\s?\d|ARS\s?\d|USD\s?\d|EUR\s?\d|\d+[.,]\d{2}\s?(ARS|USD|EUR)/i.test(financeScreen), 'T26 no mocked financial amount');
  assert(!/transactionRows|movementRows|paymentRows|expenseRows|incomeRows|mockFinance|financeFixture/i.test(`${financeScreen}\n${financeFrontendService}`), 'T26 no mocked financial rows');
  assert(!/finance_accounts|createFinanceAccount|FinanceAccountRepository|ExpenseService|IncomeService|TransferService|RefundService|PaymentService/i.test(productionText), 'T27 no Account/separate Expense-Income/Transfer/Refund/Payment service implementation');
  assert(!/FinancePermission|FinanceACL|FinanceRole|FINANCE_ROLES|finance_can_access|is_finance_member/i.test(productionText), 'T28 no Finance role mapping');
  assert(!/FinanceUser|FinanceHousehold|FinanceMembership|FinancePermission/i.test(backendIndex), 'T29 no parallel Finance identity authority');
  for (const forbidden of ['FinanceUser', 'FinancePerson', 'FinanceHousehold', 'FinanceMembership', 'FinanceRLS', 'FinanceAppShell', 'FinanceNavbar', 'FinanceReliability', 'FinanceHouseholdSwitcher']) {
    assert(!productionText.includes(forbidden), `T29 no parallel authority symbol: ${forbidden}`);
  }
});

runTest('T30-T32 AppScreen shared primitive and 1E polish regression', () => {
  const appScreen = read('front/mi-front-limpio/components/ui/AppScreen.tsx');
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const frontendFiles = listFiles('front/mi-front-limpio').filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes('node_modules'));
  const appScreenConsumers = frontendFiles
    .filter((file) => file !== 'front/mi-front-limpio/components/ui/AppScreen.tsx')
    .map((file) => ({ file, text: read(file) }))
    .filter(({ text }) => text.includes('<AppScreen'));
  const safeAreaConsumers = appScreenConsumers.filter(({ text }) => text.includes('safeAreaEdges='));

  assert(appScreen.includes('safeAreaEdges,') && appScreen.includes('edges={safeAreaEdges}'), 'T30 AppScreen forwards optional safeAreaEdges');
  assert(!/safeAreaEdges\s*=\s*\[/.test(appScreen) && !/safeAreaEdges\s*=\s*\{/.test(appScreen), 'T30 AppScreen default safe-area behavior unchanged');
  assertEqual(
    safeAreaConsumers.map(({ file }) => file.replace(/\\/g, '/')),
    ['front/mi-front-limpio/screens/finance/FinanceScreen.tsx'],
    'T31 Finance is the intentional top-edge exclusion consumer',
  );
  assert(financeScreen.includes("safeAreaEdges={['right', 'bottom', 'left']}"), 'T31 Finance excludes top edge only');
  assert(!financeScreen.includes('Contexto financiero'), 'T32 subtitle remains removed');
  assert(financeScreen.includes('LayoutAnimation.configureNext(selectorLayoutAnimation)'), 'T32 selector keeps LayoutAnimation');
  assert(!financeScreen.includes('maxHeight') && !financeScreen.includes('useNativeDriver: false'), 'T32 no JS-driven maxHeight animation regression');
  assert(!/marginTop:\s*-|top:\s*-|translateY:\s*-/.test(financeScreen), 'T32 no negative spacing hack');
});

runTest('T33-T34 database and remote boundary static evidence', () => {
  const migrationFiles = fs.readdirSync(path.join(repositoryRoot, 'supabase/migrations')).filter((name) => name.endsWith('.sql'));
  const financeMigrations = migrationFiles.filter((name) => /finance/i.test(name));
  const allSql = [
    ...listFiles('supabase').filter((file) => file.endsWith('.sql')),
    ...listFiles('backend/sql').filter((file) => file.endsWith('.sql')),
  ].map((file) => read(file)).join('\n');

  assertEqual(
    JSON.stringify(financeMigrations),
    JSON.stringify([
      '20260813010000_finance_category_authority_v1_1.sql',
      '20260813020000_finance_expense_income_transactions_v1_1.sql',
    ]),
    'T33 only accepted 2B/2C Finance migrations exist',
  );
  assert(!/finance_accounts|finance_expenses|finance_incomes|finance_transfers|finance_budgets|finance_payments|finance_refunds/i.test(allSql), 'T33 no out-of-stage Finance Account/separate Expense-Income/Transfer/Budget/Payment/Refund schema introduced');
  assert(process.env.SUPABASE_ACCESS_TOKEN === undefined, 'T34 remote Supabase token not used by 1F tests');
});

console.log(`\nFINANCE_1F_INTEGRATED_PRIVACY_GATE_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_1F_INTEGRATED_PRIVACY_GATE_TESTS=FAIL');
  process.exit(1);
}

console.log('FINANCE_STAGE_1F_INTEGRATED_PRIVACY_GATE_TESTS=PASS');
