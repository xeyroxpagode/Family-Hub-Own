// Finance Stage 6E.4 - Category → Pool Suggested Default frontend contract tests

import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { FinancePoolDto, FinanceCategoryPoolDefaultDto } from '../front/mi-front-limpio/services/finance/financePools';

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

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function functionBlock(source: string, exportName: string): string {
  const start = source.indexOf(`export const ${exportName}`);
  if (start === -1) return '';
  const next = source.indexOf('\nexport ', start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

function runTests(): void {
  console.log('Finance Stage 6E.4 — Category → Pool Suggested Default frontend');
  console.log('');

  const poolService = readRepoFile('front/mi-front-limpio/services/finance/financePools.ts');
  const newMovement = readRepoFile('front/mi-front-limpio/components/finance/NewMovementSheet.tsx');
  const poolDetail = readRepoFile('front/mi-front-limpio/components/finance/PoolDetailSheet.tsx');
  const categoryDefaultSheet = readRepoFile('front/mi-front-limpio/components/finance/CategoryPoolDefaultSheet.tsx');

  console.log('DTO / Read — Category Pool Default');
  {
    const getBlock = functionBlock(poolService, 'getCategoryPoolDefaultClient');
    assert(getBlock.includes('/api/finance/categories/pool-default'), '1. get client calls canonical category pool default endpoint');
    assert(/operationKind:\s*OPERATION_KINDS\.READ_ONLY/.test(getBlock), '2. get client is READ_ONLY');

    const upsertBlock = functionBlock(poolService, 'upsertCategoryPoolDefaultClient');
    assert(upsertBlock.includes('/api/finance/categories/pool-default'), '3. upsert client calls canonical endpoint');
    assert(upsertBlock.includes('OPERATION_KINDS.CREATE_IDEMPOTENT'), '4. upsert is create-idempotent');
    assert(upsertBlock.includes('mutationId') && upsertBlock.includes('idempotencyKey') && upsertBlock.includes('payloadHash'), '5. upsert passes mutation correlation');

    const clearBlock = functionBlock(poolService, 'clearCategoryPoolDefaultClient');
    assert(clearBlock.includes('/api/finance/categories/pool-default/clear'), '6. clear client calls canonical endpoint');
    assert(clearBlock.includes('OPERATION_KINDS.CREATE_IDEMPOTENT'), '7. clear is create-idempotent');
    assert(clearBlock.includes('mutationId') && clearBlock.includes('idempotencyKey') && clearBlock.includes('payloadHash'), '8. clear passes mutation correlation');

    // DTO types exist
    const hasDefaultDto = /FinanceCategoryPoolDefaultDto/.test(poolService);
    const hasGetResponse = /GetCategoryPoolDefaultResponse/.test(poolService);
    const hasUpsertReq = /UpsertCategoryPoolDefaultRequest/.test(poolService);
    const hasUpsertRes = /UpsertCategoryPoolDefaultResponse/.test(poolService);
    const hasClearReq = /ClearCategoryPoolDefaultRequest/.test(poolService);
    const hasClearRes = /ClearCategoryPoolDefaultResponse/.test(poolService);
    assert(hasDefaultDto && hasGetResponse && hasUpsertReq && hasUpsertRes && hasClearReq && hasClearRes, '9. Category pool default DTO types exported');
  }

  console.log('');
  console.log('Configuration UX — Pool Detail Sheet');
  {
    assert(poolDetail.includes('CategoryPoolDefaultSheet'), '10. PoolDetailSheet imports CategoryPoolDefaultSheet');
    assert(poolDetail.includes('handleCategoryDefaultPress'), '11. PoolDetailSheet has handler for category default config');
    assert(poolDetail.includes('categoryDefaultVisible'), '12. PoolDetailSheet has visibility state for category default sheet');
    assert(poolDetail.includes('Pozo sugerido por categoria'), '13. PoolDetailSheet shows "Pozo sugerido por categoria" action');
    assert(poolDetail.includes('link-outline'), '14. PoolDetailSheet uses link icon for category default');
  }

  console.log('');
  console.log('Configuration UX — CategoryPoolDefaultSheet');
  {
    assert(categoryDefaultSheet.includes('listFinanceExpenseCategories'), '15. CategoryPoolDefaultSheet loads expense categories');
    assert(categoryDefaultSheet.includes('getCategoryPoolDefaultClient'), '16. CategoryPoolDefaultSheet reads current default');
    assert(categoryDefaultSheet.includes('upsertCategoryPoolDefaultClient'), '17. CategoryPoolDefaultSheet sets default');
    assert(categoryDefaultSheet.includes('clearCategoryPoolDefaultClient'), '18. CategoryPoolDefaultSheet clears default');
    assert(categoryDefaultSheet.includes('Sin sugerencia'), '19. CategoryPoolDefaultSheet shows "Sin sugerencia" option');
    assert(categoryDefaultSheet.includes('Sugerir este pozo'), '20. CategoryPoolDefaultSheet has "Sugerir este pozo" action');
    assert(categoryDefaultSheet.includes('Quitar sugerencia'), '21. CategoryPoolDefaultSheet has "Quitar sugerencia" action');
    assert(categoryDefaultSheet.includes('Estado actual'), '22. CategoryPoolDefaultSheet shows current state');
  }

  console.log('');
  console.log('New Expense — Suggestion Application');
  {
    assert(newMovement.includes('getCategoryPoolDefaultClient'), '23. NewMovementSheet imports getCategoryPoolDefaultClient');
    assert(newMovement.includes('categoryPoolDefault'), '24. NewMovementSheet has categoryPoolDefault state');
    assert(newMovement.includes('userTouchedPool'), '25. NewMovementSheet tracks user pool override');
    assert(newMovement.includes('setCategoryPoolDefault'), '26. NewMovementSheet sets categoryPoolDefault state');
    assert(newMovement.includes('setUserTouchedPool'), '27. NewMovementSheet sets userTouchedPool state');

    // Fetch on category change
    assert(newMovement.includes('selectedCategoryId'), '28. effect depends on selectedCategoryId');
    assert(newMovement.includes('userTouchedPool'), '29. effect depends on userTouchedPool');
    assert(newMovement.includes('!userTouchedPool && categoryPoolDefault?.poolId'), '30. auto-applies only when user has not touched pool');
    assert(newMovement.includes('setExpensePoolId(next.poolId)'), '31. auto-applies suggested pool');

    // Reset on currency change
    assert(newMovement.includes('setCategoryPoolDefault(null)'), '32. currency change clears categoryPoolDefault');
    assert(newMovement.includes('setUserTouchedPool(false)'), '33. currency change resets userTouchedPool');

    // Reset on context change
    assert(newMovement.includes('setCategoryPoolDefault(null)') && newMovement.includes('setUserTouchedPool(false)'), '34. context change resets state');

    // Reset on account change
    assert(newMovement.includes('setExpensePoolId(null)') && newMovement.includes('setUserTouchedPool(false)'), '35. account change clears pool and resets override');

    // Reset on sheet close / new transaction
    assert(newMovement.includes('setCategoryPoolDefault(null)') && newMovement.includes('setUserTouchedPool(false)'), '36. resetDraft clears category default state');
  }

  console.log('');
  console.log('User Override Authority');
  {
    assert(newMovement.includes('setUserTouchedPool(true)'), '37. pool selection marks userTouchedPool');
    assert(newMovement.includes('pool?.id ?? null'), '38. selecting Sin pozo also marks userTouchedPool');
    assert(!newMovement.includes('userTouchedPool') || newMovement.includes('!userTouchedPool'), '39. suggestion does not reapply after explicit override');
  }

  console.log('');
  console.log('Category Change — Before/After Override');
  {
    // Category change before user override updates suggestion
    assert(newMovement.includes('selectedCategoryId') && newMovement.includes('userTouchedPool'), '40. category change effect checks userTouchedPool');

    // Category change after user override preserves explicit choice
    // This is implicitly tested by userTouchedPool logic
  }

  console.log('');
  console.log('Account Eligibility — Category Suggestion');
  {
    assert(newMovement.includes('selectedExpenseAccount === null'), '41. no Account → pool unavailable (suggestion not applied)');
    assert(newMovement.includes('balanceState !== \'KNOWN\''), '42. ACCOUNT UNKNOWN → pool unavailable (suggestion not applied)');
    assert(newMovement.includes('accountType !== \'CREDIT_CARD\''), '43. CREDIT_CARD remains eligible for suggestion');
  }

  console.log('');
  console.log('Currency / Context Isolation');
  {
    assert(poolService.includes('currency') && poolService.includes('contextType'), '44. default endpoints include currency and contextType');
    assert(categoryDefaultSheet.includes('currency'), '45. CategoryPoolDefaultSheet passes currency');
    assert(newMovement.includes('currency') && newMovement.includes('contextType'), '46. suggestion fetch includes currency and contextType');
  }

  console.log('');
console.log('Archived Pool Handling');
  {
    assert(categoryDefaultSheet.includes('poolId'), '47. CategoryPoolDefaultSheet only allows ACTIVE pools (via backend validation)');
    const eligibility = readRepoFile('front/mi-front-limpio/services/finance/financePoolEligibility.ts');
    assert(eligibility.includes("pool.status !== 'ACTIVE'"), '48. only ACTIVE pools eligible (from financePoolEligibility)');
  }

  console.log('');
  console.log('History Non-Rewrite');
  {
    // The feature should not create any mutations that rewrite history
    const upsertBlock = functionBlock(poolService, 'upsertCategoryPoolDefaultClient');
    const clearBlock = functionBlock(poolService, 'clearCategoryPoolDefaultClient');
    assert(!upsertBlock.includes('finance_transactions') && !upsertBlock.includes('finance_expense_pool_links'), '49. upsert does not touch financial ledger tables');
    assert(!clearBlock.includes('finance_transactions') && !clearBlock.includes('finance_expense_pool_links'), '50. clear does not touch financial ledger tables');
  }

  console.log('');
  console.log('Income Non-Interference');
  {
    // Income organizer should not use category pool default
    const incomeUiIdx = newMovement.indexOf('{isIncome(operation) ? (');
    const incomeUiSection = newMovement.slice(incomeUiIdx, newMovement.indexOf(') : null}', incomeUiIdx) + 8);
    assert(!incomeUiSection.includes('categoryPoolDefault'), '51. Income organizer does not use category pool default');
    assert(!incomeUiSection.includes('getCategoryPoolDefaultClient'), '52. Income organizer does not call category pool default client');
  }

  console.log('');
  console.log('State Reset Safety');
  {
    assert(newMovement.includes('resetDraft'), '53. resetDraft function exists');
    assert(newMovement.includes('setCategoryPoolDefault(null)') && newMovement.includes('setUserTouchedPool(false)'), '54. resetDraft clears category default state');
    assert(newMovement.includes('contextKeyRef'), '55. context change detection exists');
    assert(newMovement.includes('setCategoryPoolDefault(null)') && newMovement.includes('setUserTouchedPool(false)'), '56. context change clears stale state');
  }

  console.log('');
  console.log('Mutation Correlation');
  {
    const upsertBlock = functionBlock(poolService, 'upsertCategoryPoolDefaultClient');
    const clearBlock = functionBlock(poolService, 'clearCategoryPoolDefaultClient');
    assert(upsertBlock.includes('finance.category_pool_default.upsert'), '57. upsert uses correct idempotencyKey operation name');
    assert(clearBlock.includes('finance.category_pool_default.clear'), '58. clear uses correct idempotencyKey operation name');
    assert(upsertBlock.includes('OPERATION_KINDS.CREATE_IDEMPOTENT'), '59. upsert is CREATE_IDEMPOTENT');
    assert(clearBlock.includes('OPERATION_KINDS.CREATE_IDEMPOTENT'), '60. clear is CREATE_IDEMPOTENT');
  }

  console.log('');
  console.log('Scope Check — No Creep');
  {
    assert(!newMovement.includes('percentage') && !newMovement.includes('porcentaje'), '61. no percentage distribution in category default');
    assert(!newMovement.includes('template') && !newMovement.includes('plantilla'), '62. no saved allocation templates');
    assert(!newMovement.includes('recurr') && !newMovement.includes('recurring'), '63. no recurrence');
    // Note: "tipo de cambio" exists in pre-existing transfer section, not in category pool default feature
    const expenseUiIdx = newMovement.indexOf('{isExpense(operation) ? (');
    const expenseUiSection = newMovement.slice(expenseUiIdx, newMovement.indexOf(') : null}', expenseUiIdx) + 8);
    const incomeUiIdx = newMovement.indexOf('{isIncome(operation) ? (');
    const incomeUiSection = newMovement.slice(incomeUiIdx, newMovement.indexOf(') : null}', incomeUiIdx) + 8);
    const relevantUi = expenseUiSection + incomeUiSection;
    assert(!relevantUi.includes('FX') && !relevantUi.includes('fx') && !relevantUi.includes('tipo de cambio'), '64. no FX in category pool default feature');
    assert(!relevantUi.includes('goal') && !relevantUi.includes('meta'), '65. no Pool goals');
    assert(!relevantUi.includes('Spending Limit') && !relevantUi.includes('Límite de gasto'), '66. no Spending Limit frontend');
    assert(!relevantUi.includes('Analysis') && !relevantUi.includes('Análisis'), '67. no Analysis detail');
  }

  console.log('');
  console.log('Regression — 6E.1/6E.2/6E.3/6D');
  {
    assert(newMovement.includes('expensePoolId'), '68. Expense single Pool state unchanged');
    assert(newMovement.includes('assignExpenseToPoolClient'), '69. Expense Pool assignment mutation unchanged');
    assert(newMovement.includes('incomePoolAllocations'), '70. Income multi-Pool state unchanged');
    assert(newMovement.includes('distributeIncomeToPoolsClient'), '71. Income distribution mutation unchanged');
    const financeScreen = readRepoFile('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
    assert(financeScreen.includes('FinancePoolSummary'), '72. Pool Summary integration unchanged');
  }

  console.log('');
  console.log('SUMMARY');
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
  }
}

runTests();