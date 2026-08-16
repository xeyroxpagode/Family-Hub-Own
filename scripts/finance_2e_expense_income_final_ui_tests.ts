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

runTest('T01-T10 Movimientos entry and canonical form shell', () => {
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const sheet = read('front/mi-front-limpio/components/finance/NewMovementSheet.tsx');

  assert(financeScreen.includes('selectedTab === \'movimientos\'') && financeScreen.includes('setNewMovementVisible(true)'), 'T01 Movimientos owns the local new-movement entry');
  assert(financeScreen.includes('accessibilityLabel="Nuevo movimiento"') && financeScreen.includes('name="add"'), 'T02 local plus affordance opens Nuevo movimiento');
  assert(financeScreen.includes('<NewMovementSheet') && financeScreen.includes('contextType={selectedContext}'), 'T03 sheet receives selected Finance context');
  assert(sheet.includes('title="Nuevo movimiento"'), 'T04 sheet title is Nuevo movimiento');
  // 3H: default operation remains 'expense' (Gasto), type widened to FinanceOperationKind
  assert(sheet.includes("useState<FinanceOperationKind>('expense')") || sheet.includes("useState<FinanceTransactionKind>('expense')"), 'T05 Gasto is the default operation');
  assert(sheet.includes("(['expense', 'income', 'transfer'] as const)") && sheet.includes('Gasto') && sheet.includes('Ingreso'), 'T06 operation selector exposes Gasto and Ingreso after 3H adds Transfer');
  assert(sheet.includes('<MoneyInput') && sheet.includes('onValueChange={handleAmountChange}') && sheet.includes('onCurrencyChange={handleCurrencyChange}'), 'T07 MoneyInput primitive is reused as the only amount/currency input');
  assert(sheet.includes('DatePickerSheet') && sheet.includes('formatHumanDate(date)') && sheet.includes('todayDateOnly'), 'T08 date defaults to today and uses DatePickerSheet');
  assert(sheet.includes('Contexto financiero') && sheet.includes('{contextLabel}') && !sheet.includes('financeSelectorOptions('), 'T09 Financial Context is visible without adding a second selector');
  assert(sheet.includes('KeyboardAwareScrollView') && sheet.includes('keyboardShouldPersistTaps="handled"'), 'T10 Android keyboard-safe form container is used');
});

