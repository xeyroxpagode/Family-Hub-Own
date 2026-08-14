#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 2A Transaction Contract Lock tests.
 *
 * Pure domain-contract tests. No persistence, no Finance schema, no routes,
 * no Account/Category implementation, no Expense/Income mutations, and no
 * Transfer behavior. This freezes the common contract future mutations consume.
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const {
  FINANCE_CONTEXT_TYPES,
  FINANCE_SOURCE_CONTEXT_RELATIONSHIPS,
  FINANCE_TRANSACTION_TYPES,
  FINANCE_TRANSACTION_TYPE_VALUES,
  isValidFinanceTransactionType,
} = require('../backend/src/constants/finance.constants');
const {
  FINANCE_TRANSACTION_OPTIONAL_FIELDS,
  FINANCE_TRANSACTION_REQUIRED_FIELDS,
  normalizeFinanceTransactionContract,
} = require('../backend/src/services/finance.transactionContract.service');
const {
  personalFinanceSourceFromContext,
  householdFinanceSourceFromContext,
} = require('../backend/src/services/finance.sourceContext.service');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return true;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
  return false;
}

function equal(actual, expected, message) {
  return record(
    actual === expected,
    `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`,
  );
}

function expectError(fn, expectedCode, message) {
  let error = null;
  try {
    fn();
  } catch (caught) {
    error = caught;
  }

  if (!error) {
    failCount += 1;
    console.error(`  FAIL: ${message} (expected ${expectedCode}, got success)`);
    return;
  }

  if (error.code !== expectedCode) {
    failCount += 1;
    console.error(`  FAIL: ${message} (expected ${expectedCode}, got ${error.code}: ${error.message})`);
    return;
  }

  passCount += 1;
  console.log(`  PASS: ${message} (code=${error.code})`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function personalContext(personId = 'person-1') {
  return Object.freeze({
    client: null,
    accountId: 'auth-user-1',
    contextType: FINANCE_CONTEXT_TYPES.PERSONAL,
    personId,
    person: { id: personId },
    householdId: null,
    household: null,
    membershipId: null,
    membership: null,
  });
}

function householdContext(personId = 'person-1', householdId = 'household-1') {
  return Object.freeze({
    client: null,
    accountId: 'auth-user-1',
    contextType: FINANCE_CONTEXT_TYPES.HOUSEHOLD,
    personId,
    person: { id: personId },
    householdId,
    household: { id: householdId },
    membershipId: 'membership-1',
    membership: { id: 'membership-1', person_id: personId, household_id: householdId, status: 'active' },
  });
}

function minimumExpense(overrides = {}) {
  return {
    type: FINANCE_TRANSACTION_TYPES.EXPENSE,
    amount: 42000,
    currency: 'ARS',
    financialContext: personalContext(),
    date: '2026-08-13',
    ...overrides,
  };
}

function normalize(payload) {
  return normalizeFinanceTransactionContract(payload);
}

function testCanonicalTypesAndFields() {
  console.log('\nT22/T23/T24 - canonical transaction types');
  equal(FINANCE_TRANSACTION_TYPES.EXPENSE, 'expense', 'T22 EXPENSE recognized');
  equal(FINANCE_TRANSACTION_TYPES.INCOME, 'income', 'T23 INCOME recognized');
  equal(FINANCE_TRANSACTION_TYPES.TRANSFER, 'transfer', 'T24 TRANSFER recognized');
  record(isValidFinanceTransactionType('expense'), 'T22 validator accepts expense');
  record(isValidFinanceTransactionType('income'), 'T23 validator accepts income');
  record(isValidFinanceTransactionType('transfer'), 'T24 validator accepts transfer');
  record(!isValidFinanceTransactionType('payment'), 'arbitrary transaction type rejected');
  equal(
    JSON.stringify([...FINANCE_TRANSACTION_TYPE_VALUES].sort()),
    JSON.stringify(['expense', 'income', 'transfer']),
    'transaction type value set is exact',
  );

  console.log('\nRequired and optional property contract');
  equal(
    JSON.stringify(FINANCE_TRANSACTION_REQUIRED_FIELDS),
    JSON.stringify(['amount', 'currency', 'financialContext', 'date']),
    'required fields are exactly Amount, Currency, Financial Context, Date',
  );
  equal(
    JSON.stringify(FINANCE_TRANSACTION_OPTIONAL_FIELDS),
    JSON.stringify(['description', 'category', 'account', 'notes', 'document', 'relatedDomainObject']),
    'optional fields remain canonical metadata only',
  );
}

function testMinimumExpenseAndOptionalFields() {
  console.log('\nT1/T2/T3/T4/T5/T16/T17/T18/T19/T20/T21/T27/T28/T29 - Expense optionality');
  const expense = normalize(minimumExpense());
  equal(expense.type, FINANCE_TRANSACTION_TYPES.EXPENSE, 'T1 valid Expense with minimum fields');
  equal(expense.amount, 42000, 'T1 amount is positive canonical magnitude');
  equal(expense.currency, 'ARS', 'T1 currency preserved');
  equal(expense.financialContext.contextType, FINANCE_CONTEXT_TYPES.PERSONAL, 'T1 Personal Context reused');
  equal(expense.date, '2026-08-13', 'T1 financial date preserved');

  const noDescription = normalize(minimumExpense({ description: undefined }));
  equal(noDescription.description, null, 'T2/T16 Description is optional');

  const noCategory = normalize(minimumExpense({ category: undefined }));
  equal(noCategory.category, null, 'T3/T17/T28 Category is optional and not required');

  const noAccount = normalize(minimumExpense({ account: undefined }));
  equal(noAccount.account, null, 'T4/T18/T27 Account is optional and not defaulted');

  const quickExpense = normalize(minimumExpense({
    description: undefined,
    category: undefined,
    account: undefined,
    notes: undefined,
    document: undefined,
  }));
  equal(quickExpense.description, null, 'T5 Quick Expense valid without Description');
  equal(quickExpense.category, null, 'T5 Quick Expense valid without Category');
  equal(quickExpense.account, null, 'T5 Quick Expense valid without Account');
  equal(quickExpense.notes, null, 'T5/T19 Quick Expense valid without Notes');
  equal(quickExpense.document, null, 'T5/T20 Quick Expense valid without Document');
  equal(quickExpense.relatedDomainObject, null, 'T21 Related Domain Object is optional');

  const populatedOptional = normalize(minimumExpense({
    description: '  Supermercado  ',
    category: { categoryId: 'future-category' },
    account: { accountId: 'future-account' },
    notes: '  semanal  ',
    document: { documentId: 'future-document' },
    relatedDomainObject: { module: 'future', id: 'future-object' },
  }));
  equal(populatedOptional.description, 'Supermercado', 'T16 Description normalizes when present');
  equal(populatedOptional.category.categoryId, 'future-category', 'T17 Category payload can remain optional metadata');
  equal(populatedOptional.account.accountId, 'future-account', 'T18 Account payload can remain optional metadata');
  equal(populatedOptional.notes, 'semanal', 'T19 Notes normalize when present');
  equal(populatedOptional.document.documentId, 'future-document', 'T20 Document payload can remain optional metadata');
  equal(populatedOptional.relatedDomainObject.id, 'future-object', 'T21 Related Domain Object payload can remain optional metadata');
}

function testIncomeAndValidationFailures() {
  console.log('\nT6/T7/T8/T9/T10/T11/T12/T13/T14/T15 - Income and required validation');
  const income = normalize({
    type: FINANCE_TRANSACTION_TYPES.INCOME,
    amount: 300000,
    currency: 'ARS',
    financialContext: personalContext(),
    date: '2026-08-13',
  });
  equal(income.type, FINANCE_TRANSACTION_TYPES.INCOME, 'T6 valid Income with minimum required fields');
  equal(income.amount, 300000, 'T6 Income amount remains positive magnitude');

  expectError(() => normalize(minimumExpense({ amount: undefined })), 'finance_transaction_amount_required', 'T7 missing Amount rejected');
  expectError(() => normalize(minimumExpense({ amount: 0 })), 'invalid_finance_transaction_amount', 'T8 zero Amount rejected');
  expectError(() => normalize(minimumExpense({ amount: -42000 })), 'invalid_finance_transaction_amount', 'T9 negative caller Amount rejected');
  expectError(() => normalize(minimumExpense({ amount: Number.NaN })), 'invalid_finance_transaction_amount', 'T9 invalid Amount rejected');
  expectError(() => normalize(minimumExpense({ currency: undefined })), 'finance_transaction_currency_required', 'T10 missing Currency rejected');
  expectError(() => normalize(minimumExpense({ currency: 'ars' })), 'invalid_finance_transaction_currency', 'T11 invalid Currency representation rejected');
  expectError(() => normalize(minimumExpense({ financialContext: undefined })), 'finance_transaction_context_required', 'T12 missing Financial Context rejected');
  expectError(
    () => normalize(minimumExpense({ financialContext: { contextType: 'family', personId: 'person-1' } })),
    'invalid_finance_transaction_context',
    'T13 invalid Financial Context rejected',
  );
  expectError(() => normalize(minimumExpense({ date: undefined })), 'finance_transaction_date_required', 'T14 missing Date rejected');
  expectError(() => normalize(minimumExpense({ date: '2026-02-31' })), 'invalid_finance_transaction_date', 'T15 invalid Date rejected');
}

function testOwnershipAndSourceCompatibility() {
  console.log('\nT25/T26 - ownership authority and Source/Context compatibility');
  expectError(
    () => normalize(minimumExpense({ householdId: 'caller-household-id' })),
    'finance_transaction_owner_authority_forbidden',
    'T25 arbitrary householdId is not accepted as transaction ownership authority',
  );
  expectError(
    () => normalize(minimumExpense({ ownerPersonId: 'caller-person-id' })),
    'finance_transaction_owner_authority_forbidden',
    'T25 arbitrary ownerPersonId is not accepted as transaction ownership authority',
  );

  const personal = personalContext('person-1');
  const household = householdContext('person-1', 'household-1');
  const personalSource = personalFinanceSourceFromContext(personal);
  const householdSource = householdFinanceSourceFromContext(household);

  equal(
    normalize(minimumExpense({ financialContext: personal })).sourceContext.relationship,
    FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.NO_TRACKED_SOURCE,
    'T26 no tracked Source + Personal Context compatible',
  );
  equal(
    normalize(minimumExpense({ financialContext: personal, source: personalSource })).sourceContext.relationship,
    FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.SAME_PERSONAL_CONTEXT,
    'T26 Personal Source + Personal Context compatible',
  );
  equal(
    normalize(minimumExpense({ financialContext: household, source: householdSource })).sourceContext.relationship,
    FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.SAME_HOUSEHOLD_CONTEXT,
    'T26 Household Source + Household Context compatible',
  );
  equal(
    normalize(minimumExpense({ financialContext: household, source: personalSource })).sourceContext.relationship,
    FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.PERSONAL_FUNDED_HOUSEHOLD,
    'T26 Personal Source + Household Context compatible',
  );
}

function testNoOutOfStageSurface() {
  console.log('\nT24/T30 - no persistence, routes, schema, Account/Category/Transfer behavior');
  const contractSource = read('backend/src/services/finance.transactionContract.service.js');
  const constantsSource = read('backend/src/constants/finance.constants.js');
  const indexSource = read('backend/index.js');
  const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((name) => name.endsWith('.sql'));

  record(!/from\(|insert\(|update\(|delete\(|upsert\(|rpc\(/.test(contractSource), 'T30 contract service has no database operations');
  record(!/supabase/i.test(contractSource), 'T30 contract service does not import Supabase');
  record(!/finance_transactions|finance_expenses|finance_incomes|TransactionRepository|TransactionService|ExpenseService|IncomeService/.test(indexSource), 'T30 no Transaction/Expense/Income route or persistence registered');
  equal(
    JSON.stringify(migrations.filter((name) => /finance/i.test(name))),
    JSON.stringify([
      '20260813010000_finance_category_authority_v1_1.sql',
      '20260813020000_finance_expense_income_transactions_v1_1.sql',
    ]),
    'T30 only accepted 2B/2C Finance migrations are present',
  );
  record(!/finance_accounts|financial_accounts|AccountRepository|AccountService/.test(contractSource), 'no Account implementation introduced');
  record(!/CategoryRepository|CategoryService|finance_categories|financial_categories/.test(contractSource), 'no Category implementation introduced');
  record(!/TransferRepository|TransferService|paired movement|commission/i.test(contractSource), 'T24 no Transfer persistence/effects implemented');
  record(!/Ledger|DoubleEntry|FinanceLedgerEngine|FinanceTransactionFramework/.test(`${contractSource}\n${constantsSource}`), 'no generic ledger/framework introduced');
}

function main() {
  testCanonicalTypesAndFields();
  testMinimumExpenseAndOptionalFields();
  testIncomeAndValidationFailures();
  testOwnershipAndSourceCompatibility();
  testNoOutOfStageSurface();

  console.log(`\nFINANCE_2A_TRANSACTION_CONTRACT_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_2A_TRANSACTION_CONTRACT_LOCK_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_2A_TRANSACTION_CONTRACT_LOCK_TESTS=PASS');
  }
}

main();
