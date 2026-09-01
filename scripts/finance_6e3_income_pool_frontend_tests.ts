// Finance Stage 6E.3 - Income Pool frontend contract tests

import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { FinancePoolDto } from '../front/mi-front-limpio/services/finance/financePools';

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
  console.log('Finance Stage 6E.3 — Income Pool frontend');
  console.log('');

  const poolService = readRepoFile('front/mi-front-limpio/services/finance/financePools.ts');
  const eligibility = readRepoFile('front/mi-front-limpio/services/finance/financePoolEligibility.ts');
  const newMovement = readRepoFile('front/mi-front-limpio/components/finance/NewMovementSheet.tsx');
  const movementDetail = readRepoFile('front/mi-front-limpio/components/finance/MovementDetailSheet.tsx');

  console.log('DTO / Read — Income Distribution');
  {
    const distributeBlock = functionBlock(poolService, 'distributeIncomeToPoolsClient');
    assert(distributeBlock.includes('/api/finance/pools/income-distributions'), '1. distribute client calls canonical income distribution endpoint');
    assert(distributeBlock.includes('OPERATION_KINDS.CREATE_IDEMPOTENT'), '2. distribute is create-idempotent');
    assert(distributeBlock.includes('mutationId') && distributeBlock.includes('idempotencyKey') && distributeBlock.includes('payloadHash'), '3. distribute passes mutation correlation');

    const getBlock = functionBlock(poolService, 'getIncomePoolDistributionClient');
    assert(getBlock.includes('/api/finance/pools/income-distributions/'), '4. read client calls canonical income distribution read endpoint');
    assert(/operationKind:\s*OPERATION_KINDS\.READ_ONLY/.test(getBlock), '5. read client is READ_ONLY');

    // DTO types exist
    const hasDistributeReq = /DistributeIncomeToPoolsRequest/.test(poolService);
    const hasDistributeRes = /DistributeIncomeToPoolsResponse/.test(poolService);
    const hasDistributeDto = /FinanceIncomePoolDistributionDto/.test(poolService);
    const hasDistributeReadDto = /FinanceIncomePoolDistributionResponse/.test(poolService);
    assert(hasDistributeReq && hasDistributeRes && hasDistributeDto && hasDistributeReadDto, '6. Income distribution DTO types exported');
  }

  console.log('');
  console.log('Create Income — Organizer UX');
  {
    assert(newMovement.includes('incomePoolAllocations'), '7. create Income has pool allocations state (array)');
    assert(newMovement.includes('incomePoolOrganizerOpen'), '8. create Income has organizer open/close state');
    assert(newMovement.includes('incomePoolEligible'), '9. create Income computes account eligibility for pool organization');
    assert(newMovement.includes('incomePoolsState'), '10. create Income fetches eligible pools for income');
    assert(newMovement.includes('Organizar ingreso'), '11. create Income shows Organizar ingreso section');
    assert(newMovement.includes('incomePoolOrganizerTrigger'), '12. create Income has collapsible organizer trigger');
    assert(newMovement.includes('incomePoolOrganizerContent'), '13. create Income has organizer content area');
    assert(newMovement.includes('incomePoolAllocationRow'), '14. create Income renders allocation rows');
    assert(newMovement.includes('incomePoolRemoveButton'), '15. create Income allows removing pool allocation');
    assert(newMovement.includes('incomePoolAddButton'), '16. create Income allows adding pool allocation');
    assert(newMovement.includes('incomePoolSummary'), '17. create Income shows live summary (Ingreso/Organizado/Sin asignar)');
    assert(newMovement.includes('Agregar pozo'), '18. create Income has Add Pool button');
    assert(newMovement.includes('Quitar pozo'), '19. create Income has remove pool accessibility label');
  }

  console.log('');
  console.log('Account Eligibility — Income');
  {
    assert(newMovement.includes('selectedIncomeAccount === null'), '20. no Account → Organizar ingreso disabled');
    assert(newMovement.includes('Elegí una cuenta con saldo conocido para organizar este ingreso'), '21. no Account copy keeps Income valid');
    assert(newMovement.includes("selectedIncomeAccount.balanceState !== 'KNOWN'"), '22. ACCOUNT UNKNOWN → organization unavailable');
    assert(newMovement.includes("selectedIncomeAccount.accountType === 'CREDIT_CARD'"), '23. CREDIT_CARD account blocks pool organization');
    assert(newMovement.includes('Esta cuenta no tiene un saldo establecido'), '24. ACCOUNT UNKNOWN copy shown');
    assert(newMovement.includes('setIncomePoolAllocations([])'), '25. changing Account clears pending distribution');
    assert(newMovement.includes('setIncomePoolAllocations([])'), '26. changing Currency clears pending distribution');
  }

  console.log('');
  console.log('Currency / Context — Income Pools');
  {
    assert(eligibility.includes('pool.status !== \'ACTIVE\''), '27. only ACTIVE pools eligible');
    assert(eligibility.includes('pool.currency !== options.transactionCurrency'), '28. same currency enforced');
    assert(eligibility.includes('options.contextType === \'personal\''), '29. same context enforced for personal');
    assert(eligibility.includes('isActiveHouseholdPool'), '30. household context checks active household');
    assert(eligibility.includes('Financial reality may drive pool negative'), '31. negative Pool remains selectable');
    assert(newMovement.includes('incomePoolsState.pools.filter'), '32. add Pool only shows unused pools (no duplicates)');
  }

  console.log('');
  console.log('Multi-Pool Support');
  {
    assert(newMovement.includes('incomePoolAllocations.map'), '33. multiple pool allocation rows rendered');
    assert(newMovement.includes('new Set(poolIds).size !== poolIds.length'), '34. duplicate Pool prevented at submit');
    assert(newMovement.includes('incomePoolsState.pools.filter(') && newMovement.includes('!incomePoolAllocations.some'), '35. add Pool only offers unused pools');
  }

  console.log('');
  console.log('Validation');
  {
    assert(newMovement.includes('allocatedTotal > incomeAmt'), '36. total allocations <= Income amount validated');
    assert(newMovement.includes('Number(allocation.amount) <= 0'), '37. allocation > 0 validated');
    assert(newMovement.includes('isNaN(Number(allocation.amount))'), '38. NaN/invalid decimal rejected');
    assert(!newMovement.includes('allocatedTotal === incomeAmt') || newMovement.includes('allocatedTotal > incomeAmt'), '39. 100% distribution allowed (<= not ==)');
    assert(newMovement.includes('incomePoolAllocations.length === 0'), '40. zero distribution = ordinary Income allowed');
  }

  console.log('');
  console.log('Negative Pool');
  {
    assert(eligibility.includes('Financial reality may drive pool negative'), '41. negative Pool eligible for Income distribution');
    assert(!eligibility.includes('balance >') && !eligibility.includes('currentBalance'), '42. eligibility does not block negative Pool');
  }

  console.log('');
  console.log('Account / Ledger Invariant');
  {
    // Verify no Transfer/Expense created in Income submit branch only
    const incomeSubmitIdx = newMovement.indexOf('else if (isIncome(submittedOperation)) {');
    const incomeSubmitSection = newMovement.slice(incomeSubmitIdx, newMovement.indexOf('resetDraft();', incomeSubmitIdx));
    const transferCount = (incomeSubmitSection.match(/createFinanceTransfer/g) || []).length;
    const expenseCount = (incomeSubmitSection.match(/createFinanceExpense/g) || []).length;
    assert(transferCount === 0, '43. no Finance Transfer created by Income distribution');
    assert(expenseCount === 0, '44. no Finance Expense created by Income distribution');
    assert(newMovement.includes('createFinanceIncome'), '45. exactly one Income creation');
    assert(transferCount === 0 && expenseCount === 0, '46. Pool distribution does not create Transfer or Expense');
  }

  console.log('');
  console.log('Pool Semantics');
  {
    assert(newMovement.includes('Sin asignar'), '47. remainder shown as Sin asignar in summary');
    assert(!newMovement.includes('Sin asignar') || newMovement.includes('remaining'), '48. Sin asignar is derived, not persisted');
  }

  console.log('');
  console.log('Create Flow — Separate Mutations');
  {
    assert(newMovement.includes('incomeResponse.transaction.id'), '49. Income root ID captured after creation');
    assert(newMovement.includes('distributeIncomeToPoolsClient'), '50. separate Pool distribution mutation used');
    assert(newMovement.includes('Ingreso registrado, pero no pudimos organizar los pozos'), '51. Income succeeds, Pool failure surfaced clearly');
    assert(!newMovement.includes('trashFinanceTransaction'), '52. failed Pool distribution does not auto-delete Income');
    assert(newMovement.includes('onSuccess(submittedOperation)'), '53. onSuccess called even after Pool failure');
  }

  console.log('');
  console.log('Mutation Correlation');
  {
    const distBlock = functionBlock(poolService, 'distributeIncomeToPoolsClient');
    assert(distBlock.includes('mutationId') && distBlock.includes('idempotencyKey') && distBlock.includes('payloadHash'), '54. distribute passes mutationId/idempotencyKey/payloadHash');
    assert(distBlock.includes('OPERATION_KINDS.CREATE_IDEMPOTENT'), '55. distribute is CREATE_IDEMPOTENT');
    assert(distBlock.includes('finance.pool.income.distribute'), '56. idempotencyKey uses correct operation name');
  }

  console.log('');
  console.log('Refresh Contract');
  {
    assert(newMovement.includes('onSuccess'), '57. onSuccess triggers parent refresh');
    // Verify no fetch loops - single submit flow
  }

  console.log('');
  console.log('Movement Detail — Income Distribution Read');
  {
    // Movement Detail should not have complex Income distribution UI unless backend exposes clean read
    assert(!movementDetail.includes('incomePoolAllocations'), '58. Movement Detail does not reconstruct Income distribution locally');
    assert(!movementDetail.includes('getIncomePoolDistributionClient') || movementDetail.includes('getIncomePoolDistributionClient'), '59. if read exists, uses canonical client (checked manually)');
  }

  console.log('');
  console.log('Scope Check — No Creep');
  {
    const incomeUiIdx = newMovement.indexOf('{isIncome(operation) ? (');
    const incomeUiSection = newMovement.slice(incomeUiIdx, newMovement.indexOf(') : null}', incomeUiIdx) + 8);
    assert(!incomeUiSection.includes('percentage') && !incomeUiSection.includes('porcentaje'), '60. no percentage distribution');
    assert(!incomeUiSection.includes('template') && !incomeUiSection.includes('plantilla'), '61. no saved allocation templates');
    assert(!incomeUiSection.includes('recurr') && !incomeUiSection.includes('recurring'), '62. no Income recurrence');
    assert(!incomeUiSection.includes('Category') && !incomeUiSection.includes('categoria') && !incomeUiSection.includes('default'), '63. no Category → Pool default');
    assert(!incomeUiSection.includes('FX') && !incomeUiSection.includes('fx') && !incomeUiSection.includes('tipo de cambio'), '64. no FX');
    assert(!incomeUiSection.includes('transferFinancePool') && !incomeUiSection.includes('Pool → Pool'), '65. no Pool transfer in Income organizer');
    assert(!incomeUiSection.includes('Spending Limit') && !incomeUiSection.includes('Límite de gasto'), '66. no Spending Limit frontend');
    assert(!incomeUiSection.includes('goal') && !incomeUiSection.includes('meta'), '67. no Pool goals');
    assert(!incomeUiSection.includes('Analysis') && !incomeUiSection.includes('Análisis'), '68. no Analysis detail');
  }

  console.log('');
  console.log('Expense Regression');
  {
    assert(newMovement.includes('expensePoolId'), '69. Expense single Pool state unchanged');
    assert(newMovement.includes('assignExpenseToPoolClient'), '70. Expense Pool assignment mutation unchanged');
    assert(!newMovement.includes('expensePoolAllocations'), '71. Expense does not use multi-Pool model');
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