runTest('T11-T22 real Expense and Income API contract', () => {
  const api = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  const sheet = read('front/mi-front-limpio/components/finance/NewMovementSheet.tsx');
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const undoToast = read('front/mi-front-limpio/components/ui/UndoToast.tsx');
  const route = read('backend/src/routes/finance.js');
  const transactionService = read('backend/src/services/finance.transaction.service.js');

  assert(api.includes("'/api/finance/expenses'") && api.includes("'/api/finance/incomes'"), 'T11 frontend service targets real 2C endpoints');
  assert(api.includes('OPERATION_KINDS.NON_VERSIONED_MUTATION') && !api.includes('CREATE_IDEMPOTENT'), 'T12 frontend creates use non-versioned mutation, no idempotency framework');
  assert(sheet.includes('await createFinanceExpense(accessToken, payload)') && sheet.includes('await createFinanceIncome(accessToken, payload)'), 'T13 submit dispatches by selected operation');
  assert(sheet.includes('amount: amount.technicalValue.amount') && sheet.includes('currency,') && sheet.includes('contextType,') && sheet.includes('date,'), 'T14 required fields are amount/currency/context/date');
  assert(sheet.includes('description.trim()') && sheet.includes('notes.trim()'), 'T15 optional text fields are trimmed and omitted when blank');
  assert(sheet.includes('selectedCategoryId ? { category: selectedCategoryId }') && transactionService.includes('category_label_snapshot: category?.label ?? null'), 'T16 expense category id is optional and snapshot stays backend-owned');
  assert(route.includes("router.post('/expenses', transactionsController.createExpense)") && route.includes("router.post('/incomes', transactionsController.createIncome)"), 'T17 backend routes exist');
  assert(transactionService.includes('createExpense') && transactionService.includes('createIncome'), 'T18 backend 2C create services remain the persistence authority');
  assert(!/supabase\s*\./.test(api) && !/supabase\s*\./.test(sheet), 'T19 frontend does not call Supabase directly');
assert(sheet.includes('allowNone') && sheet.includes('account: expenseAccountId') && sheet.includes('account: incomeAccountId'), 'T20 3H Account is optional and only submitted when selected');
  assert(sheet.includes('operationHint="expense"') && sheet.includes('operationHint="income"'), 'T20 Expense/Income account selectors present');
  assert(sheet.includes('Sin cuenta') && !/Efectivo|Ahorros/.test(sheet), 'T20 Expense/Income form uses "Sin cuenta" and no fake labels');
  assert(!/Cuenta origen|Cuenta destino/.test(sheet.replace(/isTransfer\(operation\)[\s\S]*?transfer-destination/g, '')), 'T20 Expense/Income sections lack transfer labels');
  // 3H: Transfer mode is now part of the sheet; 2E only checked absence
  assert(!/budget|presupuesto|payment|pago esperado|readFinanceTransactions|getFinanceTransactions/.test(`${api}\n${sheet}`), 'T21 no Budget/Payment/read model added in 2E');
  // 3H: Transfer mode is now rendered inline within the same NewMovementSheet; 2E only checked expense/income success flow
  // Allow type cast in onSuccess call
  assert(!sheet.includes('Alert.alert') && /onSuccess\(submittedOperation/.test(sheet) && sheet.includes('resetDraft()') && sheet.includes('onRequestClose()'), 'T22 success clears draft, closes form, and delegates non-blocking feedback');
  assert(financeScreen.includes('UndoToast') && financeScreen.includes('Gasto registrado') && financeScreen.includes('Ingreso registrado') && financeScreen.includes('duration={2000}'), 'T22 success uses existing shared toast for temporary user-safe feedback');
  assert(undoToast.includes('onUndo?:') && undoToast.includes('checkmark-circle'), 'T22 shared toast supports success confirmation without requiring an action button');
});

runTest('T23-T33 category, pending, failure, stale context safety', () => {
  const api = read('front/mi-front-limpio/services/finance/financeMovements.ts');
  const sheet = read('front/mi-front-limpio/components/finance/NewMovementSheet.tsx');

  assert(api.includes('/api/finance/categories?') && api.includes("type: 'expense'"), 'T23 category picker reads 2B expense categories from backend');
  assert(sheet.includes("!isExpense(operation)") && sheet.includes('setSelectedCategoryId(null)'), 'T24 switching to Income clears expense category state');
  assert(!/income categor/i.test(sheet) && !/type: 'income'/.test(api), 'T25 Income does not invent an income category picker');
  assert(sheet.includes('submitting') && sheet.includes('if (submitting) return;') && sheet.includes('loading={submitting}'), 'T26 pending state blocks double tap and shows loading');
  assert(sheet.includes('setSubmitError(message)') && !sheet.includes('resetDraft();\n      setSubmitError'), 'T27 failure keeps the form open and preserves draft');
  assert(sheet.includes('error instanceof ApiError') && sheet.includes('No pudimos registrar el movimiento. Intenta de nuevo.'), 'T27 failure uses user-safe fallback for network errors');
  assert(sheet.includes('contextUnavailable') && sheet.includes('contextState === \'household_unavailable\''), 'T28 unavailable/stale household context blocks ambiguous submit');
  assert(sheet.includes('contextKeyRef') && sheet.includes('setSelectedCategoryId(null)') && sheet.includes('setCategories([])'), 'T29 context changes clear category data instead of submitting stale labels');
  assert(sheet.includes('accessToken') && sheet.includes('Tu sesion no esta disponible'), 'T30 missing auth token cannot submit');
  assert(sheet.includes('El contexto financiero cambio o no esta disponible'), 'T31 stale/unavailable context error is user safe');
  assert(sheet.includes('Podes registrar sin categoria') && sheet.includes('Sin categoria'), 'T32 category is optional on load failure');
  assert(sheet.includes('Magnitud positiva, sin convertir monedas.'), 'T33 currency flow explicitly avoids FX conversion');
});

runTest('T34-T42 negative scope and regression wiring', () => {
  const frontendFiles = listFiles('front/mi-front-limpio').filter((file) => /\.(ts|tsx)$/.test(file));
  const financeFrontend = frontendFiles
    .filter((file) => /finance/i.test(file))
    .map((file) => read(file))
    .join('\n');
  const migrations = fs.readdirSync(path.join(repositoryRoot, 'supabase/migrations')).filter((name) => /finance/i.test(name)).sort();
  const runJs = read('tests/run.js');
  const tsconfig = read('scripts/tsconfig.test.json');

  assert(!/fake|mock|dummy|sample|semilla frontend|hardcoded catalog/i.test(financeFrontend), 'T34 no fake rows/catalog wording in Finance frontend');
  assert(!/finance_transactions/.test(financeFrontend), 'T35 frontend does not read transaction table or model');
  assert(!/createFinanceCategory|updateFinanceCategory|deleteFinanceCategory/.test(financeFrontend), 'T36 no category management UI in 2E');
assert(!/HouseholdSwitcher|setActiveHousehold|getUserHouseholds/.test(financeFrontend), 'T37 form does not switch global household');
  assertEqual(
    migrations,
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
      '20260815020000_finance_transaction_lifecycle_foundation_v1_1.sql',
    ],
    'T38 only accepted 2B/2C/3A/3B/3C/3D/3E/3F/3G/4B/4C schema migrations exist',
  );
  assert(runJs.includes('finance-2e-expense-income-ui') && runJs.includes("'finance-2e'"), 'T39 2E command and suite are registered');
  assert(runJs.includes('finance-2e-expense-income-ui') && runJs.includes('finance-2c-expense-income'), 'T40 2E suite includes frontend UI checks and real 2C create persistence validation');
  assert(runJs.includes('finance-2e-expense-income-ui') && runJs.includes('finance-2d-money-input'), 'T41 Finance aggregate keeps 2D and adds 2E');
  assert(tsconfig.includes('../scripts/finance_2e_expense_income_final_ui_tests.ts'), 'T42 2E frontend contract compiles with frontend tests');
});

console.log(`\nFINANCE_2E_EXPENSE_INCOME_FINAL_UI_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_2E_EXPENSE_INCOME_FINAL_UI_TESTS=FAIL');
  process.exit(1);
}

console.log('FINANCE_STAGE_2E_EXPENSE_INCOME_FINAL_UI_TESTS=PASS');
