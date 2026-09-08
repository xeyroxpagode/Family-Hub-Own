import fs from 'node:fs';
import path from 'node:path';

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

function runTest(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`);
  try {
    fn();
  } catch (error) {
    failCount += 1;
    console.error(`  THREW: ${error instanceof Error ? error.message : String(error)}`);
  }
}

runTest('N01-N09 Finance Accounts route and overflow ownership', () => {
  const types = read('front/mi-front-limpio/navigation/types.ts');
  const homeTabs = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const accountsScreen = read('front/mi-front-limpio/screens/finance/FinanceAccountsScreen.tsx');

  assert(types.includes('FinanceAccounts') && types.includes('contextType:'), 'N01 MoreStackParamList registers FinanceAccounts with typed context params');
  assert(homeTabs.includes('<MoreStack.Screen name="FinanceAccounts" component={FinanceAccountsScreen} />'), 'N01 existing MoreStack owns FinanceAccounts route');
  assert(!/FinanceStack|FinanceNavigator|createNativeStackNavigator<[^>]*Finance/i.test(`${homeTabs}\n${financeScreen}\n${accountsScreen}`), 'N02 no Finance-specific navigator created');
  assert(financeScreen.includes("navigation.navigate('FinanceAccounts'") && financeScreen.includes('contextType: selectedContext'), 'N03 Finance navigates to registered FinanceAccounts route');
  const navigateStart = financeScreen.indexOf("navigation.navigate('FinanceAccounts'");
  const navigateEnd = financeScreen.indexOf('});', navigateStart);
  const navigateCall = financeScreen.slice(navigateStart, navigateEnd + 3);
  assert(!/contextLabel|activeHousehold/.test(navigateCall), 'N03 route params stay minimal and do not own Household truth');
  assert(financeScreen.includes('setOverflowVisible(false);') && financeScreen.indexOf('setOverflowVisible(false);') < financeScreen.indexOf("navigation.navigate('FinanceAccounts'"), 'N05 overflow closes before Accounts navigation');
  assert(financeScreen.includes('size="content"') && financeScreen.includes('title="Finanzas"'), 'N05 Finance overflow uses compact ActionSheet sizing');
  assert(accountsScreen.includes('useRoute<RouteProp<MoreStackParamList, \'FinanceAccounts\'>>()') && accountsScreen.includes('useAuth()') && accountsScreen.includes('useHousehold()'), 'N06 Accounts resolves auth and Household from canonical providers');
  assert(accountsScreen.includes('onRequestClose={() => navigation.goBack()}'), 'N04 Back from Accounts returns through the MoreStack route stack');
  assert(!/Finance overflow[\s\S]{0,240}openActions|setOverflowVisible\(true\)[\s\S]{0,240}openActions/.test(financeScreen), 'N07 Finance overflow is not Quick Actions');
});

runTest('B01-B07 bottom bar central Quick Actions composition', () => {
  const types = read('front/mi-front-limpio/navigation/types.ts');
  const homeTabs = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');

  const inventoryIndex = homeTabs.indexOf('name="InventoryTab"');
  const quickIndex = homeTabs.indexOf('name="QuickActionTab"');
  const plannerIndex = homeTabs.indexOf('name="PlannerTab"');

  assert(types.includes('QuickActionTab: undefined'), 'B01 central plus has a dedicated typed tab-bar slot');
  assert(inventoryIndex >= 0 && quickIndex > inventoryIndex && plannerIndex > quickIndex, 'B01 central plus is between second destination and Calendar/Planner');
  assert(homeTabs.includes('name="HomeTab"') && homeTabs.includes('name="InventoryTab"') && homeTabs.includes('name="PlannerTab"') && homeTabs.includes('name="MoreTab"'), 'B02 all four global destinations remain present');
  assert(homeTabs.includes('component={QuickActionPlaceholder}') && homeTabs.includes('event.preventDefault()') && homeTabs.includes('onPress={openActions}'), 'B03 plus is an action, not a destination');
  assert(!homeTabs.includes('setNewMovementVisible') && !homeTabs.includes('setOverflowVisible(true)') && !homeTabs.includes('Finance menu'), 'B03 plus does not open Finance menu or Finance movement sheet');
  assert(homeTabs.includes('tabBarShowLabel: false') && !/tabBarLabel:\s*['"]/.test(homeTabs), 'B06 text labels are not reintroduced');
  assert(homeTabs.includes('height: tabBarContentHeight + insets.bottom') && homeTabs.includes('paddingBottom: insets.bottom'), 'B05 safe-area bottom inset remains preserved');
  assert(!/QuickActionsFab|styles\.fab|styles\.fabInner|QuickActionsV2/.test(homeTabs), 'B07 no stale or duplicate global Quick Actions owner remains in App Shell');
  assert(homeTabs.includes('<PlannerSheetHost />') && homeTabs.includes('usePlannerSheet'), 'B07 bottom plus reuses canonical PlannerSheetHost Quick Actions path');
});

runTest('H01-H16 Account and Transfer UI wiring', () => {
  const newMovement = read('front/mi-front-limpio/components/finance/NewMovementSheet.tsx');
  const accountsScreen = read('front/mi-front-limpio/screens/finance/FinanceAccountsScreen.tsx');
  const accountForm = read('front/mi-front-limpio/components/finance/AccountFormSheet.tsx');
  const accountDetail = read('front/mi-front-limpio/components/finance/AccountDetailSheet.tsx');
  const accountEdit = read('front/mi-front-limpio/components/finance/AccountEditSheet.tsx');

  assert(newMovement.includes("['expense', 'income', 'transfer']") && !newMovement.includes('<TransferFormSheet'), 'H01 New Movement exposes Transfer mode in the inline switch, no stacked transfer sub-modal');
  assert(newMovement.includes('chooseOperation') && newMovement.includes('operationSelector') && !newMovement.includes("setActivePicker('transfer')") && !newMovement.includes('closeTransferForm'), 'H01 Transfer tab keeps the operation switch visible and renders the transfer form inline, same modal as expense/income');
  assert(newMovement.includes('<AccountSelector') && newMovement.includes('operationHint="expense"') && newMovement.includes('operationHint="income"'), 'H02 Expense and Income expose optional Account selectors');
  assert(newMovement.includes('account: expenseAccountId') && newMovement.includes('account: incomeAccountId'), 'H03 Expense/Income submit optional Account only when selected');
  assert(newMovement.includes('operation: \'transfer-source\'') && newMovement.includes('operation: \'transfer-destination\''), 'H04 Transfer source/destination use account eligibility authority');
  assert(newMovement.includes('commissionMode') && newMovement.includes('commissionAmount'), 'H05 Transfer commission field is wired to payload');
  assert(newMovement.includes('buildTransferPayloadSignature') && newMovement.includes('useStableTransferMutationIdentity'), 'H06 Transfer mutation identity is stable for retry');
  assert(newMovement.includes('setSubmitError') && !/catch[\s\S]{0,180}onRequestClose\(\)/.test(newMovement), 'H07 Transfer failure preserves draft and keeps sheet open');
  assert(newMovement.includes('transferCrossCurrency') && newMovement.includes('destinationAmount'), 'H08 cross-currency Transfer uses explicit destination amount');
  assert(newMovement.includes('accountType !== \'ACCOUNT\'') && newMovement.includes('CREDIT_CARD'), 'H09 credit card destination is supported but credit card source is denied');
  assert(accountsScreen.includes('<AccountFormSheet') && accountForm.includes('ACCOUNT') && accountForm.includes('CREDIT_CARD'), 'H10 Accounts surface can create ACCOUNT and CREDIT_CARD');
  assert(!accountForm.includes('No lo sé') && !accountForm.includes('balanceMode') && accountForm.includes("parseMoneyInputText('0'") && accountForm.includes('initialBalance'), 'H11 Account create defaults to known zero balance with no "No lo sé" path');
  assert(accountForm.includes('onPress={() => chooseCurrency(candidate)}') && accountForm.includes("setAmountText('')"), 'H11 changing currency clears the balance amount instead of reinterpreting it');
  assert(accountForm.includes('const chooseAccountType') && accountForm.includes("parseMoneyInputText('0', currency)"), 'H11 switching account type resets the balance amount to zero');
  assert(accountsScreen.includes('<AccountDetailSheet') && accountsScreen.includes('formatAccountRowAccessibility') && accountsScreen.includes('Deuda ${amount}') && accountsScreen.includes('Saldo a favor ${amount}'), 'H12 Accounts surface renders compact balance/debt rows while preserving full accessibility language');
  assert(accountEdit.includes('createFinanceAccountBalanceAnchor') && accountEdit.includes('correctFinanceAccountBalance'), 'H13 Account edit consolidates balance establishment (UNKNOWN) and correction (KNOWN) into one cohesive edit');
  assert(accountDetail.includes('archiveFinanceAccount') && accountDetail.includes('unarchiveFinanceAccount'), 'H14 Account Detail supports archive/unarchive');
  assert(accountsScreen.includes('status: showArchived ? FINANCE_ACCOUNT_STATUSES.ARCHIVED : undefined'), 'H15 archived view asks for archived accounts explicitly');
  assert(!/Budget|Expected Payments|FX engine|bank sync|statement/i.test(`${newMovement}\n${accountsScreen}`), 'H16 3H UI does not expand into later product areas');
});

runTest('R3H-01-R3H-20 runtime QA rejection regressions', () => {
  const accountDisplay = read('front/mi-front-limpio/services/finance/accountDisplay.ts');
  const moneyInput = read('front/mi-front-limpio/services/finance/moneyInputValue.ts');
  const accountForm = read('front/mi-front-limpio/components/finance/AccountFormSheet.tsx');
  const accountEdit = read('front/mi-front-limpio/components/finance/AccountEditSheet.tsx');
  const balanceSheet = read('front/mi-front-limpio/components/finance/BalanceAnchorSheet.tsx');
  const accountDetail = read('front/mi-front-limpio/components/finance/AccountDetailSheet.tsx');
  const newMovement = read('front/mi-front-limpio/components/finance/NewMovementSheet.tsx');
  const accountsScreen = read('front/mi-front-limpio/screens/finance/FinanceAccountsScreen.tsx');
  const financeScreen = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  const transactionService = read('backend/src/services/finance.transaction.service.js');
  const transferService = read('backend/src/services/finance.transfer.service.js');

  assert(accountDisplay.includes('dotIndex === -1') && accountDisplay.includes('55050 must never become') && accountDisplay.includes('70000 must never become'), 'R3H-01/R3H-08 integer trailing zeros keep magnitude in Account display');
  assert(accountDisplay.includes('addDecimalStrings') && accountDisplay.includes('subtractDecimalStrings') && accountDisplay.includes('compareDecimalStrings'), 'R3H-04 Balance math has exact decimal string helpers');
  assert(moneyInput.includes("canonicalAmount.replace('.', '').split('').every") && !moneyInput.includes('Number(canonicalAmount) === 0'), 'R3H-04 zero detection does not use floating point');
  assert(accountForm.includes('canonicalInitialAmount') && accountForm.includes('toCanonicalSignedAccountBalance(canonicalInitialAmount, accountType)'), 'R3H-02 Credit Card create submits signed canonical initial debt');
  assert(balanceSheet.includes('toCanonicalSignedAccountBalance(canonicalAmount, account.accountType)') && balanceSheet.includes('compareDecimalStrings(homePlusAmount, realAmount)'), 'R3H-04 Credit Card correction uses signed adapter and exact difference');
  assert(accountEdit.includes('size="content"') && balanceSheet.split('size="content"').length >= 3, 'R3H-18 Edit/Anchor/Correction account sheets are content-sized where used by 3H forms');
  assert(transactionService.includes('p_account_id: account?.id ?? null') && transactionService.includes('p_effect_amount: account ? signedEffectAmountText'), 'R3H-05/R3H-07 Expense Account association creates one canonical account effect');
  assert(newMovement.includes('listFinanceExpenseCategories') && newMovement.includes('Sin categoria') && newMovement.includes('categories.map'), 'R3H-12 Expense native/custom category selector remains visible');
  assert(newMovement.includes('chooseOperation') && newMovement.includes('transferSource') && !newMovement.includes("setActivePicker('transfer')") && !newMovement.includes('closeTransferForm'), 'R3H-21 Transfer operation shows the actual transfer form inline immediately (no stacked sub-modal)');
  assert(newMovement.includes('const canonicalSourceAmount = transferAmount.technicalValue!.amount') && newMovement.includes('destinationAmount: transferCrossCurrency ? destinationAmount.technicalValue?.amount ?? null : canonicalSourceAmount'), 'R3H-08 same-currency Transfer submits equal source/destination amounts');
  assert(newMovement.includes('commissionAmount: commissionMode') && newMovement.includes('debitAmount: addDecimalStrings(sourceAmountText, commissionAmountText)'), 'R3H-09/R3H-10 commission is separate in payload but reflected in preview final balance');
  assert(newMovement.includes('transferSourceBalanceInsufficient') && newMovement.includes('compareDecimalStrings(transferSource.currentBalance, transferSourceTotalDebit) < 0'), 'R3H-22 Transfer UI blocks known Source accounts that cannot cover sourceAmount plus commission');
  assert(!newMovement.includes('sourceAmount: addDecimalStrings') && !newMovement.includes('sourceAmount: addStrings'), 'R3H-08 Transfer sourceAmount is not inflated by commission');
  assert(!newMovement.includes('Number(presentation') && !newMovement.includes('formatDecimalDisplay(value: number)'), 'R3H-10 Transfer preview avoids floating-point account-balance authority');
  assert(transferService.includes('SAFE_TRANSFER_ERROR_MESSAGES') && transferService.includes('finance_transfer_source_insufficient_funds') && !transferService.includes("createHttpError(status, 'Transfer Finance invalida.'"), 'R3H-11/R3H-22 Transfer maps safe backend errors instead of generic invalid copy');
  assert(accountsScreen.includes('<ArchivedAccountsLink onPress={() => setShowArchived(true)} />') && accountsScreen.includes('status: showArchived ? FINANCE_ACCOUNT_STATUSES.ARCHIVED : undefined'), 'R3H-13/R3H-14 archived management is reachable and fetches archived accounts');
  assert(accountDetail.includes("onChanged('unarchive')") && accountsScreen.includes("if (action === 'unarchive')") && accountsScreen.includes('setShowArchived(false)'), 'R3H-15 Unarchive returns Account to the active Accounts list');
  assert(accountDetail.includes('overflowDismissLayer') && accountDetail.includes("width: 204") && accountDetail.includes("position: 'absolute'"), 'R3H-16/R3H-17 Account overflow opens as compact anchored menu without reflowing content');
  assert(accountDetail.includes('formatCanonicalAmountForDisplay(item.effectAmount)') && !accountDetail.includes("item.effectAmount.replace(/0+$/"), 'R3H-01 Account activity amounts keep integer trailing zeros');
  assert(accountsScreen.includes('accountListCard') && accountsScreen.includes('accountRowNotFirst') && !accountsScreen.includes('style={styles.accountCard}'), 'R3H-20 Accounts list uses grouped surface rows, not one heavy card per account');
  assert(financeScreen.includes('style={styles.overflowItem}') && !/overflowItem:\s*\{[\s\S]{0,220}backgroundColor:\s*colors\.surface\.soft/.test(financeScreen), 'R3H-19 Finance overflow Cuentas is a native menu row, not an isolated card');
});

console.log(`\nFINANCE_3H_ACCOUNT_TRANSFER_FINAL_UI_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('FINANCE_STAGE_3H_ACCOUNT_TRANSFER_FINAL_UI_TESTS=FAIL');
  process.exit(1);
}

console.log('FINANCE_STAGE_3H_ACCOUNT_TRANSFER_FINAL_UI_TESTS=PASS');
