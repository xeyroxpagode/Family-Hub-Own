#!/usr/bin/env node
'use strict';

/**
 * Finance V1.1 - Stage 1D Source vs Financial Context Boundary tests.
 *
 * Pure domain-policy tests. No database writes, no Finance schema, no routes,
 * no Source/Account-linked Transaction/Budget/Transfer implementation. Runtime authority
 * remains 1B/1C resolveFinanceContext; this file exercises the contract that
 * future Finance entities will consume after their own source resolution.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const {
  FINANCE_CONTEXT_TYPES,
  FINANCE_FUNDING_RELATIONSHIPS,
  FINANCE_SOURCE_CONTEXT_RELATIONSHIPS,
  FINANCE_SOURCE_TYPES,
  isValidFinanceSourceType,
} = require('../backend/src/constants/finance.constants');
const {
  noTrackedFinanceSource,
  personalFinanceSourceFromContext,
  householdFinanceSourceFromContext,
  resolveFinanceSourceContextBoundary,
} = require('../backend/src/services/finance.sourceContext.service');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return true;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
  return false;
}

function assertEqual(actual, expected, message) {
  return assert(
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
    return null;
  }
  if (error.code !== expectedCode) {
    failCount += 1;
    console.error(`  FAIL: ${message} (expected ${expectedCode}, got ${error.code}: ${error.message})`);
    return null;
  }
  passCount += 1;
  console.log(`  PASS: ${message} (code=${error.code})`);
  return error;
}

function personalContext(label = 'actor') {
  return Object.freeze({
    client: null,
    accountId: crypto.randomUUID(),
    contextType: FINANCE_CONTEXT_TYPES.PERSONAL,
    personId: `person-${label}`,
    person: { id: `person-${label}` },
    householdId: null,
    household: null,
    membershipId: null,
    membership: null,
  });
}

function householdContext(personId, householdId, membershipId = `membership-${householdId}`) {
  return Object.freeze({
    client: null,
    accountId: crypto.randomUUID(),
    contextType: FINANCE_CONTEXT_TYPES.HOUSEHOLD,
    personId,
    person: { id: personId },
    householdId,
    household: { id: householdId },
    membershipId,
    membership: { id: membershipId, person_id: personId, household_id: householdId, status: 'active' },
  });
}

function hasKeyDeep(value, forbiddenKeys) {
  if (!value || typeof value !== 'object') return false;
  for (const key of Object.keys(value)) {
    if (forbiddenKeys.includes(key)) return true;
    if (hasKeyDeep(value[key], forbiddenKeys)) return true;
  }
  return false;
}

function relationshipResult(source, financialContext) {
  return resolveFinanceSourceContextBoundary({ source, financialContext });
}

function assertAttribution(result, contextType, message) {
  assertEqual(result.financialAttribution.contextType, contextType, `${message}: attribution context`);
  if (contextType === FINANCE_CONTEXT_TYPES.PERSONAL) {
    assert(result.financialAttribution.personId !== null, `${message}: personal attribution carries person`);
    assertEqual(result.financialAttribution.householdId, null, `${message}: personal attribution has no household`);
  } else {
    assert(result.financialAttribution.householdId !== null, `${message}: household attribution carries household`);
    assertEqual(result.financialAttribution.personId, null, `${message}: household attribution has no personal owner`);
  }
}

function testAllowedMatrix() {
  console.log('\nT1/T2/T3/T4/T5 - allowed source/context compositions');
  const personal = personalContext('juan');
  const householdA = householdContext(personal.personId, 'household-a');
  const noSource = noTrackedFinanceSource();
  const personalSource = personalFinanceSourceFromContext(personal);
  const householdSourceA = householdFinanceSourceFromContext(householdA);

  const t1 = relationshipResult(noSource, personal);
  assertEqual(t1.relationship, FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.NO_TRACKED_SOURCE, 'T1 no tracked Source + PERSONAL allowed');
  assertAttribution(t1, FINANCE_CONTEXT_TYPES.PERSONAL, 'T1');

  const t2 = relationshipResult(null, householdA);
  assertEqual(t2.relationship, FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.NO_TRACKED_SOURCE, 'T2 absent Source + HOUSEHOLD allowed');
  assertAttribution(t2, FINANCE_CONTEXT_TYPES.HOUSEHOLD, 'T2');

  const t3 = relationshipResult(personalSource, personal);
  assertEqual(t3.relationship, FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.SAME_PERSONAL_CONTEXT, 'T3 current Person Personal Source + PERSONAL allowed');
  assertAttribution(t3, FINANCE_CONTEXT_TYPES.PERSONAL, 'T3');

  const t4 = relationshipResult(householdSourceA, householdA);
  assertEqual(t4.relationship, FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.SAME_HOUSEHOLD_CONTEXT, 'T4 active Household Source + same HOUSEHOLD allowed');
  assertAttribution(t4, FINANCE_CONTEXT_TYPES.HOUSEHOLD, 'T4');

  const t5 = relationshipResult(personalSource, householdA);
  assertEqual(t5.relationship, FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.PERSONAL_FUNDED_HOUSEHOLD, 'T5 Personal Source + Household Context allowed');
  assertAttribution(t5, FINANCE_CONTEXT_TYPES.HOUSEHOLD, 'T5');
}

function testPersonalFundedHouseholdContracts() {
  console.log('\nT6/T7/T13/T14/T15/T16 - attribution, privacy, optional source and no Account-linked persistence');
  const personal = personalContext('juan');
  const householdA = householdContext(personal.personId, 'household-a');
  const personalSource = personalFinanceSourceFromContext(personal);
  const result = relationshipResult(personalSource, householdA);

  assertEqual(result.financialContextType, FINANCE_CONTEXT_TYPES.HOUSEHOLD, 'T6 Financial Context remains HOUSEHOLD');
  assertEqual(result.financialAttribution.contextType, FINANCE_CONTEXT_TYPES.HOUSEHOLD, 'T6 reporting/budget/analysis attribution follows HOUSEHOLD');
  assert(result.financialAttribution.personId === null, 'T6/T14 Personal Source does not make Household fact count as Personal');
  assertEqual(
    result.disclosure.household.fundingRelationship,
    FINANCE_FUNDING_RELATIONSHIPS.PERSONAL_FUNDED,
    'T7 Household-safe disclosure says personally funded',
  );
  assert(
    !hasKeyDeep(result, ['sourceAccountId', 'sourceAccountName', 'sourceAccountBalance', 'sourceAccountMovements', 'accountName', 'balance', 'movements']),
    'T7 Personal source internals are absent from Household-readable result',
  );
  assertEqual(result.relationship, FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.PERSONAL_FUNDED_HOUSEHOLD, 'T13 Source does not overwrite Financial Context');

  const untracked = relationshipResult(undefined, householdA);
  assertEqual(untracked.sourceType, FINANCE_SOURCE_TYPES.NONE, 'T15 No Source remains sourceType=none');
  assertEqual(untracked.relationship, FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.NO_TRACKED_SOURCE, 'T15 No Source does not auto-assign Cash/Efectivo');
}

function testForbiddenMatrixAndInjection() {
  console.log('\nT8/T9/T10/T11/T12 - forbidden compositions and caller injection');
  const juanPersonal = personalContext('juan');
  const mariaPersonal = personalContext('maria');
  const householdAForJuan = householdContext(juanPersonal.personId, 'household-a');
  const householdBForJuan = householdContext(juanPersonal.personId, 'household-b');
  const householdSourceA = householdFinanceSourceFromContext(householdAForJuan);
  const householdSourceB = householdFinanceSourceFromContext(householdBForJuan);
  const mariaPersonalSource = personalFinanceSourceFromContext(mariaPersonal);

  expectError(
    () => relationshipResult(householdSourceA, juanPersonal),
    'finance_household_source_personal_context_forbidden',
    'T8 Household Source + PERSONAL rejected',
  );
  expectError(
    () => relationshipResult(householdSourceB, householdAForJuan),
    'finance_household_source_mismatch',
    'T9 Household B Source while active Household is A rejected',
  );
  expectError(
    () => relationshipResult(mariaPersonalSource, householdAForJuan),
    'finance_personal_source_owner_mismatch',
    'T10 other Person Personal Source rejected',
  );
  expectError(
    () => relationshipResult({ sourceType: FINANCE_SOURCE_TYPES.PERSONAL, sourcePersonId: juanPersonal.personId }, householdAForJuan),
    'untrusted_finance_source_reference',
    'T11 arbitrary sourcePersonId injection rejected',
  );
  expectError(
    () => relationshipResult({ sourceType: FINANCE_SOURCE_TYPES.HOUSEHOLD, sourceHouseholdId: householdAForJuan.householdId }, householdAForJuan),
    'untrusted_finance_source_reference',
    'T12 arbitrary sourceHouseholdId injection rejected',
  );
}

function testNoForbiddenImplementationSurface() {
  console.log('\nT16/T17 - no out-of-stage Finance implementation surface');
  const financeServiceSource = fs.readFileSync(path.join(root, 'backend/src/services/finance.sourceContext.service.js'), 'utf8');
  const financeContextSource = fs.readFileSync(path.join(root, 'backend/src/services/finance.context.service.js'), 'utf8');
  const financeConstantsSource = fs.readFileSync(path.join(root, 'backend/src/constants/finance.constants.js'), 'utf8');
  const indexSource = fs.readFileSync(path.join(root, 'backend/index.js'), 'utf8');
  const backendFinanceCombined = `${financeServiceSource}\n${financeContextSource}\n${financeConstantsSource}`;
  const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((name) => name.endsWith('.sql'));

  assert(!/financial_accounts|FinanceAccountRepository|AccountRepository|account_id/.test(backendFinanceCombined), 'T16 no Account-linked transaction persistence/repository introduced');
  assert(!/TransactionRepository|TransactionService|ExpenseRepository|IncomeRepository|BudgetRepository|TransferRepository/.test(backendFinanceCombined), 'No Transaction/Budget/Transfer persistence/service/repository introduced');
assert(!/FINANCE_ROLES|FinanceRole|financePermissions|FinancePermissionService|FinanceACL/.test(backendFinanceCombined), 'T17 no Finance role/permission mapping introduced');
  assert(!/FinanceUser|FinanceHousehold|FinanceMembership|FinancePermission/i.test(indexSource), 'No duplicate Finance identity authority registered');
  assertEqual(
    JSON.stringify(migrations.filter((name) => /finance/i.test(name))),
    JSON.stringify([
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
    ]),
    'Only accepted 2B/2C/3A/3B/3C/3D/3E/3F/3G/4B Finance migrations exist',
  );
  assert(!financeServiceSource.includes('from(') && !financeServiceSource.includes('insert('), '1D policy is pure and does not persist data');
}

function testExistingContextLogicReused() {
  console.log('\nT18/T19 - existing 1B/1C authority remains reused');
  const financeContextSource = fs.readFileSync(path.join(root, 'backend/src/services/finance.context.service.js'), 'utf8');
  assert(financeContextSource.includes('async function resolveFinanceContext'), 'T18 resolveFinanceContext from 1B remains the authority entrypoint');
  assert(financeContextSource.includes('person.active_household_id'), 'T19 1C active Household privacy boundary remains reused');
  assertEqual(isValidFinanceSourceType(FINANCE_SOURCE_TYPES.NONE), true, '1D source constants validate none');
  assertEqual(isValidFinanceSourceType(FINANCE_SOURCE_TYPES.PERSONAL), true, '1D source constants validate personal');
  assertEqual(isValidFinanceSourceType(FINANCE_SOURCE_TYPES.HOUSEHOLD), true, '1D source constants validate household');
  assertEqual(isValidFinanceSourceType('cash'), false, 'No Source cannot be coerced to Cash/Efectivo');
}

function testGlobalHouseholdSwitchBoundary() {
  console.log('\nT17 - Global Household switch boundary');
  const personal = personalContext('juan');
  const householdA = householdContext(personal.personId, 'household-a');
  const householdB = householdContext(personal.personId, 'household-b');
  const personalSource = personalFinanceSourceFromContext(personal);
  const householdSourceA = householdFinanceSourceFromContext(householdA);

  const beforeSwitch = relationshipResult(personalSource, householdA);
  assertEqual(beforeSwitch.relationship, FINANCE_SOURCE_CONTEXT_RELATIONSHIPS.PERSONAL_FUNDED_HOUSEHOLD, 'Personal Source can fund active Household A');

  const afterSwitchPersonalFunding = relationshipResult(personalSource, householdB);
  assertEqual(afterSwitchPersonalFunding.financialAttribution.householdId, householdB.householdId, 'Personal Source can fund newly resolved Household B');

  expectError(
    () => relationshipResult(householdSourceA, householdB),
    'finance_household_source_mismatch',
    'Household A Source is rejected after subsequent context resolves Household B',
  );
}

function main() {
  testAllowedMatrix();
  testPersonalFundedHouseholdContracts();
  testForbiddenMatrixAndInjection();
  testNoForbiddenImplementationSurface();
  testExistingContextLogicReused();
  testGlobalHouseholdSwitchBoundary();

  console.log(`\nFINANCE_1D_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('FINANCE_STAGE_1D_SOURCE_CONTEXT_BOUNDARY_TESTS=FAIL');
  } else {
    console.log('FINANCE_STAGE_1D_SOURCE_CONTEXT_BOUNDARY_TESTS=PASS');
  }
}

main();
