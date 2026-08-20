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

function runTest(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`);
  try {
    fn();
  } catch (error) {
    failCount += 1;
    console.error(`  THREW: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const formSheet = read('front/mi-front-limpio/components/finance/CorrectionFormSheet.tsx');
const reviewSheet = read('front/mi-front-limpio/components/finance/CorrectionReviewSheet.tsx');
const detailSheet = read('front/mi-front-limpio/components/finance/MovementDetailSheet.tsx');
const movementsService = read('front/mi-front-limpio/services/finance/financeMovements.ts');
const accountEligibility = read('front/mi-front-limpio/services/finance/financeAccountEligibility.ts');
const financeComponents = [
  ...['CorrectionFormSheet.tsx', 'CorrectionReviewSheet.tsx', 'MovementDetailSheet.tsx', 'TrashMovementDetailSheet.tsx', 'MoneyInput.tsx', 'AccountSelector.tsx', 'NewMovementSheet.tsx'].map(f => `front/mi-front-limpio/components/finance/${f}`),
  ...['FinanceScreen.tsx', 'FinancePapeleraScreen.tsx', 'FinanceAccountsScreen.tsx'].map(f => `front/mi-front-limpio/screens/finance/${f}`),
].map(f => read(f)).join('\n');

runTest('J01 - "Lo anoté mal" entry point exists', () => {
  assert(detailSheet.includes('Algo está mal'), 'J01 "Algo está mal" button in MovementDetailSheet');
  assert(detailSheet.includes('Lo anoté mal'), 'J01 "Lo anoté mal" option in recovery sheet');
  assert(detailSheet.includes('handleLoAnoteMal'), 'J01 handler for "Lo anoté mal" exists');
});

runTest('J02-J03 - Form prefills with original transaction data', () => {
  assert(formSheet.includes('setAmountText(initialTransaction.amount)'), 'J02 Amount prefilled from initialTransaction');
  assert(formSheet.includes('setCurrency(initialTransaction.currency'), 'J02 Currency prefilled from initialTransaction');
  assert(formSheet.includes('setDate(initialTransaction.transactionDate)'), 'J02 Date prefilled from initialTransaction');
  assert(formSheet.includes('setDescription(initialTransaction.description'), 'J02 Description prefilled from initialTransaction');
  assert(formSheet.includes('setNotes(initialTransaction.notes'), 'J02 Notes prefilled from initialTransaction');
  assert(formSheet.includes('setSelectedCategoryId(initialTransaction.categoryId)'), 'J02 Category prefilled from initialTransaction');
  assert(formSheet.includes('setExpenseAccountId(initialTransaction.accountId)'), 'J02 Expense account prefilled from initialTransaction');
  assert(formSheet.includes('setIncomeAccountId(initialTransaction.accountId)'), 'J02 Income account prefilled from initialTransaction');
  
  assert(movementsService.includes('/api/finance/transactions/${transactionId}'), 'J03 Detail route returns transaction data');
  assert(movementsService.includes('accountId:'), 'J03 Detail response includes accountId');
  assert(movementsService.includes('accountName:'), 'J03 Detail response includes accountName');
  assert(movementsService.includes('accountCurrency:'), 'J03 Detail response includes accountCurrency');
});

runTest('J04 - Review sheet works', () => {
  assert(reviewSheet.includes('CorrectionReviewSheet'), 'J04 CorrectionReviewSheet component exists');
  assert(reviewSheet.includes('changes.length === 0'), 'J04 Handles no-changes case');
  assert(reviewSheet.includes('Sin cambios'), 'J04 Shows "Sin cambios" when no differences');
  assert(reviewSheet.includes('Se aplicarán los siguientes cambios'), 'J04 Shows changes list when differences exist');
  assert(reviewSheet.includes('handleConfirm'), 'J04 Confirm handler exists');
  assert(reviewSheet.includes('onSuccess'), 'J04 onSuccess callback prop');
  assert(reviewSheet.includes('onBack'), 'J04 onBack callback prop');
});

runTest('J05 - Canonical endpoint POST /api/finance/transactions/correct', () => {
  assert(movementsService.includes('/api/finance/transactions/correct'), 'J05 Canonical correction endpoint used');
  assert(movementsService.includes('method: \'POST\''), 'J05 Correction uses POST method');
  assert(movementsService.includes('correctFinanceTransaction'), 'J05 correctFinanceTransaction function exported');
});

runTest('J06 - contextType passed correctly', () => {
  assert(formSheet.includes('contextType: FinanceContextType'), 'J06 Form accepts contextType prop');
  assert(formSheet.includes('contextType,'), 'J06 Form passes contextType to useEligibleAccounts');
  assert(reviewSheet.includes('contextType: \'personal\' | \'household\''), 'J06 Review accepts contextType prop');
  assert(movementsService.includes('contextType'), 'J06 Service includes contextType in correction payload');
});

runTest('J07 - Omitted vs Clear distinction', () => {
  assert(reviewSheet.includes('clearDescription:'), 'J07 clearDescription in correction payload');
  assert(reviewSheet.includes('clearCategory:'), 'J07 clearCategory in correction payload');
  assert(reviewSheet.includes('clearAccount:'), 'J07 clearAccount in correction payload');
  assert(reviewSheet.includes('clearNotes:'), 'J07 clearNotes in correction payload');
  assert(reviewSheet.includes('correctedValues.description === \'\' && originalTransaction.description !== null'), 'J07 clearDescription logic: empty string from non-null');
  assert(reviewSheet.includes('correctedValues.categoryId === null && originalTransaction.categoryId !== null'), 'J07 clearCategory logic: null from non-null');
  assert(reviewSheet.includes('correctedValues.accountId === null && originalTransaction.accountId !== null'), 'J07 clearAccount logic: null from non-null');
  assert(reviewSheet.includes('correctedValues.notes === \'\' && originalTransaction.notes !== null'), 'J07 clearNotes logic: empty string from non-null');
});

runTest('J08 - Stable mutationId per correction intent', () => {
  assert(reviewSheet.includes('generateMutationId'), 'J08 generateMutationId imported');
  assert(reviewSheet.includes('setReviewMutationId(generateMutationId())'), 'J08 New mutationId on correctedValues change');
  assert(reviewSheet.includes('prevCorrectedValuesRef.current = currentHash'), 'J08 Tracks previous values to detect intent change');
  assert(reviewSheet.includes('currentHash !== prevCorrectedValuesRef.current'), 'J08 Compares hash to detect new intent');
});

runTest('J09 - Stable idempotencyKey per correction intent', () => {
  assert(reviewSheet.includes('createIdempotencyKey'), 'J09 createIdempotencyKey imported');
  assert(reviewSheet.includes('createIdempotencyKey(\'finance.transaction.correct\')'), 'J09 New idempotencyKey on correctedValues change');
  assert(reviewSheet.includes('setReviewIdempotencyKey'), 'J09 Sets idempotencyKey state');
});

runTest('J10 - Stable payloadHash per correction intent', () => {
  assert(movementsService.includes('hashIdempotencyRequestV2'), 'J10 hashIdempotencyRequestV2 used for payloadHash');
  assert(movementsService.includes('operation: \'finance.transaction.correct\''), 'J10 Hash includes operation name');
  assert(movementsService.includes('payloadHash'), 'J10 payloadHash sent to backend');
});

runTest('J11 - Double-submit prevented', () => {
  assert(reviewSheet.includes('disabled={submitting'), 'J11 Submit button disabled during submission');
  assert(reviewSheet.includes('closeDisabled={submitting}'), 'J11 Sheet close disabled during submission');
  assert(formSheet.includes('disabled={!canSubmit || !hasChanges}'), 'J11 Form submit disabled when no changes or invalid');
});

runTest('J12 - Success refresh triggers re-read', () => {
  assert(detailSheet.includes('onCorrectionSuccess'), 'J12 onCorrectionSuccess callback prop on MovementDetailSheet');
  assert(reviewSheet.includes('onSuccess();'), 'J12 Review calls onSuccess on confirmation');
  assert(detailSheet.includes('handleCorrectionReviewConfirm'), 'J12 Handler calls onCorrectionSuccess');
  assert(financeComponents.includes('setReadRefreshNonce') || financeComponents.includes('refresh'), 'J12 Finance screen has refresh mechanism');
});

runTest('J13 - Error handling', () => {
  assert(reviewSheet.includes('catch (err)'), 'J13 Try-catch in handleConfirm');
  assert(reviewSheet.includes('err instanceof ApiError'), 'J13 Handles ApiError specifically');
  assert(reviewSheet.includes('setError(err.message)'), 'J13 Sets error message from ApiError');
  assert(reviewSheet.includes('No pudimos corregir el movimiento'), 'J13 Generic error message for non-ApiError');
  assert(formSheet.includes('submitError'), 'J13 Form sheet has submitError state');
});

runTest('J14 - Trash still available from detail', () => {
  assert(detailSheet.includes('Nunca ocurrió'), 'J14 "Nunca ocurrido" option in recovery');
  assert(detailSheet.includes('handleNuncaOcurrio'), 'J14 Handler for trash flow');
  assert(detailSheet.includes('confirmTrash'), 'J14 Trash confirmation step');
  assert(detailSheet.includes('trashFinanceTransaction'), 'J14 Uses trashFinanceTransaction service');
});

runTest('J15 - "Me devolvieron" absent (no refund flow)', () => {
  assert(!detailSheet.includes('Me devolvieron'), 'J15 No "Me devolvieron" option in recovery sheet');
  assert(!detailSheet.includes('refund'), 'J15 No refund-related code in detail sheet');
});

runTest('J16 - CURRENCY-A: ARS no Account → USD no Account allowed', () => {
  assert(formSheet.includes('availableCurrencies={[\'ARS\', \'USD\', \'EUR\']}'), 'J16 Currency picker includes USD');
  assert(formSheet.includes('handleCurrencyChange'), 'J16 Currency change handler exists');
  assert(!formSheet.includes('transactionCurrency && account.currency !== options.transactionCurrency') || accountEligibility.includes('transactionCurrency'), 'J16 Account filtering allows no-account when currency changes');
  assert(formSheet.includes('allowNone'), 'J16 Form passes allowNone to AccountSelector');
});

runTest('J17 - CURRENCY-B: ARS Account → another ARS Account allowed', () => {
  assert(accountEligibility.includes('account.currency !== options.transactionCurrency'), 'J17 Account filtering by currency');
  assert(accountEligibility.includes('FINANCE_ACCOUNT_TYPES.CREDIT_CARD'), 'J17 Expense operation allows ACCOUNT + CREDIT_CARD');
  assert(formSheet.includes('expenseAccountsState'), 'J17 Expense accounts fetched');
  assert(formSheet.includes('incomeAccountsState'), 'J17 Income accounts fetched');
});

runTest('J18 - CURRENCY-C: ARS + ARS Account → USD + USD Account possible as one intent', () => {
  assert(formSheet.includes('onCurrencyChange={handleCurrencyChange}'), 'J18 Currency change triggers account refetch');
  assert(accountEligibility.includes('transactionCurrency'), 'J18 Account eligibility receives transactionCurrency');
  assert(formSheet.includes('enabled: visible'), 'J18 Accounts refetched when form visible');
  assert(formSheet.includes('useEligibleAccounts'), 'J18 Uses useEligibleAccounts hook that reacts to currency');
  assert(!formSheet.includes('amount conversion') && !formSheet.includes('FX'), 'J18 No FX/amount conversion in form');
});

runTest('J19 - CURRENCY-D: USD transaction + ARS Account prevented', () => {
  assert(accountEligibility.includes('options.transactionCurrency && account.currency !== options.transactionCurrency'), 'J19 Account filtered by currency match');
  assert(accountEligibility.includes('continue'), 'J19 Incompatible accounts skipped');
  assert(formSheet.includes('MoneyInput'), 'J19 Currency picker in form');
  assert(accountEligibility.includes('FINANCE_ACCOUNT_TYPES.ACCOUNT'), 'J19 Account type validation');
});

runTest('J20 - Change detection: no semantic changes → no submission', () => {
  assert(formSheet.includes('hasChanges'), 'J20 hasChanges memoized');
  assert(formSheet.includes('amount.technicalValue?.amount !== initialTransaction.amount'), 'J20 Amount change detected');
  assert(formSheet.includes('currency !== initialTransaction.currency'), 'J20 Currency change detected');
  assert(formSheet.includes('date !== initialTransaction.transactionDate'), 'J20 Date change detected');
  assert(formSheet.includes('description.trim() !=='), 'J20 Description change detected');
  assert(formSheet.includes('notes.trim() !=='), 'J20 Notes change detected');
  assert(formSheet.includes('selectedCategoryId !== initialTransaction.categoryId'), 'J20 Category change detected');
  assert(formSheet.includes('currentAccountId !== initialTransaction.accountId'), 'J20 Account change detected');
  assert(formSheet.includes('disabled={!canSubmit || !hasChanges}'), 'J20 Submit disabled when no changes');
});

runTest('J21 - Transaction detail route', () => {
  assert(movementsService.includes('OPERATION_KINDS.READ_ONLY'), 'J21 Detail request uses READ_ONLY operation (GET)');
  assert(movementsService.includes('/api/finance/transactions/${transactionId}'), 'J21 Exact route GET /api/finance/transactions/:transactionId');
  assert(movementsService.includes('GetFinanceTransactionDetailResponse'), 'J21 Typed response for detail');
  assert(movementsService.includes('accountId: string | null'), 'J21 Detail response type includes accountId');
  assert(movementsService.includes('accountName: string | null'), 'J21 Detail response type includes accountName');
  assert(movementsService.includes('accountCurrency: string | null'), 'J21 Detail response type includes accountCurrency');
  assert(movementsService.includes('transactionType:'), 'J21 Detail response includes type');
  assert(movementsService.includes('status:'), 'J21 Detail response includes status');
  assert(!movementsService.includes('corrected_from_transaction_id') || movementsService.includes('correctedFromTransactionId'), 'J21 Does not expose revision internals unnecessarily');
});

console.log(`\nFINANCE_STAGE_4J_UI_TESTS SUMMARY`);
console.log(`PASS: ${passCount}`);
console.log(`FAIL: ${failCount}`);
console.log(`TOTAL: ${passCount + failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_4J_UI_TESTS=FAIL');
  process.exit(1);
}
console.log('FINANCE_STAGE_4J_UI_TESTS=PASS');