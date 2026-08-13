#!/usr/bin/env node
'use strict';

/**
 * Finance V1 — Stage 1B Financial Context Authority CONTRACT test.
 *
 * Pure-contract unit test (no database, no Supabase config). Validates:
 *   - finance.constants.js canonical types
 *   - Static source analysis of finance.context.service.js (no planner, no duplicate authorities)
 *   - No Finance route in backend/index.js
 *
 * The resolver's runtime behavior (input validation, auth, household resolution)
 * is validated in scripts/finance_1b_context_database_tests.js against local Supabase.
 */

const path = require('node:path');
const fs = require('node:fs');

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

function read(rel) {
  return fs.readFileSync(path.join(path.resolve(__dirname, '..'), rel), 'utf8');
}

// --- Contract: finance.constants.js ---

const {
  FINANCE_CONTEXT_TYPES,
  FINANCE_CONTEXT_TYPE_VALUES,
  isValidFinanceContextType,
} = require('../backend/src/constants/finance.constants');

record(FINANCE_CONTEXT_TYPES.PERSONAL === 'personal', 'PERSONAL canonical value is "personal"');
record(FINANCE_CONTEXT_TYPES.HOUSEHOLD === 'household', 'HOUSEHOLD canonical value is "household"');
record(
  JSON.stringify([...FINANCE_CONTEXT_TYPE_VALUES].sort()) === JSON.stringify(['household', 'personal']),
  'FINANCE_CONTEXT_TYPE_VALUES exposes exactly personal & household',
);
record(Object.isFrozen(FINANCE_CONTEXT_TYPES), 'FINANCE_CONTEXT_TYPES is frozen');
record(Object.isFrozen(FINANCE_CONTEXT_TYPE_VALUES), 'FINANCE_CONTEXT_TYPE_VALUES is frozen');

record(isValidFinanceContextType('personal'), 'isValidFinanceContextType("personal")=true');
record(isValidFinanceContextType('household'), 'isValidFinanceContextType("household")=true');
record(!isValidFinanceContextType('PERSONAL'), 'uppercase is not canonical');
record(!isValidFinanceContextType('user'), '"user" is not canonical');
record(!isValidFinanceContextType('private'), '"private" is not canonical');
record(!isValidFinanceContextType('family'), '"family" is not canonical');
record(!isValidFinanceContextType(null), 'null is not canonical');
record(!isValidFinanceContextType(undefined), 'undefined is not canonical');
record(!isValidFinanceContextType(42), 'number is not canonical');

// --- Static source analysis: finance.context.service.js ---

const serviceSource = read('backend/src/services/finance.context.service.js');
const constantsSource = read('backend/src/constants/finance.constants.js');

const forbiddenSymbols = [
  'FinanceUser', 'FinanceHousehold', 'FinanceMembership', 'FinancePermissions',
  'FinanceRole', 'financeRole', 'financePermissions', 'FINANCE_ROLE', 'FINANCE_ROLES',
  'financeAuthMiddleware', 'createFinanceAuthMiddleware',
];
for (const symbol of forbiddenSymbols) {
  record(
    !serviceSource.includes(symbol) && !constantsSource.includes(symbol),
    `no duplication symbol: ${symbol}`,
  );
}

record(!/require\([^)]*planner/i.test(serviceSource), 'resolver has no planner require/import');
record(!/require\([^)]*middleware/i.test(serviceSource), 'resolver does not require middleware');
record(serviceSource.includes("require('../config/supabase')"), 'resolver imports supabase config (canonical AUTH)');
record(serviceSource.includes("require('../lib/httpErrors')"), 'resolver imports httpErrors (canonical error contract)');
record(serviceSource.includes("require('../constants/finance.constants')"), 'resolver imports finance.constants');

// --- Static: canonical values are lowercase personal/household ---

record(
  constantsSource.includes("PERSONAL: 'personal'") &&
    constantsSource.includes("HOUSEHOLD: 'household'"),
  'Canonical values are lowercase personal/household (aligned with repo-wide scopeType)',
);
record(
  constantsSource.includes('Object.freeze') &&
    constantsSource.includes('FINANCE_CONTEXT_TYPES'),
  'FINANCE_CONTEXT_TYPES is frozen and exported from constants',
);

// --- Server index must not register a Finance route in 1B ---

const index = read('backend/index.js');
record(!/app\.use\(['"]\/api\/finance/i.test(index), 'No Finance route is registered in 1B (deferred to 1C/1E)');

// --- Summary ---

console.log(`\nFINANCE_1B_CONTRACT_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('FINANCE_STAGE_1B_FINANCIAL_CONTEXT_AUTHORITY_CONTRACT_TESTS=FAIL');
} else {
  console.log('FINANCE_STAGE_1B_FINANCIAL_CONTEXT_AUTHORITY_CONTRACT_TESTS=PASS');
}